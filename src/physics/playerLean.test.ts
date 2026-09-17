/**
 * **Beugen in der Brille** — mit echtem Rapier, weil der Fehler im Rapier-Teil
 * saß.
 *
 * Der Befund kam aus der Brille, aus der Testküche: „Wenn ich meinen Kopf
 * bewege, scheint die Kameraposition starr zu bleiben — sie soll sich
 * mitbewegen, wenn ich mich nach links, rechts oder vorn beuge." Die Drehung
 * kam an, die Verschiebung nicht: 3DoF statt 6DoF, und das ist in der Brille
 * nicht nur unbequem, sondern der kürzeste Weg zur Übelkeit — das Innenohr
 * meldet eine Bewegung, die das Auge nicht sieht.
 *
 * Gefunden wurde er nicht im Rig: Das reicht den gemessenen Kopf unangetastet
 * durch, die Stauchung der Küche rechnet nur an der Höhe (`playerRig.test.ts`).
 * Er saß eine Etage tiefer: Die Kapsel folgt dem Kopf, und was ihr dabei
 * verwehrt blieb, wurde **vom Rig abgezogen**. In der Küche steht man immer an
 * einem Möbel, und deren Trefferkästen reichen bis auf 1,40 m
 * (`zones/kitchen.BLOCK_HEIGHT`) — also bis in Augenhöhe. Jedes Beugen über
 * den Tresen lief damit gegen eine unsichtbare Wand und wurde vollständig
 * zurückgenommen.
 *
 * Nachgebaut ist deshalb genau das: ein Tresen von einem halben Meter mit
 * einem Kasten von 1,40 m darüber, und ein Kopf, der sich darüber beugt.
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';

/** Halbe Kantenlänge der Bodenplatte, wie unter jeder Welt. */
const PLATE = 500;
/** So hoch sind die Trefferkästen der Küchenmöbel (`kitchen.BLOCK_HEIGHT`). */
const BLOCK_HEIGHT = 1.4;

const _move = new THREE.Vector3();

/**
 * Das Nötigste eines `PlayerRig` — und dazu der **Kopf neben dem Ursprung**:
 * In der Brille steht der Kopf dort, wo man im Zimmer gerade steht, und genau
 * dieser Versatz ist hier der Prüfstein (`playerFooting.test.ts` hat ihn
 * nicht, dort steht der Kopf immer über der Mitte).
 */
class TestRig {
  readonly position = new THREE.Vector3();
  headHeight = 1.4;
  /** Was die Brille misst: der Kopf im Spielraum, waagerecht versetzt. */
  readonly headOffset = new THREE.Vector3();

  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(
      this.position.x + this.headOffset.x,
      this.position.y + this.headHeight,
      this.position.z + this.headOffset.z,
    );
  }

  getHeadHeight(): number {
    return this.headHeight;
  }

  getFloorY(): number {
    return this.position.y;
  }

  updateMatrixWorld(): void {}

  get asRig(): PlayerRig {
    return this as unknown as PlayerRig;
  }
}

function solid(
  physics: PhysicsWorld,
  w: number,
  h: number,
  d: number,
  x: number,
  bottom: number,
  z: number,
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
  mesh.position.set(x, bottom + h / 2, z);
  mesh.updateMatrixWorld(true);
  physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
}

interface Stage {
  rig: TestRig;
  loco: PhysicsLocomotion;
  /** Ein Bild: erst rechnen, dann die Welt einen Schritt — wie im Spiel. */
  frame: (dt?: number, speedZ?: number) => void;
  /** Den Kopf im Zimmer verschieben, in Schritten von zwei Zentimetern. */
  move: (dx: number, dz: number) => void;
}

async function stage(build?: (physics: PhysicsWorld) => void): Promise<Stage> {
  const physics = await PhysicsWorld.create(-9.81);
  solid(physics, PLATE * 2, 0.6, PLATE * 2, 0, -0.6, 0);
  build?.(physics);
  const rig = new TestRig();
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  const frame = (dt = 1 / 90, speedZ = 0): void => {
    loco.apply(rig.asRig, _move.set(0, 0, speedZ), false, dt);
    physics.step(dt);
  };
  // Ein paar Bilder stehen: die Kapsel setzt sich auf den Boden.
  for (let i = 0; i < 60; i++) frame();
  const move = (dx: number, dz: number): void => {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.02);
    for (let i = 0; i < steps; i++) {
      rig.headOffset.x += dx / steps;
      rig.headOffset.z += dz / steps;
      frame();
    }
    // Und ein paar Bilder ruhig stehen bleiben, wie ein Mensch es tut.
    for (let i = 0; i < 10; i++) frame();
  };
  return { rig, loco, frame, move };
}

/** Der Kopf in der Welt, waagerecht. */
function head(rig: TestRig): { x: number; z: number } {
  const at = rig.getHeadPosition(new THREE.Vector3());
  return { x: at.x, z: at.z };
}

/** Die Küche: ein Tresen mit dem Trefferkasten, wie ihn die Zone stellt. */
function counter(physics: PhysicsWorld, z: number): void {
  solid(physics, 4, BLOCK_HEIGHT, 0.6, 0, 0, z);
}

describe('Der Kopf beugt sich, der Körper bleibt', () => {
  it('kommt über den Tresen — vorher blieb das Bild stehen', async () => {
    // Der Tresen steht 70 cm vor dem Spieler, seine Kante bei z = -0,4.
    const { rig, move } = await stage((physics) => counter(physics, -0.7));
    move(0, -0.4);
    // Vorher: 14 cm, der Rest ging an die Kapsel und wurde dem Rig abgezogen.
    expect(head(rig).z).toBeCloseTo(-0.4, 2);
    // Der Körper bleibt dabei vor dem Tresen stehen — er darf ja nicht hinein.
    expect(rig.position.z).toBeGreaterThan(-0.4);
  }, 60000);

  it('kommt zur Seite, auch zwischen zwei Zeilen', async () => {
    const { rig, move } = await stage((physics) => {
      solid(physics, 0.6, BLOCK_HEIGHT, 4, -0.6, 0, 0);
      solid(physics, 0.6, BLOCK_HEIGHT, 4, 0.6, 0, 0);
    });
    move(-0.3, 0);
    expect(head(rig).x).toBeCloseTo(-0.3, 2);
    move(0.6, 0);
    expect(head(rig).x).toBeCloseTo(0.3, 2);
  }, 60000);

  it('holt die Kapsel wieder ein, wenn man sich aufrichtet', async () => {
    const { rig, loco, move } = await stage((physics) => counter(physics, -0.7));
    move(0, -0.4);
    move(0, 0.4);
    // Zurück auf dem Ausgangspunkt, und der Körper steht wieder unter dem Kopf:
    // Ein Rückstand, der bliebe, wäre ein Spieler, der von seinem eigenen
    // Körper wegwandert.
    expect(head(rig).z).toBeCloseTo(0, 2);
    const capsule = loco.getPosition(new THREE.Vector3());
    expect(capsule.z).toBeCloseTo(head(rig).z, 2);
    expect(capsule.x).toBeCloseTo(head(rig).x, 2);
  }, 60000);

  /**
   * Beugen ist kein Gehen. Wer im Zimmer einfach weiterläuft, wo im Spiel eine
   * Wand steht, kommt eine halbe Armlänge weit und dann nicht mehr
   * (`LEAN_LIMIT`) — sonst hinge der Blick beliebig weit im Nichts.
   */
  it('lässt niemanden durch die Wand spazieren', async () => {
    const { rig, move } = await stage((physics) => {
      solid(physics, 4, 3, 0.4, 0, 0, -0.8);
    });
    move(0, -2.5);
    expect(head(rig).z).toBeGreaterThan(-1.1);
  }, 60000);

  it('hält den Stock weiter an der Wand an', async () => {
    const { rig, frame } = await stage((physics) => {
      solid(physics, 4, 3, 0.4, 0, 0, -1.5);
    });
    // Zehn Sekunden mit vollem Tempo gegen die Wand.
    for (let i = 0; i < 900; i++) frame(1 / 90, -2.6);
    expect(rig.position.z).toBeGreaterThan(-1.1);
    expect(head(rig).z).toBeGreaterThan(-1.1);
  }, 60000);

  /**
   * Und im Freien bleibt alles, wie es war: Was die Brille misst, kommt an —
   * auf den Millimeter und ohne Rückstand.
   */
  it('gibt im Freien jeden Zentimeter weiter', async () => {
    const { rig, loco, move } = await stage();
    move(0.3, -0.2);
    expect(head(rig).x).toBeCloseTo(0.3, 3);
    expect(head(rig).z).toBeCloseTo(-0.2, 3);
    const capsule = loco.getPosition(new THREE.Vector3());
    expect(capsule.x).toBeCloseTo(0.3, 2);
    expect(capsule.z).toBeCloseTo(-0.2, 2);
  }, 60000);
});
