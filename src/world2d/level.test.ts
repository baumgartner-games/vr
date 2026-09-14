import {
  DEFAULT_LAYERS,
  TILE_M,
  TILE_PX,
  emptyLevel,
  isSolidAt,
  layerOf,
  loadLevel,
  parseLevel,
  saveLevel,
  serializeLevel,
  setTile,
  tileAt,
} from './level';
import { sampleLevel } from './sample';
import { SOLID_TILES, TILES } from './tiles';
import { Object3D } from 'three';
import { renderModelSprite } from './modelSprite';
import { WORLDS } from '../worlds';

/**
 * **Die 2D-Welt als Daten** (`level.ts`) — die Wahrheit, aus der später die
 * 3D-Welt gebaut wird. Was hier geprüft wird, ist das, was sonst erst in einer
 * Datei auffällt, die niemand mehr lesen kann: dass ein Plan die Reise durch
 * JSON unverändert übersteht, dass fremder Text keinen Absturz auslöst, und
 * dass „fest" auf jeder sichtbaren Ebene gilt.
 */
describe('Der Plan', () => {
  it('fängt mit drei leeren Ebenen an und einer Mitte als Start', () => {
    const level = emptyLevel('hub', 'Hub', 8, 6);
    expect(level.layers.map((l) => l.id)).toEqual(DEFAULT_LAYERS.map((l) => l.id));
    expect(level.layers[0]!.tiles).toHaveLength(48);
    expect(level.spawn).toEqual({ col: 4, row: 3 });
  });

  it('setzt und liest Kacheln — und sagt, ob sich etwas geändert hat', () => {
    const level = emptyLevel('hub', 'Hub', 4, 4);
    const ground = layerOf(level, 'ground')!;
    expect(setTile(level, ground, 1, 2, 6)).toBe(true);
    expect(setTile(level, ground, 1, 2, 6)).toBe(false);
    expect(tileAt(level, ground, 1, 2)).toBe(6);
    // Außerhalb ist leer und lässt sich nicht beschreiben.
    expect(setTile(level, ground, 9, 9, 6)).toBe(false);
    expect(tileAt(level, ground, -1, 0)).toBe(0);
  });

  it('ist fest, wo irgendeine sichtbare Ebene fest ist — und außerhalb immer', () => {
    const level = emptyLevel('hub', 'Hub', 4, 4);
    const objects = layerOf(level, 'objects')!;
    setTile(level, objects, 2, 2, 9);
    expect(isSolidAt(level, SOLID_TILES, 2, 2)).toBe(true);
    expect(isSolidAt(level, SOLID_TILES, 1, 1)).toBe(false);
    expect(isSolidAt(level, SOLID_TILES, 4, 0)).toBe(true);
    // Ausgeblendet hält die Mauer niemanden auf — das ist der Sinn davon.
    objects.visible = false;
    expect(isSolidAt(level, SOLID_TILES, 2, 2)).toBe(false);
  });

  it('übersteht die Reise durch JSON unverändert', () => {
    const level = sampleLevel('moon', 'Mond');
    const back = parseLevel(serializeLevel(level));
    expect(back).toEqual(level);
  });

  it('macht aus fremdem Text keinen Absturz', () => {
    expect(parseLevel('{kaputt')).toBeNull();
    expect(parseLevel('{"cols":0,"rows":3}')).toBeNull();
    expect(parseLevel('{"cols":9999,"rows":2,"layers":[]}')).toBeNull();
    // Eine zu kurze Kachelliste wird aufgefüllt, eine zu lange gekürzt, Unsinn wird leer.
    const thin = parseLevel(
      '{"cols":2,"rows":2,"id":{},"layers":[{"kind":"ground","tiles":[1,"x",3,4,5,6]}]}',
    )!;
    expect(thin.layers[0]!.tiles).toEqual([1, 0, 3, 4]);
    expect(thin.id).toBe('level');
    expect(thin.spawn).toEqual({ col: 1, row: 1 });
  });

  it('merkt sich einen Plan je Welt', () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    const level = sampleLevel('alps', 'Alpen');
    saveLevel(level, fake);
    expect(loadLevel('alps', fake)).toEqual(level);
    expect(loadLevel('moon', fake)).toBeNull();
  });
});

describe('Der Kachelkatalog', () => {
  it('hat eindeutige Kennungen, und keine ist die leere Zelle', () => {
    const ids = TILES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id > 0)).toBe(true);
  });

  it('weiß, was fest ist: Wasser und Mauer ja, Gras und Brücke nein', () => {
    const byName = (name: string) => TILES.find((t) => t.name === name)!.id;
    expect(SOLID_TILES.has(byName('Wasser'))).toBe(true);
    expect(SOLID_TILES.has(byName('Mauer'))).toBe(true);
    expect(SOLID_TILES.has(byName('Gras'))).toBe(false);
    expect(SOLID_TILES.has(byName('Brücke'))).toBe(false);
  });

  it('rechnet eine Kachel als einen Meter — die Brücke zur 3D-Welt', () => {
    expect(TILE_M).toBe(1);
    expect(TILE_PX).toBe(16);
  });

  /**
   * **Die Kachel, die aus 3D kommt.** Sie steht im Katalog wie jede andere —
   * mit Kennung, Ebene und „fest" —, obwohl ihr Bild erst beim Zeichnen aus
   * einem `THREE.Mesh` entsteht (`modelSprite.ts`). Hier läuft weder ein
   * Browser noch WebGL, und genau das ist die Prüfung: Der Katalog ist auch
   * dann vollständig, und das Ablichten gibt `null` zurück statt zu krachen —
   * die Zusage, an der die flache Ersatzkachel hängt.
   */
  it('hat den Companion Cube — auch ohne WebGL, dann eben ohne Bild', () => {
    const cube = TILES.find((tile) => tile.name === 'Companion Cube');
    expect(cube).toBeDefined();
    expect(cube!.layer).toBe('objects');
    expect(SOLID_TILES.has(cube!.id)).toBe(true);
    expect(renderModelSprite(new Object3D())).toBeNull();
  });
});

describe('Der Anfangsplan einer Welt', () => {
  const water = TILES.find((t) => t.name === 'Wasser')!.id;
  const bridge = TILES.find((t) => t.name === 'Brücke')!.id;
  const cube = TILES.find((t) => t.name === 'Companion Cube')!.id;
  /** Wo eine Kachel auf einer Ebene überhaupt vorkommt. */
  const cells = (level: ReturnType<typeof sampleLevel>, layer: string, tile: number) => {
    const data = layerOf(level, layer)!;
    const found: Array<[number, number]> = [];
    for (let row = 0; row < level.rows; row++)
      for (let col = 0; col < level.cols; col++)
        if (tileAt(level, data, col, row) === tile) found.push([col, row]);
    return found;
  };

  it('hat Wasser unter der Brücke, damit man nicht drumherum muss', () => {
    const level = sampleLevel('hub', 'Hub');
    const planks = cells(level, 'objects', bridge);
    expect(planks.length).toBeGreaterThan(2);
    // Die Brücke fängt und endet am Ufer; dazwischen steht sie über Wasser.
    const ground = layerOf(level, 'ground')!;
    const overWater = planks.filter(([col, row]) => tileAt(level, ground, col, row) === water);
    expect(overWater.length).toBeGreaterThan(0);
  });

  it('stellt den Helden auf freien Boden', () => {
    for (const world of WORLDS) {
      const level = sampleLevel(world.id, world.title);
      expect(isSolidAt(level, SOLID_TILES, level.spawn.col, level.spawn.row)).toBe(false);
    }
  });

  it('stellt Companion Cubes in jede Welt', () => {
    for (const world of WORLDS) {
      const level = sampleLevel(world.id, world.title);
      expect(cells(level, 'objects', cube).length).toBeGreaterThan(0);
    }
  });

  /**
   * **Der Grund, warum es diese Datei gibt.** Vorher bekam jede Welt dieselbe
   * Lichtung: Der Wechsel im Menü lief, aber von oben sah man Bild für Bild
   * dasselbe — „die Welten lassen sich nicht wechseln". Zwei Welten sind jetzt
   * zwei Orte, und dieselbe Welt bleibt dieselbe.
   */
  it('gibt jeder Welt ihren eigenen Plan — und derselben Welt immer denselben', () => {
    const plan = (id: string): string =>
      layerOf(sampleLevel(id, id), 'ground')!.tiles.join(',') +
      '|' +
      layerOf(sampleLevel(id, id), 'objects')!.tiles.join(',');
    const seen = new Map<string, string>();
    for (const world of WORLDS) {
      const mine = plan(world.id);
      const twin = [...seen.entries()].find(([, other]) => other === mine);
      expect(twin?.[0] ?? null).toBeNull();
      seen.set(world.id, mine);
    }
    expect(plan('moon')).toBe(plan('moon'));
  });
});
