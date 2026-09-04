/**
 * Wie sich der Supermanhandschuh fliegt.
 *
 * Der Handschuh kam mit einer einzigen Zahl auf die Welt — 14 m/s pro Meter,
 * den die Hand aus der Totzone lehnt — und die war für alle drei Achsen
 * dieselbe. Das ist genau so lange in Ordnung, wie niemand fliegt: bei einer
 * bequemen Handbewegung von 25 cm kamen dabei keine drei Meter pro Sekunde
 * heraus, und die Höchstgeschwindigkeit hätte einen ausgestreckten Arm von
 * fast einem Meter gebraucht. Von innen fühlt sich das nicht nach Superman an,
 * sondern nach Waten.
 *
 * Also: **volle Lehne ist volle Fahrt**, und was „volle Fahrt“ heißt, sagt für
 * jede Richtung eine eigene Zahl. Vorwärts darf schnell sein, rückwärts
 * gemächlich, Steigen anders als Sinken — das sind vier verschiedene Wünsche
 * und waren vorher eine Zahl.
 *
 * Dazu die zweite Frage, die sich in der Brille sofort stellt: **wer lenkt
 * welche Achse?** Vor/zurück, hoch/runter und links/rechts können je an der
 * Hand hängen, am Kopf, an beidem oder an nichts. Wer im Sessel sitzt und den
 * Arm nicht heben will, hängt das Steigen an den Blick; wer den Kopf zum
 * Umsehen braucht, nimmt ihn aus dem Kurvenflug heraus. Beides ist richtig,
 * und beides ist eine Zeile im Menü.
 *
 * Reine Daten und Beschriftungen, kein three.js. Was daraus an Geschwindigkeit
 * wird, steht in `supermanFlight.ts` (mit Test); wie sich das anfühlt, in
 * `SupermanGloveTool`.
 */

/** Wer eine Achse bewegt: die Hand, der Kopf, beide zusammen, oder niemand. */
export type SupermanSource = 'hand' | 'kopf' | 'beide' | 'aus';

export const SUPERMAN_SOURCES: readonly SupermanSource[] = ['hand', 'kopf', 'beide', 'aus'];

export const SUPERMAN_SOURCE_LABELS: Record<SupermanSource, string> = {
  hand: 'Hand',
  kopf: 'Kopf',
  beide: 'Hand + Kopf',
  aus: 'Aus',
};

export interface SupermanSettings {
  /** Höchstgeschwindigkeit nach vorn, in m/s. */
  forward: number;
  /** Höchstgeschwindigkeit rückwärts. */
  back: number;
  /** Steigen. */
  up: number;
  /** Sinken. */
  down: number;
  /** Seitwärts — nur wenn die Hand schiebt statt zu drehen. */
  side: number;
  /** Drehrate in Grad pro Sekunde. */
  turn: number;
  /** Wie weit die Hand aus der Mitte darf, ohne dass etwas passiert, in cm. */
  deadzone: number;
  /** Vor und zurück. */
  drive: SupermanSource;
  /** Hoch und runter. */
  lift: SupermanSource;
  /** Links und rechts. */
  yaw: SupermanSource;
  /**
   * Die seitliche Lehne der Hand schiebt quer, statt zu drehen. Der Kopf
   * dreht dann weiter — sonst käme man nie um eine Ecke.
   */
  strafe: boolean;
}

export const DEFAULT_SUPERMAN: SupermanSettings = {
  forward: 9,
  back: 5,
  up: 6,
  down: 6,
  side: 5,
  turn: 70,
  deadzone: 6,
  drive: 'hand',
  lift: 'hand',
  // Wie bisher: die Hand legt die Kurve an, der Blick zieht sie mit.
  yaw: 'beide',
  strafe: false,
};

/** Eine Zahl, die im Menü verstellt wird, samt dem Bereich, der Sinn ergibt. */
export interface SupermanField {
  key: 'forward' | 'back' | 'up' | 'down' | 'side' | 'turn' | 'deadzone';
  label: string;
  unit: string;
  min: number;
  max: number;
  decimals: number;
  /** Was die Zahl tut, in einer Zeile. */
  sub: string;
  /** Die Rasten, durch die ein Druck auf die Zeile weiterschaltet. */
  steps: readonly number[];
}

export const SUPERMAN_FIELDS: readonly SupermanField[] = [
  {
    key: 'forward',
    label: 'Vorwärts',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Volle Lehne nach vorn',
    steps: [4, 6, 9, 14, 22, 34],
  },
  {
    key: 'back',
    label: 'Rückwärts',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Volle Lehne nach hinten',
    steps: [2, 3.5, 5, 8, 12, 18],
  },
  {
    key: 'up',
    label: 'Hoch',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Steigen bei voller Lehne',
    steps: [3, 4.5, 6, 9, 14, 20],
  },
  {
    key: 'down',
    label: 'Runter',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Sinken bei voller Lehne',
    steps: [3, 4.5, 6, 9, 14, 20],
  },
  {
    key: 'side',
    label: 'Seitwärts',
    unit: 'm/s',
    min: 0.5,
    max: 60,
    decimals: 1,
    sub: 'Nur wenn die Hand quer schiebt statt zu drehen',
    steps: [2, 3.5, 5, 8, 12, 18],
  },
  {
    key: 'turn',
    label: 'Drehrate',
    unit: '°/s',
    min: 5,
    max: 360,
    decimals: 0,
    sub: 'Wie schnell die Kurve herumkommt',
    steps: [40, 55, 70, 100, 140, 200],
  },
  {
    key: 'deadzone',
    label: 'Totzone',
    unit: 'cm',
    min: 0.5,
    max: 25,
    decimals: 1,
    sub: 'So weit darf die Hand wandern, ohne dass etwas passiert',
    steps: [3, 4.5, 6, 9, 13],
  },
];

/** Die drei Achsen, so wie das Menü sie auflistet. */
export const SUPERMAN_AXES: ReadonlyArray<{
  key: 'drive' | 'lift' | 'yaw';
  label: string;
  sub: string;
}> = [
  { key: 'drive', label: 'Vor/Zurück', sub: 'Hand lehnt · Kopf: Blick nach unten schiebt' },
  { key: 'lift', label: 'Hoch/Runter', sub: 'Hand hebt · Kopf: Blick nach oben steigt' },
  { key: 'yaw', label: 'Links/Rechts', sub: 'Hand legt an · Kopf zieht die Kurve mit' },
];

/**
 * Eine Zahl in ihrem Bereich und auf ihre Stellen gerundet. Alles, was keine
 * Zahl ist — oder eine Null aus einem Konfig-Code, der dieses Feld noch gar
 * nicht kannte —, fällt auf den Auslieferungswert zurück statt auf das
 * Minimum. Genau wie bei der Drohne, und aus demselben Grund.
 */
export function clampSupermanField(field: SupermanField, value: number | undefined): number {
  if (!Number.isFinite(value) || (value as number) <= 0) return DEFAULT_SUPERMAN[field.key];
  const factor = 10 ** field.decimals;
  return Math.round(Math.min(field.max, Math.max(field.min, value as number)) * factor) / factor;
}

/** Die nächste Raste über dem eingestellten Wert, oben wieder von vorne. */
export function nextSupermanStep(field: SupermanField, value: number): number {
  return field.steps.find((step) => step > value + 1e-9) ?? field.steps[0]!;
}

/** Die nächste Quelle in der Runde: Hand → Kopf → beide → aus → Hand. */
export function nextSupermanSource(source: SupermanSource): SupermanSource {
  const at = SUPERMAN_SOURCES.indexOf(source);
  return SUPERMAN_SOURCES[(at + 1) % SUPERMAN_SOURCES.length]!;
}

/** Wie die Zahl auf der Zeile steht. */
export function supermanFieldLabel(field: SupermanField, value: number): string {
  return `${value.toFixed(field.decimals)} ${field.unit}`;
}

/** Ein Einstellungsobjekt, bei dem jeder Wert erlaubt ist. */
export function clampSuperman(settings: Partial<SupermanSettings> | undefined): SupermanSettings {
  const next = { ...DEFAULT_SUPERMAN, ...settings };
  for (const field of SUPERMAN_FIELDS) next[field.key] = clampSupermanField(field, next[field.key]);
  for (const axis of SUPERMAN_AXES) {
    if (!SUPERMAN_SOURCES.includes(next[axis.key])) next[axis.key] = DEFAULT_SUPERMAN[axis.key];
  }
  next.strafe = next.strafe === true;
  return next;
}
