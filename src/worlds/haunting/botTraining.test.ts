import { DEFAULT_TUNING, clampTuning } from './botTuning';
import {
  TRAINING_BAND,
  TRAINING_DEFAULTS,
  TRAINING_TARGETS,
  TrainingRun,
  centreScore,
  inBand,
  measure,
  trainBots,
  winRate,
} from './botTraining';

/** Vier unabhängige Messreihen à 400 Runden — je Besetzung 200, Standardfehler rund drei Punkte. */
const PASSES = [0, 777, 4242, 31337];
const MEASURE = { ...TRAINING_DEFAULTS, rounds: 400 };

describe('Die zwei Trainingsziele: halbe-halbe zu zweit, zwei Drittel für das Monster im Team', () => {
  /**
   * **Die Zusage dieses ganzen Zweigs**, und deshalb steht sie als erster
   * Test: Mit den ausgelieferten Gewichten geht ein Duell zwischen Techniker
   * und Monster **halbe-halbe** aus, und sobald eine Zentrale dabei ist,
   * gewinnt das **Monster zwei von drei** Runden — die Reibung des Redens
   * (`rules/doorSeal.ts`) kostet den Techniker genau diese Differenz. Wer an
   * einer Zahl in `DEFAULT_TUNING` dreht, an einem Tempo, an der Routine des
   * Monsters oder an der Karte, bekommt es hier gesagt — und nicht erst, wenn
   * jemand zwanzig Runden zuschaut und findet, das sei jetzt aber unfair.
   */
  it('erfüllen die ausgelieferten Gewichte beide im Schnitt', () => {
    const rates = PASSES.map((pass) => measure(DEFAULT_TUNING, MEASURE, pass));
    const mean = (pick: (m: (typeof rates)[number]) => number): number =>
      rates.reduce((sum, one) => sum + pick(one), 0) / rates.length;
    const duo = mean((m) => m.duo);
    const crew = mean((m) => m.crew);
    expect({
      duo: Math.abs(duo - TRAINING_TARGETS.duo) <= TRAINING_BAND,
      crew: Math.abs(crew - TRAINING_TARGETS.crew) <= TRAINING_BAND,
      rates,
    }).toEqual({ duo: true, crew: true, rates });
    // Auch die einzelne Messreihe darf nicht davonlaufen: Ein Mittelwert aus
    // 30 % und 100 % wäre rechnerisch in der Mitte und im Spiel Unsinn.
    for (const one of rates) {
      expect(Math.abs(one.duo - TRAINING_TARGETS.duo)).toBeLessThan(0.14);
      expect(Math.abs(one.crew - TRAINING_TARGETS.crew)).toBeLessThan(0.14);
    }
    // Und die Richtung stimmt: Im Team hat es der Techniker schwerer.
    expect(crew).toBeLessThan(duo);
  }, 120000);

  it('misst dieselben Gewichte zweimal gleich', () => {
    expect(winRate(DEFAULT_TUNING, { ...TRAINING_DEFAULTS, rounds: 24 }, 5)).toEqual(
      winRate(DEFAULT_TUNING, { ...TRAINING_DEFAULTS, rounds: 24 }, 5),
    );
  });

  it('rechnet den Abstand zu beiden Bändern von beiden Seiten', () => {
    expect(centreScore(TRAINING_TARGETS)).toBe(0);
    expect(
      centreScore({ duo: TRAINING_TARGETS.duo + 0.2, crew: TRAINING_TARGETS.crew }),
    ).toBeCloseTo(0.1);
    expect(inBand({ ...TRAINING_TARGETS, duo: TRAINING_TARGETS.duo + TRAINING_BAND })).toBe(true);
    expect(inBand({ ...TRAINING_TARGETS, duo: TRAINING_TARGETS.duo + TRAINING_BAND + 0.01 })).toBe(
      false,
    );
    // Ein Band allein reicht nicht: Wer nur das Duell trifft, ist nicht fertig.
    expect(inBand({ ...TRAINING_TARGETS, crew: TRAINING_TARGETS.crew - 0.2 })).toBe(false);
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
    expect(before.crew).toBeLessThan(0.2);
    const trained = trainBots(guessed, 'both', 40, options, 0xc0ffee);
    expect(trained.rate).toBeGreaterThan(before.crew + 0.1);
    expect(centreScore({ duo: trained.duo, crew: trained.rate })).toBeLessThan(centreScore(before));
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
    expect(before.crew).toBeGreaterThan(0.7);
    const trained = trainBots(easy, 'monster', 40, options, 0xc0ffee);
    expect(trained.rate).toBeLessThan(before.crew - 0.1);
    expect(centreScore({ duo: trained.duo, crew: trained.rate })).toBeLessThan(centreScore(before));
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

  /**
   * **Die ausgelieferten Gewichte stehen schon da, wo sie hingehören.** Ein
   * Lauf, der von ihnen ausgeht, fängt im Band an und läuft nicht wieder
   * heraus — mehr ist von einer Suche mit zwei Zielen nicht zu verlangen:
   * Zwei Quoten auf je sechzehn Runden treffen ihre Mitte nie auf die Runde
   * genau, und ein Abbruch bei „exakt getroffen" wäre dann ein Abbruch bei
   * einem Glücksfall.
   */
  it('fängt bei den ausgelieferten Gewichten im Band an und bleibt darin', () => {
    const run = new TrainingRun(DEFAULT_TUNING, 'both', 6, options, 99);
    run.advanceStep();
    const first = run.state.score;
    expect(first).toBeLessThan(TRAINING_BAND);
    while (!run.finished) run.advanceStep();
    expect(run.state.score).toBeLessThanOrEqual(first);
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
