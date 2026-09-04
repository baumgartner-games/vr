import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createCompanionCube, createPropShape } from '../portal/props';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';

/** Half size of the walled-in map. */
const HALF = 40;
/** Height of one storey. */
const STOREY = 3.1;
/** Thickness of a wall or a floor slab. */
const WALL = 0.32;
/** Doors and windows are cut this wide. */
const DOOR_W = 1.6;
const DOOR_H = 2.3;
/** Step size of the indoor stairs — the character controller steps 0.32. */
const STEP_RISE = 0.26;
const STEP_RUN = 0.3;

/** A hole in a floor slab: where the stairs come up. */
interface Hole {
  x: number;
  z: number;
  w: number;
  d: number;
}

interface BuildingOptions {
  /** Centre of the building. */
  x: number;
  z: number;
  /** Outer footprint. */
  w: number;
  d: number;
  floors: number;
  material: THREE.Material;
  /** Which side the ground floor door is on. */
  door?: 'north' | 'south' | 'east' | 'west';
  /** Skip the stairs: a shed does not need them. */
  stairs?: boolean;
  /** Leave the roof open — a flat roof with a parapet is the default. */
  parapet?: boolean;
}

/**
 * Dust — a big outdoor map in the spirit of the Counter-Strike one: two open
 * squares connected by lanes and a tunnel, a four-storey block you can walk up
 * inside, a couple of smaller houses and a lot of crates to knock over.
 *
 * Everything the portal lab can do works here as well: the same tool belt, the
 * same shelf, the same physics and the same shared session — this world only
 * replaces the room. Portals stick to the light panels and to the ground;
 * plaster and stone stay solid, otherwise a portal in a wall of a hundred
 * pieces would open up half the map.
 */
export class DustWorld extends PortalWorld {
  private readonly sand = new THREE.MeshStandardMaterial({ color: 0xd8bd8b, roughness: 0.95 });
  private readonly plaster = new THREE.MeshStandardMaterial({ color: 0xe0cba6, roughness: 0.85 });
  private readonly stone = new THREE.MeshStandardMaterial({ color: 0xbda87f, roughness: 0.9 });
  private readonly shade = new THREE.MeshStandardMaterial({ color: 0x9c8a67, roughness: 0.9 });
  private readonly wood = new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.8 });
  /** The bright panels: these are the surfaces a portal sticks to. */
  private readonly panel = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    roughness: 0.6,
    metalness: 0.05,
  });

  protected override spawnPoint(): THREE.Vector3 {
    // In the open at the south end, a few metres clear of the spawn house.
    return new THREE.Vector3(-6, 0, 33);
  }

  protected override skyColor(): number {
    return 0xbcd3ec;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Dust · Werkzeuge am Gürtel · Portale haften an den hellen Tafeln';
  }

  protected override buildEnvironment(): void {
    const town = new THREE.Group();
    town.name = 'dust';
    this.root.add(town);
    this.root.add(createSky(0x6ea8e8, 0xf3e2bb));

    this.buildGround(town);
    this.buildPerimeter(town);
    this.buildTown(town);
    this.buildProps();
  }

  /** Crates and barrels — the things that are actually meant to be moved. */
  protected override buildProps(): void {
    const physics = this.physics!;
    let index = 0;

    const crate = (x: number, y: number, z: number, size: number, yaw = 0): void => {
      const mesh = createCompanionCube(size);
      mesh.position.set(x, y, z);
      mesh.rotation.y = yaw;
      this.root.add(mesh);
      this.registerProp(
        physics.addDynamic(mesh, { mass: size * 18, friction: 0.85, restitution: 0.05 }),
        `dust-crate-${index++}`,
      );
    };

    // Site A: a stack you can climb, and one that falls over if you shove it.
    for (const [x, z] of [
      [-19, -21],
      [-17.4, -21],
      [-19, -19.4],
    ] as const) {
      crate(x, 0.3, z, 0.6);
    }
    crate(-18.2, 0.9, -20.2, 0.6, 0.4);
    crate(-21.5, 0.25, -18, 0.5, 0.9);

    // Site B, on the other side of the map.
    for (let i = 0; i < 5; i++) {
      crate(
        19 + (i % 2) * 1.5,
        0.3 + Math.floor(i / 2) * 0.62,
        -20 + Math.floor(i / 2) * 0.4,
        0.6,
        i * 0.3,
      );
    }

    // Barrels along the middle lane.
    for (const [x, z] of [
      [1.6, 4],
      [2.4, 6.2],
      [-2.2, 8.5],
    ] as const) {
      const blueprint = createPropShape('cylinder');
      blueprint.mesh.position.set(x, 0.2, z);
      blueprint.mesh.scale.set(1.6, 1.6, 1.6);
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents.clone().multiplyScalar(1.6),
          mass: 9,
          friction: 0.7,
          restitution: 0.1,
        }),
        `dust-barrel-${index++}`,
      );
    }

    // Planks leaning around the yard, good for building something with.
    for (const [x, z, yaw] of [
      [-6, -6, 0.4],
      [-6.9, -6.6, 1.1],
      [8, -4, -0.6],
    ] as const) {
      const blueprint = createPropShape('plank');
      blueprint.mesh.position.set(x, 0.1, z);
      blueprint.mesh.rotation.y = yaw;
      this.root.add(blueprint.mesh);
      this.registerProp(
        physics.addDynamic(blueprint.mesh, {
          shape: blueprint.shape,
          halfExtents: blueprint.halfExtents,
          mass: 3,
          friction: 0.7,
          restitution: 0.05,
        }),
        `dust-plank-${index++}`,
      );
    }
  }

  // --- the map ------------------------------------------------------------

  private buildGround(parent: THREE.Object3D): void {
    // One slab for the whole desert: a portal in the ground opens up the
    // ground, and nothing else.
    this.slab(parent, this.sand, [HALF * 2, WALL, HALF * 2], [0, -WALL / 2, 0], true);

    // A few sunken lanes, drawn with darker strips — cosmetic, but they are
    // what makes the two sites read as connected.
    for (const [x, z, w, d, angle] of [
      [0, 6, 7, 40, 0],
      [-14, -6, 30, 6, -0.25],
      [16, -6, 26, 6, 0.2],
    ] as const) {
      const lane = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), this.shade);
      lane.position.set(x, 0.011, z);
      lane.rotation.y = angle;
      parent.add(lane);
    }
  }

  /** The cliffs around the map: high, and no portals on them. */
  private buildPerimeter(parent: THREE.Object3D): void {
    const height = 14;
    for (const [x, z, w, d] of [
      [0, -HALF, HALF * 2, WALL * 3],
      [0, HALF, HALF * 2, WALL * 3],
      [-HALF, 0, WALL * 3, HALF * 2],
      [HALF, 0, WALL * 3, HALF * 2],
    ] as const) {
      this.slab(parent, this.stone, [w, height, d], [x, height / 2, z], false);
    }
  }

  private buildTown(parent: THREE.Object3D): void {
    // The four-storey block: the tall thing you can see from everywhere, with
    // stairs all the way up to a flat roof.
    this.building(parent, {
      x: -20,
      z: -8,
      w: 13,
      d: 11,
      floors: 4,
      material: this.plaster,
      door: 'east',
    });

    // Two smaller houses at site A. The flat one has no parapet: the ramp
    // outside leads straight onto its roof.
    this.building(parent, {
      x: -30,
      z: -24,
      w: 8,
      d: 8,
      floors: 2,
      material: this.stone,
      door: 'east',
    });
    this.building(parent, {
      x: -8,
      z: -28,
      w: 9,
      d: 7,
      floors: 1,
      material: this.plaster,
      door: 'south',
      stairs: false,
      parapet: false,
    });

    // Site B: a three-storey and a shed, again with a way onto the roof.
    this.building(parent, {
      x: 22,
      z: -10,
      w: 11,
      d: 10,
      floors: 3,
      material: this.plaster,
      door: 'west',
    });
    this.building(parent, {
      x: 30,
      z: -26,
      w: 7,
      d: 6,
      floors: 1,
      material: this.wood,
      door: 'west',
      stairs: false,
      parapet: false,
    });

    // Two more small ones, so the flanks are not empty sand.
    this.building(parent, {
      x: -33,
      z: 6,
      w: 7,
      d: 6,
      floors: 1,
      material: this.wood,
      door: 'east',
      stairs: false,
      parapet: false,
    });
    this.building(parent, {
      x: 30,
      z: 8,
      w: 8,
      d: 7,
      floors: 2,
      material: this.stone,
      door: 'west',
    });

    // The house at the spawn end, two storeys with a balcony over the lane.
    this.building(parent, {
      x: 6,
      z: 24,
      w: 10,
      d: 9,
      floors: 2,
      material: this.stone,
      door: 'north',
    });
    this.slab(parent, this.stone, [6, 0.3, 2.4], [6, STOREY, 18.6], false);
    this.slab(parent, this.stone, [6, 0.9, 0.3], [6, STOREY + 0.6, 17.5], false);

    // Low walls: they are what turns the open sand into lanes.
    for (const [x, z, w, d, h] of [
      [-10, 5, 0.5, 15, 2.2],
      [10, 5, 0.5, 15, 2.2],
      [-24, -16, 11, 0.5, 2.2],
      [24, -17, 11, 0.5, 2.2],
      [-16, -27, 0.5, 10, 2.2],
      [16, -30, 0.5, 9, 2.2],
      [0, 14, 13, 0.5, 1.4],
      [-20, 16, 9, 0.5, 1.4],
      [20, 18, 9, 0.5, 1.4],
    ] as const) {
      this.slab(parent, this.stone, [w, h, d], [x, h / 2, z], false);
    }

    // Two crate platforms to fight over, each with its own way up.
    for (const side of [-1, 1] as const) {
      this.slab(parent, this.shade, [5, 1.2, 5], [side * 13, 0.6, -24], false);
      this.ramp(parent, side * 13, -20.6, 3, 1.3, 0);
    }

    // Arches over the middle lane.
    for (const z of [0, -18]) {
      for (const side of [-1, 1] as const) {
        this.slab(parent, this.stone, [0.6, 4, 0.6], [side * 2.6, 2, z], false);
      }
      this.slab(parent, this.stone, [6, 0.6, 0.6], [0, 4.3, z], false);
    }

    // Tunnel between the two sites: two walls and a roof.
    this.slab(parent, this.stone, [0.4, 4, 16], [-4.4, 2, -14], false);
    this.slab(parent, this.stone, [0.4, 4, 16], [-1.4, 2, -14], false);
    this.slab(parent, this.stone, [3.4, 0.4, 16], [-2.9, 4.2, -14], false);

    // Ramps up to the low roofs, so the map is climbable without a portal.
    // They stop next to the doors, not in front of them.
    this.ramp(parent, -5, -19, 3, 3.5, 0);
    this.ramp(parent, 30, -18, 4, 3.5, 0);

    // The portal panels: the surfaces a portal actually sticks to. Bright, so
    // it is obvious where a portal will hold.
    // Two hang high on the walls of the big blocks (below them are the doors),
    // four stand free in the sand like billboards.
    for (const [x, y, z, w, h, ry] of [
      [-13.2, 5, -8, 8, 4.4, Math.PI / 2],
      [16.4, 5, -10, 7, 4.4, -Math.PI / 2],
      [4, 2.6, -25, 9, 4.8, 0],
      [-6, 2.6, 20, 9, 4.8, Math.PI],
      [-30, 3, -12, 8, 5, 0],
      [30, 3, -18, 8, 5, 0],
    ] as const) {
      const board = this.slab(parent, this.panel, [w, h, 0.3], [x, y, z], true, false);
      board.rotation.y = ry;
      board.updateMatrixWorld(true);
      this.physics!.addStatic(board, {
        membership: this.surfaceGroups.get(board) ?? 0,
        filter: 0xffff,
      });
    }

    const sign = new TextPlane({
      width: 5,
      height: 1.3,
      title: 'Dust',
      body: 'Zwei Plätze, ein Tunnel, vier Stockwerke. Portale haften an den hellen Tafeln.',
      accent: 0xffc857,
    });
    sign.position.set(-6, 3, 26);
    parent.add(sign);
  }

  /**
   * One house: outer walls with a door and windows per storey, a floor slab
   * with a stairwell in it, stairs up to it, and a flat roof with a parapet.
   */
  private building(parent: THREE.Object3D, options: BuildingOptions): void {
    const { x, z, w, d, floors, material } = options;
    const door = options.door ?? 'south';
    const stairs = options.stairs ?? true;
    // The stairwell sits in one corner and every floor above leaves it open.
    const hole: Hole = { x: x - w / 2 + 2.1, z: z + d / 2 - 2.6, w: 2.6, d: 4.2 };

    for (let level = 0; level < floors; level++) {
      const base = level * STOREY;

      // Ground level stands on the desert; everything above gets a slab.
      if (level > 0) {
        this.floorWithHole(parent, material, x, z, w, d, base, stairs ? hole : null);
      }

      for (const side of ['north', 'south', 'east', 'west'] as const) {
        // The door is only on the ground floor; above it the same gap is a
        // window, which is what makes the building readable from outside.
        const opening = level === 0 && side === door ? 'door' : level === 0 ? 'none' : 'window';
        this.wall(parent, material, side, x, z, w, d, base, opening);
      }

      if (stairs && level < floors - 1) this.stairs(parent, material, hole, base);
    }

    const roof = floors * STOREY;
    this.floorWithHole(parent, material, x, z, w, d, roof, stairs ? hole : null);
    if (options.parapet !== false) {
      for (const side of ['north', 'south', 'east', 'west'] as const) {
        this.wall(parent, material, side, x, z, w, d, roof, 'parapet');
      }
    }
  }

  /** One outer wall, cut open for a door, a window, or not at all. */
  private wall(
    parent: THREE.Object3D,
    material: THREE.Material,
    side: 'north' | 'south' | 'east' | 'west',
    x: number,
    z: number,
    w: number,
    d: number,
    base: number,
    opening: 'door' | 'window' | 'none' | 'parapet',
  ): void {
    const along = side === 'north' || side === 'south' ? w : d;
    const centre: [number, number] =
      side === 'north'
        ? [x, z - d / 2]
        : side === 'south'
          ? [x, z + d / 2]
          : side === 'west'
            ? [x - w / 2, z]
            : [x + w / 2, z];
    const horizontal = side === 'north' || side === 'south';

    const piece = (offset: number, length: number, bottom: number, height: number): void => {
      if (length <= 0.05 || height <= 0.05) return;
      const size: [number, number, number] = horizontal
        ? [length, height, WALL]
        : [WALL, height, length];
      const position: [number, number, number] = horizontal
        ? [centre[0] + offset, bottom + height / 2, centre[1]]
        : [centre[0], bottom + height / 2, centre[1] + offset];
      this.slab(parent, material, size, position, false);
    };

    if (opening === 'parapet') {
      piece(0, along, base + WALL / 2, 0.9);
      return;
    }
    if (opening === 'none') {
      piece(0, along, base, STOREY);
      return;
    }

    // Left and right of the gap, plus the lintel above it.
    const gapBottom = opening === 'door' ? base : base + 1;
    const gapHeight = opening === 'door' ? DOOR_H : 1.2;
    const flank = (along - DOOR_W) / 2;
    piece(-(DOOR_W + flank) / 2, flank, base, STOREY);
    piece((DOOR_W + flank) / 2, flank, base, STOREY);
    piece(0, DOOR_W, base, gapBottom - base);
    piece(0, DOOR_W, gapBottom + gapHeight, base + STOREY - (gapBottom + gapHeight));
  }

  /** A floor slab, in up to four pieces so the stairwell stays open. */
  private floorWithHole(
    parent: THREE.Object3D,
    material: THREE.Material,
    x: number,
    z: number,
    w: number,
    d: number,
    y: number,
    hole: Hole | null,
  ): void {
    if (!hole) {
      this.slab(parent, material, [w, WALL, d], [x, y + WALL / 2, z], false);
      return;
    }

    const left = hole.x - hole.w / 2 - (x - w / 2);
    const right = x + w / 2 - (hole.x + hole.w / 2);
    const front = hole.z - hole.d / 2 - (z - d / 2);
    const back = z + d / 2 - (hole.z + hole.d / 2);
    const piece = (px: number, pz: number, pw: number, pd: number): void => {
      if (pw <= 0.05 || pd <= 0.05) return;
      this.slab(parent, material, [pw, WALL, pd], [px, y + WALL / 2, pz], false);
    };

    piece(x - w / 2 + left / 2, z, left, d);
    piece(x + w / 2 - right / 2, z, right, d);
    piece(hole.x, z - d / 2 + front / 2, hole.w, front);
    piece(hole.x, z + d / 2 - back / 2, hole.w, back);
  }

  /** A straight flight of steps up through the stairwell. */
  private stairs(parent: THREE.Object3D, material: THREE.Material, hole: Hole, base: number): void {
    // One step more than the storey is high: the last one lands level with the
    // floor above instead of leaving a step the character controller may or
    // may not take.
    const count = Math.ceil(STOREY / STEP_RISE) + 1;
    const start = hole.z + hole.d / 2 - STEP_RUN / 2;
    for (let i = 0; i < count; i++) {
      const height = (i + 1) * STEP_RISE;
      this.slab(
        parent,
        material,
        [hole.w - 0.2, height, STEP_RUN],
        [hole.x, base + height / 2, start - i * STEP_RUN],
        false,
      );
    }
  }

  /** An outdoor ramp: a run of low steps, walkable without a jump. */
  private ramp(
    parent: THREE.Object3D,
    x: number,
    z: number,
    width: number,
    height: number,
    yaw: number,
  ): void {
    const count = Math.ceil(height / STEP_RISE);
    const run = 0.42;
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = yaw;
    parent.add(group);
    for (let i = 0; i < count; i++) {
      const stepHeight = (i + 1) * STEP_RISE;
      this.slab(group, this.stone, [width, stepHeight, run], [0, stepHeight / 2, -i * run], false);
    }
  }
}
