import { DEFAULT_TUNING, clampTuning } from './botTuning';
import {
  TRAINING_BAND,
  TRAINING_DEFAULTS,
  TRAINING_TARGET,
  TrainingRun,
  centreScore,
  inBand,
  trainBots,
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
    const monster = new TrainingRun(DEFAULT_TUNING, 'monster', 6, options, 7);
    while (!monster.finished) monster.advanceStep();
    expect(monster.state.tuning.technician).toEqual(DEFAULT_TUNING.technician);
    const technician = new TrainingRun(DEFAULT_TUNING, 'technician', 6, options, 7);
    while (!technician.finished) technician.advanceStep();
    expect(technician.state.tuning.monster).toEqual(DEFAULT_TUNING.monster);
  }, 60000);

  it('bleibt in den Grenzen jedes Feldes und zählt seine Schritte mit', () => {
    // Bewusst nicht von den ausgelieferten Gewichten aus: Die stehen schon am
    // Ziel, und ein Lauf, der nichts mehr zu suchen hat, hört sofort auf.
    const off = clampTuning({
      ...DEFAULT_TUNING,
      monster: { ...DEFAULT_TUNING.monster, speed: 0.6, hearing: 0.4, vision: 0.4 },
    });
    const run = new TrainingRun(off, 'both', 8, options, 99);
    run.advanceStep();
    const first = run.state.spread;
    while (!run.finished) run.advanceStep();
    expect(run.state.spread).toBeLessThanOrEqual(first);
    expect(run.state.tuning).toEqual(clampTuning(run.state.tuning));
    expect(run.state.step).toBeGreaterThan(0);
    expect(run.state.history).toHaveLength(run.state.step + 1);
    expect(run.fraction).toBe(1);
  }, 60000);

  it('hört auf, sobald es am Ziel steht', () => {
    const run = new TrainingRun(DEFAULT_TUNING, 'both', 40, options, 99);
    run.advanceStep();
    expect(run.finished).toBe(true);
    expect(run.state.step).toBe(0);
  }, 60000);

  /**
   * Der Grund für die Zeitscheibe: Im Browser läuft das Training zwischen
   * zwei Bildern. Ein Lauf in Häppchen muss dasselbe herausbekommen wie einer
   * am Stück — sonst hängt das Ergebnis an der Bildrate.
   */
  it('rechnet in Häppchen dasselbe wie am Stück', () => {
    const whole = new TrainingRun(DEFAULT_TUNING, 'both', 6, options, 2024);
    while (!whole.finished) whole.advanceStep();
    const sliced = new TrainingRun(DEFAULT_TUNING, 'both', 6, options, 2024);
    let guard = 0;
    while (!sliced.finished && guard++ < 20000) sliced.advance(0);
    expect(sliced.state.tuning).toEqual(whole.state.tuning);
    expect(sliced.state.rate).toBe(whole.state.rate);
    expect(sliced.fraction).toBe(1);
  }, 120000);

  it('läuft aus demselben Samen zweimal gleich', () => {
    const a = trainBots(DEFAULT_TUNING, 'both', 4, options, 4711);
    const b = trainBots(DEFAULT_TUNING, 'both', 4, options, 4711);
    expect(a.tuning).toEqual(b.tuning);
    expect(a.rate).toBe(b.rate);
  }, 60000);
});
