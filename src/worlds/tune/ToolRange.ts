import * as THREE from 'three';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';
import { bullseyeFace } from '../shared/target';

/** Der Gang: halbe Breite, Länge und lichte Höhe, in Metern. */
export const LANE = { half: 1.15, length: 9.5, height: 2.7 };

/** Wie nah ein Werkzeug an den Halter muss, damit es einrastet. */
export const MOUNT_REACH = 0.3;

/** Wo die Scheibe hängt, im Raum des Gangs. */
const TARGET = new THREE.Vector3(0, 1.45, LANE.length - 0.35);
/** Wo das Werkzeug liegt — seitlich, damit man nicht davorsteht. */
const MOUNT = new THREE.Vector3(-0.52, 1.06, 1.55);
const TARGET_RADIUS = 0.32;

const _world = new THREE.Vector3();
const _matrix = new THREE.Matrix4();
const _up = new THREE.Vector3(0, 1, 0);

/**
 * Die Schießanlage im Eingaberaum: ein Gang, eine Scheibe, ein Halter.
 *
 * Der Tisch nebenan beantwortet die Frage „liegt meine Hand richtig?", weil er
 * einen festen Punkt hat, den man anfassen kann. Für ein **Werkzeug** reicht
 * das nicht: eine Pistole liegt nicht richtig oder falsch, sie **zeigt**
 * richtig oder falsch. Und wohin sie zeigt, sieht man an nichts so gut wie an
 * einer Zielscheibe am Ende eines Gangs.
 *
 * Deshalb liegt der Halter so, wie er liegt: seine Aufnahme ist genau auf die
 * Scheibe ausgerichtet, das Werkzeug rastet mit seiner Zielachse (-Z) darauf
 * ein und kann gar nicht anders als richtig zu zeigen. Was danach gemessen
 * wird, ist ausschließlich die **Hand** — der Rest steht schon fest. Das ist
 * der Unterschied zum Justierer in der Luft, wo man beides zugleich raten
 * muss: wo das Werkzeug hinzeigt *und* wie man es hält.
 *
 * Der Gang selbst wird von der Welt gebaut (Wände wollen fest sein und
 * Portale abweisen); hier steht das, was der Gang *für* etwas ist.
 */
export class ToolRange extends THREE.Group {
  /** Die Aufnahme: ein leerer Knoten in genau der Lage, die das Werkzeug erbt. */
  readonly mount = new THREE.Object3D();

  /** Die Scheibe selbst — die Welt macht sie fest, damit Kugeln daran enden. */
  readonly disc: THREE.Mesh;

  private readonly cradle: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;
  private readonly owned: THREE.Material[] = [];
  private lit = false;

  constructor() {
    super();
    this.name = 'tool-range';

    const steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.4, metalness: 0.6 }),
    );

    // --- die Scheibe am Ende ------------------------------------------------
    const face = this.own(bullseyeFace());
    const disc = (this.disc = new THREE.Mesh(
      new THREE.CylinderGeometry(TARGET_RADIUS, TARGET_RADIUS, 0.05, 28),
      [steel, face, steel],
    ));
    // Ein Zylinder steht auf +Y; nach vorn gekippt schaut seine Deckfläche den
    // Gang herunter — also zu dem hin, der schießt.
    disc.rotation.x = -Math.PI / 2;
    disc.position.copy(TARGET);
    this.add(disc);

    const post = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, TARGET.y, 0.08),
      steel,
    );
    post.position.set(TARGET.x, TARGET.y / 2, TARGET.z + 0.05);
    this.add(post);

    // --- der Halter ---------------------------------------------------------
    const column = new THREE.Mesh(new THREE.BoxGeometry(0.07, MOUNT.y, 0.07), steel);
    column.position.set(MOUNT.x, MOUNT.y / 2, MOUNT.z);
    this.add(column);

    this.cradle = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.03, 0.3),
      this.own(
        new THREE.MeshStandardMaterial({
          color: GRAB_TINT,
          roughness: 0.6,
          emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
        }),
      ),
    );
    this.cradle.position.copy(MOUNT);
    this.cradle.position.y -= 0.03;
    this.add(this.cradle);

    // Die Aufnahme schaut die Scheibe an: `lookAt` legt -Z auf das Ziel, und
    // -Z ist genau die Achse, an der ein Werkzeug zielt (`aim.ts`). Damit
    // *kann* ein Werkzeug im Halter nicht danebenzeigen.
    this.mount.position.copy(MOUNT);
    this.mount.quaternion.setFromRotationMatrix(_matrix.lookAt(MOUNT, TARGET, _up));
    this.add(this.mount);
  }

  /** Wie weit ein Punkt vom Halter weg ist, in Metern. */
  mountDistance(worldPoint: THREE.Vector3): number {
    this.mount.updateWorldMatrix(true, false);
    return this.mount.getWorldPosition(_world).distanceTo(worldPoint);
  }

  /** Der Halter leuchtet, solange ein Werkzeug in seiner Nähe ist. */
  setGlow(active: boolean): void {
    if (active === this.lit) return;
    this.lit = active;
    this.cradle.material.color.setHex(active ? GRAB_GLOW : GRAB_TINT);
    this.cradle.material.emissive
      .setHex(active ? GRAB_GLOW : GRAB_TINT)
      .multiplyScalar(active ? 0.5 : 0.3);
  }

  dispose(): void {
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    for (const material of this.owned) {
      (material as THREE.MeshStandardMaterial).map?.dispose();
      material.dispose();
    }
    this.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}
