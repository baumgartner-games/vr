import { DEFAULT_TUNING } from '../botTuning';
import { FlatRound } from '../map/flatRound';
import { Rng } from '../rng';
import { simulateFlatRound, type FlatRoundResult } from './botRound';
import { ROUND_SECONDS } from './roundRules';
import { TechnicianBot } from './technicianBot';

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

  /**
   * **Der Beleg, dass das Abfangen im Spiel wirklich vorkommt** — und nicht
   * nur in einem Test mit vier Rechtecken.
   *
   * Die Rechnung dahinter (`monster/monsterIntercept.plan`) hat einen blinden
   * Fleck, den man nur auf einer echten Station sieht: Auf der groben
   * Raumkarte der Trainingssimulation (`roundSim.ts`) nehmen Verfolger und
   * Verfolgter denselben kürzesten Weg, und wer denselben Weg nimmt, kürzt
   * nichts ab — dort steht `intercept` deshalb fast nie. Erst mit echten
   * Wänden, Türen und Möbeln gibt es die Abkürzung, auf die es ankommt. Also
   * wird sie hier gezählt, in einer ganzen Bot-Runde mit Techniker.
   *
   * `ambush` wird bewusst **nicht** verlangt: Lauern braucht ein sehr sicheres
   * Glaubensbild in einem Raum mit höchstens zwei Türen, und ob eine Station
   * so einen Raum an der richtigen Stelle hat, entscheidet der Bauplan.
   */
  it(
    'zeigt in einer Runde, dass das Monster abfängt statt hinterherzulaufen',
    () => {
      const seen = new Set<string>();
      let boosted = 0;
      // Vier Runden und nicht eine: Ob eine Abkürzung überhaupt existiert,
      // hängt am Grundriss, und eine Runde, die nach anderthalb Minuten am
      // Anzug endet, hatte schlicht keine Gelegenheit dazu.
      for (const seed of [1, 2, 3, 4]) {
        const round = new FlatRound(seed, {
          tuning: DEFAULT_TUNING,
          roll: seed,
          mode: 'omniscient',
        });
        const dice = new Rng((seed * 31 + seed * 0x9e3779b1) >>> 0);
        const bot = new TechnicianBot(round, DEFAULT_TUNING.technician, () => dice.next());
        while (round.phase === 'running' && round.state().time < ROUND_SECONDS + 60) {
          bot.step(0.1);
          const decided = round.decided;
          if (!decided) continue;
          seen.add(decided.mode);
          if (decided.boost > 0) boosted += 0.1;
          // Und was es denkt, steht heraus (Vertrag 4.7) — gezeichnet wird es
          // in einem eigenen Paket, hier zählt nur, dass es ankommt.
          expect(decided.insight?.mode).toBe(decided.mode);
        }
      }
      expect(seen).toContain('intercept');
      expect(seen).toContain('hunt');
      // Blutrausch oder der Schub nach einer Reparatur: irgendwann greift einer.
      expect(boosted).toBeGreaterThan(0);
    },
    ROUND_TIMEOUT * 4,
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
