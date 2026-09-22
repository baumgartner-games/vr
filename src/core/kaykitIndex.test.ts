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
import { KAYKIT_TERMS, KAYKIT_TERM_COVERAGE, kaykitEnglish, kaykitGerman } from './kaykitTerms';
import type { MenuEntry, MenuFact } from '../ui/menu';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
    // Der Untertitel einer Modellkachel ist die **Adresse** — in der Brille
    // ist das Fähnchen über dem Panel die einzige Stelle, an der sie steht.
    expect(inner[1]!.sub).toBe('dungeon-remastered/barrel.glb');
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

/**
 * **Die Sammlung heißt englisch, gesucht wird deutsch** — der dritte Teil des
 * Auftrags: „ich möchte zudem translations (deutsch, english) für die kaykit
 * elemente haben, sodass ich auch auf deutsch danach suchen kann."
 *
 * Geprüft wird die Zusage und nicht das Wörterbuch: Ein deutsches Wort muss
 * **dieselbe** Datei finden wie sein englisches Gegenstück, alle Wörter der
 * Anfrage müssen weiter vorkommen, und ein Name, der wirklich so heißt, muss
 * vor einer Übersetzung stehen.
 */
describe('die Suche auf Deutsch', () => {
  const files = kaykitFiles(
    index({
      name: 'kaykit',
      dirs: [
        {
          name: 'restaurant-bits',
          dirs: [],
          files: [
            { name: 'crate_A.glb' },
            { name: 'crate_wood.glb' },
            // Eine Datei, die wirklich so heißt, wie jemand tippt — es gibt
            // sie in der Sammlung nicht, und genau deshalb steht sie hier:
            // Die Wertung muss sie vor die Übersetzung stellen.
            { name: 'kiste_A.glb' },
          ],
        },
        {
          name: 'furniture-bits',
          dirs: [],
          files: [{ name: 'bookcase_single.glb' }, { name: 'lantern.glb' }],
        },
        {
          name: 'dungeon',
          dirs: [],
          files: [{ name: 'barrel_large.glb' }, { name: 'barrels.glb' }],
        },
      ],
      files: [],
    }),
  );

  const found = (query: string): string[] => kaykitSearch(files, query).map((file) => file.name);

  it('findet mit dem deutschen Wort dieselbe Datei wie mit dem englischen', () => {
    expect(found('laterne')).toEqual(found('lantern'));
    expect(found('laterne')).toEqual(['lantern.glb']);
    expect(found('bücherregal')).toEqual(['bookcase_single.glb']);
    // `fass` bringt darüber hinaus die Schublade _Kisten & Fässer_ mit und
    // damit auch die Kisten — aber eben erst hinter den Fässern.
    expect(found('fass').slice(0, 2)).toEqual(found('barrel'));
  });

  it('nimmt Umlaute und die getippte Schreibweise gleichermaßen', () => {
    // `terms()` faltet `ä→a`; wer auf einem englischen Pad sitzt, schreibt
    // ohnehin `fasser` — beide müssen dasselbe finden.
    expect(found('fässer')).toEqual(found('fasser'));
    expect(found('bücherregal')).toEqual(found('bucherregal'));
    // Und der Plural zeigt auf die Einzahl: `barrel` steckt in `barrels`.
    expect(found('fässer').slice(0, 2)).toEqual(['barrel_large.glb', 'barrels.glb']);
  });

  it('verlangt auch gemischt alle Wörter', () => {
    // Das stand einmal als Gegenbeispiel im Kommentar von `kaykitSearch`:
    // „`holz kiste` findet nichts". Jetzt findet es genau die eine Datei.
    expect(found('holz kiste')).toEqual(['crate_wood.glb']);
    expect(found('kiste holz')).toEqual(['crate_wood.glb']);
    expect(found('holz laterne')).toEqual([]);
  });

  it('stellt den echten Namen vor die Übersetzung und die vor die Schublade', () => {
    // `kiste_A` heißt so, `crate_A` heißt übersetzt so, und `barrel_large`
    // liegt nur in derselben Schublade (_Kisten & Fässer_).
    const hits = found('kiste');
    expect(hits.indexOf('kiste_A.glb')).toBe(0);
    expect(hits.indexOf('crate_A.glb')).toBeLessThan(hits.indexOf('barrel_large.glb'));
  });

  it('lässt sich vom Wörterbuch nicht mehr Dateien andrehen', () => {
    // Übersetzt wird gegen **ganze** Wörter: `dose` heißt `can`, und `can`
    // steckt in `candle` — gefunden werden darf die Kerze trotzdem nicht.
    expect(found('dose')).toEqual([]);
  });

  it('schreibt die deutsche Bedeutung an die Datei', () => {
    const crate = files.find((file) => file.name === 'crate_wood.glb')!;
    expect(crate.german).toBe('Kiste Holz');
    // Und sie steht auch in der Kachel und im Steckbrief.
    const { pick } = picks();
    const entry = kaykitSearchEntries(files, 'crate wood', pick)[0]!;
    expect(entry.label).toBe('Crate Wood');
    expect(entry.caption).toBe('Kiste Holz');
    expect(entry.detail!.facts[1]).toEqual({ label: 'Deutsch', value: 'Kiste Holz' });
  });
});

/**
 * **Der Steckbrief hinter dem ⓘ** — und darin die Zeile, für die es ihn gibt.
 *
 * Zwei Modelle waren einmal als „block b" und „block column" bestellt worden,
 * und beide Namen gibt es in der Sammlung nicht: Die Kachel beschriftet mit
 * `humanLabel` („Bricks B"), und der Steckbrief zerlegte die Adresse in
 * Ordner und Datei. Seither steht sie an einem Stück darin — und das ist eine
 * reine Rechnung aus einem `KaykitFileRef`, also steht sie hier auf dem
 * Prüfstand.
 */
describe('Der Steckbrief einer Datei', () => {
  function facts(): MenuFact[] {
    const { pick } = picks();
    const [pack] = kaykitPackMenu(
      index({
        name: 'kaykit',
        dirs: [
          {
            name: 'dungeon-remastered',
            label: 'Dungeon Remastered',
            license: 'CC0-1.0',
            dirs: [],
            files: [{ name: 'barrel_large.glb', bytes: 12345 }],
          },
        ],
        files: [],
      }),
      pick,
    );
    return [...pack!.children![0]!.detail!.facts];
  }

  it('stellt die Adresse an den Anfang — an einem Stück und ohne `models/kaykit/`', () => {
    expect(facts()[0]).toEqual({
      label: 'Adresse',
      value: 'dungeon-remastered/barrel_large.glb',
      copy: true,
    });
  });

  it('buchstabiert sie nicht mehr in Ordner und Datei', () => {
    const labels = facts().map((fact) => fact.label);
    expect(labels).not.toContain('Ordner');
    expect(labels).not.toContain('Datei');
    // Das Paket bleibt: Es ist der wirkliche Name aus dem Index und nicht der
    // Ordnername, steht also in keinem Pfad.
    expect(labels).toEqual(['Adresse', 'Deutsch', 'Paket', 'Dateigröße', 'Schubladen']);
    expect(facts()[2]!.value).toBe('Dungeon Remastered');
  });

  it('erlaubt das Mitnehmen genau dort, wo es etwas nützt', () => {
    // Eine Dateigröße kopiert niemand, und „Kiste Holz" ist keine Adresse.
    expect(
      facts()
        .filter((fact) => fact.copy)
        .map((fact) => fact.label),
    ).toEqual(['Adresse']);
  });
});

/**
 * **Das Wörterbuch selbst** — 710 Einträge, und jeder einzelne ist eine
 * Behauptung über die Sammlung: „dieses englische Wort kommt darin vor, und
 * auf Deutsch heißt es so". Die erste Hälfte davon lässt sich gegen
 * `index.json` prüfen, und genau das passiert hier.
 */
describe('das Wörterbuch', () => {
  it('hat zu jedem Wort mindestens ein deutsches, und keines doppelt', () => {
    for (const [english, german] of Object.entries(KAYKIT_TERMS)) {
      expect(english).toMatch(/^[a-z0-9]+$/);
      expect(german.length).toBeGreaterThan(0);
      for (const word of german) expect(word.trim().length).toBeGreaterThan(0);
      expect(new Set(german).size).toBe(german.length);
    }
  });

  it('bildet kein Wort auf sich selbst ab', () => {
    // `hammer: ['Hammer']` wäre eine Zeile, die keinen Treffer bringt, den es
    // nicht ohnehin gibt — die Grenze der Liste steht genau hier.
    for (const [english, german] of Object.entries(KAYKIT_TERMS)) {
      expect(german.map((word) => word.toLowerCase())).not.toContain(english);
    }
  });

  it('übersetzt zurück, gefaltet und in Wörtern', () => {
    expect(kaykitEnglish('fass')).toContain('barrel');
    expect(kaykitEnglish('fasser')).toContain('barrel');
    // Ein Plural zeigt auf die Einzahl: `barrel` steckt in `barrels` drin.
    expect(kaykitEnglish('fässer'.replace('ä', 'a'))).toEqual(kaykitEnglish('fasser'));
    // Mehrteilige Bedeutungen stehen unter jedem ihrer Wörter.
    expect(kaykitEnglish('ritter')).toContain('knight');
    // Und was nichts heißt, heißt nichts.
    expect(kaykitEnglish('xyzzy')).toEqual([]);
  });

  it('glossiert einen Dateinamen Wort für Wort, ohne Doppelung', () => {
    expect(kaykitGerman('barrel_large.glb')).toBe('Fass Groß');
    expect(kaykitGerman('Rock_Large_A.glb')).toBe('Stein Groß');
    // Zählbuchstaben und Maßkürzel bedeuten nichts und fallen weg.
    expect(kaykitGerman('block_4x4x2_B.glb')).toBe('Klotz');
    expect(kaykitGerman('Paladin.glb')).toBe('');
  });

  /**
   * **Ein Eintrag, der auf kein einziges Modell zeigt**, ist ein Vertipper
   * oder ein Rest aus einem Paket, das es nicht mehr gibt — beides fällt hier
   * auf und nicht erst beim vergeblichen Suchen.
   */
  it('nennt nur Wörter, die im Index wirklich stehen', () => {
    const index = readIndex();
    if (!index) return;
    const words = new Set<string>();
    for (const path of allPaths(index)) {
      for (const word of path.toLowerCase().split(/[^a-z0-9]+/)) if (word) words.add(word);
    }
    const stray = Object.keys(KAYKIT_TERMS).filter((english) => !words.has(english));
    expect(stray).toEqual([]);
  });

  /**
   * **Die Abdeckung ist eine Zusage und keine Messung** — sie steht als Zahl
   * im Wörterbuch (`KAYKIT_TERM_COVERAGE`), und hier wird nachgerechnet, ob
   * sie noch stimmt. Wer ein Paket dazunimmt, dessen Wörter niemand
   * übersetzt hat, merkt es dann hier und nicht erst am leeren Suchfeld.
   */
  it('gibt fast jeder Datei ein deutsches Wort', () => {
    const index = readIndex();
    if (!index) return;
    const paths = allPaths(index);
    const named = paths.filter(
      (path) => kaykitGerman(path.slice(path.lastIndexOf('/') + 1)) !== '',
    );
    expect(named.length / paths.length).toBeGreaterThanOrEqual(KAYKIT_TERM_COVERAGE);
  });
});

/** Der Index von der Platte — oder `null`, wenn die Pakete nicht da sind. */
function readIndex(): KaykitIndex | null {
  try {
    // Von der Wurzel des Projekts aus, denn Jest läuft dort — und
    // `import.meta` gibt es im CommonJS-Lauf der Tests nicht.
    return JSON.parse(
      readFileSync(join(process.cwd(), 'public', 'models', 'kaykit', 'index.json'), 'utf8'),
    ) as KaykitIndex;
  } catch {
    // Ohne die gekauften Pakete gibt es nichts zu prüfen — und das ist ein
    // normaler Zustand und kein Fehler (`core/kaykitFit.test.ts` macht es
    // genauso).
    return null;
  }
}

/** Alle Adressen des Index, flach — ohne den Umweg über `kaykitFiles`. */
function allPaths(tree: KaykitIndex): string[] {
  return kaykitFiles(tree).map((file) => file.path);
}

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
