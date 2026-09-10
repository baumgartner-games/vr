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

/**
 * **Wo der Techniker-Bot mit den ausgelieferten Gewichten gemessen steht.**
 *
 * Seit M2 ist das dasselbe wie `TRAINING_TARGETS` — beide Quoten liegen im
 * Band. Der Test prüft trotzdem weiter die **Messung** und nicht nur die
 * Zusage: Eine Zahl, die man abliest, fällt auf, wenn sie sich verschiebt;
 * ein Band, das gerade noch getroffen wird, sagt nichts darüber, ob man an
 * seinem Rand steht oder in seiner Mitte.
 */
const BOT_RATES = { duo: 0.54, crew: 0.315 } as const;

describe('Die zwei Trainingsziele: halbe-halbe zu zweit, zwei Drittel für das Monster im Team', () => {
  /**
   * **Wo die ausgelieferten Gewichte wirklich stehen** — und seit M2 ist das
   * dort, wo sie stehen sollen.
   *
   * `TRAINING_TARGETS` beschreibt das **Spiel**: halbe-halbe zu zweit, zwei
   * Drittel für das Monster, sobald eine Zentrale dabei ist — die Reibung des
   * Redens (`rules/doorSeal.ts`) kostet den Techniker genau diese Differenz.
   * Gemessen wird hier aber nicht das Spiel, sondern der **Bot**, und der ist
   * eine schlichte Zustandsmaschine (`rules/technicianBot.ts`): Er läuft die
   * Strecke, die dasteht, und kürzt nicht ab.
   *
   * **Die Vorgeschichte gehört dazu, weil sie erklärt, warum hier zwei Zahlen
   * stehen und nicht eine.** Seit jeder Raum zwei bis drei Kisten hat
   * (`rules/cargo.ts`), sind die Wege länger — nicht, weil der Bot die Kisten
   * durchwühlte (`missionBot` und `roundSim` gehen über `taskCargo` direkt an
   * die richtige), sondern weil jede Kiste ein weiteres Wandmodul ist und der
   * Packer daraufhin jedes Zimmer anders stellt. Gemessen fiel er dadurch von
   * 0,52 / 0,34 auf 0,44 / 0,25, und ein Trainingslauf, der ihn mit Gewalt
   * ins Band zurückzog, tat es über Puste 2 s und Vorsicht 6 m — Zahlen, die
   * man einem Bot ansieht. Der Abstand gehörte also zugemacht, indem das
   * **Spiel** besser wird, nicht die Gewichte verbogen.
   *
   * Genau das ist mit M2 passiert: Das Monster geht schneller als der Spieler
   * geht, jagt knapp unter dem Sprint, und der Sprint hat jetzt eine Puste
   * (`mission.ts`). Das neu gelernte `DEFAULT_TUNING` trifft daraufhin **beide
   * Bänder** — was der Test unten ausdrücklich nachrechnet, damit es nicht
   * unbemerkt wieder herausfällt.
   */
  it('bleibt da stehen, wo der Bot gemessen steht', () => {
    const rates = PASSES.map((pass) => measure(DEFAULT_TUNING, MEASURE, pass));
    const mean = (pick: (m: (typeof rates)[number]) => number): number =>
      rates.reduce((sum, one) => sum + pick(one), 0) / rates.length;
    const duo = mean((m) => m.duo);
    const crew = mean((m) => m.crew);
    expect({
      duo: Math.abs(duo - BOT_RATES.duo) <= TRAINING_BAND,
      crew: Math.abs(crew - BOT_RATES.crew) <= TRAINING_BAND,
      rates,
    }).toEqual({ duo: true, crew: true, rates });
    // Auch die einzelne Messreihe darf nicht davonlaufen: Ein Mittelwert aus
    // 30 % und 100 % wäre rechnerisch in der Mitte und im Spiel Unsinn.
    for (const one of rates) {
      expect(Math.abs(one.duo - BOT_RATES.duo)).toBeLessThan(0.14);
      expect(Math.abs(one.crew - BOT_RATES.crew)).toBeLessThan(0.14);
    }
    // Und die Richtung stimmt: Im Team hat es der Techniker schwerer.
    expect(crew).toBeLessThan(duo);
    // Und beide Quoten liegen in ihrem Band — seit M2 ist der Abstand zwischen
    // Messung und Zusage zu. Fällt eine der beiden wieder heraus, sagt es der
    // Test hier und nicht erst jemand nach zwanzig Minuten im Headset.
    expect(inBand({ duo, crew })).toBe(true);
    expect(inBand(BOT_RATES)).toBe(true);
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
      // **Der Techniker war einmal ein anderer.** Hier standen die von Hand
      // geratenen Zahlen der ersten Stunde (`walk 2,15 · sprint 4,4 · stamina 5
      // · caution 9 · hide 0,55 · work 1 · nerve 7`), und mit ihnen gewann er
      // jede sechste Runde. Seit jeder Raum zwei bis drei Kisten hat
      // (`rules/cargo.ts`), gewinnt derselbe Satz gemessene 0,375 — er ist
      // schlicht kein chancenloser Techniker mehr, und ein Test, der eine
      // Verbesserung aus einem guten Stand heraus verlangt, prüft nichts.
      // Also ein Satz, der es wieder ist: langsam, kurzatmig, zu spät
      // vorsichtig und langsam bei jedem Handgriff. Das Monster daneben ist
      // unverändert das von damals.
      technician: {
        walk: 1.4,
        sprint: 3,
        stamina: 3,
        caution: 5,
        hide: 0.35,
        work: 1.8,
        nerve: 12,
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

  /**
   * **Und andersherum: ein Techniker, der zu leicht gewinnt, wird
   * heruntergedrückt** — nur steht „zu leicht" seit M2 woanders.
   *
   * Die Vorrichtung ist ausgeschrieben und nicht aus `DEFAULT_TUNING` geerbt:
   * Sonst hinge sie an den ausgelieferten Gewichten, und wer die nachlernt,
   * zöge dem Test unter der Hand den Boden weg. „Übermächtig" heißt hier
   * ausdrücklich **jedes Feld am Anschlag** — der Techniker zu seinen Gunsten,
   * das Monster zu seinen Ungunsten, bis hin zu den Verhaltensfeldern
   * (sechzehn Sekunden Absuchen, ständiges Auflauern, acht Ziele bis zum
   * Seitenwechsel).
   *
   * **Gemessen wird jetzt das Duell und nicht die Runde mit Zentrale**, und
   * das ist eine Auskunft über das Spiel: Die Untergrenzen der Tempo-Regler
   * sind seit M2 Teil der Ungleichung (`speed` ≥ 0,95, `hunt` ≥ 1,3), also
   * lässt sich das Monster gar nicht mehr so weit ausbremsen, dass es im Team
   * chancenlos wäre — dort gewinnt der Techniker auch so nur 0,375 und liegt
   * damit schon fast am Ziel. Zu zweit dagegen räumt er ab (0,81), und genau
   * diesen Überschuss holt die Suche wieder herunter.
   */
  it('drückt einen übermächtigen Techniker wieder herunter', () => {
    const easy = clampTuning({
      monster: {
        speed: 0.95,
        hunt: 1.3,
        stalk: 0.25,
        hearing: 0.4,
        vision: 0.4,
        memory: 0.4,
        search: 16,
        locker: 0.15,
        guess: 0.25,
        wander: 0.7,
        stakeout: 0.6,
        reposition: 8,
        savour: 6,
        ambush: 0.15,
        predict: 0.2,
        rush: 2,
      },
      technician: {
        walk: 2.6,
        sprint: 4.94,
        stamina: 12,
        caution: 18,
        hide: 1,
        work: 0.5,
        nerve: 2,
      },
    });
    const before = winRate(easy, options, 0);
    expect(before.duo).toBeGreaterThan(0.7);
    const trained = trainBots(easy, 'monster', 40, options, 0xc0ffee);
    expect(trained.duo).toBeLessThan(before.duo - 0.1);
    expect(centreScore({ duo: trained.duo, crew: trained.rate })).toBeLessThan(centreScore(before));
  }, 180000);

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
    // **Mehr Runden als die anderen Läufe hier, und das ist keine Willkür.**
    // Das Band ist 0,05 breit; auf 32 Runden sind das 16 je Besetzung, und
    // eine einzelne Runde verschiebt den bewerteten Mittelwert schon um
    // 1/32 = 0,031. Eine Zusage, die feiner ist als die Auflösung ihrer
    // Messung, prüft den Würfel und nicht die Gewichte.
    const run = new TrainingRun(DEFAULT_TUNING, 'both', 6, { ...options, rounds: 64 }, 99);
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
