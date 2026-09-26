/**
 * **Das Gamepad, als reine Rechnung.**
 *
 * Von oben gespielt wird mit zwei Sticks (`docs/plan-2d-hub-interaktion.md`,
 * E4): links laufen, rechts zielen, `A` benutzen, `B` zurück, `Y` die
 * Werkzeugliste, der rechte Trigger schießt — das Schema steht in
 * `docs/agents/steuerung.md` ganz oben. Das Browser-API
 * dafür ist eine einzige Zeile — `navigator.getGamepads()` —, und alles, was
 * danach kommt, sind Zahlen: Welche Achse ist welcher Stick, ab wann ist ein
 * Stick wirklich ausgelenkt, und was davon bleibt übrig, wenn ein Pad weniger
 * Achsen meldet als das Standard-Mapping vorsieht. Genau das steht hier, ohne
 * three.js, ohne DOM und ohne `navigator`, damit ein Test es nachrechnen kann —
 * im Container steckt kein Controller, und ein Stück Eingabe, das man nur mit
 * Hardware in der Hand prüfen kann, ist ungeprüft.
 *
 * **Kein Plugin, keine Abstraktionsschicht.** Das Standard-Mapping
 * (`gamepad.mapping === 'standard'`) liegt bei Xbox- wie PlayStation-Pads
 * gleich, und die Knöpfe, die diese Spielwiese braucht, stehen unten als
 * benannte Konstanten. Wer ein exotisches Pad anschließt, bekommt das, was
 * dessen Treiber unter diesen Nummern meldet — das ist mehr, als ein
 * Mapping-Tabellenwerk je aktuell halten könnte.
 */

/**
 * So viel vom Browser-`Gamepad` braucht diese Datei — und der Test braucht
 * nicht mehr, um eines nachzubauen. Ein echtes `Gamepad` passt hier hinein.
 */
export interface GamepadLike {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed?: boolean; readonly value?: number }[];
  readonly connected?: boolean;
}

/** Eine Stickauslenkung: rechts ist +x, **unten** ist +y (so zählt das API). */
export interface Stick {
  x: number;
  y: number;
}

/** Was ein Bild lang am Pad anliegt — Flanken macht daraus der Leser. */
export interface GamepadFrame {
  /** Ob überhaupt ein Pad da war. Alles andere steht dann auf null/false. */
  connected: boolean;
  /** Linker Stick: laufen. */
  move: Stick;
  /** Rechter Stick: zielen. */
  aim: Stick;
  /** `A` — benutzen und bestätigen. */
  use: boolean;
  /** `B` — zurück, abbrechen, ablegen. */
  cancel: boolean;
  /** ☰ (Start/Options) — das Menü. */
  menu: boolean;
  /** Der rechte Trigger — schießen. */
  fire: boolean;
  /** Wie weit der rechte Trigger durchgedrückt ist, 0…1. */
  trigger: number;
  /** Der linke Trigger — aus den Augen über die Waffe zielen. */
  sight: boolean;
  /** ⊟ (Select/View) — von oben ↔ aus den Augen. */
  view: boolean;
  /** Linken Stick reingedrückt — sprinten, wie in der Brille. */
  sprint: boolean;
  /** LB: eine Zoomstufe **heran**. */
  zoomIn: boolean;
  /** RB: eine Zoomstufe **zurück**. */
  zoomOut: boolean;
  /** `Y`: die Werkzeugliste auf- und zuklappen (`#hud-tool`). */
  tools: boolean;
  /** Steuerkreuz ←: von oben das Bild eine Vierteldrehung nach links. */
  turnLeft: boolean;
  /** Steuerkreuz →: dasselbe nach rechts. */
  turnRight: boolean;
  /** Steuerkreuz ↑: im Baukasten das Werkzeug davor. */
  toolPrev: boolean;
  /** Steuerkreuz ↓: im Baukasten das Werkzeug danach. */
  toolNext: boolean;
}

/**
 * **Die Totzone.** Ein Stick, den niemand anfasst, meldet selten glatt null:
 * ein paar Prozent Drift sind normal, und eine Figur, die von allein nach
 * Nordwest läuft, ist ein kaputtes Spiel. 0,2 ist der Wert, mit dem auch
 * Konsolentitel rechnen.
 */
export const DEAD_ZONE = 0.2;

/** Ab wann ein analoger Trigger als gedrückt gilt (der Xbox-Wert ist 0…1). */
export const TRIGGER_THRESHOLD = 0.35;

/** Standard-Mapping: Knopfnummern, die diese Spielwiese benutzt. */
export const BUTTON_A = 0;
export const BUTTON_B = 1;
/**
 * `Y` (oben) — die Werkzeugliste. `A` benutzt, `B` geht zurück, `X` gehört
 * keinem.
 */
export const BUTTON_Y = 3;
export const BUTTON_LB = 4;
export const BUTTON_RB = 5;
export const BUTTON_LT = 6;
export const BUTTON_RT = 7;
/** ⊟ — Select, View, Create, Minus: die Ansicht. */
export const BUTTON_SELECT = 8;
/** ☰ — Start, Menu, Options, Plus: das Menü. */
export const BUTTON_START = 9;
export const BUTTON_LS = 10;
/** Das Steuerkreuz im Standard-Mapping: oben, unten, links, rechts. */
export const BUTTON_DPAD_UP = 12;
export const BUTTON_DPAD_DOWN = 13;
export const BUTTON_DPAD_LEFT = 14;
export const BUTTON_DPAD_RIGHT = 15;

/** Achsnummern: linker Stick 0/1, rechter 2/3. */
export const AXIS_MOVE_X = 0;
export const AXIS_MOVE_Y = 1;
export const AXIS_AIM_X = 2;
export const AXIS_AIM_Y = 3;

/** Ein Bild ohne Pad — dieselbe Form, nur leer. */
export function emptyFrame(): GamepadFrame {
  return {
    connected: false,
    move: { x: 0, y: 0 },
    aim: { x: 0, y: 0 },
    use: false,
    cancel: false,
    menu: false,
    fire: false,
    trigger: 0,
    sight: false,
    view: false,
    sprint: false,
    zoomIn: false,
    zoomOut: false,
    tools: false,
    turnLeft: false,
    turnRight: false,
    toolPrev: false,
    toolNext: false,
  };
}

/**
 * **Welche Nummer welche Absicht auslöst** — je Absicht eine Liste, weil
 * eine Belegung einer Absicht mehrere Stellen geben darf.
 *
 * Ohne diesen Plan gilt der ab Werk (`DEFAULT_PLAN`), und damit Zeile für
 * Zeile das, was dieses Projekt immer hatte. Wer einen Plan mitgibt, hat ihn
 * aus Belegung und Gerätekarte gerechnet (`core/inputMap.padPlan`) — dieses
 * Modul weiß von beidem nichts und muss es nicht: Es liest Nummern.
 */
export interface ButtonPlan {
  readonly use: readonly number[];
  readonly cancel: readonly number[];
  readonly menu: readonly number[];
  readonly fire: readonly number[];
  readonly sight: readonly number[];
  readonly view: readonly number[];
  readonly sprint: readonly number[];
  readonly tools: readonly number[];
  readonly zoomIn: readonly number[];
  readonly zoomOut: readonly number[];
  readonly turnLeft: readonly number[];
  readonly turnRight: readonly number[];
  readonly toolPrev: readonly number[];
  readonly toolNext: readonly number[];
}

/** Der Plan ab Werk: die Knopfnummern von oben, in Listen. */
export const DEFAULT_PLAN: ButtonPlan = {
  use: [BUTTON_A],
  cancel: [BUTTON_B],
  menu: [BUTTON_START],
  fire: [BUTTON_RT],
  sight: [BUTTON_LT],
  view: [BUTTON_SELECT],
  sprint: [BUTTON_LS],
  tools: [BUTTON_Y],
  zoomIn: [BUTTON_LB],
  zoomOut: [BUTTON_RB],
  turnLeft: [BUTTON_DPAD_LEFT],
  turnRight: [BUTTON_DPAD_RIGHT],
  toolPrev: [BUTTON_DPAD_UP],
  toolNext: [BUTTON_DPAD_DOWN],
};

/**
 * **Ein Bild vom Pad.** `null` oder ein abgemeldetes Pad ergibt ein leeres
 * Bild — der Aufrufer muss nichts abfangen.
 */
export function readGamepad(
  pad: GamepadLike | null | undefined,
  plan: ButtonPlan = DEFAULT_PLAN,
): GamepadFrame {
  const frame = emptyFrame();
  if (!pad || pad.connected === false) return frame;
  frame.connected = true;
  stick(pad, AXIS_MOVE_X, AXIS_MOVE_Y, frame.move);
  stick(pad, AXIS_AIM_X, AXIS_AIM_Y, frame.aim);
  frame.use = any(pad, plan.use);
  frame.cancel = any(pad, plan.cancel);
  frame.menu = any(pad, plan.menu);
  frame.sight = any(pad, plan.sight);
  frame.view = any(pad, plan.view);
  frame.sprint = any(pad, plan.sprint);
  frame.zoomIn = any(pad, plan.zoomIn);
  frame.zoomOut = any(pad, plan.zoomOut);
  frame.tools = any(pad, plan.tools);
  frame.turnLeft = any(pad, plan.turnLeft);
  frame.turnRight = any(pad, plan.turnRight);
  frame.toolPrev = any(pad, plan.toolPrev);
  frame.toolNext = any(pad, plan.toolNext);
  // **Ein Zug, aus welchem Knopf er auch kommt.** Der Trigger ist analog, ein
  // Knopf, den jemand auf _Schießen_ legt, ist es nicht: Er drückt ganz durch
  // — ein gedrückter Schalter meldet den Wert 1, und wo der Wert fehlt, macht
  // `value` daraus eine 1. Also genügt das Maximum über die Knöpfe der Absicht, und die
  // Waffe muss nicht wissen, woher der Zug kam.
  let trigger = 0;
  for (const index of plan.fire) trigger = Math.max(trigger, value(pad, index));
  frame.trigger = trigger;
  frame.fire = any(pad, plan.fire);
  return frame;
}

/**
 * **Ob der Zielstock gerade ausgelenkt ist** — über beide Geber, die es dafür
 * am Schirm gibt.
 *
 * Gezielt wird von oben mit dem **rechten Stock**, und den gibt es zweimal:
 * als echten am Pad (`GamepadFrame.aim`) und als gemalten auf dem Glas
 * (`core/FlatControls.ts`, `#pad-aim`). Dass beide dasselbe meinen, steht
 * schon in `FlatControls.aimYaw`; **ob** einer von ihnen liegt, ist dieselbe
 * Frage und steht deshalb hier — einmal, als Rechnung, die ein Test ohne
 * Finger und ohne Pad nachprüft.
 *
 * **Zwei Zahlen für zwei Geber**, und das ist kein Versehen: Der Stock am Pad
 * hat seine Totzone schon hinter sich (`readGamepad` gibt darin glatt null
 * zurück, `stick`), der auf dem Glas hat keine — ein Finger, der einen
 * Bildpunkt weit rutscht, meldet dort eine Auslenkung. Also bekommt der
 * zweite hier dieselbe Totzone, mit der der erste schon gerechnet hat.
 *
 * Wer danach fragt, ist der **Feuerlöscher**: Er geht an, solange gezielt wird
 * (`worlds/test/zones/kitchenSpray.sprayAims`).
 */
export function aimHeld(pad: Stick, touch: Stick): boolean {
  return Math.hypot(pad.x, pad.y) > 0 || Math.hypot(touch.x, touch.y) > DEAD_ZONE;
}

/** Ob **irgendeiner** der Knöpfe dieser Absicht anliegt. */
function any(pad: GamepadLike, indices: readonly number[]): boolean {
  for (const index of indices) {
    if (pressed(pad, index)) return true;
  }
  return false;
}

/**
 * **Das erste Pad, das wirklich da ist.** `navigator.getGamepads()` liefert
 * vier Plätze, und die leeren stehen auf `null`; nach dem Abziehen bleibt ein
 * Loch in der Mitte. Geprüft wird deshalb die Liste und nicht der Platz null.
 */
export function firstGamepad(
  pads: readonly (GamepadLike | null)[] | null | undefined,
): GamepadLike | null {
  if (!pads) return null;
  for (const pad of pads) {
    if (pad && pad.connected !== false) return pad;
  }
  return null;
}

/**
 * **Totzone rund, nicht je Achse.** Eine quadratische Totzone lässt einen
 * Stick, den man diagonal ganz leicht hält, auf einer Achse noch durch — die
 * Figur zuckt dann in Richtung Norden statt stillzustehen. Und darüber wird
 * neu skaliert: Direkt hinter der Totzone soll die Figur **langsam** anlaufen
 * und nicht mit 20 % Tempo anspringen. Die Länge wird dabei auf 1 gedeckelt,
 * denn diagonal ganz ausgelenkt meldet mancher Treiber 1,41.
 */
function stick(pad: GamepadLike, ax: number, ay: number, out: Stick): Stick {
  const x = axis(pad, ax);
  const y = axis(pad, ay);
  const length = Math.hypot(x, y);
  if (length <= DEAD_ZONE) {
    out.x = 0;
    out.y = 0;
    return out;
  }
  const scale = Math.min(1, (length - DEAD_ZONE) / (1 - DEAD_ZONE)) / length;
  out.x = x * scale;
  out.y = y * scale;
  return out;
}

/** Eine Achse, die es vielleicht gar nicht gibt — dann null. */
function axis(pad: GamepadLike, index: number): number {
  const raw = pad.axes[index];
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function pressed(pad: GamepadLike, index: number): boolean {
  const button = pad.buttons[index];
  if (!button) return false;
  return button.pressed === true || (button.value ?? 0) >= TRIGGER_THRESHOLD;
}

function value(pad: GamepadLike, index: number): number {
  const button = pad.buttons[index];
  if (!button) return 0;
  const raw = button.value ?? (button.pressed ? 1 : 0);
  return Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 0;
}
