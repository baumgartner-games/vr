import { groupFaces, readFaces, type Vec3 } from './diceFaces';

/** Die sechs Seiten eines Würfels, jede als zwei Dreiecke — so kommt es aus three.js. */
const CUBE: Vec3[] = [
  [1, 0, 0],
  [1, 0, 0],
  [-1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, 1],
  [0, 0, -1],
  [0, 0, -1],
];

const S = 1 / Math.sqrt(3);
/** Die acht Flächen des Oktaeders: alle Vorzeichenkombinationen. */
const OCTA: Vec3[] = [
  [S, S, S],
  [S, S, -S],
  [S, -S, S],
  [S, -S, -S],
  [-S, S, S],
  [-S, S, -S],
  [-S, -S, S],
  [-S, -S, -S],
];

/** Und die vier des Tetraeders — keine zwei liegen sich gegenüber. */
const TETRA: Vec3[] = [
  [S, S, S],
  [S, -S, -S],
  [-S, S, -S],
  [-S, -S, S],
];

function numbers(normals: Vec3[]): number[] {
  return readFaces(normals).map((face) => face.number);
}

/** Die Fläche, die genau in die andere Richtung zeigt. */
function opposite(faces: ReturnType<typeof readFaces>, normal: Vec3): number | null {
  const found = faces.find((face) =>
    face.normal.every((value, axis) => Math.abs(value + normal[axis]!) < 1e-6),
  );
  return found ? found.number : null;
}

describe('groupFaces', () => {
  it('macht aus zwölf Dreiecken sechs Seiten', () => {
    const faces = groupFaces(CUBE);
    expect(faces).toHaveLength(6);
    for (const face of faces) expect(face.triangles).toHaveLength(2);
  });

  it('behält die Reihenfolge der Dreiecke', () => {
    const faces = groupFaces(CUBE);
    expect(faces[0]!.triangles).toEqual([0, 1]);
    expect(faces[5]!.triangles).toEqual([10, 11]);
  });

  it('lässt jedes Dreieck mit eigener Normale allein', () => {
    expect(groupFaces(OCTA)).toHaveLength(8);
  });
});

describe('numberFaces', () => {
  it('vergibt jede Zahl genau einmal', () => {
    for (const normals of [CUBE, OCTA, TETRA]) {
      const found = numbers(normals).sort((a, b) => a - b);
      expect(found).toEqual(found.map((_, index) => index + 1));
    }
  });

  it('legt gegenüberliegende Flächen auf n + 1', () => {
    for (const [normals, total] of [
      [CUBE, 6],
      [OCTA, 8],
    ] as const) {
      const faces = readFaces(normals);
      for (const face of faces) {
        expect(opposite(faces, face.normal)).toBe(total + 1 - face.number);
      }
    }
  });

  it('zählt beim Tetraeder einfach durch — dort gibt es kein Gegenüber', () => {
    expect(numbers(TETRA)).toEqual([1, 2, 3, 4]);
  });
});
