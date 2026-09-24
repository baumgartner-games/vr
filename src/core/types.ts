import type * as THREE from 'three';
import type { PlayerRig } from './PlayerRig';
import type { FrameSample } from './FrameStats';
import type { HeadgearKind } from './headgear';
import type { XRInput } from './XRInput';
import type { Pointer } from './Pointer';
import type { PlayerAvatar } from './PlayerAvatar';
import type { HandVisuals } from './HandVisuals';
import type { WristMenus } from '../ui/WristMenus';
import type { MenuEntry, MenuIcon } from '../ui/menu';
import type { NetSession } from '../net/NetSession';
import type { RemoteAvatars } from '../net/RemoteAvatars';
import type { LivePreview } from '../worlds/shared/livePreview';
import type { ViewLevel } from './cutaway';

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
  /**
   * **Ob gerade von oben gespielt wird** (`core/TopDownCamera.ts`, `App.topDown`).
   *
   * Eine Welt braucht das für alles, was es nur in dieser Ansicht gibt: den
   * Hinweis über der Figur, was sie benutzen kann, und die Hand, in der am
   * Schirm das Werkzeug liegt (`core/usable.ts`, Plan E5). In der Brille und
   * aus den Augen ist es falsch — dort sind es die echten Hände.
   */
  readonly topDown: boolean;
  /**
   * **Ob man gerade der Kran ist** (`core/crane.ts`) — von oben, und im
   * _Einrichten_ oder _Baukasten_. Dann meint `A`, was **unter** dem Kran
   * liegt, und nicht, was vor der Figur steht; das Getragene hängt unter dem
   * Greifer, und die Welt hält den Körper nicht auf.
   *
   * Freiwillig, weil Vorschau und Tests ohne auskommen: fehlt es, ist man es
   * nicht.
   */
  readonly crane?: boolean;
  /**
   * **Die Kamera, aus der dieses Bild gezeichnet wird** — von oben die
   * Kamera schräg über der Figur (`core/TopDownCamera.ts`), sonst `camera`.
   *
   * `camera` ist das nicht: Sie hängt als Kind im Rig, und ihre `position`
   * ist die Stelle **im Rig** — knapp über dem Nullpunkt, egal wo man steht.
   * Das Wand-Ghosting hat genau damit gerechnet und fragte deshalb immer vom
   * Weltnullpunkt aus (`grid/GridWorld.stepWallGhosts`): In der Mitte des
   * Geländes ging das fast gut, an seinem Rand lag die durchsichtige Wand
   * daneben. Wer eine Weltposition braucht, nimmt `getWorldPosition`.
   *
   * Optional, weil eine Vorschau und die Tests ohne sie auskommen; dann gilt
   * `camera`.
   */
  readonly viewCamera?: THREE.PerspectiveCamera;
  /** Seconds since the app started. */
  readonly elapsed: number;
  /**
   * **Die letzte Messung der Bildrate** (`FrameStats.latest`): Mittelwerte
   * über eine halbe Sekunde, oder `null`, solange noch nichts gemessen ist.
   * Für Anzeigen, die im Spiel bleiben sollen — der Streifen des Technikers
   * zeigt sie neben dem Sauerstoff, weil ein Stottern auf der Quest sonst nur
   * mit offenem Menü zu sehen war.
   */
  frame(): FrameSample | null;
  /** Switch to another world by id (safe to call from inside update). */
  goTo(worldId: string): void;
  /**
   * **Dieselbe Welt noch einmal von vorn** — abräumen und frisch laden, als
   * käme man gerade herein (_Menü → Zurücksetzen_). Optional, weil nur die
   * App es kann; eine Attrappe im Test braucht es nicht.
   */
  reload?(): void;
  /**
   * **Einem Raum beitreten**, ohne dass die Welt den Transport kennt.
   *
   * Welten sehen nie, was unter der Verbindung liegt (`net/types.ts`), können
   * aber Anlass haben, einen bestimmten Raum zu wollen: Haunting spielt für
   * alle im Raum `haunting`, damit die Web-Spieler auf der Startseite nur
   * noch ihren Namen eintippen müssen und keinen Code abtippen. Ein Anruf,
   * kein Zwang — wer schon in einem Raum steht, bleibt dort.
   */
  join(room: string): void;
  /**
   * **Den Bordstock der Seite ab- oder wieder anschalten** (`index.html`,
   * `#touch`).
   *
   * Die Seite blendet ihn selbst ein, wo sie ein Telefon vermutet. Eine Welt,
   * die eine **eigene** Steuerung mitbringt, hätte dann zwei Stöcke
   * übereinander — Haunting bringt die der 2D-Welt mit. `false` heißt: nicht
   * jetzt; `true` gibt die Entscheidung der Seite zurück.
   */
  touchStick(on: boolean): void;
  /** Short message shown on the wrist menu / HUD. */
  notify(message: string): void;
  /** Rebuild world-specific entries after a role or round changes. */
  refreshWorldMenu(): void;
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
  /**
   * **Setzt dem Spieler etwas auf den Kopf** — für die Dauer dessen, was die
   * Welt gerade mit ihm anstellt (`core/headgear.ts`).
   *
   * `null` gibt den Kopf wieder der Einstellung zurück (`core/appearance.ts`).
   * Das ist die ganze Regel dahinter: Was man selbst gewählt hat, gehört einem
   * und keiner Welt — ein Helm im Gokart ist geliehen, und wer aussteigt, hat
   * wieder seinen eigenen Hut auf.
   */
  wear(kind: HeadgearKind | null): void;
  /**
   * **Gibt dem Spieler eine Figur** (`core/avatarFigures.ts`) — geliehen wie
   * ein Hut über `wear`: `null` gibt ihm die eigene zurück. Die Raumstation
   * steckt jeden in den Space Ranger. Optional, weil nur die App es kann.
   */
  dress?(figure: string | null): void;
  /**
   * **Die Umkleide aufmachen** (`ui/WardrobeMenu.ts`).
   *
   * Sie gehört `App` und keiner Welt, aus demselben Grund wie das Aussehen
   * selbst: Wer sich vor dem Schrank in der Testwelt umzieht, läuft auch im
   * Hub so herum. Eine Welt sagt deshalb nur, **dass** jemand davorsteht und
   * gedrückt hat — der Kleiderschrank meldet `{ type: 'wardrobe' }`, und
   * `GridWorld` reicht es hierher weiter. Später ruft Haunting dieselbe Zeile.
   *
   * Wie sie aussieht, entscheidet die Ansicht: am Bildschirm eine Seite mit
   * der Figur in Nahaufnahme, in der Brille die Seite _Aussehen_ am
   * Handgelenk — dort steht die Figur ja schon im Spiegel am Schrank.
   */
  openWardrobe(): void;
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
  /**
   * **Wenn diese Vorschau nicht nur ein Bild ist, sondern läuft**
   * (`worlds/shared/livePreview.ts`).
   *
   * Fehlt bei jeder stillen Vorschau, und das ist der Normalfall: Eine Kulisse
   * mit einer Attrappe statt einer Physik kann nichts rechnen. Wer das hier
   * ausfüllt, hat eine echte Physik, ein Gitter und einen Bestand an NPCs
   * gebaut — und dann darf man sie vom Telefon aus bedienen.
   */
  live?: LivePreview;
  /** Gibt frei, was gebaut wurde. */
  dispose(): void;
}

/**
 * **Ein Werkzeug zur Wahl** — eine Zeile in der Liste hinter `#hud-tool`.
 *
 * `id` ist die Werkzeug-Id der Welt; `null` gibt es hier nicht, die **Hand**
 * setzt die Liste selbst davor (`App`). Beschriftung und Ikone sind dieselben
 * wie im Regal am Handgelenk — zwei Namen für dasselbe Ding wären zwei Dinge.
 */
export interface ToolOption {
  id: string;
  label: string;
  icon?: MenuIcon;
  accent?: number;
}

/**
 * **Was am Bildschirm in der Hand liegt, und was darin liegen könnte.**
 *
 * In der Brille greift man ins Regal am Handgelenk; am Bildschirm gibt es
 * keine Hand, die irgendwo hingreift — dafür steht unten rechts ein runder
 * Knopf mit der Ikone des gewählten Werkzeugs (`#hud-tool`, `Tab`, `Y`), und
 * dahinter diese Liste. `current` ist `null`, wenn die Hand leer ist: Dann
 * tut der Trigger nichts, und das ist eine gültige Wahl und kein Fehler.
 *
 * Eine Welt ohne Werkzeuge hat diesen Haken nicht; dann bleibt der Knopf weg.
 */
export interface ToolChoice {
  /** Die Id des gewählten Werkzeugs, oder `null` für die leere Hand. */
  current: string | null;
  /** Was die Welt anbietet — ohne die Hand, die steht immer zuerst. */
  options: ToolOption[];
  /** Ein Tipp in der Liste. `null` heißt: nichts in die Hand. */
  choose(id: string | null): void;
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
  /**
   * Dieselbe Kulisse, aber **in Betrieb**: mit Physik, Gitter und NPCs, damit
   * man sie auf der Werkzeugseite starten und bedienen kann
   * (`worlds/shared/livePreview.ts`).
   *
   * Optional wie `preview` und aus demselben Grund: Eine Welt, die das nicht
   * anbietet, ist eine, die man ansieht oder betritt. Asynchron, weil eine
   * echte Physik geladen werden muss — das ist der ganze Unterschied zur
   * stillen Vorschau.
   */
  previewLive?(): Promise<WorldPreview>;
  update(dt: number, ctx: WorldContext): void;
  /**
   * Optional custom render pass (the portal world needs several). Return true
   * when the world has drawn the frame itself, otherwise the engine renders.
   */
  render?(ctx: WorldContext): boolean;
  /**
   * **Diese Welt bringt ihre Ansicht von oben selbst mit.**
   *
   * Der Normalfall ist die Kamera des Kerns (`core/TopDownCamera.ts`):
   * dieselbe Szene, schräg von oben — für jede Welt gleich. Genau eine hat
   * eine eigene — Haunting, mit Räumen, Türen, Licht und einer ganzen Runde
   * darin —, und die soll der Kern nicht übermalen.
   */
  readonly ownsFlat?: boolean;
  /**
   * **Auf welcher Ebene das Rig gerade steht** — für die Ansicht von oben.
   *
   * Von dort aus wird aufgeschnitten (`core/cutaway.ts`): Alles über dieser
   * Ebene verschwindet, sonst sähe die Kamera schräg darüber nur Decken und
   * Dächer. Die Antwort kommt aus der Kachel unter den Füßen und kann deshalb
   * nur von der Welt kommen — die Kamera kennt kein Gitter.
   *
   * Optional, und `null` ist eine gültige Antwort: Eine Welt ohne Stockwerke
   * (Portal-Labor, Interaktionslabor, die Alpen) wird nicht aufgeschnitten und
   * sieht von oben aus wie eh und je.
   */
  viewLevel?(): ViewLevel | null;
  /** Entries this world adds to the wrist menu. Read once after `init`. */
  menu?(): MenuEntry[];
  /**
   * **Die Werkzeugwahl am Bildschirm** (`#hud-tool`) — oder gar keine.
   *
   * Gelesen von `App`, jedes Bild: Der Knopf zeigt die Ikone dessen, was
   * gerade in der Bildschirmhand liegt, und ein Druck klappt die Liste auf.
   * Eine Welt ohne Werkzeuge lässt den Haken weg, und dann gibt es den Knopf
   * dort auch nicht — ein Knopf, hinter dem nichts steht, ist schlimmer als
   * keiner.
   */
  toolChoice?(): ToolChoice | null;
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
