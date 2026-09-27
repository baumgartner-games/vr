import * as THREE from 'three';
import { DIR_S, dirX, dirZ } from '../nav/navTile';
import { ICE_FACE, ICE_STAND, ICE_TUBS } from './plateUpPlan';
import type { WorldContext } from '../../core/types';
import type { IceHands } from './plateUpIce';
import { ICE_SIZE } from '../shared/iceCone';
import { CORNER_SIZE, IceCorner, ICE_YAW, fallback, iceYaw } from './plateUpIceView';
import { WOBBLE, idleLimit } from '../shared/iceWobble';

/**
 * **Die Eisecke ohne ein einziges Modell** — so wie in Jest (kein WebGL, also
 * lädt nichts) und so wie im Browser, wenn eine Datei nicht kommt. Dann steht
 * der Ersatz da (`fallback`), und die Ecke ist trotzdem zu sehen: Platten,
 * Stapel, Portionierer, zwei Wannen in ihren Farben.
 */
async function built(): Promise<{ corner: IceCorner; root: THREE.Group }> {
  const root = new THREE.Group();
  const corner = new IceCorner();
  corner.build(root);
  // `furnish` wartet auf zwei Runden Lader, die hier sofort `null` sagen.
  for (let i = 0; i < 5; i++) await Promise.resolve();
  root.updateMatrixWorld(true);
  return { corner, root };
}

function meshes(object: THREE.Object3D): number {
  let n = 0;
  object.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) n++;
  });
  return n;
}

describe('Restaurant: die Eisecke zum Ansehen', () => {
  test('die Drehung zeigt die Vorderseite der Platten in den Gang', () => {
    const front = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), ICE_YAW);
    expect(front.x).toBeCloseTo(dirX(ICE_FACE));
    expect(front.z).toBeCloseTo(dirZ(ICE_FACE));
  });

  test('ohne Modelle steht der Ersatz da — nichts bleibt unsichtbar', async () => {
    const { corner } = await built();
    expect(meshes(corner.cones)).toBeGreaterThan(0);
    expect(meshes(corner.scoop)).toBeGreaterThan(1); // Matte und Portionierer
    for (const tub of corner.tubs) expect(meshes(tub.anchor)).toBeGreaterThan(0);
    // Die Platten selbst: je eine unter Stand und Wannen.
    const stand = new THREE.Box3().setFromObject(corner.stand);
    expect(stand.max.y).toBeGreaterThan(0.45);
    corner.dispose();
  });

  test('die Wannen stehen auf ihrer Platte, nebeneinander, groß genug für von oben', async () => {
    const { corner } = await built();
    const boxes = corner.tubBoxes();
    expect(boxes).toHaveLength(2);
    for (const box of boxes) {
      // Auf der Kachel der Wannen, oben auf der Platte.
      expect(Math.floor(box.centre.x)).toBe(ICE_TUBS.x);
      expect(Math.floor(box.centre.z)).toBe(ICE_TUBS.z);
      expect(box.centre.y - box.half.y).toBeGreaterThan(0.45);
      // Von oben eine Fläche und kein Krümel: über 0,1 m² je Wanne.
      expect(4 * box.half.x * box.half.z).toBeGreaterThan(0.1);
      expect(Math.max(box.half.x, box.half.z) * 2).toBeCloseTo(CORNER_SIZE.tub, 2);
    }
    // Beide innerhalb ihrer Kachel und ohne sich zu überdecken.
    const [a, b] = boxes as [(typeof boxes)[0], (typeof boxes)[0]];
    const apart = Math.abs(a.centre.x - b.centre.x) + Math.abs(a.centre.z - b.centre.z);
    const across =
      Math.abs(a.centre.x - b.centre.x) > Math.abs(a.centre.z - b.centre.z) ? 'x' : 'z';
    expect(apart).toBeGreaterThanOrEqual(a.half[across] + b.half[across] - 1e-6);
    for (const box of boxes) {
      expect(box.centre.x - box.half.x).toBeGreaterThanOrEqual(ICE_TUBS.x - 1e-6);
      expect(box.centre.x + box.half.x).toBeLessThanOrEqual(ICE_TUBS.x + 1 + 1e-6);
      expect(box.centre.z - box.half.z).toBeGreaterThanOrEqual(ICE_TUBS.z - 1e-6);
      expect(box.centre.z + box.half.z).toBeLessThanOrEqual(ICE_TUBS.z + 1 + 1e-6);
    }
    corner.dispose();
  });

  test('der Stapel steht auf der Kachel des Stands', async () => {
    const { corner } = await built();
    const at = corner.cones.getWorldPosition(new THREE.Vector3());
    expect(Math.floor(at.x)).toBe(ICE_STAND.x);
    expect(Math.floor(at.z)).toBe(ICE_STAND.z);
    const box = new THREE.Box3().setFromObject(corner.cones);
    expect(box.max.y - box.min.y).toBeCloseTo(CORNER_SIZE.stack, 2);
    corner.dispose();
  });

  test('jeder Ersatz hat Ausdehnung', () => {
    for (const make of [
      () => fallback.counter(),
      () => fallback.stack(),
      () => fallback.cone(),
      () => fallback.scoop(),
      () => fallback.tub('vanilla'),
    ]) {
      const box = new THREE.Box3().setFromObject(make());
      expect(box.isEmpty()).toBe(false);
      expect(box.min.y).toBeGreaterThanOrEqual(-1e-6);
    }
  });
});

/**
 * **Ein Bild-Zusammenhang, gerade so viel, wie `IceCorner.carry` liest** —
 * ohne Brille von oben (das Eis hängt an `rig`), oder in der Brille mit einem
 * Controller, dessen `hold` im Raum der Figur still steht.
 */
function fakeContext(xrHold: THREE.Object3D | null): WorldContext {
  const rig = Object.assign(new THREE.Group(), { camera: new THREE.Object3D() });
  rig.camera.position.y = 1.6;
  const scene = new THREE.Scene();
  scene.add(rig);
  if (xrHold) rig.add(xrHold);
  return {
    renderer: { xr: { isPresenting: xrHold !== null } },
    input: { get: () => (xrHold ? { tracked: true, hold: xrHold } : null) },
    rig,
    topDown: true,
    avatar: { stretch: 1, bob: 0 },
  } as unknown as WorldContext;
}

/**
 * **Wie weit die oberste Kugel entlang x über der Öffnung hängt**, in
 * Kugeldurchmessern, während die Figur 1,2 s mit 2,6 m/s nach +x geht und
 * dann `stand` Bilder (1/60 s) steht — jedes Bild durch `IceCorner.carry`, wie im Spiel.
 */
function walkAndStop(xr: boolean, stand = 72): { walking: number; after: number[] } {
  const corner = new IceCorner();
  const hold = xr ? new THREE.Object3D() : null;
  if (hold) hold.position.set(0.2, 1.1, -0.3);
  const ctx = fakeContext(hold);
  const hands: IceHands = {
    cone: { balls: ['vanilla', 'strawberry', 'vanilla', 'strawberry'] },
    coneHand: xr ? 'right' : null,
    scoop: null,
  };
  const dt = 1 / 60;
  const out = new THREE.Vector3();
  const opening = new THREE.Vector3();
  const trace: number[] = [];
  let size = 0;
  for (let f = 0; f < 72 + stand; f++) {
    if (f < 72) ctx.rig.position.x += 2.6 * dt;
    corner.carry(hands, ctx, dt, out);
    const top = corner.heldTop(new THREE.Vector3())!;
    // Die Öffnung des Hörnchens in der Welt — dort ruht die unterste Kugel.
    const cone = (ctx.rig.children.find((c) => c.name === 'plateup-ice-cone') ??
      hold?.children.find((c) => c.name === 'plateup-ice-cone'))!;
    cone.localToWorld(opening.set(0, ICE_SIZE.cone + ICE_SIZE.seat, 0));
    size = 2 * ICE_SIZE.ball * cone.getWorldScale(new THREE.Vector3()).x;
    trace.push((top.x - opening.x) / size);
  }
  corner.dispose();
  return { walking: trace[71]!, after: trace.slice(72) };
}

describe('Restaurant: der Turm in der Hand, wie das Spiel ihn rechnet', () => {
  // Nach #272 stand der Turm im Spiel starr: `stepWobble` behielt das
  // `THREE.Vector3`, das die Ansicht jedes Bild neu beschreibt — die letzte
  // Stelle des Hörnchens war immer schon die neue, `v` immer null. Die Tests
  // der reinen Rechnung merkten nichts, weil sie jedes Bild ein neues Objekt
  // hineinreichten. Diese hier gehen durch die Ansicht.
  test.each([
    ['von oben, an der Figur', false],
    ['in der Brille, in der Hand, die mit der Figur geht', true],
  ])('%s: beim Gehen hängt die Spitze deutlich zurück, beim Anhalten einmal hinüber', (_, xr) => {
    const { walking, after } = walkAndStop(xr);
    // Gegen die Richtung, in die gegangen wird — und deutlich, fast bis an die
    // Grenzen (0,8 + 0,4 + 0,27 Kugelgrößen bei vier Kugeln).
    expect(walking).toBeLessThan(-1.3);
    // Die erste halbe Sekunde nach dem Anhalten, bevor das Schaukeln im
    // Stehen einsetzt (`WOBBLE.idleDelay`): einmal über den Platz hinaus …
    const stop = after.slice(0, Math.round(WOBBLE.idleDelay * 60));
    const most = Math.max(...stop);
    expect(most).toBeGreaterThan(0.05);
    // … genau einmal.
    const signs = stop.filter((x) => Math.abs(x) > 1e-4).map(Math.sign);
    expect(signs.slice(1).filter((s, i) => s !== signs[i])).toHaveLength(1);
    // Danach schaukelt er sanft, nie weiter als die Grenzen dafür zusammen.
    const idle = [1, 2, 3].reduce((sum, k) => sum + idleLimit(k, 4), 0);
    for (const x of after.slice(stop.length)) expect(Math.abs(x)).toBeLessThan(idle);
  });

  test.each([
    ['von oben', false],
    ['in der Brille', true],
  ])(
    '%s: im Stehen schaukelt der Turm in der Hand sanft — sichtbar, aber in seinen Grenzen',
    (_, xr) => {
      // Vier Sekunden stehen; ab der dritten ist das Schaukeln ganz da.
      const { after } = walkAndStop(xr, 240);
      const late = after.slice(120).map(Math.abs);
      const idle = [1, 2, 3].reduce((sum, k) => sum + idleLimit(k, 4), 0);
      expect(Math.max(...late)).toBeGreaterThan(0.15);
      expect(Math.max(...late)).toBeLessThan(idle);
    },
  );
});

describe('Eisecke an anderer Stelle (Test Restaurant)', () => {
  test('steht auf ihren Kacheln, schaut nach Süden, die erste Sorte rechts von vorn', async () => {
    const root = new THREE.Group();
    const corner = new IceCorner({
      stand: { x: 3, z: 7 },
      tubs: { x: 4, z: 7 },
      face: DIR_S,
      flavors: ['strawberry', 'vanilla'],
      furnish: false,
    });
    corner.build(root);
    for (let i = 0; i < 5; i++) await Promise.resolve();
    root.updateMatrixWorld(true);
    const front = new THREE.Vector3(1, 0, 0).applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      iceYaw(DIR_S),
    );
    expect(front.x).toBeCloseTo(0);
    expect(front.z).toBeCloseTo(1);
    expect(corner.stand.position.toArray()).toEqual([3.5, 0, 7.5]);
    // Ohne eigene Möbel: nichts gebaut außer der Matte des Portionierers.
    expect(meshes(corner.cones)).toBe(0);
    for (const tub of corner.tubs) expect(meshes(tub.anchor)).toBe(0);
    // Von vorn (Süden) gesehen rechts ist Osten: dort die erste Sorte.
    const [east, west] = corner.tubSpots();
    expect(corner.tubs.map((tub) => tub.flavor)).toEqual(['strawberry', 'vanilla']);
    expect(east!.x).toBeCloseTo(4.5 + CORNER_SIZE.tubOffset);
    expect(west!.x).toBeCloseTo(4.5 - CORNER_SIZE.tubOffset);
    corner.dispose();
  });

  test('übernimmt Plattenhöhe, Stapel und Portionierer des Elements an derselben Stelle', () => {
    const root = new THREE.Group();
    const corner = new IceCorner({
      stand: { x: 0, z: 0 },
      tubs: { x: 1, z: 0 },
      face: DIR_S,
      furnish: false,
    });
    corner.build(root);
    const cones = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.2));
    cones.position.set(0.72, 0.8, 0.55);
    const scoop = new THREE.Group();
    scoop.position.set(0.3, 0.6, 0.58);
    root.add(cones, scoop);
    corner.adopt(0.55, cones, scoop);
    root.updateMatrixWorld(true);
    expect(cones.parent).toBe(corner.cones);
    expect(scoop.parent).toBe(corner.scoop);
    const at = cones.getWorldPosition(new THREE.Vector3());
    expect(at.toArray().map((v) => Number(v.toFixed(6)))).toEqual([0.72, 0.8, 0.55]);
    expect(corner.cones.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(0.55);
    corner.dispose();
  });
});
