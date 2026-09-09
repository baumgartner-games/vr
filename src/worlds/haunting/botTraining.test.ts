import { DEFAULT_TUNING, clampTuning } from './botTuning';
import {
  TRAINING_BAND,
  TRAINING_DEFAULTS,
  TRAINING_TARGET,
  beginTraining,
  centreScore,
  inBand,
  trainBots,
  trainStep,
  winRate,
} from './botTraining';

/** Vier unabhängige Messreihen à 200 Runden — Standardfehler rund drei Punkte. */
const PASSES = [0, 777, 4242, 31337];
const MEASURE = { ...TRAINING_DEFAULTS, rounds: 200 };

describe('Das Trainingsziel: 60–70 % für den Techniker', () => {
  /**
   * **Die Zusage dieses ganzen Zweigs**, und deshalb steht sie als erster
   * Test: Mit den ausgelieferten Gewichten gewinnt der Techniker im Schnitt
   * zwischen 60 und 70 Prozent der Bot-Runden. Wer an einer Zahl in
   * `DEFAULT_TUNING` dreht, an einem Tempo, an der Routine des Monsters oder
   * an der Karte, bekommt es hier gesagt — und nicht erst, wenn jemand
   * zwanzig Runden zuschaut und findet, das sei jetzt aber unfair.
   */
  it('erfüllen die ausgelieferten Gewichte im Schnitt', () => {
    const rates = PASSES.map((pass) => winRate(DEFAULT_TUNING, MEASURE, pass));
    const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
    expect({ mean: mean >= 0.6 && mean <= 0.7, rates }).toEqual({ mean: true, rates });
    // Auch die einzelne Messreihe darf nicht davonlaufen: Ein Mittelwert aus
    // 30 % und 100 % wäre rechnerisch in der Mitte und im Spiel Unsinn.
    for (const rate of rates) expect(Math.abs(rate - TRAINING_TARGET)).toBeLessThan(0.12);
  }, 60000);

  it('misst dieselben Gewichte zweimal gleich', () => {
    expect(winRate(DEFAULT_TUNING, { ...TRAINING_DEFAULTS, rounds: 24 }, 5)).toBe(
      winRate(DEFAULT_TUNING, { ...TRAINING_DEFAULTS, rounds: 24 }, 5),
    );
  });

  it('rechnet den Abstand zum Band von beiden Seiten', () => {
    expect(centreScore(TRAINING_TARGET)).toBe(0);
    expect(centreScore(TRAINING_TARGET + 0.2)).toBeCloseTo(0.2);
    expect(inBand(TRAINING_TARGET + TRAINING_BAND)).toBe(true);
    expect(inBand(TRAINING_TARGET + TRAINING_BAND + 0.01)).toBe(false);
    expect(inBand(TRAINING_TARGET - TRAINING_BAND - 0.01)).toBe(false);
  });
});

describe('Das Training selbst', () => {
  const options = { ...TRAINING_DEFAULTS, rounds: 32 };

  /**
   * **Der Beweis, dass die Suche wirklich sucht.** Angesetzt wird sie auf die
   * von Hand geratenen Zahlen, mit denen dieser Zweig angefangen hat: Damit
   * gewann der Techniker jede sechste Runde. Nach vierzig Schritten steht er
   * in der Nähe des Bands — und genau so sind die ausgelieferten Gewichte
   * entstanden.
   */
  it('holt einen chancenlosen Techniker an das Ziel heran', () => {
    const guessed = clampTuning({
      monster: {
        speed: 1,
        hunt: 1.4,
        stalk: 0.55,
        hearing: 1,
        vision: 1,
        memory: 1,
        search: 8,
        locker: 0.5,
        guess: 0.6,
        wander: 0.35,
        stakeout: 0.25,
        reposition: 3,
        savour: 2.5,
      },
      technician: {
        walk: 2.15,
        sprint: 4.4,
        stamina: 5,
        caution: 9,
        hide: 0.55,
        work: 1,
        nerve: 7,
      },
    });
    const before = winRate(guessed, options, 0);
    expect(before).toBeLessThan(0.3);
    const trained = trainBots(guessed, 'both', 40, options, 0xc0ffee);
    expect(trained.rate).toBeGreaterThan(before + 0.25);
    expect(centreScore(trained.rate)).toBeLessThan(centreScore(before));
    expect(trained.improved).toBeGreaterThan(0);
    expect(trained.history.at(-1)).toBe(trained.rate);
  }, 120000);

  it('drückt einen übermächtigen Techniker wieder herunter', () => {
    const easy = clampTuning({
      monster: {
        ...DEFAULT_TUNING.monster,
        speed: 0.6,
        hunt: 1,
        hearing: 0.4,
        vision: 0.4,
        memory: 0.4,
      },
      technician: { ...DEFAULT_TUNING.technician, walk: 2.6, sprint: 4.94, caution: 18 },
    });
    const before = winRate(easy, options, 0);
    expect(before).toBeGreaterThan(0.75);
    const trained = trainBots(easy, 'monster', 40, options, 0xc0ffee);
    expect(trained.rate).toBeLessThan(before - 0.1);
    expect(centreScore(trained.rate)).toBeLessThan(centreScore(before));
  }, 120000);

  it('rührt nur die Seite an, die trainiert wird', () => {
    let state = beginTraining(DEFAULT_TUNING, 'monster', options, 7);
    for (let i = 0; i < 6; i++) state = trainStep(state, options);
    expect(state.tuning.technician).toEqual(DEFAULT_TUNING.technician);
    let other = beginTraining(DEFAULT_TUNING, 'technician', options, 7);
    for (let i = 0; i < 6; i++) other = trainStep(other, options);
    expect(other.tuning.monster).toEqual(DEFAULT_TUNING.monster);
  }, 60000);

  it('bleibt in den Grenzen jedes Feldes und wird dabei genauer', () => {
    let state = beginTraining(DEFAULT_TUNING, 'both', options, 99);
    const first = state.spread;
    for (let i = 0; i < 8; i++) state = trainStep(state, options);
    expect(state.spread).toBeLessThan(first);
    expect(state.tuning).toEqual(clampTuning(state.tuning));
    expect(state.step).toBe(8);
    expect(state.history).toHaveLength(9);
  }, 60000);

  it('läuft aus demselben Samen zweimal gleich', () => {
    const a = trainBots(DEFAULT_TUNING, 'both', 4, options, 4711);
    const b = trainBots(DEFAULT_TUNING, 'both', 4, options, 4711);
    expect(a.tuning).toEqual(b.tuning);
    expect(a.rate).toBe(b.rate);
  }, 60000);
});
