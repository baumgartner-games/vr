import * as THREE from 'three';
import { GLOVE_BACK, Tool, disposeToolTree, type ToolHost } from './Tool';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** How far the glove reaches. */
const RANGE = 14;
/** Shove strength — metres per second the pushed prop leaves with. */
const PUSH_SPEED = 9;

const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

/**
 * Gravity glove.
 *
 * Point at something and pull the trigger: it flies straight into your hand,
 * no wrist flick needed — that is what the remote grab wants the grab button
 * and a tilt for. The grab button on the glove does the opposite and shoves
 * the thing away.
 *
 * It is taken once and stays in the hand (both buttons have a job), and goes
 * back by holding it against a hip.
 */
export class GravityGloveTool extends Tool {
  override readonly toolId = 'gravity-glove';
  override readonly label = 'Gravitationshandschuh';

  private readonly ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshStandardMaterial>;
  private readonly core: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private glow = 0;
  /** +1 just pulled, -1 just pushed — colours the ring for a moment. */
  private direction = 0;

  constructor() {
    super();
    this.name = 'tool-gravity-glove';
    this.icon = 'magnet';
    this.accent = 0x9d7bff;
    this.sticky = true;
    this.hint = 'Trigger zieht her · Greifen stößt ab · am Gürtel ablegen';
    this.wear();

    const shell = new THREE.MeshStandardMaterial({
      color: 0x3b4358,
      roughness: 0.5,
      metalness: 0.4,
    });

    // Auf dem Handrücken (`Tool.worn`): die Platte liegt über der Handfläche
    // und nicht in ihr.
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.018, 0.1), shell);
    back.position.set(0, GLOVE_BACK, -0.01);
    this.add(back);

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.008, 10, 26),
      new THREE.MeshStandardMaterial({
        color: 0x9d7bff,
        emissive: new THREE.Color(0x9d7bff).multiplyScalar(0.4),
        roughness: 0.3,
        metalness: 0.5,
      }),
    );
    this.ring.position.set(0, GLOVE_BACK, -0.075);
    this.add(this.ring);

    this.core = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 14, 10),
      new THREE.MeshBasicMaterial({ color: 0xd9ccff, toneMapped: false }),
    );
    this.core.position.copy(this.ring.position);
    this.add(this.core);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const entry = this.aimed(host);
    if (!entry) {
      host.notify('Nichts angepeilt');
      return;
    }
    host.pullProp(entry, this.heldBy ?? 'right');
    this.glow = 1;
    this.direction = 1;
    controller.pulse(0.6, 40);
    playTone({ type: 'triangle', from: 300, to: 900, duration: 0.16, gain: 0.06 });
  }

  override onGrab(controller: ControllerState, host: ToolHost): void {
    const entry = this.aimed(host);
    if (!entry) {
      host.notify('Nichts angepeilt');
      return;
    }
    host.pushProp(entry, _direction, PUSH_SPEED);
    this.glow = 1;
    this.direction = -1;
    controller.pulse(0.6, 40);
    playTone({ type: 'triangle', from: 900, to: 240, duration: 0.16, gain: 0.06 });
  }

  override update(dt: number, _host: ToolHost, _controller: ControllerState | null): void {
    this.glow = Math.max(0, this.glow - dt * 2.2);
    const color = this.direction >= 0 ? 0x9d7bff : 0xffb35c;
    this.ring.material.emissive.setHex(color).multiplyScalar(0.35 + this.glow * 0.65);
    this.core.material.color.setHex(color).lerp(WHITE, 0.4 + this.glow * 0.5);
    this.core.scale.setScalar(1 + this.glow * 0.6);
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }

  /** The prop the glove currently points at, if any. */
  private aimed(host: ToolHost) {
    this.core.getWorldPosition(_origin);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    return host.aimAt(_origin, _direction, RANGE);
  }
}

const WHITE = new THREE.Color(0xffffff);
