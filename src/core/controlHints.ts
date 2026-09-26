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

/**
 * **Eine Sonderzone mit eigener Bedienung** — die Welt sagt, wo man gerade
 * ist (`World.hintZone`), und die Zeile sagt dann, was dort anders ist:
 *
 * - `kart`: man sitzt am Steuer — Gas, Bremse, Lenken, Aussteigen;
 * - `burger`: im Burgerladen — `A` nimmt und legt ab, die Glocke öffnet;
 * - `build`: der Kran im _Baukasten_ — die Werkzeugleiste und ihr Wechsel;
 * - `haunting`: die Raumstation — je nach **Rolle**, denn der Techniker
 *   läuft, das Monster jagt, und wer an einer Karte sitzt, tippt.
 *
 * **Einheitlich formuliert**: Vorn steht der Name der Zone als Schildchen,
 * dann dieselben Verben wie überall (_Nehmen_, _Ablegen_, _Benutzen_,
 * _Drehen_, _Menü_), zuletzt das Menü. Was eine Zone nicht anders macht,
 * sagt sie nicht noch einmal.
 */
export type HintZone =
  | { readonly kind: 'kart' }
  | {
      readonly kind: 'burger';
      /** Liegt etwas in der Hand (ein Teller, ein Patty)? */
      readonly holding: boolean;
      /** Ist der Laden zu — dann öffnet die Glocke. */
      readonly closed: boolean;
      /**
       * **Was `A` am Gewählten genau tut** — „Servieren", „Abräumen",
       * „Spülen" (`plateup/plateUpHints.ts`). Fehlt es, heißt es allgemein
       * _Nehmen_ bzw. _Ablegen_.
       */
      readonly action?: string | null;
    }
  | {
      readonly kind: 'build';
      /** Welches Werkzeug der Leiste gilt (`portal/buildBar.BuildTool`). */
      readonly tool: 'place' | 'move' | 'erase' | 'copy' | 'floor' | 'wall';
    }
  | {
      readonly kind: 'haunting';
      /** Wer man ist: Techniker, Monster, eine Karte (Farbplätze) oder Zuschauer. */
      readonly role: 'technician' | 'monster' | 'map' | 'watch';
    };

/** Wie eine Zone auf ihrem Schildchen heißt. */
export const ZONE_LABELS: Readonly<Record<HintZone['kind'], string>> = {
  kart: 'Kart',
  burger: 'Burgerladen',
  build: 'Baukasten',
  haunting: 'Station',
};

type HauntingRole = Extract<HintZone, { kind: 'haunting' }>['role'];
type BuildToolName = Extract<HintZone, { kind: 'build' }>['tool'];

/** Was `A` bzw. ein Klick mit diesem Werkzeug tut. */
const BUILD_USE: Readonly<Record<BuildToolName, string>> = {
  place: 'Stellen',
  move: 'Nehmen/Stellen',
  erase: 'Löschen',
  copy: 'Kopieren',
  floor: 'Boden belegen',
  wall: 'Wand belegen',
};

/** Wie die Rollen der Station auf dem Schildchen heißen. */
const ROLE_LABELS: Readonly<Record<HauntingRole, string>> = {
  technician: 'Techniker',
  monster: 'Monster',
  map: 'Karte',
  watch: 'Zuschauer',
};

/** Wie die Werkzeuge der Baukasten-Leiste heißen — dieselben Wörter wie auf ihr. */
const TOOL_LABELS: Readonly<Record<BuildToolName, string>> = {
  place: 'Setzen',
  move: 'Verschieben',
  erase: 'Löschen',
  copy: 'Kopieren',
  floor: 'Boden',
  wall: 'Wand',
};

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
  /** Eine Sonderzone (`World.hintZone`) — oder nichts. */
  readonly zone?: HintZone | null;
}

/** Ein Eintrag der Zeile: was man drückt, und was dann passiert. */
export interface HintItem {
  readonly key: string;
  readonly label: string;
  /** Das Schildchen vorn: der Name der Zone, ohne Taste. */
  readonly tag?: boolean;
}

/** Die Zeile für diesen Augenblick — leer heißt: nichts zeigen. */
export function controlHints(ctx: HintContext): HintItem[] {
  if (ctx.zone && !ctx.menu) return zoneHints(ctx, ctx.zone);
  if (ctx.device === 'pad') return padHints(ctx);
  if (ctx.device === 'touch') return touchHints(ctx);
  return keyHints(ctx);
}

/** Die Zeile als Text, zum Vergleichen und für Screenreader. */
export function hintText(items: readonly HintItem[]): string {
  return items
    .map((item) => (item.tag ? `[${item.label}]` : `${item.key} ${item.label}`))
    .join(' · ');
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
    add(pairKey(pad('turnLeft'), pad('turnRight')), 'Bild drehen');
    add(pad('menu'), 'Menü');
    return out;
  }
  add(pad('use'), ctx.useCandidate || ctx.carrying ? 'Benutzen' : 'Springen');
  if (ctx.carrying) add(pad('cancel'), 'Ablegen');
  if (ctx.armed || ctx.view === 'topDown') add(pad('fire'), 'Auslösen');
  if (ctx.armed && ctx.view === 'firstPerson') add(pad('sight'), 'Zielen');
  if (ctx.tools) add(pad('tools'), 'Werkzeug');
  if (ctx.view === 'topDown') {
    add(pairKey(pad('zoomIn'), pad('zoomOut')), 'Zoom');
    add(pairKey(pad('turnLeft'), pad('turnRight')), 'Bild drehen');
  }
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
    add(key('turn'), 'Bild drehen');
    add(key('menu'), 'Menü');
    return out;
  }
  if (ctx.useCandidate || ctx.carrying) add(key('use'), 'Benutzen');
  if (ctx.carrying) add('Klick', 'Ablegen');
  add(key('jump'), 'Springen');
  if (!ctx.carrying && (ctx.armed || ctx.view === 'topDown')) add('Klick', 'Auslösen');
  if (ctx.armed && ctx.view === 'firstPerson') add('Rechtsklick', 'Zielen');
  if (ctx.tools) add(key('tools'), 'Werkzeug');
  if (ctx.view === 'topDown') {
    add('Rad', 'Zoom');
    add(key('turn'), 'Bild drehen');
  }
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

// --- die Sonderzonen --------------------------------------------------------

/**
 * **Die Zeile einer Sonderzone** (`HintZone`): vorn das Schildchen, dann was
 * dort anders ist, zuletzt das Menü — für jedes Gerät nach derselben
 * Ordnung, damit dieselbe Zone am Pad und an der Tastatur gleich klingt.
 */
function zoneHints(ctx: HintContext, zone: HintZone): HintItem[] {
  const pad = ctx.device === 'pad';
  const touch = ctx.device === 'touch';
  const padKey = (action: PadAction): string | null => {
    const slot = padSlotsFor(ctx.config, action)[0];
    return slot ? padSlotIcon(slot, ctx.padKind) : null;
  };
  const keyKey = (action: KeyAction): string | null => {
    const code = keysFor(ctx.config, action)[0];
    return code ? keyLabel(code) : null;
  };
  const out: HintItem[] = [];
  const add = (key: string | null, label: string): void => {
    if (key) out.push({ key, label });
  };
  const tag = (label: string): void => {
    out.push({ key: '', label, tag: true });
  };
  /** Am Glas steht ☰ schon als Knopf da — dort sagt die Zeile es nicht noch einmal. */
  const menu = (): void => {
    if (!touch) add(pad ? padKey('menu') : keyKey('menu'), 'Menü');
  };
  /** Das Bild drehen — nur von oben, und nicht am Glas (dort stehen ⟲ ⟳ als Knöpfe da). */
  const turn = (): void => {
    if (touch || ctx.view === 'firstPerson') return;
    add(pad ? pairKey(padKey('turnLeft'), padKey('turnRight')) : keyKey('turn'), 'Bild drehen');
  };
  /** Der Knopf für _Benutzen_ — am Glas heißt er `A`, wie er dasteht. */
  const use = pad ? padKey('use') : touch ? 'A' : keyKey('use');

  switch (zone.kind) {
    case 'kart':
      tag(ZONE_LABELS.kart);
      if (pad) {
        add(padKey('fire'), 'Gas');
        add(padKey('sight'), 'Bremse');
        add('LS', 'Lenken');
      } else if (!touch) {
        add(keyKey('forward'), 'Gas');
        add(keyKey('back'), 'Bremse');
        add(pairKey(keyKey('left'), keyKey('right')), 'Lenken');
      }
      add(use && `${use} halten`, 'Aussteigen');
      menu();
      return out;
    case 'burger':
      tag(ZONE_LABELS.burger);
      if (zone.closed) add(use, 'Glocke läuten');
      else if (ctx.useCandidate) add(use, zone.action ?? (zone.holding ? 'Ablegen' : 'Nehmen'));
      // Nichts in Reichweite: sagen, wo `A` etwas tut.
      else add(use, zone.holding ? 'an Platte/Tisch: Ablegen' : 'an der Kiste: Nehmen');
      turn();
      menu();
      return out;
    case 'build':
      tag(`${ZONE_LABELS.build}: ${TOOL_LABELS[zone.tool]}`);
      if (touch) {
        add('Finger', 'Kran stellen');
        return out;
      }
      if (pad) {
        add(padKey('use'), BUILD_USE[zone.tool]);
        add(pairKey(padKey('toolPrev'), padKey('toolNext')), 'Werkzeug');
        add('RS', 'Drehen');
        turn();
        add(pairKey(padKey('zoomIn'), padKey('zoomOut')), 'Zoom');
      } else {
        add('Klick', BUILD_USE[zone.tool]);
        add('R', 'Drehen');
        turn();
        add('Strg+Z', 'Rückgängig');
      }
      menu();
      return out;
    case 'haunting':
      tag(`${ZONE_LABELS.haunting}: ${ROLE_LABELS[zone.role]}`);
      if (zone.role === 'map' || zone.role === 'watch') {
        add(touch ? 'Finger' : 'Klick', zone.role === 'map' ? 'Karte bedienen' : 'Platz wählen');
        menu();
        return out;
      }
      if (zone.role === 'monster') {
        if (!touch) add(pad ? 'LS' : moveKeys(ctx), 'Jagen');
        add(use, 'Klappe/Tür');
        menu();
        return out;
      }
      if (ctx.useCandidate) add(use, 'Benutzen');
      if (!pad && !touch) {
        add('1', 'Sensor');
        add('2', 'Lampe/Medkit');
        add('Strg', 'Ducken');
      }
      turn();
      menu();
      return out;
  }
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
