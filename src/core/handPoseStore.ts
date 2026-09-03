import {
  HOLD_HAND_POSE,
  IDLE_HAND_POSE,
  clonePose,
  handPoseFromArray,
  handPoseToArray,
  type HandPose,
} from './handPose';
import type { Handedness } from './XRInput';

/**
 * The hand settings, kept in the browser.
 *
 * Same idea as the measured tool poses: a number that was dialled in with the
 * headset on is worth nothing if it is gone after the reload. Two kinds live
 * here — the **idle** hand (nothing in it) and one **hold** pose per tool, so
 * the hand can close around a pistol grip and open up around a picture frame.
 *
 * Whoever draws the hands subscribes, so a value typed into the menu shows up
 * in the same frame.
 */

const KEY = 'bgvr.handPoses';

/** Poses as they are stored: plain number arrays, exactly like the code. */
interface Stored {
  idle?: Partial<Record<Handedness, number[]>>;
  hold?: Partial<Record<Handedness, Record<string, number[]>>>;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let cache: Stored | null = null;

function read(): Stored {
  if (cache) return cache;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    // Private mode, no storage, broken JSON — none of it is worth a crash.
    cache = {};
  }
  return cache!;
}

function write(all: Stored): void {
  cache = all;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
  } catch {
    /* nothing we can do, and nothing that matters */
  }
  for (const listener of listeners) listener();
}

/** Called after every change, so the hands redraw themselves. */
export function onHandPoseChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The idle pose of a hand — the built-in one until somebody changes it. */
export function idleHandPose(hand: Handedness): HandPose {
  const stored = read().idle?.[hand];
  return stored ? handPoseFromArray(stored) : clonePose(IDLE_HAND_POSE);
}

/**
 * How a hand holds one tool. Falls back to the generic grip, so a tool nobody
 * has adjusted yet still looks held rather than open.
 */
export function holdHandPose(hand: Handedness, toolId: string): HandPose {
  const stored = read().hold?.[hand]?.[toolId];
  return stored ? handPoseFromArray(stored, HOLD_HAND_POSE) : clonePose(HOLD_HAND_POSE);
}

/** True while this exact pose was set by the player rather than built in. */
export function hasHandPose(hand: Handedness, toolId?: string): boolean {
  const all = read();
  return Boolean(toolId ? all.hold?.[hand]?.[toolId] : all.idle?.[hand]);
}

export function saveIdleHandPose(hand: Handedness, pose: HandPose): void {
  const all = read();
  write({ ...all, idle: { ...all.idle, [hand]: handPoseToArray(pose) } });
}

export function saveHoldHandPose(hand: Handedness, toolId: string, pose: HandPose): void {
  const all = read();
  write({
    ...all,
    hold: { ...all.hold, [hand]: { ...all.hold?.[hand], [toolId]: handPoseToArray(pose) } },
  });
}

/** Everything at once — what the config code writes back. */
export function saveHandPoses(next: Stored): void {
  write(next);
}

/** Everything at once — what the config code reads. */
export function handPoseSnapshot(): Stored {
  const all = read();
  return JSON.parse(JSON.stringify(all)) as Stored;
}

/** Back to the hands as they were built. */
export function clearHandPoses(): void {
  cache = {};
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* see above */
  }
  for (const listener of listeners) listener();
}

/** How many hand poses the player has set. */
export function handPoseCount(): number {
  const all = read();
  let count = Object.keys(all.idle ?? {}).length;
  for (const held of Object.values(all.hold ?? {})) count += Object.keys(held ?? {}).length;
  return count;
}

export type StoredHandPoses = Stored;
