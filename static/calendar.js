// â”€â”€ AREA CALENDAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Area cals have their own independent mode/offset state
const areaCals = {};
function getAreaCal(areaId) {
  if (!areaCals[areaId]) areaCals[areaId] = { mode: 'day', offset: 0 };
  return areaCals[areaId];
}

function renderAreaCalWidget(containerId, areaId) {
  // Use global calMode/calOffset temporarily with area-filtered events
  const state = getAreaCal(areaId);
  const savedMode = calMode, savedOffset = calOffset;
  calMode = state.mode; calOffset = state.offset;

  // Temporarily filter DB events to this area
  const allRecords = DB.records;
  const areaEvents = DB.records.filter(r => r.areaId !== areaId || r.type !== 'event');
  // Patch: override event filter inside renderCalWidget by passing areaId context
  window._areaCalFilter = areaId;
  renderCalWidget(containerId, false, areaId);
  window._areaCalFilter = null;
  // Update label above calendar
  const _areaLbl = document.getElementById('area-cal-label');
  if (_areaLbl) {
    const _t = new Date(); const _s = state;
    if (_s.mode==='day'){const _d=new Date(_t);_d.setDate(_t.getDate()+_s.offset);_areaLbl.textContent=_d.toLocaleDateString('en-US',{weekday:'long'});}
    else if (_s.mode==='week'){const _dow=_t.getDay();const _mon=new Date(_t);_mon.setDate(_t.getDate()-(_dow===0?6:_dow-1)+_s.offset*7);const _sun=new Date(_mon);_sun.setDate(_mon.getDate()+6);_areaLbl.textContent=_mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+_sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
    else{const _d=new Date(_t.getFullYear(),_t.getMonth()+_s.offset,1);_areaLbl.textContent=_d.toLocaleDateString('en-US',{month:'long',year:'numeric'});}
  }

  // Save state back
  state.mode = calMode; state.offset = calOffset;
  calMode = savedMode; calOffset = savedOffset;
}

function setAreaCalMode(mode, cid, areaId) {
  const s = getAreaCal(areaId); s.mode = mode; s.offset = 0;
  renderAreaCalWidget(cid, areaId);
}
function areaCalNav(dir, cid, areaId) {
  const s = getAreaCal(areaId); s.offset = dir===0?0:s.offset+dir;
  renderAreaCalWidget(cid, areaId);
}
function areaCalDayClick(ds, cid, areaId) {
  const s=getAreaCal(areaId); const t=new Date(); t.setHours(0,0,0,0);
  const target=new Date(ds+'T00:00:00'); s.mode='day'; s.offset=Math.round((target-t)/86400000);
  renderAreaCalWidget(cid,areaId);
}
function areaCalDayClickSimple(ds, cid, areaId) { areaCalDayClick(ds, cid, areaId); }
function openQAddInArea(date, areaId) {
  openQAdd(date, '');
  setTimeout(()=>{ const sel=document.getElementById('qadd-area'); if(sel)sel.value=areaId; }, 30);
}
function openAreaCalInlineEdit(cid, areaId) {
  const s = getAreaCal(areaId);
  const savedMode=calMode, savedOffset=calOffset;
  calMode=s.mode; calOffset=s.offset;
  const span = document.getElementById('acal-title-'+cid);
  if (span) openCalInlineEdit(cid, false);
  calMode=savedMode; calOffset=savedOffset;
}

// â”€â”€ CALENDAR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let qAddDate = '', qAddHour = '';

function calLabel() {
  const t = new Date();
  if (calMode === 'day') { const d = new Date(t); d.setDate(t.getDate()+calOffset); return d.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}); }
  if (calMode === 'week') {
    const dow = t.getDay(); const mon = new Date(t); mon.setDate(t.getDate()-(dow===0?6:dow-1)+calOffset*7);
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    return mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }
  const d = new Date(t.getFullYear(), t.getMonth()+calOffset, 1);
  return d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
}

function calDayOfWeek() {
  const t = new Date();
  if (calMode === 'day') { const d = new Date(t); d.setDate(t.getDate()+calOffset); return d.toLocaleDateString('en-US',{weekday:'short',month:'long',day:'numeric',year:'numeric'}); }
  if (calMode === 'week') { return 'This week'; }
  return '';
}

function evClass(e) {
  if (e.status === 'archived') return 'ev-archived';
  if (e.status === 'completed') {
    const today = new Date().toISOString().split('T')[0];
    return (!e.fields?.date || e.fields.date < today) ? 'ev-completed-past' : 'ev-completed';
  }
  const cat = e.fields?.category || 'other';
  return cat === 'interview' ? 'ev-interview' : cat === 'job' ? 'ev-job' : cat === 'health' ? 'ev-health' : 'ev-other';
}

function parseTimeToMinutes(t) {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(totalMinutes) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function roundToQuarterHour(t) {
  const mins = parseTimeToMinutes(t);
  if (mins === null) return '';
  return minutesToTime(Math.round(mins / 15) * 15);
}

function to24Hour(hour, minute, ampm) {
  let h = parseInt(hour) || 0;
  const m = parseInt(minute) || 0;
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function to12Hour(time24) {
  const mins = parseTimeToMinutes(time24);
  if (mins === null) return { hour: '12', minute: '00', ampm: 'AM' };
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  let h12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return { hour: String(h12), minute: String(m).padStart(2, '0'), ampm };
}

function timePickerHTML(idPrefix, time24Val = '') {
  const {hour, minute, ampm} = to12Hour(time24Val);
  return `
    <div style="display:flex;gap:8px;align-items:center">
      <input type="number" id="${idPrefix}-h" class="modal-input" value="${hour}" min="1" max="12" style="width:60px;padding:6px 8px">
      <span style="color:var(--text)">:</span>
      <select id="${idPrefix}-m" class="modal-select" style="width:80px;padding:6px 8px">
        <option value="0">00</option>
        <option value="15">15</option>
        <option value="30">30</option>
        <option value="45">45</option>
      </select>
      <select id="${idPrefix}-ap" class="modal-select" style="width:70px;padding:6px 8px">
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>`;
}

function eventStartMins(e) {
  return parseTimeToMinutes(e.fields?.time || '');
}

function eventEndMins(e) {
  const start = eventStartMins(e);
  if (start === null) return null;
  const endRaw = parseTimeToMinutes(e.fields?.endTime || '');
  if (endRaw !== null && endRaw > start) return endRaw;
  return start + 60;
}

function eventRenderStyle(e, hour, rowPx) {
  const start = eventStartMins(e);
  if (start === null) return 'top:2px;height:12px;';
  const end = eventEndMins(e);
  const hourStart = hour * 60;
  const offsetMins = Math.max(0, start - hourStart);
  const durationMins = Math.max(15, (end || (start + 60)) - start);
  const topPx = 2 + (offsetMins / 60) * rowPx;
  const hPx = Math.max(12, (durationMins / 60) * rowPx - 2);
  return `top:${topPx.toFixed(1)}px;height:${hPx.toFixed(1)}px;`;
}

function defaultEndTimeFromStart(startTime, defaultMinutes = 60) {
  const start = parseTimeToMinutes(startTime);
  if (start === null) return '';
  return minutesToTime(start + defaultMinutes);
}

function ensureQuarterHourTimeInputs(root) {
  (root || document).querySelectorAll('input[type="time"]').forEach(inp => {
    inp.step = '900';
    // Enforce strict minute validation: only 0, 15, 30, 45 allowed
    const snapToQuarter = () => {
      if (!inp.value) return;
      const mins = parseTimeToMinutes(inp.value);
      if (mins === null) return;
      const minuteVal = mins % 60;
      // Only allow 0, 15, 30, 45
      if (![0, 15, 30, 45].includes(minuteVal)) {
        const snapped = roundToQuarterHour(inp.value);
        if (snapped) inp.value = snapped;
      }
    };
    snapToQuarter();
    if (inp.dataset.quarterBound === '1') return;
    inp.dataset.quarterBound = '1';
    inp.addEventListener('input', snapToQuarter);
    inp.addEventListener('change', snapToQuarter);
    inp.addEventListener('blur', snapToQuarter);
  });
}

function buildCalBody(mini) {
  const today = new Date(); const todayStr = today.toISOString().split('T')[0];
  const events = DB.records.filter(r => r.type === 'event' && r.fields?.date);

  if (calMode === 'month') {
    const base = new Date(today.getFullYear(), today.getMonth()+calOffset, 1);
    const firstDow = base.getDay(); const dim = new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
    const startOff = firstDow===0?6:firstDow-1;
    const prev = new Date(base.getFullYear(),base.getMonth(),0).getDate();
    let g = '<div class="cal-month-wrap"><div class="cal-month-grid">';
    ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d => { g += `<div class="cal-month-dow">${d}</div>`; });
    for (let i=0;i<startOff;i++) g += `<div class="cal-month-day other-month"><div class="cal-month-num">${prev-startOff+1+i}</div></div>`;
    for (let day=1;day<=dim;day++) {
      const ds = `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday = ds===todayStr;
      const dayEvs = events.filter(e=>e.fields.date===ds);
      const maxShow = mini?1:3;
      g += `<div class="cal-month-day ${isToday?'today':''}" onclick="if(event.target.closest('[data-record-link]')) return; openDayView('${ds}',event.currentTarget.closest('[id]')?.id,${mini})">
        <div class="cal-month-num">${day}</div>
        ${dayEvs.slice(0,maxShow).map(e=>`<div class="cal-ev ${evClass(e)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.title}</div>`).join('')}
        ${dayEvs.length>maxShow?`<div style="font-size:9px;color:var(--dim)">+${dayEvs.length-maxShow} more</div>`:''}
      </div>`;
    }
    const rem = (7-(startOff+dim)%7)%7;
    for (let i=1;i<=rem;i++) g += `<div class="cal-month-day other-month"><div class="cal-month-num">${i}</div></div>`;
    return g+'</div></div>';
  }

  if (calMode === 'week') {
    const dow = today.getDay(); const mon = new Date(today); mon.setDate(today.getDate()-(dow===0?6:dow-1)+calOffset*7);
    const dayNames = ['Mo','Tu','We','Th','Fr','Sa','Su'];
    let g = '<div class="cal-week-wrap"><div class="cal-week-dow-row"><div></div>';
    for (let i=0;i<7;i++) {
      const d = new Date(mon); d.setDate(mon.getDate()+i);
      const ds = d.toISOString().split('T')[0]; const isToday = ds===todayStr;
      g += `<div style="text-align:center;padding-bottom:4px"><div class="cal-week-dow">${dayNames[i]}</div><div class="cal-week-num ${isToday?'today-num':''}">${d.getDate()}</div></div>`;
    }
    g += '</div><div class="cal-week-body">';
    const hours = Array.from({length:18},(_,i)=>i+6);
    hours.forEach(h => {
      const label = h===0?'12a':h<12?`${h}a`:h===12?'12p':`${h-12}p`;
      g += `<div class="cal-week-hour-label">${label}</div>`;
      for (let i=0;i<7;i++) {
        const d = new Date(mon); d.setDate(mon.getDate()+i);
        const ds = d.toISOString().split('T')[0];
        const hEvs = events.filter(e=>e.fields.date===ds&&e.fields.time&&Math.floor((eventStartMins(e) ?? -1)/60)===h);
        g += `<div class="cal-week-cell" onclick="if(event.target.closest('[data-record-link]')) return; openQAdd('${ds}','${String(h).padStart(2,'0')}:00')">
          ${hEvs.map(e=>`<div class="cal-week-event ${evClass(e)}" style="${eventRenderStyle(e,h,40)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.fields.time?.slice(0,5)||''}${e.fields.endTime ? 'â€“' + e.fields.endTime.slice(0,5) : ''} ${e.title}</div>`).join('')}
        </div>`;
      }
    });
    return g+'</div></div>';
  }

  if (calMode === 'day') {
    const d = new Date(today); d.setDate(today.getDate()+calOffset);
    const ds = d.toISOString().split('T')[0];
    const hours = Array.from({length:18},(_,i)=>i+6);
    let g = '<div class="cal-day-wrap">';
    hours.forEach(h => {
      const label = h<12?`${h}am`:h===12?'12pm':`${h-12}pm`;
      const hEvs = events.filter(e=>e.fields.date===ds&&e.fields.time&&Math.floor((eventStartMins(e) ?? -1)/60)===h);
      g += `<div class="cal-day-row">
        <div class="cal-day-label">${label}</div>
        <div class="cal-day-slot" onclick="if(event.target.closest('[data-record-link]')) return; openQAdd('${ds}','${String(h).padStart(2,'0')}:00')">
          ${hEvs.map(e=>`<div class="cal-day-event ${evClass(e)}" style="${eventRenderStyle(e,h,44)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.fields.time?.slice(0,5)||''}${e.fields.endTime ? 'â€“' + e.fields.endTime.slice(0,5) : ''} ${e.title}</div>`).join('')}
        </div>
      </div>`;
    });
    return g+'</div>';
  }
  return '';
}

function renderCalWidget(containerId, mini, areaFilter) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const _af = areaFilter || window._areaCalFilter || null;
  el.innerHTML = `<div class="cal-widget">
    <div class="cal-header">
      <div class="cal-nav-group">
        <button class="cal-arrow" onclick="${_af ? `areaCalNav(-1,'${containerId}','${_af}')` : `calNav(-1,'${containerId}',${mini})`}">&#x2039;</button>
        <span class="cal-title-span" id="cal-title-label-${containerId}" onclick="${_af ? `openAreaCalInlineEdit('${containerId}','${_af}')` : `openCalInlineEdit('${containerId}',${mini})`}" title="Click to edit date">${calLabel()}</span>
        <button class="cal-arrow" onclick="${_af ? `areaCalNav(1,'${containerId}','${_af}')` : `calNav(1,'${containerId}',${mini})`}">&#x203A;</button>
      </div>
      <button class="cal-today-btn" onclick="${_af ? `areaCalNav(0,'${containerId}','${_af}')` : `calNav(0,'${containerId}',${mini})`}">Today</button>
      <div class="cal-mode-pill">
        <div class="cal-mode-btn ${calMode==='day'?'active':''}" onclick="${_af ? `setAreaCalMode('day','${containerId}','${_af}')` : `setCalMode('day','${containerId}',${mini})`}">Day</div>
        <div class="cal-mode-btn ${calMode==='week'?'active':''}" onclick="${_af ? `setAreaCalMode('week','${containerId}','${_af}')` : `setCalMode('week','${containerId}',${mini})`}">Week</div>
        <div class="cal-mode-btn ${calMode==='month'?'active':''}" onclick="${_af ? `setAreaCalMode('month','${containerId}','${_af}')` : `setCalMode('month','${containerId}',${mini})`}">Month</div>
      </div>
    </div>
    <div class="cal-body">${buildCalBody(mini)}</div>
  </div>`;
}

function renderCalFull() {
  const today = new Date();
  // Day panel
  const dayLabel = document.getElementById('cal-day-label');
  if (dayLabel) dayLabel.textContent = 'Today â€” ' + today.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  renderTriCalPanel('cal-day-panel', 'day');
  // Week panel
  const weekLabel = document.getElementById('cal-week-label');
  if (weekLabel) {
    const dow = today.getDay(); const mon = new Date(today); mon.setDate(today.getDate()-(dow===0?6:dow-1));
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    weekLabel.textContent = 'This week â€” ' + mon.toLocaleDateString('en-US',{month:'short',day:'numeric'}) + ' â€“ ' + sun.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }
  renderTriCalPanel('cal-week-panel', 'week');
  // Month panel
  const monthLabel = document.getElementById('cal-month-label');
  if (monthLabel) monthLabel.textContent = today.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  renderTriCalPanel('cal-month-panel', 'month');
}

// Independent state for each tri-cal panel
const triCals = { 'cal-day-panel': { mode:'day', offset:0 }, 'cal-week-panel': { mode:'week', offset:0 }, 'cal-month-panel': { mode:'month', offset:0 } };

function renderTriCalPanel(containerId, mode) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const state = triCals[containerId] || { mode, offset: 0 };
  state.mode = mode; // lock mode per panel
  triCals[containerId] = state;
  const today = new Date(); const todayStr = today.toISOString().split('T')[0];
  const events = DB.records.filter(r => r.type === 'event' && r.fields?.date);

  function panelLabel() {
    const t = new Date();
    if (mode==='day'){const d=new Date(t);d.setDate(t.getDate()+state.offset);return d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric',year:'numeric'});}
    if (mode==='week'){const dow=t.getDay();const mon=new Date(t);mon.setDate(t.getDate()-(dow===0?6:dow-1)+state.offset*7);const sun=new Date(mon);sun.setDate(mon.getDate()+6);return mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
    const d=new Date(t.getFullYear(),t.getMonth()+state.offset,1);return d.toLocaleDateString('en-US',{month:'long',year:'numeric'});
  }

  function buildBody() {
    if (mode==='day') {
      const d=new Date(today);d.setDate(today.getDate()+state.offset);
      const ds=d.toISOString().split('T')[0];
      const hours=Array.from({length:18},(_,i)=>i+6);
      let g='<div class="cal-day-wrap">';
      hours.forEach(h=>{
        const label=h<12?`${h}am`:h===12?'12pm':`${h-12}pm`;
        const hEvs=events.filter(e=>e.fields.date===ds&&e.fields.time&&Math.floor((eventStartMins(e) ?? -1)/60)===h);
        g+=`<div class="cal-day-row"><div class="cal-day-label">${label}</div>
          <div class="cal-day-slot" onclick="if(event.target.closest('[data-record-link]')) return; openQAdd('${ds}','${String(h).padStart(2,'0')}:00')">
            ${hEvs.map(e=>`<div class="cal-day-event ${evClass(e)}" style="${eventRenderStyle(e,h,44)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.fields.time?.slice(0,5)||''}${e.fields.endTime ? 'â€“' + e.fields.endTime.slice(0,5) : ''} ${e.title}</div>`).join('')}
          </div></div>`;
      });
      return g+'</div>';
    }
    if (mode==='week') {
      const dow=today.getDay();const mon=new Date(today);mon.setDate(today.getDate()-(dow===0?6:dow-1)+state.offset*7);
      const dayNames=['Mo','Tu','We','Th','Fr','Sa','Su'];
      let g='<div class="cal-week-wrap"><div class="cal-week-dow-row"><div></div>';
      for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const ds=d.toISOString().split('T')[0];const isToday=ds===todayStr;g+=`<div style="text-align:center;padding-bottom:4px"><div class="cal-week-dow">${dayNames[i]}</div><div class="cal-week-num ${isToday?'today-num':''}">${d.getDate()}</div></div>`;}
      g+='</div><div class="cal-week-body">';
      Array.from({length:18},(_,i)=>i+6).forEach(h=>{
        const label=h<12?`${h}a`:h===12?'12p':`${h-12}p`;
        g+=`<div class="cal-week-hour-label">${label}</div>`;
        for(let i=0;i<7;i++){const d=new Date(mon);d.setDate(mon.getDate()+i);const ds=d.toISOString().split('T')[0];const hEvs=events.filter(e=>e.fields.date===ds&&e.fields.time&&Math.floor((eventStartMins(e) ?? -1)/60)===h);g+=`<div class="cal-week-cell" onclick="if(event.target.closest('[data-record-link]')) return; openQAdd('${ds}','${String(h).padStart(2,'0')}:00')">${hEvs.map(e=>`<div class="cal-week-event ${evClass(e)}" style="${eventRenderStyle(e,h,40)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.fields.time?.slice(0,5)||''}${e.fields.endTime ? 'â€“' + e.fields.endTime.slice(0,5) : ''} ${e.title}</div>`).join('')}</div>`;}
      });
      return g+'</div></div>';
    }
    // month
    const base=new Date(today.getFullYear(),today.getMonth()+state.offset,1);
    const firstDow=base.getDay();const dim=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();
    const startOff=firstDow===0?6:firstDow-1;const prev=new Date(base.getFullYear(),base.getMonth(),0).getDate();
    let g='<div class="cal-month-wrap"><div class="cal-month-grid">';
    ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(d=>{g+=`<div class="cal-month-dow">${d}</div>`;});
    for(let i=0;i<startOff;i++) g+=`<div class="cal-month-day other-month"><div class="cal-month-num">${prev-startOff+1+i}</div></div>`;
    for(let day=1;day<=dim;day++){
      const ds=`${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const isToday=ds===todayStr;const dayEvs=events.filter(e=>e.fields.date===ds);
      g+=`<div class="cal-month-day ${isToday?'today':''}" onclick="if(event.target.closest('[data-record-link]')) return; triCalDayClick('${ds}','cal-day-panel')">
        <div class="cal-month-num">${day}</div>
        ${dayEvs.slice(0,2).map(e=>`<div class="cal-ev ${evClass(e)}" data-record-link data-area-id="${e.areaId}" data-record-id="${e.id}">${e.title}</div>`).join('')}
        ${dayEvs.length>2?`<div style="font-size:9px;color:var(--dim)">+${dayEvs.length-2} more</div>`:''}
      </div>`;
    }
    const rem=(7-(startOff+dim)%7)%7;
    for(let i=1;i<=rem;i++) g+=`<div class="cal-month-day other-month"><div class="cal-month-num">${i}</div></div>`;
    return g+'</div></div>';
  }

  el.innerHTML=`<div class="cal-widget">
    <div class="cal-header">
      <div class="cal-nav-group">
        <button class="cal-arrow" onclick="triCalNav(-1,'${containerId}','${mode}')">&#x2039;</button>
        <span class="cal-title-span" style="font-size:12px">${panelLabel()}</span>
        <button class="cal-arrow" onclick="triCalNav(1,'${containerId}','${mode}')">&#x203A;</button>
      </div>
      <button class="cal-today-btn" onclick="triCalNav(0,'${containerId}','${mode}')">Today</button>
    </div>
    <div class="cal-body">${buildBody()}</div>
  </div>`;
}

function triCalNav(dir, cid, mode) {
  const s=triCals[cid];if(!s)return;
  s.offset=dir===0?0:s.offset+dir;
  renderTriCalPanel(cid,mode);
  // Update label
  const labelId=cid.replace('-panel','-label');
  const labelEl=document.getElementById(labelId);
  if(labelEl){
    const today=new Date();
    if(mode==='day'){const d=new Date(today);d.setDate(today.getDate()+s.offset);labelEl.textContent='Today â€” '+d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});}
    else if(mode==='week'){const dow=today.getDay();const mon=new Date(today);mon.setDate(today.getDate()-(dow===0?6:dow-1)+s.offset*7);const sun=new Date(mon);sun.setDate(mon.getDate()+6);labelEl.textContent=mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+sun.toLocaleDateString('en-US',{month:'short',day:'numeric'});}
    else{const d=new Date(today.getFullYear(),today.getMonth()+s.offset,1);labelEl.textContent=d.toLocaleDateString('en-US',{month:'long',year:'numeric'});}
  }
}

function triCalDayClick(ds, dayPanelId) {
  // Clicking a month day navigates the day panel to that date
  const today=new Date();today.setHours(0,0,0,0);
  const target=new Date(ds+'T00:00:00');
  const s=triCals[dayPanelId]||{mode:'day',offset:0};
  s.offset=Math.round((target-today)/86400000);
  triCals[dayPanelId]=s;
  renderTriCalPanel(dayPanelId,'day');
  // Scroll day panel into view
  document.getElementById(dayPanelId)?.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function calNav(dir, cid, mini) {
  calOffset = dir===0?0:calOffset+dir;
  renderCalWidget(cid,mini);
  // Update dash section label if present
  const _lbl = document.getElementById('dash-cal-label');
  if (_lbl) {
    const _t=new Date();
    if(calMode==='day'){const _d=new Date(_t);_d.setDate(_t.getDate()+calOffset);_lbl.textContent=_d.toLocaleDateString('en-US',{weekday:'long'});}
    else if(calMode==='week'){const _dow=_t.getDay();const _mon=new Date(_t);_mon.setDate(_t.getDate()-(_dow===0?6:_dow-1)+calOffset*7);const _sun=new Date(_mon);_sun.setDate(_mon.getDate()+6);_lbl.textContent=_mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+_sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}
    else{const _d=new Date(_t.getFullYear(),_t.getMonth()+calOffset,1);_lbl.textContent=_d.toLocaleDateString('en-US',{month:'long',year:'numeric'});}
  }
}
function setCalMode(mode, cid, mini) {
  const prev = calMode;
  calMode=mode; calOffset=0; renderCalWidget(cid,mini);
  const _lbl = document.getElementById('dash-cal-label');
  if (_lbl) { const _t=new Date(); if(calMode==='day'){const _d=new Date(_t);_d.setDate(_t.getDate()+calOffset);_lbl.textContent=_d.toLocaleDateString('en-US',{weekday:'long'});}else if(calMode==='week'){const _dow=_t.getDay();const _mon=new Date(_t);_mon.setDate(_t.getDate()-(_dow===0?6:_dow-1)+calOffset*7);const _sun=new Date(_mon);_sun.setDate(_mon.getDate()+6);_lbl.textContent=_mon.toLocaleDateString('en-US',{month:'short',day:'numeric'})+' â€“ '+_sun.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});}else{const _d=new Date(_t.getFullYear(),_t.getMonth()+calOffset,1);_lbl.textContent=_d.toLocaleDateString('en-US',{month:'long',year:'numeric'});} }
  if (prev !== mode) history.pushState({view:currentView,areaId:currentAreaId,recordId:currentRecordId,calMode:mode,calCid:cid,calMini:mini},'','#'+currentView+(currentAreaId?'/'+currentAreaId:''));
}

function openDayView(ds, cid, mini) {
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(ds+'T00:00:00');
  calMode='day'; calOffset=Math.round((target-today)/86400000);
  renderCalWidget(cid||'full-cal', mini||false);
}

// Quick-add popup
function openQAdd(date, hour) {
  qAddDate=date; qAddHour=hour;
  const d = new Date(date+'T12:00:00');
  const label = d.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})+(hour?' Â· '+fmtTime(hour):'');
  let box = document.getElementById('qadd-box');
  if (!box) {
    const ov = document.createElement('div'); ov.className='qadd-overlay'; ov.id='qadd-overlay';
    const areaOptions = DB.areas.map(a=>`<option value="${a.id}">${a.title}</option>`).join('');
    ov.innerHTML=`<div class="qadd-box" id="qadd-box">
      <button class="qadd-close" onclick="closeQAdd()">&#x00D7;</button>
      <div class="qadd-label" id="qadd-label" style="cursor:pointer" onclick="openQAddDateEdit()" title="Click to change date"></div>
      <div style="display:flex;flex-direction:column;gap:8px">
        <input class="modal-input" id="qadd-title" placeholder="Event title" style="padding:6px 10px">
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <div style="flex:1;min-width:120px">${timePickerHTML('qadd-time')}</div>
          <div style="flex:1;min-width:120px">${timePickerHTML('qadd-endtime')}</div>
        </div>
        <input class="modal-input" id="qadd-location" placeholder="Location or link (optional)" style="padding:6px 10px">
        <select class="modal-select" id="qadd-area" style="padding:6px 10px">${areaOptions}</select>
        <button class="btn btn-p" style="width:100%" onclick="confirmQAdd()">Add event</button>
      </div>
    </div>`;
    ov.addEventListener('mousedown', e=>{ if(e.target===ov) closeQAdd(); });
    document.body.appendChild(ov);
    box = document.getElementById('qadd-box');
    document.getElementById('qadd-title').addEventListener('keydown',e=>{ if(e.key==='Enter') confirmQAdd(); if(e.key==='Escape') closeQAdd(); });
  }
  document.getElementById('qadd-label').textContent = label;
  const startValue = roundToQuarterHour(hour || '');
  const {hour: h12, minute: m12, ampm: ap12} = to12Hour(startValue);
  document.getElementById('qadd-time-h').value = h12;
  document.getElementById('qadd-time-m').value = m12;
  document.getElementById('qadd-time-ap').value = ap12;
  const {hour: endH, minute: endM, ampm: endAP} = to12Hour(startValue ? defaultEndTimeFromStart(startValue, 60) : '');
  document.getElementById('qadd-endtime-h').value = endH;
  document.getElementById('qadd-endtime-m').value = endM;
  document.getElementById('qadd-endtime-ap').value = endAP;
  document.getElementById('qadd-title').value = '';
  const mx=event.clientX, my=event.clientY;
  box.style.left = Math.min(mx, window.innerWidth-280)+'px';
  box.style.top = Math.min(my, window.innerHeight-200)+'px';
  document.getElementById('qadd-overlay').classList.add('open');
  const syncQAddTimes = () => {
    const startH = document.getElementById('qadd-time-h')?.value;
    const startM = document.getElementById('qadd-time-m')?.value;
    const startAP = document.getElementById('qadd-time-ap')?.value;
    const t = to24Hour(startH, startM, startAP);
    const labelEl = document.getElementById('qadd-label');
    if (labelEl) {
      const d = new Date(qAddDate + 'T12:00:00');
      labelEl.textContent = d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' }) + (t ? ' Â· ' + fmtTime(t) : '');
    }
    if (!t) {
      document.getElementById('qadd-endtime-h').value = '12';
      document.getElementById('qadd-endtime-m').value = '00';
      document.getElementById('qadd-endtime-ap').value = 'AM';
      return;
    }
    const endMins = parseTimeToMinutes(t) + 60;
    const end24 = minutesToTime(endMins);
    const {hour: endH, minute: endM, ampm: endAP} = to12Hour(end24);
    document.getElementById('qadd-endtime-h').value = endH;
    document.getElementById('qadd-endtime-m').value = endM;
    document.getElementById('qadd-endtime-ap').value = endAP;
  };
  document.getElementById('qadd-time-h')?.addEventListener('change', syncQAddTimes);
  document.getElementById('qadd-time-m')?.addEventListener('change', syncQAddTimes);
  document.getElementById('qadd-time-ap')?.addEventListener('change', syncQAddTimes);
  syncQAddTimes();
  setTimeout(()=>document.getElementById('qadd-title')?.focus(),50);
}

function closeQAdd() { document.getElementById('qadd-overlay')?.classList.remove('open'); }

function openQAddDateEdit() {
  const label = document.getElementById('qadd-label');
  if (!label || label.querySelector('input')) return;
  const inp = document.createElement('input');
  inp.type = 'date'; inp.value = qAddDate;
  inp.style.cssText = 'background:var(--bg3);border:1px solid var(--accent);border-radius:5px;color:var(--text);font-size:13px;padding:2px 6px;font-family:inherit;outline:none';
  label.innerHTML = ''; label.appendChild(inp);
  inp.focus();
  inp.addEventListener('change', () => {
    if (inp.value) {
      qAddDate = inp.value;
      const d = new Date(inp.value + 'T12:00:00');
      const t = document.getElementById('qadd-time')?.value;
      label.textContent = d.toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'}) + (t ? ' Â· ' + fmtTime(t) : '');
      label.style.cursor = 'pointer';
      label.onclick = openQAddDateEdit;
    }
  });
  inp.addEventListener('blur', () => {
    if (!inp.value) {
      const d = new Date(qAddDate + 'T12:00:00');
      label.textContent = d.toLocaleDateString('en-US', {weekday:'short',month:'short',day:'numeric'});
      label.onclick = openQAddDateEdit;
    }
  });
}

async function confirmQAdd() {
  const title = document.getElementById('qadd-title').value.trim();
  if (!title) return;
  const time = to24Hour(document.getElementById('qadd-time-h')?.value, document.getElementById('qadd-time-m')?.value, document.getElementById('qadd-time-ap')?.value);
  const endTime = to24Hour(document.getElementById('qadd-endtime-h')?.value, document.getElementById('qadd-endtime-m')?.value, document.getElementById('qadd-endtime-ap')?.value);
  const areaId = document.getElementById('qadd-area')?.value || DB.areas[0]?.id || 'area-jobs';
  const area = DB.areas.find(a=>a.id===areaId);
  const category = area?.id === 'area-jobs' ? 'job' : area?.id === 'area-health' ? 'health' : 'other';
  const ev = await api('POST', '/api/records', {
    type:'event', areaId, title, status:'upcoming', urgency:'new', priority:2,
    fields:{ date:qAddDate, time, endTime, location:'', link:'', category, notes:'' },
    links:[]
  });
  DB.records.push(ev);
  closeQAdd();
  if (document.getElementById('page-dashboard')?.classList.contains('active') || currentView==='dashboard') renderCalWidget('dash-cal',true);
  if (currentView==='calendar') renderCalFull();
}

// Inline date edit (6-box)
function openCalInlineEdit(cid, mini) {
  const span = document.getElementById('cal-title-label-'+cid);
  if (!span||span.querySelector('input')) return;
  const today = new Date();
  let ref;
  if (calMode==='day'){ref=new Date(today);ref.setDate(today.getDate()+calOffset);}
  else if (calMode==='week'){ref=new Date(today);ref.setDate(today.getDate()+calOffset*7);}
  else{ref=new Date(today.getFullYear(),today.getMonth()+calOffset,1);}
  const isDayOrWeek = (calMode==='day'||calMode==='week');
  const fields = isDayOrWeek
    ? [{t:'m',v:String(ref.getMonth()+1).padStart(2,'0')},{t:'d',v:String(ref.getDate()).padStart(2,'0')},{t:'y',v:String(ref.getFullYear()).slice(2)}]
    : [{t:'m',v:String(ref.getMonth()+1).padStart(2,'0')},{t:'y',v:String(ref.getFullYear()).slice(2)}];
  span.innerHTML='';
  const wrap = document.createElement('span');
  wrap.style.cssText='display:inline-flex;align-items:center;gap:4px;vertical-align:middle';
  const fieldInputs=[];
  function daysInMonth(m,y){return new Date(2000+parseInt(y||26),m,0).getDate();}
  function getFieldVal(fi){const{inp0,inp1}=fieldInputs[fi];return parseInt((inp0.value||'0')+(inp1.value||'0'));}
  function setFieldVal(fi,val){
    const f=fields[fi];let min=1,max=12;
    if(f.t==='d'){max=daysInMonth(getFieldVal(0),fieldInputs[fields.length-1]?getFieldVal(fields.length-1):26);}
    else if(f.t==='y'){min=24;max=99;}
    val=Math.max(min,Math.min(max,val));
    const s=String(val).padStart(2,'0');
    fieldInputs[fi].inp0.value=s[0];fieldInputs[fi].inp1.value=s[1];
  }
  function advanceField(fi){if(fi<fields.length-1){fieldInputs[fi+1].inp0.focus();fieldInputs[fi+1].inp0.select();}else setTimeout(applyBoxes,50);}
  function handleDigit(fi,slotIdx,d){
    const f=fields[fi];const{inp0,inp1,af}=fieldInputs[fi];
    if(f.t==='m'){
      if(slotIdx===0){if(d==='0'){inp0.value='0';inp1.focus();inp1.select();return;}if(parseInt(d)>=2&&parseInt(d)<=9){inp0.value='0';af[0]=true;inp1.value=d;af[1]=false;advanceField(fi);return;}if(d==='1'){inp0.value='1';inp1.focus();inp1.select();return;}return;}
      else{const mm=parseInt(inp0.value+d);if(mm>=1&&mm<=12){inp1.value=d;af[1]=false;advanceField(fi);}return;}
    }
    if(f.t==='d'){
      const maxD=daysInMonth(getFieldVal(0),isDayOrWeek?getFieldVal(fields.length-1):26);
      if(slotIdx===0){if(d==='0'){inp0.value='0';inp1.focus();inp1.select();return;}if(parseInt(d)>=4){inp0.value='0';af[0]=true;inp1.value=d;af[1]=false;advanceField(fi);return;}if(parseInt(d)===3&&maxD<30)return;inp0.value=d;inp1.focus();inp1.select();return;}
      else{const dd=parseInt(inp0.value+d);if(dd>=1&&dd<=maxD){inp1.value=d;af[1]=false;advanceField(fi);}return;}
    }
    if(f.t==='y'){if(slotIdx===0){inp0.value=d;inp1.focus();inp1.select();}else{inp1.value=d;af[1]=false;advanceField(fi);}return;}
  }
  fields.forEach((f,fi)=>{
    if(fi>0){const sep=document.createElement('span');sep.textContent='/';sep.style.cssText='color:var(--dim);font-size:12px';wrap.appendChild(sep);}
    const group=document.createElement('span');group.style.cssText='display:inline-flex;align-items:center;gap:1px';
    const af=[false,false];
    const mkInp=(slotIdx,initVal)=>{
      const inp=document.createElement('input');inp.maxLength=1;inp.value=initVal;
      inp.style.cssText='width:13px;text-align:center;background:var(--bg3);border:none;border-bottom:1px solid var(--border2);color:var(--text);font-size:12px;font-family:inherit;padding:1px 0;outline:none;caret-color:var(--accent)';
      inp.addEventListener('focus',()=>{inp.select();inp.style.borderBottomColor='var(--accent)';});
      inp.addEventListener('blur',()=>{inp.style.borderBottomColor='var(--border2)';});
      inp.addEventListener('keydown',e=>{
        if(e.key==='Enter'){e.preventDefault();applyBoxes();return;}
        if(e.key==='Escape'){renderCalWidget(cid,mini);return;}
        if(e.key==='Backspace'){e.preventDefault();
          if(inp.value!==''){inp.value='';if(slotIdx===1&&af[0]){fieldInputs[fi].inp0.value='';af[0]=false;fieldInputs[fi].inp0.focus();}}
          else{if(slotIdx===1){fieldInputs[fi].inp0.focus();fieldInputs[fi].inp0.select();}else if(fi>0){fieldInputs[fi-1].inp1.focus();}}return;}
        if(e.key==='ArrowLeft'){e.preventDefault();if(slotIdx===1)fieldInputs[fi].inp0.focus();else if(fi>0)fieldInputs[fi-1].inp1.focus();return;}
        if(e.key==='ArrowRight'){e.preventDefault();if(slotIdx===0)fieldInputs[fi].inp1.focus();else if(fi<fields.length-1)fieldInputs[fi+1].inp0.focus();return;}
        if(e.key==='ArrowUp'){e.preventDefault();setFieldVal(fi,getFieldVal(fi)+1);return;}
        if(e.key==='ArrowDown'){e.preventDefault();setFieldVal(fi,getFieldVal(fi)-1);return;}
        if(/^[0-9]$/.test(e.key)){e.preventDefault();handleDigit(fi,slotIdx,e.key);}
      });
      inp.addEventListener('input',e=>{inp.value=inp.value.replace(/[^0-9]/g,'').slice(0,1);});
      return inp;
    };
    const inp0=mkInp(0,f.v[0]),inp1=mkInp(1,f.v[1]);
    group.appendChild(inp0);group.appendChild(inp1);
    const arrows=document.createElement('span');arrows.style.cssText='display:flex;flex-direction:column;gap:1px;margin-left:2px';
    const btnS='background:none;border:none;color:var(--dim);cursor:pointer;padding:0 2px;font-size:8px;line-height:1.4;display:block';
    const up=document.createElement('button');up.textContent='â–²';up.style.cssText=btnS;
    const dn=document.createElement('button');dn.textContent='â–¼';dn.style.cssText=btnS;
    up.addEventListener('mouseover',()=>up.style.color='var(--text)');up.addEventListener('mouseout',()=>up.style.color='var(--dim)');
    dn.addEventListener('mouseover',()=>dn.style.color='var(--text)');dn.addEventListener('mouseout',()=>dn.style.color='var(--dim)');
    up.addEventListener('mousedown',e=>{e.preventDefault();setFieldVal(fi,getFieldVal(fi)+1);inp0.focus();});
    dn.addEventListener('mousedown',e=>{e.preventDefault();setFieldVal(fi,getFieldVal(fi)-1);inp0.focus();});
    arrows.appendChild(up);arrows.appendChild(dn);group.appendChild(arrows);
    wrap.appendChild(group);
    fieldInputs.push({inp0,inp1,af});
  });
  // Last box auto-apply
  fieldInputs[fields.length-1].inp1.addEventListener('keydown',e=>{if(/^[0-9]$/.test(e.key))setTimeout(()=>{if(fieldInputs[fields.length-1].inp1.value!=='')applyBoxes();},50);});
  span.appendChild(wrap);fieldInputs[0].inp0.focus();fieldInputs[0].inp0.select();
  let committed=false;
  function applyBoxes(){
    if(committed)return;committed=true;
    let nd;
    if(isDayOrWeek){const mm=getFieldVal(0),dd=getFieldVal(1),yy=getFieldVal(2);nd=new Date(2000+yy,mm-1,dd);}
    else{const mm=getFieldVal(0),yy=getFieldVal(1);nd=new Date(2000+yy,mm-1,1);}
    if(nd&&!isNaN(nd)&&nd.getFullYear()>2000){
      const t=new Date();t.setHours(0,0,0,0);
      if(calMode==='day')calOffset=Math.round((nd-t)/86400000);
      else if(calMode==='week')calOffset=Math.round((nd-t)/(86400000*7));
      else calOffset=(nd.getFullYear()-t.getFullYear())*12+(nd.getMonth()-t.getMonth());
    }
    renderCalWidget(cid,mini);
  }
  let mousedownOutside=false;
  document.addEventListener('mousedown',function onMD(e){if(!wrap.contains(e.target)){mousedownOutside=true;document.removeEventListener('mousedown',onMD);applyBoxes();}});
  wrap.addEventListener('focusout',function(){setTimeout(()=>{if(!wrap.contains(document.activeElement)&&!mousedownOutside)applyBoxes();},0);});
}

