import {
  KAYKIT_CHUNK,
  humanLabel,
  kaykitMenu,
  kaykitPath,
  kaykitPathOf,
  kaykitSize,
  type KaykitIndex,
} from './kaykitIndex';
import type { MenuEntry } from '../ui/menu';

/**
 * **Das Regal ist ein Baum aus Zeichenketten**, und genau deshalb steht es
 * hier auf dem Prüfstand: Was daraus wird, hängt an Ids, an der Reihenfolge
 * und an den Beschriftungen — und alle drei sieht man erst in der Brille,
 * wenn sie falsch sind.
 *
 * Geprüft wird ohne eine einzige Datei: Der Index ist ein Vertrag
 * (`tools/kaykit-index.mjs`), und ein Vertrag lässt sich hinschreiben.
 */

function index(root: KaykitIndex['root']): KaykitIndex {
  return { version: 1, root };
}

/** Sammelt alles, was beim Nehmen herauskäme. */
function picks(): { taken: string[]; pick: (path: string) => void } {
  const taken: string[] = [];
  return { taken, pick: (path: string) => taken.push(path) };
}

describe('humanLabel', () => {
  it('wirft die Endung weg und macht Leerzeichen aus Trennern', () => {
    expect(humanLabel('barrel_large.glb')).toBe('Barrel Large');
    expect(humanLabel('wall-corner.gltf')).toBe('Wall Corner');
  });

  it('lässt eigene Schreibweisen stehen', () => {
    // Was der Zeichner groß geschrieben hat, bleibt groß: `Hexnw` wäre eine
    // Korrektur, um die niemand gebeten hat.
    expect(humanLabel('hexNW_water.glb')).toBe('hexNW Water');
    expect(humanLabel('KayKit_knight.glb')).toBe('KayKit Knight');
  });

  it('verträgt Zahlen und doppelte Trenner', () => {
    expect(humanLabel('tile__02.glb')).toBe('Tile 02');
  });
});

describe('kaykitPath', () => {
  it('hängt Ordner und Datei aneinander, ohne Wurzel davor', () => {
    expect(kaykitPath(['dungeon', 'characters'], 'knight.glb')).toBe(
      'dungeon/characters/knight.glb',
    );
    expect(kaykitPath([], 'barrel.glb')).toBe('barrel.glb');
  });
});

describe('kaykitPathOf', () => {
  it('erkennt die Adresse hinter einer Vorschau-Id', () => {
    expect(kaykitPathOf('kaykit:dungeon/barrel.glb')).toBe('dungeon/barrel.glb');
  });

  it('lässt fremde Ids und Fächer in Ruhe', () => {
    // Ein Werkzeug-Regal hängt an derselben Fabrik, und ein Fach ist keine
    // Datei — beide dürfen kein Modell anfordern.
    expect(kaykitPathOf('pistol')).toBeNull();
    expect(kaykitPathOf('kaykit:forest#60')).toBeNull();
    expect(kaykitPathOf('kaykit:')).toBeNull();
  });
});

describe('kaykitSize', () => {
  it('sagt Kilobyte, bis Megabyte lesbarer sind', () => {
    expect(kaykitSize(12345)).toBe('12 KB');
    expect(kaykitSize(3_500_000)).toBe('3,3 MB');
  });

  it('bleibt leer, wo nichts steht', () => {
    expect(kaykitSize(undefined)).toBe('');
  });
});

describe('kaykitMenu', () => {
  it('stellt Ordner vor Dateien und sortiert beide', () => {
    const { pick } = picks();
    const entries = kaykitMenu(
      index({
        name: 'kaykit',
        dirs: [
          { name: 'zombies', dirs: [], files: [] },
          { name: 'adventurers', dirs: [], files: [] },
        ],
        files: [{ name: 'crate.glb' }, { name: 'barrel.glb' }],
      }),
      pick,
    );
    expect(entries.map((entry) => entry.label)).toEqual([
      'Adventurers',
      'Zombies',
      'Barrel',
      'Crate',
    ]);
  });

  it('sortiert Zahlen als Zahlen', () => {
    const { pick } = picks();
    const entries = kaykitMenu(
      index({ name: 'kaykit', dirs: [], files: [{ name: 'tile_10.glb' }, { name: 'tile_2.glb' }] }),
      pick,
    );
    expect(entries.map((entry) => entry.label)).toEqual(['Tile 2', 'Tile 10']);
  });

  it('gibt Ordnern ein Raster mit zwei Spalten und ihre Ids als Adresse', () => {
    const { pick } = picks();
    const [pack] = kaykitMenu(
      index({
        name: 'kaykit',
        dirs: [
          {
            name: 'dungeon-remastered',
            label: 'Dungeon Remastered',
            license: 'CC0-1.0',
            dirs: [{ name: 'characters', dirs: [], files: [{ name: 'knight.glb' }] }],
            files: [{ name: 'barrel.glb', bytes: 12345 }],
          },
        ],
        files: [],
      }),
      pick,
    );
    expect(pack!.id).toBe('kaykit:dungeon-remastered');
    expect(pack!.label).toBe('Dungeon Remastered');
    expect(pack!.sub).toBe('CC0-1.0 · 1 Ordner · 1 Modell');
    expect(pack!.icon).toBe('folder');
    expect(pack!.grid).toBe(true);
    expect(pack!.cols).toBe(2);
    expect(pack!.take).toBe(true);

    const inner = pack!.children!;
    expect(inner[0]!.id).toBe('kaykit:dungeon-remastered/characters');
    expect(inner[1]!.id).toBe('kaykit:dungeon-remastered/barrel.glb');
    expect(inner[1]!.sub).toBe('12 KB');
    expect(inner[1]!.preview).toBe('kaykit:dungeon-remastered/barrel.glb');
  });

  it('gibt beim Nehmen die Adresse heraus, samt Hand', () => {
    const taken: Array<[string, string | null]> = [];
    const [file] = kaykitMenu(
      index({ name: 'kaykit', dirs: [], files: [{ name: 'barrel.glb' }] }),
      (path, hand) => taken.push([path, hand]),
    );
    file!.run!('left');
    expect(taken).toEqual([['barrel.glb', 'left']]);
  });

  it('steigt beliebig tief', () => {
    const { pick } = picks();
    const entries = kaykitMenu(
      index({
        name: 'kaykit',
        dirs: [
          {
            name: 'hexagon',
            dirs: [
              {
                name: 'buildings',
                dirs: [{ name: 'blue', dirs: [], files: [{ name: 'house.glb' }] }],
                files: [],
              },
            ],
            files: [],
          },
        ],
        files: [],
      }),
      pick,
    );
    const deep = entries[0]!.children![0]!.children![0]!.children![0]!;
    expect(deep.id).toBe('kaykit:hexagon/buildings/blue/house.glb');
    expect(deep.preview).toBe('kaykit:hexagon/buildings/blue/house.glb');
  });

  it('verträgt einen leeren Index', () => {
    const { pick } = picks();
    expect(kaykitMenu(index({ name: 'kaykit' }), pick)).toEqual([]);
    expect(kaykitMenu(index({ name: 'kaykit', dirs: [], files: [] }), pick)).toEqual([]);
  });

  /**
   * Der große Ordner ist der Normalfall dieser Sammlung und nicht die
   * Ausnahme: Das Waldpaket bringt rund 1588 Modelle mit. Ohne Fächer wären
   * das vierhundert Rasterseiten am Stück.
   */
  describe('ein großer Ordner', () => {
    const many = Array.from({ length: KAYKIT_CHUNK * 2 + 5 }, (_, i) => ({
      name: `tile_${String(i + 1).padStart(4, '0')}.glb`,
    }));
    const { pick } = picks();
    const entries = kaykitMenu(index({ name: 'kaykit', dirs: [], files: many }), pick);

    it('zerfällt in Fächer zu je KAYKIT_CHUNK', () => {
      expect(entries).toHaveLength(3);
      expect(entries.map((entry) => entry.label)).toEqual([
        `1–${KAYKIT_CHUNK}`,
        `${KAYKIT_CHUNK + 1}–${KAYKIT_CHUNK * 2}`,
        `${KAYKIT_CHUNK * 2 + 1}–${KAYKIT_CHUNK * 2 + 5}`,
      ]);
      expect(entries[0]!.children).toHaveLength(KAYKIT_CHUNK);
      expect(entries[2]!.children).toHaveLength(5);
    });

    it('sagt im Untertitel, was darin liegt', () => {
      expect(entries[0]!.sub).toBe(`Tile 0001 … Tile ${String(KAYKIT_CHUNK).padStart(4, '0')}`);
    });

    it('hat stabile Ids, die keine Dateiadresse sind', () => {
      expect(entries[1]!.id).toBe(`kaykit:#${KAYKIT_CHUNK}`);
      expect(kaykitPathOf(entries[1]!.id)).toBeNull();
    });

    it('lässt einen Ordner an der Grenze ungeteilt', () => {
      const exact = kaykitMenu(
        index({ name: 'kaykit', dirs: [], files: many.slice(0, KAYKIT_CHUNK) }),
        pick,
      );
      expect(exact).toHaveLength(KAYKIT_CHUNK);
      expect(exact.every((entry) => entry.preview !== undefined)).toBe(true);
    });
  });

  it('vergibt jede Id nur einmal', () => {
    const { pick } = picks();
    const entries = kaykitMenu(
      index({
        name: 'kaykit',
        dirs: [
          { name: 'a', dirs: [], files: [{ name: 'x.glb' }] },
          { name: 'b', dirs: [], files: [{ name: 'x.glb' }] },
        ],
        files: [{ name: 'x.glb' }],
      }),
      pick,
    );
    const ids: string[] = [];
    const walk = (list: MenuEntry[]): void => {
      for (const entry of list) {
        ids.push(entry.id);
        if (entry.children) walk(entry.children);
      }
    };
    walk(entries);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
