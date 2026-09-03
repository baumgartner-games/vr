import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playEmpty, playReload, playShot } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** Rounds in a full magazine. */
const MAGAZINE = 12;
/** Seconds a reload takes. */
const RELOAD_TIME = 1.15;
/** Rounds a burst fires. */
const BURST = 3;

/** How the trigger behaves. */
export type FireMode = 'single' | 'burst' | 'auto';

/** The settings menu steps through these, in this order. */
export const POWER_STEPS = [
  { label: 'leicht', mass: 0.03 },
  { label: 'normal', mass: 0.06 },
  { label: 'stark', mass: 0.14 },
  { label: 'brutal', mass: 0.3 },
] as const;

export const SPEED_STEPS = [14, 26, 45, 70] as const;
/** Rounds per second. */
export const RATE_STEPS = [2, 5, 9, 14] as const;
export const FIRE_MODES: readonly FireMode[] = ['single', 'burst', 'auto'];

export const FIRE_MODE_LABELS: Record<FireMode, string> = {
  single: 'Einzelfeuer',
  burst: 'Dreifachschuss',
  auto: 'Automatik',
};

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _kick = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

/**
 * A plain pistol. The trigger fires, and once the magazine runs dry it reloads
 * itself — there is no ammo to pick up anywhere, so the counter on the side of
 * the magazine reads "rounds left / ∞".
 */
export class PistolTool extends Tool {
  override readonly toolId = 'pistol';
  override readonly label = 'Pistole';

  private readonly muzzle = new THREE.Object3D();
  private readonly slide: THREE.Mesh;
  private readonly counter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private rounds = MAGAZINE;
  private reloading = 0;
  private recoil = 0;
  /** Seconds until the next round may leave the barrel. */
  private cooldown = 0;
  /** Rounds still owed by a burst. */
  private burst = 0;
  /**
   * The trigger went down on the gun — not on a menu. Automatic fire keeps
   * running off this, so pointing at the wrist panel with the finger down does
   * not empty a magazine into it.
   */
  private firing = false;
  private powerStep = 1;
  private speedStep = 1;
  private rateStep = 1;
  private modeStep = 0;

  constructor() {
    super();
    this.name = 'tool-pistol';
    this.icon = 'pistol';
    this.accent = 0xd7dce8;
    this.hint = 'Trigger schießt · Einstellungen im Menü';

    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.65,
    });
    const grip = new THREE.MeshStandardMaterial({ color: 0x22293a, roughness: 0.75 });

    this.slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.038, 0.17), steel);
    this.slide.position.set(0, 0.012, -0.06);
    this.add(this.slide);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 10), steel);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.012, -0.155);
    this.add(barrel);

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.045), grip);
    handle.position.set(0, -0.055, 0.01);
    handle.rotation.x = -0.22;
    this.add(handle);

    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.075, 0.032), steel);
    magazine.position.set(0, -0.052, 0.008);
    magazine.rotation.x = -0.22;
    this.add(magazine);

    // The round counter sits flat against the magazine, where a glance down
    // the sights catches it.
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.counter = new THREE.Mesh(
      new THREE.PlaneGeometry(0.06, 0.03),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.counter.position.set(0.014, -0.05, 0.012);
    this.counter.rotation.set(-0.22, Math.PI / 2, 0);
    this.add(this.counter);

    const mirrored = this.counter.clone();
    mirrored.position.x = -0.014;
    mirrored.rotation.y = -Math.PI / 2;
    this.add(mirrored);

    this.muzzle.position.set(0, 0.012, -0.19);
    this.add(this.muzzle);

    this.draw();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // A burst is ordered once and then walks itself down the magazine at the
    // set rate; automatic fire keeps going for as long as the finger is down.
    if (this.mode === 'burst') this.burst = BURST;
    this.firing = true;
    this.fire(controller, host);
  }

  /** Letting go stops automatic fire; a burst finishes what it started. */
  override onTriggerUp(_controller: ControllerState, _host: ToolHost): void {
    this.firing = false;
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (controller && this.heldBy) {
      if (!controller.trigger.pressed) this.firing = false;
      if (this.burst > 0 || (this.mode === 'auto' && this.firing)) this.fire(controller, host);
    }

    if (this.reloading > 0) {
      this.reloading = Math.max(0, this.reloading - dt);
      if (this.reloading === 0) {
        this.rounds = MAGAZINE;
        this.draw();
      }
    }
    // The slide kicks back and settles again.
    this.recoil = Math.max(0, this.recoil - dt * 7);
    this.slide.position.z = -0.06 + this.recoil * 0.016;
    // The muzzle flip rides on top of the aim the base class just set, so the
    // kick must be multiplied in — assigning a rotation would throw the aim away.
    if (this.heldBy && this.recoil > 0) {
      this.quaternion.multiply(_kick.setFromAxisAngle(_axisX, this.recoil * 0.18));
    }
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.texture.dispose();
  }

  // --- what the settings menu turns ----------------------------------------

  get mode(): FireMode {
    return FIRE_MODES[this.modeStep]!;
  }

  /** Muzzle velocity in m/s. */
  get muzzleSpeed(): number {
    return SPEED_STEPS[this.speedStep]!;
  }

  /** Rounds per second. */
  get fireRate(): number {
    return RATE_STEPS[this.rateStep]!;
  }

  get powerLabel(): string {
    return POWER_STEPS[this.powerStep]!.label;
  }

  get modeLabel(): string {
    return FIRE_MODE_LABELS[this.mode];
  }

  /** Each of these steps one notch and wraps around — one menu entry each. */
  cyclePower(): string {
    this.powerStep = (this.powerStep + 1) % POWER_STEPS.length;
    this.draw();
    return this.powerLabel;
  }

  cycleSpeed(): number {
    this.speedStep = (this.speedStep + 1) % SPEED_STEPS.length;
    this.draw();
    return this.muzzleSpeed;
  }

  cycleRate(): number {
    this.rateStep = (this.rateStep + 1) % RATE_STEPS.length;
    this.draw();
    return this.fireRate;
  }

  cycleMode(): FireMode {
    this.modeStep = (this.modeStep + 1) % FIRE_MODES.length;
    this.burst = 0;
    this.draw();
    return this.mode;
  }

  // --- shooting -------------------------------------------------------------

  /** One round, if the gun is ready for it. */
  private fire(controller: ControllerState, host: ToolHost): void {
    if (this.cooldown > 0) return;
    if (this.reloading > 0) return;
    if (this.rounds <= 0) {
      this.burst = 0;
      playEmpty();
      this.startReload();
      return;
    }

    this.rounds--;
    if (this.burst > 0) this.burst--;
    this.cooldown = 1 / this.fireRate;
    this.recoil = 1;
    this.muzzle.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    host.spawnBullet(_origin, _direction, this.muzzleSpeed, {
      mass: POWER_STEPS[this.powerStep]!.mass,
    });
    playShot();
    controller.pulse(0.6, 40);
    this.draw();

    if (this.rounds === 0) this.startReload();
  }

  private startReload(): void {
    this.reloading = RELOAD_TIME;
    playReload();
    this.draw();
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 128);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 120, 22);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.reloading > 0 ? '#ffb35c' : '#5ee0a0';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    if (this.reloading > 0) {
      ctx.font = '700 46px system-ui, sans-serif';
      ctx.fillText('LADEN', 128, 66);
    } else {
      ctx.font = '700 54px system-ui, sans-serif';
      // Rounds left over an endless supply of magazines.
      ctx.fillText(`${this.rounds}/∞`, 128, 54);
      // Below it what the trigger is going to do — three letters is enough.
      ctx.font = '600 26px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      ctx.fillText(MODE_TAGS[this.mode], 128, 98);
    }
    this.texture.needsUpdate = true;
  }
}

/** Short label under the round counter. */
const MODE_TAGS: Record<FireMode, string> = {
  single: 'EINZEL',
  burst: '3-SCHUSS',
  auto: 'AUTO',
};
