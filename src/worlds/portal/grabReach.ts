/**
 * Die Mathematik hinter dem Greifen — dreimal dieselbe Frage, dreimal eine
 * andere Entfernung, und bewusst ohne three.js und Rapier, damit die
 * Vorzeichen einzeln geprüft werden können statt erst in der Brille.
 *
 * Es gibt **drei Reichweiten**, und sie unterscheiden sich nicht darin, *wie*
 * man greift — gezielt wird immer, und immer mit demselben Grip —, sondern
 * darin, was danach passiert:
 *
 * - **Anfassen** (`touch`): die Hand steckt in der Greifbox. Das Ding sitzt
 *   in der Faust, wie es das immer getan hat.
 * - **Nahgreifen** (`near`): das Ding steht im Zylinder um den Spieler, aber
 *   außer Reichweite der Hand. Es kommt **nicht** geflogen; es bleibt liegen,
 *   wo es liegt, und folgt der Hand von dort. Damit stellt man einen Dominostein
 *   auf, ohne sich zu bücken.
 * - **Ferngreifen** (`remote`): alles bis 9 m. Hier kommt es geflogen, denn
 *   ein Ding fünf Meter weiter aus dem Handgelenk zu dirigieren hilft
 *   niemandem.
 *
 * Fassen und holen ist der Unterschied, auf den es ankommt: beim Fassen bleibt
 * das Ding, wo es ist, beim Holen kommt es zu dir. Ein **Griff** — alles mit
 * eingemessener Haltung, ein Werkzeug etwa — wird immer geholt, auf jeder
 * Entfernung; ein **Gegenstand** wird nah gefasst und fern geholt.
 *
 * Zwei Dinge stehen deshalb hier: das Zielen — welches Ding meint die Hand,
 * wenn ein Dominostein quer durch den Raum ein sehr kleines Ziel ist — und der
 * Flug, der ein Ding auf fester Bahn zur Hand bringt, statt es zu werfen und
 * zu hoffen. Ein Zug, der nicht ankommt, ist schlimmer als gar keiner, also
 * ist die Bahn über die Zeit gerechnet und endet genau in der Hand.
 */

import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from './tools/aim';

export type { Quat, Vec3 };

/** Welche der drei Reichweiten eine Hand gerade erreicht. */
export type GrabStage = 'touch' | 'near' | 'remote';

/** An object the aim can lock onto: an oriented box. */
export interface AimTarget {
  position: Vec3;
  quaternion: Quat;
  /** Half size of the collider along its own axes. */
  halfExtents: Vec3;
}

/** How far a remote grab reaches. */
export const REMOTE_RANGE = 9;
/** Slack around a prop's box when aiming at it. */
export const REMOTE_AIM_MARGIN = 0.06;
/** …plus a cone that widens with distance, so far targets stay catchable. */
export const REMOTE_AIM_CONE = Math.tan((3.5 * Math.PI) / 180);
/**
 * Die **Greifbox** ist der Collider plus dieser Zuschlag — ein fester, kein
 * prozentualer, damit ein Dominostein genauso gut in die Hand geht wie ein
 * Companion Cube. Wer so nah dran ist, fasst an.
 */
export const GRAB_MARGIN = 0.09;
/** Both hands closer than this: the player is reaching for what they hold. */
export const HANDS_TOGETHER = 0.28;
/** A pull never takes longer than this, however far away the object is. */
export const FLIGHT_MIN = 0.28;
export const FLIGHT_MAX = 0.85;
/** Metres per second the pull aims for before the clamps bite. */
export const FLIGHT_SPEED = 8;
/** The flight is done once it is this close, so the hand catches it early. */
export const FLIGHT_CATCH = 0.16;

const _inverse: Quat = { x: 0, y: 0, z: 0, w: 1 };

/** Dreht `v` in das eigene System der Box — die Gegenrichtung zu `rotateVec`. */
function untransform(v: Vec3, q: Quat, out: Vec3): Vec3 {
  return rotateVec(v, conjugate(q, _inverse), out);
}

const _origin: Vec3 = { x: 0, y: 0, z: 0 };
const _direction: Vec3 = { x: 0, y: 0, z: 0 };
const _local: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Distance along the ray at which it enters a target's box, or null when the
 * aim misses. The box grows by a fixed margin plus a cone that widens with
 * distance, so a far-away domino stays catchable without stealing the aim from
 * something closer.
 */
export function rayReach(target: AimTarget, origin: Vec3, direction: Vec3): number | null {
  _local.x = origin.x - target.position.x;
  _local.y = origin.y - target.position.y;
  _local.z = origin.z - target.position.z;
  untransform(_local, target.quaternion, _origin);
  untransform(direction, target.quaternion, _direction);

  const along = -(_origin.x * _direction.x + _origin.y * _direction.y + _origin.z * _direction.z);
  if (along < 0.25) return null;
  const slack = REMOTE_AIM_MARGIN + along * REMOTE_AIM_CONE;

  let near = 0;
  let far = Number.POSITIVE_INFINITY;
  for (const axis of ['x', 'y', 'z'] as const) {
    const start = _origin[axis];
    const step = _direction[axis];
    const half = target.halfExtents[axis] + slack;
    if (Math.abs(step) < 1e-6) {
      if (Math.abs(start) > half) return null;
      continue;
    }
    const a = (-half - start) / step;
    const b = (half - start) / step;
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
    if (near > far) return null;
  }
  return near;
}

/**
 * How deep a point sits inside a target's grab box, or null when it is outside.
 * Smaller means "more inside", which makes picking the nearest one trivial.
 */
export function reachDepth(target: AimTarget, point: Vec3): number | null {
  _local.x = point.x - target.position.x;
  _local.y = point.y - target.position.y;
  _local.z = point.z - target.position.z;
  untransform(_local, target.quaternion, _origin);

  const depth = Math.max(
    Math.abs(_origin.x) - target.halfExtents.x,
    Math.abs(_origin.y) - target.halfExtents.y,
    Math.abs(_origin.z) - target.halfExtents.z,
  );
  return depth <= GRAB_MARGIN ? depth : null;
}

/** The nearest target the ray enters, within reach. */
export function pickAimTarget<T extends AimTarget>(
  targets: readonly T[],
  origin: Vec3,
  direction: Vec3,
  range = REMOTE_RANGE,
): T | null {
  let best: T | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const distance = rayReach(target, origin, direction);
    if (distance === null || distance > range || distance >= bestDistance) continue;
    best = target;
    bestDistance = distance;
  }
  return best;
}

/**
 * Der Zylinder ums eigene Standbein: alles darin ist nah genug, um es zu
 * fassen, ohne dass es dafür geflogen kommen müsste.
 *
 * Ein Zylinder und keine Kugel um die Hand, weil „muss ich mich bücken?" eine
 * Frage an den **Körper** ist und nicht an den Arm: der Dominostein vor den
 * Füßen liegt außerhalb jeder Kugel um eine Hand, die auf Hüfthöhe hängt, und
 * ist trotzdem genau der Fall, um den es geht. Und keine unendlich hohe Säule,
 * sonst gehört einem auch, was zwei Stockwerke höher auf dem Sims steht.
 */
export interface NearZone {
  /** Wo der Spieler steht, in der Ebene. */
  x: number;
  z: number;
  /** Der Boden unter ihm — von dort an zählt die Höhe. */
  floor: number;
  radius: number;
  height: number;
}

/** Ein Meter im Rund: weit genug für den Boden vor den Füßen, nicht weiter. */
export const DEFAULT_NEAR_RADIUS = 1;
/** Etwas über Kopfhöhe. Was darüber liegt, ist nicht mehr „um mich herum". */
export const DEFAULT_NEAR_HEIGHT = 2.1;

const _axisX: Vec3 = { x: 0, y: 0, z: 0 };
const _axisY: Vec3 = { x: 0, y: 0, z: 0 };
const _axisZ: Vec3 = { x: 0, y: 0, z: 0 };
const _extent: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * Die Ausdehnung einer gedrehten Box entlang der Weltachsen — die Kiste, die
 * sie gerade eben noch umschließt. Für den Zylinder reicht das: dort wird
 * gefragt, ob etwas *in der Nähe* ist, nicht, worauf gezielt wird. Das
 * entscheidet der Strahl, und der rechnet genau (`rayReach`).
 */
function worldExtent(target: AimTarget, out: Vec3): Vec3 {
  _axisX.x = target.halfExtents.x;
  _axisX.y = 0;
  _axisX.z = 0;
  _axisY.x = 0;
  _axisY.y = target.halfExtents.y;
  _axisY.z = 0;
  _axisZ.x = 0;
  _axisZ.y = 0;
  _axisZ.z = target.halfExtents.z;
  rotateVec(_axisX, target.quaternion, _axisX);
  rotateVec(_axisY, target.quaternion, _axisY);
  rotateVec(_axisZ, target.quaternion, _axisZ);
  out.x = Math.abs(_axisX.x) + Math.abs(_axisY.x) + Math.abs(_axisZ.x);
  out.y = Math.abs(_axisX.y) + Math.abs(_axisY.y) + Math.abs(_axisZ.y);
  out.z = Math.abs(_axisX.z) + Math.abs(_axisY.z) + Math.abs(_axisZ.z);
  return out;
}

/**
 * Abstand einer Box von der Achse des Zylinders, oder `null`, wenn sie
 * draußen steht. Null heißt: der Spieler steht darüber.
 */
export function nearZoneDistance(target: AimTarget, zone: NearZone): number | null {
  worldExtent(target, _extent);
  const dx = Math.max(Math.abs(target.position.x - zone.x) - _extent.x, 0);
  const dz = Math.max(Math.abs(target.position.z - zone.z) - _extent.z, 0);
  const gap = Math.hypot(dx, dz);
  if (gap > zone.radius) return null;
  if (target.position.y + _extent.y < zone.floor) return null;
  if (target.position.y - _extent.y > zone.floor + zone.height) return null;
  return gap;
}

/** Ein Ort mit einer Drehung — Hand oder Gegenstand, beide passen hier hinein. */
export interface GrabPose {
  position: Vec3;
  rotation: Quat;
}

const _delta: Quat = { x: 0, y: 0, z: 0, w: 1 };
const _flip: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * Nahgriff, Betriebsart **Drehung um Objektmitte**: die Hand verschiebt eins
 * zu eins, und sie dreht das Ding um sich selbst statt es um die Hand kreisen
 * zu lassen.
 *
 * Der starre Griff — dieselbe Matrix wie in der Faust — ist die Vorgabe und
 * die ehrlichere Antwort: man hat eben einen langen Arm. Nur wächst dabei
 * jedes Grad am Handgelenk mit dem Abstand zu einem Ausschlag, und auf einen
 * Meter stellt damit niemand einen Dominostein auf. Wer das lieber hat,
 * schaltet hier um; gerechnet wird gegen die Posen von dem Moment, in dem
 * zugegriffen wurde, damit sich nichts aufsummiert.
 */
export function spinGrab(
  objectStart: GrabPose,
  handStart: GrabPose,
  hand: GrabPose,
  out: GrabPose,
): GrabPose {
  multiplyQuat(hand.rotation, conjugate(handStart.rotation, _flip), _delta);
  multiplyQuat(_delta, objectStart.rotation, out.rotation);
  out.position.x = objectStart.position.x + (hand.position.x - handStart.position.x);
  out.position.y = objectStart.position.y + (hand.position.y - handStart.position.y);
  out.position.z = objectStart.position.z + (hand.position.z - handStart.position.z);
  return out;
}

export function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** How long a pull over this distance should take. */
export function flightDuration(gap: number): number {
  return Math.min(Math.max(gap / FLIGHT_SPEED, FLIGHT_MIN), FLIGHT_MAX);
}

/** Smooth start, smooth landing. */
function ease(t: number): number {
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  return clamped * clamped * (3 - 2 * clamped);
}

/**
 * Where a pulled object sits at progress `t` (0 = launch, 1 = in the hand).
 *
 * The path is recomputed against the *current* hand position every frame, so a
 * hand that moves drags the object along with it, and `t = 1` always lands
 * exactly in it. That is the whole point: physics may not have a say here, or
 * the object bounces off a crate halfway and never arrives.
 */
export function flightPosition(from: Vec3, hand: Vec3, t: number, out: Vec3): Vec3 {
  const blend = ease(t);
  out.x = from.x + (hand.x - from.x) * blend;
  out.y = from.y + (hand.y - from.y) * blend;
  out.z = from.z + (hand.z - from.z) * blend;
  // A gentle arc, so it looks thrown rather than dragged along a wire. It
  // vanishes at both ends, which keeps the landing exact.
  const lift = Math.min(distance(from, hand) * 0.12, 0.3);
  const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
  out.y += Math.sin(clamped * Math.PI) * lift;
  return out;
}

/** True once the pull is over and the hand should simply hold the object. */
export function flightArrived(position: Vec3, hand: Vec3, t: number): boolean {
  return t >= 1 || distance(position, hand) <= FLIGHT_CATCH;
}

/**
 * Remote grabbing is off while the hands are together and one of them already
 * holds something — the player is reaching over to take it, not aiming across
 * the room.
 */
export function handsTooClose(a: Vec3 | null, b: Vec3 | null, otherHandBusy: boolean): boolean {
  if (!otherHandBusy || !a || !b) return false;
  return distance(a, b) < HANDS_TOGETHER;
}
