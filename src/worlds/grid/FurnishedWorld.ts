import * as THREE from 'three';
import { playPick, playWarn } from '../../core/Audio';
import { aimForward } from '../../core/usable';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import { kaykitModel } from '../../core/kaykitModel';
import { loadItemModel } from '../elements/itemTemplate';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import { GridWorld } from './GridWorld';
import { tileKey } from '../nav/navTile';
import { KaykitDishView, dishKey } from '../elements/dishView';
import { HAND_SCALE, dishHold, dishInHand } from '../elements/dishHold';
import {
  FURNITURE_CATALOGUE,
  FURNITURE_FOLDERS,
  elementById,
  hasElement,
  type FurnitureFolder,
} from '../elements/elementCatalog';
import {
  fitsOnShelf,
  riderPlace,
  riderSpot,
  spotAround,
  spotCells,
  spotCentre,
  spotCovers,
  spotFootprintCells,
  spotSize,
  spotTiles,
  yawFace,
  faceYaw,
  type CarriedElement,
  type ElementSpot,
  type RiderPlace,
} from '../elements/elementPlace';
import { elementModel, type ElementHost, type PlacedElement } from '../elements/elementView';
import {
  ROAD_CELL,
  ROAD_STYLE_LABELS,
  exitsIn,
  isRoadElement,
  roadKey,
  roadLine,
  roadPiece,
  roadStyleOf,
  type RoadPiece,
  type RoadStyle,
} from '../elements/roadNetwork';
import { furnish } from '../elements/furnish';
import { NATURE_CATALOGUE } from '../elements/natureCatalog';
import { SPACE_CATALOGUE } from '../elements/spaceCatalog';
import { FURNITURE_BITS_CATALOGUE } from '../elements/furnitureCatalog';
import { StationLayer, type StationHost } from '../elements/stationLayer';
import { DEFAULT_BURN, type StationState } from '../plateup/plateUpStations';
import type { PhysicsBody } from '../../physics/PhysicsWorld';
import { KitchenGauges } from '../test/zones/kitchenGauge';
import { SprayJet } from '../test/zones/kitchenSpray';
import { LeakJet } from '../test/zones/kitchenLeak';
import { iceConeIn, stepIceCones } from '../shared/iceCone';
import { WOBBLE } from '../shared/iceWobble';
import type { Dish } from '../test/zones/kitchenRecipes';
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
 * **Eine Gitterwelt mit Möbeln aus dem Katalog** — der eine Katalog für alle
 * Welten. Gewünscht: _„mir fehlen im Katalog die anderen Sachen wie Burger,
 * Eis etc.? Die sollen bitte nicht pro Welt gelten, sondern im Katalog soll es
 * für alle Welten einen Katalog geben."_
 *
 * Hier steht, was vorher nur das Test Restaurant konnte: Spielelemente
 * hinstellen (`furnishAt`, `elements/furnish.ts` → `placeElement`), im
 * Bau-Modus umstellen (`liftElementAt`), und jedes Element mit einer
 * Stationsart antwortet auf `A` nach der Regel der Küche
 * (`elements/stationLayer.ts`). Was man dabei in der Hand hat, trägt die Figur
 * wie im Restaurant (`carryInHands`).
 *
 * Eine Welt nennt, was sie von selbst hinstellt (`spots`, ab Werk nichts) und
 * wohin der Katalog stellen darf (`onGround`, ab Werk jede Kachel des
 * Erdgeschosses). Die Stationen entstehen erst, wenn sie jemand braucht
 * (`furnishing`) — eine Welt, in der nie ein Möbel steht, zahlt nichts.
 */
/** Wie durchscheinend die Geist-Straße ist. */
const ROAD_GHOST_OPACITY = 0.55;

export abstract class FurnishedWorld extends GridWorld {
  /** Was diese Welt selbst ins Bild gehängt hat — Kopien aus dem Regal. */
  private readonly elementDecor: THREE.Object3D[] = [];
  /** Hochgezählt beim Aufräumen: Was danach noch aus dem Netz kommt, wird verworfen. */
  private elementRound = 0;

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
  /**
   * Ob die Hände der Figur gerade diesem Getragenen gehören — nur dann werden
   * sie auch wieder freigegeben. Sonst nähme jedes Bild die Hände unter einem
   * Modell weg, das die Portalwelt am Schirm trägt.
   */
  private carryClaim = false;
  /** Hochgezählt je Möbel aus dem Katalog — für eindeutige Stellen. */
  private furnished = 0;
  /** Was steht, als Spielelement — zum Umstellen im Bau-Modus (`liftElementAt`). */
  private readonly placed: PlacedElement[] = [];
  /**
   * **Was gerade hingestellt wird**, nach Id der Stelle — die Modelle laden
   * noch. Eine Ablage muss schon gefunden werden, bevor sie steht: Eine
   * eingefügte Liste nennt den Schreibtisch und gleich danach den Monitor.
   */
  private readonly pending = new Map<
    string,
    { readonly spot: ElementSpot; readonly ready: Promise<PlacedElement | null> }
  >();
  /** **Die Art jeder gezogenen Straßenzelle** (`commitRoad`) — `cx,cz` → Art. */
  private readonly roadStyles = new Map<string, RoadStyle>();
  /** Die Geist-Straße (`showRoadPlan`) und ihr Schlüssel. */
  private roadGhost: THREE.Group | null = null;
  private roadPlanKey = '';
  /** Was die Geist-Straße gerade verdeckt. */
  private readonly roadHidden: THREE.Object3D[] = [];
  /** Die Geister der Straßenteile, je Element einmal (`roadTemplate`). */
  private readonly roadTemplates = new Map<string, Promise<THREE.Group | null>>();
  /** **Was auf welcher Ablage steht** — Id der Stelle → Id der Ablage. */
  private readonly riding = new Map<string, string>();

  /**
   * **Die eigenen Stellen hinstellen** (`spots`) — aus `buildProps` der Welt,
   * die welche hat (`TestRestaurantWorld`). Jede Stelle sperrt ihre Zellen,
   * sobald `placeElement` aufgerufen ist, und jedes Element mit einer
   * Stationsart wird Station — ohne zweite Liste.
   *
   * Kein eigenes `buildProps`: Das der Portalwelt stellt Würfel und Dominos
   * hin, und welche Welt die will, entscheidet sie weiter selbst.
   */
  protected furnishSpots(): void {
    if (!this.context) return;
    const spots = this.spots();
    if (spots.length === 0) return;
    void furnish(this.elementHost(), spots, this.furnishing(), (placed) =>
      this.placed.push(placed),
    );
  }

  /** **Die Stationen dieser Runde** — angelegt, sobald das erste Möbel sie braucht. */
  protected furnishing(): StationLayer {
    if (this.stations) return this.stations;
    this.gauges ??= new KitchenGauges(this.root);
    this.dishes ??= new KaykitDishView((path) => this.template(path));
    this.stations = new StationLayer(this.stationHost(), this.gauges, null, DEFAULT_BURN);
    return this.stations;
  }

  /**
   * **Was diese Welt von selbst hinstellt** — ab Werk nichts. Das Test
   * Restaurant nennt seine Burgerküche (`SPOTS`), das Restaurant und der
   * Hausbau ihre eigenen Stellen.
   */
  protected spots(): readonly ElementSpot[] {
    return [];
  }

  /**
   * **Ob die Kachel auf dem Boden liegt** — nur dorthin stellt der Katalog.
   * Ab Werk: jede Kachel, die das Erdgeschoss des Gitters kennt.
   */
  protected onGround(tx: number, tz: number): boolean {
    return this.grid?.graph.has(tileKey(tx, tz, 0)) ?? false;
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
    if (this.stations) stepIceCones(dt);
    this.gauges?.update(dt);
  }

  override dispose(ctx: WorldContext): void {
    this.hideRoadPlan();
    this.roadGhost?.removeFromParent();
    this.roadGhost = null;
    this.roadTemplates.clear();
    this.roadStyles.clear();
    this.elementRound++;
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
    this.carryClaim = false;
    this.carried = null;
    this.carriedHand = null;
    // Kopien aus dem Regal tragen eigene Materialien (`kaykitModel.copyOf`),
    // und die räumt `disposeTree` an ihnen nicht ab — also hier.
    for (const object of this.elementDecor) {
      object.removeFromParent();
      dropMaterials(object);
    }
    this.elementDecor.length = 0;
    this.placed.length = 0;
    this.pending.clear();
    this.riding.clear();
    for (const template of this.templates.values()) dropMaterials(template);
    this.templates.clear();
    this.loading.clear();
    super.dispose(ctx);
  }

  // --- Spielelemente ----------------------------------------------------------

  /**
   * **Der Möbelkatalog im Menü** (`PortalWorld.elementMenu`): Arbeitsplatte,
   * Schneidebrett, Herdplatte mit Pfanne, mit Topf und blank, Waschbecken,
   * Eis und die Vorräte, dazu die Natur (`natureCatalog.ts`), der Weltraum
   * (`spaceCatalog.ts`) und die Möbel (`furnitureCatalog.ts`) — hingestellt wie
   * jede Stelle aus `SPOTS`.
   */
  protected override elementCatalogue(): readonly string[] {
    return [
      ...FURNITURE_CATALOGUE,
      ...NATURE_CATALOGUE,
      ...SPACE_CATALOGUE,
      ...FURNITURE_BITS_CATALOGUE,
    ];
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
    level: number = this.standLevel,
  ): ElementSpot | null {
    if (!hasElement(carried.id)) return null;
    const id = carried.from?.id ?? `katalog-${++this.furnished}`;
    const at = spotAround(id, carried.id, x, z, yawFace(yaw));
    // **Auf die Etage, auf der gebaut wird** (`standLevel`) — im Weltbau die
    // unter der Hand (`GridWorld.handLevel`), etwa das Dach. Wer erst fallen
    // lässt (`dropFall.ts`), sagt die Etage vom Loslassen mit.
    const spot = onLevel(
      carried.from ? { ...grounded(carried.from), x: at.x, z: at.z, face: at.face } : at,
      level,
    );
    return this.furnishSpot(spot, keptStates(carried), carried.riders ?? []) ? spot : null;
  }

  protected override furnishBack(carried: CarriedElement): ElementSpot | null {
    const from = carried.from && grounded(carried.from);
    return from && this.furnishSpot(from, keptStates(carried), carried.riders ?? []) ? from : null;
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
    // **Was auf einer Ablage steht, geht mit** (`CarriedElement.riders`) —
    // von ihr aus gesehen, damit es nach dem Umstellen wieder an seiner
    // Stelle auf ihr steht.
    const riders = this.placed
      .filter((one) => this.riding.get(one.spot.id) === placed.spot.id)
      .map((one) => {
        const place = riderPlace(placed.spot, one.spot);
        this.takeAway(one);
        return place;
      });
    const keep = this.takeAway(placed);
    return {
      id: placed.element.id,
      from: placed.spot,
      keep,
      ...(riders.length > 0 ? { riders } : {}),
    };
  }

  protected override elementLiftTarget(x: number, z: number): THREE.Object3D | null {
    return this.placedAt(x, z)?.anchor ?? null;
  }

  protected override canEraseElements(): boolean {
    return true;
  }

  protected override elementEraseTarget(x: number, z: number): THREE.Object3D | null {
    return this.erasableAt(x, z)?.anchor ?? null;
  }

  /**
   * **Mit dem Radiergummi weg** (`PortalWorld.eraseElement`) — das Element
   * unter der Stelle samt allem, was darauf steht. Den Boden darunter
   * (`GameElement.floor`) nimmt er nicht: _„elemente löschen (nicht den
   * boden)"_.
   *
   * @param element nur ein Element mit diesem Namen (beim Einfügen einer Zeile)
   * @returns die Stellen, die jetzt leer sind — zuerst das Element selbst
   */
  protected override eraseElementAt(x: number, z: number, element?: string): ElementSpot[] {
    const placed = this.erasableAt(x, z, element);
    if (!placed) return [];
    const gone: ElementSpot[] = [placed.spot];
    const riders = this.placed.filter((one) => this.riding.get(one.spot.id) === placed.spot.id);
    for (const one of riders) {
      gone.push(one.spot);
      this.takeAway(one);
    }
    this.takeAway(placed);
    return gone;
  }

  /** Was der Radiergummi an dieser Stelle nähme — oben zuerst, nie den Boden. */
  private erasableAt(x: number, z: number, element?: string): PlacedElement | null {
    const level = this.standLevel;
    const here = this.placed.filter(
      (one) =>
        spotCovers(one.spot, x, z) &&
        (one.spot.level ?? 0) === level &&
        !one.element.floor &&
        (element === undefined || one.element.id === element),
    );
    const rank = (one: PlacedElement): number => ((one.spot.y ?? 0) > 0 ? 0 : 1);
    return here.sort((a, b) => rank(a) - rank(b))[0] ?? null;
  }

  /** **Ein Element wegnehmen** — Stationen heraus (ihr Stand kommt zurück), Zellen frei, Bild weg. */
  private takeAway(placed: PlacedElement): StationState[] {
    this.placed.splice(this.placed.indexOf(placed), 1);
    this.riding.delete(placed.spot.id);
    const keep = this.stations?.remove(placed.anchor) ?? [];
    this.unblockSolid(placed.block);
    for (const object of [placed.anchor, ...placed.parts]) {
      if (!object) continue;
      object.removeFromParent();
      const at = this.elementDecor.indexOf(object);
      if (at >= 0) this.elementDecor.splice(at, 1);
      if (object !== placed.anchor) dropMaterials(object);
    }
    void placed.base?.then((body) => {
      if (body) this.removeProp(body as PhysicsBody, false);
    });
    return keep;
  }

  /**
   * Das Element, dessen Grundfläche diesen Punkt (Meter) deckt — oder keines.
   * Auf die Grundfläche und nicht auf ihre Kacheln: Vier schmale Bäume auf
   * einer Kachel (`elementPlace.onCells`) sind vier Elemente.
   */
  private placedAt(x: number, z: number): PlacedElement | null {
    // **Von oben nach unten**: erst was auf einer Ablage steht, dann die
    // Möbel, zuletzt der Teppich darunter (`GameElement.floor`). Und nur auf
    // der Etage, auf der gebaut wird — nicht das Sofa unter dem Dach, auf das
    // man gerade zeigt.
    const level = this.standLevel;
    const here = this.placed.filter(
      (one) => spotCovers(one.spot, x, z) && (one.spot.level ?? 0) === level,
    );
    const rank = (one: PlacedElement): number =>
      (one.spot.y ?? 0) > 0 ? 0 : one.element.floor ? 2 : 1;
    return here.sort((a, b) => rank(a) - rank(b))[0] ?? null;
  }

  /**
   * **Die Ablage unter einer Stelle** (`GameElement.shelf`) — gestellt oder
   * noch im Kommen, auf dem Boden, und ihre Grundfläche deckt die Mitte der
   * Stelle.
   */
  private shelfUnder(
    spot: ElementSpot,
  ): { readonly spot: ElementSpot; readonly ready: Promise<PlacedElement | null> } | null {
    const { x, z } = spotCentre(spot);
    const standing = [
      ...this.placed.map((one) => ({ spot: one.spot, ready: Promise.resolve(one) })),
      ...this.pending.values(),
    ];
    return (
      standing.find(
        (one) =>
          (one.spot.y ?? 0) === 0 &&
          (one.spot.level ?? 0) === (spot.level ?? 0) &&
          elementById(one.spot.element).shelf === true &&
          spotCovers(one.spot, x, z),
      ) ?? null
    );
  }

  /** Die Zellen, die auf einer Ablage schon besetzt sind. */
  private takenOn(shelf: string): Set<string> {
    const taken = new Set<string>();
    const spots = [
      ...this.placed.map((one) => one.spot),
      ...[...this.pending.values()].map((one) => one.spot),
    ];
    for (const spot of spots)
      if (this.riding.get(spot.id) === shelf)
        for (const cell of spotFootprintCells(spot)) taken.add(cell);
    return taken;
  }

  /**
   * **Eine Stelle hinstellen, wenn Platz ist** — auf dem Boden und auf Zellen,
   * die frei sind (`cellsFree`). Derselbe Weg wie `SPOTS` (`furnish`): Die
   * Zellen sind gesperrt, sobald das zurückkehrt, und mit Stationsart wird es
   * Station.
   */
  protected override furnishSpot(
    spot: ElementSpot,
    keep: readonly StationState[] = [],
    riders: readonly RiderPlace[] = [],
  ): boolean {
    if (!this.context || !hasElement(spot.element)) return false;
    const flat = grounded(spot);
    // **Ablegbar und über einer Ablage** (`GameElement.rests`/`shelf`): obenauf,
    // wenn dort auf ihr noch Platz ist. Sonst steht es auf dem Boden.
    const shelf = elementById(flat.element).rests ? this.shelfUnder(flat) : null;
    if (shelf) {
      if (!fitsOnShelf(shelf.spot, flat, this.takenOn(shelf.spot.id))) return false;
      this.riding.set(flat.id, shelf.spot.id);
      this.track(
        flat,
        shelf.ready.then((under) =>
          under && this.riding.get(flat.id) === shelf.spot.id
            ? this.placeSpot({ ...flat, y: under.top }, keep)
            : null,
        ),
      );
      return true;
    }
    // **Oben auf jedem Boden der Etage** (`ElementSpot.level`) — das Dach,
    // ein Obergeschoss; unten, wo die Welt Boden sagt (`onGround`).
    const level = flat.level ?? 0;
    const graph = this.grid?.graph;
    const inside = spotTiles(flat).every((tile) => {
      const [tx, tz] = tile.split(',').map(Number);
      return level > 0 ? (graph?.has(tileKey(tx!, tz!, level)) ?? false) : this.onGround(tx!, tz!);
    });
    if (!inside || !this.cellsFree(spotCells(flat))) return false;
    this.track(
      flat,
      this.placeSpot(flat, keep).then((placed) => {
        // **Was auf der Ablage stand, kommt wieder darauf** — auf ihre neue
        // Oberkante, mitgedreht (`riderSpot`), und in die Liste der
        // Weltänderungen unter seiner alten Zeile.
        if (placed && riders.length > 0) {
          for (const place of riders) {
            const rider = riderSpot(placed.spot, place, placed.top);
            this.riding.set(rider.id, placed.spot.id);
            this.track(rider, this.placeSpot(rider, []));
            this.recordElementOf(rider);
          }
        }
        return placed;
      }),
    );
    return true;
  }

  /** Hinstellen — und, sobald es steht, in die Liste dessen, was steht. */
  private placeSpot(
    spot: ElementSpot,
    keep: readonly StationState[],
  ): Promise<PlacedElement | null> {
    return furnish(
      this.elementHost(),
      [spot],
      this.furnishing(),
      (placed) => this.placed.push(placed),
      keep,
    ).then((all) => all[0] ?? null);
  }

  /**
   * **Ein Element gegen seine nächste Fassung tauschen** (`GameElement.swap`)
   * — an derselben Stelle, unter derselben Id, in der Liste der
   * Weltänderungen unter derselben Zeile. Die Straße mit Laternen wird so zur
   * Straße mit alten Laternen.
   */
  private swapElement(anchor: THREE.Object3D): void {
    const placed = this.placed.find((one) => one.anchor === anchor);
    const next = placed?.element.swap;
    if (!placed || !next || !hasElement(next)) return;
    const keep = this.takeAway(placed);
    const spot: ElementSpot = { ...placed.spot, element: next };
    if (!this.furnishSpot(spot, keep)) {
      // Passt die neue Fassung nicht (sollte sie, sie liegt auf denselben
      // Kacheln), steht die alte wieder da.
      this.furnishSpot(placed.spot, keep);
      return;
    }
    this.recordElementOf(spot);
    this.context?.notify(elementById(next).label);
  }

  // --- Straßen ziehen (`elements/roadNetwork.ts`) ---------------------------

  /** Ob dieses Element als Straße gezogen wird — Gerade jeder Art. */
  protected override roadBrush(id: string): boolean {
    const style = roadStyleOf(id);
    return (
      style !== null && !id.startsWith('city-road-corner') && !id.startsWith('city-road-curve')
    );
  }

  /**
   * **Was eine gezogene Straße ändert** — für jede Zelle, die ein anderes
   * Teil braucht als heute: die neuen Zellen der Linie und ihre Nachbarn, die
   * dadurch zur Ecke, Einmündung oder Kreuzung werden. Zellen, auf denen schon
   * etwas anderes steht (ein Haus, ein Park) oder kein Boden ist, bleiben aus.
   */
  private planRoad(
    id: string,
    from: readonly [number, number],
    to: readonly [number, number],
  ): {
    changes: { cx: number; cz: number; piece: RoadPiece; old: PlacedElement | null }[];
    skipped: number;
    cells: number;
  } {
    const style = roadStyleOf(id) ?? 'lamps';
    const level = this.standLevel;
    const roads = new Map<string, PlacedElement>();
    for (const one of this.placed) {
      const spot = one.spot;
      if (!isRoadElement(spot.element) || (spot.level ?? 0) !== level) continue;
      if (spot.x % ROAD_CELL !== 0 || spot.z % ROAD_CELL !== 0) continue;
      roads.set(roadKey(spot.x / ROAD_CELL, spot.z / ROAD_CELL), one);
    }
    const net = new Set(roads.keys());
    const line = roadLine(from, to);
    const drawn = new Set<string>();
    let skipped = 0;
    for (const [cx, cz] of line.cells) {
      const key = roadKey(cx, cz);
      if (!roads.has(key) && !this.roadCellFree(cx, cz, level)) {
        skipped++;
        continue;
      }
      net.add(key);
      drawn.add(key);
    }
    // Betroffen sind die gezogenen Zellen und ihre Nachbarn im Netz.
    const touched = new Set<string>();
    for (const key of drawn) {
      const [cx, cz] = key.split(',').map(Number) as [number, number];
      touched.add(key);
      for (const [nx, nz] of [
        [cx, cz - 1],
        [cx + 1, cz],
        [cx, cz + 1],
        [cx - 1, cz],
      ] as const) {
        if (net.has(roadKey(nx, nz))) touched.add(roadKey(nx, nz));
      }
    }
    const changes: { cx: number; cz: number; piece: RoadPiece; old: PlacedElement | null }[] = [];
    for (const key of touched) {
      const [cx, cz] = key.split(',').map(Number) as [number, number];
      const old = roads.get(key) ?? null;
      const cellStyle: RoadStyle = drawn.has(key)
        ? style
        : (this.roadStyles.get(key) ?? (old ? roadStyleOf(old.spot.element) : null) ?? 'lamps');
      const oldFace = old?.spot.face ?? 'S';
      const along = drawn.has(key) ? line.along : oldFace === 'E' || oldFace === 'W' ? 'ew' : 'ns';
      const piece = roadPiece(exitsIn(net, cx, cz), cellStyle, along);
      if (old && old.spot.element === piece.element && (old.spot.face ?? 'S') === piece.face)
        continue;
      changes.push({ cx, cz, piece, old });
    }
    return { changes, skipped, cells: drawn.size };
  }

  /** Ob auf einer Zelle Platz für eine neue Straße ist — Boden, und nichts steht darauf. */
  private roadCellFree(cx: number, cz: number, level: number): boolean {
    const x0 = cx * ROAD_CELL;
    const z0 = cz * ROAD_CELL;
    const graph = this.grid?.graph;
    for (let z = z0; z < z0 + ROAD_CELL; z++)
      for (let x = x0; x < x0 + ROAD_CELL; x++) {
        const ground =
          level > 0 ? (graph?.has(tileKey(x, z, level)) ?? false) : this.onGround(x, z);
        if (!ground) return false;
      }
    for (const one of this.placed) {
      if ((one.spot.level ?? 0) !== level) continue;
      const [w, d] = spotSize(one.spot);
      if (
        one.spot.x < x0 + ROAD_CELL &&
        one.spot.x + w > x0 &&
        one.spot.z < z0 + ROAD_CELL &&
        one.spot.z + d > z0
      )
        return false;
    }
    return true;
  }

  /**
   * **Eine gezogene Straße bauen** (`PortalWorld.pressRoad`) — jede Zelle des
   * Plans bekommt ihr Teil, ein Teil, das dort schon stand, geht dafür (unter
   * derselben Id, also in der Liste der Weltänderungen unter derselben Zeile).
   * So werden aus Geraden Kreuzungen und aus Enden Ecken, und die Laternen
   * stehen, wie das neue Teil sie hat.
   *
   * @returns wie viele Zellen neu Straße sind
   */
  protected override commitRoad(
    id: string,
    from: readonly [number, number],
    to: readonly [number, number],
  ): number {
    this.hideRoadPlan();
    const style = roadStyleOf(id) ?? 'lamps';
    const plan = this.planRoad(id, from, to);
    const level = this.standLevel;
    for (const { cx, cz, piece, old } of plan.changes) {
      const spot: ElementSpot = {
        id: old?.spot.id ?? `strasse-${cx}-${cz}`,
        element: piece.element,
        x: cx * ROAD_CELL,
        z: cz * ROAD_CELL,
        face: piece.face,
        ...(level > 0 ? { level } : {}),
      };
      const keep = old ? this.takeAway(old) : [];
      if (this.furnishSpot(spot, keep)) this.recordElementOf(spot);
      else if (old) this.furnishSpot(old.spot, keep);
    }
    for (const [cx, cz] of roadLine(from, to).cells) this.roadStyles.set(roadKey(cx, cz), style);
    const label = ROAD_STYLE_LABELS[style];
    this.context?.notify(
      plan.skipped > 0
        ? `${label} · ${plan.cells} Stücke · ${plan.skipped} belegt`
        : `${label} · ${plan.cells} ${plan.cells === 1 ? 'Stück' : 'Stücke'}`,
    );
    return plan.cells;
  }

  /**
   * **Die Geist-Straße** — durchscheinend jedes Teil, das der Plan setzen
   * würde, an seiner Stelle; ein Teil, das er ersetzt, ist so lange
   * ausgeblendet. Neu gerechnet nur, wenn sich Start, Ende oder Art ändern.
   */
  protected override showRoadPlan(
    id: string,
    from: readonly [number, number],
    to: readonly [number, number],
  ): void {
    const key = `${id}|${from.join(',')}|${to.join(',')}|${this.placed.length}`;
    if (key === this.roadPlanKey) return;
    this.hideRoadPlan();
    this.roadPlanKey = key;
    const ghost = (this.roadGhost ??= new THREE.Group());
    ghost.name = 'road-ghost';
    if (!ghost.parent) this.root.add(ghost);
    const floor = this.grid?.graph.levelY(this.standLevel) ?? 0;
    const plan = this.planRoad(id, from, to);
    for (const { cx, cz, piece, old } of plan.changes) {
      if (old) {
        for (const part of [old.anchor, ...old.parts]) {
          if (part?.visible) {
            part.visible = false;
            this.roadHidden.push(part);
          }
        }
      }
      void this.roadTemplate(piece.element).then((template) => {
        if (!template || this.roadPlanKey !== key) return;
        const view = template.clone();
        view.rotation.y = faceYaw(piece.face);
        view.position.set(
          cx * ROAD_CELL + ROAD_CELL / 2,
          floor + 0.03,
          cz * ROAD_CELL + ROAD_CELL / 2,
        );
        ghost.add(view);
      });
    }
  }

  /** Die Geist-Straße weg, und was sie verdeckte, wieder da. */
  protected override hideRoadPlan(): void {
    this.roadPlanKey = '';
    if (this.roadGhost) this.roadGhost.clear();
    for (const part of this.roadHidden) part.visible = true;
    this.roadHidden.length = 0;
  }

  /**
   * **Das Bild eines Straßenteils als Geist** — einmal gebaut
   * (`elementModel`), mit durchscheinenden Kopien seiner Materialien.
   */
  private roadTemplate(id: string): Promise<THREE.Group | null> {
    let template = this.roadTemplates.get(id);
    if (!template) {
      template = elementModel(id, kaykitModel).then((model) => {
        if (!model) return null;
        const swap = new Map<THREE.Material, THREE.Material>();
        model.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh) return;
          const ghostOf = (material: THREE.Material): THREE.Material => {
            let made = swap.get(material);
            if (!made) {
              made = material.clone();
              made.transparent = true;
              made.opacity = ROAD_GHOST_OPACITY;
              made.depthWrite = false;
              swap.set(material, made);
            }
            return made;
          };
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(ghostOf)
            : ghostOf(mesh.material);
          mesh.renderOrder = 5;
        });
        return model;
      });
      this.roadTemplates.set(id, template);
    }
    return template;
  }

  /** Merken, was gerade hingestellt wird, bis es steht (`pending`). */
  private track(spot: ElementSpot, ready: Promise<PlacedElement | null>): void {
    const entry = { spot, ready };
    this.pending.set(spot.id, entry);
    void ready.then((placed) => {
      if (this.pending.get(spot.id) === entry) this.pending.delete(spot.id);
      if (!placed) this.riding.delete(spot.id);
    });
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
  protected elementHost(round = this.elementRound): ElementHost {
    return {
      blockSolid: (cx, cz, w, d, height, level) => this.blockSolid(cx, cz, w, d, height, level),
      floorY: (level) => this.grid?.graph.levelY(level) ?? 0,
      placeModel: (path, at, yaw) => this.placeModel(path, at, yaw),
      measure: (path) => this.measure(path),
      load: (path) => kaykitModel(path),
      add: (object) => {
        this.root.add(object);
        this.elementDecor.push(object);
      },
      alive: () => round === this.elementRound,
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
      // Die Garderobe (`elements/coatRack.ts`): _Aussehen_ gehört der App.
      // Der Schutzschrank (`spaceCatalog.SPACE_LOCKER`): hinein und heraus.
      open: (what, anchor) => {
        if (what === 'outfit') this.context?.openOutfit();
        else if (what === 'swap') this.swapElement(anchor);
        else if (this.context) this.hideIn(this.context, anchor);
      },
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
      const round = this.elementRound;
      pending = loadItemModel(path).then((model) => {
        if (!model) return null;
        if (round !== this.elementRound) {
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
      if (this.carryClaim) ctx.avatar.carry = null;
      this.carryClaim = false;
      return;
    }
    this.carryClaim = true;
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

/** **Eine Stelle auf einer Etage** — im Erdgeschoss ohne Angabe, wie jede Stelle der Pläne. */
function onLevel(spot: ElementSpot, level: number): ElementSpot {
  const { level: _was, ...flat } = spot;
  return level > 0 ? { ...flat, level } : flat;
}

/**
 * **Eine Stelle ohne Höhe** — die Höhe (`ElementSpot.y`) rechnet die Welt
 * beim Hinstellen neu aus, aus der Ablage, die dann darunter steht.
 */
function grounded(spot: ElementSpot): ElementSpot {
  if (spot.y === undefined) return spot;
  const { y: _height, ...flat } = spot;
  return flat;
}
