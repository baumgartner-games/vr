import * as THREE from 'three';
import { aimRotation } from './aim';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { WorldContext } from '../../../core/types';
import type { MenuIcon } from '../../../ui/menu';
import type { PhysicsBody, PhysicsWorld } from '../../../physics/PhysicsWorld';
import type { PortalKey } from '../PortalSync';
import type { Attachment } from './attachments';

/** Where a ray met a wall, floor or ceiling. */
export interface SurfaceHit {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

/**
 * Everything a tool may ask of the room it is used in. Tools never reach into
 * the world directly — that way a tool can be built, tested and thrown away
 * without the world knowing what it does.
 */
export interface ToolHost {
  readonly ctx: WorldContext;
  /** Scene node the world's own objects hang on. */
  readonly root: THREE.Object3D;
  readonly physics: PhysicsWorld;
  /** Every prop currently in the room. */
  props(): readonly PhysicsBody[];
  notify(message: string): void;
  /** Places a portal along a ray, exactly as the belt guns do. */
  shootPortal(key: PortalKey, origin: THREE.Vector3, direction: THREE.Vector3): void;
  /** Nearest prop the ray enters. */
  aimAt(origin: THREE.Vector3, direction: THREE.Vector3, range?: number): PhysicsBody | null;
  /** Prop whose grab box contains this point. */
  propAt(point: THREE.Vector3): PhysicsBody | null;
  castSurface(origin: THREE.Vector3, direction: THREE.Vector3): SurfaceHit | null;
  /** 1 = normal speed, less = slow motion. */
  setTimeScale(scale: number): void;
  /** Fires a bullet the world keeps track of and cleans up again. */
  spawnBullet(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    options?: BulletOptions,
  ): void;
  /** Repaints a prop, for everybody in the session. */
  paintProp(entry: PhysicsBody, color: number): void;
  /** Marks a prop as picked out, so the world can leave its glow alone. */
  setSelection(entries: readonly PhysicsBody[]): void;
  /** Reels a prop in to a hand, exactly like the remote grab does. */
  pullProp(entry: PhysicsBody, hand: Handedness): void;
  /** Shoves a prop away along a direction. */
  pushProp(entry: PhysicsBody, direction: THREE.Vector3, strength: number): void;
  /** Deletes a prop, for everybody in the session. */
  removeProp(entry: PhysicsBody): void;
  /** Ties two props together; `hinge` leaves one axis free. */
  weld(link: WeldRequest): boolean;
  /** Cuts every joint this prop is part of. Returns how many were cut. */
  unweld(entry: PhysicsBody): number;
  /** Throws the player's body along a velocity — the grappling hook reels. */
  launchPlayer(velocity: THREE.Vector3): void;
  /**
   * Takes the player off the ground and drives them by this velocity, gravity
   * and stick alike switched off; `null` gives the body back to both. The
   * Superman glove flies on it.
   */
  setFlight(velocity: THREE.Vector3 | null): void;
  /**
   * Takes the view away from the body and puts it at a point in the world —
   * the drone flies with it. `null` gives the player their body back.
   */
  setViewOverride(position: THREE.Vector3 | null): void;
  /** What that hand is carrying — the adjustment tool works on the other one. */
  heldTool(hand: Handedness): Tool | null;
  /**
   * Leaves a held tool hanging in mid-air, out of the hand but still that
   * hand's. The hand can then be moved without it; `unparkTool` puts it back
   * with whatever hold pose it has by then.
   */
  parkTool(tool: Tool): boolean;
  unparkTool(tool: Tool): boolean;
}

/** How hard a round hits: the punch is its mass times its speed. */
export interface BulletOptions {
  /** Kilograms. Heavier rounds shove more and drop faster. */
  mass?: number;
  /** Tracer: glows and draws the line it flew, so a shot can be watched. */
  tracer?: boolean;
}

/** Two props, the points the joint sits between them, and what kind it is. */
export interface WeldRequest {
  a: PhysicsBody;
  b: PhysicsBody;
  /** World point on `a` the joint is anchored at. */
  pointA: THREE.Vector3;
  /** World point on `b`. */
  pointB: THREE.Vector3;
  /** A hinge instead of a rigid joint. */
  hinge: boolean;
  /** World axis the hinge turns around; ignored for rigid joints. */
  axis: THREE.Vector3;
}

/**
 * A piece of equipment that can sit on the belt and be taken into a hand.
 *
 * Most tools are held the whole time the grab button is down. A `sticky` tool
 * is taken once and stays — its grab button is then free for the tool itself,
 * and it goes back by holding it against a belt slot.
 */
export abstract class Tool extends THREE.Group {
  /** Stable id: used by the menu, the belt and the network. */
  abstract readonly toolId: string;
  abstract readonly label: string;
  /** How the tool shelf draws it. Subclasses set these in their constructor. */
  icon: MenuIcon = 'tools';
  accent = 0x9d7bff;
  hint = '';
  sticky = false;

  /**
   * Turn the tool out of the grip and onto the pointing ray while it is held.
   * On by default: everything that aims at something wants this, and a tool
   * that forgets it shoots about 30° over the target. Switch it off only for
   * something that is deliberately strapped to the hand.
   */
  alignToAim = true;
  /**
   * While this tool is held, that hand stops shoving props around. The welder
   * needs it: reaching into a stack to pick a joint point must not scatter it.
   */
  phaseHands = false;

  /** The hand currently holding this, or null while it is stowed. */
  heldBy: Handedness | null = null;

  /**
   * Hanging in the air while the adjustment tool measures a new hold pose.
   * Still owned by its hand, but the hand does not carry it around and does
   * not put it away — see `ToolHost.parkTool`.
   */
  parked = false;

  /**
   * Just came back from being parked while the grab button was not held. A
   * non-sticky tool is normally dropped the moment the grip goes up — which
   * would send a freshly adjusted tool straight to the belt. So the rule waits
   * until the hand has taken hold of it once more.
   */
  regrip = false;

  /** Pose inside the hand's grip space. */
  readonly holdPosition = new THREE.Vector3(0, -0.012, 0.03);

  /** Extra tilt on top of the aim, for tools that are not held like a pistol. */
  readonly holdRotation = new THREE.Quaternion();

  /**
   * The pose the tool was *built* with, before anything the player measured
   * was put on top of it. `createTool` fills these in, so "back to how it
   * came" stays possible without rebuilding the tool.
   */
  readonly factoryPosition = new THREE.Vector3();
  readonly factoryRotation = new THREE.Quaternion();

  /**
   * Things clipped onto this tool that carry a pose of their own — the sights
   * on the pistol. The adjustment tool can pick one out and move it, so it
   * asks every tool rather than knowing which ones have any.
   */
  attachments(): readonly Attachment[] {
    return [];
  }

  /** Forgets a measured hold pose and goes back to the built-in one. */
  resetHold(): void {
    this.holdPosition.copy(this.factoryPosition);
    this.holdRotation.copy(this.factoryRotation);
  }

  /** Taken into a hand. */
  onTake(_controller: ControllerState, _host: ToolHost): void {}

  /** Put back on the belt or into the shelf. */
  onStow(_host: ToolHost): void {}

  /** Trigger went down while the tool is held. */
  onTrigger(_controller: ControllerState, _host: ToolHost): void {}

  /** Trigger came back up. */
  onTriggerUp(_controller: ControllerState, _host: ToolHost): void {}

  /** Grab went down while a sticky tool is held — never for the others. */
  onGrab(_controller: ControllerState, _host: ToolHost): void {}

  /** The A/X button of the holding hand. */
  onPrimary(_controller: ControllerState, _host: ToolHost): void {}

  /**
   * Puts the tool into the hand: the offset from `holdPosition`, and a
   * rotation that runs its -Z along the pointing ray instead of along the
   * grip, with `holdRotation` on top.
   *
   * The world calls this every frame before `update`, so a tool never has to
   * think about it — and a new tool cannot forget it. Doing it every frame is
   * also what lets the adjustment tool change a pose while the tool is held.
   */
  applyHold(controller: ControllerState | null): void {
    // Stowed tools belong to the belt and parked ones to the room; both set
    // their own pose.
    if (!this.heldBy || this.parked) return;
    this.position.copy(this.holdPosition);
    if (!this.alignToAim || !controller || !controller.grip.visible) {
      // Hanging in the target ray already: that *is* the aim.
      this.quaternion.copy(this.holdRotation);
      return;
    }
    aimQuaternion(controller, this.quaternion);
    this.quaternion.multiply(this.holdRotation);
  }

  /** @param controller the hand holding it, or null while it is stowed. */
  update(_dt: number, _host: ToolHost, _controller: ControllerState | null): void {}

  /** Frees geometries and materials this tool built. */
  disposeTool(): void {}
}

/**
 * The rotation that turns something parented to a hand out of the grip and
 * onto the pointing ray. Identity when the runtime gives no separate grip —
 * then the tool already hangs in the ray.
 */
export function aimQuaternion(
  controller: ControllerState | null,
  target: THREE.Quaternion,
): THREE.Quaternion {
  if (!controller || !controller.grip.visible) return target.identity();
  // `aimRotation` writes into whatever it is given; a Quaternion is one.
  aimRotation(controller.grip.quaternion, controller.targetRay.quaternion, target);
  return target;
}

/** Disposes every geometry and material below an object. */
export function disposeToolTree(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = mesh.material as THREE.Material | THREE.Material[];
    if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
    else material?.dispose();
  });
}
