import * as THREE from 'three';
import type { WorldContext } from '../../core/types';
import type { HintZone } from '../../core/controlHints';
import type { Handedness } from '../../core/XRInput';
import type { Usable, UseSource } from '../../core/usable';
import type { KaykitFigure } from '../../core/kaykitFigure';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import { kitchenEyeScale } from '../../core/posture';
import { playPick, playTone } from '../../core/Audio';
import { ALL_GROUPS, GROUP_WORLD } from '../../physics/PhysicsWorld';
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
import { DECOR, type DecorPiece } from './plateUpDecor';
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
  TABLES,
  guestRoute,
  inKitchen,
  plateUpGrid,
  routePlan,
  type FloorPoint,
  type StationSpot,
} from './plateUpPlan';
import {
  EAT_SECONDS,
  boardLine,
  clockText,
  guestAt,
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
  timeLeft,
  type Guest,
  type Shift,
  type ShiftEvent,
} from './plateUpGame';
import {
  freshStations,
  stationDeed,
  stationProgress,
  tickStation,
  useStation,
  type StationState,
} from './plateUpStations';

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
  private readonly route = routePlan();
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

  /**
   * **Die Tastenhilfe im Laden** (`core/controlHints.ts`): `A` nimmt und legt
   * ab, die Glocke öffnet — mit dem, was gerade in der Hand liegt.
   */
  override hintZone(): HintZone | null {
    // Als Kran (Baukasten) gilt die Werkzeugleiste, nicht die Küche.
    const build = super.hintZone();
    if (build) return build;
    const phase = this.shift.phase;
    return {
      kind: 'burger',
      holding: this.carried !== null,
      closed: phase !== 'open' && phase !== 'closing',
    };
  }

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
    this.refreshUsables();
    this.carryInHands(ctx);
    this.refreshBoards();
    this.refreshStrip(ctx);
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
  private addBlock(x: number, z: number, size: readonly [number, number]): void {
    const physics = this.physics;
    if (!physics) return;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], BLOCK_HEIGHT, size[1]), this.hidden);
    mesh.position.set(x, BLOCK_HEIGHT / 2, z);
    mesh.name = 'plateup-block';
    this.root.add(mesh);
    mesh.updateMatrixWorld(true);
    this.solids.push(mesh);
    physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
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
    const stack = await dinerModel('dishrack_plates');
    if (!stack || round !== this.building) return;
    stack.position.y = view.top;
    view.anchor.add(stack);
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
    playPick(!!result.held && deed.do !== 'scrape');
    this.stations = this.stations.map((s, i) => (i === index ? result.station : s));
    this.setHeld(result.held, tookHand ? (by.hand ?? null) : this.carriedHand);
    return true;
  }

  private stepStations(dt: number, feet: THREE.Vector3): void {
    let changed = false;
    const next = this.stations.map((state, i) => {
      const view = this.stationViews[i];
      const near =
        !!view &&
        Math.hypot(feet.x - view.anchor.position.x, feet.z - view.anchor.position.z) < NEAR_STATION;
      const tick = tickStation(state, dt, near);
      if (tick.station !== state) changed = true;
      return tick.station;
    });
    if (changed) this.stations = next;
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
      if (part > 0) {
        this.gauges?.bar(
          `station:${view.spot.id}`,
          _v.set(at.x, view.top + 0.35, at.z),
          part,
          view.spot.kind === 'board' ? 'chop' : 'cook',
        );
      } else this.gauges?.clear(`station:${view.spot.id}`);
      if (view.spot.kind === 'griddle') {
        this.gauges?.flame(
          `flame:${view.spot.id}`,
          state.work.working ? _v.set(at.x, view.top, at.z) : null,
        );
      }
    }
  }

  // --- Tische, Glocke, Tafeln -----------------------------------------------

  private buildTables(): void {
    this.tableViews.length = 0;
    for (const t of TABLES) {
      const anchor = new THREE.Group();
      anchor.name = `plateup-table:${t.index}`;
      anchor.position.set(t.x + 1, 0, t.z + 1);
      this.root.add(anchor);
      this.tableViews.push({ table: t.index, anchor, plate: null, deedKey: '' });
    }
  }

  private tableDeed(index: number): KitchenDeed {
    const guest = guestAt(this.shift, index);
    if (!guest || guest.phase !== 'waiting') return { do: 'nothing' };
    if (!this.carried) return { do: 'refuse', why: `Bestellt: ${menuItem(guest.order).label}` };
    return { do: 'place', dish: this.carried };
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
        const t = TABLES[index]!;
        plate.position.set(t.seat.x - (t.x + 1), TABLE_TOP, t.seat.z - (t.z + 1) + 0.55);
        view.anchor.add(plate);
        view.plate = plate;
      }
    }
    this.announce(`${menuItem(result.guest.order).label} serviert — guten Appetit!`);
    chime([660, 880], 0.12);
    return true;
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

  private refreshBoards(): void {
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
    if (phase === 'over') this.clearGuests();
    this.shift = openDay(this.shift);
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
      const key = `${deed.do}:${this.carried ? dishKey(this.carried) : ''}`;
      if (key === view.deedKey) continue;
      view.deedKey = key;
      if (deed.do === 'nothing') {
        this.removeUsable(view.anchor);
        continue;
      }
      const index = view.table;
      const usable: Usable = {
        use: () => this.serveAt(index),
        usePrompt: () => {
          const d = this.tableDeed(index);
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
    const tick = stepShift(this.shift, dt, TABLES.length);
    this.shift = tick.shift;
    for (const event of tick.events) this.onEvent(event);
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
        const t = TABLES[event.guest.table]!;
        this.effects.push(new CoinPop(this.root, t.x + 1, t.z + 1, event.coins));
        break;
      }
      case 'closing':
        this.announce('Ladenschluss — die letzten Gäste noch bedienen!');
        break;
      case 'dayOver':
        this.announce(`Tag ${this.shift.day} geschafft: ${this.shift.coins} Münzen verdient`);
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
  }

  private clearGuests(): void {
    for (const view of this.guests.values()) this.removeGuestView(view);
    this.guests.clear();
    for (const t of this.tableViews) {
      t.plate?.removeFromParent();
      t.plate = null;
    }
  }

  // --- Die Gäste ------------------------------------------------------------

  private async loadGuestsKit(): Promise<void> {
    const { kaykitClips } = await import('../../core/kaykitModel');
    const clips = await kaykitClips(SIT_FILE, null);
    this.sitClip = clips.find((clip) => clip.name === 'Sit_Chair_Idle') ?? null;
  }

  private spawnGuest(guest: Guest): void {
    const t = TABLES[guest.table]!;
    const street = STREET_ENDS[guest.id % STREET_ENDS.length]!;
    const path = [
      ...guestRoute(this.route, street, DOOR_OUTSIDE),
      ...guestRoute(this.route, DOOR_OUTSIDE, DOOR_INSIDE),
      ...guestRoute(this.route, DOOR_INSIDE, t.approach),
      { x: t.seat.x, z: t.seat.z },
    ];
    const root = new THREE.Group();
    root.name = `plateup-guest:${guest.id}`;
    root.position.set(street.x, 0, street.z);
    this.root.add(root);
    const bubble = new OrderBubble(guest.order);
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
    const t = TABLES[guest.table]!;
    const street = STREET_ENDS[(guest.id + 1) % STREET_ENDS.length]!;
    view.angry = guest.happy === false;
    view.mode = 'out';
    view.bubble.sprite.visible = view.angry;
    if (view.angry) view.bubble.drawAngry();
    this.gauges?.clear(`guest:${guest.id}`);
    view.path = [
      { x: t.approach.x, z: t.approach.z },
      ...guestRoute(this.route, t.approach, DOOR_INSIDE),
      ...guestRoute(this.route, DOOR_INSIDE, DOOR_OUTSIDE),
      ...guestRoute(this.route, DOOR_OUTSIDE, street),
    ];
    if (view.figure) this.standUp(view);
    const table = this.tableViews[guest.table];
    table?.plate?.removeFromParent();
    if (table) table.plate = null;
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
          const t = TABLES[guest?.table ?? 0]!;
          view.root.position.set(t.seat.x, 0, t.seat.z);
          view.root.rotation.y = t.seatYaw;
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
        const food = this.tableViews[guest.table]?.plate?.children[1];
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
  plate: THREE.Object3D | null;
  deedKey: string;
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

  constructor(private readonly order: string) {
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
      fitHeight(coin, 0.08);
      coin.scale.multiplyScalar(2.5);
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
