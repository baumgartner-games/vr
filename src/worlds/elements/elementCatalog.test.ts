import { readFileSync } from 'fs';
import { join } from 'path';
import { CRATE_LID_PATH, kaykitPlinth } from '../../core/kaykitCrate';
import { kaykitFiles, type KaykitIndex } from '../../core/kaykitIndex';
import { ITEM_LABELS } from '../test/zones/kitchenRecipes';
import { SHELF_WALL, SHELF_WALL_HALF } from '../grid/shelfWalls';
import {
  DECOR,
  ELEMENTS,
  FURNITURE_CATALOGUE,
  FURNITURE_FOLDERS,
  KITCHEN_FOLDERS,
  allFolders,
  folderCover,
  mapFolder,
  SHOW_ONLY_GIVES,
  WALL_MODELS,
  BUILD_LABELS,
  BUILD_MODELS,
  CATALOG_DOOR,
  CATALOG_DOOR_WIDE,
  HOUSE_FOLDER,
  WALL_ERASER,
  PLASTER_WALL,
  PLASTER_WALL_HALF,
  wallHalfOf,
  wallFullOf,
  isDoorModel,
  elementById,
  elementLit,
  hasElement,
} from './elementCatalog';
import { NATURE_CATALOGUE } from './natureCatalog';
import { SPACE_CATALOGUE } from './spaceCatalog';
import { FURNITURE_BITS_CATALOGUE } from './furnitureCatalog';

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
        .filter((part) => !files.has(part.model) && !part.model.startsWith('built:'))
        .map((part) => `${element.id}: ${part.model}`),
    );
    expect(missing).toEqual([]);
  });

  it('hat eine Grundfläche und einen Körper, und Möbel mit Zweck sind zu hoch zum Draufspringen', () => {
    for (const element of ELEMENTS) {
      // Ganze Kacheln — oder, für die schmalen Bäume, eine Zelle
      // (`elementPlace.onCells`): immer ein Vielfaches einer halben Kachel.
      expect(element.tiles[0]).toBeGreaterThanOrEqual(0.5);
      expect(element.tiles[1]).toBeGreaterThanOrEqual(0.5);
      expect(Number.isInteger(element.tiles[0] * 2) && Number.isInteger(element.tiles[1] * 2)).toBe(
        true,
      );
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
      'ice-tray-vanilla',
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
      'Sichere Kochstelle',
      'Waschbecken',
      'Eisstand',
      'Eiswanne Vanille',
      'Eiswanne Erdbeere',
      'Eiswanne Schoko',
      'Kiste mit Eiswannen',
      'Eismaschine',
      'Salatkiste',
      'Käsekiste',
      'Schinkenkiste',
      'Steakkiste',
      'Pattykiste',
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
      'Rohrzange',
      'Pilzkiste',
    ]);
  });

  it('führt jedes Element nur einmal und keine Kiste, die nichts hergibt, was die Küche kennt', () => {
    expect(new Set(FURNITURE_CATALOGUE).size).toBe(FURNITURE_CATALOGUE.length);
    for (const id of FURNITURE_CATALOGUE) {
      const gives = elementById(id).gives;
      if (gives) expect(SHOW_ONLY_GIVES.has(gives)).toBe(false);
    }
  });

  it('ordnet wie die Sims erst nach Bereich: Haus mit Wand, Tür, Fenster, Restaurant mit der Küche', () => {
    expect(FURNITURE_FOLDERS.map((folder) => folder.label)).toEqual([
      'Haus',
      'Möbel',
      'Restaurant',
      'Natur',
      'Weltraum',
    ]);
    expect(FURNITURE_FOLDERS[0]).toBe(HOUSE_FOLDER);
    expect(HOUSE_FOLDER.folders).toBeUndefined();
    expect(HOUSE_FOLDER.models).toBe(BUILD_MODELS);
    // Dazu die Wand zum Abreißen — dieselbe kurze Wand, gezogen nimmt sie weg.
    expect(HOUSE_FOLDER.erasers).toEqual([WALL_ERASER]);
    expect(WALL_ERASER).toBe(SHELF_WALL_HALF);
    expect(FURNITURE_FOLDERS.find((one) => one.id === 'restaurant')!.folders).toBe(KITCHEN_FOLDERS);
    expect(KITCHEN_FOLDERS.map((folder) => folder.label)).toEqual([
      'Allgemein',
      'Kochen',
      'Vorräte',
      'Geschirr',
      'Pizza',
      'Burger',
      'Eis',
      'Waffeln',
      'Suppe',
      'Alles',
    ]);
    const all = allFolders(FURNITURE_FOLDERS);
    expect(new Set(all.map((folder) => folder.id)).size).toBe(all.length);
    for (const folder of all) {
      const inner = folder.folders?.length ?? 0;
      expect(folder.elements.length + (folder.models?.length ?? 0) + inner).toBeGreaterThan(0);
      expect(new Set(folder.elements).size).toBe(folder.elements.length);
      for (const id of folder.elements)
        expect([
          ...FURNITURE_CATALOGUE,
          ...NATURE_CATALOGUE,
          ...SPACE_CATALOGUE,
          ...FURNITURE_BITS_CATALOGUE,
        ]).toContain(id);
    }
  });

  it('findet jedes Möbel der Küche auch außerhalb von Alles', () => {
    const sorted = KITCHEN_FOLDERS.filter((folder) => folder.id !== 'all').flatMap(
      (folder) => folder.elements,
    );
    for (const id of FURNITURE_CATALOGUE) expect(sorted).toContain(id);
  });

  it('legt in Vorräte jede Kiste der Küche', () => {
    const supplies = KITCHEN_FOLDERS.find((one) => one.id === 'supplies')!.elements;
    for (const id of FURNITURE_CATALOGUE)
      if (elementById(id).kind === 'crate') expect(supplies).toContain(id);
    expect(supplies).toContain('crate-cheese');
  });

  it('zeigt auf jedem Ordner ein Möbel oder Modell, das es gibt und das darin liegt', () => {
    const inside = (folder: (typeof FURNITURE_FOLDERS)[number]): string[] =>
      allFolders([folder]).flatMap((one) => [
        ...one.elements,
        ...(one.models ?? []),
        ...(one.items ?? []),
      ]);
    for (const folder of allFolders(FURNITURE_FOLDERS)) {
      const cover = folderCover(folder);
      expect(cover).not.toBeNull();
      const what =
        'element' in cover! ? cover.element : 'model' in cover! ? cover.model : cover!.item;
      if ('element' in cover!) expect(hasElement(cover.element)).toBe(true);
      expect(inside(folder)).toContain(what);
    }
    expect(folderCover({ id: 'x', label: 'X', elements: [] })).toBeNull();
    expect(folderCover({ id: 'x', label: 'X', elements: ['bin', 'sink'] })).toEqual({
      element: 'bin',
    });
  });

  it('ändert mit mapFolder einen Ordner auf jeder Ebene und lässt den Rest', () => {
    const changed = mapFolder(FURNITURE_FOLDERS, 'soup', (folder) => ({ ...folder, label: 'S' }));
    expect(allFolders(changed).find((one) => one.id === 'soup')!.label).toBe('S');
    expect(changed[0]).toEqual(FURNITURE_FOLDERS[0]);
    expect(allFolders(FURNITURE_FOLDERS).find((one) => one.id === 'soup')!.label).toBe('Suppe');
  });

  it('hat die Arbeitsplatte in jedem Ordner der Küche, den Tellerstapel bei Burger und Pizza', () => {
    for (const folder of KITCHEN_FOLDERS) expect(folder.elements).toContain('counter');
    const plates = KITCHEN_FOLDERS.filter((folder) => folder.elements.includes('plate-stack'));
    expect(plates.map((folder) => folder.id)).toEqual(['dishes', 'pizza', 'burger', 'all']);
  });

  it('hat Waschbecken, Mülleimer und Feuerlöscher in Allgemein, und in Alles jedes Möbel', () => {
    const folder = (id: string) => KITCHEN_FOLDERS.find((one) => one.id === id)!.elements;
    expect(folder('general')).toEqual(['counter', 'sink', 'pliers', 'bin', 'extinguisher']);
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
      expect(element.kind === null).toBe(DECOR.has(id));
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
    expect(elementById('crate-plates')).toMatchObject({ kind: 'crate', gives: 'plate' });
    const crates = KITCHEN_FOLDERS.filter((folder) => folder.elements.includes('crate-plates'));
    expect(crates.map((folder) => folder.id)).toEqual([
      'supplies',
      'dishes',
      'pizza',
      'burger',
      'all',
    ]);
  });

  it('lässt jedes Möbel mit Zweck selbst leuchten — Kisten, Mülleimer, Arbeitsplatte —, Tisch und Band nicht', () => {
    for (const element of ELEMENTS) expect(elementLit(element)).toBe(element.kind !== null);
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

  it('hat Wand, Tür und Fenster direkt im Haus als Regalwände — Modelle, keine Blöcke', () => {
    expect(HOUSE_FOLDER.elements).toEqual([]);
    // Nur die kurzen Stücke — lang wird gezogen (`wallFullOf`), auch die Tür.
    expect(BUILD_MODELS).toEqual([
      SHELF_WALL_HALF,
      PLASTER_WALL_HALF,
      'prototype-bits/Wall_Doorway.glb',
      'prototype-bits/Wall_Window_Closed_Narrow.glb',
    ]);
    expect(BUILD_MODELS).not.toContain(CATALOG_DOOR_WIDE);
    expect(BUILD_MODELS.map((path) => BUILD_LABELS[path])).toEqual([
      'Wand',
      'Putzwand',
      'Tür',
      'Fenster',
    ]);
    expect(wallFullOf(SHELF_WALL_HALF)).toBe(SHELF_WALL);
    expect(wallFullOf(PLASTER_WALL_HALF)).toBe(PLASTER_WALL);
    // Das Fenster nicht: Das lange Stück hat dasselbe schmale Fenster in mehr
    // Wand. Über zwei Kacheln gezogen kommen zwei Fenster nebeneinander.
    expect(wallFullOf('prototype-bits/Wall_Window_Closed_Narrow.glb')).toBeNull();
    expect(wallHalfOf('prototype-bits/Wall_Window_Closed.glb')).toBe(
      'prototype-bits/Wall_Window_Closed_Narrow.glb',
    );
    // Über zwei Kacheln gezogen wird aus der Tür die Doppeltür.
    expect(wallFullOf(CATALOG_DOOR)).toBe(CATALOG_DOOR_WIDE);
    expect(wallHalfOf(CATALOG_DOOR_WIDE)).toBe(CATALOG_DOOR);
    expect(isDoorModel('prototype-bits/Wall_Doorway_Wide.glb')).toBe(true);
    expect(isDoorModel(SHELF_WALL)).toBe(false);
    // Jede Regalwand der Test Navigation steht in einer der Mappen — oder ist
    // die lange zu einem kurzen Stück darin.
    const all = BUILD_MODELS;
    const drawn = [...all, ...all.flatMap((path) => wallFullOf(path) ?? [])];
    for (const path of WALL_MODELS)
      expect(drawn.includes(path) || all.includes(wallHalfOf(path) ?? '')).toBe(true);
    expect(WALL_MODELS).toEqual([
      'prototype-bits/Wall_Window_Closed.glb',
      'prototype-bits/Wall_Window_Closed_Narrow.glb',
      'prototype-bits/Wall.glb',
      'prototype-bits/Wall_Half.glb',
      'prototype-bits/Wall_Doorway.glb',
      'prototype-bits/Wall_Doorway_Wide.glb',
    ]);
    // Keine Wand ist ein Spielelement: Die sperrten ganze Kacheln.
    for (const path of all)
      expect(ELEMENTS.some((element) => element.parts[0]!.model === path)).toBe(false);
    const files = shelf();
    if (files) for (const path of all) expect(files.has(path)).toBe(true);
  });

  it('kennt zu jeder ganzen Wand das halbe Stück — zur Doppeltür die Tür', () => {
    expect(wallHalfOf(SHELF_WALL)).toBe(SHELF_WALL_HALF);
    expect(wallHalfOf(PLASTER_WALL)).toBe(PLASTER_WALL_HALF);
    expect(wallHalfOf('prototype-bits/Wall_Window_Closed.glb')).toBe(
      'prototype-bits/Wall_Window_Closed_Narrow.glb',
    );
    expect(wallHalfOf('prototype-bits/Wall_Doorway.glb')).toBeNull();
    expect(wallHalfOf('prototype-bits/Wall_Doorway_Wide.glb')).toBe(
      'prototype-bits/Wall_Doorway.glb',
    );
  });

  it('hat Hörnchen und Eiswannen als Vorräte der Küche — eine Wanne je Platte', () => {
    expect(elementById('ice-stand')).toMatchObject({ kind: 'drain', gives: 'cone' });
    expect(elementById('ice-tray-vanilla')).toMatchObject({
      holds: 'tray',
      holdsOn: ['ice-vanilla'],
    });
    expect(hasElement('ice-tubs')).toBe(false);
  });
});
