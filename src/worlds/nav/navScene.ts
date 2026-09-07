import * as THREE from 'three';
import type { NavBox } from './navBake';
import { doorSpec, type DoorMaterial } from './navDoor';
import { wallState, type NavGraph } from './navGraph';
import type { NavLayer, NavLayerState } from './navLayers';
import { DEFAULT_RADIUS, cornerBlocked, shrinkFor, type PathPoint } from './navPath';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  NO_TILE,
  TILE,
  keyLevel,
  neighbour,
  wallDir,
  wallTile,
  type Dir,
  type TileKey,
} from './navTile';

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
  floor: number;
  wall: number;
  ledge: number;
  link: number;
  blocked: number;
}

export const NAV_DEBUG_COLORS: NavDebugColors = {
  tile: 0x39d0ff,
  floor: 0x3b7dff,
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
  radius = DEFAULT_RADIUS,
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'nav-debug';

  const tiles: number[] = [];
  /** Die **Fläche** statt ihres Umrisses — zwei Dreiecke je Kachel. */
  const floor: number[] = [];
  const walls: number[] = [];
  const ledges: number[] = [];
  /** Türen, nach Material getrennt: Holz sieht anders aus als Metall. */
  const doors = new Map<DoorMaterial, number[]>();
  const links: number[] = [];
  const blocked: number[] = [];
  const half = TILE / 2 - 0.08;
  /**
   * **Wie weit die betretbare Fläche von einer Wand abrückt** — genau so weit,
   * wie der Weg dort Abstand hält (`navPath.shrinkFor`).
   *
   * Das ist der sichtbare Teil derselben Sache: Eine Unity-Navmesh ist um den
   * Agentenradius von jeder Wand eingezogen, und man sieht ihr auf einen Blick
   * an, wo ein Körper wirklich hinkommt. Hier ist die Fläche ein Kachelgitter
   * und kennt keine halben Kacheln — also wird sie beim **Zeichnen**
   * eingezogen, und zwar mit derselben Zahl, mit der die Schnur später
   * einzieht. Zwei Zahlen dafür wären eine Ansicht, die etwas anderes zeigt,
   * als gelaufen wird.
   */
  const inset = Math.min(shrinkFor(radius), TILE / 2 - 0.05);

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

    // **Und dieselbe Kachel als Fläche**, sofern man sie betreten kann.
    //
    // Sie beantwortet eine andere Frage als der Umriss, und das ist der Grund,
    // warum es beide gibt: Ein Raster aus dünnen Linien zeigt, *wo* Kacheln
    // liegen; aus dreißig Metern Höhe sieht man darin aber nicht, wo **keine**
    // liegt. Genau das will man wissen, wenn ein Zombie durch eine Wand zu
    // wollen scheint — und genau dort fehlte die Antwort.
    if (graph.isBlocked(key)) continue;
    // **Und dort eingezogen, wo etwas steht.** Jede der vier Seiten einzeln:
    // Wo es weitergeht, reicht die Fläche bis an die Kachelgrenze und stößt
    // nahtlos an die der Nachbarin; wo eine Wand, eine zugezogene Tür oder gar
    // kein Boden ist, rückt sie ab. Was übrig bleibt, ist die Fläche, auf der
    // ein Körper mit diesem Halbmesser wirklich stehen kann.
    const minX = at.x - sideReach(graph, key, DIR_W, half, inset);
    const maxX = at.x + sideReach(graph, key, DIR_E, half, inset);
    const minZ = at.z - sideReach(graph, key, DIR_N, half, inset);
    const maxZ = at.z + sideReach(graph, key, DIR_S, half, inset);
    if (minX >= maxX || minZ >= maxZ) continue;
    // Etwas tiefer als die Linien: Eine Fläche auf derselben Höhe streitet sich
    // mit ihnen um jedes Pixel.
    const face = y - 0.01;
    tileFace(graph, key, { minX, maxX, minZ, maxZ, midX: at.x, midZ: at.z, y: face, inset }, floor);
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
    // **Eine Tür in ihrer eigenen Farbe**: Holz und Metall sehen auf der Karte
    // gleich aus und bedeuten für einen Zombie das Gegenteil voneinander
    // (`navDoor.ts`). Wer wissen will, warum einer außen herumläuft und der
    // nächste geradeaus durchbricht, sieht es hier und nirgends sonst.
    if (facts.kind === 'door') {
      const list = doors.get(facts.material) ?? [];
      list.push(...line);
      doors.set(facts.material, list);
      continue;
    }
    (facts.kind === 'window' ? ledges : walls).push(...line);
  }

  for (const link of graph.links()) {
    const from = graph.worldOf(link.from);
    const to = graph.worldOf(link.to);
    links.push(from.x, from.y + LIFT + 0.1, from.z, to.x, to.y + LIFT + 0.1, to.z);
  }

  // Jede Linienmenge trägt den Namen ihrer Ebene: daran schaltet
  // `applyNavLayers` sie an und aus, ohne etwas neu zu bauen.
  addFaces(group, 'floor', floor, colors.floor, 0.16);
  addLines(group, 'tiles', tiles, colors.tile, 0.35);
  addLines(group, 'blocked', blocked, colors.blocked, 0.9);
  addLines(group, 'walls', walls, colors.wall, 0.85);
  addLines(group, 'walls', ledges, colors.ledge, 0.8);
  for (const [material, line] of doors) addLines(group, 'walls', line, doorSpec(material).color, 1);
  addLines(group, 'links', links, colors.link, 0.9);
  return group;
}

/** Die Maße, aus denen die betretbare Fläche einer Kachel entsteht. */
interface FaceBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Die Kachelmitte — von ihr aus wird die Ecke gemessen. */
  midX: number;
  midZ: number;
  y: number;
  inset: number;
}

/**
 * **Die betretbare Fläche einer Kachel — mit ausgeschnittenen Ecken.**
 *
 * Die Seiten allein reichen nicht, und das ist der Fehler, den man von oben
 * sieht: An einer Wand entlang rückt die Fläche sauber ab, am **Kopfende**
 * derselben Wand nicht. Dort liegt eine Kachel, die auf allen vier Seiten frei
 * ist — nur steht die Stirnseite des Klotzes eben in ihrer Ecke, und ein
 * Zylinder, der dorthin plant, steckt darin.
 *
 * Deshalb wird jede der vier Ecken einzeln gefragt (`navPath.cornerBlocked` —
 * dieselbe Frage, die der Schnurzug an jedem Durchlass stellt), und wo etwas
 * steht, fehlt ein Quadrat von der Größe des Abstands. Aus einem Rechteck
 * werden dabei bis zu neun Felder eines 3 × 3-Rasters; die ausgesparten fallen
 * weg, der Rest wird wieder zusammengefasst — und wo keine Ecke besetzt ist,
 * bleibt es bei den zwei Dreiecken von vorher.
 */
function tileFace(graph: NavGraph, key: TileKey, box: FaceBox, out: number[]): void {
  const corners: [Dir, Dir][] = [
    [DIR_W, DIR_N],
    [DIR_E, DIR_N],
    [DIR_W, DIR_S],
    [DIR_E, DIR_S],
  ];
  const blocked = corners.map(([x, z]) => cornerBlocked(graph, key, x, z));
  // Die Schnittlinien: eine Abstandsbreite von der Kachelgrenze nach innen,
  // aber nie über die schon eingezogene Seite hinaus. Wo die Seite ohnehin
  // abrückt, fällt die Linie mit ihr zusammen, und das Eckfeld hat die Breite
  // null — die Ecke ist dann längst weg.
  const cutW = Math.max(box.minX, box.midX - TILE / 2 + box.inset);
  const cutE = Math.min(box.maxX, box.midX + TILE / 2 - box.inset);
  const cutN = Math.max(box.minZ, box.midZ - TILE / 2 + box.inset);
  const cutS = Math.min(box.maxZ, box.midZ + TILE / 2 - box.inset);
  const xs = [box.minX, Math.min(cutW, cutE), Math.max(cutW, cutE), box.maxX];
  const zs = [box.minZ, Math.min(cutN, cutS), Math.max(cutN, cutS), box.maxZ];

  /** Ob dieses Feld des Rasters übrig bleibt — nur Eckfelder fallen weg. */
  const keep = (i: number, j: number): boolean => {
    if (xs[i + 1]! - xs[i]! < 1e-6 || zs[j + 1]! - zs[j]! < 1e-6) return false;
    if (i === 1 || j === 1) return true;
    return !blocked[(i === 2 ? 1 : 0) + (j === 2 ? 2 : 0)];
  };

  // **Und dann wieder zusammengefasst**: erst waagerecht, dann über Zeilen
  // hinweg. Eine Kachel ohne besetzte Ecke ist damit genau ein Rechteck wie
  // vorher — neun Rechtecke je Kachel wären in der Brille dreitausend
  // Dreiecke, wo dreihundert reichen.
  for (let j = 0; j < 3;) {
    const row = runsIn(keep, j);
    if (row.length === 0) {
      j++;
      continue;
    }
    let end = j + 1;
    while (end < 3 && sameRuns(runsIn(keep, end), row)) end++;
    for (const [from, to] of row) quad(out, xs[from]!, xs[to]!, zs[j]!, zs[end]!, box.y);
    j = end;
  }
}

/** Die zusammenhängenden Stücke einer Zeile, als Paare von Schnittlinien. */
function runsIn(keep: (i: number, j: number) => boolean, j: number): [number, number][] {
  const runs: [number, number][] = [];
  for (let i = 0; i < 3; i++) {
    if (!keep(i, j)) continue;
    const last = runs[runs.length - 1];
    if (last && last[1] === i) last[1] = i + 1;
    else runs.push([i, i + 1]);
  }
  return runs;
}

function sameRuns(a: readonly [number, number][], b: readonly [number, number][]): boolean {
  return a.length === b.length && a.every((run, i) => run[0] === b[i]![0] && run[1] === b[i]![1]);
}

/** Ein waagerechtes Rechteck als zwei Dreiecke. */
function quad(
  out: number[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  y: number,
): void {
  out.push(minX, y, minZ, maxX, y, minZ, maxX, y, maxZ);
  out.push(minX, y, minZ, maxX, y, maxZ, minX, y, maxZ);
}

/**
 * Wie weit die betretbare Fläche einer Kachel auf dieser Seite reicht.
 *
 * Bis kurz vor die Kachelgrenze, wenn es dort weitergeht — und um den
 * Wandabstand eingezogen, wenn nicht. „Weitergeht" heißt dabei dasselbe wie
 * überall in dieser Schicht: Es gibt dort Boden, es steht nichts darauf, und
 * dazwischen ist nichts, wofür man erst stehen bleiben müsste (eine
 * geschlossene Tür ist etwas, wofür man stehen bleibt).
 */
function sideReach(graph: NavGraph, key: TileKey, dir: Dir, half: number, inset: number): number {
  const next = neighbour(key, dir);
  if (next === NO_TILE || !graph.walkable(next)) return TILE / 2 - inset;
  const state = wallState(graph.wall(key, dir), true, _reach);
  if (!state.walk || state.cost > 0) return TILE / 2 - inset;
  return half;
}

/** Der Zustand, den `sideReach` viermal je Kachel füllt — einer reicht. */
const _reach = { walk: true, cost: 0, see: true, hear: 1 };

/**
 * Schaltet die Ebenen an und aus.
 *
 * Umgeschaltet wird die **Sichtbarkeit** und nicht die Geometrie: Ein Gitter
 * neu zu bauen, weil jemand die Wände sehen will, wäre bei ein paar tausend
 * Kacheln ein Ruckler je Knopfdruck.
 */
export function applyNavLayers(group: THREE.Object3D, state: NavLayerState): void {
  for (const child of group.children) {
    const layer = child.name as NavLayer;
    if (layer in state) child.visible = state[layer];
  }
}

/**
 * Eine Ebene aus **Flächen** statt aus Linien — dieselbe Buchhaltung, nur mit
 * Dreiecken.
 *
 * Durchsichtig und ohne Tiefenschreiben: Sie liegt über dem Boden und soll ihn
 * einfärben, nicht verdecken. `depthTest` bleibt dagegen **an**, anders als bei
 * den Linien: Eine Fläche, die durch jede Wand hindurchleuchtet, ist von oben
 * ein blauer Teppich über dem ganzen Labor und sagt gar nichts mehr.
 */
function addFaces(
  parent: THREE.Group,
  layer: NavLayer,
  points: number[],
  color: number,
  opacity: number,
): void {
  if (points.length === 0) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  mesh.name = layer;
  mesh.renderOrder = 895;
  parent.add(mesh);
}

function addLines(
  parent: THREE.Group,
  layer: NavLayer,
  points: number[],
  color: number,
  opacity: number,
): void {
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
  lines.name = layer;
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
 *
 * **Gezeichnet werden die Wegpunkte und nicht die Kachelmitten**
 * (`navPath.pullString`, `navAgent.points`). Der Unterschied ist der ganze
 * Zweck dieser Ebene: Eine Linie durch Kachelmitten schneidet jede Hausecke,
 * um die der Läufer in Wirklichkeit einen Bogen macht — sie sieht aus wie ein
 * Weg durch die Wand, und dann sucht man den Fehler in einer Wegsuche, die
 * gerade recht hatte. Die Höhe kommt weiter von der Kachel: Ein Wegpunkt hat
 * nur x und z, der Boden darunter hat eine Etage.
 */
export function navPathView(
  graph: NavGraph,
  route: readonly PathPoint[],
  color = 0x5ee0a0,
): THREE.Line {
  const points: number[] = [];
  for (const point of route) {
    const at = graph.worldOf(point.tile);
    points.push(point.x, at.y + LIFT + 0.25, point.z);
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
