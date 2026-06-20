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

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_records_areaid ON records("areaId")`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`);
}

async function readDB() {
  const [areasRes, recordsRes, reviewsRes] = await Promise.all([
    pool.query('SELECT * FROM areas ORDER BY order_'),
    pool.query('SELECT * FROM records'),
    pool.query('SELECT * FROM reviews ORDER BY "createdAt" DESC'),
  ]);

  return {
    meta: { version: 1 },
    areas: areasRes.rows,
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

    await client.query('DELETE FROM areas');
    for (const a of data.areas || []) {
      await client.query(
        `INSERT INTO areas (id, title, color, icon, order_, "createdAt", "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [a.id, a.title, a.color, a.icon, a.order ?? a.order_, a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString()]
      );
    }

    await client.query('DELETE FROM records');
    for (const r of data.records || []) {
      await client.query(
        `INSERT INTO records (id, type, "areaId", "companyId", title, status, priority, urgency, "createdAt", "updatedAt", fields, contacts, interviews, documents, links, timeline)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
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

    await client.query('DELETE FROM reviews');
    for (const rv of data.reviews || []) {
      await client.query(
        `INSERT INTO reviews (id, "createdAt", data) VALUES ($1,$2,$3)`,
        [rv.id, rv.createdAt, JSON.stringify(rv.data || rv)]
      );
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

module.exports = { initDB, readDB, writeDB, close, DB_PATH };
