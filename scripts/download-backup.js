const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = process.env.BACKUP_URL || 'http://localhost:3000';
const TOKEN = process.env.BACKUP_TOKEN || '';
const TOKEN_SEED = process.env.BACKUP_TOKEN_SEED || '';
const OUT_DIR = process.env.BACKUP_OUT_DIR
  ? path.resolve(process.env.BACKUP_OUT_DIR)
  : path.join(process.cwd(), 'backups');

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function monthStampUTC(date) {
  return date.toISOString().slice(0, 7);
}

function deriveToken(seed, monthStamp) {
  return crypto
    .createHmac('sha256', seed)
    .update(`backup:${monthStamp}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function resolveToken() {
  if (TOKEN) return TOKEN;
  if (TOKEN_SEED) {
    return deriveToken(TOKEN_SEED, monthStampUTC(new Date()));
  }
  return '';
}

async function main() {
  const resolvedToken = resolveToken();
  if (!resolvedToken) {
    console.error('BACKUP_TOKEN or BACKUP_TOKEN_SEED is required.');
    process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const outFile = path.join(OUT_DIR, `dashboard-backup-${timestamp()}.zip`);
  const endpoint = `${BASE_URL.replace(/\/$/, '')}/api/backup/export`;

  const res = await fetch(endpoint, {
    headers: {
      'x-backup-token': resolvedToken,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    console.error(`Backup failed (${res.status}): ${body}`);
    process.exit(1);
  }

  const arr = await res.arrayBuffer();
  fs.writeFileSync(outFile, Buffer.from(arr));
  console.log(`Backup saved to ${outFile}`);
}

main().catch(err => {
  console.error('Backup download failed:', err.message);
  process.exit(1);
});
