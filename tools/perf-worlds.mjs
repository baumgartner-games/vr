/**
 * **Die Messstrecke der Welten** — Zeichenaufrufe, Dreiecke, Netze, Materialien
 * und die Zeit in `world.update`, für jede Welt an einer Stelle, an der etwas
 * los ist.
 *
 *   npm run dev -- --port 5183
 *   npm run perf:worlds -- --url=http://127.0.0.1:5183/
 *   npm run perf:worlds -- --url=… --only=hub,plateup --shots
 *
 * **Die kleine Schwester von `npm run perf:kitchen`** (`tools/perf-kitchen.mjs`)
 * und dieselbe Seitenvorbereitung: HMR abgeklemmt, Service Worker aus,
 * Grafikeinstellungen vollständig geschrieben, aus den Augen und nicht von
 * oben. Die Küchenstrecke fragt **wer** in einer Welt die Aufrufe verbraucht
 * und geht dafür tief; diese hier fragt **wie viel** jede Welt verbraucht, und
 * geht dafür breit — die Testküche steht als Bezug in derselben Liste.
 *
 * Je Welt: laden, einschwingen, das Vorbereitende tun (den Laden öffnen, die
 * Besucher einlassen …), ein paar Sekunden Spielzeit laufen lassen, und dann
 * **acht Blickrichtungen** je 45° zählen. Der Schattendurchgang wird getrennt
 * gezählt (die Dreiecke nur im Hauptbild), weil die Brille ihn einmal
 * zeichnet und den Hauptdurchgang zweimal (`docs/agents/grafik.md`, „Zwei
 * Zahlen, die man einmal kennen sollte").
 *
 * **Zählwerte sind ehrlich, Zeiten nicht.** Aufrufe, Dreiecke, Netze gelten auf
 * jeder Grafikkarte; die Millisekunden von `world.update` gelten nur für diesen
 * Rechner und taugen zum Vergleich der Welten untereinander, nicht als Bildzeit
 * einer Quest.
 *
 * Optionen: `--url=…`, `--only=kitchen,hub,…`, `--frames=2`, `--shots`
 * (Bildschirmfotos je Welt nach `--output`), `--ab` (danach dieselbe Szene
 * noch einmal im Zustand vor der Optimierung — ohne die Bündel aus
 * `shared/staticDecor.ts`, in Haunting ohne den Raum-Culler — Zahlen und
 * Foto zum Vergleich), `--yaw=…` (Blickrichtung des Fotos), `--depth=3` (wie
 * tief die Rangliste je Objekt schaut), `--profile` (CPU-Profil: wer in
 * `world.update` die Zeit braucht), `--output=…`, `--no-software`,
 * `--headed`, `--shadows=off|simple|full` (ab Werk `simple`). `SMOKE_EXECUTABLE` zeigt auf einen vorinstallierten Browser.
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
const frames = Math.max(1, Math.min(10, Number(args.get('frames') ?? 2)));
const software = !args.has('no-software');
const shots = args.has('shots');
const ab = args.has('ab');
/** Die Blickrichtung des Fotos, statt der des Szenarios (`--yaw=300`). */
const yawOverride = args.has('yaw') ? Number(args.get('yaw')) : null;
/** Wie tief die Rangliste in den Szenengraphen schaut (`--depth=3`). */
const depth = Math.max(1, Number(args.get('depth') ?? 3));
/** Ein CPU-Profil über `world.update` (`--profile`): wer darin die Zeit braucht. */
const profile = args.has('profile');
/** Der Schattenmodus (`--shadows=off|simple|full`, ab Werk der Kreis wie im Spiel). */
const shadowMode = args.get('shadows') ?? 'simple';
const output = path.resolve(
  args.get('output') ??
    path.join(root, `.artifacts/perf-worlds/${new Date().toISOString().replace(/[:.]/g, '-')}`),
);
await mkdir(output, { recursive: true });

/**
 * **Die Welten und was in ihnen passieren muss, bevor gezählt wird.**
 * `setup` läuft in der Seite (`globalThis.bgvr` ist die App), `sim` sind die
 * Sekunden Spielzeit danach, in Bildern zu je 50 ms (so weit lässt `App.step`
 * einen Schritt höchstens gehen), `yaw` die Blickrichtung des Fotos.
 */
const SCENARIOS = [
  {
    id: 'kitchen',
    title: 'Testküche (Bezug)',
    search: '?at=kitchen',
    hash: 'sandbox',
    sim: 1,
  },
  { id: 'hub', title: 'Hub (Lobby-Deko)', hash: 'hub', sim: 1 },
  {
    id: 'plateup',
    title: 'Burgerladen, Tag läuft, Gäste da',
    hash: 'plateup',
    // Der Laden öffnet ohne den Gang zur Glocke, und die Uhr läuft schneller:
    // Im Browser ohne Grafikkarte kämen sonst kaum Gäste an.
    setup: () => {
      const world = globalThis.bgvr.world;
      world.debugSpeed?.(4);
      world.debugOpen?.();
      return 'Laden offen, Uhr ×4';
    },
    // Nach 48 s Ladenzeit sitzen die ersten Gäste; bei ×20 war der Tag schon
    // vorbei, bevor gezählt wurde.
    sim: 12,
    after: () => `${globalThis.bgvr.world.state?.guests?.length ?? '?'} Gäste im Laden`,
    yaw: 180,
  },
  {
    id: 'editor',
    title: 'Bauplatz',
    hash: 'editor',
    // Der Beispielraum des Baukastens, sofern es ihn gibt — gesucht wird eine
    // Methode, die danach klingt, damit die Strecke nicht bricht, wenn sie
    // anders heißt oder (noch) fehlt.
    setup: () => {
      const world = globalThis.bgvr.world;
      const names = [];
      for (let o = world; o && o !== Object.prototype; o = Object.getPrototypeOf(o))
        names.push(...Object.getOwnPropertyNames(o));
      const hit = names.find((name) => /sample|beispiel|example|demoRoom/i.test(name));
      if (hit && typeof world[hit] === 'function') {
        world[hit]();
        return hit;
      }
      return null;
    },
    sim: 3,
  },
  {
    id: 'seating',
    title: 'Sandbox, Sitzecke mit NPCs',
    // Neben dem Eingang der Sitzecke: Wer näher als 30 m kommt, lässt die
    // Besucher herein (`test/zones/seating.ts`).
    search: '?at=-16,1',
    hash: 'sandbox',
    sim: 20,
    yaw: 180,
  },
  {
    id: 'haunting',
    title: 'Haunting, Übungsrunde',
    hash: 'haunting',
    sim: 2,
    // Man steht in der Einsatzzentrale und schaut durch die Glaswand.
    yaw: 180,
    // Zum Vergleich ohne den Raum-Culler (`HauntingWorld.cullRoomArt`): Was
    // bringt er aus der Einsatzzentrale? (Nichts — sie ist für ihn „kein
    // Raum", siehe `docs/agents/grafik.md`.)
    undo: () => {
      const world = globalThis.bgvr.world;
      world.cullRoomArt = () => {};
      for (const group of world.roomArt.values()) group.visible = true;
      world.experience?.setVisibleRooms(null);
      return 'ohne Raum-Culler';
    },
  },
  {
    id: 'haunting-room',
    title: 'Haunting, Übungsrunde, im Eingangsraum',
    hash: 'haunting',
    // Mitten in den Raum hinter der Glaswand — dort, wo man die Station
    // betritt und durch vier Türen in die Gänge sieht.
    setup: () => {
      const app = globalThis.bgvr;
      const world = app.world;
      const entry = world.spec.rooms.find((room) => room.id === world.spec.entryRoom);
      const at = app.rig.position
        .clone()
        .set(entry.rect.x + entry.rect.w / 2, 0, entry.rect.z + entry.rect.d / 2);
      world.movePlayerTo(app.context, at, 0);
      return `im Raum ${entry.name}`;
    },
    sim: 2,
    yaw: 90,
  },
];

const only = args.get('only')?.split(',');
const chosen = only ? SCENARIOS.filter((s) => only.includes(s.id)) : SCENARIOS;

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

/**
 * **Der Zähler im Renderer** — `renderBufferDirect` ist die Stelle, durch die
 * jeder Zeichenaufruf geht (`perf-kitchen.mjs` erklärt es im Langen). Getrennt
 * nach Hauptbild, Schatten und Renderziel (Spiegel, Portalsicht).
 */
function instrument(keyDepth) {
  const app = globalThis.bgvr;
  const r = app.renderer;
  if (r.__perfWorlds) return;
  let pass = 'main';
  let depth = 0;
  let active = false;
  const count = { main: 0, shadow: 0, offscreen: 0, triangles: 0 };
  const trianglesOf = (geometry, group, object) => {
    const pos = geometry.attributes.position;
    if (!pos) return 0;
    let n = geometry.index ? geometry.index.count : pos.count;
    if (group && group.count !== Infinity) n = Math.min(n, group.count);
    if (geometry.drawRange && geometry.drawRange.count !== Infinity)
      n = Math.min(n, geometry.drawRange.count);
    return Math.floor(n / 3) * (object.isInstancedMesh ? object.count : 1);
  };
  const things = new Map();
  const thingOf = (o) => {
    const parts = [];
    for (let n = o; n; n = n.parent) parts.push(n.name || n.type);
    parts.reverse();
    return parts.slice(1, 1 + keyDepth).join('/') || '?';
  };
  const buffer = r.renderBufferDirect;
  r.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    if (active) {
      count[pass] = (count[pass] ?? 0) + 1;
      if (pass === 'main') count.triangles += trianglesOf(geometry, group, object);
      const key = thingOf(object);
      const e = things.get(key) ?? { main: 0, shadow: 0, offscreen: 0 };
      e[pass] = (e[pass] ?? 0) + 1;
      things.set(key, e);
    }
    return buffer.call(this, camera, scene, geometry, material, object, group);
  };
  const shadow = r.shadowMap.render;
  r.shadowMap.render = function (...rest) {
    const before = pass;
    pass = 'shadow';
    try {
      return shadow.apply(this, rest);
    } finally {
      pass = before;
    }
  };
  const render = r.render;
  r.render = function (scene, camera) {
    const before = pass;
    depth += 1;
    pass = r.getRenderTarget() ? 'offscreen' : depth > 1 ? 'offscreen' : 'main';
    try {
      return render.call(this, scene, camera);
    } finally {
      depth -= 1;
      pass = before;
    }
  };
  r.__perfWorlds = {
    start() {
      for (const k of Object.keys(count)) count[k] = 0;
      active = true;
    },
    stop() {
      active = false;
      return { ...count };
    },
    things: () => [...things.entries()],
    clearThings: () => things.clear(),
  };
}

/** Die Zeit in `world.update` — umhüllt an der Instanz, nicht am Prototyp. */
function timeWorld() {
  const world = globalThis.bgvr.world;
  if (world.__perfUpdate) return;
  const update = world.update;
  const times = [];
  world.update = function (...rest) {
    const t = performance.now();
    try {
      return update.apply(this, rest);
    } finally {
      times.push(performance.now() - t);
    }
  };
  world.__perfUpdate = { times };
}

/**
 * Bilder von Hand, mit 50 ms Spielzeit je Bild. `blind` zeichnet dabei nichts:
 * Die Spielzeit vor dem Zählen (Gäste kommen, Besucher setzen sich) braucht
 * kein Bild, und im Software-Rasterisierer kostet eines eine Sekunde.
 */
const drive = (page, count, blind = false) =>
  page.evaluate(
    async ({ n, blind }) => {
      const app = globalThis.bgvr;
      const r = app.renderer;
      const render = r.render;
      if (blind) r.render = () => {};
      try {
        for (let i = 0; i < n; i++) {
          globalThis.__perfTime = (globalThis.__perfTime ?? performance.now()) + 50;
          app.frame(globalThis.__perfTime);
          if (i % 10 === 9) await new Promise((resolve) => setTimeout(resolve, 0));
        }
      } finally {
        r.render = render;
      }
    },
    { n: count, blind },
  );

const face = (page, deg) =>
  page.evaluate((y) => {
    const app = globalThis.bgvr;
    app.rig.rotation.set(0, (y * Math.PI) / 180, 0);
    app.camera.rotation.set(0, 0, 0);
    app.rig.updateMatrixWorld(true);
    app.flat?.syncFromRig?.();
  }, deg);

/** Das Vorher der Deko: alle Bündel aus `shared/staticDecor.ts` abschalten. */
function undoDecor() {
  const found = [];
  globalThis.bgvr.scene.traverse((node) => {
    if (node.userData?.staticDecor) found.push(node.userData.staticDecor);
  });
  for (const decor of found) decor.dispose();
  return found.length ? 'ohne Bündel (vorher)' : null;
}

/** Was in der Szene steht: Knoten, Netze, sichtbare Netze, Materialien, Geometrien. */
function sceneStats() {
  const app = globalThis.bgvr;
  let nodes = 0;
  let meshes = 0;
  let visible = 0;
  let instanced = 0;
  let casters = 0;
  let lights = 0;
  let shadowLights = 0;
  let autoMatrix = 0;
  const materials = new Set();
  const geometries = new Set();
  app.scene.traverse((n) => {
    nodes += 1;
    if (n.matrixAutoUpdate) autoMatrix += 1;
    if (n.isMesh) meshes += 1;
  });
  app.scene.traverseVisible((n) => {
    if (n.isLight) {
      lights += 1;
      if (n.castShadow) shadowLights += 1;
    }
    if (!n.isMesh) return;
    visible += 1;
    if (n.isInstancedMesh) instanced += 1;
    if (n.castShadow) casters += 1;
    for (const m of Array.isArray(n.material) ? n.material : [n.material]) materials.add(m.uuid);
    geometries.add(n.geometry.uuid);
  });
  return {
    nodes,
    meshes,
    visible,
    instanced,
    casters,
    materials: materials.size,
    geometries: geometries.size,
    lights,
    shadowLights,
    autoMatrix,
  };
}

/** Acht Richtungen zählen, die Zeit in `world.update` lesen, wahlweise ein Foto. */
async function measure(page, scenario, title, shotName) {
  const stats = await page.evaluate(sceneStats);
  const directions = [];
  await page.evaluate(() => {
    globalThis.bgvr.renderer.__perfWorlds.clearThings();
    globalThis.bgvr.world.__perfUpdate.times.length = 0;
  });
  for (let deg = 0; deg < 360; deg += 45) {
    await face(page, deg);
    await drive(page, 2);
    await page.evaluate(() => globalThis.bgvr.renderer.__perfWorlds.start());
    await drive(page, frames);
    const c = await page.evaluate(() => globalThis.bgvr.renderer.__perfWorlds.stop());
    directions.push({
      deg,
      main: c.main / frames,
      shadow: c.shadow / frames,
      offscreen: c.offscreen / frames,
      triangles: Math.round(c.triangles / frames),
    });
  }
  const things = await page.evaluate(() => globalThis.bgvr.renderer.__perfWorlds.things());
  const update = await page.evaluate(() => {
    const t = [...globalThis.bgvr.world.__perfUpdate.times];
    t.sort((a, b) => a - b);
    return {
      mean: t.reduce((a, b) => a + b, 0) / (t.length || 1),
      p90: t[Math.floor(t.length * 0.9)] ?? 0,
    };
  });
  if (shots) {
    await face(page, yawOverride ?? scenario.yaw ?? 0);
    await drive(page, 2);
    await page.screenshot({ path: path.join(output, `${shotName}.png`), timeout: 180000 });
  }
  const mean = (k) => directions.reduce((a, d) => a + d[k], 0) / directions.length;
  const max = (k) => Math.max(...directions.map((d) => d[k]));
  const perFrame = frames * directions.length;
  const top = things
    .map(([key, e]) => ({
      key,
      main: +(e.main / perFrame).toFixed(1),
      shadow: +(e.shadow / perFrame).toFixed(1),
    }))
    .sort((a, b) => b.main + b.shadow - (a.main + a.shadow));
  const row = {
    id: shotName,
    title,
    stats,
    main: Math.round(mean('main')),
    mainMax: Math.round(max('main')),
    shadow: Math.round(mean('shadow')),
    offscreen: Math.round(mean('offscreen')),
    quest: Math.round(2 * mean('main') + mean('shadow') + mean('offscreen')),
    triangles: Math.round(mean('triangles')),
    updateMs: +update.mean.toFixed(2),
    updateP90: +update.p90.toFixed(2),
    directions,
    top,
  };
  console.log(
    `${title}: ${row.main} Haupt (max ${row.mainMax}) + ${row.shadow} Schatten + ${row.offscreen} Renderziel` +
      ` → Brille ≈ ${row.quest} · Dreiecke ${row.triangles} · Netze ${stats.meshes} (sichtbar ${stats.visible}),` +
      ` Materialien ${stats.materials} · world.update ${row.updateMs} ms`,
  );
  for (const t of top.slice(0, 10)) console.log(`  ${t.main} + ${t.shadow}  ${t.key}`);
  return row;
}

/**
 * **Wer in `world.update` die Zeit braucht** — Selbstzeit je Funktion, nur für
 * das, was unter `update` der Welt läuft. Die Anteile sind brauchbar, die
 * Millisekunden gelten nur für diesen Rechner.
 */
async function profileWorld(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
  await cdp.send('Profiler.start');
  await drive(page, 60, true);
  const { profile: data } = await cdp.send('Profiler.stop');
  const parent = new Map();
  for (const n of data.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
  const byId = new Map(data.nodes.map((n) => [n.id, n]));
  const self = new Map();
  data.samples.forEach((id, i) => self.set(id, (self.get(id) ?? 0) + (data.timeDeltas[i] ?? 0)));
  const inUpdate = (id) => {
    for (let at = parent.get(id); at !== undefined; at = parent.get(at)) {
      const f = byId.get(at).callFrame;
      if (f.functionName === 'update' && /World\.ts/.test(f.url)) return true;
    }
    return false;
  };
  const functions = new Map();
  let total = 0;
  for (const n of data.nodes) {
    const us = self.get(n.id) ?? 0;
    if (!us || !inUpdate(n.id)) continue;
    total += us;
    const f = n.callFrame;
    const key = `${f.functionName || '(anonym)'} (${f.url.replace(/^.*\/src\//, '').replace(/\?.*$/, '')}:${f.lineNumber + 1})`;
    functions.set(key, (functions.get(key) ?? 0) + us);
  }
  const top = [...functions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, us]) => ({ name, anteil: +((100 * us) / (total || 1)).toFixed(1) }));
  console.log(`  world.update im Profil: ${(total / 1000 / 60).toFixed(2)} ms je Bild`);
  for (const t of top) console.log(`    ${String(t.anteil).padStart(5)}%  ${t.name}`);
  return { msPerFrame: +(total / 1000 / 60).toFixed(2), top };
}

async function enter(page, scenario, crashes) {
  const url = new URL(base);
  url.search = scenario.search ?? '';
  url.hash = scenario.hash;
  await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
  // Haunting hat eine eigene Startseite: erst verbinden, dann hinein.
  if (scenario.hash === 'haunting') {
    await page.locator('#haunt-connect').click({ timeout: 60000 });
    await page.locator('#screen-view [data-view="3d"]').click();
    await page.locator('#haunt-enter').click({ timeout: 120000 });
  } else {
    await page.locator('#screen-view [data-view="3d"]').click();
    await page.locator('#enter:not([disabled])').waitFor({ timeout: 180000 });
    await page.locator('#enter').click();
  }
  await Promise.race([
    page.waitForFunction(
      (id) => globalThis.bgvr?.currentWorldId === id && globalThis.bgvr.world,
      scenario.hash,
      { timeout: 180000 },
    ),
    new Promise((_, reject) => {
      const watch = setInterval(() => {
        if (!crashes.length) return;
        clearInterval(watch);
        reject(new Error(`${scenario.id} lädt nicht: ${crashes[0]}`));
      }, 250);
      watch.unref?.();
    }),
  ]);
  await page.waitForFunction(() => globalThis.bgvr?.loading == null, null, { timeout: 180000 });
  // Modelle, Physik und Zonen kommen asynchron nach.
  await page.waitForTimeout(10000);
}

const probe = await fetch(base).catch((error) => ({ ok: false, status: error.message }));
if (!probe.ok) {
  console.error(`Unter ${base} antwortet kein Dev-Server (${probe.status}).`);
  process.exit(1);
}

const browser = await chromium.launch({
  headless: !args.has('headed'),
  ...(process.env.SMOKE_EXECUTABLE ? { executablePath: process.env.SMOKE_EXECUTABLE } : {}),
  args: software
    ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-webgl', '--ignore-gpu-blocklist'],
});

const results = [];
for (const scenario of chosen) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  });
  await context.route('**/@vite/client', (route) =>
    route.fulfill({ contentType: 'text/javascript', body: VITE_CLIENT_STUB }),
  );
  await context.addInitScript((shadows) => {
    localStorage.setItem(
      'bgvr.graphics',
      JSON.stringify({
        mode: 'simple',
        xrScale: 1,
        showFps: false,
        gridLines: false,
        hitBoxes: false,
        showHandles: false,
        shadows,
        screenPads: 'off',
      }),
    );
  }, shadowMode);
  const page = await context.newPage();
  const errors = [];
  const crashes = [];
  page.on('pageerror', (error) => {
    crashes.push(String(error));
    errors.push(String(error));
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 300));
  });
  try {
    console.log(`\n# ${scenario.title}`);
    await enter(page, scenario, crashes);
    await page.evaluate(() => globalThis.bgvr.renderer.setAnimationLoop(null));
    const setup = scenario.setup ? await page.evaluate(scenario.setup) : null;
    if (setup) console.log(`vorbereitet: ${setup}`);
    // Je Sekunde Spielzeit eine kurze echte Pause: Modelle (Gäste, Besucher)
    // laden übers Netz, und das braucht Wanduhrzeit, keine Bilder.
    for (let second = 0; second < (scenario.sim ?? 1); second++) {
      await drive(page, 20, true);
      await page.waitForTimeout(300);
    }
    await drive(page, 2);
    const after = scenario.after ? await page.evaluate(scenario.after) : null;
    if (after) console.log(`beim Zählen: ${after}`);
    await page.evaluate(timeWorld);
    await page.evaluate(instrument, depth);
    const row = await measure(page, scenario, scenario.title, scenario.id);
    Object.assign(row, { setup, after, errors: errors.slice(0, 10) });
    results.push(row);
    if (profile) row.profile = await profileWorld(page);
    if (ab) {
      // **Dieselbe Szene wie vor der Optimierung** — die Stücke von
      // `shared/staticDecor.ts` stehen wieder einzeln (oder, was das Szenario
      // in `undo` sagt), alles andere bleibt, wie es war. Das ist der
      // ehrlichste Vergleich: dieselben Gäste an denselben Tischen.
      const off = await page.evaluate(scenario.undo ?? undoDecor);
      if (off) {
        await drive(page, 2);
        results.push(
          await measure(page, scenario, `${scenario.title} — ${off}`, `${scenario.id}-vorher`),
        );
      } else console.log('(nichts zum Abschalten in dieser Welt)');
    }
  } catch (error) {
    console.error(`${scenario.id}: ${error.message}`);
    results.push({ id: scenario.id, title: scenario.title, error: error.message, errors });
  } finally {
    await context.close();
  }
}
await browser.close();

await writeFile(path.join(output, 'report.json'), JSON.stringify(results, null, 1));
console.log(
  '\n| Welt | Haupt (Mittel/max) | Schatten | Renderziel | Brille ≈ | Dreiecke | Netze (sichtbar) | Materialien | `world.update` |',
);
console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const r of results) {
  if (r.error) {
    console.log(`| ${r.title} | Fehler: ${r.error} |`);
    continue;
  }
  console.log(
    `| ${r.title} | ${r.main} / ${r.mainMax} | ${r.shadow} | ${r.offscreen} | ${r.quest} | ` +
      `${Math.round(r.triangles / 1000)} k | ${r.stats.meshes} (${r.stats.visible}) | ${r.stats.materials} | ${r.updateMs} ms |`,
  );
}
console.log(`\nRohdaten: ${output}`);
