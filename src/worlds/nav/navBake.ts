import { NavGraph, type WallKind } from './navGraph';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  LEVEL_MAX,
  NO_TILE,
  TILE,
  keyLevel,
  keyOnLevel,
  neighbour,
  tileIndexAt,
  tileKey,
  type Dir,
  type TileKey,
} from './navTile';

/**
 * **Aus einer gebauten Welt einen Kachelgraphen machen.**
 *
 * Die Welten dieses Projekts bestehen aus achsenparallelen Quadern — `slab()`
 * baut sie, `solids` sammelt sie. Damit muss keine Welt „auf Kacheln
 * umgebaut" werden: Es reicht, ihre Quader einmal abzutasten. Das ist
 * dasselbe Verfahren, mit dem Recast aus einer Level-Geometrie ein Navmesh
 * macht, nur ohne den Umweg über Voxel — bei lauter Kästen kann man die
 * Oberflächen direkt ausrechnen.
 *
 * **Abgetastet werden Säulen, nicht Räume.** Über jeder Kachelmitte werden
 * alle Deckel gesucht, die dort liegen: die Sandfläche bei y≈0, der Boden des
 * ersten Stocks bei 3,1, der des zweiten bei 6,2, das Dach bei 12,4. Jeder
 * davon wird eine Kachel auf seiner Etage — **sofern darüber genug Luft für
 * einen NPC ist**. Deshalb ist der Tunnel unter dem Sand eine eigene Kachel
 * und der Sand über ihm auch, und deshalb entsteht unter einem 1,2 m hohen
 * Vordach gar keine.
 *
 * **Die Kachelmitte entscheidet.** Ein Quader zählt als Boden, wenn er den
 * *Mittelpunkt* der Kachel überdeckt. Das ist absichtlich streng: Eine 32 cm
 * dünne Wand liegt fast nie auf einer Kachelmitte und macht damit keinen
 * Boden, den es nicht gibt; eine Kiste am Rand einer Kachel auch nicht. Wer
 * feiner will, braucht kleinere Kacheln und nicht mehr Abtastpunkte.
 *
 * **Was zwischen zwei Kacheln steht, wird einzeln gefragt.** Zwischen zwei
 * Kachelmitten wird auf halber Strecke geprüft, ob dort in Kopfhöhe etwas
 * steht — dann ist es eine Wand. Ist dort nichts, aber die beiden Böden
 * liegen verschieden hoch, wird der **Boden dazwischen abgetastet** und als
 * Verbindung eingetragen: wie viel es hinaufgeht und wie hoch die größte
 * einzelne Stufe darin ist.
 *
 * **Beurteilt wird dabei nichts.** Bis hierher entschied das Abtasten für
 * alle, was eine Treppe ist und was ein Absprung — und damit war eine Rampe
 * entweder für jeden begehbar oder für keinen. Jetzt misst es nur noch, und ob
 * da jemand hochkommt, entscheidet sein Profil (`navProfile.canTraverse`): Der
 * Zombie zieht sich die Stufe hoch, der Hamster bleibt davor, und die steile
 * Rampe ist für beide keine. Von den beiden Grenzen `climb` und `drop` ist
 * deshalb eine einzige übrig (`reach`), und die ist kein Urteil, sondern nur
 * noch die Frage, was überhaupt in der Karte landet.
 *
 * **Und über eine Lücke wird gesprungen.** Zwei Kacheln, zwischen denen auf
 * dieser Etage kein Boden liegt, bekommen eine Sprungverbindung — das ist der
 * Gang zwischen zwei Dächern, und bis hierher musste ihn jede Welt von Hand
 * eintragen (`navlab/scenarios.ts`). Wer springen kann, nimmt ihn; wer nicht,
 * sieht ihn gar nicht erst.
 *
 * **Eine Kante ist für die Navigation dasselbe wie ein Fenster.** Über eine
 * anderthalb Meter hohe Mauer sieht man hinweg, man geht aber nicht hindurch
 * — und genau das ist ein `window` (`navGraph.ts`). Es als `solid` zu
 * verbuchen hieße, dass NPCs über niedrige Mauern hinweg blind werden.
 */

/** Ein achsenparalleler Kasten in Weltkoordinaten. */
export interface NavBox {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface BakeOptions {
  /** Der Ausschnitt, der abgetastet wird, in Metern. */
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  /**
   * Die Welt-Y der Etagenböden.
   *
   * Eine Welt weiß, wie hoch ihre Stockwerke sind — Dust baut mit `STOREY =
   * 3.1`. Wer sie nicht angibt, bekommt sie geraten (`guessLevels`), und das
   * ist ehrlich gesagt nur die zweitbeste Antwort: Geraten wird aus den
   * Flächen, die es gibt, und ein Vordach kann dabei zur Etage werden.
   */
  levels?: readonly number[];
  /** Wie hoch ein NPC ist — wo weniger Luft ist, geht keiner. */
  height?: number;
  /**
   * Ab wann ein Höhenunterschied überhaupt einer ist, in Metern.
   *
   * Darunter sind zwei Kacheln schlicht Nachbarn, und das ist keine Feinheit,
   * sondern die halbe Rechenzeit: Eine hügelige Karte, die jede Fuge als
   * Verbindung einträgt, hat zehntausend Verbindungen und keine Aussage mehr.
   * Es ist zugleich die feinste Stufe, die ein Profil noch angeben kann
   * (`navProfile.CostProfile.stepUp`).
   */
  step?: number;
  /**
   * Bis zu welchem Höhenunterschied zwei Kacheln überhaupt noch verbunden
   * werden, in Metern.
   *
   * **Eine Zahl und nicht mehr zwei.** Hier standen einmal `climb` und `drop`
   * getrennt, und das war ein Urteil: „so hoch kommt man noch hinauf, so tief
   * noch hinunter". Weil das Abtasten aber nur zwei der vier Richtungen
   * abläuft, hing das Urteil an der Himmelsrichtung — eine vier Meter hohe
   * Kante, die von Westen kam, wurde eingetragen, dieselbe von Osten nicht.
   * Wer hinauf- oder hinunterkommt, entscheidet jetzt ohnehin das Profil
   * (`navProfile.canTraverse`); hier bleibt nur noch die Frage, ab wann eine
   * Kante keine mehr ist, sondern eine Hauswand.
   */
  reach?: number;
  /** Ob über Lücken hinweg Sprungverbindungen entstehen (`joinGap`). */
  leap?: boolean;
  /** Wie weit eine Fläche von einem Etagenboden weg sein darf, um dazuzugehören. */
  band?: number;
  /**
   * Wie **breit** einer ist, der hier durchgehen soll, in Metern.
   *
   * Siehe `edgeOpen`: Eine Lücke ist erst eine, wenn jemand hindurchpasst.
   */
  width?: number;
}

export const BAKE_DEFAULTS = {
  /** Etwas weniger als die 1,78 m des Zombies: Türstürze sollen zählen. */
  height: 1.7,
  /** Dieselbe Stufe, die der Character-Controller nimmt (`PhysicsLocomotion`). */
  step: 0.32,
  /**
   * **Was noch in die Karte kommt**, in Metern.
   *
   * Sechs, und die Zahl ist großzügig mit Absicht: Sie ist keine Entscheidung
   * mehr darüber, wer wo hinaufkommt (das steht im Profil), sondern nur noch
   * die Grenze, ab der eine Kante keine Kante mehr ist, sondern eine Hauswand.
   * Was darüber liegt, einzutragen, kostet Speicher für eine Verbindung, die
   * niemand je benutzt — ein Flieger nimmt ohnehin keine.
   */
  reach: 6,
  band: 1.6,
  /**
   * Schulterbreite. Ein Zombie ist 0,58 m dick (`npcKinds.ts`), ein Mensch
   * kaum weniger — 0,7 lässt beiden eine Handbreit Luft und erklärt jede
   * Lücke darunter für das, was sie ist: keine.
   */
  width: 0.7,
} as const;

/** Wie fein eine Kachelgrenze abgetastet wird, in Metern (`edgeOpen`). */
const EDGE_STEP = 0.1;

/** Was beim Abtasten herauskam — für die Meldung im Menü und die Debug-Ansicht. */
export interface BakeReport {
  graph: NavGraph;
  /** Wie viele Kachelsäulen abgetastet wurden. */
  columns: number;
  tiles: number;
  walls: number;
  links: number;
  /** Wie lange es gedauert hat, in Millisekunden. */
  millis: number;
}

/**
 * Tastet eine Welt ab und gibt den Graphen zurück.
 *
 * Läuft einmal beim Laden der Welt. Für Dust sind das bei 2,5 m Kacheln rund
 * tausend Säulen — das ist eine Sache von Millisekunden, und deshalb stellt
 * sich die Frage „wo speichere ich die Navdaten" hier gar nicht erst. Erst
 * wenn eine Welt quadratkilometergroß wird, lohnt sich `navSerial.ts`.
 */
export function bakeNav(boxes: readonly NavBox[], options: BakeOptions): BakeReport {
  const started = Date.now();
  const height = options.height ?? BAKE_DEFAULTS.height;
  const step = options.step ?? BAKE_DEFAULTS.step;
  const reach = options.reach ?? BAKE_DEFAULTS.reach;
  const band = options.band ?? BAKE_DEFAULTS.band;
  const width = options.width ?? BAKE_DEFAULTS.width;
  const leap = options.leap ?? true;

  const minX = tileIndexAt(options.bounds.minX);
  const maxX = tileIndexAt(options.bounds.maxX);
  const minZ = tileIndexAt(options.bounds.minZ);
  const maxZ = tileIndexAt(options.bounds.maxZ);

  const index = new ColumnIndex(boxes, options.bounds);
  const levels = options.levels
    ? [...options.levels]
    : guessLevels(index, minX, maxX, minZ, maxZ, height, band);
  const graph = new NavGraph(levels);

  // 1. Jede Säule abtasten und ihre Böden auf die Etagen verteilen.
  let columns = 0;
  for (let tx = minX; tx <= maxX; tx++) {
    for (let tz = minZ; tz <= maxZ; tz++) {
      columns++;
      const x = (tx + 0.5) * TILE;
      const z = (tz + 0.5) * TILE;
      for (const floor of floorsAt(index, x, z, height)) {
        const level = levelFor(levels, floor, band);
        if (level < 0) continue;
        const key = tileKey(tx, tz, level);
        const rise = floor - levels[level]!;
        const known = graph.tile(key);
        // Zwei Böden auf derselben Etage: der näher am Etagenboden gewinnt.
        if (known && Math.abs(known.rise) <= Math.abs(rise)) continue;
        graph.setTile(key, { rise });
      }
    }
  }

  // 2. Zwischen den Kacheln aufräumen: Wände, Rampen, Kanten, Sprünge.
  const limits = { height, step, reach, width };
  let links = 0;
  const keys = [...graph.tileKeys()];
  for (const key of keys) {
    for (const dir of [DIR_N, DIR_E] as const) {
      links += joinTiles(graph, index, key, dir, limits);
      if (leap) links += joinGap(graph, index, key, dir, limits);
    }
  }

  return {
    graph,
    columns,
    tiles: graph.size,
    walls: [...graph.wallEntries()].length,
    links,
    millis: Date.now() - started,
  };
}

/** Zwei Höhen gelten als dieselbe, wenn sie es auf den Zentimeter sind. */
const EVEN = 0.02;

/**
 * Verbindet eine Kachel mit ihrer Nachbarin — oder stellt eine Wand dazwischen.
 *
 * Gibt zurück, wie viele Verbindungen dabei entstanden sind. Nachbarn auf
 * derselben Etage, die gleich hoch liegen und nichts zwischen sich haben,
 * brauchen gar nichts: Die ergeben sich aus dem Gitter.
 */
function joinTiles(
  graph: NavGraph,
  index: ColumnIndex,
  key: TileKey,
  dir: Dir,
  limits: { height: number; step: number; reach: number; width: number },
): number {
  const other = neighbour(key, dir);
  if (other === NO_TILE) return 0;
  const here = graph.tile(key);
  if (!here) return 0;

  const hereY = graph.levelY(keyLevel(key)) + here.rise;
  const world = graph.worldOf(key);
  const there = graph.worldOf(other);
  const midX = (world.x + there.x) / 2;
  const midZ = (world.z + there.z) / 2;

  let links = 0;
  let sameLevelHandled = false;

  // Die Nachbarsäule kann auf mehreren Etagen Boden haben — die Kachel unter
  // dem Dach und die auf dem Dach. Jede wird einzeln gefragt.
  for (let level = 0; level < graph.levels.length; level++) {
    const candidate = keyOnLevel(other, level);
    const facts = graph.tile(candidate);
    if (!facts) continue;
    const thereY = graph.levelY(level) + facts.rise;
    const rise = thereY - hereY;
    const sameLevel = level === keyLevel(key);

    // Steht auf halber Strecke etwas in Kopfhöhe? Dann ist es eine Wand, und
    // zwar egal, wie hoch die beiden Böden liegen. Gefragt wird dabei nicht
    // ein Punkt, sondern die **Breite** der Lücke (`edgeOpen`).
    const low = Math.max(hereY, thereY) + 0.05;
    if (!edgeOpen(index, midX, midZ, dir, low, low + limits.height * 0.6, limits.width)) {
      if (sameLevel) {
        setBarrier(graph, key, dir, 'solid');
        sameLevelHandled = true;
      }
      continue;
    }

    if (sameLevel && Math.abs(rise) <= limits.step) {
      // Ebener Nachbar: das Gitter macht das von selbst.
      sameLevelHandled = true;
      continue;
    }

    if (sameLevel) {
      // Höhenunterschied auf derselben Etage: die Nachbarschaft aus dem Gitter
      // darf nicht gelten, sonst läuft er die Kante hoch wie eine Ebene.
      setBarrier(graph, key, dir, 'window');
      sameLevelHandled = true;
    }

    // Zu hoch, zu tief: Was hier steht, ist eine Hauswand und keine Kante.
    if (Math.abs(rise) > limits.reach) continue;

    // **Wie der Boden dazwischen verläuft** — die eine Messung, die aus
    // derselben Höhe zwei ganz verschiedene Sachen macht: eine Rampe aus
    // zwanzig Stufen und eine glatte Wand.
    const step = edgeStep(
      index,
      { x: world.x, z: world.z, y: hereY },
      { x: there.x, z: there.z, y: thereY },
      limits.height,
    );
    // **Ein Absatz ist derselbe, von welcher Seite man ihn auch ansieht.**
    //
    // Abgetastet werden nur zwei der vier Richtungen (N und O) — jede Grenze
    // gehört genau einer Kachel, sonst stünde jede Wand zweimal da. Damit hing
    // aber, ob ein Absatz eine Treppe (hin und zurück) oder ein Absprung (nur
    // hinunter) wurde, an seiner **Himmelsrichtung**: Lag die höhere Kachel im
    // Norden oder Osten, kam man hinauf; lag sie im Süden oder Westen, war
    // dieselbe Stufe eine Einbahnstraße nach unten. In der halben Welt kam
    // niemand die Rampe hinauf, die er gerade heruntergefallen war — und man
    // suchte den Fehler in der Wegsuche, weil das Gitter ja eine Verbindung
    // zeigte.
    //
    // Eingetragen wird deshalb **beides in einem** und in beide Richtungen;
    // welche davon geht, sagt erst das Profil (`navProfile.canTraverse`). Die
    // Art ist dabei nur noch die Auskunft, ob der Boden durchläuft: Eine
    // **Kante** ist ein Absprung, auch von unten gesehen — wer sie hinaufkommt,
    // zieht sich hoch, und wer sie hinuntergeht, fällt. Eine **Rampe** ist eine
    // Treppe, hin wie zurück.
    const ledge = step >= Math.abs(rise) - EVEN;
    graph.addLink({
      id: `bake:${key}:${candidate}`,
      from: key,
      to: candidate,
      kind: ledge ? 'drop' : 'stairs',
      cost: TILE + Math.abs(rise) * (ledge ? 0.5 : 1),
      both: true,
      open: true,
      rise,
      step,
    });
    links++;
  }

  // Nachbar auf derselben Etage vorhanden, aber nichts davon hat gegriffen:
  // dann steht dort eine Wand, auch wenn niemand eine gebaut hat.
  if (!sameLevelHandled && graph.has(other)) setBarrier(graph, key, dir, 'solid');
  return links;
}

/**
 * Wie fein der Boden zwischen zwei Kachelmitten abgetastet wird, in Metern.
 *
 * Zehn Zentimeter, also fünfundzwanzig Punkte je Kante — und nur dort, wo
 * überhaupt ein Höhenunterschied ist. Feiner misst niemand: Zwei Stufen, die
 * enger beieinander stehen, sieht diese Messung als eine, und eine Rampe aus
 * Fünf-Zentimeter-Stufen steht deshalb mit zehn in der Karte. Das ist die
 * sichere Richtung — sie macht eine Kante eher zu hoch als zu niedrig.
 */
const GROUND_STEP = 0.1;

/**
 * **Die größte einzelne Stufe zwischen zwei Kachelmitten**, in Metern.
 *
 * Die Messung, an der eine Rampe und eine Mauer auseinandergehen. Beide gehen
 * 2,4 m hinauf; die eine tut es in zwanzig Schritten von zwölf Zentimetern,
 * die andere in einem. Der Höhenunterschied allein sagt das nicht — er ist bei
 * beiden derselbe —, und deshalb wird der Boden dazwischen wirklich abgelaufen.
 *
 * An jedem Messpunkt wird der Deckel genommen, der der geraden Verbindung
 * zwischen den beiden Enden am nächsten liegt (`floorsAt`). Das ist die
 * richtige Wahl in beiden schwierigen Fällen: Unter einer Brücke gewinnt die
 * Brücke, und an einer Kante gewinnt unten der Boden und oben der Klotz — die
 * Stufe steht dann in der Messung, wo sie in der Welt auch steht.
 *
 * Wo gar kein Deckel ist, wird nichts gemessen: Ein Loch dazwischen ist keine
 * Stufe, sondern eine Lücke, und über die springt man (`joinGap`).
 */
export function edgeStep(
  index: ColumnIndex,
  from: { x: number; z: number; y: number },
  to: { x: number; z: number; y: number },
  height: number,
): number {
  const count = Math.max(2, Math.round(Math.hypot(to.x - from.x, to.z - from.z) / GROUND_STEP));
  let previous = from.y;
  let biggest = 0;
  for (let i = 1; i < count; i++) {
    const share = i / count;
    const want = from.y + (to.y - from.y) * share;
    const floor = nearestFloor(
      floorsAt(index, from.x + (to.x - from.x) * share, from.z + (to.z - from.z) * share, height),
      want,
    );
    if (floor === null) continue;
    biggest = Math.max(biggest, Math.abs(floor - previous));
    previous = floor;
  }
  return Math.max(biggest, Math.abs(to.y - previous));
}

/** Der Boden, der einer Wunschhöhe am nächsten liegt — `null`, wo keiner ist. */
function nearestFloor(floors: readonly number[], want: number): number | null {
  let best: number | null = null;
  let bestGap = Infinity;
  for (const floor of floors) {
    const gap = Math.abs(floor - want);
    if (gap >= bestGap) continue;
    bestGap = gap;
    best = floor;
  }
  return best;
}

/**
 * **Der Sprung über eine Lücke** — zwei Kacheln, zwischen denen auf dieser
 * Etage kein Boden liegt.
 *
 * Das ist der Gang zwischen zwei Dächern, und bis hierher musste ihn jede Welt
 * von Hand eintragen: Im Labor stand dafür eine eigene Zeile mit zwei
 * Kachelmitten darin (`navlab/scenarios.ts`), und wer das Podest um eine
 * Kachel verschob, verschob den Sprung nicht mit. Gefunden wird er jetzt beim
 * Abtasten — genauso, wie Recast seine Off-Mesh-Links findet.
 *
 * **Genau eine Kachel Lücke**, nicht zwei: Fünf Meter von Mitte zu Mitte sind
 * schon eine sportliche Ansage (`CostProfile.leapOver`), und wer weiter
 * springen lässt, bekommt NPCs, die durch die halbe Karte fliegen.
 *
 * Verlangt wird dreierlei: dass die Kachel dazwischen auf dieser Etage
 * wirklich fehlt, dass drüben Boden ist — und dass in der Flugbahn nichts
 * steht. Ohne das Letzte spränge er durch die Wand, die genau in der Lücke
 * steht.
 */
function joinGap(
  graph: NavGraph,
  index: ColumnIndex,
  key: TileKey,
  dir: Dir,
  limits: { height: number; reach: number },
): number {
  const over = neighbour(key, dir);
  if (over === NO_TILE || graph.has(over)) return 0;
  const far = neighbour(over, dir);
  if (far === NO_TILE || !graph.has(far)) return 0;

  const here = graph.worldOf(key);
  const there = graph.worldOf(far);
  const rise = there.y - here.y;
  if (Math.abs(rise) > limits.reach) return 0;

  // In der Flugbahn darf nichts stehen: gemessen über der Lücke, von der
  // höheren der beiden Kanten aus aufwärts.
  const gap = graph.worldOf(over);
  const low = Math.max(here.y, there.y) + 0.05;
  if (index.blocks(gap.x, gap.z, low, low + limits.height * 0.6)) return 0;

  graph.addLink({
    id: `bake:leap:${key}:${far}`,
    from: key,
    to: far,
    kind: 'jump',
    cost: 2 * TILE,
    both: true,
    open: true,
    rise,
    step: Math.abs(rise),
    gap: 2 * TILE,
  });
  return 1;
}

/**
 * **Ob eine Lücke breit genug ist** — die Frage, die ein einzelner Messpunkt
 * nicht beantworten kann.
 *
 * Zwischen zwei Kachelmitten lag bis hierher genau ein Prüfpunkt: die Grenze
 * dazwischen. Steht dort nichts, war die Kachelgrenze offen — auch dann, wenn
 * links und rechts davon je einen Meter weit eine Mauer stand und der Schlitz
 * dazwischen zwanzig Zentimeter breit war. Auf der Karte war das ein Durchgang,
 * in der Welt eine Wand mit einem Guckloch, und der Zombie davor lief so lange
 * dagegen, bis jemandem auffiel, dass er durch eine Wand *wollte*.
 *
 * Deshalb wird jetzt **quer zur Laufrichtung** abgetastet: vom Mittelpunkt aus
 * nach beiden Seiten, bis etwas kommt oder die Kachel zu Ende ist. Was
 * dazwischen frei bleibt, ist die Lücke — und sie ist erst eine, wenn `width`
 * hindurchpasst.
 *
 * Gemessen wird nur der Streifen **um die Mitte herum**: Eine freie Ecke am
 * Rand der Kachelgrenze nützt niemandem, der von Kachelmitte zu Kachelmitte
 * läuft.
 */
export function edgeOpen(
  index: ColumnIndex,
  midX: number,
  midZ: number,
  dir: Dir,
  low: number,
  high: number,
  width: number,
): boolean {
  if (index.blocks(midX, midZ, low, high)) return false;
  // Die Grenze läuft quer zur Richtung: nach Norden und Süden liegt sie in X,
  // nach Osten und Westen in Z.
  const alongX = dir === DIR_N || dir === DIR_S;
  const reach = TILE / 2;
  let free = 0;
  for (const side of [-1, 1] as const) {
    let open = reach;
    for (let offset = EDGE_STEP; offset <= reach + 1e-9; offset += EDGE_STEP) {
      const x = alongX ? midX + side * offset : midX;
      const z = alongX ? midZ : midZ + side * offset;
      if (!index.blocks(x, z, low, high)) continue;
      // Bis zum letzten Punkt, von dem man weiß, dass er frei war.
      open = offset - EDGE_STEP;
      break;
    }
    free += open;
  }
  return free >= width;
}

/** Setzt eine Sperre, ohne eine schon vorhandene Tür zu überbauen. */
function setBarrier(graph: NavGraph, key: TileKey, dir: Dir, kind: WallKind): void {
  const existing = graph.wall(key, dir);
  if (existing && existing.kind === 'door') return;
  graph.setWall(key, dir, { kind, muffle: kind === 'window' ? 0 : 0.85 });
}

/**
 * Alle begehbaren Böden über einem Punkt, von unten nach oben.
 *
 * Ein Deckel ist begehbar, wenn über ihm genug Luft für einen NPC ist. Das ist
 * die eine Prüfung, wegen der ein Tunnel und der Sand darüber zwei Kacheln
 * sind und ein Kriechkeller gar keine.
 */
export function floorsAt(index: ColumnIndex, x: number, z: number, height: number): number[] {
  const over: NavBox[] = [];
  for (const box of index.at(x, z)) {
    if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
    over.push(box);
  }
  const tops = over.map((box) => box.maxY).sort((a, b) => a - b);

  const floors: number[] = [];
  for (const top of tops) {
    // Doppelte Deckel (zwei Platten übereinander) nur einmal.
    if (floors.length > 0 && top - floors[floors.length - 1]! < 0.06) continue;

    let buried = false;
    let ceiling = Infinity;
    for (const box of over) {
      // **Vergraben**: Auf diesem Deckel steht etwas — er liegt mitten in einem
      // anderen Kasten oder unmittelbar unter ihm. Das ist der Sand *unter* dem
      // Podest, das darauf steht, und es ist das Innere jeder Wand und jedes
      // Klotzes, der auf dem Boden steht.
      //
      // Die zweite Hälfte dieser Bedingung ist neu und der Grund dafür steht in
      // der Ansicht der begehbaren Flächen: Ein Klotz, der bei y=0 anfängt,
      // *straddelte* den Boden nicht — er saß genau darauf —, und damit blieb
      // unter jedem Klotz und in jeder aufsitzenden Wand eine Kachel übrig, die
      // es nicht gibt. Zugemauert war sie von allen Seiten, also lief niemand
      // hinein; sichtbar gemacht sieht man aber sofort, dass die Karte dort
      // Boden behauptet, wo Beton ist.
      if (box.minY < top + PROBE && box.maxY > top + PROBE) {
        buried = true;
        break;
      }
      if (box.minY >= top + PROBE && box.minY < ceiling) ceiling = box.minY;
    }
    if (buried) continue;
    if (ceiling - top >= height) floors.push(top);
  }
  return floors;
}

/** Wie viel Luft eine Prüfung nach oben und unten lässt, in Metern. */
const PROBE = 0.02;

/** Die Etage, zu der ein Boden gehört — `-1`, wenn keine nah genug ist. */
export function levelFor(levels: readonly number[], floor: number, band: number): number {
  let best = -1;
  let bestGap = band;
  for (let i = 0; i < levels.length; i++) {
    const gap = Math.abs(floor - levels[i]!);
    if (gap <= bestGap) {
      bestGap = gap;
      best = i;
    }
  }
  return best;
}

/**
 * Etagen raten, wenn die Welt keine nennt.
 *
 * Alle gefundenen Böden werden der Höhe nach gruppiert; jede Gruppe, die
 * genug Kacheln zusammenbringt, wird eine Etage. „Genug" hält Vordächer und
 * einzelne Podeste heraus — die werden dann zur Feinhöhe der Etage darunter,
 * und das ist genau richtig.
 */
export function guessLevels(
  index: ColumnIndex,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  height: number,
  band: number,
): number[] {
  const heights: number[] = [];
  for (let tx = minX; tx <= maxX; tx++) {
    for (let tz = minZ; tz <= maxZ; tz++) {
      heights.push(...floorsAt(index, (tx + 0.5) * TILE, (tz + 0.5) * TILE, height));
    }
  }
  if (heights.length === 0) return [0];
  heights.sort((a, b) => a - b);

  const groups: number[][] = [];
  for (const value of heights) {
    const last = groups[groups.length - 1];
    if (last && value - last[0]! <= band) last.push(value);
    else groups.push([value]);
  }
  // Eine Etage muss von mehr als einer Handvoll Säulen getragen werden.
  const floor = Math.max(3, Math.round(heights.length * 0.01));
  const levels = groups
    .filter((group) => group.length >= floor)
    .map((group) => group[Math.floor(group.length / 2)]!)
    .slice(0, LEVEL_MAX + 1);
  return levels.length > 0 ? levels : [heights[0]!];
}

/**
 * Ein Gitter über die Kästen, damit „was liegt über diesem Punkt" nicht jedes
 * Mal alle durchgeht.
 *
 * Ohne diesen Index kostet das Abtasten von tausend Säulen mal tausend Kästen
 * eine Million Prüfungen — mit ihm ein paar Dutzend je Säule. Das ist der
 * Unterschied zwischen „beim Laden" und „beim Laden merkt man es".
 */
export class ColumnIndex {
  private readonly cells = new Map<number, NavBox[]>();
  private readonly all: NavBox[] = [];

  constructor(boxes: readonly NavBox[], bounds: BakeOptions['bounds']) {
    for (const box of boxes) {
      if (box.maxX < bounds.minX || box.minX > bounds.maxX) continue;
      if (box.maxZ < bounds.minZ || box.minZ > bounds.maxZ) continue;
      this.all.push(box);
      const x0 = tileIndexAt(Math.max(box.minX, bounds.minX));
      const x1 = tileIndexAt(Math.min(box.maxX, bounds.maxX));
      const z0 = tileIndexAt(Math.max(box.minZ, bounds.minZ));
      const z1 = tileIndexAt(Math.min(box.maxZ, bounds.maxZ));
      for (let x = x0; x <= x1; x++) {
        for (let z = z0; z <= z1; z++) {
          const cell = cellKey(x, z);
          const list = this.cells.get(cell);
          if (list) list.push(box);
          else this.cells.set(cell, [box]);
        }
      }
    }
  }

  get size(): number {
    return this.all.length;
  }

  /** Die Kästen, die über dieser Stelle liegen könnten. */
  at(x: number, z: number): readonly NavBox[] {
    return this.cells.get(cellKey(tileIndexAt(x), tileIndexAt(z))) ?? EMPTY;
  }

  /** Ob an dieser Stelle zwischen zwei Höhen etwas steht. */
  blocks(x: number, z: number, low: number, high: number): boolean {
    for (const box of this.at(x, z)) {
      if (x < box.minX || x > box.maxX || z < box.minZ || z > box.maxZ) continue;
      if (box.maxY > low && box.minY < high) return true;
    }
    return false;
  }
}

const EMPTY: readonly NavBox[] = [];

function cellKey(x: number, z: number): number {
  return ((x + 1024) << 11) | (z + 1024);
}
