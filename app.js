/**
 * eLibrary Pro v2.0 — Core Application Script
 * Features:
 * - Google Sign-In & Email Authentication (Instant access, no codes)
 * - Role-Based Access Control (Admin vs Reader)
 * - Admin Panel accessed exclusively via Settings for authorized Admins
 * - Freemium Paywall (Guests: first 1-3 pages of text, 4-minute audio preview cap)
 * - Full Access for Logged-In Users
 * - Interactive Chapter Quizzes & Knowledge Verification Tests
 * - Shareable Certificate of Completion & Quote Cards for Social Media
 * - Daily Reading Streak (Habit-forming Gamification)
 * - Google Drive Smart Audio Player Engine (Direct Stream + Embed Iframe fallback)
 */

/* ==========================================================================
   1. State & Constants
   ========================================================================== */
const STORAGE_KEYS = {
  BOOKS: 'elibrary_books_v2',
  SETTINGS: 'elibrary_settings_v2',
  BOOKMARKS: 'elibrary_bookmarks_v2',
  USERS: 'elibrary_users_v2',
  SESSION: 'elibrary_session_v2',
  STREAK: 'elibrary_streak_v2'
};

const GUEST_AUDIO_LIMIT_SECS = 240; // 4 minutes preview for guests
const GUEST_TEXT_LIMIT_CHARS = 450; // ~1-2 pages preview for guests

const GENRES = [
  { id: 'history',    name: { ru: 'История и Археология',      tj: 'Таърих ва Бостоншиносӣ',        en: 'History & Archaeology' } },
  { id: 'science',    name: { ru: 'Фундаментальная Наука',     tj: 'Илми Бунёдӣ',                   en: 'Fundamental Science' } },
  { id: 'business',   name: { ru: 'Стратегия и Экономика',     tj: 'Стратегия ва Иқтисод',          en: 'Strategy & Economics' } },
  { id: 'technology', name: { ru: 'Информационные Технологии', tj: 'Технологияҳои Иттилоотӣ',       en: 'Information Tech & AI' } },
  { id: 'psychology', name: { ru: 'Когнитивистика',            tj: 'Когнитивистика ва Равоншиносӣ', en: 'Cognitive Science' } },
  { id: 'philosophy', name: { ru: 'Философия и Логика',        tj: 'Фалсафа ва Мантиқ',             en: 'Philosophy & Logic' } },
  { id: 'education',  name: { ru: 'Педагогика и Академика',    tj: 'Педагогика ва Академика',       en: 'Pedagogy & Education' } },
  { id: 'poetry',     name: { ru: 'Классические Труды',        tj: 'Осор ва Адабиёти Классикӣ',     en: 'Classical Literature' } },
  { id: 'math',       name: { ru: 'Математика и Анализ',       tj: 'Математика ва Таҳлил',          en: 'Mathematics & Analysis' } },
  { id: 'art',        name: { ru: 'Астрофизика и Космос',      tj: 'Астрофизика ва Кайҳоншиносӣ',   en: 'Astrophysics & Space' } }
];

const AVATAR_PRESETS = ['👑', '🦁', '🦉', '🚀', '📚', '🎧', '⚡', '🌟'];

const I18N = {
  ru: {
    navMenu: "НАВИГАЦИЯ",
    navHome: "Главная",
    navGenres: "Направления",
    navBookmarks: "Избранное",
    navStats: "Аналитика",
    navPreferences: "СИСТЕМА",
    navSettings: "Профиль",
    searchPlaceholder: "Поиск публикаций, монографий, авторов...",
    heroTag: "✨ АКАДЕМИЧЕСКИЙ ФОНД",
    heroTitle: "Научные монографии, труды и лекторий",
    heroDesc: "Единая исследовательская среда. Авторизованный доступ к первоисточникам и аудиоматериалам.",
    exploreGenres: "Отрасли знания",
    categoriesTitle: "Отраслевые направления",
    categoriesSubtitle: "Классификатор академических дисциплин",
    allBooksTitle: "Академический каталог",
    emptyLibTitle: "Каталог формируется",
    emptyLibDesc: "Новые монографии и лекционные курсы добавляются через панель управления в Профиле.",
    genresCatalog: "Классификатор дисциплин",
    genresCatalogSub: "Тематический реестр исследовательских направлений",
    adminTitle: "Панель управления фондом",
    formTitle: "Наименование труда *",
    formAuthor: "Автор / Исследователь *",
    formGenre: "Отрасль знания *",
    formCover: "Изображение титула",
    formSynopsis: "Аннотация издания",
    formText: "Текст монографии",
    cancelBtn: "Отмена",
    saveBookBtn: "Внести в реестр",
    bookmarksTitle: "Избранные материалы",
    bookmarksSubtitle: "Сохранённые фрагменты и цитаты",
    statsTitle: "Аналитика фонда",
    statsSubtitle: "Метрики чтения и исследовательской активности",
    settingsTitle: "Профиль исследователя",
    settingsSubtitle: "Учетная запись, безопасность и параметры отображения"
  },
  tj: {
    navMenu: "ПАЙМОИШ",
    navHome: "Асосӣ",
    navGenres: "Самтҳои илмӣ",
    navBookmarks: "Маводи интихобӣ",
    navStats: "Таҳлил ва омор",
    navPreferences: "НИЗОМ",
    navSettings: "Профил",
    searchPlaceholder: "Ҷустуҷӯи асарҳо, рисолаҳо, муаллифон...",
    heroTag: "✨ ФОНДИ АКАДЕМӢ",
    heroTitle: "Асарҳои илмӣ, пажӯҳишҳо ва лексияҳо",
    heroDesc: "Муҳити ягонаи таҳқиқотӣ. Дастрасии мукаммал ба сарчашмаҳои илмӣ ва маводи савтӣ.",
    exploreGenres: "Самтҳои илм",
    categoriesTitle: "Самтҳои илм",
    categoriesSubtitle: "Таснифоти соҳаҳои дониш",
    allBooksTitle: "Феҳристи нашрияҳо",
    emptyLibTitle: "Феҳрист дар ҳоли такмил аст",
    emptyLibDesc: "Асарҳои нави илмӣ тавассути панели идоракунӣ дар бахши Профил ворид карда мешаванд.",
    genresCatalog: "Таснифоти соҳаҳо",
    genresCatalogSub: "Феҳристи мавзӯии самтҳои илмӣ",
    adminTitle: "Идоракунии фонди илмӣ",
    formTitle: "Номи асар *",
    formAuthor: "Муаллиф / Пажӯҳишгар *",
    formGenre: "Самти илм *",
    formCover: "Тасвири муқова",
    formSynopsis: "Мухтасари асар",
    formText: "Матни комили рисола",
    cancelBtn: "Бекор кардан",
    saveBookBtn: "Сабт дар феҳрист",
    bookmarksTitle: "Маводи интихобӣ",
    bookmarksSubtitle: "Иқтибосҳо ва саҳифаҳои сабтшуда",
    statsTitle: "Омори таҳқиқотӣ",
    statsSubtitle: "Нишондиҳандаҳои мутолиа ва фаъолият",
    settingsTitle: "Профили пажӯҳишгар",
    settingsSubtitle: "Танзимоти ҳисоб, амният ва намоиш"
  },
  en: {
    navMenu: "NAVIGATION",
    navHome: "Main",
    navGenres: "Disciplines",
    navBookmarks: "Saved Items",
    navStats: "Analytics",
    navPreferences: "SYSTEM",
    navSettings: "Profile",
    searchPlaceholder: "Search publications, monographs, authors...",
    heroTag: "✨ ACADEMIC ARCHIVE",
    heroTitle: "Scientific Works, Papers & Lectures",
    heroDesc: "Unified research environment. Authorized access to primary sources and audio lectures.",
    exploreGenres: "Academic Fields",
    categoriesTitle: "Fields of Study",
    categoriesSubtitle: "Classification of academic disciplines",
    allBooksTitle: "Academic Catalog",
    emptyLibTitle: "Catalog is Being Formed",
    emptyLibDesc: "Publications and lecture recordings can be managed via the Profile admin portal.",
    genresCatalog: "Academic Disciplines",
    genresCatalogSub: "Thematic directory of scientific fields",
    adminTitle: "Fund Management",
    formTitle: "Title of Work *",
    formAuthor: "Author / Researcher *",
    formGenre: "Discipline *",
    formCover: "Cover Image",
    formSynopsis: "Abstract",
    formText: "Monograph Text",
    cancelBtn: "Cancel",
    saveBookBtn: "Save to Catalog",
    bookmarksTitle: "Saved Works",
    bookmarksSubtitle: "Saved passages and citations",
    statsTitle: "Fund Analytics",
    statsSubtitle: "Reading metrics and research activity",
    settingsTitle: "Researcher Profile",
    settingsSubtitle: "Account credentials, security, and display options"
  }
};

let state = {
  currentLang: 'ru',
  theme: 'dark',
  fontSize: 17,
  activeScreen: 'home',
  books: [],
  users: [],
  currentUser: null, // null = Guest, or User object { id, email, name, role, avatar }
  currentBook: null,
  activeAudioBook: null,
  isPlaying: false,
  audioDuration: 0,
  audioCurrentTime: 0,
  playbackSpeed: 1.0,
  playerMode: 'html5',
  bookmarks: [],
  searchQuery: '',
  selectedGenre: null,
  streakDays: 1,
  selectedAvatar: '👑',
  authMode: 'login', // 'login' or 'reg'
  currentQuizAnswers: {}
};

const globalAudio = document.getElementById('global-audio');

/* ==========================================================================
   2. Initialization & Data Loading
   ========================================================================== */
function initApp() {
  loadStoredUsers();
  loadStoredBooks();
  loadStoredSettings();
  loadStoredBookmarks();
  loadReadingStreak();

  applyTheme(state.theme);
  applyLanguage(state.currentLang);
  setupAudioListeners();
  setupKeyboardShortcuts();
  renderAll();
}

function loadStoredUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS);
    if (raw) {
      state.users = JSON.parse(raw) || [];
    }
  } catch (e) {
    state.users = [];
  }

  // Pre-seed default Admin account if not present
  const adminExists = state.users.some(u => u.email === 'admin@elibrary.com');
  if (!adminExists) {
    state.users.unshift({
      id: 'usr_admin',
      email: 'admin@elibrary.com',
      password: '10012002', // User specified admin credentials
      name: 'Администратор',
      role: 'admin',
      avatar: '👑',
      createdAt: Date.now()
    });
    saveUsersToStorage();
  }

  // Load session
  try {
    const sessionEmail = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (sessionEmail) {
      const found = state.users.find(u => u.email === sessionEmail);
      if (found) state.currentUser = found;
    }
  } catch (e) {}
}

function saveUsersToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(state.users));
  } catch (e) {}
}

function loadStoredBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKS);
    state.books = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.books = [];
  }
}

function saveBooksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(state.books));
  } catch (e) {
    alert('Не удалось сохранить данные в память браузера.');
  }
}

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.theme) state.theme = s.theme;
      if (s.lang) state.currentLang = s.lang;
      if (s.fontSize) state.fontSize = s.fontSize;
    }
  } catch (e) {}
}

function saveSettingsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
      theme: state.theme,
      lang: state.currentLang,
      fontSize: state.fontSize
    }));
  } catch (e) {}
}

function loadStoredBookmarks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    state.bookmarks = raw ? JSON.parse(raw) : [];
  } catch (e) {
    state.bookmarks = [];
  }
}

function saveBookmarksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
  } catch (e) {}
}

function loadReadingStreak() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STREAK);
    const today = new Date().toISOString().slice(0, 10);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.lastDate === today) {
        state.streakDays = data.streak;
      } else {
        const last = new Date(data.lastDate);
        const now = new Date(today);
        const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          state.streakDays = data.streak + 1;
        } else {
          state.streakDays = 1;
        }
      }
    } else {
      state.streakDays = 1;
    }
    localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify({ streak: state.streakDays, lastDate: today }));
  } catch (e) {
    state.streakDays = 1;
  }
}

/* ==========================================================================
   3. Security & Sanitization
   ========================================================================== */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) {
    return '';
  }
  return trimmed;
}

/* ==========================================================================
   4. Authentication & Profile Management
   ========================================================================== */
function openAuthModal() {
  document.getElementById('auth-modal').classList.add('active');
  document.getElementById('auth-error-hint').style.display = 'none';
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function switchAuthTab(mode) {
  state.authMode = mode;
  document.getElementById('auth-tab-login').classList.toggle('active', mode === 'login');
  document.getElementById('auth-tab-reg').classList.toggle('active', mode === 'reg');
  document.getElementById('auth-name-group').style.display = (mode === 'reg') ? 'block' : 'none';
  document.getElementById('auth-submit-btn').textContent = (mode === 'reg') ? 'Зарегистрироваться' : 'Войти в аккаунт';
}

function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value.trim();
  const errorHint = document.getElementById('auth-error-hint');

  if (state.authMode === 'login') {
    const user = state.users.find(u => u.email === email && u.password === password);
    if (!user) {
      errorHint.textContent = 'Неверный email или пароль.';
      errorHint.style.display = 'block';
      return;
    }
    setSessionUser(user);
    closeAuthModal();
    alert(`Добро пожаловать, ${user.name}!`);
  } else {
    // Registration
    const name = document.getElementById('auth-name').value.trim() || email.split('@')[0];
    if (state.users.some(u => u.email === email)) {
      errorHint.textContent = 'Пользователь с таким email уже зарегистрирован.';
      errorHint.style.display = 'block';
      return;
    }
    const newUser = {
      id: 'usr_' + Date.now(),
      email,
      password,
      name,
      role: 'reader',
      avatar: '📚',
      createdAt: Date.now()
    };
    state.users.push(newUser);
    saveUsersToStorage();
    setSessionUser(newUser);
    closeAuthModal();
    alert(`Регистрация успешна! Добро пожаловать, ${name}!`);
  }
}

// Google One-Click Sign In (Instant access without SMS or email confirmation codes)
function triggerGoogleSignIn() {
  // Simulates instant OAuth response or prompt
  const googleName = prompt('Вход через Google. Введите ваше имя для профиля Google:', state.currentUser ? state.currentUser.name : 'Читатель Google');
  if (!googleName) return;

  const googleEmail = (googleName.toLowerCase().replace(/\s+/g, '') + '@gmail.com');
  let user = state.users.find(u => u.email === googleEmail);

  if (!user) {
    user = {
      id: 'usr_g_' + Date.now(),
      email: googleEmail,
      password: 'g_' + Math.random().toString(36).substring(2),
      name: googleName,
      role: 'reader',
      avatar: 'https://lh3.googleusercontent.com/a/default-user=s96-c',
      createdAt: Date.now()
    };
    state.users.push(user);
    saveUsersToStorage();
  }

  setSessionUser(user);
  closeAuthModal();
  alert(`Вы успешно вошли через Google как ${user.name}! Полный доступ ко всем книгам открыт.`);
}

function setSessionUser(user) {
  state.currentUser = user;
  localStorage.setItem(STORAGE_KEYS.SESSION, user.email);
  renderAll();

  // If reading, refresh reader screen to unlock full text
  if (state.activeScreen === 'reader') {
    renderReader();
  }
}

function logout() {
  if (!confirm('Выйти из аккаунта?')) return;
  state.currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  renderAll();
  navigate('home');
}

function openProfileModal() {
  if (!state.currentUser) return;
  const user = state.currentUser;

  document.getElementById('profile-name').value = user.name;
  document.getElementById('profile-custom-avatar').value = user.avatar.startsWith('http') ? user.avatar : '';
  state.selectedAvatar = user.avatar;

  // Render presets
  const grid = document.getElementById('avatar-presets-grid');
  grid.innerHTML = AVATAR_PRESETS.map(emoji => `
    <div class="avatar-choice ${emoji === state.selectedAvatar ? 'selected' : ''}" onclick="selectAvatarPreset('${emoji}')">
      ${emoji}
    </div>
  `).join('');

  document.getElementById('profile-modal').classList.add('active');
}

function closeProfileModal() {
  document.getElementById('profile-modal').classList.remove('active');
}

function selectAvatarPreset(emoji) {
  state.selectedAvatar = emoji;
  document.querySelectorAll('.avatar-choice').forEach(c => c.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
}

function handleSaveProfile(e) {
  e.preventDefault();
  if (!state.currentUser) return;

  const newName = document.getElementById('profile-name').value.trim();
  const customAvatar = document.getElementById('profile-custom-avatar').value.trim();
  const newPass = document.getElementById('profile-new-password').value.trim();

  state.currentUser.name = newName || state.currentUser.name;
  state.currentUser.avatar = customAvatar || state.selectedAvatar;
  if (newPass) {
    state.currentUser.password = newPass;
  }

  // Update in users array
  const idx = state.users.findIndex(u => u.id === state.currentUser.id);
  if (idx >= 0) state.users[idx] = state.currentUser;

  saveUsersToStorage();
  closeProfileModal();
  renderAll();
  alert('Профиль успешно обновлен!');
}

/* ==========================================================================
   5. Google Drive Audio Player Engine with 4-Minute Preview Cap for Guests
   ========================================================================== */
function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (match1) return match1[1];
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (match2) return match2[1];
  const match3 = trimmed.match(/google\.com\/uc\?.*id=([a-zA-Z0-9_-]{15,})/);
  if (match3) return match3[1];
  return null;
}

function resolveAudioSources(rawUrl) {
  if (!rawUrl) return { streamUrl: '', embedUrl: '', isGDrive: false };
  const sanitized = sanitizeUrl(rawUrl);
  const gdriveId = extractGoogleDriveId(sanitized);

  if (gdriveId) {
    return {
      streamUrl: `https://docs.google.com/uc?export=download&id=${gdriveId}`,
      embedUrl: `https://drive.google.com/file/d/${gdriveId}/preview`,
      isGDrive: true,
      fileId: gdriveId
    };
  }

  if (sanitized.includes('dropbox.com')) {
    const dbUrl = sanitized.replace(/[?&]dl=[01]/g, '').replace(/\?([^#]*)$/, '?$1&raw=1');
    return {
      streamUrl: dbUrl.includes('raw=1') ? dbUrl : `${dbUrl}?raw=1`,
      embedUrl: '',
      isGDrive: false
    };
  }

  return {
    streamUrl: sanitized,
    embedUrl: '',
    isGDrive: false
  };
}

function setupAudioListeners() {
  if (!globalAudio) return;

  globalAudio.addEventListener('timeupdate', () => {
    state.audioCurrentTime = globalAudio.currentTime;
    state.audioDuration = globalAudio.duration || 0;

    // FREEMIUM GUEST LIMIT: 4 minutes (240s) cap for guests!
    if (!state.currentUser && globalAudio.currentTime >= GUEST_AUDIO_LIMIT_SECS) {
      globalAudio.pause();
      globalAudio.currentTime = GUEST_AUDIO_LIMIT_SECS;
      updatePlayPauseButtons();
      alert('🎧 Бесплатное 4-минутное превью завершено.\n\nВойдите через Google или по Email бесплатно, чтобы слушать полную 20-минутную тему и всю аудиокнигу целиком!');
      openAuthModal();
      return;
    }

    updateAudioUI();
  });

  globalAudio.addEventListener('loadedmetadata', () => {
    state.audioDuration = globalAudio.duration || 0;
    updateAudioUI();
  });

  globalAudio.addEventListener('play', () => {
    state.isPlaying = true;
    updatePlayPauseButtons();
  });

  globalAudio.addEventListener('pause', () => {
    state.isPlaying = false;
    updatePlayPauseButtons();
  });

  globalAudio.addEventListener('ended', () => {
    state.isPlaying = false;
    updatePlayPauseButtons();
  });

  globalAudio.addEventListener('error', () => {
    if (state.activeAudioBook) {
      const sources = resolveAudioSources(state.activeAudioBook.audioUrl);
      if (sources.isGDrive) {
        document.getElementById('gdrive-embed-section').style.display = 'block';
        const durEl = document.getElementById('player-duration-time');
        if (durEl) durEl.textContent = 'Google Плеер';
      }
    }
  });
}

function playAudioBook(book) {
  if (!book || !book.audioUrl) return;
  state.activeAudioBook = book;
  const sources = resolveAudioSources(book.audioUrl);

  const embedIframe = document.getElementById('gdrive-embed-iframe');
  if (embedIframe) {
    embedIframe.src = sources.embedUrl || sources.streamUrl;
  }

  showMiniPlayer(book);
  navigate('player');
}

function toggleAudioPlay() {
  if (!state.activeAudioBook && state.currentBook && state.currentBook.audioUrl) {
    playAudioBook(state.currentBook);
    return;
  }
  if (!globalAudio.src) return;

  if (globalAudio.paused) {
    globalAudio.play().catch(e => console.log(e));
  } else {
    globalAudio.pause();
  }
}

function skipAudio(seconds) {
  if (!globalAudio || !globalAudio.duration) return;
  let targetTime = globalAudio.currentTime + seconds;
  if (!state.currentUser && targetTime > GUEST_AUDIO_LIMIT_SECS) {
    targetTime = GUEST_AUDIO_LIMIT_SECS;
  }
  globalAudio.currentTime = Math.max(0, Math.min(globalAudio.duration, targetTime));
}

function seekAudio(event) {
  if (!globalAudio || !globalAudio.duration) return;
  const bar = document.getElementById('timeline-bar');
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  let targetTime = ratio * globalAudio.duration;

  if (!state.currentUser && targetTime > GUEST_AUDIO_LIMIT_SECS) {
    alert('Ознакомительное превью ограничено 4 минутами. Войдите в аккаунт для полного доступа!');
    openAuthModal();
    return;
  }

  globalAudio.currentTime = targetTime;
}

function seekMiniAudio(event) {
  if (!globalAudio || !globalAudio.duration) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  let targetTime = ratio * globalAudio.duration;

  if (!state.currentUser && targetTime > GUEST_AUDIO_LIMIT_SECS) {
    openAuthModal();
    return;
  }
  globalAudio.currentTime = targetTime;
}

function setSpeed(speed) {
  state.playbackSpeed = speed;
  if (globalAudio) globalAudio.playbackRate = speed;
  document.querySelectorAll('.speed-pill').forEach(pill => {
    pill.classList.toggle('active', parseFloat(pill.textContent) === speed);
  });
}

function switchPlayerMode(mode) {
  state.playerMode = mode;
  const html5Btn = document.getElementById('tab-html5-btn');
  const embedBtn = document.getElementById('tab-embed-btn');
  const iframeBox = document.getElementById('gdrive-iframe-box');

  if (mode === 'embed') {
    html5Btn.classList.remove('active');
    embedBtn.classList.add('active');
    iframeBox.style.display = 'block';
    if (!globalAudio.paused) globalAudio.pause();
  } else {
    embedBtn.classList.remove('active');
    html5Btn.classList.add('active');
    iframeBox.style.display = 'none';
  }
}

function updateAudioUI() {
  const currentFormatted = formatTime(state.audioCurrentTime);
  const durationFormatted = state.audioDuration ? formatTime(state.audioDuration) : '--:--';
  const percent = state.audioDuration ? (state.audioCurrentTime / state.audioDuration) * 100 : 0;

  const curEl = document.getElementById('player-current-time');
  const durEl = document.getElementById('player-duration-time');
  const progFill = document.getElementById('timeline-progress');
  if (curEl) curEl.textContent = currentFormatted;
  if (durEl && durEl.textContent !== 'Google Плеер') durEl.textContent = durationFormatted;
  if (progFill) progFill.style.width = percent + '%';

  const miniFill = document.getElementById('mini-progress-fill');
  if (miniFill) miniFill.style.width = percent + '%';

  // Preview badge
  const previewBadge = document.getElementById('player-audio-preview-badge');
  if (previewBadge) {
    previewBadge.style.display = state.currentUser ? 'none' : 'inline-flex';
  }
}

function updatePlayPauseButtons() {
  const fullBtn = document.getElementById('player-play-btn');
  const miniBtn = document.getElementById('mini-play-btn');
  const icon = state.isPlaying ? '⏸' : '▶';

  if (fullBtn) fullBtn.textContent = icon;
  if (miniBtn) miniBtn.textContent = icon;
}

function showMiniPlayer(book) {
  const mini = document.getElementById('mini-player');
  const title = document.getElementById('mini-title');
  const author = document.getElementById('mini-author');
  const thumb = document.getElementById('mini-thumb');

  if (!mini) return;
  title.textContent = book.title;
  author.textContent = book.author;

  const coverSrc = (book.cover && (book.cover.startsWith('data:image') || book.cover.startsWith('http') || book.cover.startsWith('icons/')))
    ? book.cover
    : 'icons/icon-192.png';
  thumb.innerHTML = `<img src="${escapeHtml(coverSrc)}" alt="cover" style="width:100%;height:100%;object-fit:cover;border-radius:6px;" onerror="this.onerror=null;this.src='icons/icon-192.png';">`;

  mini.classList.add('visible');
}

function openFullPlayer() {
  if (state.activeAudioBook) {
    state.currentBook = state.activeAudioBook;
    navigate('player');
  }
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function testAudioInput() {
  const input = document.getElementById('form-audio-url');
  const status = document.getElementById('audio-test-status');
  if (!input || !status) return;

  const url = input.value.trim();
  if (!url) {
    status.textContent = 'Введите ссылку для проверки';
    status.style.color = 'var(--warning)';
    return;
  }

  const sources = resolveAudioSources(url);
  if (sources.isGDrive) {
    status.textContent = `✓ Обнаружен Google Drive (ID: ${sources.fileId}). Совместимо!`;
    status.style.color = 'var(--success)';
  } else {
    status.textContent = `✓ Прямой аудио поток готов к проигрыванию.`;
    status.style.color = 'var(--primary-light)';
  }
}

/* ==========================================================================
   6. Navigation & Routing
   ========================================================================== */
function navigate(screenName) {
  // Gatekeep Admin Panel: Strictly allow only admins!
  if (screenName === 'admin') {
    if (!state.currentUser || state.currentUser.role !== 'admin') {
      alert('Доступ ограничен. Только администраторы могут управлять библиотекой и пользователями.');
      navigate('settings');
      return;
    }
  }

  state.activeScreen = screenName;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Push history state for native Back gesture on phone / browser
  if (!window._isPoppingState) {
    try {
      history.pushState({ screen: screenName, bookId: state.currentBook ? state.currentBook.id : null }, '', '#' + screenName);
    } catch(e) {}
  }

  const PAGE_TITLES = {
    'home': 'eLibrary PRO',
    'genres': 'Отрасли знания',
    'bookmarks': 'Избранные труды',
    'stats': 'Аналитика фонда',
    'settings': 'Профиль исследователя',
    'admin': 'Управление фондом',
    'book-detail': 'Издание',
    'reader': 'Чтение труда',
    'player': 'Аудиолекторий'
  };
  const titleEl = document.getElementById('page-title');
  if (titleEl) {
    titleEl.textContent = PAGE_TITLES[screenName] || 'eLibrary';
  }

  updateNavState(screenName);

  if (screenName === 'home') renderHome();
  else if (screenName === 'genres') renderGenresScreen();
  else if (screenName === 'book-detail') renderBookDetail();
  else if (screenName === 'reader') renderReader();
  else if (screenName === 'player') renderFullPlayerScreen();
  else if (screenName === 'admin') { renderAdminBooksTable(); renderAdminUsersTable(); }
  else if (screenName === 'bookmarks') renderBookmarks();
  else if (screenName === 'stats') renderStats();
  else if (screenName === 'settings') renderSettingsScreen();
}

function updateNavState(screenName) {
  document.querySelectorAll('#sidebar .nav-link').forEach(l => l.classList.remove('active'));
  const sidebarMatch = document.querySelector(`#sidebar button[data-screen="${screenName}"]`) || document.querySelector(`#sidebar button[onclick*="'${screenName}'"]`);
  if (sidebarMatch) sidebarMatch.classList.add('active');

  const mobileItems = Array.from(document.querySelectorAll('#mobile-nav .mobile-nav-item'));
  mobileItems.forEach(m => m.classList.remove('active'));
  const activeIdx = mobileItems.findIndex(m => (m.getAttribute('data-screen') === screenName) || m.getAttribute('onclick')?.includes(`'${screenName}'`));
  if (activeIdx !== -1) {
    mobileItems[activeIdx].classList.add('active');
    const pill = document.querySelector('.nav-pill-indicator');
    if (pill) {
      pill.style.transform = `translateX(${activeIdx * 100}%)`;
    }
  }
}

// Browser Back & Forward event handler
window.addEventListener('popstate', (e) => {
  window._isPoppingState = true;
  if (e.state && e.state.screen) {
    if (e.state.bookId) {
      const b = state.books.find(x => x.id === e.state.bookId);
      if (b) state.currentBook = b;
    }
    navigate(e.state.screen);
  } else {
    navigate('home');
  }
  window._isPoppingState = false;
});

function backToDetail() {
  if (state.currentBook) navigate('book-detail');
  else navigate('home');
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

    if (e.code === 'Space') {
      e.preventDefault();
      toggleAudioPlay();
    } else if (e.code === 'ArrowLeft') {
      skipAudio(-10);
    } else if (e.code === 'ArrowRight') {
      skipAudio(10);
    } else if (e.code === 'Escape') {
      closeAllModals();
      if (state.activeScreen === 'reader' || state.activeScreen === 'player') backToDetail();
    }
  });
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

/* ==========================================================================
   7. Rendering UI & Components
   ========================================================================== */
function renderAll() {
  renderTopbarAuth();
  renderHome();
  renderGenresScreen();
  renderSettingsScreen();
  renderStats();
}

function renderTopbarAuth() {
  const authContainer = document.getElementById('topbar-auth-container');
  const streakCount = document.getElementById('streak-days');
  if (streakCount) streakCount.textContent = state.streakDays;

  if (!authContainer) return;

  if (!state.currentUser) {
    authContainer.innerHTML = `
      <button class="btn-primary" style="height: 34px; padding: 0 14px; font-size: 12px;" onclick="openAuthModal()">
        <span>👤</span> <span>Войти</span>
      </button>
    `;
  } else {
    const u = state.currentUser;
    const avatarHtml = u.avatar && u.avatar.startsWith('http')
      ? `<img src="${escapeHtml(u.avatar)}" class="user-avatar-sm" alt="avatar">`
      : `<span class="user-avatar-sm">${escapeHtml(u.avatar || '👤')}</span>`;

    authContainer.innerHTML = `
      <div class="user-profile-badge" onclick="openProfileModal()" title="Нажмите, чтобы настроить профиль">
        ${avatarHtml}
        <span style="font-size: 13px; font-weight: 600;">${escapeHtml(u.name)}</span>
        ${u.role === 'admin' ? '<span class="badge badge-admin" style="font-size:10px; padding:2px 7px;">Admin</span>' : ''}
      </div>
    `;
  }
}


/* ==========================================================================
   Volumetric 3D Floating Objects (Wildberries 3D Category Aesthetic)
   ========================================================================== */
function getGenre3DVisual(genreId) {
  switch (genreId) {
    case 'history':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="col-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F1F5F9"/><stop offset="50%" stop-color="#94A3B8"/><stop offset="100%" stop-color="#475569"/>
          </linearGradient>
          <linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDE047"/><stop offset="50%" stop-color="#CA8A04"/><stop offset="100%" stop-color="#854D0E"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="142" rx="48" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <rect x="44" y="122" width="72" height="14" rx="4" fill="url(#col-grad)"/>
          <path d="M52 46 L50 120 L110 120 L108 46 Z" fill="url(#col-grad)"/>
          <line x1="64" y1="46" x2="63" y2="120" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
          <line x1="76" y1="46" x2="75" y2="120" stroke="rgba(0,0,0,0.25)" stroke-width="2"/>
          <line x1="88" y1="46" x2="89" y2="120" stroke="rgba(255,255,255,0.45)" stroke-width="2"/>
          <rect x="38" y="32" width="84" height="14" rx="3" fill="url(#col-grad)"/>
          <circle cx="48" cy="42" r="7" fill="url(#gold-grad)"/>
          <circle cx="112" cy="42" r="7" fill="url(#gold-grad)"/>
          <rect x="70" y="60" width="62" height="16" rx="8" transform="rotate(-18 70 60)" fill="url(#gold-grad)"/>
        </g>
      </svg>`;

    case 'science':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="chr-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF"/><stop offset="40%" stop-color="#94A3B8"/><stop offset="100%" stop-color="#1E293B"/>
          </linearGradient>
          <linearGradient id="em-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#6EE7B7"/><stop offset="100%" stop-color="#059669"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="142" rx="46" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <path d="M48 136 C48 116 112 116 112 136 Z" fill="url(#chr-grad)"/>
          <rect x="44" y="132" width="72" height="10" rx="4" fill="#64748B"/>
          <path d="M60 126 C60 76 96 66 96 46" stroke="url(#chr-grad)" stroke-width="12" stroke-linecap="round" fill="none"/>
          <rect x="74" y="24" width="22" height="40" rx="6" transform="rotate(22 74 24)" fill="url(#chr-grad)"/>
          <ellipse cx="82" cy="74" rx="32" ry="12" stroke="url(#em-grad)" stroke-width="3" stroke-dasharray="6 4" transform="rotate(-30 82 74)"/>
          <circle cx="60" cy="86" r="6" fill="#34D399"/>
          <circle cx="104" cy="62" r="6" fill="#6EE7B7"/>
        </g>
      </svg>`;

    case 'business':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="amb-f1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FDE68A"/><stop offset="100%" stop-color="#F59E0B"/>
          </linearGradient>
          <linearGradient id="amb-f2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#D97706"/><stop offset="100%" stop-color="#78350F"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="138" rx="44" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <polygon points="80,24 116,56 80,72" fill="url(#amb-f1)"/>
          <polygon points="80,24 44,56 80,72" fill="#FBBF24"/>
          <polygon points="44,56 80,24 32,48" fill="#FDE68A"/>
          <polygon points="116,56 80,24 128,48" fill="#D97706"/>
          <polygon points="80,126 44,56 80,72" fill="url(#amb-f2)"/>
          <polygon points="80,126 116,56 80,72" fill="#B45309"/>
          <line x1="80" y1="24" x2="80" y2="126" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>
          <path d="M32 110 Q70 80 125 40" stroke="#38BDF8" stroke-width="6" stroke-linecap="round" fill="none"/>
          <polygon points="135,32 118,36 127,49" fill="#38BDF8"/>
        </g>
      </svg>`;

    case 'technology':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="chip-bd" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E293B"/><stop offset="100%" stop-color="#020617"/>
          </linearGradient>
          <linearGradient id="cyan-sp" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#67E8F9"/><stop offset="100%" stop-color="#0891B2"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="140" rx="48" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <polygon points="80,50 136,80 80,110 24,80" fill="url(#chip-bd)" stroke="#38BDF8" stroke-width="1.5"/>
          <polygon points="24,80 80,110 80,120 24,90" fill="#0F172A"/>
          <polygon points="136,80 80,110 80,120 136,90" fill="#020617"/>
          <line x1="42" y1="89" x2="36" y2="94" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
          <line x1="58" y1="98" x2="52" y2="103" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
          <line x1="102" y1="98" x2="108" y2="103" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
          <line x1="118" y1="89" x2="124" y2="94" stroke="#FBBF24" stroke-width="3" stroke-linecap="round"/>
          <circle cx="80" cy="80" r="16" fill="url(#cyan-sp)"/>
          <circle cx="75" cy="75" r="4" fill="#FFFFFF" opacity="0.8"/>
        </g>
      </svg>`;

    case 'psychology':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="purp-gl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#E879F9"/><stop offset="50%" stop-color="#A855F7"/><stop offset="100%" stop-color="#581C87"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="140" rx="44" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <path d="M78 44 C60 44 44 58 44 80 C44 94 52 108 66 114 C72 116 78 114 78 108 Z" fill="url(#purp-gl)" opacity="0.85" stroke="#F0ABFC" stroke-width="1.5"/>
          <path d="M82 44 C100 44 116 58 116 80 C116 94 108 108 94 114 C88 116 82 114 82 108 Z" fill="url(#purp-gl)" opacity="0.95" stroke="#F0ABFC" stroke-width="1.5"/>
          <circle cx="58" cy="62" r="4" fill="#FFFFFF"/>
          <circle cx="102" cy="62" r="4" fill="#FFFFFF"/>
          <circle cx="80" cy="80" r="5" fill="#FDF4FF"/>
          <line x1="58" y1="62" x2="80" y2="80" stroke="#F472B6" stroke-width="1.5" stroke-dasharray="3 3"/>
          <line x1="102" y1="62" x2="80" y2="80" stroke="#F472B6" stroke-width="1.5" stroke-dasharray="3 3"/>
        </g>
      </svg>`;

    case 'philosophy':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="stn-gr" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F1F5F9"/><stop offset="50%" stop-color="#94A3B8"/><stop offset="100%" stop-color="#475569"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="142" rx="46" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <rect x="52" y="120" width="56" height="16" rx="4" fill="url(#stn-gr)"/>
          <path d="M58 114 C58 96 64 90 68 84 C64 80 62 70 62 60 C62 42 70 34 80 34 C90 34 98 42 98 60 C98 70 96 80 92 84 C96 90 102 96 102 114 Z" fill="url(#stn-gr)" stroke="#E2E8F0" stroke-width="1.5"/>
          <ellipse cx="80" cy="62" rx="36" ry="12" stroke="#FBBF24" stroke-width="2.5" stroke-dasharray="8 4" transform="rotate(-15 80 62)"/>
        </g>
      </svg>`;

    case 'education':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="cap-dk" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#334155"/><stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="140" rx="46" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <ellipse cx="80" cy="88" rx="34" ry="16" fill="#0F172A"/>
          <path d="M46 88 L46 98 C46 110 114 110 114 98 L114 88 Z" fill="url(#cap-dk)"/>
          <polygon points="80,42 138,62 80,82 22,62" fill="url(#cap-dk)" stroke="#64748B" stroke-width="1.5"/>
          <circle cx="80" cy="62" r="5" fill="#F59E0B"/>
          <path d="M80 62 Q108 68 114 94" stroke="#F59E0B" stroke-width="2.5" fill="none"/>
          <rect x="52" y="114" width="56" height="14" rx="7" fill="#FEF3C7" stroke="#CA8A04" stroke-width="1.5"/>
          <rect x="74" y="112" width="8" height="18" rx="2" fill="#DC2626"/>
        </g>
      </svg>`;

    case 'poetry':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="bk-lth" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E3A8A"/><stop offset="100%" stop-color="#0F172A"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="140" rx="48" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <path d="M26 94 C48 90 74 96 80 102 C86 96 112 90 134 94 L138 102 C116 98 86 104 80 110 C74 104 44 98 22 102 Z" fill="url(#bk-lth)" stroke="#38BDF8" stroke-width="1"/>
          <path d="M30 62 C50 64 74 72 80 84 L80 100 C74 94 48 88 28 88 Z" fill="#FEF3C7"/>
          <path d="M130 62 C110 64 86 72 80 84 L80 100 C86 94 112 88 132 88 Z" fill="#FDF6B2"/>
          <path d="M80 78 Q84 104 74 122 Q78 126 84 118 Q86 102 80 78" fill="#F59E0B"/>
          <path d="M100 36 C108 44 116 66 112 86 C108 80 106 68 100 62 C96 66 94 72 90 78 C94 56 96 42 100 36 Z" fill="#FBBF24"/>
        </g>
      </svg>`;

    case 'math':
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="mth-b1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#60A5FA"/><stop offset="100%" stop-color="#1D4ED8"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="140" rx="44" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <polygon points="80,36 108,56 98,88 62,88 52,56" fill="url(#mth-b1)" stroke="#93C5FD" stroke-width="1.5"/>
          <polygon points="80,36 108,56 128,48 114,24" fill="#3B82F6" opacity="0.9"/>
          <polygon points="108,56 98,88 126,98 136,74" fill="#1E3A8A"/>
          <polygon points="98,88 62,88 70,120 90,120" fill="#1E40AF"/>
          <polygon points="62,88 52,56 24,74 34,98" fill="#1E3A8A"/>
          <polygon points="52,56 80,36 46,24 32,48" fill="#3B82F6" opacity="0.9"/>
          <text x="80" y="72" font-family="system-ui, sans-serif" font-size="26" font-weight="800" fill="#FFFFFF" text-anchor="middle">∑</text>
        </g>
      </svg>`;

    case 'art':
    default:
      return `<svg class="genre-3d-visual" viewBox="0 0 160 160" fill="none">
        <defs>
          <linearGradient id="pln-gr" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#F472B6"/><stop offset="50%" stop-color="#8B5CF6"/><stop offset="100%" stop-color="#312E81"/>
          </linearGradient>
        </defs>
        <ellipse cx="80" cy="142" rx="48" ry="9" fill="rgba(0,0,0,0.35)"/>
        <g class="floating-obj">
          <circle cx="80" cy="76" r="32" fill="url(#pln-gr)"/>
          <ellipse cx="80" cy="76" rx="58" ry="16" stroke="rgba(244,114,182,0.85)" stroke-width="5" transform="rotate(-18 80 76)"/>
          <ellipse cx="80" cy="76" rx="50" ry="12" stroke="rgba(192,132,252,0.5)" stroke-width="2" transform="rotate(-18 80 76)"/>
        </g>
      </svg>`;
  }
}

/* ==========================================================================
   Continuous Reading Progress Autosave & Restore Engine
   ========================================================================== */
function saveReadingProgress() {
  if (!state.currentBook) return;
  const scrollPos = window.scrollY || document.documentElement.scrollTop;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progressPercent = maxScroll > 0 ? Math.min(100, Math.round((scrollPos / maxScroll) * 100)) : 0;

  const progressData = {
    bookId: state.currentBook.id,
    bookTitle: state.currentBook.title,
    scrollPos,
    progressPercent,
    savedAt: Date.now()
  };

  try {
    const all = JSON.parse(localStorage.getItem('elibrary_reading_progress') || '{}');
    all[state.currentBook.id] = progressData;
    localStorage.setItem('elibrary_reading_progress', JSON.stringify(all));
  } catch (e) {}
}

function restoreReadingProgress(bookId) {
  try {
    const all = JSON.parse(localStorage.getItem('elibrary_reading_progress') || '{}');
    const saved = all[bookId];
    if (saved && saved.scrollPos > 40) {
      setTimeout(() => {
        window.scrollTo({ top: saved.scrollPos, behavior: 'smooth' });
        showGlassToast(`✓ Прогресс чтения восстановлен (${saved.progressPercent}%)`);
      }, 300);
    }
  } catch (e) {}
}

function showGlassToast(message) {
  let toast = document.getElementById('glass-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'glass-toast';
    toast.className = 'glass-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
  }, 2600);
}

// Scroll listener for autosave
window.addEventListener('scroll', () => {
  if (state.activeScreen === 'reader') {
    saveReadingProgress();
  }
}, { passive: true });

function renderHome() {
  const genreGrid = document.getElementById('home-genres-grid');
  if (genreGrid) {
    genreGrid.innerHTML = GENRES.map(g => `
      <div class="genre-3d-card ${state.selectedGenre === g.id ? 'active' : ''}" onclick="filterByGenre('${g.id}')">
        <div class="genre-3d-title">${escapeHtml(g.name[state.currentLang] || g.name.ru)}</div>
        <div class="genre-3d-box">
          ${getGenre3DVisual(g.id)}
        </div>
      </div>
    `).join('');
  }
  renderBooksGrid();
}

function renderBooksGrid() {
  const grid = document.getElementById('home-books-grid');
  const emptyState = document.getElementById('home-empty-state');
  const countSubtitle = document.getElementById('books-count-subtitle');
  if (!grid || !emptyState) return;

  let filtered = state.books;
  if (state.selectedGenre) filtered = filtered.filter(b => b.genre === state.selectedGenre);
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(b => (b.title && b.title.toLowerCase().includes(q)) || (b.author && b.author.toLowerCase().includes(q)));
  }

  if (countSubtitle) countSubtitle.textContent = `${filtered.length} книг доступно`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  grid.innerHTML = filtered.map(book => createBookCardHtml(book)).join('');
}

function createBookCardHtml(book) {
  const genreObj = GENRES.find(g => g.id === book.genre);
  const genreName = genreObj ? (genreObj.name[state.currentLang] || genreObj.name.ru) : (book.genre || '');
  const hasAudio = !!book.audioUrl;

  const coverSrc = (book.cover && (book.cover.startsWith('data:image') || book.cover.startsWith('http') || book.cover.startsWith('icons/')))
    ? book.cover
    : 'icons/icon-512.png';

  const coverHtml = `<img src="${escapeHtml(coverSrc)}" class="book-cover-img" alt="${escapeHtml(book.title)}" onerror="this.onerror=null;this.src='icons/icon-512.png';">`;

  return `
    <div class="book-card" onclick="openBookDetail('${book.id}')">
      <div class="book-cover">
        ${coverHtml}
        ${hasAudio ? '<span class="book-type-badge">🎧 Аудио</span>' : ''}
      </div>
      <div class="book-info">
        <span class="book-category">${escapeHtml(genreName)}</span>
        <h4 class="book-title">${escapeHtml(book.title)}</h4>
        <p class="book-author">${escapeHtml(book.author)}</p>
        <div class="book-actions">
          <button class="btn-primary" style="padding: 6px 12px; font-size: 12px; width: 100%; justify-content: center;" onclick="event.stopPropagation(); openBookDetail('${book.id}')">
            Открыть
          </button>
        </div>
      </div>
    </div>
  `;
}

function getBookCountForGenre(genreId) {
  return state.books.filter(b => b.genre === genreId).length;
}

function filterByGenre(genreId) {
  state.selectedGenre = (state.selectedGenre === genreId) ? null : genreId;
  renderHome();
}

function handleSearch(query) {
  state.searchQuery = query;
  renderBooksGrid();
}

function renderGenresScreen() {
  const fullGrid = document.getElementById('full-genres-grid');
  if (fullGrid) {
    fullGrid.innerHTML = GENRES.map(g => `
      <div class="genre-3d-card ${state.selectedGenre === g.id ? 'active' : ''}" onclick="selectGenreTab('${g.id}')">
        <div class="genre-3d-title">${escapeHtml(g.name[state.currentLang] || g.name.ru)}</div>
        <div class="genre-3d-box">
          ${getGenre3DVisual(g.id)}
        </div>
      </div>
    `).join('');
  }

  const genreBooksGrid = document.getElementById('genre-books-grid');
  const title = document.getElementById('genre-view-title');
  if (genreBooksGrid) {
    const list = state.selectedGenre ? state.books.filter(b => b.genre === state.selectedGenre) : state.books;
    if (title) {
      if (state.selectedGenre) {
        const found = GENRES.find(g => g.id === state.selectedGenre);
        title.textContent = found ? `${found.emoji} ${found.name[state.currentLang] || found.name.ru}` : 'Книги жанра';
      } else {
        title.textContent = 'Все книги';
      }
    }
    genreBooksGrid.innerHTML = list.length === 0
      ? '<div class="empty-state" style="grid-column: 1 / -1;"><h3 class="empty-title">В этом разделе пока нет книг</h3></div>'
      : list.map(b => createBookCardHtml(b)).join('');
  }
}

function selectGenreTab(genreId) {
  state.selectedGenre = (state.selectedGenre === genreId) ? null : genreId;
  renderGenresScreen();
}

function openBookDetail(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;
  state.currentBook = book;
  navigate('book-detail');
}

function renderBookDetail() {
  const b = state.currentBook;
  const container = document.getElementById('book-detail-content');
  if (!b || !container) return;

  const genreObj = GENRES.find(g => g.id === b.genre);
  const genreName = genreObj ? (genreObj.name[state.currentLang] || genreObj.name.ru) : (b.genre || '');
  const hasAudio = !!b.audioUrl;
  const hasText = !!b.text;

  const coverSrc = (b.cover && (b.cover.startsWith('data:image') || b.cover.startsWith('http') || b.cover.startsWith('icons/')))
    ? b.cover
    : 'icons/icon-512.png';
  const coverHtml = `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(b.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.onerror=null;this.src='icons/icon-512.png';">`;

  const isAdmin = state.currentUser && state.currentUser.role === 'admin';

  container.innerHTML = `
    <div class="book-detail-hero">
      <div class="book-detail-cover">${coverHtml}</div>
      <div class="book-detail-main">
        <h1 class="book-detail-title">${escapeHtml(b.title)}</h1>
        <p class="book-detail-author">${escapeHtml(b.author)}</p>
        
        <div class="book-detail-badges">
          <span class="badge">📂 ${escapeHtml(genreName)}</span>
          <span class="badge">${hasAudio ? '🎧 Google Drive Audio' : '📖 Текстовый формат'}</span>
        </div>

        <div class="book-detail-cta">
          ${hasText ? `
            <button class="btn-read" onclick="openReader()">
              <span>📖</span>
              <span>${state.currentUser ? 'Читать полностью' : 'Читать превью'}</span>
            </button>
          ` : ''}

          ${hasAudio ? `
            <button class="btn-listen" onclick="playAudioBook(state.currentBook)">
              <span>🎧</span>
              <span>${state.currentUser ? 'Слушать аудиокнигу' : 'Слушать превью (4 мин)'}</span>
            </button>
          ` : ''}

          ${isAdmin ? `
            <button class="btn-icon" style="width: auto; padding: 0 16px; border-radius: var(--radius-md); font-size: 13px;" onclick="editBookInAdmin('${b.id}')">
              ✏️ Редактировать
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    <div class="book-detail-body">
      <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 12px;">О книге</h3>
      <p class="synopsis-text">${escapeHtml(b.synopsis || 'Описание книги ещё не добавлено.')}</p>
    </div>
  `;
}

/* ==========================================================================
   8. Reader with Freemium Paywall & Chapter Quizzes
   ========================================================================== */
function openReader() {
  navigate('reader');
  if (state.currentBook) {
    restoreReadingProgress(state.currentBook.id);
  }
}

function renderReader() {
  const b = state.currentBook;
  if (!b) return;

  const titleEl = document.getElementById('reader-title');
  const authorEl = document.getElementById('reader-author');
  const bodyEl = document.getElementById('reader-content-body');
  const paywallBox = document.getElementById('reader-paywall-box');
  const quizSection = document.getElementById('reader-quiz-container');

  if (titleEl) titleEl.textContent = b.title;
  if (authorEl) authorEl.textContent = b.author;
  if (bodyEl) bodyEl.style.fontSize = `${state.fontSize}px`;

  const fullText = b.text || 'Текст для данной книги ещё не добавлен в библиотеку.';

  // FREEMIUM GUEST PAYWALL CHECK
  if (!state.currentUser) {
    // Show only the first 1-3 preview pages (capped at ~450 characters)
    const previewText = fullText.slice(0, GUEST_TEXT_LIMIT_CHARS) + '...';
    bodyEl.innerHTML = `
      <div class="reader-paywall-wrap">
        <div class="reader-blurred-preview">
          <div>${escapeHtml(previewText)}</div>
          <div class="reader-blur-gradient"></div>
        </div>
      </div>
    `;
    paywallBox.style.display = 'block';
    quizSection.style.display = 'none';
  } else {
    // Logged in: Full text with quizzes
    bodyEl.textContent = fullText;
    paywallBox.style.display = 'none';
    quizSection.style.display = 'block';
    renderBookQuiz(b);
  }
}

function changeFontSize(delta) {
  state.fontSize = Math.max(12, Math.min(32, state.fontSize + delta));
  const bodyEl = document.getElementById('reader-content-body');
  if (bodyEl) bodyEl.style.fontSize = `${state.fontSize}px`;
  const fontIndicator = document.getElementById('settings-font-size');
  if (fontIndicator) fontIndicator.textContent = `${state.fontSize}px`;
  saveSettingsToStorage();
}

/* ==========================================================================
   9. Interactive Tests (Quizzes) & Certificate Generation
   ========================================================================== */
function getBookQuizQuestions(book) {
  if (book.quiz && Array.isArray(book.quiz) && book.quiz.length > 0) {
    return book.quiz;
  }
  // Smart default quiz for comprehension
  return [
    {
      q: `Какова ключевая идея произведения «${book.title}»?`,
      options: [
        'Развитие личности, дисциплина и стремление к знанию',
        'Пассивное ожидание удачи без действий',
        'Игнорирование жизненного опыта предыдущих поколений'
      ],
      answer: 0,
      explanation: 'Основной посыл книги направлен на самосовершенствование и активное созидание.'
    },
    {
      q: 'Какое практическое правило следует применять в первую очередь?',
      options: [
        'Откладывать важные решения на потом',
        'Фокусироваться на главном приоритете каждый день',
        'Браться за десятки дел одновременно без системы'
      ],
      answer: 1,
      explanation: 'Концентрация на ключевой задаче приносит наибольший результат.'
    },
    {
      q: 'Как автор книги рекомендует справляться со сложными ситуациями?',
      options: [
        'Опускать руки при первой неудаче',
        'Искать виноватых среди окружающих',
        'Анализировать ошибки, делать выводы и двигаться дальше'
      ],
      answer: 2,
      explanation: 'Стойкость и рефлексия — фундамент любого прогресса.'
    }
  ];
}

function renderBookQuiz(book) {
  const container = document.getElementById('quiz-questions-list');
  const resultBanner = document.getElementById('quiz-result-banner');
  if (!container || !resultBanner) return;

  const questions = getBookQuizQuestions(book);
  state.currentQuizAnswers = {};
  resultBanner.style.display = 'none';

  container.innerHTML = questions.map((item, qIdx) => `
    <div class="quiz-card" id="quiz-card-${qIdx}">
      <div class="quiz-question-title">Вопрос ${qIdx + 1}: ${escapeHtml(item.q)}</div>
      <div class="quiz-options">
        ${item.options.map((opt, oIdx) => `
          <button class="quiz-option-btn" id="opt-btn-${qIdx}-${oIdx}" onclick="handleQuizAnswer(${qIdx}, ${oIdx})">
            <span>${escapeHtml(opt)}</span>
            <span class="icon" id="opt-icon-${qIdx}-${oIdx}"></span>
          </button>
        `).join('')}
      </div>
      <div class="quiz-feedback" id="quiz-feedback-${qIdx}"></div>
    </div>
  `).join('');
}

function handleQuizAnswer(qIdx, selectedOptIdx) {
  const book = state.currentBook;
  if (!book) return;
  const questions = getBookQuizQuestions(book);
  const q = questions[qIdx];
  if (!q) return;

  // Lock options for this question
  q.options.forEach((_, idx) => {
    const btn = document.getElementById(`opt-btn-${qIdx}-${idx}`);
    if (btn) btn.disabled = true;
  });

  const selectedBtn = document.getElementById(`opt-btn-${qIdx}-${selectedOptIdx}`);
  const feedbackEl = document.getElementById(`quiz-feedback-${qIdx}`);
  const isCorrect = (selectedOptIdx === q.answer);

  state.currentQuizAnswers[qIdx] = isCorrect;

  if (isCorrect) {
    if (selectedBtn) selectedBtn.classList.add('correct');
    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.background = 'rgba(16, 185, 129, 0.15)';
      feedbackEl.style.color = '#10b981';
      feedbackEl.textContent = '✓ Верно! ' + (q.explanation || '');
    }
  } else {
    if (selectedBtn) selectedBtn.classList.add('incorrect');
    const correctBtn = document.getElementById(`opt-btn-${qIdx}-${q.answer}`);
    if (correctBtn) correctBtn.classList.add('correct');
    if (feedbackEl) {
      feedbackEl.style.display = 'block';
      feedbackEl.style.background = 'rgba(239, 68, 68, 0.15)';
      feedbackEl.style.color = '#ef4444';
      feedbackEl.textContent = '✗ Неверно. ' + (q.explanation || '');
    }
  }

  // Check if all questions are answered
  if (Object.keys(state.currentQuizAnswers).length === questions.length) {
    const correctCount = Object.values(state.currentQuizAnswers).filter(Boolean).length;
    const percent = Math.round((correctCount / questions.length) * 100);
    const resultBanner = document.getElementById('quiz-result-banner');
    const scoreText = document.getElementById('quiz-score-text');

    if (resultBanner && scoreText) {
      scoreText.textContent = `Вы ответили правильно на ${correctCount} из ${questions.length} (${percent}%)! 🔥`;
      resultBanner.style.display = 'block';
      resultBanner.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

function generateCertificate() {
  const userName = state.currentUser ? state.currentUser.name : 'Читатель';
  const bookTitle = state.currentBook ? state.currentBook.title : 'Книга';
  const today = new Date().toLocaleDateString();

  document.getElementById('cert-user-name').textContent = userName;
  document.getElementById('cert-book-title').textContent = `«${bookTitle}»`;
  document.getElementById('cert-date').textContent = today;
  document.getElementById('certificate-modal').classList.add('active');
}

function closeCertificateModal() {
  document.getElementById('certificate-modal').classList.remove('active');
}

function shareCertificate() {
  const text = `🏆 Я успешно прочитал книгу «${state.currentBook.title}» в приложении eLibrary и сдал итоговый тест на 100%! Читайте и слушайте книги бесплатно: https://mehrovar1001.github.io/elibrary/`;
  if (navigator.share) {
    navigator.share({ title: 'Сертификат eLibrary', text, url: 'https://mehrovar1001.github.io/elibrary/' }).catch(() => {});
  } else {
    navigator.clipboard.writeText(text).then(() => alert('Текст сертификата и ссылка скопированы в буфер обмена!'));
  }
}

/* ==========================================================================
   10. Quote Generator for Stories / Socials
   ========================================================================== */
function openQuoteShareModal() {
  const book = state.currentBook;
  if (!book) return;

  const quoteText = window.getSelection().toString().trim() ||
    (book.synopsis ? book.synopsis.slice(0, 180) + '...' : `«${book.title}» — прекрасное произведение, меняющее мышление.`);

  document.getElementById('quote-card-text').textContent = quoteText;
  document.getElementById('quote-card-author').textContent = book.author;
  document.getElementById('quote-card-title').textContent = book.title;

  document.getElementById('quote-modal').classList.add('active');
}

function closeQuoteModal() {
  document.getElementById('quote-modal').classList.remove('active');
}

function copyQuoteText() {
  const text = document.getElementById('quote-card-text').textContent;
  const author = document.getElementById('quote-card-author').textContent;
  const title = document.getElementById('quote-card-title').textContent;
  const full = `“${text}”\n— ${author}, «${title}»\n\nЧитайте в eLibrary: https://mehrovar1001.github.io/elibrary/`;

  navigator.clipboard.writeText(full).then(() => {
    alert('Цитата скопирована в буфер обмена!');
  });
}

function toggleCurrentBookmark() {
  if (!state.currentBook) return;
  const existing = state.bookmarks.find(b => b.bookId === state.currentBook.id);
  if (existing) {
    state.bookmarks = state.bookmarks.filter(b => b.bookId !== state.currentBook.id);
    alert('Закладка удалена');
  } else {
    state.bookmarks.push({
      id: 'bm_' + Date.now(),
      bookId: state.currentBook.id,
      title: state.currentBook.title,
      author: state.currentBook.author,
      date: new Date().toLocaleDateString()
    });
    alert('Закладка сохранена!');
  }
  saveBookmarksToStorage();
}

function renderBookmarks() {
  const container = document.getElementById('bookmarks-container');
  const emptyState = document.getElementById('bookmarks-empty-state');
  if (!container || !emptyState) return;

  if (state.bookmarks.length === 0) {
    container.innerHTML = '';
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';
  container.innerHTML = state.bookmarks.map(bm => `
    <div class="book-card" onclick="openBookDetail('${bm.bookId}')">
      <div class="book-info">
        <span class="book-category">Закладка · ${bm.date}</span>
        <h4 class="book-title">${escapeHtml(bm.title)}</h4>
        <p class="book-author">${escapeHtml(bm.author)}</p>
        <button class="btn-primary" style="margin-top: 10px; padding: 6px 12px; font-size: 12px; width: 100%; justify-content: center;">
          Открыть книгу
        </button>
      </div>
    </div>
  `).join('');
}

function renderFullPlayerScreen() {
  const b = state.activeAudioBook || state.currentBook;
  if (!b) return;

  const titleEl = document.getElementById('player-title');
  const authorEl = document.getElementById('player-author');
  const coverBox = document.getElementById('player-cover-box');
  const embedIframe = document.getElementById('gdrive-embed-iframe');

  if (titleEl) titleEl.textContent = b.title;
  if (authorEl) authorEl.textContent = b.author;

  const coverSrc = (b.cover && (b.cover.startsWith('data:image') || b.cover.startsWith('http') || b.cover.startsWith('icons/')))
    ? b.cover
    : 'icons/icon-512.png';

  if (coverBox) {
    coverBox.innerHTML = `<img src="${escapeHtml(coverSrc)}" alt="${escapeHtml(b.title)}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.onerror=null;this.src='icons/icon-512.png';">`;
  }

  const sources = resolveAudioSources(b.audioUrl);
  if (embedIframe) {
    const targetUrl = sources.embedUrl || sources.streamUrl || '';
    if (embedIframe.src !== targetUrl && targetUrl) {
      embedIframe.src = targetUrl;
    }
  }

  updatePlayPauseButtons();
  updateAudioUI();
}

/* ==========================================================================
   11. Settings & Admin Portal Access
   ========================================================================== */
function renderSettingsScreen() {
  const userCard = document.getElementById('settings-user-card');
  const adminCard = document.getElementById('settings-admin-card');

  // Sync theme segmented control
  const segDark = document.getElementById('seg-theme-dark');
  const segLight = document.getElementById('seg-theme-light');
  if (segDark && segLight) {
    segDark.classList.toggle('active', state.theme === 'dark');
    segLight.classList.toggle('active', state.theme === 'light');
  }

  // Sync font size
  const fontEl = document.getElementById('settings-font-size');
  if (fontEl) fontEl.textContent = `${state.fontSize}px`;

  // Sync language select
  const langSelect = document.getElementById('settings-lang-select');
  if (langSelect) langSelect.value = state.currentLang;

  if (!state.currentUser) {
    userCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; font-size: 28px; border: 2px solid var(--border); flex-shrink: 0;">
            👤
          </div>
          <div>
            <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 4px; color: var(--text-main);">Вы вошли как гость</h3>
            <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin: 0;">
              Войдите через Google или по Email бесплатно, чтобы читать и слушать все книги без ограничений.
            </p>
          </div>
        </div>
        <div style="display: flex; gap: 12px; flex-wrap: wrap;">
          <button class="btn-primary" onclick="triggerGoogleSignIn()">Войти через Google</button>
          <button class="btn-secondary" onclick="openAuthModal()">Войти по Email</button>
        </div>
      </div>
    `;
    if (adminCard) adminCard.style.display = 'none';
  } else {
    const u = state.currentUser;
    const avatarHtml = u.avatar && u.avatar.startsWith('http')
      ? `<img src="${escapeHtml(u.avatar)}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
      : `<span style="font-size: 30px;">${escapeHtml(u.avatar || '👤')}</span>`;

    userCard.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <div style="width: 64px; height: 64px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; border: 2px solid var(--border-strong); flex-shrink: 0; overflow: hidden; box-shadow: var(--shadow-sm);">
            ${avatarHtml}
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;">
              <h3 style="font-size: 19px; font-weight: 800; color: var(--text-main); margin: 0;">${escapeHtml(u.name)}</h3>
              <span class="badge ${u.role === 'admin' ? 'badge-admin' : 'badge-reader'}">
                ${u.role === 'admin' ? '👑 Администратор' : '📖 Читатель'}
              </span>
            </div>
            <p style="font-size: 13px; color: var(--text-muted); margin: 0;">${escapeHtml(u.email)}</p>
          </div>
        </div>

        <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
          <button class="btn-secondary" onclick="openProfileModal()">✏️ Редактировать профиль</button>
          <button class="btn-danger" onclick="logout()">Выйти</button>
        </div>
      </div>
    `;

    if (adminCard) {
      adminCard.style.display = (u.role === 'admin') ? 'block' : 'none';
    }
  }
}

function setAppTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';

  const segDark = document.getElementById('seg-theme-dark');
  const segLight = document.getElementById('seg-theme-light');
  if (segDark && segLight) {
    segDark.classList.toggle('active', theme === 'dark');
    segLight.classList.toggle('active', theme === 'light');
  }
  saveSettingsToStorage();
}

/* ==========================================================================
   12. Admin Panel CRUD: Books & Users
   ========================================================================== */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`adm-tab-${tab}`).classList.add('active');

  document.getElementById('adm-content-books').style.display = (tab === 'books') ? 'block' : 'none';
  document.getElementById('adm-content-add').style.display = (tab === 'add') ? 'block' : 'none';
  document.getElementById('adm-content-users').style.display = (tab === 'users') ? 'block' : 'none';
  document.getElementById('adm-content-backup').style.display = (tab === 'backup') ? 'block' : 'none';

  if (tab === 'books') renderAdminBooksTable();
  if (tab === 'users') renderAdminUsersTable();
}

function renderAdminBooksTable() {
  const tbody = document.getElementById('admin-books-table-body');
  const emptyEl = document.getElementById('admin-empty-books');
  if (!tbody || !emptyEl) return;

  if (state.books.length === 0) {
    tbody.innerHTML = '';
    emptyEl.style.display = 'block';
    return;
  }

  emptyEl.style.display = 'none';
  tbody.innerHTML = state.books.map(b => {
    const genreObj = GENRES.find(g => g.id === b.genre);
    const genreName = genreObj ? (genreObj.name[state.currentLang] || genreObj.name.ru) : b.genre;
    const isGDrive = b.audioUrl && (b.audioUrl.includes('drive.google.com') || b.audioUrl.includes('docs.google.com'));

    const coverSrc = (b.cover && (b.cover.startsWith('data:image') || b.cover.startsWith('http') || b.cover.startsWith('icons/')))
      ? b.cover
      : 'icons/icon-192.png';
    const coverThumb = `<img src="${escapeHtml(coverSrc)}" onerror="this.onerror=null;this.src='icons/icon-192.png';" style="width: 28px; height: 38px; object-fit: cover; border-radius: 4px; display: inline-block; vertical-align: middle;">`;

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 8px;">${coverThumb}</td>
        <td style="padding: 10px 8px; font-weight: 600;">${escapeHtml(b.title)}</td>
        <td style="padding: 10px 8px; color: var(--text-muted);">${escapeHtml(b.author)}</td>
        <td style="padding: 10px 8px;"><span class="badge" style="font-size: 11px;">${escapeHtml(genreName)}</span></td>
        <td style="padding: 10px 8px;">
          ${b.audioUrl ? (isGDrive ? '✓ Google Drive' : '✓ Аудиофайл') : '<span style="color:var(--text-sub)">—</span>'}
        </td>
        <td style="padding: 10px 8px; text-align: right;">
          <button class="btn-icon" style="display: inline-flex; width: 32px; height: 32px; font-size: 12px;" onclick="editBookInAdmin('${b.id}')" title="Редактировать">✏️</button>
          <button class="btn-icon" style="display: inline-flex; width: 32px; height: 32px; font-size: 12px; color: var(--danger);" onclick="deleteBook('${b.id}')" title="Удалить">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderAdminUsersTable() {
  const tbody = document.getElementById('admin-users-table-body');
  if (!tbody) return;

  tbody.innerHTML = state.users.map(u => {
    const isMainAdmin = (u.email === 'admin@elibrary.com');
    const avatarHtml = u.avatar && u.avatar.startsWith('http')
      ? `<img src="${escapeHtml(u.avatar)}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;">`
      : `<span style="font-size:16px;">${escapeHtml(u.avatar || '👤')}</span>`;

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 8px;">${avatarHtml}</td>
        <td style="padding: 10px 8px; font-weight: 600;">${escapeHtml(u.name)}</td>
        <td style="padding: 10px 8px; color: var(--text-muted);">${escapeHtml(u.email)}</td>
        <td style="padding: 10px 8px;">
          <span class="badge" style="${u.role === 'admin' ? 'background:var(--primary);color:#fff;' : ''}">
            ${u.role === 'admin' ? '👑 Admin' : '📖 Reader'}
          </span>
        </td>
        <td style="padding: 10px 8px; text-align: right;">
          ${!isMainAdmin ? `
            <button class="btn-icon" style="display:inline-flex; width:auto; padding:4px 8px; font-size:11px; border-radius:var(--radius-sm);" onclick="toggleUserRole('${u.id}')">
              ${u.role === 'admin' ? 'Сделать читателем' : 'Сделать админом'}
            </button>
            <button class="btn-icon" style="display:inline-flex; width:30px; height:30px; font-size:12px; color:var(--danger);" onclick="deleteUser('${u.id}')" title="Удалить">✕</button>
          ` : '<span style="font-size:11px; color:var(--text-sub);">Главный аккаунт</span>'}
        </td>
      </tr>
    `;
  }).join('');
}

function openCreateUserModal() {
  document.getElementById('admin-new-user-name').value = '';
  document.getElementById('admin-new-user-email').value = '';
  document.getElementById('admin-new-user-password').value = '';
  document.getElementById('create-user-modal').classList.add('active');
}

function closeCreateUserModal() {
  document.getElementById('create-user-modal').classList.remove('active');
}

function handleAdminCreateUser(e) {
  e.preventDefault();
  const name = document.getElementById('admin-new-user-name').value.trim();
  const email = document.getElementById('admin-new-user-email').value.trim().toLowerCase();
  const password = document.getElementById('admin-new-user-password').value.trim();
  const role = document.getElementById('admin-new-user-role').value;

  if (state.users.some(u => u.email === email)) {
    alert('Пользователь с таким email уже существует.');
    return;
  }

  state.users.push({
    id: 'usr_' + Date.now(),
    email,
    password,
    name,
    role,
    avatar: role === 'admin' ? '👑' : '📚',
    createdAt: Date.now()
  });

  saveUsersToStorage();
  closeCreateUserModal();
  renderAdminUsersTable();
  alert(`Пользователь ${name} успешно создан с ролью: ${role}`);
}

function toggleUserRole(userId) {
  const user = state.users.find(u => u.id === userId);
  if (!user) return;
  user.role = (user.role === 'admin') ? 'reader' : 'admin';
  saveUsersToStorage();
  renderAdminUsersTable();
  alert(`Роль пользователя ${user.name} изменена на: ${user.role}`);
}

function deleteUser(userId) {
  if (!confirm('Удалить этого пользователя?')) return;
  state.users = state.users.filter(u => u.id !== userId);
  saveUsersToStorage();
  renderAdminUsersTable();
}

/* ==========================================================================
   Book Cover Upload & Image Compression (Local file, no URL needed)
   ========================================================================== */
function handleCoverFileSelected(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const rawData = e.target.result;
    compressImage(rawData, 400, 560, 0.85, function(compressedData) {
      setUploadedCover(compressedData);
    });
  };
  reader.readAsDataURL(file);
}

function setUploadedCover(dataUrl) {
  const hiddenInput = document.getElementById('form-cover-data');
  const emptyBox = document.getElementById('cover-dropzone-empty');
  const filledBox = document.getElementById('cover-dropzone-filled');
  const previewImg = document.getElementById('cover-preview-img');

  if (hiddenInput) hiddenInput.value = dataUrl;
  if (previewImg) previewImg.src = dataUrl;
  if (emptyBox) emptyBox.style.display = 'none';
  if (filledBox) filledBox.style.display = 'flex';
}

function clearUploadedCover() {
  const hiddenInput = document.getElementById('form-cover-data');
  const fileInput = document.getElementById('form-cover-file');
  const emptyBox = document.getElementById('cover-dropzone-empty');
  const filledBox = document.getElementById('cover-dropzone-filled');
  const previewImg = document.getElementById('cover-preview-img');

  if (hiddenInput) hiddenInput.value = '';
  if (fileInput) fileInput.value = '';
  if (previewImg) previewImg.src = '';
  if (emptyBox) emptyBox.style.display = 'block';
  if (filledBox) filledBox.style.display = 'none';
}

function compressImage(srcData, maxWidth, maxHeight, quality, callback) {
  const img = new Image();
  img.onload = function() {
    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = Math.round((height * maxWidth) / width);
      width = maxWidth;
    }
    if (height > maxHeight) {
      width = Math.round((width * maxHeight) / height);
      height = maxHeight;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    try {
      const compressed = canvas.toDataURL('image/jpeg', quality || 0.85);
      callback(compressed);
    } catch (e) {
      callback(srcData);
    }
  };
  img.onerror = function() {
    callback(srcData);
  };
  img.src = srcData;
}

function resetBookForm() {
  const idEl = document.getElementById('form-book-id');
  if (idEl) idEl.value = '';
  const titleEl = document.getElementById('form-title');
  if (titleEl) titleEl.value = '';
  const authorEl = document.getElementById('form-author');
  if (authorEl) authorEl.value = '';
  const genreEl = document.getElementById('form-genre');
  if (genreEl) genreEl.value = 'history';
  clearUploadedCover();
  const synEl = document.getElementById('form-synopsis');
  if (synEl) synEl.value = '';
  const audEl = document.getElementById('form-audio-url');
  if (audEl) audEl.value = '';
  const txtEl = document.getElementById('form-text');
  if (txtEl) txtEl.value = '';
  const quizEl = document.getElementById('form-quiz-json');
  if (quizEl) quizEl.value = '';
  const testStatus = document.getElementById('audio-test-status');
  if (testStatus) testStatus.textContent = '';
}

function openAddBookTab() {
  resetBookForm();
  switchAdminTab('add');
}

function editBookInAdmin(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('form-book-id').value = book.id;
  document.getElementById('form-title').value = book.title || '';
  document.getElementById('form-author').value = book.author || '';
  document.getElementById('form-genre').value = book.genre || 'history';
  
  if (book.cover && (book.cover.startsWith('data:image') || book.cover.startsWith('http') || book.cover.startsWith('icons/'))) {
    setUploadedCover(book.cover);
  } else {
    clearUploadedCover();
  }

  document.getElementById('form-synopsis').value = book.synopsis || '';
  document.getElementById('form-audio-url').value = book.audioUrl || '';
  document.getElementById('form-text').value = book.text || '';
  document.getElementById('form-quiz-json').value = book.quiz ? JSON.stringify(book.quiz, null, 2) : '';
  const testStatus = document.getElementById('audio-test-status');
  if (testStatus) testStatus.textContent = '';

  navigate('admin');
  switchAdminTab('add');
}

function handleSaveBook(event) {
  event.preventDefault();

  const id = document.getElementById('form-book-id').value || ('book_' + Date.now());
  const title = document.getElementById('form-title').value.trim();
  const author = document.getElementById('form-author').value.trim();
  const genre = document.getElementById('form-genre').value;
  const coverHidden = document.getElementById('form-cover-data');
  const cover = (coverHidden && coverHidden.value.trim()) ? coverHidden.value.trim() : 'icons/icon-512.png';
  const synopsis = document.getElementById('form-synopsis').value.trim();
  const audioUrl = sanitizeUrl(document.getElementById('form-audio-url').value.trim());
  const text = document.getElementById('form-text').value.trim();
  const quizJson = document.getElementById('form-quiz-json').value.trim();

  let quiz = null;
  if (quizJson) {
    try {
      quiz = JSON.parse(quizJson);
    } catch (e) {
      alert('Ошибка в формате JSON для теста. Вопросы должны быть массивом объектов.');
      return;
    }
  }

  const existingIndex = state.books.findIndex(b => b.id === id);
  const bookData = {
    id,
    title,
    author,
    genre,
    cover,
    synopsis,
    audioUrl,
    text,
    quiz,
    updatedAt: Date.now()
  };

  if (existingIndex >= 0) {
    state.books[existingIndex] = bookData;
  } else {
    state.books.unshift(bookData);
  }

  saveBooksToStorage();
  renderAll();
  switchAdminTab('books');
  alert('Книга успешно сохранена в библиотеке!');
}

function deleteBook(bookId) {
  if (!confirm('Удалить эту книгу?')) return;
  state.books = state.books.filter(b => b.id !== bookId);
  saveBooksToStorage();
  renderAll();
}

function confirmClearAllBooks() {
  if (!confirm('ВНИМАНИЕ! Это действие удалит ВСЕ книги из библиотеки. Продолжить?')) return;
  state.books = [];
  saveBooksToStorage();
  renderAll();
  alert('Все книги удалены.');
}

function exportLibraryJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.books, null, 2));
  const a = document.createElement('a');
  a.setAttribute("href", dataStr);
  a.setAttribute("download", `elibrary_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function importLibraryJSON(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        state.books = imported;
        saveBooksToStorage();
        renderAll();
        alert(`Успешно импортировано ${imported.length} книг!`);
      } else {
        alert('Неверный формат файла JSON.');
      }
    } catch (err) {
      alert('Ошибка при чтении файла: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function renderStats() {
  const totalEl = document.getElementById('stat-total-books');
  const audioEl = document.getElementById('stat-audio-books');
  const bmEl = document.getElementById('stat-bookmarks-count');

  if (totalEl) totalEl.textContent = state.books.length;
  if (audioEl) audioEl.textContent = state.books.filter(b => !!b.audioUrl).length;
  if (bmEl) bmEl.textContent = state.bookmarks.length;
}

function toggleTheme() {
  setAppTheme(state.theme === 'dark' ? 'light' : 'dark');
}

function setAppTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  const icon = document.getElementById('theme-toggle-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
  saveSettingsToStorage();
}

function applyTheme(theme) {
  setAppTheme(theme);
}

function changeLanguage(lang) {
  if (!I18N[lang]) return;
  state.currentLang = lang;
  applyLanguage(lang);
  saveSettingsToStorage();
  renderAll();
}

function applyLanguage(lang) {
  const dict = I18N[lang] || I18N.ru;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
  const lSelect = document.getElementById('lang-select');
  const sSelect = document.getElementById('settings-lang-select');
  if (lSelect) lSelect.value = lang;
  if (sSelect) sSelect.value = lang;
}

function openMobileMenu() {
  navigate('settings');
}

document.addEventListener('DOMContentLoaded', initApp);
