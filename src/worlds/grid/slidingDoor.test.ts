import * as THREE from 'three';
import { PhysicsWorld, type PhysicsBody } from '../../physics/PhysicsWorld';
import { GridPlan } from './gridPlan';
import { changeSlidingDoor } from './slidingDoor';
import { NavGraph } from '../nav/navGraph';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, dirX, dirZ, tileKey } from '../nav/navTile';
import type { PlanSolid } from './solids';

describe('incremental sliding doors', () => {
  it('changes only the leaf and matching navigation wall', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 }, { walls: true });
    plan.door(0, 0, DIR_N, 0, true);
    const key = tileKey(0, 0);
    const beforeTiles = [...plan.graph.tileKeys()].map((tile) => plan.graph.tile(tile));
    const nav = new NavGraph();
    const remove = jest.fn();
    const add = jest.fn();
    const at = { x: 0, z: 0, dir: DIR_N } as const;
    expect(changeSlidingDoor(plan, nav, at, false, remove, add)).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(plan.graph.wall(key, DIR_N)?.open).toBe(false);
    expect(nav.wall(key, DIR_N)?.open).toBe(false);
    expect([...plan.graph.tileKeys()].map((tile) => plan.graph.tile(tile))).toEqual(beforeTiles);
    expect(changeSlidingDoor(plan, nav, at, false, remove, add)).toBe(false);
    expect(add).toHaveBeenCalledTimes(1);
    expect(changeSlidingDoor(plan, nav, at, true, remove, add)).toBe(true);
    expect(add).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(2);
    expect(nav.wall(key, DIR_N)?.open).toBe(true);
  });

  it.each([DIR_N, DIR_E, DIR_S, DIR_W] as const)(
    'really blocks and clears the doorway in Rapier for direction %i',
    async (dir) => {
      const physics = await PhysicsWorld.create(0);
      const plan = new GridPlan().room({ x: 0, z: 0, w: 1, d: 1 });
      plan.door(0, 0, dir, 0, true);
      let body: PhysicsBody | null = null;
      let mesh: THREE.Mesh | null = null;
      const material = new THREE.MeshBasicMaterial();
      const remove = (): void => {
        if (body) physics.remove(body);
        mesh?.geometry.dispose();
        body = null;
        mesh = null;
      };
      const add = (solid: PlanSolid): void => {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(solid.w, solid.h, solid.d), material);
        mesh.position.set(solid.x, solid.y, solid.z);
        mesh.updateMatrixWorld(true);
        body = physics.addStatic(mesh);
      };
      const ray = new physics.rapier.Ray(
        { x: TILE / 2, y: 1.2, z: TILE / 2 },
        { x: dirX(dir), y: 0, z: dirZ(dir) },
      );
      for (let cycle = 0; cycle < 3; cycle++) {
        changeSlidingDoor(plan, null, { x: 0, z: 0, dir }, false, remove, add);
        physics.syncColliders();
        physics.step(1 / 60);
        expect(physics.world.castRay(ray, TILE, true)).not.toBeNull();
        changeSlidingDoor(plan, null, { x: 0, z: 0, dir }, true, remove, add);
        physics.syncColliders();
        physics.step(1 / 60);
        expect(physics.world.castRay(ray, TILE, true)).toBeNull();
      }
      remove();
      material.dispose();
      physics.dispose();
    },
  );
});
