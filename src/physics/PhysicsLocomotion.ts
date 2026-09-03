import * as THREE from 'three';
import type { Collider, KinematicCharacterController, RigidBody } from '@dimforge/rapier3d-compat';
import type { Locomotion } from '../core/Locomotion';
import type { PlayerRig } from '../core/PlayerRig';
import { ALL_GROUPS, GROUP_PLAYER, interactionGroups, type PhysicsWorld } from './PhysicsWorld';

/**
 * Everything the player capsule may bump into. Other players are deliberately
 * missing: bodies that block each other in a shared room are only ever in the
 * way — you cannot see your own, so you cannot avoid theirs either.
 */
const PLAYER_FILTER = ALL_GROUPS & ~GROUP_PLAYER;

const RADIUS = 0.24;
const TERMINAL_VELOCITY = 32;

const _head = new THREE.Vector3();
const _drift = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _applied = new THREE.Vector3();
const _rotation = new THREE.Quaternion();
const _matrix = new THREE.Matrix4();

/**
 * Walking, falling and jumping with a Rapier kinematic capsule.
 *
 * The capsule tracks the head: stepping around the room moves the capsule, and
 * whatever the capsule is *not* allowed to do (walls, ledges) is pushed back
 * onto the rig, so the player never ends up inside geometry.
 */
export class PhysicsLocomotion implements Locomotion {
  readonly velocity = new THREE.Vector3();
  grounded = false;
  jumpSpeed = 4.4;
  /** How quickly the player can steer while airborne. */
  airControl = 2.2;

  /**
   * Surface bits the capsule currently ignores. Only the wall a portal is
   * mounted on is opened up — the floor you stand on stays solid.
   */
  phaseMask = 0;

  /**
   * While this is set the capsule flies: the vector *is* the velocity, gravity
   * is off and the stick has nothing to say. Walls still stop it — flying
   * through the room is the point, flying through its walls is not.
   */
  private flight: THREE.Vector3 | null = null;

  private readonly controller: KinematicCharacterController;
  private readonly body: RigidBody;
  private readonly collider: Collider;
  private readonly lastHead = new THREE.Vector3();
  private hasLastHead = false;
  private halfHeight = 0.6;
  private disposed = false;

  constructor(
    private readonly physics: PhysicsWorld,
    rig: PlayerRig,
  ) {
    const { rapier, world } = physics;

    this.controller = world.createCharacterController(0.02);
    this.controller.enableAutostep(0.32, 0.18, true);
    this.controller.enableSnapToGround(0.28);
    this.controller.setApplyImpulsesToDynamicBodies(true);
    this.controller.setCharacterMass(72);
    this.controller.setMaxSlopeClimbAngle(THREE.MathUtils.degToRad(52));
    this.controller.setMinSlopeSlideAngle(THREE.MathUtils.degToRad(40));

    this.body = world.createRigidBody(rapier.RigidBodyDesc.kinematicPositionBased());
    this.collider = world.createCollider(
      rapier.ColliderDesc.capsule(this.halfHeight, RADIUS).setCollisionGroups(
        interactionGroups(GROUP_PLAYER, PLAYER_FILTER),
      ),
      this.body,
    );

    this.syncCapsuleToRig(rig, true);
  }

  /** Capsule centre in world space. */
  getPosition(target: THREE.Vector3): THREE.Vector3 {
    const t = this.body.translation();
    return target.set(t.x, t.y, t.z);
  }

  /** Takes off, or hands the body back to gravity. */
  setFlight(velocity: THREE.Vector3 | null): void {
    if (!velocity) {
      if (this.flight) this.velocity.copy(this.flight);
      this.flight = null;
      return;
    }
    if (!this.flight) this.flight = new THREE.Vector3();
    this.flight.copy(velocity);
  }

  apply(rig: PlayerRig, velocity: THREE.Vector3, jump: boolean, dt: number): void {
    if (dt <= 0 || this.disposed) return;
    this.updateShape(rig);

    rig.getHeadPosition(_head);
    if (!this.hasLastHead) {
      this.lastHead.copy(_head);
      this.hasLastHead = true;
    }

    // Movement the player made physically (room scale) since the last frame.
    _drift.set(_head.x - this.lastHead.x, 0, _head.z - this.lastHead.z);

    if (this.flight) {
      // Flying: the glove owns the whole velocity, gravity does not get a say.
      this.velocity.copy(this.flight);
      this.grounded = false;
    } else if (this.grounded) {
      this.velocity.x = velocity.x;
      this.velocity.z = velocity.z;
      this.velocity.y = jump ? this.jumpSpeed : Math.min(this.velocity.y, 0);
      if (jump) this.grounded = false;
    } else {
      const blend = Math.min(1, this.airControl * dt);
      if (velocity.lengthSq() > 0) {
        this.velocity.x += (velocity.x - this.velocity.x) * blend;
        this.velocity.z += (velocity.z - this.velocity.z) * blend;
      }
    }
    if (!this.flight) {
      this.velocity.y -= 9.81 * dt;
      if (this.velocity.y < -TERMINAL_VELOCITY) this.velocity.y = -TERMINAL_VELOCITY;
    }

    _desired.copy(this.velocity).multiplyScalar(dt).add(_drift);

    this.controller.computeColliderMovement(
      this.collider,
      _desired,
      undefined,
      interactionGroups(GROUP_PLAYER, PLAYER_FILTER & ~this.phaseMask),
    );
    const movement = this.controller.computedMovement();
    _applied.set(movement.x, movement.y, movement.z);
    this.grounded = this.controller.computedGrounded();

    const t = this.body.translation();
    this.body.setNextKinematicTranslation({
      x: t.x + _applied.x,
      y: t.y + _applied.y,
      z: t.z + _applied.z,
    });
    // Kinematic bodies only move on the next step; keep our own view in sync.
    this.body.setTranslation(
      { x: t.x + _applied.x, y: t.y + _applied.y, z: t.z + _applied.z },
      true,
    );

    if (this.grounded && !this.flight && this.velocity.y < 0) this.velocity.y = 0;
    // Actually blocked by something: drop that part of the momentum. The
    // threshold has to stay generous, otherwise a portal fling dies instantly.
    if (blocked(_applied.x, _desired.x)) this.velocity.x *= 0.3;
    if (blocked(_applied.z, _desired.z)) this.velocity.z *= 0.3;

    // Move the rig so the head ends up above the capsule again.
    rig.position.x += _applied.x - _drift.x;
    rig.position.z += _applied.z - _drift.z;
    rig.position.y += _applied.y;
    rig.updateMatrixWorld(true);

    rig.getHeadPosition(this.lastHead);
  }

  teleport(rig: PlayerRig, transform: THREE.Matrix4): void {
    _rotation.setFromRotationMatrix(_matrix.extractRotation(transform));
    this.velocity.applyQuaternion(_rotation);
    // Portals only sit on vertical or horizontal surfaces here, so the level
    // stays level — but a tilted exit should not fling the player sideways.
    this.syncCapsuleToRig(rig, true);
    this.hasLastHead = false;
    this.grounded = false;
  }

  /** The rig was moved from the outside — put the capsule back under the head. */
  resync(rig: PlayerRig): void {
    this.velocity.set(0, 0, 0);
    this.flight = null;
    this.syncCapsuleToRig(rig, true);
    this.grounded = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.physics.world.removeCharacterController(this.controller);
    this.physics.world.removeRigidBody(this.body);
  }

  /** Places the capsule under the current head position. */
  syncCapsuleToRig(rig: PlayerRig, immediate = false): void {
    const height = rig.getHeadHeight();
    rig.getHeadPosition(_head);
    // A crouching rig hangs below its own floor, so the feet come from the rig.
    const centre = { x: _head.x, y: rig.getFloorY() + height / 2, z: _head.z };
    this.body.setTranslation(centre, true);
    if (immediate) this.body.setNextKinematicTranslation(centre);
    this.lastHead.copy(_head);
    this.hasLastHead = true;
  }

  /**
   * Keeps the capsule as tall as the player is right now — standing, ducking,
   * or halfway between the two.
   *
   * A capsule is resized around its centre, so a shorter one would leave the
   * ground with its feet. Moving the centre by the same amount the half height
   * lost keeps the soles exactly where they were: crouching lowers the head,
   * not the feet.
   */
  private updateShape(rig: PlayerRig): void {
    const target = Math.max(0.06, rig.getHeadHeight() / 2 - RADIUS);
    const delta = target - this.halfHeight;
    if (Math.abs(delta) < 0.005) return;
    this.halfHeight = target;
    this.collider.setShape(new this.physics.rapier.Capsule(target, RADIUS));

    const t = this.body.translation();
    const centre = { x: t.x, y: t.y + delta, z: t.z };
    this.body.setTranslation(centre, true);
    this.body.setNextKinematicTranslation(centre);
  }
}

/** True when the solver ate most of the movement we asked for. */
function blocked(applied: number, desired: number): boolean {
  return Math.abs(desired) > 1e-3 && Math.abs(applied) < Math.abs(desired) * 0.5;
}
