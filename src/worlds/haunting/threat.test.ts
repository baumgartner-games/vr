import { freshCrew, readCrew, type CrewState } from './mission';
import {
  ALERT_DECAY,
  ENTITY_PROFILES,
  LOUD,
  MAX_ALERT,
  NOISE_WINDOW,
  freshThreat,
  hearNoises,
  readThreat,
  stepAwareness,
  stepThreat,
  takeAlert,
  threatAlert,
  threatTarget,
  type HeardNoise,
  type ThreatInput,
} from './threat';
import { HEARING, Hearing } from './audio/hearing';
import { NOISE } from './audio/cues';
import { emptySnapshot, type MapSnapshot } from './map/mapSnapshot';

const stimulus: ThreatInput = {
  player: { x: 8, z: 0 },
  monster: { x: 0, z: 0 },
  noises: [],
  crouched: false,
  flashlight: false,
  lineOfSight: false,
  insideStation: true,
};

/** Ein Geräusch, das ankommt — als hätte das Hörmodell es geliefert. */
function heard(loudness: number, from = stimulus.player, gain = 0.5): HeardNoise {
  return { from, source: from, loudness, gain, distance: 4 };
}

function advance(crew: CrewState, input: ThreatInput, seconds: number): void {
  for (let i = 0; i < seconds * 20; i++) stepThreat(crew, 0.05, input);
}

/** Ein Raum, zehn mal zehn Meter, ohne Wände — für das Hörmodell reicht das. */
function openRoom(): MapSnapshot {
  const snapshot = emptySnapshot();
  snapshot.seed = 3;
  snapshot.rooms.push({
    id: 'a',
    name: 'a',
    polygon: [
      { x: 0, z: 0 },
      { x: 0, z: 30 },
      { x: 30, z: 30 },
      { x: 30, z: 0 },
    ],
    centre: { x: 15, z: 15 },
    circulation: false,
    lit: true,
    safe: false,
  });
  return snapshot;
}

describe('Die Alarmleiter', () => {
  test('a stationary unseen technician makes no noise and no alarm', () => {
    const crew = freshCrew();
    advance(crew, stimulus, 3);
    expect(threatTarget(crew)).toBeNull();
    expect(crew.threat.alert).toBe(0);
    expect(crew.threat.mode).toBe('patrol');
  });

  test('three quiet noises, each in its own window, climb the ladder into a hunt', () => {
    const crew = freshCrew();
    const walking = { ...stimulus, noises: [heard(NOISE.walk)] };
    // Erstes Geräusch: aufmerksam. Weitere im selben Fenster zählen nicht.
    advance(crew, walking, 1);
    expect(crew.threat.alert).toBe(1);
    expect(crew.threat.mode).toBe('investigate');
    expect(threatTarget(crew)).toBeNull();
    // Zweites Fenster: lauern, und es weiß, woher.
    advance(crew, walking, NOISE_WINDOW);
    expect(crew.threat.alert).toBe(2);
    expect(crew.threat.facing).toEqual(stimulus.player);
    // Drittes Fenster: sicher — Jagd auf die Stelle, aus der es kam.
    advance(crew, walking, NOISE_WINDOW);
    expect(crew.threat.mode).toBe('hunt');
    expect(threatTarget(crew)).toEqual(stimulus.player);
    expect(crew.threat.alert).toBe(MAX_ALERT);
    // Solange es weiter etwas hört, wandert die Stelle mit.
    const moved = { x: 5, z: 2 };
    advance(crew, { ...stimulus, noises: [heard(NOISE.walk, moved)] }, NOISE_WINDOW + 0.1);
    expect(threatTarget(crew)).toEqual(moved);
    expect(crew.threat.mode).toBe('hunt');
    // Stille: Die Stufe baut sich ab, aus der Jagd wird das Absuchen der Stelle.
    advance(crew, stimulus, ALERT_DECAY + 0.1);
    expect(crew.threat.alert).toBe(MAX_ALERT - 1);
    expect(crew.threat.mode).toBe('search');
  });

  test('the alarm fades one step per quiet stretch and the memory of a hunt fades too', () => {
    const crew = freshCrew();
    advance(crew, { ...stimulus, noises: [heard(NOISE.walk)] }, 0.1);
    expect(crew.threat.alert).toBe(1);
    advance(crew, stimulus, ALERT_DECAY - 1);
    expect(crew.threat.alert).toBe(1);
    advance(crew, stimulus, 1.5);
    expect(crew.threat.alert).toBe(0);
    expect(crew.threat.facing).toBeNull();
    expect(crew.threat.mode).toBe('patrol');
    // Eine Jagd erinnert die Stelle so lange wie das Profil sagt, dann ist Ruhe.
    advance(crew, { ...stimulus, lineOfSight: true, flashlight: true }, 0.1);
    expect(crew.threat.mode).toBe('hunt');
    advance(crew, { ...stimulus, player: { x: 20, z: 8 } }, 1);
    expect(crew.threat.mode).toBe('search');
    expect(threatTarget(crew)).toEqual(stimulus.player);
    advance(crew, { ...stimulus, player: { x: 20, z: 8 } }, ENTITY_PROFILES.stalker.memory + 1);
    expect(crew.threat.mode).toBe('patrol');
    expect(threatTarget(crew)).toBeNull();
  });

  test('a loud noise hands the routine a place to check, once, without starting a hunt', () => {
    const crew = freshCrew();
    const door = { x: 6, z: 3 };
    advance(crew, { ...stimulus, noises: [heard(NOISE.door, door)] }, 0.1);
    expect(crew.threat.alert).toBe(2);
    expect(crew.threat.mode).toBe('investigate');
    expect(threatTarget(crew)).toBeNull();
    const first = threatAlert(crew);
    expect(first.loud).toEqual(door);
    expect(first.facing).toEqual(door);
    // Abgeholt ist abgeholt.
    expect(threatAlert(crew).loud).toBeNull();
    expect(LOUD).toBe(NOISE.door);
  });

  test('sight and contact hunt the player himself, immediately', () => {
    const visible = freshCrew(),
      blocked = freshCrew(),
      touched = freshCrew();
    advance(visible, { ...stimulus, flashlight: true, lineOfSight: true }, 0.1);
    advance(blocked, { ...stimulus, flashlight: true }, 1);
    advance(
      touched,
      { ...stimulus, player: { x: 1, z: 0 }, lineOfSight: true, flashlight: false },
      0.1,
    );
    expect(visible.threat.mode).toBe('hunt');
    expect(threatTarget(visible)).toEqual(stimulus.player);
    expect(blocked.threat.mode).toBe('patrol');
    expect(touched.threat.mode).toBe('hunt');
  });

  test('the caller may bring its own sight model', () => {
    const crew = freshCrew();
    advance(crew, { ...stimulus, seen: true }, 0.1);
    expect(crew.threat.mode).toBe('hunt');
    const blind = freshCrew();
    advance(blind, { ...stimulus, flashlight: true, lineOfSight: true, seen: false }, 1);
    expect(blind.threat.mode).toBe('patrol');
  });

  test.each(['test', 'dead', 'outside', 'absent'] as const)(
    '%s suppresses hostile perception',
    (protection) => {
      const crew = freshCrew();
      advance(crew, { ...stimulus, seen: true }, 1);
      const input = { ...stimulus, seen: true };
      if (protection === 'test') crew.options.test = true;
      if (protection === 'dead') crew.hp = 0;
      if (protection === 'outside') input.insideStation = false;
      if (protection === 'absent') input.monster = null;
      stepThreat(crew, 0.05, input);
      expect(crew.threat.mode).toBe('patrol');
      expect(threatTarget(crew)).toBeNull();
      expect(threatAlert(crew)).toEqual({ alert: 0, facing: null, loud: null });
    },
  );

  test('a hidden technician is neither heard nor seen, but the clocks keep running', () => {
    const crew = freshCrew();
    advance(crew, { ...stimulus, noises: [heard(NOISE.walk)] }, 0.1);
    expect(crew.threat.alert).toBe(1);
    crew.hidden = 'r0';
    advance(crew, { ...stimulus, noises: [heard(NOISE.sprint)], seen: true }, ALERT_DECAY + 0.5);
    expect(crew.threat.mode).toBe('patrol');
    expect(crew.threat.alert).toBe(0);
  });

  test('late joins bound threat snapshots and erase hostile test states', () => {
    const raw = {
      awareness: Infinity,
      memory: 900,
      mode: 'bad',
      target: { x: NaN, z: 1 },
      alert: 7,
      facing: { x: 1, z: 2 },
      quiet: -3,
      loud: 'nein',
    };
    expect(readThreat(raw)).toEqual({
      awareness: 0,
      memory: 15,
      mode: 'patrol',
      target: null,
      alert: 3,
      facing: { x: 1, z: 2 },
      quiet: 0,
      loud: null,
    });
    expect(readThreat(null)).toEqual(freshThreat());
    const crew = freshCrew();
    advance(crew, { ...stimulus, seen: true }, 1);
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
  advance(crew, { ...stimulus, seen: true }, 1);
  expect(crew.threat.mode).toBe('hunt');
  expect(threatTarget(crew)).toEqual(stimulus.player);
  expect(readCrew(crew).threat.target).toEqual(stimulus.player);
  expect(crew.hp).toBe(3);
});

describe('Hören durch das Modell', () => {
  test('quiet steps are heard close by, loud ones far away, and the monster hears exactly like the player', () => {
    const hearing = new Hearing();
    const world = openRoom();
    const monster = { x: 2, z: 2 };
    const walkReach = NOISE.walk * HEARING;
    const near = hearNoises(hearing, world, monster, [
      { at: { x: 2 + walkReach - 0.5, z: 2 }, loudness: NOISE.walk },
    ]);
    const far = hearNoises(hearing, world, monster, [
      { at: { x: 2 + walkReach + 0.5, z: 2 }, loudness: NOISE.walk },
    ]);
    expect(near).toHaveLength(1);
    expect(far).toHaveLength(0);
    // Derselbe Abstand, aber gerannt: laut genug.
    const sprint = hearNoises(hearing, world, monster, [
      { at: { x: 2 + walkReach + 0.5, z: 2 }, loudness: NOISE.sprint },
    ]);
    expect(sprint).toHaveLength(1);
    expect(sprint[0]!.from).toEqual({ x: 2 + walkReach + 0.5, z: 2 });
    // Bessere Ohren aus den Gewichten hören weiter — die Voreinstellung ist 1.
    expect(
      hearNoises(
        hearing,
        world,
        monster,
        [{ at: { x: 2 + walkReach + 0.5, z: 2 }, loudness: NOISE.walk }],
        1.5,
      ),
    ).toHaveLength(1);
    for (const profile of Object.values(ENTITY_PROFILES)) expect(profile.hearing).toBe(HEARING);
  });

  test('the bare state machine serves the simulation without a crew', () => {
    const state = freshThreat();
    const profile = ENTITY_PROFILES.stalker;
    for (let i = 0; i < 4; i++)
      stepAwareness(state, 0.25, { ...stimulus, noises: [heard(NOISE.walk)] }, profile);
    expect(state.alert).toBe(1);
    stepAwareness(
      state,
      0.25,
      { ...stimulus, noises: [heard(NOISE.slam, { x: 3, z: 3 })] },
      profile,
    );
    expect(takeAlert(state)).toEqual({ alert: 2, facing: { x: 3, z: 3 }, loud: { x: 3, z: 3 } });
    expect(takeAlert(state).loud).toBeNull();
  });
});
