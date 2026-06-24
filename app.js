const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
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
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const RENDER_API_KEY = process.env.RENDER_API_KEY || '';
const RENDER_OWNER_ID = process.env.RENDER_OWNER_ID || '';
const NEON_API_KEY = process.env.NEON_API_KEY || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const BCRYPT_ROUNDS = 12;

function signToken(val) {
  return crypto.createHmac('sha256', SESSION_SECRET).update(val).digest('hex');
}

function parseCookies(req) {
  const list = {};
  const header = req.headers.cookie;
  if (!header) return list;
  header.split(';').forEach(c => {
    const [k, ...v] = c.split('=');
    list[k.trim()] = decodeURIComponent(v.join('=').trim());
  });
  return list;
}

function getSessionUserId(req) {
  const cookies = parseCookies(req);
  const token = cookies['dash_session'];
  if (!token) return null;
  const [userId, sig] = token.split('.');
  if (!userId || sig !== signToken(userId)) return null;
  return userId;
}

function setSessionCookie(res, userId) {
  const token = `${userId}.${signToken(userId)}`;
  res.setHeader('Set-Cookie', `dash_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Max-Age=2147483647; Path=/`);
}

function requireAuth(req, res, next) {
  if (getSessionUserId(req)) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/login');
}

const PAGE_STYLE = `*{box-sizing:border-box;margin:0;padding:0}body{background:#0f0f0f;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}.box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:40px;width:360px}h2{color:#fff;font-size:18px;margin-bottom:6px;font-weight:600}p{color:#666;font-size:13px;margin-bottom:24px}.field{margin-bottom:14px}.label{color:#888;font-size:12px;margin-bottom:4px}input{width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none}input:focus{border-color:#3b82f6}button{width:100%;background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:6px}button:hover{background:#2563eb}.err{color:#f87171;font-size:13px;margin-top:12px}`;

const SETUP_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard — Setup</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Welcome</h2><p>Create your account to get started.</p>
<form method="POST" action="/setup">
<div class="field"><div class="label">Your name</div><input type="text" name="name" placeholder="First name" autofocus autocomplete="name"></div>
<div class="field"><div class="label">Password</div><input type="password" name="password" placeholder="Choose a password" autocomplete="new-password"></div>
<div class="field"><div class="label">Confirm password</div><input type="password" name="confirm" placeholder="Confirm password" autocomplete="new-password"></div>
<button type="submit">Create account</button>
</form><div class="err">{{ERROR}}</div></div></body></html>`;

const LOGIN_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Dashboard</h2><p style="margin-bottom:24px"></p>
<form method="POST" action="/login">
<div class="field"><div class="label">Password</div><input type="password" name="password" placeholder="Password" autofocus autocomplete="current-password"></div>
<button type="submit">Sign in</button>
</form><div class="err">{{ERROR}}</div></div></body></html>`;

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
app.use(express.urlencoded({ extended: false }));

// First-run + auth routes (unprotected)
async function firstRunCheck(req, res, next) {
  if (req.path === '/setup' || req.path.startsWith('/static/')) return next();
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (!hasUser) return res.redirect('/setup');
  next();
}

app.use(firstRunCheck);

app.get('/setup', async (req, res) => {
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (hasUser) return res.redirect('/');
  res.send(SETUP_HTML.replace('{{ERROR}}', ''));
});

app.post('/setup', async (req, res) => {
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (hasUser) return res.redirect('/');
  const { name, password, confirm } = req.body;
  if (!name || !name.trim()) return res.send(SETUP_HTML.replace('{{ERROR}}', 'Name is required'));
  if (!password || password.length < 6) return res.send(SETUP_HTML.replace('{{ERROR}}', 'Password must be at least 6 characters'));
  if (password !== confirm) return res.send(SETUP_HTML.replace('{{ERROR}}', 'Passwords do not match'));
  const id = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await dbLayer.createUser({ id, name: name.trim(), passwordHash });
  setSessionCookie(res, id);
  res.redirect('/');
});

app.get('/login', async (req, res) => {
  if (getSessionUserId(req)) return res.redirect('/');
  res.send(LOGIN_HTML.replace('{{ERROR}}', ''));
});

app.post('/login', async (req, res) => {
  const { password } = req.body;
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (!hasUser) return res.redirect('/setup');
  const row = await dbLayer.getUserByInstance();
  if (!row || !await bcrypt.compare(password, row.password_hash)) {
    return res.send(LOGIN_HTML.replace('{{ERROR}}', 'Incorrect password'));
  }
  setSessionCookie(res, row.id);
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'dash_session=; HttpOnly; Max-Age=0; Path=/');
  res.redirect('/login');
});

// Protect everything else
app.use(requireAuth);

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

// ── ADMIN PANEL ───────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

const ADMIN_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard Admin</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d0d;color:#e2e2e2;font-family:system-ui,sans-serif;font-size:14px;padding:32px}
h1{font-size:20px;font-weight:600;margin-bottom:24px}h2{font-size:15px;font-weight:600;margin:24px 0 12px;color:#888;text-transform:uppercase;letter-spacing:.06em;font-size:11px}
.card{background:#161616;border:1px solid #252525;border-radius:10px;padding:20px;margin-bottom:12px}
.field{margin-bottom:12px}.label{font-size:11px;color:#666;margin-bottom:4px}
input,textarea,select{width:100%;background:#111;border:1px solid #333;border-radius:6px;padding:8px 12px;color:#e2e2e2;font-size:13px;font-family:inherit;outline:none}
input:focus,textarea:focus{border-color:#3b82f6}
button{background:#3b82f6;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;margin-right:8px}
button:hover{opacity:.85}button.danger{background:#e05555}button.secondary{background:#252525;color:#e2e2e2}
.badge{display:inline-block;font-size:10px;padding:2px 8px;border-radius:10px;font-weight:600;margin-left:8px}
.badge-pending{background:rgba(212,148,58,.2);color:#d4943a}
.badge-approved{background:rgba(76,175,125,.2);color:#4caf7d}
.badge-denied{background:rgba(224,85,85,.2);color:#e05555}
.status{font-size:12px;color:#4caf7d;margin-top:8px}
table{width:100%;border-collapse:collapse}td,th{padding:8px 12px;text-align:left;border-bottom:1px solid #1f1f1f;font-size:13px}th{color:#666;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
</style></head><body>
<h1>Dashboard Admin</h1>

<h2>Provision new tenant</h2>
<div class="card">
  <div class="field"><div class="label">Customer name</div><input id="p-name" placeholder="Jane Smith"></div>
  <div class="field"><div class="label">Customer email</div><input id="p-email" type="email" placeholder="jane@example.com"></div>
  <div class="field"><div class="label">Service name (Render)</div><input id="p-svc" placeholder="dashboard-jane" value="dashboard-"></div>
  <button onclick="provision()">Provision instance</button>
  <div class="status" id="p-status"></div>
</div>

<h2>Pending template submissions</h2>
<div id="pending-list"><div style="color:#444">Loading...</div></div>

<script>
const TOKEN = new URLSearchParams(location.search).get('token') || '';
const H = { 'Content-Type': 'application/json', 'x-admin-token': TOKEN };

async function loadPending() {
  const res = await fetch('/admin/api/pending-templates', { headers: H });
  const list = await res.json();
  const el = document.getElementById('pending-list');
  if (!list.length) { el.innerHTML = '<div style="color:#444;font-size:13px">No pending submissions.</div>'; return; }
  el.innerHTML = '<table><thead><tr><th>Name</th><th>Description</th><th>Submitted</th><th>Status</th><th></th></tr></thead><tbody>' +
    list.map(t => \`<tr>
      <td>\${t.name} <span style="font-size:11px;color:#555">\${t.icon||''}</span></td>
      <td style="color:#888">\${t.description||'—'}</td>
      <td style="color:#555">\${t.submitted_at?.slice(0,10)||'—'}</td>
      <td><span class="badge badge-\${t.status}">\${t.status}</span></td>
      <td>
        \${t.status==='pending'?\`<button onclick="setStatus('\${t.id}','approved')">Approve</button><button class="danger" onclick="setStatus('\${t.id}','denied')">Deny</button>\`:''}
      </td>
    </tr>\`).join('') + '</tbody></table>';
}

async function setStatus(id, status) {
  await fetch(\`/admin/api/pending-templates/\${id}\`, { method:'PATCH', headers:H, body:JSON.stringify({status}) });
  loadPending();
}

async function provision() {
  const name = document.getElementById('p-name').value.trim();
  const email = document.getElementById('p-email').value.trim();
  const svc = document.getElementById('p-svc').value.trim();
  const status = document.getElementById('p-status');
  if (!name || !email || !svc) { status.style.color='#e05555'; status.textContent='All fields required'; return; }
  status.style.color='#888'; status.textContent='Provisioning...';
  const res = await fetch('/admin/api/provision', { method:'POST', headers:H, body:JSON.stringify({name,email,serviceName:svc}) });
  const data = await res.json();
  if (data.error) { status.style.color='#e05555'; status.textContent=data.error; }
  else { status.style.color='#4caf7d'; status.textContent='Done! URL: ' + (data.url||'check Render dashboard'); }
}

loadPending();
</script></body></html>`;

app.get('/admin', (req, res) => {
  const token = req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return res.status(401).send('Unauthorized');
  res.send(ADMIN_HTML);
});

app.get('/admin/api/pending-templates', requireAdmin, async (req, res) => {
  res.json(await dbLayer.getPendingTemplates());
});

app.patch('/admin/api/pending-templates/:id', requireAdmin, async (req, res) => {
  const { status } = req.body;
  if (!['approved','denied'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  await dbLayer.updatePendingTemplateStatus(req.params.id, status);
  res.json({ ok: true });
});

// Provisioning automation
app.post('/admin/api/provision', requireAdmin, async (req, res) => {
  const { name, email, serviceName } = req.body;
  if (!name || !email || !serviceName) return res.status(400).json({ error: 'name, email, serviceName required' });
  if (!RENDER_API_KEY || !NEON_API_KEY) return res.status(503).json({ error: 'RENDER_API_KEY and NEON_API_KEY must be set' });

  try {
    // 1. Create Neon project
    const neonRes = await fetch('https://console.neon.tech/api/v2/projects', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NEON_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { name: serviceName } }),
    });
    if (!neonRes.ok) throw new Error(`Neon error: ${await neonRes.text()}`);
    const neonData = await neonRes.json();
    const dbUrl = neonData.connection_uris?.[0]?.connection_uri;
    if (!dbUrl) throw new Error('No connection URI from Neon');

    // 2. Create Render service
    const sessionSecret = require('crypto').randomBytes(32).toString('hex');
    const renderRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_service',
        name: serviceName,
        ownerId: RENDER_OWNER_ID,
        repo: 'https://github.com/asapinsley90/dashboard-app',
        branch: 'main',
        autoDeploy: 'yes',
        serviceDetails: {
          runtime: 'node',
          buildCommand: 'npm install',
          startCommand: 'node app.js',
          envSpecificDetails: { buildCommand: 'npm install', startCommand: 'node app.js' },
        },
        envVars: [
          { key: 'DATABASE_URL', value: dbUrl },
          { key: 'SESSION_SECRET', value: sessionSecret },
          { key: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT || '' },
          { key: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID || '' },
          { key: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY || '' },
          { key: 'R2_BUCKET', value: serviceName },
          { key: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY || '' },
        ],
      }),
    });
    if (!renderRes.ok) throw new Error(`Render error: ${await renderRes.text()}`);
    const renderData = await renderRes.json();
    const serviceUrl = renderData.service?.serviceDetails?.url || `https://${serviceName}.onrender.com`;

    // 3. Send email via SendGrid if configured
    if (SENDGRID_API_KEY && email) {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email }] }],
          from: { email: ADMIN_EMAIL || 'noreply@dashboard.app' },
          subject: 'Your Dashboard is ready',
          content: [{ type: 'text/plain', value: `Hi ${name},\n\nYour personal dashboard is ready at:\n\n${serviceUrl}\n\nVisit the link to create your account and get started.\n\nThanks` }],
        }),
      });
    }

    res.json({ url: serviceUrl, neonProject: neonData.project?.id, renderService: renderData.service?.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/healthz', async (req, res) => {
  try {
    await getHealthStatus();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'degraded' });
  }
});

app.get('/api/health', requireAuth, async (req, res) => {
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

app.get('/api/me', async (req, res) => {
  const userId = getSessionUserId(req);
  const user = await dbLayer.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id, name: user.name,
    onboardingStep: user.onboarding_step || 'start',
    dashboardPrefs: user.dashboard_prefs ? JSON.parse(user.dashboard_prefs) : null,
  });
});

app.patch('/api/me', async (req, res) => {
  const userId = getSessionUserId(req);
  const { onboardingStep, name, currentPassword, newPassword, dashboardPrefs } = req.body;
  if (newPassword) {
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    const user = await dbLayer.getUserById(userId);
    if (!await bcrypt.compare(currentPassword || '', user.password_hash)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await dbLayer.updateUser(userId, { passwordHash });
  }
  if (name !== undefined) await dbLayer.updateUser(userId, { name: name.trim() });
  if (onboardingStep !== undefined) await dbLayer.updateUser(userId, { onboardingStep });
  if (dashboardPrefs !== undefined) await dbLayer.updateUser(userId, { dashboardPrefs });
  res.json({ ok: true });
});

// Area templates (system-defined)
const SYSTEM_TEMPLATES = [
  { id: 'tpl-jobs', name: 'Jobs', description: 'Track applications, interviews, and companies', color: '#5b9bd5', icon: '💼', recordTypes: ['job', 'company', 'contact', 'event'] },
  { id: 'tpl-health', name: 'Health', description: 'Appointments, goals, habits, and providers', color: '#4caf7d', icon: '🏃', recordTypes: ['event', 'goal', 'task', 'contact', 'note'] },
  { id: 'tpl-finances', name: 'Finances', description: 'Accounts, budgets, and financial goals', color: '#d4943a', icon: '💰', recordTypes: ['account', 'goal', 'task', 'note'] },
  { id: 'tpl-home', name: 'Home', description: 'Maintenance, projects, and household tasks', color: '#9b7fd4', icon: '🏠', recordTypes: ['task', 'project', 'event', 'note'] },
  { id: 'tpl-learning', name: 'Learning', description: 'Courses, books, skills, and certifications', color: '#3da89e', icon: '📚', recordTypes: ['goal', 'task', 'note', 'project'] },
  { id: 'tpl-travel', name: 'Travel', description: 'Trips, bookings, and itineraries', color: '#c4607a', icon: '✈️', recordTypes: ['event', 'task', 'note', 'project'] },
  { id: 'tpl-relationships', name: 'Relationships', description: 'Stay in touch, social commitments, and contacts', color: '#d4705a', icon: '👥', recordTypes: ['contact', 'event', 'note', 'task'] },
  { id: 'tpl-admin', name: 'Admin & Legal', description: 'Documents, deadlines, renewals, and licenses', color: '#78909c', icon: '📋', recordTypes: ['task', 'event', 'note', 'project'] },
];

// Record type schemas
app.get('/api/type-schemas', async (req, res) => res.json(await dbLayer.getTypeSchemas()));

app.post('/api/type-schemas', async (req, res) => {
  const { name, icon, fields } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
  await dbLayer.saveTypeSchema({ id, name, icon, fields, isCustom: true });
  res.json({ id, name, icon, fields, isCustom: true });
});

app.put('/api/type-schemas/:id', async (req, res) => {
  const { name, icon, fields } = req.body;
  await dbLayer.saveTypeSchema({ id: req.params.id, name, icon, fields });
  res.json({ ok: true });
});

app.delete('/api/type-schemas/:id', async (req, res) => {
  await dbLayer.deleteTypeSchema(req.params.id);
  res.json({ ok: true });
});

app.get('/api/templates', async (req, res) => {
  const personal = await dbLayer.getUserTemplates();
  const systemWithTag = SYSTEM_TEMPLATES.map(t => ({ ...t, source: 'system' }));
  const personalWithTag = personal.map(t => ({ ...t, source: 'personal' }));
  res.json([...systemWithTag, ...personalWithTag]);
});

app.post('/api/user-templates', async (req, res) => {
  const { name, color, icon, description, recordTypes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = 'utpl-' + Date.now().toString(36);
  await dbLayer.saveUserTemplate({ id, name, color, icon, description, recordTypes });
  res.json({ id, name, color, icon, description, recordTypes, source: 'personal' });
});

app.delete('/api/user-templates/:id', async (req, res) => {
  await dbLayer.deleteUserTemplate(req.params.id);
  res.json({ ok: true });
});

app.post('/api/user-templates/:id/submit', async (req, res) => {
  const templates = await dbLayer.getUserTemplates();
  const tpl = templates.find(t => t.id === req.params.id);
  if (!tpl) return res.status(404).json({ error: 'Template not found' });
  await dbLayer.submitPendingTemplate(tpl);
  res.json({ ok: true });
});

// Assistant chat
app.post('/api/assistant', async (req, res) => {
  const { messages, context } = req.body;
  const userId = getSessionUserId(req);
  const user = await dbLayer.getUserById(userId);
  const db = await dbLayer.readDB();

  const systemPrompt = `You are a helpful assistant built into a personal life dashboard app called Dashboard. The user's name is ${user?.name || 'there'}.

The dashboard has life areas (like Jobs, Health, Finances, Home), and each area contains records (tasks, events, goals, contacts, projects, notes, accounts, companies, jobs).

Current state:
- Areas: ${db.areas.map(a => a.title).join(', ') || 'none yet'}
- Records: ${db.records.length} total

You can help the user navigate the app, understand features, and answer questions. Be concise and friendly. When the user is in onboarding, guide them step by step — don't overwhelm with information. Use plain language, no markdown formatting.`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages: messages || [],
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

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
