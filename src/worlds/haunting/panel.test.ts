import { generateHouse, MARKS } from './house';
import { visibleSwitches } from './panel';

const SEEDS = [11, 4711, 90210, 2024, 7];

describe('Die Schalttafel', () => {
  for (const seed of SEEDS) {
    describe(`Same ${seed}`, () => {
      const spec = generateHouse(seed);

      it('hat für jede Tür und jede Lampe einen Schalter', () => {
        const lamps = spec.rooms.filter((room) => room.lamp).length;
        const lights = spec.switches.filter((one) => one.kind === 'light');
        const doors = spec.switches.filter((one) => one.kind === 'door');
        expect(lights).toHaveLength(lamps);
        expect(doors).toHaveLength(spec.doors.length);
      });

      it('zeigt jeden Schalter auf etwas, das es gibt', () => {
        const rooms = new Set(spec.rooms.map((room) => room.id));
        const doors = new Set(spec.doors.map((door) => door.id));
        for (const entry of spec.switches) {
          expect(entry.kind === 'door' ? doors.has(entry.target) : rooms.has(entry.target)).toBe(
            true,
          );
        }
      });

      /**
       * **Die Regel, an der alles hängt: Beschriftungen lügen nie.**
       *
       * Wo ein Zimmername auf der Tafel steht, gehört der Schalter wirklich in
       * dieses Zimmer; wo eine Sorte steht, ist es wirklich diese Sorte. Eine
       * einzige Lüge macht jede andere Zeile wertlos — dann kann der Hacker
       * seiner Kartierung nicht mehr trauen, und die halbe Stunde Arbeit
       * daran ist weg.
       */
      it('beschriftet nie falsch, sondern nur unvollständig', () => {
        const roomName = new Map(spec.rooms.map((room) => [room.id, room.name]));
        const doorRoom = new Map(spec.doors.map((door) => [door.id, door.a]));
        for (const entry of spec.switches) {
          const home =
            entry.kind === 'door'
              ? roomName.get(doorRoom.get(entry.target)!)!
              : roomName.get(entry.target)!;
          const sort = entry.kind === 'light' ? 'Licht' : 'Tür';

          for (const name of new Set(roomName.values())) {
            // Steht ein Zimmername darauf, ist es dieses Zimmer.
            if (entry.label.includes(name)) expect(home).toBe(name);
          }
          for (const other of ['Licht', 'Tür']) {
            // Und steht eine Sorte darauf, ist es diese Sorte.
            if (entry.label.startsWith(`${other} `)) expect(sort).toBe(other);
          }
        }
      });

      it('lässt vor dem Sicherungskasten schon etwas übrig, das Licht macht', () => {
        const before = visibleSwitches(spec.switches, false);
        expect(before.length).toBeGreaterThan(0);
        expect(before.filter((one) => one.kind === 'light').length).toBeGreaterThanOrEqual(1);
      });

      it('macht den Sicherungskasten zu einem Unterschied, den man merkt', () => {
        const before = visibleSwitches(spec.switches, false).length;
        const after = visibleSwitches(spec.switches, true).length;
        expect(after).toBeGreaterThan(before);
        expect(after).toBe(spec.switches.length);
      });

      /**
       * **Die Schallköder sind weg.** Es gab eine dritte Sorte Schalter, die
       * das Monster anlockte; sie war der eine direkte Griff der Tafel an das
       * Vieh und hat es in Ecken geparkt, statt dem Hacker etwas zu erzählen.
       * Der Test bleibt stehen, nur andersherum: Es darf keine mehr geben.
       */
      it('kennt nur noch zwei Sorten Schalter — keine Köder mehr', () => {
        for (const entry of spec.switches) expect(['light', 'door']).toContain(entry.kind);
        expect(spec.switches.filter((one) => one.label.includes('Radio'))).toHaveLength(0);
        expect(spec.switches).toHaveLength(
          spec.rooms.filter((room) => room.lamp).length + spec.doors.length,
        );
      });

      it('lässt die Türen offen und das Licht aus, wenn es losgeht', () => {
        for (const entry of spec.switches) {
          expect(entry.on).toBe(entry.kind === 'door');
        }
      });

      it('mischt die Sorten, damit die Position nichts verrät', () => {
        // Stünden die Sorten in Blöcken, wäre ein „X" an Position drei immer
        // eine Lampe — und die halbe Aufgabe des Hackers fiele weg.
        const kinds = spec.switches.map((one) => one.kind);
        const blocks = kinds.filter((kind, index) => kind !== kinds[index - 1]).length;
        expect(blocks).toBeGreaterThan(2);
      });
    });
  }

  it('nennt jedes Merkmal beim Namen', () => {
    // Das Dossier des Archivars liest diese Tabelle vor; ein Merkmal ohne
    // Namen wäre eine leere Zeile in seiner Akte.
    for (const label of Object.values(MARKS)) expect(label.length).toBeGreaterThan(2);
  });
});
