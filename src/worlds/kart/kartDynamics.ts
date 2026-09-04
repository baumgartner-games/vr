/**
 * How a kart moves. One function, no three.js, no Rapier — so what the kart
 * does with the throttle can be tested instead of driven around and guessed at.
 *
 * The model is the usual arcade one and it is deliberately small:
 *
 * - the steering is a bicycle model, so the kart turns as fast as it drives and
 *   not at all while it stands still;
 * - turning rotates the *kart*, never its velocity — the sideways part that
 *   appears from that is the drift, and the traction setting is how quickly the
 *   tyres eat it again;
 * - throttle, brake, drag and rolling resistance only ever touch the forward
 *   part.
 *
 * Angles follow three.js: `yaw` is a rotation about +Y and the kart looks along
 * its own -Z, so forward is `(-sin yaw, -cos yaw)` and a *bigger* yaw is a turn
 * to the left.
 */

import { REFERENCE_MASS, type KartSettings } from './kartSettings';

/** Where a kart is and how it is moving, in world space. */
export interface KartMotion {
  x: number;
  z: number;
  /** Rotation about +Y, in radians. */
  yaw: number;
  vx: number;
  vz: number;
}

/** What the driver is asking for this frame. */
export interface KartInput {
  /** Right trigger, 0 to 1. */
  throttle: number;
  /** Left trigger, 0 to 1. Doubles as reverse gear once the kart stands. */
  brake: number;
  /** -1 fully right, +1 fully left. */
  steer: number;
}

/** Air drag: grows with the square of the speed. */
const DRAG = 0.006;
/** Rolling resistance: proportional to the speed. */
const ROLL = 0.12;
/**
 * The part of the rolling resistance that does not care how fast the kart is
 * going. Without it a kart that is let go of only ever *approaches* standing
 * still, and one left alone in a corner keeps creeping for minutes.
 */
const ROLL_CONSTANT = 0.6;
/** Below this the kart is simply standing, so it stops twitching. */
const STANDSTILL = 0.05;
/** Above this speed the brake brakes; below it, it is the reverse gear. */
const REVERSE_THRESHOLD = 0.4;
/** Reverse pulls this much of the engine's power. */
const REVERSE_POWER = 0.6;
/** Slowest and fastest the tyres eat a slide, in 1/s. */
const GRIP_BASE = 0.6;
const GRIP_SPAN = 9;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** A fresh kart standing still at a place, looking along `yaw`. */
export function kartAt(x: number, z: number, yaw: number): KartMotion {
  return { x, z, yaw, vx: 0, vz: 0 };
}

/** How fast the kart is going, regardless of where it points, in m/s. */
export function kartSpeed(motion: KartMotion): number {
  return Math.hypot(motion.vx, motion.vz);
}

/** Speed along the kart's own nose — negative while it reverses, in m/s. */
export function kartForwardSpeed(motion: KartMotion): number {
  return motion.vx * -Math.sin(motion.yaw) + motion.vz * -Math.cos(motion.yaw);
}

/** How far sideways the kart is travelling — that is the drift, in m/s. */
export function kartSlip(motion: KartMotion): number {
  return Math.abs(motion.vx * Math.cos(motion.yaw) + motion.vz * -Math.sin(motion.yaw));
}

export function kmh(metresPerSecond: number): number {
  return metresPerSecond * 3.6;
}

/** One step of driving. Returns a new motion; the one passed in is untouched. */
export function stepKart(
  motion: KartMotion,
  input: KartInput,
  settings: KartSettings,
  dt: number,
): KartMotion {
  if (!(dt > 0)) return { ...motion };

  // Turning first, with the speed the kart had when the wheel was turned.
  const forwardBefore = kartForwardSpeed(motion);
  const angle = clamp(input.steer, -1, 1) * (settings.steerAngle * Math.PI) / 180;
  const yaw = motion.yaw + ((forwardBefore * Math.tan(angle)) / settings.wheelbase) * dt;

  // Everything else happens in the frame the kart points in *now*. The velocity
  // did not turn with it, so whatever is left over sideways is the slide.
  const fx = -Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  let forward = motion.vx * fx + motion.vz * fz;
  let lateral = motion.vx * rx + motion.vz * rz;

  const top = settings.topSpeed / 3.6;
  const back = settings.reverse / 3.6;
  const power = settings.acceleration * (REFERENCE_MASS / settings.mass);
  const throttle = clamp(input.throttle, 0, 1);
  const brake = clamp(input.brake, 0, 1);

  forward += throttle * power * dt;
  if (brake > 0) {
    forward =
      forward > REVERSE_THRESHOLD
        ? Math.max(0, forward - brake * settings.braking * dt)
        : Math.max(-back, forward - brake * power * REVERSE_POWER * dt);
  }
  // Lifting off has to slow the kart down, or every corner is taken flat out.
  // Never more than what is there, so the resistance cannot push it backwards.
  const speed = Math.abs(forward);
  const resistance = (speed * speed * DRAG + speed * ROLL + ROLL_CONSTANT) * dt;
  forward -= Math.sign(forward) * Math.min(speed, resistance);
  forward = clamp(forward, -back, top);

  lateral *= Math.exp(-(GRIP_BASE + clamp(settings.traction, 0, 1) * GRIP_SPAN) * dt);

  if (throttle === 0 && brake === 0 && Math.abs(forward) < STANDSTILL) forward = 0;
  if (Math.abs(lateral) < STANDSTILL) lateral = 0;

  const vx = fx * forward + rx * lateral;
  const vz = fz * forward + rz * lateral;
  return { x: motion.x + vx * dt, z: motion.z + vz * dt, yaw, vx, vz };
}
