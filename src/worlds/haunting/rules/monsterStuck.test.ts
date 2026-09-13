import type { BotTuning } from '../botTuning';
import { FlatRound } from '../map/flatRound';
import { Rng } from '../rng';
import { TechnicianBot } from './technicianBot';

/**
 * **Der Beleg, dass das Monster nicht mehr mit Ziel im Raum stehen bleibt.**
 *
 * Zwei Runden, zwei Ursachen, die beide so aussahen: „Das Monster steht in
 * einem Raum und hat kein Ziel mehr."
 *
 * Mit Seed 1 stand es ab Sekunde 138 in der Mitte seines Raums bis zum Ende
 * der Runde — erst beim Absuchen mit Absicht, dann mit jedem neuen Ziel, das
 * die Routine ihm gab, ohne einen Schritt zu tun: `FlatRound.moveMonster`
 * hielt das Stehen am Ende der Route für ein Festlaufen und schickte es alle
 * 1,2 s „zurück in die Raummitte", wo es schon stand, und fragte die Wegsuche
 * nie mehr.
 *
 * Mit Seed 7 stand es ab Sekunde 41 in „Verfolgung" an der Stelle, an der es
 * den Techniker zuletzt vermutet hatte: Die Abfangrechnung
 * (`monster/monsterIntercept.plan`) verfolgte ohne Sichtkontakt die Stelle
 * aus der Prognose, und wer schon dort steht, holt in null Sekunden auf —
 * also „verfolgen", jedes Bild aufs Neue, bis die Runde am Sauerstoff endete.
 *
 * Hier werden beide Runden gespielt und gemessen: Kein Stillstand mit
 * gesetztem Ziel dauert länger als die Suchfrist plus etwas Luft — die Zeit,
 * die es beim Absuchen mit Absicht in der Raummitte steht.
 *
 * **Die Gewichte stehen ausgeschrieben** und nicht als `DEFAULT_TUNING`: Es
 * sind die, mit denen beide Fehler gefunden wurden, und eine Runde ist nur
 * mit denselben Zahlen dieselbe Runde. Ein späterer Trainingslauf soll
 * diesem Test nicht den Boden wegziehen (so hält es auch
 * `botTraining.test.ts` mit seinen Vorrichtungen).
 */
const TUNING: BotTuning = {
  monster: {
    speed: 1,
    hunt: 1.55,
    stalk: 0.9,
    hearing: 0.9,
    vision: 1.35,
    memory: 0.95,
    search: 16,
    locker: 0.5,
    guess: 0.4,
    wander: 0.15,
    stakeout: 0.05,
    reposition: 2,
    savour: 2.5,
    ambush: 0.4,
    predict: 1,
    rush: 4,
  },
  technician: {
    walk: 2.6,
    sprint: 4.94,
    stamina: 9.5,
    caution: 7,
    hide: 0.4,
    work: 1.15,
    nerve: 10,
  },
};

describe('Das Monster steht nie länger mit einem Ziel im Raum, als das Absuchen dauert', () => {
  it.each([
    { seed: 1, until: 160, after: 139 },
    { seed: 7, until: 90, after: 42 },
  ])(
    'Seed $seed',
    ({ seed, until, after }) => {
      const round = new FlatRound(seed, { tuning: TUNING, roll: seed, mode: 'omniscient' });
      const dice = new Rng((seed * 31 + seed * 0x9e3779b1) >>> 0);
      const bot = new TechnicianBot(round, TUNING.technician, () => dice.next());
      const limit = TUNING.monster.search + 3;
      let since = 0;
      let mark = { x: round.monster.x, z: round.monster.z };
      let longest = 0;
      let moved = 0;
      while (round.phase === 'running' && round.state().time < until) {
        bot.step(0.1);
        const decided = round.decided;
        const time = round.state().time;
        if (!decided) continue;
        const gap = Math.hypot(round.monster.x - mark.x, round.monster.z - mark.z);
        if (gap > 0.02 || !decided.goal || decided.pace === 'still') {
          if (time >= after) moved += gap;
          mark = { x: round.monster.x, z: round.monster.z };
          since = time;
        } else longest = Math.max(longest, time - since);
      }
      expect(longest).toBeLessThan(limit);
      // Und nach dem Moment, ab dem es vorher stand, geht es wirklich weiter.
      expect(moved).toBeGreaterThan(5);
    },
    60_000,
  );
});
