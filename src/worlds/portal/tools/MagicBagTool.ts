import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { gripFrame } from './gripFit';
import type { HoldPose } from './toolPose';
import type { Vec3 } from './aim';
import { GRAB_GLOW, GRAB_TINT } from '../../../core/colors';
import { playPick } from '../../../core/Audio';
import { TextPlane } from '../../../ui/TextPlane';
import { BAG_ITEMS, PROP_LABELS, createPropShape, type PropKind } from '../props';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Die Farbe des Beutels — dieselbe wie die seiner Seite im Handgelenk-Menü. */
const ACCENT = 0xffc857;

/** Wie viele Fächer nebeneinander liegen. */
const COLS = 4;
/** Kantenlänge eines Fachs, in Metern. */
const CELL = 0.042;
/** Und so groß ist das Ding darin, über die längste Kante gemessen. */
const ITEM = 0.03;
/** Höhe der Rasterebene über dem Ursprung des Beutels: die Öffnung. */
const MOUTH = 0.035;
/** Der Radius der Öffnung — das Raster muss hineinpassen. */
const RIM = 0.13;
/** So weit über und unter der Rasterebene zählt eine Hand noch als „darin". */
const REACH_UP = 0.13;
const REACH_DOWN = 0.06;
/** Und so weit darf sie seitlich neben der Mitte eines Fachs sein. */
const REACH_SIDE = CELL * 0.6;

/** Wie schnell sich die Miniaturen drehen, in Radiant je Sekunde. */
const SPIN = 0.7;

/**
 * Der **Saum als Griff**, im Rahmen jedes Griffs (`gripFit.ts`: Achse auf +Y,
 * Vorne auf -Z), im Raum des Werkzeugs: das Stück Saum im Griffpunkt, als
 * Zylinder quer (x) — gehalten wie eine **offene Kappe**, in die man etwas
 * hineinlegt: die Hand liegt waagerecht unter dem Saum, die Handfläche nach
 * oben (der Handrücken zeigt nach unten, -y), die Finger greifen vorn über den
 * Saum hinein, und der Daumen liegt außen am Saum entlang — bei der rechten
 * Hand nach rechts (+x), die Daumenseite. Die erste Fassung hatte die Hand
 * senkrecht wie an einem Eimer, und das sah nach einem Eimer aus. Daraus
 * rechnet `core/gripFist.test.ts` die Faust (`BAG_HAND_POSE`) — **mit**
 * Zielkorrektur, obwohl der Beutel nicht zielt: er hängt aufrecht im Raum, und
 * bei zielend gehaltenem Controller ist das Aufrechte der Strahlraum, nicht
 * der Griffraum (`Tool.hangsUpright`). Ohne sie stand die Hand in der Brille
 * 30° nach oben gekippt am Saum.
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
const _forward = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _upright = new THREE.Quaternion();
const _euler = new THREE.Euler();

/** Ein Fach des Rasters: was darin liegt, wo es liegt, und das Feld darunter. */
interface Slot {
  kind: PropKind;
  item: THREE.Object3D;
  tile: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  x: number;
  z: number;
}

/**
 * **Der magische Beutel** — dasselbe wie seine Seite im Handgelenk-Menü, nur
 * als Gegenstand.
 *
 * Am Gürtel hängt ein zugezogener Lederbeutel. In der Hand geht er auf, und
 * darin liegt, was er hergibt: ein **Raster** kleiner Gegenstände, jeder das
 * Ding selbst und nicht seine Strichzeichnung. Mit der anderen Hand greift man
 * hinein — beim Darüberfahren leuchtet das Fach und sagt oben, was darin liegt,
 * und **Greifen** holt das Ding in Originalgröße heraus, genau dorthin, wo die
 * Hand gerade ist.
 *
 * Warum überhaupt, wo es die Menüseite doch schon gibt: Ein Menü ist ein Ort,
 * an den man geht. Ein Beutel ist etwas, das man dabeihat — man hält ihn hin,
 * greift hinein, stellt etwas auf und greift noch einmal hinein, ohne
 * dazwischen jedes Mal ein Panel zu öffnen und eine Seite tief zu blättern. Und
 * ein Ikosaeder sieht als Ikone wie ein Zwölfeck aus; im Beutel liegt er da und
 * dreht sich.
 *
 * Zwei Dinge sind dabei nicht selbstverständlich:
 *
 * Erstens **hängt** er. Was man sonst in die Hand nimmt, folgt der Zielachse —
 * eine Waffe zeigt dorthin, wohin die Hand zeigt. Ein Beutel, der das täte,
 * kippte bei jeder Drehung des Handgelenks aus, und mit ihm sein Raster. Also
 * bleibt die Öffnung oben, egal wie die Faust steht (`hangUpright`); mit der
 * Hand dreht sich nur, wohin er schaut.
 *
 * Zweitens gehört die **greifende Hand** dem Beutel, solange sie über einem Fach
 * steht (`claimsHand`). Sonst risse derselbe Griff, mit dem man in den Beutel
 * fasst, die Kiste hinter ihm an sich — und in einem vollen Labor steht immer
 * eine Kiste hinter ihm.
 */
export class MagicBagTool extends Tool {
  override readonly toolId = 'bag';
  override readonly label = 'Magischer Beutel';

  /** Der Beutel selbst — gegen das Werkzeug versetzt, damit sein Saum im Griffpunkt liegt. */
  private readonly body = new THREE.Group();
  private readonly closed = new THREE.Group();
  private readonly open = new THREE.Group();
  private readonly slots: Slot[] = [];
  private readonly label3d: TextPlane;
  private spin = 0;
  /** Das Fach, über dem die andere Hand gerade steht. */
  private hovered: Slot | null = null;
  /** Was auf dem Schild steht — damit es nicht jedes Bild neu gemalt wird. */
  private labelled: PropKind | null = null;

  constructor() {
    super();
    this.name = 'tool-bag';
    this.icon = 'bag';
    this.accent = ACCENT;
    this.hint = 'Hineingreifen: Fach ansteuern, greifen — das Ding kommt in die Hand';
    // Er hängt an der Faust und zielt nicht: die Öffnung bleibt oben, komme,
    // was wolle (`hangUpright`). Aufrecht heißt aber nicht „im Griffraum":
    // bei zielend gehaltenem Controller steht das Aufrechte um die
    // Zielkorrektur gegen den Griff gedreht, und so rechnen Werkzeugseite und
    // Stände die Hand daran (`Tool.hangsUpright`).
    this.alignToAim = false;
    this.hangsUpright = true;
    this.holdPosition.set(BAG_HOLD_POSITION.x, BAG_HOLD_POSITION.y, BAG_HOLD_POSITION.z);

    // **Von außen** gehalten, am Saum: der Beutel hängt vor der Hand, und sein
    // Saum läuft durch den Griffpunkt — dort liegt die Faust darum, waagerecht
    // wie an einer offenen Kappe, Handfläche oben, Finger über den Saum hinein
    // (`BAG_GRIP`, `BAG_HAND_POSE`). Alles,
    // woraus er besteht, hängt deshalb um einen Saumhalbmesser nach vorn und
    // um die Höhe der Öffnung nach unten versetzt (`body`); gerechnet wird mit
    // dem Beutel selbst (`slotUnder`), nicht mit dem Werkzeug.
    this.body.position.set(0, -MOUTH, -RIM);
    this.add(this.body);
    this.body.add(this.closed, this.open);
    this.buildClosed();
    this.buildOpen();
    this.buildGrid();

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
    const profile: THREE.Vector2[] = [
      new THREE.Vector2(0.001, -0.17),
      new THREE.Vector2(0.075, -0.16),
      new THREE.Vector2(0.125, -0.1),
      new THREE.Vector2(0.128, -0.02),
      new THREE.Vector2(0.115, 0.01),
      new THREE.Vector2(RIM, MOUTH),
    ];
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

  /**
   * Das Raster in der Öffnung: ein Fach je Sorte, mit dem Ding selbst darin.
   *
   * Die Miniatur ist **derselbe** Gegenstand, den das Greifen herausholt — aus
   * `createPropShape` gebaut und auf Fachgröße heruntergerechnet. Eine eigens
   * gebaute hübschere Kopie zeigte irgendwann etwas anderes als das, was
   * herauskommt, und das ist bei einem Beutel die einzige Frage, die zählt.
   */
  private buildGrid(): void {
    const rows = Math.ceil(BAG_ITEMS.length / COLS);
    BAG_ITEMS.forEach(([kind], index) => {
      const column = index % COLS;
      const row = Math.floor(index / COLS);
      const x = (column - (COLS - 1) / 2) * CELL;
      const z = (row - (rows - 1) / 2) * CELL;

      const tile = new THREE.Mesh(
        new THREE.PlaneGeometry(CELL * 0.86, CELL * 0.86),
        new THREE.MeshBasicMaterial({
          color: ACCENT,
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
        }),
      );
      tile.rotation.x = -Math.PI / 2;
      tile.position.set(x, MOUTH - 0.026, z);
      this.open.add(tile);

      const item = miniature(kind);
      item.position.set(x, MOUTH - 0.012, z);
      this.open.add(item);

      this.slots.push({ kind, item, tile, x, z });
    });
  }

  // --- offen und zu --------------------------------------------------------

  private setOpen(open: boolean): void {
    this.closed.visible = !open;
    this.open.visible = open;
    if (!open) {
      this.hovered = null;
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
   * Solange die freie Hand über einem Fach steht, gehört sie dem Beutel. Sonst
   * zöge derselbe Griff die Kiste dahinter an sich.
   */
  override claimsHand(hand: Handedness): boolean {
    return this.hovered !== null && this.heldBy !== null && hand !== this.heldBy;
  }

  // --- Betrieb --------------------------------------------------------------

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    const held = Boolean(this.heldBy) && !this.parked;
    if (!held || !controller) {
      this.setOpen(false);
      return;
    }
    this.setOpen(true);
    this.hangUpright(controller);
    // Gleich nachgezogen: gemessen wird in diesem Bild gegen diese Drehung, und
    // nicht gegen die von gestern.
    this.updateWorldMatrix(true, false);

    this.spin = (this.spin + dt * SPIN) % (Math.PI * 2);
    const reaching = this.reachingHand(host);
    const before = this.hovered;
    this.hovered = reaching ? this.slotUnder(reaching) : null;
    // Ein Stups je Fach: In einem Beutel sieht man die eigene Hand nur halb,
    // und was man nicht sieht, muss man spüren.
    if (this.hovered && this.hovered !== before) reaching?.pulse(0.18, 14);
    this.showSlots(host);

    if (!this.hovered || !reaching?.squeeze.justPressed) return;
    this.take(host, this.hovered, reaching);
  }

  /**
   * Hält die Öffnung oben.
   *
   * Der Beutel steckt im Griff der Hand, und `applyHold` hat ihn dorthin
   * gestellt; hier bekommt er seine **Weltdrehung** aufgezwungen und rechnet
   * sie in den Raum seines Elternteils zurück. Mitgenommen wird von der Hand
   * nur die Gierachse — der Beutel dreht sich also mit, wenn man den Arm dreht,
   * aber er kippt nicht mit dem Handgelenk aus.
   *
   * Die Gierachse mit dem **richtigen Vorzeichen**: `rotation.y = 0` heißt in
   * three.js „schaut nach -Z", also ist der Winkel `atan2(-x, -z)` der
   * Vorwärtsrichtung (wie `headYaw` in `GlideTool.ts`). Die erste Fassung nahm
   * `atan2(x, z)`, und das ist derselbe Winkel plus 180°: der Beutel hing
   * **hinter** der Hand statt vor ihr, mit dem Saum am Griffpunkt und dem
   * Bauch im Unterarm — in der Brille sah es aus, als hätte die Hand ihn von
   * der falschen Seite gegriffen. Auf der Werkzeugseite war davon nichts zu
   * sehen, denn dort läuft `hangUpright` nie.
   */
  private hangUpright(controller: ControllerState): void {
    const parent = this.parent;
    if (!parent) return;
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    _forward.set(0, 0, -1).applyQuaternion(anchor.getWorldQuaternion(_quaternion));
    const yaw = Math.atan2(-_forward.x, -_forward.z);
    _upright.setFromEuler(_euler.set(0, yaw, 0, 'YXZ'));
    parent.getWorldQuaternion(_quaternion).invert();
    this.quaternion.copy(_quaternion).multiply(_upright);
  }

  /** Die Hand, die gerade nicht den Beutel hält — sie greift hinein. */
  private reachingHand(host: ToolHost): ControllerState | null {
    const hand = this.heldBy;
    if (!hand) return null;
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const controller = host.ctx.input.get(other);
    return controller?.tracked ? controller : null;
  }

  /** Über welchem Fach die Fingerspitze steht — `null`, wenn über keinem. */
  private slotUnder(controller: ControllerState): Slot | null {
    if (!controller.getFingertip(_tip)) return null;
    this.body.worldToLocal(_local.copy(_tip));
    if (_local.y > MOUTH + REACH_UP || _local.y < MOUTH - REACH_DOWN) return null;

    let nearest: Slot | null = null;
    let closest = REACH_SIDE;
    for (const slot of this.slots) {
      const gap = Math.max(Math.abs(_local.x - slot.x), Math.abs(_local.z - slot.z));
      if (gap >= closest) continue;
      closest = gap;
      nearest = slot;
    }
    return nearest;
  }

  /** Alle Fächer stellen: das eine hebt sich, die anderen drehen sich weiter. */
  private showSlots(host: ToolHost): void {
    for (const slot of this.slots) {
      const hot = slot === this.hovered;
      slot.item.rotation.y = this.spin;
      slot.item.position.y = MOUTH - 0.012 + (hot ? 0.014 : 0);
      slot.item.scale.setScalar(hot ? 1.3 : 1);
      slot.tile.material.color.setHex(hot ? GRAB_GLOW : ACCENT);
      slot.tile.material.opacity = hot ? 0.55 : 0.14;
    }

    if (!this.hovered) {
      this.label3d.visible = false;
      this.labelled = null;
      return;
    }
    // Nur beim Wechsel neu zeichnen: `setText` malt eine Leinwand, und die
    // jedes Bild neu zu malen wäre der teuerste Weg, dasselbe Wort zu zeigen.
    if (this.labelled !== this.hovered.kind) {
      this.labelled = this.hovered.kind;
      this.label3d.setText(PROP_LABELS[this.hovered.kind]);
    }
    this.label3d.visible = true;
    // Das Schild schaut den Kopf an, in Weltkoordinaten: es hängt am Beutel,
    // und der dreht sich unter ihm weg.
    this.label3d.lookAt(host.ctx.rig.getHeadPosition(_head));
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
