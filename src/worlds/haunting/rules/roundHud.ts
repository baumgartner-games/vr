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

/**
 * **Wie weit ein Auftrag ist**: `0` noch gar nicht, `1` das Ersatzteil ist
 * geholt, `2` die Konsole ist gelöst. Jede Reparatur hat zwei Schritte, und
 * eine Anzeige, die nur „offen / erledigt" kennt, verschweigt die Hälfte der
 * Runde.
 */
export type TaskStep = 0 | 1 | 2;

export interface HudTask {
  /** Der Auftrag, wie er in der Liste steht: „Labor: Antrieb wiederherstellen (1/2)". */
  text: string;
  /** Der Raum allein — für Anzeigen, denen die ganze Zeile zu lang ist. */
  room: string;
  title: string;
  step: TaskStep;
}

export interface HudTaskInput {
  /** Die Reparaturen der Runde (`mission.ts`, `repairsFor`). */
  repairs: readonly { itemId: string; title: string; roomId: string }[];
  /** Wie ein Raum heißt — die 2D-Welt nimmt den Namen aus dem Schnappschuss, das Schiff aus dem Bauplan. */
  roomName: (roomId: string) => string;
  /** Was fertig ist (`HauntState.done`). */
  done: readonly string[];
  /** Was schon aus der Fracht heraus ist (`HauntState.taken`). */
  taken: readonly string[];
  /** Und was der Techniker gerade trägt (`CrewState.inventory`). */
  inventory: readonly string[];
}

/**
 * **Die Aufträge, wie eine Anzeige sie zeigt** — einmal gerechnet, in der
 * 2D-Welt und im Schiff dieselbe Liste in derselben Reihenfolge.
 *
 * Vorher rechnete das 2D-HUD das für sich, und die Brille zeigte gar keine
 * Aufträge: Der Spieler im Headset sah seinen Auftrag nur, wenn er zufällig
 * vor einer Konsole stand. Zwei Anzeigen, die dasselbe zählen, zählen es nach
 * der ersten Änderung verschieden — deshalb steht die Rechnung hier und nicht
 * dort.
 */
export function hudTasks(input: HudTaskInput): HudTask[] {
  return input.repairs.map((repair) => {
    const done = input.done.includes(repair.itemId);
    const carried =
      done || input.inventory.includes(repair.itemId) || input.taken.includes(repair.itemId);
    const step: TaskStep = done ? 2 : carried ? 1 : 0;
    const room = input.roomName(repair.roomId);
    return { text: `${room}: ${repair.title} (${step}/2)`, room, title: repair.title, step };
  });
}

/** Die Aufträge als Kreise: voll, halb, leer — so viel, wie man im Vorbeigehen liest. */
export function taskPips(tasks: readonly HudTask[]): string {
  return tasks.map((task) => (task.step === 2 ? '●' : task.step === 1 ? '◐' : '○')).join('');
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
