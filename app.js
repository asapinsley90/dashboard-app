const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const archiver = require('archiver');
const dbLayer = require('./lib/db-layer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(DATA_DIR, 'db.sqlite');
const UPLOADS_DIR = process.env.UPLOADS_DIR ? path.resolve(process.env.UPLOADS_DIR) : path.join(DATA_DIR, 'uploads');
const BACKUP_TOKEN = process.env.BACKUP_TOKEN || '';

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Store with original filename, deduplicated
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const dest = path.join(UPLOADS_DIR, safeName);
    // If file exists, prefix with timestamp
    if (fs.existsSync(dest)) {
      cb(null, Date.now() + '_' + safeName);
    } else {
      cb(null, safeName);
    }
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(__dirname, { index: false }));
app.use('/uploads', express.static(UPLOADS_DIR));

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

function requireBackupToken(req, res, next) {
  if (!BACKUP_TOKEN) {
    return res.status(503).json({
      error: 'Backup export is not configured. Set BACKUP_TOKEN in environment variables.',
    });
  }

  const provided = req.get('x-backup-token') || req.query.token;
  if (!provided || !secureEquals(provided, BACKUP_TOKEN)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

async function getHealthStatus() {
  const db = await dbLayer.readDB();
  let uploadsWritable = false;
  if (fs.existsSync(UPLOADS_DIR)) {
    try {
      fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
      uploadsWritable = true;
    } catch (err) {
      uploadsWritable = false;
    }
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    dbPath: dbLayer.DB_PATH,
    uploadsDir: UPLOADS_DIR,
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
  const files = fs.existsSync(UPLOADS_DIR)
    ? fs.readdirSync(UPLOADS_DIR).filter(name => !name.startsWith('.'))
    : [];

  return {
    generatedAt: new Date().toISOString(),
    app: 'dashboard',
    dbFile: path.basename(dbLayer.DB_PATH),
    uploadsDir: path.basename(UPLOADS_DIR),
    counts: {
      areas: (db.areas || []).length,
      records: (db.records || []).length,
      reviews: (db.reviews || []).length,
      uploadFiles: files.length,
    },
    notes: [
      'Backup includes db.sqlite and uploads/ directory when present.',
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
  res.json({
    enabled: !!BACKUP_TOKEN,
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

  if (fs.existsSync(dbLayer.DB_PATH)) {
    archive.file(dbLayer.DB_PATH, { name: 'db.sqlite' });
  }

  if (fs.existsSync(UPLOADS_DIR)) {
    archive.directory(UPLOADS_DIR, 'uploads');
  }

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
app.get('/api/files', (req, res) => {
  const files = fs.readdirSync(UPLOADS_DIR)
    .filter(f => !f.startsWith('.'))
    .map(f => {
      const stat = fs.statSync(path.join(UPLOADS_DIR, f));
      return { name: f, size: stat.size, uploadedAt: stat.birthtime };
    })
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  res.json(files);
});

// Upload file(s)
app.post('/api/files', upload.array('files', 20), (req, res) => {
  const uploaded = req.files.map(f => ({
    name: f.filename,
    originalName: f.originalname,
    size: f.size,
    uploadedAt: new Date()
  }));
  res.json(uploaded);
});

// Rename file
app.put('/api/files/:name', (req, res) => {
  const oldPath = path.join(UPLOADS_DIR, req.params.name);
  const newName = req.body.name?.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!newName) return res.status(400).json({ error: 'Invalid name' });
  const newPath = path.join(UPLOADS_DIR, newName);
  if (!fs.existsSync(oldPath)) return res.status(404).json({ error: 'Not found' });
  fs.renameSync(oldPath, newPath);
  res.json({ name: newName });
});

// Delete file
app.delete('/api/files/:name', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.name);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  res.json({ deleted: req.params.name });
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
      console.log(`  Uploads: ${UPLOADS_DIR}\n`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

bootstrapAndStart();
