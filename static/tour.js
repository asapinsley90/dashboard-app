// ── GUIDED TOUR ───────────────────────────────────────────────────────────────

const TOUR_STEPS = [
  {
    id: 'add-area',
    target: () => document.querySelector('#sidebar-sec-areas .sidebar-section-label button'),
    heading: 'Create your first area',
    text: 'Areas organize everything — one for each part of your life. Jobs, health, finances, home. Click <b>+</b> to add your first one.',
    advance: 'area-created',
    position: 'right',
    requireClick: true,
    modalHighlight: '#modal',
    modalHeading: 'Pick a template',
    modalText: 'Choose one to get started, or scroll down to create a blank area. Then give it a name and color.',
  },
  {
    id: 'add-record',
    target: () => document.querySelector('.new-record-btn'),
    heading: 'Add your first record',
    text: 'Records are the building blocks — tasks, contacts, notes, events. Click <b>+ New record</b> inside your area.',
    advance: 'record-created',
    position: 'bottom',
    requireClick: true,
    modalHighlight: '#modal',
    modalHeading: 'Create a record',
    modalText: 'Give it a name, choose a type, and click <b>Create</b>.',
    onShow: () => {
      const area = DB.areas.find(a => !a.deletedAt);
      if (area && currentView !== 'area') navigate('area', area.id);
    },
  },
  {
    id: 'fields-intro',
    heading: 'Records have widgets',
    text: 'Click <b>⚡ Widgets</b> in the record header to show or hide sections. Toggle one on or off to continue.',
    advance: 'widget-toggled',
    position: 'bottom',
    target: () => document.querySelector('button[onclick*="openWidgetsModal"]'),
    onShow: () => {
      const rec = DB.records.find(r => !r.deletedAt);
      if (rec) navigate('record', rec.areaId, rec.id);
    },
  },
  {
    id: 'widget-rightclick',
    target: () => document.querySelector('.section-title[oncontextmenu]'),
    heading: 'Right-click any widget title',
    text: 'Right-click a widget title to hide it from this record.',
    advance: 'widget-hidden',
    position: 'bottom',
    onShow: () => {
      const rec = DB.records.find(r => !r.deletedAt);
      if (rec) navigate('record', rec.areaId, rec.id);
    },
  },
  {
    id: 'widget-custom',
    heading: 'Fields are yours to define',
    text: 'Every record has a <b>Fields ⚙</b> button — add, rename, or remove fields to match how you work. Click it, look around, then click <b>Save</b>.',
    advance: 'schema-saved',
    position: 'bottom',
    target: () => document.querySelector('button[onclick*="openEditTypeSchema"]'),
    onShow: () => {
      const rec = DB.records.find(r => !r.deletedAt && r.type !== 'job');
      if (rec) navigate('record', rec.areaId, rec.id);
    },
  },
  {
    id: 'delete-record',
    target: () => document.querySelector('.record-card'),
    heading: 'Right-click to delete',
    text: 'Right-click your record and choose <b>Delete</b>. Don\'t worry — you\'ll get it back.',
    advance: 'record-deleted',
    position: 'bottom',
    onShow: () => {
      const area = DB.areas.find(a => !a.deletedAt);
      if (area && currentView !== 'area') navigate('area', area.id);
    },
  },
  {
    id: 'undo-delete',
    target: null,
    heading: 'Restore it with Ctrl+Z',
    text: 'Press <b>Ctrl+Z</b> right now. A confirmation will appear — confirm to restore your record.',
    advance: 'record-restored',
    position: 'bottom',
  },
  {
    id: 'back-forward',
    heading: 'Navigate like a browser',
    text: 'Your browser\'s back and forward buttons work here — or use the arrows below to jump between views.',
    advance: 'browser-nav',
    position: 'bottom',
    _backForward: true,
    onShow: () => {
      const rec = DB.records.find(r => !r.deletedAt);
      if (rec) navigate('record', rec.areaId, rec.id);
    },
  },
  {
    id: 'calendar',
    target: () => document.querySelector('[data-view="calendar"]'),
    heading: 'Your calendar',
    text: 'Events from all your areas show up here. Click to explore.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'calendar-views',
    target: () => document.querySelector('.cal-mode-btn'),
    heading: 'Day, week, or month',
    text: 'Events from <b>every area</b> — color coded to the area they belong to. Switch between Day, Week, and Month views. Try one now.',
    advance: 'calendar-view-changed',
    position: 'bottom',
    onShow: () => { if (currentView !== 'calendar') navigate('calendar'); },
  },
  {
    id: 'contacts',
    target: () => document.querySelector('[data-view="contacts"]'),
    heading: 'Contacts span everything',
    text: 'Contacts link across all your areas — one contact, referenced everywhere. Click to open.',
    advance: 'navigate-contacts',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'documents',
    target: () => document.querySelector('[data-view="documents"]'),
    heading: 'All your files, one place',
    text: 'Any file uploaded to a record appears here — searchable across every area. Click to open.',
    advance: 'navigate-documents',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'dashboard',
    target: () => document.querySelector('[data-view="dashboard"]'),
    heading: 'Your home base',
    text: 'The dashboard brings everything together. Click to go there.',
    advance: 'navigate-dashboard',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'dash-areas',
    target: () => document.querySelector('[data-widget-id="areas"]'),
    heading: 'Life areas',
    text: 'All your areas at a glance — click any card to jump straight in.',
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
    onShow: () => { if (currentView !== 'dashboard') navigate('dashboard'); },
  },
  {
    id: 'dash-week',
    target: () => document.querySelector('[data-widget-id="week"]'),
    heading: 'This week',
    text: 'Events and deadlines coming up in the next 7 days, pulled from every area automatically.',
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
    onShow: () => { if (currentView !== 'dashboard') navigate('dashboard'); },
  },
  {
    id: 'dash-today',
    target: () => document.querySelector('[data-widget-id="today"]'),
    heading: 'Today',
    text: "Events scheduled for today across all your areas — your daily starting point.",
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
    onShow: () => { if (currentView !== 'dashboard') navigate('dashboard'); },
  },
  {
    id: 'dash-cal',
    target: () => document.querySelector('[data-widget-id="cal"] .dash-section-label'),
    heading: 'Global calendar',
    text: "Your calendar lives here on the dashboard too — always in view across every area.",
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
    onShow: () => { if (currentView !== 'dashboard') navigate('dashboard'); },
  },
  {
    id: 'dash-attention-explain',
    target: () => document.querySelector('[data-widget-id="attention"] .record-card') || document.querySelector('[data-widget-id="attention"]'),
    heading: 'Needs attention',
    text: '<b>Right-click the record above</b> to set its urgency — <b>🔴 Urgent</b> sits at the top, then <b>🟣 Priority</b>, <b>🟡 Follow up</b>. Each level has its own color so the most critical things are always visible.',
    advance: 'urgency-changed',
    position: 'bottom',
    onShow: () => { if (currentView !== 'dashboard') navigate('dashboard'); },
  },
  {
    id: 'finish',
    target: () => document.querySelector('#sidebar-assistant-btn'),
    heading: "You're all set!",
    text: '',
    advance: 'manual',
    position: 'right',
    _finish: true,
    onShow: () => { navigate('dashboard'); },
  },
];

const tour = {
  active: false,
  step: 0,
  lastAreaId: null,
  _clickHandler: null,
};

// Track areas/records created during the tour so we can wipe them (persisted across refreshes)
const _savedTourCreated = (() => { try { return JSON.parse(localStorage.getItem('tourCreated') || '{}'); } catch { return {}; } })();
const tourCreated = { areaIds: _savedTourCreated.areaIds || [], recordIds: _savedTourCreated.recordIds || [] };
function _saveTourCreated() { try { localStorage.setItem('tourCreated', JSON.stringify(tourCreated)); } catch {} }

function tourDismissed() {
  return !!(currentUser.dashboardPrefs?.tourDismissed);
}

function startTour() {
  if (tourDismissed()) return;
  tour.active = true;
  tour.step = 0;
  tourCreated.areaIds = [];
  tourCreated.recordIds = [];
  _saveTourCreated();
  showTourStep(0);
}

function showTourStep(index) {
  clearTourOverlay();
  if (index >= TOUR_STEPS.length) { endTour(); return; }
  tour.step = index;
  const step = TOUR_STEPS[index];
  if (step.onShow) step.onShow();
  setTimeout(() => _renderTourStep(step, index), step.id === 'finish' ? 400 : (step.onShow ? 380 : 150));
}

function _renderTourStep(step, index) {
  const target = step.target?.();

  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  document.body.appendChild(overlay);

  // ── fields-intro: manual step-through with Got it ──
  if (step._cycleTargets) {
    const targets = step._cycleTargets;
    step._cycleIndex = 0;

    const showTarget = (ci) => {
      document.getElementById('tour-halo')?.remove();
      document.querySelectorAll('.tour-spotlight').forEach(el => el.classList.remove('tour-spotlight'));
      const el = document.querySelector(targets[ci].sel);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('tour-spotlight');
        setTimeout(() => {
          const r = el.getBoundingClientRect();
          document.getElementById('tour-halo')?.remove();
          const h = document.createElement('div');
          h.id = 'tour-halo';
          h.style.cssText = `top:${r.top-6}px;left:${r.left-6}px;width:${r.width+12}px;height:${r.height+12}px`;
          document.body.appendChild(h);
        }, 250);
      }
      const textEl = document.getElementById('tour-cycle-text');
      if (textEl) textEl.innerHTML = targets[ci].label;
      const ctaEl = document.getElementById('tour-cycle-cta');
      if (ctaEl) ctaEl.textContent = ci < targets.length - 1 ? 'Next →' : 'Got it';
    };

    window._tourCycleNext = () => {
      step._cycleIndex++;
      if (step._cycleIndex >= targets.length) { advanceTour(); return; }
      showTarget(step._cycleIndex);
    };

    const bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const cycleText = `<div class="tour-text" id="tour-cycle-text" style="min-height:40px">${targets[0].label}</div>`;
    const actions = `<div class="tour-actions"><button class="tour-cta" id="tour-cycle-cta" onclick="_tourCycleNext()">Next →</button><button class="tour-skip" onclick="dismissTour()">Skip tour</button></div>`;
    bubble.innerHTML = `${stepCount}${heading}${cycleText}${actions}`;
    document.body.appendChild(bubble);
    const bRect = bubble.getBoundingClientRect();
    bubble.style.left = Math.max(10, window.innerWidth / 2 - (bRect.width || 280) / 2) + 'px';
    bubble.style.top = Math.min(window.innerHeight - (bRect.height || 160) - 10, window.innerHeight * 0.65) + 'px';
    bubble.style.visibility = 'visible';
    setTimeout(() => showTarget(0), 400);
    return;
  }

  // ── back-forward: interactive arrows in the bubble ──
  if (step._backForward) {
    const bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const text = `<div class="tour-text">${step.text}</div>`;
    const navArrows = `<div id="tour-nav-arrows" style="display:flex;gap:6px;justify-content:center;margin:12px 0 16px">
      <button id="tour-back-arrow" onclick="tourNavBack()" title="Go back" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text);transition:background .15s" onmouseover="this.style.background='var(--bg4,var(--border))'" onmouseout="this.style.background='var(--bg3)'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button id="tour-fwd-arrow" onclick="tourNavForward()" title="Go forward" style="width:36px;height:36px;border-radius:50%;border:none;background:var(--bg3);cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--muted);opacity:0.35;pointer-events:none;transition:background .15s" onmouseover="this.style.background='var(--bg4,var(--border))'" onmouseout="this.style.background='var(--bg3)'">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
    </div>`;
    const skip = `<button class="tour-skip" onclick="dismissTour()">Skip tour</button>`;
    const actions = `<div class="tour-actions"><button class="tour-skip" style="opacity:0.5" onclick="advanceTour()">Skip step →</button>${skip}</div>`;
    bubble.innerHTML = `${stepCount}${heading}${text}${navArrows}${actions}`;
    document.body.appendChild(bubble);
    _positionBubble(bubble, null, 'bottom');
    return;
  }

  // ── finish step ──
  if (step._finish) {
    if (target) {
      target.classList.add('tour-spotlight');
      const rect = target.getBoundingClientRect();
      const halo = document.createElement('div');
      halo.id = 'tour-halo';
      halo.style.cssText = `top:${rect.top-6}px;left:${rect.left-6}px;width:${rect.width+12}px;height:${rect.height+12}px`;
      document.body.appendChild(halo);
    }
    const bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const wipeBtn = `<button style="width:100%;margin-top:8px;padding:8px;font-size:12px;color:var(--muted);background:none;border:none;cursor:pointer;text-decoration:underline" onclick="wipeTourData()">Starting fresh and clearing tutorial data</button>`;
    const actions = `<div class="tour-actions" style="flex-direction:column;align-items:stretch"><button class="tour-cta" style="width:100%" onclick="endTour()">Let's go!</button>${wipeBtn}</div>`;
    bubble.innerHTML = `${heading}${actions}`;
    document.body.appendChild(bubble);
    _positionBubble(bubble, target, step.position);
    return;
  }

  // ── standard step ──
  if (target) {
    target.classList.add('tour-spotlight');
    const rect = target.getBoundingClientRect();
    const halo = document.createElement('div');
    halo.id = 'tour-halo';
    halo.style.cssText = `top:${rect.top - 6}px;left:${rect.left - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px`;
    document.body.appendChild(halo);

    if (step.requireClick) {
      const clickZone = document.createElement('div');
      clickZone.id = 'tour-click-zone';
      clickZone.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;z-index:10001;cursor:pointer`;
      document.body.appendChild(clickZone);

      const handler = () => {
        clickZone.remove();
        tour._clickHandler = null;
        clearTourOverlay();
        if (step.advance === 'manual') {
          setTimeout(() => showTourStep(tour.step + 1), 300);
        } else if (step.modalHighlight) {
          setTimeout(() => {
            const modal = document.querySelector(step.modalHighlight);
            if (!modal) return;
            const bubble = document.createElement('div');
            bubble.id = 'tour-bubble';
            bubble.innerHTML = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div><div class="tour-heading">${step.modalHeading||'Fill it in'}</div><div class="tour-text">${step.modalText||''}</div><div class="tour-actions"><button class="tour-skip" onclick="dismissTour()">Skip tour</button></div>`;
            document.body.appendChild(bubble);
            _positionBubble(bubble, modal, 'right');
            const modalEl = document.getElementById('modal-overlay');
            if (modalEl) {
              let advancedByEvent = false;
              const obs = new MutationObserver(() => {
                if (!modalEl.classList.contains('open')) {
                  obs.disconnect();
                  setTimeout(() => {
                    if (tour.step === index && !advancedByEvent) {
                      clearTourOverlay();
                      setTimeout(() => showTourStep(index), 200);
                    }
                  }, 600);
                }
              });
              obs.observe(modalEl, { attributes: true, attributeFilter: ['class'] });
              const _watchAdvance = setInterval(() => {
                if (tour.step !== index) { advancedByEvent = true; clearInterval(_watchAdvance); }
              }, 50);
            }
          }, 150);
        }
      };
      clickZone.addEventListener('click', () => { handler(); target.click(); });
      tour._clickHandler = { el: clickZone, fn: null };
    }
  }

  const bubble = document.createElement('div');
  bubble.id = 'tour-bubble';

  const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
  const heading = `<div class="tour-heading">${step.heading}</div>`;
  const text = `<div class="tour-text">${step.text}</div>`;

  // Event-driven steps (waiting for user action): show faded skip link, no Got it
  const isEventDriven = step.advance && step.advance !== 'manual';
  let actions;
  if (isEventDriven) {
    actions = `<div class="tour-actions"><button class="tour-skip" style="opacity:0.5" onclick="advanceTour()">Skip step →</button><button class="tour-skip" onclick="dismissTour()">Skip tour</button></div>`;
  } else {
    const ctaLabel = step.cta || (step.requireClick && target ? 'Got it' : 'Next');
    const ctaOnclick = (step.requireClick && target && step.advance !== 'manual')
      ? `document.getElementById('tour-click-zone')?.click()`
      : `advanceTour()`;
    const skip = `<button class="tour-skip" onclick="dismissTour()">Skip tour</button>`;
    actions = `<div class="tour-actions"><button class="tour-cta" onclick="${ctaOnclick}">${ctaLabel}</button>${skip}</div>`;
  }

  bubble.innerHTML = `${stepCount}${heading}${text}${actions}`;
  document.body.appendChild(bubble);
  _positionBubble(bubble, target, step.position);
}

// Back/forward interactive handlers
function tourNavBack() {
  const backBtn = document.getElementById('tour-back-arrow');
  const fwdBtn = document.getElementById('tour-fwd-arrow');
  if (backBtn) { backBtn.style.opacity = '0.4'; backBtn.style.pointerEvents = 'none'; }
  window.history.back();
  setTimeout(() => {
    if (fwdBtn) { fwdBtn.style.opacity = '1'; fwdBtn.style.pointerEvents = ''; fwdBtn.style.borderColor = 'var(--accent)'; fwdBtn.style.color = 'var(--text)'; }
  }, 600);
}

function tourNavForward() {
  const fwdBtn = document.getElementById('tour-fwd-arrow');
  if (fwdBtn) { fwdBtn.style.opacity = '0.4'; fwdBtn.style.pointerEvents = 'none'; }
  window.history.forward();
  setTimeout(() => tourNotify('browser-nav'), 600);
}

async function wipeTourData() {
  clearTourOverlay();
  localStorage.removeItem('tourCreated');
  // Delete tour-created records and areas
  for (const id of tourCreated.recordIds) {
    const r = DB.records.find(r => r.id === id);
    if (r) { r.deletedAt = new Date().toISOString(); api('DELETE', `/api/records/${id}`).catch(() => {}); }
  }
  for (const id of tourCreated.areaIds) {
    const a = DB.areas.find(a => a.id === id);
    if (a) { a.deletedAt = new Date().toISOString(); api('DELETE', `/api/areas/${id}`).catch(() => {}); }
  }
  renderSidebar();
  navigate('dashboard');
  endTour();
}

function _positionBubble(bubble, target, pos) {
  bubble.style.visibility = 'hidden';
  const bRect = bubble.getBoundingClientRect();
  const bw = bRect.width || 280;
  const bh = bRect.height || 160;
  const gap = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const pad = 10;

  let left, top;

  if (target) {
    const r = target.getBoundingClientRect();
    if (pos === 'right') {
      left = r.right + gap;
      top = r.top;
    } else {
      left = r.left;
      top = r.bottom + gap;
    }
  } else {
    left = vw / 2 - bw / 2;
    top = vh / 2 - bh / 2;
  }

  left = Math.max(pad, Math.min(left, vw - bw - pad));
  top = Math.max(pad, Math.min(top, vh - bh - pad));

  bubble.style.left = left + 'px';
  bubble.style.top = top + 'px';
  bubble.style.visibility = 'visible';
}

function advanceTour() {
  showTourStep(tour.step + 1);
}

function endTour() {
  clearTourOverlay();
  tour.active = false;
  const prefs = currentUser.dashboardPrefs || {};
  prefs.tourDismissed = true;
  currentUser.dashboardPrefs = prefs;
  api('PATCH', '/api/me', { dashboardPrefs: prefs, onboardingStep: 'complete' }).catch(() => {});
}

function dismissTour() {
  if (document.getElementById('modal-overlay')?.classList.contains('open')) closeModal();
  const finishIndex = TOUR_STEPS.findIndex(s => s.id === 'finish');
  if (finishIndex >= 0 && tour.step !== finishIndex) {
    setTimeout(() => showTourStep(finishIndex), 100);
  } else {
    endTour();
  }
}

function clearTourOverlay() {
  if (tour._clickHandler) {
    if (tour._clickHandler.fn) tour._clickHandler.el.removeEventListener('click', tour._clickHandler.fn);
    tour._clickHandler = null;
  }
  window._tourCycleNext = null;
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-bubble')?.remove();
  document.getElementById('tour-halo')?.remove();
  document.getElementById('tour-click-zone')?.remove();
  document.querySelectorAll('.tour-spotlight').forEach(el => el.classList.remove('tour-spotlight'));
}

function showTourTip(key, targetSelector, heading, text, position) {
  const prefs = currentUser.dashboardPrefs || {};
  if ((prefs.dismissedTourTips || []).includes(key)) return;

  const show = () => {
    const target = document.querySelector(targetSelector);
    document.getElementById('tour-tip-bubble')?.remove();
    document.getElementById('tour-tip-halo')?.remove();

    if (target) {
      const rect = target.getBoundingClientRect();
      const halo = document.createElement('div');
      halo.id = 'tour-tip-halo';
      halo.className = 'tour-halo-el';
      halo.style.cssText = `position:fixed;top:${rect.top-6}px;left:${rect.left-6}px;width:${rect.width+12}px;height:${rect.height+12}px;border:2px solid var(--accent);border-radius:8px;pointer-events:none;z-index:9998`;
      document.body.appendChild(halo);
    }

    const bubble = document.createElement('div');
    bubble.id = 'tour-tip-bubble';
    bubble.className = 'tour-bubble-el';
    bubble.innerHTML = `<div class="tour-heading">${heading}</div><div class="tour-text">${text}</div><div class="tour-actions"><button class="tour-cta" onclick="dismissTourTip('${key}')">Got it</button></div>`;
    document.body.appendChild(bubble);
    _positionBubble(bubble, document.querySelector(targetSelector), position || 'bottom');
  };

  setTimeout(show, 400);
}

function dismissTourTip(key) {
  document.getElementById('tour-tip-bubble')?.remove();
  document.getElementById('tour-tip-halo')?.remove();
  const prefs = currentUser.dashboardPrefs || {};
  prefs.dismissedTourTips = [...(prefs.dismissedTourTips || []), key];
  currentUser.dashboardPrefs = prefs;
  api('PATCH', '/api/me', { dashboardPrefs: prefs }).catch(() => {});
}

function tourNotify(event, data) {
  if (!tour.active) return;
  const step = TOUR_STEPS[tour.step];
  if (!step) return;
  if (step.advance === event) {
    if (event === 'area-created' && data?.id) {
      tour.lastAreaId = data.id;
      tourCreated.areaIds.push(data.id);
      _saveTourCreated();
    }
    if (event === 'record-created' && data?.id) {
      tourCreated.recordIds.push(data.id);
      _saveTourCreated();
    }
    clearTourOverlay();
    closeModal?.();
    setTimeout(() => showTourStep(tour.step + 1), 500);
  }
}
