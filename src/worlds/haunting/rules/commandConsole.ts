/**
 * **Die Konsole der Zentrale — Zeilen mit Namen statt Nummern.**
 *
 * An der Wand der Einsatzzentrale hängt ein Bildschirm mit sechs Zeilen
 * (`ShipExperience.command`): oben der Modus, dann die zwei Starts, dann
 * Station, Gegner und Übungslicht. Wer darauf tippt, traf bis hierher eine
 * **Zahl**: `Math.floor((1 - uv.y) * 6)`, und `commandAction(3)` hieß
 * „Station weiterschalten". Dieselben Zahlen standen ein zweites Mal in den
 * Knöpfen der Tafel (`rooms` → 3, `monster` → 4, `light` → 5). Eine Zeile
 * mehr oben — etwa der Modus, der mit dem Rundenablauf dazukam
 * (`rules/roundFlow.ts`) — und jeder Knopf hätte das Falsche getan, ohne
 * dass es jemand merkt.
 *
 * Jetzt trägt jede Zeile ihre **Aktion** (`CommandAction`), die Zeilen
 * entstehen an einer Stelle (`commandRows`), und welche getroffen ist, rechnet
 * `commandActionAt` aus der Höhe des Treffers und der Zahl der Zeilen. Reine
 * Rechnung ohne three.js und ohne DOM, mit Test.
 */
import { FLOW, MODE_TEXT, type RoundMode } from './roundFlow';

/** Was eine Zeile der Konsole tut. */
export type CommandAction = 'status' | 'real' | 'practice' | 'rooms' | 'monster' | 'light';

export interface CommandRow {
  action: CommandAction;
  /** Was auf der Zeile steht, in Großbuchstaben wie auf jedem Schild im Schiff. */
  text: string;
}

/** Was die Konsole vom Stand wissen muss. */
export interface CommandState {
  mode: RoundMode;
  rooms: number;
  /** Der Name des Gegners, wie `MONSTERS` ihn nennt. */
  monster: string;
  /** Ob die Übungsrunde läuft (`StationOptions.test`) — nur dann gibt es das Übungslicht. */
  test: boolean;
  bright: boolean;
}

/**
 * **Die Zeilen der Konsole, von oben nach unten.** Die Reihenfolge ist die,
 * in der sie gezeichnet werden; wer eine Zeile dazutut, ändert nur diese
 * Liste — die Treffer rechnen sich daraus.
 */
export function commandRows(state: CommandState): CommandRow[] {
  return [
    { action: 'status', text: `ORBITAL · JETZT: ${MODE_TEXT[state.mode].badge}` },
    { action: 'real', text: FLOW.real.toUpperCase() },
    { action: 'practice', text: `${FLOW.practice.toUpperCase()} · OHNE MONSTER` },
    { action: 'rooms', text: `SKELD · FESTE KARTE · ${state.rooms} RÄUME` },
    { action: 'monster', text: `GEGNER: ${state.monster}` },
    {
      action: 'light',
      text: state.test
        ? `ÜBUNGSLICHT: ${state.bright ? 'HELL' : 'DUNKEL'} · ANTIPPEN`
        : 'ÜBUNGSLICHT: NUR IN DER ÜBUNGSRUNDE',
    },
  ];
}

/**
 * **Welche Zeile ein Treffer trifft** — `fromTop` ist die Höhe auf dem
 * Bildschirm, 0 oben, 1 unten (`1 − uv.y`). Außerhalb wird auf die erste
 * oder letzte Zeile geklemmt; ohne Zeilen gibt es keine Aktion.
 */
export function commandActionAt(
  rows: readonly CommandRow[],
  fromTop: number,
): CommandAction | null {
  if (rows.length === 0 || !Number.isFinite(fromTop)) return null;
  const index = Math.min(rows.length - 1, Math.max(0, Math.floor(fromTop * rows.length)));
  return rows[index]!.action;
}
