const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL && !DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false,
});

// Kept for health endpoint compatibility
const DB_PATH = DATABASE_URL ? '(postgres)' : '(no DATABASE_URL set)';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS areas (
      id TEXT PRIMARY KEY,
      title TEXT,
      color TEXT,
      icon TEXT,
      order_ INTEGER,
      "parentId" TEXT,
      "createdAt" TEXT,
      "updatedAt" TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      type TEXT,
      "areaId" TEXT,
      "companyId" TEXT,
      title TEXT,
      status TEXT,
      priority INTEGER,
      urgency TEXT DEFAULT 'none',
      "createdAt" TEXT,
      "updatedAt" TEXT,
      fields TEXT,
      contacts TEXT,
      interviews TEXT,
      documents TEXT,
      links TEXT,
      timeline TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      "createdAt" TEXT,
      data TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      "createdAt" TEXT NOT NULL,
      onboarding_step TEXT DEFAULT 'start'
    )
  `);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step TEXT DEFAULT 'start'`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS dashboard_prefs TEXT DEFAULT NULL`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT`);
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TEXT`);
  // Unique indexes (ignore if already exist)
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`);
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      description TEXT,
      record_types TEXT,
      "createdAt" TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      description TEXT,
      record_types TEXT,
      submitted_at TEXT NOT NULL,
      status TEXT DEFAULT 'pending'
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS record_type_schemas (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      fields TEXT NOT NULL,
      is_custom BOOLEAN DEFAULT false,
      "createdAt" TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      service_name TEXT NOT NULL,
      service_url TEXT,
      render_service_id TEXT,
      neon_project_id TEXT,
      r2_prefix TEXT,
      status TEXT DEFAULT 'provisioning',
      created_at TEXT NOT NULL
    )
  `);

  // Seed built-in schemas if not present
  const schemaCount = await pool.query('SELECT COUNT(*) FROM record_type_schemas');
  if (parseInt(schemaCount.rows[0].count) === 0) {
    const builtins = [
      { id: 'contact', name: 'Contact', icon: '👤', fields: [
        {key:'role',label:'Role',type:'text',order:1},{key:'company',label:'Company',type:'text',order:2},
        {key:'email',label:'Email',type:'email',order:3},{key:'phone',label:'Phone',type:'tel',order:4},
        {key:'linkedin',label:'LinkedIn',type:'url',order:5},{key:'notes',label:'Notes',type:'textarea',order:6}
      ]},
      { id: 'event', name: 'Event', icon: '📅', fields: [
        {key:'date',label:'Date',type:'date',order:1},{key:'time',label:'Time',type:'time',order:2},
        {key:'endTime',label:'End time',type:'time',order:3},{key:'location',label:'Location',type:'text',order:4},
        {key:'link',label:'Link',type:'url',order:5},{key:'category',label:'Category',type:'text',order:6},
        {key:'notes',label:'Notes',type:'textarea',order:7}
      ]},
      { id: 'goal', name: 'Goal', icon: '🎯', fields: [
        {key:'targetDate',label:'Target date',type:'date',order:1},{key:'progress',label:'Progress',type:'text',order:2},
        {key:'notes',label:'Notes',type:'textarea',order:3}
      ]},
      { id: 'task', name: 'Task', icon: '✅', fields: [
        {key:'frequency',label:'Frequency',type:'text',order:1},{key:'lastDone',label:'Last done',type:'date',order:2},
        {key:'nextDue',label:'Next due',type:'date',order:3},{key:'notes',label:'Notes',type:'textarea',order:4}
      ]},
      { id: 'project', name: 'Project', icon: '📁', fields: [
        {key:'description',label:'Description',type:'textarea',order:1},{key:'nextAction',label:'Next action',type:'text',order:2},
        {key:'notes',label:'Notes',type:'textarea',order:3}
      ]},
      { id: 'note', name: 'Note', icon: '📝', fields: [
        {key:'body',label:'Body',type:'textarea',order:1},{key:'notes',label:'Notes',type:'textarea',order:2}
      ]},
      { id: 'company', name: 'Company', icon: '🏢', fields: [
        {key:'industry',label:'Industry',type:'text',order:1},{key:'website',label:'Website',type:'url',order:2},
        {key:'location',label:'Location',type:'text',order:3},{key:'notes',label:'Notes',type:'textarea',order:4}
      ]},
    ];
    for (const s of builtins) {
      await pool.query(
        `INSERT INTO record_type_schemas (id, name, icon, fields, is_custom, "createdAt") VALUES ($1,$2,$3,$4,false,$5) ON CONFLICT DO NOTHING`,
        [s.id, s.name, s.icon, JSON.stringify(s.fields), new Date().toISOString()]
      );
    }
  }

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_records_areaid ON records("areaId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`);
  await pool.query(`ALTER TABLE areas ADD COLUMN IF NOT EXISTS "parentId" TEXT`);
}

async function hasAnyUser() {
  const res = await pool.query('SELECT 1 FROM users LIMIT 1');
  return res.rowCount > 0;
}

async function getUserByInstance() {
  const res = await pool.query('SELECT * FROM users LIMIT 1');
  return res.rows[0] || null;
}

async function getUserById(id) {
  const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

async function createUser({ id, name, username, email, passwordHash, verificationToken }) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO users (id, name, username, email, password_hash, email_verified, verification_token, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, name, username || null, email || null, passwordHash, !email, verificationToken || null, now]
  );
  return { id, name, createdAt: now };
}

async function getUserByUsernameOrEmail(identifier) {
  const res = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1', [identifier]);
  return res.rows[0] || null;
}

async function verifyEmailToken(token) {
  const res = await pool.query(
    `UPDATE users SET email_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING id`,
    [token]
  );
  return res.rows[0]?.id || null;
}

async function setResetToken(userId, token, expiresAt) {
  await pool.query(`UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`, [token, expiresAt, userId]);
}

async function getUserByResetToken(token) {
  const res = await pool.query(
    `SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > $2`,
    [token, new Date().toISOString()]
  );
  return res.rows[0] || null;
}

async function updateUser(id, { name, username, email, passwordHash, onboardingStep, dashboardPrefs, verificationToken, clearReset }) {
  const fields = [];
  const vals = [];
  if (name !== undefined) { fields.push(`name = $${fields.length + 1}`); vals.push(name); }
  if (username !== undefined) { fields.push(`username = $${fields.length + 1}`); vals.push(username); }
  if (email !== undefined) { fields.push(`email = $${fields.length + 1}`); vals.push(email); }
  if (passwordHash !== undefined) { fields.push(`password_hash = $${fields.length + 1}`); vals.push(passwordHash); }
  if (onboardingStep !== undefined) { fields.push(`onboarding_step = $${fields.length + 1}`); vals.push(onboardingStep); }
  if (dashboardPrefs !== undefined) { fields.push(`dashboard_prefs = $${fields.length + 1}`); vals.push(JSON.stringify(dashboardPrefs)); }
  if (verificationToken !== undefined) { fields.push(`verification_token = $${fields.length + 1}`); vals.push(verificationToken); }
  if (clearReset) { fields.push(`reset_token = NULL, reset_token_expires = NULL`); }
  if (!fields.length) return;
  vals.push(id);
  await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
}

async function readDB() {
  const [areasRes, recordsRes, reviewsRes] = await Promise.all([
    pool.query('SELECT * FROM areas ORDER BY order_'),
    pool.query('SELECT * FROM records'),
    pool.query('SELECT * FROM reviews ORDER BY "createdAt" DESC'),
  ]);

  return {
    meta: { version: 1 },
    areas: areasRes.rows.map(a => ({ ...a, parentId: a.parentId || null })),
    records: recordsRes.rows.map(r => ({
      ...r,
      fields:     r.fields     ? JSON.parse(r.fields)     : {},
      contacts:   r.contacts   ? JSON.parse(r.contacts)   : [],
      interviews: r.interviews ? JSON.parse(r.interviews) : [],
      documents:  r.documents  ? JSON.parse(r.documents)  : [],
      links:      r.links      ? JSON.parse(r.links)      : [],
      timeline:   r.timeline   ? JSON.parse(r.timeline)   : [],
    })),
    reviews: reviewsRes.rows.map(r => ({
      ...r,
      data: r.data ? JSON.parse(r.data) : {},
    })),
  };
}

async function writeDB(data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const areas = data.areas || [];
    for (const a of areas) {
      await client.query(
        `INSERT INTO areas (id, title, color, icon, order_, "parentId", "createdAt", "updatedAt")
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (id) DO UPDATE SET
           title=$2, color=$3, icon=$4, order_=$5, "parentId"=$6, "updatedAt"=$8`,
        [a.id, a.title, a.color, a.icon, a.order ?? a.order_, a.parentId || null, a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString()]
      );
    }
    if (areas.length > 0) {
      await client.query(`DELETE FROM areas WHERE id != ALL($1)`, [areas.map(a => a.id)]);
    } else {
      await client.query('DELETE FROM areas');
    }

    const records = data.records || [];
    for (const r of records) {
      await client.query(
        `INSERT INTO records (id, type, "areaId", "companyId", title, status, priority, urgency, "createdAt", "updatedAt", fields, contacts, interviews, documents, links, timeline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (id) DO UPDATE SET
           type=$2, "areaId"=$3, "companyId"=$4, title=$5, status=$6, priority=$7, urgency=$8,
           "updatedAt"=$10, fields=$11, contacts=$12, interviews=$13, documents=$14, links=$15, timeline=$16`,
        [
          r.id, r.type, r.areaId, r.companyId || null, r.title, r.status,
          r.priority || 3, r.urgency || 'none', r.createdAt, r.updatedAt,
          JSON.stringify(r.fields || {}),
          JSON.stringify(r.contacts || []),
          JSON.stringify(r.interviews || []),
          JSON.stringify(r.documents || []),
          JSON.stringify(r.links || []),
          JSON.stringify(r.timeline || []),
        ]
      );
    }
    if (records.length > 0) {
      await client.query(`DELETE FROM records WHERE id != ALL($1)`, [records.map(r => r.id)]);
    } else {
      await client.query('DELETE FROM records');
    }

    const reviews = data.reviews || [];
    for (const rv of reviews) {
      await client.query(
        `INSERT INTO reviews (id, "createdAt", data) VALUES ($1,$2,$3)
         ON CONFLICT (id) DO UPDATE SET data=$3`,
        [rv.id, rv.createdAt, JSON.stringify(rv.data || rv)]
      );
    }
    if (reviews.length > 0) {
      await client.query(`DELETE FROM reviews WHERE id != ALL($1)`, [reviews.map(r => r.id)]);
    } else {
      await client.query('DELETE FROM reviews');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return data;
}

async function close() {
  await pool.end();
}

async function getTypeSchemas() {
  const res = await pool.query('SELECT * FROM record_type_schemas ORDER BY is_custom, id');
  return res.rows.map(r => ({ ...r, fields: JSON.parse(r.fields) }));
}

async function saveTypeSchema({ id, name, icon, fields, isCustom }) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO record_type_schemas (id, name, icon, fields, is_custom, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET name=$2, icon=$3, fields=$4`,
    [id, name, icon || '📁', JSON.stringify(fields || []), isCustom || false, now]
  );
}

async function deleteTypeSchema(id) {
  await pool.query('DELETE FROM record_type_schemas WHERE id=$1 AND is_custom=true', [id]);
}

async function getUserTemplates() {
  const res = await pool.query('SELECT * FROM user_templates ORDER BY "createdAt" DESC');
  return res.rows.map(r => ({ ...r, recordTypes: r.record_types ? JSON.parse(r.record_types) : [] }));
}

async function saveUserTemplate({ id, name, color, icon, description, recordTypes }) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO user_templates (id, name, color, icon, description, record_types, "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (id) DO UPDATE SET name=$2, color=$3, icon=$4, description=$5, record_types=$6`,
    [id, name, color || '#5b9bd5', icon || '📁', description || '', JSON.stringify(recordTypes || []), now]
  );
}

async function deleteUserTemplate(id) {
  await pool.query('DELETE FROM user_templates WHERE id = $1', [id]);
}

async function submitPendingTemplate({ id, name, color, icon, description, recordTypes }) {
  const now = new Date().toISOString();
  await pool.query(
    `INSERT INTO pending_templates (id, name, color, icon, description, record_types, submitted_at, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
     ON CONFLICT (id) DO UPDATE SET status='pending', submitted_at=$7`,
    [id, name, color || '#5b9bd5', icon || '📁', description || '', JSON.stringify(recordTypes || []), now]
  );
}

async function getPendingTemplates() {
  const res = await pool.query('SELECT * FROM pending_templates ORDER BY submitted_at DESC');
  return res.rows.map(r => ({ ...r, recordTypes: r.record_types ? JSON.parse(r.record_types) : [] }));
}

async function updatePendingTemplateStatus(id, status) {
  await pool.query('UPDATE pending_templates SET status = $1 WHERE id = $2', [status, id]);
}

async function createTenant({ id, name, email, serviceName, serviceUrl, renderServiceId, neonProjectId, r2Prefix }) {
  await pool.query(
    `INSERT INTO tenants (id, name, email, service_name, service_url, render_service_id, neon_project_id, r2_prefix, status, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)`,
    [id, name, email, serviceName, serviceUrl || '', renderServiceId || '', neonProjectId || '', r2Prefix || '', new Date().toISOString()]
  );
}

async function getTenants() {
  const r = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC');
  return r.rows.map(t => ({
    id: t.id, name: t.name, email: t.email, serviceName: t.service_name,
    serviceUrl: t.service_url, renderServiceId: t.render_service_id,
    neonProjectId: t.neon_project_id, r2Prefix: t.r2_prefix,
    status: t.status, createdAt: t.created_at,
  }));
}

async function updateTenantStatus(id, status) {
  await pool.query('UPDATE tenants SET status = $1 WHERE id = $2', [status, id]);
}

async function getStats() {
  const [a, r, rev, u] = await Promise.all([
    pool.query('SELECT COUNT(*) FROM areas'),
    pool.query('SELECT COUNT(*) FROM records'),
    pool.query('SELECT COUNT(*) FROM reviews'),
    pool.query('SELECT name, onboarding_step as "onboardingStep" FROM users LIMIT 1'),
  ]);
  // Count R2 document keys stored across records
  const docs = await pool.query(`SELECT SUM(json_array_length(COALESCE(documents, '[]')::json)) FROM records`);
  const user = u.rows[0] || {};
  return {
    areas: parseInt(a.rows[0].count),
    records: parseInt(r.rows[0].count),
    reviews: parseInt(rev.rows[0].count),
    documents: parseInt(docs.rows[0].sum || 0),
    userName: user.name,
    onboardingStep: user.onboardingStep,
  };
}

module.exports = { initDB, readDB, writeDB, close, DB_PATH, hasAnyUser, getUserByInstance, getUserById, createUser, updateUser, getUserByUsernameOrEmail, verifyEmailToken, setResetToken, getUserByResetToken, getTypeSchemas, saveTypeSchema, deleteTypeSchema, getUserTemplates, saveUserTemplate, deleteUserTemplate, submitPendingTemplate, getPendingTemplates, updatePendingTemplateStatus, getStats, createTenant, getTenants, updateTenantStatus };
