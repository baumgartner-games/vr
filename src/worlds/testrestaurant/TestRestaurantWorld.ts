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
import { HAND_SCALE, dishHold, dishInHand } from '../elements/dishHold';
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
import { LeakJet } from '../test/zones/kitchenLeak';
import { iceConeIn, stepIceCones } from '../shared/iceCone';
import { WOBBLE } from '../shared/iceWobble';
import type { Dish } from '../test/zones/kitchenRecipes';
import { SPOTS, ground, restaurantPlan, spawn } from './restaurantPlan';
import { atHandGrip } from '../portal/grabReach';

const _rigAhead = new THREE.Vector3();
const _headAhead = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _giverHand = new THREE.Vector3();
const _takerHand = new THREE.Vector3();
const _nozzle = new THREE.Vector3();
const _turn = new THREE.Quaternion();
const _ray = new THREE.Ray();

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
  /** Der Strahl einer undichten Spüle (`kitchenLeak.LeakJet`, wie in der Sandbox). */
  private leak: LeakJet | null = null;
  private readonly leakAt = new THREE.Vector3();
  /** Die Vorlagen, wie sie gerade laden — damit jede Datei nur einmal kommt. */
  private readonly loading = new Map<string, Promise<THREE.Object3D | null>>();
  private readonly templates = new Map<string, THREE.Object3D>();

  /** Ein Ding der Küche — was eine Kiste, ein Brett, ein Stapel hergegeben hat. */
  protected carried: Dish | null = null;
  /** Die Hand, in der es liegt. */
  protected carriedHand: Handedness | null = null;
  /** Ob die freie Hand im letzten Bild schon am Getragenen stand — für den einen Stups. */
  private passReady = false;
  private carriedView: THREE.Object3D | null = null;
  /**
   * Wie das Bild des Getragenen für sich gedreht ist — die Eiswanne liegt quer
   * (`dishView`). Die Lage in der Hand kommt obendrauf und nicht an ihre
   * Stelle.
   */
  private readonly carriedTurn = new THREE.Quaternion();
  /** Welche Hand es gerade wirklich umschließt — nur in der Brille, am Controller. */
  private gripped: Handedness | null = null;
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
    void furnish(this.elementHost(), this.spots(), this.stations, (placed) =>
      this.placed.push(placed),
    );
  }

  /**
   * **Was diese Welt hinstellt** — hier die Burgerküche (`SPOTS`). Das
   * Restaurant (`plateup/PlateUpWorld`) baut auf demselben Weg und nennt seine
   * eigenen Stellen.
   */
  protected spots(): readonly ElementSpot[] {
    return SPOTS;
  }

  /** **Ob die Kachel auf dem Boden liegt** — nur dorthin stellt der Möbelkatalog. */
  protected onGround(tx: number, tz: number): boolean {
    const g = ground();
    return tx >= g.x && tx < g.x + g.w && tz >= g.z && tz < g.z + g.d;
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.stations?.step(dt, ctx.rig.position);
    this.spray(dt, ctx);
    const leaking = this.stations?.leakingAt(this.leakAt) ?? null;
    if (leaking || this.leak) (this.leak ??= new LeakJet(this.root)).update(dt, leaking);
    this.passHands(ctx);
    this.carryInHands(ctx);
    // Erst hängt das Getragene, dann wackelt der Turm (`shared/iceCone`).
    stepIceCones(dt);
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
    this.leak?.dispose();
    this.leak = null;
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
    const inside = spotTiles(spot).every((tile) => {
      const [tx, tz] = tile.split(',').map(Number);
      return this.onGround(tx!, tz!);
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
    // **Der Kegel geht von der Figur aus**, nicht vom Löscher: Den trägt sie
    // ein Stück vor sich, und wer dicht vor dem Herd steht, hätte das Feuer
    // sonst neben oder hinter der Düse — gemeldet: _„Der Feuerlöscher hat
    // anscheinend keine 45° Winkel? … der Kegel vom Spieler aus"_. Der Nebel
    // kommt weiter aus dem Löscher.
    const spraying = this.stations.extinguish(dt, holding, ctx.rig.position, _aim);
    if (this.carriedView) this.carriedView.getWorldPosition(_nozzle);
    else _nozzle.set(ctx.rig.position.x, ctx.rig.getFloorY() + 0.8, ctx.rig.position.z);
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
  protected setCarried(next: Dish | null, hand: Handedness | null): void {
    const before = this.carried ? dishKey(this.carried) : '';
    const after = next ? dishKey(next) : '';
    this.carried = next;
    this.carriedHand = next ? hand : null;
    if (before === after && (this.carriedView || !next)) return;
    this.carriedView?.removeFromParent();
    this.carriedView = next ? (this.dishes?.view(next) ?? null) : null;
    if (this.carriedView) this.carriedTurn.copy(this.carriedView.quaternion);
  }

  /**
   * **Von Hand zu Hand** — wie bei der Pistole (`PortalWorld.handoverTool`):
   * Die freie Hand kommt an den Griff der Hand, die etwas trägt, leuchtet und
   * stupst einmal; ein Druck auf ihren Griffknopf, und das Gemüse, der Teller
   * oder das Hörnchen hängt in ihr. Gewünscht: _„mit der anderen hand
   * gegenstände wie z. B. gemüse in der welt test restaurant auch wechseln
   * können mit der anderen hand (wie bei der pistole)"_.
   *
   * Dieselbe Reichweite wie bei den Werkzeugen (`grabReach.atHandGrip`,
   * gemessen am Griffpunkt beider Hände), und nur mit einer Hand, die wirklich
   * frei ist (`handFree`) — eine Hand mit Werkzeug nimmt nichts entgegen. Eine
   * Faust, die schon zu ist, auch nicht: Der Druck zählt erst ab dem Bild, in
   * dem er beginnt (`squeeze.justPressed`).
   */
  private passHands(ctx: WorldContext): void {
    const from = this.carriedHand;
    const to: Handedness | null = from === 'left' ? 'right' : from === 'right' ? 'left' : null;
    const giver = from ? ctx.input.get(from) : null;
    const taker = to ? ctx.input.get(to) : null;
    const near =
      ctx.renderer.xr.isPresenting &&
      this.carried !== null &&
      to !== null &&
      this.handFree(to) &&
      Boolean(giver?.tracked && taker?.tracked) &&
      !taker!.squeeze.pressed &&
      atHandGrip(
        giver!.hold.getWorldPosition(_giverHand),
        taker!.hold.getWorldPosition(_takerHand),
      );
    const taking =
      ctx.renderer.xr.isPresenting &&
      this.carried !== null &&
      to !== null &&
      this.passReady &&
      this.handFree(to) &&
      Boolean(taker?.squeeze.justPressed);
    if (taking && to) {
      this.setCarried(this.carried, to);
      taker!.pulse(0.4, 30);
      playPick(true);
      this.passReady = false;
      return;
    }
    if (near && to) {
      if (!this.passReady) taker!.pulse(0.2, 12);
      ctx.hands.setGlow(to, true);
    }
    this.passReady = near;
  }

  /** Die Hand, die ein Ding der Küche trägt, schließt sich darum (`PortalWorld.carriesInHand`). */
  protected override carriesInHand(hand: Handedness): boolean {
    return this.gripped === hand;
  }

  /**
   * **Wo das Getragene hängt** — wie im Restaurant (`PlateUpWorld.carryInHands`):
   * am Schirm vor dem Bauch der Figur, aus den Augen unten im Bild, in der
   * Brille in der Hand, die es genommen hat.
   */
  private carryInHands(ctx: WorldContext): void {
    const thing = this.carriedView;
    this.gripped = null;
    if (!thing) {
      ctx.avatar.carry = null;
      return;
    }
    // In der Hand schaukelt der Turm des Hörnchens wie im Restaurant
    // (`WOBBLE.idle`); nach einem Sprung an einen anderen Platz fängt er ruhig
    // an (`settle`), statt einmal quer durchs Bild zu schwingen. Dreimal so
    // groß ist es schon im Bild selbst (`dishView.CONE_SCALE`), in der Hand
    // wie abgestellt.
    const cone = iceConeIn(thing);
    if (cone) cone.idle = WOBBLE.idle;
    const hang = (parent: THREE.Object3D): void => {
      if (thing.parent === parent) return;
      parent.add(thing);
      cone?.settle();
    };
    if (ctx.renderer.xr.isPresenting) {
      const controller = this.carriedHand ? ctx.input.get(this.carriedHand) : null;
      if (controller?.tracked && this.carried && this.carriedHand) {
        // **Am Halterzylinder** (`elements/dishHold.ts`): Das Ding liegt so in
        // der Hand, dass der Zylinder, den man auf der Seite _Halten
        // einstellen_ hineingesetzt hat, im Standardgriff der Faust liegt —
        // das Hörnchen senkrecht darin statt 8 cm davor.
        hang(controller.hold);
        const at = dishInHand(dishHold(this.carried.item), this.carriedHand);
        thing.position.set(at.position.x, at.position.y, at.position.z);
        thing.quaternion
          .set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w)
          .multiply(this.carriedTurn);
        thing.scale.setScalar(HAND_SCALE);
        this.gripped = this.carriedHand;
      } else {
        hang(ctx.rig);
        thing.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
        thing.quaternion.copy(this.carriedTurn);
        thing.scale.setScalar(0.8);
      }
      ctx.avatar.carry = null;
      return;
    }
    hang(ctx.rig);
    thing.quaternion.copy(this.carriedTurn);
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
