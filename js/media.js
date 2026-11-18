/* ==========================================================================
   eLibrary — media: built-in PDF reader (pdf.js) and native audio player.
   Files live in Google Drive; we stream them directly from
   drive.usercontent.google.com (public "anyone with the link" files allow it),
   through our Supabase function (see driveDirectUrl), which works on every phone.
   The Google Drive viewer stays as a fallback.
   ========================================================================== */

const LOCAL_PROGRESS_KEY = 'elibrary_local_progress_v1';
const PDF_WORKER_SRC = 'vendor/pdf.worker-3.11.174.min.js';

/* ---------- Links ---------- */
function driveDirectUrl(rawUrl) {
  const url = sanitizeUrl(rawUrl);
  if (!url) return '';
  if (/docs\.google\.com\/(document|presentation|spreadsheets)\//.test(url)) return '';
  if (/(drive|docs)\.google\.com|drive\.usercontent\.google\.com/.test(url)) {
    /* Browsers may not download Drive files cross-site (Google answers 403),
       so they are relayed by our Supabase function "drive-file" (Range supported). */
    const id = extractGoogleDriveId(url);
    if (!id) return '';
    /* With a Google API key files stream straight from Google (no Supabase traffic at all) */
    if (ELIB_CONFIG.googleApiKey) {
      return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(id)}?alt=media&key=${encodeURIComponent(ELIB_CONFIG.googleApiKey)}`;
    }
    return `${ELIB_CONFIG.supabaseUrl}/functions/v1/drive-file?id=${encodeURIComponent(id)}`;
  }
  return url; /* any other direct https link to a PDF / MP3 */
}

/* ---------- Local progress (works for guests too, and offline) ---------- */
function localProgressKey(bookId, mode, lang, level) {
  return `${bookId}|${mode}|${lang}|${level}`;
}

function readLocalProgress(bookId, mode, lang, level) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}');
    return all[localProgressKey(bookId, mode, lang, level)] || null;
  } catch (e) { return null; }
}

function writeLocalProgress(bookId, mode, lang, level, data) {
  try {
    const all = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || '{}');
    all[localProgressKey(bookId, mode, lang, level)] = { ...data, ts: Date.now() };
    const keys = Object.keys(all);
    if (keys.length > 200) {
      keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0)).slice(0, keys.length - 200).forEach(k => delete all[k]);
    }
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(all));
  } catch (e) {}
}

const progressSaver = {
  timer: null,
  pending: null,
  queue(bookId, mode, lang, level, extra) {
    writeLocalProgress(bookId, mode, lang, level, extra);
    state.latestProgress = { book_id: bookId, mode, lang, level, ...extra };
    this.pending = [bookId, mode, lang, level, extra];
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(), 2500);
  },
  flush() {
    clearTimeout(this.timer);
    if (!this.pending) return;
    const [bookId, mode, lang, level, extra] = this.pending;
    this.pending = null;
    if (state.currentUser) api.saveProgress(bookId, mode, lang, level, extra);
  }
};
window.addEventListener('pagehide', () => progressSaver.flush());
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') progressSaver.flush(); });


/* ==========================================================================
   Book reader — one page at a time, turned like a real book
   (swipe, tap the left/right edge, arrow keys, or the ‹ › buttons)
   ========================================================================== */
const pdfReader = {
  token: 0,
  doc: null,
  task: null,
  key: '',
  bookId: null,
  lang: 'ru',
  level: 1,
  total: 0,
  page: 1,
  zoom: 1,
  ratio: 1.414,
  cache: new Map(),   /* page -> Promise<canvas> at current size */
  sizeKey: '',
  turning: false,
  host: null
};

function pdfDestroy() {
  pdfReader.token++;
  try { if (pdfReader.task) pdfReader.task.destroy(); } catch (e) {}
  pdfReader.task = null;
  pdfReader.doc = null;
  pdfReader.key = '';
  pdfReader.cache.clear();
  pdfReader.turning = false;
  pdfReader.host = null;
}

/* Opens `rawUrl` inside `host`. Returns false when the built-in reader cannot be used. */
async function openPdfReader(host, rawUrl, opts) {
  const direct = driveDirectUrl(rawUrl);
  const key = `${direct}|${opts.bookId}|${opts.lang}|${opts.level}`;
  if (pdfReader.key === key && pdfReader.doc && host.querySelector('.book-stage')) return true;
  pdfDestroy();
  if (!direct || !window.pdfjsLib) return false;

  const token = pdfReader.token;
  Object.assign(pdfReader, { key, bookId: opts.bookId, lang: opts.lang, level: opts.level, zoom: 1, host });

  host.innerHTML = `
    <div class="book-reader">
      <div class="book-stage-wrap" id="book-stage-wrap">
        <div class="book-stage" id="book-stage">
          <div class="pdf-status" id="pdf-status">
            <div class="pdf-spinner" aria-hidden="true"></div>
            <span id="pdf-status-text">${escapeHtml(t('loadingBook'))}</span>
          </div>
        </div>
        <button type="button" class="book-edge book-edge-prev" onclick="pdfTurn(-1)" aria-label="${escapeHtml(t('prevPage'))}"></button>
        <button type="button" class="book-edge book-edge-next" onclick="pdfTurn(1)" aria-label="${escapeHtml(t('nextPage'))}"></button>
      </div>
      <div class="book-controls" role="toolbar" aria-label="${escapeHtml(t('readBook'))}">
        <button type="button" class="book-ctl" onclick="pdfZoom(-1)" aria-label="${escapeHtml(t('zoomOut'))}">−</button>
        <button type="button" class="book-ctl book-ctl-arrow" onclick="pdfTurn(-1)" aria-label="${escapeHtml(t('prevPage'))}">‹</button>
        <button type="button" class="book-page-indicator" id="pdf-page-indicator" onclick="pdfJumpPrompt()" aria-live="polite" aria-label="${escapeHtml(t('goToPage'))}">…</button>
        <button type="button" class="book-ctl book-ctl-arrow" onclick="pdfTurn(1)" aria-label="${escapeHtml(t('nextPage'))}">›</button>
        <button type="button" class="book-ctl" onclick="pdfZoom(1)" aria-label="${escapeHtml(t('zoomIn'))}">+</button>
      </div>
      <div class="book-progress" aria-hidden="true"><div class="book-progress-fill" id="book-progress-fill"></div></div>
    </div>`;

  /* Give the empty page its final shape while the book loads */
  const stage0 = document.getElementById('book-stage');
  if (stage0) {
    const sz = bookPageSize();
    stage0.style.width = `${sz.w}px`;
    stage0.style.height = `${sz.h}px`;
  }

  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;
    /* Load only what is needed: big textbooks open fast, pages download on demand */
    const task = pdfjsLib.getDocument({
      url: direct,
      isEvalSupported: false,
      withCredentials: false,
      rangeChunkSize: 1024 * 1024,
      disableAutoFetch: true,
      disableStream: true
    });
    pdfReader.task = task;
    task.onProgress = p => {
      if (token !== pdfReader.token) return;
      const el = document.getElementById('pdf-status-text');
      if (el && p.total) el.textContent = `${t('loadingBook')} ${Math.min(100, Math.round(p.loaded / p.total * 100))}%`;
    };
    const doc = await task.promise;
    if (token !== pdfReader.token) return true;
    pdfReader.doc = doc;
    pdfReader.total = doc.numPages;
    const first = await doc.getPage(1);
    const vp = first.getViewport({ scale: 1 });
    pdfReader.ratio = vp.height / vp.width;

    const saved = readLocalProgress(opts.bookId, 'read', opts.lang, opts.level);
    const start = Math.min(doc.numPages, Math.max(1, opts.startPage || (saved && saved.page) || 1));
    setupBookGestures();
    await pdfShowPage(start, 0);
    scrollBookIntoView();
    if (start > 1) showToast(t('resumedAtPage', { n: start }));
    return true;
  } catch (err) {
    if (token !== pdfReader.token) return true;
    pdfReader.key = '';
    return false;
  }
}

/* Size of one page on screen: fill the width, but never taller than the screen */
function bookPageSize() {
  const wrap = document.getElementById('book-stage-wrap');
  const availW = wrap ? wrap.clientWidth : 360;
  /* header + page controls (+ mini player when audio is open) stay visible */
  const header = document.querySelector('.top-header');
  const headerH = header ? header.getBoundingClientRect().height : 64;
  const mini = document.body.classList.contains('has-mini-player') ? 84 : 0;
  const availH = Math.max(300, window.innerHeight - headerH - 86 - mini);
  let w = availW;
  if (w * pdfReader.ratio > availH) w = availH / pdfReader.ratio;
  w = Math.floor(w);
  return { w, h: Math.floor(w * pdfReader.ratio) };
}

function pdfCanvas(n) {
  const size = bookPageSize();
  const sizeKey = `${size.w}x${pdfReader.zoom}`;
  if (sizeKey !== pdfReader.sizeKey) { pdfReader.cache.clear(); pdfReader.sizeKey = sizeKey; }
  if (pdfReader.cache.has(n)) return pdfReader.cache.get(n);
  const token = pdfReader.token;
  const promise = (async () => {
    const page = await pdfReader.doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const cssW = size.w * pdfReader.zoom;
    const viewport = page.getViewport({ scale: (cssW / base.width) * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${Math.floor(cssW * base.height / base.width)}px`;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `${t('page')} ${n}`);
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (token !== pdfReader.token) throw new Error('stale');
    return canvas;
  })();
  promise.catch(() => pdfReader.cache.delete(n));
  pdfReader.cache.set(n, promise);
  /* keep memory small: only pages near the current one */
  for (const k of pdfReader.cache.keys()) {
    if (Math.abs(k - n) > 3) pdfReader.cache.delete(k);
  }
  return promise;
}

function makeBookPage(canvas, n) {
  const el = document.createElement('div');
  el.className = 'book-page';
  el.dataset.page = String(n);
  el.appendChild(cloneCanvas(canvas));
  const shade = document.createElement('div');
  shade.className = 'book-page-shade';
  el.appendChild(shade);
  return el;
}

/* A canvas can only live in one place in the DOM, so draw a copy */
function cloneCanvas(src) {
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  c.style.width = src.style.width;
  c.style.height = src.style.height;
  c.setAttribute('role', 'img');
  c.setAttribute('aria-label', src.getAttribute('aria-label') || '');
  c.getContext('2d').drawImage(src, 0, 0);
  return c;
}

/* dir: 0 = no animation, 1 = forward, -1 = backward */
async function pdfShowPage(n, dir) {
  if (!pdfReader.doc) return;
  n = Math.min(pdfReader.total, Math.max(1, n));
  const stage = document.getElementById('book-stage');
  if (!stage) return;
  const token = pdfReader.token;
  const size = bookPageSize();
  stage.style.width = `${size.w}px`;
  stage.style.height = `${size.h}px`;
  stage.classList.toggle('is-zoomed', pdfReader.zoom > 1);

  let canvas;
  try { canvas = await pdfCanvas(n); } catch (e) { return; }
  if (token !== pdfReader.token) return;

  const status = document.getElementById('pdf-status');
  if (status) status.remove();
  const current = stage.querySelector('.book-page.is-current');
  const next = makeBookPage(canvas, n);
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!current || !dir || reduce || pdfReader.zoom > 1) {
    stage.querySelectorAll('.book-page').forEach(el => el.remove());
    next.classList.add('is-current');
    stage.appendChild(next);
  } else if (dir > 0) {
    /* forward: the current page lifts from the right and turns over its left edge */
    next.classList.add('is-current', 'is-under');
    stage.insertBefore(next, current);
    current.classList.remove('is-current');
    current.classList.add('turn-forward');
    await waitAnimation(current, 520);
    current.remove();
    next.classList.remove('is-under');
  } else {
    /* backward: the previous page falls back onto the stack */
    next.classList.add('is-current', 'turn-back');
    stage.appendChild(next);
    current.classList.remove('is-current');
    await waitAnimation(next, 520);
    current.remove();
    next.classList.remove('turn-back');
  }

  pdfReader.page = n;
  updatePdfIndicator(n);
  /* prepare the neighbours so the next turn is instant */
  if (n < pdfReader.total) pdfCanvas(n + 1).catch(() => {});
  if (n > 1) pdfCanvas(n - 1).catch(() => {});
}

/* Bring the page itself under the header, so the reader sees a full page + controls */
function scrollBookIntoView() {
  const wrap = document.getElementById('book-stage-wrap');
  if (!wrap) return;
  const header = document.querySelector('.top-header');
  const headerH = header ? header.getBoundingClientRect().height : 64;
  const top = wrap.getBoundingClientRect().top + window.scrollY - headerH - 8;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function waitAnimation(el, fallbackMs) {
  return new Promise(resolve => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    el.addEventListener('animationend', finish, { once: true });
    setTimeout(finish, fallbackMs + 80);
  });
}

async function pdfTurn(dir) {
  if (!pdfReader.doc || pdfReader.turning) return;
  const target = pdfReader.page + dir;
  if (target < 1 || target > pdfReader.total) {
    const stage = document.getElementById('book-stage');
    if (stage) { stage.classList.remove('bump'); void stage.offsetWidth; stage.classList.add('bump'); }
    return;
  }
  pdfReader.turning = true;
  try { await pdfShowPage(target, dir); } finally { pdfReader.turning = false; }
}

function pdfJumpPrompt() {
  if (!pdfReader.doc) return;
  const v = prompt(`${t('goToPage')} (1–${pdfReader.total})`, String(pdfReader.page));
  const n = parseInt(v, 10);
  if (Number.isInteger(n)) pdfShowPage(n, 0);
}

function updatePdfIndicator(n) {
  const ind = document.getElementById('pdf-page-indicator');
  if (ind) ind.textContent = t('pageOf', { n, total: pdfReader.total || '…' });
  const fill = document.getElementById('book-progress-fill');
  if (fill && pdfReader.total) fill.style.width = `${(n / pdfReader.total) * 100}%`;
  if (pdfReader.bookId) {
    progressSaver.queue(pdfReader.bookId, 'read', pdfReader.lang, pdfReader.level, { page: n, position: 0 });
  }
}

function pdfZoom(dir) {
  const steps = [1, 1.5, 2, 2.5];
  const idx = Math.max(0, steps.indexOf(pdfReader.zoom));
  const next = steps[Math.min(steps.length - 1, Math.max(0, idx + dir))];
  if (next === pdfReader.zoom || !pdfReader.doc) return;
  pdfReader.zoom = next;
  pdfReader.cache.clear();
  pdfShowPage(pdfReader.page, 0);
}

/* Swipe to turn (only when not zoomed — then a drag pans the page) */
function setupBookGestures() {
  const wrap = document.getElementById('book-stage-wrap');
  if (!wrap) return;
  let x0 = 0, y0 = 0, t0 = 0, tracking = false;
  wrap.addEventListener('touchstart', e => {
    if (pdfReader.zoom > 1 || e.touches.length !== 1) { tracking = false; return; }
    tracking = true;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now();
  }, { passive: true });
  wrap.addEventListener('touchend', e => {
    if (!tracking) return;
    tracking = false;
    const tch = e.changedTouches[0];
    const dx = tch.clientX - x0, dy = tch.clientY - y0;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && Date.now() - t0 < 800) {
      e.preventDefault();
      pdfTurn(dx < 0 ? 1 : -1);
    }
  });
}

document.addEventListener('keydown', e => {
  if (state.currentScreen !== 'reader' || !pdfReader.doc) return;
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); pdfTurn(1); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); pdfTurn(-1); }
});

let bookResizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(bookResizeTimer);
  bookResizeTimer = setTimeout(() => {
    if (state.currentScreen === 'reader' && pdfReader.doc) { pdfReader.cache.clear(); pdfShowPage(pdfReader.page, 0); }
  }, 200);
});

/* ==========================================================================
   Audio player (custom controls over a native <audio>, Drive viewer as fallback)
   ========================================================================== */
const audioState = { key: '', bookId: null, lang: 'ru', level: 1, lastSave: 0, seeking: false };

function getAudioEl() {
  return document.getElementById('native-audio');
}

function loadAudio(book, lang, level) {
  const audio = getAudioEl();
  const raw = mediaUrl(book.audioUrls, lang, level);
  const direct = driveDirectUrl(raw);
  const key = `${book.id}|${lang}|${level}|${direct}`;
  const fallback = document.getElementById('audio-fallback');
  const custom = document.getElementById('custom-player');
  if (audioState.key === key) { updatePlayerUI(); return; }

  saveAudioPosition(true);
  audioState.key = key;
  audioState.bookId = book.id;
  audioState.lang = lang;
  audioState.level = level;

  if (fallback) { fallback.style.display = 'none'; fallback.innerHTML = ''; }
  if (custom) custom.style.display = 'block';

  if (!audio || !direct) { showAudioFallback(raw); return; }
  const saved = readLocalProgress(book.id, 'listen', lang, level);
  const startAt = (state.resumePosition && state.resumeBookId === book.id) ? state.resumePosition : (saved && saved.position) || 0;
  state.resumePosition = 0;

  audio.onerror = () => { if (audioState.key === key) showAudioFallback(raw); };
  audio.onloadedmetadata = () => {
    if (startAt > 5 && startAt < audio.duration - 5) {
      audio.currentTime = startAt;
      showToast(t('resumedAtTime', { t: formatTime(startAt) }));
    }
    updatePlayerUI();
  };
  audio.src = direct;
  audio.load();
  audio.playbackRate = state.playbackRate || 1;
  updatePlayerUI();
}

function showAudioFallback(raw) {
  const fallback = document.getElementById('audio-fallback');
  const custom = document.getElementById('custom-player');
  const embed = driveEmbedUrl(raw);
  if (custom) custom.style.display = 'none';
  if (fallback && embed) {
    fallback.style.display = 'block';
    fallback.innerHTML = `
      <div class="gdrive-player-box"><iframe src="${escapeHtml(embed)}" allow="autoplay" title="Audio"></iframe></div>
      <a class="btn-link" href="${escapeHtml(driveOpenUrl(raw))}" target="_blank" rel="noopener">${escapeHtml(t('openInDrive'))} ↗</a>`;
  }
}

function saveAudioPosition(force) {
  const audio = getAudioEl();
  if (!audio || !audioState.bookId || !audio.currentTime) return;
  const now = Date.now();
  if (!force && now - audioState.lastSave < 10000) return;
  audioState.lastSave = now;
  progressSaver.queue(audioState.bookId, 'listen', audioState.lang, audioState.level, { position: Math.floor(audio.currentTime), page: 1 });
}

function formatTime(sec) {
  sec = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = String(sec % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function setPlaybackRate(rate) {
  state.playbackRate = rate;
  const audio = getAudioEl();
  if (audio) audio.playbackRate = rate;
  document.querySelectorAll('.speed-btn').forEach(b => {
    const on = Number(b.dataset.rate) === rate;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function skipAudio(delta) {
  const audio = getAudioEl();
  if (audio && audio.duration) {
    audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + delta));
    updatePlayerUI();
  }
}

function toggleAudioPlay() {
  const audio = getAudioEl();
  if (!audio || !audio.getAttribute('src')) { openFullPlayer(); return; }
  if (audio.paused) audio.play().catch(() => showToast(t('audioError'), 'offline'));
  else audio.pause();
}

function onSeekInput(value) {
  const audio = getAudioEl();
  if (!audio || !audio.duration) return;
  audioState.seeking = true;
  const sec = (Number(value) / 1000) * audio.duration;
  const cur = document.getElementById('pl-current');
  if (cur) cur.textContent = formatTime(sec);
  setSeekFill(Number(value) / 10);
}

function onSeekChange(value) {
  const audio = getAudioEl();
  audioState.seeking = false;
  if (audio && audio.duration) audio.currentTime = (Number(value) / 1000) * audio.duration;
}

function setSeekFill(percent) {
  const seek = document.getElementById('pl-seek');
  if (seek) seek.style.setProperty('--fill', `${percent}%`);
}

const PLAY_ICON = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><path d="M8 5.14v13.72a1 1 0 0 0 1.5.86l11.04-6.86a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14z"/></svg>';
const PAUSE_ICON = '<svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/></svg>';

function updatePlayerUI() {
  const audio = getAudioEl();
  const playing = !!(audio && !audio.paused && !audio.ended);
  const big = document.getElementById('pl-play');
  if (big) {
    big.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
    big.setAttribute('aria-label', playing ? t('pause') : t('play'));
    big.classList.toggle('is-playing', playing);
  }
  const cover = document.getElementById('player-cover-box');
  if (cover) cover.classList.toggle('is-playing', playing);
  const mini = document.getElementById('mini-play-btn');
  if (mini) {
    mini.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
    mini.setAttribute('aria-label', playing ? t('pause') : t('play'));
  }
  if (!audio) return;
  const dur = audio.duration && isFinite(audio.duration) ? audio.duration : 0;
  const durEl = document.getElementById('pl-duration');
  if (durEl) durEl.textContent = dur ? formatTime(dur) : '0:00';
  if (!audioState.seeking) {
    const curEl = document.getElementById('pl-current');
    if (curEl) curEl.textContent = formatTime(audio.currentTime);
    const seek = document.getElementById('pl-seek');
    const pct = dur ? (audio.currentTime / dur) * 100 : 0;
    if (seek) seek.value = String(Math.round(pct * 10));
    setSeekFill(pct);
  }
  const fill = document.getElementById('mini-progress-fill');
  if (fill) fill.style.width = `${dur ? (audio.currentTime / dur) * 100 : 0}%`;
  const loading = document.getElementById('pl-loading');
  if (loading) loading.style.display = (audio.getAttribute('src') && audio.readyState < 2 && !audio.error) ? 'block' : 'none';
}

function updatePlayButtons() { updatePlayerUI(); }
function updateMiniProgress() { updatePlayerUI(); }

function setupAudioEvents() {
  const audio = getAudioEl();
  if (!audio) return;
  ['play', 'pause', 'ended', 'waiting', 'canplay', 'durationchange'].forEach(ev => audio.addEventListener(ev, () => {
    updatePlayerUI();
    if (ev === 'pause' || ev === 'ended') saveAudioPosition(true);
  }));
  audio.addEventListener('timeupdate', () => {
    updatePlayerUI();
    saveAudioPosition(false);
  });
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('seekbackward', () => skipAudio(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipAudio(15));
      navigator.mediaSession.setActionHandler('play', () => audio.play());
      navigator.mediaSession.setActionHandler('pause', () => audio.pause());
    } catch (e) {}
  }
}

function updateMediaSession(book, lang, level) {
  if (!('mediaSession' in navigator) || !window.MediaMetadata) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: L(book.title),
      artist: `${L(book.author)} · ${langName(lang)} · ${t('level' + level)}`,
      album: 'eLibrary',
      artwork: [{ src: resolveCover(book.cover), sizes: '512x512' }]
    });
  } catch (e) {}
}

function stopAudio() {
  const audio = getAudioEl();
  saveAudioPosition(true);
  if (audio) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
  }
  audioState.key = '';
  updatePlayerUI();
}
