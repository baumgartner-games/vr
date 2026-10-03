import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { dish, ITEM_RESTS, kitchenDeed } from '../test/zones/kitchenCarry';
import { movesFurniture } from '../../core/gameMode';
import { allFolders, elementById, FURNITURE_FOLDERS, hasElement } from './elementCatalog';
import {
  FACES,
  fitsOnShelf,
  riderPlace,
  riderSpot,
  spotCells,
  spotCentre,
  spotFootprintCells,
  spotSolid,
  type ElementSpot,
} from './elementPlace';
import {
  FURNITURE_BITS_CATALOGUE,
  FURNITURE_BITS_ELEMENTS,
  FURNITURE_BITS_FOLDER,
  PLANT_SCALE,
} from './furnitureCatalog';

const ALL = new Set(FURNITURE_BITS_CATALOGUE);

describe('Möbel im Katalog', () => {
  it('steht als eigener Bereich gleich nach dem Haus, nach Art sortiert', () => {
    expect(FURNITURE_FOLDERS[1]).toBe(FURNITURE_BITS_FOLDER);
    expect(FURNITURE_BITS_FOLDER.label).toBe('Möbel');
    expect(FURNITURE_BITS_FOLDER.folders!.map((one) => one.label)).toEqual([
      'Sitzen',
      'Tische',
      'Betten',
      'Schränke',
      'Lampen',
      'Schreibtisch & Technik',
      'Kleinkram',
      'Pflanzen',
      'Teppiche',
      'Alles',
    ]);
    for (const folder of FURNITURE_BITS_FOLDER.folders!) {
      expect(folder.elements.length + (folder.items?.length ?? 0)).toBeGreaterThan(0);
      if (folder.cover && 'element' in folder.cover)
        expect(folder.elements).toContain(folder.cover.element);
    }
  });

  it('führt jedes Möbel in genau einer Art und alle in Alles', () => {
    const sorted = FURNITURE_BITS_FOLDER.folders!.filter(
      (one) => one.id !== 'furniture-all',
    ).flatMap((one) => one.elements);
    expect([...sorted].sort()).toEqual([...FURNITURE_BITS_CATALOGUE].sort());
    expect(new Set(sorted).size).toBe(sorted.length);
    const all = allFolders([FURNITURE_BITS_FOLDER]).find((one) => one.id === 'furniture-all')!;
    expect(all.elements).toEqual(FURNITURE_BITS_CATALOGUE);
    for (const id of FURNITURE_BITS_CATALOGUE) expect(hasElement(id)).toBe(true);
  });

  it('nimmt jede Datei des Pakets, die nicht an eine Wand gehört', () => {
    const dir = join(process.cwd(), 'public', 'models', 'kaykit', 'furniture-bits');
    if (!existsSync(dir)) return;
    const index = readFileSync(
      join(process.cwd(), 'public', 'models', 'kaykit', 'index.json'),
      'utf8',
    );
    const pack = JSON.parse(index) as {
      root: { dirs: { name: string; files: { name: string }[] }[] };
    };
    const files = pack.root.dirs
      .find((one) => one.name === 'furniture-bits')!
      .files.map((one) => one.name.replace('.glb', ''));
    const used = FURNITURE_BITS_ELEMENTS.flatMap((one) => one.parts.map((part) => part.model)).map(
      (model) => model.replace('furniture-bits/', '').replace('.glb', ''),
    );
    const left = files.filter((name) => !used.includes(name));
    // Die zwölf Wandstücke — und die Mauspads, die der Computer nicht braucht.
    expect(
      left.every((name) => /^(pictureframe_(large|medium|small)|shelf_|mousepad_)/.test(name)),
    ).toBe(true);
    expect(left.filter((name) => !name.startsWith('mousepad_'))).toHaveLength(12);
  });

  it('macht die Tische zu Ablagen und Flächen der Küche — ohne Brett', () => {
    for (const id of [
      'table-small',
      'table-medium',
      'table-medium-long',
      'table-low',
      'desk',
      'desk-large',
    ])
      expect(elementById(`furniture-${id}`)).toMatchObject({ shelf: true, kind: 'top' });
    // Auch die Arbeitsplatte und der runde Tisch des Restaurants.
    expect(elementById('counter').shelf).toBe(true);
    expect(elementById('table-round').shelf).toBe(true);
    // Geschnitten wird auf keiner Ablage hier.
    for (const element of FURNITURE_BITS_ELEMENTS) expect(element.kind === 'board').toBe(false);
  });

  it('macht Monitore, Lampen, kleine Pflanzen, Becher und Bücher ablegbar — auf einer Zelle', () => {
    for (const id of [
      'lamp-desk',
      'lamp-desk-headphones',
      'lamp-table',
      'cup',
      'mug-a',
      'book-single',
      'book-set',
    ]) {
      const element = elementById(`furniture-${id}`);
      expect(element.rests).toBe(true);
      expect(element.tiles).toEqual([0.5, 0.5]);
    }
    // Was groß ist, bleibt auf dem Boden.
    for (const id of ['couch', 'bed-double-a', 'lamp-standing', 'desk'])
      expect(elementById(`furniture-${id}`).rests).toBeFalsy();
  });

  it('bietet Monitor, Tastatur, Maus und Mauspad nur noch als Computer an — eine Kachel, ablegbar', () => {
    for (const gone of ['monitor', 'keyboard', 'mouse', 'mousepad-a', 'mousepad-large-a'])
      expect(hasElement(`furniture-${gone}`)).toBe(false);
    const computer = elementById('furniture-computer');
    expect(computer).toMatchObject({ tiles: [1, 1], rests: true, kind: null });
    expect(computer.parts.map((part) => part.model)).toEqual([
      'furniture-bits/monitor.glb',
      'furniture-bits/keyboard.glb',
      'furniture-bits/mousepad_A.glb',
      'furniture-bits/mouse.glb',
    ]);
    // Die Maus liegt auf dem Mauspad, alles bleibt auf der Kachel.
    expect(computer.parts[3]!.on).toBe(2);
    for (const part of computer.parts)
      for (const at of part.at ?? [0, 0]) expect(Math.abs(at)).toBeLessThan(0.5);
    // Auf den Schreibtisch (2 × 1 Kacheln) passen zwei.
    const desk: ElementSpot = { id: 'd', element: 'furniture-desk', x: 0, z: 0 };
    const one: ElementSpot = { id: 'c1', element: 'furniture-computer', x: 0, z: 0 };
    const two: ElementSpot = { id: 'c2', element: 'furniture-computer', x: 1, z: 0 };
    expect(fitsOnShelf(desk, one, new Set())).toBe(true);
    expect(fitsOnShelf(desk, two, new Set(spotFootprintCells(one)))).toBe(true);
  });

  it('stellt die Pflanzen doppelt so groß hin — ablegbar, und aufgenommen nur beim Einrichten', () => {
    const plants = FURNITURE_BITS_FOLDER.folders!.find((one) => one.label === 'Pflanzen')!;
    expect(plants.elements).toEqual([
      'furniture-cactus-small-a',
      'furniture-cactus-small-b',
      'furniture-cactus-a',
      'furniture-cactus-b',
    ]);
    for (const id of plants.elements) {
      const plant = elementById(id);
      expect(plant).toMatchObject({ rests: true, kind: null });
      expect(plant.parts[0]!.scale).toBe(PLANT_SCALE);
      expect(plant.parts[0]!.model).toMatch(/^furniture-bits\/cactus_/);
    }
    expect(PLANT_SCALE).toBe(2);
    // Die kleinen auf einer Zelle, die großen (0,88 m) auf einer Kachel.
    expect(elementById('furniture-cactus-small-a').tiles).toEqual([0.5, 0.5]);
    expect(elementById('furniture-cactus-a').tiles).toEqual([1, 1]);
    // Keine Station: Beim Spielen tut `A` daran nichts, und umgestellt wird
    // nur, wo Möbel sich bewegen (`movesFurniture`) — beim Einrichten.
    expect(movesFurniture('play')).toBe(false);
    expect(movesFurniture('arrange')).toBe(true);
  });

  it('legt Teppiche wie einen Boden auf den Boden — sie sperren nichts', () => {
    const rugs = FURNITURE_BITS_ELEMENTS.filter((one) => one.floor);
    expect(rugs).toHaveLength(6);
    for (const rug of rugs) {
      expect(rug.solid).toEqual([0, 0]);
      expect(spotCells({ id: 'r', element: rug.id, x: 2, z: 2 })).toEqual([]);
    }
    expect(ALL.has('furniture-rug-oval-a')).toBe(true);
  });
});

describe('Etwas auf einer Ablage', () => {
  const desk: ElementSpot = { id: 'desk', element: 'furniture-desk', x: 4, z: 4, face: 'S' };

  it('sperrt keine Zellen, wenn es obenauf steht', () => {
    const cup: ElementSpot = { id: 'cup', element: 'furniture-cup', x: 4, z: 4, y: 0.5 };
    expect(spotSolid(cup)).toEqual([0, 0]);
    expect(spotCells(cup)).toEqual([]);
    expect(spotCells({ ...cup, y: undefined })).toHaveLength(1);
  });

  it('passt nur auf die Grundfläche der Ablage und nicht auf eine besetzte Zelle', () => {
    const cup: ElementSpot = { id: 'cup', element: 'furniture-cup', x: 5.5, z: 4.5 };
    expect(fitsOnShelf(desk, cup, new Set())).toBe(true);
    expect(fitsOnShelf(desk, cup, new Set(spotFootprintCells(cup)))).toBe(false);
    expect(fitsOnShelf(desk, { ...cup, z: 5 }, new Set())).toBe(false);
  });

  it('geht mit der Ablage mit — gedreht, an derselben Stelle auf ihr', () => {
    const cup: ElementSpot = { id: 'cup', element: 'furniture-cup', x: 5.5, z: 4, face: 'E' };
    const place = riderPlace(desk, cup);
    const reach = Math.hypot(
      spotCentre(cup).x - spotCentre(desk).x,
      spotCentre(cup).z - spotCentre(desk).z,
    );
    expect(place).toMatchObject({ id: 'cup', element: 'furniture-cup', turns: 1 });
    // Wieder auf denselben Tisch: dieselbe Stelle, mit der Höhe der Platte.
    expect(riderSpot(desk, place, 0.5)).toEqual({ ...cup, y: 0.5 });
    for (const face of FACES) {
      const moved: ElementSpot = { ...desk, x: 10, z: 10, face };
      const rider = riderSpot(moved, place, 0.5);
      // Sie steht weiter auf dem Tisch, und zurückgerechnet ist es dieselbe Stelle.
      expect(fitsOnShelf(moved, rider, new Set())).toBe(true);
      expect(riderPlace(moved, rider)).toEqual(place);
      const a = spotCentre(moved);
      const b = spotCentre(rider);
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeCloseTo(reach, 5);
    }
  });
});

describe('Ablegbar in der Küche', () => {
  it('kennt Pizza, Schinken, Teller und Pfanne als ablegbar — die Tapete nicht', () => {
    for (const item of ['pizza', 'ham', 'plate', 'pan', 'cheese'] as const)
      expect(ITEM_RESTS.has(item)).toBe(true);
    for (const item of ['wallpaper-brick', 'floor-wood', 'stair'] as const)
      expect(ITEM_RESTS.has(item)).toBe(false);
  });

  it('legt die Pizza auf den Tisch und lässt die Tapetenbahn in der Hand', () => {
    expect(kitchenDeed(dish('pizza'), { kind: 'top' })).toEqual({
      do: 'place',
      dish: dish('pizza'),
    });
    expect(kitchenDeed(dish('wallpaper-brick'), { kind: 'top' })).toEqual({ do: 'nothing' });
  });
});
