/**
 * Interactive smoke test for the real WebGL application. Run a dev/preview
 * server first, then `npm run test:browser`. Screenshots and a JSON report are
 * written to .artifacts/browser-smoke. This does not simulate a VR headset.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox } from 'playwright';

const args = new Map(
  process.argv.slice(2).map((value) => {
    const [key, ...rest] = value.replace(/^--/, '').split('=');
    return [key, rest.join('=') || 'true'];
  }),
);
const browserNames = (
  args.get('browser') ??
  process.env.SMOKE_BROWSERS ??
  'chromium,firefox'
).split(',');
const loops = Math.max(1, Math.min(20, Number(args.get('loops') ?? 1)));
const botSeconds = Math.max(0, Math.min(600, Number(args.get('bot-seconds') ?? 12)));
const base = args.get('url') ?? process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/';
const output = path.resolve(
  args.get('output') ??
    `.artifacts/browser-smoke/${new Date().toISOString().replace(/[:.]/g, '-')}`,
);
await mkdir(output, { recursive: true });
const screenshots = !args.has('no-screenshots');
const results = [];
const summary = () =>
  writeFile(path.join(output, 'report.json'), JSON.stringify({ base, output, results }, null, 2));

for (const name of browserNames) {
  assert(name === 'chromium' || name === 'firefox', `Unknown browser ${name}`);
  let browser;
  try {
    browser = await { chromium, firefox }[name].launch({
      headless: args.has('headless') || Boolean(process.env.CI),
      ...(name === 'chromium'
        ? {
            args: args.has('software')
              ? ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
              : ['--enable-webgl'],
          }
        : {}),
    });
    for (let loop = 1; loop <= loops; loop++) {
      const result = {
        browser: name,
        loop,
        passed: false,
        screenshots,
        steps: [],
        pageErrors: [],
        consoleErrors: [],
      };
      results.push(result);
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      page.on('pageerror', (error) => result.pageErrors.push(error.stack ?? error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') result.consoleErrors.push(message.text());
      });
      const prefix = `${name}-${loop}`;
      // SwiftShader can keep Chromium's compositor busy indefinitely while a
      // lit WebGL scene submits new frames. Render one fresh frame, let the
      // compositor present it without a continuous queue, and always resume
      // the real game (also on error).
      // This changes screenshot collection only, never movement assertions or
      // the frame-timing sample at the end of the run.
      const capture = async (file, timeout = 30000) => {
        const paused = await page.evaluate(() => {
          const app = window.bgvr;
          // Early startup failures should still get a diagnostic screenshot.
          if (!app?.renderer || typeof app.frame !== 'function') return false;
          app.renderer.setAnimationLoop(null);
          return true;
        });
        try {
          if (paused) {
            await page.evaluate(() => window.bgvr.frame(performance.now()));
            await page.evaluate(
              () =>
                new Promise((resolve) => {
                  requestAnimationFrame(() => requestAnimationFrame(resolve));
                }),
            );
          }
          await page.screenshot({ path: path.join(output, file), timeout });
        } finally {
          if (paused)
            await page.evaluate(() => {
              const app = window.bgvr;
              app.renderer.setAnimationLoop(app.frame);
            });
        }
      };
      const shot = async (label) => {
        const file = `${prefix}-${label}.png`;
        result.activeStep = label;
        await summary();
        if (!screenshots) {
          result.steps.push({ label, screenshot: null, captureMode: 'disabled' });
          delete result.activeStep;
          console.log(`[${prefix}] ${label} (screenshots disabled)`);
          await summary();
          return;
        }
        const started = Date.now();
        await capture(file);
        result.steps.push({
          label,
          screenshot: file,
          captureMs: Date.now() - started,
          captureMode: 'paused-render-loop',
        });
        delete result.activeStep;
        console.log(`[${prefix}] ${label}`);
        await summary();
      };
      const role = async (id) => {
        if (!(await page.locator(`[data-sit="${id}"]`).isVisible()))
          await page.getByRole('button', { name: 'Rolle wechseln', exact: true }).click();
        await page.locator(`[data-sit="${id}"]`).click();
        await page.locator(`.haunt[data-station="${id}"]`).waitFor();
      };
      try {
        const url = new URL(base);
        url.searchParams.set('net', 'local');
        url.searchParams.set('room', `smoke-${name}-${Date.now()}`);
        url.hash = 'haunting';
        await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 90000 });
        await page.locator('#enter-flat').click();
        await page.locator('.haunt').waitFor();
        await shot('roles');

        await role('archive');
        assert.equal(
          await page
            .locator(
              '[data-archive-tab="map"], .haunt__archive-chart, .haunt__mini-chart, [data-archive-tab="anomalies"]',
            )
            .count(),
          0,
          'Archive must not expose a whole map or entity journal',
        );
        const roomSelect = page.locator('[data-room-select]');
        const choices = await roomSelect.locator('option').allTextContents();
        assert(choices.length >= 6, 'Room names are available');
        // Auf der Karte: zoomen, schieben, zurückstellen — dort gibt es ein Bild.
        await page.getByRole('button', { name: 'Raumansicht vergrößern', exact: true }).click();
        await page.locator('.haunt__view').hover();
        await page.mouse.wheel(0, -80);
        await page.locator('.haunt__view').focus();
        await page.keyboard.press('Home');
        // Ein Raum aufgeschlagen heißt: Akte ganzseitig, Karte weg.
        await roomSelect.selectOption({ index: Math.min(2, choices.length - 1) });
        await page.locator('.haunt__sheet').waitFor();
        const dossier = await page.locator('.haunt__sheet').innerText();
        assert.match(dossier, /Schutzschrank-Code/);
        assert.match(dossier, /[1-4]{3,}/);
        assert.equal(
          await page.locator('.haunt__view:visible').count(),
          0,
          'Die Raumakte liegt nicht über der Karte',
        );
        await shot('archive-desktop');
        await page.locator('[data-archive-back]').click();
        await page.locator('[data-archive-tab="orders"]').click();
        assert.equal(await page.locator('.haunt__task-row').count(), 3);
        await shot('orders-desktop');
        await page.locator('[data-dossier-room]').first().click();
        await page.locator('[data-archive-back]').click();

        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('[data-room]').first().waitFor();
        const layout = await page.evaluate(() => {
          const rect = (selector) => {
            const r = document.querySelector(selector).getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
          };
          return {
            view: rect('.haunt__view'),
            body: rect('.haunt__body'),
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
        assert(!layout.overflow, 'Mobile page fits the viewport');
        assert(
          layout.view.height > 120 && layout.body.height > 120,
          'Karte und Liste stehen beide auf dem Schirm — die Liste rollt darunter',
        );
        result.mobileLayout = layout;
        await shot('archive-mobile');
        await role('scout');
        await page.locator('[data-control-tab="switches"]').click();
        await page.locator('[data-flip]').first().click();
        await shot('control-switches-mobile');
        await page.locator('[data-control-tab="radar"]').click();
        await shot('control-radar-mobile');

        await page.setViewportSize({ width: 1440, height: 900 });
        await role('drone');
        await page.locator('[data-panel]').click();
        await page.locator('[data-fly]').last().click();
        await shot('drone');
        await page.getByRole('button', { name: 'Rolle wechseln', exact: true }).click();

        await page.locator('[data-technician]').click();
        await page.locator('.orbital-player').waitFor();
        await page.waitForFunction(() => window.bgvr.world?.stationTorch?.visible);
        // Set up a reachable eye pose, then use the real keyboard/pointer path.
        await page.evaluate(() => {
          const world = window.bgvr.world;
          const ctx = world.context;
          const at = world.stationTorch.getWorldPosition(ctx.camera.position.clone());
          const feet = at.clone().setY(0);
          feet.z += 0.8;
          world.movePlayerTo(ctx, feet);
          ctx.camera.lookAt(at);
          ctx.rig.updateMatrixWorld(true);
        });
        await page.keyboard.press('e', { delay: 200 });
        await page.waitForFunction(() => window.bgvr.world?.stationTorch === null);
        await page.waitForTimeout(300);
        await shot('technician-lamp-picked-up');
        await page.evaluate(() => {
          const world = window.bgvr.world;
          world.state.crew.hp = 0;
          world.state.phase = 'lost';
        });
        await page.locator('.orbital-result').waitFor();
        await shot('lost-restart');
        await page.getByRole('button', { name: 'Runde neu starten', exact: true }).click();
        await page.waitForFunction(() => {
          const state = window.bgvr.world?.state;
          return state?.phase === 'running' && state.crew.hp === 3;
        });
        const controls = page.locator('details[data-main]');
        if (!(await controls.evaluate((node) => node.open)))
          await controls.locator(':scope > summary').click();
        await page.locator('[data-action="test"]').click();
        await page.locator('.orbital-player strong').filter({ hasText: /TEST/ }).waitFor();
        // Starting a test rebuilds the controls with both disclosure panels closed.
        if (!(await controls.evaluate((node) => node.open)))
          await controls.locator(':scope > summary').click();
        const tests = page.locator('details[data-tests]');
        if (!(await tests.evaluate((node) => node.open)))
          await tests.locator(':scope > summary').click();
        const visit = await page.evaluate(() => {
          const rooms = window.bgvr.world.spec.rooms;
          return (rooms.find((room) => room.kind === 'bad') ?? rooms[0]).id;
        });
        await page.locator(`[data-action="visit:${visit}"]`).click();
        if (await controls.evaluate((node) => node.open))
          await controls.locator(':scope > summary').click();
        await page.evaluate(() => {
          const ctx = window.bgvr.world.context;
          ctx.rig.rotation.set(0, 0, 0);
          ctx.camera.rotation.set(0, 0, 0);
          ctx.rig.updateMatrixWorld(true);
        });
        await page.waitForTimeout(750);
        await shot('technician-room');
        await page.getByRole('button', { name: 'Rolle wechseln', exact: true }).click();
        await page.locator('[data-bot-round]').click();
        await page.locator('.orbital-player').waitFor();
        await page.locator('.orbital-player strong').filter({ hasText: /TEST/ }).waitFor();
        await page
          .locator('[data-action="simulate"]')
          .filter({ hasText: /beenden/ })
          .waitFor({ state: 'attached' });
        await page.waitForFunction(() => window.bgvr.world?.state.crew.simulation);
        await page.waitForFunction(
          () => window.bgvr.world?.state.monsterOn && window.bgvr.world?.state.monster,
        );
        result.monsterStart = await page.evaluate(() => ({ ...window.bgvr.world.state.monster }));
        await shot('bot-start');
        result.botStart = await page.evaluate(() => {
          const bot = window.bgvr.world.experience.botPosition;
          return bot ? { x: bot.x, z: bot.z } : null;
        });
        for (let elapsed = 0; elapsed < botSeconds; elapsed += 5) {
          await page.waitForTimeout(Math.min(5, botSeconds - elapsed) * 1000);
          console.log(
            `[${prefix}] bot observation ${Math.min(elapsed + 5, botSeconds)}/${botSeconds}s`,
          );
        }
        // The engine clamps dt to 50ms. On SwiftShader, 15 seconds of wall
        // time can therefore contain less than half a second of simulation.
        // Keep the same distance requirement; wait for real progress instead
        // of assuming a hardware-like frame rate. A stuck actor still fails.
        if (botSeconds >= 10) {
          result.activeStep = 'bot-and-monster-movement';
          await summary();
          const started = Date.now();
          console.log(`[${prefix}] waiting for real bot and monster movement`);
          await page.waitForFunction(
            ({ botStart, monsterStart }) => {
              const world = window.bgvr.world;
              const bot = world.experience.botPosition;
              const monster = world.state.monster;
              return (
                bot &&
                monster &&
                botStart &&
                monsterStart &&
                Math.hypot(bot.x - botStart.x, bot.z - botStart.z) > 0.5 &&
                Math.hypot(monster.x - monsterStart.x, monster.z - monsterStart.z) > 0.5
              );
            },
            { botStart: result.botStart, monsterStart: result.monsterStart },
            { timeout: 90000 },
          );
          result.movementWaitMs = Date.now() - started;
        }
        await shot('bot-observation');
        result.botEnd = await page.evaluate(() => {
          const world = window.bgvr.world;
          const bot = world.experience.botPosition;
          return {
            position: bot ? { x: bot.x, z: bot.z } : null,
            repairs: world.state.done.length,
            messages: world.experience.messages,
          };
        });
        if (botSeconds >= 10)
          assert(
            result.botStart &&
              result.botEnd.position &&
              Math.hypot(
                result.botStart.x - result.botEnd.position.x,
                result.botStart.z - result.botEnd.position.z,
              ) > 0.5,
            'The bot actually travels through the station',
          );
        result.simulation = await page.evaluate(() => {
          const world = window.bgvr.world;
          return {
            monster: world.state.monster,
            hp: world.state.crew.hp,
            monsterPath: world.monsterNavigator?.navigation.points.length ?? 0,
            botPath: world.experience.botNavigation?.points.length ?? 0,
            overlay: world.navigationOverlay.root.visible,
          };
        });
        assert.equal(result.simulation.hp, 3, 'Monster rehearsal remains harmless');
        assert(result.simulation.overlay, 'Actual actor routes are displayed');
        if (botSeconds >= 10) {
          assert(
            result.simulation.monster &&
              Math.hypot(
                result.simulation.monster.x - result.monsterStart.x,
                result.simulation.monster.z - result.monsterStart.z,
              ) > 0.5,
            'Monster patrol actually moves',
          );
          assert(result.simulation.monsterPath > 0, 'Monster has a visible real route');
        }
        await page.getByRole('button', { name: 'Kartenübersicht', exact: true }).click();
        await page.waitForTimeout(250);
        await shot('skeld-overview');
        result.cameraStartY = await page.evaluate(() => window.bgvr.world.context.rig.position.y);
        await page.keyboard.down('Space');
        try {
          await page.waitForFunction(
            (startY) => window.bgvr.world.context.rig.position.y > startY + 0.1,
            result.cameraStartY,
            { timeout: 30000 },
          );
        } finally {
          await page.keyboard.up('Space');
        }
        result.cameraEndY = await page.evaluate(() => window.bgvr.world.context.rig.position.y);
        assert(
          result.cameraStartY > 80 && result.cameraEndY > result.cameraStartY + 0.1,
          'Free camera rises from the overview position',
        );
        result.botText = await page.locator('.orbital-player').innerText();
        result.webgl = await page.locator('#scene').evaluate((canvas) => {
          const gl = canvas.getContext('webgl2');
          return gl
            ? {
                lost: gl.isContextLost(),
                width: gl.drawingBufferWidth,
                height: gl.drawingBufferHeight,
                renderer: gl.getParameter(gl.RENDERER),
                device: (() => {
                  const info = gl.getExtension('WEBGL_debug_renderer_info');
                  return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null;
                })(),
              }
            : null;
        });
        assert(result.webgl && !result.webgl.lost, 'WebGL2 context remains healthy');
        result.frameTiming = await page.evaluate(
          () =>
            new Promise((resolve) => {
              const samples = [];
              let previous = 0;
              const begin = performance.now();
              function frame(now) {
                if (previous) samples.push(now - previous);
                previous = now;
                if (now - begin < 5000) requestAnimationFrame(frame);
                else {
                  const sorted = [...samples].sort((a, b) => a - b);
                  resolve({
                    seconds: (now - begin) / 1000,
                    frames: samples.length,
                    fps: samples.length / ((now - begin) / 1000),
                    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
                  });
                }
              }
              requestAnimationFrame(frame);
            }),
        );
        assert.equal(result.pageErrors.length, 0, 'No uncaught browser errors');
        result.passed = true;
      } catch (error) {
        result.failure = error.stack ?? String(error);
        if (screenshots)
          await capture(`${prefix}-failure.png`, 10000).catch((captureError) => {
            result.failureScreenshotError = captureError.message;
          });
        console.error(`[${prefix}] FAILED: ${error.message}`);
      } finally {
        await summary();
        await context.close();
      }
    }
  } catch (error) {
    results.push({ browser: name, passed: false, failure: error.stack ?? String(error) });
    console.error(`[${name}] ${error.message}`);
  } finally {
    await browser?.close();
    await summary();
  }
}
console.log(`Browser report: ${path.join(output, 'report.json')}`);
process.exitCode = results.every((result) => result.passed) ? 0 : 1;
