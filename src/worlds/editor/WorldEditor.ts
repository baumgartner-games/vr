import * as THREE from 'three';
import { EditorPanel, type PanelKey } from './EditorPanel';
import { Palette } from './Palette';
import { PlayerPin } from './PlayerPin';
import { grabbedAt, HIP_REACH, type Target } from './reach';
import { disposeShapes, disposeTree } from '../shared/environment';
import { TILE, tileCentreX, tileCentreZ } from '../nav/navTile';
import {
  PLAN_TOOLS,
  PLAN_WALL_H,
  aimOf,
  edgeAt,
  planBounds,
  planCentre,
  spotAt,
  type PlanBounds,
  type PlanSpot,
  type PlanTool,
} from './levelPlan';
import {
  PAINT_MODES,
  applySpots,
  areaSpots,
  paintModeSpec,
  strokeSpots,
  type PaintMode,
} from './planPaint';
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
import { PALETTE_BLOCKS, applyGridTool, gridToolSpec, type GridTool } from '../grid/gridTool';
import type { GridPlan } from '../grid/gridPlan';
import type { PlanSolid } from '../grid/solids';
import type { ControllerState, Handedness } from '../../core/XRInput';
import type { PointerHit } from '../../core/Pointer';
import type { WorldContext } from '../../core/types';
import type { MenuEntry } from '../../ui/menu';

/**
 * **Der Welt-Bearbeitungsmodus** — die Karte, die Palette und das Tischmodell,
 * losgelöst von der Welt, in der man damit baut.
 *
 * Bis hierher war das alles der **Bauplatz** (`EditorWorld.ts`) und nur er.
 * Das war die richtige erste Fassung — man probiert eine Bedienung an einem
 * Ort aus, bevor man sie überall hinhängt —, aber es war auch die Antwort auf
 * die falsche Frage. Die Frage lautet nicht „wo baue ich ein Level?", sondern
 * „warum kann ich das Haus, in dem ich gerade stehe, nicht umbauen?". Wer im
 * Dunkelhaus merkt, dass der Gang zu eng ist, will ihn *dort* verbreitern und
 * nicht in einer zweiten Welt nachbauen.
 *
 * Also hängt die Bedienung jetzt an keiner Welt mehr, sondern an einem
 * **Grundriss** (`grid/gridPlan.ts`) und an einem Wirt (`EditorHost`), der
 * drei Sachen kann: die Welt neu bauen, jemanden versetzen und etwas sagen.
 * Jede Gitterwelt hat beides — und bekommt den Bauplatz damit geschenkt
 * (`grid/GridWorld.ts`).
 *
 * Was gegenüber der ersten Fassung dazugekommen ist, sind die zwei Handgriffe,
 * an denen sich ein Kacheleditor entscheidet (`planPaint.ts`):
 *
 * - **Malen**: gedrückt halten und ziehen, statt für jede Kachel einmal zu
 *   tippen. Ein Zimmer von acht mal acht sind sonst vierundsechzig Trigger.
 * - **Fläche**: zwei Ecken aufziehen, und dazwischen wird gefüllt. Was auf
 *   eine Kachel gehört, füllt die Fläche; was an eine Kante gehört, zieht
 *   ihren Rand — ein Rechteck aus Wänden ist ein Zimmer und kein Klotz.
 *
 * Und die dritte Sache, die vorher fehlte: **Platz zum Weiterbauen.** Die
 * Zeigefläche ist nicht mehr der Plan plus eine Kachel, sondern der Plan plus
 * `FIELD_MARGIN` — man kann neben alles zeigen, was schon steht, auch wenn
 * dort noch gar nichts ist. Ein Editor, in dem man nur an vorhandene Kacheln
 * andocken kann, ist einer, in dem man keinen zweiten Flügel anbaut.
 */

/**
 * **Was der Editor von seiner Welt braucht** — und mehr nicht.
 *
 * Absichtlich klein gehalten: Was hier steht, muss jede Welt können, die
 * bearbeitet werden darf. Alles, was nur der Bauplatz kann (ein weißer Raum,
 * ein gespeicherter Plan), steht dort und nicht hier.
 */
export interface EditorHost {
  /**
   * Alles als **Frage** und nicht als Wert: Der Grundriss wird beim
   * Zurücksetzen ausgetauscht, und ein Wirt, der noch den alten hielte, baute
   * an einem Plan weiter, den niemand mehr sieht.
   */
  /** Woran Modell, Palette und Tafel hängen. */
  root(): THREE.Object3D;
  /** Der Grundriss, an dem gebaut wird. */
  plan(): GridPlan;
  /** Wie die Welt heißt — die Überschrift der Tafel am Modell. */
  title(): string;
  /** Der laufende Kontext, oder `null`, solange die Welt nicht offen ist. */
  ctx(): WorldContext | null;
  /** Wo am Gürtel etwas hängen kann — `null` im flachen Modus ohne Hände. */
  beltSlot(side: Handedness): THREE.Object3D | null;
  /**
   * Ob an dieser Hüfte noch Platz ist.
   *
   * Der Gürtel hat zwei Haken, und in einer Welt mit Werkzeugen hängt an
   * beiden schon etwas. Karte und Palette daneben zu hängen hieße, dass ein
   * Griff dorthin eine von beiden verschluckt — also hängen sie in so einer
   * Welt gar nicht, sondern kommen aus dem Menü und schweben.
   */
  hipFree(side: Handedness): boolean;
  /** Eine Zeile ans Handgelenk. */
  say(message: string): void;
  /** Jemanden versetzen — auf eine Kachel des Plans. */
  goTo(at: { x: number; y: number; z: number }): void;
  /** Am Plan hat sich etwas getan: die Welt in Lebensgröße nachziehen. */
  planChanged(): void;
  /** Die Karte ist heraus (oder wieder weg) — die Kulisse zieht nach. */
  editingChanged(on: boolean): void;
}

/**
 * **Wie weit über den Plan hinaus gezeigt werden kann**, in Kacheln.
 *
 * Der Teller unter dem Modell ist eine Kachel größer als der Grundriss; die
 * Fläche, auf die man zeigen kann, ist es um so viel. Das ist der Unterschied
 * zwischen „ich kann eine Kachel anbauen" und „ich kann hier einen zweiten
 * Flügel hinziehen" — und in einer Welt, in der an dieser Stelle noch gar
 * nichts steht, ist es der Unterschied zwischen bauen und nicht bauen können.
 */
const FIELD_MARGIN = 5;

/**
 * **Das Licht über dem Modell**: wie hoch es hängt, wie weit es reicht und wie
 * stark es ist.
 *
 * Die Stärke ist in Candela, und ein Punktlicht nimmt quadratisch ab — bei
 * einem halben Meter Abstand kommt vom Wert also das Vierfache an. Zwei
 * Candela sahen deshalb aus wie ein Schweißbrenner: Der Grundriss war eine
 * weiße Fläche ohne Kanten. Was hier steht, ergibt am Modell ungefähr eine
 * Einheit — genug, dass man in einem stockdunklen Haus jede Wand sieht, wenig
 * genug, dass es in einer hellen Welt nicht auffällt.
 */
const LAMP_HEIGHT = 0.55;
const LAMP_RANGE = 2.2;
const LAMP_POWER = 0.35;

/** Was in dieser Welt in der Luft schwebt und angefasst werden kann. */
type Piece = 'model' | 'palette' | 'figure';

/** Die Farbe des Hingehens — kein Bauwerkzeug, also auch keine Bauwerkzeugfarbe. */
const GO_COLOR = 0x5ee0a0;
const GO_SPEC = { label: 'Hingehen', accent: GO_COLOR };

const HANDS: readonly Handedness[] = ['left', 'right'];

export class WorldEditor {
  /** Woran erkannt wird, dass sich am Plan etwas getan hat. */
  private builtVersion = -1;
  /** Die Mitte des Plans, mit der das Modell gerade gebaut ist. */
  private centre = { x: 0, z: 0 };
  /**
   * Der Ausschnitt des Plans — einmal je Neubau gerechnet und nicht je Bild.
   *
   * `planBounds` läuft über jede Kachel; bei sechzig Bildern in der Sekunde
   * wäre das die teuerste Zeile hier, und sie beantwortet zwischen zwei
   * Handgriffen immer dasselbe. `bounds` ist der Teller, `field` die Fläche,
   * auf die man zeigen kann.
   */
  private bounds: PlanBounds = { minX: -TILE, minZ: -TILE, maxX: TILE, maxZ: TILE, any: false };
  private field: PlanBounds = this.bounds;

  /** Das Tischmodell — hier hängt alles Kleine darin. */
  private readonly mini = new THREE.Group();
  /** Und darin das, was bei jedem Umbau neu entsteht. */
  private readonly content = new THREE.Group();

  private model: Model = newModel();

  /**
   * **Was ein Tipp auf die Miniatur tut** — oder `null`, wenn der Pinsel in
   * der Mulde steckt.
   *
   * Die vier Bauwerkzeuge (`levelPlan.ts`), die Bausteine (`grid/gridTool.ts`)
   * und eines mehr: `go` baut nichts, sondern stellt **einen selbst** dorthin.
   */
  private brush: GridTool | 'go' | null = null;
  /** In welcher Hand der Pinsel liegt — `null`, solange er in der Mulde steckt. */
  private brushHand: Handedness | null = null;
  /** Ob ein Druck einen Strich malt oder eine Fläche aufzieht. */
  private mode: PaintMode = 'paint';

  private panel: EditorPanel | null = null;
  private palette: Palette | null = null;
  private pin: PlayerPin | null = null;
  /** Die Vorschau: eine Kachel, ein Wandstück, eine Fläche — immer nur eines. */
  private ghostTile: THREE.Mesh | null = null;
  private ghostEdge: THREE.Mesh | null = null;
  private ghostArea: THREE.Mesh | null = null;
  /** Worauf der Zeiger gerade liegt — `null`, wenn er daneben zeigt. */
  private spot: PlanSpot | null = null;
  /**
   * Die Zeigefläche.
   *
   * Sie entsteht **einmal** und wird beim Umbauen nur nachgezogen. Das ist
   * kein Sparen an Objekten, sondern die Bedingung fürs Malen: Der Zeiger
   * merkt sich, worauf gerade gedrückt wird — und ein Ziel, das bei jeder
   * gesetzten Kachel neu entsteht, beendet den Strich, den es gerade zieht.
   */
  private canvas: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
  private grid: THREE.GridHelper | null = null;
  /** Das Licht über dem Modell — sonst wäre es in einer dunklen Welt unlesbar. */
  private lamp: THREE.PointLight | null = null;
  private plate: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null = null;
  /** Der Ausschnitt, für den Teller, Raster und Zeigefläche gerade gebaut sind. */
  private laidOut = '';

  /** Der Strich, der gerade gemalt wird — `null`, wenn keine Taste unten ist. */
  private stroke: { last: PlanSpot } | null = null;
  /**
   * Die erste Ecke einer Fläche — sie überlebt das Loslassen.
   *
   * Damit gehen **beide** Gesten: aufziehen (drücken, ziehen, loslassen) und
   * zweimal tippen. Wer aus der Ferne auf eine Kachel zielt, hält den Arm
   * nicht ruhig genug für einen langen Zug; wer nah davorsteht, will nicht
   * zweimal tippen.
   */
  private corner: PlanSpot | null = null;

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
   * **Ob die Karte draußen ist** — und damit, ob gerade gebaut wird.
   *
   * Das ist der Schalter dieser ganzen Bedienung. Er steht getrennt von der
   * Hüfte, an der die Karte hängt, und das ist der Unterschied zur ersten
   * Fassung: Im Bauplatz waren beide Haken frei, und „hängt nirgends" hieß
   * zwangsläufig „ist in der Hand". In einer Welt mit Werkzeugen am Gürtel
   * hängt sie an gar keinem Haken und wird trotzdem herausgeholt — aus dem
   * Menü.
   */
  private out = false;
  private paletteOut = false;
  /**
   * **An welcher Hüfte Karte und Palette hängen** — `null` heißt: an keiner,
   * weil dort schon ein Werkzeug hängt.
   */
  private mapHip: Handedness | null = null;
  private paletteHip: Handedness | null = null;
  /** Die zusammengefaltete Karte an der Hüfte — sie sagt, wo sie zu holen ist. */
  private folded: THREE.Object3D | null = null;

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

  constructor(private readonly host: EditorHost) {}

  /** Ob die Karte draußen ist — und damit, ob man gerade baut. */
  get editing(): boolean {
    return this.out;
  }

  /** Ob die Karte an einer Hüfte hängt, von der man sie ziehen kann. */
  get onBelt(): boolean {
    return this.mapHip !== null;
  }

  // --- Aufbau ---------------------------------------------------------------

  /**
   * Die Sachen in die Welt stellen. Läuft mit dem Bau der Welt, noch ohne
   * Kontext — angemeldet wird beim Zeiger erst in `attach`.
   */
  build(): void {
    const root = this.host.root();
    this.mini.add(this.content);
    root.add(this.mini);

    const panel = new EditorPanel(this.host.title().toUpperCase(), PANEL_ROWS);
    root.add(panel);
    this.panel = panel;

    const palette = new Palette(PALETTE_DABS);
    root.add(palette);
    this.palette = palette;

    this.folded = foldedMap();
    root.add(this.folded);

    this.plate = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.25, 1),
      new THREE.MeshStandardMaterial({ color: 0x111826, roughness: 0.9 }),
    );
    this.mini.add(this.plate);

    // Die Zeigefläche: unsichtbar dünn, aber sie fängt jeden Strahl — und sie
    // reicht weit über den Plan hinaus, damit man neben ihn bauen kann.
    const canvas = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x39d0ff,
        transparent: true,
        opacity: 0.05,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    canvas.rotation.x = -Math.PI / 2;
    canvas.name = 'plan-canvas';
    this.mini.add(canvas);
    this.canvas = canvas;

    this.ghostTile = ghost(new THREE.PlaneGeometry(TILE * 0.92, TILE * 0.92), true);
    this.mini.add(this.ghostTile);
    this.ghostEdge = ghost(new THREE.BoxGeometry(TILE, PLAN_WALL_H, TILE), false);
    this.mini.add(this.ghostEdge);
    this.ghostArea = ghost(new THREE.PlaneGeometry(1, 1), true);
    this.mini.add(this.ghostArea);

    const pin = new PlayerPin();
    this.mini.add(pin);
    this.pin = pin;

    // **Das Modell bringt sein eigenes Licht mit.**
    // Es hängt nicht im Modell, sondern daneben in der Welt: Ein Licht in
    // einer Gruppe, die auf ein Zwanzigstel geschrumpft ist, leuchtet auch nur
    // ein Zwanzigstel weit. Und es muss sein — im Dunkelhaus ist die Umgebung
    // mit Absicht fast schwarz, und ein Grundriss, den man nur mit der
    // Taschenlampe lesen kann, ist keiner.
    const lamp = new THREE.PointLight(0xf0f6ff, LAMP_POWER, LAMP_RANGE, 2);
    lamp.name = 'plan-lamp';
    lamp.visible = false;
    root.add(lamp);
    this.lamp = lamp;

    this.refresh();
  }

  /** Beim Zeiger anmelden und die Kulisse auf „nicht bearbeiten" stellen. */
  attach(ctx: WorldContext): void {
    for (const key of this.panel?.keys() ?? []) {
      ctx.pointer.add({ object: key.mesh, pokeable: true, onSelect: () => this.pad(key.id) });
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
    const canvas = this.canvas;
    if (canvas) {
      ctx.pointer.add({
        object: canvas,
        onHover: (hit) => this.hover(hit.point),
        onBlur: () => this.hover(null),
        onSelect: (hit) => this.press(this.spotAtPoint(hit.point)),
        onHold: (hit) => this.paint(this.spotAtPoint(hit.point)),
        onRelease: (hit) => this.lift(hit ? this.spotAtPoint(hit.point) : null),
      });
    }
    // **Erst jetzt steht fest, wo etwas hinkann**: Der Gürtel ist bestückt, und
    // was dort schon hängt, gibt keinen Haken mehr her.
    this.mapHip = HANDS.find((side) => this.host.hipFree(side)) ?? null;
    this.paletteHip = HANDS.find((side) => side !== this.mapHip && this.host.hipFree(side)) ?? null;

    // Die Karte hängt am Gürtel, und die Welt steht um einen herum: Es geht
    // als **Welt** los und nicht als Editor.
    this.setEditing(false);
    this.drawPanel();
  }

  dispose(): void {
    const ctx = this.host.ctx();
    if (ctx) {
      for (const key of this.panel?.keys() ?? []) ctx.pointer.remove(key.mesh);
      for (const key of this.palette?.keys() ?? []) ctx.pointer.remove(key.mesh);
      if (this.canvas) ctx.pointer.remove(this.canvas);
    }
    // **Erst das, was an fremden Knochen hängt.** Karte und Palette hängen an
    // den Hüften des Gürtels, und der wird gleich abgeräumt — was dann noch
    // daran steckt, verschwindet mit ihm aus der Szene, ohne je freigegeben
    // worden zu sein.
    if (this.folded) disposeTree(this.folded);
    this.folded = null;
    this.palette?.dispose();
    this.palette = null;
    this.panel = null;
    this.pin = null;
    this.canvas = null;
    this.grid = null;
    this.plate = null;
    this.lamp = null;
    this.miniFloorMat.dispose();
    this.miniWallMat.dispose();
  }

  // --- jedes Bild -----------------------------------------------------------

  update(ctx: WorldContext): void {
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
    if (hip && !this.out && this.mapHip === hip) {
      this.drawMap(ctx, hand, hold);
      return;
    }
    // Alles andere gibt es nur, solange die Karte draußen ist: Eine Palette in
    // der Hand, während man durch seine Welt läuft, hätte nichts, worauf sie
    // malen könnte.
    if (!this.editing) return;
    if (hip && !this.paletteOut && this.paletteHip === hip) {
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
  private letGo(piece: Piece, hold: Hold | null): void {
    if (piece === 'figure') {
      this.pin?.setHeld(false);
      this.dropPin();
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
      // **Nur an ihren eigenen Haken.** In einer Welt mit Werkzeugen am Gürtel
      // hängt die Karte an gar keinem — und ein Modell, das man dort loslässt,
      // wo zufällig eine Hüfte ist, würde einem sonst das Bauen zuklappen.
      if (alone && hip !== null && hip === this.mapHip) this.stowMap();
      return;
    }
    this.carry = null;
    // Nur an den Haken, der ihr gehört: Auf der anderen Hüfte hängt entweder
    // die Karte oder ein Werkzeug.
    if (hip && hip === this.paletteHip) this.stowPalette(hip);
  }

  /** Die drei Stellen, nach denen hier gegriffen werden kann. */
  private targets(): Target<Piece>[] {
    const out: Target<Piece>[] = [];
    const span = Math.max(this.bounds.maxX - this.bounds.minX, this.bounds.maxZ - this.bounds.minZ);
    // **Die Kugel um das Modell plus eine Handbreit**: Ein Grundriss ist flach,
    // und wer über ihm greift, meint ihn — genau greifen müsste man nur, wenn
    // er ein Ding wäre.
    out.push({ id: 'model', at: this.model.at, reach: (span / 2) * this.model.scale + 0.22 });
    if (this.paletteOut) {
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
    const hips: Target<Handedness>[] = [];
    for (const side of HANDS) {
      const slot = this.host.beltSlot(side);
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
  private dropPin(): void {
    const dragged = this.dragged;
    this.dragged = null;
    if (!dragged) return;
    const spot = spotAt(dragged.x, dragged.z);
    if (!this.host.plan().graph.has(spot.tile)) {
      this.host.say('Da ist kein Boden — die Figur bleibt, wo sie war');
      return;
    }
    this.host.goTo(this.host.plan().graph.worldOf(spot.tile));
    this.host.say('Dort stehst du jetzt');
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
    if (this.lamp) {
      this.lamp.position.set(this.model.at.x, this.model.at.y + LAMP_HEIGHT, this.model.at.z);
    }

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
   * Palette der Welt, und ein Pinsel, der zwischen beiden hin- und
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
    const root = this.host.root();
    if (palette.brush.parent !== root) palette.release(root);
    controller.getRay(_ray);
    _at.copy(_ray.origin).addScaledVector(_ray.direction, 0.04);
    root.worldToLocal(_at);
    palette.brush.position.copy(_at);
    controller.targetRay.getWorldQuaternion(_turn);
    root.getWorldQuaternion(_lean).invert();
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
    this.host.say('Karte draußen — jetzt baust du an dieser Welt');
  }

  private drawPalette(hand: Handedness, hold: Hold): void {
    const palette = this.palette;
    if (!palette) return;
    this.paletteOut = true;
    this.host.root().add(palette);
    palette.visible = true;
    palette.scale.setScalar(1);
    this.palettePose = { at: { ...hold.at }, turn: { ...hold.turn } };
    this.holds.set(hand, 'palette');
    this.carry = { hand, from: hold, start: this.palettePose };
  }

  /**
   * **Die Karte weglegen** — und damit wieder in seiner Welt stehen.
   *
   * Zusammengefaltet hängt sie an der Hüfte, an der die Hand sie losgelassen
   * hat. Wo man dabei steht, entscheidet die Figur: Wer sie vorher versetzt
   * hat, steht schon dort, denn versetzt wird sofort und nicht erst hier.
   */
  private stowMap(): void {
    this.setEditing(false);
    this.host.say('Karte weg — du stehst wieder in deiner Welt');
  }

  private stowPalette(side: Handedness | null): void {
    const palette = this.palette;
    if (!palette) return;
    this.paletteOut = false;
    const slot = side === null ? null : this.host.beltSlot(side);
    if (!slot) {
      // Kein Haken für sie (der Gürtel voller Werkzeuge, oder der flache Modus
      // ganz ohne Gürtel): Dann bleibt sie liegen, wo sie ist, und wird
      // unsichtbar — sichtbar herumschweben zu lassen wäre ein Brett, gegen
      // das man auf dem Rückweg stößt.
      palette.visible = false;
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
   * **Die Palette vor den Kopf holen** — für die Welten, in denen sie an
   * keiner Hüfte hängt.
   *
   * Ohne das gäbe es dort keinen Weg an sie heran: Sie hängt an nichts, und
   * ein Brett, das man nicht findet, ist ein Editor ohne Werkzeuge.
   */
  private floatPalette(ctx: WorldContext): void {
    const palette = this.palette;
    if (!palette || this.paletteHip !== null) return;
    ctx.rig.getHeadPosition(_head);
    ctx.rig.getHeadForward(_forward);
    this.host.root().add(palette);
    palette.visible = true;
    palette.scale.setScalar(1);
    this.paletteOut = true;
    this.palettePose = {
      at: { x: _head.x + _forward.x * 0.45, y: _head.y - 0.35, z: _head.z + _forward.z * 0.45 },
      turn: yawTurn(Math.atan2(-_forward.x, -_forward.z)),
    };
  }

  /**
   * **Bearbeiten an oder aus** — und mit ihm die halbe Welt.
   *
   * Was die Kulisse dabei tut, entscheidet die Welt (`editingChanged`): Der
   * Bauplatz macht das Licht an und stellt einen in einen weißen Raum, ein
   * fertiges Haus nimmt nur seine Körper aus der Physik, damit man durch die
   * Wand gehen kann, die man gerade zieht. Hier steht nur, was in **jeder**
   * Welt gleich ist: Modell, Tafel, Palette, Pinsel.
   */
  private setEditing(on: boolean): void {
    this.out = on;
    this.mini.visible = on;
    if (this.panel) this.panel.visible = on;
    if (this.palette) this.palette.visible = on || this.paletteHip !== null;
    if (this.folded) this.folded.visible = !on && this.mapHip !== null;
    // Der Zeiger fragt jedes Ziel nach seiner **eigenen** Sichtbarkeit und
    // nicht nach der seiner Eltern: Eine versteckte Tafel, deren Tasten noch
    // sichtbar sind, fängt weiter jeden Strahl.
    for (const key of this.panel?.keys() ?? []) key.mesh.visible = on;
    for (const key of this.palette?.keys() ?? []) key.mesh.visible = on;
    if (this.canvas) this.canvas.visible = on;
    if (this.lamp) this.lamp.visible = on;

    this.host.editingChanged(on);
    if (on) return;

    this.spot = null;
    this.stroke = null;
    this.corner = null;
    this.drawGhost();
    this.grip = null;
    this.carry = null;
    this.dragged = null;
    this.holds.clear();
    this.foldMap();
    // **Wer die Karte weglegt, räumt auch die Palette weg** — auf die Hüfte,
    // an der sie hing, sonst auf die freie. Eine Palette, die weiter im Raum
    // schwebte, während man wieder durch seine Welt läuft, wäre ein Brett,
    // gegen das man auf dem Rückweg stößt; und unsichtbar herumschweben zu
    // lassen ist noch schlechter — dann sucht man sie beim nächsten Mal.
    this.stowPalette(this.paletteHip);
    if (this.palette) this.palette.visible = this.paletteHip !== null;
  }

  /** Die zusammengefaltete Karte an die Hüfte hängen, an der sie hängt. */
  private foldMap(): void {
    const folded = this.folded;
    const side = this.mapHip;
    if (!folded || !side) return;
    const slot = this.host.beltSlot(side);
    if (!slot) return;
    slot.add(folded);
    folded.position.set(0, 0, 0);
    folded.quaternion.identity();
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
  private spotAtPoint(point: THREE.Vector3): PlanSpot | null {
    if (!this.editing) return null;
    _local.copy(point);
    this.mini.worldToLocal(_local);
    return spotAt(_local.x + this.centre.x, _local.z + this.centre.z);
  }

  private hover(point: THREE.Vector3 | null): void {
    this.spot = point ? this.spotAtPoint(point) : null;
    this.drawGhost();
  }

  /**
   * **Der Druck** — der Anfang eines Strichs oder eine Ecke einer Fläche.
   *
   * Beim Malen wirkt er sofort: Ein Tipp, der erst beim Loslassen etwas tut,
   * fühlt sich träge an. Bei der Fläche wirkt er beim **zweiten** Mal — die
   * erste Ecke ist eine Ankündigung und keine Änderung.
   */
  private press(spot: PlanSpot | null): void {
    if (!spot || !this.editing) return;
    this.spot = spot;
    const brush = this.brush;
    if (brush === null) {
      this.host.say('Erst an der Palette eintunken');
      return;
    }
    if (brush === 'go') {
      this.stepInto(spot);
      return;
    }
    if (this.mode === 'area') {
      const first = this.corner;
      if (first) {
        this.corner = null;
        this.fill(brush, first, spot);
      } else {
        this.corner = spot;
        this.host.say('Erste Ecke — jetzt die zweite');
      }
      this.drawGhost();
      return;
    }
    this.stroke = { last: spot };
    this.change(applyGridTool(this.host.plan(), brush, spot));
    this.drawGhost();
  }

  /**
   * **Gedrückt gehalten** — der Strich läuft weiter, oder die Fläche wächst.
   *
   * Beim Malen wird die Lücke zum letzten Bild mitgefüllt (`strokeSpots`):
   * Eine Hand fährt in einem Sechzigstel leicht über drei Kacheln, und wer nur
   * die unter dem Zeiger setzt, malt gestrichelt.
   */
  private paint(spot: PlanSpot | null): void {
    if (!spot || !this.editing) return;
    this.spot = spot;
    const brush = this.brush;
    if (brush === null || brush === 'go') return;
    if (this.mode === 'area') {
      this.drawGhost();
      return;
    }
    const stroke = this.stroke;
    if (!stroke) return;
    if (stroke.last.tile === spot.tile && stroke.last.dir === spot.dir) {
      this.drawGhost();
      return;
    }
    const spots = strokeSpots(stroke.last, spot);
    stroke.last = spot;
    this.change(applySpots(this.host.plan(), brush, spots));
    this.drawGhost();
  }

  /**
   * **Losgelassen** — der Strich ist zu Ende, oder die Fläche steht.
   *
   * Aufgezogen und zweimal getippt sind hier dasselbe: Wer beim Loslassen
   * woanders steht als beim Drücken, hat aufgezogen und bekommt seine Fläche;
   * wer auf derselben Kachel losläßt, hat getippt, und die Ecke wartet auf den
   * zweiten Tipp.
   */
  private lift(spot: PlanSpot | null): void {
    this.stroke = null;
    const brush = this.brush;
    const first = this.corner;
    if (this.mode !== 'area' || !first || !spot || brush === null || brush === 'go') return;
    if (spot.tile === first.tile) return;
    this.corner = null;
    this.fill(brush, first, spot);
    this.drawGhost();
  }

  /** Die Fläche zwischen zwei Ecken mit dem Pinsel füllen. */
  private fill(brush: GridTool, from: PlanSpot, to: PlanSpot): void {
    this.change(applySpots(this.host.plan(), brush, areaSpots(brush, from, to)));
  }

  /**
   * **Was nach einer Änderung passiert.**
   *
   * Die Mitte des Plans wandert beim Anbauen — das Modell soll trotzdem stehen
   * bleiben (`recentre`). Ohne das springt der Grundriss bei jedem Druck ein
   * Stück zur Seite, und man baut ihm hinterher.
   */
  private change(edit: { changed: boolean; says: string }): void {
    if (!edit.changed) {
      if (edit.says) this.host.say(edit.says);
      return;
    }
    const before = this.centre;
    const after = planCentre(this.host.plan().graph);
    this.model = recentre(this.model, before, after);
    // Und der Griff, mit dem es gerade in der Hand liegt, ebenso: Er rechnet
    // gegen den Stand beim Zugreifen, und der stand noch auf der alten Mitte.
    if (this.grip) this.grip.start = recentre(this.grip.start, before, after);
    this.centre = after;
    this.refresh();
    this.host.planChanged();
    this.host.say(edit.says);
  }

  /**
   * **Hingehen** — auf eine Kachel der Miniatur tippen und dort stehen.
   *
   * Der Grund, warum ein Tischmodell mehr ist als eine Zeichnung: Es ist
   * gleichzeitig die Karte *und* der Weg dorthin. Wer den Gang am anderen Ende
   * gebaut hat, muss ihn nicht ablaufen, um nachzusehen, ob er zu eng ist — er
   * tippt hinein und steht darin.
   */
  private stepInto(spot: PlanSpot): void {
    if (!this.host.plan().graph.has(spot.tile)) {
      this.host.say('Da ist kein Boden');
      return;
    }
    this.host.goTo(this.host.plan().graph.worldOf(spot.tile));
    this.host.say('Hier stehst du');
  }

  /** Die Vorschau unter dem Zeiger — eine Kachel, ein Wandstück, eine Fläche. */
  private drawGhost(): void {
    const tile = this.ghostTile;
    const edge = this.ghostEdge;
    const area = this.ghostArea;
    if (!tile || !edge || !area) return;
    tile.visible = false;
    edge.visible = false;
    area.visible = false;

    const brush = this.brush;
    if (!this.spot || !brush || !this.editing) return;
    const colour = brush === 'go' ? GO_COLOR : gridToolSpec(brush).accent;

    // **Die Fläche gewinnt, solange eine Ecke steht.** Was gleich passiert,
    // ist das Rechteck und nicht die Kachel unter dem Zeiger.
    const first = this.corner;
    if (first && brush !== 'go') {
      const box = spotsBox(areaSpots(brush, first, this.spot));
      if (box) {
        area.visible = true;
        (area.material as THREE.MeshBasicMaterial).color.setHex(colour);
        area.position.set(box.x - this.centre.x, 0.05, box.z - this.centre.z);
        area.scale.set(box.w, box.d, 1);
        return;
      }
    }

    // Beim Hingehen zählt die **Kachel** und nie eine Kante: Man stellt sich
    // auf einen Boden und nicht in eine Wand.
    const spot =
      brush === 'go' ? { tile: this.spot.tile, dir: null } : aimOf(brush as PlanTool, this.spot);
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
    // Ein Werkzeugwechsel mitten in einer Fläche ist ein Abbruch: Die
    // stehengebliebene Ecke gehörte zum alten Pinsel.
    this.corner = null;
    if (id === Palette.REST) {
      this.brush = null;
      this.brushHand = null;
      this.palette?.stow();
      this.host.say('Pinsel zurück — jetzt baut ein Tipp nichts mehr');
    } else {
      this.brush = id as GridTool | 'go';
      this.brushHand = hit.hand ?? this.brushHand;
      this.host.say(
        id === 'go' ? 'Auf eine Kachel tippen — dort stehst du dann' : gridToolSpec(id).sub,
      );
    }
    this.drawPanel();
    this.drawGhost();
  }

  // --- die Tafel ------------------------------------------------------------

  private pad(id: string): void {
    const ctx = this.host.ctx();
    switch (id) {
      case 'near':
        if (ctx) this.bring(ctx);
        this.host.say('Modell vor dir, flach gelegt');
        break;
      case 'bigger':
      case 'smaller':
        this.model = clampModel({
          ...this.model,
          scale: this.model.scale * (id === 'bigger' ? 1.35 : 1 / 1.35),
        });
        break;
      case 'turn':
        this.model = clampModel({ ...this.model, turn: turnedBy(this.model, Math.PI / 8) });
        break;
      case 'paint':
      case 'area':
        this.setMode(id);
        break;
      case 'doors':
        this.swingDoors();
        break;
      case 'away':
        this.putAway();
        break;
    }
    this.drawPanel();
  }

  /** Von Malen auf Fläche und zurück. */
  private setMode(mode: PaintMode): void {
    this.mode = mode;
    this.corner = null;
    this.stroke = null;
    this.host.say(paintModeSpec(mode).sub);
    this.drawGhost();
  }

  /**
   * Die Karte weglegen, ohne eine Hüfte zu treffen — für den flachen Modus, in
   * dem es keine Hände gibt, die etwas an einen Gürtel halten könnten.
   */
  putAway(): void {
    if (!this.editing) return;
    this.stowMap();
  }

  /**
   * **Der Weg zur Karte, wenn keine Hüfte sie hergibt** — und der einzige in
   * jeder Welt, deren Gürtel schon voll ist.
   *
   * Die Palette kommt mit: Wo sie an keinem Haken hängt, findet man sie sonst
   * nirgends, und ein Editor ohne Werkzeuge ist ein Grundriss zum Ansehen.
   */
  takeOut(ctx: WorldContext): void {
    if (this.editing) return;
    this.setEditing(true);
    this.bring(ctx);
    this.floatPalette(ctx);
    this.host.say('Karte draußen — jetzt baust du an dieser Welt');
  }

  /** Alle Türen auf oder alle zu — in der Karte und im Gebauten zugleich. */
  private swingDoors(): void {
    const graph = this.host.plan().graph;
    const ids = [...graph.doorIds()];
    if (ids.length === 0) {
      this.host.say('Noch keine Tür im Plan');
      return;
    }
    const shut = ids.some((id) => graph.door(id)?.open === true);
    for (const id of ids) graph.setDoor(id, { open: !shut });
    this.refresh();
    this.host.planChanged();
    this.host.say(shut ? 'Alle Türen zu' : 'Alle Türen auf');
  }

  private drawPanel(): void {
    const brush = this.brush;
    const spec = brush === null ? null : brush === 'go' ? GO_SPEC : gridToolSpec(brush);
    this.palette?.setActive(
      brush ?? Palette.REST,
      spec ? spec.label : 'Pinsel liegt',
      spec ? spec.accent : 0x8892a6,
    );
    this.panel?.setActive(this.mode);
  }

  // --- die Miniatur ---------------------------------------------------------

  /**
   * **Alles neu, aus einer Liste.**
   *
   * Ein Editor, der einzelne Kacheln nachpflegt, ist einer, in dem nach dem
   * dreißigsten Handgriff ein Brett zu viel steht. Bei ein paar hundert
   * Quadern kostet ein vollständiger Neubau nichts, und er kann nicht
   * auseinanderlaufen.
   *
   * Was **nicht** neu entsteht, sind Zeigefläche, Vorschau und Figur: Sie
   * hängen neben dem Inhalt in derselben Gruppe. Eine Zeigefläche, die bei
   * jeder gesetzten Kachel neu entstünde, nähme dem Zeiger mitten im Strich
   * das Ziel weg — und der Strich wäre nach einer Kachel zu Ende.
   */
  refresh(): void {
    const plan = this.host.plan();
    if (this.builtVersion === plan.version) return;
    this.builtVersion = plan.version;
    this.centre = planCentre(plan.graph);
    this.bounds = planBounds(plan.graph, 1);
    this.field = planBounds(plan.graph, FIELD_MARGIN);

    clear(this.content);
    for (const solid of plan.solids()) {
      this.content.add(
        box(solid, solid.kind === 'floor' ? this.miniFloorMat : this.miniWallMat, this.centre),
      );
    }
    this.layOut();
    this.drawGhost();
  }

  /**
   * Teller, Raster und Zeigefläche auf die neue Größe.
   *
   * Der **Teller** ist der Plan plus eine Kachel — er trägt, was steht. Das
   * **Raster** und die **Zeigefläche** reichen weiter (`FIELD_MARGIN`), und
   * genau das ist die Einladung: Wo Linien liegen, kann man bauen, auch wenn
   * dort noch nichts ist.
   */
  private layOut(): void {
    // **Nur, wenn sich der Ausschnitt wirklich geändert hat.** Beim Malen läuft
    // ein Umbau je Bild; Teller, Raster und Zeigefläche bleiben dabei fast
    // immer gleich groß, und ein `GridHelper`, der sechzigmal in der Sekunde
    // neu entsteht, ist reine Arbeit für nichts.
    const key = `${this.bounds.minX},${this.bounds.minZ},${this.bounds.maxX},${this.bounds.maxZ}`;
    if (key === this.laidOut) return;
    this.laidOut = key;

    const bounds = this.bounds;
    const midX = (bounds.minX + bounds.maxX) / 2 - this.centre.x;
    const midZ = (bounds.minZ + bounds.maxZ) / 2 - this.centre.z;
    const plate = this.plate;
    if (plate) {
      plate.geometry.dispose();
      plate.geometry = new THREE.BoxGeometry(
        bounds.maxX - bounds.minX,
        0.25,
        bounds.maxZ - bounds.minZ,
      );
      plate.position.set(midX, -0.28, midZ);
    }

    const field = this.field;
    const width = field.maxX - field.minX;
    const depth = field.maxZ - field.minZ;
    const fieldX = (field.minX + field.maxX) / 2 - this.centre.x;
    const fieldZ = (field.minZ + field.maxZ) / 2 - this.centre.z;

    const canvas = this.canvas;
    if (canvas) {
      canvas.geometry.dispose();
      canvas.geometry = new THREE.PlaneGeometry(width, depth);
      canvas.position.set(fieldX, 0.005, fieldZ);
    }

    // Der Rasterhelfer ist quadratisch; er wird deshalb neu gebaut statt
    // skaliert — eine gestreckte Kachel wäre keine mehr, und an ihr zielt man
    // vorbei.
    if (this.grid) {
      this.mini.remove(this.grid);
      disposeTree(this.grid);
    }
    const span = Math.max(width, depth);
    const grid = new THREE.GridHelper(
      span,
      Math.max(1, Math.round(span / TILE)),
      0x39d0ff,
      0x2b4a6b,
    );
    grid.position.set(fieldX, 0.01, fieldZ);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.22;
    this.mini.add(grid);
    this.grid = grid;
  }

  // --- das Menü -------------------------------------------------------------

  /**
   * Dieselben Handgriffe am Handgelenk — für den flachen Modus, in dem es
   * keine Hüfte gibt, an die man greifen könnte.
   */
  menu(): MenuEntry[] {
    const tools: MenuEntry[] = PLAN_TOOLS.map((tool) => ({
      id: `plan-${tool.id}`,
      label: tool.label,
      sub: tool.sub,
      icon: 'cube',
      accent: tool.accent,
      checked: this.brush === tool.id,
      run: () => this.pick(tool.id),
    }));
    return [
      {
        id: 'plan-map',
        label: this.editing ? 'Karte weglegen' : 'Karte holen',
        sub: 'Draußen wird gebaut, weggelegt steht man in der Welt',
        icon: 'teleport',
        accent: 0x39d0ff,
        run: () => {
          const ctx = this.host.ctx();
          if (!ctx) return;
          if (this.editing) this.putAway();
          else this.takeOut(ctx);
        },
      },
      {
        id: 'plan-mode',
        label: 'Wie gebaut wird',
        sub: 'Malen oder Fläche',
        icon: 'cube',
        accent: 0xffc857,
        children: PAINT_MODES.map((mode) => ({
          id: `plan-mode-${mode.id}`,
          label: mode.label,
          sub: mode.sub,
          icon: 'cube' as const,
          accent: mode.accent,
          checked: this.mode === mode.id,
          run: () => {
            this.setMode(mode.id);
            this.drawPanel();
          },
        })),
      },
      ...tools,
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
            run: () => this.pick(kind),
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
        run: () => this.pick('go'),
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
          this.corner = null;
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
          const ctx = this.host.ctx();
          if (ctx) this.bring(ctx);
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
    ];
  }

  /** Ein Werkzeug aus dem Menü — dasselbe wie Eintunken, nur ohne Palette. */
  private pick(id: GridTool | 'go'): void {
    this.brush = id;
    this.corner = null;
    this.drawPanel();
    this.drawGhost();
  }
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
 * Die Tafel am Modell: was mit dem Modell selbst passiert — und **wie**
 * gebaut wird.
 *
 * Womit gebaut wird, steht an der Palette; man holt sich eine Farbe, indem man
 * eintunkt. Malen und Fläche sind dagegen keine Farbe, sondern eine Haltung —
 * dieselbe Kachel, ein anderer Handgriff —, und deshalb stehen sie hier neben
 * dem, was mit dem Modell geschieht.
 */
const PANEL_ROWS: readonly (readonly PanelKey[])[] = [
  [
    { id: 'near', label: 'Zu mir', color: 0xffc857 },
    { id: 'bigger', label: 'Größer', color: 0x9ad9ff },
    { id: 'smaller', label: 'Kleiner', color: 0x9ad9ff },
    { id: 'turn', label: 'Drehen', color: 0x9ad9ff },
  ],
  [
    { id: 'paint', label: 'Malen', color: 0x39d0ff },
    { id: 'area', label: 'Fläche', color: 0xffc857 },
    { id: 'doors', label: 'Türen', color: 0xe58aa8 },
    { id: 'away', label: 'Weglegen', color: 0x8892a6 },
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
 * Zweimal aufgepasst: Die Wurzel soll bleiben (deshalb Kind für Kind), und die
 * beiden Materialien der Miniatur teilen sich alle Quader (deshalb
 * `disposeShapes` und nicht `disposeTree`).
 */
function clear(group: THREE.Group): void {
  for (const child of [...group.children]) disposeShapes(child);
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

/** Der Kasten um eine Liste von Zeigepunkten, in Planmetern — für die Vorschau. */
function spotsBox(
  spots: readonly PlanSpot[],
): { x: number; z: number; w: number; d: number } | null {
  if (spots.length === 0) return null;
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const spot of spots) {
    minX = Math.min(minX, tileCentreX(spot.tile));
    maxX = Math.max(maxX, tileCentreX(spot.tile));
    minZ = Math.min(minZ, tileCentreZ(spot.tile));
    maxZ = Math.max(maxZ, tileCentreZ(spot.tile));
  }
  return {
    x: (minX + maxX) / 2,
    z: (minZ + maxZ) / 2,
    w: maxX - minX + TILE * 0.96,
    d: maxZ - minZ + TILE * 0.96,
  };
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
const _ray = new THREE.Ray();
const _turn = new THREE.Quaternion();
const _lean = new THREE.Quaternion();
