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

/**
 * Eine Welt zum **Ansehen** statt zum Betreten: ihre Kulisse, gebaut ohne
 * Spieler, ohne Physik und ohne Netzwerk.
 *
 * Dafür gibt es genau einen Abnehmer, die Werkzeugseite — und genau einen
 * Grund, es überhaupt zu bauen: Wer wissen will, wie eine Welt aussieht, will
 * die Welt sehen und nicht ihr Tor. Angesehen wird sie wie ein Werkzeug, von
 * weit genug weg, damit sie ganz draufpasst, und schräg von oben.
 */
export interface WorldPreview {
  /** Alles Gebaute, in einer Gruppe — sie hängt sich in eine fremde Szene. */
  object: THREE.Object3D;
  /**
   * Die Höhe einer Decke über dieser Welt, wenn sie eine hat.
   *
   * Von schräg oben sähe man sonst nur ihren Deckel; wer das hier ausfüllt,
   * wird darunter aufgeschnitten wie ein Puppenhaus.
   */
  roof?: number | null;
  /** Läuft jedes Bild, mit den Sekunden seit dem Aufbau — für Tore, die wirbeln. */
  animate?(time: number): void;
  /** Gibt frei, was gebaut wurde. */
  dispose(): void;
}

export interface World {
  /**
   * Build the world. Everything added to `ctx.scene` must be removed again in
   * `dispose()`; the engine only clears what the world reports.
   */
  init(ctx: WorldContext): void | Promise<void>;
  /**
   * Die Kulisse dieser Welt ohne Spiel — für die Werkzeugseite.
   *
   * Optional, weil es nichts mit dem Spielen zu tun hat: eine Welt ohne diese
   * Methode ist eine Welt, die man nur betreten kann. Wer sie anbietet, baut
   * darin **dasselbe** wie in `init` — eine hübschere Kopie zeigt irgendwann
   * etwas anderes als das Spiel.
   */
  preview?(): WorldPreview;
  update(dt: number, ctx: WorldContext): void;
  /**
   * Optional custom render pass (the portal world needs several). Return true
   * when the world has drawn the frame itself, otherwise the engine renders.
   */
  render?(ctx: WorldContext): boolean;
  /** Entries this world adds to the wrist menu. Read once after `init`. */
  menu?(): MenuEntry[];
  /**
   * Ein Konfig-Code ist in die Speicher eingetragen worden — was schon gebaut
   * ist, muss ihn nachlesen.
   *
   * Der Speicher allein reicht nicht: Eine Pistole, die gerade in einer Hand
   * liegt, hat ihre Zahlen beim Bauen bekommen und schaut nie wieder nach.
   * Welten ohne Werkzeuge lassen das weg — dort gibt es nichts nachzulesen.
   */
  reloadGear?(): void;
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
