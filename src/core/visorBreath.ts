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
 * - `strong` — nie unter `LIGHT_PEAK`, mit jedem Atemzug bis `STRONG_PEAK`.
 * - `fogged` — durchgehend `FOGGED`.
 */

/** Ein Atemzug, in Sekunden. */
export const BREATH_PERIOD = 4;
/** Wie lange davon ausgeatmet wird. */
export const EXHALE = 1.5;
/** Wie schnell der Beschlag danach verdunstet (Zeitkonstante, Sekunden). */
const FADE = 0.8;

export const LIGHT_PEAK = 0.3;
export const STRONG_PEAK = 0.75;
export const FOGGED = 0.92;

/**
 * **Ein Atemzug** als Kurve von 0 bis 1 und zurück: im Ausatmen weich hinauf,
 * danach abklingend — und so gestaucht, dass sie am Ende des Zugs genau
 * wieder bei 0 steht. Sonst spränge der Beschlag beim nächsten Zug.
 */
export function breathPulse(time: number): number {
  if (!Number.isFinite(time)) return 0;
  const phase = ((time % BREATH_PERIOD) + BREATH_PERIOD) % BREATH_PERIOD;
  if (phase < EXHALE) {
    const x = phase / EXHALE;
    return x * x * (3 - 2 * x);
  }
  const tail = Math.exp(-(BREATH_PERIOD - EXHALE) / FADE);
  return (Math.exp(-(phase - EXHALE) / FADE) - tail) / (1 - tail);
}

/** **Der Beschlag**, 0 (klar) bis 1 (milchig), für eine Stufe zu einer Zeit. */
export function breathFog(mode: VisorBreath, time: number): number {
  switch (mode) {
    case 'off':
      return 0;
    case 'light':
      return LIGHT_PEAK * breathPulse(time);
    case 'strong':
      return LIGHT_PEAK + (STRONG_PEAK - LIGHT_PEAK) * breathPulse(time);
    case 'fogged':
      return FOGGED;
  }
}
