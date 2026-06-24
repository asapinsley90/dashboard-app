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
      "createdAt" TEXT NOT NULL
    )
  `);

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

async function createUser({ id, name, passwordHash }) {
  const now = new Date().toISOString();
  await pool.query(
    'INSERT INTO users (id, name, password_hash, "createdAt") VALUES ($1, $2, $3, $4)',
    [id, name, passwordHash, now]
  );
  return { id, name, createdAt: now };
}

async function updateUser(id, { name, passwordHash }) {
  const fields = [];
  const vals = [];
  if (name !== undefined) { fields.push(`name = $${fields.length + 1}`); vals.push(name); }
  if (passwordHash !== undefined) { fields.push(`password_hash = $${fields.length + 1}`); vals.push(passwordHash); }
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

module.exports = { initDB, readDB, writeDB, close, DB_PATH, hasAnyUser, getUserByInstance, getUserById, createUser, updateUser };
