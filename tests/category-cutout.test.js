/* Category photo → object without background that floats like the 3D objects.
   1) removeImageBackground() makes the corners transparent and keeps the subject
   2) a category card in "object" mode with a photo floats (floatObj animation)
   Run: node tests/category-cutout.test.js */
const { serve, phone, chromium } = require('./helpers');

(async () => {
  const { server, url } = await serve();
  const browser = await chromium.launch();
  const page = await (await phone(browser)).newPage();
  const failures = [];
  await page.goto(url + '#/categories');
  await page.waitForFunction(() => state.categories.length > 0, null, { timeout: 20000 });
  await page.waitForTimeout(1000);

  /* 1) background removal on the real History photo */
  const photo = await page.evaluate(() => (state.categories.find(c => c.id === 'history') || {}).customImage || '');
  if (!photo) failures.push('no History photo in the catalog to test with');
  else {
    const res = await page.evaluate(async src => {
      if (typeof removeImageBackground !== 'function') return { error: 'removeImageBackground() does not exist' };
      try {
        const out = await removeImageBackground(src);
        const img = await new Promise((ok, bad) => { const i = new Image(); i.onload = () => ok(i); i.onerror = bad; i.src = out; });
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0);
        const a = (x, y) => g.getImageData(x, y, 1, 1).data[3];
        const corners = [a(0, 0), a(c.width - 1, 0), a(0, c.height - 1), a(c.width - 1, c.height - 1)];
        const d = g.getImageData(0, 0, c.width, c.height).data; let opaque = 0;
        for (let k = 3; k < d.length; k += 4) if (d[k] > 200) opaque++;
        return { png: out.startsWith('data:image/png'), corners, opaqueShare: opaque / (c.width * c.height) };
      } catch (e) { return { error: String(e && e.message || e) }; }
    }, photo);
    console.log('cutout:', JSON.stringify(res));
    if (res.error) failures.push('background removal: ' + res.error);
    else {
      if (!res.png) failures.push('cutout is not a PNG (transparency would be lost)');
      if (res.corners.some(v => v > 10)) failures.push(`corners are not transparent: ${res.corners}`);
      if (res.opaqueShare < 0.1) failures.push(`subject lost: only ${Math.round(res.opaqueShare * 100)}% opaque`);
    }
  }

  /* 2) a photo in "object" mode floats like the 3D objects */
  const floats = await page.evaluate(() => {
    const host = document.createElement('div');
    host.innerHTML = create3DCategoryCardHtml({ id: 'zz_test', name: { ru: 'T' }, glow: 'rgba(1,2,3,0.3)', customImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', displayMode: 'object', panX: 0, panY: 0, scale: 1 }, 0, 'void');
    document.body.appendChild(host);
    const layer = host.querySelector('.cat-custom-img-layer');
    const name = layer ? getComputedStyle(layer).animationName : 'none';
    host.remove();
    return name;
  });
  console.log('object-mode photo animation:', floats);
  if (floats !== 'floatObj') failures.push(`object-mode photo does not float (animation: ${floats})`);

  await browser.close();
  server.close();
  failures.forEach(f => console.log('FAIL', f));
  console.log(failures.length ? `category cutout: ${failures.length} problem(s)` : 'category cutout: OK');
  process.exit(failures.length ? 1 : 0);
})();
