/**
 * **Die Messstrecke der Küche** — Zeichenaufrufe aus der Augenperspektive,
 * einmal um die eigene Achse.
 *
 *   npm run dev -- --port 5183
 *   npm run perf:kitchen -- --url=http://127.0.0.1:5183/
 *
 * **Das Schwesterwerkzeug von `npm run fps`** (`tools/fps-bench.mjs`) und
 * dieselbe Seitenvorbereitung: HMR abgeklemmt, Service Worker aus,
 * Grafikeinstellungen vollständig geschrieben, aus den Augen und nicht von
 * oben. Nur die Frage ist eine andere. Die Messstrecke für die Bildrate fragt,
 * **was ein Regler kostet** (`docs/quest3-referenz.md`); diese hier fragt,
 * **wer die Zeichenaufrufe verbraucht** — je Objekt, je Material, je Netz und
 * je Blickrichtung. Das ist die Frage hinter dem offenen Posten M3 dort.
 *
 * Gemessen wird dort, wo ein Koch steht: `?at=kitchen#test` setzt die Füße auf
 * die Ankerkachel der Küche (`worlds/test/layout.ZONE_TILES`), und gezählt wird
 * für **zwölf Blickrichtungen** je 30°. Das ist die Zahl, um die es geht: Die
 * Zeichenaufrufe eines Bildes hängen in dieser Welt nicht davon ab, wo man
 * steht, sondern **wohin man sieht** (AGENTS.md, „Warum tausend Bodenkacheln
 * trotzdem ein Zeichenaufruf sind").
 *
 * **Was hier ehrlich herauskommt und was nicht.** Zählwerte — Aufrufe, Objekte,
 * Materialien, Dreiecke — kommen aus `renderer.info` und aus dem Renderer
 * selbst; sie gelten unabhängig davon, welche Grafikkarte darunter steckt.
 * **Zeiten gelten nur für diesen Rechner.** Im Container zeichnet SwiftShader in
 * Software, und dann steckt die halbe Bildzeit im Rasterisierer; deshalb trennt
 * die Auswertung der JavaScript-Zeit ausdrücklich zwischen dem, was im Renderer
 * liegt (hier: unbrauchbar), und dem, was davor läuft (der Anteil der Aufrufer
 * ist brauchbar, die Millisekunden sind es nicht). Eine Bildrate für die Quest 3
 * fällt hier **nicht** ab — die misst man am Gerät.
 *
 * **Drei Posen**, alle an derselben Stelle:
 *
 * - `quest-eye` — 1,15 m Augenhöhe, die der Spieler in der Brille in der Küche
 *   hat (`core/posture.DEFAULT_EYES.kitchen`). Am Schreibtisch gilt sie nicht:
 *   `zones/kitchen.fitEyes` staucht den Körper nur in einer XR-Sitzung, also
 *   setzt die Messung die Augenhöhe für das Bild selbst.
 * - `quest-eye-wide` — dieselbe Höhe, aber ein Sichtfeld wie ein Auge der Quest
 *   (96° senkrecht, Seitenverhältnis 0,935). Grobe Näherung, und sie sagt vor
 *   allem eines: Die 70°/16:10 des Bildschirms sind waagerecht ähnlich weit.
 * - `desk-eye` — 1,65 m, zum Vergleich mit dem, was man am Bildschirm sieht.
 *
 * Optionen: `--url=…`, `--steps=12`, `--frames=3`, `--output=…`, `--headed`,
 * `--no-software` (echte Grafik statt SwiftShader), `--profile=0` (ohne
 * CPU-Profil). `SMOKE_EXECUTABLE` zeigt wie beim Rauchtest auf einen
 * vorinstallierten Browser.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const base = args.get('url') ?? process.env.SMOKE_URL ?? 'http://127.0.0.1:5183/';
const steps = Math.max(1, Math.min(72, Number(args.get('steps') ?? 12)));
const frames = Math.max(1, Math.min(20, Number(args.get('frames') ?? 3)));
const wantProfile = args.get('profile') !== '0';
const software = args.get('software') !== 'false' && !args.has('no-software');
const output = path.resolve(
  args.get('output') ??
    path.join(root, `.artifacts/perf-kitchen/${new Date().toISOString().replace(/[:.]/g, '-')}`),
);
await mkdir(output, { recursive: true });

/** Derselbe Stummel wie in `fps-bench.mjs`: HMR ohne Verbindung. */
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

/** Die drei Posen; `eyeY` ist die Augenhöhe über dem Boden, `fov` senkrecht. */
const POSES = [
  { name: 'quest-eye', eyeY: 1.15, fov: 70, aspect: 1.6 },
  { name: 'quest-eye-wide', eyeY: 1.15, fov: 96, aspect: 0.935 },
  { name: 'desk-eye', eyeY: 1.65, fov: 70, aspect: 1.6 },
];

/**
 * **Der Haken im Renderer.** `WebGLRenderer.renderBufferDirect` ist die eine
 * Stelle, durch die jeder Zeichenaufruf geht — der des Hauptdurchgangs wie der
 * des Schattendurchgangs, und three ruft sie über die Instanz auf
 * (`_this.renderBufferDirect`, `renderer.renderBufferDirect` im Schattenteil).
 * Also lässt sie sich von außen umhüllen, ohne eine Zeile im Spiel zu ändern.
 *
 * Getrennt wird nach Durchgang, indem `shadowMap.render` und `render` selbst
 * umhüllt werden: Ein Renderziel heißt Spiegel- oder Portalsicht, kein
 * Renderziel und keine Verschachtelung heißt das Bild, das der Spieler sieht.
 *
 * Und die Pose gilt **im** Bild: Augenhöhe und Sichtfeld werden unmittelbar vor
 * `render` gesetzt und danach zurückgestellt, denn genau dort entscheidet die
 * Projektionsmatrix, was ausgesiebt wird.
 */
function instrument() {
  const app = globalThis.bgvr;
  const r = app.renderer;
  if (r.__perf) return;

  const rows = new Map();
  let pass = 'main';
  let bucket = 'none';
  let active = false;
  let pose = null;
  let depth = 0;

  const pathOf = (o) => {
    const parts = [];
    for (let n = o; n; n = n.parent) parts.push(n.name || n.type);
    return parts.reverse().join('/');
  };
  const triOf = (geometry, group) => {
    const pos = geometry.attributes.position;
    if (!pos) return 0;
    let count = geometry.index ? geometry.index.count : pos.count;
    if (group && group.count !== Infinity) count = Math.min(count, group.count);
    if (geometry.drawRange && geometry.drawRange.count !== Infinity)
      count = Math.min(count, geometry.drawRange.count);
    return Math.floor(count / 3);
  };

  const buffer = r.renderBufferDirect;
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    if (active) {
      const key = [bucket, pass, object.uuid, material.uuid, geometry.uuid].join('|');
      let row = rows.get(key);
      if (!row) {
        const instances = object.isInstancedMesh ? object.count : 1;
        row = {
          bucket,
          pass,
          path: pathOf(object),
          objectType: object.type,
          material: material.name || material.type,
          materialType: material.type,
          materialUuid: material.uuid,
          geometry: geometry.name || geometry.type,
          geometryUuid: geometry.uuid,
          instances,
          triangles: triOf(geometry, group) * instances,
          calls: 0,
        };
        rows.set(key, row);
      }
      row.calls += 1;
    }
    return buffer.call(this, camera, scene, geometry, material, object, group);
  };

  const shadow = r.shadowMap.render;
  r.shadowMap.render = function (lights, scene, camera) {
    const before = pass;
    pass = 'shadow';
    try {
      return shadow.call(this, lights, scene, camera);
    } finally {
      pass = before;
    }
  };

  const render = r.render;
  r.render = function (scene, camera) {
    const before = pass;
    depth += 1;
    const target = r.getRenderTarget();
    const main = !target && depth === 1;
    pass = target ? 'offscreen' : depth > 1 ? 'nested' : 'main';
    let keep = null;
    if (main && pose && camera === app.camera) {
      keep = { y: camera.position.y, fov: camera.fov, aspect: camera.aspect };
      camera.position.y = pose.eyeY;
      camera.fov = pose.fov;
      camera.aspect = pose.aspect;
      camera.updateProjectionMatrix();
      app.rig.updateMatrixWorld(true);
    }
    try {
      return render.call(this, scene, camera);
    } finally {
      if (keep) {
        camera.position.y = keep.y;
        camera.fov = keep.fov;
        camera.aspect = keep.aspect;
        camera.updateProjectionMatrix();
        app.rig.updateMatrixWorld(true);
      }
      depth -= 1;
      pass = before;
    }
  };

  r.__perf = {
    start: (name) => {
      bucket = name;
      active = true;
    },
    stop: () => {
      active = false;
    },
    setPose: (next) => {
      pose = next;
    },
    rows: () => [...rows.values()],
    info: () => ({ ...r.info.render }),
  };
}

/** Ein Bild von Hand, so oft wie verlangt — die Schleife gehört dem Skript. */
const drive = (page, count) =>
  page.evaluate(async (n) => {
    const app = globalThis.bgvr;
    for (let i = 0; i < n; i++) {
      app.frame((globalThis.__perfTime = (globalThis.__perfTime ?? performance.now()) + 16.7));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, count);

const face = (page, deg) =>
  page.evaluate((y) => {
    const app = globalThis.bgvr;
    app.rig.rotation.set(0, (y * Math.PI) / 180, 0);
    app.camera.rotation.set(0, 0, 0);
    app.rig.updateMatrixWorld(true);
    app.flat?.syncFromRig?.();
  }, deg);

// --- Auswertung -------------------------------------------------------------

/** Der benannte Knoten unter der Welt — das „Ding", nicht der einzelne Puffer. */
const thingOf = (p) => {
  const parts = p.split('/');
  return `${parts[1] ?? p}/${parts[2] ?? '(direkt)'}`;
};

function rank(rows, pick, perFrame) {
  const map = new Map();
  for (const row of rows) {
    const key = pick(row);
    let e = map.get(key);
    if (!e)
      map.set(
        key,
        (e = { key, calls: 0, main: 0, shadow: 0, triangles: 0, parts: 0, dirs: new Set() }),
      );
    e.calls += row.calls;
    e[row.pass] = (e[row.pass] ?? 0) + row.calls;
    e.triangles += row.triangles * row.calls;
    e.parts += 1;
    e.dirs.add(row.bucket);
  }
  return [...map.values()]
    .map((e) => ({
      key: e.key,
      calls: +(e.calls / perFrame).toFixed(1),
      main: +(e.main / perFrame).toFixed(1),
      shadow: +(e.shadow / perFrame).toFixed(1),
      triangles: Math.round(e.triangles / perFrame),
      dirs: e.dirs.size,
    }))
    .sort((a, b) => b.calls - a.calls);
}

/**
 * Das CPU-Profil, getrennt nach dem, was zählt: Alles unter
 * `WebGLRenderer.render` ist auf diesem Rechner der Software-Rasterisierer und
 * sagt über eine Brille nichts; davor liegt die Rechenzeit des Spiels.
 */
function readProfile(profile, frameCount) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const self = new Map();
  for (let i = 0; i < profile.samples.length; i++) {
    const dt = Math.max(0, profile.timeDeltas[i] ?? 0);
    self.set(profile.samples[i], (self.get(profile.samples[i]) ?? 0) + dt);
  }
  const nameOf = (id) => byId.get(id)?.callFrame.functionName || '(anonym)';
  const placeOf = (id) => {
    const f = byId.get(id)?.callFrame;
    if (!f?.url) return '';
    return `${f.url.replace(/^https?:\/\/[^/]+\//, '').replace(/\?.*$/, '')}:${f.lineNumber + 1}`;
  };

  let inFrame = 0;
  let inRender = 0;
  const callers = new Map();
  const functions = new Map();
  for (const n of profile.nodes) {
    const us = self.get(n.id) ?? 0;
    if (!us) continue;
    const chain = [];
    for (let cur = n.id; cur !== undefined; cur = parent.get(cur)) chain.push(nameOf(cur));
    chain.reverse();
    const start = chain.indexOf('frame');
    if (start < 0) continue;
    inFrame += us;
    if (chain.some((name, i) => i > start && name.startsWith('WebGL'))) {
      inRender += us;
      continue;
    }
    functions.set(
      `${nameOf(n.id)} (${placeOf(n.id)})`,
      (functions.get(`${nameOf(n.id)} (${placeOf(n.id)})`) ?? 0) + us,
    );
    const path = chain.slice(start).filter(Boolean);
    for (let d = 2; d <= Math.min(path.length, 6); d++) {
      const key = path.slice(0, d).join(' > ');
      callers.set(key, (callers.get(key) ?? 0) + us);
    }
  }
  const outside = inFrame - inRender;
  const list = (map, limit) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, us]) => ({
        name,
        anteil: +((100 * us) / (outside || 1)).toFixed(1),
        msProBild: +(us / 1000 / frameCount).toFixed(3),
      }));
  return {
    bildschleifeMs: +(inFrame / 1000).toFixed(0),
    imRendererMs: +(inRender / 1000).toFixed(0),
    ausserhalbMsProBild: +(outside / 1000 / frameCount).toFixed(2),
    callers: list(callers, 25),
    functions: list(functions, 20),
  };
}

// --- Der Lauf ---------------------------------------------------------------

// **Erst nachsehen, ob überhaupt jemand da ist** — derselbe Griff wie in
// `fps-bench.mjs`: Der häufigste Fehler beim Messen verdient die kürzeste
// Antwort und nicht neunzig Sekunden Zeitüberschreitung.
try {
  const probe = await fetch(base, { method: 'GET' });
  if (!probe.ok) throw new Error(`HTTP ${probe.status}`);
} catch (error) {
  console.error(`Unter ${base} antwortet kein Dev-Server (${error.message}).`);
  console.error('Erst `npm run dev -- --port 5183`, dann diesen Befehl.');
  process.exit(1);
}

const browser = await chromium.launch({
  headless: !args.has('headed'),
  ...(process.env.SMOKE_EXECUTABLE ? { executablePath: process.env.SMOKE_EXECUTABLE } : {}),
  args: software
    ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-webgl', '--ignore-gpu-blocklist'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
  // Der Service Worker der PWA hält Module aus einem früheren Lauf fest.
  serviceWorkers: 'block',
  reducedMotion: 'reduce',
});
// **Der HMR-Client wird abgeklemmt.** In diesem Arbeitsverzeichnis schreiben
// mehrere Agenten; eine Messung, der mitten im Rundumblick die Seite neu lädt,
// ist keine Messung (`fps-bench.mjs` erklärt es im Langen).
await context.route('**/@vite/client', (route) =>
  route.fulfill({ contentType: 'text/javascript', body: VITE_CLIENT_STUB }),
);
// Vollständig geschrieben und nicht zusammengeführt: ein Rest aus einem
// früheren Lauf im selben Profil wäre eine stille Fehlmessung. Schatten
// bleiben **an** — das ist der Auslieferungszustand, und der Durchgang ist
// genau einer der Posten, um die es geht.
await context.addInitScript(() => {
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
      screenPads: 'off',
    }),
  );
});
const page = await context.newPage();
const errors = [];
const crashes = [];
page.on('pageerror', (error) => {
  crashes.push(String(error));
  errors.push(error.stack ?? error.message);
});
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(`console: ${message.text().slice(0, 300)}`);
});

const url = new URL(base);
url.searchParams.set('at', 'kitchen');
url.hash = 'sandbox';
console.log(`Messstrecke Küche: ${url.href}`);
await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
// Aus den Augen und nicht von oben — von oben zeichnet `TopDownCamera` etwas
// anderes, und `GridWorld.stepWallGhosts` schaltet dort sogar die Wandbündel um.
await page.locator('#screen-view [data-view="3d"]').click();
// **Der Knopf ist stumpf, bis die Welt geladen ist** (`core/warmStart.ts`,
// `startButton`) — und gerade hier dauert das: Die Küche ist die schwerste
// Kachel, die es gibt. Playwright wartete von sich aus, aber nur 30 s; die
// Frist steht deshalb hier und passt zu der weiter unten.
await page.locator('#enter:not([disabled])').waitFor({ timeout: 180000 });
await page.locator('#enter').click();
// Und hier wartet man nicht blind: Lädt die Welt nicht, soll der Fehler kommen
// und nicht die Zeitüberschreitung.
await Promise.race([
  page.waitForFunction(() => globalThis.bgvr?.currentWorldId === 'sandbox' && globalThis.bgvr.world, null, {
    timeout: 120000,
  }),
  new Promise((_, reject) => {
    const watch = setInterval(() => {
      if (!crashes.length) return;
      clearInterval(watch);
      reject(new Error(`Die Sandbox lädt nicht: ${crashes[0]}`));
    }, 250);
    watch.unref?.();
  }),
]);
await page.waitForFunction(() => globalThis.bgvr?.loading == null, null, { timeout: 180000 });
// Modelle, Physik und Zonen kommen asynchron nach; danach steht das Bild.
await page.waitForTimeout(12000);

const scene = await page.evaluate(() => {
  const app = globalThis.bgvr;
  app.rig.updateMatrixWorld(true);
  const eye = app.camera.getWorldPosition(app.camera.position.clone());
  let nodes = 0;
  let meshes = 0;
  let visible = 0;
  app.scene.traverse((n) => {
    nodes += 1;
    if (n.isMesh || n.isInstancedMesh) meshes += 1;
  });
  app.scene.traverseVisible((n) => {
    if (n.isMesh || n.isInstancedMesh) visible += 1;
  });
  const gl = app.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    world: app.worldId,
    topDown: app.topDown,
    feet: app.rig.position.toArray().map((v) => +v.toFixed(2)),
    eye: [eye.x, eye.y, eye.z].map((v) => +v.toFixed(2)),
    fov: app.camera.fov,
    aspect: +app.camera.aspect.toFixed(2),
    shadows: app.renderer.shadowMap.enabled,
    nodes,
    meshes,
    visibleMeshes: visible,
    gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  };
});
if (scene.world !== 'sandbox' || scene.topDown)
  throw new Error(`Falsche Ansicht: ${scene.world}, topDown=${scene.topDown}`);
console.log(
  `Augen bei ${scene.eye.join(' / ')} (Bildschirm), Szene ${scene.nodes} Knoten, ` +
    `${scene.meshes} Netze, davon ${scene.visibleMeshes} sichtbar`,
);
console.log(`Grafik: ${scene.gpu}`);

await page.evaluate(() => globalThis.bgvr.renderer.setAnimationLoop(null));
await drive(page, 20);
await page.evaluate(instrument);

const sweeps = {};
for (const pose of POSES) {
  await page.evaluate((next) => globalThis.bgvr.renderer.__perf.setPose(next), pose);
  const directions = [];
  for (let i = 0; i < steps; i++) {
    const deg = Math.round((360 / steps) * i);
    await face(page, deg);
    await drive(page, 3); // einschwingen, nicht gezählt
    await page.evaluate((name) => globalThis.bgvr.renderer.__perf.start(name), `${pose.name}|${deg}`);
    await drive(page, frames);
    const info = await page.evaluate(() => {
      globalThis.bgvr.renderer.__perf.stop();
      return globalThis.bgvr.renderer.__perf.info();
    });
    directions.push({ deg, calls: info.calls, triangles: info.triangles });
  }
  sweeps[pose.name] = { pose, directions };
}

const rows = await page.evaluate(() => globalThis.bgvr.renderer.__perf.rows());
const perFrame = steps * frames;
for (const pose of POSES) {
  const own = rows.filter((row) => row.bucket.startsWith(`${pose.name}|`));
  const sweep = sweeps[pose.name];
  sweep.perDirection = sweep.directions.map(({ deg, calls, triangles }) => {
    const here = own.filter((row) => row.bucket === `${pose.name}|${deg}`);
    const of = (pass) => here.filter((r) => r.pass === pass).reduce((a, r) => a + r.calls, 0) / frames;
    return {
      deg,
      calls,
      main: Math.round(of('main')),
      shadow: Math.round(of('shadow')),
      triangles,
      things: new Set(here.filter((r) => r.pass === 'main').map((r) => thingOf(r.path))).size,
    };
  });
  sweep.perObject = rank(own, (r) => thingOf(r.path), perFrame);
  sweep.perMaterial = rank(
    own,
    (r) => `${r.material} [${r.materialType}] ${r.materialUuid.slice(0, 6)}`,
    perFrame,
  );
  sweep.perMesh = rank(own, (r) => `${r.geometry} ${r.geometryUuid.slice(0, 6)}`, perFrame);
}

let js = null;
if (wantProfile) {
  await page.evaluate((next) => globalThis.bgvr.renderer.__perf.setPose(next), POSES[0]);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  let profiled = 0;
  for (let i = 0; i < steps; i++) {
    await face(page, Math.round((360 / steps) * i));
    await drive(page, 8);
    profiled += 8;
  }
  const { profile } = await cdp.send('Profiler.stop');
  await writeFile(path.join(output, 'profile.cpuprofile'), JSON.stringify(profile));
  js = readProfile(profile, profiled);
  js.frames = profiled;
}

await writeFile(path.join(output, 'rows.json'), JSON.stringify(rows));
await writeFile(
  path.join(output, 'report.json'),
  JSON.stringify({ url: url.href, scene, steps, frames, sweeps, js, errors }, null, 1),
);

// --- Was auf dem Schirm steht ----------------------------------------------

const main = sweeps['quest-eye'];
const mean = (list, key) => list.reduce((a, e) => a + e[key], 0) / list.length;
console.log('\n## Zeichenaufrufe je Blickrichtung (Augenhöhe der Brille, 1,15 m)');
console.log('Grad | gesamt | Hauptdurchgang | Schattendurchgang | Dreiecke | benannte Dinge im Bild');
for (const d of main.perDirection)
  console.log(
    `${String(d.deg).padStart(4)} | ${String(d.calls).padStart(6)} | ${String(d.main).padStart(14)} | ` +
      `${String(d.shadow).padStart(17)} | ${String(d.triangles).padStart(8)} | ${d.things}`,
  );
console.log(
  `Mittel: ${mean(main.perDirection, 'calls').toFixed(0)} Aufrufe ` +
    `(${mean(main.perDirection, 'main').toFixed(0)} Haupt + ${mean(main.perDirection, 'shadow').toFixed(0)} Schatten). ` +
    'In der Brille wird der Hauptdurchgang je Auge gezeichnet, der Schatten einmal — ' +
    'das ist ein Zählwert und keine Bildzeit.',
);

const show = (title, list) => {
  console.log(`\n## ${title} (Mittel je Bild über ${steps} Richtungen)`);
  console.log('Aufrufe | Haupt | Schatten | Dreiecke | Richtungen | Name');
  for (const e of list.slice(0, 20))
    console.log(
      `${String(e.calls).padStart(7)} | ${String(e.main).padStart(5)} | ${String(e.shadow).padStart(8)} | ` +
        `${String(e.triangles).padStart(8)} | ${String(e.dirs).padStart(10)} | ${e.key}`,
    );
  const rest = list.slice(20).reduce((a, e) => a + e.calls, 0);
  console.log(`… und ${Math.max(0, list.length - 20)} weitere mit zusammen ${rest.toFixed(1)}`);
};
show('Je Objekt', main.perObject);
show('Je Material', main.perMaterial);
show('Je Netz', main.perMesh);

for (const name of ['quest-eye-wide', 'desk-eye']) {
  const other = sweeps[name];
  console.log(
    `\n${name}: Mittel ${mean(other.perDirection, 'calls').toFixed(0)} Aufrufe ` +
      `(${mean(other.perDirection, 'main').toFixed(0)} Haupt + ${mean(other.perDirection, 'shadow').toFixed(0)} Schatten)`,
  );
}

if (js) {
  console.log(
    `\n## JavaScript je Bild — ${js.ausserhalbMsProBild} ms außerhalb des Renderers ` +
      `(${js.imRendererMs} von ${js.bildschleifeMs} ms der Bildschleife stecken hier im ` +
      'Software-Rasterisierer; diese Zeiten gelten nur für diesen Rechner)',
  );
  console.log('Anteil | ms/Bild | Aufrufer');
  for (const e of js.callers.slice(0, 12))
    console.log(`${String(e.anteil).padStart(6)}% | ${String(e.msProBild).padStart(7)} | ${e.name}`);
  console.log('\nAnteil | ms/Bild | Funktion (Selbstzeit)');
  for (const e of js.functions.slice(0, 12))
    console.log(`${String(e.anteil).padStart(6)}% | ${String(e.msProBild).padStart(7)} | ${e.name}`);
}

console.log(`\nZahlen und Rohdaten: ${output}`);
if (errors.length) console.log(`Fehler im Lauf: ${errors.length}\n${errors.join('\n')}`);
await context.close();
await browser.close();
