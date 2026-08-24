const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

// DB_PATH exported for app logging
let DB_PATH = '(no DATABASE_URL set)';

// If DATABASE_URL provided, use Postgres pool and existing SQL-heavy implementation.
if (DATABASE_URL) {
  DB_PATH = '(postgres)';
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: DATABASE_URL && !DATABASE_URL.includes('localhost') ? { rejectUnauthorized: false } : false });

  async function initDB() {
    // Use existing SQL initialization (kept concise for readability)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS areas (
        id TEXT PRIMARY KEY,
        title TEXT,
        color TEXT,
        icon TEXT,
        order_ INTEGER,
        "parentId" TEXT,
        "createdAt" TEXT,
        "updatedAt" TEXT,
        "deletedAt" TEXT DEFAULT NULL
      )
    `);
    await pool.query(`ALTER TABLE areas ADD COLUMN IF NOT EXISTS "deletedAt" TEXT DEFAULT NULL`);

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
        timeline TEXT,
        "deletedAt" TEXT DEFAULT NULL,
        "deletedWithArea" TEXT DEFAULT NULL
      )
    `);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS "deletedAt" TEXT DEFAULT NULL`);
    await pool.query(`ALTER TABLE records ADD COLUMN IF NOT EXISTS "deletedWithArea" TEXT DEFAULT NULL`);

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
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL`);

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
        { id: 'account', name: 'Account', icon: '💳', fields: [
          {key:'institution',label:'Institution',type:'text',order:1},{key:'accountType',label:'Account type',type:'text',order:2},
          {key:'owner',label:'Owner',type:'text',order:3},{key:'last4',label:'Last 4 digits',type:'text',order:4},
          {key:'institutionUrl',label:'Login URL',type:'url',order:5},{key:'institutionDomain',label:'Logo domain',type:'text',order:6}
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
    await pool.query(`CREATE TABLE IF NOT EXISTS schema_change_log (
      id TEXT PRIMARY KEY,
      "schemaId" TEXT,
      "schemaName" TEXT,
      action TEXT,
      fields TEXT,
      "createdAt" TEXT,
      reviewed INTEGER DEFAULT 0
    )`);
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
      reviews: reviewsRes.rows.map(r => ({ ...r, data: r.data ? JSON.parse(r.data) : {} })),
    };
  }

  async function writeDB(data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const areas = data.areas || [];
      for (const a of areas) {
        await client.query(
          `INSERT INTO areas (id, title, color, icon, order_, "parentId", "createdAt", "updatedAt", "deletedAt")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO UPDATE SET
             title=$2, color=$3, icon=$4, order_=$5, "parentId"=$6, "updatedAt"=$8, "deletedAt"=$9`,
          [a.id, a.title, a.color, a.icon, a.order ?? a.order_, a.parentId || null, a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString(), a.deletedAt || null]
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
          `INSERT INTO records (id, type, "areaId", "companyId", title, status, priority, urgency, "createdAt", "updatedAt", fields, contacts, interviews, documents, links, timeline, "deletedAt", "deletedWithArea")
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (id) DO UPDATE SET
             type=$2, "areaId"=$3, "companyId"=$4, title=$5, status=$6, priority=$7, urgency=$8,
             "updatedAt"=$10, fields=$11, contacts=$12, interviews=$13, documents=$14, links=$15, timeline=$16,
             "deletedAt"=$17, "deletedWithArea"=$18`,
          [
            r.id, r.type, r.areaId, r.companyId || null, r.title, r.status,
            r.priority || 3, r.urgency || 'none', r.createdAt, r.updatedAt,
            JSON.stringify(r.fields || {}),
            JSON.stringify(r.contacts || []),
            JSON.stringify(r.interviews || []),
            JSON.stringify(r.documents || []),
            JSON.stringify(r.links || []),
            JSON.stringify(r.timeline || []),
            r.deletedAt || null,
            r.deletedWithArea || null,
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

  async function close() { await pool.end(); }

  // Other convenience functions that app expects — keep a minimal set implemented using SQL
  async function hasAnyUser() { const res = await pool.query('SELECT 1 FROM users LIMIT 1'); return res.rowCount > 0; }
  async function getUserByInstance() { const res = await pool.query('SELECT * FROM users LIMIT 1'); return res.rows[0] || null; }
  async function getUserById(id) { const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]); return res.rows[0] || null; }
  async function createUser({ id, name, username, email, passwordHash, verificationToken }) {
    const now = new Date().toISOString();
    await pool.query(
      `INSERT INTO users (id, name, username, email, password_hash, email_verified, verification_token, "createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, name, username || null, email || null, passwordHash, !email, verificationToken || null, now]
    );
    return { id, name, createdAt: now };
  }
  async function getUserByUsernameOrEmail(identifier) { const res = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1 LIMIT 1', [identifier]); return res.rows[0] || null; }
  async function verifyEmailToken(token) { const res = await pool.query(`UPDATE users SET email_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING id`, [token]); return res.rows[0]?.id || null; }
  async function setResetToken(userId, token, expiresAt) { await pool.query(`UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3`, [token, expiresAt, userId]); }
  async function getUserByResetToken(token) { const res = await pool.query(`SELECT * FROM users WHERE reset_token = $1 AND reset_token_expires > $2`, [token, new Date().toISOString()]); return res.rows[0] || null; }
  async function updateUser(id, fieldsObj) {
    const fields = [];
    const vals = [];
    if (fieldsObj.name !== undefined) { fields.push(`name = $${fields.length + 1}`); vals.push(fieldsObj.name); }
    if (fieldsObj.username !== undefined) { fields.push(`username = $${fields.length + 1}`); vals.push(fieldsObj.username); }
    if (fieldsObj.email !== undefined) { fields.push(`email = $${fields.length + 1}`); vals.push(fieldsObj.email); }
    if (fieldsObj.passwordHash !== undefined) { fields.push(`password_hash = $${fields.length + 1}`); vals.push(fieldsObj.passwordHash); }
    if (fieldsObj.onboardingStep !== undefined) { fields.push(`onboarding_step = $${fields.length + 1}`); vals.push(fieldsObj.onboardingStep); }
    if (fieldsObj.dashboardPrefs !== undefined) { fields.push(`dashboard_prefs = $${fields.length + 1}`); vals.push(JSON.stringify(fieldsObj.dashboardPrefs)); }
    if (fieldsObj.verificationToken !== undefined) { fields.push(`verification_token = $${fields.length + 1}`); vals.push(fieldsObj.verificationToken); }
    if (fieldsObj.clearReset) { fields.push(`reset_token = NULL, reset_token_expires = NULL`); }
    if (!fields.length) return;
    vals.push(id);
    await pool.query(`UPDATE users SET ${fields.join(', ')} WHERE id = $${vals.length}`, vals);
  }

  async function getTypeSchemas() { const res = await pool.query('SELECT * FROM record_type_schemas ORDER BY is_custom, id'); return res.rows.map(r => ({ ...r, fields: JSON.parse(r.fields) })); }
  async function saveTypeSchema({ id, name, icon, fields, isCustom }) { const now = new Date().toISOString(); await pool.query(`INSERT INTO record_type_schemas (id, name, icon, fields, is_custom, "createdAt") VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO UPDATE SET name=$2, icon=$3, fields=$4`, [id, name, icon || '📁', JSON.stringify(fields || []), isCustom || false, now]); }
  async function deleteTypeSchema(id) { await pool.query('DELETE FROM record_type_schemas WHERE id=$1 AND is_custom=true', [id]); }

  async function getUserTemplates() { const res = await pool.query('SELECT * FROM user_templates ORDER BY "createdAt" DESC'); return res.rows.map(r => ({ ...r, recordTypes: r.record_types ? JSON.parse(r.record_types) : [] })); }
  async function saveUserTemplate({ id, name, color, icon, description, recordTypes }) { const now = new Date().toISOString(); await pool.query(`INSERT INTO user_templates (id, name, color, icon, description, record_types, "createdAt") VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO UPDATE SET name=$2, color=$3, icon=$4, description=$5, record_types=$6`, [id, name, color || '#5b9bd5', icon || '📁', description || '', JSON.stringify(recordTypes || []), now]); }
  async function deleteUserTemplate(id) { await pool.query('DELETE FROM user_templates WHERE id = $1', [id]); }
  async function submitPendingTemplate({ id, name, color, icon, description, recordTypes }) { const now = new Date().toISOString(); await pool.query(`INSERT INTO pending_templates (id, name, color, icon, description, record_types, submitted_at, status) VALUES ($1,$2,$3,$4,$5,$6,$7,'pending') ON CONFLICT (id) DO UPDATE SET status='pending', submitted_at=$7`, [id, name, color || '#5b9bd5', icon || '📁', description || '', JSON.stringify(recordTypes || []), now]); }
  async function getPendingTemplates() { const res = await pool.query('SELECT * FROM pending_templates ORDER BY submitted_at DESC'); return res.rows.map(r => ({ ...r, recordTypes: r.record_types ? JSON.parse(r.record_types) : [] })); }
  async function updatePendingTemplateStatus(id, status) { await pool.query('UPDATE pending_templates SET status = $1 WHERE id = $2', [status, id]); }
  async function createWaitlistEntry({ id, name, email }) { await pool.query(`INSERT INTO waitlist (id, name, email, status, created_at) VALUES ($1,$2,$3,'pending',$4)`, [id, name, email, new Date().toISOString()]); }
  async function getWaitlist() { const r = await pool.query('SELECT * FROM waitlist ORDER BY created_at DESC'); return r.rows.map(w => ({ id: w.id, name: w.name, email: w.email, status: w.status, createdAt: w.created_at, approvedAt: w.approved_at })); }
  async function getWaitlistEntry(id) { const r = await pool.query('SELECT * FROM waitlist WHERE id = $1', [id]); if (!r.rows.length) return null; const w = r.rows[0]; return { id: w.id, name: w.name, email: w.email, status: w.status, createdAt: w.created_at }; }
  async function updateWaitlistStatus(id, status) { await pool.query('UPDATE waitlist SET status=$1, approved_at=$2 WHERE id=$3', [status, status === 'approved' ? new Date().toISOString() : null, id]); }
  async function deleteWaitlistEntry(id) { await pool.query('DELETE FROM waitlist WHERE id = $1', [id]); }
  async function createTenant({ id, name, email, serviceName, serviceUrl, renderServiceId, neonProjectId, r2Prefix }) { await pool.query(`INSERT INTO tenants (id, name, email, service_name, service_url, render_service_id, neon_project_id, r2_prefix, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9)`, [id, name, email, serviceName, serviceUrl || '', renderServiceId || '', neonProjectId || '', r2Prefix || '', new Date().toISOString()]); }
  async function getTenants() { const r = await pool.query('SELECT * FROM tenants ORDER BY created_at DESC'); return r.rows.map(t => ({ id: t.id, name: t.name, email: t.email, serviceName: t.service_name, serviceUrl: t.service_url, renderServiceId: t.render_service_id, neonProjectId: t.neon_project_id, r2Prefix: t.r2_prefix, status: t.status, createdAt: t.created_at })); }
  async function updateTenantStatus(id, status) { await pool.query('UPDATE tenants SET status = $1 WHERE id = $2', [status, id]); }
  async function updateTenantProvisioned(id, { serviceUrl, renderServiceId }) { await pool.query('UPDATE tenants SET service_url=$1, render_service_id=$2, status=$3 WHERE id=$4', [serviceUrl, renderServiceId, 'active', id]); }
  async function deleteTenant(id) { await pool.query('DELETE FROM tenants WHERE id = $1', [id]); }
  async function logSchemaChange({ schemaId, schemaName, action, fields }) { const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); await pool.query(`INSERT INTO schema_change_log (id, "schemaId", "schemaName", action, fields, "createdAt") VALUES ($1,$2,$3,$4,$5,$6)`, [id, schemaId, schemaName, action, JSON.stringify(fields || []), new Date().toISOString()]); }
  async function getSchemaChanges() { const res = await pool.query('SELECT * FROM schema_change_log ORDER BY "createdAt" DESC LIMIT 100'); return res.rows.map(r => ({ ...r, fields: JSON.parse(r.fields) })); }
  async function markSchemaChangeReviewed(id) { await pool.query('UPDATE schema_change_log SET reviewed=1 WHERE id=$1', [id]); }
  async function getStats() {
    const [a, r, rev, u] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM areas'),
      pool.query('SELECT COUNT(*) FROM records'),
      pool.query('SELECT COUNT(*) FROM reviews'),
      pool.query('SELECT name, onboarding_step as "onboardingStep" FROM users LIMIT 1'),
    ]);
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

  module.exports = { initDB, readDB, writeDB, close, DB_PATH, hasAnyUser, getUserByInstance, getUserById, createUser, updateUser, getUserByUsernameOrEmail, verifyEmailToken, setResetToken, getUserByResetToken, getTypeSchemas, saveTypeSchema, deleteTypeSchema, getUserTemplates, saveUserTemplate, deleteUserTemplate, submitPendingTemplate, getPendingTemplates, updatePendingTemplateStatus, getStats, createTenant, getTenants, updateTenantStatus, updateTenantProvisioned, deleteTenant, createWaitlistEntry, getWaitlist, getWaitlistEntry, updateWaitlistStatus, deleteWaitlistEntry, logSchemaChange, getSchemaChanges, markSchemaChangeReviewed };

} else {
  // File-backed JSON DB fallback for local development (no native deps required)
  DB_PATH = '(file: data/dev-db.json)';
  const DB_FILE = path.join(__dirname, '..', 'data', 'dev-db.json');
  function ensureDir() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  function load() {
    ensureDir();
    if (!fs.existsSync(DB_FILE)) {
      const initial = { meta: { version: 1, created: new Date().toISOString() }, areas: [], records: [], reviews: [], users: [], record_type_schemas: [], user_templates: [], pending_templates: [], waitlist: [], tenants: [], schema_change_log: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(raw || '{}');
    } catch (e) {
      console.error('Failed to read dev DB file, starting fresh:', e.message);
      const initial = { meta: { version: 1, created: new Date().toISOString() }, areas: [], records: [], reviews: [], users: [], record_type_schemas: [], user_templates: [], pending_templates: [], waitlist: [], tenants: [], schema_change_log: [] };
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
  }

  const TMP_FILE = DB_FILE + '.tmp';
  let _writeQueue = Promise.resolve();
  function save(state) {
    ensureDir();
    const data = JSON.stringify(state, null, 2);
    _writeQueue = _writeQueue.then(() => {
      fs.writeFileSync(TMP_FILE, data);
      fs.renameSync(TMP_FILE, DB_FILE);
    }).catch(e => console.error('Dev DB write error:', e));
  }

  async function initDB() {
    const state = load();
    if (!state.record_type_schemas || state.record_type_schemas.length === 0) {
      state.record_type_schemas = [
        { id: 'contact', name: 'Contact', icon: '👤', fields: [
          {key:'role',label:'Role',type:'text',order:1},{key:'company',label:'Company',type:'text',order:2},{key:'email',label:'Email',type:'email',order:3},{key:'phone',label:'Phone',type:'tel',order:4},{key:'linkedin',label:'LinkedIn',type:'url',order:5},{key:'notes',label:'Notes',type:'textarea',order:6}
        ]},
        { id: 'event', name: 'Event', icon: '📅', fields: [ {key:'date',label:'Date',type:'date',order:1},{key:'time',label:'Time',type:'time',order:2},{key:'endTime',label:'End time',type:'time',order:3},{key:'location',label:'Location',type:'text',order:4},{key:'link',label:'Link',type:'url',order:5},{key:'category',label:'Category',type:'text',order:6},{key:'notes',label:'Notes',type:'textarea',order:7} ] },
        { id: 'goal', name: 'Goal', icon: '🎯', fields: [ {key:'targetDate',label:'Target date',type:'date',order:1},{key:'progress',label:'Progress',type:'text',order:2},{key:'notes',label:'Notes',type:'textarea',order:3} ] },
        { id: 'task', name: 'Task', icon: '✅', fields: [ {key:'frequency',label:'Frequency',type:'text',order:1},{key:'lastDone',label:'Last done',type:'date',order:2},{key:'nextDue',label:'Next due',type:'date',order:3},{key:'notes',label:'Notes',type:'textarea',order:4} ] },
        { id: 'project', name: 'Project', icon: '📁', fields: [ {key:'description',label:'Description',type:'textarea',order:1},{key:'nextAction',label:'Next action',type:'text',order:2},{key:'notes',label:'Notes',type:'textarea',order:3} ] },
        { id: 'note', name: 'Note', icon: '📝', fields: [ {key:'body',label:'Body',type:'textarea',order:1},{key:'notes',label:'Notes',type:'textarea',order:2} ] },
        { id: 'company', name: 'Company', icon: '🏢', fields: [ {key:'industry',label:'Industry',type:'text',order:1},{key:'website',label:'Website',type:'url',order:2},{key:'location',label:'Location',type:'text',order:3},{key:'notes',label:'Notes',type:'textarea',order:4} ] },
        { id: 'account', name: 'Account', icon: '💳', fields: [ {key:'institution',label:'Institution',type:'text',order:1},{key:'accountType',label:'Account type',type:'text',order:2},{key:'owner',label:'Owner',type:'text',order:3},{key:'last4',label:'Last 4 digits',type:'text',order:4},{key:'institutionUrl',label:'Login URL',type:'url',order:5},{key:'institutionDomain',label:'Logo domain',type:'text',order:6} ] }
      ];
    }
    save(state);
  }

  async function readDB() {
    const s = load();
    // Normalize shapes to match Postgres-backed readDB
    return {
      meta: s.meta || { version: 1 },
      areas: s.areas || [],
      records: (s.records || []).map(r => ({ ...r, fields: r.fields || {}, contacts: r.contacts || [], interviews: r.interviews || [], documents: r.documents || [], links: r.links || [], timeline: r.timeline || [] })),
      reviews: (s.reviews || []).map(r => ({ ...r, data: r.data || {} })),
    };
  }

  async function writeDB(data) {
    const s = load();
    s.areas = data.areas || [];
    s.records = data.records || [];
    s.reviews = data.reviews || [];
    save(s);
    return data;
  }

  async function close() { /* noop */ }

  async function hasAnyUser() { const s = load(); return (s.users || []).length > 0; }
  async function getUserByInstance() { const s = load(); return (s.users || [])[0] || null; }
  async function getUserById(id) { const s = load(); return (s.users || []).find(u => u.id === id) || null; }
  async function createUser({ id, name, username, email, passwordHash, verificationToken }) { const s = load(); const now = new Date().toISOString(); const u = { id, name, username: username || null, email: email || null, password_hash: passwordHash, email_verified: !email, verification_token: verificationToken || null, createdAt: now }; s.users = s.users || []; s.users.push(u); save(s); return { id, name, createdAt: now }; }
  async function getUserByUsernameOrEmail(identifier) { const s = load(); return (s.users || []).find(u => u.username === identifier || u.email === identifier) || null; }
  async function verifyEmailToken(token) { const s = load(); const u = (s.users||[]).find(x => x.verification_token === token); if (!u) return null; u.email_verified = true; u.verification_token = null; save(s); return u.id; }
  async function setResetToken(userId, token, expiresAt) { const s = load(); const u = (s.users||[]).find(x => x.id === userId); if (!u) return; u.reset_token = token; u.reset_token_expires = expiresAt; save(s); }
  async function getUserByResetToken(token) { const s = load(); const now = new Date().toISOString(); return (s.users||[]).find(u => u.reset_token === token && u.reset_token_expires > now) || null; }
  async function updateUser(id, { name, username, email, passwordHash, onboardingStep, dashboardPrefs, verificationToken, clearReset }) { const s = load(); const u = (s.users||[]).find(x => x.id === id); if (!u) return; if (name !== undefined) u.name = name; if (username !== undefined) u.username = username; if (email !== undefined) u.email = email; if (passwordHash !== undefined) u.password_hash = passwordHash; if (onboardingStep !== undefined) u.onboarding_step = onboardingStep; if (dashboardPrefs !== undefined) u.dashboard_prefs = dashboardPrefs; if (verificationToken !== undefined) u.verification_token = verificationToken; if (clearReset) { u.reset_token = null; u.reset_token_expires = null; } save(s); }

  async function readSimpleRows(table) { const s = load(); return s[table] || []; }
  async function getTypeSchemas() { const rows = await readSimpleRows('record_type_schemas'); return rows.map(r => ({ ...r, fields: r.fields || r.fields })); }
  async function saveTypeSchema({ id, name, icon, fields, isCustom }) { const s = load(); s.record_type_schemas = s.record_type_schemas || []; const idx = s.record_type_schemas.findIndex(x => x.id === id); const now = new Date().toISOString(); const row = { id, name, icon: icon || '📁', fields: fields || [], is_custom: !!isCustom, createdAt: now }; if (idx === -1) s.record_type_schemas.push(row); else s.record_type_schemas[idx] = { ...s.record_type_schemas[idx], ...row }; save(s); }
  async function deleteTypeSchema(id) { const s = load(); s.record_type_schemas = (s.record_type_schemas || []).filter(x => x.id !== id || x.is_custom !== true); save(s); }
  async function getUserTemplates() { return readSimpleRows('user_templates'); }
  async function saveUserTemplate({ id, name, color, icon, description, recordTypes }) { const s = load(); s.user_templates = s.user_templates || []; const now = new Date().toISOString(); const row = { id, name, color, icon, description, record_types: recordTypes || [], createdAt: now }; const idx = s.user_templates.findIndex(x => x.id === id); if (idx === -1) s.user_templates.push(row); else s.user_templates[idx] = { ...s.user_templates[idx], ...row }; save(s); }
  async function deleteUserTemplate(id) { const s = load(); s.user_templates = (s.user_templates||[]).filter(x => x.id !== id); save(s); }
  async function submitPendingTemplate({ id, name, color, icon, description, recordTypes }) { const s = load(); s.pending_templates = s.pending_templates || []; const now = new Date().toISOString(); const row = { id, name, color, icon, description, record_types: recordTypes || [], submitted_at: now, status: 'pending' }; s.pending_templates.push(row); save(s); }
  async function getPendingTemplates() { return readSimpleRows('pending_templates'); }
  async function updatePendingTemplateStatus(id, status) { const s = load(); const r = (s.pending_templates||[]).find(x => x.id === id); if (r) { r.status = status; save(s); } }
  async function createWaitlistEntry({ id, name, email }) { const s = load(); s.waitlist = s.waitlist || []; s.waitlist.push({ id, name, email, status: 'pending', created_at: new Date().toISOString() }); save(s); }
  async function getWaitlist() { return readSimpleRows('waitlist'); }
  async function getWaitlistEntry(id) { const s = load(); return (s.waitlist||[]).find(x => x.id === id) || null; }
  async function updateWaitlistStatus(id, status) { const s = load(); const e = (s.waitlist||[]).find(x => x.id === id); if (e) { e.status = status; e.approved_at = status === 'approved' ? new Date().toISOString() : null; save(s); } }
  async function deleteWaitlistEntry(id) { const s = load(); s.waitlist = (s.waitlist||[]).filter(x => x.id !== id); save(s); }
  async function createTenant({ id, name, email, serviceName, serviceUrl, renderServiceId, neonProjectId, r2Prefix }) { const s = load(); s.tenants = s.tenants || []; s.tenants.push({ id, name, email, service_name: serviceName, service_url: serviceUrl || '', render_service_id: renderServiceId || '', neon_project_id: neonProjectId || '', r2_prefix: r2Prefix || '', status: 'active', created_at: new Date().toISOString() }); save(s); }
  async function getTenants() { return readSimpleRows('tenants'); }
  async function updateTenantStatus(id, status) { const s = load(); const t = (s.tenants||[]).find(x => x.id === id); if (t) { t.status = status; save(s); } }
  async function updateTenantProvisioned(id, { serviceUrl, renderServiceId }) { const s = load(); const t = (s.tenants||[]).find(x => x.id === id); if (t) { t.service_url = serviceUrl; t.render_service_id = renderServiceId; t.status = 'active'; save(s); } }
  async function deleteTenant(id) { const s = load(); s.tenants = (s.tenants||[]).filter(x => x.id !== id); save(s); }
  async function logSchemaChange({ schemaId, schemaName, action, fields }) { const s = load(); const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6); s.schema_change_log = s.schema_change_log || []; s.schema_change_log.unshift({ id, schemaId, schemaName, action, fields: fields || [], createdAt: new Date().toISOString(), reviewed: 0 }); save(s); }
  async function getSchemaChanges() { const s = load(); return (s.schema_change_log||[]).slice(0,100); }
  async function markSchemaChangeReviewed(id) { const s = load(); const r = (s.schema_change_log||[]).find(x => x.id === id); if (r) { r.reviewed = 1; save(s); } }
  async function getStats() { const s = load(); const areas = (s.areas||[]).length; const records = (s.records||[]).length; const reviews = (s.reviews||[]).length; const documents = (s.records||[]).reduce((acc, r) => acc + ((r.documents || []).length || 0), 0); const user = (s.users||[])[0] || {}; return { areas, records, reviews, documents, userName: user.name, onboardingStep: user.onboarding_step }; }

  module.exports = { initDB, readDB, writeDB, close, DB_PATH, hasAnyUser, getUserByInstance, getUserById, createUser, updateUser, getUserByUsernameOrEmail, verifyEmailToken, setResetToken, getUserByResetToken, getTypeSchemas, saveTypeSchema, deleteTypeSchema, getUserTemplates, saveUserTemplate, deleteUserTemplate, submitPendingTemplate, getPendingTemplates, updatePendingTemplateStatus, getStats, createTenant, getTenants, updateTenantStatus, updateTenantProvisioned, deleteTenant, createWaitlistEntry, getWaitlist, getWaitlistEntry, updateWaitlistStatus, deleteWaitlistEntry, logSchemaChange, getSchemaChanges, markSchemaChangeReviewed };

}
