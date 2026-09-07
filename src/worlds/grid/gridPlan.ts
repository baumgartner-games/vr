import { planSolids } from '../editor/levelBuild';
import { doorName } from '../editor/levelPlan';
import { NavGraph, type TileFacts, type WallKind } from '../nav/navGraph';
import { connect, fillRect, setDoor, setWindow, wallRect, type NavRect } from '../nav/navBuild';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  TILE,
  dirX,
  dirZ,
  keyLevel,
  tileCentreX,
  tileCentreZ,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';
import { BLOCKS, blockRise, blockSolids, type BlockKind } from './blocks';
import { standing, type PlanSolid, type PlanSolidKind } from './solids';

/**
 * **Der Grundriss einer Welt** — Kacheln, Kanten, Bausteine und Massen.
 *
 * Bis hierher gab es zwei getrennte Sachen: den Bauplan des Bauplatzes, mit dem
 * man im Spiel Zimmer zieht (`editor/levelPlan.ts`), und die Welten, die ihre
 * Geometrie von Hand aus `slab()`-Aufrufen zusammensetzten. Das erste war
 * geprüft und das zweite nicht, und dazwischen lag genau der Graben, über den
 * jede größere Karte gestolpert ist: Der Schießstand kannte seine eigenen
 * zwölf Zahlen, Dust seine siebzehn, und keine davon ließ sich anschauen, ohne
 * die Brille aufzusetzen.
 *
 * `GridPlan` ist die Brücke. Eine Welt beschreibt sich in **Kacheln** und
 * bekommt drei Dinge geschenkt, die sie vorher einzeln erarbeiten musste:
 *
 * - **Die Navigationskarte ist der Grundriss selbst.** Kein Abtasten nötig, um
 *   zu wissen, wo eine Tür ist — sie steht im Plan (`nav/navGraph.ts`). Was ein
 *   Baustein der Kachel antut, steht dort ebenfalls: ein Podest hebt sie an,
 *   ein Tisch macht sie teurer, und der NPC weiß es, bevor er losläuft.
 * - **Gebaut wird aus einer Liste** (`solids()`), und das ist dieselbe Liste,
 *   aus der der Bauplatz seine Miniatur baut. Wer eine Karte klein sehen will,
 *   hat sie schon.
 * - **Geprüft wird ohne Brille.** Ein Grundriss ist Zahlen, und Zahlen kann man
 *   in Millisekunden nachrechnen. Das ist der eigentliche Zweck der Sache:
 *   Eine große Welt entsteht aus Blöcken, die einzeln geprüft sind, statt aus
 *   einem einzigen Stück, das man nur am Stück ausprobieren kann.
 *
 * **Gezählt wird in Kacheln, nicht in Metern.** Kachel `0` reicht von 0 bis
 * 2,5 m; ein Zimmer bei `x: -4, w: 8` steht also symmetrisch um die Null. Das
 * ist die eine Umgewöhnung — und sie ist es wert, denn sie ist der Grund,
 * warum eine Wand nie mehr einen halben Meter neben dem Boden steht.
 */

/** Ein Baustein an seinem Platz. */
export interface BlockPlacement {
  kind: BlockKind;
  tile: TileKey;
  dir: Dir;
  height?: number;
}

/**
 * **Eine Masse**: ein Quader über ein Kachelrechteck, von einer Höhe bis zu
 * einer anderen.
 *
 * Der ehrliche Ausweg für alles, was keine Kachelform hat und trotzdem am
 * Kachelraster klebt: das Dach über einer Halle, der Kugelfang hinter den
 * Scheiben, die Felswand rings um Dust. Ein Dach ist **ein** Quader und nicht
 * zweiundvierzig, und wer es in Kacheln zerlegte, um die Regel zu wahren,
 * hätte zweiundvierzig Körper in der Physik und nichts gewonnen.
 *
 * Sie klebt am Raster, weil ihre Kanten Kachelkanten sind — daneben bauen kann
 * man damit nicht.
 */
export interface Mass {
  kind: PlanSolidKind;
  rect: NavRect;
  /** Unterkante und Oberkante in Metern, gemessen vom Boden der Etage. */
  from: number;
  to: number;
  /** Ob ein Portal daran haftet — siehe `PlanSolid.portal`. */
  portal?: boolean;
}

/** Was ein Zimmer außer Boden noch bekommt. */
export interface RoomOptions {
  level?: number;
  /** Wände ringsherum. Ohne das ist es eine Fläche und kein Zimmer. */
  walls?: boolean | WallKind;
  /** Eine Decke darüber, als **ein** Quader — die Zahl ist ihre Unterkante. */
  ceiling?: number;
  /** Was auf den Kacheln gelten soll (Kosten, Gefahr, Feinhöhe). */
  facts?: Partial<TileFacts>;
}

export class GridPlan {
  /**
   * Der Graph — und er ist nicht *auch* die Karte, er **ist** die Karte.
   *
   * Öffentlich, weil eine Welt daran Sachen malen können muss, die in keiner
   * Geometrie stehen: Leitern, Stacheln, Absprünge (`nav/navBuild.ts`).
   */
  readonly graph: NavGraph;
  private readonly placed: BlockPlacement[] = [];
  private readonly masses: Mass[] = [];

  /**
   * @param levels Die Höhen der Etagen in Metern. Eine Welt ohne Stockwerke
   *   lässt es weg und bekommt eine einzige auf null.
   */
  constructor(levels: readonly number[] = [0]) {
    this.graph = new NavGraph(levels);
  }

  // --- der Grundriss ------------------------------------------------------

  /** Boden über ein Rechteck. */
  floor(rect: NavRect, facts: Partial<TileFacts> = {}): this {
    fillRect(this.graph, rect, facts);
    return this;
  }

  /**
   * **Ein Zimmer**: Boden, wahlweise Wände ringsum und eine Decke darüber.
   *
   * Der eine Handgriff, den jede Welt hier zwanzigmal braucht. Die Wände
   * stehen auf der **Außenseite** der Randkacheln (`wallRect`), damit man innen
   * überall hinkommt — wer das umdreht, baut ein Zimmer, dessen Randkacheln
   * unbetretbar sind, und wundert sich, warum die NPCs in der Mitte kleben.
   */
  room(rect: NavRect, options: RoomOptions = {}): this {
    const level = options.level ?? rect.level ?? 0;
    const at = { ...rect, level };
    this.floor(at, options.facts ?? {});
    if (options.walls) {
      wallRect(this.graph, at, options.walls === true ? 'solid' : options.walls);
    }
    if (options.ceiling !== undefined) {
      this.mass('wall', at, options.ceiling, options.ceiling + 0.3);
    }
    return this;
  }

  /** Eine Wand an eine Kante. */
  wall(x: number, z: number, dir: Dir, level = 0, kind: WallKind = 'solid'): this {
    this.graph.setWall(tileKey(x, z, level), dir, { kind });
    return this;
  }

  /**
   * Eine Tür in eine Kante — und sie steht immer in einer Wand.
   *
   * Der Name kommt aus der Kante (`doorName`) und ist damit stabil: dieselbe
   * Kante, dieselbe Tür, egal von welcher Seite jemand sie meint. Ohne Namen
   * könnte sich keine Meinung über sie irren (`nav/navBelief.ts`), und damit
   * fiele die halbe Hälfte dessen weg, was NPCs interessant macht.
   */
  door(x: number, z: number, dir: Dir, level = 0, open = true): this {
    const tile = tileKey(x, z, level);
    setDoor(this.graph, tile, dir, doorName(tile, dir), open);
    return this;
  }

  /** Ein Fenster: hält auf, verrät aber, was dahinter passiert. */
  window(x: number, z: number, dir: Dir, level = 0): this {
    setWindow(this.graph, tileKey(x, z, level), dir);
    return this;
  }

  /**
   * Eine Reihe gleicher Kanten am Stück — die Wand eines Ganges, ein Geländer
   * über vier Kacheln.
   *
   * `count` läuft nach Osten bzw. nach Süden, also in dieselbe Richtung wie
   * `NavRect` auch. Ohne diesen Handgriff steht in jeder Welt dieselbe
   * `for`-Schleife, und in jeder dritten mit einem Fehler am Ende.
   */
  run(
    x: number,
    z: number,
    count: number,
    along: 'x' | 'z',
    each: (px: number, pz: number, index: number) => void,
  ): this {
    for (let i = 0; i < count; i++) {
      each(along === 'x' ? x + i : x, along === 'z' ? z + i : z, i);
    }
    return this;
  }

  // --- was darauf steht ---------------------------------------------------

  /**
   * **Einen Baustein setzen.**
   *
   * Und weil er nicht nur aussieht, sondern im Weg steht, geht sein Aufschlag
   * gleich in die Kachel: Ein Tisch macht sie teurer, ein Podest hebt sie an.
   * Wer das trennte, hätte eine Karte, auf der NPCs durch Küchenzeilen laufen —
   * der Klassiker, und er fällt erst auf, wenn schon fünfzig davon herumstehen.
   */
  put(kind: BlockKind, x: number, z: number, dir: Dir, level = 0, height?: number): this {
    const tile = tileKey(x, z, level);
    this.placed.push({ kind, tile, dir, ...(height === undefined ? {} : { height }) });

    const facts = BLOCKS[kind];
    const rise = blockRise(kind, height);
    const was = this.graph.tile(tile);
    if (was || rise > 0) {
      this.graph.setTile(tile, {
        cost: (was?.cost ?? 1) * facts.cost,
        rise: (was?.rise ?? 0) + rise,
      });
    }
    return this;
  }

  /** Dieselbe Sorte über eine Reihe von Kacheln — die Küchenzeile ist selten eine Kachel lang. */
  putRun(
    kind: BlockKind,
    x: number,
    z: number,
    count: number,
    along: 'x' | 'z',
    dir: Dir,
    level = 0,
    height?: number,
  ): this {
    return this.run(x, z, count, along, (px, pz) => {
      this.put(kind, px, pz, dir, level, height);
    });
  }

  /**
   * **Eine Treppe von einer Etage in die nächste** — und alles drei, was dazu
   * gehört.
   *
   * Eine Treppe ist nie nur der Baustein. Sie braucht ein **Loch** in der Decke
   * darüber (sonst stößt man beim dritten Schritt mit dem Kopf an) und einen
   * **Weg im Graphen** (sonst steht ein NPC unten und weiß nicht, dass es nach
   * oben geht — Stockwerke haben in diesem Gitter absichtlich keine
   * Nachbarschaft, `navTile.ts`). Wer die drei Sachen einzeln macht, vergisst
   * die zweite, und der Fehler sieht danach aus wie ein kaputter
   * Character-Controller.
   *
   * **Nach dem Stockwerk darüber aufrufen**: Das Loch wird hier geschlagen,
   * und was danach noch Boden legt, legt ihn wieder zu.
   */
  stairs(x: number, z: number, dir: Dir, level = 0): this {
    const below = tileKey(x, z, level);
    const above = tileKey(x, z, level + 1);
    const rise = this.graph.levelY(level + 1) - this.graph.levelY(level);
    this.put('stairs', x, z, dir, level, rise);
    this.graph.removeTile(above);
    // Sie mündet auf der Kachel **vor** ihr: Die letzte Stufe liegt an der
    // vorderen Kante, und dort steht man dann auf der Etage darüber.
    const landing = tileKey(x + dirX(dir), z + dirZ(dir), level + 1);
    connect(this.graph, `treppe:${below}`, below, landing, 'stairs', { cost: rise * 1.6 });
    return this;
  }

  /** Eine Masse: ein Quader über ein Kachelrechteck. */
  mass(
    kind: PlanSolidKind,
    rect: NavRect,
    from: number,
    to: number,
    options: { portal?: boolean } = {},
  ): this {
    this.masses.push({ kind, rect, from, to, ...options });
    return this;
  }

  // --- und was daraus wird ------------------------------------------------

  /**
   * **Der ganze Plan als Quader.**
   *
   * Erst der Grundriss (Böden, Wände, Türen — `editor/levelBuild.ts`), dann die
   * Massen, dann die Bausteine. Die Reihenfolge ist keine Kosmetik: Wer die
   * Liste in eine Physik gibt, will den Boden zuerst hinlegen, damit nichts
   * eine Wand berührt, bevor es Boden gibt.
   */
  solids(): PlanSolid[] {
    const out = planSolids(this.graph);
    for (const one of this.masses) out.push(massSolid(this.graph, one));
    for (const one of this.placed) {
      out.push(
        ...blockSolids(one.kind, {
          x: tileCentreX(one.tile),
          z: tileCentreZ(one.tile),
          base: this.graph.levelY(keyLevel(one.tile)),
          dir: one.dir,
          ...(one.height === undefined ? {} : { height: one.height }),
        }),
      );
    }
    return out;
  }

  /** Die gesetzten Bausteine — für Welten, die noch etwas daran hängen wollen. */
  blocks(): readonly BlockPlacement[] {
    return this.placed;
  }
}

/** Eine Masse als Quader: Kachelkanten in Meter, Unter- und Oberkante in Höhe. */
function massSolid(graph: NavGraph, mass: Mass): PlanSolid {
  const { rect } = mass;
  const base = graph.levelY(rect.level ?? 0);
  const solid = standing(
    mass.kind,
    (rect.x + rect.w / 2) * TILE,
    base + mass.from,
    (rect.z + rect.d / 2) * TILE,
    rect.w * TILE,
    Math.max(0.01, mass.to - mass.from),
    rect.d * TILE,
  );
  return mass.portal === undefined ? solid : { ...solid, portal: mass.portal };
}

/** Die vier Richtungen, damit eine Welt sie nicht aus dem Kachelmodul holen muss. */
export { DIR_N, DIR_E, DIR_S, DIR_W, TILE };
export type { Dir, NavRect };
