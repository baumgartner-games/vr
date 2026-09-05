import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick, playTone } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** How far the iron reaches when it is not touching anything. */
const RANGE = 6;

const PANEL_W = 0.17;
const PANEL_H = 0.075;
const CANVAS_W = 512;
const CANVAS_H = 226;

type WeldMode = 'fixed' | 'hinge' | 'cut';

const MODES: WeldMode[] = ['fixed', 'hinge', 'cut'];
const MODE_LABEL: Record<WeldMode, string> = {
  fixed: 'Starr',
  hinge: 'Scharnier',
  cut: 'Trennen',
};
const MODE_HINT: Record<WeldMode, string> = {
  fixed: 'Objekte behalten ihre Lage zueinander',
  hinge: 'Achse = Querachse des Kolbens',
  cut: 'Verbindungen eines Objekts lösen',
};
const MODE_COLOR: Record<WeldMode, number> = {
  fixed: 0x5ee0a0,
  hinge: 0x4aa8ff,
  cut: 0xff6ea3,
};

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _wrist = new THREE.Vector3();
const _head = new THREE.Vector3();
const _handUp = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

interface Pick {
  entry: PhysicsBody;
  /** World point the joint should sit at. */
  point: THREE.Vector3;
}

/**
 * Lötkolben — the Garry's Mod weld tool, with a hot tip.
 *
 * While it is held that hand stops knocking things over (`phaseHands`), so the
 * iron can be pushed into a stack to pick exactly the spot a joint should sit
 * at. The first trigger marks a point on one object, the second marks a point
 * on another, and the two are tied together.
 *
 * The free hand carries a small panel with the mode: a rigid joint that keeps
 * the objects exactly as they are to each other, a hinge that leaves one axis
 * free — the iron's crosswise axis, so the wrist aims it — or the torch that
 * cuts every joint of whatever it touches. Its trigger (or A/X) switches.
 */
export class WelderTool extends Tool {
  override readonly toolId = 'welder';
  override readonly label = 'Lötkolben';

  /** Mode panel over the free hand, in world space. */
  readonly panel: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  private readonly tipAnchor = new THREE.Object3D();
  private readonly hotTip: THREE.Mesh<THREE.ConeGeometry, THREE.MeshStandardMaterial>;
  private readonly markers = new THREE.Group();
  private readonly markerA: THREE.Mesh;
  private readonly markerB: THREE.Mesh;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private mode: WeldMode = 'fixed';
  private pending: Pick | null = null;
  private heat = 0;

  constructor() {
    super();
    this.name = 'tool-welder';
    this.icon = 'weld';
    this.accent = 0x5ee0a0;
    this.hint = 'Zwei Punkte antippen · andere Hand wählt die Art';
    // Reaching into a pile to pick a joint point must not scatter the pile.
    this.phaseHands = true;
    // Eine **Lötpistole** und kein Kolben: derselbe Griff wie an allem anderen,
    // quer unter dem Stab. Er hing eine Weile am Stabgriff — Stab in der Faust,
    // Spitze auf der Faustachse —, und das kostete eine zweite Faust und eine
    // Spitze, die nicht dorthin zeigte, wohin man zeigt (`gripFit.ts`).
    this.mountGrip({ length: 0.085 });

    const steel = new THREE.MeshStandardMaterial({
      color: 0xb9c2d4,
      roughness: 0.3,
      metalness: 0.7,
    });

    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.009, 0.08, 12), steel);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.set(0, 0, -0.1);
    this.add(shaft);

    this.hotTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.008, 0.03, 12),
      new THREE.MeshStandardMaterial({
        color: 0xffa552,
        emissive: new THREE.Color(0xff7a2f),
        roughness: 0.4,
      }),
    );
    this.hotTip.rotation.x = -Math.PI / 2;
    this.hotTip.position.set(0, 0, -0.152);
    this.add(this.hotTip);

    this.tipAnchor.position.set(0, 0, -0.172);
    this.add(this.tipAnchor);

    this.markers.name = 'weld-markers';
    const markerGeometry = new THREE.SphereGeometry(0.022, 12, 8);
    this.markerA = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({ color: 0x5ee0a0, transparent: true, opacity: 0.85 }),
    );
    this.markerB = new THREE.Mesh(
      markerGeometry,
      new THREE.MeshBasicMaterial({ color: 0xffc857, transparent: true, opacity: 0.85 }),
    );
    this.markerA.visible = false;
    this.markerB.visible = false;
    this.markers.add(this.markerA, this.markerB);

    this.canvas = document.createElement('canvas');
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.panel = new THREE.Mesh(
      new THREE.PlaneGeometry(PANEL_W, PANEL_H),
      new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, toneMapped: false }),
    );
    this.panel.name = 'welder-panel';
    this.panel.renderOrder = 11;
    this.panel.visible = false;
    this.drawPanel();
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.panel.parent !== host.root) host.root.add(this.panel, this.markers);
    this.panel.visible = true;
  }

  override onStow(_host: ToolHost): void {
    this.panel.visible = false;
    this.clearPending();
  }

  /** The A/X button of the holding hand switches too — one hand is enough. */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    this.cycleMode(controller, host);
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const hit = this.aimed(host);
    if (!hit) {
      host.notify('Kein Objekt getroffen');
      return;
    }

    if (this.mode === 'cut') {
      const cut = host.unweld(hit.entry);
      host.notify(cut ? `${cut} Verbindung${cut > 1 ? 'en' : ''} gelöst` : 'Keine Verbindung dran');
      if (cut) playTone({ type: 'sawtooth', from: 420, to: 120, duration: 0.18, gain: 0.06 });
      controller.pulse(0.5, 35);
      return;
    }

    if (!this.pending) {
      this.pending = { entry: hit.entry, point: hit.point.clone() };
      this.markerA.position.copy(hit.point);
      this.markerA.visible = true;
      this.markerB.visible = false;
      host.notify('Erster Punkt gesetzt');
      controller.pulse(0.35, 20);
      playPick(true);
      return;
    }

    if (this.pending.entry === hit.entry) {
      host.notify('Zweiter Punkt muss auf einem anderen Objekt liegen');
      return;
    }

    // The hinge turns around the iron's crosswise axis, so the wrist aims it.
    _axis.set(1, 0, 0).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const welded = host.weld({
      a: this.pending.entry,
      b: hit.entry,
      pointA: this.pending.point,
      pointB: hit.point,
      hinge: this.mode === 'hinge',
      axis: _axis,
    });
    this.markerB.position.copy(hit.point);
    this.markerB.visible = welded;
    host.notify(
      welded ? (this.mode === 'hinge' ? 'Scharnier gesetzt' : 'Verschweißt') : 'Geht nicht',
    );
    if (welded) {
      this.heat = 1;
      playTone({ type: 'sawtooth', from: 180, to: 640, duration: 0.22, gain: 0.06 });
      controller.pulse(0.7, 50);
    }
    this.pending = null;
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    this.heat = Math.max(0, this.heat - dt * 1.6);
    this.hotTip.material.emissive.setHex(0xff7a2f).multiplyScalar(0.5 + this.heat * 0.5);

    if (!controller || !this.heldBy) {
      this.panel.visible = false;
      this.markers.visible = false;
      return;
    }
    this.markers.visible = true;

    const other: Handedness = this.heldBy === 'left' ? 'right' : 'left';
    const free = host.ctx.input.get(other);
    const anchor = free?.tracked ? handAnchor(free) : null;
    if (!free || !anchor) {
      this.panel.visible = false;
      return;
    }

    // Same gesture as the brush palette: the panel stands on the free hand.
    anchor.getWorldPosition(_wrist);
    host.ctx.rig.getHeadPosition(_head);
    _handUp.set(0, 1, 0).applyQuaternion(anchor.getWorldQuaternion(_quaternion));
    if (Math.abs(_handUp.y) < 0.15) _handUp.copy(_up);
    _direction.copy(_head).sub(_wrist).normalize();
    this.panel.position
      .copy(_wrist)
      .addScaledVector(_direction, 0.06)
      .addScaledVector(_handUp, 0.11);
    _matrix.lookAt(_head, this.panel.position, _handUp);
    this.panel.quaternion.setFromRotationMatrix(_matrix);
    this.panel.visible = true;

    // The free hand switches the mode: its trigger, or A/X.
    if (
      !host.ctx.pointer.hoveringWith(free.handedness) &&
      (free.trigger.justPressed || free.primary.justPressed)
    ) {
      this.cycleMode(free, host);
    }
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.markers);
    this.markers.removeFromParent();
    this.panel.geometry.dispose();
    this.panel.material.dispose();
    this.panel.removeFromParent();
    this.texture.dispose();
  }

  private cycleMode(controller: ControllerState, host: ToolHost): void {
    this.mode = MODES[(MODES.indexOf(this.mode) + 1) % MODES.length]!;
    this.clearPending();
    this.drawPanel();
    controller.pulse(0.3, 20);
    playPick(true);
    host.notify(MODE_LABEL[this.mode]);
  }

  private clearPending(): void {
    this.pending = null;
    this.markerA.visible = false;
    this.markerB.visible = false;
  }

  /** The prop the iron touches, or the one it points at, plus the exact spot. */
  private aimed(host: ToolHost): Pick | null {
    this.tipAnchor.getWorldPosition(_tip);
    const touched = host.propAt(_tip);
    if (touched) return { entry: touched, point: _tip.clone() };

    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const aimed = host.aimAt(_tip, _direction, RANGE);
    // Pointing at something from afar puts the joint in its middle — the exact
    // spot only matters when the iron actually touches it.
    return aimed ? { entry: aimed, point: aimed.object.position.clone() } : null;
  }

  private drawPanel(): void {
    const ctx = this.canvas.getContext('2d')!;
    const accent = `#${MODE_COLOR[this.mode].toString(16).padStart(6, '0')}`;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.beginPath();
    ctx.roundRect(4, 4, CANVAS_W - 8, CANVAS_H - 8, 26);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.93)';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = accent;
    ctx.stroke();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#8ea0c4';
    ctx.font = '600 26px system-ui, sans-serif';
    ctx.fillText('LÖTKOLBEN', 28, 52);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 52px system-ui, sans-serif';
    ctx.fillText(MODE_LABEL[this.mode], 28, 116);

    ctx.fillStyle = '#93a3c4';
    ctx.font = '400 24px system-ui, sans-serif';
    ctx.fillText(MODE_HINT[this.mode], 28, 158);

    ctx.fillStyle = '#71809e';
    ctx.font = '400 22px system-ui, sans-serif';
    ctx.fillText('Trigger dieser Hand wechselt', 28, 196);

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
