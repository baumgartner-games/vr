import type { DoorMaterial } from './navDoor';
import { NavGraph, type NavLink, type TileFacts, type WallKind } from './navGraph';
import type { LinkKind } from './navProfile';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  neighbour,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Karten bauen** — die paar Handgriffe, die man beim Hinstellen einer Welt
 * immer wieder braucht.
 *
 * Der Editor wird sie benutzen, die Testwelt benutzt sie, und die Tests
 * benutzen sie auch. Genau darum stehen sie hier und nicht in einer
 * Testdatei: Ein Raum, den der Test anders baut als der Editor, prüft am Ende
 * etwas anderes, als später läuft.
 *
 * Ein **Rechteck** ist dabei immer `{x, z, w, d}` mit `x`/`z` als der
 * **nordwestlichen** Ecke — nicht als Mitte. Bei ganzzahligen Kacheln ist die
 * Ecke die eindeutige Angabe; eine Mitte müsste bei gerader Kantenlänge
 * gerundet werden, und dann steht die Wand einen Meter neben dem Haus.
 */

/** Ein Stück Karte. */
export interface NavRect {
  x: number;
  z: number;
  /** Breite in Kacheln, nach Osten. */
  w: number;
  /** Tiefe in Kacheln, nach Süden. */
  d: number;
  level?: number;
}

/** Legt Boden über ein Rechteck. */
export function fillRect(graph: NavGraph, rect: NavRect, facts: Partial<TileFacts> = {}): void {
  const level = rect.level ?? 0;
  for (let dz = 0; dz < rect.d; dz++) {
    for (let dx = 0; dx < rect.w; dx++) {
      graph.setTile(tileKey(rect.x + dx, rect.z + dz, level), facts);
    }
  }
}

/** Nimmt Boden wieder weg — ein Loch im Boden, ein Treppenauge. */
export function clearRect(graph: NavGraph, rect: NavRect): void {
  const level = rect.level ?? 0;
  for (let dz = 0; dz < rect.d; dz++) {
    for (let dx = 0; dx < rect.w; dx++) {
      graph.removeTile(tileKey(rect.x + dx, rect.z + dz, level));
    }
  }
}

/**
 * Stellt Wände rings um ein Rechteck — die Außenwand eines Zimmers.
 *
 * Immer auf der **Außenseite** der Randkacheln, damit man innen überall
 * hinkommt. Wer eine Wand mitten durch ein Zimmer will, setzt sie einzeln
 * (`graph.setWall`).
 */
export function wallRect(graph: NavGraph, rect: NavRect, kind: WallKind = 'solid'): void {
  const level = rect.level ?? 0;
  for (let dx = 0; dx < rect.w; dx++) {
    graph.setWall(tileKey(rect.x + dx, rect.z, level), DIR_N, { kind });
    graph.setWall(tileKey(rect.x + dx, rect.z + rect.d - 1, level), DIR_S, { kind });
  }
  for (let dz = 0; dz < rect.d; dz++) {
    graph.setWall(tileKey(rect.x, rect.z + dz, level), DIR_W, { kind });
    graph.setWall(tileKey(rect.x + rect.w - 1, rect.z + dz, level), DIR_E, { kind });
  }
}

/**
 * Setzt eine Tür in eine Wand, die schon steht.
 *
 * Die Id ist der Name, unter dem eine Meinung sie kennt (`navBelief.ts`) — ohne
 * sie kann sich niemand über sie irren, und die halbe Hälfte des Verhaltens
 * fällt weg. Deshalb ist sie hier Pflicht und nicht optional.
 */
export function setDoor(
  graph: NavGraph,
  at: TileKey,
  dir: Dir,
  id: string,
  open = true,
  material: DoorMaterial = 'wood',
): void {
  graph.setWall(at, dir, { kind: 'door', open, id, muffle: 0.8, material });
}

/** Und ein Fenster: hält auf, verrät aber, was dahinter passiert. */
export function setWindow(graph: NavGraph, at: TileKey, dir: Dir): void {
  graph.setWall(at, dir, { kind: 'window', muffle: 0.4 });
}

/**
 * Hängt eine Verbindung ein — Treppe, Leiter, Absprung, Portal.
 *
 * Die Kosten sind der Weg in Metern, den sie „lang" ist. Eine Treppe zwischen
 * zwei Etagen ist ungefähr so lang wie die Etage hoch ist; ein Portal ist
 * nahezu null, und das ist der Grund, warum Portale eine Karte so gründlich
 * umkrempeln.
 */
export function connect(
  graph: NavGraph,
  id: string,
  from: TileKey,
  to: TileKey,
  kind: LinkKind,
  options: { cost?: number; both?: boolean; open?: boolean } = {},
): NavLink {
  const link: NavLink = {
    id,
    from,
    to,
    kind,
    cost: options.cost ?? defaultLinkCost(kind),
    both: options.both ?? kind !== 'drop',
    open: options.open ?? true,
  };
  graph.addLink(link);
  return link;
}

function defaultLinkCost(kind: LinkKind): number {
  if (kind === 'portal') return 0.2;
  if (kind === 'drop') return 1;
  if (kind === 'jump') return 2;
  if (kind === 'ladder') return 6;
  return 4;
}

/**
 * Ein Portalpaar, wie es zur Laufzeit entsteht und wieder verschwindet.
 *
 * Zwei Verbindungen mit einem gemeinsamen Namensstamm, damit man sie zusammen
 * wieder loswird (`dropPortal`). Ein Portal, das beim Umsetzen nur halb
 * abgeräumt wird, ist eine Abkürzung, die es nicht mehr gibt und die
 * trotzdem jeder Weg nimmt.
 */
export function addPortal(graph: NavGraph, id: string, a: TileKey, b: TileKey): void {
  connect(graph, `${id}:in`, a, b, 'portal', { both: false });
  connect(graph, `${id}:out`, b, a, 'portal', { both: false });
}

export function dropPortal(graph: NavGraph, id: string): boolean {
  const gone = graph.removeLink(`${id}:in`);
  return graph.removeLink(`${id}:out`) || gone;
}

/** Die beiden Namen, unter denen ein Portal im Graphen steht. */
export function portalLinkIds(id: string): [string, string] {
  return [`${id}:in`, `${id}:out`];
}

/** Ein Stück Welt in Metern, wie eine Welt es hinschreibt. */
export interface WorldArea {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  y?: number;
}

/**
 * **Die Kachelmitten in einem Rechteck** — und nur die.
 *
 * Die eine Regel, nach der aus Metern Kacheln werden, und sie ist dieselbe wie
 * beim Abtasten (`navBake.ts`: „Die Kachelmitte entscheidet"): Eine Kachel
 * gehört zu einem Rechteck, wenn ihre **Mitte** darin liegt — nicht, wenn das
 * Rechteck sie irgendwo streift.
 *
 * Der Unterschied ist keine Feinheit. Hier lief einmal eine Schleife von
 * `minX` bis `maxX` in halben Kacheln und fragte an jedem Punkt, welche Kachel
 * dort liegt. Der letzte Punkt ist aber die Rechteckkante, und die gehört
 * schon zur **nächsten** Kachel: Eine Grube von sechs Kacheln Breite wurde so
 * sieben breit, und zwar nur nach Osten und nach Süden. In der Brille sah man
 * davon nichts als einen Menschen, der einen viel zu großen Bogen um die
 * Stachelgrube lief — an der Wand entlang, weil die Kachel daneben ihm als
 * Grube galt.
 */
function* centresIn(area: WorldArea): Generator<{ x: number; z: number }> {
  const first = tileIndexAt(area.minX);
  const last = tileIndexAt(area.maxX);
  const top = tileIndexAt(area.minZ);
  const bottom = tileIndexAt(area.maxZ);
  for (let tx = first; tx <= last; tx++) {
    const x = (tx + 0.5) * TILE;
    if (x < area.minX || x > area.maxX) continue;
    for (let tz = top; tz <= bottom; tz++) {
      const z = (tz + 0.5) * TILE;
      if (z < area.minZ || z > area.maxZ) continue;
      yield { x, z };
    }
  }
}

/**
 * **Ein Stück Karte in Weltmaßen anfassen.**
 *
 * Was abgetastet wurde, weiß nichts von Stacheln, Wasser oder Feuer — das
 * steht in keiner Geometrie. Eine Welt malt es hinterher auf: „von hier bis
 * dort ist eine Grube". Die Rechteckangabe ist dabei in **Metern** und nicht in
 * Kacheln, denn wer eine Welt baut, denkt in Metern.
 *
 * Angefasst werden die Kacheln, deren **Mitte** im Rechteck liegt
 * (`centresIn`); Kacheln, die es nur streift, bleiben, wie sie sind.
 */
export function paintRect(graph: NavGraph, area: WorldArea, facts: Partial<TileFacts>): number {
  let touched = 0;
  for (const spot of centresIn(area)) {
    const key = graph.at(spot.x, spot.z, area.y);
    if (key === NO_TILE) continue;
    graph.setTile(key, facts);
    touched++;
  }
  return touched;
}

/**
 * **Boden legen, wo die Geometrie keinen hergibt** — die abgedeckte Falle.
 *
 * Der Unterschied zu `paintRect` ist der zwischen Anstreichen und Bauen: Jenes
 * ändert Kacheln, die es gibt, dieses legt sie an. Gebraucht wird es für
 * genau eine Sorte Ort, und die ist eine **Falle**: In der Welt ist dort ein
 * Loch, auf der Karte ein Weg mit Stacheln darauf. Wer die Gefahr nicht liest
 * — der Zombie —, plant seelenruhig hindurch und fällt hinein; wer sie liest,
 * geht außen herum. Genau das ist eine Falle, und sie ist der einzige Grund,
 * warum eine Karte an einer Stelle etwas anderes sagen darf als die Geometrie.
 *
 * Die Etage kommt aus `level` und nicht aus einem `y`: Wo kein Boden ist, gibt
 * es auch keine Höhe, an der man ablesen könnte, welche Etage gemeint ist.
 */
export function coverRect(
  graph: NavGraph,
  area: WorldArea,
  facts: Partial<TileFacts> = {},
  level = 0,
): number {
  let laid = 0;
  for (const spot of centresIn(area)) {
    graph.setTile(tileKey(tileIndexAt(spot.x), tileIndexAt(spot.z), level), facts);
    laid++;
  }
  return laid;
}

/**
 * Setzt eine Tür in die Wand zwischen zwei Stellen der Welt.
 *
 * Auch das kann kein Abtasten liefern: In der Geometrie ist eine Tür entweder
 * eine Lücke oder eine Wand, aber nie beides nacheinander. Die Welt sagt, wo
 * eine ist, und ab dann kann sie auf- und zugehen — und ein NPC kann sich über
 * sie irren (`navBelief.ts`).
 *
 * Gibt `false` zurück, wenn die beiden Stellen keine Nachbarn sind; dann steht
 * die Tür woanders, als der Bauplan denkt, und das soll auffallen.
 */
export function doorBetween(
  graph: NavGraph,
  from: { x: number; z: number; y?: number },
  to: { x: number; z: number; y?: number },
  id: string,
  open = true,
  material: DoorMaterial = 'wood',
): boolean {
  const a = graph.at(from.x, from.z, from.y);
  const b = graph.at(to.x, to.z, to.y);
  if (a === NO_TILE || b === NO_TILE) return false;
  for (const dir of DIRS) {
    if (neighbour(a, dir) !== b) continue;
    setDoor(graph, a, dir, id, open, material);
    return true;
  }
  return false;
}

/**
 * Prüft eine Karte auf das, was man beim Bauen übersieht.
 *
 * Kein Ersatz für einen Blick in die Debug-Ansicht, aber es findet die drei
 * Fehler, die man wirklich macht: eine Verbindung, deren Ende auf keiner
 * Kachel liegt (dorthin läuft nie jemand), zwei Türen mit demselben Namen (die
 * zweite überschreibt die erste, und dann geht die falsche auf), und eine
 * Kachel, von der aus es nirgendwo hingeht.
 */
export function checkGraph(graph: NavGraph): string[] {
  const problems: string[] = [];
  for (const link of graph.links()) {
    if (!graph.has(link.from)) problems.push(`Verbindung ${link.id} beginnt im Nichts`);
    if (!graph.has(link.to)) problems.push(`Verbindung ${link.id} endet im Nichts`);
  }
  const seen = new Set<string>();
  for (const [, facts] of graph.wallEntries()) {
    if (!facts.id) continue;
    if (seen.has(facts.id)) problems.push(`Zwei Türen heißen "${facts.id}"`);
    seen.add(facts.id);
  }
  let lonely = 0;
  for (const key of graph.tileKeys()) {
    if (graph.linksFrom(key).length > 0) continue;
    if (graph.openNeighbours(key).length === 0) lonely++;
  }
  if (lonely > 0) problems.push(`${lonely} Kachel(n) haben keinen Ausgang`);
  return problems;
}
