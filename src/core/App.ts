import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';
import { XRInput } from './XRInput';
import { Pointer } from './Pointer';
import { FlatControls, type TouchPads } from './FlatControls';
import { HandVisuals } from './HandVisuals';
import { PlayerAvatar } from './PlayerAvatar';
import { FreeLocomotion } from './Locomotion';
import { WristMenus } from '../ui/WristMenus';
import { MenuNav } from '../ui/menuNav';
import { catalogRecall } from '../ui/menuRecall';
import { PageMenu } from '../ui/PageMenu';
import { HAND_LABEL, ToolButton, toolEntries } from '../ui/ToolButton';
import { WardrobeMenu } from '../ui/WardrobeMenu';
import { TopDownCamera } from './TopDownCamera';
import { isCrane, screenTopDown } from './crane';
import { gameMode, onGameMode } from './gameMode';
import {
  SCREEN_VIEW_LABELS,
  SCREEN_VIEW_SUBS,
  saveScreenView,
  screenView,
  type ScreenView,
} from './screenView';
import { NetSession } from '../net/NetSession';
import { CHAT_LIMIT, ChatLog, type ChatEntry } from '../net/chat';
import { RemoteAvatars } from '../net/RemoteAvatars';
import { Voice } from '../net/Voice';
import { BroadcastChannelTransport } from '../net/BroadcastChannelTransport';
import { TrysteroTransport, type TrysteroOptions } from '../net/TrysteroTransport';
import { SpectatorCamera, type SpectatorMode } from '../net/SpectatorCamera';
import { pickWatched } from '../net/watch';
import {
  normalizeRoomCode,
  randomRoomCode,
  rememberName,
  rememberRoom,
  rememberedName,
  rememberedRoom,
} from '../net/room';
import { KeyPanel, type KeyPanelRequest } from '../ui/KeyPanel';
import { AssetGate } from './assetGate';
import { detectFlatRole } from './device';
import { firstGamepad, readGamepad, type GamepadLike } from './gamepad';
import { PAD_BUTTONS, padButtonLabel, padKind, padSlotLabel, padSnapshot } from './gamepadReport';
import {
  ACTION_LABELS,
  KEY_ACTIONS,
  PAD_ACTIONS,
  assignSlot,
  bindKey,
  bindPad,
  deviceKey,
  indexOf,
  isDefaultConfig,
  keyLabel,
  keysFor,
  layoutSize,
  padSlotsFor,
  resetBindings,
  resetDevice,
  type InputConfig,
  type PadAction,
} from './inputMap';
import { clearInputConfig, inputConfig, saveInputConfig } from './inputStore';
import type { InputPress } from './FlatControls';
import { GraphicsQuality } from './GraphicsQuality';
import { FrameStats } from './FrameStats';
import { PositionHud } from './positionHud';
import { appearance, appearanceSummary, onAppearanceChange, saveAppearance } from './appearance';
import { HEADGEAR_LABELS, HEADGEAR_SUBS, nextHeadgear, type HeadgearKind } from './headgear';
import { BODY_LABELS, BODY_SUBS, HEAD_LABELS, HEAD_SUBS, nextBody, nextHead } from './avatarLook';
import {
  GRAPHICS_MODE_LABELS,
  GRAPHICS_MODE_SUBS,
  SCREEN_PADS_LABELS,
  SCREEN_PADS_SUBS,
  SQUISH_SCALE_LABELS,
  SQUISH_SCALE_SUBS,
  SQUISH_SPEED_LABELS,
  SQUISH_SPEED_SUBS,
  IDLE_SQUISH_SCALE_SUBS,
  IDLE_SQUISH_SPEED_SUBS,
  XR_SCALE_LABELS,
  XR_SCALE_SUBS,
  animationSummary,
  clearGraphics,
  graphics,
  graphicsSummary,
  nextGraphicsMode,
  nextScreenPads,
  nextSquishScale,
  nextSquishSpeed,
  nextXrScale,
  saveGraphics,
} from './graphicsSettings';
import {
  fullscreenActive,
  fullscreenSupported,
  onFullscreenChange,
  toggleFullscreen,
} from './fullscreen';
import type { FrameSample } from './FrameStats';
import {
  DEFAULT_EYES,
  EYE_RANGE,
  KITCHEN_EYE_RANGE,
  eyeHeights,
  saveEyeHeights,
  savePlayerPosture,
  seatedLift,
} from './posture';
import { DEFAULT_WORLD, WORLDS, findWorld } from '../worlds';
import { applyGearConfig, parseGearCode } from '../worlds/portal/tools/gearConfig';
import { MirrorRenderer } from '../worlds/shared/Mirror';
import { setImmersive } from './systemKeyboard';
import type { PlayerRole, ToolChoice, World, WorldContext } from './types';
import type { MenuEntry } from '../ui/menu';
import { cssColor } from '../ui/PageMenu';
import type { Peer } from '../net/NetSession';
import type { TurnServerConfig } from '@trystero-p2p/core';

export interface AppHooks {
  onWorldChanged?(id: string, title: string): void;
  onSessionChanged?(presenting: boolean): void;
  /**
   * Das Menü als Seite ging auf oder zu (`ui/PageMenu.ts`) — der Knopf oben
   * links auf der Seite sagt es mit `aria-expanded` nach.
   */
  onMenuChanged?(open: boolean): void;
  onNotify?(message: string): void;
  /**
   * Eine Welt möchte den Bordstock der Seite loswerden oder wiederhaben
   * (`WorldContext.touchStick`). Was daraus folgt, entscheidet die Seite:
   * `true` heißt „entscheide wieder selbst", nicht „zeig ihn".
   */
  onTouchStick?(on: boolean): void;
  /** Connection state or the peer list changed — repaint the network panel. */
  onNetChanged?(): void;
  /**
   * Eine Welt ließ sich nicht laden. Was daraus folgt, entscheidet die Seite
   * und nicht die App: Der häufigste Grund ist ein Deploy, der die Chunks
   * unter der laufenden Seite ausgetauscht hat (`core/staleBuild.ts`), und die
   * einzige Antwort darauf ist die Adresszeile.
   */
  onWorldFailed?(id: string, error: unknown): void;
}

export interface ConnectOptions extends TrysteroOptions {
  /** Human readable room code; normalised before it reaches the relays. */
  room: string;
  /** Shown to the other players. */
  name?: string;
  /** Same-browser tabs instead of real peer-to-peer. Handy while developing. */
  local?: boolean;
}

const _head = new THREE.Matrix4();
const _headLocal = new THREE.Matrix4();
const _headPos = new THREE.Vector3();
const _keyPosition = new THREE.Vector3();
const _keyRotation = new THREE.Quaternion();
const _keyOffset = new THREE.Vector3();

/**
 * Eine Sitzung, `immersive-ar` zuerst.
 *
 * Der Rückfall ist kein Notnagel, sondern der Normalfall auf allem, was keine
 * Kamera nach außen hat: `requestSession` wirft dort, und die VR-Sitzung
 * danach ist genau die, die es vorher schon gab.
 */
async function requestSession(xr: XRSystem, options: XRSessionInit): Promise<XRSession> {
  try {
    if (await xr.isSessionSupported('immersive-ar')) {
      return await xr.requestSession('immersive-ar', options);
    }
  } catch {
    // Unterstützt gemeldet, trotzdem abgelehnt — dann eben nicht.
  }
  return xr.requestSession('immersive-vr', options);
}

export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly rig: PlayerRig;
  readonly input: XRInput;
  readonly pointer: Pointer;
  readonly wristMenu: WristMenus;
  /**
   * Dasselbe Menü als Seite aus DOM, für alles ohne Brille — hinter dem Knopf
   * oben links. Welches der beiden gerade gilt, entscheidet `WristMenus`.
   */
  readonly pageMenu: PageMenu;
  /**
   * **Die Werkzeugliste am Bildschirm** — derselbe Seitenmenü-Baustein wie
   * oben links, nur mit einem sehr kurzen Baum: die Hand und die Werkzeuge
   * dieser Welt (`World.toolChoice`). Ein eigenes Menü und kein Ast im
   * großen: Es gehört zum Knopf unten rechts und nicht in die Einstellungen.
   */
  readonly toolMenu: PageMenu;
  /**
   * **Die Umkleide** — die Seite vor dem Kleiderschrank (`ui/WardrobeMenu.ts`).
   *
   * Sie gehört `App` und keiner Welt, genau wie das Aussehen selbst
   * (`core/appearance.ts`): Wer sich in der Testwelt umzieht, läuft im Hub
   * ebenso herum. Eine Welt macht sie über den Weltkontext auf
   * (`WorldContext.openWardrobe`) und weiß sonst nichts von ihr.
   */
  readonly wardrobe: WardrobeMenu;
  /** Der runde Knopf unten rechts (`index.html`, `#hud-tool`). */
  private readonly toolButton: ToolButton | null;
  /**
   * Welches Werkzeug der Knopf gerade zeigt — `undefined`, solange er gar
   * nichts zeigt. Ohne diesen Merker zeichnete er sich jedes Bild neu.
   */
  private toolShown: string | null | undefined = undefined;
  /**
   * **Die Ansicht _Von oben_** (`core/TopDownCamera.ts`) — dieselbe Szene, nur
   * aus einer festen Kamera schräg darüber. Wann sie das Bild ist, sagt
   * `topDown`.
   */
  private readonly topDownCamera: TopDownCamera;
  readonly net = new NetSession();
  readonly spectator: SpectatorCamera;

  private readonly handVisuals: HandVisuals;
  private readonly avatar: PlayerAvatar;
  /**
   * Was eine Welt dem Spieler gerade aufgesetzt hat (`WorldContext.wear`), oder
   * `null` — dann gilt die Einstellung (`core/appearance.ts`).
   */
  private worn: HeadgearKind | null = null;
  /** Die Figur, die eine Welt dem Spieler gerade geliehen hat (`WorldContext.dress`). */
  private dressed: string | null = null;
  /** 2D oder 3D am Bildschirm (`core/screenView.ts`). */
  private view: ScreenView = '3d';
  readonly avatars: RemoteAvatars;
  /** Die Stimmen der anderen, räumlich am Kopf ihres Sprechers (`net/Voice.ts`). */
  readonly voice: Voice;
  private readonly flat: FlatControls;
  private readonly hooks: AppHooks;
  /**
   * Die Spiegelbilder — bei der App und nicht bei einer Welt.
   *
   * Ein Spiegel ist ein Ding wie jedes andere: Er kommt als Handspiegel aus
   * dem Werkzeugregal oder als Standspiegel aus dem Beutel, und beide reisen
   * mit ihrem Träger durch jede Welt. Er sucht sich seine Flächen deshalb
   * selbst in der Szene (`worlds/shared/Mirror.ts`) — eine Welt, die von
   * Spiegeln wüsste, wäre eine Welt, in der man einen vergessen kann.
   */
  private readonly mirrors: MirrorRenderer;
  /**
   * Wie schön es aussieht — bei der App, weil ein Schatten keine Eigenschaft
   * einer Welt ist (`core/GraphicsQuality.ts`).
   */
  private readonly quality: GraphicsQuality;
  private readonly frameStats: FrameStats;
  /** Wo man steht, als Zahl (`core/positionHud.ts`, _Grafik → Position zeigen_). */
  private readonly positionHud: PositionHud;

  private world: World | null = null;
  private worldMenu: MenuEntry[] = [];
  private worldId = '';
  private baseChildren = new Set<THREE.Object3D>();
  /**
   * Die Tastatur für alles, was in der Brille getippt wird — hier und nicht in
   * einer Welt, weil der Raum-Code zur Verbindung gehört und die überlebt jeden
   * Weltwechsel.
   */
  private readonly keys: KeyPanel;

  /**
   * Der Chat-Verlauf — bei der App und nicht bei einer Welt.
   *
   * Er überlebt jeden Weltwechsel und jedes Verbinden: wer aus der Brille einen
   * Konfig-Code herüberschickt, will ihn am PC auch dann noch lesen, wenn der
   * inzwischen in einer anderen Welt steht.
   */
  readonly chat = new ChatLog(CHAT_LIMIT, true);
  private loading: string | null = null;
  /** Welche Ladung gerade die gültige ist — siehe `goTo`. */
  private loadToken = 0;
  /**
   * **Was noch im Netz steht**, nachdem `goTo` zurückgekommen ist
   * (`core/assetGate.ts`). Er hängt sich an den Lade-Manager von three.js, und
   * zwar **hier im Feld** und nicht später: Er muss die erste Welle
   * mitbekommen, sonst hielte er eine laufende Ladung für Stille.
   */
  private readonly assets = new AssetGate(THREE.DefaultLoadingManager);
  private elapsed = 0;
  private lastTime = 0;
  private role: PlayerRole;
  /** Something changed a menu label or row; the tree is rebuilt next frame. */
  private menuDirty = false;
  /** Die Bildraten-Zeile des Grafik-Menüs — nachgeschrieben, solange das Menü offen ist. */
  private fpsEntry: MenuEntry | null = null;
  /** Dem Vollbild wieder zuhören aufhören — die Zeile darüber hängt daran (`fullscreenRow`). */
  private stopFullscreenWatch: (() => void) | null = null;
  /** Meldet das Zuhören am Spielmodus wieder ab (`core/crane.ts`). */
  private readonly stopGameModeWatch: () => void;
  /** Dasselbe für die Zeile, die zeigt, was gerade am Pad anliegt (`inputsMenu`). */
  private liveInput: MenuEntry | null = null;
  /** Welche Zeile des Eingaben-Menüs gerade auf einen Druck wartet, wenn eine. */
  private learning: string | null = null;
  /** Und wie man dieses Warten wieder abstellt. */
  private stopLearning: (() => void) | null = null;
  private spectating = false;
  /**
   * In welcher Welt der Beobachtete zuletzt stand — `''`, solange niemandem
   * zugesehen wird. Der Merker, an dem `followWatched` einen **Wechsel**
   * erkennt statt bloß einen Unterschied.
   */
  private watchedWorld = '';

  constructor(
    canvas: HTMLCanvasElement,
    pads: TouchPads | HTMLElement | null,
    hooks: AppHooks = {},
  ) {
    this.hooks = hooks;
    this.role = detectFlatRole();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      // Durchsichtig **können** muss der Puffer, sonst liegt im
      // Passthrough-Bild einer AR-Sitzung ein schwarzes Tuch über dem Zimmer.
      // Sein soll er es nicht: `alpha: true` stellt die Löschfarbe sonst auf
      // durchsichtig, und dann scheint zwischen zwei Welten die Webseite
      // durch.
      alpha: true,
    });
    this.renderer.setClearAlpha(1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.05,
      700,
    );
    this.mirrors = new MirrorRenderer(this.renderer);
    this.quality = new GraphicsQuality(this.renderer, this.scene);
    this.frameStats = new FrameStats();
    // Das Feld unten rechts hängt am Häkchen im Grafik-Menü — und F3 schaltet
    // dasselbe Häkchen, damit beide dasselbe sagen.
    this.frameStats.visible = graphics().showFps;
    this.positionHud = new PositionHud();
    this.positionHud.visible = graphics().showPosition;
    this.frameStats.onToggle = (on) => {
      saveGraphics({ showFps: on });
      this.menuDirty = true;
    };
    // One reset per complete frame, so diagnostics include mirrors and portals.
    this.renderer.info.autoReset = false;
    this.rig = new PlayerRig(this.renderer, this.camera);
    this.scene.add(this.rig);

    this.input = new XRInput(this.renderer, this.rig);
    this.pointer = new Pointer(this.rig, canvas);
    this.topDownCamera = new TopDownCamera(canvas);
    // Die Kamera von oben kennt zwei Dinge, die die Eingabe braucht: wo die
    // Figur auf dem Schirm steht (dahin zielt die Maus) und den Zoom auf den
    // Bumpern. Deshalb steht sie eine Zeile früher als die Steuerung.
    this.flat = new FlatControls(this.rig, canvas, pads, this.topDownCamera);

    this.handVisuals = new HandVisuals(this.input);
    this.rig.add(this.handVisuals);

    this.avatar = new PlayerAvatar();
    this.rig.add(this.avatar);

    this.wristMenu = new WristMenus(this.pointer, {
      title: 'Menü',
      footer: 'Andere Hand: zielen + Trigger/A',
      // Der Weg durchs Menü merkt sich den **Katalog** über das Neuladen
      // hinaus (`ui/menuRecall.ts`) — alles andere fängt nach einem Neustart
      // wieder oben an.
      nav: new MenuNav(catalogRecall()),
    });
    this.rig.add(this.wristMenu);
    this.pageMenu = new PageMenu({
      title: 'Menü',
      nav: this.wristMenu.nav,
      onToggle: (open) => this.hooks.onMenuChanged?.(open),
    });
    this.wristMenu.attachPage(this.pageMenu);
    // Die Werkzeugliste: eigener Baum, eigener Weg, eigener Knopf.
    this.toolMenu = new PageMenu({
      title: 'Werkzeug',
      onToggle: (open) => this.toolButton?.setOpen(open),
    });
    this.wardrobe = new WardrobeMenu();
    const toolEl =
      typeof document === 'undefined'
        ? null
        : document.querySelector<HTMLButtonElement>('#hud-tool');
    this.toolButton = toolEl ? new ToolButton(toolEl, () => this.toggleToolMenu()) : null;
    this.toolButton?.show(false);
    // `Tab` und `Y` am Pad machen dieselbe Liste auf — abgehört wird beides an
    // der einen Stelle, an der Eingabe zusammenläuft (`FlatControls`).
    this.flat.onTools = () => this.toggleToolMenu();
    this.view = screenView(this.role);
    // **Der Spielmodus schaltet die Ansicht mit** (`core/crane.ts`): Wer
    // einrichtet, ist der Kran und sieht am Schirm von oben; mit _Spielen_
    // kommt die eigene Wahl zurück.
    this.stopGameModeWatch = onGameMode(() => {
      this.applyView();
      this.menuDirty = true;
    });
    this.refreshMenu();

    // Der Name gilt ab sofort und nicht erst ab dem Verbinden: er steht im
    // Chat vor jeder Zeile, und die schreibt man auch allein.
    this.net.name = rememberedName() || defaultName(this.role);

    this.avatars = new RemoteAvatars(this.net);
    this.scene.add(this.avatars);
    this.spectator = new SpectatorCamera(this.rig, canvas, this.pointer);
    this.spectator.onChange = () => this.hooks.onNetChanged?.();
    this.voice = new Voice(this.net);
    // Wer redet, trägt einen Punkt auf dem Namensschild — in einem Raum mit
    // vier Leuten ist das sonst geraten.
    this.avatars.isSpeaking = (id) => this.voice.speaking(id);
    this.voice.onChange = () => {
      this.menuDirty = true;
      this.hooks.onNetChanged?.();
    };

    this.net.onPeerJoin((peer) => this.notify(`${peer.name} ist dabei`));
    this.net.onPeerLeave((peer) => this.notify(`${peer.name} ist weg`));
    this.net.onPeersChanged(() => {
      this.menuDirty = true;
      this.hooks.onNetChanged?.();
    });
    this.net.onStatus(() => this.hooks.onNetChanged?.());
    this.net.onChat((message, from) => {
      const entry = this.chat.add({
        from,
        name: message.name || this.net.peers.get(from)?.name,
        text: message.text,
        kind: message.kind,
        note: message.note,
      });
      // Auf dem Schild am Handgelenk steht nur, *dass* etwas kam: eine Zeile
      // Konfig-Code dort zu lesen hilft niemandem, sie gehört auf den PC.
      if (entry) this.notify(chatNotice(entry));
      this.menuDirty = true;
    });

    this.keys = new KeyPanel();
    this.scene.add(this.keys);
    this.pointer.add(this.keys.asPointerTarget());

    // **Vollbild endet auch, ohne dass jemand die Zeile gedrückt hat**: `Esc`,
    // die Systemtaste eines Fernsehers, der Knopf oben rechts. Die Zeile im
    // Grafik-Menü sagt den Stand und nicht den letzten Klick, also wird sie
    // danach neu gebaut (`fullscreenRow`).
    if (typeof document !== 'undefined') {
      this.stopFullscreenWatch = onFullscreenChange(document, () => {
        this.menuDirty = true;
      });
    }

    // Der Hut sitzt sofort und bleibt sitzen: Wer ihn im Menü wechselt, sieht
    // ihn im Spiegel und die anderen im selben Augenblick.
    onAppearanceChange(() => this.applyAppearance());
    this.applyAppearance();

    this.baseChildren = new Set(this.scene.children);

    window.addEventListener('resize', this.onResize);
    this.renderer.xr.addEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.addEventListener('sessionend', this.onSessionEnd);

    this.renderer.setAnimationLoop(this.frame);
  }

  get context(): WorldContext {
    return {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      rig: this.rig,
      input: this.input,
      pointer: this.pointer,
      avatar: this.avatar,
      hands: this.handVisuals,
      menu: this.wristMenu,
      net: this.net,
      avatars: this.avatars,
      role: this.role,
      topDown: this.topDown,
      crane: this.avatar.crane,
      viewCamera: this.topDown ? this.topDownCamera.camera : this.camera,
      elapsed: this.elapsed,
      frame: () => this.frameStats.latest,
      goTo: (id: string) => void this.goTo(id),
      reload: () => void this.reloadWorld(),
      join: (room: string) => void this.joinRoom(room),
      touchStick: (on: boolean) => this.hooks.onTouchStick?.(on),
      notify: (message: string) => this.notify(message),
      refreshWorldMenu: () => {
        this.worldMenu = this.world?.menu?.() ?? [];
        this.menuDirty = true;
      },
      say: (text, options) => void this.say(text, options),
      wear: (kind) => this.wear(kind),
      dress: (figure) => this.dress(figure),
      openWardrobe: () => this.openWardrobe(),
    };
  }

  /**
   * Ob Verbindungen über einen `BroadcastChannel` laufen sollen statt über
   * WebRTC — zwei Tabs im selben Browser, zum Entwickeln (`?net=local`).
   */
  preferLocal = false;

  get currentWorldId(): string {
    return this.worldId;
  }

  /**
   * Loads a world, disposing the previous one.
   *
   * **Es ist immer nur eine Ladung gültig**, und zwar die letzte. Eine Welt
   * kommt über einen dynamischen Import, und der dauert; wer im Menü zweimal
   * hintereinander tippt, hat zwei davon unterwegs. Ohne die Marke unten
   * räumte die zweite die Welt der ersten ab, während deren `init` noch mitten
   * im Aufbauen war — heraus kam eine halbe Welt, in der nichts mehr
   * funktionierte, und der Weg dorthin war ein doppelter Tipper.
   */
  /**
   * **Die Welt, in der man steht, noch einmal laden** — für _Zurücksetzen_.
   *
   * `goTo` mit derselben Id täte nichts (schon da); also vergisst die App erst,
   * wo sie ist, und lädt dann wie beim Hineingehen. Die alte Welt wird dabei
   * wie sonst auch erst abgeräumt, wenn die neue geladen ist.
   */
  async reloadWorld(): Promise<void> {
    const id = this.worldId;
    if (!id || this.loading !== null) return;
    this.worldId = '';
    await this.goTo(id);
  }

  async goTo(id: string): Promise<void> {
    const definition = findWorld(id) ?? findWorld(DEFAULT_WORLD)!;
    if (this.loading === definition.id) return;
    if (this.worldId === definition.id) {
      // Schon da. Ist trotzdem etwas anderes unterwegs, ist das hier ein
      // Abbruch: Die Marke hochzählen genügt, die laufende Ladung tauscht dann
      // nichts mehr aus.
      if (this.loading !== null) {
        this.loadToken++;
        this.loading = null;
      }
      return;
    }

    const token = ++this.loadToken;
    this.loading = definition.id;
    this.notify(`Lade ${definition.title} …`);

    try {
      const next = await definition.load();
      // Inzwischen wollte jemand woandershin. Die geladene Welt wird einfach
      // fallen gelassen — `init` lief nie, sie hängt an nichts.
      if (token !== this.loadToken) return;
      this.unloadWorld();

      this.worldId = definition.id;
      this.frameStats.setWorld(definition.id);
      this.resizeWebBuffer();
      this.world = next;
      await next.init(this.context);
      this.worldMenu = next.menu?.() ?? [];

      this.net.setWorld(definition.id);
      // Neue Lichter, neuer Himmel: Die Grafikstufe legt sich noch einmal
      // über das, was gerade aufgebaut wurde.
      this.quality.worldChanged();
      this.refreshMenu();
      this.hooks.onWorldChanged?.(definition.id, definition.title);
      this.notify(definition.title);
      if (!this.renderer.xr.isPresenting) this.flat.syncFromRig();
      // Eine neue Welt heißt einen neuen Standort — die Kamera von oben setzt
      // sich dabei neu auf, statt quer über die Karte dorthin zu fliegen
      // (`applyView` → `TopDownCamera.reset`).
      this.applyView();
    } catch (error) {
      console.error(`[app] Welt "${id}" konnte nicht geladen werden`, error);
      this.notify(`Fehler beim Laden von ${definition.title}`);
      this.hooks.onWorldFailed?.(definition.id, error);
    } finally {
      if (token === this.loadToken) this.loading = null;
    }
  }

  /**
   * **Ob die Startladung der Welt durch ist** — die ehrliche Fassung von
   * „geladen".
   *
   * `goTo` kommt zurück, sobald `World.init` gebaut hat; die Modelle einer
   * Welt kommen danach (die Küche holt ihre Möbel mit `void import(…)`, der
   * Koch ebenso). Wer den Knopf auf der Startseite freigibt, sobald `goTo`
   * aufgelöst hat, gibt ihn frei, während die halbe Welt noch im Netz steht.
   * Also wird hier gewartet, bis der Lade-Manager von three.js eine Weile
   * nichts mehr zu tun hatte (`core/assetGate.ts`).
   *
   * `true` heißt „still geworden", `false` „der Deckel war schneller, es lädt
   * noch". Abgelehnt wird **nie**: Eine Datei, die nicht kommt, meldet sich
   * beim Lade-Manager trotzdem ab, und die Welt steht mit ihrem gebauten
   * Ersatz da.
   *
   * @param cap   Der Deckel in Millisekunden — wie lange höchstens gewartet wird.
   * @param quiet So lange muss es still bleiben, bis „fertig" gilt.
   */
  assetsSettled(cap: number, quiet = 1000): Promise<boolean> {
    return this.assets.settle({ cap, quiet });
  }

  /**
   * Starts an immersive session; resolves once the headset takes over.
   *
   * Gefragt wird **zuerst nach `immersive-ar`**, und zwar für jede Welt: eine
   * AR-Sitzung sieht, solange eine Welt ihren Himmel malt, exakt aus wie eine
   * VR-Sitzung — sie kann nur zusätzlich etwas, das eine VR-Sitzung nicht
   * nachträglich lernt. Der AR-Knopf im Eingaberaum blendet die Welt weg, und
   * dahinter steht dann das echte Zimmer statt eines schwarzen Nichts. Wo es
   * `immersive-ar` nicht gibt — Brillen ohne Kamerabild, ältere Browser —,
   * läuft alles wie bisher weiter.
   */
  async enterVR(): Promise<void> {
    if (!navigator.xr) throw new Error('WebXR steht in diesem Browser nicht zur Verfügung.');
    const options: XRSessionInit = {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
    };
    const session = await requestSession(navigator.xr, options);
    await this.renderer.xr.setSession(session);
  }

  async endVR(): Promise<void> {
    await this.renderer.xr.getSession()?.end();
  }

  /**
   * Joins a room. Everybody who types the same code lands in the same session;
   * the handshake runs over a public relay network, the game traffic does not.
   */
  async connect(options: ConnectOptions): Promise<void> {
    const room = normalizeRoomCode(options.room);
    if (!room) throw new Error('Bitte einen Raum-Code angeben.');

    this.net.role = this.role;
    this.net.name = options.name?.trim() || defaultName(this.role);
    const { room: _room, name: _name, local, ...transportOptions } = options;
    const turnConfig = transportOptions.turnConfig ?? envTurnConfig();
    const transport = local
      ? new BroadcastChannelTransport()
      : new TrysteroTransport({ ...transportOptions, ...(turnConfig ? { turnConfig } : {}) });
    await this.net.connect(transport, room);
    this.menuDirty = true;
  }

  /**
   * Eine Zeile in den Chat — an alle im Raum, und in den eigenen Verlauf.
   *
   * Beides zusammen, weil beides gemeint ist: was man abschickt, will man auch
   * selbst noch dastehen sehen. Allein im Raum geht nichts hinaus und die Zeile
   * bleibt trotzdem stehen — dieselbe Regel wie überall sonst hier, es läuft
   * immer, als wäre man in einem Raum.
   *
   * @param note wofür ein `code` gilt; bei getipptem Text ohne Bedeutung.
   * @returns der Eintrag, oder `null`, wenn nach dem Putzen nichts übrig war.
   */
  say(text: string, options: { kind?: 'text' | 'code'; note?: string } = {}): ChatEntry | null {
    const entry = this.chat.add({
      name: this.net.name,
      text,
      kind: options.kind,
      note: options.note,
      mine: true,
    });
    if (!entry) return null;
    // Geschickt wird der **geputzte** Text: was hier steht, steht drüben.
    const heard = this.net.sendChat(entry.text, { kind: entry.kind, note: entry.note });
    // Bei einem Code sagt der Absender selbst, was er verschickt hat — zwei
    // Meldungen übereinander liest niemand.
    if (!heard && entry.kind === 'text') {
      this.notify('Niemand verbunden — die Zeile steht nur bei dir');
    }
    this.menuDirty = true;
    this.hooks.onNetChanged?.();
    return entry;
  }

  /**
   * Einen Konfig-Code aus dem Chat **übernehmen** — auf Knopfdruck, nicht
   * automatisch.
   *
   * Der Eingaberaum wendet ankommende Codes von sich aus an; das ist dort der
   * Sinn der Sache, zwei Leute justieren gemeinsam. Überall sonst kam ein Code
   * bisher an, stand im Verlauf und tat nichts — ohne dass irgendwo stand,
   * warum. Jetzt liegt neben der Zeile ein Knopf. Automatisch überall wäre die
   * schlechtere Antwort: Was ein anderer schickt, soll einem nicht ungefragt
   * die Ausrüstung umstellen, während man gerade fliegt.
   *
   * @returns ob der Code lesbar war.
   */
  applyChatCode(entry: ChatEntry): boolean {
    const config = entry.kind === 'code' ? parseGearCode(entry.text) : null;
    if (!config) {
      this.notify('Kein gültiger Konfig-Code');
      return false;
    }
    const summary = applyGearConfig(config);
    // Was schon in einer Hand liegt, liest seine Zahlen nie wieder nach — die
    // Welt muss es ihm sagen.
    this.world?.reloadGear?.();
    this.menuDirty = true;
    this.notify(`Übernommen: ${summary}`);
    return true;
  }

  disconnect(): void {
    this.net.disconnect();
    this.spectator.setMode('free');
    this.spectator.setTarget(null);
    this.menuDirty = true;
  }

  /**
   * Watch a player — the same call behind the wrist menu and the flat panel.
   * Somebody standing in another world is followed there first; you cannot
   * watch a room you are not in. The same goes for a world they switch to
   * later on: `followWatched` keeps the view with them.
   */
  spectate(peerId: string | null, mode?: SpectatorMode): void {
    this.spectator.setTarget(peerId);
    if (mode) this.spectator.setMode(mode);
    else if (peerId && this.spectator.settings.mode === 'free') this.spectator.setMode('third');
    // Hinterher gefragt und nicht vorher: Ohne ausgesuchte Id gilt der erste
    // VR-Spieler, und auch dem soll man dorthin folgen, wo er steht.
    this.followWatched(this.watched);
    this.menuDirty = true;
    this.hooks.onNetChanged?.();
  }

  /**
   * **Wem zugesehen wird** — die Wahl allein, ohne Rücksicht auf die Welt
   * (`net/watch.ts`). Auch wer gerade durch ein Portal in eine andere Welt
   * gegangen ist, steht hier noch.
   */
  get watched(): Peer | null {
    return pickWatched(
      [...this.net.peers.values()],
      this.spectator.settings.targetId,
      this.net.world,
    );
  }

  /**
   * Derselbe, solange er **hier** steht: Nur von ihm gibt es eine Pose, in die
   * sich eine Kamera setzen kann. Steht er woanders, wird seine Welt geladen
   * (`followWatched`), und bis sie steht, gibt es nichts zu übernehmen.
   */
  get spectatorTarget(): Peer | null {
    const peer = this.watched;
    return peer && peer.world === this.net.world ? peer : null;
  }

  /**
   * **Wer zusieht, geht mit.**
   *
   * Ein Weltwechsel ist in VR ein Schritt durch ein Portal, und wer dabei
   * zusieht, sah bisher zu, wie sein Bild stehenblieb: Der andere war
   * plötzlich in einer Welt, die hier nicht geladen ist, seine Posen kamen
   * weiter an und gehörten zu nichts mehr, was man sehen kann. Also wird die
   * Welt hier nachgeladen — dieselbe Antwort wie beim Aussuchen eines
   * Spielers, nur eben auch dann, wenn er sie **später** wechselt.
   *
   * Gehandelt wird auf den **Wechsel** und nicht auf den Unterschied: Gemerkt
   * wird die Welt, in der der Beobachtete zuletzt stand, und erst eine andere
   * löst etwas aus. Das ist mehr als eine Sparmaßnahme in der Bildschleife —
   * ein Unterschied allein zöge einen auch dann wieder zurück, wenn man selbst
   * gerade im Menü eine andere Welt gewählt hat, und aus dem Mitgehen würde
   * ein Festhalten. Und lässt sich die Welt nicht laden, bleibt es bei einem
   * Versuch statt einem je Bild.
   */
  private followWatched(peer: Peer | null): void {
    // Ohne Zusehen gibt es nichts mitzugehen — und beim nächsten Einschalten
    // fängt es wieder mit dem Wechsel dorthin an, wo der andere steht.
    const world = peer && this.spectator.following ? peer.world : '';
    if (world === this.watchedWorld) return;
    this.watchedWorld = world;
    if (!world || world === this.net.world) return;
    void this.goTo(world);
  }

  toggleMenu(force?: boolean): void {
    this.wristMenu.toggle(force);
  }

  /**
   * **2D oder 3D am Bildschirm** — die Wahl der Startseite
   * (`core/screenView.ts`), hier als Zustand.
   */
  get screenView(): ScreenView {
    return this.view;
  }

  setScreenView(view: ScreenView): void {
    if (this.view === view) return;
    this.view = view;
    saveScreenView(view);
    this.applyView();
    this.menuDirty = true;
    this.notify(`Ansicht: ${SCREEN_VIEW_LABELS[view]}`);
  }

  /**
   * **Ob die Ansicht von oben gerade das Bild ist.**
   *
   * Vier Dinge müssen zusammenkommen: Es ist _Von oben_ gewählt — oder man
   * ist gerade der Kran, der beim Einrichten über der Küche schwebt
   * (`core/crane.ts`) —, die Brille
   * ist ab (darin gibt es nur die eine Ansicht), die Welt bringt keine eigene
   * mit (Haunting hat seine Runde von oben schon — `World.ownsFlat`), und man
   * schaut niemandem zu. **Zuschauen ist selbst eine Kamera**
   * (`net/SpectatorCamera.ts`): Wer über die Schulter eines anderen sieht,
   * will dessen Bild und nicht sich selbst von oben; solange das läuft, hat
   * diese Ansicht Pause und kommt danach von allein zurück.
   */
  get topDown(): boolean {
    return (
      screenTopDown(this.view, gameMode()) &&
      !this.renderer.xr.isPresenting &&
      !this.world?.ownsFlat &&
      !this.spectating
    );
  }

  /**
   * Die Ansicht anwenden: die Kamera von oben aufsetzen oder absetzen, die
   * Tasten auf Weltrichtungen umstellen und den eigenen Körper dazuschalten.
   */
  private applyView(): void {
    const on = this.topDown;
    this.flat.topDown = on;
    // Und der Strahl vom Schirm ruht: Von oben ist der Klick der Trigger der
    // rechten Hand und kein Zeiger aus dem Kopf (`core/Pointer.topDown`).
    this.pointer.topDown = on;
    // Von oben sieht man sich selbst — Kopf nach vorn und Fäuste dran.
    this.avatar.headFollowsRig = on;
    // **Von oben und beim Einrichten ist man der Kran** (`core/crane.ts`) —
    // der Koch tritt ab, samt seinen Händen.
    const crane = on && isCrane(gameMode());
    this.avatar.crane = crane;
    // Und als Kran fahren die Tasten das Bild, der Zeiger stellt den Kran
    // (`FlatControls.crane`).
    this.flat.crane = crane;
    this.avatar.showHands = on && !crane;
    if (on) this.topDownCamera.reset();
    else if (!this.renderer.xr.isPresenting) this.flat.syncFromRig();
  }

  /**
   * **Den Werkzeug-Knopf nachziehen** — jedes Bild, aber gezeichnet nur, wenn
   * sich wirklich etwas geändert hat.
   *
   * Er steht in **jeder** Bildschirmansicht, sobald die Welt Werkzeuge
   * anbietet, und in der Brille nie: Dort ist das Regal am Handgelenk, und
   * ein zweiter Weg zum selben Ding wäre ein zweiter Ort, an dem man sucht.
   */
  private updateToolButton(presenting: boolean): void {
    const button = this.toolButton;
    if (!button) return;
    const choice = presenting ? null : (this.world?.toolChoice?.() ?? null);
    if (!choice) {
      button.show(false);
      if (this.toolMenu.isOpen) this.toolMenu.toggle(false);
      this.toolShown = undefined;
      return;
    }
    button.show(true);
    if (choice.current === this.toolShown) return;
    this.toolShown = choice.current;
    const option = choice.options.find((entry) => entry.id === choice.current);
    button.set(option?.icon ?? null, option?.label ?? HAND_LABEL, cssColor(option?.accent));
    // Steht die Liste offen, wandert der Punkt mit — sonst zeigte sie noch
    // auf das, was eben abgelegt wurde.
    if (this.toolMenu.isOpen) this.toolMenu.setRoot(this.toolPage(choice), 'Werkzeug');
  }

  /** Die Zeilen der Liste, samt dem, was ein Tipp auslöst (`ui/ToolButton.ts`). */
  private toolPage(choice: ToolChoice): MenuEntry[] {
    return toolEntries(choice, (id) => {
      choice.choose(id);
      this.toolShown = undefined;
      this.toolMenu.toggle(false);
    });
  }

  /** Den Knopf drücken: auf oder zu (`Tab`, `Y`, Tipp auf `#hud-tool`). */
  private toggleToolMenu(): void {
    if (this.toolMenu.isOpen) {
      this.toolMenu.toggle(false);
      return;
    }
    const choice = this.world?.toolChoice?.();
    if (!choice) return;
    this.toolMenu.setRoot(this.toolPage(choice), 'Werkzeug');
    this.toolMenu.toggle(true);
  }

  notify(message: string): void {
    this.wristMenu.setStatus(message);
    this.hooks.onNotify?.(message);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    this.stopFullscreenWatch?.();
    this.stopFullscreenWatch = null;
    this.stopGameModeWatch();
    this.renderer.xr.removeEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this.onSessionEnd);
    this.unloadWorld();
    this.keys.dispose();
    this.flat.dispose();
    this.topDownCamera.dispose();
    this.avatar.dispose();
    this.wristMenu.dispose();
    this.pageMenu.dispose();
    this.toolMenu.dispose();
    this.wardrobe.dispose();
    this.toolButton?.dispose();
    this.handVisuals.dispose();
    this.avatars.dispose();
    this.voice.dispose();
    this.spectator.dispose();
    this.mirrors.dispose();
    this.quality.dispose();
    this.frameStats.dispose();
    this.positionHud.dispose();
    this.net.disconnect();
    this.renderer.dispose();
  }

  // --- internals ----------------------------------------------------------

  private unloadWorld(): void {
    if (this.world) {
      try {
        this.world.dispose(this.context);
      } catch (error) {
        console.warn('[app] dispose fehlgeschlagen', error);
      }
    }
    this.world = null;
    this.worldId = '';
    this.worldMenu = [];
    // Was in der alten Welt in Reichweite stand, steht in der neuen nicht
    // mehr da: Sonst benutzte `A` beim Ankommen ins Leere, statt zu springen.
    this.rig.useCandidate = false;
    this.toolMenu.toggle(false);
    this.toolShown = undefined;

    // **Die Hände gehören keiner Welt.** Zwei Dinge blenden sie aus — die
    // Drohne, die die Sicht aus dem Körper trägt, und der Kreis im
    // Eingaberaum, in dem man die echte Hand ans Werkzeug legt. Beides ist
    // eine Sperre, und eine Sperre, die beim Verlassen der Welt hängen
    // bleibt, nimmt die Hände in die nächste mit: man steht dann in einer
    // fremden Welt und hat keine. Jede Welt fängt deshalb mit Händen an.
    this.handVisuals.hidden = false;

    // Safety net: drop anything the world forgot to remove.
    for (const child of [...this.scene.children]) {
      if (!this.baseChildren.has(child)) this.scene.remove(child);
    }
    this.scene.background = null;
    this.scene.fog = null;
    this.scene.environment = null;
    // A crouch is a drop of the whole rig; carrying it into the next world
    // would put the new spawn point half a metre into the floor.
    this.rig.standUp();
    this.rig.setLocomotion(new FreeLocomotion());
    this.pointer.clear();
    this.wristMenu.attachPointer();
    // Die Tastatur gehört nicht der Welt: sie überlebt den Wechsel, ihr
    // Zeigerziel aber nicht — das räumt `clear` mit weg.
    this.keys.close();
    this.pointer.add(this.keys.asPointerTarget());
  }

  private refreshMenu(): void {
    this.menuDirty = false;
    const worlds: MenuEntry[] = WORLDS.map((world) => ({
      id: `world:${world.id}`,
      label: world.title,
      sub: world.tagline,
      accent: world.accent,
      badge: world.experimental ? 'WIP' : undefined,
      selected: world.id === this.worldId,
      run: () => this.selectWorld(world.id),
    }));

    const root: MenuEntry[] = [
      {
        id: 'worlds',
        label: 'Welten',
        sub: 'Wohin soll es gehen?',
        icon: 'worlds',
        accent: 0x4aa8ff,
        children: worlds,
      },
      this.viewMenu(),
      this.networkMenu(),
      this.movementMenu(),
      this.inputsMenu(),
      this.appearanceMenu(),
      this.graphicsMenu(),
      ...this.worldMenu,
      {
        id: 'menu:close',
        label: 'Weiterspielen',
        sub: 'Menü schließen',
        icon: 'close',
        accent: 0x6f7d99,
        run: () => this.wristMenu.toggle(false),
      },
    ];

    // Rebuilding while the menu is open is normal here: the peer list and the
    // spectator switches change under the player's nose. The menu keeps the
    // page and the scroll position through it, open or closed.
    this.wristMenu.setRoot(root);
  }

  /**
   * **Von oben oder aus den Augen** — dieselbe Welt, andere Kamera, mitten im
   * Spiel umschaltbar.
   *
   * Zu wählen gibt es nur, wo es etwas zu wählen gibt: In der Brille steht man
   * in der Welt, da ist eine Kamera von oben kein Blickwinkel, sondern ein
   * Widerspruch. Und Haunting bringt seine eigene mit (`World.ownsFlat`) —
   * die schaltet dort das Zahnrad der Runde um, nicht dieses Menü.
   *
   * **Raster, Ebenen, Editor und _Plan zurücksetzen_ standen hier**, solange
   * von oben eine eigene Kachelwelt lag, die man malen konnte. Was man von
   * oben sieht, ist jetzt die Welt selbst, und gebaut wird sie im Bauplatz
   * (`editor/WorldEditor.ts`).
   */
  private viewMenu(): MenuEntry {
    const flat = this.view === '2d';
    const available = !this.renderer.xr.isPresenting && !this.world?.ownsFlat;
    return {
      id: 'view',
      label: 'Ansicht',
      // Die Wahl bleibt, auch wenn sie gerade nicht gilt: Der Kran sieht von
      // oben (`core/crane.ts`), und das soll hier stehen und nicht verwundern.
      sub: !available
        ? 'Hier gibt es nur die eine'
        : !flat && isCrane(gameMode())
          ? `${SCREEN_VIEW_LABELS[this.view]} · als Kran von oben`
          : SCREEN_VIEW_LABELS[this.view],
      icon: 'worlds',
      accent: 0x9fe3ff,
      children: [
        {
          id: 'view:3d',
          label: SCREEN_VIEW_LABELS['3d'],
          sub: SCREEN_VIEW_SUBS['3d'],
          icon: 'worlds',
          accent: 0x4aa8ff,
          selected: !flat,
          run: () => this.setScreenView('3d'),
        },
        {
          id: 'view:2d',
          label: SCREEN_VIEW_LABELS['2d'],
          sub: available
            ? SCREEN_VIEW_SUBS['2d']
            : 'Hier nicht: die Brille ist auf, oder die Welt hat eine eigene',
          icon: 'worlds',
          accent: 0x5ee0a0,
          selected: flat,
          run: () => this.setScreenView('2d'),
        },
      ],
    };
  }

  /**
   * **Die Eingaben: was ankommt, und was es tun soll.**
   *
   * Der Anlass war ein Backbone am iPhone, das den unteren Gesichtsknopf als
   * `buttons[1]` meldet — getauscht gegenüber dem Standard-Mapping. Wer dort
   * unten drückt, benutzt nichts, und im Spiel ist das nicht zu erkennen,
   * geschweige denn zu richten. Die Eingabeseite (`/inputs.html`) zeigt es;
   * dieses Menü **ändert** es, an Ort und Stelle, ohne die Welt zu verlassen.
   *
   * Drei Zeilen, und die erste ist die wichtigste: **was gerade anliegt**. Sie
   * wird wie die Bildraten-Zeile im Grafik-Menü nachgeschrieben, ohne den Baum
   * neu zu bauen (`render`) — ein Neubau je Bild wäre selbst ein Ruckler, und
   * ohne Rückmeldung stellt man blind ein.
   *
   * Eingestellt wird überall gleich: Zeile antippen, dann den Knopf oder die
   * Taste drücken, die es tun soll (`FlatControls.captureNext` — abgehört wird
   * nichts Neues, der Druck geht nur einmal woanders hin). Und überall steht
   * der Weg zurück daneben, weil eine Einstellung ohne Rückweg eine Falle ist.
   */
  private inputsMenu(): MenuEntry {
    const config = inputConfig();
    const pad = firstGamepad(
      typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
        ? navigator.getGamepads()
        : null,
    ) as (GamepadLike & { id?: string }) | null;
    const key = deviceKey(pad?.id);
    const count = pad?.buttons.length ?? 0;
    const accent = 0x4aa8ff;

    /** Die Zeile, die mitschreibt, was anliegt — `render` hält sie aktuell. */
    this.liveInput = {
      id: 'input:live',
      label: livePadLabel(pad, config),
      sub: pad
        ? 'Drück etwas — hier steht, was ankommt'
        : 'Ein Pad meldet sich erst, wenn daran ein Knopf gedrückt wurde',
      icon: 'controller',
      accent: pad ? 0x5ee0a0 : 0x6f7d99,
    };

    /**
     * Eine Zeile, die auf einen Druck wartet. Wartet schon eine, wird die
     * abgelöst: Zwei Zeilen, die beide den nächsten Knopf wollen, wären ein
     * Knopf, der zwei Dinge tut.
     */
    const learn = (
      id: string,
      label: string,
      sub: string,
      want: 'pad' | 'key',
      take: (press: InputPress) => void,
    ): MenuEntry => ({
      id,
      label: this.learning === id ? `${label} — jetzt drücken` : label,
      sub: this.learning === id ? 'Noch einmal antippen bricht ab' : sub,
      icon: 'settings',
      accent: this.learning === id ? 0xffc857 : accent,
      run: () => {
        this.stopLearning?.();
        if (this.learning === id) {
          this.learning = null;
          this.menuDirty = true;
          return;
        }
        this.learning = id;
        this.menuDirty = true;
        this.stopLearning = this.flat.captureNext((press) => {
          this.learning = null;
          this.stopLearning = null;
          // Ein Druck der falschen Sorte wird nicht eingebaut, sondern gesagt:
          // Wer eine Taste sucht und einen Knopf drückt, hat sich vertan, und
          // eine stumm verschluckte Eingabe erklärt das nicht.
          if (press.kind !== want) {
            this.notify(want === 'pad' ? 'Das war eine Taste, kein Knopf' : 'Das war ein Knopf');
          } else take(press);
          this.menuDirty = true;
        });
      },
    });

    const save = (next: InputConfig, said: string): void => {
      saveInputConfig(next);
      this.notify(said);
    };

    /** Was welcher Knopf am Pad tut. */
    const padRows: MenuEntry[] = PAD_ACTIONS.map((action) =>
      learn(
        `input:pad:${action}`,
        `${ACTION_LABELS[action].label}: ${padBindingText(config, action, key, count)}`,
        ACTION_LABELS[action].sub,
        'pad',
        (press) => {
          if (press.kind !== 'pad') return;
          if (!press.slot) {
            this.notify(`Knopf ${press.index} sitzt auf keiner bekannten Stelle`);
            return;
          }
          save(
            bindPad(inputConfig(), action, press.slot),
            `${ACTION_LABELS[action].label}: ${padButtonLabel(press.index, padKind(pad?.id))}`,
          );
        },
      ),
    );

    /** Und welche Taste. */
    const keyRows: MenuEntry[] = KEY_ACTIONS.map((action) =>
      learn(
        `input:key:${action}`,
        `${ACTION_LABELS[action].label}: ${keysFor(config, action).map(keyLabel).join(' · ') || 'keine Taste'}`,
        ACTION_LABELS[action].sub,
        'key',
        (press) => {
          if (press.kind !== 'key') return;
          save(
            bindKey(inputConfig(), action, press.code),
            `${ACTION_LABELS[action].label}: ${keyLabel(press.code)}`,
          );
        },
      ),
    );

    /**
     * **Die Gerätekarte**: eine Zeile je Stelle, und die Nummer daneben. Sie
     * gibt es nur mit Pad — ohne eines wäre sie achtzehn Zeilen über ein Gerät,
     * das niemand in der Hand hat.
     */
    const layout = config.layouts[key] ?? {};
    const mapRows: MenuEntry[] = pad
      ? PAD_BUTTONS.map((spec) => {
          const at = indexOf(layout, spec.slot, layoutSize(count));
          return learn(
            `input:map:${spec.slot}`,
            `${spec.labels[padKind(pad.id)]}: ${at === null ? 'kein Knopf' : `buttons[${at}]`}`,
            'Drück den Knopf, der wirklich hier sitzt',
            'pad',
            (press) => {
              if (press.kind !== 'pad') return;
              save(
                assignSlot(inputConfig(), key, press.index, spec.slot, count),
                `buttons[${press.index}] sitzt ${spec.labels[padKind(pad.id)]}`,
              );
            },
          );
        })
      : [];

    const changed = !isDefaultConfig(config);
    return {
      id: 'input',
      label: 'Eingaben',
      sub: changed ? 'Eigene Belegung' : 'Tastatur und Controller · Standard',
      icon: 'controller',
      accent,
      children: [
        this.liveInput,
        {
          id: 'input:bindings',
          label: 'Belegung am Pad',
          sub: 'Welcher Knopf was tut',
          icon: 'controller',
          accent,
          children: [
            ...padRows,
            {
              id: 'input:pad:reset',
              label: 'Pad und Tastatur auf Standard',
              sub: 'Die Gerätekarten bleiben — ein Treiberfehler ist kein Geschmack',
              icon: 'reset',
              accent: 0xffc857,
              run: () => {
                save(resetBindings(inputConfig()), 'Belegung auf Standard');
                this.menuDirty = true;
              },
            },
          ],
        },
        {
          id: 'input:keys',
          label: 'Belegung an der Tastatur',
          sub: 'Welche Taste was tut',
          icon: 'settings',
          accent,
          children: keyRows,
        },
        ...(pad
          ? [
              {
                id: 'input:map',
                label: 'Karte dieses Geräts',
                sub: 'Wenn ein Knopf woanders sitzt, als er meldet',
                icon: 'controller',
                accent,
                children: [
                  ...mapRows,
                  {
                    id: 'input:map:reset',
                    label: 'Karte dieses Geräts vergessen',
                    sub: 'Zurück auf das Standard-Mapping',
                    icon: 'reset',
                    accent: 0xffc857,
                    run: () => {
                      save(resetDevice(inputConfig(), key), 'Gerätekarte zurückgesetzt');
                      this.menuDirty = true;
                    },
                  },
                ],
              } satisfies MenuEntry,
            ]
          : []),
        {
          id: 'input:reset',
          label: 'Alles auf Standard',
          sub: changed ? 'Belegungen und Gerätekarten' : 'Es ist schon alles Standard',
          icon: 'reset',
          accent: changed ? 0xff6b5e : 0x6f7d99,
          run: () => {
            clearInputConfig();
            this.notify('Eingaben auf Standard');
            this.menuDirty = true;
          },
        },
      ],
    };
  }

  /**
   * How the body moves: sprinting on the left stick, ducking on the right one.
   * Both live here rather than in a world, because both are the engine's — a
   * world may change the ground under the player, never their legs.
   */
  private movementMenu(): MenuEntry {
    const rig = this.rig;
    const cycle = (): void => {
      this.menuDirty = true;
    };

    return {
      id: 'move',
      label: 'Bewegung',
      sub: `${rig.posture === 'sit' ? 'Sitzend' : 'Stehend'} · Sprint ${
        rig.sprintToggle ? 'umschalten' : 'halten'
      } · Ducken ${rig.crouchToggle ? 'umschalten' : 'halten'}`,
      icon: 'settings',
      accent: 0x5ee0a0,
      children: [
        {
          id: 'move:posture',
          label: rig.posture === 'sit' ? 'Haltung: Sitzen' : 'Haltung: Stehen',
          // The one thing WebXR cannot measure: a headset reports the head
          // above the room floor and has no idea whether there is a chair
          // under it. Sitting lifts the view back to standing height, so
          // counters, karts and horizons stay the size they were built at.
          sub: 'Sitzend wird die Sicht auf Stehhöhe angehoben',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.posture = rig.posture === 'sit' ? 'stand' : 'sit';
            savePlayerPosture(rig.posture);
            this.notify(rig.posture === 'sit' ? 'Sitzende Haltung' : 'Stehende Haltung');
            cycle();
          },
        },
        this.eyeMenu(),
        {
          id: 'move:sprint-mode',
          label: rig.sprintToggle ? 'Sprint: Umschalten' : 'Sprint: Halten',
          sub: 'Linken Stick reindrücken',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.sprintToggle = !rig.sprintToggle;
            this.notify(rig.sprintToggle ? 'Sprint schaltet um' : 'Sprint wird gehalten');
            cycle();
          },
        },
        {
          id: 'move:sprint-speed',
          label: `Sprint-Tempo ${rig.sprintFactor.toFixed(1)}×`,
          sub: 'Nochmal drücken für die nächste Stufe',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.sprintFactor = rig.sprintFactor >= 2.4 ? 1.4 : rig.sprintFactor + 0.25;
            cycle();
          },
        },
        {
          id: 'move:walk-facing',
          label:
            rig.walkFacing === 'head'
              ? 'Laufrichtung: Blickrichtung'
              : 'Laufrichtung: beim Loslaufen gemerkt',
          // Wer beim Gehen über die Schulter schaut, will nachsehen und nicht
          // abbiegen. Gemerkt heißt: Die Richtung steht, bis der Stick
          // losgelassen wird — der Kopf ist derweil frei (`walkFrame.ts`).
          sub: 'Ob der Kopf beim Gehen den Weg mitdreht',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.walkFacing = rig.walkFacing === 'head' ? 'start' : 'head';
            this.notify(
              rig.walkFacing === 'head'
                ? 'Laufrichtung folgt dem Blick'
                : 'Laufrichtung wird beim Loslaufen gemerkt',
            );
            cycle();
          },
        },
        {
          id: 'move:crouch-mode',
          label: rig.crouchToggle ? 'Ducken: Umschalten' : 'Ducken: Halten',
          sub: 'Rechten Stick reindrücken',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.crouchToggle = !rig.crouchToggle;
            this.notify(rig.crouchToggle ? 'Ducken schaltet um' : 'Ducken wird gehalten');
            cycle();
          },
        },
        {
          id: 'move:crouch-depth',
          label: `Duck-Tiefe ${Math.round(rig.crouchDepth * 100)} cm`,
          sub: 'Wie tief es nach unten geht',
          icon: 'settings',
          accent: 0x5ee0a0,
          run: () => {
            rig.crouchDepth = rig.crouchDepth >= 0.75 ? 0.3 : rig.crouchDepth + 0.15;
            cycle();
          },
        },
      ],
    };
  }

  /**
   * Wie hoch der Spieler steht und wie hoch er sitzt.
   *
   * Der Ausgleich für den Sessel hing lange an einer einzigen getippten Zahl —
   * 1,65 m für alle. Man merkt das nicht am Horizont, sondern am Tisch: ein
   * echter Schreibtisch mit 78 cm passt dann nicht auf einen virtuellen, der
   * auf 78 cm steht, weil der Boden unter dem Spieler um die Differenz falsch
   * liegt. Also zwei eigene Zahlen — und weil eine Augenhöhe etwas ist, das
   * die Brille besser weiß als der Mensch darin, gibt es zu jeder ein
   * **Jetzt messen**: hinstellen, drücken, fertig.
   *
   * **Die dritte Zahl misst niemand** — sie ist ein Wunsch und kein Körpermaß:
   * aus welcher Höhe man in der **Küche** schauen will. Die Küche ist mit
   * Absicht klein gebaut (`core/kitchenFit.ts`), und wer dort mit seinen
   * echten 1,65 m steht, schaut auf eine Puppenstube herab. Deshalb steht sie
   * ohne *Jetzt messen* hier — die Brille kann zu ihr nichts beitragen — und
   * mit einem eigenen, engeren Bereich (`KITCHEN_EYE_RANGE`).
   */
  private eyeMenu(): MenuEntry {
    const rig = this.rig;
    const accent = 0x5ee0a0;
    /** Die rohe Kopfhöhe der Brille über dem Zimmerboden, in Zentimetern. */
    const measured = (): number => Math.round(rig.camera.position.y * 100);
    const apply = (): void => {
      rig.seatHeight = seatedLift();
      rig.flatEyeHeight = eyeHeights().stand / 100;
      this.menuDirty = true;
    };

    /** Eine Raste in Fünferschritten — mit dem Bereich, der zu ihr gehört. */
    const knob = (
      key: keyof ReturnType<typeof eyeHeights>,
      title: string,
      sub: string,
      range: { min: number; max: number } = EYE_RANGE,
    ): MenuEntry => ({
      id: `move:eye-${key}`,
      label: `${title}: ${eyeHeights()[key]} cm`,
      sub: `${sub} · ${range.min} bis ${range.max} cm · +5 pro Druck`,
      icon: 'settings',
      accent,
      run: () => {
        const now = eyeHeights()[key];
        // Oben angekommen wieder unten anfangen: eine Raste, die am Ende
        // stehen bleibt, lässt einen die ganze Reihe rückwärts suchen.
        const next = now + 5 > range.max ? range.min : now + 5;
        const values = saveEyeHeights({ [key]: next });
        apply();
        this.notify(`${title}: ${values[key]} cm`);
      },
    });

    const step = (key: 'stand' | 'sit', title: string, sub: string): MenuEntry[] => [
      knob(key, title, sub),
      {
        id: `move:eye-${key}-measure`,
        label: `${title} jetzt messen`,
        sub: this.renderer.xr.isPresenting
          ? `Die Brille sagt gerade ${measured()} cm`
          : 'Geht nur mit aufgesetzter Brille',
        icon: 'reset',
        accent: 0x9fe3ff,
        run: () => {
          if (!this.renderer.xr.isPresenting) {
            this.notify('Dafür muss die Brille auf sein');
            return;
          }
          const values = saveEyeHeights({ [key]: measured() });
          apply();
          this.notify(`${title}: ${values[key]} cm gemessen`);
        },
      },
    ];

    return {
      id: 'move:eyes',
      label: 'Augenhöhe',
      sub: `Stehend ${eyeHeights().stand} cm · sitzend ${eyeHeights().sit} cm · Küche ${eyeHeights().kitchen} cm`,
      icon: 'settings',
      accent,
      children: [
        ...step('stand', 'Stehend', 'Augen über dem Zimmerboden, aufrecht'),
        ...step('sit', 'Sitzend', 'Dasselbe im Sessel'),
        knob('kitchen', 'In der Küche', 'Nur in der Brille, nur in der Küche', KITCHEN_EYE_RANGE),
        {
          id: 'move:eye-reset',
          label: 'Augenhöhen zurücksetzen',
          sub: `Zurück auf ${DEFAULT_EYES.stand}, ${DEFAULT_EYES.sit} und ${DEFAULT_EYES.kitchen} cm`,
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            saveEyeHeights({ ...DEFAULT_EYES });
            apply();
            this.notify('Augenhöhen zurückgesetzt');
          },
        },
      ],
    };
  }

  /**
   * **Aussehen** — was die anderen von einem sehen.
   *
   * Sie steht neben *Bewegung* und *Grafik* und aus demselben Grund: Eine
   * Figur gehört dem Spieler und keiner Welt. Wer im Hub eine Kochmütze
   * aufsetzt, trägt sie im Gokart auch, und alle im Raum sehen sie
   * (`net/NetSession.ts`).
   *
   * **Drei Zeilen, jede schaltet im Kreis** — Kopf, Hut, Körper. Vorher war es
   * eine Zeile je Hut, was bei sieben Hüten noch ging; mit Köpfen und Jacken
   * dazu wären es zwanzig gewesen, und das ist keine Seite mehr, sondern eine
   * Liste. Was gewählt ist, steht im Untertitel, und in aller Kürze noch
   * einmal unter der Überschrift (`appearanceSummary`). Dieselben drei Zeilen
   * zeigt die Umkleide vor dem Spiegel, dort mit der Figur daneben.
   */
  private appearanceMenu(): MenuEntry {
    const accent = 0x5ee0a0;
    const look = appearance();

    const cycle = (id: string, label: string, sub: string, step: () => string): MenuEntry => ({
      id,
      label,
      sub,
      icon: 'npc',
      accent,
      run: () => {
        const chosen = step();
        this.menuDirty = true;
        this.notify(`${label}: ${chosen}`);
      },
    });

    return {
      id: 'look',
      label: 'Aussehen',
      sub: appearanceSummary(look),
      icon: 'npc',
      accent,
      children: [
        cycle('look:head', 'Kopf', HEAD_SUBS[look.head], () => {
          const head = nextHead(look.head);
          saveAppearance({ head });
          return HEAD_LABELS[head];
        }),
        cycle('look:hat', 'Hut', HEADGEAR_SUBS[look.hat], () => {
          const hat = nextHeadgear(look.hat);
          saveAppearance({ hat });
          return HEADGEAR_LABELS[hat];
        }),
        cycle('look:body', 'Körper', BODY_SUBS[look.body], () => {
          const body = nextBody(look.body);
          saveAppearance({ body });
          return BODY_LABELS[body];
        }),
      ],
    };
  }

  /**
   * **Was auf dem Kopf sitzt** — die Einstellung, oder was eine Welt darüber
   * gelegt hat (`WorldContext.wear`).
   *
   * Ein Ort und nicht zwei: Der eigene Körper trägt es (sichtbar im Spiegel und
   * durch ein Portal), und dieselbe Sorte geht als Ansage an alle im Raum. Wer
   * das an zwei Stellen setzte, hätte irgendwann einen Spieler mit zwei
   * verschiedenen Hüten, je nachdem, wen man fragt.
   */
  /**
   * **Die Umkleide aufmachen** — je Ansicht auf einem anderen Weg
   * (`WorldContext.openWardrobe`, `worlds/grid/fixtures/wardrobe.ts`).
   *
   * Am Bildschirm ist es die Seite mit der Figur daneben
   * (`ui/WardrobeMenu.ts`). **In der Brille nicht**: Dort steht der Spiegel am
   * Schrank und zeigt einen selbst, und die drei Zeilen gibt es längst — unter
   * _Aussehen_ am Handgelenk. Ein zweites Canvas mit einer zweiten Figur davor
   * wäre ein Bild von einem Spiegel neben einem Spiegel, und es kostete einen
   * ganzen zweiten Renderer in der Sitzung, in der die Bilder am knappsten
   * sind.
   */
  private openWardrobe(): void {
    if (this.renderer.xr.isPresenting) {
      this.wristMenu.openSubmenu('look');
      return;
    }
    this.wardrobe.toggle(true);
  }

  private wear(kind: HeadgearKind | null): void {
    this.worn = kind;
    this.applyAppearance();
  }

  private dress(figure: string | null): void {
    this.dressed = figure;
    this.applyAppearance();
  }

  private applyAppearance(): void {
    const own = appearance();
    const look = { ...own, hat: this.worn ?? own.hat, figure: this.dressed ?? own.figure };
    this.avatar.setLook(look);
    const known = this.net.look;
    if (
      known.hat === look.hat &&
      known.head === look.head &&
      known.body === look.body &&
      known.figure === look.figure
    ) {
      return;
    }
    this.net.look = look;
    // Das Aussehen steht in der Vorstellung und nicht in der Pose: einmal
    // ansagen reicht, zwanzigmal in der Sekunde wäre Unfug.
    this.net.announce();
  }

  /**
   * **Grafik** — die experimentelle Seite.
   *
   * Sie steht hier oben neben *Bewegung* und nicht in den Einstellungen einer
   * Welt, und zwar aus demselben Grund: Eine Welt darf den Boden unter dem
   * Spieler ändern, nie aber seine Augen. Wer im Hub auf *Comic* stellt, will
   * es im Gokart genauso — und der Hub hat gar keine Weltmenüs, in die eine
   * Grafikeinstellung passte.
   *
   * Eine Zeile, und sie sagt dasselbe zweimal: was gerade gilt, und was ein
   * Druck daraus macht — der Modus schaltet im Kreis (Einfach → Comic). Was er
   * tatsächlich anstellt, steht in `core/graphicsSettings.ts`.
   */
  private graphicsMenu(): MenuEntry {
    const accent = 0xb98bff;
    const settings = graphics();
    // **Die Bildrate steht im Menü** — auch in der Brille, wo das F3-Feld
    // unsichtbar ist. Die Zeile wird alle halbe Sekunde nachgeschrieben,
    // solange das Menü offen ist (`frame`), ohne das ganze Menü neu zu bauen.
    this.fpsEntry = {
      id: 'gfx:fps',
      label: fpsLabel(this.frameStats.latest),
      sub: 'Mittel der letzten halben Sekunde · CPU misst nur JavaScript',
      icon: 'settings',
      accent: 0x6f7d99,
    };

    return {
      id: 'gfx',
      label: 'Grafik',
      sub: graphicsSummary(settings),
      icon: 'palette',
      accent,
      // Experimentell und als solches beschriftet: Der Comic kostet Bildrate,
      // und was auf einer Quest 2 noch flüssig ist, weiß niemand vorher.
      badge: 'EXP',
      children: [
        this.fpsEntry,
        {
          id: 'gfx:fps-hud',
          label: 'Bildrate im Bild',
          sub: 'Das kleine Feld unten rechts, auch am Telefon',
          caption: 'Am Schreibtisch auch mit F3',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.showFps,
          run: () => {
            const next = saveGraphics({ showFps: !graphics().showFps });
            this.frameStats.visible = next.showFps;
            this.menuDirty = true;
          },
        },
        {
          // **Wo man steht, als Zahl** — `core/positionHud.ts`. Das Feld
          // oben links unter dem Menüknopf; mit Metern, Kachel, Ebene und der
          // Adresse `?at=…`, die genau dorthin führt.
          id: 'gfx:position',
          label: 'Position zeigen',
          sub: 'x, z und Höhe in Metern · Kachel, Ebene und ?at=-Adresse',
          caption: 'Oben links · am Schirm und auf dem Telefon',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.showPosition,
          run: () => {
            const next = saveGraphics({ showPosition: !graphics().showPosition });
            this.positionHud.visible = next.showPosition;
            this.menuDirty = true;
          },
        },
        {
          // **Die Gitterlinien der eigenen Ebene** — gezeichnet von
          // `worlds/grid/GridWorld.ts`, und nur dort: Eine Welt ohne Kacheln
          // hat keine Kanten zu zeigen, und das Häkchen bleibt dort ohne
          // Wirkung, statt eine zweite Erklärung zu brauchen.
          id: 'gfx:grid-lines',
          label: 'Gitterlinien',
          sub: 'Die Kacheln der Ebene, auf der du stehst',
          caption: 'Hilft beim Bauen — in Welten ohne Gitter passiert nichts',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.gridLines,
          run: () => {
            saveGraphics({ gridLines: !graphics().gridLines });
            this.menuDirty = true;
          },
        },
        {
          // **Die Felder, auf denen die Figuren logisch stehen** — gezeichnet
          // von `worlds/grid/footprintView.ts`, in den Welten auf dem Gitter.
          id: 'gfx:cell-footprints',
          label: 'Belegte Felder',
          sub: 'Jede halbe Kachel auf dem Boden · grün frei, rot belegt, Pfeile an Treppen · dazu 2×2 unter jeder Figur',
          caption: 'Werkstattansicht — in Welten ohne Gitter passiert nichts',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.cellFootprints,
          run: () => {
            saveGraphics({ cellFootprints: !graphics().cellFootprints });
            this.menuDirty = true;
          },
        },
        {
          // **Die Umrisse der Physik** — gezeichnet von
          // `physics/HitboxView.ts`, in jeder Welt, die Physik hat. Sie liegen
          // ohne Tiefenprüfung über allem: Ein Umriss, den das Möbel verdeckt,
          // zu dem er gehört, beantwortet keine Frage.
          id: 'gfx:hitboxes',
          label: 'Hitboxen (3D)',
          sub: 'Die Körper der Physik als Drahtgitter · mit dem Kreis um den Spieler',
          caption: 'Liegt über allem · Werkstattansicht, kostet Bildrate',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.hitBoxes,
          run: () => {
            const next = saveGraphics({ hitBoxes: !graphics().hitBoxes });
            this.menuDirty = true;
            this.notify(next.hitBoxes ? 'Hitboxen (3D) an' : 'Hitboxen (3D) aus');
          },
        },
        {
          // **Die Zellen des Gitters** — gezeichnet von
          // `worlds/grid/cellHitboxView.ts`: rot belegt, grün frei, rote
          // Linien für geschlossene Kanten. Das, woran Spieler und NPCs
          // wirklich hängen bleiben, seit Wände nur noch über das Gitter
          // blocken.
          id: 'gfx:grid-hitboxes',
          label: 'Hitboxen (2D-Gitter)',
          sub: 'Jede halbe Kachel der Etage · rot belegt, grün frei, rote Linie: Wand, Pfeile an Treppen',
          caption: 'Liegt über allem · Werkstattansicht — in Welten ohne Gitter passiert nichts',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.gridHitBoxes,
          run: () => {
            const next = saveGraphics({ gridHitBoxes: !graphics().gridHitBoxes });
            this.menuDirty = true;
            this.notify(next.gridHitBoxes ? 'Hitboxen (2D) an' : 'Hitboxen (2D) aus');
          },
        },
        {
          // **Was das Wand-Ghosting sieht** — gezeichnet von
          // `worlds/grid/ghostView.ts`, von oben und in jeder Gitterwelt. Gelb
          // kann verdecken, rot ist gerade durchsichtig, weiß ist die Spalte
          // der Figur, in der gefragt wird.
          id: 'gfx:ghost-boxes',
          label: 'Ghosting zeigen',
          sub: 'Von oben: welche Wände durchsichtig werden können (gelb) und sind (rot)',
          caption: 'Liegt über allem · Werkstattansicht, nur in der Ansicht von oben',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.ghostBoxes,
          run: () => {
            const next = saveGraphics({ ghostBoxes: !graphics().ghostBoxes });
            this.menuDirty = true;
            this.notify(next.ghostBoxes ? 'Ghosting zeigen an' : 'Ghosting zeigen aus');
          },
        },
        {
          // **Die unsichtbaren Griffe** — gezeichnet von `core/handleView.ts`,
          // überall dort, wo ein Ding welche angemeldet hat
          // (`core/grabHandles.ts`). Ein Werkzeug zum Einmessen: Man sieht, wo
          // die Hand andockt, und erst dann lässt sich eine Zahl beurteilen.
          id: 'gfx:handles',
          label: 'Griffe zeigen',
          sub: 'Die unsichtbaren Griffstellen als Achsenkreuz · Pfannenstiel, Tellerrand, Feuerlöscher',
          caption: 'Zum Einmessen · ab Werk aus',
          icon: 'settings',
          accent: 0x6f7d99,
          checked: settings.showHandles,
          run: () => {
            const next = saveGraphics({ showHandles: !graphics().showHandles });
            this.menuDirty = true;
            this.notify(next.showHandles ? 'Griffe sichtbar' : 'Griffe unsichtbar');
          },
        },
        {
          // **Der Schalter, den der Besitzer wollte**: Schatten wie in
          // Overcooked, ohne dafür die ganze Zeichnung dazuzunehmen. Er steht
          // über dem Modus, weil er der ist, an dem man wirklich dreht —
          // hinauf für das Bild, hinunter für die Bildrate.
          id: 'gfx:shadows',
          label: 'Schatten',
          sub: 'Die Sonne wirft sie · das Grundlicht geht dafür etwas herunter',
          caption: 'Der erste Regler, wenn die Bildrate klemmt',
          icon: 'settings',
          accent,
          checked: settings.shadows,
          run: () => {
            const next = saveGraphics({ shadows: !graphics().shadows });
            this.menuDirty = true;
            this.notify(next.shadows ? 'Schatten an' : 'Schatten aus');
          },
        },
        this.animationMenu(accent),
        {
          id: 'gfx:mode',
          label: `Grafik-Modus: ${GRAPHICS_MODE_LABELS[settings.mode]}`,
          sub: GRAPHICS_MODE_SUBS[settings.mode],
          caption:
            'Einfach → Comic · alles sofort sichtbar, nur das schärfere Bild ab der nächsten Sitzung',
          icon: 'sphere',
          accent,
          run: () => {
            const next = saveGraphics({ mode: nextGraphicsMode(graphics().mode) });
            this.menuDirty = true;
            this.notify(`Grafik: ${GRAPHICS_MODE_LABELS[next.mode]}`);
          },
        },
        {
          id: 'gfx:xr-scale',
          label: `Brille: Auflösung ${XR_SCALE_LABELS[settings.xrScale]}`,
          sub: XR_SCALE_SUBS[settings.xrScale],
          caption: 'Voll → Mittel → Flüssig · gilt ab der nächsten VR-Sitzung, nur in der Brille',
          icon: 'sphere',
          accent,
          run: () => {
            const next = saveGraphics({ xrScale: nextXrScale(graphics().xrScale) });
            this.menuDirty = true;
            this.notify(
              `Brille: Auflösung ${XR_SCALE_LABELS[next.xrScale]} · ab der nächsten Sitzung`,
            );
          },
        },
        {
          // **Wann die Stöcke auf dem Glas liegen** (`index.html`, `#touch`).
          // Die Zeile stellt nur die Frage; die Antwort rechnet
          // `core/screenPads.ts`, und angewendet wird sie in `main.ts` — auch
          // sofort, denn `saveGraphics` sagt allen Bescheid, die zuhören.
          id: 'gfx:screen-pads',
          label: `Bildschirm-Steuerung: ${SCREEN_PADS_LABELS[settings.screenPads]}`,
          sub: SCREEN_PADS_SUBS[settings.screenPads],
          caption: 'Automatisch → An → Aus · in der Brille und in eigenen Welten nie',
          icon: 'settings',
          accent,
          run: () => {
            const next = saveGraphics({ screenPads: nextScreenPads(graphics().screenPads) });
            this.menuDirty = true;
            this.notify(`Bildschirm-Steuerung: ${SCREEN_PADS_LABELS[next.screenPads]}`);
          },
        },
        ...this.fullscreenRow(accent),
        {
          id: 'gfx:reset',
          label: 'Zurück auf Einfach',
          sub: 'Das Bild, das dieses Projekt immer hatte',
          icon: 'reset',
          accent: 0xffc857,
          run: () => {
            clearGraphics();
            this.menuDirty = true;
            this.notify('Grafik zurückgesetzt');
          },
        },
      ],
    };
  }

  /**
   * **Animationen** — eine Seite unter _Grafik_, und inzwischen stehen zwei
   * Bewegungen darauf.
   *
   * Eine eigene Seite und nicht zwei weitere Zeilen im Grafik-Menü, und das
   * ist Absicht: Die Zeilen darüber beantworten alle dieselbe Frage — was
   * kostet das Bild, und was zeigt es. Wie sich eine **Figur** bewegt, ist
   * eine andere, und sie wird nicht bei einer bleiben. Wer sie hier
   * hereinbringt, hängt sie an diese Seite und nicht an das Ende einer Liste,
   * die dann keine mehr ist.
   *
   * **Squishy Movement** ist die erste: Die Figur staucht und streckt sich
   * beim Laufen (`core/squish.ts`). Darunter **zwei** Faktoren, die im Kreis
   * schalten — **Stärke** (wie weit) und **Tempo** (wie oft) —, denn wie viel
   * davon gut aussieht, ist Geschmack und keine Rechnung, und diese Frage
   * beantwortet man am besten, indem man einmal durchklickt und hinsieht.
   * Zwei Zeilen und nicht eine: Ein Regler, der beides zugleich stellt, kann
   * ein zu schnelles Federn nur kleiner machen und nicht langsamer.
   *
   * **Darunter dieselben drei Zeilen noch einmal, für das Stehen**: _Atmen im
   * Stehen_, Stärke, Tempo. Genau dieselbe Aufteilung, weil es genau dieselbe
   * Frage ist — nur eben an einer Figur, die gerade nichts tut. Und genau
   * deshalb sind es sechs Zeilen und nicht vier: Ein gemeinsamer Schalter für
   * beide Bewegungen nähme einem die Wahl, im Stand zu leben und beim Laufen
   * ruhig zu bleiben, und ein gemeinsamer Regler für die Stärke machte aus
   * „tief atmen" ein „wie ein Gummiball laufen".
   *
   * **Und alle vier Regler gehen dieselbe Leiter**: ×0,25 bis ×2 in
   * Vierteln, acht Drücke im Kreis (`core/graphicsSettings.SQUISH_SCALES`).
   * Vier Regler mit drei verschiedenen Leitern wären vier, die man einzeln
   * lernen muss.
   */
  private animationMenu(accent: number): MenuEntry {
    const settings = graphics();
    return {
      id: 'gfx:anim',
      label: 'Animationen',
      sub: animationSummary(settings),
      icon: 'npc',
      accent,
      children: [
        {
          id: 'gfx:squish',
          label: 'Squishy-Bewegung',
          sub: 'Die Figur staucht und streckt sich beim Laufen',
          caption: 'Squash and Stretch · zu sehen von oben, im Spiegel und durch ein Portal',
          icon: 'npc',
          accent,
          checked: settings.squish,
          run: () => {
            const next = saveGraphics({ squish: !graphics().squish });
            this.menuDirty = true;
            this.notify(next.squish ? 'Squishy-Bewegung an' : 'Squishy-Bewegung aus');
          },
        },
        {
          id: 'gfx:squish-scale',
          label: `Stärke: ${SQUISH_SCALE_LABELS[settings.squishScale]}`,
          sub: SQUISH_SCALE_SUBS[settings.squishScale],
          caption: '×0,25 bis ×2 in Vierteln · wie weit die Figur federt',
          icon: 'sphere',
          accent,
          run: () => {
            const next = saveGraphics({ squishScale: nextSquishScale(graphics().squishScale) });
            this.menuDirty = true;
            this.notify(`Squishy-Stärke ${SQUISH_SCALE_LABELS[next.squishScale]}`);
          },
        },
        {
          // **Und wie oft** — die zweite Frage, und sie hat eine eigene Zeile
          // bekommen, weil die erste Fassung sie mit der Stärke beantworten
          // musste: Ein Federn je Schritt war zu schnell, und wer es ruhiger
          // wollte, konnte nur den Ausschlag kleiner machen, bis man gar
          // nichts mehr sah.
          id: 'gfx:squish-speed',
          label: `Tempo: ${SQUISH_SPEED_LABELS[settings.squishSpeed]}`,
          sub: SQUISH_SPEED_SUBS[settings.squishSpeed],
          caption: '×0,25 bis ×2 in Vierteln · wie oft sie es tut, gemessen am Schritt',
          icon: 'stopwatch',
          accent,
          run: () => {
            const next = saveGraphics({ squishSpeed: nextSquishSpeed(graphics().squishSpeed) });
            this.menuDirty = true;
            this.notify(`Squishy-Tempo ${SQUISH_SPEED_LABELS[next.squishSpeed]}`);
          },
        },
        {
          // **Und dasselbe noch einmal für das Stehen.** Drei Zeilen, genau
          // die drei darüber — Schalter, Stärke, Tempo —, und das ist keine
          // Verdopplung aus Bequemlichkeit: Wer die Figur beim Laufen federn
          // sieht und im Stand zur Statue erstarren, sieht genau an der
          // Stelle, an der er sie am längsten ansieht, dass sie tot ist. Die
          // Rechnung dahinter ist dieselbe, nur flacher und langsamer
          // (`core/squish.ts`, `IDLE_AMPLITUDE` und `IDLE_PERIOD`).
          id: 'gfx:idle-squish',
          label: 'Atmen im Stehen',
          sub: 'Die Figur hebt und senkt sich, während sie wartet',
          caption: 'Idle Squish · dieselbe Stauchung, nur flacher und langsamer',
          icon: 'npc',
          accent,
          checked: settings.idleSquish,
          run: () => {
            const next = saveGraphics({ idleSquish: !graphics().idleSquish });
            this.menuDirty = true;
            this.notify(next.idleSquish ? 'Atmen an' : 'Atmen aus');
          },
        },
        {
          id: 'gfx:idle-squish-scale',
          label: `Stärke: ${SQUISH_SCALE_LABELS[settings.idleSquishScale]}`,
          sub: IDLE_SQUISH_SCALE_SUBS[settings.idleSquishScale],
          caption: '×0,25 bis ×2 in Vierteln · wie tief die Figur atmet',
          icon: 'sphere',
          accent,
          run: () => {
            const next = saveGraphics({
              idleSquishScale: nextSquishScale(graphics().idleSquishScale),
            });
            this.menuDirty = true;
            this.notify(`Atem-Stärke ${SQUISH_SCALE_LABELS[next.idleSquishScale]}`);
          },
        },
        {
          id: 'gfx:idle-squish-speed',
          label: `Tempo: ${SQUISH_SPEED_LABELS[settings.idleSquishSpeed]}`,
          sub: IDLE_SQUISH_SPEED_SUBS[settings.idleSquishSpeed],
          caption: '×0,25 bis ×2 in Vierteln · ein Atemzug je drei Sekunden bei ×1',
          icon: 'stopwatch',
          accent,
          run: () => {
            const next = saveGraphics({
              idleSquishSpeed: nextSquishSpeed(graphics().idleSquishSpeed),
            });
            this.menuDirty = true;
            this.notify(`Atem-Tempo ${SQUISH_SPEED_LABELS[next.idleSquishSpeed]}`);
          },
        },
      ],
    };
  }

  /**
   * **Vollbild als Zeile im Menü** — keine Einstellung, sondern eine Handlung.
   *
   * Die beiden Knöpfe dafür gibt es längst (`index.html`, `#landing-full` und
   * `#hud-full`), und trotzdem fehlte etwas: Auf einem Telefon im Querformat
   * ist der Streifen mit dem Knopf genau das, was die Adresszeile verdeckt, und
   * wer das Menü offen hat, sucht nicht nach einem Knopf darunter. Dieselbe
   * Handlung steht deshalb auch hier — und damit in der Brille und auf der
   * Seite gleich, weil beide denselben Baum zeichnen.
   *
   * **Nichts davon liegt im Speicher.** Vollbild ist ein Zustand des Browsers,
   * kein Wert: `Esc` beendet es, die Systemtaste eines Fernsehers auch, und ein
   * gemerktes „ja" könnte beim nächsten Laden niemand einlösen — eine
   * Vollbildanfrage braucht eine frische Geste. Die Zeile liest deshalb jedes
   * Mal den Stand und beschriftet sich danach.
   *
   * **Wo der Browser es nicht erlaubt, steht die Zeile gar nicht erst da** —
   * dieselbe Entscheidung wie bei den zwei Knöpfen: Eine Zeile, die eine
   * Fähigkeit behauptet und nichts tut, ist schlimmer als keine.
   */
  private fullscreenRow(accent: number): MenuEntry[] {
    const doc = typeof document === 'undefined' ? null : document;
    if (!doc || !fullscreenSupported(doc, doc.documentElement)) return [];
    const on = fullscreenActive(doc);
    return [
      {
        id: 'gfx:fullscreen',
        label: on ? 'Vollbild beenden' : 'Vollbild',
        sub: on
          ? 'Zurück zum Fenster · Esc tut dasselbe'
          : 'Adresszeile und Systemleiste weg — ein Fünftel der Fläche mehr',
        caption: 'Kein gespeicherter Wert · gilt für dieses Fenster, bis es jemand beendet',
        icon: 'settings',
        accent,
        checked: on,
        run: () => {
          void toggleFullscreen(doc, doc.documentElement).then(() => {
            this.menuDirty = true;
          });
        },
      },
    ];
  }

  /**
   * Die Verbindung, wie sie in der Brille aussieht: der Raum-Code zum Vorlesen,
   * wer drin ist, dieselben Zuschauer-Schalter wie auf der Startseite — **und
   * der Weg hinein**.
   *
   * Getippt wurde der Code lange nur auf der flachen Seite, und das hieß: Brille
   * ab, Code eintippen, Brille auf, Sitzung neu starten. Wer schon drin war,
   * kam nicht mehr dazu. Jetzt hängt hier die Tastatur (`ui/KeyPanel.ts`), und
   * das Verbinden fasst nichts an außer der Verbindung selbst — keine Welt,
   * kein Standort, keine Sitzung. Man steht hinterher genau dort, wo man vorher
   * stand, nur eben nicht mehr allein.
   */
  private networkMenu(): MenuEntry {
    const children: MenuEntry[] = this.net.connected
      ? [
          {
            id: 'net:room',
            label: this.net.room,
            sub: `Raum-Code · ${this.net.statusDetail || this.net.status}`,
            accent: 0x4aa8ff,
          },
          this.nameEntry(),
          this.voiceEntry(),
          this.chatMenu(),
          this.spectateMenu(),
          {
            id: 'net:leave',
            label: 'Verbindung trennen',
            icon: 'close',
            accent: 0x6f7d99,
            run: () => this.disconnect(),
          },
        ]
      : [
          {
            id: 'net:join',
            label: 'Raum betreten',
            sub: rememberedRoom() ? `Zuletzt: ${rememberedRoom()}` : 'Raum-Code eintippen',
            icon: 'worlds',
            accent: 0x5ee0a0,
            run: () => this.askRoom(),
          },
          this.nameEntry(),
          this.chatMenu(),
          {
            id: 'net:dice',
            label: 'Neuen Raum aufmachen',
            sub: 'Würfelt einen Code und verbindet gleich',
            icon: 'reset',
            accent: 0x4aa8ff,
            run: () => void this.joinRoom(randomRoomCode()),
          },
        ];

    return {
      id: 'net',
      label: 'Verbindung',
      sub: this.net.connected ? `${this.net.room} · ${this.net.peers.size + 1} Spieler` : 'Offline',
      icon: 'worlds',
      accent: this.net.connected ? 0x5ee0a0 : 0x6f7d99,
      children,
    };
  }

  /**
   * Das Mikrofon: ein Schalter, und daneben steht, was Sache ist.
   *
   * Aus, bis jemand ihn drückt — ein Mikrofon, das mitläuft, weil man einem
   * Raum beigetreten ist, ist ein Fehler und keine Bequemlichkeit. Der Browser
   * fragt danach um Erlaubnis, und diese Frage soll auf einen Knopfdruck
   * folgen und nicht auf einen Raumbeitritt. Ein „nein" steht danach hier als
   * Antwort, statt dass der Knopf stumm nichts täte.
   */
  private voiceEntry(): MenuEntry {
    const voice = this.voice;
    const heard = voice.listening;
    const sub =
      voice.detail ||
      (voice.state === 'on'
        ? heard > 0
          ? `Offen · ${heard} Stimme${heard === 1 ? '' : 'n'} zu hören`
          : 'Offen · noch spricht niemand'
        : 'Aus · antippen fragt nach dem Mikrofon');
    return {
      id: 'net:voice',
      label: voice.state === 'on' ? 'Mikrofon: an' : 'Mikrofon: aus',
      sub,
      icon: 'worlds',
      accent: voice.state === 'on' ? 0x5ee0a0 : voice.state === 'blocked' ? 0xff6b5e : 0x6f7d99,
      run: () => {
        void this.voice.toggle().then(() => {
          this.menuDirty = true;
          if (this.voice.detail) this.notify(this.voice.detail);
          else this.notify(this.voice.state === 'on' ? 'Mikrofon offen' : 'Mikrofon aus');
        });
      },
    };
  }

  /**
   * Der Chat, wie ihn eine Brille braucht: **lesen und schreiben, nicht
   * verwalten**.
   *
   * Kopiert wird am PC. Eine Zeile Konfig-Code in der Brille abzulesen ist
   * dasselbe Elend, das sie ersetzen soll — deshalb stehen hier die letzten
   * Zeilen zum Nachsehen, und der Knopf darüber schreibt eine neue. Wer den
   * Code braucht, hat ihn drüben im Panel mit *Kopieren* daneben.
   */
  private chatMenu(): MenuEntry {
    const latest = this.chat.latest(CHAT_ROWS);
    const lines: MenuEntry[] = latest.map((entry) => ({
      id: `net:chat:${entry.id}`,
      label: entry.note ? `${entry.name} · ${entry.note}` : entry.name,
      sub: entry.kind === 'code' ? `${entry.text} · Übernehmen` : entry.text,
      accent: entry.mine ? 0x5ee0a0 : entry.kind === 'code' ? 0xffc857 : 0x4aa8ff,
      // Nur ein Code tut etwas. Eine Zeile Text ist eine Zeile Text.
      run: entry.kind === 'code' ? () => void this.applyChatCode(entry) : undefined,
    }));

    return {
      id: 'net:chat',
      label: 'Chat',
      sub: this.chat.size
        ? chatNotice(this.chat.entries[this.chat.size - 1]!)
        : 'Noch nichts gesagt',
      icon: 'chat',
      accent: 0x9fe3ff,
      children: [
        {
          id: 'net:chat:write',
          label: 'Schreiben',
          sub: 'Tastatur vor dir',
          icon: 'chat',
          accent: 0x5ee0a0,
          run: () =>
            this.openKeys({
              title: 'Chat',
              sub: this.net.connected ? `Raum ${this.net.room}` : 'Noch niemand verbunden',
              layout: 'name',
              onCommit: (text) => void this.say(text),
            }),
        },
        ...lines.reverse(),
      ],
    };
  }

  /** Der eigene Name — vor dem Verbinden wie danach zu ändern. */
  private nameEntry(): MenuEntry {
    const name = this.net.connected ? this.net.name : rememberedName();
    return {
      id: 'net:name',
      label: 'Name',
      sub: name || defaultName(this.role),
      icon: 'glove',
      accent: 0x9fe3ff,
      run: () =>
        this.openKeys({
          title: 'Name',
          sub: 'Wie die anderen dich sehen',
          value: name,
          layout: 'name',
          onCommit: (text) => this.setPlayerName(text),
        }),
    };
  }

  /** Die Tastatur für den Raum-Code, mit dem letzten schon darin. */
  private askRoom(): void {
    this.openKeys({
      title: 'Raum-Code',
      sub: 'Wer denselben Code tippt, landet im selben Raum',
      value: rememberedRoom(),
      layout: 'text',
      hint: 'Buchstaben, Ziffern und Bindestriche — z. B. mond-riff-47',
      onCommit: (text) => void this.joinRoom(text),
    });
  }

  /**
   * Verbinden von innen — und **nur** verbinden.
   *
   * Kein Weltwechsel, kein Sprung an einen Startpunkt, kein Ende der Sitzung:
   * wer sich mitten im Spiel dazuschaltet, steht danach an derselben Stelle.
   * Das ist der ganze Punkt an der Sache — es läuft ohnehin immer so, als wäre
   * man in einem Raum, nur dass ohne Gegenüber nichts hinausgeht.
   */
  private async joinRoom(code: string): Promise<void> {
    // `?net=local` gilt auch hier: Wer zum Entwickeln zwei Tabs benutzt, will
    // das nicht nur für den Knopf auf der Startseite, sondern auch für das
    // Menü in der Brille und für Welten, die sich selbst einen Raum suchen
    // (`WorldContext.join`).

    const room = normalizeRoomCode(code);
    if (!room) {
      this.notify('Kein gültiger Raum-Code');
      return;
    }
    this.notify(`Verbinde mit ${room} …`);
    try {
      await this.connect({ room, name: rememberedName(), local: this.preferLocal });
      rememberRoom(room);
      this.notify(`Im Raum ${room}`);
    } catch (error) {
      this.notify(`Verbindung fehlgeschlagen: ${(error as Error).message}`);
    }
    this.menuDirty = true;
    this.hooks.onNetChanged?.();
  }

  /**
   * Der Name, überall zugleich: im Speicher, in der Sitzung, bei den anderen.
   * Öffentlich, weil auch die Startseite ihn mitten in einer Verbindung
   * ändern darf (Haunting: verbunden, dann den Namen doch noch korrigiert).
   */
  setPlayerName(text: string): void {
    const name = text.trim();
    rememberName(name);
    this.net.name = name || defaultName(this.role);
    // Die anderen tragen den alten noch — ein `hello` schiebt den neuen nach.
    this.net.announce();
    this.menuDirty = true;
    this.hooks.onNetChanged?.();
    this.notify(`Name: ${this.net.name}`);
  }

  /** Legt die Tastatur eine Armlänge vor den Kopf und macht sie auf. */
  private openKeys(request: KeyPanelRequest): void {
    // Ohne Brille trägt die Seite das Menü, und die läge über der Tastatur in
    // der Szene — am Telefon über der ganzen unteren Hälfte. Also geht das
    // Menü zu; die Tastatur steht danach frei vor der Kamera.
    if (!this.renderer.xr.isPresenting) this.wristMenu.toggle(false);
    this.rig.getHeadMatrix(_head);
    _keyPosition.setFromMatrixPosition(_head);
    _keyRotation.setFromRotationMatrix(_head);
    // Etwas unter Augenhöhe und nach hinten gekippt: eine Tastatur, kein Schild.
    this.keys.position
      .copy(_keyPosition)
      .add(_keyOffset.set(0, -0.18, -0.55).applyQuaternion(_keyRotation));
    this.keys.quaternion.copy(_keyRotation);
    this.keys.rotateX(-0.35);
    this.keys.open(request);
  }

  /**
   * Pick a player, pick a view. Identical on both sides of the session — in a
   * headset the view only borrows the other player's position, never their
   * head rotation, which is what keeps it watchable.
   */
  private spectateMenu(): MenuEntry {
    const settings = this.spectator.settings;
    // Der Ausgesuchte und nicht der Sichtbare: Wer gerade in einer anderen
    // Welt steht, ist der, dem zugesehen wird — das Menü soll ihn währenddessen
    // nicht abwählen, sondern zeigen, wo er ist.
    const target = this.watched;
    const presenting = this.renderer.xr.isPresenting;

    const players: MenuEntry[] = [...this.net.peers.values()].map((peer) => ({
      id: `net:peer:${peer.id}`,
      label: peer.name,
      sub: `${ROLE_LABELS[peer.role]} · ${findWorld(peer.world)?.title ?? peer.world}`,
      accent: peer.id === target?.id ? 0x5ee0a0 : 0x4aa8ff,
      checked: peer.id === target?.id,
      run: () => this.spectate(settings.targetId === peer.id ? null : peer.id),
    }));

    if (!players.length) {
      players.push({
        id: 'net:empty',
        label: 'Noch alleine',
        sub: 'Warte auf Mitspieler',
        accent: 0x6f7d99,
      });
    }

    const mode = (id: SpectatorMode, label: string, sub: string): MenuEntry => ({
      id: `net:mode:${id}`,
      label,
      sub,
      accent: settings.mode === id ? 0x5ee0a0 : 0x4aa8ff,
      checked: settings.mode === id,
      run: () => {
        this.spectator.setMode(id);
        this.menuDirty = true;
        this.hooks.onNetChanged?.();
      },
    });

    return {
      id: 'net:spectate',
      label: 'Zuschauen',
      sub: target ? `${target.name} · ${MODE_LABELS[settings.mode]}` : MODE_LABELS[settings.mode],
      icon: 'worlds',
      accent: settings.mode === 'free' ? 0x6f7d99 : 0x5ee0a0,
      children: [
        {
          id: 'net:players',
          label: 'Spieler wählen',
          sub: target ? target.name : 'Automatisch (erster VR-Spieler)',
          icon: 'worlds',
          accent: 0x4aa8ff,
          children: players,
        },
        mode('free', 'Frei', 'Selber laufen'),
        mode('first', 'First Person', presenting ? 'Auf seiner Position' : 'Durch seine Augen'),
        mode('third', 'Third Person', 'Von hinten über die Schulter'),
        {
          id: 'net:distance',
          label: `Abstand ${settings.distance.toFixed(1)} m`,
          sub: 'Weiter weg — nochmal für näher dran',
          icon: 'settings',
          accent: 0x4aa8ff,
          run: () => {
            const next = settings.distance >= 6 ? 1.2 : settings.distance + 1.2;
            settings.distance = next;
            this.menuDirty = true;
            this.hooks.onNetChanged?.();
          },
        },
        {
          id: 'net:center',
          label: 'Ansicht zentrieren',
          sub: 'Gedrehte Kamera zurücksetzen',
          icon: 'reset',
          accent: 0x6f7d99,
          run: () => this.spectator.recenter(),
        },
      ],
    };
  }

  /**
   * Hands the view back to the player. On a flat screen the spectator only
   * moved the camera inside the rig, so putting it back on the eye point is
   * enough; in VR the rig itself travelled and the body has to catch up to it.
   */
  private releaseCamera(): void {
    if (this.renderer.xr.isPresenting) {
      // The rig was dragged along behind the watched player; put the body back
      // together where it now stands instead of snapping it home.
      this.rig.paused = false;
      this.rig.locomotion.resync?.(this.rig);
      return;
    }
    this.camera.position.set(0, this.rig.flatEyeHeight, 0);
    this.camera.rotation.set(0, 0, 0);
    this.flat.syncFromRig();
  }

  private selectWorld(id: string): void {
    this.wristMenu.toggle(false);
    void this.goTo(id);
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.topDownCamera.setAspect(width / height);
    this.resizeWebBuffer();
  };

  /** Bound web fill cost in the station; XR keeps its own framebuffer settings. */
  private resizeWebBuffer(): void {
    if (this.renderer.xr.isPresenting) return;
    const cap = this.worldId === 'haunting' ? 1.25 : 2;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, cap));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
  }

  private onSessionStart = (): void => {
    this.frameStats.setImmersive(true);
    this.positionHud.setImmersive(true);
    this.role = 'vr';
    // Ab jetzt tragen die Handgelenke das Menü, nicht die Seite.
    this.wristMenu.presenting = true;
    // Und in der Brille gibt es die Karte von oben nicht: Man steht darin.
    this.applyView();
    // Ab jetzt darf eine Texteingabe die Tastatur des Geräts anfordern: Im
    // Browserfenster gibt es dafür die echte Tastatur, in der Brille nicht.
    setImmersive(true);
    this.flat.enabled = false;
    this.rig.camera.rotation.set(0, 0, 0);
    // The camera moved inside the rig while spectating flat; the headset owns
    // that pose from now on, so hand it back before the session takes over.
    this.camera.position.set(0, this.rig.flatEyeHeight, 0);
    this.camera.rotation.set(0, 0, 0);
    this.spectator.recenter();
    this.net.role = 'vr';
    this.net.announce();
    this.hooks.onSessionChanged?.(true);
  };

  private onSessionEnd = (): void => {
    this.frameStats.setImmersive(false);
    this.positionHud.setImmersive(false);
    this.resizeWebBuffer();
    this.role = detectFlatRole();
    this.wristMenu.presenting = false;
    this.applyView();
    setImmersive(false);
    if (this.rig.paused) {
      // Spectating in VR carried the rig around; the body has to catch up.
      this.rig.paused = false;
      this.rig.locomotion.resync?.(this.rig);
    }
    this.flat.enabled = true;
    this.flat.syncFromRig();
    this.net.role = this.role;
    this.net.announce();
    this.hooks.onSessionChanged?.(false);
  };

  /** Welche Fehler ein Bild schon geworfen hat, und wie oft (`frameFailed`). */
  private readonly frameErrors = new Map<string, number>();

  /**
   * **Ein Fehler in einem Bild friert die Brille nicht mehr ein.**
   *
   * `setAnimationLoop` bestellt das nächste Bild erst, nachdem dieses
   * durchgelaufen ist. Eine Ausnahme irgendwo im Bild — in der Welt, im Rig,
   * in der Physik — heißt deshalb: kein nächstes Bild, nie wieder. Am
   * Bildschirm steht dann der Fehler in der Konsole; in der Brille steht
   * gar nichts, das Bild bleibt stehen, und der Ton (Web Audio, eigener
   * Faden) läuft weiter, als wäre nichts. Genau so sah der Befund aus:
   * „Ton gehört, Bild eingefroren".
   *
   * Hier wird der Fehler gefangen, einmal in die Konsole und ans Handgelenk
   * geschrieben (`notify`), und die Schleife läuft weiter. Ein Fehler, der
   * jedes Bild wiederkommt, kommt alle paar Sekunden noch einmal ins
   * Protokoll, nicht siebzigmal je Sekunde. Das ersetzt keine Ursache — es
   * macht sie sichtbar, wo vorher nur ein stehendes Bild war.
   */
  private frame = (time: number): void => {
    try {
      this.step(time);
    } catch (error) {
      this.frameFailed(error);
    }
  };

  private frameFailed(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    const seen = (this.frameErrors.get(message) ?? 0) + 1;
    this.frameErrors.set(message, seen);
    if (seen === 1) {
      console.error('[app] Fehler im Bild — die Schleife läuft weiter', error);
      this.notify(`Fehler im Bild: ${message}`);
    } else if (seen % 300 === 0) {
      console.error(`[app] Fehler im Bild, ${seen}× — ${message}`);
    }
  }

  private step(time: number): void {
    const started = performance.now();
    this.renderer.info.reset();
    const seconds = time / 1000;
    const dt =
      this.lastTime === 0 ? 1 / 60 : THREE.MathUtils.clamp(seconds - this.lastTime, 0, 0.05);
    this.lastTime = seconds;
    this.elapsed += dt;
    const presenting = this.renderer.xr.isPresenting;

    this.input.update();
    this.handVisuals.update(dt);

    // One frame behind the spectator on purpose: the flat controls run before
    // the world, the spectator after it.
    // **Die offene Umkleide hält die Beine an.** Sie liegt über dem Bild, und
    // wer darin mit den Pfeiltasten blättert, soll nicht nebenbei durch die
    // Wand laufen — die Seite fängt Finger und Maus ohnehin ab, die Tastatur
    // hört aber am Fenster mit (`FlatControls`).
    this.flat.enabled = !presenting && !this.spectating && !this.wardrobe.isOpen;
    if (!presenting) this.flat.update(dt);
    // Zeigt eine Hand aufs offene Menü und blättert dort, gehört ihr Stick
    // dem Menü — sonst läuft man beim Suchen einer Zeile durch den Raum.
    this.rig.menuStick = this.wristMenu.scrollHand;
    this.rig.update(dt, this.input, presenting, this.pointer.hovering);

    const context = this.context;
    this.world?.update(dt, context);

    // The spectator borrows the view after the world had its say, so it can
    // follow a player that a portal just moved.
    const watched = this.watched;
    // Nobody left to watch — hand the view back instead of freezing it. A
    // target that is only briefly missing (loading their world) is kept.
    const wanted = this.spectator.settings.targetId;
    const reachable = wanted ? this.net.peers.has(wanted) : this.net.peers.size > 0;
    if (this.spectator.following && !reachable) {
      this.spectator.setMode('free');
      this.menuDirty = true;
    }
    // Und wechselt der Beobachtete die Welt, geht das Zusehen mit — danach
    // erst steht fest, ob es hier eine Pose von ihm zu übernehmen gibt.
    this.followWatched(watched);
    const target = this.spectatorTarget;
    const following = this.spectator.update(dt, target?.pose ?? null, presenting);
    this.avatars.hiddenPeer =
      following && this.spectator.settings.mode === 'first' ? (target?.id ?? null) : null;

    // Whoever is watching somebody else is a camera, not a player: the others
    // must not see a body standing around while its owner is spectating.
    this.net.visible = !following;

    if (this.spectating && !this.spectator.following) this.releaseCamera();
    if (this.spectating !== this.spectator.following) {
      this.spectating = this.spectator.following;
      // Zuschauen schaltet die Ansicht von oben ab und danach wieder an
      // (`topDown`) — die Figur muss ihren Kopf entsprechend nachdrehen.
      this.applyView();
    }
    // In VR the rig itself is carried around, so freeze walking and gravity
    // while it is — otherwise the character controller fights the camera.
    // A world may freeze the body too (the drone flies the view away).
    this.rig.paused = (this.spectating && presenting) || this.rig.frozen;

    this.rig.getHeadMatrix(_head);
    _headLocal.copy(this.rig.matrixWorld).invert().multiply(_head);
    this.avatar.updateFromRig(dt, this.rig, this.input, _headLocal);
    this.wristMenu.update(dt, this.input, _head);
    this.pointer.update(this.input, presenting);
    this.net.update(dt, this.rig, this.input, this.elapsed);
    this.avatars.update(dt);
    // Nach den Avataren: die Stimme sitzt am Kopf, und der steht erst jetzt.
    this.voice.update(dt, this.camera, this.avatars);
    if (this.menuDirty) this.refreshMenu();

    // Vor allem, was zeichnet: Der Schattenkasten steht um den Kopf, und die
    // Schattenkarte wird einmal fürs ganze Bild bestellt — Spiegel und
    // Portalsichten zeichnen die Szene ja gleich noch mehrmals.
    this.quality.update(dt, _headPos.setFromMatrixPosition(_head));
    this.updateToolButton(presenting);

    // **Von oben ist dieselbe Szene, nur aus einer anderen Kamera.** Früher
    // wurde hier gar nichts gezeichnet, weil eine zweite, gemalte Welt auf
    // einer Leinwand darüber ihr eigenes Bild hatte; jetzt gibt es nur noch
    // die eine Welt, und die Kamera schräg darüber ist ihr Blickwinkel.
    //
    // Sie wandert deshalb auch durch den Weltkontext: Eine Welt, die ihr Bild
    // selbst zeichnet (`World.render` — die Portalwelt mit ihren Sichten und
    // Werkzeugbildern), soll **diese** Kamera zeichnen und nicht die erste
    // Person. Sonst stünde von oben ein Portal voller Aussicht aus einem
    // Blickwinkel, den gerade niemand hat.
    if (this.topDown) this.topDownCamera.update(dt, this.rig, this.world?.viewLevel?.() ?? null);
    const view = this.topDown ? this.topDownCamera.camera : this.camera;
    const viewContext = this.topDown ? { ...context, camera: view } : context;
    // **Und von oben wird aufgeschnitten** (`core/cutaway.ts`, Plan E8): Was
    // über der Ebene des Rigs liegt, ist für dieses eine Bild unsichtbar —
    // sonst sähe die Kamera schräg darüber nur Decken und Dächer. Danach kommt
    // alles wieder her, und zwar **immer**: In der Brille und aus den Augen
    // soll nichts fehlen, auch wenn mitten im Bild umgeschaltet wurde.
    if (this.topDown) this.topDownCamera.cut(this.scene);
    // Vor dem Bild, in dem sie zu sehen sind — und vor den Portalsichten, die
    // sich die Welt gleich selbst zeichnet.
    this.mirrors.render(this.scene, view);
    const rendered = this.world?.render?.(viewContext) ?? false;
    if (!rendered) this.renderer.render(this.scene, view);
    this.topDownCamera.uncut();
    this.positionHud.update(
      dt,
      this.rig.position.x,
      this.rig.position.y,
      this.rig.position.z,
      this.world?.viewLevel?.()?.level ?? null,
    );
    const sample = this.frameStats.update(
      time,
      performance.now() - started,
      this.renderer.info.render,
      '',
    );
    // Die Zeile im Grafik-Menü nachschreiben, solange jemand hinsieht — nur
    // die Zeile, nicht das Menü: Ein Neubau je halbe Sekunde wäre selbst ein
    // Ruckler.
    if (sample && this.fpsEntry && this.wristMenu.isOpen) {
      this.fpsEntry.label = fpsLabel(sample);
      this.wristMenu.refresh();
    }
    // **Und dieselbe Zeile für die Eingaben** (`inputsMenu`): Wer eine
    // Belegung einstellt, will sehen, dass sein Knopf überhaupt ankommt —
    // ohne diese Rückmeldung stellt man blind ein. Wieder nur die Zeile und
    // nicht der Baum, und nur solange jemand hinsieht.
    if (this.liveInput && this.wristMenu.isOpen) {
      const pad = firstGamepad(
        typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
          ? navigator.getGamepads()
          : null,
      ) as (GamepadLike & { id?: string }) | null;
      const line = livePadLabel(pad, inputConfig());
      if (line !== this.liveInput.label) {
        this.liveInput.label = line;
        this.wristMenu.refresh();
      }
    }
  }
}

/**
 * **Was gerade am Pad anliegt, in einer Zeile** — die Rückmeldung, ohne die
 * man blind einstellt. Genannt werden Nummer **und** Aufschrift: Die eine
 * findet man im Code wieder, die andere auf dem Gerät in der Hand.
 */
function livePadLabel(pad: (GamepadLike & { id?: string }) | null, config: InputConfig): string {
  if (!pad) return 'Kein Pad';
  const snapshot = padSnapshot(pad);
  const down = snapshot.pressed.map((button) => `${button.icon} ${button.code}`);
  if (down.length) return down.join(' · ');
  // Kein Knopf — dann sagen die Sticks, ob überhaupt etwas ankommt.
  const frame = readGamepad(pad);
  const move = Math.hypot(frame.move.x, frame.move.y);
  const aim = Math.hypot(frame.aim.x, frame.aim.y);
  if (move > 0 || aim > 0) return `Stick ${move > aim ? 'links' : 'rechts'} ausgelenkt`;
  return config.layouts[deviceKey(pad.id)] ? 'Nichts gedrückt · eigene Karte' : 'Nichts gedrückt';
}

/**
 * Wie eine Pad-Belegung im Menü dasteht: die Aufschrift des Geräts und die
 * Nummer, die dieses Gerät dafür meldet — beides, denn genau ihr Auseinanderfallen
 * ist der Fehler, um den es hier geht.
 */
function padBindingText(
  config: InputConfig,
  action: PadAction,
  key: string,
  count: number,
): string {
  const layout = config.layouts[key] ?? {};
  const kind = padKind(key);
  const parts = padSlotsFor(config, action).map((slot) => {
    const at = indexOf(layout, slot, layoutSize(count));
    const label = padSlotLabel(slot, kind);
    return at === null ? `${label} (hat dieses Pad nicht)` : `${label} [${at}]`;
  });
  return parts.join(' · ') || 'kein Knopf';
}

/** Die Bildraten-Zeile des Grafik-Menüs. */
function fpsLabel(sample: FrameSample | null): string {
  if (!sample) return 'Bildrate: wird gemessen …';
  return `Bildrate: ${sample.fps.toFixed(0)} FPS · ${sample.frameMs.toFixed(1)} ms · CPU ${sample.cpuMs.toFixed(1)} ms · ${sample.calls.toFixed(0)} Draws`;
}

const ROLE_LABELS: Record<PlayerRole, string> = {
  vr: 'VR',
  desktop: 'Desktop',
  handheld: 'Handy',
};

const MODE_LABELS: Record<SpectatorMode, string> = {
  free: 'Frei',
  first: 'First Person',
  third: 'Third Person',
};

/**
 * Peers behind a symmetric NAT cannot reach each other directly and need a
 * relay. Set `VITE_TURN_URL` (plus user/credential) at build time to add one —
 * everything else works without any server of ours.
 */
function envTurnConfig(): TurnServerConfig[] | null {
  const urls = import.meta.env['VITE_TURN_URL'];
  if (!urls) return null;
  return [
    {
      urls,
      username: import.meta.env['VITE_TURN_USER'] ?? '',
      credential: import.meta.env['VITE_TURN_CREDENTIAL'] ?? '',
    },
  ];
}

function defaultName(role: PlayerRole): string {
  return role === 'vr' ? 'VR-Spieler' : role === 'handheld' ? 'Handy' : 'Desktop';
}

/** Wie viele Chat-Zeilen im Menü der Brille stehen. */
const CHAT_ROWS = 8;

/**
 * Was auf dem Schild am Handgelenk landet, wenn eine Zeile ankommt.
 *
 * Ein Konfig-Code steht dort **nicht**: 24 Zeichen aus einem Alphabet ohne
 * Bedeutung sind in einer Brille nicht zu lesen und erst recht nicht zu
 * merken. Die Meldung sagt, *dass* einer da ist und wofür — abgeholt wird er am
 * PC, dafür ist er ja geschickt worden.
 */
function chatNotice(entry: ChatEntry): string {
  if (entry.kind !== 'code') return `${entry.name}: ${entry.text}`;
  const what = entry.note ? ` (${entry.note})` : '';
  return `${entry.name}: Konfig-Code${what} · ${entry.text.length} Zeichen`;
}
