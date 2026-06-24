// ── STATE ─────────────────────────────────────────────────────────────────────
let DB = { areas: [], records: [], reviews: [] };
// Active (non-deleted) records and areas — use these everywhere except Recently Deleted
function liveRecords() { return DB.records.filter(r => !r.deletedAt); }
function liveAreas()   { return DB.areas.filter(a => !a.deletedAt); }
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

// ── BOOT ──────────────────────────────────────────────────────────────────────
let currentUser = { name: '' };

async function boot() {
  const [data, me, schemas, adminCheck] = await Promise.all([api('GET', '/api/db'), api('GET', '/api/me'), api('GET', '/api/type-schemas'), api('GET', '/api/admin-enabled')]);
  DB.areas = data.areas || [];
  DB.records = data.records || [];
  DB.reviews = data.reviews || [];
  currentUser = me;
  TYPE_SCHEMAS = schemas || [];
  rebuildLookupCaches();
  if (adminCheck?.enabled) {
    const adminLink = document.getElementById('sidebar-admin-link');
    if (adminLink) adminLink.style.display = '';
  }
  const nameEl = document.getElementById('sidebar-name');
  if (nameEl) nameEl.textContent = me.name;
  document.getElementById('sidebar-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  bindGlobalDelegation();
  renderSidebar();
  initSidebarCollapse();
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
      const clickedId = areaLinkEl.dataset.areaLink;
      if (currentView === 'area' && currentAreaId === clickedId) {
        // Second click — toggle subitems
        const subs = document.getElementById('subitems-' + clickedId);
        if (subs) subs.classList.toggle('visible');
      } else {
        navigate('area', clickedId);
      }
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

    const collapseEl = e.target.closest('[data-widget-collapse]');
    if (collapseEl && !e.target.closest('button')) {
      toggleDashWidget(collapseEl.dataset.widgetCollapse);
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

// ── UNDO STACK ────────────────────────────────────────────────────────────────
const _undoStack = []; // { type, label, restore: async fn }
const _redoStack = [];
const UNDO_MAX = 50;

function pushUndo(label, restoreFn) {
  _undoStack.push({ label, restore: restoreFn });
  if (_undoStack.length > UNDO_MAX) _undoStack.shift();
  _redoStack.length = 0;
}

function showUndoModal(label, onYes, onNo) {
  const existing = document.getElementById('undo-modal-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'undo-modal-overlay';
  overlay.innerHTML = `
    <div id="undo-modal">
      <div id="undo-modal-label">Restore <strong>${label}</strong>?</div>
      <div id="undo-modal-btns">
        <button id="undo-yes">Restore</button>
        <button id="undo-no">Dismiss</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('#undo-yes').onclick = () => { overlay.remove(); onYes(); };
  overlay.querySelector('#undo-no').onclick  = () => { overlay.remove(); onNo?.(); };
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); onNo?.(); } });
}

document.addEventListener('keydown', async e => {
  const tag = document.activeElement?.tagName;
  if (['INPUT','TEXTAREA','SELECT'].includes(tag)) return;
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
    e.preventDefault();
    const action = _undoStack.pop();
    if (!action) return;
    showUndoModal(action.label, async () => {
      await action.restore();
      _redoStack.push(action);
    }, () => {});
  }
  if ((e.ctrlKey || e.metaKey) && (e.shiftKey && e.key === 'z' || e.key === 'y')) {
    e.preventDefault();
    const action = _redoStack.pop();
    if (!action) return;
    // Redo = delete again (re-soft-delete)
    if (action.redelete) await action.redelete();
  }
});

// ── API ───────────────────────────────────────────────────────────────────────
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

