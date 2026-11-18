/* Apple sign-in is not set up yet: its buttons must be hidden, Google must stay visible.
   Run: node tests/auth-buttons.test.js */
const { serve, phone, chromium } = require('./helpers');

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const page = await (await phone(browser)).newPage();
  await page.goto(url);
  await page.waitForTimeout(1500);
  await page.evaluate(() => openAuthModal());
  await page.waitForTimeout(400);
  const visible = sel => page.evaluate(s => [...document.querySelectorAll(s)].some(el => el.getBoundingClientRect().width > 0), sel);
  const failures = [];
  if (await visible('.btn-apple')) failures.push('Apple button is visible');
  if (!(await visible('#auth-modal .btn-google'))) failures.push('Google button is not visible');
  await browser.close();
  server.close();
  failures.forEach(f => console.log('FAIL', f));
  console.log(failures.length ? `auth buttons: ${failures.length} problem(s)` : 'auth buttons: OK');
  process.exit(failures.length ? 1 : 0);
})();
