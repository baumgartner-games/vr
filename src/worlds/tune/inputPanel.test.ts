/**
 * Die Tafelwand: dass nichts vor etwas anderem steht, und dass man für sie
 * den Kopf nicht drehen muss.
 *
 * Beides war die Beschwerde, mit der diese Datei angefangen hat — „die Wand
 * ist zu groß, und die Werte überdecken sich".
 */
import { EYE, PANEL, PANEL_Z, overlap, panelRects, viewAngles } from './inputPanel';

/** So viel Luft muss zwischen zwei Rechtecken bleiben, in Metern. */
const GAP = 0.02;

describe('was auf der Tafelwand steht', () => {
  it('steht nebeneinander und nicht voreinander', () => {
    const rects = panelRects();
    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        expect(`${a.name} / ${b.name}: ${overlap(a.rect, b.rect).toFixed(3)}`).toBe(
          `${a.name} / ${b.name}: ${Math.min(overlap(a.rect, b.rect), -GAP).toFixed(3)}`,
        );
      }
    }
  });

  it('bleibt in einem Blickfeld, für das man den Kopf nicht dreht', () => {
    for (const { name, rect } of panelRects()) {
      for (const x of [rect.x - rect.width / 2, rect.x + rect.width / 2]) {
        for (const y of [rect.y - rect.height / 2, rect.y + rect.height / 2]) {
          const { azimuth, elevation } = viewAngles(x, y);
          expect(`${name} seitlich ${azimuth < 30}`).toBe(`${name} seitlich true`);
          expect(`${name} hoch ${elevation < 25 && elevation > -20}`).toBe(`${name} hoch true`);
        }
      }
    }
  });

  it('hängt in Lesenähe — gut zwei Meter, nicht vier', () => {
    expect(EYE.z - PANEL_Z).toBeGreaterThan(2);
    expect(EYE.z - PANEL_Z).toBeLessThan(2.5);
  });

  it('schreibt vier Zeilen groß genug, um sie von dort zu lesen', () => {
    // So rechnet `TextPlane`: die Leinwand ist 512 px breit, die Schrift wächst
    // mit der Tafel, und für den Fließtext bleiben 42 % der Höhe.
    const board = PANEL.board;
    const canvas = (512 * board.height) / board.width;
    const room = canvas * 0.42;
    const font = Math.min(Math.round(canvas * 0.13), room / (4 * 1.3));
    const metres = (font / 512) * board.width;
    const degrees = ((Math.atan2(metres, EYE.z - PANEL_Z) * 180) / Math.PI) * 1;
    // Ein volles Grad — auf einer Quest sind das rund zwanzig Bildpunkte. Die
    // alte Lage-Tafel kam an ihrer Wand auf ein halbes.
    expect(degrees).toBeGreaterThan(0.9);
  });
});
