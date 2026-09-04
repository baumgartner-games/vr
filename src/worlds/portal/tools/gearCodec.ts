import { ByteReader, ByteWriter } from '../../../core/configCode';
import type { StoredHandPoses } from '../../../core/handPoseStore';
import { clampDrone, type DroneSettings } from './droneSettings';
import {
  clampWeapon,
  FIRE_MODES,
  AMMO_KINDS,
  SIGHT_KINDS,
  type WeaponSettings,
} from './weaponSettings';
import type { StoredAttachments } from './gearStore';

/**
 * The whole configuration as bytes — the reason a config code is short.
 *
 * JSON spends most of itself on its own punctuation: `{"pistol":[0,-1.2,3,…]}`
 * is nineteen characters of syntax around six numbers. Both ends of a config
 * code know the same schema, so none of that has to travel. What goes over is
 * the numbers, quantised to the precision they are *shown* with (a tenth of a
 * centimetre, a degree, a hundredth of a curl) and written as varints, so a
 * zero costs one byte and −12° costs one byte.
 *
 * The tables below are a **wire format**: entries may be appended, never
 * reordered and never removed, or an old code starts meaning something else.
 * Anything not in a table still travels — as its plain name, which costs more
 * but never fails.
 */

/** The format byte at the front, so a later change stays readable. */
const VERSION = 1;

/** Tool ids, in the order they were first written down. Append only. */
const TOOLS = [
  'gun-blue',
  'gun-red',
  'gun-dual',
  'gizmo',
  'brush',
  'pistol',
  'stopwatch',
  'grapple',
  'gravity-glove',
  'translate-glove',
  'welder',
  'xray',
  'drone',
  'tape',
  'adjust',
  'eraser',
  'superman-glove',
] as const;

/** Attachment ids. Append only, same rule. */
const ATTACHMENTS = ['reddot', 'irons', 'trace', 'xray', 'scope'] as const;

/** Drone control profiles. Append only, same rule. */
const DRONE_PROFILES = ['kopter', 'racing'] as const;

/** Position in tenths of a centimetre, angles in whole degrees. */
const POSE_SCALES = [10, 10, 10, 1, 1, 1] as const;
/**
 * A hand pose: twelve values, all to a hundredth. These are typed in rather
 * than measured, and the menu shows two decimals — so two decimals is what has
 * to survive the trip, or a value would change by being written down.
 */
const HAND_SCALES = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] as const;

const HANDS = ['left', 'right'] as const;

/** Everything one config code carries. */
export interface GearData {
  /** Tool id → `[x, y, z, pitch, yaw, roll]`, centimetres and degrees. */
  tools: Record<string, number[]>;
  hands: StoredHandPoses;
  /** `toolId:attachmentId` → the same six numbers, in the tool's own space. */
  attachments: StoredAttachments;
  weapon: WeaponSettings;
  drone: DroneSettings;
}

/** The whole configuration, packed. */
export function writeGear(data: GearData): Uint8Array {
  const out = new ByteWriter();
  out.byte(VERSION);

  const tools = Object.entries(data.tools);
  out.uint(tools.length);
  for (const [id, values] of tools) {
    writeRef(out, TOOLS, id);
    writeValues(out, values, POSE_SCALES);
  }

  let mask = 0;
  for (let i = 0; i < HANDS.length; i++) if (data.hands.idle?.[HANDS[i]!]) mask |= 1 << i;
  out.byte(mask);
  for (let i = 0; i < HANDS.length; i++) {
    if (mask & (1 << i)) writeValues(out, data.hands.idle![HANDS[i]!]!, HAND_SCALES);
  }

  const holds: Array<[number, string, number[]]> = [];
  for (let i = 0; i < HANDS.length; i++) {
    for (const [id, values] of Object.entries(data.hands.hold?.[HANDS[i]!] ?? {})) {
      holds.push([i, id, values]);
    }
  }
  out.uint(holds.length);
  for (const [hand, id, values] of holds) {
    out.byte(hand);
    writeRef(out, TOOLS, id);
    writeValues(out, values, HAND_SCALES);
  }

  const attachments = Object.entries(data.attachments);
  out.uint(attachments.length);
  for (const [key, values] of attachments) {
    const cut = key.indexOf(':');
    writeRef(out, TOOLS, cut < 0 ? key : key.slice(0, cut));
    writeRef(out, ATTACHMENTS, cut < 0 ? '' : key.slice(cut + 1));
    writeValues(out, values, POSE_SCALES);
  }

  const weapon = data.weapon;
  out.fixed(weapon.mass, 1000);
  out.fixed(weapon.speed, 10);
  out.fixed(weapon.rate, 10);
  out.uint(weapon.magazine);
  out.fixed(weapon.reload, 100);
  out.uint(weapon.burst);
  out.byte(Math.max(0, FIRE_MODES.indexOf(weapon.mode)) | (AMMO_KINDS.indexOf(weapon.ammo) << 2));
  let sights = 0;
  for (let i = 0; i < SIGHT_KINDS.length; i++) {
    if (weapon.sights.includes(SIGHT_KINDS[i]!)) sights |= 1 << i;
  }
  out.uint(sights);

  out.byte(Math.max(0, DRONE_PROFILES.indexOf(data.drone.profile)) | (data.drone.replace ? 4 : 0));

  // Appended, not inserted: an older code simply ends here, and the reader
  // gives zeros past the end — which turns back into the built-in value below.
  // New fields therefore always belong at the end, in the order they were
  // added: first the scope's magnification, then the drone's two numbers.
  out.fixed(data.weapon.zoom, 10);
  out.fixed(data.drone.speed, 10);
  out.fixed(data.drone.turn, 1);
  return out.bytes();
}

/** The other direction. Anything missing falls back to how it was built. */
export function readGear(payload: Uint8Array): GearData | null {
  const input = new ByteReader(payload);
  if (input.byte() !== VERSION) return null;

  const tools: Record<string, number[]> = {};
  for (let count = input.uint(); count > 0; count--) {
    tools[readRef(input, TOOLS)] = readValues(input, POSE_SCALES);
  }

  const idle: StoredHandPoses['idle'] = {};
  const mask = input.byte();
  for (let i = 0; i < HANDS.length; i++) {
    if (mask & (1 << i)) idle[HANDS[i]!] = readValues(input, HAND_SCALES);
  }

  const hold: Record<string, Record<string, number[]>> = {};
  for (let count = input.uint(); count > 0; count--) {
    const hand = HANDS[input.byte()] ?? 'left';
    const id = readRef(input, TOOLS);
    (hold[hand] ??= {})[id] = readValues(input, HAND_SCALES);
  }

  const attachments: StoredAttachments = {};
  for (let count = input.uint(); count > 0; count--) {
    const tool = readRef(input, TOOLS);
    const attachment = readRef(input, ATTACHMENTS);
    attachments[`${tool}:${attachment}`] = readValues(input, POSE_SCALES);
  }

  const mass = input.fixed(1000);
  const speed = input.fixed(10);
  const rate = input.fixed(10);
  const magazine = input.uint();
  const reload = input.fixed(100);
  const burst = input.uint();
  const flags = input.byte();
  const sights = input.uint();
  const weapon = clampWeapon({
    mass,
    speed,
    rate,
    magazine,
    reload,
    burst,
    mode: FIRE_MODES[flags & 3],
    ammo: AMMO_KINDS[(flags >> 2) & 1],
    sights: SIGHT_KINDS.filter((_, i) => sights & (1 << i)),
  });

  const droneByte = input.byte();

  // A code from before the scope carries no magnification — 0 means "was not
  // in there", and then the built-in value stands.
  const zoom = input.fixed(10);
  if (zoom > 0) weapon.zoom = clampWeapon({ ...weapon, zoom }).zoom;

  // Same story one field further on: a code from before Tempo und Drehrate
  // ends here, and `clampDrone` turns the zeros into the built-in values.
  const drone = clampDrone({
    profile: DRONE_PROFILES[droneByte & 3],
    replace: (droneByte & 4) !== 0,
    speed: input.fixed(10),
    turn: input.fixed(1),
  });

  return { tools, hands: { idle, hold: hold as StoredHandPoses['hold'] }, attachments, weapon, drone };
}

/** A known id as its number, anything else as `0` plus its name. */
function writeRef(out: ByteWriter, table: readonly string[], id: string): void {
  const index = table.indexOf(id);
  if (index < 0) out.uint(0).text(id);
  else out.uint(index + 1);
}

function readRef(input: ByteReader, table: readonly string[]): string {
  const index = input.uint();
  return index === 0 ? input.text() : (table[index - 1] ?? `unbekannt-${index}`);
}

function writeValues(out: ByteWriter, values: readonly number[], scales: readonly number[]): void {
  for (let i = 0; i < scales.length; i++) out.fixed(values[i] ?? 0, scales[i]!);
}

function readValues(input: ByteReader, scales: readonly number[]): number[] {
  return scales.map((scale) => input.fixed(scale));
}
