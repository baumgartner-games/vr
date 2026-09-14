import { planSolids } from '../editor/levelBuild';
import { doorName, PLAN_DOOR_W, replacePlan } from '../editor/levelPlan';
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
import { FIXTURE_COST, fixtureKind, type FixturePlacement, type Props } from './fixtures/index';
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
    return this.putAt(kind, tileKey(x, z, level), dir, height);
  }

  /** Dasselbe für eine Kachel, die man schon in der Hand hat. */
  putAt(kind: BlockKind, tile: TileKey, dir: Dir, height?: number): this {
    this.placed.push({ kind, tile, dir, ...(height === undefined ? {} : { height }) });
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
      rise += blockRise(one.kind, one.height);
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
      })) {
        solid.level = level;
        out.push(solid);
      }
    }
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
    return this;
  }
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
