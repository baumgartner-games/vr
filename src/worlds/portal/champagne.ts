import * as THREE from 'three';
import type { PropGrip } from './propGrip';

/**
 * **Die Sektflasche** — das erste Ding aus dem Beutel, das man nicht einfach
 * anfasst, sondern *hält*: am Hals, in der Faust wie ein Pistolengriff,
 * aufrecht oder über Kopf (`propGrip.ts`). Und das erste, das etwas *tut*:
 * geschüttelt knallt der Korken heraus.
 *
 * Gebaut in echter Größe — 32 cm, unten 4,5 cm dick, der Hals 1,6 cm —, mit
 * dem Ursprung in der Mitte, damit sie in der Hand um sich selbst dreht und
 * nicht um ihren Boden. Die Silhouette ist ein gedrehtes Profil
 * (`LatheGeometry`): Boden, Bauch, Schulter, Hals. Darauf sitzt die Folie in
 * Gold, und obenauf der **Korken**, ein eigenes Netz mit eigenem Namen —
 * die Welt löst ihn beim Knall vom Hals und lässt ihn als eigenen Körper
 * fliegen.
 */

/** Ganze Höhe, und der Boden liegt bei -HEIGHT/2. */
export const BOTTLE_HEIGHT = 0.32;
export const BODY_RADIUS = 0.045;
export const NECK_RADIUS = 0.016;
/** Wo der Hals anfängt und wo die Mündung ist, von der Mitte aus. */
const SHOULDER_TOP = 0.07;
export const MOUTH_Y = BOTTLE_HEIGHT / 2;
/** Der Korken: so lang, so dick, und so weit ragt er aus der Mündung. */
export const CORK_RADIUS = 0.017;
export const CORK_LENGTH = 0.03;
const CORK_OUT = 0.018;
export const CORK_NAME = 'champagne-cork';
/** Mit dieser Geschwindigkeit verlässt der Korken den Hals, in m/s. */
export const CORK_SPEED = 9;

/**
 * Der Griff: die Mitte des Halses, Achse nach oben. Die Faust schließt sich
 * dort wie um den Standardgriff — der Hals ist etwas dünner, und das sieht
 * man einer geschlossenen Hand nicht an.
 */
export const CHAMPAGNE_GRIP: PropGrip = {
  centre: new THREE.Vector3(0, (SHOULDER_TOP + MOUTH_Y) / 2 + 0.01, 0),
  axis: new THREE.Vector3(0, 1, 0),
};

/** Das Profil von unten nach oben: (Halbmesser, Höhe) — die Drehachse ist Y. */
const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, -0.16],
  [0.036, -0.16],
  [BODY_RADIUS, -0.15],
  [BODY_RADIUS, 0.02],
  [0.042, 0.045],
  [0.03, 0.06],
  [0.02, SHOULDER_TOP],
  [NECK_RADIUS, 0.09],
  [NECK_RADIUS, MOUTH_Y - 0.004],
  [NECK_RADIUS + 0.003, MOUTH_Y - 0.004],
  [NECK_RADIUS + 0.003, MOUTH_Y],
  [0.011, MOUTH_Y],
];

export interface Champagne {
  mesh: THREE.Mesh;
  cork: THREE.Mesh;
}

export function buildChampagne(): Champagne {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x1f5a34,
    roughness: 0.25,
    metalness: 0.1,
  });
  const points = PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y));
  const mesh = new THREE.Mesh(new THREE.LatheGeometry(points, 28), glass);
  mesh.name = 'prop-champagne';

  // Das Etikett: ein Band um den Bauch.
  const label = new THREE.Mesh(
    new THREE.CylinderGeometry(BODY_RADIUS + 0.001, BODY_RADIUS + 0.001, 0.07, 28, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf2e8c8, roughness: 0.7, side: THREE.DoubleSide }),
  );
  label.name = 'champagne-label';
  label.position.y = -0.07;
  mesh.add(label);

  // Die Folie: Gold über Hals und Mündung, bis zum Korken hinauf.
  const foil = new THREE.Mesh(
    new THREE.CylinderGeometry(NECK_RADIUS + 0.004, 0.024, 0.075, 20, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xd9a441,
      roughness: 0.3,
      metalness: 0.8,
      side: THREE.DoubleSide,
    }),
  );
  foil.name = 'champagne-foil';
  foil.position.y = MOUTH_Y - 0.0375;
  mesh.add(foil);

  const cork = new THREE.Mesh(
    new THREE.CylinderGeometry(CORK_RADIUS, CORK_RADIUS * 0.8, CORK_LENGTH, 14),
    new THREE.MeshStandardMaterial({ color: 0xb98956, roughness: 0.85 }),
  );
  cork.name = CORK_NAME;
  // Halb im Hals, halb draußen — der Ursprung des Korkens ist seine Mitte.
  cork.position.y = MOUTH_Y + CORK_OUT - CORK_LENGTH / 2;
  mesh.add(cork);

  return { mesh, cork };
}

/**
 * **Der Schüttelmesser.**
 *
 * Geschüttelt heißt: die Hand wechselt schnell die Richtung, immer wieder.
 * Gemessen wird deshalb nicht die Geschwindigkeit — ein Wurf ist schnell und
 * kein Schütteln —, sondern wie stark sie sich von Bild zu Bild **ändert**,
 * und das aufsummiert mit Verfall: ein Ruck allein reicht nicht, drei Rucke
 * in einer Sekunde reichen. Ohne Verfall knallte die Flasche irgendwann von
 * selbst, nach einer Stunde vorsichtigen Tragens.
 */
export class ShakeMeter {
  /** Wie viel Ruck sich angesammelt hat, in m/s. */
  private energy = 0;
  private readonly last = new THREE.Vector3();
  private primed = false;
  /** Einmal geknallt ist geknallt. */
  private done = false;

  constructor(
    /**
     * So viel angesammelter Ruck lässt den Korken knallen: gut zwei Meter je
     * Sekunde hin und her, sechsmal je Sekunde, knallt nach einer Sekunde;
     * anderthalb Meter je Sekunde und fünfmal knallt nie — das ist Tragen.
     */
    private readonly threshold = 8,
    /** Wie schnell er verfällt: der Anteil, der je Sekunde bleibt. */
    private readonly keep = 0.25,
  ) {}

  /** Wie weit es noch bis zum Knall ist, 0 … 1. */
  get charge(): number {
    return Math.min(1, this.energy / this.threshold);
  }

  /**
   * Die Geschwindigkeit der Hand in diesem Bild. Wahr genau in dem Bild, in
   * dem der Korken knallt.
   */
  feed(velocity: THREE.Vector3, dt: number): boolean {
    if (this.done) return false;
    if (this.primed) {
      // Nur der Anteil der Änderung, der *gegen* die alte Richtung geht,
      // zählt — Anfahren aus dem Stand ist kein Schütteln.
      const reversal = Math.max(0, -velocity.dot(this.last));
      const speed = this.last.length();
      if (speed > 0.001) this.energy += reversal / speed;
    }
    this.last.copy(velocity);
    this.primed = true;
    this.energy *= Math.pow(this.keep, dt);
    if (this.energy < this.threshold) return false;
    this.done = true;
    return true;
  }
}

/**
 * **Der Schaum** — ein Schwall Tropfen aus der Mündung, der eine gute Sekunde
 * lang fällt. Punkte, keine Kugeln: hundert Kugeln je Knall wären ein
 * Frame-Einbruch für einen Effekt, den niemand länger als einen Wimpernschlag
 * ansieht.
 */
export class Foam extends THREE.Points {
  private readonly velocities: Float32Array;
  private readonly drops: number;
  private age = 0;
  private readonly life = 1.4;

  constructor(origin: THREE.Vector3, direction: THREE.Vector3, count = 90) {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const side = new THREE.Vector3();
    const up = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;
      // Ein Kegel um die Halsachse: schnell nach vorn, ein wenig zur Seite.
      side.randomDirection().cross(direction).normalize();
      const spread = Math.random() * 0.35;
      up.copy(direction)
        .multiplyScalar(1 - spread)
        .addScaledVector(side, spread)
        .normalize()
        .multiplyScalar(2 + Math.random() * 3.5);
      velocities[i * 3] = up.x;
      velocities[i * 3 + 1] = up.y;
      velocities[i * 3 + 2] = up.z;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    super(
      geometry,
      new THREE.PointsMaterial({
        color: 0xfff6d5,
        size: 0.018,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
      }),
    );
    this.name = 'champagne-foam';
    this.velocities = velocities;
    this.drops = count;
    this.frustumCulled = false;
  }

  /** Ein Bild weiter. Falsch, sobald der Schaum verflogen ist. */
  update(dt: number): boolean {
    this.age += dt;
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    for (let i = 0; i < this.drops; i++) {
      const v = this.velocities;
      v[i * 3 + 1]! -= 9.81 * dt;
      array[i * 3]! += v[i * 3]! * dt;
      array[i * 3 + 1]! += v[i * 3 + 1]! * dt;
      array[i * 3 + 2]! += v[i * 3 + 2]! * dt;
    }
    positions.needsUpdate = true;
    (this.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - this.age / this.life);
    return this.age < this.life;
  }

  dispose(): void {
    this.geometry.dispose();
    (this.material as THREE.Material).dispose();
    this.removeFromParent();
  }
}
