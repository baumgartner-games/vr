import { DEFAULT_TUNING } from '../botTuning';
import { simulateFlatRound, type FlatRoundResult } from './botRound';
import { ROUND_SECONDS } from './roundRules';

/**
 * **Der Beleg, dass die Endlosschleife weg ist.**
 *
 * Vorher: Techniker in die Kabine, Monster reißt sie auf, Techniker in die
 * nächste, und die Kabine steht danach wieder da. Jetzt läuft ein Techniker
 * aus Zahlen mehrere Runden gegen die Monster-KI auf der echten 2D-Runde —
 * mit einem Hang zur Kabine, der die Schleife absichtlich sucht —, und jede
 * Runde endet von selbst: durch den Sauerstoff, durch den Anzug oder durch
 * die Flucht in die Zentrale. Die Reißleine liegt eine Minute hinter dem
 * Rundenlimit; sie darf nie ziehen.
 */
const SEEDS = [1, 2, 3, 4, 5] as const;
const ROUND_TIMEOUT = 90_000;

/** Ein Techniker, der die Kabine dem freien Feld immer vorzieht. */
const CABIN_LOVER = {
  monster: DEFAULT_TUNING.monster,
  technician: { ...DEFAULT_TUNING.technician, hide: 1, nerve: 4 },
};

const results = new Map<number, FlatRoundResult>();

describe('Bot-Runden in der 2D-Welt enden von selbst', () => {
  it.each(SEEDS)(
    'Seed %i: durch Sauerstoff, Anzug oder Flucht — nie durch die Reißleine',
    (seed) => {
      const result = simulateFlatRound(seed, {
        roll: seed,
        tuning: seed % 2 ? CABIN_LOVER : DEFAULT_TUNING,
      });
      results.set(seed, result);
      expect(result.ending).not.toBe('runaway');
      expect(['oxygen', 'suit', 'escaped']).toContain(result.ending);
      expect(result.time).toBeLessThanOrEqual(ROUND_SECONDS + 0.3);
      if (result.ending === 'oxygen') expect(result.time).toBeGreaterThanOrEqual(ROUND_SECONDS);
      if (result.ending === 'suit') expect(result.suit).toBe(0);
      if (result.won) expect(result.repairs).toBe(3);
    },
    ROUND_TIMEOUT,
  );

  it(
    'kommt aus denselben Zahlen zweimal gleich heraus',
    () => {
      const first = results.get(SEEDS[0]) ?? simulateFlatRound(SEEDS[0], { roll: SEEDS[0] });
      const again = simulateFlatRound(SEEDS[0], {
        roll: SEEDS[0],
        tuning: SEEDS[0] % 2 ? CABIN_LOVER : DEFAULT_TUNING,
      });
      expect(again).toEqual(first);
    },
    ROUND_TIMEOUT,
  );

  it('protokolliert, woran die Runden geendet haben', () => {
    const lines = [...results.entries()].map(
      ([seed, r]) =>
        `Seed ${seed}: ${r.ending} nach ${r.time.toFixed(0)} s · Anzug ${r.suit}/3 · ${r.cabinsDestroyed} Kabinen zerstört · ${r.hides}× versteckt · ${r.repairs}/3 repariert`,
    );
    console.info(['Bot-Runden (2D):', ...lines].join('\n'));
    expect(results.size).toBe(SEEDS.length);
  });
});
