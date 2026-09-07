import { nextInSteps } from './steps';

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
 * Geflogen kommt er dabei nicht von selbst, sondern auf ein **Zucken**: die
 * Hand muss sich schneller als `pull` zum Körper hin bewegen. Die Zahl steht
 * hier, gemessen wird sie in `worlds/portal/pullGesture.ts`.
 *
 * Was hier steht, sind die Zahlen dazu und ihre Grenzen — keine Mechanik. Die
 * Mathematik liegt in `worlds/portal/grabReach.ts`, die Bedienung im Menü
 * *Einstellungen → Greifen*. Zentimeter, weil das die Einheit ist, in der ein
 * Mensch über den eigenen Körper spricht; gerechnet wird in Metern. Was kein
 * Maß ist, sondern ein Verhältnis — die **Verstärkung** des Nahgriffs —, steht
 * in Prozent und wird als „1,5-fach" gelesen.
 */

/** Wie sich ein nah gefasster Gegenstand bewegt, während die Hand ihn führt. */
export type GrabMotion = 'hand' | 'rigid';

/** Der Reihe nach, wie die Menüzeile sie durchschaltet. */
export const GRAB_MOTIONS: readonly GrabMotion[] = ['hand', 'rigid'];

export interface GrabSettings {
  /** Ferngreifen: der Gegenstand kommt geflogen. */
  remote: boolean;
  /** Der dünne Strahl zwischen Hand und Gegenstand beim Ferngreifen. */
  rope: boolean;
  /** Nahgreifen: fassen, ohne dass etwas fliegt. */
  near: boolean;
  /**
   * **Das Zugtempo**: so schnell muss die Hand zum Körper zucken, damit ein
   * gefasster Gegenstand geflogen kommt — in Zentimetern je Sekunde, wie jede
   * andere Zahl dieser Seite, angezeigt wird sie in Metern je Sekunde.
   *
   * `0` heißt „ohne Zucken": dann kommt er, sobald der Grip sitzt.
   *
   * Die Rasten heißen `PULL_STEPS`; ab Werk steht die Zahl auf _mittel_.
   */
  pull: number;
  /** Radius des Zylinders um den Spieler, in Zentimetern. */
  radius: number;
  /** Höhe des Zylinders über dem Boden, in Zentimetern. */
  height: number;
  /**
   * **Die Verstärkung des Nahgriffs**, in Prozent: um wie viel weiter der
   * gefasste Gegenstand fährt als die Hand, die ihn führt.
   *
   * `100` ist eins zu eins — der alte Zustand. Ab Werk stehen hier 150: Wer
   * einen Gegenstand anderthalb Meter vor sich führt, hat dorthin keinen Arm,
   * sondern nur den Weg, den die Hand vor dem Körper wirklich zurücklegt, und
   * der ist kürzer als der, den das Ding gehen soll. Die Verstärkung schließt
   * genau diese Lücke: eine Handbreit an der Hand sind anderthalb am
   * Dominostein.
   *
   * Nur die **Verschiebung** wächst mit. Die Drehung bleibt Grad für Grad,
   * denn ein verstärktes Handgelenk wäre wieder der lange Arm, den der
   * Nahgriff gerade nicht sein will.
   */
  scale: number;
  /**
   * `hand` hängt den Gegenstand an die **Geisterhand**: die tut eins zu eins,
   * was die echte Hand tut, und der Gegenstand dreht sich um den Punkt, an
   * dem sie ihn anfasst. `rigid` hält ihn stattdessen so starr wie eine
   * Faust — ein langer Arm, und jedes Grad am Handgelenk wird auf einen Meter
   * zum Ausschlag.
   */
  motion: GrabMotion;
  /** Die Geisterhand am Gegenstand, solange er nah gefasst werden kann. */
  ghost: boolean;
  /**
   * **Welche Fassung dieser Seite im Speicher steht** (`VERSION`).
   *
   * Keine Einstellung, sondern die Antwort auf ein Problem, das jede neue
   * Vorgabe hat: Das Menü schreibt die *ganze* Seite, sobald irgendetwas
   * darauf verstellt wird — also steht bei fast jedem auch das im Speicher,
   * was er nie angefasst hat, und eine neue Werkseinstellung käme bei ihm nie
   * an. Die Nummer sagt, gegen welche Vorgaben ein gespeicherter Stand
   * geschrieben wurde, und `migrate` zieht ältere einmalig nach.
   */
  version: number;
}

/**
 * **Die fünf Zugtempi**, wie ein Mensch über sie spricht — je 25 cm/s
 * auseinander, _mittel_ in der Mitte.
 *
 * Ab Werk standen hier einmal 8 m/s, und das war ein Schlag und kein Zucken:
 * Wer den Arm zum Körper zieht, kommt selten über anderthalb Meter je Sekunde,
 * und so blieb das Ferngreifen bei den meisten schlicht aus. Die Rasten liegen
 * deshalb um die Bewegung herum, die man wirklich macht, und die Zeile
 * schaltet sie der Reihe nach durch.
 */
export const PULL_STEPS: readonly { readonly value: number; readonly name: string }[] = [
  { value: 75, name: 'sehr langsam' },
  { value: 100, name: 'langsam' },
  { value: 125, name: 'mittel' },
  { value: 150, name: 'schnell' },
  { value: 175, name: 'sehr schnell' },
];

/** Was in der Menüzeile hinter dem Tempo steht — `null`, wenn es keine Raste ist. */
export function pullStepName(value: number): string | null {
  return PULL_STEPS.find((step) => step.value === Math.round(value))?.name ?? null;
}

/**
 * Die Fassung dieser Seite. **Hochzählen, wenn eine Vorgabe sich ändert** und
 * die Änderung auch bei denen ankommen soll, die schon einmal etwas verstellt
 * haben — was `migrate` dann tut, steht dort.
 */
const VERSION = 1;

export const DEFAULT_GRAB: GrabSettings = {
  remote: true,
  // Der Strahl liegt beim Zielen meist nur im Bild; er kommt erst, wenn
  // wirklich zugegriffen wurde — dann sagt er etwas.
  rope: true,
  near: true,
  // 1,25 m/s ist ein **Zucken** und keine Handbewegung: den Arm ruhig zum
  // Körper zu führen bleibt darunter, ein Ruck nach hinten geht darüber.
  pull: 125,
  // 1,40 m: die Armlänge und ein Schritt dazu. Ein Meter reichte für den
  // Dominostein vor den eigenen Füßen und für sonst wenig — der auf dem Tisch
  // gegenüber lag schon draußen, und damit fiel das Nahgreifen genau dort aus,
  // wo die Geisterhand das bessere Werkzeug ist.
  radius: 140,
  height: 210,
  scale: 150,
  motion: 'hand',
  ghost: true,
  version: VERSION,
};

/** Eine Zahl dieser Seite samt dem Bereich, der Sinn ergibt. */
export interface GrabField {
  key: 'radius' | 'height' | 'pull' | 'scale';
  label: string;
  sub: string;
  min: number;
  max: number;
  /**
   * Die Einheit, in der die Zahl **steht** — und in der sie auch getippt wird.
   * Wie sie *gelesen* wird, sagt `formatGrabField`: ein Zugtempo in
   * Zentimetern je Sekunde steht als Zahl da, angezeigt wird es in Metern je
   * Sekunde, weil niemand über 800 cm/s spricht.
   */
  unit: 'cm' | 'cm/s' | '%';
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
    unit: 'cm',
    steps: [60, 100, 140, 180],
  },
  {
    key: 'height',
    label: 'Nahhöhe',
    sub: 'Bis wohin der Zylinder reicht — darüber ist es nicht mehr bei dir',
    min: 50,
    max: 400,
    unit: 'cm',
    steps: [180, 210, 240, 300],
  },
  {
    key: 'scale',
    label: 'Nahverstärkung',
    sub: 'Wie viel weiter der Gegenstand fährt als deine Hand',
    // 100 ist eins zu eins; darunter wird die Führung feiner als die Hand,
    // darüber irgendwann unlenkbar — beim Dreifachen fährt ein Dominostein
    // einen halben Meter, während die Hand eine Handbreit macht.
    min: 25,
    max: 300,
    unit: '%',
    steps: [100, 125, 150, 200],
  },
  {
    key: 'pull',
    label: 'Zugtempo',
    sub: 'So schnell muss die Hand zum Körper zucken, damit es geflogen kommt',
    // 0 heißt „ohne Zucken" — dann kommt der Gegenstand, sobald zugegriffen
    // ist; darüber wird aus einem Zucken ein Schlag, den niemand macht.
    min: 0,
    max: 2000,
    unit: 'cm/s',
    // Die Zeile schaltet die fünf benannten Tempi durch. Die Null steht nicht
    // mehr darunter — sie ist eine Betriebsart und keine Geschwindigkeit, und
    // wer sie will, tippt sie unter _Werte eingeben_ ein.
    steps: PULL_STEPS.map((step) => step.value),
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
  // Was hier herauskommt, ist gegen die heutigen Vorgaben geprüft — und trägt
  // deshalb auch deren Nummer, ganz gleich, welche vorher darin stand. Erst
  // damit wird ein gespeicherter Stand nicht bei jedem Lesen aufs Neue
  // nachgezogen (`migrate`).
  next.version = VERSION;
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
  return nextInSteps(field.steps, value);
}

/**
 * Was in der Menüzeile hinter dem Namen steht.
 *
 * Zentimeter bleiben Zentimeter; ein Tempo wird in Metern je Sekunde gelesen —
 * „1,25 m/s" ist eine Zahl, die jemand mit einer Bewegung verbindet,
 * „125 cm/s" ist eine, die man erst umrechnet. Ohne Schwelle steht dort, was
 * gemeint ist, und auf einer Raste steht ihr Name dahinter: die Rasten liegen
 * 25 cm/s auseinander, und „schnell" sagt mehr als der Abstand zur vorigen
 * Zahl.
 *
 * Zwei Nachkommastellen, weil eine sie verfälschte: 125 cm/s las sich gerundet
 * als „1,3 m/s", und daneben stand als nächste Raste wieder „1,5".
 */
export function formatGrabField(field: GrabField, settings: GrabSettings): string {
  const value = Math.round(settings[field.key]);
  if (field.unit === 'cm') return `${value} cm`;
  if (field.unit === '%') {
    // „Eins zu eins" ist keine Zahl, sondern der Zustand, den sie meint — wie
    // die Null beim Zugtempo.
    if (value === 100) return 'eins zu eins';
    return `${decimal(value)}-fach`;
  }
  if (value === 0) return 'ohne Zucken';
  const metres = decimal(value);
  const name = pullStepName(value);
  return name ? `${metres} m/s · ${name}` : `${metres} m/s`;
}

/** Hundertstel als Zahl, wie ein Mensch sie schreibt: `150` → `1,5`. */
function decimal(value: number): string {
  return (value / 100).toFixed(2).replace(/0$/, '').replace('.', ',');
}

/** Wie die Betriebsart heißt, wenn ein Mensch sie liest. */
export function motionLabel(motion: GrabMotion): string {
  return motion === 'rigid' ? 'Starr wie in der Faust' : 'Wie die eigene Hand';
}

/** Die nächste Betriebsart, hinten wieder von vorn — was die Menüzeile tut. */
export function nextGrabMotion(motion: GrabMotion): GrabMotion {
  const index = GRAB_MOTIONS.indexOf(motion);
  return GRAB_MOTIONS[(index + 1) % GRAB_MOTIONS.length]!;
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

/**
 * Der **alte Werkswert** des Zugtempos: 8 m/s.
 *
 * Wer ihn nie angefasst hat, hat ihn trotzdem im Speicher stehen — das Menü
 * schreibt die ganze Seite, sobald irgendetwas darauf verstellt wird. Eine
 * neue Vorgabe käme bei ihm deshalb nie an: Der Beutel ginge auf, das
 * Ferngreifen bliebe aus, und die Einstellung sähe aus wie kaputt. Genau
 * dieser eine Wert wird beim **Lesen** deshalb auf die neue Vorgabe gezogen.
 *
 * Der Preis steht dazu: Wer 800 von Hand eintippt, bekommt beim nächsten Lesen
 * ebenfalls 125. Für ein Tempo, das schneller ist als jeder Arm, ist das der
 * bessere Tausch — und 790 oder 810 bleiben stehen.
 */
const LEGACY_PULL = 800;

/** Der **alte Werkswert** des Nahradius: ein Meter. Siehe `migrate`. */
const LEGACY_RADIUS = 100;

/**
 * Einen gespeicherten Stand auf die heutigen Vorgaben nachziehen — **einmal**,
 * und nur, wo er noch die alte Fassung trägt.
 *
 * Dieselbe Not wie beim Zugtempo: Das Menü schreibt die ganze Seite, sobald
 * irgendetwas darauf verstellt wird, also stünde bei fast jedem noch der alte
 * Meter Nahradius, und die neuen 1,40 m kämen nie an. Anders als dort geht das
 * hier aber **nicht** über den Wert selbst: 100 ist eine Raste der Zeile, und
 * wer sie absichtlich anklickt, darf sie nicht beim nächsten Lesen wieder
 * verlieren. Die Nummer entscheidet — ein Stand, der schon einmal gegen die
 * heutigen Vorgaben geschrieben wurde, wird nicht mehr angefasst.
 */
function migrate(stored: Partial<GrabSettings>): Partial<GrabSettings> {
  const version = Number.isFinite(stored.version) ? stored.version! : 0;
  if (version < 1 && stored.radius === LEGACY_RADIUS) stored.radius = DEFAULT_GRAB.radius;
  return stored;
}

export function grabSettings(): GrabSettings {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const stored = raw ? (JSON.parse(raw) as Partial<GrabSettings>) : {};
    if (stored.pull === LEGACY_PULL) stored.pull = DEFAULT_GRAB.pull;
    return clampGrab(migrate(stored));
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
