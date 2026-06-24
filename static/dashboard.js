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
}

async function showDashWidget(id) {
  const p = getDashPrefs();
  p.hidden = p.hidden.filter(x => x !== id);
  await saveDashPrefs(p);
  renderDashboard();
}

let _dashDragSrc = null;

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
    wrap.innerHTML = `
      <div class="dash-section-drag-header" title="Drag to reorder">
        <span class="drag-grip">&#8942;</span>
        <span class="dash-section-label" style="margin:0;flex:1">${widget.label}</span>
        ${actionBtn}
        <button class="dash-section-hide-btn" onclick="hideDashWidget('${id}')" title="Hide section">&#x2715;</button>
      </div>
      <div class="dash-section-body">${dashSectionHTML(id)}</div>`;

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

function renderAttentionFilters() {
  const el = document.getElementById('attention-filters');
  if (!el) return;
  const filters = [
    ['triage', 'Triage', 'af-triage'],
    ['red', 'Red', 'af-red'],
    ['yellow', 'Yellow', 'af-yellow'],
    ['blue', 'Blue', 'af-blue'],
    ['purple', 'Purple', 'af-purple'],
    ['none', 'None', 'af-none'],
  ];
  el.innerHTML = filters.map(([key, label, cls]) => `<button class="attention-filter${attentionFilter===key ? ' active ' + cls : ''}" onclick="setAttentionFilter('${key}')">${label}</button>`).join('');
}

function setAttentionFilter(filter) {
  attentionFilter = filter;
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
    .filter(r => r.type === 'event' && r.fields?.date === todayStr)
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
    .filter(r => r.type === 'event' && r.status !== 'archived' && r.status !== 'completed' && r.fields?.date)
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
  DB.records.filter(r => r.urgency && r.urgency !== 'none' && r.status !== 'archived' && r.status !== 'completed').forEach(r => {
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
    DB.records.filter(r => (!r.urgency || r.urgency === 'none') && r.status !== 'archived' && r.status !== 'completed').forEach(r => {
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
  document.getElementById('area-view-title').textContent = area.title;
  document.getElementById('area-view-dot').style.background = area.color;
  document.getElementById('topbar-actions').innerHTML = '';
  const btnEl = document.getElementById('area-action-btns');
  const children = DB.areas.filter(a => a.parentId === areaId).sort((a,b) => (a.order_??0)-(b.order_??0));

  // If this area has sub-areas, show overview cards instead of records
  if (children.length > 0) {
    if (btnEl) {
      btnEl.innerHTML = '';
      const b = document.createElement('button');
      b.className = 'btn btn-p btn-sm';
      b.textContent = '+ Add record';
      b.onclick = () => promptAddRecord(null, areaId);
      btnEl.appendChild(b);
      const b2 = document.createElement('button');
      b2.className = 'btn btn-sm btn-p'; b2.style.marginLeft = '6px';
      b2.textContent = '+ Add sub-area';
      b2.onclick = () => promptAddArea(areaId);
      btnEl.appendChild(b2);
      const b3 = document.createElement('button');
      b3.className = 'btn btn-sm'; b3.style.marginLeft = '6px';
      b3.textContent = 'Save as template';
      b3.onclick = () => promptSaveAsTemplate(area);
      btnEl.appendChild(b3);
    }
    const el = document.getElementById('area-view-records');
    el.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:4px">${
      children.map(child => {
        const recs = DB.records.filter(r => r.areaId === child.id);
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
      b.className = 'btn btn-p btn-sm';
      b.textContent = '+ Add record';
      b.onclick = () => promptAddRecord();
      btnEl.appendChild(b);
      const b2 = document.createElement('button');
      b2.className = 'btn btn-sm btn-p'; b2.style.marginLeft='6px';
      b2.textContent = '+ Add sub-area';
      b2.onclick = () => promptAddArea(areaId);
      btnEl.appendChild(b2);
      const b3 = document.createElement('button');
      b3.className = 'btn btn-sm'; b3.style.marginLeft='6px';
      b3.textContent = 'Save as template';
      b3.onclick = () => promptSaveAsTemplate(area);
      btnEl.appendChild(b3);
    }
  }
  const records = DB.records.filter(r => r.areaId === areaId);
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

  // Render area calendar filtered to this area
  const calEl = document.getElementById('area-cal');
  if (calEl) {
    window._calAreaFilter = areaId;
    renderAreaCalWidget('area-cal', areaId);
  }

  // Add contacts button if area has contacts
  const areaContacts = DB.records.filter(r => r.areaId === areaId && r.type === 'contact');
  const calPanel = document.querySelector('.area-cal-panel');
  if (calPanel) {
    const existing = document.getElementById('area-contacts-btn');
    if (existing) existing.remove();
    if (areaContacts.length) {
      const btn = document.createElement('div');
      btn.id = 'area-contacts-btn';
      btn.style.cssText = 'margin-top:10px';
      btn.innerHTML = `<button class="btn" style="width:100%;justify-content:center" onclick="currentFilter='contacts';renderAreaView('${areaId}')">
        👤 Contacts (${areaContacts.length})
      </button>`;
      calPanel.appendChild(btn);
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
      <span class="group-toggle ${isOpen?'open':''}">â–¶</span>
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
  let cardIcon = `<div class="record-card-icon">${icons[r.type] || 'â€¢'}</div>`;
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

