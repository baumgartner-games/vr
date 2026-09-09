import { generateHouse } from '../house';
import { puzzleFor, freshCrew, repairsFor } from '../mission';
import { applyPuzzle } from './flatPuzzles';

const spec = generateHouse(11, 14);
const repairs = repairsFor(spec);

describe('Die drei Rätsel', () => {
  it('Kabel: jeder Stecker in seine Buchse', () => {
    const repair = repairs.find((r) => r.puzzle === 'wires')!;
    const crew = freshCrew();
    const puzzle = puzzleFor(crew, repair.id);
    expect(applyPuzzle(repair, puzzle, { kind: 'wire', plug: 0, socket: 0 }).wrong).toBe(true);
    puzzle.open = true;
    let last = { solved: false, wrong: false };
    for (let plug = 0; plug < 4; plug++)
      last = applyPuzzle(repair, puzzle, {
        kind: 'wire',
        plug,
        socket: repair.order.indexOf(plug),
      });
    expect(last.solved).toBe(true);
  });

  it('Folge: eine falsche Dreiergruppe fängt von vorn an', () => {
    const repair = repairs.find((r) => r.puzzle === 'sequence')!;
    const crew = freshCrew();
    const puzzle = puzzleFor(crew, repair.id);
    puzzle.open = true;
    const wrongDigit = (Number(repair.code[0]) % 4) + 1;
    applyPuzzle(repair, puzzle, { kind: 'digit', digit: wrongDigit });
    applyPuzzle(repair, puzzle, { kind: 'digit', digit: 1 });
    const failed = applyPuzzle(repair, puzzle, { kind: 'digit', digit: 1 });
    expect(failed.wrong).toBe(true);
    expect(puzzle.links).toEqual([]);
    let last = { solved: false, wrong: false };
    for (const digit of repair.code)
      last = applyPuzzle(repair, puzzle, { kind: 'digit', digit: Number(digit) });
    expect(last.solved).toBe(true);
  });

  it('Frequenz: drehen, dann senden', () => {
    const repair = repairs.find((r) => r.puzzle === 'tune')!;
    const crew = freshCrew();
    const puzzle = puzzleFor(crew, repair.id);
    puzzle.open = true;
    expect(applyPuzzle(repair, puzzle, { kind: 'send' }).solved).toBe(repair.code === '111');
    for (let column = 0; column < 3; column++)
      while (puzzle.digits[column] !== Number(repair.code[column]))
        applyPuzzle(repair, puzzle, { kind: 'turn', column });
    expect(applyPuzzle(repair, puzzle, { kind: 'send' })).toEqual({ solved: true, wrong: false });
  });
});
