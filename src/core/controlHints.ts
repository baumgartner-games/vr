import { padSlotIcon, type PadKind } from './gamepadReport';
import {
  keyLabel,
  keysFor,
  padSlotsFor,
  type InputConfig,
  type KeyAction,
  type PadAction,
} from './inputMap';

/**
 * **Die Tastenhilfe** — eine Zeile unten im Bild, die sagt, welcher Knopf
 * gerade was tut: „Ⓐ Benutzen · Ⓑ Ablegen · ☰ Menü".
 *
 * Gewünscht war, dass sich die Steuerung in allen Ansichten gleich anfühlt —
 * und dazu gehört, dass man nicht in einer Tabelle nachlesen muss, welcher
 * Knopf in _dieser_ Ansicht mit _diesem_ Gerät das Menü aufmacht. Die Zeile
 * passt sich deshalb an drei Dinge an:
 *
 * - **das Gerät**, mit dem zuletzt bedient wurde (Tastatur und Maus, Pad,
 *   Finger — `ui/padNav.ts` merkt es sich),
 * - **die Ansicht** (aus den Augen, von oben, als Kran) und ob ein **Menü**
 *   davorliegt,
 * - **die Lage**: Steht etwas in Reichweite, heißt `A` _Benutzen_, sonst
 *   _Springen_; trägt die Figur etwas, kommt _Ablegen_ dazu; hält die Hand
 *   ein Werkzeug, der Auslöser.
 *
 * Und sie liest die **Belegung** (`core/inputMap.ts`) und die **Marke** des
 * Pads (`gamepadReport.padSlotIcon`): Wer _Benutzen_ auf `F` gelegt hat, liest
 * `F`, und wer eine PlayStation hält, liest `✕` statt `A`. Eine Hilfe, die
 * die Voreinstellung aufsagt, während etwas anderes gilt, ist schlimmer als
 * keine.
 *
 * Reine Rechnung, kein DOM — gezeichnet wird in `ui/ControlHints.ts`.
 */

export type HintDevice = 'keyboard' | 'pad' | 'touch';

export type HintView = 'firstPerson' | 'topDown' | 'crane';

export interface HintContext {
  readonly device: HintDevice;
  readonly view: HintView;
  /** Was vor dem Spiel liegt: das Menü, die Werkzeugliste — oder nichts. */
  readonly menu: 'menu' | 'tools' | null;
  /** Bietet die Welt Werkzeuge an (`#hud-tool` steht da)? */
  readonly tools: boolean;
  /** Steht etwas in Reichweite (`PlayerRig.useCandidate`)? */
  readonly useCandidate: boolean;
  /** Trägt die Figur etwas (`PlayerRig.carrying`)? */
  readonly carrying: boolean;
  /** Hält die Hand ein Werkzeug mit Auslöser (`PlayerRig.armed`)? */
  readonly armed: boolean;
  /** Welche Aufschrift das Pad hat. */
  readonly padKind: PadKind;
  readonly config: InputConfig;
}

/** Ein Eintrag der Zeile: was man drückt, und was dann passiert. */
export interface HintItem {
  readonly key: string;
  readonly label: string;
}

/** Die Zeile für diesen Augenblick — leer heißt: nichts zeigen. */
export function controlHints(ctx: HintContext): HintItem[] {
  if (ctx.device === 'pad') return padHints(ctx);
  if (ctx.device === 'touch') return touchHints(ctx);
  return keyHints(ctx);
}

/** Die Zeile als Text, zum Vergleichen und für Screenreader. */
export function hintText(items: readonly HintItem[]): string {
  return items.map((item) => `${item.key} ${item.label}`).join(' · ');
}

function padHints(ctx: HintContext): HintItem[] {
  const pad = (action: PadAction): string | null => {
    const slot = padSlotsFor(ctx.config, action)[0];
    return slot ? padSlotIcon(slot, ctx.padKind) : null;
  };
  const out: HintItem[] = [];
  const add = (key: string | null, label: string): void => {
    if (key) out.push({ key, label });
  };
  if (ctx.menu === 'menu') {
    add('✥', 'Wählen');
    add(pad('use'), 'OK');
    add(pad('cancel'), 'Zurück');
    add(pairKey(pad('zoomIn'), pad('zoomOut')), 'Seite');
    add(pad('menu'), 'Schließen');
    return out;
  }
  if (ctx.menu === 'tools') {
    add('✥', 'Wählen');
    add(pad('use'), 'Nehmen');
    add(pad('cancel'), 'Schließen');
    return out;
  }
  if (ctx.view === 'crane') {
    add(pad('use'), 'Nehmen/Stellen');
    add('LS', 'Kamera');
    add('RS', 'Drehen');
    add(pairKey(pad('zoomIn'), pad('zoomOut')), 'Zoom');
    add(pad('menu'), 'Menü');
    return out;
  }
  add(pad('use'), ctx.useCandidate || ctx.carrying ? 'Benutzen' : 'Springen');
  if (ctx.carrying) add(pad('cancel'), 'Ablegen');
  if (ctx.armed || ctx.view === 'topDown') add(pad('fire'), 'Auslösen');
  if (ctx.armed && ctx.view === 'firstPerson') add(pad('sight'), 'Zielen');
  if (ctx.tools) add(pad('tools'), 'Werkzeug');
  if (ctx.view === 'topDown') add(pairKey(pad('zoomIn'), pad('zoomOut')), 'Zoom');
  add(pad('view'), 'Ansicht');
  add(pad('menu'), 'Menü');
  return out;
}

function keyHints(ctx: HintContext): HintItem[] {
  const key = (action: KeyAction): string | null => {
    const code = keysFor(ctx.config, action)[0];
    return code ? keyLabel(code) : null;
  };
  const out: HintItem[] = [];
  const add = (label: string | null, what: string): void => {
    if (label) out.push({ key: label, label: what });
  };
  if (ctx.menu === 'menu') {
    add('↑↓←→', 'Wählen');
    add('Eingabe', 'OK');
    add('Rücktaste', 'Zurück');
    add('Esc', 'Schließen');
    return out;
  }
  if (ctx.menu === 'tools') {
    add('↑↓', 'Wählen');
    add('Eingabe', 'Nehmen');
    add(key('tools'), 'Schließen');
    return out;
  }
  if (ctx.view === 'crane') {
    add('Klick', 'Nehmen/Stellen');
    add(moveKeys(ctx), 'Kamera');
    add('R', 'Drehen');
    add('Rad', 'Zoom');
    add(key('menu'), 'Menü');
    return out;
  }
  if (ctx.useCandidate || ctx.carrying) add(key('use'), 'Benutzen');
  if (ctx.carrying) add('Klick', 'Ablegen');
  add(key('jump'), 'Springen');
  if (!ctx.carrying && (ctx.armed || ctx.view === 'topDown')) add('Klick', 'Auslösen');
  if (ctx.armed && ctx.view === 'firstPerson') add('Rechtsklick', 'Zielen');
  if (ctx.tools) add(key('tools'), 'Werkzeug');
  if (ctx.view === 'topDown') add('Rad', 'Zoom');
  add(key('view'), 'Ansicht');
  add(key('menu'), 'Menü');
  return out;
}

/**
 * **Am Glas steht die Bedienung schon auf den Knöpfen** — `A`, der Auslöser,
 * ☰. Die Zeile sagt deshalb nur, was man den Knöpfen nicht ansieht: dass `A`
 * zwei Dinge kann.
 */
function touchHints(ctx: HintContext): HintItem[] {
  if (ctx.menu) return [];
  if (ctx.view === 'crane') return [{ key: 'Finger', label: 'Kran stellen' }];
  return [{ key: 'A', label: ctx.useCandidate ? 'Benutzen' : 'Springen' }];
}

/** `WASD`, wenn es noch so belegt ist — sonst die vier Tasten, wie sie liegen. */
function moveKeys(ctx: HintContext): string {
  const four = (['forward', 'left', 'back', 'right'] as const).map(
    (action) => keysFor(ctx.config, action)[0] ?? '',
  );
  if (four.every((code) => /^Key[A-Z]$/.test(code))) return four.map(keyLabel).join('');
  return four.map((code) => (code ? keyLabel(code) : '–')).join(' ');
}

/** Zwei Knöpfe, die zusammen eine Sache tun (LB/RB) — oder der eine, den es gibt. */
function pairKey(a: string | null, b: string | null): string | null {
  if (a && b) return `${a}/${b}`;
  return a ?? b;
}
