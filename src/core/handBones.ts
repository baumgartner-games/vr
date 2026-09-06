/**
 * **Jede Kugel der blanken Hand als Zahl** — die Messung dahinter.
 *
 * `gloveFit.ts` stellt den Handschuh dorthin, wo die echte Hand liegt: vier
 * Gelenke sagen Ort, Drehung und Maßstab, und damit sitzt die *Hand*. Die
 * *Finger* sagt es nicht. Die kamen bisher aus dem Faltmaß
 * (`handGestures.foldCurls`) — **eine** Zahl je Finger, und zwar der Abstand
 * der Kuppe von der Handflächenmitte. Aus einer Zahl lässt sich ein Finger
 * aber nicht stellen: ob er am Grundgelenk knickt oder erst am Mittelgelenk,
 * ob er zur Seite steht oder geradeaus, all das fällt in dieselbe Zahl. Die
 * Brille meldet **fünfundzwanzig** Gelenke, und fünf davon anzusehen war immer
 * die halbe Messung.
 *
 * Hier steht die ganze. Aus den Gelenken einer Hand wird für jeden Finger:
 *
 * - **wo seine Wurzel liegt** und **wie lang seine Knochen sind**, in Metern —
 *   das Maß der echten Hand, aus dem der Handschuh gebaut wird, statt ein
 *   gebautes Modell auf eine Zahl zu skalieren;
 * - **wie dick seine Gelenkkugeln sind** (`jointRadius`) — damit der Stoff um
 *   den Finger so dick ist wie die Kugeln, die die Brille an dieselbe Stelle
 *   malt, und nicht dünner oder dicker;
 * - **wie weit jeder einzelne Knochen gebeugt ist**, in Grad, und **wie weit
 *   der Finger an der Wurzel zur Seite steht** — die Spreizung, die es an einer
 *   blanken Hand wirklich gibt und die eine Faust-Zahl gar nicht ausdrücken
 *   kann.
 *
 * Damit ist jede Kugel der echten Hand eine Zahl in der Haltung
 * (`handPose.ts`, `HandPose.joints`), und der Handschuh liegt Knochen für
 * Knochen auf den Kugeln statt ungefähr darüber.
 *
 * ## Wie die Winkel gemeint sind
 *
 * Genau so, wie das Modell sie einsetzt (`HandVisuals.ProceduralHand`): eine
 * Fingerwurzel dreht um **Y** (die Fächerung), jeder Knochen darunter um
 * **X** (die Beugung), und beides in der Ruhelage der Wurzel — beim Daumen ist
 * die eine Drehung, bei den vier Fingern die Einheit. Gemessen wird deshalb
 * auch dort: die Richtung des Knochens wird in den Rahmen seines Vorgängers
 * zurückgerechnet, und was übrig bleibt, sind die zwei Winkel, die das Modell
 * kennt. Eine gemessene Zahl geht damit unverändert in eine Drehung — es gibt
 * keinen Umrechnungsfaktor, den jemand nachziehen müsste.
 *
 * Beugung ist **positiv zur Handfläche hin**, also so herum, wie ein Finger
 * sich schließt. Fächerung ist positiv zur Daumenseite der *rechten* Hand;
 * gespiegelt wird sie mit der Haltung (`mirrorHandPose`).
 *
 * Ohne three.js, wie `gloveFit.ts` daneben: die Vorzeichen einer Handachse
 * prüft man einzeln und nicht in einer Brille.
 */

import type { GloveFit, Point3, Quat } from './gloveFit';

const DEG = Math.PI / 180;

/** Ein Gelenk, wie die Brille es meldet: wo es liegt und wie dick es ist. */
export interface TrackedJoint {
  readonly position: Point3;
  /** `XRJointSpace.jointRadius`, in Metern — die Kugel, die dort gezeichnet wird. */
  readonly radius: number;
}

/**
 * Ein Finger, wie er hier gebraucht wird: vier Gelenke, von der Wurzel zur
 * Kuppe — und damit **drei** Knochen.
 *
 * Für die vier Finger sind das Knöchel, Mittelgelenk, Endgelenk und Kuppe; für
 * den Daumen Mittelhandknochen, Grundgelenk, Endgelenk und Kuppe. Beide haben
 * damit dieselbe Form, und der Rest dieser Datei muss nicht wissen, welcher
 * Finger gerade gemeint ist. Ein Gelenk, das die Brille nicht sieht, ist
 * `null` und nicht der Nullpunkt.
 */
export interface TrackedFinger {
  root: TrackedJoint | null;
  mid: TrackedJoint | null;
  far: TrackedJoint | null;
  tip: TrackedJoint | null;
}

/** Was ein Finger nach der Messung ist. */
export interface MeasuredFinger {
  /** Wo seine Wurzel im Raum der gezeichneten Hand liegt, in Metern. */
  root: Point3;
  /** Die Längen seiner drei Knochen, in Metern. */
  lengths: number[];
  /** Wie dick die Kugeln an diesem Finger sind, in Metern. */
  radius: number;
  /** Die Beugung der drei Knochen, in Grad, positiv zur Handfläche hin. */
  bends: number[];
  /** Wie weit er an der Wurzel zur Seite steht, in Grad. */
  fan: number;
}

/** Und die ganze Hand: fünf Finger und das Maß der Handfläche. */
export interface MeasuredHand {
  /** Daumen, Zeige-, Mittel-, Ring-, kleiner Finger — die Reihenfolge von überall. */
  fingers: MeasuredFinger[];
  /**
   * Wie groß die Handfläche gegenüber der gebauten ist (`GloveFit.scale`).
   *
   * Die Finger werden in ihren echten Maßen gebaut und brauchen ihn nicht; die
   * Handfläche ist ein gebautes Profil und wird damit gestreckt.
   */
  palmScale: number;
}

/** Wie viele Knochen ein gemessener Finger hat. */
export const FINGER_BONES = 3;

/**
 * Die Messung.
 *
 * @param fit     wo die gezeichnete Hand steht (`fitGlove`) — ihr Ursprung und
 *                ihre Achsen sind der Rahmen, in dem alles andere hier steht
 * @param fingers die fünf Finger, in derselben Reihenfolge wie überall
 * @param rest    die Ruhelage jeder Fingerwurzel im Modell — die Einheit für
 *                die vier Finger, die schräge Lage für den Daumen
 * @returns `null`, sobald ein Finger nicht vollständig zu sehen ist: eine halb
 *          gemessene Hand ist keine, und ein fehlendes Gelenk als Nullpunkt
 *          klappte den Finger in die Handwurzel.
 */
export function measureHand(
  fit: GloveFit,
  fingers: readonly TrackedFinger[],
  rest: readonly Quat[],
): MeasuredHand | null {
  if (fingers.length === 0) return null;
  const measured: MeasuredFinger[] = [];
  for (let i = 0; i < fingers.length; i++) {
    const finger = measureFinger(fit, fingers[i]!, rest[i] ?? IDENTITY);
    if (!finger) return null;
    measured.push(finger);
  }
  return { fingers: measured, palmScale: fit.scale };
}

const IDENTITY: Quat = { x: 0, y: 0, z: 0, w: 1 };

function measureFinger(fit: GloveFit, finger: TrackedFinger, rest: Quat): MeasuredFinger | null {
  const { root, mid, far, tip } = finger;
  if (!root || !mid || !far || !tip) return null;

  // Alles in den Raum der gezeichneten Hand: der Ursprung ist ihr Nullpunkt,
  // die Achsen sind ihre X, Y, Z. Ohne das stünde jede Zahl hier in dem Raum,
  // in dem die Brille gerade zufällig misst.
  const at = (joint: TrackedJoint): Point3 => toLocal(fit, joint.position);
  const points = [at(root), at(mid), at(far), at(tip)];

  const lengths: number[] = [];
  const bends: number[] = [];
  let fan = 0;

  for (let bone = 0; bone < FINGER_BONES; bone++) {
    const step = subtract(points[bone + 1]!, points[bone]!);
    const span = length(step);
    if (!(span > 1e-5)) return null;
    lengths.push(span);

    // Die Richtung dieses Knochens, zurückgerechnet in den Rahmen seines
    // Vorgängers: erst die Ruhelage der Wurzel heraus, dann die Fächerung,
    // dann jede Beugung, die schon gemessen ist. Was übrig bleibt, ist genau
    // die Drehung, die das Modell an dieser Stelle einsetzt.
    let direction = inverseRotate(rest, scaled(step, 1 / span));
    if (bone === 0) {
      // Nur die Wurzel fächert; die Knochen darunter tun es nicht — ein Finger
      // knickt zur Handfläche und nicht zur Seite.
      fan = Math.atan2(-direction.x, -direction.z) / DEG;
    }
    direction = rotateY(direction, -fan * DEG);
    for (let done = 0; done < bone; done++) {
      direction = rotateX(direction, bends[done]! * DEG);
    }
    bends.push(-Math.atan2(direction.y, Math.hypot(direction.x, direction.z)) / DEG);
  }

  // Die Dicke: die dickste Kugel an diesem Finger. Der Stoff soll die Kugeln
  // umschließen und nicht durch die dickste hindurchgehen.
  const radius = Math.max(root.radius, mid.radius, far.radius, tip.radius);

  return {
    root: points[0]!,
    lengths,
    radius: Number.isFinite(radius) && radius > 0 ? radius : 0.008,
    bends,
    fan,
  };
}

/**
 * Ein Punkt im Raum der gezeichneten Hand: der Ursprung heraus, die Drehung
 * zurück. Der Maßstab bleibt draußen — gemessen wird in echten Metern, und
 * genau darin wird der Handschuh auch gebaut.
 */
function toLocal(fit: GloveFit, point: Point3): Point3 {
  return inverseRotate(fit.rotation, subtract(point, fit.position));
}

/** Ein Vektor, gedreht um die Umkehrung dieser Drehung. */
export function inverseRotate(q: Quat, v: Point3): Point3 {
  return rotate({ x: -q.x, y: -q.y, z: -q.z, w: q.w }, v);
}

/** Ein Vektor, gedreht um diese Drehung — die übliche Quaternionenformel. */
export function rotate(q: Quat, v: Point3): Point3 {
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

function rotateX(v: Point3, angle: number): Point3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}

function rotateY(v: Point3, angle: number): Point3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}

function subtract(a: Point3, b: Point3): Point3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaled(a: Point3, factor: number): Point3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

function length(a: Point3): number {
  return Math.hypot(a.x, a.y, a.z);
}
