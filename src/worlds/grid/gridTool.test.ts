import { spotAt } from '../editor/levelPlan';
import { DIR_N, DIR_S, TILE, tileKey } from '../nav/navTile';
import { GridPlan } from './gridPlan';
import { PALETTE_BLOCKS, applyGridTool, gridToolSpec, isBlockTool } from './gridTool';

function room(): GridPlan {
  return new GridPlan().room({ x: 0, z: 0, w: 3, d: 3 });
}

/** Die Mitte der Kachel (x, z) in Metern. */
function middle(x: number, z: number): [number, number] {
  return [(x + 0.5) * TILE, (z + 0.5) * TILE];
}

describe('Bausteine setzen', () => {
  it('erkennt Bausteine an ihrem Namen', () => {
    expect(isBlockTool('counter')).toBe(true);
    expect(isBlockTool('floor')).toBe(false);
    expect(isBlockTool('erase')).toBe(false);
  });

  it('setzt einen Tisch mitten auf die Kachel, auf die gezeigt wird', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    const edit = applyGridTool(plan, 'table', spotAt(x, z));
    expect(edit.changed).toBe(true);
    expect(plan.blocksOn(tileKey(1, 1, 0))).toHaveLength(1);
  });

  /**
   * **Was an eine Wand gehört, will eine Kante** — und sagt es, wenn keine
   * angegeben ist. Eine geratene Küchenzeile steht in drei von vier Fällen
   * falsch herum, und das merkt man erst, wenn man davorsteht.
   */
  it('weist eine Küchenzeile ohne Kante zurück', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    const edit = applyGridTool(plan, 'counter', spotAt(x, z));
    expect(edit.changed).toBe(false);
    expect(edit.says).toContain('Kante');
  });

  it('stellt eine Küchenzeile an die Kante, auf die gezeigt wird', () => {
    const plan = room();
    const [x, z] = middle(1, 0);
    // Knapp an der Nordkante der Kachel.
    const spot = spotAt(x, z - TILE / 2 + 0.1);
    expect(spot.dir).toBe(DIR_N);
    expect(applyGridTool(plan, 'counter', spot).changed).toBe(true);
    expect(plan.blocksOn(tileKey(1, 0, 0))[0]!.dir).toBe(DIR_N);
  });

  it('baut keinen Baustein auf eine Kachel ohne Boden', () => {
    const plan = new GridPlan();
    const [x, z] = middle(1, 1);
    const edit = applyGridTool(plan, 'table', spotAt(x, z));
    expect(edit.changed).toBe(false);
    expect(edit.says).toContain('Boden');
  });

  it('setzt denselben Baustein nicht zweimal an dieselbe Kante', () => {
    const plan = room();
    const [x, z] = middle(1, 0);
    const spot = spotAt(x, z - TILE / 2 + 0.1);
    applyGridTool(plan, 'counter', spot);
    expect(applyGridTool(plan, 'counter', spot).changed).toBe(false);
    expect(plan.blocksOn(tileKey(1, 0, 0))).toHaveLength(1);
  });

  it('lässt zwei verschiedene Bausteine auf einer Kachel zu', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    applyGridTool(plan, 'table', spotAt(x, z));
    applyGridTool(plan, 'crate', spotAt(x, z));
    expect(plan.blocksOn(tileKey(1, 1, 0))).toHaveLength(2);
  });
});

describe('Der Radiergummi räumt in der Reihenfolge auf, in der man es meint', () => {
  /**
   * **Erst der Baustein, dann die Tür, dann die Wand, dann der Boden.** Wer
   * eine Küchenzeile löschen will, will nicht den Boden darunter los — und
   * genau das wäre passiert, hätte der Radiergummi die Bausteine übersprungen.
   */
  it('nimmt den Baustein weg und lässt den Boden liegen', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    applyGridTool(plan, 'table', spotAt(x, z));
    const edit = applyGridTool(plan, 'erase', spotAt(x, z));
    expect(edit.changed).toBe(true);
    expect(plan.blocksOn(tileKey(1, 1, 0))).toHaveLength(0);
    expect(plan.graph.has(tileKey(1, 1, 0))).toBe(true);
  });

  it('nimmt zuerst den zuletzt gesetzten weg', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    applyGridTool(plan, 'table', spotAt(x, z));
    applyGridTool(plan, 'crate', spotAt(x, z));
    applyGridTool(plan, 'erase', spotAt(x, z));
    expect(plan.blocksOn(tileKey(1, 1, 0)).map((one) => one.kind)).toEqual(['table']);
  });

  it('geht erst an den Boden, wenn nichts mehr darauf steht', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    applyGridTool(plan, 'table', spotAt(x, z));
    applyGridTool(plan, 'erase', spotAt(x, z));
    applyGridTool(plan, 'erase', spotAt(x, z));
    expect(plan.graph.has(tileKey(1, 1, 0))).toBe(false);
  });

  /**
   * Und die Kachel muss danach wieder so billig sein wie vorher: Der Aufschlag
   * eines Bausteins steckt in den Kacheldaten, und die kennen ihre eigene
   * Herkunft nicht. Ohne die Notiz darüber, was ohne ihn gälte, bliebe eine
   * gelöschte Küchenzeile für immer im Weg.
   */
  it('gibt der Kachel ihre Kosten zurück', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    const before = plan.graph.tile(tileKey(1, 1, 0))!.cost;
    applyGridTool(plan, 'table', spotAt(x, z));
    expect(plan.graph.tile(tileKey(1, 1, 0))!.cost).toBeGreaterThan(before);
    applyGridTool(plan, 'erase', spotAt(x, z));
    expect(plan.graph.tile(tileKey(1, 1, 0))!.cost).toBeCloseTo(before);
  });
});

describe('Speichern und wiederholen', () => {
  it('bringt die Bausteine über einen Neustart', () => {
    const plan = room();
    const [x, z] = middle(1, 0);
    applyGridTool(plan, 'counter', spotAt(x, z - TILE / 2 + 0.1));
    applyGridTool(plan, 'table', spotAt(...middle(2, 2)));

    const back = GridPlan.from(plan.graph, plan.saveBlocks());
    expect(back.blocks()).toHaveLength(2);
    expect(back.blocksOn(tileKey(1, 0, 0))[0]!.kind).toBe('counter');
  });

  /**
   * **Der Fehler, der beim zweiten Laden auffiele und nicht beim ersten.** In
   * den gespeicherten Kacheldaten stecken die Aufschläge schon drin; wer sie
   * als Grundwert nähme und die Bausteine danach anwendete, zählte jeden
   * zweimal — und nach dem dritten Laden wäre die Küche unbegehbar.
   */
  it('zählt den Aufschlag eines Bausteins beim Laden nicht doppelt', () => {
    const plan = room();
    applyGridTool(plan, 'table', spotAt(...middle(1, 1)));
    const once = plan.graph.tile(tileKey(1, 1, 0))!.cost;

    let back = GridPlan.from(plan.graph, plan.saveBlocks());
    back = GridPlan.from(back.graph, back.saveBlocks());
    expect(back.graph.tile(tileKey(1, 1, 0))!.cost).toBeCloseTo(once);
  });

  it('wirft Bausteine weg, deren Kachel es nicht mehr gibt', () => {
    const plan = room();
    applyGridTool(plan, 'table', spotAt(...middle(1, 1)));
    const saved = plan.saveBlocks();
    const empty = new GridPlan().room({ x: 5, z: 5, w: 1, d: 1 });
    empty.loadBlocks(saved);
    expect(empty.blocks()).toHaveLength(0);
  });
});

describe('Die Palette', () => {
  it('kennt zu jedem Napf einen Namen und eine Farbe', () => {
    for (const kind of PALETTE_BLOCKS) {
      const spec = gridToolSpec(kind);
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.accent).toBeGreaterThan(0);
    }
  });

  it('sagt bei jedem Baustein, worauf man zeigen muss', () => {
    expect(gridToolSpec('counter').sub).toContain('Kante');
    expect(gridToolSpec('table').sub).toContain('Kachel');
  });

  it('lässt die vier Bauwerkzeuge, wie sie waren', () => {
    expect(gridToolSpec('floor').label).toBe('Boden');
    expect(gridToolSpec('erase').label).toBe('Löschen');
  });

  it('setzt einen freistehenden Baustein nach Norden, wenn keine Kante gemeint ist', () => {
    const plan = room();
    applyGridTool(plan, 'pillar', spotAt(...middle(1, 1)));
    expect(plan.blocksOn(tileKey(1, 1, 0))[0]!.dir).toBe(DIR_N);
  });

  it('nimmt die Kante als Blickrichtung, wenn eine gemeint ist', () => {
    const plan = room();
    const [x, z] = middle(1, 1);
    applyGridTool(plan, 'crate', spotAt(x, z + TILE / 2 - 0.1));
    expect(plan.blocksOn(tileKey(1, 1, 0))[0]!.dir).toBe(DIR_S);
  });
});
