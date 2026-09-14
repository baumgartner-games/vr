import { emptyLevel, inside, layerOf, setTile, tileAt, type LayerData, type Level } from './level';
import type { TileId } from './level';

/**
 * **Womit eine Welt in 2D anfängt** — und zwar **jede Welt mit ihrer eigenen.**
 *
 * Vorher stand hier eine einzige Lichtung, für alle sechzehn Welten dieselbe:
 * dasselbe Gras, derselbe Teich, dasselbe Haus an derselben Stelle. Der Wechsel
 * im Menü funktionierte, nur sah man ihn nicht — Hub, Mond und Dust waren von
 * oben Bild für Bild identisch, und wer die Welt wechselte, hatte allen Grund zu
 * glauben, dass gar nichts passiert ist. Der Weltname oben rechts war der
 * einzige Unterschied.
 *
 * Also ist der Anfangsplan jetzt **aus der Welt gerechnet**, und zwar aus ihrer
 * Kennung allein:
 *
 * - **Ein Anstrich je Welt** (`THEMES`): Wiese, Sand, Stein, Halle, Nacht —
 *   welcher, sagt eine kleine Tabelle. Der Mond bekommt Stein und Felsen, Dust
 *   Sand, die Pizzeria Holz, das Dunkelhaus dunkles Gras.
 * - **Dieselbe Erzählung, andere Stelle**: Teich mit Brücke, Haus mit Dach und
 *   Tür, ein Weg von Süden, ein Wäldchen in einer Ecke, Felsen und Kisten —
 *   alles steht, wo der Zufallsgeber es hinlegt, und der ist aus der Kennung
 *   **gesät** (`mulberry32`). Derselbe Name gibt also immer denselben Plan: Wer
 *   „Plan zurücksetzen" drückt, bekommt seine Welt zurück und nicht eine neue.
 *
 * Das bleibt eine **Vorlage**, kein Kunstwerk: Sie belegt, dass Boden, Dinge und
 * Darüber drei Ebenen sind, dass Wasser aufhält und eine Brücke darüber nicht,
 * dass der Held unter einer Baumkrone verschwindet — und dass zwei Welten zwei
 * Orte sind. Wer etwas anderes will, malt es im Editor darüber, und das bleibt
 * dann (`level.saveLevel`).
 */

/** Was überall gleich ist: Mauer, Tür, Dach, Zaun, Kiste, Brücke, Würfel. */
const WALL = 9;
const DOOR = 15;
const ROOF = 16;
const FENCE = 13;
const CRATE = 14;
const BRIDGE = 18;
const WATER = 6;
const CUBE = 19;

/** Der Anstrich einer Welt: welche Kachel welche Rolle spielt. */
interface Theme {
  /** Der Boden überall. */
  ground: TileId;
  /** Die dunkleren Flecken darin. */
  rough: TileId;
  /** Die eine hellere Fläche — Blumenwiese, Grasinsel, Dielen. */
  bloom: TileId;
  /** Der Weg von Süden zum Haus. */
  path: TileId;
  /** Das Ufer ums Wasser. */
  shore: TileId;
  /** Der Boden im Haus. */
  floor: TileId;
  /** Was groß am Rand steht: Baum oder Fels. */
  tall: TileId;
  /** Was darüber hängt — `0`, wo nichts hängt (Sand, Stein). */
  crown: TileId;
  /** Das Kleinzeug dazwischen: Busch, Fels, Kiste. */
  low: TileId;
}

/**
 * **Der Weg muss sich vom Boden abheben** — sonst ist er keiner. Deshalb steht
 * in der Wüste eine Steinstraße statt eines Sandwegs, und wo der Boden schon
 * gesprenkelt genug ist (Stein, Holz), bleibt `rough` gleich dem Boden: Zwei
 * Kacheln, die sich beißen, sehen von oben nicht nach Abwechslung aus, sondern
 * nach Schachbrett.
 */
const THEMES: Record<string, Theme> = {
  // Gras, dunkle Flecken, eine Blumenwiese: die Lichtung, mit der alles anfing.
  wiese: {
    ground: 1,
    rough: 2,
    bloom: 3,
    path: 4,
    shore: 5,
    floor: 7,
    tall: 10,
    crown: 17,
    low: 11,
  },
  // Sand bis zum Horizont, eine Steinstraße hindurch, Gras nur am Wasser.
  sand: { ground: 5, rough: 4, bloom: 1, path: 7, shore: 1, floor: 8, tall: 12, crown: 0, low: 11 },
  // Graue Platten, eine sandige Spur, Felsen — der Mond und seinesgleichen.
  stein: {
    ground: 7,
    rough: 7,
    bloom: 5,
    path: 5,
    shore: 5,
    floor: 8,
    tall: 12,
    crown: 0,
    low: 12,
  },
  // Dielen mit einer gefliesten Küche, Zaun und Kisten: alles unter einem Dach.
  halle: {
    ground: 8,
    rough: 8,
    bloom: 7,
    path: 7,
    shore: 5,
    floor: 7,
    tall: 13,
    crown: 16,
    low: 14,
  },
  // Dunkles Gras, eine Steinlichtung, Bäume mit Kronen — Dunkelhaus, Haunting.
  nacht: {
    ground: 2,
    rough: 1,
    bloom: 7,
    path: 4,
    shore: 5,
    floor: 7,
    tall: 10,
    crown: 17,
    low: 12,
  },
};

/**
 * Welche Welt welchen Anstrich bekommt. Eine Tabelle und keine Rechnung, weil
 * die Antwort für den Mond „Stein" heißen soll und nicht „was der Zufall sagt";
 * eine Welt, die hier fehlt, bekommt trotzdem einen — gewürfelt aus ihrem
 * Namen, damit ein neuer Eintrag in `worlds/index.ts` nichts erzwingt.
 */
const THEME_OF: Record<string, keyof typeof THEMES> = {
  hub: 'wiese',
  alps: 'wiese',
  interact: 'wiese',
  editor: 'wiese',
  navlab: 'wiese',
  dust: 'sand',
  range: 'sand',
  kart: 'sand',
  moon: 'stein',
  climb: 'stein',
  tune: 'stein',
  effects: 'stein',
  shop: 'halle',
  portal: 'halle',
  dark: 'nacht',
  haunting: 'nacht',
};

const THEME_NAMES = Object.keys(THEMES) as Array<keyof typeof THEMES>;

export function sampleLevel(id: string, name: string): Level {
  const cols = 40;
  const rows = 30;
  const level = emptyLevel(id, name, cols, rows);
  const seed = hashText(id);
  const rand = mulberry32(seed);
  const theme = THEMES[THEME_OF[id] ?? THEME_NAMES[seed % THEME_NAMES.length]!]!;

  const ground = layerOf(level, 'ground')!;
  const objects = layerOf(level, 'objects')!;
  const overlay = layerOf(level, 'overlay')!;
  const put = (layer: LayerData, col: number, row: number, tile: TileId): void => {
    setTile(level, layer, col, row, tile);
  };
  const fill = (
    layer: LayerData,
    c0: number,
    r0: number,
    c1: number,
    r1: number,
    tile: TileId,
  ): void => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(layer, c, r, tile);
  };
  /** Ob auf dieser Zelle schon etwas steht — Dinge oder Wasser. */
  const taken = (col: number, row: number): boolean =>
    !inside(level, col, row) ||
    tileAt(level, objects, col, row) !== 0 ||
    tileAt(level, ground, col, row) === WATER;

  // --- Der Boden: die Grundfarbe der Welt, gesprenkelt -----------------------
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      put(ground, c, r, speckle(c, r, seed) < 0.18 ? theme.rough : theme.ground);
    }
  }
  // Die eine hellere Fläche, irgendwo oben.
  const bloomCol = pick(rand, 2, cols - 10);
  const bloomRow = pick(rand, 2, 8);
  fill(
    ground,
    bloomCol,
    bloomRow,
    bloomCol + pick(rand, 4, 8),
    bloomRow + pick(rand, 3, 5),
    theme.bloom,
  );

  // --- Der Teich, mit Ufer und einer Brücke darüber --------------------------
  // Links, damit rechts Platz für das Haus bleibt — aber nicht jedes Mal an
  // derselben Stelle und nicht jedes Mal gleich groß.
  const pondCol = pick(rand, 4, 8);
  const pondRow = pick(rand, 3, 7);
  const pondW = pick(rand, 6, 9);
  const pondH = pick(rand, 5, 7);
  fill(ground, pondCol - 1, pondRow - 1, pondCol + pondW, pondRow + pondH, theme.shore);
  fill(ground, pondCol, pondRow, pondCol + pondW - 1, pondRow + pondH - 1, WATER);
  // Die Brücke geht über die ganze Breite des Teichs und ein Stück darüber
  // hinaus, damit man sie vom Ufer aus betritt.
  const bridgeCol = pondCol + Math.floor(pondW / 2);
  fill(objects, bridgeCol, pondRow - 1, bridgeCol, pondRow + pondH, BRIDGE);

  // --- Das Haus: Boden, Mauern, Tür nach Süden, Dach darüber -----------------
  const houseCol = pick(rand, 24, 30);
  const houseRow = pick(rand, 9, 15);
  const houseW = pick(rand, 6, 9);
  const houseH = pick(rand, 5, 6);
  const houseRight = Math.min(cols - 3, houseCol + houseW - 1);
  const houseBottom = Math.min(rows - 6, houseRow + houseH - 1);
  fill(ground, houseCol, houseRow, houseRight, houseBottom, theme.floor);
  fill(objects, houseCol, houseRow, houseRight, houseRow, WALL);
  fill(objects, houseCol, houseBottom, houseRight, houseBottom, WALL);
  fill(objects, houseCol, houseRow + 1, houseCol, houseBottom - 1, WALL);
  fill(objects, houseRight, houseRow + 1, houseRight, houseBottom - 1, WALL);
  const doorCol = houseCol + Math.floor((houseRight - houseCol) / 2);
  put(objects, doorCol, houseBottom, DOOR);
  fill(overlay, houseCol, houseRow - 2, houseRight, houseRow + 2, ROOF);

  // --- Der Weg: von Süden herauf, vor die Tür und nach Westen ----------------
  const pathCol = pick(rand, 16, 22);
  const pathRow = houseBottom + pick(rand, 2, 4);
  fill(ground, pathCol, pathRow, pathCol + 1, rows - 1, theme.path);
  fill(ground, pathCol, pathRow, doorCol, pathRow + 1, theme.path);
  fill(ground, doorCol, pathRow, doorCol, houseBottom, theme.path);
  fill(ground, pondCol + pondW, pathRow - 1, pathCol + 1, pathRow, theme.path);
  // Was auf dem Weg stand, steht jetzt nicht mehr darauf.
  for (let r = pathRow; r < rows; r++)
    for (let c = pathCol; c <= pathCol + 1; c++) put(objects, c, r, 0);
  for (let c = pathCol; c <= doorCol; c++) {
    put(objects, c, pathRow, 0);
    put(objects, c, pathRow + 1, 0);
  }

  // --- Der Rand und ein Wäldchen in einer Ecke -------------------------------
  for (let c = 0; c < cols; c += 2) {
    put(objects, c, 0, theme.tall);
    put(objects, c + 1, rows - 1, theme.tall);
  }
  for (let r = 0; r < rows; r += 2) {
    put(objects, 0, r, theme.tall);
    put(objects, cols - 1, r + 1, theme.tall);
  }
  const woodLeft = rand() < 0.5;
  const woodCol = woodLeft ? 2 : cols - 7;
  const woodRow = rows - 8;
  for (let r = woodRow; r < rows - 1; r++) {
    for (let c = woodCol; c < woodCol + 5; c++) {
      if (taken(c, r)) continue;
      if ((c + r) % 2 === 0) put(objects, c, r, theme.tall);
      else if (theme.crown) put(overlay, c, r, theme.crown);
    }
  }

  // --- Felsen, Kisten, ein Zaun — und die Würfel ----------------------------
  scatter(
    rand,
    6,
    (c, r) => {
      if (taken(c, r)) return false;
      put(objects, c, r, theme.low);
      return true;
    },
    cols,
    rows,
  );
  scatter(
    rand,
    4,
    (c, r) => {
      if (taken(c, r)) return false;
      put(objects, c, r, CRATE);
      return true;
    },
    cols,
    rows,
  );
  const fenceCol = pick(rand, 10, cols - 12);
  const fenceRow = pick(rand, 18, rows - 6);
  for (let c = fenceCol; c < fenceCol + 5; c++)
    if (!taken(c, fenceRow)) put(objects, c, fenceRow, FENCE);

  // **Der Companion Cube.** Drei Stück, mitten in der Welt — dasselbe Modell
  // wie in 3D, hier als Bildchen (`tiles.ts`, `modelSprite.ts`). Sie stehen
  // nicht am Rand, sondern dort, wo man vorbeiläuft: Der Würfel ist der Beleg,
  // dass ein 3D-Modell in dieser Welt ankommt.
  scatter(
    rand,
    3,
    (c, r) => {
      if (taken(c, r)) return false;
      put(objects, c, r, CUBE);
      return true;
    },
    cols,
    rows,
    { c0: pathCol - 6, r0: pathRow - 4, c1: pathCol + 8, r1: rows - 4 },
  );

  // --- Wo der Held anfängt: auf dem Weg, unten, und wirklich frei -----------
  const spawnRow = rows - 4;
  level.spawn = { col: pathCol, row: spawnRow };
  for (let r = spawnRow - 1; r <= spawnRow + 1; r++) {
    for (let c = pathCol - 1; c <= pathCol + 2; c++) put(objects, c, r, 0);
  }
  return level;
}

// --- Handwerkszeug ----------------------------------------------------------

/** Eine ganze Zahl von `min` bis `max`, beide einschließlich. */
function pick(rand: () => number, min: number, max: number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

/**
 * `count` Versuche, etwas auf eine freie Zelle zu setzen — mit einem Rahmen,
 * wenn es irgendwo hin soll, und sonst über die ganze Karte. Gezählt werden
 * Treffer, nicht Würfe: Ein Würfel, der auf dem Teich landet, wird noch einmal
 * geworfen, aber nicht endlos.
 */
function scatter(
  rand: () => number,
  count: number,
  place: (col: number, row: number) => boolean,
  cols: number,
  rows: number,
  area?: { c0: number; r0: number; c1: number; r1: number },
): void {
  const c0 = Math.max(1, area?.c0 ?? 2);
  const r0 = Math.max(1, area?.r0 ?? 2);
  const c1 = Math.min(cols - 2, area?.c1 ?? cols - 3);
  const r1 = Math.min(rows - 2, area?.r1 ?? rows - 3);
  let placed = 0;
  for (let tries = 0; tries < count * 12 && placed < count; tries++) {
    if (place(pick(rand, c0, c1), pick(rand, r0, r1))) placed++;
  }
}

/** Dieselbe Sprenkelung wie bisher, aber je Welt eine andere. */
function speckle(col: number, row: number, seed: number): number {
  const n = Math.sin(col * 12.9898 + row * 78.233 + (seed % 1000) * 0.017) * 43758.5453;
  return n - Math.floor(n);
}

/** Aus einem Namen eine Zahl (FNV-1a) — derselbe Name, dieselbe Welt. */
function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Ein kleiner, gesäter Zufallsgeber — gleicher Samen, gleiche Folge. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
