import * as THREE from 'three';
import type { Collider, RigidBody, World } from '@dimforge/rapier3d-compat';

export type RapierModule = typeof import('@dimforge/rapier3d-compat');

/** Collision membership bits. */
export const GROUP_WORLD = 1 << 0;
/** Surfaces that can hold a portal — anything phasing through a portal ignores these. */
export const GROUP_PORTAL_SURFACE = 1 << 1;
export const GROUP_PROP = 1 << 2;
export const GROUP_PLAYER = 1 << 3;
export const GROUP_HAND = 1 << 4;

export const ALL_GROUPS = 0xffff;

/** Rapier packs membership and filter into one 32 bit value. */
export function interactionGroups(membership: number, filter: number): number {
  return ((membership & 0xffff) << 16) | (filter & 0xffff);
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

export interface BodyOptions {
  /** Half extents; taken from the mesh geometry when omitted. */
  halfExtents?: THREE.Vector3;
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
  /** Set while the body is inside a portal funnel and may pass through walls. */
  phasing: boolean;
  /** Set while a hand holds the body — it then ignores the player capsule. */
  carried: boolean;
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

  /** Lets a body fall through portal surfaces (or stops it from doing so). */
  setPhasing(entry: PhysicsBody, phasing: boolean): void {
    if (entry.phasing === phasing) return;
    entry.phasing = phasing;
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

  private applyFilter(entry: PhysicsBody): void {
    let filter = entry.filter;
    if (entry.phasing) filter &= ~GROUP_PORTAL_SURFACE;
    if (entry.carried) filter &= ~GROUP_PLAYER;
    entry.collider.setCollisionGroups(interactionGroups(entry.membership, filter));
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

    const colliderDesc = rapier.ColliderDesc.cuboid(half.x, half.y, half.z)
      .setFriction(options.friction ?? 0.7)
      .setRestitution(options.restitution ?? 0.05)
      .setCollisionGroups(interactionGroups(membership, filter));
    if (options.mass !== undefined) colliderDesc.setMass(options.mass);

    const collider = world.createCollider(colliderDesc, body);

    return {
      object,
      body,
      collider,
      phasing: false,
      carried: false,
      membership,
      filter,
      previousPosition: _position.clone(),
    };
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
