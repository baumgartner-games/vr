import { NavBelief, believedLinkOpen, believedWalkable, believedWallState } from './navBelief';
import { addPortal, fillRect, setDoor } from './navBuild';
import { NavGraph } from './navGraph';
import { findPath } from './navPath';
import { HUMAN_PROFILE } from './navProfile';
import { canSee } from './navSight';
import { DIR_E, keyX, tileKey } from './navTile';

const human = { profile: HUMAN_PROFILE };

/**
 * Ob ein Weg wirklich durch die Tür geht.
 *
 * Die Kachel davor liegt auf jedem Weg — auch auf dem Umweg außen herum. Was
 * die Tür benutzt, ist erst der **Schritt** von ihr auf die dahinter.
 */
function usesDoor(tiles: readonly number[]): boolean {
  for (let i = 1; i < tiles.length; i++) {
    if (tiles[i - 1] === tileKey(3, 1, 0) && tiles[i] === tileKey(4, 1, 0)) return true;
  }
  return false;
}

/** Zwei Räume, dazwischen eine Wand mit einer Tür — und ein langer Umweg außen herum. */
function house(): NavGraph {
  const graph = new NavGraph();
  fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
  // Ein Gang außen herum, damit es überhaupt einen zweiten Weg gibt.
  fillRect(graph, { x: 0, z: 3, w: 7, d: 1 });
  for (const z of [0, 1, 2]) graph.setWall(tileKey(3, z, 0), DIR_E, { kind: 'solid' });
  setDoor(graph, tileKey(3, 1, 0), DIR_E, 'tuer-7', true);
  return graph;
}

describe('Die Meinung über eine Tür', () => {
  it('läuft gegen die Tür, die inzwischen zu ist — und das ist der Zweck', () => {
    const graph = house();
    const belief = new NavBelief();
    belief.seeDoor('tuer-7', { open: true, barred: false }, 120);

    // Jemand wirft sie zu. Der Graph weiß es sofort, der NPC nicht.
    graph.setDoor('tuer-7', { open: false, barred: true });

    const naive = findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), { ...human, belief });
    expect(naive.complete).toBe(true);
    expect(usesDoor(naive.tiles)).toBe(true);

    // Ohne Meinung — also mit Hellsicht — nimmt derselbe Weg sofort den Umweg.
    const seeing = findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), human);
    expect(seeing.tiles.some((key) => key === tileKey(3, 3, 0))).toBe(true);
  });

  it('plant um, sobald er davorsteht und hinsieht', () => {
    const graph = house();
    const belief = new NavBelief();
    belief.seeDoor('tuer-7', { open: true, barred: false }, 120);
    graph.setDoor('tuer-7', { open: false, barred: true });

    const before = belief.version;
    belief.seeDoor('tuer-7', graph.door('tuer-7')!, 126);
    expect(belief.version).toBeGreaterThan(before);

    const path = findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), { ...human, belief });
    expect(path.complete).toBe(true);
    expect(usesDoor(path.tiles)).toBe(false);
    expect(path.tiles).toContain(tileKey(3, 3, 0));
  });

  it('irrt sich über den Weg, nie über die Augen', () => {
    const graph = house();
    const belief = new NavBelief();
    belief.assumeDoor('tuer-7', { open: true }, 0);
    graph.setDoor('tuer-7', { open: false });

    // Er hält sie für offen — sehen kann er trotzdem nicht hindurch.
    expect(believedWallState(belief, graph.door('tuer-7'), true).walk).toBe(true);
    expect(canSee(graph, tileKey(3, 1, 0), tileKey(4, 1, 0))).toBe(false);
  });

  it('macht aus einer Tür, die er nicht kennt, eine Wand', () => {
    const graph = house();
    const belief = new NavBelief();
    belief.hideDoor('tuer-7', 0);
    const state = believedWallState(belief, graph.door('tuer-7'), true);
    expect(state.walk).toBe(false);
  });

  it('nimmt die Wahrheit, wo er keine eigene Meinung hat', () => {
    const graph = house();
    const belief = new NavBelief();
    graph.setDoor('tuer-7', { open: false });
    expect(believedWallState(belief, graph.door('tuer-7'), false).walk).toBe(false);
    expect(believedWallState(null, graph.door('tuer-7'), true).cost).toBeGreaterThan(0);
  });
});

describe('Die Meinung über ein Portal', () => {
  function twoRooms(): NavGraph {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 3 });
    addPortal(graph, 'portal-3', tileKey(1, 1, 0), tileKey(21, 1, 0));
    return graph;
  }

  it('lässt nur den hindurch, der dabei war', () => {
    const graph = twoRooms();
    const witness = new NavBelief();
    const rest = new NavBelief();
    for (const id of ['portal-3:in', 'portal-3:out']) rest.hideLink(id, 30);

    expect(
      findPath(graph, tileKey(1, 1, 0), tileKey(21, 1, 0), { ...human, belief: witness }).complete,
    ).toBe(true);
    expect(
      findPath(graph, tileKey(1, 1, 0), tileKey(21, 1, 0), { ...human, belief: rest }).complete,
    ).toBe(false);
  });

  it('lässt ihn hindurch, sobald er es gesehen hat', () => {
    const graph = twoRooms();
    const belief = new NavBelief();
    for (const id of ['portal-3:in', 'portal-3:out']) belief.hideLink(id, 30);
    belief.seeLink('portal-3:in', true, 42);
    expect(believedLinkOpen(belief, graph.link('portal-3:in')!)).toBe(true);
    expect(believedLinkOpen(belief, graph.link('portal-3:out')!)).toBe(false);
  });
});

describe('Die Meinung über eine Kachel', () => {
  it('geht um die Kiste herum, von der er weiß', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 3 });
    const belief = new NavBelief();
    belief.seeTile(tileKey(2, 1, 0), true, 10);
    const path = findPath(graph, tileKey(0, 1, 0), tileKey(4, 1, 0), { ...human, belief });
    expect(path.tiles).not.toContain(tileKey(2, 1, 0));
    expect(path.complete).toBe(true);
  });

  it('läuft in die Kiste hinein, von der er nichts weiß', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    graph.setBlocked(tileKey(2, 0, 0), true);
    const belief = new NavBelief();
    belief.seeTile(tileKey(2, 0, 0), false, 5);
    const path = findPath(graph, tileKey(0, 0, 0), tileKey(4, 0, 0), { ...human, belief });
    expect(path.complete).toBe(true);
    expect(path.tiles).toContain(tileKey(2, 0, 0));
  });

  it('hält eine Kachel, von der er nichts weiß, für unpassierbar', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    const belief = new NavBelief();
    belief.hideTile(tileKey(1, 0, 0), 0);
    expect(believedWalkable(belief, graph, tileKey(1, 0, 0))).toBe(false);
    expect(believedWalkable(belief, graph, tileKey(0, 0, 0))).toBe(true);
  });
});

describe('Das Vergessen', () => {
  it('bringt ihn zurück zur Wahrheit und nicht in die Ecke', () => {
    const graph = house();
    const belief = new NavBelief();
    belief.seeDoor('tuer-7', { open: false, barred: true }, 10);
    graph.setDoor('tuer-7', { open: true, barred: false });

    expect(
      usesDoor(findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), { ...human, belief }).tiles),
    ).toBe(false);

    expect(belief.forgetBefore(40)).toBe(1);
    expect(belief.size).toBe(0);
    // Ohne Meinung gilt wieder die Welt, und die Tür steht offen.
    expect(
      usesDoor(findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), { ...human, belief }).tiles),
    ).toBe(true);
  });

  it('behält, was jung genug ist', () => {
    const belief = new NavBelief();
    belief.seeDoor('alt', { open: true, barred: false }, 10);
    belief.seeDoor('neu', { open: true, barred: false }, 50);
    belief.seeTile(tileKey(0, 0, 0), true, 55);
    expect(belief.forgetBefore(40)).toBe(1);
    expect(belief.doorOpinion('neu')).toBeDefined();
    expect(belief.doorOpinion('alt')).toBeUndefined();
    expect(belief.size).toBe(2);
  });

  it('meldet nur echte Änderungen als Änderung', () => {
    const belief = new NavBelief();
    const before = belief.version;
    expect(belief.forgetDoor('gibt-es-nicht')).toBe(false);
    belief.clear();
    expect(belief.version).toBe(before);
  });
});

describe('Fünfzig Meinungen', () => {
  it('kosten je NPC nur, was er wirklich gesehen hat', () => {
    const beliefs = Array.from({ length: 50 }, () => new NavBelief());
    beliefs[0]!.seeDoor('tuer-7', { open: false, barred: false }, 1);
    expect(beliefs[0]!.size).toBe(1);
    expect(beliefs.slice(1).every((belief) => belief.size === 0)).toBe(true);
    // Und wer nichts weiß, sieht die Welt so, wie sie ist — kein Sonderfall.
    const graph = house();
    const path = findPath(graph, tileKey(0, 1, 0), tileKey(6, 1, 0), {
      ...human,
      belief: beliefs[49]!,
    });
    expect(keyX(path.tiles[path.tiles.length - 1]!)).toBe(6);
  });
});
