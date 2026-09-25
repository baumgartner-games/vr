import * as THREE from 'three';
import { CELL, type CellGrid } from '../nav/cellGrid';
import { DIR_E, DIR_S } from '../nav/navTile';

/** So hoch über dem Boden liegt die Anzeige — über Gitterlinien und Feldern. */
const LIFT = 0.04;
/** So viele Zellen um den Spieler, in jede Richtung: acht Meter. */
const RADIUS = 16;
/** Der Rand, den jedes Feld nach innen frei lässt — damit man die Zellen zählt. */
const INSET = 0.03;
/** So oft wird neu gezählt, in Sekunden: Wände aus dem Regal wandern jederzeit. */
const REFRESH = 0.2;

const FREE = new THREE.Color(0x48e08a);
const BLOCKED = new THREE.Color(0xff5a4f);
const WALL = 0xff2a2a;

const SIDE = RADIUS * 2 + 1;
/** Sechs Ecken je Feld (zwei Dreiecke). */
const CELL_VERTICES = SIDE * SIDE * 6;
/**
 * Kanten: je Kachel höchstens zwei (Ost und Süd), dazu eine Schräge — je zwei
 * Ecken. Die Kacheln im Umkreis: die halbe Zellzahl, eine Reihe Rand dazu.
 */
const TILE_SIDE = Math.ceil(SIDE / 2) + 2;
const LINE_VERTICES = TILE_SIDE * TILE_SIDE * 3 * 2;

/** Was die Anzeige über die Stelle des Spielers wissen muss. */
export interface CellHitboxFocus {
  x: number;
  z: number;
  /** Die Etage, deren Zellen gezeigt werden. */
  level: number;
  /** Die Höhe ihres Bodens in Metern. */
  floorY: number;
  /** Ob auf dieser Kachel Boden liegt — daneben werden nur belegte Zellen gezeigt. */
  hasTile: (tx: number, tz: number) => boolean;
}

/**
 * **Die Hitboxen des Gitters** (_Menü → Grafik → Hitboxen (2D-Gitter)_).
 *
 * Seit Wände aus dem Regal Spieler und NPCs nur noch über das Zellgitter
 * aufhalten (`GridWorld.collectWalls`), zeigt das Drahtgitter der Physik
 * (`physics/HitboxView.ts`) nicht mehr, woran man hängen bleibt. Diese Anzeige
 * tut es: jede halbe Kachel um den Spieler als Feld, **rot**, wenn sie belegt
 * ist (Wand, Schräge, Möbel, Pfosten), **grün**, wenn frei; jede geschlossene
 * Kachelkante als **rote Linie**, jede Schräge als rote Linie quer durch ihre
 * Kachel.
 *
 * Gezählt wird fünfmal in der Sekunde und nicht jedes Bild; die Puffer sind
 * einmal angelegt und werden nur überschrieben (`setDrawRange`).
 */
export class CellHitboxView {
  readonly group = new THREE.Group();
  private readonly cells: THREE.Mesh;
  private readonly lines: THREE.LineSegments;
  private readonly cellPositions = new Float32Array(CELL_VERTICES * 3);
  private readonly cellColors = new Float32Array(CELL_VERTICES * 3);
  private readonly linePositions = new Float32Array(LINE_VERTICES * 3);
  private clock = 0;

  constructor() {
    this.group.name = 'cell-hitboxes';
    this.group.visible = false;
    const cellShape = new THREE.BufferGeometry();
    cellShape.setAttribute(
      'position',
      new THREE.BufferAttribute(this.cellPositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    cellShape.setAttribute(
      'color',
      new THREE.BufferAttribute(this.cellColors, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.cells = new THREE.Mesh(
      cellShape,
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.35,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.cells.renderOrder = 6;
    this.cells.frustumCulled = false;
    this.cells.raycast = () => {};
    const lineShape = new THREE.BufferGeometry();
    lineShape.setAttribute(
      'position',
      new THREE.BufferAttribute(this.linePositions, 3).setUsage(THREE.DynamicDrawUsage),
    );
    this.lines = new THREE.LineSegments(
      lineShape,
      new THREE.LineBasicMaterial({ color: WALL, depthTest: false, transparent: true }),
    );
    this.lines.renderOrder = 7;
    this.lines.frustumCulled = false;
    this.lines.raycast = () => {};
    this.group.add(this.cells, this.lines);
  }

  /** Zeigt die Zellen um `focus` — oder nichts, wenn `on` falsch ist. */
  update(dt: number, on: boolean, grid: CellGrid | null, focus: CellHitboxFocus | null): void {
    this.group.visible = on && !!grid && !!focus;
    if (!this.group.visible || !grid || !focus) {
      this.clock = 0;
      return;
    }
    this.clock -= dt;
    if (this.clock > 0) return;
    this.clock = REFRESH;
    this.fill(grid, focus);
  }

  private fill(grid: CellGrid, focus: CellHitboxFocus): void {
    const y = focus.floorY + LIFT;
    const cx = Math.floor(focus.x / CELL),
      cz = Math.floor(focus.z / CELL);
    let v = 0;
    const put = (x: number, z: number, color: THREE.Color): void => {
      this.cellPositions[v * 3] = x;
      this.cellPositions[v * 3 + 1] = y;
      this.cellPositions[v * 3 + 2] = z;
      this.cellColors[v * 3] = color.r;
      this.cellColors[v * 3 + 1] = color.g;
      this.cellColors[v * 3 + 2] = color.b;
      v++;
    };
    for (let iz = cz - RADIUS; iz <= cz + RADIUS; iz++)
      for (let ix = cx - RADIUS; ix <= cx + RADIUS; ix++) {
        const free = grid.cellFree(ix, iz, focus.level);
        // Neben dem Grundriss nur, was dort belegt ist — eine Wand aus dem
        // Regal auf dem Gelände. Das freie Nichts ist keine Aussage.
        if (free && !focus.hasTile(Math.floor(ix / 2), Math.floor(iz / 2))) continue;
        const color = free ? FREE : BLOCKED;
        const x0 = ix * CELL + INSET,
          x1 = (ix + 1) * CELL - INSET,
          z0 = iz * CELL + INSET,
          z1 = (iz + 1) * CELL - INSET;
        put(x0, z0, color);
        put(x1, z1, color);
        put(x1, z0, color);
        put(x0, z0, color);
        put(x0, z1, color);
        put(x1, z1, color);
      }
    this.cells.geometry.setDrawRange(0, v);
    this.cells.geometry.attributes.position!.needsUpdate = true;
    this.cells.geometry.attributes.color!.needsUpdate = true;

    let l = 0;
    const line = (x0: number, z0: number, x1: number, z1: number): void => {
      if (l + 2 > LINE_VERTICES) return;
      this.linePositions.set([x0, y, z0, x1, y, z1], l * 3);
      l += 2;
    };
    const t0x = Math.floor((cx - RADIUS) / 2) - 1,
      t0z = Math.floor((cz - RADIUS) / 2) - 1;
    for (let tz = t0z; tz < t0z + TILE_SIDE; tz++)
      for (let tx = t0x; tx < t0x + TILE_SIDE; tx++) {
        const here = focus.hasTile(tx, tz);
        const tile = CELL * 2;
        if ((here || focus.hasTile(tx + 1, tz)) && !grid.edgeOpen(tx, tz, DIR_E, focus.level))
          line((tx + 1) * tile, tz * tile, (tx + 1) * tile, (tz + 1) * tile);
        if ((here || focus.hasTile(tx, tz + 1)) && !grid.edgeOpen(tx, tz, DIR_S, focus.level))
          line(tx * tile, (tz + 1) * tile, (tx + 1) * tile, (tz + 1) * tile);
        const slope = grid.slopeAt(tx, tz, focus.level);
        // „╱" von Südwest nach Nordost, „╲" von Nordwest nach Südost —
        // Norden ist −Z.
        if (slope === 'slash') line(tx * tile, (tz + 1) * tile, (tx + 1) * tile, tz * tile);
        else if (slope === 'backslash')
          line(tx * tile, tz * tile, (tx + 1) * tile, (tz + 1) * tile);
      }
    this.lines.geometry.setDrawRange(0, l);
    this.lines.geometry.attributes.position!.needsUpdate = true;
  }

  dispose(): void {
    this.group.removeFromParent();
    this.cells.geometry.dispose();
    (this.cells.material as THREE.Material).dispose();
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
  }
}
