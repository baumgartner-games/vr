import { readFileSync } from 'fs';
import { join } from 'path';
import { CRATE_LID_PATH, kaykitPlinth } from '../../core/kaykitCrate';
import { kaykitFiles, type KaykitIndex } from '../../core/kaykitIndex';
import { ELEMENTS, elementById, hasElement } from './elementCatalog';

/** Der Index des Regals — `null`, wenn die gekauften Pakete fehlen. */
function shelf(): Set<string> | null {
  try {
    const index = JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'models', 'kaykit', 'index.json'), 'utf8'),
    ) as KaykitIndex;
    return new Set(kaykitFiles(index).map((file) => file.path));
  } catch {
    // Ohne die Pakete gibt es nichts zu prüfen (`core/kaykitIndex.test.ts`).
    return null;
  }
}

describe('Spielelemente — der Katalog', () => {
  it('hat jeden Namen nur einmal', () => {
    const ids = ELEMENTS.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nimmt nur, was im Regal liegt', () => {
    const files = shelf();
    if (!files) return;
    const missing = ELEMENTS.flatMap((element) =>
      element.parts
        .filter((part) => !files.has(part.model))
        .map((part) => `${element.id}: ${part.model}`),
    );
    expect(missing).toEqual([]);
  });

  it('hat eine Grundfläche und einen Körper, und Möbel mit Zweck sind zu hoch zum Draufspringen', () => {
    for (const element of ELEMENTS) {
      expect(element.tiles[0]).toBeGreaterThanOrEqual(1);
      expect(element.tiles[1]).toBeGreaterThanOrEqual(1);
      expect(Number.isInteger(element.tiles[0]) && Number.isInteger(element.tiles[1])).toBe(true);
      expect(element.height).toBeGreaterThanOrEqual(0.5);
      if (element.kind !== null)
        expect({ id: element.id, h: element.height >= 1.4 }).toEqual({ id: element.id, h: true });
      expect(element.parts.length).toBeGreaterThan(0);
      expect(element.label.length).toBeGreaterThan(0);
    }
  });

  it('stellt das erste Teil auf den Boden und alles andere auf ein früheres', () => {
    for (const element of ELEMENTS) {
      const [first, ...rest] = element.parts;
      expect(first!.stack || first!.inside || first!.on !== undefined).toBeFalsy();
      rest.forEach((part, k) => {
        const i = k + 1;
        if (part.on !== undefined) {
          expect(part.on).toBeGreaterThanOrEqual(0);
          expect(part.on).toBeLessThan(i);
        }
        // Höchstens eine Art, wo es sitzt.
        expect(
          [part.stack, part.inside, part.on !== undefined].filter(Boolean).length,
        ).toBeLessThanOrEqual(1);
      });
      expect(element.parts.filter((part) => part.surface).length).toBeLessThanOrEqual(1);
    }
  });

  it('schreibt keinen Kistendeckel dazu — den bringt der Lader', () => {
    for (const element of ELEMENTS) {
      const models = element.parts.map((part) => part.model);
      expect({ id: element.id, lid: models.includes(CRATE_LID_PATH) }).toEqual({
        id: element.id,
        lid: false,
      });
    }
    // … und zwar unter jede Kiste, auch die leere der Pizza-Vorratsbox.
    for (const element of ELEMENTS.filter((one) => one.kind === 'crate'))
      expect(kaykitPlinth(element.parts[0]!.model)).toBe(CRATE_LID_PATH);
  });

  it('kennt die Elemente, die eine Welt braucht', () => {
    for (const id of [
      'counter',
      'board',
      'rolling-board',
      'crate-buns',
      'crate-steak',
      'crate-lettuce',
      'crate-tomatoes',
      'crate-cheese',
      'crate-ham',
      'crate-dough',
      'crate-carrots',
      'crate-potatoes',
      'crate-onions',
      'crate-pepperoni',
      'pizza-supply',
      'stove',
      'stove-pot',
      'bin',
      'plate-stack',
      'bowl-stack',
      'pizzabox-stack',
      'ice-stand',
      'ice-tubs',
      'belt',
      'table-round',
      'chair',
    ])
      expect(hasElement(id)).toBe(true);
    expect(elementById('board').work).toBe('chop');
    expect(elementById('rolling-board').work).toBe('roll');
    expect(elementById('belt').tiles).toEqual([1, 2]);
    expect(elementById('table-round').tiles).toEqual([2, 2]);
    expect(elementById('pizza-supply').gives).toBe('pizza');
  });

  it('wirft bei einem unbekannten Namen', () => {
    expect(() => elementById('sofa')).toThrow(/sofa/);
  });
});
