import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How far the tape can be shot before it gives up. */
const RANGE = 40;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _mid = new THREE.Vector3();
const _head = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Messband. The trigger drops the first point, the trigger again the second,
 * and the distance between them stays hanging in the room. Taking the tape
 * back into a hand brings the last measurement back with it, so a room can be
 * checked twice without measuring it twice.
 */
export class TapeTool extends Tool {
  override readonly toolId = 'tape';
  override readonly label = 'Messband';

  private readonly muzzle = new THREE.Object3D();
  /** Everything the measurement draws lives in world space, not in the hand. */
  private readonly marks = new THREE.Group();
  private readonly line: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly pins: [THREE.Mesh, THREE.Mesh];
  private readonly label3d: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly pointA = new THREE.Vector3();
  private readonly pointB = new THREE.Vector3();
  /** 0 = nothing set, 1 = first point set, 2 = a finished measurement. */
  private points = 0;

  constructor() {
    super();
    this.name = 'tool-tape';
    this.icon = 'tape';
    this.accent = 0xffc857;
    this.hint = 'Trigger setzt Punkt 1 · Trigger setzt Punkt 2';
    this.mountGrip('pistol', { length: 0.09 });

    const shell = new THREE.MeshStandardMaterial({ color: 0xffc857, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.7 });

    const box = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.035), shell);
    box.position.set(0, 0, -0.01);
    this.add(box);
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.038, 16), dark);
    spool.rotation.x = Math.PI / 2;
    spool.position.set(0, 0, -0.01);
    this.add(spool);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.012, 0.02), dark);
    lip.position.set(0, -0.03, -0.045);
    this.add(lip);

    this.muzzle.position.set(0, -0.02, -0.06);
    this.add(this.muzzle);

    this.marks.name = 'tape-marks';
    this.marks.visible = false;

    this.line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({
        color: 0xffc857,
        transparent: true,
        opacity: 0.95,
        depthTest: false,
      }),
    );
    this.line.frustumCulled = false;
    this.line.renderOrder = 18;
    this.marks.add(this.line);

    const pinGeometry = new THREE.SphereGeometry(0.02, 12, 8);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xffc857, toneMapped: false });
    this.pins = [
      new THREE.Mesh(pinGeometry, pinMaterial),
      new THREE.Mesh(pinGeometry, pinMaterial),
    ];
    for (const pin of this.pins) {
      pin.renderOrder = 18;
      this.marks.add(pin);
    }

    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 96;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.label3d = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.09),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        toneMapped: false,
        depthTest: false,
      }),
    );
    this.label3d.renderOrder = 19;
    this.marks.add(this.label3d);
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.marks.parent !== host.root) host.root.add(this.marks);
    // Coming back to the tape shows the last measurement again.
    if (this.points === 2) {
      this.marks.visible = true;
      host.notify(`Letzte Messung: ${format(this.pointA.distanceTo(this.pointB))}`);
    }
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const point = this.aimPoint(host);
    if (!point) {
      host.notify('Kein Ziel für den Messpunkt');
      return;
    }

    if (this.points !== 1) {
      this.pointA.copy(point);
      this.pointB.copy(point);
      this.points = 1;
      this.marks.visible = true;
      host.notify('Punkt 1 gesetzt');
      playTone({ type: 'triangle', from: 640, to: 820, duration: 0.06, gain: 0.05 });
    } else {
      this.pointB.copy(point);
      this.points = 2;
      const distance = this.pointA.distanceTo(this.pointB);
      host.notify(`Abstand: ${format(distance)}`);
      playTone({ type: 'triangle', from: 820, to: 1080, duration: 0.09, gain: 0.05 });
    }
    controller.pulse(0.4, 25);
    this.redraw(host);
  }

  override update(_dt: number, host: ToolHost, _controller: ControllerState | null): void {
    if (!this.marks.visible) return;

    // While the second point is still open the tape follows the aim, so the
    // measurement can be read before it is nailed down.
    if (this.points === 1 && this.heldBy) {
      const point = this.aimPoint(host);
      if (point) this.pointB.copy(point);
    }
    this.redraw(host);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.marks);
    this.marks.removeFromParent();
    this.texture.dispose();
  }

  /** Where the tape currently points: a surface, a prop, or nothing. */
  private aimPoint(host: ToolHost): THREE.Vector3 | null {
    this.muzzle.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();

    const prop = host.aimAt(_tip, _direction, RANGE);
    const surface = host.castSurface(_tip, _direction);
    if (prop) {
      const propDistance = prop.object.position.distanceTo(_tip);
      if (!surface || propDistance <= surface.point.distanceTo(_tip)) return prop.object.position;
    }
    return surface ? surface.point : null;
  }

  private redraw(host: ToolHost): void {
    const positions = this.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, this.pointA.x, this.pointA.y, this.pointA.z);
    positions.setXYZ(1, this.pointB.x, this.pointB.y, this.pointB.z);
    positions.needsUpdate = true;
    this.line.geometry.computeBoundingSphere();

    this.pins[0].position.copy(this.pointA);
    this.pins[1].position.copy(this.pointB);
    this.pins[1].visible = this.points >= 1;

    _mid.lerpVectors(this.pointA, this.pointB, 0.5);
    this.label3d.position.copy(_mid).addScaledVector(_up, 0.08);
    host.ctx.rig.getHeadPosition(_head);
    _matrix.lookAt(_head, this.label3d.position, _up);
    this.label3d.quaternion.setFromRotationMatrix(_matrix);

    this.drawLabel(this.pointA.distanceTo(this.pointB));
  }

  private drawLabel(distance: number): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 256, 96);
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 88, 20);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#ffc857';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(format(distance), 128, 50);
    this.texture.needsUpdate = true;
  }
}

/** Centimetres below a metre, metres above it — the way a tape measure reads. */
function format(distance: number): string {
  return distance < 1 ? `${Math.round(distance * 100)} cm` : `${distance.toFixed(2)} m`;
}
