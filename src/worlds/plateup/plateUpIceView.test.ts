import * as THREE from 'three';
import { dirX, dirZ } from '../nav/navTile';
import { ICE_FACE, ICE_STAND, ICE_TUBS } from './plateUpPlan';
import type { WorldContext } from '../../core/types';
import type { IceHands } from './plateUpIce';
import { CORNER_SIZE, IceCorner, ICE_SIZE, ICE_YAW, fallback } from './plateUpIceView';

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
 * dann 1,2 s steht — jedes Bild durch `IceCorner.carry`, wie im Spiel.
 */
function walkAndStop(xr: boolean): { walking: number; after: number[] } {
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
  for (let f = 0; f < 144; f++) {
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
    // Gegen die Richtung, in die gegangen wird — und deutlich, nicht ein Hauch.
    expect(walking).toBeLessThan(-0.4);
    // Nach dem Anhalten einmal über den Platz hinaus …
    const most = Math.max(...after);
    expect(most).toBeGreaterThan(0.05);
    // … genau einmal, und dann Ruhe.
    const signs = after.filter((x) => Math.abs(x) > 1e-4).map(Math.sign);
    expect(signs.slice(1).filter((s, i) => s !== signs[i])).toHaveLength(1);
    expect(Math.abs(after[after.length - 1]!)).toBeLessThan(0.01);
  });
});
