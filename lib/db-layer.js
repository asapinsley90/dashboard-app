const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH ? path.resolve(process.env.DB_PATH) : path.join(__dirname, '..', 'db.sqlite');
const JSON_BACKUP = process.env.JSON_BACKUP ? path.resolve(process.env.JSON_BACKUP) : path.join(__dirname, '..', 'db.json');

let db = null;

function initDB() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, err => {
      if (err) return reject(err);

      db.serialize(() => {
        // Core tables
        db.run(`
          CREATE TABLE IF NOT EXISTS areas (
            id TEXT PRIMARY KEY,
            title TEXT,
            color TEXT,
            icon TEXT,
            order_ INTEGER,
            createdAt TEXT,
            updatedAt TEXT
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS records (
            id TEXT PRIMARY KEY,
            type TEXT,
            areaId TEXT,
            companyId TEXT,
            title TEXT,
            status TEXT,
            priority INTEGER,
            urgency TEXT DEFAULT 'none',
            createdAt TEXT,
            updatedAt TEXT,
            fields TEXT,
            contacts TEXT,
            interviews TEXT,
            documents TEXT,
            links TEXT,
            timeline TEXT,
            FOREIGN KEY(areaId) REFERENCES areas(id)
          )
        `);

        db.run(`
          CREATE TABLE IF NOT EXISTS reviews (
            id TEXT PRIMARY KEY,
            createdAt TEXT,
            data TEXT
          )
        `);

        db.run(`
          CREATE INDEX IF NOT EXISTS idx_records_areaId ON records(areaId)
        `);

        db.run(`
          CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)
        `, err => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });
}

async function readDB() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      const result = { meta: { version: 1 }, areas: [], records: [], reviews: [] };

      db.all('SELECT * FROM areas ORDER BY order_', (err, rows) => {
        if (err) return reject(err);
        result.areas = rows || [];

        db.all('SELECT * FROM records', (err, rows) => {
          if (err) return reject(err);

          result.records = (rows || []).map(r => ({
            ...r,
            fields: r.fields ? JSON.parse(r.fields) : {},
            contacts: r.contacts ? JSON.parse(r.contacts) : [],
            interviews: r.interviews ? JSON.parse(r.interviews) : [],
            documents: r.documents ? JSON.parse(r.documents) : [],
            links: r.links ? JSON.parse(r.links) : [],
            timeline: r.timeline ? JSON.parse(r.timeline) : [],
          }));

          db.all('SELECT * FROM reviews ORDER BY createdAt DESC', (err, rows) => {
            if (err) return reject(err);
            result.reviews = (rows || []).map(r => ({
              ...r,
              data: r.data ? JSON.parse(r.data) : {},
            }));

            resolve(result);
          });
        });
      });
    });
  });
}

async function writeDB(data) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Clear and rewrite areas
      db.run('DELETE FROM areas', err => {
        if (err) return reject(err);

        const areaStmt = db.prepare('INSERT INTO areas (id, title, color, icon, order_, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)');
        for (const a of data.areas || []) {
          areaStmt.run(a.id, a.title, a.color, a.icon, a.order, a.createdAt || new Date().toISOString(), a.updatedAt || new Date().toISOString());
        }
        areaStmt.finalize(err => {
          if (err) return reject(err);

          // Clear and rewrite records
          db.run('DELETE FROM records', err => {
            if (err) return reject(err);

            const recStmt = db.prepare(
              'INSERT INTO records (id, type, areaId, companyId, title, status, priority, urgency, createdAt, updatedAt, fields, contacts, interviews, documents, links, timeline) ' +
              'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );

            for (const r of data.records || []) {
              recStmt.run(
                r.id,
                r.type,
                r.areaId,
                r.companyId || null,
                r.title,
                r.status,
                r.priority || 3,
                r.urgency || 'none',
                r.createdAt,
                r.updatedAt,
                JSON.stringify(r.fields || {}),
                JSON.stringify(r.contacts || []),
                JSON.stringify(r.interviews || []),
                JSON.stringify(r.documents || []),
                JSON.stringify(r.links || []),
                JSON.stringify(r.timeline || [])
              );
            }

            recStmt.finalize(err => {
              if (err) return reject(err);

              // Clear and rewrite reviews
              db.run('DELETE FROM reviews', err => {
                if (err) return reject(err);

                const revStmt = db.prepare('INSERT INTO reviews (id, createdAt, data) VALUES (?, ?, ?)');
                for (const rv of data.reviews || []) {
                  revStmt.run(
                    rv.id,
                    rv.createdAt,
                    JSON.stringify(rv.data || rv)
                  );
                }

                revStmt.finalize(err => {
                  if (err) reject(err);
                  else resolve(data);
                });
              });
            });
          });
        });
      });
    });
  });
}

async function close() {
  return new Promise((resolve, reject) => {
    if (db) {
      db.close(err => {
        if (err) reject(err);
        else resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDB,
  readDB,
  writeDB,
  close,
  DB_PATH,
  JSON_BACKUP,
};
