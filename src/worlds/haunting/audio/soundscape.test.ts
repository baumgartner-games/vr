import {
  emptySnapshot,
  type MapEntity,
  type MapSegment,
  type MapSnapshot,
} from '../map/mapSnapshot';
import { ENTITY_PROFILES } from '../threat';
import { PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED } from '../mission';
import { NOISE } from './cues';
import { DOOR_LOSS, HEARING, VENT_LOSS, reachOf } from './hearing';
import {
  AMBIENT_GAP,
  CHASE_RANGE,
  FOOT_OFFSET,
  FOOT_PAN,
  RUN_CADENCE,
  SNEAK_GAIN,
  STALK_CADENCE,
  STEP_GAIN,
  STRIDE,
  Soundscape,
  type Listener,
  type SoundEvent,
  type SoundscapeInput,
} from './soundscape';

/**
 * Zwei Zimmer nebeneinander, 10 × 10 m, geteilte Wand bei x = 10 mit einer
 * Tür bei z = 2 (Öffnung 1…3). Alles andere kommt aus dem Modell.
 */
const DOOR = { x: 10, z: 2 };

function edges(id: string, x0: number, z0: number, x1: number, z1: number): MapSegment[] {
  const seg = (ax: number, az: number, bx: number, bz: number): MapSegment => ({
    a: { x: ax, z: az },
    b: { x: bx, z: bz },
    roomId: id,
    kind: 'wall',
  });
  const out: MapSegment[] = [seg(x0, z0, x1, z0), seg(x0, z1, x1, z1)];
  for (const x of [x0, x1]) {
    if (x === 10) out.push(seg(x, z0, x, 1), seg(x, 3, x, z1));
    else out.push(seg(x, z0, x, z1));
  }
  return out;
}

function twoRooms(open: boolean): MapSnapshot {
  const snapshot = emptySnapshot();
  snapshot.seed = 7;
  const room = (id: string, x0: number, x1: number) => ({
    id,
    name: id,
    polygon: [
      { x: x0, z: 0 },
      { x: x0, z: 10 },
      { x: x1, z: 10 },
      { x: x1, z: 0 },
    ],
    centre: { x: (x0 + x1) / 2, z: 5 },
    circulation: false,
    lit: true,
    safe: false,
  });
  snapshot.rooms.push(room('a', 0, 10), room('b', 10, 20));
  snapshot.doors.push({
    id: 'd',
    a: 'a',
    b: 'b',
    at: { ...DOOR },
    axis: 'z',
    width: 2,
    open,
    locked: false,
    material: 'metal',
  });
  snapshot.walls.push(...edges('a', 0, 0, 10, 10), ...edges('b', 10, 0, 20, 10));
  return snapshot;
}

/** Ein einzelner Saal, 40 m lang, ohne Wände — für Reichweiten. */
function hall(): MapSnapshot {
  const snapshot = emptySnapshot();
  snapshot.seed = 8;
  snapshot.rooms.push({
    id: 'hall',
    name: 'hall',
    polygon: [
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      { x: 40, z: 10 },
      { x: 40, z: 0 },
    ],
    centre: { x: 20, z: 5 },
    circulation: false,
    lit: true,
    safe: false,
  });
  return snapshot;
}

function player(x: number, z: number, moving = false, sprinting = false): MapEntity {
  return {
    id: 'player',
    kind: 'player',
    label: 'Techniker',
    at: { x, z },
    yaw: 0,
    roomId: 'a',
    concealed: false,
    moving,
    sprinting,
    held: '',
  };
}

function monster(x: number, z: number, moving = true, sprinting = false): MapEntity {
  return {
    id: 'monster',
    kind: 'monster',
    label: 'Der Verlorene',
    at: { x, z },
    yaw: 0,
    roomId: '',
    concealed: false,
    moving,
    sprinting,
    held: '',
  };
}

/** Fünf Sekunden Regie in 20-Hz-Schritten; heraus kommen alle Ereignisse. */
function run(input: SoundscapeInput, seconds = 5, scape = new Soundscape()): SoundEvent[] {
  const out: SoundEvent[] = [];
  const rng = input.rng ?? (() => 0.5);
  for (let t = 0; t < seconds; t += 0.05) out.push(...scape.tick(0.05, { ...input, rng }));
  return out;
}

/**
 * Dasselbe, nur in Bewegung: Der Zuhörer — ausdrücklich oder als Wesen im
 * Snapshot — geht mit `speed` Metern je Sekunde nach Norden. Die Regie zählt
 * Schritte nach der Strecke, ein stehender Zuhörer macht keine.
 */
function stroll(
  input: SoundscapeInput,
  speed: number,
  seconds = 5,
  scape = new Soundscape(),
): SoundEvent[] {
  const out: SoundEvent[] = [];
  const rng = input.rng ?? (() => 0.5);
  const at =
    typeof input.listener === 'string'
      ? input.snapshot.entities.find((e) => e.id === input.listener)?.at
      : input.listener.at;
  for (let t = 0; t < seconds; t += 0.05) {
    if (at) at.z -= speed * 0.05;
    out.push(...scape.tick(0.05, { ...input, rng }));
  }
  return out;
}

const count = (events: SoundEvent[], cue: SoundEvent['cue']) =>
  events.filter((e) => e.cue === cue).length;

/** Nur die Geräusche des Monsters, ohne Ambiente und Herz. */
const ofMonster = (events: SoundEvent[]) =>
  events.filter((e) => e.cue.startsWith('monster-') || e.cue === 'heartbeat');

describe('Die Regie: eigene Schritte', () => {
  const steps = (events: SoundEvent[]) => events.filter((e) => e.cue === 'player-step');
  const north = (x: number, z: number): Listener => ({ at: { x, z }, forward: { x: 0, z: -1 } });

  it('macht einen Schritt je Meter — gehend wie rennend gleich laut, keinen im Stand', () => {
    const snapshot = twoRooms(true);
    const walking = stroll({ snapshot, listener: north(5, 5), kind: 'stalker' }, PLAYER_WALK_SPEED);
    const sprinting = stroll(
      { snapshot, listener: north(5, 5), kind: 'stalker' },
      PLAYER_SPRINT_SPEED,
    );
    const standing = stroll({ snapshot, listener: north(5, 5), kind: 'stalker' }, 0);
    expect(count(walking, 'player-step')).toBeCloseTo((5 * PLAYER_WALK_SPEED) / STRIDE, -1);
    expect(count(sprinting, 'player-step')).toBeCloseTo((5 * PLAYER_SPRINT_SPEED) / STRIDE, -1);
    expect(count(sprinting, 'player-step')).toBeGreaterThan(count(walking, 'player-step') * 1.5);
    expect(count(standing, 'player-step')).toBe(0);
    for (const step of steps(walking)) {
      expect(step.distance).toBe(0);
      expect(step.gain).toBe(STEP_GAIN);
    }
    // Rennen ist nicht lauter als Gehen — nur schneller.
    expect(steps(sprinting)[0]!.gain).toBe(STEP_GAIN);
  });

  it('setzt links und rechts ab: 20 cm neben der Mitte, quer zum Blick, in der Balance dieselbe Seite', () => {
    const snapshot = twoRooms(true);
    const walked = steps(
      stroll({ snapshot, listener: north(5, 5), kind: 'stalker' }, PLAYER_WALK_SPEED),
    );
    expect(walked.length).toBeGreaterThan(4);
    // Der erste Fuß ist der linke; nach Norden geblickt liegt links bei kleinerem x.
    walked.forEach((step, i) => {
      const side = i % 2 === 0 ? -1 : 1;
      expect(step.pan).toBeCloseTo(FOOT_PAN * side, 6);
      expect(step.at.x).toBeCloseTo(5 + FOOT_OFFSET * side, 6);
      expect(step.from).toEqual(step.at);
    });
    // Ein Meter zwischen zwei Schritten, nicht ein Bild.
    for (let i = 1; i < walked.length; i++)
      expect(Math.abs(walked[i]!.at.z - walked[i - 1]!.at.z)).toBeGreaterThanOrEqual(STRIDE);
  });

  it('schleicht leise, stolpert beim Losgehen nicht und teleportiert lautlos', () => {
    const snapshot = twoRooms(true);
    const crouched = stroll(
      { snapshot, listener: { ...north(5, 5), crouched: true }, kind: 'stalker' },
      PLAYER_WALK_SPEED,
    );
    expect(count(crouched, 'player-step')).toBeCloseTo((5 * PLAYER_WALK_SPEED) / STRIDE, -1);
    for (const step of steps(crouched)) expect(step.gain).toBe(SNEAK_GAIN);
    expect(SNEAK_GAIN).toBeLessThan(STEP_GAIN);
    // Lange stehen, dann losgehen: kein Nachholen versäumter Schritte.
    const scape = new Soundscape();
    const listener = north(5, 5);
    expect(
      count(stroll({ snapshot, listener, kind: 'stalker' }, 0, 20, scape), 'player-step'),
    ).toBe(0);
    const going = stroll({ snapshot, listener, kind: 'stalker' }, PLAYER_WALK_SPEED, 1, scape);
    expect(count(going, 'player-step')).toBe(Math.floor(PLAYER_WALK_SPEED / STRIDE));
    // Ein Sprung quer durch die Station ist kein Schritt — und der nächste
    // Meter danach wieder einer.
    listener.at.x += 10;
    expect(count(scape.tick(0.05, { snapshot, listener, kind: 'stalker' }), 'player-step')).toBe(0);
    const after = stroll({ snapshot, listener, kind: 'stalker' }, PLAYER_WALK_SPEED, 1, scape);
    expect(count(after, 'player-step')).toBe(Math.floor(PLAYER_WALK_SPEED / STRIDE));
  });

  it('lässt das Monster sich selbst nicht hören — kein Schritt, kein Ruf, kein Herz', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(player(5, 5, true), monster(6, 5, true, true));
    // Der Techniker hört sich und das Monster.
    const heard = stroll({ snapshot, listener: 'player', kind: 'stalker' }, PLAYER_WALK_SPEED);
    expect(count(heard, 'player-step')).toBeGreaterThan(0);
    expect(ofMonster(heard).length).toBeGreaterThan(0);
    // Wer das Monster spielt, hört von sich selbst nichts.
    const own = new Soundscape();
    const events = stroll(
      { snapshot, listener: 'monster', kind: 'stalker' },
      PLAYER_SPRINT_SPEED,
      5,
      own,
    );
    expect(count(events, 'player-step')).toBe(0);
    expect(ofMonster(events)).toEqual([]);
    expect(own.heartbeat).toBe(0);
    // Die Station brummt trotzdem weiter.
    expect(own.ambience['ambient-hum']).toBeGreaterThan(0);
  });

  it('nimmt Ort und Versteck aus dem Snapshot, wenn der Zuhörer nur eine Kennung ist', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(player(5, 5, true, true));
    const events = stroll({ snapshot, listener: 'player', kind: 'stalker' }, PLAYER_SPRINT_SPEED);
    expect(count(events, 'player-step')).toBeGreaterThan(10);
    // Im Schrank ist die Strecke keine: Wer darin „geht", macht keinen Schritt.
    snapshot.entities[0]!.concealed = true;
    expect(
      count(
        stroll({ snapshot, listener: 'player', kind: 'stalker' }, PLAYER_WALK_SPEED),
        'player-step',
      ),
    ).toBe(0);
    expect(run({ snapshot, listener: 'nobody', kind: 'stalker' })).toHaveLength(0);
  });
});

describe('Die Regie: das Monster', () => {
  it('geht im Takt seiner Sorte, schleicht leiser und langsamer, rennt lauter und schneller', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(monster(5, 8));
    const listener = { at: { x: 5, z: 4 }, forward: { x: 0, z: -1 }, speed: 0 };
    const walking = run({ snapshot, listener, kind: 'stalker' });
    const cadence = ENTITY_PROFILES.stalker.cadence;
    expect(count(walking, 'monster-walk')).toBeCloseTo(5 / cadence, -1);
    expect(count(walking, 'monster-run')).toBe(0);
    expect(count(walking, 'monster-call')).toBe(0);
    const stalking = run({ snapshot, listener, kind: 'stalker', monster: { pace: 'stalk' } });
    expect(count(stalking, 'monster-walk')).toBeCloseTo(5 / (cadence * STALK_CADENCE), -1);
    expect(count(stalking, 'monster-walk')).toBeLessThan(count(walking, 'monster-walk'));
    expect(stalking.find((e) => e.cue === 'monster-walk')!.gain).toBeLessThan(
      walking.find((e) => e.cue === 'monster-walk')!.gain,
    );
    snapshot.entities[0]!.sprinting = true;
    const running = run({ snapshot, listener, kind: 'stalker', rng: () => 0.5 });
    expect(count(running, 'monster-walk')).toBe(0);
    expect(count(running, 'monster-run')).toBeCloseTo(5 / (cadence * RUN_CADENCE), -1);
    // Rennen heißt verfolgen: Es ruft, und zwar mehr als einmal in fünf Sekunden.
    expect(count(running, 'monster-call')).toBeGreaterThanOrEqual(1);
    // Ein Schachtläufer trippelt schneller als der Verlorene.
    const crawler = run({ snapshot, listener, kind: 'crawler', rng: () => 0.5 });
    expect(count(crawler, 'monster-run')).toBeGreaterThan(count(running, 'monster-run'));
  });

  it('hört das Monster nur in Reichweite — gehend 14,4 m, rennend 24 m, den Ruf 42 m', () => {
    const snapshot = hall();
    const listener = { at: { x: 1, z: 5 }, forward: { x: 0, z: -1 }, speed: 0 };
    expect(reachOf(NOISE.monsterWalk)).toBeCloseTo(14.4, 9);
    snapshot.entities.push(monster(17, 5));
    expect(count(run({ snapshot, listener, kind: 'stalker' }), 'monster-walk')).toBe(0);
    snapshot.entities[0]!.sprinting = true;
    const running = run({ snapshot, listener, kind: 'stalker', rng: () => 0 });
    expect(count(running, 'monster-run')).toBeGreaterThan(0);
    for (const step of running.filter((e) => e.cue === 'monster-run')) {
      expect(step.distance).toBeCloseTo(16, 6);
      expect(step.pan).toBe(1); // rechts vom Blick nach Norden
    }
    // Der Ruf trägt über den ganzen Saal.
    snapshot.entities[0]!.at.x = 38;
    const far = run({ snapshot, listener, kind: 'stalker', rng: () => 0 });
    expect(count(far, 'monster-run')).toBe(0);
    expect(count(far, 'monster-call')).toBeGreaterThan(0);
    expect(far.find((e) => e.cue === 'monster-call')!.distance).toBeCloseTo(37, 6);
  });

  it('hört durch die Wand leiser als im Freien und noch leiser bei geschlossener Tür', () => {
    // Zuhörer bei (8,4) in a, Monster bei (12,4) in b: vier Meter Luftlinie
    // durch die Wand, 5,66 m um die Ecke durch die Tür bei (10,2).
    const listener = { at: { x: 8, z: 4 }, forward: { x: 0, z: -1 }, speed: 0 };
    const open = twoRooms(true);
    open.entities.push(monster(12, 4));
    const heardOpen = run({ snapshot: open, listener, kind: 'stalker' }).filter(
      (e) => e.cue === 'monster-walk',
    );
    expect(heardOpen.length).toBeGreaterThan(0);
    const viaDoor = 2 * Math.hypot(2, 2);
    expect(heardOpen[0]!.distance).toBeCloseTo(viaDoor, 6);
    expect(heardOpen[0]!.from).toEqual(DOOR);
    // Die Tür liegt nördlich-rechts vom Zuhörer, also rechts im Ohr.
    expect(heardOpen[0]!.pan).toBeGreaterThan(0);

    const same = twoRooms(true);
    same.entities.push(monster(4, 4));
    const heardFree = run({ snapshot: same, listener, kind: 'stalker' }).filter(
      (e) => e.cue === 'monster-walk',
    );
    expect(heardFree[0]!.distance).toBeCloseTo(4, 6);
    expect(heardFree[0]!.gain).toBeGreaterThan(heardOpen[0]!.gain);

    const shut = twoRooms(false);
    shut.entities.push(monster(12, 4));
    const heardShut = run({ snapshot: shut, listener, kind: 'stalker' }).filter(
      (e) => e.cue === 'monster-walk',
    );
    // 5,66 + 4 = 9,66 m effektiv: leiser als durch die offene Tür, aber noch da.
    expect(heardShut.length).toBeGreaterThan(0);
    expect(heardShut[0]!.distance).toBeCloseTo(viaDoor + DOOR_LOSS, 6);
    expect(heardShut[0]!.gain).toBeLessThan(heardOpen[0]!.gain);
  });

  it('hört das Kratzen im Schacht aus der nächsten Klappe', () => {
    const snapshot = twoRooms(true);
    // Zwei Klappen mit Schacht: eine in a bei (3,8), eine in b bei (17,8).
    for (const [id, roomId, x] of [
      ['vent-a', 'a', 3],
      ['vent-b', 'b', 17],
    ] as const)
      snapshot.items.push({
        id,
        kind: 'vent',
        label: 'Lüftungsklappe',
        roomId,
        at: { x, z: 8 },
        state: 'closed',
        interactive: false,
      });
    snapshot.ventLinks = [{ a: 'vent-a', b: 'vent-b' }];
    // Das Monster ist im Schacht, gemeldet an der Einstiegsklappe in b.
    snapshot.entities.push({ ...monster(17, 8, false), concealed: true });
    const listener = { at: { x: 2, z: 8 }, forward: { x: 0, z: -1 }, speed: 0 };
    const events = run({ snapshot, listener, kind: 'stalker' });
    const scrapes = events.filter((e) => e.cue === 'monster-vent');
    expect(scrapes.length).toBeGreaterThan(3);
    // Es kommt aus der Klappe im eigenen Raum, durch den Schacht: 14 m + 3 m + 1 m —
    // statt 15 m Luftlinie durch die Wand (+ 9 m).
    expect(scrapes[0]!.from).toEqual({ x: 3, z: 8 });
    expect(scrapes[0]!.distance).toBeCloseTo(14 + VENT_LOSS + 1, 6);
    // Kein Schritt, kein Herz: Im Schacht ist es weder zu Fuß noch nah.
    expect(count(events, 'monster-walk')).toBe(0);
    expect(count(events, 'heartbeat')).toBe(0);
  });

  it('lässt das Herz bei Nähe und Verfolgung schlagen, sonst nicht', () => {
    const listener = { at: { x: 5, z: 5 }, forward: { x: 0, z: -1 }, speed: 0 };
    const far = twoRooms(true);
    far.entities.push(monster(19, 9));
    const calm = new Soundscape();
    expect(count(run({ snapshot: far, listener, kind: 'stalker' }, 5, calm), 'heartbeat')).toBe(0);
    expect(calm.heartbeat).toBe(0);

    const near = twoRooms(true);
    near.entities.push(monster(7, 5));
    const tense = new Soundscape();
    const beats = count(run({ snapshot: near, listener, kind: 'stalker' }, 5, tense), 'heartbeat');
    expect(beats).toBeGreaterThan(0);
    expect(beats % 2).toBe(0); // Doppelschlag
    expect(tense.heartbeat).toBeGreaterThan(0);

    // Weit weg, aber rennend: Verfolgung — das Herz klopft, und es ruft.
    const chase = twoRooms(true);
    chase.entities.push(monster(17, 5, true, true));
    expect(Math.hypot(12, 0)).toBeLessThan(CHASE_RANGE);
    const hunted = new Soundscape();
    const events = run({ snapshot: chase, listener, kind: 'stalker', rng: () => 0 }, 5, hunted);
    expect(count(events, 'heartbeat')).toBeGreaterThan(0);
    expect(count(events, 'monster-call')).toBeGreaterThan(0);
    // Näher heißt schneller: bei 2 m mehr Schläge als bei 12 m.
    const close = twoRooms(true);
    close.entities.push(monster(7, 5, true, true));
    const closeBeats = count(
      run({ snapshot: close, listener, kind: 'stalker', rng: () => 0 }),
      'heartbeat',
    );
    expect(closeBeats).toBeGreaterThan(count(events, 'heartbeat'));
  });

  it('schweigt im Test, in der Bot-Runde und mit den Hinweisen der 3D-Welt', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(monster(7, 5, true, true));
    const listener = { at: { x: 5, z: 5 }, forward: { x: 0, z: -1 }, speed: 0 };
    const off = new Soundscape();
    const quiet = run({ snapshot, listener, kind: 'stalker', active: false }, 5, off);
    expect(ofMonster(quiet)).toHaveLength(0);
    expect(off.heartbeat).toBe(0);
    // Der Snapshot der 3D-Welt sagt „bewegt sich", die Routine sagt „steht": Die Routine gewinnt.
    const still = run({
      snapshot,
      listener,
      kind: 'stalker',
      monster: { pace: 'still', chase: 0 },
    });
    expect(count(still, 'monster-walk') + count(still, 'monster-run')).toBe(0);
    expect(count(still, 'monster-call')).toBe(0);
    // Herz trotzdem: Es steht zwei Meter neben einem.
    expect(count(still, 'heartbeat')).toBeGreaterThan(0);
    const walk = run({ snapshot, listener, kind: 'stalker', monster: { pace: 'walk', chase: 0 } });
    expect(count(walk, 'monster-walk')).toBeGreaterThan(0);
    expect(count(walk, 'monster-run')).toBe(0);
    const hunt = run({
      snapshot,
      listener,
      kind: 'stalker',
      monster: { pace: 'hunt', chase: 0.9 },
      rng: () => 0,
    });
    expect(count(hunt, 'monster-run')).toBeGreaterThan(0);
    expect(count(hunt, 'monster-call')).toBeGreaterThan(0);
  });

  it('führt eine klingende Stimme mit dem Zuhörer nach — durch dieselbe Tür', () => {
    const snapshot = twoRooms(true);
    const scape = new Soundscape();
    const mix = scape.mix(
      { snapshot, listener: { at: { x: 8, z: 4 }, forward: { x: 0, z: -1 } }, kind: 'stalker' },
      'monster-walk',
      { x: 12, z: 4 },
    );
    expect(mix.from).toEqual(DOOR);
    expect(mix.gain).toBeGreaterThan(0);
    expect(mix.gain).toBeLessThan(1);
    const ear = scape.mix(
      { snapshot, listener: { at: { x: 8, z: 4 }, forward: { x: 0, z: -1 } }, kind: 'stalker' },
      'heartbeat',
      { x: 8, z: 4 },
    );
    expect(ear).toMatchObject({ gain: 1, pan: 0, distance: 0 });
    expect(HEARING).toBe(ENTITY_PROFILES.crawler.hearing);
  });
});

describe('Die Regie: Ambiente', () => {
  it('brummt mit Strom, wird dunkel ohne Strom oder Licht, und knarrt alle paar Sekunden irgendwo', () => {
    const snapshot = twoRooms(true);
    const listener = { at: { x: 4, z: 4 }, forward: { x: 0, z: -1 }, speed: 0 };
    const scape = new Soundscape();
    let roll = 0;
    const rng = () => {
      roll = (roll + 0.37) % 1;
      return roll;
    };
    const events = run({ snapshot, listener, kind: 'stalker', rng }, 90, scape);
    expect(scape.ambience['ambient-hum']).toBe(1);
    expect(scape.ambience['ambient-dark']).toBe(0);
    const alarms = events.filter((e) => e.cue === 'creak' || e.cue === 'metal');
    expect(alarms.length).toBeGreaterThanOrEqual(Math.floor(90 / AMBIENT_GAP[1]) - 1);
    expect(alarms.length).toBeLessThanOrEqual(Math.ceil(90 / AMBIENT_GAP[0]) + 1);
    // Jeder Fehlalarm hat einen Ort und kommt durch dieselben Türen.
    for (const alarm of alarms) {
      expect(alarm.gain).toBeGreaterThan(0);
      expect(alarm.distance).toBeGreaterThan(0);
    }
    // Ohne Licht im eigenen Raum wird es dunkel, ohne Strom ganz.
    snapshot.rooms[0]!.lit = false;
    scape.tick(0.05, { snapshot, listener, kind: 'stalker', rng });
    expect(scape.ambience['ambient-dark']).toBeGreaterThan(0);
    expect(scape.ambience['ambient-dark']).toBeLessThan(1);
    snapshot.power = false;
    scape.tick(0.05, { snapshot, listener, kind: 'stalker', rng });
    expect(scape.ambience['ambient-dark']).toBe(1);
    expect(scape.ambience['ambient-hum']).toBeLessThan(1);
  });
});
