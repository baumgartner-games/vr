/**
 * **Figuren gehen durcheinander hindurch, mit echtem Rapier.**
 *
 * Gewünscht (September 2026): _„Charaktere so eingestellt, dass diese durch
 * einander gehen dürfen und können und sich nicht gegenseitig blockieren"_.
 * Davor gemeldet: Im engen Gang der Test-Navigation stand der Koch oben auf
 * der Übungspuppe — der Formwurf nach unten nahm den Kopf ihres Zylinders als
 * Boden. Jetzt sieht die Kapsel keinen NPC (`PhysicsLocomotion.PLAYER_FILTER`)
 * und kein NPC die Kapsel oder einen anderen NPC (`Npc`, `filter`).
 */
import * as THREE from 'three';
import {
  ALL_GROUPS,
  GROUP_CELL,
  GROUP_NPC,
  GROUP_PLAYER,
  GROUP_WORLD,
  PhysicsWorld,
} from './PhysicsWorld';
import { PhysicsLocomotion } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';

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
/** Derselbe Filter wie am Körper eines NPC (`Npc`). */
const NPC_FILTER = ALL_GROUPS & ~GROUP_CELL & ~GROUP_PLAYER & ~GROUP_NPC;

type Body = ReturnType<PhysicsWorld['addDynamic']>;

function addNpc(physics: PhysicsWorld, x: number, z: number): Body {
  const holder = new THREE.Object3D();
  holder.position.set(x, NPC_HEIGHT / 2, z);
  holder.updateWorldMatrix(true, false);
  const npc = physics.addDynamic(holder, {
    shape: { kind: 'cylinder' },
    halfExtents: new THREE.Vector3(NPC_RADIUS, NPC_HEIGHT / 2, NPC_RADIUS),
    mass: 45,
    friction: 0.25,
    restitution: 0,
    membership: GROUP_NPC,
    filter: NPC_FILTER,
  });
  npc.body.lockRotations(true, true);
  return npc;
}

async function stage(
  offset: number,
  plane: boolean,
): Promise<{
  physics: PhysicsWorld;
  rig: TestRig;
  npc: Body;
  run: (seconds: number, player: number, npc: number) => void;
}> {
  const physics = await PhysicsWorld.create(-9.81);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20));
  floor.position.set(0, -0.1, 0);
  floor.updateMatrixWorld(true);
  physics.addStatic(floor, { membership: GROUP_WORLD, filter: ALL_GROUPS });
  const npc = addNpc(physics, offset, -2);

  const rig = new TestRig();
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  // Mit Ebene (Gitterwelt) oder ohne (reine Physik) — beide lassen durch.
  if (plane)
    loco.plane = { slide: (x, z, dx, dz) => ({ x: x + dx, z: z + dz }), flightFloor: () => null };
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

describe('Figuren gehen durcheinander hindurch', () => {
  // Frontal, leicht versetzt; der NPC steht, kommt entgegen oder geht voraus.
  const cases: [number, number][] = [
    [0, 0],
    [0.2, 1],
    [0.4, 1],
    [0, -1],
    [0.5, 0],
  ];

  for (const plane of [true, false])
    it(`der Spieler geht durch den NPC, ohne auf ihn zu steigen (${plane ? 'Ebene' : 'Physik'})`, async () => {
      for (const [offset, towards] of cases) {
        const { rig, npc, run } = await stage(offset, plane);
        let highest = 0;
        for (let i = 0; i < 30; i++) {
          run(0.1, -1.5, towards);
          highest = Math.max(highest, rig.position.y, npc.body.translation().y - NPC_HEIGHT / 2);
        }
        // Keiner steigt, und der Spieler kam ungebremst voran: 3 s × 1,5 m/s.
        expect({ offset, towards, up: highest < 0.05 }).toEqual({ offset, towards, up: true });
        expect(rig.position.z).toBeLessThan(-4.3);
      }
    });

  it('der NPC bleibt stehen, wo er steht, wenn der Spieler durch ihn geht', async () => {
    const { npc, run } = await stage(0, true);
    run(3, -1.5, 0);
    const t = npc.body.translation();
    expect(t.x).toBeCloseTo(0, 2);
    expect(t.z).toBeCloseTo(-2, 2);
  });

  it('zwei NPCs gehen durcheinander hindurch', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20));
    floor.position.set(0, -0.1, 0);
    floor.updateMatrixWorld(true);
    physics.addStatic(floor, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    const a = addNpc(physics, 0, -2);
    const b = addNpc(physics, 0.1, 2);
    const dt = 1 / 60;
    for (let i = 0; i < 240; i++) {
      a.body.setLinvel({ x: 0, y: a.body.linvel().y, z: 1.2 }, true);
      b.body.setLinvel({ x: 0, y: b.body.linvel().y, z: -1.2 }, true);
      physics.step(dt);
    }
    expect(a.body.translation().z).toBeGreaterThan(2);
    expect(b.body.translation().z).toBeLessThan(-2);
    expect(a.body.translation().y).toBeCloseTo(NPC_HEIGHT / 2, 1);
    expect(b.body.translation().y).toBeCloseTo(NPC_HEIGHT / 2, 1);
  });
});
