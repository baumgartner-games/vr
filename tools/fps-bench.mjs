/**
 * **Die Messstrecke für die Bildrate** — fährt eine Matrix aus Grafik-
 * einstellungen gegen einen laufenden `npm run dev` und schreibt je Kombination
 * Bildzeit, Bildrate, das **1-%-Perzentil der Bildzeit** (die Ruckler), die
 * CPU-Zeit je Bild und die Zahl der Zeichenaufrufe.
 *
 *   npm run dev -- --port 5183
 *   npm run fps -- --url=http://127.0.0.1:5183/
 *
 * Sie ist gebaut worden für eine Frage, die auf der Quest 3 gestellt wurde und
 * am Schreibtisch beantwortet werden musste: **In der Testwelt stehen 29–32 fps
 * und keine Einstellung ändert daran etwas, im Hub sind es 80.** Wer das
 * nachstellen will, braucht keine absolute Zahl — er braucht die
 * **Verhältnisse**: was der Comic kostet, was die Schatten kosten, was die
 * halbe Auflösung bringt, und vor allem, welcher Schalter **gar nichts** tut.
 * Genau diese Verhältnisse gibt der Bericht unten aus; die Referenz dazu steht
 * in `docs/quest3-referenz.md`.
 *
 * ## Wofür die Zahlen taugen — und wofür nicht
 *
 * Gemessen wird in einem **kopflosen Chromium mit SwiftShader**, also mit einem
 * Software-Rasterizer auf der CPU. Das ist **keine Quest 3**:
 *
 * - **Absolute fps sind wertlos.** SwiftShader ist ein bis zwei
 *   Größenordnungen langsamer als ein Adreno 740; eine Bildzeit von hier sagt
 *   nichts über eine Bildzeit dort.
 * - **Was am Füllen der Bildpunkte hängt, ist hier verzerrt.** Ein
 *   Software-Rasterizer zahlt pro Pixel anders als eine echte GPU; die
 *   Auflösungsreihe unten ist deshalb die **schwächste** Aussage dieses
 *   Werkzeugs.
 * - **Was an der Zahl der Zeichenaufrufe und am JavaScript hängt, trägt.**
 *   Draw Calls, Szenendurchläufe, doppeltes Zeichnen (Comic), ein zweiter
 *   Renderdurchgang für die Schattenkarte — das sind dieselben Aufrufe auf
 *   demselben Renderer, und ihr **Verhältnis** zueinander überträgt sich.
 * - **Ein Schirm ist nicht zwei Augen.** Die Brille zeichnet alles zweimal,
 *   rechnet Reprojection und Foveation dazu und hat ein hartes Zeitfenster;
 *   nichts davon gibt es hier.
 *
 * Der wichtigste Befund einer solchen Messung ist deshalb nie eine Zahl,
 * sondern ein **Nullergebnis**: ein Regler, der in der Tabelle nichts bewegt,
 * bewegt auch in der Brille nichts — und genau das meldet der Nutzer.
 *
 * ## Warum `xrScale` zweimal in der Tabelle steht
 *
 * `xrScale` wirkt ausschließlich in XR: `GraphicsQuality.applyRenderer` gibt
 * ihn als `renderer.xr.setFramebufferScaleFactor` weiter, und am Bildschirm
 * fasst ihn niemand an (`App.resizeWebBuffer` rechnet dort mit
 * `devicePixelRatio`). Eine Playwright-Sitzung hat keine Brille, also **kann**
 * dieses Werkzeug `xrScale` nicht messen. Es misst trotzdem beides:
 *
 * - die Fälle `xr-0.85` / `xr-0.7` setzen wirklich nur `xrScale` — sie müssen
 *   deshalb **auf der Bildzeit der Basis liegen**. Sie stehen in der Tabelle
 *   als Kontrolle: Zeigen sie einen Unterschied, ist es Rauschen, und man weiß,
 *   wie viel Rauschen die Maschine gerade macht.
 * - die Fälle `pixel-0.85` / `pixel-0.7` setzen stattdessen den
 *   `devicePixelRatio` des Browserkontexts auf denselben Faktor. Der landet
 *   über `renderer.setPixelRatio` im selben Bildpuffer-Rechenweg und ist damit
 *   der **Stellvertreter**, an dem sich ablesen lässt, was ein kleinerer
 *   Bildpuffer in dieser Szene überhaupt bringen kann.
 *
 * ## Warum der HMR-Client abgeklemmt wird
 *
 * Der Vite-Dev-Server lädt die Seite neu, sobald jemand eine Datei unter
 * `src/` speichert — und in diesem Projekt arbeiten mehrere Agenten im selben
 * Arbeitsverzeichnis. Eine Messung, der mitten im Fenster der Kontext
 * weggeräumt wird, ist keine Messung. Also wird `/@vite/client` durch einen
 * Stummel ersetzt, der dieselben Namen exportiert, aber keine Verbindung
 * aufbaut: Die Seite lädt normal, HMR bleibt stumm.
 *
 * `SMOKE_EXECUTABLE` zeigt auf einen vorinstallierten Browser, wenn der
 * Container den Playwright-Download nicht hat — dieselbe Variable wie im
 * Rauchtest (`tools/browser-smoke.mjs`) und beim Musterbogen.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);

const base = args.get('url') ?? process.env.SMOKE_URL ?? 'http://127.0.0.1:5183/';
const worlds = (args.get('worlds') ?? 'hub,test').split(',').filter(Boolean);
const only = args.has('cases') ? new Set(args.get('cases').split(',').filter(Boolean)) : null;
const baseSize = parseSize(args.get('size') ?? '1280x720');
// `--sizes=none` (oder `--sizes=` allein, was der Argumentleser oben zu `true`
// macht) heißt: keine Auflösungsreihe, nur die Basis.
const sizeList = args.get('sizes') ?? '1920x1080,960x540,640x360';
const sizes = ['true', 'none', ''].includes(sizeList) ? [] : sizeList.split(',').filter(Boolean);
const seconds = Number(args.get('seconds') ?? 9);
const warmup = Number(args.get('warmup') ?? 2.5);
const minFrames = Number(args.get('min-frames') ?? 30);
const maxSeconds = Number(args.get('max-seconds') ?? 30);
const repeats = Math.max(1, Number(args.get('repeats') ?? 1));
const software = !args.has('gpu');
const out = path.resolve(args.get('out') ?? '.artifacts/fps-bench/fps-bench.json');

const HELP = `Bildraten-Messstrecke (tools/fps-bench.mjs)

  npm run dev -- --port 5183
  npm run fps -- --url=http://127.0.0.1:5183/ --out=.artifacts/fps-bench/lauf.json

  --url=http://127.0.0.1:5183/   Der laufende Dev-Server.
  --worlds=hub,test              Welten, die verglichen werden.
  --cases=basis,comic            Nur diese Fälle messen (Vorgabe: alle).
  --size=1280x720                Fenstergröße der Basis.
  --sizes=1920x1080,960x540      Die Auflösungsreihe; --sizes=none lässt sie weg.
  --seconds=9                    Länge des Messfensters.
  --warmup=2.5                   Aufwärmphase davor; wird verworfen.
  --min-frames=30                So lange verlängern, bis so viele Bilder da sind …
  --max-seconds=30               … höchstens aber so lange.
  --repeats=1                    Jeden Fall mehrfach messen, Median zählt.
  --gpu                          Ohne SwiftShader starten (echte GPU, falls vorhanden).
  --out=…/lauf.json              Ergebnis als JSON.
  --help                         Diese Zeilen.

Die Fälle: ${caseNames().join(', ')}`;

if (args.has('help') || args.has('h')) {
  console.log(HELP);
  process.exit(0);
}

/**
 * **Ein Stummel für `/@vite/client`.** Vite schreibt in jedes Modul mit
 * `import.meta.hot` einen Import aus dieser Datei; fehlte einer der Namen,
 * stünde die Seite still. Also gibt es sie alle — nur ohne WebSocket, ohne
 * Fehler-Overlay und ohne das Neuladen, das eine Messung zerreißt. Das
 * Nachtragen von CSS bleibt echt, sonst stünde die Seite ungestylt da.
 */
const VITE_CLIENT_STUB = `
export const createHotContext = () => ({
  accept() {}, acceptExports() {}, dispose() {}, prune() {}, decline() {},
  invalidate() {}, on() {}, off() {}, send() {}, data: {},
});
export const updateStyle = (id, content) => {
  const selector = 'style[data-vite-dev-id="' + id + '"]';
  let style = document.querySelector(selector);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(style);
  }
  style.textContent = content;
};
export const removeStyle = (id) => {
  document.querySelector('style[data-vite-dev-id="' + id + '"]')?.remove();
};
export const injectQuery = (url) => url;
export const inWorkerThread = false;
export const context = {};
export class ErrorOverlay extends HTMLElement {}
`;

/**
 * **Die Matrix.** Kein volles Kreuzprodukt, sondern **eine Basis und je ein
 * gedrehter Regler**: Das ist die Anordnung, aus der sich „was kostet dieser
 * Schalter" überhaupt ablesen lässt — beim Kreuzprodukt steckte die Antwort in
 * einer Regression, hier steht sie in einer Zeile. Die beiden Comic-Fälle sind
 * die Ausnahme: Comic **ohne** Schatten ist der Kandidat für die Brille, und
 * ob Schatten im Comic dasselbe kosten wie im einfachen Bild, ist genau die
 * Frage, die eine Empfehlung braucht.
 *
 * `graphics` sind die Abweichungen vom Auslieferungszustand
 * (`core/graphicsSettings.DEFAULT_GRAPHICS`), `dpr` der `devicePixelRatio` des
 * Browserkontexts, `size` die Fenstergröße.
 */
function cases() {
  const list = [
    { id: 'basis', label: 'Basis · Einfach, Schatten an', graphics: {} },
    { id: 'ohne-schatten', label: 'Einfach, Schatten aus', graphics: { shadows: false } },
    { id: 'comic', label: 'Comic, Schatten an', graphics: { mode: 'comic' } },
    {
      id: 'comic-ohne-schatten',
      label: 'Comic, Schatten aus',
      graphics: { mode: 'comic', shadows: false },
    },
    { id: 'xr-0.85', label: 'xrScale 0,85 (wirkt nur in XR)', graphics: { xrScale: 0.85 } },
    { id: 'xr-0.7', label: 'xrScale 0,7 (wirkt nur in XR)', graphics: { xrScale: 0.7 } },
    { id: 'pixel-0.85', label: 'Bildpuffer 0,85 (Stellvertreter)', graphics: {}, dpr: 0.85 },
    { id: 'pixel-0.7', label: 'Bildpuffer 0,7 (Stellvertreter)', graphics: {}, dpr: 0.7 },
  ];
  for (const text of sizes) {
    const size = parseSize(text);
    if (size.width === baseSize.width && size.height === baseSize.height) continue;
    list.push({
      id: `groesse-${size.width}x${size.height}`,
      label: `Fenster ${text}`,
      graphics: {},
      size,
    });
  }
  return list;
}

function caseNames() {
  return cases().map((item) => item.id);
}

function parseSize(text) {
  const [width, height] = text.split('x').map(Number);
  if (!width || !height) throw new Error(`Unbrauchbare Größe: ${text}`);
  return { width, height };
}

/**
 * **Eine Messung.** Frischer Kontext je Fall — die Einstellungen liegen im
 * `localStorage` (`bgvr.graphics`) und müssen **vor** dem Laden dort stehen,
 * sonst baut die App ihre Szene zweimal auf und misst sich beim Umbauen
 * selbst.
 */
async function measure(browser, world, item) {
  const size = item.size ?? baseSize;
  const context = await browser.newContext({
    viewport: { width: size.width, height: size.height },
    deviceScaleFactor: item.dpr ?? 1,
    // Der Service Worker der PWA hält Module aus einem früheren Lauf fest;
    // gemessen werden soll der Stand, der gerade im Arbeitsverzeichnis liegt.
    serviceWorkers: 'block',
    // Dieselbe Vorsichtsmaßnahme wie im Rauchtest: keine Animation, die von
    // außen anders läuft als beim nächsten Lauf.
    reducedMotion: 'reduce',
  });
  await context.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: VITE_CLIENT_STUB }),
  );
  await context.addInitScript((graphics) => {
    // Vollständig geschrieben und nicht zusammengeführt: Ein Rest aus einem
    // früheren Fall im selben Profil wäre eine stille Fehlmessung.
    localStorage.setItem(
      'bgvr.graphics',
      JSON.stringify({
        mode: 'simple',
        xrScale: 1,
        showFps: false,
        gridLines: false,
        hitBoxes: false,
        showHandles: false,
        shadows: true,
        // Die Daumenflächen sind DOM über dem Bild und haben in einer Messung
        // nichts verloren.
        screenPads: 'off',
        ...graphics,
      }),
    );
  }, item.graphics);

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  try {
    const url = new URL(base);
    url.hash = world;
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
    // Aus den Augen und nicht von oben: Von oben schneidet `TopDownCamera` die
    // Szene auf und zeichnet etwas anderes als das, was in der Brille steht.
    await page.locator('#screen-view [data-view="3d"]').click();
    await page.locator('#enter').click();
    await page.waitForFunction(
      (id) => window.bgvr?.currentWorldId === id && window.bgvr.world,
      world,
      {
        timeout: 120000,
      },
    );

    const sample = await page.evaluate(
      ({ warmup, seconds, minFrames, maxSeconds }) =>
        new Promise((resolve) => {
          const deltas = [];
          let previous = 0;
          const begin = performance.now();
          const done = (now) => {
            const elapsed = (now - begin) / 1000 - warmup;
            if (elapsed < seconds) return false;
            // Bei einer Bildzeit von einer halben Sekunde sind neun Sekunden
            // achtzehn Bilder, und aus achtzehn Bildern lässt sich kein
            // Perzentil lesen. Also wird verlängert — aber nicht endlos.
            return deltas.length >= minFrames || elapsed >= maxSeconds;
          };
          const frame = (now) => {
            // Die Aufwärmphase wird verworfen: Shader werden übersetzt,
            // Geometrie wandert zur GPU, die Schattenkarte wird zum ersten Mal
            // gefüllt. Das ist echte Arbeit, aber nicht die, die gemessen
            // werden soll.
            if (previous && now - begin > warmup * 1000) deltas.push(now - previous);
            previous = now;
            if (!done(now)) {
              requestAnimationFrame(frame);
              return;
            }
            const sorted = [...deltas].sort((a, b) => a - b);
            const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
            const total = deltas.reduce((sum, value) => sum + value, 0);
            const render = window.bgvr.renderer.info.render;
            const latest = window.bgvr.context.frame();
            resolve({
              frames: deltas.length,
              window: (now - begin) / 1000 - warmup,
              frameMs: total / deltas.length,
              fps: (deltas.length * 1000) / total,
              p50Ms: at(0.5),
              // **Das 1-%-Perzentil der Bildzeit** — die langsamsten ein
              // Prozent der Bilder. In der Brille ist das der Ruckler, und ein
              // Mittelwert versteckt ihn.
              p99Ms: at(0.99),
              maxMs: sorted[sorted.length - 1],
              // Was die App selbst über ihr Bild weiß (`core/FrameStats.ts`):
              // `cpuMs` ist die JavaScript-Zeit eines Schritts. Liegt sie nahe
              // an der Bildzeit, hängt das Bild am Rechnen und nicht am Füllen.
              cpuMs: latest?.cpuMs ?? null,
              calls: render.calls,
              triangles: render.triangles,
              programs: window.bgvr.renderer.info.programs?.length ?? null,
              pixelRatio: window.bgvr.renderer.getPixelRatio(),
              buffer: [
                document.querySelector('#scene').width,
                document.querySelector('#scene').height,
              ],
            });
          };
          requestAnimationFrame(frame);
        }),
      { warmup, seconds, minFrames, maxSeconds },
    );
    return { ...sample, errors };
  } finally {
    await context.close();
  }
}

/** Der Median mehrerer Wiederholungen — ein Ausreißer soll keine Zeile kippen. */
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function fold(runs) {
  const pick = (key) => median(runs.map((run) => run[key]).filter((value) => value != null));
  const last = runs[runs.length - 1];
  const times = runs.map((run) => run.frameMs);
  return {
    runs: runs.length,
    // **Wie weit die Wiederholungen auseinanderliegen**, als Anteil des
    // Medians. Sie ist die Fehlerbalken-Spalte dieser Tabelle: Ein Unterschied
    // zwischen zwei Fällen, der kleiner ist als die Streuung beider, ist
    // keiner.
    spread: (Math.max(...times) - Math.min(...times)) / median(times),
    frames: pick('frames'),
    frameMs: pick('frameMs'),
    fps: pick('fps'),
    p50Ms: pick('p50Ms'),
    p99Ms: pick('p99Ms'),
    maxMs: pick('maxMs'),
    cpuMs: runs.some((run) => run.cpuMs != null) ? pick('cpuMs') : null,
    calls: last.calls,
    triangles: last.triangles,
    programs: last.programs,
    pixelRatio: last.pixelRatio,
    buffer: last.buffer,
    errors: [...new Set(runs.flatMap((run) => run.errors))],
    samples: runs.map((run) => ({ frameMs: run.frameMs, p99Ms: run.p99Ms, frames: run.frames })),
  };
}

// --- der Lauf ---------------------------------------------------------------

await mkdir(path.dirname(out), { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.env.SMOKE_EXECUTABLE ? { executablePath: process.env.SMOKE_EXECUTABLE } : {}),
  args: software
    ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-webgl', '--ignore-gpu-blocklist'],
});

const plan = cases().filter((item) => !only || only.has(item.id));
const results = [];
const report = {
  url: base,
  renderer: software ? 'swiftshader' : 'gpu',
  baseSize: `${baseSize.width}x${baseSize.height}`,
  seconds,
  warmup,
  minFrames,
  maxSeconds,
  repeats,
  started: new Date().toISOString(),
  results,
};
const save = () => writeFile(out, JSON.stringify(report, null, 2));

/**
 * **Die Wiederholungen werden verschränkt und nicht hintereinander gemessen.**
 *
 * Das ist keine Kosmetik, sondern der Grund, warum die Verhältnisse unten
 * überhaupt etwas wert sind: SwiftShader rechnet auf der CPU, und auf dieser
 * CPU laufen nebenbei ein Vite, ein Jest oder ein zweiter Agent. Die Last
 * driftet über Minuten — misst man `basis` dreimal hintereinander und danach
 * `comic` dreimal hintereinander, misst man die Drift und nennt sie Comic. Ein
 * Durchgang durch **alle** Fälle je Wiederholung verteilt jede Drift
 * gleichmäßig über die ganze Tabelle; der Median über die Durchgänge wirft den
 * Ausreißer weg.
 */
const tasks = worlds.flatMap((world) => plan.map((item) => ({ world, item })));
const collected = new Map(tasks.map((task) => [`${task.world}/${task.item.id}`, []]));

try {
  for (let repeat = 1; repeat <= repeats; repeat++) {
    for (const { world, item } of tasks) {
      const key = `${world}/${item.id}`;
      process.stdout.write(
        `… ${world} · ${item.id}${repeats > 1 ? ` (${repeat}/${repeats})` : ''}\n`,
      );
      const run = await measure(browser, world, item);
      collected.get(key).push(run);
      console.log(
        `  ${run.frameMs.toFixed(1)} ms · ${run.fps.toFixed(1)} fps · ` +
          `1 % ≥ ${run.p99Ms.toFixed(1)} ms · ${run.calls} Draws · ${run.frames} Bilder`,
      );
      results.length = 0;
      for (const { world: w, item: i } of tasks) {
        const runs = collected.get(`${w}/${i.id}`);
        if (runs.length) results.push({ world: w, case: i.id, label: i.label, ...fold(runs) });
      }
      await save();
    }
  }
} finally {
  await browser.close();
  report.finished = new Date().toISOString();
  await save();
}

// --- der Bericht ------------------------------------------------------------

/** Eine Textspalte, breit genug für ihren längsten Eintrag. */
function table(rows, columns) {
  const widths = columns.map((column) =>
    Math.max(column.head.length, ...rows.map((row) => String(column.cell(row)).length)),
  );
  const line = (cells) =>
    cells
      .map((cell, index) =>
        columns[index].right
          ? String(cell).padStart(widths[index])
          : String(cell).padEnd(widths[index]),
      )
      .join('  ');
  const out = [line(columns.map((column) => column.head))];
  out.push(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) out.push(line(columns.map((column) => column.cell(row))));
  return out.join('\n');
}

const num = (value, digits = 1) => (value == null ? '—' : value.toFixed(digits));

console.log(`\n=== Messung · ${report.renderer} · Basis ${report.baseSize} ===\n`);
console.log(
  table(results, [
    { head: 'Welt', cell: (row) => row.world },
    { head: 'Fall', cell: (row) => row.case },
    { head: 'Bilder', cell: (row) => row.frames, right: true },
    { head: '⌀ ms', cell: (row) => num(row.frameMs), right: true },
    { head: 'fps', cell: (row) => num(row.fps), right: true },
    { head: 'Median ms', cell: (row) => num(row.p50Ms), right: true },
    { head: '1 % ≥ ms', cell: (row) => num(row.p99Ms), right: true },
    { head: 'CPU ms', cell: (row) => num(row.cpuMs), right: true },
    { head: 'Streuung', cell: (row) => `${(row.spread * 100).toFixed(0)} %`, right: true },
    { head: 'Draws', cell: (row) => row.calls, right: true },
    { head: 'Dreiecke', cell: (row) => row.triangles, right: true },
    { head: 'Puffer', cell: (row) => row.buffer.join('×') },
  ]),
);

/**
 * **Die Verhältnisse** — das, wofür es dieses Werkzeug gibt. Angegeben wird je
 * Fall, wie viel Bildzeit er gegenüber der Basis derselben Welt kostet oder
 * spart; ein Wert nahe null heißt: **dieser Schalter tut nichts.**
 */
console.log('\n=== Was jeder Schalter kostet (Bildzeit gegen die Basis derselben Welt) ===\n');
const relative = [];
for (const world of worlds) {
  const basis = results.find((row) => row.world === world && row.case === 'basis');
  if (!basis) continue;
  for (const row of results.filter((item) => item.world === world && item.case !== 'basis')) {
    const delta = (row.frameMs - basis.frameMs) / basis.frameMs;
    const jitter = (row.p99Ms - basis.p99Ms) / basis.p99Ms;
    relative.push({ world, case: row.case, label: row.label, delta, jitter });
  }
}
report.relative = relative;
console.log(
  table(relative, [
    { head: 'Welt', cell: (row) => row.world },
    { head: 'Fall', cell: (row) => row.case },
    {
      head: 'Bildzeit',
      cell: (row) => `${row.delta >= 0 ? '+' : ''}${(row.delta * 100).toFixed(0)} %`,
      right: true,
    },
    {
      head: 'Ruckler (1 %)',
      cell: (row) => `${row.jitter >= 0 ? '+' : ''}${(row.jitter * 100).toFixed(0)} %`,
      right: true,
    },
    { head: 'Bedeutung', cell: (row) => row.label },
  ]),
);

const basisRows = results.filter((row) => row.case === 'basis');
if (basisRows.length > 1) {
  const [first, ...rest] = basisRows;
  console.log('\n=== Welt gegen Welt (Basis) ===\n');
  for (const row of rest) {
    console.log(
      `  ${row.world} braucht ${(row.frameMs / first.frameMs).toFixed(1)}× die Bildzeit von ` +
        `${first.world} (${num(row.frameMs)} ms gegen ${num(first.frameMs)} ms) — ` +
        `${row.calls} Draws gegen ${first.calls}, ` +
        `${(row.triangles / 1000).toFixed(0)}k Dreiecke gegen ${(first.triangles / 1000).toFixed(0)}k.`,
    );
  }
}

const broken = results.filter((row) => row.errors.length);
if (broken.length) {
  console.log('\nFehler in der Konsole:');
  for (const row of broken) console.log(`  ${row.world}/${row.case}: ${row.errors[0]}`);
}

await save();
console.log(`\nJSON: ${out}`);
console.log(
  'Merke: SwiftShader ist keine Quest 3 — absolute fps sagen nichts, ' +
    'die Verhältnisse sagen etwas. Siehe docs/quest3-referenz.md.',
);
