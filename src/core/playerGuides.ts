import * as THREE from 'three';
import { LAYER_SELF_ONLY } from './PlayerAvatar';
import { graphics } from './graphicsSettings';
import { QUEST_VIEW, type Outline } from './questView';
import { beltOffset } from '../worlds/portal/beltSettings';

/**
 * **Wo die Brille hinschaut und wie groß der Mensch darunter ist** — zwei
 * Werkstattansichten aus dem Grafik-Menü, beide ab Werk aus.
 *
 * - **Quest-3-Blickfeld** (`GraphicsSettings.showVrFrustum`): Gewünscht _„den
 *   VR-Blickwinkel einer Quest 3 darstellen … wie bei Blender mit einem
 *   Kamera-Frustum, damit ich auch sehe, wo die Augen wären"_. Zuerst eine
 *   eckige Pyramide aus Metas 110° × 96°; seit dem Kalibrieren
 *   (`core/questView.ts`) ein **gerundeter Kegel** aus dem eingestellten Rand
 *   (`QUEST_VIEW`) — _„Ich will dann diesen ‚kegel' der gerundet ist in der
 *   welt sehen, statt der einfachen eckigen kamera perspektive."_ Rand,
 *   Strahlen, eine leicht getönte Haut, das Dreieck über dem Rand, das in
 *   Blender „oben" heißt, und die beiden Augen als kleine Kugeln.
 * - **Sichtfeld hervorheben** (`GraphicsSettings.highlightView`): _„wie bei
 *   der Taschenlampe der bereich etwas hervorgehoben …, sodass man leicht
 *   erkennen kann von oben, was der spieler sehen würde"_. Ein Spotlicht vom
 *   Kopf aus, als runder Kegel genähert (`viewCone`) und um die gefühlte
 *   Null gesenkt.
 * - **Mensch als Boxen** (`GraphicsSettings.showBodyModel`): Gewünscht _„den
 *   Menschen visuell darstellen … einfaches Modell, Boxen"_ — und dabei
 *   _„dass der Spieler mit den Händen nach unten den Boden berühren kann (bzw.
 *   fast)"_. Die Figur ist so groß wie die echte Augenhöhe (die Kochfigur ist
 *   kleiner gerechnet, `chefFit.POSE_SCALE`), die Arme hängen bis
 *   `HAND_CLEARANCE` über den Boden, und der Gürtel liegt als Band dort, wo
 *   die Hüften hängen (`beltSettings`).
 *
 * Alle stehen auf `LAYER_SELF_ONLY` wie der eigene Körper: Von oben, im
 * Spiegel und durch ein Portal sieht man sie, aus den eigenen Augen nicht —
 * dort wäre man mitten im Kegel. Das gilt auch für das Licht: three.js nimmt
 * ein Licht nur in Bilder, deren Kamera seine Ebene sieht.
 *
 * Die Rechnung (`viewRim`, `viewCone`, `bodyBoxes`) ist ohne Szene und hat
 * Jest daneben; die Klasse unten legt nur Linien, Kästen und Licht darauf.
 */

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

const DEG = Math.PI / 180;

/**
 * **Eine Richtung des Sichtfelds** als Einheitsvektor im Raum des Kopfes —
 * `azimuth` und `elevation` in Grad wie am Gradnetz (`questView`): Auf der
 * Bildebene einen Meter vorn liegt sie bei `tan(az)` und `tan(el) / cos(az)`,
 * genau wie in `questView.viewFrustum`.
 */
export function viewDirection(azimuth: number, elevation: number): GuidePoint {
  const az = azimuth * DEG;
  const el = elevation * DEG;
  return { x: Math.cos(el) * Math.sin(az), y: Math.sin(el), z: -Math.cos(el) * Math.cos(az) };
}

/**
 * **Der ferne Rand des Kegels**, im Raum des Kopfes: der eingestellte Rand
 * der Quest 3 (`QUEST_VIEW`), jede Kante in `steps` Stücke geteilt und jeder
 * Punkt `length` Meter vom Auge — der Rand liegt auf einer Kugel, deshalb ist
 * der Kegel vorn rund und nicht flach wie eine Pyramide.
 */
export function viewRim(
  length = FRUSTUM_LENGTH,
  shape: Outline = QUEST_VIEW,
  steps = 4,
): GuidePoint[] {
  const out: GuidePoint[] = [];
  for (let i = 0; i < shape.length; i++) {
    const [a0, e0] = shape[i]!;
    const [a1, e1] = shape[(i + 1) % shape.length]!;
    if (a0 === a1 && e0 === e1) continue;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const dir = viewDirection(a0 + (a1 - a0) * t, e0 + (e1 - e0) * t);
      out.push({ x: dir.x * length, y: dir.y * length, z: dir.z * length });
    }
  }
  return out;
}

/**
 * **Das Sichtfeld als runder Kegel genähert** — für das Licht, das nur runde
 * Kegel kennt. `pitch` ist die Mitte zwischen oberem und unterem Rand (die
 * gefühlte Null), `halfWidth` und `halfHeight` die halben Öffnungen, `angle`
 * ihr Mittel: so weit reicht der Lichtkegel um seine Achse.
 */
export interface ViewCone {
  readonly pitch: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly angle: number;
}

export function viewCone(shape: Outline = QUEST_VIEW): ViewCone {
  const els = shape.map(([, el]) => el);
  const top = Math.max(...els);
  const bottom = Math.min(...els);
  const halfWidth = Math.max(...shape.map(([az]) => Math.abs(az)));
  const halfHeight = (top - bottom) / 2;
  return {
    pitch: (top + bottom) / 2,
    halfWidth,
    halfHeight,
    angle: (halfWidth + halfHeight) / 2,
  };
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

/** Die Farbe des Kegels — Blender zeichnet seine Kamera ebenso hell auf dunkel. */
const FRUSTUM_COLOR = 0xffc640;
/** Wie viele Strahlen vom Auge zum Rand laufen — gleichmäßig rundherum. */
const RAY_COUNT = 12;
/** Das Licht fürs Hervorheben: warm wie die Taschenlampe, aber schwächer. */
const HIGHLIGHT_COLOR = 0xfff1cf;
const HIGHLIGHT_INTENSITY = 9;
const HIGHLIGHT_RANGE = 14;
const HIGHLIGHT_DECAY = 0.7;
/** Der weiche Saum des Lichtkegels, als Anteil seines Winkels. */
const HIGHLIGHT_PENUMBRA = 0.18;
const EYE_COLORS = { left: 0x4aa3ff, right: 0xff5a5a } as const;
const BODY_COLOR = 0x8fd0ff;
const BELT_COLOR = 0xffa040;

const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');

/**
 * **Die Ansichten als Netze und Licht** — einmal angelegt, jedes Bild an den
 * Kopf gestellt und nach dem Menü ein- und ausgeblendet.
 */
export class PlayerGuides extends THREE.Group {
  private readonly frustum = new THREE.Group();
  private readonly highlight = new THREE.Group();
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
    this.buildHighlight();
    this.add(this.frustum, this.highlight, this.body);
    this.body.add(this.head);
    this.frustum.visible = false;
    this.highlight.visible = false;
    this.body.visible = false;
  }

  /**
   * Jedes Bild: `head` ist die Pose des Kopfes in der Welt, `floorY` die Höhe
   * der Füße (`PlayerRig.getFloorY`).
   */
  update(head: THREE.Matrix4, floorY: number): void {
    const settings = graphics();
    this.frustum.visible = settings.showVrFrustum;
    this.highlight.visible = settings.highlightView;
    this.body.visible = settings.showBodyModel;
    if (!settings.showVrFrustum && !settings.highlightView && !settings.showBodyModel) return;
    head.decompose(_pos, _quat, _scale);
    if (settings.showVrFrustum) {
      this.frustum.position.copy(_pos);
      this.frustum.quaternion.copy(_quat);
    }
    if (settings.highlightView) {
      this.highlight.position.copy(_pos);
      this.highlight.quaternion.copy(_quat);
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
    const rim = viewRim().map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const apex = new THREE.Vector3();
    const points: THREE.Vector3[] = [];
    // Der Rand, rundherum.
    rim.forEach((point, i) => points.push(point, rim[(i + 1) % rim.length]!));
    // Strahlen vom Auge, gleichmäßig um die Mitte des Kegels verteilt: je
    // Richtung der Randpunkt, der ihr am nächsten liegt.
    const cone = viewCone();
    const center = viewDirection(0, cone.pitch);
    const centerVec = new THREE.Vector3(center.x, center.y, center.z);
    const around = (p: THREE.Vector3): number => {
      // Winkel um die Achse des Kegels: rechts 0, oben π/2.
      const rel = p.clone().normalize().sub(centerVec);
      const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(
        new THREE.Vector3(1, 0, 0),
        cone.pitch * DEG,
      );
      return Math.atan2(rel.dot(up), rel.x);
    };
    const angles = rim.map(around);
    for (let k = 0; k < RAY_COUNT; k++) {
      const want = -Math.PI + (k / RAY_COUNT) * Math.PI * 2;
      let best = 0;
      let bestGap = Infinity;
      angles.forEach((angle, i) => {
        const gap = Math.abs(Math.atan2(Math.sin(angle - want), Math.cos(angle - want)));
        if (gap < bestGap) {
          bestGap = gap;
          best = i;
        }
      });
      points.push(apex, rim[best]!);
    }
    // Das Dreieck über dem obersten Punkt sagt, wo oben ist — wie in Blender.
    const top = rim.reduce((a, b) => (b.y > a.y ? b : a));
    const width = Math.max(...rim.map((p) => p.x)) * 2;
    const up = new THREE.Vector3(0, top.y + width * 0.12, top.z);
    const upL = new THREE.Vector3(-width * 0.12, top.y + 0.01, top.z);
    const upR = new THREE.Vector3(width * 0.12, top.y + 0.01, top.z);
    points.push(upL, up, up, upR, upR, upL);
    // Die Blickachse durch die gefühlte Null, kürzer als der Rand.
    points.push(apex, centerVec.clone().multiplyScalar(FRUSTUM_LENGTH * 0.5));

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

    // Die Haut des Kegels: ein Fächer vom Auge zum Rand, kaum getönt.
    const skin: number[] = [];
    rim.forEach((point, i) => {
      const next = rim[(i + 1) % rim.length]!;
      skin.push(0, 0, 0, point.x, point.y, point.z, next.x, next.y, next.z);
    });
    const skinGeometry = new THREE.BufferGeometry();
    skinGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skin, 3));
    const skinMaterial = new THREE.MeshBasicMaterial({
      color: FRUSTUM_COLOR,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.owned.push(skinGeometry, skinMaterial);
    const skinMesh = new THREE.Mesh(skinGeometry, skinMaterial);
    skinMesh.renderOrder = 998;
    this.frustum.add(skinMesh);

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

  /**
   * **Das Licht, das den Blick hervorhebt** — ein Spot vom Kopf aus, auf die
   * gefühlte Null gesenkt. An der Wand hört es auf, wenn die Grafik Schatten
   * zeichnet (dieselbe Einstellung wie bei der Taschenlampe,
   * `shared/wallLight.ts`); sonst kostet die Schattenkarte nichts.
   */
  private buildHighlight(): void {
    const cone = viewCone();
    const light = new THREE.SpotLight(
      HIGHLIGHT_COLOR,
      HIGHLIGHT_INTENSITY,
      HIGHLIGHT_RANGE,
      cone.angle * DEG,
      HIGHLIGHT_PENUMBRA,
      HIGHLIGHT_DECAY,
    );
    light.name = 'view-highlight';
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.02;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.updateProjectionMatrix();
    const aim = viewDirection(0, cone.pitch);
    light.target.position.set(aim.x, aim.y, aim.z);
    this.highlight.add(light, light.target);
    this.owned.push(light);
    this.highlight.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
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
