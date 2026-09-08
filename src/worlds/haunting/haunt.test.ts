import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { TILE, tileKey, dirX, dirZ } from '../nav/navTile';
import { generateHouse, roomCentre, roomOf, tilesOf, HOUSE, type HouseSpec } from './house';
import { housePlan } from './plan';
import {
  flickerLevel,
  freshSpook,
  stepHaunt,
  HAUNT_REST,
  HAUNT_WAIT,
  type HauntSight,
  type Spook,
} from './haunt';

/** Zwanzig Häuser, damit ein Fehler nicht vom Samen abhängt. */
const SEEDS = Array.from({ length: 20 }, (_, i) => 1000 + i * 7919);

/** Ein Bild von einer Sechzigstelsekunde — so oft, wie die Welt rechnet. */
const FRAME = 1 / 60;

/** Wo das Monster steht, wenn es in der Mitte dieses Zimmers steht — in Metern. */
function inRoom(spec: HouseSpec, roomId: string): { x: number; z: number } {
  const at = roomCentre(roomOf(spec, roomId)!);
  return { x: (at.x + 0.5) * TILE, z: (at.z + 0.5) * TILE };
}

/** Door tricks require actual proximity; a large room's centre is deliberately too far away. */
function besideDoor(spec: HouseSpec, roomId: string): { x: number; z: number } {
  const door = spec.doors.find((d) => d.b !== null && (d.a === roomId || d.b === roomId))!;
  const sign = door.a === roomId ? -1 : 1;
  return {
    x: (door.x + 0.5 + dirX(door.dir) * 0.5) * TILE + dirX(door.dir) * sign * 0.75,
    z: (door.z + 0.5 + dirZ(door.dir) * 0.5) * TILE + dirZ(door.dir) * sign * 0.75,
  };
}

/** Den Spuk so lange rechnen, bis er etwas anrichtet — oder die Zeit um ist. */
function haunt(
  sight: HauntSight,
  seconds = 60,
  spook: Spook = freshSpook(),
  step = FRAME,
): { spook: Spook; lightOut: string; doorShut: string; waited: number } {
  let waited = 0;
  let now = spook;
  while (waited < seconds) {
    const next = stepHaunt(now, sight, step);
    waited += step;
    now = next.spook;
    if (next.lightOut || next.doorShut) {
      return { spook: now, lightOut: next.lightOut, doorShut: next.doorShut, waited };
    }
  }
  return { spook: now, lightOut: '', doorShut: '', waited };
}

describe('Der Spuk in der Nähe des Monsters', () => {
  const spec = generateHouse(4711);
  const lampRoom = spec.rooms.find((room) => room.lamp && room.id !== spec.entryRoom)!;

  it('rührt nichts an, solange gar kein Monster im Haus ist', () => {
    const sight: HauntSight = { spec, monster: null, lit: [lampRoom.id], shut: [] };
    const out = haunt(sight);
    expect([out.lightOut, out.doorShut]).toEqual(['', '']);
  });

  /**
   * **Die Ruhe zu Beginn ist kein Detail.**
   *
   * Ohne sie geht in derselben Sekunde, in der der VR-Spieler das Monster
   * einschaltet, irgendwo das Licht aus — und der Hacker sucht seinen Schalter,
   * bevor er verstanden hat, dass er einen sucht.
   */
  it('lässt dem Haus erst einmal Ruhe', () => {
    const sight: HauntSight = {
      spec,
      monster: inRoom(spec, lampRoom.id),
      lit: [lampRoom.id],
      shut: [],
    };
    const out = haunt(sight);
    expect(out.lightOut).toBe(lampRoom.id);
    expect(out.waited).toBeGreaterThanOrEqual(HAUNT_REST);
  });

  it('macht das Licht des Zimmers aus, in dem es steht — und kein anderes', () => {
    const other = spec.rooms.find((room) => room.lamp && room.id !== lampRoom.id)!;
    const sight: HauntSight = {
      spec,
      monster: inRoom(spec, lampRoom.id),
      lit: [lampRoom.id, other.id],
      shut: [],
    };
    expect(haunt(sight).lightOut).toBe(lampRoom.id);
  });

  /**
   * **Erst das Licht, dann die Tür.** Ein Monster, das im hellen Zimmer die Tür
   * zuwirft, verrät sich zweimal; erst wird es dunkel, und dann hört man etwas,
   * das man nicht mehr sieht.
   */
  it('wirft erst eine Tür zu, wenn kein Licht mehr brennt', () => {
    const at = besideDoor(spec, lampRoom.id);
    const bright = haunt({ spec, monster: at, lit: [lampRoom.id], shut: [] });
    expect(bright.doorShut).toBe('');
    const dark = haunt({ spec, monster: at, lit: [], shut: [] });
    expect(dark.lightOut).toBe('');
    expect(dark.doorShut).not.toBe('');
  });

  it('wirft nur eine Tür des Zimmers zu, in dem es steht', () => {
    const dark = haunt({ spec, monster: besideDoor(spec, lampRoom.id), lit: [], shut: [] });
    const door = spec.doors.find((one) => one.id === dark.doorShut)!;
    expect([door.a, door.b]).toContain(lampRoom.id);
  });

  /**
   * Der Zähler gehört zum Zimmer und nicht zum Monster: Wer durch fünf Zimmer
   * spaziert, hat in keinem davon lange genug gestanden.
   */
  it('fängt von vorn an, sobald es das Zimmer wechselt', () => {
    const first = spec.rooms[0]!;
    const second = spec.rooms[1]!;
    let spook = { room: first.id, since: HAUNT_WAIT, rest: 0 };
    const walk = stepHaunt(
      spook,
      { spec, monster: inRoom(spec, second.id), lit: [], shut: [] },
      FRAME,
    );
    spook = walk.spook;
    expect(spook.room).toBe(second.id);
    expect(spook.since).toBe(0);
  });

  it('hält nach jedem Streich Ruhe', () => {
    const sight: HauntSight = {
      spec,
      monster: inRoom(spec, lampRoom.id),
      lit: [lampRoom.id],
      shut: [],
    };
    const first = haunt(sight);
    expect(first.spook.rest).toBe(HAUNT_REST);
    // Und der nächste Streich kommt frühestens nach dieser Ruhe.
    const again = haunt(sight, 60, first.spook);
    expect(again.waited).toBeGreaterThanOrEqual(HAUNT_REST);
  });
});

/**
 * **Die Regel, ohne die der Spuk eine Runde beenden könnte.**
 *
 * Eine zugefallene Tür macht nur der Hacker wieder auf, und wenn sein Schalter
 * dafür hinter dem Sicherungskasten liegt, macht sie niemand wieder auf. Ein
 * Monster, das damit ein Zimmer abschneidet, spielt nicht gegen die Gruppe,
 * sondern beendet ihren Abend.
 */
describe('Es sperrt niemanden ein', () => {
  for (const seed of SEEDS) {
    it(`hält im Haus ${seed} jedes Zimmer von der Haustür aus erreichbar`, () => {
      const spec = generateHouse(seed);
      const shut: string[] = [];
      // Das Monster steht auf **jeder** Kachel des Hauses und bleibt dort, bis
      // es nichts mehr anzustellen weiß: der schlimmste Fall, den es geben
      // kann, und einer, den keine Runde je erreicht.
      for (const tile of tilesOf(HOUSE)) {
        const monster = { x: (tile.x + 0.5) * TILE, z: (tile.z + 0.5) * TILE };
        for (let round = 0; round < 4; round++) {
          const out = haunt({ spec, monster, lit: [], shut }, 30, freshSpook(), 0.05);
          if (!out.doorShut) break;
          shut.push(out.doorShut);
        }
      }

      // Sonst wäre der Test auch für ein Monster grün, das gar nichts tut.
      expect(shut.length).toBeGreaterThan(0);
      expect(shut).not.toContain(spec.frontDoor);
      const plan = housePlan(spec, new Set(shut));
      const entry = roomOf(spec, spec.entryRoom)!;
      const from = tileKey(entry.rect.x, entry.rect.z, 0);
      for (const room of spec.rooms) {
        const to = tileKey(room.rect.x, room.rect.z, 0);
        const path = findPath(plan.graph, from, to, { profile: HUMAN_PROFILE });
        expect(`${room.id}: ${path.complete}`).toBe(`${room.id}: true`);
      }
    });
  }
});

describe('Das Flackern', () => {
  it('lässt eine ruhige Lampe in Ruhe', () => {
    expect(flickerLevel(0)).toBe(1);
  });

  it('bleibt immer zwischen aus und ganz an', () => {
    for (let since = 0; since < 3 * HAUNT_WAIT; since += 0.003) {
      const level = flickerLevel(since);
      expect(level).toBeGreaterThanOrEqual(0);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  /**
   * **Es wird schlimmer, je näher das Aus kommt** — daran, und nur daran,
   * merkt der VR-Spieler, dass ihm gleich das Licht ausgeht.
   */
  it('zuckt tiefer, je länger das Monster schon dasteht', () => {
    const deepest = (from: number, to: number): number => {
      let low = 1;
      for (let since = from; since < to; since += 0.002) low = Math.min(low, flickerLevel(since));
      return low;
    };
    expect(deepest(0, HAUNT_WAIT / 3)).toBeGreaterThan(deepest(HAUNT_WAIT / 3, HAUNT_WAIT));
  });

  it('rechnet auf jedem Gerät dasselbe', () => {
    expect(flickerLevel(1.234)).toBe(flickerLevel(1.234));
  });
});
