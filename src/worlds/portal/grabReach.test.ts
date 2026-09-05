import {
  FLIGHT_CATCH,
  FLIGHT_MAX,
  FLIGHT_MIN,
  DEFAULT_NEAR_HEIGHT,
  DEFAULT_NEAR_RADIUS,
  GRAB_MARGIN,
  HANDS_TOGETHER,
  REMOTE_RANGE,
  distance,
  flightArrived,
  flightDuration,
  flightPosition,
  handsTooClose,
  nearZoneDistance,
  pickAimTarget,
  rayReach,
  reachDepth,
  spinGrab,
  type AimTarget,
  type GrabPose,
  type NearZone,
  type Quat,
  type Vec3,
} from './grabReach';

const NO_ROTATION: Quat = { x: 0, y: 0, z: 0, w: 1 };

function vec(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

/** Quaternion for a yaw of `degrees` around the world up axis. */
function yaw(degrees: number): Quat {
  const half = (degrees * Math.PI) / 180 / 2;
  return { x: 0, y: Math.sin(half), z: 0, w: Math.cos(half) };
}

function target(position: Vec3, half: Vec3, quaternion: Quat = NO_ROTATION): AimTarget {
  return { position, halfExtents: half, quaternion };
}

/** The 0.5 m companion cube, the object the pull is used on most. */
function cube(position: Vec3, quaternion: Quat = NO_ROTATION): AimTarget {
  return target(position, vec(0.25, 0.25, 0.25), quaternion);
}

/** A domino: small enough that aiming at one across the room is the hard case. */
function domino(position: Vec3, quaternion: Quat = NO_ROTATION): AimTarget {
  return target(position, vec(0.09, 0.18, 0.025), quaternion);
}

const FORWARD = vec(0, 0, -1);

describe('aiming at a prop', () => {
  it('hits a cube straight ahead and reports the distance to its front face', () => {
    const reach = rayReach(cube(vec(0, 0, -4)), vec(0, 0, 0), FORWARD);
    expect(reach).not.toBeNull();
    // 4 m to the centre, minus the half size and the aim slack.
    expect(reach!).toBeGreaterThan(3.4);
    expect(reach!).toBeLessThan(3.75);
  });

  it('misses when the ray points the other way', () => {
    expect(rayReach(cube(vec(0, 0, -4)), vec(0, 0, 0), vec(0, 0, 1))).toBeNull();
  });

  it('misses a cube the ray passes well beside', () => {
    expect(rayReach(cube(vec(2, 0, -4)), vec(0, 0, 0), FORWARD)).toBeNull();
  });

  it('ignores a prop the hand is already inside of', () => {
    // Less than 25 cm along the ray is the hand itself, not a target.
    expect(rayReach(cube(vec(0, 0, -0.1)), vec(0, 0, 0), FORWARD)).toBeNull();
  });

  it('still catches a far-off domino thanks to the widening cone', () => {
    // 15 cm beside the centre line at 8 m — well outside the 9 cm half width.
    const reach = rayReach(domino(vec(0.15, 0, -8)), vec(0, 0, 0), FORWARD);
    expect(reach).not.toBeNull();
    expect(reach!).toBeLessThan(REMOTE_RANGE);
  });

  it('does not turn the cone into a free pass for anything nearby', () => {
    expect(rayReach(domino(vec(0.6, 0, -3)), vec(0, 0, 0), FORWARD)).toBeNull();
  });

  it('respects a prop that has been rotated', () => {
    const flat = domino(vec(0, 0, -3), yaw(90));
    // Turned by 90°, the domino is 2.5 cm wide along x and 9 cm deep along z.
    expect(rayReach(flat, vec(0, 0, 0), FORWARD)).not.toBeNull();
    expect(rayReach(flat, vec(0.5, 0, 0), FORWARD)).toBeNull();
  });

  it('picks the nearest prop on the line, not the first in the list', () => {
    const far = cube(vec(0, 0, -6));
    const near = cube(vec(0, 0, -2));
    expect(pickAimTarget([far, near], vec(0, 0, 0), FORWARD)).toBe(near);
    expect(pickAimTarget([near, far], vec(0, 0, 0), FORWARD)).toBe(near);
  });

  it('drops everything past the reach of the pull', () => {
    expect(pickAimTarget([cube(vec(0, 0, -20))], vec(0, 0, 0), FORWARD)).toBeNull();
  });
});

describe('grabbing with the hand itself', () => {
  it('reports how deep the hand sits inside a cube', () => {
    expect(reachDepth(cube(vec(0, 1, 0)), vec(0, 1, 0))).toBeCloseTo(-0.25);
  });

  it('still grabs a hand just outside the box, within the margin', () => {
    const depth = reachDepth(cube(vec(0, 1, 0)), vec(0.25 + GRAB_MARGIN * 0.5, 1, 0));
    expect(depth).not.toBeNull();
    expect(depth!).toBeGreaterThan(0);
  });

  it('lets go once the hand is past the margin', () => {
    expect(reachDepth(cube(vec(0, 1, 0)), vec(0.25 + GRAB_MARGIN * 2, 1, 0))).toBeNull();
  });
});

describe('the pull itself', () => {
  it('takes longer the further away the prop is, within limits', () => {
    expect(flightDuration(0.2)).toBe(FLIGHT_MIN);
    expect(flightDuration(100)).toBe(FLIGHT_MAX);
    expect(flightDuration(4)).toBeGreaterThan(flightDuration(1));
  });

  it('starts exactly at the prop', () => {
    const out = vec(0, 0, 0);
    flightPosition(vec(1, 2, -6), vec(0, 1.2, 0), 0, out);
    expect(out).toEqual({ x: 1, y: 2, z: -6 });
  });

  it('ends exactly in the hand — the whole point of the pull', () => {
    const hand = vec(0.3, 1.2, -0.2);
    const out = vec(0, 0, 0);
    flightPosition(vec(4, 0.4, -7), hand, 1, out);
    expect(out.x).toBeCloseTo(hand.x, 6);
    expect(out.y).toBeCloseTo(hand.y, 6);
    expect(out.z).toBeCloseTo(hand.z, 6);
  });

  it('follows a hand that moves while the prop is in the air', () => {
    const out = vec(0, 0, 0);
    const moved = vec(-2, 1.6, 1);
    flightPosition(vec(4, 0.4, -7), moved, 1, out);
    expect(distance(out, moved)).toBeCloseTo(0, 6);
  });

  it('arcs above the straight line on the way over', () => {
    const from = vec(0, 1, -8);
    const hand = vec(0, 1, 0);
    const out = vec(0, 0, 0);
    flightPosition(from, hand, 0.5, out);
    expect(out.y).toBeGreaterThan(1);
    expect(out.z).toBeCloseTo(-4, 6);
  });

  it('never overshoots, however long the flight runs on', () => {
    const hand = vec(0, 1.2, 0);
    const out = vec(0, 0, 0);
    flightPosition(vec(0, 1.2, -5), hand, 1.4, out);
    expect(distance(out, hand)).toBeCloseTo(0, 6);
  });

  it('counts as arrived when the prop is in the hand, or the time is up', () => {
    const hand = vec(0, 1.2, 0);
    expect(flightArrived(vec(0, 1.2, -3), hand, 0.4)).toBe(false);
    expect(flightArrived(vec(0, 1.2, -FLIGHT_CATCH / 2), hand, 0.4)).toBe(true);
    expect(flightArrived(vec(0, 1.2, -3), hand, 1)).toBe(true);
  });
});

describe('hands that are up to something else', () => {
  it('switches the remote grab off when the free hand reaches for a held prop', () => {
    const holding = vec(0, 1.2, -0.3);
    const reaching = vec(0.1, 1.2, -0.3);
    expect(handsTooClose(holding, reaching, true)).toBe(true);
  });

  it('leaves it on while the other hand is empty', () => {
    expect(handsTooClose(vec(0, 1.2, -0.3), vec(0.1, 1.2, -0.3), false)).toBe(false);
  });

  it('leaves it on once the hands are apart again', () => {
    const apart = vec(0, 1.2, -0.3 - HANDS_TOGETHER * 2);
    expect(handsTooClose(vec(0, 1.2, -0.3), apart, true)).toBe(false);
  });

  it('copes with a hand that is not tracked at all', () => {
    expect(handsTooClose(null, vec(0, 1, 0), true)).toBe(false);
  });
});

describe('the cylinder around the player', () => {
  /** Standing at the origin on a flat floor, with the settings as they ship. */
  const zone: NearZone = {
    x: 0,
    z: 0,
    floor: 0,
    radius: DEFAULT_NEAR_RADIUS,
    height: DEFAULT_NEAR_HEIGHT,
  };

  it('takes in a domino on the floor in front of the feet', () => {
    expect(nearZoneDistance(domino(vec(0, 0.02, -0.6)), zone)).not.toBeNull();
  });

  it('leaves out one across the room', () => {
    expect(nearZoneDistance(domino(vec(0, 0.02, -4)), zone)).toBeNull();
  });

  it('measures from the box, not from its centre', () => {
    // A cube whose centre sits past the radius but whose face reaches inside.
    const gap = nearZoneDistance(cube(vec(0, 1, -(DEFAULT_NEAR_RADIUS + 0.2))), zone);
    expect(gap).not.toBeNull();
    expect(gap!).toBeCloseTo(DEFAULT_NEAR_RADIUS + 0.2 - 0.25, 6);
  });

  it('reaches further for a box turned on the diagonal', () => {
    const straight = vec(0, 1, -1.35);
    expect(nearZoneDistance(cube(straight), zone)).toBeNull();
    expect(nearZoneDistance(cube(straight, yaw(45)), zone)).not.toBeNull();
  });

  it('stops at the ceiling of the cylinder', () => {
    expect(nearZoneDistance(cube(vec(0, DEFAULT_NEAR_HEIGHT - 0.1, -0.5)), zone)).not.toBeNull();
    expect(nearZoneDistance(cube(vec(0, DEFAULT_NEAR_HEIGHT + 0.6, -0.5)), zone)).toBeNull();
  });

  it('reaches below the floor it is given — a prop in a pit is still down there', () => {
    expect(nearZoneDistance(cube(vec(0, -0.1, -0.5)), zone)).not.toBeNull();
    expect(nearZoneDistance(cube(vec(0, -1.4, -0.5)), zone)).toBeNull();
  });

  it('follows the player rather than the world origin', () => {
    const moved: NearZone = { ...zone, x: 6, z: -6 };
    expect(nearZoneDistance(cube(vec(6, 0.3, -6.4)), moved)).not.toBeNull();
    expect(nearZoneDistance(cube(vec(0, 0.3, 0)), moved)).toBeNull();
  });

  it('shrinks to nothing when the radius is turned off', () => {
    const off: NearZone = { ...zone, radius: 0 };
    expect(nearZoneDistance(domino(vec(0, 0.02, -0.6)), off)).toBeNull();
  });
});

describe('the near grab that spins around the object', () => {
  function pose(position: Vec3, rotation: Quat = NO_ROTATION): GrabPose {
    return { position, rotation };
  }

  function out(): GrabPose {
    return { position: vec(0, 0, 0), rotation: { x: 0, y: 0, z: 0, w: 1 } };
  }

  it('moves the object exactly as far as the hand moved', () => {
    const result = spinGrab(
      pose(vec(0, 0.1, -1.2)),
      pose(vec(0.2, 1.1, -0.3)),
      pose(vec(0.5, 1.4, -0.4)),
      out(),
    );
    expect(result.position.x).toBeCloseTo(0.3, 6);
    expect(result.position.y).toBeCloseTo(0.4, 6);
    expect(result.position.z).toBeCloseTo(-1.3, 6);
  });

  it('leaves the object where it is when only the wrist turns', () => {
    const start = vec(0, 0.1, -1.2);
    const hand = vec(0.2, 1.1, -0.3);
    const result = spinGrab(pose(start), pose(hand, NO_ROTATION), pose(hand, yaw(90)), out());
    expect(distance(result.position, start)).toBeCloseTo(0, 6);
    // …and turns it by exactly that angle, about its own centre.
    expect(result.rotation.y).toBeCloseTo(Math.sin(Math.PI / 4), 6);
  });

  it('carries the turn the object already had', () => {
    const result = spinGrab(
      pose(vec(0, 0.1, -1.2), yaw(90)),
      pose(vec(0, 1, 0), NO_ROTATION),
      pose(vec(0, 1, 0), yaw(90)),
      out(),
    );
    // 90° on top of 90° is a half turn: w drops to zero.
    expect(result.rotation.w).toBeCloseTo(0, 6);
    expect(Math.abs(result.rotation.y)).toBeCloseTo(1, 6);
  });

  it('holds still when the hand does', () => {
    const start = pose(vec(0.4, 0.6, -1), yaw(30));
    const hand = pose(vec(0, 1.2, -0.2), yaw(-15));
    const result = spinGrab(start, hand, hand, out());
    expect(distance(result.position, start.position)).toBeCloseTo(0, 6);
    expect(result.rotation.w).toBeCloseTo(start.rotation.w, 6);
    expect(result.rotation.y).toBeCloseTo(start.rotation.y, 6);
  });
});
