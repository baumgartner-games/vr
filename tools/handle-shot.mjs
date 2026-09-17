/**
 * **Die Griffe als Bilddateien** — schießt jede Ansicht von
 * `handles-preview.html` (`src/preview/handlesPreview.ts`) nach
 * `.artifacts/handles`. Läuft gegen einen laufenden `npm run dev`.
 *
 * Er gehört zu den Griffen wie der Musterbogen zum Avatar: Ob ein
 * Haltezylinder den Stiel der Pfanne trifft und ob der Topf danach in der
 * Faust aufrecht steht, prüft kein Jest-Test — das sieht man, oder man sieht
 * es nicht.
 *
 *   npm run dev
 *   npm run handles -- --tag=vorher
 *   npm run handles -- --tag=nachher
 *
 * `SMOKE_EXECUTABLE` zeigt auf einen vorinstallierten Browser, wenn der
 * Container den Playwright-Download nicht hat — dieselbe Variable wie im
 * Rauchtest (`tools/browser-smoke.mjs`) und beim Musterbogen.
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const url = args.get('url') ?? 'http://127.0.0.1:5173/handles-preview.html';
const out = path.resolve(args.get('out') ?? '.artifacts/handles');
const tag = args.get('tag') ?? 'now';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SMOKE_EXECUTABLE || undefined,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1520, height: 920 } });
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => Boolean(window.previewDraw), null, { timeout: 30000 });
const views = await page.evaluate(() => window.previewViews);
for (let i = 0; i < views.length; i++) {
  await page.evaluate((index) => window.previewDraw(index), i);
  await page.waitForTimeout(150);
  const file = path.join(out, `${tag}-${views[i]}.png`);
  await page.locator('canvas').screenshot({ path: file });
  console.log(file);
}
if (errors.length) console.error('Fehler:', errors.join('\n'));
await browser.close();
