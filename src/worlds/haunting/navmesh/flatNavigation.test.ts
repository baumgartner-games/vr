import { FlatRound, MONSTER_RADIUS, PLAYER_RADIUS } from '../map/flatRound';
import { FlatWalker } from '../map/flatWalk';
import { WALL_T, doorCentre, doorWaypoint, wallSegments } from '../map/geometry';
import type { MapSnapshot } from '../map/mapSnapshot';
import type { HouseDoor } from '../house';
import { housePlan } from '../plan';
import { COMMAND } from '../roomGraph';
import { PRY_COOLDOWN, pryTries } from '../rules/doorLocks';
import type { FloorPoint } from '../stationLayout';
import { stationRoute } from '../stationNavigation';
import { pointSegmentDistance, snapshotSegmentClear } from './index';

/**
 * **Eine Navigation für beide Welten** — das Monster der 2D-Runde geht den
 * Rasterweg aus `stationRoute`, denselben wie im Headset, headless geprüft.
 *
 * Vier Dinge, die nach der Umstellung von „Raum für Raum über Türwegpunkte"
 * auf die Wegsuche gelten müssen: Jede Route, die das Monster anlegt, ist
 * die, die `stationRoute` auf einem **eigenen** Graphen mit denselben
 * Sperren liefert, und das Monster bleibt auf ihr; es geht nie durch eine
 * Wand (die Wände des `MapSnapshot`, unabhängig von den Quadern der
 * Wegsuche); eine gesperrte Holztür splittert es nach 2,5 s, an Stahl bleibt
 * es stehen — die Spielregel überlebt eine Wegsuche, die gesperrte Türen als
 * blockiert kennt; und der Techniker aus Zahlen (`FlatWalker`) läuft auf
 * demselben Weg. Dass es weiter durch die Schächte fährt, prüft
 * `vents/flatVents.test.ts`.
 */

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

function same(a: FloorPoint, b: FloorPoint): boolean {
  return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.z - b.z) < 1e-9;
}

/** Ob `part` das Ende von `whole` ist — der Cursor darf schon ein Stück weiter sein. */
function tailOf(part: readonly FloorPoint[], whole: readonly FloorPoint[]): boolean {
  if (part.length > whole.length) return false;
  const offset = whole.length - part.length;
  return part.every((point, i) => same(point, whole[offset + i]!));
}

function offPolyline(at: FloorPoint, line: readonly FloorPoint[]): number {
  if (line.length === 1) return Math.hypot(at.x - line[0]!.x, at.z - line[0]!.z);
  let best = Infinity;
  for (let i = 1; i < line.length; i++)
    best = Math.min(best, pointSegmentDistance(at, line[i - 1]!, line[i]!));
  return best;
}

/**
 * Die Wände der 2D-Welt für die Kollisionsprüfung: die Raumwände des
 * Snapshots und seine geschlossenen Türblätter. Die Vorplatzhülle bleibt
 * draußen — sie trägt ihre Schleusenlücke heute an der falschen Kante (Paket
 * map, siehe HANDOVER.md), genau wie in `stationSmoothing.test.ts`.
 */
function walled(round: FlatRound): (snapshot: MapSnapshot) => MapSnapshot {
  const walls = wallSegments(round.house);
  return (snapshot) => ({ ...snapshot, walls });
}

/** Der Weg, den `stationRoute` unabhängig rechnet: eigener Graph, dieselben Sperren. */
function reference(round: FlatRound, from: FloorPoint, shut: readonly string[]): FloorPoint[] {
  const graph = housePlan(round.house, new Set(shut)).graph;
  const goal = round.navigator.target!;
  return stationRoute(round.house, graph, { ...from, yaw: 0 }, goal, MONSTER_RADIUS).points!;
}

describe('Das Monster der 2D-Runde geht den Rasterweg der 3D-Welt', () => {
  it.each([1, 2, 3])(
    'Seed %i: jede Route ist die von stationRoute, und es bleibt darauf',
    (seed) => {
      const round = new FlatRound(seed, { roll: seed });
      let line: FloorPoint[] = [];
      let plans = 0;
      let followed = 0;
      for (let t = 0; t < 45 && round.phase === 'running'; t += DT) {
        // **Der Techniker sitzt die ganze Zeit im Schutzschrank.** Geprüft
        // wird hier die Wegsuche über volle 45 Sekunden, und seit das Monster
        // schneller geht als ein Spieler geht (Paket M2), findet es einen
        // reglosen Techniker in der Zentrale nach einer Viertelminute und
        // steht danach auf ihm: ein Ziel, das sich nicht bewegt, ist genau
        // eine Route. Versteckt macht er kein Geräusch, wird nicht gesehen und
        // das Monster tut, was hier interessiert — es läuft die Station ab.
        round.state().crew.hidden = round.player.space;
        const before = { x: round.monster.x, z: round.monster.z };
        const shutBefore = [...round.haunt.shut];
        const busyBefore = round.ventRide.busy;
        const planned = round.navigator.plans;
        round.step(DT, IDLE);
        // Im Schacht wird nicht gelaufen; danach steht es woanders und rechnet neu.
        if (busyBefore || round.ventRide.busy) continue;
        if (round.navigator.plans !== planned) {
          // Die Sperren können sich im selben Bild geändert haben (Spuk, Splittern).
          const candidates = [reference(round, before, round.haunt.shut)];
          if (shutBefore.join() !== round.haunt.shut.join())
            candidates.push(reference(round, before, shutBefore));
          const expected = candidates.find((points) => tailOf(round.navigator.remaining, points));
          expect(expected).toBeDefined();
          line = [before, ...expected!];
          plans++;
        }
        if (line.length) {
          expect(offPolyline(round.monster, line)).toBeLessThan(0.25);
          followed++;
        }
      }
      expect(plans).toBeGreaterThan(2);
      // Sparsam: seltener als einmal je Sekunde, obwohl die Routine ihr Ziel oft wechselt.
      expect(plans).toBeLessThan(60);
      expect(followed).toBeGreaterThan(800);
    },
    60_000,
  );

  it.each([1, 2, 3])('Seed %i: geht nie durch eine Wand', (seed) => {
    const round = new FlatRound(seed, { roll: seed });
    const radius = MONSTER_RADIUS + WALL_T / 2 - 1e-6;
    const walls = walled(round);
    let travelled = 0;
    for (let t = 0; t < 45 && round.phase === 'running'; t += DT) {
      const before = { x: round.monster.x, z: round.monster.z };
      const busyBefore = round.ventRide.busy;
      round.step(DT, IDLE);
      if (busyBefore || round.ventRide.busy) continue;
      const clear = snapshotSegmentClear(walls(round.snapshot()), radius);
      expect(clear(before, round.monster)).toBe(true);
      travelled += Math.hypot(round.monster.x - before.x, round.monster.z - before.z);
    }
    expect(travelled).toBeGreaterThan(20);
  });
});

/**
 * Eine Runde, in der das Monster in seinem Startraum eingesperrt ist und der
 * Techniker hinter einer der Türen rennt — laut genug, dass es hinwill.
 */
function penned(material: HouseDoor['material']): { round: FlatRound; door: HouseDoor } {
  for (let seed = 1; seed < 40; seed++) {
    const round = new FlatRound(seed, { roll: seed });
    const here = round.monster.space;
    const doors = round.house.doors.filter((d) => d.a === here || (d.b ?? COMMAND) === here);
    const door = doors.find((d) => (d.a === here ? (d.b ?? COMMAND) : d.a) !== COMMAND);
    if (!door) continue;
    const other = door.a === here ? door.b! : door.a;
    const spot = doorWaypoint(door, round.graph.centre(other), 1.5);
    if (round.graph.spaceAt(spot) !== other || !round.place(spot)) continue;
    for (const d of doors) round.haunt.shut.push(d.id);
    door.material = material;
    return { round, door };
  }
  throw new Error('kein Samen mit passender Tür');
}

/**
 * Der Stock **quer** zur Tür, jede Sekunde andersherum: Er rennt an der Wand
 * entlang, bleibt anderthalb Meter hinter der Tür — außerhalb der Reichweite
 * eines Monsters davor — und das hört man.
 */
function pushing(round: FlatRound, door: HouseDoor) {
  const at = doorCentre(door);
  const dx = at.x - round.player.x,
    dz = at.z - round.player.z;
  const d = Math.hypot(dx, dz) || 1;
  const sign = Math.floor(round.haunt.time) % 2 ? 1 : -1;
  return { x: (-dz / d) * sign, z: (dx / d) * sign, sprint: true };
}

describe('Gesperrte Türen bleiben Spielregel', () => {
  it('splittert eine Holztür nach 2,5 s, wenn es keinen Umweg gibt', () => {
    const { round, door } = penned('wood');
    const at = doorCentre(door);
    let arrived = -1;
    let split = -1;
    for (let t = 0; t < 30 && split < 0 && round.phase === 'running'; t += DT) {
      round.step(DT, pushing(round, door));
      if (arrived < 0 && Math.hypot(round.monster.x - at.x, round.monster.z - at.z) < 1.6)
        arrived = round.haunt.time;
      if (round.drain().some((e) => e.text === 'Holz splittert.')) split = round.haunt.time;
    }
    expect(arrived).toBeGreaterThan(0);
    expect(split).toBeGreaterThan(arrived + 2.5 - DT);
    expect(split).toBeLessThan(arrived + 2.5 + 1);
    expect(round.haunt.shut).not.toContain(door.id);
    expect(round.navigator.target).not.toBeNull();
  });

  it('zieht an einer Stahltür, bis der Riegel nachgibt — nie beim ersten Zug', () => {
    // Stahl splittert nicht, aber der Riegel gibt irgendwann nach
    // (`rules/doorLocks.ts`): mindestens zwei Züge, dann mit wachsender
    // Aussicht. Ein Monster, das vor einer Stahltür für immer stünde, machte
    // die Tafel zur Wand.
    const { round, door } = penned('metal');
    const at = doorCentre(door);
    let arrived = -1;
    let opened = -1;
    for (let t = 0; t < 30 && opened < 0 && round.phase === 'running'; t += DT) {
      round.step(DT, pushing(round, door));
      if (arrived < 0 && Math.hypot(round.monster.x - at.x, round.monster.z - at.z) < 1.6)
        arrived = round.haunt.time;
      const events = round.drain();
      expect(events.some((e) => e.text === 'Holz splittert.')).toBe(false);
      if (!round.haunt.shut.includes(door.id)) opened = round.haunt.time;
    }
    expect(arrived).toBeGreaterThan(0);
    expect(opened).toBeGreaterThan(0);
    // Zwei Züge im Takt von `PRY_COOLDOWN` sind die kürzeste Möglichkeit.
    expect(opened - arrived).toBeGreaterThan(PRY_COOLDOWN);
    expect(pryTries(round.locks, door.id)).toBe(0);
  });

  it('nimmt den Umweg, wenn es einen gibt', () => {
    // Nur eine Tür gesperrt, die anderen offen: Die Route führt vollständig
    // um die Sperre herum, und keine Tür wird als Wartepunkt genannt.
    const { round, door } = penned('metal');
    round.haunt.shut = round.haunt.shut.filter((id) => id === door.id);
    const here = round.monster.space;
    const spare = round.house.doors.find(
      (d) => d.id !== door.id && (d.a === here || (d.b ?? COMMAND) === here),
    );
    if (!spare) return;
    const other = door.a === here ? door.b! : door.a;
    const graph = housePlan(round.house, new Set(round.haunt.shut)).graph;
    const route = stationRoute(
      round.house,
      graph,
      { x: round.monster.x, z: round.monster.z, yaw: 0 },
      round.graph.centre(other),
      MONSTER_RADIUS,
    );
    if (!route.complete) return;
    const leg = round.navigator.aim(
      round.monster,
      round.graph.centre(other),
      round.haunt.shut,
      round.haunt.time,
    );
    expect(leg.complete).toBe(true);
    expect(leg.door).toBeNull();
    expect(round.navigator.remaining).toEqual(route.points);
  });
});

describe('Der Techniker aus Zahlen läuft denselben Weg', () => {
  it('kommt mit dem Stock zu jedem Ziel, ohne durch eine Wand zu gehen', () => {
    const round = new FlatRound(3, { test: true });
    const walker = new FlatWalker(round);
    const radius = PLAYER_RADIUS + WALL_T / 2 - 1e-6;
    const walls = walled(round);
    for (const job of round.jobs()) {
      let arrived = false;
      for (let t = 0; t < 120 && !arrived; t += DT) {
        const input = walker.input(job.at, DT);
        if (!input) {
          arrived = true;
          break;
        }
        const before = { x: round.player.x, z: round.player.z };
        round.step(DT, input);
        const clear = snapshotSegmentClear(walls(round.snapshot()), radius);
        expect(clear(before, round.player)).toBe(true);
      }
      expect(arrived).toBe(true);
    }
  });
});
