import { COMIC_INK, comicPixels } from './toolIcons';

/**
 * Die Bildrechnung hinter den Werkzeug-Icons — ohne WebGL prüfbar, und
 * genau deshalb steht sie getrennt vom Renderer: Ob eine Kontur um die
 * Silhouette liegt und ob aus einem Verlauf Stufen werden, sieht man einem
 * Icon im Knopf nicht an, bevor es schiefgeht.
 */

/** Ein Bild aus einer Funktion `(x, y) -> [r,g,b,a]`. */
function image(
  size: number,
  paint: (x: number, y: number) => readonly [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = paint(x, y);
      const i = (y * size + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  return data;
}

function at(data: Uint8ClampedArray, size: number, x: number, y: number): number[] {
  const i = (y * size + x) * 4;
  return [data[i]!, data[i + 1]!, data[i + 2]!, data[i + 3]!];
}

describe('Der Comic-Stil der Werkzeug-Icons', () => {
  it('macht aus einem weichen Verlauf wenige Stufen', () => {
    const size = 16;
    // Ein Verlauf über die ganze Breite, überall deckend.
    const data = image(size, (x) => [Math.round((x / (size - 1)) * 255), 0, 0, 255]);
    comicPixels(data, size, size, { steps: 4, outline: 0 });
    const tones = new Set<number>();
    for (let x = 0; x < size; x++) tones.add(at(data, size, x, 8)[0]!);
    expect(tones.size).toBe(4);
    // Voll ausgesteuert: die dunkelste Stufe ist Schwarz, die hellste Weiß.
    expect(Math.min(...tones)).toBe(0);
    expect(Math.max(...tones)).toBe(255);
  });

  it('legt die Kontur nach innen um die Silhouette und lässt die Fläche in Ruhe', () => {
    const size = 21;
    const centre = 10;
    // Eine gefüllte Scheibe in der Mitte, alles andere Luft.
    const data = image(size, (x, y) =>
      Math.hypot(x - centre, y - centre) <= 7 ? [200, 200, 200, 255] : [0, 0, 0, 0],
    );
    comicPixels(data, size, size, { steps: 4, outline: 2 });
    // Der Rand der Scheibe trägt Tinte …
    expect(at(data, size, centre, centre - 6).slice(0, 3)).toEqual([...COMIC_INK]);
    // … die Mitte nicht.
    expect(at(data, size, centre, centre).slice(0, 3)).not.toEqual([...COMIC_INK]);
    // Luft bleibt Luft: die Kontur wächst nicht über die Silhouette hinaus.
    expect(at(data, size, 0, 0)[3]).toBe(0);
  });

  it('kennt kein Halbdurchsichtig — entweder Fläche oder Luft', () => {
    const size = 4;
    const data = image(size, (x) => [120, 120, 120, x < 2 ? 40 : 255]);
    comicPixels(data, size, size, { steps: 3, outline: 0, alpha: 96 });
    expect(at(data, size, 0, 0)[3]).toBe(0);
    expect(at(data, size, 3, 0)[3]).toBe(255);
  });

  it('umrandet auch eine Fläche, die bis an den Bildrand reicht', () => {
    const size = 8;
    const data = image(size, () => [220, 220, 220, 255]);
    comicPixels(data, size, size, { steps: 4, outline: 1 });
    expect(at(data, size, 0, 0).slice(0, 3)).toEqual([...COMIC_INK]);
    expect(at(data, size, 4, 4).slice(0, 3)).not.toEqual([...COMIC_INK]);
  });
});
