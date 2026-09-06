/**
 * **Die Kachel** — die Einheit, in der diese Welt navigiert wird.
 *
 * Alles darüber (Graph, Wegsuche, Meinung, Sinne) rechnet in ganzen Zahlen auf
 * einem Gitter, und nur an den Rändern wird in Meter zurückgerechnet. Das ist
 * der ganze Trick an der Sache: eine Wegsuche über ganze Zahlen ist schnell,
 * prüfbar und hat keine Rundungsfehler, während dieselbe Rechnung im freien
 * Raum weder das eine noch das andere ist.
 *
 * **Die Kachelgröße ist eine Konstante und keine Einstellung.** Sie steht hier
 * einmal, und jede gespeicherte Karte hat sie im Kopf stehen
 * (`navSerial.ts`). Wer sie ändert, macht alle gespeicherten Karten ungültig —
 * darum ist die Formatversion daran gekoppelt und nicht bloß eine Zahl, die
 * man beim Laden hoffentlich beachtet.
 *
 * **2,5 Meter**, und das ist eine Entscheidung mit zwei Seiten: grob genug,
 * dass eine Karte wie Dust ein paar hundert Kacheln hat statt zehntausend
 * (fünfzig NPCs sollen darauf gleichzeitig denken), und fein genug, dass ein
 * Zimmer, ein Gang und eine Tür sich unterscheiden lassen. Was zwischen zwei
 * Kachelmitten passiert, ist ausdrücklich **nicht** Sache des Gitters, sondern
 * der Fortbewegung: sie glättet den Weg und weicht dem aus, was gerade
 * herumsteht (`locomotion.ts`).
 *
 * **Die Höhe ist ein Index und keine Zahl.** Eine Kachel liegt auf einer
 * *Etage*; welche Höhe eine Etage in Metern hat, weiß der Graph und nicht die
 * Kachel. Ein Gitter, das die Höhe stetig führte, müsste bei jeder Rampe
 * entscheiden, ob zwei Kacheln noch dieselbe Ebene sind — mit einem Index gibt
 * es diese Frage nicht, und Dach, Erdgeschoss und Tunnel darunter können
 * problemlos übereinander liegen (`navGraph.ts`).
 */

/** Die Kantenlänge einer Kachel in Metern. Siehe oben: fix, nicht einstellbar. */
export const TILE = 2.5;

/**
 * Ein Kachelschlüssel: `x`, `z` und die Etage in **einer** Zahl.
 *
 * Eine Zahl und keine Zeichenkette und kein Objekt, denn davon gehen in einer
 * Wegsuche Zehntausende durch `Map` und `Set`. Ein `{x,z,level}` müsste dafür
 * jedes Mal in eine Zeichenkette übersetzt werden, und genau das ist bei einer
 * A*-Suche der Posten, der am Ende die Hälfte der Zeit frisst.
 */
export type TileKey = number;

/** „Keine Kachel" — was `neighbour` außerhalb des Gitters zurückgibt. */
export const NO_TILE: TileKey = -1;

/** Die Grenzen des Gitters: ±1024 Kacheln sind ±2560 Meter in jede Richtung. */
export const TILE_MIN = -1024;
export const TILE_MAX = 1023;
/** So viele Etagen passen in den Schlüssel. */
export const LEVEL_MAX = 63;

const BIAS = 1024;

/**
 * Der Schlüssel zu einer Kachel.
 *
 * Wirft, wenn etwas außerhalb des Gitters liegt: das ist immer ein Fehler im
 * Editor oder in einer Karte, und er soll dort auffallen und nicht erst
 * dreihundert Kacheln später als Weg, der ins Nichts führt.
 */
export function tileKey(x: number, z: number, level = 0): TileKey {
  if (!Number.isInteger(x) || !Number.isInteger(z) || !Number.isInteger(level)) {
    throw new RangeError(`Kachelkoordinaten sind ganze Zahlen: ${x},${z},${level}`);
  }
  if (x < TILE_MIN || x > TILE_MAX || z < TILE_MIN || z > TILE_MAX) {
    throw new RangeError(`Kachel ${x},${z} liegt außerhalb des Gitters`);
  }
  if (level < 0 || level > LEVEL_MAX) {
    throw new RangeError(`Etage ${level} gibt es nicht (0..${LEVEL_MAX})`);
  }
  return ((x + BIAS) << 17) | ((z + BIAS) << 6) | level;
}

export function keyX(key: TileKey): number {
  return (key >> 17) - BIAS;
}

export function keyZ(key: TileKey): number {
  return ((key >> 6) & 2047) - BIAS;
}

export function keyLevel(key: TileKey): number {
  return key & 63;
}

/** Dieselbe Kachel auf einer anderen Etage — die Treppe braucht das. */
export function keyOnLevel(key: TileKey, level: number): TileKey {
  return tileKey(keyX(key), keyZ(key), level);
}

/**
 * Die vier Richtungen. **Norden ist −Z**, wie überall sonst in diesem Projekt
 * auch (`npcBrain.ts`: vorne ist −Z), damit niemand zwischen zwei Dateien
 * umdenken muss.
 */
export const DIR_N = 0;
export const DIR_E = 1;
export const DIR_S = 2;
export const DIR_W = 3;
export type Dir = 0 | 1 | 2 | 3;

export const DIRS: readonly Dir[] = [DIR_N, DIR_E, DIR_S, DIR_W];

const DX: readonly number[] = [0, 1, 0, -1];
const DZ: readonly number[] = [-1, 0, 1, 0];

export function dirX(dir: Dir): number {
  return DX[dir]!;
}

export function dirZ(dir: Dir): number {
  return DZ[dir]!;
}

/** Die Gegenrichtung. */
export function opposite(dir: Dir): Dir {
  return ((dir + 2) % 4) as Dir;
}

/**
 * Die Nachbarkachel in dieser Richtung, oder `NO_TILE` am Rand des Gitters.
 *
 * Die Etage bleibt: nach Norden geht es nie nach oben. Zwischen Etagen kommt
 * man nur über eine Verbindung (`navGraph.ts`), und das ist Absicht — eine
 * Treppe ist etwas, das jemand hinbaut, und nichts, was sich aus zwei
 * benachbarten Zahlen ergibt.
 */
export function neighbour(key: TileKey, dir: Dir): TileKey {
  const x = keyX(key) + DX[dir]!;
  const z = keyZ(key) + DZ[dir]!;
  if (x < TILE_MIN || x > TILE_MAX || z < TILE_MIN || z > TILE_MAX) return NO_TILE;
  return ((x + BIAS) << 17) | ((z + BIAS) << 6) | (key & 63);
}

/**
 * Ein Wandschlüssel — die Wand **zwischen** zwei Kacheln.
 *
 * Jede Wand gibt es genau einmal, und das ist der ganze Zweck dieser Funktion:
 * gespeichert wird sie immer an der nördlicheren bzw. westlicheren der beiden
 * Kacheln (als `N` bzw. `E`). Wer sie von der anderen Seite sucht, bekommt
 * denselben Schlüssel. Ohne diese Normierung hätte jede Wand zwei Einträge,
 * und beim Schließen einer Tür ginge irgendwann einer davon vergessen —
 * ein Fehler, den man erst bemerkt, wenn ein NPC durch eine geschlossene Tür
 * läuft, weil er sie von der falschen Seite anschaut.
 */
export type WallKey = number;

export const NO_WALL: WallKey = -1;

export function wallKey(key: TileKey, dir: Dir): WallKey {
  if (dir === DIR_N) return (key << 1) | 0;
  if (dir === DIR_E) return (key << 1) | 1;
  const other = neighbour(key, dir);
  if (other === NO_TILE) return NO_WALL;
  return dir === DIR_S ? (other << 1) | 0 : (other << 1) | 1;
}

/** Die Kachel, an der eine Wand hängt, und ihre Richtung von dort aus. */
export function wallTile(wall: WallKey): TileKey {
  return wall >> 1;
}

export function wallDir(wall: WallKey): Dir {
  return (wall & 1) === 0 ? DIR_N : DIR_E;
}

// --- Meter und Kacheln ----------------------------------------------------

/** In welcher Kachelspalte ein Weltmaß liegt. */
export function tileIndexAt(metres: number): number {
  return Math.floor(metres / TILE);
}

/** Die Mitte einer Kachel in Weltkoordinaten. */
export function tileCentreX(key: TileKey): number {
  return (keyX(key) + 0.5) * TILE;
}

export function tileCentreZ(key: TileKey): number {
  return (keyZ(key) + 0.5) * TILE;
}

/** Der Abstand zweier Kachelmitten in Metern — die Etage bleibt dabei außen vor. */
export function tileDistance(a: TileKey, b: TileKey): number {
  const dx = (keyX(a) - keyX(b)) * TILE;
  const dz = (keyZ(a) - keyZ(b)) * TILE;
  return Math.hypot(dx, dz);
}

/**
 * Der Abstand über die Kanten, in Metern — die Schätzfunktion der Wegsuche.
 *
 * Gelaufen wird über vier Richtungen, also ist der kürzeste denkbare Weg die
 * Summe der beiden Abstände und nicht die Luftlinie. Wer hier die Luftlinie
 * nähme, hätte eine Schätzung, die **unter** dem echten Weg liegt: A* fände
 * immer noch den kürzesten Weg, würde dafür aber deutlich mehr Kacheln
 * anfassen.
 */
export function tileManhattan(a: TileKey, b: TileKey): number {
  return (Math.abs(keyX(a) - keyX(b)) + Math.abs(keyZ(a) - keyZ(b))) * TILE;
}
