import { PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED, type MonsterKind } from '../mission';
import type { MonsterPace } from '../monsterRoutine';
import { ENTITY_PROFILES } from '../threat';
import { headingOf, type MapEntity, type MapPoint, type MapSnapshot } from '../map/mapSnapshot';
import { AUDIO_CUES, stepLoudness, type CueId } from './cues';
import { Hearing, hearingGain, PLAYER_HEARING, reachOf, type HearingWorld } from './hearing';

/**
 * **Die Regie** — welcher Cue wann von wo klingt, und wie laut er beim
 * Zuhörer ankommt.
 *
 * Sie liest den `MapSnapshot` (Wesen mit `moving`/`sprinting`, Türen
 * `open`, Wände) und gibt eine Liste fertiger `SoundEvent`s zurück: Cue,
 * Quelle, Herkunftsrichtung, Lautstärke, Balance. Kein Web Audio hier
 * drin — der Mixer (`mixer.ts`) spielt, die Regie entscheidet. Deshalb ist
 * hier prüfbar, **wer was in welcher Entfernung hört**, mit und ohne Wand
 * dazwischen, ohne dass ein Browser läuft.
 *
 * Fünf Geräusche:
 *
 * - **Eigene Schritte** aus dem Tempo des Spielers, am Ohr.
 * - **Monster geht** und **Monster rennt** — zwei verschiedene Cues, zwei
 *   Takte: die Kadenz der Sorte (`ENTITY_PROFILES`) und knapp die Hälfte
 *   davon beim Rennen. Beide laufen durch das Hörmodell (`hearing.ts`).
 * - **Ruf** während der Verfolgung, alle paar Sekunden, laut genug für die
 *   halbe Station — und nicht der Schrei vor der Kabine, den `shipAudio.ts`
 *   weiter spielt.
 * - **Herzschlag** am Ohr, aus Nähe und Verfolgung: Ein Doppelschlag, der
 *   schneller und lauter wird, je näher es kommt. Spielwerte, nie eine
 *   gemessene Herzfrequenz.
 */

/** Wie nah eine Verfolgung „ganz nah" ist, in Metern — daraus wird der Herzschlag. */
export const CHASE_RANGE = 18;
/** Ab hier klopft das Herz auch ohne Verfolgung, in Metern. */
export const NEAR_RANGE = 8;
/** Rennen: so viel kürzer ist der Schritt-Takt als beim Gehen. */
export const RUN_CADENCE = 0.55;
/** Sekunden zwischen zwei Rufen, mindestens und höchstens. */
export const CALL_GAP: readonly [number, number] = [3, 6];
/** Der zweite Schlag eines Herzschlag-Paares, Sekunden nach dem ersten. */
export const SECOND_BEAT = 0.17;

export interface Listener {
  at: MapPoint;
  /** Wohin der Kopf schaut, in der Bodenebene; für die Balance. */
  forward: MapPoint;
  /** Metersekunden echten Gehens; fehlt es, gilt `moving`/`sprinting` des Wesens. */
  speed?: number;
  /** Im Schrank oder im Schacht: keine eigenen Schritte. */
  concealed?: boolean;
}

/** Was die Regie über das Monster wissen darf, wenn der Snapshot es nicht sagt. */
export interface MonsterHints {
  /** Der Gang aus `monsterRoutine.ts`; fehlt er, gelten `moving`/`sprinting`. */
  pace?: MonsterPace;
  /** Wie nah die Verfolgung ist (0…1); fehlt es, gilt: rennend = verfolgend. */
  chase?: number;
}

export interface SoundscapeInput {
  snapshot: HearingWorld & Pick<MapSnapshot, 'entities'>;
  /** Der Zuhörer — als Kennung eines Wesens im Snapshot oder ausdrücklich. */
  listener: string | Listener;
  kind: MonsterKind;
  monster?: MonsterHints;
  /** `false` im sicheren Test und in der Bot-Runde: keine Monster-Geräusche, kein Herzschlag. */
  active?: boolean;
  /** Gleichverteilt in [0,1). Der Aufrufer besitzt den Zufall. */
  rng?: () => number;
}

export interface SoundEvent {
  cue: CueId;
  /** Wo es passiert ist. */
  at: MapPoint;
  /** Woher der Zuhörer es kommen hört (`HearingPath.from`). */
  from: MapPoint;
  /** Effektive Meter (`hearing.ts`); 0 am Ohr. */
  distance: number;
  /** 0…1 nach Entfernung, vor dem Master. */
  gain: number;
  /** -1 links … 1 rechts. */
  pan: number;
  /** Sekunden nach dem Bild — für den zweiten Herzschlag. */
  delay: number;
}

export interface Mix {
  gain: number;
  pan: number;
  from: MapPoint;
  distance: number;
}

export class Soundscape {
  readonly hearing = new Hearing();
  /** Wie laut das Herz gerade klopft (0…1) — für Anzeigen. */
  heartbeat = 0;
  private stepClock = 0;
  private monsterClock = 0;
  private callClock = 0;
  private heartClock = 0;
  private chasing = false;
  private readonly mixScratch: Mix = { gain: 0, pan: 0, from: { x: 0, z: 0 }, distance: 0 };

  tick(dt: number, input: SoundscapeInput): SoundEvent[] {
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
    const out: SoundEvent[] = [];
    const me = listenerOf(input);
    if (!me) return out;
    const rng = input.rng ?? Math.random;

    // --- Eigene Schritte -------------------------------------------------------
    const speed = me.concealed ? 0 : (me.speed ?? 0);
    this.stepClock -= step;
    if (speed > 0.25) {
      if (this.stepClock <= 0) {
        this.stepClock += Math.max(0.28, 1.45 / speed);
        out.push(atEar('player-step', me.at, 0.55 + 0.45 * stepLoudness(speed)));
      }
    } else this.stepClock = Math.min(this.stepClock, 0.12);

    // --- Das Monster -----------------------------------------------------------
    const monster =
      input.active === false ? null : input.snapshot.entities.find((e) => e.kind === 'monster');
    if (!monster) {
      this.chasing = false;
      this.heartbeat = 0;
      this.monsterClock = Math.min(this.monsterClock, 0);
      return out;
    }
    const pace = paceOf(monster, input.monster?.pace);
    const gap = Math.hypot(monster.at.x - me.at.x, monster.at.z - me.at.z);
    const hints = input.monster;
    const chase =
      hints?.chase !== undefined
        ? clamp(hints.chase)
        : pace === 'run' && !monster.concealed
          ? clamp(1 - gap / CHASE_RANGE)
          : 0;
    const near = monster.concealed ? 0 : clamp(1 - gap / NEAR_RANGE) * 0.7;
    this.heartbeat = Math.max(chase, near);

    this.monsterClock -= step;
    if (pace !== 'still' && !monster.concealed) {
      if (this.monsterClock <= 0) {
        const cadence = ENTITY_PROFILES[input.kind].cadence;
        this.monsterClock += pace === 'run' ? cadence * RUN_CADENCE : cadence;
        this.world(input, pace === 'run' ? 'monster-run' : 'monster-walk', monster.at, out);
      }
    } else this.monsterClock = Math.min(this.monsterClock, 0);

    const chasing = chase > 0.05 && !monster.concealed;
    if (chasing && !this.chasing) this.callClock = 0.4;
    this.chasing = chasing;
    this.callClock -= step;
    if (chasing && this.callClock <= 0) {
      this.callClock = CALL_GAP[0] + rng() * (CALL_GAP[1] - CALL_GAP[0]);
      this.world(input, 'monster-call', monster.at, out);
    }

    this.heartClock -= step;
    if (this.heartbeat > 0.05 && this.heartClock <= 0) {
      const beat = this.heartbeat;
      this.heartClock = 1.05 - beat * 0.62;
      out.push(atEar('heartbeat', me.at, 0.35 + beat * 0.65));
      out.push(atEar('heartbeat', me.at, 0.22 + beat * 0.4, SECOND_BEAT));
    }
    return out;
  }

  /**
   * Lautstärke und Balance eines Weltgeräuschs bei `at`, gehört von diesem
   * Zuhörer — dieselbe Rechnung wie im Bild des Ereignisses, für Stimmen,
   * die noch klingen, während der Zuhörer weitergeht.
   */
  mix(input: SoundscapeInput, cue: CueId, at: MapPoint, out: Mix = this.mixScratch): Mix {
    const me = listenerOf(input);
    const loudness = AUDIO_CUES[cue].loudness;
    if (!me || loudness <= 0) {
      out.gain = me && loudness <= 0 ? 1 : 0;
      out.pan = 0;
      out.from = at;
      out.distance = 0;
      return out;
    }
    const reach = reachOf(loudness, PLAYER_HEARING);
    // Kein Weg ist kürzer als die Luftlinie: Was schon so zu weit ist, braucht keine Suche.
    if (Math.hypot(at.x - me.at.x, at.z - me.at.z) >= reach) {
      out.gain = 0;
      out.pan = 0;
      out.from = at;
      out.distance = Infinity;
      return out;
    }
    const path = this.hearing.path(input.snapshot, at, me.at);
    out.gain = hearingGain(path.distance, reach);
    out.pan = panOf(me, path.from);
    out.from = path.from;
    out.distance = path.distance;
    return out;
  }

  private world(input: SoundscapeInput, cue: CueId, at: MapPoint, out: SoundEvent[]): void {
    const mix = this.mix(input, cue, at);
    if (mix.gain < 0.01) return;
    out.push({
      cue,
      at: { x: at.x, z: at.z },
      from: { x: mix.from.x, z: mix.from.z },
      distance: mix.distance,
      gain: mix.gain,
      pan: mix.pan,
      delay: 0,
    });
  }
}

/** Der Zuhörer aus dem Snapshot, wenn er als Kennung kam. */
export function listenerOf(input: SoundscapeInput): Listener | null {
  if (typeof input.listener !== 'string') return input.listener;
  const entity = input.snapshot.entities.find((e) => e.id === input.listener);
  if (!entity) return null;
  return {
    at: entity.at,
    forward: headingOf(entity.yaw),
    speed: entity.moving ? (entity.sprinting ? PLAYER_SPRINT_SPEED : PLAYER_WALK_SPEED) : 0,
    concealed: entity.concealed,
  };
}

function paceOf(monster: MapEntity, hint?: MonsterPace): 'still' | 'walk' | 'run' {
  if (hint) return hint === 'still' ? 'still' : hint === 'hunt' ? 'run' : 'walk';
  return !monster.moving ? 'still' : monster.sprinting ? 'run' : 'walk';
}

/** Balance wie `shipAudio.spatialMix`: rechts vom Blick ist rechts. */
function panOf(me: Listener, from: MapPoint): number {
  const dx = from.x - me.at.x,
    dz = from.z - me.at.z;
  const distance = Math.hypot(dx, dz),
    length = Math.hypot(me.forward.x, me.forward.z);
  if (distance < 0.01 || length < 0.01) return 0;
  const pan = (dx * -me.forward.z + dz * me.forward.x) / (distance * length);
  return Math.min(1, Math.max(-1, pan));
}

function atEar(cue: CueId, at: MapPoint, gain: number, delay = 0): SoundEvent {
  return {
    cue,
    at: { x: at.x, z: at.z },
    from: { x: at.x, z: at.z },
    distance: 0,
    gain: clamp(gain),
    pan: 0,
    delay,
  };
}

function clamp(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
