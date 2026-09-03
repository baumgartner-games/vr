import * as THREE from 'three';
import { UIPanel, type PanelItem } from './UIPanel';
import type { Pointer } from '../core/Pointer';
import type { XRInput } from '../core/XRInput';

const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat = new THREE.Matrix4();
const _local = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _offset = new THREE.Vector3();

/**
 * The menu button rides on the left hand; pressing it opens a panel that keeps
 * following that hand. The right hand points at it and selects.
 */
export class WristMenu extends THREE.Group {
  readonly panel: UIPanel;
  readonly button: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;

  private open = false;
  private buttonTexture: THREE.CanvasTexture;
  private buttonCanvas: HTMLCanvasElement;
  private buttonHot = false;
  private onSelect?: (id: string) => void;

  constructor(
    private readonly pointer: Pointer,
    options: { onSelect?(id: string): void; title?: string; footer?: string } = {},
  ) {
    super();
    this.name = 'wrist-menu';
    this.onSelect = options.onSelect;

    this.buttonCanvas = document.createElement('canvas');
    this.buttonCanvas.width = 256;
    this.buttonCanvas.height = 256;
    this.buttonTexture = new THREE.CanvasTexture(this.buttonCanvas);
    this.buttonTexture.colorSpace = THREE.SRGBColorSpace;

    this.button = new THREE.Mesh(
      new THREE.CircleGeometry(0.026, 32),
      new THREE.MeshBasicMaterial({
        map: this.buttonTexture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.button.name = 'wrist-menu-button';
    this.button.renderOrder = 12;
    this.button.geometry.computeBoundingBox();
    this.add(this.button);

    this.panel = new UIPanel({
      width: 0.26,
      title: options.title ?? 'Welten',
      footer: options.footer ?? 'Rechte Hand: zielen + Trigger',
      onSelect: (id) => this.handleSelect(id),
    });
    this.panel.visible = false;
    this.add(this.panel);

    this.attachPointer();
    this.drawButton();
  }

  /** (Re-)registers the menu with the pointer, e.g. after a world switch. */
  attachPointer(): void {
    this.pointer.remove(this.button);
    this.pointer.remove(this.panel);
    this.pointer.add({
      object: this.button,
      onHover: () => this.setButtonHot(true),
      onBlur: () => this.setButtonHot(false),
      onSelect: () => this.toggle(),
    });
    this.pointer.add(this.panel.asPointerTarget());
  }

  setItems(items: PanelItem[]): void {
    this.panel.setItems(items);
  }

  setTitle(title: string): void {
    this.panel.setTitle(title);
  }

  setStatus(status: string): void {
    this.panel.setStatus(status);
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.panel.visible = this.open;
    this.drawButton();
  }

  /**
   * @param input     current XR input
   * @param headWorld head pose in world space
   */
  update(dt: number, input: XRInput, headWorld: THREE.Matrix4): void {
    this.panel.update(dt);

    // Everything is computed in this group's space (the player rig), where the
    // controller and joint poses already live.
    this.updateMatrixWorld(true);
    _local.copy(this.matrixWorld).invert().multiply(headWorld);
    _head.setFromMatrixPosition(_local);

    const left = input.get('left');
    const anchor = left?.tracked ? wristObject(left.isHand, left) : null;

    this.button.visible = true;
    this.panel.visible = this.open;

    if (anchor) {
      _wrist.copy(anchor.position);
      _dir.copy(_head).sub(_wrist);
      const distance = _dir.length() || 1;
      _dir.divideScalar(distance);

      this.button.position.copy(_wrist).addScaledVector(_dir, 0.055).addScaledVector(_up, 0.02);
      faceTowards(this.button, _head);

      this.panel.position.copy(_wrist).addScaledVector(_dir, 0.09).addScaledVector(_up, 0.19);
      faceTowards(this.panel, _head);
      return;
    }

    // No left hand (desktop/phone): dock the menu to the view instead.
    _quat.setFromRotationMatrix(_local);
    this.button.position.copy(_head).add(_offset.set(0.2, -0.16, -0.55).applyQuaternion(_quat));
    this.button.quaternion.copy(_quat);
    this.panel.position.copy(_head).add(_offset.set(0, -0.02, -0.62).applyQuaternion(_quat));
    this.panel.quaternion.copy(_quat);
  }

  dispose(): void {
    this.pointer.remove(this.button);
    this.pointer.remove(this.panel);
    this.button.geometry.dispose();
    this.button.material.dispose();
    this.buttonTexture.dispose();
    this.panel.dispose();
    this.removeFromParent();
  }

  private setButtonHot(hot: boolean): void {
    if (this.buttonHot === hot) return;
    this.buttonHot = hot;
    this.drawButton();
  }

  private handleSelect(id: string): void {
    this.onSelect?.(id);
  }

  private drawButton(): void {
    const ctx = this.buttonCanvas.getContext('2d')!;
    const size = this.buttonCanvas.width;
    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(128, 128, 40, 128, 128, 126);
    glow.addColorStop(0, this.open ? 'rgba(255, 157, 61, 0.95)' : 'rgba(74, 168, 255, 0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.9)');
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.lineWidth = this.buttonHot ? 12 : 7;
    ctx.strokeStyle = this.buttonHot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    if (this.open) {
      ctx.beginPath();
      ctx.moveTo(88, 88);
      ctx.lineTo(168, 168);
      ctx.moveTo(168, 88);
      ctx.lineTo(88, 168);
      ctx.stroke();
    } else {
      for (let i = 0; i < 3; i++) {
        const y = 94 + i * 34;
        ctx.beginPath();
        ctx.moveTo(86, y);
        ctx.lineTo(170, y);
        ctx.stroke();
      }
    }

    this.buttonTexture.needsUpdate = true;
  }
}

function wristObject(isHand: boolean, controller: { hand: THREE.XRHandSpace; grip: THREE.Group }) {
  if (isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : null;
}

/** Points an object's +Z axis at a target given in the same parent space. */
function faceTowards(object: THREE.Object3D, target: THREE.Vector3): void {
  _mat.lookAt(target, object.position, _up);
  object.quaternion.setFromRotationMatrix(_mat);
}
