import type { MonsterKind } from '../mission';
import type { MonsterPace } from '../monsterRoutine';
import { ENTITY_PROFILES } from '../threat';
import { headingOf, type MapEntity, type MapPoint, type MapSnapshot } from '../map/mapSnapshot';
import { AUDIO_CUES, NOISE, type CueId } from './cues';
import { Hearing, hearingGain, reachOf, roomIdAt, type HearingWorld } from './hearing';

/**
 * **Die Regie** — welcher Cue wann von wo klingt, und wie laut er beim
 * Zuhörer ankommt.
 *
 * Sie liest den `MapSnapshot` (Wesen mit `moving`/`sprinting`/`concealed`,
 * Türen `open`, Wände, Klappen, Strom, Licht) und gibt je Schritt eine Liste
 * fertiger `SoundEvent`s zurück: Cue, Quelle, Herkunftsrichtung, Lautstärke,
 * Balance — dazu die Pegel der Ambiente-Schleifen. Kein Web Audio hier drin:
 * der Mixer (`mixer.ts`) spielt, die Regie entscheidet. Deshalb ist hier
 * prüfbar, **wer was in welcher Entfernung hört**, mit und ohne Wand
 * dazwischen, ohne dass ein Browser läuft.
 *
 * Die Lautstärken kommen aus `NOISE` (`cues.ts`) — derselben Tabelle, aus
 * der das Monster den Spieler hört. Gehen ist lauter als Schleichen, Rennen
 * lauter als Gehen, und das Monster in jeder Gangart lauter als der Spieler.
 *
 * Was klingt:
 *
 * - **Eigene Schritte** aus der **Strecke** des Spielers, nicht aus einer
 *   Uhr: Gemerkt wird, wo der letzte Schritt fiel, und wer sich `STRIDE`
 *   einen Meter davon entfernt hat, macht den nächsten — abwechselnd
 *   `FOOT_OFFSET` links und rechts neben der Mitte, damit es zwei Füße sind.
 *   Gehen und Rennen klingen gleich, Schleichen leise. Eine Uhr, die im
 *   Stand weiterlief, holte beim Losgehen erst einmal alle versäumten
 *   Schritte nach — das war das Stolpern. Außer, der Zuhörer *ist* das
 *   Monster: Wer es spielt, hört sich nicht selbst herankommen, weder als
 *   Schritt noch als Ruf noch als Herzschlag.
 * - **Monster schleicht, geht, rennt** — die Kadenz der Sorte
 *   (`ENTITY_PROFILES`), beim Schleichen länger, beim Rennen knapp die Hälfte,
 *   mit eigenem Cue. Alles durch das Hörmodell (`hearing.ts`).
 * - **Ruf** während der Verfolgung, alle paar Sekunden, laut genug für die
 *   halbe Station. Der erste kommt gleich, wenn die Jagd beginnt.
 * - **Kratzen im Schacht**, wenn das Monster fährt — aus der Klappe, die dem
 *   Zuhörer am nächsten liegt, weil der Schall den Schacht entlangläuft.
 * - **Herzschlag** am Ohr, aus Nähe und Verfolgung: ein Doppelschlag, der
 *   schneller und lauter wird. Spielwerte, nie eine gemessene Herzfrequenz.
 * - **Ambiente**: das Brummen der Station, ein tieferer Zustand ohne Strom
 *   oder Licht, und alle paar Sekunden ein Knarren oder Blech irgendwo in
 *   der Station — mit Ort, durch dieselben Türen. Das Monster hört diese
 *   Fehlalarme nicht; der Spieler soll nicht wissen, ob es das war.
 */

/** Wie nah eine Verfolgung „ganz nah" ist, in Metern — daraus wird der Herzschlag. */
export const CHASE_RANGE = 18;
/** Ab hier klopft das Herz auch ohne Verfolgung, in Metern. */
export const NEAR_RANGE = 8;
/**
 * **Ein Schritt je Meter.** Erst wer sich so weit vom letzten Schritt entfernt
 * hat, macht den nächsten — Gehen, Rennen und Schleichen unterscheiden sich
 * nur darin, wie schnell diese Meter vergehen. Ein Taktgeber aus dem
 * gemessenen Tempo stolperte: Das Tempo aus der Kopfbewegung springt, und
 * eine Uhr, die im Stand ins Negative lief, spielte beim Losgehen drei
 * Schritte in einer halben Sekunde.
 */
export const STRIDE = 1;
/** Ab hier ist der Sprung seit dem letzten Schritt kein Schritt mehr, sondern ein Teleport: kein Ton. */
export const STRIDE_JUMP = 3;
/** Wie weit die Füße neben der Mitte auftreten, in Metern — links, rechts, links. */
export const FOOT_OFFSET = 0.2;
/**
 * Wie weit ein Fuß in der Balance nach seiner Seite rückt (-1…1). Geometrisch
 * wären 20 cm neben dem Kopf, 1,6 m unter dem Ohr, kaum zu hören; das hier
 * ist bewusst mehr, weil es um den Wechsel geht und nicht um die Akustik.
 */
export const FOOT_PAN = 0.35;
/** Eigene Schritte am Ohr: Gehen und Rennen gleich laut, Schleichen so viel leiser wie in `NOISE`. */
export const STEP_GAIN = 0.8;
export const SNEAK_GAIN = (STEP_GAIN * NOISE.sneak) / NOISE.walk;
/** Rennen: so viel kürzer ist der Schritt-Takt des Monsters als beim Gehen; Schleichen so viel länger. */
export const RUN_CADENCE = 0.55;
export const STALK_CADENCE = 1.4;
/** Sekunden zwischen zwei Rufen, mindestens und höchstens. */
export const CALL_GAP: readonly [number, number] = [3, 6];
/** Der zweite Schlag eines Herzschlag-Paares, Sekunden nach dem ersten. */
export const SECOND_BEAT = 0.17;
/** Sekunden zwischen zwei Kratzern im Schacht. */
export const VENT_SCRAPE = 0.6;
/** Sekunden zwischen zwei Fehlalarmen der Station, mindestens und höchstens. */
export const AMBIENT_GAP: readonly [number, number] = [12, 30];

export interface Listener {
  at: MapPoint;
  /** Wohin der Kopf schaut, in der Bodenebene; für die Balance. */
  forward: MapPoint;
  /** Geduckt: Die eigenen Schritte sind leise. */
  crouched?: boolean;
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
  snapshot: HearingWorld & Pick<MapSnapshot, 'entities'> & Partial<Pick<MapSnapshot, 'power'>>;
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

/** Die Pegel der Schleifen nach diesem Schritt, 0…1. */
export type AmbienceLevels = Record<'ambient-hum' | 'ambient-dark', number>;

export class Soundscape {
  readonly hearing = new Hearing();
  /** Wie laut das Herz gerade klopft (0…1) — für Anzeigen. */
  heartbeat = 0;
  /** Die Schleifen der Ambiente nach dem letzten Schritt. */
  readonly ambience: AmbienceLevels = { 'ambient-hum': 0, 'ambient-dark': 0 };
  /** Wo der letzte eigene Schritt fiel — der nächste kommt `STRIDE` Meter weiter. */
  private lastStep: MapPoint | null = null;
  /** Welcher Fuß zuletzt auftrat: -1 links, 1 rechts. Der erste Schritt ist der linke. */
  private foot = 1;
  private monsterClock = 0;
  private callClock = 0;
  private heartClock = 0;
  private scrapeClock = 0;
  private ambientClock = 6;
  private chasing = false;
  private readonly mixScratch: Mix = { gain: 0, pan: 0, from: { x: 0, z: 0 }, distance: 0 };

  tick(dt: number, input: SoundscapeInput): SoundEvent[] {
    const step = Number.isFinite(dt) ? Math.max(0, Math.min(0.25, dt)) : 0;
    const out: SoundEvent[] = [];
    const me = listenerOf(input);
    if (!me) return out;
    const rng = input.rng ?? Math.random;
    // Wer das Monster **spielt**, ist selbst das Monster: Seine Schritte, sein
    // Ruf und sein Kratzen im Schacht sind für ihn keine Geräusche, sondern
    // seine eigene Bewegung. Ein Monster, das sich selbst hört, jagt sich
    // selbst — und der Herzschlag der Angst gehört ohnehin der Beute.
    const self = selfMonster(input);

    // --- Eigene Schritte -------------------------------------------------------
    // Ein Schritt je Meter Strecke seit dem letzten. Im Versteck und als
    // Monster wandert die Marke stumm mit: Wer aus dem Schrank steigt, hat
    // damit noch keinen Meter gemacht — und ein Teleport ist keine Strecke.
    const gone = this.lastStep
      ? Math.hypot(me.at.x - this.lastStep.x, me.at.z - this.lastStep.z)
      : 0;
    if (self || me.concealed || !this.lastStep || gone > STRIDE_JUMP) this.markStep(me.at);
    else if (gone > STRIDE) {
      this.markStep(me.at);
      this.foot = -this.foot;
      out.push(footstep(me, this.foot));
    }

    // --- Ambiente ----------------------------------------------------------------
    this.ambient(step, input, me, rng, out);

    // --- Das Monster -----------------------------------------------------------
    const monster =
      input.active === false || self
        ? null
        : input.snapshot.entities.find((e) => e.kind === 'monster');
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
    this.scrapeClock -= step;
    if (monster.concealed) {
      // Im Schacht: das Kratzen läuft den Schacht entlang und kommt aus der nächsten Klappe.
      if (this.scrapeClock <= 0) {
        this.scrapeClock += VENT_SCRAPE * (0.8 + rng() * 0.4);
        this.world(input, 'monster-vent', monster.at, out);
      }
      this.monsterClock = Math.min(this.monsterClock, 0);
    } else if (pace !== 'still') {
      if (this.monsterClock <= 0) {
        const cadence = ENTITY_PROFILES[input.kind].cadence;
        this.monsterClock +=
          pace === 'run'
            ? cadence * RUN_CADENCE
            : pace === 'stalk'
              ? cadence * STALK_CADENCE
              : cadence;
        const cue: CueId = pace === 'run' ? 'monster-run' : 'monster-walk';
        this.world(input, cue, monster.at, out, pace === 'stalk' ? NOISE.monsterStalk : undefined);
      }
    } else this.monsterClock = Math.min(this.monsterClock, 0);

    // Rennen heißt jagen — und wer jagt, ruft, egal wie weit weg.
    const chasing = pace === 'run' && !monster.concealed;
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
   * die noch klingen, während der Zuhörer weitergeht. `loudness` überschreibt
   * die des Cues (ein schleichendes Monster ist leiser als ein gehendes).
   */
  mix(
    input: SoundscapeInput,
    cue: CueId,
    at: MapPoint,
    loudness = AUDIO_CUES[cue].loudness,
    out: Mix = this.mixScratch,
  ): Mix {
    const me = listenerOf(input);
    if (!me || loudness <= 0) {
      out.gain = me && loudness <= 0 ? 1 : 0;
      out.pan = 0;
      out.from = at;
      out.distance = 0;
      return out;
    }
    const reach = reachOf(loudness);
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

  /** Die Marke des letzten Schritts setzen — ohne je Bild ein Objekt anzulegen. */
  private markStep(at: MapPoint): void {
    if (this.lastStep) {
      this.lastStep.x = at.x;
      this.lastStep.z = at.z;
    } else this.lastStep = { x: at.x, z: at.z };
  }

  /** Brummen, Dunkelheit und die Fehlalarme der Station. */
  private ambient(
    step: number,
    input: SoundscapeInput,
    me: Listener,
    rng: () => number,
    out: SoundEvent[],
  ): void {
    const power = input.snapshot.power !== false;
    const room = input.snapshot.rooms.find((r) => r.id === roomIdAt(input.snapshot, me.at));
    const dark = !power || (room ? !room.lit && !room.safe : false);
    this.ambience['ambient-hum'] = power ? 1 : 0.35;
    this.ambience['ambient-dark'] = !power ? 1 : dark ? 0.6 : 0;
    this.ambientClock -= step;
    if (this.ambientClock > 0) return;
    this.ambientClock = AMBIENT_GAP[0] + rng() * (AMBIENT_GAP[1] - AMBIENT_GAP[0]);
    const rooms = input.snapshot.rooms.filter((r) => !r.safe);
    if (!rooms.length) return;
    const where = rooms[Math.min(rooms.length - 1, Math.floor(rng() * rooms.length))]!;
    this.world(input, rng() < 0.6 ? 'creak' : 'metal', where.centre, out);
  }

  private world(
    input: SoundscapeInput,
    cue: CueId,
    at: MapPoint,
    out: SoundEvent[],
    loudness?: number,
  ): void {
    const mix = this.mix(input, cue, at, loudness);
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

/**
 * Ob der Zuhörer selbst das Monster ist — dann fällt alles weg, was das
 * Monster von sich gibt. Nur eine Kennung kann das sein: Wer einen Zuhörer
 * ausdrücklich hereinreicht, ist ein Ohr im Raum und kein Wesen der Runde.
 */
export function selfMonster(input: SoundscapeInput): boolean {
  if (typeof input.listener !== 'string') return false;
  const me = input.snapshot.entities.find((e) => e.id === input.listener);
  return me?.kind === 'monster';
}

/** Der Zuhörer aus dem Snapshot, wenn er als Kennung kam. */
export function listenerOf(input: SoundscapeInput): Listener | null {
  if (typeof input.listener !== 'string') return input.listener;
  const entity = input.snapshot.entities.find((e) => e.id === input.listener);
  if (!entity) return null;
  return {
    at: entity.at,
    forward: headingOf(entity.yaw),
    concealed: entity.concealed,
  };
}

type Pace = 'still' | 'stalk' | 'walk' | 'run';

function paceOf(monster: MapEntity, hint?: MonsterPace): Pace {
  if (hint) return hint === 'still' ? 'still' : hint === 'hunt' ? 'run' : hint;
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

/**
 * Ein eigener Schritt: `FOOT_OFFSET` neben der Mitte, quer zum Blick — links
 * oder rechts, je nach Fuß —, und in der Balance auf dieselbe Seite gerückt.
 * Rechts ist, was `panOf` rechts nennt: quer zum Blick nach Norden liegt
 * +x rechts. Am Ohr, ohne Entfernung: Es sind die eigenen Füße.
 */
function footstep(me: Listener, side: number): SoundEvent {
  const length = Math.hypot(me.forward.x, me.forward.z);
  const rx = length > 0.01 ? -me.forward.z / length : 1,
    rz = length > 0.01 ? me.forward.x / length : 0;
  const at = { x: me.at.x + rx * FOOT_OFFSET * side, z: me.at.z + rz * FOOT_OFFSET * side };
  return {
    cue: 'player-step',
    at,
    from: { x: at.x, z: at.z },
    distance: 0,
    gain: me.crouched ? SNEAK_GAIN : STEP_GAIN,
    pan: FOOT_PAN * side,
    delay: 0,
  };
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
