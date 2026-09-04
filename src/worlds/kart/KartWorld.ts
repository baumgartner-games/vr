import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { createSky } from '../shared/environment';
import { TextPlane } from '../../ui/TextPlane';
import { playPick, playTone } from '../../core/Audio';
import type { MenuEntry } from '../../ui/menu';
import type { WorldContext } from '../../core/types';
import type { ControllerState, Handedness } from '../../core/XRInput';
import { ALL_GROUPS, GROUP_PLAYER, GROUP_WORLD, type PhysicsBody } from '../../physics/PhysicsWorld';
import { Kart, EXIT_HOLD, WHEEL_GRAB_RANGE, WHEEL_HOLD_RANGE } from './Kart';
import { kartSpeed, kmh, stepKart } from './kartDynamics';
import {
  KART_FIELDS,
  KART_PRESETS,
  STEERING_LABELS,
  clampKart,
  clampKartField,
  kartFieldLabel,
  nextKartStep,
  type KartField,
} from './kartSettings';
import {
  confineToTrack,
  lapDelta,
  nearestOnPath,
  pathLength,
  sampleClosedSpline,
  type Vec2,
} from './kartTrack';

/**
 * The circuit, as a dozen points the tarmac is drawn through. A short lap on
 * purpose: the interesting part is what the settings on the clipboard do to a
 * corner, and that wants a corner every few seconds.
 */
const TRACK: Vec2[] = [
  { x: 0, z: -16 },
  { x: 14, z: -15 },
  { x: 20, z: -8 },
  { x: 17, z: 0 },
  { x: 20, z: 9 },
  { x: 13, z: 15 },
  { x: 2, z: 13 },
  { x: -4, z: 5 },
  { x: -12, z: 9 },
  { x: -19, z: 4 },
  { x: -18, z: -8 },
  { x: -10, z: -15 },
];

/** Half the width of the tarmac. */
const HALF_WIDTH = 3.2;
/** How far apart the tyre stacks along the edge stand. */
const BARRIER_SPACING = 5.5;
/** How far out from the tarmac the barriers sit. */
const BARRIER_OFFSET = 1.1;
/** Stick deflection that counts as a scroll on the clipboard, and re-arms it. */
const SCROLL_ON = 0.55;
const SCROLL_OFF = 0.3;
const SCROLL_FIRST_DELAY = 0.42;
const SCROLL_REPEAT = 0.16;
/** How quickly the stick steering follows the stick, in units per second. */
const STEER_RATE = 3.4;
/** Keys that drive a kart from a desk. */
type FlatJob = 'throttle' | 'brake' | 'left' | 'right' | 'exit';
const FLAT_KEYS: Record<string, FlatJob> = {
  KeyW: 'throttle',
  ArrowUp: 'throttle',
  KeyS: 'brake',
  ArrowDown: 'brake',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  // There is no A button on a keyboard, so the way out gets a key of its own.
  KeyE: 'exit',
};

const _hand = new THREE.Vector3();
const _hub = new THREE.Vector3();
const _head = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _spot = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

/**
 * A little go-kart circuit.
 *
 * Four karts stand on the grid, each with its own character and its own
 * clipboard. **Take hold of the steering wheel** (grab, or point at it and
 * pull) and you are sitting in it; from then on the **right trigger is the
 * throttle, the left one the brake** and the **left stick steers** — or the
 * wheel itself does, if the first line of the clipboard says so.
 *
 * Getting out again is the one thing a new driver cannot guess, so it is
 * written on a sign right behind the steering wheel the whole time you are
 * sitting there: **hold A/X**, with a bar that fills up while you do. The same
 * thing sits as the first line on the clipboard, for anybody who would rather
 * point at it.
 *
 * The clipboard is the pistol's settings menu in kart form: acceleration, top
 * speed, braking, traction, weight, steering lock, wheelbase and reverse, each
 * one stepping through its notches and showing the raw figure it is at.
 *
 * Everything else is the portal lab's — the same hands, the same physics, the
 * same shared session. The belt starts out empty here: both triggers have a
 * job in this world.
 */
export class KartWorld extends PortalWorld {
  /** The centre line, smoothed out of `TRACK`. */
  private readonly path = sampleClosedSpline(TRACK, 10);
  private readonly lapLength = pathLength(this.path);

  private readonly tarmac = new THREE.MeshStandardMaterial({ color: 0x3a3f4a, roughness: 0.95 });
  private readonly paint = new THREE.MeshBasicMaterial({ color: 0xf2f4f8, toneMapped: false });
  private readonly grass = new THREE.MeshStandardMaterial({ color: 0x6f9a58, roughness: 0.98 });
  private readonly kerbRed = new THREE.MeshStandardMaterial({ color: 0xd8402f, roughness: 0.8 });
  private readonly kerbWhite = new THREE.MeshStandardMaterial({ color: 0xf0f2f6, roughness: 0.8 });
  private readonly tyre = new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.95 });
  private readonly panel = new THREE.MeshStandardMaterial({
    color: 0xf2f4f8,
    roughness: 0.6,
    metalness: 0.05,
  });

  private readonly karts: Kart[] = [];
  private readonly kartBodies = new Map<Kart, PhysicsBody>();
  private readonly boardTargets: THREE.Object3D[] = [];

  private driving: Kart | null = null;
  /** Seconds A/X has been held down while seated. */
  private exitHeld = 0;
  /** The hand on the steering wheel, and where around it that hand last was. */
  private wheelGrab: { hand: Handedness; angle: number } | null = null;
  /** Stick steering, eased so a flick of the thumb is not a flick of the kart. */
  private steer = 0;
  private lapTime = 0;
  private lapProgress = 0;
  private lastAlong = 0;
  private lastLap: number | null = null;
  private bestLap: number | null = null;
  private lapBoard: TextPlane | null = null;
  private boardTick = 0;

  private scrollArmed = true;
  private scrollTimer = 0;

  /** Keys held down, for driving without a headset. */
  private readonly pressed = new Set<string>();
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private onKeyUp: ((event: KeyboardEvent) => void) | null = null;

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);

    for (const kart of this.karts) {
      // The wheel answers to the pointer as well as to a hand: on a flat screen
      // there is no hand to reach out with.
      ctx.pointer.add({
        object: kart.wheelTarget,
        pokeable: false,
        // Once somebody is sitting in a kart, no steering wheel listens to a
        // laser any more: there is nothing left to select, and a ray resting
        // on the wheel in front of you would swallow the throttle trigger.
        ignore: () => this.driving !== null,
        onSelect: () => this.enter(ctx, kart),
      });
      ctx.pointer.add(kart.board.asPointerTarget());
      this.boardTargets.push(kart.wheelTarget, kart.board);
      this.showBoard(kart);
    }

    this.onKeyDown = (event) => {
      if (FLAT_KEYS[event.code]) this.pressed.add(event.code);
    };
    this.onKeyUp = (event) => this.pressed.delete(event.code);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);

    if (this.driving) this.updateDriving(dt, ctx, this.driving);
    else this.checkBoarding(ctx);

    ctx.rig.getHeadPosition(_head);
    for (const kart of this.karts) kart.faceHover(_head);
    this.updateScroll(dt, ctx);

    this.boardTick += dt;
    if (this.boardTick >= 0.25) {
      this.boardTick = 0;
      this.drawLapBoard();
    }
  }

  override dispose(ctx: WorldContext): void {
    if (this.onKeyDown) window.removeEventListener('keydown', this.onKeyDown);
    if (this.onKeyUp) window.removeEventListener('keyup', this.onKeyUp);
    this.onKeyDown = null;
    this.onKeyUp = null;
    this.pressed.clear();

    for (const object of this.boardTargets) ctx.pointer.remove(object);
    this.boardTargets.length = 0;
    ctx.rig.frozen = false;
    this.driving = null;
    this.wheelGrab = null;
    for (const kart of this.karts) kart.disposeKart();
    this.karts.length = 0;
    this.kartBodies.clear();
    this.lapBoard?.dispose();
    this.lapBoard = null;
    super.dispose(ctx);
  }

  override menu(): MenuEntry[] {
    return [
      ...super.menu(),
      {
        id: 'kart:home',
        label: 'Karts in die Box',
        sub: 'Alle vier zurück auf den Start',
        icon: 'reset',
        accent: 0xffc857,
        run: () => {
          if (this.driving) this.leave(this.context!);
          for (const kart of this.karts) {
            kart.returnHome();
            this.syncBody(kart);
          }
          this.context?.notify('Karts stehen wieder auf dem Start');
        },
      },
      {
        id: 'kart:times',
        label: 'Zeiten löschen',
        sub: 'Letzte und beste Runde vergessen',
        icon: 'stopwatch',
        accent: 0x5ee0a0,
        run: () => {
          this.bestLap = null;
          this.lastLap = null;
          this.drawLapBoard();
          this.context?.notify('Rundenzeiten gelöscht');
        },
      },
    ];
  }

  /** `B`/`Y` puts the karts back on the grid, driver and all. */
  protected override worldReset(): void {
    if (this.driving && this.context) this.leave(this.context);
    for (const kart of this.karts) {
      kart.returnHome();
      this.syncBody(kart);
    }
  }

  protected override spawnPoint(): THREE.Vector3 {
    // On the tarmac a few metres behind the grid, looking at the karts.
    const point = this.pointAt(-4);
    return new THREE.Vector3(point.x, 0, point.z);
  }

  protected override spawnYaw(): number {
    const point = this.pointAt(-4);
    return Math.atan2(-point.tx, -point.tz);
  }

  protected override skyColor(): number {
    return 0xa9c9ea;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Lenkrad greifen zum Einsteigen · Aussteigen: A/X halten';
  }

  /** Both triggers have a job here, so the belt starts out empty. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override buildEnvironment(): void {
    const circuit = new THREE.Group();
    circuit.name = 'kart-circuit';
    this.root.add(circuit);
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2, 150));

    // One slab for the whole field, so a portal in the ground opens the ground.
    this.slab(circuit, this.grass, [70, 0.4, 62], [0, -0.2, -1], true);
    this.buildRoad(circuit);
    this.buildKerbs(circuit);
    this.buildBarriers(circuit);
    this.buildStart(circuit);
    this.buildProps();
    this.buildGrid();
  }

  /** Cones on the track: the one thing a kart is guaranteed to hit. */
  protected override buildProps(): void {
    const physics = this.physics!;
    const material = new THREE.MeshStandardMaterial({ color: 0xff8a2f, roughness: 0.8 });
    // Along the middle of the lap, a little off line so they can be dodged.
    for (let i = 0; i < 10; i++) {
      const point = this.path[Math.floor((i + 0.5) * (this.path.length / 10))]!;
      const hit = nearestOnPath(this.path, point.x, point.z);
      const side = i % 2 === 0 ? 1 : -1;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 12), material);
      cone.position.set(
        hit.x + hit.tz * side * 1.9,
        0.25,
        hit.z - hit.tx * side * 1.9,
      );
      this.root.add(cone);
      this.registerProp(
        physics.addDynamic(cone, {
          shape: { kind: 'cone' },
          halfExtents: new THREE.Vector3(0.16, 0.25, 0.16),
          mass: 1.2,
          friction: 0.7,
          restitution: 0.1,
        }),
        `kart-cone-${i}`,
      );
    }
  }

  // --- getting in and out ---------------------------------------------------

  /** A hand that closes around a steering wheel is a driver getting in. */
  private checkBoarding(ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      if (!controller.tracked || !controller.squeeze.justPressed) continue;
      gripOf(controller).getWorldPosition(_hand);
      for (const kart of this.karts) {
        kart.hubPosition(_hub);
        if (_hand.distanceTo(_hub) > WHEEL_GRAB_RANGE) continue;
        this.enter(ctx, kart);
        controller.pulse(0.6, 40);
        return;
      }
    }
  }

  private enter(ctx: WorldContext, kart: Kart): void {
    if (this.driving) return;
    this.driving = kart;
    this.exitHeld = 0;
    this.steer = 0;
    this.wheelGrab = null;
    this.lapTime = 0;
    this.lapProgress = 0;
    this.lastAlong = nearestOnPath(this.path, kart.motion.x, kart.motion.z).along;
    kart.setSeated(true);
    ctx.rig.frozen = true;
    this.seatDriver(ctx, kart);
    playPick(true);
    ctx.notify(`${kart.preset.name} · Aussteigen: A/X halten`);
  }

  /**
   * Out of the kart and back onto your feet, beside it. The capsule that walks
   * around is somewhere else entirely by now, so it is told where the player
   * has ended up.
   */
  private leave(ctx: WorldContext): void {
    const kart = this.driving;
    if (!kart) return;
    this.driving = null;
    this.wheelGrab = null;
    this.exitHeld = 0;
    kart.setSeated(false);
    kart.setBraking(0);

    kart.updateWorldMatrix(true, false);
    _spot.set(-1.5, 0, 0.2).applyMatrix4(kart.matrixWorld);
    _spot.y = 0;
    ctx.rig.frozen = false;
    ctx.rig.placeAt(_spot, kart.motion.yaw);
    ctx.rig.locomotion.resync?.(ctx.rig);
    playPick(false);
    ctx.notify('Ausgestiegen');
  }

  /**
   * Puts the driver in the seat — by the **head**, in all three axes.
   *
   * `placeAt` moves the rig, not the head: in VR the headset sits wherever the
   * player happens to be in their room, and how far above the rig it sits is
   * their own height and their own posture. Both have to be taken out of the
   * sum, otherwise a player who is sitting on a chair ends up with their eyes
   * at seat level while somebody standing looks over the roll bar. So the rig
   * is slid until the head lands on the kart's eye point, sideways *and*
   * vertically — the seat is a place for a head, not for a pair of feet.
   */
  private seatDriver(ctx: WorldContext, kart: Kart): void {
    kart.updateWorldMatrix(true, false);
    kart.seat.getWorldPosition(_seat);
    ctx.rig.placeAt(_seat, kart.motion.yaw);
    ctx.rig.getHeadPosition(_head);
    ctx.rig.position.x += _seat.x - _head.x;
    ctx.rig.position.y += _seat.y - _head.y;
    ctx.rig.position.z += _seat.z - _head.z;
    ctx.rig.updateMatrixWorld(true);
  }

  // --- driving --------------------------------------------------------------

  private updateDriving(dt: number, ctx: WorldContext, kart: Kart): void {
    const left = ctx.input.get('left');
    const right = ctx.input.get('right');
    // A hand whose laser rests on the clipboard (or on any other panel) has
    // lent its trigger to that panel. Per hand, so reading the clipboard with
    // one of them does not also take the throttle out of the other.
    let throttle = ctx.pointer.hoveringWith('right') ? 0 : (right?.trigger.value ?? 0);
    let brake = ctx.pointer.hoveringWith('left') ? 0 : (left?.trigger.value ?? 0);
    let steerWish = 0;
    if (!ctx.renderer.xr.isPresenting) {
      if (this.pressedIs('throttle')) throttle = 1;
      if (this.pressedIs('brake')) brake = 1;
      steerWish = (this.pressedIs('left') ? 1 : 0) - (this.pressedIs('right') ? 1 : 0);
    }

    if (kart.settings.steering === 'wheel') {
      this.updateWheelGrab(ctx, kart);
      // The keyboard still turns the wheel; there is no hand to grab it with.
      if (steerWish !== 0) kart.turnWheelBy(steerWish * STEER_RATE * 0.6 * dt);
    } else {
      const stick = left?.thumbstick.x ?? 0;
      // Stick left is negative, and left is a turn to the left.
      const wish = THREE.MathUtils.clamp(steerWish - stick, -1, 1);
      this.steer += THREE.MathUtils.clamp(wish - this.steer, -STEER_RATE * dt, STEER_RATE * dt);
      kart.showSteer(this.steer);
    }

    const before = { x: kart.motion.x, z: kart.motion.z };
    kart.motion = stepKart(
      kart.motion,
      { throttle, brake, steer: kart.steerInput },
      kart.settings,
      dt,
    );

    const guarded = confineToTrack(
      this.path,
      HALF_WIDTH,
      kart.motion.x,
      kart.motion.z,
      kart.motion.vx,
      kart.motion.vz,
    );
    kart.motion.x = guarded.x;
    kart.motion.z = guarded.z;
    kart.motion.vx = guarded.vx;
    kart.motion.vz = guarded.vz;
    if (guarded.hit && kmh(kartSpeed(kart.motion)) > 12) {
      playTone({ type: 'sawtooth', from: 180, to: 90, duration: 0.09, gain: 0.04 });
    }

    kart.applyMotion();
    kart.applySteering();
    kart.roll(Math.hypot(kart.motion.x - before.x, kart.motion.z - before.z));
    kart.setBraking(brake);
    this.syncBody(kart);
    this.seatDriver(ctx, kart);
    this.updateLap(dt, ctx, kart);
    this.updateExit(dt, ctx);
  }

  /** True while one of the keys with that job is down. */
  private pressedIs(job: FlatJob): boolean {
    for (const code of this.pressed) {
      if (FLAT_KEYS[code] === job) return true;
    }
    return false;
  }

  /**
   * Steering by turning the wheel: one hand takes hold of it anywhere on the
   * rim, and however far that hand travels around the middle is however far
   * the wheel turns. Letting go — or reaching too far away — hands it back.
   */
  private updateWheelGrab(ctx: WorldContext, kart: Kart): void {
    const grab = this.wheelGrab;
    if (grab) {
      const controller = ctx.input.get(grab.hand);
      if (!controller || !controller.tracked || !controller.squeeze.pressed) {
        this.wheelGrab = null;
        return;
      }
      gripOf(controller).getWorldPosition(_hand);
      kart.hubPosition(_hub);
      if (_hand.distanceTo(_hub) > WHEEL_HOLD_RANGE) {
        this.wheelGrab = null;
        return;
      }
      const angle = kart.handAngle(_hand);
      kart.turnWheelBy(shortestAngle(angle - grab.angle));
      grab.angle = angle;
      return;
    }

    for (const controller of ctx.input.controllers) {
      if (!controller.tracked || !controller.squeeze.justPressed) continue;
      gripOf(controller).getWorldPosition(_hand);
      kart.hubPosition(_hub);
      if (_hand.distanceTo(_hub) > WHEEL_HOLD_RANGE) continue;
      this.wheelGrab = { hand: controller.handedness!, angle: kart.handAngle(_hand) };
      controller.pulse(0.3, 20);
      return;
    }
  }

  /**
   * The way out. A press would be too easy to hit by accident at speed, so it
   * is a short hold — and the sign in front of the driver fills up while it
   * runs, which is what makes the rule visible instead of written down.
   */
  private updateExit(dt: number, ctx: WorldContext): void {
    const kart = this.driving;
    if (!kart) return;
    // `A` also confirms a menu entry, so it only counts from a hand that is
    // not currently pointing at one.
    const held =
      ctx.input.controllers.some(
        (controller) =>
          controller.tracked &&
          controller.primary.pressed &&
          !ctx.pointer.hoveringWith(controller.handedness),
      ) || this.pressedIs('exit');
    this.exitHeld = held ? this.exitHeld + dt : 0;
    kart.setExitProgress(this.exitHeld / EXIT_HOLD);
    if (this.exitHeld >= EXIT_HOLD) this.leave(ctx);
  }

  /** How far round the lap the kart has come, and what that was worth. */
  private updateLap(dt: number, ctx: WorldContext, kart: Kart): void {
    this.lapTime += dt;
    const hit = nearestOnPath(this.path, kart.motion.x, kart.motion.z);
    this.lapProgress += lapDelta(this.lastAlong, hit.along, this.lapLength);
    this.lastAlong = hit.along;
    if (this.lapProgress < this.lapLength) return;

    this.lapProgress -= this.lapLength;
    this.lastLap = this.lapTime;
    this.lapTime = 0;
    const record = this.bestLap === null || this.lastLap < this.bestLap;
    if (record) this.bestLap = this.lastLap;
    playTone({
      type: 'sine',
      from: record ? 620 : 480,
      to: record ? 980 : 620,
      duration: 0.22,
      gain: 0.07,
    });
    ctx.notify(`Runde ${formatLap(this.lastLap)}${record ? ' · Bestzeit!' : ''}`);
    this.drawLapBoard();
  }

  /** Carries the kart's pose over to the body that shoves cones around. */
  private syncBody(kart: Kart): void {
    const entry = this.kartBodies.get(kart);
    if (!entry) return;
    entry.body.setNextKinematicTranslation({ x: kart.motion.x, y: 0.3, z: kart.motion.z });
    _quaternion.setFromAxisAngle(UP, kart.motion.yaw);
    entry.body.setNextKinematicRotation({
      x: _quaternion.x,
      y: _quaternion.y,
      z: _quaternion.z,
      w: _quaternion.w,
    });
  }

  // --- the clipboard --------------------------------------------------------

  /** The whole settings menu of one kart, as the rows on its clipboard. */
  private boardPage(kart: Kart): MenuEntry[] {
    const rows: MenuEntry[] = [
      {
        id: 'kart:leave',
        label: 'Aussteigen',
        sub: 'Oder A/X gedrückt halten',
        icon: 'back',
        accent: 0xffc857,
        run: () => {
          if (this.driving === kart) this.leave(this.context!);
        },
      },
      {
        id: 'kart:steering',
        label: 'Lenkung',
        sub: 'Stick oder Lenkrad in der Hand',
        badge: STEERING_LABELS[kart.settings.steering],
        icon: 'settings',
        accent: 0x4aa8ff,
        run: () => {
          kart.settings.steering = kart.settings.steering === 'stick' ? 'wheel' : 'stick';
          if (kart.settings.steering === 'stick') this.wheelGrab = null;
          this.steer = kart.steerInput;
          kart.refreshSign();
          this.showBoard(kart);
          this.context?.notify(`Lenkung: ${STEERING_LABELS[kart.settings.steering]}`);
        },
      },
    ];

    for (const field of KART_FIELDS) {
      rows.push({
        id: `kart:${field.key}`,
        label: field.label,
        sub: field.sub,
        badge: kartFieldLabel(field, kart.settings),
        icon: 'settings',
        accent: kart.preset.color,
        run: () => this.stepField(kart, field),
      });
    }

    rows.push({
      id: 'kart:reset',
      label: 'Werte zurücksetzen',
      sub: `Wie ${kart.preset.name} aus der Box kam`,
      icon: 'reset',
      accent: 0x9d7bff,
      run: () => {
        Object.assign(kart.settings, clampKart(kart.preset.settings));
        kart.refreshSign();
        this.showBoard(kart);
        this.context?.notify(`${kart.preset.name} zurückgesetzt`);
      },
    });
    rows.push({
      id: 'kart:box',
      label: 'Zurück in die Box',
      sub: 'Setzt genau dieses Kart auf den Start',
      icon: 'reset',
      accent: 0x6f7d99,
      run: () => {
        if (this.driving === kart) this.leave(this.context!);
        kart.returnHome();
        this.syncBody(kart);
        this.context?.notify(`${kart.preset.name} steht wieder auf dem Start`);
      },
    });
    return rows;
  }

  /** One tap moves a value to its next notch. */
  private stepField(kart: Kart, field: KartField): void {
    const value = nextKartStep(field, kart.settings[field.key]);
    kart.settings[field.key] = clampKartField(field, value);
    this.showBoard(kart);
    playPick(true);
    this.context?.notify(`${field.label}: ${kartFieldLabel(field, kart.settings)}`);
  }

  /** Draws the clipboard afresh — every row shows the value it is at. */
  private showBoard(kart: Kart): void {
    kart.setBoard(this.boardPage(kart), kart.preset.tagline);
  }

  /** A long clipboard is scrolled with the stick of the pointing hand. */
  private updateScroll(dt: number, ctx: WorldContext): void {
    const kart = this.karts.find((entry) => entry.board.hovered.hand !== null);
    if (!kart || !kart.board.scrollable) {
      this.scrollArmed = true;
      this.scrollTimer = 0;
      return;
    }
    const y = ctx.input.get(kart.board.hovered.hand ?? 'right')?.thumbstick.y ?? 0;
    if (Math.abs(y) < SCROLL_OFF) {
      this.scrollArmed = true;
      this.scrollTimer = 0;
      return;
    }
    if (Math.abs(y) < SCROLL_ON) return;

    const rows = y > 0 ? 1 : -1;
    if (this.scrollArmed) {
      this.scrollArmed = false;
      this.scrollTimer = SCROLL_FIRST_DELAY;
      kart.board.scrollBy(rows);
      return;
    }
    this.scrollTimer -= dt;
    if (this.scrollTimer > 0) return;
    this.scrollTimer = SCROLL_REPEAT;
    kart.board.scrollBy(rows);
  }

  // --- the place ------------------------------------------------------------

  /** The tarmac, as one ribbon along the centre line. */
  private buildRoad(parent: THREE.Object3D): void {
    parent.add(this.ribbon(0, HALF_WIDTH, 0.012, this.tarmac));
    // The white lines just inside the edge; the eye needs them in a corner.
    parent.add(this.ribbon(HALF_WIDTH - 0.25, 0.09, 0.022, this.paint));
    parent.add(this.ribbon(-(HALF_WIDTH - 0.25), 0.09, 0.022, this.paint));
  }

  /**
   * A strip along the track: `offset` metres off the middle, `half` metres to
   * each side of that, laid at `y`.
   */
  private ribbon(
    offset: number,
    half: number,
    y: number,
    material: THREE.Material,
  ): THREE.Mesh {
    const count = this.path.length;
    const positions = new Float32Array(count * 2 * 3);
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      const point = this.path[i]!;
      const next = this.path[(i + 1) % count]!;
      const previous = this.path[(i - 1 + count) % count]!;
      // The tangent of the whole neighbourhood, so the strip does not kink.
      const tx = next.x - previous.x;
      const tz = next.z - previous.z;
      const length = Math.hypot(tx, tz) || 1;
      // Left-hand normal of the tangent, seen from above.
      const nx = tz / length;
      const nz = -tx / length;
      const base = i * 6;
      positions[base] = point.x + nx * (offset + half);
      positions[base + 1] = y;
      positions[base + 2] = point.z + nz * (offset + half);
      positions[base + 3] = point.x + nx * (offset - half);
      positions[base + 4] = y;
      positions[base + 5] = point.z + nz * (offset - half);

      const a = i * 2;
      const b = ((i + 1) % count) * 2;
      indices.push(a, a + 1, b + 1, a, b + 1, b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'surface:track';
    return mesh;
  }

  /** Red and white kerbs, laid along both edges of the tarmac. */
  private buildKerbs(parent: THREE.Object3D): void {
    const step = 2.2;
    let index = 0;
    for (let distance = 0; distance < this.lapLength; distance += step) {
      const point = this.pointAt(distance);
      const material = index % 2 === 0 ? this.kerbRed : this.kerbWhite;
      for (const side of [1, -1]) {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, step * 0.95), material);
        kerb.position.set(
          point.x + point.nx * side * (HALF_WIDTH + 0.28),
          0.035,
          point.z + point.nz * side * (HALF_WIDTH + 0.28),
        );
        kerb.rotation.y = Math.atan2(-point.tx, -point.tz);
        parent.add(kerb);
      }
      index++;
    }
  }

  /** Stacks of tyres outside the kerbs — solid, so nobody walks off the map. */
  private buildBarriers(parent: THREE.Object3D): void {
    for (let distance = 0; distance < this.lapLength; distance += BARRIER_SPACING) {
      const point = this.pointAt(distance);
      for (const side of [1, -1]) {
        const x = point.x + point.nx * side * (HALF_WIDTH + BARRIER_OFFSET);
        const z = point.z + point.nz * side * (HALF_WIDTH + BARRIER_OFFSET);
        const stack = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), this.tyre);
        stack.position.set(x, 0.3, z);
        stack.rotation.y = Math.atan2(-point.tx, -point.tz);
        parent.add(stack);
        stack.updateWorldMatrix(true, false);
        this.physics!.addStatic(stack, { membership: GROUP_WORLD, filter: ALL_GROUPS });
        this.solids.push(stack);
      }
    }
  }

  /** Start line, and the two boards standing beside it. */
  private buildStart(parent: THREE.Object3D): void {
    const point = this.pointAt(0);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(HALF_WIDTH * 2, 0.7),
      new THREE.MeshBasicMaterial({ map: checkerTexture(), toneMapped: false }),
    );
    line.rotation.x = -Math.PI / 2;
    // Laid flat first, then turned so its width runs across the track.
    line.rotation.z = Math.atan2(point.tx, point.tz);
    line.position.set(point.x, 0.03, point.z);
    parent.add(line);

    this.lapBoard = new TextPlane({
      width: 4.4,
      height: 1.5,
      title: 'Rundenzeiten',
      accent: 0xffc857,
    });
    this.standBoard(parent, this.lapBoard, 2, 1, 2.2);
    this.drawLapBoard();

    const sign = new TextPlane({
      width: 4,
      height: 1.3,
      title: 'Gokart',
      body: 'Lenkrad greifen = einsteigen. Rechter Trigger gibt Gas, linker bremst, der linke Stick lenkt. Aussteigen: A/X halten. Alles Weitere steht auf dem Klemmbrett im Kart.',
      accent: 0x4aa8ff,
    });
    this.standBoard(parent, sign, -4, -1, 2);
  }

  /**
   * Puts a board on two posts beside the track, turned to face the tarmac.
   *
   * @param along  how far round the lap it stands
   * @param side   1 outside the left-hand edge, -1 outside the right-hand one
   */
  private standBoard(
    parent: THREE.Object3D,
    board: TextPlane,
    along: number,
    side: number,
    height: number,
  ): void {
    const point = this.pointAt(along);
    const out = HALF_WIDTH + 4.2;
    const x = point.x + point.nx * side * out;
    const z = point.z + point.nz * side * out;
    // The plane looks along +Z, so it is turned until that points inwards.
    const yaw = Math.atan2(-point.nx * side, -point.nz * side);
    board.position.set(x, height, z);
    board.rotation.y = yaw;
    parent.add(board);

    for (const offset of [-1.5, 1.5]) {
      const px = x + Math.cos(yaw) * offset;
      const pz = z - Math.sin(yaw) * offset;
      this.slab(parent, this.tyre, [0.12, height, 0.12], [px, height / 2, pz], false);
    }
    // One bright panel behind each board — the only thing a portal sticks to
    // out here besides the ground.
    this.slab(parent, this.panel, [0.2, 2, 3.4], [x + point.nx * side * 0.4, 1, z + point.nz * side * 0.4], true);
  }

  /** The karts, lined up on the grid the way a grid is lined up. */
  private buildGrid(): void {
    const physics = this.physics!;
    KART_PRESETS.forEach((preset, index) => {
      const kart = new Kart(preset);
      const point = this.pointAt(3 + index * 3.4);
      const side = index % 2 === 0 ? 1 : -1;
      kart.placeHome(
        point.x + point.nx * side * 1.5,
        point.z + point.nz * side * 1.5,
        Math.atan2(-point.tx, -point.tz),
      );
      this.root.add(kart);
      this.karts.push(kart);

      kart.updateWorldMatrix(true, false);
      // Solid enough to knock cones over, but never the player: a kart that
      // shoves the capsule you are standing in launches you across the field.
      this.kartBodies.set(
        kart,
        physics.addKinematic(kart, {
          halfExtents: new THREE.Vector3(0.5, 0.3, 0.85),
          membership: GROUP_WORLD,
          filter: ALL_GROUPS & ~GROUP_PLAYER,
        }),
      );
      this.syncBody(kart);
    });
  }

  /** A point that far around the lap, with the tangent and normal there. */
  private pointAt(distance: number): {
    x: number;
    z: number;
    tx: number;
    tz: number;
    nx: number;
    nz: number;
  } {
    const total = this.lapLength;
    let left = ((distance % total) + total) % total;
    for (let i = 0; i < this.path.length; i++) {
      const a = this.path[i]!;
      const b = this.path[(i + 1) % this.path.length]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = Math.hypot(dx, dz);
      if (left > length && i < this.path.length - 1) {
        left -= length;
        continue;
      }
      const t = length > 0 ? left / length : 0;
      const tx = length > 0 ? dx / length : 0;
      const tz = length > 0 ? dz / length : -1;
      return { x: a.x + dx * t, z: a.z + dz * t, tx, tz, nx: tz, nz: -tx };
    }
    return { x: 0, z: 0, tx: 0, tz: -1, nx: -1, nz: 0 };
  }

  private drawLapBoard(): void {
    if (!this.lapBoard) return;
    const running = this.driving ? `Läuft: ${formatLap(this.lapTime)}` : 'Kein Kart besetzt';
    this.lapBoard.setText(
      this.lastLap === null ? 'Noch keine Runde' : `Letzte ${formatLap(this.lastLap)}`,
      `${this.bestLap === null ? 'Beste: —' : `Beste: ${formatLap(this.bestLap)}`} · ${running}`,
    );
  }
}

const UP = new THREE.Vector3(0, 1, 0);

/** The node a hand's belongings hang on. */
function gripOf(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

/** The same angle, brought back into -π…π. */
function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function formatLap(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}

/** The black and white squares of a start line, drawn once. */
function checkerTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const cell = 16;
  for (let x = 0; x < canvas.width / cell; x++) {
    for (let y = 0; y < canvas.height / cell; y++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#f2f4f8' : '#171b24';
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
