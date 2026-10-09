import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { GRAB_GLOW, GRAB_IDLE, GRAB_TINT } from '../../../core/colors';
import { playPick } from '../../../core/Audio';
import { DEFAULT_BELT, beltCode, beltFromPoint, beltLabel } from '../beltSettings';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/** Die Kiste um eine Hüfte: breit genug, dass eine Waffe hineinpasst. */
const BOX = new THREE.Vector3(0.22, 0.16, 0.22);

const _quaternion = new THREE.Quaternion();
const _slotPoint = new THREE.Vector3();
const _handPoint = new THREE.Vector3();
const _headPoint = new THREE.Vector3();

const SIDES: readonly Handedness[] = ['left', 'right'];

/**
 * Der Gürtel-Justierer: das Werkzeug, mit dem die Hüften dorthin kommen, wo
 * die Hände sind.
 *
 * Wo der Gürtel hängt, war lange eine Entscheidung des Codes — 26 cm zur
 * Seite, feste Höhe, vier Zentimeter nach hinten. Das passt dem, für den es
 * gemessen wurde; wer kürzere Arme hat oder sitzt, greift daneben.
 *
 * **Der Gürtel folgt der Hand** (Oktober 2026). Gewünscht: _„Ich will damit,
 * dass wenn ich das werkzeug in der hand halte, die gürtel dort sind wo ich
 * das werkzeug halte (und gespiegelt auf die andere seite). Wenn ich trigger
 * oder loslasse dann wird diese position gespeichert (bei trigger fällt der
 * justierer weg)."_ Solange er in der Hand liegt, stehen beide Hüften dort,
 * wo er ist, und gespiegelt auf der anderen Seite (`beltFromPoint`); um beide
 * steht eine Kiste. **Trigger** speichert und legt ihn weg (an die Hüfte, die
 * jetzt dort ist, wo die Hand ist), **Loslassen** speichert ebenso, `A`/`X`
 * setzt auf die Auslieferung zurück.
 *
 * **Auf dem Gerät steht der Code** des Gürtels (`beltCode`, etwa
 * `G26-825-H04`) — _„ich will im justierer dann wissen wie der config code
 * davon ist, dass ich den dir nennen kann."_ Vorher wurde gezielt, gewählt und
 * mit der anderen Hand gezogen.
 */
export class HolsterTool extends Tool {
  override readonly toolId = 'holster';
  override readonly label = 'Gürtel-Justierer';

  /** Die Kisten um die beiden Hüften, in Weltkoordinaten geführt. */
  private readonly boxes = new Map<Handedness, THREE.LineSegments>();
  /** Der Code auf dem Gerät (`beltCode`). */
  private readonly codeCanvas: HTMLCanvasElement | null;
  private readonly codeTexture: THREE.CanvasTexture | null;
  private codeShown = '';
  private codeClock = 0;
  /** Ob der Gürtel seit dem letzten Speichern der Hand gefolgt ist. */
  private moved = false;

  constructor() {
    super();
    this.name = 'tool-holster';
    this.icon = 'wrench';
    this.accent = GRAB_TINT;
    this.hint = 'Gürtel folgt der Hand · Trigger oder Loslassen speichert';
    this.holdPosition.set(0, -0.014, 0.03);

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2b3550,
      roughness: 0.5,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.028, 0.13), shell);
    body.position.set(0, 0, -0.035);
    this.add(body);

    // Derselbe Griff wie an der Pistole (`grip.ts`).
    this.mountGrip({ length: 0.08 });

    // Vorne ein Ring in derselben Form wie die Hüften selbst.
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

    // Der Code obenauf, entlang des Geräts zu lesen.
    this.codeCanvas = typeof document === 'undefined' ? null : document.createElement('canvas');
    if (this.codeCanvas) {
      this.codeCanvas.width = 256;
      this.codeCanvas.height = 64;
      this.codeTexture = new THREE.CanvasTexture(this.codeCanvas);
      this.codeTexture.colorSpace = THREE.SRGBColorSpace;
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.03),
        new THREE.MeshBasicMaterial({ map: this.codeTexture, toneMapped: false }),
      );
      plate.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
      plate.position.set(0, 0.0145, -0.035);
      this.add(plate);
    } else this.codeTexture = null;

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
    this.paintCode(beltCode(host.beltPose()));
  }

  /** Losgelassen oder weggelegt: wo der Gürtel jetzt ist, bleibt er. */
  override onStow(host: ToolHost): void {
    this.save(host);
    for (const box of this.boxes.values()) box.visible = false;
  }

  override onThrow(host: ToolHost, _speed: number): void {
    this.onStow(host);
  }

  /** Trigger: speichern und weglegen. */
  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.moved = true;
    this.save(host);
    controller.pulse(0.5, 30);
    playPick(true);
    host.stowTool(this);
  }

  /** `A`/`X`: zurück auf die ausgelieferten Zahlen — und weg damit. */
  override onPrimary(_controller: ControllerState, host: ToolHost): void {
    this.moved = false;
    host.setBeltPose({ ...DEFAULT_BELT }, true);
    host.notify(`Gürtel zurückgesetzt · ${beltCode(DEFAULT_BELT)}`);
    host.stowTool(this);
  }

  override update(dt: number, host: ToolHost, controller: ControllerState | null): void {
    const held = Boolean(this.heldBy) && !this.parked;
    if (!held || !controller) {
      for (const box of this.boxes.values()) box.visible = false;
      return;
    }

    // **Die Hüften an die Hand**: Punkt des Geräts und Kopf im Rig, die Höhe,
    // an der der Gürtel hängt (`ToolBelt.update`), der Körper als Richtung.
    const rig = host.ctx.rig;
    this.getWorldPosition(_handPoint);
    rig.worldToLocal(_handPoint);
    rig.getHeadPosition(_headPoint);
    rig.worldToLocal(_headPoint);
    const height = Math.max(rig.getHeadHeight(), rig.flatEyeHeight * rig.eyeScale);
    host.setBeltPose(
      beltFromPoint(
        { x: _handPoint.x - _headPoint.x, y: _handPoint.y, z: _handPoint.z - _headPoint.z },
        height,
        host.ctx.avatar.bodyYaw,
      ),
    );
    this.moved = true;

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
      const material = box.material as THREE.LineBasicMaterial;
      material.color.setHex(side === this.heldBy ? GRAB_GLOW : GRAB_TINT);
      material.opacity = side === this.heldBy ? 0.95 : 0.6;
    }

    // Der Code zehnmal je Sekunde, nicht je Bild — eine Leinwand neu zu
    // laden kostet mehr als ein Blick darauf.
    this.codeClock -= dt;
    if (this.codeClock <= 0) {
      this.codeClock = 0.1;
      this.paintCode(beltCode(host.beltPose()));
    }
  }

  /** Einmal schreiben, wenn sich etwas bewegt hat — und den Code dazu sagen. */
  private save(host: ToolHost): void {
    if (!this.moved) return;
    this.moved = false;
    const belt = host.setBeltPose(host.beltPose(), true);
    this.paintCode(beltCode(belt));
    host.notify(`Gürtel gespeichert · ${beltCode(belt)} · ${beltLabel(belt)}`);
  }

  private paintCode(code: string): void {
    if (code === this.codeShown || !this.codeCanvas || !this.codeTexture) return;
    this.codeShown = code;
    const ctx = this.codeCanvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#101624';
    ctx.fillRect(0, 0, 256, 64);
    ctx.fillStyle = '#ffd84a';
    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(code, 128, 34);
    this.codeTexture.needsUpdate = true;
  }

  override disposeTool(): void {
    for (const box of this.boxes.values()) {
      box.removeFromParent();
      box.geometry.dispose();
      (box.material as THREE.Material).dispose();
    }
    this.boxes.clear();
    this.codeTexture?.dispose();
    disposeToolTree(this);
  }
}
