/**
 * **Die Tapeten** — was man auf eine Seite einer Wand bringt.
 *
 * Gewünscht (September 2026): _„beim Tapete wählen will ich wie in Plate up es
 * so handhaben, dass ich die Wand hinsetze und stelle, und es beim Wand Ordner
 * aber Tapeten Items gibt, die ich z.B. als Spieler in der Hand halten kann."_
 * Und davor: _„per default eine Wand innen und außen zu haben, aber dass man
 * bei einem Haus z.B. außen Backstein Mauern tapezieren kann und innen eine
 * andere Tapete."_
 *
 * **Die Ausnahme von der Regel „nur Modelle aus dem Regal"** ist ausdrücklich
 * so gewünscht: Das Regal hat keine Backsteinfläche und keine Tapete, nur zwei
 * Fliesenplatten. Eine Tapete ist deshalb keine Geometrie, sondern ein
 * **Muster**, gerechnet aus ein paar Zahlen (`wallpaperPixels`), und die Wand
 * bleibt das Modell aus dem Regal. Gezeichnet wird es nur auf der einen Seite
 * (`wallpaperSkin.ts`); Türen und Fenster behalten ihre Öffnung, weil das
 * Muster auf dem Modell liegt und nicht davor.
 *
 * Gespeichert wird von einer Tapete nur ihre Id — keine Farbe. Was „Backstein"
 * ist, steht hier, und in jeder Welt ist es dasselbe.
 */

/** Eine Tapete: Id, Name im Katalog, und ein Farbfeld für die Kachel. */
export interface Wallpaper {
  readonly id: string;
  readonly label: string;
  readonly swatch: string;
  /** Wie viele Meter das Muster breit und hoch ist, bevor es sich wiederholt. */
  readonly repeat: number;
}

/** Die Tapeten, in der Reihenfolge des Katalogs. */
export const WALLPAPERS: readonly Wallpaper[] = [
  { id: 'brick', label: 'Backstein', swatch: '#a4513a', repeat: 1 },
  { id: 'plaster', label: 'Putz weiß', swatch: '#ece8df', repeat: 1 },
  { id: 'beige', label: 'Tapete beige', swatch: '#d8c6a3', repeat: 0.5 },
  { id: 'stripes', label: 'Tapete grün gestreift', swatch: '#6f9a74', repeat: 0.5 },
  { id: 'wood', label: 'Holzvertäfelung', swatch: '#8a5a36', repeat: 1 },
  { id: 'tiles', label: 'Fliesen blau', swatch: '#8fb4d6', repeat: 0.5 },
];

export function wallpaperById(id: string): Wallpaper | null {
  return WALLPAPERS.find((one) => one.id === id) ?? null;
}

/** Wie viele Bildpunkte ein Muster je Seite hat. */
export const WALLPAPER_SIZE = 64;

type Rgb = readonly [number, number, number];

function hex(value: string): Rgb {
  const n = Number.parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Ein kleines Rauschen, immer gleich für dieselbe Stelle — damit Flächen leben. */
function grain(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

function shade(color: Rgb, amount: number): Rgb {
  return [
    Math.max(0, Math.min(255, color[0] * (1 + amount))),
    Math.max(0, Math.min(255, color[1] * (1 + amount))),
    Math.max(0, Math.min(255, color[2] * (1 + amount))),
  ];
}

/**
 * **Die Farbe einer Tapete an einer Stelle** — `u` und `v` in `[0, 1)` über
 * eine Wiederholung, `v` von unten nach oben.
 */
export function wallpaperColor(id: string, u: number, v: number): Rgb {
  const n = grain(u * WALLPAPER_SIZE, v * WALLPAPER_SIZE);
  switch (id) {
    case 'brick': {
      // Vier Reihen je Wiederholung, jede zweite um einen halben Stein versetzt.
      const row = Math.floor(v * 4);
      const along = (u * 2 + (row % 2 ? 0.5 : 0)) % 1;
      const mortar = (v * 4) % 1 < 0.1 || along < 0.05;
      if (mortar) return shade(hex('#cfc6b8'), n * 0.1);
      const tone = ((row * 7 + Math.floor(u * 2 + (row % 2 ? 0.5 : 0)) * 3) % 5) / 5;
      return shade(hex('#a4513a'), (tone - 0.5) * 0.25 + n * 0.12);
    }
    case 'plaster':
      return shade(hex('#ece8df'), n * 0.06);
    case 'beige': {
      // Ein zartes Rautenmuster.
      const d = Math.abs((((u + v) * 2) % 1) - 0.5) + Math.abs((((u - v + 1) * 2) % 1) - 0.5);
      return shade(hex('#d8c6a3'), d < 0.12 ? -0.08 : n * 0.03);
    }
    case 'stripes': {
      const band = Math.floor(u * 4) % 2 === 0;
      return shade(hex(band ? '#6f9a74' : '#e3e6d6'), n * 0.04);
    }
    case 'wood': {
      // Senkrechte Bretter mit Fuge und Maserung.
      const board = u * 4;
      const seam = board % 1 < 0.06;
      if (seam) return hex('#4a2e1c');
      const grainLine = Math.sin(v * 40 + Math.floor(board) * 3 + Math.sin(u * 30) * 1.5);
      return shade(hex('#8a5a36'), grainLine * 0.08 + n * 0.05 + (Math.floor(board) % 2) * 0.06);
    }
    case 'tiles': {
      const joint = (u * 2) % 1 < 0.05 || (v * 2) % 1 < 0.05;
      return joint ? hex('#f2f2ee') : shade(hex('#8fb4d6'), n * 0.05);
    }
    default:
      return [255, 0, 255];
  }
}

/** Das Muster als Bildpunkte, RGBA, Zeile für Zeile von unten nach oben (wie WebGL). */
export function wallpaperPixels(id: string, size = WALLPAPER_SIZE): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [r, g, b] = wallpaperColor(id, (x + 0.5) / size, (y + 0.5) / size);
      const i = (y * size + x) * 4;
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = 255;
    }
  }
  return data;
}

/** **Das Ding in der Hand zu einer Tapete** — `wallpaper-brick` ist `brick`. */
export function wallpaperItem(id: string): string {
  return `wallpaper-${id}`;
}

/** Welche Tapete ein Ding der Küche ist — oder `null`, wenn es keine ist. */
export function wallpaperOfItem(item: string | null | undefined): Wallpaper | null {
  if (!item?.startsWith('wallpaper-')) return null;
  return wallpaperById(item.slice('wallpaper-'.length));
}
