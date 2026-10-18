import { HexBoard } from './hexRules';

/**
 * **Der Spielstand von Hexland** — gespeichert im Browser nach jeder Kachel.
 * Ein Fehler im Format kostet das ganze gebaute Brett, und das bekommt
 * niemand zurück (`docs/agents/tests.md`, _Speicherstände_).
 */
describe('Hexland-Spielstand', () => {
  function played(): HexBoard {
    const board = new HexBoard(7);
    board.reset(7);
    for (let i = 0; i < 25 && board.current; i++) {
      const spec = board.current;
      const slot = board.openSlots().find((s) => board.rotations(spec, s.q, s.r).length > 0);
      if (slot) board.place(slot.q, slot.r, board.rotations(spec, slot.q, slot.r)[0]!);
      else board.place(board.openSlots()[0]!.q, board.openSlots()[0]!.r, 0, true);
    }
    return board;
  }

  it('kommt so zurück, wie er gespeichert wurde', () => {
    const board = played();
    const copy = new HexBoard(1);
    expect(copy.load(board.save())).toBe(true);
    expect(copy.save()).toBe(board.save());
    expect(copy.tiles.size).toBe(board.tiles.size);
    expect(copy.scoring()).toEqual(board.scoring());
    expect(copy.current).toEqual(board.current);
  });

  it('liest Stände von vor dem Auftragsstapel mit Zahlen', () => {
    const board = played();
    const old = JSON.parse(board.save()) as Record<string, unknown>;
    delete old.deck;
    old.tasks = 7;
    const copy = new HexBoard(1);
    expect(copy.load(JSON.stringify(old))).toBe(true);
    expect(copy.tasks).toHaveLength(7);
    expect(copy.tiles.size).toBe(board.tiles.size);
  });

  it('lässt ein Brett stehen, wenn der Speicher kaputt ist', () => {
    const board = played();
    const before = board.save();
    for (const junk of [null, '', '{', '{"v":1}', '{"v":1,"tiles":[[0,0,0,["nix","gggggg",1]]]}']) {
      expect(board.load(junk)).toBe(false);
    }
    expect(board.save()).toBe(before);
  });
});
