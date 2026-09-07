import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { createGround, createSky, disposeTree } from '../shared/environment';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import type { ControllerState, Handedness } from '../../core/XRInput';
import type { PointerHit } from '../../core/Pointer';
import type { NavGraph } from '../nav/navGraph';
import { readNav, writeNav } from '../nav/navSerial';
import { TILE, tileCentreX, tileCentreZ } from '../nav/navTile';
import { Palette } from './Palette';
import { PlanCard } from './PlanCard';
import { PlayerPin } from './PlayerPin';
import {
  MODEL_OVER,
  WORKSHOP_SPAWN,
  WORKSHOP_YAW,
  buildWorkshop,
  type WorkshopParts,
} from './Workshop';
import {
  addProp,
  propNear,
  readProps,
  removeProp as dropProp,
  standingY,
  writeProps,
  type PlanProp,
} from './planProps';
import { createPropShape, PROP_LABELS, type PropKind } from '../portal/props';
import { planSolids, type PlanSolid } from './levelBuild';
import { grabbedAt, HIP_REACH, type Target } from './reach';
import {
  PLAN_TOOLS,
  PLAN_WALL_H,
  aimOf,
  applyTool,
  edgeAt,
  planBounds,
  planCentre,
  planToolSpec,
  replacePlan,
  spotAt,
  starterPlan,
  type PlanSpot,
  type PlanTool,
} from './levelPlan';
import {
  SCALE_MAX,
  SCALE_MIN,
  bringNear,
  carryPose,
  clampModel,
  grabOne,
  grabTwo,
  newModel,
  recentre,
  worldToPlan,
  yawTurn,
  type Hold,
  type Model,
  type Spot,
} from './miniature';

/**
 * **Der Bauplatz** — ein Level bauen, während man darin steht.
 *
 * Die Welt beantwortet eine Frage, die es hier bisher nur als Zeile unter „was
 * noch fehlt" gab: *Wie sieht man einen Grundriss von oben, wenn man selbst
 * darin steht?* Die Antwort ist ein **Tischmodell** (`miniature.ts`): Der
 * Grundriss steht als Miniatur vor einem in der Luft, man greift hinein,
 * schiebt sie, dreht sie, zieht sie größer — und was man an ihr baut, wächst
 * im selben Augenblick **in Lebensgröße** um einen herum.
 *
 * **Drei Zustände, und zwischen ihnen wird gegangen** (`Stage`):
 *
 * - **Im Level.** Man steht in dem, was man gebaut hat. Die Karte hängt
 *   zusammengefaltet an der Hüfte.
 * - **Karte in der Hand** (`PlanCard.ts`). Sie ist ein Werkzeug wie die
 *   Drohne und kein Schalter: Erst hält man sie und sieht von oben, wo man
 *   steht — Grundriss, Gegenstände, die eigene Marke als Pfeil. Der
 *   **Trigger** führt hinein.
 * - **Im Konstruktraum** (`Workshop.ts`). Eine Werkstatt weit weg von jedem
 *   Grundriss, mit einer Werkbank, einem Regal voller Musterstücke und einem
 *   Knopf zurück. Hier steht das Modell, hier wird gebaut.
 *
 * **Der Konstruktraum ist wirklich woanders**, und das ist der Unterschied zur
 * ersten Fassung. Die machte das Level unsichtbar und ließ einen darin stehen
 * — ein weißes Zimmer an derselben Stelle. Jeder Schritt vor dem Modell war
 * damit ein Schritt im Level, und wer zurücktrat, um den Grundriss ganz zu
 * sehen, stand beim Weglegen in einer Wand. Jetzt hält nur noch eine **Marke**
 * die Verbindung: die Stelle, an der man das Level verlassen hat. Sie steht als
 * Figur in der Miniatur (`PlayerPin.ts`), man versetzt **sie** statt sich
 * selbst, und beim Zurückgehen taucht man dort auf.
 *
 * Gebaut wird mit zwei Sachen in der Hand:
 *
 * - Der **Palette** (`Palette.ts`) für den Grundriss: einmal eintunken,
 *   beliebig oft setzen, den Pinsel zurück in die Mulde, wenn man fertig ist.
 * - Den **Musterstücken vom Regal** für alles, was darin steht
 *   (`planProps.ts`). Man nimmt eines vom Brett, hält es in der Größe in der
 *   Hand, die es in der Miniatur hätte, und setzt es auf eine Kachel. Es steht
 *   dann auf dem Boden — eine Höhe stellt hier niemand ein.
 *
 * Das Modell selbst wird gehalten wie ein Gegenstand: eine Hand trägt es samt
 * Handgelenk, **zwei Hände** ziehen es größer, kippen und drehen es
 * (`miniature.ts`); und angefaßt wird es auch **auf Entfernung** — wer
 * hinzielt und zugreift, hat es, egal wie weit weg es steht. Fallen tut es
 * nicht.
 *
 * **Der Plan ist der Navigationsgraph** (`levelPlan.ts`). Nichts an dieser
 * Welt ist ein eigenes Format: Was hier gebaut wird, können NPCs sofort
 * belaufen, und was `nav/navSerial.ts` speichern kann, ist genau das, was hier
 * entsteht.
 *
 * **Gebaut wird aus einer Liste** (`levelBuild.ts`). Miniatur und Lebensgröße
 * kommen aus demselben `planSolids()` — zwei Bauanleitungen für dasselbe
 * Zimmer laufen sonst auseinander, und man merkt es an dem Tag, an dem eine
 * Tür in der Miniatur an einer anderen Wand hängt als im Raum.
 */
export class EditorWorld extends PortalWorld {
  private readonly plan = starterPlan();
  /** Woran erkannt wird, dass sich am Plan etwas getan hat. */
  private builtVersion = -1;
  /** Die Mitte des Plans, mit der das Modell gerade gebaut ist. */
  private centre = planCentre(this.plan);
  /**
   * Und sein Ausschnitt — einmal je Neubau gerechnet und nicht je Bild.
   *
   * `planBounds` läuft über jede Kachel; bei sechzig Bildern in der Sekunde
   * wäre das die teuerste Zeile dieser Welt, und sie beantwortet zwischen zwei
   * Handgriffen immer dasselbe.
   */
  private bounds = planBounds(this.plan);
  /**
   * Die Quader des Grundrisses, so wie sie zuletzt gebaut wurden.
   *
   * Sie werden bei jedem Umbau ohnehin gerechnet; die Karte in der Hand
   * zeichnet aus **dieser** Liste (`PlanCard.draw`) und nicht aus einer
   * zweiten. Ein Grundriss, den zwei Rechnungen zeichnen, ist einer, der an
   * zwei Stellen verschieden aussieht.
   */
  private planShapes: readonly PlanSolid[] = [];

  /** Das Gebaute in Lebensgröße — hier läuft man herum. */
  private readonly stage = new THREE.Group();
  /** Und dasselbe klein, in der Luft vor einem. */
  private readonly mini = new THREE.Group();
  /** Die Körper der Lebensgröße; beim Umbauen müssen sie wieder heraus. */
  private readonly built: PhysicsBody[] = [];

  /**
   * **Was im Grundriss steht** — die Gegenstände (`planProps.ts`).
   *
   * Eine zweite Liste neben dem Plan, und zwar aus dem Grund, der dort steht:
   * Der Plan ist die Karte, auf der NPCs laufen, und eine Kiste ist keine
   * Karte. Sie überleben das Umbauen des Grundrisses — wer eine Kachel
   * anbaut, soll nicht seine halbe Werkstatt neu aufstellen.
   */
  private readonly things: PlanProp[] = [];
  /** Ihre Körper, je Kennung — damit einer einzeln wieder wegkann. */
  private readonly thingBodies = new Map<string, PhysicsBody>();
  /** Woran die Miniatur erkennt, dass sich an ihnen etwas getan hat. */
  private thingsVersion = 0;

  private model: Model = newModel();
  /**
   * **Was ein Tipp auf die Miniatur tut** — oder `null`, wenn der Pinsel in
   * der Mulde steckt.
   *
   * Die vier Bauwerkzeuge (`levelPlan.ts`) und eines mehr: `go` baut nichts,
   * sondern stellt **einen selbst** dorthin. Es steht neben den Werkzeugen und
   * nicht in ihnen, denn es ändert nichts am Plan.
   *
   * Dass `null` dazukam, ist die Palette: Ein Pinsel, den man nicht weglegen
   * kann, ist einer, mit dem man bei jedem Griff in die Miniatur eine Wand
   * setzt. Wer nur hinsehen will, legt ihn zurück.
   */
  private brush: PlanTool | 'go' | null = null;
  /** In welcher Hand der Pinsel liegt — `null`, solange er in der Mulde steckt. */
  private brushHand: Handedness | null = null;
  /**
   * **Das Musterstück in der Hand** — `null`, wenn keines vom Regal genommen
   * wurde.
   *
   * Es steht neben dem Pinsel und nicht in ihm, denn es ist etwas anderes:
   * Der Pinsel ändert den *Grundriss*, das Musterstück stellt etwas **hinein**.
   * Beides zugleich in der Hand zu haben ergäbe keinen Sinn — wer eines
   * nimmt, legt das andere weg.
   */
  private thing: PropKind | null = null;
  private thingHand: Handedness | null = null;
  /** Die Vorschau in der Hand: das Ding in Miniaturgröße. */
  private thingView: THREE.Object3D | null = null;

  private palette: Palette | null = null;
  /** Die Karte, solange sie in einer Hand liegt. */
  private card: PlanCard | null = null;
  private cardHand: Handedness | null = null;
  /** Der Konstruktraum: Werkbank, Regal, Ausgang (`Workshop.ts`). */
  private shop: WorkshopParts | null = null;
  private pin: PlayerPin | null = null;
  /** Die Vorschau: eine Kachel und ein Wandstück, immer nur eines davon. */
  private ghostTile: THREE.Mesh | null = null;
  private ghostEdge: THREE.Mesh | null = null;
  /** Worauf der Zeiger gerade liegt — `null`, wenn er daneben zeigt. */
  private spot: PlanSpot | null = null;
  /** Die Fläche, die beim Zeiger angemeldet ist — beim Neubau muss sie weg. */
  private aimed: THREE.Object3D | null = null;

  /**
   * **Was welche Hand gerade hält.** Drei Dinge schweben in derselben Luft,
   * und wer zugreift, meint das nächste davon (`reach.ts`).
   */
  private readonly holds = new Map<Handedness, Piece>();
  /** Das Modell: welche Hände, wo sie waren, und wie es stand. */
  private grip: { hands: Handedness[]; from: Hold[]; start: Model } | null = null;
  /** Die Palette: eine Hand reicht, sie wird nur getragen. */
  private carry: { hand: Handedness; from: Hold; start: Hold } | null = null;
  /** Die Figur, während sie durch die Miniatur gezogen wird — in Planmetern. */
  private dragged: { x: number; z: number } | null = null;

  /** Wo die Palette schwebt, wenn sie niemand hält. */
  private palettePose: Hold = { at: { x: 0, y: 1, z: -1 }, turn: yawTurn(0) };

  /**
   * **An welcher Hüfte Karte und Palette hängen** — `null` heißt: sie sind
   * draußen.
   *
   * Die Karte ist der Anfang von allem: Solange sie an der Hüfte hängt, steht
   * man einfach in seinem Level; gezogen liegt sie in der Hand und zeigt den
   * Grundriss von oben, und ihr Trigger führt in den Konstruktraum
   * (`readCardTrigger`).
   */
  private mapHip: Handedness | null = 'left';
  private paletteHip: Handedness | null = 'right';
  /** Die zusammengefaltete Karte an der Hüfte — sie sagt, wo sie zu holen ist. */
  private folded: THREE.Object3D | null = null;

  /**
   * **Wo man gerade ist** — und damit alles andere.
   *
   * `'level'`: in dem, was man gebaut hat. `'map'`: dasselbe, aber mit der
   * Karte in der Hand. `'shop'`: im Konstruktraum, weit weg.
   */
  private stageOf: Stage = 'level';
  /**
   * **Die Marke** — wo im Level man wieder auftaucht, in Planmetern samt
   * Blickrichtung.
   *
   * Sie ist das Einzige, was den Konstruktraum mit dem Level verbindet, und
   * genau deshalb gibt es sie: Wer dort herumläuft, läuft in einer Werkstatt
   * und nicht in seinem Level. Versetzt wird sie in der Miniatur — mit der
   * Figur oder mit dem Hingehen.
   */
  private mark = { x: 0, y: 0, z: 0, yaw: 0 };

  private readonly floorMat = new THREE.MeshStandardMaterial({ color: 0x39415a, roughness: 0.95 });
  private readonly wallMat = new THREE.MeshStandardMaterial({ color: 0x6a7590, roughness: 0.85 });
  private readonly doorMat = new THREE.MeshStandardMaterial({
    color: 0xe58aa8,
    roughness: 0.6,
  });
  private readonly miniFloorMat = new THREE.MeshStandardMaterial({
    color: 0x2f7fd0,
    roughness: 0.6,
    emissive: new THREE.Color(0x0d2c52),
  });
  private readonly miniWallMat = new THREE.MeshStandardMaterial({
    color: 0xbfd0ea,
    roughness: 0.5,
    emissive: new THREE.Color(0x1b2740),
  });

  // --- was die Welt ausmacht ------------------------------------------------

  protected override spawnPoint(): THREE.Vector3 {
    // Im Startzimmer, mit Blick auf seine Nordwand.
    return new THREE.Vector3(0, 0, 4);
  }

  protected override spawnYaw(): number {
    return 0;
  }

  protected override skyColor(): number {
    return 0x0f1420;
  }

  protected override lightIntensity(): number {
    return 1.15;
  }

  protected override welcome(): string {
    return 'Bauplatz · Karte von der Hüfte ziehen · Trigger führt in den Konstruktraum';
  }

  /** Ob man im Konstruktraum steht — und damit, ob gebaut werden kann. */
  private get editing(): boolean {
    return this.stageOf === 'shop';
  }

  /** Ob die Karte gerade in einer Hand liegt. */
  private get carrying(): boolean {
    return this.stageOf !== 'level';
  }

  /**
   * **Kein Gürtel voller Werkzeuge.**
   *
   * Der Greifknopf gehört hier der Karte, der Palette und der Figur, und ein
   * Werkzeug in der Hand nähme ihn weg. Die beiden Hüften sind trotzdem
   * belegt — nur nicht mit Werkzeugen aus dem Kasten, sondern mit dem, was
   * diese Welt selbst führt.
   */
  protected override beltLoadout(): ReadonlyArray<readonly [string, Handedness]> {
    return [];
  }

  /**
   * **Der Plan ist die Karte** — kein Abtasten.
   *
   * `bakeNavigation()` hat gerade aus den gebauten Quadern einen Graphen
   * gemacht; der wird hier weggeworfen und durch den Plan ersetzt. Das ist
   * nicht Verschwendung, sondern die Aussage dieser Welt: Was der Editor
   * hinstellt, *ist* die Karte. Ein abgetasteter Graph wüsste nichts von den
   * Türen (ein Quader sagt nicht, dass er zugehen kann) und ginge bei jeder
   * Änderung neu — der Plan ändert sich einfach mit.
   */
  protected override navReady(_graph: NavGraph): void {
    this.nav = this.plan;
  }

  /**
   * **Der Boden bis zum Horizont kommt hier selbst** — zwei Zentimeter tiefer.
   *
   * `PortalWorld` legt ihn sonst mit seiner Oberkante auf genau null, und dort
   * liegt auch die Oberkante jeder Bodenplatte des Plans. Zwei Flächen auf
   * derselben Höhe streiten sich um jedes Pixel, und das Ergebnis flimmert über
   * den ganzen Grundriss. Zwei Zentimeter Abstand beenden den Streit, und
   * heruntertreten kann man sie nicht.
   *
   * Weg lassen kann man ihn nicht: Wer alle Kacheln löscht, stünde sonst über
   * dem Nichts.
   */
  protected override horizonColor(): number | null {
    return null;
  }

  protected override buildEnvironment(): void {
    const ground = createGround(0x2a3346, { line: 0x3d4a63 });
    ground.position.y -= 0.02;
    ground.updateMatrixWorld(true);
    this.root.add(ground);
    this.physics?.addStatic(ground, { membership: GROUP_WORLD, filter: ALL_GROUPS });

    this.root.add(createSky(0x141c2c, 0x39d0ff));

    this.root.add(this.stage);
    this.root.add(this.mini);

    // **Der Konstruktraum steht von Anfang an da**, gut vierhundert Meter
    // hinter dem Grundriss (`Workshop.ts`). Ein Zimmer, das erst beim
    // Hineingehen gebaut würde, wäre ein Ruckler an genau der Stelle, an der
    // man ihn am wenigsten braucht — und die vierhundert Meter kosten nichts:
    // Was man nicht sieht, zeichnet auch niemand.
    const shop = buildWorkshop();
    this.root.add(shop.root);
    this.shop = shop;
    // Wände, Boden und Decke bekommen Körper: Ein Zimmer, aus dem man zur
    // Seite herausläuft, ist keines (`Workshop.WorkshopParts.walls`).
    for (const mesh of shop.walls) {
      mesh.updateWorldMatrix(true, false);
      this.physics?.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS });
    }

    const palette = new Palette(PALETTE_DABS);
    this.root.add(palette);
    this.palette = palette;

    const card = new PlanCard();
    card.visible = false;
    this.root.add(card);
    this.card = card;

    const sign = new TextPlane({
      width: 5,
      height: 1.5,
      title: 'Bauplatz',
      body: 'Karte von der Hüfte ziehen — sie zeigt den Grundriss von oben. Trigger führt in den Konstruktraum.',
      accent: 0x39d0ff,
    });
    sign.position.set(0, 2.6, -12.5);
    this.root.add(sign);

    this.folded = foldedMap();
    this.root.add(this.folded);

    this.rebuild();
  }

  /** Diese Welt bringt nichts zum Herumwerfen mit. */
  protected override buildProps(): void {}

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    this.restore();

    const shop = this.shop;
    if (shop) {
      ctx.pointer.add({
        object: shop.exit,
        pokeable: true,
        onSelect: () => this.leaveShop(),
      });
      // **Das Regal ist der Katalog.** Ein Tipp auf ein Musterstück nimmt es
      // in die Hand — dieselbe Bewegung wie das Eintunken an der Palette, und
      // aus demselben Grund: Man sucht sich hier etwas aus und trägt es
      // danach herum, bis man es nicht mehr braucht.
      for (const sample of shop.samples) {
        ctx.pointer.add({
          object: sample.object,
          pokeable: true,
          ignore: (hand) => hand !== null && this.cardHand === hand,
          onSelect: (hit) => this.takeThing(sample.kind, hit),
        });
      }
    }

    for (const key of this.palette?.keys() ?? []) {
      ctx.pointer.add({
        object: key.mesh,
        pokeable: true,
        // Die Hand, die die Palette trägt, zeigt nicht auf sie: Ihr eigener
        // Strahl läge sonst dauernd auf dem eigenen Brett und schluckte den
        // Trigger, mit dem sie gerade etwas anderes tut. Dasselbe gilt für die
        // Hand mit der Karte — deren Trigger gehört dem Konstruktraum.
        ignore: (hand) => hand !== null && (this.carry?.hand === hand || this.cardHand === hand),
        onSelect: (hit) => this.dip(key.id, hit),
      });
    }
    // Die Karte hängt am Gürtel, und das Level steht um einen herum: Der
    // Bauplatz macht als **Level** auf und nicht als Editor.
    this.setStage('level');
    this.markHere(ctx);
    this.drawPanel();
  }

  // --- die Hände ------------------------------------------------------------

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.handleHands(ctx);
    this.readCardTrigger(ctx);
    this.placeModel();
    this.placePalette();
    this.placePin(ctx);
    this.placeBrush(ctx);
    this.placeCard(ctx);
    this.placeThing(ctx);
  }

  /**
   * **Der Trigger an der Karte** — hinein in den Konstruktraum und wieder
   * heraus.
   *
   * Dieselbe Bedienung wie an der Drohne: Man hat das Ding in der Hand, und
   * der Trigger ist das, was es *tut*. Der Greifknopf bleibt dabei, was er
   * überall ist — er hält die Karte fest; wer loslässt, legt sie weg.
   *
   * Er wird hier gelesen und nicht über den Zeiger: Ein Zeiger braucht eine
   * Fläche, auf die er trifft, und diese Karte tut etwas, egal wohin man mit
   * ihr zeigt.
   */
  private readCardTrigger(ctx: WorldContext): void {
    const hand = this.cardHand;
    if (!hand || !this.carrying) return;
    if (!ctx.input.get(hand)?.trigger.justPressed) return;
    if (this.stageOf === 'shop') this.leaveShop();
    else this.enterShop(ctx);
  }

  /**
   * **Was die Hände tun** — in der Reihenfolge, in der es sein muss.
   *
   * Erst wird abgegeben, dann genommen, dann bewegt. Wer die Reihenfolge
   * umdreht, bekommt den Fehler, den man in der Brille nie findet: Eine Hand,
   * die im selben Bild loslässt und wieder zugreift (das passiert beim
   * Umgreifen ständig), nimmt sonst erst das Alte noch einmal und legt es
   * danach weg.
   */
  private handleHands(ctx: WorldContext): void {
    const now = new Map<Handedness, Hold>();
    const pressed = new Set<Handedness>();
    for (const hand of HANDS) {
      const controller = ctx.input.get(hand);
      if (!controller?.tracked) continue;
      now.set(hand, holdOf(controller));
      if (controller.squeeze.pressed) pressed.add(hand);
    }

    for (const hand of HANDS) {
      const piece = this.holds.get(hand);
      if (!piece) continue;
      if (pressed.has(hand) && now.has(hand)) continue;
      this.holds.delete(hand);
      this.letGo(piece, now.get(hand) ?? null);
    }

    for (const [hand, hold] of now) {
      if (this.holds.has(hand) || !pressed.has(hand)) continue;
      const controller = ctx.input.get(hand);
      if (!controller?.squeeze.justPressed) continue;
      this.takeUp(ctx, hand, hold);
    }

    this.dragModel(now);
    this.dragPalette(now);
    this.dragPin(now);
  }

  /**
   * **Zugegriffen.** Erst die Hüften — was dort hängt, holt man von dort —,
   * dann das, was in der Luft steht.
   *
   * Die Reihenfolge ist keine Kleinigkeit: Über einer Hüfte steht die Hand
   * tief, und dort schwebt beim Bauen gern auch die Palette. Wer an der Hüfte
   * greift, meint die Hüfte.
   */
  private takeUp(ctx: WorldContext, hand: Handedness, hold: Hold): void {
    const hip = this.hipAt(hold.at);
    if (hip && this.mapHip === hip) {
      this.drawMap(ctx, hand, hold);
      this.holds.set(hand, 'card');
      return;
    }
    // Alles andere gibt es nur im Konstruktraum: Eine Palette in der Hand,
    // während man durch sein fertiges Level läuft, hätte nichts, worauf sie
    // malen könnte.
    if (!this.editing) return;
    if (hip && this.paletteHip === hip) {
      this.drawPalette(hand, hold);
      return;
    }

    const piece = grabbedAt(hold.at, this.targets()) ?? this.aimedAt(ctx, hand);
    if (!piece) return;
    this.holds.set(hand, piece);
    if (piece === 'figure') {
      const at = worldToPlan(this.model, this.centre, hold.at);
      this.dragged = { x: at.x, z: at.z };
      this.pin?.setHeld(true);
    }
    ctx.input.get(hand)?.pulse(0.35, 20);
  }

  /**
   * **Losgelassen** — über einer Hüfte legt man ab, sonst bleibt es stehen.
   *
   * Das ist die eine Stelle, an der diese Dinge keine Gegenstände sind: Ein
   * Grundriss, der beim Loslassen zu Boden fällt, wäre ein Grundriss, den man
   * beim Bauen dauernd wieder aufhebt.
   */
  private letGo(piece: Piece, hold: Hold | null): void {
    if (piece === 'figure') {
      this.pin?.setHeld(false);
      this.dropPin();
      return;
    }
    const hip = hold ? this.hipAt(hold.at) : null;
    if (piece === 'card') {
      // **Die Karte geht zurück an die Hüfte**, egal wo man loslässt — sie ist
      // ein Werkzeug und kein Möbel, und ein Blatt Papier, das in der Luft
      // stehenbliebe, wäre das Erste, wogegen man im Konstruktraum stößt. Wer
      // dabei im Konstruktraum steht, bleibt darin: Hinaus geht es mit dem
      // Trigger oder über den Knopf.
      this.stowMap(hip ?? this.mapHip ?? 'left');
      return;
    }
    if (piece === 'model') {
      this.grip = null;
      // **Nur, wenn wirklich niemand mehr daran hängt.** Beim Zoomen mit zwei
      // Händen geht eine davon gern über eine Hüfte auf, während die andere
      // das Modell weiterhält — und eine Karte, die einem dabei aus der
      // zweiten Hand ins Futteral springt, ist der Fehler, den man danach
      // fünfmal wiederholt, bevor man ihn versteht.
      const alone = ![...this.holds.values()].includes('model');
      if (hip && alone) this.stowMap(hip);
      return;
    }
    this.carry = null;
    if (hip) this.stowPalette(hip);
  }

  /** Die drei Stellen, nach denen in dieser Welt gegriffen werden kann. */
  private targets(): Target<Piece>[] {
    const out: Target<Piece>[] = [];
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    // **Die Kugel um das Modell plus eine Handbreit**: Ein Grundriss ist flach,
    // und wer über ihm greift, meint ihn — genau greifen müsste man nur, wenn
    // er ein Ding wäre.
    out.push({ id: 'model', at: this.model.at, reach: (span / 2) * this.model.scale + 0.22 });
    if (this.paletteHip === null) {
      out.push({ id: 'palette', at: this.palettePose.at, reach: 0.16 });
    }
    if (this.pin) {
      this.pin.getWorldPosition(_pin);
      // Auf halber Höhe der Figur angefasst, mit einer knappen Reichweite:
      // Sie steht mitten im Modell, und eine großzügige Blase um sie herum
      // wäre eine, die jeden Griff in ihre Kachel verschluckt.
      out.push({
        id: 'figure',
        at: { x: _pin.x, y: _pin.y + 0.9 * this.model.scale, z: _pin.z },
        reach: Math.max(0.05, 2.4 * this.model.scale),
      });
    }
    return out;
  }

  /**
   * **Das Modell auf Entfernung** — worauf diese Hand zeigt, wenn in ihrer
   * Nähe nichts liegt.
   *
   * Der Grund ist die Werkstatt: Das Modell steht auf der Bank, und man steht
   * davor, daneben oder am Regal. Ein Grundriss, den man nur anfassen kann,
   * wenn man mit der Hand hineinfaßt, ist einer, für den man erst hingehen
   * muß — und wer hingeht, verliert dabei den Blick, den er gerade auf ihn
   * hatte. Also: hinzielen und zugreifen, und zwar aus jeder Entfernung.
   *
   * Gerechnet wird gegen die **Kugel** um das Modell und nicht gegen seine
   * Quader. Ein Grundriss ist überwiegend Luft; wer die Wände treffen müßte,
   * zielte durch sein eigenes Zimmer hindurch ins Leere.
   *
   * Nur das Modell, und das mit Absicht: Palette und Figur sind kleine Dinge,
   * und ein Strahl, der sie auf zehn Meter mitnähme, nähme sie einem aus der
   * Hand, sobald man daran vorbeizielt.
   */
  private aimedAt(ctx: WorldContext, hand: Handedness): Piece | null {
    if (!this.editing) return null;
    const controller = ctx.input.get(hand);
    if (!controller?.tracked) return null;
    controller.getRay(_ray);
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    _sphere.center.set(this.model.at.x, this.model.at.y, this.model.at.z);
    _sphere.radius = (span / 2) * this.model.scale + 0.22;
    return _ray.intersectsSphere(_sphere) ? 'model' : null;
  }

  /** Über welcher Hüfte diese Hand steht — `null`, wenn über keiner. */
  private hipAt(spot: Spot): Handedness | null {
    const host = this.host;
    if (!host) return null;
    const hips: Target<Handedness>[] = [];
    for (const side of HANDS) {
      const slot = host.beltSlot(side);
      if (!slot) continue;
      slot.getWorldPosition(_hip);
      hips.push({ id: side, at: { x: _hip.x, y: _hip.y, z: _hip.z }, reach: HIP_REACH });
    }
    return grabbedAt(spot, hips);
  }

  /**
   * **Das Modell in den Händen** — eine trägt, zwei drehen und ziehen größer.
   *
   * Gerechnet wird gegen den Stand beim Zugreifen und nicht gegen das letzte
   * Bild (`miniature.ts`); und sobald eine Hand dazukommt oder loslässt, wird
   * neu angesetzt. Ohne das Neuansetzen macht die zweite Hand im Augenblick
   * ihres Zugreifens einen Sprung — sie war ja vorher nicht dabei.
   */
  private dragModel(now: ReadonlyMap<Handedness, Hold>): void {
    const hands = HANDS.filter((hand) => this.holds.get(hand) === 'model' && now.has(hand));
    if (hands.length === 0) {
      this.grip = null;
      return;
    }
    const grip = this.grip;
    if (!grip || grip.hands.length !== hands.length || grip.hands.some((h, i) => h !== hands[i])) {
      this.grip = { hands, from: hands.map((hand) => now.get(hand)!), start: this.model };
      return;
    }
    this.model =
      hands.length >= 2
        ? grabTwo(
            grip.start,
            this.centre,
            grip.from[0]!,
            grip.from[1]!,
            now.get(hands[0]!)!,
            now.get(hands[1]!)!,
          )
        : grabOne(grip.start, grip.from[0]!, now.get(hands[0]!)!);
  }

  /** Die Palette wird nur getragen: eine Hand, starr, ohne Maßstab. */
  private dragPalette(now: ReadonlyMap<Handedness, Hold>): void {
    const hand = HANDS.find((side) => this.holds.get(side) === 'palette' && now.has(side));
    if (!hand) {
      this.carry = null;
      return;
    }
    const carry = this.carry;
    if (!carry || carry.hand !== hand) {
      this.carry = { hand, from: now.get(hand)!, start: this.palettePose };
      return;
    }
    this.palettePose = carryPose(carry.start, carry.from, now.get(hand)!);
  }

  /**
   * **Die Figur durch die Miniatur ziehen.**
   *
   * Gerechnet wird in Planmetern: Wo die Hand ist, ist die Figur — und der
   * Boden bleibt der Boden, denn eine Spielfigur, die man an der Decke
   * absetzen kann, ist keine.
   */
  private dragPin(now: ReadonlyMap<Handedness, Hold>): void {
    const hand = HANDS.find((side) => this.holds.get(side) === 'figure' && now.has(side));
    if (!hand) return;
    const at = worldToPlan(this.model, this.centre, now.get(hand)!.at);
    this.dragged = { x: at.x, z: at.z };
  }

  /**
   * Abgesetzt: Auf einer Kachel steht die Marke dann dort — daneben nicht.
   *
   * Versetzt wird die **Marke** und nicht der Spieler, und das ist der
   * Unterschied zur ersten Fassung: Wer im Konstruktraum die Figur verschiebt,
   * will sagen, wo er beim Zurückgehen stehen soll — und nicht mitten im
   * Arbeiten quer durch die Welt gerissen werden. Auf eine Kachel, die es
   * nicht gibt, wird nichts gesetzt: Dort wäre der nächste Schritt ein Sturz.
   */
  private dropPin(): void {
    const dragged = this.dragged;
    this.dragged = null;
    if (!dragged) return;
    const spot = spotAt(dragged.x, dragged.z);
    if (!this.plan.has(spot.tile)) {
      this.announce('Da ist kein Boden — die Marke bleibt, wo sie war');
      return;
    }
    const at = this.plan.worldOf(spot.tile);
    this.mark = { x: at.x, y: at.y, z: at.z, yaw: this.mark.yaw };
    this.announce('Dort tauchst du auf, wenn du zurückgehst');
  }

  // --- wo alles hängt -------------------------------------------------------

  /**
   * Das Modell an seinen Platz.
   *
   * Eine Tafel mit Knöpfen hing hier lange an seiner Vorderkante — *Zu mir*,
   * *Größer*, *Kleiner*, *Drehen*, *Weglegen*. Sie ist weg, und was sie konnte,
   * kann man ohne sie besser: Größer und kleiner macht man mit zwei Händen,
   * gedreht wird mit zweien ebenso, herangeholt wird es, indem man hinzielt
   * und zugreift (`aimedAt`) — und weglegen tut man die Karte, nicht das
   * Modell. Was übrig blieb, steht im Menü, für den flachen Modus ohne Hände.
   */
  private placeModel(): void {
    _turn.set(this.model.turn.x, this.model.turn.y, this.model.turn.z, this.model.turn.w);
    this.mini.position.set(this.model.at.x, this.model.at.y, this.model.at.z);
    this.mini.quaternion.copy(_turn);
    this.mini.scale.setScalar(this.model.scale);
  }

  /** Die Palette dorthin, wo sie schwebt — es sei denn, sie hängt an der Hüfte. */
  private placePalette(): void {
    const palette = this.palette;
    if (!palette || this.paletteHip !== null) return;
    palette.position.set(this.palettePose.at.x, this.palettePose.at.y, this.palettePose.at.z);
    palette.quaternion.set(
      this.palettePose.turn.x,
      this.palettePose.turn.y,
      this.palettePose.turn.z,
      this.palettePose.turn.w,
    );
  }

  /**
   * Die Figur auf ihre Kachel — dorthin, wo man wirklich steht, oder dorthin,
   * wo die ziehende Hand sie gerade hält.
   *
   * Sie hängt **in** der Miniatur und wird deshalb in Planmetern gestellt: Der
   * Maßstab kommt von der Gruppe, und damit ist sie bei jedem Zoom so groß wie
   * ein Mensch im Grundriss.
   */
  private placePin(ctx: WorldContext): void {
    // **Solange man im Level ist, läuft die Marke mit.** Erst im
    // Konstruktraum steht sie still — dort ist sie die Auskunft, und was sich
    // dort bewegt, ist die Werkstatt und nicht das Level.
    if (this.stageOf !== 'shop') this.markHere(ctx);

    const pin = this.pin;
    if (!pin) return;
    if (this.dragged) {
      pin.position.set(this.dragged.x - this.centre.x, 0.2, this.dragged.z - this.centre.z);
      return;
    }
    pin.position.set(this.mark.x - this.centre.x, 0, this.mark.z - this.centre.z);
    pin.rotation.set(0, this.mark.yaw, 0);
  }

  /**
   * Der Pinsel in die Hand, die ihn geholt hat — auf den Zeigestrahl, wie
   * jedes Werkzeug dieses Projekts (`portal/tools/aim.ts`).
   *
   * Er wird gestellt und nicht angehängt: Die Hände gehören dem Rig, die
   * Palette dieser Welt, und ein Pinsel, der zwischen beiden hin- und
   * herwandert, ist ein Elternteil, den man beim Aufräumen vergisst.
   */
  private placeBrush(ctx: WorldContext): void {
    const palette = this.palette;
    if (!palette) return;
    palette.brush.visible = this.editing;
    const hand = this.brush === null ? null : this.brushHand;
    const controller = hand ? ctx.input.get(hand) : null;
    if (!controller?.tracked || !this.editing) {
      // Keine Hand, kein Pinsel in der Hand: Er steckt wieder in seiner Mulde.
      // Das ist auch die Selbstheilung für den Fall, dass eine Hand mitten im
      // Malen aus dem Tracking fällt — sonst bliebe der Pinsel dort in der
      // Luft stehen, wo sie zuletzt war.
      if (palette.brush.parent !== palette) palette.stow();
      return;
    }
    if (palette.brush.parent !== this.root) palette.release(this.root);
    controller.getRay(_ray);
    _at.copy(_ray.origin).addScaledVector(_ray.direction, 0.04);
    this.root.worldToLocal(_at);
    palette.brush.position.copy(_at);
    controller.targetRay.getWorldQuaternion(_turn);
    this.root.getWorldQuaternion(_lean).invert();
    palette.brush.quaternion.copy(_lean).multiply(_turn);
  }

  /**
   * **Die Karte in der Hand** — gehalten wie ein Blatt, das man liest.
   *
   * Sie liegt auf dem Zeigestrahl wie jedes Werkzeug dieses Projekts
   * (`portal/tools/aim.ts`), aber sie zeigt nicht nach vorn, sondern nach
   * oben: Eine Karte hält man waagerecht vor sich. Die `TILT` kippt ihre
   * Fläche der Nasenspitze entgegen — ohne sie sieht man mit ausgestrecktem
   * Arm eine Kante und keine Karte.
   */
  private placeCard(ctx: WorldContext): void {
    const card = this.card;
    if (!card) return;
    const hand = this.cardHand;
    const controller = hand && this.carrying ? ctx.input.get(hand) : null;
    if (!controller?.tracked) {
      card.visible = false;
      return;
    }
    card.visible = true;

    controller.getRay(_ray);
    _at.copy(_ray.origin).addScaledVector(_ray.direction, CARD_AHEAD);
    this.root.worldToLocal(_at);
    card.position.copy(_at);
    controller.targetRay.getWorldQuaternion(_turn);
    this.root.getWorldQuaternion(_lean).invert();
    card.quaternion.copy(_lean).multiply(_turn).multiply(_tilt.setFromAxisAngle(_right, CARD_TILT));

    card.draw(this.planShapes, this.things, this.bounds, this.mark, this.mapKey());
  }

  /** Woran die Karte erkennt, dass sich am Gezeichneten etwas geändert hat. */
  private mapKey(): string {
    return `${this.plan.version}:${this.thingsVersion}`;
  }

  // --- die Musterstücke vom Regal -------------------------------------------

  /**
   * **Ein Musterstück in die Hand** — und damit den Pinsel aus ihr heraus.
   *
   * Beides zugleich ginge nicht: Ein Tipp auf die Miniatur tut genau eine
   * Sache, und ob das eine Wand ist oder eine Kiste, entscheidet sich hier und
   * nicht dort.
   */
  private takeThing(kind: PropKind, hit: PointerHit): void {
    if (!this.editing) return;
    this.brush = null;
    this.brushHand = null;
    this.palette?.stow();
    this.thing = kind;
    this.thingHand = hit.hand ?? this.thingHand ?? 'right';
    this.showThing(kind);
    this.drawPanel();
    this.drawGhost();
    this.announce(`${PROP_LABELS[kind]} in der Hand — auf eine Kachel tippen`);
  }

  /** Das Musterstück wieder weglegen. */
  private putThingBack(): void {
    this.thing = null;
    this.thingHand = null;
    this.showThing(null);
  }

  /**
   * Die Vorschau in der Hand bauen — oder wegräumen.
   *
   * Sie ist ein **echtes Exemplar** und kein Symbol: dieselbe Geometrie, die
   * gleich im Level steht (`createPropShape`). Deshalb sieht man in der Hand
   * wirklich, was man setzt, und nicht nur, wie es heißt.
   */
  private showThing(kind: PropKind | null): void {
    if (this.thingView) {
      disposeTree(this.thingView);
      this.thingView = null;
    }
    if (!kind) return;
    const view = new THREE.Group();
    view.name = `thing-preview:${kind}`;
    view.add(createPropShape(kind).mesh);
    this.root.add(view);
    this.thingView = view;
  }

  /**
   * **Wie groß es in der Miniatur wäre** — die Vorschau in der Hand trägt den
   * Maßstab des Modells.
   *
   * Das ist die eigentliche Auskunft: Ein Klotz, den man in Lebensgröße in der
   * Hand hielte, sagt nichts darüber, ob er in den Gang paßt, den man gerade
   * gebaut hat. In Miniaturgröße hält man ihn neben den Gang und sieht es.
   */
  private placeThing(ctx: WorldContext): void {
    const view = this.thingView;
    if (!view) return;
    const hand = this.thingHand;
    const controller = hand ? ctx.input.get(hand) : null;
    if (!controller?.tracked || !this.editing) {
      view.visible = false;
      return;
    }
    view.visible = true;
    controller.getRay(_ray);
    _at.copy(_ray.origin).addScaledVector(_ray.direction, 0.09);
    this.root.worldToLocal(_at);
    view.position.copy(_at);
    view.scale.setScalar(this.model.scale);
    controller.targetRay.getWorldQuaternion(_turn);
    this.root.getWorldQuaternion(_lean).invert();
    view.quaternion.copy(_lean).multiply(_turn);
  }

  // --- Karte und Palette an der Hüfte ---------------------------------------

  /**
   * **Die Karte ziehen** — und damit das Bearbeiten aufmachen.
   *
   * Sie entsteht dort, wo die Hand ist, und liegt sofort darin: Ein Modell,
   * das beim Ziehen erst vor den Kopf springt, während die Hand noch an der
   * Hüfte steht, ist eines, dem man hinterherfasst. Der Maßstab kommt aus der
   * Größe des Plans, die Richtung aus dem Blick — sein Norden liegt vorn.
   */
  private drawMap(ctx: WorldContext, hand: Handedness, _hold: Hold): void {
    this.mapHip = null;
    this.cardHand = hand;
    if (this.folded) this.folded.visible = false;
    // **Wer im Konstruktraum nach der Karte greift, bleibt darin.** Sie ist
    // dort der zweite Weg hinaus (der erste ist der grüne Knopf), und ein
    // Griff an die Hüfte, der einen unversehens ins Level zurückstellte, wäre
    // das Gegenteil davon.
    if (this.stageOf === 'level') this.setStage('map');
    else if (this.card) this.card.visible = true;
    ctx.input.get(hand)?.pulse(0.5, 30);
    this.announce(
      this.stageOf === 'shop'
        ? 'Karte in der Hand — Trigger führt zurück ins Level'
        : 'Karte in der Hand — Trigger führt in den Konstruktraum',
    );
  }

  private drawPalette(hand: Handedness, hold: Hold): void {
    const palette = this.palette;
    if (!palette) return;
    this.paletteHip = null;
    this.root.add(palette);
    palette.visible = true;
    palette.scale.setScalar(1);
    this.palettePose = { at: { ...hold.at }, turn: { ...hold.turn } };
    this.holds.set(hand, 'palette');
    this.carry = { hand, from: hold, start: this.palettePose };
  }

  /**
   * **Die Karte weglegen** — und damit wieder in seinem Level stehen.
   *
   * Zusammengefaltet hängt sie an der Hüfte, an der die Hand sie losgelassen
   * hat. Wo man dabei steht, entscheidet die Figur: Wer sie vorher versetzt
   * hat, steht schon dort, denn versetzt wird sofort und nicht erst hier.
   */
  private stowMap(side: Handedness): void {
    this.mapHip = side;
    this.cardHand = null;
    if (this.card) this.card.visible = false;
    if (this.stageOf === 'map') this.setStage('level');
    this.foldMap();
    this.announce(
      this.stageOf === 'shop' ? 'Karte an der Hüfte' : 'Karte weg — du stehst in deinem Level',
    );
  }

  private stowPalette(side: Handedness): void {
    const palette = this.palette;
    if (!palette) return;
    this.paletteHip = side;
    const slot = this.host?.beltSlot(side);
    if (!slot) {
      // Keine Hüfte da (flacher Modus ohne Gürtel): dann schwebt sie eben
      // weiter, statt in den Ursprung der Welt zu fallen.
      this.paletteHip = null;
      return;
    }
    slot.add(palette);
    palette.position.set(0, 0, 0);
    palette.quaternion.identity();
    // Klein genug, dass sie an der Hüfte nicht im Weg steht, groß genug, dass
    // man sieht, was für ein Ding dort hängt.
    palette.scale.setScalar(0.6);
  }

  /**
   * **Wo man ist** — und was daran hängt.
   *
   * Die halbe Welt schaltet sich hier um, und dass es nur *eine* Stelle ist,
   * ist der Grund, warum man sie noch versteht: Miniatur, Palette, Zeigefläche
   * und Karte gehören zusammen, und ein Zustand, der sich an vier Stellen
   * einzeln einstellt, ist einer, von dem irgendwann drei stimmen.
   *
   * Das **Level bleibt stehen**, immer — sichtbar und fest. Es steht
   * vierhundert Meter von der Werkstatt entfernt und ist damit niemandem im
   * Weg; und wer aus der Werkstatt zurückkommt, kommt in ein Zimmer, das
   * inzwischen niemand abgebaut hat.
   */
  private setStage(next: Stage): void {
    this.stageOf = next;
    const shop = next === 'shop';

    this.mini.visible = shop;
    if (this.palette) this.palette.visible = shop || this.paletteHip !== null;
    // Der Zeiger fragt jedes Ziel nach seiner **eigenen** Sichtbarkeit und
    // nicht nach der seiner Eltern: Eine versteckte Palette, deren Näpfe noch
    // sichtbar sind, fängt weiter jeden Strahl.
    for (const key of this.palette?.keys() ?? []) key.mesh.visible = shop;
    if (this.aimed) this.aimed.visible = shop;
    if (this.card) this.card.visible = next !== 'level';
    if (this.folded) this.folded.visible = this.mapHip !== null;

    if (shop) return;

    this.spot = null;
    this.drawGhost();
    this.grip = null;
    this.carry = null;
    this.dragged = null;
    // **Die Karte bleibt in der Hand**, alles andere nicht: Wer aus dem
    // Konstruktraum herauskommt, hat sie ja gerade dazu benutzt — und eine
    // Karte, die einem beim Hinausgehen aus der Hand fällt, ist eine, mit der
    // man nicht wieder hineinkommt.
    for (const [hand, piece] of [...this.holds]) {
      if (piece !== 'card') this.holds.delete(hand);
    }
    // **Wer den Konstruktraum verlässt, räumt auch die Palette weg** — auf die
    // Hüfte, an der sie hing, sonst auf die freie. Eine Palette, die weiter im
    // Raum schwebte, während man wieder durch sein Level läuft, wäre ein
    // Brett, gegen das man auf dem Rückweg stößt.
    this.stowPalette(this.paletteHip ?? other(this.mapHip ?? 'left'));
    if (this.palette) this.palette.visible = this.paletteHip !== null;
    this.putThingBack();
    if (next === 'level') this.foldMap();
  }

  /**
   * **In den Konstruktraum.**
   *
   * Erst die Marke — wo man steht, gilt ab jetzt als die Stelle, an der man
   * wiederkommt —, dann das Modell auf die Bank, dann man selbst hinüber. Die
   * Reihenfolge ist keine Kleinigkeit: Wer sich zuerst versetzt, merkt sich
   * anschließend die Werkbank als seinen Platz im Level.
   */
  private enterShop(ctx: WorldContext): void {
    if (this.stageOf === 'shop') return;
    this.markHere(ctx);
    this.setStage('shop');
    this.model = clampModel({
      at: { x: MODEL_OVER.x, y: MODEL_OVER.y, z: MODEL_OVER.z },
      turn: yawTurn(0),
      scale: this.fitScale(),
    });
    this.grip = null;
    this.placeModel();
    this.movePlayerTo(ctx, _target.copy(WORKSHOP_SPAWN), WORKSHOP_YAW);
    this.announce('Konstruktraum — die Figur zeigt, wo du wieder auftauchst');
  }

  /** Und wieder heraus: dorthin, wo die Marke steht. */
  private leaveShop(): void {
    const ctx = this.context;
    if (!ctx || this.stageOf !== 'shop') return;
    this.setStage(this.cardHand ? 'map' : 'level');
    this.movePlayerTo(ctx, _target.set(this.mark.x, this.mark.y, this.mark.z), this.mark.yaw);
    this.announce('Zurück im Level');
  }

  /**
   * Die Marke dorthin, wo man gerade steht.
   *
   * Jedes Bild, solange man im Level ist — dadurch zeigt die Karte in der Hand
   * einen laufenden Pfeil und keine alte Notiz. Im Konstruktraum steht sie
   * still: Dort *ist* sie die Auskunft, und was sich dort bewegt, ist die
   * Werkstatt und nicht das Level.
   */
  private markHere(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);
    ctx.rig.getHeadForward(_forward);
    this.mark = {
      x: _head.x,
      y: ctx.rig.getFloorY(),
      z: _head.z,
      yaw: Math.atan2(-_forward.x, -_forward.z),
    };
  }

  /** Die zusammengefaltete Karte an die Hüfte hängen, an der sie hängt. */
  private foldMap(): void {
    const folded = this.folded;
    const side = this.mapHip;
    if (!folded) return;
    folded.visible = side !== null;
    if (!side) return;
    const slot = this.host?.beltSlot(side);
    if (!slot) return;
    slot.add(folded);
    folded.position.set(0, 0, 0);
    folded.quaternion.identity();
  }

  /**
   * Die Körper der Lebensgröße anmelden.
   *
   * Es sind dieselben Netze wie eben — nur ihre Anmeldung bei der Physik kommt
   * dazu. Neu bauen müsste sie niemand, und wer es täte, hätte beim dritten
   * Umschalten drei Sätze Wände übereinander.
   *
   * Herausgenommen wurden sie früher beim Bearbeiten, weil man dabei mitten im
   * eigenen Level stand. Das ist vorbei: Gebaut wird im Konstruktraum, und das
   * Level bleibt fest — eine Wand, die durchlässig wäre, während niemand
   * hinsieht, wäre eine, durch die beim Zurückkommen jemand fällt.
   */
  private setStageSolid(): void {
    const physics = this.physics;
    if (!physics || this.built.length > 0) return;
    for (const mesh of this.stage.children) {
      mesh.updateMatrixWorld(true);
      this.built.push(physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS }));
    }
  }

  /** Der Maßstab, in dem der ganze Plan in die Armspanne passt. */
  private fitScale(): number {
    const span = Math.max(
      1,
      this.bounds.maxX - this.bounds.minX,
      this.bounds.maxZ - this.bounds.minZ,
    );
    return Math.max(SCALE_MIN, Math.min(SCALE_MAX, 1.1 / span));
  }

  /** Das Modell vor den Kopf holen — und dabei wieder flach legen. */
  private bring(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);
    // Der Gierwinkel kommt aus der **Blickrichtung** und nicht aus der Lage des
    // Rigs: In der Brille dreht man den Kopf, ohne dass sich das Rig bewegt,
    // und ein Modell, das dann hinter einem auftaucht, ist verloren.
    ctx.rig.getHeadForward(_forward);
    const yaw = Math.atan2(-_forward.x, -_forward.z);
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    this.model = bringNear({ x: _head.x, y: _head.y, z: _head.z }, yaw, Math.max(1, span));
    this.grip = null;
    this.placeModel();
  }

  // --- zeigen und bauen -----------------------------------------------------

  /**
   * **Worauf der Zeiger liegt**, in Planmetern.
   *
   * Umgerechnet über die **Gruppe** und nicht über `miniature.ts`, obwohl
   * beides dasselbe rechnet: Die Gruppe ist das, was man wirklich sieht, und
   * eine Vorschau, die gegen eine zweite Rechnung prüft, liegt irgendwann um
   * die Differenz daneben. Dass die beiden übereinstimmen, hält
   * `miniatureFrame.test.ts` fest.
   */
  private aim(point: THREE.Vector3 | null): void {
    if (!point || !this.editing) {
      this.spot = null;
      this.drawGhost();
      return;
    }
    _local.copy(point);
    this.mini.worldToLocal(_local);
    this.spot = spotAt(_local.x + this.centre.x, _local.z + this.centre.z);
    this.drawGhost();
  }

  /** Der Druck: was das Werkzeug an dieser Stelle tut. */
  private press(): void {
    const spot = this.spot;
    if (!spot || !this.editing) return;
    // **Erst das Ding in der Hand.** Wer ein Musterstück vom Regal geholt hat,
    // will es hinstellen und nicht eine Wand bauen — und er hat dafür gerade
    // den Pinsel weggelegt.
    if (this.thing) {
      this.dropThing(spot);
      return;
    }
    if (this.brush === null) {
      this.announce('Erst an der Palette eintunken oder etwas vom Regal nehmen');
      return;
    }
    if (this.brush === 'go') {
      this.stepInto(spot);
      return;
    }
    if (this.brush === 'erase' && this.eraseThing(spot)) return;
    const before = planCentre(this.plan);
    const edit = applyTool(this.plan, this.brush, spot);
    if (!edit.changed) return;
    // Die Mitte des Plans wandert beim Anbauen — das Modell soll trotzdem
    // stehen bleiben (`recentre`).
    const after = planCentre(this.plan);
    this.model = recentre(this.model, before, after);
    this.centre = after;
    // Und der Griff, mit dem es gerade in der Hand liegt, ebenso: Er rechnet
    // gegen den Stand beim Zugreifen, und der stand noch auf der alten Mitte.
    if (this.grip) this.grip.start = recentre(this.grip.start, before, after);
    this.rebuild();
    this.store();
    this.announce(edit.says);
  }

  /**
   * **Hingehen** — auf eine Kachel der Miniatur tippen und dort stehen.
   *
   * Der Grund, warum ein Tischmodell mehr ist als eine Zeichnung: Es ist
   * gleichzeitig die Karte *und* der Weg dorthin. Wer den Gang am anderen Ende
   * gebaut hat, muss ihn nicht ablaufen, um nachzusehen, ob er zu eng ist — er
   * tippt hinein und steht darin. Dieselbe Auskunft gibt die Figur, nur
   * andersherum: Die eine zeigt, wo man steht, das andere sagt, wohin.
   */
  private stepInto(spot: PlanSpot): void {
    if (!this.plan.has(spot.tile)) {
      this.announce('Da ist kein Boden');
      return;
    }
    const at = this.plan.worldOf(spot.tile);
    this.mark = { x: at.x, y: at.y, z: at.z, yaw: this.mark.yaw };
    this.announce('Dort tauchst du auf, wenn du zurückgehst');
  }

  // --- Gegenstände in den Grundriss -----------------------------------------

  /**
   * **Ein Ding auf eine Kachel stellen.**
   *
   * Auf die **Kachelmitte** und auf den **Boden** — die beiden einzigen
   * Entscheidungen, die diese Welt einem abnimmt, und beide aus demselben
   * Grund: In einer Miniatur von Streichholzgröße trifft niemand einen
   * Zentimeter, und niemand stellt dort eine Höhe ein. Wer es genauer haben
   * will, geht in sein Level und schiebt es dort hin; dort ist es ein
   * Gegenstand wie jeder andere.
   *
   * Auf eine Kachel, die es nicht gibt, wird nichts gestellt: Das Ding fiele
   * ins Nichts.
   */
  private dropThing(spot: PlanSpot): void {
    const kind = this.thing;
    if (!kind) return;
    if (!this.plan.has(spot.tile)) {
      this.announce('Da ist kein Boden — erst eine Kachel legen');
      return;
    }
    const x = tileCentreX(spot.tile);
    const z = tileCentreZ(spot.tile);
    addProp(this.things, kind, x, z);
    this.thingsChanged();
    this.announce(`${PROP_LABELS[kind]} steht`);
  }

  /**
   * Das Löschwerkzeug nimmt zuerst weg, was **auf** der Kachel steht.
   *
   * `true`, wenn dabei etwas wegging — dann bleibt die Kachel selbst liegen.
   * Andersherum wäre es eine Falle: Wer die Kiste treffen will und die Kachel
   * darunter löscht, verliert beides auf einmal.
   */
  private eraseThing(spot: PlanSpot): boolean {
    if (spot.dir !== null) return false;
    const near = propNear(this.things, tileCentreX(spot.tile), tileCentreZ(spot.tile), TILE / 2);
    if (!near) return false;
    dropProp(this.things, near.id);
    this.thingsChanged();
    this.announce(`${PROP_LABELS[near.kind]} weg`);
    return true;
  }

  /**
   * Die Liste hat sich geändert: Lebensgröße neu aufstellen, Miniatur neu
   * bauen, speichern.
   *
   * Der Neubau der Miniatur läuft über `rebuild(true)` — sie wird ohnehin an
   * einem Stück gebaut, und ein Editor, der einzelne Kisten nachpflegt, ist
   * genau der, in dem nach dem dreißigsten Handgriff eine zu viel steht.
   */
  private thingsChanged(): void {
    this.thingsVersion++;
    this.rebuildThings();
    this.rebuild(true);
    this.store();
  }

  /**
   * **Die Gegenstände in Lebensgröße** — als richtige Körper, die man
   * anfassen, werfen und umstoßen kann.
   *
   * Sie stehen dort, wo sie gesetzt wurden, und nicht dort, wo sie zuletzt
   * hingerollt sind: Wer die Liste ändert, stellt sie neu auf. Das ist die
   * ehrliche Fassung von „was im Grundriss steht" — die Liste ist der
   * Grundriss, und das Zimmer ist nur, was gerade daraus gebaut ist.
   */
  private rebuildThings(): void {
    for (const entry of this.thingBodies.values()) this.removeProp(entry, false);
    this.thingBodies.clear();
    const physics = this.physics;
    if (!physics) return;
    for (const thing of this.things) {
      const blueprint = createPropShape(thing.kind);
      const mesh = blueprint.mesh;
      mesh.position.set(thing.x, standingY(blueprint.halfExtents.y), thing.z);
      mesh.rotation.y = thing.yaw;
      this.root.add(mesh);
      mesh.updateMatrixWorld(true);
      const entry = physics.addDynamic(mesh, {
        shape: blueprint.shape,
        halfExtents: blueprint.halfExtents,
        mass: blueprint.mass,
        friction: 0.7,
        restitution: 0.05,
      });
      this.registerProp(entry, `plan-${thing.id}`);
      this.thingBodies.set(thing.id, entry);
    }
  }

  /** Die Vorschau unter dem Zeiger — eine Kachel oder ein Wandstück. */
  private drawGhost(): void {
    const tile = this.ghostTile;
    const edge = this.ghostEdge;
    if (!tile || !edge) return;
    // Beim Hingehen zählt die **Kachel** und nie eine Kante: Man stellt sich
    // auf einen Boden und nicht in eine Wand.
    // Das Musterstück in der Hand zeigt immer auf die **Kachel**: Es steht
    // darauf, es hängt nicht an ihrer Kante.
    const brush = this.thing ? 'thing' : this.brush;
    const spot =
      this.spot && brush
        ? brush === 'go' || brush === 'thing'
          ? { tile: this.spot.tile, dir: null }
          : aimOf(brush, this.spot)
        : null;
    tile.visible = false;
    edge.visible = false;
    if (!spot || !brush) return;

    const colour =
      brush === 'thing' ? THING_COLOR : brush === 'go' ? GO_COLOR : planToolSpec(brush).accent;
    if (spot.dir === null) {
      tile.visible = true;
      (tile.material as THREE.MeshBasicMaterial).color.setHex(colour);
      tile.position.set(
        tileCentreX(spot.tile) - this.centre.x,
        0.04,
        tileCentreZ(spot.tile) - this.centre.z,
      );
      return;
    }
    const at = edgeAt(spot.tile, spot.dir);
    edge.visible = true;
    (edge.material as THREE.MeshBasicMaterial).color.setHex(colour);
    edge.position.set(at.x - this.centre.x, PLAN_WALL_H / 2, at.z - this.centre.z);
    edge.scale.set(at.alongX ? 1 : 0.16, 1, at.alongX ? 0.16 : 1);
  }

  // --- die Palette ----------------------------------------------------------

  /**
   * **Eintunken** — oder den Pinsel zurücklegen.
   *
   * Die Hand, die eintunkt, bekommt den Pinsel: Wer mit rechts in die Farbe
   * fasst, malt mit rechts. Alles andere müsste man sich merken.
   */
  private dip(id: string, hit: PointerHit): void {
    if (!this.editing) return;
    if (id === Palette.REST) {
      this.brush = null;
      this.brushHand = null;
      this.putThingBack();
      this.palette?.stow();
      this.announce('Pinsel zurück — jetzt baut ein Tipp nichts mehr');
    } else {
      this.brush = id as PlanTool | 'go';
      this.brushHand = hit.hand ?? this.brushHand;
      // Ein Pinsel und ein Musterstück in derselben Hand wären zwei Antworten
      // auf dieselbe Frage; wer eintunkt, legt das Musterstück zurück.
      this.putThingBack();
      this.announce(
        id === 'go'
          ? 'Auf eine Kachel tippen — dort tauchst du auf, wenn du zurückgehst'
          : planToolSpec(id).sub,
      );
    }
    this.drawPanel();
    this.drawGhost();
  }

  // --- Karte holen und weglegen, ohne Hände ---------------------------------

  /**
   * Die Karte weglegen, ohne eine Hüfte zu treffen — für den flachen Modus, in
   * dem es keine Hände gibt, die etwas an einen Gürtel halten könnten.
   */
  private putMapAway(): void {
    if (this.stageOf === 'shop') this.leaveShop();
    this.mapHip = this.mapHip ?? 'left';
    this.cardHand = null;
    this.setStage('level');
    this.announce('Karte weg — du stehst wieder in deinem Level');
  }

  /** Und der Weg in den Konstruktraum, wenn keine Hand danach greifen kann. */
  private takeMapOut(ctx: WorldContext): void {
    if (this.editing) return;
    this.mapHip = null;
    this.setStage('map');
    this.enterShop(ctx);
  }

  /** Alle Türen auf oder alle zu — in der Karte und im Gebauten zugleich. */
  private swingDoors(): void {
    const ids = [...this.plan.doorIds()];
    if (ids.length === 0) {
      this.announce('Noch keine Tür im Plan');
      return;
    }
    const shut = ids.some((id) => this.plan.door(id)?.open === true);
    for (const id of ids) this.plan.setDoor(id, { open: !shut });
    this.rebuild();
    this.store();
    this.announce(shut ? 'Alle Türen zu' : 'Alle Türen auf');
  }

  private reset(): void {
    replacePlan(this.plan, starterPlan());
    this.centre = planCentre(this.plan);
    this.things.length = 0;
    this.thingsVersion++;
    this.rebuildThings();
    this.rebuild(true);
    this.store();
    this.announce('Von vorn');
  }

  /**
   * Was die Palette gerade anzeigt.
   *
   * Ein Musterstück in der Hand steht mit darauf, obwohl es nicht von ihr
   * kommt: Sie ist die eine Stelle, an der man abliest, was ein Tipp auf die
   * Miniatur tut — und „ein Kegel“ ist darauf eine so gute Antwort wie „eine
   * Wand“. Ein Napf leuchtet dabei nicht, denn es liegt in keinem.
   */
  private drawPanel(): void {
    if (this.thing) {
      this.palette?.setActive(null, PROP_LABELS[this.thing], THING_COLOR);
      return;
    }
    const brush = this.brush;
    const spec = brush === null ? null : brush === 'go' ? GO_SPEC : planToolSpec(brush);
    this.palette?.setActive(
      brush ?? Palette.REST,
      spec ? spec.label : 'Pinsel liegt',
      spec ? spec.accent : 0x8892a6,
    );
  }

  // --- bauen ----------------------------------------------------------------

  /**
   * **Alles neu, aus einer Liste.**
   *
   * Ein Editor, der einzelne Kacheln nachpflegt, ist einer, in dem nach dem
   * dreißigsten Handgriff ein Brett zu viel steht. Bei ein paar hundert
   * Quadern kostet ein vollständiger Neubau nichts, und er kann nicht
   * auseinanderlaufen.
   */
  private rebuild(force = false): void {
    if (!force && this.builtVersion === this.plan.version) return;
    this.builtVersion = this.plan.version;
    this.bounds = planBounds(this.plan);

    for (const entry of this.built) this.physics?.remove(entry);
    this.built.length = 0;
    clear(this.stage);
    clear(this.mini);

    const solids = planSolids(this.plan);
    this.planShapes = solids;
    for (const solid of solids) {
      const mesh = box(solid, this.materialFor(solid.kind));
      this.stage.add(mesh);
      mesh.updateMatrixWorld(true);
    }
    // **Das Level bleibt fest**, auch während gebaut wird: Gebaut wird jetzt
    // im Konstruktraum, vierhundert Meter entfernt, und eine Wand, die dort
    // durchlässig wäre, wäre eine, durch die beim Zurückkommen jemand fällt.
    this.setStageSolid();

    this.buildMini(solids);
  }

  private materialFor(kind: PlanSolid['kind']): THREE.Material {
    if (kind === 'floor') return this.floorMat;
    if (kind === 'door') return this.doorMat;
    return this.wallMat;
  }

  /**
   * Dasselbe klein — plus, was nur die Miniatur hat: eine Platte darunter, ein
   * Kachelraster darauf, die eigene Figur und die Fläche, auf die man zeigt.
   *
   * Die **Zeigefläche** ist der Grund, warum das Raster größer ist als der
   * Plan: Man muss neben den Grundriss zeigen können, sonst gibt es keine
   * Stelle, an der die nächste Kachel entstehen könnte.
   */
  private buildMini(solids: readonly PlanSolid[]): void {
    const bounds = this.bounds;
    const width = bounds.maxX - bounds.minX;
    const depth = bounds.maxZ - bounds.minZ;
    const midX = (bounds.minX + bounds.maxX) / 2 - this.centre.x;
    const midZ = (bounds.minZ + bounds.maxZ) / 2 - this.centre.z;

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.25, depth),
      new THREE.MeshStandardMaterial({ color: 0x111826, roughness: 0.9 }),
    );
    plate.position.set(midX, -0.28, midZ);
    this.mini.add(plate);

    const grid = new THREE.GridHelper(
      Math.max(width, depth),
      Math.max(1, Math.round(Math.max(width, depth) / TILE)),
      0x39d0ff,
      0x2b4a6b,
    );
    grid.position.set(midX, 0.01, midZ);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    this.mini.add(grid);

    for (const solid of solids) {
      this.mini.add(
        box(solid, solid.kind === 'floor' ? this.miniFloorMat : this.miniWallMat, this.centre),
      );
    }

    // **Und was darin steht** (`planProps.ts`). In der Miniatur brauchen sie
    // keinen eigenen Maßstab: Die Gruppe trägt ihn, und damit ist eine Kiste
    // von 32 cm in der Miniatur genau so klein wie der Gang, in dem sie steht.
    for (const thing of this.things) {
      const blueprint = createPropShape(thing.kind);
      const view = blueprint.mesh;
      view.position.set(
        thing.x - this.centre.x,
        standingY(blueprint.halfExtents.y),
        thing.z - this.centre.z,
      );
      view.rotation.y = thing.yaw;
      this.mini.add(view);
    }

    // Man selbst, klein, mittendrin. Sie entsteht bei jedem Neubau neu, weil
    // `clear` die ganze Gruppe leert — und dabei die alte Figur längst
    // freigegeben hat. Ein zweites `dispose` hier wäre eines zu viel.
    const pin = new PlayerPin();
    this.mini.add(pin);
    this.pin = pin;

    // Die Zeigefläche: unsichtbar dünn, aber sie fängt jeden Strahl.
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        color: 0x39d0ff,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    canvas.rotation.x = -Math.PI / 2;
    canvas.position.set(midX, 0.005, midZ);
    canvas.name = 'plan-canvas';
    canvas.visible = this.editing;
    this.mini.add(canvas);

    this.ghostTile = ghost(new THREE.PlaneGeometry(TILE * 0.92, TILE * 0.92), true);
    this.mini.add(this.ghostTile);
    this.ghostEdge = ghost(new THREE.BoxGeometry(TILE, PLAN_WALL_H, TILE), false);
    this.mini.add(this.ghostEdge);
    this.drawGhost();

    // **Der Zeiger kennt Objekte und keine Namen.** Nach jedem Neubau ist die
    // alte Fläche weg — abgemeldet wird sie trotzdem, sonst sammelt der Zeiger
    // bei jedem Handgriff ein totes Ziel mehr ein und fragt es für immer weiter.
    const ctx = this.context;
    if (!ctx) return;
    if (this.aimed) ctx.pointer.remove(this.aimed);
    this.aimed = canvas;
    ctx.pointer.add({
      object: canvas,
      // Der Trigger der Kartenhand führt in den Konstruktraum und wieder
      // heraus (`readCardTrigger`) — er darf nicht nebenbei eine Wand setzen.
      ignore: (hand) => hand !== null && this.cardHand === hand,
      onHover: (hit) => this.aim(hit.point),
      onBlur: () => this.aim(null),
      onSelect: () => this.press(),
    });
  }

  // --- was den Neustart überlebt --------------------------------------------

  /**
   * **Der Plan liegt im Browser.**
   *
   * Nicht, weil das eine Speicherlösung wäre, sondern weil das Gegenteil
   * unerträglich ist: Wer zwanzig Minuten baut und dann die Brille absetzt,
   * soll seinen Grundriss wiederfinden. Gespeichert wird das Format, das es
   * ohnehin gibt (`nav/navSerial.ts`) — damit ist derselbe Plan auch das, was
   * eine Welt später laden kann.
   */
  private store(): void {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(writeNav(this.plan, 'Bauplatz')));
      window.localStorage.setItem(THINGS_KEY, JSON.stringify(writeProps(this.things)));
    } catch {
      // Kein Speicher (privates Fenster, abgeschaltete Cookies): dann eben
      // nicht. Ein Editor, der daran abstürzt, ist schlimmer als einer, der
      // vergisst.
    }
  }

  private restore(): void {
    let saved: NavGraph | null = null;
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (raw) saved = readNav(JSON.parse(raw));
    } catch {
      saved = null;
    }
    // **Die Gegenstände kommen auch dann zurück, wenn der Plan es nicht tut.**
    // Zwei Speicherplätze, zwei Fassungen: Ein Grundriss ohne Kisten ist ein
    // leeres Zimmer, Kisten ohne Grundriss sind ein Haufen auf der Wiese —
    // beides ist besser als eine Ausnahme beim Laden.
    try {
      const raw = window.localStorage.getItem(THINGS_KEY);
      if (raw) {
        this.things.length = 0;
        this.things.push(...readProps(JSON.parse(raw)));
        this.thingsVersion++;
      }
    } catch {
      this.things.length = 0;
    }

    if (saved && saved.size > 0) {
      replacePlan(this.plan, saved);
      this.centre = planCentre(this.plan);
    }
    this.rebuildThings();
    this.rebuild(true);
  }

  override dispose(ctx: WorldContext): void {
    // **Erst das, was an fremden Knochen hängt.** Karte und Palette hängen an
    // den Hüften des Gürtels, und der wird gleich abgeräumt — was dann noch
    // daran steckt, verschwindet mit ihm aus der Szene, ohne je freigegeben
    // worden zu sein.
    if (this.folded) disposeTree(this.folded);
    this.folded = null;
    this.palette?.dispose();
    this.palette = null;
    this.card?.dispose();
    this.card = null;
    if (this.thingView) disposeTree(this.thingView);
    this.thingView = null;
    this.thingBodies.clear();
    this.shop = null;
    this.pin = null;
    this.aimed = null;
    super.dispose(ctx);
  }

  // --- das Menü -------------------------------------------------------------

  override menu(): MenuEntry[] {
    const rows: MenuEntry[] = PLAN_TOOLS.map((tool) => ({
      id: `plan-${tool.id}`,
      label: tool.label,
      sub: tool.sub,
      icon: 'cube',
      accent: tool.accent,
      checked: this.brush === tool.id,
      run: () => {
        this.brush = tool.id;
        this.putThingBack();
        this.drawPanel();
      },
    }));
    return [
      {
        id: 'plan',
        label: 'Bauen',
        sub: 'Karte, Palette und Werkzeug',
        icon: 'cube',
        accent: 0x39d0ff,
        children: [
          {
            id: 'plan-map',
            label: this.editing ? 'Konstruktraum verlassen' : 'In den Konstruktraum',
            sub: 'Dort steht der Grundriss auf der Werkbank',
            icon: 'teleport',
            accent: 0x39d0ff,
            run: () => {
              const now = this.context;
              if (!now) return;
              if (this.editing) this.putMapAway();
              else this.takeMapOut(now);
            },
          },
          ...rows,
          {
            id: 'plan-go',
            label: 'Marke setzen',
            sub: 'Auf eine Kachel tippen — dort tauchst du auf, wenn du zurückgehst',
            icon: 'teleport',
            accent: GO_COLOR,
            checked: this.brush === 'go',
            run: () => {
              this.brush = 'go';
              this.drawPanel();
            },
          },
          {
            id: 'plan-rest',
            label: 'Pinsel weglegen',
            sub: 'Dann baut ein Tipp auf die Miniatur nichts mehr',
            icon: 'cube',
            accent: 0x8892a6,
            checked: this.brush === null,
            run: () => {
              this.brush = null;
              this.brushHand = null;
              this.palette?.stow();
              this.drawPanel();
            },
          },
          {
            id: 'plan-near',
            label: 'Modell zu mir',
            sub: 'Holt die Miniatur vor den Kopf und legt sie flach',
            icon: 'teleport',
            accent: 0xffc857,
            run: () => {
              if (this.context) this.bring(this.context);
            },
          },
          // **Größer, kleiner, drehen** — in der Brille macht man das mit zwei
          // Händen am Modell; hier stehen sie für den flachen Modus, in dem es
          // keine zweite Hand gibt. Die Tafel, an der sie früher hingen, ist
          // weg: Ein Brett voller Knöpfe vor dem Grundriss verdeckte gerade
          // die Kante, an der man baut.
          {
            id: 'plan-bigger',
            label: 'Modell größer',
            sub: 'Eine Stufe heran',
            icon: 'cube',
            accent: 0x9ad9ff,
            run: () => {
              this.model = clampModel({ ...this.model, scale: this.model.scale * 1.35 });
            },
          },
          {
            id: 'plan-smaller',
            label: 'Modell kleiner',
            sub: 'Eine Stufe weg',
            icon: 'cube',
            accent: 0x9ad9ff,
            run: () => {
              this.model = clampModel({ ...this.model, scale: this.model.scale / 1.35 });
            },
          },
          {
            id: 'plan-turn',
            label: 'Modell drehen',
            sub: 'Eine Achtel Umdrehung um die Hochachse',
            icon: 'cube',
            accent: 0x9ad9ff,
            run: () => {
              this.model = clampModel({
                ...this.model,
                turn: turnedBy(this.model, Math.PI / 8),
              });
            },
          },
          {
            id: 'plan-things',
            label: 'Musterstück weglegen',
            sub: 'Dann setzt ein Tipp auf die Miniatur nichts mehr hinein',
            icon: 'cube',
            accent: 0xffb14e,
            checked: this.thing !== null,
            run: () => {
              this.putThingBack();
              this.drawPanel();
            },
          },
          {
            id: 'plan-clear',
            label: 'Von vorn',
            sub: 'Grundriss und alles darin zurücksetzen',
            icon: 'reset',
            accent: 0x8892a6,
            run: () => this.reset(),
          },
          {
            id: 'plan-doors',
            label: 'Türen auf/zu',
            sub: 'Alle Türen des Plans auf einmal',
            icon: 'cube',
            accent: 0xe58aa8,
            run: () => this.swingDoors(),
          },
        ],
      },
      ...super.menu(),
    ];
  }
}

/** Was in dieser Welt in der Luft schwebt und angefasst werden kann. */
type Piece = 'model' | 'palette' | 'figure' | 'card';

/**
 * **Wo man ist.** Drei Zustände, und der Unterschied zwischen den ersten
 * beiden ist wirklich nur die Karte in der Hand: Man steht in seinem Level und
 * sieht nach, wo man ist.
 */
type Stage = 'level' | 'map' | 'shop';

const STORE_KEY = 'vr-bauplatz-plan';
/** Und der zweite Platz: was im Grundriss steht (`planProps.ts`). */
const THINGS_KEY = 'vr-bauplatz-dinge';

/** Die Farbe des Hingehens — kein Bauwerkzeug, also auch keine Bauwerkzeugfarbe. */
const GO_COLOR = 0x5ee0a0;
const GO_SPEC = { label: 'Marke setzen', accent: GO_COLOR };
/** Und die Farbe dessen, was man hineinstellt. */
const THING_COLOR = 0xffb14e;

const HANDS: readonly Handedness[] = ['left', 'right'];

/** Die andere Hüfte — Karte und Palette teilen sich den Gürtel. */
function other(side: Handedness): Handedness {
  return side === 'left' ? 'right' : 'left';
}

/** Die Näpfe der Palette: die vier Bauwerkzeuge und das Hingehen. */
const PALETTE_DABS = [
  ...PLAN_TOOLS.map((tool) => ({ id: tool.id, label: tool.label, color: tool.accent })),
  { id: 'go', label: GO_SPEC.label, color: GO_COLOR },
];

/** Wo eine Hand ist und wie sie steht — das, was ein Griff hier braucht. */
function holdOf(controller: ControllerState): Hold {
  controller.grip.getWorldPosition(_grip);
  controller.grip.getWorldQuaternion(_turn);
  return {
    at: { x: _grip.x, y: _grip.y, z: _grip.z },
    turn: { x: _turn.x, y: _turn.y, z: _turn.z, w: _turn.w },
  };
}

/**
 * Das Modell um die **Hochachse der Welt** weiterdrehen und nicht um seine
 * eigene.
 *
 * Der Knopf heißt „Drehen", und gemeint ist das, was man an einem Modell auf
 * einem Tisch täte: es herumdrehen. Um seine eigene Y-Achse zu drehen hieße
 * bei einem gekippten Modell, es um eine Achse zu drehen, die schräg im Raum
 * steht — und das sieht aus wie ein Fehler.
 */
function turnedBy(model: Model, angle: number): { x: number; y: number; z: number; w: number } {
  _turn.set(model.turn.x, model.turn.y, model.turn.z, model.turn.w);
  _lean.setFromAxisAngle(_up, angle).multiply(_turn);
  return { x: _lean.x, y: _lean.y, z: _lean.z, w: _lean.w };
}

/**
 * Eine Gruppe leeren, **ohne sie selbst wegzuräumen**.
 *
 * `disposeTree` nimmt am Ende auch die Wurzel aus ihrem Elternteil — richtig
 * beim Verlassen einer Welt, falsch beim Umbauen: Die Gruppe soll bleiben, ihr
 * Inhalt nicht. Wer das verwechselt, baut einmal um und findet danach seine
 * Miniatur nicht wieder, weil sie nicht mehr in der Szene hängt.
 */
function clear(group: THREE.Group): void {
  for (const child of [...group.children]) disposeTree(child);
}

/** Ein Quader aus der Liste, an seinem Platz. */
function box(
  solid: PlanSolid,
  material: THREE.Material,
  offset: { x: number; z: number } = ZERO,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(solid.w, solid.h, solid.d), material);
  mesh.position.set(solid.x - offset.x, solid.y, solid.z - offset.z);
  mesh.name = `plan:${solid.kind}`;
  return mesh;
}

/**
 * **Die zusammengefaltete Karte** an der Hüfte: ein Heft mit einem Rücken.
 *
 * Sie tut nichts und ist trotzdem nicht wegzudenken. Ein leerer Ring am Gürtel
 * sagt „hier ist Platz"; was man braucht, ist „hier liegt deine Karte" — sonst
 * sucht man beim ersten Mal an beiden Hüften und beim zweiten Mal im Menü.
 */
function foldedMap(): THREE.Object3D {
  const map = new THREE.Group();
  map.name = 'folded-map';

  const sheet = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.02, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xdfe6f2, roughness: 0.9 }),
  );
  map.add(sheet);

  const cover = new THREE.Mesh(
    new THREE.BoxGeometry(0.145, 0.006, 0.105),
    new THREE.MeshStandardMaterial({
      color: 0x39d0ff,
      roughness: 0.5,
      emissive: new THREE.Color(0x39d0ff),
      emissiveIntensity: 0.35,
    }),
  );
  cover.position.y = 0.012;
  map.add(cover);

  return map;
}

/** Die Vorschau — leuchtend, durchsichtig, und sie hält keinen Strahl auf. */
function ghost(geometry: THREE.BufferGeometry, flat: boolean): THREE.Mesh {
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color: 0x39d0ff,
      transparent: true,
      opacity: flat ? 0.45 : 0.35,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    }),
  );
  if (flat) mesh.rotation.x = -Math.PI / 2;
  mesh.visible = false;
  mesh.renderOrder = 950;
  // Der Zeiger fragt jedes sichtbare Ziel — eine Vorschau, die sich selbst in
  // den Weg legt, fängt den Strahl ab, den sie erklären soll.
  mesh.raycast = () => {};
  return mesh;
}

const ZERO = { x: 0, z: 0 };
const _grip = new THREE.Vector3();
const _hip = new THREE.Vector3();
const _pin = new THREE.Vector3();
const _head = new THREE.Vector3();
const _local = new THREE.Vector3();
const _at = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3(1, 0, 0);
const _target = new THREE.Vector3();
const _ray = new THREE.Ray();
const _sphere = new THREE.Sphere();
const _tilt = new THREE.Quaternion();

/** Wie weit vor der Hand die Karte liegt, in Metern. */
const CARD_AHEAD = 0.11;
/**
 * Und wie weit ihre Fläche dem Gesicht entgegengekippt ist.
 *
 * 35°, und das ist gemessen und nicht geraten: Mit ausgestrecktem Arm sieht man
 * auf eine waagerechte Karte fast von der Seite. Ein wenig aufgestellt liest
 * sich das Blatt, ohne dass man die Hand verdrehen muss — dasselbe, was man mit
 * einem Blatt Papier auch täte.
 */
const CARD_TILT = 0.61;
const _turn = new THREE.Quaternion();
const _lean = new THREE.Quaternion();
