import type { CrewState, MonsterKind } from './mission';

export interface SignalPoint {
  x: number;
  z: number;
}
export interface ThreatState {
  awareness: number;
  mode: 'patrol' | 'investigate' | 'hunt' | 'search';
  memory: number;
  target: SignalPoint | null;
}
export interface ThreatInput {
  player: SignalPoint;
  monster: SignalPoint | null;
  speed: number;
  crouched?: boolean;
  flashlight: boolean;
  lineOfSight: boolean;
  insideStation: boolean;
  /** Optional local opt-in microphone amplitude; never recorded or sent over the game channel. */
  noise?: number;
}
interface EntityEvidence {
  label: string;
  clues: readonly string[];
  hearing: number;
  vision: number;
  memory: number;
  emf: number;
  temperatureDelta: number;
  sound: number;
  cadence: number;
  stepFrequency: number;
}

/** Evidence is tied to real mechanics: each entity hears, sees and sounds differently. */
export const ENTITY_EVIDENCE: Readonly<Record<MonsterKind, EntityEvidence>> = {
  stalker: {
    label: 'Der Verlorene',
    clues: [
      'Starker Temperaturabfall',
      'Pulsierende elektromagnetische Störung',
      'Langsame, schleifende Schritte',
    ],
    hearing: 19,
    vision: 13,
    memory: 9,
    emf: 4,
    temperatureDelta: -24,
    sound: 0.6,
    cadence: 0.92,
    stepFrequency: 62,
  },
  crawler: {
    label: 'Schachtläufer',
    clues: [
      'Deutliche Wärmespur',
      'Schwaches elektromagnetisches Signal',
      'Rasch aufeinanderfolgendes Kratzen',
    ],
    hearing: 14,
    vision: 10,
    memory: 6,
    emf: 2,
    temperatureDelta: 20,
    sound: 0.7,
    cadence: 0.38,
    stepFrequency: 190,
  },
  sentinel: {
    label: 'Wächter',
    clues: [
      'Geringe Erwärmung',
      'Sehr starke elektromagnetische Störung',
      'Schwere metallische Schritte',
    ],
    hearing: 10,
    vision: 20,
    memory: 12,
    emf: 5,
    temperatureDelta: 5,
    sound: 1,
    cadence: 1.02,
    stepFrequency: 88,
  },
};

export function freshThreat(): ThreatState {
  return { awareness: 0, mode: 'patrol', memory: 0, target: null };
}

export function readThreat(value: unknown): ThreatState {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const target = raw.target as Partial<SignalPoint> | null;
  return {
    awareness: finite(raw.awareness, 0, 1),
    mode:
      raw.mode === 'investigate' || raw.mode === 'hunt' || raw.mode === 'search'
        ? raw.mode
        : 'patrol',
    memory: finite(raw.memory, 0, 15),
    target:
      target && Number.isFinite(target.x) && Number.isFinite(target.z)
        ? { x: finite(target.x, -1000, 1000), z: finite(target.z, -1000, 1000) }
        : null,
  };
}

/** Host-only perception. A remembered coordinate never follows a player through a wall. */
export function stepThreat(crew: CrewState, dt: number, input: ThreatInput): void {
  const state = crew.threat;
  if (
    crew.options.test ||
    crew.simulation ||
    crew.hp <= 0 ||
    crew.hidden ||
    !input.insideStation ||
    !input.monster
  ) {
    Object.assign(state, freshThreat());
    return;
  }
  const step = finite(dt, 0, 0.1);
  if (!step) return;
  const profile = ENTITY_EVIDENCE[crew.options.monster];
  const distance = Math.hypot(input.player.x - input.monster.x, input.player.z - input.monster.z);
  const speed = finite(input.speed, 0, 8);
  // Movement is always available; optional microphone input is an already gated local scalar.
  const movement = speed < 0.1 ? 0 : Math.min(1, speed / 4.2) * (input.crouched ? 0.23 : 1);
  const hearingRange = profile.hearing * Math.max(movement, finite(input.noise, 0, 1) * 0.85);
  const heard = hearingRange > 0 && distance < hearingRange;
  const visibility = input.flashlight ? 1 : input.crouched ? 0.2 : 0.4;
  const seen = input.lineOfSight && distance < profile.vision * visibility;
  const contact = input.lineOfSight && distance < 1.8;
  const sensing = crew.venting <= 0 && (heard || seen || contact) && Number.isFinite(distance);
  if (sensing) {
    state.target = { ...input.player };
    state.memory = profile.memory;
    const intensity = contact ? 2.5 : seen ? 0.8 : 0.28;
    state.awareness = Math.min(1, state.awareness + intensity * step);
    state.mode = state.awareness >= 0.65 ? 'hunt' : 'investigate';
  } else {
    state.memory = Math.max(0, state.memory - step);
    state.awareness = Math.max(0, state.awareness - step * 0.1);
    state.mode = state.memory > 0 && state.target ? 'search' : 'patrol';
    if (state.memory === 0) state.target = null;
  }
}

export function threatTarget(crew: CrewState): SignalPoint | null {
  return crew.options.test ||
    crew.simulation ||
    crew.hidden ||
    crew.hp <= 0 ||
    crew.threat.memory <= 0
    ? null
    : crew.threat.target;
}

export interface EntityReadings {
  active: boolean;
  radar: { distance: number; bearing: number } | null;
  emf: number;
  temperature: number;
  sound: number;
  evidence: readonly string[];
}
export interface EvidenceInput {
  observer: SignalPoint;
  monster: SignalPoint | null;
  time: number;
  roomPowered?: boolean;
}

/** All readings describe this game only. Power can make a harmless level-one baseline. */
export function entityReadings(crew: CrewState, input: EvidenceInput): EntityReadings {
  const baseline = input.roomPowered ? 1 : 0;
  const empty: EntityReadings = {
    active: false,
    radar: null,
    emf: baseline,
    temperature: 19,
    sound: 0,
    evidence: [],
  };
  if (crew.options.test || crew.simulation || crew.hp <= 0 || !input.monster || crew.venting > 0)
    return empty;
  const dx = input.monster.x - input.observer.x,
    dz = input.monster.z - input.observer.z;
  const distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance) || distance > 24) return empty;
  const profile = ENTITY_EVIDENCE[crew.options.monster];
  const proximity = Math.max(0, 1 - distance / 14);
  const phase = Math.sin(
    finite(input.time, 0, 1e8) * (crew.options.monster === 'stalker' ? 4 : 1.4),
  );
  const emf = Math.max(
    baseline,
    Math.min(5, Math.round(profile.emf * proximity + Math.max(0, phase) * proximity * 0.4)),
  );
  const temperature =
    Math.round((19 + profile.temperatureDelta * Math.max(0, 1 - distance / 11)) * 10) / 10;
  const sound = Math.min(1, profile.sound / (1 + (distance / 4) ** 2));
  const evidence: string[] = [];
  if (Math.abs(temperature - 19) > 2.5) evidence.push(profile.clues[0]!);
  if (emf >= 2) evidence.push(profile.clues[1]!);
  if (sound > 0.16) evidence.push(profile.clues[2]!);
  return {
    active: true,
    radar: distance <= 18 ? { distance, bearing: Math.atan2(dx, dz) } : null,
    emf,
    temperature,
    sound,
    evidence,
  };
}

function finite(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : 0;
}
