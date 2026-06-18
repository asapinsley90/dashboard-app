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

function check(label, ok, details = '') {
  if (!ok) throw new Error(details ? `${label}: ${details}` : label);
}

function extractBetween(text, startToken, endToken) {
  const start = text.indexOf(startToken);
  if (start === -1) return '';
  const end = text.indexOf(endToken, start);
  if (end === -1) return text.slice(start);
  return text.slice(start, end);
}

async function main() {
  try {
    const page = await fetchText('http://localhost:3000/');

    check('Missing delegated nav hook', page.includes('function bindGlobalDelegation()'));
    check('Missing context delegation', page.includes("[data-ctx-record-id], [data-record-link]"));
    check('Missing view whitelist', page.includes('const NAV_VIEWS = new Set(['));

    check('Missing record link attributes', page.includes('data-record-link'));
    check('Missing area link attributes', page.includes('data-area-link'));
    check('Missing filter link attributes', page.includes('data-filter-link'));
    check('Missing context record attributes', page.includes('data-ctx-record-id'));

    const attentionBlock = extractBetween(page, 'function renderAttention()', 'function getAttentionItems()');
    check('renderAttention still uses inline click handlers', !attentionBlock.includes('onclick="'));

    const jobCardBlock = extractBetween(page, 'function jobCard(r)', 'function recordCard(r)');
    check('jobCard still uses inline click handlers', !jobCardBlock.includes('onclick="') && !jobCardBlock.includes('oncontextmenu="'));

    const recordCardBlock = extractBetween(page, 'function recordCard(r)', 'function statusBadge(r)');
    check('recordCard still uses inline click handlers', !recordCardBlock.includes('onclick="') && !recordCardBlock.includes('oncontextmenu="'));

    const documentsBlock = extractBetween(page, 'async function renderDocumentsView()', 'async function uploadFiles(files)');
    check('Documents slot priority missing', documentsBlock.includes('const slotPriority = { resume: 1, coverLetter: 2, other: 3 };'));
    check('Documents dedupe primary slot missing', documentsBlock.includes('primarySlot:'));
    check('Documents record type chip should not be rendered', !documentsBlock.includes('const typeChip ='));

    const linkableCompanyBlock = extractBetween(page, 'function linkableCompany(company, companyId)', 'function formatDate(ds)');
    check('Company link helper still uses inline onclick handlers', !linkableCompanyBlock.includes('onclick="'));
    check('Company link helper missing delegated record links', linkableCompanyBlock.includes('data-record-link'));

    const calendarBlock = extractBetween(page, 'function buildCalBody(mini)', 'function renderCalWidget(containerId, mini, areaFilter)');
    check('Calendar build body still uses inline record navigation', !calendarBlock.includes("navigate('record'"));
    check('Calendar build body missing delegated record link attributes', calendarBlock.includes('data-record-link data-area-id'));
    check('Calendar build body missing parent click guard for record links', calendarBlock.includes("if(event.target.closest('[data-record-link]')) return;"));

    const triCalBlock = extractBetween(page, 'function renderTriCalPanel(containerId, mode)', 'function triCalNav(dir, cid, mode)');
    check('Tri-calendar still uses inline record navigation', !triCalBlock.includes("navigate('record'"));
    check('Tri-calendar missing delegated record link attributes', triCalBlock.includes('data-record-link data-area-id'));
    check('Tri-calendar missing parent click guard for record links', triCalBlock.includes("if(event.target.closest('[data-record-link]')) return;"));

    console.log('UI smoke check passed');
  } catch (err) {
    console.error('UI smoke check failed');
    console.error(err.message);
    process.exitCode = 1;
  }
}

main();
