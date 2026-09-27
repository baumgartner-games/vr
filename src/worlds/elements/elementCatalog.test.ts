import { readFileSync } from 'fs';
import { join } from 'path';
import { CRATE_LID_PATH, kaykitPlinth } from '../../core/kaykitCrate';
import { kaykitFiles, type KaykitIndex } from '../../core/kaykitIndex';
import { ITEM_LABELS } from '../test/zones/kitchenRecipes';
import {
  ELEMENTS,
  FURNITURE_CATALOGUE,
  FURNITURE_FOLDERS,
  SHOW_ONLY_GIVES,
  elementById,
  hasElement,
} from './elementCatalog';

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
      'sink',
      'bin',
      'plate-stack',
      'bowl-stack',
      'pizzabox-stack',
      'ice-stand',
      'ice-tubs',
      'belt',
      'table-round',
      'chair',
      'supply-box',
      'pizza-oven',
    ])
      expect(hasElement(id)).toBe(true);
    expect(elementById('board').work).toBe('chop');
    expect(elementById('rolling-board').work).toBe('roll');
    // Das Band ist eine Kachel (`core/kaykitFit.KAYKIT_FILE_SCALE` bringt das
    // quadratische Band auf 1 × 1 m), und flach.
    expect(elementById('belt').tiles).toEqual([1, 1]);
    expect(elementById('belt').height).toBe(0.5);
    expect(elementById('belt').parts[0]!.model).toMatch(/conveyor_4x4x1_/);
    // Herd und Topf wie im Restaurant: einflammig, der Topf steht darauf und geht mit.
    expect(elementById('stove-pot')).toMatchObject({ kind: 'stove', holds: 'pot' });
    expect(elementById('stove-pot').parts.map((part) => part.model)).toEqual([
      'restaurant-bits/stove_single.glb',
    ]);
    expect(elementById('sink')).toMatchObject({ kind: 'sink', tiles: [1, 1], height: 1.4 });
    expect(elementById('table-round').tiles).toEqual([2, 2]);
    expect(elementById('pizza-supply').gives).toBe('pizza');
  });

  it('gibt aus Kisten, Stapeln und Wannen nur Dinge der Küche — oder sagt, dass es nur zeigt', () => {
    const strays = ELEMENTS.filter(
      (element) =>
        (element.kind === 'crate' || element.kind === 'drain' || element.kind === 'tub') &&
        element.gives !== undefined &&
        !(element.gives in ITEM_LABELS) &&
        !SHOW_ONLY_GIVES.has(element.gives),
    ).map((element) => `${element.id}: ${element.gives}`);
    expect(strays).toEqual([]);
    // Und was nur zeigt, ist wirklich keines — sonst gehört es nicht in die Liste.
    for (const name of SHOW_ONLY_GIVES) expect(name in ITEM_LABELS).toBe(false);
  });

  it('wirft bei einem unbekannten Namen', () => {
    expect(() => elementById('sofa')).toThrow(/sofa/);
  });
});

describe('der Möbelkatalog im Menü', () => {
  it('hat die gewünschten Möbel, in dieser Reihenfolge und mit diesen Namen', () => {
    expect(FURNITURE_CATALOGUE.map((id) => elementById(id).label)).toEqual([
      'Arbeitsplatte',
      'Arbeitsplatte mit Schneidebrett',
      'Herdplatte mit Pfanne',
      'Herdplatte mit Topf',
      'Herdplatte',
      'Waschbecken',
      'Eisstand',
      'Eiswannen',
      'Salatkiste',
      'Käsekiste',
      'Schinkenkiste',
      'Fleischkiste',
      'Tomatenkiste',
      'Tellerstapel',
      'Tellerkiste',
      'Schüsselstapel',
      'Zwiebelkiste',
      'Brötchenkiste',
      'Teigkiste',
      'Karottenkiste',
      'Kartoffelkiste',
      'Pizza-Vorratsbox',
      'Kartonstapel',
      'Nudelbrett',
      'Mülleimer',
      'Feuerlöscher',
    ]);
  });

  it('führt jedes Element nur einmal und keine Kiste, die nichts hergibt, was die Küche kennt', () => {
    expect(new Set(FURNITURE_CATALOGUE).size).toBe(FURNITURE_CATALOGUE.length);
    for (const id of FURNITURE_CATALOGUE) {
      const gives = elementById(id).gives;
      if (gives) expect(SHOW_ONLY_GIVES.has(gives)).toBe(false);
    }
  });

  it('hat die Unterordner Allgemein, Pizza, Burger, Eis, Waffeln, Suppe, Alles — aus der ganzen Liste', () => {
    expect(FURNITURE_FOLDERS.map((folder) => folder.label)).toEqual([
      'Allgemein',
      'Pizza',
      'Burger',
      'Eis',
      'Waffeln',
      'Suppe',
      'Alles',
    ]);
    expect(new Set(FURNITURE_FOLDERS.map((folder) => folder.id)).size).toBe(
      FURNITURE_FOLDERS.length,
    );
    for (const folder of FURNITURE_FOLDERS) {
      expect(folder.elements.length).toBeGreaterThan(0);
      expect(new Set(folder.elements).size).toBe(folder.elements.length);
      for (const id of folder.elements) expect(FURNITURE_CATALOGUE).toContain(id);
    }
  });

  it('hat die Arbeitsplatte in jedem Ordner, den Tellerstapel bei Burger und Pizza', () => {
    for (const folder of FURNITURE_FOLDERS) expect(folder.elements).toContain('counter');
    const plates = FURNITURE_FOLDERS.filter((folder) => folder.elements.includes('plate-stack'));
    expect(plates.map((folder) => folder.id)).toEqual(['pizza', 'burger', 'all']);
  });

  it('hat Waschbecken, Mülleimer und Feuerlöscher in Allgemein, und in Alles jedes Möbel', () => {
    const folder = (id: string) => FURNITURE_FOLDERS.find((one) => one.id === id)!.elements;
    expect(folder('general')).toEqual(['counter', 'sink', 'bin', 'extinguisher']);
    expect(folder('all')).toEqual(FURNITURE_CATALOGUE);
  });

  it('hat den Feuerlöscher auf der Arbeitsplatte, zum Mitnehmen', () => {
    expect(elementById('extinguisher')).toMatchObject({
      kind: 'top',
      holds: 'extinguisher',
      parts: [{ model: 'restaurant-bits/kitchencounter_straight_A.glb' }],
    });
  });

  it('sperrt mit jedem eine ganze Kachel — 2 × 2 Zellen — und jedes tut etwas auf A', () => {
    for (const id of FURNITURE_CATALOGUE) {
      const element = elementById(id);
      expect(element.tiles).toEqual([1, 1]);
      expect(element.height).toBeGreaterThanOrEqual(1.4);
      expect(element.kind).not.toBeNull();
    }
  });

  it('hat die Herdplatte blank: der Herd für den Topf, ohne Topf und ohne Pfanne', () => {
    const hob = elementById('hob');
    expect(hob).toMatchObject({
      kind: 'stove',
      parts: [{ model: 'restaurant-bits/stove_single.glb' }],
    });
    expect(hob.holds).toBeUndefined();
  });

  it('hat die Tellerkiste bei Burger und Pizza — eine Kiste, die Teller hergibt', () => {
    expect(elementById('crate-plates')).toMatchObject({ kind: 'crate', gives: 'plate', lit: true });
    const crates = FURNITURE_FOLDERS.filter((folder) => folder.elements.includes('crate-plates'));
    expect(crates.map((folder) => folder.id)).toEqual(['pizza', 'burger', 'all']);
  });

  it('lässt jede Vorratskiste und den Mülleimer ganz leuchten', () => {
    for (const element of ELEMENTS)
      if (element.kind === 'crate' || element.kind === 'bin') expect(element.lit).toBe(true);
  });

  it('macht den Tellerstapel zum Abtropfgitter wie in der Sandbox: leeres Gitter, Teller zählt die Station', () => {
    expect(elementById('plate-stack')).toMatchObject({
      kind: 'drain',
      gives: 'plate',
      rack: true,
      parts: [
        { model: 'restaurant-bits/kitchencounter_straight_A.glb' },
        { model: 'restaurant-bits/dishrack.glb', stack: true },
      ],
    });
  });

  it('hat Hörnchen und Eiswannen als Vorräte der Küche', () => {
    expect(elementById('ice-stand')).toMatchObject({ kind: 'drain', gives: 'cone' });
    expect(elementById('ice-tubs').kind).toBe('ice-tubs');
  });
});
