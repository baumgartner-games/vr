import * as THREE from 'three';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { Usable, UseSource } from '../../core/usable';
import type { KaykitFigure } from '../../core/kaykitFigure';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import { kitchenEyeScale } from '../../core/posture';
import { playPick, playTone } from '../../core/Audio';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../physics/PhysicsWorld';
import type { MenuEntry } from '../../ui/menu';
import { TextPlane } from '../../ui/TextPlane';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolid, PlanSolidKind } from '../grid/solids';
import { checkerTexture, createSky } from '../shared/environment';
import {
  KITCHEN_CHECKER_DARK,
  KITCHEN_CHECKER_JOINT,
  KITCHEN_CHECKER_LIGHT,
} from '../test/zones/kitchenFloor';
import { KitchenGauges } from '../test/zones/kitchenGauge';
import { FoodKit } from '../test/zones/kitchenProps';
import {
  kitchenInteractionSpec,
  kitchenPrompt,
  type KitchenDeed,
} from '../test/zones/kitchenCarry';
import { dish, dishLabel, type Dish } from '../test/zones/kitchenRecipes';
import { DECOR, tableSet, type DecorPiece } from './plateUpDecor';
import { PlaceGhost } from '../portal/placeGhost';
import {
  DINING_AREA,
  DOOR_INSIDE,
  DOOR_OUTSIDE,
  KITCHEN_AREA,
  PASS_END,
  ROOM,
  SPAWN_TILE,
  STATIONS,
  STREET_ENDS,
  guestRoute,
  inKitchen,
  plateUpGrid,
  routePlan,
  type FloorPoint,
  type StationSpot,
  type TableSpot,
} from './plateUpPlan';
import {
  EAT_SECONDS,
  boardLine,
  clearDish,
  clockText,
  dayRules,
  dirtyAt,
  guestGone,
  menuItem,
  newShift,
  openDay,
  patienceShare,
  seatGuest,
  sendHome,
  serveTable,
  signText,
  stepShift,
  tableWants,
  timeLeft,
  type Guest,
  type Shift,
  type ShiftEvent,
} from './plateUpGame';
import {
  burnShare,
  freshStations,
  stationDeed,
  stationProgress,
  tickStation,
  useStation,
  type StationState,
} from './plateUpStations';
import {
  aimTile,
  allTables,
  buy,
  dayOffers,
  decorCount,
  placeCheck,
  placedTiles,
  shopItem,
  OFFER_SPOTS,
  type Placed,
  type ShopItem,
} from './plateUpShop';
import { tutorialFinished, tutorialHint, type TutorialHint } from './plateUpTutorial';

/**
 * **Der Burgerladen** — eine kleine Küchenwelt mit Gastraum und einem Spiel
 * nach dem Vorbild von _PlateUp!_.
 *
 * Aufgeteilt wie überall in diesem Projekt: Die **Rechnung** steht in drei
 * Dateien ohne three.js und mit Tests daneben —
 *
 * - `plateUpPlan.ts`: Grundriss, Stationen, Tische, Wege der Gäste,
 * - `plateUpGame.ts`: der Tag — Gäste, Geduld, Bestellung, Kasse, Schwierigkeit,
 * - `plateUpStations.ts`: was ein Druck an einer Station bewirkt (die Regel
 *   selbst kommt aus der Testküche, `kitchenCarry.kitchenDeed`) —
 *
 * und diese Klasse **zeigt** nur: Möbel und Einrichtung aus dem KayKit-Regal,
 * die Figuren der Gäste, ihre Sprechblasen und Balken, das Getragene in der
 * Hand, die Tafel an der Wand und das Schild im Gastraum.
 *
 * Bedient wird wie in der Küche der Testwelt: `A` (am Schirm `E`/Maus) an
 * einer Station, in der Brille die Hand — greifen nimmt, loslassen legt ab.
 * Eine Glocke an der Durchreiche öffnet den Laden; dasselbe steht im Menü.
 */
export class PlateUpWorld extends GridWorld {
  private stations: StationState[] = freshStations(STATIONS);
  private readonly stationViews: StationView[] = [];
  private readonly tableViews: TableView[] = [];
  /** Was in der Hand liegt — `null` heißt leer. */
  private carried: Dish | null = null;
  private carriedView: THREE.Object3D | null = null;
  /** Welche Hand es in der Brille genommen hat (`UseSource.hand`). */
  private carriedHand: Handedness | null = null;
  /**
   * **Die Hand, die zuletzt etwas an einer Station getan hat** — in der
   * Brille die, die den schmutzigen Teller in die Spüle gelegt hat. In sie
   * wandert der saubere, wenn er fertig ist.
   */
  private lastHand: Handedness | null = null;
  private shift: Shift = newShift(Date.now() % 100000);
  private readonly guests = new Map<number, GuestView>();
  private readonly kit = new FoodKit();
  private gauges: KitchenGauges | null = null;
  private board: TextPlane | null = null;
  private sign: TextPlane | null = null;
  private bell: THREE.Group | null = null;
  /** Das Schildchen über der Glocke — nur, solange der Laden zu ist. */
  private bellTag: TextPlane | null = null;
  private boardText = '';
  /**
   * **Die Zeile am Schirm** — Tag, Uhr, bedient, verloren, Kasse, oben in der
   * Mitte über dem Bild. Die Tafel an der Nordwand sagt dasselbe, aber sie ist
   * nur zu sehen, solange die Kamera in der Küche steht; wer im Gastraum
   * serviert, will die Uhr trotzdem sehen. In der Brille bleibt sie aus.
   */
  private strip: HTMLDivElement | null = null;
  /**
   * **Das Schild als Karte am Telefon** — im Hochformat ist die Tafel im Raum
   * zu klein zum Lesen (sie muss ins Bild passen), also steht derselbe Text
   * unten als Karte, solange der Laden zu ist.
   */
  private card: HTMLDivElement | null = null;
  private signKey = '';
  private route = routePlan();
  /** Was zwischen den Tagen gekauft und hingestellt wurde (`plateUpShop`). */
  private placed: Placed[] = [];
  /** Alle Tische — die festen und die gekauften. */
  private tables: TableSpot[] = allTables([]);
  /** Die Modelle des Gekauften — beim Neuanfang weg damit. */
  private readonly shopRoot = new THREE.Group();
  /** Die Körper des Gekauften — sie gehen beim Neuanfang wieder weg. */
  private readonly shopBlocks: { mesh: THREE.Mesh; body: PhysicsBody }[] = [];
  /** Die Baupläne des Abends, die im Gastraum liegen. */
  private readonly offerViews: OfferView[] = [];
  private offerKey = '';
  /** Der Bauplan in der Hand — dann trägt man kein Essen, sondern ein Möbel. */
  private blueprint: ShopItem | null = null;
  private readonly shopGhost = new PlaceGhost();
  private ghostModel: THREE.Object3D | null = null;
  private ghostModelFor = '';
  /** Wohin der Bauplan zeigt — die Kachel und ob sie passt. */
  private aim: { x: number; z: number; ok: boolean; why: string } | null = null;
  private readonly aimAnchor = new THREE.Group();
  /** Die Einsteigerhilfe: an, solange sie nicht fertig oder abgeschaltet ist. */
  private tutorialOn = readTutorialOn();
  private hint: TutorialHint | null = null;
  private hintArrow: THREE.Group | null = null;
  private hintPlane: TextPlane | null = null;
  /** Die Leiste unten am Schirm: Hinweis und was man in der Hand hat. */
  private handBar: HTMLDivElement | null = null;
  /** Die Bestellzettel oben am Schirm. */
  private tickets: HTMLDivElement | null = null;
  private ticketKey = '';
  private readonly smokes = new Map<string, Smoke>();
  private stackKey = -1;
  private readonly stackPlates: THREE.Object3D[] = [];
  private readonly floors: THREE.Mesh[] = [];
  /** Die Südwand wird von oben durchsichtig — eigenes Material, eigenes Aufräumen. */
  private southGlass: THREE.MeshStandardMaterial | null = null;
  private readonly southMeshes: THREE.Mesh[] = [];
  private readonly hidden = new THREE.MeshBasicMaterial({ visible: false });
  private readonly effects: Effect[] = [];
  private sitClip: THREE.AnimationClip | null = null;
  private eyeScale = kitchenEyeScale();
  private building = 0;
  private readonly carryPoint = new THREE.Vector3();
  /**
   * **Wie schnell der Laden läuft** — 1 im Spiel. Nur die Bild-Schleife dreht
   * daran (`debugSpeed`): Im Browser ohne Grafikkarte kommen drei Bilder je
   * Sekunde an, und ein Gast bräuchte dort Minuten bis zu seinem Stuhl.
   */
  private shopSpeed = 1;

  protected override worldId(): string {
    return 'plateup';
  }

  protected override editorTitle(): string {
    return 'Burgerladen';
  }

  protected override layout(): GridPlan {
    return plateUpGrid();
  }

  protected override skyColor(): number {
    return 0x9cc9ee;
  }

  protected override lightIntensity(): number {
    return 1.2;
  }

  protected override welcome(): string {
    return 'Burgerladen — die Glocke an der Durchreiche öffnet den Laden';
  }

  /** Leere Hände: In der Küche trägt man Teller und keine Pistole. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override tint(): Partial<Record<PlanSolidKind, number>> {
    return { floor: 0x6d7480, wall: 0xd9cbb3 };
  }

  protected override horizonColor(): number {
    return 0x7fae63;
  }

  protected override horizonLine(): number {
    return 0x6f9d55;
  }

  protected override spawnPoint(): THREE.Vector3 {
    return new THREE.Vector3(SPAWN_TILE.x + 0.5, 0, SPAWN_TILE.z + 0.5);
  }

  protected override spawnYaw(): number {
    // Nach Süden, über die Durchreiche in den Gastraum.
    return Math.PI;
  }

  /** Unter den Fliesen und Dielen liegt der Estrich des Grundrisses — er bleibt Körper. */
  protected override underOwnFloor(solid: PlanSolid): boolean {
    if (solid.kind !== 'floor' && solid.kind !== 'stone') return false;
    return (
      solid.x > ROOM.x && solid.x < ROOM.x + ROOM.w && solid.z > ROOM.z && solid.z < ROOM.z + ROOM.d
    );
  }

  /** Die Wände des Grundrisses sind Körper; zu sehen sind die aus dem Katalog. */
  protected override solidMaterial(solid: PlanSolid): THREE.Material {
    if (solid.kind === 'wall') return this.hidden;
    return super.solidMaterial(solid);
  }

  protected override buildEnvironment(): void {
    // **Die Runde zuerst**: `GridWorld.buildEnvironment` ruft `buildProps`
    // schon selbst auf, und die Stationen, die dort ihre Modelle bestellen,
    // müssen dieselbe Runde sehen wie die Einrichtung danach.
    const round = ++this.building;
    super.buildEnvironment();
    this.root.add(createSky(0x7fb6e8, 0xe9f1f7));
    this.buildFloors();
    if (canLoadModels()) void this.furnish(round);
  }

  /** **Hier entsteht das Leben** — Körper, Stationen, Tafeln, Anmeldungen. */
  protected override buildProps(): void {
    if (!this.context || !this.physics) return;
    this.gauges ??= new KitchenGauges(this.root);
    for (const piece of DECOR) if (piece.solid) this.addBlock(piece.x, piece.z, piece.solid);
    for (const spot of STATIONS) this.addBlock(spot.x + 0.5, spot.z + 0.5, [1, 1]);
    this.buildStations();
    this.buildTables();
    this.buildBell();
    this.buildBoards();
    this.shopRoot.name = 'plateup-shop';
    this.root.add(this.shopRoot);
    this.root.add(this.shopGhost.root);
    this.aimAnchor.name = 'plateup-aim';
    this.root.add(this.aimAnchor);
    this.buildHint();
    // Nach einem Neuaufbau (Editor, Neuladen) steht das Gekaufte wieder da.
    for (const p of this.placed) this.buildPlaced(p);
    if (canLoadModels()) void this.loadGuestsKit();
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    const feet = ctx.rig.position;
    const inside = inKitchen(feet.x, feet.z);
    ctx.rig.eyeScale = inside && ctx.renderer.xr.isPresenting && !ctx.topDown ? this.eyeScale : 1;
    ctx.rig.jumpLock = inside;

    const step = dt * this.shopSpeed;
    this.stepStations(step, feet);
    this.stepShift(step);
    this.stepGuests(step, ctx);
    this.stepEffects(step);
    this.stepShop(ctx);
    this.refreshUsables();
    this.carryInHands(ctx);
    this.refreshBoards(ctx);
    this.refreshStrip(ctx);
    this.refreshHint(ctx);
    this.refreshHud(ctx);
    this.gauges?.update(dt);
    // **Im Hochformat schrumpfen die Tafeln.** Ein Schild von 3,4 m ragt auf
    // einem Telefon links und rechts aus dem Bild — und was man dort lesen
    // soll, steht genau am Rand.
    const aspect = (ctx.viewCamera ?? ctx.camera).aspect;
    const fit = ctx.topDown && aspect < 1 ? Math.max(0.45, aspect * 0.95) : 1;
    this.sign?.scale.setScalar(fit);
    this.board?.scale.setScalar(fit);
    if (this.southGlass) {
      const see = ctx.topDown;
      this.southGlass.opacity = see ? 0.22 : 1;
      this.southGlass.transparent = see;
      this.southGlass.depthWrite = !see;
    }
  }

  protected override worldReset(): void {
    this.resetGame();
  }

  override menu(): MenuEntry[] {
    const phase = this.shift.phase;
    const open = phase === 'open' || phase === 'closing';
    const extra: MenuEntry[] = [];
    if (this.blueprint) {
      extra.push({
        id: 'plateup:drop',
        label: 'Bauplan zurücklegen',
        sub: `${this.blueprint.label} — nichts gekauft`,
        icon: 'back',
        accent: 0x5aa0e0,
        run: () => this.dropBlueprint(),
      });
    }
    extra.push({
      id: 'plateup:tutorial',
      label: this.tutorialOn ? 'Einsteigerhilfe aus' : 'Einsteigerhilfe an',
      sub: this.tutorialOn
        ? 'Keine Hinweise und Pfeile mehr'
        : 'Hinweise, was als Nächstes zu tun ist — ab jetzt wieder',
      icon: 'sign',
      accent: 0x5ee0a0,
      run: () => this.setTutorial(!this.tutorialOn),
    });
    return [
      {
        id: 'plateup:open',
        label: open
          ? `Tag ${this.shift.day} läuft`
          : phase === 'closed'
            ? 'Nächster Tag'
            : 'Laden öffnen',
        sub: open ? boardLine(this.shift) : 'Dasselbe wie die Glocke an der Durchreiche',
        icon: 'stopwatch',
        accent: 0xf2a33a,
        run: () => this.ringBell(),
      },
      ...extra,
      ...super.menu(),
    ];
  }

  override dispose(ctx: WorldContext): void {
    this.building++;
    ctx.rig.eyeScale = 1;
    ctx.rig.jumpLock = false;
    ctx.avatar.carry = null;
    for (const view of this.guests.values()) view.figure?.dispose();
    this.guests.clear();
    this.dropHeldView();
    for (const effect of this.effects) effect.dispose();
    this.effects.length = 0;
    this.gauges?.dispose();
    this.gauges = null;
    this.strip?.remove();
    this.strip = null;
    this.handBar?.remove();
    this.handBar = null;
    this.tickets?.remove();
    this.tickets = null;
    this.ticketKey = '';
    this.hintPlane?.dispose();
    this.hintPlane = null;
    this.hintArrow = null;
    this.hint = null;
    for (const smoke of this.smokes.values()) smoke.dispose();
    this.smokes.clear();
    this.shopGhost.dispose();
    this.clearOffers();
    this.blueprint = null;
    this.stackKey = -1;
    this.stackPlates.length = 0;
    this.card?.remove();
    this.card = null;
    this.board?.dispose();
    this.sign?.dispose();
    this.bellTag?.dispose();
    this.bellTag = null;
    this.board = null;
    this.sign = null;
    for (const floor of this.floors) {
      const material = floor.material as THREE.MeshStandardMaterial;
      material.map?.dispose();
      material.dispose();
      floor.geometry.dispose();
    }
    this.floors.length = 0;
    this.southGlass?.dispose();
    this.southGlass = null;
    this.southMeshes.length = 0;
    this.kit.dispose();
    this.stationViews.length = 0;
    this.tableViews.length = 0;
    super.dispose(ctx);
    this.hidden.dispose();
  }

  // --- Boden und Einrichtung ------------------------------------------------

  /** Fliesen in der Küche, warme Dielen im Gastraum — eine Fläche je Raum. */
  private buildFloors(): void {
    if (!canLoadModels()) return;
    const rooms: Array<[typeof KITCHEN_AREA, number, number, number, number]> = [
      [KITCHEN_AREA, KITCHEN_CHECKER_LIGHT, KITCHEN_CHECKER_JOINT, KITCHEN_CHECKER_DARK, 0.5],
      [DINING_AREA, 0xc89a64, 0x8b6038, 0xb4834f, 1],
    ];
    for (const [rect, light, joint, dark, cell] of rooms) {
      const texture = checkerTexture(light, joint, dark);
      texture.repeat.set(rect.w / (2 * cell), rect.d / (2 * cell));
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(rect.w, rect.d),
        new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6, metalness: 0.03 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(rect.x + rect.w / 2, 0.002, rect.z + rect.d / 2);
      mesh.receiveShadow = true;
      mesh.name = 'plateup-floor';
      this.root.add(mesh);
      this.floors.push(mesh);
    }
  }

  /** Alles aus dem Regal hinstellen — Wände, Tische, Lampen, Straße, Stationen. */
  private async furnish(round: number): Promise<void> {
    const [{ dinerModel }, { kaykitModel }] = await Promise.all([
      import('../../core/dinerModel'),
      import('../../core/kaykitModel'),
    ]);
    const jobs: Promise<void>[] = [];
    for (const piece of DECOR) {
      jobs.push(
        this.placeDecor(piece, round, (name) =>
          piece.source === 'diner' ? dinerModel(name) : kaykitModel(name),
        ),
      );
    }
    await Promise.all(jobs);
    await this.kit.warm();
    if (round !== this.building) return;
    for (const view of this.stationViews) view.shown = '';
    this.stackKey = -1;
    for (const view of this.tableViews) view.dirtyShown = -1;
  }

  private async placeDecor(
    piece: DecorPiece,
    round: number,
    load: (name: string) => Promise<THREE.Object3D | null>,
  ): Promise<void> {
    const model = await load(piece.name);
    if (!model || round !== this.building) return;
    if (piece.height !== undefined) fitHeight(model, piece.height);
    if (piece.width !== undefined) fitWidth(model, piece.width);
    model.position.set(piece.x, piece.y ?? 0, piece.z);
    model.rotation.y = piece.yaw ?? 0;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = !piece.south;
      mesh.receiveShadow = true;
      if (piece.south) this.glassSouth(mesh);
    });
    this.root.add(model);
  }

  /** Die Südwand bekommt ein eigenes Material, das von oben durchsichtig wird. */
  private glassSouth(mesh: THREE.Mesh): void {
    const source = mesh.material as THREE.MeshStandardMaterial;
    this.southGlass ??= source.clone();
    mesh.material = this.southGlass;
    this.southMeshes.push(mesh);
  }

  /** Ein unsichtbarer Körper auf einer Grundfläche — dagegen läuft man. */
  private addBlock(x: number, z: number, size: readonly [number, number], shop = false): void {
    const physics = this.physics;
    if (!physics) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], BLOCK_HEIGHT, size[1]), this.hidden);
    mesh.position.set(x, BLOCK_HEIGHT / 2, z);
    mesh.name = 'plateup-block';
    this.root.add(mesh);
    mesh.updateMatrixWorld(true);
    this.solids.push(mesh);
    const body = physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    if (shop) this.shopBlocks.push({ mesh, body });
  }

  // --- Stationen ------------------------------------------------------------

  private buildStations(): void {
    this.stationViews.length = 0;
    STATIONS.forEach((spot, index) => {
      const anchor = new THREE.Group();
      anchor.name = `plateup-station:${spot.id}`;
      anchor.position.set(spot.x + 0.5, 0, spot.z + 0.5);
      this.root.add(anchor);
      const view: StationView = {
        spot,
        index,
        anchor,
        top: STATION_TOP[spot.kind] ?? 0.5,
        content: null,
        shown: '',
        deedKey: '',
      };
      this.stationViews.push(view);
      if (canLoadModels()) void this.stationModel(view, this.building);
    });
  }

  private async stationModel(view: StationView, round: number): Promise<void> {
    const { dinerModel } = await import('../../core/dinerModel');
    const model = await dinerModel(view.spot.model);
    if (!model || round !== this.building) return;
    model.rotation.y = view.spot.face === 0 ? Math.PI : 0;
    view.anchor.add(model);
    // Was auf der Station liegt, sitzt oben auf dem Möbel — gemessen und nicht
    // abgeschrieben: Kisten sind verschieden hoch.
    const box = new THREE.Box3().setFromObject(model);
    if (!box.isEmpty() && view.spot.kind !== 'crate') view.top = box.max.y;
    if (view.spot.kind === 'board') void this.addBoardProp(view, round);
    if (view.spot.kind === 'bin') void this.addBinProp(view, round);
    if (view.spot.kind === 'box') void this.addPlateStack(view, round);
  }

  private async addBoardProp(view: StationView, round: number): Promise<void> {
    const { dinerModel } = await import('../../core/dinerModel');
    const board = await dinerModel('cuttingboard');
    if (!board || round !== this.building) return;
    board.position.y = view.top;
    view.anchor.add(board);
    view.top += 0.04;
  }

  private async addBinProp(view: StationView, round: number): Promise<void> {
    const { kaykitModel } = await import('../../core/kaykitModel');
    const bin = await kaykitModel('block-bits/trashcan.glb');
    if (!bin || round !== this.building) return;
    // Der Mülleimer steht neben der Zeile und nicht darauf — der Schrank
    // darunter verschwindet dafür.
    for (const child of [...view.anchor.children]) view.anchor.remove(child);
    fitHeight(bin, 0.55);
    view.anchor.add(bin);
    view.top = 0.55;
  }

  private async addPlateStack(view: StationView, round: number): Promise<void> {
    const { dinerModel } = await import('../../core/dinerModel');
    const rack = await dinerModel('dishrack');
    if (!rack || round !== this.building) return;
    rack.position.y = view.top;
    view.anchor.add(rack);
    this.stackKey = -1;
  }

  /**
   * **Der Tellerstapel zeigt, wie viele noch da sind** — ein Teller je
   * sauberem Teller, übereinander. Ist er leer, sieht man es, bevor man
   * hingeht.
   */
  private refreshPlateStack(): void {
    const index = this.stations.findIndex((s) => s.spot.kind === 'drain');
    const state = this.stations[index];
    const view = this.stationViews[index];
    if (!state || !view || state.stock === this.stackKey) return;
    this.stackKey = state.stock;
    for (const plate of this.stackPlates) plate.removeFromParent();
    this.stackPlates.length = 0;
    for (let i = 0; i < state.stock; i++) {
      const plate = this.kit.view(dish('plate'));
      if (!plate) break;
      plate.position.set(0, view.top + 0.02 + i * 0.035, 0);
      plate.rotation.y = i * 0.35;
      view.anchor.add(plate);
      this.stackPlates.push(plate);
    }
  }

  private useStationAt(index: number, by: UseSource): boolean {
    const state = this.stations[index];
    if (!state) return false;
    const result = useStation(this.carried, state);
    const deed = result.deed;
    if (deed.do === 'nothing') return false;
    if (deed.do === 'refuse') {
      this.announce(deed.why);
      return false;
    }
    const tookHand = !this.carried && result.held;
    if (by.hand) this.lastHand = by.hand;
    playPick(!!result.held && deed.do !== 'scrape');
    this.stations = this.stations.map((s, i) => (i === index ? result.station : s));
    this.setHeld(result.held, tookHand ? (by.hand ?? null) : this.carriedHand);
    return true;
  }

  private stepStations(dt: number, feet: THREE.Vector3): void {
    let changed = false;
    const burn = dayRules(Math.max(1, this.shift.day)).burn;
    let toHand: Dish | null = null;
    const next = this.stations.map((state, i) => {
      const view = this.stationViews[i];
      const near =
        !!view &&
        Math.hypot(feet.x - view.anchor.position.x, feet.z - view.anchor.position.z) < NEAR_STATION;
      const tick = tickStation(state, dt, near, !this.carried && !this.blueprint && !toHand, burn);
      if (tick.station !== state) changed = true;
      if (tick.toHand) toHand = tick.toHand;
      if (tick.burnt) {
        this.announce('Ein Patty ist verbrannt — ab in den Mülleimer!');
        playTone({ type: 'sawtooth', from: 220, to: 110, duration: 0.5, gain: 0.05 });
      } else if (tick.done && state.spot.kind === 'griddle') {
        // Fertig gebraten: ein kurzes Brutzeln nach oben — hol es ab!
        chime([784, 1175], 0.06);
      }
      return tick.station;
    });
    if (changed) this.stations = next;
    if (toHand) {
      this.setHeld(toHand, this.lastHand);
      playPick(true);
      this.announce('Sauberer Teller — ab auf den Stapel oder gleich belegen');
    }
    this.refreshPlateStack();
    for (const view of this.stationViews) {
      const state = this.stations[view.index]!;
      const key = state.on ? dishKey(state.on) : '';
      if (key !== view.shown) {
        view.shown = key;
        view.content?.removeFromParent();
        view.content = null;
        if (state.on) {
          const shown = this.kit.view(state.on);
          if (shown) {
            shown.position.y = view.top;
            view.anchor.add(shown);
            view.content = shown;
          }
        }
      }
      const part = stationProgress(state);
      const at = view.anchor.position;
      const heat = burnShare(state, burn);
      if (part > 0) {
        this.gauges?.bar(
          `station:${view.spot.id}`,
          _v.set(at.x, view.top + 0.35, at.z),
          part,
          view.spot.kind === 'griddle' ? 'cook' : 'chop',
        );
      } else if (heat > 0) {
        // **Fertig, und die Uhr läuft weiter**: Der Balken wird rot und
        // füllt sich bis zum Verbrennen, ab der Hälfte mit Warnzeichen.
        this.gauges?.bar(
          `station:${view.spot.id}`,
          _v.set(at.x, view.top + 0.35, at.z),
          heat,
          'burn',
        );
      } else this.gauges?.clear(`station:${view.spot.id}`);
      if (view.spot.kind === 'griddle') {
        this.gauges?.flame(
          `flame:${view.spot.id}`,
          state.work.working ? _v.set(at.x, view.top, at.z) : null,
        );
        this.gauges?.warn(`warn:${view.spot.id}`, heat > 0.5 ? _v.set(at.x, view.top, at.z) : null);
        const smoky = heat > 0.5 || state.on?.item === 'patty-burnt';
        let smoke = this.smokes.get(view.spot.id);
        if (smoky && !smoke) {
          smoke = new Smoke(this.root, at.x, view.top + 0.08, at.z);
          this.smokes.set(view.spot.id, smoke);
        } else if (!smoky && smoke) {
          smoke.dispose();
          this.smokes.delete(view.spot.id);
          smoke = undefined;
        }
        smoke?.step(dt, state.on?.item === 'patty-burnt' ? 1 : heat);
      }
    }
  }

  // --- Tische, Glocke, Tafeln -----------------------------------------------

  private buildTables(): void {
    this.tableViews.length = 0;
    for (const t of this.tables) this.addTableView(t);
  }

  private addTableView(t: TableSpot): void {
    const anchor = new THREE.Group();
    anchor.name = `plateup-table:${t.index}`;
    anchor.position.set(t.x + 1, 0, t.z + 1);
    this.root.add(anchor);
    this.tableViews.push({
      table: t.index,
      anchor,
      plates: new Map(),
      dirty: [],
      dirtyShown: -1,
      deedKey: '',
    });
  }

  /**
   * **Was `A` an einem Tisch meint** — abräumen, servieren oder hören, was
   * bestellt ist. Abräumen geht vor: Wer mit leeren Händen an einen Tisch mit
   * schmutzigem Geschirr kommt, will es mitnehmen.
   */
  private tableDeed(index: number): KitchenDeed {
    const wants = tableWants(this.shift, index);
    const dirty = dirtyAt(this.shift, index);
    if (!this.carried && !this.blueprint && dirty > 0) {
      return { do: 'take', dish: dish('plate-dirty') };
    }
    if (!wants.length) {
      if (dirty > 0 && this.carried) {
        return { do: 'refuse', why: 'Hände frei machen, dann das Geschirr abräumen' };
      }
      return { do: 'nothing' };
    }
    if (this.blueprint) return { do: 'nothing' };
    if (!this.carried) return { do: 'refuse', why: `Bestellt: ${wants.join(' und ')}` };
    return { do: 'place', dish: this.carried };
  }

  private useTable(index: number, by: UseSource): boolean {
    const deed = this.tableDeed(index);
    if (deed.do === 'take') {
      const next = clearDish(this.shift, index);
      if (!next) return false;
      this.shift = next;
      this.setHeld(dish('plate-dirty'), by.hand ?? null);
      playPick(true);
      return true;
    }
    return this.serveAt(index);
  }

  private serveAt(index: number): boolean {
    const result = serveTable(this.shift, index, this.carried);
    if (!result.ok) {
      this.announce(result.why);
      return false;
    }
    this.shift = result.shift;
    const view = this.tableViews[index];
    const served = this.carried;
    this.setHeld(null, null);
    if (view && served) {
      const plate = this.kit.view(served);
      if (plate) {
        const t = this.tables[index]!;
        const at = platePlace(t, result.guest.seat);
        plate.position.set(at.x - (t.x + 1), TABLE_TOP, at.z - (t.z + 1));
        view.anchor.add(plate);
        view.plates.set(result.guest.id, plate);
      }
    }
    this.announce(`${menuItem(result.guest.order).label} serviert — guten Appetit!`);
    chime([660, 880], 0.12);
    return true;
  }

  /** Das schmutzige Geschirr auf den Tischen — so viele Teller, wie `dirty` sagt. */
  private refreshDirty(): void {
    for (const view of this.tableViews) {
      const count = dirtyAt(this.shift, view.table);
      if (count === view.dirtyShown) continue;
      view.dirtyShown = count;
      for (const plate of view.dirty) plate.removeFromParent();
      view.dirty.length = 0;
      const t = this.tables[view.table];
      if (!t) continue;
      for (let i = 0; i < count; i++) {
        const plate = this.kit.view(dish('plate-dirty'));
        if (!plate) break;
        const at = platePlace(t, i % 2);
        plate.position.set(
          at.x - (t.x + 1),
          TABLE_TOP + Math.floor(i / 2) * 0.04,
          at.z - (t.z + 1),
        );
        plate.rotation.y = i * 0.7;
        view.anchor.add(plate);
        view.dirty.push(plate);
      }
    }
  }

  private buildBell(): void {
    const bell = new THREE.Group();
    bell.name = 'plateup-bell';
    bell.position.set(PASS_END.x + 0.5, 0.5, PASS_END.z + 0.5);
    this.root.add(bell);
    this.bell = bell;
    if (!canLoadModels()) return;
    const round = this.building;
    void import('../../core/kaykitModel').then(async ({ kaykitModel }) => {
      const model = await kaykitModel('holiday-bits/bell.glb');
      if (!model || round !== this.building) return;
      fitHeight(model, 0.3);
      bell.add(model);
    });
  }

  private buildBoards(): void {
    if (!canLoadModels()) return;
    const board = new TextPlane({
      width: 5.6,
      height: 0.95,
      title: 'Burgerladen',
      body: '',
      align: 'center',
      accent: 0xf2a33a,
      face: { upright: true },
    });
    // Über der Nordwand und nicht davor: Von oben läge eine Tafel vor der
    // Wand quer über den Kisten, und die will man sehen.
    board.position.set(7, 2.55, -0.35);
    this.root.add(board);
    this.board = board;

    const sign = new TextPlane({
      width: 3.4,
      height: 2.0,
      title: 'Burgerladen',
      body: '',
      accent: 0xf2a33a,
      face: true,
    });
    // Gleich südlich der Durchreiche, vor der Figur am Startplatz: Das Schild
    // ist beim Ankommen das Erste, was man liest, und steht nur da, solange
    // der Laden zu ist.
    sign.position.set(7, 1.35, 4.7);
    this.root.add(sign);
    this.sign = sign;

    const tag = new TextPlane({
      width: 1.1,
      height: 0.34,
      title: 'Laden öffnen',
      align: 'center',
      accent: 0xf2a33a,
      face: true,
    });
    tag.position.set(PASS_END.x + 0.5, 1.2, PASS_END.z + 0.5);
    this.root.add(tag);
    this.bellTag = tag;
    this.boardText = '';
    this.signKey = '';
  }

  private refreshStrip(ctx: WorldContext): void {
    if (typeof document === 'undefined') return;
    if (!this.strip) {
      const strip = document.createElement('div');
      strip.className = 'plateup-strip';
      strip.style.cssText = [
        'position:fixed',
        'left:50%',
        'top:calc(env(safe-area-inset-top, 0px) + 64px)',
        'transform:translateX(-50%)',
        'padding:6px 14px',
        'border-radius:999px',
        'background:rgba(20,24,32,0.82)',
        'border:2px solid #f2a33a',
        'color:#fff',
        'font:600 14px/1.2 system-ui,sans-serif',
        'white-space:nowrap',
        'pointer-events:none',
        'z-index:4',
        'max-width:calc(100vw - 24px)',
        'overflow:hidden',
        'text-overflow:ellipsis',
      ].join(';');
      document.body.appendChild(strip);
      this.strip = strip;
    }
    const open = this.shift.phase === 'open' || this.shift.phase === 'closing';
    const flat = !ctx.renderer.xr.isPresenting;
    const narrow = window.innerWidth < 520 || window.innerWidth < window.innerHeight;
    this.strip.hidden = !(open && flat);
    if (open && flat) {
      const text = narrow ? stripShort(this.shift) : boardLine(this.shift);
      if (this.strip.textContent !== text) this.strip.textContent = text;
    }
    const cardOn = !open && flat && narrow && ctx.topDown;
    if (this.sign) this.sign.visible = this.sign.visible && !cardOn;
    if (!cardOn) {
      if (this.card) this.card.hidden = true;
      return;
    }
    if (!this.card) {
      const card = document.createElement('div');
      card.className = 'plateup-card';
      card.style.cssText = [
        'position:fixed',
        'left:50%',
        'bottom:calc(env(safe-area-inset-bottom, 0px) + 18px)',
        'transform:translateX(-50%)',
        'width:min(92vw, 420px)',
        'box-sizing:border-box',
        'padding:12px 16px',
        'border-radius:16px',
        'background:rgba(20,24,32,0.9)',
        'border:2px solid #f2a33a',
        'color:#e8e8e8',
        'font:14px/1.35 system-ui,sans-serif',
        'white-space:pre-line',
        'pointer-events:none',
        'z-index:4',
      ].join(';');
      document.body.appendChild(card);
      this.card = card;
    }
    this.card.hidden = false;
    // Wie die Leiste in `refreshHud`: über der Tastenleiste, nicht dahinter.
    const cardBottom = `${aboveHints(18)}px`;
    if (this.card.style.bottom !== cardBottom) this.card.style.bottom = cardBottom;
    const sign = signText(this.shift);
    const text = `${sign.title}\n${sign.body}`;
    if (this.card.dataset.text !== text) {
      this.card.dataset.text = text;
      this.card.textContent = '';
      const head = document.createElement('div');
      head.textContent = sign.title;
      head.style.cssText = 'font:700 20px/1.2 system-ui,sans-serif;color:#fff;margin-bottom:6px';
      const body = document.createElement('div');
      body.textContent = sign.body.replace(/\n(?=[a-zäöüß(])/g, ' ');
      this.card.append(head, body);
    }
  }

  private refreshBoards(ctx: WorldContext): void {
    // **Die Tafel ist für die Brille.** Am Schirm stehen Uhr und Bestellungen
    // in der Zeile und auf den Zetteln oben (`refreshHud`) — die Tafel im Raum
    // lag dort genau dahinter und sagte dasselbe noch einmal, kleiner.
    if (this.board) this.board.visible = ctx.renderer.xr.isPresenting;
    const line = boardLine(this.shift);
    const orders = [...this.shift.guests]
      .filter((g) => g.phase === 'waiting')
      .sort((a, b) => a.patience - b.patience)
      .map((g) => `Tisch ${g.table + 1}: ${menuItem(g.order).label}`)
      .join('   ');
    const text = `${line}\n${orders || (this.shift.phase === 'open' ? 'Keine offenen Bestellungen' : '')}`;
    if (this.board && text !== this.boardText) {
      this.boardText = text;
      const [title, body] = text.split('\n');
      this.board.setText(title ?? '', body ?? '');
    }
    const phase = this.shift.phase;
    const showSign = phase === 'ready' || phase === 'closed' || phase === 'over';
    if (this.bellTag) this.bellTag.visible = showSign;
    if (this.sign) {
      this.sign.visible = showSign;
      const key = `${phase}:${this.shift.day}:${this.shift.total}`;
      if (showSign && key !== this.signKey) {
        this.signKey = key;
        const sign = signText(this.shift);
        this.sign.setText(sign.title, sign.body, phase === 'over' ? 0xe0584f : 0xf2a33a);
        this.bellTag?.setText(
          phase === 'closed' ? 'Nächster Tag' : phase === 'over' ? 'Neu anfangen' : 'Laden öffnen',
        );
      }
    }
  }

  private ringBell(): boolean {
    const phase = this.shift.phase;
    if (phase === 'open' || phase === 'closing') {
      this.announce(boardLine(this.shift));
      return false;
    }
    if (phase === 'over') {
      this.clearGuests();
      this.clearPlaced();
    }
    // **Über Nacht wird aufgeräumt**: Stationen leer, Teller gespült, Hände
    // frei, und wer noch einen Bauplan trug, hat ihn zurückgelegt.
    this.blueprint = null;
    this.clearOffers();
    this.stations = freshStations(STATIONS);
    this.setHeld(null, null);
    this.shift = { ...openDay(this.shift), decor: decorCount(this.placed) };
    this.refreshDirty();
    this.announce(`Tag ${this.shift.day}: Der Laden ist offen!`);
    // Die Glocke: ein heller Schlag mit einem Oberton, der nachklingt.
    playTone({ type: 'sine', from: 1318, duration: 0.9, gain: 0.08 });
    playTone({ type: 'sine', from: 2637, duration: 0.5, gain: 0.03 });
    this.effects.push(new Ring(this.root, this.bell?.position ?? _v.set(0, 0, 0), 0xf2a33a));
    return true;
  }

  // --- Anmelden: was `A` gerade meint ---------------------------------------

  private refreshUsables(): void {
    for (const view of this.stationViews) {
      const state = this.stations[view.index]!;
      const deed = stationDeed(this.carried, state);
      const key = `${deed.do}:${this.carried ? dishKey(this.carried) : ''}:${state.on ? dishKey(state.on) : ''}`;
      if (key === view.deedKey) continue;
      view.deedKey = key;
      if (deed.do === 'nothing') {
        this.removeUsable(view.anchor);
        continue;
      }
      const index = view.index;
      const usable: Usable = {
        use: (by) => this.useStationAt(index, by),
        usePrompt: () =>
          kitchenPrompt(stationDeed(this.carried, this.stations[index]!), view.spot.label),
        interaction: kitchenInteractionSpec(deed),
      };
      this.addUsable(view.anchor, usable, { radius: 0.5, half: 0.6 });
    }
    for (const view of this.tableViews) {
      const deed = this.tableDeed(view.table);
      const key = `${deed.do}:${this.carried ? dishKey(this.carried) : ''}:${dirtyAt(this.shift, view.table)}`;
      if (key === view.deedKey) continue;
      view.deedKey = key;
      if (deed.do === 'nothing') {
        this.removeUsable(view.anchor);
        continue;
      }
      const index = view.table;
      const usable: Usable = {
        use: (by) => this.useTable(index, by),
        usePrompt: () => {
          const d = this.tableDeed(index);
          if (d.do === 'take') return 'Geschirr abräumen';
          return d.do === 'refuse'
            ? d.why
            : `${this.carried ? dishLabel(this.carried) : 'Teller'} servieren`;
        },
        interaction: kitchenInteractionSpec(deed),
      };
      this.addUsable(view.anchor, usable, { radius: 1.25, half: 0.6 });
    }
    if (this.bell && !this.bell.userData.plateupBell) {
      this.bell.userData.plateupBell = true;
      this.addUsable(
        this.bell,
        {
          use: () => this.ringBell(),
          usePrompt: () => (this.shift.phase === 'closed' ? 'Nächster Tag' : 'Laden öffnen'),
        },
        { radius: 0.5, half: 0.6 },
      );
    }
  }

  // --- Das Getragene --------------------------------------------------------

  private setHeld(next: Dish | null, hand: Handedness | null): void {
    const before = this.carried ? dishKey(this.carried) : '';
    const after = next ? dishKey(next) : '';
    this.carried = next;
    this.carriedHand = next ? hand : null;
    if (before === after && this.carriedView) return;
    this.dropHeldView();
    if (!next) return;
    this.carriedView = this.kit.view(next);
  }

  private dropHeldView(): void {
    this.carriedView?.removeFromParent();
    this.carriedView = null;
  }

  /**
   * **Wo das Getragene hängt** — dieselbe Stelle wie in der Testküche:
   * am Schirm vor dem Bauch der Figur (`chefFit.CHEF_CARRY`), in der Brille
   * in der Hand, die es genommen hat, und ohne Hand vor der Brust.
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
        thing.rotation.set(0, 0, 0);
        thing.scale.setScalar(0.8);
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
      // **Aus den Augen** hängt es unten im Bild und nicht vor dem Bauch —
      // dort läge es unter dem Blickfeld, und man trüge etwas, das man nicht
      // sieht.
      // Kleiner als im Raum: Ein Teller von 47 cm eine Armlänge vor dem
      // Auge deckte das halbe Bild zu.
      thing.position.set(0.24, ctx.rig.camera.position.y - 0.4, -0.85);
      thing.rotation.set(0, 0, 0);
      thing.scale.setScalar(0.42);
      ctx.avatar.carry = null;
      return;
    }
    const y = CHEF_CARRY.y * ctx.avatar.stretch + ctx.avatar.bob;
    thing.position.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
    thing.rotation.set(0, 0, 0);
    thing.scale.setScalar(1);
    ctx.avatar.carry = this.carryPoint.set(CHEF_CARRY.x, y, CHEF_CARRY.z);
  }

  // --- Der Tag --------------------------------------------------------------

  private stepShift(dt: number): void {
    const tick = stepShift(this.shift, dt, this.tables.length);
    this.shift = tick.shift;
    for (const event of tick.events) this.onEvent(event);
    this.refreshDirty();
  }

  private onEvent(event: ShiftEvent): void {
    switch (event.kind) {
      case 'arrive':
        this.spawnGuest(event.guest);
        break;
      case 'angry':
        this.announce(`Tisch ${event.guest.table + 1}: zu lange gewartet — der Gast geht hungrig.`);
        playTone({ type: 'sawtooth', from: 330, to: 160, duration: 0.45, gain: 0.05 });
        this.leave(event.guest);
        break;
      case 'paid': {
        this.announce(`Tisch ${event.guest.table + 1} zahlt ${event.coins} Münzen`);
        chime([1568, 2093, 2637], 0.07);
        this.leave(event.guest);
        const t = this.tables[event.guest.table]!;
        this.effects.push(new CoinPop(this.root, t.x + 1, t.z + 1, event.coins));
        break;
      }
      case 'closing':
        this.announce('Ladenschluss — die letzten Gäste noch bedienen!');
        break;
      case 'dayOver':
        this.announce(
          `Tag ${this.shift.day} geschafft: ${this.shift.coins} Münzen — jetzt einrichten!`,
        );
        break;
      case 'gameOver':
        this.announce('Zu viele hungrige Gäste — der Laden macht zu.');
        this.shift = sendHome(this.shift);
        for (const guest of this.shift.guests) this.leave(guest);
        break;
    }
  }

  private resetGame(): void {
    this.clearGuests();
    this.shift = newShift(Date.now() % 100000);
    this.stations = freshStations(STATIONS);
    this.setHeld(null, null);
    this.blueprint = null;
    this.clearPlaced();
  }

  private clearGuests(): void {
    for (const view of this.guests.values()) this.removeGuestView(view);
    this.guests.clear();
    for (const t of this.tableViews) {
      for (const plate of t.plates.values()) plate.removeFromParent();
      t.plates.clear();
      t.dirtyShown = -1;
    }
  }

  // --- Die Gäste ------------------------------------------------------------

  private async loadGuestsKit(): Promise<void> {
    const { kaykitClips } = await import('../../core/kaykitModel');
    const clips = await kaykitClips(SIT_FILE, null);
    this.sitClip = clips.find((clip) => clip.name === 'Sit_Chair_Idle') ?? null;
  }

  private spawnGuest(guest: Guest): void {
    const t = this.tables[guest.table]!;
    const street = STREET_ENDS[guest.group % STREET_ENDS.length]!;
    const seat = seatOf(t, guest.seat);
    const path = [
      ...guestRoute(this.route, street, DOOR_OUTSIDE),
      ...guestRoute(this.route, DOOR_OUTSIDE, DOOR_INSIDE),
      ...guestRoute(this.route, DOOR_INSIDE, seat.approach),
      { x: seat.x, z: seat.z },
    ];
    const root = new THREE.Group();
    root.name = `plateup-guest:${guest.id}`;
    // Der Zweite einer Gruppe geht einen halben Meter hinter dem Ersten.
    root.position.set(street.x + (street.x < 0 ? -0.8 : 0.8) * guest.seat, 0, street.z);
    this.root.add(root);
    const bubble = new OrderBubble(guest.order, guest.table + 1);
    bubble.sprite.position.y = GUEST_HEIGHT + 0.62;
    bubble.sprite.visible = false;
    root.add(bubble.sprite);
    const view: GuestView = {
      id: guest.id,
      root,
      figure: null,
      path,
      mode: 'in',
      bubble,
      angry: false,
    };
    this.guests.set(guest.id, view);
    if (!canLoadModels()) {
      this.shift = seatGuest(this.shift, guest.id);
      view.mode = 'sit';
      return;
    }
    const round = this.building;
    const file = GUEST_FIGURES[guest.id % GUEST_FIGURES.length]!;
    void import('../../core/kaykitFigure').then(async ({ loadKaykitFigure }) => {
      const figure = await loadKaykitFigure(file, GUEST_HEIGHT);
      if (!figure) return;
      if (round !== this.building || !this.guests.has(guest.id)) {
        figure.dispose();
        return;
      }
      figure.root.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) node.castShadow = true;
      });
      view.figure = figure;
      root.add(figure.root);
      if (view.mode === 'sit') this.sitDown(view);
    });
  }

  private leave(guest: Guest): void {
    const view = this.guests.get(guest.id);
    if (!view) return;
    const t = this.tables[guest.table]!;
    const seat = seatOf(t, guest.seat);
    const street = STREET_ENDS[(guest.group + 1) % STREET_ENDS.length]!;
    const walking = view.mode === 'in';
    view.angry = guest.happy === false;
    view.mode = 'out';
    view.bubble.sprite.visible = view.angry;
    if (view.angry) view.bubble.drawAngry();
    this.gauges?.clear(`guest:${guest.id}`);
    // Wer noch auf dem Weg war, dreht um, wo er ist — und läuft nicht erst
    // zu seinem Stuhl.
    const from = walking ? { x: view.root.position.x, z: view.root.position.z } : seat.approach;
    view.path = [
      ...(walking ? [] : [{ x: seat.approach.x, z: seat.approach.z }]),
      ...guestRoute(this.route, from, DOOR_INSIDE),
      ...guestRoute(this.route, DOOR_INSIDE, DOOR_OUTSIDE),
      ...guestRoute(this.route, DOOR_OUTSIDE, street),
    ];
    if (view.figure && !walking) this.standUp(view);
    const table = this.tableViews[guest.table];
    table?.plates.get(guest.id)?.removeFromParent();
    table?.plates.delete(guest.id);
    if (!view.figure) {
      this.shift = guestGone(this.shift, guest.id);
      this.removeGuestView(view);
      this.guests.delete(guest.id);
    }
  }

  private stepGuests(dt: number, ctx: WorldContext): void {
    for (const view of [...this.guests.values()]) {
      view.figure?.update(dt);
      const guest = this.shift.guests.find((g) => g.id === view.id);
      if (view.mode === 'in' || view.mode === 'out') {
        const arrived = walk(view, dt);
        if (arrived && view.mode === 'in') {
          const seat = seatOf(this.tables[guest?.table ?? 0]!, guest?.seat ?? 0);
          view.root.position.set(seat.x, 0, seat.z);
          view.root.rotation.y = seat.yaw;
          view.mode = 'sit';
          this.sitDown(view);
          this.shift = seatGuest(this.shift, view.id);
        } else if (arrived && view.mode === 'out') {
          this.shift = guestGone(this.shift, view.id);
          this.removeGuestView(view);
          this.guests.delete(view.id);
          continue;
        }
      }
      if (guest && guest.phase === 'eating') {
        // **Der Burger wird kleiner**, während gegessen wird — bis auf ein
        // Drittel; der Teller bleibt, wie er ist.
        const food = this.tableViews[guest.table]?.plates.get(guest.id)?.children[1];
        food?.scale.setScalar(0.35 + (0.65 * guest.eat) / EAT_SECONDS);
      }
      if (guest && view.mode === 'sit') {
        const waiting = guest.phase === 'waiting';
        view.bubble.sprite.visible = waiting;
        if (waiting) {
          const share = patienceShare(guest);
          view.bubble.setPatience(share);
          view.bubble.setUrgent(share < 0.35, ctx.elapsed);
        }
      }
    }
  }

  private sitDown(view: GuestView): void {
    const figure = view.figure;
    if (!figure) return;
    figure.gait(0);
    if (!this.sitClip) return;
    figure.mixer.stopAllAction();
    const action = figure.mixer.clipAction(this.sitClip);
    action.reset().play();
    view.root.position.y = SEAT_LIFT;
  }

  private standUp(view: GuestView): void {
    const figure = view.figure;
    if (!figure) return;
    view.root.position.y = 0;
    figure.mixer.stopAllAction();
    figure.play('Idle_A', { fade: 0 });
    figure.gait(GUEST_SPEED);
  }

  private removeGuestView(view: GuestView): void {
    this.gauges?.clear(`guest:${view.id}`);
    view.figure?.dispose();
    view.bubble.dispose();
    view.root.removeFromParent();
  }

  private stepEffects(dt: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      if (!this.effects[i]!.step(dt)) {
        this.effects[i]!.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  // --- Einrichten zwischen den Tagen ----------------------------------------

  /**
   * **Die Baupläne des Abends** — sie liegen nur da, solange der Laden zu ist
   * (Bilanz), und verschwinden, sobald einer gekauft oder die Glocke geläutet
   * ist.
   */
  private stepShop(ctx: WorldContext): void {
    const closed = this.shift.phase === 'closed';
    const offers = closed ? dayOffers(this.shift.day, this.shift.seed, this.tables.length) : [];
    const key = closed ? `${this.shift.day}:${this.tables.length}:${this.placed.length}` : '';
    if (key !== this.offerKey) {
      // Erst wegräumen (das setzt den Schlüssel zurück), dann den neuen merken.
      this.clearOffers();
      this.offerKey = key;
      offers.forEach((item, i) => this.buildOffer(item, i));
    }
    for (const offer of this.offerViews) {
      const afford = this.shift.total >= offer.item.cost;
      if (offer.anchor.userData.afford !== afford) {
        offer.anchor.userData.afford = afford;
        offer.label.setText(
          offer.item.label,
          `${offer.item.cost} Münzen${afford ? '' : ' — zu teuer'}`,
          afford ? 0x5aa0e0 : 0x8a8f99,
        );
      }
      offer.anchor.visible = this.blueprint?.id !== offer.item.id;
    }
    this.aimBlueprint(ctx);
  }

  private buildOffer(item: ShopItem, index: number): void {
    const spot = OFFER_SPOTS[index];
    if (!spot) return;
    const anchor = new THREE.Group();
    anchor.name = `plateup-offer:${item.id}`;
    anchor.position.set(spot.x, 0, spot.z);
    // Das Blatt: ein blaues Papier auf dem Boden, wie ein Bauplan.
    const sheet = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x2f6fb5, roughness: 0.8 }),
    );
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.y = 0.015;
    anchor.add(sheet);
    const label = new TextPlane({
      width: 1.3,
      height: 0.48,
      title: item.label,
      body: `${item.cost} Münzen`,
      align: 'center',
      accent: 0x5aa0e0,
      face: true,
    });
    label.position.y = 1.15;
    anchor.add(label);
    this.root.add(anchor);
    const view: OfferView = { item, anchor, label };
    this.offerViews.push(view);
    void this.loadShopModel(item).then((model) => {
      if (!model || !this.offerViews.includes(view)) return;
      // Ein kleines Modell auf dem Blatt — man sieht, was man kauft.
      const box = new THREE.Box3().setFromObject(model);
      const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.01);
      model.scale.multiplyScalar(Math.min(1, 0.6 / size));
      model.position.y = 0.02;
      anchor.add(model);
    });
    this.addUsable(
      anchor,
      {
        use: () => this.takeBlueprint(item),
        usePrompt: () =>
          this.shift.total >= item.cost
            ? `Bauplan nehmen: ${item.label} (${item.cost} Münzen)`
            : `${item.label}: ${item.cost} Münzen — in der Kasse sind ${this.shift.total}`,
      },
      { radius: 0.55, half: 0.6 },
    );
  }

  private clearOffers(): void {
    for (const offer of this.offerViews) {
      this.removeUsable(offer.anchor);
      offer.anchor.removeFromParent();
      offer.label.dispose();
      offer.anchor.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (mesh.isMesh && mesh !== offer.label && mesh.geometry.type === 'PlaneGeometry') {
          mesh.geometry.dispose();
          (mesh.material as THREE.Material).dispose();
        }
      });
    }
    this.offerViews.length = 0;
    this.offerKey = '';
  }

  private takeBlueprint(item: ShopItem): boolean {
    if (this.shift.phase !== 'closed') return false;
    if (this.carried) {
      this.announce('Erst die Hände frei machen');
      return false;
    }
    if (this.shift.total < item.cost) {
      this.announce(
        `${item.label} kostet ${item.cost} Münzen — in der Kasse sind ${this.shift.total}`,
      );
      return false;
    }
    this.blueprint = item;
    playPick(true);
    this.announce(`${item.label}: dorthin tragen, wo es stehen soll, und abstellen`);
    return true;
  }

  private dropBlueprint(): void {
    if (!this.blueprint) return;
    this.announce(`${this.blueprint.label} zurückgelegt`);
    this.blueprint = null;
  }

  /**
   * **Der Geist vor der Figur** — wo das Stück landen würde, grün oder rot
   * (`portal/placeGhost.ts`). Angemeldet ist er als Station: `A` davor stellt
   * es hin.
   */
  private aimBlueprint(ctx: WorldContext): void {
    const item = this.blueprint;
    if (!item || this.shift.phase !== 'closed') {
      if (this.blueprint && this.shift.phase !== 'closed') this.blueprint = null;
      this.shopGhost.hide();
      if (this.aim) this.removeUsable(this.aimAnchor);
      this.aim = null;
      return;
    }
    const feet = ctx.rig.position;
    // Von oben zählt, wohin die Figur schaut (ihr Gesicht zeigt bei
    // `bodyYaw` 0 nach +Z), aus den Augen und in der Brille der Blick.
    const forward = ctx.topDown
      ? _v.set(Math.sin(ctx.avatar.bodyYaw), 0, Math.cos(ctx.avatar.bodyYaw))
      : ctx.camera.getWorldDirection(_v);
    const tile = aimTile(item.id, feet.x, feet.z, forward.x, forward.z);
    const check = placeCheck(item.id, tile.x, tile.z, this.placed);
    const fresh = !this.aim;
    this.aim = { ...tile, ok: check.ok, why: check.ok ? '' : check.why };
    const table = item.kind === 'table';
    const cx = table ? tile.x + 1 : tile.x + 0.5;
    const cz = table ? tile.z + 1 : tile.z + 0.5;
    this.aimAnchor.position.set(cx, 0, cz);
    if (this.ghostModel && this.ghostModelFor === item.id) {
      this.shopGhost.show(this.ghostModel, cx, 0, cz, 0, check.ok);
    } else if (this.ghostModelFor !== item.id) {
      this.ghostModelFor = item.id;
      this.ghostModel = null;
      void this.loadShopModel(item).then((model) => {
        if (this.ghostModelFor === item.id) this.ghostModel = model;
      });
    }
    if (fresh) {
      this.addUsable(
        this.aimAnchor,
        {
          use: () => this.placeBlueprint(),
          usePrompt: () =>
            this.aim?.ok ? `${this.blueprint?.label ?? ''} hier hinstellen` : (this.aim?.why ?? ''),
        },
        { radius: table ? 1.1 : 0.6, half: 0.8 },
      );
    }
  }

  private placeBlueprint(): boolean {
    const item = this.blueprint;
    const aim = this.aim;
    if (!item || !aim) return false;
    if (!aim.ok) {
      this.announce(aim.why);
      return false;
    }
    const done = buy(this.shift.total, this.placed, item.id, aim.x, aim.z);
    if (!done) {
      this.announce('Das geht hier nicht');
      return false;
    }
    this.placed = done.placed;
    this.shift = { ...this.shift, total: done.total, decor: decorCount(done.placed) };
    const placed = done.placed[done.placed.length - 1]!;
    this.blueprint = null;
    this.shopGhost.hide();
    this.buildPlaced(placed);
    this.announce(
      item.kind === 'table'
        ? `Neuer Tisch ${this.tables.length} — ab morgen kommen mehr Gäste`
        : `${item.label} steht — die Gäste warten jetzt etwas geduldiger`,
    );
    chime([523, 659, 784], 0.08);
    this.effects.push(new Ring(this.root, this.aimAnchor.position, 0x5aa0e0));
    return true;
  }

  /** Ein gekauftes Stück in die Welt stellen: Modell, Körper, bei Tischen die Anmeldung. */
  private buildPlaced(p: Placed): void {
    const item = shopItem(p.item);
    if (!item) return;
    this.route = routePlan(placedTiles(this.placed));
    const round = this.building;
    if (item.kind === 'table') {
      this.tables = allTables(this.placed);
      const t = this.tables.find((spot) => spot.x === p.x && spot.z === p.z);
      if (!t) return;
      if (!this.tableViews.some((v) => v.table === t.index)) this.addTableView(t);
      for (const piece of tableSet(t)) {
        if (piece.solid) this.addBlock(piece.x, piece.z, piece.solid, true);
        if (!canLoadModels()) continue;
        void import('../../core/dinerModel').then(async ({ dinerModel }) => {
          const model = await dinerModel(piece.name);
          if (!model || round !== this.building) return;
          model.position.set(piece.x, piece.y ?? 0, piece.z);
          model.rotation.y = piece.yaw ?? 0;
          this.shopRoot.add(model);
        });
      }
      return;
    }
    this.addBlock(p.x + 0.5, p.z + 0.5, [0.8, 0.8], true);
    void this.loadShopModel(item).then((model) => {
      if (!model || round !== this.building) return;
      model.position.set(p.x + 0.5, 0, p.z + 0.5);
      model.traverse((node) => {
        if ((node as THREE.Mesh).isMesh) node.castShadow = true;
      });
      this.shopRoot.add(model);
    });
  }

  /** Alles Gekaufte weg — beim Neuanfang nach dem Ende einer Runde. */
  private clearPlaced(): void {
    if (!this.placed.length) return;
    this.placed = [];
    this.tables = allTables([]);
    this.route = routePlan();
    for (const child of [...this.shopRoot.children]) child.removeFromParent();
    for (const view of this.tableViews.splice(this.tables.length)) {
      this.removeUsable(view.anchor);
      view.anchor.removeFromParent();
    }
    for (const { mesh, body } of this.shopBlocks) {
      this.physics?.remove(body);
      mesh.removeFromParent();
      mesh.geometry.dispose();
      const i = this.solids.indexOf(mesh);
      if (i >= 0) this.solids.splice(i, 1);
    }
    this.shopBlocks.length = 0;
  }

  private async loadShopModel(item: ShopItem): Promise<THREE.Object3D | null> {
    if (!canLoadModels()) return null;
    if (item.source === 'diner') {
      const { dinerModel } = await import('../../core/dinerModel');
      return dinerModel(item.model);
    }
    const { kaykitModel } = await import('../../core/kaykitModel');
    const model = await kaykitModel(item.model);
    if (model && item.height !== undefined) fitHeight(model, item.height);
    return model;
  }

  // --- Einsteigerhilfe und Anzeige am Schirm ---------------------------------

  private setTutorial(on: boolean): void {
    this.tutorialOn = on;
    writeTutorial(on ? 'on' : 'off');
    this.announce(on ? 'Einsteigerhilfe an' : 'Einsteigerhilfe aus');
  }

  /** Der Pfeil über dem Ziel und (in der Brille) die Tafel mit dem Satz. */
  private buildHint(): void {
    const arrow = new THREE.Group();
    arrow.name = 'plateup-hint';
    const material = new THREE.MeshBasicMaterial({ color: 0x5ee0a0, depthTest: false });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 20), material);
    cone.rotation.x = Math.PI;
    cone.renderOrder = 11;
    arrow.add(cone);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.42, 36),
      new THREE.MeshBasicMaterial({
        color: 0x5ee0a0,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.name = 'plateup-hint-ring';
    arrow.add(ring);
    arrow.visible = false;
    this.root.add(arrow);
    this.hintArrow = arrow;
    if (!canLoadModels()) return;
    const plane = new TextPlane({
      width: 2.4,
      height: 0.5,
      title: 'Tipp',
      body: '',
      align: 'center',
      accent: 0x5ee0a0,
      face: true,
      front: true,
    });
    plane.visible = false;
    this.root.add(plane);
    this.hintPlane = plane;
  }

  private refreshHint(ctx: WorldContext): void {
    if (this.tutorialOn && tutorialFinished(this.shift)) {
      // **Einmal und nicht wieder**: Wer so weit ist, braucht die Hilfe nicht
      // mehr — das merkt sich der Browser.
      this.tutorialOn = false;
      writeTutorial('done');
      this.announce('Einsteigerhilfe fertig — ab jetzt allein. (Menü: wieder einschalten)');
    }
    const hint = this.tutorialOn
      ? tutorialHint(this.shift, this.stations, this.carried, this.tables.length)
      : null;
    this.hint = this.blueprint ? null : hint;
    const arrow = this.hintArrow;
    if (!arrow) return;
    const at = this.hint ? this.hintSpot(this.hint) : null;
    arrow.visible = !!at;
    if (this.hintPlane) this.hintPlane.visible = !!this.hint && ctx.renderer.xr.isPresenting;
    if (!at) return;
    const bob = Math.sin(ctx.elapsed * 4) * 0.08;
    arrow.position.set(at.x, 0, at.z);
    const cone = arrow.children[0]!;
    cone.position.y = at.y + 0.45 + bob;
    const ring = arrow.children[1]!;
    ring.position.y = 0.03;
    ring.scale.setScalar(at.wide ? 2.2 : 1);
    if (this.hintPlane && this.hint) {
      this.hintPlane.position.set(at.x, at.y + 1.1, at.z);
      if (this.hintPlane.userData.text !== this.hint.text) {
        this.hintPlane.userData.text = this.hint.text;
        this.hintPlane.setText('Tipp', this.hint.text);
      }
    }
  }

  /** Wo der Pfeil hinzeigt — über der Station, dem Tisch oder der Glocke. */
  private hintSpot(hint: TutorialHint): { x: number; y: number; z: number; wide: boolean } | null {
    const target = hint.target;
    if (!target) return null;
    if ('bell' in target) {
      const b = this.bell?.position;
      return b ? { x: b.x, y: 0.9, z: b.z, wide: false } : null;
    }
    if ('table' in target) {
      const t = this.tables[target.table];
      return t ? { x: t.x + 1, y: 0.8, z: t.z + 1, wide: true } : null;
    }
    const view = this.stationViews.find((v) => v.spot.id === target.station);
    if (!view) return null;
    const p = view.anchor.position;
    return { x: p.x, y: view.top + 0.25, z: p.z, wide: false };
  }

  /**
   * **Unten am Schirm**: was man in der Hand hat — und darüber, solange die
   * Einsteigerhilfe läuft, was als Nächstes zu tun ist. **Oben**: die offenen
   * Bestellungen als Zettel, mit Tischnummer und Geduld. Beides nur am
   * Schirm; in der Brille stehen Blase, Tafel und Pfeil im Raum.
   */
  private refreshHud(ctx: WorldContext): void {
    if (typeof document === 'undefined') return;
    const flat = !ctx.renderer.xr.isPresenting;
    if (!this.handBar) {
      const bar = document.createElement('div');
      bar.className = 'plateup-hand';
      bar.style.cssText = [
        'position:fixed',
        'left:12px',
        'right:12px',
        'bottom:64px',
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'gap:6px',
        'pointer-events:none',
        'z-index:4',
        'font:600 14px/1.3 system-ui,sans-serif',
      ].join(';');
      document.body.appendChild(bar);
      this.handBar = bar;
    }
    // Unter der Karte des Schildes (Hochformat, Laden zu) steht der Hinweis
    // schon auf der Karte — die Leiste läge sonst genau darüber.
    const cardShown = !!this.card && this.card.hidden === false;
    const tip = flat && this.hint && !cardShown ? this.hint.text : '';
    const hand = this.blueprint
      ? `Bauplan: ${this.blueprint.label}${this.aim ? (this.aim.ok ? ' — hier passt es (A)' : ` — ${this.aim.why}`) : ''}`
      : this.carried
        ? `In der Hand: ${dishLabel(this.carried)}`
        : '';
    const key = `${tip}|${hand}`;
    // `display` und nicht `hidden`: Das `display:flex` der Leiste schlüge das
    // Attribut.
    this.handBar.style.display = !flat || (!tip && !hand) ? 'none' : 'flex';
    // **Über der Tastenleiste** (`ui/ControlHints`, `.hints`): Am Telefon ist
    // sie drei Zeilen hoch, und die Leiste stünde dahinter.
    const bottom = `${aboveHints(64)}px`;
    if (this.handBar.style.bottom !== bottom) this.handBar.style.bottom = bottom;
    if (this.handBar.dataset.key !== key) {
      this.handBar.dataset.key = key;
      this.handBar.textContent = '';
      if (tip) this.handBar.append(pill(`Tipp: ${tip}`, '#5ee0a0', 'rgba(16,40,30,0.9)'));
      if (hand) this.handBar.append(pill(hand, '#f2a33a', 'rgba(20,24,32,0.85)'));
    }

    if (!this.tickets) {
      const row = document.createElement('div');
      row.className = 'plateup-tickets';
      row.style.cssText = [
        'position:fixed',
        'left:12px',
        'right:12px',
        'top:calc(env(safe-area-inset-top, 0px) + 100px)',
        'display:flex',
        'flex-wrap:wrap',
        'justify-content:center',
        'gap:6px',
        'pointer-events:none',
        'z-index:4',
      ].join(';');
      document.body.appendChild(row);
      this.tickets = row;
    }
    const waiting = this.shift.guests
      .filter((g) => g.phase === 'waiting')
      .sort((a, b) => a.patience - b.patience);
    const dirty = this.tables.filter((t) => dirtyAt(this.shift, t.index) > 0);
    const open = this.shift.phase === 'open' || this.shift.phase === 'closing';
    const hideTickets = !flat || !open || (!waiting.length && !dirty.length);
    this.tickets.style.display = hideTickets ? 'none' : 'flex';
    const tkey =
      waiting.map((g) => `${g.id}:${Math.round(patienceShare(g) * 20)}`).join(',') +
      '|' +
      dirty.map((t) => t.index).join(',');
    if (tkey === this.ticketKey || hideTickets) return;
    this.ticketKey = tkey;
    this.tickets.textContent = '';
    for (const g of waiting) this.tickets.append(ticket(g));
    for (const t of dirty) {
      const el = document.createElement('div');
      el.style.cssText =
        'padding:4px 10px;border-radius:10px;background:rgba(60,48,36,0.88);color:#f3e2c8;font:600 12px/1.3 system-ui,sans-serif;border:2px dashed #b48c5a';
      el.textContent = `Tisch ${t.index + 1}: abräumen`;
      this.tickets.append(el);
    }
  }

  // --- zum Prüfen aus der Konsole (Bild-Schleife) ---------------------------

  /** Der Stand des Tages — für Tests im Browser und die Bild-Schleife. */
  get state(): Shift {
    return this.shift;
  }

  /** Die Uhr des Ladens beschleunigen (nur zum Prüfen, siehe `shopSpeed`). */
  debugSpeed(scale: number): void {
    this.shopSpeed = Math.max(0, Math.min(100, scale));
  }

  /** Den Laden öffnen, ohne zur Glocke zu laufen. */
  debugOpen(): void {
    this.ringBell();
  }

  /** Gleich an einem späteren Tag aufmachen (nur zum Prüfen). */
  debugDay(day: number): void {
    this.clearGuests();
    this.shift = openDay({ ...newShift(7), phase: 'closed', day: Math.max(0, day - 1) });
  }

  /** Die Figur versetzen (nur zum Prüfen). */
  debugMove(x: number, z: number, yaw?: number): void {
    if (this.context) this.movePlayerTo(this.context, new THREE.Vector3(x, 0, z), yaw);
  }

  /** Einen fertigen Burger in die Hand legen (nur zum Prüfen). */
  debugHold(recipe: string): void {
    const parts: Record<string, Dish> = {
      hamburger: dish('plate', ['bun', 'patty-cooked']),
      salat: dish('plate', ['bun', 'patty-cooked', 'lettuce-cut']),
      tomate: dish('plate', ['bun', 'patty-cooked', 'tomato-cut']),
      deluxe: dish('plate', ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut']),
    };
    this.setHeld(parts[recipe] ?? parts.hamburger!, null);
  }

  /** An einem Tisch servieren, als stünde man davor. */
  debugServe(table: number): boolean {
    return this.serveAt(table);
  }

  /** Die Kasse füllen und den Tag beenden — für die Einrichten-Phase (nur zum Prüfen). */
  debugEvening(total: number): void {
    this.clearGuests();
    this.shift = {
      ...this.shift,
      phase: 'closed',
      day: Math.max(1, this.shift.day),
      total,
      guests: [],
    };
  }

  /** Einen Bauplan aufnehmen und direkt hinstellen (nur zum Prüfen). */
  debugPlace(item: string, x: number, z: number): boolean {
    const it = shopItem(item);
    if (!it) return false;
    this.blueprint = it;
    const check = placeCheck(item, x, z, this.placed);
    this.aim = { x, z, ok: check.ok, why: check.ok ? '' : check.why };
    return this.placeBlueprint();
  }

  /** Einen Bauplan in die Hand nehmen (nur zum Prüfen). */
  debugBlueprint(item: string): void {
    const it = shopItem(item);
    if (it) this.takeBlueprint(it);
  }

  /** An einen Tisch treten und `A` drücken — servieren oder abräumen (nur zum Prüfen). */
  debugTable(table: number): boolean {
    return this.useTable(table, { kind: 'player', at: _v, forward: _v });
  }

  /** Die Einsteigerhilfe schalten (nur zum Prüfen). */
  debugTutorial(on: boolean): void {
    this.tutorialOn = on;
  }

  /** Eine Station benutzen, als stünde man davor. */
  debugUse(id: string): boolean {
    const index = STATIONS.findIndex((s) => s.id === id);
    return index >= 0 && this.useStationAt(index, { kind: 'player', at: _v, forward: _v });
  }
}

/** Wie hoch die Körper der Möbel sind — über 1,40 m springt niemand (wie in der Testküche). */
const BLOCK_HEIGHT = 1.4;
/** Die Tischplatte der runden Gasttische (`dinerFit`, `table_round_B`). */
const TABLE_TOP = 0.5;
/** Ab wie nah man „vor" einer Station steht — fürs Schneiden. */
const NEAR_STATION = 1.3;
/** Wie groß die Gäste sind: so groß wie die Kochfigur, nicht wie ein Mensch. */
const GUEST_HEIGHT = 1.15;
const GUEST_SPEED = 1.4;
/** Wie hoch die Figur beim Sitzen angehoben wird, damit sie auf dem Stuhl sitzt. */
const SEAT_LIFT = 0.0;
const SIT_FILE = 'character-animations/animations/rig-medium/Rig_Medium_Simulation.glb';
/** Die Gäste: die acht Helden aus _Adventurers_, alle auf dem mittleren Skelett. */
const GUEST_FIGURES: readonly string[] = [
  'adventurers/characters/Knight.glb',
  'adventurers/characters/Mage.glb',
  'adventurers/characters/Rogue.glb',
  'adventurers/characters/Barbarian.glb',
  'adventurers/characters/Ranger.glb',
  'adventurers/characters/Druid.glb',
  'adventurers/characters/Engineer.glb',
  'adventurers/characters/Rogue_Hooded.glb',
];

/** Wie hoch die Oberkante einer Station ist, solange ihr Modell noch nicht da ist. */
const STATION_TOP: Partial<Record<string, number>> = {
  crate: 0.42,
  griddle: 0.6,
  bin: 0.55,
};

const _v = new THREE.Vector3();

interface StationView {
  readonly spot: StationSpot;
  readonly index: number;
  readonly anchor: THREE.Group;
  top: number;
  content: THREE.Object3D | null;
  shown: string;
  deedKey: string;
}

interface TableView {
  readonly table: number;
  readonly anchor: THREE.Group;
  /** Das Essen je Gast (Id), solange er isst. */
  readonly plates: Map<number, THREE.Object3D>;
  /** Die schmutzigen Teller, die gerade zu sehen sind. */
  readonly dirty: THREE.Object3D[];
  dirtyShown: number;
  deedKey: string;
}

/** Ein Bauplan, der im Gastraum liegt. */
interface OfferView {
  readonly item: ShopItem;
  readonly anchor: THREE.Group;
  readonly label: TextPlane;
}

/** Wo der Gast auf diesem Stuhl sitzt, wohin er schaut und von wo er sich setzt. */
function seatOf(
  t: TableSpot,
  seat: number,
): { x: number; z: number; yaw: number; approach: FloorPoint } {
  if (seat === 1) {
    return { x: t.other.x, z: t.other.z, yaw: t.other.yaw, approach: t.otherApproach };
  }
  return { x: t.seat.x, z: t.seat.z, yaw: t.seatYaw, approach: t.approach };
}

/** Wo der Teller eines Gastes auf dem Tisch steht — vor seinem Stuhl. */
function platePlace(t: TableSpot, seat: number): { x: number; z: number } {
  const cx = t.x + 1;
  const cz = t.z + 1;
  const s = seatOf(t, seat);
  // Vom Stuhl ein Stück zur Tischmitte hin.
  return { x: s.x + (cx - s.x) * 0.55, z: s.z + (cz - s.z) * 0.55 };
}

interface GuestView {
  readonly id: number;
  readonly root: THREE.Group;
  figure: KaykitFigure | null;
  path: FloorPoint[];
  mode: 'in' | 'sit' | 'out';
  readonly bubble: OrderBubble;
  angry: boolean;
}

/** Ein paar Töne nacheinander — Servieren, Kasse. */
function chime(notes: readonly number[], step: number): void {
  notes.forEach((from, i) =>
    playTone({ type: 'triangle', from, duration: step * 2.2, gain: 0.06, delay: i * step }),
  );
}

/** Die Zeile am Schirm, kurz fürs Hochformat. */
function stripShort(shift: Shift): string {
  const clock = shift.phase === 'open' ? clockText(timeLeft(shift)) : 'Schluss';
  return `Tag ${shift.day} · ${clock} · ✓ ${shift.served} · ✗ ${shift.lost} · ${shift.coins} Münzen`;
}

/** Ein Schlüssel für ein Gericht — zum Vergleichen, ob sich das Bild ändern muss. */
function dishKey(d: Dish): string {
  return `${d.item}[${d.on.join(',')}]`;
}

/**
 * **Einen Schritt den Weg entlang** — und ob er zu Ende ist.
 *
 * Die Figur dreht sich in Laufrichtung (weich, nicht ruckartig) und bekommt
 * ihren Gang aus dem Tempo (`KaykitFigure.gait`).
 */
function walk(view: GuestView, dt: number): boolean {
  const root = view.root;
  let budget = GUEST_SPEED * dt;
  while (budget > 0 && view.path.length > 0) {
    const next = view.path[0]!;
    const dx = next.x - root.position.x;
    const dz = next.z - root.position.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= budget) {
      root.position.x = next.x;
      root.position.z = next.z;
      budget -= dist;
      view.path.shift();
      continue;
    }
    root.position.x += (dx / dist) * budget;
    root.position.z += (dz / dist) * budget;
    const yaw = Math.atan2(-dx, -dz);
    let turn = yaw - root.rotation.y;
    while (turn > Math.PI) turn -= Math.PI * 2;
    while (turn < -Math.PI) turn += Math.PI * 2;
    root.rotation.y += turn * Math.min(1, dt * 10);
    budget = 0;
  }
  const done = view.path.length === 0;
  view.figure?.gait(done ? 0 : GUEST_SPEED);
  return done;
}

/** Ein Modell auf eine Höhe bringen und auf den Boden stellen. */
function fitHeight(model: THREE.Object3D, height: number): void {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return;
  const size = box.max.y - box.min.y;
  if (size > 1e-4) model.scale.multiplyScalar(height / size);
  model.updateMatrixWorld(true);
  const again = new THREE.Box3().setFromObject(model);
  model.position.y -= again.min.y;
  // Die Verschiebung sitzt im Kind, damit `position.set` danach frei bleibt.
  const lift = -again.min.y;
  const inner = new THREE.Group();
  while (model.children.length) inner.add(model.children[0]!);
  inner.position.y = lift / model.scale.y;
  model.add(inner);
  model.position.y = 0;
}

/** Ein flaches Modell auf eine Breite bringen (in X, vor dem Drehen). */
function fitWidth(model: THREE.Object3D, width: number): void {
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (box.isEmpty()) return;
  const size = box.max.x - box.min.x;
  if (size > 1e-4) model.scale.multiplyScalar(width / size);
}

/**
 * **Die Sprechblase über dem Gast** — was er bestellt hat, als Bild: die
 * Schichten des Burgers von unten nach oben, darunter der Name.
 *
 * Ein Sprite und keine Tafel: Es schaut von selbst in jede Kamera, von oben
 * wie aus den Augen wie in der Brille, und es ist ein Zeichenaufruf.
 */
class OrderBubble {
  readonly sprite: THREE.Sprite;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private urgent = false;
  /** Die Geduld, wie sie gerade gezeichnet ist — in Vierzigsteln. */
  private patience = 40;

  constructor(
    private readonly order: string,
    private readonly table: number,
  ) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 224;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.texture, depthTest: false, transparent: true }),
    );
    this.sprite.scale.set(0.9, 0.79, 1);
    this.sprite.renderOrder = 10;
    this.draw();
  }

  setUrgent(urgent: boolean, time: number): void {
    const pulse = urgent ? 1 + 0.08 * Math.sin(time * 9) : 1;
    this.sprite.scale.set(0.9 * pulse, 0.79 * pulse, 1);
    if (urgent === this.urgent) return;
    this.urgent = urgent;
    this.draw();
  }

  /**
   * **Der Geduldsbalken steht in der Blase**, unter dem Namen — und nicht als
   * eigener Balken darunter: Von oben läge der genau hinter der Blase, die
   * vor allem gezeichnet wird. Neu gemalt wird nur, wenn sich ein Vierzigstel
   * geändert hat.
   */
  setPatience(share: number): void {
    const step = Math.round(Math.min(1, Math.max(0, share)) * 40);
    if (step === this.patience) return;
    this.patience = step;
    this.draw();
  }

  drawAngry(): void {
    const g = this.canvas.getContext('2d');
    if (!g) return;
    this.frame(g, '#e0584f');
    g.fillStyle = '#e0584f';
    g.font = 'bold 120px sans-serif';
    g.textAlign = 'center';
    g.fillText('!', 128, 140);
    this.texture.needsUpdate = true;
  }

  private frame(g: CanvasRenderingContext2D, edge: string): void {
    g.clearRect(0, 0, 256, 224);
    g.fillStyle = '#fffaf0';
    g.strokeStyle = edge;
    g.lineWidth = 10;
    g.beginPath();
    g.roundRect(10, 10, 236, 170, 36);
    g.moveTo(108, 178);
    g.lineTo(128, 214);
    g.lineTo(148, 178);
    g.fill();
    g.stroke();
    g.fillStyle = '#fffaf0';
    g.fillRect(104, 168, 48, 14);
  }

  private draw(): void {
    const g = this.canvas.getContext('2d');
    if (!g) return;
    this.frame(g, this.urgent ? '#e0584f' : '#3a3f4b');
    const layers = BURGER_LAYERS[this.order] ?? BURGER_LAYERS.hamburger!;
    // Von unten nach oben: Boden, Belag, Haube.
    let y = 116;
    const draw = (color: string, h: number, w: number, round = 6): void => {
      g.fillStyle = color;
      g.beginPath();
      g.roundRect(128 - w / 2, y - h, w, h, round);
      g.fill();
      y -= h - 1;
    };
    draw('#d99a4e', 16, 118, 8);
    for (const layer of layers) {
      if (layer === 'patty') draw('#6b3a22', 16, 124, 8);
      if (layer === 'lettuce') draw('#5cc03a', 15, 140, 7);
      if (layer === 'tomato') draw('#e8402e', 14, 120, 7);
    }
    g.fillStyle = '#e3a85a';
    g.beginPath();
    g.ellipse(128, y + 2, 60, 34, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = '#fff6d8';
    for (const [sx, sy] of [
      [108, y - 14],
      [130, y - 22],
      [150, y - 12],
    ] as const) {
      g.beginPath();
      g.ellipse(sx, sy, 5, 3, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#2b2f38';
    g.font = 'bold 26px sans-serif';
    g.textAlign = 'center';
    g.fillText(menuItem(this.order).label, 128, 150);
    // **Die Tischnummer** oben links in der Ecke — dieselbe wie auf den
    // Zetteln am Schirm und der Tafel.
    g.fillStyle = '#3a3f4b';
    g.beginPath();
    g.arc(40, 40, 22, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffaf0';
    g.font = 'bold 26px sans-serif';
    g.fillText(String(this.table), 40, 49);
    // Der Geduldsbalken: grün, dann gelb, zuletzt rot.
    const part = this.patience / 40;
    g.fillStyle = '#d9d4c7';
    g.beginPath();
    g.roundRect(40, 158, 176, 14, 7);
    g.fill();
    g.fillStyle = part > 0.6 ? '#4fbf5a' : part > 0.35 ? '#f2b43a' : '#e0584f';
    if (part > 0.01) {
      g.beginPath();
      g.roundRect(40, 158, Math.max(14, 176 * part), 14, 7);
      g.fill();
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.sprite.removeFromParent();
    this.sprite.material.dispose();
    this.texture.dispose();
  }
}

const BURGER_LAYERS: Partial<Record<string, readonly string[]>> = {
  hamburger: ['patty'],
  salat: ['patty', 'lettuce'],
  tomate: ['patty', 'tomato'],
  deluxe: ['patty', 'lettuce', 'tomato'],
};

/** Etwas, das eine Weile zu sehen ist und dann verschwindet. */
interface Effect {
  step(dt: number): boolean;
  dispose(): void;
}

/** **Die Münzen über dem Tisch** — steigen auf, drehen sich, sagen den Betrag. */
class CoinPop implements Effect {
  private readonly group = new THREE.Group();
  private readonly label: TextPlane;
  private time = 0;

  constructor(parent: THREE.Object3D, x: number, z: number, coins: number) {
    this.group.position.set(x, 0.8, z);
    this.label = new TextPlane({
      width: 0.7,
      height: 0.3,
      title: `+${coins}`,
      align: 'center',
      accent: 0xf2c33a,
      face: true,
      front: true,
    });
    this.label.position.y = 0.45;
    this.group.add(this.label);
    parent.add(this.group);
    if (!canLoadModels()) return;
    void import('../../core/kaykitModel').then(async ({ kaykitModel }) => {
      const coin = await kaykitModel('board-game-bits/coin_gold.glb');
      if (!coin || this.time > 1.5) return;
      // Auf den **Durchmesser** eingepasst, nicht auf die Höhe: Die Münze
      // liegt flach im Regal, und ihre Höhe ist ihre Dicke — auf 8 cm Dicke
      // gebracht, war sie so groß wie der Tisch.
      const box = new THREE.Box3().setFromObject(coin);
      const size = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1e-3);
      coin.scale.multiplyScalar(0.22 / size);
      coin.rotation.x = Math.PI / 2;
      this.group.add(coin);
    });
  }

  step(dt: number): boolean {
    this.time += dt;
    this.group.position.y = 0.8 + this.time * 0.6;
    this.group.rotation.y += dt * 6;
    return this.time < 1.6;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.label.dispose();
  }
}

/** **Ein Ring, der sich ausbreitet** — die Glocke hat geläutet. */
class Ring implements Effect {
  private readonly mesh: THREE.Mesh;
  private time = 0;

  constructor(parent: THREE.Object3D, at: THREE.Vector3, color: number) {
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.3, 0.38, 40),
      new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(at.x, 0.02, at.z);
    parent.add(this.mesh);
  }

  step(dt: number): boolean {
    this.time += dt;
    const s = 1 + this.time * 6;
    this.mesh.scale.set(s, s, s);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - this.time / 0.8);
    return this.time < 0.8;
  }

  dispose(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

/** Wo die Einsteigerhilfe sich merkt, ob sie fertig ist: `done`, `off` oder `on`. */
const TUTORIAL_KEY = 'bgvr.plateup.tutorial';

function readTutorialOn(): boolean {
  try {
    const raw = globalThis.localStorage?.getItem(TUTORIAL_KEY);
    return raw !== 'done' && raw !== 'off';
  } catch {
    return true;
  }
}

function writeTutorial(value: 'done' | 'off' | 'on'): void {
  try {
    globalThis.localStorage?.setItem(TUTORIAL_KEY, value);
  } catch {
    // Kein Speicher (privater Modus): Dann gilt es für diese Sitzung.
  }
}

/** Eine Pille am Schirm — ein Satz mit Rand in einer Farbe. */
function pill(text: string, edge: string, background: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'padding:6px 14px',
    'border-radius:999px',
    `background:${background}`,
    `border:2px solid ${edge}`,
    'color:#fff',
    'max-width:100%',
    'text-align:center',
  ].join(';');
  el.textContent = text;
  return el;
}

/** Ein Bestellzettel: Tischnummer, Burger, Geduld als Balken. */
function ticket(g: Guest): HTMLDivElement {
  const share = patienceShare(g);
  const color = share > 0.6 ? '#4fbf5a' : share > 0.35 ? '#f2b43a' : '#e0584f';
  const el = document.createElement('div');
  el.style.cssText = [
    'min-width:92px',
    'padding:4px 8px 6px',
    'border-radius:10px',
    'background:#fffaf0',
    `border:2px solid ${share < 0.35 ? '#e0584f' : '#3a3f4b'}`,
    'color:#2b2f38',
    'font:600 12px/1.25 system-ui,sans-serif',
    'box-shadow:0 2px 6px rgba(0,0,0,0.35)',
  ].join(';');
  const head = document.createElement('div');
  head.textContent = `Tisch ${g.table + 1}`;
  head.style.cssText = 'font-size:11px;color:#6b6f78';
  const name = document.createElement('div');
  name.textContent = menuItem(g.order).label;
  const bar = document.createElement('div');
  bar.style.cssText =
    'height:5px;border-radius:3px;background:#d9d4c7;margin-top:3px;overflow:hidden';
  const fill = document.createElement('div');
  fill.style.cssText = `height:100%;width:${Math.round(share * 100)}%;background:${color}`;
  bar.append(fill);
  el.append(head, name, bar);
  return el;
}

/**
 * **Rauch über der Grillplatte** — graue Bällchen, die aufsteigen und
 * verblassen. Je näher am Verbrennen, desto dichter und dunkler; ist es
 * verbrannt, steigt er schwarz.
 */
class Smoke {
  private readonly group = new THREE.Group();
  private readonly puffs: THREE.Mesh[] = [];
  private readonly material = new THREE.MeshBasicMaterial({
    color: 0x9a9a9a,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  private readonly geometry = new THREE.SphereGeometry(0.07, 10, 8);
  private time = 0;

  constructor(parent: THREE.Object3D, x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
    this.group.name = 'plateup-smoke';
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(this.geometry, this.material);
      puff.userData.phase = i / 6;
      this.group.add(puff);
      this.puffs.push(puff);
    }
    parent.add(this.group);
  }

  step(dt: number, strength: number): void {
    this.time += dt;
    const dark = Math.min(1, Math.max(0, (strength - 0.5) * 2));
    // Grau, und verbrannt fast schwarz.
    this.material.color.setScalar(0.35 - dark * 0.32);
    this.material.opacity = 0.35 + dark * 0.35;
    for (const puff of this.puffs) {
      const t = (this.time * 0.6 + (puff.userData.phase as number)) % 1;
      const phase = puff.userData.phase as number;
      puff.position.set(Math.sin(phase * 9 + t * 3) * 0.08, t * 0.9, Math.cos(phase * 7) * 0.06);
      puff.scale.setScalar(0.6 + t * 1.6);
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * **Wie weit etwas vom unteren Rand weg muss**, um über der Tastenleiste zu
 * stehen (`ui/ControlHints`, `.hints`) — am Telefon ist sie drei Zeilen hoch.
 * Mindestens `min` Pixel.
 */
function aboveHints(min: number): number {
  const hints = document.querySelector('.hints');
  if (!(hints instanceof HTMLElement) || hints.hidden) return min;
  const top = hints.getBoundingClientRect().top;
  if (top <= 0) return min;
  return Math.round(Math.max(min, window.innerHeight - top + 8));
}
