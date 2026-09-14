import * as THREE from 'three';
import type { Locomotion } from '../../core/Locomotion';
import type { PlayerRig } from '../../core/PlayerRig';
import { GridPlan } from '../grid/gridPlan';
import { DIR_S, TILE } from '../nav/navTile';
import { FloorModel } from './flatFloor';
import { GridDriver } from './gridDriver';

/**
 * **Der Fahrer der 3D-Figur**: Der Wunsch des Gestells bewegt die Figur auf
 * dem Raster, das Gestell folgt ihr samt Höhe — die Treppe hinauf. Wo kein
 * Raster ist, trägt die Physik darunter.
 */
class FakeRig extends THREE.Group {
  moveSpeed = 2.6;
  paused = false;
  sprinting = false;
  crouch = 0;
  private readonly eye = 1.6;
  getHeadPosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(this.position.x, this.position.y + this.eye, this.position.z);
  }
  getFloorY(): number {
    return this.position.y;
  }
}

function house(): { floor: FloorModel; plan: GridPlan } {
  const plan = new GridPlan([0, 3.1]);
  plan.room({ x: 0, z: 0, w: 2, d: 3 }, { walls: true });
  plan.room({ x: 0, z: 0, w: 2, d: 3, level: 1 }, { walls: true });
  plan.stairs(0, 0, DIR_S, 0);
  const floor = new FloorModel(plan.graph, {
    ramps: [{ level: 0, tx: 0, tz: 0, dir: DIR_S, rise: 3.1 }],
  });
  return { floor, plan };
}

function driverWith(): { driver: GridDriver; inner: Locomotion & { applied: number } } {
  const inner = {
    applied: 0,
    apply: () => {
      inner.applied++;
    },
    resync: () => {},
  };
  return { driver: new GridDriver(inner), inner };
}

describe('Der Fahrer auf dem Raster', () => {
  it('bewegt das Gestell mit dem Wunsch über den Boden und die Treppe hinauf', () => {
    const { floor } = house();
    const { driver, inner } = driverWith();
    const rig = new FakeRig();
    rig.position.set(1.25, 0, 0.6);
    const camera = new THREE.Object3D();
    // Nach Süden (+z) wollen: Wunsch in m/s wie vom Gestell.
    driver.loco.apply(rig as unknown as PlayerRig, new THREE.Vector3(0, 0, 2.6), false, 0.1);
    expect(inner.applied).toBe(0);
    for (let i = 0; i < 40; i++)
      expect(driver.step(rig as unknown as PlayerRig, camera, floor, 0.1)).toBe(true);
    expect(rig.position.z).toBeGreaterThan(TILE);
    expect(driver.figure?.level).toBe(1);
    expect(rig.position.y).toBeCloseTo(3.1, 1);
  });

  it('lässt die Physik tragen, wo kein Raster ist, und den Sprung', () => {
    const { floor } = house();
    const { driver, inner } = driverWith();
    const rig = new FakeRig();
    rig.position.set(40, 0, 40);
    const camera = new THREE.Object3D();
    expect(driver.step(rig as unknown as PlayerRig, camera, floor, 0.1)).toBe(false);
    expect(driver.loco.active).toBe(false);
    driver.loco.apply(rig as unknown as PlayerRig, new THREE.Vector3(1, 0, 0), false, 0.1);
    expect(inner.applied).toBe(1);
    // Zurück auf die Karte: die Figur wird dort gestellt, wo der Kopf steht.
    driver.loco.apply(rig as unknown as PlayerRig, new THREE.Vector3(), false, 0.1);
    rig.position.set(1.25, 0, 3.5);
    expect(driver.step(rig as unknown as PlayerRig, camera, floor, 0.1)).toBe(true);
    expect(driver.figure?.x).toBeCloseTo(1.25);
    // Ein Sprung geht an die Physik, für einen Moment.
    expect(driver.step(rig as unknown as PlayerRig, camera, floor, 0.1, true)).toBe(false);
    expect(driver.step(rig as unknown as PlayerRig, camera, floor, 0.1)).toBe(false);
    for (let i = 0; i < 8; i++) driver.step(rig as unknown as PlayerRig, camera, floor, 0.1);
    expect(driver.loco.active).toBe(true);
  });
});
