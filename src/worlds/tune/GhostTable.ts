import * as THREE from 'three';
import { GhostHand } from '../../core/HandVisuals';
import { GRAB_GLOW, GRAB_TINT } from '../../core/colors';
import { idleHandPose } from '../../core/handPoseStore';
import { InputModel } from './InputModel';
import { tableSettings, type TableSettings } from './tableSettings';

/** Wie groß die Platte ist — ein Schreibtischeck, kein Esstisch. */
const TOP = { width: 0.9, depth: 0.55, thickness: 0.035 };
/** Wie nah eine Hand an die Griffleiste muss, damit sie den Tisch hebt. */
export const RAIL_REACH = 0.22;

const _local = new THREE.Vector3();
const _euler = new THREE.Euler();
const DEG = Math.PI / 180;

/**
 * Ein Tisch mit einer Geisterhand darauf.
 *
 * Der Sinn ist eine Wahrheit zum Anfassen: du legst deine **echte** Hand auf
 * deinen **echten** Tisch, stellst die Höhe hier auf dieselben Zentimeter, und
 * ab da liegt die Geisterhand genau da, wo deine liegt. Was dann nicht
 * übereinanderpasst, ist die Handhaltung — und die ist genau das, was hier
 * eingestellt werden soll. Ohne diesen festen Punkt stellt man eine Haltung
 * gegen ein Gefühl ein, und das Gefühl ändert sich mit dem Arm.
 *
 * Auf der Platte liegt wahlweise die **Hand** oder der **Controller**: das
 * sind die zwei Dinge, die im Eingaberaum nicht gleich aussehen, und
 * nebeneinander auf demselben Tisch sieht man endlich, um wie viel.
 *
 * Die Höhe lässt sich auf zwei Arten setzen, und beide sind nötig: an der
 * **türkisen Leiste** anfassen und schieben, wenn man gerade in der Brille
 * sitzt, oder in Zentimetern eintippen, wenn man den Zollstock danebengelegt
 * hat. Die Leiste trägt die Greiffarbe aus `core/colors.ts` — dass man sie
 * anfassen darf, soll man ihr ansehen.
 */
export class GhostTable extends THREE.Group {
  /** Die Leiste, an der der Tisch gehoben wird — das einzige Greifbare hier. */
  readonly rail: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

  private readonly top: THREE.Mesh;
  private readonly legs = new THREE.Group();
  private readonly stand = new THREE.Group();
  private readonly owned: THREE.Material[] = [];
  private ghost: THREE.Object3D | null = null;
  /** Woran der aktuelle Geist gebaut wurde, damit er nur bei Bedarf neu kommt. */
  private ghostKey = '';
  private settings: TableSettings = tableSettings();
  private held = false;

  constructor() {
    super();
    this.name = 'ghost-table';

    const wood = this.own(
      new THREE.MeshStandardMaterial({ color: 0x6f5b45, roughness: 0.75, metalness: 0.05 }),
    );
    const steel = this.own(
      new THREE.MeshStandardMaterial({ color: 0x59617a, roughness: 0.4, metalness: 0.6 }),
    );

    this.top = new THREE.Mesh(
      new THREE.BoxGeometry(TOP.width, TOP.thickness, TOP.depth),
      wood,
    );
    this.add(this.stand);
    this.stand.add(this.top);

    // Vier Beine, die mit der Höhe mitwachsen: sie hängen unter der Platte und
    // werden beim Setzen der Höhe skaliert, nicht neu gebaut.
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 1, 0.045), steel);
      // Oben verankert, nach unten wachsend — dann bleibt die Platte, wo sie
      // hingehört, und das Bein reicht immer bis zum Boden.
      leg.geometry.translate(0, -0.5, 0);
      leg.position.set(sx * (TOP.width / 2 - 0.06), 0, sz * (TOP.depth / 2 - 0.06));
      this.legs.add(leg);
    }
    this.stand.add(this.legs);

    this.rail = new THREE.Mesh(
      new THREE.BoxGeometry(TOP.width * 0.66, 0.03, 0.045),
      this.own(
        new THREE.MeshStandardMaterial({
          color: GRAB_TINT,
          roughness: 0.6,
          emissive: new THREE.Color(GRAB_TINT).multiplyScalar(0.3),
        }),
      ),
    );
    this.rail.position.set(0, -0.05, TOP.depth / 2 + 0.02);
    this.stand.add(this.rail);

    this.apply(this.settings);
  }

  /** Die Platte, in Weltkoordinaten — wonach die Hand greift. */
  get topHeight(): number {
    return this.settings.height / 100;
  }

  /** Übernimmt die Einstellungen: Höhe, was daraufliegt und wie. */
  apply(settings: TableSettings): void {
    this.settings = settings;
    const height = settings.height / 100;
    this.stand.position.y = height;
    // Ein Bein ist eine Einheit lang und hängt an der Platte; skalieren
    // schiebt sein unteres Ende genau auf den Boden.
    for (const leg of this.legs.children) leg.scale.y = Math.max(height - TOP.thickness / 2, 0.02);

    const key = `${settings.kind}:${settings.side}`;
    if (key !== this.ghostKey) {
      this.ghostKey = key;
      this.ghost?.removeFromParent();
      disposeGhost(this.ghost);
      this.ghost = this.buildGhost(settings);
      this.stand.add(this.ghost);
    }

    const ghost = this.ghost;
    if (!ghost) return;
    ghost.position.set(settings.x / 100, TOP.thickness / 2, settings.z / 100);
    ghost.quaternion.setFromEuler(
      _euler.set(settings.pitch * DEG, settings.yaw * DEG, settings.roll * DEG, 'XYZ'),
    );
  }

  /**
   * Baut den Geist neu — mit **der Haltung, die eingestellt ist**.
   *
   * Nicht mit einer erfundenen: der ganze Zweck ist zu sehen, was die eigene
   * Einstellung aus einer Hand macht. Eine Hand, die etwas hält, trägt dabei
   * ihren Griff, eine leere ihre Grundhaltung.
   */
  private buildGhost(settings: TableSettings): THREE.Object3D {
    if (settings.kind === 'controller') return new InputModel(settings.side).asGhost();
    return new GhostHand(settings.side, idleHandPose(settings.side));
  }

  /** Der Griff leuchtet, solange eine Hand ihn hat oder erreichen könnte. */
  setRailGlow(active: boolean): void {
    if (active === this.held) return;
    this.held = active;
    this.rail.material.color.setHex(active ? GRAB_GLOW : GRAB_TINT);
    this.rail.material.emissive.setHex(active ? GRAB_GLOW : GRAB_TINT).multiplyScalar(active ? 0.5 : 0.3);
  }

  /** Wie weit ein Punkt von der Griffleiste weg ist, in Metern. */
  railDistance(worldPoint: THREE.Vector3): number {
    this.rail.updateWorldMatrix(true, false);
    return this.rail.getWorldPosition(_local).distanceTo(worldPoint);
  }

  dispose(): void {
    disposeGhost(this.ghost);
    this.ghost = null;
    this.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry) mesh.geometry.dispose();
    });
    for (const material of this.owned) material.dispose();
    this.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}

/** Beide Geistersorten wissen selbst, wie sie sich aufräumen. */
function disposeGhost(ghost: THREE.Object3D | null): void {
  if (ghost instanceof GhostHand) ghost.dispose();
  else if (ghost instanceof InputModel) ghost.dispose();
}
