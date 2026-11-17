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
  { id: 'history',    emoji: '🏛️', name: { ru: 'История',      tj: 'Таърих',        en: 'History' } },
  { id: 'poetry',     emoji: '📜', name: { ru: 'Поэзия',       tj: 'Шеър',          en: 'Poetry' } },
  { id: 'philosophy', emoji: '🗿', name: { ru: 'Философия',    tj: 'Фалсафа',       en: 'Philosophy' } },
  { id: 'education',  emoji: '🎓', name: { ru: 'Образование',  tj: 'Маориф',        en: 'Education' } },
  { id: 'business',   emoji: '💼', name: { ru: 'Бизнес',       tj: 'Бизнес',        en: 'Business' } },
  { id: 'math',       emoji: '🧮', name: { ru: 'Математика',   tj: 'Математика',    en: 'Mathematics' } },
  { id: 'science',    emoji: '🔬', name: { ru: 'Наука',        tj: 'Илм',           en: 'Science' } },
  { id: 'english',    emoji: '🇬🇧', name: { ru: 'Английский',   tj: 'Забони англисӣ',en: 'English' } },
  { id: 'biography',  emoji: '👤', name: { ru: 'Биография',   tj: 'Тарҷимаиҳол',   en: 'Biography' } },
  { id: 'art',        emoji: '🎨', name: { ru: 'Искусство',    tj: 'Санъат',        en: 'Art' } }
];

const AVATAR_PRESETS = ['👑', '🦁', '🦉', '🚀', '📚', '🎧', '⚡', '🌟'];

const I18N = {
  ru: {
    navMenu: "МЕНЮ",
    navHome: "Главная",
    navGenres: "Жанры",
    navBookmarks: "Закладки",
    navStats: "Статистика",
    navPreferences: "НАСТРОЙКИ",
    navSettings: "Настройки и Профиль",
    searchPlaceholder: "Поиск книг, авторов, жанров...",
    heroTag: "✨ Цифровая библиотека",
    heroTitle: "Читайте и слушайте в любом месте",
    heroDesc: "Адаптировано для компьютеров Mac и смартфонов. Прямое воспроизведение аудиокниг через Google Drive и персональная библиотека.",
    exploreGenres: "Выбрать жанр",
    categoriesTitle: "Категории",
    categoriesSubtitle: "Выберите категорию для быстрого поиска",
    allBooksTitle: "Книги в библиотеке",
    emptyLibTitle: "Библиотека пуста",
    emptyLibDesc: "Все старые книги удалены. Добавьте свои первые книги и аудиокниги с Google Drive через удобную панель управления в Настройках!",
    genresCatalog: "Каталог жанров",
    genresCatalogSub: "Исследуйте книги по тематическим разделам",
    adminTitle: "Панель администратора",
    formTitle: "Название книги *",
    formAuthor: "Автор *",
    formGenre: "Жанр / Категория *",
    formCover: "Обложка (эмодзи или ссылка на изображение)",
    formSynopsis: "Краткое описание / О книге",
    formText: "Текст книги (для чтения)",
    cancelBtn: "Отмена",
    saveBookBtn: "💾 Сохранить книгу",
    bookmarksTitle: "Мои закладки",
    bookmarksSubtitle: "Сохранённые цитаты и страницы",
    statsTitle: "Статистика библиотеки",
    statsSubtitle: "Активность и статистика вашей библиотеки",
    settingsTitle: "Настройки и Профиль",
    settingsSubtitle: "Управление вашим аккаунтом, безопасность и параметры чтения"
  },
  tj: {
    navMenu: "МЕНЮ",
    navHome: "Асосӣ",
    navGenres: "Жанрҳо",
    navBookmarks: "Хатчӯбҳо",
    navStats: "Омор",
    navPreferences: "ТАНЗИМОТ",
    navSettings: "Танзимот ва Профил",
    searchPlaceholder: "Ҷустуҷӯи китобҳо, муаллифон...",
    heroTag: "✨ Китобхонаи рақамӣ",
    heroTitle: "Дар ҳар ҷо бихонед ва гӯш кунед",
    heroDesc: "Барои компютерҳои Mac ва телефонҳои мобилӣ мутобиқ карда шудааст. Пахши мустақими китобҳои аудиоӣ тавассути Google Drive.",
    exploreGenres: "Интихоби жанр",
    categoriesTitle: "Категорияҳо",
    categoriesSubtitle: "Барои ҷустуҷӯи зуд категорияро интихоб кунед",
    allBooksTitle: "Китобҳо дар китобхона",
    emptyLibTitle: "Китобхона холӣ аст",
    emptyLibDesc: "Ҳамаи китобҳои кӯҳна тоза карда шуданд. Китобҳои нави худро тавассути танзимот илова кунед!",
    genresCatalog: "Каталоги жанрҳо",
    genresCatalogSub: "Китобҳоро аз рӯи фаслҳо пайдо кунед",
    adminTitle: "Панели идоракунӣ",
    formTitle: "Номи китоб *",
    formAuthor: "Муаллиф *",
    formGenre: "Жанр / Категория *",
    formCover: "Муқова (эмодзӣ ё пайванди акс)",
    formSynopsis: "Дар бораи китоб",
    formText: "Матни китоб (барои хондан)",
    cancelBtn: "Бекор кардан",
    saveBookBtn: "💾 Сабти китоб",
    bookmarksTitle: "Хатчӯбҳои ман",
    bookmarksSubtitle: "Порчаҳои захирашуда",
    statsTitle: "Омори китобхона",
    statsSubtitle: "Фаъолият ва омори китобхонаи шумо",
    settingsTitle: "Танзимот ва Профил",
    settingsSubtitle: "Идоракунии аккаунт ва намуди зоҳирӣ"
  },
  en: {
    navMenu: "MENU",
    navHome: "Home",
    navGenres: "Genres",
    navBookmarks: "Bookmarks",
    navStats: "Statistics",
    navPreferences: "PREFERENCES",
    navSettings: "Settings & Profile",
    searchPlaceholder: "Search books, authors, genres...",
    heroTag: "✨ Digital Library",
    heroTitle: "Read & Listen Anywhere",
    heroDesc: "Optimized for Mac computers and smartphones. Direct Google Drive audio playback and custom personal library.",
    exploreGenres: "Explore Genres",
    categoriesTitle: "Categories",
    categoriesSubtitle: "Select a genre to discover titles",
    allBooksTitle: "Library Catalog",
    emptyLibTitle: "Library is empty",
    emptyLibDesc: "All sample books have been removed. Add your custom books via Settings Admin Panel!",
    genresCatalog: "Genres Catalog",
    genresCatalogSub: "Explore titles grouped by genre",
    adminTitle: "Admin Panel",
    formTitle: "Book Title *",
    formAuthor: "Author *",
    formGenre: "Genre / Category *",
    formCover: "Cover (emoji or image link)",
    formSynopsis: "Synopsis / About the book",
    formText: "Book Text (for reading)",
    cancelBtn: "Cancel",
    saveBookBtn: "💾 Save Book",
    bookmarksTitle: "My Bookmarks",
    bookmarksSubtitle: "Saved passages and notes",
    statsTitle: "Library Statistics",
    statsSubtitle: "Your library activity & stats",
    settingsTitle: "Settings & Profile",
    settingsSubtitle: "Account management, security & reader options"
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

  const embedSection = document.getElementById('gdrive-embed-section');
  const embedIframe = document.getElementById('gdrive-embed-iframe');

  if (sources.isGDrive) {
    embedSection.style.display = 'block';
    if (embedIframe) embedIframe.src = sources.embedUrl;
  } else {
    embedSection.style.display = 'none';
    if (embedIframe) embedIframe.src = '';
  }

  globalAudio.src = sources.streamUrl;
  globalAudio.playbackRate = state.playbackSpeed;
  globalAudio.load();

  globalAudio.play().then(() => {
    state.isPlaying = true;
    updatePlayPauseButtons();
  }).catch(() => {
    state.isPlaying = false;
    updatePlayPauseButtons();
  });

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

  if (book.cover && book.cover.startsWith('http')) {
    thumb.innerHTML = `<img src="${escapeHtml(book.cover)}" alt="cover" style="width:100%;height:100%;object-fit:cover;">`;
  } else if (book.cover && book.cover.length <= 4) {
    thumb.textContent = book.cover;
  } else {
    thumb.innerHTML = `<img src="icons/icon-192.png" alt="cover" style="width:100%;height:100%;object-fit:cover;">`;
  }

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
  const sidebarMatch = document.querySelector(`#sidebar button[onclick*="'${screenName}'"]`);
  if (sidebarMatch) sidebarMatch.classList.add('active');

  document.querySelectorAll('#mobile-nav .mobile-nav-item').forEach(m => m.classList.remove('active'));
  const mobileMatch = document.querySelector(`#mobile-nav button[onclick*="'${screenName}'"]`);
  if (mobileMatch) mobileMatch.classList.add('active');
}

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
      <button class="btn-primary" style="padding: 7px 14px; font-size: 12px;" onclick="openAuthModal()">
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
        ${u.role === 'admin' ? '<span class="badge" style="font-size:10px; padding:2px 6px; background:var(--primary);">Admin</span>' : ''}
      </div>
    `;
  }
}

function renderHome() {
  const genreGrid = document.getElementById('home-genres-grid');
  if (genreGrid) {
    genreGrid.innerHTML = GENRES.slice(0, 6).map(g => `
      <div class="genre-card ${state.selectedGenre === g.id ? 'active' : ''}" onclick="filterByGenre('${g.id}')">
        <div class="genre-emoji">${g.emoji}</div>
        <div class="genre-name">${escapeHtml(g.name[state.currentLang] || g.name.ru)}</div>
        <div class="genre-count">${getBookCountForGenre(g.id)} книг</div>
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

  const coverHtml = (book.cover && book.cover.startsWith('http'))
    ? `<img src="${escapeHtml(book.cover)}" class="book-cover-img" alt="${escapeHtml(book.title)}">`
    : (book.cover && book.cover.length <= 4)
      ? `<span class="book-cover-emoji">${escapeHtml(book.cover)}</span>`
      : `<img src="icons/icon-192.png" class="book-cover-img" style="padding:16px;object-fit:contain" alt="${escapeHtml(book.title)}">`;

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
      <div class="genre-card ${state.selectedGenre === g.id ? 'active' : ''}" onclick="selectGenreTab('${g.id}')">
        <div class="genre-emoji">${g.emoji}</div>
        <div class="genre-name">${escapeHtml(g.name[state.currentLang] || g.name.ru)}</div>
        <div class="genre-count">${getBookCountForGenre(g.id)} книг</div>
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

  const coverHtml = (b.cover && b.cover.startsWith('http'))
    ? `<img src="${escapeHtml(b.cover)}" alt="${escapeHtml(b.title)}">`
    : (b.cover && b.cover.length <= 4)
      ? `<span>${escapeHtml(b.cover)}</span>`
      : `<img src="icons/icon-512.png" alt="${escapeHtml(b.title)}" style="width:100%;height:100%;object-fit:cover">`;

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
  const badgeType = document.getElementById('player-badge-type');

  if (titleEl) titleEl.textContent = b.title;
  if (authorEl) authorEl.textContent = b.author;

  if (coverBox) {
    if (b.cover && b.cover.startsWith('http')) {
      coverBox.innerHTML = `<img src="${escapeHtml(b.cover)}" alt="cover">`;
    } else if (b.cover && b.cover.length <= 4) {
      coverBox.textContent = b.cover;
    } else {
      coverBox.innerHTML = `<img src="icons/icon-512.png" alt="cover" style="width:100%;height:100%;object-fit:cover">`;
    }
  }

  const sources = resolveAudioSources(b.audioUrl);
  if (badgeType) badgeType.textContent = sources.isGDrive ? 'Google Drive Audio' : 'Аудиопоток';

  updatePlayPauseButtons();
  updateAudioUI();
}

/* ==========================================================================
   11. Settings & Admin Portal Access
   ========================================================================== */
function renderSettingsScreen() {
  const userCard = document.getElementById('settings-user-card');
  const adminCard = document.getElementById('settings-admin-card');

  if (!state.currentUser) {
    userCard.innerHTML = `
      <div style="text-align: center; padding: 12px;">
        <div style="font-size: 40px; margin-bottom: 8px;">👤</div>
        <h3 style="font-size: 17px; font-weight: 800; margin-bottom: 6px;">Вы вошли как гость</h3>
        <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 18px;">
          Войдите через Google или по Email бесплатно, чтобы получить полный доступ ко всем книгам и аудиокнигам!
        </p>
        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          <button class="btn-primary" onclick="triggerGoogleSignIn()">Войти через Google</button>
          <button class="btn-icon" style="width: auto; padding: 0 16px; border-radius: var(--radius-md);" onclick="openAuthModal()">Войти по Email</button>
        </div>
      </div>
    `;
    adminCard.style.display = 'none';
  } else {
    const u = state.currentUser;
    const avatarHtml = u.avatar && u.avatar.startsWith('http')
      ? `<img src="${escapeHtml(u.avatar)}" style="width: 54px; height: 54px; border-radius: 50%; object-fit: cover;">`
      : `<span style="font-size: 36px;">${escapeHtml(u.avatar || '👤')}</span>`;

    userCard.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
        <div style="width: 58px; height: 58px; border-radius: 50%; background: var(--bg-card); display: flex; align-items: center; justify-content: center; border: 2px solid var(--border);">
          ${avatarHtml}
        </div>
        <div>
          <h3 style="font-size: 17px; font-weight: 800;">${escapeHtml(u.name)}</h3>
          <p style="font-size: 12px; color: var(--text-muted);">${escapeHtml(u.email)}</p>
          <span class="badge" style="margin-top: 4px; ${u.role === 'admin' ? 'background:var(--primary); color:#fff;' : ''}">
            ${u.role === 'admin' ? '👑 Администратор' : '📖 Читатель'}
          </span>
        </div>
      </div>

      <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn-primary" style="font-size: 12px; padding: 6px 14px;" onclick="openProfileModal()">Редактировать профиль</button>
        <button class="btn-icon" style="width: auto; padding: 0 14px; font-size: 12px; border-radius: var(--radius-md); color: var(--danger); border-color: var(--danger);" onclick="logout()">Выйти</button>
      </div>
    `;

    // Only display Admin Card if user has role 'admin'
    adminCard.style.display = (u.role === 'admin') ? 'block' : 'none';
  }
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

    return `
      <tr style="border-bottom: 1px solid var(--border);">
        <td style="padding: 10px 8px; font-size: 20px;">${escapeHtml(b.cover || '📖')}</td>
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

function editBookInAdmin(bookId) {
  const book = state.books.find(b => b.id === bookId);
  if (!book) return;

  document.getElementById('form-book-id').value = book.id;
  document.getElementById('form-title').value = book.title || '';
  document.getElementById('form-author').value = book.author || '';
  document.getElementById('form-genre').value = book.genre || 'history';
  document.getElementById('form-cover').value = book.cover || '';
  document.getElementById('form-synopsis').value = book.synopsis || '';
  document.getElementById('form-audio-url').value = book.audioUrl || '';
  document.getElementById('form-text').value = book.text || '';
  document.getElementById('form-quiz-json').value = book.quiz ? JSON.stringify(book.quiz, null, 2) : '';
  document.getElementById('audio-test-status').textContent = '';

  navigate('admin');
  switchAdminTab('add');
}

function handleSaveBook(event) {
  event.preventDefault();

  const id = document.getElementById('form-book-id').value || ('book_' + Date.now());
  const title = document.getElementById('form-title').value.trim();
  const author = document.getElementById('form-author').value.trim();
  const genre = document.getElementById('form-genre').value;
  const cover = document.getElementById('form-cover').value.trim() || '📖';
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
