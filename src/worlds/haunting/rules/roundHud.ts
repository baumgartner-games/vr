import type { MapRound } from '../map/mapSnapshot';
import { clockText } from './roundRules';

/**
 * **Was eine Anzeige über die laufende Runde sagt** — einmal gerechnet, an
 * drei Stellen gezeigt.
 *
 * Den Sauerstoff-Timer und die Anzug-Leben sehen die Telefone in der
 * Einsatzzentrale (`stationUi.ts`), der Techniker am Desktop im DOM und in
 * der Brille auf einem Canvas-Streifen (`ShipExperience.ts`). Drei Stellen,
 * die je für sich entscheiden, ab wann „wenig Sauerstoff" ist, sagen nach der
 * ersten Änderung drei verschiedene Dinge. Deshalb steht hier, welcher Text,
 * welche Farbe, und ab wann gewarnt wird — ohne DOM und ohne three.js, damit
 * ein Test es nachrechnen kann.
 *
 * Die Quelle ist `MapRound` aus dem Contract (`RoundRules.status`), und die
 * lässt sich auf **jedem** Client aus dem `HauntState` rechnen, nicht nur
 * beim Gastgeber: `state.time` geht mit über die Leitung.
 */

/** Ab wie vielen Sekunden Sauerstoff die Anzeige warnt. */
export const LOW_OXYGEN_SECONDS = 60;
/** Die Farbe der Anzeige im Normalfall — das Cyan der Schiffsschirme. */
export const HUD_COLOR = '#7de9ec';
/** Und wenn der Sauerstoff knapp wird — das Rot der gesperrten Tür. */
export const HUD_COLOR_LOW = '#ff5267';

export interface RoundHud {
  /** `O₂ m:ss` — die Uhr, die rückwärts läuft. */
  oxygen: string;
  /** Die Anzug-Leben als Symbole: volle und leere Punkte. */
  suit: string;
  /** Wie viele Kabinen für den Rest der Runde hin sind. */
  cabins: number;
  /** Ob unter der Warnschwelle. */
  low: boolean;
  /** Die Farbe, die zum Stand passt. */
  color: string;
  /** Ein Satz für Vorleser und `aria-label`. */
  label: string;
}

/** Ob dieser Rest Sauerstoff eine Warnung ist. */
export function lowOxygen(seconds: number): boolean {
  return seconds < LOW_OXYGEN_SECONDS;
}

/** Die Anzug-Leben als Zeichenkette, voll vor leer. */
export function suitPips(round: Pick<MapRound, 'suit' | 'suitMax'>): string {
  const alive = Math.max(0, Math.min(round.suitMax, round.suit));
  return '●'.repeat(alive) + '○'.repeat(Math.max(0, round.suitMax - alive));
}

/** Der Stand der Runde, wie eine Anzeige ihn zeigt. */
export function roundHud(round: MapRound): RoundHud {
  const low = lowOxygen(round.oxygen);
  const cabins = round.cabinsDestroyed.length;
  const whole = Math.max(0, Math.ceil(round.oxygen));
  return {
    oxygen: `O₂ ${clockText(round.oxygen)}`,
    suit: suitPips(round),
    cabins,
    low,
    color: low ? HUD_COLOR_LOW : HUD_COLOR,
    label:
      `Sauerstoff ${Math.floor(whole / 60)} Minuten ${whole % 60} Sekunden` +
      (low ? ', knapp' : '') +
      `; Anzug ${round.suit} von ${round.suitMax}` +
      (cabins ? `; ${cabinsText(cabins)}` : ''),
  };
}

/** „1 Kabine zerstört" / „3 Kabinen zerstört". */
export function cabinsText(count: number): string {
  return `${count} ${count === 1 ? 'Kabine' : 'Kabinen'} zerstört`;
}

/**
 * Woran die Runde geendet hat, als Satz — derselbe an der Endkarte der
 * Telefone wie am Schirm des Technikers. Leer, solange sie läuft.
 */
export function endingText(ending: MapRound['ending']): string {
  switch (ending) {
    case 'oxygen':
      return 'Der Sauerstoff ist aufgebraucht.';
    case 'suit':
      return 'Der Anzug ist zerstört.';
    case 'escaped':
      return 'Alle Systeme repariert, der Techniker ist zurück in der Einsatzzentrale.';
    default:
      return '';
  }
}
