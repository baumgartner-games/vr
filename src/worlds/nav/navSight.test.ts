import { fillRect, setDoor, setWindow } from './navBuild';
import { NavGraph } from './navGraph';
import { FLOOR_MUFFLE, SOUND_RANGE, canSee, canWalkLine, soundLevel, traceLine } from './navSight';
import { DIR_E, DIR_S, TILE, tileKey } from './navTile';

function room(w = 6, d = 6, levels = [0]): NavGraph {
  const graph = new NavGraph(levels);
  for (let level = 0; level < levels.length; level++) {
    fillRect(graph, { x: 0, z: 0, w, d, level });
  }
  return graph;
}

describe('Die Linie durch das Gitter', () => {
  it('kommt durch einen leeren Raum, waagerecht, senkrecht und schräg', () => {
    const graph = room();
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(true);
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(0, 5, 0))).toBe(true);
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(5, 5, 0))).toBe(true);
    expect(canSee(graph, tileKey(4, 1, 0), tileKey(1, 4, 0))).toBe(true);
  });

  it('sieht sich selbst immer', () => {
    const graph = room();
    expect(canSee(graph, tileKey(2, 2, 0), tileKey(2, 2, 0))).toBe(true);
  });

  it('hört an einer massiven Wand auf', () => {
    const graph = room();
    graph.setWall(tileKey(2, 0, 0), DIR_E, { kind: 'solid' });
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(false);
    // Eine Reihe tiefer steht nichts: dort geht der Blick durch.
    expect(canSee(graph, tileKey(0, 1, 0), tileKey(5, 1, 0))).toBe(true);
  });

  it('sieht durch ein Fenster, geht aber nicht hindurch', () => {
    const graph = room();
    setWindow(graph, tileKey(2, 0, 0), DIR_E);
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(true);
    expect(canWalkLine(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(false);
  });

  it('sieht nicht diagonal durch eine Mauerecke', () => {
    // Die beiden Wände treffen sich genau dort, wo die Linie die Ecke kreuzt.
    const graph = room();
    graph.setWall(tileKey(1, 0, 0), DIR_S, { kind: 'solid' });
    graph.setWall(tileKey(0, 1, 0), DIR_E, { kind: 'solid' });
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(1, 1, 0))).toBe(false);
  });

  it('ist an einer Ecke lieber vorsichtig als großzügig', () => {
    // Nur einer der beiden Wege um die Ecke ist zu. Wir sperren trotzdem:
    // Ein NPC, der durch eine Ecke sieht, ist der schlimmere Fehler als einer,
    // der einmal zu wenig sieht.
    const graph = room();
    graph.setWall(tileKey(1, 0, 0), DIR_S, { kind: 'solid' });
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(1, 1, 0))).toBe(false);
  });

  it('geht nicht durch Decken', () => {
    const graph = room(4, 4, [0, 3.1]);
    expect(canSee(graph, tileKey(0, 0, 0), tileKey(0, 0, 1))).toBe(false);
    expect(traceLine(tileKey(0, 0, 0), tileKey(2, 2, 1), () => true)).toBe(false);
  });
});

describe('Die gerade Linie zum Laufen', () => {
  it('geht durch eine offene Tür und nicht durch eine geschlossene', () => {
    const graph = room();
    setDoor(graph, tileKey(2, 0, 0), DIR_E, 'tuer', true);
    expect(canWalkLine(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(true);
    graph.setDoor('tuer', { open: false });
    // Auch für den, der sie aufmachen könnte: Eine Tür, an der man erst
    // stehenbleibt, ist keine gerade Linie mehr.
    expect(canWalkLine(graph, tileKey(0, 0, 0), tileKey(5, 0, 0), true)).toBe(false);
  });

  it('bleibt vor einer Kiste stehen, die jemand abgestellt hat', () => {
    const graph = room();
    expect(canWalkLine(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(true);
    graph.setBlocked(tileKey(3, 0, 0), true);
    expect(canWalkLine(graph, tileKey(0, 0, 0), tileKey(5, 0, 0))).toBe(false);
  });

  it('läuft nicht über ein Loch im Boden', () => {
    const graph = room();
    graph.removeTile(tileKey(3, 3, 0));
    expect(canWalkLine(graph, tileKey(1, 1, 0), tileKey(5, 5, 0))).toBe(false);
  });
});

describe('Der Schall', () => {
  it('wird mit der Entfernung leiser und hört irgendwann auf', () => {
    const graph = room(30, 1);
    const source = tileKey(0, 0, 0);
    const near = soundLevel(graph, source, tileKey(2, 0, 0), 1);
    const far = soundLevel(graph, source, tileKey(10, 0, 0), 1);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    // Jenseits der Reichweite ist wirklich nichts mehr, und nicht „fast nichts".
    const beyond = Math.ceil(SOUND_RANGE / TILE) + 1;
    expect(soundLevel(graph, source, tileKey(beyond, 0, 0), 1)).toBe(0);
  });

  it('kommt an der Quelle in voller Lautstärke an', () => {
    const graph = room();
    expect(soundLevel(graph, tileKey(1, 1, 0), tileKey(1, 1, 0), 0.4)).toBeCloseTo(0.4, 9);
  });

  it('wird von jeder Wand dazwischen gedämpft', () => {
    const graph = room(8, 1);
    const from = tileKey(0, 0, 0);
    const to = tileKey(6, 0, 0);
    const open = soundLevel(graph, from, to, 1);
    graph.setWall(tileKey(3, 0, 0), DIR_E, { kind: 'solid', muffle: 0.85 });
    const muffled = soundLevel(graph, from, to, 1);
    expect(muffled).toBeCloseTo(open * 0.15, 6);
    // Und durch ein Fenster hört man mehr als durch die Wand daneben.
    setWindow(graph, tileKey(3, 0, 0), DIR_E);
    expect(soundLevel(graph, from, to, 1)).toBeGreaterThan(muffled);
  });

  it('geht durch eine Decke, aber nur gedämpft', () => {
    const graph = room(4, 4, [0, 3.1]);
    const below = tileKey(1, 1, 0);
    const above = tileKey(1, 1, 1);
    expect(soundLevel(graph, below, above, 1)).toBeCloseTo(FLOOR_MUFFLE, 9);
  });

  it('kommt durch eine offene Tür ungedämpft', () => {
    const graph = room(8, 1);
    const from = tileKey(0, 0, 0);
    const to = tileKey(6, 0, 0);
    const open = soundLevel(graph, from, to, 1);
    setDoor(graph, tileKey(3, 0, 0), DIR_E, 'tuer', true);
    expect(soundLevel(graph, from, to, 1)).toBeCloseTo(open, 9);
    graph.setDoor('tuer', { open: false });
    expect(soundLevel(graph, from, to, 1)).toBeLessThan(open);
  });
});
