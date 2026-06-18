const http = require('http');
const { URL } = require('url');

function fail(msg) {
  throw new Error(msg);
}

function ok(cond, msg) {
  if (!cond) fail(msg);
}

async function evalInBrowser(pageId, code, timeoutMs = 20000) {
  // This endpoint shape mirrors our internal VS Code tool contract by hitting app state through shared page.
  // If unavailable in this environment, script reports actionable guidance instead of silently passing.
  const payload = JSON.stringify({ pageId, code, timeoutMs });
  const url = new URL('http://localhost:3000/__tooling/run_playwright_code');
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error(`tool endpoint HTTP ${res.statusCode}: ${data}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`invalid tool endpoint JSON: ${err.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function main() {
  try {
    // Runtime regression needs a live shared page context. We use the active known page id by convention.
    const pageId = '58bbb5fe-fe9e-4c37-aa08-31cc0581719f';

    let result;
    try {
      result = await evalInBrowser(pageId, `
        await page.reload({ waitUntil: 'load' });
        return page.evaluate(() => {
          const out = {};

          // Documents checks
          document.querySelector('[data-nav="documents"]')?.click();
          const docRows = [...document.querySelectorAll('#doc-list .doc-item')];
          const names = docRows.map(r => r.querySelector('.doc-name')?.textContent?.trim() || '').filter(Boolean);
          const slotTexts = docRows.map(r => {
            const refs = [...r.querySelectorAll('.doc-ref')].map(x => (x.textContent || '').trim()).filter(Boolean);
            return refs[refs.length - 1] || '';
          });
          const typeChipPresent = [...document.querySelectorAll('#doc-list .doc-ref')].some(x => {
            const t = (x.textContent || '').trim().toLowerCase();
            return ['job','company','contact','event','project','goal','task'].includes(t);
          });
          const nameFreq = names.reduce((m, n) => { m[n] = (m[n] || 0) + 1; return m; }, {});
          const duplicateNames = Object.entries(nameFreq).filter(([, c]) => c > 1).map(([n]) => n);

          out.documents = {
            rowCount: docRows.length,
            duplicateNames,
            hasTypeChip: typeChipPresent,
            slotTexts,
            hasMergedSlotText: slotTexts.some(s => s.includes(',')),
          };

          // Calendar checks
          document.querySelector('[data-nav="calendar"]')?.click();
          const weekEvt = document.querySelector('#cal-week-panel .cal-week-event[data-record-link], #cal-week-panel .cal-ev[data-record-link]');
          const monthEvt = document.querySelector('#cal-month-panel .cal-ev[data-record-link]');
          out.calendar = {
            hasWeekDelegatedEvent: !!weekEvt,
            hasMonthDelegatedEvent: !!monthEvt,
          };

          const targetEvt = weekEvt || monthEvt;
          if (targetEvt) {
            out.calendar.clickedRecordId = targetEvt.getAttribute('data-record-id') || '';
            targetEvt.click();
            out.calendar.toRecordView = !!document.getElementById('view-record')?.classList.contains('active');
          } else {
            out.calendar.clickedRecordId = '';
            out.calendar.toRecordView = false;
          }

          return out;
        });
      `);
    } catch (err) {
      fail(
        'Runtime regression requires the VS Code shared browser tooling endpoint. ' +
        `Could not run browser assertions: ${err.message}`
      );
    }

    ok(result && result.documents, 'Missing documents assertion payload');
    ok(result && result.calendar, 'Missing calendar assertion payload');

    ok(!result.documents.hasTypeChip, 'Documents shows record-type chips again');
    ok(!result.documents.hasMergedSlotText, 'Documents shows merged slot text (e.g. "Resume, Other") again');
    ok(result.documents.duplicateNames.length === 0, `Duplicate document names detected: ${result.documents.duplicateNames.join(', ')}`);

    ok(result.calendar.hasWeekDelegatedEvent || result.calendar.hasMonthDelegatedEvent,
      'Calendar has no delegated event links in week/month panels');
    ok(result.calendar.toRecordView, 'Clicking delegated calendar event did not navigate to record view');

    console.log('UI runtime regression passed');
    console.log(`documents_rows=${result.documents.rowCount} calendar_clicked_record=${result.calendar.clickedRecordId || 'none'}`);
  } catch (err) {
    console.error('UI runtime regression failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
