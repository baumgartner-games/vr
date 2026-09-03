import type * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { XRInput } from './XRInput';
import type { Pointer } from './Pointer';
import type { PlayerAvatar } from './PlayerAvatar';
import type { HandVisuals } from './HandVisuals';
import type { NetSession } from '../net/NetSession';

/**
 * How a player takes part. The engine detects a sensible default, but worlds
 * may offer different experiences per role — that is the hook for asymmetric
 * games (one player in VR, the others on phones).
 */
export type PlayerRole = 'vr' | 'desktop' | 'handheld';

/** Everything a world gets handed on init/update. */
export interface WorldContext {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly rig: PlayerRig;
  readonly input: XRInput;
  readonly pointer: Pointer;
  readonly avatar: PlayerAvatar;
  readonly hands: HandVisuals;
  readonly net: NetSession;
  readonly role: PlayerRole;
  /** Seconds since the app started. */
  readonly elapsed: number;
  /** Switch to another world by id (safe to call from inside update). */
  goTo(worldId: string): void;
  /** Short message shown on the wrist menu / HUD. */
  notify(message: string): void;
}

export interface World {
  /**
   * Build the world. Everything added to `ctx.scene` must be removed again in
   * `dispose()`; the engine only clears what the world reports.
   */
  init(ctx: WorldContext): void | Promise<void>;
  update(dt: number, ctx: WorldContext): void;
  /**
   * Optional custom render pass (the portal world needs several). Return true
   * when the world has drawn the frame itself, otherwise the engine renders.
   */
  render?(ctx: WorldContext): boolean;
  dispose(ctx: WorldContext): void;
}

export interface WorldDefinition {
  id: string;
  title: string;
  tagline: string;
  description: string;
  /** Accent colour used by the menu entry, as a hex number. */
  accent: number;
  /** Roles that can currently join this world. */
  roles: PlayerRole[];
  /** Marks work-in-progress worlds in the menu. */
  experimental?: boolean;
  load(): Promise<World>;
}
