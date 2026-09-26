/**
 * **Zwei Figuren in der Ebene, mit echtem Rapier.**
 *
 * Gemeldet: _„Ich will, dass die Physik, ob man wo lang gehen kann oder nicht,
 * wirklich nur auf der 2D-Ebene ist … und nun ist das Problem wieder, aber wenn
 * zwei Charaktere zusammen laufen."_ Auf dem Bild stand der Koch oben auf der
 * Übungspuppe, die im engen Gang der Test-Navigation neben ihm herlief. Der
 * Körper des NPC ist ein Zylinder in der Physik; die Kapsel des Spielers stieß
 * an ihm an, und der Formwurf nach unten nahm seinen Kopf als Boden.
 *
 * Jetzt berühren sich die Körper auf dem Gitter nicht mehr
 * (`PhysicsBody.gridFigure`, `PhysicsLocomotion.walkPlane`), und wer wem im
 * Weg steht, sagt die Ebene (`planeMove.figureWalls`).
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_CELL, GROUP_NPC, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion } from './PhysicsLocomotion';
import { PLAYER_CAPSULE_RADIUS } from './playerClearance';
import type { PlayerRig } from '../core/PlayerRig';
import { slideCircle, figureWalls, PLAYER_PLANE_RADIUS } from '../worlds/nav/planeMove';

const _move = new THREE.Vector3();

class TestRig {
  readonly position = new THREE.Vector3();
  headHeight = 1.7;

  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(this.position.x, this.position.y + this.headHeight, this.position.z);
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

/** Die Übungspuppe: 1,7 m hoch, 0,28 m Halbmesser (`npcKinds`). */
const NPC_HEIGHT = 1.7;
const NPC_RADIUS = 0.28;

async function stage(
  figuresInPlane = true,
  offset = 0,
): Promise<{
  physics: PhysicsWorld;
  rig: TestRig;
  npc: ReturnType<PhysicsWorld['addDynamic']>;
  run: (seconds: number, player: number, npc: number) => void;
}> {
  const physics = await PhysicsWorld.create(-9.81);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20));
  floor.position.set(0, -0.1, 0);
  floor.updateMatrixWorld(true);
  physics.addStatic(floor, { membership: GROUP_WORLD, filter: ALL_GROUPS });

  const holder = new THREE.Object3D();
  holder.position.set(offset, NPC_HEIGHT / 2, -2);
  holder.updateWorldMatrix(true, false);
  const npc = physics.addDynamic(holder, {
    shape: { kind: 'cylinder' },
    halfExtents: new THREE.Vector3(NPC_RADIUS, NPC_HEIGHT / 2, NPC_RADIUS),
    mass: 45,
    friction: 0.25,
    restitution: 0,
    membership: GROUP_NPC,
    filter: ALL_GROUPS & ~GROUP_CELL,
  });
  npc.body.lockRotations(true, true);
  // So wie `Npc.update` auf dem Gitter.
  physics.setGridFigure(npc, true);

  const rig = new TestRig();
  rig.position.set(0, 0, 0);
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  // Die Ebene kennt nur den NPC — so wie `GridWorld.playerPlane`.
  loco.plane = {
    slide: (x, z, dx, dz) => {
      const t = npc.body.translation();
      const figures = figuresInPlane ? [{ x: t.x, z: t.z, radius: NPC_RADIUS }] : [];
      return slideCircle(
        figureWalls(figures, x, z, dx, dz, PLAYER_CAPSULE_RADIUS),
        x,
        z,
        dx,
        dz,
        PLAYER_PLANE_RADIUS,
      );
    },
    flightFloor: () => null,
  };
  const dt = 1 / 60;
  const run = (seconds: number, player: number, towards: number): void => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      loco.apply(rig.asRig, _move.set(0, 0, player), false, dt);
      const v = npc.body.linvel();
      npc.body.setLinvel({ x: 0, y: v.y, z: towards }, true);
      physics.step(dt);
    }
  };
  run(0.5, 0, 0);
  return { physics, rig, npc, run };
}

describe('zwei Figuren auf dem Gitter', () => {
  /**
   * Genau der gemeldete Fall, ohne die Ebene dazwischen: frontal gegen den
   * Zylinder gelaufen, stand die Kapsel vorher nach vier Sekunden auf 1,70 m —
   * auf seinem Kopf. Jetzt geht sie in der Physik durch ihn hindurch und
   * bleibt auf dem Boden; aufhalten muss sie die Ebene.
   */
  it('nimmt den Kopf eines NPC nicht als Boden', async () => {
    // Frontal, leicht versetzt, der NPC steht, kommt entgegen oder geht voraus.
    const cases: [number, number][] = [
      [0, 0],
      [0.2, 1],
      [0.4, 1],
      [0, -1],
      [0.5, 0],
    ];
    for (const [offset, towards] of cases) {
      const { rig, npc, run } = await stage(false, offset);
      let highest = 0;
      for (let i = 0; i < 40; i++) {
        run(0.1, -1.5, towards);
        highest = Math.max(highest, rig.position.y, npc.body.translation().y - NPC_HEIGHT / 2);
      }
      expect({ offset, towards, highest: highest < 0.05 }).toEqual({
        offset,
        towards,
        highest: true,
      });
    }
  });

  it('der Spieler steigt nicht auf den NPC, wenn er gegen ihn läuft', async () => {
    const { rig, npc, run } = await stage();
    run(3, -1.5, 0);
    expect(rig.position.y).toBeLessThan(0.05);
    // Er bleibt vor ihm stehen, so weit weg wie beide Körper zusammen.
    const t = npc.body.translation();
    expect(rig.position.z - t.z).toBeGreaterThan(NPC_RADIUS + PLAYER_CAPSULE_RADIUS - 0.02);
    // Und der NPC ist nicht weggeschoben worden und nicht gestiegen.
    expect(t.z).toBeCloseTo(-2, 1);
    expect(t.y).toBeCloseTo(NPC_HEIGHT / 2, 1);
  });

  it('der NPC hebt den Spieler nicht an, wenn er in ihn hineinläuft', async () => {
    const { rig, npc, run } = await stage();
    let highest = 0;
    for (let i = 0; i < 30; i++) {
      run(0.1, 0, 1.5);
      highest = Math.max(highest, rig.position.y, npc.body.translation().y - NPC_HEIGHT / 2);
    }
    expect(highest).toBeLessThan(0.05);
  });
});
