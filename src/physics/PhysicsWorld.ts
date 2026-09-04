import * as THREE from 'three';
import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';

export type RapierModule = typeof import('@dimforge/rapier3d-compat');

/** Collision membership bits. */
export const GROUP_WORLD = 1 << 0;
export const GROUP_PROP = 1 << 2;
export const GROUP_PLAYER = 1 << 3;
export const GROUP_HAND = 1 << 4;

/**
 * Every surface that can hold a portal gets a bit of its own. A portal only
 * opens up *its* wall, so standing in front of one no longer lets you sink
 * through the floor — that used to be one shared bit for all of them.
 */
const PORTAL_SURFACE_BASE = 5;
const PORTAL_SURFACE_SLOTS = 10;

/** Membership bit for the n-th portal surface. Wraps around when they run out. */
export function portalSurfaceGroup(index: number): number {
  return 1 << (PORTAL_SURFACE_BASE + (index % PORTAL_SURFACE_SLOTS));
}

export const ALL_GROUPS = 0xffff;

/** Rapier packs membership and filter into one 32 bit value. */
export function interactionGroups(membership: number, filter: number): number {
  return (((membership & 0xffff) << 16) | (filter & 0xffff)) >>> 0;
}

let modulePromise: Promise<RapierModule> | null = null;

/** Loads and initialises Rapier once (the wasm is inlined in the compat build). */
export function loadRapier(): Promise<RapierModule> {
  if (!modulePromise) {
    modulePromise = import('@dimforge/rapier3d-compat').then(async (module) => {
      await module.init();
      return module;
    });
  }
  return modulePromise;
}

/** Collider silhouette. `halfExtents` gives the size for all of them. */
export type ColliderShape =
  { kind: 'box' } | { kind: 'ball' } | { kind: 'cylinder' } | { kind: 'cone' };

export interface BodyOptions {
  /** Half extents; taken from the mesh geometry when omitted. */
  halfExtents?: THREE.Vector3;
  /** Collider silhouette, a box by default. */
  shape?: ColliderShape;
  mass?: number;
  friction?: number;
  restitution?: number;
  linearDamping?: number;
  angularDamping?: number;
  membership?: number;
  filter?: number;
  ccd?: boolean;
}

export interface PhysicsBody {
  object: THREE.Object3D;
  body: RigidBody;
  collider: Collider;
  /** Half size of the collider — the reach test grows this by a fixed margin. */
  halfExtents: THREE.Vector3;
  /** Silhouette of the collider, kept so it can be resized later. */
  shape: ColliderShape;
  /** Surface bits this body currently phases through (portal funnels). */
  phaseMask: number;
  /** Set while a hand holds the body — it then ignores the player capsule. */
  carried: boolean;
  /**
   * Set while the body is flying to a hand after a remote grab. It touches
   * nothing at all then, so the pull always arrives.
   */
  ghost: boolean;
  membership: number;
  filter: number;
  previousPosition: THREE.Vector3;
}

const FIXED_STEP = 1 / 60;
const MAX_STEPS = 4;

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Thin wrapper around a Rapier world: fixed time step, mesh syncing and the
 * collision-group bookkeeping the portals need.
 */
export class PhysicsWorld {
  readonly dynamicBodies: PhysicsBody[] = [];

  private accumulator = 0;

  private constructor(
    readonly rapier: RapierModule,
    readonly world: World,
  ) {}

  static async create(gravity = -9.81): Promise<PhysicsWorld> {
    const rapier = await loadRapier();
    const world = new rapier.World({ x: 0, y: gravity, z: 0 });
    return new PhysicsWorld(rapier, world);
  }

  /** Was die Welt nach unten zieht, in m/s² (negativ). */
  get gravityY(): number {
    return this.world.gravity.y;
  }

  /**
   * Stellt die Schwerkraft um — mitten im Betrieb, denn genau darum geht es:
   * ein Stapel Kisten, der eben noch stand, fällt bei Mondschwere anders
   * zusammen als bei Erdschwere, und das will man *sehen*, nicht neu laden.
   * Alles, was gerade schläft, wird geweckt: ein Rapier-Körper in Ruhe merkt
   * sonst nichts von der neuen Zahl.
   */
  setGravity(y: number): void {
    if (this.world.gravity.y === y) return;
    this.world.gravity = { x: 0, y, z: 0 };
    for (const entry of this.dynamicBodies) entry.body.wakeUp();
  }

  /** Reibung und Rückprall aller Objekte auf einen Schlag. */
  setMaterial(friction: number, restitution: number): void {
    for (const entry of this.dynamicBodies) {
      entry.collider.setFriction(friction);
      entry.collider.setRestitution(restitution);
    }
  }

  /**
   * Genau `count` feste Schritte, ohne Rücksicht auf die verstrichene Zeit —
   * das Einzelbild der Stoppuhr. Der Rest-Akku bleibt dabei, wo er ist: sonst
   * springt die Welt beim Weiterlaufen um den angesparten Bruchteil.
   */
  stepFixed(count = 1): void {
    for (let i = 0; i < count; i++) this.world.step();
  }

  /** Immovable collider matching the object's world transform. */
  addStatic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    return this.addBody(object, 'fixed', options);
  }

  /** Free-falling body; the object's transform is driven by the simulation. */
  addDynamic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    const entry = this.addBody(object, 'dynamic', options);
    this.dynamicBodies.push(entry);
    return entry;
  }

  /** Body that is moved by code but pushes dynamic bodies around (hands). */
  addKinematic(object: THREE.Object3D, options: BodyOptions = {}): PhysicsBody {
    return this.addBody(object, 'kinematic', options);
  }

  step(dt: number): void {
    this.accumulator = Math.min(this.accumulator + dt, FIXED_STEP * MAX_STEPS);
    while (this.accumulator >= FIXED_STEP) {
      this.world.step();
      this.accumulator -= FIXED_STEP;
    }
  }

  /** Copies simulated transforms back onto the meshes. */
  sync(): void {
    for (const entry of this.dynamicBodies) {
      const t = entry.body.translation();
      const r = entry.body.rotation();
      entry.object.position.set(t.x, t.y, t.z);
      entry.object.quaternion.set(r.x, r.y, r.z, r.w);
    }
  }

  /**
   * Lets a body fall through the surfaces named by `mask` — the walls the
   * portals it currently sits in front of are mounted on. 0 = solid again.
   */
  setPhasing(entry: PhysicsBody, mask: number): void {
    if (entry.phaseMask === mask) return;
    entry.phaseMask = mask;
    this.applyFilter(entry);
  }

  /**
   * A carried body stops interacting with the player, otherwise pulling a cube
   * towards yourself launches you across the room.
   */
  setCarried(entry: PhysicsBody, carried: boolean): void {
    if (entry.carried === carried) return;
    entry.carried = carried;
    this.applyFilter(entry);
  }

  /**
   * A ghost body passes through everything. The remote grab uses it: an object
   * reeled in on a fixed path must not be knocked off course by the crate it
   * happens to fly past.
   */
  setGhost(entry: PhysicsBody, ghost: boolean): void {
    if (entry.ghost === ghost) return;
    entry.ghost = ghost;
    this.applyFilter(entry);
  }

  private applyFilter(entry: PhysicsBody): void {
    if (entry.ghost) {
      entry.collider.setCollisionGroups(interactionGroups(entry.membership, 0));
      return;
    }
    let filter = entry.filter;
    filter &= ~entry.phaseMask;
    if (entry.carried) filter &= ~GROUP_PLAYER;
    entry.collider.setCollisionGroups(interactionGroups(entry.membership, filter));
  }

  /**
   * Grows or shrinks a collider to match a rescaled mesh. The transform tool
   * needs it: a cube that looks twice as big has to feel twice as big too.
   */
  resize(entry: PhysicsBody, halfExtents: THREE.Vector3): void {
    entry.halfExtents.set(
      Math.max(halfExtents.x, 0.01),
      Math.max(halfExtents.y, 0.01),
      Math.max(halfExtents.z, 0.01),
    );
    const { rapier } = this;
    const half = entry.halfExtents;
    switch (entry.shape.kind) {
      case 'ball':
        entry.collider.setShape(new rapier.Ball(Math.max(half.x, half.y, half.z)));
        break;
      case 'cylinder':
        entry.collider.setShape(new rapier.Cylinder(half.y, Math.max(half.x, half.z)));
        break;
      case 'cone':
        entry.collider.setShape(new rapier.Cone(half.y, Math.max(half.x, half.z)));
        break;
      case 'box':
        entry.collider.setShape(new rapier.Cuboid(half.x, half.y, half.z));
        break;
    }
  }

  remove(entry: PhysicsBody): void {
    const index = this.dynamicBodies.indexOf(entry);
    if (index >= 0) this.dynamicBodies.splice(index, 1);
    this.world.removeRigidBody(entry.body);
  }

  dispose(): void {
    this.dynamicBodies.length = 0;
    this.world.free();
  }

  private addBody(
    object: THREE.Object3D,
    kind: 'fixed' | 'dynamic' | 'kinematic',
    options: BodyOptions,
  ): PhysicsBody {
    const { rapier, world } = this;
    object.updateWorldMatrix(true, false);
    object.matrixWorld.decompose(_position, _quaternion, _scale);

    const half = options.halfExtents ?? halfExtentsOf(object, _scale);
    const membership = options.membership ?? GROUP_PROP;
    const filter = options.filter ?? ALL_GROUPS;

    const description =
      kind === 'fixed'
        ? rapier.RigidBodyDesc.fixed()
        : kind === 'dynamic'
          ? rapier.RigidBodyDesc.dynamic()
          : rapier.RigidBodyDesc.kinematicPositionBased();

    description
      .setTranslation(_position.x, _position.y, _position.z)
      .setRotation({ x: _quaternion.x, y: _quaternion.y, z: _quaternion.z, w: _quaternion.w });

    if (options.linearDamping !== undefined) description.setLinearDamping(options.linearDamping);
    if (options.angularDamping !== undefined) description.setAngularDamping(options.angularDamping);
    if (options.ccd) description.setCcdEnabled(true);

    const body = world.createRigidBody(description);

    const colliderDesc = colliderFor(rapier, options.shape ?? { kind: 'box' }, half)
      .setFriction(options.friction ?? 0.7)
      .setRestitution(options.restitution ?? 0.05)
      .setCollisionGroups(interactionGroups(membership, filter));
    if (options.mass !== undefined) colliderDesc.setMass(options.mass);

    const collider = world.createCollider(colliderDesc, body);

    return {
      object,
      body,
      collider,
      halfExtents: half.clone(),
      shape: options.shape ?? { kind: 'box' },
      phaseMask: 0,
      carried: false,
      ghost: false,
      membership,
      filter,
      previousPosition: _position.clone(),
    };
  }
}

function colliderFor(
  rapier: RapierModule,
  shape: ColliderShape,
  half: THREE.Vector3,
): import('@dimforge/rapier3d-compat').ColliderDesc {
  switch (shape.kind) {
    case 'ball':
      return rapier.ColliderDesc.ball(Math.max(half.x, half.y, half.z));
    case 'cylinder':
      return rapier.ColliderDesc.cylinder(half.y, Math.max(half.x, half.z));
    case 'cone':
      return rapier.ColliderDesc.cone(half.y, Math.max(half.x, half.z));
    case 'box':
      return rapier.ColliderDesc.cuboid(half.x, half.y, half.z);
  }
}

function halfExtentsOf(object: THREE.Object3D, scale: THREE.Vector3): THREE.Vector3 {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    _box.copy(mesh.geometry.boundingBox!);
    _box.getSize(_size);
    return new THREE.Vector3(
      Math.max((_size.x * Math.abs(scale.x)) / 2, 0.01),
      Math.max((_size.y * Math.abs(scale.y)) / 2, 0.01),
      Math.max((_size.z * Math.abs(scale.z)) / 2, 0.01),
    );
  }
  return new THREE.Vector3(0.1, 0.1, 0.1);
}
