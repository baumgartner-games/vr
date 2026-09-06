import * as THREE from 'three';
import type { ControllerState, Handedness, XRInput } from './XRInput';
import { GRAB_GLOW } from './colors';
import {
  buttonCurlLayer,
  clonePose,
  fingerMovesOf,
  FINGER_BONES,
  FINGER_JOINT_VALUES,
  HAND_JOINT_VALUES,
  handJointsToArray,
  IDLE_HAND_POSE,
  type HandPose,
} from './handPose';
import { holdHandPose, idleHandPose, onHandPoseChange } from './handPoseStore';
import { boneColors, handLook, onHandLookChange, trackedGlove } from './handLook';
import { buildGlove, type GloveFinger } from './gloveMesh';
import { fitGlove, type GloveJoints, type Quat } from './gloveFit';
import { measureHand, type MeasuredHand, type TrackedFinger } from './handBones';
import { boneColor, jointColor, PALM_COLOR } from './bonePalette';
import { foldCurls } from './handGestures';

export type HandGesture = 'open' | 'ready' | 'point' | 'thumbsUp' | 'grip';

/** Curl per finger: thumb, index, middle, ring, pinky (0 = straight, 1 = closed). */
const GESTURES: Record<HandGesture, number[]> = {
  open: [0.1, 0.08, 0.08, 0.1, 0.12],
  // Slightly curled: something is close enough to grab.
  ready: [0.35, 0.4, 0.45, 0.5, 0.55],
  point: [0.15, 0, 1, 1, 1],
  thumbsUp: [0, 1, 1, 1, 1],
  grip: [0.55, 0.35, 0.85, 0.9, 0.9],
};

const FINGERS = [
  // x offset (thumb side is negative for the right hand), lengths, spread
  { name: 'index', x: -0.028, lengths: [0.036, 0.03], z: -0.046 },
  { name: 'middle', x: -0.009, lengths: [0.04, 0.032], z: -0.048 },
  { name: 'ring', x: 0.01, lengths: [0.036, 0.029], z: -0.046 },
  { name: 'pinky', x: 0.028, lengths: [0.03, 0.024], z: -0.042 },
];

const _vector = new THREE.Vector3();
const _euler = new THREE.Euler();
const DEG = Math.PI / 180;

/**
 * Wie eine Hand **angezogen** ist — drei Kleider für dasselbe Skelett.
 *
 * - `bones`: die **Boxhand** — ein Kasten als Handfläche, Kapseln als
 *   Knochen. So hat alles angefangen, und so misst man am ehrlichsten.
 * - `limbs`: **Kugeln an den Gelenken**, wie die Brille eine getrackte Hand
 *   zeigt — und wie diese Datei sie zeichnet, solange der Schalter
 *   *Handschuh an getrackten Händen* aus ist (`handLook.ts`).
 * - `glove`: der **weiße Handschuh** — *ein* Stück Stoff um das Skelett
 *   (`gloveMesh.ts`): die Handfläche läuft in die Manschette aus, die Finger
 *   wachsen als durchgehende Röhren aus ihr heraus und biegen sich am Gelenk
 *   weich, weil ihre Punkte zwischen den Knochen gewichtet sind. Ein
 *   Handschuh wie bei Rayman oder Master Hand: kein Körper dran, aber eine
 *   Hand, die nach etwas aussieht — und nicht nach Teilen.
 *
 * Alle drei haben dieselben Gelenke an denselben Stellen und dieselbe
 * Fingerspitze — jede Haltung und jede gerechnete Faust gilt für alle.
 */
export type HandStyle = 'bones' | 'limbs' | 'glove';

/** Welches Kleid die Einstellung meint (`handLook.ts`) — für Hände am Controller. */
export function styleOfSetting(): HandStyle {
  return handLook() === 'glove' ? 'glove' : 'bones';
}

/** Ein Handschuh ist weiß; alles andere hat die Farbe, die der Aufrufer gibt. */
export const GLOVE_COLOR = 0xf4f6fa;
/** Das Hellblau der Boxhand auf der Werkzeugseite und am Boxhand-Werkzeug. */
export const BOX_HAND_COLOR = 0x9fe3ff;

/** Die Farbe einer festen Hand nach der Einstellung: weiß als Handschuh, sonst hellblau. */
export function handColor(): number {
  return handLook() === 'glove' ? GLOVE_COLOR : BOX_HAND_COLOR;
}

/**
 * Die **Ruhelage des Daumens** am Modell — die eine Fingerwurzel, die schräg
 * steht.
 *
 * Der Gierwinkel trägt ihn von der Handfläche weg, das kleine Nicken lässt ihn
 * ein wenig zur Handflächenseite fallen, und das Rollen dreht seine Beugeachse,
 * damit ein gekrümmter Daumen sich *quer über* die Handfläche legt statt gerade
 * nach unten. Alle drei zusammen sind die Ruhelage, gegen die eine gemessene
 * Haltung ihre Winkel angibt (`handBones.ts`) — deshalb steht sie hier als
 * eigene Zahlenreihe und nicht mitten im Aufbau.
 */
const THUMB_REST: readonly [number, number, number] = [-0.22, 0.75, 0.6];

/**
 * Die Ruhelage **jeder** Fingerwurzel, als Drehung — Daumen zuerst.
 *
 * Die vier Finger stehen gerade, also ist ihre Ruhelage die Einheit; der Daumen
 * trägt die drei Winkel von oben, an der linken Hand gespiegelt. Die Messung
 * bekommt genau diese Liste und gibt Winkel heraus, die das Modell unverändert
 * einsetzt.
 */
export function fingerRestRotations(side: Handedness): Quat[] {
  const mirror = side === 'left' ? -1 : 1;
  const thumb = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(THUMB_REST[0], mirror * THUMB_REST[1], mirror * THUMB_REST[2], 'XYZ'),
  );
  const rest: Quat[] = [{ x: thumb.x, y: thumb.y, z: thumb.z, w: thumb.w }];
  for (let i = 0; i < FINGERS.length; i++) rest.push({ x: 0, y: 0, z: 0, w: 1 });
  return rest;
}

/** Wie eine einzelne Hand gebaut wird — über das Kleid hinaus. */
interface HandBuild {
  /**
   * `limbs` zeichnet Kugeln an den Gelenken statt Knochen dazwischen — die
   * Form, in der ein Headset eine getrackte Hand zeigt. Alles andere, Haltung
   * und Krümmung eingeschlossen, ist identisch: es ist dieselbe Hand, nur
   * anders angezogen.
   */
  look?: HandStyle;
  /**
   * Das **Maß einer echten Hand** (`handBones.ts`) — dann wird das Skelett
   * daraus gebaut statt aus den gebauten Zahlen: die Wurzeln stehen auf den
   * gemessenen Knöcheln, die Knochen sind so lang wie die echten, der Stoff so
   * dick wie die Gelenkkugeln, die die Brille an dieselbe Stelle malt. Und es
   * sind **drei** Knochen je Finger statt zwei, weil eine echte Hand drei hat.
   */
  measure?: MeasuredHand | null;
  /** Ob jeder Knochen seine eigene Farbe bekommt (`bonePalette.ts`). */
  colors?: boolean;
}

/** One procedural hand: a palm plus five curling fingers. */
class ProceduralHand extends THREE.Group {
  readonly indexTip = new THREE.Object3D();

  private readonly chains: THREE.Object3D[][] = [];
  private readonly curls = [0, 0, 0, 0, 0];
  private readonly targets = [0, 0, 0, 0, 0];
  /**
   * Die Beugung je Knochen, in Grad — oder `null` für einen Finger, der aus
   * einer Krümmung kommt. Eine Messung wächst nicht in ihre Lage hinein: was
   * hier steht, gilt sofort.
   */
  private readonly bends: (number[] | null)[] = [null, null, null, null, null];
  /** Die Listen dahinter — einmal angelegt, in jedem Bild neu beschrieben. */
  private readonly bendBuffers: number[][] = [0, 1, 2, 3, 4].map(() =>
    new Array<number>(FINGER_BONES).fill(0),
  );
  /** Finger roots, thumb first, for the spread. */
  private readonly fingerRoots: THREE.Object3D[] = [];
  /** Die Ruhelage jeder Fingerwurzel — die Fächerung dreht dagegen. */
  private readonly rests: THREE.Quaternion[] = [];
  /** How far each finger root sits from the middle, -1 … 1. */
  private readonly fans: number[] = [];
  /** Das Material des Stoffs, wenn der Handschuh ein eigenes braucht. */
  private ownMaterial: THREE.Material | null = null;
  readonly look: HandStyle;
  /** Ob diese Hand mit Knochenfarben gebaut wurde — Umschalten heißt neu bauen. */
  readonly colored: boolean;

  constructor(
    readonly side: Handedness,
    material: THREE.Material,
    build: HandStyle | HandBuild = 'bones',
  ) {
    super();
    const options: HandBuild = typeof build === 'string' ? { look: build } : build;
    const { look = 'bones', measure = null, colors = false } = options;
    this.look = look;
    this.colored = colors;
    this.name = `hand-${side}`;
    // Which way round the thumb sits — the one constant that tells a left hand
    // from a right one. The grip space is *not* mirrored between the hands, so
    // this has to be: hold a right hand palm down with the fingers pointing
    // forward (-Z) and the thumb points to the left, towards -X. Getting this
    // sign wrong puts a left hand on the right controller and vice versa.
    const mirror = side === 'left' ? -1 : 1;
    const palmScale = measure?.palmScale ?? 1;

    // Am Handschuh liest das Material die Farben aus dem Netz; überall sonst
    // trägt jeder Knochen sein eigenes.
    if (colors && look === 'glove') {
      const cloth = material.clone() as THREE.MeshStandardMaterial;
      cloth.vertexColors = true;
      cloth.color.setHex(0xffffff);
      if (cloth.emissive) cloth.emissive.setHex(0x111111);
      this.ownMaterial = cloth;
      material = cloth;
    }
    const skin = (hex: number): THREE.Material =>
      colors ? paletteMaterial(hex, material) : material;

    // The grip space points -Z forward with the back of the hand towards +Y.
    // Der Handschuh hat keine eigene Handfläche als Teil: sie ist Teil des
    // einen Netzes, das unten um das fertige Skelett gelegt wird.
    if (look !== 'glove') {
      const palm =
        look === 'limbs'
          ? new THREE.Mesh(new THREE.SphereGeometry(0.026 * palmScale, 12, 10), skin(PALM_COLOR))
          : new THREE.Mesh(
              new THREE.BoxGeometry(0.075 * palmScale, 0.028 * palmScale, 0.09 * palmScale),
              skin(PALM_COLOR),
            );
      palm.position.set(0, 0, -0.01 * palmScale);
      this.add(palm);
    }
    if (look === 'limbs') {
      // Der Handrücken ist bei getrackten Händen eine Reihe Knöchel und keine
      // einzelne Kugel — vier davon, dort, wo die Finger ansetzen.
      for (let i = 0; i < FINGERS.length; i++) {
        const finger = FINGERS[i]!;
        const at = measure?.fingers[i + 1]?.root;
        const knuckle = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 8), skin(PALM_COLOR));
        if (at) knuckle.position.set(at.x, at.y, at.z);
        else knuckle.position.set(mirror * finger.x, 0, finger.z);
        this.add(knuckle);
      }
    }

    const rests = fingerRestRotations(side);
    const gloveFingers: GloveFinger[] = [];
    // Der Daumen zuerst, dann die vier Finger — dieselbe Reihenfolge wie in
    // jeder Krümmung, jeder Haltung und jeder Messung.
    const built = [
      {
        position: new THREE.Vector3(mirror * -0.034, -0.006, 0.014),
        lengths: [0.034, 0.028] as readonly number[],
        radius: 0.017,
        cloth: 0.0175,
        fan: 0,
      },
      ...FINGERS.map((finger) => ({
        position: new THREE.Vector3(mirror * finger.x, 0, finger.z),
        lengths: finger.lengths as readonly number[],
        radius: 0.013,
        cloth: 0.0135,
        fan: (mirror * finger.x) / 0.028,
      })),
    ];

    for (let i = 0; i < built.length; i++) {
      const spec = built[i]!;
      const found = measure?.fingers[i];
      const root = new THREE.Object3D();
      if (found) root.position.set(found.root.x, found.root.y, found.root.z);
      else root.position.copy(spec.position);
      const rest = new THREE.Quaternion(rests[i]!.x, rests[i]!.y, rests[i]!.z, rests[i]!.w);
      root.quaternion.copy(rest);
      this.add(root);
      this.fingerRoots.push(root);
      this.rests.push(rest);
      // Der Daumen fächert **nicht** mit der einen Spreizung der Haltung: die
      // meint die vier Finger, die auseinandergehen. Seine eigene Fächerung
      // bekommt er aus einer Messung (`HandPose.joints`), und dort steht sie
      // je Finger.
      this.fans.push(spec.fan);
      const lengths = found?.lengths ?? spec.lengths;
      const radius = found?.radius ?? spec.radius;
      const chain = buildChain(root, lengths, radius, material, look, colors ? i : null);
      this.chains.push(chain);
      gloveFingers.push({
        bones: chain as THREE.Bone[],
        lengths,
        radius: found?.radius ?? spec.cloth,
      });
      if (i === 1) {
        // Der Zeigefinger: die Kuppe hängt am letzten Gelenk, so weit davor,
        // wie dessen Knochen lang ist.
        this.indexTip.position.set(0, 0, -(lengths[lengths.length - 1] ?? 0));
        chain[chain.length - 1]!.add(this.indexTip);
      }
    }

    if (look === 'glove') {
      // Der Stoff, zum Schluss und um alles: die Knochen stehen in Ruhelage,
      // ihre Weltmatrizen sind frisch, und `buildGlove` merkt sich daraus, wie
      // jeder Punkt zu seinem Knochen liegt. Der Wurzelknochen kommt als
      // **letztes** Kind dazu — wer die Kette der Finger an den Kindern dieser
      // Hand abzählt (die Tests tun das), findet Daumen und Finger weiter an
      // ihren Plätzen.
      const root = new THREE.Bone();
      root.name = 'hand-root';
      this.add(root);
      // In Ruhelage gebaut: die Fächerung einer Messung darf den Stoff nicht
      // schon beim Binden verdrehen, sonst steht sie hinterher doppelt darin.
      for (const finger of this.fingerRoots) finger.quaternion.identity();
      this.updateMatrixWorld(true);
      this.add(buildGlove(root, gloveFingers, material, { palmScale, colors }));
      for (let i = 0; i < this.fingerRoots.length; i++) {
        this.fingerRoots[i]!.quaternion.copy(this.rests[i]!);
      }
    }
  }

  setGesture(gesture: HandGesture): void {
    this.setCurls(GESTURES[gesture]!);
  }

  /**
   * A pose the player dialled in: where the hand sits on the controller, how
   * far each finger is curled, how far they fan out. The curls are targets —
   * the fingers still move there over a few frames instead of snapping.
   */
  setPose(pose: HandPose): void {
    this.position.set(pose.x / 100, pose.y / 100, pose.z / 100);
    this.quaternion.setFromEuler(
      _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
    );
    this.setFingers(pose);
  }

  /**
   * **Die Finger einer Haltung**, ohne deren Lage anzufassen.
   *
   * Trägt sie gemessene Gelenke (`HandPose.joints`), gelten die: jeder Knochen
   * bekommt seine eigene Beugung und jeder Finger seine eigene Fächerung. Sonst
   * gilt, was es immer gab — eine Krümmung je Finger und **eine** Spreizung für
   * alle. Die Krümmungen werden in beiden Fällen nachgezogen, damit eine Hand,
   * deren Messung wegfällt, dort weitermacht, wo sie steht, statt zu springen.
   */
  setFingers(pose: HandPose): void {
    // Die Zahlen werden **abgeschrieben** und nicht abgeholt: das hier läuft in
    // jedem Bild für jede Hand, und fünf frische Listen je Bild sind fünf, die
    // jemand wieder wegräumen muss.
    const joints = pose.joints?.length === HAND_JOINT_VALUES ? pose.joints : null;
    for (let i = 0; i < this.chains.length; i++) {
      if (!joints) {
        this.bends[i] = null;
        this.setFan(i, -this.fans[i]! * pose.spread * DEG);
        continue;
      }
      const at = i * FINGER_JOINT_VALUES;
      const buffer = this.bendBuffers[i]!;
      for (let bone = 0; bone < FINGER_BONES; bone++) buffer[bone] = joints[at + bone] ?? 0;
      this.bends[i] = buffer;
      this.setFan(i, (joints[at + FINGER_BONES] ?? 0) * DEG);
    }
    for (let i = 0; i < this.targets.length; i++) this.targets[i] = pose.curls[i] ?? 0;
  }

  /**
   * Nur die Finger als **Krümmung**: eine Geste, eine Haltung über die
   * Leitung, die Hand am Abzug. Eine Krümmung ist eine Antwort ohne Gelenke,
   * also treten die gemessenen ab — sonst rührte sich beim Drücken nichts.
   */
  setCurls(curls: readonly number[]): void {
    for (let i = 0; i < this.targets.length; i++) {
      this.targets[i] = curls[i] ?? 0;
      this.bends[i] = null;
    }
  }

  /**
   * Und dasselbe für **einzelne** Finger: was `null` ist, bleibt, wie die
   * Haltung es gesetzt hat — samt seiner gemessenen Gelenke.
   *
   * Das ist der Unterschied, der eine gemessene Hand am Werkzeug überleben
   * lässt: der Trigger zieht den Zeigefinger, und die anderen vier stehen
   * weiter dort, wo die Messung sie gefunden hat.
   */
  setCurlOverrides(curls: readonly (number | null)[]): void {
    for (let i = 0; i < this.targets.length; i++) {
      const curl = curls[i];
      if (curl === null || curl === undefined) continue;
      this.targets[i] = curl;
      this.bends[i] = null;
    }
  }

  /** Die Fächerung eines Fingers: eine Drehung gegen seine Ruhelage. */
  private setFan(finger: number, angle: number): void {
    const root = this.fingerRoots[finger];
    const rest = this.rests[finger];
    if (!root || !rest) return;
    root.quaternion.copy(rest).multiply(_fan.setFromAxisAngle(_up, angle));
  }

  update(dt: number): void {
    const blend = Math.min(1, dt * 14);
    for (let i = 0; i < this.chains.length; i++) {
      this.curls[i]! += (this.targets[i]! - this.curls[i]!) * blend;
      const chain = this.chains[i]!;
      const bends = this.bends[i];
      // Every joint bends around its own X, which is the only axis that moves
      // the next bone at all — the chain runs along -Z, so a turn around Z just
      // rolls it and the thumb used to stay stubbornly straight. The thumb's
      // root is rolled instead, which sends the same bend across the palm.
      if (bends) {
        // Gemessen: jeder Knochen seinen eigenen Winkel. Hat das Modell
        // weniger Knochen als die Messung — die gebaute Hand hat zwei, die
        // gemessene drei —, landen die übrigen auf dem letzten: zwei Knicke
        // hintereinander sind zusammen der eine, den es zeichnen kann.
        for (let k = 0; k < chain.length; k++) {
          let angle = bends[k] ?? 0;
          if (k === chain.length - 1) for (let j = k + 1; j < bends.length; j++) angle += bends[j]!;
          chain[k]!.rotation.x = -angle * DEG;
        }
        continue;
      }
      const curl = this.curls[i]!;
      // Aus einer Krümmung: der erste Knochen etwas mehr als der zweite, und
      // der Daumen weniger als ein Finger.
      const factors = i === 0 ? THUMB_CURL : FINGER_CURL;
      for (let k = 0; k < chain.length; k++) {
        chain[k]!.rotation.x = -curl * (factors[Math.min(k, factors.length - 1)] ?? 1);
      }
    }
  }

  /** Was nur dieser Hand gehört — der Stoff mit den Knochenfarben. */
  disposeMaterial(): void {
    this.ownMaterial?.dispose();
    this.ownMaterial = null;
  }
}

/** Wie stark sich ein Knochen bei voller Krümmung dreht, im Bogenmaß. */
const FINGER_CURL: readonly number[] = [1.5, 1.4];
const THUMB_CURL: readonly number[] = [1.1, 0.9];

const _fan = new THREE.Quaternion();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * **Ein Material je Knochenfarbe** — geteilt, und zwar je Farbe und
 * Durchsichtigkeit eines.
 *
 * Wie bei den Abnähern des Handschuhs (`gloveMesh.ts`): eine Farbe aus der
 * Palette gehört keiner Hand, sie gehört einem Knochen, und derselbe Knochen
 * hat an jeder Hand dieselbe. Freigegeben wird deshalb keines — es hängt an
 * keiner Hand allein.
 */
const boneMaterials = new Map<string, THREE.MeshStandardMaterial>();

function paletteMaterial(hex: number, template: THREE.Material): THREE.MeshStandardMaterial {
  const opacity = template.transparent ? template.opacity : 1;
  const key = `${hex}:${opacity}`;
  let material = boneMaterials.get(key);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: hex,
      roughness: 0.45,
      metalness: 0.05,
      emissive: new THREE.Color(hex).multiplyScalar(0.18),
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    boneMaterials.set(key, material);
  }
  return material;
}

function buildChain(
  root: THREE.Object3D,
  lengths: readonly number[],
  radius: number,
  material: THREE.Material,
  look: HandStyle = 'bones',
  /** Der wievielte Finger — nur gesetzt, wenn die Knochen Farben bekommen. */
  colored: number | null = null,
): THREE.Object3D[] {
  const joints: THREE.Object3D[] = [];
  let parent: THREE.Object3D = root;
  for (let bone = 0; bone < lengths.length; bone++) {
    const length = lengths[bone]!;
    const skin =
      colored === null
        ? material
        : paletteMaterial(boneColor(colored, bone, lengths.length), material);
    // Am Handschuh sind die Gelenke **Knochen**: das Netz hängt daran. Ein
    // Knochen ist ein Object3D wie jedes andere, die Kette merkt nichts davon.
    const joint = look === 'glove' ? new THREE.Bone() : new THREE.Object3D();
    parent.add(joint);
    if (look === 'glove') {
      // Kein Teil je Knochen: der Stoff kommt als Ganzes, siehe `buildGlove`.
    } else if (look === 'limbs') {
      // Zwei Kugeln je Knochen: eine am Gelenk, eine an der Spitze. Damit
      // sieht die Kette aus wie die Gelenkkugeln einer getrackten Hand und
      // bewegt sich trotzdem an genau denselben Achsen.
      const knuckle = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.85, 10, 8), skin);
      joint.add(knuckle);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 10, 8), skin);
      tip.position.set(0, 0, -length);
      joint.add(tip);
    } else {
      const bone = new THREE.Mesh(
        new THREE.CapsuleGeometry(radius, Math.max(length - radius * 2, 0.005), 3, 8),
        skin,
      );
      bone.rotation.x = Math.PI / 2;
      bone.position.set(0, 0, -length / 2);
      joint.add(bone);
    }
    joints.push(joint);
    const next = new THREE.Object3D();
    next.position.set(0, 0, -length);
    joint.add(next);
    parent = next;
  }
  return joints;
}

/** Wie eine einzelne Hand im Raum aussehen soll. */
export interface HandShapeOptions {
  color?: number;
  /**
   * Knochen wie mit Controllern, Kugeln wie beim Handtracking, oder der
   * Handschuh. Ohne Angabe das, was die Einstellung sagt (`handLook.ts`).
   */
  look?: HandStyle;
  /**
   * 1 macht sie **fest** statt gläsern.
   *
   * Ein Geist ist durchsichtig, weil man durch ihn hindurch die eigene Hand
   * sehen will. Die Boxhand, die als **Werkzeug** in der Hand liegt
   * (`tools/HandTool.ts`), ist aber kein Geist, sondern das Ding selbst — und
   * ein Werkzeug, das man kaum sieht, justiert niemand.
   */
  opacity?: number;
}

/**
 * A copy of a hand, standing still in the room.
 *
 * Der Justierstand stellt eine dorthin, wo die Hand läge, damit man beim
 * Zurechtrücken etwas zum Vergleichen hat. It is a normal procedural hand in a
 * glass material — the same geometry, so what you compare against is genuinely
 * the same shape.
 *
 * Wahlweise als **Kugelhand** (`limbs`): dieselbe Haltung, gezeichnet wie eine
 * getrackte Hand. Der Sinn ist immer derselbe — man vergleicht nur ehrlich,
 * wenn das Vergleichsstück so aussieht wie das, was man gerade in der Brille
 * sieht. Und wahlweise **fest** statt gläsern, denn dieselbe Geometrie ist
 * inzwischen auch ein Werkzeug.
 */
export class GhostHand extends THREE.Group {
  private readonly material: THREE.MeshStandardMaterial;
  private readonly hand: ProceduralHand;

  constructor(
    readonly side: Handedness,
    pose: HandPose,
    options: HandShapeOptions = {},
  ) {
    super();
    const { color = 0x5ee0a0, look = styleOfSetting(), opacity = 0.32 } = options;
    this.look = look;
    this.name = `ghost-hand-${side}`;
    this.material = new THREE.MeshStandardMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      roughness: 0.5,
      emissive: new THREE.Color(color).multiplyScalar(0.35),
    });
    // Ein Geist wird gebaut und nicht nachgeführt: er trägt die Knochenfarben,
    // die beim Bauen galten. Wer sie umschaltet, baut den Stand neu, an dem er
    // steht — dort steht ohnehin einer je Werkzeugwechsel.
    this.hand = new ProceduralHand(side, this.material, { look, colors: boneColors() });
    this.setPose(pose);
    // A full second of blending: the fingers are where they belong at once,
    // because nobody watches a ghost grow into its pose.
    this.hand.update(1);
    this.add(this.hand);
  }

  /** Knochen, Kugeln oder Handschuh — was hier steht, wurde gebaut und wechselt nicht. */
  readonly look: HandStyle;

  /**
   * Die Spitze des Zeigefingers, als Knoten: ihr **-Z ist die Richtung**, in
   * die der Finger zeigt.
   *
   * Im Spiel hängt daran der Fingerzeig auf ein Panel; auf der Werkzeugseite
   * hängt daran eine Linie, die genau diese Richtung sichtbar macht. Man sieht
   * einer Faust nämlich nicht an, wohin sie zeigt — und ob ein Werkzeug entlang
   * des Zeigefingers liegt oder 30° daneben, ist die halbe Frage, um die es
   * beim Justieren geht.
   */
  get indexTip(): THREE.Object3D {
    return this.hand.indexTip;
  }

  /**
   * Dieselbe Haltung wie die echte Hand, nur an einem anderen Ort.
   *
   * Der Versatz in einer Pose gehört einer Hand, die auf einem Controller
   * sitzt; dieser Geist wird in den Raum gestellt und fängt deshalb dort an,
   * wo man ihn hinstellt. Alles andere — Krümmung, Fächerung — ist die Pose.
   */
  setPose(pose: HandPose): void {
    this.hand.setPose(pose);
    this.hand.position.set(0, 0, 0);
    this.hand.quaternion.identity();
  }

  /** Was die Finger gerade tun sollen; die echte Hand macht es vor. */
  setGesture(gesture: HandGesture): void {
    this.hand.setGesture(gesture);
  }

  /**
   * Die Finger allein, sofort dort: was die Knöpfe aus der Haltung machen
   * (`buttonCurls`). Die Werkzeugseite zeigt damit den Zeigefinger am Abzug
   * und die Hand, die den Griff loslässt.
   */
  setCurls(curls: readonly number[]): void {
    this.hand.setCurls(curls);
    this.hand.update(1);
  }

  /**
   * Dasselbe für eine **gemessene** Hand: Krümmung, Spreizung und jedes Gelenk
   * einzeln, sofort dort.
   *
   * Die Werkzeugseite bekommt eine geteilte Haltung zwanzigmal je Sekunde
   * (`handShare.ts`) und baut die Hand nicht jedes Mal neu — sie stellt sie
   * hierhin. Ohne die Gelenke stünde dort eine Hand aus fünf Zahlen, während
   * drüben eine aus zwanzig gemessen wird.
   */
  setFingers(curls: readonly number[], spread: number, joints?: readonly number[] | null): void {
    this.hand.setFingers({
      ...IDLE_HAND_POSE,
      curls: [...curls],
      spread,
      ...(joints ? { joints: [...joints] } : {}),
    });
    this.hand.update(1);
  }

  /** Lässt die Finger nachziehen — ohne das steht der Geist auf der Startpose. */
  update(dt: number): void {
    this.hand.update(dt);
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    this.hand.disposeMaterial();
    this.material.dispose();
    this.removeFromParent();
  }
}

/**
 * Hands for both input kinds: joint spheres when the runtime tracks real hands,
 * a procedural hand with gestures when the player holds controllers.
 *
 * **Und wahlweise beides zugleich**: mit *Handschuh an getrackten Händen*
 * (`handLook.ts`) legt sich ein Skelett auf die echten Knochen — gestellt aus
 * vier Gelenken (`gloveFit.ts`) und **gebaut aus allen** (`handBones.ts`): die
 * Wurzeln stehen auf den gemessenen Knöcheln, die Knochen sind so lang wie die
 * echten, der Stoff ist so dick wie die Gelenkkugeln, die an derselben Stelle
 * säßen, und jeder einzelne Knochen bekommt den Winkel, in dem er wirklich
 * steht. Die Kugeln gehen dafür aus; sie wären sonst die zweite Hand am selben
 * Ort — und der Handschuh sitzt jetzt genau dort, wo sie waren.
 *
 * Vorher war es das **gebaute** Skelett auf einen Maßstab gestreckt und aus dem
 * Faltmaß gekrümmt: fünf Zahlen für fünfundzwanzig Gelenke. Eine Hand, die die
 * Finger spreizte, spreizte sie damit nicht, und eine, die nur am Mittelgelenk
 * knickte, knickte am Grundgelenk mit.
 */
export class HandVisuals extends THREE.Group {
  private readonly jointMeshes = new Map<THREE.Object3D, THREE.Mesh>();
  private readonly hands = new Map<ControllerState, ProceduralHand>();
  /**
   * Der **Handschuh an einer getrackten Hand** — je Eingabequelle einer.
   *
   * Er hängt im Raum der Hand und wird Bild für Bild auf ihre Gelenke gelegt
   * (`gloveFit.ts`); die Gelenkkugeln gehen dafür aus. Ein eigener Topf neben
   * `hands`, weil es dieselbe Eingabequelle in beiden Formen geben kann: eine
   * Brille kann mitten in der Sitzung von Controllern auf Hände umschalten.
   */
  private readonly gloves = new Map<ControllerState, ProceduralHand>();
  /**
   * Das Maß, auf das der Handschuh dieser Hand gebaut wurde.
   *
   * Ein Handschuh wird **einmal** auf eine Hand gebaut und danach nur noch
   * bewegt: die Knochen einer Hand ändern ihre Länge nicht, und ein Netz je
   * Bild neu zu nähen wäre der teuerste Weg, dasselbe zu zeigen. Neu gebaut
   * wird nur, wenn das Maß wirklich ein anderes ist — eine andere Hand vor der
   * Brille, oder eine Messung, die beim ersten Bild danebenlag.
   */
  private readonly fitted = new Map<ControllerState, MeasuredHand>();
  /** Die letzte Messung je Seite — daraus liest der Poseraum seine Gelenke. */
  private readonly measured = new Map<Handedness, MeasuredHand>();
  private readonly overrides = new Map<Handedness, HandGesture | null>();
  /** Welche Hand ein Werkzeug zur **Faust** schließt — der Flug, nicht die Welt. */
  private readonly fists = new Set<Handedness>();
  /** What each hand is carrying, so it can hold that tool its own way. */
  private readonly holding = new Map<Handedness, string | null>();
  /** Resolved poses, rebuilt whenever the settings change. */
  private readonly poses = new Map<string, HandPose>();
  private readonly unsubscribe: () => void;
  private readonly jointGeometry = new THREE.SphereGeometry(1, 10, 8);
  /**
   * Die Vorlage, aus der jede Hand ihr eigenes Material bekommt.
   *
   * Ein gemeinsames Material wäre sparsamer und genau deshalb falsch: leuchtet
   * die rechte Hand, weil sie an einem Griff liegt, soll die linke dunkel
   * bleiben. Zwei Materialien sind der Preis dafür, und der ist klein.
   */
  private readonly material: THREE.MeshStandardMaterial;
  private readonly handMaterials = new Map<Handedness, THREE.MeshStandardMaterial>();
  private readonly glowing = new Set<Handedness>();

  /** Die Farbe der Hände ohne Handschuh — der Handschuh ist weiß. */
  private readonly baseColor: number;

  constructor(
    private readonly input: XRInput,
    color = 0xd6e2f7,
  ) {
    super();
    this.name = 'hand-visuals';
    this.baseColor = color;
    this.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.05,
      emissive: new THREE.Color(color).multiplyScalar(0.06),
    });
    // A number typed into the menu has to show on the hand right away.
    const poses = onHandPoseChange(() => this.poses.clear());
    // Und wer die Knochenfarben umlegt, bekommt sie im selben Bild: eine
    // gefärbte Hand ist eine anders gebaute, also wird sie neu gebaut.
    const look = onHandLookChange(() => this.rebuild());
    this.unsubscribe = () => {
      poses();
      look();
    };
  }

  /** Alle Hände weg — die nächste Runde baut sie so, wie die Einstellung sagt. */
  private rebuild(): void {
    for (const [controller, hand] of this.hands) {
      this.disposeHand(hand);
      this.hands.delete(controller);
    }
    for (const controller of [...this.gloves.keys()]) this.dropGlove(controller);
    for (const [joint, mesh] of this.jointMeshes) joint.remove(mesh);
    this.jointMeshes.clear();
  }

  /**
   * Drawn at all. Switched off while the view has left the body behind — the
   * drone takes the eyes out into the room, and the hands stay with the body.
   * A pair of hands floating in front of a camera they are nowhere near is
   * exactly what makes people sick.
   */
  hidden = false;

  /** Forces a gesture, e.g. while a portal gun is held. */
  setGestureOverride(handedness: Handedness, gesture: HandGesture | null): void {
    this.overrides.set(handedness, gesture);
  }

  /**
   * Die **Faust eines Werkzeugs**: Superman fliegt mit geschlossener Hand, am
   * Hängegleiter liegen beide am Bügel. Getrennt von der Geste, die die Welt
   * jeder haltenden Hand gibt: die wird von der Haltung des Werkzeugs
   * abgedeckt (siehe `updateControllerHand`), diese hier gewinnt darüber.
   */
  setFist(handedness: Handedness, closed: boolean): void {
    if (closed) this.fists.add(handedness);
    else this.fists.delete(handedness);
  }

  /**
   * Die Hand selbst leuchtet — das Zeichen fürs **Anfassen**.
   *
   * Beim Nahgreifen und beim Ferngreifen leuchtet der Gegenstand: er ist
   * weit weg, und die Frage ist, *welcher* es ist. Beim Anfassen ist die
   * Frage eine andere — der Gegenstand leuchtet ohnehin schon, seit die Hand
   * in seine Nähe kam, und was jetzt dazukommt, ist „du bist wirklich dran".
   * Das steht der Hand besser als noch mehr Licht am Ding.
   */
  setGlow(handedness: Handedness, on: boolean): void {
    if (on === this.glowing.has(handedness)) return;
    if (on) this.glowing.add(handedness);
    else this.glowing.delete(handedness);
    const material = this.handMaterial(handedness);
    material.emissive.setHex(on ? GRAB_GLOW : material.color.getHex());
    material.emissive.multiplyScalar(on ? 0.42 : 0.06);
  }

  /** Ihr eigenes Material je Hand, gebaut, wenn die Hand zum ersten Mal da ist. */
  private handMaterial(handedness: Handedness): THREE.MeshStandardMaterial {
    let material = this.handMaterials.get(handedness);
    if (!material) {
      material = this.material.clone();
      this.handMaterials.set(handedness, material);
    }
    return material;
  }

  /**
   * Wie diese Hand gerade gezeichnet wird: Knochen am Controller, Kugeln beim
   * Handtracking. Eine Geisterhand, die daneben steht, soll ja so aussehen wie
   * die, die man in der Brille sieht.
   */
  lookOf(handedness: Handedness): HandStyle {
    for (const controller of this.input.controllers) {
      if (controller.handedness === handedness) {
        if (!controller.isHand) return styleOfSetting();
        // Und wenn die getrackte Hand einen Handschuh trägt, trägt ihn auch
        // das Vergleichsstück: verglichen wird nur ehrlich, wenn beides gleich
        // aussieht.
        return trackedGlove() ? 'glove' : 'limbs';
      }
    }
    return styleOfSetting();
  }

  /**
   * Which tool this hand is carrying, or null for an empty hand. A held tool
   * brings its own hand pose — that is what the settings are for — and an
   * empty hand goes back to the idle one.
   */
  setHeldTool(handedness: Handedness, toolId: string | null): void {
    if (this.holding.get(handedness) === toolId) return;
    this.holding.set(handedness, toolId);
  }

  /**
   * What this hand is currently carrying, as the id its pose is filed under:
   * a tool's id, `grab` for a plain object, or null for an empty hand. The
   * adjustment tool asks, so that what it measures lands on the pose the hand
   * is actually wearing.
   */
  heldToolOf(handedness: Handedness): string | null {
    return this.holding.get(handedness) ?? null;
  }

  /** The pose a hand is currently in, settings and held tool taken together. */
  poseOf(handedness: Handedness): HandPose {
    const toolId = this.holding.get(handedness) ?? null;
    const key = `${handedness}:${toolId ?? ''}`;
    let pose = this.poses.get(key);
    if (!pose) {
      pose = toolId ? holdHandPose(handedness, toolId) : idleHandPose(handedness);
      this.poses.set(key, pose);
    }
    return pose;
  }

  /** Drops the cached poses; the next frame reads the settings again. */
  refreshPoses(): void {
    this.poses.clear();
  }

  /** The pose a hand *would* have with this tool — what the editor works on. */
  editablePose(handedness: Handedness, toolId: string | null): HandPose {
    return clonePose(toolId ? holdHandPose(handedness, toolId) : idleHandPose(handedness));
  }

  /**
   * The object that visually *is* this hand: the procedural one for controllers,
   * the joint tree for tracked hands. Portals need it to draw the half that
   * sticks out on the other side.
   */
  handObject(controller: ControllerState): THREE.Object3D | null {
    if (controller.isHand) return controller.hand.visible ? controller.hand : null;
    const hand = this.hands.get(controller);
    return hand?.visible ? hand : null;
  }

  /** Current gesture of a controller hand, or null for tracked hands. */
  gestureOf(controller: ControllerState): HandGesture | null {
    if (controller.isHand || !controller.handedness) return null;
    const override = this.overrides.get(controller.handedness);
    if (override) return override;
    if (controller.squeeze.pressed && controller.trigger.pressed) return 'thumbsUp';
    if (controller.squeeze.pressed) return 'point';
    return 'open';
  }

  update(dt: number): void {
    for (const controller of this.input.controllers) {
      if (controller.isHand) {
        this.updateTrackedHand(dt, controller);
        this.hands.get(controller)?.removeFromParent();
        continue;
      }
      // Eine Hand, die wieder einen Controller hält, trägt keinen getrackten
      // Handschuh mehr — sonst hinge er im Raum der Hand still herum.
      this.dropGlove(controller);
      this.updateControllerHand(dt, controller);
    }
  }

  /**
   * Der Handschuh, der gerade auf **echten Knochen** liegt — oder `null`.
   *
   * Er trägt die gemessene Haltung: seine Weltmatrix ist die Lage der Hand,
   * seine Krümmungen sind die der echten Finger. Der Poseraum im Eingaberaum
   * misst genau daran, und deshalb gibt es ihn hier heraus statt ihn
   * einzumauern.
   */
  trackedGloveOf(handedness: Handedness): THREE.Object3D | null {
    for (const [controller, glove] of this.gloves) {
      if (controller.handedness === handedness && glove.visible) return glove;
    }
    return null;
  }

  /**
   * Die **gezeichnete** Hand dieser Seite, wie sie gerade im Raum steht — der
   * Handschuh auf echten Knochen, sonst die Hand am Controller.
   *
   * Sie ist das, wogegen der Poseraum misst: was man sieht, ist die Antwort,
   * und nicht eine Zahl, aus der sie folgen würde.
   */
  drawnHandOf(handedness: Handedness): THREE.Object3D | null {
    const glove = this.trackedGloveOf(handedness);
    if (glove) return glove;
    for (const [controller, hand] of this.hands) {
      // `parent` und nicht nur `visible`: eine Hand, deren Eingabequelle auf
      // Handtracking umgeschaltet hat, hängt an nichts mehr und bleibt
      // trotzdem im Topf stehen. Ihre Weltmatrix wäre dann ihre Ortsmatrix,
      // und gemessen würde gegen einen Ort, an dem nichts ist.
      if (controller.handedness === handedness && hand.visible && hand.parent) return hand;
    }
    return null;
  }

  /**
   * Wie weit die Finger einer getrackten Hand gerade gekrümmt sind — auf der
   * Skala, in der auch jede Haltung steht (`handGestures.foldToCurl`).
   */
  trackedCurlsOf(handedness: Handedness): number[] | null {
    for (const controller of this.input.controllers) {
      if (controller.isHand && controller.handedness === handedness) {
        return foldCurls(controller.fold);
      }
    }
    return null;
  }

  /**
   * **Jede Kugel dieser Hand als Zahl** — die zwanzig Werte, die in eine
   * Haltung gehen (`HandPose.joints`), oder `null`, solange die Brille die
   * Hand nicht vollständig sieht.
   *
   * Es ist genau die Messung, aus der auch der Handschuh gebaut und gestellt
   * wird: was der Poseraum speichert, ist das, was man in der Brille sieht,
   * und keine zweite Rechnung daneben.
   */
  trackedBonesOf(handedness: Handedness): number[] | null {
    const measured = this.measured.get(handedness);
    return measured ? handJointsToArray(measured.fingers) : null;
  }

  dispose(): void {
    this.unsubscribe();
    for (const [joint, mesh] of this.jointMeshes) joint.remove(mesh);
    this.jointMeshes.clear();
    for (const hand of this.hands.values()) this.disposeHand(hand);
    this.hands.clear();
    for (const glove of this.gloves.values()) this.disposeHand(glove);
    this.gloves.clear();
    this.fitted.clear();
    this.measured.clear();
    this.jointGeometry.dispose();
    for (const material of this.handMaterials.values()) material.dispose();
    this.handMaterials.clear();
    this.material.dispose();
    this.removeFromParent();
  }

  private disposeHand(hand: ProceduralHand): void {
    hand.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    hand.disposeMaterial();
    hand.removeFromParent();
  }

  private updateTrackedHand(dt: number, controller: ControllerState): void {
    // Der Handschuh zuerst: sitzt er, gehen die Kugeln aus. Zwei Hände
    // übereinander wären das Schlechteste von beidem.
    const glove = this.updateTrackedGlove(dt, controller);
    const colors = boneColors();
    for (const [name, joint] of Object.entries(controller.hand.joints)) {
      if (!joint) continue;
      let mesh = this.jointMeshes.get(joint);
      if (!mesh) {
        // Mit Knochenfarben trägt **jede Kugel** die Farbe ihres Knochens; das
        // ist genau die Ansicht, für die es den Schalter gibt — man sieht, wo
        // ein Gelenk anfängt, ohne es abzuzählen.
        const material = colors
          ? paletteMaterial(jointColor(name), this.material)
          : controller.handedness
            ? this.handMaterial(controller.handedness)
            : this.material;
        mesh = new THREE.Mesh(this.jointGeometry, material);
        joint.add(mesh);
        this.jointMeshes.set(joint, mesh);
      }
      mesh.scale.setScalar(Math.max((joint as THREE.XRJointSpace).jointRadius ?? 0.008, 0.004));
      mesh.visible = !this.hidden && !glove;
    }
    const tip = controller.hand.joints['index-finger-tip'];
    controller.fingertip = tip && tip.visible ? tip : null;
  }

  /**
   * **Einen Handschuh auf echte Knochen legen** — und zwar auf *alle*.
   *
   * Gestellt wird er aus vier Gelenken (`gloveFit.ts`) und **gebaut aus
   * allen** (`handBones.ts`): jede Fingerwurzel steht auf dem gemessenen
   * Knöchel, jeder Knochen ist so lang wie der echte, und der Stoff ist so
   * dick wie die Gelenkkugel, die die Brille an dieselbe Stelle malt. Gebeugt
   * wird er dann Knochen für Knochen mit den Winkeln derselben Messung — und
   * gefächert, denn eine blanke Hand spreizt die Finger, und das kann eine
   * Krümmung je Finger gar nicht sagen.
   *
   * **Genäht wird einmal.** Die Knochen einer Hand ändern ihre Länge nicht;
   * ein Netz je Bild neu zu nähen wäre der teuerste Weg, dasselbe zu zeigen.
   * Neu gebaut wird nur, wenn das Maß wirklich ein anderes ist.
   *
   * @returns den Handschuh, solange er steht — sonst `null`, und dann sind die
   *          Gelenkkugeln wieder dran.
   */
  private updateTrackedGlove(dt: number, controller: ControllerState): ProceduralHand | null {
    const side = controller.handedness;
    // Gemessen wird **immer**, auch wenn kein Handschuh darauf soll: der
    // Poseraum speichert die Gelenke einer blanken Hand, und ob dabei Kugeln
    // oder Stoff zu sehen sind, ändert an der Messung nichts.
    const fit =
      side && controller.hand.visible ? fitGlove(side, trackedJoints(controller.hand)) : null;
    const measure =
      side && fit
        ? measureHand(fit, trackedFingers(controller.hand), fingerRestRotations(side))
        : null;
    if (side) {
      if (measure) this.measured.set(side, measure);
      else this.measured.delete(side);
    }
    if (!side || !fit || !trackedGlove()) {
      this.dropGlove(controller);
      return null;
    }

    let glove = this.gloves.get(controller);
    const colors = boneColors();
    if (
      glove &&
      measure &&
      (glove.side !== side ||
        glove.colored !== colors ||
        !sameMeasure(this.fitted.get(controller), measure))
    ) {
      this.dropGlove(controller);
      glove = undefined;
    }
    if (!glove) {
      // Ein Bild, in dem ein Gelenk fehlt, ist kein Grund für einen halb
      // gemessenen Handschuh: gebaut wird erst, wenn die Hand einmal ganz zu
      // sehen war. Bis dahin machen die Gelenkkugeln weiter.
      if (!measure) return null;
      const material = this.handMaterial(side);
      // Ein Handschuh ist weiß, wo immer er steht — auch auf echten Knochen.
      material.color.setHex(GLOVE_COLOR);
      if (!this.glowing.has(side)) material.emissive.setHex(GLOVE_COLOR).multiplyScalar(0.06);
      glove = new ProceduralHand(side, material, { look: 'glove', measure, colors });
      controller.hand.add(glove);
      this.gloves.set(controller, glove);
      this.fitted.set(controller, measure);
    }

    // Der Maßstab bleibt bei eins: gebaut ist er in echten Metern, und was in
    // echten Metern gebaut ist, streckt man nicht noch einmal.
    glove.position.set(fit.position.x, fit.position.y, fit.position.z);
    glove.quaternion.set(fit.rotation.x, fit.rotation.y, fit.rotation.z, fit.rotation.w);
    glove.scale.setScalar(1);
    // Fällt ein Gelenk für ein Bild aus, bleiben die Finger stehen, wo sie
    // waren — das ist immer noch näher an der Wahrheit als eine Hand, die
    // einmal aufklappt und wieder zugeht.
    if (measure) {
      glove.setFingers({
        ...IDLE_HAND_POSE,
        curls: foldCurls(controller.fold) ?? IDLE_HAND_POSE.curls,
        joints: handJointsToArray(measure.fingers),
      });
    }
    glove.update(dt);
    glove.visible = !this.hidden;
    return glove.visible ? glove : null;
  }

  /** Der Handschuh dieser Eingabequelle geht weg — Kugeln übernehmen wieder. */
  private dropGlove(controller: ControllerState): void {
    const glove = this.gloves.get(controller);
    if (!glove) return;
    this.gloves.delete(controller);
    this.fitted.delete(controller);
    this.disposeHand(glove);
    const side = controller.handedness;
    if (!side) return;
    // Die Farbe zurück auf die, die zu dieser Hand gehört: dieselbe Vorlage
    // teilt sich Kugeln und Handschuh, und weiße Gelenkkugeln wären eine
    // Einstellung, die niemand gemacht hat. Legt dieselbe Hand gleich wieder
    // einen Controller in die Faust, gilt dort wieder das eingestellte
    // Modell — deshalb nicht stur die Handfarbe.
    const material = this.handMaterial(side);
    material.color.setHex(styleOfSetting() === 'glove' ? GLOVE_COLOR : this.baseColor);
    if (!this.glowing.has(side)) {
      material.emissive.setHex(material.color.getHex()).multiplyScalar(0.06);
    }
  }

  private updateControllerHand(dt: number, controller: ControllerState): void {
    if (!controller.handedness) return;
    let hand = this.hands.get(controller);
    // The runtime may hand the same slot to the other hand later on — a left
    // hand mesh on the right controller is what made both look mirrored. Und
    // wer im Menü das Handmodell wechselt, bekommt die Hand neu angezogen.
    const style = styleOfSetting();
    const colors = boneColors();
    if (
      hand &&
      (hand.side !== controller.handedness || hand.look !== style || hand.colored !== colors)
    ) {
      this.disposeHand(hand);
      this.hands.delete(controller);
      hand = undefined;
    }
    if (!hand) {
      const material = this.handMaterial(controller.handedness);
      // Ein Handschuh ist weiß; die Boxhand hat die Farbe der Hände.
      material.color.setHex(style === 'glove' ? GLOVE_COLOR : this.baseColor);
      if (!this.glowing.has(controller.handedness)) {
        material.emissive.setHex(material.color.getHex()).multiplyScalar(0.06);
      }
      hand = new ProceduralHand(controller.handedness, material, { look: style, colors });
      this.hands.set(controller, hand);
    }
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    if (hand.parent !== anchor) anchor.add(hand);
    hand.visible = controller.tracked && !this.hidden;
    controller.fingertip = hand.visible ? hand.indexTip : null;

    // The dialled-in pose is the base; the short-lived gestures (pointing at
    // something, a thumbs-up) still win while they last.
    const pose = this.poseOf(controller.handedness);
    hand.setPose(pose);
    // Und darüber, was die Knöpfe mit den Fingern tun: der Zeigefinger zieht
    // den Abzug, an der Stoppuhr der Daumen die Krone, und eine Hand, deren
    // Griffknopf aufgeht, öffnet sich vom Griff (`buttonCurls`).
    const toolId = this.holding.get(controller.handedness) ?? null;
    if (toolId) {
      // Nur die Finger, die ein Knopf wirklich bewegt (`buttonCurlLayer`): eine
      // gemessene Haltung trägt jedes Gelenk einzeln, und fünf Krümmungen
      // darüberzulegen würfe zwanzig gemessene Winkel für einen Zeigefinger weg.
      hand.setCurlOverrides(
        buttonCurlLayer(fingerMovesOf(toolId), {
          grab: controller.squeeze.pressed,
          trigger: controller.trigger.pressed,
        }),
      );
    }
    const forced = this.overrides.get(controller.handedness) ?? null;
    const gesture = this.gestureOf(controller);
    // `open` is the idle pose, and a hand that holds something wears the fist
    // of what it holds: its pose says how far each finger curls — at the
    // standard grip the index finger lies along the frame, at the hammer it is
    // in the fist. A `grip` gesture on top of that would only paint the built,
    // generic fist over the dialled-in one (and did, for every held tool: the
    // world asks for `grip` whenever a hand holds anything), so the pose covers
    // it. Any other gesture a tool explicitly asked for still wins.
    const covered =
      (gesture === 'open' && !forced) ||
      (gesture === 'grip' && Boolean(this.holding.get(controller.handedness)));
    if (gesture && !covered) hand.setGesture(gesture);
    // Die Faust, die ein Werkzeug selbst verlangt, über allem.
    if (this.fists.has(controller.handedness)) hand.setGesture('grip');
    hand.update(dt);
  }
}

/**
 * Die vier Gelenke, aus denen die Lage des Handschuhs folgt — im Raum der Hand.
 *
 * Dieselbe Form wie `handJoints` in `XRInput.ts`, nur mit anderen Namen darin:
 * dort geht es um Fingerspitzen und ein Faltmaß, hier um die Knöchel und einen
 * Rahmen. Ein Gelenk, das die Brille gerade nicht sieht, ist `null` und nicht
 * der Nullpunkt — sonst klappte der Handschuh dorthin zusammen.
 */
function trackedJoints(hand: THREE.XRHandSpace): GloveJoints {
  const joints = hand.joints as Partial<Record<string, THREE.XRJointSpace>>;
  const at = (name: string): THREE.Vector3 | null => {
    const joint = joints[name];
    return joint && joint.visible ? joint.position : null;
  };
  return {
    wrist: at('wrist'),
    middleKnuckle: at('middle-finger-phalanx-proximal'),
    indexKnuckle: at('index-finger-phalanx-proximal'),
    pinkyKnuckle: at('pinky-finger-phalanx-proximal'),
  };
}

/**
 * Wie die Brille die Gelenke jedes Fingers nennt — Wurzel, zwei Gelenke, Kuppe.
 *
 * Der **Daumen** hat kein Mittelglied und fängt dafür einen Knochen früher an:
 * sein Mittelhandknochen ist das, was bei den anderen der Knöchel ist. Damit
 * haben alle fünf dieselbe Form — vier Kugeln, drei Knochen —, und die Messung
 * daneben muss nicht wissen, welcher Finger gerade dran ist.
 */
const FINGER_JOINTS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip'],
  [
    'index-finger-phalanx-proximal',
    'index-finger-phalanx-intermediate',
    'index-finger-phalanx-distal',
    'index-finger-tip',
  ],
  [
    'middle-finger-phalanx-proximal',
    'middle-finger-phalanx-intermediate',
    'middle-finger-phalanx-distal',
    'middle-finger-tip',
  ],
  [
    'ring-finger-phalanx-proximal',
    'ring-finger-phalanx-intermediate',
    'ring-finger-phalanx-distal',
    'ring-finger-tip',
  ],
  [
    'pinky-finger-phalanx-proximal',
    'pinky-finger-phalanx-intermediate',
    'pinky-finger-phalanx-distal',
    'pinky-finger-tip',
  ],
];

/** Dieselben Gelenke als Zahlen — Ort und Dicke, wie die Messung sie braucht. */
function trackedFingers(hand: THREE.XRHandSpace): TrackedFinger[] {
  const joints = hand.joints as Partial<Record<string, THREE.XRJointSpace>>;
  const at = (name: string): { position: THREE.Vector3; radius: number } | null => {
    const joint = joints[name];
    if (!joint || !joint.visible) return null;
    return { position: joint.position, radius: joint.jointRadius ?? 0.008 };
  };
  return FINGER_JOINTS.map(([root, mid, far, tip]) => ({
    root: at(root),
    mid: at(mid),
    far: at(far),
    tip: at(tip),
  }));
}

/**
 * Ob zwei Messungen dieselbe Hand meinen.
 *
 * Verglichen werden **Maße und keine Winkel**: eine Hand, die sich bewegt, ist
 * dieselbe Hand, und ein Handschuh, der bei jeder Bewegung neu genäht würde,
 * wäre ein Standbild aus Netzen. Ein halber Millimeter Spiel ist dabei
 * großzügig gerechnet — die Brille misst eine Fingerlänge von Bild zu Bild
 * nicht auf den Zehntelmillimeter, und wer bei jedem Rauschen neu näht, näht
 * dauernd.
 */
const MEASURE_TOLERANCE = 0.0015;

function sameMeasure(a: MeasuredHand | undefined, b: MeasuredHand): boolean {
  if (!a || a.fingers.length !== b.fingers.length) return false;
  if (Math.abs(a.palmScale - b.palmScale) > 0.05) return false;
  for (let i = 0; i < a.fingers.length; i++) {
    const one = a.fingers[i]!;
    const two = b.fingers[i]!;
    if (Math.abs(one.radius - two.radius) > MEASURE_TOLERANCE) return false;
    if (one.lengths.length !== two.lengths.length) return false;
    for (let bone = 0; bone < one.lengths.length; bone++) {
      if (Math.abs(one.lengths[bone]! - two.lengths[bone]!) > MEASURE_TOLERANCE) return false;
    }
    if (Math.abs(one.root.x - two.root.x) > MEASURE_TOLERANCE) return false;
    if (Math.abs(one.root.y - two.root.y) > MEASURE_TOLERANCE) return false;
    if (Math.abs(one.root.z - two.root.z) > MEASURE_TOLERANCE) return false;
  }
  return true;
}

/** World position of a hand's index fingertip, if it is currently tracked. */
export function fingertipPosition(
  controller: ControllerState,
  target: THREE.Vector3,
): THREE.Vector3 | null {
  if (!controller.fingertip) return null;
  controller.fingertip.getWorldPosition(_vector);
  return target.copy(_vector);
}
