import {
  MONSTER_FIELDS,
  TECHNICIAN_FIELDS,
  clampTuning,
  copyTuning,
  type BotTuning,
  type TuningField,
} from './botTuning';
import { Rng } from './rng';
import { simulateRound, simulationSpec } from './roundSim';

/**
 * **Ein kleines Training, das die Gewichte selbst sucht.**
 *
 * Die Frage war: „Findet einen Satz Parameter, mit dem der Techniker im
 * Schnitt 60–70 % der Runden gewinnt." Das ist keine Rechnung, sondern eine
 * Suche — und zwar eine, die keine Ableitung hat: Ob eine halbe Sekunde mehr
 * Absuchdauer den Techniker rettet oder ihn umbringt, weiß man erst, wenn man
 * fünfzig Runden gespielt hat.
 *
 * Also **Bergsteigen mit Rauschen** (ein (1+1)-Verfahren, wie es kleiner
 * nicht geht): Ein Satz Zahlen wird leicht verwackelt, fünfzig Runden
 * ausgespielt (`roundSim.ts`), und wer näher am Zielband liegt, bleibt. Die
 * Schrittweite wird dabei kleiner — anfangs sucht es die Gegend, am Ende die
 * Stelle.
 *
 * **Warum ein Band und kein Maximum.** „So gut wie möglich" wäre hier die
 * falsche Frage: Ein Techniker, der immer gewinnt, ist genauso langweilig wie
 * einer, der nie gewinnt. Das Ziel ist deshalb eine Wahrscheinlichkeit, und
 * die Bewertung ist der **Abstand** dazu — von oben wie von unten.
 *
 * **Jeder Schritt ist einzeln aufrufbar** (`trainStep`). Das ist keine
 * Kosmetik: Im Browser läuft das Training zwischen zwei Bildern, und eine
 * Schleife, die dreißig Sekunden am Stück rechnet, ist dort ein eingefrorener
 * Tab und kein Training.
 */

export type TrainingSide = 'technician' | 'monster' | 'both';

export interface TrainingOptions {
  /** Wie viele Runden je Bewertung. Weniger ist schneller und lauter. */
  rounds: number;
  /** Die Stationen, gegen die gespielt wird. */
  seeds: readonly number[];
  /** Die angestrebte Gewinnquote des Technikers. */
  target: number;
  /** Wie weit sie davon abweichen darf, ohne dass es zählt. */
  band: number;
  /**
   * Ob jeder Schritt andere Runden sieht.
   *
   * Aus: Alle Schritte spielen **dieselben** Runden. Dann ist der Vergleich
   * zweier Sätze exakt, und das Bergsteigen klettert auf der Sache statt auf
   * dem Rauschen — der Grund, warum es hier so steht. Ein Training mit
   * frischen Runden je Schritt fand zwar dauernd „Verbesserungen", und keine
   * davon hielt der Nachmessung stand.
   */
  resample: boolean;
}

export const TRAINING_TARGET = 0.65;
export const TRAINING_BAND = 0.05;

/** Acht Stationen: genug Vielfalt, wenig genug für einen warmen Zwischenspeicher. */
export const TRAINING_SEEDS = [1000, 8919, 16838, 24757, 32676, 40595, 48514, 56433] as const;

export const TRAINING_DEFAULTS: TrainingOptions = {
  rounds: 64,
  seeds: TRAINING_SEEDS,
  target: TRAINING_TARGET,
  band: TRAINING_BAND,
  resample: false,
};

export interface TrainingState {
  side: TrainingSide;
  /** Der beste bisher gefundene Satz. */
  tuning: BotTuning;
  /** Seine gemessene Gewinnquote des Technikers. */
  rate: number;
  /** Abstand zur Mitte des Zielbands. */
  score: number;
  /** Der Gleichstandsbrecher: wie weit der Techniker im Schnitt kam. */
  progress: number;
  /** Wie viele Schritte schon gelaufen sind. */
  step: number;
  /** Wie viele davon etwas verbessert haben. */
  improved: number;
  /** Aktuelle Schrittweite, als Anteil der Feldbreite. */
  spread: number;
  /** Wie viele Schritte seit der letzten Verbesserung ins Leere gingen. */
  stale: number;
  seed: number;
  /** Die Quoten der bisherigen Schritte — für die Kurve in der Tafel. */
  history: number[];
}

/**
 * Die Gewinnquote des Technikers über `rounds` Runden.
 *
 * Der Versatz `pass` verschiebt Station und Zufall gegeneinander: Zwei
 * Bewertungen desselben Satzes mit demselben Versatz sind gleich (sonst
 * bergsteigt man Rauschen), zwei aufeinanderfolgende Schritte sehen andere
 * Runden (sonst lernt man acht Stationen auswendig).
 */
export function winRate(
  tuning: BotTuning,
  options: TrainingOptions = TRAINING_DEFAULTS,
  pass = 0,
): number {
  return measure(tuning, options, pass).rate;
}

export interface Measurement {
  /** Anteil gewonnener Runden. */
  rate: number;
  /**
   * Wie weit der Techniker im Schnitt gekommen ist (0…1).
   *
   * Die Quote allein hat einen blinden Fleck: Wenn der Techniker in **keiner**
   * Runde gewinnt, sind alle Vorschläge gleich schlecht, und das Bergsteigen
   * steht auf einer Ebene ohne Gefälle. Wie viele Systeme er noch repariert
   * hat, bevor es ihn erwischte, sagt trotzdem, welche Richtung die bessere
   * ist — und genau dafür steht diese Zahl hier.
   */
  progress: number;
}

export function measure(
  tuning: BotTuning,
  options: TrainingOptions = TRAINING_DEFAULTS,
  pass = 0,
): Measurement {
  const seeds = options.seeds.length ? options.seeds : TRAINING_SEEDS;
  let won = 0;
  let progress = 0;
  for (let i = 0; i < options.rounds; i++) {
    const seed = seeds[(i + pass) % seeds.length]!;
    const round = simulateRound(seed, { tuning, roll: i + pass * 101 });
    if (round.won) won++;
    progress += (round.repairs + (round.won ? 1 : 0)) / 4;
  }
  const rounds = Math.max(1, options.rounds);
  return { rate: won / rounds, progress: progress / rounds };
}

/**
 * Der Abstand zur **Mitte** des Zielbands.
 *
 * Nicht zum Rand: Ein Training, das aufhört, sobald es das Band von außen
 * berührt, liefert eine Einstellung, die bei der nächsten Messung wieder
 * daneben liegt. Es soll in die Mitte zielen und dort stehen bleiben; ob es
 * drin ist, sagt `inBand`.
 */
export function centreScore(rate: number, options: TrainingOptions = TRAINING_DEFAULTS): number {
  return Math.abs(rate - options.target);
}

/** Ob diese Quote das Ziel „60–70 %" erfüllt. */
export function inBand(rate: number, options: TrainingOptions = TRAINING_DEFAULTS): boolean {
  return centreScore(rate, options) <= options.band + 1e-9;
}

/**
 * **Das Training als Lauf, den man anhalten kann.**
 *
 * Im Browser darf es nicht am Stück rechnen: Ein `for`, das dreißig Sekunden
 * lang Runden ausspielt, ist ein eingefrorener Tab. Also gibt es hier einen
 * Lauf mit einer Zeitscheibe — `advance(12)` rechnet zwölf Millisekunden
 * weiter, das Bild wird gezeichnet, und im nächsten Bild geht es weiter.
 * Gerechnet wird dabei **Runde für Runde**, nicht Schritt für Schritt: Ein
 * ganzer Schritt sind vierundsechzig Runden, und die dauern zu lange für ein
 * Bild.
 */
export class TrainingRun {
  private candidate: BotTuning;
  private index = 0;
  private won = 0;
  private reached = 0;
  private best: TrainingState;
  private first = true;

  constructor(
    tuning: BotTuning,
    side: TrainingSide = 'both',
    readonly iterations = 40,
    private readonly options: TrainingOptions = TRAINING_DEFAULTS,
    seed = 0x5eed,
  ) {
    // Die Stationen einmal bauen, bevor die Uhr läuft: Sonst misst die erste
    // Runde den Generator und nicht die Gewichte.
    for (const station of this.options.seeds) simulationSpec(station);
    this.candidate = clampTuning(tuning);
    this.best = {
      side,
      tuning: this.candidate,
      rate: 0,
      score: Infinity,
      progress: 0,
      step: 0,
      improved: 0,
      spread: 0.35,
      stale: 0,
      seed,
      history: [],
    };
  }

  get state(): TrainingState {
    return this.best;
  }

  get finished(): boolean {
    return this.best.step >= this.iterations || this.best.score <= this.enough;
  }

  /** Wie weit der ganze Lauf ist, von 0 bis 1. */
  get fraction(): number {
    if (this.finished) return 1;
    const rounds = Math.max(1, this.options.rounds);
    return Math.min(1, (this.best.step + this.index / rounds) / Math.max(1, this.iterations));
  }

  private get enough(): number {
    // Eine Runde mehr oder weniger ist die kleinste messbare Änderung;
    // darunter gibt es nichts mehr zu suchen.
    return 0.5 / Math.max(1, this.options.rounds);
  }

  /** Rechnet höchstens `budget` Millisekunden weiter. */
  advance(budget = 12): void {
    const until = Date.now() + Math.max(0, budget);
    do {
      if (this.finished) return;
      this.round();
    } while (Date.now() < until);
  }

  /** Einen ganzen Schritt zu Ende rechnen — für Tests und Kommandozeile. */
  advanceStep(): void {
    const step = this.best.step;
    while (!this.finished && this.best.step === step) this.round();
  }

  private round(): void {
    const seeds = this.options.seeds.length ? this.options.seeds : TRAINING_SEEDS;
    const pass = this.options.resample ? this.best.step : 0;
    const seed = seeds[(this.index + pass) % seeds.length]!;
    const result = simulateRound(seed, {
      tuning: this.candidate,
      roll: this.index + pass * 101,
    });
    if (result.won) this.won++;
    this.reached += (result.repairs + (result.won ? 1 : 0)) / 4;
    this.index++;
    if (this.index < this.options.rounds) return;
    this.close();
  }

  /** Ein Vorschlag ist ausgespielt: behalten oder verwerfen, dann der nächste. */
  private close(): void {
    const rounds = Math.max(1, this.options.rounds);
    const rate = this.won / rounds;
    const progress = this.reached / rounds;
    const score = centreScore(rate, this.options);
    // Erst die Quote, und bei Gleichstand der Fortschritt — **in der
    // Richtung, in der das Ziel liegt**: Steht der Techniker unter dem Band,
    // ist weiter gekommen besser; steht er darüber, ist es schlechter. Ohne
    // dieses Vorzeichen schiebt der Gleichstandsbrecher ein übermächtiges
    // Gespann noch weiter nach oben.
    const wanted = this.best.rate < this.options.target ? 1 : -1;
    const better =
      this.first ||
      score < this.best.score ||
      (score === this.best.score && progress * wanted > this.best.progress * wanted);
    const stuck = !better && this.best.stale >= 8;
    const step = this.best.step + (this.first ? 0 : 1);
    this.best = {
      ...this.best,
      tuning: better ? this.candidate : this.best.tuning,
      rate: better ? rate : this.best.rate,
      score: better ? score : this.best.score,
      progress: better ? progress : this.best.progress,
      step,
      improved: this.best.improved + (better && !this.first ? 1 : 0),
      // Enger werden, solange es vorangeht — und wieder **weiter**, wenn acht
      // Schritte nacheinander nichts gebracht haben. Ohne diesen Rückwärtsgang
      // schrumpft die Schrittweite in einer Sackgasse so weit, dass das
      // Training dort für immer stehen bleibt: aus einer aussichtslosen Lage
      // führt kein Zentimeterschritt heraus, nur ein Sprung.
      spread: stuck
        ? Math.min(0.5, this.best.spread * 1.6)
        : Math.max(0.05, this.best.spread * (better ? 0.92 : 0.97)),
      stale: better || stuck ? 0 : this.best.stale + 1,
      history: [...this.best.history.slice(-63), better ? rate : this.best.rate],
    };
    this.first = false;
    this.index = 0;
    this.won = 0;
    this.reached = 0;
    const rng = new Rng((this.best.seed + this.best.step * 0x9e3779b9) >>> 0);
    this.candidate = mutate(this.best.tuning, this.best.side, this.best.spread, rng);
  }
}

/** Mehrere Schritte am Stück — für Tests und für die Kommandozeile. */
export function trainBots(
  tuning: BotTuning,
  side: TrainingSide = 'both',
  iterations = 24,
  options: TrainingOptions = TRAINING_DEFAULTS,
  seed = 0x5eed,
): TrainingState {
  const run = new TrainingRun(tuning, side, iterations, options, seed);
  while (!run.finished) run.advanceStep();
  return run.state;
}

function mutate(tuning: BotTuning, side: TrainingSide, spread: number, rng: Rng): BotTuning {
  const next = copyTuning(tuning);
  if (side !== 'monster') jitter(next.technician, TECHNICIAN_FIELDS, spread, rng);
  if (side !== 'technician') jitter(next.monster, MONSTER_FIELDS, spread, rng);
  return clampTuning(next);
}

function jitter<T>(
  values: T,
  fields: ReadonlyArray<TuningField<T>>,
  spread: number,
  rng: Rng,
): void {
  const numbers = values as Record<string, number>;
  for (const field of fields) {
    // Nicht jedes Feld in jedem Schritt: Wer alle dreizehn gleichzeitig
    // verstellt, weiß hinterher nie, welche Zahl geholfen hat.
    if (!rng.chance(0.45)) continue;
    const width = (field.max - field.min) * spread;
    const value = numbers[field.id]! + (rng.next() * 2 - 1) * width;
    numbers[field.id] = Math.min(field.max, Math.max(field.min, value));
  }
}
