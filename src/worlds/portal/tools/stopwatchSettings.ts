/**
 * Was der Trigger der Stoppuhr tut.
 *
 * Die Uhr konnte genau eine Sache: Zeitlupe an, Zeitlupe aus, mit einer im
 * Code festgenagelten 0,22. Für einen Sandkasten ist die Uhr aber das
 * Werkzeug, mit dem man Physik überhaupt *ansieht*, und dafür braucht sie
 * drei Betriebsarten statt einer:
 *
 * - **Zeit** — der Trigger legt einen Faktor an: anhalten, Zeitlupe, oder
 *   Zeitraffer. Nochmal drücken gibt der Welt ihr Tempo zurück.
 * - **Einzelbild** — die Zeit steht, und jeder Druck rechnet genau so viele
 *   feste Schritte weiter, wie hier stehen. Das ist die einzige Art, einen
 *   Durchschlag oder einen Portalübergang wirklich zu sehen.
 * - **Schnellladen** — der Trigger stellt die zuletzt gespeicherte Aufstellung
 *   wieder her. Gespeichert wird bewusst nur im Menü: ein Trigger, der beides
 *   kann, überschreibt irgendwann genau das, was man behalten wollte.
 *
 * Reine Daten und Beschriftungen, kein three.js.
 */

export type StopwatchAction = 'time' | 'step' | 'load';

export const STOPWATCH_ACTIONS: readonly StopwatchAction[] = ['time', 'step', 'load'];

export const STOPWATCH_ACTION_LABELS: Record<StopwatchAction, string> = {
  time: 'Zeit',
  step: 'Einzelbild',
  load: 'Schnellladen',
};

export const STOPWATCH_ACTION_SUBS: Record<StopwatchAction, string> = {
  time: 'Trigger schaltet den Zeitfaktor an und aus',
  step: 'Zeit steht · Trigger rechnet Bilder weiter',
  load: 'Trigger holt die gespeicherte Aufstellung zurück',
};

export interface StopwatchSettings {
  action: StopwatchAction;
  /** Der Faktor, den der Trigger anlegt: 0 hält an, 1 ist normal, 4 ist Zeitraffer. */
  factor: number;
  /** Wie viele feste Schritte ein Druck im Einzelbild-Modus rechnet. */
  frames: number;
}

/** Wie bisher: eine kräftige Zeitlupe, und ein Bild pro Druck. */
export const DEFAULT_STOPWATCH: StopwatchSettings = {
  action: 'time',
  factor: 0.22,
  frames: 1,
};

export const FACTOR_STEPS = [0, 0.05, 0.22, 0.5, 2, 4] as const;
export const FRAME_STEPS = [1, 2, 5, 10, 30, 60] as const;

export const MIN_FACTOR = 0;
/** Mehr rechnet die Simulation pro Frame ohnehin nicht (vier feste Schritte). */
export const MAX_FACTOR = 4;
export const MIN_FRAMES = 1;
export const MAX_FRAMES = 240;

export function clampFactor(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_STOPWATCH.factor;
  return Math.round(Math.min(MAX_FACTOR, Math.max(MIN_FACTOR, number)) * 100) / 100;
}

export function clampFrames(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_STOPWATCH.frames;
  return Math.round(Math.min(MAX_FRAMES, Math.max(MIN_FRAMES, number)));
}

export function clampStopwatch(settings: Partial<StopwatchSettings> | undefined): StopwatchSettings {
  const next = { ...DEFAULT_STOPWATCH, ...settings };
  return {
    action: STOPWATCH_ACTIONS.includes(next.action) ? next.action : DEFAULT_STOPWATCH.action,
    factor: clampFactor(next.factor),
    frames: clampFrames(next.frames),
  };
}

/** Die nächste Betriebsart in der Runde. */
export function nextStopwatchAction(action: StopwatchAction): StopwatchAction {
  const at = STOPWATCH_ACTIONS.indexOf(action);
  return STOPWATCH_ACTIONS[(at + 1) % STOPWATCH_ACTIONS.length]!;
}

/** Die nächste Raste über dem Wert, oben wieder von vorn. */
export function nextFactor(value: number): number {
  return FACTOR_STEPS.find((step) => step > value + 1e-9) ?? FACTOR_STEPS[0];
}

export function nextFrames(value: number): number {
  return FRAME_STEPS.find((step) => step > value + 1e-9) ?? FRAME_STEPS[0];
}

/** Wie der Faktor auf der Zeile steht — als Wort, nicht als nackte Zahl. */
export function factorLabel(factor: number): string {
  if (factor <= 0) return 'angehalten';
  if (Math.abs(factor - 1) < 1e-9) return 'normal';
  const number = `${factor}×`;
  return factor < 1 ? `${number} Zeitlupe` : `${number} Zeitraffer`;
}

export function framesLabel(frames: number): string {
  return frames === 1 ? '1 Bild' : `${frames} Bilder`;
}
