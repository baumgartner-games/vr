/**
 * **Woraus eine Tür ist** — und was das für den bedeutet, der davorsteht.
 *
 * Eine Tür war in dieser Schicht bisher ein Wahrheitswert: offen oder zu, und
 * dazu die Frage, ob jemand Klinken bedienen kann (`navGraph.wallState`). Das
 * reicht für ein Haus mit Bewohnern und nicht für eines mit Zombies davor: Der
 * Zombie macht keine Tür auf, aber er läuft auch nicht ratlos außen herum,
 * wenn sie aus Brettern ist — er schlägt sie ein. Ob er das kann, hängt am
 * **Material**, und deshalb steht hier eine Tabelle.
 *
 * Drei Zahlen je Sorte, und jede davon ist eine Entscheidung:
 *
 * - **`health`** — wie viel sie einsteckt. `Infinity` heißt „gar nicht", und
 *   das ist kein Zahlenspiel: Eine Metalltür, die nach fünf Minuten Prügel
 *   doch aufgeht, ist keine Wand mehr, und die halbe Karte hängt daran, dass
 *   sie eine ist.
 * - **`breakCost`** — was der Weg *durch* sie kostet, in Metern, für den, der
 *   sie einschlagen muss. Die Zahl ist der Umweg, ab dem sich das Einschlagen
 *   lohnt: Wer außen herum zwanzig Meter läuft, tritt lieber die Tür ein; wer
 *   fünf läuft, geht außen herum. Genau so soll es aussehen.
 * - **`damage`** — wie schnell ein Schläger sie kleinbekommt, je Sekunde. Aus
 *   `health / damage` wird die Zeit, die man in der Brille davorsteht, und die
 *   soll man sehen: Drei Sekunden sind ein Ereignis, zwanzig sind ein Fehler.
 *
 * Reine Daten und ein bisschen Rechnung — kein three.js und kein Graph, damit
 * die Zahlen geprüft sind, bevor irgendwo ein Türblatt umfällt.
 */

/** Woraus ein Türblatt besteht. */
export type DoorMaterial = 'wood' | 'metal';

export interface DoorSpec {
  id: DoorMaterial;
  label: string;
  /** Wie viel das Blatt einsteckt. `Infinity` heißt: es geht nicht kaputt. */
  health: number;
  /** Was der Weg durch sie kostet, wenn man sie erst einschlagen muss, in Metern. */
  breakCost: number;
  /** Wie viel Schaden ein Schläger je Sekunde anrichtet. */
  damage: number;
  /** Die Farbe des Blatts — dieselbe in der Welt und in der Debug-Ansicht. */
  color: number;
}

export const DOOR_MATERIALS: readonly DoorSpec[] = [
  {
    id: 'wood',
    label: 'Holz',
    health: 80,
    // Zehn Meter: mehr als der Durchgang nebenan, weniger als der Weg um eine
    // Bucht herum. Beides gibt es im Labor, und beides soll gewinnen können.
    breakCost: 10,
    damage: 28,
    color: 0xc78a4a,
  },
  {
    id: 'metal',
    label: 'Metall',
    health: Infinity,
    breakCost: Infinity,
    damage: 0,
    color: 0x8d97ad,
  },
];

/**
 * Die Sorte zu einer Id — **Holz**, wenn niemand etwas sagt.
 *
 * Die freundlichere der beiden Voreinstellungen: Eine unbekannte Id soll eine
 * Tür ergeben, durch die man notfalls kommt. Wer aus Versehen Metall bekäme,
 * hätte eine Karte, die an einer Stelle dichthält, die niemand gebaut hat.
 */
export function doorSpec(id: string | undefined): DoorSpec {
  return DOOR_MATERIALS.find((one) => one.id === id) ?? DOOR_MATERIALS[0]!;
}

/** Ob eine Tür aus diesem Material überhaupt kaputtgehen kann. */
export function breakable(material: DoorMaterial | undefined): boolean {
  return Number.isFinite(doorSpec(material).health);
}

/** Wie viel Leben eine frische Tür aus diesem Material hat. */
export function fullHealth(material: DoorMaterial | undefined): number {
  return doorSpec(material).health;
}

/**
 * **Wie lange einer an einer Tür steht, bis sie aufgeht**, in Sekunden.
 *
 * Auf der Karte kostet das Aufmachen drei Meter Umweg (`navGraph.DOOR_COST`) —
 * das ist die Zahl, mit der geplant wird. Diese hier ist die, die man *sieht*:
 * Eine Tür aufzumachen ist eine Handlung, und wer davorsteht, steht ein
 * Momentchen. Ohne sie lief jeder einfach hindurch, und die Frage „ist die Tür
 * hier eigentlich ein Problem?" war nie zu beantworten.
 *
 * Eine halbe Sekunde: lang genug, dass man es sieht, kurz genug, dass niemand
 * denkt, es hänge etwas.
 */
export const DOOR_OPEN_TIME = 0.5;

/**
 * **Ein Schlag auf die Tür.**
 *
 * Gibt zurück, was von ihrem Leben übrig ist — nie unter null, und bei einer
 * Tür, die nicht kaputtgehen kann, unverändert `Infinity`. Dass daraus ein
 * Loch in der Wand wird, entscheidet der Graph (`navGraph.hitDoor`); hier
 * steht nur die Rechnung, und die kennt keine Karte.
 */
export function afterHit(health: number, damage: number): number {
  if (!Number.isFinite(health)) return health;
  return Math.max(0, health - Math.max(0, damage));
}

/**
 * Wie lange einer davorsteht, bis sie fällt, in Sekunden.
 *
 * `Infinity` für alles, was nicht kaputtgeht — und das ist die ehrliche
 * Antwort und keine Ausrede: Wer diese Zahl anzeigt, soll „nie" hinschreiben
 * und nicht „999".
 */
export function breakTime(material: DoorMaterial | undefined): number {
  const spec = doorSpec(material);
  if (!Number.isFinite(spec.health) || spec.damage <= 0) return Infinity;
  return spec.health / spec.damage;
}
