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
}
interface EntityProfile {
  label: string;
  hearing: number;
  vision: number;
  memory: number;
  sound: number;
  cadence: number;
  stepFrequency: number;
}

/** Movement, visibility and footsteps give each creature its own behaviour. */
export const ENTITY_PROFILES: Readonly<Record<MonsterKind, EntityProfile>> = {
  stalker: {
    label: 'Der Verlorene',
    hearing: 19,
    vision: 13,
    memory: 9,
    sound: 0.6,
    cadence: 0.92,
    stepFrequency: 62,
  },
  crawler: {
    label: 'Schachtläufer',
    hearing: 14,
    vision: 10,
    memory: 6,
    sound: 0.7,
    cadence: 0.38,
    stepFrequency: 190,
  },
  sentinel: {
    label: 'Wächter',
    hearing: 10,
    vision: 20,
    memory: 12,
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
  const profile = ENTITY_PROFILES[crew.options.monster];
  const distance = Math.hypot(input.player.x - input.monster.x, input.player.z - input.monster.z);
  const speed = finite(input.speed, 0, 8);
  const movement = speed < 0.1 ? 0 : Math.min(1, speed / 4.2) * (input.crouched ? 0.23 : 1);
  const hearingRange = profile.hearing * movement;
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

function finite(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : 0;
}
