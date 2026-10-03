import { START_POINTS, fullOutline, type PovPoint } from './povCalibration';

/**
 * **Was man in der Quest 3 durch den immersiven Helm sieht** — gemessen mit
 * dem Kalibrier-Helm (`core/viewCalibration.ts`) im Oktober 2026. Reine
 * Zahlen, kein three.js.
 *
 * Die Messung kam zeilenweise: je Höhe in Grad, von wo bis wo man links und
 * rechts noch etwas sieht — _„30, Rand oben · 20, -30 bis 30 · 10, -35 bis
 * 35 · 0, -40 bis 40 · -10, -40 bis 40 · -20, -40 bis 40 · -30, -35 bis 35 ·
 * -40, -30 bis 30 · -45, -20 bis 20"_. Dazu der **sichere Bereich**, rund 10°
 * nach innen: _„10, -30 bis 30 runter bis -35, -20 bis 20"_.
 *
 * Alle Winkel stehen hier **im Raum der Kamera**, so wie sie am Gradnetz
 * abgelesen wurden: 0° ist geradeaus vom Kopf. Gefühlt liegt die Mitte aber
 * tiefer — _„Ich habe auch das Gefühl, dass die null Höhe bei -10° liegt"_ —,
 * der natürliche Blick geht etwas nach unten. Das steht in `GAZE_PITCH`: Das
 * Gradnetz wird darum gedreht, damit seine Null dort liegt, und die Höhen der
 * Bereiche heißen in seinen Zahlen um 10 mehr (`gazeElevation`). Wo die
 * Bereiche **im Bild** liegen, ändert das nicht — sie sind gemessen.
 */

/** Eine Zeile der Messung: auf dieser Höhe reicht der Blick so weit zur Seite. */
export interface ViewRow {
  /** Höhe in Grad, im Raum der Kamera (oben positiv). */
  readonly elevation: number;
  /** Wie weit links und rechts, in Grad von der Mitte. */
  readonly half: number;
}

/** Wo die gefühlte Null liegt, in Grad im Raum der Kamera (nach unten negativ). */
export const GAZE_PITCH = -10;

/**
 * **Oben wie unten** — gewünscht: _„ab der 0° unteren Seite sollten wir so
 * auf die obere Ebene spiegeln"_. Gemessen ist die untere Hälfte, in den
 * Zahlen um die gefühlte Null (`GAZE_PITCH`); die obere ist ihr Spiegelbild,
 * und alles steht danach im Raum der Kamera. Die gemessene obere Hälfte war
 * bis auf den Rand ohnehin dieselbe (20 ±30, 10 ±35, 0 ±40 in der Kamera);
 * der Rand oben rückt von 30° auf 25°.
 */
export function mirrored(below: readonly ViewRow[]): ViewRow[] {
  const above = below
    .filter((row) => row.elevation < 0)
    .reverse()
    .map((row) => ({ elevation: -row.elevation, half: row.half }));
  return [...above, ...below].map((row) => ({
    elevation: row.elevation + GAZE_PITCH,
    half: row.half,
  }));
}

/** Ein Umriss als `[azimuth, elevation]` in Grad, im Raum der Kamera. */
export type Outline = readonly (readonly [number, number])[];

/**
 * **Der Rand, wie in der Brille eingestellt** — mit _VR-POV kalibrieren_
 * (`core/PovCalibrator.ts`) am 3. Oktober 2026, als Code
 * `P180-4250-D260-Z261-F201-D1K2-7122-B0J2-D03K` (gewünscht: _„Bitte
 * speichern als default […] für vr und als quest3 pov code für den Rand"_).
 * Das letzte Zeichen ist dabei vertippt — die Prüfsumme verlangt `J`, und
 * jede andere Lesart mit einem einzigen falschen Zeichen verschöbe einen
 * Punkt um höchstens einen halben Grad oder auf 90°. Richtig heißt er
 * `QUEST_VIEW_CODE`.
 *
 * Die Punkte des Viertels rechts oben, in Grad um die gefühlte Null, von oben
 * Mitte nach rechts außen; gespiegelt an beiden Achsen (`povCalibration.fullOutline`).
 */
export const QUEST_VIEW_POINTS: readonly PovPoint[] = START_POINTS;

/** Derselbe Rand als Code (`povCalibration.encodePov`). */
export const QUEST_VIEW_CODE = 'P180-4250-D260-Z261-F201-D1K2-7122-B0J2-D03J';

/** Punkte um die gefühlte Null als Umriss im Raum der Kamera. */
export function cameraOutline(points: readonly PovPoint[]): [number, number][] {
  return fullOutline(points).map(([az, el]): [number, number] => [az, el + GAZE_PITCH]);
}

/**
 * **Das Sichtfeld** — der eingestellte Rand, ganz und im Raum der Kamera.
 * Davor stand hier die Messung aus Zeilen (oben und unten ±40, ±35, ±30,
 * ±20 um die gefühlte Null).
 */
export const QUEST_VIEW: Outline = cameraOutline(QUEST_VIEW_POINTS);

/**
 * **Der sichere Bereich** — wo etwas stehen soll, das man immer sehen muss.
 * Gesagt waren oben und unten; dazwischen folgt er dem Sichtfeld mit 10°
 * Abstand. Ebenso gespiegelt.
 */
export const QUEST_SAFE: readonly ViewRow[] = mirrored([
  { elevation: 0, half: 30 },
  { elevation: -10, half: 30 },
  { elevation: -20, half: 25 },
  { elevation: -25, half: 20 },
]);

/** Wie breit der rote Randbereich innen am Sichtfeld ist, in Grad. */
export const EDGE_BAND = 5;

/** Eine Höhe im Raum der Kamera in den Zahlen des gedrehten Gradnetzes. */
export function gazeElevation(elevation: number): number {
  return elevation - GAZE_PITCH;
}

/** Die Umrisslinie aus Zeilen als `[azimuth, elevation]`, im Uhrzeigersinn ab oben links. */
export function outline(rows: readonly ViewRow[]): [number, number][] {
  const right = rows.map((row): [number, number] => [row.half, row.elevation]);
  const left = [...rows].reverse().map((row): [number, number] => [-row.half, row.elevation]);
  return [...right, ...left];
}

/** Ob eine Richtung im Umriss liegt (gerade Kanten in Grad). */
export function inside(shape: Outline, azimuth: number, elevation: number): boolean {
  let hit = false;
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const [ai, ei] = shape[i]!;
    const [aj, ej] = shape[j]!;
    if (ei > elevation !== ej > elevation) {
      const at = ai + ((elevation - ei) * (aj - ai)) / (ej - ei);
      if (azimuth < at) hit = !hit;
    }
  }
  return hit;
}

/** Der sichere Bereich als Umriss (`QUEST_SAFE`). */
export const QUEST_SAFE_OUTLINE: Outline = outline(QUEST_SAFE);

/**
 * **Das Bild am Schirm für dieses Sichtfeld** (`App.applyVrView`): die
 * Grenzen auf der Bildebene einen Meter vor dem Auge (als Tangens, links und
 * unten negativ), das Seitenverhältnis des Kastens und der Umriss in Prozent
 * des Kastens für `clip-path` — damit am Schirm genau die Form zu sehen ist,
 * die man in der Brille sieht.
 */
export interface ViewFrustum {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly aspect: number;
  readonly clipPath: string;
}

const DEG = Math.PI / 180;

export function viewFrustum(shape: Outline = QUEST_VIEW): ViewFrustum {
  // Dicht abgetastet: Eine gerade Kante im Winkel ist auf der Bildebene krumm.
  const points: [number, number][] = [];
  const ring = shape;
  for (let i = 0; i < ring.length; i++) {
    const [a0, e0] = ring[i]!;
    const [a1, e1] = ring[(i + 1) % ring.length]!;
    for (let s = 0; s < 8; s++) {
      const t = s / 8;
      const az = (a0 + (a1 - a0) * t) * DEG;
      const el = (e0 + (e1 - e0) * t) * DEG;
      points.push([Math.tan(az), Math.tan(el) / Math.cos(az)]);
    }
  }
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const left = Math.min(...xs);
  const right = Math.max(...xs);
  const top = Math.max(...ys);
  const bottom = Math.min(...ys);
  const pct = (value: number): string => `${(value * 100).toFixed(2)}%`;
  const clipPath = `polygon(${points
    .map(([x, y]) => `${pct((x - left) / (right - left))} ${pct((top - y) / (top - bottom))}`)
    .join(', ')})`;
  return { left, right, top, bottom, aspect: (right - left) / (top - bottom), clipPath };
}
