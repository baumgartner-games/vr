/**
 * **Die Messstrecke für Haunting in der Brille** — eine feste Szene, eine Zahl,
 * die man neben die fps der echten Quest legen kann.
 *
 *   npm run dev -- --port 5173
 *   npm run perf:haunting -- --url=http://127.0.0.1:5173/
 *
 * Gewünscht: _„Wir sollten festhalten wie viel fps bei dir zu meinem sind,
 * damit wir das besser sehen können."_ Die Vergleichstabelle steht in
 * `docs/quest3-referenz.md` (_Haunting: Messstrecke gegen die Brille_). Wer
 * etwas an der Bildrate ändert, misst vorher und nachher mit genau dieser
 * Strecke und trägt die neue Zeile dort ein, sobald der Besitzer seine fps
 * meldet.
 *
 * **Die Szene**: simulierte Brille (`?xr=sim`), Anzug an, Übungsrunde
 * (`testMission`), der Techniker steht 1,5 m vor dem ersten Schrank — dort,
 * wo der Besitzer seine Zahlen abliest. Gemessen wird in zwei Gängen:
 *
 * 1. **Ohne Zeichnen** (`renderer.render` nur noch `scene.updateMatrixWorld`):
 *    `world.update` und der Matrizenlauf, je Bild, über `--seconds` Sekunden.
 *    Das ist der Teil, der auf der Quest an der CPU hängt, und er schwankt
 *    hier am wenigsten — SwiftShader zeichnet nicht mit.
 * 2. **Mit Zeichnen**, einige Bilder lang: Zeichenaufrufe und Dreiecke je Bild
 *    (beide Augen zusammen, so wie die Brille sie abarbeitet).
 *
 * Absolute Millisekunden gelten nur für diesen Rechner; vergleichbar sind sie
 * mit Läufen auf demselben Rechner, und darum steht in der Tabelle immer der
 * ganze Verlauf, neu gemessen.
 *
 * Optionen: `--url=…`, `--seconds=12`, `--runs=1` (Wiederholungen, Mittel
 * daraus), `--json` (eine Zeile JSON statt Text), `--lamp` (die Taschenlampe
 * eingeschaltet in der rechten Hand — mit ihrer Schattenkarte).
 */
import { chromium } from 'playwright';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const base = (args.get('url') ?? process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/').replace(
  /\/?$/,
  '/',
);
const seconds = Math.max(3, Number(args.get('seconds') ?? 12));
const runs = Math.max(1, Number(args.get('runs') ?? 1));
const asJson = args.has('json');
/** Mit eingeschalteter Lampe in der rechten Hand — so, wie der Besitzer spielt. */
const lamp = args.has('lamp');
const executablePath = process.env.SMOKE_EXECUTABLE ?? '/opt/pw-browsers/chromium';

async function measure() {
  const browser = await chromium.launch({
    executablePath,
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
    await page.goto(`${base}?xr=sim#haunting`);
    await page.waitForFunction(() => globalThis.bgvr?.world?.goToSuit, null, { timeout: 120000 });
    await page.waitForTimeout(4000);
    const standUp = page.locator('[data-stand-up]').first();
    if (await standUp.count()) {
      await standUp.click();
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => globalThis.bgvr.world.goToSuit());
    await page.keyboard.press('e', { delay: 200 });
    await page.waitForTimeout(3000);
    // Zweimal: Der erste Versuch kommt manchmal, bevor die Simulation bereit ist.
    for (let i = 0; i < 2; i++) {
      await page.evaluate(() => globalThis.bgvr.enterVR()).catch(() => {});
      await page.waitForTimeout(3000);
    }
    await page.evaluate(() => globalThis.bgvr.world.testMission());
    await page.waitForTimeout(8000);
    await page.evaluate(() => {
      const world = globalThis.bgvr.world;
      const cabinet = world.experience.cabinets[0];
      const at = cabinet.group.getWorldPosition(cabinet.at.clone());
      const turn = cabinet.group.getWorldQuaternion(new cabinet.group.quaternion.constructor());
      const front = new cabinet.at.constructor(0, 0, 1).applyQuaternion(turn);
      const spot = at.clone().addScaledVector(front, 1.5);
      spot.y = 0;
      world.movePlayerTo(world.context, spot);
    });
    if (lamp) {
      await page.evaluate(() => {
        const world = globalThis.bgvr.world;
        world.equipTool(world.context, 'right', 'flashlight');
        world.carriedTool('right')?.setLit?.(true);
      });
    }
    await page.waitForTimeout(5000);

    // Gang 2 zuerst, solange noch gezeichnet wird: Aufrufe und Dreiecke.
    const drawn = await page.evaluate(async () => {
      const renderer = globalThis.bgvr.world.context.renderer;
      const seen = [];
      const render = renderer.render.bind(renderer);
      renderer.render = (scene, camera) => {
        // Die Schattenkarte zählt mit: Sie zeichnet three.js innerhalb von
        // `render`, und `info` wird nur zu Beginn zurückgesetzt.
        render(scene, camera);
        seen.push([renderer.info.render.calls, renderer.info.render.triangles]);
      };
      await new Promise((resolve) => setTimeout(resolve, 3000));
      renderer.render = render;
      const tail = seen.slice(-5);
      const mean = (i) => tail.reduce((sum, one) => sum + one[i], 0) / Math.max(1, tail.length);
      return { calls: Math.round(mean(0)), triangles: Math.round(mean(1)) };
    });

    // Gang 1: ohne Zeichnen, nur Rechnung und Matrizenlauf.
    const timed = await page.evaluate(async (ms) => {
      const world = globalThis.bgvr.world;
      const { scene, renderer } = world.context;
      const update = [];
      const matrix = [];
      renderer.render = () => {
        const t = performance.now();
        scene.updateMatrixWorld();
        matrix.push(performance.now() - t);
      };
      const step = world.update.bind(world);
      world.update = (...rest) => {
        const t = performance.now();
        const result = step(...rest);
        update.push(performance.now() - t);
        return result;
      };
      await new Promise((resolve) => setTimeout(resolve, ms));
      let nodes = 0;
      let auto = 0;
      scene.traverse((node) => {
        nodes++;
        if (node.matrixAutoUpdate) auto++;
      });
      const mean = (list) => list.reduce((sum, one) => sum + one, 0) / Math.max(1, list.length);
      const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)] ?? 0;
      return {
        frames: update.length,
        updateMean: mean(update),
        updateMedian: median(update),
        matrixMean: mean(matrix),
        nodes,
        autoNodes: auto,
      };
    }, seconds * 1000);
    return { ...timed, ...drawn };
  } finally {
    await browser.close();
  }
}

const results = [];
for (let i = 0; i < runs; i++) results.push(await measure());
const avg = (key) => results.reduce((sum, one) => sum + one[key], 0) / results.length;
const summary = {
  updateMean: avg('updateMean'),
  updateMedian: avg('updateMedian'),
  matrixMean: avg('matrixMean'),
  cpu: avg('updateMean') + avg('matrixMean'),
  calls: Math.round(avg('calls')),
  triangles: Math.round(avg('triangles')),
  autoNodes: Math.round(avg('autoNodes')),
  nodes: Math.round(avg('nodes')),
  frames: Math.round(avg('frames')),
  runs,
};
if (asJson) console.log(JSON.stringify(summary));
else {
  const ms = (value) => `${value.toFixed(2)} ms`;
  console.log('Haunting, Brille (simuliert), Übungsrunde vor dem ersten Schrank');
  console.log(
    `  world.update        ${ms(summary.updateMean)} (Median ${ms(summary.updateMedian)})`,
  );
  console.log(`  Matrizenlauf        ${ms(summary.matrixMean)}`);
  console.log(`  CPU je Bild (Summe) ${ms(summary.cpu)}   ← diese Zahl in die Tabelle`);
  console.log(`  Zeichenaufrufe      ${summary.calls} (beide Augen)`);
  console.log(`  Dreiecke            ${summary.triangles}`);
  console.log(`  Knoten mit Matrix   ${summary.autoNodes} von ${summary.nodes}`);
  console.log(`  (${summary.frames} Bilder, ${runs} Lauf/Läufe)`);
}
