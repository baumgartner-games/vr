/**
 * Wie eine Drohne fliegt.
 *
 * Die Mathematik hinter beiden Flugmodi, absichtlich ohne three.js — genau wie
 * `remoteGrab.ts` und `aim.ts`. Ein Vorzeichen, das hier falsch steht, dreht
 * im Headset die halbe Welt; deshalb steht es hier und nicht im Werkzeug.
 *
 * Zwei Schulen, zwei Funktionen:
 *
 * - **Kopter** (`flyKopter`) ist ein Hubschrauber. Der linke Stick schiebt die
 *   Maschine waagerecht durch den Raum, der rechte dreht die Nase und nimmt sie
 *   hoch und runter. Die Lage bleibt dabei immer waagerecht — was kippt, ist
 *   nur das Modell, nicht die Sicht.
 * - **Jet** (`flyJet`) ist ein kleines Flugzeug. Der rechte Stick ist der
 *   Steuerknüppel: links/rechts rollt, vor/zurück nickt — beides um die
 *   *eigenen* Achsen der Maschine, deshalb liegt die Lage als Quaternion vor
 *   und nicht als drei Winkel. Wer im Rollen zieht, fliegt eine Kurve, genau
 *   wie ein Flugzeug das tut. Der linke Stick schiebt entlang der Nase und
 *   quer dazu.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quat {
  x: number;
  y: number;
  z: number;
  w: number;
}

/** Ein Thumbstick. `y` ist negativ, wenn er nach vorne gedrückt wird. */
export interface Stick {
  x: number;
  y: number;
}

/** Alles, was an den beiden Flugmodi geschraubt werden kann. */
export interface DroneTuning {
  /** Waagerechte Reisegeschwindigkeit in m/s. */
  speed: number;
  /** Steig- und Sinkgeschwindigkeit des Kopters in m/s. */
  climb: number;
  /** Wie schnell der Kopter sich um die Hochachse dreht (rad/s). */
  yawRate: number;
  /** Wie schnell der Jet nickt (rad/s bei vollem Ausschlag). */
  pitchRate: number;
  /** Wie schnell der Jet rollt (rad/s bei vollem Ausschlag). */
  rollRate: number;
  /** Wie weit sich das Kopter-*Modell* in die Fahrtrichtung legt (rad). */
  lean: number;
}

export const DRONE_TUNING: DroneTuning = {
  speed: 5.5,
  climb: 3.2,
  yawRate: 1.2,
  pitchRate: 1.5,
  rollRate: 2.4,
  lean: 0.3,
};

// --- Quaternionen ----------------------------------------------------------

export function quatIdentity(): Quat {
  return { x: 0, y: 0, z: 0, w: 1 };
}

/** Drehung um eine (normalisierte) Achse. */
export function quatFromAxisAngle(axis: Vec3, angle: number): Quat {
  const half = angle / 2;
  const s = Math.sin(half);
  return { x: axis.x * s, y: axis.y * s, z: axis.z * s, w: Math.cos(half) };
}

/** Reine Drehung um die Hochachse. */
export function quatFromYaw(yaw: number): Quat {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

export function quatMultiply(a: Quat, b: Quat): Quat {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}

export function quatNormalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (length < 1e-9) return quatIdentity();
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

/** Dreht einen Vektor mit. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  // v + 2 * cross(q.xyz, cross(q.xyz, v) + q.w * v)
  const tx = 2 * (q.y * v.z - q.z * v.y);
  const ty = 2 * (q.z * v.x - q.x * v.z);
  const tz = 2 * (q.x * v.y - q.y * v.x);
  return {
    x: v.x + q.w * tx + (q.y * tz - q.z * ty),
    y: v.y + q.w * ty + (q.z * tx - q.x * tz),
    z: v.z + q.w * tz + (q.x * ty - q.y * tx),
  };
}

/** Die Nase der Maschine: ihre -Z-Achse. */
export function noseOf(orientation: Quat): Vec3 {
  return rotate(orientation, { x: 0, y: 0, z: -1 });
}

/** Ihre Querachse nach rechts. */
export function sideOf(orientation: Quat): Vec3 {
  return rotate(orientation, { x: 1, y: 0, z: 0 });
}

/**
 * Wohin die Nase zeigt, auf den Boden projiziert. Steht die Maschine senkrecht,
 * ist die Nase keine Richtung mehr — dann zählt, wo ihr Dach hinschaut.
 */
export function headingOf(orientation: Quat): number {
  const nose = noseOf(orientation);
  if (nose.x * nose.x + nose.z * nose.z < 1e-6) {
    const up = rotate(orientation, { x: 0, y: 1, z: 0 });
    return Math.atan2(-up.x, -up.z);
  }
  return Math.atan2(-nose.x, -nose.z);
}

/** Dieselbe Richtung, aber wieder waagerecht — das Parken richtet damit aus. */
export function levelOf(orientation: Quat): Quat {
  return quatFromYaw(headingOf(orientation));
}

// --- Fliegen ---------------------------------------------------------------

export interface KopterStep {
  /** Die neue Blickrichtung der Maschine (rad um die Hochachse). */
  heading: number;
  /** Wunschgeschwindigkeit in m/s, in Weltkoordinaten. */
  wish: Vec3;
  /** Nur Optik: wie weit sich das Modell in die Fahrt legt (rad). */
  bank: number;
  nose: number;
}

/**
 * Hubschrauber. `forward` ist die waagerechte Blickrichtung des Piloten — er
 * sitzt in der Drohne, und sein Kopf ist das Einzige, was „vorne“ sagt.
 *
 * Der rechte Stick dreht links/rechts die Nase **und damit die Sicht**: das
 * Werkzeug übernimmt `heading` auch als Rahmen, in dem der Kopf hängt. Nach
 * oben und unten steigt und sinkt sie.
 */
export function flyKopter(
  heading: number,
  left: Stick,
  right: Stick,
  forward: Vec3,
  dt: number,
  tune: DroneTuning = DRONE_TUNING,
): KopterStep {
  const flat = flatten(forward);
  // right = forward × up
  const side = { x: -flat.z, y: 0, z: flat.x };

  let wish: Vec3 = {
    x: flat.x * -left.y + side.x * left.x,
    y: 0,
    z: flat.z * -left.y + side.z * left.x,
  };
  wish = scale(clampUnit(wish), tune.speed);
  wish.y = -right.y * tune.climb;

  return {
    heading: heading - right.x * tune.yawRate * dt,
    wish,
    // In die Kurve gelegt und die Nase in die Fahrt gesenkt — reine Optik,
    // die Sicht bleibt waagerecht, sonst wird dem Piloten schlecht.
    bank: -left.x * tune.lean,
    nose: left.y * tune.lean,
  };
}

export interface JetStep {
  /** Die neue Lage der Maschine, Rollen und Nicken inklusive. */
  orientation: Quat;
  /** Wunschgeschwindigkeit in m/s, in Weltkoordinaten. */
  wish: Vec3;
}

/**
 * Flugzeug. Der rechte Stick dreht um die *eigenen* Achsen der Maschine —
 * zurückziehen hebt die Nase, nach rechts legt sie die rechte Fläche nach
 * unten. Beides zusammen ist eine Kurve, ganz ohne Seitenruder.
 *
 * Der linke Stick schiebt: vor/zurück entlang der Nase (Steigflug inklusive,
 * wenn die Nase oben steht), links/rechts quer dazu.
 */
export function flyJet(
  orientation: Quat,
  left: Stick,
  right: Stick,
  dt: number,
  tune: DroneTuning = DRONE_TUNING,
): JetStep {
  const pitch = quatFromAxisAngle({ x: 1, y: 0, z: 0 }, right.y * tune.pitchRate * dt);
  const roll = quatFromAxisAngle({ x: 0, y: 0, z: 1 }, -right.x * tune.rollRate * dt);
  // Von rechts multipliziert: die Achsen sind die der Maschine, nicht die der
  // Welt. Genau das macht aus „rollen und ziehen“ eine Kurve.
  const next = quatNormalize(quatMultiply(quatMultiply(orientation, pitch), roll));

  const nose = noseOf(next);
  const side = sideOf(next);
  const wish = scale(
    clampUnit({
      x: nose.x * -left.y + side.x * left.x,
      y: nose.y * -left.y + side.y * left.x,
      z: nose.z * -left.y + side.z * left.x,
    }),
    tune.speed,
  );

  return { orientation: next, wish };
}

// --- kleine Helfer ---------------------------------------------------------

function flatten(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.z);
  if (length < 1e-6) return { x: 0, y: 0, z: -1 };
  return { x: v.x / length, y: 0, z: v.z / length };
}

/** Diagonal ist nicht schneller: alles über Länge 1 wird zurückgeschnitten. */
function clampUnit(v: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length <= 1) return v;
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function scale(v: Vec3, factor: number): Vec3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}
