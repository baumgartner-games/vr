import * as THREE from 'three';
import { dirX, dirZ } from '../nav/navTile';
import { ICE_FACE, ICE_STAND, ICE_TUBS } from './plateUpPlan';
import { CORNER_SIZE, IceCorner, ICE_YAW, fallback } from './plateUpIceView';

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
