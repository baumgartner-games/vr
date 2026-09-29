import * as THREE from 'three';
import { aimForward } from '../../core/usable';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { ElementSpot } from '../elements/elementPlace';
import {
  FLOORING_CRATES,
  STAIR_CRATE,
  WALLPAPER_CRATES,
  type FurnitureFolder,
} from '../elements/elementCatalog';
import { ITEM_MODELS } from '../elements/itemModels';
import type { GridPlan } from '../grid/gridPlan';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import type { StandingWall } from '../portal/PortalWorld';
import { TestRestaurantWorld } from '../testrestaurant/TestRestaurantWorld';
import { ITEM_LABELS, dish, type KitchenItem } from '../test/zones/kitchenRecipes';
import { PlaceGrid } from '../portal/placeGrid';
import type { PlateTile } from '../shared/plateField';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import { FLOORINGS, flooringItem, flooringOfItem, type Flooring } from './flooring';
import { HOUSE_SPOTS, houseSpawn, housePlan, houseWalls, onHouseGround } from './housePlan';
import { roomTiles, traceRoom, type PieceFace, type RoomTile, type WallPiece } from './roomTrace';
import { STAIR_STEPS, STOREY, houseTiles, stairDir, stairFits, stairTiles } from './stairPlan';
import { bringBack, cutAway, type ViewLevel } from '../../core/cutaway';
import { SHELF_WALL_Y } from '../grid/shelfWalls';
import { tileKey, type Dir } from '../nav/navTile';
import { WALLPAPERS, wallpaperItem, wallpaperOfItem, type Wallpaper } from './wallpaper';
import { BARE_WALL, skinWall, stepWallpaperGlow, type WallSkin } from './wallpaperSkin';

const _rigAhead = new THREE.Vector3();
const _headAhead = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _turn = new THREE.Quaternion();
const _at = new THREE.Vector3();

/** Was eine Wand trägt: je Seite eine Tapete oder nichts. */
interface WallPaper {
  front: string | null;
  back: string | null;
}

/**
 * **Hausbau** — Wände bauen und tapezieren, wie in _PlateUp!_.
 *
 * Gewünscht (September 2026): _„beim Tapete wählen will ich wie in Plate up es
 * so handhaben, dass ich die Wand hinsetze und stelle, und es beim Wand Ordner
 * aber Tapeten Items gibt, die ich z.B. als Spieler in der Hand halten kann.
 * Wenn ich dann in einem Raum bin, und das Item in der Hand halte der Tapete
 * werden alle Wände die es betrifft gehighlithed, mit interagieren wird dann
 * die Tapete angewandt und das Item in der Hand aufgebraucht."_
 *
 * - **Die Tapete kommt aus der Kiste** (`WALLPAPER_CRATES`, unendlich viele)
 *   oder aus dem Katalog (_Wände_ → die Tapeten, `catalogItem`) — am Schirm,
 *   in der Brille und mit dem Kran gleich: Sie liegt dann in der Hand wie ein
 *   Teller in der Küche (`TestRestaurantWorld.carried`).
 * - **Welcher Raum gemeint ist**, sagt der Blick (`roomTrace.traceRoom`): die
 *   erste Wand in Blickrichtung, und an ihr entlang in beide Richtungen, bis
 *   sich die Wände treffen. Türen und Fenster sind Wände wie jede andere; eine
 *   Wand ohne Nachbarn ist das Ende, ohne um sie herum auf die Rückseite zu
 *   laufen.
 * - **Was sie bekäme, leuchtet** — genau die Seiten, nicht die ganzen Wände
 *   (`wallpaperSkin.ts`, `glow`).
 * - **`A` klebt sie an** (am Schirm `E` oder Klick), und die Tapete in der Hand
 *   ist aufgebraucht. Eine Kiste oder Station vor einem geht vor
 *   (`hasUsePick`): Wer vor der Kiste steht, legt die Tapete zurück.
 *
 * Die Tapete einer Seite hängt am Stück: Wird es abgerissen oder ersetzt, ist
 * sie mit ihm weg. Gespeichert wird sie noch nicht — nach dem Neuladen sind die
 * Wände wieder nackt.
 */
export class HausbauWorld extends TestRestaurantWorld {
  /** Was jede Wand trägt. */
  private readonly papers = new WeakMap<PhysicsBody, WallPaper>();
  /** Welche Wände gerade Eigenes tragen — damit das Hervorheben wieder weggeht. */
  private readonly skinned = new Set<PhysicsBody>();
  /** Die Seiten, die die Tapete in der Hand gerade bekäme. */
  private room: { walls: StandingWall[]; faces: PieceFace[] } | null = null;
  private clock = 0;
  /** **Der Bodenbelag je Kachel** (`x,z` → Platte), wo er vom Prototyp-Boden abweicht. */
  private readonly floors = new Map<string, string>();
  /** Die Kacheln, die der Belag in der Hand gerade bekäme. */
  private floorRoom: RoomTile[] | null = null;
  /** Das Leuchten über diesen Kacheln (`portal/placeGrid.ts`). */
  private floorGlow: PlaceGrid | null = null;
  /** Wohin die Treppe in der Hand käme — und ob sie dort passt. */
  private stairAim: {
    tiles: RoomTile[];
    dir: Dir;
    level: number;
    house: RoomTile[] | null;
    fits: boolean;
  } | null = null;
  /** Was aus den Augen gerade ausgeblendet ist — die Etagen über einem (`cutAway`). */
  private readonly cut: THREE.Object3D[] = [];
  /** Für welchen Stand das gilt: Etage, Fassung des Plans, drinnen. */
  private cutFor = '';

  protected override worldId(): string {
    return 'hausbau';
  }

  protected override editorTitle(): string {
    return 'Hausbau';
  }

  protected override layout(): GridPlan {
    return housePlan();
  }

  protected override welcome(): string {
    return 'Hausbau · Tapete aus der Kiste nehmen, im Raum auf eine Wand zeigen, A klebt';
  }

  protected override skyColor(): number {
    return 0xa8d0f0;
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = houseSpawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  /** Nach Norden, auf Haustür und Kisten. */
  protected override spawnYaw(): number {
    return 0;
  }

  protected override spots(): readonly ElementSpot[] {
    return HOUSE_SPOTS;
  }

  protected override onGround(tx: number, tz: number): boolean {
    return onHouseGround(tx, tz);
  }

  /** Der gelegte Belag, sonst der Prototyp-Boden der Testwelten. */
  protected override floorPlate(tile: PlateTile): string | null {
    return this.floors.get(`${tile.col},${tile.row},${tile.level}`) ?? PLATE_PROTOTYPE;
  }

  /** **Das Haus**: die Wände aus dem Katalog, hingestellt wie aus der Hand. */
  protected override buildProps(): void {
    super.buildProps();
    if (!this.context) return;
    for (const wall of houseWalls())
      void this.placeModel(wall.path, new THREE.Vector3(wall.x, wall.y, wall.z), wall.yaw);
  }

  // --- Katalog ---------------------------------------------------------------

  /**
   * **Der Katalog aller Welten** (`FurnishedWorld`) — und dazu die Kisten
   * für Tapete, Boden und Treppe, die nur hier etwas bewirken.
   */
  protected override elementCatalogue(): readonly string[] {
    return [
      ...super.elementCatalogue(),
      ...[...WALLPAPER_CRATES, ...FLOORING_CRATES, STAIR_CRATE].map((crate) => crate.id),
    ];
  }

  /**
   * **Die Ordner aller Welten — und in _Wände_ die Tapeten** zum Nehmen, dazu
   * Böden, Treppen und die Kisten in eigenen Ordnern.
   */
  protected override elementFolders(): readonly FurnitureFolder[] {
    return [
      ...super
        .elementFolders()
        .map((folder) =>
          folder.id === 'walls'
            ? { ...folder, items: WALLPAPERS.map((one) => wallpaperItem(one.id)) }
            : folder,
        ),
      // **Die Böden** — die Beläge zum Nehmen, wie die Tapeten unter _Wände_.
      {
        id: 'floors',
        label: 'Böden',
        elements: [],
        items: FLOORINGS.map((one) => flooringItem(one.id)),
      },
      // **Die Treppe** — zum Nehmen, und ihre Kiste daneben.
      { id: 'stairs', label: 'Treppen', elements: [STAIR_CRATE.id], items: ['stair'] },
      {
        id: 'wallpaper-crates',
        label: 'Tapetenkisten',
        elements: WALLPAPER_CRATES.map((crate) => crate.id),
      },
      {
        id: 'floor-crates',
        label: 'Bodenkisten',
        elements: FLOORING_CRATES.map((crate) => crate.id),
      },
    ];
  }

  protected override catalogItem(id: string): { label: string; model: string } | null {
    if (!wallpaperOfItem(id) && !flooringOfItem(id) && id !== 'stair') return null;
    const model = ITEM_MODELS[id as KitchenItem];
    return { label: ITEM_LABELS[id as KitchenItem], model: typeof model === 'string' ? model : '' };
  }

  protected override takeCatalogItem(ctx: WorldContext, id: string, hand: Handedness | null): void {
    const paper = wallpaperOfItem(id);
    const flooring = flooringOfItem(id);
    const stair = id === 'stair';
    if (!paper && !flooring && !stair) return;
    this.setCarried(dish(id as KitchenItem), hand ?? this.carriedHand);
    ctx.notify(
      paper
        ? `${paper.label} in der Hand · auf eine Wand im Raum zeigen, A klebt`
        : flooring
          ? `${flooring.label} in der Hand · im Raum stehen, A legt den Boden`
          : 'Treppe in der Hand · im Haus in Laufrichtung zeigen, A stellt sie hin',
    );
  }

  // --- Tapezieren ------------------------------------------------------------

  override update(dt: number, ctx: WorldContext): void {
    this.clock += dt;
    stepWallpaperGlow(this.clock);
    const paper = wallpaperOfItem(this.carried?.item);
    this.room = paper ? this.roomAhead(ctx) : null;
    const flooring = flooringOfItem(this.carried?.item);
    this.floorRoom = flooring ? this.roomUnder(ctx) : null;
    const direct = this.carryingHandPressed(ctx);
    if (flooring && this.floorRoom && this.usePressed(ctx, direct)) this.lay(ctx, flooring);
    const stair = this.carried?.item === 'stair';
    this.stairAim = stair ? this.stairAhead(ctx) : null;
    if (stair && this.stairAim && this.usePressed(ctx, direct)) this.placeStair(ctx);
    // **Vor allem anderen**: Mit der Tapete in der Hand und einem Raum vor
    // sich heißt `A` kleben — außer, eine Kiste oder Station steht davor.
    // Vor `super.update`, damit der Kran den Druck nicht als Anheben liest.
    if (paper && this.room && this.room.faces.length > 0 && this.usePressed(ctx, direct))
      this.paste(ctx, paper);
    super.update(dt, ctx);
    const ready = paper !== null && this.room !== null && this.room.faces.length > 0;
    if (ready || (flooring && this.floorRoom) || this.stairAim) ctx.rig.useCandidate = true;
    this.markWallLevels();
    this.paintWalls();
    this.showFloorRoom(ctx, flooring);
    this.showStair(ctx);
    this.cutAbove(ctx);
  }

  /**
   * **In der Brille zählt `A` (oder `X`) der Hand, die trägt** — gemeldet war,
   * dass sich die Treppe in VR nicht mit `A` hinstellen ließ. Über
   * `rig.takeUse` kommt nur das `A` der rechten Hand an, ein Bild verspätet,
   * und nur, solange keine Kiste oder Station vor dem Kopf steht; mit der
   * Treppe links oder vor der Treppenkiste tat der Knopf nichts oder das
   * Falsche. Der Druck auf dem Controller, der das Ding hält, meint das Ding.
   */
  private carryingHandPressed(ctx: WorldContext): boolean {
    const hand = this.carriedHand;
    if (!hand || !ctx.renderer.xr.isPresenting) return false;
    return ctx.input.get(hand)?.primary.justPressed ?? false;
  }

  /**
   * Ob der Druck dem Getragenen gilt: in der Brille direkt vom tragenden
   * Controller (dann wird der Druck der Figur gleich mit abgeholt, damit er
   * nicht noch eine Station benutzt), sonst `A` wie bisher, wenn nichts
   * anderes davor steht.
   */
  private usePressed(ctx: WorldContext, direct: boolean): boolean {
    if (direct) {
      ctx.rig.takeUse();
      return true;
    }
    return !this.hasUsePick(ctx) && ctx.rig.takeUse();
  }

  override dispose(ctx: WorldContext): void {
    this.floorGlow?.dispose();
    this.floorGlow = null;
    this.cut.length = 0;
    this.cutFor = '';
    super.dispose(ctx);
  }

  // --- Etagen ----------------------------------------------------------------

  /** **Auf welcher Etage man steht** (`GridWorld.viewLevel`), sonst die unterste. */
  private level(): number {
    return this.standLevel;
  }

  /** Auf welcher Etage etwas mit dieser Unterkante steht. */
  private levelOfY(y: number): number {
    const levels = this.grid?.graph.levels ?? [0];
    let level = 0;
    for (let i = 1; i < levels.length; i++) if (y >= levels[i]! - 0.5) level = i;
    return level;
  }

  /** Die stehenden Wände einer Etage, als Stücke für `roomTrace`, und welche davon Türen sind. */
  private wallsOn(level: number): {
    walls: StandingWall[];
    pieces: WallPiece[];
    doors: Set<string>;
  } {
    const walls = this.standingWalls().filter(
      (wall) => this.levelOfY(wall.centre.y - SHELF_WALL_Y) === level,
    );
    const pieces: WallPiece[] = walls.map((wall, index) => ({
      id: String(index),
      a: wall.a,
      b: wall.b,
      front: { x: wall.front.x, z: wall.front.z },
    }));
    const doors = new Set(
      walls.flatMap((wall, index) => (wall.path.includes('Doorway') ? [String(index)] : [])),
    );
    return { walls, pieces, doors };
  }

  /**
   * **Ob man unter einem Boden steht** — im Haus, unter der Etage darüber.
   * Dann ist sie beim Hineinsehen im Weg; draußen gehört sie zum Haus, das man
   * ansieht.
   */
  private underRoof(ctx: WorldContext): boolean {
    const graph = this.grid?.graph;
    if (!graph) return false;
    const level = this.level();
    if (level + 1 >= graph.levels.length) return false;
    return graph.has(
      tileKey(Math.floor(ctx.rig.position.x), Math.floor(ctx.rig.position.z), level + 1),
    );
  }

  /**
   * **Von oben: im Haus aufgeschnitten, draußen ganz** (`core/cutaway.ts`).
   * Gewünscht: _„auch wenn ich das Dach aus vr/First Person und von oben nicht
   * sehe, die oberen Ebenen, wenn ich im Haus bin. Von außen sehe ich dann die
   * Ebene des Hauses komplett."_ Draußen meldet die Welt die oberste Etage als
   * die, auf der man steht — dann ist keine darüber, die weg müsste.
   */
  override viewLevel(): ViewLevel | null {
    const view = super.viewLevel();
    const ctx = this.context;
    const graph = this.grid?.graph;
    // **Mit der Ebenen-Leiste entscheidet sie** (`grid/levelBar.ts`): die
    // gewählte Etage, oder _von außen_ alle — und nicht, wo der Kran schwebt.
    if (this.levelBarOn) return view;
    if (!view || !ctx || !graph || this.underRoof(ctx)) return view;
    // Ganz ist das Haus nur, wenn es über einem noch etwas gibt: Wer draußen
    // auf der obersten Etage steht, sieht die Etagen darunter unscharf.
    const top = graph.levels.length - 1;
    return { ...view, level: top, whole: view.level < top };
  }

  /**
   * **Aus den Augen und in der Brille dasselbe** — die Kamera von oben
   * schneidet selbst (`TopDownCamera`); hier wird ausgeblendet, was über der
   * eigenen Etage liegt, solange man darunter steht. Neu nur, wenn sich etwas
   * geändert hat: Etage, Plan oder drinnen/draußen.
   */
  private cutAbove(ctx: WorldContext): void {
    const graph = this.grid?.graph;
    const inside = !ctx.topDown && this.underRoof(ctx);
    const level = this.level();
    const key =
      inside && graph ? `${level}|${graph.version}|${this.skinned.size}|${this.levelMarks}` : '';
    if (key === this.cutFor) return;
    bringBack(this.cut);
    this.cutFor = key;
    if (inside) cutAway(this.root, level, this.cut);
  }

  /**
   * **Wände oben gehören ihrer Etage** — damit sie mit ihr verschwinden
   * (`userData.level`, `core/cutaway.ts`), und sie stehen für sich, damit das
   * Bündel aus den Augen sie nicht weiter zeigt (`looseWalls`).
   */
  private markWallLevels(): void {
    const graph = this.grid?.graph;
    if (!graph || graph.levels.length < 2) return;
    // Die Marke selbst setzt die Gitterwelt, an jedem Modell
    // (`GridWorld.markModelLevels`); hier bleibt, dass eine Wand oben für sich steht.
    for (const wall of this.standingWalls()) {
      if (this.levelOfY(wall.centre.y - SHELF_WALL_Y) > 0) this.looseWalls.add(wall.entry);
    }
  }

  // --- Treppe ----------------------------------------------------------------

  /**
   * **Wohin die Treppe käme** — auf die Kachel vor einem und drei weiter, in
   * Blickrichtung, auf ein Viertel gerundet (`stairPlan.stairTiles`). Sie passt,
   * wo alle vier Boden sind und keine Treppe tragen — steht man in einem
   * Zimmer, müssen sie darin liegen; das Haus dazu sind alle Zimmer, die man
   * durch Türen erreicht (`houseTiles`).
   */
  private stairAhead(ctx: WorldContext): typeof this.stairAim {
    const level = this.level();
    const { pieces, doors } = this.wallsOn(level);
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_turn));
    ctx.rig.getHeadForward(_headAhead);
    aimForward(ctx.topDown, _rigAhead, _headAhead, _aim);
    ctx.rig.getHeadPosition(_at);
    const dir = stairDir(_aim.x, _aim.z);
    const tiles = stairTiles(_at.x, _at.z, dir);
    const room = roomTiles(pieces, _at.x, _at.z);
    const house = room ? houseTiles(pieces, doors, _at.x, _at.z) : null;
    const graph = this.grid?.graph;
    const free =
      !graph ||
      tiles.every((tile) => {
        const here = tileKey(tile.x, tile.z, level);
        return graph.has(here) && !this.grid!.flightOn(here);
      });
    // **Auch ohne Raum** — gewünscht: _„Ich würde Treppen gerne setzen wollen,
    // auch ohne einen Raum dafür haben zu müssen. Die sollen nur dafür da sein
    // um die Ebenen zu wechseln."_ Es genügt Boden unter allen vier Kacheln
    // und keine Treppe darauf. Im Raum muss sie ganz darin stehen, sonst ginge
    // sie durch seine Wand.
    return { tiles, dir, level, house, fits: free && (!room || stairFits(room, tiles)) };
  }

  /** Das Gitter unter der Treppe: grün, wo sie passt, rot, wo nicht. */
  private showStair(ctx: WorldContext): void {
    const aim = this.stairAim;
    if (!aim) {
      if (!this.floorRoom) this.floorGlow?.hide();
      return;
    }
    const glow = (this.floorGlow ??= new PlaceGrid(ctx.scene));
    glow.tint(aim.fits ? 0x4fe08a : 0xff4d4d);
    glow.show(
      aim.tiles.map((tile) => ({ x: tile.x + 0.5, z: tile.z + 0.5 })),
      ctx.rig.getFloorY(),
    );
  }

  /**
   * **Die Treppe hinstellen** — und mit ihr die Etage darüber.
   *
   * - Gibt es die Etage noch nicht, kommt sie dazu, eine Etagenhöhe
   *   (`STOREY`) über dieser. So entstehen so viele, wie man Treppen stellt.
   * - Über dem ganzen Haus (`houseTiles`) liegt dann ihr Boden — wo schon
   *   einer ist, bleibt er.
   * - Die Treppe selbst baut der Plan (`GridPlan.stairs`): drei Kacheln
   *   Stufen, das Loch darüber, und der Stand oben ist Boden der neuen Etage.
   */
  private placeStair(ctx: WorldContext): void {
    const aim = this.stairAim;
    const plan = this.grid;
    if (!aim || !plan) return;
    if (!aim.fits) {
      ctx.notify('Die Treppe passt hier nicht — sie braucht vier freie Kacheln Boden vor dir');
      return;
    }
    const graph = plan.graph;
    const up = aim.level + 1;
    while (graph.levels.length <= up) {
      graph.levels.push(graph.levelY(graph.levels.length - 1) + STOREY);
    }
    // Im Haus liegt der Boden über dem ganzen Haus; im Freien nur der Stand
    // oben — mehr braucht es nicht, um die Etage zu wechseln. Über einer
    // anderen Treppe bleibt das Loch (`GridPlan.floor` lässt leeren Boden
    // liegen) — vorher füllte die zweite Treppe das Loch der ersten wieder zu.
    const landing = aim.tiles[aim.tiles.length - 1]!;
    const cover = aim.house ?? [landing];
    for (const tile of cover) {
      if (!graph.has(tileKey(tile.x, tile.z, up)))
        plan.floor({ x: tile.x, z: tile.z, w: 1, d: 1, level: up });
    }
    const first = aim.tiles[0]!;
    plan.stairs(first.x, first.z, aim.dir, aim.level, STAIR_STEPS);
    this.setCarried(null, null);
    this.stairAim = null;
    ctx.notify(
      aim.house
        ? `Treppe steht · Etage ${up} über ${aim.house.length} Kacheln`
        : `Treppe steht · hinauf auf Etage ${up}`,
    );
  }

  // --- Bodenbeläge -----------------------------------------------------------

  /**
   * **Der Raum, in dem man steht** (`roomTiles`) — oder `null` im Freien.
   */
  private roomUnder(ctx: WorldContext): RoomTile[] | null {
    ctx.rig.getHeadPosition(_at);
    return roomTiles(this.wallsOn(this.level()).pieces, _at.x, _at.z);
  }

  /** **Den Belag legen** — auf jede Kachel des Raums, und aus der Hand. */
  private lay(ctx: WorldContext, flooring: Flooring): void {
    const tiles = this.floorRoom;
    if (!tiles) return;
    const level = this.level();
    for (const tile of tiles) {
      // Leerer Boden über einer Treppe bleibt leer — und behält den Belag,
      // den er vorher hatte (`GridPlan.emptyAt`).
      if (this.grid?.emptyAt(tileKey(tile.x, tile.z, level))) continue;
      const key = `${tile.x},${tile.z},${level}`;
      if (flooring.path === PLATE_PROTOTYPE) this.floors.delete(key);
      else this.floors.set(key, flooring.path);
    }
    this.rebuildFloor();
    this.setCarried(null, null);
    this.floorRoom = null;
    ctx.notify(`${flooring.label}: ${tiles.length} Kacheln gelegt`);
  }

  /**
   * **Was der Belag bekäme, leuchtet** — die Kacheln des Raums, wie beim
   * Setzen einer Fläche (`portal/placeGrid.ts`). Im Freien leuchtet nichts:
   * Dort ist kein Raum, und `A` legt nichts.
   */
  private showFloorRoom(ctx: WorldContext, flooring: Flooring | null): void {
    const tiles = this.floorRoom;
    if (!flooring || !tiles) {
      this.floorGlow?.hide();
      return;
    }
    const glow = (this.floorGlow ??= new PlaceGrid(ctx.scene));
    glow.show(
      tiles.map((tile) => ({ x: tile.x + 0.5, z: tile.z + 0.5 })),
      ctx.rig.getFloorY(),
      tiles.length,
    );
  }

  /** Der Raum vor einem, in Blickrichtung (`traceRoom`) — oder `null`. */
  private roomAhead(ctx: WorldContext): { walls: StandingWall[]; faces: PieceFace[] } | null {
    const { walls, pieces } = this.wallsOn(this.level());
    if (walls.length === 0) return null;
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_turn));
    ctx.rig.getHeadForward(_headAhead);
    aimForward(ctx.topDown, _rigAhead, _headAhead, _aim);
    ctx.rig.getHeadPosition(_at);
    const faces = traceRoom(pieces, _at.x, _at.z, _aim.x, _aim.z);
    return faces.length > 0 ? { walls, faces } : null;
  }

  /** **Die Tapete an die Wände** — und aus der Hand. */
  private paste(ctx: WorldContext, paper: Wallpaper): void {
    const room = this.room;
    if (!room) return;
    for (const face of room.faces) {
      const wall = room.walls[Number(face.id)];
      if (!wall) continue;
      const now = this.papers.get(wall.entry) ?? { front: null, back: null };
      if (face.front) now.front = paper.id;
      else now.back = paper.id;
      this.papers.set(wall.entry, now);
    }
    this.setCarried(null, null);
    this.room = null;
    const count = room.faces.length;
    ctx.notify(`${paper.label}: ${count} ${count === 1 ? 'Wandseite' : 'Wandseiten'} tapeziert`);
  }

  /**
   * **Jede Wand auf ihren Stand** — ihre Tapeten, und das Leuchten der Seiten,
   * die die Tapete in der Hand bekäme. Was nichts mehr trägt, bekommt seine
   * eigenen Materialien zurück.
   */
  private paintWalls(): void {
    if (!this.room && this.skinned.size === 0) return;
    const held = wallpaperOfItem(this.carried?.item)?.id ?? null;
    const glow = new Map<PhysicsBody, { front: boolean; back: boolean }>();
    const walls = this.standingWalls();
    for (const face of this.room?.faces ?? []) {
      const wall = this.room!.walls[Number(face.id)];
      if (!wall) continue;
      const one = glow.get(wall.entry) ?? { front: false, back: false };
      if (face.front) one.front = true;
      else one.back = true;
      glow.set(wall.entry, one);
    }
    const seen = new Set<PhysicsBody>();
    for (const wall of walls) {
      seen.add(wall.entry);
      const paper = this.papers.get(wall.entry);
      const lit = glow.get(wall.entry);
      // **Die Vorschau**: Was die Tapete in der Hand bekäme, zeigt sie schon
      // — und leuchtet dazu, damit man sieht, dass es erst eine Vorschau ist.
      const skin: WallSkin =
        paper || lit
          ? {
              front: lit?.front && held ? held : (paper?.front ?? null),
              back: lit?.back && held ? held : (paper?.back ?? null),
              glowFront: lit?.front ?? false,
              glowBack: lit?.back ?? false,
            }
          : BARE_WALL;
      if (!paper && !lit && !this.skinned.has(wall.entry)) continue;
      const own = skinWall(wall.entry.object, wall, skin);
      if (own) {
        this.skinned.add(wall.entry);
        this.looseWalls.add(wall.entry);
      } else {
        this.skinned.delete(wall.entry);
        this.looseWalls.delete(wall.entry);
      }
    }
    // Abgerissen oder getragen: nicht mehr in der Liste der stehenden Wände.
    for (const entry of this.skinned) {
      if (seen.has(entry)) continue;
      if (!entry.carried) this.skinned.delete(entry);
    }
  }
}
