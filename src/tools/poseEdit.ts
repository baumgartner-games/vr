/**
 * Was der Regler auf der Werkzeugseite verschiebt — die Zahlen dazu, ohne
 * three.js und ohne DOM.
 *
 * Bearbeitet werden **sechs Achsen**, und zwar immer nur eine: drei
 * Zentimeter-Versätze und drei Winkel. Das ist keine Vereinfachung, sondern die
 * Form, in der beide Größen ohnehin gespeichert sind — eine `PoseReadout`
 * (`tools/toolPose.ts`) und die ersten sechs Felder einer `HandPose`
 * (`core/handPose.ts`) sind dieselben sechs Zahlen. Ein Regler, der auf beide
 * passt, muss deshalb nichts umrechnen.
 *
 * Und **zwei Ziele**, denn „die Hand liegt falsch am Werkzeug" hat zwei
 * Antworten, dieselben zwei wie die beiden Justierstände im Eingaberaum:
 *
 * - `hold` — *In der Hand*: das **Werkzeug** wandert im Griff, die Hand steht.
 *   Landet in `poseStore` und ist das, was `holdPosition`/`holdRotation` sagen.
 * - `grip` — *Am Griff*: die **Hand** wandert am Werkzeug, das Werkzeug steht.
 *   Landet in `handPoseStore` als Griffhaltung dieses Werkzeugs.
 *
 * Beide Wege enden in denselben Speichern wie die Brille, also auch im
 * Konfig-Code — die Seite ist eine zweite Bedienung derselben Einstellung und
 * kein eigener kleiner Zustand daneben.
 *
 * Frei von three.js wie die übrige geprüfte Mathematik: Vorzeichen und Grenzen
 * fallen hier auf und nicht erst im Bild.
 */

import type { PoseReadout } from '../worlds/portal/tools/toolPose';

/** Die eine Achse, die der Regler gerade bedient. */
export type EditAxis = 'x' | 'y' | 'z' | 'yaw' | 'pitch' | 'roll';

/** Wohin eine Änderung geschrieben wird. */
export type EditTarget = 'hold' | 'grip';

export interface AxisSpec {
  key: EditAxis;
  /** Was auf dem Knopf steht — kurz, es sind sechs davon nebeneinander. */
  label: string;
  /** Wohin es geht, in einem Wort. Der Knopf ist zu klein dafür, die Zeile nicht. */
  hint: string;
  unit: 'cm' | '°';
  min: number;
  max: number;
  step: number;
}

/**
 * Die sechs Achsen in der Reihenfolge, in der die Knöpfe stehen: erst wohin,
 * dann wie herum.
 *
 * Die Grenzen sind nicht frei gewählt. ±30 cm ist genau das, was ein Kurzcode
 * tragen kann (`POSE_LIMIT` in `shortCode.ts`) — ein Regler, der weiter geht
 * als der Code, stellt etwas ein, das man nicht weitergeben kann. Und die
 * Schrittweiten sind die Raster, auf denen gespeichert wird: ein Zehntel
 * Zentimeter, ein ganzes Grad.
 *
 * Zu `Z`: im Griffraum zeigt **-Z nach vorn**, aus der Faust heraus — die
 * Finger sitzen bei z = -0,046 (`core/HandVisuals.ts`). Ein positives Z
 * schiebt also **nach hinten**, zum Handgelenk. Das Wertefeld im
 * Handgelenk-Menü schreibt an derselben Zahl „Z (vor)"; hier steht, was
 * wirklich passiert, denn ein Regler, den man ansieht, während man ihn zieht,
 * verrät eine falsche Beschriftung sofort.
 */
export const EDIT_AXES: readonly AxisSpec[] = [
  { key: 'x', label: 'X', hint: 'nach rechts', unit: 'cm', min: -30, max: 30, step: 0.1 },
  { key: 'y', label: 'Y', hint: 'nach oben', unit: 'cm', min: -30, max: 30, step: 0.1 },
  { key: 'z', label: 'Z', hint: 'nach hinten', unit: 'cm', min: -30, max: 30, step: 0.1 },
  { key: 'yaw', label: 'Yaw', hint: 'drehen', unit: '°', min: -180, max: 180, step: 1 },
  { key: 'pitch', label: 'Pitch', hint: 'nicken', unit: '°', min: -180, max: 180, step: 1 },
  { key: 'roll', label: 'Roll', hint: 'kippen', unit: '°', min: -180, max: 180, step: 1 },
];

/** Die beiden Ziele, mit der Ansicht, in der man sie überhaupt sieht. */
export const EDIT_TARGETS: readonly {
  key: EditTarget;
  label: string;
  hint: string;
  /** Die Boxhand-Ansicht, in der diese Größe aufrecht steht. */
  view: 'grip' | 'tool';
}[] = [
  {
    key: 'hold',
    label: 'In der Hand',
    hint: 'das Werkzeug wandert im Griff, die Hand steht still',
    view: 'grip',
  },
  {
    key: 'grip',
    label: 'Am Griff',
    hint: 'die Hand wandert am Werkzeug, das Werkzeug steht still',
    view: 'tool',
  },
];

export function axisSpec(axis: EditAxis): AxisSpec {
  return EDIT_AXES.find((spec) => spec.key === axis) ?? EDIT_AXES[0]!;
}

/** Ob das ein Ziel ist, das es gibt — der Knopf dazu steht im HTML. */
export function isEditTarget(value: string): value is EditTarget {
  return EDIT_TARGETS.some((entry) => entry.key === value);
}

export function readAxis(pose: PoseReadout, axis: EditAxis): number {
  return pose[axis];
}

/** Dieselbe Pose mit einer geänderten Achse — nie die, die hereinkam. */
export function withAxis(pose: PoseReadout, axis: EditAxis, value: number): PoseReadout {
  return { ...pose, [axis]: clampAxis(axis, value) };
}

/**
 * Ein Wert, wie er gespeichert wird: in die Grenzen geklemmt und auf das
 * Raster gerundet.
 *
 * Das Runden ist nicht Kosmetik. Ein Regler liefert 0,30000000000000004, der
 * Speicher schreibt es, der Konfig-Code rundet es beim Packen doch auf 0,3 —
 * und dann zeigt die Seite eine andere Zahl an, als der Code trägt. Also hier
 * einmal, an der Stelle, an der ein Wert entsteht.
 */
export function clampAxis(axis: EditAxis, value: number): number {
  const spec = axisSpec(axis);
  // Nur `NaN` wird zur Null: ein Unendlich ist keine kaputte Zahl, sondern
  // schlicht sehr weit draußen, und dort steht die Grenze.
  if (Number.isNaN(value)) return 0;
  const held = Math.min(spec.max, Math.max(spec.min, value));
  const digits = spec.step < 1 ? 1 : 0;
  // `+ 0` macht aus einer gerundeten -0 wieder eine 0: auf einer Anzeige voller
  // kleiner Zahlen liest sich „-0" wie ein Fehler.
  return Number((Math.round(held / spec.step) * spec.step).toFixed(digits)) + 0;
}

/** Eine Raste weiter, so oft wie gesagt. Die Knöpfe neben dem Regler. */
export function nudgeAxis(axis: EditAxis, value: number, steps: number): number {
  const spec = axisSpec(axis);
  return clampAxis(axis, clampAxis(axis, value) + steps * spec.step);
}

/** Ein Wert mit seiner Einheit: `-1.2 cm`, `45°`. */
export function formatAxis(axis: EditAxis, value: number): string {
  const spec = axisSpec(axis);
  const rounded = clampAxis(axis, value);
  return spec.unit === '°' ? `${rounded}°` : `${rounded} cm`;
}

/** Alle sechs in einer Zeile, für die kleine Schrift unter dem Regler. */
export function formatAxes(pose: PoseReadout): string {
  return EDIT_AXES.map((spec) => `${spec.label} ${formatAxis(spec.key, pose[spec.key])}`).join(
    ' · ',
  );
}

/** Ob zwei Posen auf dem gespeicherten Raster dieselben sind. */
export function sameAxes(a: PoseReadout, b: PoseReadout): boolean {
  return EDIT_AXES.every(
    (spec) => clampAxis(spec.key, a[spec.key]) === clampAxis(spec.key, b[spec.key]),
  );
}
