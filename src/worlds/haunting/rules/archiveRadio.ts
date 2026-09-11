import type { HouseSpec } from '../house';
import { archiveGoals, type ArchiveOrder, type ArchiveState } from './archiveGoals';

/**
 * **Der Archivar sagt es auch, wenn er ein Bot ist.**
 *
 * Rechnet an seinem Platz ein Bot, bekommt der Techniker dessen Auskunft bis
 * hierher **still**: Die Zielkiste leuchtet, ein Tipp auf ein Zimmer schlägt
 * die Akte auf (`rules/roundSetup.powersOf`). Im Schiff und erst recht in der
 * Brille ist das zu wenig — dort schaut niemand auf eine Karte, während hinter
 * ihm eine Tür knarrt. Was fehlte, sind die zwei Sätze, die ein Mensch am
 * Archiv ohnehin sagen würde: **wo es liegt** und, sobald das Teil in der Hand
 * ist, **wohin damit und welche Liste dafür aufzuschlagen ist**.
 *
 * Deshalb steht hier keine zweite Wahrheit, sondern nur ihr Wortlaut: Gelesen
 * wird dasselbe Blatt wie auf dem Telefon des Archivars (`archiveGoals`), und
 * es gilt dieselbe Verschwiegenheit — die Konsole erst, wenn das Teil
 * getragen wird, ein abgelegtes Teil erst, wenn es liegen bleibt.
 *
 * **Gesprochen wird nur, wenn sich etwas ändert.** `key` ist die Lage in einer
 * Zeichenkette; wer den letzten Schlüssel behält, funkt nicht alle zwei
 * Sekunden dasselbe. Ein Funkgerät, das sich wiederholt, schalten Menschen ab.
 *
 * Reine Rechnung: kein DOM, kein three.js, kein Netz.
 */

/** Ein Funkspruch des Archivars: woran er hängt, und was er sagt. */
export interface ArchiveCall {
  /** Die Lage als Zeichenkette — gleicher Schlüssel, gleicher Spruch. */
  key: string;
  text: string;
}

/**
 * **Welche Liste zu diesem Rätsel gehört.** Der Techniker steht vor einem
 * offenen Wartungskasten und soll nicht raten, wonach er fragen muss; der
 * Archivar nennt das Blatt beim Namen.
 */
export const SHEET_NAMES: Readonly<Record<'wires' | 'sequence' | 'tune', string>> = {
  wires: 'Kabelplan',
  sequence: 'Frequenzliste',
  tune: 'Codetafel',
};

/**
 * Der Spruch zur Lage — `null`, wenn es nichts zu sagen gibt (alles erledigt).
 *
 * Angesagt wird immer **ein** Auftrag: der erste, der noch offen ist. Drei
 * Ziele auf einmal sind keine Hilfe, sondern eine Liste, und Listen liest man
 * nicht, während man läuft.
 */
export function archiveRadio(spec: HouseSpec, state: ArchiveState): ArchiveCall | null {
  const orders = archiveGoals(spec, state);
  // Ein liegengelassenes Teil geht vor: Wer es sucht, sucht es jetzt.
  const lost = orders.find((order) => order.step < 2 && order.dropped);
  const open = lost ?? orders.find((order) => order.step < 2);
  if (!open)
    return { key: 'done', text: 'Archiv → Techniker: Alles erledigt. Zurück zur Zentrale.' };
  return { key: keyOf(open), text: textOf(open) };
}

function keyOf(order: ArchiveOrder): string {
  return [
    order.id,
    order.step,
    order.carried ? 'hand' : '',
    order.dropped ? `lost:${order.dropped.roomId}` : '',
  ].join('|');
}

function textOf(order: ArchiveOrder): string {
  if (order.dropped)
    return `Archiv → Techniker: ${order.item} liegt in ${order.dropped.roomName} auf dem Boden. Hol sie dort ab.`;
  // **Die Konsole nennt er erst mit dem Teil in der Hand** — dieselbe Regel
  // wie auf seinem Blatt (`archiveGoals.ts`), sonst wäre der Funk der
  // Vorleser, den es dort nicht mehr gibt.
  if (order.console)
    return `Archiv → Techniker: ${order.item} nach ${order.console.roomName}, ${order.title}. Schlag den ${SHEET_NAMES[order.console.puzzle]} auf. ${order.console.hint}`;
  return `Archiv → Techniker: ${order.item} liegt in ${order.crate.roomName} — ${order.crate.clue}.`;
}
