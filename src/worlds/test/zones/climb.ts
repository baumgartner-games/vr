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
import { padBlockField } from '../../climb/padBlocks';
import { rampStand } from '../../climb/padRamp';
import { GRAB_AT, SLIP_AT, freshStamina, stepStamina, type Stamina } from '../../climb/stamina';
import { GRAB_GLOW } from '../../../core/colors';
import { canLoadModels } from '../../../core/chefFit';
import { kaykitSkins } from '../../../core/kaykitHeight';
import { gripAnchor, type ControllerState, type Handedness } from '../../../core/XRInput';
import type { WorldContext } from '../../../core/types';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../../physics/PhysicsWorld';
import { CLIMB } from '../layout';
import { PROP_FOOT, propFit } from './propFit';
import { propMeasure, propPart, propShape } from './propModel';
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

/**
 * **Der Klotz des Sprungkissens** — `block-bits/colored_block_blue.glb`,
 * „mehrere davon; mit der Eigenschaft, als Kissen zu dienen".
 *
 * Der zweite Halbsatz ist die eigentliche Bestellung, und er heißt: Das
 * Kissen muss weiter **federn**. Körper, Kinematik und die ganze Rechnung in
 * `climb/crashPad.ts` bleiben deshalb unangetastet; getauscht wird das Bild.
 * Aus dem einen blauen Quader wird ein **Feld** aus Klötzen, so wie in einer
 * Halle mehrere Matten nebeneinander liegen und nicht eine genähte von acht
 * Metern — wie viele und wie groß, rechnet `climb/padBlocks.ts` und prüft der
 * Test daneben.
 *
 * Nachgemessen an der Datei: ein Würfel von 2,000 Quelleinheiten mit dem
 * Ursprung in der Mitte, halbiert also **1,00 m** — genau die Kachel dieser
 * Welt, und deshalb geht das Kissen von 8 × 3 m ohne Rest in 24 Klötze je
 * Lage auf.
 *
 * **Und sie stauchen mit.** Das Kissen wird beim Einsinken flacher (`showPad`,
 * und der Grund steht über `buildPad`), und ein Feld aus Klötzen, das dabei
 * stehen bliebe, wäre ein Spieler, der in der Luft über einem unveränderten
 * Kissen steht. Die Klötze hängen deshalb in **einer** Gruppe, die genau das
 * tut, was der Quader heute tut — eine Zeile Maßstab, und nicht achtundvierzig
 * einzeln gerechnete.
 *
 * **Ein Bündel, und die Zahl dazu**: 8 × 3 × 2 = 48 Klötze zu je 108
 * Dreiecken. Einzeln wären das achtundvierzig Zeichenaufrufe für ein Kissen —
 * in der Brille je Auge einmal —, als `InstancedMesh` ist es einer. Dass ein
 * Bündel mit seiner Gruppe mitskaliert, ist dabei kein Sonderfall: Es hängt
 * an ihr wie jedes andere Netz auch.
 */
const PAD_MODEL = 'block-bits/colored_block_blue.glb';

/**
 * **Die Rampe zurück hinauf** — `prototype-bits/Primitive_Slope.glb`.
 *
 * Nachgemessen an der Datei: ein Prisma von 4,000 Quelleinheiten in jeder
 * Richtung mit dem Fuß auf null, bei Paketmaßstab 0,7 also 2,80 m und eine
 * Steigung von 1:1. Die hohe Kante liegt auf `x = −2`, die Fußkante auf
 * `x = +2`; es fällt also in seine eigene +x-Richtung, und das ist die eine
 * Beobachtung, aus der `climb/padRamp.ts` seine Vierteldrehung nimmt.
 *
 * **Die gebaute Rampe ist viel flacher**: 1,40 m Höhe auf 2,20 m Lauflänge,
 * also 32,5° statt 45°. Eingepasst wird deshalb **je Achse einzeln**
 * (`propFit.ts`) — 2,20 × 1,40 × 1,60 —, und das ist hier nicht bloß erlaubt,
 * sondern die einzige Art, die stimmt: Eine ungleichmäßige Skalierung bildet
 * eine Ebene wieder auf eine Ebene ab, die Schräge des Keils liegt danach also
 * **überall** auf der Lauffläche des Quaders und nicht nur an den Enden.
 *
 * **`Primitive_Slope_Half.glb` wäre das gewesen, was es nicht ist.** Auch
 * nachgemessen, denn der Name legt „halb so hoch bei gleicher Länge" nahe: In
 * Wirklichkeit ist es ein Stück mit einem **flachen Deckel** — von der hohen
 * Kante bis zur Mitte läuft es auf voller Höhe waagerecht und fällt erst
 * danach, und es endet unten nicht auf null, sondern auf halber Höhe. Sein
 * Deckel läge damit **über** der Lauffläche, und man liefe die halbe Rampe
 * hinauf im Modell statt darauf. Der einfache Keil trifft die Ebene exakt und
 * kostet acht Dreiecke.
 *
 * **Der Körper bleibt der gekippte Quader** (`crashPad.rampBox`): Auf ihm
 * läuft man, an ihm hängt der Autostep. Der Keil ist das Bild darüber.
 */
const RAMP_MODEL = 'prototype-bits/Primitive_Slope.glb';

/** Wie weit eine Hand neben einem Griff noch zupacken darf. */
const REACH = 0.16;
/** Wie schnell der Zug den Körper höchstens bewegt und wie weich er dabei ist. */
const MAX_CLIMB_SPEED = 3.6;
const MAX_LAUNCH_SPEED = 6;
const DRIVE_BLEND = 18;
/** Wie tief der Strahl unter den Füßen nach einem Tritt sucht. */
const FOOT_PROBE = 0.35;
/** Wie weit um die Zone herum sie überhaupt zuhört, in Metern (`nearby`). */
const NEAR = 4;

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

/**
 * **Das Sprungkissen**, so wie die Zone es in der Hand hält: der gerechnete
 * Quader, der Körper darunter, die Gruppe mit den Klötzen darüber und der
 * Zustand seiner Feder.
 *
 * `mesh` und `blocks` sind dabei zwei Bilder desselben Dings und nie beide zu
 * sehen — welches, entscheidet allein, ob die Datei ankam (`showBlocks`).
 */
interface Pad {
  mesh: THREE.Mesh;
  body: PhysicsBody;
  blocks: THREE.Group;
  spring: PadSpring;
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
/** Wiederverwendet statt je Klotz neu — achtundvierzig Matrizen sind achtundvierzig. */
const _at = new THREE.Matrix4();

export class ClimbZone implements TestZone {
  private readonly holds: Hold[] = [];
  private readonly grasps = new Map<Handedness, Grasp>();
  private readonly lit = new Map<Handedness, Hold>();
  private readonly drive = new THREE.Vector3();
  private readonly probe = new THREE.Raycaster();
  private readonly owned: THREE.Material[] = [];
  private readonly shapes = new Map<WallFeature, THREE.BufferGeometry>();
  private readonly extra: THREE.BufferGeometry[] = [];
  /** Das Bündel der Kissenklötze — sein Matrizenpuffer will beim Abräumen zurück. */
  private readonly bundles: THREE.InstancedMesh[] = [];

  private stamina: Stamina = freshStamina();
  private hud: ClimbHud | null = null;
  private lockedByUs = false;

  /** Das Kissen, seine Klötze, seine Feder und der Sprung, der darin ausläuft. */
  private pad: Pad | null = null;
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

    // **Der Streifen mit Ausdauer und Halt** hängt in der Kamera, aber nur
    // sichtbar, wenn man an der Wand ist: Ein Ausdauerbalken über dem
    // Schießstand wäre eine Anzeige für etwas, das dort niemand tut.
    this.hud = new ClimbHud();
    this.hud.mount(ctx.camera);
    this.hud.visible = false;
    this.hud.setValues(this.stamina.value, null, null);
  }

  /**
   * **Nur, wenn jemand in der Nähe ist** — und das ist keine Sparmaßnahme.
   *
   * Das Klettern nimmt den Greifknopf, das Leuchten der Hand
   * (`ctx.hands.setGlow`) und den linken Stick für sich. In einer eigenen Halle
   * war das richtig, denn dort tat man nichts anderes; in einer Welt mit neun
   * Zonen wäre es eine Zone, die einem am anderen Ende des Geländes das Greifen
   * wegnimmt. Also hört sie erst zu, wenn man vor ihrer Wand steht — und wer
   * hängt, wird ohnehin weiter geführt.
   */
  update(dt: number, ctx: WorldContext): void {
    const near = this.nearby(ctx);
    if (this.hud) this.hud.visible = near;
    if (!near) return;
    this.updateClimb(dt, ctx);
    this.updatePad(dt, ctx);
  }

  /** Steht der Spieler im Bereich der Zone — oder hängt er gerade an ihr? */
  private nearby(ctx: WorldContext): boolean {
    if (this.grasps.size > 0 || this.landing !== null) return true;
    ctx.rig.getHeadPosition(_head);
    return (
      _head.x > CLIMB.x - NEAR &&
      _head.x < CLIMB.x + CLIMB.w + NEAR &&
      _head.z > CLIMB.z - NEAR &&
      _head.z < CLIMB.z + CLIMB.d + NEAR
    );
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
    // **Erst die Bündel, dann alles Übrige**: Ein `InstancedMesh` hält mehr
    // als Netz und Material — sein `instanceMatrix` ist ein Puffer auf der
    // Grafikkarte und kommt nur über `dispose()` zurück.
    for (const bundle of this.bundles) {
      bundle.removeFromParent();
      bundle.dispose();
    }
    this.bundles.length = 0;
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

    /**
     * **Die Klötze hängen neben dem Quader und nicht an ihm** (`PAD_MODEL`).
     *
     * Ein Kind wäre bequemer — es erbte den Maßstab der Stauchung von selbst —,
     * aber eben auch die **Sichtbarkeit**: Wer den Quader ausschaltet, sobald
     * das Modell da ist, schaltete seine Klötze gleich mit aus. Also eine
     * eigene Gruppe an derselben Stelle, die in `showPad` dieselben zwei Zeilen
     * bekommt.
     */
    const blocks = new THREE.Group();
    blocks.name = 'crash-pad-blocks';
    blocks.position.copy(mesh.position);
    world.root.add(blocks);

    this.pad = { mesh, body, blocks, spring: padAtRest() };
    this.fillPadBlocks(mesh, blocks);

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
    this.fillRamp(world, ramp);
  }

  /**
   * **Die Klötze holen** — sofort nichts, später vielleicht etwas.
   *
   * Gebaut wird **synchron**, das Modell kommt über die Leitung; bis es da ist
   * — und in einem Checkout ohne die gekauften Pakete für immer — liegt der
   * gerechnete Quader da und federt, wie er immer federte. Das ist der normale
   * Ausgang und keine Notlösung. **Ohne WebGL passiert gar nichts**
   * (`core/chefFit.canLoadModels`): In Jest zieht `GLTFLoader` samt
   * `import.meta` den ganzen Lauf mit herein, und was an diesem Kissen geprüft
   * wird, ist die Feder und kein Netz (`climb/crashPad.test.ts`).
   */
  private fillPadBlocks(mesh: THREE.Mesh, blocks: THREE.Group): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(PAD_MODEL);
      if (model) this.showBlocks(mesh, blocks, model);
    });
  }

  /**
   * **Aus der Kopie wird das Feld** — ein Bündel aus achtundvierzig Klötzen in
   * der Gruppe, die mitstaucht.
   *
   * Drei Wege enden hier ohne Klötze, und alle drei sind normal: Die Zone ist
   * abgeräumt, während die Datei unterwegs war; die Datei gibt kein Bündel her
   * (`propPart`: ein Netz, ein Material); ihr Netz ist leer. Dann bleibt der
   * blaue Quader stehen, und die **Materialien** der Kopie gehen weg — sie
   * gehören ihr allein (`core/kaykitModel.copyOf`), während ihre Geometrie der
   * Vorlage gehört und deshalb nur **kopiert** ins Bündel wandert
   * (`propShape`).
   */
  private showBlocks(mesh: THREE.Mesh, blocks: THREE.Group, model: THREE.Object3D): void {
    const part = propPart(model);
    const box = propMeasure(model);
    if (!this.world || !part || !box) {
      for (const skin of kaykitSkins(model)) skin.dispose();
      return;
    }
    // **Das Fach rechnet die Zone, die Größe misst das Netz.** Der Würfel der
    // Datei ist zufällig genau einen Meter groß; verlassen wird sich darauf
    // nicht (siehe `PAD_MODEL`).
    const field = padBlockField(PAD, PAD_HEIGHT);
    const shape = this.keep(propShape(part.mesh, propFit(box, field.size)));
    const bundle = new THREE.InstancedMesh(shape, this.own(part.skin), field.spots.length);
    bundle.name = 'crash-pad-blocks:bundle';
    field.spots.forEach((spot, i) => {
      _at.makeTranslation(spot.x, spot.y, spot.z);
      bundle.setMatrixAt(i, _at);
    });
    bundle.instanceMatrix.needsUpdate = true;
    // Ohne diese Zeile rechnet three die Hülle aus einem einzigen Klotz am
    // Nullpunkt und siebte das halbe Kissen weg, sobald man daneben steht.
    bundle.computeBoundingSphere();
    blocks.add(bundle);
    this.bundles.push(bundle);

    // Erst jetzt, und nicht vorher: Ein Quader, der verschwindet, bevor die
    // Klötze hängen, ist ein Loch, in das man fällt — jedenfalls dem Auge nach.
    mesh.visible = false;
  }

  /**
   * **Den Keil über die gebaute Rampe legen** — dieselbe Vorsicht wie beim
   * Kissen, aus denselben Gründen.
   *
   * Anders als dort ist es hier **ein** Stück und kein Bündel: Das Modell
   * selbst wird eingepasst und in eine Gruppe gehängt, die es dreht und
   * hinstellt (`climb/padRamp.ts`). Der gekippte Quader darunter bleibt
   * liegen — er ist der Körper und der Eintrag in der Abtastliste —, er wird
   * nur nicht mehr gezeichnet.
   */
  private fillRamp(world: ZoneHost, ramp: THREE.Mesh): void {
    if (!canLoadModels()) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const model = await module.kaykitModel(RAMP_MODEL);
      if (model) this.showRamp(world, ramp, model);
    });
  }

  private showRamp(world: ZoneHost, ramp: THREE.Mesh, model: THREE.Object3D): void {
    const box = propMeasure(model);
    if (!this.world || !box) {
      for (const skin of kaykitSkins(model)) skin.dispose();
      return;
    }
    const place = rampStand(RAMP_X, PAD.maxZ, RAMP_FOOT, RAMP_W);
    // **Mit dem Fuß auf dem Boden** (`PROP_FOOT`): Der Keil steht auf dem
    // Hallenboden, und seine hohe Kante trifft die Kissenkante — das ist
    // dieselbe Ebene, die auch die Oberseite des Quaders bildet, und der Test
    // in `climb/padRamp.test.ts` rechnet beide gegeneinander.
    const fit = propFit(box, place.size, PROP_FOOT);
    model.scale.set(
      model.scale.x * fit.scale.x,
      model.scale.y * fit.scale.y,
      model.scale.z * fit.scale.z,
    );
    model.position.set(fit.shift.x, fit.shift.y, fit.shift.z);

    const stand = new THREE.Group();
    stand.name = 'crash-pad-ramp:model';
    stand.rotation.y = place.yaw;
    stand.position.set(place.at.x, place.at.y, place.at.z);
    stand.add(model);
    world.root.add(stand);

    // Die Materialien der Kopie gehören ihr allein und müssen weg; ihre
    // Geometrie gehört der Vorlage und darf es nicht (`disposeTree` hält an
    // `userData.sharedAssets` an und lässt dann auch die Materialien liegen).
    for (const skin of kaykitSkins(model)) this.own(skin);
    ramp.visible = false;
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
   *
   * **Und die Klötze bekommen dieselben zwei Zeilen** (`PAD_MODEL`). Sie
   * hängen an einer eigenen Gruppe, die an derselben Stelle steht wie der
   * Quader; ein Feld aus achtundvierzig Klötzen wird damit genauso flach wie
   * der eine Quader vorher, ohne dass irgendwo eine zweite Federrechnung
   * entsteht.
   */
  private showPad(pad: Pad): void {
    const height = PAD_HEIGHT - pad.spring.sink;
    pad.mesh.scale.y = height / PAD_HEIGHT;
    pad.mesh.position.y = height / 2;
    pad.blocks.scale.y = pad.mesh.scale.y;
    pad.blocks.position.y = pad.mesh.position.y;
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
