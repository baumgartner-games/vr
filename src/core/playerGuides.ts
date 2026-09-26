import * as THREE from 'three';
import { LAYER_SELF_ONLY } from './PlayerAvatar';
import { graphics } from './graphicsSettings';
import { beltOffset } from '../worlds/portal/beltSettings';

/**
 * **Wo die Brille hinschaut und wie groß der Mensch darunter ist** — zwei
 * Werkstattansichten aus dem Grafik-Menü, beide ab Werk aus.
 *
 * - **Quest-3-Blickfeld** (`GraphicsSettings.showVrFrustum`): Gewünscht _„den
 *   VR-Blickwinkel einer Quest 3 darstellen … wie bei Blender mit einem
 *   Kamera-Frustum, damit ich auch sehe, wo die Augen wären"_. Eine Pyramide
 *   aus Linien vom Kopf aus, so breit und hoch wie das Blickfeld der Quest 3
 *   (`QUEST3_FOV`), dazu das Dreieck über dem Rand, das in Blender „oben"
 *   heißt, und die beiden Augen als kleine Kugeln im Augenabstand.
 * - **Mensch als Boxen** (`GraphicsSettings.showBodyModel`): Gewünscht _„den
 *   Menschen visuell darstellen … einfaches Modell, Boxen"_ — und dabei
 *   _„dass der Spieler mit den Händen nach unten den Boden berühren kann (bzw.
 *   fast)"_. Die Figur ist so groß wie die echte Augenhöhe (die Kochfigur ist
 *   kleiner gerechnet, `chefFit.POSE_SCALE`), die Arme hängen bis
 *   `HAND_CLEARANCE` über den Boden, und der Gürtel liegt als Band dort, wo
 *   die Hüften hängen (`beltSettings`).
 *
 * Beide stehen auf `LAYER_SELF_ONLY` wie der eigene Körper: Von oben, im
 * Spiegel und durch ein Portal sieht man sie, aus den eigenen Augen nicht —
 * dort wäre man mitten in der Pyramide.
 *
 * Die Rechnung (`frustumCorners`, `bodyBoxes`) ist ohne Szene und hat Jest
 * daneben; die Klasse unten legt nur Linien und Kästen darauf.
 */

/**
 * **Das Blickfeld der Quest 3**, in Grad — beide Augen zusammen, so wie Meta
 * es angibt: 110° waagerecht, 96° senkrecht.
 */
export const QUEST3_FOV = { horizontal: 110, vertical: 96 } as const;

/** Der Augenabstand, mit dem die Quest 3 ausgeliefert wird, in Metern. */
export const QUEST3_IPD = 0.063;

/**
 * **Wie weit die Pyramide reicht**, in Metern — so lang wie ein Arm, damit
 * sie von oben zu sehen ist und trotzdem nicht durch den halben Raum ragt
 * (in Blender heißt das „Display Size").
 */
export const FRUSTUM_LENGTH = 1.2;

/** Wie weit die Hände über dem Boden hängen, in Metern — _„bzw. fast"_. */
export const HAND_CLEARANCE = 0.05;

/** Die Augen stehen bei rund 0,93 der Körpergröße (`beltSettings.DEFAULT_BELT`). */
const EYE_SHARE = 0.93;

/** Ein Punkt im Raum des Kopfes: x rechts, y oben, −z vorn — wie jede Kamera. */
export interface GuidePoint {
  x: number;
  y: number;
  z: number;
}

/**
 * **Die vier Ecken des fernen Rands der Pyramide**, im Raum des Kopfes — in
 * der Reihenfolge oben links, oben rechts, unten rechts, unten links.
 */
export function frustumCorners(
  length = FRUSTUM_LENGTH,
  fov: { horizontal: number; vertical: number } = QUEST3_FOV,
): GuidePoint[] {
  const halfW = Math.tan(THREE.MathUtils.degToRad(fov.horizontal) / 2) * length;
  const halfH = Math.tan(THREE.MathUtils.degToRad(fov.vertical) / 2) * length;
  return [
    { x: -halfW, y: halfH, z: -length },
    { x: halfW, y: halfH, z: -length },
    { x: halfW, y: -halfH, z: -length },
    { x: -halfW, y: -halfH, z: -length },
  ];
}

/** Ein Kasten des Box-Menschen: Mitte und Maße, im Raum der Figur (Füße bei 0). */
export interface BodyBox {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

/**
 * **Der Mensch aus Kästen** für eine Augenhöhe (Meter über den Füßen) — die
 * Figur schaut nach −Z, rechts ist +X.
 *
 * Maße nach den üblichen Anteilen der Körpergröße: Kopf ein Achtel, Schultern
 * bei 0,82, Schritt bei 0,47. Nur die Arme weichen mit Absicht davon ab: Sie
 * reichen bis `HAND_CLEARANCE` über den Boden, wie gewünscht.
 */
export function bodyBoxes(eye: number, beltShare = beltOffset().height): BodyBox[] {
  const tall = Math.max(0.5, eye) / EYE_SHARE;
  const s = tall / 1.75;
  const headH = tall / 8;
  const top = tall;
  const shoulder = tall * 0.82;
  const crotch = tall * 0.47;
  const neckTop = top - headH;
  const torsoW = 0.36 * s;
  const armW = 0.09 * s;
  const armX = torsoW / 2 + armW / 2 + 0.01 * s;
  const handH = 0.18 * s;
  const handBottom = HAND_CLEARANCE;
  const armBottom = handBottom + handH;
  const legW = 0.14 * s;
  const belt = eye * beltShare;
  return [
    { name: 'head', x: 0, y: top - headH / 2, z: 0, w: 0.16 * s, h: headH, d: 0.2 * s },
    {
      name: 'neck',
      x: 0,
      y: (neckTop + shoulder) / 2,
      z: 0,
      w: 0.1 * s,
      h: Math.max(0.01, neckTop - shoulder),
      d: 0.1 * s,
    },
    {
      name: 'torso',
      x: 0,
      y: (shoulder + crotch) / 2,
      z: 0,
      w: torsoW,
      h: shoulder - crotch,
      d: 0.2 * s,
    },
    { name: 'belt', x: 0, y: belt, z: 0, w: torsoW + 0.04 * s, h: 0.05 * s, d: 0.24 * s },
    ...(['left', 'right'] as const).flatMap((side) => {
      const sign = side === 'right' ? 1 : -1;
      return [
        {
          name: `arm-${side}`,
          x: sign * armX,
          y: (shoulder + armBottom) / 2,
          z: 0,
          w: armW,
          h: shoulder - armBottom,
          d: armW,
        },
        {
          name: `hand-${side}`,
          x: sign * armX,
          y: handBottom + handH / 2,
          z: 0,
          w: armW * 1.1,
          h: handH,
          d: armW * 1.4,
        },
        {
          name: `leg-${side}`,
          x: sign * (legW / 2 + 0.01 * s),
          y: crotch / 2,
          z: 0,
          w: legW,
          h: crotch,
          d: 0.16 * s,
        },
      ];
    }),
  ];
}

/** Die Farbe der Pyramide — Blender zeichnet seine Kamera ebenso hell auf dunkel. */
const FRUSTUM_COLOR = 0xffc640;
const EYE_COLORS = { left: 0x4aa3ff, right: 0xff5a5a } as const;
const BODY_COLOR = 0x8fd0ff;
const BELT_COLOR = 0xffa040;

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * **Beide Ansichten als Netze** — einmal angelegt, jedes Bild an den Kopf
 * gestellt und nach dem Menü ein- und ausgeblendet.
 */
export class PlayerGuides extends THREE.Group {
  private readonly frustum = new THREE.Group();
  private readonly body = new THREE.Group();
  private readonly head = new THREE.Group();
  private bodyEye = 0;
  private bodyBelt = 0;
  private readonly bodyMaterial = new THREE.MeshBasicMaterial({
    color: BODY_COLOR,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  private readonly beltMaterial = new THREE.MeshBasicMaterial({ color: BELT_COLOR });
  private readonly edgeMaterial = new THREE.LineBasicMaterial({ color: 0x1b4a73 });
  private readonly owned: Array<{ dispose(): void }> = [];

  constructor() {
    super();
    this.name = 'player-guides';
    this.buildFrustum();
    this.add(this.frustum, this.body);
    this.body.add(this.head);
    this.frustum.visible = false;
    this.body.visible = false;
  }

  /**
   * Jedes Bild: `head` ist die Pose des Kopfes in der Welt, `floorY` die Höhe
   * der Füße (`PlayerRig.getFloorY`).
   */
  update(head: THREE.Matrix4, floorY: number): void {
    const settings = graphics();
    this.frustum.visible = settings.showVrFrustum;
    this.body.visible = settings.showBodyModel;
    if (!settings.showVrFrustum && !settings.showBodyModel) return;
    head.decompose(_pos, _quat, _scale);
    if (settings.showVrFrustum) {
      this.frustum.position.copy(_pos);
      this.frustum.quaternion.copy(_quat);
    }
    if (settings.showBodyModel) {
      const eye = _pos.y - floorY;
      const belt = beltOffset().height;
      if (Math.abs(eye - this.bodyEye) > 0.01 || belt !== this.bodyBelt) this.buildBody(eye, belt);
      _euler.setFromQuaternion(_quat);
      this.body.position.set(_pos.x, floorY, _pos.z);
      this.body.rotation.set(0, _euler.y, 0);
      // Der Kopf nickt mit, der Rumpf nicht.
      this.head.rotation.set(_euler.x, 0, 0);
    }
    this.updateMatrixWorld(true);
  }

  dispose(): void {
    this.clearBody();
    for (const item of this.owned) item.dispose();
    this.owned.length = 0;
    this.bodyMaterial.dispose();
    this.beltMaterial.dispose();
    this.edgeMaterial.dispose();
    this.removeFromParent();
  }

  private buildFrustum(): void {
    const corners = frustumCorners().map((c) => new THREE.Vector3(c.x, c.y, c.z));
    const [tl, tr, br, bl] = corners as [
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
      THREE.Vector3,
    ];
    const apex = new THREE.Vector3();
    // Das Dreieck über der Oberkante sagt, wo oben ist — wie in Blender.
    const width = tr.x - tl.x;
    const up = new THREE.Vector3(0, tl.y + width * 0.12, tl.z);
    const upL = new THREE.Vector3(-width * 0.12, tl.y + 0.01, tl.z);
    const upR = new THREE.Vector3(width * 0.12, tl.y + 0.01, tl.z);
    const points = [
      apex,
      tl,
      apex,
      tr,
      apex,
      br,
      apex,
      bl,
      tl,
      tr,
      tr,
      br,
      br,
      bl,
      bl,
      tl,
      upL,
      up,
      up,
      upR,
      upR,
      upL,
      // Die Blickachse, kürzer als der Rand.
      apex,
      new THREE.Vector3(0, 0, tl.z * 0.5),
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: FRUSTUM_COLOR,
      depthTest: false,
      transparent: true,
    });
    this.owned.push(geometry, material);
    const lines = new THREE.LineSegments(geometry, material);
    lines.renderOrder = 999;
    this.frustum.add(lines);

    const eyeShape = new THREE.SphereGeometry(0.012, 12, 8);
    this.owned.push(eyeShape);
    for (const side of ['left', 'right'] as const) {
      const material = new THREE.MeshBasicMaterial({
        color: EYE_COLORS[side],
        depthTest: false,
        transparent: true,
      });
      this.owned.push(material);
      const eye = new THREE.Mesh(eyeShape, material);
      eye.position.set(((side === 'right' ? 1 : -1) * QUEST3_IPD) / 2, 0, 0);
      eye.renderOrder = 1000;
      this.frustum.add(eye);
    }
    this.frustum.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
  }

  private clearBody(): void {
    for (const group of [this.body, this.head]) {
      for (const child of [...group.children]) {
        if (child === this.head) continue;
        group.remove(child);
        child.traverse((node) => {
          const geo = (node as THREE.Mesh | THREE.LineSegments).geometry as
            THREE.BufferGeometry | undefined;
          geo?.dispose();
        });
      }
    }
  }

  private buildBody(eye: number, belt: number): void {
    this.clearBody();
    this.bodyEye = eye;
    this.bodyBelt = belt;
    for (const box of bodyBoxes(eye, belt)) {
      const shape = new THREE.BoxGeometry(box.w, box.h, box.d);
      const mesh = new THREE.Mesh(
        shape,
        box.name === 'belt' ? this.beltMaterial : this.bodyMaterial,
      );
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(shape), this.edgeMaterial);
      mesh.add(edges);
      mesh.name = `body-${box.name}`;
      if (box.name === 'head') {
        // Der Kopf dreht um die Augen, nicht um seine Mitte.
        this.head.position.set(0, eye, 0);
        mesh.position.set(box.x, box.y - eye, box.z);
        this.head.add(mesh);
      } else {
        mesh.position.set(box.x, box.y, box.z);
        this.body.add(mesh);
      }
    }
    this.body.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
  }
}
