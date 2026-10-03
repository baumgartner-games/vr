import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { NO_CELL, cellAtPoint, cellAtRay, cellCentre, type Cell, type Reach } from './bagGrid';
import {
  SLOTS,
  onPalettesChange,
  palettes,
  setSlot,
  updatePalettes,
  type PaletteItem,
} from './paintPalettes';
import { GRAB_GLOW } from '../../../core/colors';
import { playPick, playTone } from '../../../core/Audio';
import { TextPlane } from '../../../ui/TextPlane';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Die Farbe der Malpalette — dieselbe wie ihre Seite im Menü. */
export const PAINT_PALETTE_ACCENT = 0xff9f6b;
/** Die Menüseite der Malpalette (`PortalWorld.paintPaletteMenu`). */
export const PAINT_PALETTE_PAGE = 'paint-palette';

/** Drei mal drei Fächer, so groß wie ein Farbklecks. */
const COLS = 3;
const ROWS = 3;
const CELL = 0.068;
/** So groß ist ein Ding darin, über die längste Kante gemessen. */
const ITEM = 0.05;
/** Die Fläche des Bretts, über dem Ursprung des Bretts. */
const SURFACE = 0.008;
const ITEM_Y = SURFACE + 0.03;
/** Wo die Mitte der Fächer liegt, vor der Hand. */
const GRID_Z = -0.16;
/** Der Knopf fürs Menü: vorn rechts neben den Fächern. */
const BUTTON = { x: 0.118, z: GRID_Z + 0.05 } as const;
const BUTTON_RADIUS = 0.022;
/** Wie weit eine Ziellinie reichen darf. */
const RAY_RANGE = 1.6;
/** Wie schnell sich die Dinge drehen. */
const SPIN = 0.6;
/** Wie oft nach einem Vorschaumodell gefragt wird, das noch lädt. */
const RETRY = 0.5;

/** Das Brett: eine Ellipse vor der Hand (Mitte, Halbachsen), mit einem Daumenloch. */
export const BOARD = { x: 0, z: -0.15, rx: 0.175, rz: 0.15 } as const;

/** Wo die neun Fächer und dahinter der Menüknopf liegen, auf dem Brett. */
export function paletteSpots(): Cell[] {
  const spots: Cell[] = [];
  for (let place = 0; place < SLOTS; place += 1) {
    const at = cellCentre(place, COLS, ROWS, CELL);
    spots.push({ x: at.x, z: at.z + GRID_Z });
  }
  spots.push({ x: BUTTON.x, z: BUTTON.z });
  return spots;
}

/** Mit der Fingerspitze: knapp über dem Brett. */
const FINGER: Reach = { plane: SURFACE, up: 0.1, down: 0.04, side: CELL * 0.6 };
/** Mit einem Ding in der Hand: großzügiger, ein Möbel ist kein Finger. */
const CARRY: Reach = { plane: SURFACE, up: 0.35, down: 0.08, side: CELL * 0.75 };

/** Die Farben der Kleckse unter den Fächern — eine Malerpalette eben. */
const BLOBS = [
  0xe8504b, 0xf0a33c, 0xf3d64a, 0x67c26b, 0x3fb8c9, 0x4a7fe0, 0x8e62d6, 0xd65aa7, 0xf2efe6,
];

const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _ray = new THREE.Ray();
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _head = new THREE.Vector3();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _centre = new THREE.Vector3();

interface SlotView {
  blob: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  holder: THREE.Group;
  /** Was gerade im Fach steht — damit nur bei einem Wechsel neu gebaut wird. */
  ref: string | null;
  /** Wann zuletzt nach dem Modell gefragt wurde, solange es noch fehlt. */
  asked: number;
  loaded: boolean;
}

/**
 * **Die Malpalette** — ein Brett in der einen Hand, auf das die andere legt,
 * was sie trägt, und von dem sie es wieder nimmt, so oft sie will.
 *
 * Gewünscht: _„ähnlich wie der magische beutel […] In vr kann ich den
 * gegenstand halten als malerpalette und gegenstände die ich in der anderen
 * hand halte, darauf ablegen um diese dort zu ‚speichern'. Ich kann die
 * elemente dort dann beliebig häufig rausnehmen, um z. B. in baumodus damit
 * die welt einzurichten."_
 *
 * - **Ablegen**: Die andere Hand trägt ein Ding (aus Katalog, Regal oder
 *   Beutel) über ein Fach und **lässt los** — das Fach merkt sich, was es war
 *   (`paintPalettes.ts`), und das Ding verschwindet aus der Hand
 *   (`ToolHost.stashHeld`). Ein Fach mit etwas darin wird überschrieben.
 *   Das geht nur, weil Werkzeuge in jedem Bild vor dem Loslassen der Griffe
 *   laufen (`PortalWorld.updateTools` vor `updateGrabs`).
 * - **Nehmen**: die leere Hand über ein Fach — Finger hinein oder mit dem
 *   Strahl darauf — und **greifen**: ein frisches Stück in genau diese Hand
 *   (`ToolHost.takeItem`). **B/Y** über einem Fach leert es.
 * - **Das Menü** (`PAINT_PALETTE_PAGE`: speichern, laden, neu, umbenennen):
 *   der runde Knopf auf dem Brett, mit dem Trigger oder dem Griff der anderen
 *   Hand — oder einfach der **Trigger der Hand, die die Palette hält**.
 * - Wie der Beutel zielt sie nicht (`alignToAim = false`) und gehört die
 *   andere Hand ihr, solange die über einem Fach oder dem Knopf steht
 *   (`claimsHand`).
 */
export class PaintPaletteTool extends Tool {
  override readonly toolId = 'paint-palette';
  override readonly label = 'Malpalette';

  private readonly board = new THREE.Group();
  private readonly slots: SlotView[] = [];
  private readonly spots: Cell[] = [];
  private readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial>;
  private readonly label3d: TextPlane;
  private labelled: string | null = null;
  private hovered = NO_CELL;
  private spin = 0;
  private clock = 0;
  private readonly offPalettes: () => void;

  constructor() {
    super();
    this.name = 'tool-paint-palette';
    this.icon = 'palette';
    this.accent = PAINT_PALETTE_ACCENT;
    this.hint =
      'Ding der anderen Hand über ein Fach halten und loslassen; leere Hand greift heraus';
    this.alignToAim = false;
    this.add(this.board);
    this.buildBoard();
    this.spots.push(...paletteSpots());
    for (let place = 0; place < SLOTS; place += 1) {
      this.slots.push(this.buildSlot(this.spots[place]!, place));
    }
    this.button = this.buildButton();

    this.label3d = new TextPlane({
      width: 0.2,
      height: 0.06,
      title: '',
      accent: PAINT_PALETTE_ACCENT,
      align: 'center',
    });
    this.label3d.position.set(0, ITEM_Y + 0.09, GRID_Z - CELL * 1.9);
    this.label3d.visible = false;
    this.board.add(this.label3d);

    this.offPalettes = onPalettesChange(() => this.refreshSlots());
    this.refreshSlots();
  }

  // --- Gestalt ---------------------------------------------------------------

  /** Das Brett: eine Nierenform aus Holz mit einem Loch für den Daumen. */
  private buildBoard(): void {
    const shape = new THREE.Shape();
    // Die Form liegt in x/y und wird gleich flach gelegt: y wird zu −z.
    shape.absellipse(BOARD.x, -BOARD.z, BOARD.rx, BOARD.rz, 0, Math.PI * 2, false, 0);
    const thumb = new THREE.Path();
    thumb.absellipse(-0.1, 0.02, 0.022, 0.018, 0, Math.PI * 2, true, 0);
    shape.holes.push(thumb);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false });
    // Die Form liegt in x/y; das Brett liegt flach in x/z, Oberseite nach +y.
    geometry.rotateX(-Math.PI / 2);
    const wood = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xc89b62, roughness: 0.75, metalness: 0.02 }),
    );
    this.board.add(wood);
  }

  private buildSlot(at: Cell, place: number): SlotView {
    const blob = new THREE.Mesh(
      new THREE.CircleGeometry(CELL * 0.42, 24),
      new THREE.MeshStandardMaterial({ color: BLOBS[place % BLOBS.length]!, roughness: 0.4 }),
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(at.x, SURFACE + 0.001, at.z);
    this.board.add(blob);
    const holder = new THREE.Group();
    holder.position.set(at.x, ITEM_Y, at.z);
    this.board.add(holder);
    return { blob, holder, ref: null, asked: -Infinity, loaded: false };
  }

  private buildButton(): THREE.Mesh<THREE.CircleGeometry, THREE.MeshStandardMaterial> {
    const button = new THREE.Mesh(
      new THREE.CircleGeometry(BUTTON_RADIUS, 24),
      new THREE.MeshStandardMaterial({ color: 0x2a2f45, roughness: 0.5 }),
    );
    button.rotation.x = -Math.PI / 2;
    button.position.set(BUTTON.x, SURFACE + 0.002, BUTTON.z);
    // Drei Striche: das Zeichen fürs Menü.
    for (const dz of [-0.008, 0, 0.008]) {
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(0.022, 0.003),
        new THREE.MeshBasicMaterial({ color: 0xffffff }),
      );
      bar.position.set(0, dz, 0.001);
      button.add(bar);
    }
    this.board.add(button);
    return button;
  }

  /** Was auf der aktuellen Palette liegt, in die Fächer stellen. */
  private refreshSlots(): void {
    const items = palettes().current.slots;
    this.slots.forEach((view, place) => {
      const ref = items[place]?.ref ?? null;
      if (ref === view.ref) return;
      view.ref = ref;
      view.loaded = false;
      view.asked = -Infinity;
      for (const child of [...view.holder.children]) {
        view.holder.remove(child);
        disposeToolTree(child);
      }
    });
    this.labelled = null;
  }

  /** Das Modell eines Fachs holen, wenn es noch fehlt — es kann noch laden. */
  private fillSlot(view: SlotView, host: ToolHost): void {
    if (view.loaded || view.ref === null || this.clock - view.asked < RETRY) return;
    view.asked = this.clock;
    const model = host.itemPreview(view.ref);
    if (!model) return;
    view.loaded = true;
    view.holder.add(miniature(model));
  }

  // --- Betrieb ---------------------------------------------------------------

  override claimsHand(hand: Handedness): boolean {
    return this.hovered !== NO_CELL && this.heldBy !== null && hand !== this.heldBy;
  }

  /** Der Trigger der haltenden Hand öffnet das Menü der Palette. */
  override onTrigger(_controller: ControllerState, host: ToolHost): void {
    this.openMenu(host);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.clock += dt;
    this.spin = (this.spin + dt * SPIN) % (Math.PI * 2);
    for (const view of this.slots) {
      this.fillSlot(view, host);
      view.holder.rotation.y = this.spin;
    }
    const held = Boolean(this.heldBy) && !this.parked && controller !== null;
    if (!held) {
      this.hovered = NO_CELL;
      this.show(host, null);
      return;
    }
    this.updateWorldMatrix(true, false);

    const reaching = this.reachingHand(host);
    const hand = reaching?.handedness ?? null;
    const carried = hand ? host.heldItem(hand, _tip) : null;
    const before = this.hovered;
    this.hovered = reaching ? this.spotUnder(reaching, carried ? _tip : null) : NO_CELL;
    if (this.hovered !== NO_CELL && this.hovered !== before) reaching?.pulse(0.18, 14);
    this.show(host, carried);
    if (!reaching || !hand || this.hovered === NO_CELL) return;

    // Der Knopf: Trigger oder Griff.
    if (this.hovered === SLOTS) {
      if (reaching.trigger.justPressed || reaching.squeeze.justPressed) this.openMenu(host);
      return;
    }

    // Ablegen: Die Hand trug etwas und lässt es gerade über dem Fach los.
    if (carried) {
      if (!reaching.squeeze.pressed && host.stashHeld(hand)) {
        const place = this.hovered;
        updatePalettes((state) => setSlot(state, place, carried));
        reaching.pulse(0.5, 30);
        playTone({ type: 'triangle', from: 520, to: 780, duration: 0.08, gain: 0.05 });
        host.notify(`Malpalette · Fach ${place + 1}: ${carried.label}`);
      }
      return;
    }

    const item = palettes().current.slots[this.hovered] ?? null;
    // B/Y leert ein Fach.
    if (item && reaching.secondary.justPressed) {
      updatePalettes((state) => setSlot(state, this.hovered, null));
      reaching.pulse(0.3, 20);
      return;
    }
    // Greifen holt ein frisches Stück.
    if (item && reaching.squeeze.justPressed) this.take(host, item, reaching);
  }

  private openMenu(host: ToolHost): void {
    host.ctx.menu.openSubmenu(PAINT_PALETTE_PAGE);
  }

  private take(host: ToolHost, item: PaletteItem, controller: ControllerState): void {
    host.takeItem(item.ref, controller.handedness);
    controller.pulse(0.6, 35);
    playPick(true);
  }

  /** Die Hand, die gerade nicht die Palette hält. */
  private reachingHand(host: ToolHost): ControllerState | null {
    const hand = this.heldBy;
    if (!hand) return null;
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const controller = host.ctx.input.get(other);
    return controller?.tracked ? controller : null;
  }

  /**
   * Welche Stelle gemeint ist: mit einem Ding in der Hand die unter dem Ding,
   * sonst die unter der Fingerspitze — und ohne die eine auf der Ziellinie.
   * Ein leeres Fach meint die leere Hand nicht: dort ist nichts zu holen.
   */
  private spotUnder(controller: ControllerState, carriedAt: THREE.Vector3 | null): number {
    let spot = NO_CELL;
    if (carriedAt) {
      this.board.worldToLocal(_local.copy(carriedAt));
      spot = cellAtPoint(_local, this.spots, CARRY);
      return spot === SLOTS ? NO_CELL : spot;
    }
    if (controller.getFingertip(_tip)) {
      this.board.worldToLocal(_local.copy(_tip));
      spot = cellAtPoint(_local, this.spots, FINGER);
    }
    if (spot === NO_CELL) {
      controller.getRay(_ray);
      this.board.worldToLocal(_origin.copy(_ray.origin));
      this.board.getWorldQuaternion(_quat).invert();
      _dir.copy(_ray.direction).applyQuaternion(_quat).normalize();
      spot = cellAtRay(_origin, _dir, this.spots, FINGER, RAY_RANGE);
    }
    if (spot === NO_CELL || spot === SLOTS) return spot;
    return palettes().current.slots[spot] ? spot : NO_CELL;
  }

  /** Was leuchtet und was auf dem Schild steht. */
  private show(host: ToolHost, carried: PaletteItem | null): void {
    this.slots.forEach((view, place) => {
      const hot = place === this.hovered;
      view.blob.material.emissive.setHex(hot ? GRAB_GLOW : 0x000000);
      view.blob.material.emissiveIntensity = hot ? 0.6 : 0;
      view.holder.scale.setScalar(hot ? 1.25 : 1);
    });
    const onButton = this.hovered === SLOTS;
    this.button.material.emissive.setHex(onButton ? GRAB_GLOW : 0x000000);
    this.button.material.emissiveIntensity = onButton ? 0.6 : 0;

    const title = this.titleFor(carried);
    if (!title) {
      this.label3d.visible = false;
      this.labelled = null;
      return;
    }
    if (this.labelled !== title) {
      this.labelled = title;
      this.label3d.setText(title);
    }
    this.label3d.visible = true;
    this.label3d.lookAt(host.ctx.rig.getHeadPosition(_head));
  }

  private titleFor(carried: PaletteItem | null): string | null {
    if (this.hovered === NO_CELL) return null;
    if (this.hovered === SLOTS) return `Menü · ${palettes().current.name}`;
    const place = this.hovered + 1;
    if (carried) return `Ablegen in Fach ${place}: ${carried.label}`;
    const item = palettes().current.slots[this.hovered];
    return item ? `${place} · ${item.label}` : null;
  }

  override disposeTool(): void {
    this.offPalettes();
    this.label3d.dispose();
    disposeToolTree(this);
  }
}

/**
 * Ein Ding als Miniatur: auf Fachgröße gebracht und um seine Mitte gedreht —
 * zwei Ebenen wie im Beutel, sonst eierte es um eine fremde Achse.
 */
function miniature(model: THREE.Object3D): THREE.Object3D {
  _box.setFromObject(model);
  _box.getSize(_size);
  _box.getCenter(_centre);
  const largest = Math.max(_size.x, _size.y, _size.z, 1e-4);
  model.position.sub(_centre);
  const inner = new THREE.Group();
  inner.add(model);
  inner.scale.setScalar(ITEM / largest);
  const holder = new THREE.Group();
  // Geometrie und Stoff gehören der Vorlage (Regal, Katalog) — weggeräumt
  // wird nur die Hülle.
  holder.userData.sharedAssets = true;
  holder.add(inner);
  return holder;
}
