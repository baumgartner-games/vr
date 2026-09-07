import { layoutSign, type LayoutOptions, type RunStyle } from './signLayout';
import { parseSign } from './signMarkup';

/**
 * Eine Schrift, die man nachrechnen kann: jedes Zeichen ist halb so breit wie
 * die Schrift hoch ist. Im Spiel misst die Leinwand, hier zählen wir — und
 * genau deshalb ist der Umbruch überhaupt prüfbar.
 */
function measure(text: string, style: RunStyle): number {
  return text.length * style.size * 0.5;
}

function options(extra: Partial<LayoutOptions> = {}): LayoutOptions {
  return { width: 100, fontSize: 10, measure, ...extra };
}

describe('layoutSign', () => {
  it('bricht um, wenn die Zeile nicht mehr passt', () => {
    // 20 Zeichen passen bei Breite 100 und Schrift 10 in eine Zeile.
    const blocks = parseSign('aaaa bbbb cccc dddd eeee ffff', { markdown: true });
    const layout = layoutSign(blocks, options());
    expect(layout.lines.length).toBeGreaterThan(1);
    for (const line of layout.lines) {
      const ink = line.runs.reduce(
        (sum, run) => sum + run.text.trim().length * run.style.size * 0.5,
        0,
      );
      expect(ink).toBeLessThanOrEqual(100.001);
    }
  });

  it('lässt ein einzelnes zu langes Wort stehen, statt es zu zerhacken', () => {
    const layout = layoutSign(
      parseSign('https://beispiel.test/eine/sehr/lange/adresse', {}),
      options(),
    );
    expect(layout.lines).toHaveLength(1);
    expect(layout.lines[0]!.runs[0]!.text).toContain('adresse');
  });

  it('stapelt die Zeilen ohne Überlappung und meldet die Gesamthöhe', () => {
    const layout = layoutSign(parseSign('eins\nzwei\ndrei', {}), options());
    let bottom = 0;
    for (const line of layout.lines) {
      expect(line.y).toBeGreaterThanOrEqual(bottom - 1e-9);
      bottom = line.y + line.height;
    }
    expect(layout.height).toBeCloseTo(bottom);
  });

  it('macht Überschriften größer als den Fließtext', () => {
    const heading = layoutSign(parseSign('# Titel', { markdown: true }), options());
    const text = layoutSign(parseSign('Titel', { markdown: true }), options());
    expect(heading.lines[0]!.height).toBeGreaterThan(text.lines[0]!.height);
  });

  it('setzt den Punkt einer Aufzählung links vor den eingerückten Text', () => {
    const layout = layoutSign(parseSign('- Milch', { markdown: true }), options());
    const [marker, word] = layout.lines[0]!.runs;
    expect(marker!.text).toBe('•');
    expect(marker!.x).toBeLessThan(word!.x);
  });

  it('gibt einem Bild seinen Platz und begrenzt seine Höhe', () => {
    const blocks = parseSign('![hoch](bild.png)', { markdown: true });
    // Ein sehr hohes Bild: die Höhe wird gedeckelt, die Breite folgt.
    const layout = layoutSign(blocks, options({ imageAspect: () => 0.2 }));
    const image = layout.lines[0]!.image!;
    expect(image.height).toBeLessThanOrEqual(100 * 0.62 + 1e-9);
    expect(image.width).toBeCloseTo(image.height * 0.2);
  });

  it('zentriert, wenn es zentriert werden soll', () => {
    const left = layoutSign(parseSign('kurz', {}), options());
    const centre = layoutSign(parseSign('kurz', {}), options({ align: 'center' }));
    expect(centre.lines[0]!.runs[0]!.x).toBeGreaterThan(left.lines[0]!.runs[0]!.x);
  });

  it('ist bei leerem Text leer und null hoch', () => {
    expect(layoutSign([], options())).toEqual({ lines: [], height: 0 });
  });
});
