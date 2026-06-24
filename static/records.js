// â”€â”€ RECORD VIEW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderRecordView(recordId) {
  const r = getRecord(recordId);
  if (!r) return;
  const area = getArea(r.areaId);
  const isCompleted = r.status === 'completed';
  const isArchived = r.status === 'archived';
  const urgency = r.urgency || 'none';
  const urgencyLabels = { none: 'âš‘ Flag', flagged: 'ðŸŸ¡ Flagged', priority: 'ðŸ”µ Priority', urgent: 'ðŸ”´ Urgent' };
  const urgencyNext = { none: 'flagged', flagged: 'priority', priority: 'urgent', urgent: 'none' };
  document.getElementById('topbar-actions').innerHTML = `
    <button class="btn btn-sm" onclick="navigate('area','${r.areaId}')">â† Back</button>
    <button class="btn btn-sm" onclick="copyRecordContext('${r.id}')" title="Copy context to paste into Claude">ðŸ“‹ Copy for Claude</button>
    <button class="btn btn-sm btn-danger" onclick="deleteRecord('${r.id}')">Delete</button>`;

  const el = document.getElementById('record-view-content');
  if (r.type === 'job') el.innerHTML = renderJobRecord(r, area);
  else if (r.type === 'contact') el.innerHTML = renderContactRecord(r, area);
  else if (r.type === 'company') el.innerHTML = renderCompanyRecord(r, area);
  else if (r.type === 'event') el.innerHTML = renderEventRecord(r, area);
  else if (r.type === 'account') el.innerHTML = renderAccountRecord(r, area);
  else el.innerHTML = renderGenericRecord(r, area);
}

function renderJobRecord(r, area) {
  const contacts = (r.contacts || []).map(id => getRecord(id)).filter(Boolean);
  const linkedEvents = (r.links || []).map(id => getRecord(id)).filter(Boolean).filter(e => e.type === 'event');
  const statusLabels = { applied: 'Applied', interviewing: 'Interviewing', awaiting: 'Awaiting', offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn', completed: 'Completed', archived: 'Archived' };
  const statusOrder = ['applied','interviewing','awaiting','offer','rejected','withdrawn','completed','archived'];

  return `<div class="record-view-header">
    <div class="record-view-icon">ðŸ’¼</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title">
        ${(() => {
          const co = r.companyId ? DB.records.find(rec=>rec.id===r.companyId) : DB.records.find(rec=>rec.type==='company'&&rec.title===r.title);
          return co
            ? `<span class="doc-ref" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}" style="color:var(--text)">${r.title} <span style="color:var(--accent);font-size:16px">â†’</span></span>`
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
      <button class="btn btn-sm btn-p" onclick="addInterview('${r.id}')">+ Interview</button>
    </div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      <div class="section-card">
        <div class="section-title">Role details</div>
        <div class="field-row">
          <div class="field-label">Company</div>
          <div class="field-value">
            ${(() => {
              const co = r.companyId ? DB.records.find(rec=>rec.id===r.companyId) : DB.records.find(rec=>rec.type==='company'&&rec.title===r.title);
              return co
                ? `<span class="doc-ref" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}" style="font-size:13px;font-weight:500;color:var(--accent)">${r.title} â†’</span>`
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
              ${r.fields.postingUrl?`<a href="${r.fields.postingUrl}" target="_blank" style="color:var(--accent);font-size:12px;white-space:nowrap">View â†’</a>`:''}
            </div>
            <div id="scrape-panel-${r.id}" style="display:none;margin-top:8px"></div>
          </div>
        </div>

      </div>
      <div class="section-card">
        <div class="section-title">Interviews</div>
        ${(r.interviews || []).length ? r.interviews.map(i => `
          <div class="interview-item">
            <div class="interview-round">Round ${i.round}</div>
            <div class="interview-title">${i.interviewer || 'TBD'}</div>
            <div class="interview-meta">
              ${i.date ? formatDate(i.date) : ''} ${i.time ? 'Â· ' + fmtTime(i.time) : ''} ${i.format ? 'Â· ' + i.format : ''}
              ${i.location ? '<br>' + i.location : ''}
            </div>
            ${i.link ? `<a class="interview-link" href="${i.link}" target="_blank">Join meeting â†’</a>` : ''}
            ${i.notes ? `<div class="interview-meta" style="margin-top:6px">${i.notes}</div>` : ''}
          </div>`).join('') : '<div class="empty">No interviews recorded.</div>'}
      </div>
${renderNotesSection(r)}
      <div class="section-card">
        <div class="section-title">Job description</div>
        <textarea class="field-edit" onblur="saveFieldText('${r.id}','jobDescription',this.value)" style="width:100%;min-height:80px" placeholder="Paste job description here...">${r.fields.jobDescription || ''}</textarea>
      </div>
    </div>
    <div class="record-sidebar">
      <div class="section-card">
        <div class="section-title">Status</div>
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
            const labels={none:'None',new:'ðŸ”µ New',flagged:'ðŸŸ¡ Flagged',priority:'ðŸŸ£ Priority',urgent:'ðŸ”´ Urgent'};
            const cur=r.urgency||'none';
            return '<span class="urgency-pill'+(cur===u?' u-active-'+u:'')+'" onclick="setUrgency(\''+r.id+'\',\''+u+'\')">'+labels[u]+'</span>';
          }).join('')}
        </div>
      </div>
      <div class="section-card">
        <div class="section-title">Contacts</div>
        ${contacts.map(ct => `<div class="contact-chip" data-record-link data-area-id="${ct.areaId}" data-record-id="${ct.id}">
  <span>ðŸ‘¤</span>
  <span class="contact-chip-name">${ct.title}</span>
  ${ct.fields.role ? `<span class="contact-chip-role">Â· ${ct.fields.role}</span>` : ''}
</div>`).join('')}
        <div style="margin-top:8px"><button class="btn btn-xs" onclick="linkContact('${r.id}')">+ Link contact</button></div>
      </div>
      <div class="section-card">
        <div class="section-title">Documents</div>
        ${renderJobDocSection(r, 'resume', 'Resume')}
        ${renderJobDocSection(r, 'coverLetter', 'Cover letter')}
        ${renderJobDocSection(r, 'other', 'Other')}
      </div>
      ${linkedEvents.length ? `<div class="section-card">
        <div class="section-title">Linked events</div>
        ${linkedEvents.map(ev => `<div class="record-card" data-record-link data-area-id="${ev.areaId}" data-record-id="${ev.id}" style="margin-bottom:6px">
          <div class="record-card-icon">ðŸ“…</div>
          <div class="record-card-body">
            <div class="record-card-title">${ev.title}</div>
            <div class="record-card-sub">${formatDate(ev.fields.date)}${ev.fields.time ? ' Â· ' + fmtTime(ev.fields.time) : ''}</div>
          </div>
        </div>`).join('')}
      </div>` : ''}
      <div class="section-card">
        <div class="section-title">Timeline</div>
        ${renderTimeline(r)}
      </div>
    </div>
  </div>`;
}

function renderContactRecord(r, area) {
  return `<div class="record-view-header">
    <div class="record-view-icon">ðŸ‘¤</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta"><span>${r.fields.role || ''}</span>${linkableCompany(r.fields.company)}</div>
    </div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      <div class="section-card">
        <div class="section-title">Contact info</div>
        ${editableField(r, 'role', 'Role')}
        <div class="field-row">
          <div class="field-label">Company</div>
          <div class="field-value">
            <div style="position:relative">
              <input class="field-edit" style="width:100%" value="${r.fields.company||''}" placeholder="Type company name..." 
                id="company-input-${r.id}"
                oninput="showCompanySuggestions(this,'${r.id}')"
                onblur="hideCompanySuggestions('${r.id}')"
                onkeydown="companyInputKey(event,'${r.id}')">
              <div id="company-suggestions-${r.id}" style="display:none;position:absolute;top:100%;left:0;right:0;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;z-index:50;max-height:150px;overflow-y:auto"></div>
            </div>
            <div style="margin-top:4px">${linkableCompany(r.fields.company, r.companyId)}</div>
          </div>
        </div>
        ${editableField(r, 'email', 'Email')}
        ${editableField(r, 'phone', 'Phone')}
        ${editableField(r, 'linkedin', 'LinkedIn')}
        <div class="field-row">
          <div class="field-label">Area</div>
          <div class="field-value">
            <select class="field-edit" onchange="moveRecordArea('${r.id}',this.value)">
              ${DB.areas.map(a=>`<option value="${a.id}" ${a.id===r.areaId?'selected':''}>${a.title}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
${renderNotesSection(r)}
    </div>
    <div class="record-sidebar">
      <div class="section-card">
        <div class="section-title">Timeline</div>
        ${renderTimeline(r)}
      </div>
    </div>
  </div>`;
}

function renderEventRecord(r, area) {
  const linked = (r.links || []).map(id => DB.records.find(rec => rec.id === id)).filter(Boolean);
  return `<div class="record-view-header">
    <div class="record-view-icon">ðŸ“…</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta">
        ${r.fields.date ? `<span>${formatDate(r.fields.date)}</span>` : ''}
        ${r.fields.time ? `<span>${fmtTime(r.fields.time)}${r.fields.endTime ? ' - ' + fmtTime(r.fields.endTime) : ''}</span>` : ''}
        ${r.fields.location ? `<span>${r.fields.location}</span>` : ''}
      </div>
    </div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      <div class="section-card">
        <div class="section-title">Event details</div>
        ${editableField(r, 'date', 'Date', 'date')}
        ${editableField(r, 'time', 'Time', 'time')}
        ${editableField(r, 'endTime', 'End time', 'time')}
        ${editableField(r, 'location', 'Location')}
        ${r.fields.link ? `<div class="field-row"><div class="field-label">Link</div><div class="field-value"><a href="${r.fields.link}" target="_blank">Join â†’</a></div></div>` : ''}
        ${editableField(r, 'notes', 'Notes')}
      </div>
    </div>
    <div class="record-sidebar">
      ${linked.length ? `<div class="section-card">
        <div class="section-title">Linked records</div>
        ${linked.map(rec => `<div class="contact-chip" data-record-link data-area-id="${rec.areaId}" data-record-id="${rec.id}">${rec.title}</div>`).join('')}
      </div>` : ''}
    </div>
  </div>`;
}

function renderCompanyRecord(r, area) {
  const contacts = getRecordsByType('contact').filter(rec => rec.companyId === r.id);
  const jobs = getRecordsByType('job').filter(rec => rec.companyId === r.id);
  return `<div class="record-view-header">
    <div class="record-view-icon">ðŸ¢</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta">
        <span>${r.fields.industry||''}</span>
        ${r.fields.location?`<span>${r.fields.location}</span>`:''}
        ${r.fields.website?`<a href="${r.fields.website}" target="_blank" style="color:var(--accent)">${r.fields.website}</a>`:''}
      </div>
    </div>
    <div class="record-view-actions">
      ${statusBadge(r)}
      <select class="field-edit" style="font-size:11px" onchange="moveRecordArea('${r.id}',this.value)">
        ${DB.areas.map(a=>`<option value="${a.id}" ${a.id===r.areaId?'selected':''}>${a.title}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      <div class="section-card">
        <div class="section-title">Details</div>
        ${editableField(r,'industry','Industry')}
        ${editableField(r,'website','Website')}
        ${editableField(r,'location','Location')}
      </div>
      ${renderNotesSection(r)}
    </div>
    <div class="record-sidebar">
      <div class="section-card">
        <div class="section-title">Contacts (${contacts.length})</div>
        ${contacts.map(ct=>`<div class="contact-chip" data-record-link data-area-id="${ct.areaId}" data-record-id="${ct.id}">
  <span>ðŸ‘¤</span>
  <span class="contact-chip-name">${ct.title}</span>
  ${ct.fields.role ? `<span class="contact-chip-role">&middot; ${ct.fields.role}</span>` : ''}
</div>`).join('')}
        ${!contacts.length?'<div class="empty">No contacts linked.</div>':''}
        <div style="margin-top:8px;display:flex;gap:6px">
          <button class="btn btn-xs" onclick="linkContactToCompany('${r.id}')">+ Link contact</button>
          <button class="btn btn-xs" onclick="promptAddRecord('contact')">+ New contact</button>
        </div>
      </div>
      ${jobs.length?`<div class="section-card">
        <div class="section-title">Applications (${jobs.length})</div>
        ${jobs.map(j=>`<div class="record-card" data-record-link data-area-id="${j.areaId}" data-record-id="${j.id}" style="margin-bottom:6px">
          <div class="record-card-icon">ðŸ’¼</div>
          <div class="record-card-body"><div class="record-card-title">${j.fields.role||j.title}</div><div class="record-card-sub">${j.status}</div></div>
        </div>`).join('')}
      </div>`:''}
      <div class="section-card">
        <div class="section-title">Timeline</div>
        ${renderTimeline(r)}
      </div>
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
      <div class="record-card-icon">ðŸ¢</div>
      <div class="record-card-body">
        <div class="record-card-title">${co.title}</div>
        <div class="record-card-sub">${[co.fields.industry, co.fields.location].filter(Boolean).join(' Â· ')}${contactCount?` Â· ${contactCount} contact${contactCount>1?'s':''}`:''}</div>
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

function renderAccountRecord(r, area) {
  const bal = r.fields.balance !== undefined && r.fields.balance !== '' ? Number(r.fields.balance) : null;
  const balFormatted = bal !== null ? '$' + bal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) : 'â€”';
  const balDate = r.fields.balanceDate ? `Updated ${formatDate(r.fields.balanceDate)}` : 'Balance not set';
  const ownerOpts = ['Aaron','Ale','Joint'];
  const typeOpts = ['Checking','Savings','Roth IRA','Traditional IRA','Taxable','401k','HYSA','Money Market','Credit Card','Other'];
  const instDefaults = getInstitutionDefaults(r.fields.institution);
  const domain = r.fields.institutionDomain || (instDefaults?.domain) || null;
  const loginUrl = r.fields.institutionUrl || (instDefaults?.url) || null;
  const logoHTML = domain
    ? `<a href="${loginUrl || '#'}" target="_blank" rel="noopener" title="Log in to ${r.fields.institution}" style="display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:10px;background:var(--bg3);border:1px solid var(--border1);overflow:hidden;flex-shrink:0;text-decoration:none">
        <img src="https://www.google.com/s2/favicons?domain=${domain}&sz=64" style="width:32px;height:32px;object-fit:contain" onerror="this.parentElement.innerHTML='ðŸ’³'">
       </a>`
    : `<div class="record-view-icon">ðŸ’³</div>`;
  const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtPct = n => (n>=0?'+':'')+Number(n).toFixed(2)+'%';
  const history = (r.fields.history || []).slice().sort((a,b) => b.month.localeCompare(a.month));
  const historyHTML = history.length ? `
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="color:var(--muted);text-align:right">
        <th style="text-align:left;padding:4px 0;font-weight:500">Month</th>
        <th style="padding:4px 6px;font-weight:500">Start</th>
        <th style="padding:4px 6px;font-weight:500">End</th>
        <th style="padding:4px 6px;font-weight:500">Contrib</th>
        <th style="padding:4px 0;font-weight:500">Return</th>
      </tr></thead>
      <tbody>${history.map(h => `<tr style="border-top:1px solid var(--border1);text-align:right">
        <td style="text-align:left;padding:5px 0;color:var(--text)">${h.month}</td>
        <td style="padding:5px 6px;color:var(--muted)">${fmt(h.beginBalance)}</td>
        <td style="padding:5px 6px;color:var(--text);font-weight:500">${fmt(h.endBalance)}</td>
        <td style="padding:5px 6px;color:var(--muted)">${h.contributions > 0 ? fmt(h.contributions) : 'â€”'}</td>
        <td style="padding:5px 0;color:${h.returnPct>=0?'var(--green)':'var(--red)'};font-weight:500">${fmtPct(h.returnPct)}</td>
      </tr>`).join('')}</tbody>
    </table>` : '<div style="color:var(--muted);font-size:12px">No history yet â€” import a statement to start tracking.</div>';

  const chartHistory = (r.fields.history || []).slice().sort((a,b) => a.month.localeCompare(b.month));
  const chartId = `acct-charts-${r.id}`;
  setTimeout(() => {
    attachStatementPasteListener(r.id);
    renderAccountCharts(chartId, chartHistory);
  }, 0);

  return `<div class="record-view-header">
    ${logoHTML}
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta">
        ${r.fields.institution ? `<span>${r.fields.institution}</span>` : ''}
        ${r.fields.accountType ? `<span>${r.fields.accountType}</span>` : ''}
        ${r.fields.owner ? `<span>${r.fields.owner}</span>` : ''}
        ${r.fields.last4 ? `<span>Â·Â·Â·Â·${r.fields.last4}</span>` : ''}
      </div>
    </div>
    <div class="record-view-actions">
      <div style="text-align:right">
        <div style="font-size:28px;font-weight:700;color:var(--text);cursor:pointer;line-height:1.2" onclick="editAccountBalance('${r.id}')" title="Click to update balance">${balFormatted}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">${balDate}</div>
        <button class="btn-s" style="margin-top:8px;font-size:11px" onclick="parseStatementUpload('${r.id}')">â¬† Import statement</button>
        <div style="font-size:10px;color:var(--muted);margin-top:4px">or paste a screenshot</div>
        <input type="file" id="stmt-input-${r.id}" accept="image/*,application/pdf" style="display:none" onchange="handleStatementFile('${r.id}',this)">
      </div>
    </div>
  </div>
  <div id="${chartId}" style="padding:0 0 4px 0"></div>
  <div class="record-sections">
    <div class="record-main">
      <div class="section-card">
        <div class="section-title">Monthly history</div>
        ${historyHTML}
      </div>
      <div class="section-card">
        <div class="section-title">Account details</div>
        ${editableField(r, 'institution', 'Institution')}
        <div class="field-row"><div class="field-label">Type</div><div class="field-value">
          <select class="field-edit" onchange="saveFieldText('${r.id}','accountType',this.value)">
            <option value="">â€”</option>
            ${typeOpts.map(t => `<option value="${t}" ${r.fields.accountType===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </div></div>
        <div class="field-row"><div class="field-label">Owner</div><div class="field-value">
          <select class="field-edit" onchange="saveFieldText('${r.id}','owner',this.value)">
            <option value="">â€”</option>
            ${ownerOpts.map(o => `<option value="${o}" ${r.fields.owner===o?'selected':''}>${o}</option>`).join('')}
          </select>
        </div></div>
        ${editableField(r, 'last4', 'Last 4 digits')}
        ${editableField(r, 'institutionUrl', 'Login URL')}
        ${editableField(r, 'institutionDomain', 'Logo domain')}
      </div>
      ${renderNotesSection(r)}
    </div>
    <div class="record-sidebar">
      <div class="section-card">
        <div class="section-title">Activity</div>
        ${renderTimeline(r)}
      </div>
    </div>
  </div>`;
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

  const toast = document.createElement('div');
  toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text);z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  toast.innerHTML = `<span style="display:inline-block;width:14px;height:14px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span><span>Reading statementâ€¦</span>`;
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
    toast.innerHTML = `<span style="color:var(--red)">âœ—</span><span>${err.message}</span>`;
    setTimeout(() => toast.remove(), 4000);
  }
}

function showStatementConfirmModal(recordId, data) {
  const parts = (data.date || '').split('-');
  const year = parseInt(parts[0]) || new Date().getFullYear();
  const month = parts[1] ? parseInt(parts[1]) - 1 : new Date().getMonth();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const years = Array.from({length: 6}, (_, i) => year - 2 + i);
  const fmt = n => '$' + Number(n).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2});
  const fmtPct = n => (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%';

  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:28px;width:380px;max-width:90vw">
    <div style="font-size:16px;font-weight:600;margin-bottom:18px">Confirm statement data</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:18px">
      <div style="font-size:12px;color:var(--muted)">Period</div>
      <div style="display:flex;gap:6px">
        <select id="sc-month" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:4px 6px;color:var(--text);font-size:13px">
          ${months.map((m,i) => `<option value="${i}" ${i===month?'selected':''}>${m}</option>`).join('')}
        </select>
        <select id="sc-year" style="width:70px;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:4px 6px;color:var(--text);font-size:13px">
          ${years.map(y => `<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
        </select>
      </div>
      <div style="font-size:12px;color:var(--muted)">Start balance</div>
      <div style="font-size:13px;font-weight:500">${fmt(data.beginBalance)}</div>
      <div style="font-size:12px;color:var(--muted)">End balance</div>
      <div style="font-size:13px;font-weight:500">${fmt(data.endBalance)}</div>
      <div style="font-size:12px;color:var(--muted)">Contributions</div>
      <div style="font-size:13px;font-weight:500">${fmt(data.contributions)}</div>
      <div style="font-size:12px;color:var(--muted)">Return</div>
      <div style="font-size:13px;font-weight:500;color:${data.returnPct>=0?'var(--green)':'var(--red)'}">${fmtPct(data.returnPct)}</div>
    </div>
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
  r.fields.balance = data.endBalance;
  r.fields.balanceDate = monthStr + '-01';
  r.fields.history = r.fields.history || [];
  const existing = r.fields.history.findIndex(h => h.month === monthStr);
  const entry = { month: monthStr, beginBalance: data.beginBalance, endBalance: data.endBalance, contributions: data.contributions, returnPct: data.returnPct };
  if (existing >= 0) r.fields.history[existing] = entry; else r.fields.history.push(entry);
  r.fields.history.sort((a,b) => a.month.localeCompare(b.month));

  const fmt = n => '$' + Number(n).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  const fmtPct = n => (n>=0?'+':'') + Number(n).toFixed(2)+'%';
  const monthName = ['January','February','March','April','May','June','July','August','September','October','November','December'][monthIdx];
  const timelineText = `${monthName} ${year} statement imported â€” End: ${fmt(data.endBalance)} | Start: ${fmt(data.beginBalance)}${data.contributions > 0 ? ` | Contributions: ${fmt(data.contributions)}` : ''} | Return: ${fmtPct(data.returnPct)}`;

  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
  await api('POST', `/api/records/${recordId}/timeline`, { text: timelineText });
  r.timeline = r.timeline || [];
  r.timeline.push({ id: Date.now().toString(36), date: new Date().toISOString(), text: timelineText, author: 'aaron' });
  renderRecordView(recordId);
}

// Paste handler â€” attached when an account record view is rendered
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
  if (!el || history.length < 2) { if (el) el.innerHTML = ''; return; }

  const W = el.offsetWidth || 700;
  const labels = history.map(h => h.month.slice(0, 7));
  const shortLabels = labels.map(l => { const [y,m] = l.split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1] + ' ' + y.slice(2); });

  // â”€â”€ Balance line chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function lineChart(values, title, fmtY) {
    const H = 140, PL = 72, PR = 16, PT = 28, PB = 28;
    const cW = W/3 - 16, cH = H;
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

  // â”€â”€ Return % bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Contributions vs gain stacked bars â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <text x="${PL + 4}" y="${cH-6}" font-size="9" fill="var(--accent)" font-family="inherit">â–  Contrib</text>
      <text x="${PL + 52}" y="${cH-6}" font-size="9" fill="var(--green)" font-family="inherit">â–  Gain</text>
    </svg>`;
  }

  const balances = history.map(h => h.endBalance);
  const returns = history.map(h => h.returnPct);
  const fmtK = n => n >= 1000 ? '$'+(n/1000).toFixed(0)+'k' : '$'+n.toFixed(0);

  el.innerHTML = `<div style="display:flex;gap:8px;padding:0 0 16px 0;overflow:hidden">
    ${lineChart(balances, 'Balance', fmtK)}
    ${returnChart(returns, 'Monthly return %')}
    ${contribChart(history, 'Contributions vs gain')}
  </div>`;
}

function renderGenericRecord(r, area) {
  const fieldEntries = Object.entries(r.fields || {}).filter(([k]) => !['notes'].includes(k));
  return `<div class="record-view-header">
    <div class="record-view-icon">${typeIcon(r.type)}</div>
    <div class="record-view-title-wrap">
      <div class="record-view-title" contenteditable="true" onblur="saveField('${r.id}','title',this.textContent)">${r.title}</div>
      <div class="record-view-meta"><span>${r.type}</span>${area ? `<span class="doc-ref doc-ref-area" data-area-link="${area.id}" style="background:${area.color}18;border:1px solid ${area.color}44;color:${area.color}">${area.title}</span>` : ''}</div>
    </div>
    <div class="record-view-actions">${statusBadge(r)}</div>
  </div>
  <div class="record-sections">
    <div class="record-main">
      ${fieldEntries.length ? `<div class="section-card">
        <div class="section-title">Details</div>
        ${fieldEntries.map(([k, v]) => v ? `<div class="field-row"><div class="field-label">${capitalize(k)}</div><div class="field-value">${v}</div></div>` : '').join('')}
      </div>` : ''}
${renderNotesSection(r)}
    </div>
    <div class="record-sidebar">
      <div class="section-card">
        <div class="section-title">Timeline</div>
        ${renderTimeline(r)}
      </div>
    </div>
  </div>`;
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

function editableField(r, key, label, type = 'text') {
  const val = r.fields?.[key] || '';
  const stepAttr = type === 'time' ? 'step="900"' : '';
  return `<div class="field-row">
    <div class="field-label">${label}</div>
    <div class="field-value">
      <input class="field-edit" type="${type}" value="${val}" placeholder="â€”" ${stepAttr}
        onblur="saveFieldText('${r.id}','${key}',this.value)">
    </div>
  </div>`;
}

// â”€â”€ FIELD SAVES â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function moveRecordArea(recordId, newAreaId) {
  const r = getRecord(recordId);
  if (!r || r.areaId === newAreaId) return;
  r.areaId = newAreaId;
  await api('PUT', `/api/records/${recordId}`, { areaId: newAreaId });
  renderSidebar();
}

async function saveField(recordId, key, value) {
  const r = getRecord(recordId);
  if (!r || r[key] === value) return;
  r[key] = value;
  await api('PUT', `/api/records/${recordId}`, { [key]: value });
}

async function saveFieldText(recordId, key, value) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields = r.fields || {};
  let nextValue = value;
  if (key === 'time' || key === 'endTime') {
    nextValue = roundToQuarterHour(value);
  }
  if (r.type === 'event' && key === 'time' && nextValue && r.fields.endTime) {
    const s = parseTimeToMinutes(nextValue);
    const e = parseTimeToMinutes(r.fields.endTime);
    if (s !== null && e !== null && e <= s) {
      r.fields.endTime = defaultEndTimeFromStart(nextValue, 60);
    }
  }
  if (r.type === 'event' && key === 'endTime' && nextValue && r.fields.time) {
    const s = parseTimeToMinutes(r.fields.time);
    const e = parseTimeToMinutes(nextValue);
    if (s !== null && e !== null && e <= s) {
      nextValue = defaultEndTimeFromStart(r.fields.time, 60);
    }
  }
  if (r.fields[key] === nextValue) return;
  r.fields[key] = nextValue;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields });
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
      await api('PUT', `/api/records/${recordId}`, { status: val });
      await api('POST', `/api/records/${recordId}/timeline`, { text: `Status changed to: ${val}` });
      const updated = await api('GET', `/api/records/${recordId}`);
      DB.records = DB.records.map(rec => rec.id === recordId ? updated : rec);
      closeModal();
      renderRecordView(recordId);
      renderSidebar();
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
          title: `${r.title} â€” Interview Rd ${interview.round}`,
          status: 'upcoming', priority: 1,
          fields: { date: interview.date, time: interview.time, location: interview.location, link: interview.link, category: 'interview', notes: interview.notes },
          links: [recordId]
        });
        r.links = r.links || [];
        r.links.push(ev.id);
        await api('PUT', `/api/records/${recordId}`, { links: r.links });
        DB.records.push(ev);
      }
      await api('POST', `/api/records/${recordId}/timeline`, { text: `Interview Rd ${interview.round} added â€” ${formatDate(interview.date)}` });
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
          <div class="record-card-sub">${[ct.fields.role, ct.fields.company].filter(Boolean).join(' Â· ')}</div>
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
          <div class="record-card-sub">${[ct.fields.role, ct.fields.company].filter(Boolean).join(' Â· ')}</div>
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

// â”€â”€ ADD RECORD / AREA â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function promptAddRecord(forceType, targetAreaId = null) {
  const areaId = targetAreaId || currentAreaId;
  const type = forceType || (areaId === 'area-jobs' ? 'job' : null);
  if (type === 'job' || (!forceType && areaId === 'area-jobs')) { openJobModal(areaId); return; }
  if (type === 'company') { openAddCompanyModal(areaId); return; }
  const types = ['contact','event','goal','task','project','note','company','account'];
  // If area has sub-areas, show only sub-areas in picker; otherwise show all
  const children = DB.areas.filter(a => a.parentId === areaId);
  const areaOptions = children.length > 0 ? children : DB.areas.filter(a => !DB.areas.some(p => p.parentId === a.id) || a.id === areaId);
  const defaultArea = children.length > 0 ? children[0].id : areaId;
  openModal('New record', `
    <div class="modal-field"><div class="modal-label">Title</div><input class="modal-input" id="nr-title" placeholder="Record name" autofocus></div>
    <div class="modal-field"><div class="modal-label">Type</div>
      <select class="modal-select" id="nr-type">
        ${types.map(t => `<option value="${t}" ${forceType === t ? 'selected' : ''}>${capitalize(t)}</option>`).join('')}
      </select>
    </div>
    <div class="modal-field"><div class="modal-label">Area</div>
      <select class="modal-select" id="nr-area">
        ${areaOptions.map(a => `<option value="${a.id}" ${a.id === defaultArea ? 'selected' : ''}>${a.title}</option>`).join('')}
      </select>
    </div>`,
    [{ label: 'Create', primary: true, onclick: async () => {
      const title = document.getElementById('nr-title').value.trim();
      const t = document.getElementById('nr-type').value;
      const aid = document.getElementById('nr-area').value;
      if (!title) return;
      if (t === 'company') { closeModal(); openAddCompanyModal(aid); return; }
      const defaults = { contact:{role:'',company:'',email:'',phone:'',linkedin:'',notes:''}, event:{date:'',time:'',endTime:'',location:'',link:'',category:'',notes:''}, goal:{targetDate:'',progress:'',notes:''}, task:{frequency:'',lastDone:'',nextDue:'',notes:''}, project:{description:'',nextAction:'',notes:''}, note:{body:'',notes:''}, account:{institution:'',accountType:'',owner:'',last4:'',balance:'',balanceDate:'',notes:''} };
      const rec = await api('POST', '/api/records', { type:t, areaId:aid, title, urgency:'new', fields:defaults[t]||{}, contacts:t==='job'?[]:undefined, interviews:t==='job'?[]:undefined, documents:t==='job'?[]:undefined });
      DB.records.push(rec);
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
    <div class="modal-field"><div class="modal-label">Name</div><input class="modal-input" id="na-title" placeholder="${parentArea ? 'Sub-area name' : 'Area name'}" autofocus></div>
    <div class="modal-field"><div class="modal-label">Color</div><div class="color-swatch-grid" id="na-swatch-grid">${swatches}</div><input type="hidden" id="na-color" value="${defaultColor}"></div>`,
    [{ label: 'Create', primary: true, onclick: async () => {
      const title = document.getElementById('na-title').value.trim();
      const color = document.getElementById('na-color').value;
      if (!title) return;
      const area = await api('POST', '/api/areas', { title, color, icon: 'ðŸ“', order: DB.areas.length, parentId });
      DB.areas.push(area);
      closeModal();
      renderSidebar();
      if (parentId) navigate('area', parentId);
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
  r.status = 'completed';
  r.urgency = 'none';
  await api('PUT', `/api/records/${recordId}`, { status: 'completed', urgency: 'none' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Marked complete' });
  renderSidebar();
  renderRecordView(recordId);
}

async function markArchived(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.status = 'archived';
  r.urgency = 'none';
  await api('PUT', `/api/records/${recordId}`, { status: 'archived', urgency: 'none' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Archived' });
  renderSidebar();
  renderRecordView(recordId);
}

async function unarchiveRecord(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.status = 'active';
  await api('PUT', `/api/records/${recordId}`, { status: 'active' });
  await api('POST', `/api/records/${recordId}/timeline`, { text: 'Unarchived' });
  renderSidebar();
  renderRecordView(recordId);
}

async function deleteRecord(recordId) {
  if (!confirm('Delete this record? This cannot be undone.')) return;
  await api('DELETE', `/api/records/${recordId}`);
  DB.records = DB.records.filter(r => r.id !== recordId);
  renderSidebar();
  if (currentAreaId) navigate('area', currentAreaId);
  else navigate('dashboard');
}

function promptAddEvent(targetAreaId = null) {
  const today = new Date().toISOString().split('T')[0];
  const defaultArea = targetAreaId || currentAreaId;
  const children = defaultArea ? DB.areas.filter(a => a.parentId === defaultArea) : [];
  const areaOptions = children.length > 0 ? children : DB.areas.filter(a => !DB.areas.some(p => p.parentId === a.id));
  const defaultAreaId = children.length > 0 ? children[0].id : defaultArea;
  openModal('New event', `
    <div class="modal-field"><div class="modal-label">Title</div><input class="modal-input" id="ev-title" autofocus></div>
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
      closeModal();
      renderSidebar();
      if (currentView === 'dashboard') renderDashboard();
      else if (currentView === 'calendar') renderCalFull();
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
    document.getElementById('ev-title')?.focus();
  }, 50);
}

