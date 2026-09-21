import {
  RECORD_RATE,
  Recorder,
  formatDuration,
  isPlayable,
  lerpAngle,
  poseAt,
  propPoseAt,
  readRecording,
  type PoseSample,
  type PropSample,
} from './npcRecording';

const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

function pose(x: number, yaw = 0): PoseSample {
  return {
    feet: { x, y: 0, z: 0 },
    yaw,
    head: { position: { x, y: 1.6, z: 0 }, quaternion: IDENTITY },
    left: { position: { x: x - 0.3, y: 1, z: -0.2 }, quaternion: IDENTITY },
    right: null,
  };
}

function blanket(x: number, held: boolean): PropSample {
  return {
    id: 'prop-7',
    kind: 'blanket',
    held,
    position: { x, y: 0.8, z: -0.5 },
    quaternion: IDENTITY,
  };
}

describe('Der Rekorder', () => {
  it('schreibt höchstens mit seiner Abtastrate', () => {
    const recorder = new Recorder('dummy');
    let written = 0;
    // Neunzig Bilder je Sekunde, eine Sekunde lang.
    for (let i = 0; i <= 90; i++) {
      if (recorder.sample(i / 90, pose(i / 90), [])) written++;
    }
    // Die Rate ist eine Obergrenze: Bei neunzig Bildern je Sekunde fällt die
    // nächste Probe auf das erste Bild *nach* der Frist, also alle fünf Bilder.
    expect(written).toBeGreaterThanOrEqual(RECORD_RATE - 3);
    expect(written).toBeLessThanOrEqual(RECORD_RATE + 1);
    expect(recorder.finish().duration).toBeCloseTo(1, 1);
  });

  it('legt den Nullpunkt auf die erste Probe, nicht auf die Uhr', () => {
    const recorder = new Recorder('dummy');
    recorder.sample(1000, pose(0), []);
    recorder.sample(1000.5, pose(1), []);
    const recording = recorder.finish();
    expect(recording.frames[0]!.t).toBe(0);
    expect(recording.frames[1]!.t).toBe(0.5);
    expect(recording.duration).toBe(0.5);
  });

  it('führt ein angefasstes Ding als Spur mit Sorte und Id', () => {
    const recorder = new Recorder('dummy');
    recorder.sample(0, pose(0), []);
    recorder.sample(0.1, pose(0), [blanket(0, true)]);
    recorder.sample(0.2, pose(0), [blanket(0.5, false)]);
    const recording = recorder.finish();
    expect(recording.props).toHaveLength(1);
    const track = recording.props[0]!;
    expect(track.id).toBe('prop-7');
    expect(track.kind).toBe('blanket');
    expect(track.frames.map((frame) => frame.held)).toEqual([true, false]);
    expect(track.frames[1]!.pose[0]).toBe(0.5);
  });

  it('hört von selbst auf, wenn die Grenze erreicht ist', () => {
    const recorder = new Recorder('dummy', 20, 1);
    expect(recorder.sample(0, pose(0), [])).toBe(true);
    expect(recorder.sample(0.5, pose(0), [])).toBe(true);
    expect(recorder.sample(2, pose(0), [])).toBe(false);
    expect(recorder.full).toBe(true);
    expect(recorder.elapsed).toBe(1);
  });

  it('rundet auf Millimeter', () => {
    const recorder = new Recorder('dummy');
    recorder.sample(0, { ...pose(0), feet: { x: 1.23456, y: 0, z: 0 } }, []);
    expect(recorder.finish().frames[0]!.feet[0]).toBe(1.235);
  });
});

describe('Lesen zwischen den Bildern', () => {
  const recorder = new Recorder('dummy');
  recorder.sample(0, pose(0, 0), [blanket(0, true)]);
  recorder.sample(1, pose(2, Math.PI / 2), [blanket(1, false)]);
  const recording = recorder.finish();

  it('rechnet die Mitte', () => {
    const at = poseAt(recording, 0.5)!;
    expect(at.feet[0]).toBeCloseTo(1);
    expect(at.yaw).toBeCloseTo(Math.PI / 4);
    expect(at.head[1]).toBeCloseTo(1.6);
    expect(at.left![0]).toBeCloseTo(0.7);
    expect(at.right).toBeNull();
  });

  it('hält vor dem ersten und nach dem letzten Bild fest', () => {
    expect(poseAt(recording, -1)!.feet[0]).toBe(0);
    expect(poseAt(recording, 5)!.feet[0]).toBe(2);
  });

  it('bringt die Drehung normiert zurück', () => {
    const at = poseAt(recording, 0.3)!;
    const [, , , qx, qy, qz, qw] = at.head;
    expect(Math.hypot(qx, qy, qz, qw)).toBeCloseTo(1);
  });

  it('führt ein Ding mit und sagt, ob es gehalten wurde', () => {
    const track = recording.props[0]!;
    expect(propPoseAt(track, 0.25)!.pose[0]).toBeCloseTo(0.25);
    expect(propPoseAt(track, 0.25)!.held).toBe(true);
    expect(propPoseAt(track, 0.75)!.held).toBe(false);
  });

  it('kennt eine leere Aufnahme', () => {
    const empty = new Recorder('dummy').finish();
    expect(poseAt(empty, 0)).toBeNull();
    expect(isPlayable(empty)).toBe(false);
    expect(isPlayable(recording)).toBe(true);
  });
});

describe('Der Winkel dazwischen', () => {
  it('geht über den kürzeren Bogen', () => {
    expect(lerpAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5)).toBeCloseTo(Math.PI);
    expect(lerpAngle(0, 1, 0.25)).toBeCloseTo(0.25);
  });
});

describe('Was aus dem Speicher kommt', () => {
  it('liest eine eigene Aufnahme wieder ein', () => {
    const recorder = new Recorder('hamster');
    recorder.sample(0, pose(0), [blanket(0, true)]);
    recorder.sample(0.5, pose(1), [blanket(0.2, false)]);
    const recording = recorder.finish();
    const read = readRecording(JSON.parse(JSON.stringify(recording)));
    expect(read).toEqual(recording);
  });

  it('lehnt Unsinn ab, statt ihn zu reparieren', () => {
    expect(readRecording(null)).toBeNull();
    expect(readRecording({ version: 99, kind: 'dummy', frames: [], props: [] })).toBeNull();
    expect(
      readRecording({
        version: 1,
        kind: 'dummy',
        frames: [{ t: 0, feet: [0, null, 0], yaw: 0, head: [0, 0, 0, 0, 0, 0, 1] }],
        props: [],
      }),
    ).toBeNull();
    expect(
      readRecording({
        version: 1,
        kind: 'dummy',
        frames: [],
        props: [{ id: 'x', kind: 'cube', frames: [{ t: 0, pose: [0, 0, 0], held: true }] }],
      }),
    ).toBeNull();
  });
});

describe('Die Dauer als Text', () => {
  it('schreibt Minuten und Sekunden', () => {
    expect(formatDuration(7.4)).toBe('0:07');
    expect(formatDuration(92)).toBe('1:32');
    expect(formatDuration(-1)).toBe('0:00');
  });
});
