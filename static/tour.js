// ── GUIDED TOUR ───────────────────────────────────────────────────────────────
// Step-by-step onboarding overlay. Replaces the chat-based onboarding flow.
// Triggered on first load when onboardingStep !== 'complete' && tour not dismissed.

const TOUR_STEPS = [
  {
    id: 'add-area',
    target: () => document.querySelector('#sidebar-sec-areas .sidebar-section-label button'),
    heading: 'Create your first area',
    text: 'Areas organize everything — one for each part of your life. Jobs, health, finances, home. Click <b>+</b> to add your first one.',
    advance: 'area-created',
    position: 'right',
  },
  {
    id: 'collapse-area',
    target: () => {
      const areas = document.querySelectorAll('#sidebar-areas [data-area]');
      return areas.length ? areas[0] : null;
    },
    heading: 'Expand & collapse',
    text: 'Click your area name to expand or collapse it in the sidebar. You can also drag areas to reorder them.',
    advance: 'manual',
    cta: 'Got it',
    position: 'right',
  },
  {
    id: 'add-record',
    target: () => document.querySelector('.area-new-record-btn, [onclick*="promptNewRecord"], .new-record-btn'),
    heading: 'Add your first record',
    text: 'Records are the building blocks — jobs, tasks, contacts, notes, events. Click <b>+ New record</b> inside your area.',
    advance: 'record-created',
    position: 'bottom',
    onShow: () => {
      // Make sure user is in the area view
      const area = DB.areas.find(a => !a.deletedAt);
      if (area && currentView !== 'area') navigate('area', area.id);
    },
  },
  {
    id: 'right-click-record',
    target: () => document.querySelector('.record-card'),
    heading: 'Quick actions',
    text: 'Right-click any record to delete, archive, or change its status. If you delete something, <b>Ctrl+Z</b> restores it within 24 hours.',
    advance: 'manual',
    cta: 'Got it',
    position: 'bottom',
  },
  {
    id: 'calendar',
    target: () => document.querySelector('[data-view="calendar"]'),
    heading: 'Your calendar',
    text: 'Events from all your areas appear here automatically. Head to Calendar to add your first one whenever you\'re ready.',
    advance: 'manual',
    cta: 'Done — let\'s go!',
    position: 'right',
  },
];

const tour = {
  active: false,
  step: 0,
  lastAreaId: null,
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

  // Small delay so DOM settles after any navigate() call
  setTimeout(() => _renderTourStep(step, index), 120);
}

function _renderTourStep(step, index) {
  const target = step.target?.();

  // Dim overlay
  const overlay = document.createElement('div');
  overlay.id = 'tour-overlay';
  document.body.appendChild(overlay);

  // Highlight target
  if (target) {
    target.classList.add('tour-spotlight');
    const rect = target.getBoundingClientRect();

    // Halo ring around target
    const halo = document.createElement('div');
    halo.id = 'tour-halo';
    halo.style.cssText = `top:${rect.top - 6}px;left:${rect.left - 6}px;width:${rect.width + 12}px;height:${rect.height + 12}px`;
    document.body.appendChild(halo);
  }

  // Bubble
  const bubble = document.createElement('div');
  bubble.id = 'tour-bubble';

  const stepCount = `<div class="tour-step-count">${index + 1} of ${TOUR_STEPS.length}</div>`;
  const heading = `<div class="tour-heading">${step.heading}</div>`;
  const text = `<div class="tour-text">${step.text}</div>`;
  const ctaLabel = step.cta || 'Next';
  const cta = `<button class="tour-cta" onclick="advanceTour()">${ctaLabel}</button>`;
  const skip = `<button class="tour-skip" onclick="dismissTour()">Skip tour</button>`;

  bubble.innerHTML = `${stepCount}${heading}${text}<div class="tour-actions">${cta}${skip}</div>`;
  document.body.appendChild(bubble);

  // Position bubble relative to target
  if (target) {
    const rect = target.getBoundingClientRect();
    const bw = 280, gap = 16;
    const pos = step.position || 'right';
    if (pos === 'right') {
      bubble.style.left = Math.min(rect.right + gap, window.innerWidth - bw - 12) + 'px';
      bubble.style.top = Math.max(rect.top, 12) + 'px';
    } else {
      bubble.style.left = Math.max(rect.left, 12) + 'px';
      bubble.style.top = (rect.bottom + gap) + 'px';
    }
  } else {
    // Fallback: center
    bubble.style.left = '50%';
    bubble.style.top = '50%';
    bubble.style.transform = 'translate(-50%,-50%)';
  }
}

function advanceTour() {
  showTourStep(tour.step + 1);
}

function endTour() {
  clearTourOverlay();
  tour.active = false;
  // Mark onboarding complete
  const prefs = currentUser.dashboardPrefs || {};
  prefs.tourDismissed = true;
  currentUser.dashboardPrefs = prefs;
  api('PATCH', '/api/me', { dashboardPrefs: prefs, onboardingStep: 'complete' }).catch(() => {});
  // Friendly closer
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
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-bubble')?.remove();
  document.getElementById('tour-halo')?.remove();
  document.querySelectorAll('.tour-spotlight').forEach(el => el.classList.remove('tour-spotlight'));
}

// Called by assistantNotify when an action completes
function tourNotify(event, data) {
  if (!tour.active) return;
  const step = TOUR_STEPS[tour.step];
  if (!step) return;
  if (step.advance === event) {
    if (event === 'area-created' && data?.id) tour.lastAreaId = data.id;
    // Small delay so the UI settles before advancing
    setTimeout(() => showTourStep(tour.step + 1), 500);
  }
}
