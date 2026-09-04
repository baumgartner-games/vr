import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { createSight, type Attachment, type AttachmentContext } from './attachments';
import { saveWeaponSettings, weaponSettings } from './gearStore';
import {
  AMMO_KINDS,
  AMMO_LABELS,
  BURST_STEPS,
  FIRE_MODES,
  FIRE_MODE_LABELS,
  MAGAZINE_STEPS,
  RATE_STEPS,
  RELOAD_STEPS,
  SPEED_STEPS,
  ZOOM_STEPS,
  clampWeapon,
  nextIn,
  nextPower,
  nextStep,
  powerLabel,
  sightsLabel,
  toggleSight,
  zoomLabel,
  type AmmoKind,
  type FireMode,
  type SightKind,
  type WeaponSettings,
} from './weaponSettings';
import { playEmpty, playReload, playShot } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _kick = new THREE.Quaternion();
const _axisX = new THREE.Vector3(1, 0, 0);

/**
 * A pistol you can take apart in the menu.
 *
 * Every number it runs on — the weight of a round, how fast it leaves the
 * barrel, how many are in the magazine, how long a reload takes — is a setting
 * (`weaponSettings.ts`), and every one of them can be stepped through a few
 * sensible notches *or* typed in directly.
 *
 * On top of that go the aiming aids (`attachments.ts`) — as many at once as
 * you like, because a red dot and a trajectory line are not rivals — and a
 * choice of round: plain, or tracer, which draws its own line through the room.
 *
 * There is no ammunition to pick up anywhere, so the counter on the side of the
 * magazine reads "rounds left / ∞".
 */
export class PistolTool extends Tool {
  override readonly toolId = 'pistol';
  override readonly label = 'Pistole';

  private readonly muzzle = new THREE.Object3D();
  private readonly rail = new THREE.Object3D();
  private readonly slide: THREE.Mesh;
  private readonly counter: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  /** The aiming aids currently clipped on, by their kind. */
  private readonly sights = new Map<SightKind, Attachment>();
  private settings: WeaponSettings;
  private rounds: number;
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

  constructor() {
    super();
    this.name = 'tool-pistol';
    this.icon = 'pistol';
    this.accent = 0xd7dce8;
    this.hint = 'Trigger schießt · Einstellungen im Menü';
    this.settings = weaponSettings();
    this.rounds = this.settings.magazine;

    const steel = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.65,
    });
    // Der Griff trägt die Greiffarbe: woran die Waffe genommen wird, soll man
    // sehen, nicht raten.
    const grip = grabMaterial({ roughness: 0.75 });

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

    // Everything that clips on hangs off the rail, so an attachment's pose is
    // measured from one place on the gun rather than from the gun's origin.
    this.rail.name = 'pistol-rail';
    this.add(this.rail);

    this.mountSights(this.settings.sights);
    this.draw();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // A burst is ordered once and then walks itself down the magazine at the
    // set rate; automatic fire keeps going for as long as the finger is down.
    if (this.settings.mode === 'burst') this.burst = this.settings.burst;
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
      if (this.burst > 0 || (this.settings.mode === 'auto' && this.firing)) {
        this.fire(controller, host);
      }
    }

    if (this.reloading > 0) {
      this.reloading = Math.max(0, this.reloading - dt);
      if (this.reloading === 0) {
        this.rounds = this.settings.magazine;
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

    if (this.sights.size > 0) {
      const ctx = this.attachmentContext(host);
      for (const sight of this.sights.values()) sight.update(dt, ctx);
    }
  }

  override disposeTool(): void {
    for (const sight of this.sights.values()) sight.disposeAttachment();
    this.sights.clear();
    disposeToolTree(this);
    this.texture.dispose();
  }

  // --- what the settings menu turns ----------------------------------------

  /** Everything the gun is set to, as one object. */
  get weapon(): WeaponSettings {
    return this.settings;
  }

  override attachments(): readonly Attachment[] {
    return [...this.sights.values()];
  }

  /** Muzzle velocity in m/s. */
  get muzzleSpeed(): number {
    return this.settings.speed;
  }

  get mode(): FireMode {
    return this.settings.mode;
  }

  get modeLabel(): string {
    return FIRE_MODE_LABELS[this.settings.mode];
  }

  get ammoLabel(): string {
    return AMMO_LABELS[this.settings.ammo];
  }

  /** What the scope magnifies by, as it is written on the menu row. */
  get zoomLabel(): string {
    return zoomLabel(this.settings.zoom);
  }

  get powerLabel(): string {
    return powerLabel(this.settings.mass);
  }

  /** Rounds left, and what a full magazine holds. */
  get magazine(): { left: number; size: number } {
    return { left: this.rounds, size: this.settings.magazine };
  }

  /**
   * Writes a value — from a notch, from a typed-in number or out of a config
   * code. Everything goes through here, so nothing can end up outside its
   * range and nothing can be changed without being written down.
   */
  set(values: Partial<WeaponSettings>): WeaponSettings {
    const before = this.settings;
    this.settings = clampWeapon({ ...before, ...values });
    saveWeaponSettings(this.settings);

    // A magazine that grew does not refill by itself, but it must not read
    // "30/∞" with 12 rounds' worth of ammunition in it either.
    this.rounds = Math.min(this.rounds, this.settings.magazine);
    if (this.settings.mode !== 'burst') this.burst = 0;
    if (this.settings.sights.join() !== before.sights.join())
      this.mountSights(this.settings.sights);
    this.draw();
    return this.settings;
  }

  /** Reads the stored settings again — after a config code came in. */
  reloadSettings(): void {
    this.settings = weaponSettings();
    this.rounds = Math.min(this.rounds, this.settings.magazine);
    this.mountSights(this.settings.sights);
    this.draw();
  }

  /** Each of these steps one notch and wraps around — one menu entry each. */
  cyclePower(): string {
    this.set({ mass: nextPower(this.settings.mass) });
    return this.powerLabel;
  }

  cycleSpeed(): number {
    return this.set({ speed: nextStep(SPEED_STEPS, this.settings.speed) }).speed;
  }

  cycleRate(): number {
    return this.set({ rate: nextStep(RATE_STEPS, this.settings.rate) }).rate;
  }

  cycleMagazine(): number {
    return this.set({ magazine: nextStep(MAGAZINE_STEPS, this.settings.magazine) }).magazine;
  }

  cycleReload(): number {
    return this.set({ reload: nextStep(RELOAD_STEPS, this.settings.reload) }).reload;
  }

  cycleBurst(): number {
    return this.set({ burst: nextStep(BURST_STEPS, this.settings.burst) }).burst;
  }

  cycleMode(): FireMode {
    return this.set({ mode: nextIn(FIRE_MODES, this.settings.mode) }).mode;
  }

  cycleAmmo(): AmmoKind {
    return this.set({ ammo: nextIn(AMMO_KINDS, this.settings.ammo) }).ammo;
  }

  /** 1×, 2×, 4× … 40× and round again. */
  cycleZoom(): number {
    return this.set({ zoom: nextStep(ZOOM_STEPS, this.settings.zoom) }).zoom;
  }

  /** Clips one aiming aid on or takes it off; `none` clears the rail. */
  toggleSight(kind: SightKind): readonly SightKind[] {
    return this.set({ sights: toggleSight(this.settings.sights, kind) }).sights;
  }

  /** What the menu writes next to "Zielhilfen". */
  get sightsLabel(): string {
    return sightsLabel(this.settings.sights);
  }

  /** Puts a magazine in by hand, whatever is left in the old one. */
  reloadNow(): void {
    if (this.rounds === this.settings.magazine || this.reloading > 0) return;
    this.startReload();
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
    this.cooldown = 1 / this.settings.rate;
    this.recoil = 1;
    this.muzzle.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    host.spawnBullet(_origin, _direction, this.settings.speed, {
      mass: this.settings.mass,
      tracer: this.settings.ammo === 'tracer',
    });
    playShot();
    controller.pulse(0.6, 40);
    this.draw();

    if (this.rounds === 0) this.startReload();
  }

  private startReload(): void {
    this.reloading = this.settings.reload;
    playReload();
    this.draw();
  }

  /**
   * Brings the rail in line with the settings: whatever is asked for and not
   * yet mounted is built, whatever is mounted and no longer wanted comes off.
   * Anything already on stays exactly where it is — rebuilding a red dot that
   * nobody touched would throw its pose away for a frame.
   */
  private mountSights(kinds: readonly SightKind[]): void {
    for (const [kind, sight] of this.sights) {
      if (kinds.includes(kind)) continue;
      sight.disposeAttachment();
      sight.removeFromParent();
      this.sights.delete(kind);
    }
    for (const kind of kinds) {
      if (this.sights.has(kind)) continue;
      const sight = createSight(kind);
      if (!sight) continue;
      sight.applyStoredPose(this.toolId);
      this.rail.add(sight);
      this.sights.set(kind, sight);
    }
  }

  private attachmentContext(host: ToolHost): AttachmentContext {
    return {
      host,
      muzzle: this.muzzle,
      speed: this.settings.speed,
      held: Boolean(this.heldBy) && !this.parked,
      zoom: this.settings.zoom,
    };
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
      ctx.font = '700 50px system-ui, sans-serif';
      // Rounds left over an endless supply of magazines.
      ctx.fillText(`${this.rounds}/∞`, 128, 50);
      // Below it what the trigger is going to do, and what comes out.
      ctx.font = '600 24px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      const ammo = this.settings.ammo === 'tracer' ? ' · SPUR' : '';
      ctx.fillText(`${MODE_TAGS[this.settings.mode]}${ammo}`, 128, 96);
    }
    this.texture.needsUpdate = true;
  }
}

/** Short label under the round counter. */
const MODE_TAGS: Record<FireMode, string> = {
  single: 'EINZEL',
  burst: `${'3'}-SCHUSS`,
  auto: 'AUTO',
};
