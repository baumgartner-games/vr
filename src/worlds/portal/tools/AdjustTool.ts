import * as THREE from 'three';
import { Tool, aimQuaternion, disposeToolTree, type ToolHost } from './Tool';
import { formatPose, holdPoseFrom, readPose, type PoseReadout } from './toolPose';
import { savePose } from './poseStore';
import { gearCode } from './gearConfig';
import type { Attachment } from './attachments';
import { playTone } from '../../../core/Audio';
import { GhostHand } from '../../../core/HandVisuals';
import { clonePose, IDLE_HAND_POSE, type HandPose } from '../../../core/handPose';
import { idleHandPose, saveIdleHandPose } from '../../../core/handPoseStore';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** How long the measured numbers stay on the display. */
const SHOW_TIME = 20;
/** How far the picking ray reaches — this is done at arm's length. */
const PICK_RANGE = 1.2;

const _scale = new THREE.Vector3();
const _aim = new THREE.Quaternion();
const _gripPosition = new THREE.Vector3();
const _gripRotation = new THREE.Quaternion();
const _toolPosition = new THREE.Vector3();
const _toolRotation = new THREE.Quaternion();
const _origin = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _ray = new THREE.Ray();
const _box = new THREE.Box3();
const _hit = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _inverse = new THREE.Matrix4();
const _quaternion = new THREE.Quaternion();

/** The tool being measured, and the pose it had before we started. */
interface Session {
  tool: Tool;
  hand: Handedness;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

/** The empty hand being measured, and the ghost standing where it was. */
interface HandSession {
  hand: Handedness;
  ghost: GhostHand;
  /** The pose it had — curls and spread survive, only the six numbers move. */
  before: HandPose;
}

/** An attachment being dragged around on its tool. */
interface Drag {
  attachment: Attachment;
  tool: Tool;
  /** Where it sat relative to the adjuster's tip when it was picked up. */
  offset: THREE.Matrix4;
  /** What to put back if the drag is cancelled. */
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
}

/** Whatever the adjuster is pointing at right now. */
type Target =
  | { kind: 'tool'; tool: Tool; hand: Handedness }
  | { kind: 'attachment'; attachment: Attachment; tool: Tool; hand: Handedness }
  | { kind: 'hand'; object: THREE.Object3D; hand: Handedness };

/**
 * Werkzeug-Justierer: puts other things exactly where you want them.
 *
 * **A whole tool.** Hold this in one hand and the crooked tool in the other:
 *
 * 1. **Trigger** — the other tool stops in mid-air and stays there.
 * 2. Move that hand to where it *should* be holding the tool.
 * 3. **Trigger** again — the tool jumps back into the hand in exactly that
 *    pose, and the six numbers appear: x, y, z in centimetres, roll, pitch and
 *    yaw in degrees.
 *
 * **A single attachment.** Point at one — the red dot on the pistol, say — and
 * it lights up. Hold the **trigger** and it comes along with the tip of the
 * adjuster; let go and it stays there, on the gun, in its new place. No
 * parking, because the gun itself never moved.
 *
 * **The empty hand itself.** Point at the other hand while it is carrying
 * nothing and the same two triggers set *its* pose. Instead of parking a tool
 * there is a **ghost hand**: it stays where the hand was, so while you move
 * the real one you can see exactly what you are changing it from. The second
 * trigger writes the six numbers into the idle pose of that hand — the curls
 * and the spread stay as they were, those belong in the menu.
 *
 * Everything measured is written down right away (`gearConfig.ts`) and turns
 * up in the config code, so it survives a reload and can be handed on.
 * **Greifen** puts that code on the clipboard.
 *
 * `A` cancels what is running, resets a highlighted attachment or hand, or
 * puts the last adjusted tool back the way it was built.
 */
export class AdjustTool extends Tool {
  override readonly toolId = 'adjust';
  override readonly label = 'Werkzeug-Justierer';

  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;
  private readonly display: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly lamp: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** The wire box around whatever is being pointed at. */
  private readonly marker: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  /** The tip the picking ray starts from and a dragged attachment hangs on. */
  private readonly tip = new THREE.Object3D();
  private session: Session | null = null;
  private handSession: HandSession | null = null;
  private drag: Drag | null = null;
  private target: Target | null = null;
  /** The last tool that was adjusted, and how it was built. */
  private previous: Session | null = null;
  private readout: PoseReadout | null = null;
  private caption = '';
  private showFor = 0;
  private dirty = true;

  constructor() {
    super();
    this.name = 'tool-adjust';
    this.icon = 'wrench';
    this.accent = 0xffc857;
    this.sticky = true;
    this.hint = 'Zielen · Trigger justiert · Greifen kopiert den Code';
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

    this.tip.position.set(0, 0, -0.15);
    this.add(this.tip);

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

    this.marker = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      new THREE.LineBasicMaterial({ color: 0x5ee0a0, transparent: true, opacity: 0.9 }),
    );
    this.marker.frustumCulled = false;
    this.marker.visible = false;
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.beam.parent !== host.root) host.root.add(this.beam, this.marker);
    this.dirty = true;
  }

  override onStow(host: ToolHost): void {
    // Never leave another tool hanging in the air — or a ghost standing in the
    // room — because this one was put away.
    this.cancel(host);
    this.cancelHand();
    this.beam.visible = false;
    this.marker.visible = false;
  }

  override onTrigger(_controller: ControllerState, host: ToolHost): void {
    if (this.handSession) {
      this.finishHand(host);
      return;
    }
    if (this.session) {
      this.finish(host);
      return;
    }
    if (this.target?.kind === 'attachment') {
      this.beginDrag(this.target, host);
      return;
    }
    if (this.target?.kind === 'hand') {
      this.beginHand(this.target.hand, host);
      return;
    }
    this.begin(host);
  }

  override onTriggerUp(_controller: ControllerState, host: ToolHost): void {
    if (this.drag) this.endDrag(host);
  }

  /** Greifen: the whole configuration onto the clipboard. */
  override onGrab(_controller: ControllerState, host: ToolHost): void {
    const code = gearCode();
    navigator.clipboard?.writeText(code).then(
      () => host.notify(`Konfig-Code kopiert (${code.length} Zeichen)`),
      () => host.notify(`Konfig-Code: ${code.slice(0, 24)}… (Menü zeigt ihn ganz)`),
    );
    // The console is where it gets picked up from when the clipboard says no.
    console.info('[bgvr] Konfig-Code:', code);
  }

  /** `A`: back out, reset what is highlighted, or undo the last measurement. */
  override onPrimary(_controller: ControllerState, host: ToolHost): void {
    if (this.drag) {
      this.cancelDrag();
      host.notify('Abgebrochen');
      return;
    }
    if (this.handSession) {
      this.cancelHand();
      host.notify('Abgebrochen');
      return;
    }
    if (this.session) {
      this.cancel(host);
      host.notify('Abgebrochen');
      return;
    }
    if (this.target?.kind === 'hand') {
      const hand = this.target.hand;
      saveIdleHandPose(hand, clonePose(IDLE_HAND_POSE));
      host.ctx.hands.refreshPoses();
      host.notify(`${hand === 'left' ? 'Linke' : 'Rechte'} Hand zurückgesetzt`);
      return;
    }
    if (this.target?.kind === 'attachment') {
      const { attachment, tool } = this.target;
      attachment.resetPose(tool.toolId);
      host.notify(`${attachment.label} zurückgesetzt`);
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

    if (this.drag) {
      // Pointing at a panel swallows the trigger-up event, so a drag also ends
      // when the finger is simply found to be off the trigger.
      if (controller && !controller.trigger.pressed) this.endDrag(host);
      else this.moveDrag();
    } else {
      this.pick(host, controller);
    }

    if (this.dirty) this.draw();

    const session = this.session;
    const handSession = this.handSession;
    this.lamp.material.color.setHex(
      session || handSession || this.drag ? 0x5ee0a0 : 0xffc857,
    );
    if ((!session && !handSession) || !controller) {
      this.beam.visible = false;
      return;
    }

    // A line from the hand that is being moved to whatever waits in the air —
    // the parked tool, or the ghost — so it is obvious what the trigger is
    // about to snap together.
    const hand = host.ctx.input.get(session?.hand ?? handSession!.hand);
    if (!hand?.tracked) {
      this.beam.visible = false;
      return;
    }
    handAnchor(hand).getWorldPosition(_origin);
    (session?.tool ?? handSession!.ghost).getWorldPosition(_toolPosition);
    const positions = this.beam.geometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, _origin.x, _origin.y, _origin.z);
    positions.setXYZ(1, _toolPosition.x, _toolPosition.y, _toolPosition.z);
    positions.needsUpdate = true;
    this.beam.geometry.computeBoundingSphere();
    this.beam.visible = true;
  }

  override disposeTool(): void {
    this.cancelHand();
    disposeToolTree(this);
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    this.beam.removeFromParent();
    this.marker.geometry.dispose();
    this.marker.material.dispose();
    this.marker.removeFromParent();
    this.texture.dispose();
  }

  // --- picking --------------------------------------------------------------

  /**
   * What the adjuster is pointing at: an attachment on the other hand's tool,
   * that tool as a whole, or — when the hand is empty — the hand itself.
   * Attachments win over their tool: they sit inside its box, so the smaller
   * thing has to be the one you can single out.
   */
  private pick(host: ToolHost, controller: ControllerState | null): void {
    const previous = describe(this.target);
    this.target = null;

    if (controller && this.heldBy && !this.session && !this.handSession) {
      const hand: Handedness = this.heldBy === 'left' ? 'right' : 'left';
      const tool = host.heldTool(hand);
      if (!tool) {
        const object = this.handObject(host, hand);
        if (object) {
          this.tip.getWorldPosition(_origin);
          _direction
            .set(0, 0, -1)
            .applyQuaternion(this.getWorldQuaternion(_quaternion))
            .normalize();
          _ray.set(_origin, _direction);
          const distance = rayBoxDistance(object);
          if (distance !== null && distance <= PICK_RANGE) {
            this.target = { kind: 'hand', object, hand };
          }
        }
      }
      if (tool && !tool.parked) {
        this.tip.getWorldPosition(_origin);
        _direction
          .set(0, 0, -1)
          .applyQuaternion(this.getWorldQuaternion(_quaternion))
          .normalize();
        _ray.set(_origin, _direction);

        let best = Number.POSITIVE_INFINITY;
        for (const attachment of tool.attachments()) {
          const distance = rayBoxDistance(attachment);
          if (distance === null || distance > PICK_RANGE || distance >= best) continue;
          best = distance;
          this.target = { kind: 'attachment', attachment, tool, hand };
        }
        if (!this.target) {
          const distance = rayBoxDistance(tool);
          if (distance !== null && distance <= PICK_RANGE) {
            this.target = { kind: 'tool', tool, hand };
          }
        }
      }
    }

    this.showMarker(this.target);
    const caption = describe(this.target);
    if (caption !== previous) {
      this.caption = caption;
      this.dirty = true;
    }
  }

  /** The wire box around the current target. */
  private showMarker(target: Target | null): void {
    const object = target
      ? target.kind === 'attachment'
        ? target.attachment
        : target.kind === 'hand'
          ? target.object
          : target.tool
      : null;
    if (!object) {
      this.marker.visible = false;
      return;
    }
    _box.setFromObject(object);
    if (_box.isEmpty()) {
      this.marker.visible = false;
      return;
    }
    _box.getCenter(this.marker.position);
    _box.getSize(_scale);
    // A hair bigger than the thing itself, so the lines are not inside it.
    this.marker.scale.set(_scale.x + 0.008, _scale.y + 0.008, _scale.z + 0.008);
    this.marker.material.color.setHex(
      target?.kind === 'attachment' ? 0x5ee0a0 : target?.kind === 'hand' ? 0x9fe3ff : 0xffc857,
    );
    this.marker.visible = true;
  }

  // --- dragging an attachment ----------------------------------------------

  private beginDrag(target: Extract<Target, { kind: 'attachment' }>, host: ToolHost): void {
    const { attachment, tool } = target;
    attachment.updateWorldMatrix(true, false);
    this.tip.updateWorldMatrix(true, false);
    // Keep the grip: the attachment must not jump to the tip when picked up.
    const offset = _inverse.copy(this.tip.matrixWorld).invert().multiply(attachment.matrixWorld);
    this.drag = {
      attachment,
      tool,
      offset: offset.clone(),
      position: attachment.position.clone(),
      rotation: attachment.quaternion.clone(),
    };
    playTone({ type: 'square', from: 620, to: 880, duration: 0.09, gain: 0.05 });
    host.notify(`${attachment.label} · loslassen setzt sie fest`);
  }

  /** Every frame of a drag: the attachment rides the tip, inside its tool. */
  private moveDrag(): void {
    const drag = this.drag!;
    this.tip.updateWorldMatrix(true, false);
    const parent = drag.attachment.parent;
    if (!parent) return;
    parent.updateWorldMatrix(true, false);
    _matrix.copy(this.tip.matrixWorld).multiply(drag.offset);
    // Back into the tool's own space — that is where the pose is stored, and
    // it is why the attachment stays put when the gun is moved afterwards.
    _matrix.premultiply(_inverse.copy(parent.matrixWorld).invert());
    _matrix.decompose(drag.attachment.position, drag.attachment.quaternion, _scale);
  }

  private endDrag(host: ToolHost): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    const pose = drag.attachment.savePose(drag.tool.toolId);
    this.readout = pose;
    this.caption = drag.attachment.label;
    this.showFor = SHOW_TIME;
    this.dirty = true;
    playTone({ type: 'square', from: 880, to: 520, duration: 0.1, gain: 0.05 });
    host.notify(`${drag.attachment.label}: ${formatPose(pose)}`);
  }

  private cancelDrag(): void {
    const drag = this.drag;
    if (!drag) return;
    drag.attachment.position.copy(drag.position);
    drag.attachment.quaternion.copy(drag.rotation);
    this.drag = null;
    this.dirty = true;
  }

  // --- the two halves of a tool measurement ---------------------------------

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
    this.caption = session.tool.label;
    this.showFor = SHOW_TIME;
    this.dirty = true;
    this.previous = session;
    this.session = null;
    this.beam.visible = false;
    controller.pulse(0.6, 40);
    playTone({ type: 'square', from: 880, to: 520, duration: 0.12, gain: 0.05 });
    host.notify(`${session.tool.label}: ${formatPose(this.readout)}`);
  }

  // --- the same two halves, for an empty hand -------------------------------

  /** The thing that visually *is* the other hand, when there is one. */
  private handObject(host: ToolHost, hand: Handedness): THREE.Object3D | null {
    const controller = host.ctx.input.get(hand);
    if (!controller?.tracked) return null;
    return host.ctx.hands.handObject(controller);
  }

  /**
   * Leaves a ghost where the hand is now. The hand itself keeps following the
   * controller, so from here on there are two of them: the one you are moving
   * and the one that shows where it used to sit.
   */
  private beginHand(hand: Handedness, host: ToolHost): void {
    const object = this.handObject(host, hand);
    if (!object) {
      host.notify('Hand nicht getrackt');
      return;
    }
    const before = idleHandPose(hand);
    const ghost = new GhostHand(hand, before);
    object.updateWorldMatrix(true, false);
    _matrix.copy(object.matrixWorld);
    host.root.add(ghost);
    host.root.updateWorldMatrix(true, false);
    // `add` keeps the local transform, so the world pose has to be put back.
    _matrix.premultiply(_inverse.copy(host.root.matrixWorld).invert());
    _matrix.decompose(ghost.position, ghost.quaternion, _scale);

    this.handSession = { hand, ghost, before };
    this.showFor = 0;
    this.dirty = true;
    playTone({ type: 'square', from: 620, to: 880, duration: 0.1, gain: 0.05 });
    host.notify(`${handLabel(hand)} · Geisterhand steht, Hand ausrichten, dann Trigger`);
  }

  /**
   * Reads off where the hand is now against where the ghost stands, and makes
   * that difference the hand's idle pose. Exactly the tool measurement, with
   * the ghost in the place of the parked tool and no aim correction — a hand
   * hangs on its grip, it is not aimed anywhere.
   */
  private finishHand(host: ToolHost): void {
    const session = this.handSession!;
    const controller = host.ctx.input.get(session.hand);
    if (!controller?.tracked) {
      host.notify('Hand nicht getrackt');
      return;
    }

    const anchor = handAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    anchor.matrixWorld.decompose(_gripPosition, _gripRotation, _scale);
    session.ghost.updateWorldMatrix(true, false);
    session.ghost.matrixWorld.decompose(_toolPosition, _toolRotation, _scale);

    const pose = holdPoseFrom(
      { position: _gripPosition, rotation: _gripRotation },
      _aim.identity(),
      { position: _toolPosition, rotation: _toolRotation },
    );
    const readout = readPose(pose);
    // Only the six numbers move: the curls and the spread are the hand's own
    // business and are set in the menu, not measured in the air.
    saveIdleHandPose(session.hand, {
      ...session.before,
      x: readout.x,
      y: readout.y,
      z: readout.z,
      pitch: readout.pitch,
      yaw: readout.yaw,
      roll: readout.roll,
    });
    host.ctx.hands.refreshPoses();

    this.readout = readout;
    this.caption = handLabel(session.hand);
    this.showFor = SHOW_TIME;
    this.dirty = true;
    this.cancelHand();
    this.beam.visible = false;
    controller.pulse(0.6, 40);
    playTone({ type: 'square', from: 880, to: 520, duration: 0.12, gain: 0.05 });
    host.notify(`${this.caption}: ${formatPose(readout)}`);
  }

  /** Takes the ghost away again, measured or not. */
  private cancelHand(): void {
    const session = this.handSession;
    if (!session) return;
    this.handSession = null;
    session.ghost.dispose();
    this.beam.visible = false;
    this.dirty = true;
  }

  /** Puts a parked tool back exactly as it was. */
  private cancel(host: ToolHost): void {
    this.cancelDrag();
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
    ctx.strokeStyle = this.session || this.handSession || this.drag ? '#5ee0a0' : '#ffc857';
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';

    if (this.session || this.handSession) {
      ctx.font = '700 40px system-ui, sans-serif';
      ctx.fillText('HAND SETZEN', 256, 96);
      ctx.font = '500 32px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      ctx.fillText(
        this.handSession ? 'Geisterhand zeigt vorher' : 'Trigger übernimmt',
        256,
        156,
      );
      this.texture.needsUpdate = true;
      return;
    }

    if (this.drag) {
      ctx.font = '700 36px system-ui, sans-serif';
      ctx.fillText(this.drag.attachment.label, 256, 96);
      ctx.font = '500 30px system-ui, sans-serif';
      ctx.fillStyle = '#9fe3ff';
      ctx.fillText('Loslassen setzt fest', 256, 156);
      this.texture.needsUpdate = true;
      return;
    }

    const readout = this.readout;
    if (!readout || this.showFor <= 0) {
      ctx.font = '600 34px system-ui, sans-serif';
      if (this.caption) {
        ctx.fillText(this.caption, 256, 92);
        ctx.fillStyle = '#9fe3ff';
        ctx.font = '500 28px system-ui, sans-serif';
        ctx.fillText('Trigger justiert', 256, 152);
      } else {
        ctx.fillText('Auf Werkzeug, Anbauteil', 256, 92);
        ctx.fillText('oder leere Hand zielen', 256, 148);
      }
      this.texture.needsUpdate = true;
      return;
    }

    ctx.font = '600 28px system-ui, sans-serif';
    ctx.fillStyle = '#9fe3ff';
    ctx.fillText(this.caption, 256, 36);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 36px system-ui, sans-serif';
    ctx.fillText(`x ${readout.x}  y ${readout.y}  z ${readout.z}`, 256, 88);
    ctx.font = '500 26px system-ui, sans-serif';
    ctx.fillStyle = '#9fe3ff';
    ctx.fillText('Zentimeter', 256, 124);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 32px system-ui, sans-serif';
    ctx.fillText(`roll ${readout.roll}°  pitch ${readout.pitch}°`, 256, 172);
    ctx.fillText(`yaw ${readout.yaw}°`, 256, 214);
    this.texture.needsUpdate = true;
  }
}

/** The node a tool hangs on: the grip, or the ray when there is no grip. */
function handAnchor(controller: ControllerState): THREE.Object3D {
  return controller.grip.visible ? controller.grip : controller.targetRay;
}

/** What the display calls the current target. */
function describe(target: Target | null): string {
  if (!target) return '';
  if (target.kind === 'attachment') return target.attachment.label;
  if (target.kind === 'hand') return handLabel(target.hand);
  return target.tool.label;
}

function handLabel(hand: Handedness): string {
  return hand === 'left' ? 'Linke Hand' : 'Rechte Hand';
}

/** How far along `_ray` an object's box is, or null when it is not on it. */
function rayBoxDistance(object: THREE.Object3D): number | null {
  _box.setFromObject(object);
  if (_box.isEmpty()) return null;
  // Inside the box counts as a hit at zero — the tip is often already there.
  if (_box.containsPoint(_ray.origin)) return 0;
  return _ray.intersectBox(_box, _hit) ? _ray.origin.distanceTo(_hit) : null;
}
