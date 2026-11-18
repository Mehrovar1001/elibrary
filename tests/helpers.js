/* Shared test helpers: a tiny static server for the site and a Playwright browser. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
      if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    server.listen(0, () => resolve({ server, url: `http://localhost:${server.address().port}/` }));
  });
}

async function phone(browser, width = 390, height = 844) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  /* skip the first-visit language chooser */
  await ctx.addInitScript(() => localStorage.setItem('elibrary_settings_v2', JSON.stringify({ lang: 'ru', theme: 'light', fontSize: 18 })));
  return ctx;
}

module.exports = { serve, phone, chromium };
