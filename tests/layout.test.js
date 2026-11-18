/* Fails when a button/field sticks out of its card or the screen, or two controls overlap.
   Run: node tests/layout.test.js   (admin screens need ELIB_ADMIN_EMAIL / ELIB_ADMIN_PASSWORD) */
const { serve, phone, chromium } = require('./helpers');

const CARD = '.cat-framing-controls, .modal-card, .settings-card, .admin-card, .player-page-card, .book-controls, .cat-editor-preview-wrap, .soft-gradient-card, .liquid-glass-card';

/* Runs in the page: returns a list of problems for everything visible now */
function findProblems() {
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0'; };
  /* only places designed to scroll sideways (tables, admin tabs, filter pills, category rows, zoomed page) */
  const scrollsX = el => !!el.closest('.table-scroll, .admin-tabs, .genre-pills, .categories-3d-grid, .book-stage.is-zoomed');
  const fixedLayer = el => { for (let p = el; p; p = p.parentElement) { const pos = getComputedStyle(p).position; if (pos === 'fixed' || pos === 'sticky') return p; } return null; };
  const label = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + String(el.className).split(' ')[0]) + ' "' + (el.textContent || el.value || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '"';
  const ctrls = [...document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea')]
    .filter(el => visible(el) && !el.closest('.book-edge, .book-center') && !el.classList.contains('book-edge') && !el.classList.contains('book-center') && !el.classList.contains('skip-link'));
  const out = [];
  const vw = document.documentElement.clientWidth;
  for (const el of ctrls) {
    const r = el.getBoundingClientRect();
    if (!scrollsX(el) && (r.left < -1 || r.right > vw + 1)) out.push(`off-screen: ${label(el)} (${Math.round(r.left)}..${Math.round(r.right)} of ${vw})`);
    const card = el.parentElement && el.parentElement.closest(window.__CARD);
    if (card && !scrollsX(el)) {
      const c = card.getBoundingClientRect();
      if (r.left < c.left - 1 || r.right > c.right + 1) out.push(`outside its card: ${label(el)} (${Math.round(r.left)}..${Math.round(r.right)} vs card ${Math.round(c.left)}..${Math.round(c.right)})`);
    }
  }
  for (let i = 0; i < ctrls.length; i++) for (let j = i + 1; j < ctrls.length; j++) {
    const a = ctrls[i], b = ctrls[j];
    if (a.contains(b) || b.contains(a) || fixedLayer(a) !== fixedLayer(b)) continue;
    if (a.closest('.password-wrap') && a.closest('.password-wrap') === b.closest('.password-wrap')) continue; /* eye icon sits inside the field on purpose */
    const x = a.getBoundingClientRect(), y = b.getBoundingClientRect();
    const w = Math.min(x.right, y.right) - Math.max(x.left, y.left), h = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
    if (w > 2 && h > 2) out.push(`overlap: ${label(a)} × ${label(b)}`);
  }
  return out;
}

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const failures = [];
  for (const [w, h] of [[390, 844], [360, 740]]) {
    const ctx = await phone(browser, w, h);
    const page = await ctx.newPage();
    await page.addInitScript(sel => { window.__CARD = sel; }, CARD);
    const check = async name => { (await page.evaluate(findProblems)).forEach(p => failures.push(`[${w}px ${name}] ${p}`)); };
    const open = async (hash, wait) => { await page.goto(url + hash); await page.waitForTimeout(wait || 1200); };

    await open('', 2500);
    const bookId = await page.evaluate(() => (state.books[0] || {}).id);
    for (const hash of ['#/', '#/categories', '#/bookmarks', '#/stats', '#/settings', '#/verify', '#/about', '#/privacy']) { await open(hash); await check(hash); }
    if (bookId) {
      await open('#/book/' + bookId); await check('book');
      await open('#/listen/' + bookId, 2500); await check('player');
      await open('#/read/' + bookId, 6000); await check('reader');
    }
    await open('#/'); await page.evaluate(() => openAuthModal()); await page.waitForTimeout(400); await check('auth modal');

    if (process.env.ELIB_ADMIN_EMAIL && process.env.ELIB_ADMIN_PASSWORD) {
      await page.evaluate(([e, p]) => sb.auth.signInWithPassword({ email: e, password: p }), [process.env.ELIB_ADMIN_EMAIL, process.env.ELIB_ADMIN_PASSWORD]);
      await page.waitForTimeout(2500);
      await open('#/admin', 2000);
      for (const tab of ['books', 'add', 'categories', 'users', 'analytics', 'backup']) { await page.evaluate(t => switchAdminTab(t), tab); await page.waitForTimeout(800); await check('admin ' + tab); }
      await page.evaluate(() => openCategoryEditorModal('literature')); await page.waitForTimeout(500); await check('category editor');
      await page.evaluate(() => { closeCategoryEditorModal(); openAdminCreateUserModal(); }); await page.waitForTimeout(400); await check('create user');
      await page.evaluate(() => { closeAdminCreateUserModal(); openEditProfileModal(); }); await page.waitForTimeout(400); await check('profile');
      await page.evaluate(() => sb.auth.signOut());
    } else {
      console.log('(admin screens skipped: set ELIB_ADMIN_EMAIL and ELIB_ADMIN_PASSWORD)');
    }
    await ctx.close();
  }
  await browser.close();
  server.close();
  const unique = [...new Set(failures)];
  unique.forEach(f => console.log('FAIL', f));
  console.log(unique.length ? `layout: ${unique.length} problem(s)` : 'layout: OK');
  process.exit(unique.length ? 1 : 0);
})();
