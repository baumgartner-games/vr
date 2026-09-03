import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** The palette. Four columns, so a row is easy to sweep along with the brush. */
const COLORS = [
  0xff3b2f, 0xff9d3d, 0xffc857, 0xf3f6fb, 0x5ee0a0, 0x2fbf8f, 0x2f8fff, 0x4aa8ff, 0x9d7bff,
  0xff6ea3, 0x8e9db8, 0x22293a,
];
const COLUMNS = 4;
const ROWS = Math.ceil(COLORS.length / COLUMNS);

const PANEL_W = 0.17;
const PANEL_H = (PANEL_W / COLUMNS) * ROWS;
const CANVAS_W = 512;
const CANVAS_H = Math.round((CANVAS_W / COLUMNS) * ROWS);

/** How far the brush may reach to paint something it is not touching. */
const PAINT_RANGE = 4;

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
 * Brush and palette.
 *
 * While the brush is held, the palette floats over the other hand: tap a
 * swatch with the brush, or point at it and pull the trigger, and that colour
 * is loaded. From then on the trigger repaints whatever the brush touches or
 * points at — for everybody in the session, not just for you.
 */
export class BrushTool extends Tool {
  override readonly toolId = 'brush';
  override readonly label = 'Pinsel';

  /** The palette lives in world space, next to the free hand. */
  readonly palette: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private readonly tip: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly tipAnchor = new THREE.Object3D();
  private color = COLORS[6]!;
  private hovered = -1;
  private touching = -1;

  constructor() {
    super();
    this.name = 'tool-brush';
    this.icon = 'brush';
    this.accent = 0x5ee0a0;
    this.hint = 'Farbe antippen · Trigger färbt Objekte';
    this.holdPosition.set(0, -0.01, 0.02);

    const wood = new THREE.MeshStandardMaterial({ color: 0xc59a63, roughness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      roughness: 0.3,
      metalness: 0.7,
    });

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.15, 12), wood);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0, 0, -0.03);
    this.add(handle);

    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.03, 12), metal);
    ferrule.rotation.x = Math.PI / 2;
    ferrule.position.set(0, 0, -0.115);
    this.add(ferrule);

    this.tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.013, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5 }),
    );
    this.tip.rotation.x = -Math.PI / 2;
    this.tip.position.set(0, 0, -0.152);
    this.add(this.tip);

    this.tipAnchor.position.set(0, 0, -0.178);
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

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.palette.parent !== host.root) host.root.add(this.palette);
    this.palette.visible = true;
  }

  override onStow(_host: ToolHost): void {
    this.palette.visible = false;
    this.hovered = -1;
    this.touching = -1;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    // Pointing at the palette always wins: that is where the colour comes from.
    if (this.hovered >= 0) {
      this.pick(this.hovered, controller);
      return;
    }

    this.tipAnchor.getWorldPosition(_tip);
    const touched = host.propAt(_tip);
    if (touched) {
      host.paintProp(touched, this.color);
      controller.pulse(0.4, 25);
      return;
    }

    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const aimed = host.aimAt(_tip, _direction, PAINT_RANGE);
    if (!aimed) {
      host.notify('Nichts zum Anmalen getroffen');
      return;
    }
    host.paintProp(aimed, this.color);
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
      this.hovered = -1;
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
      .addScaledVector(_handUp, 0.11);
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

  /** Which swatch the brush tip is over, and whether it actually touches it. */
  private updateHover(controller: ControllerState): void {
    this.tipAnchor.getWorldPosition(_tip);
    _local.copy(_tip);
    this.palette.worldToLocal(_local);

    const inside =
      Math.abs(_local.x) <= PANEL_W / 2 &&
      Math.abs(_local.y) <= PANEL_H / 2 &&
      Math.abs(_local.z) <= 0.07;
    const index = inside ? this.indexAt(_local) : -1;
    if (index !== this.hovered) {
      this.hovered = index;
      this.drawPalette();
    }

    // Actually poking a swatch picks it without the trigger.
    const touching = index >= 0 && Math.abs(_local.z) < 0.022 ? index : -1;
    if (touching >= 0 && touching !== this.touching) this.pick(touching, controller);
    this.touching = touching;
  }

  private indexAt(local: THREE.Vector3): number {
    const column = Math.floor(((local.x + PANEL_W / 2) / PANEL_W) * COLUMNS);
    const row = Math.floor(((PANEL_H / 2 - local.y) / PANEL_H) * ROWS);
    if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) return -1;
    const index = row * COLUMNS + column;
    return index < COLORS.length ? index : -1;
  }

  private pick(index: number, controller: ControllerState): void {
    const next = COLORS[index];
    if (next === undefined || next === this.color) return;
    this.color = next;
    this.tip.material.color.setHex(next);
    controller.pulse(0.3, 20);
    playPick(true);
    this.drawPalette();
  }

  private drawPalette(): void {
    const ctx = this.canvas.getContext('2d')!;
    const cell = CANVAS_W / COLUMNS;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    ctx.roundRect(2, 2, CANVAS_W - 4, CANVAS_H - 4, 18);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.92)';
    ctx.fill();

    for (let index = 0; index < COLORS.length; index++) {
      const color = COLORS[index]!;
      const x = (index % COLUMNS) * cell;
      const y = Math.floor(index / COLUMNS) * cell;
      const pad = 8;
      ctx.beginPath();
      ctx.roundRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2, 14);
      ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
      ctx.fill();

      const chosen = color === this.color;
      if (!chosen && index !== this.hovered) continue;
      ctx.lineWidth = chosen ? 8 : 5;
      ctx.strokeStyle = chosen ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.stroke();
    }

    this.texture.needsUpdate = true;
  }
}

function handAnchor(controller: ControllerState): THREE.Object3D | null {
  if (controller.isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
