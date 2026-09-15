import { signRows } from './signRows';

/**
 * **Der Aushang eines Schildes als Menüseite.**
 *
 * Geprüft wird das, was man ohne Brille nicht sieht: dass aus Markdown Zeilen
 * werden, dass Leerzeilen keine leeren Knöpfe hinterlassen und dass jede Zeile
 * ihre eigene Kennung behält — zwei Zeilen mit derselben Id sind im Menü eine
 * Zeile, die bei jedem Neuzeichnen springt (`ui/PageMenu.render`).
 */
describe('Ein Schild als Menüseite', () => {
  const ACCENT = 0xe4c56a;

  it('macht aus Überschrift, Absatz und Aufzählung je eine Zeile', () => {
    const rows = signRows('# Hausordnung\n\nBitte leise.\n\n- Schuhe aus\n- Licht aus', ACCENT);
    expect(rows.map((row) => row.label)).toEqual([
      'Hausordnung',
      'Bitte leise.',
      '• Schuhe aus',
      '• Licht aus',
    ]);
    // Die erste Ebene trägt Farbe und Ikone, der Rest nicht.
    expect(rows[0]!.icon).toBe('sign');
    expect(rows[0]!.accent).toBe(ACCENT);
    expect(rows[1]!.icon).toBeUndefined();
  });

  it('lässt Leerzeilen weg und behält jede Kennung für sich', () => {
    const rows = signRows('Eins\n\n\nZwei', ACCENT);
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((row) => row.id)).size).toBe(2);
  });

  it('nummeriert eine nummerierte Liste mit ihren eigenen Zahlen', () => {
    const rows = signRows('1. Erst dies\n2. Dann das', ACCENT);
    expect(rows.map((row) => row.label)).toEqual(['1. Erst dies', '2. Dann das']);
  });

  it('zeigt ein Zitat in Anführungszeichen und eine Trennlinie als Strich', () => {
    const rows = signRows('> Achtung\n\n---', ACCENT);
    expect(rows.map((row) => row.label)).toEqual(['„Achtung"', '———']);
  });

  it('schreibt die Adresse eines Links unter seine Zeile', () => {
    const rows = signRows('Mehr dazu [hier](https://example.test/x)', ACCENT);
    expect(rows[0]!.label).toBe('Mehr dazu hier');
    expect(rows[0]!.sub).toBe('https://example.test/x');
  });

  it('nennt ein Bild bei seiner Beschriftung — eine Zeile kann es nicht zeigen', () => {
    const rows = signRows('![Der Plan](bild.png)', ACCENT);
    expect(rows[0]!.label).toBe('Der Plan');
    expect(rows[0]!.sub).toBe('bild.png');
  });

  it('nimmt ohne Markdown jede Zeile, wie sie getippt wurde', () => {
    const rows = signRows('# kein Titel\n- kein Punkt', ACCENT, false);
    expect(rows.map((row) => row.label)).toEqual(['# kein Titel', '- kein Punkt']);
  });

  it('sagt bei einem leeren Schild, dass nichts daraufsteht', () => {
    expect(signRows('   ', ACCENT).map((row) => row.label)).toEqual(['(nichts darauf)']);
  });
});
