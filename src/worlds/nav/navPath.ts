import { believedLinkOpen, believedWalkable, believedWallState, type NavBelief } from './navBelief';
import { newWallState, type NavGraph, type NavLink } from './navGraph';
import { hazardCost, type CostProfile } from './navProfile';
import { canWalkLine } from './navSight';
import {
  DIRS,
  NO_TILE,
  TILE,
  keyLevel,
  keyX,
  keyZ,
  neighbour,
  tileManhattan,
  type TileKey,
} from './navTile';

/**
 * **Die Wegsuche** — A* über die Kacheln, und ein Strömungsfeld für die, die
 * zu fünfzigst dasselbe wollen.
 *
 * Die Kosten sind durchgehend in **Metern**, und das ist keine Kosmetik: Die
 * Schätzung darf den echten Weg nie überschätzen, sonst findet A* zwar
 * schnell, aber nicht mehr den kürzesten Weg. Weil eine Kachel mindestens ihre
 * eigene Kantenlänge kostet (`Math.max(1, cost)` unten) und die Schätzung der
 * Weg über die Kanten in Metern ist, stimmt das hier — und wer den Faktor
 * `cost` unter 1 setzen will, um eine Kachel *schneller* zu machen, findet
 * genau hier die Zeile, die ihn daran hindert.
 *
 * Zwei Wege stehen zur Wahl, und sie beantworten verschiedene Fragen:
 *
 * - **`findPath`** — einer will irgendwohin. Kostet, was die Karte groß ist.
 * - **`flowField`** — viele wollen an dieselbe Stelle. Kostet **einmal**, was
 *   die Karte groß ist, und danach ist jede Frage „wohin als nächstes" ein
 *   Nachschlagen. Das ist der Unterschied zwischen einer Horde von fünfzig
 *   Zombies, die läuft, und einer, die ruckelt.
 */

/** Wie gesucht wird. */
export interface PathOptions {
  profile: CostProfile;
  /** Die Meinung dessen, der läuft — ohne sie wird die Welt gesehen, wie sie ist. */
  belief?: NavBelief | null;
  /** Überschreibt, ob er Türen aufmachen kann. Sonst entscheidet das Profil. */
  canOpen?: boolean;
  /**
   * Wie viele Kacheln höchstens angefasst werden.
   *
   * Die Reißleine für den Fall, dass jemand quer über eine große Karte sucht
   * und das Ziel eingemauert ist: Dann wird die **ganze** erreichbare Welt
   * durchsucht, bevor „kein Weg" herauskommt. Mit der Grenze kommt stattdessen
   * ein Teilweg heraus, und der ist in der Brille immer noch besser als ein
   * Bild, das eine Zehntelsekunde steht.
   */
  maxNodes?: number;
}

export interface PathResult {
  /** Die Kacheln vom Start zum Ziel, den Start eingeschlossen. */
  tiles: TileKey[];
  /** Was der Weg kostet, in Metern. */
  cost: number;
  /** Wie viele Kacheln dafür angefasst wurden — für die Debug-Ansicht. */
  visited: number;
  /**
   * Ob das Ziel erreicht wurde.
   *
   * `false` heißt nicht „nichts gefunden": `tiles` enthält dann den Weg zu der
   * Kachel, die dem Ziel am nächsten gekommen ist. Ein NPC, der bis vor die
   * Barrikade läuft und dort steht, ist richtig; einer, der auf der Stelle
   * stehen bleibt, weil das Ziel unerreichbar ist, sieht kaputt aus.
   */
  complete: boolean;
}

const DEFAULT_MAX_NODES = 6000;

/** Was es kostet, diese Kachel zu betreten, in Metern. `Infinity` = niemals. */
function enterCost(graph: NavGraph, key: TileKey, profile: CostProfile): number {
  const facts = graph.tile(key);
  if (!facts) return Infinity;
  const hazard = hazardCost(profile, facts.hazard);
  if (!Number.isFinite(hazard)) return Infinity;
  // Höchstens schneller als normal geht nicht: siehe oben, sonst lügt die
  // Schätzung und A* findet Umwege statt Wegen.
  return TILE * Math.max(1, facts.cost) + hazard;
}

/**
 * Ein Weg von `from` nach `to`.
 *
 * Gibt es keinen, kommt der beste Teilweg zurück (`complete: false`). Gibt es
 * nicht einmal einen Startpunkt, ein leeres Ergebnis.
 */
export function findPath(
  graph: NavGraph,
  from: TileKey,
  to: TileKey,
  options: PathOptions,
): PathResult {
  const { profile } = options;
  const belief = options.belief ?? null;
  const canOpen = options.canOpen ?? profile.opens;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;
  const empty: PathResult = { tiles: [], cost: 0, visited: 0, complete: false };

  if (from === NO_TILE || to === NO_TILE) return empty;
  if (!believedWalkable(belief, graph, from)) return empty;
  if (from === to) return { tiles: [from], cost: 0, visited: 1, complete: true };

  const open = new NodeHeap();
  const gScore = new Map<TileKey, number>([[from, 0]]);
  const cameFrom = new Map<TileKey, TileKey>();
  const closed = new Set<TileKey>();
  const scratch = newWallState();

  let bestNode = from;
  let bestHeuristic = tileManhattan(from, to);
  let visited = 0;

  open.push(from, bestHeuristic);

  while (open.size > 0) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    visited++;

    if (current === to) {
      return {
        tiles: unwind(cameFrom, current),
        cost: gScore.get(current) ?? 0,
        visited,
        complete: true,
      };
    }
    if (visited >= maxNodes) break;

    const g = gScore.get(current) ?? 0;

    // Die vier Nachbarn auf derselben Etage.
    for (const dir of DIRS) {
      const next = neighbour(current, dir);
      if (next === NO_TILE || closed.has(next)) continue;
      if (!believedWalkable(belief, graph, next)) continue;
      const wall = believedWallState(belief, graph.wall(current, dir), canOpen, scratch);
      if (!wall.walk) continue;
      const step = enterCost(graph, next, profile);
      if (!Number.isFinite(step)) continue;
      relax(current, next, g + step + wall.cost);
    }

    // Und alles, was von hier aus gebaut wurde: Treppen, Leitern, Portale.
    for (const exit of graph.linksFrom(current)) {
      const { link, to: next } = exit;
      if (closed.has(next)) continue;
      const factor = profile.link[link.kind];
      if (!Number.isFinite(factor)) continue;
      if (!believedLinkOpen(belief, link)) continue;
      if (!believedWalkable(belief, graph, next)) continue;
      const step = enterCost(graph, next, profile);
      if (!Number.isFinite(step)) continue;
      relax(current, next, g + link.cost * factor + step);
    }
  }

  // Kein Weg ans Ziel: der beste Teilweg ist besser als gar keiner.
  return {
    tiles: bestNode === from ? [from] : unwind(cameFrom, bestNode),
    cost: gScore.get(bestNode) ?? 0,
    visited,
    complete: false,
  };

  function relax(current: TileKey, next: TileKey, cost: number): void {
    const known = gScore.get(next);
    if (known !== undefined && known <= cost) return;
    gScore.set(next, cost);
    cameFrom.set(next, current);
    const heuristic = tileManhattan(next, to);
    if (heuristic < bestHeuristic) {
      bestHeuristic = heuristic;
      bestNode = next;
    }
    open.push(next, cost + heuristic);
  }
}

function unwind(cameFrom: Map<TileKey, TileKey>, end: TileKey): TileKey[] {
  const tiles = [end];
  let node = end;
  // Die Kette ist nie länger als die Zahl der Einträge — der Zähler ist die
  // Versicherung gegen einen Kreis, den es hier nicht geben darf.
  for (let i = 0; i <= cameFrom.size; i++) {
    const previous = cameFrom.get(node);
    if (previous === undefined) break;
    tiles.push(previous);
    node = previous;
  }
  tiles.reverse();
  return tiles;
}

/**
 * **Ecken wegnehmen.** Aus dem Treppenmuster der Kachelmitten wird eine Linie,
 * die ein Mensch auch gelaufen wäre.
 *
 * Ohne diesen Schritt läuft jeder NPC exakt über die Kachelmitten, und bei 2,5
 * Metern Kantenlänge sieht man das: Er zickzackt durch einen Gang, der gerade
 * ist. Gestrichen wird ein Wegpunkt, wenn man den nächsten schon von seinem
 * Vorgänger aus in gerader Linie erreicht (`navSight.ts`).
 *
 * **Und was Kosten hat, wird nicht überquert.** Was die Suche wegen einer
 * Gefahr gemieden hat, darf die Glättung nicht wieder hineinziehen — sonst
 * plant der Mensch sauber um die Stachelgrube herum und läuft dann quer
 * hindurch, und das ganze Kostensystem war umsonst.
 *
 * **Über eine Verbindung hinweg wird nicht geglättet.** Wer eine Treppe
 * abkürzt, kürzt durch die Decke ab. Jeder Sprung, der keine Nachbarschaft auf
 * derselben Etage ist, bleibt als fester Punkt stehen.
 */
export function smoothPath(
  graph: NavGraph,
  tiles: readonly TileKey[],
  options: PathOptions,
): TileKey[] {
  if (tiles.length <= 2) return [...tiles];
  const canOpen = options.canOpen ?? options.profile.opens;
  const belief = options.belief ?? null;

  // Was die Suche gemieden hat, zieht die Glättung nicht wieder herein: eine
  // Kachel, die diesem Profil einen Aufschlag kostet, ist keine Abkürzung.
  const forbid = (tile: TileKey): boolean => {
    const facts = graph.tile(tile);
    return facts !== undefined && hazardCost(options.profile, facts.hazard) > 0;
  };

  const out: TileKey[] = [tiles[0]!];
  let anchor = 0;
  for (let i = 1; i < tiles.length; i++) {
    const previous = tiles[i - 1]!;
    const here = tiles[i]!;
    const jumped = !isNeighbour(previous, here);
    if (jumped) {
      // Beide Enden der Verbindung bleiben stehen: das eine, um hinzulaufen,
      // das andere, um von dort weiterzugehen.
      if (out[out.length - 1] !== previous) out.push(previous);
      out.push(here);
      anchor = i;
      continue;
    }
    if (!canWalkLine(graph, tiles[anchor]!, here, canOpen, belief, forbid)) {
      out.push(previous);
      anchor = i - 1;
    }
  }
  const last = tiles[tiles.length - 1]!;
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function isNeighbour(a: TileKey, b: TileKey): boolean {
  if (keyLevel(a) !== keyLevel(b)) return false;
  return Math.abs(keyX(a) - keyX(b)) + Math.abs(keyZ(a) - keyZ(b)) === 1;
}

// --- Für die Horde --------------------------------------------------------

/**
 * Ein Strömungsfeld: von jeder erreichbaren Kachel aus die nächste Kachel
 * Richtung Ziel, und was von dort noch zu laufen ist.
 */
export interface FlowField {
  /** Wohin es von hier aus weitergeht. */
  readonly next: Map<TileKey, TileKey>;
  /** Restweg in Metern. */
  readonly cost: Map<TileKey, number>;
  /** Wie viele Kacheln angefasst wurden. */
  readonly visited: number;
}

/**
 * Baut das Feld — **einmal für alle**, die dasselbe Ziel haben.
 *
 * Ein Dijkstra rückwärts von den Zielen aus. Danach kostet die Frage „wohin
 * als nächstes" ein `Map.get`, und ob dreißig oder dreihundert danach fragen,
 * ist gleich teuer. Das ist die Antwort auf fünfzig NPCs, und es ist auch die
 * Antwort auf die entfernten unter ihnen: Wer weit weg ist, braucht keinen
 * eigenen Weg, sondern nur eine Richtung.
 *
 * **Rückwärts** heißt: Es wird geprüft, was es kostet, *hierher* zu kommen.
 * Bei den Wänden macht das keinen Unterschied (eine Tür ist von beiden Seiten
 * dieselbe), bei den Verbindungen schon — ein Absprung ist einseitig, und wer
 * das Feld vorwärts bauen würde, ließe seine Horde Klippen hochlaufen.
 */
export function flowField(
  graph: NavGraph,
  goals: readonly TileKey[],
  options: PathOptions,
): FlowField {
  const { profile } = options;
  const belief = options.belief ?? null;
  const canOpen = options.canOpen ?? profile.opens;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  const next = new Map<TileKey, TileKey>();
  const cost = new Map<TileKey, number>();
  const open = new NodeHeap();
  const closed = new Set<TileKey>();
  const scratch = newWallState();
  let visited = 0;

  for (const goal of goals) {
    if (goal === NO_TILE || !believedWalkable(belief, graph, goal)) continue;
    cost.set(goal, 0);
    open.push(goal, 0);
  }

  // Wer von wo aus hierherkommt: die Verbindungen einmal umgedreht.
  const incoming = new Map<TileKey, { from: TileKey; link: NavLink }[]>();
  for (const link of graph.links()) {
    push(incoming, link.to, { from: link.from, link });
    if (link.both) push(incoming, link.from, { from: link.to, link });
  }

  while (open.size > 0 && visited < maxNodes) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    visited++;
    const here = cost.get(current) ?? 0;
    const step = enterCost(graph, current, profile);
    if (!Number.isFinite(step)) continue;

    for (const dir of DIRS) {
      const from = neighbour(current, dir);
      if (from === NO_TILE || closed.has(from)) continue;
      if (!believedWalkable(belief, graph, from)) continue;
      const wall = believedWallState(belief, graph.wall(current, dir), canOpen, scratch);
      if (!wall.walk) continue;
      offer(from, current, here + step + wall.cost);
    }

    for (const entry of incoming.get(current) ?? []) {
      const link = entry.link;
      if (closed.has(entry.from)) continue;
      const factor = profile.link[link.kind];
      if (!Number.isFinite(factor)) continue;
      if (!believedLinkOpen(belief, link)) continue;
      if (!believedWalkable(belief, graph, entry.from)) continue;
      offer(entry.from, current, here + link.cost * factor + step);
    }
  }

  return { next, cost, visited };

  function offer(tile: TileKey, towards: TileKey, total: number): void {
    const known = cost.get(tile);
    if (known !== undefined && known <= total) return;
    cost.set(tile, total);
    next.set(tile, towards);
    open.push(tile, total);
  }
}

function push<T>(map: Map<TileKey, T[]>, key: TileKey, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Der Weg, den ein Strömungsfeld von hier aus vorgibt.
 *
 * Nicht für die Fortbewegung gedacht — die fragt Kachel für Kachel — sondern
 * für die Debug-Ansicht, die den Weg zeichnen will, und für die Prüfung, dass
 * das Feld dorthin führt, wohin es soll.
 */
export function flowPath(field: FlowField, from: TileKey, limit = 512): TileKey[] {
  const tiles: TileKey[] = [];
  let node = from;
  for (let i = 0; i < limit; i++) {
    tiles.push(node);
    const step = field.next.get(node);
    if (step === undefined) break;
    node = step;
  }
  return tiles;
}

// --- Der Haufen -----------------------------------------------------------

/**
 * Ein binärer Haufen aus zwei parallelen Zahlenfeldern.
 *
 * Zwei Felder statt einem Feld aus Objekten, und das ist bei einer Wegsuche
 * kein Geiz: Jedes `{key, f}` wäre ein Objekt, das der Sammler hinterher
 * wegräumen muss, und fünfzig NPCs machen daraus Zehntausende je Sekunde. In
 * einer Brille sieht man das.
 */
class NodeHeap {
  private readonly keys: number[] = [];
  private readonly scores: number[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(key: number, score: number): void {
    this.keys.push(key);
    this.scores.push(score);
    let child = this.keys.length - 1;
    while (child > 0) {
      const parent = (child - 1) >> 1;
      if (this.scores[parent]! <= this.scores[child]!) break;
      this.swap(parent, child);
      child = parent;
    }
  }

  pop(): number {
    const top = this.keys[0]!;
    const key = this.keys.pop()!;
    const score = this.scores.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = key;
      this.scores[0] = score;
      let parent = 0;
      for (;;) {
        const left = parent * 2 + 1;
        const right = left + 1;
        let smallest = parent;
        if (left < this.keys.length && this.scores[left]! < this.scores[smallest]!) smallest = left;
        if (right < this.keys.length && this.scores[right]! < this.scores[smallest]!)
          smallest = right;
        if (smallest === parent) break;
        this.swap(parent, smallest);
        parent = smallest;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    const key = this.keys[a]!;
    this.keys[a] = this.keys[b]!;
    this.keys[b] = key;
    const score = this.scores[a]!;
    this.scores[a] = this.scores[b]!;
    this.scores[b] = score;
  }
}
