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
    return id ? `${ELIB_CONFIG.supabaseUrl}/functions/v1/drive-file?id=${encodeURIComponent(id)}` : '';
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
   PDF reader
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
  baseRatio: 1.414,
  renderObserver: null,
  pageObserver: null,
  rendering: new Map()
};

function pdfDestroy() {
  pdfReader.token++;
  if (pdfReader.renderObserver) pdfReader.renderObserver.disconnect();
  if (pdfReader.pageObserver) pdfReader.pageObserver.disconnect();
  pdfReader.renderObserver = null;
  pdfReader.pageObserver = null;
  pdfReader.rendering.clear();
  try { if (pdfReader.task) pdfReader.task.destroy(); } catch (e) {}
  pdfReader.task = null;
  pdfReader.doc = null;
  pdfReader.key = '';
}

/* Opens `rawUrl` inside `host`. Returns false when the built-in reader cannot be used. */
async function openPdfReader(host, rawUrl, opts) {
  const direct = driveDirectUrl(rawUrl);
  const key = `${direct}|${opts.bookId}|${opts.lang}|${opts.level}`;
  if (pdfReader.key === key && pdfReader.doc && host.querySelector('.pdf-pages')) return true;
  pdfDestroy();
  if (!direct || !window.pdfjsLib) return false;

  const token = pdfReader.token;
  pdfReader.key = key;
  pdfReader.bookId = opts.bookId;
  pdfReader.lang = opts.lang;
  pdfReader.level = opts.level;
  pdfReader.zoom = 1;

  host.innerHTML = `
    <div class="pdf-toolbar" role="toolbar" aria-label="PDF">
      <button type="button" class="font-btn" onclick="pdfZoom(-1)" aria-label="${escapeHtml(t('zoomOut'))}">−</button>
      <span class="pdf-page-indicator" id="pdf-page-indicator" aria-live="polite">…</span>
      <button type="button" class="font-btn" onclick="pdfZoom(1)" aria-label="${escapeHtml(t('zoomIn'))}">+</button>
    </div>
    <div class="pdf-status" id="pdf-status">
      <div class="pdf-spinner" aria-hidden="true"></div>
      <span id="pdf-status-text">${escapeHtml(t('loadingBook'))}</span>
    </div>
    <div class="pdf-pages" id="pdf-pages"></div>`;

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
    pdfReader.baseRatio = vp.height / vp.width;

    const status = document.getElementById('pdf-status');
    if (status) status.remove();
    buildPdfPages();

    const saved = readLocalProgress(opts.bookId, 'read', opts.lang, opts.level);
    const startPage = Math.min(doc.numPages, Math.max(1, opts.startPage || (saved && saved.page) || 1));
    if (startPage > 1) {
      setTimeout(() => {
        const el = document.querySelector(`.pdf-page[data-page="${startPage}"]`);
        if (el) el.scrollIntoView({ block: 'start' });
        showToast(t('resumedAtPage', { n: startPage }));
      }, 150);
    }
    updatePdfIndicator(startPage);
    return true;
  } catch (err) {
    if (token !== pdfReader.token) return true;
    pdfReader.key = '';
    return false;
  }
}

function buildPdfPages() {
  const pagesEl = document.getElementById('pdf-pages');
  if (!pagesEl) return;
  pagesEl.style.setProperty('--pdf-zoom', pdfReader.zoom);
  let html = '';
  for (let i = 1; i <= pdfReader.total; i++) {
    html += `<div class="pdf-page" data-page="${i}" style="aspect-ratio: 1 / ${pdfReader.baseRatio.toFixed(4)}"><span class="pdf-page-num">${i}</span></div>`;
  }
  pagesEl.innerHTML = html;

  pdfReader.renderObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const n = Number(e.target.dataset.page);
      if (e.isIntersecting) renderPdfPage(e.target, n);
      else releasePdfPage(e.target, n);
    });
  }, { rootMargin: '1200px 0px' });

  pdfReader.pageObserver = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) updatePdfIndicator(Number(e.target.dataset.page), true); });
  }, { rootMargin: '-45% 0px -45% 0px' });

  pagesEl.querySelectorAll('.pdf-page').forEach(el => {
    pdfReader.renderObserver.observe(el);
    pdfReader.pageObserver.observe(el);
  });
}

async function renderPdfPage(el, n) {
  if (!pdfReader.doc || el.dataset.rendered === String(pdfReader.zoom) || pdfReader.rendering.has(n)) return;
  const token = pdfReader.token;
  pdfReader.rendering.set(n, true);
  try {
    const page = await pdfReader.doc.getPage(n);
    if (token !== pdfReader.token) return;
    const cssWidth = el.clientWidth || 600;
    const base = page.getViewport({ scale: 1 });
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: (cssWidth / base.width) * dpr });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.setAttribute('aria-label', `${t('page')} ${n}`);
    canvas.setAttribute('role', 'img');
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    if (token !== pdfReader.token) return;
    el.querySelectorAll('canvas').forEach(c => c.remove());
    el.appendChild(canvas);
    el.dataset.rendered = String(pdfReader.zoom);
  } catch (e) {
    /* page failed to render; leave placeholder */
  } finally {
    pdfReader.rendering.delete(n);
  }
}

function releasePdfPage(el) {
  if (!el.dataset.rendered) return;
  el.querySelectorAll('canvas').forEach(c => { c.width = 0; c.height = 0; c.remove(); });
  delete el.dataset.rendered;
}

function updatePdfIndicator(n, save) {
  pdfReader.page = n;
  const ind = document.getElementById('pdf-page-indicator');
  if (ind) ind.textContent = t('pageOf', { n, total: pdfReader.total || '…' });
  if (save && pdfReader.bookId) {
    progressSaver.queue(pdfReader.bookId, 'read', pdfReader.lang, pdfReader.level, { page: n, position: 0 });
  }
}

function pdfZoom(dir) {
  const steps = [1, 1.25, 1.5, 2, 2.5];
  const idx = steps.indexOf(pdfReader.zoom);
  const next = steps[Math.min(steps.length - 1, Math.max(0, (idx < 0 ? 0 : idx) + dir))];
  if (next === pdfReader.zoom) return;
  const keep = pdfReader.page;
  pdfReader.zoom = next;
  const pagesEl = document.getElementById('pdf-pages');
  if (!pagesEl) return;
  pagesEl.style.setProperty('--pdf-zoom', next);
  pagesEl.classList.toggle('is-zoomed', next > 1);
  pagesEl.querySelectorAll('.pdf-page').forEach(el => {
    releasePdfPage(el);
    pdfReader.renderObserver.unobserve(el);
    pdfReader.renderObserver.observe(el);
  });
  const target = pagesEl.querySelector(`.pdf-page[data-page="${keep}"]`);
  if (target) target.scrollIntoView({ block: 'start' });
}

/* ==========================================================================
   Audio player (native <audio>, Google Drive viewer as fallback)
   ========================================================================== */
const audioState = { key: '', bookId: null, lang: 'ru', level: 1, lastSave: 0 };

function getAudioEl() {
  return document.getElementById('native-audio');
}

function loadAudio(book, lang, level) {
  const audio = getAudioEl();
  const raw = mediaUrl(book.audioUrls, lang, level);
  const direct = driveDirectUrl(raw);
  const key = `${book.id}|${lang}|${level}|${direct}`;
  const fallback = document.getElementById('audio-fallback');
  const nativeBox = document.getElementById('native-audio-box');
  if (audioState.key === key) return;

  saveAudioPosition(true);
  audioState.key = key;
  audioState.bookId = book.id;
  audioState.lang = lang;
  audioState.level = level;

  if (fallback) { fallback.style.display = 'none'; fallback.innerHTML = ''; }
  if (nativeBox) nativeBox.style.display = 'block';

  if (!audio || !direct) {
    showAudioFallback(raw);
    return;
  }
  const saved = readLocalProgress(book.id, 'listen', lang, level);
  const startAt = (state.resumePosition && state.resumeBookId === book.id) ? state.resumePosition : (saved && saved.position) || 0;
  state.resumePosition = 0;

  audio.onerror = () => { if (audioState.key === key) showAudioFallback(raw); };
  audio.onloadedmetadata = () => {
    if (startAt > 5 && startAt < audio.duration - 5) {
      audio.currentTime = startAt;
      showToast(t('resumedAtTime', { t: formatTime(startAt) }));
    }
    updateMiniProgress();
  };
  audio.src = direct;
  audio.load();
  audio.playbackRate = state.playbackRate || 1;
  updatePlayButtons();
}

function showAudioFallback(raw) {
  const fallback = document.getElementById('audio-fallback');
  const nativeBox = document.getElementById('native-audio-box');
  const embed = driveEmbedUrl(raw);
  if (nativeBox) nativeBox.style.display = 'none';
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
  if (audio && audio.duration) audio.currentTime = Math.min(audio.duration, Math.max(0, audio.currentTime + delta));
}

function toggleAudioPlay() {
  const audio = getAudioEl();
  if (!audio || !audio.src) { openFullPlayer(); return; }
  if (audio.paused) audio.play().catch(() => openFullPlayer());
  else audio.pause();
}

function updatePlayButtons() {
  const audio = getAudioEl();
  const playing = !!(audio && !audio.paused && !audio.ended);
  const btn = document.getElementById('mini-play-btn');
  if (btn) {
    btn.innerHTML = playing
      ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>'
      : '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
    btn.setAttribute('aria-label', playing ? t('pause') : t('play'));
  }
}

function updateMiniProgress() {
  const audio = getAudioEl();
  const fill = document.getElementById('mini-progress-fill');
  if (fill && audio && audio.duration) fill.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
}

function setupAudioEvents() {
  const audio = getAudioEl();
  if (!audio) return;
  ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, () => {
    updatePlayButtons();
    if (ev !== 'play') saveAudioPosition(true);
  }));
  audio.addEventListener('timeupdate', () => {
    updateMiniProgress();
    saveAudioPosition(false);
  });
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('seekbackward', () => skipAudio(-15));
      navigator.mediaSession.setActionHandler('seekforward', () => skipAudio(15));
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
  updatePlayButtons();
}
