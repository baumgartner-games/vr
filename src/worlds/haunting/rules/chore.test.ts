import { FlatRound } from '../map/flatRound';
import { CARGO_OPEN_SECONDS, CHORE_LEASH, choreProgress, stepChore } from './chore';

/**
 * **Fünf Sekunden stillstehen ist eine Entscheidung.** Eine Kiste, die auf
 * Knopfdruck offen stand, war ein Abhaken; eine, die fünf Sekunden kostet, ist
 * ein Risiko — man hört in dieser Zeit nur zu. Umschauen bleibt erlaubt,
 * weggehen bricht ab.
 */
describe('Ein Handgriff, der Zeit kostet', () => {
  const at = { x: 10, z: 10 };

  it('zählt herunter und ist am Ende fertig', () => {
    let chore = { kind: 'cargo' as const, id: 'c', label: 'Kiste', at, left: 2, total: 2 };
    const half = stepChore(chore, 1, at);
    expect(half.kind).toBe('running');
    chore = half.chore;
    expect(choreProgress(chore)).toBeCloseTo(0.5, 5);
    expect(stepChore(chore, 1, at).kind).toBe('done');
  });

  it('bricht ab, wer sich weiter als die Leine bewegt — ein Zittern nicht', () => {
    const chore = { kind: 'cargo' as const, id: 'c', label: 'Kiste', at, left: 2, total: 2 };
    expect(stepChore(chore, 0.1, { x: at.x + CHORE_LEASH / 2, z: at.z }).kind).toBe('running');
    expect(stepChore(chore, 0.1, { x: at.x + CHORE_LEASH + 0.1, z: at.z }).kind).toBe('broken');
    // Und wer sich versteckt oder ein Rätsel aufschlägt, arbeitet auch nicht.
    expect(stepChore(chore, 0.1, at, false).kind).toBe('broken');
  });
});

describe('Die Kiste in der 2D-Runde', () => {
  /** Die nächste Kiste — und der Weg dorthin, ohne Wegsuche: hinsetzen. */
  function atCrate(): { round: FlatRound; id: string } {
    const round = new FlatRound(3, { test: true });
    const crate = round
      .snapshot()
      .items.find((item) => item.kind === 'cargo' && item.state === 'closed')!;
    Object.assign(round.player, {
      x: crate.at.x,
      z: crate.at.z,
      space: crate.roomId,
    });
    round.step(1 / 30, { x: 0, z: 0, sprint: false });
    return { round, id: crate.id };
  }

  const STILL = { x: 0, z: 0, sprint: false };

  it('geht erst nach fünf Sekunden Stillstehen auf', () => {
    const { round, id } = atCrate();
    expect(round.target?.id).toBe(id);
    round.act('interact');
    expect(round.busy?.id).toBe(id);
    expect(round.state().crew.opened).not.toContain(id);
    for (let t = 0; t < CARGO_OPEN_SECONDS - 0.5; t += 0.1) round.step(0.1, STILL);
    expect(round.state().crew.opened).not.toContain(id);
    expect(round.busyProgress).toBeGreaterThan(0.8);
    for (let t = 0; t < 1; t += 0.1) round.step(0.1, STILL);
    expect(round.busy).toBeNull();
    expect(round.state().crew.opened).toContain(id);
  });

  it('bricht ab, wer dabei losläuft', () => {
    const { round, id } = atCrate();
    round.act('interact');
    expect(round.busy).not.toBeNull();
    for (let t = 0; t < 1.5; t += 0.1) round.step(0.1, { x: 1, z: 0, sprint: false });
    expect(round.busy).toBeNull();
    expect(round.state().crew.opened).not.toContain(id);
    expect(round.drain().some((event) => event.text.includes('abgebrochen'))).toBe(true);
  });
});
