/**
 * eLibrary — Core Application Script
 * Features: Responsive Mac & Mobile UI, Google Drive Audio Engine,
 * Clean Empty Initial State, Visible Secure Admin Panel, i18n (RU/TJ/EN).
 */

/* ==========================================================================
   1. State & Storage
   ========================================================================== */
const STORAGE_KEYS = {
  BOOKS: 'elibrary_books_v2',
  SETTINGS: 'elibrary_settings_v2',
  BOOKMARKS: 'elibrary_bookmarks_v2',
  STATS: 'elibrary_stats_v2'
};

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

const I18N = {
  ru: {
    navMenu: "МЕНЮ",
    navHome: "Главная",
    navGenres: "Жанры",
    navBookmarks: "Закладки",
    navStats: "Статистика",
    navManagement: "УПРАВЛЕНИЕ",
    navAdmin: "Админ-панель",
    navPreferences: "НАСТРОЙКИ",
    navSettings: "Настройки",
    searchPlaceholder: "Поиск книг, авторов, жанров...",
    addBookBtn: "Добавить книгу",
    heroTag: "✨ Цифровая библиотека",
    heroTitle: "Читайте и слушайте в любом месте",
    heroDesc: "Адаптировано для компьютеров Mac и смартфонов. Прямое воспроизведение аудиокниг через Google Drive и персональная библиотека.",
    exploreGenres: "Выбрать жанр",
    goToAdmin: "Панель управления →",
    categoriesTitle: "Категории",
    categoriesSubtitle: "Выберите категорию для быстрого поиска",
    allBooksTitle: "Книги в библиотеке",
    emptyLibTitle: "Библиотека пуста",
    emptyLibDesc: "Все старые книги удалены. Добавьте свои первые книги и аудиокниги с Google Drive через удобную панель управления!",
    addFirstBook: "Добавить первую книгу",
    genresCatalog: "Каталог жанров",
    genresCatalogSub: "Исследуйте книги по тематическим разделам",
    adminTitle: "Панель управления",
    adminSubtitle: "Управление библиотекой, добавление книг и аудиокниг Google Drive",
    adminNewBook: "Новая книга",
    adminTabBooks: "📚 Книги в базе",
    adminTabAdd: "➕ Добавить / Редактировать",
    adminTabBackup: "💾 Бэкап и Безопасность",
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
    settingsTitle: "Настройки",
    settingsSubtitle: "Тема оформления, язык и параметры чтения",
    readBtn: "Читать",
    listenBtn: "Слушать аудиокнигу",
    authorLabel: "Автор",
    genreLabel: "Жанр",
    audioAvailable: "🎧 Есть аудиоверсия",
    audioNotAvailable: "📖 Только текст",
    confirmDelete: "Вы уверены, что хотите удалить эту книгу?",
    confirmClearAll: "ВНИМАНИЕ! Это действие удалит ВСЕ книги из библиотеки. Продолжить?",
    bookSaved: "Книга успешно сохранена!",
    bookDeleted: "Книга удалена."
  },
  tj: {
    navMenu: "МЕНЮ",
    navHome: "Асосӣ",
    navGenres: "Жанрҳо",
    navBookmarks: "Хатчӯбҳо",
    navStats: "Омор",
    navManagement: "ИДОРАКУНӢ",
    navAdmin: "Панели админ",
    navPreferences: "ТАНЗИМОТ",
    navSettings: "Танзимот",
    searchPlaceholder: "Ҷустуҷӯи китобҳо, муаллифон...",
    addBookBtn: "Иловаи китоб",
    heroTag: "✨ Китобхонаи рақамӣ",
    heroTitle: "Дар ҳар ҷо бихонед ва гӯш кунед",
    heroDesc: "Барои компютерҳои Mac ва телефонҳои мобилӣ мутобиқ карда шудааст. Пахши мустақими китобҳои аудиоӣ тавассути Google Drive.",
    exploreGenres: "Интихоби жанр",
    goToAdmin: "Панели идоракунӣ →",
    categoriesTitle: "Категорияҳо",
    categoriesSubtitle: "Барои ҷустуҷӯи зуд категорияро интихоб кунед",
    allBooksTitle: "Китобҳо дар китобхона",
    emptyLibTitle: "Китобхона холӣ аст",
    emptyLibDesc: "Ҳамаи китобҳои кӯҳна тоза карда шуданд. Китобҳо ва аудиокитобҳои аввалини худро тавассути панели идоракунӣ илова кунед!",
    addFirstBook: "Илова кардани китоби аввал",
    genresCatalog: "Каталоги жанрҳо",
    genresCatalogSub: "Китобҳоро аз рӯи фаслҳо пайдо кунед",
    adminTitle: "Панели идоракунӣ",
    adminSubtitle: "Идоракунии китобхона ва пайвасти аудиокитобҳои Google Drive",
    adminNewBook: "Китоби нав",
    adminTabBooks: "📚 Китобҳои мавҷуда",
    adminTabAdd: "➕ Илова / Таҳрир",
    adminTabBackup: "💾 Нусхабардорӣ ва амният",
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
    settingsTitle: "Танзимот",
    settingsSubtitle: "Намуди зоҳирӣ, забон ва андозаи ҳарфҳо",
    readBtn: "Хондан",
    listenBtn: "Гӯш кардани аудио",
    authorLabel: "Муаллиф",
    genreLabel: "Жанр",
    audioAvailable: "🎧 Нусхаи аудиоӣ ҳаст",
    audioNotAvailable: "📖 Танҳо матн",
    confirmDelete: "Оё шумо дар ҳақиқат мехоҳед ин китобро нест кунед?",
    confirmClearAll: "ДИҚҚАТ! Ин амал ҲАМАИ китобҳоро аз китобхона нест мекунад. Давом диҳем?",
    bookSaved: "Китоб бомуваффақият сабт шуд!",
    bookDeleted: "Китоб нест карда шуд."
  },
  en: {
    navMenu: "MENU",
    navHome: "Home",
    navGenres: "Genres",
    navBookmarks: "Bookmarks",
    navStats: "Statistics",
    navManagement: "MANAGEMENT",
    navAdmin: "Admin Panel",
    navPreferences: "PREFERENCES",
    navSettings: "Settings",
    searchPlaceholder: "Search books, authors, genres...",
    addBookBtn: "Add Book",
    heroTag: "✨ Digital Library",
    heroTitle: "Read & Listen Anywhere",
    heroDesc: "Optimized for Mac computers and smartphones. Direct Google Drive audio playback and custom personal library.",
    exploreGenres: "Explore Genres",
    goToAdmin: "Control Panel →",
    categoriesTitle: "Categories",
    categoriesSubtitle: "Select a genre to discover titles",
    allBooksTitle: "Library Catalog",
    emptyLibTitle: "Library is empty",
    emptyLibDesc: "All sample books have been removed. Add your custom books and Google Drive audiobooks via the Admin Panel!",
    addFirstBook: "Add First Book",
    genresCatalog: "Genres Catalog",
    genresCatalogSub: "Explore titles grouped by genre",
    adminTitle: "Admin Panel",
    adminSubtitle: "Manage your library catalog and Google Drive audiobooks",
    adminNewBook: "New Book",
    adminTabBooks: "📚 Catalog Books",
    adminTabAdd: "➕ Add / Edit Book",
    adminTabBackup: "💾 Backup & Security",
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
    settingsTitle: "Settings",
    settingsSubtitle: "Theme, interface language and reader preferences",
    readBtn: "Read Now",
    listenBtn: "Listen Audiobook",
    authorLabel: "Author",
    genreLabel: "Genre",
    audioAvailable: "🎧 Audiobook available",
    audioNotAvailable: "📖 Text only",
    confirmDelete: "Are you sure you want to delete this book?",
    confirmClearAll: "WARNING! This will delete ALL books from your library. Continue?",
    bookSaved: "Book saved successfully!",
    bookDeleted: "Book deleted."
  }
};

// Global App State
let state = {
  currentLang: 'ru',
  theme: 'dark',
  fontSize: 17,
  activeScreen: 'home',
  books: [], // Starts completely empty as requested: "удали все книги которые у него есть"
  currentBook: null,
  activeAudioBook: null,
  isPlaying: false,
  audioDuration: 0,
  audioCurrentTime: 0,
  playbackSpeed: 1.0,
  playerMode: 'html5', // 'html5' or 'embed'
  bookmarks: [],
  searchQuery: '',
  selectedGenre: null
};

// Audio Element Reference
const globalAudio = document.getElementById('global-audio');

/* ==========================================================================
   2. Initialization & Safe Storage Layer
   ========================================================================== */
function initApp() {
  loadStoredData();
  applyTheme(state.theme);
  applyLanguage(state.currentLang);
  setupAudioListeners();
  setupKeyboardShortcuts();
  renderAll();
}

function loadStoredData() {
  // Load Books
  try {
    const rawBooks = localStorage.getItem(STORAGE_KEYS.BOOKS);
    if (rawBooks) {
      state.books = JSON.parse(rawBooks) || [];
    } else {
      // Empty by default: all books removed!
      state.books = [];
    }
  } catch (e) {
    console.error('Error loading books from localStorage:', e);
    state.books = [];
  }

  // Load Settings
  try {
    const rawSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (rawSettings) {
      const s = JSON.parse(rawSettings);
      if (s.theme) state.theme = s.theme;
      if (s.lang) state.currentLang = s.lang;
      if (s.fontSize) state.fontSize = s.fontSize;
    }
  } catch (e) {}

  // Load Bookmarks
  try {
    const rawBm = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    if (rawBm) state.bookmarks = JSON.parse(rawBm) || [];
  } catch (e) {}
}

function saveBooksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(state.books));
  } catch (e) {
    console.error('Failed to save books:', e);
    alert('Не удалось сохранить в память браузера (возможно превышен лимит хранилища).');
  }
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

function saveBookmarksToStorage() {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(state.bookmarks));
  } catch (e) {}
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
   4. Google Drive Audio Player Engine
   ========================================================================== */
function extractGoogleDriveId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  
  // Format 1: https://drive.google.com/file/d/FILE_ID/view...
  const match1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{15,})/);
  if (match1) return match1[1];
  
  // Format 2: https://drive.google.com/open?id=FILE_ID or uc?id=FILE_ID
  const match2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{15,})/);
  if (match2) return match2[1];
  
  // Format 3: https://drive.google.com/uc?export=download&id=FILE_ID
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
      streamFallback: `https://drive.usercontent.google.com/download?id=${gdriveId}&export=download`,
      embedUrl: `https://drive.google.com/file/d/${gdriveId}/preview`,
      isGDrive: true,
      fileId: gdriveId
    };
  }

  // Dropbox support
  if (sanitized.includes('dropbox.com')) {
    const dbUrl = sanitized.replace(/[?&]dl=[01]/g, '').replace(/\?([^#]*)$/, '?$1&raw=1');
    return {
      streamUrl: dbUrl.includes('raw=1') ? dbUrl : `${dbUrl}?raw=1`,
      embedUrl: '',
      isGDrive: false
    };
  }

  // Direct MP3/M4A/AAC/Web audio
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

  globalAudio.addEventListener('error', (e) => {
    console.warn('HTML5 Audio playback error/warning:', e);
    // If it's Google Drive and HTML5 direct stream had CORS issues, auto-suggest or switch to Embed Player
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

  // Setup HTML5 Audio stream
  globalAudio.src = sources.streamUrl;
  globalAudio.playbackRate = state.playbackSpeed;
  globalAudio.load();

  globalAudio.play().then(() => {
    state.isPlaying = true;
    updatePlayPauseButtons();
  }).catch((err) => {
    console.log('Audio autoplay prevented or CORS stream blocked:', err);
    // Still show player UI & offer Embed Player
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
  globalAudio.currentTime = Math.max(0, Math.min(globalAudio.duration, globalAudio.currentTime + seconds));
}

function seekAudio(event) {
  if (!globalAudio || !globalAudio.duration) return;
  const bar = document.getElementById('timeline-bar');
  if (!bar) return;
  const rect = bar.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  globalAudio.currentTime = ratio * globalAudio.duration;
}

function seekMiniAudio(event) {
  if (!globalAudio || !globalAudio.duration) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  globalAudio.currentTime = ratio * globalAudio.duration;
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

  // Full player UI
  const curEl = document.getElementById('player-current-time');
  const durEl = document.getElementById('player-duration-time');
  const progFill = document.getElementById('timeline-progress');
  if (curEl) curEl.textContent = currentFormatted;
  if (durEl && durEl.textContent !== 'Google Плеер') durEl.textContent = durationFormatted;
  if (progFill) progFill.style.width = percent + '%';

  // Mini player UI
  const miniFill = document.getElementById('mini-progress-fill');
  if (miniFill) miniFill.style.width = percent + '%';
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
   5. Keyboard Shortcuts (Mac & Desktop Experience)
   ========================================================================== */
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering shortcuts while typing in form inputs
    const targetTag = e.target.tagName.toLowerCase();
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select') {
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      toggleAudioPlay();
    } else if (e.code === 'ArrowLeft') {
      skipAudio(-10);
    } else if (e.code === 'ArrowRight') {
      skipAudio(10);
    } else if (e.code === 'Escape') {
      if (state.activeScreen === 'reader' || state.activeScreen === 'player') {
        backToDetail();
      }
    }
  });
}

/* ==========================================================================
   6. Navigation & Screen Routing
   ========================================================================== */
function navigate(screenName, params = {}) {
  state.activeScreen = screenName;

  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(`screen-${screenName}`);
  if (target) {
    target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Update navigation items
  updateNavState(screenName);

  // Screen specific rendering
  if (screenName === 'home') {
    renderHome();
  } else if (screenName === 'genres') {
    renderGenresScreen();
  } else if (screenName === 'book-detail') {
    renderBookDetail();
  } else if (screenName === 'reader') {
    renderReader();
  } else if (screenName === 'player') {
    renderFullPlayerScreen();
  } else if (screenName === 'admin') {
    renderAdminBooksTable();
  } else if (screenName === 'bookmarks') {
    renderBookmarks();
  } else if (screenName === 'stats') {
    renderStats();
  }
}

function updateNavState(screenName) {
  // Desktop sidebar links
  document.querySelectorAll('#sidebar .nav-link').forEach(link => {
    link.classList.remove('active');
  });

  const sidebarMatch = document.querySelector(`#sidebar button[onclick*="'${screenName}'"]`);
  if (sidebarMatch) sidebarMatch.classList.add('active');

  // Mobile nav
  document.querySelectorAll('#mobile-nav .mobile-nav-item').forEach(item => {
    item.classList.remove('active');
  });
  const mobileMatch = document.querySelector(`#mobile-nav button[onclick*="'${screenName}'"]`);
  if (mobileMatch) mobileMatch.classList.add('active');
}

function backToDetail() {
  if (state.currentBook) {
    navigate('book-detail');
  } else {
    navigate('home');
  }
}

/* ==========================================================================
   7. Rendering Functions
   ========================================================================== */
function renderAll() {
  renderHome();
  renderGenresScreen();
  renderAdminBooksTable();
  renderStats();
}

function renderHome() {
  // Render quick genre pills
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

  // Render books
  renderBooksGrid();
}

function renderBooksGrid() {
  const grid = document.getElementById('home-books-grid');
  const emptyState = document.getElementById('home-empty-state');
  const countSubtitle = document.getElementById('books-count-subtitle');
  if (!grid || !emptyState) return;

  let filtered = state.books;

  if (state.selectedGenre) {
    filtered = filtered.filter(b => b.genre === state.selectedGenre);
  }

  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    filtered = filtered.filter(b => 
      (b.title && b.title.toLowerCase().includes(q)) ||
      (b.author && b.author.toLowerCase().includes(q))
    );
  }

  if (countSubtitle) {
    countSubtitle.textContent = `${filtered.length} книг доступно`;
  }

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
  if (state.selectedGenre === genreId) {
    state.selectedGenre = null;
  } else {
    state.selectedGenre = genreId;
  }
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
    const list = state.selectedGenre 
      ? state.books.filter(b => b.genre === state.selectedGenre)
      : state.books;

    if (title) {
      if (state.selectedGenre) {
        const found = GENRES.find(g => g.id === state.selectedGenre);
        title.textContent = found ? `${found.emoji} ${found.name[state.currentLang] || found.name.ru}` : 'Книги жанра';
      } else {
        title.textContent = 'Все книги';
      }
    }

    if (list.length === 0) {
      genreBooksGrid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-icon">📖</div>
          <h3 class="empty-title">В этом разделе пока нет книг</h3>
          <p class="empty-desc">Добавьте книги через панель управления.</p>
          <button class="btn-primary" onclick="openAddBookModal()" style="margin: 0 auto;">➕ Добавить книгу</button>
        </div>
      `;
    } else {
      genreBooksGrid.innerHTML = list.map(b => createBookCardHtml(b)).join('');
    }
  }
}

function selectGenreTab(genreId) {
  state.selectedGenre = (state.selectedGenre === genreId) ? null : genreId;
  renderGenresScreen();
}

/* ==========================================================================
   8. Book Detail, Text Reader & Audio Player Views
   ========================================================================== */
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
              <span>Читать</span>
            </button>
          ` : ''}

          ${hasAudio ? `
            <button class="btn-listen" onclick="playAudioBook(state.currentBook)">
              <span>🎧</span>
              <span>Слушать аудио</span>
            </button>
          ` : ''}

          <button class="btn-icon" style="width: auto; padding: 0 16px; border-radius: var(--radius-md); font-size: 13px;" onclick="editBookInAdmin('${b.id}')">
            ✏️ Редактировать
          </button>
        </div>
      </div>
    </div>

    <div class="book-detail-body">
      <h3 style="font-size: 17px; font-weight: 700; margin-bottom: 12px;">О книге</h3>
      <p class="synopsis-text">${escapeHtml(b.synopsis || 'Описание книги ещё не добавлено.')}</p>
    </div>
  `;
}

function openReader() {
  navigate('reader');
}

function renderReader() {
  const b = state.currentBook;
  if (!b) return;

  const titleEl = document.getElementById('reader-title');
  const authorEl = document.getElementById('reader-author');
  const bodyEl = document.getElementById('reader-content-body');

  if (titleEl) titleEl.textContent = b.title;
  if (authorEl) authorEl.textContent = b.author;

  if (bodyEl) {
    bodyEl.style.fontSize = `${state.fontSize}px`;
    bodyEl.textContent = b.text || 'Текст для данной книги ещё не добавлен в библиотеку.';
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
  if (badgeType) {
    badgeType.textContent = sources.isGDrive ? 'Google Drive Audio' : 'Аудиопоток';
  }

  updatePlayPauseButtons();
  updateAudioUI();
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

function renderStats() {
  const totalBooks = state.books.length;
  const audioBooks = state.books.filter(b => !!b.audioUrl).length;
  const bookmarksCount = state.bookmarks.length;

  const totalEl = document.getElementById('stat-total-books');
  const audioEl = document.getElementById('stat-audio-books');
  const bmEl = document.getElementById('stat-bookmarks-count');

  if (totalEl) totalEl.textContent = totalBooks;
  if (audioEl) audioEl.textContent = audioBooks;
  if (bmEl) bmEl.textContent = bookmarksCount;
}

/* ==========================================================================
   9. Admin Panel Management & CRUD
   ========================================================================== */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`adm-tab-${tab}`).classList.add('active');

  document.getElementById('adm-content-books').style.display = (tab === 'books') ? 'block' : 'none';
  document.getElementById('adm-content-add').style.display = (tab === 'add') ? 'block' : 'none';
  document.getElementById('adm-content-backup').style.display = (tab === 'backup') ? 'block' : 'none';

  if (tab === 'books') {
    renderAdminBooksTable();
  }
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

function openAddBookModal() {
  document.getElementById('form-book-id').value = '';
  document.getElementById('form-title').value = '';
  document.getElementById('form-author').value = '';
  document.getElementById('form-genre').value = 'history';
  document.getElementById('form-cover').value = '';
  document.getElementById('form-synopsis').value = '';
  document.getElementById('form-audio-url').value = '';
  document.getElementById('form-text').value = '';
  document.getElementById('audio-test-status').textContent = '';

  navigate('admin');
  switchAdminTab('add');
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

  if (!title || !author) {
    alert('Пожалуйста, укажите название и автора.');
    return;
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
  alert(I18N[state.currentLang].bookSaved);
}

function deleteBook(bookId) {
  if (!confirm(I18N[state.currentLang].confirmDelete)) return;
  state.books = state.books.filter(b => b.id !== bookId);
  saveBooksToStorage();
  renderAll();
}

function confirmClearAllBooks() {
  if (!confirm(I18N[state.currentLang].confirmClearAll)) return;
  state.books = [];
  saveBooksToStorage();
  renderAll();
  alert('Все книги удалены.');
}

function exportLibraryJSON() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.books, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `elibrary_backup_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
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
      alert('Ошибка при чтении файла JSON: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ==========================================================================
   10. Themes & Localization
   ========================================================================== */
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

  // Update text nodes with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.textContent = dict[key];
    }
  });

  // Update inputs with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  // Sync selects
  const lSelect = document.getElementById('lang-select');
  const sSelect = document.getElementById('settings-lang-select');
  if (lSelect) lSelect.value = lang;
  if (sSelect) sSelect.value = lang;
}

function openMobileMenu() {
  navigate('settings');
}

// Kickoff
document.addEventListener('DOMContentLoaded', initApp);
