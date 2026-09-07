import { nextInSteps } from '../../core/steps';

/**
 * **Wie ein Schild aussieht** — Größe, Farben, Markdown, Rollen.
 *
 * Reine Daten, Rasten und Beschriftungen, kein three.js: dieselbe Bauart wie
 * die Werte der Stoppuhr oder der Drohne, und aus demselben Grund. Ein Menü,
 * das eine Zahl weiterschaltet, und ein Schild, das sie zeichnet, sind zwei
 * verschiedene Dinge; was dazwischen liegt, ist prüfbar, ohne dass jemand die
 * Brille aufsetzt.
 *
 * Zwei Entscheidungen stehen hier drin und sind es wert, aufgeschrieben zu
 * werden:
 *
 * - **Die Schriftgröße ist eine Länge, keine Pixelzahl.** Sie steht in
 *   Zentimetern *auf dem Schild*, und die Leinwand rechnet sie in ihre Pixel
 *   um (`fontPixels`). Nur so heißt „4 cm" auf dem kleinen Schild dasselbe wie
 *   auf dem großen — und nur so kann man sie in der Brille überhaupt
 *   einschätzen: Man sieht ja die Tafel und nicht die Textur.
 * - **Die Farben sind eine Liste und keine freie Wahl.** Wer im Headset einen
 *   Farbkreis bedienen soll, tippt am Ende Zahlen; sieben Hintergründe und
 *   sechs Schriftfarben, die zueinander passen, sind schneller und sehen
 *   besser aus.
 */

export interface SignPalette {
  id: string;
  label: string;
  value: number;
}

/** Hintergründe: dunkel zuerst, weil ein Schild meistens in einem Raum steht. */
export const SIGN_BACKGROUNDS: readonly SignPalette[] = [
  { id: 'night', label: 'Nachtblau', value: 0x0d1524 },
  { id: 'slate', label: 'Schiefer', value: 0x232a36 },
  { id: 'black', label: 'Schwarz', value: 0x07080b },
  { id: 'paper', label: 'Papier', value: 0xf3efe4 },
  { id: 'white', label: 'Weiß', value: 0xffffff },
  { id: 'forest', label: 'Tannengrün', value: 0x123326 },
  { id: 'wine', label: 'Bordeaux', value: 0x2e1119 },
];

export const SIGN_COLORS: readonly SignPalette[] = [
  { id: 'white', label: 'Weiß', value: 0xf2f6ff },
  { id: 'amber', label: 'Bernstein', value: 0xffc857 },
  { id: 'sky', label: 'Himmelblau', value: 0x8fd0ff },
  { id: 'mint', label: 'Minze', value: 0x5ee0a0 },
  { id: 'ink', label: 'Tinte', value: 0x14181f },
  { id: 'red', label: 'Signalrot', value: 0xff5a4a },
];

/** Die Rasten der Schriftgröße, in Zentimetern der Zeilenhöhe auf dem Schild. */
export const FONT_STEPS = [1.5, 2, 3, 4, 5, 6, 8, 12] as const;
export const MIN_FONT_CM = FONT_STEPS[0];
export const MAX_FONT_CM = FONT_STEPS[FONT_STEPS.length - 1];

/** Wie schnell von selbst gerollt wird, in Zentimetern pro Sekunde. */
export const SCROLL_STEPS = [0, 2, 4, 8, 16] as const;
export const MAX_SCROLL_SPEED = SCROLL_STEPS[SCROLL_STEPS.length - 1];

/** Die Breiten und Höhen, in denen es Schilder gibt — in Metern. */
export const WIDTH_STEPS = [0.5, 0.8, 1.2, 1.6, 2.4] as const;
export const HEIGHT_STEPS = [0.4, 0.6, 0.9, 1.2, 1.8] as const;

export interface SignSettings {
  /** Zeilenhöhe in Zentimetern auf dem Schild. */
  fontCm: number;
  /** Markdown deuten — oder jede Zeile so stehen lassen, wie sie getippt wurde. */
  markdown: boolean;
  align: 'left' | 'center';
  color: number;
  background: number;
  /** Zentimeter pro Sekunde, mit denen der Text von selbst hochläuft. 0 = aus. */
  autoScroll: number;
  /** Ob der Daumenstick am Schild rollen darf. */
  manualScroll: boolean;
  /** Maße der Tafel in Metern. */
  width: number;
  height: number;
}

export const DEFAULT_SIGN: SignSettings = {
  fontCm: 4,
  markdown: true,
  align: 'left',
  color: SIGN_COLORS[0]!.value,
  background: SIGN_BACKGROUNDS[0]!.value,
  autoScroll: 0,
  manualScroll: true,
  width: 1.2,
  height: 0.9,
};

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clampColor(value: unknown, fallback: number): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(0xffffff, Math.max(0, Math.round(number)));
}

/**
 * Bringt alles in die Grenzen — auch das, was von einem anderen Spieler
 * hereinkommt (`signShare.ts`) oder aus einem alten Speicher stammt, der diese
 * Felder noch gar nicht kannte.
 */
export function clampSign(settings: Partial<SignSettings> | undefined): SignSettings {
  const next = { ...DEFAULT_SIGN, ...settings };
  return {
    fontCm:
      Math.round(clampNumber(next.fontCm, MIN_FONT_CM, MAX_FONT_CM, DEFAULT_SIGN.fontCm) * 10) / 10,
    markdown: next.markdown !== false,
    align: next.align === 'center' ? 'center' : 'left',
    color: clampColor(next.color, DEFAULT_SIGN.color),
    background: clampColor(next.background, DEFAULT_SIGN.background),
    autoScroll: Math.round(clampNumber(next.autoScroll, 0, MAX_SCROLL_SPEED, 0) * 10) / 10,
    manualScroll: next.manualScroll !== false,
    width: clampNumber(
      next.width,
      WIDTH_STEPS[0],
      WIDTH_STEPS[WIDTH_STEPS.length - 1],
      DEFAULT_SIGN.width,
    ),
    height: clampNumber(
      next.height,
      HEIGHT_STEPS[0],
      HEIGHT_STEPS[HEIGHT_STEPS.length - 1],
      DEFAULT_SIGN.height,
    ),
  };
}

/** Die nächste Raste über dem Wert, oben wieder von vorn. */
export function nextStep(steps: readonly number[], value: number): number {
  return nextInSteps(steps, value);
}

/** Die nächste Farbe der Liste; eine unbekannte fängt vorn an. */
export function nextPalette(palette: readonly SignPalette[], value: number): number {
  const at = palette.findIndex((entry) => entry.value === value);
  return palette[(at + 1) % palette.length]!.value;
}

export function paletteLabel(palette: readonly SignPalette[], value: number): string {
  return palette.find((entry) => entry.value === value)?.label ?? `#${hex(value)}`;
}

export function hex(value: number): string {
  return Math.max(0, Math.round(value)).toString(16).padStart(6, '0');
}

/** `#rrggbb`, so wie eine Leinwand es haben will. */
export function cssColor(value: number): string {
  return `#${hex(value)}`;
}

/**
 * Die Schriftgröße in **Pixeln der Leinwand**.
 *
 * Die Umrechnung ist der ganze Grund, warum die Größe in Zentimetern steht:
 * Die Leinwand ist immer gleich breit (in Pixeln), das Schild nicht (in
 * Metern). Ein Schild doppelter Breite zeigt bei derselben Zahl also dieselbe
 * Schriftgröße — nur eben doppelt so viel Text daneben.
 */
export function fontPixels(settings: SignSettings, canvasWidth: number): number {
  const perMetre = canvasWidth / Math.max(0.05, settings.width);
  return Math.max(6, (settings.fontCm / 100) * perMetre);
}

/** Zentimeter pro Sekunde in Leinwandpixel pro Sekunde. */
export function scrollPixels(settings: SignSettings, canvasWidth: number): number {
  const perMetre = canvasWidth / Math.max(0.05, settings.width);
  return (settings.autoScroll / 100) * perMetre;
}

export function fontLabel(fontCm: number): string {
  return `${fontCm.toString().replace('.', ',')} cm`;
}

export function scrollLabel(speed: number): string {
  if (speed <= 0) return 'aus';
  return `${speed.toString().replace('.', ',')} cm/s`;
}

export function sizeLabel(settings: SignSettings): string {
  return `${settings.width.toFixed(1).replace('.', ',')} × ${settings.height
    .toFixed(1)
    .replace('.', ',')} m`;
}

export function alignLabel(align: SignSettings['align']): string {
  return align === 'center' ? 'mittig' : 'linksbündig';
}
