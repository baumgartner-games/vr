import { NavGraph, type NavLink, type TileFacts, type WallKind } from './navGraph';
import type { LinkKind } from './navProfile';
import { DIR_E, DIR_N, DIR_S, DIR_W, tileKey, type Dir, type TileKey } from './navTile';

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
export function setDoor(graph: NavGraph, at: TileKey, dir: Dir, id: string, open = true): void {
  graph.setWall(at, dir, { kind: 'door', open, id, muffle: 0.8 });
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
