/**
 * **Am Durchgang aus dem Regal steigt niemand auf die Wand** — mit echtem
 * Rapier.
 *
 * Gemeldet im Hausbau: _„In der Nähe einer Tür kann sich die Spieler Figur
 * hochbuggen."_ Pfosten und Sturz eines `Wall_Doorway` sind ein Körper
 * (`PhysicsWorld.archParts`). Galt er nicht als Wand des Gitters
 * (`gridSnap.standsOnGrid`, `PhysicsBody.gridWall`), hielt er die Kapsel auf,
 * und der Wurf nach unten (`PhysicsLocomotion.walkPlane`) nahm ihn als Stufe:
 * Bild für Bild eine, bis die Füße auf 2,80 m standen — oben auf der Wand.
 * Die Ebene hier lässt alles durch, damit nur die Physik gefragt ist.
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion, type PlayerPlane } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';

const _move = new THREE.Vector3();

/** Dasselbe Nötigste eines Rigs wie in `playerPlane.test.ts`. */
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

/**
 * Der schmale Durchgang (eine Kachel, 0,8 m offen, Sturz ab drei Vierteln der
 * 2,80 m) auf der Fuge z = 0 um x = 0, als Wand des Gitters — und der höchste
 * Stand der Füße, während man von (`x`, `z`) mit (`vx`, `vz`) geht.
 */
async function highest(x: number, z: number, vx: number, vz: number): Promise<number> {
  const physics = await PhysicsWorld.create(-9.81);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(20, 0.2, 20));
  floor.position.set(0, -0.1, 0);
  floor.updateMatrixWorld(true);
  physics.addStatic(floor, { membership: GROUP_WORLD, filter: ALL_GROUPS });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1, 2.8, 0.27));
  door.position.set(0, 1.4, 0);
  door.updateMatrixWorld(true);
  const entry = physics.addStatic(door, {
    membership: GROUP_WORLD,
    filter: ALL_GROUPS,
    shape: { kind: 'arch', open: 0.8, top: 0.75, along: 'x' },
  });
  physics.setGridWall(entry, true);

  const plane: PlayerPlane = {
    slide: (px, pz, dx, dz) => ({ x: px + dx, z: pz + dz }),
    flightFloor: () => null,
  };
  const rig = new TestRig();
  rig.position.set(x, 0, z);
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  loco.plane = plane;
  const dt = 1 / 60;
  let top = 0;
  for (let i = 0; i < 180; i++) {
    // Erst hinsetzen, dann gehen.
    const going = i >= 30;
    loco.apply(rig.asRig, _move.set(going ? vx : 0, 0, going ? vz : 0), false, dt);
    physics.step(dt);
    top = Math.max(top, rig.position.y);
  }
  return top;
}

describe('Am Durchgang aus dem Regal', () => {
  // Jeder dieser Wege stand vorher oben auf der Wand (gemessen 2,19 bis 2,80 m).
  const WAYS: Array<[string, number, number, number, number]> = [
    ['längs der Fuge durch die Pfosten', 1.1, 0, -1.5, 0],
    ['quer durch den Pfosten', 0.45, 1.2, 0, -1.5],
    ['quer dicht neben dem Pfosten', 0.3, 0.35, 0, -1.5],
    ['am Ende des Durchgangs vorbei', 1.4, 0, -1.5, 0],
  ];

  for (const [name, x, z, vx, vz] of WAYS)
    it(`bleibt auf dem Boden: ${name}`, async () => {
      expect(await highest(x, z, vx, vz)).toBeLessThan(0.05);
    });
});
