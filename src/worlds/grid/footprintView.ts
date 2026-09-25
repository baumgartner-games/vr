import * as THREE from 'three';
import { CELL, cellCentre, snapCell, type CellGrid } from '../nav/cellGrid';

/** Wer auf dem Gitter steht: Füße in Weltmetern und die Etage darunter. */
export interface Occupant {
  x: number;
  y: number;
  z: number;
  level: number;
}

/** So hoch über dem Boden liegt die Anzeige — über den Gitterlinien. */
const LIFT = 0.03;
/** Frei: grün. Auf einer Stellung, die das Gitter nicht zulässt: rot. */
const FREE = 0x48e08a;
const BLOCKED = 0xff5a4f;

/**
 * **Die 2×2 Zellen, die eine Figur logisch belegt** (_Menü → Grafik →
 * Belegte Felder_).
 *
 * Eine Figur steht optisch, wo sie will; logisch steht sie auf dem Block, auf
 * den ihre Füße gerundet werden (`nav/cellGrid.snapCell`). Diese Anzeige zeigt
 * genau den: ein Quadrat von einem Meter, in vier Zellen geteilt, grün, wenn
 * der Block frei ist, rot, wenn nicht — dann ist etwas an der Welt oder an der
 * Bewegung nicht in Ordnung, und man sieht es sofort.
 *
 * Ein Netz je Figur, aus einem kleinen Vorrat, der wächst und nie schrumpft:
 * Es stehen selten mehr als ein paar Dutzend Figuren in einer Welt, und ein
 * Netz, das jedes Bild neu gebaut würde, wäre der teuerste Teil einer Anzeige,
 * die nur einen Umriss zeigt.
 */
export class FootprintView {
  readonly group = new THREE.Group();
  private readonly pool: THREE.LineSegments[] = [];
  private readonly shape: THREE.BufferGeometry;
  private readonly free = new THREE.LineBasicMaterial({
    color: FREE,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  private readonly blocked = new THREE.LineBasicMaterial({
    color: BLOCKED,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });

  constructor() {
    this.group.name = 'cell-footprints';
    this.group.visible = false;
    // Ein Quadrat von zwei Zellen Kantenlänge um den Ursprung, und das Kreuz
    // der vier Zellen darin.
    const h = CELL;
    const points = [
      [-h, -h, h, -h],
      [h, -h, h, h],
      [h, h, -h, h],
      [-h, h, -h, -h],
      [0, -h, 0, h],
      [-h, 0, h, 0],
    ].flatMap(([x0, z0, x1, z1]) => [x0!, 0, z0!, x1!, 0, z1!]);
    this.shape = new THREE.BufferGeometry();
    this.shape.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  }

  /** Zeigt die Blöcke dieser Figuren — oder nichts, wenn `on` falsch ist. */
  update(on: boolean, grid: CellGrid | null, occupants: readonly Occupant[]): void {
    this.group.visible = on && !!grid;
    if (!this.group.visible || !grid) return;
    while (this.pool.length < occupants.length) {
      const lines = new THREE.LineSegments(this.shape, this.free);
      lines.renderOrder = 5;
      lines.raycast = () => {};
      this.pool.push(lines);
      this.group.add(lines);
    }
    this.pool.forEach((lines, i) => {
      const one = occupants[i];
      lines.visible = !!one;
      if (!one) return;
      const at = snapCell(one.x, one.z);
      const centre = cellCentre(at);
      lines.position.set(centre.x, one.y + LIFT, centre.z);
      lines.material = grid.footprintFree(at, one.level) ? this.free : this.blocked;
    });
  }

  dispose(): void {
    this.group.removeFromParent();
    this.shape.dispose();
    this.free.dispose();
    this.blocked.dispose();
  }
}
