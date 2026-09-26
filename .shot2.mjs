import { chromium } from 'playwright';
const out = process.argv[2];
const browser = await chromium.launch({ headless: true, executablePath: '/opt/pw-browsers/chromium', args: ['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
async function fresh() { const p = await browser.newPage({ viewport: { width: 1280, height: 800 } }); p.setDefaultTimeout(120000); p.on('pageerror', (e) => console.log('pageerror', e.message)); return p; }
let page = await fresh();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.locator('#enter:not([disabled])').waitFor({ timeout: 120000 });
await page.waitForTimeout(3000);
await page.locator('.wcard[data-world="hub"]').click();
for (const t of [50, 500, 3000]) { await page.waitForTimeout(t); console.log('after pick', t, 'disabled=', await page.locator('#enter').isDisabled(), 'note=', JSON.stringify(await page.locator('#start-note').textContent())); }
await page.close();
for (const [w, v] of [['hub','3d'],['test-navigation','2d'],['test-navigation','3d']]) {
  page = await fresh();
  await page.goto(`http://127.0.0.1:5173/#${w}`, { waitUntil: 'domcontentloaded' });
  await page.locator(`#screen-view [data-view="${v}"]`).click();
  await page.locator('#enter:not([disabled])').waitFor({ timeout: 120000 });
  await page.locator('#enter').click();
  await page.waitForTimeout(15000);
  await page.screenshot({ path: `${out}/${w}-${v}.png` });
  await page.close();
}
await browser.close();
