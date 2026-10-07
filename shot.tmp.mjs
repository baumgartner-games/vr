import { chromium } from 'playwright';
const out = '/tmp/claude-0/-home-user-vr/25101da8-5dc7-5ba3-9584-9707f6f0d77c/scratchpad/shots';
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium',
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto('http://127.0.0.1:5173/?net=local&room=shot3#hausbau', { waitUntil: 'domcontentloaded' });
await page.locator('#screen-view [data-view="2d"]').click();
await page.locator('#enter:not([disabled])').waitFor({ timeout: 120000 });
await page.locator('#enter').click();
await page.waitForFunction(() => window.bgvr?.world?.placed?.length > 3, null, { timeout: 120000 });
await page.waitForTimeout(3000);
const info = await page.evaluate(() => {
  const w = window.bgvr.world; const ctx = w.context;
  const p = ctx.rig.position;
  return { world: w.constructor.name, rig: [p.x, p.z], walls: w.standingWalls().length, placed: w.placed.length };
});
console.log(JSON.stringify(info));
const mod = process.argv[2] ? await import(process.argv[2]) : null;
if (mod) await mod.default(page, out);
console.log(errors.slice(0, 8).join('\n'));
await browser.close();
