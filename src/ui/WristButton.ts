import * as THREE from 'three';
import type { Pointer } from '../core/Pointer';
import type { ControllerState, Handedness, XRInput } from '../core/XRInput';

const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _handUp = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _mat = new THREE.Matrix4();
const _local = new THREE.Matrix4();

/**
 * **Der runde ☰-Knopf am Handgelenk** — nur noch ein Schalter.
 *
 * Das Menü selbst hing bis Oktober 2026 hier, an der Hand, die den Knopf
 * trägt. Jetzt fliegt es als Bildschirm vor den Spieler (`XRMenu`); der Knopf
 * bleibt, weil ☰ am Controller nur links sitzt und eine Hand ohne Controller
 * (Handtracking) gar keinen hat. Beide Handgelenke tragen einen: Was die eine
 * Hand gerade hält, verdeckt den Knopf der anderen nicht.
 */
export class WristButton extends THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial> {
  /** Ausblenden, solange ohne Brille die Seite das Menü trägt. */
  hidden = false;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private hot = false;
  private open = false;

  constructor(
    readonly hand: Handedness,
    private readonly onPress: () => void,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    super(
      new THREE.CircleGeometry(0.026, 32),
      new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        toneMapped: false,
        depthWrite: false,
      }),
    );
    this.canvas = canvas;
    this.texture = texture;
    this.name = `wrist-menu-button-${hand}`;
    this.renderOrder = 12;
    this.geometry.computeBoundingBox();
    this.visible = false;
    this.draw();
  }

  /** Beim Zeiger anmelden — nach jedem `pointer.clear()` neu. */
  attachPointer(pointer: Pointer): void {
    pointer.remove(this);
    pointer.add({
      object: this,
      // Only the trigger (or A) opens it — brushing past must not toggle it.
      pokeable: false,
      // Der Strahl der eigenen Hand streift bei jeder Drehung über den Knopf
      // und nähme ihr dann den Trigger weg; drücken tut ihn die andere.
      ignore: (hand) => hand === this.hand,
      onHover: () => this.setHot(true),
      onBlur: () => this.setHot(false),
      onSelect: () => this.onPress(),
    });
  }

  /** Ob das Menü offen ist — dann zeigt der Knopf ein ✕. */
  setOpen(open: boolean): void {
    if (this.open === open) return;
    this.open = open;
    this.draw();
  }

  /** Auf den Handrücken, zum Kopf gedreht — im Raum des Elternteils (Rig). */
  update(input: XRInput, headWorld: THREE.Matrix4): void {
    const controller = input.get(this.hand);
    const anchor = controller?.tracked ? wristObject(controller) : null;
    this.visible = anchor !== null && !this.hidden;
    if (!anchor || !this.parent) return;

    this.parent.updateMatrixWorld(true);
    _local.copy(this.parent.matrixWorld).invert().multiply(headWorld);
    _head.setFromMatrixPosition(_local);
    _wrist.copy(anchor.position);
    // The hand's own up axis carries the button on the back of the hand.
    _handUp.set(0, 1, 0).applyQuaternion(anchor.quaternion);
    _dir.copy(_head).sub(_wrist).normalize();
    if (Math.abs(_handUp.dot(_dir)) > 0.97) _handUp.copy(_up);
    this.position.copy(_wrist).addScaledVector(_dir, 0.05).addScaledVector(_handUp, 0.03);
    _mat.lookAt(_head, this.position, _handUp);
    this.quaternion.setFromRotationMatrix(_mat);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.texture.dispose();
    this.removeFromParent();
  }

  private setHot(hot: boolean): void {
    if (this.hot === hot) return;
    this.hot = hot;
    this.draw();
  }

  private draw(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    const size = this.canvas.width;
    ctx.clearRect(0, 0, size, size);

    const glow = ctx.createRadialGradient(128, 128, 40, 128, 128, 126);
    glow.addColorStop(0, this.open ? 'rgba(255, 157, 61, 0.95)' : 'rgba(74, 168, 255, 0.95)');
    glow.addColorStop(1, 'rgba(8, 14, 26, 0.9)');
    ctx.beginPath();
    ctx.arc(128, 128, 124, 0, Math.PI * 2);
    ctx.fillStyle = glow;
    ctx.fill();

    ctx.lineWidth = this.hot ? 12 : 7;
    ctx.strokeStyle = this.hot ? '#ffffff' : 'rgba(255,255,255,0.75)';
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (this.open) {
      ctx.moveTo(88, 88);
      ctx.lineTo(168, 168);
      ctx.moveTo(168, 88);
      ctx.lineTo(88, 168);
    } else {
      for (let i = 0; i < 3; i++) {
        const y = 94 + i * 34;
        ctx.moveTo(86, y);
        ctx.lineTo(170, y);
      }
    }
    ctx.stroke();
    this.texture.needsUpdate = true;
  }
}

function wristObject(controller: ControllerState): THREE.Object3D | null {
  if (controller.isHand) {
    const wrist = controller.hand.joints['wrist'];
    return wrist && wrist.visible ? wrist : null;
  }
  return controller.grip.visible ? controller.grip : null;
}
