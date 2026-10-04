import { dayMix } from './dayClock';

/**
 * **Wetter** — Nebel, Tageszeit und Filter über dem fertigen Bild.
 *
 * Gewünscht: _„neue Grafik Effekte ausprobieren … eine Atmosphäre schaffen wie
 * in den beigefügten Bildern"_ — eine nächtliche Stadt von oben, lila Nebel,
 * der in den Straßen liegt und um die Figur herum aufreißt, Laternen, die
 * gegen die Nacht leuchten, und ein dunkler Rand ums Bild. Und dazu: _„sollten
 * wir das als ‚Wetter' einfach bezeichnen? Nebel und Tageszeit und Filter?"_
 * Genau so steht es im Menü: _Grafik → Wetter_ mit drei Zeilen und einer
 * Abkürzung, die alle drei auf einmal stellt (_Spukstadt_).
 *
 * **Wie.** Keine Welt weiß davon. Gezeichnet wird in denselben Durchgang wie
 * die unscharfen Etagen (`core/levelBlur.ts`): Das Bild geht in eine Textur
 * mit Tiefe, und je Bildpunkt wird aus der Tiefe der Punkt in der Welt
 * zurückgerechnet. Damit weiß der Nebel, wie hoch etwas steht (er liegt unten,
 * bis 1,6 m über dem eigenen Boden dicht) und wie weit es von der Figur weg ist
 * (bis 5 m klar, ab 20 m voll). Die Tageszeit färbt und dunkelt ab — was
 * selbst hell ist, eine Laterne, ein Fenster, behält sein Licht. Der Filter
 * kommt zuletzt: Sättigung, Kontrast, Tönung und Vignette.
 *
 * **Wann.** Nur am Schirm (von oben und aus den Augen), nie in der Brille —
 * die zeichnet ohne Umweg. Ein Durchgang über den ganzen Schirm, derselbe wie
 * der Blur; sind beide an, ist es einer.
 *
 * Diese Datei ist reine Rechnung und Beschriftung, ohne three.js.
 */

/** **Nebel** — aus, leichter Dunst, dichter Nebel oder lila Spuk, der wabert. */
export type WeatherFog = 'off' | 'haze' | 'dense' | 'spooky';
export const WEATHER_FOGS = ['off', 'haze', 'dense', 'spooky'] as const;
export const WEATHER_FOG_LABELS: Readonly<Record<WeatherFog, string>> = {
  off: 'Aus',
  haze: 'Dunst',
  dense: 'Dicht',
  spooky: 'Spuk',
};
export const WEATHER_FOG_SUBS: Readonly<Record<WeatherFog, string>> = {
  off: 'Klare Sicht',
  haze: 'Ein leichter grauer Schleier in der Ferne und über dem Boden',
  dense: 'Grauer Nebel in den Straßen · reißt um die Figur herum auf',
  spooky: 'Lila Nebel, der langsam wabert · reißt um die Figur herum auf',
};

/** **Tageszeit** — wie hell und in welcher Farbe das Licht liegt. */
export type WeatherTime = 'day' | 'dusk' | 'night';
export const WEATHER_TIMES = ['day', 'dusk', 'night'] as const;
export const WEATHER_TIME_LABELS: Readonly<Record<WeatherTime, string>> = {
  day: 'Tag',
  dusk: 'Abend',
  night: 'Nacht',
};
export const WEATHER_TIME_SUBS: Readonly<Record<WeatherTime, string>> = {
  day: 'Das Licht der Welt, wie es ist',
  dusk: 'Warmes, gedämpftes Abendlicht',
  night: 'Dunkel und kühl · Lampen und Fenster leuchten weiter',
};

/** **Filter** — der Look zuletzt über allem. */
export type WeatherFilter = 'off' | 'vignette' | 'noir' | 'violet';
export const WEATHER_FILTERS = ['off', 'vignette', 'noir', 'violet'] as const;
export const WEATHER_FILTER_LABELS: Readonly<Record<WeatherFilter, string>> = {
  off: 'Aus',
  vignette: 'Vignette',
  noir: 'Noir',
  violet: 'Lila',
};
export const WEATHER_FILTER_SUBS: Readonly<Record<WeatherFilter, string>> = {
  off: 'Kein Filter',
  vignette: 'Dunkler Rand ums Bild',
  noir: 'Fast schwarz-weiß, mehr Kontrast, dunkler Rand',
  violet: 'Gedämpfte Farben mit lila Stich, dunkler Rand',
};

export function nextWeatherFog(fog: WeatherFog): WeatherFog {
  return WEATHER_FOGS[(WEATHER_FOGS.indexOf(fog) + 1) % WEATHER_FOGS.length]!;
}
export function nextWeatherTime(time: WeatherTime): WeatherTime {
  return WEATHER_TIMES[(WEATHER_TIMES.indexOf(time) + 1) % WEATHER_TIMES.length]!;
}
export function nextWeatherFilter(filter: WeatherFilter): WeatherFilter {
  return WEATHER_FILTERS[(WEATHER_FILTERS.indexOf(filter) + 1) % WEATHER_FILTERS.length]!;
}

/** Die drei Felder, wie sie in `GraphicsSettings` stehen. */
export interface WeatherSettings {
  weatherFog: WeatherFog;
  weatherTime: WeatherTime;
  weatherFilter: WeatherFilter;
  /** Der Hauptschalter aller Lampen (`core/Lamps.ts`). */
  streetLights: StreetLightMode;
  /**
   * **Sichtweite im Nebel**, in Metern: ab hier ist der Nebel voll — bei
   * _Dicht_ ist dahinter nichts mehr zu sehen. Gewünscht: _„Ggf etwas weiter
   * als 11m auch ggf. zum einstellen +-m Nebel. Default bei Nebel 20m"_.
   */
  fogRange: number;
}

/** Die Sichtweite im Nebel: ab Werk, Schritt und Grenzen (m). */
export const FOG_RANGE_DEFAULT = 20;
export const FOG_RANGE_STEP = 5;
export const FOG_RANGE_MIN = 10;
export const FOG_RANGE_MAX = 60;

/** Die Sichtweite auf erlaubte Werte gebracht — ganze Schritte zwischen den Grenzen. */
export function clampFogRange(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return FOG_RANGE_DEFAULT;
  const stepped = Math.round(raw / FOG_RANGE_STEP) * FOG_RANGE_STEP;
  return Math.min(FOG_RANGE_MAX, Math.max(FOG_RANGE_MIN, stepped));
}

/**
 * **Der Hauptschalter aller Lampen** (`core/Lamps.ts`, `lamps/lampBehaviour.lampBurns`).
 * `auto` (ab Werk): Jede Lampe tut, was an ihr eingestellt ist — ab Werk heißt
 * das, sie geht am Abend und in der Nacht an. `on`: Was bei Nacht brennen
 * würde, brennt auch am Tag. `off`: Alles bleibt dunkel. Gewünscht zuerst: _„bei
 * den Laternen das entsprechend einstellen, dass diese bei Tageszeit
 * automatisch leuchten. Die Laternen und Ampeln sollen alle ein Licht haben
 * können."_
 */
export type StreetLightMode = 'auto' | 'on' | 'off';
export const STREET_LIGHT_MODES = ['auto', 'on', 'off'] as const;
export const STREET_LIGHT_LABELS: Readonly<Record<StreetLightMode, string>> = {
  auto: 'Automatisch',
  on: 'An',
  off: 'Aus',
};
export const STREET_LIGHT_SUBS: Readonly<Record<StreetLightMode, string>> = {
  auto: 'Jede Lampe wie eingestellt · ab Werk an bei Abend und Nacht',
  on: 'Was bei Nacht brennt, brennt auch am Tag',
  off: 'Alle Lampen bleiben dunkel',
};
export function nextStreetLightMode(mode: StreetLightMode): StreetLightMode {
  return STREET_LIGHT_MODES[(STREET_LIGHT_MODES.indexOf(mode) + 1) % STREET_LIGHT_MODES.length]!;
}

/** Ab Werk: kein Wetter — wer nichts einstellt, sieht das Bild von vorher. */
export const DEFAULT_WEATHER: WeatherSettings = {
  weatherFog: 'off',
  weatherTime: 'day',
  weatherFilter: 'off',
  streetLights: 'auto',
  fogRange: FOG_RANGE_DEFAULT,
};

/** **Spukstadt** — die Abkürzung zum Bild aus dem Wunsch: Nacht, lila Nebel, lila Filter. */
export const SPOOKY_TOWN: Omit<WeatherSettings, 'fogRange'> = {
  weatherFog: 'spooky',
  weatherTime: 'night',
  weatherFilter: 'violet',
  streetLights: 'auto',
};

/** Liest einen gespeicherten Stand; was es nicht gibt, wird ab Werk. */
export function clampWeather(raw: Partial<WeatherSettings>): WeatherSettings {
  return {
    weatherFog: WEATHER_FOGS.includes(raw.weatherFog as WeatherFog)
      ? (raw.weatherFog as WeatherFog)
      : DEFAULT_WEATHER.weatherFog,
    weatherTime: WEATHER_TIMES.includes(raw.weatherTime as WeatherTime)
      ? (raw.weatherTime as WeatherTime)
      : DEFAULT_WEATHER.weatherTime,
    weatherFilter: WEATHER_FILTERS.includes(raw.weatherFilter as WeatherFilter)
      ? (raw.weatherFilter as WeatherFilter)
      : DEFAULT_WEATHER.weatherFilter,
    streetLights: STREET_LIGHT_MODES.includes(raw.streetLights as StreetLightMode)
      ? (raw.streetLights as StreetLightMode)
      : DEFAULT_WEATHER.streetLights,
    fogRange: clampFogRange(raw.fogRange),
  };
}

/** Eine Zeile fürs Menü: was gerade eingestellt ist. */
export function weatherSummary(settings: WeatherSettings): string {
  if (!weatherActive(settings)) return 'Aus · klare Sicht, Tag, kein Filter';
  return [
    `Nebel ${WEATHER_FOG_LABELS[settings.weatherFog]}`,
    WEATHER_TIME_LABELS[settings.weatherTime],
    `Filter ${WEATHER_FILTER_LABELS[settings.weatherFilter]}`,
  ].join(' · ');
}

export function weatherActive(settings: WeatherSettings, clock = false): boolean {
  return (
    clock ||
    settings.weatherFog !== 'off' ||
    settings.weatherTime !== 'day' ||
    settings.weatherFilter !== 'off'
  );
}

type Rgb = readonly [number, number, number];

/** **Was der Durchgang braucht** — alle Farben linear, vor dem Tone Mapping. */
export interface WeatherLook {
  /** Womit das Licht multipliziert wird (Farbe × Helligkeit der Tageszeit). */
  light: Rgb;
  /** Wie viel von einem hellen Punkt (Lampe, Fenster) der Abdunklung entgeht, 0–1. */
  keepBright: number;
  fogColor: Rgb;
  /** 0 = kein Nebel, 1 = deckend, wo er am dichtesten liegt. */
  fogStrength: number;
  /** Wie stark der Nebel wabert (0 = gleichmäßig). */
  fogSwirl: number;
  /** Bis wohin um die Figur herum klar, und ab wo voll (m, am Schirm und in der Brille). */
  fogClear: number;
  fogFull: number;
  /** Wie hoch über dem Boden er dicht liegt (m) — darüber dünnt er aus. */
  fogHeight: number;
  /** Wie viel Nebel unabhängig von der Höhe liegt, 0–1 — bei _Dicht_ verschwinden auch Häuser. */
  fogBase: number;
  /**
   * Ob alles hinter dem Nebel unsichtbar ist — dann darf die Brille am Boden
   * dort aufhören zu zeichnen (`weatherXr.ts`).
   */
  fogOpaque: boolean;
  saturation: number;
  contrast: number;
  tint: Rgb;
  /** Wie dunkel die Ecken werden, 0–1. */
  vignette: number;
}

const LIGHT: Readonly<Record<WeatherTime, Rgb>> = {
  day: [1, 1, 1],
  dusk: [0.9, 0.7, 0.64],
  night: [0.4, 0.44, 0.66],
};

interface FogKind {
  color: Rgb;
  strength: number;
  swirl: number;
  clear: number;
  full: number;
  height: number;
  base: number;
  opaque: boolean;
}

/**
 * **Die Nebel.** _Dicht_ ist kein Wetter, sondern ein Spielmittel: Gewünscht
 * war _„bei dichtem Nebel es wirklich sehr dicht machen, also so dass man es
 * dann nicht mehr erkennen kann? Aktuell mag es zwar realistisch sein, aber
 * für ein Spiel passt es nicht."_ Also deckend, nach neun Metern ist nichts
 * mehr zu sehen, auch kein Haus (`base`), und um die Figur bleibt nur ein
 * kleiner klarer Kreis.
 */
const FOG: Readonly<Record<WeatherFog, FogKind>> = {
  off: {
    color: [0, 0, 0],
    strength: 0,
    swirl: 0,
    clear: 5,
    full: 20,
    height: 1.6,
    base: 0.15,
    opaque: false,
  },
  haze: {
    color: [0.62, 0.64, 0.68],
    strength: 0.3,
    swirl: 0.4,
    clear: 5,
    full: 20,
    height: 1.6,
    base: 0.15,
    opaque: false,
  },
  dense: {
    color: [0.55, 0.57, 0.62],
    strength: 1,
    swirl: 0.35,
    clear: 2.5,
    full: 9,
    height: 8,
    base: 1,
    opaque: true,
  },
  spooky: {
    color: [0.46, 0.27, 0.78],
    strength: 0.62,
    swirl: 1,
    clear: 5,
    full: 20,
    height: 1.6,
    base: 0.15,
    opaque: false,
  },
};

const FILTER: Readonly<
  Record<WeatherFilter, { saturation: number; contrast: number; tint: Rgb; vignette: number }>
> = {
  off: { saturation: 1, contrast: 1, tint: [1, 1, 1], vignette: 0 },
  vignette: { saturation: 1, contrast: 1, tint: [1, 1, 1], vignette: 0.55 },
  noir: { saturation: 0.12, contrast: 1.25, tint: [1, 1, 1.04], vignette: 0.7 },
  violet: { saturation: 0.72, contrast: 1.1, tint: [0.92, 0.84, 1.08], vignette: 0.6 },
};

/**
 * **Was der Durchgang mit diesem Stand tun soll** — `null` heißt: nichts,
 * und dann kostet das Wetter auch nichts.
 */
export function weatherLook(
  settings: WeatherSettings,
  presenting: boolean,
  hour: number | null = null,
): WeatherLook | null {
  if (presenting) return null;
  // **Läuft die Uhr der Welt** (`core/dayClock.ts`), mischt sich das Licht
  // fließend aus Tag, Abend und Nacht; sonst gilt die eine Stufe aus dem Menü.
  const mix =
    hour === null
      ? {
          day: settings.weatherTime === 'day' ? 1 : 0,
          dusk: settings.weatherTime === 'dusk' ? 1 : 0,
          night: settings.weatherTime === 'night' ? 1 : 0,
        }
      : dayMix(hour);
  const timeActive = mix.day < 0.999;
  if (!timeActive && settings.weatherFog === 'off' && settings.weatherFilter === 'off') return null;
  const blend = (pick: (time: WeatherTime) => number): number =>
    pick('day') * mix.day + pick('dusk') * mix.dusk + pick('night') * mix.night;
  const light: Rgb = [
    blend((t) => LIGHT[t][0]),
    blend((t) => LIGHT[t][1]),
    blend((t) => LIGHT[t][2]),
  ];
  const fog = FOG[settings.weatherFog];
  const filter = FILTER[settings.weatherFilter];
  // Nachts ist auch der Nebel dunkler — aber nicht so dunkel wie der Rest,
  // sonst verschwände er; er fängt das Licht der Laternen.
  const fogLight = blend((t) => (t === 'day' ? 1 : t === 'dusk' ? 0.75 : 0.42));
  return {
    light,
    keepBright: blend((t) => (t === 'day' ? 0 : 0.85)),
    fogColor: [fog.color[0] * fogLight, fog.color[1] * fogLight, fog.color[2] * fogLight],
    fogStrength: fog.strength,
    fogSwirl: fog.swirl,
    // Die Sichtweite setzt, wo der Nebel voll ist; der klare Kreis um die Figur
    // geht im selben Verhältnis mit.
    fogClear: fog.clear * (clampFogRange(settings.fogRange) / fog.full),
    fogFull: clampFogRange(settings.fogRange),
    fogHeight: fog.height,
    fogBase: fog.base,
    fogOpaque: fog.opaque,
    saturation: filter.saturation,
    contrast: filter.contrast,
    tint: filter.tint,
    vignette: filter.vignette,
  };
}
