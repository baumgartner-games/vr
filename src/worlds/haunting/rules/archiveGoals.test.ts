import { generateHouse, roomOf } from '../house';
import { TILE } from '../../nav/navTile';
import { repairsFor, ROOM_COUNTS } from '../mission';
import { taskCargo } from './cargo';
import {
  archiveGoals,
  canCarryPart,
  carriedPart,
  DROPPED_SEEN,
  droppedSighting,
  fullHandsText,
  orderDone,
  type ArchiveState,
} from './archiveGoals';

const spec = generateHouse(4711, ROOM_COUNTS[0]);
const repairs = repairsFor(spec);

function state(over: Partial<ArchiveState> = {}): ArchiveState {
  return {
    time: 100,
    taken: [],
    done: [],
    crew: { inventory: [] },
    ...over,
  };
}

describe('Das Blatt des Archivars', () => {
  it('nennt zu jedem Auftrag die Kiste — von der ersten Sekunde an', () => {
    const orders = archiveGoals(spec, state());
    expect(orders).toHaveLength(3);
    orders.forEach((order, index) => {
      const repair = repairs[index]!;
      const crate = taskCargo(spec, repair.itemId);
      expect(order.id).toBe(repair.id);
      expect(order.crate.id).toBe(crate.id);
      expect(order.crate.clue).toBe(crate.clue);
      expect(order.crate.roomName).toBe(roomOf(spec, crate.roomId)!.name);
      expect(order.step).toBe(0);
    });
  });

  it('verschweigt die Konsole, solange das Teil in der Kiste liegt', () => {
    for (const order of archiveGoals(spec, state())) expect(order.console).toBeNull();
  });

  it('zeigt die Konsole, sobald der Techniker das Teil in der Hand hat', () => {
    const repair = repairs[1]!;
    const orders = archiveGoals(
      spec,
      state({ taken: [repair.itemId], crew: { inventory: [repair.itemId] } }),
    );
    const order = orders.find((one) => one.id === repair.id)!;
    expect(order.carried).toBe(true);
    expect(order.step).toBe(1);
    expect(order.console).not.toBeNull();
    expect(order.console!.roomId).toBe(repair.roomId);
    expect(order.console!.roomName).toBe(roomOf(spec, repair.roomId)!.name);
    expect(order.console!.code).toBe(repair.code);
    // Und die anderen beiden bleiben verschwiegen.
    expect(orders.filter((one) => one.console).map((one) => one.id)).toEqual([repair.id]);
  });

  it('nimmt die Konsole wieder weg, wenn das Teil abgelegt wurde', () => {
    const repair = repairs[0]!;
    const order = archiveGoals(spec, state({ taken: [repair.itemId] })).find(
      (one) => one.id === repair.id,
    )!;
    // `taken` heißt „war einmal draußen" und wird nie zurückgenommen — es ist
    // deshalb kein Beleg dafür, dass er es *jetzt* trägt.
    expect(order.carried).toBe(false);
    expect(order.step).toBe(1);
    expect(order.console).toBeNull();
  });

  it('liest beide Schreibweisen von `done` — die des Schiffs und die der 2D-Runde', () => {
    const repair = repairs[2]!;
    expect(orderDone(state({ done: [repair.id] }), repair)).toBe(true);
    expect(orderDone(state({ done: [repair.itemId] }), repair)).toBe(true);
    expect(orderDone(state({ done: ['irgendwas'] }), repair)).toBe(false);
    for (const done of [[repair.id], [repair.itemId]]) {
      const order = archiveGoals(spec, state({ done })).find((one) => one.id === repair.id)!;
      expect(order.step).toBe(2);
      // Erledigt heißt: Es gibt nichts mehr zu verschweigen.
      expect(order.console).not.toBeNull();
    }
  });
});

describe('Ein abgelegtes Ersatzteil', () => {
  const repair = repairs[0]!;
  const room = spec.rooms[3]!;
  const at = {
    x: (room.rect.x + 0.5) * TILE,
    z: (room.rect.z + 0.5) * TILE,
  };
  const lying = (seconds: number): ArchiveState =>
    state({
      time: 200,
      taken: [repair.itemId],
      dropped: [{ id: repair.itemId, x: at.x, z: at.z, since: 200 - seconds }],
    });

  it('bleibt unsichtbar, solange es noch keine fünf Sekunden liegt', () => {
    expect(droppedSighting(spec, lying(DROPPED_SEEN - 0.01), repair.itemId)).toBeNull();
    expect(droppedSighting(spec, lying(0), repair.itemId)).toBeNull();
    expect(
      archiveGoals(spec, lying(DROPPED_SEEN - 0.01)).find((one) => one.id === repair.id)!.dropped,
    ).toBeNull();
  });

  it('steht auf dem Blatt, sobald es fünf Sekunden liegt — mit Raum und Dauer', () => {
    const seen = droppedSighting(spec, lying(DROPPED_SEEN), repair.itemId)!;
    expect(seen.roomId).toBe(room.id);
    expect(seen.roomName).toBe(room.name);
    expect(seen.seconds).toBeCloseTo(DROPPED_SEEN);
    const order = archiveGoals(spec, lying(9)).find((one) => one.id === repair.id)!;
    expect(order.dropped!.roomName).toBe(room.name);
  });

  it('verschwindet wieder, wenn der Auftrag erledigt ist', () => {
    const done = { ...lying(30), done: [repair.id] };
    expect(archiveGoals(spec, done).find((one) => one.id === repair.id)!.dropped).toBeNull();
  });

  it('kennt ohne das Feld einfach nichts — ein alter Stand ist kein Fehler', () => {
    expect(droppedSighting(spec, state(), repair.itemId)).toBeNull();
  });
});

describe('Eine Hand, ein Ersatzteil', () => {
  it('zählt nur Missionsteile und keine Werkzeuge', () => {
    const tools = state({ crew: { inventory: ['radar', 'xray', 'medkit', 'cargo-r1-1'] } });
    expect(carriedPart(spec, tools)).toBe('');
    expect(canCarryPart(spec, tools)).toBe(true);
  });

  it('sagt, welches Teil im Weg ist', () => {
    const task = spec.tasks[1]!;
    const full = state({ crew: { inventory: ['medkit', task.id] } });
    expect(carriedPart(spec, full)).toBe(task.id);
    expect(canCarryPart(spec, full)).toBe(false);
    expect(fullHandsText(spec, full)).toContain(task.label);
  });
});
