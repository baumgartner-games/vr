import * as THREE from 'three';
import { PLAN_WALL_T } from '../../editor/levelPlan';
import { dirX, dirZ } from '../../nav/navTile';
import type { HouseSpec } from '../house';
import { SHIP, ShipBatch } from '../shipArt';
import { VentNet } from './ventGraph';

/**
 * **Die Klappen in 3D** — ein Rahmen und vier Lamellen je Klappe, unten an
 * der Wand, wo ein Monster hineinkriecht.
 *
 * Alles in einer `ShipBatch` (Instanzen, zwei Materialien): Vierzehn
 * Klappen sind zwei Draw-Calls und kein Bild auf der Brille wert. Die
 * Position kommt aus demselben Graphen wie die Karte (`ventGraph.ts`), damit
 * die Klappe im Headset dort ist, wo sie auf dem Telefon steht.
 */
export const FLAP_WIDTH = 0.9;
export const FLAP_HEIGHT = 0.55;
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
