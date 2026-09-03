import * as THREE from 'three';
import { Tool, aimQuaternion, disposeToolTree, type ToolHost } from './Tool';
import { formatPose, holdPoseFrom, readPose, type PoseReadout } from './toolPose';
import { savePose } from './poseStore';
import { playTone } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** How long the measured numbers stay on the display. */
const SHOW_TIME = 20;

const _scale = new THREE.Vector3();
const _aim = new THREE.Quaternion();
const _gripPosition = new THREE.Vector3();
const _gripRotation = new THREE.Quaternion();
const _toolPosition = new THREE.Vector3();
const _toolRotation = new THREE.Quaternion();
const _origin = new THREE.Vector3();

/** The tool being measured, and the pose it had before we started. */
interface Session {
  tool: Tool;
  hand: Handedness;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

/**
 * Werkzeug-Justierer: puts another tool right in your hand.
 *
 * Some tools sit badly — the x-ray scanner wants to be held up in front of the
 * face and hangs off the wrist instead. Rather than guessing offsets in the
 * code, this measures them where the problem is, in the headset:
 *
 * 1. Hold this in one hand and the crooked tool in the other.
 * 2. **Trigger** — the other tool stops in mid-air and stays there.
 * 3. Move that hand to where it *should* be holding the tool.
 * 4. **Trigger** again — the tool jumps back into the hand in exactly that
 *    pose, and the six numbers appear on the display: x, y, z in centimetres,
 *    roll, pitch and yaw in degrees.
 *
 * The numbers are the ones a tool's constructor writes into `holdPosition` and
 * `holdRotation` (`toolPose.ts`, with tests), so a pose that works can be read
 * off and made permanent. Until then it is remembered in the browser, so it
 * survives a reload.
 *
 * `A` cancels a measurement, or puts the last adjusted tool back the way it
 * was built.
 */
export class AdjustTool extends Tool {
  override readonly toolId = 'adjust';
  override readonly label = 'Werkzeug-Justierer';

  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private session: Session | null = null;
  /** The last tool that was adjusted, and how it was built. */
  private previous: Session | null = null;
  private readout: PoseReadout | null = null;
  private showFor = 0;
  private dirty = true;

  constructor() {
    super();
    this.name = 'tool-adjust';
    this.icon = 'wrench';
    this.accent = 0xffc857;
    this.sticky = true;
    this.hint = 'Trigger hält das andere Werkzeug an · nochmal übernimmt';
    this.holdPosition.set(0, -0.01, 0.02);

    const body = new THREE.MeshStandardMaterial({
      color: 0x8d93a6,
      roughness: 0.4,
      metalness: 0.55,
    });
    const grip = new THREE.MeshStandardMaterial({ color: 0x2b2f3d, roughness: 0.75 });

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.085, 0.04), grip);
    handle.position.set(0, -0.05, 0.012);
    this.add(handle);

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.12), body);
    shaft.position.set(0, 0, -0.05);
    this.add(shaft);

    // The open jaws of a spanner, so it reads as "adjust" at a glance.
    for (const side of [-1, 1]) {
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.03, 0.05), body);
      jaw.position.set(side * 0.022, 0, -0.125);
      this.add(jaw);
    }

    this.lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.011, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc857, toneMapped: false }),
    );
    this.lamp.position.set(0, 0.02, -0.02);
    this.add(this.lamp);

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 256;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.display = new THREE.Mesh(
      new THREE.PlaneGeometry(0.17, 0.085),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    // Standing up off the back of the hand, like a small screen on a wrist.
    this.display.position.set(0, 0.085, 0.02);
    this.display.rotation.x = -0.5;
    this.add(this.display);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.5 }),
    );
    this.beam.frustumCulled = false;
    this.beam.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.beam.parent !== host.root) host.root.add(this.beam);
    this.dirty = true;
  }

  override onStow(host: ToolHost): void {
    // Never leave another tool hanging in the air because this one was put away.
    this.cancel(host);
    this.beam.visible = false;
  }

  override onTrigger(_controller: ControllerState, host: ToolHost): void {
    if (this.session) this.finish(host);
    else this.begin(host);
  }

  /** `A`: back out of a measurement, or undo the last one. */
  override onPrimary(_controller: ControllerState, host: ToolHost): void {
    if (this.session) {
      this.cancel(host);
      host.notify('Abgebrochen');
      return;
    }
    const previous = this.previous;
    if (!previous) {
      host.notify('Noch nichts justiert');
      return;
    }
    previous.tool.holdPosition.copy(previous.position);
    previous.tool.holdRotation.copy(previous.rotation);
    savePose(previous.tool.toolId, {
      position: { ...previous.position },
      rotation: {
        x: previous.rotation.x,
        y: previous.rotation.y,
        z: previous.rotation.z,
        w: previous.rotation.w,
      },
    });
    host.notify(`${previous.tool.label} zurückgesetzt`);
    this.previous = null;
    this.readout = null;
    this.dirty = true;
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (this.showFor > 0) {
      this.showFor = Math.max(0, this.showFor - dt);
      if (this.showFor === 0) this.dirty = true;
    }
    if (this.dirty) this.draw();

    const session = this.session;
    this.lamp.material.color.setHex(session ? 0x5ee0a0 : 0xffc857);
    if (!session || !controller) {
      this.beam.visible = false;
      return;
    }

    // A line from the hand that is being moved to the tool waiting in the air,
    // so it is obvious what the trigger is about to snap together.
    const hand = host.ctx.input.get(session.hand);
    if (!hand?.tracked) {
      this.beam.visible = false;
      return;
    }
    handAnchor(hand).getWorldPosition(_origin);
    session.tool.getWorldPosition(_toolPosition);
    const positions = this.beam.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, _origin.x, _origin.y, _origin.z);
    positions.setXYZ(1, _toolPosition.x, _toolPosition.y, _toolPosition.z);
    positions.needsUpdate = true;
    this.beam.geometry.computeBoundingSphere();
    this.beam.visible = true;
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.beam.removeFromParent();
    this.texture.dispose();
  }

  // --- the two halves of a measurement -------------------------------------

  /** Stops the tool in the other hand where it is. */
  private begin(host: ToolHost): void {
    const hand: Handedness = this.heldBy === 'left' ? 'right' : 'left';
    const tool = host.heldTool(hand);
    if (!tool) {
      host.notify('Nichts in der anderen Hand');
      return;
    }
    if (!host.parkTool(tool)) {
      host.notify('Werkzeug lässt sich nicht anhalten');
      return;
    }
    this.session = {
      tool,
      hand,
      position: tool.holdPosition.clone(),
      rotation: tool.holdRotation.clone(),
    };
    this.showFor = 0;
    this.dirty = true;
    playTone({ type: 'square', from: 620, to: 880, duration: 0.1, gain: 0.05 });
    host.notify(`${tool.label} steht · Hand ausrichten, dann Trigger`);
  }

  /** Reads off where the hand is now and gives the tool that pose. */
  private finish(host: ToolHost): void {
    const session = this.session!;
    const controller = host.ctx.input.get(session.hand);
    if (!controller?.tracked) {
      host.notify('Hand nicht getrackt');
      return;
    }

    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_gripPosition, _gripRotation, _scale);
    session.tool.updateWorldMatrix(true, false);
    session.tool.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);
    aimQuaternion(session.tool.alignToAim ? controller : null, _aim);

    const pose = holdPoseFrom(
      { position: _gripPosition, rotation: _gripRotation },
      _aim,
      { position: _toolPosition, rotation: _toolRotation },
    );

    session.tool.holdPosition.set(pose.position.x, pose.position.y, pose.position.z);
    session.tool.holdRotation.set(
      pose.rotation.x,
      pose.rotation.y,
      pose.rotation.z,
      pose.rotation.w,
    );
    host.unparkTool(session.tool);
    savePose(session.tool.toolId, pose);

    this.readout = readPose(pose);
    this.showFor = SHOW_TIME;
    this.dirty = true;
    this.previous = session;
    this.session = null;
    this.beam.visible = false;
    controller.pulse(0.6, 40);
    playTone({ type: 'square', from: 880, to: 520, duration: 0.12, gain: 0.05 });
    host.notify(`${session.tool.label}: ${formatPose(this.readout)}`);
  }

  /** Puts a parked tool back exactly as it was. */
  private cancel(host: ToolHost): void {
    const session = this.session;
    if (!session) return;
    session.tool.holdPosition.copy(session.position);
    session.tool.holdRotation.copy(session.rotation);
    host.unparkTool(session.tool);
    this.session = null;
    this.beam.visible = false;
    this.dirty = true;
  }

  // --- display -------------------------------------------------------------

  private draw(): void {
    this.dirty = false;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 256);
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 244, 26);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.session ? '#5ee0a0' : '#ffc857';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    if (this.session) {
      ctx.font = '700 40px system-ui, sans-serif';
      ctx.fillText('HAND SETZEN', 256, 96);
      ctx.font = '500 32px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      ctx.fillText('Trigger übernimmt', 256, 156);
      this.texture.needsUpdate = true;
      return;
    }

    const readout = this.readout;
    if (!readout || this.showFor <= 0) {
      ctx.font = '600 36px system-ui, sans-serif';
      ctx.fillText('Werkzeug in die', 256, 92);
      ctx.fillText('andere Hand', 256, 148);
      this.texture.needsUpdate = true;
      return;
    }

    ctx.font = '600 38px system-ui, sans-serif';
    ctx.fillText(`x ${readout.x}  y ${readout.y}  z ${readout.z}`, 256, 78);
    ctx.font = '500 30px system-ui, sans-serif';
    ctx.fillStyle = '#9fe3ff';
    ctx.fillText('Zentimeter', 256, 118);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 34px system-ui, sans-serif';
    ctx.fillText(`roll ${readout.roll}°  pitch ${readout.pitch}°`, 256, 168);
    ctx.fillText(`yaw ${readout.yaw}°`, 256, 210);
    this.texture.needsUpdate = true;
  }
}

/** The node a tool hangs on: the grip, or the ray when there is no grip. */
function handAnchor(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}
