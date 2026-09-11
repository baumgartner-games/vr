import { generateHouse } from '../house';
import { repairsFor } from '../mission';
import { cargoOf } from './cargo';
import { archiveRadio, SHEET_NAMES } from './archiveRadio';
import type { ArchiveState } from './archiveGoals';

/**
 * **Der Archivar sagt es auch, wenn er ein Bot ist.** Geprüft wird nicht der
 * Wortlaut, sondern die Verschwiegenheit: Die Kiste nennt er immer, die
 * Konsole erst mit dem Teil in der Hand — dieselbe Regel wie auf seinem Blatt
 * (`archiveGoals.ts`). Und er wiederholt sich nicht: gleicher Schlüssel,
 * gleicher Spruch.
 */
describe('Der Funk des Archivars', () => {
  const spec = generateHouse(3, 14);
  const repairs = repairsFor(spec);
  const first = repairs[0]!;

  function state(over: Partial<ArchiveState> = {}): ArchiveState {
    return { time: 30, taken: [], done: [], crew: { inventory: [] }, ...over };
  }

  it('nennt zuerst die Kiste — und nicht die Konsole', () => {
    const call = archiveRadio(spec, state())!;
    const crate = cargoOf(spec).find(
      (slot) => slot.loot.kind === 'part' && slot.loot.taskId === first.itemId,
    )!;
    expect(call.text).toContain(first.item);
    expect(call.text).toContain(crate.clue);
    // Die Konsole geht ihn noch nichts an.
    expect(call.text).not.toContain(first.hint);
  });

  it('nennt mit dem Teil in der Hand die Konsole und das Blatt dazu', () => {
    const call = archiveRadio(
      spec,
      state({ taken: [first.itemId], crew: { inventory: [first.itemId] } }),
    )!;
    expect(call.text).toContain(first.title);
    expect(call.text).toContain(first.hint);
    expect(call.text).toContain(SHEET_NAMES[first.puzzle]);
  });

  it('meldet ein liegengelassenes Teil, sobald es liegen bleibt', () => {
    const lying = state({
      taken: [first.itemId],
      dropped: [{ id: first.itemId, x: 4, z: 4, since: 0 }],
      time: 30,
    });
    expect(archiveRadio(spec, lying)!.text).toContain('auf dem Boden');
    // Kurz abgelegt ist nicht liegengelassen (`DROPPED_SEEN`).
    expect(archiveRadio(spec, { ...lying, time: 2 })!.text).not.toContain('auf dem Boden');
  });

  it('wiederholt sich nicht — derselbe Schlüssel für dieselbe Lage', () => {
    const before = archiveRadio(spec, state())!;
    expect(archiveRadio(spec, state())!.key).toBe(before.key);
    const after = archiveRadio(
      spec,
      state({ taken: [first.itemId], crew: { inventory: [first.itemId] } }),
    )!;
    expect(after.key).not.toBe(before.key);
  });

  it('schickt am Ende nach Hause', () => {
    const done = state({ done: repairs.map((one) => one.id) });
    expect(archiveRadio(spec, done)!.text).toContain('Zentrale');
  });
});
