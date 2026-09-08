import { findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { keyX, keyZ, neighbour, tileKey } from '../nav/navTile';
import {
  generateHouse,
  onApron,
  outerEdges,
  roomAt,
  roomOf,
  tilesOf,
  APRON,
  HOUSE,
  MARKS,
  TASK_COUNT,
} from './house';
import { DRONE_PROFILE, housePlan } from './plan';

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

  it('stellt keinen Baustein in eine Türöffnung', () => {
    const plan = housePlan(spec);
    const blocked = new Set(spec.doors.map((door) => `${door.x}:${door.z}`));
    for (const room of spec.rooms) {
      for (const mark of room.marks) {
        expect(blocked.has(`${mark.x}:${mark.z}`)).toBe(false);
      }
    }
    expect(plan.blocks().length).toBeGreaterThan(0);
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
   */
  it('kommt durch eine geschlossene nicht, wo ein Mensch noch durchkommt', () => {
    const plan = housePlan(spec, new Set([inner.id]));
    expect(findPath(plan.graph, from, to, { profile: DRONE_PROFILE }).complete).toBe(false);
    expect(findPath(plan.graph, from, to, { profile: HUMAN_PROFILE }).complete).toBe(true);
  });
});
