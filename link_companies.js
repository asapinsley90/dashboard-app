const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json'));

const companies = db.records.filter(r => r.type === 'company');
let linked = 0;

db.records.forEach(r => {
  if (r.type !== 'job' && r.type !== 'contact') return;
  if (r.companyId) return; // already linked

  const name = r.type === 'job' ? r.title : r.fields?.company;
  if (!name) return;

  const match = companies.find(co =>
    co.title.toLowerCase() === name.toLowerCase() ||
    name.toLowerCase().includes(co.title.toLowerCase()) ||
    co.title.toLowerCase().includes(name.toLowerCase())
  );

  if (match) {
    r.companyId = match.id;
    linked++;
    console.log(`Linked ${r.type} "${r.title}" → "${match.title}"`);
  }
});

fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log(`\nDone. Linked ${linked} records.`);
