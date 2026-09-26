import { generateHouse, spacesOf } from '../house';
import { wallSegments } from '../map/geometry';
import { BLUEPRINT } from './blueprint';
import { BLUEPRINT_COLOURS, blueprintPixel, blueprintSvg } from './blueprintDrawing';

describe('Die Grundriss-Vorlage aus dem gebauten Grundriss', () => {
  const spec = generateHouse(1, 14);
  const svg = blueprintSvg(spec);

  it('rechnet Meter in Pixel der Vorlage — 20 Pixel je Meter ab dem Anker', () => {
    expect(blueprintPixel(-34, -52)).toEqual({ px: 52, py: 36.2 });
    const next = blueprintPixel(-33, -50);
    expect(next.px).toBeCloseTo(72);
    expect(next.py).toBeCloseTo(76.2);
  });

  it('ist so groß wie die Vorlage und durchsichtig, solange kein Hintergrund verlangt ist', () => {
    expect(svg).toContain(`width="${BLUEPRINT.width}" height="${BLUEPRINT.height}"`);
    expect(svg).not.toContain('<rect');
    expect(blueprintSvg(spec, { background: '#000' })).toContain('<rect');
  });

  it('zeichnet jeden Raum und jeden Gang als eigene Fläche, Gänge grün getönt', () => {
    const polygons = svg.match(/<polygon /g) ?? [];
    expect(polygons).toHaveLength(spacesOf(spec).length);
    const passages = svg.split(BLUEPRINT_COLOURS.passage).length - 1;
    expect(passages).toBe(spec.passages?.length ?? 0);
  });

  it('zeichnet jede Wandstrecke — und alles liegt innerhalb des Bildes', () => {
    const walls = wallSegments(spec).filter((segment) => segment.kind === 'wall');
    const moves = svg.match(/M[-\d.]+ [-\d.]+L[-\d.]+ [-\d.]+/g) ?? [];
    expect(moves.length).toBeGreaterThanOrEqual(walls.length);
    for (const move of moves) {
      const [x1, y1, x2, y2] = move.match(/-?[\d.]+/g)!.map(Number);
      for (const x of [x1!, x2!]) expect(x >= 0 && x <= BLUEPRINT.width).toBe(true);
      for (const y of [y1!, y2!]) expect(y >= 0 && y <= BLUEPRINT.height).toBe(true);
    }
  });
});
