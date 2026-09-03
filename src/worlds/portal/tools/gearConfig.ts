import { decode, encode, formatCode } from '../../../core/configCode';
import {
  clearHandPoses,
  handPoseSnapshot,
  saveHandPoses,
  type StoredHandPoses,
} from '../../../core/handPoseStore';
import {
  attachmentSnapshot,
  clearAttachmentPoses,
  saveAttachments,
  saveWeaponSettings,
  weaponSettings,
  type StoredAttachments,
} from './gearStore';
import { clearPoses, holdPoseSnapshot, saveHoldPoses } from './poseStore';
import { clampWeapon, type WeaponSettings } from './weaponSettings';

/**
 * All of it, in one line.
 *
 * Where every tool sits in the hand, how the hands themselves look with and
 * without something in them, where the red dot sits on the pistol and what the
 * pistol is set to — four little stores, one snapshot, one code
 * (`core/configCode.ts` does the squeezing).
 *
 * That code is the thing to write down. It survives a cleared browser, it can
 * be pasted into a chat, and it is the same on the machine at the other end —
 * which is what makes "here are my settings, mirror them for the left hand"
 * a two-minute job instead of forty numbers read out one at a time.
 */
export interface GearConfig {
  /** Format marker, so an old code can still be read later on. */
  v: 1;
  /** Tool id → `[x, y, z, pitch, yaw, roll]`, centimetres and degrees. */
  tools: Record<string, number[]>;
  /** Hand poses: idle per hand, plus one per tool that is held. */
  hands: StoredHandPoses;
  /** `toolId:attachmentId` → the same six numbers, in the tool's own space. */
  attachments: StoredAttachments;
  weapon: WeaponSettings;
}

/** Everything the player has changed, right now. */
export function gearConfig(): GearConfig {
  return {
    v: 1,
    tools: holdPoseSnapshot(),
    hands: handPoseSnapshot(),
    attachments: attachmentSnapshot(),
    weapon: weaponSettings(),
  };
}

/** The one line that carries it. */
export function gearCode(): string {
  return encode(gearConfig());
}

/** The same line in groups of eight, for reading off a display. */
export function gearCodeLines(code = gearCode(), perLine = 4): string[] {
  const groups = formatCode(code).split(' ');
  const lines: string[] = [];
  for (let i = 0; i < groups.length; i += perLine) {
    lines.push(groups.slice(i, i + perLine).join(' '));
  }
  return lines;
}

/**
 * Reads a code back. `null` for anything that is not one of ours — a code is
 * typed in a headset, so a typo has to end in a shrug, not in a broken hand.
 */
export function parseGearCode(code: string): GearConfig | null {
  const value = decode(code);
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const raw = value as Partial<GearConfig>;
  return {
    v: 1,
    tools: plainRecord(raw.tools),
    hands: {
      idle: plainRecord(raw.hands?.idle) as StoredHandPoses['idle'],
      hold: (raw.hands?.hold ?? {}) as StoredHandPoses['hold'],
    },
    attachments: plainRecord(raw.attachments),
    weapon: clampWeapon((raw.weapon ?? {}) as Partial<WeaponSettings>),
  };
}

/**
 * Puts a whole configuration into the stores. What it does *not* do is touch
 * the tools that are already built — the caller knows those, and reapplying a
 * pose to a tool in somebody's hand is its job.
 *
 * @returns a short line naming what came in, for the notification
 */
export function applyGearConfig(config: GearConfig): string {
  saveHoldPoses(config.tools);
  saveHandPoses(config.hands);
  saveAttachments(config.attachments);
  saveWeaponSettings(config.weapon);

  const hands =
    Object.keys(config.hands.idle ?? {}).length +
    Object.values(config.hands.hold ?? {}).reduce(
      (sum, held) => sum + Object.keys(held ?? {}).length,
      0,
    );
  return (
    `${Object.keys(config.tools).length} Werkzeug-Posen · ` +
    `${hands} Hand-Posen · ${Object.keys(config.attachments).length} Anbauteile`
  );
}

/** Back to how everything was built. */
export function clearGearConfig(): void {
  clearPoses();
  clearHandPoses();
  clearAttachmentPoses();
}

function plainRecord<T>(value: unknown): Record<string, T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return { ...(value as Record<string, T>) };
}
