import { doorSpec } from './navDoor';
import { connect, fillRect, setDoor, wallRect } from './navBuild';
import { DOOR_COST, NavGraph, wallState, type WallFacts } from './navGraph';
import { DIR_E, DIR_N, DIR_W, tileKey } from './navTile';

/** Eine Wand, wie der Graph sie anlegt — hier nur mit dem, worum es gerade geht. */
function wall(facts: Partial<WallFacts> & Pick<WallFacts, 'kind'>): WallFacts {
  const material = facts.material ?? 'wood';
  return {
    open: false,
    barred: false,
    muffle: 0.85,
    id: '',
    material,
    health: facts.kind === 'door' ? doorSpec(material).health : Infinity,
    ...facts,
  };
}

describe('Was eine Wand bedeutet', () => {
  it('lässt durch, wo keine steht', () => {
    expect(wallState(undefined, true)).toEqual({ walk: true, cost: 0, see: true, hear: 1 });
  });

  it('hält eine massive Wand fest — nichts geht durch, wenig kommt hindurch', () => {
    const state = wallState(wall({ kind: 'solid', muffle: 0.9 }), true);
    expect(state.walk).toBe(false);
    expect(state.see).toBe(false);
    expect(state.hear).toBeCloseTo(0.1, 9);
  });

  it('lässt ein Fenster sehen, aber nicht gehen', () => {
    const state = wallState(wall({ kind: 'window', muffle: 0.4 }), true);
    expect(state.walk).toBe(false);
    expect(state.see).toBe(true);
    expect(state.hear).toBeCloseTo(0.6, 9);
  });

  it('macht aus einer geschlossenen Tür für den einen einen Umweg und für den anderen eine Wand', () => {
    const shut = wall({ kind: 'door', muffle: 0.8, id: 'd', material: 'metal' });
    const opener = wallState(shut, true);
    expect(opener.walk).toBe(true);
    expect(opener.cost).toBe(DOOR_COST);
    // Und sie ist zu: durchsehen kann auch der nicht, der sie aufmachen kann.
    expect(opener.see).toBe(false);

    const zombie = wallState(shut, false);
    expect(zombie.walk).toBe(false);
    expect(zombie.cost).toBe(0);
  });

  it('macht eine verbarrikadierte Tür für alle zur Wand', () => {
    const barred = wall({ kind: 'door', barred: true, muffle: 0.8, id: 'd', material: 'metal' });
    expect(wallState(barred, true).walk).toBe(false);
  });

  it('schreibt in das mitgegebene Objekt, statt ein neues anzulegen', () => {
    const out = { walk: false, cost: 9, see: false, hear: 0 };
    const same = wallState(undefined, true, out);
    expect(same).toBe(out);
    expect(out).toEqual({ walk: true, cost: 0, see: true, hear: 1 });
  });
});

describe('Der Graph', () => {
  it('kennt nur Kacheln, die es gibt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 2 });
    expect(graph.size).toBe(6);
    expect(graph.has(tileKey(2, 1, 0))).toBe(true);
    expect(graph.has(tileKey(3, 0, 0))).toBe(false);
  });

  it('stellt eine Wand einmal hin, egal von welcher Seite man sie setzt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    graph.setWall(tileKey(0, 0, 0), DIR_E, { kind: 'solid' });
    expect(graph.wall(tileKey(1, 0, 0), DIR_W)?.kind).toBe('solid');
    // Und von der anderen Seite geändert ist es dieselbe Wand und keine zweite.
    graph.setWall(tileKey(1, 0, 0), DIR_W, { kind: 'window' });
    expect(graph.wall(tileKey(0, 0, 0), DIR_E)?.kind).toBe('window');
    expect([...graph.wallEntries()]).toHaveLength(1);
  });

  it('findet eine Tür unter ihrem Namen und macht sie zu', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    setDoor(graph, tileKey(0, 0, 0), DIR_E, 'tuer-7');
    expect(graph.door('tuer-7')?.open).toBe(true);
    expect(graph.setDoor('tuer-7', { open: false })).toBe(true);
    // Von der anderen Seite gesehen ist sie auch zu — das ist der ganze Grund
    // für die Normierung des Wandschlüssels.
    expect(graph.wall(tileKey(1, 0, 0), DIR_W)?.open).toBe(false);
    expect(graph.setDoor('gibt-es-nicht', { open: true })).toBe(false);
  });

  it('vergisst den Namen einer Tür, die überbaut wird', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    setDoor(graph, tileKey(0, 0, 0), DIR_E, 'tuer-7');
    graph.setWall(tileKey(0, 0, 0), DIR_E, { kind: 'solid' });
    expect(graph.door('tuer-7')).toBeUndefined();
  });

  it('hängt eine Verbindung in beide Richtungen ein, wenn sie in beide geht', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1, level: 1 });
    const down = tileKey(0, 0, 0);
    const up = tileKey(0, 0, 1);
    connect(graph, 'treppe', down, up, 'stairs');
    expect(graph.linksFrom(down).map((exit) => exit.to)).toEqual([up]);
    expect(graph.linksFrom(up).map((exit) => exit.to)).toEqual([down]);
  });

  it('ersetzt eine Verbindung mit demselben Namen, statt eine zweite danebenzuhängen', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    connect(graph, 'p', tileKey(0, 0, 0), tileKey(2, 0, 0), 'portal');
    connect(graph, 'p', tileKey(0, 0, 0), tileKey(4, 0, 0), 'portal');
    expect(graph.linksFrom(tileKey(0, 0, 0))).toHaveLength(1);
    expect(graph.linksFrom(tileKey(2, 0, 0))).toHaveLength(0);
    expect(graph.removeLink('p')).toBe(true);
    expect(graph.linksFrom(tileKey(0, 0, 0))).toHaveLength(0);
  });

  it('sperrt eine Kachel, ohne sie wegzunehmen', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    const key = tileKey(1, 0, 0);
    expect(graph.setBlocked(key, true)).toBe(true);
    // Zweimal dasselbe ist keine Änderung — sonst zählt der Zähler jede Frame hoch.
    expect(graph.setBlocked(key, true)).toBe(false);
    expect(graph.has(key)).toBe(true);
    expect(graph.walkable(key)).toBe(false);
    expect(graph.setBlocked(key, false)).toBe(true);
    expect(graph.walkable(key)).toBe(true);
  });

  it('zählt jede Änderung mit', () => {
    const graph = new NavGraph();
    const before = graph.version;
    fillRect(graph, { x: 0, z: 0, w: 1, d: 1 });
    graph.setWall(tileKey(0, 0, 0), DIR_N, { kind: 'solid' });
    expect(graph.version).toBeGreaterThan(before + 1);
  });
});

describe('Von Metern auf Kacheln', () => {
  const graph = new NavGraph([0, 3.1, 6.2]);
  fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
  fillRect(graph, { x: 0, z: 0, w: 4, d: 4, level: 1 });
  fillRect(graph, { x: 0, z: 0, w: 4, d: 4, level: 2 });

  it('nimmt die Etage, auf der jemand wirklich steht', () => {
    const world = graph.worldOf(tileKey(1, 1, 1));
    expect(graph.at(world.x, world.z, 3.1)).toBe(tileKey(1, 1, 1));
    expect(graph.at(world.x, world.z, 0.1)).toBe(tileKey(1, 1, 0));
    expect(graph.at(world.x, world.z, 6.3)).toBe(tileKey(1, 1, 2));
  });

  it('verzeiht eine Stufe unter den Füßen', () => {
    // 40 cm über dem Boden des ersten Stocks steht man immer noch dort und
    // nicht im Erdgeschoss.
    const world = graph.worldOf(tileKey(2, 2, 1));
    expect(graph.at(world.x, world.z, 3.5)).toBe(tileKey(2, 2, 1));
  });

  it('sucht die nächste begehbare Kachel, wenn das Ziel danebenliegt', () => {
    const world = graph.worldOf(tileKey(0, 0, 0));
    // Eine Kachel westlich vom Rand: dort ist nichts, aber gleich daneben schon.
    const key = graph.nearest(world.x - 2.5, world.z, 0);
    expect(key).toBe(tileKey(0, 0, 0));
  });

  it('weicht auf den Nachbarn aus, wenn auf der Kachel etwas steht', () => {
    const blocked = new NavGraph();
    fillRect(blocked, { x: 0, z: 0, w: 3, d: 1 });
    blocked.setBlocked(tileKey(1, 0, 0), true);
    const world = blocked.worldOf(tileKey(1, 0, 0));
    expect(blocked.nearest(world.x, world.z, 0)).not.toBe(tileKey(1, 0, 0));
  });
});

describe('Nachbarn mit Wänden dazwischen', () => {
  it('zählt nur, wo wirklich etwas hingeht', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    wallRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    // Die Mitte hat vier Nachbarn, die Ecke nach dem Ummauern zwei.
    expect(graph.openNeighbours(tileKey(1, 1, 0))).toHaveLength(4);
    expect(graph.openNeighbours(tileKey(0, 0, 0))).toHaveLength(2);
  });

  it('macht aus einer Tür für den Zombie eine Wand', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    setDoor(graph, tileKey(0, 0, 0), DIR_E, 'd', false);
    expect(graph.openNeighbours(tileKey(0, 0, 0), true)).toHaveLength(1);
    expect(graph.openNeighbours(tileKey(0, 0, 0), false)).toHaveLength(0);
  });
});
