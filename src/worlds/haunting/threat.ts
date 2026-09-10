import type { CrewState, MonsterKind } from './mission';
import { HEARING, hearingGain, reachOf, type Hearing, type HearingWorld } from './audio/hearing';

export interface SignalPoint {
  x: number;
  z: number;
}
export interface ThreatState {
  /** 0…1, eine Anzeige: Alarmstufe durch drei, bei der Jagd 1. */
  awareness: number;
  mode: 'patrol' | 'investigate' | 'hunt' | 'search';
  /** Sekunden, die die erinnerte Stelle noch gilt. */
  memory: number;
  /** Die erinnerte Stelle — bei der Jagd der Spieler, sonst woher es das Geräusch hörte. */
  target: SignalPoint | null;
  /** Alarmstufe aus leisen Geräuschen: 0 ruhig, 1 aufmerksam, 2 lauernd, 3 sicher. */
  alert: number;
  /** Woher das letzte Geräusch kam — die Tür, die Klappe oder die Stelle selbst. */
  facing: SignalPoint | null;
  /** Sekunden seit dem letzten gezählten Geräusch. */
  quiet: number;
  /** Ein lautes Geräusch, dem noch niemand nachgegangen ist. */
  loud: SignalPoint | null;
}

/** Eine Quelle, die gerade Lärm macht: wo und wie laut (Vielfache der Hörweite, `cues.ts`). */
export interface NoiseSource {
  at: SignalPoint;
  loudness: number;
}

/** Ein Geräusch, das beim Monster angekommen ist — schon durch das Hörmodell. */
export interface HeardNoise {
  /** Woher es zu kommen scheint: die Quelle selbst oder der letzte Durchgang davor. */
  from: SignalPoint;
  source: SignalPoint;
  loudness: number;
  /** Wie laut es ankommt, 0…1. */
  gain: number;
  distance: number;
}

export interface ThreatInput {
  player: SignalPoint;
  monster: SignalPoint | null;
  /** Was das Monster in diesem Schritt hört (`hearNoises`). */
  noises: readonly HeardNoise[];
  crouched?: boolean;
  flashlight: boolean;
  lineOfSight: boolean;
  insideStation: boolean;
  inView?: boolean;
  /**
   * Wenn der Aufrufer ein besseres Sehmodell hat (die 2D-Runde rechnet mit
   * Licht, Kegel und Wänden der Karte), sagt er hier direkt, ob es den
   * Spieler sieht; dann gelten `flashlight`, `inView` und die Sichtweite nicht.
   */
  seen?: boolean;
}
interface EntityProfile {
  label: string;
  /** Hörweite in Metern — für alle Sorten `HEARING`; die Zahl steht hier für Anzeigen. */
  hearing: number;
  vision: number;
  memory: number;
  sound: number;
  cadence: number;
  stepFrequency: number;
}

/**
 * Movement, visibility and footsteps give each creature its own behaviour.
 *
 * **Das Gehör ist bei allen dasselbe** (`audio/hearing.ts`): Wer weiter zu
 * hören ist, ist lauter, nicht besser gehört. Die Sorten unterscheiden sich
 * in Sicht, Gedächtnis, Tempo und Takt.
 */
export const ENTITY_PROFILES: Readonly<Record<MonsterKind, EntityProfile>> = {
  stalker: {
    label: 'Der Verlorene',
    hearing: HEARING,
    vision: 13,
    memory: 9,
    sound: 0.6,
    cadence: 0.92,
    stepFrequency: 62,
  },
  crawler: {
    label: 'Schachtläufer',
    hearing: HEARING,
    vision: 10,
    memory: 6,
    sound: 0.7,
    cadence: 0.38,
    stepFrequency: 190,
  },
  sentinel: {
    label: 'Wächter',
    hearing: HEARING,
    vision: 20,
    memory: 12,
    sound: 1,
    cadence: 1.02,
    stepFrequency: 88,
  },
};

/**
 * **Die Alarmleiter.** Ein leises Geräusch ist ein Anhaltspunkt, kein
 * Beweis: Beim ersten wird das Monster aufmerksam und langsamer, beim zweiten
 * dreht es sich hin und lauert, beim dritten ist es sich sicher und jagt.
 * Zwei Schritte hintereinander sind **ein** Geräusch — gezählt wird höchstens
 * einmal je `NOISE_WINDOW`; und wer danach still ist, wird nach
 * `ALERT_DECAY` Sekunden je Stufe wieder vergessen.
 *
 * Ein **lautes** Geräusch (ab `LOUD`: eine Tür, ein Sprint im Nebenraum)
 * ist etwas anderes: Das Monster weiß dann, dass dort etwas ist, und geht
 * hin oder lauert — jagen tut es erst, wenn es sieht oder berührt.
 */
export const LOUD = 1;
export const NOISE_WINDOW = 2.5;
export const ALERT_DECAY = 8;
export const MAX_ALERT = 3;

export function freshThreat(): ThreatState {
  return {
    awareness: 0,
    mode: 'patrol',
    memory: 0,
    target: null,
    alert: 0,
    facing: null,
    quiet: 0,
    loud: null,
  };
}

export function readThreat(value: unknown): ThreatState {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  return {
    awareness: finite(raw.awareness, 0, 1),
    mode:
      raw.mode === 'investigate' || raw.mode === 'hunt' || raw.mode === 'search'
        ? raw.mode
        : 'patrol',
    memory: finite(raw.memory, 0, 15),
    target: point(raw.target),
    alert: Math.round(finite(raw.alert, 0, MAX_ALERT)),
    facing: point(raw.facing),
    quiet: finite(raw.quiet, 0, 60),
    loud: point(raw.loud),
  };
}

/**
 * Die Geräusche dieses Schritts durch das Hörmodell an die Ohren des
 * Monsters: Nur was ankommt, kommt zurück. `acuity` ist das Vielfache der
 * Hörweite aus den Gewichten (`botTuning.monster.hearing`); 1 heißt
 * dieselben Ohren wie der Spieler.
 */
export function hearNoises(
  hearing: Hearing,
  world: HearingWorld,
  listener: SignalPoint,
  sources: readonly NoiseSource[],
  acuity = 1,
): HeardNoise[] {
  const out: HeardNoise[] = [];
  for (const source of sources) {
    const reach = reachOf(source.loudness, HEARING * acuity);
    if (reach <= 0) continue;
    // Kein Weg ist kürzer als die Luftlinie: Was so schon zu weit ist, braucht keine Suche.
    if (Math.hypot(source.at.x - listener.x, source.at.z - listener.z) >= reach) continue;
    const path = hearing.path(world, source.at, listener);
    const gain = hearingGain(path.distance, reach);
    if (gain <= 0) continue;
    out.push({
      from: { x: path.from.x, z: path.from.z },
      source: { x: source.at.x, z: source.at.z },
      loudness: source.loudness,
      gain,
      distance: path.distance,
    });
  }
  return out;
}

/** Host-only perception. A remembered coordinate never follows a player through a wall. */
/**
 * `weights` sind die Gewichte des Monsters (`botTuning.MonsterTuning`), soweit
 * sie die Wahrnehmung betreffen. Sie waren hier lange nicht dabei, und das war
 * ein stiller Fehler: Die 2D-Runde und die Trainingssimulation rechneten mit
 * `profile.memory × tuning.memory` (bei den ausgelieferten Gewichten 9 s × 0,4
 * = 3,6 s), das Headset mit den rohen 9 s. Dasselbe Monster hatte in der
 * Brille also ein zweieinhalbmal längeres Gedächtnis als im Training, gegen
 * das es abgestimmt wurde. Ohne `weights` bleibt es beim rohen Profil — für
 * Tests, die nichts von Gewichten wissen wollen.
 */
export function stepThreat(
  crew: CrewState,
  dt: number,
  input: ThreatInput,
  weights?: { vision: number; memory: number },
): void {
  const state = crew.threat;
  if (
    (crew.options.test && !crew.simulation) ||
    crew.hp <= 0 ||
    !input.insideStation ||
    !input.monster
  ) {
    Object.assign(state, freshThreat());
    return;
  }
  const profile = ENTITY_PROFILES[crew.options.monster];
  const senses = !crew.hidden && crew.venting <= 0;
  stepAwareness(
    state,
    dt,
    input,
    weights
      ? { vision: profile.vision * weights.vision, memory: profile.memory * weights.memory }
      : profile,
    senses,
  );
}

/**
 * **Der Kern**, ohne Crew: Die 2D-Runde und die Trainingssimulation rufen
 * ihn mit ihrem eigenen Zustand. `senses` ist falsch, solange der Spieler im
 * Schrank oder im Schacht ist — dann kommt nichts an, aber die Uhren laufen.
 */
export function stepAwareness(
  state: ThreatState,
  dt: number,
  input: ThreatInput,
  profile: Pick<EntityProfile, 'vision' | 'memory'>,
  senses = true,
): void {
  // Bis zu einer halben Sekunde je Schritt: Die Trainingssimulation rechnet in Vierteln.
  const step = finite(dt, 0, 0.5);
  if (!step || !input.monster) return;
  const distance = Math.hypot(input.player.x - input.monster.x, input.player.z - input.monster.z);
  const visibility = input.flashlight ? 1 : input.crouched ? 0.2 : 0.4;
  const seen =
    senses &&
    (input.seen ??
      (input.lineOfSight && input.inView !== false && distance < profile.vision * visibility));
  const contact = senses && input.lineOfSight && distance < 1.8;

  // 1. Gesehen oder berührt: Jagd, und zwar auf den Spieler selbst. Die
  // Alarmleiter bleibt, wo sie ist — aus den Augen heißt danach „absuchen".
  if ((seen || contact) && Number.isFinite(distance)) {
    state.target = { ...input.player };
    state.memory = profile.memory;
    state.facing = { ...input.player };
    state.quiet = 0;
    state.loud = null;
    state.awareness = 1;
    state.mode = 'hunt';
    return;
  }

  // 2. Gehört: das lauteste Geräusch dieses Schritts zählt.
  state.quiet += step;
  let heard: HeardNoise | null = null;
  if (senses)
    for (const noise of input.noises)
      if (noise.gain > 0 && (!heard || noise.gain > heard.gain)) heard = noise;
  if (heard) {
    if (heard.loudness >= LOUD) {
      // Laut: Es weiß, dass dort etwas ist — der Ort ist bekannt, nicht der Täter.
      state.loud = { ...heard.from };
      state.facing = { ...heard.from };
      state.alert = Math.max(state.alert, 2);
      state.quiet = 0;
    } else if (state.alert === 0 || state.quiet >= NOISE_WINDOW) {
      state.alert = Math.min(MAX_ALERT, state.alert + 1);
      state.facing = { ...heard.from };
      state.quiet = 0;
    } else state.facing = { ...heard.from };
  }

  // 3. Sicher: Jagd auf die Stelle, aus der es zuletzt kam. Solange weiter
  // etwas zu hören ist, wandert die Stelle mit; die Stufe bleibt oben, bis
  // die Stille sie abbaut.
  if (heard && state.alert >= MAX_ALERT && state.facing) {
    state.target = { ...state.facing };
    state.memory = profile.memory;
    state.mode = 'hunt';
    state.awareness = 1;
    return;
  }

  // 4. Vergessen: das Gedächtnis der Jagd, dann die Alarmstufen.
  state.memory = Math.max(0, state.memory - step);
  if (state.memory === 0) state.target = null;
  if (state.alert > 0 && state.quiet >= ALERT_DECAY) {
    state.alert--;
    state.quiet = 0;
    if (state.alert === 0) state.facing = null;
  }
  state.awareness = Math.max(state.awareness - step * 0.1, state.alert / MAX_ALERT);
  state.mode =
    state.memory > 0 && state.target
      ? state.alert >= MAX_ALERT
        ? 'hunt'
        : 'search'
      : state.alert > 0
        ? 'investigate'
        : 'patrol';
}

export function threatTarget(crew: CrewState): SignalPoint | null {
  return (crew.options.test && !crew.simulation) || crew.hp <= 0 || crew.threat.memory <= 0
    ? null
    : crew.threat.target;
}

export interface ThreatAlert {
  alert: number;
  facing: SignalPoint | null;
  loud: SignalPoint | null;
}

/** Was die Routine über den Alarm wissen darf: Stufe, Richtung und ein lautes Geräusch (einmal). */
export function threatAlert(crew: CrewState): ThreatAlert {
  if ((crew.options.test && !crew.simulation) || crew.hp <= 0)
    return { alert: 0, facing: null, loud: null };
  return takeAlert(crew.threat);
}

/** Dasselbe für einen nackten Zustand; das laute Geräusch wird dabei **abgeholt**. */
export function takeAlert(state: ThreatState): ThreatAlert {
  const loud = state.loud;
  state.loud = null;
  return { alert: state.alert, facing: state.facing, loud };
}

function point(value: unknown): SignalPoint | null {
  const raw = value as Partial<SignalPoint> | null;
  return raw && Number.isFinite(raw.x) && Number.isFinite(raw.z)
    ? { x: finite(raw.x, -1000, 1000), z: finite(raw.z, -1000, 1000) }
    : null;
}

function finite(value: unknown, min: number, max: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : 0;
}
