import * as THREE from 'three';
import { hexCentre, type OutlineLine } from './hexRules';
import { HEX_WIDTH } from './hexView';

/**
 * **Die Umrisse der Auftragsgebiete als ein Band** (`HexlandWorld.drawQuestRims`).
 *
 * Bis Oktober 2026 lag dort je Strecke eine flache Leiste über einer dunklen,
 * breiteren — an jeder Ecke überlappten sich zwei Klötzchen, und der Saum
 * wirkte wie ein Filzstift. Gemeldet: _„Die Linien der missions gebiete sind
 * korrekt, sollten allerdings schöner gemacht werden"_.
 *
 * Jetzt werden die Strecken eines Gebiets zu Linienzügen verkettet und als
 * **ein Band mit Gehrung** gezeichnet: eine helle, schmale Linie genau an der
 * Grenze, nach innen ein weicher Schein in der Farbe des Geländes, der ins
 * Gebiet ausläuft, nach außen ein Hauch Schatten, damit sich die Linie auch auf
 * gleichfarbigem Boden abhebt. Jede Strecke weiß, auf welcher Seite ihr Gebiet
 * liegt (`OutlineLine.side`); das Band liegt immer innen. Zwei Gebiete an
 * derselben Kante leuchten so jedes in sein eigenes Feld, nicht übereinander.
 */
export interface OutlineGroup {
  colour: string;
  lines: readonly OutlineLine[];
}

/** Ein Stück Linie: von `a` nach `b`, das Gebiet links (in x/z). */
interface Segment {
  a: THREE.Vector2;
  b: THREE.Vector2;
}

/** Quer zum Band, von außen nach innen: Abstand von der Grenze, Farbe, Deckkraft. */
const PROFILE: ReadonlyArray<{ d: number; tone: 'shade' | 'core' | 'glow'; alpha: number }> = [
  { d: -0.05, tone: 'shade', alpha: 0 },
  { d: -0.012, tone: 'shade', alpha: 0.5 },
  { d: 0, tone: 'core', alpha: 1 },
  { d: 0.075, tone: 'core', alpha: 1 },
  { d: 0.085, tone: 'glow', alpha: 0.55 },
  { d: 0.34, tone: 'glow', alpha: 0 },
];

const RADIUS = HEX_WIDTH / Math.sqrt(3);
const _shade = new THREE.Color(0x10141f);
const _core = new THREE.Color();
const _glow = new THREE.Color();
const _white = new THREE.Color(0xffffff);

/**
 * Baut das Band für alle Gruppen in eine Geometrie, in `y` = 0. `origin`
 * verschiebt alles (für die Linien auf der schwebenden Kachel, die an der
 * Vorschau hängen statt am Brett).
 */
export function outlineGeometry(
  groups: readonly OutlineGroup[],
  origin: { x: number; z: number } = { x: 0, z: 0 },
): THREE.BufferGeometry {
  const positions: number[] = [];
  const colours: number[] = [];
  const index: number[] = [];
  for (const { colour, lines } of groups) {
    _glow.set(colour);
    _core.copy(_glow).lerp(_white, 0.45);
    for (const { points, closed } of chains(lines.map(toSegment))) {
      ribbon(points, closed, origin, positions, colours, index);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 4));
  geometry.setIndex(index);
  return geometry;
}

/** Das Material der Bänder: Farben je Ecke mit Deckkraft, über allem. */
export function outlineMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function corner(q: number, r: number, angle: number): THREE.Vector2 {
  const c = hexCentre(q, r, HEX_WIDTH);
  return new THREE.Vector2(c.x + Math.cos(angle) * RADIUS, c.z + Math.sin(angle) * RADIUS);
}

/** Die Strecke einer Linie, so gerichtet, dass ihr Gebiet links liegt. */
function toSegment(line: OutlineLine): Segment {
  const c = hexCentre(line.q, line.r, HEX_WIDTH);
  const mid = line.edge * (Math.PI / 3);
  let a: THREE.Vector2;
  let b: THREE.Vector2;
  if (line.spoke) {
    a = new THREE.Vector2(c.x, c.z);
    b = corner(line.q, line.r, mid + Math.PI / 6);
  } else {
    a = corner(line.q, line.r, mid - Math.PI / 6);
    b = corner(line.q, line.r, mid + Math.PI / 6);
  }
  // Ein Punkt im Gebiet: die Mitte seines Dreiecks.
  const s = line.side * (Math.PI / 3);
  const px = c.x + Math.cos(s) * RADIUS * 0.5;
  const pz = c.z + Math.sin(s) * RADIUS * 0.5;
  const cross = (b.x - a.x) * (pz - a.y) - (b.y - a.y) * (px - a.x);
  return cross >= 0 ? { a, b } : { a: b, b: a };
}

const keyOf = (p: THREE.Vector2): string => `${Math.round(p.x * 500)},${Math.round(p.y * 500)}`;

/** Die Strecken zu Linienzügen verketten — geschlossen, wo sie rundum gehen. */
function chains(segments: Segment[]): Array<{ points: THREE.Vector2[]; closed: boolean }> {
  const from = new Map<string, number[]>();
  const incoming = new Map<string, number>();
  segments.forEach((s, i) => {
    const k = keyOf(s.a);
    const list = from.get(k);
    if (list) list.push(i);
    else from.set(k, [i]);
    const e = keyOf(s.b);
    incoming.set(e, (incoming.get(e) ?? 0) + 1);
  });
  const used = new Uint8Array(segments.length);
  const out: Array<{ points: THREE.Vector2[]; closed: boolean }> = [];
  const walk = (first: number): void => {
    const points = [segments[first]!.a];
    let i = first;
    for (;;) {
      used[i] = 1;
      const s = segments[i]!;
      points.push(s.b);
      const next = from.get(keyOf(s.b))?.find((j) => !used[j]);
      if (next === undefined) break;
      i = next;
    }
    const closed = points.length > 2 && keyOf(points[0]!) === keyOf(points[points.length - 1]!);
    if (closed) points.pop();
    out.push({ points, closed });
  };
  // Erst die offenen Züge von ihrem Anfang aus, dann die Ringe.
  segments.forEach((s, i) => {
    if (!used[i] && !incoming.has(keyOf(s.a))) walk(i);
  });
  segments.forEach((_, i) => {
    if (!used[i]) walk(i);
  });
  return out;
}

/** Ein Linienzug als Band nach `PROFILE`, links (innen) der Linie. */
function ribbon(
  points: readonly THREE.Vector2[],
  closed: boolean,
  origin: { x: number; z: number },
  positions: number[],
  colours: number[],
  index: number[],
): void {
  const n = points.length;
  if (n < 2) return;
  const normal = (a: THREE.Vector2, b: THREE.Vector2): THREE.Vector2 =>
    new THREE.Vector2(-(b.y - a.y), b.x - a.x).normalize();
  const count = closed ? n + 1 : n;
  const base = positions.length / 3;
  const cols = PROFILE.length;
  for (let k = 0; k < count; k++) {
    const i = k % n;
    const p = points[i]!;
    const prev = closed || i > 0 ? points[(i - 1 + n) % n]! : null;
    const next = closed || i < n - 1 ? points[(i + 1) % n]! : null;
    const n1 = prev ? normal(prev, p) : null;
    const n2 = next ? normal(p, next) : null;
    let miter: THREE.Vector2;
    let scale = 1;
    if (n1 && n2) {
      miter = n1.clone().add(n2);
      if (miter.lengthSq() < 1e-6) miter = n1.clone();
      miter.normalize();
      scale = 1 / Math.max(0.4, miter.dot(n1));
    } else {
      miter = (n1 ?? n2)!.clone();
    }
    for (const { d, tone, alpha } of PROFILE) {
      positions.push(p.x + miter.x * d * scale - origin.x, 0, p.y + miter.y * d * scale - origin.z);
      const c = tone === 'shade' ? _shade : tone === 'core' ? _core : _glow;
      colours.push(c.r, c.g, c.b, alpha);
    }
  }
  for (let k = 0; k < count - 1; k++) {
    const a = base + k * cols;
    const b = a + cols;
    for (let j = 0; j < cols - 1; j++) {
      index.push(a + j, b + j, a + j + 1, a + j + 1, b + j, b + j + 1);
    }
  }
}
