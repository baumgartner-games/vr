import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { DIR_N, DIR_S, DIR_E, DIR_W, TILE, keyX, keyZ, neighbour, tileKey } from '../nav/navTile';
import { PLAN_WALL_H } from '../editor/levelPlan';
import {
  generateHouse,
  onApron,
  outerEdges,
  roomAt,
  roomOf,
  tilesOf,
  APRON,
  COMMAND_LIFT,
  HOUSE,
  MARKS,
  TASK_COUNT,
  type Rect,
} from './house';
import { DRONE_PROFILE, housePlan } from './plan';
import { TRAINING_ROOMS, trainingSpawn } from './trainingLayout';

/** Zwanzig Häuser, damit ein Fehler nicht vom Samen abhängt. */
const SEEDS = Array.from({ length: 20 }, (_, i) => 1000 + i * 7919);

describe('Das gewürfelte Haus', () => {
  it('kommt aus demselben Samen zweimal gleich heraus', () => {
    // Die Zusage, auf der alles andere steht: Der Archivar blättert in
    // demselben Grundriss, durch den der VR-Spieler läuft — und über die
    // Leitung ging nur eine Zahl.
    expect(JSON.stringify(generateHouse(4711))).toBe(JSON.stringify(generateHouse(4711)));
  });

  it('ergibt aus verschiedenen Samen verschiedene Häuser', () => {
    const seen = new Set(SEEDS.map((seed) => JSON.stringify(generateHouse(seed).rooms)));
    expect(seen.size).toBe(SEEDS.length);
  });

  for (const seed of SEEDS) {
    describe(`Same ${seed}`, () => {
      const spec = generateHouse(seed);

      it('deckt das Haus lückenlos und überschneidungsfrei mit Zimmern ab', () => {
        for (const tile of tilesOf(HOUSE)) {
          const hits = spec.rooms.filter(
            (room) =>
              tile.x >= room.rect.x &&
              tile.x < room.rect.x + room.rect.w &&
              tile.z >= room.rect.z &&
              tile.z < room.rect.z + room.rect.d,
          );
          expect(hits).toHaveLength(1);
        }
      });

      it('macht kein Zimmer schmaler als zwei Kacheln', () => {
        for (const room of spec.rooms) {
          expect(Math.min(room.rect.w, room.rect.d)).toBeGreaterThanOrEqual(2);
        }
      });

      /**
       * **Der Test, für den der Generator eine eigene Datei hat.**
       *
       * Ein Zimmer ohne Tür merkt man sonst erst, wenn vier Leute zwanzig
       * Minuten lang eine suchen, die es nie gab — und weil das Haus gewürfelt
       * ist, passiert es dann genau einmal und nie wieder reproduzierbar.
       */
      it('lässt einen von der Haustür in jedes Zimmer', () => {
        const plan = housePlan(spec);
        const entry = roomOf(spec, spec.entryRoom)!;
        const from = tileKey(entry.rect.x, entry.rect.z, 0);
        for (const room of spec.rooms) {
          const to = tileKey(room.rect.x, room.rect.z, 0);
          const path = findPath(plan.graph, from, to, { profile: HUMAN_PROFILE });
          expect(`${room.name} ${room.id}: ${path.complete}`).toBe(`${room.name} ${room.id}: true`);
        }
      });

      /**
       * **Kein Zimmer mit nur einer Tür.**
       *
       * Eine Sackgasse ist hier drei Sachen auf einmal: die Stelle, an der ein
       * Verfolger einen wirklich stellt, die Stelle, die der Späher nicht
       * beschreiben kann, weil sie aussieht wie jede andere Kammer — und seit
       * das Monster Türen zuwirft (`haunt.ts`) die Stelle, an der eine einzige
       * zugefallene Tür jemanden einsperrt. Die Haustür zählt mit: Sie ist der
       * zweite Ausgang des Eingangszimmers.
       */
      it('gibt jedem Zimmer mindestens zwei Türen', () => {
        const count = new Map(spec.rooms.map((room) => [room.id, 0]));
        for (const door of spec.doors) {
          count.set(door.a, (count.get(door.a) ?? 0) + 1);
          if (door.b) count.set(door.b, (count.get(door.b) ?? 0) + 1);
        }
        for (const room of spec.rooms) {
          expect(`${room.name} ${room.id}: ${count.get(room.id)}`).toBe(
            `${room.name} ${room.id}: ${Math.max(2, count.get(room.id) ?? 0)}`,
          );
        }
      });

      /**
       * Zwei Türen gehen nur, wenn es zwei Nachbarn gibt — dagegen hilft keine
       * Tür, sondern nur ein anderer Zuschnitt (`SPLIT_TRIES`). Der Test hängt
       * an derselben Zusage wie der darüber und sagt, **woran** es lag, wenn
       * sie einmal nicht mehr gilt.
       */
      it('lässt jedes Zimmer an mindestens zwei andere grenzen', () => {
        for (const room of spec.rooms) {
          const neighbours = spec.rooms.filter(
            (other) => other.id !== room.id && touches(room.rect, other.rect),
          );
          expect(`${room.id}: ${neighbours.length}`).toBe(
            `${room.id}: ${Math.max(2, neighbours.length)}`,
          );
        }
      });

      it('setzt die Haustür in die Südwand des Eingangszimmers', () => {
        const front = spec.doors.find((door) => door.id === spec.frontDoor)!;
        expect(front.b).toBeNull();
        expect(front.z).toBe(HOUSE.z + HOUSE.d - 1);
        expect(front.a).toBe(spec.entryRoom);
      });

      it('gibt jedem Zimmer sein kennzeichnendes Merkmal', () => {
        for (const room of spec.rooms) {
          expect(room.marks.map((mark) => mark.id)).toContain(room.signature);
        }
      });

      it('stellt jedes Merkmal in sein eigenes Zimmer und auf eine eigene Kachel', () => {
        for (const room of spec.rooms) {
          const tiles = new Set<string>();
          for (const mark of room.marks) {
            expect(roomAt(spec, mark.x, mark.z)?.id).toBe(room.id);
            tiles.add(`${mark.x}:${mark.z}`);
          }
          expect(tiles.size).toBe(room.marks.length);
        }
      });

      /**
       * Zwillinge sind gewollt — zwei Bäder, ein Name, ein Unterschied. Was
       * **nicht** gewollt ist: zwei Zimmer, die auch im Unterschied gleich
       * sind. Dann ist die Verwechslung nicht lustig, sondern unlösbar.
       */
      it('unterscheidet gleichnamige Zimmer in ihrem Merkmal', () => {
        const byName = new Map<string, string[]>();
        for (const room of spec.rooms) {
          byName.set(room.name, [...(byName.get(room.name) ?? []), room.signature]);
        }
        for (const [, signatures] of byName) {
          expect(new Set(signatures).size).toBe(signatures.length);
        }
      });

      it('verteilt drei Aufgaben auf drei verschiedene Zimmer, keine im Eingang', () => {
        expect(spec.tasks).toHaveLength(TASK_COUNT);
        const rooms = spec.tasks.map((task) => task.roomId);
        expect(new Set(rooms).size).toBe(TASK_COUNT);
        expect(rooms).not.toContain(spec.entryRoom);
      });

      it('sagt zu jeder Aufgabe ein Merkmal an, das es im Zielzimmer gibt', () => {
        for (const task of spec.tasks) {
          const room = roomOf(spec, task.roomId)!;
          expect(task.hint).toContain(MARKS[room.signature]);
          expect(roomAt(spec, task.x, task.z)?.id).toBe(task.roomId);
        }
      });

      it('lässt genau ein Zimmer ohne Lampe, und nie den Eingang', () => {
        const dark = spec.rooms.filter((room) => !room.lamp);
        expect(dark).toHaveLength(1);
        expect(dark[0]!.id).not.toBe(spec.entryRoom);
      });

      /**
       * **Fenster gehen nach draußen und nirgendwo sonst.**
       *
       * Ein Fenster zwischen zwei Zimmern wäre eine zweite Sorte Tür, durch
       * die man sieht — und damit ein Grundriss, den weder der Archivar noch
       * der Späher noch beschreiben kann. Nach außen ist es dagegen die eine
       * Stelle, an der der VR-Spieler im Dunkeln etwas sieht, das nicht in
       * seinem Lichtkegel steht.
       */
      it('setzt jedes Fenster in eine Außenwand des Hauses', () => {
        for (const win of spec.windows) {
          const room = roomOf(spec, win.roomId)!;
          const edges = outerEdges(room.rect);
          expect(
            edges.some((edge) => edge.x === win.x && edge.z === win.z && edge.dir === win.dir),
          ).toBe(true);
          expect(roomAt(spec, win.x, win.z)?.id).toBe(win.roomId);
        }
      });

      it('gibt jedem Haus mindestens ein Fenster und keinem eine doppelte Kante', () => {
        expect(spec.windows.length).toBeGreaterThan(0);
        const edges = spec.windows.map((win) => `${win.x}:${win.z}:${win.dir}`);
        expect(new Set(edges).size).toBe(edges.length);
      });

      /**
       * Zwei Öffnungen in derselben Kachelkante gibt es nicht — und ein
       * Fenster hinter dem Bücherregal ist von innen nichts und von außen ein
       * Rätsel.
       */
      it('setzt kein Fenster in eine Tür und keines hinter ein Möbel', () => {
        const taken = new Set(spec.doors.map((door) => `${door.x}:${door.z}:${door.dir}`));
        for (const room of spec.rooms) {
          for (const mark of room.marks) taken.add(`${mark.x}:${mark.z}:${mark.dir}`);
        }
        for (const win of spec.windows) {
          expect(taken.has(`${win.x}:${win.z}:${win.dir}`)).toBe(false);
        }
      });

      it('hängt den Sicherungskasten nicht ins Eingangszimmer', () => {
        expect(spec.fuse.roomId).not.toBe(spec.entryRoom);
        expect(roomAt(spec, spec.fuse.x, spec.fuse.z)?.id).toBe(spec.fuse.roomId);
      });
    });
  }
});

describe('Der Grundriss als Kachelgitter', () => {
  const spec = generateHouse(2024);

  /**
   * Haus **und** Vorplatz — und keine Kachel mehr.
   *
   * Der Vorplatz kam dazu, als die Drohne einen Hangar am Van bekam; ohne ihn
   * gäbe es für die Wegsuche kein Draußen. Die Zahl steht trotzdem noch hier,
   * und zwar genau deshalb: Ein Gitter, das unbemerkt weiterwächst, ist ein
   * Haus, in dem irgendwann jemand über den Rand hinausläuft.
   */
  it('legt Boden über Haus und Vorplatz und nicht darüber hinaus', () => {
    const plan = housePlan(spec);
    const tiles = [...plan.graph.tileKeys()];
    expect(tiles).toHaveLength(HOUSE.w * HOUSE.d + APRON.w * APRON.d);
    expect(tiles.filter((key) => onApron(keyX(key), keyZ(key)))).toHaveLength(APRON.w * APRON.d);
  });

  it('sperrt eine geschlossene Tür wirklich zu', () => {
    // Eine Tür, die im Plan zu ist, aber im Graphen offen, ist die Sorte
    // Fehler, die der Hacker als „mein Schalter tut nichts" meldet.
    const inner = spec.doors.find((door) => door.b !== null)!;
    const open = housePlan(spec, new Set());
    const shut = housePlan(spec, new Set([inner.id]));
    const key = tileKey(inner.x, inner.z, 0);
    expect(open.graph.wall(key, inner.dir)?.open).toBe(true);
    expect(shut.graph.wall(key, inner.dir)?.open).toBe(false);
  });

  it('zieht offene Schottblätter vollständig aus dem Laufweg zurück', () => {
    const inner = spec.doors.find((door) => door.b !== null)!;
    const open = housePlan(spec);
    const shut = housePlan(spec, new Set([inner.id]));
    const key = tileKey(inner.x, inner.z, 0);
    const id = open.graph.wall(key, inner.dir)!.id;
    expect(open.solids().some((solid) => solid.door === id)).toBe(false);
    expect(shut.solids().filter((solid) => solid.door === id)).toHaveLength(1);
  });

  /**
   * **Ein Fenster hält auf wie eine Wand** — und genau darin unterscheidet es
   * sich von einer Tür.
   *
   * Man sieht hindurch und hört mehr als durch die Wand daneben, aber niemand
   * geht hindurch, und die Drohne fliegt nicht hindurch. Ohne diese Zusage
   * wäre die Außenwand des Hauses ein Sieb, und „die Haustür ist zu" hieße
   * nichts mehr.
   */
  it('macht aus einem Fenster kein Loch in der Außenwand', () => {
    const plan = housePlan(spec);
    for (const win of spec.windows) {
      const key = tileKey(win.x, win.z, 0);
      const facts = plan.graph.wall(key, win.dir);
      expect(facts?.kind).toBe('window');
      const outside = neighbour(key, win.dir);
      for (const profile of [HUMAN_PROFILE, DRONE_PROFILE]) {
        const path = findPath(plan.graph, key, outside, { profile });
        // Hinaus geht es nur durch die Haustür: Der Weg nach draußen ist
        // länger als eine Kante, oder es gibt gar keinen.
        expect(path.tiles.length === 2 && path.complete).toBe(false);
      }
    }
  });

  it('baut keine alten Möbel-Bausteine unter die Stationsmodelle', () => {
    const plan = housePlan(spec);
    const blocked = new Set(spec.doors.map((door) => `${door.x}:${door.z}`));
    for (const room of spec.rooms) {
      for (const mark of room.marks) {
        expect(blocked.has(`${mark.x}:${mark.z}`)).toBe(false);
      }
    }
    expect(plan.blocks()).toHaveLength(0);
    expect(housePlan(spec, new Set(), true).blocks()).toHaveLength(0);
  });

  it('baut die getrennten Lehrzimmer nur im Testmodus mit vollständiger Hülle', () => {
    const mission = housePlan(spec);
    const training = housePlan(spec, new Set(), true);
    const extraTiles = TRAINING_ROOMS.reduce((total, room) => total + room.w * room.d, 0);
    expect([...training.graph.tileKeys()]).toHaveLength(
      [...mission.graph.tileKeys()].length + extraTiles,
    );
    for (const room of TRAINING_ROOMS) {
      for (const tile of tilesOf(room)) {
        const key = tileKey(tile.x, tile.z, 0);
        expect(mission.graph.tile(key)).toBeUndefined();
        expect(training.graph.tile(key)).toBeDefined();
        if (tile.x === room.x) expect(training.graph.wall(key, DIR_W)?.kind).toBe('solid');
        if (tile.x === room.x + room.w - 1)
          expect(training.graph.wall(key, DIR_E)?.kind).toBe('solid');
        if (tile.z === room.z) expect(training.graph.wall(key, DIR_N)?.kind).toBe('solid');
        if (tile.z === room.z + room.d - 1)
          expect(training.graph.wall(key, DIR_S)?.kind).toBe('solid');
      }
      expect(
        training
          .masses()
          .some(
            (mass) =>
              mass.rect.x === room.x &&
              mass.rect.z === room.z &&
              mass.rect.w === room.w &&
              mass.rect.d === room.d &&
              mass.from === PLAN_WALL_H,
          ),
      ).toBe(true);
    }
  });

  it('setzt Test-Teleports auf Boden und nicht in Hülle oder Missionspfade', () => {
    const plan = housePlan(spec, new Set(), true);
    const solids = plan.solids();
    const entry = roomOf(spec, spec.entryRoom)!;
    const from = tileKey(entry.rect.x, entry.rect.z, 0);
    for (const room of TRAINING_ROOMS) {
      const spawn = trainingSpawn(room.id);
      const to = tileKey(Math.floor(spawn.x / TILE), Math.floor(spawn.z / TILE), 0);
      expect(findPath(plan.graph, from, to, { profile: HUMAN_PROFILE }).complete).toBe(false);
      const beneath = solids.filter(
        (solid) =>
          Math.abs(spawn.x - solid.x) <= solid.w / 2 && Math.abs(spawn.z - solid.z) <= solid.d / 2,
      );
      expect(beneath.some((solid) => solid.kind === 'floor' && solid.y + solid.h / 2 === 0)).toBe(
        true,
      );
      expect(
        solids.some(
          (solid) =>
            Math.abs(spawn.x - solid.x) < solid.w / 2 + 0.45 &&
            Math.abs(spawn.z - solid.z) < solid.d / 2 + 0.45 &&
            solid.y + solid.h / 2 > 0 &&
            solid.y - solid.h / 2 < 2,
        ),
      ).toBe(false);
    }
  });

  it('öffnet den Zugang zum Testdeck ausschließlich im Testmodus', () => {
    const door = tileKey(COMMAND_LIFT.x, COMMAND_LIFT.z, 0);
    expect(housePlan(spec).graph.wall(door, DIR_W)?.open).toBe(false);
    expect(housePlan(spec, new Set(), true).graph.wall(door, DIR_W)?.open).toBe(true);
  });
});

describe('Wie weit die Drohne kommt', () => {
  const spec = generateHouse(31337);
  const inner = spec.doors.find((door) => door.b !== null)!;
  const from = tileKey(inner.x, inner.z, 0);
  const to = neighbour(from, inner.dir);

  it('fliegt durch eine offene Tür', () => {
    const plan = housePlan(spec);
    expect(findPath(plan.graph, from, to, { profile: DRONE_PROFILE }).complete).toBe(true);
  });

  /**
   * **Die Spielregel, an der die halbe Rollenverzahnung hängt.**
   *
   * Die Drohne hat keine Hände. Wo sie hinkommt, hängt daran, was der
   * VR-Spieler und der Hacker offen gelassen haben — und wo ein Mensch noch
   * durchkommt, steht sie davor. Stünde das nur in der Oberfläche
   * („Sie macht keine Tür auf"), wäre es beim nächsten Umbau am Profil eine
   * Behauptung.
   *
   * Gefragt wird nach **dieser Kante** und nicht danach, ob sie am Ziel
   * ankommt: Seit jedes Zimmer zwei Türen hat, gibt es fast immer einen Umweg,
   * und der ist gewollt. Die Zusage ist „nicht hier hindurch" — ein einziger
   * Schritt über die geschlossene Tür, den der Mensch macht und sie nicht.
   */
  it('kommt durch eine geschlossene nicht, wo ein Mensch noch durchkommt', () => {
    const plan = housePlan(spec, new Set([inner.id]));
    const flight = findPath(plan.graph, from, to, { profile: DRONE_PROFILE });
    expect(flight.tiles.length === 2 && flight.complete).toBe(false);
    const walk = findPath(plan.graph, from, to, { profile: HUMAN_PROFILE });
    expect(walk.tiles.length === 2 && walk.complete).toBe(true);
  });
});

/**
 * Ob zwei Rechtecke eine Kante teilen — dieselbe Frage, die der Generator in
 * `shared` stellt, nur ohne die Türplätze dazu.
 */
function touches(a: Rect, b: Rect): boolean {
  const overX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overZ = Math.min(a.z + a.d, b.z + b.d) - Math.max(a.z, b.z);
  const sideX = a.x + a.w === b.x || b.x + b.w === a.x;
  const sideZ = a.z + a.d === b.z || b.z + b.d === a.z;
  return (sideX && overZ > 0) || (sideZ && overX > 0);
}
