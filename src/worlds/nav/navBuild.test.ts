import {
  addPortal,
  checkGraph,
  clearRect,
  connect,
  coverRect,
  dropPortal,
  fillRect,
  paintRect,
  portalLinkIds,
  setDoor,
  wallRect,
} from './navBuild';
import { NavGraph } from './navGraph';
import { HAZARD_SPIKES } from './navProfile';
import { DIRS, DIR_E, DIR_N, DIR_S, DIR_W, TILE, tileKey } from './navTile';

describe('Karten bauen', () => {
  it('legt Boden über ein Rechteck, von der Nordwestecke aus gezählt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 2, z: 3, w: 3, d: 2 });
    expect(graph.size).toBe(6);
    expect(graph.has(tileKey(2, 3, 0))).toBe(true);
    expect(graph.has(tileKey(4, 4, 0))).toBe(true);
    expect(graph.has(tileKey(5, 3, 0))).toBe(false);
  });

  it('schneidet ein Loch für ein Treppenauge', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    clearRect(graph, { x: 1, z: 1, w: 2, d: 2 });
    expect(graph.size).toBe(12);
    expect(graph.has(tileKey(1, 1, 0))).toBe(false);
  });

  it('mauert außen herum und lässt innen alles frei', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    wallRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    // Acht Wandstücke außen — die Ecken teilen sich keine.
    expect([...graph.wallEntries()]).toHaveLength(12);
    expect(graph.wall(tileKey(0, 0, 0), DIR_N)?.kind).toBe('solid');
    expect(graph.wall(tileKey(0, 0, 0), DIR_W)?.kind).toBe('solid');
    expect(graph.wall(tileKey(1, 1, 0), DIR_N)).toBeUndefined();
    expect(graph.wall(tileKey(2, 2, 0), DIR_S)?.kind).toBe('solid');
    expect(graph.wall(tileKey(2, 2, 0), DIR_E)?.kind).toBe('solid');
  });

  it('setzt eine Tür in eine Wand, die schon steht', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    wallRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    setDoor(graph, tileKey(1, 0, 0), DIR_N, 'eingang');
    expect(graph.door('eingang')).toMatchObject({ kind: 'door', open: true });
    expect([...graph.wallEntries()]).toHaveLength(12);
  });
});

describe('Portale', () => {
  it('kommen als Paar und gehen als Paar', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 1 });
    const a = tileKey(1, 0, 0);
    const b = tileKey(21, 0, 0);
    addPortal(graph, 'p1', a, b);

    const [into, back] = portalLinkIds('p1');
    expect(graph.link(into)?.to).toBe(b);
    expect(graph.link(back)?.to).toBe(a);
    // Jede Hälfte geht nur in eine Richtung — sonst hinge an jedem Ende zweimal
    // derselbe Weg.
    expect(graph.linksFrom(a)).toHaveLength(1);
    expect(graph.linksFrom(b)).toHaveLength(1);

    expect(dropPortal(graph, 'p1')).toBe(true);
    expect(graph.linksFrom(a)).toHaveLength(0);
    expect(graph.linksFrom(b)).toHaveLength(0);
  });

  it('kosten fast nichts — darum krempeln sie eine Karte um', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1 });
    fillRect(graph, { x: 40, z: 0, w: 1, d: 1 });
    addPortal(graph, 'p', tileKey(0, 0, 0), tileKey(40, 0, 0));
    expect(graph.link('p:in')!.cost).toBeLessThan(1);
  });
});

describe('Die Karte prüfen', () => {
  it('meldet nichts an einer heilen Karte', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4, level: 1 });
    connect(graph, 'treppe', tileKey(3, 3, 0), tileKey(3, 3, 1), 'stairs');
    expect(checkGraph(graph)).toEqual([]);
  });

  it('findet eine Verbindung, die im Nichts endet', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 2 });
    connect(graph, 'treppe', tileKey(0, 0, 0), tileKey(9, 9, 1), 'stairs');
    expect(checkGraph(graph).join(' ')).toMatch(/endet im Nichts/);
  });

  it('findet zwei Türen mit demselben Namen', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1 });
    setDoor(graph, tileKey(0, 0, 0), DIR_E, 'tuer');
    setDoor(graph, tileKey(2, 0, 0), DIR_E, 'tuer');
    expect(checkGraph(graph).join(' ')).toMatch(/Zwei Türen/);
  });

  it('findet eine Kachel, aus der es keinen Ausgang gibt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    for (const dir of DIRS) {
      graph.setWall(tileKey(1, 1, 0), dir, { kind: 'solid' });
    }
    expect(checkGraph(graph).join(' ')).toMatch(/keinen Ausgang/);
  });
});

describe('Ein Stück Karte in Weltmaßen', () => {
  /** Ein Feld von vier mal vier Kacheln, von (0,0) aus nach Osten und Süden. */
  const field = (): NavGraph => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    return graph;
  };

  it('malt genau die Kacheln an, deren Mitte im Rechteck liegt', () => {
    // Zwei Kacheln breit, zwei tief — und zwar die ersten beiden: Ihre Mitten
    // liegen auf 1,25 und 3,75, die der dritten auf 6,25 und damit draußen.
    const graph = field();
    expect(
      paintRect(graph, { minX: 0, maxX: 2 * TILE, minZ: 0, maxZ: 2 * TILE }, { cost: 3 }),
    ).toBe(4);
    expect(graph.tile(tileKey(1, 1, 0))!.cost).toBe(3);
    expect(graph.tile(tileKey(2, 1, 0))!.cost).toBe(1);
    expect(graph.tile(tileKey(1, 2, 0))!.cost).toBe(1);
  });

  it('nimmt die Kachel hinter der Kante nicht mit', () => {
    // **Der Fehler, der einen Menschen einen viel zu großen Bogen um die
    // Stachelgrube laufen ließ.** Die Kante bei `maxX` gehört schon zur
    // nächsten Kachel; wer dort noch einmal fragt, malt eine Spalte zu viel an
    // — und zwar nur nach Osten und nach Süden, was das Ganze schief macht
    // (`navlab/labSim.test.ts`, „dicht an der Grube vorbei").
    const graph = field();
    const touched = paintRect(
      graph,
      { minX: 0, maxX: 2 * TILE, minZ: 0, maxZ: 2 * TILE },
      { hazard: HAZARD_SPIKES },
    );
    expect(touched).toBe(4);
    expect(graph.tile(tileKey(2, 0, 0))!.hazard).toBe(0);
    expect(graph.tile(tileKey(0, 2, 0))!.hazard).toBe(0);
  });

  it('lässt an, was es nicht gibt', () => {
    const graph = new NavGraph();
    expect(paintRect(graph, { minX: 0, maxX: 10, minZ: 0, maxZ: 10 }, { cost: 2 })).toBe(0);
  });

  it('legt für eine Falle Boden, wo keiner ist — nach derselben Regel', () => {
    // `coverRect` ist die andere Hälfte: Es ändert nicht, was es gibt, sondern
    // legt an, was fehlt. Über einem Loch im Boden steht damit auf der Karte
    // ein Weg mit Stacheln — und wer die nicht liest, fällt hinein.
    const graph = new NavGraph();
    expect(coverRect(graph, { minX: 0, maxX: 2 * TILE, minZ: 0, maxZ: TILE }, { hazard: 1 })).toBe(
      2,
    );
    expect(graph.size).toBe(2);
    expect(graph.tile(tileKey(0, 0, 0))!.hazard).toBe(1);
    expect(graph.tile(tileKey(1, 0, 0))!.hazard).toBe(1);
    expect(graph.has(tileKey(2, 0, 0))).toBe(false);
  });
});
