import * as THREE from 'three';
import { buildHeadgear, type HeadgearKind } from './headgear';
import { DEFAULT_APPEARANCE, type Appearance } from './appearance';
import {
  buildBody,
  buildHead,
  skinTone,
  HAND_RADIUS,
  HEAD_RADIUS,
  type BodyKind,
  type BodyShape,
  type HeadKind,
} from './avatarLook';

/** Head + hand pose used to drive the body, in the body's parent space. */
export interface AvatarLimb {
  position: THREE.Vector3;
  quaternion?: THREE.Quaternion;
}

export interface AvatarBodyOptions {
  /** Colour of the suit (apron and neckerchief — what has no colour of its own). */
  color?: number;
  /** Draw balls at the hand poses — off for the local body, which already has
   *  `HandVisuals`. */
  hands?: boolean;
}

/**
 * Alles unterhalb von `root`, samt seiner Materialien — außer denen, die dem
 * Körper selbst gehören und die nächste Jacke überleben sollen (`keep`).
 */
function disposeTree(root: THREE.Object3D, keep?: ReadonlySet<THREE.Material>): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      if (material && !keep?.has(material)) material.dispose();
    }
  });
}

const _forward = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _world = new THREE.Vector3();

/**
 * Wie weit die Kopfmitte hinter den Augen sitzt — dort steht auch der Rumpf.
 * Ein Drittel des Kopfhalbmessers: Die Augen sitzen vorn auf der Kugel, nicht
 * in ihrer Mitte, und mit einem größeren Kopf wandert die Mitte weiter zurück.
 */
const NECK_BACK = HEAD_RADIUS * 0.34;

/**
 * **Wo eine Hand liegt, die niemand trackt** — im Raum des Rumpfes: seitlich
 * versetzt, deutlich **vor** dem Bauch, auf Brusthöhe.
 *
 * Die beiden Zahlen ziehen gegeneinander, und beide werden gebraucht. **Vor**
 * dem Bauch liegen die Hände, weil die Figur dann aussieht, als trüge sie
 * etwas — was sie meistens auch tut. **Seitlich** liegen sie weit genug, dass
 * sie über die 84 cm breite Silhouette hinausragen: Aus 16 m Höhe und unter
 * 55° (`core/topDownPose.ts`) verschwindet alles hinter diesem Rumpf, was
 * nicht neben ihm vorbeischaut, und eine Figur, die von hinten keine Hände
 * hat, greift für den Zuschauer ins Leere.
 */
const HAND_SIDE = 0.42;
const HAND_FRONT = 0.24;
/** Auf welchem Anteil der Rumpfhöhe — knapp über der dicksten Stelle. */
const HAND_LIFT = 0.66;

/**
 * **Die Figur** — ein Koch nach dem Vorbild von Overcooked, angetrieben von
 * drei Posen: Kopf plus beide Hände. Mehr weiß ein Headset über seinen Träger
 * nicht, mehr geht auch über das Netz nicht, und deshalb bedient derselbe
 * Körper den eigenen Spieler wie jeden Mitspieler.
 *
 * Kein Skelett mehr, sondern vier Teile: ein **Rumpf** wie eine Kartoffel mit
 * rundem Boden, ein großer runder **Kopf** mit Augen und Nase, und zwei
 * **Hände**, die ohne Arme davor schweben. Das ist keine Vereinfachung aus
 * Bequemlichkeit: Aus der Ansicht von oben, in der hier gespielt wird, waren
 * Ober- und Unterarm zwei graue Striche, und die Blickrichtung sah man
 * überhaupt nicht. Eine Nase sieht man.
 *
 * Gerechnet wird alles im Raum des Elternteils, mit dem Boden auf y = 0.
 */
export class AvatarBody extends THREE.Group {
  /** Yaw of the torso; follows the head with a dead zone, like a real body. */
  bodyYaw = 0;

  readonly head: THREE.Group;
  /** Follows the tracked hands — hang a tool here to show what is being held. */
  readonly handAnchors: [THREE.Object3D, THREE.Object3D];

  /**
   * Die Handkugeln (`options.hands`) — Kinder des Körpers und **nicht** des
   * Ankers. Der Anker sagt mit seiner Sichtbarkeit, ob diese Hand getrackt
   * ist (daran hängt, ob ein Werkzeug darin liegt); die Kugel schwebt auch
   * dann vor dem Rumpf, wenn niemand sie trackt.
   */
  private readonly handMeshes: THREE.Mesh[] = [];

  /** Der Rumpf: eine Gruppe, damit Drehung und Höhe getrennt bleiben. */
  private readonly torso: THREE.Group;
  private shape: BodyShape | null = null;
  private face: THREE.Group | null = null;
  private headgear: THREE.Group | null = null;

  /** Die Anzugfarbe der Rolle und der Hautton — beide geteilt, beide bleiben. */
  private readonly suit: THREE.MeshStandardMaterial;
  private readonly skin: THREE.MeshStandardMaterial;
  private readonly kept: Set<THREE.Material>;

  /** Was diese Figur gerade trägt (`core/appearance.ts`). */
  private look: Appearance = { ...DEFAULT_APPEARANCE };

  private readonly previous = new THREE.Vector3();
  private hasPrevious = false;
  private walkPhase = 0;
  private speed = 0;

  constructor(options: AvatarBodyOptions = {}) {
    super();
    this.name = 'avatar-body';

    this.suit = new THREE.MeshStandardMaterial({
      color: options.color ?? 0x3f6fb5,
      roughness: 0.6,
      metalness: 0.15,
    });
    this.skin = new THREE.MeshStandardMaterial({
      color: skinTone(DEFAULT_APPEARANCE.head),
      roughness: 0.85,
    });
    this.kept = new Set<THREE.Material>([this.suit, this.skin]);

    this.torso = new THREE.Group();
    this.torso.name = 'avatar-torso';
    this.add(this.torso);

    this.head = new THREE.Group();
    this.head.name = 'avatar-head';
    this.add(this.head);

    const anchors: THREE.Object3D[] = [];
    for (let i = 0; i < 2; i++) {
      const anchor = new THREE.Object3D();
      anchor.name = i === 0 ? 'hand-left' : 'hand-right';
      this.add(anchor);
      anchors.push(anchor);
      if (!options.hands) continue;
      // Ø 19 cm: Zu einem Kopf von 46 cm gehören Fäuste und keine Perlen —
      // von oben ist die Hand das, woran man sieht, wohin jemand greift.
      const ball = new THREE.Mesh(new THREE.SphereGeometry(HAND_RADIUS, 16, 12), this.skin);
      ball.frustumCulled = false;
      this.add(ball);
      this.handMeshes.push(ball);
    }
    this.handAnchors = [anchors[0]!, anchors[1]!];

    this.buildFace(this.look.head);
    this.buildTorso(this.look.body);
  }

  /**
   * **Wie diese Figur aussieht** — Kopf, Hut und Körper auf einmal
   * (`core/appearance.ts`).
   *
   * Eine Methode und nicht drei, weil die drei zusammen ankommen: aus der
   * Einstellung, aus der Umkleide oder mit der Anmeldung eines Mitspielers.
   * Gebaut wird trotzdem nur, was sich wirklich geändert hat — das hier läuft
   * je Mitspieler in jedem Bild.
   */
  setLook(look: Appearance): void {
    if (look.head !== this.look.head) this.buildFace(look.head);
    if (look.body !== this.look.body) this.buildTorso(look.body);
    this.look = { ...this.look, head: look.head, body: look.body };
    this.setHeadgear(look.hat);
  }

  setColor(color: number): void {
    this.suit.color.setHex(color);
    this.suit.emissive.setHex(color).multiplyScalar(0.12);
    // Der Hut trägt die Anzugfarbe, wo er eine trägt — also neu bauen, sonst
    // hätte ein Spieler, der die Rolle wechselt, einen Helm von vorhin auf.
    // Schürze und Halstuch teilen sich dieses Material und folgen von selbst.
    if (this.look.hat !== 'none') this.setHeadgear(this.look.hat, true);
  }

  /**
   * Ob die Handkugeln gezeichnet werden. Ein Körper ohne `options.hands` hat
   * keine, und dann tut das hier nichts.
   */
  protected setHandsVisible(on: boolean): void {
    for (const ball of this.handMeshes) ball.visible = on;
  }

  /**
   * **Setzt eine Kopfbedeckung auf** (`core/headgear.ts`).
   *
   * Sie hängt am Kopf und nicht am Körper, und das ist der ganze Trick daran:
   * `setSelfView` blendet den Kopf aus, sobald man in den eigenen Augen steckt
   * — und nimmt den Hut damit von selbst mit. Was man selbst vom eigenen Helm
   * sieht, ist etwas anderes und hängt woanders (`visorFrame`).
   *
   * @param force baut auch dann neu, wenn dieselbe Sorte schon sitzt — nach
   *   einem Farbwechsel des Anzugs.
   */
  setHeadgear(kind: HeadgearKind, force = false): void {
    if (kind === this.look.hat && !force) return;
    this.look = { ...this.look, hat: kind };
    if (this.headgear) {
      this.headgear.removeFromParent();
      disposeTree(this.headgear, this.kept);
      this.headgear = null;
    }
    const built = buildHeadgear(kind, this.suit.color.getHex());
    if (!built) return;
    this.headgear = built;
    this.head.add(built);
    // Der Kopf kann auf einer eigenen Ebene liegen (`PlayerAvatar`): Ein Hut,
    // der das nicht mitmacht, schwebte dem Spieler vor der Nase.
    built.traverse((object) => (object.layers.mask = this.head.layers.mask));
  }

  /**
   * Hides everything the wearer would have inside their own eyes. Hands and
   * whatever hangs off them stay — that is the point of a first-person view.
   */
  setSelfView(self: boolean): void {
    const visible = !self;
    this.head.visible = visible;
    this.torso.visible = visible;
  }

  /**
   * @param head  head pose in this group's parent space
   * @param left  left hand, or null when it is not tracked
   * @param right right hand, or null when it is not tracked
   */
  update(dt: number, head: AvatarLimb, left: AvatarLimb | null, right: AvatarLimb | null): void {
    const headPos = head.position;

    // Torso yaw trails the head; it only catches up past a dead zone.
    if (head.quaternion) _forward.set(0, 0, -1).applyQuaternion(head.quaternion);
    else _forward.set(0, 0, -1);
    const headYaw = Math.atan2(-_forward.x, -_forward.z);
    const difference = wrapAngle(headYaw - this.bodyYaw);
    const slack = THREE.MathUtils.degToRad(38);
    if (Math.abs(difference) > slack) {
      this.bodyYaw += difference - Math.sign(difference) * slack;
    } else if (this.speed > 0.4) {
      this.bodyYaw += difference * Math.min(1, dt * 4);
    }

    // Die Pose kommt von den **Augen**; die Kugel, die man sieht, hat ihren
    // Mittelpunkt ein Stück dahinter — sonst stünde der halbe Kopf vor dem
    // Gesicht in der Luft und der Rumpf schöbe sich nach vorn unter ihm weg.
    const headSin = Math.sin(headYaw);
    const headCos = Math.cos(headYaw);
    this.head.position.set(
      headPos.x + headSin * NECK_BACK,
      headPos.y,
      headPos.z + headCos * NECK_BACK,
    );
    if (head.quaternion) this.head.quaternion.copy(head.quaternion);

    // Der Rumpf steht unter dem Kopf, vom Boden bis knapp unter die Kugel.
    // Ducken staucht ihn: Seine Höhe ist die des Kopfes, nicht seine eigene.
    const sin = Math.sin(this.bodyYaw);
    const cos = Math.cos(this.bodyYaw);
    const baseX = headPos.x + sin * NECK_BACK;
    const baseZ = headPos.z + cos * NECK_BACK;
    // Der Kopf sitzt **auf** dem Rumpf, ohne Hals: Die Schulter endet ein
    // Stück über der Kopfunterkante, und die Kugel steckt darin.
    const height = Math.max(headPos.y - HEAD_RADIUS * 0.62, 0.3);
    this.torso.position.set(baseX, 0, baseZ);
    this.torso.rotation.set(0, this.bodyYaw, 0);
    this.shape?.setHeight(height);

    // Tempo treibt das Pendeln der freien Hände; im Stehen hängen sie ruhig.
    this.speed += (this.travelSpeed(headPos, dt) - this.speed) * Math.min(1, dt * 8);
    this.walkPhase += dt * Math.min(this.speed, 3) * 4.4;
    const swing = Math.min(this.speed * 0.05, 0.09);

    for (let i = 0; i < 2; i++) {
      const sign = i === 0 ? -1 : 1;
      const limb = i === 0 ? left : right;
      const anchor = this.handAnchors[i]!;

      if (limb) {
        _hand.copy(limb.position);
      } else {
        // Ohne Arme gibt es nichts zu lösen: Die Hand schwebt vor dem Bauch
        // und pendelt beim Laufen, damit die Figur nicht rutscht. `cos/-sin`
        // ist die Rechte des Rumpfes, `-sin/-cos` seine Blickrichtung.
        const phase = this.walkPhase + (i === 0 ? 0 : Math.PI);
        const side = sign * HAND_SIDE;
        const ahead = HAND_FRONT + Math.sin(phase) * swing * 2.2;
        _hand.set(
          baseX + cos * side - sin * ahead,
          height * HAND_LIFT + Math.abs(Math.cos(phase)) * swing * 0.6,
          baseZ - sin * side - cos * ahead,
        );
      }

      anchor.visible = limb !== null;
      anchor.position.copy(_hand);
      if (limb?.quaternion) anchor.quaternion.copy(limb.quaternion);
      this.handMeshes[i]?.position.copy(_hand);
    }
  }

  dispose(): void {
    disposeTree(this);
    for (const material of this.kept) material.dispose();
    this.removeFromParent();
  }

  /** Baut das Gesicht neu — nur bei einem Wechsel, nicht je Bild. */
  private buildFace(kind: HeadKind): void {
    if (this.face) {
      this.face.removeFromParent();
      disposeTree(this.face, this.kept);
    }
    this.face = buildHead(kind);
    this.head.add(this.face);
    // Hände und Gesicht gehören zusammen: Es ist derselbe Mensch.
    this.skin.color.setHex(skinTone(kind));
    this.face.traverse((object) => (object.layers.mask = this.head.layers.mask));
  }

  /** Dasselbe für die Jacke. Die Anzugfarbe bleibt dabei, wo sie ist. */
  private buildTorso(kind: BodyKind): void {
    if (this.shape) {
      this.shape.group.removeFromParent();
      disposeTree(this.shape.group, this.kept);
    }
    this.shape = buildBody(kind, this.suit);
    this.torso.add(this.shape.group);
    this.shape.group.traverse((object) => (object.layers.mask = this.torso.layers.mask));
  }

  /** Horizontal speed of the head in world space — drives the walk cycle. */
  private travelSpeed(headLocal: THREE.Vector3, dt: number): number {
    this.updateMatrixWorld();
    _world.copy(headLocal).applyMatrix4(this.matrixWorld);
    if (!this.hasPrevious) {
      this.previous.set(_world.x, 0, _world.z);
      this.hasPrevious = true;
      return 0;
    }
    const distance = Math.hypot(_world.x - this.previous.x, _world.z - this.previous.z);
    this.previous.set(_world.x, 0, _world.z);
    return dt > 0 ? Math.min(distance / dt, 8) : 0;
  }
}

function wrapAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
