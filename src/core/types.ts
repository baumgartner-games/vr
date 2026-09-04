import type * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { XRInput } from './XRInput';
import type { Pointer } from './Pointer';
import type { PlayerAvatar } from './PlayerAvatar';
import type { HandVisuals } from './HandVisuals';
import type { WristMenus } from '../ui/WristMenus';
import type { MenuEntry } from '../ui/menu';
import type { NetSession } from '../net/NetSession';
import type { RemoteAvatars } from '../net/RemoteAvatars';

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
  /** The pair of wrist menus — same tree on both hands, one panel at a time. */
  readonly menu: WristMenus;
  readonly net: NetSession;
  /** The other players' bodies — a world may hang tools into their hands. */
  readonly avatars: RemoteAvatars;
  readonly role: PlayerRole;
  /** Seconds since the app started. */
  readonly elapsed: number;
  /** Switch to another world by id (safe to call from inside update). */
  goTo(worldId: string): void;
  /** Short message shown on the wrist menu / HUD. */
  notify(message: string): void;
  /**
   * Eine Zeile in den Chat — an alle im Raum und in den eigenen Verlauf.
   *
   * Für eine Welt ist das der Weg, etwas **Aufschreibbares** loszuwerden: der
   * Eingaberaum schickt so seine Konfig-Codes, weil sie am PC in einem Panel
   * mit einem Knopf *Kopieren* landen sollen und nicht in einer Meldung, die
   * nach vier Sekunden weg ist. `kind: 'code'` markiert eine Zeile, die eine
   * Maschine wieder lesen kann.
   */
  say(text: string, options?: { kind?: 'text' | 'code'; note?: string }): void;
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
  /** Entries this world adds to the wrist menu. Read once after `init`. */
  menu?(): MenuEntry[];
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
