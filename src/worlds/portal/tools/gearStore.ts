import { clampDrone, DEFAULT_DRONE, type DroneSettings } from './droneSettings';
import { clampWeapon, DEFAULT_WEAPON, type WeaponSettings } from './weaponSettings';
import { readoutFromArray, readoutToArray, type PoseReadout } from './toolPose';

/**
 * The two settings that belong to the equipment rather than to a hand: where
 * an attachment sits on its tool, and what the pistol is set to.
 *
 * Kept in the browser like the measured hold poses — a red dot lined up in the
 * headset has to still be lined up after a reload, and the magazine size is
 * exactly the kind of thing you set once and forget about.
 *
 * An attachment is keyed `toolId:attachmentId`, and its pose is *in the tool's
 * own space*: it rides along wherever the tool ends up in the hand, which is
 * the whole reason it is stored separately from the tool's hold pose.
 */

const POSE_KEY = 'bgvr.attachPoses';
const WEAPON_KEY = 'bgvr.weapon';
const DRONE_KEY = 'bgvr.drone';

type Listener = () => void;

const listeners = new Set<Listener>();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode; nothing we can do about it */
  }
  for (const listener of listeners) listener();
}

/** Called after any change here, so a menu that is open redraws. */
export function onGearChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- attachments -----------------------------------------------------------

/** `toolId:attachmentId` → the six numbers of its pose on the tool. */
export type StoredAttachments = Record<string, number[]>;

export function attachmentKey(toolId: string, attachmentId: string): string {
  return `${toolId}:${attachmentId}`;
}

/** The pose the player gave this attachment, or null while it sits as built. */
export function attachmentPose(toolId: string, attachmentId: string): PoseReadout | null {
  const stored = readJson<StoredAttachments>(POSE_KEY, {})[attachmentKey(toolId, attachmentId)];
  return stored ? readoutFromArray(stored) : null;
}

export function saveAttachmentPose(
  toolId: string,
  attachmentId: string,
  pose: PoseReadout,
): void {
  const all = readJson<StoredAttachments>(POSE_KEY, {});
  all[attachmentKey(toolId, attachmentId)] = readoutToArray(pose);
  writeJson(POSE_KEY, all);
}

export function attachmentSnapshot(): StoredAttachments {
  return { ...readJson<StoredAttachments>(POSE_KEY, {}) };
}

export function saveAttachments(all: StoredAttachments): void {
  writeJson(POSE_KEY, all);
}

export function clearAttachmentPoses(): void {
  writeJson(POSE_KEY, {});
}

export function attachmentPoseCount(): number {
  return Object.keys(readJson<StoredAttachments>(POSE_KEY, {})).length;
}

// --- the weapon ------------------------------------------------------------

export function weaponSettings(): WeaponSettings {
  return clampWeapon(readJson<Partial<WeaponSettings>>(WEAPON_KEY, {}));
}

export function saveWeaponSettings(settings: WeaponSettings): void {
  writeJson(WEAPON_KEY, clampWeapon(settings));
}

export function clearWeaponSettings(): void {
  writeJson(WEAPON_KEY, { ...DEFAULT_WEAPON });
}

// --- the drone -------------------------------------------------------------

export function droneSettings(): DroneSettings {
  return clampDrone(readJson<Partial<DroneSettings>>(DRONE_KEY, {}));
}

export function saveDroneSettings(settings: Partial<DroneSettings>): DroneSettings {
  const next = clampDrone({ ...droneSettings(), ...settings });
  writeJson(DRONE_KEY, next);
  return next;
}

export function clearDroneSettings(): void {
  writeJson(DRONE_KEY, { ...DEFAULT_DRONE });
}
