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

export function beginTraining(
  tuning: BotTuning,
  side: TrainingSide = 'both',
  options: TrainingOptions = TRAINING_DEFAULTS,
  seed = 0x5eed,
): TrainingState {
  // Die Stationen einmal bauen, bevor die Uhr läuft: Sonst misst der erste
  // Schritt den Generator und nicht die Gewichte.
  for (const station of options.seeds) simulationSpec(station);
  const start = clampTuning(tuning);
  const { rate, progress } = measure(start, options, 0);
  return {
    side,
    tuning: start,
    rate,
    score: centreScore(rate, options),
    progress,
    step: 0,
    improved: 0,
    spread: 0.35,
    stale: 0,
    seed,
    history: [rate],
  };
}

/** Ein Schritt: verwackeln, ausspielen, behalten oder verwerfen. */
export function trainStep(
  state: TrainingState,
  options: TrainingOptions = TRAINING_DEFAULTS,
): TrainingState {
  const rng = new Rng((state.seed + state.step * 0x9e3779b9) >>> 0);
  const candidate = mutate(state.tuning, state.side, state.spread, rng);
  const step = state.step + 1;
  const pass = options.resample ? step : 0;
  const { rate, progress } = measure(candidate, options, pass);
  const score = centreScore(rate, options);
  // Der bisherige Beste wird auf denselben Runden nachgemessen: Ein Sieg über
  // einen Wert, der auf anderen Runden zustande kam, ist keiner.
  const incumbent = options.resample
    ? measure(state.tuning, options, pass)
    : { rate: state.rate, progress: state.progress };
  const reference = centreScore(incumbent.rate, options);
  // Erst die Quote, und bei Gleichstand der Fortschritt — **in der Richtung,
  // in der das Ziel liegt**: Steht der Techniker unter dem Band, ist weiter
  // gekommen besser; steht er darüber, ist es schlechter. Ohne dieses
  // Vorzeichen schiebt der Gleichstandsbrecher ein übermächtiges Gespann noch
  // weiter nach oben.
  const wanted = incumbent.rate < options.target ? 1 : -1;
  const better =
    score < reference || (score === reference && progress * wanted > incumbent.progress * wanted);
  const stuck = !better && state.stale >= 8;
  const next: TrainingState = {
    ...state,
    tuning: better ? candidate : state.tuning,
    rate: better ? rate : state.rate,
    score: better ? score : state.score,
    progress: better ? progress : state.progress,
    step,
    improved: state.improved + (better ? 1 : 0),
    // Enger werden, solange es vorangeht — und wieder **weiter**, wenn acht
    // Schritte nacheinander nichts gebracht haben. Ohne diesen Rückwärtsgang
    // schrumpft die Schrittweite in einer Sackgasse so weit, dass das
    // Training dort für immer stehen bleibt: aus einer aussichtslosen Lage
    // führt kein Zentimeterschritt heraus, nur ein Sprung.
    spread: stuck
      ? Math.min(0.5, state.spread * 1.6)
      : Math.max(0.05, state.spread * (better ? 0.92 : 0.97)),
    stale: better || stuck ? 0 : state.stale + 1,
    history: [...state.history.slice(-63), better ? rate : state.rate],
  };
  return next;
}

/** Mehrere Schritte am Stück — für Tests und für die Kommandozeile. */
export function trainBots(
  tuning: BotTuning,
  side: TrainingSide = 'both',
  iterations = 24,
  options: TrainingOptions = TRAINING_DEFAULTS,
  seed = 0x5eed,
): TrainingState {
  let state = beginTraining(tuning, side, options, seed);
  // Eine Runde mehr oder weniger ist die kleinste messbare Änderung; darunter
  // gibt es nichts mehr zu suchen.
  const enough = 0.5 / Math.max(1, options.rounds);
  for (let i = 0; i < iterations && state.score > enough; i++) state = trainStep(state, options);
  return state;
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
