import { PreviewWalk, WALK_REACH, WALK_SPEED, stride } from './previewWalk';
import { addPortal, fillRect, wallRect } from '../nav/navBuild';
import { NavGraph } from '../nav/navGraph';
import { TILE, tileKey } from '../nav/navTile';

/** Wo die Mitte einer Kachel liegt — die Attrappe steht immer auf einer. */
function spot(
  graph: NavGraph,
  x: number,
  z: number,
  level = 0,
): { x: number; y: number; z: number } {
  return graph.worldOf(tileKey(x, z, level));
}

/**
 * Lässt sie gehen, bis sie da ist oder die Zeit um ist.
 *
 * Dreißig Bilder je Sekunde, wie in der Vorschau — eine Rechnung, die nur bei
 * einem Bild je Sekunde stimmt, stimmt auf keinem Telefon.
 */
function walk(
  graph: NavGraph | null,
  ghost: { x: number; y: number; z: number },
  to: { x: number; y: number; z: number },
  seconds = 30,
): { seconds: number; arrived: boolean; stuck: boolean } {
  const going = new PreviewWalk();
  going.to(to);
  const dt = 1 / 30;
  for (let now = 0; now < seconds; now += dt) {
    const step = going.step(graph, ghost, dt);
    ghost.x = step.at.x;
    ghost.y = step.at.y;
    ghost.z = step.at.z;
    if (step.stuck) return { seconds: now, arrived: false, stuck: true };
    if (step.arrived) return { seconds: now, arrived: true, stuck: false };
  }
  return { seconds, arrived: false, stuck: false };
}

describe('Ein Schritt', () => {
  it('geht höchstens so weit, wie das Tempo erlaubt', () => {
    const next = stride({ x: 0, y: 0, z: 0 }, { x: 100, z: 0 }, 3, 0.5);
    expect(next.x).toBeCloseTo(1.5);
    expect(next.z).toBeCloseTo(0);
    expect(next.left).toBeCloseTo(98.5);
  });

  it('schießt nicht über das Ziel hinaus', () => {
    // Ein Schritt von einem Meter auf zehn Zentimeter Abstand endet auf dem
    // Ziel und nicht neun Zentimeter dahinter — sonst zittert sie darum herum.
    const next = stride({ x: 0, y: 0, z: 0 }, { x: 0.1, z: 0 }, 3, 1);
    expect(next.x).toBeCloseTo(0.1);
    expect(next.left).toBe(0);
  });

  it('rechnet die Höhe nicht als Strecke mit', () => {
    // Sonst ginge sie auf einer Rampe langsamer als auf der Geraden — und die
    // Höhe ist nichts, was man geht, sondern was der Boden vorgibt.
    const flat = stride({ x: 0, y: 0, z: 0 }, { x: 10, z: 0 }, 3, 1);
    const steep = stride({ x: 0, y: 20, z: 0 }, { x: 10, z: 0 }, 3, 1);
    expect(steep.x).toBeCloseTo(flat.x);
  });
});

describe('Die Attrappe, die selbst geht', () => {
  /** Ein Saal von 10 × 10 Kacheln. */
  const hall = (): NavGraph => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 10, d: 10 });
    return graph;
  };

  it('steht still, solange niemand sie schickt', () => {
    const graph = hall();
    const going = new PreviewWalk();
    const at = spot(graph, 2, 2);
    const step = going.step(graph, at, 1);
    expect(going.going).toBe(false);
    expect(step.at).toEqual(at);
  });

  it('geht durch einen leeren Saal ans Ziel', () => {
    const graph = hall();
    const at = spot(graph, 1, 1);
    const goal = spot(graph, 8, 8);
    const run = walk(graph, at, goal);
    expect(run.arrived).toBe(true);
    expect(Math.hypot(at.x - goal.x, at.z - goal.z)).toBeLessThanOrEqual(WALK_REACH + 0.01);
    // Und sie trödelt nicht: Luftlinie durch den Saal, geteilt durch ihr
    // Tempo, ist die Untergrenze — viel mehr als das Doppelte wäre ein Weg,
    // der irgendwo herumführt.
    const direct = Math.hypot(8 - 1, 8 - 1) * TILE;
    expect(run.seconds).toBeGreaterThan(direct / WALK_SPEED - 1);
    expect(run.seconds).toBeLessThan((direct / WALK_SPEED) * 2 + 2);
  });

  it('geht um eine Wand herum statt hindurch', () => {
    const graph = hall();
    // Eine Wand quer durch den Saal, mit einer Lücke ganz rechts.
    wallRect(graph, { x: 0, z: 5, w: 9, d: 1 }, 'solid');
    const at = spot(graph, 1, 1);
    const run = walk(graph, at, spot(graph, 1, 8));
    expect(run.arrived).toBe(true);
    expect(run.stuck).toBe(false);
  });

  it('bleibt stehen, wo es keinen Weg gibt — und sagt es', () => {
    const graph = new NavGraph([0]);
    // Zwei Zimmer ohne Tür dazwischen.
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    fillRect(graph, { x: 20, z: 0, w: 4, d: 4 });
    const at = spot(graph, 1, 1);
    const run = walk(graph, at, spot(graph, 21, 1), 10);
    expect(run.stuck).toBe(true);
    // Den halben Weg ist sie aber gegangen: bis an die Kante ihres Zimmers,
    // und dort steht sie — nicht mitten im Raum, sondern vor dem, was fehlt.
    expect(at.x).toBeGreaterThan(spot(graph, 2, 1).x);
    expect(at.x).toBeLessThan(spot(graph, 4, 1).x);
  });

  it('nimmt ein Portal, statt darum herumzugehen', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    fillRect(graph, { x: 40, z: 0, w: 3, d: 3 });
    addPortal(graph, 'tor', tileKey(1, 1, 0), tileKey(41, 1, 0));
    const at = spot(graph, 0, 0);
    const run = walk(graph, at, spot(graph, 42, 2), 20);
    expect(run.arrived).toBe(true);
    // Hundert Meter Luftlinie in ein paar Sekunden gibt es nur durch das Tor.
    expect(run.seconds).toBeLessThan(15);
  });

  it('geht geradeaus, wenn die Welt kein Gitter hat', () => {
    const at = { x: 0, y: 0, z: 0 };
    const run = walk(null, at, { x: 0, y: 0, z: 12 });
    expect(run.arrived).toBe(true);
    expect(run.seconds).toBeGreaterThan(12 / WALK_SPEED - 1);
  });

  it('hört auf zu gehen, wenn jemand sie anhält', () => {
    const graph = hall();
    const going = new PreviewWalk();
    const at = spot(graph, 1, 1);
    going.to(spot(graph, 8, 8));
    expect(going.going).toBe(true);
    going.stop();
    expect(going.going).toBe(false);
    const step = going.step(graph, at, 1);
    expect(step.at).toEqual(at);
  });
});
