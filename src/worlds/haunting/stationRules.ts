import { CELL } from '../nav/cellGrid';
import { TILE } from '../nav/navTile';
import { doorMiddle, spacesOf, STATION_DOOR_GAP, type HouseDoor, type HouseSpec } from './house';

/**
 * **Die drei Regeln des Grundrisses** — vom Besitzer vorgegeben, hier
 * nachgerechnet (`stationRules.test.ts`, über viele Samen):
 *
 * 1. _„Gänge sind höchstens 4 Felder breit."_
 * 2. _„Zwischen zwei parallelen Gängen liegen ebenfalls nur 4 Felder."_
 * 3. _„Keine zwei Türen direkt hintereinander."_
 *
 * **Ein Feld ist eine halbe Kachel** (`nav/cellGrid.CELL` = 0,5 m) — so hat
 * der Besitzer es selbst eingeführt: _„Jede Kachel wird in vier kleine Felder
 * geteilt"_ (`docs/agents/zellgitter.md`), und so heißt es im Menü (_Belegte
 * Felder_). Eine Figur steht auf 2 × 2 Feldern, eine Tür der Station ist zwei
 * Kacheln breit (`house.STATION_DOOR_SPAN`) — **vier Felder**. Ein Gang ist
 * damit genau so breit wie seine Tür: zwei Figuren nebeneinander.
 *
 * Alles hier ist reine Rechnung über den `HouseSpec`: kein three.js, kein DOM.
 * Jede Prüfung gibt die Verstöße als Sätze zurück — leer heißt: hält.
 */

/** Wie breit ein Gang höchstens ist, in Feldern (halben Kacheln). */
export const CORRIDOR_MAX_CELLS = 4;

/** Wie weit zwei parallele Gänge auseinanderliegen, wenn dazwischen kein Raum ist — in Feldern. */
export const PARALLEL_GAP_CELLS = 4;

/**
 * **Wie viel Boden zwischen zwei Türen liegt, die man nacheinander
 * durchschreitet** — in Feldern, von Türmitte zu Türmitte.
 *
 * Sechs Felder sind drei Meter: Wer durch eine Tür tritt (eine Figur ist zwei
 * Felder tief), hat danach noch mindestens eine Körperlänge Boden vor sich,
 * bevor die nächste kommt. Eine Schleuse aus zwei Türen mit einem Meter
 * dazwischen, ein Stummelgang von zwei Kacheln vor einer Raumtür und zwei
 * Türen genau gegenüber über einen Gang von zwei Metern fallen darunter.
 */
export const DOOR_GAP_CELLS = STATION_DOOR_GAP / CELL;

/** Felder je Kachel längs einer Achse. */
const PER_TILE = TILE / CELL;

/** Die Kacheln aller Gänge, als `x,z`. */
function corridorTiles(spec: HouseSpec): Set<string> {
  const out = new Set<string>();
  for (const passage of spec.passages ?? [])
    for (let z = passage.rect.z; z < passage.rect.z + passage.rect.d; z++)
      for (let x = passage.rect.x; x < passage.rect.x + passage.rect.w; x++) out.add(`${x},${z}`);
  return out;
}

/** Die Kacheln aller Räume (ohne Gänge), als `x,z` — Schrägkacheln zählen mit. */
function roomTileSet(spec: HouseSpec): Set<string> {
  const out = new Set<string>();
  for (const room of spec.rooms) {
    if (room.shape) for (const key of room.shape.keys()) out.add(key);
    else
      for (let z = room.rect.z; z < room.rect.z + room.rect.d; z++)
        for (let x = room.rect.x; x < room.rect.x + room.rect.w; x++) out.add(`${x},${z}`);
  }
  return out;
}

/**
 * **Regel 1: Kein Gang ist breiter als vier Felder.**
 *
 * Gemessen wird ohne Richtung: Ein Gang ist zu breit, wenn irgendwo ein
 * Quadrat aus mehr als `CORRIDOR_MAX_CELLS` Feldern je Seite ganz auf
 * Gangboden liegt — auf Kacheln also drei mal drei. So zählt eine Kreuzung
 * zweier schmaler Gänge nicht als breit, ein Platz von sechs Metern aber
 * schon. Dazu ist jedes Gangstück selbst höchstens so schmal wie eine Tür
 * breit ist, damit überhaupt eine hineinpasst.
 */
export function corridorWidthViolations(spec: HouseSpec): string[] {
  const out: string[] = [];
  const tiles = corridorTiles(spec);
  const side = Math.floor(CORRIDOR_MAX_CELLS / PER_TILE) + 1;
  for (const key of tiles) {
    const [x, z] = key.split(',').map(Number) as [number, number];
    let full = true;
    for (let dz = 0; dz < side && full; dz++)
      for (let dx = 0; dx < side && full; dx++) full = tiles.has(`${x + dx},${z + dz}`);
    if (full) out.push(`Gang bei ${x},${z}: breiter als ${CORRIDOR_MAX_CELLS} Felder`);
  }
  for (const passage of spec.passages ?? []) {
    const narrow = Math.min(passage.rect.w, passage.rect.d) * PER_TILE;
    if (narrow > CORRIDOR_MAX_CELLS)
      out.push(`${passage.name || passage.id}: ${narrow} Felder breit`);
  }
  return out;
}

/**
 * **Regel 2: Zwischen zwei parallelen Gängen liegen genau vier Felder.**
 *
 * Parallel heißt: Auf einer Zeile (oder Spalte) liegt zwischen zwei
 * Gangkacheln **nur Leere** — kein Raum, kein anderer Gang —, und auf der
 * Nachbarzeile genauso, über dieselbe Strecke. Dann laufen dort zwei Gänge
 * nebeneinander her, und der Block zwischen ihnen ist genau
 * `PARALLEL_GAP_CELLS` Felder dick: keine Doppelröhre mit einer Wand von
 * einem Meter, kein toter Keil von fünf Metern Hülle. Liegt ein Raum
 * dazwischen, ist es kein Block, sondern ein Raum, und der ist so tief, wie er
 * gezeichnet ist.
 */
export function parallelGapViolations(spec: HouseSpec): string[] {
  const halls = corridorTiles(spec);
  const rooms = roomTileSet(spec);
  const bounds = spec.bounds;
  if (!bounds) return [];
  const want = PARALLEL_GAP_CELLS / PER_TILE;
  const out: string[] = [];
  // Je Linie die Lücken aus reiner Leere zwischen zwei Gangkacheln: `a..b`.
  const gaps = (line: number, across: boolean): Set<string> => {
    const found = new Set<string>();
    const len = across ? bounds.d : bounds.w;
    const start = across ? bounds.z : bounds.x;
    const at = (i: number): string => (across ? `${line},${i}` : `${i},${line}`);
    let last: number | null = null;
    for (let i = start; i < start + len; i++) {
      const key = at(i);
      if (halls.has(key)) {
        if (last !== null && i - last > 1) found.add(`${last + 1}..${i - 1}`);
        last = i;
      } else if (rooms.has(key)) last = null;
    }
    return found;
  };
  for (const across of [false, true]) {
    const from = across ? bounds.x : bounds.z;
    const count = across ? bounds.w : bounds.d;
    let before = gaps(from - 1, across);
    for (let line = from; line < from + count; line++) {
      const here = gaps(line, across);
      for (const gap of here) {
        if (!before.has(gap)) continue;
        const [a, b] = gap.split('..').map(Number) as [number, number];
        const size = b - a + 1;
        if (size !== want)
          out.push(
            `${across ? 'Spalten' : 'Zeilen'} ${line - 1}/${line}, ${gap}: ` +
              `${size * PER_TILE} Felder zwischen zwei parallelen Gängen`,
          );
      }
      before = here;
    }
  }
  return out;
}

/**
 * **Regel 3: Keine zwei Türen direkt hintereinander.**
 *
 * Für jeden Raum und jeden Gang: Je zwei seiner Türen, die in **verschiedene**
 * Nachbarn führen, liegen mindestens `DOOR_GAP_CELLS` Felder auseinander
 * (Türmitte zu Türmitte). Zwei Türen in denselben Nachbarn stehen
 * nebeneinander und nicht hintereinander — die zählen nicht.
 */
export function doorChainViolations(spec: HouseSpec): string[] {
  const out: string[] = [];
  const least = (DOOR_GAP_CELLS * CELL) / TILE;
  const bySpace = new Map<string, HouseDoor[]>();
  for (const door of spec.doors)
    for (const side of [door.a, door.b]) {
      if (side === null) continue;
      bySpace.set(side, [...(bySpace.get(side) ?? []), door]);
    }
  const names = new Map(spacesOf(spec).map((space) => [space.id, space.name || space.id]));
  for (const [space, doors] of bySpace)
    for (let i = 0; i < doors.length; i++)
      for (let j = i + 1; j < doors.length; j++) {
        const p = doors[i]!,
          q = doors[j]!;
        const other = (door: HouseDoor): string | null => (door.a === space ? door.b : door.a);
        if (other(p) === other(q)) continue;
        const a = doorMiddle(p),
          b = doorMiddle(q);
        const gap = Math.hypot(a.x - b.x, a.z - b.z);
        if (gap < least - 1e-9)
          out.push(
            `${names.get(space) ?? space}: Türen ${p.id} und ${q.id} nur ` +
              `${Math.round((gap / CELL) * 10) / 10} Felder auseinander`,
          );
      }
  return out;
}

/** Alle drei Regeln auf einmal — leer heißt: der Grundriss hält. */
export function stationRuleViolations(spec: HouseSpec): string[] {
  return [
    ...corridorWidthViolations(spec),
    ...parallelGapViolations(spec),
    ...doorChainViolations(spec),
  ];
}
