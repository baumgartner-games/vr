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
};

/** **Spukstadt** — die Abkürzung zum Bild aus dem Wunsch: Nacht, lila Nebel, lila Filter. */
export const SPOOKY_TOWN: WeatherSettings = {
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

export function weatherActive(settings: WeatherSettings): boolean {
  return (
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

const FOG: Readonly<Record<WeatherFog, { color: Rgb; strength: number; swirl: number }>> = {
  off: { color: [0, 0, 0], strength: 0, swirl: 0 },
  haze: { color: [0.62, 0.64, 0.68], strength: 0.3, swirl: 0.4 },
  dense: { color: [0.55, 0.57, 0.62], strength: 0.6, swirl: 0.7 },
  spooky: { color: [0.46, 0.27, 0.78], strength: 0.62, swirl: 1 },
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
export function weatherLook(settings: WeatherSettings, presenting: boolean): WeatherLook | null {
  if (presenting || !weatherActive(settings)) return null;
  const light = LIGHT[settings.weatherTime];
  const fog = FOG[settings.weatherFog];
  const filter = FILTER[settings.weatherFilter];
  // Nachts ist auch der Nebel dunkler — aber nicht so dunkel wie der Rest,
  // sonst verschwände er; er fängt das Licht der Laternen.
  const fogLight =
    settings.weatherTime === 'day' ? 1 : settings.weatherTime === 'dusk' ? 0.75 : 0.42;
  return {
    light,
    keepBright: settings.weatherTime === 'day' ? 0 : 0.85,
    fogColor: [fog.color[0] * fogLight, fog.color[1] * fogLight, fog.color[2] * fogLight],
    fogStrength: fog.strength,
    fogSwirl: fog.swirl,
    saturation: filter.saturation,
    contrast: filter.contrast,
    tint: filter.tint,
    vignette: filter.vignette,
  };
}

/** Bis wohin um die Figur herum kein Nebel liegt, und ab wo er voll ist (m). */
export const WEATHER_CLEAR_RADIUS = 5;
export const WEATHER_FULL_RADIUS = 20;
/** Wie hoch über dem eigenen Boden der Nebel dicht liegt (m) — darüber dünnt er aus. */
export const WEATHER_FOG_HEIGHT = 1.6;
