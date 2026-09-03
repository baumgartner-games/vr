import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { playPick } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** Length of the arrows; the scale balls sit a little further out. */
const ARM = 0.22;
const BALL_ARM = ARM * 1.34;
/** How close a hand has to come before a handle answers. */
const HANDLE_REACH = 0.09;
const AXIS_COLORS = [0xff4d4d, 0x5ee06a, 0x4aa8ff];
const AXES = ['x', 'y', 'z'] as const;

const _point = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _handPoint = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _forward = new THREE.Vector3();

interface Handle {
  object: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  axis: number;
  kind: 'move' | 'scale';
  base: number;
}

/** What one selected body looked like when a drag started. */
interface Snapshot {
  entry: PhysicsBody;
  position: THREE.Vector3;
  scale: THREE.Vector3;
  half: THREE.Vector3;
}

interface Drag {
  handle: Handle;
  /** Where along the axis the dragging hand started. */
  start: number;
  hand: Handedness;
  snapshots: Snapshot[];
}

/**
 * Blender-style handles for moving and resizing things.
 *
 * Pick objects with the trigger, press `A` to go into edit mode, and the
 * handles appear — on the object when there is only one, otherwise floating in
 * front of you. Balls scale along an axis, arrows move along it. Drag them
 * with the free hand's grab button, or with the trigger of the hand that holds
 * the tool: that hand's grab button is busy holding it.
 *
 * With several objects picked the axes are the world's and the balls resize
 * the whole selection evenly — a single object gets its own axes, which is
 * what makes "wider, but not taller" possible.
 */
export class TransformTool extends Tool {
  override readonly toolId = 'gizmo';
  override readonly label = 'Größe & Position';

  private readonly gizmo = new THREE.Group();
  private readonly handles: Handle[] = [];
  private readonly selection: PhysicsBody[] = [];
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly tip = new THREE.Object3D();
  private editing = false;
  private drag: Drag | null = null;
  private aimed: PhysicsBody | null = null;

  constructor() {
    super();
    this.name = 'tool-gizmo';
    this.icon = 'gizmo';
    this.accent = 0x5ee0a0;
    this.hint = 'Trigger wählt aus · A startet den Edit-Modus';
    this.holdPosition.set(0, -0.01, 0.02);

    const body = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });
    const grip = new THREE.MeshStandardMaterial({ color: 0x22293a, roughness: 0.7 });

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.13), body);
    shaft.position.set(0, 0, -0.05);
    this.add(shaft);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.08, 0.04), grip);
    handle.position.set(0, -0.05, 0.015);
    this.add(handle);
    for (const side of [-1, 1]) {
      const prong = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.06), body);
      prong.position.set(side * 0.016, 0, -0.14);
      this.add(prong);
    }

    this.tip.position.set(0, 0, -0.17);
    this.add(this.tip);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]),
      new THREE.LineBasicMaterial({ color: 0x5ee0a0, transparent: true, opacity: 0.5 }),
    );
    this.beam.frustumCulled = false;
    this.beam.visible = false;
    this.tip.add(this.beam);

    this.buildGizmo();
    this.gizmo.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.gizmo.parent !== host.root) host.root.add(this.gizmo);
  }

  override onStow(host: ToolHost): void {
    this.leaveEdit(host);
    this.clearSelection(host);
    this.beam.visible = false;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.editing) {
      // In edit mode the trigger of the tool hand drags a handle, because that
      // hand's grab button is busy holding the tool.
      this.tryGrabHandle(controller, host, controller.handedness!);
      return;
    }
    if (!this.aimed) {
      host.notify('Nichts angepeilt');
      return;
    }
    this.toggle(this.aimed, host);
    controller.pulse(0.4, 25);
  }

  override onTriggerUp(controller: ControllerState, _host: ToolHost): void {
    if (this.drag?.hand === controller.handedness) this.drag = null;
  }

  /** `A` switches between picking objects and editing them. */
  primary(host: ToolHost): void {
    if (this.editing) {
      this.leaveEdit(host);
      host.notify('Auswahl-Modus');
      return;
    }
    if (!this.selection.length) {
      host.notify('Erst Objekte mit dem Trigger auswählen');
      return;
    }
    this.enterEdit(host);
    host.notify(
      this.selection.length === 1
        ? 'Edit-Modus · Achsen des Objekts'
        : `Edit-Modus · ${this.selection.length} Objekte`,
    );
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    void dt;
    if (!controller || !this.heldBy) {
      this.beam.visible = false;
      this.gizmo.visible = this.editing;
      return;
    }

    // Objects that were let go of somewhere else are dropped from the pick.
    const alive = host.props();
    for (let i = this.selection.length - 1; i >= 0; i--) {
      if (!alive.includes(this.selection[i]!)) this.selection.splice(i, 1);
    }
    host.setSelection(this.selection);

    if (!this.editing) {
      this.updateAim(host);
      this.gizmo.visible = false;
      return;
    }

    this.beam.visible = false;
    this.gizmo.visible = true;
    this.placeGizmo();
    this.updateHandles(host, controller);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.gizmo);
    this.gizmo.removeFromParent();
    this.beam.geometry.dispose();
    this.beam.material.dispose();
  }

  /** Bodies the tool currently owns — the world leaves their glow to us. */
  get picked(): readonly PhysicsBody[] {
    return this.selection;
  }

  // --- picking ------------------------------------------------------------

  private updateAim(host: ToolHost): void {
    this.tip.getWorldPosition(_point);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    this.aimed = host.aimAt(_point, _direction, 9);
    this.beam.visible = true;
    this.beam.scale.z = this.aimed ? _point.distanceTo(bodyPosition(this.aimed, _offset)) : 1.5;
    this.beam.material.color.setHex(this.aimed ? 0xffb35c : 0x5ee0a0);
  }

  private toggle(entry: PhysicsBody, host: ToolHost): void {
    const index = this.selection.indexOf(entry);
    if (index >= 0) this.selection.splice(index, 1);
    else this.selection.push(entry);
    playPick(index < 0);
    host.setSelection(this.selection);
    host.notify(`${this.selection.length} ausgewählt`);
  }

  private clearSelection(host: ToolHost): void {
    this.selection.length = 0;
    host.setSelection(this.selection);
  }

  // --- edit mode ----------------------------------------------------------

  private enterEdit(host: ToolHost): void {
    this.editing = true;
    const rapier = host.physics.rapier;
    for (const entry of this.selection) {
      // Frozen while they are being edited, or gravity fights every drag.
      entry.body.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      host.physics.setCarried(entry, true);
    }
    this.placeGizmo(true);
  }

  private leaveEdit(host: ToolHost): void {
    if (!this.editing) return;
    this.editing = false;
    this.drag = null;
    const rapier = host.physics.rapier;
    for (const entry of this.selection) {
      entry.body.setBodyType(rapier.RigidBodyType.Dynamic, true);
      entry.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      host.physics.setCarried(entry, false);
    }
    this.gizmo.visible = false;
  }

  /**
   * One object: the handles sit on it and follow its own axes. Several: they
   * hang in the air over the middle of the selection, aligned to the world.
   */
  private placeGizmo(reset = false): void {
    if (!this.selection.length) return;
    const single = this.selection.length === 1 ? this.selection[0]! : null;

    if (single) {
      bodyPosition(single, _point);
      const r = single.body.rotation();
      this.gizmo.quaternion.set(r.x, r.y, r.z, r.w);
      this.gizmo.position.copy(_point);
      return;
    }

    _point.set(0, 0, 0);
    for (const entry of this.selection) _point.add(bodyPosition(entry, _offset));
    _point.divideScalar(this.selection.length);
    this.gizmo.position.copy(_point);
    if (reset) this.gizmo.quaternion.identity();
  }

  private updateHandles(host: ToolHost, toolHand: ControllerState): void {
    const other = host.ctx.input.get(toolHand.handedness === 'left' ? 'right' : 'left');

    // Dragging: the hand that started it keeps steering until it lets go.
    if (this.drag) {
      const controller = this.drag.hand === toolHand.handedness ? toolHand : other;
      const holding =
        controller?.tracked &&
        (this.drag.hand === toolHand.handedness
          ? controller.trigger.pressed
          : controller.isHand
            ? controller.trigger.pressed
            : controller.squeeze.pressed);
      if (!controller || !holding) {
        this.drag = null;
      } else {
        this.applyDrag(host, controller);
      }
    }

    if (!this.drag && other?.tracked) {
      const pressed = other.isHand ? other.trigger.justPressed : other.squeeze.justPressed;
      if (pressed) this.tryGrabHandle(other, host, other.handedness!);
    }

    // Highlight whatever a hand is close to, so it is clear what will move.
    for (const handle of this.handles) {
      handle.object.getWorldPosition(_point);
      const near =
        this.drag?.handle === handle ||
        nearHand(toolHand, _point) ||
        (other ? nearHand(other, _point) : false);
      const color = AXIS_COLORS[handle.axis]!;
      handle.object.material.color.setHex(color);
      handle.object.material.opacity = near ? 1 : 0.72;
      handle.object.scale.setScalar(near ? 1.35 : 1);
    }
  }

  private tryGrabHandle(controller: ControllerState, host: ToolHost, hand: Handedness): void {
    if (!this.editing || !this.selection.length) return;
    handPosition(controller, _handPoint);

    let best: Handle | null = null;
    let bestDistance = HANDLE_REACH;
    for (const handle of this.handles) {
      handle.object.getWorldPosition(_point);
      const gap = _point.distanceTo(_handPoint);
      if (gap >= bestDistance) continue;
      best = handle;
      bestDistance = gap;
    }
    if (!best) return;

    this.drag = {
      handle: best,
      hand,
      start: this.along(best.axis, _handPoint),
      snapshots: this.selection.map((entry) => ({
        entry,
        position: bodyPosition(entry, new THREE.Vector3()).clone(),
        scale: entry.object.scale.clone(),
        half: entry.halfExtents.clone(),
      })),
    };
    controller.pulse(0.5, 30);
    void host;
  }

  private applyDrag(host: ToolHost, controller: ControllerState): void {
    const drag = this.drag!;
    handPosition(controller, _handPoint);
    const delta = this.along(drag.handle.axis, _handPoint) - drag.start;

    this.axisVector(drag.handle.axis, _axis);
    if (drag.handle.kind === 'move') {
      for (const snapshot of drag.snapshots) {
        _point.copy(snapshot.position).addScaledVector(_axis, delta);
        snapshot.entry.body.setNextKinematicTranslation(_point);
        snapshot.entry.body.setTranslation(_point, true);
      }
      this.placeGizmo();
      return;
    }

    // Scaling: the pull along the axis is read as a factor around the centre.
    const factor = THREE.MathUtils.clamp(1 + delta / ARM, 0.15, 6);
    const single = drag.snapshots.length === 1;
    const axisName = AXES[drag.handle.axis]!;

    for (const snapshot of drag.snapshots) {
      const { entry } = snapshot;
      if (single) {
        // The gizmo wears the object's own rotation, so one axis is enough.
        entry.object.scale.copy(snapshot.scale);
        entry.object.scale[axisName] = snapshot.scale[axisName] * factor;
        _offset.copy(snapshot.half);
        _offset[axisName] = snapshot.half[axisName] * factor;
        host.physics.resize(entry, _offset);
        continue;
      }
      // With several objects the axes are the world's, which a per-object
      // scale cannot follow — so they all grow evenly and spread apart.
      entry.object.scale.copy(snapshot.scale).multiplyScalar(factor);
      host.physics.resize(entry, _offset.copy(snapshot.half).multiplyScalar(factor));
      _point
        .copy(snapshot.position)
        .sub(this.gizmo.position)
        .multiplyScalar(factor)
        .add(this.gizmo.position);
      entry.body.setNextKinematicTranslation(_point);
      entry.body.setTranslation(_point, true);
    }
  }

  /** How far along a gizmo axis a world point sits. */
  private along(axis: number, point: THREE.Vector3): number {
    this.axisVector(axis, _axis);
    return _offset.copy(point).sub(this.gizmo.position).dot(_axis);
  }

  private axisVector(axis: number, target: THREE.Vector3): THREE.Vector3 {
    target.set(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);
    this.gizmo.updateMatrixWorld();
    return target.applyQuaternion(this.gizmo.getWorldQuaternion(_quaternion)).normalize();
  }

  private buildGizmo(): void {
    this.gizmo.name = 'transform-gizmo';
    this.gizmo.renderOrder = 14;

    for (let axis = 0; axis < 3; axis++) {
      const color = AXIS_COLORS[axis]!;
      _forward.set(axis === 0 ? 1 : 0, axis === 1 ? 1 : 0, axis === 2 ? 1 : 0);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, ARM, 8),
        gizmoMaterial(color),
      );
      shaft.position.copy(_forward).multiplyScalar(ARM / 2);
      orient(shaft, _forward);
      this.gizmo.add(shaft);

      const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 12), gizmoMaterial(color));
      arrow.position.copy(_forward).multiplyScalar(ARM);
      orient(arrow, _forward);
      this.gizmo.add(arrow);
      this.handles.push({ object: arrow, axis, kind: 'move', base: ARM });

      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), gizmoMaterial(color));
      ball.position.copy(_forward).multiplyScalar(BALL_ARM);
      this.gizmo.add(ball);
      this.handles.push({ object: ball, axis, kind: 'scale', base: BALL_ARM });
    }

    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.016, 14, 10), gizmoMaterial(0xf3f6fb));
    this.gizmo.add(centre);
  }
}

function gizmoMaterial(color: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    toneMapped: false,
    transparent: true,
    opacity: 0.72,
    depthTest: false,
  });
}

/** Points a cylinder or cone (built along +Y) down the given axis. */
function orient(mesh: THREE.Mesh, axis: THREE.Vector3): void {
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis);
}

function bodyPosition(entry: PhysicsBody, target: THREE.Vector3): THREE.Vector3 {
  const t = entry.body.translation();
  return target.set(t.x, t.y, t.z);
}

function handPosition(controller: ControllerState, target: THREE.Vector3): THREE.Vector3 {
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  return anchor.getWorldPosition(target);
}

function nearHand(controller: ControllerState, point: THREE.Vector3): boolean {
  if (!controller.tracked) return false;
  handPosition(controller, _handPoint);
  return _handPoint.distanceTo(point) < HANDLE_REACH;
}
