/**
 * **Gehen in der Ebene, mit echtem Rapier** — wie der Boden nebenan
 * (`playerFooting.test.ts`).
 *
 * Gewünscht: _„Die Spieler bewegen sich an sich nur in der 2D-Ebene … Die
 * Treppe ist wie ein Gang mit Wänden von außen, aber von der Treppe runter kann
 * man gehen (one way wall). Der Spieler wird nur an der Höhe bewegt bei der
 * Treppe."_ Nachgemessen an einem Plan mit Treppe und Podest: hinauf ohne
 * Stufenruck, seitlich nicht hinauf, seitlich herunter — und springen tut
 * niemand mehr.
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_CELL, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion, type PlayerPlane } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';
import { GridPlan } from '../worlds/grid/gridPlan';
import { CellGrid, navCellSource } from '../worlds/nav/cellGrid';
import { slideOnCells, PLAYER_PLANE_RADIUS } from '../worlds/nav/planeMove';
import { DIR_N, NO_TILE, keyLevel, tileKey } from '../worlds/nav/navTile';

const _move = new THREE.Vector3();

/** Dasselbe Nötigste eines Rigs wie in `playerFooting.test.ts`. */
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

/** Eine Etage ist 2,8 m hoch. */
const STOREY = 2.8;
/** Die Treppe liegt in Spalte 3, von z = 6 nach Norden bis z = 3; oben das Podest. */
const STAIR_X = 3;

/**
 * Ein Boden 8 × 10, ein Podest auf Ebene 1 im Norden und eine Treppe hinauf —
 * dieselbe Rechnung wie das Podest der Testwelt (`test/zones/podium.ts`).
 */
async function stage(): Promise<{
  physics: PhysicsWorld;
  rig: TestRig;
  loco: PhysicsLocomotion;
  walk: (seconds: number, vx: number, vz: number, jump?: boolean) => number[];
}> {
  const plan = new GridPlan([0, STOREY]);
  plan.floor({ x: 0, z: 0, w: 8, d: 10 });
  plan.floor({ x: 0, z: 0, w: 8, d: 3, level: 1 });
  plan.stairs(STAIR_X, 6, DIR_N, 0, 4);

  const physics = await PhysicsWorld.create(-9.81);
  for (const solid of plan.solids()) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(solid.w, solid.h, solid.d));
    mesh.position.set(solid.x, solid.y, solid.z);
    mesh.rotation.y = solid.yaw ?? 0;
    mesh.updateMatrixWorld(true);
    physics.addStatic(mesh, {
      membership: solid.cell ? GROUP_CELL : GROUP_WORLD,
      filter: ALL_GROUPS,
    });
  }

  const grid = new CellGrid(
    navCellSource(plan.graph, (key) => plan.slopeAt(key), {
      voidIsFree: true,
      flight: (tx, tz, level) => plan.flightOn(tileKey(tx, tz, level))?.dir ?? null,
    }),
  );
  const plane: PlayerPlane = {
    slide: (x, z, dx, dz, footY) => {
      const key = plan.graph.at(x, z, footY);
      return slideOnCells(grid, x, z, dx, dz, key === NO_TILE ? 0 : keyLevel(key));
    },
    flightFloor: (x, z, footY) => plan.flightFloor(x, z, footY),
  };

  const rig = new TestRig();
  rig.position.set(STAIR_X + 0.5, 0, 8.5);
  const loco = new PhysicsLocomotion(physics, rig.asRig);
  loco.plane = plane;
  const dt = 1 / 60;
  const walk = (seconds: number, vx: number, vz: number, jump = false): number[] => {
    const heights: number[] = [];
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      loco.apply(rig.asRig, _move.set(vx, 0, vz), jump, dt);
      physics.step(dt);
      heights.push(rig.position.y);
    }
    return heights;
  };
  // Erst einmal hinsetzen.
  walk(0.5, 0, 0);
  return { physics, rig, loco, walk };
}

describe('Gehen in der Ebene mit echter Physik', () => {
  it('geht die Treppe hinauf, ohne Ruck nach unten, und kommt oben an', async () => {
    const { rig, walk } = await stage();
    const heights = walk(6, 0, -1.2);
    expect(rig.position.z).toBeLessThan(2);
    expect(rig.position.y).toBeCloseTo(STOREY, 1);
    // Kein Bild geht wieder nach unten, und keines springt mehr als eine
    // halbe Stufe auf einmal.
    for (let i = 1; i < heights.length; i++) {
      expect(heights[i]! - heights[i - 1]!).toBeGreaterThan(-0.005);
      expect(heights[i]! - heights[i - 1]!).toBeLessThan(0.1);
    }
  });

  it('lässt nicht seitlich auf die Treppe', async () => {
    const { rig, walk } = await stage();
    rig.position.set(1.5, 0, 6.5);
    walk(0.2, 0, 0);
    walk(3, 1.2, 0);
    expect(rig.position.x).toBeLessThan(STAIR_X - PLAYER_PLANE_RADIUS + 0.02);
    expect(rig.position.y).toBeLessThan(0.1);
  });

  it('lässt seitlich von der Treppe herunter', async () => {
    const { rig, walk } = await stage();
    // Bis zur Mitte des Laufs hinauf …
    walk(2.5, 0, -1.2);
    expect(rig.position.y).toBeGreaterThan(0.8);
    // … und nach Westen herunter.
    walk(3, -1.2, 0);
    expect(rig.position.x).toBeLessThan(STAIR_X - 0.5);
    expect(rig.position.y).toBeLessThan(0.1);
  });

  it('springt nicht, wo in der Ebene gegangen wird', async () => {
    const { rig, walk } = await stage();
    const heights = walk(1, 0, 0, true);
    expect(Math.max(...heights)).toBeLessThan(0.05);
    expect(rig.position.y).toBeLessThan(0.05);
  });
});

describe('Gleiten über einen Boden aus vielen Stücken', () => {
  /**
   * Gemessen im Wandparcours: Die Ebene gab den Schritt längs der Schräge her,
   * und der Character-Controller schluckte ihn alle paar Dutzend Bilder ganz
   * — er hakte mit der Sohle an den Fugen zwischen den Bodenkörpern. Hier ein
   * Boden aus Kacheln von einem Meter und eine Schräge, an der man entlangläuft.
   */
  it('bleibt kein einziges Bild stehen', async () => {
    const physics = await PhysicsWorld.create(-9.81);
    for (let x = -2; x < 12; x++)
      for (let z = -2; z < 12; z++) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1));
        mesh.position.set(x + 0.5, -0.1, z + 0.5);
        mesh.updateMatrixWorld(true);
        physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
      }
    // Eine Wand „╲" von (0, 0) nach (10, 10), nur in der Ebene.
    const wall = [{ ax: 0, az: 0, bx: 10, bz: 10 }];
    const { slideCircle } = await import('../worlds/nav/planeMove');
    const plane: PlayerPlane = {
      slide: (x, z, dx, dz) => slideCircle(wall, x, z, dx, dz),
      flightFloor: () => null,
    };
    const rig = new TestRig();
    rig.position.set(1, 0, 3);
    const loco = new PhysicsLocomotion(physics, rig.asRig);
    loco.plane = plane;
    const dt = 1 / 60;
    const step = (vx: number, vz: number): void => {
      loco.apply(rig.asRig, _move.set(vx, 0, vz), false, dt);
      physics.step(dt);
    };
    for (let i = 0; i < 30; i++) step(0, 0);
    // Nach Osten gegen die Wand, dann an ihr entlang nach Südosten.
    let last = rig.position.clone();
    let stalls = 0;
    for (let i = 0; i < 240; i++) {
      step(3.2, 0);
      if (i > 20 && rig.position.distanceTo(last) < 0.01) stalls++;
      last = rig.position.clone();
    }
    expect(stalls).toBe(0);
    expect(rig.position.x).toBeGreaterThan(6);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.05);
  });
});
