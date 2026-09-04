import {
  HAND_FIELDS,
  HOLD_HAND_POSE,
  IDLE_HAND_POSE,
  IDLE_HAND_POSE_RIGHT,
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
  it('gibt der rechten Hand die eingemessenen sechs Zahlen', () => {
    const right = defaultIdlePose('right');
    expect(right.x).toBe(0.5);
    expect(right.y).toBe(-0.4);
    expect(right.z).toBe(1.2);
    expect(right.pitch).toBe(-90);
    expect(right.yaw).toBe(45);
    expect(right.roll).toBe(0);
    // Die Finger kommen weiter aus der gebauten Haltung — gemessen wurde, wie
    // die Hand *liegt*, nicht wie weit sie zu ist.
    expect(right.curls).toEqual(IDLE_HAND_POSE.curls);
  });

  it('ist links genau die Spiegelung von rechts', () => {
    const left = defaultIdlePose('left');
    expect(left).toEqual(mirrorHandPose(IDLE_HAND_POSE_RIGHT));
    expect(left.x).toBe(-0.5);
    expect(left.yaw).toBe(-45);
    // Quer gespiegelt, in der Höhe und der Tiefe nicht.
    expect(left.y).toBe(-0.4);
    expect(left.z).toBe(1.2);
    expect(left.pitch).toBe(-90);
  });

  it('spiegelt eine Null zu einer Null und nicht zu einer -0', () => {
    // `-0` steht sonst auf jeder Tafel und in jedem Konfig-Code der linken
    // Hand, und es liest sich wie ein Fehler.
    expect(Object.is(defaultIdlePose('left').roll, 0)).toBe(true);
  });

  it('gibt jedes Mal eine eigene Haltung heraus', () => {
    const first = defaultIdlePose('right');
    first.x = 99;
    first.curls[0] = 1;
    expect(defaultIdlePose('right').x).toBe(0.5);
    expect(IDLE_HAND_POSE_RIGHT.curls[0]).not.toBe(1);
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
