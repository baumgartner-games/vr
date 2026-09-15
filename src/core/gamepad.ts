/**
 * **Das Gamepad, als reine Rechnung.**
 *
 * Von oben gespielt wird mit zwei Sticks (`docs/plan-2d-hub-interaktion.md`,
 * E4): links laufen, rechts zielen, `A` benutzen, `B` schießen, `Y` die
 * Werkzeugliste. Das Browser-API
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
  /** `A` — benutzen. */
  use: boolean;
  /** `B` oder der rechte Trigger — schießen. */
  fire: boolean;
  /** Wie weit der rechte Trigger durchgedrückt ist, 0…1; `B` zählt als ganz. */
  trigger: number;
  /** Linken Stick reingedrückt — sprinten, wie in der Brille. */
  sprint: boolean;
  /** LB: eine Zoomstufe **heran**. */
  zoomIn: boolean;
  /** RB: eine Zoomstufe **zurück**. */
  zoomOut: boolean;
  /** `Y`: die Werkzeugliste auf- und zuklappen (`#hud-tool`). */
  tools: boolean;
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
 * `Y` (oben) — die Werkzeugliste. Der vierte Knopf der Raute ist der einzige,
 * der noch frei war: `A` benutzt, `B` schießt, `X` gehört keinem.
 */
export const BUTTON_Y = 3;
export const BUTTON_LB = 4;
export const BUTTON_RB = 5;
export const BUTTON_RT = 7;
export const BUTTON_LS = 10;

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
    fire: false,
    trigger: 0,
    sprint: false,
    zoomIn: false,
    zoomOut: false,
    tools: false,
  };
}

/**
 * **Ein Bild vom Pad.** `null` oder ein abgemeldetes Pad ergibt ein leeres
 * Bild — der Aufrufer muss nichts abfangen.
 */
export function readGamepad(pad: GamepadLike | null | undefined): GamepadFrame {
  const frame = emptyFrame();
  if (!pad || pad.connected === false) return frame;
  frame.connected = true;
  stick(pad, AXIS_MOVE_X, AXIS_MOVE_Y, frame.move);
  stick(pad, AXIS_AIM_X, AXIS_AIM_Y, frame.aim);
  frame.use = pressed(pad, BUTTON_A);
  frame.sprint = pressed(pad, BUTTON_LS);
  frame.zoomIn = pressed(pad, BUTTON_LB);
  frame.zoomOut = pressed(pad, BUTTON_RB);
  frame.tools = pressed(pad, BUTTON_Y);
  // Der Trigger ist analog, `B` ist es nicht: Wer mit `B` schießt, drückt ganz
  // durch. So kommt aus beiden Wegen **eine** Zahl heraus, und die Waffe muss
  // nicht wissen, woher sie kam.
  const trigger = value(pad, BUTTON_RT);
  const b = pressed(pad, BUTTON_B);
  frame.trigger = Math.max(b ? 1 : 0, trigger);
  frame.fire = b || pressed(pad, BUTTON_RT);
  return frame;
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
