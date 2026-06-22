const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const archiver = require('archiver');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { FetchHttpHandler } = require('@smithy/fetch-http-handler');
const dbLayer = require('./lib/db-layer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BACKUP_TOKEN = process.env.BACKUP_TOKEN || '';
const BACKUP_TOKEN_SEED = process.env.BACKUP_TOKEN_SEED || '';

// R2 storage
const R2_BUCKET = process.env.R2_BUCKET || 'dashboard-uploads';
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
  requestHandler: new FetchHttpHandler(),
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(__dirname, { index: false }));

// Proxy uploads from R2
app.get('/uploads/:name', async (req, res) => {
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: req.params.name }));
    if (obj.ContentType) res.setHeader('Content-Type', obj.ContentType);
    if (obj.ContentLength) res.setHeader('Content-Length', obj.ContentLength);
    obj.Body.pipe(res);
  } catch (err) {
    res.status(404).json({ error: 'Not found' });
  }
});

function setNoCacheHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function secureEquals(left, right) {
  const leftBuf = Buffer.from(left || '', 'utf8');
  const rightBuf = Buffer.from(right || '', 'utf8');
  if (leftBuf.length !== rightBuf.length) return false;
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function toMonthStampUTC(date) {
  return date.toISOString().slice(0, 7);
}

function deriveBackupToken(seed, monthStamp) {
  return crypto
    .createHmac('sha256', seed)
    .update(`backup:${monthStamp}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function getAcceptedBackupTokens() {
  const accepted = [];

  if (BACKUP_TOKEN) {
    accepted.push(BACKUP_TOKEN);
  }

  if (BACKUP_TOKEN_SEED) {
    const now = new Date();
    const currentMonth = toMonthStampUTC(now);
    const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const previousMonth = toMonthStampUTC(prev);

    accepted.push(deriveBackupToken(BACKUP_TOKEN_SEED, currentMonth));
    accepted.push(deriveBackupToken(BACKUP_TOKEN_SEED, previousMonth));
  }

  return [...new Set(accepted)];
}

function requireBackupToken(req, res, next) {
  const acceptedTokens = getAcceptedBackupTokens();

  if (!acceptedTokens.length) {
    return res.status(503).json({
      error: 'Backup export is not configured. Set BACKUP_TOKEN or BACKUP_TOKEN_SEED in environment variables.',
    });
  }

  const provided = req.get('x-backup-token') || req.query.token;
  const matched = !!provided && acceptedTokens.some(token => secureEquals(provided, token));
  if (!matched) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

async function getHealthStatus() {
  const db = await dbLayer.readDB();
  let uploadsWritable = false;
  try {
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: '.health' }));
    uploadsWritable = true;
  } catch (err) {
    uploadsWritable = err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404;
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    dbPath: dbLayer.DB_PATH,
    uploadsDir: `r2://${R2_BUCKET}`,
    uploadsWritable,
    counts: {
      areas: (db.areas || []).length,
      records: (db.records || []).length,
      reviews: (db.reviews || []).length,
    },
  };
}

async function getBackupManifest() {
  const db = await dbLayer.readDB();
  let fileCount = 0;
  try {
    const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET }));
    fileCount = (list.Contents || []).length;
  } catch (err) { /* ignore */ }

  return {
    generatedAt: new Date().toISOString(),
    app: 'dashboard',
    dbFile: '(postgres)',
    uploadsDir: `r2://${R2_BUCKET}`,
    counts: {
      areas: (db.areas || []).length,
      records: (db.records || []).length,
      reviews: (db.reviews || []).length,
      uploadFiles: fileCount,
    },
    notes: [
      'DB is hosted on Neon (Postgres). Uploads are stored in Cloudflare R2.',
      'Store backups securely and test restores periodically.',
    ],
  };
}

// ── DB HELPERS ────────────────────────────────────────────────────────────────
// SQLite layer handles all persistence; see lib/db-layer.js

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function initDB() {
  const now = new Date().toISOString();
  const db = {
    meta: { version: 1, created: now },
    areas: [
      { id: 'area-jobs',     title: 'Job Search',    color: '#e05555', icon: '💼', order: 0 },
      { id: 'area-finances', title: 'Finances',       color: '#d4943a', icon: '💰', order: 1 },
      { id: 'area-health',   title: 'Health',         color: '#4caf7d', icon: '🏃', order: 2 },
      { id: 'area-home',     title: 'Home',           color: '#d4705a', icon: '🏠', order: 3 },
      { id: 'area-projects', title: 'Projects',       color: '#9b7fd4', icon: '🔨', order: 4 },
      { id: 'area-relationships', title: 'Relationships', color: '#c4607a', icon: '👥', order: 5 },
    ],
    collections: [],
    records: [],
  };

  // ── SEED RECORDS ────────────────────────────────────────────────────────────

  // Companies
  const coKennicott = { id: genId(), type: 'company', areaId: 'area-jobs', title: 'Kennicott Brothers', status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { industry: 'Wholesale Floral', website: 'https://kennicott.com', location: 'Chicago, IL (HQ)', notes: 'Oldest wholesale floral company in the US, since 1881. Employee-owned. 14 locations across 9 states.' }, links: [], timeline: [{ id: genId(), date: now, text: 'Company added', author: 'system' }] };
  const coWilson = { id: genId(), type: 'company', areaId: 'area-jobs', title: 'Wilson Sporting Goods', status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { industry: 'Sporting Goods', website: 'https://wilson.com', location: 'Chicago, IL', notes: '' }, links: [], timeline: [] };
  const coCalbee = { id: genId(), type: 'company', areaId: 'area-jobs', title: 'Calbee America', status: 'active', priority: 2, createdAt: now, updatedAt: now, fields: { industry: 'CPG / Snack Food', website: '', location: 'Remote', notes: '' }, links: [], timeline: [] };

  // Contacts
  const cJessica = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Jessica Reynolds', status: 'active', priority: 1, createdAt: now, updatedAt: now, companyId: null, fields: { role: 'Director of E-Commerce (outgoing)', company: 'Kennicott Brothers', email: 'jessicare@kennicott.com', phone: '', linkedin: '', notes: 'Outgoing — interviewing Aaron as her replacement. Be curious about what she built.' }, links: [], timeline: [{ id: genId(), date: now, text: 'Contact added', author: 'system' }] };
  const cErin    = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Erin Risch',       status: 'active', priority: 1, createdAt: now, updatedAt: now, companyId: null, fields: { role: 'VP of Human Resources', company: 'Kennicott Brothers', email: 'erinr@kennicott.com', phone: '', linkedin: '', notes: 'Organizer of interviews. Initial recruiter contact.' }, links: [], timeline: [{ id: genId(), date: now, text: 'Contact added', author: 'system' }] };
  const cDawn    = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Dawn Augustyn',    status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { role: 'Product Owner PLM', company: 'Wilson Sporting Goods', email: '', phone: '', linkedin: '', notes: 'Round 2 interviewer.' }, links: [], timeline: [] };
  const cAbby    = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Abby Petersen',    status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { role: 'Peer Analyst', company: 'Wilson Sporting Goods', email: '', phone: '', linkedin: '', notes: 'Peer interview round 2.' }, links: [], timeline: [] };
  const cOlivia  = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Olivia Vargas',    status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { role: 'Director Supply Chain', company: 'Wilson Sporting Goods', email: '', phone: '', linkedin: '', notes: 'Round 2 interviewer.' }, links: [], timeline: [] };
  const cNick    = { id: genId(), type: 'contact', areaId: 'area-jobs', title: 'Nick (Spreetail)',  status: 'active', priority: 2, createdAt: now, updatedAt: now, fields: { role: 'Recruiter', company: 'Spreetail', email: '', phone: '', linkedin: '', notes: 'Warm contact. Invited LinkedIn connection after rejection.' }, links: [], timeline: [] };

  // Job records
  const jKennicott = {
    id: genId(), type: 'job', areaId: 'area-jobs', title: 'Kennicott Brothers', status: 'interviewing', priority: 1,
    createdAt: now, updatedAt: now,
    fields: {
      role: 'Director of E-Commerce', salary: '$125,000–$145,000', location: 'Chicago, IL',
      appliedDate: '2026-05-01', source: 'LinkedIn',
      resumeUsed: '', coverLetterUsed: '',
      jobDescription: '',
      notes: 'Jessica Reynolds is the outgoing person in this role. Be curious about what she built, show you can carry it forward.',
    },
    contacts: [cErin.id, cJessica.id],
    interviews: [
      { id: genId(), round: 1, date: '2026-05-15', time: '', interviewer: 'Erin Risch', format: 'Phone screen', location: '', link: '', notes: 'Screening call with Erin went well.' },
      { id: genId(), round: 2, date: '2026-06-16', time: '15:00', interviewer: 'Jessica Reynolds', format: 'Video', location: 'Microsoft Teams', link: 'https://teams.microsoft.com/meet/24426903102227?p=gdnQvhQu690UdY6m6j', notes: 'Meeting ID: 244 269 031 022 27 · Passcode: Ff7xk2DA' },
    ],
    documents: [],
    links: [],
    timeline: [
      { id: genId(), date: '2026-05-01', text: 'Applied', author: 'system' },
      { id: genId(), date: '2026-05-15', text: 'Screening call with Erin — went well', author: 'system' },
      { id: genId(), date: '2026-06-10', text: 'Round 2 scheduled with Jessica Reynolds for Jun 16', author: 'system' },
    ]
  };

  const jWilson = {
    id: genId(), type: 'job', areaId: 'area-jobs', title: 'Wilson Sporting Goods', status: 'awaiting', priority: 1,
    createdAt: now, updatedAt: now,
    fields: { role: 'Operations Analyst', salary: '$85,000–$110,000', location: 'Chicago, IL', appliedDate: '2026-04-15', source: 'LinkedIn', resumeUsed: '', coverLetterUsed: '', jobDescription: '', notes: 'Round 2 complete. Awaiting decision.' },
    contacts: [cDawn.id, cAbby.id, cOlivia.id],
    interviews: [
      { id: genId(), round: 1, date: '2026-05-01', time: '', interviewer: 'Tony (TA)', format: 'Phone screen', location: '', link: '', notes: '' },
      { id: genId(), round: 2, date: '2026-06-10', time: '', interviewer: 'Dawn Augustyn, Abby Petersen, Olivia Vargas', format: 'Video', location: '', link: '', notes: 'Full panel round 2 — completed.' },
    ],
    documents: [],
    links: [],
    timeline: [
      { id: genId(), date: '2026-04-15', text: 'Applied', author: 'system' },
      { id: genId(), date: '2026-05-01', text: 'Phone screen with Tony (TA)', author: 'system' },
      { id: genId(), date: '2026-06-10', text: 'Round 2 complete — Dawn, Abby, Olivia. Awaiting decision.', author: 'system' },
    ]
  };

  const jCalbee = { id: genId(), type: 'job', areaId: 'area-jobs', title: 'Calbee America', status: 'applied', priority: 2, createdAt: now, updatedAt: now, fields: { role: 'Director of E-Commerce', salary: '$190,000–$205,000', location: 'Remote', appliedDate: '2026-06-14', source: 'LinkedIn', resumeUsed: 'Aaron_Sapinsley_Calbee_Resume.docx', coverLetterUsed: 'Aaron_Sapinsley_Calbee_CoverLetter.docx', jobDescription: '', notes: 'CPG consumer brand. Amazon P&L focus. Submitted Jun 14.' }, contacts: [], interviews: [], documents: ['Aaron_Sapinsley_Calbee_Resume.docx','Aaron_Sapinsley_Calbee_CoverLetter.docx'], links: [], timeline: [{ id: genId(), date: '2026-06-14', text: 'Applied', author: 'system' }] };

  const openJobs = [
    ['Zoro', 'Program Manager, Order to Cash', '2026-05-07'],
    ['Zoro', 'Sr. Order Fulfillment Analyst', '2026-05-07'],
    ['Amtrak', 'Business Analyst', '2026-05-10'],
    ['AHEAD', 'Sales Operations Specialist', '2026-05-12'],
    ['Expedia Group', 'Business Operations & Automation Mgr', '2026-05-14'],
    ['NYT Wirecutter', 'Senior Business Analyst', '2026-05-16'],
    ['Beckman Coulter', 'Sr. Sales Operations Analyst', '2026-05-18'],
    ['Coalition Technologies', 'Reporting Analyst', '2026-05-20'],
  ].map(([company, role, date]) => ({
    id: genId(), type: 'job', areaId: 'area-jobs', title: company, status: 'applied', priority: 3,
    createdAt: now, updatedAt: now,
    fields: { role, salary: '', location: '', appliedDate: date, source: 'LinkedIn', resumeUsed: '', coverLetterUsed: '', jobDescription: '', notes: '' },
    contacts: [], interviews: [], documents: [], links: [],
    timeline: [{ id: genId(), date, text: 'Applied', author: 'system' }]
  }));

  const archivedJobs = [
    ['Bunzl', 'Financial Operations Specialist', 'Rejected post-interview'],
    ['Prime Therapeutics', 'Senior Underwriter', 'Rejected — employee referral'],
    ['Spreetail', 'Sr. Financial Analyst (Merch Analytics)', 'Rejected post-screen — warm referral via Nick'],
    ['Spreetail', 'Director Walmart Marketplace', 'Rejected'],
    ['Spreetail', 'Sr. Pricing Analyst', 'Rejected'],
    ['Spreetail', 'Sr. Operations Analyst', 'Rejected'],
  ].map(([company, role, notes]) => ({
    id: genId(), type: 'job', areaId: 'area-jobs', title: company, status: 'rejected', priority: 4,
    createdAt: now, updatedAt: now,
    fields: { role, salary: '', location: '', appliedDate: '', source: '', resumeUsed: '', coverLetterUsed: '', jobDescription: '', notes },
    contacts: [], interviews: [], documents: [], links: [],
    timeline: [{ id: genId(), date: now, text: notes, author: 'system' }]
  }));

  // Calendar event linked to Kennicott interview
  const evKennicott = {
    id: genId(), type: 'event', areaId: 'area-jobs', title: 'Kennicott Interview — Round 2', status: 'upcoming', priority: 1,
    createdAt: now, updatedAt: now,
    fields: { date: '2026-06-16', time: '15:00', endTime: '15:30', location: 'Microsoft Teams', link: 'https://teams.microsoft.com/meet/24426903102227?p=gdnQvhQu690UdY6m6j', category: 'interview', notes: 'Jessica Reynolds. Meeting ID: 244 269 031 022 27 · Passcode: Ff7xk2DA' },
    links: [jKennicott.id],
    timeline: []
  };
  jKennicott.links.push(evKennicott.id);

  // Health goals
  const goals = [
    { title: 'Get back to the gym', notes: 'First step: show up once this week.', areaId: 'area-health' },
    { title: 'Lose weight, get leaner', notes: 'Ask Claude for a detailed plan when ready.', areaId: 'area-health' },
    { title: 'Build strength', notes: 'Define a program around schedule and equipment.', areaId: 'area-health' },
    { title: 'Buy a house', notes: 'Target ~1yr, job-dependent. Run DTI numbers once job lands.', areaId: 'area-home' },
    { title: 'Build down payment savings', notes: 'Define target amount and monthly savings rate.', areaId: 'area-finances' },
  ].map(g => ({
    id: genId(), type: 'goal', areaId: g.areaId, title: g.title, status: 'active', priority: 2,
    createdAt: now, updatedAt: now,
    fields: { targetDate: '', progress: '', notes: g.notes },
    links: [], timeline: []
  }));

  // Tasks / chores
  const chores = [
    { title: 'Take out trash', freq: 'Weekly' },
    { title: 'Vacuum', freq: 'Weekly' },
    { title: 'Clean bathroom', freq: 'Weekly' },
    { title: 'Dishes / kitchen', freq: 'Daily' },
    { title: 'Do laundry', freq: 'Weekly' },
    { title: 'Change bedsheets', freq: 'Monthly' },
    { title: 'Clean fridge', freq: 'Monthly' },
  ].map(c => ({
    id: genId(), type: 'task', areaId: 'area-home', title: c.title, status: 'active', priority: 3,
    createdAt: now, updatedAt: now,
    fields: { frequency: c.freq, lastDone: '', nextDue: '', notes: '' },
    links: [], timeline: []
  }));

  // Projects
  const projects = [
    { title: 'MTG Collection App', areaId: 'area-projects', status: 'on-hold', notes: 'Personal tool. Pod app covers the market — keep as personal utility, low priority. Deploy to Netlify when ready.' },
    { title: 'Reselling', areaId: 'area-projects', status: 'active', notes: 'Retail/wholesale arbitrage. Decide channel: Amazon FBA vs eBay.' },
    { title: 'Woodworking', areaId: 'area-projects', status: 'on-hold', notes: 'Hobby or business? Space options researched: Pumping Station One, Chicago Maker Space (Bridgeport), industrial flex space W. Diversey.' },
    { title: 'Photography', areaId: 'area-projects', status: 'exploring', notes: 'Mid-range gear on hand. Product, headshots, stock.' },
    { title: 'Freelance E-Commerce / Ops', areaId: 'area-projects', status: 'exploring', notes: 'Network from zero. LinkedIn outreach, Upwork. 8yr track record.' },
    { title: 'Tennis Instruction', areaId: 'area-projects', status: 'exploring', notes: 'Lifelong player. Wyzant, Chicago park district.' },
    { title: 'ACT / Math Tutoring', areaId: 'area-projects', status: 'exploring', notes: 'Rusty but interested. Wyzant, Varsity Tutors.' },
  ].map(p => ({
    id: genId(), type: 'project', areaId: p.areaId, title: p.title, status: p.status, priority: 3,
    createdAt: now, updatedAt: now,
    fields: { description: '', nextAction: '', milestones: [], notes: p.notes },
    links: [], timeline: []
  }));

  // Link contacts to companies after both are created
  cJessica.companyId = coKennicott.id;
  cErin.companyId = coKennicott.id;
  cDawn.companyId = coWilson.id;
  cAbby.companyId = coWilson.id;
  cOlivia.companyId = coWilson.id;
  jKennicott.companyId = coKennicott.id;
  jWilson.companyId = coWilson.id;
  jCalbee.companyId = coCalbee.id;

  db.records = [
    coKennicott, coWilson, coCalbee,
    cJessica, cErin, cDawn, cAbby, cOlivia, cNick,
    jKennicott, jWilson, jCalbee,
    ...openJobs, ...archivedJobs,
    evKennicott,
    ...goals, ...chores, ...projects
  ];

  // Note: initialization now handled by dbLayer.initDB() on startup
  return db;
}

// ── API ROUTES ────────────────────────────────────────────────────────────────

app.get('/healthz', async (req, res) => {
  try {
    const status = await getHealthStatus();
    res.json(status);
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

app.get('/api/health', async (req, res) => {
  try {
    const status = await getHealthStatus();
    res.json(status);
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      error: err.message,
    });
  }
});

app.get('/api/backup/status', (req, res) => {
  const staticConfigured = !!BACKUP_TOKEN;
  const rotatingConfigured = !!BACKUP_TOKEN_SEED;
  let mode = 'disabled';
  if (staticConfigured && rotatingConfigured) mode = 'static+rotating';
  else if (rotatingConfigured) mode = 'rotating';
  else if (staticConfigured) mode = 'static';

  res.json({
    enabled: staticConfigured || rotatingConfigured,
    mode,
    rotationWindow: rotatingConfigured ? 'current-and-previous-month' : null,
    requiresToken: true,
  });
});

app.get('/api/backup/export', requireBackupToken, async (req, res) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const archiveName = `dashboard-backup-${stamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${archiveName}"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      console.warn('Backup warning:', err.message);
      return;
    }
    console.error('Backup archive warning:', err);
    if (!res.headersSent) res.status(500).end();
  });

  archive.on('error', err => {
    console.error('Backup archive error:', err);
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });

  archive.pipe(res);

  const manifest = await getBackupManifest();
  archive.append(`${JSON.stringify(manifest, null, 2)}\n`, { name: 'manifest.json' });

  archive.append(`${JSON.stringify({ note: 'DB is on Neon (Postgres). Download separately via pg_dump.' }, null, 2)}\n`, { name: 'db-note.txt' });

  await archive.finalize();
});

// DB snapshot
app.get('/api/db', async (req, res) => res.json(await dbLayer.readDB()));

// Areas
app.get('/api/areas', async (req, res) => {
  const db = await dbLayer.readDB();
  res.json(db.areas.sort((a,b) => a.order - b.order));
});

app.post('/api/areas', async (req, res) => {
  const db = await dbLayer.readDB();
  const area = { id: genId(), order: db.areas.length, ...req.body, createdAt: new Date().toISOString() };
  db.areas.push(area);
  res.json((await dbLayer.writeDB(db)).areas.find(a => a.id === area.id));
});

app.put('/api/areas/:id', async (req, res) => {
  const db = await dbLayer.readDB();
  const i = db.areas.findIndex(a => a.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.areas[i] = { ...db.areas[i], ...req.body, updatedAt: new Date().toISOString() };
  res.json((await dbLayer.writeDB(db)).areas[i]);
});

app.delete('/api/areas/:id', async (req, res) => {
  const db = await dbLayer.readDB();
  db.areas = db.areas.filter(a => a.id !== req.params.id);
  res.json(await dbLayer.writeDB(db));
});

// Records
app.get('/api/records', async (req, res) => {
  const db = await dbLayer.readDB();
  let records = db.records;
  if (req.query.areaId) records = records.filter(r => r.areaId === req.query.areaId);
  if (req.query.type)   records = records.filter(r => r.type === req.query.type);
  res.json(records);
});

app.get('/api/records/:id', async (req, res) => {
  const db = await dbLayer.readDB();
  const record = db.records.find(r => r.id === req.params.id);
  if (!record) return res.status(404).json({ error: 'Not found' });
  res.json(record);
});

app.post('/api/records', async (req, res) => {
  const db = await dbLayer.readDB();
  const record = {
    id: genId(),
    status: 'active',
    priority: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    links: [],
    timeline: [{ id: genId(), date: new Date().toISOString(), text: 'Created', author: 'system' }],
    ...req.body,
  };
  db.records.push(record);
  res.json((await dbLayer.writeDB(db)).records.find(r => r.id === record.id));
});

app.put('/api/records/:id', async (req, res) => {
  const db = await dbLayer.readDB();
  const i = db.records.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.records[i] = { ...db.records[i], ...req.body, updatedAt: new Date().toISOString() };
  res.json((await dbLayer.writeDB(db)).records[i]);
});

app.delete('/api/records/:id', async (req, res) => {
  const db = await dbLayer.readDB();
  db.records = db.records.filter(r => r.id !== req.params.id);
  res.json(await dbLayer.writeDB(db));
});

// Timeline entry
app.post('/api/records/:id/timeline', async (req, res) => {
  const db = await dbLayer.readDB();
  const i = db.records.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const entry = { id: genId(), date: new Date().toISOString(), author: 'aaron', ...req.body };
  db.records[i].timeline = db.records[i].timeline || [];
  db.records[i].timeline.push(entry);
  db.records[i].updatedAt = new Date().toISOString();
  res.json((await dbLayer.writeDB(db)).records[i]);
});

// Weekly reviews
app.get('/api/reviews', async (req, res) => {
  const db = await dbLayer.readDB();
  res.json(db.reviews || []);
});

app.post('/api/reviews', async (req, res) => {
  const db = await dbLayer.readDB();
  db.reviews = db.reviews || [];
  const review = { id: genId(), createdAt: new Date().toISOString(), ...req.body };
  db.reviews.unshift(review);
  res.json((await dbLayer.writeDB(db)).reviews[0]);
});

// ── FILE ROUTES ──────────────────────────────────────────────────────────────

// List all uploaded files
app.get('/api/files', async (req, res) => {
  try {
    const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET }));
    const files = (list.Contents || [])
      .map(obj => ({ name: obj.Key, size: obj.Size, uploadedAt: obj.LastModified }))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload file(s)
app.post('/api/files', upload.array('files', 20), async (req, res) => {
  try {
    const uploaded = [];
    for (const f of req.files) {
      let key = f.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      try {
        await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
        key = Date.now() + '_' + key;
      } catch (e) { /* file doesn't exist, use as-is */ }
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: key,
        Body: f.buffer, ContentType: f.mimetype,
      }));
      uploaded.push({ name: key, originalName: f.originalname, size: f.size, uploadedAt: new Date() });
    }
    res.json(uploaded);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message, cause: err.cause?.message, code: err.Code || err.code });
  }
});

// Parse statement image/PDF with Claude vision → extract balance + date
app.post('/api/records/:id/parse-statement', upload.single('file'), async (req, res) => {
  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const base64 = file.buffer.toString('base64');
    const mediaType = file.mimetype === 'application/pdf' ? 'application/pdf' : file.mimetype;

    const isPdf = mediaType === 'application/pdf';
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          contentBlock,
          { type: 'text', text: 'Extract the following from this financial statement summary: beginning account value, ending account value, contributions this period (0 if none or dashes), and the statement period end date. Respond ONLY with valid JSON: {"beginBalance": 12345.67, "endBalance": 12345.67, "contributions": 0, "date": "2026-05-31"}. Numbers only (no $ or commas). Date in YYYY-MM-DD.' }
        ]
      }]
    });

    const text = message.content[0].text.trim();
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    const beginBalance = parsed.beginBalance || 0;
    const endBalance = parsed.endBalance || 0;
    const contributions = parsed.contributions || 0;
    const investmentGain = endBalance - beginBalance - contributions;
    const returnPct = beginBalance > 0 ? Math.round((investmentGain / beginBalance) * 10000) / 100 : 0;
    res.json({ beginBalance, endBalance, contributions, returnPct, date: parsed.date });
  } catch (err) {
    console.error('Parse statement error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rename file
app.put('/api/files/:name', async (req, res) => {
  const oldKey = req.params.name;
  const newKey = req.body.name?.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!newKey) return res.status(400).json({ error: 'Invalid name' });
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: newKey,
      Body: Buffer.concat(chunks), ContentType: obj.ContentType,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: oldKey }));
    res.json({ name: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file
app.delete('/api/files/:name', async (req, res) => {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: req.params.name }));
    res.json({ deleted: req.params.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Catch-all → index.html
app.get('*', (req, res) => {
  setNoCacheHeaders(res);
  res.sendFile(path.join(__dirname, 'index.html'));
});

async function bootstrapAndStart() {
  try {
    await dbLayer.initDB();

    const db = await dbLayer.readDB();
    if ((db.areas || []).length === 0 && (db.records || []).length === 0) {
      const seed = initDB();
      await dbLayer.writeDB(seed);
      console.log('  Seeded default starter data into SQLite.');
    }

    app.listen(PORT, HOST, () => {
      console.log(`\n✓ Dashboard running at http://localhost:${PORT}`);
      console.log(`  Host: ${HOST}`);
      console.log(`  DB: ${dbLayer.DB_PATH}`);
      console.log(`  Uploads: r2://${R2_BUCKET}\n`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

bootstrapAndStart();
