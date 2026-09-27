import * as THREE from 'three';
import { markBlobShadow } from '../../core/blobShadow';
import { CHEF_CARRY, canLoadModels } from '../../core/chefFit';
import { kaykitModel } from '../../core/kaykitModel';
import type { KaykitFigure } from '../../core/kaykitFigure';
import type { WorldContext } from '../../core/types';
import type { Handedness } from '../../core/XRInput';
import type { UseSource } from '../../core/usable';
import { TextPlane } from '../../ui/TextPlane';
import { GridWorld } from '../grid/GridWorld';
import type { GridPlan } from '../grid/gridPlan';
import { createSky } from '../shared/environment';
import type { PlateTile } from '../shared/plateField';
import { PLATE_PROTOTYPE } from '../test/floorPlate';
import {
  BELT_DONE,
  BELT_PLATE,
  BELT_STATIONS,
  beltBurgers,
  beltFinished,
  type BeltBurger,
} from './burgerBelt';
import {
  MENU,
  menuDish,
  seatGuests,
  serveTable,
  stepGuests,
  type MenuDish,
  type WishGuest,
} from './guestWishes';
import {
  BELT_MODEL,
  BELT_PIECE,
  BELT_PIECES,
  beltSpot,
  bits,
  diningTables,
  kitchenSpots,
  restaurantPlan,
  spawn,
  supplySpots,
  type DiningTable,
  type KitchenSpot,
} from './restaurantPlan';

/** So groß sind die Gäste — wie im Restaurant (`PlateUpWorld`), passend zu den halben Möbeln. */
const GUEST_HEIGHT = 1.15;
/** Die Gäste: Helden aus _Adventurers_, alle auf dem mittleren Skelett. */
const GUEST_FIGURES: readonly string[] = [
  'adventurers/characters/Knight.glb',
  'adventurers/characters/Mage.glb',
  'adventurers/characters/Rogue.glb',
  'adventurers/characters/Barbarian.glb',
  'adventurers/characters/Rogue_Hooded.glb',
  'adventurers/characters/Druid.glb',
];
const SIT_FILE = 'character-animations/animations/rig-medium/Rig_Medium_Simulation.glb';

/** Der Tisch mit Tischdecke und die Stühle — dieselben wie im Restaurant. */
const TABLE_MODEL = bits('table_round_B_tablecloth_red');
const CHAIR_MODEL = bits('chair_A');
/** Die Vorratsbox: eine offene Kiste, das fertige Essen obenauf. */
const SUPPLY_MODEL = bits('crate');

/** Wie groß das Getragene in der Brille in der Hand liegt (`kitchenGrab.HAND_FOOD_SCALE`). */
const HAND_FOOD_SCALE = 0.5;

/** Wie hoch die Blase über dem Kopf steht, und wie groß sie ist. */
const BUBBLE_Y = GUEST_HEIGHT + 0.55;
const BUBBLE_SIZE = 0.72;
/** Wie groß das Gericht in der Blase höchstens ist, in Metern. */
const ICON_SIZE = 0.36;

/** Der Ton der Tafeln. */
const SIGN_ACCENT = 0xf2a33a;

/** Was ein Gast in der Welt ist: Figur, Blase, das Gericht darin und sein Teller. */
interface GuestView {
  readonly table: number;
  readonly seat: number;
  readonly root: THREE.Group;
  figure: KaykitFigure | null;
  readonly bubble: THREE.Sprite;
  icon: THREE.Object3D | null;
  /** Für welchen Wunsch das Bild in der Blase gebaut ist. */
  iconFor: string;
  /** Das Gericht auf dem Tisch, solange er isst. */
  plate: THREE.Object3D | null;
  /** Wie die Blase gerade aussieht. */
  shows: 'wish' | 'thanks' | 'none';
}

/** Ein Burger auf dem Band und seine Schichten im Bild. */
interface BurgerView {
  readonly group: THREE.Group;
  layers: number;
  /** Wie hoch der Stapel schon ist. */
  height: number;
  done: boolean;
}

/**
 * **Test Restaurant** — die zweite Welt im Ordner _Test_ (`restaurantPlan.ts`).
 *
 * Drei Teile, alle aus dem Regal:
 *
 * - **Mini-Küchen**, eine je Gericht: Möbel in einer Reihe, darauf Zutaten,
 *   Werkzeug und das fertige Gericht, darüber eine Tafel mit dem Rezept und
 *   dem, was das Regal nicht hat.
 * - **Ein Förderband**, das allein Burger baut (`burgerBelt.ts`).
 * - **Gäste an Tischen** mit einer Blase über dem Kopf; das Gewünschte holt
 *   man fertig aus einer **Vorratsbox** und legt es auf ihren Tisch
 *   (`guestWishes.ts`).
 *
 * Die Möbel stehen als feste Stücke der Welt (`placeModel`: ein Körper, von
 * oben durchsichtig wie jede Wand); was auf ihnen liegt, ist nur Bild.
 */
export class TestRestaurantWorld extends GridWorld {
  private readonly panels: TextPlane[] = [];
  /** Was diese Welt selbst ins Bild gehängt hat — Kopien aus dem Regal. */
  private readonly decor: THREE.Object3D[] = [];
  /** Was beim Aufräumen weg muss: Leinwände, Materialien. */
  private readonly owned: { dispose(): void }[] = [];
  /** Hochgezählt beim Aufräumen: Was danach noch aus dem Netz kommt, wird verworfen. */
  private round = 0;

  private beltTime = 0;
  private beltTop = 0.5;
  private beltSign: TextPlane | null = null;
  private beltCount = -1;
  private readonly burgers = new Map<number, BurgerView>();
  /** Die Höhe jeder Schicht, gemessen, sobald die Datei da ist. */
  private readonly layerHeights = new Map<string, number>();
  /** Die Vorlagen der Schichten — kopiert wird aus ihnen, ohne Warten. */
  private readonly templates = new Map<string, THREE.Object3D>();

  private guests: WishGuest[] = [];
  private readonly guestViews: GuestView[] = [];
  private tableTop = 0.5;
  private sitClip: THREE.AnimationClip | null = null;
  private bubbleSkins: { wish: THREE.Texture; thanks: THREE.Texture } | null = null;

  private dish: MenuDish | null = null;
  private dishHand: Handedness | null = null;
  private dishView: THREE.Object3D | null = null;
  private readonly carryPoint = new THREE.Vector3();

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
    return 'Test Restaurant · Mini-Küchen, Förderband, Gäste mit Wünschen';
  }

  /** Leere Hände: Getragen wird hier nur, was aus einer Vorratsbox kommt. */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  protected override spawnPoint(): THREE.Vector3 {
    const at = spawn();
    return new THREE.Vector3(at.x, 0, at.z);
  }

  /** Mit Blick nach Norden, auf die Küchen. */
  protected override spawnYaw(): number {
    return 0;
  }

  protected override buildEnvironment(): void {
    super.buildEnvironment();
    this.root.add(createSky(0x6ea8e8, 0xdbe7f2));
  }

  protected override buildProps(): void {
    const ctx = this.context;
    if (!ctx) return;
    for (const spot of kitchenSpots()) this.kitchenSign(spot);
    this.beltSign = this.sign(
      beltSpot().x + beltSpot().length / 2,
      beltSpot().z - 1,
      'Förderband',
      `Baut Burger ganz von allein: ${BELT_STATIONS.map((one) => one.label).join(' → ')}`,
      4.2,
    );
    const tables = diningTables();
    this.guests = seatGuests(tables);
    this.sign(
      (tables[0]!.x + tables[tables.length - 1]!.x) / 2,
      tables[0]!.z - 2.2,
      'Gäste',
      'Die Blase zeigt, was sie wollen. Aus der Vorratsbox nehmen, auf ihren Tisch legen.',
      4.2,
    );
    for (const [i, spot] of supplySpots(MENU.length).entries()) this.buildSupply(MENU[i]!, spot);
    for (const t of tables) this.buildTableUsable(t);
    if (!canLoadModels()) return;
    const round = this.round;
    void this.furnish(round, tables);
  }

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.beltTime += dt;
    this.stepBelt();
    this.guests = stepGuests(this.guests, dt);
    this.stepGuestViews(dt, ctx);
    this.carryInHands(ctx);
  }

  override dispose(ctx: WorldContext): void {
    this.round++;
    ctx.avatar.carry = null;
    this.dishView?.removeFromParent();
    this.dishView = null;
    this.dish = null;
    for (const view of this.guestViews) view.figure?.dispose();
    this.guestViews.length = 0;
    for (const view of this.burgers.values()) view.group.removeFromParent();
    this.burgers.clear();
    // Kopien aus dem Regal tragen eigene Materialien (`kaykitModel.copyOf`),
    // und die räumt `disposeTree` an ihnen nicht ab — also hier.
    for (const object of this.decor) {
      object.removeFromParent();
      dropMaterials(object);
    }
    this.decor.length = 0;
    for (const panel of this.panels) panel.dispose();
    this.panels.length = 0;
    for (const one of this.owned) one.dispose();
    this.owned.length = 0;
    for (const template of this.templates.values()) dropMaterials(template);
    this.templates.clear();
    this.layerHeights.clear();
    this.bubbleSkins = null;
    this.beltSign = null;
    this.beltCount = -1;
    this.beltTime = 0;
    super.dispose(ctx);
  }

  // --- Aufstellen -----------------------------------------------------------

  /** Alles, was geladen werden muss — der Reihe nach, damit die Höhen stimmen. */
  private async furnish(round: number, tables: readonly DiningTable[]): Promise<void> {
    await Promise.all([
      ...kitchenSpots().map((spot) => this.buildKitchen(round, spot)),
      this.buildBelt(round),
      this.buildDining(round, tables),
    ]);
  }

  /** Eine Mini-Küche: die Möbel in der Reihe, und obenauf, was dazugehört. */
  private async buildKitchen(round: number, spot: KitchenSpot): Promise<void> {
    await Promise.all(
      spot.kitchen.slots.map(async (slot, i) => {
        const x = spot.x + i + 0.5;
        const z = spot.z + 0.5;
        const top = await this.stand(round, slot.base, x, z, 0);
        if (top === null) return;
        const items = slot.items ?? [];
        if (slot.stack) {
          let y = top;
          for (const item of items) {
            const next = await this.lay(round, item, x, y, z);
            if (next === null) return;
            y = next;
          }
          return;
        }
        await Promise.all(
          items.map((item, k) => this.lay(round, item, x + spread(items.length, k), top, z + 0.05)),
        );
      }),
    );
  }

  /** Die Tafel einer Küche: Name, Rezept und was fehlt. */
  private kitchenSign(spot: KitchenSpot): void {
    const { kitchen } = spot;
    const steps = kitchen.recipe.map((step, i) => `${i + 1}. ${step}`).join('\n');
    const body = kitchen.missing ? `${steps}\nFehlt: ${kitchen.missing}` : steps;
    this.sign(
      spot.x + kitchen.slots.length / 2,
      spot.z - 0.2,
      kitchen.title,
      body,
      Math.max(3.2, Math.min(5, kitchen.slots.length * 0.5)),
    );
  }

  /** Eine Tafel, die über dem steht, wovon sie spricht, und sich zur Kamera dreht. */
  private sign(x: number, z: number, title: string, body: string, width: number): TextPlane {
    const panel = new TextPlane({
      width,
      height: width * 0.42,
      title,
      body,
      accent: SIGN_ACCENT,
      align: 'left',
      face: { upright: true },
    });
    panel.position.set(x, 1.9, z);
    this.root.add(panel);
    this.panels.push(panel);
    return panel;
  }

  /**
   * **Das Band und seine Stationen**: die Förderbänder aus dem Regal in einer
   * Reihe, an der Nordseite je Station ihr Möbel, am Ostende eine Platte für
   * die fertigen Burger. Dazu die Vorlagen der Schichten, gemessen.
   */
  private async buildBelt(round: number): Promise<void> {
    const belt = beltSpot();
    const z = belt.z + 0.5;
    const tops = await Promise.all(
      Array.from({ length: BELT_PIECES }, (_, i) =>
        // Gedreht, bis die Pfeile auf dem Band nach Osten zeigen, wohin es läuft.
        this.stand(round, BELT_MODEL, belt.x + BELT_PIECE * i + BELT_PIECE / 2, z, -Math.PI / 2),
      ),
    );
    this.beltTop = Math.max(0, ...tops.map((top) => top ?? 0));
    await Promise.all([
      ...BELT_STATIONS.map(async (station) => {
        const top = await this.stand(round, station.model, belt.x + station.at, z - 1, 0);
        if (top !== null && station.extra)
          await this.lay(round, station.extra, belt.x + station.at, top, z - 1);
      }),
      this.stand(round, bits('kitchencounter_straight_A'), belt.x + belt.length + 0.5, z, 0),
      ...[...BELT_STATIONS.map((station) => station.layer), BELT_DONE, BELT_PLATE].map((path) =>
        this.warm(round, path),
      ),
    ]);
  }

  /** Tische, Stühle, Gäste — und die Vorlage für den Teller auf dem Tisch. */
  private async buildDining(round: number, tables: readonly DiningTable[]): Promise<void> {
    const tops = await Promise.all(tables.map((t) => this.stand(round, TABLE_MODEL, t.x, t.z, 0)));
    this.tableTop = Math.max(0.3, ...tops.map((top) => top ?? 0));
    for (const t of tables)
      for (const seat of t.seats) void this.stand(round, CHAIR_MODEL, seat.x, seat.z, seat.yaw);
    for (const dish of MENU) void this.warm(round, dish.model);
    const { kaykitClips } = await import('../../core/kaykitModel');
    const clips = await kaykitClips(SIT_FILE, null);
    if (round !== this.round) return;
    this.sitClip = clips.find((clip) => clip.name === 'Sit_Chair_Idle') ?? null;
    for (const guest of this.guests) this.spawnGuest(round, tables[guest.table]!, guest);
  }

  /**
   * **Ein Möbel auf den Boden stellen** — als festes Stück der Welt
   * (`placeModel`), mit der Mitte seiner Hülle über der Kachel.
   *
   * @returns die Oberkante, auf die man etwas legen kann — `null`, wenn nichts kam
   */
  private async stand(
    round: number,
    path: string,
    x: number,
    z: number,
    yaw: number,
  ): Promise<number | null> {
    const size = await this.measure(path);
    if (!size || round !== this.round) return null;
    this.layerHeights.set(path, size.y);
    await this.placeModel(path, new THREE.Vector3(x, size.y / 2, z), yaw);
    return size.y;
  }

  /**
   * **Etwas obenauf legen** — nur Bild, ohne Körper: mit der Unterseite auf
   * `y`, mittig über `x`/`z`.
   *
   * @returns die Oberkante des Gelegten
   */
  private async lay(
    round: number,
    path: string,
    x: number,
    y: number,
    z: number,
  ): Promise<number | null> {
    const model = await kaykitModel(path);
    if (!model || round !== this.round) return null;
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return null;
    model.position.set(
      x - (box.min.x + box.max.x) / 2,
      y - box.min.y,
      z - (box.min.z + box.max.z) / 2,
    );
    this.root.add(model);
    this.decor.push(model);
    return y + box.max.y - box.min.y;
  }

  /** Wie groß ein Modell ist (Breite, Höhe, Tiefe), gemessen an einer Kopie. */
  private async measure(path: string): Promise<THREE.Vector3 | null> {
    const template = this.templates.get(path) ?? (await kaykitModel(path));
    if (!template) return null;
    this.templates.set(path, template);
    const box = new THREE.Box3().setFromObject(template);
    return box.isEmpty() ? null : box.getSize(new THREE.Vector3());
  }

  /** Eine Vorlage holen und ihre Höhe merken — für das, was je Bild kopiert wird. */
  private async warm(round: number, path: string): Promise<void> {
    const size = await this.measure(path);
    if (!size || round !== this.round) return;
    this.layerHeights.set(path, size.y);
  }

  /** Eine Kopie einer gewärmten Vorlage, mit der Unterseite auf null und mittig. */
  private copyOf(path: string): THREE.Object3D | null {
    const template = this.templates.get(path);
    if (!template) return null;
    const copy = template.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    const holder = new THREE.Group();
    copy.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    holder.add(copy);
    return holder;
  }

  // --- Das Band -------------------------------------------------------------

  /** Jedes Bild: Burger dazu, weiter, eine Schicht mehr, fertig, weg. */
  private stepBelt(): void {
    const belt = beltSpot();
    const now = beltBurgers(this.beltTime, belt.length);
    const alive = new Set<number>();
    for (const burger of now) {
      alive.add(burger.serial);
      let view = this.burgers.get(burger.serial);
      if (!view) {
        view = { group: new THREE.Group(), layers: 0, height: 0, done: false };
        view.group.name = `test-restaurant-burger:${burger.serial}`;
        this.root.add(view.group);
        this.burgers.set(burger.serial, view);
      }
      this.dressBurger(view, burger);
      const x = burger.done ? belt.x + belt.length + 0.5 : belt.x + burger.at;
      const y = burger.done ? this.counterTop() : this.beltTop;
      view.group.position.set(x, y, belt.z + 0.5);
    }
    for (const [serial, view] of this.burgers) {
      if (alive.has(serial)) continue;
      view.group.removeFromParent();
      this.burgers.delete(serial);
    }
    const count = beltFinished(this.beltTime, belt.length);
    if (count !== this.beltCount && this.beltSign) {
      this.beltCount = count;
      this.beltSign.setText(
        `Förderband · ${count} fertig`,
        `Baut Burger ganz von allein: ${BELT_STATIONS.map((one) => one.label).join(' → ')}`,
      );
    }
  }

  /** Die Oberkante der Platte am Ende des Bands — dieselbe wie jede Arbeitsplatte. */
  private counterTop(): number {
    return this.layerHeights.get(bits('kitchencounter_straight_A')) ?? this.beltTop;
  }

  /** Die Schichten eines Burgers nachziehen — oder ihn zum fertigen Teller machen. */
  private dressBurger(view: BurgerView, burger: BeltBurger): void {
    if (burger.done) {
      if (view.done) return;
      const plate = this.copyOf(BELT_PLATE);
      const done = this.copyOf(BELT_DONE);
      if (!plate || !done) return;
      view.group.clear();
      view.group.add(plate);
      done.position.y = (this.layerHeights.get(BELT_PLATE) ?? 0) * 0.6;
      view.group.add(done);
      view.done = true;
      return;
    }
    while (view.layers < burger.layers.length) {
      const path = burger.layers[view.layers]!;
      const layer = this.copyOf(path);
      if (!layer) return;
      layer.position.y = view.height;
      view.group.add(layer);
      // Die Schichten liegen ineinander, nicht nur aufeinander — ein Brötchen
      // hat eine Mulde.
      view.height += (this.layerHeights.get(path) ?? 0.05) * 0.7;
      view.layers++;
    }
  }

  // --- Vorratsboxen und Tische ----------------------------------------------

  /** Eine Vorratsbox: die Kiste, obenauf das Gericht, darüber sein Name. */
  private buildSupply(dish: MenuDish, spot: { x: number; z: number }): void {
    const x = spot.x + 0.5;
    const z = spot.z + 0.5;
    const anchor = new THREE.Group();
    anchor.name = `test-restaurant-supply:${dish.id}`;
    anchor.position.set(x, 0.4, z);
    this.root.add(anchor);
    const panel = new TextPlane({
      width: 0.9,
      height: 0.3,
      title: dish.label,
      accent: SIGN_ACCENT,
      face: true,
    });
    panel.position.set(x, 1.3, z);
    this.root.add(panel);
    this.panels.push(panel);
    this.addUsable(
      anchor,
      {
        use: (by) => this.takeDish(dish, by),
        usePrompt: () =>
          this.dish?.id === dish.id ? `${dish.label} zurücklegen` : `${dish.label} nehmen`,
      },
      { radius: 0.6, half: 0.5 },
    );
    if (!canLoadModels()) return;
    const round = this.round;
    void this.stand(round, SUPPLY_MODEL, x, z, 0).then((top) => {
      if (top !== null) void this.lay(round, dish.model, x, top, z);
    });
  }

  private takeDish(dish: MenuDish, by: UseSource): boolean {
    if (this.dish?.id === dish.id) {
      this.setHeld(null, null);
      this.announce(`${dish.label} zurückgelegt`);
      return true;
    }
    this.setHeld(dish, by.hand ?? null);
    this.announce(`${dish.label} genommen — ab an den Tisch`);
    return true;
  }

  private buildTableUsable(t: DiningTable): void {
    const anchor = new THREE.Group();
    anchor.name = `test-restaurant-table:${t.index}`;
    anchor.position.set(t.x, 0.4, t.z);
    this.root.add(anchor);
    this.addUsable(
      anchor,
      {
        use: () => this.serveAt(t),
        usePrompt: () => (this.dish ? `${this.dish.label} auf den Tisch` : `Tisch ${t.index + 1}`),
      },
      { radius: 1.25, half: 0.6 },
    );
  }

  /** **Aufs Tischtuch** — bekommt es jemand, liegt es vor ihm, bis er aufgegessen hat. */
  private serveAt(t: DiningTable): boolean {
    const held = this.dish;
    if (!held) {
      const wanted = this.guests
        .filter((guest) => guest.table === t.index && guest.phase === 'waiting')
        .map((guest) => menuDish(guest.wish)?.label ?? guest.wish);
      this.announce(
        wanted.length
          ? `Tisch ${t.index + 1} wünscht sich: ${wanted.join(', ')} — aus den Vorratsboxen holen`
          : `Tisch ${t.index + 1}: alle sind bedient`,
      );
      return false;
    }
    const result = serveTable(this.guests, t.index, held.id);
    if (!result.ok) {
      this.announce(result.reason);
      return false;
    }
    this.guests = result.guests;
    this.setHeld(null, null);
    const view = this.guestViews.find(
      (one) => one.table === t.index && one.seat === result.guest.seat,
    );
    const seat = t.seats[result.guest.seat]!;
    const plate = this.copyOf(held.model);
    if (plate && view) {
      plate.position.set(t.x + (seat.x - t.x) * 0.4, this.tableTop, t.z + (seat.z - t.z) * 0.4);
      this.root.add(plate);
      view.plate = plate;
    }
    this.announce(`${held.label} für Tisch ${t.index + 1} — guten Appetit!`);
    return true;
  }

  // --- Die Gäste ------------------------------------------------------------

  private spawnGuest(round: number, t: DiningTable, guest: WishGuest): void {
    const seat = t.seats[guest.seat]!;
    const root = new THREE.Group();
    root.name = `test-restaurant-guest:${guest.table}:${guest.seat}`;
    root.position.set(seat.x, 0, seat.z);
    markBlobShadow(root, 0.32);
    this.root.add(root);
    const bubble = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.bubbleSkin().wish,
        depthTest: false,
        transparent: true,
      }),
    );
    this.owned.push(bubble.material);
    bubble.scale.set(BUBBLE_SIZE, BUBBLE_SIZE, 1);
    bubble.position.set(seat.x, BUBBLE_Y, seat.z);
    bubble.renderOrder = 950;
    this.root.add(bubble);
    const view: GuestView = {
      table: guest.table,
      seat: guest.seat,
      root,
      figure: null,
      bubble,
      icon: null,
      iconFor: '',
      plate: null,
      shows: 'none',
    };
    this.guestViews.push(view);
    const file = GUEST_FIGURES[(guest.table * 3 + guest.seat) % GUEST_FIGURES.length]!;
    void import('../../core/kaykitFigure').then(async ({ loadKaykitFigure }) => {
      const figure = await loadKaykitFigure(file, GUEST_HEIGHT);
      if (!figure) return;
      if (round !== this.round) {
        figure.dispose();
        return;
      }
      view.figure = figure;
      // Die Figur schaut zur Tischmitte; die Gruppe dreht sich, der Schatten nicht.
      figure.root.rotation.y = seat.yaw;
      root.add(figure.root);
      figure.gait(0);
      if (this.sitClip) {
        figure.mixer.stopAllAction();
        figure.mixer.clipAction(this.sitClip).reset().play();
      }
    });
  }

  /** Jedes Bild: Figur bewegen, Blase zeigen, was gerade gilt, Teller leer essen. */
  private stepGuestViews(dt: number, ctx: WorldContext): void {
    for (const view of this.guestViews) {
      view.figure?.update(dt);
      const guest = this.guests.find((one) => one.table === view.table && one.seat === view.seat);
      if (!guest) continue;
      const shows =
        guest.phase === 'waiting' ? 'wish' : guest.phase === 'thanks' ? 'thanks' : 'none';
      if (shows !== view.shows) {
        view.shows = shows;
        const skins = this.bubbleSkin();
        view.bubble.visible = shows !== 'none';
        view.bubble.material.map = shows === 'thanks' ? skins.thanks : skins.wish;
        view.bubble.material.needsUpdate = true;
      }
      if (guest.phase !== 'eating' && view.plate) {
        view.plate.removeFromParent();
        view.plate = null;
      }
      if (guest.phase === 'eating' && view.plate) {
        // Der Teller wird leerer, während gegessen wird.
        view.plate.scale.setScalar(Math.max(0.35, 1 - guest.clock / 6));
      }
      this.stepIcon(view, guest, ctx);
    }
  }

  /** **Das Gericht in der Blase** — klein, vor der Blase, und es dreht sich langsam. */
  private stepIcon(view: GuestView, guest: WishGuest, ctx: WorldContext): void {
    const wanted = guest.phase === 'waiting' ? guest.wish : '';
    if (view.iconFor !== wanted) {
      view.icon?.removeFromParent();
      view.icon = null;
      view.iconFor = '';
    }
    if (!wanted) return;
    if (!view.icon) {
      const dish = menuDish(wanted);
      const icon = dish ? this.copyOf(dish.model) : null;
      if (!icon) return;
      const size = new THREE.Box3().setFromObject(icon).getSize(new THREE.Vector3());
      const scale = ICON_SIZE / Math.max(size.x, size.y, size.z, 0.01);
      icon.scale.setScalar(scale);
      // Die Mitte der Blase — und vor ihr, ohne Tiefenprüfung.
      icon.children[0]!.position.y -= size.y / 2;
      icon.traverse((node) => {
        const mesh = node as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.renderOrder = 960;
        const own = (skin: THREE.Material): THREE.Material => {
          const copy = skin.clone();
          // Durchsichtig gezählt, damit es mit der Blase in einen Durchgang
          // kommt und nach ihr gezeichnet wird (`renderOrder`) — sonst malte
          // die Blase darüber.
          copy.transparent = true;
          copy.depthTest = false;
          this.owned.push(copy);
          return copy;
        };
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
      });
      icon.position.copy(view.bubble.position);
      icon.position.y += 0.04;
      this.root.add(icon);
      view.icon = icon;
      view.iconFor = wanted;
    }
    view.icon.rotation.y = ctx.elapsed * 0.8;
  }

  /** Die beiden Bilder der Blase: leer (das Gericht steht davor) und mit Häkchen. */
  private bubbleSkin(): { wish: THREE.Texture; thanks: THREE.Texture } {
    if (this.bubbleSkins) return this.bubbleSkins;
    const wish = bubbleTexture(null);
    const thanks = bubbleTexture('✓');
    this.owned.push(wish, thanks);
    this.bubbleSkins = { wish, thanks };
    return this.bubbleSkins;
  }

  // --- Das Getragene --------------------------------------------------------

  private setHeld(dish: MenuDish | null, hand: Handedness | null): void {
    if (this.dish?.id === dish?.id && this.dishHand === hand) return;
    this.dish = dish;
    this.dishHand = dish ? hand : null;
    this.dishView?.removeFromParent();
    this.dishView = dish ? this.copyOf(dish.model) : null;
  }

  /**
   * **Wo das Getragene hängt** — wie im Restaurant (`PlateUpWorld.carryInHands`):
   * am Schirm vor dem Bauch der Figur, aus den Augen unten im Bild, in der
   * Brille in der Hand, die es genommen hat.
   */
  private carryInHands(ctx: WorldContext): void {
    const thing = this.dishView;
    if (!thing) {
      ctx.avatar.carry = null;
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      const controller = this.dishHand ? ctx.input.get(this.dishHand) : null;
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

/** Wie weit das `k`-te von `n` Dingen auf einer Platte von der Mitte liegt. */
function spread(n: number, k: number): number {
  if (n <= 1) return 0;
  const width = n === 2 ? 0.44 : 0.62;
  return -width / 2 + (width * k) / (n - 1);
}

/** **Eine Sprechblase** — weiß, rund, mit einem Zipfel nach unten. */
function bubbleTexture(mark: string | null): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  if (g) {
    g.fillStyle = '#ffffff';
    g.strokeStyle = '#2b2f36';
    g.lineWidth = 8;
    g.beginPath();
    g.arc(128, 112, 96, 0, Math.PI * 2);
    g.moveTo(104, 200);
    g.lineTo(128, 250);
    g.lineTo(152, 200);
    g.fill();
    g.stroke();
    // Den Strich zwischen Kreis und Zipfel übermalen.
    g.beginPath();
    g.arc(128, 112, 91, 0.3 * Math.PI, 0.7 * Math.PI);
    g.lineTo(128, 240);
    g.fill();
    if (mark) {
      g.fillStyle = '#16a34a';
      g.font = 'bold 150px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(mark, 128, 118);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
