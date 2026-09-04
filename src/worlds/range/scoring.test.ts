import { LEAD, PLATE_POINTS, faceHit, ringPoints } from './scoring';

const disc = { radius: 0.34, plate: false };
const plate = { radius: 0.22, plate: true };

describe('ringPoints', () => {
  it('counts the rings the face is painted with', () => {
    expect(ringPoints(0)).toBe(10);
    expect(ringPoints(0.21)).toBe(10);
    expect(ringPoints(0.3)).toBe(8);
    expect(ringPoints(0.5)).toBe(6);
    expect(ringPoints(0.7)).toBe(4);
    expect(ringPoints(1)).toBe(2);
  });
});

describe('faceHit', () => {
  it('counts a round that went straight through the middle', () => {
    const hit = faceHit({ x: 0, y: -0.4, z: 0 }, { x: 0, y: 0.4, z: 0 }, disc);
    expect(hit?.points).toBe(10);
    expect(hit?.radial).toBeCloseTo(0);
    expect(hit?.point.y).toBeCloseTo(0);
  });

  it('counts the ring a hit off centre landed in', () => {
    const hit = faceHit({ x: 0.1, y: -0.4, z: 0 }, { x: 0.1, y: 0.4, z: 0 }, disc);
    expect(hit?.radial).toBeCloseTo(0.1 / 0.34);
    expect(hit?.points).toBe(8);
  });

  it('is a miss outside the disc', () => {
    expect(faceHit({ x: 0.5, y: -0.4, z: 0 }, { x: 0.5, y: 0.4, z: 0 }, disc)).toBeNull();
  });

  it('is a miss for a round running along the face', () => {
    expect(faceHit({ x: 0, y: 0.1, z: 0 }, { x: 0, y: 0.1, z: 1 }, disc)).toBeNull();
  });

  it('is a miss for a face the round is flying away from', () => {
    expect(faceHit({ x: 0, y: 0.2, z: 0 }, { x: 0, y: 1.2, z: 0 }, disc)).toBeNull();
  });

  /**
   * The one that mattered: the physics stops the round a few centimetres in
   * front of the face, so without the lead this — a dead centre hit — was a
   * miss and the range stayed silent.
   */
  it('counts a round the physics stopped just short of the face', () => {
    const stopped = { x: 0, y: -0.045, z: 0 };
    expect(faceHit({ x: 0, y: -0.4, z: 0 }, stopped, disc, 0)).toBeNull();
    expect(faceHit({ x: 0, y: -0.4, z: 0 }, stopped, disc)?.points).toBe(10);
  });

  it('counts one that bounced back off the face as well', () => {
    const bounced = { x: 0, y: -0.11, z: 0 };
    expect(faceHit({ x: 0, y: -0.4, z: 0 }, bounced, disc)?.points).toBe(10);
  });

  it('does not reach further than the lead allows', () => {
    const short = { x: 0, y: -(LEAD + 0.05), z: 0 };
    expect(faceHit({ x: 0, y: -1, z: 0 }, short, disc)).toBeNull();
  });

  it('gives a steel plate its flat score, and only inside the square', () => {
    expect(faceHit({ x: 0, y: 0.1, z: 0.4 }, { x: 0, y: 0.1, z: -0.4 }, plate)?.points).toBe(
      PLATE_POINTS,
    );
    expect(faceHit({ x: 0.3, y: 0, z: 0.4 }, { x: 0.3, y: 0, z: -0.4 }, plate)).toBeNull();
  });
});
