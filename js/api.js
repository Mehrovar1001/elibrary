/* eLibrary — Supabase data layer.
   Every write here is checked by Row Level Security on the server:
   readers can only touch their own rows, only admins can change the catalog. */

const sb = window.supabase.createClient(ELIB_CONFIG.supabaseUrl, ELIB_CONFIG.supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'elibrary-auth'
  }
});

/* ---------- Row mappers (DB snake_case <-> app camelCase) ---------- */
function mapCategory(r) {
  return {
    id: r.id,
    name: r.name || {},
    glow: r.glow,
    customImage: r.custom_image || '',
    displayMode: r.display_mode || 'object',
    panX: Number(r.pan_x) || 0,
    panY: Number(r.pan_y) || 0,
    scale: Number(r.scale) || 1,
    sortOrder: r.sort_order || 0
  };
}

function categoryToRow(c) {
  return {
    id: c.id,
    name: c.name,
    glow: c.glow,
    custom_image: c.customImage || '',
    display_mode: c.displayMode === 'full' ? 'full' : 'object',
    pan_x: c.panX || 0,
    pan_y: c.panY || 0,
    scale: c.scale || 1,
    sort_order: c.sortOrder || 0
  };
}

function mapBook(r) {
  return {
    id: r.id,
    genre: r.category_id,
    title: r.title || {},
    author: r.author || {},
    synopsis: r.synopsis || {},
    cover: r.cover_url || '',
    textUrls: r.text_urls || {},
    audioUrls: r.audio_urls || {},
    quiz: Array.isArray(r.quiz) ? r.quiz : [],
    published: r.published !== false,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function bookToRow(b) {
  return {
    category_id: b.genre || null,
    title: b.title,
    author: b.author,
    synopsis: b.synopsis,
    cover_url: b.cover || '',
    text_urls: b.textUrls,
    audio_urls: b.audioUrls,
    quiz: b.quiz || [],
    published: b.published !== false
  };
}

function throwIf(error) {
  if (error) throw error;
}

const api = {
  /* ---- Catalog (public) ---- */
  async fetchCatalog() {
    const [cats, books] = await Promise.all([
      sb.from('categories').select('*').order('sort_order').order('id'),
      sb.from('books').select('*').order('created_at', { ascending: false })
    ]);
    throwIf(cats.error);
    throwIf(books.error);
    return { categories: cats.data.map(mapCategory), books: books.data.map(mapBook) };
  },

  /* ---- Auth & profile ---- */
  async fetchProfile(userId) {
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
    throwIf(error);
    return data;
  },
  async updateProfile(userId, fields) {
    const { error } = await sb.from('profiles').update(fields).eq('id', userId);
    throwIf(error);
  },
  async touchActivity() {
    const { data, error } = await sb.rpc('touch_activity');
    if (error) return null;
    return data;
  },

  /* ---- Reader data (own rows only) ---- */
  async fetchBookmarks() {
    const { data, error } = await sb.from('bookmarks').select('*').order('created_at', { ascending: false });
    throwIf(error);
    return data;
  },
  async addBookmark(bookId, lang, level) {
    const { data, error } = await sb.from('bookmarks').upsert({ book_id: bookId, lang, level: level || 1 }, { onConflict: 'user_id,book_id' }).select().single();
    throwIf(error);
    return data;
  },
  async removeBookmark(bookId) {
    const { error } = await sb.from('bookmarks').delete().eq('book_id', bookId);
    throwIf(error);
  },
  async fetchCertificates() {
    const { data, error } = await sb.from('certificates').select('*').order('issued_at', { ascending: false });
    throwIf(error);
    return data;
  },
  async fetchLatestProgress() {
    const { data, error } = await sb.from('reading_progress').select('*').order('updated_at', { ascending: false }).limit(1);
    throwIf(error);
    return data && data[0] ? data[0] : null;
  },
  async saveProgress(bookId, mode, lang, level, extra) {
    const e = extra || {};
    await sb.from('reading_progress').upsert(
      {
        book_id: bookId, mode, lang, level: level || 1,
        page: Math.max(1, Number(e.page) || 1),
        position: Math.max(0, Number(e.position) || 0),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'user_id,book_id' }
    );
  },
  async deleteProgress(bookId) {
    await sb.from('reading_progress').delete().eq('book_id', bookId);
  },
  async submitQuiz(bookId, answers) {
    const { data, error } = await sb.rpc('submit_quiz', { p_book_id: bookId, p_answers: answers });
    throwIf(error);
    return data;
  },
  async verifyCertificate(code) {
    const { data, error } = await sb.rpc('verify_certificate', { p_code: code });
    throwIf(error);
    return data;
  },

  /* ---- Analytics ---- */
  logPageView(path, lang) {
    sb.from('page_views').insert({ path: String(path).slice(0, 200), lang }).then(() => {}, () => {});
  },

  /* ---- Admin (enforced server-side) ---- */
  async saveBook(book, quizKeys) {
    const row = bookToRow(book);
    let saved;
    if (book.id) {
      const res = await sb.from('books').update(row).eq('id', book.id).select().single();
      throwIf(res.error);
      saved = res.data;
    } else {
      const res = await sb.from('books').insert(row).select().single();
      throwIf(res.error);
      saved = res.data;
    }
    if (quizKeys && quizKeys.length) {
      const k = await sb.from('book_quiz_keys').upsert({ book_id: saved.id, answers: quizKeys });
      throwIf(k.error);
    } else {
      await sb.from('book_quiz_keys').delete().eq('book_id', saved.id);
    }
    return mapBook(saved);
  },
  async fetchQuizKeys(bookId) {
    const { data, error } = await sb.from('book_quiz_keys').select('answers').eq('book_id', bookId).maybeSingle();
    throwIf(error);
    return data ? data.answers : [];
  },
  async deleteBook(bookId) {
    const { error } = await sb.from('books').delete().eq('id', bookId);
    throwIf(error);
  },
  async saveCategory(cat) {
    const { data, error } = await sb.from('categories').upsert(categoryToRow(cat)).select().single();
    throwIf(error);
    return mapCategory(data);
  },
  async deleteCategory(catId) {
    const { error } = await sb.from('categories').delete().eq('id', catId);
    throwIf(error);
  },
  async uploadImage(folder, blob) {
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const { error } = await sb.storage.from(ELIB_CONFIG.coversBucket).upload(path, blob, {
      contentType: 'image/jpeg',
      cacheControl: '31536000',
      upsert: false
    });
    throwIf(error);
    return sb.storage.from(ELIB_CONFIG.coversBucket).getPublicUrl(path).data.publicUrl;
  },
  async fetchAllProfiles() {
    const { data, error } = await sb.from('profiles').select('*').order('created_at', { ascending: true });
    throwIf(error);
    return data;
  },
  async setUserRole(userId, role) {
    const { error } = await sb.from('profiles').update({ role }).eq('id', userId);
    throwIf(error);
  },
  async adminUsers(payload) {
    const { data, error } = await sb.functions.invoke('admin-users', { body: payload });
    if (error) {
      let msg = error.message;
      try {
        const body = await error.context.json();
        if (body && body.error) msg = body.error;
      } catch (e) {}
      throw new Error(msg);
    }
    return data;
  },
  async adminStats() {
    const { data, error } = await sb.rpc('admin_stats');
    throwIf(error);
    return data;
  }
};
