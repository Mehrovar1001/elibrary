/* Books and audio must stream straight from Google (Drive API key), not through Supabase.
   Run: node tests/drive-direct.test.js */
const { serve, phone, chromium } = require('./helpers');

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const page = await (await phone(browser)).newPage();
  await page.goto(url);
  await page.waitForTimeout(1000);
  const direct = await page.evaluate(() => driveDirectUrl('https://drive.google.com/file/d/1f42nLinx6xdlA6jpFCVsWqckOuhIOMrB/view?usp=drivesdk'));
  await browser.close();
  server.close();
  const ok = direct.startsWith('https://www.googleapis.com/drive/v3/files/1f42nLinx6xdlA6jpFCVsWqckOuhIOMrB?alt=media&key=');
  console.log(ok ? 'drive direct: OK' : `FAIL drive link goes to ${direct.split('?')[0]}\ndrive direct: 1 problem(s)`);
  process.exit(ok ? 0 : 1);
})();
