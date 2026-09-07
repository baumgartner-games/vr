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
import { EditorPanel, type PanelKey } from './EditorPanel';
import { Palette } from './Palette';
import { PlayerPin } from './PlayerPin';
import { type PlanSolid } from './levelBuild';
import { GridPlan } from '../grid/gridPlan';
import { GRID_COLORS } from '../grid/GridWorld';
import { PALETTE_BLOCKS, applyGridTool, gridToolSpec, type GridTool } from '../grid/gridTool';
import { starterGrid } from './starterGrid';
import { grabbedAt, HIP_REACH, type Target } from './reach';
import {
  PLAN_TOOLS,
  PLAN_WALL_H,
  aimOf,
  edgeAt,
  planBounds,
  planCentre,
  spotAt,
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
 * **Die zweite Fassung macht daraus Werkzeug statt Möbel**, und das ist der
 * ganze Unterschied. Vorher schwebte das Modell einfach da, und man konnte es
 * schieben. Jetzt ist es ein Ding, das man **dabeihat**:
 *
 * - Die **Karte hängt am Gürtel** und wird von dort gezogen wie jedes
 *   Werkzeug. Wer sie zieht, ist im Bearbeiten; wer sie weglegt, steht wieder
 *   in seinem Level.
 * - Sie wird gehalten wie ein Gegenstand: eine Hand trägt sie samt Handgelenk,
 *   **zwei Hände** ziehen sie größer, kippen und drehen sie (`miniature.ts`).
 *   Nur fallen tut sie nicht — losgelassen bleibt sie in der Luft stehen, und
 *   genau deshalb hat man beim Bauen zwei Hände frei.
 * - Ausgesucht wird an einer **Palette** (`Palette.ts`): einmal eintunken,
 *   beliebig oft setzen, den Pinsel zurück in die Mulde, wenn man fertig ist.
 * - In der Miniatur steht die **eigene Figur** (`PlayerPin.ts`). Man nimmt sie
 *   und stellt sie woandershin — das ist der kürzeste Weg quer durch ein
 *   Level, das man gerade erst gebaut hat.
 * - Und solange die Karte draußen ist, steht man in einem **weißen Raum**:
 *   kein Zimmer, keine Wand, nur ein Boden bis zum Horizont. Wer einen
 *   Grundriss bearbeitet, steht nicht gleichzeitig darin — er stünde sonst mit
 *   dem Kopf in einer Wand, die er gerade selbst gesetzt hat, und sähe vom
 *   Modell nichts mehr.
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
  private readonly plan = starterGrid();
  /** Woran erkannt wird, dass sich am Plan etwas getan hat. */
  private builtVersion = -1;
  /** Die Mitte des Plans, mit der das Modell gerade gebaut ist. */
  private centre = planCentre(this.plan.graph);
  /**
   * Und sein Ausschnitt — einmal je Neubau gerechnet und nicht je Bild.
   *
   * `planBounds` läuft über jede Kachel; bei sechzig Bildern in der Sekunde
   * wäre das die teuerste Zeile dieser Welt, und sie beantwortet zwischen zwei
   * Handgriffen immer dasselbe.
   */
  private bounds = planBounds(this.plan.graph);

  /** Das Gebaute in Lebensgröße — hier läuft man herum. */
  private readonly stage = new THREE.Group();
  /** Und dasselbe klein, in der Luft vor einem. */
  private readonly mini = new THREE.Group();
  /** Die Körper der Lebensgröße; beim Umbauen müssen sie wieder heraus. */
  private readonly built: PhysicsBody[] = [];

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
  private brush: GridTool | 'go' | null = null;
  /** In welcher Hand der Pinsel liegt — `null`, solange er in der Mulde steckt. */
  private brushHand: Handedness | null = null;

  private panel: EditorPanel | null = null;
  private palette: Palette | null = null;
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
   * Die Karte ist gleichzeitig der Schalter dieser Welt: Solange sie an der
   * Hüfte hängt, steht man in seinem Level; sobald sie gezogen ist, steht man
   * im weißen Raum und bearbeitet es (`editing`).
   */
  private mapHip: Handedness | null = 'left';
  private paletteHip: Handedness | null = 'right';
  /** Die zusammengefaltete Karte an der Hüfte — sie sagt, wo sie zu holen ist. */
  private folded: THREE.Object3D | null = null;

  /** Die Kulisse, die es zweimal gibt: das Level, und der weiße Raum darum. */
  private darkGround: THREE.Object3D | null = null;
  private darkSky: THREE.Object3D | null = null;
  private whiteGround: THREE.Object3D | null = null;
  private whiteSky: THREE.Object3D | null = null;
  private sign: TextPlane | null = null;

  private readonly floorMat = new THREE.MeshStandardMaterial({ color: 0x39415a, roughness: 0.95 });
  private readonly wallMat = new THREE.MeshStandardMaterial({ color: 0x6a7590, roughness: 0.85 });
  private readonly doorMat = new THREE.MeshStandardMaterial({
    color: 0xe58aa8,
    roughness: 0.6,
  });
  /** Die Materialien der Bausteine — beim ersten Gebrauch gebaut und geteilt. */
  private readonly blockMats = new Map<PlanSolid['kind'], THREE.Material>();
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
    return 'Bauplatz · Karte und Palette hängen am Gürtel · Greifen holt sie heraus';
  }

  /** Ob die Karte draußen ist — und damit, ob man gerade baut. */
  private get editing(): boolean {
    return this.mapHip === null;
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
    this.nav = this.plan.graph;
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
    this.darkGround = ground;

    // **Der weiße Raum**, und er liegt von Anfang an da: eine zweite Fläche
    // genau auf der ersten und ein zweiter Himmel um sie herum. Umgeschaltet
    // wird nur die Sichtbarkeit — ein Boden, der beim Aufklappen der Karte
    // erst gebaut werden müsste, wäre ein Ruckler an genau der Stelle, an der
    // man ihn am wenigsten braucht. Einen eigenen Körper bekommt er nicht: Er
    // liegt auf demselben Millimeter wie der dunkle, und dessen Körper trägt
    // für beide.
    const white = createGround(0xeef1f6, { line: 0xd4dae6 });
    white.position.y -= 0.02;
    white.visible = false;
    this.root.add(white);
    this.whiteGround = white;

    const darkSky = createSky(0x141c2c, 0x39d0ff);
    this.root.add(darkSky);
    this.darkSky = darkSky;

    const whiteSky = createSky(0xffffff, 0xe8ecf3);
    whiteSky.visible = false;
    this.root.add(whiteSky);
    this.whiteSky = whiteSky;

    this.root.add(this.stage);
    this.root.add(this.mini);

    const panel = new EditorPanel('BAUPLATZ', PANEL_ROWS);
    this.root.add(panel);
    this.panel = panel;

    const palette = new Palette(PALETTE_DABS);
    this.root.add(palette);
    this.palette = palette;

    const sign = new TextPlane({
      width: 5,
      height: 1.5,
      title: 'Bauplatz',
      body: 'Karte von der Hüfte ziehen. Eine Hand trägt, zwei drehen und zoomen.',
      accent: 0x39d0ff,
    });
    sign.position.set(0, 2.6, -12.5);
    this.root.add(sign);
    this.sign = sign;

    this.folded = foldedMap();
    this.root.add(this.folded);

    this.rebuild();
  }

  /** Diese Welt bringt nichts zum Herumwerfen mit. */
  protected override buildProps(): void {}

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    this.restore();

    for (const key of this.panel?.keys() ?? []) {
      ctx.pointer.add({ object: key.mesh, pokeable: true, onSelect: () => this.pad(key.id, ctx) });
    }
    for (const key of this.palette?.keys() ?? []) {
      ctx.pointer.add({
        object: key.mesh,
        pokeable: true,
        // Die Hand, die die Palette trägt, zeigt nicht auf sie: Ihr eigener
        // Strahl läge sonst dauernd auf dem eigenen Brett und schluckte den
        // Trigger, mit dem sie gerade etwas anderes tut.
        ignore: (hand) => hand !== null && this.carry?.hand === hand,
        onSelect: (hit) => this.dip(key.id, hit),
      });
    }
    // Die Karte hängt am Gürtel, und das Level steht um einen herum: Der
    // Bauplatz macht als **Level** auf und nicht als Editor.
    this.setEditing(false);
    this.drawPanel();
  }

  // --- die Hände ------------------------------------------------------------

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.handleHands(ctx);
    this.placeModel();
    this.placePalette();
    this.placePin(ctx);
    this.placeBrush(ctx);
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
      this.letGo(ctx, piece, now.get(hand) ?? null);
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
      return;
    }
    // Alles andere gibt es nur, solange die Karte draußen ist: Eine Palette in
    // der Hand, während man durch sein fertiges Level läuft, hätte nichts, worauf
    // sie malen könnte.
    if (!this.editing) return;
    if (hip && this.paletteHip === hip) {
      this.drawPalette(hand, hold);
      return;
    }

    const piece = grabbedAt(hold.at, this.targets());
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
  private letGo(ctx: WorldContext, piece: Piece, hold: Hold | null): void {
    if (piece === 'figure') {
      this.pin?.setHeld(false);
      this.dropPin(ctx);
      return;
    }
    const hip = hold ? this.hipAt(hold.at) : null;
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
   * Abgesetzt: Auf einer Kachel steht man dann dort — daneben nicht.
   *
   * Auf eine Kachel, die es nicht gibt, geht niemand: Dort wäre der nächste
   * Schritt ein Sturz.
   */
  private dropPin(ctx: WorldContext): void {
    const dragged = this.dragged;
    this.dragged = null;
    if (!dragged) return;
    const spot = spotAt(dragged.x, dragged.z);
    if (!this.plan.graph.has(spot.tile)) {
      this.announce('Da ist kein Boden — die Figur bleibt, wo sie war');
      return;
    }
    const at = this.plan.graph.worldOf(spot.tile);
    this.movePlayerTo(ctx, _target.set(at.x, at.y, at.z));
    this.announce('Dort stehst du jetzt');
  }

  // --- wo alles hängt -------------------------------------------------------

  /**
   * Das Modell und seine Tafel an ihre Plätze.
   *
   * Die Tafel hängt an der **Vorderkante** des Modells und geht nicht mit
   * seinem Maßstab mit: Ein Knopf, der beim Herauszoomen zur Briefmarke wird,
   * ist einer, den man nicht mehr trifft. Gekippt wird sie dagegen mit — sie
   * gehört zum Modell, und eine Tafel, die waagerecht stehen bleibt, während
   * ihr Modell sich dreht, sieht aus wie vergessen.
   */
  private placeModel(): void {
    _turn.set(this.model.turn.x, this.model.turn.y, this.model.turn.z, this.model.turn.w);
    this.mini.position.set(this.model.at.x, this.model.at.y, this.model.at.z);
    this.mini.quaternion.copy(_turn);
    this.mini.scale.setScalar(this.model.scale);

    const panel = this.panel;
    if (!panel) return;
    const front = ((this.bounds.maxZ - this.bounds.minZ) / 2) * this.model.scale + 0.12;
    _offset.set(0, -0.06, front).applyQuaternion(_turn);
    panel.position.set(
      this.model.at.x + _offset.x,
      this.model.at.y + _offset.y,
      this.model.at.z + _offset.z,
    );
    panel.quaternion.copy(_turn).multiply(_lean.setFromAxisAngle(_right, -0.45));
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
    const pin = this.pin;
    if (!pin) return;
    if (this.dragged) {
      pin.position.set(this.dragged.x - this.centre.x, 0.2, this.dragged.z - this.centre.z);
      return;
    }
    ctx.rig.getHeadPosition(_head);
    ctx.rig.getHeadForward(_forward);
    pin.position.set(_head.x - this.centre.x, 0, _head.z - this.centre.z);
    pin.rotation.set(0, Math.atan2(-_forward.x, -_forward.z), 0);
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

  // --- Karte und Palette an der Hüfte ---------------------------------------

  /**
   * **Die Karte ziehen** — und damit das Bearbeiten aufmachen.
   *
   * Sie entsteht dort, wo die Hand ist, und liegt sofort darin: Ein Modell,
   * das beim Ziehen erst vor den Kopf springt, während die Hand noch an der
   * Hüfte steht, ist eines, dem man hinterherfasst. Der Maßstab kommt aus der
   * Größe des Plans, die Richtung aus dem Blick — sein Norden liegt vorn.
   */
  private drawMap(ctx: WorldContext, hand: Handedness, hold: Hold): void {
    this.mapHip = null;
    ctx.rig.getHeadForward(_forward);
    this.model = clampModel({
      at: { ...hold.at },
      turn: yawTurn(Math.atan2(-_forward.x, -_forward.z)),
      scale: this.fitScale(),
    });
    this.setEditing(true);
    this.holds.set(hand, 'model');
    this.grip = { hands: [hand], from: [hold], start: this.model };
    ctx.input.get(hand)?.pulse(0.5, 30);
    this.announce('Karte draußen — du stehst im weißen Raum');
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
    this.setEditing(false);
    this.announce('Karte weg — du stehst wieder in deinem Level');
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
   * **Bearbeiten an oder aus** — und mit ihm die halbe Welt.
   *
   * Beim Bearbeiten steht das Level nicht mehr um einen herum: Es wird
   * unsichtbar, und seine Körper kommen aus der Physik heraus. Beides gehört
   * zusammen — eine Wand, die man nicht sieht, aber gegen die man läuft, ist
   * schlimmer als eine, die im Weg steht.
   *
   * Der weiße Raum ist dann kein Nichts, sondern ein Boden bis zum Horizont.
   * Man steht darin, man kann darin herumgehen, und die eigene Figur in der
   * Miniatur sagt weiterhin, wo im Level das wäre.
   */
  private setEditing(on: boolean): void {
    this.stage.visible = !on;
    this.setStageSolid(!on);
    if (this.darkGround) this.darkGround.visible = !on;
    if (this.darkSky) this.darkSky.visible = !on;
    if (this.whiteGround) this.whiteGround.visible = on;
    if (this.whiteSky) this.whiteSky.visible = on;
    if (this.sign) this.sign.visible = !on;
    if (this.folded) this.folded.visible = !on;

    this.mini.visible = on;
    if (this.panel) this.panel.visible = on;
    if (this.palette) this.palette.visible = on || this.paletteHip !== null;
    // Der Zeiger fragt jedes Ziel nach seiner **eigenen** Sichtbarkeit und
    // nicht nach der seiner Eltern: Eine versteckte Tafel, deren Tasten noch
    // sichtbar sind, fängt weiter jeden Strahl.
    for (const key of this.panel?.keys() ?? []) key.mesh.visible = on;
    for (const key of this.palette?.keys() ?? []) key.mesh.visible = on;
    if (this.aimed) this.aimed.visible = on;
    if (on) return;

    this.spot = null;
    this.drawGhost();
    this.grip = null;
    this.carry = null;
    this.dragged = null;
    this.holds.clear();
    this.foldMap();
    // **Wer die Karte weglegt, räumt auch die Palette weg** — auf die Hüfte,
    // an der sie hing, sonst auf die freie. Eine Palette, die weiter im Raum
    // schwebte, während man wieder durch sein Level läuft, wäre ein Brett,
    // gegen das man auf dem Rückweg stößt; und unsichtbar herumschweben zu
    // lassen ist noch schlechter — dann sucht man sie beim nächsten Mal.
    this.stowPalette(this.paletteHip ?? other(this.mapHip ?? 'left'));
    if (this.palette) this.palette.visible = this.paletteHip !== null;
  }

  /** Die zusammengefaltete Karte an die Hüfte hängen, an der sie hängt. */
  private foldMap(): void {
    const folded = this.folded;
    const side = this.mapHip;
    if (!folded || !side) return;
    const slot = this.host?.beltSlot(side);
    if (!slot) return;
    slot.add(folded);
    folded.position.set(0, 0, 0);
    folded.quaternion.identity();
  }

  /**
   * Die Körper der Lebensgröße hinein oder heraus.
   *
   * Es sind dieselben Netze wie eben — nur ihre Anmeldung bei der Physik
   * wechselt. Neu bauen müsste sie niemand, und wer es täte, hätte beim
   * dritten Umschalten drei Sätze Wände übereinander.
   */
  private setStageSolid(solid: boolean): void {
    const physics = this.physics;
    if (!physics) return;
    if (!solid) {
      for (const entry of this.built) physics.remove(entry);
      this.built.length = 0;
      return;
    }
    if (this.built.length > 0) return;
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
    if (this.brush === null) {
      this.announce('Erst an der Palette eintunken');
      return;
    }
    if (this.brush === 'go') {
      this.stepInto(spot);
      return;
    }
    const before = planCentre(this.plan.graph);
    const edit = applyGridTool(this.plan, this.brush, spot);
    if (!edit.changed) return;
    // Die Mitte des Plans wandert beim Anbauen — das Modell soll trotzdem
    // stehen bleiben (`recentre`).
    const after = planCentre(this.plan.graph);
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
    const ctx = this.context;
    if (!ctx) return;
    if (!this.plan.graph.has(spot.tile)) {
      this.announce('Da ist kein Boden');
      return;
    }
    const at = this.plan.graph.worldOf(spot.tile);
    this.movePlayerTo(ctx, _target.set(at.x, at.y, at.z));
    this.announce('Hier stehst du');
  }

  /** Die Vorschau unter dem Zeiger — eine Kachel oder ein Wandstück. */
  private drawGhost(): void {
    const tile = this.ghostTile;
    const edge = this.ghostEdge;
    if (!tile || !edge) return;
    // Beim Hingehen zählt die **Kachel** und nie eine Kante: Man stellt sich
    // auf einen Boden und nicht in eine Wand.
    const brush = this.brush;
    const spot =
      this.spot && brush
        ? brush === 'go'
          ? { tile: this.spot.tile, dir: null }
          : aimOf(brush as PlanTool, this.spot)
        : null;
    tile.visible = false;
    edge.visible = false;
    if (!spot || !brush) return;

    const colour = brush === 'go' ? GO_COLOR : gridToolSpec(brush).accent;
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
      this.palette?.stow();
      this.announce('Pinsel zurück — jetzt baut ein Tipp nichts mehr');
    } else {
      this.brush = id as GridTool | 'go';
      this.brushHand = hit.hand ?? this.brushHand;
      this.announce(
        id === 'go' ? 'Auf eine Kachel tippen — dort stehst du dann' : gridToolSpec(id).sub,
      );
    }
    this.drawPanel();
    this.drawGhost();
  }

  // --- die Tafel ------------------------------------------------------------

  private pad(id: string, ctx: WorldContext): void {
    switch (id) {
      case 'near':
        this.bring(ctx);
        this.announce('Modell vor dir, flach gelegt');
        break;
      case 'bigger':
      case 'smaller':
        this.model = clampModel({
          ...this.model,
          scale: this.model.scale * (id === 'bigger' ? 1.35 : 1 / 1.35),
        });
        break;
      case 'turn':
        this.model = clampModel({
          ...this.model,
          turn: turnedBy(this.model, Math.PI / 8),
        });
        break;
      case 'doors':
        this.swingDoors();
        break;
      case 'away':
        this.putMapAway();
        break;
      case 'clear':
        this.reset();
        break;
    }
    this.drawPanel();
  }

  /**
   * Die Karte weglegen, ohne eine Hüfte zu treffen — für den flachen Modus, in
   * dem es keine Hände gibt, die etwas an einen Gürtel halten könnten.
   */
  private putMapAway(): void {
    this.stowMap(this.mapHip ?? 'left');
  }

  /** Und der Weg zurück, wenn keine Hand danach greifen kann. */
  private takeMapOut(ctx: WorldContext): void {
    if (this.editing) return;
    this.mapHip = null;
    this.setEditing(true);
    this.bring(ctx);
    this.announce('Karte draußen — du stehst im weißen Raum');
  }

  /** Alle Türen auf oder alle zu — in der Karte und im Gebauten zugleich. */
  private swingDoors(): void {
    const ids = [...this.plan.graph.doorIds()];
    if (ids.length === 0) {
      this.announce('Noch keine Tür im Plan');
      return;
    }
    const shut = ids.some((id) => this.plan.graph.door(id)?.open === true);
    for (const id of ids) this.plan.graph.setDoor(id, { open: !shut });
    this.rebuild();
    this.store();
    this.announce(shut ? 'Alle Türen zu' : 'Alle Türen auf');
  }

  private reset(): void {
    this.plan.replaceWith(starterGrid());
    this.centre = planCentre(this.plan.graph);
    this.rebuild();
    this.store();
    this.announce('Von vorn');
  }

  private drawPanel(): void {
    const brush = this.brush;
    const spec = brush === null ? null : brush === 'go' ? GO_SPEC : gridToolSpec(brush);
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
  private rebuild(): void {
    if (this.builtVersion === this.plan.version) return;
    this.builtVersion = this.plan.version;
    this.bounds = planBounds(this.plan.graph);

    for (const entry of this.built) this.physics?.remove(entry);
    this.built.length = 0;
    clear(this.stage);
    clear(this.mini);

    const solids = this.plan.solids();
    for (const solid of solids) {
      const mesh = box(solid, this.materialFor(solid.kind));
      this.stage.add(mesh);
      mesh.updateMatrixWorld(true);
    }
    // Beim Bearbeiten steht das Level nicht im Weg — dann bleiben die Körper
    // draußen, bis die Karte weggelegt wird.
    this.setStageSolid(!this.editing);

    this.buildMini(solids);
  }

  /**
   * Das Material einer Sorte — und ab hier ist es dasselbe wie in jeder
   * Gitterwelt (`grid/GridWorld.ts`: `GRID_COLORS`).
   *
   * Boden, Wand und Tür behalten die kühlen Bauplatztöne: Man baut hier an
   * einem Plan und nicht in einem Zimmer, und ein Grundriss soll wie ein
   * Grundriss aussehen. Alles, was daraufgestellt wird, trägt dagegen die
   * Farbe, die es später auch in der fertigen Welt hat — sonst baut man eine
   * Küche in Grau und sieht sie zum ersten Mal, wenn man sie lädt.
   */
  private materialFor(kind: PlanSolid['kind']): THREE.Material {
    if (kind === 'floor') return this.floorMat;
    if (kind === 'door') return this.doorMat;
    if (kind === 'wall') return this.wallMat;
    const had = this.blockMats.get(kind);
    if (had) return had;
    const made = new THREE.MeshStandardMaterial({ color: GRID_COLORS[kind], roughness: 0.7 });
    this.blockMats.set(kind, made);
    return made;
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
   *
   * **Die Bausteine liegen daneben und nicht darin.** Eine Küchenzeile ist
   * keine Navigationsinformation; sie in dieselbe Datei zu schreiben hieße,
   * deren Versionsnummer anzuheben und damit jede gespeicherte Karte für
   * ungültig zu erklären — für Möbel. Also steht die Karte unter `nav` und
   * das Mobiliar unter `blocks`, und ein alter Eintrag, der nur die Karte
   * kennt, wird weiterhin gelesen (`readSaved`).
   */
  private store(): void {
    try {
      window.localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          nav: writeNav(this.plan.graph, 'Bauplatz'),
          blocks: this.plan.saveBlocks(),
        }),
      );
    } catch {
      // Kein Speicher (privates Fenster, abgeschaltete Cookies): dann eben
      // nicht. Ein Editor, der daran abstürzt, ist schlimmer als einer, der
      // vergisst.
    }
  }

  private restore(): void {
    const saved = readSaved();
    if (!saved || saved.graph.size === 0) return;
    this.plan.replaceWith(saved);
    this.centre = planCentre(this.plan.graph);
    this.rebuild();
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
            label: this.editing ? 'Karte weglegen' : 'Karte holen',
            sub: 'Draußen wird gebaut, weggelegt steht man im Level',
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
            id: 'plan-blocks',
            label: 'Bausteine',
            sub: 'Küchenzeile, Regal, Tisch, Bank, Kisten, Säule, Geländer, Brüstung, Podest',
            icon: 'cube',
            accent: 0xffa64d,
            children: PALETTE_BLOCKS.map((kind) => {
              const spec = gridToolSpec(kind);
              return {
                id: `plan-${kind}`,
                label: spec.label,
                sub: spec.sub,
                icon: 'cube' as const,
                accent: spec.accent,
                checked: this.brush === kind,
                run: () => {
                  this.brush = kind;
                  this.drawPanel();
                },
              };
            }),
          },
          {
            id: 'plan-go',
            label: 'Hingehen',
            sub: 'Auf eine Kachel der Miniatur tippen und dort stehen',
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
type Piece = 'model' | 'palette' | 'figure';

const STORE_KEY = 'vr-bauplatz-plan';

/** Die Farbe des Hingehens — kein Bauwerkzeug, also auch keine Bauwerkzeugfarbe. */
const GO_COLOR = 0x5ee0a0;
const GO_SPEC = { label: 'Hingehen', accent: GO_COLOR };

const HANDS: readonly Handedness[] = ['left', 'right'];

/** Die andere Hüfte — Karte und Palette teilen sich den Gürtel. */
function other(side: Handedness): Handedness {
  return side === 'left' ? 'right' : 'left';
}

/**
 * **Die Näpfe der Palette**, in zwei Reihen: oben die vier Bauwerkzeuge und
 * das Hingehen, darunter das Mobiliar.
 *
 * Die Trennung ist keine Ordnungsliebe, sondern die Reihenfolge, in der man
 * baut: erst der Grundriss, dann das, was darin steht. Wer eine Küchenzeile
 * setzen will, hat vorher Boden und Wände gelegt — und wer sie in derselben
 * Reihe suchte, käme beim Wandmalen aus Versehen daran.
 */
const PALETTE_DABS = [
  ...PLAN_TOOLS.map((tool) => ({ id: tool.id, label: tool.label, color: tool.accent, row: 0 })),
  { id: 'go', label: GO_SPEC.label, color: GO_COLOR, row: 0 },
  ...PALETTE_BLOCKS.map((kind) => {
    const spec = gridToolSpec(kind);
    return { id: kind, label: spec.label, color: spec.accent, row: 1 };
  }),
];

/**
 * Was im Speicher liegt — die Karte und, seit es Bausteine gibt, das Mobiliar
 * daneben.
 *
 * Ein Eintrag aus der Zeit davor ist die nackte Karte, und der wird weiter
 * gelesen: Wer zwei Wochen an einem Grundriss gebaut hat, verliert ihn nicht,
 * weil jemand eine Küchenzeile eingebaut hat.
 */
function readSaved(): GridPlan | null {
  let raw: unknown = null;
  try {
    const text = window.localStorage.getItem(STORE_KEY);
    if (!text) return null;
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  const box = raw as { nav?: unknown; blocks?: unknown };
  const navPart = box && typeof box === 'object' && 'nav' in box ? box.nav : raw;
  let graph: NavGraph;
  try {
    graph = readNav(navPart);
  } catch {
    return null;
  }
  return GridPlan.from(graph, Array.isArray(box?.blocks) ? box.blocks : []);
}

/**
 * Die Tafel am Modell: nur noch, was mit dem Modell selbst passiert.
 *
 * Womit gebaut wird, steht seit der Palette dort, wo man es sich holt. Was
 * hier bleibt, ist das, wofür man in der Brille zwei Hände bräuchte und im
 * flachen Modus keine hat: größer, kleiner, drehen — und der Weg zurück ins
 * Level, ohne eine Hüfte treffen zu müssen.
 */
const PANEL_ROWS: readonly (readonly PanelKey[])[] = [
  [
    { id: 'near', label: 'Zu mir', color: 0xffc857 },
    { id: 'bigger', label: 'Größer', color: 0x9ad9ff },
    { id: 'smaller', label: 'Kleiner', color: 0x9ad9ff },
    { id: 'turn', label: 'Drehen', color: 0x9ad9ff },
  ],
  [
    { id: 'doors', label: 'Türen', color: 0xe58aa8 },
    { id: 'away', label: 'Weglegen', color: 0x39d0ff },
    { id: 'clear', label: 'Von vorn', color: 0x8892a6 },
  ],
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
const _offset = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _right = new THREE.Vector3(1, 0, 0);
const _target = new THREE.Vector3();
const _ray = new THREE.Ray();
const _turn = new THREE.Quaternion();
const _lean = new THREE.Quaternion();
