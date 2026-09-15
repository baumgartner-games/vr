import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_S } from '../../nav/navTile';
import { ClimbHud } from '../../climb/ClimbHud';
import {
  PAD_HEIGHT,
  PAD_LOAD_GAP,
  PAD_MAX_DRIVE_TIME,
  PAD_REST,
  RAMP_THICK,
  overPad,
  padAtRest,
  padCatches,
  padDrive,
  padHit,
  padRise,
  padSlide,
  padTop,
  padTurned,
  rampBox,
  stepPad,
  type PadRect,
  type PadSpring,
} from '../../climb/crashPad';
import { fatigueTick, landingBuzz, slipTick, ticksBetween } from '../../climb/gripHaptics';
import { gripReport, seatOf, type ClimbPose, type HandGrip } from '../../climb/gripQuality';
import { holdColor, holdLabel, type HoldFeature, type HoldMaterial } from '../../climb/holds';
import { GRAB_AT, SLIP_AT, freshStamina, stepStamina, type Stamina } from '../../climb/stamina';
import { GRAB_GLOW } from '../../../core/colors';
import { gripAnchor, type ControllerState, type Handedness } from '../../../core/XRInput';
import type { WorldContext } from '../../../core/types';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../../physics/PhysicsWorld';
import { CLIMB } from '../layout';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Kletterwand** — Südosten, und die Grenze zwischen Gitter und Metern
 * läuft mitten hindurch.
 *
 * Die **Hülle** steht auf dem Gitter: der Boden der Zone, die Wand als Masse
 * dahinter, der Rücksprung der Ecke. Die **Griffe** stehen in Metern, und das
 * ist dieselbe Entscheidung wie in der alten Kletterhalle — ein Griff ist kein
 * Mobiliar, sondern das Spiel selbst, und seine Stelle auf zehn Zentimeter
 * genau ist genau das, was ihn schwer oder leicht macht. Auf eine Kachelkante
 * gezogen wäre sie neu einzumessen, für nichts.
 *
 * Drei Materialien, drei Fragen (`climb/holds.ts`): Die **Leiter** links kann
 * jeder, sie kostet keine Ausdauer und ist der Nullpunkt der Wand. Der **raue
 * Fels** in der Mitte ist der Normalfall. Der **glatte Fels** rechts trägt
 * weniger und frisst fast doppelt so schnell Kraft.
 *
 * **Der Körper hängt an den Händen.** Keine eigene Kletterbewegung: Jede Hand
 * hat einen Anker in der Welt, und der Körper wird jedes Bild so weit
 * verschoben, dass die Hände wieder dort sind. Gefahren wird das über den
 * **Flugmodus** der Fortbewegung (`ZoneHost.setFlight`) und nicht über die
 * Position des Rigs — dadurch bleiben Wände Wände, und beim Loslassen wird aus
 * dem letzten Zug ein Schwung.
 *
 * **Und unten liegt ein Sprungkissen** (`climb/crashPad.ts`), mit einer Rampe
 * zurück hinauf: Der Weg nach unten ist ein Sprung, und ein Sprung ohne
 * Auffangen wäre ein Sturz.
 */

/**
 * **Die Wand**: die Kachelreihe **nördlich** der Zone, acht Meter hoch.
 *
 * Nördlich und nicht in der Zone: Eine acht Meter hohe Masse auf einer
 * begehbaren Kachel wäre ein Weg im Graphen, den man in Wirklichkeit nicht
 * gehen kann — ein NPC liefe hinein und stünde. Also hat die Wand ihre eigene
 * Reihe, auf der kein Boden liegt (`layout.ts`, `CLIMB`), und man kommt von
 * Westen herein.
 */
export const WALL = { x: CLIMB.x, z: CLIMB.z - 1, w: CLIMB.w, d: 1 } as const;
export const WALL_H = 8;

/** Die Fläche der Wand in Metern — die Südseite ihrer Kachelreihe. */
const FACE_Z = WALL.z + WALL.d;
/** Und wie weit nach Westen sie anfängt. */
const FACE_X = WALL.x;

/** Das Sprungkissen davor, in Metern. */
export const PAD: PadRect = {
  minX: CLIMB.x + 1,
  maxX: CLIMB.x + CLIMB.w - 1,
  minZ: FACE_Z,
  maxZ: FACE_Z + 3,
};
/** Wo die Rampe auf das Kissen liegt und wie breit sie ist. */
const RAMP_X = CLIMB.x + 2;
const RAMP_W = 1.6;
const RAMP_FOOT = PAD.maxZ + 2.2;

/** Wie weit eine Hand neben einem Griff noch zupacken darf. */
const REACH = 0.16;
/** Wie schnell der Zug den Körper höchstens bewegt und wie weich er dabei ist. */
const MAX_CLIMB_SPEED = 3.6;
const MAX_LAUNCH_SPEED = 6;
const DRIVE_BLEND = 18;
/** Wie tief der Strahl unter den Füßen nach einem Tritt sucht. */
const FOOT_PROBE = 0.35;

export function stampClimb(plan: GridPlan): void {
  // **Die Wand ist eine Masse.** Acht Meter hoch über eine Kachelreihe — als
  // Kachelwände wären das zehn Stück von je 2,80 m, und darüber wäre Luft.
  plan.mass('wall', { ...WALL }, 0, WALL_H);
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 */
export function fitClimb(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-klettern',
    kind: 'sign',
    x: CLIMB.x + 1,
    z: CLIMB.z + CLIMB.d - 1,
    dir: DIR_S,
    props: { text: 'Greifen hält dich an der Wand — schlechte Griffe kosten Ausdauer' },
  });
}

// --- und was daran hängt ----------------------------------------------------

/** Ein Griff an der Wand, so wie die Hand ihn vorfindet. */
interface Hold {
  mesh: THREE.Mesh;
  skin: THREE.Material;
  material: HoldMaterial;
  feature: WallFeature;
  /** Der Punkt, an dem man hängt, in Weltmetern. */
  grip: THREE.Vector3;
  /** Bei Sprosse, Leiste und Riss: die Strecke, auf der man überall zupackt. */
  axis: THREE.Vector3 | null;
  half: number;
  radius: number;
  normal: THREE.Vector3;
}

/** Eine Hand, die gerade hängt. */
interface Grasp {
  hold: Hold;
  /** Wie gut sie beim Zupacken saß — das ändert sich danach nicht mehr. */
  seat: number;
  anchor: THREE.Vector3;
  point: THREE.Vector3;
  /** Sekunden seit dem Zupacken — die Uhr der Vibration. */
  time: number;
  quality: number;
}

/** Was an einer **Wand** hängt: alles außer dem Holm, den es hier nicht gibt. */
type WallFeature = Exclude<HoldFeature, 'rail'>;

/**
 * Was jede Griffart mitbringt: wie weit sie aus der Wand ragt, wie weit die
 * Hand danebenliegen darf, und ob sie eine Achse hat, an der entlang man
 * überall zupacken darf.
 */
const HOLD_SHAPES: Readonly<
  Record<
    WallFeature,
    { depth: number; radius: number; axis: readonly number[] | null; half: number }
  >
> = {
  rung: { depth: 0.1, radius: 0.1, axis: [1, 0, 0], half: 0.28 },
  jug: { depth: 0.05, radius: 0.11, axis: null, half: 0 },
  edge: { depth: 0.037, radius: 0.085, axis: [1, 0, 0], half: 0.15 },
  crack: { depth: 0.045, radius: 0.085, axis: [0, 1, 0], half: 0.22 },
  sloper: { depth: 0.03, radius: 0.13, axis: null, half: 0 },
  flat: { depth: 0.014, radius: 0.12, axis: null, half: 0 },
};

/** Wo an der Wand welcher Griff sitzt — in Metern, von ihrer Westecke aus. */
interface HoldSpot {
  /** Meter östlich der Westecke der Wand, und Meter über dem Boden. */
  at: readonly [number, number];
  material: HoldMaterial;
  feature: WallFeature;
}

/**
 * **Die Route**, drei Bahnen nebeneinander.
 *
 * Links die Leiter (jeder kommt hoch), in der Mitte rauer Fels mit Henkeln,
 * Leisten und einem Riss, rechts die Glattwand mit Ballen und Flächen. Wer
 * quer hinüberwechselt, merkt den Unterschied im Arm, bevor er ihn im Balken
 * sieht.
 */
const HOLDS: readonly HoldSpot[] = [
  // Die Leiterbahn: Sprossen alle 55 cm.
  ...Array.from({ length: 11 }, (_, i) => ({
    at: [1.3, 0.8 + i * 0.55] as const,
    material: 'perfect' as const,
    feature: 'rung' as const,
  })),
  // Rauer Fels: Henkel, Leisten, ein Riss auf halber Höhe.
  { at: [3.4, 0.9], material: 'rough', feature: 'jug' },
  { at: [4.4, 1.5], material: 'rough', feature: 'edge' },
  { at: [3.3, 2.2], material: 'rough', feature: 'jug' },
  { at: [4.5, 2.9], material: 'rough', feature: 'crack' },
  { at: [3.5, 3.6], material: 'rough', feature: 'edge' },
  { at: [4.6, 4.3], material: 'rough', feature: 'jug' },
  { at: [3.6, 5.1], material: 'rough', feature: 'edge' },
  { at: [4.4, 5.9], material: 'rough', feature: 'jug' },
  { at: [3.9, 6.7], material: 'rough', feature: 'jug' },
  // Glattwand: Ballen und Flächen, und ein Henkel als Belohnung ganz oben.
  { at: [6.6, 1.1], material: 'smooth', feature: 'sloper' },
  { at: [7.5, 1.9], material: 'smooth', feature: 'flat' },
  { at: [6.5, 2.7], material: 'smooth', feature: 'sloper' },
  { at: [7.6, 3.5], material: 'smooth', feature: 'flat' },
  { at: [6.7, 4.3], material: 'smooth', feature: 'sloper' },
  { at: [7.4, 5.2], material: 'smooth', feature: 'flat' },
  { at: [6.9, 6.2], material: 'smooth', feature: 'jug' },
];

const HANDS: readonly Handedness[] = ['left', 'right'];

const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _target = new THREE.Vector3();
const _point = new THREE.Vector3();
const _seat = new THREE.Vector3();
const _drop = new THREE.Vector3();
const _cushion = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

export class ClimbZone implements TestZone {
  private readonly holds: Hold[] = [];
  private readonly grasps = new Map<Handedness, Grasp>();
  private readonly lit = new Map<Handedness, Hold>();
  private readonly drive = new THREE.Vector3();
  private readonly probe = new THREE.Raycaster();
  private readonly owned: THREE.Material[] = [];
  private readonly shapes = new Map<WallFeature, THREE.BufferGeometry>();
  private readonly extra: THREE.BufferGeometry[] = [];

  private stamina: Stamina = freshStamina();
  private hud: ClimbHud | null = null;
  private lockedByUs = false;

  /** Das Kissen, seine Feder und der Sprung, der gerade darin ausläuft. */
  private pad: { mesh: THREE.Mesh; body: PhysicsBody; spring: PadSpring } | null = null;
  private landing: { slideX: number; slideZ: number; time: number } | null = null;
  /** Das höchste Falltempo seit dem letzten Bodenkontakt, in m/s. */
  private fell = 0;

  private world: ZoneHost | null = null;
  /** Der Weltkontext aus `build` — `reset` und `dispose` bekommen keinen. */
  private ctx: WorldContext | null = null;
  private glow: THREE.MeshStandardMaterial | null = null;
  private readonly skins = new Map<HoldMaterial, THREE.MeshStandardMaterial>();

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.ctx = ctx;
    this.glow = this.own(
      new THREE.MeshStandardMaterial({
        color: GRAB_GLOW,
        roughness: 0.5,
        metalness: 0.1,
        emissive: new THREE.Color(GRAB_GLOW),
        emissiveIntensity: 0.85,
      }),
    );

    for (const spot of HOLDS) this.buildHold(world, spot);
    this.buildPad(world);

    this.hud = new ClimbHud();
    this.hud.mount(ctx.camera);
    this.hud.setValues(this.stamina.value, null, null);
  }

  update(dt: number, ctx: WorldContext): void {
    this.updateClimb(dt, ctx);
    this.updatePad(dt, ctx);
  }

  /** `B`/`Y`: Hände auf, Ausdauer voll, Kissen in Ruhe. */
  reset(): void {
    const ctx = this.ctx;
    if (ctx) for (const side of HANDS) this.letGo(ctx, side, false);
    this.releaseRig(ctx);
    this.landing = null;
    this.fell = 0;
    this.stamina = freshStamina();
    this.hud?.setValues(this.stamina.value, null, null);
  }

  dispose(): void {
    const ctx = this.ctx;
    if (ctx) {
      for (const side of HANDS) this.letGo(ctx, side, false);
      this.hud?.unmount(ctx.camera);
    }
    this.releaseRig(ctx);
    this.hud?.dispose();
    this.hud = null;
    this.grasps.clear();
    this.lit.clear();
    this.holds.length = 0;
    this.pad = null;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    this.skins.clear();
    for (const shape of this.shapes.values()) shape.dispose();
    this.shapes.clear();
    for (const shape of this.extra) shape.dispose();
    this.extra.length = 0;
    this.world = null;
    this.ctx = null;
  }

  // --- die Wand -------------------------------------------------------------

  /** Einen Griff hinhängen — Bild, Punkt, Achse und Normale in einem. */
  private buildHold(world: ZoneHost, spot: HoldSpot): void {
    const skin = this.skin(spot.material);
    const mesh = new THREE.Mesh(this.shape(spot.feature), skin);
    const { depth, radius, axis, half } = HOLD_SHAPES[spot.feature];

    if (spot.feature === 'rung') mesh.rotation.z = Math.PI / 2;
    if (spot.feature === 'flat') mesh.rotation.x = Math.PI / 2;
    if (spot.feature === 'jug') mesh.scale.set(1, 0.85, 0.95);
    if (spot.feature === 'sloper') mesh.scale.set(1, 0.8, 0.34);

    mesh.name = `hold:${spot.material}:${spot.feature}`;
    // Die Wand schaut nach Süden, also ragt ein Griff in +Z.
    mesh.position.set(FACE_X + spot.at[0], spot.at[1], FACE_Z + depth * 0.5);
    world.root.add(mesh);
    mesh.updateWorldMatrix(true, false);

    const grip = new THREE.Vector3(FACE_X + spot.at[0], spot.at[1], FACE_Z + depth);
    const normal = new THREE.Vector3(0, 0, 1);
    const worldAxis = axis ? new THREE.Vector3(axis[0], axis[1], axis[2]).normalize() : null;
    this.holds.push({
      mesh,
      skin,
      material: spot.material,
      feature: spot.feature,
      grip,
      axis: worldAxis,
      half,
      radius,
      normal,
    });

    // Was aus der Wand ragt, ist auch ein Tritt: Auf einer Sprosse, einem
    // Henkel und einer Leiste soll man stehen können. Flächen und Ballen
    // tragen zu wenig auf — und jeder Körper, den es nicht gibt, ist einer
    // weniger, den die Physik jedes Bild anfassen muss.
    if (spot.feature === 'rung' || spot.feature === 'jug' || spot.feature === 'edge') {
      world.addSolid(mesh);
    }
  }

  /**
   * **Das Kissen** — ein Quader, den man sieht, und ein **kinematischer**
   * Körper, auf dem man steht.
   *
   * Kinematisch und nicht fest, denn darin steckt der Trick: Der Körper wird
   * jedes Bild um die Einsinktiefe nach unten gesetzt, und damit ist die
   * Fläche, auf der der Spieler steht, selbst in Bewegung. Der Quader darüber
   * wird gestaucht — was einsinkt, wird flacher, sonst stünde man in der Luft
   * über einem Kissen, das aussieht wie immer.
   */
  private buildPad(world: ZoneHost): void {
    const cushion = this.own(
      new THREE.MeshStandardMaterial({ color: 0x3a76d8, roughness: 0.94, metalness: 0 }),
    );
    const wedge = this.own(
      new THREE.MeshStandardMaterial({ color: 0x24487f, roughness: 0.94, metalness: 0 }),
    );

    const x = (PAD.minX + PAD.maxX) / 2;
    const z = (PAD.minZ + PAD.maxZ) / 2;
    const mesh = new THREE.Mesh(
      this.keep(new THREE.BoxGeometry(PAD.maxX - PAD.minX, PAD_HEIGHT, PAD.maxZ - PAD.minZ)),
      cushion,
    );
    mesh.name = 'crash-pad';
    mesh.position.set(x, PAD_HEIGHT / 2, z);
    world.root.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const body = world.physics.addKinematic(mesh, {
      membership: GROUP_WORLD,
      filter: ALL_GROUPS,
      friction: 0.95,
      restitution: 0,
    });
    this.pad = { mesh, body, spring: padAtRest() };

    /**
     * Die Rampe zurück hinauf: ein flach gekippter Quader, dessen
     * **Oberseite** von der Kissenkante bis auf den Boden läuft. Ohne sie käme
     * niemand wieder hoch — der Körper steigt Stufen bis 32 cm, ein Kissen ist
     * 1,40 m hoch.
     */
    const box = rampBox(PAD.maxZ, RAMP_FOOT);
    const ramp = new THREE.Mesh(
      this.keep(new THREE.BoxGeometry(RAMP_W, RAMP_THICK, box.length)),
      wedge,
    );
    ramp.rotation.x = box.slope;
    ramp.position.set(RAMP_X, box.centreY, box.centreZ);
    ramp.name = 'crash-pad-ramp';
    world.root.add(ramp);
    ramp.updateWorldMatrix(true, false);
    world.addSolid(ramp);
  }

  // --- klettern -------------------------------------------------------------

  /**
   * Ein Bild Klettern: nachsehen, wer wo hängt, den Halt rechnen, die Ausdauer
   * fortschreiben, den Körper an die Hände hängen und rückmelden, wie es steht.
   */
  private updateClimb(dt: number, ctx: WorldContext): void {
    if (dt <= 0) return;
    this.readHands(ctx);

    const pose = this.buildPose(ctx);
    const report = gripReport(pose);
    const step = stepStamina(this.stamina, report.support, report.drain, report.hanging, dt);
    this.stamina = { value: step.value, ramp: step.ramp };

    for (const side of HANDS) {
      const grasp = this.grasps.get(side);
      if (!grasp) continue;
      grasp.quality = (side === 'left' ? report.left : report.right) ?? 0;
      grasp.time += dt;
    }

    this.feedback(ctx, dt);

    // Erst jetzt abrechnen: Wer unter die Schwelle gerutscht ist, verliert die
    // Hand; wem die Kraft ausgegangen ist, beide.
    if (step.spent) {
      this.fall(ctx, 'Ausdauer leer');
    } else {
      for (const side of HANDS) {
        const grasp = this.grasps.get(side);
        if (!grasp || grasp.quality >= SLIP_AT) continue;
        ctx.input.get(side)?.pulse(0.85, 120);
        this.letGo(ctx, side, true);
      }
    }

    this.driveBody(dt, ctx);
    this.hud?.setValues(this.stamina.value, report.left, report.right);
  }

  /** Was die Hände tun: zupacken, loslassen, und was in Reichweite liegt. */
  private readHands(ctx: WorldContext): void {
    for (const controller of ctx.input.controllers) {
      const hand = controller.handedness;
      if (!hand) continue;

      // Eine Hand, die aus dem Blickfeld der Brille gerät, lässt los — aber
      // sie ist nicht abgerutscht. „Abgerutscht" heißt: Der Halt hat nicht
      // gereicht, und das ist eine Auskunft über die Wand, keine über das
      // Tracking.
      if (!controller.tracked) {
        this.letGo(ctx, hand, false);
        this.light(hand, null);
        continue;
      }

      if (this.grasps.has(hand)) {
        if (!controller.squeeze.pressed) this.letGo(ctx, hand, false);
        continue;
      }

      gripAnchor(controller).getWorldPosition(_hand);
      const near = this.nearestHold(_hand);
      this.light(hand, near?.hold ?? null);
      ctx.hands.setGlow(hand, near !== null);

      if (!near || !controller.squeeze.justPressed) continue;
      if (this.stamina.value < GRAB_AT) {
        this.world?.notify('Zu erschöpft — erst ausruhen');
        controller.pulse(0.2, 160);
        continue;
      }
      this.takeHold(ctx, hand, controller, near.hold, near.distance);
    }
  }

  /** Der Griff, an dem diese Hand gerade am dichtesten dran ist. */
  private nearestHold(at: THREE.Vector3): { hold: Hold; distance: number } | null {
    let best: Hold | null = null;
    let bestDistance = Infinity;
    for (const hold of this.holds) {
      const distance = this.distanceTo(hold, at);
      if (distance > hold.radius + REACH || distance >= bestDistance) continue;
      best = hold;
      bestDistance = distance;
    }
    return best ? { hold: best, distance: bestDistance } : null;
  }

  /**
   * Die Stelle des Griffs, an der diese Hand sitzt.
   *
   * Bei einem Henkel ist das immer derselbe Punkt; bei einer **Leiste, einer
   * Sprosse oder einem Riss** die nächstgelegene Stelle auf ihrer Strecke. Ein
   * Griff von einem halben Meter Länge hat keine Mitte, an der man hängt — und
   * wer das übersieht, reißt jeden, der eine Sprosse am Ende anfasst, zu ihrer
   * Mitte hin.
   */
  private seatOn(hold: Hold, at: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
    out.copy(hold.grip);
    if (!hold.axis) return out;
    _seat.copy(at).sub(hold.grip);
    const along = THREE.MathUtils.clamp(_seat.dot(hold.axis), -hold.half, hold.half);
    return out.addScaledVector(hold.axis, along);
  }

  private distanceTo(hold: Hold, at: THREE.Vector3): number {
    return at.distanceTo(this.seatOn(hold, at, _target));
  }

  /** Zupacken. */
  private takeHold(
    ctx: WorldContext,
    hand: Handedness,
    controller: ControllerState,
    hold: Hold,
    distance: number,
  ): void {
    gripAnchor(controller).getWorldPosition(_hand);
    // Der Anker ist da, wo die Hand ist — aber höchstens einen Griffradius von
    // der Stelle des Griffs entfernt, an der sie sitzt. Sonst hinge man an
    // einem Punkt in der Luft daneben.
    this.seatOn(hold, _hand, _point);
    _delta.copy(_hand).sub(_point);
    if (_delta.length() > hold.radius) _delta.setLength(hold.radius);

    this.grasps.set(hand, {
      hold,
      seat: seatOf(distance, hold.radius),
      anchor: _point.clone().add(_delta),
      point: _hand.clone(),
      time: 0,
      quality: 1,
    });
    this.light(hand, null);
    ctx.hands.setGlow(hand, false);
    this.holdRig(ctx);

    // Der eine Schlag, der sagt, wie gut das war — aus dem Halt gerechnet, den
    // dieser Griff jetzt hergibt (`climb/gripHaptics.ts`).
    const preview = gripReport(this.buildPose(ctx));
    const buzz = landingBuzz((hand === 'left' ? preview.left : preview.right) ?? 0);
    controller.pulse(buzz.intensity, buzz.duration);
    this.world?.notify(holdLabel(hold.material, hold.feature));
  }

  /** Loslassen — freiwillig oder weil es nicht mehr ging. */
  private letGo(ctx: WorldContext | null, hand: Handedness, slipped: boolean): void {
    if (!this.grasps.delete(hand)) return;
    ctx?.hands.setGlow(hand, false);
    if (this.grasps.size > 0) return;
    this.releaseRig(ctx);
    if (slipped) this.world?.notify('Abgerutscht');
  }

  /** Beide Hände auf, und eine Meldung dazu. */
  private fall(ctx: WorldContext, why: string): void {
    if (this.grasps.size === 0) return;
    for (const side of HANDS) {
      ctx.input.get(side)?.pulse(1, 180);
      this.letGo(ctx, side, false);
    }
    this.world?.notify(why);
  }

  /**
   * Wie der Kletterer gerade steht — der ganze Eingang der Rechnung.
   *
   * Die **Restkraft** ist die Ausdauer des letzten Bildes und nicht die von
   * jetzt: Der Halt geht in die Ausdauer ein und die Ausdauer in den Halt, und
   * irgendwo muss man diesen Kreis aufschneiden.
   */
  private buildPose(ctx: WorldContext): ClimbPose {
    ctx.rig.getHeadPosition(_head);
    return {
      left: this.handGrip(ctx, 'left'),
      right: this.handGrip(ctx, 'right'),
      headY: _head.y,
      eyeHeight: ctx.rig.getHeadHeight(),
      footing: this.hasFooting(ctx),
      strength: this.stamina.value,
    };
  }

  private handGrip(ctx: WorldContext, hand: Handedness): HandGrip | null {
    const grasp = this.grasps.get(hand);
    if (!grasp) return null;
    const controller = ctx.input.get(hand);
    if (controller) gripAnchor(controller).getWorldPosition(grasp.point);
    else grasp.point.copy(grasp.anchor);
    return {
      material: grasp.hold.material,
      feature: grasp.hold.feature,
      seat: grasp.seat,
      normal: grasp.hold.normal,
      point: grasp.point,
    };
  }

  /**
   * Stehen die Füße auf etwas?
   *
   * Nicht `locomotion.grounded`: Solange die Arme den Körper führen, fliegt er
   * für die Physik, und „am Boden" wäre dann immer falsch. Also ein kurzer
   * Strahl von den Füßen nach unten — er findet die Matte, ein Podest und jede
   * Sprosse, auf der man steht.
   */
  private hasFooting(ctx: WorldContext): boolean {
    const solids = this.world?.solids;
    if (!solids || solids.length === 0) return false;
    ctx.rig.getHeadPosition(_head);
    _feet.set(_head.x, ctx.rig.getFloorY() + 0.05, _head.z);
    this.probe.set(_feet, _down);
    this.probe.far = FOOT_PROBE;
    return this.probe.intersectObjects(solids as THREE.Object3D[], false).length > 0;
  }

  /**
   * **Der Körper hängt an den Händen.**
   *
   * Jede Hand hat einen Anker in der Welt, und der Körper wird jedes Bild so
   * weit verschoben, dass die Hände wieder dort sind. Zieht man die Hand nach
   * unten, geht der Körper nach oben.
   */
  private driveBody(dt: number, ctx: WorldContext): void {
    if (this.grasps.size === 0) return;

    _delta.set(0, 0, 0);
    let count = 0;
    for (const [hand, grasp] of this.grasps) {
      const controller = ctx.input.get(hand);
      if (!controller) continue;
      gripAnchor(controller).getWorldPosition(_hand);
      _delta.add(_target.copy(grasp.anchor).sub(_hand));
      count++;
    }
    if (count === 0) return;
    _delta.divideScalar(count * dt);
    if (_delta.length() > MAX_CLIMB_SPEED) _delta.setLength(MAX_CLIMB_SPEED);

    // Geglättet, damit ein einzelnes verwackeltes Bild nicht als Ruck ankommt —
    // und damit beim Loslassen ein Schwung übrig bleibt und kein Zucken.
    this.drive.lerp(_delta, Math.min(1, DRIVE_BLEND * dt));
    this.world?.setFlight(this.drive);
  }

  /** Der Stick gehört jetzt nicht mehr dem Spieler: Er hängt an der Wand. */
  private holdRig(ctx: WorldContext): void {
    if (this.lockedByUs) return;
    this.lockedByUs = true;
    ctx.rig.locked = true;
  }

  /** Und beim Loslassen zurück, mitsamt dem Schwung des letzten Zuges. */
  private releaseRig(ctx: WorldContext | null): void {
    if (this.lockedByUs && ctx) {
      ctx.rig.locked = false;
      this.lockedByUs = false;
    }
    if (this.drive.lengthSq() > 0) {
      if (this.drive.length() > MAX_LAUNCH_SPEED) this.drive.setLength(MAX_LAUNCH_SPEED);
      // Erst der gedeckelte Schwung, dann zurück an die Schwerkraft: `null`
      // übernimmt genau diese Geschwindigkeit in den Körper.
      this.world?.setFlight(this.drive);
      this.drive.set(0, 0, 0);
    }
    this.world?.setFlight(null);
  }

  /**
   * Was die Hände fühlen: das Ticken am schlechten Griff und die Warnung, wenn
   * die Kraft ausgeht (`climb/gripHaptics.ts`). Höchstens ein Stoß je Muster
   * und Bild — mehr fühlt ohnehin niemand.
   */
  private feedback(ctx: WorldContext, dt: number): void {
    for (const [hand, grasp] of this.grasps) {
      const controller = ctx.input.get(hand);
      if (!controller) continue;
      const from = grasp.time - dt;

      const slip = slipTick(grasp.quality);
      if (slip && ticksBetween(slip.period, from, grasp.time).length > 0) {
        controller.pulse(slip.buzz.intensity, slip.buzz.duration);
      }

      const fatigue = fatigueTick(this.stamina.value);
      if (fatigue && ticksBetween(fatigue.period, from, grasp.time).length > 0) {
        controller.pulse(fatigue.buzz.intensity, fatigue.buzz.duration);
      }
    }
  }

  /** Der Griff unter einer Hand leuchtet auf — und der vorige wieder aus. */
  private light(hand: Handedness, hold: Hold | null): void {
    const previous = this.lit.get(hand);
    if (previous === hold) return;
    if (previous && !this.litByOther(hand, previous)) previous.mesh.material = previous.skin;
    if (hold && this.glow) {
      hold.mesh.material = this.glow;
      this.lit.set(hand, hold);
    } else {
      this.lit.delete(hand);
    }
  }

  private litByOther(hand: Handedness, hold: Hold): boolean {
    for (const [side, lit] of this.lit) {
      if (side !== hand && lit === hold) return true;
    }
    return false;
  }

  // --- das Kissen -----------------------------------------------------------

  /**
   * **Ein Bild Sprungkissen** — nachsehen, wer aufkommt, die Feder
   * fortschreiben und den Körper mitnehmen, solange er einsinkt.
   *
   * Die eigentliche Sache dabei ist der **Zeitpunkt**: Die Fortbewegung rechnet
   * vor der Welt, also ist der Spieler in dem Bild, in dem wir seinen Aufprall
   * sehen könnten, oft schon gestoppt. Deshalb zwei Wege ans Tempo — ein Bild
   * **Vorhalt** (`padCatches`) und das gemerkte Falltempo (`fell`) als Netz
   * darunter.
   */
  private updatePad(dt: number, ctx: WorldContext): void {
    const pad = this.pad;
    if (dt <= 0 || !pad || !this.world) return;

    ctx.rig.getHeadPosition(_head);
    const feet = ctx.rig.getFloorY();
    const over = overPad(PAD, _head.x, _head.z);

    // Wie schnell fällt er? Während das Kissen führt, ist die Geschwindigkeit
    // unsere eigene — dann sagt sie nichts über einen Sturz aus.
    let speed = 0;
    if (!this.landing) {
      this.world.playerVelocity(_drop);
      speed = Math.max(this.fell, -_drop.y);
      this.fell = this.world.onGround() ? 0 : speed;
    }

    // Wer an der Wand hängt, wird von seinen Händen geführt (`driveBody`).
    if (this.grasps.size > 0) this.landing = null;

    if (!this.landing && over && this.grasps.size === 0) {
      if (padCatches(feet - padTop(pad.spring), speed, dt)) {
        pad.spring = padHit(pad.spring, speed);
        this.landing = { slideX: _drop.x, slideZ: _drop.z, time: 0 };
        this.fell = 0;
        // Ein weicher, langer Stoß in beide Hände — die Rückmeldung eines
        // Kissens ist keine, die klopft.
        const buzz = Math.min(0.55, speed / 22);
        if (buzz > 0.08) for (const side of HANDS) ctx.input.get(side)?.pulse(buzz, 140);
      }
    }

    const loaded = over && (this.landing !== null || feet - padTop(pad.spring) <= PAD_LOAD_GAP);
    pad.spring = stepPad(pad.spring, loaded ? PAD_REST : 0, dt);
    this.showPad(pad);

    const landing = this.landing;
    if (!landing) return;

    landing.time += dt;
    const slide = padSlide(dt);
    landing.slideX *= slide;
    landing.slideZ *= slide;
    _cushion.set(
      landing.slideX,
      padDrive(feet - padTop(pad.spring), padRise(pad.spring)),
      landing.slideZ,
    );
    this.world.setFlight(_cushion);

    if (padTurned(pad.spring) || landing.time > PAD_MAX_DRIVE_TIME) {
      this.world.setFlight(null);
      this.landing = null;
      this.fell = 0;
    }
  }

  /**
   * Das Kissen hinstellen, so hoch wie es gerade ist: Der Quader wird
   * gestaucht, der Körper darunter wandert mit.
   *
   * Beides bleibt dabei bündig, weil der Collider seine **volle** Höhe behält
   * und nur um die Einsinktiefe nach unten geht — seine Oberkante liegt damit
   * genau dort, wo auch die des gestauchten Quaders liegt.
   */
  private showPad(pad: { mesh: THREE.Mesh; body: PhysicsBody; spring: PadSpring }): void {
    const height = PAD_HEIGHT - pad.spring.sink;
    pad.mesh.scale.y = height / PAD_HEIGHT;
    pad.mesh.position.y = height / 2;
    pad.body.body.setNextKinematicTranslation({
      x: (PAD.minX + PAD.maxX) / 2,
      y: PAD_HEIGHT / 2 - pad.spring.sink,
      z: (PAD.minZ + PAD.maxZ) / 2,
    });
  }

  // --- Material und Formen --------------------------------------------------

  /** Ein Material je Griffart, nicht eines je Griff. */
  private skin(material: HoldMaterial): THREE.MeshStandardMaterial {
    const known = this.skins.get(material);
    if (known) return known;
    const skin = this.own(
      new THREE.MeshStandardMaterial({
        color: holdColor(material),
        roughness: material === 'smooth' ? 0.15 : 0.9,
        metalness: material === 'perfect' ? 0.45 : 0.05,
      }),
    );
    this.skins.set(material, skin);
    return skin;
  }

  /** Und eine Form je Griffart, aus demselben Grund. */
  private shape(feature: WallFeature): THREE.BufferGeometry {
    const known = this.shapes.get(feature);
    if (known) return known;
    let geometry: THREE.BufferGeometry;
    switch (feature) {
      case 'rung':
        geometry = new THREE.CylinderGeometry(0.035, 0.035, 0.56, 12);
        break;
      case 'jug':
        geometry = new THREE.SphereGeometry(0.08, 16, 12);
        break;
      case 'edge':
        geometry = new THREE.BoxGeometry(0.3, 0.055, 0.075);
        break;
      case 'crack':
        // Eine Spalte ist kein Buckel, sondern ein hoher, schmaler Schlitz —
        // hier ein flacher Kasten, dessen Mitte die Hand aufnimmt.
        geometry = new THREE.BoxGeometry(0.09, 0.44, 0.09);
        break;
      case 'sloper':
        geometry = new THREE.SphereGeometry(0.14, 16, 10);
        break;
      default:
        geometry = new THREE.CylinderGeometry(0.12, 0.12, 0.016, 16);
        break;
    }
    this.shapes.set(feature, geometry);
    return geometry;
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }

  private keep<T extends THREE.BufferGeometry>(geometry: T): T {
    this.extra.push(geometry);
    return geometry;
  }
}
