import * as THREE from 'three';
import type { Vec2 } from './kartTrack';

/**
 * **Die Fahrbahn aus der KayKit-Stadt** — `city-builder-bits/road_straight`,
 * entlang der Mittellinie gebogen.
 *
 * Gewünscht war: _„die Go-Kart-Straßen durch KayKit-Streets ersetzen."_ Die
 * Stadt bringt dafür Kacheln von einem Meter mit — eine Gerade, eine Ecke,
 * eine Kurve —, und die Bahn hier ist vier Meter breit, mit Kurven von vier,
 * sechs, neun und elf Metern Radius (`kartCourse.KART_PIECES`). Die Kurve der
 * Stadt hat genau **ein** Verhältnis von Breite zu Radius, und keines davon
 * ist eines der vier. Die Strecke nach der Kachel umzubauen hieße, das Fahren
 * umzubauen: die Rundenzeit, die Boxengasse, die Bande.
 *
 * Also wird die **Gerade** genommen und gebogen. Eine Kachel wird auf die
 * Breite der Bahn gezogen (x quer, 1 m → 4 m), in dünne Scheiben quer zur
 * Fahrtrichtung geschnitten (`sliceAlong`) und jede Scheibe auf ihre Stelle
 * der Mittellinie gelegt (`bendRoad`). Auf der Geraden ändert das nichts, in
 * der Kurve folgt jede Linie der Kachel dem Bogen: der gelbe Rand, die
 * weißen Striche, die Bordsteinkante. Heraus kommt **ein** Netz mit **einem**
 * Material für die ganze Runde — ein Zeichenaufruf, wie vorher das Band.
 *
 * **Warum schneiden.** Die Linien der Kachel sind lange Vierecke mit Ecken nur
 * an ihren Enden. Wer nur die Ecken auf den Bogen legt, bekommt Sehnen: Bei
 * vier Metern Kachel und vier Metern Radius sind das 57° mit einer geraden
 * Linie dazwischen. Zehn Scheiben je Kachel machen daraus 40 cm lange
 * Sehnen, und die sind in der engsten Kurve 5 mm vom Bogen weg.
 */

/** Wie breit die Kachel der Stadt ist, in ihren eigenen Metern. */
export const ROAD_TILE = 1;
/** Wie viele Scheiben je Kachel gebogen werden. */
export const ROAD_SLICES = 10;

type Vertex = { p: THREE.Vector3; n: THREE.Vector3; uv: THREE.Vector2 };

/**
 * **Die Geometrie in Scheiben quer zu z** — `slices` gleich breite Streifen
 * zwischen `zMin` und `zMax`, jedes Dreieck an den Grenzen zerschnitten.
 *
 * Heraus kommt eine Geometrie **ohne Index**, mit `position`, `normal` und
 * `uv`: Beim Schneiden entstehen neue Ecken, und die teilen sich mit niemandem.
 * Keine Kante eines Dreiecks reicht danach über eine Scheibengrenze hinweg.
 */
export function sliceAlong(
  source: THREE.BufferGeometry,
  slices: number,
  zMin: number,
  zMax: number,
): THREE.BufferGeometry {
  const geometry = source.index ? source.toNonIndexed() : source;
  const pos = geometry.getAttribute('position');
  const nor = geometry.getAttribute('normal');
  const uvs = geometry.getAttribute('uv');
  const out: Vertex[] = [];
  const width = (zMax - zMin) / Math.max(1, slices);
  const read = (i: number): Vertex => ({
    p: new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
    n: nor ? new THREE.Vector3(nor.getX(i), nor.getY(i), nor.getZ(i)) : new THREE.Vector3(0, 1, 0),
    uv: uvs ? new THREE.Vector2(uvs.getX(i), uvs.getY(i)) : new THREE.Vector2(),
  });
  for (let t = 0; t + 2 < pos.count; t += 3) {
    const triangle = [read(t), read(t + 1), read(t + 2)];
    const low = Math.min(...triangle.map((v) => v.p.z));
    const high = Math.max(...triangle.map((v) => v.p.z));
    const first = Math.max(0, Math.floor((low - zMin) / width));
    const last = Math.min(slices - 1, Math.floor((high - zMin) / width - 1e-9));
    for (let s = first; s <= last; s++) {
      let polygon = clip(triangle, zMin + s * width, 1);
      polygon = clip(polygon, zMin + (s + 1) * width, -1);
      for (let i = 1; i + 1 < polygon.length; i++) {
        out.push(polygon[0]!, polygon[i]!, polygon[i + 1]!);
      }
    }
  }
  if (geometry !== source) geometry.dispose();
  return fromVertices(out);
}

/**
 * **Eine Kachel nach der anderen um die Runde** — die geschnittene Kachel
 * (`sliceAlong`), `count` Mal hintereinander auf die Mittellinie gelegt.
 *
 * In der Kachel ist x quer (−½ … +½, links und rechts), z längs, y oben.
 * Aus x wird die linke Normale der Bahn mal `width`, aus z die Bogenlänge,
 * und y bleibt, nur so verschoben, dass die Oberkante des Asphalts
 * (`asphaltTop` in der Kachel) auf `top` liegt. Die Normalen drehen mit.
 *
 * Die Richtung der Normale kommt aus einer **Nachbarschaft** der Linie und
 * nicht aus dem einen Stück, auf dem der Punkt liegt: Die Mittellinie ist in
 * halben Metern abgetastet, und an jeder Stützstelle knickte die Kachel sonst
 * sichtbar ab.
 *
 * @param count wie viele Kacheln um die Runde; ohne Angabe so viele, dass eine
 *              Kachel so lang ist wie breit
 */
export function bendRoad(
  tile: THREE.BufferGeometry,
  path: readonly Vec2[],
  width: number,
  top: number,
  asphaltTop: number,
  count?: number,
): THREE.BufferGeometry {
  const walk = walker(path);
  const lap = walk.total;
  const tiles = Math.max(1, count ?? Math.round(lap / width));
  const length = lap / tiles;
  const pos = tile.getAttribute('position');
  const nor = tile.getAttribute('normal');
  const uv = tile.getAttribute('uv');
  const vertices = pos.count;
  const positions = new Float32Array(vertices * tiles * 3);
  const normals = new Float32Array(vertices * tiles * 3);
  const uvs = new Float32Array(vertices * tiles * 2);
  const half = ROAD_TILE / 2;
  for (let k = 0; k < tiles; k++) {
    for (let i = 0; i < vertices; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const along = (k + (z + half) / ROAD_TILE) * length;
      const frame = frameAt(walk, along);
      const o = (k * vertices + i) * 3;
      positions[o] = frame.x + frame.nx * x * width;
      positions[o + 1] = top + (y - asphaltTop);
      positions[o + 2] = frame.z + frame.nz * x * width;
      // Kachelbasis (x, y, z) → Bahnbasis (Normale, oben, Tangente).
      const a = nor ? nor.getX(i) : 0;
      const b = nor ? nor.getY(i) : 1;
      const c = nor ? nor.getZ(i) : 0;
      const nx = frame.nx * a + frame.tx * c;
      const nz = frame.nz * a + frame.tz * c;
      const size = Math.hypot(nx, b, nz) || 1;
      normals[o] = nx / size;
      normals[o + 1] = b / size;
      normals[o + 2] = nz / size;
      if (uv) {
        uvs[(k * vertices + i) * 2] = uv.getX(i);
        uvs[(k * vertices + i) * 2 + 1] = uv.getY(i);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Wie weit die Nachbarschaft für die Richtung reicht, in Metern. */
const FRAME_REACH = 0.3;

/**
 * **Die Mittellinie zum Nachschlagen** — die Bogenlänge an jeder Stützstelle,
 * einmal gerechnet. `kartTrack.pointAlong` läuft für jeden Punkt die ganze
 * Runde ab; hier wird für zigtausend Ecken gefragt, also wird gesucht.
 */
interface Walker {
  readonly path: readonly Vec2[];
  readonly at: Float64Array;
  readonly total: number;
}

function walker(path: readonly Vec2[]): Walker {
  const at = new Float64Array(path.length + 1);
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    at[i + 1] = at[i]! + Math.hypot(b.x - a.x, b.z - a.z);
  }
  return { path, at, total: at[path.length]! };
}

/** Der Punkt nach `along` Metern um die Runde. */
function walkTo(walk: Walker, along: number): { x: number; z: number } {
  const { path, at, total } = walk;
  if (path.length === 0 || total <= 0) return { x: path[0]?.x ?? 0, z: path[0]?.z ?? 0 };
  const wanted = ((along % total) + total) % total;
  let low = 0;
  let high = path.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (at[mid]! <= wanted) low = mid;
    else high = mid - 1;
  }
  const a = path[low]!;
  const b = path[(low + 1) % path.length]!;
  const span = at[low + 1]! - at[low]!;
  const t = span > 0 ? (wanted - at[low]!) / span : 0;
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}

/** Stelle und geglättete Richtung der Mittellinie nach `along` Metern. */
function frameAt(
  walk: Walker,
  along: number,
): { x: number; z: number; tx: number; tz: number; nx: number; nz: number } {
  const at = walkTo(walk, along);
  const back = walkTo(walk, along - FRAME_REACH);
  const ahead = walkTo(walk, along + FRAME_REACH);
  const dx = ahead.x - back.x;
  const dz = ahead.z - back.z;
  const length = Math.hypot(dx, dz) || 1;
  const tx = dx / length;
  const tz = dz / length;
  return { x: at.x, z: at.z, tx, tz, nx: tz, nz: -tx };
}

/**
 * Ein Vieleck an der Ebene `z = limit` beschneiden (Sutherland–Hodgman).
 * `keep = 1` behält, was darüber liegt, `keep = -1`, was darunter liegt.
 */
function clip(polygon: readonly Vertex[], limit: number, keep: 1 | -1): Vertex[] {
  const out: Vertex[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i]!;
    const b = polygon[(i + 1) % polygon.length]!;
    const da = (a.p.z - limit) * keep;
    const db = (b.p.z - limit) * keep;
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push({
        p: a.p.clone().lerp(b.p, t),
        n: a.n.clone().lerp(b.n, t).normalize(),
        uv: a.uv.clone().lerp(b.uv, t),
      });
    }
  }
  return out;
}

function fromVertices(vertices: readonly Vertex[]): THREE.BufferGeometry {
  const positions = new Float32Array(vertices.length * 3);
  const normals = new Float32Array(vertices.length * 3);
  const uvs = new Float32Array(vertices.length * 2);
  vertices.forEach((v, i) => {
    positions.set([v.p.x, v.p.y, v.p.z], i * 3);
    normals.set([v.n.x, v.n.y, v.n.z], i * 3);
    uvs.set([v.uv.x, v.uv.y], i * 2);
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}
