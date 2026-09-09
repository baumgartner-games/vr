import {
  emptySnapshot,
  type MapEntity,
  type MapSegment,
  type MapSnapshot,
} from '../map/mapSnapshot';
import { ENTITY_PROFILES } from '../threat';
import { PLAYER_WALK_SPEED, PLAYER_SPRINT_SPEED } from '../mission';
import { DOOR_LOSS, PLAYER_HEARING } from './hearing';
import {
  CHASE_RANGE,
  RUN_CADENCE,
  Soundscape,
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
  for (let t = 0; t < seconds; t += 0.05) out.push(...scape.tick(0.05, input));
  return out;
}

const count = (events: SoundEvent[], cue: SoundEvent['cue']) =>
  events.filter((e) => e.cue === cue).length;

describe('Die Regie: eigene Schritte', () => {
  it('hört den eigenen Schritt im Gehtakt, schneller beim Sprint, gar nicht im Stand', () => {
    const snapshot = twoRooms(true);
    const listener = { at: { x: 5, z: 5 }, forward: { x: 0, z: -1 } };
    const walking = run({
      snapshot,
      listener: { ...listener, speed: PLAYER_WALK_SPEED },
      kind: 'stalker',
    });
    const sprinting = run({
      snapshot,
      listener: { ...listener, speed: PLAYER_SPRINT_SPEED },
      kind: 'stalker',
    });
    const standing = run({ snapshot, listener: { ...listener, speed: 0 }, kind: 'stalker' });
    expect(count(walking, 'player-step')).toBeCloseTo(5 / (1.45 / PLAYER_WALK_SPEED), -1);
    expect(count(sprinting, 'player-step')).toBeGreaterThan(count(walking, 'player-step') * 1.5);
    expect(count(standing, 'player-step')).toBe(0);
    for (const step of walking) {
      expect(step.distance).toBe(0);
      expect(step.pan).toBe(0);
      expect(step.gain).toBeGreaterThan(0);
    }
    // Sprint ist lauter als Gehen.
    expect(sprinting[0]!.gain).toBeGreaterThan(walking[0]!.gain);
  });

  it('nimmt Tempo und Versteck aus dem Snapshot, wenn der Zuhörer nur eine Kennung ist', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(player(5, 5, true, true));
    const events = run({ snapshot, listener: 'player', kind: 'stalker' });
    expect(count(events, 'player-step')).toBeGreaterThan(10);
    snapshot.entities[0]!.concealed = true;
    expect(count(run({ snapshot, listener: 'player', kind: 'stalker' }), 'player-step')).toBe(0);
    expect(run({ snapshot, listener: 'nobody', kind: 'stalker' })).toHaveLength(0);
  });
});

describe('Die Regie: das Monster', () => {
  it('geht im Takt seiner Sorte und rennt mit einem anderen Cue in kürzerem Takt', () => {
    const snapshot = twoRooms(true);
    snapshot.entities.push(monster(5, 8));
    const listener = { at: { x: 5, z: 4 }, forward: { x: 0, z: -1 }, speed: 0 };
    const walking = run({ snapshot, listener, kind: 'stalker' });
    expect(count(walking, 'monster-walk')).toBeCloseTo(5 / ENTITY_PROFILES.stalker.cadence, -1);
    expect(count(walking, 'monster-run')).toBe(0);
    expect(count(walking, 'monster-call')).toBe(0);
    snapshot.entities[0]!.sprinting = true;
    const running = run({ snapshot, listener, kind: 'stalker', rng: () => 0.5 });
    expect(count(running, 'monster-walk')).toBe(0);
    expect(count(running, 'monster-run')).toBeCloseTo(
      5 / (ENTITY_PROFILES.stalker.cadence * RUN_CADENCE),
      -1,
    );
    // Rennen heißt verfolgen: Es ruft, und zwar mehr als einmal in fünf Sekunden.
    expect(count(running, 'monster-call')).toBeGreaterThanOrEqual(1);
    // Ein Schachtläufer trippelt schneller als der Verlorene.
    const crawler = run({ snapshot, listener, kind: 'crawler', rng: () => 0.5 });
    expect(count(crawler, 'monster-run')).toBeGreaterThan(count(running, 'monster-run'));
  });

  it('hört das Monster nur in Reichweite — und rennend weiter als gehend', () => {
    const snapshot = twoRooms(true);
    const listener = { at: { x: 1, z: 5 }, forward: { x: 0, z: -1 }, speed: 0 };
    // 11 m weit weg im selben Raum: Gehen (Reichweite 9 m) ist still, Rennen (14,4 m) nicht.
    snapshot.entities.push(monster(12, 5));
    snapshot.rooms[0]!.polygon[2]!.x = 20;
    snapshot.rooms[0]!.polygon[3]!.x = 20;
    snapshot.walls.length = 0;
    snapshot.doors.length = 0;
    snapshot.rooms.length = 1;
    expect(count(run({ snapshot, listener, kind: 'stalker' }), 'monster-walk')).toBe(0);
    snapshot.entities[0]!.sprinting = true;
    const running = run({ snapshot, listener, kind: 'stalker', rng: () => 0 });
    expect(count(running, 'monster-run')).toBeGreaterThan(0);
    for (const step of running.filter((e) => e.cue === 'monster-run')) {
      expect(step.distance).toBeCloseTo(11, 6);
      expect(step.pan).toBe(1); // rechts vom Blick nach Norden
    }
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
    const heardShut = run({ snapshot: shut, listener, kind: 'stalker' });
    // 5,66 + 4 = 9,66 m effektiv: jenseits der neun Meter für Gehen — still.
    expect(count(heardShut, 'monster-walk')).toBe(0);
    shut.entities[0]!.sprinting = true;
    const running = run({ snapshot: shut, listener, kind: 'stalker', rng: () => 0 }).filter(
      (e) => e.cue === 'monster-run',
    );
    expect(running.length).toBeGreaterThan(0);
    expect(running[0]!.distance).toBeCloseTo(viaDoor + DOOR_LOSS, 6);
    expect(running[0]!.gain).toBeLessThan(
      run({ snapshot: open, listener, kind: 'stalker', rng: () => 0 }).find(
        (e) => e.cue === 'monster-run',
      )?.gain ?? Infinity,
    );
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
    expect(quiet).toHaveLength(0);
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
    expect(PLAYER_HEARING).toBeLessThan(ENTITY_PROFILES.crawler.hearing);
  });
});
