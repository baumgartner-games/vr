import { NAV_LAYERS, type NavLayer } from '../nav/navLayers';
import { NAV_SWITCHES, type NavSwitch } from '../nav/navSwitches';

/**
 * **Der Bauplan der Wandkonsole** — wo auf der Platte welche Taste sitzt.
 *
 * Reine Rechnung, kein three.js, und das aus dem Grund, der in diesem Projekt
 * überall gilt: Eine Beschriftung, die unten aus der Platte heraushängt, sieht
 * man nur in der Brille — und dort merkt man sie erst, wenn jemand eine achte
 * Ebene hinzugefügt hat und niemand mehr an diese Datei denkt. Als Zahlenwerk
 * kann ein Test nachmessen, ob alles auf der Platte bleibt
 * (`consoleLayout.test.ts`), und `NavConsole.ts` setzt danach nur noch Quader
 * an die ausgerechneten Stellen.
 *
 * **Zwei Blöcke.** Oben zeigen (`nav/navLayers.ts`), unten schalten
 * (`nav/navSwitches.ts`) — mit einer eigenen Überschrift dazwischen, denn der
 * Unterschied ist der zwischen „ich sehe die Kiste" und „die Kiste zählt".
 */

/**
 * Was eine Taste schaltet: eine Ebene, alle auf einmal — oder einen der drei
 * **Schalter**.
 *
 * Die Schalter tragen ein Präfix, und das ist keine Zierde: „Verbindungen"
 * heißt oben eine Ebene und unten ein Schalter, und ohne Präfix wären es
 * dieselbe Taste. Genau dieser Fall wäre der Fehler, den man in der Brille am
 * schwersten findet — man drückt etwas, und es passiert das andere.
 */
export type ConsoleKey = NavLayer | 'all' | `sw:${NavSwitch}`;

/** Der Schalter hinter einer Taste — `null`, wenn es eine Ebene ist. */
export function switchOf(key: ConsoleKey): NavSwitch | null {
  return key.startsWith('sw:') ? (key.slice(3) as NavSwitch) : null;
}

/**
 * **Vier Tasten je Reihe und nicht drei.**
 *
 * Mit dreien wären die acht Ebenen drei Reihen, die drei Schalter eine vierte,
 * und die Platte 2,3 m hoch — sie ragte oben aus der 2,4 m hohen Wand heraus,
 * an der sie hängt. Breiter statt höher: Eine Bucht ist zehn Kacheln breit,
 * Platz nach oben hat sie keinen.
 */
export const COLS = 4;
export const PLATE_W = 3.2;
export const PAD_W = 0.66;
export const PAD_H = 0.3;
/** Was eine Reihe Tasten samt ihrer Beschriftung an Höhe braucht. */
const ROW_H = 0.44;
/** Die Kopfzeile ganz oben. */
const TITLE_H = 0.34;
/** Die Überschrift, die den zweiten Block vom ersten trennt. */
const BLOCK_H = 0.2;
/** Was unten stehen bleibt, damit die letzte Beschriftung nicht heraushängt. */
const FOOT_H = 0.1;
/** Wie hoch eine Beschriftung ist und wie weit sie unter ihrer Taste hängt. */
export const LABEL_H = 0.12;
const LABEL_DROP = PAD_H / 2 + 0.07;

const LAYER_ROWS = Math.ceil((NAV_LAYERS.length + 1) / COLS);
const SWITCH_ROWS = Math.ceil(NAV_SWITCHES.length / COLS);

/**
 * Wie hoch die Platte ist — **gerechnet und nicht gemessen**.
 *
 * Sie hängt an `NAV_LAYERS` und `NAV_SWITCHES`: Wer dort etwas hinzufügt,
 * bekommt eine Reihe mehr, sobald eine voll ist, und die Platte wächst mit.
 * Eine gemessene 1,96 wäre beim nächsten Eintrag still falsch.
 */
export const PLATE_H = TITLE_H + LAYER_ROWS * ROW_H + BLOCK_H + SWITCH_ROWS * ROW_H + FOOT_H;

/** Eine Taste mit ihrem Platz auf der Platte. */
export interface ConsolePad {
  key: ConsoleKey;
  label: string;
  color: number;
  x: number;
  y: number;
  /** Ob sie zum unteren Block gehört — die schalten, statt zu zeigen. */
  acts: boolean;
}

/** Eine Überschrift mit ihrem Platz. */
export interface ConsoleTitle {
  text: string;
  y: number;
  height: number;
  color: number;
}

/** Wo die Mitte der Tasten einer Reihe liegt — Reihe 0 ist die oberste. */
function rowY(row: number, afterBlock: boolean): number {
  return PLATE_H / 2 - TITLE_H - ROW_H / 2 - row * ROW_H - (afterBlock ? BLOCK_H : 0);
}

/** Alle Tasten der Konsole, von oben links nach unten rechts. */
export function consolePads(): ConsolePad[] {
  const keys: { key: ConsoleKey; label: string; color: number }[] = [
    { key: 'all', label: 'Alles', color: 0xffc857 },
    ...NAV_LAYERS.map((layer) => ({
      key: layer.id as ConsoleKey,
      label: layer.label,
      color: layer.color,
    })),
  ];
  const switches: { key: ConsoleKey; label: string; color: number }[] = NAV_SWITCHES.map((one) => ({
    key: `sw:${one.id}` as ConsoleKey,
    label: one.label,
    color: one.color,
  }));

  return [...keys, ...switches].map((entry, index) => {
    const acts = index >= keys.length;
    const place = acts ? index - keys.length : index;
    const column = place % COLS;
    const row = Math.floor(place / COLS) + (acts ? LAYER_ROWS : 0);
    return {
      ...entry,
      acts,
      x: (column - (COLS - 1) / 2) * (PAD_W + 0.08),
      y: rowY(row, acts),
    };
  });
}

/**
 * Die beiden Überschriften.
 *
 * Die zweite liegt **genau in der Lücke** zwischen der letzten Beschriftung
 * oben und der ersten Taste unten — ausgerechnet und nicht abgezählt, denn die
 * Lücke wandert mit jeder Reihe, die dazukommt.
 */
export function consoleTitles(): ConsoleTitle[] {
  const gapTop = rowY(LAYER_ROWS - 1, false) - LABEL_DROP - LABEL_H / 2;
  const gapBottom = rowY(LAYER_ROWS, true) + PAD_H / 2;
  return [
    { text: 'NAVIGATION ZEIGEN', y: PLATE_H / 2 - TITLE_H / 2, height: 0.2, color: 0x39d0ff },
    { text: 'NAVIGATION SCHALTEN', y: (gapTop + gapBottom) / 2, height: 0.16, color: 0xffc857 },
  ];
}

/** Wo die Beschriftung einer Taste sitzt — mittig darunter. */
export function labelY(pad: ConsolePad): number {
  return pad.y - LABEL_DROP;
}
