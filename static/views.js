function toggleSection(titleEl) {
  const card = titleEl.closest('.collapsible-section');
  const body = card?.querySelector('.section-body');
  const chevron = titleEl.querySelector('.section-chevron');
  if (!body) return;
  const collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  if (chevron) chevron.textContent = collapsed ? '▾' : '▸';
}

// â"€â"€ CONTACTS VIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function splitContactName(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: '', last: '' };
  if (parts.length === 1) return { first: parts[0], last: '' };
  return { first: parts.slice(0, -1).join(' '), last: parts[parts.length - 1] };
}

function formatContactDisplayName(name) {
  const p = splitContactName(name);
  if (!p.last) return p.first;
  return `${p.last}, ${p.first}`;
}

function contactSortName(name) {
  const p = splitContactName(name);
  return `${(p.last || p.first).toLowerCase()} ${(p.first || '').toLowerCase()}`.trim();
}

function getContactLinkedTypes(contact) {
  const types = new Set();
  if (contact.companyId) types.add('company');
  DB.records.forEach(rec => {
    if ((rec.contacts || []).includes(contact.id)) types.add(rec.type);
    if ((rec.links || []).includes(contact.id)) types.add(rec.type);
  });
  return types;
}

function renderContactsView() {
  // Populate area filter dropdown
  const areaFilter = document.getElementById('contacts-area-filter');
  if (areaFilter && areaFilter.options.length === 1) {
    DB.areas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id; opt.textContent = a.title;
      areaFilter.appendChild(opt);
    });
  }

  const sortSel = document.getElementById('contacts-sort');
  const modeSel = document.getElementById('contacts-view-mode');
  if (sortSel && !sortSel.value) sortSel.value = contactsViewState.sort;
  if (modeSel && !modeSel.value) modeSel.value = contactsViewState.mode;

  const search = (document.getElementById('contacts-search')?.value || '').toLowerCase();
  const areaId = document.getElementById('contacts-area-filter')?.value || '';
  const linkedType = document.getElementById('contacts-type-filter')?.value || '';
  const sortKey = document.getElementById('contacts-sort')?.value || contactsViewState.sort;
  const mode = document.getElementById('contacts-view-mode')?.value || contactsViewState.mode;
  contactsViewState.sort = sortKey;
  contactsViewState.mode = mode;

  let contacts = DB.records.filter(r => r.type === 'contact' && !r.deletedAt);
  if (areaId) contacts = contacts.filter(r => r.areaId === areaId);
  if (linkedType) {
    contacts = contacts.filter(r => getContactLinkedTypes(r).has(linkedType));
  }
  if (search) contacts = contacts.filter(r =>
    r.title.toLowerCase().includes(search) ||
    formatContactDisplayName(r.title).toLowerCase().includes(search) ||
    (r.fields.role||'').toLowerCase().includes(search) ||
    (r.fields.company||'').toLowerCase().includes(search) ||
    (r.fields.email||'').toLowerCase().includes(search)
  );

  const grid = document.getElementById('contacts-grid-master');
  if (!grid) return;

  if (!contacts.length) {
    grid.innerHTML = '<div class="empty">No contacts found.</div>';
    return;
  }

  // Group by area
  const grouped = {};
  contacts.forEach(c => {
    const a = DB.areas.find(a=>a.id===c.areaId);
    const key = a?.id || 'other';
    (grouped[key] = grouped[key] || {
      areaId: a?.id || '',
      title: a?.title || 'Other',
      color: a?.color||'var(--dim)',
      items: []
    }).items.push(c);
  });

  const cmp = (a, b) => {
    if (sortKey === 'recent') {
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    }
    const left = contactSortName(a.title);
    const right = contactSortName(b.title);
    return sortKey === 'name-desc' ? right.localeCompare(left) : left.localeCompare(right);
  };

  grid.innerHTML = Object.values(grouped).map(group => `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:7px;height:7px;border-radius:50%;background:${group.color}"></div>
        ${group.areaId
          ? `<span class="doc-ref doc-ref-area" data-area-link="${group.areaId}" style="background:${group.color}18;border:1px solid ${group.color}44;color:${group.color}">${group.title}</span>`
          : `<span class="doc-ref doc-ref-area" style="cursor:default">${group.title}</span>`}
      </div>
      <div class="contacts-grid mode-${mode}">
        ${group.items.sort(cmp).map(r => `<div class="contact-card" data-record-link data-area-id="${r.areaId}" data-record-id="${r.id}">
          <div class="contact-card-name">👤 ${formatContactDisplayName(r.title)}</div>
          <div class="contact-card-sub">${[r.fields.role, r.fields.company].filter(Boolean).join(' · ') || '—'}</div>
          ${r.fields.email ? `<div class="contact-card-sub" style="margin-top:3px;color:var(--dim)">${r.fields.email}</div>` : '<div class="contact-card-sub" style="margin-top:3px;color:var(--dim)">—</div>'}
          <div class="contact-card-link">Links: ${[...getContactLinkedTypes(r)].join(', ') || 'none'}</div>
        </div>`).join('')}
      </div>
    </div>`).join('');
}

// â"€â"€ DOCUMENTS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
let allFiles = [];
async function loadFiles(){allFiles=await api('GET','/api/files');return allFiles;}
function fileIcon(n){const e=n.split('.').pop().toLowerCase();if(e==='pdf')return'📕';if(['doc','docx'].includes(e))return'📘';if(['xls','xlsx'].includes(e))return'📗';if(['jpg','jpeg','png','gif','webp'].includes(e))return'🖼';if(['zip','rar','7z'].includes(e))return'📦';return'📄';}
function fmtSize(b){if(b<1024)return b+' B';if(b<1048576)return(b/1024).toFixed(1)+' KB';return(b/1048576).toFixed(1)+' MB';}

function normalizeRecordDocs(r) {
  const docs = r.documents || [];
  if (!Array.isArray(docs)) return [];
  return docs
    .map(d => typeof d === 'string' ? { name: d, slot: 'other' } : d)
    .filter(d => d && d.name);
}

function getDocumentRows(files) {
  const rows = [];
  files.forEach(f => {
    let linked = false;
    // Include deleted records so we can show dead-pointer pills
    DB.records.forEach(r => {
      const area = DB.areas.find(a => a.id === r.areaId) || null;
      normalizeRecordDocs(r).forEach(d => {
        if (d.name !== f.name) return;
        linked = true;
        rows.push({
          file: f,
          areaId: r.areaId,
          areaTitle: area?.title || 'Other',
          areaColor: area?.color || 'var(--dim)',
          recordId: r.id,
          recordTitle: r.title,
          recordType: r.type || 'other',
          slot: d.slot || 'other',
          unattached: false,
          recordDeleted: !!r.deletedAt,  // dead pointer flag
        });
      });
    });
    if (!linked) {
      rows.push({
        file: f,
        areaId: '',
        areaTitle: 'Unattached',
        areaColor: 'var(--dim)',
        recordId: '',
        recordTitle: 'Unattached',
        recordType: 'unattached',
        slot: 'other',
        unattached: true,
        recordDeleted: false,
      });
    }
  });
  return rows;
}

function populateDocumentsFilters() {
  const areaFilter = document.getElementById('documents-area-filter');
  if (areaFilter && areaFilter.options.length === 1) {
    DB.areas.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.title;
      areaFilter.appendChild(opt);
    });
  }
  const sortEl = document.getElementById('documents-sort');
  if (sortEl && !sortEl.value) sortEl.value = documentsViewState.sort;
  const linkEl = document.getElementById('documents-link-filter');
  if (linkEl && !linkEl.value) linkEl.value = documentsViewState.linkFilter;
}

async function renderDocumentsView(){
  await loadFiles();
  populateDocumentsFilters();
  const el=document.getElementById('doc-list');if(!el)return;
  if(!allFiles.length){el.innerHTML='<div class="empty">No documents uploaded yet.</div>';return;}

  const search = (document.getElementById('documents-search')?.value || '').toLowerCase();
  const areaId = document.getElementById('documents-area-filter')?.value || '';
  const recordType = document.getElementById('documents-record-type-filter')?.value || '';
  const slot = document.getElementById('documents-slot-filter')?.value || '';
  const linkFilter = document.getElementById('documents-link-filter')?.value || documentsViewState.linkFilter;
  const sort = document.getElementById('documents-sort')?.value || documentsViewState.sort;
  documentsViewState.linkFilter = linkFilter;
  documentsViewState.sort = sort;

  const slotLabel = {resume:'Resume', coverLetter:'Cover Letter', other:'Other'};
  const slotPriority = { resume: 1, coverLetter: 2, other: 3 };
  const rows = getDocumentRows(allFiles)
    .map(row => ({ ...row, displayName: stripTimestamp(row.file.name) }))
    .filter(row => !areaId || row.areaId === areaId)
    .filter(row => !recordType || row.recordType === recordType)
    .filter(row => !slot || row.slot === slot)
    .filter(row => linkFilter === 'all' || (linkFilter === 'linked' ? !row.unattached : row.unattached))
    .filter(row => {
      if (!search) return true;
      return (
        row.displayName.toLowerCase().includes(search) ||
        row.areaTitle.toLowerCase().includes(search) ||
        row.recordTitle.toLowerCase().includes(search) ||
        row.recordType.toLowerCase().includes(search) ||
        (slotLabel[row.slot] || row.slot).toLowerCase().includes(search)
      );
    });

  // Deduplicate visually identical document rows caused by timestamped/non-timestamped copies.
  const deduped = new Map();
  rows.forEach(row => {
    const key = `${row.displayName.toLowerCase()}|${row.areaId || 'unattached'}|${row.recordId || 'none'}|${row.unattached ? '1' : '0'}`;
    const prev = deduped.get(key);
    if (!prev) {
      deduped.set(key, { ...row, slotSet: new Set([row.slot]) });
      return;
    }
    prev.slotSet.add(row.slot);
    if (new Date(row.file.uploadedAt) > new Date(prev.file.uploadedAt)) {
      prev.file = row.file;
      prev.displayName = row.displayName;
    }
  });
  const filteredRows = [...deduped.values()].map(row => ({
    ...row,
    primarySlot: [...row.slotSet].sort((a, b) => (slotPriority[a] || 99) - (slotPriority[b] || 99))[0] || 'other',
    slotText: slotLabel[[...row.slotSet].sort((a, b) => (slotPriority[a] || 99) - (slotPriority[b] || 99))[0] || 'other'] || 'Other',
  }));

  const cmp = (a, b) => {
    if (sort === 'date-desc') return new Date(b.file.uploadedAt) - new Date(a.file.uploadedAt);
    if (sort === 'date-asc') return new Date(a.file.uploadedAt) - new Date(b.file.uploadedAt);
    if (sort === 'area') return a.areaTitle.localeCompare(b.areaTitle) || a.displayName.localeCompare(b.displayName);
    if (sort === 'record-type') return a.recordType.localeCompare(b.recordType) || a.displayName.localeCompare(b.displayName);
    if (sort === 'slot') return (slotLabel[a.primarySlot]||a.primarySlot).localeCompare(slotLabel[b.primarySlot]||b.primarySlot) || a.displayName.localeCompare(b.displayName);
    if (sort === 'size-desc') return b.file.size - a.file.size;
    if (sort === 'size-asc') return a.file.size - b.file.size;
    return a.displayName.localeCompare(b.displayName);
  };

  filteredRows.sort(cmp);
  if (!filteredRows.length) {
    el.innerHTML = '<div class="empty">No documents match the current filters.</div>';
    return;
  }

  el.innerHTML=filteredRows.map(row=>{
    const file = row.file;
    const isDeleted = row.recordDeleted;
    const areaChip = row.unattached
      ? '<span class="doc-ref doc-ref-area" style="cursor:default">Unattached</span>'
      : isDeleted
      ? `<span class="doc-ref doc-ref-area dead-pointer" style="cursor:default;opacity:.45;text-decoration:line-through">${row.areaTitle}</span>`
      : `<span class="doc-ref doc-ref-area" data-area-link="${row.areaId}" style="background:${row.areaColor}18;border:1px solid ${row.areaColor}44;color:${row.areaColor}">${row.areaTitle}</span>`;
    const recordChip = row.unattached
      ? '<span class="doc-ref" style="cursor:default">No linked record</span>'
      : isDeleted
      ? `<span class="doc-ref dead-pointer" title="Record deleted — restore from History → Recently Deleted" style="cursor:default;opacity:.45;text-decoration:line-through" onclick="navigate('history','deleted')">${row.recordTitle} <span style="font-size:10px;opacity:.7">(deleted)</span></span>`
      : `<span class="doc-ref" data-record-link data-area-id="${row.areaId}" data-record-id="${row.recordId}">${row.recordTitle}</span>`;
    const slotChip = `<span class="doc-ref" style="cursor:default">${row.slotText}</span>`;
    return `<div class="doc-item"${isDeleted ? ' style="opacity:.6"' : ''}>
      <span class="doc-icon">${fileIcon(file.name)}</span>
      <div style="flex:1;min-width:0">
        <a class="doc-name" href="/uploads/${encodeURIComponent(file.name)}" target="_blank">${row.displayName}</a>
        <div style="margin-top:3px">${areaChip}${recordChip}${slotChip}${isDeleted ? '<span class="doc-ref" style="cursor:default;color:var(--amber);border-color:var(--amber);opacity:.7;font-size:10px">In trash</span>' : ''}</div>
      </div>
      <span class="doc-meta">${fmtSize(file.size)}</span>
      <div class="doc-actions">
        <a class="btn btn-xs" href="/uploads/${encodeURIComponent(file.name)}" target="_blank" download="${row.displayName}">Download</a>
        ${!isDeleted ? `<button class="btn btn-xs" onclick="renameFile('${file.name}')">Rename</button>` : ''}
        ${isDeleted
          ? `<button class="btn btn-xs" onclick="restoreDocRecord('${row.recordId}','${row.areaId}','${escapeHtml(file.name)}')">Restore record</button>`
          : `<button class="btn btn-xs btn-danger" onclick="deleteFile('${file.name}')">Delete</button>`}
      </div>
    </div>`;
  }).join('');
}
function deleteToast(label, onUndo) {
  document.getElementById('delete-toast')?.remove();
  const t = document.createElement('div');
  t.id = 'delete-toast';
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:10px 16px;font-size:13px;color:var(--text);z-index:9999;display:flex;align-items:center;gap:12px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  t.innerHTML = `<span style="color:var(--muted)">Deleted <b>${escapeHtml(label)}</b></span><button style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600;cursor:pointer">Undo</button>`;
  document.body.appendChild(t);
  const timer = setTimeout(() => t.remove(), 5000);
  t.querySelector('button').onclick = () => { clearTimeout(timer); t.remove(); onUndo(); };
}

async function uploadFiles(files){
  const toast=document.createElement('div');
  toast.style.cssText='position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text);z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
  const names=[...files].map(f=>f.name).join(', ');
  toast.innerHTML=`<span style="display:inline-block;width:14px;height:14px;border:2px solid var(--accent);border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite"></span><span>Uploading ${files.length===1?`<b>${names}</b>`:`${files.length} files`}…</span>`;
  document.body.appendChild(toast);
  try{
    const fd=new FormData();for(const f of files)fd.append('files',f);
    const res=await fetch('/api/files',{method:'POST',body:fd});
    const uploaded=await res.json();
    if(!res.ok)throw new Error(uploaded.error||'Upload failed');
    toast.innerHTML=`<span style="color:var(--green)">✓</span><span>Uploaded ${files.length===1?`<b>${names}</b>`:`${files.length} files`}</span>`;
    setTimeout(()=>toast.remove(),4500);
    await loadFiles();if(currentView==='documents')renderDocumentsView();return uploaded;
  }catch(err){
    toast.innerHTML=`<span style="color:var(--red)">✗</span><span>Upload failed: ${err.message}</span>`;
    setTimeout(()=>toast.remove(),4000);
    return [];
  }
}
function docDragOver(e){e.preventDefault();document.getElementById('doc-dropzone')?.classList.add('drag-over');}
function docDragLeave(e){document.getElementById('doc-dropzone')?.classList.remove('drag-over');}
async function docDrop(e){e.preventDefault();docDragLeave(e);await uploadFiles(e.dataTransfer.files);}
async function docFileSelected(e){await uploadFiles(e.target.files);e.target.value='';}
async function recordDocDrop(e,rid,slot){e.preventDefault();const u=await uploadFiles(e.dataTransfer.files);if(u?.length)await attachDocsToRecord(rid,u.map(f=>f.name),slot);}
async function recordDocSelected(e,rid,slot){const u=await uploadFiles(e.target.files);e.target.value='';if(u?.length)await attachDocsToRecord(rid,u.map(f=>f.name),slot);}
async function attachDocsToRecord(rid, names, slot) {
  const r=DB.records.find(r=>r.id===rid);if(!r)return;
  r.documents = r.documents||[];
  names.forEach(name => {
    if (!r.documents.find(d=>d.name===name&&d.slot===slot))
      r.documents.push({name, slot: slot||'other', uploadedAt: new Date().toISOString()});
  });
  await api('PUT',`/api/records/${rid}`,{documents:r.documents});
  renderRecordView(rid);
}
// Job document sections: resume, coverLetter, other
function stripTimestamp(name) {
  return name ? name.replace(/^\d+_/, '') : name;
}
function renderJobDocSection(r, slot, label) {
  const docs = (r.documents || []).filter(d => d.slot === slot && d.name && d.name !== 'undefined');
  const inputId = `doc-input-${r.id}-${slot}`;
  return `<div style="margin-bottom:12px">
    <div style="font-size:10px;font-weight:600;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${label}</div>
    ${docs.length ? docs.map(d => `<div class="doc-item">
      <span class="doc-icon">${fileIcon(d.name)}</span>
      <a class="doc-name" href="/uploads/${encodeURIComponent(d.name)}" target="_blank">${stripTimestamp(d.name)}</a>
      <button class="btn btn-xs btn-danger" onclick="detachDoc('${r.id}','${d.name}','${slot}')">Remove</button>
    </div>`).join('') : '<div style="font-size:12px;color:var(--dim);margin-bottom:4px">None uploaded</div>'}
    <div style="border:1px dashed var(--border2);border-radius:6px;padding:6px 10px;text-align:center;cursor:pointer;font-size:11px;color:var(--muted);margin-top:4px"
      ondragover="event.preventDefault()"
      ondrop="recordDocDrop(event,'${r.id}','${slot}')"
      onclick="document.getElementById('${inputId}').click()">
      + Upload ${label.toLowerCase()}
      <input type="file" id="${inputId}" style="display:none" onchange="recordDocSelected(event,'${r.id}','${slot}')">
    </div>
  </div>`;
}

async function detachDoc(rid, dn, slot) {
  const r = DB.records.find(r => r.id === rid);if(!r)return;
  r.documents = (r.documents||[]).filter(d => !(d.name===dn && d.slot===slot));
  await api('PUT',`/api/records/${rid}`,{documents:r.documents});
  renderRecordView(rid);
}
async function renameFile(oldName){
  const n=prompt('New filename:',oldName);if(!n||n===oldName)return;
  await api('PUT',`/api/files/${encodeURIComponent(oldName)}`,{name:n});renderDocumentsView();
}
async function deleteFile(name){
  if(!confirm(`Delete "${name}"?`))return;
  await api('DELETE',`/api/files/${encodeURIComponent(name)}`);
  allFiles=allFiles.filter(f=>f.name!==name);renderDocumentsView();
}

async function restoreDocRecord(recordId, areaId, fileName) {
  const r = DB.records.find(rec => rec.id === recordId);
  const label = r?.title || r?.fields?.company || 'this record';
  const choice = await showRestoreDocChoice(label);
  if (choice === 'record') {
    await api('POST', `/api/records/${recordId}/restore`);
    if (r) r.deletedAt = null;
    renderSidebar();
    renderDocumentsView();
    navigate('record', areaId, recordId);
  } else if (choice === 'unattach' && fileName && r) {
    const updatedDocs = normalizeRecordDocs(r).filter(d => d.name !== fileName);
    r.documents = updatedDocs;
    await api('PUT', `/api/records/${recordId}`, { documents: updatedDocs });
    renderDocumentsView();
  }
}

function showRestoreDocChoice(recordLabel) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'restore-doc-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9998;display:flex;align-items:center;justify-content:center';
    overlay.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:24px 28px;max-width:340px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.4)">
      <div style="font-size:14px;font-weight:600;margin-bottom:6px">Restore file</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:18px">This file belongs to the deleted record <b>${escapeHtml(recordLabel)}</b>. What would you like to do?</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <button id="rdc-record" style="background:var(--accent);color:#fff;border:none;border-radius:8px;padding:9px 14px;font-size:13px;font-weight:600;cursor:pointer;text-align:left">Restore record too</button>
        <button id="rdc-unattach" style="background:var(--bg3,var(--bg));border:1px solid var(--border);color:var(--text);border-radius:8px;padding:9px 14px;font-size:13px;cursor:pointer;text-align:left">Keep file only — show as Unattached</button>
        <button id="rdc-cancel" style="background:none;border:none;color:var(--muted);font-size:12px;cursor:pointer;padding:4px 0">Cancel</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#rdc-record').onclick = () => { overlay.remove(); resolve('record'); };
    overlay.querySelector('#rdc-unattach').onclick = () => { overlay.remove(); resolve('unattach'); };
    overlay.querySelector('#rdc-cancel').onclick = () => { overlay.remove(); resolve(null); };
  });
}
// docDropdown removed - using per-slot upload zones

// â"€â"€ COMPLETED / ARCHIVED VIEWS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function renderStatusView(status, listId, searchId, areaFilterId) {
  const el = document.getElementById(listId);
  if (!el) return;
  const areaFilter = document.getElementById(areaFilterId);
  if (areaFilter && areaFilter.options.length === 1) {
    DB.areas.forEach(a => { const o=document.createElement('option');o.value=a.id;o.textContent=a.title;areaFilter.appendChild(o); });
  }
  const search = (document.getElementById(searchId)?.value||'').toLowerCase();
  const areaId = document.getElementById(areaFilterId)?.value||'';
  let records = DB.records.filter(r => !r.deletedAt && r.status === status && r.type !== 'event');
  if (areaId) records = records.filter(r => r.areaId === areaId);
  if (search) records = records.filter(r => r.title.toLowerCase().includes(search) || (r.fields?.role||'').toLowerCase().includes(search));
  records.sort((a,b) => b.updatedAt?.localeCompare(a.updatedAt||''));
  if (!records.length) { el.innerHTML = `<div class="empty">No ${status} records.</div>`; return; }
  const grouped = {};
  records.forEach(r => {
    const a = DB.areas.find(a=>a.id===r.areaId);
    const k = a?.id || 'other';
    (grouped[k] = grouped[k] || {
      areaId: a?.id || '',
      title: a?.title || 'Other',
      color: a?.color || 'var(--dim)',
      items: []
    }).items.push(r);
  });
  el.innerHTML = Object.values(grouped).map(group => `
    <div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:7px;height:7px;border-radius:50%;background:${group.color}"></div>
        ${group.areaId
          ? `<span class="doc-ref doc-ref-area" data-area-link="${group.areaId}" style="background:${group.color}18;border:1px solid ${group.color}44;color:${group.color}">${group.title}</span>`
          : `<span class="doc-ref doc-ref-area" style="cursor:default">${group.title}</span>`}
      </div>
      <div class="record-list">${group.items.map(r=>recordCard(r)).join('')}</div>
    </div>`).join('');
}

function setHistoryTab(tab) {
  historyTab = ['archived', 'deleted'].includes(tab) ? tab : 'completed';
  renderHistoryView();
  const hash = `history/${historyTab}`;
  history.pushState({ view: 'history', areaId: historyTab, recordId: null }, '', '#' + hash);
}

function renderHistoryView() {
  const tab = historyTab;
  document.getElementById('history-tab-completed')?.classList.toggle('active', tab === 'completed');
  document.getElementById('history-tab-archived')?.classList.toggle('active', tab === 'archived');
  document.getElementById('history-tab-deleted')?.classList.toggle('active', tab === 'deleted');
  const filtersWrap = document.getElementById('history-filters-wrap');
  if (filtersWrap) filtersWrap.style.display = tab === 'deleted' ? 'none' : '';
  if (tab === 'deleted') {
    renderRecentlyDeleted();
  } else {
    renderStatusView(tab, 'history-list', 'history-search', 'history-area-filter');
  }
}

async function renderRecentlyDeleted() {
  const el = document.getElementById('history-list');
  if (!el) return;
  el.innerHTML = `<div style="color:var(--dim);padding:24px 0;text-align:center;font-size:13px">Loading...</div>`;
  let deleted;
  try { deleted = await api('GET', '/api/deleted'); }
  catch { el.innerHTML = `<div style="color:var(--red);padding:24px;text-align:center;font-size:13px">Failed to load</div>`; return; }

  const { records = [], areas = [] } = deleted;

  // Gather documents from deleted records
  const deletedDocs = [];
  records.forEach(r => {
    normalizeRecordDocs(r).forEach(d => {
      deletedDocs.push({ fileName: d.name, slot: d.slot, recordId: r.id, recordTitle: r.title || r.fields?.company || 'Untitled', deletedAt: r.deletedAt });
    });
  });

  if (!records.length && !areas.length) {
    el.innerHTML = `<div style="color:var(--muted);padding:40px 0;text-align:center">
      <div style="font-size:28px;margin-bottom:10px">🗑</div>
      <div style="font-size:13px">Nothing deleted recently.<br>Deleted items are kept here for 24 hours.</div>
    </div>`;
    return;
  }

  const now = Date.now();
  function timeLeft(deletedAt) {
    const ms = 24 * 60 * 60 * 1000 - (now - new Date(deletedAt).getTime());
    if (ms <= 0) return 'expiring soon';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
  }

  const rows = [
    ...areas.map(a => ({ kind: 'area', id: a.id, label: a.title, sub: 'Area', deletedAt: a.deletedAt })),
    ...records.map(r => ({ kind: 'record', id: r.id, label: r.title || r.fields?.company || 'Untitled', sub: r.type || 'record', deletedAt: r.deletedAt })),
  ].sort((a, b) => b.deletedAt.localeCompare(a.deletedAt));

  const recordSection = rows.map(row => `
    <div class="history-item deleted-item" data-deleted-kind="${row.kind}" data-deleted-id="${row.id}" title="Right-click for options">
      <div class="history-item-main">
        <span class="history-item-title">${escapeHtml(row.label)}</span>
        <span class="history-item-type">${row.sub}</span>
      </div>
      <div class="history-item-meta" style="color:var(--dim);font-size:11px">${timeLeft(row.deletedAt)}</div>
    </div>`).join('');

  const docSection = deletedDocs.length ? `
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:11px;font-weight:600;color:var(--muted);letter-spacing:.06em;margin-bottom:8px">DOCUMENTS IN TRASH</div>
      ${deletedDocs.map(d => `
        <div class="history-item deleted-item" data-deleted-kind="doc" data-deleted-id="${d.recordId}" data-doc-name="${escapeHtml(d.fileName)}" title="Right-click for options">
          <div class="history-item-main">
            <span class="history-item-title">${fileIcon(d.fileName)} ${escapeHtml(stripTimestamp(d.fileName))}</span>
            <span class="history-item-type">via ${escapeHtml(d.recordTitle)}</span>
          </div>
          <div class="history-item-meta" style="color:var(--dim);font-size:11px">${timeLeft(d.deletedAt)}</div>
        </div>`).join('')}
    </div>` : '';

  el.innerHTML = recordSection + docSection;

  // Right-click context menu on deleted items
  el.querySelectorAll('.deleted-item').forEach(item => {
    item.addEventListener('contextmenu', e => {
      e.preventDefault();
      closeCtxMenu();
      const { deletedKind, deletedId, docName } = item.dataset;
      const label = item.querySelector('.history-item-title')?.textContent?.trim() || '';
      const menu = document.createElement('div');
      menu.className = 'ctx-menu'; menu.id = 'ctx-menu';
      menu.style.cssText = `position:fixed;top:${e.clientY}px;left:${e.clientX}px`;

      if (deletedKind === 'doc') {
        menu.innerHTML = `
          <div class="ctx-item" id="ctx-restore">Restore with record</div>
          <div class="ctx-item" id="ctx-unattach">Keep file only (unattach)</div>
          <div class="ctx-item ctx-danger" id="ctx-perm-delete">Delete file permanently</div>`;
        document.body.appendChild(menu); _ctxMenu = menu;
        menu.querySelector('#ctx-restore').onclick = async () => {
          closeCtxMenu();
          const r = DB.records.find(rec => rec.id === deletedId);
          const recLabel = r?.title || r?.fields?.company || 'record';
          if (!confirm(`This will also restore "${recLabel}". Continue?`)) return;
          await api('POST', `/api/records/${deletedId}/restore`);
          if (r) r.deletedAt = null;
          renderSidebar();
          renderRecentlyDeleted();
        };
        menu.querySelector('#ctx-unattach').onclick = async () => {
          closeCtxMenu();
          const r = DB.records.find(rec => rec.id === deletedId);
          if (!r) return;
          // Strip this file from the record's documents so it shows as Unattached
          const updatedDocs = normalizeRecordDocs(r).filter(d => d.name !== docName);
          r.documents = updatedDocs;
          await api('PUT', `/api/records/${deletedId}`, { documents: updatedDocs });
          renderRecentlyDeleted();
        };
        menu.querySelector('#ctx-perm-delete').onclick = async () => {
          closeCtxMenu();
          if (!confirm(`Permanently delete this file? This cannot be undone.`)) return;
          await api('DELETE', `/api/files/${encodeURIComponent(docName)}`);
          renderRecentlyDeleted();
        };
      } else {
        menu.innerHTML = `
          <div class="ctx-item" id="ctx-restore">Restore</div>
          <div class="ctx-item ctx-danger" id="ctx-perm-delete">Delete permanently</div>`;
        document.body.appendChild(menu); _ctxMenu = menu;
        menu.querySelector('#ctx-restore').onclick = async () => {
          closeCtxMenu();
          await api('POST', `/api/${deletedKind === 'area' ? 'areas' : 'records'}/${deletedId}/restore`);
          if (deletedKind === 'area') {
            const restored = DB.areas.find(a => a.id === deletedId);
            if (restored) restored.deletedAt = null;
          } else {
            const restored = DB.records.find(r => r.id === deletedId);
            if (restored) restored.deletedAt = null;
          }
          renderSidebar();
          renderRecentlyDeleted();
        };
        menu.querySelector('#ctx-perm-delete').onclick = async () => {
          closeCtxMenu();
          if (!confirm(`Permanently delete "${label}"? This cannot be undone.`)) return;
          await api('DELETE', `/api/${deletedKind === 'area' ? 'areas' : 'records'}/${deletedId}/permanent`);
          if (deletedKind === 'area') DB.areas = DB.areas.filter(a => a.id !== deletedId);
          else DB.records = DB.records.filter(r => r.id !== deletedId);
          renderRecentlyDeleted();
        };
      }
    });
  });
}

function renderCompletedView() { historyTab = 'completed'; renderHistoryView(); }
function renderArchivedView() { historyTab = 'archived'; renderHistoryView(); }

// â"€â"€ WEEKLY REVIEW â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
async function saveReview() {
  const wins = document.getElementById('w-wins').value.trim();
  const stuck = document.getElementById('w-stuck').value.trim();
  const focus = document.getElementById('w-focus').value.trim();
  if (!wins && !stuck && !focus) return;
  const rev = await api('POST', '/api/reviews', { wins, stuck, focus, date: new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' }) });
  DB.reviews.unshift(rev);
  document.getElementById('w-wins').value = '';
  document.getElementById('w-stuck').value = '';
  document.getElementById('w-focus').value = '';
  renderWeekly();
}

function renderWeekly() {
  // Render week calendar in right panel
  const calPanel = document.getElementById('weekly-cal-panel');
  const calLabel = document.getElementById('weekly-cal-label');
  if (calPanel) {
    const today = new Date();
    const dow = today.getDay();
    const mon = new Date(today); mon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    if (calLabel) calLabel.textContent = mon.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
      ' — ' + sun.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    renderCalWidget('weekly-cal-panel', false);
  }
  const el = document.getElementById('review-history');
  el.innerHTML = DB.reviews.length ? DB.reviews.map(r => `
    <div class="review-entry">
      <div class="review-date">${r.date}</div>
      ${r.wins ? `<div class="review-block"><div class="review-block-label">Moved forward</div><div class="review-block-text">${r.wins}</div></div>` : ''}
      ${r.stuck ? `<div class="review-block"><div class="review-block-label">Stuck</div><div class="review-block-text">${r.stuck}</div></div>` : ''}
      ${r.focus ? `<div class="review-block"><div class="review-block-label">Next week</div><div class="review-block-text">${r.focus}</div></div>` : ''}
    </div>`).join('') : '<div class="empty">No reviews yet.</div>';
}

// â"€â"€ MODAL â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function openModal(title, body, actions) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-actions').innerHTML = actions.map(a =>
    `<button class="btn ${a.primary ? 'btn-p' : ''}" onclick="${a.onclick.toString().includes('function') ? '' : ''}" id="modal-btn-${a.label.replace(/\s/g,'')}">${a.label}</button>`
  ).join('');
  actions.forEach(a => {
    document.getElementById('modal-btn-' + a.label.replace(/\s/g,'')).onclick = a.onclick;
  });
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// â"€â"€ STICKY NOTES â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
const NOTE_COLORS = ['color-amber','color-red','color-green'];
function noteColorNext(current) {
  const i = NOTE_COLORS.indexOf(current||'color-amber');
  return NOTE_COLORS[(i+1) % NOTE_COLORS.length];
}
function noteColorLabel(c) { return c==='color-red'?'🔴':c==='color-green'?'🟢':'🟡'; }

function buildNoteHTML(n, i, recordId) {
  const color = n.color || 'color-amber';
  return `<div class="sticky-note ${color}" id="note-${recordId}-${i}">
    <div class="sticky-note-controls">
      <button class="sticky-note-btn" onclick="moveNote('${recordId}',${i},-1)" title="Move up">▲</button>
      <button class="sticky-note-btn" onclick="moveNote('${recordId}',${i},1)" title="Move down">▼</button>
      <button class="sticky-note-btn" onclick="cycleNoteColor('${recordId}',${i})" title="Change color">${noteColorLabel(color)}</button>
    </div>
    <div class="sticky-note-body">
      <div class="sticky-note-text">${escapeHtml(n.text)}</div>
      <div class="sticky-note-date">${formatDateTime(n.createdAt)}</div>
    </div>
    <button class="sticky-note-del" onclick="deleteNote('${recordId}',${i})">Ã—</button>
  </div>`;
}

function renderNotesSection(r) {
  const notes = r.notes || [];
  const notesHTML = notes.map((n, i) => buildNoteHTML(n, i, r.id)).join('');
  return `<div class="section-card collapsible-section">
    <div class="section-title section-toggle" onclick="toggleSection(this)"><span class="section-chevron">▾</span> Notes</div>
    <div class="section-body">
    <div class="notes-list" id="notes-list-${r.id}">${notesHTML}</div>
    <div class="notes-input-wrap">
      <textarea id="notes-input-${r.id}" placeholder="Add a note — Enter to save, Shift+Enter for new line..." rows="1"
        onkeydown="notesKeydown(event,'${r.id}')"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"></textarea>
    </div>
    </div>
  </div>`;
}

function escapeHtml(text) {
  return (text||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function notesKeydown(e, recordId) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    const inp = document.getElementById('notes-input-' + recordId);
    const text = inp.value.trim();
    if (!text) return;
    saveNote(recordId, text);
    inp.value = '';
    inp.style.height = 'auto';
  }
}

async function saveNote(recordId, text) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  r.notes = r.notes || [];
  r.notes.unshift({ text, color: 'color-amber', createdAt: new Date().toISOString() });
  await api('PUT', `/api/records/${recordId}`, { notes: r.notes });
  const list = document.getElementById('notes-list-' + recordId);
  if (list) {
    refreshNoteIndices(recordId);
  }
}

function refreshNoteIndices(recordId) {
  const list = document.getElementById('notes-list-' + recordId);
  if (!list) return;
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  list.innerHTML = (r.notes||[]).map((n,i) => buildNoteHTML(n,i,recordId)).join('');
}

async function moveNote(recordId, index, dir) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r || !r.notes) return;
  const newIndex = index + dir;
  if (newIndex < 0 || newIndex >= r.notes.length) return;
  const tmp = r.notes[index]; r.notes[index] = r.notes[newIndex]; r.notes[newIndex] = tmp;
  await api('PUT', `/api/records/${recordId}`, { notes: r.notes });
  refreshNoteIndices(recordId);
}

async function cycleNoteColor(recordId, index) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r || !r.notes || !r.notes[index]) return;
  r.notes[index].color = noteColorNext(r.notes[index].color);
  await api('PUT', `/api/records/${recordId}`, { notes: r.notes });
  refreshNoteIndices(recordId);
}

async function deleteNote(recordId, index) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r || !r.notes) return;
  r.notes.splice(index, 1);
  await api('PUT', `/api/records/${recordId}`, { notes: r.notes });
  const list = document.getElementById('notes-list-' + recordId);
  if (list) {
    list.querySelectorAll('.sticky-note')[index]?.remove();
    refreshNoteIndices(recordId);
  }
}

// â"€â"€ JOB SCRAPE â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
async function triggerScrape(recordId) {
  const urlInput = document.getElementById('posting-url-' + recordId);
  const url = urlInput?.value?.trim();
  if (!url || !url.startsWith('http')) return;
  const panel = document.getElementById('scrape-panel-' + recordId);
  if (!panel) return;
  panel.style.display = 'block';
  panel.innerHTML = '<div class="scrape-panel"><div style="color:var(--muted);font-size:12px">Fetching job posting...</div></div>';

  try {
    const res = await fetch('/api/scrape-job', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ url }) });
    const data = await res.json();
    if (data.success && data.text) {
      // Parse the scraped text with Claude
      const parseRes = await fetch('/api/parse-job', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text: data.text }) });
      const parsed = await parseRes.json();
      if (parsed.success && (parsed.role || parsed.company)) {
        showScrapeConfirm(recordId, parsed);
      } else {
        showScrapeFallback(recordId, 'Could not extract enough info from the page.');
      }
    } else {
      showScrapeFallback(recordId, data.hint || 'Could not access the posting — it may require a login.');
    }
  } catch(e) {
    showScrapeFallback(recordId, 'Error fetching posting.');
  }
}

function showScrapeConfirm(recordId, data) {
  const panel = document.getElementById('scrape-panel-' + recordId);
  if (!panel) return;
  const fields = [
    ['Role', data.role], ['Company', data.company], ['Location', data.location],
    ['Salary', data.salary], ['Description', data.description ? data.description.slice(0,200)+'...' : null]
  ].filter(([,v]) => v);
  panel.innerHTML = `<div class="scrape-panel">
    <div class="scrape-panel-title">Found — apply these fields?</div>
    ${fields.map(([l,v]) => `<div class="scrape-field"><div class="scrape-field-label">${l}</div><div class="scrape-field-value">${v}</div></div>`).join('')}
    <div class="scrape-actions">
      <button class="btn btn-p btn-sm" onclick="applyScrapeData('${recordId}',${JSON.stringify(JSON.stringify(data))})">Apply</button>
      <button class="btn btn-sm" onclick="document.getElementById('scrape-panel-${recordId}').style.display='none'">Dismiss</button>
    </div>
  </div>`;
}

function showScrapeFallback(recordId, reason) {
  const panel = document.getElementById('scrape-panel-' + recordId);
  if (!panel) return;
  panel.innerHTML = `<div class="scrape-panel">
    <div style="color:var(--muted);font-size:12px;margin-bottom:8px">${reason}</div>
    <div class="scrape-fallback-label">Paste the job description or drop a screenshot:</div>
    <textarea class="ti" id="scrape-paste-${recordId}" placeholder="Paste job description here..." style="min-height:80px;margin-bottom:8px"></textarea>
    <div style="border:1px dashed var(--border2);border-radius:6px;padding:8px;text-align:center;cursor:pointer;font-size:11px;color:var(--muted);margin-bottom:8px"
      ondragover="event.preventDefault()" ondrop="scrapeImageDrop(event,'${recordId}')"
      onclick="document.getElementById('scrape-img-${recordId}').click()">
      Drop screenshot here or click to upload
      <input type="file" id="scrape-img-${recordId}" accept="image/*" style="display:none" onchange="scrapeImageSelected(event,'${recordId}')">
    </div>
    <div class="scrape-actions">
      <button class="btn btn-p btn-sm" onclick="parsePastedJob('${recordId}')">Parse text</button>
      <button class="btn btn-sm" onclick="document.getElementById('scrape-panel-${recordId}').style.display='none'">Cancel</button>
    </div>
  </div>`;
}

async function parsePastedJob(recordId) {
  const ta = document.getElementById('scrape-paste-' + recordId);
  const text = ta?.value?.trim();
  if (!text) return;
  const panel = document.getElementById('scrape-panel-' + recordId);
  panel.innerHTML = '<div class="scrape-panel"><div style="color:var(--muted);font-size:12px">Parsing...</div></div>';
  const res = await fetch('/api/parse-job', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ text }) });
  const data = await res.json();
  if (data.success) showScrapeConfirm(recordId, data);
  else showScrapeFallback(recordId, 'Could not parse. Try a cleaner paste.');
}

async function scrapeImageDrop(e, recordId) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) await parseJobImage(recordId, file);
}
async function scrapeImageSelected(e, recordId) {
  const file = e.target.files[0];
  if (file) await parseJobImage(recordId, file);
}
async function parseJobImage(recordId, file) {
  const panel = document.getElementById('scrape-panel-' + recordId);
  panel.innerHTML = '<div class="scrape-panel"><div style="color:var(--muted);font-size:12px">Reading screenshot...</div></div>';
  const reader = new FileReader();
  reader.onload = async e => {
    const base64 = e.target.result.split(',')[1];
    const res = await fetch('/api/parse-job', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ imageBase64: base64, imageType: file.type }) });
    const data = await res.json();
    if (data.success) showScrapeConfirm(recordId, data);
    else showScrapeFallback(recordId, 'Could not read screenshot. Try pasting the text instead.');
  };
  reader.readAsDataURL(file);
}

async function applyScrapeData(recordId, jsonStr) {
  const data = JSON.parse(jsonStr);
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  if (data.role && !r.fields.role) { r.fields.role = data.role; }
  if (data.location && !r.fields.location) { r.fields.location = data.location; }
  if (data.salary && !r.fields.salary) { r.fields.salary = data.salary; }
  if (data.description) { r.fields.jobDescription = data.description; }
  if (data.company) { r.fields.company = data.company; r.title = r.title || data.company; }
  await api('PUT', `/api/records/${recordId}`, { title: r.title, fields: r.fields });
  document.getElementById('scrape-panel-' + recordId).style.display = 'none';
  // Check if company exists, prompt to create
  if (data.company) checkAndPromptCompany(recordId, data.company);
  renderRecordView(recordId);
}

// Auto-prompt company creation
function checkAndPromptCompany(recordId, companyName) {
  if (!companyName) return;
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  const exact = DB.records.find(co => co.type === 'company' && co.title.toLowerCase() === companyName.toLowerCase());
  if (exact) { r.companyId = exact.id; api('PUT', `/api/records/${recordId}`, { companyId: exact.id }); return; }
  const fuzzy = DB.records.find(co => co.type === 'company' && (co.title.toLowerCase().includes(companyName.toLowerCase()) || companyName.toLowerCase().includes(co.title.toLowerCase())));
  if (fuzzy) { r.companyId = fuzzy.id; api('PUT', `/api/records/${recordId}`, { companyId: fuzzy.id }); return; }
  if (confirm('Create company record for "' + companyName + '"?')) { createCompanyFromJob(recordId, companyName); }
}

async function createCompanyFromJob(recordId, name) {
  const r = DB.records.find(rec => rec.id === recordId);
  const co = await api('POST', '/api/records', {
    type: 'company', areaId: r?.areaId || 'area-jobs', title: name,
    status: 'active', urgency: 'new', priority: 2,
    fields: { industry:'', website:'', location: r?.fields?.location||'', notes:'' },
    links: [], notes: []
  });
  DB.records.push(co);
  // Link job to company
  r.companyId = co.id;
  await api('PUT', `/api/records/${recordId}`, { companyId: co.id });
}

// â"€â"€ COPY CONTEXT â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function copyRecordContext(recordId) {
  const r = DB.records.find(r => r.id === recordId);
  if (!r) return;
  const area = DB.areas.find(a => a.id === r.areaId);
  const lines = [];
  const add = s => lines.push(s);
  const br = () => lines.push('');

  add('## ' + r.title + ' (' + r.type + ')');
  add('Area: ' + (area ? area.title : '') + ' | Status: ' + r.status);
  br();

  if (r.type === 'job') {
    const f = r.fields || {};
    add('### Role details');
    if (f.role) add('Role: ' + f.role);
    if (f.salary) add('Salary: ' + f.salary);
    if (f.location) add('Location: ' + f.location);
    if (f.appliedDate) add('Applied: ' + formatDate(f.appliedDate));
    if (f.source) add('Source: ' + f.source);
    if (f.postingUrl) add('Posting: ' + f.postingUrl);
    if (f.notes) { br(); add('Notes: ' + f.notes); }
    if (r.interviews && r.interviews.length) {
      br(); add('### Interviews');
      r.interviews.forEach(function(i) {
        add('Round ' + i.round + ': ' + (i.interviewer||'') + ' — ' + formatDate(i.date) + (i.time ? ' at ' + fmtTime(i.time) : '') + (i.format ? ' (' + i.format + ')' : ''));
        if (i.location) add('  Location: ' + i.location);
        if (i.link) add('  Link: ' + i.link);
        if (i.notes) add('  Notes: ' + i.notes);
      });
    }
    const contacts = (r.contacts||[]).map(function(id){ return DB.records.find(function(c){ return c.id===id; }); }).filter(Boolean);
    if (contacts.length) {
      br(); add('### Contacts');
      contacts.forEach(function(ct) { add(ct.title + ' — ' + (ct.fields.role||'') + (ct.fields.email ? ' | ' + ct.fields.email : '')); });
    }
    if (r.documents && r.documents.length) {
      br(); add('### Documents');
      r.documents.filter(function(d){ return d.name && d.name !== 'undefined'; }).forEach(function(d) { add((d.slot||'other') + ': ' + stripTimestamp(d.name)); });
    }
    if (f.jobDescription) { br(); add('### Job description'); add(f.jobDescription); }
  } else if (r.type === 'contact') {
    const f = r.fields || {};
    if (f.role) add('Role: ' + f.role);
    if (f.company) add('Company: ' + f.company);
    if (f.email) add('Email: ' + f.email);
    if (f.phone) add('Phone: ' + f.phone);
    if (f.linkedin) add('LinkedIn: ' + f.linkedin);
    const ctNotes = (r.notes||[]);
    if (ctNotes.length) { br(); add('### Notes'); ctNotes.forEach(function(n){ add('- ' + n.text); }); }
  } else if (r.type === 'event') {
    const f = r.fields || {};
    if (f.date) add('Date: ' + formatDate(f.date) + (f.time ? ' at ' + fmtTime(f.time) : ''));
    if (f.location) add('Location: ' + f.location);
    if (f.link) add('Link: ' + f.link);
    if (f.notes) add('Notes: ' + f.notes);
  } else {
    const f = r.fields || {};
    Object.keys(f).forEach(function(k) { if (f[k] && k !== 'notes') add(capitalize(k) + ': ' + f[k]); });
    if (f.notes) { br(); add('Notes: ' + f.notes); }
  }

  const timeline = (r.timeline||[]).slice().sort(function(a,b){ return b.date.localeCompare(a.date); }).slice(0,5);
  if (timeline.length) {
    br(); add('### Recent history');
    timeline.forEach(function(e) { add(formatDateTime(e.date) + ': ' + e.text); });
  }

  br();
  add('---');
  add('(From dashboard — ' + new Date().toLocaleDateString('en-US', {weekday:'long',month:'long',day:'numeric',year:'numeric'}) + ')');

  const text = lines.join('\n');
  const btn = document.querySelector('[onclick*="copyRecordContext"]');
  const showCopied = function() {
    if (btn) { const o = btn.innerHTML; btn.innerHTML = '✓ Copied!'; setTimeout(function(){ btn.innerHTML = o; }, 2000); }
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(showCopied).catch(function() {
      const ta = document.createElement('textarea'); ta.value = text;
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      showCopied();
    });
  } else {
    const ta = document.createElement('textarea'); ta.value = text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showCopied();
  }
}

// â"€â"€ UTILS â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function showCompanySuggestions(input, recordId) {
  const val = input.value.trim().toLowerCase();
  const box = document.getElementById('company-suggestions-' + recordId);
  if (!box) return;
  if (!val) { box.style.display = 'none'; return; }
  const companies = DB.records.filter(r => r.type === 'company' && r.title.toLowerCase().includes(val));
  if (!companies.length) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  box.innerHTML = companies.map(co =>
    `<div style="padding:7px 10px;cursor:pointer;font-size:13px;color:var(--text)" 
      onmousedown="selectCompany('${recordId}','${co.id}','${co.title.replace(/'/g,"\'")}')"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background=''">${co.title}
      <span style="font-size:11px;color:var(--dim);margin-left:6px">${co.fields.industry||''}</span>
    </div>`
  ).join('') + `<div style="padding:7px 10px;cursor:pointer;font-size:12px;color:var(--accent);border-top:1px solid var(--border)"
    onmousedown="createAndSelectCompany('${recordId}',document.getElementById('company-input-${recordId}').value)">
    + Create "${input.value}"
  </div>`;
}

function hideCompanySuggestions(recordId) {
  setTimeout(() => {
    const box = document.getElementById('company-suggestions-' + recordId);
    if (box) box.style.display = 'none';
    const input = document.getElementById('company-input-' + recordId);
    if (input) saveCompanyField(recordId, input.value, null);
  }, 150);
}

function companyInputKey(e, recordId) {
  if (e.key === 'Escape') hideCompanySuggestions(recordId);
}

async function selectCompany(recordId, companyId, companyName) {
  const input = document.getElementById('company-input-' + recordId);
  if (input) input.value = companyName;
  const box = document.getElementById('company-suggestions-' + recordId);
  if (box) box.style.display = 'none';
  await saveCompanyField(recordId, companyName, companyId);
}

async function createAndSelectCompany(recordId, name) {
  const r = DB.records.find(r => r.id === recordId);
  const co = await api('POST', '/api/records', {
    type: 'company', areaId: r?.areaId || DB.areas[0]?.id, title: name,
    status: 'active', urgency: 'new', priority: 2,
    fields: { industry:'', website:'', location:'', notes:'' },
    links: [], companyId: null
  });
  DB.records.push(co);
  await selectCompany(recordId, co.id, name);
}

async function saveCompanyField(recordId, name, companyId) {
  const r = getRecord(recordId);
  if (!r) return;
  r.fields.company = name;
  r.companyId = companyId;
  await api('PUT', `/api/records/${recordId}`, { fields: r.fields, companyId });
  const linkEl = document.getElementById('company-link-' + recordId);
  // Refresh the link display
}

function linkableCompany(company, companyId) {
  if (!company) return '';
  const co = companyId ? getRecord(companyId) : getRecordsByType('company').find(r => r.title === company);
  if (co) return `<span class="doc-ref" data-record-link data-area-id="${co.areaId}" data-record-id="${co.id}" style="color:var(--accent)">${company} →</span>`;
  const linked = getRecordsByType('job').find(r => r.title === company);
  if (linked) return `<span class="doc-ref" data-record-link data-area-id="${linked.areaId}" data-record-id="${linked.id}" style="color:var(--accent)">${company} →</span>`;
  return `<span>${company}</span>`;
}
function formatDate(ds) {
  if (!ds) return '';
  const d = new Date(ds + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });
}
function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ' ' + d.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
}
function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${h < 12 ? 'AM' : 'PM'}`;
}
function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }
function pluralize(type) { return {company:'Companies',activity:'Activities',category:'Categories'}[type] || capitalize(type)+'s'; }
function typeIcon(type) {
  return { job:'💼', contact:'👤', event:'📅', goal:'🎯', task:'✔', project:'📨', note:'📝', account:'💳', transaction:'💸' }[type] || '•';
}

function openJobModal(areaId) {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal').style.maxWidth = '520px';
  document.getElementById('modal-title').innerHTML = '&#x1F4BC; <span style="font-size:18px;font-weight:600">Add job application</span>';
  document.getElementById('modal-body').innerHTML = '<div style="margin-bottom:16px;color:var(--muted);font-size:14px">Paste the job posting URL to auto-fill the details.</div><div class="modal-field"><input class="modal-input" id="job-url-input" placeholder="https://..." style="font-size:15px;padding:12px 14px" autofocus></div>';
  const acts = document.getElementById('modal-actions');
  acts.innerHTML = '';
  const cancel = document.createElement('button');
  cancel.className = 'btn'; cancel.textContent = 'Cancel'; cancel.onclick = closeModal;
  const skip = document.createElement('button');
  skip.className = 'btn'; skip.style.color = 'var(--muted)'; skip.textContent = 'Skip → manual';
  skip.onclick = () => showJobFallbackModal(areaId, '', '');
  const fetch = document.createElement('button');
  fetch.className = 'btn btn-p'; fetch.style.cssText = 'font-size:13px;padding:8px 20px'; fetch.textContent = 'Fetch posting →';
  fetch.onclick = function() { this.disabled = true; this.textContent = 'Fetching…'; startJobScrape(areaId); };
  acts.appendChild(cancel); acts.appendChild(skip); acts.appendChild(fetch);
  setTimeout(() => {
    const inp = document.getElementById('job-url-input');
    if (inp) { inp.focus(); inp.addEventListener('keydown', e => { if (e.key==='Enter') startJobScrape(areaId); }); }
  }, 50);
}

function openAddCompanyModal(areaId) {
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal').style.maxWidth = '480px';
  document.getElementById('modal-title').innerHTML = '&#x1F3E2; <span style="font-size:18px;font-weight:600">Add company</span>';
  const body = document.getElementById('modal-body'); body.innerHTML = '';
  [['co-name','Company name','e.g. Kennicott Brothers',true],['co-industry','Industry','e.g. Wholesale Floral',false],['co-website','Website','https://',false],['co-location','Location','e.g. Chicago, IL',false]].forEach(([id,label,ph,req]) => {
    const w=document.createElement('div');w.style.marginBottom='10px';
    const l=document.createElement('div');l.style.cssText='font-size:12px;color:var(--dim);margin-bottom:4px';l.textContent=label+(req?' *':'');
    const inp=document.createElement('input');inp.className='modal-input';inp.id=id;inp.placeholder=ph;inp.style.cssText='font-size:14px;padding:9px 12px';
    w.appendChild(l);w.appendChild(inp);body.appendChild(w);
  });
  const acts=document.getElementById('modal-actions');acts.innerHTML='';
  const cancel=document.createElement('button');cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=closeModal;
  const create=document.createElement('button');create.className='btn btn-p';create.style.cssText='font-size:13px;padding:8px 20px';create.textContent='Create company';
  create.onclick=()=>submitAddCompany(areaId);
  acts.appendChild(cancel);acts.appendChild(create);
  setTimeout(()=>{ const n=document.getElementById('co-name'); if(n){n.focus();n.addEventListener('keydown',e=>{if(e.key==='Enter')submitAddCompany(areaId);});} },50);
}

async function submitAddCompany(areaId) {
  const name=document.getElementById('co-name')?.value?.trim();
  if(!name){document.getElementById('co-name').style.borderColor='var(--red)';return;}
  const co=await api('POST','/api/records',{type:'company',areaId:areaId||'area-jobs',title:name,status:'active',urgency:'new',priority:2,fields:{industry:document.getElementById('co-industry')?.value?.trim()||'',website:document.getElementById('co-website')?.value?.trim()||'',location:document.getElementById('co-location')?.value?.trim()||'',notes:''},links:[],notes:[]});
  DB.records.push(co);
  DB.records.forEach(async r=>{ if(r.companyId)return; const n=r.type==='job'?r.title:r.fields?.company; if(n&&n.toLowerCase()===name.toLowerCase()){r.companyId=co.id;await api('PUT',`/api/records/${r.id}`,{companyId:co.id});} });
  closeModal();document.getElementById('modal').style.maxWidth='';renderSidebar();navigate('record',areaId||'area-jobs',co.id);
}

async function startJobScrape(areaId) {
  const url=document.getElementById('job-url-input')?.value?.trim();
  if(!url){showJobFallbackModal(areaId,'','No URL entered.');return;}
  document.getElementById('modal-body').innerHTML='<div style="text-align:center;padding:32px 0"><div style="font-size:32px;margin-bottom:12px">&#x1F50D;</div><div style="font-size:15px;font-weight:500;color:var(--text);margin-bottom:6px">Fetching job posting...</div><div style="font-size:13px;color:var(--muted)">'+url+'</div></div>';
  document.getElementById('modal-actions').innerHTML='';
  try {
    const res=await fetch('/api/scrape-job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url})});
    const data=await res.json();
    if(data.success&&data.text){
      document.getElementById('modal-body').innerHTML='<div style="text-align:center;padding:24px 0"><div style="font-size:32px;margin-bottom:12px">&#x2728;</div><div style="font-size:15px;font-weight:500;color:var(--text)">Extracting details...</div></div>';
      const pr=await fetch('/api/parse-job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:data.text})});
      const parsed=await pr.json();
      if(parsed.success&&(parsed.role||parsed.company))showJobScrapeConfirmModal(areaId,parsed,url);
      else showJobFallbackModal(areaId,url,'Could not extract enough info.');
    } else { showJobFallbackModal(areaId,url,data.hint||'Could not access this posting.'); }
  } catch(e){showJobFallbackModal(areaId,url,'Error: '+e.message);}
}

function showJobScrapeConfirmModal(areaId,data,url){
  const fields=[{label:'Company',value:data.company,color:'#5b9bd5'},{label:'Role',value:data.role,color:'#9b7fd4'},{label:'Location',value:data.location,color:'#4caf7d'},{label:'Salary',value:data.salary,color:'#d4943a'}].filter(f=>f.value);
  const body=document.getElementById('modal-body');
  body.innerHTML='<div style="margin-bottom:16px"><div style="font-size:13px;color:var(--muted);margin-bottom:14px">Found — confirm to create:</div>'+fields.map(f=>'<div style="display:flex;align-items:baseline;gap:10px;padding:8px 0;border-top:1px solid var(--border)"><div style="font-size:11px;font-weight:600;color:'+f.color+';width:70px;text-transform:uppercase;letter-spacing:.05em">'+f.label+'</div><div style="font-size:15px;font-weight:500;color:var(--text)">'+f.value+'</div></div>').join('')+(data.description?'<div style="margin-top:10px;padding:10px;background:var(--bg3);border-radius:6px;font-size:12px;color:var(--muted);max-height:80px;overflow:hidden">'+data.description.slice(0,300)+'...</div>':'')+'</div>';
  const acts=document.getElementById('modal-actions');acts.innerHTML='';
  const cancel=document.createElement('button');cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=closeModal;
  const apply=document.createElement('button');apply.className='btn btn-p';apply.style.cssText='font-size:13px;padding:8px 20px';apply.textContent='Create record →';
  apply.onclick=function(){this.disabled=true;this.textContent='Creating…';createJobRecord(areaId,JSON.stringify(data),url);};
  acts.appendChild(cancel);acts.appendChild(apply);
}

function showJobFallbackModal(areaId,url,reason){
  const body=document.getElementById('modal-body');body.innerHTML='';
  if(reason){const w=document.createElement('div');w.style.cssText='color:var(--amber);font-size:13px;margin-bottom:14px;padding:10px;background:rgba(212,148,58,.1);border-radius:6px;border:1px solid rgba(212,148,58,.2)';w.textContent='⚠️ '+reason;body.appendChild(w);}
  const lbl=document.createElement('div');lbl.style.cssText='font-size:13px;color:var(--muted);margin-bottom:12px';lbl.textContent='Paste the job description or drop a screenshot:';body.appendChild(lbl);
  const ta=document.createElement('textarea');ta.className='modal-input';ta.id='job-paste-text';ta.placeholder='Paste job description here...';ta.style.cssText='min-height:120px;font-size:13px;margin-bottom:10px';body.appendChild(ta);
  const dz=document.createElement('div');dz.style.cssText='border:2px dashed var(--border2);border-radius:8px;padding:16px;text-align:center;cursor:pointer;color:var(--muted);font-size:13px;margin-bottom:10px';
  dz.textContent='Drop screenshot or click to upload';dz.ondragover=e=>e.preventDefault();dz.ondrop=e=>{e.preventDefault();processJobModalImage(e.dataTransfer.files[0],areaId,url);};dz.onclick=()=>ii.click();body.appendChild(dz);
  const ii=document.createElement('input');ii.type='file';ii.accept='image/*';ii.style.display='none';ii.onchange=e=>processJobModalImage(e.target.files[0],areaId,url);body.appendChild(ii);
  const co=document.createElement('input');co.className='modal-input';co.id='job-fb-company';co.placeholder='Company name';co.style.cssText='margin-top:8px;font-size:13px';body.appendChild(co);
  const ro=document.createElement('input');ro.className='modal-input';ro.id='job-fb-role';ro.placeholder='Job title / role';ro.style.cssText='margin-top:6px;font-size:13px';body.appendChild(ro);
  const lo=document.createElement('input');lo.className='modal-input';lo.id='job-fb-location';lo.placeholder='Location';lo.style.cssText='margin-top:6px;font-size:13px';body.appendChild(lo);
  const acts=document.getElementById('modal-actions');acts.innerHTML='';
  const cancel=document.createElement('button');cancel.className='btn';cancel.textContent='Cancel';cancel.onclick=closeModal;
  const parse=document.createElement('button');parse.className='btn';parse.style.color='var(--accent)';parse.textContent='Parse text';parse.onclick=()=>parseJobModalText(areaId,url);
  const create=document.createElement('button');create.className='btn btn-p';create.style.cssText='font-size:13px;padding:8px 20px';create.textContent='Create record →';create.onclick=function(){createJobFromFallback(areaId,url,this);};
  acts.appendChild(cancel);acts.appendChild(parse);acts.appendChild(create);
}

async function parseJobModalText(areaId,url){
  const text=document.getElementById('job-paste-text')?.value?.trim();if(!text)return;
  document.getElementById('modal-body').innerHTML='<div style="text-align:center;padding:24px 0"><div style="font-size:32px">&#x2728;</div><div style="font-size:14px;color:var(--muted);margin-top:8px">Parsing...</div></div>';
  document.getElementById('modal-actions').innerHTML='';
  const res=await fetch('/api/parse-job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text})});
  const data=await res.json();
  if(data.success&&(data.role||data.company))showJobScrapeConfirmModal(areaId,data,url);
  else showJobFallbackModal(areaId,url,'Could not parse. Try a cleaner paste.');
}

async function jobModalImageDrop(e,areaId,url){e.preventDefault();await processJobModalImage(e.dataTransfer.files[0],areaId,url);}
async function jobModalImageSelected(e,areaId,url){await processJobModalImage(e.target.files[0],areaId,url);}
async function processJobModalImage(file,areaId,url){
  document.getElementById('modal-body').innerHTML='<div style="text-align:center;padding:24px 0"><div style="font-size:32px">&#x1F4F8;</div><div style="font-size:14px;color:var(--muted);margin-top:8px">Reading screenshot...</div></div>';
  document.getElementById('modal-actions').innerHTML='';
  const reader=new FileReader();
  reader.onload=async e=>{
    const base64=e.target.result.split(',')[1];
    const res=await fetch('/api/parse-job',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageBase64:base64,imageType:file.type})});
    const data=await res.json();
    if(data.success&&(data.role||data.company))showJobScrapeConfirmModal(areaId,data,url);
    else showJobFallbackModal(areaId,url,'Could not read screenshot.');
  };reader.readAsDataURL(file);
}

function createJobFromFallback(areaId,url,btn){
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
  const company=document.getElementById('job-fb-company')?.value?.trim()||'';
  const role=document.getElementById('job-fb-role')?.value?.trim()||'';
  const location=document.getElementById('job-fb-location')?.value?.trim()||'';
  createJobRecord(areaId,JSON.stringify({company,role,location}),url);
}

async function createJobRecord(areaId,dataStr,url){
  const data=typeof dataStr==='string'?JSON.parse(dataStr):dataStr;
  const title=data.company||data.role||'New Job';
  const rec=await api('POST','/api/records',{type:'job',areaId,title,status:'applied',urgency:'new',priority:3,fields:{role:data.role||'',salary:data.salary||'',location:data.location||'',appliedDate:'',source:'',postingUrl:url||'',resumeUsed:'',coverLetterUsed:'',jobDescription:data.description||'',notes:''},contacts:[],interviews:[],documents:[],notes:[]});
  DB.records.push(rec);
  assistantNotify('record-created', rec);
  closeModal();document.getElementById('modal').style.maxWidth='';renderSidebar();
  if(data.company)checkAndPromptCompany(rec.id,data.company);
  navigate('record',areaId,rec.id);
}

// Undo stack
const undoStack = [];
function pushUndo(a){undoStack.push(a);if(undoStack.length>20)undoStack.shift();}
async function undoLast(){
  const a=undoStack.pop();if(!a)return;
  const r=DB.records.find(r=>r.id===a.recordId);if(!r)return;
  if(a.type==='status'){r.status=a.before;await api('PUT',`/api/records/${a.recordId}`,{status:a.before});await api('POST',`/api/records/${a.recordId}/timeline`,{text:'Undo: status reverted to '+a.before});const u=await api('GET',`/api/records/${a.recordId}`);DB.records=DB.records.map(rec=>rec.id===a.recordId?u:rec);}
  else if(a.type==='urgency'){r.urgency=a.before;await api('PUT',`/api/records/${a.recordId}`,{urgency:a.before});}
  renderSidebar();
  if(currentView==='record')renderRecordView(a.recordId);
  if(currentView==='dashboard')renderDashboard();
  if(currentView==='area')renderAreaView(currentAreaId);
}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){e.preventDefault();undoLast();}});

async function setRecordStatus(recordId,newStatus){
  const r=DB.records.find(r=>r.id===recordId);if(!r)return;
  const prev=r.status;
  pushUndo({type:'status',recordId,before:prev,after:newStatus});
  r.status=newStatus;
  if(newStatus==='completed'||newStatus==='archived') r.urgency='none';
  // Re-render immediately with local state
  renderSidebar();
  if(currentView==='record')renderRecordView(recordId);
  if(currentView==='dashboard')renderAttention();
  if(currentView==='area')renderAreaView(currentAreaId);
  // Persist in background
  const payload = (newStatus==='completed'||newStatus==='archived') ? {status:newStatus,urgency:'none'} : {status:newStatus};
  api('PUT',`/api/records/${recordId}`,payload);
  api('POST',`/api/records/${recordId}/timeline`,{text:'Status: '+prev+' → '+newStatus});
}

async function setUrgency(recordId,level){
  const r=DB.records.find(r=>r.id===recordId);if(!r)return;
  const prev=r.urgency||'none';
  pushUndo({type:'urgency',recordId,before:prev,after:level});
  r.urgency=level;
  // Re-render immediately with local state
  renderSidebar();
  if(currentView==='record')renderRecordView(recordId);
  if(currentView==='dashboard')renderAttention();
  if(currentView==='area')renderAreaView(currentAreaId);
  // Persist in background
  api('PUT',`/api/records/${recordId}`,{urgency:level});
}

// Context menu
let _ctxMenu=null;
function closeCtxMenu(){if(_ctxMenu){_ctxMenu.remove();_ctxMenu=null;}}
document.addEventListener('click',closeCtxMenu);

function showAreaCtxMenu(e, areaId) {
  e.preventDefault(); e.stopPropagation(); closeCtxMenu();
  const area = DB.areas.find(a => a.id === areaId); if (!area) return;
  const menu = document.createElement('div'); menu.className = 'ctx-menu';
  menu.style.cssText = 'left:'+Math.min(e.clientX,window.innerWidth-200)+'px;top:'+Math.min(e.clientY,window.innerHeight-200)+'px';
  const addH = t => { const h=document.createElement('div');h.className='ctx-header';h.textContent=t;menu.appendChild(h); };
  const addI = (label,fn,cls) => { const i=document.createElement('div');i.className='ctx-item'+(cls?' '+cls:'');i.textContent=label;i.onclick=()=>{fn();closeCtxMenu();};menu.appendChild(i); };
  const addD = () => { const d=document.createElement('div');d.className='ctx-divider';menu.appendChild(d); };
  addH(area.title);
  addI('+ Add record', () => promptAddRecord(null, areaId));
  addI('+ Add event', () => promptAddEvent(areaId));
  addD();
  addI('Rename', () => {
    const val = prompt('Rename area:', area.title);
    if (!val || !val.trim()) return;
    api('PUT', `/api/areas/${areaId}`, { title: val.trim() });
    area.title = val.trim();
    renderSidebar();
    if (currentView === 'area' && currentAreaId === areaId) renderAreaView(areaId);
  });
  if (area.parentId) {
    addI('+ Add sub-area', () => promptAddArea(areaId));
  } else {
    addI('+ Add sub-area', () => promptAddArea(areaId));
  }
  addD();
  addI('Delete area', async () => {
    const children = DB.areas.filter(a => a.parentId === areaId && !a.deletedAt);
    const label = area.title;
    const now = new Date().toISOString();
    const childIds = children.map(c => c.id);

    // Optimistic: remove from view immediately
    DB.areas = DB.areas.map(a => (a.id === areaId || childIds.includes(a.id)) ? { ...a, deletedAt: now } : a);
    DB.records = DB.records.map(r => (childIds.includes(r.areaId) || r.areaId === areaId) ? { ...r, deletedAt: now } : r);
    if (currentAreaId === areaId || children.some(c => c.id === currentAreaId)) navigate('dashboard');
    else { renderSidebar(); if (currentView === 'area') renderAreaView(currentAreaId); }

    const restoreFn = async () => {
      DB.areas = DB.areas.map(a => (a.id === areaId || childIds.includes(a.id)) ? { ...a, deletedAt: null } : a);
      DB.records = DB.records.map(r => r.deletedWithArea === areaId ? { ...r, deletedAt: null } : r);
      await api('POST', `/api/areas/${areaId}/restore`);
      renderSidebar();
      navigate('area', areaId);
    };

    deleteToast(label, restoreFn);
    pushUndo(label, restoreFn);
    showTourTip('delete-undo', '#delete-toast', 'Deleted', 'Press <b>Ctrl+Z</b> to restore within 24 hours, or find it in <b>History → Recently Deleted</b>.', 'top');

    api('DELETE', `/api/areas/${areaId}`).catch(() => {
      DB.areas = DB.areas.map(a => (a.id === areaId || childIds.includes(a.id)) ? { ...a, deletedAt: null } : a);
      DB.records = DB.records.map(r => (childIds.includes(r.areaId) || r.areaId === areaId) ? { ...r, deletedAt: null } : r);
      renderSidebar();
    });
  }, 'danger');
  document.body.appendChild(menu); _ctxMenu = menu;
}

function showRecordCtxMenu(e,recordId){
  e.preventDefault();e.stopPropagation();closeCtxMenu();
  const r=DB.records.find(r=>r.id===recordId);if(!r)return;
  const urgency=r.urgency||'none';
  const urgencyOpts=[{val:'none',label:'None'},{val:'new',label:'🔵 New'},{val:'flagged',label:'🟡 Flagged'},{val:'priority',label:'🟣 Priority'},{val:'urgent',label:'🔴 Urgent'}];
  const statusOpts=r.type==='job'?['applied','interviewing','awaiting','offer','rejected','withdrawn','completed','archived']:['active','completed','archived'];
  const menu=document.createElement('div');menu.className='ctx-menu';
  menu.style.cssText='left:'+Math.min(e.clientX,window.innerWidth-200)+'px;top:'+Math.min(e.clientY,window.innerHeight-320)+'px';
  const addH=t=>{const h=document.createElement('div');h.className='ctx-header';h.textContent=t;menu.appendChild(h);};
  const addD=()=>{const d=document.createElement('div');d.className='ctx-divider';menu.appendChild(d);};
  const addI=(label,fn,cls)=>{const i=document.createElement('div');i.className='ctx-item'+(cls?' '+cls:'');i.textContent=label;i.onclick=()=>{fn();closeCtxMenu();};menu.appendChild(i);};
  addH('Urgency');
  urgencyOpts.forEach(u=>addI((urgency===u.val?'✔ ':'')+u.label,()=>setUrgency(recordId,u.val),urgency===u.val?'checked':''));
  addD();addH('Status');
  statusOpts.forEach(s=>addI((r.status===s?'✔ ':'')+s.charAt(0).toUpperCase()+s.slice(1),()=>setRecordStatus(recordId,s),r.status===s?'checked':s==='archived'?'dim':''));
  addD();
  addI('→ Open record',()=>navigate('record',r.areaId,recordId));
  addD();
  addI('Delete record', async () => {
    await deleteRecord(recordId);
  }, 'danger');
  addI('Move to area…', () => {
    const leafAreas = DB.areas.filter(a => !DB.areas.some(b => b.parentId === a.id));
    const opts = leafAreas.map(a => {
      const parent = a.parentId ? DB.areas.find(p => p.id === a.parentId) : null;
      const label = parent ? `${parent.title} › ${a.title}` : a.title;
      return `<option value="${a.id}" ${a.id === r.areaId ? 'selected' : ''}>${label}</option>`;
    }).join('');
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:10000;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = `<div style="background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:24px;width:320px">
      <div style="font-size:14px;font-weight:600;margin-bottom:14px">Move "${r.title}"</div>
      <select id="move-area-select" style="width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:8px;color:var(--text);font-size:13px;margin-bottom:16px">${opts}</select>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button class="btn-s" onclick="this.closest('[style*=fixed]').remove()">Cancel</button>
        <button class="btn-p" onclick="confirmMoveRecord('${recordId}',this)">Move</button>
      </div>
    </div>`;
    document.body.appendChild(modal);
  });
  document.body.appendChild(menu);_ctxMenu=menu;
}

async function confirmMoveRecord(recordId, btn) {
  const modal = btn.closest('[style*=fixed]');
  const newAreaId = document.getElementById('move-area-select').value;
  if (!newAreaId) { modal.remove(); return; }
  btn.disabled = true;
  btn.textContent = 'Moving…';
  await api('PUT', `/api/records/${recordId}`, { areaId: newAreaId });
  modal.remove();
  const r = DB.records.find(r => r.id === recordId);
  if (r) r.areaId = newAreaId;
  if (currentView === 'record') navigate('record', newAreaId, recordId);
  else renderAreaView(currentAreaId);
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function openAdminPanel() {
  const saved = localStorage.getItem('admin_token');
  if (saved) { window.open('/admin?token=' + encodeURIComponent(saved), '_blank'); return; }
  openModal('Admin panel', `
    <div class="modal-field">
      <div class="modal-label">Admin token</div>
      <input class="modal-input" id="admin-token-input" type="password" placeholder="Enter ADMIN_TOKEN">
    </div>
    <div style="font-size:12px;color:var(--muted)">Saved in this browser — you won't be asked again.</div>`,
    [{ label: 'Open', primary: true, onclick: () => {
      const token = document.getElementById('admin-token-input').value.trim();
      if (!token) return;
      localStorage.setItem('admin_token', token);
      window.open('/admin?token=' + encodeURIComponent(token), '_blank');
      closeModal();
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => document.getElementById('admin-token-input')?.focus(), 50);
}

// ── ACCOUNT SETTINGS ─────────────────────────────────────────────────────────
function openAccountSettings() {
  openModal('Account settings', `
    <div class="modal-field">
      <div class="modal-label">Display name</div>
      <input class="modal-input" id="acct-name" value="${currentUser.name || ''}">
    </div>
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid var(--border)">
      <div style="font-size:11px;font-weight:600;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;margin-bottom:12px">Change password</div>
      <div class="modal-field">
        <div class="modal-label">Current password</div>
        <input class="modal-input" id="acct-cur-pw" type="password" autocomplete="current-password">
      </div>
      <div class="modal-field">
        <div class="modal-label">New password</div>
        <input class="modal-input" id="acct-new-pw" type="password" autocomplete="new-password">
      </div>
      <div class="modal-field">
        <div class="modal-label">Confirm new password</div>
        <input class="modal-input" id="acct-confirm-pw" type="password" autocomplete="new-password">
      </div>
    </div>
    <div id="acct-err" style="color:var(--red);font-size:12px;margin-top:8px"></div>`,
    [{ label: 'Save', primary: true, onclick: saveAccountSettings },
     { label: 'Cancel', onclick: closeModal },
     { label: 'Log out', onclick: () => { window.location.href = '/logout'; } }]);
}

async function saveAccountSettings() {
  const name = document.getElementById('acct-name').value.trim();
  const curPw = document.getElementById('acct-cur-pw').value;
  const newPw = document.getElementById('acct-new-pw').value;
  const confirmPw = document.getElementById('acct-confirm-pw').value;
  const errEl = document.getElementById('acct-err');

  if (!name) { errEl.textContent = 'Name cannot be empty'; return; }
  if (newPw && newPw !== confirmPw) { errEl.textContent = 'New passwords do not match'; return; }
  if (newPw && newPw.length < 6) { errEl.textContent = 'New password must be at least 6 characters'; return; }

  const body = { name };
  if (newPw) { body.currentPassword = curPw; body.newPassword = newPw; }

  try {
    await api('PATCH', '/api/me', body);
    currentUser.name = name;
    const nameEl = document.getElementById('sidebar-name');
    if (nameEl) nameEl.textContent = name;
    closeModal();
  } catch (err) {
    errEl.textContent = err.message || 'Save failed';
  }
}

// ── ASSISTANT ────────────────────────────────────────────────────────────────
const assistant = {
  open: false,
  messages: [],       // { role, content } for API
  onboardingStep: 'start',
};

function assistantInit(onboardingStep) {
  assistant.onboardingStep = onboardingStep || 'complete';
  renderAssistantBubble();
  // New users get the guided tour instead of the chat-based onboarding
  const prefs = currentUser.dashboardPrefs || {};
  if (!prefs.tourDismissed && onboardingStep && onboardingStep !== 'complete') {
    setTimeout(() => startTour(), 800);
  }
}

function renderAssistantBubble() {
  // Use the static #sidebar-assistant-btn in index.html — update its label if there's context
  const label = document.getElementById('assistant-static-label');
  if (label && assistant.areaContext) {
    label.textContent = 'Ask about ' + assistant.areaContext;
  }
}

function assistantToggle() {
  assistant.open ? assistantClose() : assistantOpen();
}

function assistantOpen() {
  assistant.open = true;
  let panel = document.getElementById('assistant-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'assistant-panel';
    panel.innerHTML = `
      <div id="assistant-panel-header">
        <span style="font-size:13px">✦</span>
        <span style="font-weight:600;font-size:13px;flex:1">Assistant</span>
        <button onclick="assistantClose()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;line-height:1;padding:0">×</button>
      </div>
      <div id="assistant-messages"></div>
      <div id="assistant-input-row">
        <input id="assistant-input" placeholder="Ask anything..." onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();assistantSend()}">
        <button onclick="assistantSend()" id="assistant-send-btn">↑</button>
      </div>`;
    document.body.appendChild(panel);
  }
  panel.classList.add('open');
  document.getElementById('assistant-input')?.focus();
  if (assistant.messages.length === 0 && assistant.onboardingStep !== 'complete') {
    assistantStartOnboarding();
  }
}

function assistantClose() {
  assistant.open = false;
  document.getElementById('assistant-panel')?.classList.remove('open');
  // If user manually closes during onboarding, mark it complete so it doesn't re-open on refresh
  if (assistant.onboardingStep && assistant.onboardingStep !== 'complete') {
    assistant.onboardingStep = 'complete';
    api('PATCH', '/api/me', { onboardingStep: 'complete' }).catch(() => {});
  }
}

// ── TIPS ─────────────────────────────────────────────────────────────────────

function assistantAppendMessage(role, text) {
  const msgs = document.getElementById('assistant-messages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.className = `assistant-msg assistant-msg-${role}`;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  if (role === 'assistant') {
    assistant.messages.push({ role: 'assistant', content: text });
  }
}

function assistantSetTyping(on) {
  let el = document.getElementById('assistant-typing');
  if (on && !el) {
    const msgs = document.getElementById('assistant-messages');
    el = document.createElement('div');
    el.id = 'assistant-typing';
    el.className = 'assistant-msg assistant-msg-assistant';
    el.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
    msgs?.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  } else if (!on && el) {
    el.remove();
  }
}

async function assistantSend() {
  const input = document.getElementById('assistant-input');
  const text = input?.value?.trim();
  if (!text) return;
  input.value = '';
  assistantAppendMessage('user', text);
  assistant.messages.push({ role: 'user', content: text });

  // Onboarding shortcut: detect "yes/sure/yeah" to template offer
  if (assistant.onboardingStep === 'awaiting-template-offer') {
    const yesWords = ['yes','sure','yeah','ok','okay','show','browse','templates','yep','yup'];
    if (yesWords.some(w => text.toLowerCase().includes(w))) {
      assistant.onboardingStep = 'awaiting-area';
      await api('PATCH', '/api/me', { onboardingStep: 'awaiting-area' });
      openTemplateBrowser();
      return;
    }
  }

  assistantSetTyping(true);
  try {
    const res = await api('POST', '/api/assistant', { messages: assistant.messages.slice(-12) });
    assistantSetTyping(false);
    assistantAppendMessage('assistant', res.reply);
  } catch {
    assistantSetTyping(false);
    assistantAppendMessage('assistant', 'Something went wrong. Try again.');
  }
}

async function assistantStartOnboarding() {
  await new Promise(r => setTimeout(r, 400));
  assistantSetTyping(true);
  await new Promise(r => setTimeout(r, 800));
  assistantSetTyping(false);
  assistantAppendMessage('assistant', `Hey ${currentUser.name}! Welcome to your dashboard. I'll help you get set up — it only takes a minute.`);
  await new Promise(r => setTimeout(r, 600));
  assistantSetTyping(true);
  await new Promise(r => setTimeout(r, 1000));
  assistantSetTyping(false);
  assistantAppendMessage('assistant', `First, let's add a life area. Click "+ Add area" in the sidebar, or I can show you some templates to pick from. Want to browse templates?`);
  assistant.onboardingStep = 'awaiting-template-offer';
  await api('PATCH', '/api/me', { onboardingStep: 'awaiting-template-offer' });
}

function assistantNotify(event, data) {
  // Tour takes over onboarding — route events to tour, skip chat onboarding
  if (tour.active) { tourNotify(event, data); return; }
  if (assistant.onboardingStep === 'complete') return;
  if (event === 'area-created' && assistant.onboardingStep.startsWith('awaiting-template') || assistant.onboardingStep === 'awaiting-area') {
    assistant.onboardingStep = 'awaiting-record';
    api('PATCH', '/api/me', { onboardingStep: 'awaiting-record' });
    if (!assistant.open) assistantOpen();
    setTimeout(async () => {
      assistantSetTyping(true);
      await new Promise(r => setTimeout(r, 900));
      assistantSetTyping(false);
      assistantAppendMessage('assistant', `Nice — ${data?.title || 'your area'} is in the sidebar. Now create your first record inside it. Click the area, then hit "+ New record".`);
    }, 300);
  } else if (event === 'record-created' && assistant.onboardingStep === 'awaiting-record') {
    assistant.onboardingStep = 'awaiting-dashboard';
    api('PATCH', '/api/me', { onboardingStep: 'awaiting-dashboard' });
    setTimeout(async () => {
      assistantSetTyping(true);
      await new Promise(r => setTimeout(r, 900));
      assistantSetTyping(false);
      assistantAppendMessage('assistant', `That's it — that's how the whole app works. Now click Dashboard in the top left to see everything at a glance.`);
    }, 300);
  } else if (event === 'navigate-dashboard' && assistant.onboardingStep === 'awaiting-dashboard') {
    assistant.onboardingStep = 'complete';
    api('PATCH', '/api/me', { onboardingStep: 'complete' });
    setTimeout(async () => {
      assistantSetTyping(true);
      await new Promise(r => setTimeout(r, 1000));
      assistantSetTyping(false);
      assistantAppendMessage('assistant', `There it is — your home base. A few things worth knowing: use your browser's back and forward buttons to navigate, Ctrl+Z restores anything you delete within 24 hours, and I'll be down here if you need anything.`);
      await new Promise(r => setTimeout(r, 2000));
      assistantClose();
    }, 500);
  }
}

// Template browser
async function renderTemplatesView() {
  const templates = await api('GET', '/api/templates');
  const system = templates.filter(t => t.source === 'system');
  const personal = templates.filter(t => t.source === 'personal');

  const installedTemplates = currentUser.dashboardPrefs?.installedTemplates || {};

  function tileHTML(t) {
    const installedVersion = installedTemplates[t.id];
    const hasUpdate = installedVersion !== undefined && t.version !== undefined && t.version > installedVersion;
    const updateBadge = hasUpdate
      ? `<span style="position:absolute;top:8px;right:8px;background:var(--amber);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;letter-spacing:.03em">Updated</span>`
      : '';
    const actions = t.source === 'personal' ? `
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-sm" style="font-size:11px;color:var(--red)" onclick="event.stopPropagation();deleteUserTemplate('${t.id}')">Delete</button>
        <button class="btn btn-sm" style="font-size:11px" onclick="event.stopPropagation();submitUserTemplate('${t.id}')">Submit to library</button>
      </div>` : '';
    return `<div class="template-tile" style="position:relative" onclick="installTemplate('${t.id}',this)">
      ${updateBadge}
      <div style="font-size:28px;margin-bottom:8px">${t.icon || '📁'}</div>
      <div style="font-weight:600;font-size:14px;margin-bottom:4px">${t.name}</div>
      <div style="font-size:12px;color:var(--muted);flex:1">${t.description || ''}</div>
      ${actions}
    </div>`;
  }

  const sysGrid = document.getElementById('templates-system-grid');
  const persGrid = document.getElementById('templates-personal-grid');
  const persSec = document.getElementById('templates-personal-section');
  if (sysGrid) sysGrid.innerHTML = system.length ? system.map(tileHTML).join('') : '<div class="empty">No system templates yet.</div>';
  if (persGrid) persGrid.innerHTML = personal.length ? personal.map(tileHTML).join('') : '<div class="empty" style="font-size:12px;color:var(--muted)">No personal templates saved yet.</div>';
  if (persSec) persSec.style.display = personal.length ? '' : 'none';
}

async function openTemplateBrowser(targetCb) {
  if (!targetCb) { navigate('templates'); return; }
  window._templateInstallCb = targetCb || null;
  const templates = await api('GET', '/api/templates');
  const system = templates.filter(t => t.source === 'system');
  const personal = templates.filter(t => t.source === 'personal');

  function tplCard(t) {
    const byline = t.source === 'system'
      ? `<div style="font-size:10px;color:var(--dim);margin-top:2px">System template</div>`
      : `<div style="font-size:10px;color:var(--dim);margin-top:2px;display:flex;gap:6px">
           <span style="cursor:pointer;color:var(--red)" onclick="deleteUserTemplate('${t.id}')">Delete</span>
           <span style="cursor:pointer;color:var(--accent)" onclick="submitUserTemplate('${t.id}')">Submit to library</span>
         </div>`;
    return `<div class="record-card" style="cursor:pointer;flex-direction:column;align-items:flex-start;gap:2px" onclick="installTemplate('${t.id}',this)">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">${t.icon || '📁'}</span>
        <span style="font-weight:600;font-size:13px">${t.name}</span>
      </div>
      <div style="font-size:11px;color:var(--muted)">${t.description || ''}</div>
      ${byline}
    </div>`;
  }

  const systemSection = system.length ? `
    <div style="font-size:10px;font-weight:600;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">System templates</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">${system.map(tplCard).join('')}</div>` : '';

  const personalSection = personal.length ? `
    <div style="font-size:10px;font-weight:600;color:var(--dim);letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px">My templates</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">${personal.map(tplCard).join('')}</div>` : '';

  openModal('Choose a template', `
    <div style="max-height:420px;overflow-y:auto;padding:2px">
      ${systemSection}${personalSection}
      ${!system.length && !personal.length ? '<div class="empty">No templates yet.</div>' : ''}
    </div>`,
    [{ label: 'Cancel', onclick: closeModal }]);
}

async function installTemplate(templateId, triggerEl) {
  // Prevent double-click and show immediate feedback
  const tile = triggerEl?.closest?.('.template-tile') || document.querySelector(`.template-tile[onclick*="${templateId}"]`);
  if (tile) {
    if (tile.dataset.installing) return;
    tile.dataset.installing = '1';
    tile.style.opacity = '0.5';
    tile.style.pointerEvents = 'none';
    const spinner = document.createElement('div');
    spinner.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.3);border-radius:10px;font-size:20px';
    spinner.textContent = '⏳';
    tile.style.position = 'relative';
    tile.appendChild(spinner);
  }
  try {
    const templates = await api('GET', '/api/templates');
    const tpl = templates.find(t => t.id === templateId);
    if (!tpl) return;
    const area = await api('POST', '/api/areas', {
      title: tpl.name, color: tpl.color, icon: tpl.icon,
      order: DB.areas.length, parentId: null,
    });
    DB.areas.push(area);
    rebuildLookupCaches();
    renderSidebar();
    assistantNotify('area-created', area);
    if (window._templateInstallCb) { window._templateInstallCb(area); window._templateInstallCb = null; }
    // Record installed version in prefs so we can show update badges later
    if (tpl.source === 'system' && tpl.version !== undefined) {
      const prefs = currentUser.dashboardPrefs || {};
      prefs.installedTemplates = { ...(prefs.installedTemplates || {}), [tpl.id]: tpl.version };
      currentUser.dashboardPrefs = prefs;
      api('PATCH', '/api/me', { dashboardPrefs: prefs }).catch(() => {});
    }
    navigate('area', area.id);
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text);z-index:9999;display:flex;align-items:center;gap:10px;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    t.innerHTML = `<span style="color:var(--green)">✓</span><span><b>${tpl.name}</b> added to your areas</span>`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
  } catch (err) {
    if (tile) { tile.style.opacity = ''; tile.style.pointerEvents = ''; delete tile.dataset.installing; tile.querySelector('[style*="inset"]')?.remove(); }
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 18px;font-size:13px;color:var(--text);z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,.3)';
    t.innerHTML = `<span style="color:var(--red)">✗</span> Failed to install template`;
    document.body.appendChild(t); setTimeout(() => t.remove(), 4000);
  }
}

function promptSaveAsTemplate(area) {
  openModal('Save as template', `
    <div class="modal-field"><div class="modal-label">Template name</div>
      <input class="modal-input" id="save-tpl-name" value="${area?.title || ''}" autofocus>
    </div>
    <div class="modal-field"><div class="modal-label">Description</div>
      <input class="modal-input" id="save-tpl-desc" placeholder="What is this area for?">
    </div>`,
    [{ label: 'Save template', primary: true, onclick: async () => {
      const name = document.getElementById('save-tpl-name').value.trim();
      const description = document.getElementById('save-tpl-desc').value.trim();
      if (!name) return;
      const recordTypes = [...new Set(DB.records.filter(r => r.areaId === area?.id && !r.deletedAt).map(r => r.type))];
      await api('POST', '/api/user-templates', { name, description, color: area?.color, icon: area?.icon, recordTypes });
      closeModal();
    }},
    { label: 'Cancel', onclick: closeModal }]);
  setTimeout(() => document.getElementById('save-tpl-name')?.focus(), 50);
}

async function deleteUserTemplate(id) {
  if (!confirm('Delete this template?')) return;
  await api('DELETE', `/api/user-templates/${id}`);
  openTemplateBrowser();
}

async function submitUserTemplate(id) {
  await api('POST', `/api/user-templates/${id}/submit`);
  closeModal();
  openModal('Submitted', '<p style="color:var(--muted);font-size:13px">Your template has been submitted for review.</p>',
    [{ label: 'OK', onclick: closeModal }]);
}

boot();
