import { emptyLevel, layerOf, setTile, type Level } from './level';

/**
 * **Die Welt, mit der jede Welt anfängt** — eine kleine Lichtung wie am Anfang
 * einer alten Konsole: Gras, ein Weg, ein Teich mit Brücke, ein Haus mit Dach,
 * Bäume am Rand, ein paar Felsen und Kisten.
 *
 * Kein Kunstwerk, sondern ein Beleg: dass Boden, Dinge und Darüber drei Ebenen
 * sind, dass Wasser aufhält und eine Brücke darüber nicht, dass der Held unter
 * einer Baumkrone verschwindet. Wer etwas anderes will, malt es im Editor
 * darüber — und das bleibt dann (`level.saveLevel`).
 */
export function sampleLevel(id: string, name: string): Level {
  const cols = 40;
  const rows = 30;
  const level = emptyLevel(id, name, cols, rows);
  const ground = layerOf(level, 'ground')!;
  const objects = layerOf(level, 'objects')!;
  const overlay = layerOf(level, 'overlay')!;
  const put = (layer: typeof ground, col: number, row: number, tile: number): void => {
    setTile(level, layer, col, row, tile);
  };
  const fill = (
    layer: typeof ground,
    c0: number,
    r0: number,
    c1: number,
    r1: number,
    tile: number,
  ): void => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) put(layer, c, r, tile);
  };

  // Gras überall, mit dunklen Flecken und einer Blumenwiese.
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = Math.sin(c * 12.9898 + r * 78.233) * 43758.5453;
      put(ground, c, r, n - Math.floor(n) < 0.18 ? 2 : 1);
    }
  }
  fill(ground, 26, 4, 33, 9, 3);

  // Ein Weg von Süden zur Mitte und nach Osten zum Haus.
  fill(ground, 19, 16, 20, 29, 4);
  fill(ground, 19, 16, 30, 17, 4);
  fill(ground, 12, 14, 20, 15, 4);

  // Der Teich, mit Brücke.
  fill(ground, 6, 4, 13, 10, 6);
  fill(ground, 5, 6, 5, 8, 6);
  fill(ground, 14, 6, 14, 8, 6);
  fill(ground, 7, 3, 12, 3, 6);
  fill(ground, 7, 11, 12, 11, 6);
  fill(ground, 9, 3, 10, 12, 5);
  fill(objects, 9, 3, 10, 11, 18);

  // Sand ums Wasser.
  fill(ground, 4, 12, 15, 12, 5);
  fill(ground, 15, 4, 15, 11, 5);

  // Das Haus: Steinboden innen, Mauern drumherum, Tür nach Süden, Dach darüber.
  fill(ground, 26, 10, 33, 15, 7);
  fill(objects, 26, 10, 33, 10, 9);
  fill(objects, 26, 15, 33, 15, 9);
  fill(objects, 26, 11, 26, 14, 9);
  fill(objects, 33, 11, 33, 14, 9);
  put(objects, 30, 15, 15);
  fill(overlay, 26, 8, 33, 12, 16);
  fill(ground, 30, 16, 30, 16, 4);

  // Bäume am Rand, ein Wald im Nordosten.
  for (let c = 0; c < cols; c += 2) {
    put(objects, c, 0, 10);
    put(objects, c + 1, rows - 1, 10);
  }
  for (let r = 0; r < rows; r += 2) {
    put(objects, 0, r, 10);
    put(objects, cols - 1, r + 1, 10);
  }
  for (let r = 1; r < 7; r++) {
    for (let c = 34; c < 39; c++) {
      if ((c + r) % 2 === 0) put(objects, c, r, 10);
      else put(overlay, c, r, 17);
    }
  }

  // Felsen, Büsche, Kisten, ein Zaun.
  for (const [c, r] of [
    [4, 20],
    [5, 21],
    [23, 24],
    [36, 20],
    [37, 22],
  ]) {
    put(objects, c!, r!, 12);
  }
  for (const [c, r] of [
    [16, 22],
    [17, 23],
    [28, 22],
    [8, 16],
    [12, 26],
  ]) {
    put(objects, c!, r!, 11);
  }
  fill(objects, 22, 20, 22, 21, 14);
  fill(objects, 24, 12, 24, 13, 13);
  fill(objects, 12, 18, 16, 18, 13);

  level.spawn = { col: 20, row: 22 };
  return level;
}
