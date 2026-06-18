const fs = require('fs');
const db = JSON.parse(fs.readFileSync('db.json'));

const kennicott = db.records.find(r => r.type === 'job' && r.title === 'Kennicott Brothers');
if (!kennicott) { console.log('Kennicott not found'); process.exit(1); }

const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);

// Add missing timeline entries
const newEntries = [
  { id: id(), date: '2026-06-16T15:00:00.000Z', text: 'Round 2 interview with Jessica Reynolds — Microsoft Teams', author: 'aaron' },
  { id: id(), date: '2026-06-16T17:30:00.000Z', text: 'Follow-up thank you email sent to Jessica Reynolds (jessicare@kennicott.com)', author: 'aaron' },
  { id: id(), date: '2026-06-16T18:00:00.000Z', text: 'Status changed to: awaiting', author: 'system' },
];

kennicott.timeline = kennicott.timeline || [];
// Remove duplicate "Status changed to: awaiting" if present
kennicott.timeline = kennicott.timeline.filter(e => e.text !== 'Status changed to: awaiting');
kennicott.timeline.push(...newEntries);
kennicott.timeline.sort((a,b) => a.date.localeCompare(b.date));

fs.writeFileSync('db.json', JSON.stringify(db, null, 2));
console.log('Added', newEntries.length, 'timeline entries to Kennicott Brothers');
