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
import { RemoteAvatars } from '../net/RemoteAvatars';
import { BroadcastChannelTransport } from '../net/BroadcastChannelTransport';
import { TrysteroTransport, type TrysteroOptions } from '../net/TrysteroTransport';
import { SpectatorCamera, type SpectatorMode } from '../net/SpectatorCamera';
import { normalizeRoomCode } from '../net/room';
import { detectFlatRole } from './device';
import {
  DEFAULT_EYES,
  EYE_RANGE,
  eyeHeights,
  saveEyeHeights,
  savePlayerPosture,
  seatedLift,
} from './posture';
import { DEFAULT_WORLD, WORLDS, findWorld } from '../worlds';
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
  readonly avatars: RemoteAvatars;
  private readonly flat: FlatControls;
  private readonly hooks: AppHooks;

  private world: World | null = null;
  private worldMenu: MenuEntry[] = [];
  private worldId = '';
  private baseChildren = new Set<THREE.Object3D>();
  private loading: string | null = null;
  private elapsed = 0;
  private lastTime = 0;
  private role: PlayerRole;
  /** Something changed a menu label or row; the tree is rebuilt next frame. */
  private menuDirty = false;
  private spectating = false;

  constructor(canvas: HTMLCanvasElement, stickEl: HTMLElement | null, hooks: AppHooks = {}) {
    this.hooks = hooks;
    this.role = detectFlatRole();

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.xr.enabled = true;
    this.renderer.xr.setReferenceSpaceType('local-floor');

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 700);
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

    this.avatars = new RemoteAvatars(this.net);
    this.scene.add(this.avatars);
    this.spectator = new SpectatorCamera(this.rig, canvas, this.pointer);
    this.spectator.onChange = () => this.hooks.onNetChanged?.();

    this.net.onPeerJoin((peer) => this.notify(`${peer.name} ist dabei`));
    this.net.onPeerLeave((peer) => this.notify(`${peer.name} ist weg`));
    this.net.onPeersChanged(() => {
      this.menuDirty = true;
      this.hooks.onNetChanged?.();
    });
    this.net.onStatus(() => this.hooks.onNetChanged?.());

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
      notify: (message: string) => this.notify(message),
    };
  }

  get currentWorldId(): string {
    return this.worldId;
  }

  /** Loads a world, disposing the previous one. */
  async goTo(id: string): Promise<void> {
    const definition = findWorld(id) ?? findWorld(DEFAULT_WORLD)!;
    if (this.loading === definition.id || this.worldId === definition.id) return;
    this.loading = definition.id;
    this.notify(`Lade ${definition.title} …`);

    try {
      const next = await definition.load();
      this.unloadWorld();

      this.worldId = definition.id;
      this.world = next;
      await next.init(this.context);
      this.worldMenu = next.menu?.() ?? [];

      this.net.setWorld(definition.id);
      this.refreshMenu();
      this.hooks.onWorldChanged?.(definition.id, definition.title);
      this.notify(definition.title);
      if (!this.renderer.xr.isPresenting) this.flat.syncFromRig();
    } catch (error) {
      console.error(`[app] Welt "${id}" konnte nicht geladen werden`, error);
      this.notify(`Fehler beim Laden von ${definition.title}`);
    } finally {
      this.loading = null;
    }
  }


  /** Starts an immersive session; resolves once the headset takes over. */
  async enterVR(): Promise<void> {
    if (!navigator.xr) throw new Error('WebXR steht in diesem Browser nicht zur Verfügung.');
    const session = await navigator.xr.requestSession('immersive-vr', {
      optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking', 'layers'],
    });
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

  disconnect(): void {
    this.net.disconnect();
    this.spectator.setMode('free');
    this.spectator.setTarget(null);
    this.menuDirty = true;
  }

  /**
   * Watch a player — the same call behind the wrist menu and the flat panel.
   * Somebody standing in another world is followed there first; you cannot
   * watch a room you are not in.
   */
  spectate(peerId: string | null, mode?: SpectatorMode): void {
    const peer = peerId ? this.net.peers.get(peerId) : null;
    if (peer && peer.world !== this.net.world) void this.goTo(peer.world);

    this.spectator.setTarget(peerId);
    if (mode) this.spectator.setMode(mode);
    else if (peerId && this.spectator.settings.mode === 'free') this.spectator.setMode('third');
    this.menuDirty = true;
    this.hooks.onNetChanged?.();
  }

  /** The peer the spectator camera follows — an explicit pick, else the first VR player. */
  get spectatorTarget(): Peer | null {
    const here = [...this.net.peers.values()].filter((peer) => peer.world === this.net.world);
    const wanted = this.spectator.settings.targetId;
    if (wanted) return here.find((peer) => peer.id === wanted) ?? null;
    return here.find((peer) => peer.role === 'vr') ?? here[0] ?? null;
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
    this.flat.dispose();
    this.avatar.dispose();
    this.wristMenu.dispose();
    this.handVisuals.dispose();
    this.avatars.dispose();
    this.spectator.dispose();
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
   * The connection as seen from inside the headset: the room code to read out
   * loud, who is in it and the same spectator controls the flat panel has.
   * Typing the code itself still happens on the flat page.
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
            id: 'net:offline',
            label: 'Nicht verbunden',
            sub: 'Raum-Code auf der Startseite eingeben',
            accent: 0x6f7d99,
          },
        ];

    return {
      id: 'net',
      label: 'Verbindung',
      sub: this.net.connected
        ? `${this.net.room} · ${this.net.peers.size + 1} Spieler`
        : 'Offline',
      icon: 'worlds',
      accent: this.net.connected ? 0x5ee0a0 : 0x6f7d99,
      children,
    };
  }

  /**
   * Pick a player, pick a view. Identical on both sides of the session — in a
   * headset the view only borrows the other player's position, never their
   * head rotation, which is what keeps it watchable.
   */
  private spectateMenu(): MenuEntry {
    const settings = this.spectator.settings;
    const target = this.spectatorTarget;
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
    this.renderer.setSize(width, height, false);
  };

  private onSessionStart = (): void => {
    this.role = 'vr';
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
    this.role = detectFlatRole();
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
    const seconds = time / 1000;
    const dt = this.lastTime === 0 ? 1 / 60 : THREE.MathUtils.clamp(seconds - this.lastTime, 0, 0.05);
    this.lastTime = seconds;
    this.elapsed += dt;
    const presenting = this.renderer.xr.isPresenting;

    this.input.update();
    this.handVisuals.update(dt);

    // One frame behind the spectator on purpose: the flat controls run before
    // the world, the spectator after it.
    this.flat.enabled = !presenting && !this.spectating;
    if (!presenting) this.flat.update();
    this.rig.update(dt, this.input, presenting, this.pointer.hovering);

    const context = this.context;
    this.world?.update(dt, context);

    // The spectator borrows the view after the world had its say, so it can
    // follow a player that a portal just moved.
    const target = this.spectatorTarget;
    // Nobody left to watch — hand the view back instead of freezing it. A
    // target that is only briefly missing (loading their world) is kept.
    const wanted = this.spectator.settings.targetId;
    const reachable = wanted ? this.net.peers.has(wanted) : this.net.peers.size > 0;
    if (this.spectator.following && !reachable) {
      this.spectator.setMode('free');
      this.menuDirty = true;
    }
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
    if (this.menuDirty) this.refreshMenu();

    const rendered = this.world?.render?.(context) ?? false;
    if (!rendered) this.renderer.render(this.scene, this.camera);
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
