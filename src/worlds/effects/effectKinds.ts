/**
 * **Was der rote Knopf auslöst** — die Effekte des Effektlabors und ihre eine
 * Stellschraube, die Größe.
 *
 * Ein Effekt ist hier nichts als ein Satz Zahlen: wie viele Partikel, wie
 * schnell, wie lange, in welche Richtung, in welcher Farbe. Gezeichnet wird
 * daraus in `Burst.ts`, geflogen in `effectBurst.ts` — beides ohne eigene
 * Meinung. Wer einen Effekt dazutut, schreibt hier eine Zeile und nirgends
 * sonst; das Menü im Raum baut sich aus dieser Liste.
 *
 * Die Zahlen stehen in den Einheiten, in denen man sie auch diskutiert: Meter,
 * Sekunden, Meter je Sekunde. Ein „Faktor 0,7" wäre kürzer und in einem halben
 * Jahr nicht mehr zu lesen.
 */

/** Ein Effekt, wie ihn der Knopf auslöst. */
export interface EffectKind {
  id: string;
  label: string;
  /** Die Zeile darunter im Menü — was man sieht, nicht wie es gerechnet wird. */
  sub: string;
  /** Farbe der Menüzeile. */
  accent: number;
  /** Die beiden Enden des Farbverlaufs; jedes Partikel liegt dazwischen. */
  from: number;
  to: number;
  /** Wie viele Partikel bei Größe 1×. */
  count: number;
  /** Wie lange eines lebt, in Sekunden. */
  life: number;
  /** Womit es losfliegt, in m/s. */
  speed: number;
  /** 0 = enge Säule nach oben, 1 = Kugel in alle Richtungen. */
  spread: number;
  /** Auftrieb in m/s² — Rauch und Feuer steigen. */
  rise: number;
  /** Schwerkraft in m/s² — Funken und Wasser fallen. */
  fall: number;
  /** Luftwiderstand, 1/s: wie schnell der Schwung verlorengeht. */
  drag: number;
  /** Wie groß ein Partikel ist, in Metern, bei Größe 1×. */
  size: number;
  /** Additiv gemischt: Feuer leuchtet, Rauch verdeckt. */
  glow: boolean;
  /** Ein Lichtblitz am Ursprung, in Watt-artigen Einheiten; 0 = keiner. */
  flash: number;
}

/**
 * Die Effekte, in der Reihenfolge, in der das Menü sie zeigt. Der erste ist
 * der, mit dem der Raum aufmacht.
 */
export const EFFECTS: readonly EffectKind[] = [
  {
    id: 'smoke',
    label: 'Rauch',
    sub: 'Graue Schwaden, steigen und stehen dann',
    accent: 0x9aa3b2,
    from: 0xb9c1cf,
    to: 0x2c3340,
    count: 220,
    life: 3.4,
    speed: 1.3,
    spread: 0.5,
    rise: 1.1,
    fall: 0,
    drag: 0.9,
    size: 0.17,
    glow: false,
    flash: 0,
  },
  {
    id: 'fire',
    label: 'Feuer',
    sub: 'Flammensäule, hell und kurz',
    accent: 0xff8a2f,
    from: 0xffe08a,
    to: 0xff3b12,
    count: 260,
    life: 1.5,
    speed: 2.4,
    spread: 0.34,
    rise: 3.6,
    fall: 0,
    drag: 1.6,
    size: 0.13,
    glow: true,
    flash: 6,
  },
  {
    id: 'sparks',
    label: 'Funken',
    sub: 'Kleine Punkte, schnell weg und dann zu Boden',
    accent: 0xffc857,
    from: 0xfff3c0,
    to: 0xff8a2f,
    count: 180,
    life: 1.2,
    speed: 6.5,
    spread: 1,
    rise: 0,
    fall: 9.81,
    drag: 0.4,
    size: 0.035,
    glow: true,
    flash: 3,
  },
  {
    id: 'blast',
    label: 'Explosion',
    sub: 'Kugel aus Glut, ein Blitz und weg',
    accent: 0xff3b2f,
    from: 0xfff3c4,
    to: 0xff4a1e,
    count: 420,
    life: 1.1,
    speed: 11,
    spread: 1,
    rise: 1.4,
    fall: 3,
    drag: 2.2,
    size: 0.2,
    glow: true,
    flash: 14,
  },
  {
    id: 'dust',
    label: 'Staub',
    sub: 'Braune Wolke, die sich am Boden legt',
    accent: 0xcbb99a,
    from: 0xd8c8a8,
    to: 0x6d6047,
    count: 260,
    life: 2.8,
    speed: 3.2,
    spread: 0.9,
    rise: 0.2,
    fall: 1.2,
    drag: 1.9,
    size: 0.19,
    glow: false,
    flash: 0,
  },
  {
    id: 'magic',
    label: 'Zauber',
    sub: 'Leuchtende Flusen, die langsam davonschweben',
    accent: 0x9d7bff,
    from: 0xc9b3ff,
    to: 0x5ee0a0,
    count: 200,
    life: 2.6,
    speed: 2,
    spread: 1,
    rise: 0.9,
    fall: 0,
    drag: 0.7,
    size: 0.06,
    glow: true,
    flash: 4,
  },
  {
    id: 'water',
    label: 'Wasser',
    sub: 'Fontäne nach oben, fällt zurück',
    accent: 0x4aa8ff,
    from: 0xd6f2ff,
    to: 0x2f8fff,
    count: 300,
    life: 2.2,
    speed: 7,
    spread: 0.22,
    rise: 0,
    fall: 9.81,
    drag: 0.1,
    size: 0.045,
    glow: false,
    flash: 0,
  },
];

export const DEFAULT_EFFECT = EFFECTS[0]!.id;

/** Die Grenzen des Schiebers, und das Raster, auf dem er einrastet. */
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 4;
export const SCALE_GRID = 0.05;
/** Die Rasten, die das Handgelenk-Menü durchschaltet. */
export const SCALE_STEPS: readonly number[] = [0.25, 0.5, 1, 1.5, 2, 3, 4];
export const DEFAULT_SCALE = 1;

/**
 * Wie viele Partikel höchstens in einer Wolke stecken.
 *
 * Die Grenze ist kein Geschmack, sondern die Bildrate: ein Punktehaufen wird
 * in *einem* Zug gezeichnet, aber jedes Partikel wird in JavaScript bewegt,
 * und irgendwo dazwischen liegt die Grenze, ab der ein Headset ruckelt.
 */
export const MAX_PARTICLES = 1400;

/** Der Effekt zu einer Id — Unbekanntes wird zum ersten statt zu `undefined`. */
export function findEffect(id: string): EffectKind {
  return EFFECTS.find((effect) => effect.id === id) ?? EFFECTS[0]!;
}

/** Der nächste in der Liste, rundherum. */
export function nextEffect(id: string): EffectKind {
  const index = EFFECTS.findIndex((effect) => effect.id === id);
  return EFFECTS[(index + 1) % EFFECTS.length]!;
}

/** Die nächste Raste der Größe, rundherum — für die Zeile im Handgelenk-Menü. */
export function nextScale(scale: number): number {
  const index = SCALE_STEPS.findIndex((step) => step > scale + 1e-6);
  return SCALE_STEPS[index === -1 ? 0 : index]!;
}

/** In die Grenzen und auf das Raster; auch mit Unsinn im Eingang. */
export function clampScale(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SCALE;
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));
  // Über zwei Nachkommastellen gerundet, damit aus 30 · 0,05 wieder 1,5 wird
  // und nicht 1,5000000000000002: an dieser Zahl wird verglichen.
  return Number((Math.round(clamped / SCALE_GRID) * SCALE_GRID).toFixed(2));
}

/** Wie die Größe im Menü und am Schieber steht: `1,5×`. */
export function scaleLabel(scale: number): string {
  // Zwei Stellen, dann die Nullen hinten weg — `1,00×` liest sich wie eine
  // Messung, `1×` wie eine Einstellung.
  const text = scale.toFixed(2).replace(/\.?0+$/, '');
  return `${text.replace('.', ',')}×`;
}

/**
 * Derselbe Effekt, nur größer oder kleiner.
 *
 * Was mitwächst, ist das, was man **sieht**: mehr Partikel, dickere Partikel,
 * mehr Schwung, ein längeres Leben und ein hellerer Blitz. Was *nicht*
 * mitwächst, ist die Physik dahinter — Auftrieb, Schwerkraft und
 * Luftwiderstand bleiben, wie sie sind. Eine doppelt so große Explosion fällt
 * nicht doppelt so schnell; sie ist doppelt so groß.
 *
 * Die Zahl der Partikel wächst dabei nur bis `MAX_PARTICLES`. Lieber eine
 * Wolke, die bei 4× etwas dünner ist, als eine, die das Headset anhält.
 */
export function scaleEffect(kind: EffectKind, scale: number): EffectKind {
  const factor = clampScale(scale);
  return {
    ...kind,
    count: Math.min(MAX_PARTICLES, Math.max(8, Math.round(kind.count * factor))),
    size: kind.size * factor,
    speed: kind.speed * factor,
    life: kind.life * Math.sqrt(factor),
    flash: kind.flash * factor,
  };
}
