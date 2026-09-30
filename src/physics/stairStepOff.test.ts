/**
 * **Seitlich von der Treppe, unter einer Etage darüber** — mit echtem Rapier,
 * wie `playerPlane.test.ts`, aber wie im Hausbau: Die Etage darüber liegt über
 * dem ganzen Grundriss, nur über der Treppe ist ein Loch.
 *
 * Gemeldet: _„wenn ich in der Treppen Mitte seitlich gegangen bin sollte ich
 * eigentlich auf die untere Etage gehen … Aber hier steckte ich irgendwie im
 * Boden fest? Nur bei der letzten Treppen Stufe kann ich wenn ich bereits
 * seitlich gehe auf die nächste Etage gehen von beiden Seiten."_
 */
import * as THREE from 'three';
import { ALL_GROUPS, GROUP_CELL, GROUP_WORLD, PhysicsWorld } from './PhysicsWorld';
import { PhysicsLocomotion, type PlayerPlane } from './PhysicsLocomotion';
import type { PlayerRig } from '../core/PlayerRig';
import { GridPlan } from '../worlds/grid/gridPlan';
import { CellGrid, navCellSource } from '../worlds/nav/cellGrid';
import { slideOnCells } from '../worlds/nav/planeMove';
import { DIR_N, NO_TILE, keyLevel, tileKey } from '../worlds/nav/navTile';

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
}

const STOREY = 2.8;
/** Die Treppe des Hausbaus: Spalte 3, drei Kacheln Stufen von z = 6 nach Norden, oben der Stand. */
const STAIR_X = 3;

async function stage(
  start = { x: STAIR_X + 0.5, z: 7.5 },
  build?: (plan: GridPlan) => void,
): Promise<{
  rig: TestRig;
  walk: (seconds: number, vx: number, vz: number) => void;
  climbTo: (z: number) => void;
}> {
  const plan = new GridPlan([0, STOREY]);
  plan.floor({ x: 0, z: 0, w: 8, d: 10 });
  plan.floor({ x: 0, z: 0, w: 8, d: 10, level: 1 });
  plan.stairs(STAIR_X, 6, DIR_N, 0, 3);
  build?.(plan);

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
      flightSide: (tx, tz, side, part, level) =>
        plan.flightSideOpen(tileKey(tx, tz, level), side, part),
    }),
  );
  const plane: PlayerPlane = {
    slide: (x, z, dx, dz, footY) => {
      const key = plan.graph.at(x, z, footY);
      return slideOnCells(grid, x, z, dx, dz, key === NO_TILE ? 0 : keyLevel(key));
    },
    flightFloor: (x, z, footY) => plan.flightFloor(x, z, footY),
    stepOff: (fromX, fromZ, x, z, footY) => plan.stepOffFlight(fromX, fromZ, x, z, footY),
  };

  const rig = new TestRig();
  rig.position.set(start.x, 0, start.z);
  const asRig = rig as unknown as PlayerRig;
  const loco = new PhysicsLocomotion(physics, asRig);
  loco.plane = plane;
  const dt = 1 / 60;
  const walk = (seconds: number, vx: number, vz: number): void => {
    for (let i = 0; i < Math.round(seconds / dt); i++) {
      loco.apply(asRig, _move.set(vx, 0, vz), false, dt);
      physics.step(dt);
    }
  };
  const climbTo = (z: number): void => {
    for (let i = 0; i < 600 && rig.position.z > z; i++) walk(dt, 0, -1.2);
  };
  walk(0.5, 0, 0);
  return { rig, walk, climbTo };
}

describe('Seitlich von der Treppe unter der Etage darüber', () => {
  it('fällt aus der Mitte des Laufs auf die untere Etage — nach beiden Seiten', async () => {
    for (const vx of [1.2, -1.2]) {
      const { rig, walk, climbTo } = await stage();
      climbTo(5.5);
      expect(rig.position.y).toBeGreaterThan(1);
      walk(3, vx, 0);
      expect(Math.abs(rig.position.x - (STAIR_X + 0.5))).toBeGreaterThan(2);
      expect(Math.abs(rig.position.y)).toBeLessThan(0.1);
    }
  });

  it('geht von der letzten Kachel seitlich auf die Etage darüber — nach beiden Seiten', async () => {
    for (const vx of [1.2, -1.2]) {
      const { rig, walk, climbTo } = await stage();
      // Die untere Hälfte der letzten Kachel: noch gut eine halbe Etage unter ihr.
      climbTo(4.8);
      expect(rig.position.y).toBeLessThan(2.4);
      walk(3, vx, 0);
      expect(Math.abs(rig.position.x - (STAIR_X + 0.5))).toBeGreaterThan(2);
      expect(rig.position.y).toBeCloseTo(STOREY, 1);
    }
  });
});

describe('Hinter der Treppe, auf der Etage darunter', () => {
  // Gemeldet: _„als spieler will ich bei einer treppe nicht unter die treppe
  // laufen können. Aktuell kann ich von hinten leider reinlaufen"_. Hinter dem
  // Kopf des Laufs (z = 3, unter dem Stand der Etage darüber) ist Boden der
  // Etage 0; von dort ging es nach Süden unter die Stufen.
  it('hält am Kopf des Laufs — man kommt nicht unter die Treppe', async () => {
    const { rig, walk } = await stage({ x: STAIR_X + 0.5, z: 2.5 });
    walk(3, 0, 1.2);
    expect(rig.position.z).toBeLessThan(3.9);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.1);
  });

  it('läuft oben weiter vom Lauf auf den Stand und von dort wieder hinunter', async () => {
    const { rig, walk, climbTo } = await stage();
    climbTo(3.5);
    expect(rig.position.y).toBeCloseTo(STOREY, 1);
    walk(4, 0, 1.2);
    expect(rig.position.z).toBeGreaterThan(7);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.1);
  });
});

describe('Der Stand hinter einer Wand der Etage darunter', () => {
  // Gemeldet: _„bei der unteren treppe komme ich leider nicht auf das dach.
  // Bei der oberen treppe klappt das korrekt."_ Die untere Treppe stand eine
  // Kachel näher am Haus: Ihr Stand lag auf der Decke des Raums, und die
  // Wand des Raums (Etage 0) auf der Kante zwischen oberster Stufe und Stand
  // hielt den Spieler oben auf der Treppe fest.
  const wallAtHead = (plan: GridPlan): void => {
    plan.wall(STAIR_X, 4, DIR_N, 0);
  };

  it('geht von der obersten Stufe über die Wand auf den Stand', async () => {
    const { rig, climbTo } = await stage(undefined, wallAtHead);
    climbTo(2.5);
    expect(rig.position.z).toBeLessThan(3);
    expect(rig.position.y).toBeCloseTo(STOREY, 1);
  });

  it('hält unten im Raum weiter an der Wand', async () => {
    const { rig, walk } = await stage({ x: STAIR_X + 0.5, z: 2.5 }, wallAtHead);
    walk(3, 0, 1.2);
    expect(rig.position.z).toBeLessThan(3.9);
    expect(Math.abs(rig.position.y)).toBeLessThan(0.1);
  });
});
