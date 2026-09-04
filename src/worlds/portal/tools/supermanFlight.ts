import type { SupermanSettings, SupermanSource } from './supermanSettings';

/**
 * Aus Hand und Kopf wird Fahrt: die Rechnung hinter dem Supermanhandschuh.
 *
 * Die Hand ist ein Steuerknüppel. Wo sie beim Drücken des Triggers war, ist
 * die Mitte; wie weit sie seitdem gelehnt hat, ist der Ausschlag. Neu ist,
 * was daraus wird: **eine volle Lehne ist volle Fahrt**, und volle Fahrt sagt
 * für jede Richtung eine eigene Einstellung. Vorher stand da ein fester Faktor
 * pro Meter, und der hat aus einer bequemen Handbewegung zweieinhalb Meter pro
 * Sekunde gemacht — die Höchstgeschwindigkeit lag jenseits eines
 * ausgestreckten Arms und war damit nur theoretisch da.
 *
 * Der Kopf kann dieselben Achsen bedienen: der Blick nach unten schiebt
 * (tauchen heißt beschleunigen), der Blick nach oben steigt, und der vom
 * Flugweg weggedrehte Kopf zieht die Kurve — letzteres umso stärker, je
 * schneller es geht, damit Umsehen im Schweben niemanden im Kreis dreht.
 * Welche Achse an wem hängt, sagt die Einstellung; „beide“ addiert und
 * begrenzt wieder auf voll.
 *
 * Kein three.js: hier stehen nur Zahlen, und die Vorzeichen dieser Zahlen sind
 * genau die Sorte Fehler, die man in der Brille erst merkt, wenn man rückwärts
 * in eine Wand fliegt. Deshalb steht das hier und nicht im Werkzeug.
 */

/** So weit über der Totzone lehnt eine Hand für volle Fahrt, in Metern. */
export const FULL_LEAN = 0.22;
/** So weit darf der Kopf von der Waagerechten weg, ohne dass er lenkt, in Grad. */
export const HEAD_DEADZONE = 12;
/** Um so viel Grad geneigt gibt der Kopf vollen Ausschlag. */
export const FULL_HEAD_PITCH = 45;
/** So weit vom Flugweg weggedreht zieht der Kopf die vollste Kurve, in Grad. */
export const FULL_HEAD_YAW = 55;

/** Was Hand und Kopf gerade tun — alles in Metern bzw. Grad. */
export interface FlightInput {
  /** Lehne der Hand entlang der flachen Blickrichtung, + = nach vorn. */
  ahead: number;
  /** Lehne der Hand nach oben. */
  lift: number;
  /** Lehne der Hand nach rechts. */
  side: number;
  /** Neigung des Kopfes, + = nach oben geschaut. */
  headPitch: number;
  /** Wie weit der Kopf vom Flugweg weg zeigt, + = nach links. */
  headYaw: number;
}

/** Was daraus wird. Geschwindigkeiten in m/s, die Drehung in Grad pro Sekunde. */
export interface FlightCommand {
  /** Entlang der Blickrichtung, negativ = rückwärts. */
  ahead: number;
  /** Senkrecht nach oben, negativ = sinken. */
  lift: number;
  /** Quer zum Flugweg nach rechts. */
  side: number;
  /** + = nach links herum. */
  turn: number;
}

/** Der eine Aufruf: Ausschläge rein, Geschwindigkeiten raus. */
export function flightCommand(input: FlightInput, settings: SupermanSettings): FlightCommand {
  const deadzone = settings.deadzone / 100;

  // Kopf nach unten schiebt nach vorn: wer taucht, wird schneller.
  const drive = combine(
    settings.drive,
    handThrottle(input.ahead, deadzone),
    headThrottle(-input.headPitch, FULL_HEAD_PITCH),
  );
  const lift = combine(
    settings.lift,
    handThrottle(input.lift, deadzone),
    headThrottle(input.headPitch, FULL_HEAD_PITCH),
  );

  // Die Hand nach rechts dreht nach rechts, und rechts herum ist die negative
  // Richtung — genau wie beim Snap-Turn.
  const handSide = handThrottle(input.side, deadzone);
  const turnByHand = settings.strafe ? 0 : -handSide;
  // Der Kopf redet umso lauter mit, je schneller es geht. Im Schweben redet er
  // gar nicht, sonst dreht sich beim Umsehen die ganze Welt.
  const turnByHead = headThrottle(input.headYaw, FULL_HEAD_YAW) * Math.abs(drive);

  return {
    ahead: drive >= 0 ? drive * settings.forward : drive * settings.back,
    lift: lift >= 0 ? lift * settings.up : lift * settings.down,
    side: settings.strafe ? handSide * settings.side : 0,
    turn: combine(settings.yaw, turnByHand, turnByHead) * settings.turn,
  };
}

/** Wie weit der Knüppel steht, -1 … 1. */
function handThrottle(lean: number, deadzone: number): number {
  return clamp(deadband(lean, deadzone) / FULL_LEAN, -1, 1);
}

/** Dasselbe für einen Winkel in Grad. */
function headThrottle(degrees: number, full: number): number {
  return clamp(deadband(degrees, HEAD_DEADZONE) / (full - HEAD_DEADZONE), -1, 1);
}

/** Wer die Achse bedient — „beide“ addiert und begrenzt wieder auf voll. */
function combine(source: SupermanSource, hand: number, head: number): number {
  if (source === 'hand') return hand;
  if (source === 'kopf') return head;
  if (source === 'beide') return clamp(hand + head, -1, 1);
  return 0;
}

/** Was von einem Wert übrig bleibt, wenn seine Totzone abgezogen ist. */
export function deadband(value: number, threshold: number): number {
  const amount = Math.abs(value) - threshold;
  if (amount <= 0) return 0;
  return Math.sign(value) * amount;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
