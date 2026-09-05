import * as THREE from 'three';
import { Tool, disposeToolTree, grabMaterial, type ToolHost } from './Tool';
import { POLE_HOLD_POSITION } from './poleGrip';
import { playPick } from '../../../core/Audio';
import { DEFAULT_MATERIAL, MATERIALS, type SurfaceMaterial } from './materials';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** The palette. Four columns, so a row is easy to sweep along with the brush. */
const COLORS = [
  0xff3b2f, 0xff9d3d, 0xffc857, 0xf3f6fb, 0x5ee0a0, 0x2fbf8f, 0x2f8fff, 0x4aa8ff, 0x9d7bff,
  0xff6ea3, 0x8e9db8, 0x22293a,
];
const COLUMNS = 4;
const ROWS = Math.ceil(COLORS.length / COLUMNS);

const CANVAS_W = 512;
/** Die Reiterzeile über beiden Seiten. */
const TAB_H = 74;
const CELL = CANVAS_W / COLUMNS;
const GRID_H = CELL * ROWS;
const CANVAS_H = TAB_H + GRID_H;
/** Eine Materialzeile ist so hoch, dass acht davon dieselbe Fläche füllen. */
const ROW_H = GRID_H / MATERIALS.length;

const PANEL_W = 0.19;
const PANEL_H = (PANEL_W / CANVAS_W) * CANVAS_H;

/** How far the brush may reach to paint something it is not touching. */
const PAINT_RANGE = 4;

/** Der Stiel — der Griff — von hinten nach vorn auf der z-Achse, und sein Halbmesser. */
const HANDLE_BACK = 0.06;
const HANDLE_FRONT = -0.055;
const HANDLE_R = 0.016;

/** Welche Seite der Palette gerade oben liegt. */
type Page = 'colors' | 'materials';

/** Ein Feld auf der Palette: ein Reiter oder eine Zelle der Seite. */
interface Slot {
  kind: 'tab' | 'cell';
  index: number;
}

const _tip = new THREE.Vector3();
const _local = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _handUp = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _quaternion = new THREE.Quaternion();

/**
 * Pinsel, Farbe und Material.
 *
 * Solange der Pinsel gehalten wird, schwebt die Palette über der anderen Hand:
 * antippen oder anzielen und Trigger lädt, worauf man zeigt. Von da an gibt
 * der Trigger jedem Objekt, das der Pinsel berührt oder anzielt, **beides** —
 * Farbe *und* Material —, und zwar für alle in der Sitzung.
 *
 * Oben stehen zwei Reiter:
 *
 * - **Farben** — dieselbe Palette wie bisher.
 * - **Material** — Lack, Metall, Gummi, Eis, Stein, Glas, Leuchtend, Schaum
 *   (`materials.ts`). Ein Material ist beides zugleich: wie das Objekt
 *   aussieht *und* wie es sich verhält. Eine Kiste aus Gummi springt, eine aus
 *   Eis rutscht. **Lack** ist der Weg zurück — ohne ihn wäre jeder
 *   Pinselstrich endgültig.
 *
 * Dass ein Strich immer beides setzt, ist Absicht: was die Palette zeigt, ist
 * das, was das Objekt bekommt. Eine Farbe, die je nach Vorgeschichte mal das
 * Material mitnimmt und mal nicht, kann man in der Brille nicht lesen.
 */
export class BrushTool extends Tool {
  override readonly toolId = 'brush';
  override readonly label = 'Pinsel';

  /** The palette lives in world space, next to the free hand. */
  readonly palette: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private readonly tip: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  private readonly ferrule: THREE.Mesh<THREE.CylinderGeometry, THREE.MeshStandardMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly tipAnchor = new THREE.Object3D();
  private color = COLORS[6]!;
  private material: SurfaceMaterial = DEFAULT_MATERIAL;
  private page: Page = 'colors';
  private hovered: Slot | null = null;
  private touching = '';

  constructor() {
    super();
    this.name = 'tool-brush';
    this.icon = 'brush';
    this.accent = 0x5ee0a0;
    this.hint = 'Farbe und Material wählen · Trigger streicht an';

    const metal = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      roughness: 0.3,
      metalness: 0.7,
    });

    // Der Stiel **ist** der Griff: ein Stab in der Faust, wie der Stiel des
    // Hammers (`POLE_GRIP`, `POLE_HAND_POSE`), in Greiffarbe statt Holz — die
    // Farbe sagt „hier anfassen", und an einem Pinsel fasst man den Stiel an.
    // Eine Weile hing ein Standardgriff darunter, und der Pinsel lag wie eine
    // Pistole obenauf. Kein sichtbarer Griff mehr, und trotzdem zeigt er
    // dorthin, wohin man zeigt: der Stab liegt auf der z-Achse, und die ist der
    // Zeigestrahl.
    this.holdPosition.set(POLE_HOLD_POSITION.x, POLE_HOLD_POSITION.y, POLE_HOLD_POSITION.z);

    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(HANDLE_R * 0.85, HANDLE_R, HANDLE_BACK - HANDLE_FRONT, 14),
      grabMaterial({ roughness: 0.6 }),
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, (HANDLE_BACK + HANDLE_FRONT) / 2);
    this.add(handle);

    this.ferrule = new THREE.Mesh(
      new THREE.CylinderGeometry(HANDLE_R * 0.8, HANDLE_R * 0.85, 0.03, 12),
      metal,
    );
    this.ferrule.rotation.x = Math.PI / 2;
    this.ferrule.position.set(0, 0, HANDLE_FRONT - 0.015);
    this.add(this.ferrule);

    this.tip = new THREE.Mesh(
      new THREE.ConeGeometry(HANDLE_R * 0.9, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5 }),
    );
    this.tip.rotation.x = -Math.PI / 2;
    this.tip.position.set(0, 0, HANDLE_FRONT - 0.03 - 0.025);
    this.add(this.tip);

    this.tipAnchor.position.set(0, 0, HANDLE_FRONT - 0.03 - 0.05);
    this.add(this.tipAnchor);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.palette = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.palette.name = 'brush-palette';
    this.palette.renderOrder = 11;
    this.palette.visible = false;
    this.drawPalette();
  }

  /** The colour the brush is loaded with. */
  get currentColor(): number {
    return this.color;
  }

  /** Das Material, das der nächste Strich mitgibt. */
  get currentMaterial(): string {
    return this.material.id;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.palette.parent !== host.root) host.root.add(this.palette);
    this.palette.visible = true;
  }

  override onStow(_host: ToolHost): void {
    this.palette.visible = false;
    this.hovered = null;
    this.touching = '';
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // Pointing at the palette always wins: that is where the colour comes from.
    if (this.hovered) {
      this.pick(this.hovered, controller);
      return;
    }

    this.tipAnchor.getWorldPosition(_tip);
    const touched = host.propAt(_tip);
    if (touched) {
      this.applyTo(touched, host);
      controller.pulse(0.4, 25);
      return;
    }

    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const aimed = host.aimAt(_tip, _direction, PAINT_RANGE);
    if (!aimed) {
      host.notify('Nichts zum Anmalen getroffen');
      return;
    }
    this.applyTo(aimed, host);
    controller.pulse(0.4, 25);
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy) {
      this.palette.visible = false;
      return;
    }

    const other: Handedness = this.heldBy === 'left' ? 'right' : 'left';
    const free = host.ctx.input.get(other);
    const anchor = free?.tracked ? handAnchor(free) : null;
    if (!anchor) {
      this.palette.visible = false;
      this.hovered = null;
      return;
    }

    // The palette stands on the free hand and looks at the player, like the
    // wrist menu does — the same gesture, so it needs no explaining.
    anchor.getWorldPosition(_wrist);
    host.ctx.rig.getHeadPosition(_head);
    _handUp.set(0, 1, 0).applyQuaternion(anchor.getWorldQuaternion(_quaternion));
    if (Math.abs(_handUp.y) < 0.15) _handUp.copy(_up);

    _direction.copy(_head).sub(_wrist).normalize();
    this.palette.position
      .copy(_wrist)
      .addScaledVector(_direction, 0.06)
      .addScaledVector(_handUp, 0.12);
    _matrix.lookAt(_head, this.palette.position, _handUp);
    this.palette.quaternion.setFromRotationMatrix(_matrix);
    this.palette.visible = true;
    this.palette.updateMatrixWorld(true);

    this.updateHover(controller);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.palette.geometry.dispose();
    this.palette.material.dispose();
    this.palette.removeFromParent();
    this.texture.dispose();
  }

  /** Farbe und Material auf ein Objekt — beides zusammen, für alle. */
  private applyTo(entry: Parameters<ToolHost['styleProp']>[0], host: ToolHost): void {
    host.styleProp(entry, { color: this.color, material: this.material.id });
  }

  /** Which slot the brush tip is over, and whether it actually touches it. */
  private updateHover(controller: ControllerState): void {
    this.tipAnchor.getWorldPosition(_tip);
    _local.copy(_tip);
    this.palette.worldToLocal(_local);

    const inside =
      Math.abs(_local.x) <= PANEL_W / 2 &&
      Math.abs(_local.y) <= PANEL_H / 2 &&
      Math.abs(_local.z) <= 0.07;
    const slot = inside ? this.slotAt(_local) : null;
    if (keyOf(slot) !== keyOf(this.hovered)) {
      this.hovered = slot;
      this.drawPalette();
    }

    // Actually poking a swatch picks it without the trigger.
    const touching = slot && Math.abs(_local.z) < 0.022 ? keyOf(slot) : '';
    if (touching && touching !== this.touching && slot) this.pick(slot, controller);
    this.touching = touching;
  }

  /** Welches Feld unter diesem Punkt liegt — Reiter oben, Seite darunter. */
  private slotAt(local: THREE.Vector3): Slot | null {
    const x = ((local.x + PANEL_W / 2) / PANEL_W) * CANVAS_W;
    const y = ((PANEL_H / 2 - local.y) / PANEL_H) * CANVAS_H;
    if (x < 0 || x >= CANVAS_W || y < 0 || y >= CANVAS_H) return null;
    if (y < TAB_H) return { kind: 'tab', index: x < CANVAS_W / 2 ? 0 : 1 };

    if (this.page === 'materials') {
      const row = Math.floor((y - TAB_H) / ROW_H);
      return row >= 0 && row < MATERIALS.length ? { kind: 'cell', index: row } : null;
    }
    const column = Math.floor(x / CELL);
    const row = Math.floor((y - TAB_H) / CELL);
    const index = row * COLUMNS + column;
    return index >= 0 && index < COLORS.length ? { kind: 'cell', index } : null;
  }

  private pick(slot: Slot, controller: ControllerState): void {
    if (slot.kind === 'tab') {
      const page: Page = slot.index === 0 ? 'colors' : 'materials';
      if (page === this.page) return;
      this.page = page;
      this.hovered = null;
      this.touching = '';
      controller.pulse(0.25, 15);
      playPick(false);
      this.drawPalette();
      return;
    }

    if (this.page === 'materials') {
      const next = MATERIALS[slot.index];
      if (!next || next.id === this.material.id) return;
      this.material = next;
      // Der Griff zeigt, woraus der nächste Strich ist: matt, glänzend oder
      // durchsichtig — dieselbe Vorschau, die das Objekt danach bekommt.
      this.ferrule.material.roughness = next.roughness;
      this.ferrule.material.metalness = next.metalness;
      this.ferrule.material.needsUpdate = true;
    } else {
      const next = COLORS[slot.index];
      if (next === undefined || next === this.color) return;
      this.color = next;
      this.tip.material.color.setHex(next);
    }
    controller.pulse(0.3, 20);
    playPick(true);
    this.drawPalette();
  }

  private drawPalette(): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    ctx.roundRect(2, 2, CANVAS_W - 4, CANVAS_H - 4, 18);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.92)';
    ctx.fill();

    this.drawTabs(ctx);
    if (this.page === 'materials') this.drawMaterials(ctx);
    else this.drawColors(ctx);

    this.texture.needsUpdate = true;
  }

  private drawTabs(ctx: CanvasRenderingContext2D): void {
    const labels = ['Farben', 'Material'];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < 2; index++) {
      const x = index * (CANVAS_W / 2);
      const active = (index === 0) === (this.page === 'colors');
      const hot = this.hovered?.kind === 'tab' && this.hovered.index === index;
      ctx.beginPath();
      ctx.roundRect(x + 8, 8, CANVAS_W / 2 - 16, TAB_H - 16, 14);
      ctx.fillStyle = active ? 'rgba(94, 224, 160, 0.22)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      if (active || hot) {
        ctx.lineWidth = active ? 5 : 3;
        ctx.strokeStyle = active ? '#5ee0a0' : 'rgba(255,255,255,0.6)';
        ctx.stroke();
      }
      ctx.fillStyle = active ? '#ffffff' : 'rgba(255,255,255,0.65)';
      ctx.font = '600 30px system-ui, sans-serif';
      ctx.fillText(labels[index]!, x + CANVAS_W / 4, TAB_H / 2);
    }
  }

  private drawColors(ctx: CanvasRenderingContext2D): void {
    for (let index = 0; index < COLORS.length; index++) {
      const color = COLORS[index]!;
      const x = (index % COLUMNS) * CELL;
      const y = TAB_H + Math.floor(index / COLUMNS) * CELL;
      const pad = 8;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, CELL - pad * 2, CELL - pad * 2, 14);
      ctx.fillStyle = hex(color);
      ctx.fill();

      const chosen = color === this.color;
      const hot = this.hovered?.kind === 'cell' && this.hovered.index === index;
      if (!chosen && !hot) continue;
      ctx.lineWidth = chosen ? 8 : 5;
      ctx.strokeStyle = chosen ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }
  }

  private drawMaterials(ctx: CanvasRenderingContext2D): void {
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (let index = 0; index < MATERIALS.length; index++) {
      const material = MATERIALS[index]!;
      const y = TAB_H + index * ROW_H;
      const chosen = material.id === this.material.id;
      const hot = this.hovered?.kind === 'cell' && this.hovered.index === index;

      ctx.beginPath();
      ctx.roundRect(10, y + 4, CANVAS_W - 20, ROW_H - 8, 12);
      ctx.fillStyle = chosen ? 'rgba(94, 224, 160, 0.18)' : 'rgba(255,255,255,0.05)';
      ctx.fill();
      if (chosen || hot) {
        ctx.lineWidth = chosen ? 5 : 3;
        ctx.strokeStyle = chosen ? '#5ee0a0' : 'rgba(255,255,255,0.55)';
        ctx.stroke();
      }

      // Eine kleine Probe: hell und matt, dunkel und glänzend, durchscheinend.
      const sample = 30;
      ctx.globalAlpha = material.opacity;
      ctx.beginPath();
      ctx.roundRect(24, y + (ROW_H - sample) / 2, sample, sample, 8);
      ctx.fillStyle = shade(this.color, material);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#ffffff';
      ctx.font = '600 27px system-ui, sans-serif';
      ctx.fillText(material.label, 72, y + ROW_H / 2 - 9);
      ctx.fillStyle = 'rgba(159, 227, 255, 0.9)';
      ctx.font = '500 21px system-ui, sans-serif';
      ctx.fillText(material.sub, 72, y + ROW_H / 2 + 15);
    }
  }
}

function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

/** Die Farbe, wie dieses Material sie aussehen lässt — nur als Vorschau. */
function shade(color: number, material: SurfaceMaterial): string {
  const tint = new THREE.Color(color);
  if (material.metalness > 0.5) tint.multiplyScalar(0.7);
  if (material.glow > 0.5) tint.lerp(new THREE.Color(0xffffff), 0.35);
  return `#${tint.getHexString()}`;
}

/** Ein Feld als Zeichenkette, damit „dasselbe wie eben" vergleichbar ist. */
function keyOf(slot: Slot | null): string {
  return slot ? `${slot.kind}:${slot.index}` : '';
}

function handAnchor(controller: ControllerState): THREE.Object3D | null {
  if (controller.isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
