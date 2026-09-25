import { DOOR_LOSS, WALL_LOSS } from './audio/hearing';
import { generateHouse, roomTiles, spacesOf, type HouseRoom, type HouseSpec } from './house';
import {
  COMMAND,
  monsterGraph,
  portalPoint,
  stationGraph,
  walkingGap,
  type StationGraph,
} from './roomGraph';
import { COMMAND_HOME } from './trainingLayout';

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
      if (!tilesTouch(a, b)) continue;
      if (doors.has([a.id, b.id].sort().join('|'))) continue;
      out.push([a.id, b.id]);
    }
  return out;
}

/** Ob zwei Räume Kachel an Kachel liegen — auch geformte (`HouseRoom.shape`). */
function tilesTouch(a: HouseRoom, b: HouseRoom): boolean {
  const theirs = new Set(roomTiles(b).map((tile) => `${tile.x},${tile.z}`));
  return roomTiles(a).some(
    (tile) =>
      theirs.has(`${tile.x + 1},${tile.z}`) ||
      theirs.has(`${tile.x - 1},${tile.z}`) ||
      theirs.has(`${tile.x},${tile.z + 1}`) ||
      theirs.has(`${tile.x},${tile.z - 1}`),
  );
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
  it('hört im gewürfelten Haus den Raum nebenan durch die Wand statt um die halbe Station', () => {
    // Das Zufallshaus misst seit dem 1-m-Gitter vierzig mal dreißig Meter, und
    // welche zwei Zimmer Wand an Wand ohne Tür liegen, entscheidet der Samen.
    // Gesucht wird deshalb das deutlichste Paar aus fünf Häusern — und für das
    // muss gelten: durch die Wand Luftlinie plus WALL_LOSS, über die Türen
    // mindestens das Doppelte.
    let widest: { air: number; wall: number; doors: number } | null = null;
    for (const seed of [1, 2, 3, 7, 1000]) {
      const spec = generateHouse(seed);
      const graph = stationGraph(spec);
      const viaDoors = earshotViaDoors(graph);
      for (const [a, b] of wallOnlyPairs(spec)) {
        const air = Math.hypot(
          graph.centre(a).x - graph.centre(b).x,
          graph.centre(a).z - graph.centre(b).z,
        );
        const found = { air, wall: graph.earshot(a, b), doors: viaDoors(a, b) };
        if (!widest || found.doors - found.wall > widest.doors - widest.wall) widest = found;
      }
    }
    expect(widest).not.toBeNull();
    expect(widest!.wall).toBeCloseTo(widest!.air + WALL_LOSS, 6);
    expect(widest!.doors).toBeGreaterThan(2 * widest!.wall);
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

/**
 * **Die Karte, auf der es die Einsatzzentrale nicht gibt.**
 *
 * Der Besitzer wollte zwei Dinge, und sie sind nicht dasselbe: Das Monster
 * soll nicht dorthin gehen **können**, und es soll den Ort nicht **kennen**.
 * Eine Prüfung „falls Ziel = Zentrale, dann nicht" erfüllt nur das erste und
 * lässt das Vieh weiter dort suchen, lauern und vermuten. Deshalb fehlt der
 * Knoten ganz — und mit ihm die Schleuse, die dorthin führt.
 */
describe('Die Karte des Monsters', () => {
  const SEEDS = [1, 2, 3, 7, 1000];

  it('kennt jeden Raum und jeden Gang, aber nicht die Zentrale', () => {
    for (const seed of SEEDS) {
      const spec = generateHouse(seed, 14);
      const all = stationGraph(spec);
      const prowl = monsterGraph(spec);
      expect(all.spaces).toContain(COMMAND);
      expect(prowl.spaces).not.toContain(COMMAND);
      expect(prowl.spaces).toEqual(all.spaces.filter((id) => id !== COMMAND));
      expect(prowl.rooms).toEqual(all.rooms);
    }
  });

  it('kennt die Schleuse nicht — weder als Nachbar noch als Tür noch als Weg', () => {
    for (const seed of SEEDS) {
      const spec = generateHouse(seed, 14);
      const prowl = monsterGraph(spec);
      const airlocks = spec.doors.filter((door) => door.b === null);
      expect(airlocks.length).toBeGreaterThan(0);
      for (const door of airlocks) {
        expect(prowl.doorsOf(door.a)).not.toContain(door.id);
        expect(prowl.doorPoint(door.id)).toBeNull();
      }
      for (const id of prowl.spaces) {
        expect(prowl.neighbours(id)).not.toContain(COMMAND);
        expect(prowl.distance(id, COMMAND)).toBe(Infinity);
        // `next` am unbekannten Ziel heißt: keinen Schritt in diese Richtung.
        expect(prowl.next(id, COMMAND)).toBe(id);
      }
    }
  });

  /**
   * Und es kann nicht einmal **benennen**, wo jemand da gerade steht: Der
   * Vorplatz ist für diese Karte kein Raum. Genau daran hängen die
   * Buchführungen, die aus einem Raum eine Vermutung machen
   * (`monster/monsterMemory.ts` legt seine Räume aus `spaces` an).
   */
  it('gibt für den Vorplatz keinen Raum zurück, die ganze Karte schon', () => {
    for (const seed of SEEDS) {
      const spec = generateHouse(seed, 14);
      const home = { x: COMMAND_HOME.x, z: COMMAND_HOME.z };
      expect(stationGraph(spec).spaceAt(home)).toBe(COMMAND);
      expect(monsterGraph(spec).spaceAt(home)).toBe('');
    }
  });

  it('lässt die Karte des Technikers unangetastet', () => {
    const spec = generateHouse(3, 14);
    const all = stationGraph(spec);
    expect(all.spaces).toContain(COMMAND);
    expect(all.neighbours(COMMAND).length).toBeGreaterThan(0);
    expect(Number.isFinite(all.distance(all.rooms[0]!, COMMAND))).toBe(true);
  });
});

/**
 * **Wie weit es zu Fuß ist** (`walkingGap`): über die Türen, nicht über die
 * Mitten. Ein Monster sechs Meter hinter der Tür der Cafeteria ist nah — auch
 * wenn die Mitte der Cafeteria zwölf Meter von dieser Tür entfernt liegt.
 */
describe('Der Weg zu Fuß über die Türen', () => {
  it('misst im selben Raum die Luftlinie und beim Nachbarn über die gemeinsame Tür', () => {
    const spec = generateHouse(2, 14);
    const graph = stationGraph(spec);
    const room = spec.rooms[0]!;
    const next = graph.neighbours(room.id).find((id) => id !== COMMAND)!;
    const door = portalPoint(graph, room.id, next)!;
    expect(door).not.toBeNull();
    // Je zwei Meter diesseits und jenseits der Tür: vier Meter zu Fuß.
    const c = graph.centre(room.id);
    // Senkrecht zur Türkante hinein und hinaus.
    const dx = c.x - door.x,
      dz = c.z - door.z;
    const towards =
      Math.abs(dx) > Math.abs(dz) ? { x: Math.sign(dx), z: 0 } : { x: 0, z: Math.sign(dz) };
    const inside = { x: door.x + towards.x * 2, z: door.z + towards.z * 2, space: room.id };
    const outside = { x: door.x - towards.x * 2, z: door.z - towards.z * 2, space: next };
    expect(walkingGap(graph, inside, outside)).toBeCloseTo(4);
    expect(walkingGap(graph, inside, { ...c, space: room.id })).toBeCloseTo(
      Math.hypot(inside.x - c.x, inside.z - c.z),
    );
    // Die Mitten sind weiter auseinander als die zwei Stellen an der Tür.
    expect(graph.distance(room.id, next)).toBeGreaterThan(4);
  });

  it('geht zwei Knoten weit über beide Türen, sonst über die Mitten', () => {
    const spec = generateHouse(2, 14);
    const graph = stationGraph(spec);
    const room = spec.rooms[0]!;
    const mid = graph.neighbours(room.id).find((id) => id !== COMMAND)!;
    const beyond = graph.neighbours(mid).find((id) => id !== room.id && id !== COMMAND)!;
    const a = portalPoint(graph, room.id, mid)!,
      b = portalPoint(graph, mid, beyond)!;
    const from = { ...a, space: room.id };
    const to = { ...b, space: beyond };
    expect(walkingGap(graph, from, to)).toBeCloseTo(Math.hypot(a.x - b.x, a.z - b.z));
    // Ohne gemeinsame Tür in zwei Schritten bleibt die Weglänge der Mitten.
    const far = graph.spaces.find(
      (id) =>
        id !== room.id &&
        !graph.neighbours(room.id).includes(id) &&
        !graph.neighbours(room.id).some((n) => graph.neighbours(n).includes(id)),
    )!;
    expect(walkingGap(graph, from, { ...graph.centre(far), space: far })).toBe(
      graph.distance(room.id, far),
    );
  });
});
