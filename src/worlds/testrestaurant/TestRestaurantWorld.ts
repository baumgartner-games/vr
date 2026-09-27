import * as THREE from 'three';
import { playPick, playWarn } from '../../core/Audio';
import { aimForward } from '../../core/usable';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import { kaykitModel } from '../../core/kaykitModel';
import { loadItemModel } from '../elements/itemTemplate';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import { KaykitDishView, dishKey } from '../elements/dishView';
import {
  FURNITURE_CATALOGUE,
  FURNITURE_FOLDERS,
  hasElement,
  type FurnitureFolder,
} from '../elements/elementCatalog';
import {
  spotAround,
  spotCells,
  spotTiles,
  yawFace,
  type CarriedElement,
  type ElementSpot,
} from '../elements/elementPlace';
import type { ElementHost, PlacedElement } from '../elements/elementView';
import { furnish } from '../elements/furnish';
import { StationLayer, type StationHost } from '../elements/stationLayer';
import { DEFAULT_BURN, type StationState } from '../plateup/plateUpStations';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import { createSky } from '../shared/environment';
import type { PlateTile } from '../shared/plateField';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import { KitchenGauges } from '../test/zones/kitchenGauge';
import { SprayJet } from '../test/zones/kitchenSpray';
import type { Dish } from '../test/zones/kitchenRecipes';
import { SPOTS, ground, restaurantPlan, spawn } from './restaurantPlan';

const _rigAhead = new THREE.Vector3();
const _headAhead = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _nozzle = new THREE.Vector3();
const _turn = new THREE.Quaternion();
const _ray = new THREE.Ray();

/** Wie groß das Getragene in der Brille in der Hand liegt (`kitchenGrab.HAND_FOOD_SCALE`). */
const HAND_FOOD_SCALE = 0.5;

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_: Boden, Ankunftsort
 * und die Burgerküche, die der Besitzer aus dem Möbelkatalog zusammengestellt
 * hat (`restaurantPlan.SPOTS`).
 *
 * Jede Stelle in
 * `SPOTS` wird hingestellt (`elements/furnish.ts` → `placeElement`), und
 * jedes Element mit einer Stationsart antwortet auf `A` nach der Regel der
 * Küche (`elements/stationLayer.ts`). Was man dabei in der Hand hat, trägt
 * die Figur wie im Restaurant (`carryInHands`).
 */
export class TestRestaurantWorld extends GridWorld {
  /** Was diese Welt selbst ins Bild gehängt hat — Kopien aus dem Regal. */
  private readonly decor: THREE.Object3D[] = [];
  /** Hochgezählt beim Aufräumen: Was danach noch aus dem Netz kommt, wird verworfen. */
  private round = 0;

  private gauges: KitchenGauges | null = null;
  private stations: StationLayer | null = null;
  private dishes: KaykitDishView | null = null;
  /** Der Nebel des Feuerlöschers (`kitchenSpray.SprayJet`, wie in der Sandbox). */
  private jet: SprayJet | null = null;
  /** Die Vorlagen, wie sie gerade laden — damit jede Datei nur einmal kommt. */
  private readonly loading = new Map<string, Promise<THREE.Object3D | null>>();
  private readonly templates = new Map<string, THREE.Object3D>();

  /** Ein Ding der Küche — was eine Kiste, ein Brett, ein Stapel hergegeben hat. */
  private carried: Dish | null = null;
  /** Die Hand, in der es liegt. */
  private carriedHand: Handedness | null = null;
  private carriedView: THREE.Object3D | null = null;
  private readonly carryPoint = new THREE.Vector3();
  /** Hochgezählt je Möbel aus dem Katalog — für eindeutige Stellen. */
  private furnished = 0;
  /** Was steht, als Spielelement — zum Umstellen im Bau-Modus (`liftElementAt`). */
  private readonly placed: PlacedElement[] = [];

  protected override worldId(): string {
    return 'test-restaurant';
  }

  protected override editorTitle(): string {
    return 'Test Restaurant';
  }

  protected override layout(): GridPlan {
    return restaurantPlan();
  }

  /** Hier steht nichts, was die NPCs bräuchten — geplant wird auf dem Plan. */
  protected override navFromPlan(): boolean {
    return true;
  }

  /** Der Boden ist dieselbe Prototyp-Platte wie in der Test Navigation. */
  protected override floorPlate(_tile: PlateTile): string | null {
    return PLATE_PROTOTYPE;
  }

  protected override skyColor(): number {
    return 0x9cc4e8;
  }

  protected override welcome(): string {
    return 'Test Restaurant · die Burgerküche aus dem Möbelkatalog';
  }

  /** Leere Hände: Getragen wird hier nur, was eine Station hergibt. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = spawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  protected override buildProps(): void {
    if (!this.context) return;
    this.gauges ??= new KitchenGauges(this.root);
    this.dishes = new KaykitDishView((path) => this.template(path));
    this.stations = new StationLayer(this.stationHost(), this.gauges, null, DEFAULT_BURN);
    // Jede Stelle sperrt ihre Zellen, sobald `placeElement` aufgerufen ist,
    // und jedes Element mit einer Stationsart wird Station — ohne zweite Liste.
    void furnish(this.elementHost(), SPOTS, this.stations, (placed) => this.placed.push(placed));
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.stations?.step(dt, ctx.rig.position);
    this.spray(dt, ctx);
    this.carryInHands(ctx);
    this.gauges?.update(dt);
  }

  override dispose(ctx: WorldContext): void {
    this.round++;
    ctx.avatar.carry = null;
    this.stations?.dispose();
    this.stations = null;
    this.dishes?.dispose();
    this.dishes = null;
    this.gauges?.dispose();
    this.gauges = null;
    this.jet?.dispose();
    this.jet = null;
    this.carriedView?.removeFromParent();
    this.carriedView = null;
    this.carried = null;
    this.carriedHand = null;
    // Kopien aus dem Regal tragen eigene Materialien (`kaykitModel.copyOf`),
    // und die räumt `disposeTree` an ihnen nicht ab — also hier.
    for (const object of this.decor) {
      object.removeFromParent();
      dropMaterials(object);
    }
    this.decor.length = 0;
    this.placed.length = 0;
    for (const template of this.templates.values()) dropMaterials(template);
    this.templates.clear();
    this.loading.clear();
    super.dispose(ctx);
  }

  // --- Spielelemente ----------------------------------------------------------

  /**
   * **Der Möbelkatalog im Menü** (`PortalWorld.elementMenu`): Arbeitsplatte,
   * Schneidebrett, Herdplatte mit Pfanne, mit Topf und blank, Waschbecken,
   * Eis und die Vorräte — hingestellt wie jede Stelle aus `SPOTS`.
   */
  protected override elementCatalogue(): readonly string[] {
    return FURNITURE_CATALOGUE;
  }

  /** Dazu die Unterordner je Gericht: Pizza, Burger, Eis, Waffeln, Suppe. */
  protected override elementFolders(): readonly FurnitureFolder[] {
    return FURNITURE_FOLDERS;
  }

  /**
   * **Hinstellen, wo es losgelassen wurde** — frisch aus dem Katalog unter
   * einer neuen Stelle, umgestellt unter seiner alten (Name, Beschriftung und
   * was es hergibt bleiben), und mit dem Stand seiner Stationen.
   */
  protected override furnishAt(
    carried: CarriedElement,
    x: number,
    z: number,
    yaw: number,
  ): ElementSpot | null {
    if (!hasElement(carried.id)) return null;
    const id = carried.from?.id ?? `katalog-${++this.furnished}`;
    const at = spotAround(id, carried.id, x, z, yawFace(yaw));
    const spot: ElementSpot = carried.from
      ? { ...carried.from, x: at.x, z: at.z, face: at.face }
      : at;
    return this.furnishSpot(spot, keptStates(carried)) ? spot : null;
  }

  protected override furnishBack(carried: CarriedElement): ElementSpot | null {
    const from = carried.from;
    return from && this.furnishSpot(from, keptStates(carried)) ? from : null;
  }

  protected override elementAt(x: number, z: number): string | null {
    return this.placedAt(x, z)?.element.id ?? null;
  }

  /**
   * **Ein Element zum Umstellen wegnehmen** — Stationen heraus (ihr Stand geht
   * mit), Zellen frei, Anker, Teile und Bodenstück weg.
   */
  protected override liftElementAt(x: number, z: number): CarriedElement | null {
    const placed = this.placedAt(x, z);
    if (!placed) return null;
    this.placed.splice(this.placed.indexOf(placed), 1);
    const keep = this.stations?.remove(placed.anchor) ?? [];
    this.unblockSolid(placed.block);
    for (const object of [placed.anchor, ...placed.parts]) {
      if (!object) continue;
      object.removeFromParent();
      const at = this.decor.indexOf(object);
      if (at >= 0) this.decor.splice(at, 1);
      if (object !== placed.anchor) dropMaterials(object);
    }
    void placed.base?.then((body) => {
      if (body) this.removeProp(body as PhysicsBody, false);
    });
    return { id: placed.element.id, from: placed.spot, keep };
  }

  /** Das Element, dessen Kacheln diesen Punkt (Meter) decken — oder keines. */
  private placedAt(x: number, z: number): PlacedElement | null {
    const tile = `${Math.floor(x)},${Math.floor(z)}`;
    return this.placed.find((one) => spotTiles(one.spot).includes(tile)) ?? null;
  }

  /**
   * **Eine Stelle hinstellen, wenn Platz ist** — auf dem Boden und auf Zellen,
   * die frei sind (`cellsFree`). Derselbe Weg wie `SPOTS` (`furnish`): Die
   * Zellen sind gesperrt, sobald das zurückkehrt, und mit Stationsart wird es
   * Station.
   */
  protected override furnishSpot(spot: ElementSpot, keep: readonly StationState[] = []): boolean {
    if (!this.stations || !hasElement(spot.element)) return false;
    const g = ground();
    const inside = spotTiles(spot).every((tile) => {
      const [tx, tz] = tile.split(',').map(Number);
      return tx! >= g.x && tx! < g.x + g.w && tz! >= g.z && tz! < g.z + g.d;
    });
    if (!inside || !this.cellsFree(spotCells(spot))) return false;
    void furnish(
      this.elementHost(),
      [spot],
      this.stations,
      (placed) => this.placed.push(placed),
      keep,
    );
    return true;
  }

  /**
   * **Die Welt als Gastgeber der Spielelemente** (`elements/elementView.ts`,
   * `placeElement`) — für diese Runde: Was nach dem Aufräumen noch aus dem
   * Netz kommt, wird nicht mehr hingestellt.
   *
   * Die Sperre ist die der Gitterwelt (`GridWorld.blockSolid`), das Bodenstück
   * steht wie jedes Möbel hier (`placeModel`), was obenauf liegt, geht mit
   * `decor` weg — samt seiner Materialien.
   */
  protected elementHost(round = this.round): ElementHost {
    return {
      blockSolid: (cx, cz, w, d, height) => this.blockSolid(cx, cz, w, d, height),
      placeModel: (path, at, yaw) => this.placeModel(path, at, yaw),
      measure: (path) => this.measure(path),
      load: (path) => kaykitModel(path),
      add: (object) => {
        this.root.add(object);
        this.decor.push(object);
      },
      alive: () => round === this.round,
    };
  }

  /** Was die Stationen von der Welt brauchen (`elements/stationLayer.StationHost`). */
  private stationHost(): StationHost {
    return {
      addUsable: (anchor, usable, options) => this.addUsable(anchor, usable, options),
      removeUsable: (anchor) => this.removeUsable(anchor),
      announce: (text) => this.announce(text),
      held: () => this.carried,
      heldHand: () => this.carriedHand,
      setHeld: (dish, hand) => this.setCarried(dish, hand),
      busy: () => null,
      dishView: (dish) => this.dishes?.view(dish) ?? new THREE.Group(),
      picked: (taken) => playPick(taken),
      warnTone: (fast) => playWarn(fast),
    };
  }

  /**
   * **Der Feuerlöscher sprüht von selbst**, sobald man ihn trägt und damit
   * auf einen brennenden Herd in der Nähe zeigt (`StationLayer.extinguish`).
   * Die Richtung ist die, in die `A` zeigt (`core/usable.aimForward`), in der
   * Brille der Strahl der Hand, die ihn hält — wie in der Sandbox
   * (`kitchen.aimJet`).
   */
  private spray(dt: number, ctx: WorldContext): void {
    if (!this.stations) return;
    const holding = this.carried?.item === 'extinguisher';
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_turn));
    ctx.rig.getHeadForward(_headAhead);
    aimForward(ctx.topDown, _rigAhead, _headAhead, _aim);
    const controller =
      holding && this.carriedHand && ctx.renderer.xr.isPresenting
        ? ctx.input.get(this.carriedHand)
        : null;
    if (controller?.tracked) {
      controller.getRay(_ray);
      const flat = Math.hypot(_ray.direction.x, _ray.direction.z);
      if (flat > 1e-4) _aim.set(_ray.direction.x / flat, 0, _ray.direction.z / flat);
    }
    if (this.carriedView) this.carriedView.getWorldPosition(_nozzle);
    else _nozzle.set(ctx.rig.position.x, ctx.rig.getFloorY() + 0.8, ctx.rig.position.z);
    const spraying = this.stations.extinguish(dt, holding, _nozzle, _aim);
    if (spraying || this.jet) {
      this.jet ??= new SprayJet(this.root);
      this.jet.update(dt, spraying, _nozzle, _aim);
    }
  }

  /**
   * **Die Vorlage einer Datei** — einmal geladen, dann geteilt: Kopien davon
   * (`KaykitDishView`) haben Geometrie und Materialien mit ihr gemeinsam, und
   * freigegeben wird nur sie, beim Aufräumen.
   */
  private template(path: string): Promise<THREE.Object3D | null> {
    if (!canLoadModels()) return Promise.resolve(null);
    let pending = this.loading.get(path);
    if (!pending) {
      const round = this.round;
      pending = loadItemModel(path).then((model) => {
        if (!model) return null;
        if (round !== this.round) {
          dropMaterials(model);
          return null;
        }
        this.templates.set(path, model);
        return model;
      });
      this.loading.set(path, pending);
    }
    return pending;
  }

  /** Wie groß ein Modell ist (Breite, Höhe, Tiefe), gemessen an seiner Vorlage. */
  private async measure(path: string): Promise<THREE.Vector3 | null> {
    const template = await this.template(path);
    if (!template) return null;
    const box = new THREE.Box3().setFromObject(template);
    return box.isEmpty() ? null : box.getSize(new THREE.Vector3());
  }

  // --- Das Getragene --------------------------------------------------------

  /**
   * **Ein Ding der Küche in die Hand** — oder aus ihr (`StationLayer`). Das
   * Bild wird nur neu gebaut, wenn sich das Gericht geändert hat.
   */
  private setCarried(next: Dish | null, hand: Handedness | null): void {
    const before = this.carried ? dishKey(this.carried) : '';
    const after = next ? dishKey(next) : '';
    this.carried = next;
    this.carriedHand = next ? hand : null;
    if (before === after && (this.carriedView || !next)) return;
    this.carriedView?.removeFromParent();
    this.carriedView = next ? (this.dishes?.view(next) ?? null) : null;
  }

  /**
   * **Wo das Getragene hängt** — wie im Restaurant (`PlateUpWorld.carryInHands`):
   * am Schirm vor dem Bauch der Figur, aus den Augen unten im Bild, in der
   * Brille in der Hand, die es genommen hat.
   */
  private carryInHands(ctx: WorldContext): void {
    const thing = this.carriedView;
    if (!thing) {
      ctx.avatar.carry = null;
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      const controller = this.carriedHand ? ctx.input.get(this.carriedHand) : null;
      if (controller?.tracked) {
        if (thing.parent !== controller.hold) controller.hold.add(thing);
        thing.position.set(0, -0.02, -0.08);
        thing.scale.setScalar(HAND_FOOD_SCALE);
      } else {
        if (thing.parent !== ctx.rig) ctx.rig.add(thing);
        thing.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
        thing.scale.setScalar(0.8);
      }
      ctx.avatar.carry = null;
      return;
    }
    if (thing.parent !== ctx.rig) ctx.rig.add(thing);
    if (!ctx.topDown) {
      thing.position.set(0.24, ctx.rig.camera.position.y - 0.4, -0.85);
      thing.scale.setScalar(0.42);
      ctx.avatar.carry = null;
      return;
    }
    const y = CHEF_CARRY.y * ctx.avatar.stretch + ctx.avatar.bob;
    thing.position.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
    thing.scale.setScalar(1);
    ctx.avatar.carry = this.carryPoint.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
  }
}

/** Die Materialien einer Kopie freigeben — die Geometrie gehört der Vorlage im Regal. */
function dropMaterials(object: THREE.Object3D): void {
  object.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      skin.dispose();
  });
}

/** Der Stand der Stationen, den ein umgestelltes Element mitbringt (`liftElementAt`). */
function keptStates(carried: CarriedElement): readonly StationState[] {
  return Array.isArray(carried.keep) ? (carried.keep as StationState[]) : [];
}
