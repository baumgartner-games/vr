import {
  addPortal,
  checkGraph,
  clearRect,
  connect,
  dropPortal,
  fillRect,
  portalLinkIds,
  setDoor,
  wallRect,
} from './navBuild';
import { NavGraph } from './navGraph';
import { DIRS, DIR_E, DIR_N, DIR_S, DIR_W, tileKey } from './navTile';

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
