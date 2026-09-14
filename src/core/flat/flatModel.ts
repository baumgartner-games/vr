/**
 * **Was eine Welt von oben ist** — die Rechnung dahinter, ohne three.js.
 *
 * Haunting hat seine Karte von oben, weil jemand sie gezeichnet hat: Räume,
 * Wände, Türen, alles von Hand beschrieben (`map/mapSnapshot.ts`). Jede andere
 * Welt hat das nicht, und es für vierzehn Welten nachzuziehen wäre vierzehnmal
 * dieselbe Arbeit — und vierzehnmal eine zweite Wahrheit, die neben der ersten
 * herläuft und irgendwann von ihr abweicht.
 *
 * Also wird die Karte **aus der Welt selbst gelesen**. Jede Welt baut Netze,
 * jedes Netz hat eine Hülle, und eine Hülle von oben ist ein Rechteck mit
 * einer Höhe. Was daraus ein Boden, eine Wand oder ein Möbelstück wird,
 * entscheidet diese Datei — und zwar nur aus den Maßen, damit es sich ohne
 * Browser nachrechnen lässt (`flatModel.test.ts`).
 *
 * Die Einteilung ist grob, und das ist Absicht. Eine Karte von oben soll
 * zeigen, wo man langgehen kann und wo etwas im Weg steht; sie ist kein
 * zweites Bild der Welt. Was hier zu fein würde, würde auf einem Telefon
 * ohnehin niemand sehen.
 */

/** Eine Hülle in Weltkoordinaten, wie sie aus einem Netz fällt. */
export interface FlatHull {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/**
 * Was ein Stück Welt von oben ist.
 *
 * - `floor` — eine Fläche, auf der man steht: flach und breit.
 * - `wall` — etwas Hohes, das in einer der beiden Richtungen dünn ist.
 * - `prop` — alles dazwischen: Kisten, Möbel, Tore, Maschinen.
 */
export type FlatKind = 'floor' | 'wall' | 'prop';

/** Ein Stück Welt von oben: ein Rechteck in der Ebene, mit einer Höhe. */
export interface FlatBox {
  /** Mitte des Rechtecks. */
  x: number;
  z: number;
  /** Ausdehnung in x und z, in Metern. */
  w: number;
  d: number;
  /** Unterkante über dem Nullpunkt der Welt, in Metern. */
  base: number;
  /** Höhe in Metern. */
  height: number;
  kind: FlatKind;
  /** Die Farbe des Netzes, als `#rrggbb`. */
  color: string;
}

export interface FlatBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/** Eine Welt von oben: die Stücke und der Ausschnitt, in dem sie liegen. */
export interface FlatScan {
  boxes: FlatBox[];
  bounds: FlatBounds;
}

/**
 * **Ab wann etwas flach genug ist, um ein Boden zu sein** — in Metern.
 *
 * Eine Bodenplatte ist ein paar Zentimeter dick, eine Stufe zwanzig. Beides
 * ist etwas, worauf man steht. Ein halber Meter wäre schon eine Bank.
 */
export const FLOOR_H = 0.34;

/**
 * **Ab wann etwas hoch genug ist, um eine Wand zu sein** — in Metern.
 *
 * Unter Brusthöhe ist es eine Brüstung, über die man hinwegsieht, und die
 * gehört zu den Möbeln. Darüber steht man davor und sieht nichts mehr.
 */
export const WALL_H = 1.2;

/**
 * **Wie schmal eine Wand sein muss**, als Verhältnis der beiden Seiten.
 *
 * Eine Wand ist lang und dünn. Ein Schrank ist hoch und in beiden Richtungen
 * ähnlich groß — der ist ein Möbelstück, auch wenn er bis zur Decke reicht.
 */
export const WALL_RATIO = 2.5;

/** Kleiner als das interessiert von oben niemanden — Schrauben, Knöpfe, Staub. */
export const MIN_FOOTPRINT = 0.05;

/**
 * **Größer als das ist keine Welt mehr, sondern der Himmel.**
 *
 * Eine Skybox ist eine Kugel mit 500 m Radius, ein Nebelboden eine Platte über
 * den halben Kontinent. Beides in den Ausschnitt zu nehmen hieße, die Karte
 * auf einen Punkt zusammenzuschrumpfen, in dem die ganze Welt steckt.
 */
export const MAX_SPAN = 400;

/**
 * Wie hoch über dem Boden noch etwas zur Karte gehört, in Metern.
 *
 * Eine Karte von oben ist ein **Schnitt**, kein Blick von der Decke: Was über
 * dem Kopf hängt — Decken, Lampen, das Dach —, verdeckt sonst alles darunter.
 * Gezeichnet wird also nur, was mit seiner Unterkante unterhalb dieser Höhe
 * über dem Boden liegt, auf dem der Spieler steht.
 */
export const CUT_HEIGHT = 2.6;

/**
 * **Was dieses Stück Welt von oben ist — oder nichts.**
 *
 * `null` heißt: gehört nicht auf die Karte. Das ist der Himmel, das ist der
 * Schraubenkopf, und das ist die Decke über dem Kopf des Spielers.
 *
 * @param floorY Wo der Spieler steht, in Metern. Der Schnitt liegt darüber.
 */
export function classify(hull: FlatHull, floorY = 0): FlatKind | null {
  const w = hull.maxX - hull.minX;
  const d = hull.maxZ - hull.minZ;
  const height = hull.maxY - hull.minY;
  if (w < MIN_FOOTPRINT && d < MIN_FOOTPRINT) return null;
  if (w > MAX_SPAN || d > MAX_SPAN) return null;
  // Über dem Kopf: die Decke, das Dach, die Lampe daran.
  if (hull.minY > floorY + CUT_HEIGHT) return null;
  if (height <= FLOOR_H) return w * d >= 0.25 ? 'floor' : 'prop';
  if (height >= WALL_H) {
    const long = Math.max(w, d);
    const thin = Math.min(w, d);
    // Eine Wand ist lang und dünn; ein Turm ist in beiden Richtungen gleich.
    if (thin <= 0.001 || long / thin >= WALL_RATIO) return 'wall';
  }
  return 'prop';
}

/** Aus einer Hülle das Rechteck mit Höhe, so wie es gezeichnet wird. */
export function boxOf(hull: FlatHull, kind: FlatKind, color: string): FlatBox {
  return {
    x: (hull.minX + hull.maxX) / 2,
    z: (hull.minZ + hull.maxZ) / 2,
    w: hull.maxX - hull.minX,
    d: hull.maxZ - hull.minZ,
    base: hull.minY,
    height: hull.maxY - hull.minY,
    kind,
    color,
  };
}

/**
 * Der Ausschnitt um eine Menge von Stücken. Leer ergibt einen Punkt, damit
 * niemand mit `Infinity` weiterrechnet.
 */
export function boundsOf(boxes: readonly FlatBox[]): FlatBounds {
  if (boxes.length === 0) return { minX: -1, minZ: -1, maxX: 1, maxZ: 1 };
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const box of boxes) {
    minX = Math.min(minX, box.x - box.w / 2);
    maxX = Math.max(maxX, box.x + box.w / 2);
    minZ = Math.min(minZ, box.z - box.d / 2);
    maxZ = Math.max(maxZ, box.z + box.d / 2);
  }
  return { minX, minZ, maxX, maxZ };
}

/**
 * **Was im Bild liegt** — der Test, mit dem die Zeichnung alles andere
 * überspringt. Großzügig um eine Wandhöhe erweitert, weil ein Stück, dessen
 * Mitte knapp draußen liegt, mit seiner aufgestellten Vorderseite noch
 * hereinragt.
 */
export function inView(box: FlatBox, view: FlatBounds, margin = 1): boolean {
  return (
    box.x + box.w / 2 >= view.minX - margin &&
    box.x - box.w / 2 <= view.maxX + margin &&
    box.z + box.d / 2 >= view.minZ - margin &&
    box.z - box.d / 2 <= view.maxZ + margin
  );
}

/**
 * **Die Reihenfolge, in der gezeichnet wird.**
 *
 * Norden ist oben, und alles Aufrechte wächst auf dem Bild nach oben (dieselbe
 * Pseudo-3D-Regel wie in Haunting, `map/flatScene.ts`). Wer weiter südlich
 * steht, wird später gezeichnet und verdeckt damit, was dahinter liegt. Böden
 * kommen vor allem anderen, sonst läge eine Bodenplatte über der Wand, die
 * einen Meter weiter südlich steht.
 */
export function drawOrder(a: FlatBox, b: FlatBox): number {
  const floor = Number(a.kind === 'floor') - Number(b.kind === 'floor');
  if (floor !== 0) return -floor;
  // **Unter den Böden zuerst der größte.** Sie liegen alle flach übereinander,
  // und wer zuletzt kommt, deckt zu: Eine Halle, die nach ihrem Blech käme,
  // hätte das Blech verschluckt — und eine Wüste den ganzen Rest der Welt.
  if (a.kind === 'floor') return b.w * b.d - a.w * a.d;
  return a.z - b.z || a.base - b.base;
}

// --- Die Kamera von oben ----------------------------------------------------

/**
 * **Wohin die Karte schaut**: Mitte in Metern, Maßstab in Bildpunkten je
 * Meter. Nie gedreht — Norden ist oben, so wie in Haunting
 * (`map/flatScene.FlatSceneView`), weil eine sich drehende Karte niemandem
 * sagt, wo er ist.
 */
export interface FlatCamera {
  centreX: number;
  centreZ: number;
  /** Bildpunkte je Meter. */
  scale: number;
}

/**
 * **Bildpunkte je Meter, mit denen die Ansicht anfängt.**
 *
 * Haunting steht auf 84 und hat recht damit: Seine Zimmer sind klein, und die
 * Figur soll darin groß sein. Die anderen Welten sind Hallen, Wüsten und
 * Berge — auf 84 sieht man dort einen Quadratmeter Boden und sonst nichts.
 * Also weiter weg, und wer näher heran will, dreht am Rad oder kneift.
 */
export const DEFAULT_SCALE = 46;
/** Und auf schmalen Telefonen weniger, damit mehr ins Bild passt. */
export const PHONE_SCALE = 34;
/** Unterhalb dieser Breite in Punkten gilt ein Bildschirm als schmales Telefon. */
export const PHONE_WIDTH = 480;
export const MIN_SCALE = 12;
export const MAX_SCALE = 160;

/**
 * **Wie weit ein Stück nach Norden rückt, damit es steht** — in Metern.
 *
 * Das ist der ganze Trick am Pseudo-3D: Die Oberseite wird nach oben
 * verschoben gezeichnet, und darunter bleibt eine Vorderseite übrig, die nach
 * Süden zeigt. Der Betrag wächst mit der Höhe, aber gedeckelt: Eine Wand von
 * zehn Metern würde sonst den halben Bildschirm nach oben ausfüllen und alles
 * dahinter verdecken.
 */
export const LIFT = 0.34;
export const LIFT_MAX = 0.95;

export function liftOf(height: number): number {
  return Math.min(LIFT_MAX, Math.max(0, height) * LIFT);
}

/** Ein Punkt der Welt auf dem Bild — Norden oben, kleines z also weiter oben. */
export function toScreen(
  camera: FlatCamera,
  width: number,
  height: number,
  x: number,
  z: number,
): { x: number; y: number } {
  return {
    x: width / 2 + (x - camera.centreX) * camera.scale,
    y: height / 2 + (z - camera.centreZ) * camera.scale,
  };
}

/** Welchen Ausschnitt der Welt ein Bild dieser Größe zeigt. */
export function viewBounds(camera: FlatCamera, width: number, height: number): FlatBounds {
  const halfX = width / 2 / camera.scale;
  const halfZ = height / 2 / camera.scale;
  return {
    minX: camera.centreX - halfX,
    maxX: camera.centreX + halfX,
    minZ: camera.centreZ - halfZ,
    maxZ: camera.centreZ + halfZ,
  };
}

/** Der Maßstab, mit dem ein Bildschirm dieser Breite anfängt. */
export function scaleForWidth(width: number): number {
  return width < PHONE_WIDTH ? PHONE_SCALE : DEFAULT_SCALE;
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Eine Farbe abdunkeln oder aufhellen, um einen Anteil.
 *
 * Die Vorderseite eines Klotzes ist dieselbe Farbe wie seine Oberseite, nur
 * dunkler — das ist der ganze Unterschied, an dem das Auge eine Kante sieht.
 * `amount` unter Null dunkelt ab, darüber hellt auf.
 */
export function shade(color: string, amount: number): string {
  const hex = color.replace('#', '');
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const value = Number.parseInt(full.slice(0, 6), 16);
  if (!Number.isFinite(value)) return color;
  const mix = (channel: number): number => {
    const target = amount < 0 ? 0 : 255;
    const t = Math.min(1, Math.abs(amount));
    return Math.round(channel + (target - channel) * t);
  };
  const r = mix((value >> 16) & 0xff);
  const g = mix((value >> 8) & 0xff);
  const b = mix(value & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
