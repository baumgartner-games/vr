import { PLAN_WALL_T } from '../editor/levelPlan';
import type { NavGraph, NavLink } from '../nav/navGraph';
import {
  DIRS,
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  dirX,
  dirZ,
  keyLevel,
  keyX,
  keyZ,
  neighbour,
  opposite,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';

/**
 * **Das Bodenmodell der flachen Welt** — die eine Rechnung, auf der jede Welt
 * von oben begangen wird.
 *
 * Der Besitzer will alle Welten „in ein Grid-System" haben: eine 2D-Welt aus
 * Kacheln als Grundlage, auf der Wege und Kollision sauber zu rechnen sind,
 * und die 3D-Welt nur als Bild davon. Das Raster gibt es längst — jede Welt
 * tastet ihre Quader zu einem `NavGraph` ab (`nav/navBake.ts`), und die
 * Rasterwelten (`grid/GridWorld.ts`) *sind* ihr Plan. Was fehlte, war der
 * **Schritt einer Figur** auf diesem Graphen: gleitend an Wänden, durch
 * offene Türen, nicht über Kanten, und **über Etagen hinweg** — die Treppe
 * im Haus, die Rampe aufs Dach, das Podest, auf dem man höher steht.
 *
 * Das Modell ist three.js-frei und kennt nur den Graphen und ein paar
 * Kästen, die eine Welt dazulegt (Blöcke und Massen aus ihrem Plan):
 *
 * - **Wände** sind die Kanten des Graphen (`graph.wall`): massiv, Fenster
 *   (sperrt, lässt Sicht durch) und Tür (sperrt, wenn zu oder verriegelt;
 *   offen ist sie eine Öffnung von `doorWidth` Metern in der Kantenmitte).
 *   Wo neben einer Kachel **keine** liegt, ist die Kante eine Wand — man
 *   läuft nicht ins Leere. Wo die Nachbarkachel um mehr als `STEP_LIMIT`
 *   höher oder tiefer liegt (`rise`), ist die Kante eine Stufe, die man
 *   nicht nimmt — dieselbe Zahl wie die Rapier-Kapsel (`enableAutostep`).
 * - **Ebenen** wechselt man über Verbindungen (`NavLink`): Eine Treppe
 *   führt von ihrer Kachel auf die Landekachel der Etage darüber; wer über
 *   die vordere Kante der Treppenkachel geht, steht oben. Rückwärts genauso.
 * - **Höhe** ist Etagenhöhe plus Feinhöhe der Kachel (`rise`) — und auf
 *   einer Rampe oder Treppe die Strecke dazwischen (`ramps`).
 */

/** Wo eine Figur steht: Meter in x/z, dazu die Etage des Graphen. */
export interface FloorPoint {
  x: number;
  z: number;
  level: number;
}

/** Ein Kasten auf einer Etage, den man nicht betritt — eine Kiste, ein Tisch, eine Säule. */
export interface FloorBox {
  level: number;
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

/**
 * Eine schräge Kachel: Treppe oder Rampe. Die Höhe steigt von der hinteren
 * Kante (0) zur vorderen Kante in `dir` (`rise`).
 */
export interface FloorRamp {
  level: number;
  tx: number;
  tz: number;
  dir: Dir;
  rise: number;
}

export interface FloorOptions {
  obstacles?: readonly FloorBox[];
  ramps?: readonly FloorRamp[];
  /** Wie breit eine offene Tür ist, je Tür — sonst `PLAN_DOOR_W`-artig 1,2 m. */
  doorWidth?: (id: string) => number;
  /** Bis zu welcher Stufe man ohne Treppe hinaufkommt, in Metern. */
  step?: number;
  /**
   * Die Höhe unter einem Punkt aus einem Höhenfeld (`terrainGraph.ts`) —
   * statt der Feinhöhe der Kachelmitte. Wer `undefined` zurückgibt, überlässt
   * den Punkt der Kachel.
   */
  heightAt?: (x: number, z: number, level: number) => number | undefined;
}

/** Die halbe Wandstärke: So weit steht eine Wand von ihrer Kante in die Kachel. */
export const WALL_HALF = PLAN_WALL_T / 2;
/** Die Stufe, die man einfach hinaufgeht — dieselbe wie in der Physik (`PhysicsLocomotion`). */
export const STEP_LIMIT = 0.32;
/** Die Türbreite, wenn niemand eine nennt. */
const DEFAULT_DOOR_W = 1.2;

interface Segment {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

function pointSegmentDistance(px: number, pz: number, s: Segment): number {
  const dx = s.bx - s.ax,
    dz = s.bz - s.az;
  const length2 = dx * dx + dz * dz;
  let t = length2 > 0 ? ((px - s.ax) * dx + (pz - s.az) * dz) / length2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s.ax + dx * t), pz - (s.az + dz * t));
}

export class FloorModel {
  private readonly obstacles: readonly FloorBox[];
  /**
   * **Was sich bewegt**: Kisten und Fässer, die als Requisiten durch die Welt
   * fliegen. Die Welt schreibt sie je Bild hierher, damit die Figur auch um
   * das herumgeht, was gerade eben noch woanders stand.
   */
  dynamic: FloorBox[] = [];
  private readonly ramps = new Map<TileKey, FloorRamp>();
  private readonly doorWidth: (id: string) => number;
  private readonly step: number;
  private readonly heightAt: FloorOptions['heightAt'];
  /** Verbindungen nach ihrer Zielkachel — für den Weg die Treppe hinunter. */
  private arrivals = new Map<TileKey, NavLink[]>();
  private arrivalsVersion = -1;

  constructor(
    readonly graph: NavGraph,
    options: FloorOptions = {},
  ) {
    this.obstacles = options.obstacles ?? [];
    for (const ramp of options.ramps ?? [])
      this.ramps.set(tileKey(ramp.tx, ramp.tz, ramp.level), ramp);
    this.doorWidth = options.doorWidth ?? (() => DEFAULT_DOOR_W);
    this.step = options.step ?? STEP_LIMIT;
    this.heightAt = options.heightAt;
  }

  /** Die Kachel unter einem Punkt seiner Etage — auch wenn dort keine liegt. */
  tile(at: FloorPoint): TileKey {
    return tileKey(tileIndexAt(at.x), tileIndexAt(at.z), at.level);
  }

  /** Ob unter dem Punkt Boden ist. */
  exists(at: FloorPoint): boolean {
    return this.graph.walkable(this.tile(at));
  }

  /** Die Etagen, die es gibt. */
  get levels(): readonly number[] {
    return this.graph.levels;
  }

  /**
   * Wie hoch der Boden unter einem Punkt liegt, in Weltmetern: Etage plus
   * Feinhöhe der Kachel, auf einer Treppe oder Rampe die Strecke dazwischen.
   */
  height(at: FloorPoint): number {
    const key = this.tile(at);
    const base = this.graph.levelY(at.level);
    const ramp = this.ramps.get(key);
    if (ramp) return base + ramp.rise * rampProgress(ramp, at.x, at.z);
    const sampled = this.heightAt?.(at.x, at.z, at.level);
    if (sampled !== undefined && Number.isFinite(sampled)) return base + sampled;
    return base + (this.graph.tile(key)?.rise ?? 0);
  }

  /**
   * Ob eine Figur mit diesem Halbmesser hier stehen kann: auf einer Kachel,
   * nicht in einer Wand, nicht in einem Kasten, nicht über einer Kante.
   */
  walkable(at: FloorPoint, radius: number): boolean {
    const key = this.tile(at);
    if (!this.graph.walkable(key)) return false;
    if (this.inBox(at, radius, this.obstacles) || this.inBox(at, radius, this.dynamic))
      return false;
    const tx = keyX(key),
      tz = keyZ(key);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const around = tileKey(tx + dx, tz + dz, at.level);
        if (!this.graph.has(around)) continue;
        for (const dir of DIRS) {
          // Die Kanten der eigenen Kachel zählen aus **ihrer** Sicht: Vom
          // Kopf der Treppe aus ist die Kante zur Landekachel eine Treppe,
          // vom Boden darunter aus eine Wand — dieselbe Kante, zwei Seiten.
          const segment =
            around !== key && neighbour(around, dir) === key
              ? this.barrier(key, opposite(dir))
              : this.barrier(around, dir);
          if (!segment) continue;
          for (const one of segment)
            if (pointSegmentDistance(at.x, at.z, one) < radius + WALL_HALF) return false;
        }
      }
    return true;
  }

  private inBox(at: FloorPoint, radius: number, boxes: readonly FloorBox[]): boolean {
    for (const box of boxes) {
      if (box.level !== at.level) continue;
      if (
        at.x > box.minX - radius &&
        at.x < box.maxX + radius &&
        at.z > box.minZ - radius &&
        at.z < box.maxZ + radius
      )
        return true;
    }
    return false;
  }

  /**
   * **Ein Schritt**: so weit wie möglich in die gewünschte Richtung, an
   * Wänden und Kästen entlanggleitend, und über eine Treppe auf die andere
   * Etage. Was nicht geht, wird nicht gegangen — die Figur bleibt stehen.
   */
  slide(from: FloorPoint, dx: number, dz: number, radius: number): FloorPoint {
    let at: FloorPoint = { x: from.x, z: from.z, level: from.level };
    // In Scheiben von höchstens einem halben Halbmesser, damit kein Schritt
    // eine Wand überspringt.
    const length = Math.hypot(dx, dz);
    if (length < 1e-9) return at;
    const pieces = Math.max(1, Math.ceil(length / Math.max(0.05, radius * 0.5)));
    const px = dx / pieces,
      pz = dz / pieces;
    for (let i = 0; i < pieces; i++) {
      const next = this.move(at, px, pz, radius);
      if (next === at) break;
      at = next;
    }
    return at;
  }

  /** Ein Stück des Schritts: ganz, sonst nur x, sonst nur z, sonst gar nicht. */
  private move(at: FloorPoint, dx: number, dz: number, radius: number): FloorPoint {
    const whole = this.arrive(at, at.x + dx, at.z + dz, radius);
    if (whole) return whole;
    if (dx !== 0) {
      const onlyX = this.arrive(at, at.x + dx, at.z, radius);
      if (onlyX) return onlyX;
    }
    if (dz !== 0) {
      const onlyZ = this.arrive(at, at.x, at.z + dz, radius);
      if (onlyZ) return onlyZ;
    }
    return at;
  }

  /**
   * Ob man von `at` an die Stelle kommt — auf derselben Etage, oder über
   * eine Verbindung auf eine andere, wenn die Zielkachel hier keine ist.
   */
  private arrive(at: FloorPoint, x: number, z: number, radius: number): FloorPoint | null {
    // Eine Verbindung auf die Nachbarkachel gewinnt: Wer über die vordere
    // Kante der Treppe geht, steht oben — auch wenn es unter der Landekachel
    // ebenfalls Boden gibt.
    const level = this.crossing(at, x, z);
    if (level !== null) {
      const other: FloorPoint = { x, z, level };
      if (this.walkable(other, radius)) return other;
    }
    const same: FloorPoint = { x, z, level: at.level };
    return this.walkable(same, radius) ? same : null;
  }

  /**
   * Die Etage, auf der die Zielkachel liegt, wenn von der aktuellen Kachel
   * eine Verbindung dorthin führt — die Treppe hinauf oder wieder hinunter.
   */
  private crossing(at: FloorPoint, x: number, z: number): number | null {
    const here = this.tile(at);
    const tx = tileIndexAt(x),
      tz = tileIndexAt(z);
    if (tx === keyX(here) && tz === keyZ(here)) return null;
    if (this.graph.features.links === false) return null;
    for (const exit of this.graph.linksFrom(here)) {
      if (!exit.link.open || exit.link.kind === 'portal' || exit.link.kind === 'jump') continue;
      if (keyX(exit.to) === tx && keyZ(exit.to) === tz) return keyLevel(exit.to);
    }
    for (const link of this.arrivalsAt(here)) {
      if (!link.open || !link.both || link.kind === 'portal' || link.kind === 'jump') continue;
      if (keyX(link.from) === tx && keyZ(link.from) === tz) return keyLevel(link.from);
    }
    return null;
  }

  private arrivalsAt(key: TileKey): readonly NavLink[] {
    if (this.arrivalsVersion !== this.graph.version) {
      this.arrivals = new Map();
      for (const link of this.graph.links()) {
        const list = this.arrivals.get(link.to);
        if (list) list.push(link);
        else this.arrivals.set(link.to, [link]);
      }
      this.arrivalsVersion = this.graph.version;
    }
    return this.arrivals.get(key) ?? [];
  }

  /**
   * Was an dieser Kante einer Kachel im Weg steht, als Strecken in Metern —
   * `null`, wenn nichts: eine offene Tür ist zwei Stummel, eine Wand die
   * ganze Kante, eine Kante ins Leere oder über eine Stufe ebenso.
   */
  private barrier(key: TileKey, dir: Dir): Segment[] | null {
    const wall = this.graph.wall(key, dir);
    const edge = edgeOf(key, dir);
    if (wall) {
      if (wall.kind === 'door' && wall.open && !wall.barred) {
        const width = this.doorWidth(wall.id);
        const stub = Math.max(0, (TILE - width) / 2) / TILE;
        return [part(edge, 0, stub), part(edge, 1 - stub, 1)];
      }
      return [edge];
    }
    const next = neighbour(key, dir);
    const there = this.graph.tile(next);
    if (!there || this.graph.isBlocked(next)) {
      // Kein Boden nebenan — es sei denn, eine Treppe führt genau dort hinüber.
      return this.linked(key, next) ? null : [edge];
    }
    // Wie hoch der Boden an dieser Kante liegt, auf beiden Seiten: bei einer
    // Rampe vorn ihre ganze Höhe, hinten nichts, an den Seiten eine Kante.
    const hereRise = this.edgeRise(key, dir);
    const thereRise = this.edgeRise(next, opposite(dir));
    if (hereRise === null || thereRise === null) return [edge];
    if (Math.abs(thereRise - hereRise) > this.step && !this.linked(key, next)) return [edge];
    return null;
  }

  /** Die Feinhöhe einer Kachel an einer ihrer Kanten — `null` an der Seite einer Rampe. */
  private edgeRise(key: TileKey, dir: Dir): number | null {
    const ramp = this.ramps.get(key);
    if (!ramp) return this.graph.tile(key)?.rise ?? 0;
    if (dir === ramp.dir) return ramp.rise;
    if (dir === opposite(ramp.dir)) return 0;
    return null;
  }

  /** Ob eine Verbindung von dieser Kachel auf die Nachbarstelle (irgendeiner Etage) führt. */
  private linked(key: TileKey, next: TileKey): boolean {
    if (this.graph.features.links === false) return false;
    const tx = keyX(next),
      tz = keyZ(next);
    for (const exit of this.graph.linksFrom(key))
      if (exit.link.open && keyX(exit.to) === tx && keyZ(exit.to) === tz) return true;
    for (const link of this.arrivalsAt(key))
      if (link.open && link.both && keyX(link.from) === tx && keyZ(link.from) === tz) return true;
    return false;
  }

  /**
   * **Sichtlinie** auf einer Etage: keine massive Wand und keine geschlossene
   * Tür dazwischen; ein Fenster lässt den Blick durch. Über Etagen hinweg
   * sieht man nichts — die Decke ist Boden.
   */
  lineOfSight(a: FloorPoint, b: FloorPoint): boolean {
    if (a.level !== b.level) return false;
    let tx = tileIndexAt(a.x),
      tz = tileIndexAt(a.z);
    const ex = tileIndexAt(b.x),
      ez = tileIndexAt(b.z);
    const dx = b.x - a.x,
      dz = b.z - a.z;
    const stepX = dx > 0 ? 1 : -1,
      stepZ = dz > 0 ? 1 : -1;
    let tMaxX = dx !== 0 ? ((dx > 0 ? (tx + 1) * TILE : tx * TILE) - a.x) / dx : Infinity;
    let tMaxZ = dz !== 0 ? ((dz > 0 ? (tz + 1) * TILE : tz * TILE) - a.z) / dz : Infinity;
    const tDeltaX = dx !== 0 ? Math.abs(TILE / dx) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(TILE / dz) : Infinity;
    let guard = 0;
    while ((tx !== ex || tz !== ez) && guard++ < 4096) {
      const key = tileKey(tx, tz, a.level);
      let dir: Dir;
      if (tMaxX < tMaxZ) {
        dir = stepX > 0 ? DIR_E : DIR_W;
        tMaxX += tDeltaX;
        tx += stepX;
      } else {
        dir = stepZ > 0 ? DIR_S : DIR_N;
        tMaxZ += tDeltaZ;
        tz += stepZ;
      }
      const wall = this.graph.wall(key, dir);
      if (!wall) continue;
      if (wall.kind === 'window') continue;
      if (wall.kind === 'door' && wall.open && !wall.barred) continue;
      return false;
    }
    return true;
  }

  /** Die Tür, deren Kante einem Punkt am nächsten ist — für den Knopf „Benutzen". */
  nearestDoor(at: FloorPoint, reach: number): { id: string; distance: number } | null {
    const key = this.tile(at);
    const tx = keyX(key),
      tz = keyZ(key);
    let best: { id: string; distance: number } | null = null;
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const around = tileKey(tx + dx, tz + dz, at.level);
        for (const dir of DIRS) {
          const wall = this.graph.wall(around, dir);
          if (!wall || wall.kind !== 'door' || !wall.id) continue;
          const distance = pointSegmentDistance(at.x, at.z, edgeOf(around, dir));
          if (distance <= reach && (!best || distance < best.distance))
            best = { id: wall.id, distance };
        }
      }
    return best;
  }

  /** Die Kachel, auf der man zuletzt stand, wenn `at` keine hat — oder `NO_TILE`. */
  nearestTile(at: FloorPoint): TileKey {
    const y = this.graph.levelY(at.level);
    return this.graph.nearest(at.x, at.z, y + 0.1);
  }

  /** Wo man in einer Etage überhaupt stehen kann — die erste Kachel, die es gibt. */
  anyTile(level = 0): TileKey {
    for (const key of this.graph.tileKeys()) if (keyLevel(key) === level) return key;
    return NO_TILE;
  }
}

/** Wie weit ein Punkt auf einer schrägen Kachel in ihrer Richtung vorgerückt ist, 0…1. */
export function rampProgress(ramp: FloorRamp, x: number, z: number): number {
  const lx = x / TILE - ramp.tx,
    lz = z / TILE - ramp.tz;
  const along =
    dirX(ramp.dir) > 0 ? lx : dirX(ramp.dir) < 0 ? 1 - lx : dirZ(ramp.dir) > 0 ? lz : 1 - lz;
  return Math.max(0, Math.min(1, along));
}

/** Die Kante einer Kachel in Weltmetern. */
export function edgeOf(key: TileKey, dir: Dir): Segment {
  const x0 = keyX(key) * TILE,
    z0 = keyZ(key) * TILE;
  const x1 = x0 + TILE,
    z1 = z0 + TILE;
  if (dir === DIR_N) return { ax: x0, az: z0, bx: x1, bz: z0 };
  if (dir === DIR_S) return { ax: x0, az: z1, bx: x1, bz: z1 };
  if (dir === DIR_W) return { ax: x0, az: z0, bx: x0, bz: z1 };
  return { ax: x1, az: z0, bx: x1, bz: z1 };
}

function part(edge: Segment, from: number, to: number): Segment {
  return {
    ax: edge.ax + (edge.bx - edge.ax) * from,
    az: edge.az + (edge.bz - edge.az) * from,
    bx: edge.ax + (edge.bx - edge.ax) * to,
    bz: edge.az + (edge.bz - edge.az) * to,
  };
}
