/**
 * **Womit gemalt wird**: wie breit der Strich ist, was für ein Pinsel ihn
 * zieht — und die Farben, die sich jemand selbst zusammengemischt hat.
 *
 * Der Pinsel konnte genau einen Strich: rund, undurchsichtig, zwei Zentimeter
 * breit, im Code festgenagelt. Auf eine Kiste gestrichen fällt das nicht auf;
 * seit es eine **Leinwand** gibt (die Staffelei), ist es die halbe Arbeit —
 * ein Bild aus lauter gleich dicken Würsten ist kein Bild. Also drei Größen,
 * die man in der Brille umstellt, ohne die Hand vom Pinsel zu nehmen:
 *
 * - **Breite** — in Millimetern auf der Leinwand, nicht als Anteil des
 *   Blattes. Eine Zahl, die man liest wie am Pinselkasten, und eine, die auf
 *   einer kleineren Leinwand nicht plötzlich etwas anderes bedeutet.
 * - **Art** — rund, flach, Filzstift, Sprühdose. Sie unterscheiden sich in
 *   dem, was man sieht: die Form des Abdrucks und wie viel Farbe er trägt
 *   (`stampOf`, `alphaOf`).
 * - **Farbe** — die zwölf festen Töne der Palette *und* eine selbst gemischte
 *   aus drei Reglern, die man sich in die eigene Reihe legen kann.
 *
 * Reine Daten und Rechnung, kein three.js: was ein Abdruck auf der Leinwand
 * wird, steht in `PaintBoard.ts`, und der Test hier prüft die Zahlen davor.
 */

/** Was für ein Pinsel — die Id geht in den Speicher und bleibt, wie sie ist. */
export type BrushKind = 'round' | 'flat' | 'marker' | 'spray';

export const BRUSH_KINDS: readonly BrushKind[] = ['round', 'flat', 'marker', 'spray'];

export const BRUSH_KIND_LABELS: Record<BrushKind, string> = {
  round: 'Rund',
  flat: 'Flach',
  marker: 'Filzstift',
  spray: 'Sprühdose',
};

export const BRUSH_KIND_SUBS: Record<BrushKind, string> = {
  round: 'Weiche Spitze, voller Ton',
  flat: 'Breit quer, schmal längs',
  marker: 'Harte Kante, deckt sofort',
  spray: 'Streut, wird beim Bleiben dichter',
};

/**
 * Die Form eines Abdrucks.
 *
 * - `round` — ein Kreis vom Durchmesser der Breite; die Linie dazwischen hat
 *   runde Kappen.
 * - `chisel` — ein liegendes Rechteck: so breit wie eingestellt, ein Drittel
 *   so hoch. Genau das macht einen Flachpinsel aus — quer gezogen ein Band,
 *   längs gezogen ein Strich.
 * - `spray` — gestreute Punkte in einem Kreis vom Durchmesser der Breite.
 */
export type BrushStamp = 'round' | 'chisel' | 'spray';

export interface BrushSettings {
  kind: BrushKind;
  /** Strichbreite auf der Leinwand, in **Millimetern**. */
  width: number;
  /** Die Farbe, die gerade geladen ist. */
  color: number;
  /** Selbst gemischte Farben, die zuletzt gespeicherte zuerst. */
  swatches: number[];
}

/**
 * Wie ausgeliefert: rund und zwei Zentimeter breit — genau der Strich, den der
 * Pinsel vorher als einzigen konnte, damit ein altes Bild nicht plötzlich
 * anders aussieht. Die Farbe ist das Blau der Palette.
 */
export const DEFAULT_BRUSH: BrushSettings = {
  kind: 'round',
  width: 20,
  color: 0x2f8fff,
  swatches: [],
};

/** Die Rasten des Breitenreglers, in Millimetern. */
export const WIDTH_STEPS = [2, 5, 10, 20, 32, 48] as const;

export const MIN_WIDTH = 1;
/** Breiter als eine Handfläche wird kein Pinsel — dafür gibt es die Rolle. */
export const MAX_WIDTH = 80;

/** Wie viele selbst gemischte Farben die eigene Reihe fasst. */
export const MAX_SWATCHES = 6;

export function clampWidth(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_BRUSH.width;
  return Math.round(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, number)));
}

/** Eine Farbe als 24-Bit-Zahl — alles andere wird zur Vorgabe. */
export function clampColor(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return DEFAULT_BRUSH.color;
  return Math.round(Math.min(0xffffff, Math.max(0, number)));
}

export function clampSwatches(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const out: number[] = [];
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) continue;
    const color = clampColor(entry);
    if (!out.includes(color)) out.push(color);
    if (out.length >= MAX_SWATCHES) break;
  }
  return out;
}

export function clampBrush(settings: Partial<BrushSettings> | undefined): BrushSettings {
  const next = { ...DEFAULT_BRUSH, ...settings };
  return {
    kind: BRUSH_KINDS.includes(next.kind) ? next.kind : DEFAULT_BRUSH.kind,
    width: clampWidth(next.width),
    color: clampColor(next.color),
    swatches: clampSwatches(next.swatches),
  };
}

/** Die nächste Art in der Runde. */
export function nextBrushKind(kind: BrushKind): BrushKind {
  const at = BRUSH_KINDS.indexOf(kind);
  return BRUSH_KINDS[(at + 1) % BRUSH_KINDS.length]!;
}

/** Die nächste Raste über der Breite, oben wieder von vorn. */
export function nextWidth(value: number): number {
  return WIDTH_STEPS.find((step) => step > value + 1e-9) ?? WIDTH_STEPS[0];
}

/** Wo eine Breite auf dem Regler liegt, von 0 bis 1 — und der Weg zurück. */
export function widthFraction(width: number): number {
  return (clampWidth(width) - MIN_WIDTH) / (MAX_WIDTH - MIN_WIDTH);
}

export function widthFromFraction(fraction: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return clampWidth(MIN_WIDTH + clamped * (MAX_WIDTH - MIN_WIDTH));
}

export function widthLabel(width: number): string {
  return `${clampWidth(width)} mm`;
}

/** Die Form, die diese Art auf die Leinwand stempelt. */
export function stampOf(kind: BrushKind): BrushStamp {
  switch (kind) {
    case 'flat':
      return 'chisel';
    case 'spray':
      return 'spray';
    default:
      return 'round';
  }
}

/**
 * Wie viel Farbe ein Abdruck trägt.
 *
 * Der Filzstift deckt sofort, der runde Pinsel auch; die Sprühdose legt eine
 * dünne Schicht, und erst das Bleiben macht sie dicht. Ein Wert unter eins ist
 * damit kein Kunstgriff, sondern der ganze Unterschied.
 */
export function alphaOf(kind: BrushKind): number {
  return kind === 'spray' ? 0.16 : 1;
}

/**
 * Wie viele Punkte ein Sprühstoß streut — mehr, je breiter der Kegel ist.
 *
 * Eine feste Zahl sähe bei zwei Millimetern wie ein Fleck aus und bei acht
 * Zentimetern wie Nieselregen.
 */
export function sprayDots(width: number): number {
  return Math.max(4, Math.round(clampWidth(width) * 0.9));
}

/**
 * Die **Höhe** des Abdrucks im Verhältnis zu seiner Breite.
 *
 * Nur der Flachpinsel ist hier nicht rund: sein Abdruck ist ein Drittel so
 * hoch wie breit, und daraus entsteht der Unterschied zwischen einem quer
 * gezogenen Band und einem längs gezogenen Strich.
 */
export const CHISEL_RATIO = 1 / 3;

/**
 * Wo entlang einer Strecke gestempelt wird.
 *
 * Ein Strich ist eine Linie und kein Punkt — für den runden Pinsel zieht die
 * Leinwand diese Linie selbst. Der Flachpinsel und die Sprühdose können das
 * nicht: ihr Abdruck ist keine Kappe, die eine Linie mitbringt. Sie stempeln
 * ihn stattdessen dicht an dicht die Strecke entlang, und *wie dicht* steht
 * hier: ein Abstand von einem Drittel der Breite lässt keine Lücke und malt
 * bei einer schnellen Handbewegung trotzdem nicht tausend Abdrücke.
 *
 * Gibt die Anzahl der Zwischenschritte zurück — mindestens einer, denn auch
 * ein Punkt ohne Weg ist ein Abdruck.
 */
export function stampCount(distance: number, width: number): number {
  const spacing = Math.max(1e-6, width / 3);
  return Math.max(1, Math.ceil(distance / spacing));
}

// --- die selbst gemischte Farbe ---------------------------------------------

/** Rot, Grün, Blau — je 0 bis 255, wie an den drei Reglern. */
export interface Channels {
  r: number;
  g: number;
  b: number;
}

export const CHANNELS = ['r', 'g', 'b'] as const;

export const CHANNEL_LABELS: Record<(typeof CHANNELS)[number], string> = {
  r: 'Rot',
  g: 'Grün',
  b: 'Blau',
};

export function channelsOf(color: number): Channels {
  const value = clampColor(color);
  return { r: (value >> 16) & 0xff, g: (value >> 8) & 0xff, b: value & 0xff };
}

export function colorOfChannels(channels: Channels): number {
  const byte = (value: number): number =>
    Math.round(Math.min(255, Math.max(0, Number.isFinite(value) ? value : 0)));
  return (byte(channels.r) << 16) | (byte(channels.g) << 8) | byte(channels.b);
}

/**
 * Dieselbe Farbe mit einem anderen Kanal — der Regler liefert 0 bis 1.
 */
export function withChannel(
  color: number,
  channel: (typeof CHANNELS)[number],
  fraction: number,
): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));
  return colorOfChannels({ ...channelsOf(color), [channel]: Math.round(clamped * 255) });
}

/**
 * Die eigene Reihe mit dieser Farbe darin — vorn, ohne Doppelte, und die
 * älteste fällt hinten heraus.
 *
 * Vorn, weil man die zuletzt gemischte Farbe als nächstes wieder braucht; ohne
 * Doppelte, weil sechs Plätze schnell voll sind, wenn zweimal Speichern zwei
 * davon kostet.
 */
export function withSwatch(swatches: readonly number[], color: number): number[] {
  const value = clampColor(color);
  return [value, ...swatches.filter((entry) => entry !== value)].slice(0, MAX_SWATCHES);
}

/** Und wieder heraus — für den Platz, den man doch anders belegen will. */
export function withoutSwatch(swatches: readonly number[], color: number): number[] {
  const value = clampColor(color);
  return swatches.filter((entry) => entry !== value);
}
