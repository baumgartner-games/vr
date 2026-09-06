import * as THREE from 'three';
import { planToWorld, worldToPlan, type Model } from './miniature';

/**
 * **Zwei Rechnungen, die dasselbe meinen** — geprüft aneinander.
 *
 * Die Miniatur wird von zwei Seiten angefasst, und das ist Absicht: Die
 * **Geste** rechnet mit reinen Zahlen (`miniature.ts`), damit ein Test sie
 * nachvollziehen kann; der **Zeiger** rechnet über die three.js-Gruppe
 * (`EditorWorld.aim`), weil die Gruppe das ist, was man wirklich sieht — eine
 * Vorschau, die gegen eine zweite Rechnung prüft, liegt irgendwann um die
 * Differenz daneben.
 *
 * Zwei Rechnungen für dasselbe laufen aber auseinander, sobald jemand an einer
 * davon ein Vorzeichen dreht. Also stehen sie hier nebeneinander: Was die
 * Gruppe aus einem Planpunkt macht, muss auf den Millimeter das sein, was
 * `planToWorld` daraus macht — und was `worldToPlan` zurückrechnet, muss das
 * sein, was `Object3D.worldToLocal` zurückrechnet.
 *
 * Der Test kostet ein `THREE.Group` und keine Zeile WebGL: Er misst eine
 * Matrix, kein Bild.
 */

/** Die Gruppe so aufstellen, wie `EditorWorld.placeModel` es tut. */
function group(model: Model): THREE.Group {
  const mini = new THREE.Group();
  mini.position.set(model.at.x, model.at.y, model.at.z);
  mini.rotation.set(0, model.yaw, 0);
  mini.scale.setScalar(model.scale);
  mini.updateMatrixWorld(true);
  return mini;
}

const CENTRE = { x: 7.5, z: -12.5 };

const MODELS: readonly Model[] = [
  { at: { x: 0, y: 1, z: -1 }, yaw: 0, scale: 1 / 24 },
  { at: { x: -1.3, y: 1.45, z: 2.2 }, yaw: 1.1, scale: 1 / 12 },
  { at: { x: 4, y: 0.8, z: -3.5 }, yaw: -2.4, scale: 1 / 40 },
];

const PLAN_POINTS: readonly { x: number; y: number; z: number }[] = [
  { x: 0, y: 0, z: 0 },
  { x: 20, y: 0, z: -30 },
  { x: -12.5, y: 2.8, z: 5 },
];

describe('Die Miniatur und ihre Gruppe', () => {
  it('setzt einen Planpunkt an dieselbe Stelle', () => {
    for (const model of MODELS) {
      const mini = group(model);
      for (const point of PLAN_POINTS) {
        // Gebaut wird alles um die Mitte des Plans herum (`EditorWorld.box`),
        // also ist die lokale Lage der Planpunkt minus die Mitte.
        const local = new THREE.Vector3(point.x - CENTRE.x, point.y, point.z - CENTRE.z);
        const viaGroup = mini.localToWorld(local.clone());
        const viaMath = planToWorld(model, CENTRE, point);
        expect(viaGroup.x).toBeCloseTo(viaMath.x, 6);
        expect(viaGroup.y).toBeCloseTo(viaMath.y, 6);
        expect(viaGroup.z).toBeCloseTo(viaMath.z, 6);
      }
    }
  });

  it('rechnet einen Weltpunkt auf denselben Planpunkt zurück', () => {
    // Das ist der Weg, den ein Zeigerstrahl nimmt: Treffer in der Welt, Kachel
    // im Plan. Läge er anders als die Geste, würde man neben dem bauen, was
    // man angefasst hat.
    for (const model of MODELS) {
      const mini = group(model);
      for (const world of [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-2, 1.3, 1.5),
        new THREE.Vector3(3.2, 0.6, -2.8),
      ]) {
        const local = mini.worldToLocal(world.clone());
        const viaGroup = { x: local.x + CENTRE.x, y: local.y, z: local.z + CENTRE.z };
        const viaMath = worldToPlan(model, CENTRE, world);
        expect(viaGroup.x).toBeCloseTo(viaMath.x, 4);
        expect(viaGroup.y).toBeCloseTo(viaMath.y, 4);
        expect(viaGroup.z).toBeCloseTo(viaMath.z, 4);
      }
    }
  });
});
