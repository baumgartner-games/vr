import { catalogSearch, type CatalogRow } from './catalogSearch';

const row = (key: string, name: string, words: string): CatalogRow<string> => ({
  key,
  name,
  words,
  entry: `${words}:${key}`,
});

const ROWS: CatalogRow<string>[] = [
  row('element:counter', 'Arbeitsplatte', 'Restaurant Pizza counter'),
  row('element:crate-cheese', 'Käsekiste', 'Restaurant Burger crate-cheese'),
  row('element:crate-cheese', 'Käsekiste', 'Restaurant Vorräte crate-cheese'),
  row('element:pizza-supply', 'Pizza-Vorratsbox', 'Restaurant Pizza pizza-supply'),
  row('model:prototype-bits/Wall_Half.glb', 'Wall Half', 'Haus Wände prototype-bits/Wall_Half.glb'),
];

describe('catalogSearch', () => {
  it('findet nichts ohne Suchbegriff', () => {
    expect(catalogSearch(ROWS, '')).toEqual([]);
    expect(catalogSearch(ROWS, '  ')).toEqual([]);
  });

  it('findet mit und ohne Umlaut, und dasselbe Möbel nur einmal', () => {
    expect(catalogSearch(ROWS, 'käse')).toEqual([
      'Restaurant Burger crate-cheese:element:crate-cheese',
    ]);
    expect(catalogSearch(ROWS, 'kase')).toHaveLength(1);
  });

  it('zählt die Ordner aller Kacheln eines Möbels mit', () => {
    expect(catalogSearch(ROWS, 'vorräte käse')).toHaveLength(1);
    expect(catalogSearch(ROWS, 'burger käse')).toHaveLength(1);
    expect(catalogSearch(ROWS, 'pizza käse')).toEqual([]);
  });

  it('stellt Treffer im Namen vor Treffer im Ordner', () => {
    const hits = catalogSearch(ROWS, 'pizza');
    expect(hits[0]).toContain('pizza-supply');
    expect(hits[1]).toContain('counter');
  });

  it('findet englisch über Id und Adresse, und deutsch über das Wörterbuch des Regals', () => {
    expect(catalogSearch(ROWS, 'cheese')).toHaveLength(1);
    expect(catalogSearch(ROWS, 'wall')).toHaveLength(1);
    expect(catalogSearch(ROWS, 'kiste').some((hit) => hit.includes('crate-cheese'))).toBe(true);
  });

  it('hält sich an die Grenze', () => {
    expect(catalogSearch(ROWS, 'restaurant', 2)).toHaveLength(2);
  });
});
