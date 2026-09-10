import * as THREE from 'three';
import { PLAN_WALL_T } from '../../editor/levelPlan';
import { dirX, dirZ } from '../../nav/navTile';
import type { HouseSpec } from '../house';
import { SHIP, ShipBatch } from '../shipArt';
import { VentNet } from './ventGraph';
import { FLAP_HEIGHT, FLAP_WIDTH } from './ventPlacement';

/**
 * **Die Klappen in 3D** — ein Rahmen und vier Lamellen je Klappe, unten an
 * der Wand, wo ein Monster hineinkriecht.
 *
 * Alles in einer `ShipBatch` (Instanzen, zwei Materialien): Vierzehn
 * Klappen sind zwei Draw-Calls und kein Bild auf der Brille wert. Die
 * Position kommt aus demselben Graphen wie die Karte (`ventGraph.ts`), damit
 * die Klappe im Headset dort ist, wo sie auf dem Telefon steht.
 */
export { FLAP_HEIGHT, FLAP_WIDTH };
const FLAP_BOTTOM = 0.06;

export function buildVentFlaps(spec: HouseSpec, net: VentNet = new VentNet(spec)): THREE.Group {
  const batch = new ShipBatch();
  for (const flap of net.flaps) {
    const wall = VentNet.wallPoint(flap);
    const nx = dirX(flap.dir),
      nz = dirZ(flap.dir);
    // In den Raum hinein, vor die Wandfläche.
    const face = PLAN_WALL_T / 2 + 0.035;
    const x = wall.x - nx * face,
      z = wall.z - nz * face;
    const alongX = nx === 0;
    const y = FLAP_BOTTOM + FLAP_HEIGHT / 2;
    batch.box(
      SHIP.dark,
      alongX ? [FLAP_WIDTH, FLAP_HEIGHT, 0.05] : [0.05, FLAP_HEIGHT, FLAP_WIDTH],
      [x, y, z],
    );
    for (let i = 0; i < 4; i++) {
      const slat = FLAP_BOTTOM + 0.1 + i * 0.11;
      batch.box(
        SHIP.trim,
        alongX ? [FLAP_WIDTH - 0.14, 0.02, 0.02] : [0.02, 0.02, FLAP_WIDTH - 0.14],
        [x - nx * 0.03, slat, z - nz * 0.03],
      );
    }
    // Ein schmaler Streifen darüber, der die Klappe im Dunkeln verrät.
    batch.box(
      SHIP.amber,
      alongX ? [0.3, 0.02, 0.02] : [0.02, 0.02, 0.3],
      [x - nx * 0.02, FLAP_BOTTOM + FLAP_HEIGHT + 0.05, z - nz * 0.02],
      true,
    );
  }
  const group = batch.build();
  group.name = 'vent-flaps';
  return group;
}

/**
 * **Die Klappen, die aufgehen.** Der Rahmen bleibt, die vier Lamellen
 * kippen, und der Leuchtstreifen wird zum Balken über die ganze Breite —
 * so sieht man auch aus der Ecke des Raums, an welcher Klappe gerade etwas
 * ein- oder aussteigt. Es ist dieselbe `ShipBatch` wie oben: Öffnen heißt,
 * die Instanzmatrizen von fünf Kästchen zu tauschen und wieder
 * zurückzulegen. Zwei Draw-Calls bleiben zwei Draw-Calls.
 */
const SLAT_TILT = 1.2;
const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();

export class VentFlapArt {
  readonly group: THREE.Group;
  private readonly ids: string[];
  private readonly slats: THREE.InstancedMesh | null;
  private readonly strips: THREE.InstancedMesh | null;
  /** Die geschlossenen Matrizen der gerade offenen Klappe — zum Zurücklegen. */
  private readonly closed = new Map<THREE.InstancedMesh, Map<number, THREE.Matrix4>>();
  private openId: string | null = null;

  constructor(spec: HouseSpec, net: VentNet = new VentNet(spec)) {
    this.group = buildVentFlaps(spec, net);
    this.ids = net.flaps.map((flap) => flap.id);
    this.slats = this.meshOf(SHIP.trim);
    this.strips = this.meshOf(SHIP.amber);
  }

  /** Welche Klappe gerade offen steht — höchstens eine. */
  get open(): string | null {
    return this.openId;
  }

  /** Eine Klappe öffnen und die vorige schließen; `null` schließt alle. */
  setOpen(id: string | null): void {
    if (id === this.openId) return;
    if (this.openId !== null) this.apply(this.openId, false);
    this.openId = id !== null && this.ids.includes(id) ? id : null;
    if (this.openId !== null) this.apply(this.openId, true);
  }

  private apply(id: string, open: boolean): void {
    const index = this.ids.indexOf(id);
    if (index < 0) return;
    if (this.slats)
      for (let k = 0; k < 4; k++)
        this.swap(this.slats, index * 4 + k, open, (scale) => {
          // Kippen um die lange Achse — die liegt dort, wo die Skalierung breit ist.
          _euler.set(scale.x > scale.z ? SLAT_TILT : 0, 0, scale.x > scale.z ? 0 : SLAT_TILT);
          _rotation.setFromEuler(_euler);
        });
    if (this.strips)
      this.swap(this.strips, index, open, (scale) => {
        if (scale.x > scale.z) scale.set(FLAP_WIDTH, 0.05, 0.05);
        else scale.set(0.05, 0.05, FLAP_WIDTH);
      });
  }

  private swap(
    mesh: THREE.InstancedMesh,
    instance: number,
    open: boolean,
    change: (scale: THREE.Vector3) => void,
  ): void {
    let kept = this.closed.get(mesh);
    if (!kept) this.closed.set(mesh, (kept = new Map()));
    if (open) {
      mesh.getMatrixAt(instance, _matrix);
      kept.set(instance, _matrix.clone());
      _matrix.decompose(_position, _rotation, _scale);
      change(_scale);
      mesh.setMatrixAt(instance, _matrix.compose(_position, _rotation, _scale));
    } else {
      const base = kept.get(instance);
      if (!base) return;
      mesh.setMatrixAt(instance, base);
      kept.delete(instance);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  private meshOf(color: number): THREE.InstancedMesh | null {
    for (const child of this.group.children) {
      if (!(child instanceof THREE.InstancedMesh)) continue;
      const material = child.material as THREE.MeshStandardMaterial;
      if (material.color.getHex() === color) return child;
    }
    return null;
  }
}
