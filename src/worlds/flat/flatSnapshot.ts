import type { NavGraph } from '../nav/navGraph';
import type { LinkKind } from '../nav/navProfile';
import { TILE, keyLevel, keyX, keyZ, wallDir, wallTile, type Dir } from '../nav/navTile';
import { edgeOf, type FloorBox, type FloorRamp } from './flatFloor';

/**
 * **Das Bild der flachen Welt** — was die Ebenen-Karte zeichnet.
 *
 * Ein reines Datenpaket ohne DOM und ohne three.js: je Etage die Kacheln
 * (mit ihrer Feinhöhe), die Wände als Strecken, die Türen mit Blatt, die
 * Kästen, die auf dem Boden stehen, und die Verbindungen (Treppen) zu
 * anderen Etagen; dazu die Figuren. Aus dem Graphen einer Welt gerechnet
 * (`snapshotOf`) und nur dann neu, wenn der Graph sich geändert hat
 * (`version`).
 */
export interface FlatPoint {
  x: number;
  z: number;
}

export interface FlatTile {
  tx: number;
  tz: number;
  rise: number;
  blocked: boolean;
}

export interface FlatWall {
  a: FlatPoint;
  b: FlatPoint;
  kind: 'wall' | 'window' | 'door';
  /** Bei Türen: offen, verriegelt, Name und Breite. */
  open?: boolean;
  barred?: boolean;
  id?: string;
  width?: number;
  /** Wo die Tür steht, für den Tipp darauf. */
  at?: FlatPoint;
  alongX?: boolean;
}

export interface FlatBox extends FloorBox {
  kind: string;
  label?: string;
  /** Wie hoch er ist — zum Zeichnen eines Deckels. */
  height: number;
}

export interface FlatLink {
  kind: LinkKind;
  from: FlatPoint & { level: number };
  to: FlatPoint & { level: number };
  /** Eine schräge Kachel (Treppe/Rampe), wenn es eine gibt. */
  ramp?: FloorRamp;
}

export interface FlatBounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface FlatLevel {
  level: number;
  /** Die Weltmeter des Bodens dieser Etage. */
  y: number;
  tiles: FlatTile[];
  walls: FlatWall[];
  boxes: FlatBox[];
  links: FlatLink[];
}

export type FlatEntityKind = 'player' | 'peer' | 'npc' | 'mark';

export interface FlatEntity extends FlatPoint {
  id: string;
  level: number;
  yaw: number;
  kind: FlatEntityKind;
  label?: string;
  moving?: boolean;
  colour?: string;
}

export interface FlatSnapshot {
  levels: FlatLevel[];
  entities: FlatEntity[];
  bounds: FlatBounds;
  version: number;
}

export interface SnapshotOptions {
  boxes?: readonly FlatBox[];
  ramps?: readonly FloorRamp[];
  doorWidth?: (id: string) => number;
}

const NOWHERE: FlatBounds = { minX: 0, minZ: 0, maxX: 0, maxZ: 0 };

/** Das Bild einer Welt aus ihrem Graphen. Die Figuren kommen je Bild dazu (`entities`). */
export function snapshotOf(graph: NavGraph, options: SnapshotOptions = {}): FlatSnapshot {
  const levels: FlatLevel[] = graph.levels.map((y, level) => ({
    level,
    y,
    tiles: [],
    walls: [],
    boxes: [],
    links: [],
  }));
  let minX = Infinity,
    minZ = Infinity,
    maxX = -Infinity,
    maxZ = -Infinity;
  for (const key of graph.tileKeys()) {
    const facts = graph.tile(key)!;
    const tx = keyX(key),
      tz = keyZ(key);
    const one = levels[keyLevel(key)];
    if (!one) continue;
    one.tiles.push({ tx, tz, rise: facts.rise ?? 0, blocked: graph.isBlocked(key) });
    minX = Math.min(minX, tx * TILE);
    minZ = Math.min(minZ, tz * TILE);
    maxX = Math.max(maxX, (tx + 1) * TILE);
    maxZ = Math.max(maxZ, (tz + 1) * TILE);
  }
  for (const [wallKey, facts] of graph.wallEntries()) {
    const key = wallTile(wallKey);
    const dir: Dir = wallDir(wallKey);
    const one = levels[keyLevel(key)];
    if (!one) continue;
    const edge = edgeOf(key, dir);
    const wall: FlatWall = {
      a: { x: edge.ax, z: edge.az },
      b: { x: edge.bx, z: edge.bz },
      kind: facts.kind === 'door' ? 'door' : facts.kind === 'window' ? 'window' : 'wall',
    };
    if (facts.kind === 'door') {
      wall.open = facts.open;
      wall.barred = facts.barred;
      wall.id = facts.id;
      wall.width = options.doorWidth?.(facts.id) ?? 1.2;
      wall.at = { x: (edge.ax + edge.bx) / 2, z: (edge.az + edge.bz) / 2 };
      wall.alongX = edge.az === edge.bz;
    }
    one.walls.push(wall);
  }
  const ramps = new Map<string, FloorRamp>();
  for (const ramp of options.ramps ?? []) ramps.set(`${ramp.level}:${ramp.tx}:${ramp.tz}`, ramp);
  for (const link of graph.links()) {
    const one = levels[keyLevel(link.from)];
    if (!one) continue;
    const from = {
      x: centre(keyX(link.from)),
      z: centre(keyZ(link.from)),
      level: keyLevel(link.from),
    };
    const to = { x: centre(keyX(link.to)), z: centre(keyZ(link.to)), level: keyLevel(link.to) };
    const ramp = ramps.get(`${from.level}:${keyX(link.from)}:${keyZ(link.from)}`);
    one.links.push({ kind: link.kind, from, to, ...(ramp ? { ramp } : {}) });
  }
  for (const box of options.boxes ?? []) levels[box.level]?.boxes.push(box);
  return {
    levels,
    entities: [],
    bounds: Number.isFinite(minX) ? { minX, minZ, maxX, maxZ } : NOWHERE,
    version: graph.version,
  };
}

function centre(index: number): number {
  return (index + 0.5) * TILE;
}
