import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { GRAB_GLOW, GRAB_IDLE, GRAB_TINT } from '../../../core/colors';
import { playPick } from '../../../core/Audio';
import { DEFAULT_BELT, beltLabel, dragBelt, type BeltOffset } from '../beltSettings';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** So weit reicht der Strahl, mit dem eine Hüfte ausgesucht wird. */
const RANGE = 3;
/** Und so nah muss er an ihr vorbeigehen — eine Hüfte ist ein großes Ziel. */
const REACH = 0.16;
/** Die Kiste um eine Hüfte: breit genug, dass eine Waffe hineinpasst. */
const BOX = new THREE.Vector3(0.22, 0.16, 0.22);

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _slotPoint = new THREE.Vector3();
const _handPoint = new THREE.Vector3();
const _delta = new THREE.Vector3();
const _toSlot = new THREE.Vector3();
const _ray = new THREE.Ray();

const SIDES: readonly Handedness[] = ['left', 'right'];

/**
 * Der Gürtel-Justierer: das Werkzeug, mit dem die Hüften dorthin kommen, wo
 * die Hände sind.
 *
 * Wo der Gürtel hängt, war bis eben eine Entscheidung des Codes — 26 cm zur
 * Seite, halbe Augenhöhe, vier Zentimeter nach hinten. Das passt dem, für den
 * es gemessen wurde. Wer kürzere Arme hat, greift daneben; wer im Sitzen
 * spielt, greift in den Stuhl. Und man merkt es nicht beim Lesen, sondern beim
 * dritten Fehlgriff mitten im Spiel.
 *
 * Also: **zielen, Trigger, schieben.** Solange dieses Werkzeug in der Hand
 * liegt, stehen um beide Hüften Kisten; die, auf die der Strahl zeigt,
 * leuchtet. Ein Trigger wählt sie aus. Danach greift die *andere* Hand
 * irgendwo zu und zieht — die Hüfte folgt ihr, und zwar beide: eingestellt
 * wird ein Gürtel und nicht eine Seite (`beltSettings.ts`, mit Test). Loslassen
 * schreibt die drei Zahlen in den Speicher, ein zweiter Trigger gibt die Hüfte
 * wieder frei.
 *
 * Gezogen wird **relativ**, nicht absolut: die Hüfte springt der Hand nicht
 * entgegen, sondern nimmt mit, was die Hand seit dem Zugreifen zurückgelegt
 * hat. Nur so kann man sie um zwei Zentimeter versetzen, ohne den Arm genau
 * dorthin zu halten, wo sie am Ende sein soll.
 *
 * Während eine Hüfte gewählt ist, ist die andere Hand für den Gürtel
 * beschäftigt (`claimsHand`): sie zieht dabei kein Werkzeug von der Hüfte und
 * hebt keine Kiste auf. Das ist keine Feinheit — die Hand greift zum Ziehen
 * *genau dort* zu, wo sonst das Werkzeug aus dem Halfter kommt.
 */
export class HolsterTool extends Tool {
  override readonly toolId = 'holster';
  override readonly label = 'Gürtel-Justierer';

  /** Die Kisten um die beiden Hüften, in Weltkoordinaten geführt. */
  private readonly boxes = new Map<Handedness, THREE.LineSegments>();
  private readonly beam: THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private readonly muzzle = new THREE.Object3D();

  /** Die Hüfte, auf die der Strahl gerade zeigt. */
  private hovered: Handedness | null = null;
  /** Die ausgewählte Hüfte — erst mit ihr lässt sich ziehen. */
  private picked: Handedness | null = null;
  /** Wo die ziehende Hand zugegriffen hat, im Rig gemessen. */
  private readonly dragStart = new THREE.Vector3();
  /** Der Gürtel, wie er beim Zugreifen war — gezogen wird relativ dazu. */
  private dragBase: BeltOffset | null = null;
  private dragging = false;

  constructor() {
    super();
    this.name = 'tool-holster';
    this.icon = 'wrench';
    this.accent = GRAB_TINT;
    this.hint = 'Hüfte anzielen · Trigger · mit der anderen Hand schieben';
    this.holdPosition.set(0, -0.014, 0.03);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2b3550,
      roughness: 0.5,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.028, 0.13), shell);
    body.position.set(0, 0, -0.035);
    this.add(body);

    // Derselbe Griff wie an der Pistole (`grip.ts`). Vorher lehnte er nach vorn
    // und damit 24° gegen den der Pistole — die größte der alten Abweichungen.
    this.mountGrip({ length: 0.08 });

    // Vorne ein Ring in derselben Form wie die Hüften selbst: das Werkzeug
    // sagt damit, worauf es sich versteht.
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.028, 0.005, 8, 24),
      new THREE.MeshStandardMaterial({
        color: GRAB_TINT,
        emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.35),
        roughness: 0.4,
        metalness: 0.2,
      }),
    );
    ring.position.set(0, 0, -0.105);
    this.add(ring);

    this.muzzle.position.set(0, 0, -0.1);
    this.add(this.muzzle);

    this.beam = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: GRAB_TINT, transparent: true, opacity: 0.35 }),
    );
    this.beam.frustumCulled = false;
    this.beam.position.copy(this.muzzle.position);
    this.add(this.beam);

    for (const side of SIDES) {
      const box = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(BOX.x, BOX.y, BOX.z)),
        new THREE.LineBasicMaterial({ color: GRAB_IDLE, transparent: true, opacity: 0.5 }),
      );
      box.frustumCulled = false;
      box.visible = false;
      box.renderOrder = 6;
      this.boxes.set(side, box);
    }
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    for (const box of this.boxes.values()) {
      if (box.parent !== host.root) host.root.add(box);
    }
  }

  override onStow(host: ToolHost): void {
    this.finishDrag(host, true);
    this.picked = null;
    this.hovered = null;
    for (const box of this.boxes.values()) box.visible = false;
  }

  override onThrow(host: ToolHost, _speed: number): void {
    this.onStow(host);
  }

  /** Trigger: die angezielte Hüfte auswählen — oder die gewählte freigeben. */
  override onTrigger(controller: ControllerState, host: ToolHost): void {
    if (this.picked) {
      this.finishDrag(host, true);
      host.notify(`Gürtel: ${beltLabel(host.beltPose())}`);
      this.picked = null;
      controller.pulse(0.3, 24);
      playPick(false);
      return;
    }
    if (!this.hovered) {
      host.notify('Erst eine Hüfte anzielen');
      return;
    }
    this.picked = this.hovered;
    host.notify('Mit der anderen Hand greifen und schieben');
    controller.pulse(0.5, 30);
    playPick(true);
  }

  /** `A`/`X`: zurück auf die ausgelieferten Zahlen. */
  override onPrimary(_controller: ControllerState, host: ToolHost): void {
    this.finishDrag(host, false);
    host.setBeltPose({ ...DEFAULT_BELT }, true);
    host.notify(`Gürtel zurückgesetzt · ${beltLabel(DEFAULT_BELT)}`);
  }

  /**
   * Solange eine Hüfte gewählt ist, gehört die andere Hand dem Gürtel. Sonst
   * zöge derselbe Griff, mit dem geschoben wird, das Werkzeug aus dem Halfter.
   */
  override claimsHand(hand: Handedness): boolean {
    return this.picked !== null && this.heldBy !== null && hand !== this.heldBy;
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    const held = Boolean(this.heldBy) && !this.parked;
    if (!held || !controller) {
      for (const box of this.boxes.values()) box.visible = false;
      return;
    }

    this.muzzle.getWorldPosition(_tip);
    this.muzzle.getWorldQuaternion(_quaternion);
    _direction.set(0, 0, -1).applyQuaternion(_quaternion);
    _ray.origin.copy(_tip);
    _ray.direction.copy(_direction);

    // Zeigen und Auswählen sind zwei Fragen; solange eine Hüfte gewählt ist,
    // wandert die Auswahl nicht mit jedem Zucken des Arms weiter.
    let hovered: Handedness | null = null;
    let nearest = REACH;

    for (const side of SIDES) {
      const box = this.boxes.get(side);
      const slot = host.beltSlot(side);
      if (!box) continue;
      if (!slot) {
        box.visible = false;
        continue;
      }
      slot.getWorldPosition(_slotPoint);
      slot.getWorldQuaternion(_quaternion);
      box.position.copy(_slotPoint);
      box.quaternion.copy(_quaternion);
      box.visible = true;

      if (this.picked) continue;
      // Wie weit die Hüfte den Strahl entlang liegt: hinter der Hand zählt
      // sie nicht, und quer durch den halben Raum auch nicht.
      const along = _toSlot.copy(_slotPoint).sub(_ray.origin).dot(_ray.direction);
      if (along < 0 || along > RANGE) continue;
      const gap = Math.sqrt(_ray.distanceSqToPoint(_slotPoint));
      if (gap >= nearest) continue;
      nearest = gap;
      hovered = side;
    }
    this.hovered = this.picked ?? hovered;

    for (const side of SIDES) {
      const box = this.boxes.get(side);
      if (!box || !box.visible) continue;
      const chosen = this.picked === side;
      // Die gewählte Hüfte leuchtet, die angezielte trägt die Greiffarbe, und
      // die dritte Antwort ist die stille: „hier ist auch eine".
      const material = box.material as THREE.LineBasicMaterial;
      material.color.setHex(chosen ? GRAB_GLOW : this.hovered === side ? GRAB_TINT : GRAB_IDLE);
      material.opacity = chosen ? 0.95 : this.hovered === side ? 0.8 : 0.35;
      // Die gespiegelte Seite zeigt mit, was passiert — beide bewegen sich.
      box.scale.setScalar(chosen ? 1.08 : 1);
    }

    this.beam.scale.z = this.hovered ? nearest + 0.4 : 1.2;
    this.dragBelt(host);
  }

  /** Die andere Hand greift zu, zieht, lässt los. */
  private dragBelt(host: ToolHost): void {
    const picked = this.picked;
    const hand = this.heldBy;
    if (!picked || !hand) {
      this.dragging = false;
      return;
    }
    const other: Handedness = hand === 'left' ? 'right' : 'left';
    const controller = host.ctx.input.get(other);
    const grip = controller?.grip.visible ? controller.grip : controller?.targetRay;
    if (!controller?.tracked || !grip) {
      this.finishDrag(host, this.dragging);
      return;
    }

    // Im Rig gemessen und nicht in der Welt: wer während des Ziehens ein paar
    // Schritte geht, verschiebt damit seinen Gürtel nicht.
    grip.getWorldPosition(_handPoint);
    host.ctx.rig.worldToLocal(_handPoint);

    if (controller.squeeze.justPressed) {
      this.dragStart.copy(_handPoint);
      this.dragBase = host.beltPose();
      this.dragging = true;
      controller.pulse(0.4, 20);
      return;
    }

    if (!this.dragging || !this.dragBase) return;

    if (!controller.squeeze.pressed) {
      this.finishDrag(host, true);
      controller.pulse(0.5, 30);
      return;
    }

    _delta.copy(_handPoint).sub(this.dragStart);
    const yaw = host.ctx.avatar.bodyYaw;
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    host.setBeltPose(
      dragBelt(
        this.dragBase,
        {
          // Rechts ist (cos, −sin), vorn ist (−sin, −cos): dieselben zwei
          // Richtungen, aus denen `beltSlotPoint` die Hüften stellt.
          right: _delta.x * cos - _delta.z * sin,
          up: _delta.y,
          forward: -_delta.x * sin - _delta.z * cos,
        },
        picked,
        host.ctx.rig.getHeadHeight(),
      ),
    );
  }

  /** Ende eines Zugs: einmal schreiben statt neunzigmal pro Sekunde. */
  private finishDrag(host: ToolHost, save: boolean): void {
    if (!this.dragging) return;
    this.dragging = false;
    this.dragBase = null;
    if (!save) return;
    const belt = host.setBeltPose(host.beltPose(), true);
    host.notify(`Gürtel: ${beltLabel(belt)}`);
  }

  override disposeTool(): void {
    for (const box of this.boxes.values()) {
      box.removeFromParent();
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.boxes.clear();
    this.beam.geometry.dispose();
    this.beam.material.dispose();
    disposeToolTree(this);
  }
}
