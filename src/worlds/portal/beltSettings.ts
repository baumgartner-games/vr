/**
 * Wo die beiden Hüften hängen.
 *
 * Die Zahlen standen bis eben als drei Konstanten mitten in `ToolBelt.update`,
 * und damit hing der Gürtel bei allen gleich: 26 cm zur Seite, auf halber
 * Augenhöhe, vier Zentimeter hinter der Körpermitte. Das ist für jemanden mit
 * langen Armen ein bequemer Griff und für jemanden mit kurzen eine Verrenkung
 * — und niemand konnte etwas daran ändern, weil es nirgends eine Stelle dafür
 * gab. Jetzt gibt es eine: der Gürtel-Justierer zeigt auf eine Hüfte, und die
 * andere Hand schiebt sie hin, wo sie hingehört.
 *
 * **Beide zugleich, gespiegelt.** Eingestellt wird nicht „die linke Hüfte",
 * sondern *der Abstand* — und der gilt für links wie rechts. Ein Gürtel, bei
 * dem eine Seite tiefer hängt als die andere, ist kein Gürtel, sondern ein
 * Versehen; wer die rechte Hüfte nach außen zieht, meint den Gürtel.
 *
 * Die Höhe steht als **Anteil der Augenhöhe** und nicht in Zentimetern: sie
 * soll mit dem mitwachsen, der sie trägt, und wer sich hinsetzt, hat seinen
 * Gürtel nicht plötzlich auf Brusthöhe. Seite und Tiefe sind Meter, weil ein
 * Armabstand ein Armabstand bleibt, ob man sitzt oder steht.
 *
 * Reine Rechnung, kein three.js: die Vorzeichen einer Spiegelung merkt man in
 * der Brille erst, wenn beim Griff nach links die rechte Hüfte wandert.
 */

const KEY = 'bgvr.belt';

/** Ein Gürtel, in drei Zahlen. Gilt für beide Hüften, rechts gespiegelt. */
export interface BeltOffset {
  /** Abstand von der Körpermitte zur Seite, in Metern. */
  side: number;
  /** Höhe über dem Boden, als Anteil der Augenhöhe. */
  height: number;
  /** Vor der Körpermitte (+) oder dahinter (−), in Metern. */
  forward: number;
}

/**
 * Wie der Gürtel ausgeliefert wird — dieselben drei Zahlen, die vorher fest
 * im Code standen. Vier Zentimeter *hinter* der Mitte: ein Halfter sitzt an
 * der Hüfte und nicht auf dem Bauch.
 */
export const DEFAULT_BELT: BeltOffset = { side: 0.26, height: 0.5, forward: -0.04 };

/** Grenzen, damit eine ziehende Hand den Gürtel nicht in die nächste Wand schiebt. */
export const BELT_LIMITS = {
  side: { min: 0.06, max: 0.6 },
  height: { min: 0.15, max: 0.95 },
  forward: { min: -0.45, max: 0.45 },
} as const;

/** Millimeter sind die feinste Angabe, die in der Brille noch etwas bedeutet. */
function metres(value: unknown, fallback: number, min: number, max: number): number {
  // `null` und die leere Zeichenkette sind für `Number` eine Null — für einen
  // Speicher, in dem das Feld fehlt, sind sie eine Lücke. Hier gilt die Lücke,
  // sonst hinge der Gürtel nach einem halb geschriebenen Eintrag am Boden.
  if (value === null || value === undefined || value === '') return fallback;
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.round(Math.min(max, Math.max(min, number)) * 1000) / 1000;
}

/** Was immer hereinkommt, wird ein Gürtel innerhalb der Grenzen. */
export function clampBelt(value: unknown): BeltOffset {
  const raw = (value ?? {}) as Partial<Record<keyof BeltOffset, unknown>>;
  if (typeof raw !== 'object') return { ...DEFAULT_BELT };
  return {
    side: metres(raw.side, DEFAULT_BELT.side, BELT_LIMITS.side.min, BELT_LIMITS.side.max),
    height: metres(raw.height, DEFAULT_BELT.height, BELT_LIMITS.height.min, BELT_LIMITS.height.max),
    forward: metres(
      raw.forward,
      DEFAULT_BELT.forward,
      BELT_LIMITS.forward.min,
      BELT_LIMITS.forward.max,
    ),
  };
}

/** Eine Hand hat den Gürtel um so viel verschoben — in Körperrichtungen. */
export interface BeltDrag {
  /** Nach rechts aus Sicht des Spielers, in Metern. */
  right: number;
  /** Nach oben, in Metern. */
  up: number;
  /** Nach vorn, in Metern. */
  forward: number;
}

/**
 * Der Gürtel, nachdem eine Hand an *einer* Hüfte gezogen hat.
 *
 * Welche Hüfte, entscheidet das Vorzeichen: die rechte nach rechts zu ziehen
 * macht den Gürtel weiter, die linke nach rechts zu ziehen macht ihn enger.
 * Beide Male ist das dieselbe Zahl — deshalb wandert die andere Seite mit.
 *
 * Die Höhe kommt in Metern herein und wird zum Anteil, weil sie so gespeichert
 * wird; ohne die Augenhöhe wäre ein Zentimeter am Boden dasselbe wie einer im
 * Gesicht.
 */
export function dragBelt(
  base: BeltOffset,
  drag: BeltDrag,
  side: 'left' | 'right',
  headHeight: number,
): BeltOffset {
  const current = clampBelt(base);
  // Eine Augenhöhe von null gäbe es nur ohne Kopf; dann bleibt die Höhe, wie
  // sie ist, statt ins Unendliche zu springen.
  const height = Number.isFinite(headHeight) && headHeight > 0.2 ? headHeight : 0;
  return clampBelt({
    side: current.side + (side === 'right' ? drag.right : -drag.right),
    height: height ? current.height + drag.up / height : current.height,
    forward: current.forward + drag.forward,
  });
}

/** Ein Punkt im Rig, relativ zum Kopf. */
export interface BeltPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Wo eine Hüfte steht: relativ zum Kopf, im Koordinatensystem des Rigs.
 *
 * `bodyYaw` ist die Richtung, in die der Körper schaut — nicht der Kopf. Der
 * Gürtel dreht sich mit den Schultern und nicht mit jedem Blick zur Seite,
 * sonst läge er nach einem Schulterblick hinter dem Rücken.
 *
 * Das `y` ist die volle Höhe über dem Boden und nicht die Differenz zum Kopf:
 * der Gürtel hängt am Körper, und der steht auf dem Boden.
 */
export function beltSlotPoint(
  offset: BeltOffset,
  side: 'left' | 'right',
  headHeight: number,
  bodyYaw: number,
): BeltPoint {
  const belt = clampBelt(offset);
  const sin = Math.sin(bodyYaw);
  const cos = Math.cos(bodyYaw);
  const lateral = side === 'right' ? belt.side : -belt.side;
  // Rechts ist (cos, −sin), vorn ist (−sin, −cos): ein Körper mit Gierwinkel
  // null schaut wie jede Kamera in three.js nach −Z.
  return {
    x: cos * lateral - sin * belt.forward,
    y: headHeight * belt.height,
    z: -sin * lateral - cos * belt.forward,
  };
}

/** Was in der Brille an einer Hüfte steht: „26 cm · 0,50 · 4 cm hinten". */
export function beltLabel(offset: BeltOffset): string {
  const belt = clampBelt(offset);
  const depth = Math.abs(Math.round(belt.forward * 100));
  const where = belt.forward >= 0 ? 'vorn' : 'hinten';
  return `${Math.round(belt.side * 100)} cm · ${belt.height.toFixed(2)} · ${depth} cm ${where}`;
}

/** Was der Spieler eingestellt hat, oder die Auslieferung. */
export function beltOffset(): BeltOffset {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (!raw) return { ...DEFAULT_BELT };
    return clampBelt(JSON.parse(raw));
  } catch {
    // Kaputtes JSON von gestern ist kein Grund, heute ohne Gürtel dazustehen.
    return { ...DEFAULT_BELT };
  }
}

/** Speichert und gibt zurück, was wirklich behalten wurde. */
export function saveBelt(offset: BeltOffset): BeltOffset {
  const belt = clampBelt(offset);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(belt));
  } catch {
    /* privater Modus; daran ist nichts zu machen */
  }
  return belt;
}

/** Zurück auf die ausgelieferten Zahlen. */
export function clearBelt(): BeltOffset {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* siehe oben */
  }
  return { ...DEFAULT_BELT };
}
