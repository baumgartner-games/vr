import {
  KAYKIT_CATEGORIES,
  KAYKIT_CHUNK,
  humanLabel,
  kaykitCategoriesOf,
  kaykitCategoryOf,
  kaykitFiles,
  kaykitMenu,
  kaykitPackMenu,
  kaykitPath,
  kaykitPathOf,
  kaykitSearch,
  kaykitSearchEntries,
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

describe('kaykitPackMenu', () => {
  it('stellt Ordner vor Dateien und sortiert beide', () => {
    const { pick } = picks();
    const entries = kaykitPackMenu(
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
    const entries = kaykitPackMenu(
      index({ name: 'kaykit', dirs: [], files: [{ name: 'tile_10.glb' }, { name: 'tile_2.glb' }] }),
      pick,
    );
    expect(entries.map((entry) => entry.label)).toEqual(['Tile 2', 'Tile 10']);
  });

  it('gibt Ordnern ein Raster mit zwei Spalten und ihre Ids als Adresse', () => {
    const { pick } = picks();
    const [pack] = kaykitPackMenu(
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
    const [file] = kaykitPackMenu(
      index({ name: 'kaykit', dirs: [], files: [{ name: 'barrel.glb' }] }),
      (path, hand) => taken.push([path, hand]),
    );
    file!.run!('left');
    expect(taken).toEqual([['barrel.glb', 'left']]);
  });

  it('steigt beliebig tief', () => {
    const { pick } = picks();
    const entries = kaykitPackMenu(
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
    expect(kaykitPackMenu(index({ name: 'kaykit' }), pick)).toEqual([]);
    expect(kaykitPackMenu(index({ name: 'kaykit', dirs: [], files: [] }), pick)).toEqual([]);
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
    const entries = kaykitPackMenu(index({ name: 'kaykit', dirs: [], files: many }), pick);

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
      const exact = kaykitPackMenu(
        index({ name: 'kaykit', dirs: [], files: many.slice(0, KAYKIT_CHUNK) }),
        pick,
      );
      expect(exact).toHaveLength(KAYKIT_CHUNK);
      expect(exact.every((entry) => entry.preview !== undefined)).toBe(true);
    });
  });

  it('vergibt jede Id nur einmal', () => {
    const { pick } = picks();
    const entries = kaykitPackMenu(
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

/**
 * **Die Schubladen** — der zweite Weg ins Regal, neben dem Ordnerbaum.
 *
 * Geprüft wird nicht, ob die Einteilung „richtig" ist (das entscheidet, wer
 * sie benutzt), sondern die Zusagen, an denen sie hängt: Jede Datei landet in
 * **mindestens einer** Schublade und in jeder, auf die sie passt; die erste
 * davon ist die Hauptkategorie; und übrig bleibt niemand.
 */
describe('die Kategorien', () => {
  it('stecken jede Datei in eine Schublade, die es gibt', () => {
    const ids = new Set(KAYKIT_CATEGORIES.map((category) => category.id));
    for (const path of [
      'adventurers/characters/Knight.glb',
      'furniture-bits/bed_double_A.glb',
      'forest-nature/color1/Tree_1_A_Color1.glb',
      'restaurant-bits/crate_buns.glb',
      'rpg-tools-bits/anvil.glb',
      'mixed-bag/bicycle.glb',
    ]) {
      expect(ids.has(kaykitCategoryOf(path))).toBe(true);
    }
  });

  it('nimmt als Hauptkategorie die erste der Tabelle', () => {
    // Eine Kiste Brötchen ist Essen und Kiste: Essen steht vorher.
    expect(kaykitCategoryOf('restaurant-bits/crate_buns.glb')).toBe('food');
    expect(kaykitCategoryOf('restaurant-bits/crate.glb')).toBe('containers');
  });

  /**
   * **Mehrere Schubladen je Datei** — der Kern des Auftrags. Wer Kisten
   * durchsieht, findet die Kiste Brötchen, obwohl sie „eigentlich" Essen ist.
   */
  it('legt eine Datei in jede Schublade, auf die sie passt', () => {
    expect(kaykitCategoriesOf('restaurant-bits/crate_buns.glb')).toEqual(['food', 'containers']);
    expect(kaykitCategoriesOf('furniture-bits/table_lamp.glb')).toEqual(['furniture']);
    // Das Paket entscheidet, und das Wort im Namen kommt dazu.
    expect(kaykitCategoriesOf('forest-nature/wooden_bench.glb')).toEqual(['furniture', 'nature']);
  });

  it('gibt jede Schublade nur einmal heraus', () => {
    const cats = kaykitCategoriesOf('furniture-bits/chair_table_set.glb');
    expect(new Set(cats).size).toBe(cats.length);
  });

  it('lässt auch beim Auffangen nichts doppelt oder leer', () => {
    expect(kaykitCategoriesOf('mixed-bag/etwas_ganz_neues.glb')).toEqual(['rest']);
  });

  it('kennt Figuren an ihrem Paket', () => {
    expect(kaykitCategoryOf('adventurers/characters/Knight.glb')).toBe('figures');
    expect(kaykitCategoryOf('medieval-hexagon/units/unit_archer_blue.glb')).toBe('figures');
  });

  it('liest ganze Wörter und keine Stücke', () => {
    // `boxer` ist keine Kiste — sonst wäre jedes Wort mit `box` darin eine.
    expect(kaykitCategoryOf('mixed-bag/boxer.glb')).toBe('rest');
    expect(kaykitCategoryOf('mixed-bag/box_A.glb')).toBe('containers');
  });

  it('lässt nichts liegen', () => {
    expect(kaykitCategoryOf('mixed-bag/etwas_ganz_neues.glb')).toBe('rest');
    expect(kaykitCategoryOf('')).toBe('rest');
  });
});

describe('die Suche', () => {
  const files = kaykitFiles(
    index({
      name: 'kaykit',
      dirs: [
        {
          name: 'furniture-bits',
          dirs: [],
          files: [{ name: 'chair_A.glb' }, { name: 'armchair.glb' }, { name: 'bed_single_A.glb' }],
        },
        { name: 'dungeon', dirs: [], files: [{ name: 'barrel_large.glb' }] },
      ],
      files: [],
    }),
  );

  it('legt alle Dateien flach hin, mit Adresse und Beschriftung', () => {
    expect(files.map((file) => file.path)).toEqual([
      'dungeon/barrel_large.glb',
      'furniture-bits/armchair.glb',
      'furniture-bits/bed_single_A.glb',
      'furniture-bits/chair_A.glb',
    ]);
    expect(files[0]!.label).toBe('Barrel Large');
  });

  it('findet auch mitten im Namen', () => {
    expect(kaykitSearch(files, 'chair').map((file) => file.name)).toEqual([
      'chair_A.glb',
      'armchair.glb',
    ]);
  });

  it('stellt den Namensanfang nach vorn', () => {
    // `chair_A` fängt mit dem Gesuchten an, `armchair` enthält es nur.
    expect(kaykitSearch(files, 'chair')[0]!.name).toBe('chair_A.glb');
  });

  it('verlangt alle Wörter', () => {
    expect(kaykitSearch(files, 'dungeon barrel').map((file) => file.name)).toEqual([
      'barrel_large.glb',
    ]);
    expect(kaykitSearch(files, 'dungeon chair')).toEqual([]);
  });

  it('nimmt auch den Pfad als Filter', () => {
    expect(kaykitSearch(files, 'furniture')).toHaveLength(3);
  });

  it('gibt ohne Begriff nichts zurück', () => {
    expect(kaykitSearch(files, '')).toEqual([]);
    expect(kaykitSearch(files, '   ')).toEqual([]);
  });

  it('hält sich an die Obergrenze', () => {
    expect(kaykitSearch(files, 'chair', 1)).toHaveLength(1);
  });

  /**
   * **Nach Kategorien suchen** — der zweite Teil des Auftrags. In keinem
   * dieser Dateinamen steht `möbel`, und trotzdem sollen die drei Möbel
   * kommen, wenn man es eintippt.
   */
  it('findet auch über die Schublade', () => {
    expect(
      kaykitSearch(files, 'möbel')
        .map((file) => file.name)
        .sort(),
    ).toEqual(['armchair.glb', 'bed_single_A.glb', 'chair_A.glb']);
    // Dieselbe Schublade auf Englisch — ihre Id zählt genauso.
    expect(kaykitSearch(files, 'furniture')).toHaveLength(3);
    expect(kaykitSearch(files, 'kisten').map((file) => file.name)).toEqual(['barrel_large.glb']);
  });

  it('lässt sich mit der Schublade auch filtern', () => {
    expect(kaykitSearch(files, 'möbel bed').map((file) => file.name)).toEqual(['bed_single_A.glb']);
    expect(kaykitSearch(files, 'kisten chair')).toEqual([]);
  });

  /** Ein einzelner Buchstabe ist kein Kategoriename — sonst filtert nichts mehr. */
  it('nimmt kurze Wörter nicht für Schubladen', () => {
    expect(kaykitSearch(files, 'mö')).toEqual([]);
  });

  it('macht aus den Treffern Kacheln, die dieselbe Adresse tragen', () => {
    const taken: string[] = [];
    const entries = kaykitSearchEntries(files, 'barrel', (path) => taken.push(path));
    expect(entries.map((entry) => entry.id)).toEqual(['kaykit:dungeon/barrel_large.glb']);
    expect(entries[0]!.preview).toBe('kaykit:dungeon/barrel_large.glb');
    entries[0]!.run!(null);
    expect(taken).toEqual(['dungeon/barrel_large.glb']);
  });
});

describe('kaykitMenu', () => {
  const tree = index({
    name: 'kaykit',
    dirs: [
      {
        name: 'furniture-bits',
        label: 'Furniture Bits',
        dirs: [],
        files: [{ name: 'chair_A.glb' }],
      },
      { name: 'dungeon', dirs: [], files: [{ name: 'barrel_large.glb' }] },
    ],
    files: [],
  });

  /** Die Gabelung am Anfang: drei Wege und sonst nichts. */
  it('fragt zuerst, auf welchem Weg man hineingeht', () => {
    const { pick } = picks();
    const entries = kaykitMenu(tree, pick);
    expect(entries.map((entry) => entry.id)).toEqual(['kaykit#all', 'kaykit#packs', 'kaykit#cats']);
    expect(entries.map((entry) => entry.label)).toEqual([
      'Alles anschauen',
      'Nach Paketen',
      'Nach Kategorien',
    ]);
    expect(entries.map((entry) => entry.sub)).toEqual(['2 Modelle', '2 Pakete', '2 Kategorien']);
  });

  it('legt hinter „Alles anschauen" die ganze Sammlung', () => {
    const { pick } = picks();
    const all = kaykitMenu(tree, pick)[0]!;
    expect(all.children!.map((entry) => entry.id)).toEqual([
      'kaykit:dungeon/barrel_large.glb',
      'kaykit:furniture-bits/chair_A.glb',
    ]);
  });

  it('lässt leere Schubladen weg', () => {
    const { pick } = picks();
    const cats = kaykitMenu(tree, pick)[2]!;
    const ids = cats.children!.map((entry) => entry.id);
    expect(ids).toContain('kaykit#cat:furniture');
    expect(ids).toContain('kaykit#cat:containers');
    expect(ids).not.toContain('kaykit#cat:figures');
  });

  it('nimmt den ganzen Schirm und kennt seine Spalten', () => {
    const { pick } = picks();
    const pages = kaykitMenu(tree, pick)
      .flatMap((way) => [way, ...(way.children ?? [])])
      .filter((entry) => entry.children);
    for (const entry of pages) {
      expect(entry.full).toBe(true);
      expect(entry.grid).toBe(true);
      expect(entry.cols).toBe(2);
    }
  });

  it('verträgt einen leeren Index', () => {
    const { pick } = picks();
    expect(kaykitMenu(index({ name: 'kaykit' }), pick)).toEqual([]);
  });

  /**
   * **Ids müssen unter Geschwistern eindeutig sein** und nicht im ganzen Baum:
   * Dieselbe Datei steht einmal in ihrer Schublade und einmal in ihrem Paket,
   * und das ist der Sinn der Sache. Der Weg durchs Menü merkt sich Seiten
   * (`ui/menuNav.ts`), und eine Seite wird immer bei ihren Geschwistern
   * gesucht.
   */
  it('vergibt jede Id unter Geschwistern nur einmal', () => {
    const { pick } = picks();
    const walk = (list: MenuEntry[]): void => {
      const ids = list.map((entry) => entry.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const entry of list) if (entry.children) walk(entry.children);
    };
    walk(kaykitMenu(tree, pick));
  });

  /** Die Fächer bleiben — nur darf die Seite sie überspringen. */
  it('lässt seine Fächer am Schirm überspringen', () => {
    const many = Array.from({ length: KAYKIT_CHUNK + 1 }, (_, i) => ({
      name: `tile_${String(i + 1).padStart(4, '0')}.glb`,
    }));
    const { pick } = picks();
    const [sheet] = kaykitPackMenu(index({ name: 'kaykit', dirs: [], files: many }), pick);
    expect(sheet!.flatten).toBe(true);
  });
});
