import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { matchAxes, type AxisMatch, type Basis } from './axisMatch';
import { playPick } from '../../../core/Audio';
import type { ControllerState, Handedness } from '../../../core/XRInput';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';

/** Length of the arrows; the scale balls sit a little further out. */
const ARM = 0.16;
const BALL_ARM = ARM * 1.32;
/** How close a hand has to come before a handle answers. */
const HANDLE_REACH = 0.075;
/** Where the handles appear: this far in front of the eyes, this far below. */
const REACH_AHEAD = 0.52;
const REACH_BELOW = 0.16;
/** The player walked away this far — the handles come along. */
const FOLLOW_DISTANCE = 0.75;
const AXIS_COLORS = [0xff4d4d, 0x5ee06a, 0x4aa8ff];
const AXIS_NAMES = ['X', 'Y', 'Z'];
const SIZE_NAMES = ['Breite', 'Höhe', 'Tiefe'];
const SCALE_MIN = 0.12;
const SCALE_MAX = 8;

const _point = new THREE.Vector3();
const _axis = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _handPoint = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _forward = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _basisX = new THREE.Vector3();
const _basisY = new THREE.Vector3();
const _basisZ = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _headPoint = new THREE.Vector3();
const _rotation = new THREE.Quaternion();

interface Handle {
  object: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  /** Which of the gizmo's own three directions this handle sits on. */
  slot: number;
  kind: 'move' | 'scale' | 'uniform';
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
  /** Distance from the centre the hand started at — the scale reads a ratio. */
  radius: number;
  hand: Handedness;
  snapshots: Snapshot[];
}

/**
 * Blender-style handles for moving and resizing things — but held at arm's
 * length instead of out there on the object.
 *
 * Pick objects with the trigger, press `A`, and the handles appear **in front
 * of you**, close enough to touch. Whatever they do happens to the object
 * wherever it stands: a crate on the far side of the room is resized from
 * where you are, and a thin line shows which one is listening.
 *
 * The axes are the object's own, sorted into the player's view: the object
 * axis pointing most to the right becomes the right-hand arrow, and so on
 * (`axisMatch.ts`, with tests). So "wider, but not taller" stays possible for
 * a crate standing askew, and the arrow that means it still points the way it
 * looks. Several objects at once get the world's axes and grow as a group.
 *
 * Arrows move, balls resize one axis, the white ball in the middle resizes
 * everything at once. Any hand may drag them: the free hand with trigger or
 * grab, the hand holding the tool with its trigger.
 */
export class TransformTool extends Tool {
  override readonly toolId = 'gizmo';
  override readonly label = 'Größe & Position';

  private readonly gizmo = new THREE.Group();
  private readonly handles: Handle[] = [];
  private readonly selection: PhysicsBody[] = [];
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly leash: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly readout: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly tip = new THREE.Object3D();
  /** Which object axis each of the gizmo's directions drives, and which way. */
  private axes: AxisMatch[] = [
    { axis: 0, sign: 1 },
    { axis: 1, sign: 1 },
    { axis: 2, sign: 1 },
  ];
  /** Head position the handles were placed for — they follow when it wanders. */
  private readonly anchor = new THREE.Vector3();
  private editing = false;
  private drag: Drag | null = null;
  private aimed: PhysicsBody | null = null;
  /** Text currently on the little display, so it is only redrawn on change. */
  private readoutText = '';

  constructor() {
    super();
    this.name = 'tool-gizmo';
    this.icon = 'gizmo';
    this.accent = 0x5ee0a0;
    this.hint = 'Trigger wählt aus · A holt die Griffe vor dich';
    this.holdPosition.set(0, -0.01, 0.02);

    const body = new THREE.MeshStandardMaterial({
      color: 0x9aa6bd,
      roughness: 0.35,
      metalness: 0.6,
    });

    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.13), body);
    shaft.position.set(0, 0, -0.05);
    this.add(shaft);
    // Derselbe Griff wie an der Pistole (`grip.ts`). Vorher stand er hier
    // senkrecht, also 13° gegen den der Pistole gekippt.
    this.mountGrip({ length: 0.09 });
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

    // The line from the handles to whatever they are steering — without it,
    // handles floating in the air say nothing about what is about to move.
    this.leash = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({
        color: 0x5ee0a0,
        transparent: true,
        opacity: 0.35,
        depthTest: false,
      }),
    );
    this.leash.frustumCulled = false;
    this.leash.renderOrder = 13;

    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 128;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.readout = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06),
      new THREE.MeshBasicMaterial({
        map: this.texture,
        transparent: true,
        toneMapped: false,
        depthTest: false,
      }),
    );
    this.readout.renderOrder = 15;
    this.readout.position.set(0, ARM * 1.9, 0);

    this.buildGizmo();
    this.gizmo.add(this.readout);
    this.gizmo.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.gizmo.parent !== host.root) host.root.add(this.gizmo);
    if (this.leash.parent !== host.root) host.root.add(this.leash);
    this.leash.visible = false;
  }

  override onStow(host: ToolHost): void {
    this.leaveEdit(host);
    this.clearSelection(host);
    this.beam.visible = false;
    this.leash.visible = false;
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
    if (this.drag?.hand === controller.handedness) this.endDrag();
  }

  /** `A` switches between picking objects and editing them. */
  override onPrimary(_controller: ControllerState, host: ToolHost): void {
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
        ? 'Griffe vor dir · Achsen des Objekts'
        : `Griffe vor dir · ${this.selection.length} Objekte`,
    );
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    void dt;
    if (!controller || !this.heldBy) {
      this.beam.visible = false;
      this.leash.visible = false;
      this.gizmo.visible = this.editing;
      return;
    }

    // Objects that were let go of somewhere else are dropped from the pick.
    const alive = host.props();
    for (let i = this.selection.length - 1; i >= 0; i--) {
      if (!alive.includes(this.selection[i]!)) this.selection.splice(i, 1);
    }
    host.setSelection(this.selection);
    if (this.editing && !this.selection.length) this.leaveEdit(host);

    if (!this.editing) {
      this.updateAim(host);
      this.gizmo.visible = false;
      this.leash.visible = false;
      return;
    }

    this.beam.visible = false;
    this.gizmo.visible = true;
    if (!this.drag) this.followHead(host);
    this.updateHandles(host, controller);
    this.updateLeash();
    this.faceReadout(host);
  }

  override disposeTool(): void {
    disposeToolTree(this);
    disposeToolTree(this.gizmo);
    this.gizmo.removeFromParent();
    this.leash.geometry.dispose();
    this.leash.material.dispose();
    this.leash.removeFromParent();
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.texture.dispose();
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
    this.placeGizmo(host);
    this.leash.visible = true;
    this.describeSelection();
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
    this.leash.visible = false;
  }

  /**
   * Puts the handles an arm's length in front of the eyes and turns them into
   * the object's axes, sorted the way the player is looking at them.
   *
   * Nothing here depends on where the object stands: that is the whole point —
   * a crate on the ledge is edited from the floor.
   */
  private placeGizmo(host: ToolHost): void {
    if (!this.selection.length) return;
    const rig = host.ctx.rig;
    rig.getHeadMatrix(_matrix);
    _headPoint.setFromMatrixPosition(_matrix);
    // Columns of the head matrix: right, up and back (towards the player).
    _basisX.setFromMatrixColumn(_matrix, 0).normalize();
    _basisY.setFromMatrixColumn(_matrix, 1).normalize();
    _basisZ.setFromMatrixColumn(_matrix, 2).normalize();

    this.anchor.copy(_headPoint);
    _forward.copy(_basisZ).multiplyScalar(-1);
    this.gizmo.position
      .copy(_headPoint)
      .addScaledVector(_forward, REACH_AHEAD)
      .addScaledVector(_basisY, -REACH_BELOW);

    const view: Basis = [_basisX, _basisY, _basisZ];
    const single = this.selection.length === 1 ? this.selection[0]! : null;
    if (single) {
      const r = single.body.rotation();
      _rotation.set(r.x, r.y, r.z, r.w);
      basisOf(_rotation, OBJECT_BASIS);
      this.axes = matchAxes(OBJECT_BASIS, view);
      setColumns(
        _matrix,
        matchedAxis(OBJECT_BASIS, this.axes[0]!, _point),
        matchedAxis(OBJECT_BASIS, this.axes[1]!, _offset),
        matchedAxis(OBJECT_BASIS, this.axes[2]!, _direction),
      );
      this.gizmo.quaternion.setFromRotationMatrix(_matrix);
      return;
    }

    // Several objects share no axes of their own, so the world's are used —
    // again sorted into the view, so right is right.
    basisOf(IDENTITY, OBJECT_BASIS);
    this.axes = matchAxes(OBJECT_BASIS, view);
    setColumns(
      _matrix,
      matchedAxis(OBJECT_BASIS, this.axes[0]!, _point),
      matchedAxis(OBJECT_BASIS, this.axes[1]!, _offset),
      matchedAxis(OBJECT_BASIS, this.axes[2]!, _direction),
    );
    this.gizmo.quaternion.setFromRotationMatrix(_matrix);
  }

  /** The handles stay within reach: walk away and they come along. */
  private followHead(host: ToolHost): void {
    host.ctx.rig.getHeadPosition(_headPoint);
    if (_headPoint.distanceTo(this.anchor) < FOLLOW_DISTANCE) return;
    this.placeGizmo(host);
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
          : // The free hand answers to either button, whichever is nearer to
            // the finger that is already on it.
            controller.trigger.pressed || controller.squeeze.pressed);
      if (!controller || !holding) this.endDrag();
      else this.applyDrag(host, controller);
    }

    if (!this.drag && other?.tracked) {
      const pressed = other.trigger.justPressed || other.squeeze.justPressed;
      if (pressed) this.tryGrabHandle(other, host, other.handedness!);
    }

    // Highlight whatever a hand is close to, so it is clear what will move.
    for (const handle of this.handles) {
      handle.object.getWorldPosition(_point);
      const near =
        this.drag?.handle === handle ||
        nearHand(toolHand, _point) ||
        (other ? nearHand(other, _point) : false);
      const color = handle.kind === 'uniform' ? 0xf3f6fb : AXIS_COLORS[this.slotAxis(handle.slot)]!;
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
      start: this.along(best.slot, _handPoint),
      radius: Math.max(0.04, _handPoint.distanceTo(this.gizmo.position)),
      snapshots: this.selection.map((entry) => ({
        entry,
        position: bodyPosition(entry, new THREE.Vector3()),
        scale: entry.object.scale.clone(),
        half: entry.halfExtents.clone(),
      })),
    };
    controller.pulse(0.5, 30);
    void host;
  }

  private endDrag(): void {
    if (!this.drag) return;
    this.drag = null;
    this.describeSelection();
  }

  private applyDrag(host: ToolHost, controller: ControllerState): void {
    const drag = this.drag!;
    handPosition(controller, _handPoint);

    if (drag.handle.kind === 'move') {
      // One to one: the object goes exactly as far as the hand does, however
      // far away it stands. Anything else guesses, and guessing is what made
      // the old handles unusable.
      const delta = this.along(drag.handle.slot, _handPoint) - drag.start;
      this.axisVector(drag.handle.slot, _axis);
      for (const snapshot of drag.snapshots) {
        _point.copy(snapshot.position).addScaledVector(_axis, delta);
        snapshot.entry.body.setNextKinematicTranslation(_point);
        snapshot.entry.body.setTranslation(_point, true);
      }
      this.showMove(drag, delta);
      return;
    }

    // Resizing reads the *ratio* of two distances, not a difference: pull the
    // hand twice as far from the middle and the thing is twice as big. Where
    // the hand grabbed the ball does not matter any more — a grip 3 cm off the
    // ball used to jump the size by a third.
    const factor =
      drag.handle.kind === 'uniform'
        ? THREE.MathUtils.clamp(
            _handPoint.distanceTo(this.gizmo.position) / drag.radius,
            SCALE_MIN,
            SCALE_MAX,
          )
        : THREE.MathUtils.clamp(
            Math.abs(this.along(drag.handle.slot, _handPoint)) /
              Math.max(0.04, Math.abs(drag.start)),
            SCALE_MIN,
            SCALE_MAX,
          );

    const single = drag.snapshots.length === 1;
    const uniform = drag.handle.kind === 'uniform';
    const axisName = AXES[this.slotAxis(drag.handle.slot)]!;

    for (const snapshot of drag.snapshots) {
      const { entry } = snapshot;
      if (single) {
        // The gizmo wears the object's own axes, so one of them is enough.
        entry.object.scale.copy(snapshot.scale);
        _offset.copy(snapshot.half);
        if (uniform) {
          entry.object.scale.multiplyScalar(factor);
          _offset.multiplyScalar(factor);
        } else {
          entry.object.scale[axisName] = snapshot.scale[axisName] * factor;
          _offset[axisName] = snapshot.half[axisName] * factor;
        }
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
    this.showScale(drag, factor);
  }

  /** How far along one of the gizmo's directions a world point sits. */
  private along(slot: number, point: THREE.Vector3): number {
    this.axisVector(slot, _axis);
    return _offset.copy(point).sub(this.gizmo.position).dot(_axis);
  }

  private axisVector(slot: number, target: THREE.Vector3): THREE.Vector3 {
    target.set(slot === 0 ? 1 : 0, slot === 1 ? 1 : 0, slot === 2 ? 1 : 0);
    this.gizmo.updateMatrixWorld();
    return target.applyQuaternion(this.gizmo.getWorldQuaternion(_quaternion)).normalize();
  }

  /** Which of the object's axes a handle direction drives. */
  private slotAxis(slot: number): number {
    return this.axes[slot]?.axis ?? slot;
  }

  // --- the line to the objects, and the little display ---------------------

  private updateLeash(): void {
    if (!this.selection.length) {
      this.leash.visible = false;
      return;
    }
    _centre.set(0, 0, 0);
    for (const entry of this.selection) _centre.add(bodyPosition(entry, _offset));
    _centre.divideScalar(this.selection.length);

    const positions = this.leash.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, this.gizmo.position.x, this.gizmo.position.y, this.gizmo.position.z);
    positions.setXYZ(1, _centre.x, _centre.y, _centre.z);
    positions.needsUpdate = true;
    this.leash.geometry.computeBoundingSphere();
    this.leash.visible = true;
  }

  /** The display always turns to the player, wherever the handles ended up. */
  private faceReadout(host: ToolHost): void {
    host.ctx.rig.getHeadPosition(_headPoint);
    this.readout.getWorldPosition(_point);
    _matrix.lookAt(_headPoint, _point, UP_AXIS);
    _rotation.setFromRotationMatrix(_matrix);
    this.gizmo.getWorldQuaternion(_quaternion);
    this.readout.quaternion.copy(_quaternion.invert().multiply(_rotation));
  }

  private describeSelection(): void {
    const single = this.selection.length === 1 ? this.selection[0]! : null;
    if (!single) {
      this.draw(`${this.selection.length} Objekte`, '#9fe3ff');
      return;
    }
    const half = single.halfExtents;
    this.draw(`${metres(half.x * 2)} × ${metres(half.y * 2)} × ${metres(half.z * 2)}`, '#9fe3ff');
  }

  private showMove(drag: Drag, delta: number): void {
    const axis = this.slotAxis(drag.handle.slot);
    this.draw(
      `${AXIS_NAMES[axis]}  ${delta >= 0 ? '+' : '−'}${metres(Math.abs(delta))}`,
      '#5ee0a0',
    );
  }

  private showScale(drag: Drag, factor: number): void {
    if (drag.handle.kind === 'uniform' || drag.snapshots.length !== 1) {
      this.draw(`${factor.toFixed(2)}×  alle Achsen`, '#ffb35c');
      return;
    }
    const axis = this.slotAxis(drag.handle.slot);
    const size = drag.snapshots[0]!.half[AXES[axis]!] * 2 * factor;
    this.draw(`${SIZE_NAMES[axis]}  ${metres(size)}  (${factor.toFixed(2)}×)`, '#ffb35c');
  }

  private draw(text: string, color: string): void {
    if (text === this.readoutText) return;
    this.readoutText = text;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.beginPath();
    ctx.roundRect(6, 6, 500, 116, 26);
    ctx.fillStyle = 'rgba(8, 12, 22, 0.86)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 56px system-ui, sans-serif';
    ctx.fillText(text, 256, 68);
    this.texture.needsUpdate = true;
  }

  private buildGizmo(): void {
    this.gizmo.name = 'transform-gizmo';
    this.gizmo.renderOrder = 14;

    for (let slot = 0; slot < 3; slot++) {
      const color = AXIS_COLORS[slot]!;
      _forward.set(slot === 0 ? 1 : 0, slot === 1 ? 1 : 0, slot === 2 ? 1 : 0);

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
      this.handles.push({ object: arrow, slot, kind: 'move' });

      // Bigger than the arrows and further out: the balls were the hardest
      // thing to hit on the old gizmo, and they carry the harder job.
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 12), gizmoMaterial(color));
      ball.position.copy(_forward).multiplyScalar(BALL_ARM);
      this.gizmo.add(ball);
      this.handles.push({ object: ball, slot, kind: 'scale' });
    }

    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), gizmoMaterial(0xf3f6fb));
    this.gizmo.add(centre);
    this.handles.push({ object: centre, slot: 0, kind: 'uniform' });
  }
}

const AXES = ['x', 'y', 'z'] as const;
const UP_AXIS = new THREE.Vector3(0, 1, 0);
const IDENTITY = new THREE.Quaternion();
const OBJECT_BASIS: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];

/** The three axes of a rotation, written into `target`. */
function basisOf(
  rotation: THREE.Quaternion,
  target: [THREE.Vector3, THREE.Vector3, THREE.Vector3],
): void {
  target[0].set(1, 0, 0).applyQuaternion(rotation);
  target[1].set(0, 1, 0).applyQuaternion(rotation);
  target[2].set(0, 0, 1).applyQuaternion(rotation);
}

/** One matched direction: the object axis it picked, pointed the right way. */
function matchedAxis(
  basis: readonly THREE.Vector3[],
  match: AxisMatch,
  target: THREE.Vector3,
): THREE.Vector3 {
  return target.copy(basis[match.axis]!).multiplyScalar(match.sign);
}

/** Builds a rotation matrix from three world directions. */
function setColumns(
  matrix: THREE.Matrix4,
  x: THREE.Vector3,
  y: THREE.Vector3,
  z: THREE.Vector3,
): THREE.Matrix4 {
  return matrix.set(x.x, y.x, z.x, 0, x.y, y.y, z.y, 0, x.z, y.z, z.z, 0, 0, 0, 0, 1);
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

function metres(value: number): string {
  return value < 1 ? `${Math.round(value * 100)} cm` : `${value.toFixed(2)} m`;
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
