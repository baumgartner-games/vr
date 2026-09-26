import { planSolids } from '../editor/levelBuild';
import { doorName, PLAN_DOOR_W, replacePlan } from '../editor/levelPlan';
import { NavGraph, type TileFacts, type WallKind } from '../nav/navGraph';
import { connect, fillRect, setDoor, setWindow, wallRect, type NavRect } from '../nav/navBuild';
import {
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
  tileCentreX,
  tileCentreZ,
  tileKey,
  type Dir,
  type TileKey,
} from '../nav/navTile';
import { BLOCKS, blockRise, blockSolids, flightStepRise, type BlockKind } from './blocks';
import { FIXTURE_COST, fixtureKind, type FixturePlacement, type Props } from './fixtures/index';
import {
  slopeCorners,
  standing,
  type FloorCorner,
  type PlanSolid,
  type PlanSolidKind,
} from './solids';
import { boxCells, cellKey, type Slope } from '../nav/cellGrid';
import { PLAN_WALL_H, PLAN_WALL_T } from '../editor/levelPlan';

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
 * **Gezählt wird in Kacheln, nicht in Metern.** Seit eine Kachel einen Meter
 * misst, ist das fast dasselbe: Kachel `0` reicht von 0 bis 1 m, ein Zimmer bei
 * `x: -4, w: 8` steht symmetrisch um die Null und ist acht Meter breit. Der
 * Unterschied bleibt trotzdem wichtig — eine Kachel ist ganz oder gar nicht,
 * und das ist der Grund, warum eine Wand nie mehr einen halben Meter neben dem
 * Boden steht.
 */

/** Ein Baustein an seinem Platz. */
export interface BlockPlacement {
  kind: BlockKind;
  tile: TileKey;
  dir: Dir;
  height?: number;
  /**
   * **Wie weit über dem Boden seiner Etage er anfängt**, in Metern — fehlt,
   * wenn er auf dem Boden steht (`BlockSite.lift`).
   *
   * Die Zahl, die eine Treppe über mehrere Kacheln erst möglich macht: Die
   * dritte Kachel eines Laufs steigt von 1,4 auf 2,1 und nicht von null auf
   * 0,7. Sie steht auch in der Datei (`worldFile.ts`, Feld `y`) — ein Lauf,
   * der nach dem Speichern flach auf dem Boden läge, wäre keine Treppe mehr,
   * sondern vier Keile nebeneinander.
   */
  lift?: number;
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
  /**
   * **Zu welcher Etage sie fürs Aufschneiden zählt** (`core/cutaway.ts`).
   *
   * Ohne Angabe die Etage ihrer **Unterkante**, und das ist fast immer
   * richtig: Der Kugelfang steht im Erdgeschoss, die Felswand auch. Die
   * Ausnahme ist die **Decke** — sie ist der Boden des Stockwerks darüber und
   * verschwindet von oben mit ihm, nicht mit dem Raum darunter. `room()` trägt
   * das für ihre Decke selbst ein; wer eine von Hand baut, sagt es hier.
   */
  level?: number;
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
  /**
   * Die Einbauten — was auf dem Gitter einen Zustand hat
   * (`fixtures/index.ts`).
   *
   * Eine eigene Liste neben den Bausteinen und nicht dieselbe, obwohl beide
   * auf einer Kachel stehen und in eine Richtung schauen. Der Unterschied ist
   * die **Kennung**: Ein Einbau hat einen Namen, weil ein anderer auf ihn
   * zeigt (`props.target`), und er hat Eigenschaften, die niemand sonst
   * versteht. Beides in `BlockPlacement` zu schieben hieße, jeder Küchenzeile
   * ein leeres Eigenschaftsfach mitzugeben.
   */
  private readonly fitted: FixturePlacement[] = [];
  /** Die Massen. Heißt `stack`, weil `masses()` sie herausgibt. */
  private readonly stack: Mass[] = [];
  /**
   * **Die Wände unter 45°** — eine je Kachel, quer durch sie hindurch
   * (`nav/cellGrid.Slope`).
   *
   * Eine eigene Liste und kein Eintrag im Graphen: Der Graph kennt Kanten
   * zwischen Kacheln, und eine Schräge ist keine Kante, sondern teilt eine
   * Kachel. Was sie sperrt, sind zwei ihrer vier Zellen (`nav/cellGrid.ts`);
   * für die Wegsuche über ganze Kacheln macht sie die Kachel teuer
   * (`SLOPE_COST`), damit niemand hindurchplant, der nur Kacheln kennt.
   */
  private readonly slopeTiles = new Map<TileKey, Slope>();
  /**
   * **Halbe Böden unter Schrägen** (`halfFloor`): je Kachel die Ecke, deren
   * Dreieck leer bleibt. Nur Darstellung — Graph und Zellgitter bleiben, wie
   * sie sind.
   */
  private readonly halfFloors = new Map<TileKey, FloorCorner>();
  /**
   * Was auf einer Kachel gälte, wenn kein Baustein darauf stünde.
   *
   * Ohne diese Notiz wäre ein Baustein nicht wieder wegzunehmen: Sein
   * Aufschlag steckt in den Kacheldaten, und die kennen ihre eigene Herkunft
   * nicht. Wer im Editor eine Küchenzeile setzt und wieder löscht, hätte
   * sonst eine Kachel, die für immer teuer bleibt.
   */
  private readonly base = new Map<TileKey, { cost: number; rise: number }>();
  /** Wie oft ein Baustein gesetzt oder weggenommen wurde. */
  private edits = 0;

  /**
   * @param levels Die Höhen der Etagen in Metern. Eine Welt ohne Stockwerke
   *   lässt es weg und bekommt eine einzige auf null.
   */
  constructor(levels: readonly number[] = [0]) {
    this.graph = new NavGraph(levels);
    // Der Graph fragt die Schrägen beim Plan nach (`NavGraph.slopeAt`).
    this.graph.slopeAt = (key) => this.slopeTiles.get(key) ?? null;
  }

  /**
   * **Einen gespeicherten Graphen wieder zu einem Plan machen**, samt dem
   * Mobiliar, das daneben lag.
   *
   * Die eine Annahme dabei, und sie steht hier, weil sie sonst niemand sähe:
   * Die Kacheln des geladenen Graphen gelten als **blanker Boden**. Ihre
   * Kosten werden neu gerechnet, statt übernommen zu werden — und das ist
   * richtig, weil in den gespeicherten Kosten die Aufschläge der Bausteine
   * schon stecken. Wer sie übernähme und die Bausteine danach anwendete,
   * zählte jeden zweimal, und die Küche wäre nach dem zweiten Laden
   * unbegehbar. Eine Welt, die ihren Kacheln von Hand Kosten gibt, lädt sie
   * deshalb nicht über diesen Weg.
   */
  static from(
    graph: NavGraph,
    blocks: readonly BlockPlacement[] = [],
    fixtures: readonly FixturePlacement[] = [],
  ): GridPlan {
    const plan = new GridPlan(graph.levels);
    replacePlan(plan.graph, graph);
    for (const key of plan.graph.tileKeys()) plan.base.set(key, { cost: 1, rise: 0 });
    plan.loadBlocks(blocks);
    plan.loadFixtures(fixtures);
    return plan;
  }

  // --- der Grundriss ------------------------------------------------------

  /** Boden über ein Rechteck. */
  floor(rect: NavRect, facts: Partial<TileFacts> = {}): this {
    fillRect(this.graph, rect, facts);
    const level = rect.level ?? 0;
    for (let dz = 0; dz < rect.d; dz++) {
      for (let dx = 0; dx < rect.w; dx++) {
        const key = tileKey(rect.x + dx, rect.z + dz, level);
        this.base.set(key, { cost: facts.cost ?? 1, rise: facts.rise ?? 0 });
        this.refresh(key);
      }
    }
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
      // **Die Decke gehört dem Stockwerk darüber.** Von oben sieht man in ein
      // Zimmer nur hinein, wenn sein Deckel mit der Etage verschwindet, auf
      // der er liegt — und das ist die nächste, auch wenn es sie in dieser
      // Welt gar nicht gibt (das Dunkelhaus hat genau ein Geschoss und
      // trotzdem ein Dach).
      this.mass('wall', at, options.ceiling, options.ceiling + 0.3, { level: level + 1 });
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
   * **Eine Wand unter 45° quer durch eine Kachel** — `null` nimmt sie weg.
   *
   * Sie steht nur auf Boden: Eine Schräge im Nichts ist ein Fehler im Editor
   * oder in einer Welt, und er fällt hier auf statt als Wand in der Luft.
   *
   * `keepHalfFloor`: ein halber Boden darunter (`halfFloor`) bleibt, auch wenn
   * die Schräge weggeht — für Welten, deren Schrägen als Regalstücke stehen.
   */
  slope(x: number, z: number, slope: Slope | null, level = 0, keepHalfFloor = false): this {
    const key = tileKey(x, z, level);
    if (slope && !this.graph.has(key)) return this;
    if (slope) this.slopeTiles.set(key, slope);
    else if (!this.slopeTiles.delete(key)) return this;
    // Ein halber Boden gilt nur für die Diagonale, zu der er gehört — außer
    // die Schräge geht nur als Plan-Wand weg, weil an ihrer Stelle ein
    // Regalstück steht (`keepHalfFloor`, `shelfWalls.clearPlanWalls`).
    const half = this.halfFloors.get(key);
    if (half && !keepHalfFloor && (!slope || !slopeCorners(slope).includes(half)))
      this.halfFloors.delete(key);
    this.edits++;
    this.refresh(key);
    return this;
  }

  /**
   * **Den Boden unter einer Schräge halbieren** — `empty` ist die Ecke, deren
   * Dreieck leer bleibt, `null` macht ihn wieder ganz.
   *
   * Wunsch des Besitzers (September 2026): Auf einer Bodenkachel mit einer
   * Wand unter 45° soll die äußere Hälfte leer sein können, statt dass dort
   * eine ganze Platte übersteht. Es geht nur, wo eine Schräge steht, und nur
   * zu einer ihrer beiden Seiten (`slopeCorners`). Gehen ändert sich nicht:
   * Die äußeren Zellen der Kachel sperrt die Schräge schon.
   */
  halfFloor(x: number, z: number, empty: FloorCorner | null, level = 0): this {
    const key = tileKey(x, z, level);
    const slope = this.slopeTiles.get(key);
    if (empty && (!slope || !slopeCorners(slope).includes(empty))) return this;
    if (empty) {
      if (this.halfFloors.get(key) === empty) return this;
      this.halfFloors.set(key, empty);
    } else if (!this.halfFloors.delete(key)) return this;
    this.edits++;
    return this;
  }

  /** Die leere Ecke eines halben Bodens — `null` für einen ganzen. */
  halfFloorAt(key: TileKey): FloorCorner | null {
    return this.halfFloors.get(key) ?? null;
  }

  /**
   * **Die Zellen, auf denen etwas steht** (`nav/cellGrid.CellSource.blocked`)
   * — Möbel und feste Einbauten, als Schlüssel `ix,iz,Etage`.
   *
   * Aus den Quadern der Bausteine gerechnet und nicht aus einer zweiten
   * Maßtabelle: Was in der Welt steht, sperrt genau die Zellen, in die es
   * ragt (`boxCells`). Treppe, Rampe und Podest sperren nichts — auf ihnen
   * geht man —, und was niedriger ist als eine Stufe (30 cm), auch nicht.
   * Ein Einbau mit Körper (`kind.solid`) sperrt seine ganze Kachel.
   * Gerechnet wird je Stand des Plans einmal.
   */
  furnitureCells(): ReadonlySet<string> {
    if (this.furnitureAt === this.version) return this.furniture;
    const out = new Set<string>();
    for (const one of this.placed) {
      const facts = BLOCKS[one.kind];
      if (facts.steps || facts.rise > 0) continue;
      const level = keyLevel(one.tile);
      const base = this.graph.levelY(level);
      for (const solid of blockSolids(one.kind, {
        x: tileCentreX(one.tile),
        z: tileCentreZ(one.tile),
        base,
        dir: one.dir,
        ...(one.height === undefined ? {} : { height: one.height }),
        ...(one.lift === undefined ? {} : { lift: one.lift }),
      })) {
        for (const cell of furnitureCellsOf(solid, base)) out.add(cellKey(cell.ix, cell.iz, level));
      }
    }
    for (const one of this.fitted) {
      const kind = fixtureKind(one.kind);
      if (!kind || kind.door || !kind.solid(kind.init(one))) continue;
      const tile = fixtureTile(one);
      const x = tileCentreX(tile),
        z = tileCentreZ(tile);
      for (const cell of boxCells({ minX: x - 0.5, maxX: x + 0.5, minZ: z - 0.5, maxZ: z + 0.5 }))
        out.add(cellKey(cell.ix, cell.iz, one.level));
    }
    this.furniture = out;
    this.furnitureAt = this.version;
    return out;
  }

  private furniture: ReadonlySet<string> = new Set();
  private furnitureAt = -1;

  /**
   * **Die Treppe oder Rampe auf einer Kachel** — `null`, wenn dort keine
   * steht. Für das Gehen in der Ebene: ihre Seiten als Einbahnwände
   * (`planeMove.cellPlaneWalls`) und die Höhe, auf der man über sie geht
   * (`GridWorld.flightFloor`). Gerechnet wird je Stand des Plans einmal.
   */
  flightOn(tile: TileKey): (BlockPlacement & { kind: 'stairs' | 'ramp' }) | null {
    if (this.flightsAt !== this.version) {
      this.flights.clear();
      for (const one of this.placed)
        if (one.kind === 'stairs' || one.kind === 'ramp')
          this.flights.set(one.tile, one as BlockPlacement & { kind: 'stairs' | 'ramp' });
      this.flightsAt = this.version;
    }
    return this.flights.get(tile) ?? null;
  }

  private readonly flights = new Map<TileKey, BlockPlacement & { kind: 'stairs' | 'ramp' }>();
  private flightsAt = -1;

  /**
   * **Wie hoch man auf einer Treppe oder Rampe steht** — `null`, wenn unter
   * (`x`, `z`) keine ist; `footY` sagt, auf welcher Etage gefragt wird.
   *
   * Gewünscht: _„Der Spieler wird nur an der Höhe bewegt bei der Treppe."_ Auf
   * dem Lauf klettert also kein Controller Stufe für Stufe
   * (`PhysicsLocomotion.plane`), sondern die Höhe folgt einer Linie über die
   * **Vorderkanten** der Stufen: Unten steht man auf der ersten Stufe (so hoch
   * hob einen auch der Controller), oben auf der letzten, und dazwischen nie
   * in einer Stufe — wer seitlich heruntergeht, hängt an keiner Kante fest.
   */
  flightFloor(x: number, z: number, footY: number): number | null {
    const key = this.graph.at(x, z, footY);
    if (key === NO_TILE) return null;
    const flight = this.flightOn(key);
    if (!flight) return null;
    // Wie weit man in dieser Kachel den Lauf hinauf ist, 0 hinten bis 1 vorn.
    const u = x / TILE - keyX(key),
      v = z / TILE - keyZ(key);
    const along =
      flight.dir === DIR_N ? 1 - v : flight.dir === DIR_S ? v : flight.dir === DIR_E ? u : 1 - u;
    return this.flightY(key, flight, along);
  }

  /**
   * **Die Höhe eines Laufs** auf seiner Kachel `key`, `along` von 0 (das
   * untere Ende der Kachel) bis 1 (das obere) — die Rechnung hinter
   * `flightFloor` und `flightSideOpen`.
   */
  private flightY(
    key: TileKey,
    flight: BlockPlacement & { kind: 'stairs' | 'ramp' },
    along: number,
  ): number {
    const level = keyLevel(key);
    const height = flight.height ?? BLOCKS[flight.kind].height;
    const base = this.graph.levelY(level) + (flight.lift ?? 0);
    const y = base + flightStepRise(flight.kind, height) + clamp01(along) * height;
    // Die letzte Kachel endet auf ihrer obersten Stufe — dort liegt der Boden
    // der Etage darüber.
    const next = this.flightOn(
      tileKey(keyX(key) + dirX(flight.dir), keyZ(key) + dirZ(flight.dir), level),
    );
    return next && next.dir === flight.dir ? y : Math.min(y, base + height);
  }

  /**
   * **Ob man seitlich auf diese Hälfte einer Treppenkachel kommt** — von der
   * Kachel neben ihr in Richtung `side` aus. `part` 0 ist die untere Hälfte
   * der Seite (zum Fuß des Laufs hin), 1 die obere; eine Hälfte ist genau
   * eine Zelle, eine Seite also 2 × 1.
   *
   * Gewünscht: _„an der untersten Treppe … dass diese 2x2 Treppe über der
   * unteren 2x1 auch von beiden Seiten betreten werden kann — bzw. generell
   * Treppenarten, die auf einer der Ebenen anfangen"_. Die Regel dahinter:
   * **Offen ist eine Hälfte, auf der der Lauf höchstens eine Stufe
   * (`FLIGHT_SIDE_STEP`) über oder unter dem Boden daneben liegt** — dort
   * fängt ihn der Schritt ohnehin (`PhysicsLocomotion`, `FLIGHT_CATCH`). Bei
   * einer Treppe, die auf einer Etage anfängt, ist das die untere Hälfte ihrer
   * untersten Kachel (0,175 m bis 0,525 m), bei einer Rampe die ganze unterste
   * Kachel; neben einem Podest auf halber Höhe die Hälfte, die auf seiner Höhe
   * liegt. Überall sonst bleibt die Seite eine Wand von außen.
   *
   * Zu bleibt sie auch neben einem Lauf in eine andere Richtung und neben
   * einer Kachel, die nicht begehbar ist.
   */
  flightSideOpen(tile: TileKey, side: Dir, part: 0 | 1): boolean {
    const flight = this.flightOn(tile);
    if (!flight) return false;
    // Nur die beiden Seiten — Fuß und Kopf des Laufs sind ohnehin offen.
    if (side === flight.dir || side === (((flight.dir + 2) % 4) as Dir)) return false;
    const level = keyLevel(tile);
    const beside = tileKey(keyX(tile) + dirX(side), keyZ(tile) + dirZ(side), level);
    if (this.flightOn(beside)) return false;
    // Neben dem Grundriss trägt das Gelände, und das liegt auf der Etage.
    const facts = this.graph.tile(beside);
    if (facts && !this.graph.walkable(beside)) return false;
    const floor = this.graph.levelY(level) + (facts?.rise ?? 0);
    const low = this.flightY(tile, flight, part * 0.5);
    const high = this.flightY(tile, flight, part * 0.5 + 0.5);
    return low <= floor + FLIGHT_SIDE_STEP + 1e-6 && high >= floor - FLIGHT_SIDE_STEP - 1e-6;
  }

  /** Die Schräge einer Kachel, wenn eine darin steht. */
  slopeAt(key: TileKey): Slope | null {
    return this.slopeTiles.get(key) ?? null;
  }

  /** Alle Schrägen, zum Speichern (`worldFile.ts`). */
  saveSlopes(): Array<{ tile: TileKey; slope: Slope; empty?: FloorCorner }> {
    return [...this.slopeTiles].map(([tile, slope]) => {
      const empty = this.halfFloors.get(tile);
      return empty ? { tile, slope, empty } : { tile, slope };
    });
  }

  /** Und wieder zurück. Was auf einer Kachel steht, die es nicht gibt, fällt weg. */
  loadSlopes(list: ReadonlyArray<{ tile: TileKey; slope: Slope; empty?: FloorCorner }>): this {
    const touched = new Set<TileKey>(this.slopeTiles.keys());
    this.slopeTiles.clear();
    this.halfFloors.clear();
    for (const one of list) {
      if (!this.graph.has(one.tile)) continue;
      if (one.slope !== 'slash' && one.slope !== 'backslash') continue;
      this.slopeTiles.set(one.tile, one.slope);
      if (one.empty && slopeCorners(one.slope).includes(one.empty))
        this.halfFloors.set(one.tile, one.empty);
      touched.add(one.tile);
    }
    this.edits++;
    for (const tile of touched) this.refresh(tile);
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
  put(
    kind: BlockKind,
    x: number,
    z: number,
    dir: Dir,
    level = 0,
    height?: number,
    lift?: number,
  ): this {
    return this.putAt(kind, tileKey(x, z, level), dir, height, lift);
  }

  /** Dasselbe für eine Kachel, die man schon in der Hand hat. */
  putAt(kind: BlockKind, tile: TileKey, dir: Dir, height?: number, lift?: number): this {
    this.placed.push({
      kind,
      tile,
      dir,
      ...(height === undefined ? {} : { height }),
      ...(lift === undefined || lift === 0 ? {} : { lift }),
    });
    this.edits++;
    this.refresh(tile);
    return this;
  }

  /**
   * **Woran man erkennt, dass sich am Plan etwas getan hat.**
   *
   * Die Zahl des Graphen allein genügt nicht: Ein Baustein auf einer Kachel,
   * die schon Boden hat, ändert am Graphen nur die Kosten — und wer einen
   * setzt und im selben Atemzug wieder wegnimmt, landet dort, wo er
   * angefangen hat. Ein Editor, der daraufhin nicht neu baut, zeigt die
   * Küchenzeile weiter an, die es nicht mehr gibt.
   */
  get version(): number {
    return this.graph.version + this.edits;
  }

  /**
   * **Den obersten Baustein einer Kachel wieder wegnehmen.**
   *
   * Den obersten und nicht alle: Auf einer Kachel dürfen mehrere stehen — der
   * Schießstand hat auf jeder Bahn eine Bank *und* eine Trennwand —, und wer
   * löscht, meint das, was er zuletzt gesetzt hat. Gibt zurück, was weg ist,
   * damit die Meldung sagen kann, *was* verschwunden ist.
   */
  takeBlock(tile: TileKey): BlockPlacement | null {
    for (let i = this.placed.length - 1; i >= 0; i--) {
      if (this.placed[i]!.tile !== tile) continue;
      const [gone] = this.placed.splice(i, 1);
      this.edits++;
      this.refresh(tile);
      return gone ?? null;
    }
    return null;
  }

  /** Was auf dieser Kachel steht, von unten nach oben. */
  blocksOn(tile: TileKey): BlockPlacement[] {
    return this.placed.filter((one) => one.tile === tile);
  }

  // --- die Einbauten ------------------------------------------------------

  /** Die gesetzten Einbauten. */
  fixtures(): readonly FixturePlacement[] {
    return this.fitted;
  }

  /** Der Einbau mit dieser Kennung — `null`, wenn es ihn hier nicht gibt. */
  fixture(id: string): FixturePlacement | null {
    return this.fitted.find((one) => one.id === id) ?? null;
  }

  /** Was auf dieser Kachel eingebaut ist. */
  fixturesOn(tile: TileKey): FixturePlacement[] {
    return this.fitted.filter((one) => fixtureTile(one) === tile);
  }

  /**
   * **Einen Einbau setzen** — und er zählt im Graphen wie ein Baustein.
   *
   * Zwei Fälle, und der zweite ist der, dessentwegen das hier steht:
   *
   * - Was **fest** ist (`solid`), macht seine Kachel teuer, genau wie ein
   *   Tisch. Ein NPC geht dann außen herum, ohne dass jemand die Karte von
   *   Hand nachpinselt.
   * - Was eine **Tür** ist (`door`), wird zur Tür-Kante im Graphen
   *   (`door(..., open)`) und nicht zu teurem Boden. Erst damit weiß ein NPC,
   *   dass es dort durchgeht, wenn sie offen ist — und erst damit kann sich
   *   eine Meinung über sie irren (`nav/navBelief.ts`). Ohne diesen Zweig
   *   hätte man eine Tür, die man selbst aufdrücken kann und die für jeden
   *   NPC eine Wand ist.
   *
   * Die **Kennung** wird vergeben, wenn keine dabeisteht (`sign-1`, `sign-2`).
   * Wer auf einen Einbau zeigen will, gibt sie selbst an — eine gewachsene
   * Nummer ist kein Ziel, auf das man sich in einer `layout()` verlassen kann.
   */
  putFixture(request: FixtureRequest): FixturePlacement {
    const place: FixturePlacement = {
      id: request.id && request.id.length > 0 ? request.id : this.fixtureId(request.kind),
      kind: request.kind,
      x: request.x,
      z: request.z,
      dir: request.dir,
      level: request.level ?? 0,
      props: { ...(request.props ?? {}) },
    };
    // Zweimal dieselbe Kennung wäre ein Ziel, das zwei Türen aufmacht — die
    // ältere geht.
    const had = this.fitted.findIndex((one) => one.id === place.id);
    if (had >= 0) this.takeFixture(place.id);
    this.fitted.push(place);
    this.edits++;
    this.fitDoor(place);
    this.refresh(fixtureTile(place));
    return place;
  }

  /**
   * **Einen Einbau wieder wegnehmen.** Gibt zurück, was weg ist — damit die
   * Meldung sagen kann, *was* verschwunden ist.
   *
   * Eine Türkante geht dabei ganz weg und wird nicht wieder zur Wand: Der
   * Einbau *war* die Kante. Wer dort eine Wand will, malt eine.
   */
  takeFixture(id: string): FixturePlacement | null {
    const index = this.fitted.findIndex((one) => one.id === id);
    if (index < 0) return null;
    const [gone] = this.fitted.splice(index, 1);
    if (!gone) return null;
    this.edits++;
    if (fixtureKind(gone.kind)?.door) {
      this.graph.clearWall(fixtureTile(gone), gone.dir);
    }
    this.refresh(fixtureTile(gone));
    return gone;
  }

  /** Den zuletzt gesetzten Einbau dieser Kachel wegnehmen — der Radiergummi. */
  takeFixtureOn(tile: TileKey): FixturePlacement | null {
    for (let i = this.fitted.length - 1; i >= 0; i--) {
      const one = this.fitted[i]!;
      if (fixtureTile(one) === tile) return this.takeFixture(one.id);
    }
    return null;
  }

  /** Eine freie Kennung für diese Art — `sign-1`, `sign-2`, … */
  fixtureId(kind: string): string {
    for (let n = this.fitted.length + 1; ; n++) {
      const id = `${kind}-${n}`;
      if (!this.fitted.some((one) => one.id === id)) return id;
    }
  }

  /**
   * **Eine Türkante mit dem Zustand ihres Einbaus nachziehen** — das tut
   * `GridWorld` jedes Bild, in dem sich etwas bewegt hat.
   *
   * Sie steht hier und nicht dort, weil der Name der Tür aus der Kante kommt
   * (`doorName`) und damit dem Grundriss gehört: Wer ihn in der Welt noch
   * einmal ausrechnete, hätte zwei Stellen, die sich einig sein müssen.
   */
  setFixtureDoor(place: FixturePlacement, open: boolean): void {
    const tile = fixtureTile(place);
    const facts = this.graph.wall(tile, place.dir);
    if (!facts || facts.kind !== 'door' || facts.open === open) return;
    this.graph.setWall(tile, place.dir, { ...facts, open });
  }

  /** Die Einbauten zum Speichern — wie die Bausteine, getrennt vom Graphen. */
  saveFixtures(): FixturePlacement[] {
    return this.fitted.map((one) => ({ ...one, props: { ...one.props } }));
  }

  /** Und wieder zurück. Was auf einer Kachel steht, die es nicht gibt, fällt weg. */
  loadFixtures(list: readonly FixturePlacement[]): this {
    const touched = new Set<TileKey>(this.fitted.map((one) => fixtureTile(one)));
    this.fitted.length = 0;
    for (const one of list) {
      const tile = safeFixtureTile(one);
      if (tile === null || !this.graph.has(tile)) continue;
      if (this.fitted.some((had) => had.id === one.id)) continue;
      const place: FixturePlacement = { ...one, props: { ...one.props } };
      this.fitted.push(place);
      this.fitDoor(place);
      touched.add(tile);
    }
    this.edits++;
    for (const tile of touched) this.refresh(tile);
    return this;
  }

  /**
   * **Ein Klotz je Einbau, für die Miniatur.**
   *
   * Nicht in `solids()`: Was ein Einbau in der Welt ist, baut seine Art
   * (`build`), und derselbe Quader zweimal wäre ein Schild im Schild. Auf dem
   * Tischmodell dagegen steht nichts, wenn hier nichts steht — und ein Editor,
   * in dem das Gesetzte unsichtbar bleibt, ist einer, in dem man zweimal
   * setzt.
   */
  fixtureMarks(): PlanSolid[] {
    return this.fitted.map((one) =>
      standing(
        'glow',
        tileCentreX(fixtureTile(one)),
        this.graph.levelY(one.level),
        tileCentreZ(fixtureTile(one)),
        0.5,
        1.4,
        0.5,
      ),
    );
  }

  /** Die Türkante eines Einbaus anlegen, wenn seine Art eine ist. */
  private fitDoor(place: FixturePlacement): void {
    const kind = fixtureKind(place.kind);
    if (!kind?.door) return;
    const tile = fixtureTile(place);
    if (!this.graph.has(tile)) return;
    const open = kind.open ? kind.open(kind.init(place)) : true;
    setDoor(this.graph, tile, place.dir, doorName(tile, place.dir), open);
  }

  /**
   * Die Kacheldaten neu rechnen: Grundwert mal die Aufschläge dessen, was
   * darauf steht, plus deren Anhebung.
   *
   * Multiplikativ und nicht additiv, denn ein Aufschlag ist ein Faktor: Zwei
   * Möbel auf einer Kachel machen sie doppelt so mühsam und nicht um zwei
   * Meter länger.
   */
  private refresh(tile: TileKey): void {
    if (!this.graph.has(tile)) return;
    const base = this.base.get(tile) ?? { cost: 1, rise: 0 };
    let cost = base.cost;
    let rise = base.rise;
    for (const one of this.placed) {
      if (one.tile !== tile) continue;
      cost *= BLOCKS[one.kind].cost;
      rise += blockRise(one.kind, one.height, one.lift);
    }
    // **Ein fester Einbau zählt wie ein Baustein.** Eine Türkante zählt
    // dagegen gar nicht auf der Kachel — sie steht zwischen zweien, und ihre
    // Kosten sind die der Tür im Graphen (`DOOR_COST`).
    for (const one of this.fitted) {
      if (fixtureTile(one) !== tile) continue;
      const kind = fixtureKind(one.kind);
      if (!kind || kind.door) continue;
      if (kind.solid(kind.init(one))) cost *= kind.cost ?? FIXTURE_COST;
    }
    if (this.slopeTiles.has(tile)) cost *= SLOPE_COST;
    this.graph.setTile(tile, { cost, rise });
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
   * **Eine Treppe von einer Etage in die nächste** — über **mehrere Kacheln**,
   * und mit allem drei, was dazu gehört.
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
   *
   * **Und sie ist mehrere Kacheln lang.** Solange eine Kachel 2,5 m maß, ging
   * eine ganze Etage in eine einzige; auf einem Meter wären das Stufen von
   * sieben Zentimetern Tiefe, also eine Leiter. `length` sagt, über wie viele
   * Kacheln sie läuft — ohne Angabe so viele, dass keine mehr als
   * `STAIR_LIFT` steigt (bei 2,8 m Etagenhöhe also vier). `x, z` ist die
   * **unterste** Kachel, gestiegen wird nach `dir`.
   */
  stairs(x: number, z: number, dir: Dir, level = 0, length?: number): this {
    return this.flight('stairs', x, z, dir, level, length);
  }

  /**
   * **Dieselbe Sache flacher**: eine Rampe von einer Etage in die nächste.
   *
   * Sie nimmt je Kachel halb so viel Anstieg wie eine Treppe (`RAMP_LIFT`) und
   * wird dafür doppelt so lang. Wer sie kürzer will, sagt `length` — und
   * bekommt dann eben steilere Stufen darin.
   */
  ramp(x: number, z: number, dir: Dir, level = 0, length?: number): this {
    return this.flight('ramp', x, z, dir, level, length);
  }

  /**
   * **Ein Lauf über mehrere Kacheln** — der gemeinsame Kern von Treppe und
   * Rampe.
   *
   * Die Länge kommt aus dem Anstieg und der Kachelhöhe des Bausteins
   * (`BLOCKS[kind].height`): 2,8 m Etagenhöhe sind bei 0,7 m je Treppenkachel
   * genau vier Kacheln. Wer selbst eine Länge angibt, bekommt sie — eine
   * flachere Treppe ist ein gestalterischer Wunsch und kein Fehler.
   *
   * Jede Kachel bekommt ihren **Teilanstieg** (`height`) und ihren **Fuß**
   * (`lift`), im Graphen ihre Feinhöhe (`rise = lift`) und das Loch über sich.
   * Verbunden wird erst die **letzte**: Sie mündet auf der Kachel vor ihr, und
   * dort steht man auf der Etage darüber.
   */
  private flight(
    kind: 'stairs' | 'ramp',
    x: number,
    z: number,
    dir: Dir,
    level: number,
    length?: number,
  ): this {
    const rise = this.graph.levelY(level + 1) - this.graph.levelY(level);
    const steps = Math.max(1, length ?? Math.ceil(rise / BLOCKS[kind].height - 1e-9));
    const each = rise / steps;
    let last = tileKey(x, z, level);
    for (let i = 0; i < steps; i++) {
      const tx = x + dirX(dir) * i;
      const tz = z + dirZ(dir) * i;
      last = tileKey(tx, tz, level);
      this.put(kind, tx, tz, dir, level, each, each * i);
      // **Über jeder Stufe ein Loch**, nicht nur über der ersten: Wer den Lauf
      // hinaufgeht, stößt sonst auf halber Höhe mit dem Kopf an den Boden des
      // Stockwerks darüber — und ein Boden, unter dem eine Treppe durchführt,
      // ist genau der, den es dort nicht geben darf.
      this.graph.removeTile(tileKey(tx, tz, level + 1));
    }
    const landing = tileKey(x + dirX(dir) * steps, z + dirZ(dir) * steps, level + 1);
    connect(this.graph, `treppe:${last}`, last, landing, 'stairs', { cost: rise * 1.6 });
    return this;
  }

  /** Eine Masse: ein Quader über ein Kachelrechteck. */
  mass(
    kind: PlanSolidKind,
    rect: NavRect,
    from: number,
    to: number,
    options: { portal?: boolean; level?: number } = {},
  ): this {
    this.stack.push({ kind, rect, from, to, ...options });
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
  /** Wie breit die Türen dieses Plans sind — die Station überschreibt es (`haunting/plan.ts`). */
  doorWidth(): number {
    return PLAN_DOOR_W;
  }

  solids(): PlanSolid[] {
    const out = planSolids(this.graph, this.doorWidth());
    // Wände, Türen und Fenster sperrt das Zellgitter (`PlanSolid.cell`).
    for (const one of out) {
      if (one.kind !== 'floor') one.cell = true;
      else if (this.halfFloors.size > 0) {
        const tile = tileKey(Math.floor(one.x / TILE), Math.floor(one.z / TILE), one.level ?? 0);
        const half = this.halfFloors.get(tile);
        if (half) one.half = half;
      }
    }
    for (const one of this.stack) out.push(massSolid(this.graph, one));
    for (const one of this.placed) {
      // **Ein Baustein steht auf der Ebene seiner Kachel** — die Brüstung auf
      // dem Podest verschwindet von oben mit dem Podest, die Treppe darunter
      // bleibt stehen (`core/cutaway.ts`).
      const level = keyLevel(one.tile);
      for (const solid of blockSolids(one.kind, {
        x: tileCentreX(one.tile),
        z: tileCentreZ(one.tile),
        base: this.graph.levelY(level),
        dir: one.dir,
        ...(one.height === undefined ? {} : { height: one.height }),
        ...(one.lift === undefined ? {} : { lift: one.lift }),
      })) {
        solid.level = level;
        // Möbel sperren ihre Zellen (`furnitureCells`) — dieselbe Regel hier:
        // Was keine Zelle sperrt (ein dünnes Geländer), bleibt Physik.
        const facts = BLOCKS[one.kind];
        const base = this.graph.levelY(level);
        if (!facts.steps && facts.rise === 0 && furnitureCellsOf(solid, base).length > 0)
          solid.cell = true;
        out.push(solid);
      }
    }
    for (const [tile, slope] of this.slopeTiles)
      out.push({ ...slopeSolid(this.graph, tile, slope), cell: true });
    return out;
  }

  /** Die gesetzten Bausteine — für Welten, die noch etwas daran hängen wollen. */
  blocks(): readonly BlockPlacement[] {
    return this.placed;
  }

  /**
   * **Die Massen** — das Dach, die Felswand, der Sand darunter.
   *
   * Öffentlich, seit eine Welt als Datei geschrieben werden kann
   * (`worldFile.ts`). Vorher wusste außer dem Plan selbst niemand von ihnen,
   * und genau deshalb fehlten sie in jeder gespeicherten Welt.
   */
  masses(): readonly Mass[] {
    return this.stack;
  }

  /**
   * **Derselbe Grundriss ohne die Aufschläge dessen, was darauf steht.**
   *
   * Das ist der Graph, der in eine Datei gehört, und der Grund steht in einer
   * Zeile: In den Kacheldaten eines laufenden Plans stecken die Aufschläge der
   * Bausteine schon drin. Wer sie speichert, beim Laden als Grundwert nimmt
   * und die Bausteine danach anwendet, zählt jeden zweimal — nach dem dritten
   * Laden ist die Küche unbegehbar.
   *
   * Die Gefahr (`hazard`) bleibt dabei stehen: Die kommt nicht von Möbeln,
   * sondern von der Welt, die sie auf die Kachel gemalt hat.
   */
  bare(): NavGraph {
    const out = new NavGraph(this.graph.levels);
    replacePlan(out, this.graph);
    for (const key of out.tileKeys()) {
      const base = this.base.get(key);
      if (base) out.setTile(key, { cost: base.cost, rise: base.rise });
    }
    return out;
  }

  /**
   * **Eine gelesene Welt übernehmen** — Grundriss, Grundwerte, Bausteine und
   * Massen auf einmal.
   *
   * Der Gegenpart zu `bare()`, und die Reihenfolge ist die ganze Sorgfalt:
   * Erst kommt der Grundriss herein, dann gelten seine Kacheldaten als
   * **Grundwerte** (sie sind ja ohne Möbel gespeichert worden), und erst
   * danach werden die Bausteine angewendet. Wer das umdreht, zählt wieder
   * doppelt.
   */
  restore(
    graph: NavGraph,
    blocks: readonly BlockPlacement[],
    masses: readonly Mass[] = [],
    fixtures: readonly FixturePlacement[] = [],
    slopes: ReadonlyArray<{ tile: TileKey; slope: Slope; empty?: FloorCorner }> = [],
  ): this {
    replacePlan(this.graph, graph);
    this.base.clear();
    for (const key of this.graph.tileKeys()) {
      const facts = this.graph.tile(key);
      this.base.set(key, { cost: facts?.cost ?? 1, rise: facts?.rise ?? 0 });
    }
    this.stack.length = 0;
    for (const mass of masses) this.stack.push({ ...mass, rect: { ...mass.rect } });
    this.placed.length = 0;
    this.loadBlocks(blocks);
    this.loadFixtures(fixtures);
    this.loadSlopes(slopes);
    return this;
  }

  /**
   * **Die Bausteine zum Speichern**, und zwar getrennt vom Graphen.
   *
   * Der Graph hat sein eigenes Format mit eigener Versionsnummer
   * (`nav/navSerial.ts`), und dort gehören Bausteine nicht hinein: Eine
   * Küchenzeile ist keine Navigationsinformation, sie hinterlässt dort nur
   * eine Kachel mit einem Aufschlag. Wer sie in dieselbe Datei schriebe,
   * müsste deren Version anheben und alle gespeicherten Karten ungültig
   * machen — für Möbel.
   */
  saveBlocks(): BlockPlacement[] {
    return this.placed.map((one) => ({ ...one }));
  }

  /** Und wieder zurück. Was auf einer Kachel steht, die es nicht gibt, fällt weg. */
  loadBlocks(list: readonly BlockPlacement[]): this {
    const touched = new Set<TileKey>(this.placed.map((one) => one.tile));
    this.placed.length = 0;
    for (const one of list) {
      if (!this.graph.has(one.tile)) continue;
      if (!(one.kind in BLOCKS)) continue;
      this.placed.push({ ...one });
      touched.add(one.tile);
    }
    this.edits++;
    for (const tile of touched) this.refresh(tile);
    return this;
  }

  /**
   * **Den Inhalt eines anderen Plans übernehmen** — Kacheln, Kanten und
   * Bausteine.
   *
   * Es gibt keinen anderen Weg: An einem Plan hängen Zeiger (die Welt zeichnet
   * daraus, NPCs laufen darauf), und ihn auszutauschen hieße, alle
   * nachzuziehen. Also wird sein *Inhalt* ausgetauscht.
   */
  replaceWith(source: GridPlan): this {
    replacePlan(this.graph, source.graph);
    // **Der Grundwert kommt vom anderen Plan und nicht aus den Kacheldaten.**
    // In denen stecken die Aufschläge der Bausteine schon drin; wer sie als
    // Grundwert nähme und die Bausteine danach anwendete, zählte jeden
    // zweimal — und die Küche wäre nach dem zweiten Laden unbegehbar.
    this.base.clear();
    for (const [key, facts] of source.base) this.base.set(key, { ...facts });
    this.stack.length = 0;
    for (const mass of source.stack) this.stack.push({ ...mass, rect: { ...mass.rect } });
    this.loadBlocks(source.saveBlocks());
    this.loadFixtures(source.saveFixtures());
    this.loadSlopes(source.saveSlopes());
    // Auch halbe Böden, deren Schräge als Regalstück steht (`halfFloor`).
    this.halfFloors.clear();
    for (const [key, corner] of source.halfFloors) this.halfFloors.set(key, corner);
    return this;
  }
}

/**
 * **Wie viel teurer eine Kachel mit Schräge für die Wegsuche über ganze
 * Kacheln ist.** Hoch, aber nicht gesperrt: Die Hälfte der Kachel ist frei,
 * und wer nur Kacheln kennt, soll hindurch dürfen, wenn es sonst keinen Weg
 * gibt — er schrammt dann an der Wand entlang, statt stehen zu bleiben.
 */
export const SLOPE_COST = 6;

/**
 * **Wie weit ein Lauf über oder unter dem Boden daneben liegen darf**, damit
 * man seitlich auf ihn kommt (`GridPlan.flightSideOpen`), in Metern — eine
 * gute Stufe. Dieselbe Zahl wie `FLIGHT_CATCH` in `PhysicsLocomotion`: So weit
 * neben dem Lauf fängt der Schritt die Füße, und eine Seite, die weiter
 * aufginge, führte auf keine Treppe, sondern gegen ihre Stufen.
 */
export const FLIGHT_SIDE_STEP = 0.35;

/** Was niedriger ist als das, sperrt keine Zelle: eine Stufe, ein Teppich. */
const CELL_STEP = 0.3;

/**
 * **So weit muss ein Möbel in eine Zelle ragen, damit es sie sperrt**, in
 * Metern. Eine Küchenzeile von 0,6 m Tiefe an einer Kante ragt 0,1 m in die
 * hintere Zellreihe und sperrt sie damit nicht — man kommt an ihre Front
 * heran. Ein Tisch von 0,8 m ragt 0,4 m in jede seiner vier Zellen.
 */
const CELL_OVERLAP = 0.15;

/** Die Zellen, die ein Quader eines Möbels sperrt — keine, wenn er niedriger ist als eine Stufe. */
function furnitureCellsOf(solid: PlanSolid, base: number): Array<{ ix: number; iz: number }> {
  if (solid.y + solid.h / 2 - base < CELL_STEP) return [];
  return boxCells(
    {
      minX: solid.x - solid.w / 2,
      maxX: solid.x + solid.w / 2,
      minZ: solid.z - solid.d / 2,
      maxZ: solid.z + solid.d / 2,
    },
    CELL_OVERLAP,
  );
}

/**
 * **Der Quader einer Schräge**: eine Wand voller Höhe, so lang wie die
 * Diagonale der Kachel, um 45° gedreht (`PlanSolid.yaw`).
 *
 * `slash` läuft von Südwest nach Nordost: Die lokale x-Achse zeigt nach
 * (+1, −1), also +45° um die Hochachse. `backslash` läuft von Nordwest nach
 * Südost, −45°.
 */
export function slopeSolid(graph: NavGraph, tile: TileKey, slope: Slope): PlanSolid {
  const level = keyLevel(tile);
  const base = graph.levelY(level);
  return {
    kind: 'wall',
    x: tileCentreX(tile),
    y: base + PLAN_WALL_H / 2,
    z: tileCentreZ(tile),
    w: Math.SQRT2 * TILE,
    h: PLAN_WALL_H,
    d: PLAN_WALL_T,
    yaw: slope === 'slash' ? Math.PI / 4 : -Math.PI / 4,
    level,
  };
}

/**
 * **Was zum Setzen eines Einbaus angegeben wird.**
 *
 * Kennung und Eigenschaften dürfen fehlen: Ein Schild an der Wand braucht
 * keinen Namen, solange niemand auf es zeigt, und der Plan vergibt dann einen.
 * Alles andere ist Pflicht — eine geratene Kachel gibt es nicht.
 */
export interface FixtureRequest {
  id?: string;
  kind: string;
  x: number;
  z: number;
  dir: Dir;
  level?: number;
  props?: Props;
}

/** Auf welcher Kachel ein Einbau steht. */
export function fixtureTile(place: FixturePlacement): TileKey {
  return tileKey(place.x, place.z, place.level);
}

/**
 * Dasselbe für etwas Gelesenes — `null` statt eines Wurfs.
 *
 * `tileKey` wirft für alles außerhalb des Gitters, und das ist beim Bauen
 * richtig und beim Laden falsch: Eine fremde Datei mit einer Zahl aus der Luft
 * soll einen Einbau kosten und nicht die ganze Welt.
 */
function safeFixtureTile(place: FixturePlacement): TileKey | null {
  try {
    return fixtureTile(place);
  } catch {
    return null;
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
  solid.level = mass.level ?? levelUnder(graph, base + mass.from);
  return mass.portal === undefined ? solid : { ...solid, portal: mass.portal };
}

/**
 * **Auf welcher Etage eine Höhe liegt** — die oberste, deren Boden nicht
 * darüber ist.
 *
 * Für Massen, die nichts anderes sagen: Was auf dem Boden des Obergeschosses
 * aufsetzt, gehört dorthin; alles darunter zum Geschoss darunter. Eine
 * Handbreit Luft, weil eine Brüstung auch zwei Zentimeter über ihrem Boden
 * anfangen darf, ohne deshalb ein Stockwerk tiefer zu gehören.
 */
function levelUnder(graph: NavGraph, y: number): number {
  let level = 0;
  for (let index = 1; index < graph.levels.length; index++) {
    if (graph.levelY(index) <= y + 0.1) level = index;
  }
  return level;
}

/** Die vier Richtungen, damit eine Welt sie nicht aus dem Kachelmodul holen muss. */
export { DIR_N, DIR_E, DIR_S, DIR_W, TILE };
export type { Dir, NavRect };

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
