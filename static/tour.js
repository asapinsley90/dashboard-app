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
    modalHeading: 'Name your area',
    modalText: 'Give it a name, pick a color, and click <b>Create</b>.',
  },
  {
    id: 'collapse-area',
    target: () => {
      const areas = document.querySelectorAll('#sidebar-areas [data-area]');
      return areas.length ? areas[0] : null;
    },
    heading: 'Expand & collapse',
    text: 'Click your area name to expand or collapse it in the sidebar.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
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
    heading: 'What lives in a record',
    text: '',
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
    onShow: () => {
      const rec = DB.records.find(r => !r.deletedAt);
      if (rec) navigate('record', rec.areaId, rec.id);
    },
    _cycleTargets: [
      { sel: 'button[title*="Copy context"]', label: '<b>📋 Copy for Claude</b> — paste into Claude for help with any record', scroll: true },
      { sel: 'button[onclick*="linkContact"]', label: '<b>👤 Link contact</b> — connect people across your areas', scroll: true },
      { sel: 'div[ondrop*="recordDocDrop"]', label: '<b>📎 Upload docs</b> — files attached directly to this record', scroll: true },
    ],
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
    text: 'Use the arrows below to go back to your area, then forward to return.',
    advance: 'manual',
    cta: 'Got it',
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
    text: 'Events from all your areas appear here automatically. Click to explore.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'contacts',
    target: () => document.querySelector('[data-view="contacts"]'),
    heading: 'Contacts span everything',
    text: 'Contacts link across all your areas — one contact, referenced everywhere. Click to explore.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'documents',
    target: () => document.querySelector('[data-view="documents"]'),
    heading: 'All your files, one place',
    text: 'Any file uploaded to a record appears here — searchable across every area. Click to explore.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
    requireClick: true,
  },
  {
    id: 'dashboard',
    target: () => document.querySelector('[data-view="dashboard"]'),
    heading: 'Your home base',
    text: 'The dashboard updates live as you add records. Click to go home.',
    advance: 'manual',
    cta: "Let's go!",
    position: 'right',
    requireClick: true,
    onShow: () => {},
  },
  {
    id: 'finish',
    target: () => document.querySelector('#sidebar-assistant-btn'),
    heading: "You're all set! 🎉",
    text: "Your space is ready. <b>Ask me anything</b> is always here — it knows your data and can help you find, add, or make sense of anything.<br><br>Want to start fresh and clear the practice area?",
    advance: 'manual',
    position: 'right',
    _finish: true,
    onShow: () => navigate('dashboard'),
  },
];

const tour = {
  active: false,
  step: 0,
  lastAreaId: null,
  _clickHandler: null,
};

// Track areas/records created during the tour so we can wipe them
const tourCreated = { areaIds: [], recordIds: [] };

function tourDismissed() {
  return !!(currentUser.dashboardPrefs?.tourDismissed);
}

function startTour() {
  if (tourDismissed()) return;
  tour.active = true;
  tour.step = 0;
  tourCreated.areaIds = [];
  tourCreated.recordIds = [];
  showTourStep(0);
}

function showTourStep(index) {
  clearTourOverlay();
  if (index >= TOUR_STEPS.length) { endTour(); return; }
  tour.step = index;
  const step = TOUR_STEPS[index];
  if (step.onShow) step.onShow();
  setTimeout(() => _renderTourStep(step, index), 120);
}

function _renderTourStep(step, index) {
  const target = step.target?.();

  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  document.body.appendChild(overlay);

  // ── fields-intro: cycle through highlights with scroll ──
  if (step._cycleTargets) {
    let ci = 0;
    const targets = step._cycleTargets;

    const cycleHalo = () => {
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
      ci = (ci + 1) % targets.length;
    };

    setTimeout(cycleHalo, 400);
    step._cycleInterval = setInterval(cycleHalo, 2500);

    const bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const cycleText = `<div class="tour-text" id="tour-cycle-text" style="min-height:40px">${targets[0].label}</div>`;
    const skipLink = `<button class="tour-skip" onclick="advanceTour()">Skip step →</button>`;
    const actions = `<div class="tour-actions"><button class="tour-cta" onclick="advanceTour()">Got it</button>${skipLink}</div>`;
    bubble.innerHTML = `${stepCount}${heading}${cycleText}${actions}`;
    document.body.appendChild(bubble);
    // Position at bottom-center, below the record view
    const bRect = bubble.getBoundingClientRect();
    bubble.style.left = Math.max(10, window.innerWidth / 2 - (bRect.width || 280) / 2) + 'px';
    bubble.style.top = Math.min(window.innerHeight - (bRect.height || 160) - 10, window.innerHeight * 0.65) + 'px';
    bubble.style.visibility = 'visible';
    return;
  }

  // ── back-forward: interactive arrows in the bubble ──
  if (step._backForward) {
    const bubble = document.createElement('div');
    bubble.id = 'tour-bubble';
    const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const text = `<div class="tour-text">${step.text}</div>`;
    const navArrows = `<div id="tour-nav-arrows" style="display:flex;gap:20px;justify-content:center;margin:10px 0 14px">
      <button id="tour-back-arrow" class="tour-nav-arrow" onclick="tourNavBack()" title="Go back" style="font-size:28px;background:var(--bg3);border:2px solid var(--accent);border-radius:50%;width:52px;height:52px;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center">◀</button>
      <button id="tour-fwd-arrow" class="tour-nav-arrow" onclick="tourNavForward()" title="Go forward" style="font-size:28px;background:var(--bg3);border:2px solid var(--border2);border-radius:50%;width:52px;height:52px;cursor:pointer;color:var(--muted);display:flex;align-items:center;justify-content:center;opacity:0.4;pointer-events:none">▶</button>
    </div>`;
    const skip = `<button class="tour-skip" onclick="dismissTour()">Skip tour</button>`;
    const actions = `<div class="tour-actions"><button class="tour-cta" id="tour-bf-got-it" onclick="advanceTour()" style="opacity:0.35;pointer-events:none">Got it</button>${skip}</div>`;
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
    const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
    const heading = `<div class="tour-heading">${step.heading}</div>`;
    const text = `<div class="tour-text">${step.text}</div>`;
    const wipeBtn = tourCreated.areaIds.length
      ? `<button class="btn btn-sm" style="width:100%;margin-top:8px;font-size:12px;color:var(--muted);background:var(--bg3);border:1px solid var(--border2)" onclick="wipeTourData()">Clear practice area &amp; start fresh</button>`
      : '';
    const actions = `<div class="tour-actions" style="flex-direction:column;align-items:stretch"><button class="tour-cta" style="width:100%" onclick="endTour()">Let's go!</button>${wipeBtn}</div>`;
    bubble.innerHTML = `${stepCount}${heading}${text}${actions}`;
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
            const mRect = modal.getBoundingClientRect();
            const mHalo = document.createElement('div');
            mHalo.id = 'tour-halo';
            mHalo.style.cssText = `top:${mRect.top-6}px;left:${mRect.left-6}px;width:${mRect.width+12}px;height:${mRect.height+12}px;pointer-events:none`;
            document.body.appendChild(mHalo);
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
  const isEventDriven = step.advance && step.advance !== 'manual' && !step.requireClick;
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
  setTimeout(() => {
    const gotIt = document.getElementById('tour-bf-got-it');
    if (gotIt) { gotIt.style.opacity = '1'; gotIt.style.pointerEvents = ''; }
  }, 600);
}

async function wipeTourData() {
  clearTourOverlay();
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
  const curStep = TOUR_STEPS[tour.step];
  if (curStep?._cycleInterval) { clearInterval(curStep._cycleInterval); curStep._cycleInterval = null; }
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
    }
    if (event === 'record-created' && data?.id) {
      tourCreated.recordIds.push(data.id);
    }
    clearTourOverlay();
    setTimeout(() => showTourStep(tour.step + 1), 500);
  }
}
