import * as THREE from 'three';

/**
 * **Der Handschuh als ein Stück Stoff.**
 *
 * Die erste Fassung des Handschuhs war die Boxhand in dicker: Kapseln als
 * Finger, Kugeln an den Gelenken, ein Ring am Handgelenk — und sah genau so
 * aus, nämlich zusammengesetzt. Ein Handschuh ist aber *eine* Form: die
 * Handfläche läuft in die Manschette aus, die Finger wachsen aus ihr heraus,
 * und wo sich ein Finger biegt, wirft der Stoff eine Falte statt zwei
 * Zylinder gegeneinanderzustellen.
 *
 * Also ein einziges **gehäutetes Netz** (`SkinnedMesh`) am Skelett der Hand:
 *
 * - die **Handfläche** als Loft aus Ellipsen entlang der Handachse (Z), von
 *   der Manschette hinten — sie ist nichts als eine Aufweitung des Lofts — bis
 *   zur abgerundeten Vorderkante an den Knöcheln; sie hängt ganz am
 *   Wurzelknochen und bewegt sich mit der Hand;
 * - jeder **Finger** als durchgehende Röhre vom Ansatz *in* der Handfläche bis
 *   zur runden Kuppe, deren Ringe zwischen den beiden Knochen des Fingers
 *   **gewichtet** sind: vor dem Mittelgelenk gehören sie dem ersten, dahinter
 *   dem zweiten, und um das Gelenk herum beiden — so biegt sich die Röhre
 *   weich, wo die Boxhand knickt.
 *
 * Das Skelett ist dasselbe wie das der Boxhand (`HandVisuals.ts`): dieselben
 * Gelenke an denselben Stellen, dieselbe Fingerspitze. Der Handschuh ist nur
 * das Kleid darüber; jede Haltung und jede gerechnete Faust gilt unverändert.
 *
 * Gebaut wird in der **Ruhelage** (alle Finger gestreckt): die Knochen stehen
 * dann dort, wo sie gebaut sind, und `Skeleton` merkt sich daraus, wie jeder
 * Punkt zu seinem Knochen liegt. Der Aufrufer sorgt dafür, dass die
 * Weltmatrizen der Knochen dafür frisch sind.
 */

/** Ein Finger: seine zwei Knochen, deren Längen, und wie dick der Stoff darum ist. */
export interface GloveFinger {
  bones: readonly [THREE.Bone, THREE.Bone];
  lengths: readonly [number, number];
  radius: number;
}

/** Ein Ring des Handflächen-Lofts: wo er auf Z liegt, und die Halbachsen der Ellipse. */
interface PalmRing {
  z: number;
  /** Halbe Breite (quer, X). */
  w: number;
  /** Halbe Dicke (Y). */
  h: number;
  /** Versatz der Ringmitte in Y — der Handrücken wölbt sich, die Fläche bleibt flach. */
  y?: number;
}

/**
 * Das Profil der Handfläche, von hinten (Manschette) nach vorn (Knöchel).
 *
 * Die Zahlen sind die der Boxhand — 7,5 cm breit, 2,8 cm dick, 9 cm lang um
 * einen Zentimeter nach vorn gerückt —, nur als Stoff: hinten die Manschette
 * als Aufweitung, dazwischen das schmale Handgelenk, vorn die breiteste Stelle
 * an den Knöcheln und eine Rundung, aus der die Finger kommen.
 */
const PALM: readonly PalmRing[] = [
  { z: 0.066, w: 0.043, h: 0.0235 },
  { z: 0.052, w: 0.044, h: 0.024 },
  { z: 0.047, w: 0.034, h: 0.0175 },
  { z: 0.036, w: 0.0315, h: 0.0155 },
  { z: 0.02, w: 0.0335, h: 0.0155 },
  { z: 0.0, w: 0.037, h: 0.016 },
  { z: -0.02, w: 0.0395, h: 0.0158 },
  { z: -0.036, w: 0.041, h: 0.0148 },
  { z: -0.047, w: 0.0415, h: 0.0125 },
  { z: -0.054, w: 0.038, h: 0.0085 },
  { z: -0.0585, w: 0.03, h: 0.004 },
];
/**
 * **Die drei Striche auf dem Handrücken.**
 *
 * Der Handschuh, den jeder kennt — Micky, Rayman, Master Hand —, hat sie: drei
 * dunkle Abnäher, die von den Knöcheln zum Handgelenk laufen und dabei ein
 * wenig zusammenlaufen. Sie sind das, woran man einen gezeichneten Handschuh
 * überhaupt als Handschuh erkennt; ohne sie ist eine weiße Hand eine weiße
 * Hand.
 *
 * Gebaut werden sie als drei dünne Schnüre **auf** der Fläche des Lofts: für
 * jeden Punkt wird der Halbmesser der Ellipse an dieser Stelle ausgerechnet
 * und ein knapper Millimeter daraufgelegt. Damit liegen sie auf der Wölbung
 * und nicht als drei gerade Stäbe darüber.
 */
const SEAM_COLOR = 0x1b2130;
const SEAM_RADIUS = 0.0018;
/** Wie weit die äußeren beiden an den Knöcheln auseinanderliegen. */
const SEAM_SPREAD = 0.017;
/** Und wie weit sie zum Handgelenk hin zusammenlaufen. */
const SEAM_TAPER = 0.45;
/** Von den Knöcheln bis kurz vor die Manschette. */
const SEAM_FROM = -0.048;
const SEAM_TO = 0.026;
const SEAM_STEPS = 8;

/**
 * Das Material der Striche — **geteilt**, und zwar je Durchsichtigkeit eines.
 *
 * Jede Hand bekommt sonst ihr eigenes Material, damit die eine leuchten kann,
 * während die andere dunkel bleibt (`HandVisuals`). Ein Abnäher leuchtet nie:
 * er ist auf jedem Handschuh dieselbe Naht in derselben Farbe. Was er
 * mitmachen muss, ist das eine, was ein Handschuh sonst noch sein kann — ein
 * **Geist** (`GhostHand`, halb durchsichtig am Justierstand): drei
 * pechschwarze Striche in einer gläsernen Hand sähen aus, als schwebten sie
 * darin. Also je gefundener Deckkraft ein Material, und das sind zwei oder
 * drei im ganzen Programm; freigegeben wird keines, weil auch keines je allein
 * einer Hand gehört.
 */
const seamMaterials = new Map<number, THREE.MeshStandardMaterial>();

function seams(cloth: THREE.Material): THREE.MeshStandardMaterial {
  const opacity = cloth.transparent ? cloth.opacity : 1;
  let material = seamMaterials.get(opacity);
  if (!material) {
    material = new THREE.MeshStandardMaterial({
      color: SEAM_COLOR,
      roughness: 0.85,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    });
    seamMaterials.set(opacity, material);
  }
  return material;
}

/** Wie viele Punkte ein Ring der Handfläche hat, und einer am Finger. */
const PALM_SEGMENTS = 28;
const FINGER_SEGMENTS = 14;
/** Wie eng die Ringe entlang eines Fingers stehen, in Metern. */
const FINGER_STEP = 0.004;

/** Sammelt Punkte, Gewichte und Dreiecke, bis daraus ein Netz wird. */
class Cloth {
  readonly positions: number[] = [];
  readonly skinIndices: number[] = [];
  readonly skinWeights: number[] = [];
  readonly indices: number[] = [];

  /** Ein Punkt mit seinen Knochen — höchstens zwei, der Rest ist null. */
  vertex(p: THREE.Vector3, boneA: number, weightA: number, boneB = 0, weightB = 0): number {
    this.positions.push(p.x, p.y, p.z);
    this.skinIndices.push(boneA, boneB, 0, 0);
    this.skinWeights.push(weightA, weightB, 0, 0);
    return this.positions.length / 3 - 1;
  }

  /** Zwei Ringe gleicher Teilung, zu einem Band aus Vierecken verbunden. */
  band(a: number, b: number, segments: number): void {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      this.indices.push(a + i, b + i, a + j, a + j, b + i, b + j);
    }
  }

  /** Ein Ring auf einen Punkt zulaufen lassen — die Kuppe eines Fingers, das Ende der Fläche. */
  fan(ring: number, apex: number, segments: number, outward: boolean): void {
    for (let i = 0; i < segments; i++) {
      const j = (i + 1) % segments;
      if (outward) this.indices.push(ring + i, apex, ring + j);
      else this.indices.push(ring + i, ring + j, apex);
    }
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.skinIndices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.skinWeights, 4));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

const _point = new THREE.Vector3();

/**
 * Baut den Handschuh um ein Skelett, das in Ruhelage steht.
 *
 * @param root    der Knochen der Hand selbst — die Handfläche hängt ganz an ihm
 * @param fingers Daumen und vier Finger, jeder mit seinen beiden Knochen
 * @param material das Material des Stoffs
 */
export function buildGlove(
  root: THREE.Bone,
  fingers: readonly GloveFinger[],
  material: THREE.Material,
): THREE.SkinnedMesh {
  const bones: THREE.Bone[] = [root];
  for (const finger of fingers) bones.push(finger.bones[0], finger.bones[1]);
  const cloth = new Cloth();

  // --- die Handfläche -------------------------------------------------------
  // Hinten geschlossen, damit man nicht in einen hohlen Ärmel sieht; das ist
  // ein Punkt in der Mitte des ersten Rings.
  const back = PALM[0]!;
  const backCentre = cloth.vertex(_point.set(0, back.y ?? 0, back.z), 0, 1);
  let previous = -1;
  for (const ring of PALM) {
    const first = cloth.positions.length / 3;
    for (let i = 0; i < PALM_SEGMENTS; i++) {
      const angle = (i / PALM_SEGMENTS) * Math.PI * 2;
      cloth.vertex(
        _point.set(Math.cos(angle) * ring.w, (ring.y ?? 0) + Math.sin(angle) * ring.h, ring.z),
        0,
        1,
      );
    }
    if (previous < 0) cloth.fan(first, backCentre, PALM_SEGMENTS, false);
    else cloth.band(previous, first, PALM_SEGMENTS);
    previous = first;
  }
  const front = PALM[PALM.length - 1]!;
  const frontCentre = cloth.vertex(_point.set(0, front.y ?? 0, front.z - 0.002), 0, 1);
  cloth.fan(previous, frontCentre, PALM_SEGMENTS, true);

  // --- die Finger -----------------------------------------------------------
  for (const finger of fingers) {
    const [proximal, distal] = finger.bones;
    const [near, far] = finger.lengths;
    const boneA = bones.indexOf(proximal);
    const boneB = bones.indexOf(distal);
    const r = finger.radius;
    const length = near + far;
    // Alle Ringe im Rahmen des ersten Knochens: in Ruhelage liegt der zweite
    // gerade dahinter, also ist das der Rahmen des ganzen Fingers.
    const frame = proximal.matrixWorld;

    /** Gewicht des zweiten Knochens an der Stelle `s` — weich um das Gelenk herum. */
    const blend = (s: number): number => {
      const t = (s - (near - r)) / (2 * r);
      const x = Math.min(1, Math.max(0, t));
      return x * x * (3 - 2 * x);
    };
    const ring = (s: number, radius: number): number => {
      const first = cloth.positions.length / 3;
      const wB = blend(s);
      for (let i = 0; i < FINGER_SEGMENTS; i++) {
        const angle = (i / FINGER_SEGMENTS) * Math.PI * 2;
        _point.set(Math.cos(angle) * radius, Math.sin(angle) * radius, -s).applyMatrix4(frame);
        cloth.vertex(_point, boneA, 1 - wB, boneB, wB);
      }
      return first;
    };

    // Der Ansatz liegt *in* der Handfläche und ist dort geschlossen — sonst
    // sähe man durch einen gläsernen Geist in einen hohlen Finger.
    const start = -r * 0.9;
    const base = cloth.vertex(_point.set(0, 0, -start).applyMatrix4(frame), boneA, 1);
    let last = ring(start, r * 0.92);
    cloth.fan(last, base, FINGER_SEGMENTS, false);
    // Die Röhre: leicht verjüngt zur Spitze, und um das Mittelgelenk ein
    // wenig dicker — so sieht ein Finger im Handschuh aus.
    for (let s = start + FINGER_STEP; s < length - r * 0.4; s += FINGER_STEP) {
      const taper = 1 - 0.18 * Math.max(0, s / length);
      const knuckle = 1 + 0.07 * Math.exp(-((s - near) * (s - near)) / (2 * r * r));
      const next = ring(s, r * taper * knuckle);
      cloth.band(last, next, FINGER_SEGMENTS);
      last = next;
    }
    // Die Kuppe: eine halbe Kugel aus vier Ringen und einem Scheitel.
    const tipRadius = r * 0.82;
    const tipStart = length - r * 0.4;
    for (let k = 1; k <= 4; k++) {
      const phi = (k / 5) * (Math.PI / 2);
      const next = ring(tipStart + Math.sin(phi) * tipRadius, tipRadius * Math.cos(phi));
      cloth.band(last, next, FINGER_SEGMENTS);
      last = next;
    }
    const apex = cloth.vertex(
      _point.set(0, 0, -(tipStart + tipRadius)).applyMatrix4(frame),
      boneA,
      1 - blend(length),
      boneB,
      blend(length),
    );
    cloth.fan(last, apex, FINGER_SEGMENTS, true);
  }

  const mesh = new THREE.SkinnedMesh(cloth.geometry(), material);
  mesh.name = 'glove';
  // Die drei Striche hängen **am** Netz und nicht darin: sie haben ihre eigene
  // Farbe, und der Stoff hat nur eine. Am Netz und nicht an der Hand, damit
  // sie mitgehen und mitverschwinden, wo immer der Handschuh landet.
  for (const stripe of buildSeams(material)) mesh.add(stripe);
  // Gebunden in Ruhelage, im Raum der Hand: die Knochen stehen dort, wo sie
  // gebaut sind, und die Bindematrix ist die Ruhe — das Netz selbst hängt an
  // derselben Hand wie die Knochen, und im angehängten Modus rechnet three.js
  // die Bewegung der Hand von selbst heraus.
  mesh.bind(new THREE.Skeleton(bones), new THREE.Matrix4());
  return mesh;
}

/**
 * Wo die Fläche der Handfläche an dieser Stelle liegt: die beiden Halbachsen
 * der Ellipse, zwischen den Ringen des Profils interpoliert.
 */
function palmAt(z: number): PalmRing {
  const first = PALM[0]!;
  if (z >= first.z) return first;
  for (let i = 1; i < PALM.length; i++) {
    const ring = PALM[i]!;
    if (z < ring.z) continue;
    const before = PALM[i - 1]!;
    const t = (before.z - z) / (before.z - ring.z);
    return {
      z,
      w: before.w + (ring.w - before.w) * t,
      h: before.h + (ring.h - before.h) * t,
      y: (before.y ?? 0) + ((ring.y ?? 0) - (before.y ?? 0)) * t,
    };
  }
  return PALM[PALM.length - 1]!;
}

/** Die drei Abnäher als dünne Schnüre auf dem Handrücken. */
function buildSeams(cloth: THREE.Material): THREE.Mesh[] {
  const stripes: THREE.Mesh[] = [];
  for (const lane of [-1, 0, 1]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= SEAM_STEPS; i++) {
      const t = i / SEAM_STEPS;
      const z = SEAM_FROM + (SEAM_TO - SEAM_FROM) * t;
      const x = lane * SEAM_SPREAD * (1 - SEAM_TAPER * t);
      const ring = palmAt(z);
      // Der Punkt auf der Ellipse über dieser Stelle, plus die Dicke der Schnur.
      const share = Math.min(1, Math.abs(x) / ring.w);
      const y = (ring.y ?? 0) + ring.h * Math.sqrt(Math.max(0, 1 - share * share));
      points.push(new THREE.Vector3(x, y + SEAM_RADIUS * 0.6, z));
    }
    const curve = new THREE.CatmullRomCurve3(points);
    const stripe = new THREE.Mesh(
      new THREE.TubeGeometry(curve, SEAM_STEPS * 3, SEAM_RADIUS, 6, false),
      seams(cloth),
    );
    stripe.name = 'glove-seam';
    stripes.push(stripe);
  }
  return stripes;
}
