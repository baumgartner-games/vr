import {
  HAND_FIELDS,
  HOLD_HAND_POSE,
  IDLE_HAND_POSE,
  IDLE_HAND_POSE_LEFT,
  defaultIdlePose,
  formatHandPose,
  handPoseField,
  handPoseFromArray,
  handPoseToArray,
  mirrorHandPose,
  setHandPoseField,
} from './handPose';

const POSE = {
  x: 1.5,
  y: -2,
  z: 3.25,
  pitch: 12,
  yaw: -40,
  roll: 7,
  curls: [0.6, 0.2, 0.9, 0.95, 1],
  spread: 4,
};

describe('mirrorHandPose', () => {
  it('flips the sideways offset, the yaw and the roll — and nothing else', () => {
    const mirrored = mirrorHandPose(POSE);
    expect(mirrored.x).toBe(-1.5);
    expect(mirrored.yaw).toBe(40);
    expect(mirrored.roll).toBe(-7);
    expect(mirrored.y).toBe(POSE.y);
    expect(mirrored.z).toBe(POSE.z);
    expect(mirrored.pitch).toBe(POSE.pitch);
    expect(mirrored.spread).toBe(POSE.spread);
    expect(mirrored.curls).toEqual(POSE.curls);
  });

  it('mirrored twice is where it started', () => {
    expect(mirrorHandPose(mirrorHandPose(POSE))).toEqual(POSE);
  });

  it('leaves the pose it was given alone', () => {
    const source = { ...POSE, curls: [...POSE.curls] };
    mirrorHandPose(source).curls[0] = 0;
    expect(source.curls[0]).toBe(0.6);
  });
});

describe('defaultIdlePose', () => {
  it('gibt der linken Hand die nachgemessenen sechs Zahlen', () => {
    const left = defaultIdlePose('left');
    expect(left.x).toBe(-0.3);
    expect(left.y).toBe(2.7);
    expect(left.z).toBe(3.8);
    expect(left.pitch).toBe(75);
    expect(left.yaw).toBe(-45);
    expect(left.roll).toBe(5);
    // Die Finger kommen weiter aus der gebauten Haltung — gemessen wurde, wie
    // die Hand *liegt*, nicht wie weit sie zu ist.
    expect(left.curls).toEqual(IDLE_HAND_POSE.curls);
  });

  it('ist rechts genau die Spiegelung von links — dieselben Zahlen, nicht ähnliche', () => {
    const right = defaultIdlePose('right');
    expect(right).toEqual(mirrorHandPose(IDLE_HAND_POSE_LEFT));
    expect(right.x).toBe(0.3);
    expect(right.yaw).toBe(45);
    expect(right.roll).toBe(-5);
    // Quer gespiegelt, in der Höhe, der Tiefe und der Neigung nicht.
    expect(right.y).toBe(2.7);
    expect(right.z).toBe(3.8);
    expect(right.pitch).toBe(75);
  });

  it('hält beide Hände deckungsgleich: zweimal gespiegelt ist die andere', () => {
    expect(mirrorHandPose(defaultIdlePose('right'))).toEqual(defaultIdlePose('left'));
  });

  it('gibt jedes Mal eine eigene Haltung heraus', () => {
    const first = defaultIdlePose('left');
    first.x = 99;
    first.curls[0] = 1;
    expect(defaultIdlePose('left').x).toBe(-0.3);
    expect(IDLE_HAND_POSE_LEFT.curls[0]).not.toBe(1);
  });
});

describe('the config-code form', () => {
  it('round-trips through twelve numbers', () => {
    expect(handPoseToArray(POSE)).toHaveLength(12);
    expect(handPoseFromArray(handPoseToArray(POSE))).toEqual(POSE);
  });

  it('falls back to the built-in pose where an old code stops', () => {
    const pose = handPoseFromArray([1, 2, 3], HOLD_HAND_POSE);
    expect(pose.x).toBe(1);
    expect(pose.curls).toEqual(HOLD_HAND_POSE.curls);
    expect(pose.spread).toBe(HOLD_HAND_POSE.spread);
  });
});

describe('the editable fields', () => {
  it('reads and writes every field the editor offers', () => {
    for (const field of HAND_FIELDS) {
      const changed = setHandPoseField(POSE, field.key, 0.5);
      expect(handPoseField(changed, field.key)).toBe(0.5);
      // Only that one field moved.
      expect(handPoseToArray(changed).filter((v, i) => v !== handPoseToArray(POSE)[i])).toHaveLength(
        handPoseField(POSE, field.key) === 0.5 ? 0 : 1,
      );
    }
  });

  it('never writes into the pose it was handed', () => {
    setHandPoseField(POSE, 'curl2', 0);
    expect(POSE.curls[2]).toBe(0.9);
  });
});

describe('formatHandPose', () => {
  it('puts every finger on the line', () => {
    const text = formatHandPose(IDLE_HAND_POSE);
    expect(text).toContain('x 0');
    expect(text.split('/').length).toBeGreaterThanOrEqual(5);
  });
});
