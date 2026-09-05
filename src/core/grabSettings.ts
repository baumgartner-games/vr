/**
 * Wie weit eine Hand reicht, und was am Ende der Reichweite passiert.
 *
 * Greifen hat **drei Reichweiten**, und sie unterscheiden sich nicht darin,
 * wie man greift — gezielt wird immer, und immer mit demselben Grip —,
 * sondern darin, was danach passiert:
 *
 * - **Anfassen**: die Hand steckt in der Greifbox. Nichts fliegt, nichts
 *   rastet ein, die Hand ist einfach dran. Die Hand selbst leuchtet dabei.
 * - **Nahgreifen**: der Gegenstand steht im Zylinder um den Spieler, aber
 *   außer Reichweite der Hand. Er kommt **nicht** geflogen, sondern bleibt
 *   liegen und folgt der Hand von dort — so stellt man einen Dominostein auf,
 *   ohne sich zu bücken. Am Gegenstand steht dabei eine Geisterhand.
 * - **Ferngreifen**: alles bis 9 m. Hier kommt der Gegenstand geflogen.
 *
 * Was hier steht, sind die Zahlen dazu und ihre Grenzen — keine Mechanik. Die
 * Mathematik liegt in `worlds/portal/grabReach.ts`, die Bedienung im Menü
 * *Einstellungen → Greifen*. Zentimeter, weil das die Einheit ist, in der ein
 * Mensch über den eigenen Körper spricht; gerechnet wird in Metern.
 */

/** Wie sich ein nah gefasster Gegenstand bewegt, während die Hand ihn führt. */
export type GrabMotion = 'rigid' | 'spin';

export const GRAB_MOTIONS: readonly GrabMotion[] = ['rigid', 'spin'];

export interface GrabSettings {
  /** Ferngreifen: der Gegenstand kommt geflogen. */
  remote: boolean;
  /** Der dünne Strahl zwischen Hand und Gegenstand beim Ferngreifen. */
  rope: boolean;
  /** Nahgreifen: fassen, ohne dass etwas fliegt. */
  near: boolean;
  /** Radius des Zylinders um den Spieler, in Zentimetern. */
  radius: number;
  /** Höhe des Zylinders über dem Boden, in Zentimetern. */
  height: number;
  /**
   * `rigid` hält den Gegenstand so starr wie eine Faust — ein langer Arm, und
   * jedes Grad am Handgelenk wird auf einen Meter zum Ausschlag. `spin` dreht
   * ihn stattdessen um seine eigene Mitte und verschiebt eins zu eins.
   */
  motion: GrabMotion;
  /** Die Geisterhand am Gegenstand, solange er nah gefasst werden kann. */
  ghost: boolean;
}

export const DEFAULT_GRAB: GrabSettings = {
  remote: true,
  // Der Strahl liegt beim Zielen meist nur im Bild; er kommt erst, wenn
  // wirklich zugegriffen wurde — dann sagt er etwas.
  rope: true,
  near: true,
  radius: 100,
  height: 210,
  motion: 'rigid',
  ghost: true,
};

/** Eine Zahl dieser Seite samt dem Bereich, der Sinn ergibt. */
export interface GrabField {
  key: 'radius' | 'height';
  label: string;
  sub: string;
  min: number;
  max: number;
  /** Was die Menüzeile durchklickt, in derselben Einheit. */
  steps: readonly number[];
}

export const GRAB_FIELDS: readonly GrabField[] = [
  {
    key: 'radius',
    label: 'Nahradius',
    sub: 'Wie weit um dich herum du fassen kannst, ohne dich zu bücken',
    // 0 schaltet das Nahgreifen praktisch ab, ohne dass man den Schalter
    // sucht; darüber hinaus wird aus „um mich herum" ein halber Raum.
    min: 0,
    max: 250,
    steps: [60, 100, 140, 180],
  },
  {
    key: 'height',
    label: 'Nahhöhe',
    sub: 'Bis wohin der Zylinder reicht — darüber ist es nicht mehr bei dir',
    min: 50,
    max: 400,
    steps: [180, 210, 240, 300],
  },
];

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampGrab(settings: Partial<GrabSettings> | undefined): GrabSettings {
  const next: GrabSettings = { ...DEFAULT_GRAB, ...settings };
  for (const field of GRAB_FIELDS) {
    const value = next[field.key];
    next[field.key] = Number.isFinite(value)
      ? Math.round(Math.min(field.max, Math.max(field.min, value)))
      : DEFAULT_GRAB[field.key];
  }
  if (!GRAB_MOTIONS.includes(next.motion)) next.motion = DEFAULT_GRAB.motion;
  for (const key of ['remote', 'rope', 'near', 'ghost'] as const) {
    if (typeof next[key] !== 'boolean') next[key] = DEFAULT_GRAB[key];
  }
  return next;
}

/**
 * Die nächste Raste oberhalb des aktuellen Werts, oben wieder von vorn.
 *
 * Wer eine Zahl eintippt, landet selten auf einer Raste — und „die nächste
 * nach oben" ist, was jemand erwartet, der die Zeile drückt, nicht „die
 * Raste hinter der zufällig nächstgelegenen".
 */
export function nextGrabStep(field: GrabField, value: number): number {
  return field.steps.find((step) => step > value + 1e-9) ?? field.steps[0]!;
}

/** Was in der Menüzeile hinter dem Namen steht. */
export function formatGrabField(field: GrabField, settings: GrabSettings): string {
  return `${Math.round(settings[field.key])} cm`;
}

/** Wie die Betriebsart heißt, wenn ein Mensch sie liest. */
export function motionLabel(motion: GrabMotion): string {
  return motion === 'spin' ? 'Drehung um Objektmitte' : 'Starr wie in der Faust';
}

// --- der Speicher ----------------------------------------------------------

const KEY = 'bgvr.grab';

type Listener = () => void;

const listeners = new Set<Listener>();

/** Wird nach jeder Änderung gerufen, damit die Welt sich nachzieht. */
export function onGrabChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function grabSettings(): GrabSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return clampGrab(raw ? (JSON.parse(raw) as Partial<GrabSettings>) : {});
  } catch {
    // Privater Modus, kein Speicher, kaputtes JSON — nichts davon ist einen
    // Absturz wert.
    return clampGrab({});
  }
}

/** Ändert, was übergeben wird, und lässt den Rest stehen. */
export function saveGrabSettings(settings: Partial<GrabSettings>): GrabSettings {
  const next = clampGrab({ ...grabSettings(), ...settings });
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(next));
  } catch {
    /* siehe oben */
  }
  for (const listener of listeners) listener();
  return next;
}

export function clearGrabSettings(): GrabSettings {
  return saveGrabSettings({ ...DEFAULT_GRAB });
}
