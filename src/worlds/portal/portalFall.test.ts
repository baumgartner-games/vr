import * as THREE from 'three';
import {
  ALL_GROUPS,
  PhysicsWorld,
  portalSurfaceGroup,
  type PhysicsBody,
} from '../../physics/PhysicsWorld';
import { Npc } from '../npc/Npc';
import { Portal } from './Portal';

/**
 * **Was durch ein Bodenportal fällt und was nicht** — mit echtem Rapier.
 *
 * Der vierte Test dieser Sammlung, der eine Physik-Engine startet, und er hat
 * denselben Grund wie die anderen drei (`jest.config.cjs`): Ob ein Körper
 * durch einen Boden fällt, entscheidet keine Rechnung, sondern eine
 * Kollisionsmaske in der Engine. Ein Nachbau davon prüfte den Nachbau.
 *
 * Zwei Fälle stehen hier, und beide standen vorher in der Brille:
 *
 * - **Ein Zombie blieb auf dem Portal stehen.** Die Wand, in der ein Portal
 *   hängt, bleibt für alle fest, die niemand davon ausnimmt, und ausgenommen
 *   waren lange nur die Kisten und der Spieler (`PortalWorld.updatePhasing`).
 *   Dazu die andere Seite: Stelle, Tempo und Blickrichtung, gedreht wie das
 *   Portal (`Npc.warp`).
 * - **Ein Würfel fiel fünf Zentimeter und blieb im Loch liegen.** Im Labor
 *   liegen zwei portalfähige Böden übereinander, und ein Portal nahm nur den
 *   oberen mit. Fünf Zentimeter tiefer wartete der zweite (`portalFunnel.ts`).
 *
 * Die Gegenproben stehen jeweils daneben — ohne sie wäre der Test auch für
 * einen Boden grün, den es gar nicht gibt.
 */

const DT = 1 / 60;
const UP = new THREE.Vector3(0, 1, 0);
const _at = new THREE.Vector3();

/** Eine Bodenplatte, die ein Portal halten kann — mit eigenem Kollisionsbit. */
function labFloor(physics: PhysicsWorld, root: THREE.Object3D, group: number): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(20, 0.4, 20));
  mesh.position.set(0, -0.2, 0);
  root.add(mesh);
  mesh.updateWorldMatrix(true, false);
  physics.addStatic(mesh, { membership: group, filter: ALL_GROUPS });
}

function stand(physics: PhysicsWorld, root: THREE.Object3D): Npc {
  const npc = new Npc({
    physics,
    kind: 'zombie',
    brain: 'idle',
    at: new THREE.Vector3(0, 0, 0),
  });
  root.add(npc.holder);
  return npc;
}

/** Eine Sekunde Physik, ohne Hirn: Es geht um die Schwerkraft, nicht um Wege. */
function settle(physics: PhysicsWorld, seconds: number): void {
  for (let i = 0; i < Math.round(seconds / DT); i++) physics.step(DT);
  physics.sync();
}

describe('ein NPC am Bodenportal', () => {
  it('steht auf dem Boden, solange ihn niemand ausnimmt', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    labFloor(physics, root, portalSurfaceGroup(0));
    const npc = stand(physics, root);

    settle(physics, 1);

    // Die Gegenprobe: Ohne sie wäre der nächste Test auch für einen Boden
    // grün, der gar nicht trägt.
    expect(npc.feet(_at).y).toBeCloseTo(0, 1);
  });

  it('fällt hindurch, sobald die Fläche für ihn durchlässig ist', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    const group = portalSurfaceGroup(0);
    labFloor(physics, root, group);
    const npc = stand(physics, root);

    physics.setPhasing(npc.entry, group);
    settle(physics, 1);

    // Nach einer Sekunde freiem Fall sind es knapp fünf Meter; ein Meter
    // reicht als Beweis, dass er nicht mehr auf der Platte steht.
    expect(npc.feet(_at).y).toBeLessThan(-1);
  });

  it('lässt die Wand Wand sein, in der das Portal nicht hängt', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    labFloor(physics, root, portalSurfaceGroup(0));
    const npc = stand(physics, root);

    // Das Bit einer **anderen** Fläche: Ein Portal an der Wand darf den Boden
    // nicht auflösen, auf dem er steht.
    physics.setPhasing(npc.entry, portalSurfaceGroup(1));
    settle(physics, 1);

    expect(npc.feet(_at).y).toBeCloseTo(0, 1);
  });
});

describe('zwei Böden übereinander', () => {
  /** Der Laborboden mit einem Bit und die Fläche bis zum Horizont mit ihrem. */
  const FLOOR = portalSurfaceGroup(0);
  const GROUND = portalSurfaceGroup(1);

  async function lab(): Promise<{ physics: PhysicsWorld; cube: THREE.Mesh; entry: PhysicsBody }> {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    labFloor(physics, root, FLOOR);
    // `GROUND_TOP` ist −0,05: fünf Zentimeter unter dem gebauten Boden.
    const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 0.6, 200));
    ground.position.set(0, -0.05 - 0.3, 0);
    root.add(ground);
    ground.updateWorldMatrix(true, false);
    physics.addStatic(ground, { membership: GROUND, filter: ALL_GROUPS });

    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5));
    cube.position.set(0, 0.25, 0);
    root.add(cube);
    cube.updateWorldMatrix(true, false);
    const entry = physics.addDynamic(cube, { mass: 8, friction: 0.8, restitution: 0.1 });
    // Fünf Sekunden stehen, bis er wirklich liegt — und schläft.
    settle(physics, 5);
    return { physics, cube, entry };
  }

  it('lässt einen Würfel fünf Zentimeter tief im Loch liegen, wenn nur der obere Boden nachgibt', async () => {
    const { physics, cube, entry } = await lab();
    physics.setPhasing(entry, FLOOR);
    settle(physics, 2);
    // Genau das war auf dem Bild zu sehen: angesackt und liegengeblieben.
    expect(cube.position.y).toBeCloseTo(0.2, 2);
  });

  it('lässt ihn fallen, sobald beide Böden im Trichter stehen', async () => {
    const { physics, cube, entry } = await lab();
    physics.setPhasing(entry, FLOOR | GROUND);
    settle(physics, 2);
    expect(cube.position.y).toBeLessThan(-10);
  });
});

describe('Npc.warp', () => {
  /** Blau im Boden, rot in einer Wand, die nach +X schaut. */
  function portals(): Portal {
    const floor = new Portal('a', 0x3fa9ff);
    const wall = new Portal('b', 0xff5a5f);
    floor.link = wall;
    wall.link = floor;
    floor.place(new THREE.Vector3(0, 0, 0), UP, new THREE.Vector3(0, 0, -1));
    wall.place(new THREE.Vector3(8, 1.2, 0), new THREE.Vector3(1, 0, 0), UP);
    return floor;
  }

  it('setzt ihn vor das andere Portal und dreht sein Tempo mit', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    const npc = stand(physics, root);
    const floor = portals();

    // Wo er im Augenblick des Durchtritts steht: eben unter die Ebene
    // gefallen — davor wäre er noch gar nicht durch, und ein Punkt **vor**
    // dem Portal kommt hinter dem anderen heraus und nicht davor.
    npc.entry.body.setTranslation({ x: 0, y: -0.05, z: 0 }, true);
    npc.entry.body.setLinvel({ x: 0, y: -6, z: 0 }, true);

    npc.warp(floor.getTraversalMatrix(new THREE.Matrix4())!);

    // Er kommt vor der Wand heraus, und zwar auf ihrer Vorderseite (+X).
    const out = npc.center(_at);
    expect(out.x).toBeGreaterThan(8);
    expect(out.y).toBeCloseTo(1.2, 1);
    // Aus dem Sturz wird ein Schuss nach vorn: dasselbe Tempo, andere Richtung.
    const v = npc.entry.body.linvel();
    expect(v.x).toBeCloseTo(6, 4);
    expect(Math.hypot(v.y, v.z)).toBeCloseTo(0, 4);
  });

  it('dreht seine Blickrichtung mit dem Portal — und das Modell mit ihr', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    const npc = stand(physics, root);

    // Zwei Wandportale: Eingang schaut nach +Z, Ausgang nach +X. Wer nach -Z
    // hineinläuft (Gierwinkel 0), läuft danach nach +X — das sind -90°.
    const into = new Portal('a', 0x3fa9ff);
    const out = new Portal('b', 0xff5a5f);
    into.link = out;
    out.link = into;
    into.place(new THREE.Vector3(0, 1.2, 0), new THREE.Vector3(0, 0, 1), UP);
    out.place(new THREE.Vector3(8, 1.2, 0), new THREE.Vector3(1, 0, 0), UP);

    npc.warp(into.getTraversalMatrix(new THREE.Matrix4())!);

    // Der Körper dreht sich nie (seine Drehung ist gesperrt) — das Modell schon,
    // und an ihm sieht man, wohin er läuft.
    expect(npc.model.rotation.y).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('zieht das Modell mit, damit er nicht ein Bild lang im Nichts steht', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const root = new THREE.Group();
    const npc = stand(physics, root);
    const floor = portals();

    npc.entry.body.setTranslation({ x: 0, y: 0.9, z: 0 }, true);
    npc.warp(floor.getTraversalMatrix(new THREE.Matrix4())!);

    // `physics.sync()` käme erst im nächsten Bild; bis dahin stünde sein
    // Modell noch am Eingang.
    expect(npc.holder.position.distanceTo(npc.center(_at))).toBeCloseTo(0, 6);
    // Und die letzte Position ist die neue: Sonst zöge die nächste Prüfung
    // eine Strecke quer durch die Welt und schickte ihn gleich wieder zurück.
    expect(npc.entry.previousPosition.distanceTo(npc.center(_at))).toBeCloseTo(0, 6);
  });
});
