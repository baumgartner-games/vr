/**
 * **Wie sich eine Lampe verhält** — reine Rechnung, ohne three.js.
 *
 * Gewünscht: _„Ich denke default bei Nacht an wäre schonmal gut. Und dann muss
 * man beim Einrichtungsmodus bzw. Baumodus noch die Lampen anpassen können …
 * um alle Lampen vom gleichen Typ in der Welt den default zu ändern. Diese
 * Lampe den override zu ändern."_ Und die Szenarien dazu: die Station, deren
 * Lampen das Board schaltet; Notlicht, das rot blinkt oder sich dreht; eine
 * Tischlampe, die man von Hand schaltet; Deko im Restaurant, die nachts
 * angeht; Grusellicht, das flackert.
 *
 * Getrennt sind deshalb drei Fragen, und jede hat ihre Zeile:
 *
 * - **Betrieb** (`LampMode`) — _wann_ sie brennt: bei Nacht, immer, nie, oder
 *   wie ihr Schalter steht.
 * - **Lichtart** (`LampEffect`) — _wie_ sie brennt: ruhig, flackernd,
 *   blinkend, als Drehlicht, pulsierend, als Ampel.
 * - **Farbe** (`LampColor`) — die eigene des Typs oder eine gewählte.
 *
 * Und drei Ebenen, die untere gewinnt (`resolveSettings`): der **Standard des
 * Typs** (`lampTypes.ts`), der **Standard der Welt** für diesen Typ, die
 * **Abweichung dieser einen Lampe**. Darüber liegt, was gerade passiert — der
 * Hauptschalter im Menü (`streetLights`), später das Board und der Alarm.
 *
 * Alles, was sich bewegt, hängt an der Uhr und einem Samen je Lampe
 * (`lampLevel`), damit zwei Geräte dasselbe Flackern sehen.
 */

/** **Wann** eine Lampe brennt. */
export type LampMode = 'night' | 'on' | 'off' | 'switch';
export const LAMP_MODES = ['night', 'on', 'off', 'switch'] as const;
export const LAMP_MODE_LABELS: Readonly<Record<LampMode, string>> = {
  night: 'Bei Nacht',
  on: 'Immer an',
  off: 'Aus',
  switch: 'Schalter',
};
export const LAMP_MODE_SUBS: Readonly<Record<LampMode, string>> = {
  night: 'Geht am Abend und in der Nacht an, am Tag aus',
  on: 'Brennt immer, auch am Tag',
  off: 'Bleibt dunkel',
  switch: 'Wie ihr Schalter steht — von Hand an und aus',
};

/** **Wie** eine Lampe brennt. */
export type LampEffect = 'steady' | 'flicker' | 'blink' | 'rotate' | 'pulse' | 'signal';
export const LAMP_EFFECTS = ['steady', 'flicker', 'blink', 'rotate', 'pulse', 'signal'] as const;
export const LAMP_EFFECT_LABELS: Readonly<Record<LampEffect, string>> = {
  steady: 'Ruhig',
  flicker: 'Flackern',
  blink: 'Blinken',
  rotate: 'Drehlicht',
  pulse: 'Pulsieren',
  signal: 'Ampel',
};
export const LAMP_EFFECT_SUBS: Readonly<Record<LampEffect, string>> = {
  steady: 'Gleichmäßiges Licht',
  flicker: 'Unruhig wie eine Flamme, setzt manchmal kurz aus — Kerze, Fackel, Grusel',
  blink: 'An, aus, an — wie ein Notlicht',
  rotate: 'Ein Lichtkegel, der umläuft — Blaulicht, Rundumleuchte',
  pulse: 'Wird langsam hell und wieder dunkel — Alarm',
  signal: 'Grün, Gelb, Rot im Umlauf — nur Ampeln haben die Farben dafür',
};

/** **Welche Farbe** — `auto` ist die eigene des Typs. */
export type LampColor = 'auto' | 'warm' | 'white' | 'cold' | 'red' | 'green' | 'blue' | 'violet';
export const LAMP_COLORS = [
  'auto',
  'warm',
  'white',
  'cold',
  'red',
  'green',
  'blue',
  'violet',
] as const;
export const LAMP_COLOR_LABELS: Readonly<Record<LampColor, string>> = {
  auto: 'Eigene',
  warm: 'Warm',
  white: 'Weiß',
  cold: 'Kalt',
  red: 'Rot',
  green: 'Grün',
  blue: 'Blau',
  violet: 'Lila',
};

/**
 * **Was an einer Lampe eingestellt sein kann.** Jedes Feld darf fehlen — dann
 * gilt die Ebene darunter. `on` ist die Stellung des Schalters und zählt nur
 * im Betrieb `switch`.
 */
export interface LampSettings {
  mode?: LampMode;
  effect?: LampEffect;
  color?: LampColor;
  on?: boolean;
}

/** Was nach allen Ebenen gilt — kein Feld fehlt mehr. */
export interface ResolvedLamp {
  mode: LampMode;
  effect: LampEffect;
  color: LampColor;
  on: boolean;
}

/**
 * **Die drei Ebenen übereinander** — Typ, Welt, diese Lampe; die spätere
 * gewinnt, aber nur mit den Feldern, die sie wirklich setzt.
 */
export function resolveSettings(
  type: LampSettings,
  world: LampSettings | undefined,
  own: LampSettings | undefined,
): ResolvedLamp {
  const pick = <K extends keyof LampSettings>(key: K): LampSettings[K] =>
    own?.[key] ?? world?.[key] ?? type[key];
  return {
    mode: pick('mode') ?? 'night',
    effect: pick('effect') ?? 'steady',
    color: pick('color') ?? 'auto',
    on: pick('on') ?? false,
  };
}

/** **Der Hauptschalter** aus dem Menü (`weather.StreetLightMode`). */
export type LampMaster = 'auto' | 'on' | 'off';

/**
 * **Ob die Lampe brennt** — Betrieb, Tageszeit und Hauptschalter.
 *
 * Der Hauptschalter _An_ zündet, was bei Nacht brennen würde, auch am Tag;
 * _Aus_ löscht alles. Eine Lampe, die ausdrücklich _Aus_ ist oder deren
 * Schalter aus steht, bleibt auch unter _An_ dunkel — der Hauptschalter ist
 * der Ersatz für die Tageszeit, nicht für den Lichtschalter.
 */
export function lampBurns(lamp: ResolvedLamp, night: boolean, master: LampMaster): boolean {
  if (master === 'off') return false;
  switch (lamp.mode) {
    case 'off':
      return false;
    case 'on':
      return true;
    case 'switch':
      return lamp.on;
    case 'night':
      return night || master === 'on';
  }
}

/** Ein Samen je Lampe aus ihrem Schlüssel — damit nicht alle im selben Takt flackern. */
export function lampSeed(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

function noise(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * **Wie hell die Lampe in diesem Augenblick ist**, 0–1 — die Lichtart über
 * der Uhr. `time` in Sekunden, `seed` aus `lampSeed`.
 *
 * - _Flackern_: zwölf Mal die Sekunde ein neuer Wert um 85 %, weich
 *   dazwischen, und ab und zu ein kurzer Aussetzer — eine Flamme im Zug, keine
 *   kaputte Röhre.
 * - _Blinken_: 1,5 Hz, halb an, halb fast aus.
 * - _Drehlicht_: ein heller Blitz je Umlauf (0,6 Umläufe die Sekunde), so wie
 *   man eine Rundumleuchte von der Seite sieht.
 * - _Pulsieren_: weich zwischen 30 % und voll, 0,8 Hz.
 * - _Ruhig_ und _Ampel_: voll — die Ampel entscheidet je Leuchte selbst
 *   (`lampTypes.signalLit`).
 */
export function lampLevel(effect: LampEffect, time: number, seed: number): number {
  switch (effect) {
    case 'flicker': {
      const t = time * 12 + seed * 1000;
      const i = Math.floor(t);
      const f = t - i;
      const a = noise(i);
      const b = noise(i + 1);
      const smooth = a + (b - a) * f * f * (3 - 2 * f);
      // Ein Aussetzer etwa alle drei Sekunden, je Lampe zu ihrer Zeit.
      const drop = noise(Math.floor(time * 6 + seed * 777)) < 0.035 ? 0.25 : 1;
      return (0.72 + 0.28 * smooth) * drop;
    }
    case 'blink':
      return (time * 1.5 + seed) % 1 < 0.5 ? 1 : 0.06;
    case 'rotate': {
      const c = Math.cos((time * 0.6 + seed) * Math.PI * 2);
      return 0.12 + 0.88 * Math.pow(Math.max(0, c), 4);
    }
    case 'pulse':
      return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin((time * 0.8 + seed) * Math.PI * 2));
    case 'steady':
    case 'signal':
      return 1;
  }
}

/** Liest ein Feld aus einer Datei: was es nicht gibt, fällt weg. */
export function cleanSettings(raw: unknown): LampSettings | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  const out: LampSettings = {};
  if (LAMP_MODES.includes(value['mode'] as LampMode)) out.mode = value['mode'] as LampMode;
  if (LAMP_EFFECTS.includes(value['effect'] as LampEffect)) {
    out.effect = value['effect'] as LampEffect;
  }
  if (LAMP_COLORS.includes(value['color'] as LampColor)) out.color = value['color'] as LampColor;
  if (typeof value['on'] === 'boolean') out.on = value['on'];
  return Object.keys(out).length > 0 ? out : null;
}

/** Die nächste Stufe einer Liste, am Ende wieder vorn. */
export function nextOf<T>(list: readonly T[], value: T): T {
  return list[(list.indexOf(value) + 1) % list.length]!;
}
