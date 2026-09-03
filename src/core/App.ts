import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';
import { XRInput } from './XRInput';
import { Pointer } from './Pointer';
import { FlatControls } from './FlatControls';
import { HandVisuals } from './HandVisuals';
import { PlayerAvatar } from './PlayerAvatar';
import { FreeLocomotion } from './Locomotion';
import { WristMenu } from '../ui/WristMenu';
import { NetSession } from '../net/NetSession';
import { RemoteAvatars } from '../net/RemoteAvatars';
import { BroadcastChannelTransport } from '../net/BroadcastChannelTransport';
import { TrysteroTransport, type TrysteroOptions } from '../net/TrysteroTransport';
import { SpectatorCamera } from '../net/SpectatorCamera';
import { normalizeRoomCode } from '../net/room';
import { detectFlatRole } from './device';
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
  readonly wristMenu: WristMenu;
  readonly net = new NetSession();
  readonly spectator: SpectatorCamera;

  private readonly handVisuals: HandVisuals;
  private readonly avatar: PlayerAvatar;
  private readonly avatars: RemoteAvatars;
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
  /** The wrist menu resets its navigation on rebuild, so only do it when closed. */
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

    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 300);
    this.rig = new PlayerRig(this.renderer, this.camera);
    this.scene.add(this.rig);

    this.input = new XRInput(this.renderer, this.rig);
    this.pointer = new Pointer(this.rig, canvas);
    this.flat = new FlatControls(this.rig, canvas, stickEl);

    this.handVisuals = new HandVisuals(this.input);
    this.rig.add(this.handVisuals);

    this.avatar = new PlayerAvatar();
    this.rig.add(this.avatar);

    this.wristMenu = new WristMenu(this.pointer, {
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
    this.menuDirty = true;
  }

  /** The peer the spectator camera follows — an explicit pick, else the first VR player. */
  get spectatorTarget(): Peer | null {
    const wanted = this.spectator.settings.targetId;
    if (wanted) return this.net.peers.get(wanted) ?? null;
    for (const peer of this.net.peers.values()) if (peer.role === 'vr') return peer;
    return this.net.peers.values().next().value ?? null;
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

    this.wristMenu.setRoot([
      {
        id: 'worlds',
        label: 'Welten',
        sub: 'Wohin soll es gehen?',
        icon: 'worlds',
        accent: 0x4aa8ff,
        children: worlds,
      },
      this.networkMenu(),
      ...this.worldMenu,
      {
        id: 'menu:close',
        label: 'Weiterspielen',
        sub: 'Menü schließen',
        icon: 'close',
        accent: 0x6f7d99,
        run: () => this.wristMenu.toggle(false),
      },
    ]);
  }

  /**
   * The connection as seen from inside the headset: the room code to read out
   * loud and who is currently in it. Typing happens on the flat page.
   */
  private networkMenu(): MenuEntry {
    const peers = [...this.net.peers.values()].map<MenuEntry>((peer) => ({
      id: `net:peer:${peer.id}`,
      label: peer.name,
      sub: `${ROLE_LABELS[peer.role]} · ${findWorld(peer.world)?.title ?? peer.world}`,
      accent: 0x4aa8ff,
    }));

    const children: MenuEntry[] = this.net.connected
      ? [
          {
            id: 'net:room',
            label: this.net.room,
            sub: `Raum-Code · ${this.net.statusDetail || this.net.status}`,
            accent: 0x4aa8ff,
          },
          ...(peers.length
            ? peers
            : [{ id: 'net:empty', label: 'Noch alleine', sub: 'Warte auf Mitspieler', accent: 0x6f7d99 }]),
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
   * Hands the camera back to the desktop controls. The spectator only moved the
   * camera inside the rig, so putting it back on the eye point is enough — the
   * view snaps to wherever the local player is standing.
   */
  private releaseCamera(): void {
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
    // Watching someone else while wearing a headset is a recipe for nausea.
    this.spectator.setMode('free');
    this.net.role = 'vr';
    this.net.announce();
    this.hooks.onSessionChanged?.(true);
  };

  private onSessionEnd = (): void => {
    this.role = detectFlatRole();
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

    // The spectator borrows the camera after the world had its say, so it can
    // follow a player that a portal just moved.
    const target = presenting ? null : this.spectatorTarget;
    const following = this.spectator.update(dt, target?.pose ?? null);
    this.avatars.hiddenPeer =
      following && this.spectator.settings.mode === 'first' ? (target?.id ?? null) : null;

    this.net.visible = this.avatars.hiddenPeer === null;

    if (this.spectating && !this.spectator.following) this.releaseCamera();
    this.spectating = this.spectator.following;

    this.rig.getHeadMatrix(_head);
    _headLocal.copy(this.rig.matrixWorld).invert().multiply(_head);
    this.avatar.update(dt, this.rig, this.input, _headLocal);
    this.wristMenu.update(dt, this.input, _head);
    this.pointer.update(this.input, presenting);
    this.net.update(dt, this.rig, this.input, this.elapsed);
    this.avatars.update(dt);
    if (this.menuDirty && !this.wristMenu.isOpen) this.refreshMenu();

    const rendered = this.world?.render?.(context) ?? false;
    if (!rendered) this.renderer.render(this.scene, this.camera);
  };
}

const ROLE_LABELS: Record<PlayerRole, string> = {
  vr: 'VR',
  desktop: 'Desktop',
  handheld: 'Handy',
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
