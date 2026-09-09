import { freshCrew, readCrew, type CrewState } from './mission';
import { readThreat, stepThreat, threatTarget, type ThreatInput } from './threat';

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

describe('entity perception', () => {
  test('a stationary unseen technician makes no movement noise', () => {
    const crew = freshCrew();
    advance(crew, stimulus, 3);
    expect(threatTarget(crew)).toBeNull();
    expect(crew.threat.awareness).toBe(0);
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

  test.each(['test', 'dead', 'outside', 'absent'] as const)(
    '%s suppresses hostile perception',
    (protection) => {
      const crew = freshCrew();
      advance(crew, { ...stimulus, speed: 5 }, 3);
      const input = { ...stimulus, speed: 5 };
      if (protection === 'test') crew.options.test = true;
      if (protection === 'dead') crew.hp = 0;
      if (protection === 'outside') input.insideStation = false;
      if (protection === 'absent') input.monster = null;
      stepThreat(crew, 0.05, input);
      expect(crew.threat.mode).toBe('patrol');
      expect(threatTarget(crew)).toBeNull();
    },
  );

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

test('safe simulation hunts the bot but retains damage protection', () => {
  const crew = freshCrew();
  crew.options.test = true;
  crew.simulation = true;
  advance(crew, { ...stimulus, speed: 5 }, 3);
  expect(crew.threat.mode).toBe('hunt');
  expect(threatTarget(crew)).toEqual(stimulus.player);
  expect(readCrew(crew).threat.target).toEqual(stimulus.player);
  expect(crew.hp).toBe(3);
});

test('facing and acoustic distance gate detection; a locker leaves a stale search position', () => {
  const crew = freshCrew();
  advance(
    crew,
    {
      ...stimulus,
      speed: 5,
      hearingDistance: Infinity,
      flashlight: true,
      lineOfSight: true,
      inView: false,
    },
    2,
  );
  expect(threatTarget(crew)).toBeNull();
  advance(crew, { ...stimulus, flashlight: true, lineOfSight: true, inView: true }, 2);
  crew.hidden = 'r0';
  advance(crew, { ...stimulus, player: { x: 9, z: 1 }, speed: 5 }, 1);
  expect(crew.threat.mode).toBe('search');
  expect(threatTarget(crew)).toEqual(stimulus.player);
  advance(crew, stimulus, 15);
  expect(threatTarget(crew)).toBeNull();
});
