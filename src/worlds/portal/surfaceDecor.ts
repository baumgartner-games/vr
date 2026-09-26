/**
 * **Boden und Wände eines Raums gestalten** — die Werkzeuge _Boden_ und
 * _Wand_ des Baukastens, als reine Rechnung ohne Szene.
 *
 * Gewünscht war, dass man nicht nur Möbel in einen Raum stellt, sondern
 * **den Raum selbst** gestaltet: einen anderen Boden, geflieste Wände. Die
 * Welt speichert bewusst keine Farben (_Das Weltformat_ in `bauen.md`); also
 * wird wie überall mit Stücken aus dem KayKit-Regal gebaut, und was gesetzt
 * wird, steht wie jedes Stück in der Liste der Weltänderungen und auf dem
 * Stapel für _Rückgängig_.
 *
 * - **Boden** füllt den **Raum**, in dem der Kran steht: alle Kacheln, die
 *   von dort aus ohne Wand dazwischen zu erreichen sind (`floodRoom`). Wer
 *   im Freien klickt, bekommt keinen Boden bis zum Horizont, sondern eine
 *   Zeile, dass hier kein geschlossener Raum ist.
 * - **Wand** belegt **eine Seite** der nächsten Wand (`nearestFace`): mit
 *   Fliesen (`panel` — dünne Platten, Reihe über Reihe, nur auf dieser
 *   Seite, `panelSpots`) oder mit einer ganzen Wand aus dem Regal (`wall` —
 *   auf die Fuge, und dann gilt es für beide Seiten, `wallSpots`).
 *
 * Die **Muster** sind Stücke, die es schon gibt: je zwei Farbvarianten der
 * Restaurant-Fliesen, Dielen hell und dunkel aus dem Verlies. Neue Farben
 * gibt es nicht — nur, was das Regal hergibt.
 */
import type { Box, WallFace } from './decorPlace';
import { MOUNT_GAP, faceYaw } from './decorPlace';

/** Ein Muster für Boden oder Wand: das Stück im Regal und ein Name für die Zeile. */
export interface SurfaceStyle {
  readonly path: string;
  readonly label: string;
  /**
   * **Ein Farbfeld für die Leiste** (`#rrggbb`): der Ton, den das Stück aus
   * der Nähe hat, abgelesen in der Bild-Schleife. Die Leiste zeigt es neben
   * dem Namen, damit man das Muster erkennt, bevor man klickt.
   */
  readonly swatch: string;
  /**
   * Für Wände: `panel` sind dünne Platten auf **einer** Seite, `wall` ganze
   * Wände auf der Fuge. Ein Boden hat keine Art.
   */
  readonly kind?: 'panel' | 'wall';
  /** Für ganze Wände: das Stück für eine einzelne Kachel am Ende einer Reihe. */
  readonly half?: string;
}

/** Die Böden: alle eine Kachel groß, damit jede Kachel eines Raums genau eines bekommt. */
export const FLOOR_STYLES: readonly SurfaceStyle[] = [
  { path: 'dungeon/floor_wood_small.glb', label: 'Dielen hell', swatch: '#b3664a' },
  { path: 'dungeon/floor_wood_small_dark.glb', label: 'Dielen dunkel', swatch: '#6e3f2e' },
  { path: 'restaurant-bits/floor_kitchen_small.glb', label: 'Küchenfliesen', swatch: '#c9c6bd' },
  {
    path: 'restaurant-bits/floor_kitchen_small_styleB.glb',
    label: 'Küchenfliesen blau',
    swatch: '#7fa6c4',
  },
  { path: 'dungeon/floor_tile_small.glb', label: 'Steinplatten', swatch: '#8f8b85' },
];

/** Die Wände: erst Fliesen für eine Seite, dann ganze Wände. */
export const WALL_STYLES: readonly SurfaceStyle[] = [
  {
    path: 'restaurant-bits/wall_tiles_A.glb',
    label: 'Fliesen hell',
    swatch: '#e6e1d6',
    kind: 'panel',
  },
  {
    path: 'restaurant-bits/wall_tiles_B.glb',
    label: 'Fliesen dunkel',
    swatch: '#5d6a74',
    kind: 'panel',
  },
  {
    path: 'restaurant-bits/wall.glb',
    label: 'Putzwand',
    swatch: '#e8dcc6',
    kind: 'wall',
    half: 'restaurant-bits/wall_half.glb',
  },
  {
    path: 'prototype-bits/Wall.glb',
    label: 'Prototypwand',
    swatch: '#9aa0a6',
    kind: 'wall',
    half: 'prototype-bits/Wall_Half.glb',
  },
];

/** Ob ein Stück aus dem Regal eine Wandfliese ist — die gehört wie ein Bild an die Wand. */
export function isWallPanel(path: string): boolean {
  return WALL_STYLES.some((style) => style.kind === 'panel' && style.path === path);
}

/** Name und Farbfeld eines Musters — das, was die Leiste davon zeigt. */
export function stylePattern(style: SurfaceStyle): { label: string; swatch: string } {
  return { label: style.label, swatch: style.swatch };
}

/**
 * **Was ein Druck auf _Boden_ oder _Wand_ ohne Leiste tut** — in der Brille
 * und in der Ich-Sicht, wo kein Kran zeigt, was gemeint ist. Der erste Druck
 * zeigt nur (`preview`: der Raum leuchtet, die Wandseite leuchtet), der
 * zweite auf **dasselbe** Werkzeug belegt (`apply`) und schaltet die Vorschau
 * ab. Ein Druck auf das andere Werkzeug wechselt die Vorschau.
 */
export function surfacePress(
  armed: 'floor' | 'wall' | null,
  tool: 'floor' | 'wall',
): { readonly action: 'preview' | 'apply'; readonly armed: 'floor' | 'wall' | null } {
  return armed === tool ? { action: 'apply', armed: null } : { action: 'preview', armed: tool };
}

/** Das nächste Muster in der Liste — und nach dem letzten wieder das erste. */
export function nextStyle(list: readonly SurfaceStyle[], index: number): number {
  return list.length ? (index + 1) % list.length : 0;
}

// --- Boden --------------------------------------------------------------------

/** Eine Kachel als Spalte und Reihe: Kachel (`col`, `row`) liegt auf [col, col+1] × [row, row+1]. */
export interface RoomTile {
  readonly col: number;
  readonly row: number;
}

/** Wie viele Kacheln ein Raum höchstens hat — darüber ist es kein Raum, sondern draußen. */
export const ROOM_MAX = 400;

/** Wie hoch eine Wand mindestens reicht, um einen Raum zu schließen, über dem Boden. */
const ROOM_WALL_TOP = 1.5;
/** Wie dick eine Wand höchstens ist — dicker ist sie ein Möbel. */
const ROOM_WALL_THICK = 0.6;
/** Wie nah die Mitte einer Wand an einer Fuge liegen muss. */
const ROOM_LINE_SLACK = 0.2;

/**
 * **Die Fugen, die eine Wand zumacht** — aus den Kästen der Welt und der
 * hingestellten Stücke (`PortalWorld.decorScene`). Eine Fuge ist ein Schlüssel:
 * `h:col,line` für die waagerechte Fuge `z = line` über der Kachel `col`,
 * `v:line,row` für die senkrechte `x = line` neben der Reihe `row`.
 *
 * Zählt, was dünn ist, auf einer Fuge steht und bis über Hüfthöhe reicht —
 * auch der Sturz über einer Tür (er endet oben an der Wand): Eine Tür ist
 * für den Boden kein Loch in der Wand, sonst liefe der Boden durch jede Tür
 * in den nächsten Raum.
 */
export function blockedEdges(boxes: readonly Box[], floorY: number): Set<string> {
  const out = new Set<string>();
  for (const box of boxes) {
    if (box.maxY < floorY + ROOM_WALL_TOP || box.minY > floorY + 2.6) continue;
    const w = box.maxX - box.minX;
    const d = box.maxZ - box.minZ;
    if (d <= ROOM_WALL_THICK && w > d) {
      const centre = (box.minZ + box.maxZ) / 2;
      const line = Math.round(centre);
      if (Math.abs(centre - line) > ROOM_LINE_SLACK) continue;
      for (let col = Math.floor(box.minX + 0.05); col < Math.ceil(box.maxX - 0.05); col++)
        out.add(`h:${col},${line}`);
    } else if (w <= ROOM_WALL_THICK && d > w) {
      const centre = (box.minX + box.maxX) / 2;
      const line = Math.round(centre);
      if (Math.abs(centre - line) > ROOM_LINE_SLACK) continue;
      for (let row = Math.floor(box.minZ + 0.05); row < Math.ceil(box.maxZ - 0.05); row++)
        out.add(`v:${line},${row}`);
    }
  }
  return out;
}

/**
 * **Der Raum um eine Kachel** — alle Kacheln, die von `start` aus ohne eine
 * Fuge aus `blocked` zu erreichen sind, Reihe für Reihe sortiert.
 * `closed: false`, wenn es mehr als `limit` werden: Dann steht man draußen,
 * und die Kacheln bis dahin sind kein Raum.
 */
export function floodRoom(
  start: RoomTile,
  blocked: ReadonlySet<string>,
  limit = ROOM_MAX,
): { tiles: RoomTile[]; closed: boolean } {
  const seen = new Set<string>([`${start.col},${start.row}`]);
  const tiles: RoomTile[] = [];
  const queue: RoomTile[] = [start];
  while (queue.length) {
    const tile = queue.shift()!;
    tiles.push(tile);
    if (tiles.length > limit) return { tiles: [], closed: false };
    const { col, row } = tile;
    const steps: [RoomTile, string][] = [
      [{ col: col + 1, row }, `v:${col + 1},${row}`],
      [{ col: col - 1, row }, `v:${col},${row}`],
      [{ col, row: row + 1 }, `h:${col},${row + 1}`],
      [{ col, row: row - 1 }, `h:${col},${row}`],
    ];
    for (const [next, edge] of steps) {
      const key = `${next.col},${next.row}`;
      if (seen.has(key) || blocked.has(edge)) continue;
      seen.add(key);
      queue.push(next);
    }
  }
  tiles.sort((a, b) => a.row - b.row || a.col - b.col);
  return { tiles, closed: true };
}

// --- Wand ---------------------------------------------------------------------

/** Wie weit vor einer Wand der Kran noch an ihr gilt, wenn eine Seite belegt wird, in Metern. */
export const FACE_REACH = 1.2;
/**
 * Um wie viel weiter eine Wand gilt, wenn man sie **ansieht** (`nearestFace`
 * mit `look`) — in der Brille zeigt der Blick, was gemeint ist, und man muss
 * nicht an die Wand treten.
 */
export const LOOK_REACH = 0.6;

/**
 * **Die Wandseite, die gemeint ist** — die nächste, vor der der Punkt liegt,
 * bis `FACE_REACH` davor und nicht weiter als eine halbe Kachel über ihr Ende
 * hinaus. `null`, wenn keine in Reichweite ist.
 */
export function nearestFace(
  x: number,
  z: number,
  faces: readonly WallFace[],
  floorY: number,
  look?: { readonly x: number; readonly z: number },
): WallFace | null {
  let best: WallFace | null = null;
  let bestDistance = Infinity;
  for (const face of faces) {
    if (face.bottom > floorY + 0.5 || face.top < floorY + 1) continue;
    // **Mit Blickrichtung** (Brille, Ich-Sicht) zählt nur eine Seite, die
    // einem zugewandt ist: Wer mit dem Rücken nah an einer Wand steht und
    // auf die gegenüber schaut, meint nicht die hinter sich.
    if (look && (face.axis === 'x' ? look.x : look.z) * face.normal > -0.2) continue;
    const across = face.axis === 'x' ? x : z;
    const along = face.axis === 'x' ? z : x;
    const distance = (across - face.at) * face.normal;
    if (distance < -0.05 || distance > FACE_REACH + (look ? LOOK_REACH : 0)) continue;
    if (along < face.from - 0.5 || along > face.to + 0.5) continue;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = face;
    }
  }
  return best;
}

/** Wo ein Stück an einer Wand steht: Mitte und Drehung. */
export interface WallSpot {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly yaw: number;
}

/** Wie hoch eine Wandseite höchstens gefliest wird, über dem Boden. */
export const PANEL_TOP = 2.8;

/**
 * **Fliesen auf eine Wandseite** — so viele Platten nebeneinander, wie ganz
 * auf die Fläche passen (mittig, der Rest bleibt an beiden Enden gleich), und
 * Reihe über Reihe vom Boden bis `PANEL_TOP` oder zur Oberkante der Wand.
 * Jede Platte liegt einen Zentimeter vor der Fläche, die Vorderseite im Raum.
 *
 * @param panel die Maße einer Platte, wie sie an der Wand hängt (`mountSize`)
 * @param alongX ob die Datei ihre Breite entlang x hat (`faceYaw`)
 */
export function panelSpots(
  face: WallFace,
  panel: { readonly halfWidth: number; readonly halfDepth: number; readonly height: number },
  floorY: number,
  alongX = true,
): WallSpot[] {
  const width = 2 * panel.halfWidth;
  if (width <= 0 || panel.height <= 0) return [];
  const length = face.to - face.from;
  const columns = Math.floor(length / width + 1e-6);
  const top = Math.min(face.top, floorY + PANEL_TOP);
  const rows = Math.floor((top - Math.max(face.bottom, floorY)) / panel.height + 1e-6);
  if (columns <= 0 || rows <= 0) return [];
  const first = face.from + (length - columns * width) / 2 + panel.halfWidth;
  const off = face.at + face.normal * (panel.halfDepth + MOUNT_GAP);
  const yaw = faceYaw(face, alongX);
  const out: WallSpot[] = [];
  for (let row = 0; row < rows; row++) {
    const y = Math.max(face.bottom, floorY) + panel.height / 2 + row * panel.height;
    for (let column = 0; column < columns; column++) {
      const slide = first + column * width;
      out.push({
        x: face.axis === 'x' ? off : slide,
        z: face.axis === 'x' ? slide : off,
        y,
        yaw,
      });
    }
  }
  return out;
}

/**
 * **Ganze Wände auf die Fuge unter einer Wandseite** — wie der Grundriss
 * sie baut (`grid/shelfWalls.wallRun`): Stücke über zwei Kacheln, am Ende
 * eines über eine. Die Fuge liegt eine halbe Wanddicke hinter der Fläche,
 * auf die nächste ganze Zahl gerundet.
 *
 * @param height die Höhe des Stücks — seine Mitte steht so hoch über dem Boden
 */
export function wallSpots(
  face: WallFace,
  floorY: number,
  height: number,
): Array<WallSpot & { readonly long: boolean }> {
  const line = Math.round(face.at - face.normal * 0.1);
  const from = Math.round(face.from);
  const to = Math.round(face.to);
  const out: Array<WallSpot & { long: boolean }> = [];
  const yaw = face.axis === 'z' ? 0 : Math.PI / 2;
  for (let at = from; at < to;) {
    const long = to - at >= 2;
    const mid = at + (long ? 1 : 0.5);
    out.push({
      x: face.axis === 'x' ? line : mid,
      z: face.axis === 'x' ? mid : line,
      y: floorY + height / 2,
      yaw,
      long,
    });
    at += long ? 2 : 1;
  }
  return out;
}

/**
 * **Ob ein Stück an dieser Wandseite steht** — für das Ersetzen: Wer eine
 * Seite neu fliest, nimmt die alten Fliesen derselben Seite weg und nicht die
 * der anderen.
 */
export function onFace(face: WallFace, x: number, z: number): boolean {
  const across = face.axis === 'x' ? x : z;
  const along = face.axis === 'x' ? z : x;
  const distance = (across - face.at) * face.normal;
  return distance > 0 && distance < 0.2 && along > face.from - 0.01 && along < face.to + 0.01;
}
