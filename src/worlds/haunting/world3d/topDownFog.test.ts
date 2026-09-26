import { cutAt, cutOf, generateHouse, roomAt, roomTiles, spacesOf } from '../house';
import { PLAN_WALL_H } from '../../editor/levelPlan';
import { LID_OUTSET, LID_TOP, lidCovers, lidGeometry, lidPieces } from './topDownFog';

describe('Deckel von oben (lidPieces)', () => {
  const spec = generateHouse(1, 14);
  const spaces = spacesOf(spec);
  const lids = new Map(spaces.map((space) => [space.id, lidPieces(spec, space)]));

  it('deckt jede Kachel des eigenen Raums und keine eines anderen', () => {
    for (const space of spaces) {
      const own = lids.get(space.id)!;
      for (const tile of roomTiles(space)) {
        const cut = cutAt(space, tile.x, tile.z);
        // Die Mitte einer Schrägkachel liegt auf der Wand; dort die innere Hälfte.
        const corner = cut ? cutOf(space, tile.x, tile.z)!.corner : null;
        const ix = corner === 'nw' || corner === 'sw' ? 0.25 : corner ? -0.25 : 0;
        const iz = corner === 'nw' || corner === 'ne' ? 0.25 : corner ? -0.25 : 0;
        const at = { x: tile.x + 0.5 + ix, z: tile.z + 0.5 + iz };
        expect(lidCovers(own, at)).toBe(true);
        for (const other of spaces)
          if (other.id !== space.id) expect(lidCovers(lids.get(other.id)!, at)).toBe(false);
      }
    }
  });

  it('endet zwischen zwei Räumen auf der Wandmitte und reicht nach draußen über die Wand', () => {
    let shared = 0,
      outside = 0;
    for (const space of spaces) {
      const own = lids.get(space.id)!;
      for (const tile of roomTiles(space)) {
        if (cutAt(space, tile.x, tile.z) !== null) continue;
        const sides = [
          { dx: 0, dz: -1 },
          { dx: 1, dz: 0 },
          { dx: 0, dz: 1 },
          { dx: -1, dz: 0 },
        ];
        for (const side of sides) {
          const next = roomAt(spec, tile.x + side.dx, tile.z + side.dz);
          if (next?.id === space.id) continue;
          // Knapp hinter der Fuge, in der Mitte der Kante.
          const beyond = (d: number) => ({
            x: tile.x + 0.5 + side.dx * (0.5 + d),
            z: tile.z + 0.5 + side.dz * (0.5 + d),
          });
          if (next) {
            shared++;
            expect(lidCovers(own, beyond(0.02))).toBe(false);
          } else {
            outside++;
            expect(lidCovers(own, beyond(LID_OUTSET - 0.02))).toBe(true);
          }
        }
      }
    }
    expect(shared).toBeGreaterThan(20);
    expect(outside).toBeGreaterThan(20);
  });

  it('trägt über einer Schräge nur die innere Hälfte', () => {
    let slopes = 0;
    for (const space of spaces) {
      const own = lids.get(space.id)!;
      for (const tile of roomTiles(space)) {
        const cut = cutOf(space, tile.x, tile.z);
        if (!cutAt(space, tile.x, tile.z) || !cut) continue;
        slopes++;
        const cx = cut.corner === 'nw' || cut.corner === 'sw' ? tile.x : tile.x + 1;
        const cz = cut.corner === 'nw' || cut.corner === 'ne' ? tile.z : tile.z + 1;
        // Die Ecke hinter der Schräge bleibt frei …
        const toward = { x: (tile.x + 0.5 + cx) / 2, z: (tile.z + 0.5 + cz) / 2 };
        expect(lidCovers(own, toward)).toBe(false);
        // … bis auf den Streifen über der Wand.
        const wall = {
          x: tile.x + 0.5 + Math.sign(cx - tile.x - 0.5) * 0.05,
          z: tile.z + 0.5 + Math.sign(cz - tile.z - 0.5) * 0.05,
        };
        expect(lidCovers(own, wall)).toBe(true);
      }
    }
    expect(slopes).toBeGreaterThan(10);
  });

  it('ist nur knapp höher als die Wand: Dach oben, Seiten darunter', () => {
    expect(LID_TOP).toBeGreaterThan(PLAN_WALL_H);
    expect(LID_TOP - PLAN_WALL_H).toBeLessThanOrEqual(0.05);
    const geometry = lidGeometry(lids.get(spaces[0]!.id)!);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeCloseTo(LID_TOP);
    expect(geometry.boundingBox!.min.y).toBeLessThanOrEqual(0);
    // Gruppe 0 ist das Dach (alles auf LID_TOP), Gruppe 1 die Seiten.
    const [roof, sides] = geometry.groups;
    const y = geometry.getAttribute('position');
    for (let i = roof!.start; i < roof!.start + roof!.count; i++)
      expect(y.getY(i)).toBeCloseTo(LID_TOP);
    expect(sides!.count).toBeGreaterThan(0);
    // Das Dach zeigt nach oben (einseitig gezeichnet — sonst fehlt es im Bild).
    geometry.computeVertexNormals();
    const normal = geometry.getAttribute('normal');
    // (Ein zu Null geschnittenes Dreieck an einer Schräge hat keine Normale.)
    for (let i = roof!.start; i < roof!.start + roof!.count; i++)
      expect(normal.getY(i)).toBeGreaterThan(-1e-6);
    expect(geometry.getAttribute('uv').count).toBe(y.count);
  });
});
