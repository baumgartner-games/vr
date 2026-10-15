import * as THREE from 'three';
import { GhostHand, handColor, type HandVisuals } from '../../core/HandVisuals';
import { buildControllerShape, controllerShape, ownMaterials } from '../../core/ControllerModels';
import {
  GRIP_POSE_ID,
  HAND_TOOL_ID,
  STANDARD_GRIP_TOOLS,
  clonePose,
  mirrorHandPose,
  type HandPose,
} from '../../core/handPose';
import {
  clearHoldHandPose,
  clearIdleHandPose,
  hasHandPose,
  holdHandPose,
  idleHandPose,
  saveHoldHandPose,
  saveIdleHandPose,
} from '../../core/handPoseStore';
import {
  gripAnchor,
  type ControllerState,
  type Handedness,
  type XRInput,
} from '../../core/XRInput';
import { FINE_FACTOR, nudgeGrip } from '../tune/fineTune';
import { GRIP_TO_RAY } from './tools/gripFit';
import { clearPose, savePose } from './tools/poseStore';
import type { Tool } from './tools/Tool';

/**
 * **Der Justierstand in der Brille** — ein Controller, der stillsteht, und
 * daran Handschuh und Werkzeug, jedes für sich verschiebbar.
 *
 * Gewünscht (Oktober 2026), nachdem die Hand zweimal nach Augenmaß und einmal
 * nach Messung verschoben worden war und trotzdem im Controller steckte:
 * _„Bitte füge ein werkzeug an, mit dem ich das selbst justieren kann. […]
 * per achse bewegen zur fein justierung · das objekt, zb handschuhe so
 * bewegen, dass diese passen · ich will im justierstand modus immer den
 * controller sehen, das ist meine referenz · und wenn ich z. B. ein gewehr
 * oder eine pistole habe, dann will ich die pistole und die handschuhe
 * einzeln positionieren können um den controller herum. Ggf. wäre dafür ein
 * menü gut."_
 *
 * **Warum ein Stand und nicht die eigene Hand**: Ein Justier-Werkzeug, das
 * dasselbe in der Luft tat, gab es schon einmal (`waffe-und-kart.md`) — das
 * Vergleichsstück hing am ausgestreckten Arm und zitterte mit. Hier steht der
 * Controller als **Kopie** still im Raum, so wie er im Griffraum der Hand
 * liegt, und Handschuh und Werkzeug hängen daran in genau den Zahlen, mit
 * denen das Spiel sie an die echte Hand hängt:
 *
 * ```
 * Stand (Zeigestrahl, waagerecht)  ·  Strahl⁻¹  =  Griffraum  =  Controller
 * Handschuh  =  Griffraum · Haltung        (handPoseStore)
 * Werkzeug   =  Griffraum · Lage-im-Griff  (wie es gerade in der Hand hängt)
 * ```
 *
 * Was man am Stand verschiebt, wird **sofort** gespeichert und gilt damit im
 * selben Bild auch an der echten Hand — man kann vom Stand auf die eigene
 * Hand schauen und sieht dasselbe.
 *
 * Zwei Wege, etwas zu verschieben:
 *
 * - **Greifen**: die Greiftaste in der Nähe des Stands, und das gewählte Ding
 *   folgt der Hand — 1:1 oder untersetzt 1:10 (`fineTune.ts`), dann wird aus
 *   einem Zentimeter Arm ein Millimeter am Handschuh.
 * - **Je Achse**, aus dem Menü: vor/zurück, hoch/runter, links/rechts und die
 *   drei Drehungen, in Schritten von 1 mm bis 1 cm (1° bis 15°). Die Achsen
 *   sind die des **Zeigestrahls** — „vor" heißt dorthin, wohin der Controller
 *   zielt, nicht entlang seines schrägen Griffs. Ein kleines Kreuz am
 *   gewählten Ding zeigt sie: rot nach rechts, grün nach oben, blau nach vorn.
 */

/** Was am Stand verschoben wird. */
export type StandTarget = 'glove' | 'tool';

/** Die Richtungen der Achsen-Knöpfe, im Raum des Zeigestrahls. */
export type StandMove =
  | 'forward'
  | 'back'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'pitch-up'
  | 'pitch-down'
  | 'yaw-left'
  | 'yaw-right'
  | 'roll-left'
  | 'roll-right';

/** Die Schrittweiten — Zentimeter und Grad zusammen, damit es ein Knopf bleibt. */
export const STAND_STEPS: ReadonlyArray<{ cm: number; deg: number; label: string }> = [
  { cm: 0.1, deg: 1, label: '1 mm · 1°' },
  { cm: 0.5, deg: 5, label: '5 mm · 5°' },
  { cm: 1, deg: 15, label: '1 cm · 15°' },
];

/** Was der Stand von der Welt braucht. */
export interface StandHost {
  /** Wo er hängt. */
  readonly scene: THREE.Object3D;
  readonly input: XRInput;
  readonly camera: THREE.Camera;
  readonly hands: HandVisuals;
  /** Was diese Hand gerade hält — `null` für leer. */
  heldTool(hand: Handedness): Tool | null;
  /** Jedes Werkzeug der Welt: eine verschobene Lage gilt für alle Kopien. */
  liveTools(): Iterable<Tool>;
}

/** Wie weit vor dem Kopf er steht, und wie weit darunter. */
const STAND_AHEAD = 0.42;
const STAND_BELOW = 0.22;
/** Wie nah eine Hand sein muss, damit Greifen den Stand meint und nicht die Welt. */
const GRAB_REACH = 0.35;
/** Der Controller als Geist: so durchsichtig, dass man die Hand darin sieht. */
const GHOST_OPACITY = 0.5;
/** Die Länge des Achsenkreuzes und des Zeigestrahls. */
const AXIS_LENGTH = 0.05;
const RAY_LENGTH = 0.3;

const DEG = Math.PI / 180;
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _dq = new THREE.Quaternion();
const _aimInv = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _m2 = new THREE.Matrix4();
const _one = new THREE.Vector3(1, 1, 1);
const _s = new THREE.Vector3();
const _euler = new THREE.Euler();
const _head = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _p = new THREE.Vector3();
const _t = new THREE.Quaternion();

/** Ein Griff mit der Hand am Stand: wo die Hand und das Ding beim Zupacken waren. */
interface Drag {
  controller: ControllerState;
  target: StandTarget;
  hand: { position: THREE.Vector3; rotation: THREE.Quaternion };
  thing: { position: THREE.Vector3; rotation: THREE.Quaternion };
  /** Die Hand beim Zupacken, als Matrix — für das ungebremste Mitziehen. */
  handMatrix: THREE.Matrix4;
  thingMatrix: THREE.Matrix4;
}

export class TuneStand {
  /** Der Stand selbst: sein -Z ist der Zeigestrahl, waagerecht. */
  readonly root = new THREE.Group();
  /** Der Griffraum darin — hier hängen Controller, Handschuh und Werkzeug. */
  private readonly grip = new THREE.Group();
  private readonly controller = new THREE.Group();
  private readonly controllerStuff: THREE.Material[] = [];
  private readonly ownGeometry: THREE.BufferGeometry[] = [];
  private real: THREE.Object3D | null = null;
  private built: THREE.Object3D | null = null;
  private glove: GhostHand | null = null;
  private gloveKey = '';
  /** Das Abbild des gehaltenen Werkzeugs — geteilte Netze, nur ausgehängt. */
  private readonly toolCopy = new THREE.Group();
  private copiedFrom: Tool | null = null;
  private copiedCount = -1;
  private copyAge = 0;
  private readonly cross = new THREE.Group();
  private drag: Drag | null = null;
  private disposed = false;
  /** Wie der Griff zum Strahl steht (`grip⁻¹ · ray`), vom echten Controller abgelesen. */
  private readonly aim = new THREE.Quaternion();
  private turns = 0;

  side: Handedness;
  target: StandTarget = 'glove';
  step = 1;
  fine = false;
  ghost = true;

  constructor(
    private readonly host: StandHost,
    side: Handedness,
  ) {
    this.side = side;
    this.root.name = 'tune-stand';
    this.root.add(this.grip);
    this.grip.add(this.controller, this.toolCopy);
    this.root.add(this.cross);
    this.buildCross();
    this.buildRay();
    host.scene.add(this.root);
    host.hands.standControllers = true;
    this.buildController();
    this.placeInFront();
  }

  /** Was die Hand gerade hält, wenn es am Stand verschoben werden kann. */
  tool(): Tool | null {
    const tool = this.host.heldTool(this.side);
    if (!tool || tool.worn || tool.toolId === HAND_TOOL_ID) return null;
    return tool;
  }

  /** Unter welcher Id die Haltung der Hand gerade abgelegt ist — `null`: die leere. */
  poseId(): string | null {
    const held = this.host.hands.heldToolOf(this.side);
    if (!held || held === HAND_TOOL_ID) return null;
    // Wer selbst nichts eigenes hat, trägt die Faust des Standardgriffs — und
    // die wird dann auch verschoben, für alle Werkzeuge mit diesem Griff.
    if (!hasHandPose(this.side, held) && STANDARD_GRIP_TOOLS.has(held)) return GRIP_POSE_ID;
    return held;
  }

  /** Die Haltung, die die Hand gerade trägt. */
  pose(): HandPose {
    const id = this.poseId();
    return id ? holdHandPose(this.side, id) : idleHandPose(this.side);
  }

  /** Ob die Haltung selbst eingestellt ist (und nicht die gebaute). */
  poseIsOwn(): boolean {
    return hasHandPose(this.side, this.poseId() ?? undefined);
  }

  /** Die sechs Zahlen dessen, was gerade gewählt ist, für eine Menüzeile. */
  readout(): string {
    if (this.target === 'tool') {
      const tool = this.tool();
      if (!tool) return 'Kein Werkzeug in dieser Hand';
      tool.holdIn(this.side, _p, _t);
      _euler.setFromQuaternion(_t, 'XYZ');
      return describe(_p.x * 100, _p.y * 100, _p.z * 100, _euler.x, _euler.y, _euler.z);
    }
    const pose = this.pose();
    return describe(pose.x, pose.y, pose.z, pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG);
  }

  /** Steht wieder vor dem Kopf — und der Strahl zeigt zur Seite, damit man das Profil sieht. */
  placeInFront(): void {
    this.host.camera.getWorldPosition(_head);
    this.host.camera.getWorldDirection(_dir);
    _dir.y = 0;
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
    _dir.normalize();
    this.root.position.copy(_head).addScaledVector(_dir, STAND_AHEAD);
    this.root.position.y -= STAND_BELOW;
    this.turns = 0;
    this.face(_dir);
  }

  /** Eine Vierteldrehung um die Senkrechte — von der anderen Seite ansehen. */
  turn(): void {
    this.turns = (this.turns + 1) % 4;
    this.host.camera.getWorldPosition(_head);
    _dir.copy(this.root.position).sub(_head);
    _dir.y = 0;
    if (_dir.lengthSq() < 1e-6) _dir.set(0, 0, -1);
    this.face(_dir.normalize());
  }

  /**
   * Der Strahl zeigt quer zum Blick: rechts nach links, links nach rechts.
   * So schaut man auf den **Handrücken**, und genau dort steckten die Knöchel
   * im Kopf des Controllers.
   */
  private face(view: THREE.Vector3): void {
    // oben × Blick zeigt nach links; die linke Hand zielt andersherum.
    _v.set(0, 1, 0).cross(view);
    if (this.side === 'left') _v.negate();
    _v.applyAxisAngle(_p.set(0, 1, 0), (this.turns * Math.PI) / 2);
    // `lookAt` richtet +Z aus; der Strahl ist -Z.
    _p.copy(this.root.position).sub(_v);
    this.root.lookAt(_p);
  }

  /** Die andere Hand an den Stand — der Controller wird dazu neu gebaut. */
  setSide(side: Handedness): void {
    if (side === this.side) return;
    this.side = side;
    this.drag = null;
    this.buildController();
    this.gloveKey = '';
    this.copiedFrom = null;
    this.placeInFront();
  }

  setGhost(on: boolean): void {
    this.ghost = on;
    for (const material of this.controllerStuff) {
      material.transparent = on;
      material.opacity = on ? GHOST_OPACITY : 1;
      material.depthWrite = !on;
      material.needsUpdate = true;
    }
  }

  /** Ein Schritt entlang einer Achse des Zeigestrahls. */
  move(direction: StandMove): void {
    const { cm, deg } = STAND_STEPS[this.step] ?? STAND_STEPS[1]!;
    // Der Druck kommt zwischen zwei Bildern — vielleicht vor dem ersten.
    this.readAim();
    this.updateTool(0);
    const local = this.localOf(this.target);
    if (!local) return;
    const d = cm / 100;
    _v.set(0, 0, 0);
    _dq.identity();
    switch (direction) {
      case 'forward':
        _v.z = -d;
        break;
      case 'back':
        _v.z = d;
        break;
      case 'up':
        _v.y = d;
        break;
      case 'down':
        _v.y = -d;
        break;
      case 'left':
        _v.x = -d;
        break;
      case 'right':
        _v.x = d;
        break;
      case 'pitch-up':
        _dq.setFromAxisAngle(_p.set(1, 0, 0), deg * DEG);
        break;
      case 'pitch-down':
        _dq.setFromAxisAngle(_p.set(1, 0, 0), -deg * DEG);
        break;
      case 'yaw-left':
        _dq.setFromAxisAngle(_p.set(0, 1, 0), deg * DEG);
        break;
      case 'yaw-right':
        _dq.setFromAxisAngle(_p.set(0, 1, 0), -deg * DEG);
        break;
      case 'roll-left':
        _dq.setFromAxisAngle(_p.set(0, 0, 1), deg * DEG);
        break;
      case 'roll-right':
        _dq.setFromAxisAngle(_p.set(0, 0, 1), -deg * DEG);
        break;
    }
    // Vom Strahl in den Griffraum: v_g = aim · v_r, und eine Drehung um eine
    // Achse des Strahls ist im Griffraum aim · dq · aim⁻¹ — um den eigenen
    // Nullpunkt des Dings, nicht um den des Controllers.
    _v.applyQuaternion(this.aim);
    local.position.add(_v);
    _aimInv.copy(this.aim).invert();
    _q.copy(this.aim).multiply(_dq).multiply(_aimInv);
    local.rotation.premultiply(_q).normalize();
    this.apply(this.target, local.position, local.rotation, true);
  }

  /** Zurück zur gebauten Lage — nur für das, was gerade gewählt ist. */
  reset(): string {
    if (this.target === 'tool') {
      const tool = this.tool();
      if (!tool) return 'Kein Werkzeug in dieser Hand';
      clearPose(tool.toolId);
      for (const live of this.host.liveTools()) if (live.toolId === tool.toolId) live.resetHold();
      return `${tool.label}: gebaute Lage`;
    }
    const id = this.poseId();
    if (id) clearHoldHandPose(this.side, id);
    else clearIdleHandPose(this.side);
    this.host.hands.refreshPoses();
    return 'Handschuh: gebaute Haltung';
  }

  /** Die Haltung des Handschuhs auf die andere Hand — gespiegelt. */
  mirror(): string {
    const other: Handedness = this.side === 'left' ? 'right' : 'left';
    const id = this.poseId();
    const mirrored = mirrorHandPose(this.pose());
    if (id) saveHoldHandPose(other, id, mirrored);
    else saveIdleHandPose(other, mirrored);
    this.host.hands.refreshPoses();
    return `Gespiegelt auf ${other === 'left' ? 'links' : 'rechts'}`;
  }

  /**
   * Jedes Bild: Handschuh und Werkzeug nachstellen, und Greifen am Stand
   * abfangen, bevor die Welt es für sich nimmt.
   *
   * @returns eine Meldung, wenn ein Griff gerade zu Ende ging
   */
  update(dt: number): string | null {
    if (this.disposed) return null;
    this.readAim();
    this.updateGlove();
    this.updateTool(dt);
    let done: string | null = null;
    if (this.drag) done = this.followDrag();
    else this.startDrag();
    this.updateCross();
    return done;
  }

  dispose(): void {
    this.disposed = true;
    this.host.hands.standControllers = false;
    this.root.removeFromParent();
    this.glove?.removeFromParent();
    this.glove?.dispose();
    this.glove = null;
    this.clearCopy();
    this.real?.removeFromParent();
    this.real = null;
    for (const geometry of this.ownGeometry) geometry.dispose();
    for (const material of this.controllerStuff) material.dispose();
    this.root.traverse((node) => {
      const line = node as THREE.Line;
      if (!line.isLine) return;
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
  }

  // --- was am Stand hängt -----------------------------------------------------

  /**
   * Wie der Griff zum Strahl steht. Das ist eine Eigenschaft des Geräts und
   * nicht der Haltung: abgelesen am echten Controller, sonst die Zahl, mit der
   * auch die Werkzeugseite rechnet (`GRIP_TO_RAY`).
   */
  private readAim(): void {
    const live = this.host.input.get(this.side);
    if (live && !live.isHand && live.grip.visible) {
      this.aim.copy(live.grip.quaternion).invert().multiply(live.targetRay.quaternion).normalize();
    } else {
      this.aim.set(GRIP_TO_RAY.x, GRIP_TO_RAY.y, GRIP_TO_RAY.z, GRIP_TO_RAY.w);
    }
    this.grip.quaternion.copy(this.aim).invert();
  }

  private buildController(): void {
    this.real?.removeFromParent();
    this.real = null;
    this.built?.removeFromParent();
    for (const geometry of this.ownGeometry) geometry.dispose();
    this.ownGeometry.length = 0;
    for (const material of this.controllerStuff) material.dispose();
    this.controllerStuff.length = 0;

    const side = this.side;
    const stuff = (color: number): THREE.MeshStandardMaterial => {
      const material = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      this.controllerStuff.push(material);
      return material;
    };
    const built = buildControllerShape(side, stuff(0x9aa6bd), (_key, color) => stuff(color)).root;
    built.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) this.ownGeometry.push(mesh.geometry);
    });
    this.built = built;
    this.controller.add(built);
    this.setGhost(this.ghost);
    const source = this.host.input.get(side)?.inputSource ?? null;
    void controllerShape(side, source).then((shape) => {
      if (!shape || this.disposed || this.side !== side || this.built !== built) return;
      // Die Netze teilt es mit jedem anderen Controller; die Stoffe gehören
      // diesem Stand, damit er durchsichtig sein darf.
      this.controllerStuff.push(...ownMaterials(shape));
      this.real = shape;
      built.visible = false;
      this.controller.add(shape);
      this.setGhost(this.ghost);
    });
  }

  private updateGlove(): void {
    const pose = this.pose();
    const look = this.host.hands.lookOf(this.side);
    const key = `${this.side}|${look}|${JSON.stringify(pose)}`;
    if (key === this.gloveKey && this.glove) return;
    const rebuild = !this.glove || this.glove.side !== this.side || this.glove.look !== look;
    if (rebuild) {
      this.glove?.removeFromParent();
      this.glove?.dispose();
      this.glove = new GhostHand(this.side, pose, { color: handColor(), look, opacity: 1 });
      this.glove.name = 'tune-stand-glove';
      this.grip.add(this.glove);
    } else {
      this.glove!.setPose(pose);
      this.glove!.update(1);
    }
    placePose(this.glove!, pose);
    this.gloveKey = key;
  }

  /**
   * Das Werkzeug als **Abbild**: die Kinder des gehaltenen, geklont. Netze und
   * Stoffe teilt es mit dem Original — das spart den Bau einer zweiten Pistole
   * und zeigt, was wirklich in der Hand liegt, auch bei Werkzeugen, die nur
   * eine Welt bauen kann (die Lampe der Raumstation). Weggeräumt wird nur
   * durch Aushängen.
   */
  private updateTool(dt: number): void {
    const tool = this.tool();
    this.copyAge += dt;
    if (!tool) {
      if (this.copiedFrom) this.clearCopy();
      return;
    }
    let count = 0;
    tool.traverse(() => count++);
    if (tool !== this.copiedFrom || (count !== this.copiedCount && this.copyAge > 1)) {
      this.clearCopy();
      for (const child of tool.children) this.toolCopy.add(child.clone(true));
      this.copiedFrom = tool;
      this.copiedCount = count;
      this.copyAge = 0;
    }
    // Wie es gerade im Griff hängt — samt der Zielkorrektur, die die Welt in
    // jedem Bild draufrechnet (`Tool.applyHold`). Steckt es nicht im Griff
    // (bloße Hand), gilt seine Lage im Griff ohne Korrektur.
    const live = this.host.input.get(this.side);
    // Am Controller sitzt der Halteknoten ungedreht im Griffraum (`XRInput.hold`).
    if (live && !live.isHand && tool.parent === live.hold) {
      this.toolCopy.position.copy(tool.position);
      this.toolCopy.quaternion.copy(tool.quaternion);
    } else {
      tool.holdIn(this.side, this.toolCopy.position, this.toolCopy.quaternion);
    }
    this.toolCopy.visible = true;
  }

  private clearCopy(): void {
    for (const child of [...this.toolCopy.children]) child.removeFromParent();
    this.toolCopy.visible = false;
    this.copiedFrom = null;
    this.copiedCount = -1;
  }

  // --- verschieben ------------------------------------------------------------

  /** Lage des Gewählten im Griffraum — eine Kopie, die man verändern darf. */
  private localOf(
    target: StandTarget,
  ): { position: THREE.Vector3; rotation: THREE.Quaternion } | null {
    if (target === 'tool') {
      if (!this.tool() || !this.toolCopy.visible) return null;
      return {
        position: this.toolCopy.position.clone(),
        rotation: this.toolCopy.quaternion.clone(),
      };
    }
    const pose = this.pose();
    return {
      position: new THREE.Vector3(pose.x / 100, pose.y / 100, pose.z / 100),
      rotation: new THREE.Quaternion().setFromEuler(
        _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
      ),
    };
  }

  /**
   * Eine neue Lage im Griffraum übernehmen — in den Speicher, und damit auch
   * an die echte Hand.
   *
   * @param save beim Werkzeug: auch in den Speicher (beim Ziehen erst am Ende)
   */
  private apply(
    target: StandTarget,
    position: THREE.Vector3,
    rotation: THREE.Quaternion,
    save: boolean,
  ): void {
    if (target === 'glove') {
      _euler.setFromQuaternion(rotation, 'XYZ');
      const pose: HandPose = {
        ...clonePose(this.pose()),
        x: round(position.x * 100, 2),
        y: round(position.y * 100, 2),
        z: round(position.z * 100, 2),
        pitch: round(_euler.x / DEG, 1),
        yaw: round(_euler.y / DEG, 1),
        roll: round(_euler.z / DEG, 1),
      };
      const id = this.poseId();
      if (id) saveHoldHandPose(this.side, id, pose);
      else saveIdleHandPose(this.side, pose);
      return;
    }
    const tool = this.tool();
    if (!tool) return;
    // Die Zielkorrektur, die gerade auf dem Werkzeug liegt, wieder abziehen:
    // gespeichert wird die Lage im Griff, und die Welt rechnet die Korrektur
    // in jedem Bild neu darauf (`Tool.applyHold`).
    tool.holdIn(this.side, _p, _t);
    _q.copy(this.toolCopy.quaternion).multiply(_t.invert());
    const tilt = _q.invert().multiply(rotation).normalize();
    for (const live of this.host.liveTools()) {
      if (live.toolId !== tool.toolId) continue;
      live.holdHand = this.side;
      live.holdPosition.copy(position);
      live.holdRotation.copy(tilt);
    }
    // Das Abbild und das gehaltene gleich mit — sonst hinkten beide ein Bild
    // hinterher, und ein zweiter Druck vor dem nächsten Bild ginge vom alten
    // Stand aus.
    this.toolCopy.position.copy(position);
    this.toolCopy.quaternion.copy(rotation);
    const live = this.host.input.get(this.side);
    if (live && !live.isHand && tool.parent === live.hold) {
      tool.position.copy(position);
      tool.quaternion.copy(rotation);
    }
    if (save) {
      savePose(
        tool.toolId,
        {
          position: { x: position.x, y: position.y, z: position.z },
          rotation: { x: tilt.x, y: tilt.y, z: tilt.z, w: tilt.w },
        },
        this.side,
      );
    }
  }

  /** Greifen in der Nähe des Stands nimmt das gewählte Ding. */
  private startDrag(): void {
    const local = this.localOf(this.target);
    if (!local) return;
    this.root.getWorldPosition(_head);
    for (const controller of this.host.input.controllers) {
      if (!controller.connected || !controller.squeeze.justPressed) continue;
      const anchor = gripAnchor(controller);
      anchor.getWorldPosition(_p);
      if (_p.distanceTo(_head) > GRAB_REACH) continue;
      // Die Welt soll diesen Griff nicht auch noch sehen.
      controller.squeeze.justPressed = false;
      anchor.updateWorldMatrix(true, false);
      this.grip.updateWorldMatrix(true, false);
      const handMatrix = anchor.matrixWorld.clone();
      _m.compose(local.position, local.rotation, _one);
      const thingMatrix = this.grip.matrixWorld.clone().multiply(_m);
      const hand = { position: new THREE.Vector3(), rotation: new THREE.Quaternion() };
      const thing = { position: new THREE.Vector3(), rotation: new THREE.Quaternion() };
      handMatrix.decompose(hand.position, hand.rotation, _s);
      thingMatrix.decompose(thing.position, thing.rotation, _s);
      this.drag = { controller, target: this.target, hand, thing, handMatrix, thingMatrix };
      controller.pulse(0.35, 20);
      return;
    }
  }

  private followDrag(): string | null {
    const drag = this.drag!;
    const controller = drag.controller;
    const anchor = gripAnchor(controller);
    anchor.updateWorldMatrix(true, false);
    this.grip.updateWorldMatrix(true, false);
    // Das Ding in der Welt, wie die Hand es mitnimmt.
    if (this.fine) {
      anchor.matrixWorld.decompose(_p, _t, _s);
      const next = nudgeGrip(drag.thing, drag.hand, { position: _p, rotation: _t }, FINE_FACTOR);
      _m.compose(
        _v.set(next.position.x, next.position.y, next.position.z),
        _q.set(next.rotation.x, next.rotation.y, next.rotation.z, next.rotation.w),
        _one,
      );
    } else {
      _m2.copy(drag.handMatrix).invert();
      _m.multiplyMatrices(anchor.matrixWorld, _m2).multiply(drag.thingMatrix);
    }
    // … und im Griffraum des Stands.
    _m2.copy(this.grip.matrixWorld).invert().multiply(_m);
    _m2.decompose(_v, _q, _s);
    const released = !controller.squeeze.pressed || !controller.connected;
    this.apply(drag.target, _v, _q, released);
    if (!released) return null;
    controller.squeeze.justReleased = false;
    this.drag = null;
    controller.pulse(0.25, 15);
    return `${drag.target === 'tool' ? 'Werkzeug' : 'Handschuh'}: ${this.readout()}`;
  }

  // --- was man sieht ----------------------------------------------------------

  /** Das Achsenkreuz am Gewählten: rot rechts, grün hoch, blau vor. */
  private buildCross(): void {
    const axis = (to: THREE.Vector3, color: number): THREE.Line => {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), to]);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }),
      );
      line.renderOrder = 10;
      return line;
    };
    this.cross.add(
      axis(new THREE.Vector3(AXIS_LENGTH, 0, 0), 0xff5a5a),
      axis(new THREE.Vector3(0, AXIS_LENGTH, 0), 0x5ee07a),
      axis(new THREE.Vector3(0, 0, -AXIS_LENGTH), 0x5aa8ff),
    );
  }

  /** Der weiße Zeigestrahl — dieselbe Linie, die in der Brille aus dem Controller kommt. */
  private buildRay(): void {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(0, 0, -RAY_LENGTH),
    ]);
    const ray = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
    );
    ray.name = 'tune-stand-ray';
    this.root.add(ray);
  }

  private updateCross(): void {
    const local = this.localOf(this.target);
    this.cross.visible = local !== null;
    if (!local) return;
    // Der Nullpunkt des Gewählten, aber in den Achsen des Strahls.
    this.cross.position.copy(local.position).applyQuaternion(this.grip.quaternion);
  }
}

/** Eine Haltung an einen Knoten im Griffraum hängen: cm und Grad. */
function placePose(node: THREE.Object3D, pose: HandPose): void {
  node.position.set(pose.x / 100, pose.y / 100, pose.z / 100);
  node.quaternion.setFromEuler(
    _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
  );
}

function round(value: number, digits: number): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale + 0;
}

function describe(x: number, y: number, z: number, rx: number, ry: number, rz: number): string {
  const n = (value: number, digits: number): string =>
    round(value, digits).toLocaleString('de-DE', { maximumFractionDigits: digits });
  // Kurz, damit es in die Unterzeile einer Menükachel passt: Ort in cm,
  // dann Pitch/Yaw/Roll in Grad.
  return `${n(x, 1)} / ${n(y, 1)} / ${n(z, 1)} cm · ${n(rx / DEG, 0)}° / ${n(ry / DEG, 0)}° / ${n(rz / DEG, 0)}°`;
}
