import * as THREE from 'three';
import { readFaces, type DieFace, type Vec3 } from './diceFaces';

/**
 * **Die fünf platonischen Körper**, und zwar als das, wofür man sie kennt: als
 * Würfelsatz.
 *
 * Ein Tetraeder ohne Zahlen ist ein grüner Klumpen. Erst die Augenzahl macht
 * daraus einen W4, und damit etwas, das man wirft und abliest, statt es nur
 * anzusehen. Die Zahlen werden nicht aufgeklebt, sondern **gerechnet**: Jede
 * Fläche des Netzes bekommt ihre Zelle in einer Textur, und die Ecken der
 * Fläche werden in diese Zelle projiziert (`applyFaceUVs`). Damit funktioniert
 * derselbe Code für vier Dreiecke wie für zwölf Fünfecke, und niemand muss von
 * Hand ein UV-Netz für einen Ikosaeder zeichnen.
 *
 * Wer welche Zahl trägt, steht in `diceFaces.ts` (mit Test): gegenüberliegende
 * Flächen ergeben zusammen `n + 1`, wie auf einem echten Würfel.
 *
 * Der Collider ist die **konvexe Hülle** der Ecken und keine Kugel. Das ist der
 * Unterschied zwischen einem Würfel, der ausrollt und liegen bleibt, und einer
 * Murmel, die nie zur Ruhe kommt — bei einem W20 sieht man das sofort.
 */
export type DieKind = 'd4' | 'd6' | 'd8' | 'd12' | 'd20';

export interface DieStyle {
  /** Wie viele Flächen — und damit, welcher Körper. */
  faces: number;
  /** Halber Durchmesser über Eck, in Metern. */
  radius: number;
  label: string;
  /** Die Farbe des Körpers; die Zahlen stehen hell darauf. */
  color: number;
  mass: number;
}

/**
 * Der Satz, wie er im Beutel liegt. Alle etwa gleich groß und deutlich größer
 * als echte Würfel: was man mit Handschuhen greifen und aus zwei Metern ablesen
 * soll, ist in Originalgröße ein Krümel.
 */
export const DICE: Record<DieKind, DieStyle> = {
  d4: { faces: 4, radius: 0.1, label: 'W4 · Tetraeder', color: 0x5ee0a0, mass: 1 },
  d6: { faces: 6, radius: 0.095, label: 'W6 · Hexaeder', color: 0xff5f57, mass: 1.4 },
  d8: { faces: 8, radius: 0.095, label: 'W8 · Oktaeder', color: 0x4aa8ff, mass: 1.2 },
  d12: { faces: 12, radius: 0.095, label: 'W12 · Dodekaeder', color: 0x9d7bff, mass: 1.6 },
  d20: { faces: 20, radius: 0.1, label: 'W20 · Ikosaeder', color: 0xffc857, mass: 1.8 },
};

/**
 * Wie hoch die Zahl in ihrer Zelle steht, als Anteil der Zellkante.
 *
 * Sie muss in den **Innenkreis** der Fläche passen, und der ist beim Dreieck
 * halb so groß wie der Außenkreis, beim Fünfeck aber vier Fünftel davon. Ein
 * einziger Wert für alle fünf Würfel hieße: entweder eine Zahl, die beim W20
 * über die Kante läuft, oder eine, die auf dem W12 verloren aussieht. Der W20
 * bekommt zusätzlich weniger ab, weil zweistellige Zahlen breiter sind.
 */
const FONT_SCALE: Record<DieKind, number> = {
  d4: 0.28,
  d6: 0.38,
  d8: 0.28,
  d12: 0.42,
  d20: 0.22,
};

/** Kantenlänge einer Zelle in der Zahlen-Textur, in Pixeln. */
const CELL = 192;
/**
 * Wie viel der Zelle die Fläche selbst einnimmt. Der Rest ist Rand — ohne ihn
 * blutet beim Verkleinern die Nachbarzelle in die Fläche hinein.
 */
const FILL = 0.42;

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _centre = new THREE.Vector3();
const _u = new THREE.Vector3();
const _v = new THREE.Vector3();
const _point = new THREE.Vector3();
const _hsl = { h: 0, s: 0, l: 0 };

/**
 * Die Zahlen-Texturen, einmal gebaut und dann geteilt.
 *
 * Ein W20 kostet eine Leinwand von rund einem Megapixel, und ein Beutel voller
 * Miniaturen baut jeden Würfel noch einmal. Materialien gehören weiter jedem
 * Würfel selbst — die werden beim Aufräumen freigegeben —, die Textur darin ist
 * dieselbe.
 */
const textures = new Map<DieKind, THREE.CanvasTexture>();

/** Ein Würfel: Körper, Zahlen, und die Ecken für seinen Collider. */
export function createDie(kind: DieKind): THREE.Mesh {
  const style = DICE[kind];
  const geometry = dieGeometry(kind, style.radius);
  const faces = readFaces(triangleNormals(geometry));
  const columns = Math.ceil(Math.sqrt(faces.length));
  const rows = Math.ceil(faces.length / columns);
  // Der Würfel behält seine eigenen UVs (siehe `applyBoxUVs`), alle anderen
  // bekommen ihre gerechnet.
  if (kind === 'd6') applyBoxUVs(geometry, faces, columns, rows);
  else applyFaceUVs(geometry, faces, columns, rows);

  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      map: dieTexture(kind, faces.length, columns, rows),
      roughness: 0.32,
      metalness: 0.12,
    }),
  );
  mesh.name = `die-${kind}`;
  return mesh;
}

function dieGeometry(kind: DieKind, radius: number): THREE.BufferGeometry {
  switch (kind) {
    case 'd4':
      return new THREE.TetrahedronGeometry(radius).toNonIndexed();
    case 'd6': {
      // Über Eck gemessen wie die anderen: die Kante ist die Diagonale des
      // Würfels durch die Wurzel aus drei.
      const edge = (radius * 2) / Math.sqrt(3);
      return new THREE.BoxGeometry(edge, edge, edge).toNonIndexed();
    }
    case 'd8':
      return new THREE.OctahedronGeometry(radius).toNonIndexed();
    case 'd12':
      return new THREE.DodecahedronGeometry(radius).toNonIndexed();
    case 'd20':
      return new THREE.IcosahedronGeometry(radius).toNonIndexed();
  }
}

/** Die Normale jedes Dreiecks, aus den Ecken gerechnet. */
function triangleNormals(geometry: THREE.BufferGeometry): Vec3[] {
  const position = geometry.getAttribute('position');
  const normals: Vec3[] = [];
  for (let index = 0; index < position.count; index += 3) {
    _a.fromBufferAttribute(position, index);
    _b.fromBufferAttribute(position, index + 1);
    _c.fromBufferAttribute(position, index + 2);
    _normal.copy(_b).sub(_a).cross(_c.sub(_a)).normalize();
    normals.push([_normal.x, _normal.y, _normal.z]);
  }
  return normals;
}

/**
 * Legt jede Fläche in ihre Zelle der Textur.
 *
 * In der Ebene der Fläche wird ein eigenes Koordinatenkreuz aufgespannt, und
 * darin liegt jede Ecke irgendwo im Einheitskreis. Diesen Kreis in die Zelle zu
 * legen ist der ganze Rest, und er ist für ein Dreieck derselbe wie für ein
 * Fünfeck.
 *
 * **Wo oben ist**, ist dabei die eigentliche Arbeit. Zeigte das Kreuz einfach
 * zur ersten Ecke, stünde jede Zahl anders herum — der Netzbauer sortiert seine
 * Ecken nach seiner Rechnung und nicht danach, wie ein Würfel gelesen wird. Also
 * steht die Zahl auf der **ersten Kante**: das Lot von ihr zur Mitte ist oben.
 * Auf einem Dreieck sitzt die Zahl damit auf einer Kante und hat eine Ecke über
 * sich, auf Quadrat und Fünfeck steht sie waagerecht auf einer Seite — genau
 * das, was man von einem Würfel kennt.
 */
function applyFaceUVs(
  geometry: THREE.BufferGeometry,
  faces: readonly DieFace[],
  columns: number,
  rows: number,
): void {
  const position = geometry.getAttribute('position');
  const uv = new Float32Array(position.count * 2);

  for (const face of faces) {
    const corners = faceCorners(position, face);
    _centre.set(0, 0, 0);
    for (const corner of corners) _centre.add(corner);
    _centre.multiplyScalar(1 / corners.length);

    _normal.set(face.normal[0], face.normal[1], face.normal[2]);
    // Oben ist von der Mitte der ersten Kante weg; rechts steht senkrecht
    // darauf, und zwar so herum, dass die Zahl nicht spiegelverkehrt steht.
    _v.copy(corners[0]!)
      .add(corners[1] ?? corners[0]!)
      .multiplyScalar(0.5);
    _v.sub(_centre).negate().normalize();
    _u.copy(_v).cross(_normal).normalize();

    let reach = 1e-6;
    for (const corner of corners) reach = Math.max(reach, corner.distanceTo(_centre));

    // Die Zelle der Augenzahl: Zahl 1 sitzt oben links, dann zeilenweise.
    const cell = face.number - 1;
    const column = cell % columns;
    const row = Math.floor(cell / columns);

    for (const triangle of face.triangles) {
      for (let corner = 0; corner < 3; corner++) {
        const index = triangle * 3 + corner;
        _point.fromBufferAttribute(position, index).sub(_centre);
        const x = (_point.dot(_u) / reach) * FILL + 0.5;
        const y = (_point.dot(_v) / reach) * FILL + 0.5;
        uv[index * 2] = (column + x) / columns;
        // Bildzeilen zählen von oben, UV von unten.
        uv[index * 2 + 1] = 1 - (row + 1 - y) / rows;
      }
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/**
 * Der Würfel bringt sein UV-Netz schon mit — hier wird es nur in die Zellen
 * gefaltet.
 *
 * Die gerechnete Fassung stellt jede Zahl auf die *erste* Kante der Fläche, und
 * beim Kasten ist das die linke: three.js reiht die vier Ecken einer Seite
 * zeilenweise auf, nicht ringsherum. Die Zahl läge damit quer, und das sieht man
 * ausgerechnet dem Würfel an, den jeder kennt. Sein eigenes Netz kennt dagegen
 * ein Oben — deshalb sitzen Beschriftungen auf einer Kiste seit jeher richtig
 * herum.
 */
function applyBoxUVs(
  geometry: THREE.BufferGeometry,
  faces: readonly DieFace[],
  columns: number,
  rows: number,
): void {
  const source = geometry.getAttribute('uv');
  const uv = new Float32Array(source.count * 2);
  // Die Fläche füllt in der Zelle denselben Kreis wie sonst: über Eck `FILL`,
  // und damit über die Kante das durch die Wurzel aus zwei.
  const span = (FILL * 2) / Math.SQRT2;

  for (const face of faces) {
    const cell = face.number - 1;
    const column = cell % columns;
    const row = Math.floor(cell / columns);
    for (const triangle of face.triangles) {
      for (let corner = 0; corner < 3; corner++) {
        const index = triangle * 3 + corner;
        const x = 0.5 + (source.getX(index) - 0.5) * span;
        const y = 0.5 + (source.getY(index) - 0.5) * span;
        uv[index * 2] = (column + x) / columns;
        uv[index * 2 + 1] = 1 - (row + 1 - y) / rows;
      }
    }
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Die Ecken einer Fläche, jede nur einmal — der Mittelpunkt soll nicht kippen. */
function faceCorners(
  position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  face: DieFace,
): THREE.Vector3[] {
  const corners: THREE.Vector3[] = [];
  for (const triangle of face.triangles) {
    for (let corner = 0; corner < 3; corner++) {
      const point = new THREE.Vector3().fromBufferAttribute(position, triangle * 3 + corner);
      if (!corners.some((known) => known.distanceToSquared(point) < 1e-10)) corners.push(point);
    }
  }
  return corners;
}

/** Die Leinwand mit den Zahlen — eine Zelle je Augenzahl. */
function dieTexture(
  kind: DieKind,
  faces: number,
  columns: number,
  rows: number,
): THREE.CanvasTexture {
  const known = textures.get(kind);
  if (known) return known;

  const canvas = document.createElement('canvas');
  canvas.width = columns * CELL;
  canvas.height = rows * CELL;
  const ctx = canvas.getContext('2d')!;

  const body = new THREE.Color(DICE[kind].color);
  ctx.fillStyle = `#${body.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Die Zahl steht in Schwarz oder Weiß auf der Fläche, nie in einer dritten
  // Farbe: ein W20 wird aus zwei Metern gelesen, und dabei zählt der Kontrast.
  const light = body.getHSL(_hsl).l > 0.62;
  ctx.fillStyle = light ? '#141821' : '#f6f8ff';
  ctx.strokeStyle = ctx.fillStyle;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(CELL * FONT_SCALE[kind])}px "Segoe UI", system-ui, sans-serif`;

  for (let number = 1; number <= faces; number++) {
    const x = ((number - 1) % columns) * CELL + CELL / 2;
    const y = Math.floor((number - 1) / columns) * CELL + CELL / 2;
    ctx.fillText(String(number), x, y);
    // 6 und 9 sind auf einem Würfel dasselbe Zeichen, einmal gedreht — deshalb
    // trägt jeder echte Würfel den Strich darunter.
    if (number !== 6 && number !== 9) continue;
    const width = ctx.measureText(String(number)).width;
    const below = y + CELL * FONT_SCALE[kind] * 0.46;
    ctx.lineWidth = Math.max(2, CELL * FONT_SCALE[kind] * 0.08);
    ctx.beginPath();
    ctx.moveTo(x - width * 0.55, below);
    ctx.lineTo(x + width * 0.55, below);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  textures.set(kind, texture);
  return texture;
}
