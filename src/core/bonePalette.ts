/**
 * **Jeder Knochen seine Farbe** — die Palette hinter dem Schalter
 * *Knochenfarben* (`handLook.ts`, Knopf im Poseraum).
 *
 * Eine Hand ist einfarbig, und das ist beim Spielen richtig: ein Handschuh ist
 * ein Handschuh und kein Farbfächer. Beim **Justieren** ist es genau falsch.
 * Wer eine Haltung einstellt, sieht fünf gleich weiße Röhren und muss aus dem
 * Zusammenhang erraten, welche davon der Ringfinger ist und wo der zweite
 * Knochen anfängt — und wer eine Zahl in der Tafel ändert, sieht danach nicht,
 * *welcher* Knochen sich bewegt hat.
 *
 * Angefärbt ist beides eine Sache von einem Blick: **ein Farbton je Finger**,
 * vom Daumen (rot) über den Zeigefinger (orange), Mittelfinger (grün) und
 * Ringfinger (blau) bis zum kleinen Finger (violett) — und **je Knochen eine
 * Stufe heller** zur Kuppe hin. Damit sagt die Farbe zwei Dinge auf einmal,
 * welcher Finger und der wievielte Knochen, und beides ohne Beschriftung.
 *
 * Die Farben sind **gerechnet und nicht ausgesucht**: derselbe Farbton in
 * gleichen Abständen auf dem Farbkreis, dieselbe Sättigung, und die Helligkeit
 * gleichmäßig verteilt über die Knochen, die dieser Finger wirklich hat. Ein
 * Modell mit zwei Knochen je Finger bekommt damit dieselben Enden wie eins mit
 * dreien — die getrackte Hand hat drei (`handBones.ts`), die gebaute zwei.
 *
 * Ohne three.js: eine Farbe ist eine Zahl, und ob die stimmt, prüft man ohne
 * Renderer.
 */

/**
 * Der Farbton je Finger, in Grad auf dem Farbkreis — Daumen … kleiner Finger.
 *
 * Nicht gleichmäßig über die Runde verteilt, sondern über die Strecke von Rot
 * bis Violett: fünf Töne im vollen Kreis lägen so weit auseinander, dass zwei
 * benachbarte Finger einmal Rot und einmal Magenta wären, und die verwechselt
 * man auf einer gewölbten weißen Fläche im Gegenlicht.
 */
export const FINGER_HUES: readonly number[] = [0, 38, 140, 205, 285];

/** Die Handfläche und die Manschette — grau, damit die Finger die Farben haben. */
export const PALM_COLOR = 0x8a93a6;

/** Wie kräftig und wie hell ein Knochen gefärbt wird. */
const SATURATION = 0.72;
/** Der Wurzelknochen ist der dunkelste, die Kuppe der hellste. */
const LIGHT_FROM = 0.42;
const LIGHT_TO = 0.72;

/**
 * Die Farbe des `bone`-ten Knochens am `finger`-ten Finger, wenn dieser Finger
 * `bones` Knochen hat.
 *
 * Ein Finger, dessen Knochen man nicht kennt (`bones <= 1`), bekommt die
 * mittlere Helligkeit seines Tons — sonst stünde die Wurzel eines
 * einknochigen Fingers dunkler da als die aller anderen.
 */
export function boneColor(finger: number, bone: number, bones: number): number {
  const hue =
    FINGER_HUES[((finger % FINGER_HUES.length) + FINGER_HUES.length) % FINGER_HUES.length]!;
  const steps = Math.max(1, bones - 1);
  const t = bones <= 1 ? 0.5 : Math.min(1, Math.max(0, bone / steps));
  return hslColor(hue, SATURATION, LIGHT_FROM + (LIGHT_TO - LIGHT_FROM) * t);
}

/**
 * Dieselbe Palette für die **Gelenkkugeln** einer getrackten Hand: die Brille
 * nennt jedes Gelenk beim Namen (`wrist`, `index-finger-phalanx-proximal`, …),
 * und aus dem Namen folgt, zu welchem Finger und zu welchem Knochen es gehört.
 *
 * Ein Name, der zu keinem Finger gehört — das Handgelenk —, bekommt das Grau
 * der Handfläche. Für einen unbekannten Namen gilt dasselbe: eine Brille darf
 * mehr Gelenke melden, als hier stehen, ohne dass etwas schwarz wird.
 */
export function jointColor(name: string): number {
  const finger = FINGER_JOINT_PREFIX.findIndex((prefix) => name.startsWith(prefix));
  if (finger < 0) return PALM_COLOR;
  const bone = JOINT_BONES.indexOf(name.slice(FINGER_JOINT_PREFIX[finger]!.length));
  if (bone < 0) return PALM_COLOR;
  return boneColor(finger, bone, JOINT_BONES.length);
}

/** Wie die Brille die fünf Finger benennt, in der Reihenfolge, die überall gilt. */
const FINGER_JOINT_PREFIX: readonly string[] = [
  'thumb-',
  'index-finger-',
  'middle-finger-',
  'ring-finger-',
  'pinky-finger-',
];

/**
 * Und wie sie die Gelenke daran benennt, von der Wurzel zur Kuppe.
 *
 * Der Daumen hat eines weniger — er kennt kein `phalanx-intermediate`, die
 * Brille meldet den Namen für ihn gar nicht. Das macht nichts: seine Kugeln
 * bekommen dieselben Stufen wie die der anderen Finger, nur eine davon
 * ausgelassen, und die Reihenfolge stimmt weiter.
 */
const JOINT_BONES: readonly string[] = [
  'metacarpal',
  'phalanx-proximal',
  'phalanx-intermediate',
  'phalanx-distal',
  'tip',
];

/**
 * Eine Farbe aus Ton, Sättigung und Helligkeit — als die Zahl, die three.js
 * und `TextPlane` erwarten.
 *
 * Der übliche Weg über `THREE.Color` ginge auch, kostet hier aber den einen
 * Vorteil dieser Datei: dass eine Farbe eine Zahl ist und ohne Renderer
 * nachgerechnet werden kann.
 */
export function hslColor(hue: number, saturation: number, lightness: number): number {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = Math.min(1, Math.max(0, saturation));
  const l = Math.min(1, Math.max(0, lightness));
  if (s === 0) {
    const grey = Math.round(l * 255);
    return (grey << 16) | (grey << 8) | grey;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t: number): number => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };
  const r = Math.round(channel(h + 1 / 3) * 255);
  const g = Math.round(channel(h) * 255);
  const b = Math.round(channel(h - 1 / 3) * 255);
  return (r << 16) | (g << 8) | b;
}
