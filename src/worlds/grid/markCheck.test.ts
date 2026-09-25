import { CellGrid, navCellSource } from '../nav/cellGrid';
import { fillRect } from '../nav/navBuild';
import { NavGraph } from '../nav/navGraph';
import { DIR_E, tileKey } from '../nav/navTile';
import { checkMarks, markSummary, type Mark } from './markCheck';

/** Ein Feld 8 × 4, in der Mitte eine Wand über die ganze Höhe mit einer Lücke. */
function field(gap: boolean): CellGrid {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w: 8, d: 4 });
  for (let z = 0; z < 4; z++)
    if (!gap || z !== 2) graph.setWall(tileKey(3, z), DIR_E, { kind: 'solid' });
  return new CellGrid(navCellSource(graph, () => null));
}

const marks: Mark[] = [
  { id: 's', role: 'start', x: 1, z: 1, level: 0 },
  { id: 'near', role: 'go', x: 2, z: 2, level: 0 },
  { id: 'far', role: 'stop', x: 6, z: 1, level: 0 },
];

describe('Die Wandtests', () => {
  it('bestehen, wenn die Wand hält', () => {
    const verdicts = checkMarks(field(false), marks);
    expect(Object.fromEntries(verdicts)).toEqual({ s: 'pass', near: 'pass', far: 'pass' });
    expect(markSummary(verdicts)).toBe('Wandtests: 3 von 3 bestanden');
  });

  it('fallen durch, wo eine Lücke die rote Marke erreichbar macht', () => {
    const verdicts = checkMarks(field(true), marks);
    expect(verdicts.get('far')).toBe('fail');
    expect(verdicts.get('near')).toBe('pass');
  });

  it('schweigen ohne Startmarke', () => {
    expect(checkMarks(field(false), marks.slice(1)).size).toBe(0);
  });
});
