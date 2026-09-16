/**
 * **Aus einem SVG die PNGs, die ein Startbildschirm verlangt.**
 *
 * Ein Web-App-Manifest darf ein SVG als Symbol angeben, und Chrome nimmt es
 * auch — aber iOS nicht: Safari holt sich das Symbol für den Startbildschirm
 * aus `<link rel="apple-touch-icon">`, und dort zählt nur PNG. Dazu will der
 * Android-Installationsdialog ein `maskable`-Symbol, also eines mit Rand, aus
 * dem sich jedes Gerät seine eigene Form schneiden kann (Kreis, Tropfen,
 * abgerundetes Quadrat). Beides entsteht hier aus **einer** Vorlage
 * (`public/icon.svg`), damit es nicht drei Symbole gibt, die sich langsam
 * auseinanderleben.
 *
 *   npm run icons
 *
 * Gerendert wird mit dem Browser, der ohnehin für den Rauchtest da ist
 * (`tools/browser-smoke.mjs`) — so ist keine Bildbibliothek nötig, und die
 * PNGs sehen aus wie das, was der Browser später anzeigt. `SMOKE_EXECUTABLE`
 * zeigt auf einen vorinstallierten Browser, wenn der Container den
 * Playwright-Download nicht hat.
 *
 * Die Ergebnisse liegen in `public/` und gehören ins Repository: Ein Build
 * darf keinen Browser brauchen.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(root, 'public/icon.svg'), 'utf8');
/** Der Hintergrund des Symbols — dieselbe Farbe wie `background_color`. */
const BACKGROUND = '#05070d';

/**
 * Was gebaut wird. `shrink` ist der Anteil, auf den die **Bildgruppe** `#art`
 * zusammengezogen wird: `maskable` verlangt, dass alles Wichtige im inneren
 * Kreis mit 80 % der Kantenlänge liegt. Geschrumpft wird nur die Gruppe, nicht
 * die Datei — der Himmel läuft in jeder Fassung bis an den Rand, sonst hätte
 * das Symbol einen Rahmen in der Farbe des Hintergrunds.
 */
const TARGETS = [
  { file: 'icon-192.png', size: 192, shrink: 1 },
  { file: 'icon-512.png', size: 512, shrink: 1 },
  { file: 'icon-maskable-512.png', size: 512, shrink: 0.8 },
  // iOS legt das Symbol selbst in seine runde Ecke und schneidet dabei wenig
  // weg; 180 Punkte ist die Größe, die ein aktuelles iPhone haben will.
  { file: 'apple-touch-icon.png', size: 180, shrink: 1 },
];

/** Die Bildgruppe um ihre eigene Mitte kleiner ziehen (SVG-Koordinaten: 512). */
function shrinkArt(svg, factor) {
  if (factor === 1) return svg;
  const offset = ((1 - factor) * 512) / 2;
  return svg.replace('<g id="art"', `<g transform="translate(${offset} ${offset}) scale(${factor})"><g id="art"`)
    .replace('</svg>', '</g></svg>');
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.SMOKE_EXECUTABLE || undefined,
});
const page = await browser.newPage();

for (const target of TARGETS) {
  // Das SVG steht inline im Dokument: So braucht die Seite keinen Server und
  // keine Datei-URL, und der Renderer skaliert den Vektor auf die Zielgröße,
  // statt ein fertiges Bild zu vergrößern.
  await page.setViewportSize({ width: target.size, height: target.size });
  await page.setContent(
    `<!doctype html><meta charset="utf-8">
     <style>
       html, body { margin: 0; width: ${target.size}px; height: ${target.size}px; background: ${BACKGROUND}; }
       svg { width: ${target.size}px; height: ${target.size}px; display: block; }
     </style>
     ${shrinkArt(source, target.shrink)}`,
    { waitUntil: 'load' },
  );
  const png = await page.screenshot({ omitBackground: false });
  await writeFile(path.join(root, 'public', target.file), png);
  console.log(`public/${target.file} — ${target.size}×${target.size} (${(png.length / 1024).toFixed(1)} kB)`);
}

await browser.close();
