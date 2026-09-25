import * as THREE from 'three';
import { CELL, slopeBlocks, type CellGrid } from '../nav/cellGrid';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, dirX, dirZ, type Dir } from '../nav/navTile';

/** So hoch über dem Boden liegt die Anzeige — knapp darüber, damit nichts flimmert. */
const LIFT = 0.02;
/** So viele Zellen um den Spieler, in jede Richtung, auch außerhalb des Grundrisses. */
const AROUND = 16;
/** Der Rand, den jedes Feld nach innen frei lässt — damit man die Zellen zählt. */
const INSET = 0.03;
/** So oft wird neu gezählt, in Sekunden: Wände aus dem Regal wandern jederzeit. */
const REFRESH = 0.25;

const FREE = new THREE.Color(0x48e08a);
const BLOCKED = new THREE.Color(0xff5a4f);
const STAIR = new THREE.Color(0x4aa8ff);
const WALL = 0xff2a2a;
const ARROW = 0xffffff;

/** Was die Anzeige über die Welt um den Spieler wissen muss. */
export interface CellHitboxFocus {
  x: number;
  z: number;
  /** Die Etage, deren Zellen gezeigt werden. */
  level: number;
  /** Die Kacheln, die auf dieser Etage Boden haben — gezeigt wird ihr ganzes Rechteck. */
  bounds: { tx0: number; tz0: number; tx1: number; tz1: number } | null;
  /** Ob auf dieser Kachel Boden liegt — daneben werden nur belegte Zellen gezeigt. */
  hasTile: (tx: number, tz: number) => boolean;
  /**
   * **Wie hoch der Boden an dieser Stelle ist** — die Etage, ein Podest, auf
   * einer Treppe die Höhe, auf der man dort geht. Dort liegt die Anzeige.
   */
  floorAt: (x: number, z: number) => number;
}

/**
 * **Das Zellgitter auf dem Boden** (_Menü → Grafik → Belegte Felder_ oder
 * _Hitboxen (2D-Gitter)_).
 *
 * Gewünscht: _„alle Gitter-Felder sehen, ob diese mit Wand belegt sind oder
 * frei sind. Auch bei der Treppe, wo es ja ein One-Way-System ist, will ich
 * das wissen, angezeigt mit einem Pfeil. Gitter-Felder, Farben und Pfeile
 * immer auf dem Boden anzeigen."_
 *
 * - **Jede halbe Kachel** der Etage, auf der man steht — nicht mehr nur acht
 *   Meter um den Spieler: **rot**, wenn sie belegt ist (Möbel, Pfosten, kein
 *   Boden, von einer Schräge durchschnitten), **grün**, wenn frei, **blau** auf
 *   einer Treppe oder Rampe.
 * - **Rote Linien**: die Wände, an denen der Spieler entlanggleitet — jede
 *   geschlossene Kachelkante und jede Schräge (`nav/planeMove.cellPlaneWalls`).
 * - **Weiße Pfeile** auf jeder Treppenkachel: einer in der Mitte bergauf, und
 *   an jeder Seite, die nur von außen hält, einer nach außen — dort geht es
 *   herunter, aber nicht herauf.
 *
 * Alles liegt **auf dem Boden**, auf der Treppe schräg auf ihrem Lauf, und
 * wird von Wänden und Möbeln verdeckt wie der Boden selbst. Gezählt wird
 * viermal in der Sekunde; die Puffer wachsen mit dem Plan und werden sonst nur
 * überschrieben (`setDrawRange`).
 */
export class CellHitboxView {
  readonly group = new THREE.Group();
  private readonly cells: THREE.Mesh;
  private readonly lines: THREE.LineSegments;
  private readonly arrows: THREE.Mesh;
  private cellPositions = new Float32Array(new ArrayBuffer(0));
  private cellColors = new Float32Array(new ArrayBuffer(0));
  private linePositions = new Float32Array(new ArrayBuffer(0));
  private arrowPositions = new Float32Array(new ArrayBuffer(0));
  private clock = 0;

  constructor() {
    this.group.name = 'cell-hitboxes';
    this.group.visible = false;
    this.cells = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -4,
      }),
    );
    this.lines = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: WALL, transparent: true, depthWrite: false }),
    );
    this.arrows = new THREE.Mesh(
      new THREE.BufferGeometry(),
      // Die Pfeile immer obenauf: Das Modell der Treppe liegt etwas über
      // der Höhe, auf der man geht, und verdeckte sonst den Pfeil bergauf.
      new THREE.MeshBasicMaterial({
        color: ARROW,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -8,
      }),
    );
    let order = 6;
    for (const one of [this.cells, this.lines, this.arrows]) {
      one.renderOrder = order++;
      one.frustumCulled = false;
      one.raycast = () => {};
    }
    this.group.add(this.cells, this.lines, this.arrows);
  }

  /** Zeigt das Gitter der Etage um `focus` — oder nichts, wenn `on` falsch ist. */
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
    const level = focus.level;
    // Das Rechteck der Etage, und in jedem Fall der Umkreis des Spielers — dort
    // stehen vielleicht Wände aus dem Regal auf dem Gelände.
    const px = Math.floor(focus.x / TILE),
      pz = Math.floor(focus.z / TILE);
    const reach = Math.ceil((AROUND * CELL) / TILE);
    const b = focus.bounds;
    const tx0 = Math.min(b ? b.tx0 : px, px - reach),
      tz0 = Math.min(b ? b.tz0 : pz, pz - reach),
      tx1 = Math.max(b ? b.tx1 : px, px + reach),
      tz1 = Math.max(b ? b.tz1 : pz, pz + reach);

    const cells: number[] = [];
    const colors: number[] = [];
    const y = (x: number, z: number): number => focus.floorAt(x, z) + LIFT;
    const quad = (x0: number, z0: number, x1: number, z1: number, color: THREE.Color): void => {
      const a = [x0, y(x0, z0), z0],
        bb = [x1, y(x1, z0), z0],
        c = [x1, y(x1, z1), z1],
        d = [x0, y(x0, z1), z1];
      cells.push(...a, ...c, ...bb, ...a, ...d, ...c);
      for (let i = 0; i < 6; i++) colors.push(color.r, color.g, color.b);
    };
    const walls: number[] = [];
    const wall = (x0: number, z0: number, x1: number, z1: number): void => {
      walls.push(x0, y(x0, z0), z0, x1, y(x1, z1), z1);
    };
    const arrows: number[] = [];

    for (let tz = tz0; tz <= tz1; tz++)
      for (let tx = tx0; tx <= tx1; tx++) {
        const here = focus.hasTile(tx, tz);
        const slope = grid.slopeAt(tx, tz, level);
        const climb = grid.flightAt(tx, tz, level);
        for (let sz = 0; sz < 2; sz++)
          for (let sx = 0; sx < 2; sx++) {
            const ix = tx * 2 + sx,
              iz = tz * 2 + sz;
            const blocked =
              grid.cellSolid(ix, iz, level) || (!!slope && slopeBlocks(slope, sx, sz));
            // Neben dem Grundriss nur, was dort belegt ist — das freie Nichts
            // ist keine Aussage.
            if (!blocked && !here) continue;
            const color = blocked ? BLOCKED : climb !== null ? STAIR : FREE;
            quad(
              ix * CELL + INSET,
              iz * CELL + INSET,
              (ix + 1) * CELL - INSET,
              (iz + 1) * CELL - INSET,
              color,
            );
          }
        const x = tx * TILE,
          z = tz * TILE;
        const closed = (dir: Dir): boolean =>
          !grid.edgeOpen(tx, tz, dir, level) ||
          !grid.edgeOpen(tx + dirX(dir), tz + dirZ(dir), ((dir + 2) % 4) as Dir, level);
        const near = here || focus.hasTile(tx + 1, tz) || focus.hasTile(tx, tz + 1);
        if (near && closed(DIR_E)) wall(x + TILE, z, x + TILE, z + TILE);
        if (near && closed(DIR_S)) wall(x, z + TILE, x + TILE, z + TILE);
        if (tx === tx0 && closed(DIR_W)) wall(x, z, x, z + TILE);
        if (tz === tz0 && closed(DIR_N)) wall(x, z, x + TILE, z);
        // „╱" von Südwest nach Nordost, „╲" von Nordwest nach Südost — Norden
        // ist −Z.
        if (slope === 'slash') wall(x, z + TILE, x + TILE, z);
        else if (slope === 'backslash') wall(x, z, x + TILE, z + TILE);
        if (climb !== null) this.stairArrows(grid, arrows, y, tx, tz, climb, level);
      }

    this.cellPositions = write(this.cells.geometry, 'position', this.cellPositions, cells);
    this.cellColors = write(this.cells.geometry, 'color', this.cellColors, colors);
    this.linePositions = write(this.lines.geometry, 'position', this.linePositions, walls);
    this.arrowPositions = write(this.arrows.geometry, 'position', this.arrowPositions, arrows);
  }

  /**
   * **Die Pfeile einer Treppenkachel**: bergauf in der Mitte, und nach außen
   * an jeder Seite, die nur von außen hält (`planeMove.cellPlaneWalls`).
   */
  private stairArrows(
    grid: CellGrid,
    out: number[],
    y: (x: number, z: number) => number,
    tx: number,
    tz: number,
    climb: Dir,
    level: number,
  ): void {
    const cx = (tx + 0.5) * TILE,
      cz = (tz + 0.5) * TILE;
    // Ein gefüllter Pfeil: ein Schaft und eine Spitze, flach auf dem Boden.
    const arrow = (
      fromX: number,
      fromZ: number,
      dx: number,
      dz: number,
      length: number,
      flat?: number,
    ): void => {
      const at = (along: number, across: number): number[] => {
        const x = fromX + dx * along - dz * across,
          z = fromZ + dz * along + dx * across;
        return [x, (flat ?? y(x, z)) + 0.01, z];
      };
      const shaft = length * 0.55,
        half = 0.06,
        wing = 0.18;
      out.push(...at(0, -half), ...at(shaft, -half), ...at(shaft, half));
      out.push(...at(0, -half), ...at(shaft, half), ...at(0, half));
      out.push(...at(shaft, -wing), ...at(length, 0), ...at(shaft, wing));
    };
    const ux = dirX(climb),
      uz = dirZ(climb);
    arrow(cx - ux * 0.35, cz - uz * 0.35, ux, uz, 0.7);
    const sides = climb === DIR_N || climb === DIR_S ? [DIR_W, DIR_E] : [DIR_N, DIR_S];
    for (const side of sides as Dir[]) {
      if (grid.flightAt(tx + dirX(side), tz + dirZ(side), level) === climb) continue;
      const sx = dirX(side),
        sz = dirZ(side);
      // Vom Rand der Treppe ein Stück hinaus: hier geht es herunter.
      // Flach auf der Höhe der Treppe an diesem Rand — nicht schräg hinunter
      // bis auf den Boden daneben.
      const fromX = cx + sx * 0.25,
        fromZ = cz + sz * 0.25;
      arrow(fromX, fromZ, sx, sz, 0.5, y(fromX, fromZ));
    }
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const one of [this.cells, this.lines, this.arrows]) {
      one.geometry.dispose();
      (one.material as THREE.Material).dispose();
    }
  }
}

/**
 * Die Zahlen in den Puffer eines Attributs schreiben — ein neuer, größerer
 * Puffer nur, wenn der alte nicht reicht. Gibt den Puffer zurück.
 */
function write(
  shape: THREE.BufferGeometry,
  name: 'position' | 'color',
  buffer: Float32Array<ArrayBuffer>,
  values: readonly number[],
): Float32Array<ArrayBuffer> {
  let target = buffer;
  if (values.length > buffer.length || !shape.getAttribute(name)) {
    target = new Float32Array(Math.max(3, Math.ceil(values.length * 1.25)));
    shape.setAttribute(name, new THREE.BufferAttribute(target, 3).setUsage(THREE.DynamicDrawUsage));
  }
  target.set(values);
  const attribute = shape.getAttribute(name);
  attribute.needsUpdate = true;
  if (name === 'position') shape.setDrawRange(0, values.length / 3);
  return target;
}
