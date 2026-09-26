import * as THREE from 'three';
import { PLAN_WALL_H } from '../../editor/levelPlan';
import { TILE } from '../../nav/navTile';
import {
  APRON,
  cutAt,
  cutOf,
  roomAt,
  spacesOf,
  tilesOf,
  type Corner,
  type HouseRoom,
  type HouseSpec,
} from '../house';

/**
 * **Die Farben des Dachs über einem Raum, den man gerade nicht sieht**: oben
 * ein dunkles Blaugrau, etwas heller als der Weltraum (0x04070c), mit Fugen;
 * die Seiten dunkler; der Rand an der Oberkante heller.
 */
const ROOF_COLOUR = 0x161d27;
const ROOF_SEAM = 0x222c3a;
const SIDE_COLOUR = 0x080c12;
const RIM_COLOUR = 0x33414f;
/** Wie groß eine Dachplatte ist, in Metern — zwei Kacheln. */
const ROOF_PLATE = 2;
/** Die Kennung des Deckels über der Einsatzzentrale; sie ist kein Raum der Station. */
const APRON_LID = 'apron';

/**
 * **Wie weit ein Deckel über die Außenwand hinausreicht**, in Metern: mehr als
 * die halbe Wand (`Wall.glb` steht mittig auf der Fuge). Draußen ist nichts,
 * was er zu viel verdecken könnte.
 */
export const LID_OUTSET = 0.35;
/** **Wie hoch der Deckel reicht** — knapp über die Wandkrone. */
export const LID_TOP = PLAN_WALL_H + 0.04;
/** Und von wo: knapp unter dem Boden. */
const LID_BOTTOM = -0.05;

/** Ein Punkt im Grundriss, in Metern. */
export interface LidPoint {
  x: number;
  z: number;
}

/**
 * **Ein Stück Deckel über einer Kachel**: ein konvexes Vieleck im Grundriss
 * und je Kante, ob dort eine Seitenwand hinunter muss (`sides[i]` gilt der
 * Kante von `outline[i]` nach `outline[i + 1]`). Innen, wo die Nachbarkachel
 * zum selben Raum gehört, braucht es keine.
 */
export interface LidPiece {
  outline: LidPoint[];
  sides: boolean[];
}

const SIDES = [
  { dx: 0, dz: -1 },
  { dx: 1, dz: 0 },
  { dx: 0, dz: 1 },
  { dx: -1, dz: 0 },
] as const;

/** Ein konvexes Vieleck an einer Halbebene `a·x + b·z ≥ c` abschneiden (Sutherland–Hodgman). */
function clip(poly: LidPoint[], a: number, b: number, c: number): LidPoint[] {
  const out: LidPoint[] = [];
  const f = (p: LidPoint): number => a * p.x + b * p.z - c;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]!,
      q = poly[(i + 1) % poly.length]!;
    const fp = f(p),
      fq = f(q);
    if (fp >= 0) out.push(p);
    if (fp >= 0 !== fq >= 0) {
      const t = fp / (fp - fq);
      out.push({ x: p.x + (q.x - p.x) * t, z: p.z + (q.z - p.z) * t });
    }
  }
  return out;
}

/**
 * **Der Deckel eines Raums, Kachel für Kachel** — die reine Rechnung hinter
 * `TopDownFog`.
 *
 * Früher lag über jedem Raum ein flaches Rechteck auf Wandhöhe, so groß wie
 * `rect`. Drei Gründe, warum die Ränder nicht sauber waren (Meldung des
 * Besitzers vom Handy):
 *
 * - **`rect` ist bei geformten Räumen nur das umschließende Rechteck**
 *   (`HouseRoom.shape`): Der Deckel lag über Nischen und Anbauten des
 *   Nachbarn, und über den Schrägen stand er als eckiger Klotz.
 * - **Die Kamera schaut schräg** (`topDownPitch`): Ein Deckel auf Wandhöhe
 *   liegt im Bild versetzt über seinem Boden. Unter seiner Kante sah man
 *   Boden, Wände und Kisten des Nachbarn als Streifen hervorschauen.
 * - **Er endete auf der Wandmitte**, auch außen: Die äußere Hälfte der Wand
 *   stand grau neben dem Dunkel.
 *
 * Jetzt ist jeder Deckel ein **Block vom Boden bis knapp über die Wand**,
 * genau über den Kacheln des Raums: Durch seine Seiten sieht man aus keinem
 * Winkel in den Raum. Zu einem anderen Raum hin endet er auf der Wandmitte
 * (die eigene Hälfte der Wand bleibt sichtbar und zeichnet den Umriss), nach
 * draußen reicht er `LID_OUTSET` über die Wand hinaus. Eine Schrägkachel
 * trägt nur ihre innere Hälfte, schräg um `LID_OUTSET` nach außen geschoben.
 */
export function lidPieces(spec: HouseSpec, room: HouseRoom): LidPiece[] {
  const pieces: LidPiece[] = [];
  const owner = (x: number, z: number): string | null => roomAt(spec, x, z)?.id ?? null;
  for (const tile of tilesOf(room.rect)) {
    const cut = cutAt(room, tile.x, tile.z);
    if (cut === 'out') continue;
    const x0 = tile.x * TILE,
      z0 = tile.z * TILE,
      x1 = x0 + TILE,
      z1 = z0 + TILE;
    // Je Seite: gehört die Nachbarkachel zu keinem Raum, reicht der Deckel
    // über die Wand hinaus.
    const neighbour = SIDES.map((side) => owner(tile.x + side.dx, tile.z + side.dz));
    const out = neighbour.map((id) => (id === null ? LID_OUTSET : 0));
    let poly: LidPoint[] = [
      { x: x0 - out[3]!, z: z0 - out[0]! },
      { x: x1 + out[1]!, z: z0 - out[0]! },
      { x: x1 + out[1]!, z: z1 + out[2]! },
      { x: x0 - out[3]!, z: z1 + out[2]! },
    ];
    const corner: Corner | null = cut ? (cutOf(room, tile.x, tile.z)?.corner ?? null) : null;
    if (corner) {
      // Die innere Hälfte: von der abgeschnittenen Ecke weg gemessen
      // mindestens eine Kachel, abzüglich des Überstands quer zur Schräge.
      const sx = corner === 'nw' || corner === 'sw' ? 1 : -1;
      const sz = corner === 'nw' || corner === 'ne' ? 1 : -1;
      const cx = sx > 0 ? x0 : x1,
        cz = sz > 0 ? z0 : z1;
      // Nach außen (zur Ecke hin) darf das Stück über die Kachel ragen, so
      // weit der Überstand es verlangt — sonst bliebe an jeder Stufe der
      // Schräge eine Kerbe.
      const reach = LID_OUTSET * Math.SQRT2;
      const ext = [0, 0, 0, 0];
      if (neighbour[sz > 0 ? 0 : 2] === null) ext[sz > 0 ? 0 : 2] = reach;
      if (neighbour[sx > 0 ? 3 : 1] === null) ext[sx > 0 ? 3 : 1] = reach;
      poly = [
        { x: x0 - Math.max(out[3]!, ext[3]!), z: z0 - Math.max(out[0]!, ext[0]!) },
        { x: x1 + Math.max(out[1]!, ext[1]!), z: z0 - Math.max(out[0]!, ext[0]!) },
        { x: x1 + Math.max(out[1]!, ext[1]!), z: z1 + Math.max(out[2]!, ext[2]!) },
        { x: x0 - Math.max(out[3]!, ext[3]!), z: z1 + Math.max(out[2]!, ext[2]!) },
      ];
      poly = clip(poly, sx, sz, sx * cx + sz * cz + TILE - reach);
    }
    // Seitenwände nur dort, wo die Kante nicht an eine Kachel desselben
    // Raums stößt.
    const sides = poly.map((p, i) => {
      const q = poly[(i + 1) % poly.length]!;
      const eps = 1e-6;
      const on = [
        Math.abs(p.z - z0) < eps && Math.abs(q.z - z0) < eps,
        Math.abs(p.x - x1) < eps && Math.abs(q.x - x1) < eps,
        Math.abs(p.z - z1) < eps && Math.abs(q.z - z1) < eps,
        Math.abs(p.x - x0) < eps && Math.abs(q.x - x0) < eps,
      ];
      const side = on.indexOf(true);
      return side < 0 || neighbour[side] !== room.id;
    });
    pieces.push({ outline: poly, sides });
  }
  return pieces;
}

/** Ob ein Punkt in einem der Stücke liegt (für die Prüfung). */
export function lidCovers(pieces: readonly LidPiece[], at: LidPoint): boolean {
  return pieces.some((piece) => {
    const poly = piece.outline;
    let sign = 0;
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i]!,
        q = poly[(i + 1) % poly.length]!;
      const cross = (q.x - p.x) * (at.z - p.z) - (q.z - p.z) * (at.x - p.x);
      if (Math.abs(cross) < 1e-9) continue;
      const s = Math.sign(cross);
      if (sign && s !== sign) return false;
      sign = s;
    }
    return true;
  });
}

/**
 * **Die Stücke als ein Block**: Deckfläche (Gruppe 0, mit Plattenmaß in `uv`:
 * eine Einheit je `ROOF_PLATE` Meter, in Weltkoordinaten, damit die Fugen
 * über alle Räume durchlaufen) und Seitenwände (Gruppe 1), ohne Boden.
 */
export function lidGeometry(pieces: readonly LidPiece[]): THREE.BufferGeometry {
  const top: number[] = [];
  const sides: number[] = [];
  for (const { outline, sides: walls } of pieces) {
    const p0 = outline[0]!;
    for (let i = 1; i + 1 < outline.length; i++) {
      const a = outline[i]!,
        b = outline[i + 1]!;
      // Von oben gegen den Uhrzeigersinn: Die Umrisse laufen Nordwest, Nordost,
      // Südost — von oben gesehen im Uhrzeigersinn —, also andersherum.
      top.push(p0.x, LID_TOP, p0.z, b.x, LID_TOP, b.z, a.x, LID_TOP, a.z);
    }
    outline.forEach((p, i) => {
      if (!walls[i]) return;
      const q = outline[(i + 1) % outline.length]!;
      sides.push(p.x, LID_BOTTOM, p.z, q.x, LID_BOTTOM, q.z, q.x, LID_TOP, q.z);
      sides.push(p.x, LID_BOTTOM, p.z, q.x, LID_TOP, q.z, p.x, LID_TOP, p.z);
    });
  }
  const positions = [...top, ...sides];
  const uv: number[] = [];
  for (let i = 0; i < positions.length; i += 3)
    uv.push(positions[i]! / ROOF_PLATE, positions[i + 2]! / ROOF_PLATE);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.addGroup(0, top.length / 3, 0);
  geometry.addGroup(top.length / 3, sides.length / 3, 1);
  geometry.computeBoundingSphere();
  return geometry;
}

/** Die Oberkanten eines Blocks, wo er an etwas anderes stößt — als Strecken für den Rand. */
function rimGeometry(pieces: readonly LidPiece[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const y = LID_TOP + 0.005;
  for (const { outline, sides } of pieces)
    outline.forEach((p, i) => {
      if (!sides[i]) return;
      const q = outline[(i + 1) % outline.length]!;
      positions.push(p.x, y, p.z, q.x, y, q.z);
    });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * **Das Plattenmuster des Dachs** — eine Platte mit heller Fuge, auf einem
 * Canvas gemalt. `null` ohne DOM (Jest); dann bleibt das Dach einfarbig.
 */
function roofTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = hex(ROOF_COLOUR);
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = hex(ROOF_SEAM);
  ctx.fillRect(0, 0, 64, 2);
  ctx.fillRect(0, 0, 2, 64);
  // Ein schwaches Innenfeld, wie eine Wartungsklappe.
  ctx.strokeStyle = hex(ROOF_SEAM);
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1;
  ctx.strokeRect(14.5, 14.5, 36, 36);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * **Von oben deckt ein Dach zu, was die Figur nicht sieht**
 * (`stationVisibility.topDownRooms`).
 *
 * Die Ansicht von oben schneidet die Decke ab (`core/cutaway.ts`), und dann
 * liegt die ganze Station offen: Nachbarräume mit Licht, Kisten und dem, was
 * darin läuft. Über jedem Raum und Gang, den die Figur nicht sieht, steht
 * deshalb ein Block vom Boden bis knapp über die Wandkrone, genau in seinem
 * Umriss (`lidPieces`): drinnen ist es Nacht, und aus keinem Winkel schaut
 * etwas darunter hervor.
 *
 * **Er soll wie das Dach der Station aussehen**, nicht wie ein schwarzes
 * Hochhaus: Die Oberseite trägt einen dunklen Stationston mit Plattenfugen
 * (`ROOF_COLOUR`, etwas heller als der Weltraum), die Seiten sind dunkler
 * (`SIDE_COLOUR`), und an der Oberkante läuft ein feiner Rand. Ganz schwarz
 * (so war es zuerst) ließen sich Oberseite und Seiten nicht unterscheiden,
 * und die Seiten weit entfernter Räume lasen sich als hohe Wände. Die Höhe
 * ist echt: `LID_TOP` = Wandhöhe + 4 cm, ohne Skalierung
 * (`topDownFog.test`).
 *
 * Die Blöcke sind nur von oben zu sehen (`setTopDown`) und tragen keine
 * Ebenenmarke — die Decke geht beim Aufschneiden weg, die Blöcke nicht.
 */
export class TopDownFog {
  readonly group = new THREE.Group();
  private readonly lids = new Map<string, THREE.Object3D>();
  private readonly texture = roofTexture();
  private readonly roof = new THREE.MeshBasicMaterial({
    color: this.texture ? 0xffffff : ROOF_COLOUR,
    map: this.texture,
    fog: false,
  });
  private readonly side = new THREE.MeshBasicMaterial({
    color: SIDE_COLOUR,
    fog: false,
    side: THREE.DoubleSide,
  });
  private readonly rim = new THREE.LineBasicMaterial({ color: RIM_COLOUR, fog: false });
  private readonly entryRoom: string;

  constructor(spec: HouseSpec) {
    this.group.name = 'top-down-fog';
    this.group.visible = false;
    this.entryRoom = spec.entryRoom;
    for (const space of spacesOf(spec)) this.lid(space.id, lidPieces(spec, space));
    // Die Zentrale reicht nach Westen, Süden und Osten über ihre Wand hinaus;
    // nach Norden liegt die Station, und dort endet sie auf der Fuge.
    const a = APRON,
      o = LID_OUTSET;
    const apron = [
      { x: a.x * TILE - o, z: a.z * TILE },
      { x: (a.x + a.w) * TILE + o, z: a.z * TILE },
      { x: (a.x + a.w) * TILE + o, z: (a.z + a.d) * TILE + o },
      { x: a.x * TILE - o, z: (a.z + a.d) * TILE + o },
    ];
    this.lid(APRON_LID, [{ outline: apron, sides: [true, true, true, true] }]);
  }

  private lid(id: string, pieces: readonly LidPiece[]): void {
    const block = new THREE.Mesh(lidGeometry(pieces), [this.roof, this.side]);
    const rim = new THREE.LineSegments(rimGeometry(pieces), this.rim);
    const holder = new THREE.Group();
    holder.name = `top-down-lid-${id}`;
    for (const part of [block, rim]) {
      part.renderOrder = 3;
      part.castShadow = false;
      part.receiveShadow = false;
      part.raycast = () => {};
      holder.add(part);
    }
    holder.visible = false;
    this.lids.set(id, holder);
    this.group.add(holder);
  }

  /**
   * Welche Räume die Figur sieht — `null` heißt alle. Die Zentrale bleibt
   * offen, solange man in der Cafeteria steht: Zwischen beiden ist Glas.
   */
  update(visible: ReadonlySet<string> | null): void {
    for (const [id, lid] of this.lids) {
      const seen = id === APRON_LID ? visible?.has(this.entryRoom) : visible?.has(id);
      lid.visible = !!visible && !seen;
    }
  }

  setTopDown(on: boolean): void {
    this.group.visible = on;
  }

  dispose(): void {
    this.group.removeFromParent();
    for (const lid of this.lids.values())
      lid.traverse((part) => (part as THREE.Mesh).geometry?.dispose());
    this.roof.dispose();
    this.side.dispose();
    this.rim.dispose();
    this.texture?.dispose();
  }
}
