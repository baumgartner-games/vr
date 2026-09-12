import { FlatRound } from './flatRound';

/**
 * **Die Bücher kommen nach dem Öffnen** (`FlatRound.loadBooks`): Wer mitten in
 * der Mission die Seite neu lädt und wieder an den Stock geht, bekommt den
 * Stand sofort und die Riegel, den Spuk und die Wunde erst mit der Übergabe
 * des alten Gastgebers. Was dann kommt, gilt — und was vorher galt, ist weg.
 */
describe('FlatRound.loadBooks', () => {
  it('übernimmt Riegel, Spuk und Wunde einer anderen Runde', () => {
    const before = new FlatRound(947);
    const door = before.house.doors[0]!;
    expect(before.lockDoor(door.id)).toContain('verriegelt');
    const books = before.books();
    expect(books.locks.chosen).toBe(door.id);

    const after = new FlatRound(947);
    expect(after.locks.chosen).toBe('');
    after.loadBooks(books);
    expect(after.locks.chosen).toBe(door.id);
    expect(after.locks.until).toBe(books.locks.until);
    expect(after.books().spook).toEqual(books.spook);
    expect(after.books().trail).toEqual(books.trail);
    // Eine Abschrift, kein Draht: Die alte Runde schreibt nicht in die neue.
    after.locks.slams.push({ ...(books.locks.slams[0] ?? { id: door.id, until: 1 }) });
    expect(books.locks.slams.length).toBe(after.locks.slams.length - 1);
  });

  it('lässt fehlende Bücher, wie sie sind', () => {
    const round = new FlatRound(947);
    const door = round.house.doors[0]!;
    round.lockDoor(door.id);
    round.loadBooks({});
    expect(round.locks.chosen).toBe(door.id);
  });
});
