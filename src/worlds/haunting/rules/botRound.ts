import { DEFAULT_TUNING, type BotTuning } from '../botTuning';
import type { MonsterKind } from '../mission';
import { Rng } from '../rng';
import { FlatRound } from '../map/flatRound';
import type { MapRound } from '../map/mapSnapshot';
import { ROUND_SECONDS } from './roundRules';
import { TechnicianBot } from './technicianBot';

/**
 * **Eine ganze Bot-Runde in der 2D-Welt, ohne Bild** — Techniker aus Zahlen
 * gegen das Monster aus `monsterRoutine.ts`, auf der echten 2D-Runde.
 *
 * Das ist der Beleg, den die Rundenregeln brauchen: Eine Runde, die von
 * selbst endet — durch Sauerstoff, durch den Anzug oder durch die Flucht in
 * die Zentrale —, und zwar **jede**, nicht nur die, in denen das Monster
 * Glück hat. `limit` ist deshalb kein Rundenlimit, sondern die Reißleine des
 * Tests: Eine Runde, die bis dahin läuft, ist die Schleife, die es nicht
 * mehr geben darf.
 */
export interface FlatRoundResult {
  won: boolean;
  ending: MapRound['ending'] | 'runaway';
  /** Wie lange die Runde gedauert hat, in Sekunden. */
  time: number;
  suit: number;
  cabinsDestroyed: number;
  hides: number;
  repairs: number;
}

export interface FlatRoundOptions {
  tuning?: BotTuning;
  monster?: MonsterKind;
  /** Zufall der Runde — getrennt vom Samen der Station. */
  roll?: number;
  /** Die Reißleine in Sekunden: Danach gilt die Runde als davongelaufen. */
  limit?: number;
  /** Der Zeitschritt in Sekunden. */
  dt?: number;
}

export function simulateFlatRound(seed: number, options: FlatRoundOptions = {}): FlatRoundResult {
  const tuning = options.tuning ?? DEFAULT_TUNING;
  const round = new FlatRound(seed, {
    monster: options.monster ?? 'stalker',
    tuning,
    roll: options.roll ?? 0,
    mode: 'omniscient',
  });
  const dice = new Rng((seed * 31 + (options.roll ?? 0) * 0x9e3779b1) >>> 0);
  const bot = new TechnicianBot(round, tuning.technician, () => dice.next());
  const limit = options.limit ?? ROUND_SECONDS + 60;
  const dt = options.dt ?? 0.1;
  while (round.phase === 'running' && round.state().time < limit) bot.step(dt);
  const status = round.round();
  return {
    won: round.phase === 'won',
    ending: round.phase === 'running' ? 'runaway' : status.ending,
    time: round.state().time,
    suit: status.suit,
    cabinsDestroyed: status.cabinsDestroyed.length,
    hides: bot.hides,
    repairs: round.state().done.length,
  };
}
