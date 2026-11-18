/* ==========================================================================
   eLibrary — Focus reading mode ("do not disturb" while reading)

   What a web page CAN do, and this mode does:
   • real fullscreen (Fullscreen API: Android, desktop, iPad); on iPhone Safari,
     where it is not available, the app hides all of its own interface instead
   • silence the app: no toasts, banners or prompts while reading — they are
     held back and summarised when you leave
   • keep the screen awake (Screen Wake Lock API)
   • minimal, dark, distraction-free page view; tap centre = show/hide controls

   What NO web page can do: switch the phone's system "Do Not Disturb".
   We therefore show a short one-time tip on how to turn it on with one tap.

   Leaving: ✕ button, Esc, or leaving fullscreen with the system gesture —
   everything is restored and a short reading summary is shown.
   ========================================================================== */

const FOCUS_HINT_KEY = 'elibrary_focus_hint_seen_v1';

const focusState = {
  active: false,
  startedAt: 0,
  startPage: 1,
  maxPage: 1,
  wakeLock: null,
  heldToasts: 0,
  hideTimer: null,
  usedFullscreen: false,
  readerHome: null,      /* where the reader normally lives in the page */
  readerNext: null
};

/* Glass cards use CSS filters/transforms, which would trap a fixed overlay inside
   them. While focusing, the reader is moved directly under <body>, then put back. */
function liftReader() {
  const reader = document.querySelector('.book-reader');
  if (!reader || reader.parentNode === document.body) return;
  focusState.readerHome = reader.parentNode;
  focusState.readerNext = reader.nextSibling;
  document.body.appendChild(reader);
}

function restoreReader() {
  const reader = document.body.querySelector(':scope > .book-reader');
  if (!reader) return;
  const home = focusState.readerHome;
  if (home && home.isConnected) home.insertBefore(reader, focusState.readerNext && focusState.readerNext.parentNode === home ? focusState.readerNext : null);
  else reader.remove();
  focusState.readerHome = null;
  focusState.readerNext = null;
}

function isFocusMode() {
  return focusState.active;
}

function fullscreenSupported() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

function isFullscreenNow() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

function detectPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'desktop';
}

function isStandaloneApp() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}

/* Entry point from the reader toolbar */
function toggleFocusMode() {
  if (focusState.active) { exitFocusMode(); return; }
  let seen = false;
  try { seen = localStorage.getItem(FOCUS_HINT_KEY) === '1'; } catch (e) {}
  if (seen) enterFocusMode();
  else openFocusHint();
}

function openFocusHint() {
  const platform = detectPlatform();
  const body = document.getElementById('focus-hint-body');
  if (body) {
    const steps = {
      android: t('focusHintAndroid'),
      ios: t('focusHintIos') + (isStandaloneApp() ? '' : ' ' + t('focusHintIosHome')),
      desktop: t('focusHintDesktop')
    }[platform];
    body.innerHTML = `
      <ul class="focus-hint-list">
        <li>${escapeHtml(t('focusFeatureFullscreen'))}</li>
        <li>${escapeHtml(t('focusFeatureSilence'))}</li>
        <li>${escapeHtml(t('focusFeatureAwake'))}</li>
      </ul>
      <div class="focus-hint-system">
        <strong>${escapeHtml(t('focusSystemTitle'))}</strong>
        <p>${escapeHtml(steps)}</p>
      </div>`;
  }
  document.getElementById('focus-hint-modal').classList.add('open');
}

function closeFocusHint() {
  document.getElementById('focus-hint-modal').classList.remove('open');
}

function confirmFocusHint() {
  const dont = document.getElementById('focus-hint-dont-show');
  if (dont && dont.checked) {
    try { localStorage.setItem(FOCUS_HINT_KEY, '1'); } catch (e) {}
  }
  closeFocusHint();
  enterFocusMode();
}

async function enterFocusMode() {
  if (focusState.active || state.currentScreen !== 'reader') return;
  focusState.active = true;
  focusState.startedAt = Date.now();
  focusState.startPage = pdfReader.page || 1;
  focusState.maxPage = focusState.startPage;
  focusState.heldToasts = 0;
  focusState.usedFullscreen = false;

  liftReader();
  document.body.classList.add('focus-reading');
  const toast = document.getElementById('net-toast');
  if (toast) toast.className = 'net-toast';

  /* Real fullscreen where the browser allows it (must be inside the tap) */
  if (fullscreenSupported() && !isFullscreenNow()) {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen();
      focusState.usedFullscreen = true;
    } catch (e) { /* not allowed — the in-app fullscreen still applies */ }
  }

  await requestWakeLock();
  updateFocusButton();
  showFocusControls();
  /* re-fit the page to the whole screen */
  setTimeout(() => { if (pdfReader.doc) { pdfReader.cache.clear(); pdfShowPage(pdfReader.page, 0); } }, 120);
}

async function exitFocusMode(opts) {
  if (!focusState.active) return;
  focusState.active = false;
  document.body.classList.remove('focus-reading', 'focus-controls-hidden');
  restoreReader();
  clearTimeout(focusState.hideTimer);

  if (isFullscreenNow() && !(opts && opts.fromFullscreenChange)) {
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
    } catch (e) {}
  }
  releaseWakeLock();
  updateFocusButton();

  if (pdfReader.doc) { pdfReader.cache.clear(); pdfShowPage(pdfReader.page, 0); }

  const minutes = Math.max(1, Math.round((Date.now() - focusState.startedAt) / 60000));
  const pages = Math.max(0, focusState.maxPage - focusState.startPage);
  let msg = t('focusSummary', { m: minutes, p: pages });
  if (focusState.heldToasts > 0) msg += ' · ' + t('focusHeld', { n: focusState.heldToasts });
  showToast(msg, 'online');
}

/* Screen Wake Lock: keep the display on while reading */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      focusState.wakeLock = await navigator.wakeLock.request('screen');
      focusState.wakeLock.addEventListener('release', () => { focusState.wakeLock = null; });
    }
  } catch (e) { focusState.wakeLock = null; }
}

function releaseWakeLock() {
  try { if (focusState.wakeLock) focusState.wakeLock.release(); } catch (e) {}
  focusState.wakeLock = null;
}

/* Controls fade away after a few seconds; tap the centre of the page to bring them back */
function showFocusControls() {
  if (!focusState.active) return;
  document.body.classList.remove('focus-controls-hidden');
  clearTimeout(focusState.hideTimer);
  focusState.hideTimer = setTimeout(() => {
    if (focusState.active) document.body.classList.add('focus-controls-hidden');
  }, 3000);
}

function toggleFocusControls() {
  if (!focusState.active) return;
  if (document.body.classList.contains('focus-controls-hidden')) showFocusControls();
  else {
    clearTimeout(focusState.hideTimer);
    document.body.classList.add('focus-controls-hidden');
  }
}

function updateFocusButton() {
  document.querySelectorAll('.focus-toggle-btn').forEach(btn => {
    btn.setAttribute('aria-pressed', String(focusState.active));
    btn.setAttribute('aria-label', focusState.active ? t('focusExit') : t('focusMode'));
    btn.setAttribute('title', focusState.active ? t('focusExit') : t('focusMode'));
  });
}

/* Called on every page turn */
function focusNotePage(n) {
  if (focusState.active && n > focusState.maxPage) focusState.maxPage = n;
}

/* Toasts are held back while reading in focus mode */
function focusHoldToast() {
  if (!focusState.active) return false;
  focusState.heldToasts++;
  return true;
}

function setupFocusMode() {
  const onFsChange = () => {
    /* User left fullscreen with the system gesture → leave focus mode too */
    if (focusState.active && focusState.usedFullscreen && !isFullscreenNow()) exitFocusMode({ fromFullscreenChange: true });
  };
  document.addEventListener('fullscreenchange', onFsChange);
  document.addEventListener('webkitfullscreenchange', onFsChange);

  /* The wake lock is dropped by the browser when the tab is hidden — take it back */
  document.addEventListener('visibilitychange', () => {
    if (focusState.active && document.visibilityState === 'visible' && !focusState.wakeLock) requestWakeLock();
  });

  document.addEventListener('keydown', e => {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'Escape' && focusState.active) { e.preventDefault(); exitFocusMode(); }
    if ((e.key === 'f' || e.key === 'F') && state.currentScreen === 'reader' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleFocusMode();
    }
  });

  ['mousemove', 'touchstart'].forEach(ev => document.addEventListener(ev, () => {
    if (focusState.active && !document.body.classList.contains('focus-controls-hidden')) showFocusControls();
  }, { passive: true }));
}
