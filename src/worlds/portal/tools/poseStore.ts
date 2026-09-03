import type { Tool } from './Tool';
import type { HoldPose } from './toolPose';

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
