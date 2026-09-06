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
 * Und sie gelten **immer im selben Raum: dem der echten Hand**
 * (`handFrame.ts`) — Nullpunkt der Griffpunkt, -Z die Blickrichtung der Hand,
 * Y nach oben aus der Faust. Das ist der einzige Rahmen, den man beim
 * Justieren wirklich vor sich hat: die eigene Hand hält ein Gerät und zeigt
 * irgendwohin, und „ein Stück nach rechts" heißt rechts *von ihr aus* — beim
 * Pinsel wie bei der Pistole, in beiden Ansichten. Vorher hing der Rahmen an
 * dem, was man gerade verstellte (Werkzeugraum hier, Griffraum dort), und
 * dieselbe Achse zog je nach Ansicht und Werkzeug in eine andere Richtung.
 *
 * Und **zwei Ziele**, denn dieselbe Lage kann auf zwei Arten wahr werden — es
 * sind die Antworten der beiden Justierstände, und beide sehen auf dem Schirm
 * gleich aus:
 *
 * - `hold` — *Hand in echt*: die eigene Hand steht, das **Werkzeug** wandert
 *   darin. Gespeichert wird seine **Lage im Griff** (`poseStore`, also
 *   `holdPosition`/`holdRotation`). Was sich ändert, ist, wie das Ding in der
 *   Faust liegt und wohin es damit zeigt.
 * - `grip` — *Hand in VR*: das Werkzeug steht, die **gezeichnete Hand** wandert
 *   daran. Gespeichert wird ihre **Griffhaltung** (`handPoseStore`). Die Lage
 *   des Werkzeugs im Griff bleibt — was sich ändert, ist, wie die Faust den
 *   Griff umfasst.
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
 * Zu `Z`: **-Z ist die Blickrichtung der echten Hand**, also der weiße
 * Zeigestrahl. Ein positives Z schiebt deshalb **nach hinten**, zum
 * Handgelenk. Das Wertefeld im Handgelenk-Menü schreibt an derselben Zahl
 * „Z (vor)"; hier steht, was wirklich passiert, denn ein Regler, den man
 * ansieht, während man ihn zieht, verrät eine falsche Beschriftung sofort.
 */
export const EDIT_AXES: readonly AxisSpec[] = [
  {
    key: 'x',
    label: 'X',
    hint: 'nach rechts (echte Hand)',
    unit: 'cm',
    min: -30,
    max: 30,
    step: 0.1,
  },
  {
    key: 'y',
    label: 'Y',
    hint: 'nach oben (echte Hand)',
    unit: 'cm',
    min: -30,
    max: 30,
    step: 0.1,
  },
  {
    key: 'z',
    label: 'Z',
    hint: 'nach hinten, gegen den Strahl',
    unit: 'cm',
    min: -30,
    max: 30,
    step: 0.1,
  },
  // Und wohin die drei Drehungen greifen, steht dabei: Pitch um **X** (rot),
  // Yaw um **Y** (grün), Roll um **Z** (blau) — dieselben Achsen, die im
  // Bearbeiten-Modus als Kreuz in der Hand stehen. Ohne das rät man bei jedem
  // Regler neu, welcher der drei gerade der richtige ist.
  { key: 'yaw', label: 'Yaw', hint: 'drehen um Y (grün)', unit: '°', min: -180, max: 180, step: 1 },
  {
    key: 'pitch',
    label: 'Pitch',
    hint: 'nicken um X (rot)',
    unit: '°',
    min: -180,
    max: 180,
    step: 1,
  },
  {
    key: 'roll',
    label: 'Roll',
    hint: 'kippen um Z (blau) — die Blickrichtung',
    unit: '°',
    min: -180,
    max: 180,
    step: 1,
  },
];

/**
 * Die beiden Ziele — und sie sind keine eigene Wahl mehr, sondern **die
 * Ansicht**: was man ansieht, ist das, was man verstellt.
 *
 * - In **Hand in VR** steht das Werkzeug, und die gezeichnete Hand wandert
 *   daran; geschrieben wird die Griffhaltung der Hand.
 * - In **Hand in echt** steht die Hand — sie ist die eigene, an ihr gibt es
 *   nichts einzustellen —, und das **Werkzeug** wandert darin; geschrieben
 *   wird die Lage des Werkzeugs im Griff.
 *
 * Der Rahmen, in dem geschoben und gedreht wird, ist dabei in beiden derselbe:
 * die echte Hand. Was wechselt, ist nur, was sich darin bewegt.
 *
 * Vorher war das ein zweiter Umschalter unter dem Regler, mit eigenen Namen
 * („In der Hand", „Am Griff"), und man musste zwei Schalter im Kopf
 * zusammenhalten, die dasselbe meinten.
 */
export const EDIT_TARGETS: readonly {
  key: EditTarget;
  label: string;
  hint: string;
}[] = [
  {
    key: 'hold',
    label: 'Hand in echt',
    hint: 'der Regler bewegt das Werkzeug in der echten Hand — gespeichert als seine Lage im Griff',
  },
  {
    key: 'grip',
    label: 'Hand in VR',
    hint: 'der Regler bewegt die Hand im Rahmen der echten — gespeichert als ihre Griffhaltung',
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

/**
 * Alle sechs Achsen auf einmal geklemmt — eine Pose, wie sie gespeichert wird.
 *
 * Für alles, was eine Handlage nicht Zahl für Zahl zieht, sondern in einem
 * Stück ausrechnet (die Knöpfe *Auf den Griff* und *In Zielrichtung*,
 * `alignHand.ts`): dieselben
 * Grenzen und dasselbe Raster wie am Regler, damit es keinen zweiten Weg in den
 * Speicher gibt, auf dem andere Zahlen gelten.
 */
export function clampPose(pose: PoseReadout): PoseReadout {
  return {
    x: clampAxis('x', pose.x),
    y: clampAxis('y', pose.y),
    z: clampAxis('z', pose.z),
    yaw: clampAxis('yaw', pose.yaw),
    pitch: clampAxis('pitch', pose.pitch),
    roll: clampAxis('roll', pose.roll),
  };
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
