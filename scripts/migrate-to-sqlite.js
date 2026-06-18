const fs = require('fs');
const path = require('path');
const dbLayer = require('../lib/db-layer');

async function main() {
  try {
    const jsonPath = dbLayer.JSON_BACKUP;

    console.log('Starting migration from JSON to SQLite...');
    console.log(`  JSON source: ${jsonPath}`);
    console.log(`  SQLite target: ${dbLayer.DB_PATH}`);

    if (!fs.existsSync(jsonPath)) {
      console.error(`ERROR: JSON file not found at ${jsonPath}`);
      process.exitCode = 1;
      return;
    }

    // Read JSON
    const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`✓ Read JSON: ${json.areas?.length || 0} areas, ${json.records?.length || 0} records, ${json.reviews?.length || 0} reviews`);

    // Initialize SQLite and write data
    await dbLayer.initDB();
    console.log(`✓ Initialized SQLite`);

    await dbLayer.writeDB(json);
    console.log(`✓ Wrote all data to SQLite`);

    // Verify by reading back
    const verify = await dbLayer.readDB();
    console.log(`✓ Verified: ${verify.areas?.length || 0} areas, ${verify.records?.length || 0} records, ${verify.reviews?.length || 0} reviews`);

    // Backup original JSON
    const backupPath = jsonPath + '.bak';
    fs.copyFileSync(jsonPath, backupPath);
    console.log(`✓ Backed up JSON to ${backupPath}`);

    // Remove original JSON (optional, keeps for now)
    // fs.unlinkSync(jsonPath);
    console.log(`ℹ Original JSON kept at ${jsonPath} (safe to delete after confirming everything works)`);

    console.log('\n✓ Migration complete!');
    console.log('  app.js will now use SQLite automatically.');
    process.exitCode = 0;
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await dbLayer.close();
  }
}

main();
