import { DEFAULT_TUNING } from '../botTuning';
import { FlatRound } from '../map/flatRound';
import { TechnicianBot } from './technicianBot';
import { SUIT_LIVES } from './roundRules';

/**
 * **Ein Techniker, der das Monster gesehen hat, läuft nicht darauf zu.**
 *
 * Er darf es auch nicht *nie* dürfen: Die Scheu ist ein Preis auf der
 * Wegsuche, keine Wand (`stationNavigation.RouteAvoid`) — sonst sperrt er
 * sich in einer Ecke ein, in der er dann stehen bleibt und erstickt. Was hier
 * geprüft wird, ist der Preis: dass es ihn gibt, dass er verblasst, wenn
 * lange nichts war, und dass er steigt, je weniger Leben der Anzug noch hat.
 */

const DT = 1 / 30;
/** Weit genug, dass es ihn nicht gleich trifft, nah genug, dass es Gefahr ist. */
const NEAR = 3.5;

/** Eine Runde mit dem Monster direkt neben dem Techniker. */
function cornered(seed = 4): { round: FlatRound; bot: TechnicianBot } {
  const round = new FlatRound(seed, { roll: seed });
  const bot = new TechnicianBot(round, DEFAULT_TUNING.technician, () => 0.5);
  // Das Monster in denselben Raum: das ist Gefahr, auch ohne Berührung.
  Object.assign(round.monster, {
    x: round.player.x + NEAR,
    z: round.player.z,
    space: round.player.space,
  });
  return { round, bot };
}

describe('Die Scheu des Technikers', () => {
  it('gibt es erst, wenn er das Monster bemerkt hat — und sie verblasst wieder', () => {
    const round = new FlatRound(4, { roll: 4 });
    const bot = new TechnicianBot(round, DEFAULT_TUNING.technician, () => 0.5);
    // Das Monster startet im entferntesten Raum: kein Grund für einen Umweg.
    bot.step(DT);
    expect(bot.dreaded).toBeNull();

    Object.assign(round.monster, {
      x: round.player.x + NEAR,
      z: round.player.z,
      space: round.player.space,
    });
    bot.step(DT);
    const dread = bot.dreaded;
    expect(dread).not.toBeNull();
    expect(dread!.weight).toBeGreaterThan(0);
    expect(dread!.radius).toBeGreaterThan(1);
    // Er meidet die Stelle, an der es stand — nicht seine eigene.
    expect(Math.hypot(dread!.at.x - round.monster.x, dread!.at.z - round.monster.z)).toBeLessThan(
      1.5,
    );

    // Weit weg und lange Ruhe: Die Erinnerung verfällt, der kürzeste Weg gilt wieder.
    Object.assign(round.monster, { x: -400, z: -400, space: '' });
    for (let t = 0; t < 12; t += 0.5) bot.step(0.5);
    expect(bot.dreaded).toBeNull();
  });

  it('wiegt schwerer, je weniger Leben der Anzug hat', () => {
    const { round, bot } = cornered();
    bot.step(DT);
    const full = bot.dreaded!.weight;
    round.state().crew.hp = 1;
    bot.step(DT);
    const hurt = bot.dreaded!.weight;
    expect(hurt).toBeGreaterThan(full);
    // Und dazwischen liegt es dazwischen.
    round.state().crew.hp = 2;
    bot.step(DT);
    expect(bot.dreaded!.weight).toBeGreaterThan(full);
    expect(bot.dreaded!.weight).toBeLessThan(hurt);
    expect(SUIT_LIVES).toBe(3);
  });

  it('läuft vom Monster weg statt darauf zu', () => {
    const { round, bot } = cornered();
    const start = Math.hypot(round.player.x - round.monster.x, round.player.z - round.monster.z);
    let closest = start;
    // Das Monster steht still; der Bot ist am Zug.
    const monster = { x: round.monster.x, z: round.monster.z };
    for (let i = 0; i < 240; i++) {
      bot.step(DT);
      Object.assign(round.monster, monster);
      closest = Math.min(
        closest,
        Math.hypot(round.player.x - monster.x, round.player.z - monster.z),
      );
    }
    const gap = Math.hypot(round.player.x - monster.x, round.player.z - monster.z);
    // Er ist weiter weg als am Anfang — und kommt zwischendurch nie in
    // Schlagreichweite (`flatRound.CONTACT` = 1,7 m).
    expect(gap).toBeGreaterThan(start + 2);
    expect(closest).toBeGreaterThan(2);
    expect(bot.stage === 'flee' || bot.stage === 'hide' || bot.stage === 'mission').toBe(true);
  });
});
