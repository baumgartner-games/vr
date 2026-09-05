import {
  GRIP_POSE_ID,
  STANDARD_GRIP_TOOLS,
  defaultHoldPose,
  defaultIdlePose,
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

/**
 * The idle pose of a hand — the built-in one until somebody changes it.
 *
 * Die eingebaute ist **je Hand eine andere**: eine Hand am Controller liegt
 * schräg darin, und links ist das die Spiegelung von rechts
 * (`defaultIdlePose`). Deshalb ist sie auch der Rückfall für einen zu kurzen
 * Konfig-Code — sonst zöge ein alter Code die rechte Haltung auf die linke
 * Hand.
 */
export function idleHandPose(hand: Handedness): HandPose {
  const fallback = defaultIdlePose(hand);
  const stored = read().idle?.[hand];
  return stored ? handPoseFromArray(stored, fallback) : fallback;
}

/**
 * How a hand holds one tool.
 *
 * Der Rückfall ist die **gebaute** Haltung für genau dieses Werkzeug
 * (`defaultHoldPose`): für die meisten die allgemeine Faust, für die
 * eingemessenen ihr eigener Griff, links gespiegelt. Damit sieht ein Werkzeug,
 * das noch nie jemand justiert hat, trotzdem gehalten aus statt offen.
 */
export function holdHandPose(hand: Handedness, toolId: string): HandPose {
  const fallback = defaultHoldPose(hand, toolId);
  const stored = read().hold?.[hand]?.[toolId];
  if (stored) return handPoseFromArray(stored, fallback);

  // Kein eigener Wert — dann gilt die Faust des **Standardgriffs**, wenn dieses
  // Werkzeug einen trägt. Das ist die ganze Idee hinter den Griffen: derselbe
  // Zylinder in derselben Hand ist eine Haltung und nicht zwanzig, und wer sie
  // am Griff einstellt, hat sie an jedem Werkzeug mit diesem Griff eingestellt.
  // Eine Haltung, die trotzdem für genau ein Werkzeug gespeichert wurde, gewinnt
  // darüber: sie ist die spätere und die genauere Auskunft.
  const shared = STANDARD_GRIP_TOOLS.has(toolId) ? read().hold?.[hand]?.[GRIP_POSE_ID] : undefined;
  return shared ? handPoseFromArray(shared, fallback) : fallback;
}

/**
 * Die Faust am **Standardgriff** — die eine Haltung, die alle Werkzeuge mit
 * diesem Griff erben.
 *
 * Sie liegt im selben Speicher wie jede andere Haltung, unter der Id aus
 * `GRIP_POSE_ID`; hier steht nur der Weg dorthin, damit ein Aufrufer nicht
 * wissen muss, dass `grip` eine Werkzeug-Id ist.
 */
export function gripHandPose(hand: Handedness): HandPose {
  return holdHandPose(hand, GRIP_POSE_ID);
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

/** Vergisst die Grundhaltung **einer** Hand — die andere bleibt stehen. */
export function clearIdleHandPose(hand: Handedness): boolean {
  const all = read();
  if (!all.idle?.[hand]) return false;
  const idle = { ...all.idle };
  delete idle[hand];
  write({ ...all, idle });
  return true;
}

/**
 * Vergisst die Griffhaltung **eines** Werkzeugs an **einer** Hand — der Rest
 * bleibt stehen.
 *
 * Dasselbe Verhältnis wie `clearPose` zu `clearPoses` bei den Werkzeugposen:
 * eine schief justierte Taschenlampe ist kein Grund, auch noch die Faust um
 * die Pistole zurückzusetzen.
 *
 * @returns true, wenn wirklich etwas gespeichert war
 */
export function clearHoldHandPose(hand: Handedness, toolId: string): boolean {
  const all = read();
  if (!all.hold?.[hand]?.[toolId]) return false;
  const held = { ...all.hold[hand] };
  delete held[toolId];
  write({ ...all, hold: { ...all.hold, [hand]: held } });
  return true;
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
