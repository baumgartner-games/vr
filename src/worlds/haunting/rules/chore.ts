import type { FloorPoint } from '../stationLayout';

/**
 * **Ein Handgriff, der Zeit kostet** — und den man verliert, wenn man
 * währenddessen losläuft.
 *
 * Bis hierher war Aufmachen ein Knopfdruck: Man lief an eine Kiste, tippte
 * einmal, und der Deckel stand offen. Damit war eine Kiste kein Risiko,
 * sondern ein Abhaken — man konnte sie im Vorbeigehen mitnehmen, auch wenn das
 * Monster zwei Zimmer weiter schon in Bewegung war. Genau das ist der Grund
 * für diese Datei: **Fünf Sekunden stillstehen** ist eine Entscheidung. Wer
 * sie trifft, hört in dieser Zeit nur zu — und wer dabei losgeht, hat den
 * Griff umsonst getan.
 *
 * **Umschauen ist erlaubt, laufen nicht.** Der Kopf darf sich drehen, der
 * Körper nicht: Ein Handgriff, den ein Blick über die Schulter abbricht, wäre
 * eine Strafe fürs Aufpassen. Deshalb steht hier eine Stelle (`at`) und kein
 * Blickwinkel; abgebrochen wird, wenn der Abstand dazu über `CHORE_LEASH`
 * wächst.
 *
 * Reine Rechnung ohne DOM und ohne three.js: Die 2D-Runde (`map/flatRound.ts`)
 * und das Schiff (`ShipExperience.ts`) rechnen denselben Balken.
 */

/** Wie lange das Aufklappen einer Frachtkiste dauert, in Sekunden. */
export const CARGO_OPEN_SECONDS = 5;

/**
 * **Wie weit man sich dabei bewegen darf**, in Metern.
 *
 * Nicht null: Ein Spieler am Stock zittert um Zentimeter, und ein Balken, den
 * ein Rundungsrest abbricht, ist ein kaputter Balken. Ein Vierteldezimeter ist
 * weniger als ein Schritt und mehr als jedes Zittern.
 */
export const CHORE_LEASH = 0.25;

/** Woran gerade gearbeitet wird. Heute gibt es genau eine Sorte. */
export interface Chore {
  kind: 'cargo';
  /** Die Kiste, an der gearbeitet wird. */
  id: string;
  /** Was im Balken steht — „Kiste 2, blaues Band öffnen". */
  label: string;
  /** Wo der Spieler stand, als er anfing. */
  at: FloorPoint;
  /** Wie viel noch zu tun ist, in Sekunden. */
  left: number;
  /** Und wie lange es insgesamt dauert — der Nenner des Balkens. */
  total: number;
}

/** Wie weit der Balken ist, von 0 bis 1. */
export function choreProgress(chore: Chore): number {
  if (!(chore.total > 0)) return 1;
  return Math.max(0, Math.min(1, 1 - chore.left / chore.total));
}

/** Was ein Zeitschritt aus einem Handgriff macht. */
export type ChoreStep =
  | { kind: 'running'; chore: Chore }
  | { kind: 'done'; chore: Chore }
  | { kind: 'broken'; chore: Chore };

/**
 * **Einen Handgriff weiterzählen.** `at` ist, wo der Spieler jetzt steht;
 * `steady` sagt, ob er überhaupt weiterarbeiten darf (nicht versteckt, nicht
 * mitten in einem Rätsel, Runde läuft).
 *
 * Die Reihenfolge ist die Regel: Erst wird gefragt, ob er noch da steht, dann
 * gezählt. Andersherum wäre ein Griff, der im letzten Bild fertig wird,
 * während der Spieler schon einen Schritt weit weg ist, trotzdem fertig — und
 * genau das soll er nicht sein.
 */
export function stepChore(chore: Chore, dt: number, at: FloorPoint, steady = true): ChoreStep {
  if (!steady || Math.hypot(at.x - chore.at.x, at.z - chore.at.z) > CHORE_LEASH)
    return { kind: 'broken', chore };
  const left = chore.left - dt;
  if (left <= 0) return { kind: 'done', chore: { ...chore, left: 0 } };
  return { kind: 'running', chore: { ...chore, left } };
}
