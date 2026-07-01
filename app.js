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
const registerScrapeRoutes = require('./scrape_routes');

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
const NEON_ORG_ID = process.env.NEON_ORG_ID || '';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const BCRYPT_ROUNDS = 12;
const APP_URL = process.env.APP_URL || 'https://dashboard-app-jxlb.onrender.com';

async function sendEmail(to, subject, html) {
  const apiKey = RESEND_API_KEY || SENDGRID_API_KEY;
  if (!apiKey) { console.log(`[email] ${subject} → ${to}`); return; }
  if (RESEND_API_KEY) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'Dashboard <onboarding@resend.dev>', to, subject, html }),
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.error('[email] Resend error:', r.status, body);
      throw new Error(`Resend ${r.status}: ${body}`);
    }
    return;
  }
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || ADMIN_EMAIL || 'noreply@dashboard.app';
  const r = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: fromEmail, name: 'Dashboard' },
      subject,
      content: [{ type: 'text/html', value: html }],
    }),
  });
  if (!r.ok) {
    const body = await r.text().catch(() => '');
    console.error('[email] SendGrid error:', r.status, body);
    throw new Error(`SendGrid ${r.status}: ${body}`);
  }
}

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

const PAGE_STYLE = `*{box-sizing:border-box;margin:0;padding:0}body{background:#0f0f0f;display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui,sans-serif}.box{background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;padding:40px;width:380px}h2{color:#fff;font-size:18px;margin-bottom:6px;font-weight:600}.sub{color:#666;font-size:13px;margin-bottom:24px}.field{margin-bottom:12px}.label{color:#888;font-size:11px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}input{width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:10px 14px;color:#fff;font-size:14px;outline:none;font-family:inherit}input:focus{border-color:#3b82f6}.btn{width:100%;background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:10px;font-size:14px;font-weight:600;cursor:pointer;margin-top:8px}.btn:hover{background:#2563eb}.err{color:#f87171;font-size:13px;margin-top:12px}.link{color:#3b82f6;font-size:12px;text-decoration:none;display:block;text-align:center;margin-top:14px}.link:hover{text-decoration:underline}.info{color:#888;font-size:13px;margin-top:14px;text-align:center}`;

const SETUP_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard — Create account</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Create your account</h2><p class="sub">Set up your personal dashboard.</p>
<form method="POST" action="/setup">
<div class="field"><div class="label">Display name</div><input type="text" name="name" placeholder="First name" autofocus autocomplete="name"></div>
<div class="field"><div class="label">Username</div><input type="text" name="username" placeholder="username" autocomplete="username"></div>
<div class="field"><div class="label">Email</div><input type="email" name="email" placeholder="you@example.com" autocomplete="email"></div>
<div class="field"><div class="label">Confirm email</div><input type="email" name="email2" placeholder="Confirm email"></div>
<div class="field"><div class="label">Password</div><input type="password" name="password" placeholder="Choose a password (6+ chars)" autocomplete="new-password"></div>
<div class="field"><div class="label">Confirm password</div><input type="password" name="confirm" placeholder="Confirm password" autocomplete="new-password"></div>
<button class="btn" type="submit">Create account</button>
</form><div class="err">{{ERROR}}</div></div></body></html>`;

const LOGIN_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dashboard</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Dashboard</h2><p class="sub"></p>
<form method="POST" action="/login">
<div class="field"><div class="label">Username or email</div><input type="text" name="identifier" placeholder="username or email" autofocus autocomplete="username"></div>
<div class="field"><div class="label">Password</div><input type="password" name="password" placeholder="Password" autocomplete="current-password"></div>
<button class="btn" type="submit">Sign in</button>
</form>
<a class="link" href="/forgot-password">Forgot password?</a>
<a class="link" href="/join">Request access</a>
<div class="err">{{ERROR}}</div></div></body></html>`;

const VERIFY_PENDING_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Check your email</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Check your email</h2><p class="sub">We sent a verification link to <strong>{{EMAIL}}</strong>. Click it to activate your account.</p>
<div class="info">Didn't receive it? Check your spam folder, or <a class="link" href="/resend-verification?email={{EMAIL}}" style="display:inline">resend</a>.</div>
</div></body></html>`;

const FORGOT_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Forgot password</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Forgot password</h2><p class="sub">Enter your username or email and we'll send a reset link.</p>
<form method="POST" action="/forgot-password">
<div class="field"><div class="label">Username or email</div><input type="text" name="identifier" placeholder="username or email" autofocus></div>
<button class="btn" type="submit">Send reset link</button>
</form>
<a class="link" href="/login">Back to sign in</a>
<div class="err">{{ERROR}}</div><div class="info" style="color:#4caf7d">{{SUCCESS}}</div></div></body></html>`;

const RESET_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reset password</title><style>${PAGE_STYLE}</style></head>
<body><div class="box"><h2>Reset password</h2><p class="sub">Choose a new password for your account.</p>
<form method="POST" action="/reset-password">
<input type="hidden" name="token" value="{{TOKEN}}">
<div class="field"><div class="label">New password</div><input type="password" name="password" placeholder="New password (6+ chars)" autofocus autocomplete="new-password"></div>
<div class="field"><div class="label">Confirm password</div><input type="password" name="confirm" placeholder="Confirm password" autocomplete="new-password"></div>
<button class="btn" type="submit">Reset password</button>
</form><div class="err">{{ERROR}}</div></div></body></html>`;

// R2 storage
const R2_BUCKET = process.env.R2_BUCKET || 'dashboard-uploads';
// Tenant isolation: prefix all R2 keys with tenant's service name so shared bucket stays clean
const R2_PREFIX = process.env.R2_PREFIX ? process.env.R2_PREFIX + '/' : '';
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
  const err = t => res.send(SETUP_HTML.replace('{{ERROR}}', t));
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (hasUser) return res.redirect('/');
  const { name, username, email, email2, password, confirm } = req.body;
  if (!name?.trim()) return err('Display name is required');
  if (!username?.trim() || !/^[a-zA-Z0-9_]{3,30}$/.test(username.trim())) return err('Username must be 3–30 characters, letters/numbers/underscores only');
  if (!email?.trim() || !/\S+@\S+\.\S+/.test(email.trim())) return err('Valid email is required');
  if (email.trim() !== email2?.trim()) return err('Emails do not match');
  if (!password || password.length < 6) return err('Password must be at least 6 characters');
  if (password !== confirm) return err('Passwords do not match');
  const id = crypto.randomBytes(8).toString('hex');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const verificationToken = SENDGRID_API_KEY ? crypto.randomBytes(32).toString('hex') : null;
  await dbLayer.createUser({ id, name: name.trim(), username: username.trim().toLowerCase(), email: email.trim().toLowerCase(), passwordHash, verificationToken });
  if (verificationToken) {
    const link = `${APP_URL}/verify-email?token=${verificationToken}`;
    await sendEmail(email.trim(), 'Verify your Dashboard account', `<p>Hi ${name.trim()},</p><p>Click the link below to verify your email and activate your account:</p><p><a href="${link}">${link}</a></p>`);
    return res.send(VERIFY_PENDING_HTML.replace(/\{\{EMAIL\}\}/g, email.trim()));
  }
  // No SendGrid — auto-verify and sign in
  setSessionCookie(res, id);
  res.redirect('/');
});

app.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');
  const userId = await dbLayer.verifyEmailToken(token);
  if (!userId) return res.send(`<p style="color:#f87171;font-family:system-ui;padding:40px">Invalid or expired verification link. <a href="/login">Sign in</a></p>`);
  setSessionCookie(res, userId);
  res.redirect('/');
});

app.get('/resend-verification', async (req, res) => {
  const { email } = req.query;
  if (!email) return res.redirect('/login');
  const user = await dbLayer.getUserByUsernameOrEmail(email);
  if (user && !user.email_verified) {
    const token = crypto.randomBytes(32).toString('hex');
    await dbLayer.updateUser(user.id, { verificationToken: token });
    const link = `${APP_URL}/verify-email?token=${token}`;
    await sendEmail(user.email, 'Verify your Dashboard account', `<p>Click below to verify your email:</p><p><a href="${link}">${link}</a></p>`);
  }
  res.send(VERIFY_PENDING_HTML.replace(/\{\{EMAIL\}\}/g, email));
});

app.get('/login', async (req, res) => {
  if (getSessionUserId(req)) return res.redirect('/');
  res.send(LOGIN_HTML.replace('{{ERROR}}', ''));
});

app.post('/login', async (req, res) => {
  const { identifier, password } = req.body;
  const hasUser = await dbLayer.hasAnyUser().catch(() => false);
  if (!hasUser) return res.redirect('/setup');
  // Support legacy password-only login (no identifier) for existing single-user instances
  let row;
  if (!identifier?.trim()) {
    row = await dbLayer.getUserByInstance();
  } else {
    row = await dbLayer.getUserByUsernameOrEmail(identifier.trim().toLowerCase());
  }
  if (!row || !await bcrypt.compare(password, row.password_hash)) {
    return res.send(LOGIN_HTML.replace('{{ERROR}}', 'Incorrect username or password'));
  }
  // Email verification disabled until verified sender domain is configured
  setSessionCookie(res, row.id);
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'dash_session=; HttpOnly; Max-Age=0; Path=/');
  res.redirect('/login');
});

app.get('/forgot-password', (req, res) => {
  if (getSessionUserId(req)) return res.redirect('/');
  res.send(FORGOT_HTML.replace('{{ERROR}}', '').replace('{{SUCCESS}}', ''));
});

app.post('/forgot-password', async (req, res) => {
  const { identifier } = req.body;
  const ok = FORGOT_HTML.replace('{{ERROR}}', '').replace('{{SUCCESS}}', 'If that account exists, a reset link has been sent.');
  if (!identifier?.trim()) return res.send(ok);
  const user = await dbLayer.getUserByUsernameOrEmail(identifier.trim().toLowerCase());
  if (user?.email) {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600_000).toISOString(); // 1 hour
    await dbLayer.setResetToken(user.id, token, expires);
    const link = `${APP_URL}/reset-password?token=${token}`;
    await sendEmail(user.email, 'Reset your Dashboard password', `<p>Click below to reset your password (link expires in 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you didn't request this, ignore this email.</p>`);
  }
  res.send(ok);
});

app.get('/reset-password', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/login');
  const user = await dbLayer.getUserByResetToken(token);
  if (!user) return res.send(`<p style="color:#f87171;font-family:system-ui;padding:40px">Reset link has expired. <a href="/forgot-password">Request a new one</a></p>`);
  res.send(RESET_HTML.replace('{{TOKEN}}', token).replace('{{ERROR}}', ''));
});

app.post('/reset-password', async (req, res) => {
  const { token, password, confirm } = req.body;
  const err = t => res.send(RESET_HTML.replace('{{TOKEN}}', token).replace('{{ERROR}}', t));
  if (!token) return res.redirect('/login');
  const user = await dbLayer.getUserByResetToken(token);
  if (!user) return err('Reset link has expired. <a href="/forgot-password" style="color:#3b82f6">Request a new one</a>');
  if (!password || password.length < 6) return err('Password must be at least 6 characters');
  if (password !== confirm) return err('Passwords do not match');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await dbLayer.updateUser(user.id, { passwordHash, clearReset: true });
  setSessionCookie(res, user.id);
  res.redirect('/');
});

// ── PUBLIC ROUTES (before requireAuth) ───────────────────────────────────────
app.get('/join', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Request Access — Dashboard</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0d0d0d;color:#e2e2e2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
.card{background:#161616;border:1px solid #252525;border-radius:16px;padding:40px 36px;width:100%;max-width:400px}
h1{font-size:22px;font-weight:700;margin-bottom:6px}
p{color:#888;font-size:14px;margin-bottom:28px;line-height:1.5}
label{display:block;font-size:11px;font-weight:600;color:#666;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px}
input{width:100%;background:#111;border:1px solid #333;border-radius:8px;padding:10px 14px;color:#e2e2e2;font-size:14px;outline:none;margin-bottom:16px}
input:focus{border-color:#3b82f6}
button{width:100%;background:#3b82f6;color:#fff;border:none;border-radius:8px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;margin-top:4px}
button:hover{opacity:.88}
.msg{margin-top:16px;font-size:13px;text-align:center;color:#4caf7d;display:none}
.err{color:#e05555}
</style></head><body>
<div class="card">
  <h1>Request access</h1>
  <p>Your own personal dashboard — areas, records, calendar, documents, and an AI assistant. Request early access below.</p>
  <label>Your name</label>
  <input id="name" placeholder="Jane Smith" autocomplete="name">
  <label>Email address</label>
  <input id="email" type="email" placeholder="jane@example.com" autocomplete="email">
  <button onclick="submit()">Request access</button>
  <div class="msg" id="msg"></div>
</div>
<script>
async function submit() {
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const msg = document.getElementById('msg');
  if (!name || !email) { msg.style.display='block'; msg.className='msg err'; msg.textContent='Please fill in both fields.'; return; }
  const res = await fetch('/api/waitlist', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email}) });
  const data = await res.json();
  if (data.error) { msg.style.display='block'; msg.className='msg err'; msg.textContent=data.error; return; }
  msg.style.display='block'; msg.className='msg';
  msg.textContent="You're on the list! We'll be in touch soon.";
  document.querySelector('button').disabled=true;
}
</script></body></html>`);
});

app.post('/api/waitlist', async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });
  const id = 'wl-' + Date.now().toString(36) + '-' + crypto.randomBytes(4).toString('hex');
  try {
    await dbLayer.createWaitlistEntry({ id, name, email });
    const approveUrl = `${APP_URL}/api/waitlist/${id}/approve?token=${ADMIN_TOKEN}`;
    try {
      await sendEmail(
        ADMIN_EMAIL,
        `New waitlist request: ${name}`,
        `<p><b>${name}</b> (${email}) has requested access to the dashboard.</p>
         <p style="margin-top:16px"><a href="${approveUrl}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Approve & provision</a></p>
         <p style="margin-top:12px;font-size:12px;color:#888">Or copy this link: ${approveUrl}</p>`
      );
    } catch (emailErr) {
      console.error('[waitlist] email failed:', emailErr.message);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/waitlist/:id/approve', async (req, res) => {
  const token = req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return res.status(401).send('Unauthorized');
  const entry = await dbLayer.getWaitlistEntry(req.params.id);
  if (!entry) return res.status(404).send('Waitlist entry not found');
  if (entry.status === 'approved') return res.send(`<html><body style="font-family:sans-serif;padding:40px;background:#0d0d0d;color:#e2e2e2"><h2>Already approved</h2><p>${entry.name} was already provisioned.</p></body></html>`);
  const { name, email } = entry;

  // Check for existing in-progress tenant (partial provisioning from a previous attempt)
  const existingTenants = await dbLayer.getTenants();
  const existing = existingTenants.find(t => t.email === email && t.status === 'provisioning');

  const serviceName = existing?.serviceName || ('dashboard-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g,'-').slice(0,20) + '-' + crypto.randomBytes(2).toString('hex'));
  const r2Prefix = existing?.r2Prefix || serviceName;
  const tenantId = existing?.id || ('tenant-' + Date.now().toString(36));

  try {
    let dbUrl, neonProjectId;
    if (existing?.neonProjectId) {
      // Reuse existing Neon project — fetch connection URI
      const neonDetail = await fetch(`https://console.neon.tech/api/v2/projects/${existing.neonProjectId}`, {
        headers: { 'Authorization': `Bearer ${NEON_API_KEY}` },
      });
      if (!neonDetail.ok) throw new Error(`Neon fetch: ${await neonDetail.text()}`);
      const nd = await neonDetail.json();
      dbUrl = nd.connection_uris?.[0]?.connection_uri;
      neonProjectId = existing.neonProjectId;
    } else {
      const neonRes = await fetch('https://console.neon.tech/api/v2/projects', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${NEON_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: { name: serviceName, ...(NEON_ORG_ID ? { org_id: NEON_ORG_ID } : {}) } }),
      });
      if (!neonRes.ok) throw new Error(`Neon: ${await neonRes.text()}`);
      const neonData = await neonRes.json();
      dbUrl = neonData.connection_uris?.[0]?.connection_uri;
      neonProjectId = neonData.project?.id || '';
      // Save partial tenant record so retries reuse this Neon project
      if (!existing) {
        await dbLayer.createTenant({ id: tenantId, name, email, serviceName, serviceUrl: '', renderServiceId: '', neonProjectId, r2Prefix }).catch(() => {});
        await dbLayer.updateTenantStatus(tenantId, 'provisioning');
      }
    }
    if (!dbUrl) throw new Error('No connection URI from Neon');
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    const tenantAdminToken = crypto.randomBytes(20).toString('hex');
    const githubRepo = process.env.GITHUB_REPO || 'https://github.com/asapinsley90/dashboard-app';
    const renderRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_service', name: serviceName, ownerId: RENDER_OWNER_ID,
        repo: githubRepo, branch: 'main', autoDeploy: 'yes',
        serviceDetails: {
          runtime: 'node', plan: 'starter',
          envSpecificDetails: { buildCommand: 'npm install', startCommand: 'node app.js' },
        },
        envVars: [
          { key: 'DATABASE_URL', value: dbUrl },
          { key: 'SESSION_SECRET', value: sessionSecret },
          { key: 'ADMIN_TOKEN', value: tenantAdminToken },
          { key: 'ADMIN_EMAIL', value: ADMIN_EMAIL || '' },
          { key: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT || '' },
          { key: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID || '' },
          { key: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY || '' },
          { key: 'R2_BUCKET', value: process.env.R2_BUCKET || '' },
          { key: 'R2_PREFIX', value: r2Prefix },
          { key: 'SENDGRID_API_KEY', value: SENDGRID_API_KEY || '' },
          { key: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY || '' },
          { key: 'SKIP_SEED', value: 'true' },
        ],
      }),
    });
    if (!renderRes.ok) throw new Error(`Render: ${await renderRes.text()}`);
    const renderData = await renderRes.json();
    const renderServiceId = renderData.service?.id || '';
    const serviceUrl = renderData.service?.serviceDetails?.url || `https://${serviceName}.onrender.com`;
    if (existing) {
      await dbLayer.updateTenantProvisioned(tenantId, { serviceUrl, renderServiceId });
    } else {
      await dbLayer.createTenant({ id: tenantId, name, email, serviceName, serviceUrl, renderServiceId, neonProjectId, r2Prefix });
    }
    await dbLayer.updateWaitlistStatus(req.params.id, 'approved');
    try {
      await sendEmail(email, 'Your Dashboard is ready',
        `<p>Hi ${name},</p><p>Your personal dashboard is ready at:</p><p style="margin:16px 0"><a href="${serviceUrl}" style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">${serviceUrl}</a></p><p>Click the link to create your account and get started.</p>`
      );
    } catch (emailErr) {
      console.error('[provision] welcome email failed:', emailErr.message);
    }
    res.send(`<html><body style="font-family:sans-serif;padding:40px;background:#0d0d0d;color:#e2e2e2">
      <h2 style="color:#4caf7d">✓ Provisioned</h2>
      <p style="margin-top:12px">${name} (${email}) has been provisioned.</p>
      <p style="margin-top:8px;color:#888">Service: <a href="${serviceUrl}" style="color:#3b82f6">${serviceUrl}</a></p>
      <p style="margin-top:8px;color:#888">Welcome email sent. Render will finish deploying in ~2 minutes.</p>
    </body></html>`);
  } catch (err) {
    res.status(500).send(`<html><body style="font-family:sans-serif;padding:40px;background:#0d0d0d;color:#e2e2e2"><h2 style="color:#e05555">Error</h2><p>${err.message}</p></body></html>`);
  }
});

// Protect everything else
app.use(requireAuth);

app.use(express.static(__dirname, { index: false, etag: false, lastModified: false, setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache') }));

// Proxy uploads from R2
app.get('/uploads/:name', async (req, res) => {
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + req.params.name }));
    const ct = obj.ContentType || 'application/octet-stream';
    // Block active content types from executing inline — force download
    const activeTypes = /^(text\/html|text\/xml|image\/svg|application\/xml|application\/xhtml)/i;
    const safeType = activeTypes.test(ct) ? 'application/octet-stream' : ct;
    res.setHeader('Content-Type', safeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${req.params.name}"`);
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
    await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + '.health' }));
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
    const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: R2_PREFIX }));
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

<h2>Instance stats</h2>
<div class="card" id="stats-card"><div style="color:#444">Loading...</div></div>

<h2>Waitlist</h2>
<div id="waitlist-list"><div style="color:#444">Loading...</div></div>

<h2>Tenants</h2>
<div id="tenant-list"><div style="color:#444">Loading...</div></div>

<h2>Provision new tenant</h2>
<div class="card">
  <div class="field"><div class="label">Customer name</div><input id="p-name" placeholder="Jane Smith"></div>
  <div class="field"><div class="label">Customer email</div><input id="p-email" type="email" placeholder="jane@example.com"></div>
  <div class="field"><div class="label">Service name (Render, must be unique)</div><input id="p-svc" placeholder="dashboard-jane" value="dashboard-"></div>
  <button onclick="provision()">Provision instance</button>
  <div class="status" id="p-status"></div>
</div>

<h2>Pending template submissions</h2>
<div id="pending-list"><div style="color:#444">Loading...</div></div>

<h2>Schema changes <span style="font-size:12px;font-weight:400;color:#888">(custom fields added or edited by users)</span></h2>
<div id="schema-changes-list"><div style="color:#444">Loading...</div></div>

<script>
const TOKEN = new URLSearchParams(location.search).get('token') || localStorage.getItem('admin_token') || '';
if (TOKEN) localStorage.setItem('admin_token', TOKEN);
// Keep URL clean after first load
if (new URLSearchParams(location.search).get('token')) history.replaceState({}, '', '/admin');
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

async function loadWaitlist() {
  const res = await fetch('/admin/api/waitlist', { headers: H });
  const list = await res.json();
  const el = document.getElementById('waitlist-list');
  if (!list.length) { el.innerHTML = '<div style="color:#444;font-size:13px;padding:4px 0">No waitlist requests yet. Share <b>/join</b> to get signups.</div>'; return; }
  el.innerHTML = '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Requested</th><th></th></tr></thead><tbody>' +
    list.map(w => \`<tr>
      <td>\${w.name}</td>
      <td style="color:#888">\${w.email}</td>
      <td><span class="badge badge-\${w.status==='approved'?'approved':w.status==='denied'?'denied':'pending'}">\${w.status}</span></td>
      <td style="color:#555">\${w.createdAt?.slice(0,10)||'—'}</td>
      <td>
        \${w.status==='pending'?\`<button onclick="approveWaitlist('\${w.id}')">Approve</button><button class="danger" onclick="denyWaitlist('\${w.id}')">Deny</button>\`:''}
        <button class="danger" onclick="deleteWaitlist('\${w.id}')" style="opacity:.6">✕</button>
      </td>
    </tr>\`).join('') + '</tbody></table></div>';
}

async function approveWaitlist(id) {
  const btn = event.target; btn.disabled=true; btn.textContent='Provisioning...';
  try {
    const res = await fetch(\`/api/waitlist/\${id}/approve?token=\${TOKEN}\`);
    const text = await res.text();
    if (!res.ok) {
      alert('Provisioning failed:\\n\\n' + text.replace(/<[^>]+>/g,''));
      btn.disabled=false; btn.textContent='Approve';
      return;
    }
    loadWaitlist(); loadTenants();
  } catch(e) {
    alert('Error: ' + e.message);
    btn.disabled=false; btn.textContent='Approve';
  }
}

async function denyWaitlist(id) {
  await fetch(\`/admin/api/waitlist/\${id}\`, { method:'PATCH', headers:H, body:JSON.stringify({status:'denied'}) });
  loadWaitlist();
}

async function deleteWaitlist(id) {
  if (!confirm('Delete this waitlist request?')) return;
  await fetch(\`/admin/api/waitlist/\${id}\`, { method:'DELETE', headers:H });
  loadWaitlist();
}

async function deleteTenant(id) {
  if (!confirm('Delete this tenant record? This does not stop the Render service.')) return;
  await fetch(\`/admin/api/tenants/\${id}\`, { method:'DELETE', headers:H });
  loadTenants();
}

async function loadTenants() {
  const res = await fetch('/admin/api/tenants', { headers: H });
  const list = await res.json();
  const el = document.getElementById('tenant-list');
  if (!list.length) { el.innerHTML = '<div style="color:#444;font-size:13px;padding:4px 0">No tenants yet.</div>'; return; }
  el.innerHTML = '<div class="card" style="padding:0;overflow:hidden"><table><thead><tr><th>Name</th><th>Email</th><th>URL</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>' +
    list.map(t => \`<tr>
      <td>\${t.name}</td>
      <td style="color:#888">\${t.email}</td>
      <td>\${t.serviceUrl ? \`<a href="\${t.serviceUrl}" target="_blank" style="color:#3b82f6">\${t.serviceUrl.replace('https://','')}</a>\` : '<span style="color:#555">pending</span>'}</td>
      <td><span class="badge badge-\${t.status==='active'?'approved':t.status==='suspended'?'denied':'pending'}">\${t.status}</span></td>
      <td style="color:#555">\${t.createdAt?.slice(0,10)||'—'}</td>
      <td>
        \${t.status==='active'?\`<button class="secondary" onclick="setTenantStatus('\${t.id}','suspended')">Suspend</button>\`:''}
        \${t.status==='suspended'?\`<button onclick="setTenantStatus('\${t.id}','active')">Reactivate</button>\`:''}
        <button class="danger" onclick="deleteTenant('\${t.id}')" style="opacity:.6">✕</button>
      </td>
    </tr>\`).join('') + '</tbody></table></div>';
}

async function setTenantStatus(id, status) {
  await fetch(\`/admin/api/tenants/\${id}\`, { method:'PATCH', headers:H, body:JSON.stringify({status}) });
  loadTenants();
}

async function provision() {
  const name = document.getElementById('p-name').value.trim();
  const email = document.getElementById('p-email').value.trim();
  const svc = document.getElementById('p-svc').value.trim();
  const status = document.getElementById('p-status');
  if (!name || !email || !svc) { status.style.color='#e05555'; status.textContent='All fields required'; return; }
  status.style.color='#888'; status.textContent='Provisioning — this takes 30-60 seconds...';
  const res = await fetch('/admin/api/provision', { method:'POST', headers:H, body:JSON.stringify({name,email,serviceName:svc}) });
  const data = await res.json();
  if (data.error) { status.style.color='#e05555'; status.textContent=data.error; }
  else {
    status.style.color='#4caf7d';
    status.textContent='Done! URL: ' + (data.url||'check Render dashboard') + ' — welcome email sent.';
    loadTenants();
    document.getElementById('p-name').value='';
    document.getElementById('p-email').value='';
    document.getElementById('p-svc').value='dashboard-';
  }
}

async function loadStats() {
  const res = await fetch('/admin/api/stats', { headers: H });
  const d = await res.json();
  const el = document.getElementById('stats-card');
  if (d.error) { el.innerHTML = '<div style="color:#e05555">'+d.error+'</div>'; return; }
  el.innerHTML = \`<table><thead><tr><th>Metric</th><th>Value</th></tr></thead><tbody>
    <tr><td>Areas</td><td>\${d.areas}</td></tr>
    <tr><td>Records</td><td>\${d.records}</td></tr>
    <tr><td>Reviews</td><td>\${d.reviews}</td></tr>
    <tr><td>Documents (R2 keys)</td><td>\${d.documents}</td></tr>
    <tr><td>User name</td><td>\${d.userName||'—'}</td></tr>
    <tr><td>Onboarding step</td><td>\${d.onboardingStep||'—'}</td></tr>
  </tbody></table>\`;
}

async function loadSchemaChanges() {
  const res = await fetch('/admin/api/schema-changes', { headers: H });
  const list = await res.json();
  const el = document.getElementById('schema-changes-list');
  if (!list.length) { el.innerHTML = '<div style="color:#444;font-size:13px">No schema changes yet.</div>'; return; }
  el.innerHTML = '<table><thead><tr><th>Schema</th><th>Action</th><th>Fields</th><th>Date</th><th></th></tr></thead><tbody>' +
    list.map(c => \`<tr style="opacity:\${c.reviewed?0.5:1}">
      <td>\${c.schemaName} <span style="font-size:11px;color:#555">(\${c.schemaId})</span></td>
      <td><span class="badge badge-\${c.action==='created'?'approved':'pending'}">\${c.action}</span></td>
      <td style="color:#888;font-size:11px">\${JSON.parse(typeof c.fields==='string'?c.fields:'[]').map(f=>f.label).join(', ')||'—'}</td>
      <td style="color:#555">\${c.createdAt?.slice(0,10)||'—'}</td>
      <td>\${!c.reviewed?\`<button onclick="markReviewed('\${c.id}')">Mark reviewed</button>\`:'<span style="color:#4caf50">✓</span>'}</td>
    </tr>\`).join('') + '</tbody></table>';
}

async function markReviewed(id) {
  await fetch(\`/admin/api/schema-changes/\${id}/reviewed\`, { method:'PATCH', headers:H });
  loadSchemaChanges();
}

loadStats();
loadWaitlist();
loadTenants();
loadPending();
loadSchemaChanges();
</script></body></html>`;

app.get('/admin', (req, res) => {
  const token = req.query.token;
  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) return res.status(401).send('Unauthorized');
  res.send(ADMIN_HTML);
});

app.get('/admin/api/stats', requireAdmin, async (req, res) => {
  try { res.json(await dbLayer.getStats()); }
  catch (e) { res.status(500).json({ error: e.message }); }
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
app.get('/admin/api/waitlist', requireAdmin, async (req, res) => {
  try { res.json(await dbLayer.getWaitlist()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/waitlist/:id', requireAdmin, async (req, res) => {
  try { await dbLayer.updateWaitlistStatus(req.params.id, req.body.status); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/tenants', requireAdmin, async (req, res) => {
  try { res.json(await dbLayer.getTenants()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.patch('/admin/api/tenants/:id', requireAdmin, async (req, res) => {
  try { await dbLayer.updateTenantStatus(req.params.id, req.body.status); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/admin/api/waitlist/:id', requireAdmin, async (req, res) => {
  try { await dbLayer.deleteWaitlistEntry(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/admin/api/tenants/:id', requireAdmin, async (req, res) => {
  try { await dbLayer.deleteTenant(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/api/schema-changes', requireAdmin, async (req, res) => {
  const changes = await dbLayer.getSchemaChanges();
  res.json(changes);
});

app.patch('/admin/api/schema-changes/:id/reviewed', requireAdmin, async (req, res) => {
  await dbLayer.markSchemaChangeReviewed(req.params.id);
  res.json({ ok: true });
});

app.post('/admin/api/provision', requireAdmin, async (req, res) => {
  const { name, email, serviceName } = req.body;
  if (!name || !email || !serviceName) return res.status(400).json({ error: 'name, email, serviceName required' });
  if (!RENDER_API_KEY || !NEON_API_KEY) return res.status(503).json({ error: 'RENDER_API_KEY and NEON_API_KEY must be set' });
  if (!RENDER_OWNER_ID) return res.status(503).json({ error: 'RENDER_OWNER_ID must be set' });

  const tenantId = 'tenant-' + Date.now().toString(36);
  // Use shared R2 bucket with per-tenant prefix to avoid bucket creation complexity
  const r2Prefix = serviceName.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  try {
    // 1. Create Neon project
    const neonRes = await fetch('https://console.neon.tech/api/v2/projects', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NEON_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: { name: serviceName, ...(NEON_ORG_ID ? { org_id: NEON_ORG_ID } : {}) } }),
    });
    if (!neonRes.ok) throw new Error(`Neon error: ${await neonRes.text()}`);
    const neonData = await neonRes.json();
    const dbUrl = neonData.connection_uris?.[0]?.connection_uri;
    if (!dbUrl) throw new Error('No connection URI from Neon');
    const neonProjectId = neonData.project?.id || '';

    // 2. Create Render service
    const sessionSecret = crypto.randomBytes(32).toString('hex');
    const tenantAdminToken = crypto.randomBytes(20).toString('hex');
    const githubRepo = process.env.GITHUB_REPO || 'https://github.com/asapinsley90/dashboard-app';
    const renderRes = await fetch('https://api.render.com/v1/services', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'web_service',
        name: serviceName,
        ownerId: RENDER_OWNER_ID,
        repo: githubRepo,
        branch: 'main',
        autoDeploy: 'yes',
        serviceDetails: {
          runtime: 'node',
          plan: 'starter',
          envSpecificDetails: { buildCommand: 'npm install', startCommand: 'node app.js' },
        },
        envVars: [
          { key: 'DATABASE_URL', value: dbUrl },
          { key: 'SESSION_SECRET', value: sessionSecret },
          { key: 'ADMIN_TOKEN', value: tenantAdminToken },
          { key: 'ADMIN_EMAIL', value: ADMIN_EMAIL || '' },
          { key: 'R2_ENDPOINT', value: process.env.R2_ENDPOINT || '' },
          { key: 'R2_ACCESS_KEY_ID', value: process.env.R2_ACCESS_KEY_ID || '' },
          { key: 'R2_SECRET_ACCESS_KEY', value: process.env.R2_SECRET_ACCESS_KEY || '' },
          { key: 'R2_BUCKET', value: process.env.R2_BUCKET || '' },
          { key: 'R2_PREFIX', value: r2Prefix },
          { key: 'SENDGRID_API_KEY', value: SENDGRID_API_KEY || '' },
          { key: 'ANTHROPIC_API_KEY', value: process.env.ANTHROPIC_API_KEY || '' },
          { key: 'SKIP_SEED', value: 'true' },
        ],
      }),
    });
    if (!renderRes.ok) throw new Error(`Render error: ${await renderRes.text()}`);
    const renderData = await renderRes.json();
    const renderServiceId = renderData.service?.id || '';
    const serviceUrl = renderData.service?.serviceDetails?.url || `https://${serviceName}.onrender.com`;

    // 3. Save tenant record
    await dbLayer.createTenant({ id: tenantId, name, email, serviceName, serviceUrl, renderServiceId, neonProjectId, r2Prefix });

    // 4. Send welcome email
    try {
      await sendEmail(email, 'Your Dashboard is ready',
        `<p>Hi ${name},</p><p>Your personal dashboard is ready at:</p><p><a href="${serviceUrl}">${serviceUrl}</a></p><p>Visit the link to create your account and get started.</p>`
      );
    } catch (emailErr) {
      console.error('[provision] welcome email failed:', emailErr.message);
    }

    res.json({ url: serviceUrl, tenantId, neonProjectId, renderServiceId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin-enabled', (req, res) => res.json({ enabled: !!ADMIN_TOKEN }));


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
app.get('/api/db', async (req, res) => {
  const db = await dbLayer.readDB();
  // Strip soft-deleted items from the main DB snapshot
  res.json({ ...db, areas: db.areas.filter(a => !a.deletedAt), records: db.records.filter(r => !r.deletedAt) });
});

app.get('/api/me', async (req, res) => {
  const userId = getSessionUserId(req);
  const user = await dbLayer.getUserById(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: user.id, name: user.name,
    username: user.username || null,
    email: user.email || null,
    emailVerified: user.email_verified || false,
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

// Area templates (system-defined) — bump version when template changes to trigger update badge
const SYSTEM_TEMPLATES = [
  { id: 'tpl-jobs', version: 1, name: 'Jobs', description: 'Track applications, interviews, and companies', color: '#5b9bd5', icon: '💼', recordTypes: ['job', 'company', 'contact', 'event'] },
  { id: 'tpl-health', version: 1, name: 'Health', description: 'Appointments, goals, habits, and providers', color: '#4caf7d', icon: '🏃', recordTypes: ['event', 'goal', 'task', 'contact', 'note'] },
  { id: 'tpl-finances', version: 1, name: 'Finances', description: 'Accounts, budgets, and financial goals', color: '#d4943a', icon: '💰', recordTypes: ['account', 'goal', 'task', 'note'] },
  { id: 'tpl-home', version: 1, name: 'Home', description: 'Maintenance, projects, and household tasks', color: '#9b7fd4', icon: '🏠', recordTypes: ['task', 'project', 'event', 'note'] },
  { id: 'tpl-learning', version: 1, name: 'Learning', description: 'Courses, books, skills, and certifications', color: '#3da89e', icon: '📚', recordTypes: ['goal', 'task', 'note', 'project'] },
  { id: 'tpl-travel', version: 1, name: 'Travel', description: 'Trips, bookings, and itineraries', color: '#c4607a', icon: '✈️', recordTypes: ['event', 'task', 'note', 'project'] },
  { id: 'tpl-relationships', version: 1, name: 'Relationships', description: 'Stay in touch, social commitments, and contacts', color: '#d4705a', icon: '👥', recordTypes: ['contact', 'event', 'note', 'task'] },
  { id: 'tpl-admin', version: 1, name: 'Admin & Legal', description: 'Documents, deadlines, renewals, and licenses', color: '#78909c', icon: '📋', recordTypes: ['task', 'event', 'note', 'project'] },
];

// Record type schemas
app.get('/api/type-schemas', async (req, res) => res.json(await dbLayer.getTypeSchemas()));

app.post('/api/type-schemas', async (req, res) => {
  const { name, icon, fields } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = 'custom-' + name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now().toString(36);
  await dbLayer.saveTypeSchema({ id, name, icon, fields, isCustom: true });
  await dbLayer.logSchemaChange({ schemaId: id, schemaName: name, action: 'created', fields });
  res.json({ id, name, icon, fields, isCustom: true });
});

app.put('/api/type-schemas/:id', async (req, res) => {
  const { name, icon, fields } = req.body;
  await dbLayer.saveTypeSchema({ id: req.params.id, name, icon, fields });
  await dbLayer.logSchemaChange({ schemaId: req.params.id, schemaName: name, action: 'updated', fields });
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
  res.json(db.areas.filter(a => !a.deletedAt).sort((a,b) => a.order - b.order));
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
  const now = new Date().toISOString();
  // Soft-delete area and all its children + their records
  const toDelete = [req.params.id, ...db.areas.filter(a => a.parentId === req.params.id).map(a => a.id)];
  db.areas = db.areas.map(a => toDelete.includes(a.id) ? { ...a, deletedAt: now } : a);
  db.records = db.records.map(r => toDelete.includes(r.areaId) && !r.deletedAt ? { ...r, deletedAt: now, deletedWithArea: req.params.id } : r);
  res.json(await dbLayer.writeDB(db));
});

app.post('/api/areas/:id/restore', async (req, res) => {
  const db = await dbLayer.readDB();
  const area = db.areas.find(a => a.id === req.params.id);
  if (!area) return res.status(404).json({ error: 'Not found' });
  const toRestore = [req.params.id, ...db.areas.filter(a => a.parentId === req.params.id).map(a => a.id)];
  db.areas = db.areas.map(a => toRestore.includes(a.id) ? { ...a, deletedAt: null } : a);
  // Restore records that were deleted with this area
  db.records = db.records.map(r => r.deletedWithArea === req.params.id ? { ...r, deletedAt: null, deletedWithArea: null } : r);
  res.json(await dbLayer.writeDB(db));
});

app.delete('/api/areas/:id/permanent', async (req, res) => {
  const db = await dbLayer.readDB();
  const toDelete = [req.params.id, ...db.areas.filter(a => a.parentId === req.params.id).map(a => a.id)];
  // Delete R2 files for records in these areas
  for (const r of db.records.filter(rec => toDelete.includes(rec.areaId))) {
    for (const doc of r.documents || []) {
      const docKey = typeof doc === 'string' ? doc : (doc.name || doc.key);
      if (docKey) await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + docKey })).catch(() => {});
    }
  }
  db.records = db.records.filter(r => !toDelete.includes(r.areaId));
  db.areas = db.areas.filter(a => !toDelete.includes(a.id));
  res.json(await dbLayer.writeDB(db));
});

// Records
app.get('/api/records', async (req, res) => {
  const db = await dbLayer.readDB();
  let records = db.records.filter(r => !r.deletedAt);
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
  const i = db.records.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  // Soft-delete — files kept in R2 for 24hrs
  db.records[i] = { ...db.records[i], deletedAt: new Date().toISOString() };
  res.json(await dbLayer.writeDB(db));
});

app.post('/api/records/:id/restore', async (req, res) => {
  const db = await dbLayer.readDB();
  const i = db.records.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.records[i] = { ...db.records[i], deletedAt: null, deletedWithArea: null };
  res.json((await dbLayer.writeDB(db)).records[i]);
});

app.delete('/api/records/:id/permanent', async (req, res) => {
  const db = await dbLayer.readDB();
  const record = db.records.find(r => r.id === req.params.id);
  if (record?.documents?.length) {
    for (const doc of record.documents) {
      const docKey = typeof doc === 'string' ? doc : (doc.name || doc.key);
      if (docKey) await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + docKey })).catch(() => {});
    }
  }
  db.records = db.records.filter(r => r.id !== req.params.id);
  res.json(await dbLayer.writeDB(db));
});

// All soft-deleted items
app.get('/api/deleted', async (req, res) => {
  const db = await dbLayer.readDB();
  res.json({
    records: db.records.filter(r => r.deletedAt).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
    areas: db.areas.filter(a => a.deletedAt).sort((a, b) => b.deletedAt.localeCompare(a.deletedAt)),
  });
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

app.delete('/api/records/:id/timeline/:entryId', async (req, res) => {
  const db = await dbLayer.readDB();
  const i = db.records.findIndex(r => r.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  db.records[i].timeline = (db.records[i].timeline || []).filter(e => e.id !== req.params.entryId);
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
    const list = await r2.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, Prefix: R2_PREFIX }));
    const files = (list.Contents || [])
      .map(obj => ({ name: obj.Key.slice(R2_PREFIX.length), size: obj.Size, uploadedAt: obj.LastModified }))
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
        await r2.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + key }));
        key = Date.now() + '_' + key;
      } catch (e) { /* file doesn't exist, use as-is */ }
      const activeTypes = /^(text\/html|text\/xml|image\/svg|application\/xml|application\/xhtml)/i;
      const safeContentType = activeTypes.test(f.mimetype) ? 'application/octet-stream' : f.mimetype;
      await r2.send(new PutObjectCommand({
        Bucket: R2_BUCKET, Key: R2_PREFIX + key,
        Body: f.buffer, ContentType: safeContentType,
        ContentDisposition: `attachment; filename="${f.originalname}"`,
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

    const db = await dbLayer.readDB();
    const record = db.records.find(r => r.id === req.params.id);
    const storedType = record?.fields?.accountType || '';

    const base64 = file.buffer.toString('base64');
    const mediaType = file.mimetype === 'application/pdf' ? 'application/pdf' : file.mimetype;
    const isPdf = mediaType === 'application/pdf';
    const contentBlock = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

    const prompt = `First identify whether this is a credit card statement or an investment/brokerage/savings statement by looking at the content.

If it is a CREDIT CARD statement, extract these fields carefully:
- balance: the new/current total balance owed
- previousBalance: the previous statement balance (before this period's activity)
- purchases: new charges or purchases this period (NOT the minimum payment — look for "New Charges", "New Pay Over Time Charges", or similar)
- payments: total payments and credits received this period
- interestCharged: interest or finance charges added this period (0 if none)
- minPayment: the minimum payment due amount
- dueDate: payment due date in YYYY-MM-DD
- creditLimit: the total credit limit or spending limit (NOT the available amount — look for "Credit Limit", "Pay Over Time Limit", "Spending Limit"; prefer the higher/total limit over the available remaining)
- statementCloseDay: day of month the statement closed (e.g. if closing date is 06/12/26, return 12)
- statementOpenDay: day of month the next billing cycle opens (usually statementCloseDay + 1)
- date: statement closing date in YYYY-MM-DD

Respond ONLY with valid JSON: {"statementType":"credit-card","balance":1942.54,"previousBalance":939.69,"purchases":1397.72,"payments":1289.87,"interestCharged":0,"minPayment":40.00,"dueDate":"2026-07-08","creditLimit":45000.00,"statementCloseDay":12,"statementOpenDay":13,"date":"2026-06-12"}

If it is an INVESTMENT/BROKERAGE/SAVINGS statement, extract: beginning account value, ending account value, contributions this period (0 if none), and statement period end date.
Respond ONLY with valid JSON: {"statementType":"investment","beginBalance":12345.67,"endBalance":12345.67,"contributions":0,"date":"2026-05-31"}

Numbers only (no $ or commas). Dates in YYYY-MM-DD. Use 0 for missing numeric values.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: prompt }] }]
    });

    const text = message.content[0].text.trim();
    const parsed = JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
    const isCreditCard = parsed.statementType === 'credit-card' || storedType === 'Credit Card';

    if (isCreditCard) {
      res.json({ _type: 'credit-card', balance: parsed.balance || 0, previousBalance: parsed.previousBalance || 0, purchases: parsed.purchases || 0, payments: parsed.payments || 0, interestCharged: parsed.interestCharged || 0, minPayment: parsed.minPayment || 0, dueDate: parsed.dueDate || '', creditLimit: parsed.creditLimit || 0, statementCloseDay: parsed.statementCloseDay || null, statementOpenDay: parsed.statementOpenDay || null, date: parsed.date });
    } else {
      const beginBalance = parsed.beginBalance || 0;
      const endBalance = parsed.endBalance || 0;
      const contributions = parsed.contributions || 0;
      const gain = endBalance - beginBalance - contributions;
      const returnPct = beginBalance > 0 ? Math.round(gain / beginBalance * 10000) / 100 : 0;
      res.json({ _type: 'investment', beginBalance, endBalance, contributions, returnPct, date: parsed.date });
    }
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
    const obj = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + oldKey }));
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    const activeTypes = /^(text\/html|text\/xml|image\/svg|application\/xml|application\/xhtml)/i;
    const safeContentType = activeTypes.test(obj.ContentType) ? 'application/octet-stream' : (obj.ContentType || 'application/octet-stream');
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET, Key: R2_PREFIX + newKey,
      Body: Buffer.concat(chunks),
      ContentType: safeContentType,
      ContentDisposition: obj.ContentDisposition || `attachment; filename="${newKey}"`,
    }));
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + oldKey }));
    res.json({ name: newKey });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete file
app.delete('/api/files/:name', async (req, res) => {
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + req.params.name }));
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

    if (!process.env.SKIP_SEED) {
      const db = await dbLayer.readDB();
      if ((db.areas || []).length === 0 && (db.records || []).length === 0) {
        const seed = initDB();
        await dbLayer.writeDB(seed);
        console.log('  Seeded default starter data.');
      }
    }

    registerScrapeRoutes(app);

    app.listen(PORT, HOST, () => {
      console.log(`\n✓ Dashboard running at http://localhost:${PORT}`);
      console.log(`  Host: ${HOST}`);
      console.log(`  DB: ${dbLayer.DB_PATH}`);
      console.log(`  Uploads: r2://${R2_BUCKET}\n`);
    });

    // Purge soft-deleted items older than 24 hours (runs every hour)
    async function purgeDeleted() {
      try {
        const db = await dbLayer.readDB();
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const expiredRecords = db.records.filter(r => r.deletedAt && r.deletedAt < cutoff);
        for (const r of expiredRecords) {
          for (const doc of r.documents || []) {
            const docKey = typeof doc === 'string' ? doc : (doc.name || doc.key);
      if (docKey) await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: R2_PREFIX + docKey })).catch(() => {});
          }
        }
        const before = { r: db.records.length, a: db.areas.length };
        db.records = db.records.filter(r => !r.deletedAt || r.deletedAt >= cutoff);
        db.areas = db.areas.filter(a => !a.deletedAt || a.deletedAt >= cutoff);
        if (db.records.length !== before.r || db.areas.length !== before.a) {
          await dbLayer.writeDB(db);
          console.log(`[purge] Removed ${before.r - db.records.length} records, ${before.a - db.areas.length} areas`);
        }
      } catch (e) { console.error('[purge] error:', e.message); }
    }
    purgeDeleted(); // run once on startup
    setInterval(purgeDeleted, 60 * 60 * 1000); // then every hour
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
}

bootstrapAndStart();
