const { chromium } = require('playwright');

const BASE = 'http://localhost:8000';

async function check(page, url, label, fn) {
  const errors = [];
  const onErr = (e) => errors.push(String(e.message || e));
  page.on('pageerror', onErr);

  await page.goto(`${BASE}/${url}`);
  await page.waitForTimeout(1500);
  if (fn) await fn(page);

  page.off('pageerror', onErr);
  const real = errors.filter(e => !e.includes('ERR_CERT') && !e.includes('net::ERR'));
  if (real.length) {
    console.error(`FAIL ${label}:`, real);
    process.exitCode = 1;
  } else {
    console.log(`OK ${label}`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 460, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem('temoCrushProgress', JSON.stringify({
      unlocked: 1, stars: {}, best: {}, character: 'kaelen', boosters: {}, stardust: 0
    }));
  });

  await check(page, 'index.html', 'index');

  await check(page, 'map3d.html', 'map3d', async (p) => {
    await p.waitForSelector('#playBtn');
    await p.screenshot({ path: '/tmp/smoke-map3d.png' });
  });

  await check(page, 'game3d.html?level=1', 'game3d', async (p) => {
    await p.waitForSelector('#gameCanvas');
    await p.screenshot({ path: '/tmp/smoke-game3d.png' });

    // sanity-check the match-3 swap interaction
    const box = await p.locator('#gameCanvas').boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await p.mouse.move(cx, cy);
    await p.mouse.down();
    await p.mouse.move(cx + box.width / 9, cy, { steps: 5 });
    await p.mouse.up();
    await p.waitForTimeout(800);
    await p.screenshot({ path: '/tmp/smoke-game3d-played.png' });
  });

  await browser.close();
})();
