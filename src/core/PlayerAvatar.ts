import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from './AvatarBody';
import { CHEF_EYE, CHEF_GRIP, POSE_SCALE, canLoadModels } from './chefFit';
import { buildCrane, cranePose, disposeCrane, dressCrane } from './crane';
import type { PlayerRig } from './PlayerRig';
import type { XRInput } from './XRInput';

/**
 * Objects on this layer are only drawn by portal views, never by the eye
 * itself — that is where the whole avatar lives: you see your hands directly,
 * but your body only when you look at yourself through a portal.
 */
export const LAYER_SELF_ONLY = 3;

const _head: AvatarLimb = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
const _left: AvatarLimb = { position: new THREE.Vector3() };
const _right: AvatarLimb = { position: new THREE.Vector3() };
const _local = new THREE.Matrix4();
const _scale = new THREE.Vector3();
const _feet = new THREE.Vector3();
const _turn = new THREE.Quaternion();
const _euler = new THREE.Euler();

/** Ein Stoff als Geist: derselbe, halb durchsichtig. */
function ghostOf(material: THREE.Material): THREE.Material {
  const ghost = material.clone();
  ghost.transparent = true;
  ghost.opacity = 0.4;
  ghost.depthWrite = false;
  return ghost;
}

/** Wie `ghostOf`, nur kalt leuchtend — ein Geist, den man auch im Dunkeln sieht (`setSpirit`). */
function spiritOf(material: THREE.Material): THREE.Material {
  const ghost = ghostOf(material);
  ghost.opacity = 0.6;
  const lit = ghost as THREE.MeshStandardMaterial;
  if (lit.emissive) {
    lit.emissive.setHex(0x7fe9ff);
    lit.emissiveIntensity = 0.7;
  }
  return ghost;
}

/**
 * The local player's body. Lives inside the rig, so everything it is fed is in
 * rig space, and sits on a layer only the portal views render.
 */
export class PlayerAvatar extends AvatarBody {
  /**
   * The rig pose the body was standing in when the view left, in world space.
   *
   * Not the head: the body is built in this group's parent space with the
   * floor at y = 0, so what has to be held still is the *frame*, not a point
   * inside it. While the view is away the group is put back into this frame
   * every frame, and the head keeps the pose it had inside it — which is why
   * a drone climbing ten metres no longer stretches the body it left behind.
   */
  private readonly anchor = new THREE.Matrix4();
  /** Head pose inside that frozen frame — constant for as long as it lasts. */
  private readonly frozenHead: AvatarLimb = {
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
  };
  private detached = false;

  /**
   * **Von oben schaut der Kopf, wohin die Figur steht** — und nicht, wohin die
   * Desktop-Kamera zeigt.
   *
   * Sonst hängt die Sache schief: Die Ansicht von oben hat eine eigene Kamera
   * (`core/TopDownCamera.ts`), die Rig-Kamera bleibt stehen, wo die Maus sie
   * zuletzt hingedreht hat — und der Kopf des eigenen Körpers schaute dann
   * beim Laufen starr in eine Richtung von vorhin. Mit diesem Schalter steht
   * der Kopf gerade im Rig, also in die Richtung, in die auch die Figur läuft
   * (`FlatControls.walkNorthUp`).
   */
  headFollowsRig = false;

  /**
   * **Worauf man sitzt, in der Welt** (`PortalWorld.sitOn`) — die Mitte der
   * Sitzfläche am Boden, ihre Höhe und wohin man schaut. Jedes Bild in den
   * Raum des Rigs umgerechnet (`AvatarBody.seat`): Das Rig sinkt beim Sitzen
   * um die Augenhöhe, die Figur soll das nicht.
   */
  sitting: { at: THREE.Vector3; top: number; yaw: number } | null = null;

  /**
   * **Wo die rechte Hand liegt, wenn keine getrackt wird** — im Raum des Rigs.
   *
   * Von oben hält die Figur ihr Werkzeug an einer festen Stelle vor der
   * rechten Schulter (`PortalWorld`, die Bildschirmhand). Ohne diese Zeile
   * schwebte die Hand am Rumpf und die Pistole allein in der Luft. `null`
   * heißt: nichts in der Hand, die Hand schwebt wie sonst neben dem Rumpf.
   */
  screenHand: THREE.Vector3 | null = null;

  /**
   * **Was die Figur vor dem Körper trägt**, im Raum der Figur
   * (`core/chefFit.CHEF_CARRY`) — oder `null` für leere Hände.
   *
   * Beide Hände gehen darunter, und zwar nur die, die **nicht** getrackt sind:
   * In der Brille hält der Mensch davor seine eigenen Hände dorthin, wo er
   * will, und eine Hand, die ihm dabei an einen Teller gezogen würde, wäre
   * seine nicht mehr. Von oben ist keine getrackt, also gehen beide hin — und
   * genau dort sieht man es auch.
   *
   * Die rechte Hand hat ein **Werkzeug** als Vorrang (`screenHand`): Wer eine
   * Pistole führt und nebenbei ein Brötchen trägt, hält die Pistole weiter in
   * der Hand, in der sie sichtbar ist, und das Brötchen mit der linken.
   */
  carry: THREE.Vector3 | null = null;

  /**
   * **Der Kran** (`core/crane.ts`) — gebaut beim ersten Einrichten, danach
   * nur noch an- und ausgeschaltet.
   */
  private craneMesh: THREE.Group | null = null;
  /** Die Uhr des Krans: Schweben und Drehen hängen daran. */
  private craneTime = 0;

  /** Wie weit der Kopf beim Tragen mitwippt (`AvatarBody.headBob`). */
  private static readonly CARRY_BOB = 0.018;

  constructor(color = 0x3f6fb5) {
    // Die beiden Handkugeln — von oben sieht man sich selbst, und eine Figur
    // ohne Hände sieht von dort aus abgesägt aus. Gezeigt werden sie nur, wo
    // sie gebraucht werden (`showHands`): In der Brille sind die eigenen Hände
    // die getrackten, und eine zweite Kugel an derselben Stelle wäre im
    // Spiegel eine zu viel.
    super({ color, hands: true });
    this.name = 'player-avatar';
    this.setHandsVisible(false);
    this.setLayer(LAYER_SELF_ONLY);
  }

  /** Ob der Körper für den Kran stehen geblieben ist (`setCrane`). */
  private craneLeft = false;
  /** Die eigenen Stoffe der Figur, solange sie als Geist dasteht (`setGhostly`). */
  private readonly ghostWorn = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();

  /**
   * **Ob man gerade der Kran ist** — der Greifer schwebt über dem Kopf
   * (`core/crane.ts`), und **die Figur bleibt stehen, wo sie war**, halb
   * durchsichtig wie ein Geist. Gewünscht: _„wenn ich den aktiviere, der
   * spieler einfach da stehen bleibt wo er ist und nur der kran dazu kommt
   * […] der spieler wird ghost und ich kann diesen mit dem kran auch
   * umsetzen"_. Vorher trat der Körper ab, und wo der Kran aufhörte, stand
   * man.
   *
   * Der Kran hängt deshalb nicht mehr an der Figur, sondern am Rig: Die Figur
   * steht still (`leaveBehind`), der Kran fliegt mit dem Rig.
   *
   * @param headWorld die Kopfhaltung, an der die Figur stehen bleibt
   */
  setCrane(on: boolean, headWorld: THREE.Matrix4): void {
    if (on && !this.craneMesh) {
      this.craneMesh = buildCrane();
      (this.parent ?? this).add(this.craneMesh);
      // Dieselbe Ebene wie der Rest des Körpers: von oben zu sehen, aus den
      // eigenen Augen nicht.
      const layers = this.head.layers.mask;
      this.craneMesh.traverse((object) => (object.layers.mask = layers));
      // **Und dann die Teile aus dem Regal** (`dressCrane`): Dropship, Kette,
      // Haken. Bis sie da sind, steht der gebaute Kran — ohne WebGL für immer.
      if (canLoadModels()) {
        const crane = this.craneMesh;
        void import('./kaykitModel').then((module) => dressCrane(crane, module.kaykitModel));
      }
    }
    if (this.craneMesh) this.craneMesh.visible = on;
    if (on && !this.craneLeft && !this.detached) {
      this.craneLeft = true;
      this.leaveBehind(headWorld);
      this.setGhostly(true);
    } else if (!on && this.craneLeft) {
      this.craneLeft = false;
      this.setGhostly(false);
      this.comeBack();
    }
  }

  /**
   * **Wo die stehen gebliebene Figur mit den Füßen steht**, in Weltmetern —
   * `null`, solange sie nicht stehen geblieben ist.
   */
  behindFeet(target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.detached) return null;
    return target
      .set(this.frozenHead.position.x, 0, this.frozenHead.position.z)
      .applyMatrix4(this.anchor);
  }

  /** **Die stehen gebliebene Figur woandershin stellen** — die Füße auf `feet`. */
  moveBehind(feet: THREE.Vector3): void {
    const now = this.behindFeet(_feet);
    if (!now) return;
    this.anchor.premultiply(_local.makeTranslation(feet.x - now.x, feet.y - now.y, feet.z - now.z));
  }

  /**
   * **Halb durchsichtig, wie ein Geist** — mit eigenen Abzügen der Stoffe,
   * denn die Stoffe der Modelle teilen sich alle, die dasselbe Modell tragen.
   */
  private setGhostly(
    on: boolean,
    make: (material: THREE.Material) => THREE.Material = ghostOf,
  ): void {
    if (on) {
      this.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh || this.ghostWorn.has(mesh)) return;
        this.ghostWorn.set(mesh, mesh.material);
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map(make)
          : make(mesh.material);
      });
      return;
    }
    for (const [mesh, worn] of this.ghostWorn) {
      const ghost = mesh.material;
      for (const one of Array.isArray(ghost) ? ghost : [ghost]) one.dispose();
      mesh.material = worn;
    }
    this.ghostWorn.clear();
  }

  /**
   * **Die Figur als Geist** — halb durchsichtig und kalt leuchtend, damit man
   * sie auch im Dunkeln liegen sieht. Der Tod des Technikers in Orbital
   * (`ShipExperience.stepEnd`): _„wenn man stirbt fehlt mir noch das licht
   * (und der spieler als ghost charakter)"_.
   */
  setSpirit(on: boolean): void {
    this.setGhostly(on, spiritOf);
  }

  get crane(): boolean {
    return this.craneMesh?.visible ?? false;
  }

  /** Ob die Handkugeln mitgezeichnet werden — von oben ja, sonst nicht. */
  set showHands(on: boolean) {
    this.setHandsVisible(on);
  }

  /**
   * Leaves the body where it stands and lets its owner see it.
   *
   * The drone takes the *view* somewhere else while the body stays behind — so
   * for as long as that lasts, the avatar has to stop following the head, and
   * it has to be drawn for the eye that is looking back at it. Both come back
   * with `comeBack`.
   *
   * @param headWorld the head pose to freeze the body at, in world space
   */
  leaveBehind(headWorld: THREE.Matrix4): void {
    if (this.detached) return;
    this.detached = true;
    const parent = this.parent;
    parent?.updateWorldMatrix(true, false);
    this.anchor.copy(parent ? parent.matrixWorld : _local.identity());
    // The head, once, in the frame that is being frozen — from here on the
    // body is simply that pose, standing still.
    _local.copy(this.anchor).invert().multiply(headWorld);
    this.frozenHead.position.setFromMatrixPosition(_local);
    this.frozenHead.quaternion!.setFromRotationMatrix(_local);
    // Layer 0 is what every camera draws; up to now only the portal views did.
    this.setLayer(0);
  }

  /** Body back under the head, and invisible to its own eye again. */
  comeBack(): void {
    if (!this.detached) return;
    this.detached = false;
    this.position.set(0, 0, 0);
    this.quaternion.identity();
    this.setLayer(LAYER_SELF_ONLY);
  }

  /**
   * @param rig       the avatar is a child of this rig, so everything is local
   * @param headLocal head pose in rig space
   */
  updateFromRig(dt: number, rig: PlayerRig, input: XRInput, headLocal: THREE.Matrix4): void {
    _head.position.setFromMatrixPosition(headLocal);
    const crane = this.craneMesh;
    if (crane?.visible) {
      this.craneTime += dt;
      const pose = cranePose(_head.position.x, _head.position.z, this.craneTime);
      crane.position.set(pose.x, pose.y, pose.z);
      crane.rotation.y = pose.yaw;
    }
    if (this.detached) {
      // The rig flies out with the drone; the body does not. Putting the whole
      // *group* back into the frame it was left in keeps its floor at y = 0
      // and its head where it was — feeding a moving rig space a fixed world
      // pose instead is what used to pull the legs and the neck out of shape
      // every time the machine climbed or turned.
      rig.updateMatrixWorld(true);
      _local.copy(rig.matrixWorld).invert().multiply(this.anchor);
      _local.decompose(this.position, this.quaternion, _scale);
      this.updateMatrixWorld(true);
      // The hands went with you; the body left behind just lets them float.
      this.update(dt, this.frozenHead, null, null);
      return;
    }

    const sitting = this.sitting;
    if (sitting) {
      rig.updateMatrixWorld(true);
      _feet.copy(sitting.at);
      rig.worldToLocal(_feet);
      _euler.setFromQuaternion(rig.getWorldQuaternion(_turn), 'YXZ');
      this.seat = {
        x: _feet.x,
        y: _feet.y,
        z: _feet.z,
        top: sitting.top,
        yaw: sitting.yaw - _euler.y,
      };
    } else {
      this.seat = null;
    }

    // Die Höhe kommt auch von oben aus der Kamera — Ducken und Sitzen sollen
    // die Figur ja kleiner machen. Nur ihre Drehung nicht.
    if (this.headFollowsRig) _head.quaternion!.identity();
    else _head.quaternion!.setFromRotationMatrix(headLocal);

    let left = handOf(input, 'left', _left);
    let right = handOf(input, 'right', _right);
    if (!right && this.screenHand) {
      _right.position.copy(this.screenHand);
      right = _right;
    }
    const carry = this.carry;
    this.headBob = carry ? PlayerAvatar.CARRY_BOB : 0;
    if (carry) {
      // **Die Umkehrung der Stauchung**, dieselbe wie bei der Bildschirmhand
      // (`worlds/portal/screenHand.ts`): Der Avatar rechnet jede Handpose auf
      // Figurenmaß herunter (`AvatarBody.update`, `POSE_SCALE`), also steht
      // hier die Pose, aus der er wieder genau die Stelle an der Figur macht —
      // und keine zweite geratene Zahl, die beim nächsten Umbau danebenläge.
      const y = rig.camera.position.y + (carry.y - CHEF_EYE) / POSE_SCALE;
      if (!left) {
        _left.position.set((carry.x - CHEF_GRIP) / POSE_SCALE, y, carry.z / POSE_SCALE);
        left = _left;
      }
      if (!right) {
        _right.position.set((carry.x + CHEF_GRIP) / POSE_SCALE, y, carry.z / POSE_SCALE);
        right = _right;
      }
    }
    this.update(dt, _head, left, right);
  }

  override dispose(): void {
    this.setGhostly(false);
    this.craneMesh?.removeFromParent();
    if (this.craneMesh) disposeCrane(this.craneMesh);
    this.craneMesh = null;
    super.dispose();
  }

  private setLayer(layer: number): void {
    this.traverse((object) => object.layers.set(layer));
  }
}

function handOf(input: XRInput, side: 'left' | 'right', target: AvatarLimb): AvatarLimb | null {
  const controller = input.controllers.find((c) => c.handedness === side);
  if (!controller?.tracked) return null;
  const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
  target.position.copy(anchor.position);
  return target;
}
