/**
 * Gleiten: die Rechnung hinter dem Hängegleiter und den Flügeln.
 *
 * Kein Flugsimulator, sondern ein **Punkt mit einem Flügel dran**: Schwerkraft
 * zieht nach unten, der Flügel drückt quer zur Flugbahn nach oben, der
 * Widerstand bremst entlang der Bahn. Aus diesen drei Kräften kommt alles, was
 * ein Gleiter tut — im Bogen nach unten segeln, beim Ziehen schneller werden,
 * beim Drücken langsamer und irgendwann abkippen, und in der Schräglage eine
 * Kurve fliegen, weil der nach oben gekippte Auftrieb dann zur Seite drückt.
 *
 * Die Zahlen sind auf **Gefühl** abgestimmt, nicht auf ein Lehrbuch: `trimSpeed`
 * ist die Fahrt, bei der der Flügel bei neutralem Bügel genau das Gewicht
 * trägt, `glideRatio` sagt, wie viele Meter man dabei pro Meter Höhe weit
 * kommt. Beides gibt es je Fluggerät — der Hängegleiter ist ein Segelflügel,
 * die Flügel an den Armen sind es nicht ganz.
 *
 * Kein three.js: hier stehen nur Zahlen, und die Vorzeichen dieser Zahlen sind
 * genau die Sorte Fehler, die man in der Brille erst merkt, wenn der Bügel
 * nach links den Gleiter nach rechts dreht. Deshalb steht das hier und nicht im
 * Werkzeug, und deshalb gibt es einen Test dazu.
 */

/** Ein Vektor ohne three.js — damit der Test ohne Browser läuft. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Was ein Fluggerät ausmacht. */
export interface GlideParams {
  /** Fahrt bei neutralem Bügel, in m/s — dort trägt der Flügel genau das Gewicht. */
  trimSpeed: number;
  /** Meter Weg pro Meter Höhe bei Trimmfahrt. */
  glideRatio: number;
  /** Darunter lässt der Flügel los: Auftrieb weg, es geht nur noch nach unten. */
  stallSpeed: number;
  /** Größte Schräglage in Grad. */
  maxBank: number;
  /** Wie schnell die Schräglage der Eingabe folgt, in Grad pro Sekunde. */
  bankRate: number;
  /** Wie viel der Bügel am Auftrieb ändert: 0,6 heißt ±60 % bei vollem Ausschlag. */
  pitchAuthority: number;
}

/** Ein Segelflügel: schnell, flach, träge in der Kurve. */
export const HANG_GLIDER: GlideParams = {
  trimSpeed: 11,
  glideRatio: 10,
  stallSpeed: 7,
  maxBank: 50,
  bankRate: 80,
  pitchAuthority: 0.6,
};

/** Zwei Flügel an den Armen: langsamer, steiler, dafür wendig. */
export const WINGS: GlideParams = {
  trimSpeed: 9,
  glideRatio: 6,
  stallSpeed: 5.5,
  maxBank: 60,
  bankRate: 150,
  pitchAuthority: 0.7,
};

/** Schneller fliegt hier nichts — eine Zahl, die auch ein Sturzflug einhält. */
export const MAX_AIRSPEED = 45;

/** Unter dieser Fahrt trägt kein Flügel; das Ding fällt einfach. */
const MIN_AIRSPEED = 0.3;

export interface GlideState {
  velocity: Vec3;
  /** Schräglage in Grad, nach rechts positiv. */
  bank: number;
}

export interface GlideInput {
  /** -1 Nase runter (Bügel gezogen) … +1 Nase hoch (Bügel gedrückt). */
  pitchUp: number;
  /** -1 links … +1 rechts. */
  roll: number;
  /** Wie viel Flügel gerade trägt, 0 … 1 — eingezogene Arme sind weniger Flügel. */
  area: number;
  /** Schub aus dem Flügelschlag, in m/s², schräg nach vorn und oben. */
  flap: number;
}

/**
 * Ein Schritt Gleiten. Gibt einen **neuen** Zustand zurück; der alte bleibt,
 * wie er war — so kann ein Test zwei Wege nebeneinander legen.
 *
 * @param gravity die Schwerkraft der Welt als positive Zahl, m/s²
 */
export function stepGlide(
  state: GlideState,
  input: GlideInput,
  params: GlideParams,
  gravity: number,
  dt: number,
): GlideState {
  const pitchUp = clamp(input.pitchUp, -1, 1);
  const roll = clamp(input.roll, -1, 1);
  const area = clamp(input.area, 0, 1);

  // Die Schräglage läuft der Hand hinterher, nicht voraus: ein Flügel legt
  // sich, er springt nicht.
  const wanted = roll * params.maxBank;
  const step = params.bankRate * dt;
  const bank = state.bank + clamp(wanted - state.bank, -step, step);

  const v = length(state.velocity);
  let ax = 0;
  let ay = -gravity;
  let az = 0;

  if (v > MIN_AIRSPEED) {
    const dir = scale(state.velocity, 1 / v);
    // Auftrieb und Widerstand wachsen mit dem Quadrat der Fahrt — das ist der
    // eine Satz Aerodynamik, den es hier gibt. Bei Trimmfahrt und neutralem
    // Bügel trägt der Flügel genau das Gewicht.
    const q = (v / params.trimSpeed) ** 2;
    // Gedrückter Bügel: mehr Anstellwinkel, mehr Auftrieb — bis der Flügel
    // abreißt. Die Abrissfahrt steigt dabei mit, wie im echten Leben.
    const stallAt = params.stallSpeed * (1 + 0.15 * Math.max(0, pitchUp));
    const carrying = smoothstep(stallAt * 0.7, stallAt * 1.05, v);
    const lift = gravity * q * (1 + params.pitchAuthority * pitchUp) * area * carrying;
    // Der Widerstand hat einen Anteil vom Körper, der bleibt, und einen vom
    // Flügel, der mit dem Anstellwinkel wächst: Bügel drücken bremst.
    const drag =
      (gravity / params.glideRatio) * q * (0.35 + 0.65 * area) * (1 + 0.6 * pitchUp * pitchUp);

    // Der Auftrieb steht quer zur Bahn, in der Ebene aus Bahn und Lot — und
    // um die Bahn herum gekippt, sobald man in der Schräglage liegt. Dann zeigt
    // ein Teil davon zur Seite, und genau der fliegt die Kurve.
    const up = perpendicularUp(dir);
    const right = normalize(cross(dir, { x: 0, y: 1, z: 0 })) ?? { x: 1, y: 0, z: 0 };
    const phi = (bank * Math.PI) / 180;
    const liftDir = add(scale(up, Math.cos(phi)), scale(right, Math.sin(phi)));

    // Der Flügelschlag schiebt schräg nach vorn und oben — was ein Vogel tut.
    const flapDir = normalize(add(dir, { x: 0, y: 1, z: 0 })) ?? { x: 0, y: 1, z: 0 };
    const flap = Math.max(0, input.flap);

    ax += lift * liftDir.x - drag * dir.x + flap * flapDir.x;
    ay += lift * liftDir.y - drag * dir.y + flap * flapDir.y;
    az += lift * liftDir.z - drag * dir.z + flap * flapDir.z;
  } else {
    // Ohne Fahrt trägt nichts, aber schlagen kann man trotzdem — nach oben.
    ay += Math.max(0, input.flap);
  }

  let velocity = {
    x: state.velocity.x + ax * dt,
    y: state.velocity.y + ay * dt,
    z: state.velocity.z + az * dt,
  };
  const speed = length(velocity);
  if (speed > MAX_AIRSPEED) velocity = scale(velocity, MAX_AIRSPEED / speed);

  return { velocity, bank };
}

/**
 * Wohin die Nase zeigt, aus der Bahn gelesen.
 *
 * `yaw` ist die Drehung um die Hochachse in Radiant, so wie three.js sie auf
 * `rotation.y` legt: null heißt entlang -Z, positiv dreht nach links. `pitch`
 * ist die Neigung der Bahn, positiv nach oben.
 */
export function attitude(velocity: Vec3): { yaw: number; pitch: number } {
  const flat = Math.hypot(velocity.x, velocity.z);
  if (flat < 1e-6 && Math.abs(velocity.y) < 1e-6) return { yaw: 0, pitch: 0 };
  return {
    yaw: flat < 1e-6 ? 0 : Math.atan2(-velocity.x, -velocity.z),
    pitch: Math.atan2(velocity.y, flat),
  };
}

/** Kleinster Winkel von `from` nach `to`, in Radiant, für die Drehung des Rigs. */
export function yawDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

// --- die Eingaben ------------------------------------------------------------

/** So weit vor dem Kopf liegt der Bügel in Ruhe, in Metern. */
export const BAR_NEUTRAL = 0.42;
/** So viel Weg am Bügel ist voller Ausschlag, nach vorn wie nach hinten. */
export const BAR_TRAVEL = 0.16;
/** So weit zur Seite geschoben ist volle Schräglage. */
export const BAR_SIDE = 0.2;

/**
 * Der Steuerbügel des Hängegleiters: **ziehen** heißt Nase runter und
 * schneller, **drücken** heißt Nase hoch und langsamer, **zur Seite schieben**
 * legt den Flügel — und zwar auf die Seite, zu der man schiebt. Ein echter
 * Pilot schiebt den Bügel von der Kurve *weg* (er verlagert ja seinen Körper,
 * nicht den Bügel); in der Brille bewegt sich der Körper nicht, und „Bügel
 * nach links, Kurve nach links" ist das, was jeder als Erstes versucht.
 *
 * @param ahead wie weit der Bügel vor dem Kopf liegt, in Metern
 * @param side wie weit rechts vom Kopf, in Metern
 */
export function barCommand(ahead: number, side: number): { pitchUp: number; roll: number } {
  return {
    pitchUp: clamp((ahead - BAR_NEUTRAL) / BAR_TRAVEL, -1, 1),
    roll: clamp(side / BAR_SIDE, -1, 1),
  };
}

/** So weit vor dem Kopf hängen die Hände in Ruhe, wenn die Arme ausgebreitet sind. */
export const WING_NEUTRAL_AHEAD = 0.1;
/** So viel Weg nach vorn oder hinten ist volle Neigung. */
export const WING_TRAVEL = 0.22;
/** Diese Höhendifferenz der Hände ist volle Schräglage. */
export const WING_TILT = 0.4;
/** So weit auseinander sind die Hände bei ganz ausgebreiteten Flügeln. */
export const WING_SPAN = 1.3;
/** Weniger Flügel als das bleibt auch mit angelegten Armen. */
export const WING_MIN_AREA = 0.25;
/** So viel Schub gibt ein Meter pro Sekunde Abwärtsschlag, in m/s². */
export const FLAP_GAIN = 2.4;
/** Langsamer als das ist kein Schlag, sondern ein Wackeln. */
export const FLAP_THRESHOLD = 0.6;

export interface HandPose {
  /** Vor dem Kopf, in Metern. */
  ahead: number;
  /** Über dem Kopf. */
  up: number;
  /** Rechts vom Kopf. */
  side: number;
}

/**
 * Die Flügel an den Armen: die Hände **sind** die Flügelspitzen.
 *
 * Eine Hand tiefer als die andere kippt den Flügel auf diese Seite. Beide
 * Hände nach vorn drückt die Nase runter, nach hinten hoch — wie ein Vogel,
 * der die Flügel nach vorn nimmt, um zu tauchen. Und wie weit die Hände
 * auseinander sind, ist, wie viel Flügel überhaupt da ist: angelegte Arme
 * sind ein Sturzflug.
 */
export function wingCommand(
  left: HandPose,
  right: HandPose,
): { pitchUp: number; roll: number; area: number } {
  const ahead = (left.ahead + right.ahead) / 2;
  return {
    pitchUp: clamp(-(ahead - WING_NEUTRAL_AHEAD) / WING_TRAVEL, -1, 1),
    roll: clamp((left.up - right.up) / WING_TILT, -1, 1),
    area: clamp(Math.abs(right.side - left.side) / WING_SPAN, WING_MIN_AREA, 1),
  };
}

/**
 * Was ein Flügelschlag an Schub gibt, in m/s².
 *
 * Nur der **Abwärtsschlag** zählt, und nur, wenn beide Hände ihn machen: die
 * langsamere von beiden bestimmt, denn ein Vogel schlägt nicht mit einem
 * Flügel. Der Aufwärtsschlag ist umsonst — er ist das Ausholen.
 *
 * @param leftDown Abwärtsgeschwindigkeit der linken Hand, m/s, nach unten positiv
 */
export function flapThrust(leftDown: number, rightDown: number): number {
  const stroke = Math.min(leftDown, rightDown) - FLAP_THRESHOLD;
  if (stroke <= 0) return 0;
  return stroke * FLAP_GAIN;
}

// --- Vektoren ----------------------------------------------------------------

function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

function normalize(v: Vec3): Vec3 | null {
  const l = length(v);
  return l < 1e-6 ? null : scale(v, 1 / l);
}

/** Das Lot, quer zur Bahn gestellt — für eine senkrechte Bahn irgendeine Querrichtung. */
function perpendicularUp(dir: Vec3): Vec3 {
  const up = { x: -dir.x * dir.y, y: 1 - dir.y * dir.y, z: -dir.z * dir.y };
  return normalize(up) ?? { x: 0, y: 0, z: -1 };
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
