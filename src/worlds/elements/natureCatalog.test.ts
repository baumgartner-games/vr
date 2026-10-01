import { allFolders, elementById, FURNITURE_FOLDERS, hasElement } from './elementCatalog';
import { elementFacts, footprintRows, CELL_BLOCKED } from './elementFacts';
import { FACES, spotCells, spotFootprintCells, type ElementSpot } from './elementPlace';
import { NATURE_CATALOGUE, NATURE_ELEMENTS, NATURE_FOLDER } from './natureCatalog';

/** Ein Element an einer Stelle, nach `face` gedreht. */
function at(id: string, face: ElementSpot['face'] = 'S'): ElementSpot {
  return { id, element: id, x: 4, z: 4, face };
}

const TREES = NATURE_CATALOGUE.filter((id) => id.startsWith('tree-'));

describe('Natur im Katalog', () => {
  it('steht als eigener Bereich neben Haus und Restaurant, nach Art sortiert', () => {
    expect(FURNITURE_FOLDERS).toContain(NATURE_FOLDER);
    expect(NATURE_FOLDER.label).toBe('Natur');
    expect(NATURE_FOLDER.folders!.map((one) => one.label)).toEqual([
      'Bäume',
      'Sträucher',
      'Steine',
      'Gras & Blumen',
      'Holz',
      'Alles',
    ]);
    for (const folder of NATURE_FOLDER.folders!) expect(folder.elements.length).toBeGreaterThan(0);
  });

  it('führt jedes Natur-Element in genau einer Art und alle in Alles', () => {
    const sorted = NATURE_FOLDER.folders!.filter((one) => one.id !== 'nature-all').flatMap(
      (one) => one.elements,
    );
    expect([...sorted].sort()).toEqual([...NATURE_CATALOGUE].sort());
    expect(new Set(sorted).size).toBe(sorted.length);
    const all = allFolders([NATURE_FOLDER]).find((one) => one.id === 'nature-all')!;
    expect(all.elements).toEqual(NATURE_CATALOGUE);
    for (const id of NATURE_CATALOGUE) expect(hasElement(id)).toBe(true);
  });

  it('hat Bäume, und die stehen nur zum Ansehen da — ohne Station', () => {
    expect(TREES.length).toBeGreaterThanOrEqual(8);
    for (const element of NATURE_ELEMENTS) expect(element.kind).toBeNull();
  });

  it('sperrt unter einem Baum nur den Stamm — 2 × 2 Zellen in der Mitte, in jeder Drehung', () => {
    for (const id of TREES) {
      const [w, d] = elementById(id).tiles;
      expect(w * d).toBeGreaterThan(1);
      for (const face of FACES) {
        const spot = at(id, face);
        const cells = spotCells(spot).map((key) => key.split(',').map(Number));
        expect({ id, face, cells: cells.length }).toEqual({ id, face, cells: 4 });
        // Die vier Zellen liegen um die Mitte der Grundfläche.
        const cx = (4 + w / 2) / 0.5;
        const cz = (4 + d / 2) / 0.5;
        for (const [ix, iz] of cells) {
          expect([cx - 1, cx]).toContain(ix);
          expect([cz - 1, cz]).toContain(iz);
        }
        // Und der Rest der Grundfläche ist frei.
        expect(spotFootprintCells(spot).length).toBe(4 * w * d);
      }
    }
  });

  it('lässt durch Gras und Blumen laufen, Sträucher und Steine sperren ihre Kachel', () => {
    for (const id of NATURE_CATALOGUE) {
      const cells = spotCells(at(id)).length;
      const [w, d] = elementById(id).tiles;
      if (id.startsWith('plant-')) expect({ id, cells }).toEqual({ id, cells: 0 });
      else if (id.startsWith('tree-')) expect({ id, cells }).toEqual({ id, cells: 4 });
      else expect({ id, cells }).toEqual({ id, cells: 4 * w * d });
    }
  });

  it('zeigt im Steckbrief die freien Zellen unter der Krone', () => {
    const id = TREES.find((one) => elementById(one).tiles[0] >= 2)!;
    const rows = footprintRows(elementById(id));
    const [w] = elementById(id).tiles;
    expect(rows.length).toBe(2 * w);
    expect(rows.join('').split(CELL_BLOCKED).length - 1).toBe(4);
    const zellen = elementFacts(id).find((one) => one.label === 'Zellen')!.value;
    expect(zellen).toMatch(/davon 4 gesperrt/);
    const grass = NATURE_CATALOGUE.find((one) => one.startsWith('plant-'))!;
    expect(elementFacts(grass).find((one) => one.label === 'Zellen')!.value).toMatch(
      /keine gesperrt/,
    );
  });
});
