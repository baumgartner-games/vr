import { wallState, type NavGraph } from '../nav/navGraph';
import { DIR_N, TILE, wallDir, wallTile, type TileKey } from '../nav/navTile';
import { toScreen, type MapBounds, type MapFit, type MapPoint, type MapSpot } from './mapFit';

/**
 * **Was auf einer Karte steht** — als reine Daten, ohne three.js und ohne
 * Canvas.
 *
 * Der Schnitt ist derselbe wie überall in diesem Projekt: Hier wird
 * *ausgewählt*, was eine Karte zeigt, in `mapFit.ts` wird gerechnet, *wo* es
 * landet, und in `mapPaint.ts` wird gemalt. Drei Stellen, von denen zwei ohne
 * Bildschirm prüfbar sind — und die Auswahl ist die, an der man sich irrt: Ob
 * eine geschlossene Tür als Wand gilt, ob eine gesperrte Kachel noch begehbar
 * aussieht, ob eine Wand zwischen zwei Kacheln zweimal gezeichnet wird.
 *
 * **Die Karte kommt aus dem Navigationsgitter und nicht aus der Geometrie.**
 * Das ist die Entscheidung, an der hängt, dass sie für **jede** Welt
 * funktioniert: Ein Grundriss aus Dreiecken müsste jede Welt eigens
 * herrichten — welche Wand zählt, welche Deko nicht —, während das Gitter
 * schon die Antwort auf genau diese Frage ist. Es wird beim Laden aus den
 * Quadern abgetastet (`nav/navBake.ts`), es weiß, wo Boden ist, wo eine Sperre
 * steht und wo eine Verbindung nach oben führt. Eine Welt bekommt ihre Karte
 * damit umsonst, sobald sie ein Gitter hat.
 *
 * Was die Karte **nicht** aus dem Gitter bekommt, ist alles, was sich bewegt:
 * wer wo steht, welchen Weg er läuft, wo ein Knopf ist. Das reicht die Welt
 * dazu (`marks`, `paths`) — und weil es dieselbe Liste ist, kann eine
 * Minikarte in der Brille dasselbe zeigen wie die Seite im Browser.
 */

/** Eine Kachel, wie die Karte sie zeichnet. */
export interface MapTile extends MapSpot {
  /** Die Etage (`nav/navTile.ts`) — die oberste liegt auf der Karte oben. */
  level: number;
  /**
   * Und ihre Höhe in Metern.
   *
   * Die Karte selbst braucht sie nicht — sie zeichnet von oben. Wer aber auf
   * die Karte **tippt**, meint einen Punkt in der Welt, und der hat eine Höhe:
   * ein Tipp auf das Dach setzt das Ziel aufs Dach und nicht in den Raum
   * darunter.
   */
  y: number;
  /** Gerade versperrt: eine Kiste steht darauf, ein Gitter ist zu. */
  blocked: boolean;
  /**
   * Was es kostet, hier hindurchzugehen — 0 heißt: nichts.
   *
   * Die Stachelgrube im Labor ist genau das: Boden, den man betreten *kann*
   * und der einen etwas kostet (`nav/navProfile.ts`). Auf der Karte muss man
   * ihn sehen, sonst sieht ein Umweg nach einem Fehler in der Wegsuche aus.
   */
  hazard: number;
}

/** Eine Linie auf der Karte: eine Wand, eine Kante, eine Verbindung. */
export interface MapLine {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}

/** Wofür eine Marke steht — der Zeichner gibt jeder ihre Form. */
export type MapMarkKind = 'npc' | 'player' | 'target' | 'button' | 'point';

/** Etwas, das auf der Karte steht und sich womöglich bewegt. */
export interface MapMark extends MapSpot {
  kind: MapMarkKind;
  /**
   * Wer sie gesetzt hat — die Kennung, mit der ein Tipp darauf wieder etwas
   * findet.
   *
   * Eine Karte trägt **keine Handgriffe**: Sie ist ein Bild aus Zahlen und
   * kein Bedienfeld, und ein Rückruf darin wäre die Stelle, an der eine
   * Minikarte in der Brille plötzlich eine Welt startet. Die Kennung ist das
   * Gegenstück dazu — wer sie vergeben hat, weiß, was zu tun ist
   * (`livePreview.ts`: `PreviewButton.id`).
   */
  id?: string;
  /** Seine Farbe, als Zahl wie überall im Spiel. */
  color: number;
  /** Was danebensteht — leer heißt: nur der Punkt. */
  label?: string;
  /**
   * Wie voll sein Lebensbalken ist, 0 bis 1 — nur bei NPCs, und `undefined`
   * bei allem, was keine Leben hat.
   */
  health?: number;
  /** Wohin er schaut, im Bogenmaß um die Hochachse — für den Spielerpfeil. */
  yaw?: number;
}

/** Alles, was eine Karte zeigt. */
export interface MapScene {
  bounds: MapBounds;
  /** Die Kantenlänge einer Kachel in Metern (`TILE`). */
  tile: number;
  tiles: MapTile[];
  /** Was den Weg sperrt. */
  walls: MapLine[];
  /** Fensterbänke, Absätze — Kanten, über die man sieht, aber nicht geht. */
  ledges: MapLine[];
  /** Treppen, Absprünge, Portale. */
  links: MapLine[];
  /** Die Wege, die gerade gelaufen werden. */
  paths: MapSpot[][];
  marks: MapMark[];
}

/** Welche Ebenen eine Karte zeichnet. Dieselben Namen wie im Menü. */
export interface MapLayers {
  tiles: boolean;
  walls: boolean;
  links: boolean;
  paths: boolean;
}

export function defaultMapLayers(): MapLayers {
  return { tiles: true, walls: true, links: true, paths: true };
}

/** Eine leere Karte — für eine Welt ohne Gitter. */
export function emptyScene(): MapScene {
  return {
    bounds: { minX: 0, minZ: 0, maxX: 0, maxZ: 0 },
    tile: TILE,
    tiles: [],
    walls: [],
    ledges: [],
    links: [],
    paths: [],
    marks: [],
  };
}

/**
 * Die Karte einer Welt, aus ihrem Gitter gelesen.
 *
 * **Eine Wand wird einmal gezeichnet und nicht zweimal.** Im Gitter gehört
 * jede Wand genau einer Kachel und einer Richtung (Nord oder Ost, `navTile.ts`
 * kennt nur diese beiden als Besitz), also fällt das hier von selbst richtig
 * heraus — man muss es nur nicht selbst nachbauen.
 *
 * **Eine offene Tür ist keine Wand.** Dieselbe Zeile wie in der 3D-Ansicht
 * (`nav/navScene.ts`): Was begehbar ist und nichts kostet, wird nicht
 * gezeichnet. Sonst stünde im Labor eine Wand quer im Durchgang, durch den man
 * gerade jemanden laufen sieht — und man suchte den Fehler in der Wegsuche.
 */
export function sceneFromGraph(graph: NavGraph, bounds?: MapBounds): MapScene {
  const scene = emptyScene();
  const half = TILE / 2;

  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;

  for (const key of graph.tileKeys()) {
    const at = graph.worldOf(key);
    scene.tiles.push({
      x: at.x,
      z: at.z,
      y: at.y,
      level: levelOf(graph, key),
      blocked: graph.isBlocked(key),
      hazard: graph.tile(key)?.hazard ?? 0,
    });
    minX = Math.min(minX, at.x - half);
    minZ = Math.min(minZ, at.z - half);
    maxX = Math.max(maxX, at.x + half);
    maxZ = Math.max(maxZ, at.z + half);
  }

  // Dieselbe Prüfung wie in der 3D-Ansicht, mit demselben Wegwerf-Objekt: Das
  // hier läuft über jede Wand jeder Karte, und eine frische Zuweisung je Wand
  // wäre bei Dust ein paar tausend Objekte für nichts.
  const scratch = { walk: true, cost: 0, see: true, hear: 1 };
  for (const [wall, facts] of graph.wallEntries()) {
    const state = wallState(facts, true, scratch);
    if (state.walk && state.cost === 0) continue;
    const at = graph.worldOf(wallTile(wall));
    const line =
      wallDir(wall) === DIR_N
        ? { ax: at.x - half, az: at.z - half, bx: at.x + half, bz: at.z - half }
        : { ax: at.x + half, az: at.z - half, bx: at.x + half, bz: at.z + half };
    (facts.kind === 'window' ? scene.ledges : scene.walls).push(line);
  }

  for (const link of graph.links()) {
    const from = graph.worldOf(link.from);
    const to = graph.worldOf(link.to);
    scene.links.push({ ax: from.x, az: from.z, bx: to.x, bz: to.z });
  }

  scene.bounds = bounds ?? {
    minX: Number.isFinite(minX) ? minX : 0,
    minZ: Number.isFinite(minZ) ? minZ : 0,
    maxX: Number.isFinite(maxX) ? maxX : 0,
    maxZ: Number.isFinite(maxZ) ? maxZ : 0,
  };
  return scene;
}

/**
 * **Welche Marke ein Tipp meint** — die nächste innerhalb eines Radius, in
 * Bildpunkten gemessen.
 *
 * In Bildpunkten und nicht in Metern, und das ist der Punkt: Ein Daumen ist
 * einen knappen Zentimeter breit, egal wie groß die Karte gerade eingepasst
 * ist. Ein Radius in Metern wäre auf einer weit herausgezoomten Karte ein
 * Punkt und auf einer nahen die halbe Halle.
 *
 * Die **nächste** und nicht die erste: Zwei Knöpfe stehen im Labor drei Meter
 * auseinander, und auf einem Telefon sind das acht Bildpunkte.
 */
export function markAt(
  marks: readonly MapMark[],
  fit: MapFit,
  point: MapPoint,
  radius: number,
  kind?: MapMarkKind,
): MapMark | null {
  let best: MapMark | null = null;
  let nearest = radius * radius;
  const at = { x: 0, y: 0 };
  for (const mark of marks) {
    if (kind && mark.kind !== kind) continue;
    toScreen(fit, mark, at);
    const gap = (at.x - point.x) ** 2 + (at.y - point.y) ** 2;
    if (gap > nearest) continue;
    nearest = gap;
    best = mark;
  }
  return best;
}

/**
 * **Welche Kachel ein Punkt meint** — für den Finger auf der Karte.
 *
 * Gesucht wird im Umkreis einer Kachel, und unter mehreren gewinnt die
 * **oberste**: Wo ein Dach über einem Raum liegt, sieht man von oben das Dach,
 * und man meint das, was man sieht. `null`, wenn dort kein Boden ist — dann
 * hat jemand auf eine Wand oder ins Leere getippt.
 */
export function tileAt(scene: MapScene, spot: MapSpot): MapTile | null {
  let best: MapTile | null = null;
  const reach = scene.tile * scene.tile;
  for (const tile of scene.tiles) {
    const gap = (tile.x - spot.x) ** 2 + (tile.z - spot.z) ** 2;
    if (gap > reach) continue;
    if (best && best.level > tile.level) continue;
    if (best && best.level === tile.level) {
      const near = (best.x - spot.x) ** 2 + (best.z - spot.z) ** 2;
      if (near <= gap) continue;
    }
    best = tile;
  }
  return best;
}

/** Kachelschlüssel → Weltpunkte, für die Wege der NPCs. */
export function pathSpots(graph: NavGraph, path: readonly TileKey[]): MapSpot[] {
  return [...path].map((key) => {
    const at = graph.worldOf(key);
    return { x: at.x, z: at.z };
  });
}

/**
 * Auf welcher Etage eine Kachel liegt.
 *
 * Der Schlüssel weiß es (`keyLevel`), aber der Graph rechnet es sauberer aus
 * seinen Etagenhöhen zurück — und die Karte braucht die Zahl nur, um die
 * oberste Etage zuletzt zu zeichnen: Ein Dach gehört über das Erdgeschoss,
 * sonst liegt das Erdgeschoss darauf.
 */
function levelOf(graph: NavGraph, key: TileKey): number {
  const y = graph.worldOf(key).y;
  let best = 0;
  let gap = Infinity;
  for (let i = 0; i < graph.levels.length; i++) {
    const distance = Math.abs(graph.levels[i]! - y);
    if (distance >= gap) continue;
    gap = distance;
    best = i;
  }
  return best;
}
