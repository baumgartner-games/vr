import type { VisorBreath } from './graphicsSettings';

/**
 * **Wie stark das Visier gerade beschlagen ist** — reine Rechnung über die
 * Zeit, ohne three.js (`core/selfHelmet.ts` zeichnet es).
 *
 * Ein ruhiger Atem hat etwa fünfzehn Züge in der Minute, also einen alle
 * **vier Sekunden** (`BREATH_PERIOD`). Davon ist gut ein Drittel Ausatmen
 * (`EXHALE`): Die warme Luft trifft auf die kalte Scheibe, und der Beschlag
 * wächst. Danach verdunstet er, schnell zuerst und dann langsamer — so wie
 * ein Hauch auf einem Spiegel —, bis er beim nächsten Ausatmen wieder bei
 * null ankommt und neu wächst.
 *
 * Die vier Stufen (gewünscht: _„Bei aus eben so wie es ist. Bei leicht in dem
 * rythmus eines normalen atems nur ganz leicht beschlagener werden, bei stark
 * soll es nie ganz klar sein (sondern minimum wie bei leicht beschlagen) und
 * dann stärker. und bei beschlagen soll es stark nicht transparent sein"_):
 *
 * - `off` — 0.
 * - `light` — von 0 bis `LIGHT_PEAK` und zurück.
 * - `strong` — nie unter `LIGHT_PEAK`, mit jedem Atemzug bis `STRONG_PEAK`,
 *   und **schneller**: ein Zug alle `STRONG_PERIOD` Sekunden statt vier — wer
 *   so stark beschlägt, atmet unter Belastung. Gewünscht: _„bei stark bitte
 *   die Frequenz erhöhen"_, _„Bis zu 40–50 Atemzüge/Min"_.
 * - `fogged` — durchgehend `FOGGED`.
 */

/** Ein Atemzug, in Sekunden. */
export const BREATH_PERIOD = 4;
/** Wie lange davon ausgeatmet wird. */
export const EXHALE = 1.5;
/** Wie schnell der Beschlag danach verdunstet (Zeitkonstante, Sekunden). */
const FADE = 0.8;
/**
 * **Ein Atemzug bei `strong`**, in Sekunden: rund 46 Züge in der Minute, ein
 * Atem unter Belastung (gewünscht: _„Unter Belastung: Bis zu 40–50
 * Atemzüge/Min"_). Ausatmen und Verdunsten schrumpfen im selben Verhältnis
 * mit, damit die Form des Zugs dieselbe bleibt.
 */
export const STRONG_PERIOD = 1.3;

export const LIGHT_PEAK = 0.3;
export const STRONG_PEAK = 0.75;
export const FOGGED = 0.92;

/**
 * **Ein Atemzug** als Kurve von 0 bis 1 und zurück: im Ausatmen weich hinauf,
 * danach abklingend — und so gestaucht, dass sie am Ende des Zugs genau
 * wieder bei 0 steht. Sonst spränge der Beschlag beim nächsten Zug.
 */
export function breathPulse(time: number, period = BREATH_PERIOD): number {
  if (!Number.isFinite(time) || !(period > 0)) return 0;
  const scale = period / BREATH_PERIOD;
  const exhale = EXHALE * scale;
  const fade = FADE * scale;
  const phase = ((time % period) + period) % period;
  if (phase < exhale) {
    const x = phase / exhale;
    return x * x * (3 - 2 * x);
  }
  const tail = Math.exp(-(period - exhale) / fade);
  return (Math.exp(-(phase - exhale) / fade) - tail) / (1 - tail);
}

/** **Der Beschlag**, 0 (klar) bis 1 (milchig), für eine Stufe zu einer Zeit. */
export function breathFog(mode: VisorBreath, time: number): number {
  switch (mode) {
    case 'off':
      return 0;
    case 'light':
      return LIGHT_PEAK * breathPulse(time);
    case 'strong':
      return LIGHT_PEAK + (STRONG_PEAK - LIGHT_PEAK) * breathPulse(time, STRONG_PERIOD);
    case 'fogged':
      return FOGGED;
  }
}
