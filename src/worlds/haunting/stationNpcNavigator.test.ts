import * as THREE from 'three';
import { ALL_GROUPS, GROUP_WORLD, PhysicsWorld } from '../../physics/PhysicsWorld';
import { Npc } from '../npc/Npc';
import { TILE, tileKey } from '../nav/navTile';
import { generateHouse } from './house';
import { housePlan } from './plan';
import { safeRoomSpawn, stationLayout } from './stationLayout';
import { StationNpcNavigator } from './stationNpcNavigator';
import { COMMAND_HOME } from './trainingLayout';

const DT = 1 / 60;

async function stage(seed = 2) {
  const physics = await PhysicsWorld.create(-9.81);
  const spec = generateHouse(seed, 8);
  const plan = housePlan(spec);
  const meshes: THREE.Mesh[] = [];
  const addBox = (x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d));
    mesh.position.set(x, y, z);
    mesh.updateWorldMatrix(true, false);
    meshes.push(mesh);
    return physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
  };
  for (const s of plan.solids()) addBox(s.x, s.y, s.z, s.w, s.h, s.d);
  for (const p of stationLayout(spec))
    addBox(
      p.x,
      p.height / 2,
      p.z,
      p.bounds.maxX - p.bounds.minX,
      p.height,
      p.bounds.maxZ - p.bounds.minZ,
    );
  const spawn = safeRoomSpawn(spec, spec.entryRoom);
  const npc = new Npc({
    physics,
    kind: 'zombie',
    brain: 'chase',
    speed: 1.8,
    at: new THREE.Vector3(spawn.x, 0, spawn.z),
  });
  let elapsed = 0;
  const feet = new THREE.Vector3();
  const run = (target: { x: number; z: number }, seconds: number) => {
    for (let frame = 0; frame < seconds / DT; frame++) {
      elapsed += DT;
      npc.update(DT, target, () => 0.5, {
        graph: plan.graph,
        at: { ...target, y: 0 },
        now: elapsed,
      });
      physics.step(DT);
      npc.feet(feet);
      if (Math.hypot(feet.x - target.x, feet.z - target.z) <= 1.15) break;
    }
    return npc.feet(feet).clone();
  };
  const navigate = () => {
    const navigator = new StationNpcNavigator(
      () => spec,
      () => plan.graph,
    );
    npc.setNavigator((input) => navigator.step(input));
  };
  const dispose = () => {
    npc.dispose();
    physics.dispose();
    for (const mesh of meshes) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  };
  return { spec, plan, physics, npc, spawn, run, navigate, addBox, dispose };
}

test('the actual Rapier monster crosses fitted rooms and door frames to a distant patrol goal', async () => {
  const world = await stage();
  try {
    const goal = safeRoomSpawn(world.spec, 'r0');
    expect(Math.hypot(goal.x - world.spawn.x, goal.z - world.spawn.z)).toBeGreaterThan(22);
    // Without the opt-in, the shared chase brain retains its old22m sense limit.
    const ordinary = world.run(goal, 0.5);
    expect(Math.hypot(ordinary.x - world.spawn.x, ordinary.z - world.spawn.z)).toBeLessThan(0.02);
    world.navigate();
    const arrived = world.run(goal, 90);
    expect(Math.hypot(arrived.x - goal.x, arrived.z - goal.z)).toBeLessThanOrEqual(1.16);
    expect(arrived.y).toBeGreaterThan(-0.03);
    const returned = world.run(world.spawn, 90);
    expect(Math.hypot(returned.x - world.spawn.x, returned.z - world.spawn.z)).toBeLessThanOrEqual(
      1.16,
    );
  } finally {
    world.dispose();
  }
}, 60000);

test('a navigator returning null stops the body instead of falling back to a direct chase', async () => {
  const world = await stage();
  try {
    world.npc.setNavigator(() => null);
    const at = world.run({ x: world.spawn.x + 3, z: world.spawn.z }, 2);
    expect(Math.hypot(at.x - world.spawn.x, at.z - world.spawn.z)).toBeLessThan(0.02);
  } finally {
    world.dispose();
  }
}, 60000);

test('the actual body waits at a closed door and continues after that door opens', async () => {
  const world = await stage();
  try {
    const door = world.spec.doors.find((d) => d.id === world.spec.frontDoor)!;
    world.plan.door(door.x, door.z, door.dir, 0, false);
    const id = world.plan.graph.wall(tileKey(door.x, door.z, 0), door.dir)!.id;
    const leaf = world.plan.solids().find((s) => s.door === id)!;
    const entry = world.addBox(leaf.x, leaf.y, leaf.z, leaf.w, leaf.h, leaf.d);
    world.navigate();
    const before = world.run(COMMAND_HOME, 14);
    expect(before.z).toBeLessThan((door.z + 1) * TILE);
    expect(Math.hypot(before.x - COMMAND_HOME.x, before.z - COMMAND_HOME.z)).toBeGreaterThan(2);
    world.plan.door(door.x, door.z, door.dir, 0, true);
    world.physics.remove(entry);
    const after = world.run(COMMAND_HOME, 35);
    expect(Math.hypot(after.x - COMMAND_HOME.x, after.z - COMMAND_HOME.z)).toBeLessThanOrEqual(
      1.16,
    );
  } finally {
    world.dispose();
  }
}, 60000);

test('reactor patrol reaches cafeteria through the upper engine corner', async () => {
  const world = await stage();
  try {
    const start = safeRoomSpawn(world.spec, world.spec.rooms[2]!.id);
    world.npc.entry.body.setTranslation({ x: start.x, y: 0.95, z: start.z }, true);
    world.navigate();
    const goal = safeRoomSpawn(world.spec, world.spec.rooms[0]!.id);
    const arrived = world.run(goal, 140);
    expect(Math.hypot(arrived.x - goal.x, arrived.z - goal.z)).toBeLessThan(1.2);
  } finally {
    world.dispose();
  }
});
