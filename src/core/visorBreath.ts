import type { VisorBreath } from './graphicsSettings';

/**
 * **Wie stark das Visier gerade beschlagen ist** — reine Rechnung über die
 * Zeit, ohne three.js (`core/selfHelmet.ts` zeichnet es).
 *
 * Ein ruhiger Atem hat etwa fünfzehn Züge in der Minute, also einen alle
 * **vier Sekunden** (`BREATH_PERIOD`). **Der Beschlag kommt schnell und geht
 * langsam** (gewünscht: _„Der Atem kommt schnell und geht langsam weg. Also
 * z.B. von 100%, ist der Atem da bei 30% und geht bis 70% weg"_): Die ersten
 * 30 % des Zugs (`EXHALE_SHARE`) wächst er, steil zuerst und oben weich
 * auslaufend — die warme Luft trifft auf die kalte Scheibe —, die übrigen
 * 70 % verdunstet er, oben zögernd, dann stetig, bis er genau mit dem Ende
 * des Zugs wieder unten ankommt.
 *
 * Die vier Stufen (gewünscht: _„Bei aus eben so wie es ist. Bei leicht in dem
 * rythmus eines normalen atems nur ganz leicht beschlagener werden, bei stark
 * soll es nie ganz klar sein (sondern minimum wie bei leicht beschlagen) und
 * dann stärker. und bei beschlagen soll es stark nicht transparent sein"_):
 *
 * - `off` — 0.
 * - `light` — von 0 bis `LIGHT_PEAK` und zurück.
 * - `strong` — nie unter `STRONG_FLOOR` (deutlich über dem Gipfel von
 *   `light`; gewünscht: _„das Minimum des Atem bei stark erhöhen, also dass
 *   nicht alles weg geht sondern noch mehr bleibt"_), mit jedem Atemzug bis
 *   `STRONG_PEAK`,
 *   und **schneller**: ein Zug alle `STRONG_PERIOD` Sekunden statt vier — wer
 *   so stark beschlägt, atmet unter Belastung. Gewünscht: _„bei stark bitte
 *   die Frequenz erhöhen"_, _„Bis zu 40–50 Atemzüge/Min"_.
 * - `fogged` — durchgehend `FOGGED`.
 */

/** Ein Atemzug, in Sekunden. */
export const BREATH_PERIOD = 4;
/** Welcher Anteil eines Zugs ausgeatmet wird — der Rest ist Verdunsten. */
export const EXHALE_SHARE = 0.3;
/** Wie lange ein ruhiger Zug ausgeatmet wird, in Sekunden. */
export const EXHALE = EXHALE_SHARE * BREATH_PERIOD;
/**
 * **Ein Atemzug bei `strong`**, in Sekunden: rund 46 Züge in der Minute, ein
 * Atem unter Belastung (gewünscht: _„Unter Belastung: Bis zu 40–50
 * Atemzüge/Min"_). Ausatmen und Verdunsten bleiben 30 zu 70.
 */
export const STRONG_PERIOD = 1.3;

export const LIGHT_PEAK = 0.3;
/** Das Tal von `strong`: Es geht nie alles weg. */
export const STRONG_FLOOR = 0.45;
export const STRONG_PEAK = 0.75;
export const FOGGED = 0.92;

/**
 * **Ein Atemzug** als Kurve von 0 bis 1 und zurück: in den ersten 30 % schnell
 * hinauf (steil, oben flach), in den übrigen 70 % langsam hinab (oben zögernd,
 * unten weich) — und am Ende des Zugs genau wieder bei 0, sonst spränge der
 * Beschlag beim nächsten Zug.
 */
export function breathPulse(time: number, period = BREATH_PERIOD): number {
  if (!Number.isFinite(time) || !(period > 0)) return 0;
  const exhale = EXHALE_SHARE * period;
  const phase = ((time % period) + period) % period;
  if (phase < exhale) {
    const x = 1 - phase / exhale;
    return 1 - x * x;
  }
  const x = (phase - exhale) / (period - exhale);
  return 1 - x * x * (3 - 2 * x);
}

/** **Der Beschlag**, 0 (klar) bis 1 (milchig), für eine Stufe zu einer Zeit. */
export function breathFog(mode: VisorBreath, time: number): number {
  switch (mode) {
    case 'off':
      return 0;
    case 'light':
      return LIGHT_PEAK * breathPulse(time);
    case 'strong':
      return STRONG_FLOOR + (STRONG_PEAK - STRONG_FLOOR) * breathPulse(time, STRONG_PERIOD);
    case 'fogged':
      return FOGGED;
  }
}
