/* Fails when animations would stutter on a phone.
   1) @keyframes may only animate transform/opacity (filter, box-shadow, colours repaint every frame)
   2) one-shot animations/transitions are short (<= 0.6s)
   3) with a 4x slower CPU the home page keeps its frame rate (few dropped frames)
   Run: node tests/animations.test.js */
const fs = require('fs');
const path = require('path');
const { serve, phone, chromium } = require('./helpers');

const failures = [];
const css = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');

/* 1) keyframes */
const kfRe = /@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g;
let m;
while ((m = kfRe.exec(css))) {
  const props = new Set([...m[2].matchAll(/([a-z-]+)\s*:/g)].map(x => x[1]));
  const bad = [...props].filter(p => !['transform', 'opacity'].includes(p));
  if (bad.length) failures.push(`@keyframes ${m[1]} animates ${bad.join(', ')} (only transform/opacity are smooth)`);
}

/* 2) durations of one-shot animations and transitions */
for (const [, decl] of css.matchAll(/(?:^|[;{\s])((?:animation|transition)\s*:[^;}]+)/g)) {
  if (/infinite/.test(decl)) continue;
  const secs = [...decl.matchAll(/(\d*\.?\d+)(m?s)\b/g)].map(([, n, u]) => (u === 'ms' ? n / 1000 : +n));
  const longest = Math.max(0, ...secs.slice(0, 1), ...decl.split(',').map(part => { const t = part.match(/(\d*\.?\d+)(m?s)\b/); return t ? (t[2] === 'ms' ? t[1] / 1000 : +t[1]) : 0; }));
  if (longest > 0.6) failures.push(`too slow (${longest}s): ${decl.trim().slice(0, 80)}`);
}

(async () => {
  /* 3) dropped frames on a slow phone */
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const ctx = await phone(browser);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(url);
  await page.waitForTimeout(3000);
  const stats = await page.evaluate(() => new Promise(resolve => {
    const gaps = []; let last = performance.now(); const end = last + 4000;
    window.scrollBy(0, 1);
    const tick = now => { gaps.push(now - last); last = now; if (now < end) { if (gaps.length % 20 === 0) window.scrollBy(0, gaps.length % 40 ? 120 : -120); requestAnimationFrame(tick); } else resolve(gaps); };
    requestAnimationFrame(tick);
  }));
  const long = stats.filter(g => g > 50).length;
  const share = long / stats.length;
  console.log(`frames: ${stats.length}, dropped (>50ms): ${long} (${Math.round(share * 100)}%)`);
  if (share > 0.05) failures.push(`home page drops ${Math.round(share * 100)}% of frames on a slow phone`);

  /* 4) a modal sliding up over the animated category cards (video: it "catches") */
  const measureOpen = async (name, open) => {
    await page.goto(url + '#/categories');
    await page.waitForTimeout(3000);
    const gaps = await page.evaluate(src => new Promise(resolve => {
      const g = []; let last = performance.now(); const end = last + 700;
      (0, eval)(src)();
      const tick = now => { g.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(g); };
      requestAnimationFrame(tick);
    }), open);
    const fps = Math.round(gaps.length / 0.7);
    console.log(`${name}: ${fps} fps while opening, worst frame ${Math.round(Math.max(...gaps))}ms`);
    if (fps < 45) failures.push(`${name}: only ${fps} fps while the modal slides up (needs >= 45)`);
  };
  await measureOpen('sign-in modal', '() => openAuthModal()');

  /* 5) every other moving part of the app */
  /* median of 3 runs: single runs on a throttled CPU are too noisy to judge */
  const measure = async (name, hash, action, ms = 700) => {
    const runs = [];
    for (let k = 0; k < 3; k++) {
      await page.goto(url + hash);
      await page.waitForTimeout(k ? 1500 : 3000);
      const gaps = await page.evaluate(([src, dur]) => new Promise(resolve => {
        const g = []; let last = performance.now(); const end = last + dur;
        (0, eval)(src)();
        const tick = now => { g.push(now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(g); };
        requestAnimationFrame(tick);
      }), [action, ms]);
      runs.push(Math.round(gaps.length / (ms / 1000)));
    }
    const fps = runs.sort((a, b) => a - b)[1];
    console.log(`${name}: ${fps} fps (runs ${runs.join('/')})`);
    if (fps < 45) failures.push(`${name}: only ${fps} fps (needs >= 45)`);
  };
  const bookId = await page.evaluate(() => (state.books[0] || {}).id);
  await measure('toast message', '#/', "() => showToast('Проверка')");
  await measure('switch tab (home → categories)', '#/', "() => navigate('categories')");
  await measure('switch tab (categories → stats)', '#/categories', "() => navigate('stats')");
  await measure('scroll categories', '#/categories', "() => scrollBy({ top: 900, behavior: 'smooth' })", 1500);
  if (bookId) {
    await measure('open book page', '#/', `() => navigate('book-detail', '${bookId}')`);
    await measure('open player (mini player appears)', '#/book/' + bookId, `() => navigate('player', '${bookId}')`);
    await measure('scroll with mini player', '#/', `() => { showMiniPlayer(findBook('${bookId}')); scrollBy({ top: 900, behavior: 'smooth' }); }`, 1500);
  }
  if (process.env.ELIB_ADMIN_EMAIL && process.env.ELIB_ADMIN_PASSWORD) {
    await page.evaluate(([e, p]) => sb.auth.signInWithPassword({ email: e, password: p }), [process.env.ELIB_ADMIN_EMAIL, process.env.ELIB_ADMIN_PASSWORD]);
    await page.waitForTimeout(2000);
    await measureOpen('category editor', "() => openCategoryEditorModal('literature')");
    await page.evaluate(() => sb.auth.signOut());
  }

  await browser.close();
  server.close();

  failures.forEach(f => console.log('FAIL', f));
  console.log(failures.length ? `animations: ${failures.length} problem(s)` : 'animations: OK');
  process.exit(failures.length ? 1 : 0);
})();
