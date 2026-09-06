import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { gripFrame } from './gripFit';
import type { HoldPose } from './toolPose';
import type { Vec3 } from './aim';
import {
  NO_CELL,
  cellAtPoint,
  cellAtRay,
  cellCentre,
  pageCount,
  turnPage,
  type Cell,
  type Reach,
} from './bagGrid';
import { GRAB_GLOW, GRAB_TINT } from '../../../core/colors';
import { playPick, playTone } from '../../../core/Audio';
import { TextPlane } from '../../../ui/TextPlane';
import { BAG_ITEMS, PROP_LABELS, createPropShape, type PropKind } from '../props';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Die Farbe des Beutels — dieselbe wie die seiner Seite im Handgelenk-Menü. */
const ACCENT = 0xffc857;

/** Wie viele Fächer eine Seite hat: drei nebeneinander, zwei hintereinander. */
const COLS = 3;
const ROWS = 2;
const PER_PAGE = COLS * ROWS;
/** Kantenlänge eines Fachs, in Metern. */
const CELL = 0.052;
/** Und so groß ist das Ding darin, über die längste Kante gemessen. */
const ITEM = 0.036;
/** Höhe der Rasterebene über dem Ursprung des Beutels: die Öffnung. */
const MOUTH = 0.035;
/** Der Radius der Öffnung — das Raster muss hineinpassen. */
const RIM = 0.13;
/** So weit über und unter der Rasterebene zählt eine Hand noch als „darin". */
const REACH_UP = 0.13;
const REACH_DOWN = 0.06;
/** Und so weit darf sie seitlich neben der Mitte eines Fachs sein. */
const REACH_SIDE = CELL * 0.6;
/** Wie weit die Ziellinie reichen darf: eine Armlänge und etwas Luft. */
const RAY_RANGE = 1.6;

/**
 * Wo die beiden Blätterpfeile stehen: neben dem Raster — und noch **innen**.
 *
 * Der Beutel ist ein Trichter, kein Zylinder: auf der Höhe der Felder ist er
 * schon anderthalb Zentimeter enger als am Saum. Ein Pfeil, der nach dem
 * Saumradius gesetzt wird, steckt deshalb im Leder statt im Beutel — was der
 * Test dazu nachrechnet (`mouthRadiusAt`), weil man es von oben nicht sieht.
 */
const ARROW_X = (COLS * CELL) / 2 + 0.016;
/** Wie groß ein Pfeilfeld ist. */
const ARROW_TILE = { width: 0.028, depth: 0.042 };
/** Und wo die Seitenpunkte liegen: vor dem Raster, zur Hand hin. */
const DOTS_Z = (ROWS * CELL) / 2 + 0.024;
const DOT_RADIUS = 0.0035;

/** Höhe der Felder unter den Dingen und der Miniaturen darüber. */
const TILE_Y = MOUTH - 0.026;
const ITEM_Y = MOUTH - 0.012;

/**
 * Das Profil des offenen Beutels: Halbmesser über Höhe, von unten nach oben.
 * Um diese Linie herum wird der Sack gedreht (`buildOpen`).
 */
const OPEN_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.001, -0.17],
  [0.075, -0.16],
  [0.125, -0.1],
  [0.128, -0.02],
  [0.115, 0.01],
  [RIM, MOUTH],
];

/**
 * Wie weit der Beutel auf einer Höhe innen ist.
 *
 * Wozu: Was in der Öffnung liegt, wird nach dem **Saum** gedacht — und der ist
 * das Weiteste am ganzen Beutel. Schon zwei Zentimeter tiefer, dort, wo die
 * Felder liegen, ist er anderthalb Zentimeter enger. Der erste Blätterpfeil
 * stand deshalb im Leder, von oben unsichtbar. Seitdem rechnet der Test die
 * Öffnung nach, statt sich auf den Saum zu verlassen.
 */
export function mouthRadiusAt(y: number): number {
  const first = OPEN_PROFILE[0]!;
  const last = OPEN_PROFILE[OPEN_PROFILE.length - 1]!;
  if (y <= first[1]) return first[0];
  if (y >= last[1]) return last[0];
  for (let i = 1; i < OPEN_PROFILE.length; i += 1) {
    const [radius, top] = OPEN_PROFILE[i]!;
    if (y > top) continue;
    const [below, bottom] = OPEN_PROFILE[i - 1]!;
    const share = (y - bottom) / (top - bottom);
    return below + (radius - below) * share;
  }
  return last[0];
}

/**
 * Wie die Öffnung eingeteilt ist — für den Beutel selbst und für den Test, der
 * nachrechnet, ob das alles hineinpasst.
 */
export const BAG_LAYOUT = {
  cols: COLS,
  rows: ROWS,
  perPage: PER_PAGE,
  cell: CELL,
  /** Kantenlänge eines Feldes unter einem Ding. */
  tile: CELL * 0.86,
  tileY: TILE_Y,
  arrowX: ARROW_X,
  arrowTile: ARROW_TILE,
  dotsZ: DOTS_Z,
  dotRadius: DOT_RADIUS,
} as const;

/** Wie schnell sich die Miniaturen drehen, in Radiant je Sekunde. */
const SPIN = 0.7;

/** Was von der Rasterebene aus als „gemeint" zählt — für Finger und Strahl. */
const REACH: Reach = { plane: MOUTH, up: REACH_UP, down: REACH_DOWN, side: REACH_SIDE };

/**
 * Der **Saum als Griff**, im Rahmen jedes Griffs (`gripFit.ts`: Achse auf +Y,
 * Vorne auf -Z), im Raum des Werkzeugs: das Stück Saum im Griffpunkt, als
 * Zylinder quer (x) — gehalten wie eine **offene Kappe**, in die man etwas
 * hineinlegt: die Hand liegt waagerecht unter dem Saum, die Handfläche nach
 * oben (der Handrücken zeigt nach unten, -y), die Finger greifen vorn über den
 * Saum hinein, und der Daumen liegt außen am Saum entlang — bei der rechten
 * Hand nach rechts (+x), die Daumenseite. Die erste Fassung hatte die Hand
 * senkrecht wie an einem Eimer, und das sah nach einem Eimer aus. Daraus
 * rechnet `core/gripFist.test.ts` die Faust (`BAG_HAND_POSE`) — **ohne**
 * Zielkorrektur, wie alles, was in der Faust sitzt.
 */
export const BAG_GRIP: HoldPose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: gripFrame({ x: 1, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }),
};
/** Wo der Saum in der Hand liegt: eine Spur unter und vor dem Griffpunkt. */
export const BAG_HOLD_POSITION: Vec3 = { x: 0, y: -0.02, z: 0.02 };

const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _head = new THREE.Vector3();
const _ray = new THREE.Ray();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/** Ein Fach des Rasters: was darin liegt, wo es liegt, und das Feld darunter. */
interface Slot {
  kind: PropKind;
  item: THREE.Object3D;
  tile: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  /** Die Seite, auf der es liegt, und der Platz darauf. */
  page: number;
  place: number;
}

/** Einer der beiden Blätterpfeile: wohin er zeigt und was ihn leuchten lässt. */
interface Arrow {
  step: number;
  head: THREE.Mesh;
  tile: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
}

/**
 * **Der magische Beutel** — dasselbe wie seine Seite im Handgelenk-Menü, nur
 * als Gegenstand.
 *
 * Am Gürtel hängt ein zugezogener Lederbeutel. In der Hand geht er auf, und
 * darin liegt, was er hergibt: ein **Raster** kleiner Gegenstände, jeder das
 * Ding selbst und nicht seine Strichzeichnung. Die andere Hand sucht sich
 * eines aus — sie greift hinein oder **zeigt** aus dem Sessel darauf —, das
 * Fach leuchtet und sagt oben, was darin liegt, und **Greifen** holt das Ding
 * in Originalgröße heraus, genau dorthin, wo die Hand gerade ist.
 *
 * Warum überhaupt, wo es die Menüseite doch schon gibt: Ein Menü ist ein Ort,
 * an den man geht. Ein Beutel ist etwas, das man dabeihat — man hält ihn hin,
 * greift hinein, stellt etwas auf und greift noch einmal hinein, ohne
 * dazwischen jedes Mal ein Panel zu öffnen und eine Seite tief zu blättern. Und
 * ein Ikosaeder sieht als Ikone wie ein Zwölfeck aus; im Beutel liegt er da und
 * dreht sich.
 *
 * Drei Dinge sind dabei nicht selbstverständlich:
 *
 * Erstens **zielt** er nicht (`alignToAim = false`): er sitzt in der Faust wie
 * ein Handschuh und nicht auf dem Zeigestrahl wie eine Waffe. Sonst aber
 * bewegt er sich wie **jedes andere Werkzeug**: er steckt im Griff und macht
 * mit, was die Hand tut — Gieren, Nicken *und* Rollen.
 *
 * Zwei Runden lang hing er stattdessen **aufrecht im Raum**: eine eigene
 * Rechnung nahm der Hand das Rollen weg, damit die Öffnung oben bleibt. Das
 * las sich vernünftig und fühlte sich falsch an — ein Ding in der Hand, das
 * einer Drehung des Handgelenks nicht folgt, ist keines, das man hält, sondern
 * eines, das an einem klebt; und weil das Raster darin an *seiner* Drehung
 * hängt, kippte es dabei gegen die Finger, die hineingreifen. Wer ihn ausschütten
 * will, darf ihn ausschütten.
 *
 * Zweitens liegt sein Vorrat auf **Seiten** (`bagGrid.ts`): sechs Fächer,
 * daneben zwei Pfeile, davor ein Punkt je Seite. Alle siebzehn Sorten auf
 * einmal hieß siebzehn Fächer von zweieinhalb Zentimetern, dicht an dicht in
 * einer Öffnung von einer Handbreite — daneben zu greifen war der Normalfall.
 * Sechs große Fächer trifft man, und hinter der letzten Seite kommt wieder die
 * erste.
 *
 * Drittens gehört die **greifende Hand** dem Beutel, solange sie über einem
 * Fach oder einem Pfeil steht (`claimsHand`). Sonst risse derselbe Griff, mit
 * dem man in den Beutel fasst, die Kiste hinter ihm an sich — und in einem
 * vollen Labor steht immer eine Kiste hinter ihm.
 */
export class MagicBagTool extends Tool {
  override readonly toolId = 'bag';
  override readonly label = 'Magischer Beutel';

  /** Der Beutel selbst — gegen das Werkzeug versetzt, damit sein Saum im Griffpunkt liegt. */
  private readonly body = new THREE.Group();
  private readonly closed = new THREE.Group();
  private readonly open = new THREE.Group();
  private readonly slots: Slot[] = [];
  private readonly arrows: Arrow[] = [];
  private readonly dots: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>[] = [];
  /**
   * Die Stellen, auf die gezeigt werden kann, in einer Liste: erst die sechs
   * Fächer der Seite, dann die beiden Pfeile. Eine Liste, weil das Suchen
   * dann eine einzige Rechnung ist — welches davon getroffen wurde, sagt
   * hinterher der Platz darin.
   */
  private readonly spots: Cell[] = [];
  private readonly label3d: TextPlane;
  private spin = 0;
  /** Welche Seite aufliegt, und wie viele es sind. */
  private page = 0;
  private readonly pages = pageCount(BAG_ITEMS.length, PER_PAGE);
  /** Die Stelle, auf die die andere Hand gerade zeigt — `NO_CELL`: keine. */
  private hovered = NO_CELL;
  /** Was auf dem Schild steht — damit es nicht jedes Bild neu gemalt wird. */
  private labelled: string | null = null;

  constructor() {
    super();
    this.name = 'tool-bag';
    this.icon = 'bag';
    this.accent = ACCENT;
    this.hint = 'Fach anzeigen oder hineingreifen, dann greifen; die Pfeile blättern';
    // Er sitzt in der Faust und zielt nicht — sonst bewegt er sich wie jedes
    // andere Werkzeug: er liegt im Griffraum und folgt der Hand in allen drei
    // Achsen.
    this.alignToAim = false;
    this.holdPosition.set(BAG_HOLD_POSITION.x, BAG_HOLD_POSITION.y, BAG_HOLD_POSITION.z);

    // **Von außen** gehalten, am Saum: der Beutel hängt vor der Hand, und sein
    // Saum läuft durch den Griffpunkt — dort liegt die Faust darum, waagerecht
    // wie an einer offenen Kappe, Handfläche oben, Finger über den Saum hinein
    // (`BAG_GRIP`, `BAG_HAND_POSE`). Alles,
    // woraus er besteht, hängt deshalb um einen Saumhalbmesser nach vorn und
    // um die Höhe der Öffnung nach unten versetzt (`body`); gerechnet wird mit
    // dem Beutel selbst (`spotUnder`), nicht mit dem Werkzeug.
    this.body.position.set(0, -MOUTH, -RIM);
    this.add(this.body);
    this.body.add(this.closed, this.open);
    this.buildClosed();
    this.buildOpen();
    this.buildGrid();
    this.buildPager();

    this.label3d = new TextPlane({
      width: 0.17,
      height: 0.055,
      title: '',
      accent: ACCENT,
      align: 'center',
    });
    this.label3d.position.set(0, MOUTH + 0.17, 0);
    this.label3d.visible = false;
    this.body.add(this.label3d);

    this.showPage();
    this.setOpen(false);
  }

  // --- Gestalt --------------------------------------------------------------

  private leather(color: number): THREE.MeshStandardMaterial {
    return new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
  }

  /** Der zugezogene Beutel: ein Sack mit eingeschnürtem Hals. */
  private buildClosed(): void {
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.001, -0.17),
      new THREE.Vector2(0.075, -0.16),
      new THREE.Vector2(0.125, -0.1),
      new THREE.Vector2(0.13, -0.03),
      new THREE.Vector2(0.09, 0.015),
      new THREE.Vector2(0.038, 0.035),
      // Über der Kordel steht der Stoff auf und fällt wieder zusammen: erst die
      // Krause, dann zu. Ohne den letzten Punkt bliebe oben ein Loch, und ein
      // Beutel mit einem Loch ist ein Becher.
      new THREE.Vector2(0.052, 0.058),
      new THREE.Vector2(0.012, 0.064),
    ];
    const sack = new THREE.Mesh(new THREE.LatheGeometry(profile, 26), this.leather(0x7a5230));
    this.closed.add(sack);
    this.closed.add(this.cord(0.042, 0.034));
  }

  /** Und der offene: derselbe Sack, dessen Hals sich zum Rand weitet. */
  private buildOpen(): void {
    const profile = OPEN_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
    const sack = new THREE.Mesh(new THREE.LatheGeometry(profile, 30), this.leather(0x7a5230));
    this.open.add(sack);
    this.open.add(this.cord(RIM - 0.008, MOUTH - 0.012));

    // Der Grund des Beutels ist nicht schwarz, sondern glimmt: ein offener
    // Sack, in dem nichts leuchtet, sieht in der Brille aus wie ein Loch.
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(RIM * 0.92, 30),
      new THREE.MeshBasicMaterial({
        color: 0x2b1a4a,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = MOUTH - 0.075;
    this.open.add(glow);
  }

  /** Die Kordel um den Hals — sie sagt, dass das hier ein Beutel ist. */
  private cord(radius: number, height: number): THREE.Mesh {
    const cord = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.007, 8, 26),
      new THREE.MeshStandardMaterial({ color: GRAB_TINT, roughness: 0.6, metalness: 0.1 }),
    );
    cord.rotation.x = Math.PI / 2;
    cord.position.y = height;
    return cord;
  }

  /** Ein Feld unter einem Ding oder einem Pfeil: es leuchtet, wenn es gemeint ist. */
  private tile(
    width: number,
    depth: number,
  ): THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
    const tile = new THREE.Mesh(
      new THREE.PlaneGeometry(width, depth),
      new THREE.MeshBasicMaterial({
        color: ACCENT,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      }),
    );
    tile.rotation.x = -Math.PI / 2;
    tile.position.y = TILE_Y;
    return tile;
  }

  /**
   * Das Raster in der Öffnung: ein Fach je Sorte, mit dem Ding selbst darin —
   * sechs davon zur Zeit, der Rest liegt auf den anderen Seiten.
   *
   * Die Miniatur ist **derselbe** Gegenstand, den das Greifen herausholt — aus
   * `createPropShape` gebaut und auf Fachgröße heruntergerechnet. Eine eigens
   * gebaute hübschere Kopie zeigte irgendwann etwas anderes als das, was
   * herauskommt, und das ist bei einem Beutel die einzige Frage, die zählt.
   */
  private buildGrid(): void {
    for (let place = 0; place < PER_PAGE; place += 1) {
      this.spots.push(cellCentre(place, COLS, ROWS, CELL));
    }

    BAG_ITEMS.forEach(([kind], index) => {
      const page = Math.floor(index / PER_PAGE);
      const place = index % PER_PAGE;
      const at = this.spots[place]!;

      const tile = this.tile(CELL * 0.86, CELL * 0.86);
      tile.position.x = at.x;
      tile.position.z = at.z;
      this.open.add(tile);

      const item = miniature(kind);
      item.position.set(at.x, ITEM_Y, at.z);
      this.open.add(item);

      this.slots.push({ kind, item, tile, page, place });
    });
  }

  /**
   * Die Blätterei: links und rechts ein Pfeil, davor ein Punkt je Seite.
   *
   * Die Pfeile sind Stellen wie die Fächer auch — angezeigt oder angefasst,
   * dann greifen. Es gibt sie nur, wenn es etwas zu blättern gibt: passt alles
   * auf eine Seite, hat ein Pfeil nichts zu tun und steht auch nicht herum.
   */
  private buildPager(): void {
    if (this.pages < 2) return;

    for (const step of [-1, 1]) {
      const tile = this.tile(ARROW_TILE.width, ARROW_TILE.depth);
      tile.position.x = step * ARROW_X;
      this.open.add(tile);

      const shape = new THREE.Shape();
      shape.moveTo(step * 0.012, 0);
      shape.lineTo(-step * 0.008, 0.014);
      shape.lineTo(-step * 0.008, -0.014);
      shape.closePath();
      const head = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({ color: ACCENT, side: THREE.DoubleSide }),
      );
      head.rotation.x = -Math.PI / 2;
      head.position.set(step * ARROW_X, TILE_Y + 0.002, 0);
      this.open.add(head);

      this.arrows.push({ step, head, tile });
      this.spots.push({ x: step * ARROW_X, z: 0 });
    }

    // Ein Punkt je Seite, vor dem Raster: er sagt nicht, was auf den anderen
    // Seiten liegt, aber dass es sie gibt — und das ist der ganze Unterschied
    // zwischen einem Beutel mit drei Seiten und einem, der siebzehn Sorten
    // verschluckt hat.
    const geometry = new THREE.CircleGeometry(DOT_RADIUS, 12);
    for (let page = 0; page < this.pages; page += 1) {
      const dot = new THREE.Mesh(
        geometry.clone(),
        new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.3 }),
      );
      dot.rotation.x = -Math.PI / 2;
      dot.position.set((page - (this.pages - 1) / 2) * 0.014, TILE_Y, DOTS_Z);
      this.open.add(dot);
      this.dots.push(dot);
    }
    geometry.dispose();
  }

  // --- offen und zu --------------------------------------------------------

  private setOpen(open: boolean): void {
    this.closed.visible = !open;
    this.open.visible = open;
    if (!open) {
      this.hovered = NO_CELL;
      this.labelled = null;
      this.label3d.visible = false;
    }
  }

  override onTake(_controller: ControllerState, _host: ToolHost): void {
    this.setOpen(true);
  }

  override onStow(_host: ToolHost): void {
    this.setOpen(false);
  }

  override onThrow(host: ToolHost, _speed: number): void {
    this.onStow(host);
  }

  /**
   * Auf der Werkzeugseite und am Griffstand hängt eine Kopie, die niemand hält
   * — die soll denselben offenen Beutel zeigen wie das Spiel.
   */
  override showHeldBy(hand: Handedness | null): void {
    this.setOpen(hand !== null);
  }

  /**
   * Solange die freie Hand auf ein Fach oder einen Pfeil zeigt, gehört sie dem
   * Beutel. Sonst zöge derselbe Griff die Kiste dahinter an sich.
   */
  override claimsHand(hand: Handedness): boolean {
    return this.hovered !== NO_CELL && this.heldBy !== null && hand !== this.heldBy;
  }

  // --- Betrieb --------------------------------------------------------------

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    const held = Boolean(this.heldBy) && !this.parked;
    if (!held || !controller) {
      this.setOpen(false);
      return;
    }
    this.setOpen(true);
    // Gleich nachgezogen: `applyHold` hat den Beutel in diesem Bild in die Hand
    // gestellt, und gemessen wird gegen diese Lage — nicht gegen die von
    // gestern.
    this.updateWorldMatrix(true, false);

    this.spin = (this.spin + dt * SPIN) % (Math.PI * 2);
    const reaching = this.reachingHand(host);
    const before = this.hovered;
    this.hovered = reaching ? this.spotUnder(reaching) : NO_CELL;
    // Ein Stups je Stelle: In einem Beutel sieht man die eigene Hand nur halb,
    // und was man nicht sieht, muss man spüren.
    if (this.hovered !== NO_CELL && this.hovered !== before) reaching?.pulse(0.18, 14);
    this.showSpots(host);

    if (this.hovered === NO_CELL || !reaching?.squeeze.justPressed) return;
    const arrow = this.arrows[this.hovered - PER_PAGE];
    if (arrow) {
      this.flip(arrow.step, reaching);
      return;
    }
    const slot = this.slotAt(this.hovered);
    if (slot) this.take(host, slot, reaching);
  }

  /** Die Hand, die gerade nicht den Beutel hält — sie greift hinein. */
  private reachingHand(host: ToolHost): ControllerState | null {
    const hand = this.heldBy;
    if (!hand) return null;
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const controller = host.ctx.input.get(other);
    return controller?.tracked ? controller : null;
  }

  /**
   * Auf welche Stelle die andere Hand zeigt — `NO_CELL`, wenn auf keine.
   *
   * Zwei Wege, und der nähere gewinnt: Steht die **Fingerspitze** in der
   * Öffnung, gilt das Fach darunter. Sonst zählt die **Ziellinie** — dieselbe,
   * mit der überall sonst auf etwas gezeigt wird. Der Strahl kam dazu, weil
   * die Hand für den anderen Weg bis in den Beutel muss: das ist genau richtig,
   * wenn man den Beutel vor sich hält, und mühsam, sobald er hängt, während
   * die andere Hand schon etwas anderes tut.
   *
   * Ein leeres Fach der letzten Seite ist keine Stelle: dort ist nichts zu
   * holen, und was nichts hergibt, nimmt auch der greifenden Hand nichts weg.
   */
  private spotUnder(controller: ControllerState): number {
    let spot = NO_CELL;
    if (controller.getFingertip(_tip)) {
      this.body.worldToLocal(_local.copy(_tip));
      spot = cellAtPoint(_local, this.spots, REACH);
    }
    if (spot === NO_CELL) spot = this.spotOnRay(controller);
    if (spot === NO_CELL || spot >= PER_PAGE) return spot;
    return this.slotAt(spot) ? spot : NO_CELL;
  }

  /** Dasselbe für die Ziellinie: der Strahl, in den Raum des Beutels gerechnet. */
  private spotOnRay(controller: ControllerState): number {
    controller.getRay(_ray);
    this.body.worldToLocal(_origin.copy(_ray.origin));
    this.body.getWorldQuaternion(_quat).invert();
    _dir.copy(_ray.direction).applyQuaternion(_quat).normalize();
    return cellAtRay(_origin, _dir, this.spots, REACH, RAY_RANGE);
  }

  /** Was auf dieser Seite an dieser Stelle liegt — `null` für ein leeres Fach. */
  private slotAt(place: number): Slot | null {
    const index = this.page * PER_PAGE + place;
    return this.slots[index] ?? null;
  }

  /** Eine Seite weiter: die Fächer wechseln, die Punkte auch. */
  private flip(step: number, controller: ControllerState): void {
    this.page = turnPage(this.page, step, this.pages);
    this.showPage();
    // Das Schild trägt gleich eine andere Seitenzahl — und wenn es die alte
    // gemerkt hätte, bliebe sie stehen.
    this.labelled = null;
    controller.pulse(0.3, 18);
    playTone({ type: 'triangle', from: 380, to: 620, duration: 0.06, gain: 0.04 });
  }

  /** Was auf der aufliegenden Seite liegt, ist sichtbar; der Rest wartet. */
  private showPage(): void {
    for (const slot of this.slots) {
      const here = slot.page === this.page;
      slot.item.visible = here;
      slot.tile.visible = here;
    }
    this.dots.forEach((dot, page) => {
      dot.material.color.setHex(page === this.page ? GRAB_GLOW : ACCENT);
      dot.material.opacity = page === this.page ? 0.95 : 0.3;
    });
  }

  /** Alle Stellen stellen: die gemeinte hebt sich, die anderen drehen sich weiter. */
  private showSpots(host: ToolHost): void {
    for (const slot of this.slots) {
      const hot = slot.page === this.page && slot.place === this.hovered;
      slot.item.rotation.y = this.spin;
      slot.item.position.y = ITEM_Y + (hot ? 0.014 : 0);
      slot.item.scale.setScalar(hot ? 1.3 : 1);
      slot.tile.material.color.setHex(hot ? GRAB_GLOW : ACCENT);
      slot.tile.material.opacity = hot ? 0.55 : 0.14;
    }
    this.arrows.forEach((arrow, index) => {
      const hot = this.hovered === PER_PAGE + index;
      arrow.tile.material.color.setHex(hot ? GRAB_GLOW : ACCENT);
      arrow.tile.material.opacity = hot ? 0.55 : 0.14;
      arrow.head.scale.setScalar(hot ? 1.25 : 1);
    });

    const title = this.titleFor(this.hovered);
    if (!title) {
      this.label3d.visible = false;
      this.labelled = null;
      return;
    }
    // Nur beim Wechsel neu zeichnen: `setText` malt eine Leinwand, und die
    // jedes Bild neu zu malen wäre der teuerste Weg, dasselbe Wort zu zeigen.
    if (this.labelled !== title) {
      this.labelled = title;
      this.label3d.setText(title);
    }
    this.label3d.visible = true;
    // Das Schild schaut den Kopf an, in Weltkoordinaten: es hängt am Beutel,
    // und der dreht sich unter ihm weg.
    this.label3d.lookAt(host.ctx.rig.getHeadPosition(_head));
  }

  /**
   * Was über dem Beutel steht: der Name des Dings — oder, über einem Pfeil,
   * die Seite, auf die er führt. Ein Pfeil ohne Ziel wäre ein Knopf, bei dem
   * man erst drücken muss, um zu erfahren, was er tut.
   */
  private titleFor(spot: number): string | null {
    if (spot === NO_CELL) return null;
    const arrow = this.arrows[spot - PER_PAGE];
    if (arrow) return `Seite ${turnPage(this.page, arrow.step, this.pages) + 1} von ${this.pages}`;
    const slot = this.slotAt(spot);
    return slot ? PROP_LABELS[slot.kind] : null;
  }

  /** Zugegriffen: das Ding kommt in Originalgröße in genau diese Hand. */
  private take(host: ToolHost, slot: Slot, controller: ControllerState): void {
    const hand = controller.handedness;
    if (!hand) return;
    host.conjureProp(slot.kind, hand);
    controller.pulse(0.6, 35);
    playPick(true);
  }

  override disposeTool(): void {
    this.label3d.dispose();
    disposeToolTree(this);
  }
}

/**
 * Ein Gegenstand als Miniatur: gebaut wie das Original, dann auf Fachgröße
 * gebracht und um seine Mitte gedreht.
 *
 * Zwei Ebenen, und beide werden gebraucht: die innere rückt das Ding in seinen
 * Mittelpunkt und auf Größe, die äußere dreht sich. Täte das die innere selbst,
 * liefe die Verschiebung durch die Drehung und die Miniatur eierte um eine
 * fremde Achse — derselbe Grund wie bei den Modellen im Handgelenk-Menü.
 */
function miniature(kind: PropKind): THREE.Object3D {
  const mesh = createPropShape(kind).mesh;
  const box = new THREE.Box3().setFromObject(mesh);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const largest = Math.max(size.x, size.y, size.z, 1e-4);
  const scale = ITEM / largest;

  mesh.position.copy(centre).multiplyScalar(-1);
  const inner = new THREE.Group();
  inner.add(mesh);
  inner.scale.setScalar(scale);

  const holder = new THREE.Group();
  holder.name = `bag-item:${kind}`;
  holder.add(inner);
  return holder;
}
