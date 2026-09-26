/**
 * **Räume dekorieren** (`decorPlace.ts`) — Stapeln auf Oberflächen, was im
 * Weg steht, und das Anheften an Wände.
 */
import {
  BLOCK_SHARE,
  MOUNT_GAP,
  MOUNT_HEIGHT,
  MOUNT_REACH,
  STACK_MAX,
  boxAround,
  coverShare,
  decorArea,
  faceYaw,
  mountBlocked,
  mountPose,
  mountSize,
  mountsOnWall,
  restOn,
  slantBlocked,
  slantMountPose,
  surfaceSpot,
  wallFaces,
  type DecorSpot,
  type SlantWall,
} from './decorPlace';

/** Ein Tisch, zwei mal eine Kachel, 80 cm hoch, mit der Mitte bei (0, 0). */
const TABLE = boxAround(0, 0.4, 0, 2, 0.8, 1);
/** Eine Tasse, zehn Zentimeter. */
const CUP = { x: 0.3, z: 0.2, halfX: 0.05, halfZ: 0.05 };
/** Ein Teppich, zwei Zentimeter. */
const RUG = boxAround(0, 0.01, 0, 3, 0.02, 2);
/** Eine Wand von West nach Ost auf der Fuge z = 2, 20 cm dick, 3 m hoch, 4 m lang. */
const WALL = boxAround(0, 1.5, 2, 4, 3, 0.2);

describe('restOn — stapeln', () => {
  it('stellt auf den Boden, wo nichts ist', () => {
    expect(restOn(CUP, 0.1, 0, [])).toEqual({ y: 0, support: -1, blocked: false });
  });

  it('stellt eine Tasse über dem Tisch auf den Tisch', () => {
    const rest = restOn(CUP, 0.1, 0, [TABLE]);
    expect(rest.y).toBeCloseTo(0.8);
    expect(rest.support).toBe(0);
    expect(rest.blocked).toBe(false);
  });

  it('nimmt die höchste Fläche unter der Mitte — Tisch auf Teppich', () => {
    const rest = restOn(CUP, 0.1, 0, [RUG, TABLE]);
    expect(rest.support).toBe(1);
    expect(rest.y).toBeCloseTo(0.8);
  });

  it('stellt einen Stuhl auf den Teppich, ohne dass der im Weg ist', () => {
    const chair = { x: 1.2, z: 0.8, halfX: 0.25, halfZ: 0.25 };
    const rest = restOn(chair, 0.9, 0, [RUG]);
    expect(rest.y).toBeCloseTo(0.02);
    expect(rest.blocked).toBe(false);
  });

  it('meldet einen Stuhl halb im Tisch als im Weg', () => {
    const chair = { x: 1.1, z: 0, halfX: 0.25, halfZ: 0.25 };
    const rest = restOn(chair, 0.9, 0, [TABLE]);
    expect(rest.support).toBe(-1);
    expect(rest.blocked).toBe(true);
  });

  it('lässt einen Stuhl, der nur knapp unter die Platte ragt, gelten', () => {
    // 2,5 cm von 50 cm Breite: fünf Prozent, unter `BLOCK_SHARE`.
    const chair = { x: 1.225, z: 0, halfX: 0.25, halfZ: 0.25 };
    expect(coverShare(chair, TABLE)).toBeLessThan(BLOCK_SHARE);
    expect(restOn(chair, 0.9, 0, [TABLE]).blocked).toBe(false);
  });

  it('stellt nichts auf eine Fläche über `STACK_MAX`', () => {
    const tall = boxAround(0, 1.25, 0, 1, 2.5, 1);
    const rest = restOn(CUP, 0.1, 0, [tall]);
    expect(STACK_MAX).toBeLessThan(2.5);
    expect(rest.support).toBe(-1);
    expect(rest.blocked).toBe(true);
  });

  it('ein Sofa auf einer Tasse balanciert — ungültig', () => {
    const cup = boxAround(0, 0.05, 0, 0.1, 0.1, 0.1);
    const sofa = { x: 0, z: 0, halfX: 1, halfZ: 0.45 };
    const rest = restOn(sofa, 0.8, 0, [cup]);
    expect(rest.support).toBe(0);
    expect(rest.blocked).toBe(true);
  });

  it('stellt kein Sofa auf einen Beistelltisch, auch wenn es halb aufliegt', () => {
    const side = boxAround(0, 0.25, 0, 0.6, 0.5, 0.6);
    const sofa = { x: 0, z: 0, halfX: 1, halfZ: 0.25 };
    expect(coverShare(sofa, side)).toBeGreaterThanOrEqual(0.3);
    expect(restOn(sofa, 0.8, 0, [side]).blocked).toBe(true);
    // Eine Tischlampe dagegen passt.
    expect(restOn({ x: 0, z: 0, halfX: 0.2, halfZ: 0.2 }, 0.5, 0, [side]).blocked).toBe(false);
  });

  it('eine Vase auf einem schmalen Brett liegt ganz auf, auch wenn das Brett klein ist', () => {
    const board = boxAround(0, 1, 0, 0.3, 0.04, 0.2);
    const vase = { x: 0, z: 0, halfX: 0.1, halfZ: 0.1 };
    expect(restOn(vase, 0.3, 0, [board])).toEqual({ y: 1.02, support: 0, blocked: false });
  });

  it('rechnet vom Boden der Etage aus, nicht von null', () => {
    const rest = restOn(CUP, 0.1, 3, [boxAround(0, 3.4, 0, 2, 0.8, 1)]);
    expect(rest.y).toBeCloseTo(3.8);
  });

  it('meldet eine Wand quer durch die Grundfläche', () => {
    const shelf = { x: 0, z: 2, halfX: 0.5, halfZ: 0.3 };
    expect(restOn(shelf, 1, 0, [WALL]).blocked).toBe(true);
  });
});

describe('surfaceSpot — Kleinkram auf Flächen', () => {
  const mug = { halfX: 0.05, halfZ: 0.05 };
  /** Ein Wandbrett an der Ostwand: 30 cm tief, einen Meter lang, auf 1,5 m. */
  const board = boxAround(3.75, 1.5, 1.5, 0.3, 0.1, 1);

  it('stellt eine Tasse auf das Wandbrett, weit weg von jeder Kachelmitte', () => {
    const spot = surfaceSpot(3.7, 1.6, mug, 0, [board]);
    expect(spot).not.toBeNull();
    expect(spot!.x).toBeGreaterThanOrEqual(3.6 + 0.05);
    expect(spot!.x).toBeLessThanOrEqual(3.9 - 0.05);
    expect(spot!.z).toBeCloseTo(1.5);
    const rest = restOn({ ...spot!, ...mug }, 0.1, 0, [board]);
    expect(rest.support).toBe(0);
    expect(rest.y).toBeCloseTo(1.55);
  });

  it('lässt zwei Tassen auf einem Tisch nebeneinander stehen', () => {
    const a = surfaceSpot(-0.4, 0, mug, 0, [TABLE])!;
    const b = surfaceSpot(0.4, 0, mug, 0, [TABLE])!;
    expect(a.x).toBeCloseTo(-0.5);
    expect(b.x).toBeCloseTo(0.5);
  });

  it('rückt an den Rand heran, aber nicht darüber hinaus', () => {
    const spot = surfaceSpot(0.99, 0.49, mug, 0, [TABLE])!;
    expect(spot.x).toBeCloseTo(0.95);
    expect(spot.z).toBeCloseTo(0.45);
  });

  it('gilt nur für Kleinkram und nur über einer Fläche', () => {
    expect(surfaceSpot(0, 0, { halfX: 0.5, halfZ: 0.4 }, 0, [TABLE])).toBeNull();
    expect(surfaceSpot(5, 5, mug, 0, [TABLE])).toBeNull();
    // Ein Teppich ist keine Fläche, auf der man Kleinkram verrückt.
    expect(surfaceSpot(0, 0, mug, 0, [RUG])).toBeNull();
  });
});

describe('mountsOnWall', () => {
  it.each([
    ['furniture-bits/pictureframe_large_A.glb', true],
    ['furniture-bits/pictureframe_small_C.glb', true],
    ['furniture-bits/pictureframe_standing_A.glb', false],
    ['dungeon/banner_red.glb', true],
    ['dungeon/torch_mounted.glb', true],
    ['holiday-bits/wall_decoration_candy_A.glb', true],
    ['furniture-bits/shelf_A_big.glb', true],
    ['furniture-bits/shelf_B_large.glb', false],
    ['furniture-bits/table_medium.glb', false],
    ['furniture-bits/lamp_standing.glb', false],
    ['dungeon/wall_doorway.glb', false],
  ])('%s → %s', (path, expected) => {
    expect(mountsOnWall(path)).toBe(expected);
  });
});

describe('wallFaces', () => {
  it('gibt einer dünnen, hohen Wand zwei Flächen, eine je Seite', () => {
    const faces = wallFaces([WALL]);
    expect(faces).toHaveLength(2);
    expect(faces.map((face) => [face.axis, face.at, face.normal])).toEqual([
      ['z', 2.1, 1],
      ['z', 1.9, -1],
    ]);
    expect(faces[0]!.from).toBeCloseTo(-2);
    expect(faces[0]!.to).toBeCloseTo(2);
  });

  it('legt Stücke derselben Wand zu einer Fläche zusammen — und lässt Lücken offen', () => {
    const pieces = [0, 1, 2, 5].map((x) => boxAround(x + 0.5, 1.4, 4, 1, 2.8, 0.2));
    const inside = wallFaces(pieces).filter((face) => face.normal === -1);
    expect(inside.map((face) => [face.from, face.to])).toEqual([
      [0, 3],
      [5, 6],
    ]);
  });

  it('kennt Wände in beiden Richtungen', () => {
    const faces = wallFaces([boxAround(3, 1.5, 0, 0.2, 3, 4)]);
    expect(faces.every((face) => face.axis === 'x')).toBe(true);
  });

  it('ein Schrank, eine Brüstung und ein Boden sind keine Wände', () => {
    expect(wallFaces([boxAround(0, 1, 0, 1, 2, 0.8)])).toEqual([]);
    expect(wallFaces([boxAround(0, 0.5, 0, 4, 1, 0.2)])).toEqual([]);
    expect(wallFaces([boxAround(0, -0.1, 0, 10, 0.2, 10)])).toEqual([]);
  });
});

describe('mountPose — an die Wand', () => {
  const faces = wallFaces([WALL]);
  const picture = mountSize(0.5, 0.35, 0.03);

  it('liest die Maße liegend wie stehend als Bild an der Wand', () => {
    expect(mountSize(0.03, 0.35, 0.5)).toEqual(picture);
    expect(picture).toEqual({ halfWidth: 0.5, halfDepth: 0.03, height: 0.7 });
  });

  it('hängt ein Bild vor der Wand an ihre Innenseite, auf Augenhöhe', () => {
    const at = mountPose(0.3, 1.6, faces, picture, 0);
    expect(at).not.toBeNull();
    expect(at!.face.normal).toBe(-1);
    expect(at!.z).toBeCloseTo(1.9 - 0.03 - MOUNT_GAP);
    expect(at!.x).toBeCloseTo(0.5);
    expect(at!.y).toBeCloseTo(MOUNT_HEIGHT);
    // Die Vorderseite (+z) zeigt nach −z, also in den Raum.
    expect(Math.abs(at!.yaw)).toBeCloseTo(Math.PI);
  });

  it('hängt es auf der anderen Seite an die Außenseite', () => {
    const at = mountPose(0, 2.5, faces, picture, 0);
    expect(at!.face.normal).toBe(1);
    expect(at!.z).toBeCloseTo(2.1 + 0.03 + MOUNT_GAP);
    expect(at!.yaw).toBeCloseTo(0);
  });

  it('findet keine Wand, die weiter weg ist als `MOUNT_REACH`', () => {
    expect(mountPose(0, 1.9 - MOUNT_REACH - 0.05, faces, picture, 0)).toBeNull();
    expect(mountPose(0, 1.9 - MOUNT_REACH + 0.05, faces, picture, 0)).not.toBeNull();
  });

  it('lässt ein Bild nicht über das Wandende hinausragen', () => {
    const at = mountPose(2.2, 1.6, faces, picture, 0);
    expect(at!.x).toBeCloseTo(1.5);
    expect(mountPose(3, 1.6, faces, picture, 0)).toBeNull();
  });

  it('trägt auf einer Fläche, die schmaler ist als das Stück, nichts', () => {
    const narrow = wallFaces([boxAround(0, 1.5, 2, 0.8, 3, 0.2)]);
    expect(mountPose(0, 1.6, narrow, picture, 0)).toBeNull();
  });

  it('hängt ein großes Stück nie mit der Unterkante unter den Boden oder über die Wand', () => {
    const banner = mountSize(0.5, 1.2, 0.05);
    const at = mountPose(0, 1.6, faces, banner, 0)!;
    expect(at.y - 1.2).toBeGreaterThanOrEqual(0.1 - 1e-9);
    const low = wallFaces([boxAround(0, 0.75, 2, 4, 1.5, 0.2)]);
    const hung = mountPose(0, 1.6, low, picture, 0)!;
    expect(hung.y + 0.35).toBeLessThanOrEqual(1.5);
  });

  it('dreht eine Datei, deren Breite entlang z liegt, eine Vierteldrehung weiter', () => {
    const face = faces[1]!;
    expect(faceYaw(face, true) - faceYaw(face, false)).toBeCloseTo(Math.PI / 2);
  });

  it('meldet ein Bild über einem schon hängenden als im Weg', () => {
    const at = mountPose(0.3, 1.6, faces, picture, 0)!;
    const hung = boxAround(at.x, at.y, at.z, 1, 0.7, 0.06);
    expect(mountBlocked(at, picture, [hung])).toBe(true);
    const beside = boxAround(at.x + 1.2, at.y, at.z, 1, 0.7, 0.06);
    expect(mountBlocked(at, picture, [beside])).toBe(false);
  });
});

describe('eine Fläche mit Stapeln und Wand (decorArea)', () => {
  const spot = (x: number, over: Partial<DecorSpot> = {}): DecorSpot => ({
    x,
    y: 0.5,
    z: 0,
    yaw: 0,
    mounted: false,
    valid: true,
    ...over,
  });

  it('setzt jede Stelle mit ihrer Lage, überspringt, was keinen Platz hat', () => {
    const placed: Array<[number, DecorSpot | null]> = [];
    const result = decorArea(
      [
        { x: 0, z: 0 },
        { x: 1, z: 0 },
        { x: 2, z: 0 },
      ],
      (slot) => (slot.x === 1 ? spot(1, { valid: false }) : slot.x === 2 ? null : spot(0)),
      (slot, at) => placed.push([slot.x, at]),
    );
    expect(result).toEqual({ placed: 2, refused: 1 });
    expect(placed[0]![1]!.y).toBe(0.5);
    expect(placed[1]![1]).toBeNull();
  });

  it('zwei Stellen an dieselbe Stelle der Wand werden ein Bild', () => {
    const placed: number[] = [];
    const result = decorArea(
      [
        { x: 0, z: 0 },
        { x: 0.2, z: 0 },
      ],
      () => spot(0, { mounted: true }),
      (slot) => placed.push(slot.x),
    );
    expect(placed).toEqual([0]);
    expect(result.placed).toBe(1);
  });

  it('fragt nacheinander — was eben stand, steht beim nächsten im Weg', () => {
    const stood: number[] = [];
    decorArea(
      [
        { x: 0, z: 0 },
        { x: 0, z: 1 },
      ],
      () => spot(0, { valid: stood.length === 0 }),
      () => stood.push(1),
    );
    expect(stood).toHaveLength(1);
  });
});

describe('an eine schräge Wand (slantMountPose)', () => {
  // „╱" durch die Kachel um (0,5 | 0,5): von Südwest nach Nordost.
  const wall: SlantWall = {
    x: 0.5,
    z: 0.5,
    dirX: Math.SQRT1_2,
    dirZ: -Math.SQRT1_2,
    half: Math.SQRT2 / 2,
    thick: 0.13,
    bottom: 0,
    top: 2.8,
  };
  const picture = mountSize(0.3, 0.25, 0.03);

  it('hängt auf der Seite, auf der der Kran steht, flach davor und auf Augenhöhe', () => {
    const pose = slantMountPose(1.0, 1.0, [wall], picture, 0)!;
    expect(pose).not.toBeNull();
    // Die Normale zeigt nach Südosten (+x, +z) …
    expect(pose.x).toBeGreaterThan(0.5);
    expect(pose.z).toBeGreaterThan(0.5);
    expect(pose.yaw).toBeCloseTo(Math.PI / 4);
    // … und das Bild liegt eine halbe Wand, eine halbe Bildtiefe und einen
    // Zentimeter vor der Mitte.
    const off = (pose.x - 0.5) * Math.SQRT1_2 + (pose.z - 0.5) * Math.SQRT1_2;
    expect(off).toBeCloseTo(0.13 + 0.03 + MOUNT_GAP);
    expect(pose.y).toBeCloseTo(MOUNT_HEIGHT);
  });

  it('von der anderen Seite zeigt es nach Nordwesten', () => {
    const pose = slantMountPose(0.0, 0.0, [wall], picture, 0)!;
    expect(pose.yaw).toBeCloseTo((-3 * Math.PI) / 4);
  });

  it('zu weit weg oder zu schmal: nichts', () => {
    expect(slantMountPose(2.5, 2.5, [wall], picture, 0)).toBeNull();
    expect(slantMountPose(1, 1, [wall], mountSize(1, 0.25, 0.03), 0)).toBeNull();
  });

  it('ein Bild über dem anderen ist rot, die Wand selbst stört nicht', () => {
    const pose = slantMountPose(1.0, 1.0, [wall], picture, 0)!;
    const self = boxAround(0.5, 1.4, 0.5, 1.1, 2.8, 1.1);
    expect(slantBlocked(pose, picture, [self])).toBe(false);
    const other = boxAround(pose.x, pose.y, pose.z, 0.4, 0.5, 0.4);
    expect(slantBlocked(pose, picture, [self, other])).toBe(true);
  });
});
