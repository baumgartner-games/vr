import * as THREE from 'three';
import { UIPanel } from '../../ui/UIPanel';
import type { MenuEntry } from '../../ui/menu';
import { TextPlane } from '../../ui/TextPlane';
import { kartAt, type KartMotion } from './kartDynamics';
import { STEERING_HINTS, clampKart, type KartPreset, type KartSettings } from './kartSettings';

/** How far the steering wheel turns from the middle to full lock, in radians. */
export const WHEEL_LOCK = THREE.MathUtils.degToRad(140);
/** How close a hand has to be to the middle of the wheel to take hold of it. */
export const WHEEL_GRAB_RANGE = 0.3;
/** A hand this far from the wheel has let go of it, button or no button. */
export const WHEEL_HOLD_RANGE = 0.45;
/** Seconds the A/X button is held before the driver climbs out. */
export const EXIT_HOLD = 0.6;

/** Wheel radius, front and rear — a kart has fatter rear tyres. */
const FRONT_RADIUS = 0.15;
const REAR_RADIUS = 0.18;
/**
 * Where the driver's **eye** ends up, above the kart's own floor.
 *
 * It used to be the other way round — the *feet* were put at a fixed depth and
 * the eye landed wherever the player's own height carried it. That works for
 * somebody standing in their room and fails for everybody else: a player
 * sitting on a chair is thirty to forty centimetres shorter measured from the
 * floor, and their eye came out level with the seat pan, which is exactly the
 * "I am sitting *on* the kart, not *in* it" everybody reported. A seat is a
 * place for a head, so the head is what gets placed; the rest of the rig
 * follows it.
 *
 * The number is a real kart: the pan sits at 0.33 m, a seated torso and neck
 * add about two thirds of a metre.
 */
const EYE_HEIGHT = 1.02;

const _local = new THREE.Vector3();

/**
 * One go-kart: a chassis to look at, a steering wheel to take hold of, a seat
 * the player is put into and a clipboard with every number the thing runs on.
 *
 * The kart knows how it looks and where its parts are. How it *drives* is
 * `kartDynamics`, and who is allowed to sit in it is the world's business.
 */
export class Kart extends THREE.Group {
  readonly settings: KartSettings;
  /** Where the kart is and how it is moving; driven by `stepKart`. */
  motion: KartMotion;
  /** The pit box it goes back to. */
  readonly home: KartMotion;

  /** Eye point of the seated driver — the head is put here. */
  readonly seat = new THREE.Object3D();
  /** Middle of the steering wheel; grabbing near it gets you in. */
  readonly wheelHub = new THREE.Object3D();
  /** The clipboard: the whole settings menu, bolted to the kart. */
  readonly board: UIPanel;
  /** What the pointer aims at to get in — the steering wheel itself. */
  readonly wheelTarget: THREE.Object3D;

  /** Steering wheel angle in radians, positive to the left. */
  wheelAngle = 0;

  private readonly wheelMount = new THREE.Group();
  private readonly wheelRim = new THREE.Group();
  private readonly frontWheels: THREE.Object3D[] = [];
  private readonly rollers: THREE.Object3D[] = [];
  private readonly sign: TextPlane;
  private readonly hover: TextPlane;
  private readonly progress: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly brakeLight: THREE.MeshStandardMaterial;
  private readonly owned: THREE.Material[] = [];
  /** What the clipboard currently lists — the panel only knows row numbers. */
  private entries: MenuEntry[] = [];

  constructor(readonly preset: KartPreset) {
    super();
    this.name = `kart-${preset.id}`;
    this.settings = clampKart(preset.settings);
    this.motion = kartAt(0, 0, 0);
    this.home = kartAt(0, 0, 0);

    const paint = this.own(
      new THREE.MeshStandardMaterial({ color: preset.color, roughness: 0.45, metalness: 0.25 }),
    );
    const frame = this.own(
      new THREE.MeshStandardMaterial({ color: 0x2c3348, roughness: 0.55, metalness: 0.4 }),
    );
    const rubber = this.own(new THREE.MeshStandardMaterial({ color: 0x1b1e26, roughness: 0.95 }));
    const rim = this.own(
      new THREE.MeshStandardMaterial({ color: 0xd6dbe6, roughness: 0.3, metalness: 0.7 }),
    );
    this.brakeLight = this.own(
      new THREE.MeshStandardMaterial({
        color: 0x5a1410,
        emissive: new THREE.Color(0xff2a1a),
        emissiveIntensity: 0,
        roughness: 0.5,
      }),
    );

    this.buildChassis(paint, frame);
    this.buildWheels(rubber, rim);
    this.buildSteering(frame, rim);
    this.wheelTarget = this.wheelRim;

    this.seat.position.set(0, EYE_HEIGHT, 0.16);
    this.add(this.seat);

    // The board sits where a clipboard would: to the right of the wheel,
    // tipped up towards the driver so it can be read without leaning over.
    this.board = new UIPanel({
      width: 0.2,
      title: preset.name,
      onSelect: (index, hand) => this.entries[index]?.run?.(hand),
    });
    this.board.position.set(0.36, 0.68, -0.14);
    this.board.rotation.set(-0.7, -0.55, -0.12);
    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(0.225, 0.36, 0.012),
      this.own(new THREE.MeshStandardMaterial({ color: 0x8a6a44, roughness: 0.8 })),
    );
    backing.position.copy(this.board.position).addScaledVector(this.boardNormal(), -0.008);
    backing.quaternion.copy(this.board.quaternion);
    this.add(backing, this.board);

    // The one sign that is always in front of the driver: how to get out
    // again. It sits on the column just over the wheel, where a dashboard
    // would be — level with the eye, so it is read without being looked for.
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.12, 8), frame);
    stalk.position.set(0, 0.92, -0.41);
    stalk.rotation.x = -0.3;
    this.add(stalk);

    // No turn about Y: the driver sits at +Z and a plane already looks that
    // way. Tipping it back by a little is all a dashboard needs.
    this.sign = new TextPlane({ width: 0.32, height: 0.115, title: '', accent: 0xffc857 });
    // Just above the rim of the wheel: read at a glance, out of the way of the
    // corner ahead.
    this.sign.position.set(0, 0.985, -0.43);
    this.sign.rotation.set(-0.3, 0, 0);
    this.add(this.sign);

    this.progress = new THREE.Mesh(
      new THREE.PlaneGeometry(0.27, 0.02),
      this.own(new THREE.MeshBasicMaterial({ color: 0xffc857, toneMapped: false })),
    );
    this.progress.position.set(0, 0.918, -0.418);
    this.progress.rotation.copy(this.sign.rotation);
    this.progress.visible = false;
    this.add(this.progress);

    // And the one that is readable from outside, so an empty kart says what
    // it is and how to get into it.
    this.hover = new TextPlane({
      width: 0.9,
      height: 0.34,
      title: preset.name,
      body: `${preset.tagline} · Lenkrad greifen zum Einsteigen`,
      accent: preset.color,
      align: 'center',
    });
    this.hover.position.set(0, 1.5, 0);
    this.add(this.hover);

    this.setSeated(false);
  }

  /** Writes a page onto the clipboard and keeps it, so a tap finds its row. */
  setBoard(entries: MenuEntry[], hint: string): void {
    this.entries = entries;
    this.board.setPage(this.preset.name, entries, false, hint);
  }

  /** Puts the kart down in its box and remembers the spot. */
  placeHome(x: number, z: number, yaw: number): void {
    this.home.x = x;
    this.home.z = z;
    this.home.yaw = yaw;
    this.home.vx = 0;
    this.home.vz = 0;
    this.motion = { ...this.home };
    this.applyMotion();
    this.applySteering();
  }

  /** Back to the box, standing still and with the wheels straight. */
  returnHome(): void {
    this.motion = { ...this.home };
    this.wheelAngle = 0;
    this.applyMotion();
    this.applySteering();
  }

  /** Copies the driving state onto the scene node. */
  applyMotion(): void {
    this.position.set(this.motion.x, 0, this.motion.z);
    this.rotation.set(0, this.motion.yaw, 0);
  }

  /** Where the steering wheel is right now, in world space. */
  hubPosition(target: THREE.Vector3): THREE.Vector3 {
    this.wheelHub.updateWorldMatrix(true, false);
    return this.wheelHub.getWorldPosition(target);
  }

  /**
   * The angle of a hand around the middle of the steering wheel, seen by the
   * driver: bigger is anticlockwise, which is a turn to the left.
   */
  handAngle(worldPoint: THREE.Vector3): number {
    this.wheelMount.updateWorldMatrix(true, false);
    _local.copy(worldPoint);
    this.wheelMount.worldToLocal(_local);
    return Math.atan2(_local.y, _local.x);
  }

  /** Where the steering is, as a -1 to 1 the dynamics understands. */
  get steerInput(): number {
    return THREE.MathUtils.clamp(this.wheelAngle / WHEEL_LOCK, -1, 1);
  }

  /**
   * Turns the wheel by a hand's worth of angle, up to full lock either way.
   */
  turnWheelBy(delta: number): void {
    this.wheelAngle = THREE.MathUtils.clamp(this.wheelAngle + delta, -WHEEL_LOCK, WHEEL_LOCK);
  }

  /** Turns the wheel to an input value; used while the stick is steering. */
  showSteer(steer: number): void {
    this.wheelAngle = THREE.MathUtils.clamp(steer, -1, 1) * WHEEL_LOCK;
  }

  /** Draws the current steering angle onto wheel and front tyres. */
  applySteering(): void {
    this.wheelRim.rotation.z = this.wheelAngle;
    const lock = this.steerInput * THREE.MathUtils.degToRad(this.settings.steerAngle);
    for (const wheel of this.frontWheels) wheel.rotation.y = lock;
  }

  /** Rolls the tyres by however far the kart has just travelled. */
  roll(distance: number): void {
    const turn = distance / REAR_RADIUS;
    for (const roller of this.rollers) roller.rotation.x -= turn;
  }

  /** The rear light comes on with the brake, so the driver sees it working. */
  setBraking(amount: number): void {
    this.brakeLight.emissiveIntensity = THREE.MathUtils.clamp(amount, 0, 1) * 2.4;
  }

  /** Swaps the sign between "get in" and "get out", and hides the outside one. */
  setSeated(seated: boolean): void {
    this.hover.visible = !seated;
    this.sign.visible = seated;
    this.progress.visible = false;
    if (seated) this.refreshSign();
  }

  /** The exit hint, with whatever the steering is set to right now. */
  refreshSign(): void {
    this.sign.setText(
      'Aussteigen: A/X halten',
      `Gas rechts · Bremse links · ${STEERING_HINTS[this.settings.steering]}`,
    );
  }

  /** How far the exit button has been held, 0 to 1. */
  setExitProgress(fraction: number): void {
    const value = THREE.MathUtils.clamp(fraction, 0, 1);
    this.progress.visible = value > 0.001;
    this.progress.scale.x = Math.max(value, 0.001);
    // Grows out of the driver's left instead of from the middle.
    this.progress.position.x = -0.135 * (1 - value);
  }

  /** Turns the outside sign towards a head, so it can be read from anywhere. */
  faceHover(head: THREE.Vector3): void {
    if (!this.hover.visible) return;
    this.hover.lookAt(head);
  }

  disposeKart(): void {
    this.board.dispose();
    this.sign.dispose();
    this.hover.dispose();
    for (const material of this.owned) material.dispose();
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry?.dispose();
    });
  }

  // --- the shape of the thing ----------------------------------------------

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private buildChassis(paint: THREE.Material, frame: THREE.Material): void {
    const box = (
      material: THREE.Material,
      size: readonly [number, number, number],
      at: readonly [number, number, number],
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
      mesh.position.set(at[0], at[1], at[2]);
      this.add(mesh);
      return mesh;
    };

    box(frame, [0.62, 0.07, 1.5], [0, 0.13, 0]);
    box(paint, [0.86, 0.16, 0.9], [0, 0.2, 0.05]);
    // Nose cone and the two side pods a kart is mostly made of.
    box(paint, [0.5, 0.13, 0.4], [0, 0.19, -0.72]);
    box(paint, [0.13, 0.2, 0.8], [0.44, 0.24, -0.05]);
    box(paint, [0.13, 0.2, 0.8], [-0.44, 0.24, -0.05]);

    // Seat: a pan and a backrest, tipped back a little.
    box(frame, [0.44, 0.06, 0.42], [0, 0.3, 0.2]);
    const back = box(frame, [0.44, 0.5, 0.08], [0, 0.55, 0.44]);
    back.rotation.x = -0.18;

    // Engine behind the seat, and the brake light on the very back.
    box(frame, [0.32, 0.3, 0.34], [0, 0.34, 0.66]);
    box(this.brakeLight, [0.3, 0.08, 0.04], [0, 0.5, 0.84]);
  }

  private buildWheels(rubber: THREE.Material, rim: THREE.Material): void {
    const build = (x: number, z: number, radius: number, steered: boolean): void => {
      // A steering knuckle that turns, with the tyre rolling inside it.
      const knuckle = new THREE.Group();
      knuckle.position.set(x, radius, z);
      this.add(knuckle);

      const roller = new THREE.Group();
      knuckle.add(roller);

      const tyre = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.15, 18), rubber);
      tyre.rotation.z = Math.PI / 2;
      roller.add(tyre);

      const hub = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.45, radius * 0.45, 0.16, 12),
        rim,
      );
      hub.rotation.z = Math.PI / 2;
      roller.add(hub);
      // A stripe, so a spinning wheel actually looks like it is spinning.
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.17, radius * 1.5, 0.03), rim);
      roller.add(marker);

      this.rollers.push(roller);
      if (steered) this.frontWheels.push(knuckle);
    };

    build(0.46, -0.55, FRONT_RADIUS, true);
    build(-0.46, -0.55, FRONT_RADIUS, true);
    build(0.5, 0.55, REAR_RADIUS, false);
    build(-0.5, 0.55, REAR_RADIUS, false);
  }

  private buildSteering(frame: THREE.Material, rim: THREE.Material): void {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 10), frame);
    column.position.set(0, 0.55, -0.16);
    column.rotation.x = -0.5;
    this.add(column);

    // The wheel plane leans back towards the driver, like every steering wheel.
    this.wheelMount.position.set(0, 0.78, -0.32);
    this.wheelMount.rotation.x = -0.42;
    this.add(this.wheelMount);
    this.wheelMount.add(this.wheelRim);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.017, 10, 28), rim);
    this.wheelRim.add(ring);
    for (const angle of [Math.PI / 2, Math.PI * 1.17, Math.PI * 1.83]) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.13, 0.018), frame);
      spoke.position.set(Math.cos(angle) * 0.07, Math.sin(angle) * 0.07, 0);
      spoke.rotation.z = angle - Math.PI / 2;
      this.wheelRim.add(spoke);
    }
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), frame);
    boss.rotation.x = Math.PI / 2;
    this.wheelRim.add(boss);

    this.wheelMount.add(this.wheelHub);
  }

  /** Which way the clipboard faces — used to sit its backing board behind it. */
  private boardNormal(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyEuler(this.board.rotation);
  }
}
