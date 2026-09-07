import { parseInline, parseSign, signSummary, MAX_SIGN_CHARS } from './signMarkup';

describe('parseSign', () => {
  it('lässt ohne Markdown jede Zeile stehen, wie sie getippt wurde', () => {
    const blocks = parseSign('# kein Titel\n* kein Punkt', {});
    expect(blocks).toEqual([
      { kind: 'text', runs: [{ text: '# kein Titel' }] },
      { kind: 'text', runs: [{ text: '* kein Punkt' }] },
    ]);
  });

  it('macht aus einer Leerzeile eine Lücke und nicht aus Versehen einen Absatz', () => {
    expect(parseSign('a\n\nb', { markdown: true }).map((b) => b.kind)).toEqual([
      'text',
      'gap',
      'text',
    ]);
  });

  it('kennt die drei Überschriften', () => {
    const blocks = parseSign('# eins\n## zwei\n### drei', { markdown: true });
    expect(blocks.map((b) => (b.kind === 'heading' ? b.level : b.kind))).toEqual([1, 2, 3]);
  });

  it('macht Aufzählungen mit Punkt und mit Nummer', () => {
    const blocks = parseSign('- Milch\n* Brot\n1. zuerst', { markdown: true });
    expect(blocks.map((b) => (b.kind === 'list' ? b.marker : b.kind))).toEqual(['•', '•', '1.']);
  });

  it('erkennt Trennlinie, Zitat und Bild', () => {
    const blocks = parseSign('---\n> gesagt\n![Karte](https://example.test/karte.png)', {
      markdown: true,
    });
    expect(blocks[0]).toEqual({ kind: 'rule' });
    expect(blocks[1]!.kind).toBe('quote');
    expect(blocks[2]).toEqual({
      kind: 'image',
      alt: 'Karte',
      url: 'https://example.test/karte.png',
    });
  });

  it('deutet im Codeblock nichts mehr — dafür ist er da', () => {
    const blocks = parseSign('```\n# nur Text\n```', { markdown: true });
    expect(blocks).toEqual([{ kind: 'code', text: '# nur Text' }]);
  });

  it('nimmt nicht mehr Zeichen an, als ein Schild tragen kann', () => {
    const blocks = parseSign('x'.repeat(MAX_SIGN_CHARS + 500), { markdown: true });
    const length = blocks.reduce(
      (sum, block) => sum + (block.kind === 'text' ? block.runs[0]!.text.length : 0),
      0,
    );
    expect(length).toBe(MAX_SIGN_CHARS);
  });
});

describe('parseInline', () => {
  it('liest fett, kursiv, Code und Link', () => {
    expect(parseInline('**a** *b* `c` [d](e)')).toEqual([
      { text: 'a', bold: true },
      { text: ' ' },
      { text: 'b', italic: true },
      { text: ' ' },
      { text: 'c', code: true },
      { text: ' ' },
      { text: 'd', link: 'e' },
    ]);
  });

  it('lässt ein einzelnes Sternchen ein Sternchen sein', () => {
    expect(parseInline('3 * 4 = 12')).toEqual([{ text: '3 * 4 = 12' }]);
  });

  it('gibt für eine leere Zeile ein leeres Stück zurück statt gar nichts', () => {
    expect(parseInline('')).toEqual([{ text: '' }]);
  });
});

describe('signSummary', () => {
  it('nimmt die erste Zeile mit Inhalt, ohne ihre Zeichen', () => {
    expect(signSummary('\n\n## Willkommen\nmehr')).toBe('Willkommen');
  });

  it('kürzt lange Zeilen', () => {
    expect(signSummary('x'.repeat(80), 10)).toBe(`${'x'.repeat(9)}…`);
  });
});
