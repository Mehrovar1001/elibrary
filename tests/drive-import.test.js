/* Importing a book from a Google Drive folder finds covers, PDFs per language/level,
   numbered audio per topic and tests, skipping Mac .DS_Store files.
   Run: node tests/drive-import.test.js */
const { serve, phone, chromium } = require('./helpers');
const ROOT_FOLDER = 'https://drive.google.com/drive/folders/1Z9lLrEghDzwfKsvN6dWQaHxrezkfSV8Y?usp=sharing';

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const page = await (await phone(browser)).newPage();
  /* the API key only works from the real site, so send its Referer */
  await page.route('https://www.googleapis.com/**', route =>
    route.fetch({ headers: { ...route.request().headers(), referer: 'https://mehrovar1001.github.io/elibrary/' } }).then(r => route.fulfill({ response: r })));
  await page.goto(url);
  await page.waitForTimeout(800);
  const books = await page.evaluate(link => scanDriveLibrary(link), ROOT_FOLDER);
  /* the imported book on the site: topics list, test after topic 5, cover by site language */
  const ui = books[0] && await page.evaluate(scan => {
    const b = mapBook({ id: 'x', title: scan.title, covers: scan.covers, text_urls: scan.textUrls, audio_urls: scan.audioUrls, topics: scan.topics, tests: scan.tests.map(x => ({ from: x.from, to: x.to, quiz: x.quiz })) });
    state.currentBook = b; state.mediaLang = 'en'; state.mediaLevel = 1;
    renderBookDetail();
    const rows = [...document.querySelectorAll('#book-detail-content .topic-row')].map(r => r.textContent.trim());
    const covers = {};
    ['tg', 'ru', 'en'].forEach(l => { state.currentLang = l; covers[l] = b.cover; });
    return { rows, covers };
  }, books[0]);
  await browser.close();
  server.close();

  const problems = [];
  const b = books[0] || {};
  const check = (ok, msg) => { if (!ok) problems.push(msg); };
  check(books.length === 1, `expected 1 book, got ${books.length}`);
  check(b.covers && b.covers.en && b.covers.ru && !b.covers.tg, 'covers: en and ru only');
  const pdfs = Object.values(b.textUrls || {}).reduce((n, lv) => n + Object.keys(lv).length, 0);
  check(pdfs === 9, `expected 9 PDFs, got ${pdfs}`);
  const enSimple = ((b.topics || {}).en || {})[1] || [];
  check(enSimple.map(x => x.n).join() === '1,2,3,4,5', `en simple topics: ${enSimple.map(x => x.n).join()}`);
  check(enSimple[3] && enSimple[3].title === 'Mixed states', `topic 4 title: ${enSimple[3] && enSimple[3].title}`);
  check(b.audioUrls && b.audioUrls.ru && Object.keys(b.audioUrls.ru).length === 3 && !b.audioUrls.tg, 'audio: ru on 3 levels, none in tg');
  check(b.title && b.title.en === 'The Prince' && b.title.tg === 'Шаҳриёр', `titles: ${JSON.stringify(b.title)}`);
  check(b.tests && b.tests.length === 1 && b.tests[0].to === 5 && b.tests[0].quiz.length === 10 && b.tests[0].keys.join() === '1,2,0,1,0,2,0,1,2,0', 'test 1-5 with 10 questions and keys');
  check(!JSON.stringify(b).includes('DS_Store'), '.DS_Store leaked into the book');
  check(ui && ui.rows.length === 6 && /1–5/.test(ui.rows[5]), `book page rows: ${ui && ui.rows.join(' | ')}`);
  check(ui && ui.covers.tg === b.covers.ru && ui.covers.ru === b.covers.ru && ui.covers.en === b.covers.en, 'cover order by site language');

  problems.forEach(p => console.log('FAIL', p));
  console.log(`drive import: ${problems.length ? problems.length + ' problem(s)' : 'OK'}`);
  process.exit(problems.length ? 1 : 0);
})();
