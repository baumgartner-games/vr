/**
 * **Der Musterbogen als Bilddateien** — schießt die vier Ansichten von
 * `avatar-preview.html` (`src/preview/avatarPreview.ts`) nach
 * `.artifacts/avatar`. Läuft gegen einen laufenden `npm run dev`.
 *
 * Er gehört zum Avatar wie der Jest-Test zur Rechnung: Wie eine Figur
 * **aussieht**, prüft kein Test, und ein Vorher und ein Nachher nebeneinander
 * ist das einzige Mittel dagegen.
 *
 *   npm run dev
 *   npm run avatar -- --tag=vorher
 *   npm run avatar -- --tag=nachher --walk --hat=all
 *
 * `SMOKE_EXECUTABLE` zeigt auf einen vorinstallierten Browser, wenn der
 * Container den Playwright-Download nicht hat — dieselbe Variable wie im
 * Rauchtest (`tools/browser-smoke.mjs`).
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
const query = new URLSearchParams();
if (args.has('hat')) query.set('hat', args.get('hat'));
if (args.has('walk')) query.set('walk', '1');
const url =
  args.get('url') ??
  `http://127.0.0.1:5173/avatar-preview.html${query.size ? `?${query}` : ''}`;
const out = path.resolve(args.get('out') ?? '.artifacts/avatar');
const tag = args.get('tag') ?? 'now';
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SMOKE_EXECUTABLE || undefined,
  args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
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
  await page.waitForTimeout(120);
  const file = path.join(out, `${tag}-${views[i]}.png`);
  await page.locator('canvas').screenshot({ path: file });
  console.log(file);
}
if (errors.length) console.error('Fehler:', errors.join('\n'));
await browser.close();
