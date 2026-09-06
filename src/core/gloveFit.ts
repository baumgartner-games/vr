/**
 * **Den Handschuh auf die Knochen legen** — die Rechnung dahinter.
 *
 * Eine getrackte Hand ist in dieser Welt bisher eine Reihe Kugeln: die Brille
 * liefert fünfundzwanzig Gelenke, und an jedes wird eine Kugel gehängt. Das ist
 * ehrlich und sieht nach Messgerät aus. Wer ein Werkzeug in der Hand ansehen
 * will, will aber eine **Hand** sehen — und die gibt es längst, als
 * gehäutetes Netz am gebauten Skelett (`gloveMesh.ts`).
 *
 * Beides zusammenzubringen heißt: das gebaute Skelett so in den Raum stellen,
 * dass es dort liegt, wo die echten Knochen liegen. Drei Gelenke reichen dafür,
 * und es sind genau die drei, an denen man eine Hand festhält:
 *
 * - **Handgelenk** und **Mittelfingerknöchel** spannen die Handachse auf — das
 *   ist die Richtung, in die die Finger zeigen, und ihr Abstand ist das Maß der
 *   Hand.
 * - **Zeige-** und **kleiner Knöchel** spannen die Querachse auf — sie sagt,
 *   wohin der Handrücken schaut, denn zwei Achsen legen die dritte fest.
 *
 * Der **Maßstab** kommt aus derselben Messung: die gebaute Hand hat vom
 * Handgelenk bis zum Ansatz des Mittelfingers `PALM_LENGTH`, die echte hat, was
 * sie hat. Eine Kinderhand bekommt damit eine kleine Handfläche und eine große
 * Hand eine große.
 *
 * Für die **Finger** gilt er nicht mehr: die werden nicht gestreckt, sondern
 * auf ihre echten Maße gebaut (`handBones.ts`) — jeder Knochen so lang wie der
 * echte, jede Wurzel auf dem gemessenen Knöchel. Ein Maßstab ist eine Zahl für
 * eine ganze Hand, und keine Hand hat fünf gleich lange Finger. Was hier
 * herauskommt, sagt deshalb nur noch, **wo** die Hand steht und wie groß ihre
 * Handfläche ist.
 *
 * Ohne three.js, wie `handGestures.ts` daneben: die Vorzeichen einer Handachse
 * prüft man einzeln und nicht in einer Brille.
 */

import type { Handedness } from './XRInput';

/** Ein Punkt — ein Gelenk, ein `THREE.Vector3`, was auch immer. */
export interface Point3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Eine Drehung, in derselben Schreibweise wie überall sonst hier. */
export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Die vier Gelenke, aus denen die Lage der Hand folgt. */
export interface GloveJoints {
  wrist: Point3 | null;
  /** Der Knöchel des Mittelfingers — das ferne Ende der Handfläche. */
  middleKnuckle: Point3 | null;
  /** Der Knöchel des Zeigefingers — die Daumenseite. */
  indexKnuckle: Point3 | null;
  /** Der Knöchel des kleinen Fingers — die andere Seite. */
  pinkyKnuckle: Point3 | null;
}

/** Wohin das gebaute Skelett gehört: Ort, Drehung und Maßstab. */
export interface GloveFit {
  position: Point3;
  rotation: Quat;
  scale: number;
}

/**
 * Wo das **Handgelenk** im gebauten Modell liegt, auf seiner eigenen Z-Achse.
 *
 * Die Handfläche ist ein Kasten von 9 cm Tiefe, dessen Mitte einen Zentimeter
 * hinter dem Nullpunkt sitzt (`HandVisuals.ts`) — ihre hintere Kante liegt
 * damit bei +3,5 cm, und das ist die Stelle, an der ein Arm anfinge.
 */
export const PALM_BACK_Z = 0.035;

/**
 * Und wo der **Mittelfinger** ansetzt: der mittlere der vier Fingerwurzeln
 * (`FINGERS` in `HandVisuals.ts`, `z: -0.048`).
 */
export const MIDDLE_ROOT_Z = -0.048;

/** Die Handfläche des gebauten Modells, in Metern — das Lineal für den Maßstab. */
export const PALM_LENGTH = PALM_BACK_Z - MIDDLE_ROOT_Z;

/**
 * Wie klein und wie groß ein Handschuh werden darf.
 *
 * Ein Maßstab kommt aus einer Messung, und eine Messung darf danebengehen: ein
 * Gelenk, das für ein Bild bei null liegt, machte den Handschuh sonst zum Punkt
 * oder zum Zelt. Die Grenzen sind weit genug für jede Hand und eng genug, dass
 * ein Ausrutscher als Ausrutscher aussieht.
 */
export const SCALE_MIN = 0.6;
export const SCALE_MAX = 1.7;

/**
 * Die Lage des gebauten Skeletts, aus den Gelenken einer echten Hand — oder
 * `null`, wenn die Brille gerade nicht genug davon liefert.
 *
 * Gerechnet wird im Raum, in dem die Gelenke stehen; für WebXR ist das der Raum
 * der Hand selbst, und dort landet der Handschuh dann auch.
 */
export function fitGlove(side: Handedness, joints: GloveJoints): GloveFit | null {
  const { wrist, middleKnuckle, indexKnuckle, pinkyKnuckle } = joints;
  if (!wrist || !middleKnuckle || !indexKnuckle || !pinkyKnuckle) return null;

  // Die Handachse: vom Handgelenk zu den Knöcheln. Das ist das **-Z** der
  // gebauten Hand — dorthin zeigen ihre Finger.
  const along = subtract(middleKnuckle, wrist);
  const reach = length(along);
  if (!(reach > 1e-4)) return null;
  const forward = scaled(along, 1 / reach);

  // Die Querachse: vom kleinen Finger zum Zeigefinger. In der gebauten Hand
  // liegt der Zeigefinger auf der Daumenseite, und die ist rechts bei **-X**
  // (`FINGERS`, `mirror`) — links andersherum. Genau dieses eine Vorzeichen
  // unterscheidet eine linke Hand von einer rechten.
  const across = subtract(indexKnuckle, pinkyKnuckle);
  if (!(length(across) > 1e-4)) return null;
  const sideways = side === 'right' ? scaled(across, -1) : across;

  // +Z der Hand zeigt nach hinten zum Handgelenk, also gegen die Handachse.
  const ez = scaled(forward, -1);
  // Die Querachse steht selten genau senkrecht auf der Handachse — eine echte
  // Hand ist kein Rechteck. Also wird der Anteil entlang der Handachse
  // herausgenommen, statt eine schiefe Basis zu bauen.
  const raw = subtract(sideways, scaled(ez, dot(sideways, ez)));
  const width = length(raw);
  if (!(width > 1e-4)) return null;
  const ex = scaled(raw, 1 / width);
  const ey = cross(ez, ex);

  const scale = clamp(reach / PALM_LENGTH, SCALE_MIN, SCALE_MAX);
  // Der Nullpunkt der gebauten Hand liegt `PALM_BACK_Z` vor dem Handgelenk —
  // also liegt er, von dort aus gesehen, genau so weit in Richtung der Finger.
  const position = {
    x: wrist.x + forward.x * PALM_BACK_Z * scale,
    y: wrist.y + forward.y * PALM_BACK_Z * scale,
    z: wrist.z + forward.z * PALM_BACK_Z * scale,
  };
  return { position, rotation: quatFromBasis(ex, ey, ez), scale };
}

/**
 * Eine Drehung aus drei Achsen, die schon senkrecht aufeinander stehen.
 *
 * Der Weg über die Spur der Matrix und nicht über Winkel: Winkel haben eine
 * Reihenfolge, eine Basis hat keine, und was hier hereinkommt, ist eine Basis.
 */
export function quatFromBasis(x: Point3, y: Point3, z: Point3): Quat {
  const trace = x.x + y.y + z.z;
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return { x: (y.z - z.y) / s, y: (z.x - x.z) / s, z: (x.y - y.x) / s, w: s / 4 };
  }
  if (x.x > y.y && x.x > z.z) {
    const s = Math.sqrt(1 + x.x - y.y - z.z) * 2;
    return { x: s / 4, y: (y.x + x.y) / s, z: (z.x + x.z) / s, w: (y.z - z.y) / s };
  }
  if (y.y > z.z) {
    const s = Math.sqrt(1 + y.y - x.x - z.z) * 2;
    return { x: (y.x + x.y) / s, y: s / 4, z: (z.y + y.z) / s, w: (z.x - x.z) / s };
  }
  const s = Math.sqrt(1 + z.z - x.x - y.y) * 2;
  return { x: (z.x + x.z) / s, y: (z.y + y.z) / s, z: s / 4, w: (x.y - y.x) / s };
}

function subtract(a: Point3, b: Point3): Point3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scaled(a: Point3, factor: number): Point3 {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

function dot(a: Point3, b: Point3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Point3, b: Point3): Point3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(a: Point3): number {
  return Math.hypot(a.x, a.y, a.z);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(max, Math.max(min, value));
}
