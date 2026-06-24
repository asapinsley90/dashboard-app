// â"€â"€ NAVIGATION â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const NAV_VIEWS = new Set(['dashboard', 'area', 'record', 'calendar', 'contacts', 'companies', 'documents', 'history', 'completed', 'archived', 'weekly', 'templates']);

function normalizeView(view) {
  return NAV_VIEWS.has(view) ? view : 'dashboard';
}

function navigate(view, areaId, recordId, push = true) {
  detachStatementPasteListener();
  let safeView = normalizeView(view);
  if (safeView === 'completed' || safeView === 'archived') {
    areaId = safeView;
    safeView = 'history';
  }
  if (safeView === 'area' && !areaId) safeView = 'dashboard';
  if (safeView === 'record' && (!areaId || !recordId)) safeView = 'dashboard';

  if (safeView !== 'area' && safeView !== 'record' && safeView !== 'history') areaId = null;
  if (safeView !== 'record') recordId = null;

  currentView = safeView;
  currentAreaId = areaId || null;
  currentRecordId = recordId || null;
  if (safeView !== 'area' && safeView !== 'record') currentFilter = null;

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
  document.querySelectorAll('.sidebar-subitem').forEach(i => i.classList.remove('active'));

  const viewEl = document.getElementById('view-' + safeView);
  if (viewEl) viewEl.classList.add('active');

  // Sidebar highlight
  if (safeView === 'dashboard') document.querySelector('[data-view="dashboard"]')?.classList.add('active');
  else if (safeView === 'area' && areaId) document.querySelector(`[data-area="${areaId}"]`)?.classList.add('active');
  else if (safeView === 'record' && currentAreaId) document.querySelector(`[data-area="${currentAreaId}"]`)?.classList.add('active');
  else if (['calendar','contacts','companies','documents','history','weekly'].includes(safeView)) document.querySelector(`[data-view="${safeView}"]`)?.classList.add('active');
  if (safeView === 'companies') {
    document.querySelector('[data-view="contacts"]')?.classList.add('active');
    document.querySelector('[data-view="companies"]')?.classList.add('active');
  }

  // Notify assistant of dashboard navigation (for onboarding)
  if (safeView === 'dashboard' && push) assistantNotify('navigate-dashboard');

  // Render
  if (safeView === 'dashboard') renderDashboard();
  else if (safeView === 'area') renderAreaView(areaId);
  else if (safeView === 'record') renderRecordView(recordId);
  else if (safeView === 'calendar') renderCalFull();
  else if (safeView === 'contacts') renderContactsView();
  else if (safeView === 'companies') renderCompaniesView();
  else if (safeView === 'documents') renderDocumentsView();
  else if (safeView === 'history') { historyTab = areaId === 'archived' ? 'archived' : 'completed'; renderHistoryView(); }
  else if (safeView === 'weekly') renderWeekly();
  else if (safeView === 'templates') renderTemplatesView();

  updatePlanningSubitems();

  // Breadcrumb
  const area = DB.areas.find(a => a.id === areaId);
  const record = DB.records.find(r => r.id === recordId);
  const bcParts = [];
  if (area) {
    const parent = area.parentId ? DB.areas.find(a => a.id === area.parentId) : null;
    if (parent) {
      bcParts.push(`<span class="doc-ref doc-ref-area" data-area-link="${parent.id}" style="background:${parent.color}18;border:1px solid ${parent.color}44;color:${parent.color}">${escapeHtml(parent.title)}</span>`);
    }
    bcParts.push(`<span class="doc-ref doc-ref-area" data-area-link="${area.id}" style="background:${area.color}18;border:1px solid ${area.color}44;color:${area.color}">${escapeHtml(area.title)}</span>`);
  }
  if (record) {
    const recArea = DB.areas.find(a => a.id === record.areaId);
    if (recArea && recArea.id !== areaId) {
      const recParent = recArea.parentId ? DB.areas.find(a => a.id === recArea.parentId) : null;
      if (recParent && !bcParts.length) bcParts.push(`<span class="doc-ref doc-ref-area" data-area-link="${recParent.id}" style="background:${recParent.color}18;border:1px solid ${recParent.color}44;color:${recParent.color}">${escapeHtml(recParent.title)}</span>`);
      if (!bcParts.some(p => p.includes(`data-area-link="${recArea.id}"`))) bcParts.push(`<span class="doc-ref doc-ref-area" data-area-link="${recArea.id}" style="background:${recArea.color}18;border:1px solid ${recArea.color}44;color:${recArea.color}">${escapeHtml(recArea.title)}</span>`);
    }
    bcParts.push(`<span class="doc-ref" data-record-link data-area-id="${record.areaId}" data-record-id="${record.id}">${escapeHtml(record.title)}</span>`);
  }
  document.getElementById('topbar-breadcrumb').innerHTML = bcParts.join('<span style="color:var(--dim);margin:0 6px">&#8250;</span>');

  if (push) {
    const hash = [safeView, areaId, recordId].filter(Boolean).join('/');
    history.pushState({ view: safeView, areaId, recordId }, '', '#' + hash);
  }
}

function navigateFromHash(hash) {
  const [view, areaId, recordId] = hash.split('/');
  navigate(view || 'dashboard', areaId, recordId, false);
}

window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  navigateFromHash(hash);
});

function updatePlanningSubitems() {
  const subs = document.getElementById('planning-contacts-subitems');
  if (!subs) return;
  const show = currentView === 'contacts' || currentView === 'companies';
  subs.classList.toggle('visible', show);
}

window.addEventListener('popstate', e => {
  if (!e.state) return;
  const s = e.state;
  // Restore calendar mode if this was a cal mode change
  if (s.calMode && s.calCid) {
    calMode = s.calMode; calOffset = 0;
    renderCalWidget(s.calCid, s.calMini);
    return;
  }
  if (s.areaCalMode && s.areaCalCid) {
    const as = getAreaCal(s.areaCalAreaId);
    as.mode = s.areaCalMode; as.offset = 0;
    renderAreaCalWidget(s.areaCalCid, s.areaCalAreaId);
    return;
  }
  navigate(s.view, s.areaId, s.recordId, false);
});

// â"€â"€ SIDEBAR â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function getAreaSubitems(areaId) {
  // Child sub-areas take priority over status filters
  const children = DB.areas.filter(a => a.parentId === areaId).sort((a,b) => (a.order_??0)-(b.order_??0));
  if (children.length > 0) {
    return children.map(a => ({ label: a.title, areaId: a.id, type: 'area' }));
  }
  if (areaId === 'area-jobs') {
    return [
      { label: 'Active', filter: 'active', type: 'filter' },
      { label: 'Applied', filter: 'applied', type: 'filter' },
      { label: 'Archived', filter: 'archived', type: 'filter' },
      { label: 'Contacts', filter: 'contacts', type: 'filter' },
    ];
  }
  return [
    { label: 'Active', filter: 'active', type: 'filter' },
    { label: 'Completed', filter: 'completed', type: 'filter' },
    { label: 'Archived', filter: 'archived', type: 'filter' },
  ];
}

function renderSidebar() {
  const el = document.getElementById('sidebar-areas');
  const allAreas = [...DB.areas].sort((a, b) => (a.order_??a.order??0) - (b.order_??b.order??0));
  // Only render top-level areas (no parentId) in main list
  const topAreas = allAreas.filter(a => !a.parentId);
  el.innerHTML = topAreas.map(area => {
    const count = DB.records.filter(r => r.areaId === area.id && r.type === 'job' && ['interviewing','awaiting'].includes(r.status)).length;
    const childIds = allAreas.filter(a => a.parentId === area.id).map(a => a.id);
    const isActive = (currentAreaId === area.id || childIds.includes(currentAreaId)) && (currentView === 'area' || currentView === 'record');
    const subs = getAreaSubitems(area.id);
    let subsHTML = '';
    if (subs && isActive) {
      const itemsHTML = subs.map(s => {
        if (s.type === 'area') {
          const isSubActive = currentAreaId === s.areaId;
          return `<div class="sidebar-subitem ${isSubActive?'active':''}" data-area="${s.areaId}" data-area-link="${s.areaId}">${s.label}</div>`;
        } else {
          return `<div class="sidebar-subitem ${currentFilter===s.filter?'active':''}" data-filter-link data-area-id="${area.id}" data-filter="${s.filter}">${s.label}</div>`;
        }
      }).join('');
      subsHTML = `<div class="sidebar-subitems visible" id="subitems-${area.id}">${itemsHTML}</div>`;
    } else if (subs) {
      subsHTML = `<div class="sidebar-subitems" id="subitems-${area.id}"></div>`;
    }
    return `<div class="sidebar-item ${isActive?'active':''}" data-area="${area.id}" data-area-link="${area.id}">
      <div class="sidebar-dot" style="background:${area.color}"></div>
      <span class="sidebar-item-title" ondblclick="renameArea(event,'${area.id}')">${area.title}</span>
      ${count > 0 ? `<span class="sidebar-badge">${count}</span>` : ''}
    </div>${subsHTML}`;
  }).join('');

  // Contacts in sidebar under Planning
  const planningEl = document.querySelector('.sidebar-section:last-child');

  // Dash area cards
  const dashAreas = document.getElementById('dash-areas');
  if (dashAreas) {
    dashAreas.innerHTML = topAreas.map(area => {
      const records = DB.records.filter(r => r.areaId === area.id);
      const sub = areaSubtitle(area, records);
      return `<div class="area-card" data-area-link="${area.id}">
        <div class="area-card-head">
          <div class="area-card-dot" style="background:${area.color}"></div>
          <div class="area-card-name">${area.title}</div>
        </div>
        <div class="area-card-sub">${sub}</div>
      </div>`;
    }).join('');
  }

  updatePlanningSubitems();
}

// Sidebar section collapse
const _sidebarCollapsed = JSON.parse(localStorage.getItem('sidebarCollapsed') || '{}');

function toggleSidebarSection(key) {
  _sidebarCollapsed[key] = !_sidebarCollapsed[key];
  localStorage.setItem('sidebarCollapsed', JSON.stringify(_sidebarCollapsed));
  _applySidebarCollapse(key);
}

function _applySidebarCollapse(key) {
  const body = document.getElementById('sidebar-sec-body-' + key);
  const chevron = document.getElementById('chevron-' + key);
  if (!body) return;
  const collapsed = !!_sidebarCollapsed[key];
  body.style.display = collapsed ? 'none' : '';
  if (chevron) chevron.textContent = collapsed ? '▸' : '▾';
}

function initSidebarCollapse() {
  ['areas', 'library', 'planning'].forEach(k => _applySidebarCollapse(k));
}

function setAreaFilter(areaId, filter) {
  currentFilter = filter;
  navigate('area', areaId, null, true);
}

function areaSubtitle(area, records) {
  if (area.id === 'area-jobs') {
    const active = records.filter(r => ['interviewing','awaiting'].includes(r.status)).length;
    const applied = records.filter(r => r.status === 'applied').length;
    return `${active} active · ${applied} applied`;
  }
  if (area.id === 'area-health') return 'Get back to the gym · Lose weight, get stronger';
  if (area.id === 'area-home') return 'Maintenance · Chores · House buying';
  if (area.id === 'area-projects') return `${records.length} projects`;
  if (area.id === 'area-finances') return 'Budget · Investments · Tracking';
  return `${records.length} records`;
}

function renameArea(e, areaId) {
  e.stopPropagation();
  const span = e.target;
  const area = DB.areas.find(a => a.id === areaId);
  const input = document.createElement('input');
  input.className = 'rename-input';
  input.value = area.title;
  span.replaceWith(input);
  input.focus(); input.select();
  async function commit() {
    const val = input.value.trim();
    if (val && val !== area.title) {
      await api('PUT', `/api/areas/${areaId}`, { title: val });
      DB.areas.find(a => a.id === areaId).title = val;
    }
    renderSidebar();
    if (currentView === 'area' && currentAreaId === areaId) renderAreaView(areaId);
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); if (e.key === 'Escape') { input.value = area.title; input.blur(); } });
}

