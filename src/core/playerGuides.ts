import * as THREE from 'three';
import { LAYER_SELF_ONLY } from './PlayerAvatar';
import { graphics } from './graphicsSettings';
import { QUEST_VIEW, inside, type Outline } from './questView';
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
 *   welt sehen, statt der einfachen eckigen kamera perspektive."_ Er reicht
 *   weit (`VIEW_REACH`), damit man sieht, bis wohin der Blick geht: ferner
 *   Rand, Strahlen, eine leicht getönte Haut; am Kopf ein naher Ring mit dem
 *   Dreieck, das in Blender „oben" heißt, und die Augen als kleine Kugeln.
 * - **Sichtfeld hervorheben** (`GraphicsSettings.highlightView`): _„wie bei
 *   der Taschenlampe der bereich etwas hervorgehoben …, sodass man leicht
 *   erkennen kann von oben, was der spieler sehen würde"_. Ein Spotlicht vom
 *   Kopf aus, um die gefühlte Null gesenkt (`viewCone`) und durch eine Maske
 *   genau in die Form des Sichtfelds geschnitten (`viewMask`).
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
 * Die Rechnung (`viewRim`, `viewCone`, `viewMask`, `bodyBoxes`) ist ohne
 * Szene; die Klasse unten legt nur Linien, Kästen und Licht darauf.
 */

/** Der Augenabstand, mit dem die Quest 3 ausgeliefert wird, in Metern. */
export const QUEST3_IPD = 0.063;

/**
 * **Der nahe Ring**, in Metern — so weit wie ein Arm (in Blender heißt das
 * „Display Size"). Dort sitzen das Dreieck für oben und die Blickachse.
 */
export const FRUSTUM_LENGTH = 1.2;

/**
 * **Wie weit der Kegel reicht**, in Metern. Zuerst endete er am nahen Ring;
 * gewünscht: _„können wir den sicht kegel wesentlich weiter laufen lassen, so
 * erkenne ich ja gar nicht, bis wohin der spieler sehen würde"_. Seine Linien
 * haben Tiefenprüfung: Was hinter Boden und Wand liegt, verschwindet dort.
 */
export const VIEW_REACH = 10;

/** Kantenlänge der Maske, die das Licht in die Form des Sichtfelds schneidet. */
export const MASK_SIZE = 256;

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
 * **Die Achse des Lichts und wie weit es reichen muss.** `pitch` ist die
 * Mitte zwischen oberem und unterem Rand (die gefühlte Null), `halfWidth`
 * und `halfHeight` die halben Öffnungen. Ein Spot kennt nur runde Kegel;
 * `angle` ist deshalb so weit, dass er den ganzen Rand umschließt, und die
 * Form schneidet die Maske hinein (`viewMask`).
 */
export interface ViewCone {
  readonly pitch: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly angle: number;
}

/** Wie viel weiter der runde Lichtkegel ist als die äußerste Ecke, in Grad. */
const CONE_MARGIN = 3;

export function viewCone(shape: Outline = QUEST_VIEW): ViewCone {
  const els = shape.map(([, el]) => el);
  const top = Math.max(...els);
  const bottom = Math.min(...els);
  const pitch = (top + bottom) / 2;
  const axis = viewDirection(0, pitch);
  const widest = Math.max(
    ...shape.map(([az, el]) => {
      const d = viewDirection(az, el);
      return Math.acos(Math.min(1, d.x * axis.x + d.y * axis.y + d.z * axis.z)) / DEG;
    }),
  );
  return {
    pitch,
    halfWidth: Math.max(...shape.map(([az]) => Math.abs(az))),
    halfHeight: (top - bottom) / 2,
    angle: widest + CONE_MARGIN,
  };
}

/**
 * **Wo eine Richtung auf der Maske liegt**, als Bildpunkt `[spalte, zeile]`
 * (Zeile 0 unten, wie three.js eine Textur ohne `flipY` liest). Die Maske
 * ist das Bild der Schattenkamera des Spots: Sie schaut die Achse entlang,
 * oben ist oben am Kopf, und ihr Blickwinkel ist zweimal `cone.angle`.
 */
export function maskCoord(
  azimuth: number,
  elevation: number,
  cone: ViewCone = viewCone(),
  size = MASK_SIZE,
): [number, number] {
  const d = viewDirection(azimuth, elevation);
  // Um die Senkung der Achse zurückdrehen: dann schaut das Licht nach −Z.
  const a = -cone.pitch * DEG;
  const y = d.y * Math.cos(a) - d.z * Math.sin(a);
  const z = d.y * Math.sin(a) + d.z * Math.cos(a);
  const t = Math.tan(cone.angle * DEG);
  const u = 0.5 + (0.5 * d.x) / -z / t;
  const v = 0.5 + (0.5 * y) / -z / t;
  return [Math.floor(u * size), Math.floor(v * size)];
}

/**
 * **Die Maske des Lichts** — weiß, wo der Spieler etwas sieht, schwarz
 * daneben, als RGBA-Bytes `size × size`. Gewünscht: _„das licht soll nur in
 * diesem kegel sein, also auch nur das beleuchten, was der spieler sehen
 * würde"_. Jeder Bildpunkt wird in seine Richtung zurückgerechnet und gegen
 * den eingestellten Rand geprüft (`questView.inside`).
 */
export function viewMask(
  shape: Outline = QUEST_VIEW,
  cone: ViewCone = viewCone(shape),
  size = MASK_SIZE,
): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const t = Math.tan(cone.angle * DEG);
  const a = cone.pitch * DEG;
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = ((i + 0.5) / size) * 2 - 1;
      const yl = ((j + 0.5) / size) * 2 - 1;
      // Richtung im Raum des Lichts, dann um die Senkung zum Kopf gedreht.
      const dx = x * t;
      const dy0 = yl * t;
      const dz0 = -1;
      const dy = dy0 * Math.cos(a) - dz0 * Math.sin(a);
      const dz = dy0 * Math.sin(a) + dz0 * Math.cos(a);
      const len = Math.hypot(dx, dy, dz);
      const az = Math.atan2(dx, -dz) / DEG;
      const el = Math.asin(dy / len) / DEG;
      const value = inside(shape, az, el) ? 255 : 0;
      const k = (j * size + i) * 4;
      data[k] = data[k + 1] = data[k + 2] = value;
      data[k + 3] = 255;
    }
  }
  return data;
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
const HIGHLIGHT_INTENSITY = 7;
const HIGHLIGHT_RANGE = VIEW_REACH * 2;
const HIGHLIGHT_DECAY = 0.5;
/**
 * Der Saum des runden Lichtkegels, als Anteil seines Winkels — nur so viel,
 * dass three.js rechnen kann (bei 0 wäre sein `smoothstep` undefiniert). Die
 * Form macht die Maske, und deren Rand liegt innerhalb.
 */
const HIGHLIGHT_PENUMBRA = 0.02;
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
  private readonly spot: THREE.SpotLight;
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
    this.spot = this.buildHighlight();
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
      // Die Schattenkamera trägt die Maske; ihr Oben ist das Oben des Kopfes,
      // sonst kippte die Form nicht mit, wenn man den Kopf neigt.
      this.spot.shadow.camera.up.set(0, 1, 0).applyQuaternion(_quat);
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
    const rim = viewRim(VIEW_REACH).map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const near = viewRim(FRUSTUM_LENGTH).map((p) => new THREE.Vector3(p.x, p.y, p.z));
    const apex = new THREE.Vector3();
    const ring = (points: THREE.Vector3[], line: THREE.Vector3[]): void =>
      line.forEach((point, i) => points.push(point, line[(i + 1) % line.length]!));

    // **Der lange Kegel**: ferner Rand und Strahlen, mit Tiefenprüfung — wo
    // ein Strahl im Boden oder in der Wand verschwindet, endet der Blick.
    const far: THREE.Vector3[] = [];
    ring(far, rim);
    // Strahlen vom Auge, gleichmäßig um die Mitte des Kegels verteilt: je
    // Richtung der Randpunkt, der ihr am nächsten liegt.
    const cone = viewCone();
    const center = viewDirection(0, cone.pitch);
    const centerVec = new THREE.Vector3(center.x, center.y, center.z);
    const coneUp = new THREE.Vector3(0, 1, 0).applyAxisAngle(
      new THREE.Vector3(1, 0, 0),
      cone.pitch * DEG,
    );
    const angles = rim.map((p) => {
      // Winkel um die Achse des Kegels: rechts 0, oben π/2.
      const rel = p.clone().normalize().sub(centerVec);
      return Math.atan2(rel.dot(coneUp), rel.x);
    });
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
      far.push(apex, rim[best]!);
    }

    // **Am Kopf**: der nahe Ring, das Dreieck über seinem obersten Punkt (in
    // Blender heißt es „oben") und die Blickachse — ohne Tiefenprüfung, damit
    // sie der eigene Körper nicht verdeckt.
    const close: THREE.Vector3[] = [];
    ring(close, near);
    const top = near.reduce((a, b) => (b.y > a.y ? b : a));
    const width = Math.max(...near.map((p) => p.x)) * 2;
    const up = new THREE.Vector3(0, top.y + width * 0.12, top.z);
    const upL = new THREE.Vector3(-width * 0.12, top.y + 0.01, top.z);
    const upR = new THREE.Vector3(width * 0.12, top.y + 0.01, top.z);
    close.push(upL, up, up, upR, upR, upL);
    close.push(apex, centerVec.clone().multiplyScalar(FRUSTUM_LENGTH));

    for (const [points, depthTest] of [
      [far, true],
      [close, false],
    ] as const) {
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: FRUSTUM_COLOR,
        depthTest,
        transparent: true,
      });
      this.owned.push(geometry, material);
      const lines = new THREE.LineSegments(geometry, material);
      lines.renderOrder = 999;
      lines.frustumCulled = false;
      this.frustum.add(lines);
    }

    // Die Haut des Kegels: ein Fächer vom Auge zum fernen Rand, kaum getönt.
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
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.owned.push(skinGeometry, skinMaterial);
    const skinMesh = new THREE.Mesh(skinGeometry, skinMaterial);
    skinMesh.renderOrder = 998;
    skinMesh.frustumCulled = false;
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
   * gefühlte Null gesenkt, durch eine Maske in die Form des Sichtfelds
   * geschnitten (`viewMask`, `SpotLight.map`): Was der Spieler nicht sähe,
   * bleibt dunkel. An der Wand hört es auf, wenn die Grafik Schatten zeichnet
   * (_Schatten voll_, wie bei der Taschenlampe, `shared/wallLight.ts`); sonst
   * kostet die Schattenkarte nichts, und das Licht geht durch Wände.
   */
  private buildHighlight(): THREE.SpotLight {
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
    const mask = new THREE.DataTexture(viewMask(QUEST_VIEW, cone), MASK_SIZE, MASK_SIZE);
    mask.magFilter = THREE.LinearFilter;
    mask.minFilter = THREE.LinearFilter;
    mask.needsUpdate = true;
    light.map = mask;
    light.castShadow = true;
    light.shadow.mapSize.set(512, 512);
    light.shadow.bias = -0.002;
    light.shadow.normalBias = 0.02;
    light.shadow.camera.near = 0.1;
    light.shadow.camera.updateProjectionMatrix();
    const aim = viewDirection(0, cone.pitch);
    light.target.position.set(aim.x, aim.y, aim.z);
    this.highlight.add(light, light.target);
    this.owned.push(light, mask);
    this.highlight.traverse((object) => object.layers.set(LAYER_SELF_ONLY));
    return light;
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
