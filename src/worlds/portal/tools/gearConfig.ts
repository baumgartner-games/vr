import { formatCode, packCode, unpackCode } from '../../../core/configCode';
import {
  clearHandPoses,
  handPoseSnapshot,
  saveHandPoses,
  type StoredHandPoses,
} from '../../../core/handPoseStore';
import { readGear, writeGear } from './gearCodec';
import {
  attachmentSnapshot,
  clearAttachmentPoses,
  clearDroneSettings,
  clearSupermanSettings,
  droneSettings,
  saveAttachments,
  saveDroneSettings,
  saveSupermanSettings,
  saveWeaponSettings,
  supermanSettings,
  weaponSettings,
  type StoredAttachments,
} from './gearStore';
import { clearPoses, holdPoseSnapshot, saveHoldPoses } from './poseStore';
import type { DroneSettings } from './droneSettings';
import type { SupermanSettings } from './supermanSettings';
import type { WeaponSettings } from './weaponSettings';

/**
 * All of it, in one line.
 *
 * Where every tool sits in the hand, how the hands themselves look with and
 * without something in them, where the red dot sits on the pistol, what the
 * pistol is set to, which stick flies the drone und wie schnell der
 * Supermanhandschuh fliegt — sechs kleine Speicher, ein Abzug, ein Code
 * (`gearCodec.ts` writes the bytes, `core/configCode.ts` wraps them into a
 * line).
 *
 * That code is the thing to write down. It survives a cleared browser, it can
 * be pasted into a chat, and it is the same on the machine at the other end —
 * which is what makes "here are my settings, mirror them for the left hand"
 * a two-minute job instead of forty numbers read out one at a time.
 *
 * **Und es geht auch stückweise.** `toolGearConfig` schneidet aus dem Ganzen
 * heraus, was zu genau einem Werkzeug gehört: seine Haltung in der Hand, die
 * Griffe beider Hände dafür, seine Anbauteile und — wenn es eins von den
 * dreien ist, das eigene Werte hat — seine Einstellungen. Der Code dazu ist
 * kurz genug, um auf dem Display des Justierers zu stehen, und wer ihn lädt,
 * ändert nur dieses eine Werkzeug. Möglich macht das die Abschnittsmaske in
 * `gearCodec.ts`: was nicht drinsteht, wird auch nicht angefasst.
 */
export interface GearConfig {
  /** Tool id → `[x, y, z, pitch, yaw, roll]`, centimetres and degrees. */
  tools?: Record<string, number[]>;
  /** Hand poses: idle per hand, plus one per tool that is held. */
  hands?: StoredHandPoses;
  /** `toolId:attachmentId` → the same six numbers, in the tool's own space. */
  attachments?: StoredAttachments;
  weapon?: WeaponSettings;
  drone?: DroneSettings;
  superman?: SupermanSettings;
}

/**
 * Welches Werkzeug seine eigenen Werte mitbringt. Alles andere hat nur eine
 * Haltung in der Hand — und genau das soll sein Code dann auch tragen.
 */
const TOOL_SETTINGS: Record<string, 'weapon' | 'drone' | 'superman'> = {
  pistol: 'weapon',
  drone: 'drone',
  'superman-glove': 'superman',
};

/** Everything the player has changed, right now. */
export function gearConfig(): GearConfig {
  return {
    tools: holdPoseSnapshot(),
    hands: handPoseSnapshot(),
    attachments: attachmentSnapshot(),
    weapon: weaponSettings(),
    drone: droneSettings(),
    superman: supermanSettings(),
  };
}

/**
 * Nur das, was zu einem Werkzeug gehört.
 *
 * @param toolId die Werkzeug-Id, `grab` für „Objekt in der Hand“, oder `null`
 *               für die leere Hand — dann sind es die beiden Grundhaltungen.
 */
export function toolGearConfig(toolId: string | null): GearConfig {
  const all = gearConfig();
  const config: GearConfig = {};

  if (!toolId) {
    // Die leere Hand hat keine Werkzeugpose und keine Anbauteile.
    config.hands = { idle: all.hands?.idle ?? {}, hold: {} };
    return config;
  }

  const pose = all.tools?.[toolId];
  if (pose) config.tools = { [toolId]: pose };

  const hold: NonNullable<StoredHandPoses['hold']> = {};
  for (const hand of ['left', 'right'] as const) {
    const values = all.hands?.hold?.[hand]?.[toolId];
    if (values) hold[hand] = { [toolId]: values };
  }
  if (Object.keys(hold).length > 0) config.hands = { idle: {}, hold };

  const attachments: StoredAttachments = {};
  for (const [key, values] of Object.entries(all.attachments ?? {})) {
    if (key.startsWith(`${toolId}:`)) attachments[key] = values;
  }
  if (Object.keys(attachments).length > 0) config.attachments = attachments;

  const own = TOOL_SETTINGS[toolId];
  if (own === 'weapon') config.weapon = all.weapon;
  if (own === 'drone') config.drone = all.drone;
  if (own === 'superman') config.superman = all.superman;
  return config;
}

/** The one line that carries it. */
export function gearCode(): string {
  return packCode(writeGear(gearConfig()));
}

/** Die eine Zeile für genau ein Werkzeug. */
export function toolGearCode(toolId: string | null): string {
  return packCode(writeGear(toolGearConfig(toolId)));
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
  const payload = unpackCode(code);
  return payload ? readGear(payload) : null;
}

/**
 * Puts a whole configuration into the stores. What it does *not* do is touch
 * the tools that are already built — the caller knows those, and reapplying a
 * pose to a tool in somebody's hand is its job.
 *
 * **Was der Code nicht mitbringt, bleibt stehen.** Ein Code für ein einzelnes
 * Werkzeug trägt keine Pistolenwerte, und dann sollen die eingestellten auch
 * nicht verschwinden; innerhalb eines Abschnitts wird eingemischt statt
 * ersetzt, damit derselbe Code auch nicht die Haltungen der anderen Werkzeuge
 * wegräumt.
 *
 * @returns a short line naming what came in, for the notification
 */
export function applyGearConfig(config: GearConfig): string {
  const parts: string[] = [];

  if (config.tools) {
    saveHoldPoses({ ...holdPoseSnapshot(), ...config.tools });
    parts.push(`${Object.keys(config.tools).length} Werkzeug-Posen`);
  }
  if (config.hands) {
    saveHandPoses(mergeHands(handPoseSnapshot(), config.hands));
    parts.push(`${countHands(config.hands)} Hand-Posen`);
  }
  if (config.attachments) {
    saveAttachments({ ...attachmentSnapshot(), ...config.attachments });
    parts.push(`${Object.keys(config.attachments).length} Anbauteile`);
  }
  if (config.weapon) {
    saveWeaponSettings(config.weapon);
    parts.push('Pistole');
  }
  if (config.drone) {
    saveDroneSettings(config.drone);
    parts.push('Drohne');
  }
  if (config.superman) {
    saveSupermanSettings(config.superman);
    parts.push('Supermanhandschuh');
  }

  return parts.length > 0 ? parts.join(' · ') : 'nichts';
}

/** Wie viele Haltungen ein Abschnitt trägt. */
function countHands(hands: StoredHandPoses): number {
  return (
    Object.keys(hands.idle ?? {}).length +
    Object.values(hands.hold ?? {}).reduce((sum, held) => sum + Object.keys(held ?? {}).length, 0)
  );
}

/** Neue Haltungen über die alten, Hand für Hand und Werkzeug für Werkzeug. */
function mergeHands(base: StoredHandPoses, next: StoredHandPoses): StoredHandPoses {
  const merged: StoredHandPoses = {
    idle: { ...base.idle, ...next.idle },
    hold: { ...base.hold },
  };
  for (const hand of ['left', 'right'] as const) {
    const incoming = next.hold?.[hand];
    if (!incoming) continue;
    merged.hold![hand] = { ...base.hold?.[hand], ...incoming };
  }
  return merged;
}

/** Back to how everything was built. */
export function clearGearConfig(): void {
  clearPoses();
  clearHandPoses();
  clearAttachmentPoses();
  clearDroneSettings();
  clearSupermanSettings();
}
