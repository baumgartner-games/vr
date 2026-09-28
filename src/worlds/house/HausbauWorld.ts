import * as THREE from 'three';
import { aimForward } from '../../core/usable';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { ElementSpot } from '../elements/elementPlace';
import {
  BUILD_FOLDERS,
  FLOORING_CRATES,
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
    return this.floors.get(`${tile.col},${tile.row}`) ?? PLATE_PROTOTYPE;
  }

  /** **Das Haus**: die Wände aus dem Katalog, hingestellt wie aus der Hand. */
  protected override buildProps(): void {
    super.buildProps();
    if (!this.context) return;
    for (const wall of houseWalls())
      void this.placeModel(wall.path, new THREE.Vector3(wall.x, wall.y, wall.z), wall.yaw);
  }

  // --- Katalog ---------------------------------------------------------------

  /** Im Katalog: die Tapetenkisten zum Hinstellen. */
  protected override elementCatalogue(): readonly string[] {
    return [...WALLPAPER_CRATES, ...FLOORING_CRATES].map((crate) => crate.id);
  }

  /**
   * **Wände, Türen, Fenster — und in _Wände_ die Tapeten** zum Nehmen, dazu
   * die Kisten in einem eigenen Ordner.
   */
  protected override elementFolders(): readonly FurnitureFolder[] {
    return [
      ...BUILD_FOLDERS.map((folder) =>
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
    if (!wallpaperOfItem(id) && !flooringOfItem(id)) return null;
    const model = ITEM_MODELS[id as KitchenItem];
    return { label: ITEM_LABELS[id as KitchenItem], model: typeof model === 'string' ? model : '' };
  }

  protected override takeCatalogItem(ctx: WorldContext, id: string, hand: Handedness | null): void {
    const paper = wallpaperOfItem(id);
    const flooring = flooringOfItem(id);
    if (!paper && !flooring) return;
    this.setCarried(dish(id as KitchenItem), hand ?? this.carriedHand);
    ctx.notify(
      paper
        ? `${paper.label} in der Hand · auf eine Wand im Raum zeigen, A klebt`
        : `${flooring!.label} in der Hand · im Raum stehen, A legt den Boden`,
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
    if (flooring && this.floorRoom && !this.hasUsePick(ctx) && ctx.rig.takeUse())
      this.lay(ctx, flooring);
    // **Vor allem anderen**: Mit der Tapete in der Hand und einem Raum vor
    // sich heißt `A` kleben — außer, eine Kiste oder Station steht davor.
    // Vor `super.update`, damit der Kran den Druck nicht als Anheben liest.
    if (paper && this.room && this.room.faces.length > 0 && !this.hasUsePick(ctx)) {
      if (ctx.rig.takeUse()) this.paste(ctx, paper);
    }
    super.update(dt, ctx);
    const ready = paper !== null && this.room !== null && this.room.faces.length > 0;
    if (ready || (flooring && this.floorRoom)) ctx.rig.useCandidate = true;
    this.paintWalls();
    this.showFloorRoom(ctx, flooring);
  }

  override dispose(ctx: WorldContext): void {
    this.floorGlow?.dispose();
    this.floorGlow = null;
    super.dispose(ctx);
  }

  // --- Bodenbeläge -----------------------------------------------------------

  /**
   * **Der Raum, in dem man steht** (`roomTiles`) — oder `null` im Freien.
   */
  private roomUnder(ctx: WorldContext): RoomTile[] | null {
    ctx.rig.getHeadPosition(_at);
    const pieces: WallPiece[] = this.standingWalls().map((wall, index) => ({
      id: String(index),
      a: wall.a,
      b: wall.b,
      front: { x: wall.front.x, z: wall.front.z },
    }));
    return roomTiles(pieces, _at.x, _at.z);
  }

  /** **Den Belag legen** — auf jede Kachel des Raums, und aus der Hand. */
  private lay(ctx: WorldContext, flooring: Flooring): void {
    const tiles = this.floorRoom;
    if (!tiles) return;
    for (const tile of tiles) {
      const key = `${tile.x},${tile.z}`;
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
    const walls = this.standingWalls();
    if (walls.length === 0) return null;
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_turn));
    ctx.rig.getHeadForward(_headAhead);
    aimForward(ctx.topDown, _rigAhead, _headAhead, _aim);
    ctx.rig.getHeadPosition(_at);
    const pieces: WallPiece[] = walls.map((wall, index) => ({
      id: String(index),
      a: wall.a,
      b: wall.b,
      front: { x: wall.front.x, z: wall.front.z },
    }));
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
    const walls = this.room?.walls ?? this.standingWalls();
    for (const face of this.room?.faces ?? []) {
      const wall = walls[Number(face.id)];
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
