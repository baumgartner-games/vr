import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';
import { XRInput } from './XRInput';
import { Pointer } from './Pointer';
import { FlatControls } from './FlatControls';
import { HandVisuals } from './HandVisuals';
import { PlayerAvatar } from './PlayerAvatar';
import { FreeLocomotion } from './Locomotion';
import { WristMenus } from '../ui/WristMenus';
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
import { detectFlatRole } from './device';
import { GraphicsQuality } from './GraphicsQuality';
import { FrameStats } from './FrameStats';
import { appearance, appearanceSummary, onAppearanceChange, saveAppearance } from './appearance';
import { HEADGEAR_KINDS, HEADGEAR_LABELS, HEADGEAR_SUBS, type HeadgearKind } from './headgear';
import {
  GRAPHICS_MODE_LABELS,
  GRAPHICS_MODE_SUBS,
  clearGraphics,
  graphics,
  graphicsSummary,
  nextGraphicsMode,
  saveGraphics,
} from './graphicsSettings';
import {
  DEFAULT_EYES,
  EYE_RANGE,
  eyeHeights,
  saveEyeHeights,
  savePlayerPosture,
  seatedLift,
} from './posture';
import { DEFAULT_WORLD, WORLDS, findWorld } from '../worlds';
import { applyGearConfig, parseGearCode } from '../worlds/portal/tools/gearConfig';
import { MirrorRenderer } from '../worlds/shared/Mirror';
import { setImmersive } from './systemKeyboard';
import type { PlayerRole, World, WorldContext } from './types';
import type { MenuEntry } from '../ui/menu';
import type { Peer } from '../net/NetSession';
import type { TurnServerConfig } from '@trystero-p2p/core';

export interface AppHooks {
  onWorldChanged?(id: string, title: string): void;
  onSessionChanged?(presenting: boolean): void;
  onNotify?(message: string): void;
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
  readonly net = new NetSession();
  readonly spectator: SpectatorCamera;

  private readonly handVisuals: HandVisuals;
  private readonly avatar: PlayerAvatar;
  /**
   * Was eine Welt dem Spieler gerade aufgesetzt hat (`WorldContext.wear`), oder
   * `null` — dann gilt die Einstellung (`core/appearance.ts`).
   */
  private worn: HeadgearKind | null = null;
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
  private elapsed = 0;
  private lastTime = 0;
  private role: PlayerRole;
  /** Something changed a menu label or row; the tree is rebuilt next frame. */
  private menuDirty = false;
  private spectating = false;
  /**
   * In welcher Welt der Beobachtete zuletzt stand — `''`, solange niemandem
   * zugesehen wird. Der Merker, an dem `followWatched` einen **Wechsel**
   * erkennt statt bloß einen Unterschied.
   */
  private watchedWorld = '';

  constructor(canvas: HTMLCanvasElement, stickEl: HTMLElement | null, hooks: AppHooks = {}) {
    this.hooks = hooks;
    this.role = detectFlatRole();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      // Durchsichtig **können** muss der Puffer, sonst liegt im
      // Passthrough-Bild ein schwarzes Tuch über dem Zimmer (`seeThrough.ts`).
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
    // One reset per complete frame, so diagnostics include mirrors and portals.
    this.renderer.info.autoReset = false;
    this.rig = new PlayerRig(this.renderer, this.camera);
    this.scene.add(this.rig);

    this.input = new XRInput(this.renderer, this.rig);
    this.pointer = new Pointer(this.rig, canvas);
    this.flat = new FlatControls(this.rig, canvas, stickEl);

    this.handVisuals = new HandVisuals(this.input);
    this.rig.add(this.handVisuals);

    this.avatar = new PlayerAvatar();
    this.rig.add(this.avatar);

    this.wristMenu = new WristMenus(this.pointer, {
      title: 'Menü',
      footer: 'Andere Hand: zielen + Trigger/A',
    });
    this.rig.add(this.wristMenu);
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
      elapsed: this.elapsed,
      goTo: (id: string) => void this.goTo(id),
      join: (room: string) => void this.joinRoom(room),
      notify: (message: string) => this.notify(message),
      refreshWorldMenu: () => {
        this.worldMenu = this.world?.menu?.() ?? [];
        this.menuDirty = true;
      },
      say: (text, options) => void this.say(text, options),
      wear: (kind) => this.wear(kind),
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
    } catch (error) {
      console.error(`[app] Welt "${id}" konnte nicht geladen werden`, error);
      this.notify(`Fehler beim Laden von ${definition.title}`);
      this.hooks.onWorldFailed?.(definition.id, error);
    } finally {
      if (token === this.loadToken) this.loading = null;
    }
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

  notify(message: string): void {
    this.wristMenu.setStatus(message);
    this.hooks.onNotify?.(message);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this.onResize);
    this.renderer.xr.removeEventListener('sessionstart', this.onSessionStart);
    this.renderer.xr.removeEventListener('sessionend', this.onSessionEnd);
    this.unloadWorld();
    this.keys.dispose();
    this.flat.dispose();
    this.avatar.dispose();
    this.wristMenu.dispose();
    this.handVisuals.dispose();
    this.avatars.dispose();
    this.voice.dispose();
    this.spectator.dispose();
    this.mirrors.dispose();
    this.quality.dispose();
    this.frameStats.dispose();
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
      this.networkMenu(),
      this.movementMenu(),
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

    const step = (key: 'stand' | 'sit', title: string, sub: string): MenuEntry[] => [
      {
        id: `move:eye-${key}`,
        label: `${title}: ${eyeHeights()[key]} cm`,
        sub: `${sub} · ${EYE_RANGE.min} bis ${EYE_RANGE.max} cm · +5 pro Druck`,
        icon: 'settings',
        accent,
        run: () => {
          const now = eyeHeights()[key];
          // Oben angekommen wieder unten anfangen: eine Raste, die am Ende
          // stehen bleibt, lässt einen die ganze Reihe rückwärts suchen.
          const next = now + 5 > EYE_RANGE.max ? EYE_RANGE.min : now + 5;
          const values = saveEyeHeights({ [key]: next });
          apply();
          this.notify(`${title}: ${values[key]} cm`);
        },
      },
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
      sub: `Stehend ${eyeHeights().stand} cm · sitzend ${eyeHeights().sit} cm`,
      icon: 'settings',
      accent,
      children: [
        ...step('stand', 'Stehend', 'Augen über dem Zimmerboden, aufrecht'),
        ...step('sit', 'Sitzend', 'Dasselbe im Sessel'),
        {
          id: 'move:eye-reset',
          label: 'Augenhöhen zurücksetzen',
          sub: `Zurück auf ${DEFAULT_EYES.stand} und ${DEFAULT_EYES.sit} cm`,
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
   * Sie steht neben *Bewegung* und *Grafik* und aus demselben Grund: Ein Hut
   * gehört dem Spieler und keiner Welt. Wer im Hub einen aufsetzt, trägt ihn
   * im Gokart auch, und alle im Raum sehen ihn (`net/NetSession.ts`).
   *
   * Eine Zeile je Kopfbedeckung statt einer, die durchschaltet: Es sind
   * sieben, und wer den Zylinder sucht, soll ihn sehen und nicht sechsmal
   * weiterdrücken.
   */
  private appearanceMenu(): MenuEntry {
    const accent = 0x5ee0a0;
    const look = appearance();

    return {
      id: 'look',
      label: 'Aussehen',
      sub: appearanceSummary(look),
      icon: 'npc',
      accent,
      children: HEADGEAR_KINDS.map((kind) => ({
        id: `look:hat:${kind}`,
        label: HEADGEAR_LABELS[kind],
        sub: HEADGEAR_SUBS[kind],
        icon: 'npc',
        accent,
        selected: look.hat === kind,
        run: () => {
          saveAppearance({ hat: kind });
          this.menuDirty = true;
          this.notify(kind === 'none' ? 'Kopfbedeckung ab' : `Auf: ${HEADGEAR_LABELS[kind]}`);
        },
      })),
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
  private wear(kind: HeadgearKind | null): void {
    this.worn = kind;
    this.applyAppearance();
  }

  private applyAppearance(): void {
    const hat = this.worn ?? appearance().hat;
    this.avatar.setHeadgear(hat);
    if (this.net.hat === hat) return;
    this.net.hat = hat;
    // Der Hut steht in der Vorstellung und nicht in der Pose: einmal ansagen
    // reicht, zwanzigmal in der Sekunde wäre Unfug.
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

  /** Der Name, überall zugleich: im Speicher, in der Sitzung, bei den anderen. */
  private setPlayerName(text: string): void {
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
    this.role = 'vr';
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
    this.resizeWebBuffer();
    this.role = detectFlatRole();
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

  private frame = (time: number): void => {
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
    this.flat.enabled = !presenting && !this.spectating;
    if (!presenting) this.flat.update();
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
    this.spectating = this.spectator.following;
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

    // Vor dem Bild, in dem sie zu sehen sind — und vor den Portalsichten, die
    // sich die Welt gleich selbst zeichnet.
    this.mirrors.render(this.scene, this.camera);
    const rendered = this.world?.render?.(context) ?? false;
    if (!rendered) this.renderer.render(this.scene, this.camera);
    this.frameStats.update(time, performance.now() - started, this.renderer.info.render);
  };
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
