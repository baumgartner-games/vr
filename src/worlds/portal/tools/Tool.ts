import * as THREE from 'three';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { WorldContext } from '../../../core/types';
import type { MenuIcon } from '../../../ui/menu';
import type { PhysicsBody, PhysicsWorld } from '../../../physics/PhysicsWorld';
import type { PortalKey } from '../PortalSync';

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
  spawnBullet(origin: THREE.Vector3, direction: THREE.Vector3, speed: number): void;
  /** Repaints a prop, for everybody in the session. */
  paintProp(entry: PhysicsBody, color: number): void;
  /** Marks a prop as picked out, so the world can leave its glow alone. */
  setSelection(entries: readonly PhysicsBody[]): void;
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

  /** The hand currently holding this, or null while it is stowed. */
  heldBy: Handedness | null = null;

  /** Pose inside the hand's grip space. */
  readonly holdPosition = new THREE.Vector3(0, -0.012, 0.03);

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

  /** @param controller the hand holding it, or null while it is stowed. */
  update(_dt: number, _host: ToolHost, _controller: ControllerState | null): void {}

  /** Frees geometries and materials this tool built. */
  disposeTool(): void {}
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
