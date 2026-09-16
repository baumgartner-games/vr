/**
 * **Was am Pad anliegt, in Worten** — die Rechnung hinter der Seite
 * `/inputs` (`src/inputs/`).
 *
 * `core/gamepad.ts` liest dasselbe API, fragt aber etwas anderes: _Läuft die
 * Figur, schießt sie?_ Es macht aus achtzehn Knöpfen fünf Absichten und wirft
 * alles weg, was die Spielwiese nicht belegt hat. Genau das, was es wegwirft,
 * ist hier die Ware: **welcher** Knopf, unter **welcher Nummer**, mit welchem
 * Wert — und wie er auf dem Gerät in der Hand beschriftet ist.
 *
 * Denn das ist die Frage, mit der jemand auf diese Seite kommt: Der Browser
 * einer Konsole meldet ein Pad, die Spielwiese reagiert nicht, und niemand
 * weiß, ob der Knopf gar nicht ankommt oder nur unter einer anderen Nummer als
 * erwartet. Eine Seite, die „Knopf 1 · `button[1]` · ○ (Kreis)" schreibt,
 * beantwortet das in einem Blick; eine Konsole ohne Entwicklerwerkzeuge kann
 * es sonst nirgends nachsehen.
 *
 * **Warum eine Tabelle und keine Erkennung je Gerät.** Das Standard-Mapping
 * (`gamepad.mapping === 'standard'`) legt die Reihenfolge fest: unten, rechts,
 * links, oben, dann die Schultern, dann die Mitte, dann das Steuerkreuz. Was
 * sich zwischen Xbox, PlayStation und Switch unterscheidet, ist allein die
 * **Beschriftung** derselben Stelle — `A` oder `✕`, `LB` oder `L1`. Deshalb
 * steht hier eine Tabelle mit vier Spalten und keine Fallunterscheidung: Ein
 * Pad, dessen Marke wir nicht erkennen, bekommt die neutrale Spalte und ist
 * damit vollständig beschrieben, nicht halb.
 *
 * Kein DOM, kein `navigator`, kein three.js — damit ein Test es nachrechnen
 * kann. Im Container steckt kein Controller, und ein Stück Eingabe, das man
 * nur mit Hardware in der Hand prüfen kann, ist ungeprüft.
 */

import { TRIGGER_THRESHOLD, type GamepadLike } from './gamepad';

/**
 * Die Marke am Gerät — sie entscheidet nur über Wörter und Zeichen, nie über
 * Nummern. `generic` ist kein Fehlerfall, sondern die Spalte ohne Marke.
 */
export type PadKind = 'playstation' | 'xbox' | 'nintendo' | 'generic';

/**
 * **Wo eine Taste sitzt** — der Name für das Bild (`src/inputs/padDiagram.ts`).
 *
 * Er steht neben der Beschriftung und nicht an ihrer Stelle: `✕` liegt auf
 * einer PlayStation unten, `A` auf einer Xbox ebenfalls, `B` auf einer Switch
 * auch — dieselbe Stelle, drei Wörter. Das Bild leuchtet nach der Stelle, die
 * Panels schreiben die Beschriftung.
 */
export type PadSlot =
  | 'face-down'
  | 'face-right'
  | 'face-left'
  | 'face-up'
  | 'shoulder-left'
  | 'shoulder-right'
  | 'trigger-left'
  | 'trigger-right'
  | 'select'
  | 'start'
  | 'stick-left'
  | 'stick-right'
  | 'dpad-up'
  | 'dpad-down'
  | 'dpad-left'
  | 'dpad-right'
  | 'home'
  | 'touchpad';

/** Eine Zeile der Tabelle: eine Stelle, vier Beschriftungen, vier Zeichen. */
export interface ButtonSpec {
  slot: PadSlot;
  /** Die Beschriftung je Marke — ausgeschrieben, für die Liste. */
  labels: Record<PadKind, string>;
  /** Dasselbe als Zeichen für das Abzeichen — höchstens drei Stellen. */
  icons: Record<PadKind, string>;
}

/** Kurzschreibweise für die Tabelle: eine Zeile in einer Zeile. */
function spec(
  slot: PadSlot,
  labels: [playstation: string, xbox: string, nintendo: string, generic: string],
  icons: [playstation: string, xbox: string, nintendo: string, generic: string],
): ButtonSpec {
  const [ps, xb, ni, ge] = labels;
  const [psIcon, xbIcon, niIcon, geIcon] = icons;
  return {
    slot,
    labels: { playstation: ps, xbox: xb, nintendo: ni, generic: ge },
    icons: { playstation: psIcon, xbox: xbIcon, nintendo: niIcon, generic: geIcon },
  };
}

/**
 * **Das Standard-Mapping, ausgeschrieben** — Knopf 0 bis 17, in genau der
 * Reihenfolge, in der `navigator.getGamepads()` sie meldet.
 *
 * Die vier Gesichtsknöpfe stehen dabei nach **Lage** und nicht nach Namen in
 * der Liste: Nummer 0 ist der untere, und dass er auf einer Switch `B` heißt
 * und auf einer Xbox `A`, ist eine Frage der Aufschrift. Wer nach dem Namen
 * ginge, hätte eine Tabelle, die für jedes zweite Pad falsch ist.
 *
 * Nummer 17 (das Touchpad) gibt es nur an Sony-Pads; darüber hinaus melden
 * manche Treiber weitere Knöpfe, die niemand benennen kann — die bekommen von
 * `padButtonLabel` ihre Nummer als Namen und keinen Platz im Bild.
 */
export const PAD_BUTTONS: readonly ButtonSpec[] = [
  spec('face-down', ['✕ (Kreuz)', 'A', 'B', 'Unten'], ['✕', 'A', 'B', '▽']),
  spec('face-right', ['○ (Kreis)', 'B', 'A', 'Rechts'], ['○', 'B', 'A', '▷']),
  spec('face-left', ['□ (Viereck)', 'X', 'Y', 'Links'], ['□', 'X', 'Y', '◁']),
  spec('face-up', ['△ (Dreieck)', 'Y', 'X', 'Oben'], ['△', 'Y', 'X', '△']),
  spec('shoulder-left', ['L1', 'LB', 'L', 'Schulter links'], ['L1', 'LB', 'L', 'L1']),
  spec('shoulder-right', ['R1', 'RB', 'R', 'Schulter rechts'], ['R1', 'RB', 'R', 'R1']),
  spec('trigger-left', ['L2', 'LT', 'ZL', 'Trigger links'], ['L2', 'LT', 'ZL', 'L2']),
  spec('trigger-right', ['R2', 'RT', 'ZR', 'Trigger rechts'], ['R2', 'RT', 'ZR', 'R2']),
  spec('select', ['Create', 'View', 'Minus', 'Select'], ['⊟', '⊟', '−', '⊟']),
  spec('start', ['Options', 'Menu', 'Plus', 'Start'], ['☰', '☰', '+', '☰']),
  spec(
    'stick-left',
    ['L3 (Stick links)', 'LS', 'Stick links', 'Stick links'],
    ['L3', 'LS', 'L3', 'L3'],
  ),
  spec(
    'stick-right',
    ['R3 (Stick rechts)', 'RS', 'Stick rechts', 'Stick rechts'],
    ['R3', 'RS', 'R3', 'R3'],
  ),
  spec(
    'dpad-up',
    ['Steuerkreuz oben', 'D-Pad oben', 'Steuerkreuz oben', 'Steuerkreuz oben'],
    ['▲', '▲', '▲', '▲'],
  ),
  spec(
    'dpad-down',
    ['Steuerkreuz unten', 'D-Pad unten', 'Steuerkreuz unten', 'Steuerkreuz unten'],
    ['▼', '▼', '▼', '▼'],
  ),
  spec(
    'dpad-left',
    ['Steuerkreuz links', 'D-Pad links', 'Steuerkreuz links', 'Steuerkreuz links'],
    ['◀', '◀', '◀', '◀'],
  ),
  spec(
    'dpad-right',
    ['Steuerkreuz rechts', 'D-Pad rechts', 'Steuerkreuz rechts', 'Steuerkreuz rechts'],
    ['▶', '▶', '▶', '▶'],
  ),
  spec('home', ['PS-Taste', 'Xbox-Taste', 'Home', 'Guide'], ['⌂', '⌂', '⌂', '⌂']),
  spec('touchpad', ['Touchpad', 'Knopf 17', 'Capture', 'Knopf 17'], ['TP', '17', 'CAP', '17']),
];

/** Die Achsen des Standard-Mappings — zwei Sticks, vier Zahlen. */
const AXIS_LABELS: readonly string[] = [
  'Stick links ⇄',
  'Stick links ⇅',
  'Stick rechts ⇄',
  'Stick rechts ⇅',
];

/**
 * **Welche Marke das ist** — geraten aus `gamepad.id`, und zwar nur, um Wörter
 * daraus zu machen.
 *
 * In der Kennung steht bei den meisten Browsern die USB-Herstellernummer
 * (`Vendor: 054c`), und die ist eindeutiger als jeder Produktname: Ein
 * DualShock 4 heißt in Chrome schlicht „Wireless Controller", ein DualSense
 * „DualSense Wireless Controller", und ein Adapter dazwischen nennt sich, wie
 * er will. Erkannt wird deshalb zuerst die Nummer und danach der Name.
 *
 * Wer nichts davon trifft, ist `generic` — und wird damit nicht schlechter
 * beschrieben, sondern nur neutraler.
 */
export function padKind(id: string | null | undefined): PadKind {
  const text = (id ?? '').toLowerCase();
  if (/054c|dualsense|dualshock|playstation|\bsony\b/.test(text)) return 'playstation';
  if (/045e|xbox|xinput/.test(text)) return 'xbox';
  if (/057e|nintendo|joy-?con|pro controller/.test(text)) return 'nintendo';
  return 'generic';
}

/** Wie die Marke heißt, wenn sie auf der Seite dastehen soll. */
export const PAD_KIND_LABELS: Record<PadKind, string> = {
  playstation: 'PlayStation',
  xbox: 'Xbox',
  nintendo: 'Nintendo',
  // Nicht „Standard-Layout": Das Layout ist bei allen vieren dasselbe, was
  // fehlt, ist die **Marke** — und damit die Aufschrift. Ein Backbone am
  // iPhone ist genau so ein Fall (Hersteller 358a), und es gibt ihn mit
  // Xbox- und mit PlayStation-Tasten: Geraten wird da nichts.
  generic: 'Marke unbekannt',
};

/** Wo Knopf `index` sitzt — oder `null`, wenn ihn keine Tabelle kennt. */
export function padButtonSlot(index: number): PadSlot | null {
  return PAD_BUTTONS[index]?.slot ?? null;
}

/**
 * Die Beschriftung von Knopf `index` auf diesem Gerät. Was über die Tabelle
 * hinausgeht, heißt nach seiner Nummer — das ist ehrlicher als ein geratener
 * Name und immer noch ein Name.
 */
export function padButtonLabel(index: number, kind: PadKind): string {
  return PAD_BUTTONS[index]?.labels[kind] ?? `Knopf ${index}`;
}

/** Dasselbe als Zeichen für das Abzeichen. */
export function padButtonIcon(index: number, kind: PadKind): string {
  return PAD_BUTTONS[index]?.icons[kind] ?? String(index);
}

/**
 * **Die Aufschrift einer Stelle** — nicht einer Nummer.
 *
 * Den Unterschied gibt es, seit eine Gerätekarte die beiden auseinanderziehen
 * darf (`core/inputMap.ts`): Sitzt an einem Backbone `buttons[1]` unten, dann
 * heißt _diese Nummer_ `✕`, und die Tabelle nach Nummern gefragt sagte `○`.
 * Wer eine Stelle beschriftet, fragt deshalb hier.
 */
export function padSlotLabel(slot: PadSlot, kind: PadKind): string {
  return PAD_BUTTONS.find((spec) => spec.slot === slot)?.labels[kind] ?? slot;
}

/** Und ihr Zeichen. */
export function padSlotIcon(slot: PadSlot, kind: PadKind): string {
  return PAD_BUTTONS.find((spec) => spec.slot === slot)?.icons[kind] ?? '?';
}

/** Wie die Achse `index` heißt. */
export function padAxisLabel(index: number): string {
  return AXIS_LABELS[index] ?? `Achse ${index}`;
}

/**
 * **Der Code, der auf der Seite im Panel steht.** Genau die Schreibweise, mit
 * der man den Knopf im eigenen Code wieder findet: `gamepad.buttons[3]`, kein
 * eigener Name, kein Kürzel. Wer ihn abliest und eintippt, hat dieselbe Taste.
 */
export function padButtonCode(index: number): string {
  return `buttons[${index}]`;
}

/** Und dasselbe für eine Achse. */
export function padAxisCode(index: number): string {
  return `axes[${index}]`;
}

/** Eine Taste, wie die Seite sie zeigt. */
export interface PadButtonState {
  index: number;
  /** `buttons[3]` — die Stelle im API. */
  code: string;
  /** Die Aufschrift auf diesem Gerät. */
  label: string;
  /** Das Zeichen dafür. */
  icon: string;
  /** Wo sie im Bild leuchtet; `null` für alles jenseits der Tabelle. */
  slot: PadSlot | null;
  pressed: boolean;
  /** 0…1 — an einem analogen Trigger der Zug, sonst 0 oder 1. */
  value: number;
  /** Ob das Pad die Taste als _berührt_ meldet (Sony-Pads können das). */
  touched: boolean;
  /** Ob gerade ein Zwischenwert anliegt — dann ist diese Taste analog. */
  analog: boolean;
}

/** Eine Achse, wie die Seite sie zeigt. */
export interface PadAxisState {
  index: number;
  code: string;
  label: string;
  value: number;
}

/** Ein Bild vom Pad, vollständig: jede Taste, jede Achse, nichts gedeutet. */
export interface PadSnapshot {
  kind: PadKind;
  buttons: PadButtonState[];
  axes: PadAxisState[];
  /** Nur die gedrückten, in der Reihenfolge der Nummern. */
  pressed: PadButtonState[];
}

/** So viel vom Browser-`Gamepad` braucht diese Datei — ein echtes passt hinein. */
export interface PadLike extends GamepadLike {
  readonly id?: string;
  readonly mapping?: string;
  readonly index?: number;
  readonly buttons: readonly {
    readonly pressed?: boolean;
    readonly value?: number;
    readonly touched?: boolean;
  }[];
}

/**
 * **Ab wann ein Knopf auf dieser Seite gedrückt ist.**
 *
 * Es wäre verlockend, hier allein `button.pressed` zu glauben — das API sagt
 * es doch selbst. Aber ein analoger Trigger, dessen Treiber `pressed` gar nicht
 * setzt, wäre dann ein Knopf, der sich nie rührt, und genau deswegen kommt
 * jemand auf diese Seite. Also dieselbe Schwelle wie im Spiel
 * (`core/gamepad.TRIGGER_THRESHOLD`): Was die Spielwiese für gedrückt hält,
 * hält diese Seite auch dafür — sonst zeigt sie ein Pad, das anders wäre als
 * das, mit dem man gleich spielt.
 */
export function padButtonPressed(
  button: { readonly pressed?: boolean; readonly value?: number } | undefined,
): boolean {
  if (!button) return false;
  return button.pressed === true || (button.value ?? 0) >= TRIGGER_THRESHOLD;
}

/**
 * **Ein Bild vom Pad.** Ohne Pad — oder mit einem abgemeldeten — kommt ein
 * leeres zurück, damit die Seite nichts abfangen muss.
 *
 * Die Zahlen werden dabei nicht geglättet und nicht auf eine Totzone geprüft:
 * Dass ein ruhender Stick 0,03 meldet, ist im Spiel ein Fehler, den
 * `core/gamepad.ts` wegrechnet — hier ist es die Antwort auf die Frage, warum
 * die Figur von allein läuft. Eine Diagnoseseite, die schönt, taugt nichts.
 */
export function padSnapshot(pad: PadLike | null | undefined): PadSnapshot {
  const kind = padKind(pad?.id);
  const snapshot: PadSnapshot = { kind, buttons: [], axes: [], pressed: [] };
  if (!pad || pad.connected === false) return snapshot;

  for (let index = 0; index < pad.buttons.length; index++) {
    const button = pad.buttons[index];
    const raw = button?.value;
    const value = typeof raw === 'number' && Number.isFinite(raw) ? clamp01(raw) : 0;
    const state: PadButtonState = {
      index,
      code: padButtonCode(index),
      label: padButtonLabel(index, kind),
      icon: padButtonIcon(index, kind),
      slot: padButtonSlot(index),
      pressed: padButtonPressed(button),
      value: button?.pressed && value === 0 ? 1 : value,
      touched: button?.touched === true,
      analog: value > 0 && value < 1,
    };
    snapshot.buttons.push(state);
    if (state.pressed) snapshot.pressed.push(state);
  }

  for (let index = 0; index < pad.axes.length; index++) {
    const raw = pad.axes[index];
    snapshot.axes.push({
      index,
      code: padAxisCode(index),
      label: padAxisLabel(index),
      value: typeof raw === 'number' && Number.isFinite(raw) ? raw : 0,
    });
  }
  return snapshot;
}

/** Welche Nummern gerade anliegen — die kürzeste Form eines Bildes. */
export function pressedIndices(snapshot: PadSnapshot): number[] {
  return snapshot.pressed.map((button) => button.index);
}

/** Eine Flanke: derselbe Knopf, aber jetzt anders als im Bild davor. */
export interface PadEdge {
  index: number;
  code: string;
  label: string;
  icon: string;
  /** `true` heißt gedrückt, `false` losgelassen. */
  down: boolean;
  /** Wie weit er beim Drücken durchgedrückt war — beim Loslassen 0. */
  value: number;
}

/**
 * **Was sich seit dem letzten Bild geändert hat.**
 *
 * Das Panel braucht Flanken und nicht Zustände: „welcher Knopf wird gerade
 * erkannt" ist die Frage nach dem Drücken, und ein Knopf, der dreißigmal pro
 * Sekunde dasselbe meldet, schreibt dreißig gleiche Zeilen ins Protokoll. Der
 * Vergleich läuft über die Nummern und nicht über die Liste: Ein Pad, das
 * zwischen zwei Bildern mehr Knöpfe meldet als vorher (ein Adapter, der
 * nachlädt), ist damit einfach ein Pad mit neuen Nummern und kein Absturz.
 */
export function padEdges(before: readonly boolean[], snapshot: PadSnapshot): PadEdge[] {
  const edges: PadEdge[] = [];
  for (const button of snapshot.buttons) {
    const was = before[button.index] === true;
    if (was === button.pressed) continue;
    edges.push({
      index: button.index,
      code: button.code,
      label: button.label,
      icon: button.icon,
      down: button.pressed,
      value: button.pressed ? button.value : 0,
    });
  }
  return edges;
}

/** Das Gedächtnis für den nächsten Vergleich: gedrückt, nach Nummer. */
export function pressedMask(snapshot: PadSnapshot): boolean[] {
  const mask: boolean[] = [];
  for (const button of snapshot.buttons) mask[button.index] = button.pressed;
  return mask;
}

/**
 * **Das Pad in einer Zeile** — für die Kopfzeile der Seite und für den Text,
 * den man von einer Konsole aus in einen Chat schreibt.
 *
 * `mapping` gehört unbedingt dazu: Steht dort nicht `standard`, ist jede
 * Nummer auf dieser Seite die Nummer, die der Treiber sich ausgedacht hat, und
 * die Tabelle darüber ist eine Vermutung. Das muss dastehen, und zwar da, wo
 * man hinsieht.
 */
export function describePad(pad: PadLike | null | undefined): string {
  if (!pad) return 'kein Pad';
  const kind = PAD_KIND_LABELS[padKind(pad.id)];
  const mapping =
    pad.mapping === 'standard' ? 'Standard-Mapping' : `Mapping „${pad.mapping || '—'}"`;
  return [
    pad.id || 'Pad ohne Kennung',
    kind,
    mapping,
    `${pad.buttons.length} Knöpfe`,
    `${pad.axes.length} Achsen`,
  ].join(' · ');
}

/**
 * **Alle Pads, die wirklich da sind** — mit ihrem Platz in der Liste.
 *
 * `navigator.getGamepads()` liefert feste Plätze, und die leeren stehen auf
 * `null`; nach dem Abziehen bleibt ein Loch in der Mitte. `firstGamepad` in
 * `core/gamepad.ts` sucht deshalb das erste echte und lässt den Rest liegen —
 * diese Seite will sie alle, weil zwei angesteckte Pads genau die Lage sind,
 * in der man sich fragt, welches von beiden das Spiel hört (nämlich das erste).
 */
export function connectedPads<T extends PadLike>(
  pads: readonly (T | null)[] | null | undefined,
): { slot: number; pad: T }[] {
  if (!pads) return [];
  const found: { slot: number; pad: T }[] = [];
  for (let slot = 0; slot < pads.length; slot++) {
    const pad = pads[slot];
    if (pad && pad.connected !== false) found.push({ slot, pad });
  }
  return found;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
