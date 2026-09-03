import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How far the eraser reaches when it is not touching anything. */
const RANGE = 8;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

/**
 * Radiergummi. Touch a prop with it, or point at one, and the trigger deletes
 * it — for everybody in the session. Deleted is deleted: a reset puts the
 * remaining props back where they started, it does not conjure erased ones
 * back. The magic bag is where new ones come from.
 */
export class EraserTool extends Tool {
  override readonly toolId = 'eraser';
  override readonly label = 'Radiergummi';

  private readonly tipAnchor = new THREE.Object3D();
  private readonly rubber: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private flash = 0;

  constructor() {
    super();
    this.name = 'tool-eraser';
    this.icon = 'eraser';
    this.accent = 0xff6ea3;
    this.hint = 'Trigger löscht das Objekt';
    this.holdPosition.set(0, -0.01, 0.02);

    const sleeve = new THREE.MeshStandardMaterial({ color: 0x2b3346, roughness: 0.7 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.03, 0.1), sleeve);
    body.position.set(0, 0, -0.02);
    this.add(body);

    this.rubber = new THREE.Mesh(
      new THREE.BoxGeometry(0.042, 0.036, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xff9ec4, roughness: 0.85 }),
    );
    this.rubber.position.set(0, 0, -0.1);
    this.add(this.rubber);

    this.tipAnchor.position.set(0, 0, -0.135);
    this.add(this.tipAnchor);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.tipAnchor.getWorldPosition(_tip);
    let entry = host.propAt(_tip);
    if (!entry) {
      _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
      entry = host.aimAt(_tip, _direction, RANGE);
    }
    if (!entry) {
      host.notify('Nichts zum Löschen getroffen');
      return;
    }
    host.removeProp(entry);
    this.flash = 1;
    controller.pulse(0.5, 35);
    playTone({ type: 'sawtooth', from: 520, to: 90, duration: 0.16, gain: 0.06 });
  }

  override update(dt: number, _host: ToolHost, _controller: ControllerState | null): void {
    if (this.flash <= 0) return;
    this.flash = Math.max(0, this.flash - dt * 3);
    this.rubber.material.emissive.setHex(0xff3b6f).multiplyScalar(this.flash * 0.8);
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }
}
