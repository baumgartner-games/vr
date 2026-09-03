import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';
import { XRInput } from './XRInput';
import { Pointer } from './Pointer';
import { FlatControls } from './FlatControls';
import { HandVisuals } from './HandVisuals';
import { PlayerAvatar } from './PlayerAvatar';
import { FreeLocomotion } from './Locomotion';
import { WristMenu } from '../ui/WristMenu';
import type { PanelItem } from '../ui/UIPanel';
import { NetSession } from '../net/NetSession';
import { RemoteAvatars } from '../net/RemoteAvatars';
import { BroadcastChannelTransport } from '../net/BroadcastChannelTransport';
import { detectFlatRole } from './device';
import { DEFAULT_WORLD, WORLDS, findWorld } from '../worlds';
import type { PlayerRole, World, WorldAction, WorldContext } from './types';

export interface AppHooks {
  onWorldChanged?(id: string, title: string): void;
  onSessionChanged?(presenting: boolean): void;
  onNotify?(message: string): void;
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

  private readonly handVisuals: HandVisuals;
  private readonly avatar: PlayerAvatar;
  private readonly avatars: RemoteAvatars;
  private readonly flat: FlatControls;
  private readonly hooks: AppHooks;

  private world: World | null = null;
  private worldActions: WorldAction[] = [];
  private worldId = '';
  private baseChildren = new Set<THREE.Object3D>();
  private loading: string | null = null;
  private elapsed = 0;
  private lastTime = 0;
  private role: PlayerRole;

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
      title: 'Welten',
      footer: 'Rechte Hand: zielen + Trigger',
      onSelect: (id) => this.onMenuSelect(id),
    });
    this.rig.add(this.wristMenu);
    this.refreshMenu();

    this.avatars = new RemoteAvatars(this.net);
    this.scene.add(this.avatars);

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
      this.worldActions = next.actions?.() ?? [];

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

  /** Optional local multiplayer for testing across browser tabs. */
  async connectLocalNetwork(room = 'lobby'): Promise<void> {
    this.net.role = this.role;
    this.net.name = this.role === 'vr' ? 'VR' : 'Flat';
    try {
      await this.net.connect(new BroadcastChannelTransport(), room);
    } catch (error) {
      console.warn('[net] lokale Verbindung nicht möglich', error);
    }
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
    this.worldActions = [];

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
    const items: PanelItem[] = [];

    if (this.worldId !== DEFAULT_WORLD) {
      items.push({
        id: `world:${DEFAULT_WORLD}`,
        label: 'Zurück zum Hub',
        sub: 'Weltenauswahl',
        accent: 0x4aa8ff,
      });
    }

    for (const action of this.worldActions) {
      items.push({
        id: `action:${action.id}`,
        label: action.label,
        sub: action.sub,
        accent: action.accent ?? 0x9d7bff,
      });
    }

    for (const world of WORLDS) {
      if (world.id === DEFAULT_WORLD && this.worldId !== DEFAULT_WORLD) continue;
      items.push({
        id: `world:${world.id}`,
        label: world.title,
        sub: world.tagline,
        accent: world.accent,
        badge: world.experimental ? 'WIP' : undefined,
        selected: world.id === this.worldId,
      });
    }

    items.push({
      id: 'menu:close',
      label: 'Weiterspielen',
      sub: 'Menü schließen',
      accent: 0x6f7d99,
    });

    this.wristMenu.setItems(items);
  }

  private onMenuSelect(id: string): void {
    if (id === 'menu:close') {
      this.wristMenu.toggle(false);
      return;
    }
    if (id.startsWith('action:')) {
      const action = this.worldActions.find((entry) => entry.id === id.slice('action:'.length));
      if (!action) return;
      this.wristMenu.toggle(false);
      action.run(this.context);
      return;
    }
    if (id.startsWith('world:')) {
      const worldId = id.slice('world:'.length);
      this.wristMenu.toggle(false);
      void this.goTo(worldId);
    }
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
    this.net.role = 'vr';
    this.hooks.onSessionChanged?.(true);
  };

  private onSessionEnd = (): void => {
    this.role = detectFlatRole();
    this.flat.enabled = true;
    this.flat.syncFromRig();
    this.net.role = this.role;
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

    if (!presenting) this.flat.update();
    this.rig.update(dt, this.input, presenting);

    const context = this.context;
    this.world?.update(dt, context);

    this.rig.getHeadMatrix(_head);
    _headLocal.copy(this.rig.matrixWorld).invert().multiply(_head);
    this.avatar.update(dt, this.rig, this.input, _headLocal);
    this.wristMenu.update(dt, this.input, _head);
    this.pointer.update(this.input, presenting);
    this.net.update(dt, this.rig, this.input, this.elapsed);
    this.avatars.update();

    const rendered = this.world?.render?.(context) ?? false;
    if (!rendered) this.renderer.render(this.scene, this.camera);
  };
}
