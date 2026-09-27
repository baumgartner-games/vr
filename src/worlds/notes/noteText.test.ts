import { cleanNoteText, fitNote, NOTE_MAX_CHARS, wrapNote } from './noteText';

/** Jeder Buchstabe gleich breit: `size` Pixel bei `size`. */
const letters = (text: string, size = 10): number => text.length * size;

describe('noteText', () => {
  it('tidies what was typed: edges, runs of spaces, empty lines, length', () => {
    expect(cleanNoteText('  Kartoffel   Vorrat \r\n\r\n\r\n\r\n hier  ')).toBe(
      'Kartoffel Vorrat\n\nhier',
    );
    expect(cleanNoteText(' \n \t ')).toBe('');
    expect(cleanNoteText('x'.repeat(NOTE_MAX_CHARS + 50))).toHaveLength(NOTE_MAX_CHARS);
  });

  it('wraps word by word and keeps the lines the writer typed', () => {
    expect(wrapNote('Kartoffel Vorrat hier\nlinks', 100, (part) => letters(part))).toEqual([
      'Kartoffel',
      'Vorrat',
      'hier',
      'links',
    ]);
    expect(wrapNote('ab cd ef', 50, (part) => letters(part))).toEqual(['ab cd', 'ef']);
  });

  it('splits a word that is wider than the line on its own', () => {
    expect(wrapNote('Kartoffelvorrat', 60, (part) => letters(part))).toEqual([
      'Kartof',
      'felvor',
      'rat',
    ]);
  });

  it('takes the largest type that fits, and cuts with an ellipsis at the smallest', () => {
    const box = { width: 400, height: 200 };
    const big = fitNote('Kasse', box, letters, { max: 120, min: 28 });
    expect(big.lines).toEqual(['Kasse']);
    // Fünf Buchstaben passen bei 80 in 400 Pixel, und eine Zeile in 200.
    expect(big.size).toBe(80);
    const long = fitNote('wort '.repeat(80), box, letters, { max: 120, min: 28 });
    expect(long.size).toBe(28);
    expect(long.lines.length * 28 * 1.15).toBeLessThanOrEqual(200);
    expect(long.lines[long.lines.length - 1]!.endsWith('…')).toBe(true);
  });
});
