import type { Tool } from './Tool';
import {
  poseFromReadout,
  readPose,
  readoutFromArray,
  readoutToArray,
  type HoldPose,
} from './toolPose';

/**
 * Hold poses the player measured with the adjustment tool, kept in the
 * browser.
 *
 * A pose measured in the headset is worth nothing if it is gone after the next
 * reload — and typing it into a constructor means leaving VR, editing code and
 * coming back. So a measured pose is remembered here right away; whether it
 * then also gets written into the tool's own constructor is a decision for
 * later, on a keyboard.
 */

const KEY = 'bgvr.holdPoses';

type Stored = Record<string, HoldPose>;

function read(): Stored {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    // Private mode, no storage, broken JSON — none of it is worth a crash.
    return {};
  }
}

function write(all: Stored): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
  } catch {
    /* nothing we can do, and nothing that matters */
  }
}

/** Remembers a pose for a tool id. */
export function savePose(toolId: string, pose: HoldPose): void {
  const all = read();
  all[toolId] = pose;
  write(all);
}

/** Puts a remembered pose back on a freshly built tool. Silent when there is none. */
export function applyStoredPose(tool: Tool): void {
  const pose = read()[tool.toolId];
  if (!pose) return;
  tool.holdPosition.set(pose.position.x, pose.position.y, pose.position.z);
  tool.holdRotation.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
}

/**
 * Vergisst die Pose *eines* Werkzeugs — der Rest bleibt stehen.
 *
 * Das Regal hat inzwischen zwanzig Fächer, und eine schiefe Pistole ist kein
 * Grund, die Drohne mit zurückzusetzen. Das Alles-zurück steht daneben und
 * heißt auch so.
 *
 * @returns true, wenn wirklich etwas gespeichert war
 */
export function clearPose(toolId: string): boolean {
  const all = read();
  if (!(toolId in all)) return false;
  delete all[toolId];
  write(all);
  return true;
}

/** Forgets every measured pose. The tools go back to how they were built. */
export function clearPoses(): void {
  try {
    globalThis.localStorage?.removeItem(KEY);
  } catch {
    /* see above */
  }
}

/** How many tools currently carry a measured pose. */
export function storedPoseCount(): number {
  return Object.keys(read()).length;
}

/**
 * Every measured pose as the six readable numbers, for the config code.
 *
 * The quaternion above is what the tool needs; `[x, y, z, pitch, yaw, roll]`
 * is what a person can read out over a call and type in again — and it is a
 * third of the characters, which matters for a code that gets spoken.
 */
export function holdPoseSnapshot(): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [id, pose] of Object.entries(read())) out[id] = readoutToArray(readPose(pose));
  return out;
}

/** Puts a set of poses from a config code back into the store. */
export function saveHoldPoses(poses: Record<string, number[]>): void {
  const all: Stored = {};
  for (const [id, values] of Object.entries(poses)) {
    all[id] = poseFromReadout(readoutFromArray(values));
  }
  write(all);
}

/** The pose stored for one tool, in readable numbers. */
export function storedPose(toolId: string): HoldPose | null {
  return read()[toolId] ?? null;
}
