/**
 * **Die Grundriss-Vorlage der Station und das Vorschaubild der Startseite —
 * aus dem gebauten Grundriss gerechnet.**
 *
 *   node tools/station-outline.mjs
 *
 * Schreibt zwei Dateien, beide ins Repository (ein Build darf keinen Browser
 * brauchen):
 *
 * - `public/haunting/station-outline.png` — 1400 × 800, 20 Pixel = 1 m, die
 *   Vorlage am Boden (`world3d/blueprintArt.ts`, _Grundriss-Vorlage: an_).
 *   Durchsichtig bis auf Räume, Gänge und Wände.
 * - `public/worlds/haunting.webp` — 480 × 270, dieselbe Zeichnung vor einem
 *   Sternenfeld, für die Weltkarte auf der Startseite (`WorldDefinition.preview`).
 *
 * Die Zeichnung selbst ist `src/worlds/haunting/world3d/blueprintDrawing.ts`
 * (mit Test); hier wird sie nur mit esbuild gebündelt, ausgeführt und im
 * Chromium des Rauchtests gerastert — wie `tools/icons.mjs`.
 * `SMOKE_EXECUTABLE` zeigt auf einen vorinstallierten Browser.
 *
 * Wer `stationMap.ts` ändert, lässt das hier noch einmal laufen.
 */
import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const bundle = await build({
  stdin: {
    contents: `
      import { generateHouse } from './src/worlds/haunting/house';
      import { blueprintSvg } from './src/worlds/haunting/world3d/blueprintDrawing';
      import { BLUEPRINT } from './src/worlds/haunting/world3d/blueprint';
      const spec = generateHouse(1, 14);
      export const size = { width: BLUEPRINT.width, height: BLUEPRINT.height };
      export const outline = blueprintSvg(spec);
    `,
    resolveDir: root,
    loader: 'ts',
  },
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
});
const code = bundle.outputFiles[0].text;
const { size, outline } = await import(
  `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`
);

const browser = await chromium.launch({
  executablePath: process.env.SMOKE_EXECUTABLE || undefined,
});
try {
  const page = await browser.newPage({ viewport: size, deviceScaleFactor: 1 });

  // Die Vorlage: das SVG pixelgenau, der Hintergrund durchsichtig.
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${outline}</body></html>`,
  );
  const png = await page.locator('svg').screenshot({ omitBackground: true, type: 'png' });
  await writeFile(path.join(root, 'public/haunting/station-outline.png'), png);

  // Das Vorschaubild: Sternenfeld, darauf die Station, als WebP.
  const webp = await page.evaluate(async (svg) => {
    const W = 480,
      H = 270;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const g = canvas.getContext('2d');
    const sky = g.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, W * 0.7);
    sky.addColorStop(0, '#0f2233');
    sky.addColorStop(1, '#050a12');
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    // Ein feines Gitter wie auf der Karte der Zentrale.
    g.strokeStyle = 'rgba(120, 170, 210, 0.07)';
    g.lineWidth = 1;
    for (let x = 0.5; x < W; x += 16) g.strokeRect(x, -1, 0, H + 2);
    for (let y = 0.5; y < H; y += 16) g.strokeRect(-1, y, W + 2, 0);
    // Sterne aus einem festen Samen, damit das Bild bei jedem Lauf gleich ist.
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.6})`;
      const r = rand() < 0.1 ? 1.4 : 0.8;
      g.beginPath();
      g.arc(rand() * W, rand() * H, r, 0, Math.PI * 2);
      g.fill();
    }
    // Für das kleine Bild dunklere, kräftigere Flächen als am Boden.
    const tinted = svg
      .replace(/rgba\(170, 225, 245, 0\.38\)/g, 'rgba(40, 110, 160, 0.75)')
      .replace(/rgba\(170, 245, 205, 0\.30\)/g, 'rgba(60, 150, 120, 0.55)')
      .replace(/stroke-width="4"/g, 'stroke-width="7"');
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(tinted)}`;
    await image.decode();
    const scale = Math.min((W - 24) / image.width, (H - 20) / image.height);
    const w = image.width * scale,
      h = image.height * scale;
    g.drawImage(image, (W - w) / 2, (H - h) / 2, w, h);
    return canvas.toDataURL('image/webp', 0.86);
  }, outline);
  await writeFile(
    path.join(root, 'public/worlds/haunting.webp'),
    Buffer.from(webp.split(',')[1], 'base64'),
  );
  console.log('station-outline.png und worlds/haunting.webp geschrieben');
} finally {
  await browser.close();
}
