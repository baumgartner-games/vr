import * as THREE from 'three';
import { PortalWorld } from '../portal/PortalWorld';
import { TextPlane } from '../../ui/TextPlane';
import { createGround, createSky, disposeTree } from '../shared/environment';
import { ALL_GROUPS, GROUP_WORLD, type PhysicsBody } from '../../physics/PhysicsWorld';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';
import type { Handedness } from '../../core/XRInput';
import type { NavGraph } from '../nav/navGraph';
import { readNav, writeNav } from '../nav/navSerial';
import { TILE, tileCentreX, tileCentreZ } from '../nav/navTile';
import { EditorPanel, type PanelKey } from './EditorPanel';
import { planSolids, type PlanSolid } from './levelBuild';
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
  bringNear,
  clampModel,
  grabOne,
  grabTwo,
  newModel,
  recentre,
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
 * Das ist der ganze Trick dieser Welt und der Grund, warum es keine
 * Gottperspektive gibt: Man muss nicht aus dem Level heraus, um es von oben zu
 * sehen. Man sieht es zweimal — klein in den Händen, groß um sich herum —, und
 * jede Wand, die man setzt, steht eine Sekunde später neben einem und ist
 * wirklich im Weg. Ein Grundriss, den man nur von oben sieht, hat immer zu
 * enge Gänge; einer, in dem man steht, während man ihn zieht, nicht.
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

  /** Das Gebaute in Lebensgröße — hier läuft man herum. */
  private readonly stage = new THREE.Group();
  /** Und dasselbe klein, in der Luft vor einem. */
  private readonly mini = new THREE.Group();
  /** Die Körper der Lebensgröße; beim Umbauen müssen sie wieder heraus. */
  private readonly built: PhysicsBody[] = [];

  private model: Model = newModel();
  /**
   * **Was ein Tipp auf die Miniatur tut.**
   *
   * Die vier Bauwerkzeuge (`levelPlan.ts`) und eines mehr: `go` baut nichts,
   * sondern stellt **einen selbst** dorthin. Das ist der Griff, ohne den ein
   * Tischmodell nur eine Zeichnung wäre — man tippt auf ein Zimmer und steht
   * darin, statt in Lebensgröße dorthin zu laufen. Es steht neben den
   * Werkzeugen und nicht in ihnen, denn es ändert nichts am Plan.
   */
  private brush: PlanTool | 'go' = 'floor';

  private panel: EditorPanel | null = null;
  /** Die Vorschau: eine Kachel und ein Wandstück, immer nur eines davon. */
  private ghostTile: THREE.Mesh | null = null;
  private ghostEdge: THREE.Mesh | null = null;
  /** Worauf der Zeiger gerade liegt — `null`, wenn er daneben zeigt. */
  private spot: PlanSpot | null = null;
  /** Die Fläche, die beim Zeiger angemeldet ist — beim Neubau muss sie weg. */
  private aimed: THREE.Object3D | null = null;

  /** Was gerade angefasst ist: welche Hände, wo sie waren, und wie es stand. */
  private grip: { hands: Handedness[]; from: Spot[]; start: Model } | null = null;

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
    return 'Bauplatz · Das Modell greifen und schieben · Tippen baut, was oben leuchtet';
  }

  /**
   * **Kein Gürtel.**
   *
   * Der Greifknopf gehört hier dem Modell, und ein Werkzeug in der Hand nähme
   * ihn weg. Wer in dieser Welt etwas anfasst, meint den Grundriss.
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

    const panel = new EditorPanel('BAUPLATZ', PANEL_ROWS);
    this.root.add(panel);
    this.panel = panel;

    const sign = new TextPlane({
      width: 5,
      height: 1.5,
      title: 'Bauplatz',
      body: 'Greifen schiebt das Modell, zwei Hände drehen und zoomen. Tippen baut.',
      accent: 0x39d0ff,
    });
    sign.position.set(0, 2.6, -12.5);
    this.root.add(sign);

    this.rebuild();
  }

  /** Diese Welt bringt nichts zum Herumwerfen mit. */
  protected override buildProps(): void {}

  override async init(ctx: WorldContext): Promise<void> {
    await super.init(ctx);
    this.restore();

    // Das Modell steht beim Betreten dort, wo man hinlangt — und nicht dort,
    // wo es beim letzten Mal stand.
    this.bring(ctx);

    for (const key of this.panel?.keys() ?? []) {
      ctx.pointer.add({ object: key.mesh, pokeable: true, onSelect: () => this.pad(key.id, ctx) });
    }
    this.drawPanel();
  }

  // --- das Modell -----------------------------------------------------------

  override update(dt: number, ctx: WorldContext): void {
    super.update(dt, ctx);
    this.holdModel(ctx);
    this.placeModel();
  }

  /**
   * **Greifen** — eine Hand schiebt, zwei drehen und ziehen größer.
   *
   * Gerechnet wird gegen den Stand beim Zugreifen und nicht gegen das letzte
   * Bild (`miniature.ts`); und sobald eine Hand dazukommt oder loslässt, wird
   * neu angesetzt. Ohne das Neuansetzen macht die zweite Hand im Augenblick
   * ihres Zugreifens einen Sprung — sie war ja vorher nicht dabei.
   */
  private holdModel(ctx: WorldContext): void {
    const held: Handedness[] = [];
    const now: Spot[] = [];
    for (const hand of HANDS) {
      const controller = ctx.input.get(hand);
      if (!controller?.tracked || !controller.squeeze.pressed) continue;
      held.push(hand);
      controller.grip.getWorldPosition(_hand);
      now.push({ x: _hand.x, y: _hand.y, z: _hand.z });
    }

    // **Angefasst wird nur, was in Reichweite ist** — aber wer schon zugreift,
    // behält es. Ohne die erste Hälfte zieht jeder Griff irgendwo im Raum das
    // Modell mit; ohne die zweite fiele es aus der Hand, sobald man es weiter
    // von sich wegschiebt, als es breit ist.
    const hands: Handedness[] = [];
    const spots: Spot[] = [];
    for (let i = 0; i < held.length; i++) {
      const hand = held[i]!;
      if (!this.grip?.hands.includes(hand) && !this.nearModel(now[i]!)) continue;
      hands.push(hand);
      spots.push(now[i]!);
    }
    if (hands.length === 0) {
      this.grip = null;
      return;
    }

    const grip = this.grip;
    // Sobald eine Hand dazukommt oder loslässt, wird neu angesetzt: Die zweite
    // Hand machte sonst im Augenblick ihres Zugreifens einen Sprung — sie war
    // ja vorher nicht dabei.
    if (!grip || grip.hands.length !== hands.length || grip.hands.some((h, i) => h !== hands[i])) {
      this.grip = { hands, from: spots, start: this.model };
      return;
    }
    this.model =
      hands.length >= 2
        ? grabTwo(grip.start, this.centre, grip.from[0]!, grip.from[1]!, spots[0]!, spots[1]!)
        : grabOne(grip.start, grip.from[0]!, spots[0]!);
  }

  /**
   * Ob eine Hand nah genug am Modell ist, um es anzufassen.
   *
   * Gemessen wird gegen die **Kugel um das Modell** plus eine Handbreit: Ein
   * Grundriss ist flach, und wer über ihm greift, meint ihn — genau greifen
   * müsste man nur, wenn er ein Ding wäre.
   */
  private nearModel(spot: Spot): boolean {
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    const reach = (span / 2) * this.model.scale + 0.22;
    return (
      Math.hypot(spot.x - this.model.at.x, spot.y - this.model.at.y, spot.z - this.model.at.z) <=
      reach
    );
  }

  /**
   * Das Modell und seine Tafel an ihre Plätze.
   *
   * Die Tafel hängt an der **Vorderkante** des Modells und geht nicht mit
   * seinem Maßstab mit: Ein Knopf, der beim Herauszoomen zur Briefmarke wird,
   * ist einer, den man nicht mehr trifft.
   */
  private placeModel(): void {
    this.mini.position.set(this.model.at.x, this.model.at.y, this.model.at.z);
    this.mini.rotation.set(0, this.model.yaw, 0);
    this.mini.scale.setScalar(this.model.scale);

    const panel = this.panel;
    if (!panel) return;
    const front = ((this.bounds.maxZ - this.bounds.minZ) / 2) * this.model.scale + 0.12;
    _panel.set(0, -0.06, front).applyAxisAngle(_up, this.model.yaw);
    panel.position.set(
      this.model.at.x + _panel.x,
      this.model.at.y + _panel.y,
      this.model.at.z + _panel.z,
    );
    panel.rotation.set(-0.45, this.model.yaw, 0, 'YXZ');
  }

  /** Das Modell vor den Kopf holen — der erste Griff, den man braucht. */
  private bring(ctx: WorldContext): void {
    ctx.rig.getHeadPosition(_head);
    // Der Gierwinkel kommt aus der **Blickrichtung** und nicht aus der Lage des
    // Rigs: In der Brille dreht man den Kopf, ohne dass sich das Rig bewegt,
    // und ein Modell, das dann hinter einem auftaucht, ist verloren.
    ctx.rig.getHeadForward(_forward);
    const yaw = Math.atan2(-_forward.x, -_forward.z);
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    this.model = bringNear({ x: _head.x, y: _head.y, z: _head.z }, yaw, Math.max(1, span));
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
    if (!point) {
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
    if (!spot) return;
    if (this.brush === 'go') {
      this.stepInto(spot);
      return;
    }
    const before = planCentre(this.plan);
    const edit = applyTool(this.plan, this.brush, spot);
    if (!edit.changed) return;
    // Die Mitte des Plans wandert beim Anbauen — das Modell soll trotzdem
    // stehen bleiben (`recentre`).
    const after = planCentre(this.plan);
    this.model = recentre(this.model, before, after);
    this.centre = after;
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
   * tippt hinein und steht darin.
   *
   * Auf eine Kachel, die es nicht gibt, geht niemand: Dort wäre der nächste
   * Schritt ein Sturz.
   */
  private stepInto(spot: PlanSpot): void {
    const ctx = this.context;
    if (!ctx) return;
    if (!this.plan.has(spot.tile)) {
      this.announce('Da ist kein Boden');
      return;
    }
    const at = this.plan.worldOf(spot.tile);
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
    const spot = this.spot
      ? this.brush === 'go'
        ? { tile: this.spot.tile, dir: null }
        : aimOf(this.brush, this.spot)
      : null;
    tile.visible = false;
    edge.visible = false;
    if (!spot) return;

    const colour = this.brush === 'go' ? GO_COLOR : planToolSpec(this.brush).accent;
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

  // --- die Tafel ------------------------------------------------------------

  private pad(id: string, ctx: WorldContext): void {
    if (id === 'go' || PLAN_TOOLS.some((tool) => tool.id === id)) {
      this.brush = id as PlanTool | 'go';
      this.announce(
        id === 'go' ? 'Auf eine Kachel tippen — dort stehst du dann' : planToolSpec(id).sub,
      );
      this.drawPanel();
      this.drawGhost();
      return;
    }
    switch (id) {
      case 'near':
        this.bring(ctx);
        this.announce('Modell vor dir');
        break;
      case 'bigger':
      case 'smaller':
        this.model = clampModel({
          ...this.model,
          scale: this.model.scale * (id === 'bigger' ? 1.35 : 1 / 1.35),
        });
        break;
      case 'turn':
        this.model = clampModel({ ...this.model, yaw: this.model.yaw + Math.PI / 8 });
        break;
      case 'doors':
        this.swingDoors();
        break;
      case 'clear':
        this.reset();
        break;
    }
    this.drawPanel();
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
    this.rebuild();
    this.store();
    this.announce('Von vorn');
  }

  private drawPanel(): void {
    this.panel?.setActive(new Set([this.brush]));
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
    this.bounds = planBounds(this.plan);

    for (const entry of this.built) this.physics?.remove(entry);
    this.built.length = 0;
    clear(this.stage);
    clear(this.mini);

    const solids = planSolids(this.plan);
    for (const solid of solids) {
      const mesh = box(solid, this.materialFor(solid.kind));
      this.stage.add(mesh);
      mesh.updateMatrixWorld(true);
      if (this.physics) {
        this.built.push(
          this.physics.addStatic(mesh, { membership: GROUP_WORLD, filter: ALL_GROUPS }),
        );
      }
    }

    this.buildMini(solids);
  }

  private materialFor(kind: PlanSolid['kind']): THREE.Material {
    if (kind === 'floor') return this.floorMat;
    if (kind === 'door') return this.doorMat;
    return this.wallMat;
  }

  /**
   * Dasselbe klein — plus, was nur die Miniatur hat: eine Platte darunter, ein
   * Kachelraster darauf und die Fläche, auf die man zeigt.
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
   */
  private store(): void {
    try {
      window.localStorage.setItem(STORE_KEY, JSON.stringify(writeNav(this.plan, 'Bauplatz')));
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
    if (!saved || saved.size === 0) return;
    replacePlan(this.plan, saved);
    this.centre = planCentre(this.plan);
    this.rebuild();
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
        sub: 'Werkzeug und Modell',
        icon: 'cube',
        accent: 0x39d0ff,
        children: [
          ...rows,
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
            id: 'plan-near',
            label: 'Modell zu mir',
            sub: 'Holt die Miniatur vor den Kopf',
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

const STORE_KEY = 'vr-bauplatz-plan';

/** Die Farbe des Hingehens — kein Bauwerkzeug, also auch keine Bauwerkzeugfarbe. */
const GO_COLOR = 0x5ee0a0;

const HANDS: readonly Handedness[] = ['left', 'right'];

/** Die Tafel: oben die Werkzeuge, unten, was mit dem Modell passiert. */
const PANEL_ROWS: readonly (readonly PanelKey[])[] = [
  [
    ...PLAN_TOOLS.map((tool) => ({ id: tool.id, label: tool.label, color: tool.accent })),
    { id: 'go', label: 'Hingehen', color: GO_COLOR },
  ],
  [
    { id: 'near', label: 'Zu mir', color: 0xffc857 },
    { id: 'bigger', label: 'Größer', color: 0x9ad9ff },
    { id: 'smaller', label: 'Kleiner', color: 0x9ad9ff },
    { id: 'turn', label: 'Drehen', color: 0x9ad9ff },
    { id: 'doors', label: 'Türen', color: 0xe58aa8 },
    { id: 'clear', label: 'Von vorn', color: 0x8892a6 },
  ],
];

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
const _hand = new THREE.Vector3();
const _head = new THREE.Vector3();
const _local = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _panel = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _target = new THREE.Vector3();
