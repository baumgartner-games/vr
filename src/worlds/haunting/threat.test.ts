import { freshCrew, MONSTERS, readCrew, stationOptions, type CrewState } from './mission';
import { entityReadings, readThreat, stepThreat, threatTarget, type ThreatInput } from './threat';

const stimulus: ThreatInput = {
  player: { x: 8, z: 0 },
  monster: { x: 0, z: 0 },
  speed: 0,
  crouched: false,
  flashlight: false,
  lineOfSight: false,
  insideStation: true,
};
function advance(crew: CrewState, input: ThreatInput, seconds: number): void {
  for (let i = 0; i < seconds * 20; i++) stepThreat(crew, 0.05, input);
}

describe('entity perception and evidence', () => {
  test('optional local microphone amplitude can attract a stationary entity, with bounded input and safe-mode guards', () => {
    const audible = freshCrew(),
      silent = freshCrew();
    advance(audible, { ...stimulus, noise: 0.8 }, 3);
    advance(silent, { ...stimulus, noise: NaN }, 3);
    expect(threatTarget(audible)).toEqual(stimulus.player);
    expect(threatTarget(silent)).toBeNull();
    audible.options.test = true;
    advance(audible, { ...stimulus, noise: 900 }, 3);
    expect(threatTarget(audible)).toBeNull();
    audible.options.test = false;
    audible.hidden = 'r1';
    advance(audible, { ...stimulus, noise: 900 }, 3);
    expect(threatTarget(audible)).toBeNull();
  });
  test('running creates a remembered search position; crouched movement avoids distant detection', () => {
    const runner = freshCrew(),
      quiet = freshCrew();
    advance(runner, { ...stimulus, speed: 5 }, 3);
    advance(quiet, { ...stimulus, speed: 1, crouched: true }, 3);
    expect(runner.threat.mode).toBe('hunt');
    expect(threatTarget(runner)).toEqual(stimulus.player);
    expect(threatTarget(quiet)).toBeNull();
    // Moving unseen after stopping does not grant the monster wall vision.
    advance(runner, { ...stimulus, player: { x: 20, z: 8 } }, 1);
    expect(runner.threat.mode).toBe('search');
    expect(threatTarget(runner)).toEqual(stimulus.player);
    advance(runner, { ...stimulus, player: { x: 20, z: 8 } }, 12);
    expect(runner.threat.mode).toBe('patrol');
    expect(threatTarget(runner)).toBeNull();
  });

  test('a visible flashlight reveals a stationary player, but never through a wall', () => {
    const visible = freshCrew(),
      blocked = freshCrew();
    advance(visible, { ...stimulus, flashlight: true, lineOfSight: true }, 1);
    advance(blocked, { ...stimulus, flashlight: true }, 1);
    expect(visible.threat.mode).toBe('hunt');
    expect(blocked.threat.mode).toBe('patrol');
  });

  test.each(['test', 'simulation', 'hidden', 'dead', 'outside', 'absent'] as const)(
    '%s suppresses hostile perception',
    (protection) => {
      const crew = freshCrew();
      advance(crew, { ...stimulus, speed: 5 }, 3);
      const input = { ...stimulus, speed: 5 };
      if (protection === 'test') crew.options.test = true;
      if (protection === 'simulation') crew.simulation = true;
      if (protection === 'hidden') crew.hidden = 'r0';
      if (protection === 'dead') crew.hp = 0;
      if (protection === 'outside') input.insideStation = false;
      if (protection === 'absent') input.monster = null;
      stepThreat(crew, 0.05, input);
      expect(crew.threat.mode).toBe('patrol');
      expect(threatTarget(crew)).toBeNull();
    },
  );

  test('all three entities produce distinguishable readings and ordered evidence as distance closes', () => {
    const rows = MONSTERS.map((monster) => {
      const crew = freshCrew(stationOptions({ monster: monster.id }));
      const close = entityReadings(crew, {
        observer: { x: 0, z: 0 },
        monster: { x: 1, z: 0 },
        time: 0,
      });
      const far = entityReadings(crew, {
        observer: { x: 0, z: 0 },
        monster: { x: 17, z: 0 },
        time: 0,
      });
      expect(close.sound).toBeGreaterThan(far.sound);
      expect(close.emf).toBeGreaterThan(far.emf);
      expect(close.radar?.bearing).toBeCloseTo(Math.PI / 2);
      expect(close.evidence.length).toBeGreaterThan(far.evidence.length);
      return close;
    });
    expect(rows[0]!.temperature).toBeLessThan(0);
    expect(rows[1]!.temperature).toBeGreaterThan(30);
    expect(rows[2]!.emf).toBe(5);
    expect(new Set(rows.map((row) => `${row.emf}/${row.temperature}/${row.sound}`)).size).toBe(3);
  });

  test('test mode and vent transit yield no false monster signals even with a stale monster position', () => {
    const crew = freshCrew(stationOptions({ test: true }));
    const input = {
      observer: { x: 0, z: 0 },
      monster: { x: 0, z: 0 },
      time: 99,
      roomPowered: true,
    };
    const baseline = {
      active: false,
      radar: null,
      emf: 1,
      temperature: 19,
      sound: 0,
      evidence: [],
    };
    expect(entityReadings(crew, input)).toEqual(baseline);
    crew.options.test = false;
    crew.venting = 1;
    expect(entityReadings(crew, input)).toEqual(baseline);
  });

  test('late joins bound threat snapshots and erase hostile test states', () => {
    const raw = { awareness: Infinity, memory: 900, mode: 'bad', target: { x: NaN, z: 1 } };
    expect(readThreat(raw)).toEqual({ awareness: 0, memory: 15, mode: 'patrol', target: null });
    const crew = freshCrew();
    advance(crew, { ...stimulus, speed: 5 }, 3);
    expect(readCrew(crew).threat).toEqual(crew.threat);
    crew.options.test = true;
    expect(readCrew(crew).threat.target).toBeNull();
    expect(readCrew(crew).threat.awareness).toBe(0);
  });
});
