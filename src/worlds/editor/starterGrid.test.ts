import { flowField } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { TILE, keyX, keyZ, tileKey } from '../nav/navTile';
import { solidBounds } from '../grid/solids';
import { starterGrid } from './starterGrid';

/**
 * **Das Startzimmer des Bauplatzes** — acht mal acht Kacheln, und damit acht
 * Meter im Quadrat.
 *
 * Geprüft wird das, was man sonst erst merkt, wenn man darin steht: dass das
 * Zimmer die Größe hat, die es haben soll, dass alles darin auf seiner Kachel
 * bleibt, und dass man von jeder Ecke zu jeder anderen kommt. Ein Startzimmer,
 * in dem eine Küchenzeile den Weg zumauert, ist der erste Eindruck, den der
 * Bauplatz macht.
 */
describe('Das Startzimmer', () => {
  const plan = starterGrid();

  it('ist acht mal acht Kacheln groß', () => {
    expect(plan.graph.size).toBe(64);
    const box = solidBounds(plan.solids().filter((one) => one.kind === 'floor'))!;
    expect(box.maxX - box.minX).toBeCloseTo(8 * TILE);
    expect(box.maxZ - box.minZ).toBeCloseTo(8 * TILE);
    // Es steht symmetrisch um die Null, damit der Startpunkt darin liegt.
    expect(box.minX).toBeCloseTo(-4 * TILE);
  });

  it('hat genau eine Tür, und die steht in der Südwand', () => {
    const doors = [...plan.graph.doorIds()];
    expect(doors).toHaveLength(1);
    expect(plan.graph.door(doors[0]!)?.open).toBe(true);
  });

  /**
   * Die zweite Frage, die jeder hat: *Was kann ich hier hineinstellen?* Ohne
   * Möbel sähe die zweite Reihe der Palette aus wie eine Reihe Knöpfe, von
   * denen niemand weiß, wofür sie da sind.
   */
  it('stellt eine Küche hinein, und die steht auf ihren eigenen Kacheln', () => {
    const kinds = plan.blocks().map((one) => one.kind);
    expect(kinds).toContain('counter');
    expect(kinds).toContain('shelf');
    expect(kinds).toContain('table');
    for (const one of plan.blocks()) {
      expect(keyX(one.tile)).toBeGreaterThanOrEqual(-4);
      expect(keyX(one.tile)).toBeLessThanOrEqual(3);
      expect(keyZ(one.tile)).toBeGreaterThanOrEqual(-4);
      expect(keyZ(one.tile)).toBeLessThanOrEqual(3);
    }
  });

  /**
   * **Kein Dach**, und das ist hier keine Kleinigkeit: Von oben sieht man in
   * ein gedeckeltes Zimmer nicht hinein, und der Bauplatz ist die Welt, in der
   * man von oben baut.
   */
  it('baut keine Decke', () => {
    expect(plan.masses()).toHaveLength(0);
  });

  it('lässt jede Kachel vom Startplatz aus erreichen', () => {
    // Der Startpunkt der Welt liegt auf der südlichsten Kachelreihe
    // (`EditorWorld.spawnPoint`); von dort muss man überall hinkommen, auch
    // an der Küchenzeile vorbei.
    const field = flowField(plan.graph, [tileKey(0, 3, 0)], { profile: HUMAN_PROFILE });
    for (const key of plan.graph.tileKeys()) expect(field.cost.has(key)).toBe(true);
  });
});
