/**
 * **Was die Hand fühlt, während sie hält** — die Vibration der Kletterhalle.
 *
 * Die Frage war offen, und sie ist es wert, hier beantwortet zu werden, denn
 * es gibt zwei Bauarten, und nur eine funktioniert:
 *
 * *Dauerbrummen, dessen Stärke den Halt anzeigt* — klingt richtig, ist es
 * aber nicht. Ein Motor, der die ganze Zeit läuft, wird nach zwanzig Sekunden
 * nicht mehr wahrgenommen (das ist keine Meinung, das ist Adaption), er
 * verdeckt jede andere Rückmeldung, und er leert an einem Quest den Akku.
 * Vor allem aber: Man merkt eine *Änderung* viel besser als einen *Pegel*.
 *
 * Also **Ereignisse statt Pegel**, drei Stück:
 *
 * 1. **Der Schlag beim Zupacken** (`landingBuzz`). Genau einer, in dem
 *    Moment, in dem die Hand den Griff annimmt — und er ist die Antwort auf
 *    die Frage „habe ich das gut erwischt?“. Guter Halt: **kurz und hart**,
 *    ein Klacken, wie wenn etwas einrastet. Schlechter Halt: **schwach und
 *    lang**, ein Schmieren — genau das Gefühl, wenn eine Hand über Stein
 *    rutscht. Beides sind dieselben zwei Regler in die Gegenrichtung, und
 *    dadurch kann man sie ohne Anzeige auseinanderhalten.
 * 2. **Das Rutschen** (`slipTick`). Solange ein Griff unter der
 *    Erholungsschwelle liegt, tickt es leicht weiter — und **je schlechter
 *    der Halt, desto schneller die Folge**. Nicht lauter: schneller. Ein
 *    beschleunigendes Ticken liest sich als Countdown, und das ist genau,
 *    was es ist.
 * 3. **Die Warnung** (`fatigueTick`). Geht die Ausdauer zur Neige, kommt ein
 *    zweiter, härterer Puls dazu, der ebenfalls schneller wird. Er sitzt
 *    bewusst in einem anderen Bereich als das Rutschen — kurz und kräftig
 *    statt lang und weich —, damit beide nebeneinander unterscheidbar
 *    bleiben, wenn beides zugleich passiert.
 *
 * An der **Leiter** passiert nichts von alledem außer dem Klacken beim
 * Zupacken. Eine Welt, in der auch das sichere Material vibriert, hat kein
 * sicheres Material mehr.
 *
 * Reine Zahlen, kein WebXR: dieselbe Begründung wie bei `tune/haptics.ts` —
 * Vibration ist die einzige Rückmeldung, die man nicht sehen kann, also wird
 * sie dort gerechnet, wo man sie nachlesen und prüfen kann.
 */

import { RECOVER_AT } from './stamina';

/** Ein Stoß, so wie ihn `ControllerState.pulse` nimmt. */
export interface Buzz {
  /** 0 bis 1. */
  intensity: number;
  /** Millisekunden. */
  duration: number;
}

/** Ein wiederkehrender Stoß: wie oft, und wie er sich anfühlt. */
export interface BuzzTick {
  /** Sekunden zwischen zwei Stößen. */
  period: number;
  buzz: Buzz;
}

/** Ab welcher Ausdauer gewarnt wird. */
export const FATIGUE_AT = 0.34;

/**
 * Der eine Stoß in dem Moment, in dem die Hand zupackt.
 *
 * @param quality Halt dieser Hand, 0 bis 1
 */
export function landingBuzz(quality: number): Buzz {
  const q = clamp01(quality);
  return { intensity: 0.15 + 0.85 * q, duration: Math.round(190 - 130 * q) };
}

/**
 * Das Ticken, solange der Halt unter der Erholungsschwelle liegt — oder
 * `null`, wenn nichts zu sagen ist.
 */
export function slipTick(quality: number): BuzzTick | null {
  const q = clamp01(quality);
  if (q >= RECOVER_AT) return null;
  const t = (RECOVER_AT - q) / RECOVER_AT;
  return {
    period: 0.62 - 0.45 * t,
    buzz: { intensity: 0.12 + 0.16 * t, duration: Math.round(130 - 50 * t) },
  };
}

/** Die Warnung, wenn die Ausdauer zur Neige geht — oder `null`, solange nicht. */
export function fatigueTick(stamina: number): BuzzTick | null {
  const value = clamp01(stamina);
  if (value >= FATIGUE_AT) return null;
  const t = (FATIGUE_AT - value) / FATIGUE_AT;
  return {
    period: 0.9 - 0.55 * t,
    buzz: { intensity: 0.3 + 0.4 * t, duration: 45 },
  };
}

/**
 * Wie oft ein Ticken zwischen zwei Zeitpunkten fällig ist.
 *
 * Dieselbe halboffene Regel wie in `tune/haptics.ts`: `from` gehört dazu, `to`
 * nicht — so wird kein Stoß verschluckt und keiner kommt zweimal. Zwei
 * Unterschiede, und beide haben einen Grund:
 *
 * - **Bei null tickt es nicht.** Die Uhr fängt beim Zupacken an, und dort hat
 *   der Schlag von `landingBuzz` schon gesessen. Ein Tick obendrauf wäre ein
 *   Doppelschlag, der nichts bedeutet.
 * - **Höchstens einer pro Bild.** Ein Ruckler soll nicht acht Stöße auf einmal
 *   in die Hand schlagen — mehr als einen fühlt ohnehin niemand.
 */
export function ticksBetween(period: number, from: number, to: number): number[] {
  if (!(period > 0) || !(to > from)) return [];
  const start = Math.max(from, to - period);
  const first = Math.max(1, Math.ceil(start / period));
  const out: number[] = [];
  for (let k = first; k * period < to; k++) {
    if (k * period >= start) out.push(k * period);
  }
  return out;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}
