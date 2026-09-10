import { DOOR_LOSS, WALL_LOSS } from './audio/hearing';
import { generateHouse, spacesOf, type HouseSpec, type Rect } from './house';
import { COMMAND, stationGraph, type StationGraph } from './roomGraph';

/**
 * **Was hier gemessen wird**: ob ein Geräusch durch eine Wand geht, an der
 * keine Tür sitzt.
 *
 * Der Befund des Besitzers war „Schall bewegt sich nicht durch die Grenzen
 * anliegender Räume", und genau hier saß er: `earshot` rechnete über
 * `neighbours()`, und `neighbours` sind **Tür**nachbarn. Zwei Zimmer Wand an
 * Wand ohne Tür dazwischen gab es in dieser Rechnung nicht — das Monster hörte
 * sie so weit auseinander wie den Umweg über den halben Gang.
 *
 * Die gewürfelte Station (`generateHouse(seed, 14)`) hat den Fall nicht: dort
 * hat **jedes** Paar aneinanderstoßender Räume auch eine Tür. Das gewürfelte
 * Haus hat ihn reihenweise — der Baum der Türen lässt Nachbarschaften übrig —,
 * und deshalb wird hier daran gemessen.
 */

/** Räume, die eine Wand teilen und keine gemeinsame Tür haben. */
function wallOnlyPairs(spec: HouseSpec): Array<[string, string]> {
  const spaces = spacesOf(spec);
  const doors = new Set(spec.doors.map((door) => [door.a, door.b ?? COMMAND].sort().join('|')));
  const out: Array<[string, string]> = [];
  for (let i = 0; i < spaces.length; i++)
    for (let j = i + 1; j < spaces.length; j++) {
      const a = spaces[i]!,
        b = spaces[j]!;
      if (!touching(a.rect, b.rect)) continue;
      if (doors.has([a.id, b.id].sort().join('|'))) continue;
      out.push([a.id, b.id]);
    }
  return out;
}

function touching(a: Rect, b: Rect): boolean {
  const alongX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const alongZ = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
  if (a.x + a.w === b.x || b.x + b.w === a.x) return alongZ > 0;
  if (a.z + a.d === b.z || b.z + b.d === a.z) return alongX > 0;
  return false;
}

/**
 * Die alte Rechnung, zum Vergleich: Floyd–Warshall über `neighbours()` — also
 * über Türen — mit neun Metern Aufschlag je Durchgang. Genau so stand es hier,
 * und genau so weit weg war der Raum hinter der Wand.
 */
const OLD_DOOR_LOSS = 9;

function earshotViaDoors(graph: StationGraph): (a: string, b: string) => number {
  const ids = graph.spaces;
  const index = new Map(ids.map((id, i) => [id, i]));
  const size = ids.length;
  const muffle = new Float64Array(size * size).fill(Infinity);
  for (let i = 0; i < size; i++) muffle[i * size + i] = 0;
  for (const id of ids)
    for (const other of graph.neighbours(id)) {
      const a = graph.centre(id),
        b = graph.centre(other);
      muffle[index.get(id)! * size + index.get(other)!] =
        Math.hypot(a.x - b.x, a.z - b.z) + OLD_DOOR_LOSS;
    }
  for (let k = 0; k < size; k++)
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) {
        const quiet = muffle[i * size + k]! + muffle[k * size + j]!;
        if (quiet < muffle[i * size + j]!) muffle[i * size + j] = quiet;
      }
  return (a, b) => muffle[index.get(a)! * size + index.get(b)!]!;
}

describe('Die Raumkarte hört durch Wände', () => {
  it('dämpft eine Wand ohne Tür, statt sie um die halbe Station zu schicken', () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 7, 1000]) {
      const spec = generateHouse(seed);
      const graph = stationGraph(spec);
      const before = earshotViaDoors(graph);
      for (const [a, b] of wallOnlyPairs(spec)) {
        const air = Math.hypot(
          graph.centre(a).x - graph.centre(b).x,
          graph.centre(a).z - graph.centre(b).z,
        );
        // Durch die Wand: Luftlinie plus WALL_LOSS. Endlich, gedämpft, und
        // deutlich mehr als die Luftlinie — aber eben nicht unhörbar.
        expect(graph.earshot(a, b)).toBeCloseTo(air + WALL_LOSS, 6);
        expect(graph.earshot(a, b)).toBeGreaterThan(air);
        // Und immer näher, als der Umweg über die Türen es je war.
        expect(graph.earshot(a, b)).toBeLessThan(before(a, b));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(10);
  });

  /**
   * Der Fall, an dem es am deutlichsten war — als eine einzelne Zahl, damit
   * niemand ihn wieder wegoptimiert: zwei Zimmer, zehn Meter Luftlinie, eine
   * Wand dazwischen. Über die Türen waren es hundert Meter, und bei den
   * vierzehn Metern, über die ein Geräusch der Lautstärke 1 etwas aussagt
   * (`monsterMemory.CARRY`), heißt hundert Meter schlicht: taub.
   */
  it('hört im gewürfelten Haus mit Samen 3 den Raum nebenan auf 19 statt auf 100 Metern', () => {
    const spec = generateHouse(3);
    const graph = stationGraph(spec);
    const air = Math.hypot(
      graph.centre('r4').x - graph.centre('r5').x,
      graph.centre('r4').z - graph.centre('r5').z,
    );
    expect(air).toBeCloseTo(10, 6);
    expect(earshotViaDoors(graph)('r4', 'r5')).toBeGreaterThan(100);
    expect(graph.earshot('r4', 'r5')).toBeCloseTo(10 + WALL_LOSS, 6);
  });

  it('lässt die Wegsuche unberührt — durch eine Wand geht niemand', () => {
    for (const seed of [1, 2, 3, 7, 1000]) {
      const spec = generateHouse(seed);
      const graph = stationGraph(spec);
      const doors = new Set(spec.doors.map((door) => [door.a, door.b ?? COMMAND].sort().join('|')));
      for (const id of graph.spaces)
        for (const other of graph.neighbours(id))
          expect(doors.has([id, other].sort().join('|'))).toBe(true);
      // Der Weg über die Wandnachbarn wäre kürzer — er darf trotzdem nicht
      // vorkommen: `distance` und `next` bleiben Türwege.
      for (const [a, b] of wallOnlyPairs(spec)) {
        expect(graph.neighbours(a)).not.toContain(b);
        expect(graph.neighbours(b)).not.toContain(a);
        expect(graph.distance(a, b)).toBeGreaterThan(
          Math.hypot(graph.centre(a).x - graph.centre(b).x, graph.centre(a).z - graph.centre(b).z),
        );
      }
    }
  });

  it('nimmt für eine Tür dieselbe Zahl wie das Hörmodell', () => {
    const spec = generateHouse(1000, 14);
    const graph = stationGraph(spec);
    // Auf der Station hat jedes Wandpaar auch eine Tür — dort gewinnt das
    // Türblatt, weil es weniger schluckt als das Mauerwerk daneben.
    expect(wallOnlyPairs(spec)).toHaveLength(0);
    for (const door of spec.doors) {
      const a = door.a,
        b = door.b ?? COMMAND;
      const air = Math.hypot(
        graph.centre(a).x - graph.centre(b).x,
        graph.centre(a).z - graph.centre(b).z,
      );
      expect(graph.earshot(a, b)).toBeLessThanOrEqual(air + DOOR_LOSS + 1e-6);
    }
    expect(DOOR_LOSS).toBeLessThan(WALL_LOSS);
  });
});
