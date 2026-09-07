import { GridPlan } from '../grid/gridPlan';
import { DIR_E, DIR_N, DIR_S, DIR_W, NO_TILE, keyX, keyZ, tileKey } from '../nav/navTile';
import { applySpots, areaSpots, strokeSpots, wantsEdge } from './planPaint';
import type { PlanSpot } from './levelPlan';

/** Eine Kachel als Zeigepunkt — ohne Kante, wenn nichts anderes dabeisteht. */
function at(x: number, z: number, dir: PlanSpot['dir'] = null, level = 0): PlanSpot {
  return { tile: tileKey(x, z, level), dir };
}

/** Die Kachelkoordinaten einer Liste von Zeigepunkten, zum Vergleichen. */
function tiles(spots: readonly PlanSpot[]): string[] {
  return spots.map((spot) => `${keyX(spot.tile)},${keyZ(spot.tile)}`);
}

describe('was an eine Kante gehört', () => {
  it('kennt Wand und Tür als Kantenwerkzeuge', () => {
    expect(wantsEdge('wall')).toBe(true);
    expect(wantsEdge('door')).toBe(true);
  });

  it('kennt Küchenzeile und Geländer als Kantenwerkzeuge, den Tisch nicht', () => {
    expect(wantsEdge('counter')).toBe(true);
    expect(wantsEdge('railing')).toBe(true);
    expect(wantsEdge('table')).toBe(false);
  });

  it('setzt Boden und Radiergummi auf die Kachel', () => {
    expect(wantsEdge('floor')).toBe(false);
    expect(wantsEdge('erase')).toBe(false);
  });
});

describe('ein Strich über den Grundriss', () => {
  it('fängt mit der Kachel an, auf die zuerst gezeigt wird', () => {
    expect(tiles(strokeSpots(null, at(2, 3)))).toEqual(['2,3']);
  });

  /**
   * Der eigentliche Zweck: Eine Hand fährt in einem Bild über mehrere
   * Kacheln, und dazwischen darf kein Loch bleiben.
   */
  it('füllt die Lücke zwischen zwei Bildern', () => {
    expect(tiles(strokeSpots(at(0, 0), at(4, 0)))).toEqual(['1,0', '2,0', '3,0', '4,0']);
  });

  it('läuft auch schräg ohne Lücke — jeder Schritt eine Kachel', () => {
    expect(tiles(strokeSpots(at(0, 0), at(3, 3)))).toEqual(['1,1', '2,2', '3,3']);
  });

  it('lässt den Startpunkt weg — der ist schon gesetzt', () => {
    expect(tiles(strokeSpots(at(1, 1), at(1, 1)))).toEqual(['1,1']);
  });

  /**
   * **Die Kante gilt für den ganzen Strich.** Wer eine Wand entlangmalt, zeigt
   * auf Nordkanten; sie aus jeder Zwischenkachel neu zu raten stellte an jedem
   * zweiten Schritt eine Wand quer.
   */
  it('nimmt die Himmelsrichtung des Ziels für jede Kachel mit', () => {
    const spots = strokeSpots(at(0, 0, DIR_N), at(3, 0, DIR_N));
    expect(spots).toHaveLength(3);
    for (const spot of spots) expect(spot.dir).toBe(DIR_N);
  });

  it('springt nicht über Etagen hinweg', () => {
    const spots = strokeSpots(at(0, 0, null, 0), at(4, 0, null, 1));
    expect(tiles(spots)).toEqual(['4,0']);
  });

  it('malt nichts, wenn das Ziel keine Kachel ist', () => {
    expect(strokeSpots(at(0, 0), { tile: NO_TILE, dir: null })).toEqual([]);
  });
});

describe('eine Fläche zwischen zwei Ecken', () => {
  it('füllt beim Boden das ganze Rechteck', () => {
    const spots = areaSpots('floor', at(0, 0), at(2, 1));
    expect(tiles(spots)).toEqual(['0,0', '1,0', '2,0', '0,1', '1,1', '2,1']);
    for (const spot of spots) expect(spot.dir).toBeNull();
  });

  it('nimmt die Ecken in jeder Reihenfolge', () => {
    expect(tiles(areaSpots('floor', at(2, 1), at(0, 0)))).toEqual(
      tiles(areaSpots('floor', at(0, 0), at(2, 1))),
    );
  });

  /**
   * **Die Ecke ist immer eine Kachel.** Ein Rechteck, dessen Ecke je nach
   * getroffener Fuge um eine Kachel springt, bekommt man nicht zweimal gleich
   * hin.
   */
  it('lässt sich von einer getroffenen Kante nicht verschieben', () => {
    expect(tiles(areaSpots('floor', at(0, 0, DIR_W), at(1, 1, DIR_S)))).toEqual([
      '0,0',
      '1,0',
      '0,1',
      '1,1',
    ]);
  });

  /**
   * **Ein Rechteck aus Wänden ist ein Zimmer und kein Klotz.** Und die Kanten
   * zeigen nach außen — sonst wären die Randkacheln unbetretbar.
   */
  it('zieht bei der Wand nur den Rand, nach außen gerichtet', () => {
    const spots = areaSpots('wall', at(0, 0), at(2, 2));
    const north = spots.filter((spot) => spot.dir === DIR_N);
    const south = spots.filter((spot) => spot.dir === DIR_S);
    const west = spots.filter((spot) => spot.dir === DIR_W);
    const east = spots.filter((spot) => spot.dir === DIR_E);
    expect(tiles(north)).toEqual(['0,0', '1,0', '2,0']);
    expect(tiles(south)).toEqual(['0,2', '1,2', '2,2']);
    expect(tiles(west)).toEqual(['0,0', '0,1', '0,2']);
    expect(tiles(east)).toEqual(['2,0', '2,1', '2,2']);
    // Die Mitte bleibt frei: Sie ist das Zimmer.
    expect(tiles(spots)).not.toContain('1,1');
  });

  it('gibt einem Baustein die Blickrichtung der zweiten Ecke', () => {
    const spots = areaSpots('table', at(0, 0, DIR_N), at(1, 0, DIR_E));
    expect(spots).toHaveLength(2);
    for (const spot of spots) expect(spot.dir).toBe(DIR_E);
  });

  it('füllt über Etagen hinweg nichts', () => {
    expect(areaSpots('floor', at(0, 0, null, 0), at(2, 2, null, 1))).toEqual([]);
  });
});

describe('viele Handgriffe als einer', () => {
  it('legt eine ganze Fläche Boden und zählt sie', () => {
    const plan = new GridPlan();
    const edit = applySpots(plan, 'floor', areaSpots('floor', at(0, 0), at(3, 3)));
    expect(edit.changed).toBe(true);
    expect(edit.count).toBe(16);
    expect(edit.says).toContain('16');
    expect(plan.graph.has(tileKey(2, 2, 0))).toBe(true);
  });

  it('zählt nur, was sich wirklich geändert hat', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 });
    const edit = applySpots(plan, 'floor', areaSpots('floor', at(0, 0), at(2, 1)));
    // Vier Kacheln standen schon, zwei kommen dazu.
    expect(edit.count).toBe(2);
  });

  it('sagt einmal ohne Zahl, wenn nur eine Stelle etwas wird', () => {
    const plan = new GridPlan();
    const edit = applySpots(plan, 'floor', [at(0, 0)]);
    expect(edit.says).toBe('Boden');
  });

  /**
   * Eine Wand ins Leere ändert nichts — und dann ist die Auskunft der letzten
   * Stelle das Einzige, was weiterhilft.
   */
  it('behält die Auskunft, wenn nichts entstanden ist', () => {
    const plan = new GridPlan();
    const edit = applySpots(plan, 'counter', [at(0, 0, DIR_N)]);
    expect(edit.changed).toBe(false);
    expect(edit.says).toContain('Boden');
  });

  /**
   * **Ein Zimmer in zwei Gesten**: eine Fläche Boden, ein Rechteck Wände.
   * Das ist der Grund, warum es diese Datei gibt.
   */
  it('macht aus zwei Gesten ein Zimmer', () => {
    const plan = new GridPlan();
    applySpots(plan, 'floor', areaSpots('floor', at(0, 0), at(4, 4)));
    const walls = applySpots(plan, 'wall', areaSpots('wall', at(0, 0), at(4, 4)));
    expect(walls.count).toBe(20);
    expect(plan.graph.wall(tileKey(0, 0, 0), DIR_N)?.kind).toBe('solid');
    expect(plan.graph.wall(tileKey(2, 2, 0), DIR_N)).toBeUndefined();
  });
});
