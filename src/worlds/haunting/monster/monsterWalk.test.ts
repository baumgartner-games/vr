import { generateHouse, type HouseDoor, type HouseSpec } from '../house';
import { MONSTER_RADIUS } from '../map/flatRound';
import { freshLocks, pryLock, releaseLock, type DoorLocks } from '../rules/doorLocks';
import { monsterGraph, type StationGraph } from '../roomGraph';
import type { FloorPoint } from '../stationLayout';
import { DOOR_REACH, MonsterWalk, PRY_DETOUR, WOOD_DELAY, type WalkEvent } from './monsterWalk';

/**
 * **Der Läufer des Monsters** (`monster/monsterWalk.ts`) — derselbe in der
 * 2D-Runde und im Headset. Hier ohne beide Welten: Ein Punkt, der jedem
 * Wegpunkt mit festem Tempo folgt, wie es Rapier oder `slide` täten, und eine
 * Buchführung der Riegel aus `rules/doorLocks.ts`. Geprüft wird die eine
 * Zusage, die das Headset vorher nicht hielt: **Vor einer gesperrten Tür
 * bleibt es nicht für immer stehen** — Holz splittert, Stahl wird gezogen.
 */

const DT = 1 / 30;
const SPEED = 2.8;

interface Stand {
  spec: HouseSpec;
  prowl: StationGraph;
  walk: MonsterWalk;
  shut: string[];
  events: WalkEvent[];
}

function stand(seed: number, roll: () => number = () => 0): Stand {
  const spec = generateHouse(seed, 14);
  const prowl = monsterGraph(spec);
  const locks: DoorLocks = freshLocks();
  const stand: Stand = { spec, prowl, shut: [], events: [], walk: null as unknown as MonsterWalk };
  stand.walk = new MonsterWalk(spec, prowl, MONSTER_RADIUS, {
    shut: () => stand.shut,
    release: (door, time) => {
      stand.shut = releaseLock(locks, stand.shut, door.id, time);
    },
    pry: (door, time) => {
      const out = pryLock(locks, stand.shut, door.id, time, roll);
      stand.shut = out.shut;
      return { tries: out.tries > 0, opened: out.opened };
    },
  });
  return stand;
}

/**
 * Eine Tür zwischen zwei Räumen (nicht die Schleuse) — aus dem gewünschten
 * Material. Die Station baut heute nur Stahl (`house.ts`); Holz gibt es noch
 * als Regel, also wird es hier einer Tür zugeschrieben.
 */
function doorOf(spec: HouseSpec, material: HouseDoor['material']): HouseDoor {
  const door = spec.doors.find((one) => one.b !== null)!;
  door.material = material;
  return door;
}

/**
 * Läuft von der Mitte des Raums `door.a` in den Raum dahinter, während alle
 * Türen des Raums gesperrt sind — es gibt keinen Umweg, also führt die Route
 * vor die Tür. Zurück kommen die Ereignisse an der Tür und wie lange es
 * gedauert hat, bis die Route wieder frei war.
 */
function besiege(door: HouseDoor, s: Stand, seconds: number): number {
  const { spec, prowl, walk } = s;
  s.shut = spec.doors.filter((one) => one.a === door.a || one.b === door.a).map((one) => one.id);
  const at = { ...prowl.centre(door.a), space: door.a };
  const goal = prowl.centre(door.b!);
  let time = 0;
  let freed = -1;
  for (; time < seconds; time += DT) {
    const out = walk.step(at, goal, time, SPEED);
    s.events.push(...out.events);
    if (freed < 0 && !s.shut.includes(door.id)) freed = time;
    let target = out.target;
    let budget = SPEED * DT;
    // Wie `FlatRound.moveMonster`: der ganze Schritt, auch über mehrere Wegpunkte.
    for (let hops = 0; hops < 16 && target && budget > 1e-3; hops++) {
      const dx = target.x - at.x,
        dz = target.z - at.z;
      const gap = Math.hypot(dx, dz);
      const travel = Math.min(gap, budget);
      if (gap > 1e-6) {
        at.x += (dx / gap) * travel;
        at.z += (dz / gap) * travel;
      }
      budget -= travel;
      const space = prowl.spaceAt(at);
      if (space) at.space = space;
      target = out.mode === 'route' ? walk.next(at) : null;
    }
  }
  return freed;
}

describe('Der Läufer des Monsters vor einer gesperrten Tür', () => {
  it('splittert Holz nach WOOD_DELAY, statt für immer davor zu stehen', () => {
    const s = stand(1);
    const door = doorOf(s.spec, 'wood');
    const freed = besiege(door, s, 20);
    expect(freed).toBeGreaterThan(WOOD_DELAY);
    expect(s.events.some((event) => event.kind === 'splinter' && event.door.id === door.id)).toBe(
      true,
    );
    // Gearbeitet hat es nur an dieser einen Tür — und nah davor.
    expect(s.events.every((event) => event.door.id === door.id)).toBe(true);
    expect(s.walk.working).toBe('');
  });

  it('zieht am Stahlriegel, bis er nachgibt', () => {
    const s = stand(2, () => 0);
    const door = doorOf(s.spec, 'metal');
    const freed = besiege(door, s, 30);
    expect(freed).toBeGreaterThan(0);
    const pulls = s.events.filter((event) => event.kind === 'pull');
    expect(pulls.length).toBeGreaterThan(0);
    expect(s.events.some((event) => event.kind === 'give' && event.door.id === door.id)).toBe(true);
    expect(s.events.some((event) => event.kind === 'splinter')).toBe(false);
  });

  it('steht mit Absicht, wenn das Ziel auf seiner Karte in keinem Raum liegt', () => {
    const s = stand(1);
    const door = s.spec.doors.find((one) => one.b !== null)!;
    const at = { ...s.prowl.centre(door.a), space: door.a };
    // Die Einsatzzentrale kennt die Karte des Monsters nicht: `spaceAt` gibt '' zurück.
    const nowhere: FloorPoint = { x: -1000, z: -1000 };
    expect(s.prowl.spaceAt(nowhere)).toBe('');
    const out = s.walk.step(at, nowhere, 0, SPEED);
    expect(out.mode).toBe('hold');
    expect(out.target).toBeNull();
  });

  it('kennt die Zahlen, an denen die Runde hängt', () => {
    expect(PRY_DETOUR).toBe(4);
    expect(WOOD_DELAY).toBe(2.5);
    expect(DOOR_REACH).toBe(1.6);
    // Der Wartepunkt des Navigators (0,9 m vor der Tür) liegt in Reichweite der Arbeit.
    expect(0.9).toBeLessThan(DOOR_REACH);
  });
});
