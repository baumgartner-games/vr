import { matchAxes, type Basis, type Vec3 } from './axisMatch';

const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };
const UP: Vec3 = { x: 0, y: 1, z: 0 };
/** Towards the player — the third axis of a right-handed view frame. */
const BACK: Vec3 = { x: 0, y: 0, z: 1 };
const VIEW: Basis = [RIGHT, UP, BACK];

/** Rotation of a basis around Y, in degrees. */
function turned(degrees: number): Basis {
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [
    { x: c, y: 0, z: -s },
    { x: 0, y: 1, z: 0 },
    { x: s, y: 0, z: c },
  ];
}

function determinant(basis: Basis): number {
  const [x, y, z] = basis;
  return (
    x.x * (y.y * z.z - y.z * z.y) - x.y * (y.x * z.z - y.z * z.x) + x.z * (y.x * z.y - y.y * z.x)
  );
}

/** The frame the handles end up with: the object's axes, ordered by the view. */
function frame(object: Basis, view: Basis = VIEW): Basis {
  return matchAxes(object, view).map((entry) => {
    const axis = object[entry.axis]!;
    return { x: axis.x * entry.sign, y: axis.y * entry.sign, z: axis.z * entry.sign };
  }) as unknown as Basis;
}

describe('matchAxes', () => {
  it('leaves an object that already faces the player alone', () => {
    const match = matchAxes([RIGHT, UP, BACK], VIEW);
    expect(match).toEqual([
      { axis: 0, sign: 1 },
      { axis: 1, sign: 1 },
      { axis: 2, sign: 1 },
    ]);
  });

  it('picks the nearest axis for an object turned by 80°', () => {
    // Turned that far, the object's Z is what now points to the right.
    const match = matchAxes(turned(80), VIEW);
    expect(match[0]!.axis).toBe(2);
    expect(match[1]!.axis).toBe(1);
    expect(match[2]!.axis).toBe(0);
  });

  it('flips an axis that points away from the view', () => {
    // Turned past 90° the object's own axis runs backwards; the handle must
    // still point to the player's right.
    const match = matchAxes(turned(100), VIEW);
    const first = match[0]!;
    const object = turned(100)[first.axis]!;
    expect(object.x * first.sign).toBeGreaterThan(0);
  });

  it('never uses an axis twice', () => {
    for (const angle of [0, 17, 45, 80, 135, 190, 265, 355]) {
      const axes = matchAxes(turned(angle), VIEW).map((entry) => entry.axis);
      expect([...axes].sort()).toEqual([0, 1, 2]);
    }
  });

  it('always comes out right-handed, so it is a rotation', () => {
    for (const angle of [0, 30, 46, 91, 134, 180, 223, 300]) {
      expect(determinant(frame(turned(angle)))).toBeCloseTo(1, 6);
    }
  });

  it('keeps the object axes, only reordered', () => {
    const object = turned(37);
    for (const direction of frame(object)) {
      const best = Math.max(
        ...object.map((axis) => Math.abs(axis.x * direction.x + axis.y * direction.y + axis.z * direction.z)),
      );
      expect(best).toBeCloseTo(1, 6);
    }
  });
});
