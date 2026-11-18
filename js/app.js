/* ==========================================================================
   eLibrary — application logic (UI, routing, auth, reader, admin)
   Data & permissions live in Supabase (see js/api.js); books and audio files
   live in Google Drive and are embedded with the Drive viewer.
   ========================================================================== */

const LANGS = ['ru', 'tg', 'en'];
const LEVELS = [1, 2, 3];
/* Language names shown in the current interface language (e.g. TG UI: Русӣ / Тоҷикӣ / Англисӣ) */
function langName(code) {
  return t('langName_' + code);
}
const AVATAR_CHOICES = ['АД', 'МН', 'ИЛ', 'ФК', 'СМ', 'ДТ', 'РШ', 'АН'];
const ROOT_ADMIN_EMAIL = 'admin@elibrary.com';

const STORAGE_KEYS = {
  CATALOG: 'elibrary_catalog_cache_v6',
  SETTINGS: 'elibrary_settings_v2'
};

let state = {
  books: [],
  categories: [],
  catalogLoaded: false,
  session: null,
  currentUser: null,      // profile row + email/provider
  bookmarks: [],          // rows from DB
  certificates: [],
  latestProgress: null,
  currentScreen: 'home',
  currentLang: 'ru',
  theme: 'light',
  fontSize: 18,
  selectedGenre: 'all',
  searchQuery: '',
  currentBook: null,
  mediaLang: 'ru',
  mediaLevel: 1,
  activeAudioBook: null,
  quizAnswers: {},
  authMode: 'login',
  adminTab: 'books',
  adminProfiles: [],
  lastLoggedPath: ''
};

/* ==========================================================================
   1. Helpers
   ========================================================================== */
function t(key, vars) {
  const dict = I18N[state.currentLang] || I18N.ru;
  let s = (dict[key] !== undefined) ? dict[key] : (I18N.ru[key] !== undefined ? I18N.ru[key] : key);
  if (vars) Object.keys(vars).forEach(k => { s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]); });
  return s;
}

/* Localized field with fallback: current language → ru → en → tg */
function L(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  return obj[state.currentLang] || obj.ru || obj.en || obj.tg || '';
}

/* Replace an element's content only when it really changed.
   Re-writing identical HTML would replay the entrance animations and redraw the
   3D canvases, which looks like the page "reloading" several times. After the
   first paint, later updates appear without the fly-in animation. */
function setHtml(el, html) {
  if (!el) return false;
  if (el.__html === html) return false;
  if (el.__html !== undefined) el.classList.add('no-enter-anim');
  el.__html = html;
  el.innerHTML = html;
  return true;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = String(url).trim();
  if (!/^https:\/\//i.test(trimmed)) return '';
  return trimmed;
}

function isAdmin() {
  return !!(state.currentUser && state.currentUser.role === 'admin');
}

function formatDate(iso) {
  const locale = { ru: 'ru-RU', tg: 'tg-TJ', en: 'en-GB' }[state.currentLang] || 'ru-RU';
  try { return new Date(iso).toLocaleDateString(locale); } catch (e) { return ''; }
}

function showToast(text, kind) {
  /* Focus reading: nothing pops up; held messages are counted for the summary */
  if (typeof focusHoldToast === 'function' && focusHoldToast()) return;
  const el = document.getElementById('net-toast');
  if (!el) return;
  el.textContent = text;
  el.className = 'net-toast show ' + (kind || '');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.className = 'net-toast ' + (kind || ''); }, 3200);
}

function friendlyError(err) {
  const msg = (err && (err.message || err.error_description || err.msg)) || String(err || '');
  if (/Invalid login credentials/i.test(msg)) return t('errInvalidLogin');
  if (/already registered|already been registered|User already exists/i.test(msg)) return t('errUserExists');
  if (/Email not confirmed/i.test(msg)) return t('errEmailNotConfirmed');
  if (/provider is not enabled|Unsupported provider/i.test(msg)) return t('errProviderDisabled');
  if (/Password should be|at least 6|weak/i.test(msg)) return t('errWeakPassword');
  if (/TOO_MANY_ATTEMPTS/.test(msg)) return t('quizTooMany');
  if (/NO_QUIZ/.test(msg)) return t('quizUnavailable');
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return t('errNetwork');
  if (/rate limit/i.test(msg)) return t('errRateLimit');
  return msg || t('errGeneric');
}

/* ---------- Google Drive links ---------- */
function extractGoogleDriveId(url) {
  if (!url) return null;
  const patterns = [/\/file\/d\/([a-zA-Z0-9_-]+)/, /[?&]id=([a-zA-Z0-9_-]+)/, /\/d\/([a-zA-Z0-9_-]+)/];
  for (const regex of patterns) {
    const m = url.match(regex);
    if (m && m[1]) return m[1];
  }
  return null;
}

/* Turns any Drive / Docs share link into an embeddable viewer URL */
function driveEmbedUrl(rawUrl) {
  const url = sanitizeUrl(rawUrl);
  if (!url) return '';
  const docs = url.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/);
  if (docs) return `https://docs.google.com/${docs[1]}/d/${docs[2]}/preview`;
  if (/google\.com/.test(url)) {
    const id = extractGoogleDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/preview`;
  }
  return url;
}

function driveOpenUrl(rawUrl) {
  const url = sanitizeUrl(rawUrl);
  if (!url) return '';
  if (/drive\.google\.com/.test(url)) {
    const id = extractGoogleDriveId(url);
    if (id) return `https://drive.google.com/file/d/${id}/view`;
  }
  return url;
}

function resolveCover(cover, fallback) {
  const fb = fallback || 'icons/icon-512.png';
  const url = sanitizeUrl(cover);
  if (!url) return fb;
  if (/drive\.google\.com/.test(url)) {
    const id = extractGoogleDriveId(url);
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w600`;
  }
  return url;
}

/* Media links are stored per language and per difficulty level:
   { ru: { "1": url, "2": url, "3": url }, tg: {...}, en: {...} }
   (a plain string per language is still accepted and treated as level 1) */
function langLevels(urls, lang) {
  const v = urls && urls[lang];
  if (!v) return {};
  if (typeof v === 'string') return sanitizeUrl(v) ? { 1: v } : {};
  const o = {};
  LEVELS.forEach(lv => { if (sanitizeUrl(v[lv])) o[lv] = v[lv]; });
  return o;
}

function availableLangs(urls) {
  return LANGS.filter(l => Object.keys(langLevels(urls, l)).length > 0);
}

function availableLevels(urls, lang) {
  const o = langLevels(urls, lang);
  return LEVELS.filter(lv => o[lv]);
}

function mediaUrl(urls, lang, level) {
  return langLevels(urls, lang)[level] || '';
}

function pickMediaLang(urls) {
  const langs = availableLangs(urls);
  if (langs.includes(state.mediaLang)) return state.mediaLang;
  if (langs.includes(state.currentLang)) return state.currentLang;
  return langs[0] || state.currentLang;
}

function pickLevel(urls, lang) {
  const lv = availableLevels(urls, lang);
  if (lv.includes(state.mediaLevel)) return state.mediaLevel;
  return lv[0] || 1;
}

/* Languages/levels offered on the book page = union of text and audio */
function bookLangs(b) {
  return LANGS.filter(l => availableLangs(b.textUrls).includes(l) || availableLangs(b.audioUrls).includes(l));
}

function bookLevels(b, lang) {
  return LEVELS.filter(lv => mediaUrl(b.textUrls, lang, lv) || mediaUrl(b.audioUrls, lang, lv));
}

function getCategories() {
  return state.categories;
}

function categoryName(id) {
  const g = state.categories.find(c => c.id === id);
  return g ? (L(g.name) || g.id) : '';
}

function findBook(id) {
  return state.books.find(b => b.id === id) || null;
}

function isBookmarked(bookId) {
  return state.bookmarks.some(b => b.book_id === bookId);
}

/* ==========================================================================
   2. Boot
   ========================================================================== */
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  applySettings();
  loadCatalogCache();
  setupOpticalLiquidScroll();
  setupCategoryPreviewDrag();
  setupAccessibility();
  setupNetworkStatusToast();
  setupAudioEvents();
  setupPasswordToggles();
  setupFocusMode();
  initHero3DCanvas();

  window.addEventListener('hashchange', route);
  route();

  if (state.firstVisit) {
    const m = document.getElementById('welcome-lang-modal');
    if (m) m.classList.add('open');
  }

  refreshCatalog();
  await initAuth();
});

/* First visit: the reader picks the interface language (also the default book/audio language) */
function chooseInitialLanguage(lang) {
  state.firstVisit = false;
  const m = document.getElementById('welcome-lang-modal');
  if (m) m.classList.remove('open');
  changeLanguage(lang);
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) state.firstVisit = true;
    if (raw) {
      const p = JSON.parse(raw);
      if (LANGS.includes(p.lang)) state.currentLang = p.lang;
      state.theme = p.theme === 'dark' ? 'dark' : 'light';
      state.fontSize = Number(p.fontSize) || 18;
    } else {
      const nav = (navigator.language || 'ru').slice(0, 2);
      if (nav === 'en') state.currentLang = 'en';
      if (nav === 'tg') state.currentLang = 'tg';
    }
  } catch (e) {}
  state.mediaLang = state.currentLang;
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      lang: state.currentLang, theme: state.theme, fontSize: state.fontSize
    }));
  } catch (e) {}
}

function loadCatalogCache() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOG);
    if (raw) {
      const c = JSON.parse(raw);
      state.categories = Array.isArray(c.categories) ? c.categories : [];
      state.books = Array.isArray(c.books) ? c.books : [];
    }
  } catch (e) {}
}

async function refreshCatalog() {
  try {
    const data = await api.fetchCatalog();
    state.categories = data.categories;
    state.books = data.books;
    state.catalogLoaded = true;
    try {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify({ ...data, ts: Date.now() }));
    } catch (e) {}
    renderAll();
    renderCurrentScreen();
    checkSavedProgressBanner();
  } catch (e) {
    state.catalogLoaded = true;
    renderAll();
    if (!navigator.onLine) showToast(t('offlineMode'), 'offline');
  }
}

async function forceRefreshFromServer() {
  if ('serviceWorker' in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.update();
    } catch (e) {}
  }
  await refreshCatalog();
  if (state.currentUser) await loadUserData();
  showToast(t('synced'), 'online');
}

/* ==========================================================================
   3. Authentication (Supabase: Google, Apple, Email + password)
   ========================================================================== */
async function initAuth() {
  sb.auth.onAuthStateChange((event, session) => {
    /* Defer DB calls out of the auth callback (recommended by supabase-js) */
    setTimeout(() => handleAuthChange(event, session), 0);
  });
  const { data } = await sb.auth.getSession();
  await handleAuthChange('INITIAL', data.session);
  cleanAuthParamsFromUrl();
}

function cleanAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  let changed = false;
  ['code', 'error', 'error_code', 'error_description', 'state'].forEach(p => {
    if (url.searchParams.has(p)) {
      if (p === 'error_description') showToast(url.searchParams.get(p), 'offline');
      url.searchParams.delete(p);
      changed = true;
    }
  });
  if (changed) history.replaceState(null, '', url.pathname + url.search + url.hash);
}

let authHandling = Promise.resolve();
function handleAuthChange(event, session) {
  authHandling = authHandling.then(() => applySession(event, session)).catch(() => {});
  return authHandling;
}

async function applySession(event, session) {
  const prevId = state.currentUser ? state.currentUser.id : null;
  state.session = session;

  if (event === 'PASSWORD_RECOVERY') {
    showToast(t('setNewPassword'));
    setTimeout(openEditProfileModal, 400);
  }

  if (!session || !session.user) {
    state.currentUser = null;
    state.bookmarks = [];
    state.certificates = [];
    state.latestProgress = null;
    renderAll();
    renderCurrentScreen();
    checkSavedProgressBanner();
    return;
  }

  if (prevId === session.user.id && event === 'TOKEN_REFRESHED') return;

  try {
    let profile = await api.fetchProfile(session.user.id);
    if (!profile) {
      /* Trigger may lag a moment right after sign-up */
      await new Promise(r => setTimeout(r, 800));
      profile = await api.fetchProfile(session.user.id);
    }
    const provider = (session.user.app_metadata && session.user.app_metadata.provider) || 'email';
    state.currentUser = {
      ...(profile || { id: session.user.id, name: session.user.email, role: 'reader', avatar: '' }),
      email: session.user.email,
      provider
    };
    const act = await api.touchActivity();
    if (act && act.streak) state.currentUser.streak_count = act.streak;
  } catch (e) {
    state.currentUser = { id: session.user.id, email: session.user.email, name: session.user.email, role: 'reader', avatar: '', provider: 'email' };
  }

  if (prevId !== state.currentUser.id) {
    await loadUserData();
    if (event === 'SIGNED_IN') showToast(t('welcome', { name: state.currentUser.name || '' }), 'online');
  }
  closeAuthModal();
  renderAll();
  renderCurrentScreen();
}

async function loadUserData() {
  try {
    const [bm, certs, prog] = await Promise.all([
      api.fetchBookmarks(), api.fetchCertificates(), api.fetchLatestProgress()
    ]);
    state.bookmarks = bm || [];
    state.certificates = certs || [];
    state.latestProgress = prog;
  } catch (e) {}
  checkSavedProgressBanner();
}

function openAuthModal(mode) {
  setAuthMode(mode || 'login');
  document.getElementById('auth-modal').classList.add('open');
  setTimeout(() => { const el = document.getElementById('auth-email'); if (el) el.focus(); }, 80);
}

function closeAuthModal() {
  const m = document.getElementById('auth-modal');
  if (m) m.classList.remove('open');
  const pw = document.getElementById('auth-password');
  if (pw && pw.type !== 'password') {
    pw.type = 'password';
    const eye = pw.parentNode.querySelector('.password-eye');
    if (eye) eye.click(), eye.click();
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  const isReg = mode === 'register';
  document.getElementById('auth-name-group').style.display = isReg ? 'block' : 'none';
  document.getElementById('auth-tab-login').classList.toggle('active', !isReg);
  document.getElementById('auth-tab-register').classList.toggle('active', isReg);
  document.getElementById('auth-tab-login').setAttribute('aria-selected', String(!isReg));
  document.getElementById('auth-tab-register').setAttribute('aria-selected', String(isReg));
  document.getElementById('auth-submit-label').textContent = isReg ? t('authRegisterBtn') : t('authLoginBtn');
  document.getElementById('auth-forgot-btn').style.display = isReg ? 'none' : 'inline';
  document.getElementById('auth-password').setAttribute('autocomplete', isReg ? 'new-password' : 'current-password');
  setAuthMessage('');
}

function setAuthMessage(text, kind) {
  const el = document.getElementById('auth-message');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'auth-message ' + (kind || '');
}

function setAuthBusy(busy) {
  document.querySelectorAll('#auth-modal button').forEach(b => { b.disabled = busy; });
}

async function handleEmailAuth(event) {
  event.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const name = document.getElementById('auth-name').value.trim();
  if (!email || !password) return;

  setAuthBusy(true);
  setAuthMessage(t('pleaseWait'));
  try {
    if (state.authMode === 'register') {
      if (password.length < 8) throw new Error(t('errWeakPassword'));
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { name: name || email.split('@')[0] }, emailRedirectTo: ELIB_CONFIG.siteUrl }
      });
      if (error) throw error;
      if (!data.session) {
        setAuthMessage(t('checkEmailConfirm'), 'ok');
        return;
      }
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
    document.getElementById('auth-password').value = '';
  } catch (err) {
    setAuthMessage(friendlyError(err), 'error');
  } finally {
    setAuthBusy(false);
  }
}

async function handleOAuthSignIn(provider) {
  try {
    const redirectTo = window.location.origin + window.location.pathname;
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) throw error;
  } catch (err) {
    const msg = friendlyError(err);
    setAuthMessage(msg, 'error');
    showToast(msg, 'offline');
  }
}

function handleGoogleSignIn() { handleOAuthSignIn('google'); }
function handleAppleSignIn() { handleOAuthSignIn('apple'); }

async function handleForgotPassword() {
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  if (!email) {
    setAuthMessage(t('enterEmailFirst'), 'error');
    return;
  }
  try {
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: ELIB_CONFIG.siteUrl });
    if (error) throw error;
    setAuthMessage(t('resetSent'), 'ok');
  } catch (err) {
    setAuthMessage(friendlyError(err), 'error');
  }
}

async function handleLogout() {
  await sb.auth.signOut();
  navigate('home');
}

/* ---------- Profile ---------- */
function openEditProfileModal() {
  if (!state.currentUser) return;
  const u = state.currentUser;
  document.getElementById('profile-name-input').value = u.name || '';
  document.getElementById('profile-avatar-input').value = u.avatar || '';
  document.getElementById('profile-password-input').value = '';
  const pwGroup = document.getElementById('profile-password-group');
  if (pwGroup) pwGroup.style.display = (u.provider === 'email') ? 'block' : 'none';

  const picker = document.getElementById('avatar-picker');
  if (picker) {
    picker.innerHTML = AVATAR_CHOICES.map(av => `
      <button type="button" class="avatar-choice ${u.avatar === av ? 'selected' : ''}" onclick="selectAvatarOption('${av}')" aria-label="${av}">${av}</button>
    `).join('');
  }
  document.getElementById('profile-edit-modal').classList.add('open');
}

function selectAvatarOption(av) {
  document.getElementById('profile-avatar-input').value = av;
  document.querySelectorAll('.avatar-choice').forEach(el => el.classList.toggle('selected', el.textContent === av));
}

function closeEditProfileModal() {
  document.getElementById('profile-edit-modal').classList.remove('open');
}

async function handleSaveProfile(event) {
  event.preventDefault();
  if (!state.currentUser) return;
  const name = document.getElementById('profile-name-input').value.trim().slice(0, 80);
  const avatar = document.getElementById('profile-avatar-input').value.trim().slice(0, 300);
  const newPass = document.getElementById('profile-password-input').value;
  try {
    await api.updateProfile(state.currentUser.id, { name, avatar });
    state.currentUser.name = name;
    state.currentUser.avatar = avatar;
    if (newPass) {
      if (newPass.length < 8) throw new Error(t('errWeakPassword'));
      const { error } = await sb.auth.updateUser({ password: newPass });
      if (error) throw error;
    }
    closeEditProfileModal();
    renderAll();
    showToast(t('saved'), 'online');
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

/* ==========================================================================
   4. Routing (shareable hash URLs: #/book/<id>, #/verify/<code> …)
   ========================================================================== */
const SCREENS = ['home', 'categories', 'bookmarks', 'stats', 'settings', 'admin',
  'book-detail', 'reader', 'player', 'verify', 'about', 'privacy'];

function buildHash(screen, param) {
  switch (screen) {
    case 'home': return '#/';
    case 'book-detail': return `#/book/${param || (state.currentBook && state.currentBook.id) || ''}`;
    case 'reader': return `#/read/${param || (state.currentBook && state.currentBook.id) || ''}`;
    case 'player': return `#/listen/${param || ((state.activeAudioBook || state.currentBook) || {}).id || ''}`;
    case 'categories': return param ? `#/category/${param}` : '#/categories';
    case 'verify': return param ? `#/verify/${encodeURIComponent(param)}` : '#/verify';
    default: return `#/${screen}`;
  }
}

function navigate(screen, param) {
  const hash = buildHash(screen, param);
  if (window.location.hash === hash) route();
  else window.location.hash = hash;
}

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  const [seg, ...rest] = raw.split('/');
  const param = rest.length ? decodeURIComponent(rest.join('/')) : '';
  const map = { '': 'home', book: 'book-detail', read: 'reader', listen: 'player', category: 'categories' };
  const screen = map[seg] !== undefined ? map[seg] : seg;
  return { screen: SCREENS.includes(screen) ? screen : 'home', param };
}

function route() {
  const { screen, param } = parseHash();

  if (screen === 'admin' && !isAdmin()) {
    /* Session may still be loading — wait for it before refusing */
    authHandling.then(() => {
      if (parseHash().screen !== 'admin') return;
      if (isAdmin()) showScreen('admin', param);
      else { showToast(t('accessDenied'), 'offline'); navigate('settings'); }
    });
    return;
  }

  if (['book-detail', 'reader', 'player'].includes(screen)) {
    const book = findBook(param);
    if (!book) {
      if (!state.catalogLoaded) {
        showScreen('book-detail', param);
        document.getElementById('book-detail-content').innerHTML = `<p class="muted-text">${t('loading')}</p>`;
        return;
      }
      showScreen('book-detail', param);
      document.getElementById('book-detail-content').innerHTML = `<div class="empty-state soft-gradient-card"><p>${t('bookNotFound')}</p></div>`;
      return;
    }
    if (state.currentBook !== book) state.mediaLang = state.currentLang;
    state.currentBook = book;
    if (screen === 'player') state.activeAudioBook = book;
  }

  showScreen(screen, param);
}

function showScreen(screen, param) {
  if (state.currentScreen === 'reader' && screen !== 'reader') {
    if (typeof isFocusMode === 'function' && isFocusMode()) exitFocusMode();
    progressSaver.flush();
    pdfDestroy();
  }
  state.currentScreen = screen;
  state.routeParam = param || '';
  document.body.classList.toggle('on-player', screen === 'player');
  document.body.classList.toggle('on-reader', screen === 'reader');

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screen}`);
  if (target) {
    const switched = !target.classList.contains('active') || state.lastShownScreen !== screen;
    target.classList.add('active');
    target.__revealAgain = switched && state.lastShownScreen !== undefined;
    triggerSequentialTextReveal(target);
    target.__revealAgain = false;
  }
  state.lastShownScreen = screen;
  updateLiquidNavIndicators(screen);

  const globalBack = document.getElementById('global-back-btn');
  if (globalBack) globalBack.style.display = (screen === 'home') ? 'none' : 'inline-flex';

  renderCurrentScreen();
  updateDocumentTitle();
  logPageView();
  window.scrollTo({ top: 0, behavior: 'auto' });
  const main = document.getElementById('main-scroll');
  if (main) main.focus({ preventScroll: true });
}

function renderCurrentScreen() {
  const s = state.currentScreen;
  const p = state.routeParam;
  if (s === 'home') renderHome();
  else if (s === 'categories') { renderCategoriesScreen(); if (p) selectCategoryCard(p, true); else clearCategorySelection(); }
  else if (s === 'bookmarks') renderBookmarksScreen();
  else if (s === 'stats') renderStatsScreen();
  else if (s === 'settings') renderSettingsScreen();
  else if (s === 'admin' && isAdmin()) renderAdminScreen();
  else if (s === 'book-detail' && state.currentBook) renderBookDetail();
  else if (s === 'reader' && state.currentBook) renderReaderScreen();
  else if (s === 'player' && state.currentBook) renderFullPlayerScreen();
  else if (s === 'verify') renderVerifyScreen(p);
  else if (s === 'about' || s === 'privacy') renderInfoScreen(s);
}

function updateDocumentTitle() {
  let title = 'eLibrary — ' + t('heroTitle');
  const s = state.currentScreen;
  if (['book-detail', 'reader', 'player'].includes(s) && state.currentBook) {
    title = `${L(state.currentBook.title)} — eLibrary`;
  } else if (s === 'about') title = `${t('aboutTitle')} — eLibrary`;
  else if (s === 'privacy') title = `${t('privacyTitle')} — eLibrary`;
  else if (s === 'verify') title = `${t('verifyTitle')} — eLibrary`;
  document.title = title;
}

function logPageView() {
  if (state.currentScreen === 'admin') return;
  const path = (window.location.hash || '#/').slice(0, 200);
  if (path === state.lastLoggedPath) return;
  state.lastLoggedPath = path;
  if (navigator.onLine) api.logPageView(path, state.currentLang);
}

function handleScreenBack() {
  const s = state.currentScreen;
  if ((s === 'reader' || s === 'player') && state.currentBook) {
    navigate('book-detail', state.currentBook.id);
    return;
  }
  if (history.length > 1) history.back();
  else navigate('home');
}

function handleGlobalBack() { handleScreenBack(); }

/* Sliding glass indicators in sidebar & bottom dock */
function updateLiquidNavIndicators(screenName) {
  const navOrder = ['home', 'categories', 'bookmarks', 'stats', 'settings'];
  let activeIdx = navOrder.indexOf(screenName);
  if (activeIdx === -1) {
    if (['admin', 'about', 'privacy', 'verify'].includes(screenName)) activeIdx = 4;
    else activeIdx = 0;
  }
  const activeKey = navOrder[activeIdx];

  document.querySelectorAll('.nav-item, .mob-nav-btn').forEach(el => {
    el.classList.remove('active');
    el.removeAttribute('aria-current');
  });
  const sideBtn = document.getElementById(`nav-${activeKey}`);
  const mobBtn = document.getElementById(`mob-${activeKey}`);
  [sideBtn, mobBtn].forEach(b => { if (b) { b.classList.add('active'); b.setAttribute('aria-current', 'page'); } });

  const dockIndicator = document.getElementById('dock-liquid-indicator');
  if (dockIndicator) {
    const prevIdx = Number(dockIndicator.dataset.idx || 0);
    dockIndicator.style.transform = `translate3d(${activeIdx * 100}%, 0, 0)`;
    dockIndicator.dataset.idx = String(activeIdx);
    if (prevIdx !== activeIdx) {
      const pillGlass = dockIndicator.firstElementChild;
      if (pillGlass) {
        pillGlass.classList.remove('stretch');
        void pillGlass.offsetWidth;
        pillGlass.classList.add('stretch');
      }
    }
    /* the "pop" plays only when the user actually moves to another tab */
    if (mobBtn && prevIdx !== activeIdx) {
      mobBtn.classList.remove('tap-pop');
      void mobBtn.offsetWidth;
      mobBtn.classList.add('tap-pop');
    }
  }
  const sidebarIndicator = document.getElementById('sidebar-liquid-indicator');
  if (sidebarIndicator) sidebarIndicator.style.transform = `translate3d(0, ${activeIdx * 48}px, 0)`;
}

function triggerSequentialTextReveal(container) {
  if (!container) return;
  container.querySelectorAll('.text-reveal').forEach(h => {
    const rawText = h.getAttribute('data-raw-text') || h.textContent.trim();
    /* same heading, same text, still on screen → don't replay the word animation */
    if (h.dataset.revealed === rawText && !container.__revealAgain) return;
    h.dataset.revealed = rawText;
    h.setAttribute('data-raw-text', rawText);
    h.setAttribute('aria-label', rawText);
    h.innerHTML = rawText.split(/\s+/).map((word, idx) =>
      `<span class="char-unit" aria-hidden="true" style="--char-i:${idx}">${escapeHtml(word)}</span>`
    ).join(' ');
  });
}

/* ==========================================================================
   5. Settings: language, theme, font
   ========================================================================== */
function applySettings() {
  document.documentElement.setAttribute('data-theme', state.theme);
  document.documentElement.setAttribute('lang', state.currentLang === 'tg' ? 'tg' : state.currentLang);
  document.documentElement.style.setProperty('--font-size-reader', `${state.fontSize}px`);

  ['lang-select', 'settings-lang-select'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = state.currentLang;
  });

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.getAttribute('data-i18n'));
    el.textContent = val;
    if (el.classList.contains('text-reveal')) el.setAttribute('data-raw-text', val);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder')));
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const v = t(el.getAttribute('data-i18n-aria'));
    el.setAttribute('aria-label', v);
    el.setAttribute('title', v);
  });

  const activeScreen = document.querySelector('.screen.active');
  if (activeScreen) triggerSequentialTextReveal(activeScreen);
}

function toggleTheme() { setTheme(state.theme === 'dark' ? 'light' : 'dark'); }

function setTheme(themeName) {
  state.theme = themeName;
  saveSettings();
  applySettings();
  if (state.currentScreen === 'settings') renderSettingsScreen();
}

function changeLanguage(lang) {
  if (!LANGS.includes(lang)) return;
  state.currentLang = lang;
  state.mediaLang = lang;
  saveSettings();
  applySettings();
  if (document.getElementById('auth-modal').classList.contains('open')) setAuthMode(state.authMode);
  renderAll();
  renderCurrentScreen();
  updateDocumentTitle();
}

function adjustFontSize(delta) {
  state.fontSize = Math.min(26, Math.max(14, state.fontSize + delta));
  saveSettings();
  applySettings();
  const label = document.getElementById('settings-font-size');
  if (label) label.textContent = `${state.fontSize}px`;
}

/* ==========================================================================
   6. Shared rendering
   ========================================================================== */
function renderAll() {
  populateGenreSelectDropdown();
  renderHeaderUser();
  renderHome();
  if (state.currentScreen === 'categories') renderCategoriesScreen();
  updateLiquidNavIndicators(state.currentScreen);
}

function populateGenreSelectDropdown() {
  const sel = document.getElementById('form-genre');
  if (!sel) return;
  const currentVal = sel.value;
  sel.innerHTML = getCategories().map(c =>
    `<option value="${escapeHtml(c.id)}">${escapeHtml(L(c.name) || c.id)}</option>`
  ).join('');
  if (currentVal && getCategories().some(c => c.id === currentVal)) sel.value = currentVal;
}

function avatarHtml(u) {
  const av = u.avatar || '';
  if (/^https:\/\//.test(av)) {
    return `<img src="${escapeHtml(av)}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
  }
  return escapeHtml((av || u.name || u.email || 'U').slice(0, 2).toUpperCase());
}

function renderHeaderUser() {
  const streakPill = document.getElementById('header-streak');
  const streakEl = document.getElementById('streak-days-text');
  if (streakPill) streakPill.style.display = state.currentUser ? 'inline-flex' : 'none';
  if (streakEl && state.currentUser) streakEl.textContent = t('daysShort', { n: state.currentUser.streak_count || 1 });

  const admin = isAdmin();
  /* admin-only controls are shown with CSS, so cards don't need rebuilding */
  document.body.classList.toggle('is-admin', admin);
  ['home-add-cat-btn', 'cats-add-cat-btn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = admin ? 'inline-flex' : 'none';
  });

  const zone = document.getElementById('header-user-zone');
  if (!zone) return;
  if (state.currentUser) {
    const u = state.currentUser;
    setHtml(zone, `
      <button type="button" class="streak-pill liquid-glass-btn user-pill" onclick="navigate('settings')" aria-label="${escapeHtml(t('navSettings'))}: ${escapeHtml(u.name || u.email)}">
        <span class="user-pill-avatar">${avatarHtml(u)}</span>
        <span class="user-pill-name">${escapeHtml(u.name || '')}</span>
        ${admin ? '<span class="badge badge-admin user-pill-badge">Admin</span>' : ''}
      </button>`);
  } else {
    setHtml(zone, `<button class="btn-primary btn-sm" onclick="openAuthModal()">${escapeHtml(t('signIn'))}</button>`);
  }
}

function getCategoryImageTransformStyle(g) {
  const px = Number(g.panX) || 0;
  const py = Number(g.panY) || 0;
  const sc = Number(g.scale) || 1;
  if ((g.displayMode || 'full') === 'full') {
    return `transform: translate3d(calc(-50% + ${px}px), calc(-50% + ${py}px), 0) scale(${sc});`;
  }
  return `transform: translate3d(${px}px, ${py}px, 0) scale(${sc});`;
}

function create3DCategoryCardHtml(g, idx, clickFn) {
  const count = state.books.filter(b => b.genre === g.id).length;
  const label = L(g.name) || g.id;
  const hasCustomImg = !!sanitizeUrl(g.customImage) || /^data:image\//.test(g.customImage || '');
  const modeClass = (g.displayMode === 'object') ? 'mode-object' : 'mode-full';
  const glow = /^rgba?\([\d\s.,]+\)$/.test(g.glow || '') ? g.glow : 'rgba(138, 92, 246, 0.34)';
  const id = escapeHtml(g.id);

  return `
    <div class="cat-3d-card stagger-item" role="button" tabindex="0" aria-label="${escapeHtml(label)}: ${count}" style="--i:${idx}; --cat-glow:${glow};" onclick="${clickFn}('${id}')">
      <div class="cat-3d-header">
        <div class="cat-3d-title">${escapeHtml(label)}</div>
        <div class="cat-header-right">
          <button type="button" class="cat-edit-btn admin-only" aria-label="${escapeHtml(t('editCategory'))}" title="${escapeHtml(t('editCategory'))}" onclick="event.stopPropagation(); openCategoryEditorModal('${id}')">✎</button>
          <span class="cat-3d-count">${count}</span>
        </div>
      </div>
      ${hasCustomImg ? `
        <div class="cat-custom-img-layer ${modeClass}">
          <img src="${escapeHtml(g.customImage)}" alt="" style="${getCategoryImageTransformStyle(g)}" draggable="false" loading="lazy">
        </div>
      ` : `
        <div class="cat-3d-stage" aria-hidden="true">
          <canvas class="cat-3d-canvas" data-genre="${id}" width="154" height="154"></canvas>
        </div>
      `}
    </div>`;
}

function createBookCardHtml(book, idx = 0) {
  const title = L(book.title);
  const hasAudio = availableLangs(book.audioUrls).length > 0;
  const hasText = availableLangs(book.textUrls).length > 0;
  const langs = Array.from(new Set([...availableLangs(book.textUrls), ...availableLangs(book.audioUrls)]));
  const cover = resolveCover(book.cover);

  return `
    <article class="book-card soft-gradient-card stagger-item" role="button" tabindex="0" aria-label="${escapeHtml(title)}" style="--i:${idx};" onclick="navigate('book-detail','${book.id}')">
      <div class="book-cover">
        <img src="${escapeHtml(cover)}" class="book-cover-img" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='icons/icon-512.png';">
        ${hasAudio ? `<span class="book-type-badge liquid-glass-btn">${escapeHtml(t('audioBadge'))}</span>` : ''}
        ${!book.published ? `<span class="book-type-badge book-draft-badge">${escapeHtml(t('draft'))}</span>` : ''}
      </div>
      <div class="book-info">
        <span class="book-category">${escapeHtml(categoryName(book.genre))}</span>
        <h3 class="book-title">${escapeHtml(title)}</h3>
        <p class="book-author">${escapeHtml(L(book.author))}</p>
        <div class="book-lang-row" aria-label="${escapeHtml(t('languages'))}">
          ${langs.map(l => `<span class="lang-mini">${l.toUpperCase()}</span>`).join('')}
          ${hasText ? '' : ''}
        </div>
      </div>
    </article>`;
}

/* ==========================================================================
   7. Home & categories
   ========================================================================== */
function renderHome() {
  const cats = getCategories();

  const homeCatGrid = document.getElementById('home-categories-3d-grid');
  if (homeCatGrid) {
    if (setHtml(homeCatGrid, cats.slice(0, 6).map((g, i) => create3DCategoryCardHtml(g, i, 'openCategoryFromHome')).join(''))) {
      renderAll3DCategoryCanvases(homeCatGrid);
    }
  }

  const pills = document.getElementById('home-genre-pills');
  if (pills) {
    let html = `<button class="genre-pill ${state.selectedGenre === 'all' ? 'active' : ''}" aria-pressed="${state.selectedGenre === 'all'}" onclick="selectGenreFilter('all')">${escapeHtml(t('filterAll'))}</button>`;
    cats.forEach(g => {
      const active = state.selectedGenre === g.id;
      html += `<button class="genre-pill ${active ? 'active' : ''}" aria-pressed="${active}" onclick="selectGenreFilter('${escapeHtml(g.id)}')">${escapeHtml(L(g.name) || g.id)}</button>`;
    });
    setHtml(pills, html);
  }

  const grid = document.getElementById('home-books-grid');
  const emptyState = document.getElementById('home-empty-state');
  const emptyActionBtn = document.getElementById('home-empty-action');
  if (!grid || !emptyState) return;

  if (emptyActionBtn) emptyActionBtn.style.display = isAdmin() ? 'inline-flex' : 'none';

  let filtered = state.books;
  if (state.selectedGenre !== 'all') filtered = filtered.filter(b => b.genre === state.selectedGenre);
  const q = state.searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(b => {
      const hay = [...Object.values(b.title || {}), ...Object.values(b.author || {})].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  if (filtered.length === 0) {
    setHtml(grid, '');
    emptyState.style.display = 'block';
    const title = document.getElementById('home-empty-title');
    const desc = document.getElementById('home-empty-desc');
    if (!state.catalogLoaded && state.books.length === 0) {
      if (title) title.textContent = t('loading');
      if (desc) desc.textContent = '';
    } else if (q || state.selectedGenre !== 'all') {
      if (title) title.textContent = t('noResultsTitle');
      if (desc) desc.textContent = t('noResultsDesc');
    } else {
      if (title) title.textContent = t('emptyLibraryTitle');
      if (desc) desc.textContent = isAdmin() ? t('emptyLibraryAdmin') : t('emptyLibraryDesc');
    }
    return;
  }
  emptyState.style.display = 'none';
  setHtml(grid, filtered.map((b, i) => createBookCardHtml(b, i)).join(''));
}

function openCategoryFromHome(genreId) { navigate('categories', genreId); }

function selectGenreFilter(genreId) {
  state.selectedGenre = genreId;
  renderHome();
}

function handleSearch(val) {
  state.searchQuery = val;
  if (state.currentScreen !== 'home') navigate('home');
  else renderHome();
}

function handleEmptyStateAction() {
  if (isAdmin()) {
    navigate('admin');
    setTimeout(openAddBookTab, 50);
  }
}

function renderCategoriesScreen() {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  if (setHtml(grid, getCategories().map((g, i) => create3DCategoryCardHtml(g, i, 'selectCategoryCard')).join(''))) {
    renderAll3DCategoryCanvases(grid);
  }
}

function selectCategoryCard(genreId, fromRoute) {
  if (!fromRoute) { navigate('categories', genreId); return; }
  const wrap = document.getElementById('category-filtered-results');
  const title = document.getElementById('selected-category-title');
  const grid = document.getElementById('category-books-grid');
  if (!wrap || !grid) return;
  if (title) title.textContent = categoryName(genreId) || genreId;
  const list = state.books.filter(b => b.genre === genreId);
  wrap.style.display = 'block';
  grid.innerHTML = list.length === 0
    ? `<p class="muted-text" style="grid-column: 1/-1; padding: 16px 0;">${escapeHtml(t('categoryEmpty'))}</p>`
    : list.map((b, i) => createBookCardHtml(b, i)).join('');
  setTimeout(() => wrap.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
}

function clearCategorySelection() {
  const wrap = document.getElementById('category-filtered-results');
  if (wrap) wrap.style.display = 'none';
  if (state.currentScreen === 'categories' && state.routeParam) navigate('categories');
}

/* ==========================================================================
   8. Book detail, reader (Google Drive), audio, quiz & certificates
   ========================================================================== */
function chipGroupHtml(label, items, current, onPick) {
  return `
    <div class="chip-group">
      <span class="chip-group-label">${escapeHtml(label)}</span>
      <div class="lang-chips" role="group" aria-label="${escapeHtml(label)}">
        ${items.map(it => `<button type="button" class="lang-chip ${it.value === current ? 'active' : ''}" aria-pressed="${it.value === current}" onclick="${onPick}(${JSON.stringify(it.value).replace(/"/g, '&quot;')})">${escapeHtml(it.label)}</button>`).join('')}
      </div>
    </div>`;
}

/* Language + difficulty selectors. `langs`/`levelsFor` decide what is offered. */
function mediaPickerHtml(langs, levelsFor, lang, level, onLang, onLevel) {
  if (!langs.length) return '';
  const levels = levelsFor(lang);
  return `<div class="media-picker">
    ${chipGroupHtml(t('chooseLanguage'), langs.map(l => ({ value: l, label: langName(l) })), lang, onLang)}
    ${levels.length ? chipGroupHtml(t('chooseLevel'), levels.map(lv => ({ value: lv, label: t('level' + lv) })), level, onLevel) : ''}
  </div>`;
}

/* Resolve the language/level to use on the book page */
function resolveBookSelection(b) {
  const langs = bookLangs(b);
  let lang = langs.includes(state.mediaLang) ? state.mediaLang : (langs.includes(state.currentLang) ? state.currentLang : (langs[0] || state.currentLang));
  const levels = bookLevels(b, lang);
  const level = levels.includes(state.mediaLevel) ? state.mediaLevel : (levels[0] || 1);
  state.mediaLang = lang;
  state.mediaLevel = level;
  return { langs, lang, level };
}

function setDetailLang(lang) { state.mediaLang = lang; renderBookDetail(); }
function setDetailLevel(level) { state.mediaLevel = Number(level) || 1; renderBookDetail(); }

function renderBookDetail() {
  const b = state.currentBook;
  const container = document.getElementById('book-detail-content');
  if (!b || !container) return;

  const textLangs = availableLangs(b.textUrls);
  const audioLangs = availableLangs(b.audioUrls);
  const title = L(b.title);
  const marked = isBookmarked(b.id);
  const hasQuiz = Array.isArray(b.quiz) && b.quiz.length > 0;
  const cert = state.certificates.find(c => c.book_id === b.id);
  const sel = resolveBookSelection(b);
  const hasTextHere = !!mediaUrl(b.textUrls, sel.lang, sel.level);
  const hasAudioHere = !!mediaUrl(b.audioUrls, sel.lang, sel.level);
  const picker = mediaPickerHtml(sel.langs, l => bookLevels(b, l), sel.lang, sel.level, 'setDetailLang', 'setDetailLevel');

  container.innerHTML = `
    <div class="book-detail-hero liquid-glass-card">
      <div class="book-detail-cover">
        <img src="${escapeHtml(resolveCover(b.cover))}" alt="${escapeHtml(title)}" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.onerror=null;this.src='icons/icon-512.png';">
      </div>
      <div class="book-detail-main">
        <div class="book-detail-badges">
          <span class="badge">${escapeHtml(categoryName(b.genre))}</span>
          ${textLangs.length ? `<span class="badge">${escapeHtml(t('textBadge'))}: ${textLangs.map(l => l.toUpperCase()).join(' · ')}</span>` : ''}
          ${audioLangs.length ? `<span class="badge">${escapeHtml(t('audioBadge'))}: ${audioLangs.map(l => l.toUpperCase()).join(' · ')}</span>` : ''}
          ${hasQuiz ? `<span class="badge">${escapeHtml(t('quizBadge'))}</span>` : ''}
          ${cert ? `<span class="badge badge-success">✓ ${escapeHtml(t('certificateEarned'))}</span>` : ''}
        </div>
        <h1 class="book-detail-title">${escapeHtml(title)}</h1>
        <p class="book-detail-author">${escapeHtml(L(b.author))}</p>
        <div class="liquid-divider"></div>

        ${picker}

        <div class="book-detail-cta">
          ${hasTextHere ? `<button class="btn-primary" onclick="openReader()"><span>${escapeHtml(t('readBook'))}</span></button>` : ''}
          ${hasAudioHere ? `<button class="btn-secondary liquid-glass-btn" onclick="playAudioBook()"><span>${escapeHtml(t('listenBook'))}</span></button>` : ''}
          ${state.currentUser ? `
            <button class="btn-icon ${marked ? 'is-active' : ''}" onclick="toggleBookmark('${b.id}')" aria-pressed="${marked}" aria-label="${escapeHtml(marked ? t('removeBookmark') : t('addBookmark'))}" title="${escapeHtml(marked ? t('removeBookmark') : t('addBookmark'))}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="${marked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>` : ''}
          <button class="btn-icon" onclick="shareCurrentBook()" aria-label="${escapeHtml(t('share'))}" title="${escapeHtml(t('share'))}">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>
          </button>
          ${isAdmin() ? `
            <button class="btn-icon" onclick="editBookInAdmin('${b.id}')" aria-label="${escapeHtml(t('edit'))}" title="${escapeHtml(t('edit'))}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </button>` : ''}
        </div>
        ${!sel.langs.length ? `<p class="muted-text">${escapeHtml(t('noMediaYet'))}</p>` : ''}
        <p class="book-detail-synopsis">${escapeHtml(L(b.synopsis))}</p>
      </div>
    </div>`;
}

async function shareCurrentBook() {
  const b = state.currentBook;
  if (!b) return;
  const url = ELIB_CONFIG.siteUrl + buildHash('book-detail', b.id);
  try {
    if (navigator.share) {
      await navigator.share({ title: L(b.title), text: L(b.author), url });
      return;
    }
  } catch (e) { return; }
  try {
    await navigator.clipboard.writeText(url);
    showToast(t('linkCopied'), 'online');
  } catch (e) {
    prompt(t('share'), url);
  }
}

async function toggleBookmark(bookId) {
  if (!state.currentUser) { openAuthModal(); return; }
  try {
    if (isBookmarked(bookId)) {
      await api.removeBookmark(bookId);
      state.bookmarks = state.bookmarks.filter(b => b.book_id !== bookId);
      showToast(t('bookmarkRemoved'));
    } else {
      const row = await api.addBookmark(bookId, state.mediaLang, state.mediaLevel);
      state.bookmarks.unshift(row);
      showToast(t('bookmarkSaved'), 'online');
    }
    renderCurrentScreen();
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

function openReader() {
  if (!state.currentBook) return;
  navigate('reader', state.currentBook.id);
}

function setReaderLang(lang) {
  state.mediaLang = lang;
  renderReaderScreen();
}

function setReaderLevel(level) {
  state.mediaLevel = Number(level) || 1;
  renderReaderScreen();
}

function renderReaderScreen() {
  const b = state.currentBook;
  if (!b) return;
  const titleEl = document.getElementById('reader-title');
  const bodyEl = document.getElementById('reader-body');
  const paywallEl = document.getElementById('reader-paywall-box');
  const bmBtn = document.getElementById('reader-bookmark-btn');

  if (titleEl) titleEl.textContent = L(b.title);
  if (paywallEl) paywallEl.style.display = 'none';
  if (bmBtn) {
    const marked = isBookmarked(b.id);
    bmBtn.classList.toggle('is-active', marked);
    bmBtn.setAttribute('aria-pressed', String(marked));
    const svg = bmBtn.querySelector('svg');
    if (svg) svg.setAttribute('fill', marked ? 'currentColor' : 'none');
  }

  const lang = pickMediaLang(b.textUrls);
  state.mediaLang = lang;
  const level = pickLevel(b.textUrls, lang);
  state.mediaLevel = level;
  const raw = mediaUrl(b.textUrls, lang, level);
  /* Language and level are chosen on the book page; here only a caption */
  const picker = `<button type="button" class="media-caption" onclick="navigate('book-detail','${b.id}')" aria-label="${escapeHtml(t('changeLangLevel'))}">${escapeHtml(langName(lang))} · ${escapeHtml(t('level' + level))} <span aria-hidden="true">✎</span></button>`;

  if (!raw) {
    pdfDestroy();
    bodyEl.innerHTML = `${picker}<p class="muted-text">${escapeHtml(t('noTextYet'))}</p>`;
    renderBookQuiz(b);
    return;
  }

  /* Keep the reader mounted when only re-rendering the same file */
  let pickerHost = document.getElementById('reader-picker-host');
  let docHost = document.getElementById('reader-doc-host');
  if (!pickerHost || !docHost) {
    bodyEl.innerHTML = `
      <div id="reader-picker-host"></div>
      <div class="reader-doc-actions">
        <span id="reader-picker-slot"></span>
        <a class="btn-link" id="reader-open-drive" target="_blank" rel="noopener">${escapeHtml(t('openInDrive'))} ↗</a>
      </div>
      <div id="reader-doc-host" class="reader-doc-host"></div>`;
    pickerHost = document.getElementById('reader-picker-host');
    docHost = document.getElementById('reader-doc-host');
  }
  pickerHost.innerHTML = '';
  const slot = document.getElementById('reader-picker-slot');
  if (slot) slot.innerHTML = picker;
  const openLink = document.getElementById('reader-open-drive');
  if (openLink) openLink.href = driveOpenUrl(raw);

  const startPage = (state.resumeBookId === b.id && state.resumePage) ? state.resumePage : 0;
  state.resumePage = 0;
  openPdfReader(docHost, raw, { bookId: b.id, lang, level, startPage }).then(ok => {
    if (ok) return;
    /* Not a PDF we can stream (e.g. Google Docs, huge file) — use the Google Drive viewer */
    const embed = driveEmbedUrl(raw);
    docHost.innerHTML = embed ? `
      <div class="drive-doc-frame">
        <iframe src="${escapeHtml(embed)}" title="${escapeHtml(L(b.title))}" loading="lazy" allow="autoplay; fullscreen" referrerpolicy="no-referrer"></iframe>
      </div>` : `<p class="muted-text">${escapeHtml(t('noTextYet'))}</p>`;
  });

  progressSaver.queue(b.id, 'read', lang, level, { page: startPage || 1, position: 0 });
  checkSavedProgressBanner();
  renderBookQuiz(b);
}

function saveReaderBookmark() {
  if (state.currentBook) toggleBookmark(state.currentBook.id);
}

/* ---------- Audio ---------- */
function playAudioBook(book) {
  const b = book || state.currentBook;
  if (!b) return;
  if (!availableLangs(b.audioUrls).length) {
    showToast(t('noAudio'), 'offline');
    return;
  }
  state.activeAudioBook = b;
  state.currentBook = b;
  navigate('player', b.id);
}

function setAudioLang(lang) {
  state.mediaLang = lang;
  renderFullPlayerScreen();
}

function setAudioLevel(level) {
  state.mediaLevel = Number(level) || 1;
  renderFullPlayerScreen();
}

function renderFullPlayerScreen() {
  const b = state.activeAudioBook || state.currentBook;
  if (!b) return;
  document.getElementById('player-title').textContent = L(b.title);
  document.getElementById('player-author').textContent = L(b.author);
  const coverBox = document.getElementById('player-cover-box');
  if (coverBox) {
    coverBox.innerHTML = `<img src="${escapeHtml(resolveCover(b.cover))}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.onerror=null;this.src='icons/icon-512.png';">`;
  }

  /* Language and level are chosen on the book page before pressing "Listen" */
  const lang = pickMediaLang(b.audioUrls);
  state.mediaLang = lang;
  const level = pickLevel(b.audioUrls, lang);
  state.mediaLevel = level;
  const backdrop = document.getElementById('player-backdrop');
  if (backdrop) backdrop.style.backgroundImage = `url("${resolveCover(b.cover).replace(/"/g, '%22')}")`;
  const levelEl = document.getElementById('player-level-label');
  if (levelEl) levelEl.textContent = `${langName(lang)} · ${t('level' + level)}`;

  state.activeAudioBook = b;
  loadAudio(b, lang, level);
  updateMediaSession(b, lang, level);
  setPlaybackRate(state.playbackRate || 1);
  showMiniPlayer(b);
}

function showMiniPlayer(book) {
  const mini = document.getElementById('mini-player');
  if (!mini) return;
  document.getElementById('mini-title').textContent = L(book.title);
  document.getElementById('mini-author').textContent = `${L(book.author)} · ${langName(state.mediaLang)} · ${t('level' + state.mediaLevel)}`;
  document.getElementById('mini-thumb').innerHTML =
    `<img src="${escapeHtml(resolveCover(book.cover, 'icons/icon-192.png'))}" alt="" referrerpolicy="no-referrer" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" onerror="this.onerror=null;this.src='icons/icon-192.png';">`;
  mini.classList.add('visible');
  document.body.classList.add('has-mini-player');
  updatePlayButtons();
}

function openFullPlayer() {
  if (state.activeAudioBook) navigate('player', state.activeAudioBook.id);
}

function closeMiniPlayer() {
  const mini = document.getElementById('mini-player');
  if (mini) mini.classList.remove('visible');
  document.body.classList.remove('has-mini-player');
  stopAudio();
  state.activeAudioBook = null;
}

/* ---------- Resume banner ---------- */
function checkSavedProgressBanner() {
  const bar = document.getElementById('resume-session-bar');
  const titleEl = document.getElementById('resume-book-title');
  if (!bar || !titleEl) return;
  const p = state.latestProgress;
  const book = p && findBook(p.book_id);
  const onSameBook = state.currentBook && p && state.currentBook.id === p.book_id && ['reader', 'player'].includes(state.currentScreen);
  if (state.currentUser && book && !onSameBook) {
    const where = p.mode === 'listen' ? (p.position ? ` · ${formatTime(p.position)}` : '') : (p.page > 1 ? ` · ${t('page')} ${p.page}` : '');
    titleEl.textContent = `${L(book.title)} · ${p.mode === 'listen' ? t('listenBook') : t('readBook')} · ${langName(p.lang || 'ru')} · ${t('level' + (p.level || 1))}${where}`;
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
  }
}

function restoreSavedProgress() {
  const p = state.latestProgress;
  const book = p && findBook(p.book_id);
  if (!book) return dismissSavedProgress();
  state.currentBook = book;
  state.mediaLang = p.lang || state.currentLang;
  state.mediaLevel = p.level || 1;
  state.resumeBookId = book.id;
  state.resumePage = p.mode === 'read' ? (p.page || 1) : 0;
  state.resumePosition = p.mode === 'listen' ? (p.position || 0) : 0;
  navigate(p.mode === 'listen' ? 'player' : 'reader', book.id);
}

function dismissSavedProgress() {
  const p = state.latestProgress;
  if (p) api.deleteProgress(p.book_id);
  state.latestProgress = null;
  checkSavedProgressBanner();
}

/* ---------- Quiz (graded on the server) ---------- */
function quizText(v) {
  if (v && typeof v === 'object') return L(v);
  return v === undefined || v === null ? '' : String(v);
}

function renderBookQuiz(book) {
  const quizContainer = document.getElementById('reader-quiz-container');
  const listEl = document.getElementById('quiz-questions-list');
  const banner = document.getElementById('quiz-result-banner');
  const submitBtn = document.getElementById('quiz-submit-btn');
  if (!quizContainer || !listEl) return;

  const questions = Array.isArray(book.quiz) ? book.quiz : [];
  if (!questions.length) {
    quizContainer.style.display = 'none';
    return;
  }
  quizContainer.style.display = 'block';
  banner.style.display = 'none';
  state.quizAnswers = {};

  if (!state.currentUser) {
    if (submitBtn) submitBtn.style.display = 'none';
    listEl.innerHTML = `
      <div class="quiz-login-prompt">
        <p class="muted-text">${escapeHtml(t('quizSignIn'))}</p>
        <button class="btn-primary" onclick="openAuthModal()">${escapeHtml(t('signIn'))}</button>
      </div>`;
    return;
  }

  const cert = state.certificates.find(c => c.book_id === book.id);
  if (cert) {
    listEl.innerHTML = '';
    if (submitBtn) submitBtn.style.display = 'none';
    showQuizResult({ percent: 100, correct: 1, total: 1, certificate: cert, already: true });
    return;
  }

  listEl.innerHTML = questions.map((item, qIdx) => {
    const opts = Array.isArray(item.options) ? item.options : [];
    return `
      <fieldset class="quiz-card">
        <legend class="quiz-question">${qIdx + 1}. ${escapeHtml(quizText(item.q))}</legend>
        <div class="quiz-options">
          ${opts.map((opt, oIdx) => `
            <button type="button" class="quiz-option-btn" id="q-${qIdx}-opt-${oIdx}" aria-pressed="false" onclick="handleQuizAnswer(${qIdx}, ${oIdx})">${escapeHtml(quizText(opt))}</button>
          `).join('')}
        </div>
      </fieldset>`;
  }).join('');
  if (submitBtn) {
    submitBtn.style.display = 'inline-flex';
    submitBtn.disabled = true;
  }
}

function handleQuizAnswer(qIdx, oIdx) {
  const b = state.currentBook;
  if (!b) return;
  const q = b.quiz[qIdx];
  if (!q) return;
  state.quizAnswers[qIdx] = oIdx;
  (q.options || []).forEach((_, idx) => {
    const btn = document.getElementById(`q-${qIdx}-opt-${idx}`);
    if (!btn) return;
    btn.classList.toggle('selected', idx === oIdx);
    btn.setAttribute('aria-pressed', String(idx === oIdx));
  });
  const submitBtn = document.getElementById('quiz-submit-btn');
  if (submitBtn) submitBtn.disabled = Object.keys(state.quizAnswers).length !== b.quiz.length;
}

async function submitQuiz() {
  const b = state.currentBook;
  if (!b || !state.currentUser) return;
  const answers = b.quiz.map((_, i) => (state.quizAnswers[i] !== undefined ? state.quizAnswers[i] : -1));
  const submitBtn = document.getElementById('quiz-submit-btn');
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await api.submitQuiz(b.id, answers);
    if (res.certificate && !state.certificates.some(c => c.id === res.certificate.id)) {
      state.certificates.unshift(res.certificate);
    }
    showQuizResult(res);
  } catch (err) {
    showToast(friendlyError(err), 'offline');
    if (submitBtn) submitBtn.disabled = false;
  }
}

function showQuizResult(res) {
  const banner = document.getElementById('quiz-result-banner');
  const scoreTitle = document.getElementById('quiz-score-title');
  const scoreDesc = document.getElementById('quiz-score-desc');
  const certBtn = document.getElementById('btn-claim-certificate');
  const retryBtn = document.getElementById('quiz-retry-btn');
  banner.style.display = 'block';
  if (res.already) {
    scoreTitle.textContent = t('quizAlreadyPassed');
  } else {
    scoreTitle.textContent = t('quizScore', { c: res.correct, t: res.total, p: res.percent });
  }
  if (res.certificate) {
    scoreDesc.textContent = t('quizPassed');
    certBtn.style.display = 'inline-flex';
    certBtn.onclick = () => openCertificateModal(res.certificate);
    if (retryBtn) retryBtn.style.display = 'none';
  } else {
    const left = (res.attemptsLeft !== undefined) ? ' ' + t('attemptsLeft', { n: res.attemptsLeft }) : '';
    scoreDesc.textContent = t('quizNeed100') + left;
    certBtn.style.display = 'none';
    if (retryBtn) retryBtn.style.display = res.attemptsLeft > 0 ? 'inline-flex' : 'none';
  }
  banner.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function retryQuiz() {
  if (state.currentBook) renderBookQuiz(state.currentBook);
}

/* ---------- Certificates with QR verification ---------- */
function certificateVerifyUrl(code) {
  return ELIB_CONFIG.siteUrl + buildHash('verify', code);
}

function openCertificateModal(cert) {
  if (!cert) return;
  document.getElementById('cert-user-name').textContent = cert.user_name || (state.currentUser && state.currentUser.name) || '';
  document.getElementById('cert-book-name').textContent = `«${L(cert.book_title)}»`;
  document.getElementById('cert-date').textContent = formatDate(cert.issued_at);
  document.getElementById('cert-code').textContent = cert.code;
  document.getElementById('cert-score').textContent = `${cert.score || 100}%`;
  const verifyUrl = certificateVerifyUrl(cert.code);
  const link = document.getElementById('cert-verify-link');
  if (link) { link.href = verifyUrl; link.textContent = verifyUrl.replace(/^https:\/\//, ''); }
  const qrBox = document.getElementById('cert-qr');
  if (qrBox && typeof qrcode === 'function') {
    const qr = qrcode(0, 'M');
    qr.addData(verifyUrl);
    qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 3, margin: 0, scalable: true });
    const svg = qrBox.querySelector('svg');
    if (svg) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR'); }
  }
  document.getElementById('certificate-modal').classList.add('open');
}

function openCertificateById(id) {
  openCertificateModal(state.certificates.find(c => c.id === id));
}

function closeCertificateModal() {
  document.getElementById('certificate-modal').classList.remove('open');
}

function printCertificate() {
  document.body.classList.add('printing-certificate');
  window.print();
  setTimeout(() => document.body.classList.remove('printing-certificate'), 500);
}

function renderVerifyScreen(code) {
  const input = document.getElementById('verify-code-input');
  if (input && code && input.value !== code) input.value = code;
  const box = document.getElementById('verify-result');
  if (box && !code) box.innerHTML = '';
  if (code) runVerify(code);
}

function handleVerifySubmit(event) {
  event.preventDefault();
  const code = document.getElementById('verify-code-input').value.trim().toUpperCase();
  if (!code) return;
  navigate('verify', code);
}

async function runVerify(code) {
  const box = document.getElementById('verify-result');
  if (!box) return;
  box.innerHTML = `<p class="muted-text">${escapeHtml(t('loading'))}</p>`;
  try {
    const res = await api.verifyCertificate(code);
    if (!res) {
      box.innerHTML = `<div class="verify-card verify-bad" role="status"><strong>✕ ${escapeHtml(t('verifyNotFound'))}</strong><p>${escapeHtml(code)}</p></div>`;
      return;
    }
    box.innerHTML = `
      <div class="verify-card verify-ok" role="status">
        <strong>✓ ${escapeHtml(t('verifyValid'))}</strong>
        <dl>
          <dt>${escapeHtml(t('certHolder'))}</dt><dd>${escapeHtml(res.user_name)}</dd>
          <dt>${escapeHtml(t('certBook'))}</dt><dd>«${escapeHtml(L(res.book_title))}»</dd>
          <dt>${escapeHtml(t('certDate'))}</dt><dd>${escapeHtml(formatDate(res.issued_at))}</dd>
          <dt>${escapeHtml(t('certScore'))}</dt><dd>${escapeHtml(String(res.score))}%</dd>
          <dt>${escapeHtml(t('certCode'))}</dt><dd>${escapeHtml(res.code)}</dd>
        </dl>
      </div>`;
  } catch (err) {
    box.innerHTML = `<div class="verify-card verify-bad" role="status">${escapeHtml(friendlyError(err))}</div>`;
  }
}

/* ==========================================================================
   9. Bookmarks, stats, settings, info pages
   ========================================================================== */
function signInPromptHtml(textKey) {
  return `
    <div class="empty-state soft-gradient-card">
      <p class="muted-text" style="margin-bottom: 14px;">${escapeHtml(t(textKey))}</p>
      <button class="btn-primary" onclick="openAuthModal()">${escapeHtml(t('signIn'))}</button>
    </div>`;
}

function renderBookmarksScreen() {
  const container = document.getElementById('bookmarks-list-container');
  if (!container) return;
  if (!state.currentUser) { container.innerHTML = signInPromptHtml('bookmarksSignIn'); return; }

  const items = state.bookmarks.map(bm => ({ bm, book: findBook(bm.book_id) })).filter(x => x.book);
  if (!items.length) {
    container.innerHTML = `<div class="empty-state soft-gradient-card"><p class="muted-text">${escapeHtml(t('bookmarksEmpty'))}</p></div>`;
    return;
  }
  container.innerHTML = items.map(({ bm, book }, idx) => `
    <div class="bookmark-row soft-gradient-card stagger-item" style="--i:${idx};">
      <img src="${escapeHtml(resolveCover(book.cover, 'icons/icon-192.png'))}" alt="" class="bookmark-thumb" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='icons/icon-192.png';">
      <div class="bookmark-meta">
        <div class="bookmark-title">${escapeHtml(L(book.title))}</div>
        <div class="bookmark-sub">${escapeHtml(L(book.author))} · ${escapeHtml(formatDate(bm.created_at))}</div>
      </div>
      <div class="bookmark-actions">
        <button class="btn-secondary btn-sm" onclick="navigate('book-detail','${book.id}')">${escapeHtml(t('open'))}</button>
        <button class="btn-icon" onclick="toggleBookmark('${book.id}')" aria-label="${escapeHtml(t('removeBookmark'))}" title="${escapeHtml(t('removeBookmark'))}">✕</button>
      </div>
    </div>`).join('');
}

function renderStatsScreen() {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-streak', state.currentUser ? (state.currentUser.streak_count || 1) : '—');
  set('stat-books-total', state.books.length);
  set('stat-quizzes-passed', state.certificates.length);
  set('stat-bookmarks-count', state.bookmarks.length);

  const certList = document.getElementById('user-certificates-list');
  if (!certList) return;
  if (!state.currentUser) { certList.innerHTML = signInPromptHtml('statsSignIn'); return; }
  if (!state.certificates.length) {
    certList.innerHTML = `<p class="muted-text" style="grid-column: 1/-1;">${escapeHtml(t('certificatesEmpty'))}</p>`;
    return;
  }
  certList.innerHTML = state.certificates.map((c, idx) => `
    <button type="button" class="stat-card soft-gradient-card stagger-item cert-card" style="--i:${idx};" onclick="openCertificateById('${c.id}')">
      <div class="stat-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
      </div>
      <div class="stat-info">
        <h4 style="font-size: 14.5px;">${escapeHtml(L(c.book_title))}</h4>
        <p>${escapeHtml(c.code)} · ${escapeHtml(formatDate(c.issued_at))}</p>
      </div>
    </button>`).join('');
}

function renderSettingsScreen() {
  const userCard = document.getElementById('settings-user-card');
  const adminCard = document.getElementById('settings-admin-card');
  const segDark = document.getElementById('seg-theme-dark');
  const segLight = document.getElementById('seg-theme-light');
  if (segDark && segLight) {
    segDark.classList.toggle('active', state.theme === 'dark');
    segLight.classList.toggle('active', state.theme === 'light');
    segDark.setAttribute('aria-pressed', String(state.theme === 'dark'));
    segLight.setAttribute('aria-pressed', String(state.theme === 'light'));
  }
  const fontEl = document.getElementById('settings-font-size');
  if (fontEl) fontEl.textContent = `${state.fontSize}px`;
  const langEl = document.getElementById('settings-lang-select');
  if (langEl) langEl.value = state.currentLang;
  if (!userCard) return;

  if (!state.currentUser) {
    if (adminCard) adminCard.style.display = 'none';
    userCard.innerHTML = `
      <div class="settings-row">
        <div class="settings-row-info">
          <div class="settings-row-title">${escapeHtml(t('guestMode'))}</div>
          <div class="settings-row-sub">${escapeHtml(t('guestModeDesc'))}</div>
        </div>
        <div class="auth-inline-buttons">
          <button class="btn-primary" onclick="openAuthModal('login')">${escapeHtml(t('signIn'))}</button>
          <button class="btn-secondary" onclick="openAuthModal('register')">${escapeHtml(t('register'))}</button>
        </div>
      </div>`;
    return;
  }

  const u = state.currentUser;
  if (adminCard) adminCard.style.display = isAdmin() ? 'block' : 'none';
  const providerLabel = { google: 'Google', apple: 'Apple', email: 'Email' }[u.provider] || u.provider;
  userCard.innerHTML = `
    <div class="profile-summary-row">
      <div class="profile-summary-left">
        <div class="profile-avatar-large">${avatarHtml(u)}</div>
        <div style="min-width:0;">
          <div class="profile-name">${escapeHtml(u.name)}</div>
          <div class="profile-email">${escapeHtml(u.email || '')}</div>
          <span class="badge" style="margin-top:6px;">${escapeHtml(providerLabel)}</span>
          ${isAdmin() ? '<span class="badge badge-admin" style="margin-top:6px;">Admin</span>' : ''}
        </div>
      </div>
      <div class="profile-summary-actions">
        <button class="btn-secondary btn-sm" onclick="openEditProfileModal()">${escapeHtml(t('profile'))}</button>
        <button class="btn-danger btn-sm" onclick="handleLogout()">${escapeHtml(t('signOut'))}</button>
      </div>
    </div>`;
}

function renderInfoScreen(kind) {
  const box = document.getElementById(`${kind}-content`);
  if (!box) return;
  const pages = INFO_PAGES[kind] || {};
  box.innerHTML = pages[state.currentLang] || pages.ru || '';
}

/* ==========================================================================
   10. Admin panel (all writes are re-checked by RLS on the server)
   ========================================================================== */
function switchAdminTab(tab) {
  state.adminTab = tab;
  document.querySelectorAll('.admin-tab').forEach(t2 => {
    const active = t2.id === `adm-tab-${tab}`;
    t2.classList.toggle('active', active);
    t2.setAttribute('aria-selected', String(active));
  });
  ['books', 'add', 'categories', 'users', 'analytics', 'backup'].forEach(name => {
    const el = document.getElementById(`adm-content-${name}`);
    if (el) el.style.display = (tab === name) ? 'block' : 'none';
  });
  if (tab === 'books') renderAdminBooksTable();
  if (tab === 'categories') renderAdminCategoriesGrid();
  if (tab === 'users') renderAdminUsersTable();
  if (tab === 'analytics') renderAdminAnalytics();
}

function renderAdminScreen() {
  populateGenreSelectDropdown();
  switchAdminTab(state.adminTab || 'books');
}

function renderAdminCategoriesGrid() {
  const grid = document.getElementById('admin-categories-grid');
  if (!grid) return;
  grid.innerHTML = getCategories().map((g, i) => create3DCategoryCardHtml(g, i, 'openCategoryEditorModal')).join('');
  renderAll3DCategoryCanvases(grid);
}

function renderAdminBooksTable() {
  const tbody = document.getElementById('admin-books-table-body');
  const emptyEl = document.getElementById('admin-empty-books');
  if (!tbody || !emptyEl) return;
  if (!state.books.length) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';
  const langsCell = urls => {
    const l = availableLangs(urls);
    return l.length ? l.map(x => `${x.toUpperCase()}×${availableLevels(urls, x).length}`).join(' ') : '—';
  };
  tbody.innerHTML = state.books.map(b => `
    <tr>
      <td><img src="${escapeHtml(resolveCover(b.cover, 'icons/icon-192.png'))}" alt="" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='icons/icon-192.png';" class="admin-thumb"></td>
      <td style="font-weight: 600;">${escapeHtml(L(b.title))}${b.published ? '' : ` <span class="badge">${escapeHtml(t('draft'))}</span>`}</td>
      <td class="muted-text">${escapeHtml(L(b.author))}</td>
      <td><span class="badge">${escapeHtml(categoryName(b.genre))}</span></td>
      <td>${langsCell(b.textUrls)}</td>
      <td>${langsCell(b.audioUrls)}</td>
      <td>${(b.quiz || []).length || '—'}</td>
      <td style="text-align: right; white-space: nowrap;">
        <button class="btn-icon" style="width: 30px; height: 30px;" onclick="editBookInAdmin('${b.id}')" aria-label="Редактировать">✎</button>
        <button class="btn-icon" style="width: 30px; height: 30px; color: var(--danger);" onclick="deleteBook('${b.id}')" aria-label="Удалить">✕</button>
      </td>
    </tr>`).join('');
}

/* ---------- Users ---------- */
async function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" class="muted-text">${escapeHtml(t('loading'))}</td></tr>`;
  try {
    state.adminProfiles = await api.fetchAllProfiles();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${escapeHtml(friendlyError(err))}</td></tr>`;
    return;
  }
  const countEl = document.getElementById('admin-users-count');
  if (countEl) countEl.textContent = String(state.adminProfiles.length);
  tbody.innerHTML = state.adminProfiles.map(u => {
    const isRoot = (u.email || '').toLowerCase() === ROOT_ADMIN_EMAIL;
    const isSelf = state.currentUser && u.id === state.currentUser.id;
    return `
      <tr>
        <td style="font-weight: 600;">${escapeHtml(u.name)}</td>
        <td class="muted-text">${escapeHtml(u.email || '')}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-admin' : ''}">${u.role === 'admin' ? 'Admin' : 'Reader'}</span></td>
        <td class="muted-text">${escapeHtml(formatDate(u.created_at))}</td>
        <td style="text-align: right; white-space: nowrap;">
          ${isRoot ? '<span class="muted-text" style="font-size: 11px;">Root</span>' : `
            ${isSelf ? '' : `<button class="btn-secondary btn-sm" onclick="toggleUserRole('${u.id}')">${u.role === 'admin' ? 'Сделать читателем' : 'Сделать админом'}</button>`}
            ${isSelf ? '' : `<button class="btn-icon" style="width: 30px; height: 30px; color: var(--danger);" onclick="deleteUser('${u.id}')" aria-label="Удалить пользователя">✕</button>`}
          `}
        </td>
      </tr>`;
  }).join('');
}

async function toggleUserRole(userId) {
  const user = state.adminProfiles.find(u => u.id === userId);
  if (!user) return;
  const role = user.role === 'admin' ? 'reader' : 'admin';
  if (!confirm(`${user.email}: ${role === 'admin' ? 'выдать права администратора' : 'снять права администратора'}?`)) return;
  try {
    await api.setUserRole(userId, role);
    showToast('Роль изменена', 'online');
    renderAdminUsersTable();
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

async function deleteUser(userId) {
  const user = state.adminProfiles.find(u => u.id === userId);
  if (!user || !confirm(`Удалить пользователя ${user.email}? Его закладки и сертификаты тоже будут удалены.`)) return;
  try {
    await api.adminUsers({ action: 'delete', id: userId });
    showToast('Пользователь удалён', 'online');
    renderAdminUsersTable();
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

function openAdminCreateUserModal() {
  ['adm-user-name', 'adm-user-email', 'adm-user-pass'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('adm-user-role').value = 'reader';
  document.getElementById('admin-user-modal').classList.add('open');
}

function closeAdminCreateUserModal() {
  document.getElementById('admin-user-modal').classList.remove('open');
}

async function handleAdminCreateUser(event) {
  event.preventDefault();
  const payload = {
    action: 'create',
    name: document.getElementById('adm-user-name').value.trim(),
    email: document.getElementById('adm-user-email').value.trim().toLowerCase(),
    password: document.getElementById('adm-user-pass').value,
    role: document.getElementById('adm-user-role').value
  };
  try {
    await api.adminUsers(payload);
    closeAdminCreateUserModal();
    showToast('Пользователь создан', 'online');
    renderAdminUsersTable();
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

/* ---------- Analytics ---------- */
async function renderAdminAnalytics() {
  const box = document.getElementById('admin-analytics-box');
  if (!box) return;
  box.innerHTML = `<p class="muted-text">${escapeHtml(t('loading'))}</p>`;
  try {
    const s = await api.adminStats();
    const daily = s.daily || [];
    const max = Math.max(1, ...daily.map(d => d.views));
    box.innerHTML = `
      <div class="stats-grid admin-stats-grid">
        ${[['Пользователи', s.users], ['Издания', s.books], ['Сертификаты', s.certificates],
           ['Просмотры сегодня', s.views_today], ['За 7 дней', s.views_7d], ['За 30 дней', s.views_30d]]
          .map(([k, v]) => `<div class="stat-card soft-gradient-card"><div class="stat-info"><h4>${escapeHtml(String(v))}</h4><p>${escapeHtml(k)}</p></div></div>`).join('')}
      </div>
      <h4 class="admin-subheading">Просмотры по дням (14 дней)</h4>
      <div class="views-bars" role="img" aria-label="Просмотры по дням">
        ${daily.length ? daily.map(d => `<div class="views-bar" style="--h:${Math.round(d.views / max * 100)}%" title="${escapeHtml(d.day)}: ${d.views}"><span>${d.views}</span></div>`).join('') : '<p class="muted-text">Пока нет данных.</p>'}
      </div>
      <h4 class="admin-subheading">Популярные страницы (30 дней)</h4>
      <table class="clean-table"><tbody>
        ${(s.top_pages || []).map(p => `<tr><td>${escapeHtml(pageLabel(p.path))}</td><td style="text-align:right;">${p.views}</td></tr>`).join('') || '<tr><td class="muted-text">Пока нет данных.</td></tr>'}
      </tbody></table>`;
  } catch (err) {
    box.innerHTML = `<p>${escapeHtml(friendlyError(err))}</p>`;
  }
}

function pageLabel(path) {
  const m = String(path).match(/^#\/(book|read|listen)\/(.+)$/);
  if (m) {
    const b = findBook(m[2]);
    const kind = { book: 'Книга', read: 'Чтение', listen: 'Аудио' }[m[1]];
    return `${kind}: ${b ? L(b.title) : m[2]}`;
  }
  return path;
}

/* ---------- Book form ---------- */
function dataUrlToBlob(dataUrl) {
  const [meta, b64] = dataUrl.split(',');
  const mime = (meta.match(/data:([^;]+)/) || [])[1] || 'image/jpeg';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

function compressImage(srcData, maxWidth, maxHeight, quality, callback) {
  const img = new Image();
  img.onload = function () {
    let { width, height } = img;
    if (width > maxWidth) { height = Math.round(height * maxWidth / width); width = maxWidth; }
    if (height > maxHeight) { width = Math.round(width * maxHeight / height); height = maxHeight; }
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    try { callback(canvas.toDataURL('image/jpeg', quality || 0.85)); } catch (e) { callback(srcData); }
  };
  img.onerror = () => callback(srcData);
  img.src = srcData;
}

function handleCoverFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => compressImage(e.target.result, 600, 840, 0.85, setUploadedCover);
  reader.readAsDataURL(file);
}

function setUploadedCover(src) {
  document.getElementById('form-cover-data').value = src;
  document.getElementById('cover-preview-img').src = /^data:/.test(src) ? src : resolveCover(src);
  document.getElementById('cover-dropzone-empty').style.display = 'none';
  document.getElementById('cover-dropzone-filled').style.display = 'flex';
}

function clearUploadedCover() {
  document.getElementById('form-cover-data').value = '';
  document.getElementById('form-cover-file').value = '';
  document.getElementById('cover-preview-img').src = '';
  document.getElementById('cover-dropzone-empty').style.display = 'block';
  document.getElementById('cover-dropzone-filled').style.display = 'none';
}

function handleCoverUrlInput(val) {
  const url = sanitizeUrl(val);
  if (url) setUploadedCover(url);
}

function resetBookForm() {
  document.getElementById('book-form').reset();
  document.getElementById('form-book-id').value = '';
  document.getElementById('form-published').checked = true;
  clearUploadedCover();
  const first = getCategories()[0];
  if (first) document.getElementById('form-genre').value = first.id;
  document.getElementById('book-form-heading').textContent = 'Новое издание';
  document.querySelectorAll('.drive-test-status').forEach(el => { el.textContent = ''; });
}

function openAddBookTab() {
  resetBookForm();
  switchAdminTab('add');
}

async function editBookInAdmin(bookId) {
  const book = findBook(bookId);
  if (!book) return;
  if (state.currentScreen !== 'admin') navigate('admin');
  await new Promise(r => setTimeout(r, 30));
  switchAdminTab('add');
  resetBookForm();
  document.getElementById('book-form-heading').textContent = 'Редактирование издания';
  document.getElementById('form-book-id').value = book.id;
  document.getElementById('form-genre').value = book.genre || '';
  document.getElementById('form-published').checked = book.published;
  if (book.cover) setUploadedCover(book.cover);
  LANGS.forEach(l => {
    document.getElementById(`form-title-${l}`).value = (book.title || {})[l] || '';
    document.getElementById(`form-author-${l}`).value = (book.author || {})[l] || '';
    document.getElementById(`form-synopsis-${l}`).value = (book.synopsis || {})[l] || '';
    const tx = langLevels(book.textUrls, l);
    const au = langLevels(book.audioUrls, l);
    LEVELS.forEach(lv => {
      document.getElementById(`form-text-${l}-${lv}`).value = tx[lv] || '';
      document.getElementById(`form-audio-${l}-${lv}`).value = au[lv] || '';
    });
  });
  let keys = [];
  try { keys = await api.fetchQuizKeys(book.id); } catch (e) {}
  const quizWithKeys = (book.quiz || []).map((q, i) => ({ ...q, correct: keys[i] !== undefined ? keys[i] : 0 }));
  document.getElementById('form-quiz-json').value = quizWithKeys.length ? JSON.stringify(quizWithKeys, null, 2) : '';
}

function testDriveLink(inputId) {
  const input = document.getElementById(inputId);
  const status = document.getElementById(`${inputId}-status`);
  if (!input || !status) return;
  const raw = input.value.trim();
  if (!raw) { status.textContent = ''; return; }
  const url = sanitizeUrl(raw);
  if (!url) {
    status.textContent = 'Ссылка должна начинаться с https://';
    status.style.color = 'var(--danger)';
    return;
  }
  const id = /google\.com/.test(url) ? (extractGoogleDriveId(url) || '') : '';
  status.innerHTML = id
    ? `✓ Google Drive: <a href="${escapeHtml(driveEmbedUrl(url))}" target="_blank" rel="noopener">открыть просмотр</a> · убедитесь, что доступ «Все, у кого есть ссылка»`
    : '✓ Внешняя ссылка';
  status.style.color = 'var(--success)';
}

/* Test helper: copy the first filled book/audio link into every empty language/level field */
function fillEmptyMediaFromFirst() {
  ['form-text', 'form-audio'].forEach(prefix => {
    const ids = [];
    LANGS.forEach(l => LEVELS.forEach(lv => ids.push(`${prefix}-${l}-${lv}`)));
    const first = ids.map(id => document.getElementById(id).value.trim()).find(v => v);
    if (!first) return;
    ids.forEach(id => { const el = document.getElementById(id); if (!el.value.trim()) el.value = first; });
  });
  showToast('Пустые поля заполнены', 'online');
}

function parseQuizJson(text) {
  if (!text.trim()) return { quiz: [], keys: [] };
  const arr = JSON.parse(text);
  if (!Array.isArray(arr)) throw new Error('Аттестация должна быть массивом [...]');
  const quiz = [];
  const keys = [];
  arr.forEach((item, i) => {
    if (!item || !item.q || !Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`Вопрос №${i + 1}: нужны поля "q" и "options" (минимум 2 варианта)`);
    }
    const correct = Number(item.correct);
    if (!Number.isInteger(correct) || correct < 0 || correct >= item.options.length) {
      throw new Error(`Вопрос №${i + 1}: "correct" должен быть номером варианта от 0 до ${item.options.length - 1}`);
    }
    quiz.push({ q: item.q, options: item.options });
    keys.push(correct);
  });
  return { quiz, keys };
}

async function handleSaveBook(event) {
  event.preventDefault();
  const pick = prefix => {
    const o = {};
    LANGS.forEach(l => {
      const v = document.getElementById(`${prefix}-${l}`).value.trim();
      if (v) o[l] = v;
    });
    return o;
  };
  const pickUrls = prefix => {
    const o = {};
    for (const l of LANGS) {
      for (const lv of LEVELS) {
        const raw = document.getElementById(`${prefix}-${l}-${lv}`).value.trim();
        if (!raw) continue;
        const v = sanitizeUrl(raw);
        if (!v) throw new Error(`Ссылка (${l.toUpperCase()}, уровень ${lv}) должна начинаться с https://`);
        o[l] = o[l] || {};
        o[l][lv] = v;
      }
    }
    return o;
  };

  const saveBtn = document.getElementById('book-save-btn');
  try {
    const title = pick('form-title');
    if (!Object.keys(title).length) throw new Error('Укажите название хотя бы на одном языке.');
    const { quiz, keys } = parseQuizJson(document.getElementById('form-quiz-json').value);
    const book = {
      id: document.getElementById('form-book-id').value || null,
      genre: document.getElementById('form-genre').value || null,
      title,
      author: pick('form-author'),
      synopsis: pick('form-synopsis'),
      textUrls: pickUrls('form-text'),
      audioUrls: pickUrls('form-audio'),
      quiz,
      published: document.getElementById('form-published').checked,
      cover: ''
    };
    if (saveBtn) saveBtn.disabled = true;

    const coverVal = document.getElementById('form-cover-data').value.trim();
    if (/^data:image\//.test(coverVal)) {
      book.cover = await api.uploadImage('books', dataUrlToBlob(coverVal));
    } else {
      book.cover = sanitizeUrl(coverVal);
    }

    const saved = await api.saveBook(book, keys);
    const idx = state.books.findIndex(b => b.id === saved.id);
    if (idx >= 0) state.books[idx] = saved; else state.books.unshift(saved);
    renderAll();
    switchAdminTab('books');
    showToast('Издание сохранено и доступно всем читателям', 'online');
  } catch (err) {
    showToast(err instanceof SyntaxError ? 'Ошибка в JSON аттестации: ' + err.message : friendlyError(err), 'offline');
  } finally {
    if (saveBtn) saveBtn.disabled = false;
  }
}

async function deleteBook(bookId) {
  const b = findBook(bookId);
  if (!b || !confirm(`Удалить «${L(b.title)}»? Закладки и прогресс читателей по этой книге тоже удалятся.`)) return;
  try {
    await api.deleteBook(bookId);
    state.books = state.books.filter(x => x.id !== bookId);
    renderAll();
    renderAdminBooksTable();
    showToast('Издание удалено', 'online');
  } catch (err) {
    showToast(friendlyError(err), 'offline');
  }
}

/* ---------- Backup ---------- */
function exportLibraryJson() {
  const payload = { version: 6, exportedAt: new Date().toISOString(), categories: state.categories, books: state.books };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `elibrary-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/* Show / hide password ("eye") button for every password field */
function setupPasswordToggles() {
  const eye = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  const eyeOff = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  document.querySelectorAll('input[type="password"]').forEach(input => {
    if (input.dataset.eye) return;
    input.dataset.eye = '1';
    const wrap = document.createElement('div');
    wrap.className = 'password-wrap';
    input.parentNode.insertBefore(wrap, input);
    wrap.appendChild(input);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'password-eye';
    btn.innerHTML = eye;
    const label = () => btn.setAttribute('aria-label', input.type === 'password' ? t('showPassword') : t('hidePassword'));
    label();
    btn.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.innerHTML = show ? eyeOff : eye;
      btn.setAttribute('aria-pressed', String(show));
      label();
      input.focus();
    });
    wrap.appendChild(btn);
  });
}

/* ==========================================================================
   11. Accessibility, network status, scroll effects
   ========================================================================== */
function setupAccessibility() {
  /* Enter / Space activate custom role="button" elements */
  document.addEventListener('keydown', e => {
    const el = e.target;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.getAttribute && el.getAttribute('role') === 'button' && el.tagName !== 'BUTTON') {
      e.preventDefault();
      el.click();
    }
    if (e.key === 'Escape') {
      const open = Array.from(document.querySelectorAll('.modal-backdrop.open')).pop();
      if (open) open.classList.remove('open');
    }
  });
  /* Click on the dimmed backdrop closes the modal */
  document.querySelectorAll('.modal-backdrop').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('open'); });
  });
}

function setupNetworkStatusToast() {
  window.addEventListener('offline', () => showToast(t('offlineMode'), 'offline'));
  window.addEventListener('online', () => {
    showToast(t('backOnline'), 'online');
    refreshCatalog();
  });
  if (!navigator.onLine) showToast(t('offlineMode'), 'offline');
}

function setupOpticalLiquidScroll() {
  let queued = false;
  window.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { /* at most once per frame */
      queued = false;
      const sy = window.scrollY || 0;
      document.documentElement.style.setProperty('--scroll-refract', sy + 'px');
      document.documentElement.style.setProperty('--scroll-angle', ((sy * 0.12) % 360) + 'deg');
    });
  }, { passive: true });
}
