// â"€â"€ DASHBOARD â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// Dashboard sections — draggable, hideable
const DASH_WIDGETS = [
  { id: 'attention', label: 'Needs attention' },
  { id: 'today',     label: 'Today' },
  { id: 'week',      label: 'This week' },
  { id: 'areas',     label: 'Life areas' },
];

// Inner HTML for each section's content container
function dashSectionHTML(id) {
  switch (id) {
    case 'attention': return `
      <div class="attention-header" style="margin-bottom:6px">
        <div class="attention-filters" id="attention-filters"></div>
      </div>
      <div class="attention-card" id="dash-attention"></div>`;
    case 'today':  return `<div class="attention-card" id="dash-today" style="margin-bottom:0"></div>`;
    case 'week':   return `<div class="attention-card" id="dash-week"  style="margin-bottom:0"></div>`;
    case 'areas':  return `<div class="area-grid" id="dash-areas"></div>`;
    default: return '';
  }
}

function getDashPrefs() {
  const saved = currentUser.dashboardPrefs;
  return {
    order:  saved?.order  || DASH_WIDGETS.map(w => w.id),
    hidden: saved?.hidden || [],
  };
}

async function saveDashPrefs(prefs) {
  currentUser.dashboardPrefs = prefs;
  await api('PATCH', '/api/me', { dashboardPrefs: prefs });
}

async function hideDashWidget(id) {
  const p = getDashPrefs();
  if (!p.hidden.includes(id)) p.hidden.push(id);
  await saveDashPrefs(p);
  renderDashboard();
  showTourTip('widget-hide', '.dash-hidden-bar', 'Section hidden', 'Use the restore bar at the bottom of your dashboard to bring it back anytime.', 'top');
}

async function showDashWidget(id) {
  const p = getDashPrefs();
  p.hidden = p.hidden.filter(x => x !== id);
  await saveDashPrefs(p);
  renderDashboard();
}

let _dashDragSrc = null;
const _dashCollapsed = JSON.parse(localStorage.getItem('dashCollapsed') || '{}');

function toggleDashWidget(id) {
  _dashCollapsed[id] = !_dashCollapsed[id];
  localStorage.setItem('dashCollapsed', JSON.stringify(_dashCollapsed));
  const wrap = document.querySelector(`[data-widget-id="${id}"]`);
  if (!wrap) return;
  const body = wrap.querySelector('.dash-section-body');
  const chevron = wrap.querySelector('.dash-collapse-chevron');
  if (body) body.style.display = _dashCollapsed[id] ? 'none' : '';
  if (chevron) chevron.textContent = _dashCollapsed[id] ? '▸' : '▾';
}

function buildDashSections() {
  const col = document.getElementById('dash-sections-col');
  if (!col) return;
  const prefs = getDashPrefs();
  const hidden = new Set(prefs.hidden);
  const order = prefs.order.filter(id => DASH_WIDGETS.find(w => w.id === id));
  // Ensure any widget not in saved order still appears
  DASH_WIDGETS.forEach(w => { if (!order.includes(w.id)) order.push(w.id); });

  col.innerHTML = '';

  // If everything is hidden, reset to defaults
  const visibleCount = order.filter(id => DASH_WIDGETS.find(w => w.id === id) && !hidden.has(id)).length;
  if (visibleCount === 0 && hidden.size > 0) {
    saveDashPrefs({ order: DASH_WIDGETS.map(w => w.id), hidden: [] });
    hidden.clear();
  }

  order.forEach(id => {
    const widget = DASH_WIDGETS.find(w => w.id === id);
    if (!widget || hidden.has(id)) return;

    const wrap = document.createElement('div');
    wrap.className = 'dash-section-wrap';
    wrap.dataset.widgetId = id;
    wrap.draggable = true;

    const actionBtn = id === 'areas'
      ? `<button class="event-pill-btn" style="font-size:11px;padding:3px 10px;margin-right:4px" onclick="event.stopPropagation();promptAddArea()">+ Add area</button>`
      : (id === 'today' || id === 'week')
      ? `<button class="event-pill-btn" style="font-size:11px;padding:3px 10px;margin-right:4px" onclick="event.stopPropagation();promptAddEvent()">+ Add event</button>`
      : '';
    const isCollapsed = !!_dashCollapsed[id];
    wrap.innerHTML = `
      <div class="dash-section-drag-header dash-collapsible" data-widget-collapse="${id}" title="Click to collapse · Drag to reorder">
        <span class="drag-grip">&#8942;</span>
        <span class="dash-section-label" style="margin:0;flex:1">${widget.label}</span>
        <span class="dash-collapse-chevron" style="color:var(--dim);font-size:10px;margin-right:4px">${isCollapsed ? '▸' : '▾'}</span>
        ${actionBtn}
        <button class="dash-section-hide-btn" onclick="event.stopPropagation();hideDashWidget('${id}')" title="Hide section">&#x2715;</button>
      </div>
      <div class="dash-section-body" style="${isCollapsed ? 'display:none' : ''}">${dashSectionHTML(id)}</div>`;

    // Drag events
    wrap.addEventListener('dragstart', e => {
      _dashDragSrc = wrap;
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => wrap.classList.add('dragging'), 0);
    });
    wrap.addEventListener('dragend', () => {
      wrap.classList.remove('dragging');
      col.querySelectorAll('.dash-section-wrap').forEach(w => w.classList.remove('drag-over'));
    });
    wrap.addEventListener('dragover', e => {
      e.preventDefault();
      if (_dashDragSrc && _dashDragSrc !== wrap) {
        col.querySelectorAll('.dash-section-wrap').forEach(w => w.classList.remove('drag-over'));
        wrap.classList.add('drag-over');
      }
    });
    wrap.addEventListener('drop', async e => {
      e.preventDefault();
      wrap.classList.remove('drag-over');
      if (!_dashDragSrc || _dashDragSrc === wrap) return;
      const kids = [...col.children];
      const srcIdx = kids.indexOf(_dashDragSrc);
      const tgtIdx = kids.indexOf(wrap);
      if (srcIdx < tgtIdx) wrap.after(_dashDragSrc);
      else wrap.before(_dashDragSrc);
      // Persist new order
      const newOrder = [...col.querySelectorAll('[data-widget-id]')].map(el => el.dataset.widgetId);
      const p = getDashPrefs();
      p.order = newOrder;
      await saveDashPrefs(p);
      _dashDragSrc = null;
    });

    col.appendChild(wrap);
  });

  // Hidden sections restore bar
  const hiddenWidgets = DASH_WIDGETS.filter(w => hidden.has(w.id));
  if (hiddenWidgets.length) {
    const bar = document.createElement('div');
    bar.className = 'dash-hidden-bar';
    bar.innerHTML = hiddenWidgets.map(w =>
      `<button class="btn btn-sm dash-restore-btn" onclick="showDashWidget('${w.id}')">+ ${w.label}</button>`
    ).join('');
    col.appendChild(bar);
  }
}

function renderDashboard() {
  document.getElementById('topbar-actions').innerHTML = '';
  document.getElementById('topbar-breadcrumb').textContent = '';
  buildDashSections();
  renderSidebar();
  renderAttentionFilters();
  renderAttention();
  renderTodayStrip();
  renderThisWeekStrip();

  // Calendar label + widget
  const calLabelEl = document.getElementById('dash-cal-label');
  if (calLabelEl) {
    const t = new Date();
    if (calMode === 'day') {
      const d = new Date(t); d.setDate(t.getDate() + calOffset);
      calLabelEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long' });
    } else if (calMode === 'week') {
      const dow = t.getDay(); const mon = new Date(t);
      mon.setDate(t.getDate() - (dow === 0 ? 6 : dow - 1) + calOffset * 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      calLabelEl.textContent = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' — ' + sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      const d = new Date(t.getFullYear(), t.getMonth() + calOffset, 1);
      calLabelEl.textContent = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  }
  renderCalWidget('dash-cal', true);
}

let attentionFilter = 'triage';

const URGENCY_DEFAULTS = { urgent: 'Urgent', flagged: 'Follow Up', new: 'New', priority: 'Priority', none: 'Clear' };
const URGENCY_CSS = { urgent: 'af-urgent', flagged: 'af-flagged', new: 'af-new', priority: 'af-priority', none: 'af-none', triage: 'af-triage' };

function getUrgencyLabels() {
  return { ...URGENCY_DEFAULTS, ...(currentUser.dashboardPrefs?.urgencyLabels || {}) };
}
function getUrgencyLabel(key) { return getUrgencyLabels()[key] || key; }

function renderAttentionFilters() {
  const el = document.getElementById('attention-filters');
  if (!el) return;
  const labels = getUrgencyLabels();
  const urgencyKeys = ['urgent', 'flagged', 'new', 'priority'];
  // Count records per urgency (for hiding empty pills)
  const counts = {};
  DB.records.filter(r => !r.deletedAt && r.status !== 'archived' && r.status !== 'completed').forEach(r => {
    const u = r.urgency || 'none';
    counts[u] = (counts[u] || 0) + 1;
  });
  const triageCount = urgencyKeys.reduce((s, k) => s + (counts[k] || 0), 0);

  const pills = [];
  // Triage always shown
  const tActive = attentionFilter === 'triage';
  pills.push(`<button class="attention-filter af-triage${tActive ? ' active' : ''}" onclick="setAttentionFilter('triage')">Triage${triageCount ? ` <span class="af-count">${triageCount}</span>` : ''}</button>`);
  // Per-urgency pills — hide if 0 records
  urgencyKeys.forEach(key => {
    const cnt = counts[key] || 0;
    if (!cnt) return;
    const active = attentionFilter === key;
    const cls = URGENCY_CSS[key] || '';
    pills.push(`<button class="attention-filter ${cls}${active ? ' active' : ''}" onclick="setAttentionFilter('${key}')">${labels[key]} <span class="af-count">${cnt}</span></button>`);
  });
  // None pill — only show if it's currently active (so user can switch away), never in default view
  const noneCnt = counts['none'] || 0;
  if (attentionFilter === 'none' && noneCnt) {
    const nActive = true;
    pills.push(`<button class="attention-filter af-none active" onclick="setAttentionFilter('triage')">${labels['none']} <span class="af-count">${noneCnt}</span></button>`);
  }
  // Edit labels button
  pills.push(`<button class="attention-filter af-edit" onclick="openUrgencyLabelEditor()" title="Rename labels">✏</button>`);
  el.innerHTML = pills.join('');
}

function setAttentionFilter(filter) {
  attentionFilter = filter;
  renderDashboard();
}

function openUrgencyLabelEditor() {
  const labels = getUrgencyLabels();
  const urgencyColors = { urgent: 'var(--red)', flagged: 'var(--amber)', new: 'var(--blue)', priority: 'var(--purple)', none: 'var(--muted)' };
  const keys = ['urgent', 'flagged', 'new', 'priority', 'none'];
  const body = keys.map(k => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <div style="width:8px;height:8px;border-radius:50%;background:${urgencyColors[k]};flex-shrink:0"></div>
      <label style="width:80px;font-size:12px;color:var(--muted);flex-shrink:0">${URGENCY_DEFAULTS[k]}</label>
      <input class="modal-input" id="ul-${k}" value="${labels[k]}" placeholder="${URGENCY_DEFAULTS[k]}" style="flex:1;padding:4px 8px;font-size:13px">
    </div>`).join('');
  openModal('Rename urgency labels', body, [
    { label: 'Save', primary: true, onclick: 'saveUrgencyLabels()' },
    { label: 'Cancel', onclick: 'closeModal()' }
  ]);
}

async function saveUrgencyLabels() {
  const keys = ['urgent', 'flagged', 'new', 'priority', 'none'];
  const newLabels = {};
  keys.forEach(k => {
    const v = document.getElementById('ul-' + k)?.value.trim();
    if (v) newLabels[k] = v;
  });
  const prefs = getDashPrefs();
  prefs.urgencyLabels = newLabels;
  await saveDashPrefs(prefs);
  closeModal();
  renderDashboard();
}

function renderTodayStrip() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const el = document.getElementById('dash-today');
  if (!el) return;
  // Update drag header label with date
  const wrap = el.closest('[data-widget-id="today"]');
  const hdr = wrap?.querySelector('.dash-section-label');
  if (hdr) hdr.textContent = 'Today — ' + today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const events = DB.records
    .filter(r => !r.deletedAt && r.type === 'event' && r.fields?.date === todayStr)
    .sort((a, b) => (a.fields.time || '').localeCompare(b.fields.time || ''));

  if (!events.length) {
    el.innerHTML = '<div style="font-size:13px;color:var(--muted);padding:4px 0">Nothing scheduled today.</div>';
    return;
  }

  const catColor = { interview: 'var(--red)', job: 'var(--blue)', health: 'var(--green)', other: 'var(--amber)' };
  const catBg = { interview: 'rgba(224,85,85,.12)', job: 'rgba(91,155,213,.12)', health: 'rgba(76,175,125,.12)', other: 'rgba(212,148,58,.12)' };

  el.innerHTML = events.map((ev, i) => {
    const cat = ev.fields.category || 'other';
    const area = getArea(ev.areaId);
    return `<div class="attention-item" data-record-link data-area-id="${ev.areaId}" data-record-id="${ev.id}" style="${i===0?'border-top:none;padding-top:0':''}">
      <div class="a-dot" style="background:${area?.color||catColor[cat]||'var(--accent)'}"></div>
      <div class="a-body">
        <div class="a-title">${ev.title}</div>
        <div class="a-sub">${ev.fields.time ? fmtTime(ev.fields.time) : 'All day'}${ev.fields.location ? ' · ' + ev.fields.location : ''}</div>
      </div>
      <span class="a-tag" data-area-link="${ev.areaId}">${area?.title || cat}</span>
    </div>`;
  }).join('');
}

function renderThisWeekStrip() {
  const el = document.getElementById('dash-week');
  if (!el) return;
  const today = new Date(); today.setHours(0,0,0,0);
  const end = new Date(today); end.setDate(end.getDate() + 7);
  const wrap = el.closest('[data-widget-id="week"]');
  const hdr = wrap?.querySelector('.dash-section-label');
  const endFmt = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (hdr) hdr.textContent = 'This week — through ' + endFmt;
  const items = DB.records
    .filter(r => !r.deletedAt && r.type === 'event' && r.status !== 'archived' && r.status !== 'completed' && r.fields?.date)
    .filter(r => {
      const d = new Date(r.fields.date + 'T00:00:00');
      return d >= today && d <= end;
    })
    .sort((a, b) => (a.fields.date || '').localeCompare(b.fields.date || '') || (a.fields.time || '').localeCompare(b.fields.time || ''));
  if (!items.length) { el.innerHTML = '<div class="this-week-empty">Nothing scheduled this week.</div>'; return; }
  el.innerHTML = items.map(ev => {
    const area = getArea(ev.areaId);
    return `<div class="attention-item" data-record-link data-area-id="${ev.areaId}" data-record-id="${ev.id}">
      <div class="a-dot" style="background:${area?.color || 'var(--accent)'}"></div>
      <div class="a-body">
        <div class="a-title">${ev.title}</div>
        <div class="a-sub">${formatDate(ev.fields.date)}${ev.fields.time ? ' · ' + fmtTime(ev.fields.time) : ''}${ev.fields.location ? ' · ' + ev.fields.location : ''}</div>
      </div>
      <span class="a-tag" data-area-link="${ev.areaId}">${area?.title || 'Event'}</span>
    </div>`;
  }).join('');
}

function renderAttention() {
  const el = document.getElementById('dash-attention');
  const attention = getAttentionItems();
  renderAttentionFilters();
  if (!attention.length) { el.innerHTML = '<div class="empty">All clear.</div>'; return; }
  el.innerHTML = attention.map(a => {
    const areaBg = a.areaColor ? `${a.areaColor}18` : 'var(--bg3)';
    const areaBorder = a.areaColor ? `${a.areaColor}44` : 'var(--border)';
    const areaText = a.areaColor || 'var(--muted)';
    return `
    <div class="attention-item ${a.urgencyClass||''}" data-record-link data-area-id="${a.areaId || ''}" data-record-id="${a.recordId || ''}">
      <div class="a-dot" style="background:${a.color};cursor:${a.recordId?'pointer':'default'}"
        ${a.recordId ? `data-ctx-record-id="${a.recordId}"` : ''}></div>
      <div class="a-body">
        <div class="a-title">${a.title}</div>
        <div class="a-sub">${a.sub}</div>
      </div>
      ${a.tag ? `<span class="a-tag" style="cursor:pointer;background:${areaBg};border:1px solid ${areaBorder};color:${areaText}" data-area-link="${a.areaId||''}">${a.tag}</span>` : ''}
    </div>`;
  }).join('');
}

function getAttentionItems() {
  const items = [];
  const seen = new Set();
  const today = new Date(); today.setHours(0,0,0,0);
  const urgencyPriority = { urgent: 0, flagged: 1, new: 2, priority: 3 };
  const urgencyColor = { urgent: 'var(--red)', flagged: 'var(--amber)', new: 'var(--blue)', priority: 'var(--purple)' };

  const addItem = (item) => {
    if (!item || !item.recordId || seen.has(item.recordId)) return;
    seen.add(item.recordId);
    items.push(item);
  };

  // Global urgency triage only
  const todayDateStr = new Date().toISOString().split('T')[0];
  DB.records.filter(r => !r.deletedAt && r.urgency && r.urgency !== 'none' && r.status !== 'archived' && r.status !== 'completed' && !(r.type === 'event' && r.fields?.date && r.fields.date < todayDateStr && r.urgency === 'new')).forEach(r => {
    const area = getArea(r.areaId);
    if (attentionFilter !== 'triage' && r.urgency !== attentionFilter) return;
    addItem({
      title: r.title + (r.fields?.role ? ' — ' + r.fields.role : ''),
      sub: r.fields?.role || (r.type === 'event' ? 'Event' : 'Record'),
      color: urgencyColor[r.urgency] || 'var(--accent)',
      tag: area?.title || '',
      areaId: r.areaId,
      areaColor: area?.color || '',
      recordId: r.id,
      onclick: `navigate('record','${r.areaId}','${r.id}')`,
      priority: urgencyPriority[r.urgency] ?? 3,
      urgencyClass: 'attn-' + r.urgency
    });
  });

  if (attentionFilter === 'none') {
    DB.records.filter(r => !r.deletedAt && (!r.urgency || r.urgency === 'none') && r.status !== 'archived' && r.status !== 'completed').forEach(r => {
      const area = getArea(r.areaId);
      addItem({
        title: r.title + (r.fields?.role ? ' — ' + r.fields.role : ''),
        sub: r.fields?.role || (r.type === 'event' ? 'Event' : 'Record'),
        color: 'var(--muted)',
        tag: area?.title || '',
        areaId: r.areaId,
        areaColor: area?.color || '',
        recordId: r.id,
        onclick: `navigate('record','${r.areaId}','${r.id}')`,
        priority: 9
      });
    });
  }

  return items.sort((a,b) => (a.priority-b.priority) || (a.diff||99)-(b.diff||99)).slice(0,8);
}

// â"€â"€ AREA VIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function renderAreaView(areaId) {
  const area = DB.areas.find(a => a.id === areaId);
  if (!area) return;
  const titleEl = document.getElementById('area-view-title');
  titleEl.textContent = area.title;
  titleEl.contentEditable = 'false';
  titleEl.dataset.areaId = areaId;
  titleEl.onclick = null;
  titleEl.onclick = () => unlockAreaTitle(titleEl);
  document.getElementById('area-view-dot').style.background = area.color;
  document.getElementById('topbar-actions').innerHTML = '';
  const btnEl = document.getElementById('area-action-btns');
  const children = DB.areas.filter(a => a.parentId === areaId).sort((a,b) => (a.order_??0)-(b.order_??0));

  // If this area has sub-areas, show overview cards instead of records
  if (children.length > 0) {
    if (btnEl) {
      btnEl.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'btn btn-p btn-sm new-record-btn';
      b.textContent = '+ Add record';
      b.onclick = () => promptAddRecord(null, areaId);
      btnEl.appendChild(b);
      const b2 = document.createElement('button');
      b2.className = 'record-header-tile'; b2.textContent = '⚡ Widgets';
      b2.onclick = () => openAreaWidgetsModal(areaId);
      btnEl.appendChild(b2);
      if (!area.parentId) {
        const bSub = document.createElement('button');
        bSub.className = 'btn btn-sm btn-p'; bSub.style.marginLeft = '6px'; bSub.textContent = '+ Add sub-area';
        bSub.onclick = () => promptAddArea(areaId);
        btnEl.appendChild(bSub);
      }
      const b3 = document.createElement('button');
      b3.className = 'btn btn-sm'; b3.style.marginLeft = '6px';
      b3.textContent = 'Save as template';
      b3.onclick = () => promptSaveAsTemplate(area);
      btnEl.appendChild(b3);
    }
    const el = document.getElementById('area-view-records');
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:4px">${
      children.map(child => {
        const recs = DB.records.filter(r => r.areaId === child.id && !r.deletedAt);
        const active = recs.filter(r => r.status !== 'archived' && r.status !== 'completed').length;
        return `<div class="area-card" data-area-link="${child.id}" style="cursor:pointer">
          <div class="area-card-head">
            <div class="area-card-dot" style="background:${child.color||area.color}"></div>
            <div class="area-card-name">${child.title}</div>
          </div>
          <div class="area-card-sub">${active} active record${active!==1?'s':''}</div>
        </div>`;
      }).join('')
    }</div>`;
    const calEl = document.getElementById('area-cal');
    if (calEl) { window._calAreaFilter = areaId; renderAreaCalWidget('area-cal', areaId); }
    // Financial widgets for parent areas
    const calPanel = document.querySelector('.area-cal-panel');
    if (calPanel) {
      document.getElementById('area-net-worth-widget')?.remove();
      document.getElementById('area-cc-summary-widget')?.remove();
      const areaWidgetOn = id => !area.widgets || area.widgets.includes(id);
      const descendantAreaIds = getDescendantAreaIds(areaId);
      const allAccounts = DB.records.filter(r => r.type === 'account' && !r.deletedAt && descendantAreaIds.includes(r.areaId));
      if (allAccounts.length && areaWidgetOn('net-worth')) renderNetWorthWidget(calPanel, allAccounts, areaId);
      const ccAccounts = allAccounts.filter(r => r.fields.accountType === 'Credit Card');
      if (ccAccounts.length && areaWidgetOn('credit-cards')) renderCreditCardSummaryWidget(calPanel, ccAccounts, areaId);
    }
    renderSidebar();
    return;
  }

  if (btnEl) {
    btnEl.innerHTML = '';
    if (areaId === 'area-jobs') {
      const b1 = document.createElement('button');
      b1.className = 'btn btn-sm'; b1.style.color = 'var(--muted)';
      b1.textContent = '+ Add company';
      b1.onclick = () => promptAddRecord('company');
      const b2 = document.createElement('button');
      b2.className = 'btn btn-p btn-sm'; b2.style.marginLeft = '6px';
      b2.textContent = '+ Add job';
      b2.onclick = () => openJobModal(areaId);
      btnEl.appendChild(b1); btnEl.appendChild(b2);
    } else {
      const b = document.createElement('button');
      b.className = 'btn btn-p btn-sm new-record-btn';
      b.textContent = '+ Add record';
      b.onclick = () => promptAddRecord();
      btnEl.appendChild(b);
      const b2 = document.createElement('button');
      b2.className = 'record-header-tile'; b2.textContent = '⚡ Widgets';
      b2.onclick = () => openAreaWidgetsModal(areaId);
      btnEl.appendChild(b2);
      if (!area.parentId) {
        const bSub = document.createElement('button');
        bSub.className = 'btn btn-sm btn-p'; bSub.style.marginLeft = '6px'; bSub.textContent = '+ Add sub-area';
        bSub.onclick = () => promptAddArea(areaId);
        btnEl.appendChild(bSub);
      }
      const b3 = document.createElement('button');
      b3.className = 'btn btn-sm'; b3.style.marginLeft='6px';
      b3.textContent = 'Save as template';
      b3.onclick = () => promptSaveAsTemplate(area);
      btnEl.appendChild(b3);
    }
  }
  const records = DB.records.filter(r => r.areaId === areaId && !r.deletedAt);
  const el = document.getElementById('area-view-records');

  if (areaId === 'area-jobs') {
    el.innerHTML = renderJobList(records, currentFilter);
  } else if (currentFilter === 'active') {
    const filtered = records.filter(r => r.status !== 'archived' && r.status !== 'completed');
    const grouped = groupRecordsByType(filtered);
    el.innerHTML = (Object.entries(grouped).map(([type, recs]) => `
      <div style="margin-bottom:20px">
        <div class="dash-section-label" style="margin-bottom:8px">${pluralize(type)}</div>
        <div class="record-list">${recs.map(r => recordCard(r)).join('')}</div>
      </div>`).join('') || '<div class="empty">No active records.</div>') +
      `<div style="margin-top:8px"><button class="btn btn-sm" onclick="currentFilter=null;renderAreaView('${areaId}')">← All</button></div>`;
  } else if (currentFilter === 'completed' || currentFilter === 'archived') {
    const filtered = records.filter(r => r.status === currentFilter);
    el.innerHTML = collapsibleGroup(capitalize(currentFilter), filtered, true, currentFilter+'-'+areaId) +
      `<div style="margin-top:8px"><button class="btn btn-sm" onclick="currentFilter=null;renderAreaView('${areaId}')">← All</button></div>`;
  } else {
    const activeRecs = records.filter(r => r.status !== 'archived' && r.status !== 'completed');
    const completedRecs = records.filter(r => r.status === 'completed');
    const archivedRecs = records.filter(r => r.status === 'archived');
    const grouped = groupRecordsByType(activeRecs);
    el.innerHTML = (Object.entries(grouped).map(([type, recs]) => `
      <div style="margin-bottom:20px">
        <div class="dash-section-label" style="margin-bottom:8px">${pluralize(type)}</div>
        <div class="record-list">${recs.map(r => recordCard(r)).join('')}</div>
      </div>`).join('') || '<div class="empty">No active records. Add one above.</div>') +
      (completedRecs.length ? collapsibleGroup('Completed', completedRecs, false, 'completed-'+areaId) : '') +
      (archivedRecs.length ? collapsibleGroup('Archived', archivedRecs, false, 'archived-'+areaId) : '');
  }

  const areaWidgets = area.widgets || null; // null = all on (default), array = explicit set
  const areaWidgetOn = id => !areaWidgets || areaWidgets.includes(id);

  // Clear parent-area-only widgets that bleed in from navigating Finance → subarea
  ['area-net-worth-widget','area-cc-summary-widget'].forEach(id => document.getElementById(id)?.remove());

  // Render area calendar filtered to this area
  const calEl = document.getElementById('area-cal');
  if (calEl) {
    if (areaWidgetOn('calendar')) {
      window._calAreaFilter = areaId;
      renderAreaCalWidget('area-cal', areaId);
    } else {
      calEl.innerHTML = '';
    }
  }

  const areaContacts = DB.records.filter(r => r.areaId === areaId && r.type === 'contact' && !r.deletedAt);
  const calPanel = document.querySelector('.area-cal-panel');
  if (calPanel) {
    const existing = document.getElementById('area-contacts-btn');
    if (existing) existing.remove();
    if (areaWidgetOn('contacts') && areaContacts.length) {
      const btn = document.createElement('div');
      btn.id = 'area-contacts-btn';
      btn.style.cssText = 'margin-top:10px';
      btn.innerHTML = `<button class="btn" style="width:100%;justify-content:center" onclick="currentFilter='contacts';renderAreaView('${areaId}')">
        👤 Contacts (${areaContacts.length})
      </button>`;
      calPanel.appendChild(btn);
    }

    const existing2 = document.getElementById('area-invest-widgets');
    if (existing2) existing2.remove();
    const accountRecs = records.filter(r => r.type === 'account' && !r.deletedAt);
    if (accountRecs.length && (areaWidgetOn('portfolio') || areaWidgetOn('by-account'))) {
      renderInvestmentWidgets(calPanel, accountRecs, area);
    }

    // Finance aggregate widgets for subareas
    ['area-ira-widget','area-401k-widget','area-hsa-widget','area-tax-docs-widget',
     'area-cc-details-widget','area-history-widget','area-balance-chart-widget'].forEach(id => {
      document.getElementById(id)?.remove();
    });
    if (accountRecs.length) {
      if (areaWidgetOn('cc-details')) renderAreaCCDetailsWidget(calPanel, accountRecs, area.id);
      if (areaWidgetOn('history')) renderAreaHistoryWidget(calPanel, accountRecs, area.id);
      if (areaWidgetOn('balance-chart')) renderAreaBalanceChartWidget(calPanel, accountRecs, area.id);
      if (areaWidgetOn('ira-progress')) renderAreaIRAWidget(calPanel, accountRecs);
      if (areaWidgetOn('401k-progress')) renderArea401kWidget(calPanel, accountRecs);
      if (areaWidgetOn('hsa-progress')) renderAreaHSAWidget(calPanel, accountRecs);
      if (areaWidgetOn('tax-docs')) renderAreaTaxDocsWidget(calPanel, accountRecs);
    }
  }

  renderSidebar();
}


function renderJobList(records, filter) {
  // Filter-specific view
  if (filter === 'applied') {
    const recs = records.filter(r => r.type==='job' && r.status==='applied');
    return collapsibleGroup('Applied — no response', recs, true, 'applied') +
      `<div style="margin-top:8px"><button class="btn btn-sm" onclick="currentFilter=null;renderAreaView('area-jobs')">← All</button></div>`;
  }
  if (filter === 'archived') {
    const recs = records.filter(r => r.type==='job' && r.status==='rejected');
    return collapsibleGroup('Archived / Rejected', recs, true, 'archived') +
      `<div style="margin-top:8px"><button class="btn btn-sm" onclick="currentFilter=null;renderAreaView('area-jobs')">← All</button></div>`;
  }
  if (filter === 'contacts') {
    const recs = records.filter(r => r.type==='contact');
    return `<div class="dash-section-label" style="margin-bottom:10px">Contacts</div>
      <div class="contacts-grid">${recs.map(r=>`<div class="contact-card" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
        <div class="contact-card-name">👤 ${r.title}</div>
        <div class="contact-card-sub">${r.fields.role||''}${r.fields.company?' · '+r.fields.company:''}</div>
      </div>`).join('')}</div>
      <div style="margin-top:8px"><button class="btn btn-sm btn-p btn-xs" onclick="promptAddRecord('contact')">+ Add contact</button></div>
      <div style="margin-top:8px"><button class="btn btn-sm" onclick="currentFilter=null;renderAreaView('area-jobs')">← All</button></div>`;
  }

  // Default: active view + collapsed applied/archived
  const active = records.filter(r => r.type==='job' && ['interviewing','awaiting'].includes(r.status));
  const applied = records.filter(r => r.type==='job' && r.status==='applied');
  const archived = records.filter(r => r.type==='job' && r.status==='rejected');

  return `
    ${active.length ? `<div style="margin-bottom:16px">
      <div class="dash-section-label" style="margin-bottom:8px">Active</div>
      <div class="record-list">${active.map(r=>jobCard(r)).join('')}</div>
    </div>` : ''}
    ${collapsibleGroup('Applied', applied, false, 'applied-toggle')}
    ${collapsibleGroup('Archived', archived, false, 'archived-toggle')}
  `;
}

function collapsibleGroup(label, recs, defaultOpen, key) {
  if (!recs.length) return '';
  const id = 'grp-'+key;
  const isOpen = defaultOpen || (window._grpOpen||{})[key];
  return `<div style="margin-bottom:12px">
    <div class="group-header" onclick="toggleGroup('${id}','${key}')">
      <span class="group-toggle ${isOpen?'open':''}">▶</span>
      <span class="group-label">${label}</span>
      <span class="group-count">${recs.length}</span>
    </div>
    <div class="group-body" id="${id}" style="max-height:${isOpen?'2000px':'0'}">
      <div class="record-list">${recs.map(r=>jobCard(r)).join('')}</div>
    </div>
  </div>`;
}

function toggleGroup(id, key) {
  const el = document.getElementById(id);
  const header = el?.previousElementSibling;
  const toggle = header?.querySelector('.group-toggle');
  const isOpen = el.style.maxHeight !== '0px' && el.style.maxHeight !== '';
  window._grpOpen = window._grpOpen || {};
  window._grpOpen[key] = !isOpen;
  el.style.maxHeight = isOpen ? '0' : '2000px';
  toggle?.classList.toggle('open', !isOpen);
}

function jobCard(r) {
  const statusBadge = { interviewing: 'badge-red', awaiting: 'badge-amber', applied: 'badge-blue', rejected: 'badge-gray' };
  const statusLabel = { interviewing: 'Interviewing', awaiting: 'Awaiting', applied: 'Applied', rejected: 'Rejected' };
  const nextI = (r.interviews || []).filter(i => i.date >= new Date().toISOString().split('T')[0]).sort((a,b) => a.date.localeCompare(b.date))[0];
  return `<div class="record-card" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
    <div class="record-card-icon">💼</div>
    <div class="record-card-body">
      <div class="record-card-title">${r.title}</div>
      <div class="record-card-sub">${r.fields.role}${r.fields.salary ? ' · ' + r.fields.salary : ''}${nextI ? ' · Next: ' + formatDate(nextI.date) : ''}</div>
    </div>
    <div class="record-card-right">
      <span class="badge ${statusBadge[r.status] || 'badge-gray'}">${statusLabel[r.status] || r.status}</span>
    </div>
  </div>`;
}

function recordCard(r) {
  const icons = { job: '💼', contact: '👤', event: '📅', goal: '🎯', task: '✔', project: '📨', note: '📝', account: '💳', transaction: '💸' };
  let sub = r.fields.role || r.fields.notes?.slice(0, 80) || r.fields.date || '';
  let right = statusBadge(r);
  let cardIcon = `<div class="record-card-icon">${icons[r.type] || '·'}</div>`;
  if (r.type === 'account') {
    const parts = [r.fields.institution, r.fields.accountType, r.fields.owner].filter(Boolean);
    sub = parts.join(' · ');
    const bal = r.fields.balance !== undefined && r.fields.balance !== '' ? '$'+Number(r.fields.balance).toLocaleString() : '';
    right = bal ? `<span style="font-size:14px;font-weight:600;color:var(--text)">${bal}</span>` : '';
    const instDef = getInstitutionDefaults(r.fields.institution);
    const domain = r.fields.institutionDomain || instDef?.domain;
    if (domain) cardIcon = `<div class="record-card-icon" style="padding:0;display:flex;align-items:center;justify-content:center"><img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:22px;height:22px;object-fit:contain" onerror="this.outerHTML='💳'"></div>`;
  }
  return `<div class="record-card" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
    ${cardIcon}
    <div class="record-card-body">
      <div class="record-card-title">${r.title}</div>
      ${sub ? `<div class="record-card-sub">${sub}</div>` : ''}
    </div>
    <div class="record-card-right">${right}</div>
    <div class="record-card-actions"><button class="record-card-action-btn" data-ctx-record-id="${r.id}" onclick="event.stopPropagation();showRecordCtxMenu(event,'${r.id}')">···</button></div>
  </div>`;
}

function statusBadge(r) {
  const map = {
    active: 'badge-green', interviewing: 'badge-red', awaiting: 'badge-amber',
    applied: 'badge-blue', rejected: 'badge-gray', withdrawn: 'badge-gray', 'on-hold': 'badge-gray',
    exploring: 'badge-purple', upcoming: 'badge-blue',
    completed: 'badge-complete', archived: 'badge-archived'
  };
  if (!r.status || r.status === 'active' || r.status === 'upcoming') return '';
  return `<span class="badge ${map[r.status] || 'badge-gray'}">${r.status}</span>`;
}

function groupRecordsByType(records) {
  return records.reduce((acc, r) => { (acc[r.type] = acc[r.type] || []).push(r); return acc; }, {});
}

const lookupCache = { areasById: new Map(), recordsById: new Map(), recordsByType: {} };

function rebuildLookupCaches() {
  lookupCache.areasById = new Map(DB.areas.map(a => [a.id, a]));
  lookupCache.recordsById = new Map(DB.records.map(r => [r.id, r]));
  lookupCache.recordsByType = {};
  DB.records.forEach(r => {
    if (!lookupCache.recordsByType[r.type]) lookupCache.recordsByType[r.type] = [];
    lookupCache.recordsByType[r.type].push(r);
  });
}

function getArea(areaId) {
  if (!lookupCache.areasById.size || lookupCache.areasById.size !== DB.areas.length) {
    rebuildLookupCaches();
  }
  return lookupCache.areasById.get(areaId) || null;
}

function getRecord(recordId) {
  if (!lookupCache.recordsById.size || lookupCache.recordsById.size !== DB.records.length) {
    rebuildLookupCaches();
  }
  return lookupCache.recordsById.get(recordId) || null;
}

function getRecordsByType(type) {
  if (!lookupCache.recordsByType[type] || lookupCache.recordsByType[type].length !== DB.records.filter(r => r.type === type).length) {
    rebuildLookupCaches();
  }
  return lookupCache.recordsByType[type] || [];
}


function unlockAreaTitle(el) {
  if (el.contentEditable === 'true') return; // already editing
  const areaId = el.dataset.areaId;
  const original = el.textContent;
  el.contentEditable = 'true';
  el.focus();
  // Select all text
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  async function commit() {
    el.contentEditable = 'false';
    const val = el.textContent.trim();
    if (!val) { el.textContent = original; return; }
    if (val === original) return;
    el.textContent = val;
    const area = DB.areas.find(a => a.id === areaId);
    if (area) area.title = val;
    await api('PUT', `/api/areas/${areaId}`, { title: val });
    renderSidebar();
  }

  el.onblur = commit;
  el.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
    if (e.key === 'Escape') { el.textContent = original; el.blur(); }
  };
}

// ── INVESTMENT AREA WIDGETS ──────────────────────────────────────────────────
function renderInvestmentWidgets(calPanel, accountRecs, area) {
  const wrapper = document.createElement('div');
  wrapper.id = 'area-invest-widgets';
  wrapper.style.cssText = 'margin-bottom:16px';

  // Portfolio total from latest end balance per account
  const total = accountRecs.reduce((sum, r) => {
    const hist = (r.fields.history || []).slice().sort((a,b) => b.month.localeCompare(a.month));
    const latest = hist[0];
    return sum + (latest ? Number(latest.endBalance) || 0 : Number(r.fields.balance) || 0);
  }, 0);

  const fmt = n => '$' + Math.round(n).toLocaleString();

  // Combined balance history across all accounts by month
  const monthMap = {};
  accountRecs.forEach(r => {
    (r.fields.history || []).forEach(h => {
      if (!monthMap[h.month]) monthMap[h.month] = 0;
      monthMap[h.month] += Number(h.endBalance) || 0;
    });
  });
  const months = Object.keys(monthMap).sort();
  const balances = months.map(m => monthMap[m]);

  // Blended monthly return (weighted average of last month)
  const lastMonth = months[months.length - 1];
  let blendedReturn = null;
  if (lastMonth) {
    let totalWeight = 0, weightedReturn = 0;
    accountRecs.forEach(r => {
      const entry = (r.fields.history || []).find(h => h.month === lastMonth);
      if (entry) {
        const w = Number(entry.endBalance) || 0;
        weightedReturn += (Number(entry.returnPct) || 0) * w;
        totalWeight += w;
      }
    });
    if (totalWeight > 0) blendedReturn = weightedReturn / totalWeight;
  }

  const returnColor = blendedReturn === null ? 'var(--muted)' : blendedReturn >= 0 ? 'var(--green)' : 'var(--red)';
  const returnText = blendedReturn === null ? '—' : (blendedReturn >= 0 ? '+' : '') + blendedReturn.toFixed(2) + '%';

  // SVG line chart (compact)
  let chartSvg = '';
  if (balances.length >= 2) {
    const W = 220, H = 60, PL = 4, PR = 4, PT = 6, PB = 6;
    const min = Math.min(...balances), max = Math.max(...balances);
    const range = max - min || 1;
    const xStep = (W - PL - PR) / (balances.length - 1);
    const y = v => PT + (H - PT - PB) * (1 - (v - min) / range);
    const pts = balances.map((v, i) => `${PL + i * xStep},${y(v)}`).join(' ');
    const areaPath = `M${PL},${H-PB} ` + balances.map((v,i)=>`L${PL+i*xStep},${y(v)}`).join(' ') + ` L${PL+(balances.length-1)*xStep},${H-PB} Z`;
    chartSvg = `<svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;margin-top:8px">
      <path d="${areaPath}" fill="var(--accent)" opacity="0.1"/>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    </svg>`;
  }

  // Per-account bar chart
  const maxBal = Math.max(...accountRecs.map(r => {
    const hist = (r.fields.history || []).slice().sort((a,b) => b.month.localeCompare(a.month));
    return hist[0] ? Number(hist[0].endBalance) || 0 : Number(r.fields.balance) || 0;
  }), 1);
  const barRows = accountRecs.map(r => {
    const hist = (r.fields.history || []).slice().sort((a,b) => b.month.localeCompare(a.month));
    const bal = hist[0] ? Number(hist[0].endBalance) || 0 : Number(r.fields.balance) || 0;
    const pct = Math.round(bal / maxBal * 100);
    const name = r.title || r.fields.institution || 'Account';
    return `<div style="margin-bottom:6px;cursor:pointer" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:2px">
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:130px">${name}</span>
        <span style="color:var(--text)">${fmt(bal)}</span>
      </div>
      <div style="height:4px;background:var(--bg3);border-radius:2px">
        <div style="height:4px;width:${pct}%;background:var(--accent);border-radius:2px"></div>
      </div>
    </div>`;
  }).join('');

  wrapper.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;cursor:default" oncontextmenu="areaWidgetCtxMenu(event,'${area.id}','portfolio')">Portfolio total</div>
      <div style="font-size:22px;font-weight:700;color:var(--text)">${fmt(total)}</div>
      <div style="font-size:12px;color:${returnColor};margin-top:2px">${lastMonth ? lastMonth.slice(0,7) + ' return: ' : ''}${returnText}</div>
      ${chartSvg}
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px;cursor:default" oncontextmenu="areaWidgetCtxMenu(event,'${area.id}','by-account')">By account</div>
      ${barRows}
    </div>`;

  // Insert before the calendar label
  const calLabel = calPanel.querySelector('.dash-section-label');
  if (calLabel) calPanel.insertBefore(wrapper, calLabel.parentElement || calLabel);
  else calPanel.prepend(wrapper);
}

function getDescendantAreaIds(areaId) {
  const ids = [];
  const queue = [areaId];
  while (queue.length) {
    const id = queue.shift();
    ids.push(id);
    DB.areas.filter(a => a.parentId === id).forEach(a => queue.push(a.id));
  }
  return ids;
}

function areaWidgetCtxMenu(e, areaId, widgetId) {
  e.preventDefault(); e.stopPropagation();
  document.querySelectorAll('.ctx-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  menu.style.cssText = `left:${Math.min(e.clientX, window.innerWidth-160)}px;top:${Math.min(e.clientY, window.innerHeight-80)}px`;
  const hide = document.createElement('div'); hide.className = 'ctx-item';
  hide.textContent = 'Hide widget';
  hide.onclick = () => {
    menu.remove();
    const area = DB.areas.find(a => a.id === areaId);
    if (!area) return;
    const ctx = area.parentId ? 'subarea' : 'area';
    const allIds = WIDGET_LIBRARY.filter(w => w.contexts.includes(ctx)).map(d => d.id);
    area.widgets = area.widgets || allIds;
    area.widgets = area.widgets.filter(w => w !== widgetId);
    api('PUT', `/api/areas/${areaId}`, { widgets: area.widgets });
    renderAreaView(areaId);
  };
  menu.appendChild(hide);
  document.body.appendChild(menu);
  const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

function renderNetWorthWidget(calPanel, allAccounts, areaId) {
  const fmt = n => '$' + Math.round(Math.abs(n)).toLocaleString();
  const getBalance = r => {
    const hist = (r.fields.history || []).slice().sort((a,b) => b.month.localeCompare(a.month));
    return hist[0] ? Number(hist[0].endBalance) || 0 : Number(r.fields.balance) || 0;
  };
  const isLiability = r => ['Credit Card','Loan','Mortgage'].includes(r.fields.accountType);
  const assets = allAccounts.filter(r => !isLiability(r));
  const liabilities = allAccounts.filter(r => isLiability(r));
  const totalAssets = assets.reduce((s, r) => s + getBalance(r), 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + getBalance(r), 0);
  const netWorth = totalAssets - totalLiabilities;
  const color = netWorth >= 0 ? 'var(--green)' : 'var(--red)';

  // Group assets by sub-area
  const byArea = {};
  assets.forEach(r => {
    const aName = DB.areas.find(a => a.id === r.areaId)?.title || 'Other';
    if (!byArea[aName]) byArea[aName] = 0;
    byArea[aName] += getBalance(r);
  });

  const wrapper = document.createElement('div');
  wrapper.id = 'area-net-worth-widget';
  wrapper.style.cssText = 'margin-bottom:16px';
  wrapper.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;cursor:default" oncontextmenu="areaWidgetCtxMenu(event,'${areaId}','net-worth')">Net worth</div>
      <div style="font-size:22px;font-weight:700;color:${color}">${netWorth < 0 ? '-' : ''}${fmt(netWorth)}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;color:var(--muted)">
        <span>Assets: <span style="color:var(--green)">${fmt(totalAssets)}</span></span>
        ${liabilities.length ? `<span>Liabilities: <span style="color:var(--red)">-${fmt(totalLiabilities)}</span></span>` : ''}
      </div>
    </div>
    ${Object.keys(byArea).length > 1 ? `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:10px">By area</div>
      ${Object.entries(byArea).map(([name, bal]) => {
        const pct = Math.round(bal / totalAssets * 100);
        return `<div style="margin-bottom:6px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:2px">
            <span>${name}</span><span style="color:var(--text)">${fmt(bal)}</span>
          </div>
          <div style="height:4px;background:var(--bg3);border-radius:2px">
            <div style="height:4px;width:${pct}%;background:var(--accent);border-radius:2px"></div>
          </div>
        </div>`;
      }).join('')}
    </div>` : ''}`;

  const calLabel = calPanel.querySelector('.dash-section-label');
  if (calLabel) calPanel.insertBefore(wrapper, calLabel.parentElement || calLabel);
  else calPanel.prepend(wrapper);
}

function renderCreditCardSummaryWidget(calPanel, ccAccounts, areaId) {
  const fmt = n => '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  const totalBal = ccAccounts.reduce((s, r) => s + (Number(r.fields.balance) || 0), 0);
  const totalLimit = ccAccounts.reduce((s, r) => s + (Number(r.fields.creditLimit) || 0), 0);
  const utilPct = totalLimit > 0 ? Math.min(100, Math.round(totalBal / totalLimit * 100)) : null;
  const utilColor = utilPct === null ? 'var(--muted)' : utilPct >= 30 ? (utilPct >= 50 ? 'var(--red)' : '#f0b429') : 'var(--green)';

  const wrapper = document.createElement('div');
  wrapper.id = 'area-cc-summary-widget';
  wrapper.style.cssText = 'margin-bottom:16px';
  wrapper.innerHTML = `
    <div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;cursor:default" oncontextmenu="areaWidgetCtxMenu(event,'${areaId}','credit-cards')">Credit cards</div>
      <div style="font-size:20px;font-weight:700;color:var(--red)">-${fmt(totalBal)}</div>
      ${utilPct !== null ? `<div style="margin-top:8px">
        <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px">
          <span>Overall utilization</span><span style="color:${utilColor};font-weight:600">${utilPct}%</span>
        </div>
        <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${utilPct}%;background:${utilColor};border-radius:3px"></div>
        </div>
      </div>` : ''}
      <div style="margin-top:10px">
        ${ccAccounts.map(r => {
          const bal = Number(r.fields.balance) || 0;
          const lim = Number(r.fields.creditLimit) || 0;
          const pct = lim > 0 ? Math.min(100, Math.round(bal / lim * 100)) : null;
          const col = pct === null ? 'var(--muted)' : pct >= 30 ? (pct >= 50 ? 'var(--red)' : '#f0b429') : 'var(--green)';
          return `<div style="margin-bottom:8px;cursor:pointer" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text2);margin-bottom:2px">
              <span>${r.title}</span>
              <span style="color:var(--text)">${fmt(bal)}${lim ? ` / ${fmt(lim)}` : ''}</span>
            </div>
            ${pct !== null ? `<div style="height:4px;background:var(--bg3);border-radius:2px">
              <div style="height:4px;width:${pct}%;background:${col};border-radius:2px"></div>
            </div>` : ''}
            ${r.fields.dueDate ? `<div style="font-size:10px;color:var(--muted);margin-top:2px">Due: ${r.fields.dueDate}</div>` : ''}
          </div>`;
        }).join('')}
      </div>
    </div>`;

  const calLabel = calPanel.querySelector('.dash-section-label');
  if (calLabel) calPanel.insertBefore(wrapper, calLabel.parentElement || calLabel);
  else calPanel.prepend(wrapper);
}

function renderAreaCCDetailsWidget(calPanel, accounts, areaId) {
  const ccAccts = accounts.filter(r => r.fields.accountType === 'Credit Card');
  if (!ccAccts.length) return;
  const div = document.createElement('div');
  div.id = 'area-cc-details-widget';
  div.className = 'dash-widget';
  let rows = ccAccts.map(r => {
    const balance = parseFloat(r.fields.balance) || 0;
    const limit = parseFloat(r.fields.creditLimit) || 0;
    const util = limit ? Math.round(balance / limit * 100) : 0;
    const utilColor = util >= 80 ? '#e74c3c' : util >= 50 ? '#e67e22' : '#2ecc71';
    const minPay = r.fields.minPayment ? `$${parseFloat(r.fields.minPayment).toFixed(2)}` : '—';
    const due = r.fields.dueDate || '—';
    const apr = r.fields.apr ? `${r.fields.apr}%` : '—';
    return `<div class="area-cc-row" style="padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openRecord('${r.id}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-weight:500">${r.name}</span>
        <span style="font-size:12px;color:var(--text-muted)">APR ${apr}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span>$${balance.toLocaleString()} / $${limit.toLocaleString()}</span>
        <span style="color:var(--text-muted)">Due ${due} · Min ${minPay}</span>
      </div>
      <div style="background:var(--border);border-radius:4px;height:6px">
        <div style="width:${Math.min(util,100)}%;background:${utilColor};border-radius:4px;height:6px"></div>
      </div>
      <div style="font-size:11px;color:${utilColor};margin-top:2px">${util}% utilization</div>
    </div>`;
  }).join('');
  div.innerHTML = `<div class="dash-widget-label" oncontextmenu="areaWidgetCtxMenu(event,'${areaId}','cc-details')">💳 Card details</div>${rows}`;
  calPanel.appendChild(div);
}

function renderAreaHistoryWidget(calPanel, accounts, areaId) {
  const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const div = document.createElement('div');
  div.id = 'area-history-widget';
  div.className = 'dash-widget';
  const rows = accounts.map(r => {
    const hist = (r.fields.history||[]).slice().sort((a,b)=>b.month.localeCompare(a.month)).slice(0,3);
    if (!hist.length) return `<div style="padding:4px 0;font-size:12px;color:var(--text-muted)">${r.name}: no history</div>`;
    const latest = hist[0];
    const bal = Number(latest.endBalance)||0;
    return `<div style="padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openRecord('${r.id}')">
      <div style="display:flex;justify-content:space-between">
        <span style="font-weight:500;font-size:13px">${r.name}</span>
        <span style="font-weight:600">${fmt(bal)}</span>
      </div>
      <div style="font-size:11px;color:var(--text-muted)">${latest.month} · ${hist.length} months tracked</div>
    </div>`;
  }).join('');
  div.innerHTML = `<div class="dash-widget-label" oncontextmenu="areaWidgetCtxMenu(event,'${areaId}','history')">📊 Monthly history</div>${rows}`;
  calPanel.appendChild(div);
}

function renderAreaBalanceChartWidget(calPanel, accounts, areaId) {
  const div = document.createElement('div');
  div.id = 'area-balance-chart-widget';
  div.className = 'dash-widget';
  const rows = accounts.map(r => {
    const hist = (r.fields.history||[]).slice().sort((a,b)=>a.month.localeCompare(b.month));
    if (!hist.length) return '';
    const max = Math.max(...hist.map(h=>Number(h.endBalance)||0));
    const bars = hist.slice(-6).map(h => {
      const val = Number(h.endBalance)||0;
      const pct = max ? Math.round(val/max*100) : 0;
      return `<div title="${h.month}: $${val.toLocaleString()}" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="width:100%;background:var(--border);border-radius:2px;height:40px;display:flex;align-items:flex-end">
          <div style="width:100%;height:${pct}%;background:var(--accent);border-radius:2px;min-height:2px"></div>
        </div>
        <div style="font-size:9px;color:var(--text-muted);transform:rotate(-45deg);white-space:nowrap">${h.month.slice(5)}</div>
      </div>`;
    }).join('');
    return `<div style="padding:6px 0;border-bottom:1px solid var(--border);cursor:pointer" onclick="openRecord('${r.id}')">
      <div style="font-weight:500;font-size:12px;margin-bottom:6px">${r.name}</div>
      <div style="display:flex;gap:2px;align-items:flex-end;height:60px">${bars}</div>
    </div>`;
  }).filter(Boolean).join('');
  div.innerHTML = `<div class="dash-widget-label" oncontextmenu="areaWidgetCtxMenu(event,'${areaId}','balance-chart')">📈 Balance chart</div>${rows || '<div style="font-size:12px;color:var(--text-muted)">No history data</div>'}`;
  calPanel.appendChild(div);
}

function renderAreaIRAWidget(calPanel, accounts) {
  const iraAccts = accounts.filter(r => ['Roth IRA','Traditional IRA'].includes(r.fields.accountType));
  if (!iraAccts.length) return;
  const yr = new Date().getFullYear();
  const wrapper = document.createElement('div');
  wrapper.id = 'area-ira-widget';
  wrapper.style.cssText = 'margin-bottom:10px';
  wrapper.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">IRA Contributions ${yr}</div>
    ${iraAccts.map(r => {
      const lim = (r.fields.iraLimits || {})[yr] || 7000;
      const contrib = Number((r.fields.annualContribs || {})[yr]) || 0;
      const pct = Math.min(100, contrib / lim * 100);
      const done = contrib >= lim;
      const color = done ? 'var(--green)' : pct >= 75 ? '#f0b429' : 'var(--accent)';
      return `<div style="margin-bottom:8px;cursor:pointer" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--text)">${r.title}</span>
          <span style="color:${done?'var(--green)':'var(--muted)'}">${done?'✓':'$'+contrib.toLocaleString()+' / $'+lim.toLocaleString()}</span>
        </div>
        <div style="height:4px;background:var(--bg3);border-radius:2px"><div style="height:4px;width:${pct}%;background:${color};border-radius:2px"></div></div>
      </div>`;
    }).join('')}
  </div>`;
  calPanel.appendChild(wrapper);
}

function renderArea401kWidget(calPanel, accounts) {
  const accts = accounts.filter(r => r.fields.accountType === '401k');
  if (!accts.length) return;
  const yr = new Date().getFullYear();
  const wrapper = document.createElement('div');
  wrapper.id = 'area-401k-widget';
  wrapper.style.cssText = 'margin-bottom:10px';
  wrapper.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">401k Contributions ${yr}</div>
    ${accts.map(r => {
      const lim = (r.fields.k401Limits || {})[yr] || 23500;
      const contrib = Number((r.fields.annualContribs || {})[yr]) || 0;
      const pct = Math.min(100, contrib / lim * 100);
      const done = contrib >= lim;
      const color = done ? 'var(--green)' : pct >= 75 ? '#f0b429' : 'var(--accent)';
      return `<div style="margin-bottom:8px;cursor:pointer" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--text)">${r.title}</span>
          <span style="color:${done?'var(--green)':'var(--muted)'}">${done?'✓':'$'+contrib.toLocaleString()+' / $'+lim.toLocaleString()}</span>
        </div>
        <div style="height:4px;background:var(--bg3);border-radius:2px"><div style="height:4px;width:${pct}%;background:${color};border-radius:2px"></div></div>
      </div>`;
    }).join('')}
  </div>`;
  calPanel.appendChild(wrapper);
}

function renderAreaHSAWidget(calPanel, accounts) {
  const accts = accounts.filter(r => r.fields.accountType === 'HSA');
  if (!accts.length) return;
  const yr = new Date().getFullYear();
  const wrapper = document.createElement('div');
  wrapper.id = 'area-hsa-widget';
  wrapper.style.cssText = 'margin-bottom:10px';
  wrapper.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">HSA Contributions ${yr}</div>
    ${accts.map(r => {
      const coverage = r.fields.hsaCoverage === 'family' ? 'family' : 'individual';
      const lim = (r.fields.hsaLimits || {})[yr] || (coverage === 'family' ? 8550 : 4300);
      const contrib = Number((r.fields.annualContribs || {})[yr]) || 0;
      const pct = Math.min(100, contrib / lim * 100);
      const done = contrib >= lim;
      const color = done ? 'var(--green)' : pct >= 75 ? '#f0b429' : 'var(--accent)';
      return `<div style="margin-bottom:8px;cursor:pointer" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:3px">
          <span style="color:var(--text)">${r.title}</span>
          <span style="color:${done?'var(--green)':'var(--muted)'}">${done?'✓':'$'+contrib.toLocaleString()+' / $'+lim.toLocaleString()}</span>
        </div>
        <div style="height:4px;background:var(--bg3);border-radius:2px"><div style="height:4px;width:${pct}%;background:${color};border-radius:2px"></div></div>
      </div>`;
    }).join('')}
  </div>`;
  calPanel.appendChild(wrapper);
}

function renderAreaTaxDocsWidget(calPanel, accounts) {
  const yr = new Date().getFullYear() - 1;
  const allDocs = accounts.flatMap(r => (r.fields.taxDocs || []).map(d => ({ ...d, acctTitle: r.title, areaId: r.areaId, recordId: r.id })));
  const recent = allDocs.filter(d => d.year >= yr);
  if (!recent.length) return;
  const wrapper = document.createElement('div');
  wrapper.id = 'area-tax-docs-widget';
  wrapper.style.cssText = 'margin-bottom:10px';
  wrapper.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:14px">
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px">Tax Documents</div>
    ${recent.map(d => `<div style="display:flex;justify-content:space-between;font-size:11px;padding:4px 0;border-top:1px solid var(--border1);cursor:pointer"
        data-record-link data-area-id="${d.areaId}" data-record-id="${d.recordId}">
      <span><span style="color:var(--text)">${d.form}</span> <span style="color:var(--muted)">${d.acctTitle}</span></span>
      <span style="color:${d.status==='filed'?'var(--accent)':d.status==='received'?'var(--green)':'var(--muted)'}">${d.status||'pending'}</span>
    </div>`).join('')}
  </div>`;
  calPanel.appendChild(wrapper);
}
