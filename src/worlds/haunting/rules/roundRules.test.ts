import { freshCrew, stationOptions } from '../mission';
import { FlatRound, MONSTER_ID, PLAYER_ID } from '../map/flatRound';
import { FlatWalker } from '../map/flatWalk';
import { clockText, ROUND_SECONDS, RoundRules, SUIT_LIVES } from './roundRules';

const DT = 1 / 30;

function walkTo(round: FlatRound, goal: { x: number; z: number }, limit = 120): boolean {
  const walker = new FlatWalker(round);
  for (let t = 0; t < limit; t += DT) {
    if (round.phase !== 'running') return true;
    const input = walker.input(goal, DT);
    if (!input) return true;
    round.step(DT, input);
  }
  return false;
}

describe('Die Rundenregeln für sich', () => {
  it('rechnet den Sauerstoff aus derselben Uhr wie die Runde', () => {
    const rules = new RoundRules();
    expect(rules.oxygenLeft({ time: 0 })).toBe(ROUND_SECONDS);
    expect(rules.oxygenLeft({ time: 100 })).toBe(ROUND_SECONDS - 100);
    expect(rules.oxygenLeft({ time: ROUND_SECONDS + 5 })).toBe(0);
    expect(clockText(ROUND_SECONDS)).toBe('10:00');
    expect(clockText(59.2)).toBe('1:00');
    expect(clockText(0)).toBe('0:00');
  });

  it('macht beim Kabinenangriff die Kabine kaputt und kostet ein Leben — auch unverwundbar', () => {
    const rules = new RoundRules();
    const crew = freshCrew(stationOptions({ monster: 'stalker' }));
    crew.hidden = 'r3';
    crew.invulnerable = 2.5;
    expect(rules.cabinStrike(crew)).toBe(true);
    expect(crew.hidden).toBe('');
    expect(crew.hp).toBe(SUIT_LIVES - 1);
    expect(crew.invulnerable).toBeGreaterThan(0);
    expect(rules.cabinUsable('r3')).toBe(false);
    expect(rules.cabinUsable('r4')).toBe(true);
    expect(rules.destroyedCabins()).toEqual(['r3']);
    // Ohne Versteck gibt es keinen Kabinenangriff.
    expect(rules.cabinStrike(crew)).toBe(false);
    expect(crew.hp).toBe(SUIT_LIVES - 1);
  });

  it('lässt im sicheren Test den Anzug ganz, die Kabine aber nicht', () => {
    const rules = new RoundRules();
    const crew = freshCrew(stationOptions({ test: true }));
    crew.hidden = 'r1';
    expect(rules.cabinStrike(crew)).toBe(false);
    expect(crew.hp).toBe(SUIT_LIVES);
    expect(rules.cabinUsable('r1')).toBe(false);
    rules.reset();
    expect(rules.cabinUsable('r1')).toBe(true);
  });

  /**
   * **Die Liste steht im Stand.** So geht sie mit `stateMessage` über die
   * Leitung, ohne dass der Gastgeber vor jedem Senden abgleicht — und wer
   * den Stand des Gastgebers übernimmt (`adopt`), hat sie damit schon.
   */
  it('führt die zerstörten Kabinen im Stand, den der Getter liefert — auch nach einem Tausch', () => {
    let state = { destroyed: [] as string[] };
    const rules = new RoundRules(() => state);
    rules.destroyCabin('r2');
    rules.destroyCabin('r2');
    expect(state.destroyed).toEqual(['r2']);
    expect(rules.cabinUsable('r2')).toBe(false);
    // Übernahme vom Gastgeber: ein neues Objekt, eine andere Liste.
    state = { destroyed: ['r7', 'r1'] };
    expect(rules.destroyedCabins()).toEqual(['r7', 'r1']);
    expect(rules.cabinUsable('r2')).toBe(true);
    expect(rules.cabinUsable('r7')).toBe(false);
    rules.reset();
    expect(state.destroyed).toEqual([]);
  });
});

describe('Die Rundenregeln in der 2D-Runde', () => {
  it('beendet die Runde, wenn der Sauerstoff aufgebraucht ist', () => {
    const round = new FlatRound(3, { test: true });
    round.haunt.time = ROUND_SECONDS - 0.02;
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.phase).toBe('lost');
    expect(round.drain().at(-1)?.text).toMatch(/Sauerstoff/);
    const status = round.round();
    expect(status.oxygen).toBe(0);
    expect(status.ending).toBe('oxygen');
    expect(status.suit).toBe(SUIT_LIVES);
    // Danach steht die Uhr: kein weiteres Bild rechnet die Runde weiter.
    const stopped = round.state().time;
    round.step(DT, { x: 1, z: 0, sprint: true });
    expect(round.state().time).toBe(stopped);
  });

  it('steht im Snapshot: Sauerstoff, Anzug, Kabinen — serialisierbar', () => {
    const round = new FlatRound(3, { test: true });
    round.step(DT, { x: 0, z: 0, sprint: false });
    const snapshot = round.snapshot();
    expect(snapshot.round).toEqual({
      phase: 'running',
      oxygen: expect.any(Number),
      limit: ROUND_SECONDS,
      suit: SUIT_LIVES,
      suitMax: SUIT_LIVES,
      cabinsDestroyed: [],
      ending: '',
    });
    expect(snapshot.round!.oxygen).toBeLessThan(ROUND_SECONDS);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('nimmt eine zerstörte Kabine aus dem Spiel: Karte, Knopf und Versteck', () => {
    const round = new FlatRound(3, { test: true });
    const locker = round.items().find((i) => i.kind === 'locker')!;
    expect(walkTo(round, locker.at)).toBe(true);
    expect(round.target?.kind).toBe('locker');
    round.act('interact');
    expect(round.state().crew.hidden).toBe(locker.roomId);
    // Der Angriff: Kabine hin, Techniker steht wieder im Raum.
    round.rules.cabinStrike(round.state().crew);
    expect(round.state().crew.hidden).toBe('');
    round.step(DT, { x: 0, z: 0, sprint: false });
    const after = round.items().find((i) => i.id === locker.id)!;
    expect(after.state).toBe('destroyed');
    expect(after.interactive).toBe(false);
    expect(round.snapshot().round!.cabinsDestroyed).toEqual([locker.roomId]);
    // Der Knopf bietet die Kabine nicht mehr an, und Interagieren versteckt nicht.
    expect(round.target?.kind).not.toBe('locker');
    round.act('interact');
    expect(round.state().crew.hidden).toBe('');
  });

  it('lässt das Monster die Kabine aufreißen: ein Leben weniger, Kabine für den Rest der Runde hin', () => {
    const round = new FlatRound(2, { roll: 2 });
    round.mode = 'omniscient';
    // Der Techniker versteckt sich im Raum des Monsters — ein beobachteter Rückzug.
    const monsterRoom = round.monster.space;
    const locker = round.items().find((i) => i.kind === 'locker' && i.roomId === monsterRoom);
    const target = locker ?? round.items().find((i) => i.kind === 'locker')!;
    expect(round.place(target.at)).toBe(true);
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.target?.kind).toBe('locker');
    round.act('interact');
    expect(round.state().crew.hidden).toBe(target.roomId);
    round.monster.x = target.at.x + 0.5;
    round.monster.z = target.at.z;
    round.monster.space = target.roomId;
    let struck = false;
    for (let t = 0; t < 30 && !struck; t += DT) {
      round.step(DT, { x: 0, z: 0, sprint: false });
      struck = round.drain().some((e) => /Kabine wird aufgerissen|Anzug zerstört/.test(e.text));
    }
    expect(struck).toBe(true);
    expect(round.state().crew.hidden).toBe('');
    expect(round.state().crew.hp).toBe(SUIT_LIVES - 1);
    expect(round.rules.cabinUsable(target.roomId)).toBe(false);
    expect(round.snapshot().round!.suit).toBe(SUIT_LIVES - 1);
    expect(round.snapshot().entities.map((e) => e.id)).toEqual([PLAYER_ID, MONSTER_ID]);
  });

  /**
   * **Getroffen wird nur, wer in genau dieser Kabine steckt.** Das Monster
   * reißt auch leere Kabinen auf (`monsterRoutine.ts`, Verdachts-Angriff);
   * die gehen kaputt, aber der Techniker in einer anderen bleibt heil.
   */
  it('macht beim Aufreißen einer fremden Kabine nur die Kabine kaputt, nicht den Anzug', () => {
    const round = new FlatRound(2, { roll: 2 });
    round.mode = 'omniscient';
    const lockers = round.items().filter((i) => i.kind === 'locker');
    const mine = lockers[0]!;
    const other = lockers[1]!;
    expect(round.place(mine.at)).toBe(true);
    round.step(DT, { x: 0, z: 0, sprint: false });
    round.act('interact');
    expect(round.state().crew.hidden).toBe(mine.roomId);
    // Ein Fahrer, der die Entscheidung der Routine ersetzt (`monster/monsterDriver.ts`).
    let cabin = other.roomId;
    round.driver = {
      active: () => true,
      decide: () => ({
        mode: 'breach',
        goal: null,
        face: null,
        pace: 'still',
        cue: 'breach',
        strike: true,
        cabin,
        label: 'Test',
      }),
    };
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.rules.cabinUsable(other.roomId)).toBe(false);
    expect(round.state().crew.hidden).toBe(mine.roomId);
    expect(round.state().crew.hp).toBe(SUIT_LIVES);
    expect(round.state().destroyed).toEqual([other.roomId]);
    expect(round.drain().some((e) => /Kabine aufgerissen/.test(e.text))).toBe(true);
    // Die eigene: Kabine hin, ein Leben weniger, Techniker steht im Raum.
    cabin = mine.roomId;
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.state().crew.hidden).toBe('');
    expect(round.state().crew.hp).toBe(SUIT_LIVES - 1);
    expect(round.state().destroyed).toEqual([other.roomId, mine.roomId]);
    expect(round.snapshot().round!.cabinsDestroyed).toEqual([other.roomId, mine.roomId]);
  });
});
