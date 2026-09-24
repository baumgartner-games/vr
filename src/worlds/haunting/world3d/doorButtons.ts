import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { dirX, dirZ, TILE, type Dir } from '../../nav/navTile';
import { doorEdges, doorMiddle } from '../house';

/**
 * **Vor und hinter jeder Tür ein Knopf im Boden** — grün, wenn sie aufgeht,
 * rot, wenn sie gesperrt ist.
 *
 * Gewünscht war: _„Vor und hinter die Türen kannst du die grünen Boden-Buttons
 * platzieren, sodass, wenn man drauf tritt, die Tür ‚sich öffnet' (rein
 * visuell, theoretisch ist die Tür immer offen und man könnte so durchlaufen).
 * Sollte aber eine Tür verschlossen sein, sind die Bodenplatten rot und man
 * kann nicht durch die Tür."_
 *
 * Das ist genau die Aufteilung, die die Station ohnehin hat: Ob man durchkommt,
 * entscheidet die Automatik (`automaticDoors.ts`) — ihr Auslöser reicht über
 * beide Knöpfe hinaus, und gesperrt bleibt gesperrt. Was der Knopf ändert, ist
 * das **Bild**: Die Blätter fahren erst auf, wenn jemand auf einem der beiden
 * Knöpfe steht (`HauntingWorld.doorPressed`), und der Knopf sinkt dabei ein.
 *
 * Die Modelle kommen aus dem Regal (`platformer/green|red/button_base_*.glb`,
 * dieselbe Form wie die gelbe Druckplatte der Gitterwelten,
 * `grid/fixtures/plate.ts`). Gezeichnet wird **gebündelt**: je Farbe und Teil
 * (Sockel, Kappe) ein `InstancedMesh` für alle Türen — vier Zeichenaufrufe
 * für achtzig Knöpfe. Die Farbe, die gerade nicht gilt, steht mit Maßstab
 * null da.
 */
export const BUTTON_GREEN = 'platformer/green/button_base_green.glb';
export const BUTTON_RED = 'platformer/red/button_base_red.glb';

/** Wie breit ein Knopf ist, in Metern — er bleibt innerhalb seiner Kachel. */
export const BUTTON_SIZE = 0.7;

/** Wie tief die Kappe beim Drauftreten einsinkt, in Metern. */
export const BUTTON_DROP = 0.03;

/** Eine Tür, wie sie hier gebraucht wird: ihre erste Kachel, die Richtung der Kante, ihre Breite. */
export interface ButtonDoor {
  id: string;
  x: number;
  z: number;
  dir: Dir;
  /** Kachelkanten längs der Wand (`house.HouseDoor.span`), ohne Angabe eine. */
  span?: number;
}

/**
 * **Die Mitten der Knöpfe einer Tür** — einer auf jeder Bodenkachel davor und
 * dahinter, also zwei je Kachel der Öffnung.
 *
 * Gemeldet: _„Der Button auf dem Boden kann nicht mittig sein, sondern wie der
 * Boden-Floor nur auf einem stehen. Also sollte es dann zwei geben."_ Eine
 * Tür über zwei Kacheln hat damit vier Knöpfe, zwei auf jeder Seite, jeder
 * mitten auf seiner Platte (`house.doorEdges`).
 */
export function doorButtonSpots(door: ButtonDoor): { x: number; z: number }[] {
  const nx = dirX(door.dir) * TILE;
  const nz = dirZ(door.dir) * TILE;
  return doorEdges(door).flatMap((edge) => {
    const x = (edge.x + 0.5) * TILE;
    const z = (edge.z + 0.5) * TILE;
    return [
      { x, z },
      { x: x + nx, z: z + nz },
    ];
  });
}

/**
 * **Ob jemand auf einem der beiden Knöpfe steht** — oder schon in der Tür.
 *
 * Ein Knopf gilt für seine ganze Kachel, und die Knöpfe einer Tür zusammen
 * für die Fläche davor und dahinter: so breit wie sie, eine Kachel tief. Wer davor steht, steht auf ihm; die Kante dazwischen ist die
 * Tür selbst, also ist darin mitgemeint.
 */
export function buttonPressed(
  door: ButtonDoor,
  occupants: readonly { x: number; z: number }[],
): boolean {
  const middle = doorMiddle(door);
  const along = dirX(door.dir) === 0;
  const half = ((door.span ?? 1) * TILE) / 2;
  return occupants.some((one) => {
    const dx = one.x - middle.x;
    const dz = one.z - middle.z;
    const wide = along ? Math.abs(dx) : Math.abs(dz);
    const deep = along ? Math.abs(dz) : Math.abs(dx);
    return wide <= half && deep <= TILE;
  });
}

/** Was ein Knopf gerade zeigt. */
export interface ButtonState {
  locked: boolean;
  pressed: boolean;
}

interface Part {
  mesh: THREE.InstancedMesh;
  /** Vom Netz der Datei in den auf null gestellten Knopf. */
  matrix: THREE.Matrix4;
  cap: boolean;
}

const _box = new THREE.Box3();
const _m = new THREE.Matrix4();
const _zero = new THREE.Matrix4().makeScale(0, 0, 0);

/** Die Knöpfe aller Türen einer Station. */
export class DoorButtons {
  private readonly group = new THREE.Group();
  private readonly spots: { door: string; x: number; z: number }[] = [];
  private readonly shown = new Map<string, string>();
  private green: Part[] = [];
  private red: Part[] = [];
  private readonly owned: { dispose(): void }[] = [];
  private gone = false;

  constructor(root: THREE.Object3D, doors: readonly ButtonDoor[]) {
    this.group.name = 'door-buttons';
    this.group.userData.level = 0;
    root.add(this.group);
    for (const door of doors)
      for (const spot of doorButtonSpots(door)) this.spots.push({ door: door.id, ...spot });
    if (!canLoadModels() || this.spots.length === 0) return;
    void import('../../../core/kaykitModel').then(async (module) => {
      const [green, red] = await Promise.all([
        module.kaykitModel(BUTTON_GREEN),
        module.kaykitModel(BUTTON_RED),
      ]);
      if (this.gone || !green || !red) {
        for (const model of [green, red]) if (model) disposeMaterials(model);
        return;
      }
      this.green = this.parts(green);
      this.red = this.parts(red);
      this.shown.clear();
    });
  }

  /** Die Knöpfe nachziehen — umgeschrieben wird nur, was sich geändert hat. */
  update(state: (door: string) => ButtonState): void {
    if (this.green.length === 0 || this.red.length === 0) return;
    let dirty = false;
    this.spots.forEach((spot, index) => {
      const { locked, pressed } = state(spot.door);
      const key = `${locked ? 'r' : 'g'}${pressed ? 'p' : ''}`;
      if (this.shown.get(`${index}`) === key) return;
      this.shown.set(`${index}`, key);
      dirty = true;
      for (const [parts, on] of [
        [this.green, !locked],
        [this.red, locked],
      ] as const) {
        for (const part of parts) {
          if (!on) {
            part.mesh.setMatrixAt(index, _zero);
            continue;
          }
          const drop = part.cap && pressed ? BUTTON_DROP : 0;
          _m.makeTranslation(spot.x, -drop, spot.z).multiply(part.matrix);
          part.mesh.setMatrixAt(index, _m);
        }
      }
    });
    if (!dirty) return;
    for (const part of [...this.green, ...this.red]) {
      part.mesh.instanceMatrix.needsUpdate = true;
      part.mesh.computeBoundingSphere();
    }
  }

  dispose(): void {
    this.gone = true;
    for (const part of [...this.green, ...this.red]) part.mesh.dispose();
    for (const one of this.owned) one.dispose();
    this.owned.length = 0;
    this.green = [];
    this.red = [];
    this.group.removeFromParent();
  }

  /** Aus einem Modell je Netz ein Bündel — gemessen, auf null gestellt und auf `BUTTON_SIZE` gebracht. */
  private parts(model: THREE.Object3D): Part[] {
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    _box.setFromObject(model);
    const wide = Math.max(_box.max.x - _box.min.x, _box.max.z - _box.min.z);
    const scale = wide > 1e-6 ? BUTTON_SIZE / wide : 1;
    const centre = new THREE.Matrix4()
      .makeScale(scale, scale, scale)
      .multiply(
        new THREE.Matrix4().makeTranslation(
          -(_box.min.x + _box.max.x) / 2,
          -_box.min.y,
          -(_box.min.z + _box.max.z) / 2,
        ),
      );
    const out: Part[] = [];
    model.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      const bundle = new THREE.InstancedMesh(mesh.geometry, mesh.material, this.spots.length);
      bundle.name = `door-button:${mesh.name}`;
      bundle.receiveShadow = true;
      bundle.castShadow = false;
      // Die Geometrie gehört der Vorlage im Speicher und allen anderen Kopien
      // (`core/kaykitModel.copyOf`); freigegeben wird nur das Material dieser Kopie.
      bundle.userData.sharedAssets = true;
      this.owned.push(mesh.material);
      for (let i = 0; i < this.spots.length; i++) bundle.setMatrixAt(i, _zero);
      this.group.add(bundle);
      out.push({
        mesh: bundle,
        matrix: new THREE.Matrix4().multiplyMatrices(centre, mesh.matrixWorld),
        cap: /^button_(?!base)/.test(mesh.name),
      });
    });
    return out;
  }
}

function disposeMaterials(model: THREE.Object3D): void {
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const one of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) one.dispose();
  });
}
