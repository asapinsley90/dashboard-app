// â"€â"€ RECORD VIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
// ── WIDGET LIBRARY ─────────────────────────────────────────────────────────────
// Single source of truth for all available widgets.
// contexts: 'record' = record widget picker, 'subarea' = area sidebar widget picker
// category: used for grouping in the picker modal
// defaultOn: used only when building defaults for RECORD_WIDGET_DEFS (not enforced by library itself)
const WIDGET_LIBRARY = [
  // Finance ───────────────────────────────────────────────────────────────────
  { id: 'account-details', label: 'Account details',   icon: '🏦', category: 'Finance', contexts: ['record']            },
  { id: 'cc-details',      label: 'Card details',       icon: '💳', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'history',         label: 'Monthly history',    icon: '📊', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'balance-chart',   label: 'Balance chart',      icon: '📈', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'ira-progress',    label: 'IRA contributions',  icon: '🏛', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: '401k-progress',   label: '401k contributions', icon: '💵', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'hsa-progress',    label: 'HSA contributions',  icon: '🏥', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'tax-docs',        label: 'Tax documents',      icon: '📄', category: 'Finance', contexts: ['record', 'subarea'] },
  { id: 'net-worth',       label: 'Net worth',          icon: '💰', category: 'Finance', contexts: ['area']              },
  { id: 'credit-cards',    label: 'Credit cards',       icon: '🃏', category: 'Finance', contexts: ['area']              },
  { id: 'portfolio',       label: 'Portfolio chart',    icon: '📉', category: 'Finance', contexts: ['area', 'subarea']   },
  { id: 'by-account',      label: 'By account',         icon: '📊', category: 'Finance', contexts: ['area', 'subarea']   },
  // General ───────────────────────────────────────────────────────────────────
  { id: 'notes',           label: 'Notes',              icon: '📝', category: 'General', contexts: ['record', 'subarea'] },
  { id: 'activity',        label: 'Activity',           icon: '⏱',  category: 'General', contexts: ['record']            },
  { id: 'timeline',        label: 'Timeline',           icon: '⏱',  category: 'General', contexts: ['record']            },
  { id: 'contacts',        label: 'Contacts',           icon: '👥', category: 'General', contexts: ['record', 'subarea'] },
  { id: 'documents',       label: 'Documents',          icon: '📎', category: 'General', contexts: ['record', 'subarea'] },
  { id: 'calendar',        label: 'Calendar',           icon: '📅', category: 'General', contexts: ['area', 'subarea']   },
  { id: 'import',          label: 'Import',             icon: '⬆',  category: 'General', contexts: ['record']            },
  { id: 'paste',           label: 'Paste',              icon: '✏️', category: 'General', contexts: ['record']            },
  // Record-specific (rendered only when record type matches) ──────────────────
  { id: 'contact-info',    label: 'Contact info',       icon: '👤', category: 'General', contexts: ['record']            },
  { id: 'company-details', label: 'Company details',    icon: '🏢', category: 'General', contexts: ['record']            },
  { id: 'event-details',   label: 'Event details',      icon: '📅', category: 'General', contexts: ['record']            },
  { id: 'applications',    label: 'Applications',       icon: '💼', category: 'General', contexts: ['record']            },
  { id: 'links',           label: 'Linked records',     icon: '🔗', category: 'General', contexts: ['record']            },
  { id: 'fields',          label: 'Fields',             icon: '📋', category: 'General', contexts: ['record']            },
  { id: 'status-urgency',  label: 'Status & urgency',   icon: '🎯', category: 'General', contexts: ['record']            },
];

// Per-type defaults (used when a record has no saved _widgets).
// Job is excluded from the library and keeps its own defs.
const RECORD_WIDGET_DEFS = {
  account: [
    { id: 'account-details', defaultOn: true  },
    { id: 'cc-details',      defaultOn: true  },
    { id: 'history',         defaultOn: true  },
    { id: 'balance-chart',   defaultOn: true  },
    { id: 'ira-progress',    defaultOn: true  },
    { id: '401k-progress',   defaultOn: true  },
    { id: 'hsa-progress',    defaultOn: true  },
    { id: 'tax-docs',        defaultOn: true  },
    { id: 'import',          defaultOn: true  },
    { id: 'activity',        defaultOn: true  },
    { id: 'notes',           defaultOn: true  },
    { id: 'contacts',        defaultOn: false },
    { id: 'documents',       defaultOn: false },
    { id: 'paste',           defaultOn: false },
  ],
  job: [
    { id: 'role-details',    label: 'Role details',    icon: '💼', defaultOn: true  },
    { id: 'interviews',      label: 'Interviews',      icon: '🗓', defaultOn: true  },
    { id: 'job-description', label: 'Job description', icon: '📄', defaultOn: true  },
    { id: 'status-urgency',  label: 'Status & urgency',icon: '🎯', defaultOn: true  },
    { id: 'contacts',        label: 'Contacts',        icon: '👤', defaultOn: true  },
    { id: 'documents',       label: 'Documents',       icon: '📎', defaultOn: true  },
    { id: 'timeline',        label: 'Timeline',        icon: '⏱', defaultOn: true  },
    { id: 'notes',           label: 'Notes',           icon: '📝', defaultOn: true  },
  ],
  contact: [
    { id: 'contact-info', defaultOn: true  },
    { id: 'notes',        defaultOn: true  },
    { id: 'timeline',     defaultOn: true  },
    { id: 'documents',    defaultOn: false },
  ],
  company: [
    { id: 'company-details', defaultOn: true  },
    { id: 'contacts',        defaultOn: true  },
    { id: 'applications',    defaultOn: true  },
    { id: 'notes',           defaultOn: true  },
    { id: 'timeline',        defaultOn: true  },
    { id: 'documents',       defaultOn: false },
  ],
  event: [
    { id: 'event-details', defaultOn: true },
    { id: 'links',         defaultOn: true },
    { id: 'timeline',      defaultOn: true },
  ],
  _default: [
    { id: 'fields',        defaultOn: true  },
    { id: 'status-urgency',defaultOn: true  },
    { id: 'contacts',      defaultOn: true  },
    { id: 'notes',         defaultOn: true  },
    { id: 'timeline',      defaultOn: true  },
    { id: 'documents',     defaultOn: false },
  ],
};

// ── DEFAULT FIELD SCHEMAS for built-in types ──────────────────────────────────
const FIELD_LIBRARY = [
  // Finance — universal
  { key: 'balance',              label: 'Balance',                  type: 'text', category: 'Finance' },
  { key: 'creditLimit',          label: 'Credit limit',             type: 'text', category: 'Finance' },
  { key: 'statementBalance',     label: 'Previous stmt balance',    type: 'text', category: 'Finance' },
  { key: 'purchases',            label: 'Purchases this period',    type: 'text', category: 'Finance' },
  { key: 'payments',             label: 'Payments this period',     type: 'text', category: 'Finance' },
  { key: 'interestCharged',      label: 'Interest charged',         type: 'text', category: 'Finance' },
  { key: 'minPayment',           label: 'Min payment',              type: 'text', category: 'Finance' },
  { key: 'apr',                  label: 'Purchase APR',             type: 'text', category: 'Finance' },
  { key: 'cashAdvanceApr',       label: 'Cash advance APR',         type: 'text', category: 'Finance' },
  { key: 'annualFee',            label: 'Annual fee',               type: 'text', category: 'Finance' },
  { key: 'employerMatch',        label: 'Employer match',           type: 'text', category: 'Finance' },
  { key: 'hsaCoverage',          label: 'HSA coverage',             type: 'text', category: 'Finance' },
  // Billing cycle
  { key: 'statementOpen',        label: 'Statement opens (day)',    type: 'text', category: 'Billing' },
  { key: 'statementClose',       label: 'Statement closes (day)',   type: 'text', category: 'Billing' },
  { key: 'autopayDate',          label: 'Autopay date (day)',       type: 'text', category: 'Billing' },
  { key: 'autopayType',          label: 'Autopay amount',           type: 'text', category: 'Billing' },
  { key: 'autopayFixed',         label: 'Autopay fixed amount',     type: 'text', category: 'Billing' },
  // Rewards
  { key: 'rewardsType',          label: 'Rewards type',             type: 'text', category: 'Rewards' },
  { key: 'rewardsRate',          label: 'Rewards rate',             type: 'text', category: 'Rewards' },
  { key: 'pointsBalance',        label: 'Points balance',           type: 'text', category: 'Rewards' },
  // Account
  { key: 'institution',          label: 'Institution',              type: 'text', category: 'Account' },
  { key: 'accountType',          label: 'Account type',             type: 'text', category: 'Account' },
  { key: 'owner',                label: 'Owner',                    type: 'text', category: 'Account' },
  { key: 'last4',                label: 'Last 4',                   type: 'text', category: 'Account' },
  { key: 'balanceDate',          label: 'Balance date',             type: 'date', category: 'Account' },
  // Contact
  { key: 'role',                 label: 'Role',                     type: 'text',     category: 'Contact' },
  { key: 'email',                label: 'Email',                    type: 'email',    category: 'Contact' },
  { key: 'phone',                label: 'Phone',                    type: 'tel',      category: 'Contact' },
  { key: 'linkedin',             label: 'LinkedIn',                 type: 'url',      category: 'Contact' },
  // Events
  { key: 'date',                 label: 'Date',                     type: 'date',     category: 'Events' },
  { key: 'time',                 label: 'Start time',               type: 'time',     category: 'Events' },
  { key: 'endTime',              label: 'End time',                 type: 'time',     category: 'Events' },
  // General
  { key: 'notes',                label: 'Notes',                    type: 'textarea', category: 'General' },
  { key: 'location',             label: 'Location',                 type: 'text',     category: 'General' },
  { key: 'website',              label: 'Website',                  type: 'url',      category: 'General' },
  { key: 'industry',             label: 'Industry',                 type: 'text',     category: 'General' },
  { key: 'link',                 label: 'Link',                     type: 'url',      category: 'General' },
];

const DEFAULT_FIELD_SCHEMAS = {
  contact: { name: 'Contact', icon: '👤', fields: [
    { key: 'role',     label: 'Role',     type: 'text',         order: 1 },
    { key: 'company',  label: 'Company',  type: 'company-link', order: 2 },
    { key: 'email',    label: 'Email',    type: 'email',        order: 3 },
    { key: 'phone',    label: 'Phone',    type: 'tel',          order: 4 },
    { key: 'linkedin', label: 'LinkedIn', type: 'url',          order: 5 },
  ]},
  account: { name: 'Account', icon: '🏦', fields: [
    { key: 'institution',  label: 'Institution',   type: 'text', order: 1 },
    { key: 'accountType',  label: 'Account type',  type: 'text', order: 2 },
    { key: 'owner',        label: 'Owner',         type: 'text', order: 3 },
    { key: 'last4',        label: 'Last 4',        type: 'text', order: 4 },
    { key: 'balance',      label: 'Balance',       type: 'text', order: 5 },
    { key: 'balanceDate',  label: 'Balance date',  type: 'date', order: 6 },
  ]},
  company: { name: 'Company', icon: '🏢', fields: [
    { key: 'industry', label: 'Industry', type: 'text',     order: 1 },
    { key: 'website',  label: 'Website',  type: 'url',      order: 2 },
    { key: 'location', label: 'Location', type: 'text',     order: 3 },
    { key: 'notes',    label: 'Notes',    type: 'textarea', order: 4 },
  ]},
  event: { name: 'Event', icon: '📅', fields: [
    { key: 'date',     label: 'Date',       type: 'date',     order: 1 },
    { key: 'time',     label: 'Start time', type: 'time',     order: 2 },
    { key: 'endTime',  label: 'End time',   type: 'time',     order: 3 },
    { key: 'location', label: 'Location',   type: 'text',     order: 4 },
    { key: 'link',     label: 'Link',       type: 'url',      order: 5 },
    { key: 'notes',    label: 'Notes',      type: 'textarea', order: 6 },
  ]},
};

function getEffectiveSchema(typeId) {
  return TYPE_SCHEMAS.find(s => s.id === typeId)
    || (DEFAULT_FIELD_SCHEMAS[typeId] ? { id: typeId, ...DEFAULT_FIELD_SCHEMAS[typeId] } : null);
}

function renderFieldsFromSchema(r) {
  const schema = getEffectiveSchema(r.type);
  if (!schema?.fields?.length) return '';
  return [...schema.fields]
    .filter(f => f.type !== 'company-link')
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(f => editableField(r, f.key, f.label, f.type))
    .join('');
}

function getWidgetDefs(r) {
  const defaults = RECORD_WIDGET_DEFS[r.type] || RECORD_WIDGET_DEFS._default;
  // Merge defaults with WIDGET_LIBRARY to get label/icon (job keeps its own full defs)
  if (r.type === 'job') return defaults;
  return defaults.map(d => {
    const lib = WIDGET_LIBRARY.find(w => w.id === d.id);
    return lib ? { ...lib, ...d } : d;
  });
}

function getActiveWidgets(r) {
  if (r.fields._widgets) return new Set(r.fields._widgets);
  return new Set(getWidgetDefs(r).filter(d => d.defaultOn).map(d => d.id));
}

function widgetCard(id, html, r) {
  return getActiveWidgets(r).has(id) ? html : '';
}

function openWidgetsModal(recordId) {
  const r = getRecord(recordId);
  if (!r) return;
  tourNotify('widget-opened');
  const active = getActiveWidgets(r);

  // Job type uses its own defs (excluded from library)
  if (r.type === 'job') {
    const defs = getWidgetDefs(r);
    openModal('Widgets', `
      <p style="font-size:13px;color:var(--muted);margin:0 0 14px">Active widgets appear in this record.</p>
      <div class="widget-toggle-grid">${defs.map(d => `
        <div class="widget-toggle${active.has(d.id) ? ' active' : ''}" onclick="toggleWidgetActive('${recordId}','${d.id}',this)">
          <span style="font-size:32px">${d.icon}</span>
          <span class="widget-toggle-label">${d.label}</span>
          <span class="widget-toggle-dot"></span>
        </div>`).join('')}
      </div>
    `, [{ label: 'Done', onclick: closeModal }]);
    return;
  }

  // All other types: use WIDGET_LIBRARY grouped by category, filtered to 'record' context.
  // Finance widgets are shown only for account records; General widgets shown for all.
  const libDefs = WIDGET_LIBRARY.filter(w =>
    w.contexts.includes('record') &&
    (w.category !== 'Finance' || r.type === 'account')
  );
  const categories = [...new Set(libDefs.map(w => w.category))];
  const grouped = categories.map(cat => {
    const widgets = libDefs.filter(w => w.category === cat);
    const uid = 'wg-' + cat.toLowerCase();
    return `<div style="margin-bottom:4px">
      <div onclick="const b=document.getElementById('${uid}');const open=b.style.display!=='none';b.style.display=open?'none':'block';this.querySelector('.chev').textContent=open?'▶':'▼';"
        style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 4px;border-radius:6px;user-select:none" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
        <span class="chev" style="font-size:10px;color:var(--muted)">▶</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em">${cat}</span>
      </div>
      <div id="${uid}" style="display:none">
        <div class="widget-toggle-grid" style="margin-bottom:8px">${widgets.map(d => `
          <div class="widget-toggle${active.has(d.id) ? ' active' : ''}" onclick="toggleWidgetActive('${recordId}','${d.id}',this)">
            <span style="font-size:28px">${d.icon}</span>
            <span class="widget-toggle-label">${d.label}</span>
            <span class="widget-toggle-dot"></span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }).join('');

  const activeWidgetPills = libDefs.filter(d => active.has(d.id));
  const widgetActiveSummary = activeWidgetPills.length
    ? `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border1)">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Active</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${activeWidgetPills.map(d =>
          `<span style="background:var(--accent);color:#fff;border-radius:20px;padding:3px 10px;font-size:12px">${d.icon} ${d.label}</span>`
        ).join('')}</div>
      </div>`
    : '';

  openModal('Widget library', `
    <div style="max-height:420px;overflow-y:auto;padding-right:4px">
      ${widgetActiveSummary}
      ${grouped}
    </div>
  `, [{ label: 'Done', onclick: closeModal }]);
}

function toggleWidgetActive(recordId, widgetId, el) {
  const r = getRecord(recordId);
  if (!r) return;
  const active = getActiveWidgets(r);
  if (active.has(widgetId)) active.delete(widgetId);
  else active.add(widgetId);
  r.fields._widgets = [...active];
  el.classList.toggle('active');
  api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  tourNotify('widget-toggled');
  renderRecordView(r.id);
}

function getWidgetLabel(r, widgetId, defaultLabel) {
  return r.fields._widgetLabels?.[widgetId] || defaultLabel;
}

function openWidgetTitleMenu(e, recordId, widgetId, defaultLabel) {
  e.preventDefault();
  e.stopPropagation();
  document.querySelectorAll('.widget-ctx-menu').forEach(m => m.remove());
  const r = getRecord(recordId);
  if (!r) return;
  const def = getWidgetDefs(r).find(d => d.id === widgetId);
  const currentLabel = getWidgetLabel(r, widgetId, defaultLabel || def?.label || widgetId);
  const menu = document.createElement('div');
  menu.className = 'ctx-menu widget-ctx-menu';
  menu.style.cssText = `left:${Math.min(e.clientX, window.innerWidth - 180)}px;top:${Math.min(e.clientY, window.innerHeight - 120)}px`;
  const h = document.createElement('div'); h.className = 'ctx-header';
  h.textContent = (def?.icon || '') + ' ' + currentLabel;

  const rename = document.createElement('div'); rename.className = 'ctx-item';
  rename.textContent = 'Rename widget';
  rename.onclick = () => {
    menu.remove();
    const val = prompt('Rename widget:', currentLabel);
    if (!val || !val.trim()) return;
    if (!r.fields._widgetLabels) r.fields._widgetLabels = {};
    r.fields._widgetLabels[widgetId] = val.trim();
    api('PUT', `/api/records/${recordId}`, { fields: r.fields });
    tourNotify('widget-hidden');
    renderRecordView(recordId);
  };

  const hide = document.createElement('div'); hide.className = 'ctx-item';
  hide.textContent = 'Hide widget';
  hide.onclick = () => {
    const active = getActiveWidgets(r);
    active.delete(widgetId);
    r.fields._widgets = [...active];
    api('PUT', `/api/records/${recordId}`, { fields: r.fields });
    tourNotify('widget-hidden');
    menu.remove();
    renderRecordView(recordId);
  };
  menu.appendChild(h); menu.appendChild(rename); menu.appendChild(hide);
  document.body.appendChild(menu);
  const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
  setTimeout(() => document.addEventListener('mousedown', close), 0);
}

function renderRecordView(recordId) {
  const r = getRecord(recordId);
  if (!r) return;
  const area = getArea(r.areaId);
  const isCompleted = r.status === 'completed';
  const isArchived = r.status === 'archived';
  const urgency = r.urgency || 'none';
  const ul = getUrgencyLabels?.() || {};
  const urgencyLabels = { none: '⚑ Flag', flagged: `🟡 ${ul.flagged||'Follow Up'}`, priority: `🔵 ${ul.priority||'Priority'}`, urgent: `🔴 ${ul.urgent||'Urgent'}` };
  const urgencyNext = { none: 'flagged', flagged: 'priority', priority: 'urgent', urgent: 'none' };
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-sm" onclick="navigate('area','${r.areaId}')">← Back</button>
    <button class="btn btn-sm" onclick="copyRecordContext('${r.id}')" title="Export record context">📋 Export</button>
    <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')">Delete</button>`;

  const el = document.getElementById('record-view-content');
  if (r.type === 'job') {
    el.innerHTML = renderJobRecord(r, area);
  } else {
    el.innerHTML = renderSchemaRecord(r, area);
    if (r.type === 'account') {
      const chartHistory = (r.fields.history || []).slice().sort((a,b) => a.month.localeCompare(b.month));
      const _doCharts = () => renderAccountCharts(`acct-charts-${r.id}`, chartHistory);
      requestAnimationFrame(() => { _doCharts(); setTimeout(_doCharts, 100); });
    }
  }
}

function renderJobRecord(r, area) {
  const contacts = (r.contacts || []).map(id => getRecord(id)).filter(Boolean);
  const linkedEvents = (r.links || []).map(id => getRecord(id)).filter(Boolean).filter(e => e.type === 'event');
  const statusLabels = { applied: 'Applied', interviewing: 'Interviewing', awaiting: 'Awaiting', offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn', completed: 'Completed', archived: 'Archived' };
  const statusOrder = ['applied','interviewing','awaiting','offer','rejected','withdrawn','completed','archived'];

  return `<div class="record-view-header">
    <div class="record-view-icon">💼</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">
        ${(() => {
          const co = r.companyId ? DB.records.find(rec=>rec.id===r.companyId) : DB.records.find(rec=>rec.type==='company'&&rec.title===r.title);
          return co
            ? `<span class="doc-ref" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}" style="color:var(--text)">${r.title} <span style="color:var(--accent);font-size:16px">→</span></span>`
            : `<span>${r.title}</span>`;
        })()}
      </div>
      <div class="record-view-meta">
        <span>${r.fields.role || 'No role set'}</span>
        ${r.fields.salary ? `<span>${r.fields.salary}</span>` : ''}
        ${r.fields.location ? `<span>${r.fields.location}</span>` : ''}
        ${r.fields.appliedDate ? `<span>Applied ${formatDate(r.fields.appliedDate)}</span>` : ''}
      </div>
    </div>
    <div class="record-view-actions">
      ${statusBadge(r)}
      <button class="btn btn-sm" style="font-size:11px" onclick="openWidgetsModal('${r.id}')">⚡ Widgets</button>
      <button class="btn btn-sm btn-p" onclick="addInterview('${r.id}')">+ Interview</button>
    </div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      ${widgetCard('role-details', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','role-details')">${getWidgetLabel(r,'role-details','Role details')}</div>
        <div class="field-row">
          <div class="field-label">Company</div>
          <div class="field-value">
            ${(() => {
              const co = r.companyId ? DB.records.find(rec=>rec.id===r.companyId) : DB.records.find(rec=>rec.type==='company'&&rec.title===r.title);
              return co
                ? `<span class="doc-ref" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}" style="font-size:13px;font-weight:500;color:var(--accent)">${r.title} →</span>`
                : `<span style="font-size:13px">${r.title}</span>`;
            })()}
          </div>
        </div>
        ${editableField(r, 'role', 'Role')}
        ${editableField(r, 'salary', 'Salary')}
        ${editableField(r, 'location', 'Location')}
        ${editableField(r, 'source', 'Source')}
        ${editableField(r, 'appliedDate', 'Applied', 'date')}
        <div class="field-row">
          <div class="field-label">Posting URL</div>
          <div class="field-value">
            <div style="display:flex;gap:6px;align-items:center">
              <input class="field-edit" type="url" value="${r.fields.postingUrl||''}" placeholder="https://..." style="flex:1"
                id="posting-url-${r.id}"
                onblur="saveFieldText('${r.id}','postingUrl',this.value)"
                onchange="triggerScrape('${r.id}')">
              ${r.fields.postingUrl?`<a href="${r.fields.postingUrl}" target="_blank" style="color:var(--accent);font-size:12px;white-space:nowrap">View →</a>`:''}
            </div>
            <div id="scrape-panel-${r.id}" style="display:none;margin-top:8px"></div>
          </div>
        </div>

      </div>`, r)}
      ${widgetCard('interviews', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','interviews')">Interviews</div>
        ${(r.interviews || []).length ? r.interviews.map(i => `
          <div class="interview-item">
            <div class="interview-round">Round ${i.round}</div>
            <div class="interview-title">${i.interviewer || 'TBD'}</div>
            <div class="interview-meta">
              ${i.date ? formatDate(i.date) : ''} ${i.time ? '· ' + fmtTime(i.time) : ''} ${i.format ? '· ' + i.format : ''}
              ${i.location ? '<br>' + i.location : ''}
            </div>
            ${i.link ? `<a class="interview-link" href="${i.link}" target="_blank">Join meeting →</a>` : ''}
            ${i.notes ? `<div class="interview-meta" style="margin-top:6px">${i.notes}</div>` : ''}
          </div>`).join('') : '<div class="empty">No interviews recorded.</div>'}
      </div>`, r)}
      ${widgetCard('notes', renderNotesSection(r), r)}
      ${widgetCard('job-description', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','job-description')">Job description</div>
        <textarea class="field-edit" onblur="saveFieldText('${r.id}','jobDescription',this.value)" style="width:100%;min-height:80px" placeholder="Paste job description here...">${r.fields.jobDescription || ''}</textarea>
      </div>`, r)}
    </div>
    <div class="record-sidebar">
      ${widgetCard('status-urgency', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','status-urgency')">Status</div>
        <div class="status-widget">
          ${statusOrder.map(s => {
            const cur = r.status || 'active';
            return '<span class="status-pill'+(cur===s?' active s-active-'+s:'')+'" onclick="setRecordStatus(\''+r.id+'\',\''+s+'\')">'+statusLabels[s]+'</span>';
          }).join('')}
        </div>
      </div>
      <div class="section-card">
        <div class="section-title">Urgency</div>
        <div class="urgency-widget">
          ${['none','new','flagged','priority','urgent'].map(u => {
            const labels={none:'None',new:'🔵 New',flagged:'🟡 Flagged',priority:'🟣 Priority',urgent:'🔴 Urgent'};
            const cur=r.urgency||'none';
            return '<span class="urgency-pill'+(cur===u?' u-active-'+u:'')+'" onclick="setUrgency(\''+r.id+'\',\''+u+'\')">'+labels[u]+'</span>';
          }).join('')}
        </div>
      </div>`, r)}
      ${widgetCard('contacts', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','contacts')">Contacts</div>
        ${contacts.map(ct => `<div class="contact-chip" data-record-link data-area-id="${ct.areaId}" data-record-id="${ct.id}">
  <span>👤</span>
  <span class="contact-chip-name">${ct.title}</span>
  ${ct.fields.role ? `<span class="contact-chip-role">· ${ct.fields.role}</span>` : ''}
</div>`).join('')}
        <div style="margin-top:8px"><button class="btn btn-xs" onclick="linkContact('${r.id}')">+ Link contact</button></div>
      </div>`, r)}
      ${widgetCard('documents', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','documents')">Documents</div>
        ${renderJobDocSection(r, 'resume', 'Resume')}
        ${renderJobDocSection(r, 'coverLetter', 'Cover letter')}
        ${renderJobDocSection(r, 'other', 'Other')}
      </div>`, r)}
      ${linkedEvents.length ? `<div class="section-card">
        <div class="section-title">Linked events</div>
        ${linkedEvents.map(ev => `<div class="record-card" data-record-link data-area-id="${ev.areaId}" data-record-id="${ev.id}" style="margin-bottom:6px">
          <div class="record-card-icon">📅</div>
          <div class="record-card-body">
            <div class="record-card-title">${ev.title}</div>
            <div class="record-card-sub">${formatDate(ev.fields.date)}${ev.fields.time ? ' · ' + fmtTime(ev.fields.time) : ''}</div>
          </div>
        </div>`).join('')}
      </div>` : ''}
      ${widgetCard('timeline', `<div class="section-card">
        <div class="section-title" oncontextmenu="openWidgetTitleMenu(event,'${r.id}','timeline')">${getWidgetLabel(r,'timeline','Timeline')}</div>
        ${renderTimeline(r)}
      </div>`, r)}
    </div>
  </div>`;
}

function renderCompaniesView() {
  const el = document.getElementById('companies-list');
  if (!el) return;
  const areaFilter = document.getElementById('companies-area-filter');
  if (areaFilter && areaFilter.options.length === 1) {
    DB.areas.forEach(a => { const o=document.createElement('option');o.value=a.id;o.textContent=a.title;areaFilter.appendChild(o); });
  }
  const search = (document.getElementById('companies-search')?.value||'').toLowerCase();
  const areaId = document.getElementById('companies-area-filter')?.value||'';
  let companies = getRecordsByType('company');
  if (areaId) companies = companies.filter(r => r.areaId === areaId);
  if (search) companies = companies.filter(r =>
    r.title.toLowerCase().includes(search) ||
    (r.fields.industry||'').toLowerCase().includes(search) ||
    (r.fields.location||'').toLowerCase().includes(search)
  );
  companies.sort((a,b) => a.title.localeCompare(b.title));
  if (!companies.length) { el.innerHTML = '<div class="empty">No companies found.</div>'; return; }
  el.innerHTML = companies.map(co => {
    const area = getArea(co.areaId);
    const contactCount = getRecordsByType('contact').filter(r => r.companyId === co.id).length;
    return `<div class="record-card" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}">
      <div class="record-card-icon">🏢</div>
      <div class="record-card-body">
        <div class="record-card-title">${co.title}</div>
        <div class="record-card-sub">${[co.fields.industry, co.fields.location].filter(Boolean).join(' · ')}${contactCount?` · ${contactCount} contact${contactCount>1?'s':''}`:''}</div>
      </div>
      <div class="record-card-right">
        ${area?`<span class="doc-ref doc-ref-area" data-area-link="${area.id}" style="font-size:11px;padding:3px 10px;border-radius:20px;background:${area.color}18;color:${area.color};border:1px solid ${area.color}44;font-weight:500">${area.title}</span>`:''}
      </div>
    </div>`;
  }).join('');
}

const INSTITUTION_DEFAULTS = {
  'fidelity':   { domain: 'fidelity.com',     url: 'https://www.fidelity.com/customer-service/log-in' },
  'chase':      { domain: 'chase.com',         url: 'https://secure.chase.com/web/auth/dashboard' },
  'wealthfront':{ domain: 'wealthfront.com',   url: 'https://www.wealthfront.com/login' },
  'vanguard':   { domain: 'vanguard.com',      url: 'https://investor.vanguard.com/home' },
  'schwab':     { domain: 'schwab.com',        url: 'https://client.schwab.com/Login/SignOn' },
  'betterment': { domain: 'betterment.com',    url: 'https://www.betterment.com/login' },
  'bofa':       { domain: 'bankofamerica.com', url: 'https://www.bankofamerica.com/deposits/login.go' },
  'bank of america': { domain: 'bankofamerica.com', url: 'https://www.bankofamerica.com/deposits/login.go' },
};

function getInstitutionDefaults(name) {
  if (!name) return null;
  return INSTITUTION_DEFAULTS[name.toLowerCase()] || null;
}

async function editAccountBalance(recordId) {
  const r = getRecord(recordId);
  if (!r) return;
  const current = r.fields.balance !== undefined ? r.fields.balance : '';
  const val = prompt('Update balance:', current);
  if (val === null) return;
  const num = parseFloat(val.replace(/[$,]/g, ''));
  if (isNaN(num)) return;
  const today = new Date().toISOString().split('T')[0];
  r.fields.balance = num;
  r.fields.balanceDate = today;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  await api('POST', `/api/records/${recordId}/timeline`, { text: `Balance updated to $${num.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}` });
  const entry = { id: Date.now().toString(36), date: new Date().toISOString(), text: `Balance updated to $${num.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, author: 'aaron' };
  r.timeline = r.timeline || [];
  r.timeline.push(entry);
  renderRecordView(recordId);
}

function parseStatementUpload(recordId) {
  document.getElementById(`stmt-input-${recordId}`)?.click();
}

async function handleStatementFile(recordId, file) {
  if (file && file.files) { file = file.files[0]; }
  if (!file) return;
  if (file.name?.endsWith('.csv') || file.type === 'text/csv') {
    return handleStatementCSV(recordId, file);
  }

  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text);z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  toast.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span><span>Reading statement…</span>`;
  document.body.appendChild(toast);

  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`/api/records/${recordId}/parse-statement`, { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Parse failed');
    toast.remove();
    showStatementConfirmModal(recordId, data);
  } catch (err) {
    toast.innerHTML = `<span style="color:var(--red)">✗</span><span>${err.message}</span>`;
    setTimeout(() => toast.remove(), 4000);
  }
}

async function handleStatementCSV(recordId, file) {
  const text = await file.text();
  const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return alert('CSV must have a header row and at least one data row.');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g,''));
  const col = key => headers.findIndex(h => h.includes(key));
  const iMonth = col('month') >= 0 ? col('month') : col('date') >= 0 ? col('date') : 0;
  const iBegin = col('begin') >= 0 ? col('begin') : col('start') >= 0 ? col('start') : 1;
  const iEnd = col('end') >= 0 ? col('end') : col('close') >= 0 ? col('close') : 2;
  const iContrib = col('contrib') >= 0 ? col('contrib') : col('deposit') >= 0 ? col('deposit') : -1;
  const iReturn = col('return') >= 0 ? col('return') : col('pct') >= 0 ? col('pct') : -1;
  const clean = s => parseFloat((s||'').replace(/[$,%+\s]/g,'')) || 0;

  const rows = lines.slice(1).map(line => {
    const cols = line.split(',');
    const month = (cols[iMonth]||'').trim().slice(0,7);
    const beginBalance = clean(cols[iBegin]);
    const endBalance = clean(cols[iEnd]);
    const contributions = iContrib >= 0 ? clean(cols[iContrib]) : 0;
    const base = beginBalance + contributions;
    const returnPct = iReturn >= 0 ? clean(cols[iReturn]) : (base > 0 ? (endBalance - base) / base * 100 : 0);
    return { month, beginBalance, endBalance, contributions, returnPct };
  }).filter(r => r.month.match(/^\d{4}-\d{2}$/));

  if (!rows.length) return alert('No valid rows found. Expected columns: month (YYYY-MM), beginBalance, endBalance, contributions (optional), returnPct (optional).');
  showCSVImportModal(recordId, rows);
}

function showCSVImportModal(recordId, rows) {
  const r = getRecord(recordId);
  if (!r) return;
  const fmt = n => '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtPct = n => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
  const existing = new Set((r.fields.history||[]).map(h => h.month));

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:28px;width:560px;max-width:95vw;max-height:85vh;display:flex;flex-direction:column">
    <div style="font-size:16px;font-weight:600;margin-bottom:6px">Import CSV — ${rows.length} month${rows.length!==1?'s':''}</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:16px">Review and confirm. Months already in history are marked.</div>
    <div style="overflow-y:auto;flex:1;margin-bottom:16px">
      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="color:var(--muted);text-align:right">
          <th style="text-align:left;padding:4px 8px">Month</th>
          <th style="padding:4px 8px">Start</th>
          <th style="padding:4px 8px">Contrib</th>
          <th style="padding:4px 8px">End</th>
          <th style="padding:4px 8px">Return</th>
          <th style="padding:4px 8px">Status</th>
        </tr></thead>
        <tbody>${rows.map((row,i) => `<tr style="border-top:1px solid var(--border)">
          <td style="padding:5px 8px;color:var(--text)">${row.month}</td>
          <td style="padding:5px 8px;text-align:right;color:var(--muted)">${fmt(row.beginBalance)}</td>
          <td style="padding:5px 8px;text-align:right;color:var(--muted)">${row.contributions > 0 ? fmt(row.contributions) : '—'}</td>
          <td style="padding:5px 8px;text-align:right;font-weight:600;color:var(--text)">${fmt(row.endBalance)}</td>
          <td style="padding:5px 8px;text-align:right;color:${row.returnPct>=0?'var(--green)':'var(--red)'}">${fmtPct(row.returnPct)}</td>
          <td style="padding:5px 8px;text-align:right;color:${existing.has(row.month)?'var(--amber)':'var(--green)'}">
            ${existing.has(row.month)?'⚠ overwrites':'✓ new'}
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-p" onclick="confirmCSVImport('${recordId}')">Import all</button>
      <button class="btn" onclick="this.closest('[style*=fixed]').remove()">Cancel</button>
    </div>
  </div>`;
  modal.dataset.csvRows = JSON.stringify(rows);
  document.body.appendChild(modal);
}

async function confirmCSVImport(recordId) {
  const modal = document.querySelector('[data-csv-rows]');
  if (!modal) return;
  const rows = JSON.parse(modal.dataset.csvRows);
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.history = r.fields.history || [];
  rows.forEach(row => {
    const idx = r.fields.history.findIndex(h => h.month === row.month);
    if (idx >= 0) r.fields.history[idx] = row;
    else r.fields.history.push(row);
  });
  modal.remove();
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  renderRecordView(recordId);
}

function showStatementConfirmModal(recordId, data) {
  const parts = (data.date || '').split('-');
  const year = parseInt(parts[0]) || new Date().getFullYear();
  const month = parts[1] ? parseInt(parts[1]) - 1 : new Date().getMonth();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({length: 6}, (_, i) => year - 2 + i);
  const fmt = n => '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtPct = n => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';
  const isCreditCard = data._type === 'credit-card';

  const periodRow = `
    <div style="font-size:12px;color:var(--muted)">Period</div>
    <div style="display:flex;gap:6px">
      <select id="sc-month" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:4px 6px;color:var(--text);font-size:13px">
        ${months.map((m,i) => `<option value="${i}" ${i===month?'selected':''}>${m}</option>`).join('')}
      </select>
      <select id="sc-year" style="width:70px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:4px 6px;color:var(--text);font-size:13px">
        ${years.map(y => `<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
      </select>
    </div>`;

  const rows = isCreditCard ? `
    ${periodRow}
    <div style="font-size:12px;color:var(--muted)">New balance</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.balance)}</div>
    <div style="font-size:12px;color:var(--muted)">Previous balance</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.previousBalance)}</div>
    <div style="font-size:12px;color:var(--muted)">Purchases</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.purchases)}</div>
    <div style="font-size:12px;color:var(--muted)">Payments</div>
    <div style="font-size:13px;font-weight:500;color:var(--green)">${fmt(data.payments)}</div>
    <div style="font-size:12px;color:var(--muted)">Interest charged</div>
    <div style="font-size:13px;font-weight:500;color:var(--red)">${fmt(data.interestCharged)}</div>
    <div style="font-size:12px;color:var(--muted)">Min payment</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.minPayment)}</div>
    <div style="font-size:12px;color:var(--muted)">Due date</div>
    <div style="font-size:13px;font-weight:500">${data.dueDate || '—'}</div>
    ${data.creditLimit ? `<div style="font-size:12px;color:var(--muted)">Credit limit</div><div style="font-size:13px;font-weight:500">${fmt(data.creditLimit)}</div>` : ''}
  ` : `
    ${periodRow}
    <div style="font-size:12px;color:var(--muted)">Start balance</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.beginBalance)}</div>
    <div style="font-size:12px;color:var(--muted)">End balance</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.endBalance)}</div>
    <div style="font-size:12px;color:var(--muted)">Contributions</div>
    <div style="font-size:13px;font-weight:500">${fmt(data.contributions)}</div>
    <div style="font-size:12px;color:var(--muted)">Return</div>
    <div style="font-size:13px;font-weight:500;color:${data.returnPct>=0?'var(--green)':'var(--red)'}">${fmtPct(data.returnPct)}</div>
  `;

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:28px;width:380px;max-width:90vw">
    <div style="font-size:16px;font-weight:600;margin-bottom:18px">Confirm statement data</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">${rows}</div>
    <div style="display:flex;gap:10px;justify-content:flex-end">
      <button class="btn-s" onclick="this.closest('[style*=fixed]').remove()">Cancel</button>
      <button class="btn-p" onclick="confirmStatementImport('${recordId}', this)">Save</button>
    </div>
  </div>`;
  modal.dataset.statementData = JSON.stringify(data);
  document.body.appendChild(modal);
}

async function confirmStatementImport(recordId, btn) {
  const modal = btn.closest('[style*=fixed]');
  const data = JSON.parse(modal.dataset.statementData);
  const monthIdx = parseInt(document.getElementById('sc-month').value);
  const year = parseInt(document.getElementById('sc-year').value);
  const monthStr = `${year}-${String(monthIdx + 1).padStart(2,'0')}`;
  modal.remove();

  const r = getRecord(recordId);
  const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][monthIdx];
  let timelineText;

  if (data._type === 'credit-card') {
    r.fields.balance = data.balance;
    r.fields.balanceDate = monthStr + '-01';
    r.fields.statementBalance = data.previousBalance;
    r.fields.purchases = data.purchases;
    r.fields.payments = data.payments;
    r.fields.interestCharged = data.interestCharged;
    r.fields.minPayment = data.minPayment;
    if (data.dueDate) r.fields.dueDate = data.dueDate;
    if (data.creditLimit) r.fields.creditLimit = data.creditLimit;

    // Ensure CC fields are in the type schema so they render
    const ccFieldKeys = ['balance','balanceDate','statementBalance','purchases','payments','interestCharged','minPayment','dueDate','creditLimit'];
    const schema = getEffectiveSchema(r.type);
    if (schema) {
      const existing = new Set(schema.fields.map(f => f.key));
      const toAdd = ccFieldKeys.filter(k => !existing.has(k)).map(k => {
        const lib = FIELD_LIBRARY.find(f => f.key === k);
        return lib ? { key: lib.key, label: lib.label, type: lib.type, order: (schema.fields.length || 0) + ccFieldKeys.indexOf(k) + 1 } : null;
      }).filter(Boolean);
      if (toAdd.length) {
        const allFields = [...schema.fields, ...toAdd];
        await api('PUT', `/api/type-schemas/${r.type}`, { name: schema.name, icon: schema.icon, fields: allFields });
        TYPE_SCHEMAS = await api('GET', '/api/type-schemas');
      }
    }

    timelineText = `${monthName} ${year} statement imported — Balance: ${fmt(data.balance)} | Purchases: ${fmt(data.purchases)} | Payments: ${fmt(data.payments)}${data.interestCharged > 0 ? ` | Interest: ${fmt(data.interestCharged)}` : ''}`;
  } else {
    r.fields.balance = data.endBalance;
    r.fields.balanceDate = monthStr + '-01';
    r.fields.history = r.fields.history || [];
    const existing = r.fields.history.findIndex(h => h.month === monthStr);
    const begin = Number(data.beginBalance) || 0;
    const end = Number(data.endBalance) || 0;
    const contrib = Number(data.contributions) || 0;
    const base = begin + contrib;
    const calcedReturn = base === 0 ? 0 : (end - base) / base * 100;
    const entry = { month: monthStr, beginBalance: begin, endBalance: end, contributions: contrib, returnPct: calcedReturn };
    if (existing >= 0) r.fields.history[existing] = entry; else r.fields.history.push(entry);
    r.fields.history.sort((a,b) => a.month.localeCompare(b.month));
    const fmtPct = n => (n>=0?'+':'') + Number(n).toFixed(2)+'%';
    timelineText = `${monthName} ${year} statement imported — End: ${fmt(data.endBalance)} | Start: ${fmt(data.beginBalance)}${data.contributions > 0 ? ` | Contributions: ${fmt(data.contributions)}` : ''} | Return: ${fmtPct(data.returnPct)}`;
  }

  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  await api('POST', `/api/records/${recordId}/timeline`, { text: timelineText });
  r.timeline = r.timeline || [];
  r.timeline.push({ id: Date.now().toString(36), date: new Date().toISOString(), text: timelineText, author: 'aaron' });
  renderRecordView(recordId);
}

// Paste handler — attached when an account record view is rendered
function attachStatementPasteListener(recordId) {
  detachStatementPasteListener(); // always clean up before attaching
  const handler = (e) => {
    try {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          handleStatementFile(recordId, file);
          return;
        }
      }
    } catch (err) {
      console.error('Paste handler error:', err);
    }
  };
  document.addEventListener('paste', handler);
  window._stmtPasteHandler = handler;
}

function detachStatementPasteListener() {
  if (window._stmtPasteHandler) {
    try {
      document.removeEventListener('paste', window._stmtPasteHandler);
    } finally {
      window._stmtPasteHandler = null;
    }
  }
}

function renderAccountCharts(containerId, history) {
  const el = document.getElementById(containerId);
  console.log('[charts]', containerId, 'el:', !!el, 'history:', history?.length, 'width:', el?.offsetWidth);
  if (!el || history.length < 2) { if (el) el.innerHTML = ''; return; }

  if (!el.offsetWidth) {
    setTimeout(() => renderAccountCharts(containerId, history), 50);
    return;
  }
  const W = el.offsetWidth;
  const labels = history.map(h => h.month.slice(0, 7));
  const shortLabels = labels.map(l => { const [y,m] = l.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1] + ' ' + y.slice(2); });

  // â"€â"€ Balance line chart â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  function lineChart(values, title, fmtY) {
    const H = 160, PL = 72, PR = 16, PT = 28, PB = 28;
    const cW = W, cH = H;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const xStep = (cW - PL - PR) / (values.length - 1);
    const y = v => PT + (H - PT - PB) * (1 - (v - min) / range);
    const pts = values.map((v, i) => `${PL + i * xStep},${y(v)}`).join(' ');
    const areaPath = `M${PL},${H - PB} ` + values.map((v,i) => `L${PL + i*xStep},${y(v)}`).join(' ') + ` L${PL + (values.length-1)*xStep},${H-PB} Z`;
    const ticks = [min, (min+max)/2, max];
    return `<svg width="${cW}" height="${cH}" style="overflow:visible">
      <text x="${PL}" y="16" font-size="11" fill="var(--muted)" font-family="inherit">${title}</text>
      ${ticks.map(t => `<text x="${PL-4}" y="${y(t)+4}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="inherit">${fmtY(t)}</text><line x1="${PL}" y1="${y(t)}" x2="${cW-PR}" y2="${y(t)}" stroke="var(--border1)" stroke-width="1"/>`).join('')}
      <path d="${areaPath}" fill="var(--accent)" opacity="0.08"/>
      <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
      ${values.map((v,i) => `<circle cx="${PL+i*xStep}" cy="${y(v)}" r="3" fill="var(--accent)"/>`).join('')}
      ${shortLabels.filter((_,i) => i===0||i===history.length-1||history.length<=6).map((_,i) => {
        const idx = history.length<=6 ? i : (i===0?0:i===1?history.length-1:-1);
        if (idx<0) return '';
        return `<text x="${PL+idx*xStep}" y="${cH-6}" font-size="9" fill="var(--muted)" text-anchor="middle" font-family="inherit">${shortLabels[idx]}</text>`;
      }).filter(s=>s).join('')}
    </svg>`;
  }

  // â"€â"€ Return % bar chart â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  function returnChart(values, title) {
    const H = 140, PL = 36, PR = 8, PT = 28, PB = 28;
    const cW = W/3 - 16, cH = H;
    const max = Math.max(...values.map(Math.abs), 0.5);
    const zeroY = PT + (H - PT - PB) / 2;
    const totalW = cW - PL - PR;
    const barW = Math.max(4, totalW / values.length - 3);
    const barX = i => PL + (totalW / values.length) * i + (totalW / values.length - barW) / 2;
    const barH = v => Math.abs(v) / max * (H - PT - PB) / 2;
    return `<svg width="${cW}" height="${cH}" style="overflow:visible">
      <text x="${PL}" y="16" font-size="11" fill="var(--muted)" font-family="inherit">${title}</text>
      <line x1="${PL}" y1="${zeroY}" x2="${cW-PR}" y2="${zeroY}" stroke="var(--border2)" stroke-width="1"/>
      <text x="${PL-4}" y="${PT+4}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="inherit">+${max.toFixed(1)}%</text>
      <text x="${PL-4}" y="${H-PB+4}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="inherit">-${max.toFixed(1)}%</text>
      ${values.map((v,i) => {
        const pos = v >= 0;
        const bh = barH(v);
        const by = pos ? zeroY - bh : zeroY;
        return `<rect x="${barX(i)}" y="${by}" width="${barW}" height="${bh}" fill="${pos?'var(--green)':'var(--red)'}" rx="2" opacity="0.85"/>
          <title>${shortLabels[i]}: ${v>=0?'+':''}${v.toFixed(2)}%</title>`;
      }).join('')}
    </svg>`;
  }

  // â"€â"€ Contributions vs gain stacked bars â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  function contribChart(hist, title) {
    const H = 140, PL = 56, PR = 8, PT = 28, PB = 28;
    const cW = W/3 - 16, cH = H;
    const gains = hist.map(h => h.endBalance - h.beginBalance - (h.contributions||0));
    const contribs = hist.map(h => h.contributions || 0);
    const totals = hist.map((_,i) => Math.abs(gains[i]) + contribs[i]);
    const max = Math.max(...totals, 1);
    const totalW = cW - PL - PR;
    const barW = Math.max(4, totalW / hist.length - 3);
    const barX = i => PL + (totalW / hist.length) * i + (totalW / hist.length - barW) / 2;
    const availH = H - PT - PB;
    const fmt = n => n >= 1000 ? '$' + (n/1000).toFixed(1) + 'k' : '$' + n.toFixed(0);
    return `<svg width="${cW}" height="${cH}" style="overflow:visible">
      <text x="${PL}" y="16" font-size="11" fill="var(--muted)" font-family="inherit">${title}</text>
      ${[0, max/2, max].map(t => `<text x="${PL-4}" y="${PT + availH*(1-t/max)+4}" font-size="9" fill="var(--muted)" text-anchor="end" font-family="inherit">${fmt(t)}</text><line x1="${PL}" y1="${PT+availH*(1-t/max)}" x2="${cW-PR}" y2="${PT+availH*(1-t/max)}" stroke="var(--border1)" stroke-width="1"/>`).join('')}
      ${hist.map((_,i) => {
        const gh = availH * Math.abs(gains[i]) / max;
        const ch = availH * contribs[i] / max;
        const gainColor = gains[i] >= 0 ? 'var(--green)' : 'var(--red)';
        return `<rect x="${barX(i)}" y="${PT + availH - gh - ch}" width="${barW}" height="${ch}" fill="var(--accent)" opacity="0.7" rx="2"/>
          <rect x="${barX(i)}" y="${PT + availH - gh}" width="${barW}" height="${gh}" fill="${gainColor}" opacity="0.6" rx="2"/>`;
      }).join('')}
      <text x="${PL + 4}" y="${cH-6}" font-size="9" fill="var(--accent)" font-family="inherit">■ Contrib</text>
      <text x="${PL + 52}" y="${cH-6}" font-size="9" fill="var(--green)" font-family="inherit">■ Gain</text>
    </svg>`;
  }

  const balances = history.map(h => h.endBalance || 0);
  const returns = history.map(h => h.returnPct ?? 0);
  const fmtK = n => n >= 1000 ? '$'+(n/1000).toFixed(0)+'k' : '$'+n.toFixed(0);

  el.innerHTML = `<div style="padding:0 0 16px 0;overflow:hidden">
    ${lineChart(balances, 'Balance over time', fmtK)}
  </div>`;
}

function renderSchemaRecord(r, area) {
  const schema = getEffectiveSchema(r.type);
  const defs = getWidgetDefs(r);

  // Icon: account gets institution favicon, others use schema icon
  let headerIcon;
  if (r.type === 'account') {
    const instDefaults = getInstitutionDefaults(r.fields.institution);
    const domain = r.fields.institutionDomain || instDefaults?.domain || null;
    const loginUrl = r.fields.institutionUrl || instDefaults?.url || null;
    headerIcon = domain
      ? `<a href="${loginUrl || '#'}" target="_blank" rel="noopener" title="Log in to ${r.fields.institution}" style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:10px;background:var(--bg3);border:1px solid var(--border1);overflow:hidden;flex-shrink:0;text-decoration:none">
          <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:32px;height:32px;object-fit:contain" onerror="this.parentElement.innerHTML='💳'">
         </a>`
      : `<div class="record-view-icon">💳</div>`;
  } else {
    headerIcon = `<div class="record-view-icon">${schema?.icon || typeIcon(r.type)}</div>`;
  }

  // Meta subtitle: first 2 non-empty, non-compound, non-textarea field values
  const metaVals = (schema?.fields || [])
    .filter(f => !['company-link','textarea','url'].includes(f.type))
    .slice(0, 3)
    .map(f => r.fields[f.key])
    .filter(Boolean);

  // Widget body for any widget id
  function widgetBody(id) {
    const def = defs.find(d => d.id === id);
    const label = getWidgetLabel(r, id, def?.label || id);
    const ctx = `openWidgetTitleMenu(event,'${r.id}','${id}')`;

    // Fields-style widgets (all map to renderFieldsFromSchema + area selector)
    if (['fields','contact-info','company-details','account-details','event-details'].includes(id)) {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${renderFieldsFromSchema(r)}
        <div class="field-row">
          <div class="field-label">Area</div>
          <div class="field-value">
            <select class="field-edit" onchange="moveRecordArea('${r.id}',this.value)">
              ${DB.areas.map(a=>`<option value="${a.id}" ${a.id===r.areaId?'selected':''}>${a.title}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>`;
    }

    if (id === 'notes') return renderNotesSection(r);

    if (id === 'timeline' || id === 'activity') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${renderTimeline(r)}
      </div>`;
    }

    if (id === 'documents') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        <div style="font-size:12px;color:var(--muted)">No documents yet.</div>
      </div>`;
    }

    if (id === 'contacts') {
      const linked = DB.records.filter(rec => !rec.deletedAt && rec.type === 'contact' && rec.companyId === r.id);
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label} (${linked.length})</div>
        ${linked.map(ct=>`<div class="contact-chip" data-record-link data-area-id="${ct.areaId}" data-record-id="${ct.id}">
          <span>👤</span><span class="contact-chip-name">${ct.title}</span>
          ${ct.fields.role?`<span class="contact-chip-role">&middot; ${ct.fields.role}</span>`:''}
        </div>`).join('')}
        ${!linked.length?'<div style="font-size:12px;color:var(--muted)">No contacts linked.</div>':''}
        <div style="margin-top:8px;display:flex;gap:6px">
          <button class="btn btn-xs" onclick="linkContactToCompany('${r.id}')">+ Link contact</button>
          <button class="btn btn-xs" onclick="promptAddRecord('contact')">+ New contact</button>
        </div>
      </div>`;
    }

    if (id === 'applications') {
      const jobs = DB.records.filter(rec => !rec.deletedAt && rec.type === 'job' && rec.companyId === r.id);
      if (!jobs.length) return '';
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label} (${jobs.length})</div>
        ${jobs.map(j=>`<div class="record-card" data-record-link data-area-id="${j.areaId}" data-record-id="${j.id}" style="margin-bottom:6px">
          <div class="record-card-icon">💼</div>
          <div class="record-card-body"><div class="record-card-title">${j.fields.role||j.title}</div><div class="record-card-sub">${j.status}</div></div>
        </div>`).join('')}
      </div>`;
    }

    if (id === 'links') {
      const linked = (r.links || []).map(id => DB.records.find(rec => rec.id === id)).filter(Boolean);
      if (!linked.length) return '';
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${linked.map(rec=>`<div class="contact-chip" data-record-link data-area-id="${rec.areaId}" data-record-id="${rec.id}">${rec.title}</div>`).join('')}
      </div>`;
    }

    if (id === 'status-urgency') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${statusBadge(r)}
      </div>`;
    }

    // ── Account-specific widgets ──────────────────────────────────────────────
    if (id === 'balance') {
      const bal = r.fields.balance !== undefined && r.fields.balance !== '' ? Number(r.fields.balance) : null;
      const balFmt = bal !== null ? '$' + bal.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}) : '—';
      const balDate = r.fields.balanceDate ? `Updated ${formatDate(r.fields.balanceDate)}` : 'Balance not set';
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
          <div>
            <div style="font-size:28px;font-weight:700;color:var(--text);cursor:pointer;line-height:1.2" onclick="editAccountBalance('${r.id}')" title="Click to update balance">${balFmt}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">${balDate}</div>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <button class="btn-s" style="font-size:11px" onclick="parseStatementUpload('${r.id}')">⬆ Import statement</button>
            <button class="btn-s" style="font-size:11px;margin-left:4px" onclick="document.getElementById('csv-input-${r.id}').click()">⬆ Import CSV</button>
            <div style="font-size:10px;color:var(--muted);margin-top:4px">or paste a screenshot</div>
            <input type="file" id="stmt-input-${r.id}" accept="image/*,application/pdf" style="display:none" onchange="handleStatementFile('${r.id}',this)">
            <input type="file" id="csv-input-${r.id}" accept=".csv,text/csv" style="display:none" onchange="handleStatementFile('${r.id}',this)">
          </div>
        </div>
      </div>`;
    }

    if (id === 'balance-chart') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        <div id="acct-charts-${r.id}"></div>
      </div>`;
    }

    if (id === 'history') {
      const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
      const fmtPct = n => (n>=0?'+':'')+Number(n).toFixed(2)+'%';
      const calcRet = h => { const b=Number(h.beginBalance)||0,e=Number(h.endBalance)||0,c=Number(h.contributions)||0,base=b+c; return base===0?0:(e-base)/base; };
      const hist = (r.fields.history||[]).slice().sort((a,b)=>b.month.localeCompare(a.month));
      const annualReturns = {};
      (r.fields.history||[]).forEach(h => { const yr=h.month.slice(0,4); annualReturns[yr]=annualReturns[yr]||[]; annualReturns[yr].push(calcRet(h)); });
      const annualHTML = Object.entries(annualReturns).sort((a,b)=>b[0].localeCompare(a[0])).map(([yr,rets])=>{const t=rets.reduce((p,r)=>p*(1+r),1)-1;return `<span style="margin-left:16px;font-size:11px;color:var(--muted)">${yr}: <span style="color:${t>=0?'var(--green)':'var(--red)'};font-weight:500">${fmtPct(t*100)}</span></span>`;}).join('');
      const editCell = (month,field,val,display)=>`<span class="hist-cell" onclick="activateHistCell(this,'${r.id}','${month}','${field}')" style="cursor:pointer;border-radius:3px;padding:1px 3px" title="Click to edit">${display}</span>`;
      const tableHTML = hist.length ? `<div style="display:flex;align-items:baseline;margin-bottom:8px"><span style="font-size:11px;color:var(--muted)">Annual return${annualHTML}</span></div>
        <table style="border-collapse:collapse;font-size:12px"><thead><tr style="color:var(--muted);text-align:right">
          <th style="text-align:left;padding:4px 8px 4px 0;font-weight:500">Month</th>
          <th style="padding:4px 8px;font-weight:500">Start</th><th style="padding:4px 8px;font-weight:500">Contrib</th>
          <th style="padding:4px 8px;font-weight:500">End</th><th style="padding:4px 0;font-weight:500;text-align:left">Return</th><th></th>
        </tr></thead><tbody>${hist.map(h=>{const ret=calcRet(h)*100,arrow=ret>=0?'▲':'▼',retColor=ret>=0?'var(--green)':'var(--red)';return `<tr style="border-top:1px solid var(--border1);text-align:right">
          <td style="text-align:left;padding:5px 8px 5px 0;color:var(--muted);white-space:nowrap">${h.month}</td>
          <td style="padding:5px 8px;color:var(--muted)">${editCell(h.month,'beginBalance',h.beginBalance,fmt(h.beginBalance))}</td>
          <td style="padding:5px 8px;color:var(--muted)">${editCell(h.month,'contributions',h.contributions,h.contributions>0?fmt(h.contributions):'—')}</td>
          <td style="padding:5px 8px;color:var(--text);font-weight:500">${editCell(h.month,'endBalance',h.endBalance,fmt(h.endBalance))}</td>
          <td style="padding:5px 0;white-space:nowrap;text-align:left"><span style="color:${retColor};font-weight:500">${arrow} ${Math.abs(ret).toFixed(2)}%</span></td>
          <td style="padding:5px 0 5px 8px"><button onclick="deleteHistoryRow('${r.id}','${h.month}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:11px;padding:0;opacity:0.4" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.4">✕</button></td>
        </tr>`;}).join('')}</tbody></table>` : '<div style="color:var(--muted);font-size:12px">No history yet — import a statement to start tracking.</div>';
      return `<div class="section-card collapsible-section">
        <div class="section-title section-toggle" onclick="toggleSection(this)" oncontextmenu="${ctx}"><span class="section-chevron">▾</span> ${label}</div>
        <div class="section-body">${tableHTML}</div>
      </div>`;
    }

    if (id === 'cc-details') {
      if (r.fields.accountType !== 'Credit Card') return '';
      const bal = Number(r.fields.balance) || 0;
      const limit = Number(r.fields.creditLimit) || 0;
      const utilPct = limit > 0 ? Math.min(100, Math.round(bal / limit * 100)) : null;
      const utilColor = utilPct === null ? 'var(--muted)' : utilPct >= 30 ? (utilPct >= 50 ? 'var(--red)' : '#f0b429') : 'var(--green)';
      const fmt = n => '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${utilPct !== null ? `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
            <span style="color:var(--muted)">Utilization</span>
            <span style="color:${utilColor};font-weight:600">${utilPct}%</span>
          </div>
          <div style="height:8px;background:var(--bg3);border-radius:4px;overflow:hidden">
            <div style="height:100%;width:${utilPct}%;background:${utilColor};border-radius:4px"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--muted)">
            <span>Balance: ${fmt(bal)}</span><span>Limit: ${fmt(limit)}</span>
          </div>
        </div>` : ''}
        ${r.fields.statementBalance ? `<div class="field-row"><div class="field-label">Prev stmt balance</div><div class="field-value">${fmt(Number(r.fields.statementBalance))}</div></div>` : ''}
        ${r.fields.purchases ? `<div class="field-row"><div class="field-label">Purchases</div><div class="field-value">${fmt(Number(r.fields.purchases))}</div></div>` : ''}
        ${r.fields.payments ? `<div class="field-row"><div class="field-label">Payments</div><div class="field-value">${fmt(Number(r.fields.payments))}</div></div>` : ''}
        ${r.fields.interestCharged ? `<div class="field-row"><div class="field-label">Interest</div><div class="field-value">${fmt(Number(r.fields.interestCharged))}</div></div>` : ''}
        ${r.fields.minPayment ? `<div class="field-row"><div class="field-label">Min payment</div><div class="field-value">${fmt(Number(r.fields.minPayment))}</div></div>` : ''}
        ${r.fields.apr ? `<div class="field-row"><div class="field-label">Purchase APR</div><div class="field-value">${r.fields.apr}%</div></div>` : ''}
        ${r.fields.cashAdvanceApr ? `<div class="field-row"><div class="field-label">Cash advance APR</div><div class="field-value">${r.fields.cashAdvanceApr}%</div></div>` : ''}
        ${r.fields.annualFee ? `<div class="field-row"><div class="field-label">Annual fee</div><div class="field-value">${fmt(Number(r.fields.annualFee))}</div></div>` : ''}
        ${(r.fields.statementOpen || r.fields.statementClose) ? `<div class="field-row"><div class="field-label">Statement cycle</div><div class="field-value">${r.fields.statementOpen || '?'}–${r.fields.statementClose || '?'}</div></div>` : ''}
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border1)">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Autopay${r.fields.autopayDate ? ` · day ${r.fields.autopayDate}` : ''}</div>
          <div style="display:flex;gap:6px;margin-bottom:6px">
            ${['Minimum','Statement balance','Fixed'].map(opt => `
              <button onclick="setCCAutopayType('${r.id}','${opt}',this)" style="flex:1;padding:5px 4px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid ${r.fields.autopayType===opt?'var(--accent)':'var(--border1)'};background:${r.fields.autopayType===opt?'var(--accent)':'var(--bg3)'};color:${r.fields.autopayType===opt?'#fff':'var(--text)'};transition:all .15s">${opt}</button>
            `).join('')}
          </div>
          ${r.fields.autopayType === 'Fixed' ? `<div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:12px;color:var(--muted)">Amount</span>
            <input id="cc-autopay-fixed-${r.id}" class="modal-input" style="width:100px;padding:4px 8px;font-size:12px" value="${r.fields.autopayFixed||''}" placeholder="0.00"
              onblur="saveCCAutopayFixed('${r.id}',this.value)">
          </div>` : ''}
        </div>
        ${r.fields.rewardsType || r.fields.pointsBalance ? `<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border1)">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px">Rewards</div>
          ${r.fields.rewardsType ? `<div class="field-row"><div class="field-label">Type</div><div class="field-value">${r.fields.rewardsType}${r.fields.rewardsRate ? ` · ${r.fields.rewardsRate}` : ''}</div></div>` : ''}
          ${r.fields.pointsBalance ? `<div class="field-row"><div class="field-label">Balance</div><div class="field-value">${Number(r.fields.pointsBalance).toLocaleString()} pts</div></div>` : ''}
        </div>` : ''}
      </div>`;
    }

    if (id === '401k-progress') {
      if (r.fields.accountType !== '401k') return '';
      const currentYear = new Date().getFullYear();
      const LIMITS = r.fields.k401Limits || {2025:23500,2026:23500,2027:23500};
      const annualContribs = r.fields.annualContribs || {};
      const matchPct = parseFloat(r.fields.employerMatch) || 0;
      const years = Object.keys(LIMITS).map(Number).filter(y => y <= currentYear).sort((a,b) => b-a);
      if (!years.length) return '';
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${years.map((yr,i) => {
          const lim = LIMITS[yr] || 23500;
          const contrib = Number(annualContribs[yr]) || 0;
          const match = Math.round(contrib * matchPct / 100);
          const total = contrib + match;
          const pct = Math.min(100, Math.round(contrib / lim * 100));
          const done = contrib >= lim;
          const color = done ? 'var(--green)' : pct >= 75 ? '#f0b429' : 'var(--accent)';
          const isCurrent = yr === currentYear;
          return `<div style="margin-bottom:${i < years.length-1 ? 14 : 0}px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
              <span style="font-size:12px;color:var(--text);font-weight:500">${yr}</span>
              <span style="font-size:12px;color:${done?'var(--green)':isCurrent?'var(--text)':'var(--muted)'}">
                ${done ? '✓ Maxed out' : isCurrent ? `$${Math.max(0,lim-contrib).toLocaleString()} remaining` : contrib > 0 ? `$${contrib.toLocaleString()} / $${lim.toLocaleString()}` : '—'}
              </span>
            </div>
            <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--muted)">
              <span class="ira-annual-val" style="cursor:pointer;border-radius:3px;padding:1px 3px" title="Click to edit employee contribution" onclick="editAnnualContrib('${r.id}',${yr},this)">$${contrib.toLocaleString()} employee</span>
              ${matchPct > 0 ? `<span style="color:var(--green)">+$${match.toLocaleString()} match</span>` : `<span>$${lim.toLocaleString()} limit</span>`}
            </div>
            ${matchPct > 0 ? `<div style="font-size:11px;color:var(--muted);margin-top:2px">Total with match: $${total.toLocaleString()}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    }

    if (id === 'hsa-progress') {
      if (r.fields.accountType !== 'HSA') return '';
      const currentYear = new Date().getFullYear();
      const coverage = r.fields.hsaCoverage === 'family' ? 'family' : 'individual';
      const HSA_LIMITS = coverage === 'family'
        ? (r.fields.hsaLimits || {2025:8550,2026:8550,2027:8550})
        : (r.fields.hsaLimits || {2025:4300,2026:4300,2027:4300});
      const annualContribs = r.fields.annualContribs || {};
      const years = Object.keys(HSA_LIMITS).map(Number).filter(y => y <= currentYear).sort((a,b) => b-a);
      if (!years.length) return '';
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${years.map((yr,i) => {
          const lim = HSA_LIMITS[yr];
          const contrib = Number(annualContribs[yr]) || 0;
          const pct = Math.min(100, Math.round(contrib / lim * 100));
          const done = contrib >= lim;
          const color = done ? 'var(--green)' : pct >= 75 ? '#f0b429' : 'var(--accent)';
          const isCurrent = yr === currentYear;
          return `<div style="margin-bottom:${i < years.length-1 ? 14 : 0}px">
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
              <span style="font-size:12px;color:var(--text);font-weight:500">${yr}</span>
              <span style="font-size:12px;color:${done?'var(--green)':isCurrent?'var(--text)':'var(--muted)'}">
                ${done ? '✓ Maxed out' : isCurrent ? `$${Math.max(0,lim-contrib).toLocaleString()} remaining` : contrib > 0 ? `$${contrib.toLocaleString()} / $${lim.toLocaleString()}` : '—'}
              </span>
            </div>
            <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div></div>
            <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--muted)">
              <span class="ira-annual-val" style="cursor:pointer;border-radius:3px;padding:1px 3px" title="Click to edit" onclick="editAnnualContrib('${r.id}',${yr},this)">$${contrib.toLocaleString()} contributed</span>
              <span>$${lim.toLocaleString()} limit (${coverage})</span>
            </div>
          </div>`;
        }).join('')}
      </div>`;
    }

    if (id === 'tax-docs') {
      const taxDocs = r.fields.taxDocs || [];
      const TAX_TYPES = ['1099-R','1099-DIV','1099-INT','1099-B','1099-Q','W-2','5498','Other'];
      const currentYear = new Date().getFullYear();
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${taxDocs.length ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px">
          <thead><tr style="color:var(--muted)">
            <th style="text-align:left;padding:3px 6px">Form</th>
            <th style="text-align:left;padding:3px 6px">Year</th>
            <th style="text-align:left;padding:3px 6px">Status</th>
            <th style="padding:3px 6px"></th>
          </tr></thead>
          <tbody>${taxDocs.map((d,i) => `<tr style="border-top:1px solid var(--border)">
            <td style="padding:4px 6px;color:var(--text)">${d.form}</td>
            <td style="padding:4px 6px;color:var(--muted)">${d.year}</td>
            <td style="padding:4px 6px">
              <span style="color:${d.status==='received'?'var(--green)':d.status==='filed'?'var(--accent)':'var(--muted)'}">${d.status||'pending'}</span>
            </td>
            <td style="padding:4px 6px;text-align:right">
              <button onclick="cycleTaxDocStatus('${r.id}',${i})" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--muted);padding:0" title="Cycle status">↻</button>
              <button onclick="deleteTaxDoc('${r.id}',${i})" style="background:none;border:none;cursor:pointer;font-size:10px;color:var(--muted);padding:0 0 0 6px" title="Remove">✕</button>
            </td>
          </tr>`).join('')}</tbody>
        </table>` : '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">No tax documents yet.</div>'}
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${TAX_TYPES.map(t => `<button class="btn btn-sm" style="font-size:11px" onclick="addTaxDoc('${r.id}','${t}',${currentYear-1})">${t}</button>`).join('')}
        </div>
      </div>`;
    }

    if (id === 'ira-progress') {
      const isIRA = ['Roth IRA','Traditional IRA'].includes(r.fields.accountType);
      if (!isIRA) return '';
      const IRA_LIMITS = r.fields.iraLimits || {2025:7000,2026:7500,2027:7500};
      const annualContribs = r.fields.annualContribs || {};
      const currentYear = new Date().getFullYear();
      const taxYearTotals = {};
      const minYear = Math.min(...Object.keys(IRA_LIMITS).map(Number));
      // Seed each year with manually entered base (contributions not in monthly history)
      Object.entries(annualContribs).forEach(([yr,val])=>{ taxYearTotals[Number(yr)] = Number(val)||0; });
      // Jan–Apr history contributions apply to prior tax year first, then overflow to current year
      // Same-year contributions are NOT auto-summed (they're captured in annualContribs by the user)
      for (const entry of (r.fields.history||[]).slice().sort((a,b)=>a.month.localeCompare(b.month))) {
        let rem = Number(entry.contributions)||0;
        if (!rem) continue;
        const [entryYear, entryMonth] = entry.month.split('-').map(Number);
        if (entryMonth > 4) continue; // only Jan–Apr can roll to prior year; same-year handled via annualContribs
        let taxYear = Math.max(minYear, entryYear - 1);
        while (rem>0&&taxYear<=currentYear+1){const lim=IRA_LIMITS[taxYear]||7000,sf=taxYearTotals[taxYear]||0,sp=lim-sf;if(sp<=0){taxYear++;continue;}const al=Math.min(rem,sp);taxYearTotals[taxYear]=(sf+al);rem-=al;if(taxYearTotals[taxYear]>=lim)taxYear++;}
      }
      const years = Object.keys(IRA_LIMITS).map(Number).filter(y=>y<=currentYear).sort((a,b)=>b-a);
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        ${years.map((yr,i)=>{const lim=IRA_LIMITS[yr]||7000,contrib=taxYearTotals[yr]||0,pct=Math.min(100,contrib/lim*100),done=contrib>=lim,color=done?'var(--green)':pct>=75?'#f0b429':'var(--accent)',isCurrent=yr===currentYear;return `<div style="margin-bottom:${i<years.length-1?14:0}px">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px">
            <span style="font-size:12px;color:var(--text);font-weight:500">${yr}</span>
            <span style="font-size:12px;color:${done?'var(--green)':isCurrent?'var(--text)':'var(--muted)'}">
              ${done?'✓ Maxed out':isCurrent?`$${Math.max(0,lim-contrib).toLocaleString()} remaining`:contrib>0?`$${contrib.toFixed(0)} / $${lim.toLocaleString()}`:'—'}
            </span>
          </div>
          <div style="height:6px;background:var(--bg3);border-radius:3px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${color};border-radius:3px"></div></div>
          <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:var(--muted)">
            <span class="ira-annual-val" style="cursor:pointer;border-radius:3px;padding:1px 3px" title="Click to edit" onclick="editAnnualContrib('${r.id}',${yr},this)">$${contrib.toLocaleString()} contributed</span><span>$${lim.toLocaleString()} limit</span>
          </div>
        </div>`;}).join('')}
      </div>`;
    }

    if (id === 'import') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <button class="btn btn-sm" onclick="parseStatementUpload('${r.id}')">⬆ Upload file</button>
          <button class="btn btn-sm" onclick="document.getElementById('csv-input-${r.id}').click()">⬆ Import CSV</button>
          <span style="font-size:11px;color:var(--muted)">or paste a screenshot anywhere</span>
        </div>
        <input type="file" id="stmt-input-${r.id}" accept="image/*,application/pdf" style="display:none" onchange="handleStatementFile('${r.id}',this)">
        <input type="file" id="csv-input-${r.id}" accept=".csv,text/csv" style="display:none" onchange="handleStatementFile('${r.id}',this)">
      </div>`;
    }

    if (id === 'paste') {
      return `<div class="section-card">
        <div class="section-title" oncontextmenu="${ctx}">${label}</div>
        <textarea class="field-edit" style="width:100%;min-height:80px;font-size:12px;resize:vertical;font-family:inherit"
          placeholder="Paste any text here — statements, notes, data..."
          onblur="savePasteContent('${r.id}',this.value)">${escapeHtml(r.fields._pasteContent || '')}</textarea>
        <div style="font-size:11px;color:var(--muted);margin-top:4px">Auto-saved on blur.</div>
      </div>`;
    }

    return '';
  }

  // Split active widgets into main vs sidebar
  const SIDEBAR_WIDGETS = new Set(['timeline','activity','contacts','ira-progress','applications','documents','links','paste','import']);
  const active = getActiveWidgets(r);
  const mainDefs = defs.filter(d => active.has(d.id) && !SIDEBAR_WIDGETS.has(d.id));
  const sidebarDefs = defs.filter(d => active.has(d.id) && SIDEBAR_WIDGETS.has(d.id));

  if (r.type === 'account') requestAnimationFrame(() => attachStatementPasteListener(r.id));

  return `<div class="record-view-header">
    ${headerIcon}
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta">
        ${metaVals.map(v=>`<span>${v}</span>`).join('')}
        ${area ? `<span class="doc-ref doc-ref-area" data-area-link="${area.id}" style="background:${area.color}18;border:1px solid ${area.color}44;color:${area.color}">${area.title}</span>` : ''}
      </div>
    </div>
    <button class="record-header-tile" onclick="openWidgetsModal('${r.id}')">⚡ Widgets</button>
    <button class="record-header-tile" onclick="openEditTypeSchema('${r.type}')">Fields ⚙</button>
    <div class="record-view-actions">${statusBadge(r)}</div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      ${mainDefs.map(d => widgetCard(d.id, widgetBody(d.id), r)).join('')}
    </div>
    <div class="record-sidebar">
      ${sidebarDefs.map(d => widgetCard(d.id, widgetBody(d.id), r)).join('')}
    </div>
  </div>`;
}

function toggleFieldLibPill(btn) {
  const key = btn.dataset.fkey;
  const PILL_ON  = 'background:var(--accent);color:#fff;border:1px solid var(--accent)';
  const PILL_OFF = 'background:transparent;color:var(--text);border:1px solid var(--border1)';
  const pillStyle = 'border-radius:20px;padding:4px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s';
  const isOn = btn.style.background.includes('var(--accent)') || btn.style.cssText.includes('var(--accent)');

  // Toggle all pills with this key
  document.querySelectorAll(`[data-fkey="${key}"]`).forEach(el => {
    if (isOn) {
      el.setAttribute('style', `${pillStyle};${PILL_OFF}`);
      el.innerHTML = el.textContent.replace(/×$/, '').trim();
    } else {
      el.setAttribute('style', `${pillStyle};${PILL_ON}`);
      el.innerHTML = el.textContent.trim() + '<span style="opacity:0.6;font-size:10px">×</span>';
    }
  });

  // Update active section
  const activeSection = document.getElementById('field-active-section');
  const activePills = document.getElementById('field-active-pills');
  if (!activeSection || !activePills) return;
  if (isOn) {
    // Remove from active section
    activePills.querySelectorAll(`[data-fkey="${key}"]`).forEach(el => el.remove());
  } else {
    // Add to active section
    const clone = btn.cloneNode(true);
    clone.setAttribute('style', `${pillStyle};${PILL_ON}`);
    clone.innerHTML = btn.textContent.trim() + '<span style="opacity:0.6;font-size:10px">×</span>';
    activePills.appendChild(clone);
  }
  activeSection.style.display = activePills.children.length ? '' : 'none';
}

function addCustomFieldRow() {
  const lbl = document.getElementById('cfl-label').value.trim();
  const typ = document.getElementById('cfl-type').value;
  if (!lbl) return;
  const key = lbl.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,'');
  const div = document.createElement('div');
  div.className = 'field-row';
  div.dataset.ckey = key;
  div.dataset.ctype = typ;
  div.style.cssText = 'align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border1)';
  div.innerHTML = `<span style="font-size:11px;background:var(--bg3);border-radius:3px;padding:2px 5px;color:var(--muted)">${typ}</span><span style="flex:1;font-size:13px">${lbl}</span><button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1" onclick="this.closest('[data-ckey]').remove()">×</button>`;
  document.getElementById('custom-fields-list').appendChild(div);
  document.getElementById('cfl-label').value = '';
  document.getElementById('custom-add-form').style.display = 'none';
}

const FIELD_RECOMMENDATIONS = {
  account: {
    'Credit Card':    ['creditLimit','minPayment','apr','cashAdvanceApr','annualFee','statementOpen','statementClose','autopayDate','autopayType','autopayFixed','rewardsType','rewardsRate','pointsBalance'],
    '401k':           ['balance','balanceDate','employerMatch'],
    'HSA':            ['balance','balanceDate','hsaCoverage'],
    'Roth IRA':       ['balance','balanceDate'],
    'Traditional IRA':['balance','balanceDate'],
    'Checking':       ['balance','balanceDate','institution','owner'],
    'Savings':        ['balance','balanceDate','institution','owner'],
    'Brokerage':      ['balance','balanceDate','institution','owner'],
    '_default':       ['institution','accountType','owner','last4','balance','balanceDate'],
  },
  contact: ['role','email','phone','linkedin'],
  company: ['industry','website','location'],
  event:   ['date','time','endTime','location'],
};

function getRecommendedFieldKeys(typeId) {
  const rec = getRecord(currentRecordId);
  const recs = FIELD_RECOMMENDATIONS[typeId];
  if (!recs) return [];
  if (Array.isArray(recs)) return recs;
  const acctType = rec?.fields?.accountType;
  return recs[acctType] || recs['_default'] || [];
}

// Edit type schema modal — field library picker
function openEditTypeSchema(typeId) {
  const existing = TYPE_SCHEMAS.find(s => s.id === typeId);
  const schema = existing || (DEFAULT_FIELD_SCHEMAS[typeId] ? { id: typeId, ...DEFAULT_FIELD_SCHEMAS[typeId] } : null);
  if (!schema) return;
  const preserved = schema.fields.filter(f => f.type === 'company-link');
  const activeKeys = new Set(schema.fields.filter(f => f.type !== 'company-link').map(f => f.key));
  const libraryKeys = new Set(FIELD_LIBRARY.map(f => f.key));
  const customActive = schema.fields.filter(f => f.type !== 'company-link' && !libraryKeys.has(f.key));
  const FIELD_TYPES = ['text','textarea','number','date','time','url','email','tel'];

  const PILL_ON  = 'background:var(--accent);color:#fff;border:1px solid var(--accent)';
  const PILL_OFF = 'background:transparent;color:var(--text);border:1px solid var(--border1)';
  const pillStyle = 'border-radius:20px;padding:4px 12px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;transition:all .15s';

  function fieldPill(f, on) {
    return `<button data-fkey="${f.key}" onclick="toggleFieldLibPill(this)" style="${pillStyle};${on ? PILL_ON : PILL_OFF}">${f.label}${on ? '<span style="opacity:0.6;font-size:10px">×</span>' : ''}</button>`;
  }

  const categories = [...new Set(FIELD_LIBRARY.map(f => f.category))];
  const libraryHTML = categories.map(cat => {
    const entries = FIELD_LIBRARY.filter(f => f.category === cat);
    const uid = 'fg-' + cat.toLowerCase();
    return `<div style="margin-bottom:4px">
      <div onclick="const b=document.getElementById('${uid}');const open=b.style.display!=='none';b.style.display=open?'none':'block';this.querySelector('.chev').textContent=open?'▶':'▼';"
        style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:7px 4px;border-radius:6px;user-select:none" onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">
        <span class="chev" style="font-size:10px;color:var(--muted)">▶</span>
        <span style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em">${cat}</span>
      </div>
      <div id="${uid}" style="display:none;padding:6px 4px 8px">
        <div style="display:flex;flex-wrap:wrap;gap:6px">${entries.map(f => fieldPill(f, activeKeys.has(f.key))).join('')}</div>
      </div>
    </div>`;
  }).join('');

  const customRows = customActive.map(f =>
    `<div class="field-row" data-ckey="${f.key}" data-ctype="${f.type}" style="align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border1)">
      <span style="font-size:11px;background:var(--bg3);border-radius:3px;padding:2px 5px;color:var(--muted)">${f.type}</span>
      <span style="flex:1;font-size:13px">${f.label}</span>
      <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1" onclick="this.closest('[data-ckey]').remove()">×</button>
    </div>`
  ).join('');

  const activeLibFields = FIELD_LIBRARY.filter(f => activeKeys.has(f.key));
  const activeSummary = (activeLibFields.length || customActive.length)
    ? `<div id="field-active-section" style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border1)">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Active</div>
        <div id="field-active-pills" style="display:flex;flex-wrap:wrap;gap:6px">
          ${activeLibFields.map(f => fieldPill(f, true)).join('')}
          ${customActive.map(f => `<span style="${pillStyle};${PILL_ON}">${f.label}<span style="opacity:0.6;font-size:10px">×</span></span>`).join('')}
        </div>
      </div>`
    : `<div id="field-active-section" style="display:none"></div>`;

  const recKeys = getRecommendedFieldKeys(typeId).filter(k => !activeKeys.has(k));
  const recEntries = recKeys.map(k => FIELD_LIBRARY.find(f => f.key === k)).filter(Boolean);
  const recommendedHTML = recEntries.length
    ? `<div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid var(--border1)">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Recommended</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px">${recEntries.map(f => fieldPill(f, false)).join('')}</div>
      </div>`
    : '';

  openModal('Field library', `
    <div style="max-height:420px;overflow-y:auto;padding-right:4px">
      ${activeSummary}
      ${recommendedHTML}
      ${libraryHTML}
      <div style="margin-bottom:16px">
        <div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.07em;margin-bottom:8px">Custom</div>
        <div id="custom-fields-list">${customRows}</div>
        <div id="custom-add-form" style="display:none;gap:6px;align-items:center;margin-top:8px">
          <input class="modal-input" id="cfl-label" placeholder="Field name" style="flex:1">
          <select class="modal-select" id="cfl-type" style="width:90px">${FIELD_TYPES.map(t=>`<option>${t}</option>`).join('')}</select>
          <button class="btn btn-sm btn-primary" onclick="addCustomFieldRow()">Add</button>
        </div>
        <button class="btn btn-sm" style="margin-top:8px" onclick="const f=document.getElementById('custom-add-form');f.style.display=f.style.display==='none'?'flex':'none'">+ Create custom field</button>
      </div>
    </div>`,
    [{ label: 'Save', primary: true, onclick: async () => {
      const newFields = [];
      let order = 1;
      // Library fields that are toggled on (dedupe by key — active section + category may both have same key)
      const seenKeys = new Set();
      document.querySelectorAll('[data-fkey]').forEach(el => {
        const on = el.style.cssText.includes('var(--accent)');
        if (on && !seenKeys.has(el.dataset.fkey)) {
          seenKeys.add(el.dataset.fkey);
          const entry = FIELD_LIBRARY.find(f => f.key === el.dataset.fkey);
          if (entry) newFields.push({ key: entry.key, label: entry.label, type: entry.type, order: order++ });
        }
      });
      // Custom fields
      document.querySelectorAll('#custom-fields-list [data-ckey]').forEach(el => {
        const key = el.dataset.ckey;
        const type = el.dataset.ctype;
        const label = el.querySelector('span:nth-child(2)')?.textContent?.trim() || key;
        if (key) newFields.push({ key, label, type, order: order++ });
      });
      const allFields = [...preserved, ...newFields];
      await api('PUT', `/api/type-schemas/${typeId}`, { name: schema.name, icon: schema.icon, fields: allFields });
      TYPE_SCHEMAS = await api('GET', '/api/type-schemas');
      closeModal();
      tourNotify('schema-saved');
      renderRecordView(currentRecordId);
    }},
    { label: 'Cancel', onclick: closeModal }]);
}

function highlightDetailsSection(typeId) {
  const card = document.querySelector('.record-main .section-card');
  if (!card) return;
  card.style.transition = 'box-shadow .3s';
  card.style.boxShadow = '0 0 0 3px var(--accent)';
  const tip = document.createElement('div');
  tip.style.cssText = 'position:absolute;z-index:9000;background:var(--bg2);border:1px solid var(--accent);border-radius:10px;padding:12px 16px;font-size:13px;color:var(--text);box-shadow:0 4px 16px rgba(0,0,0,.3);max-width:240px';
  tip.innerHTML = `<div style="font-weight:600;margin-bottom:6px">Details updated</div><div style="color:var(--muted);font-size:12px;margin-bottom:10px">These fields apply to every ${typeId} record.</div><button class="tour-cta" style="font-size:12px" onclick="this.closest('[style*=z-index]').remove();document.querySelector('.section-card[style*=box-shadow]')&&(document.querySelector('.section-card[style*=box-shadow]').style.boxShadow='')">Got it</button>`;
  const rect = card.getBoundingClientRect();
  tip.style.left = (rect.left + window.scrollX + 16) + 'px';
  tip.style.top = (rect.top + window.scrollY - 10) + 'px';
  document.body.appendChild(tip);
}

// Create custom record type
function promptCreateCustomType() {
  openModal('New record type', `
    <div class="modal-field"><div class="modal-label">Type name</div><input class="modal-input" id="ct-name" autofocus placeholder="e.g. Book, Recipe, Vehicle"></div>
    <div class="modal-field"><div class="modal-label">Icon (emoji)</div><input class="modal-input" id="ct-icon" placeholder="📖" style="font-size:18px;width:80px"></div>`,
    [{ label: 'Create', primary: true, onclick: async () => {
      const name = document.getElementById('ct-name').value.trim();
      const icon = document.getElementById('ct-icon').value.trim() || '📁';
      if (!name) return;
      const schema = await api('POST', '/api/type-schemas', { name, icon, fields: [
        { key: 'notes', label: 'Notes', type: 'textarea', order: 1 }
      ]});
      TYPE_SCHEMAS.push(schema);
      closeModal();
      openEditTypeSchema(schema.id);
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => document.getElementById('ct-name')?.focus(), 50);
}

function renderTimeline(r) {
  const entries = [...(r.timeline || [])].sort((a,b) => b.date.localeCompare(a.date));
  return `<div id="tl-${r.id}">
    ${entries.map(e => `<div class="timeline-entry">
      <div class="timeline-dot"></div>
      <div class="timeline-body">
        <div class="timeline-text">${e.text}</div>
        <div class="timeline-date">${formatDateTime(e.date)}</div>
      </div>
    </div>`).join('') || '<div class="empty">No history yet.</div>'}
  </div>
  <div class="timeline-add">
    <input type="text" placeholder="Add note..." id="tl-input-${r.id}" onkeydown="if(event.key==='Enter')addTimelineEntry('${r.id}')">
    <button class="btn btn-sm" onclick="addTimelineEntry('${r.id}')">Add</button>
  </div>`;
}

function formatSalary(raw) {
  if (!raw) return '';
  const stripped = String(raw).replace(/[$,\s]/g, '');
  if (!stripped) return '';
  // Handle range like 85000-110000 or 85000–110000
  const rangeParts = stripped.split(/[-–]/);
  if (rangeParts.length === 2 && rangeParts.every(p => /^\d+$/.test(p.trim()))) {
    return rangeParts.map(p => '$' + Number(p.trim()).toLocaleString()).join('–');
  }
  if (/^\d+$/.test(stripped)) return '$' + Number(stripped).toLocaleString();
  // Keep as-is if it's already formatted or has text
  return raw.startsWith('$') ? raw : '$' + raw;
}

function editableField(r, key, label, type = 'text') {
  const val = r.fields?.[key] || '';
  const stepAttr = type === 'time' ? 'step="900"' : '';
  if (type === 'company-link') {
    return `<div class="field-row">
      <div class="field-label">${label}</div>
      <div class="field-value">
        <div style="position:relative">
          <input class="field-edit" style="width:100%" value="${escapeHtml(val)}" placeholder="Type company name..."
            id="company-input-${r.id}"
            oninput="showCompanySuggestions(this,'${r.id}')"
            onblur="hideCompanySuggestions('${r.id}')"
            onkeydown="companyInputKey(event,'${r.id}')">
          <div id="company-suggestions-${r.id}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;z-index:50;max-height:150px;overflow-y:auto"></div>
        </div>
        <div style="margin-top:4px">${linkableCompany(val, r.companyId)}</div>
      </div>
    </div>`;
  }
  if (type === 'textarea') {
    return `<div class="field-row" style="align-items:flex-start">
      <div class="field-label" style="padding-top:6px">${label}</div>
      <div class="field-value">
        <textarea class="field-edit" rows="3" style="resize:vertical;width:100%" placeholder="—"
          onblur="saveFieldText('${r.id}','${key}',this.value)">${escapeHtml(val)}</textarea>
      </div>
    </div>`;
  }
  if (key === 'salary') {
    const display = formatSalary(val);
    return `<div class="field-row">
      <div class="field-label">${label}</div>
      <div class="field-value">
        <input class="field-edit" type="text" value="${escapeHtml(display)}" placeholder="$85,000"
          onfocus="this.value=this.value.replace(/[$,]/g,'')"
          onblur="this.value=formatSalary(this.value);saveFieldText('${r.id}','${key}',this.value)">
      </div>
    </div>`;
  }
  return `<div class="field-row">
    <div class="field-label">${label}</div>
    <div class="field-value">
      <input class="field-edit" type="${type}" value="${escapeHtml(val)}" placeholder="—" ${stepAttr}
        onblur="saveFieldText('${r.id}','${key}',this.value)">
    </div>
  </div>`;
}

// â"€â"€ FIELD SAVES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
async function setCCAutopayType(recordId, type, btn) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.autopayType = type;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  renderRecordView(recordId);
}

async function saveCCAutopayFixed(recordId, value) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.autopayFixed = value;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
}

async function savePasteContent(recordId, value) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields._pasteContent = value;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
}

async function moveRecordArea(recordId, newAreaId) {
  const r = getRecord(recordId);
  if (!r || r.areaId === newAreaId) return;
  r.areaId = newAreaId;
  await api('PUT', `/api/records/${recordId}`, { areaId: newAreaId });
  renderSidebar();
}


async function addTaxDoc(recordId, form, year) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.taxDocs = r.fields.taxDocs || [];
  r.fields.taxDocs.push({ form, year, status: 'pending' });
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  renderRecordView(recordId);
}

async function cycleTaxDocStatus(recordId, idx) {
  const r = getRecord(recordId);
  if (!r) return;
  const statuses = ['pending','received','filed'];
  const doc = r.fields.taxDocs?.[idx];
  if (!doc) return;
  doc.status = statuses[(statuses.indexOf(doc.status) + 1) % statuses.length];
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  renderRecordView(recordId);
}

async function deleteTaxDoc(recordId, idx) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.taxDocs?.splice(idx, 1);
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  renderRecordView(recordId);
}

function editAnnualContrib(recordId, year, el) {
  const r = getRecord(recordId);
  if (!r) return;
  const current = Number((r.fields.annualContribs||{})[year])||0;
  const input = document.createElement('input');
  input.value = current||'';
  input.style.cssText = 'width:70px;background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:1px 4px;color:var(--text);font-size:11px;text-align:right;outline:none';
  el.replaceWith(input);
  input.focus(); input.select();
  let done = false;
  const commit = async () => {
    if (done) return; done = true;
    const num = parseFloat(input.value.replace(/[$,\s]/g,''));
    const newSpan = document.createElement('span');
    newSpan.className = 'ira-annual-val';
    newSpan.style.cssText = 'cursor:pointer;text-decoration:underline dotted';
    newSpan.title = 'Click to edit';
    newSpan.setAttribute('onclick', `editAnnualContrib('${recordId}',${year},this)`);
    if (isNaN(num)) { newSpan.textContent = `$${current.toLocaleString()}`; input.replaceWith(newSpan); return; }
    r.fields.annualContribs = r.fields.annualContribs||{};
    r.fields.annualContribs[year] = num;
    newSpan.textContent = `$${num.toLocaleString()}`;
    input.replaceWith(newSpan);
    pushUndo(`Edit ${year} IRA contribution`, async () => {
      const r2 = getRecord(recordId);
      if (r2) { r2.fields.annualContribs = r2.fields.annualContribs||{}; r2.fields.annualContribs[year] = current; await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
    }, async () => {
      const r2 = getRecord(recordId);
      if (r2) { r2.fields.annualContribs = r2.fields.annualContribs||{}; r2.fields.annualContribs[year] = num; await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
    });
    await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
    renderRecordView(recordId);
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => { if (e.key==='Enter') input.blur(); if (e.key==='Escape'){done=true;input.replaceWith(el);} });
}

function activateHistCell(span, recordId, month, field) {
  const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtPct = n => (n>=0?'+':'')+Number(n).toFixed(2)+'%';
  const raw = span.textContent.replace(/[$,%+\s]/g, '');
  const input = document.createElement('input');
  input.value = raw === '—' ? '' : raw;
  input.style.cssText = 'width:80px;background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:2px 5px;color:var(--text);font-size:12px;text-align:right;outline:none';
  span.replaceWith(input);
  input.focus();
  input.select();
  let committed = false;
  const commit = async () => {
    if (committed) return;
    committed = true;
    const r = getRecord(recordId);
    const entry = r && (r.fields.history || []).find(h => h.month === month);
    const num = parseFloat(input.value.replace(/[$,%+\s]/g,''));
    const newSpan = document.createElement('span');
    newSpan.className = 'hist-cell';
    newSpan.title = 'Click to edit';
    newSpan.style.cssText = 'cursor:pointer;border-radius:3px;padding:1px 3px';
    newSpan.setAttribute('onclick', `activateHistCell(this,'${recordId}','${month}','${field}')`);
    if (!entry || isNaN(num)) {
      newSpan.textContent = span.textContent;
      input.replaceWith(newSpan);
      return;
    }
    const oldEntry = { ...entry };
    entry[field] = num;
    const begin = Number(entry.beginBalance) || 0;
    const end = Number(entry.endBalance) || 0;
    const contrib = Number(entry.contributions) || 0;
    const base = begin + contrib;
    entry.returnPct = base === 0 ? 0 : (end - base) / base * 100;
    // Update display immediately
    if (field === 'contributions') newSpan.textContent = num > 0 ? fmt(num) : '—';
    else if (field === 'returnPct') newSpan.textContent = fmtPct(entry.returnPct);
    else newSpan.textContent = fmt(num);
    input.replaceWith(newSpan);
    // Update return cell in same row
    const row = newSpan.closest('tr');
    if (row) {
      const retCell = row.querySelector('.hist-cell-return');
      if (retCell) retCell.textContent = fmtPct(entry.returnPct);
    }
    const newEntry = { ...entry };
    pushUndo(`Edit ${month} ${field}`, async () => {
      const r2 = getRecord(recordId);
      const e2 = r2 && (r2.fields.history || []).find(h => h.month === month);
      if (e2) { Object.assign(e2, oldEntry); await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
    }, async () => {
      const r2 = getRecord(recordId);
      const e2 = r2 && (r2.fields.history || []).find(h => h.month === month);
      if (e2) { Object.assign(e2, newEntry); await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
    });
    api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { committed = true; input.replaceWith(span); }
  });
}

async function deleteHistoryRow(recordId, month) {
  const r = getRecord(recordId);
  if (!r) return;
  const deleted = (r.fields.history || []).find(h => h.month === month);
  r.fields.history = (r.fields.history || []).filter(h => h.month !== month);
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  if (deleted) pushUndo(`Delete ${month} history`, async () => {
    const r2 = getRecord(recordId);
    r2.fields.history = r2.fields.history || [];
    r2.fields.history.push(deleted);
    r2.fields.history.sort((a,b) => a.month.localeCompare(b.month));
    await api('PUT', `/api/records/${recordId}`, { fields: r2.fields });
    renderRecordView(recordId);
  }, async () => {
    const r2 = getRecord(recordId);
    r2.fields.history = (r2.fields.history || []).filter(h => h.month !== month);
    await api('PUT', `/api/records/${recordId}`, { fields: r2.fields });
    renderRecordView(recordId);
  });
  renderRecordView(recordId);
}

async function saveField(recordId, key, value) {
  const r = getRecord(recordId);
  if (!r || r[key] === value) return;
  const oldValue = r[key];
  r[key] = value;
  await api('PUT', `/api/records/${recordId}`, { [key]: value });
  pushUndo(`Edit ${key}`, async () => {
    const r2 = getRecord(recordId);
    if (r2) { r2[key] = oldValue; await api('PUT', `/api/records/${recordId}`, { [key]: oldValue }); renderRecordView(recordId); }
  }, async () => {
    const r2 = getRecord(recordId);
    if (r2) { r2[key] = value; await api('PUT', `/api/records/${recordId}`, { [key]: value }); renderRecordView(recordId); }
  });
}

async function saveFieldText(recordId, key, value) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields = r.fields || {};
  let nextValue = value;
  if (key === 'time' || key === 'endTime') nextValue = roundToQuarterHour(value);
  if (r.type === 'event' && key === 'time' && nextValue && r.fields.endTime) {
    const s = parseTimeToMinutes(nextValue), e = parseTimeToMinutes(r.fields.endTime);
    if (s !== null && e !== null && e <= s) r.fields.endTime = defaultEndTimeFromStart(nextValue, 60);
  }
  if (r.type === 'event' && key === 'endTime' && nextValue && r.fields.time) {
    const s = parseTimeToMinutes(r.fields.time), e = parseTimeToMinutes(nextValue);
    if (s !== null && e !== null && e <= s) nextValue = defaultEndTimeFromStart(r.fields.time, 60);
  }
  if (r.fields[key] === nextValue) return;
  const oldValue = r.fields[key];
  r.fields[key] = nextValue;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  pushUndo(`Edit ${key}`, async () => {
    const r2 = getRecord(recordId);
    if (r2) { r2.fields[key] = oldValue; await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
  }, async () => {
    const r2 = getRecord(recordId);
    if (r2) { r2.fields[key] = nextValue; await api('PUT', `/api/records/${recordId}`, { fields: r2.fields }); renderRecordView(recordId); }
  });
}

async function addTimelineEntry(recordId) {
  const input = document.getElementById(`tl-input-${recordId}`);
  const text = input?.value?.trim();
  if (!text) return;
  input.value = '';
  const r = await api('POST', `/api/records/${recordId}/timeline`, { text });
  DB.records = DB.records.map(rec => rec.id === recordId ? r : rec);
  renderRecordView(recordId);
}

async function changeStatus(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  const statuses = ['applied','interviewing','awaiting','offer','rejected','withdrawn'];
  openModal('Change status', `
    <div class="modal-field">
      <select class="modal-select" id="status-select">
        ${statuses.map(s => `<option value="${s}" ${r.status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>`,
    [{ label: 'Save', primary: true, onclick: async () => {
      const val = document.getElementById('status-select').value;
      r.status = val;
      r.urgency = 'none';
      await api('PUT', `/api/records/${recordId}`, { status: val, urgency: 'none' });
      await api('POST', `/api/records/${recordId}/timeline`, { text: `Status changed to: ${val}` });
      closeModal();
      renderSidebar();
      // Navigate back to area so the record immediately appears in the right place
      navigate('area', r.areaId);
    }},
    { label: 'Cancel', onclick: closeModal }]);
}

async function addInterview(recordId) {
  openModal('Add interview', `
    <div class="modal-field"><div class="modal-label">Round #</div><input class="modal-input" id="i-round" type="number" value="1" min="1"></div>
    <div class="modal-field"><div class="modal-label">Date</div><input class="modal-input" id="i-date" type="date"></div>
    <div class="modal-field"><div class="modal-label">Time</div>${timePickerHTML('i-time')}</div>
    <div class="modal-field"><div class="modal-label">Interviewer(s)</div><input class="modal-input" id="i-interviewer" placeholder="Name(s)"></div>
    <div class="modal-field"><div class="modal-label">Format</div><input class="modal-input" id="i-format" placeholder="Phone / Video / In-person"></div>
    <div class="modal-field"><div class="modal-label">Location / Platform</div><input class="modal-input" id="i-location"></div>
    <div class="modal-field"><div class="modal-label">Meeting link</div><input class="modal-input" id="i-link" type="url"></div>
    <div class="modal-field"><div class="modal-label">Notes</div><textarea class="modal-input" id="i-notes"></textarea></div>`,
    [{ label: 'Add interview', primary: true, onclick: async () => {
      const r = DB.records.find(r => r.id === recordId);
      const time = to24Hour(document.getElementById('i-time-h').value, document.getElementById('i-time-m').value, document.getElementById('i-time-ap').value);
      const interview = {
        id: Date.now().toString(36),
        round: parseInt(document.getElementById('i-round').value) || 1,
        date: document.getElementById('i-date').value,
        time: time,
        interviewer: document.getElementById('i-interviewer').value,
        format: document.getElementById('i-format').value,
        location: document.getElementById('i-location').value,
        link: document.getElementById('i-link').value,
        notes: document.getElementById('i-notes').value,
      };
      r.interviews = r.interviews || [];
      r.interviews.push(interview);
      await api('PUT', `/api/records/${recordId}`, { interviews: r.interviews });
      // Also create a linked event
      if (interview.date) {
        const ev = await api('POST', '/api/records', {
          type: 'event', areaId: r.areaId, urgency:'new',
          title: `${r.title} — Interview Rd ${interview.round}`,
          status: 'upcoming', priority: 1,
          fields: { date: interview.date, time: interview.time, location: interview.location, link: interview.link, category: 'interview', notes: interview.notes },
          links: [recordId]
        });
        r.links = r.links || [];
        r.links.push(ev.id);
        await api('PUT', `/api/records/${recordId}`, { links: r.links });
        DB.records.push(ev);
      }
      await api('POST', `/api/records/${recordId}/timeline`, { text: `Interview Rd ${interview.round} added — ${formatDate(interview.date)}` });
      const updated = await api('GET', `/api/records/${recordId}`);
      DB.records = DB.records.map(rec => rec.id === recordId ? updated : rec);
      closeModal();
      renderRecordView(recordId);
    }},
    { label: 'Cancel', onclick: closeModal }]);
}

async function linkContact(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  const alreadyLinked = r.contacts || [];
  const contacts = DB.records.filter(c => c.type === 'contact' && !alreadyLinked.includes(c.id));

  // Build searchable browse modal
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-title').textContent = 'Link contact';
  document.getElementById('modal').style.maxWidth = '480px';

  function renderContactList(search) {
    const filtered = contacts.filter(c =>
      !search || c.title.toLowerCase().includes(search.toLowerCase()) ||
      (c.fields.company||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.fields.role||'').toLowerCase().includes(search.toLowerCase())
    );
    return filtered.map(ct => {
      const area = DB.areas.find(a => a.id === ct.areaId);
      return `<div class="record-card" onclick="doLinkContact('${recordId}','${ct.id}')" style="margin-bottom:6px;cursor:pointer">
        <div class="record-card-icon">&#x1F464;</div>
        <div class="record-card-body">
          <div class="record-card-title">${ct.title}</div>
          <div class="record-card-sub">${[ct.fields.role, ct.fields.company].filter(Boolean).join(' · ')}</div>
        </div>
        ${area ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${area.color}18;color:${area.color};border:1px solid ${area.color}44">${area.title}</span>` : ''}
      </div>`;
    }).join('') || '<div class="empty">No contacts found.</div>';
  }

  document.getElementById('modal-body').innerHTML = `
    <input class="modal-input" id="contact-search" placeholder="Search contacts..." style="margin-bottom:12px" oninput="document.getElementById('contact-browse-list').innerHTML=renderContactListSearch('${recordId}',this.value)">
    <div id="contact-browse-list" style="max-height:300px;overflow-y:auto">${renderContactList('')}</div>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn btn-p btn-sm" onclick="closeModal();promptAddRecord('contact')">+ New contact</button>
    </div>`;

  document.getElementById('modal-actions').innerHTML = '<button class="btn" onclick="closeModal()">Cancel</button>';
  document.getElementById('modal').style.maxWidth = '480px';
  setTimeout(() => document.getElementById('contact-search')?.focus(), 50);

  // Store renderContactList in window for inline call
  window.renderContactListSearch = (rid, search) => renderContactList(search);
}
async function linkContactToCompany(companyId) {
  const co = DB.records.find(r => r.id === companyId);
    const alreadyLinked = DB.records.filter(r => r.type === 'contact' && r.companyId === companyId).map(r => r.id);
  const contacts = DB.records.filter(r => r.type === 'contact' && !alreadyLinked.includes(r.id));

  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-title').textContent = 'Link contact to ' + (co?.title || 'company');
  document.getElementById('modal').style.maxWidth = '480px';

  function renderList(search) {
    const filtered = contacts.filter(ct =>
      !search ||
      ct.title.toLowerCase().includes(search.toLowerCase()) ||
      (ct.fields.role||'').toLowerCase().includes(search.toLowerCase())
    );
    if (!filtered.length) return '<div class="empty">No contacts found.</div>';
    return filtered.map(ct => {
      const area = DB.areas.find(a => a.id === ct.areaId);
      return `<div class="record-card" onclick="doLinkContactToCompany('${companyId}','${ct.id}')" style="margin-bottom:6px;cursor:pointer">
        <div class="record-card-icon">&#x1F464;</div>
        <div class="record-card-body">
          <div class="record-card-title">${ct.title}</div>
          <div class="record-card-sub">${[ct.fields.role, ct.fields.company].filter(Boolean).join(' · ')}</div>
        </div>
        ${area ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:${area.color}18;color:${area.color};border:1px solid ${area.color}44">${area.title}</span>` : ''}
      </div>`;
    }).join('');
  }

  window._linkCoContactRenderList = renderList;

  document.getElementById('modal-body').innerHTML = `
    <input class="modal-input" id="co-contact-search" placeholder="Search contacts..." style="margin-bottom:12px"
      oninput="document.getElementById('co-contact-list').innerHTML=window._linkCoContactRenderList(this.value)">
    <div id="co-contact-list" style="max-height:300px;overflow-y:auto">${renderList('')}</div>
    <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn btn-p btn-sm" onclick="closeModal();promptAddRecord('contact')">+ New contact</button>
    </div>`;
  const _coActs = document.getElementById('modal-actions'); _coActs.innerHTML='';
  const _coCb = document.createElement('button'); _coCb.className='btn'; _coCb.textContent='Cancel';
  _coCb.onclick = () => { closeModal(); document.getElementById('modal').style.maxWidth=''; };
  _coActs.appendChild(_coCb);
  setTimeout(() => document.getElementById('co-contact-search')?.focus(), 50);
}

async function doLinkContactToCompany(companyId, contactId) {
  const ct = DB.records.find(r => r.id === contactId);
  if (!ct) return;
  ct.companyId = companyId;
  // Also update the company field text to match
  if (!ct.fields.company) {
    const co = DB.records.find(r => r.id === companyId);
    if (co) { ct.fields.company = co.title; }
  }
  await api('PUT', `/api/records/${contactId}`, { companyId, fields: ct.fields });
  closeModal();
  document.getElementById('modal').style.maxWidth = '';
  renderRecordView(companyId);
}

async function doLinkContact(recordId, contactId) {
  const r = DB.records.find(r => r.id === recordId);
  r.contacts = r.contacts || [];
  if (!r.contacts.includes(contactId)) {
    r.contacts.push(contactId);
    await api('PUT', `/api/records/${recordId}`, { contacts: r.contacts });
    const updated = await api('GET', `/api/records/${recordId}`);
    DB.records = DB.records.map(rec => rec.id === recordId ? updated : rec);
  }
  closeModal();
  document.getElementById('modal').style.maxWidth = '';
  renderRecordView(recordId);
}

// addDocument replaced by drag-and-drop upload

// â"€â"€ ADD RECORD / AREA â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function promptAddRecord(forceType, targetAreaId = null) {
  const areaId = targetAreaId || currentAreaId;
  const type = forceType || (areaId === 'area-jobs' ? 'job' : null);
  if (type === 'job' || (!forceType && areaId === 'area-jobs')) { openJobModal(areaId); return; }
  if (type === 'company') { openAddCompanyModal(areaId); return; }
  const builtinTypes = (tour?.active ? ['contact','event','goal','task','project','note','account'] : ['job','contact','event','goal','task','project','note','company','account']);
  const customTypes = TYPE_SCHEMAS.filter(s => s.is_custom).map(s => s.id);
  const allTypes = [...builtinTypes, ...customTypes];
  // If area has sub-areas, show only sub-areas in picker; otherwise show all
  const children = DB.areas.filter(a => a.parentId === areaId);
  const areaOptions = children.length > 0 ? children : DB.areas.filter(a => !DB.areas.some(p => p.parentId === a.id) || a.id === areaId);
  const defaultArea = children.length > 0 ? children[0].id : areaId;
  openModal('New record', `
    <div class="modal-field"><div class="modal-label">Title</div><input class="modal-input" id="nr-title" placeholder="Record name" autofocus></div>
    <div class="modal-field"><div class="modal-label">Type</div>
      <select class="modal-select" id="nr-type">
        ${allTypes.map(t => `<option value="${t}" ${forceType === t ? 'selected' : ''}>${capitalize(t)}</option>`).join('')}
      </select>
      <button class="btn btn-sm" style="margin-top:6px;font-size:11px" onclick="closeModal();promptCreateCustomType()">+ New type</button>
    </div>
    <div class="modal-field"><div class="modal-label">Area</div>
      <select class="modal-select" id="nr-area">
        ${areaOptions.map(a => `<option value="${a.id}" ${a.id === defaultArea ? 'selected' : ''}>${a.title}</option>`).join('')}
      </select>
    </div>`,
    [{ label: 'Create', primary: true, onclick: async (e) => {
      const btn = e?.target || document.querySelector('#modal-actions .btn-p');
      if (btn?.disabled) return;
      const title = document.getElementById('nr-title').value.trim();
      const t = document.getElementById('nr-type').value;
      const aid = document.getElementById('nr-area').value;
      if (!title) return;
      if (t === 'job') { closeModal(); openJobModal(aid); return; }
      if (t === 'company') { closeModal(); openAddCompanyModal(aid); return; }
      if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
      // Build default fields from schema if available, else use legacy defaults
      const schema = TYPE_SCHEMAS.find(s => s.id === t);
      const schemaDefaults = schema ? Object.fromEntries(schema.fields.map(f => [f.key, ''])) : null;
      const legacyDefaults = { contact:{role:'',company:'',email:'',phone:'',linkedin:'',notes:''}, event:{date:'',time:'',endTime:'',location:'',link:'',category:'',notes:''}, goal:{targetDate:'',progress:'',notes:''}, task:{frequency:'',lastDone:'',nextDue:'',notes:''}, project:{description:'',nextAction:'',notes:''}, note:{body:'',notes:''}, account:{institution:'',accountType:'',owner:'',last4:'',balance:'',balanceDate:'',notes:''} };
      const rec = await api('POST', '/api/records', { type:t, areaId:aid, title, urgency:'new', fields: schemaDefaults || legacyDefaults[t] || {}, contacts:t==='job'?[]:undefined, interviews:t==='job'?[]:undefined, documents:t==='job'?[]:undefined });
      DB.records.push(rec);
      if (tour.active) { tourCreated.recordIds.push(rec.id); _saveTourCreated(); }
      assistantNotify('record-created', rec);
      tourNotify('record-created');
      if (!tour.active) showTourTip('urgency-flag', '.urgency-widget', 'Flag what needs attention', 'Use the <b>Flag</b> widget to mark urgent items — they surface on your dashboard automatically.', 'bottom');
      pushUndo(`Create ${title}`, async () => {
        rec.deletedAt = new Date().toISOString();
        await api('DELETE', `/api/records/${rec.id}`);
        DB.records = DB.records.filter(r => r.id !== rec.id);
        renderSidebar();
        if (currentView === 'record' && currentRecordId === rec.id) navigate('dashboard');
        else if (currentView === 'area') renderAreaView(currentAreaId);
      }, async () => {
        await api('POST', `/api/records/${rec.id}/restore`);
        rec.deletedAt = null;
        DB.records.push(rec);
        renderSidebar();
        navigate('record', aid, rec.id);
      });
      closeModal(); renderSidebar(); navigate('record', aid, rec.id);
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => document.getElementById('nr-title')?.focus(), 50);
}


async function promptAddArea(parentId = null) {
  const PALETTE = [
    '#e05555','#d4943a','#4caf7d','#d4705a','#9b7fd4','#c4607a',
    '#5b9bd5','#4db6ac','#8d6e63','#78909c','#7cb342','#e8834a',
  ];
  const usedColors = new Set(DB.areas.map(a => (a.color || '').toLowerCase()));
  const defaultColor = PALETTE.find(c => !usedColors.has(c.toLowerCase())) || PALETTE[0];
  const swatches = PALETTE.map(c =>
    `<span class="color-swatch${usedColors.has(c.toLowerCase()) ? ' cs-used' : ''}" data-color="${c}" style="background:${c}" onclick="selectAreaColor('${c}')"></span>`
  ).join('');
  const parentArea = parentId ? DB.areas.find(a => a.id === parentId) : null;

  openModal(parentArea ? `New sub-area in ${parentArea.title}` : 'New area', `
    ${!parentArea ? `<div style="margin-bottom:14px"><button class="btn btn-sm" style="width:100%;justify-content:center" onclick="openTemplateBrowser()">✦ Browse templates</button></div>` : ''}
    <div class="modal-field"><div class="modal-label">Name</div><input class="modal-input" id="na-title" placeholder="${parentArea ? 'Sub-area name' : 'Area name'}" autofocus></div>
    <div class="modal-field"><div class="modal-label">Color</div><div class="color-swatch-grid" id="na-swatch-grid">${swatches}</div><input type="hidden" id="na-color" value="${defaultColor}"></div>`,
    [{ label: 'Create', primary: true, onclick: async () => {
      const title = document.getElementById('na-title').value.trim();
      const color = document.getElementById('na-color').value;
      if (!title) return;
      const area = await api('POST', '/api/areas', { title, color, icon: '📁', order: DB.areas.length, parentId });
      DB.areas.push(area);
      closeModal();
      renderSidebar();
      assistantNotify('area-created', area);
      const isFirst = DB.areas.filter(a => a.id !== area.id).length === 0;
      if (isFirst && !tour.active) showTourTip('first-area', '#sidebar-areas', 'Organize your areas', 'Drag areas in the sidebar to reorder them. Click an area name to expand or collapse it.', 'right');
      pushUndo(`Create area "${title}"`, async () => {
        area.deletedAt = new Date().toISOString();
        await api('DELETE', `/api/areas/${area.id}`);
        DB.areas = DB.areas.filter(a => a.id !== area.id);
        renderSidebar();
        if (currentAreaId === area.id) navigate('dashboard');
      }, async () => {
        await api('POST', `/api/areas/${area.id}/restore`);
        area.deletedAt = null;
        DB.areas.push(area);
        renderSidebar();
        navigate('area', area.id);
      });
      navigate('area', area.id);
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => { document.getElementById('na-title')?.focus(); selectAreaColor(defaultColor); }, 50);
}

function selectAreaColor(color) {
  document.querySelectorAll('#na-swatch-grid .color-swatch').forEach(el =>
    el.classList.toggle('cs-selected', el.dataset.color === color)
  );
  const inp = document.getElementById('na-color');
  if (inp) inp.value = color;
}

async function cycleUrgency(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  const next = { none:'new', new:'flagged', flagged:'priority', priority:'urgent', urgent:'none' };
  r.urgency = next[r.urgency||'none'];
  await api('PUT', `/api/records/${recordId}`, { urgency: r.urgency });
  renderRecordView(recordId);
  renderSidebar();
  if (currentView === 'dashboard') renderAttention();
}

async function markComplete(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.status = 'completed'; r.urgency = 'none';
  await api('PUT', `/api/records/${recordId}`, { status: 'completed', urgency: 'none' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Marked complete' });
  renderSidebar();
  navigate('area', r.areaId);
}

async function markArchived(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.status = 'archived'; r.urgency = 'none';
  await api('PUT', `/api/records/${recordId}`, { status: 'archived', urgency: 'none' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Archived' });
  renderSidebar();
  navigate('area', r.areaId);
}

async function unarchiveRecord(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.status = 'active';
  await api('PUT', `/api/records/${recordId}`, { status: 'active' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Unarchived' });
  renderSidebar();
  navigate('area', r.areaId);
}

async function deleteRecord(recordId) {
  const r = DB.records.find(rec => rec.id === recordId);
  if (!r) return;
  const label = r.title || r.fields?.company || 'Record';
  const areaId = r.areaId;

  // Optimistic: remove from view immediately
  r.deletedAt = new Date().toISOString();
  renderSidebar();
  if (currentAreaId) navigate('area', currentAreaId);
  else navigate('dashboard');

  // Toast with Ctrl+Z hint
  deleteToast(label, async () => {
    // Undo clicked directly from toast
    r.deletedAt = null;
    await api('POST', `/api/records/${recordId}/restore`);
    renderSidebar();
    navigate('area', areaId);
  });

  // Push to undo stack (Ctrl+Z)
  pushUndo(label, async () => {
    r.deletedAt = null;
    renderSidebar();
    navigate('area', areaId);
    api('POST', `/api/records/${recordId}/restore`);
  }, async () => {
    r.deletedAt = new Date().toISOString();
    renderSidebar();
    if (currentView === 'record' && currentRecordId === recordId) navigate('area', areaId);
    api('DELETE', `/api/records/${recordId}`);
  });

  tourNotify('record-deleted', { recordId, areaId });
  if (!tour.active) showTourTip('delete-undo', '#delete-toast', 'Deleted', 'Press <b>Ctrl+Z</b> to restore within 24 hours, or find it in <b>History → Recently Deleted</b>.', 'top');

  // Fire API in background
  api('DELETE', `/api/records/${recordId}`).catch(() => {
    // Rollback on failure
    r.deletedAt = null;
    renderSidebar();
  });
}

function promptAddEvent(targetAreaId = null) {
  const today = new Date().toISOString().split('T')[0];
  const defaultArea = targetAreaId || currentAreaId;
  const children = defaultArea ? DB.areas.filter(a => a.parentId === defaultArea) : [];
  const areaOptions = children.length > 0 ? children : DB.areas.filter(a => !DB.areas.some(p => p.parentId === a.id));
  const defaultAreaId = children.length > 0 ? children[0].id : defaultArea;
  const isTourCal = window.tour?.active && TOUR_STEPS[window.tour?.step]?.id === 'dash-cal';
  const tourTitle = isTourCal ? 'Dashboard tutorial' : '';
  openModal('New event', `
    <div class="modal-field"><div class="modal-label">Title</div><input class="modal-input" id="ev-title" autofocus value="${tourTitle}" ${isTourCal ? 'readonly style="opacity:0.7"' : ''}></div>
    <div class="modal-field"><div class="modal-label">Date</div><input class="modal-input" id="ev-date" type="date" value="${today}" style="font-size:14px"></div>
    <div class="modal-field"><div class="modal-label">Time</div>${timePickerHTML('ev-time')}</div>
    <div class="modal-field"><div class="modal-label">End time</div>${timePickerHTML('ev-endtime')}</div>
    <div class="modal-field"><div class="modal-label">Location / link</div><input class="modal-input" id="ev-loc"></div>
    <div class="modal-field"><div class="modal-label">Area</div>
      <select class="modal-select" id="ev-area">
        ${areaOptions.map(a => `<option value="${a.id}" ${a.id === defaultAreaId ? 'selected' : ''}>${a.title}</option>`).join('')}
      </select>
    </div>`,
    [{ label: 'Add event', primary: true, onclick: async () => {
      const title = document.getElementById('ev-title').value.trim();
      const date = document.getElementById('ev-date').value;
      if (!title || !date) return;
      const time = to24Hour(document.getElementById('ev-time-h').value, document.getElementById('ev-time-m').value, document.getElementById('ev-time-ap').value);
      const endTime = to24Hour(document.getElementById('ev-endtime-h').value, document.getElementById('ev-endtime-m').value, document.getElementById('ev-endtime-ap').value);
      const ev = await api('POST', '/api/records', {
        type: 'event', areaId: document.getElementById('ev-area').value, urgency:'new',
        title, status: 'upcoming', priority: 2,
        fields: {
          date,
          time: time || '',
          endTime: endTime || '',
          location: document.getElementById('ev-loc').value,
          link:'', category:'other', notes:''
        },
        links: []
      });
      DB.records.push(ev);
      tourCreated.recordIds.push(ev.id); _saveTourCreated();
      closeModal();
      tourNotify('event-created');
      renderSidebar();
      if (currentView === 'dashboard') renderDashboard();
      else if (currentView === 'calendar') renderCalFull();
      else if (currentView === 'area') renderAreaView(currentAreaId);
      else renderCalFull();
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => {
    const syncEnd = () => {
      const startH = document.getElementById('ev-time-h')?.value;
      const startM = document.getElementById('ev-time-m')?.value;
      const startAP = document.getElementById('ev-time-ap')?.value;
      if (!startH || startH === '0') return;
      const start24 = to24Hour(startH, startM, startAP);
      const startMins = parseTimeToMinutes(start24);
      const endMins = startMins + 60;
      const end24 = minutesToTime(endMins);
      const {hour: endH, minute: endM, ampm: endAP} = to12Hour(end24);
      document.getElementById('ev-endtime-h').value = endH;
      document.getElementById('ev-endtime-m').value = endM;
      document.getElementById('ev-endtime-ap').value = endAP;
    };
    document.getElementById('ev-time-h')?.addEventListener('change', syncEnd);
    document.getElementById('ev-time-m')?.addEventListener('change', syncEnd);
    document.getElementById('ev-time-ap')?.addEventListener('change', syncEnd);
    syncEnd();
    if (isTourCal) {
      const h = document.getElementById('ev-time-h');
      const ap = document.getElementById('ev-time-ap');
      if (h) h.value = '12';
      if (ap) ap.value = 'PM';
      syncEnd();
    }
    document.getElementById('ev-title')?.focus();
  }, 50);
}

