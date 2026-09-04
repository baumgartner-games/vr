import { formatCode, packCode, unpackCode } from '../../../core/configCode';
import {
  defaultHoldPose,
  defaultIdlePose,
  handPoseFromArray,
  handPoseToArray,
  type HandPose,
} from '../../../core/handPose';
import {
  clearHandPoses,
  handPoseSnapshot,
  saveHandPoses,
  type StoredHandPoses,
} from '../../../core/handPoseStore';
import { packShortGear, parseShortGear, type ShortGear } from './shortCode';
import { GEAR_VERSION, readGear, writeGear } from './gearCodec';
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
import type { Handedness } from '../../../core/XRInput';

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
 * heraus, was zu genau einem Werkzeug gehört: seine Haltung in der Hand, der
 * Griff dafür und seine Anbauteile und — wenn es eins von den dreien ist, das
 * eigene Werte hat — seine Einstellungen. Der Code dazu ist kurz genug, um auf
 * dem Display des Justierers zu stehen, und wer ihn lädt, ändert nur dieses
 * eine Werkzeug. Möglich macht das die Abschnittsmaske in `gearCodec.ts`: was
 * nicht drinsteht, wird auch nicht angefasst.
 *
 * **Und noch eine Stufe kleiner: eine Hand.** Wer im Eingaberaum die rechte
 * Hand justiert, will den Code für die rechte Hand — nicht für beide. Beide
 * Hände in einen Code zu packen, von dem nur die Hälfte gemessen wurde, macht
 * ihn doppelt so lang und trägt die andere Hälfte als Behauptung mit sich
 * herum. Deshalb nimmt `toolGearConfig` eine Hand entgegen, und der Justierer
 * gibt die durch, an der er gerade gemessen hat.
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
 *               für die leere Hand — dann ist es die Grundhaltung.
 * @param hand   welche Hand gemeint ist, oder `null` für beide. Wer eine Hand
 *               gemessen hat, gibt sie an: der Code wird dadurch halb so lang
 *               und behauptet nichts über die andere.
 */
export function toolGearConfig(toolId: string | null, hand: Handedness | null = null): GearConfig {
  const all = gearConfig();
  const config: GearConfig = {};
  const sides: readonly Handedness[] = hand ? [hand] : ['left', 'right'];

  if (!toolId) {
    // Die leere Hand hat keine Werkzeugpose und keine Anbauteile.
    const idle: NonNullable<StoredHandPoses['idle']> = {};
    for (const side of sides) {
      const values = all.hands?.idle?.[side];
      if (values) idle[side] = values;
    }
    config.hands = { idle, hold: {} };
    return config;
  }

  const pose = all.tools?.[toolId];
  if (pose) config.tools = { [toolId]: pose };

  const hold: NonNullable<StoredHandPoses['hold']> = {};
  for (const side of sides) {
    const values = all.hands?.hold?.[side]?.[toolId];
    if (values) hold[side] = { [toolId]: values };
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
  return packCode(writeGear(gearConfig()), GEAR_VERSION);
}

/**
 * Die eine Zeile für genau ein Werkzeug an genau einer Hand — als **Kurzcode**.
 *
 * Das ist der Code, den jemand von einer Tafel abliest, und der große war
 * dafür schlicht zu breit: 22 Zeichen für sechs Zahlen, die im Klartext auch
 * 22 brauchen. `shortCode.ts` packt dieselben Zahlen in 16, und ein Werkzeug
 * samt Griff in 25 statt 66.
 *
 * Ohne Hand geht es nicht kurz — dann stünden zwei Griffe drin, und dafür ist
 * dieses Format nicht gebaut. Der große Code springt in dem Fall ein.
 */
export function toolGearCode(toolId: string | null, hand: Handedness | null = null): string {
  if (!hand) return packCode(writeGear(toolGearConfig(toolId, null)), GEAR_VERSION);

  const all = gearConfig();
  const id = toolId ?? '';
  const stored = id
    ? all.hands?.hold?.[hand]?.[id]
    : all.hands?.idle?.[hand];
  const grip = stored ? handPoseFromArray(stored, fallbackPose(hand, id)) : null;
  const built = fallbackPose(hand, id);

  return packShortGear({
    toolId: id,
    hand,
    pose: id && id !== GRAB_ID ? (all.tools?.[id] ?? null) : null,
    grip: grip ? [grip.x, grip.y, grip.z, grip.pitch, grip.yaw, grip.roll] : null,
    // Finger nur, wenn sie von der gebauten Haltung abweichen: eine Messung
    // fasst sie nicht an, und was sich nicht geändert hat, gehört nicht in
    // einen Code, den jemand abtippt.
    fingers: grip && !sameFingers(grip, built) ? { curls: grip.curls, spread: grip.spread } : null,
  });
}

/** Die Id, unter der eine Hand um ein blankes Objekt gespeichert ist. */
const GRAB_ID = 'grab';

/** Die gebaute Haltung: für die leere Hand die Grundhaltung, sonst der Griff. */
function fallbackPose(hand: Handedness, toolId: string): HandPose {
  return toolId ? defaultHoldPose(hand, toolId) : defaultIdlePose(hand);
}

function sameFingers(a: HandPose, b: HandPose): boolean {
  if (Math.round(a.spread) !== Math.round(b.spread)) return false;
  return [0, 1, 2, 3, 4].every(
    (i) => Math.round((a.curls[i] ?? 0) * 100) === Math.round((b.curls[i] ?? 0) * 100),
  );
}

/**
 * Was ein Kurzcode meint, in der Form, die `applyGearConfig` versteht.
 *
 * Fehlende Finger heißen „unverändert": sie kommen aus der gebauten Haltung
 * dieses Werkzeugs, nicht aus einer Null — sonst streckte ein Code, der nur
 * einen Griff verschiebt, nebenbei alle fünf Finger.
 */
function configFromShort(short: ShortGear): GearConfig {
  const config: GearConfig = {};
  const id = short.toolId;

  if (short.pose && id && id !== GRAB_ID) {
    config.tools = { [id]: [...short.pose] };
  }

  if (short.grip) {
    const built = fallbackPose(short.hand, id);
    const pose: HandPose = {
      ...built,
      x: short.grip[0] ?? 0,
      y: short.grip[1] ?? 0,
      z: short.grip[2] ?? 0,
      pitch: short.grip[3] ?? 0,
      yaw: short.grip[4] ?? 0,
      roll: short.grip[5] ?? 0,
    };
    if (short.fingers) {
      pose.curls = [...short.fingers.curls];
      pose.spread = short.fingers.spread;
    }
    const values = handPoseToArray(pose);
    config.hands = id
      ? { idle: {}, hold: { [short.hand]: { [id]: values } } }
      : { idle: { [short.hand]: values }, hold: {} };
  }

  return config;
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
  // Zuerst der Kurzcode: er hat sein eigenes Präfix (`BGK`), und der große
  // würde daran ohnehin scheitern.
  const short = parseShortGear(code);
  if (short) return configFromShort(short);
  const unpacked = unpackCode(code);
  return unpacked ? readGear(unpacked.payload, unpacked.version) : null;
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
