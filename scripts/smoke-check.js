const http = require('http');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  try {
    const dbText = await fetchText('http://localhost:3000/api/db');
    const db = JSON.parse(dbText);

    if (!Array.isArray(db.areas) || !Array.isArray(db.records)) {
      throw new Error('API response is missing expected arrays');
    }

    const page = await fetchText('http://localhost:3000/');
    const checks = [
      ['dashboard view', page.includes('id="view-dashboard"')],
      ['attention panel', page.includes('id="dash-attention"')],
      ['calendar panel', page.includes('id="dash-cal"')],
      ['sidebar areas', page.includes('id="sidebar-areas"')],
    ];

    for (const [label, ok] of checks) {
      if (!ok) {
        throw new Error(`Missing expected markup: ${label}`);
      }
    }

    console.log('Smoke check passed');
    console.log(`areas=${db.areas.length} records=${db.records.length} reviews=${db.reviews?.length || 0}`);
  } catch (err) {
    console.error('Smoke check failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
