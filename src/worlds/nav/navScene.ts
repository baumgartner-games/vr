import * as THREE from 'three';
import type { NavBox } from './navBake';
import { wallState, type NavGraph } from './navGraph';
import { DIR_N, TILE, keyLevel, wallDir, wallTile, type TileKey } from './navTile';

/**
 * **Die eine Datei der Navigationsschicht, die three.js kennt.**
 *
 * Alles andere unter `worlds/nav/` rechnet mit Zahlen und ist deshalb ohne
 * Brille prüfbar. Hier wird an zwei Stellen übersetzt, und nur an diesen
 * beiden: Was die Welt gebaut hat, wird zu Kästen für das Abtasten — und was
 * dabei herauskam, wird zu Linien, damit man es ansehen kann.
 *
 * Der zweite Teil ist kein Beiwerk. Ein Navigationsgitter, das man nicht sieht,
 * ist eines, dessen Fehler man an einem NPC sucht, der komisch läuft; und dort
 * findet man sie nie.
 */

/**
 * Die Kästen einer Welt, wie das Abtasten sie braucht.
 *
 * `Box3.setFromObject` liefert den achsenparallelen Umriss — bei den Quadern
 * dieses Projekts ist das der Quader selbst, bei einem gedrehten Ding sein
 * Schatten. Das ist die richtige Näherung für ein Kachelgitter: Wer eine
 * gedrehte Wand hat, will ohnehin, dass die Kacheln dahinter gesperrt sind.
 */
export function boxesFrom(objects: Iterable<THREE.Object3D>): NavBox[] {
  const boxes: NavBox[] = [];
  const box = new THREE.Box3();
  for (const object of objects) {
    object.updateWorldMatrix(true, false);
    box.setFromObject(object);
    if (box.isEmpty()) continue;
    boxes.push({
      minX: box.min.x,
      minY: box.min.y,
      minZ: box.min.z,
      maxX: box.max.x,
      maxY: box.max.y,
      maxZ: box.max.z,
    });
  }
  return boxes;
}

/** Wie weit über dem Boden die Linien liegen, damit sie nicht darin flimmern. */
const LIFT = 0.06;

export interface NavDebugColors {
  tile: number;
  wall: number;
  ledge: number;
  link: number;
  blocked: number;
}

export const NAV_DEBUG_COLORS: NavDebugColors = {
  tile: 0x39d0ff,
  wall: 0xff5a5a,
  ledge: 0xffc857,
  link: 0x9d7bff,
  blocked: 0xff3bd0,
};

/**
 * Das Gitter als Linien: Kacheln, Wände, Kanten, Verbindungen und alles, was
 * gerade gesperrt ist.
 *
 * Eine einzige `LineSegments` je Farbe und nicht ein Objekt je Kachel — bei
 * ein paar tausend Kacheln ist das der Unterschied zwischen einer Ansicht,
 * die man einschaltet, und einer, bei der die Bildrate einbricht und man sie
 * nie wieder einschaltet.
 */
export function navDebugView(
  graph: NavGraph,
  colors: NavDebugColors = NAV_DEBUG_COLORS,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'nav-debug';

  const tiles: number[] = [];
  const walls: number[] = [];
  const ledges: number[] = [];
  const links: number[] = [];
  const blocked: number[] = [];
  const half = TILE / 2 - 0.08;

  for (const key of graph.tileKeys()) {
    const at = graph.worldOf(key);
    const y = at.y + LIFT;
    const target = graph.isBlocked(key) ? blocked : tiles;
    // Ein Quadrat auf der Kachel: vier Linien, acht Punkte.
    const corners: [number, number][] = [
      [at.x - half, at.z - half],
      [at.x + half, at.z - half],
      [at.x + half, at.z + half],
      [at.x - half, at.z + half],
    ];
    for (let i = 0; i < 4; i++) {
      const a = corners[i]!;
      const b = corners[(i + 1) % 4]!;
      target.push(a[0], y, a[1], b[0], y, b[1]);
    }
  }

  const scratch = { walk: true, cost: 0, see: true, hear: 1 };
  for (const [wall, facts] of graph.wallEntries()) {
    const key = wallTile(wall);
    const at = graph.worldOf(key);
    const state = wallState(facts, true, scratch);
    // Eine Tür, die offen steht, ist keine Sperre und wird nicht gezeichnet.
    if (state.walk && state.cost === 0) continue;
    const y = at.y + LIFT;
    const north = wallDir(wall) === DIR_N;
    const line = north
      ? [at.x - half, y, at.z - TILE / 2, at.x + half, y, at.z - TILE / 2]
      : [at.x + TILE / 2, y, at.z - half, at.x + TILE / 2, y, at.z + half];
    (facts.kind === 'window' ? ledges : walls).push(...line);
  }

  for (const link of graph.links()) {
    const from = graph.worldOf(link.from);
    const to = graph.worldOf(link.to);
    links.push(from.x, from.y + LIFT + 0.1, from.z, to.x, to.y + LIFT + 0.1, to.z);
  }

  addLines(group, tiles, colors.tile, 0.35);
  addLines(group, blocked, colors.blocked, 0.9);
  addLines(group, walls, colors.wall, 0.85);
  addLines(group, ledges, colors.ledge, 0.8);
  addLines(group, links, colors.link, 0.9);
  return group;
}

function addLines(parent: THREE.Group, points: number[], color: number, opacity: number): void {
  if (points.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  // Über allem: ein Debug-Gitter, das hinter einer Wand verschwindet, hilft
  // genau dort nicht, wo man es braucht.
  lines.renderOrder = 900;
  parent.add(lines);
}

/**
 * Ein gefundener Weg als Linie.
 *
 * Getrennt vom Gitter, weil er sich jedes Mal ändert, wenn jemand neu plant —
 * und das Gitter bleibt dabei, wie es ist.
 */
export function navPathView(
  graph: NavGraph,
  tiles: readonly TileKey[],
  color = 0x5ee0a0,
): THREE.Line {
  const points: number[] = [];
  for (const key of tiles) {
    const at = graph.worldOf(key);
    points.push(at.x, at.y + LIFT + 0.25, at.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color, depthTest: false }));
  line.renderOrder = 901;
  line.name = 'nav-path';
  return line;
}

/**
 * Wie viele Kacheln auf welcher Etage liegen — für die Meldung im Menü.
 *
 * „1842 Kacheln" sagt einem wenig; „Erdgeschoss 900, 1. OG 420, Dach 180"
 * sagt sofort, ob das Abtasten die Stockwerke gefunden hat.
 */
export function levelCensus(graph: NavGraph): number[] {
  const counts = new Array<number>(graph.levels.length).fill(0);
  for (const key of graph.tileKeys()) {
    const level = keyLevel(key);
    counts[level] = (counts[level] ?? 0) + 1;
  }
  return counts;
}

/** Wo eine Kachel in der Welt liegt — bequem für alles, was three.js spricht. */
export function tileVector(graph: NavGraph, key: TileKey, target: THREE.Vector3): THREE.Vector3 {
  const at = graph.worldOf(key);
  return target.set(at.x, at.y, at.z);
}

/** Die Kachel unter einem Punkt in der Welt. */
export function tileUnder(graph: NavGraph, point: THREE.Vector3): TileKey {
  return graph.nearest(point.x, point.z, point.y);
}
