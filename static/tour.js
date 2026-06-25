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
    text: 'Records are the building blocks — jobs, tasks, contacts, notes. Click <b>+ New record</b> inside your area.',
    advance: 'record-created',
    position: 'bottom',
    requireClick: true,
    onShow: () => {
      const area = DB.areas.find(a => !a.deletedAt);
      if (area && currentView !== 'area') navigate('area', area.id);
    },
  },
  {
    id: 'right-click-record',
    target: () => document.querySelector('.record-card'),
    heading: 'Quick actions',
    text: 'Right-click any record to delete, archive, or change its status. <b>Ctrl+Z</b> restores anything deleted within 24 hours.',
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
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
];

const tour = {
  active: false,
  step: 0,
  lastAreaId: null,
  _clickHandler: null,
};

function tourDismissed() {
  return !!(currentUser.dashboardPrefs?.tourDismissed);
}

function startTour() {
  if (tourDismissed()) return;
  tour.active = true;
  tour.step = 0;
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

  if (target) {
    target.classList.add('tour-spotlight');
    const rect = target.getBoundingClientRect();
    const halo = document.createElement('div');
    halo.id = 'tour-halo';
    halo.style.cssText = `top:${rect.top - 6}px;left:${rect.left - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px`;
    document.body.appendChild(halo);

    // If this step requires clicking the target, wire it up
    if (step.requireClick) {
      const handler = () => {
        target.removeEventListener('click', handler);
        tour._clickHandler = null;
        // Always clear overlay so modals/interactions aren't blocked
        clearTourOverlay();
        if (step.advance === 'manual') setTimeout(() => showTourStep(tour.step + 1), 300);
        // For event-driven advances (area-created, record-created), tourNotify handles the next step
      };
      target.addEventListener('click', handler);
      tour._clickHandler = { el: target, fn: handler };
    }
  }

  const bubble = document.createElement('div');
  bubble.id = 'tour-bubble';

  const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
  const heading = `<div class="tour-heading">${step.heading}</div>`;
  const text = `<div class="tour-text">${step.text}</div>`;
  const skip = `<button class="tour-skip" onclick="dismissTour()">Skip tour</button>`;

  // Only show Next/CTA button if not requireClick
  const showBtn = !step.requireClick || !target;
  const ctaLabel = step.cta || 'Next';
  const actions = showBtn
    ? `<div class="tour-actions"><button class="tour-cta" onclick="advanceTour()">${ctaLabel}</button>${skip}</div>`
    : `<div class="tour-actions"><span style="font-size:11px;color:var(--text3);font-style:italic">Click the highlighted element to continue</span>${skip}</div>`;

  bubble.innerHTML = `${stepCount}${heading}${text}${actions}`;
  document.body.appendChild(bubble);

  _positionBubble(bubble, target, step.position);
}

function _positionBubble(bubble, target, pos) {
  // Let browser calculate natural size first
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

  // Clamp to viewport
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
  setTimeout(() => {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:12px 20px;font-size:13px;color:var(--text);z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.3);text-align:center';
    t.innerHTML = `<span style="color:var(--green)">✓</span> You're all set — the assistant is always in the sidebar if you need anything.`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 5000);
  }, 200);
}

function dismissTour() {
  clearTourOverlay();
  tour.active = false;
  const prefs = currentUser.dashboardPrefs || {};
  prefs.tourDismissed = true;
  currentUser.dashboardPrefs = prefs;
  api('PATCH', '/api/me', { dashboardPrefs: prefs, onboardingStep: 'complete' }).catch(() => {});
}

function clearTourOverlay() {
  if (tour._clickHandler) {
    tour._clickHandler.el.removeEventListener('click', tour._clickHandler.fn);
    tour._clickHandler = null;
  }
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-bubble')?.remove();
  document.getElementById('tour-halo')?.remove();
  document.querySelectorAll('.tour-spotlight').forEach(el => el.classList.remove('tour-spotlight'));
}

function tourNotify(event, data) {
  if (!tour.active) return;
  const step = TOUR_STEPS[tour.step];
  if (!step) return;
  if (step.advance === event) {
    if (event === 'area-created' && data?.id) tour.lastAreaId = data.id;
    setTimeout(() => showTourStep(tour.step + 1), 500);
  }
}
