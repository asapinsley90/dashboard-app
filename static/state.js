// â”€â”€ STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let DB = { areas: [], records: [], reviews: [] };
let TYPE_SCHEMAS = [];  // { id, name, icon, fields: [{key,label,type,order}], is_custom }
let currentView = 'dashboard';
let currentAreaId = null;
let currentRecordId = null;
let calMode = 'day';
let calOffset = 0;
let editingRecord = null;
let currentFilter = null;
let historyTab = 'completed';
const contactsViewState = { sort: 'name-asc', mode: 'line' };
const documentsViewState = { sort: 'alpha', linkFilter: 'all' };

// â”€â”€ BOOT â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let currentUser = { name: '' };

async function boot() {
  const [data, me, schemas] = await Promise.all([api('GET', '/api/db'), api('GET', '/api/me'), api('GET', '/api/type-schemas')]);
  DB.areas = data.areas || [];
  DB.records = data.records || [];
  DB.reviews = data.reviews || [];
  currentUser = me;
  TYPE_SCHEMAS = schemas || [];
  rebuildLookupCaches();
  const nameEl = document.getElementById('sidebar-name');
  if (nameEl) nameEl.textContent = me.name;
  document.getElementById('sidebar-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  bindGlobalDelegation();
  renderSidebar();
  const hash = location.hash.replace('#', '') || 'dashboard';
  navigateFromHash(hash);
  assistantInit(me.onboardingStep);
}

function bindGlobalDelegation() {
  if (window.__delegationBound) return;
  window.__delegationBound = true;

  document.addEventListener('click', e => {
    const ctxEl = e.target.closest('[data-ctx-record-id]');
    if (ctxEl?.dataset.ctxRecordId) {
      showRecordCtxMenu(e, ctxEl.dataset.ctxRecordId);
      return;
    }

    const navEl = e.target.closest('[data-nav]');
    if (navEl) {
      e.stopPropagation();
      navigate(navEl.dataset.nav);
      return;
    }

    const areaLinkEl = e.target.closest('[data-area-link]');
    if (areaLinkEl?.dataset.areaLink) {
      e.stopPropagation();
      navigate('area', areaLinkEl.dataset.areaLink);
      return;
    }

    const recordLinkEl = e.target.closest('[data-record-link]');
    if (recordLinkEl?.dataset.areaId && recordLinkEl?.dataset.recordId) {
      e.stopPropagation();
      navigate('record', recordLinkEl.dataset.areaId, recordLinkEl.dataset.recordId);
      return;
    }

    const filterLinkEl = e.target.closest('[data-filter-link]');
    if (filterLinkEl?.dataset.areaId && filterLinkEl?.dataset.filter) {
      e.stopPropagation();
      setAreaFilter(filterLinkEl.dataset.areaId, filterLinkEl.dataset.filter);
      return;
    }

    const actionEl = e.target.closest('[data-action]');
    if (actionEl) {
      const action = actionEl.dataset.action;
      const fn = window[action];
      if (typeof fn === 'function') fn();
    }
  });

  document.addEventListener('contextmenu', e => {
    const areaEl = e.target.closest('[data-area]');
    if (areaEl?.dataset.area) { showAreaCtxMenu(e, areaEl.dataset.area); return; }
    const ctxEl = e.target.closest('[data-ctx-record-id], [data-record-link]');
    if (!ctxEl) return;
    const recordId = ctxEl.dataset.ctxRecordId || ctxEl.dataset.recordId;
    if (!recordId) return;
    showRecordCtxMenu(e, recordId);
  });
}

// â”€â”€ API â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `API ${method} ${url} failed: ${r.status}`);
  }
  return r.json();
}

