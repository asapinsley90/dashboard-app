const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json'));
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const now = new Date().toISOString();

const companies = [
  { id: id(), type: 'company', areaId: 'area-jobs', title: 'Kennicott Brothers', status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { industry: 'Wholesale Floral', website: 'https://kennicott.com', location: 'Chicago, IL', notes: 'Oldest wholesale floral company in the US, since 1881. Employee-owned. 14 locations across 9 states.' }, links: [], timeline: [{ id: id(), date: now, text: 'Company added', author: 'system' }] },
  { id: id(), type: 'company', areaId: 'area-jobs', title: 'Wilson Sporting Goods', status: 'active', priority: 1, createdAt: now, updatedAt: now, fields: { industry: 'Sporting Goods', website: 'https://wilson.com', location: 'Chicago, IL', notes: '' }, links: [], timeline: [] },
  { id: id(), type: 'company', areaId: 'area-jobs', title: 'Calbee America', status: 'active', priority: 2, createdAt: now, updatedAt: now, fields: { industry: 'CPG / Snack Food', website: '', location: 'Remote', notes: '' }, links: [], timeline: [] }
];

// Only add if not already present
companies.forEach(co => {
  if (!db.records.find(r => r.type === 'company' && r.title === co.title)) {
    db.records.push(co);
    console.log('Added: ' + co.title);
  } else {
    console.log('Already exists: ' + co.title);
  }
});

fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log('Done.');
