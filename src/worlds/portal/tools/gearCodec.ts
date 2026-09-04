import { ByteReader, ByteWriter } from '../../../core/configCode';
import { HOLD_HAND_POSE, defaultIdlePose, handPoseToArray } from '../../../core/handPose';
import type { StoredHandPoses } from '../../../core/handPoseStore';
import { clampDrone, type DroneSettings } from './droneSettings';
import { clampSuperman, SUPERMAN_SOURCES, type SupermanSettings } from './supermanSettings';
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

/**
 * Wie ein Code aufgebaut ist. Die Zahl steht im Prefix (`BG3…`), nicht mehr
 * im Payload — `core/configCode.ts` reicht sie hier herein.
 *
 * **1** war die ganze Konfiguration und nichts anderes: jeder Abschnitt stand
 * immer drin, in fester Reihenfolge, und Neues wurde hinten angehängt.
 * **2** stellt eine Maske davor, die sagt, welche Abschnitte überhaupt
 * mitkommen — und erst damit gibt es einen Code für *ein* Werkzeug. Ohne die
 * Maske trüge der Code des Pinsels zwangsläufig auch die Pistolenwerte mit
 * sich herum und würde sie beim Laden überschreiben.
 * **3** stellt dieselbe Maske noch einmal eine Ebene tiefer: vor jeder Pose
 * steht, *welche ihrer Zahlen überhaupt verstellt sind*. Eine Handhaltung hat
 * zwölf Werte, von denen nach einer Messung sechs anders sind als die
 * gebauten; die anderen sechs kosten jetzt nichts mehr. Dazu ist das
 * Versions-Byte aus dem Payload in den Prefix gewandert.
 *
 * Alte Codes werden weiter gelesen; geschrieben wird nur noch 3.
 */
export const GEAR_VERSION = 3;
/** Die Fassungen mit Versions-Byte im Payload — gelesen, nie mehr geschrieben. */
const VERSION_FULL_ONLY = 1;
const VERSION_SECTIONS = 2;

/** Welche Abschnitte ein Code trägt. Bits werden angehängt, nie umsortiert. */
export const SECTION = {
  tools: 1,
  hands: 2,
  attachments: 4,
  weapon: 8,
  drone: 16,
  superman: 32,
} as const;

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
  'flashlight',
  'hand-box',
  'controller-left',
  'controller-right',
  'teleport',
] as const;

/** Attachment ids. Append only, same rule. */
const ATTACHMENTS = ['reddot', 'irons', 'trace', 'xray', 'scope'] as const;

/** Drone control profiles. Append only, same rule. */
const DRONE_PROFILES = ['kopter', 'racing'] as const;

/** Position in tenths of a centimetre, angles in whole degrees. */
const POSE_SCALES = [10, 10, 10, 1, 1, 1] as const;
/** Was eine Werkzeugpose ist, solange niemand sie angefasst hat. */
const POSE_DEFAULTS = [0, 0, 0, 0, 0, 0] as const;
/**
 * A hand pose: twelve values, all to a hundredth. These are typed in rather
 * than measured, and the menu shows two decimals — so two decimals is what has
 * to survive the trip, or a value would change by being written down.
 */
const HAND_SCALES = [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100] as const;
/**
 * Wovon eine Haltung abweicht: die leere Hand von der Grundhaltung, eine Hand
 * am Werkzeug von der gebauten Faust. Genau diese beiden Zahlenreihen stehen
 * auch in `handPoseStore.ts` als Rückfall, wenn nichts gespeichert ist — was
 * die Maske erst erlaubt: ein weggelassener Wert *ist* der gebaute.
 */
const HOLD_DEFAULTS = handPoseToArray(HOLD_HAND_POSE);

const HANDS = ['left', 'right'] as const;

/**
 * Die Grundhaltung ist je Hand eine andere, also ist auch die Maske je Hand
 * eine andere: links wird gegen die gespiegelte Haltung verglichen. Sonst
 * stünden in jedem Code einer linken Hand sechs Zahlen, die nichts anderes
 * sagen, als dass sie eine linke ist.
 */
const IDLE_DEFAULTS = HANDS.map((hand) => handPoseToArray(defaultIdlePose(hand)));

/**
 * Everything one config code carries — und jeder Abschnitt darf fehlen.
 *
 * Ein fehlender Abschnitt heißt „steht nicht in diesem Code“ und nicht „ist
 * leer“: der Code eines einzelnen Werkzeugs lässt alles andere weg, und wer
 * ihn lädt, behält seine Pistoleneinstellungen.
 */
export interface GearData {
  /** Tool id → `[x, y, z, pitch, yaw, roll]`, centimetres and degrees. */
  tools?: Record<string, number[]>;
  hands?: StoredHandPoses;
  /** `toolId:attachmentId` → the same six numbers, in the tool's own space. */
  attachments?: StoredAttachments;
  weapon?: WeaponSettings;
  drone?: DroneSettings;
  superman?: SupermanSettings;
}

/**
 * Was ein Datensatz an Abschnitten hat — genau die kommen in den Code.
 */
function sectionsOf(data: GearData): number {
  let mask = 0;
  if (data.tools) mask |= SECTION.tools;
  if (data.hands) mask |= SECTION.hands;
  if (data.attachments) mask |= SECTION.attachments;
  if (data.weapon) mask |= SECTION.weapon;
  if (data.drone) mask |= SECTION.drone;
  if (data.superman) mask |= SECTION.superman;
  return mask;
}

/** The configuration, packed — nur die Abschnitte, die es gibt. */
export function writeGear(data: GearData): Uint8Array {
  const out = new ByteWriter();
  const sections = sectionsOf(data);
  out.uint(sections);

  if (sections & SECTION.tools) {
    const tools = Object.entries(data.tools!);
    out.uint(tools.length);
    for (const [id, values] of tools) {
      writeRef(out, TOOLS, id);
      writeValues(out, values, POSE_SCALES, POSE_DEFAULTS);
    }
  }

  if (sections & SECTION.hands) writeHands(out, data.hands!);

  if (sections & SECTION.attachments) {
    const attachments = Object.entries(data.attachments!);
    out.uint(attachments.length);
    for (const [key, values] of attachments) {
      const cut = key.indexOf(':');
      writeRef(out, TOOLS, cut < 0 ? key : key.slice(0, cut));
      writeRef(out, ATTACHMENTS, cut < 0 ? '' : key.slice(cut + 1));
      writeValues(out, values, POSE_SCALES, POSE_DEFAULTS);
    }
  }

  if (sections & SECTION.weapon) writeWeapon(out, data.weapon!);
  if (sections & SECTION.drone) writeDrone(out, data.drone!);
  if (sections & SECTION.superman) writeSuperman(out, data.superman!);
  return out.bytes();
}

/**
 * The other direction. Anything missing falls back to how it was built.
 *
 * @param version was der Prefix des Codes sagt (`BG3` → 3). Die beiden alten
 *                Fassungen tragen ihre Nummer stattdessen als erstes Byte des
 *                Payloads; für die steht hier eine 2, und das Byte wird dann
 *                gelesen.
 */
export function readGear(payload: Uint8Array, version = GEAR_VERSION): GearData | null {
  const input = new ByteReader(payload);
  if (version === VERSION_SECTIONS) {
    const inner = input.byte();
    if (inner === VERSION_FULL_ONLY) return readGearV1(input);
    if (inner !== VERSION_SECTIONS) return null;
  } else if (version !== GEAR_VERSION) {
    return null;
  }

  const sections = input.uint();
  const data: GearData = {};

  if (sections & SECTION.tools) {
    const tools: Record<string, number[]> = {};
    for (let count = input.uint(); count > 0; count--) {
      tools[readRef(input, TOOLS)] = readValues(input, POSE_SCALES, POSE_DEFAULTS, version);
    }
    data.tools = tools;
  }

  if (sections & SECTION.hands) data.hands = readHands(input, version);

  if (sections & SECTION.attachments) {
    const attachments: StoredAttachments = {};
    for (let count = input.uint(); count > 0; count--) {
      const tool = readRef(input, TOOLS);
      const attachment = readRef(input, ATTACHMENTS);
      attachments[`${tool}:${attachment}`] = readValues(input, POSE_SCALES, POSE_DEFAULTS, version);
    }
    data.attachments = attachments;
  }

  if (sections & SECTION.weapon) data.weapon = readWeapon(input);
  if (sections & SECTION.drone) data.drone = readDrone(input);
  if (sections & SECTION.superman) data.superman = readSuperman(input);
  return data;
}

/**
 * Ein Code aus der Zeit vor der Abschnittsmaske: alles drin, in fester
 * Reihenfolge, und die zuletzt angehängten Felder fehlen womöglich ganz —
 * dann liest der `ByteReader` Nullen, und die Clamps machen daraus wieder die
 * Auslieferungswerte. Genau deshalb steht die alte Reihenfolge hier unberührt.
 */
function readGearV1(input: ByteReader): GearData {
  const tools: Record<string, number[]> = {};
  for (let count = input.uint(); count > 0; count--) {
    tools[readRef(input, TOOLS)] = readValues(input, POSE_SCALES, POSE_DEFAULTS, VERSION_FULL_ONLY);
  }

  const hands = readHands(input, VERSION_FULL_ONLY);

  const attachments: StoredAttachments = {};
  for (let count = input.uint(); count > 0; count--) {
    const tool = readRef(input, TOOLS);
    const attachment = readRef(input, ATTACHMENTS);
    attachments[`${tool}:${attachment}`] = readValues(
      input,
      POSE_SCALES,
      POSE_DEFAULTS,
      VERSION_FULL_ONLY,
    );
  }

  const weapon = readWeaponBody(input);
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

  return { tools, hands, attachments, weapon, drone };
}

// --- the sections, one function each ---------------------------------------

function writeHands(out: ByteWriter, hands: StoredHandPoses): void {
  let mask = 0;
  for (let i = 0; i < HANDS.length; i++) if (hands.idle?.[HANDS[i]!]) mask |= 1 << i;
  out.byte(mask);
  for (let i = 0; i < HANDS.length; i++) {
    if (mask & (1 << i)) writeValues(out, hands.idle![HANDS[i]!]!, HAND_SCALES, IDLE_DEFAULTS[i]!);
  }

  const holds: Array<[number, string, number[]]> = [];
  for (let i = 0; i < HANDS.length; i++) {
    for (const [id, values] of Object.entries(hands.hold?.[HANDS[i]!] ?? {})) {
      holds.push([i, id, values]);
    }
  }
  out.uint(holds.length);
  for (const [hand, id, values] of holds) {
    out.byte(hand);
    writeRef(out, TOOLS, id);
    writeValues(out, values, HAND_SCALES, HOLD_DEFAULTS);
  }
}

function readHands(input: ByteReader, version: number): StoredHandPoses {
  const idle: StoredHandPoses['idle'] = {};
  const mask = input.byte();
  for (let i = 0; i < HANDS.length; i++) {
    if (mask & (1 << i)) {
      idle[HANDS[i]!] = readValues(input, HAND_SCALES, IDLE_DEFAULTS[i]!, version);
    }
  }

  const hold: Record<string, Record<string, number[]>> = {};
  for (let count = input.uint(); count > 0; count--) {
    const hand = HANDS[input.byte()] ?? 'left';
    const id = readRef(input, TOOLS);
    (hold[hand] ??= {})[id] = readValues(input, HAND_SCALES, HOLD_DEFAULTS, version);
  }
  return { idle, hold: hold as StoredHandPoses['hold'] };
}

function writeWeapon(out: ByteWriter, weapon: WeaponSettings): void {
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
  out.fixed(weapon.zoom, 10);
}

/** Alles außer dem Zoom — Version 1 hatte den woanders stehen. */
function readWeaponBody(input: ByteReader): WeaponSettings {
  const mass = input.fixed(1000);
  const speed = input.fixed(10);
  const rate = input.fixed(10);
  const magazine = input.uint();
  const reload = input.fixed(100);
  const burst = input.uint();
  const flags = input.byte();
  const sights = input.uint();
  return clampWeapon({
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
}

function readWeapon(input: ByteReader): WeaponSettings {
  const weapon = readWeaponBody(input);
  const zoom = input.fixed(10);
  return zoom > 0 ? clampWeapon({ ...weapon, zoom }) : weapon;
}

function writeDrone(out: ByteWriter, drone: DroneSettings): void {
  out.byte(Math.max(0, DRONE_PROFILES.indexOf(drone.profile)) | (drone.replace ? 4 : 0));
  out.fixed(drone.speed, 10);
  out.fixed(drone.turn, 1);
}

function readDrone(input: ByteReader): DroneSettings {
  const flags = input.byte();
  return clampDrone({
    profile: DRONE_PROFILES[flags & 3],
    replace: (flags & 4) !== 0,
    speed: input.fixed(10),
    turn: input.fixed(1),
  });
}

/**
 * Der Handschuh: fünf Geschwindigkeiten, die Drehrate, die Totzone — und in
 * einem Byte, wer welche Achse bedient (je zwei Bit) plus das Querschieben.
 */
function writeSuperman(out: ByteWriter, glove: SupermanSettings): void {
  out.fixed(glove.forward, 10);
  out.fixed(glove.back, 10);
  out.fixed(glove.up, 10);
  out.fixed(glove.down, 10);
  out.fixed(glove.side, 10);
  out.fixed(glove.turn, 1);
  out.fixed(glove.deadzone, 10);
  out.byte(
    Math.max(0, SUPERMAN_SOURCES.indexOf(glove.drive)) |
      (Math.max(0, SUPERMAN_SOURCES.indexOf(glove.lift)) << 2) |
      (Math.max(0, SUPERMAN_SOURCES.indexOf(glove.yaw)) << 4) |
      (glove.strafe ? 64 : 0),
  );
}

function readSuperman(input: ByteReader): SupermanSettings {
  const forward = input.fixed(10);
  const back = input.fixed(10);
  const up = input.fixed(10);
  const down = input.fixed(10);
  const side = input.fixed(10);
  const turn = input.fixed(1);
  const deadzone = input.fixed(10);
  const flags = input.byte();
  return clampSuperman({
    forward,
    back,
    up,
    down,
    side,
    turn,
    deadzone,
    drive: SUPERMAN_SOURCES[flags & 3],
    lift: SUPERMAN_SOURCES[(flags >> 2) & 3],
    yaw: SUPERMAN_SOURCES[(flags >> 4) & 3],
    strafe: (flags & 64) !== 0,
  });
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

/**
 * Eine Zahlenreihe, und davor eine Maske, welche davon überhaupt drinsteht.
 *
 * Das ist der ganze Trick an Fassung 3. Eine Handhaltung hat zwölf Werte, von
 * denen eine Messung im Eingaberaum genau sechs verstellt — die Finger und die
 * Spreizung bleiben, wie sie gebaut wurden. Vorher kostete jeder dieser
 * unveränderten Werte trotzdem sein Byte, weil die Reihe fest war; jetzt kostet
 * er ein Bit. Verglichen wird auf dem Raster, auf dem geschrieben wird: was
 * gerundet dasselbe ergibt wie der gebaute Wert, *ist* der gebaute Wert, sonst
 * stünde eine 0.0000001 aus einer Quaternion-Rechnung für immer im Code.
 */
function writeValues(
  out: ByteWriter,
  values: readonly number[],
  scales: readonly number[],
  defaults: readonly number[],
): void {
  let mask = 0;
  for (let i = 0; i < scales.length; i++) {
    const value = values[i] ?? defaults[i] ?? 0;
    if (!onSameStep(value, defaults[i] ?? 0, scales[i]!)) mask |= 1 << i;
  }
  out.uint(mask);
  for (let i = 0; i < scales.length; i++) {
    if (mask & (1 << i)) out.fixed(values[i] ?? 0, scales[i]!);
  }
}

/**
 * Die Gegenrichtung. Codes aus den Fassungen 1 und 2 haben keine Maske — dort
 * steht jeder Wert da, und genau so wird er gelesen.
 */
function readValues(
  input: ByteReader,
  scales: readonly number[],
  defaults: readonly number[],
  version: number,
): number[] {
  if (version < GEAR_VERSION) return scales.map((scale) => input.fixed(scale));
  const mask = input.uint();
  return scales.map((scale, i) => (mask & (1 << i) ? input.fixed(scale) : (defaults[i] ?? 0)));
}

/** Ob zwei Zahlen auf demselben Rasterpunkt landen, den der Code speichert. */
function onSameStep(a: number, b: number, scale: number): boolean {
  const at = Number.isFinite(a) ? Math.round(a * scale) : 0;
  const to = Number.isFinite(b) ? Math.round(b * scale) : 0;
  return at === to;
}
