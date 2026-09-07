import { NavGraph } from '../nav/navGraph';
import { fillRect } from '../nav/navBuild';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, tileKey } from '../nav/navTile';
import {
  PLAN_TOOLS,
  aimOf,
  applyTool,
  doorName,
  edgeAt,
  erase,
  flipEdge,
  planBounds,
  planCentre,
  planToolSpec,
  setFloor,
  setWall,
  spotAt,
  starterPlan,
  type PlanSpot,
} from './levelPlan';

/** Ein Zimmer aus vier mal vier Kacheln, ohne Wände. */
function room(): NavGraph {
  const plan = new NavGraph([0]);
  fillRect(plan, { x: 0, z: 0, w: 4, d: 4 });
  return plan;
}

describe('Worauf jemand zeigt', () => {
  it('trifft in der Mitte einer Kachel die Kachel', () => {
    // Mitte von Kachel (0,0) ist (1,25 | 1,25).
    expect(spotAt(1.25, 1.25)).toEqual({ tile: tileKey(0, 0, 0), dir: null });
  });

  it('trifft nah an einer Kante die Kante', () => {
    // Zehn Zentimeter vor der Nordkante von Kachel (0,0).
    expect(spotAt(1.25, 0.1)).toEqual({ tile: tileKey(0, 0, 0), dir: DIR_N });
    expect(spotAt(1.25, 2.4)).toEqual({ tile: tileKey(0, 0, 0), dir: DIR_S });
    expect(spotAt(0.1, 1.25)).toEqual({ tile: tileKey(0, 0, 0), dir: DIR_W });
    expect(spotAt(2.4, 1.25)).toEqual({ tile: tileKey(0, 0, 0), dir: DIR_E });
  });

  it('nimmt in einer Ecke die nähere der beiden Kanten', () => {
    // Näher an der Nordkante als an der Westkante: 0,1 gegen 0,3.
    expect(spotAt(0.3, 0.1).dir).toBe(DIR_N);
    expect(spotAt(0.1, 0.3).dir).toBe(DIR_W);
  });

  it('lässt den Streifen an der Kante einstellen', () => {
    // Mit einem breiteren Streifen wird aus derselben Stelle eine Kante.
    expect(spotAt(1.25, 0.8).dir).toBeNull();
    expect(spotAt(1.25, 0.8, 0, TILE / 2).dir).toBe(DIR_N);
  });

  it('legt eine Kante genau zwischen zwei Kachelmitten', () => {
    const north = edgeAt(tileKey(0, 0, 0), DIR_N);
    expect(north).toEqual({ x: 1.25, z: 0, alongX: true });
    const east = edgeAt(tileKey(0, 0, 0), DIR_E);
    expect(east).toEqual({ x: 2.5, z: 1.25, alongX: false });
  });

  it('nennt dieselbe Kante von beiden Seiten', () => {
    const here: PlanSpot = { tile: tileKey(1, 1, 0), dir: DIR_E };
    const there = flipEdge(here);
    expect(there).toEqual({ tile: tileKey(2, 1, 0), dir: DIR_W });
    // Und beide meinen wirklich dieselbe Wand: Wer sie hier setzt, findet sie
    // dort. Das ist die Zusicherung, wegen der es `flipEdge` gibt.
    const plan = room();
    setWall(plan, here, 'solid');
    expect(plan.wall(there.tile, there.dir!)?.kind).toBe('solid');
  });
});

describe('Die vier Werkzeuge', () => {
  it('legen Boden hin, wo noch keiner ist', () => {
    const plan = new NavGraph([0]);
    const spot: PlanSpot = { tile: tileKey(0, 0, 0), dir: null };
    expect(applyTool(plan, 'floor', spot).changed).toBe(true);
    expect(plan.has(tileKey(0, 0, 0))).toBe(true);
    // Zweimal dieselbe Kachel ist keine Änderung — man malt beim Ziehen über
    // dieselbe Stelle ständig doppelt.
    expect(applyTool(plan, 'floor', spot).changed).toBe(false);
  });

  it('bauen den Boden von der Kante aus weiter', () => {
    // Auf die Ostkante gezeigt und Boden gewählt: gemeint ist die Kachel
    // dahinter. Ohne das müsste man die Mitte der nächsten Kachel treffen,
    // die es noch gar nicht gibt.
    const plan = room();
    applyTool(plan, 'floor', { tile: tileKey(3, 0, 0), dir: DIR_E } as PlanSpot);
    expect(plan.has(tileKey(4, 0, 0))).toBe(true);
  });

  it('stellen eine Wand nur an eine Kante und nur an vorhandenen Boden', () => {
    const plan = room();
    expect(applyTool(plan, 'wall', { tile: tileKey(0, 0, 0), dir: null } as PlanSpot).changed).toBe(
      false,
    );
    expect(
      applyTool(plan, 'wall', { tile: tileKey(9, 9, 0), dir: DIR_N } as PlanSpot).changed,
    ).toBe(false);
    expect(
      applyTool(plan, 'wall', { tile: tileKey(1, 1, 0), dir: DIR_N } as PlanSpot).changed,
    ).toBe(true);
    expect(plan.wall(tileKey(1, 1, 0), DIR_N)?.kind).toBe('solid');
  });

  it('machen aus einer freien Kante direkt eine Tür', () => {
    // Wer *Tür* gewählt hat und auf eine leere Kante zeigt, meint eine Tür —
    // und nicht „erst eine Wand bauen und dann noch einmal drücken".
    const plan = room();
    const spot: PlanSpot = { tile: tileKey(1, 1, 0), dir: DIR_E };
    expect(applyTool(plan, 'door', spot).changed).toBe(true);
    const facts = plan.wall(spot.tile, DIR_E);
    expect(facts?.kind).toBe('door');
    expect(facts?.open).toBe(true);
    // Und sie trägt einen Namen: ohne den kann sich kein NPC über sie irren.
    expect(facts?.id).toBe(doorName(spot.tile, DIR_E));
    expect(plan.door(facts!.id)).toBe(facts);
  });

  it('geben derselben Kante von beiden Seiten denselben Türnamen', () => {
    // Sonst stünde nach dem zweiten Druck von der anderen Seite eine zweite
    // Tür im Plan, und `setDoor` fände die falsche.
    const here: PlanSpot = { tile: tileKey(1, 1, 0), dir: DIR_E };
    const there = flipEdge(here);
    expect(doorName(here.tile, here.dir!)).toBe(doorName(there.tile, there.dir!));
  });

  it('räumen mit dem Radiergummi in der Reihenfolge auf, in der man es meint', () => {
    const plan = room();
    const spot: PlanSpot = { tile: tileKey(1, 1, 0), dir: DIR_E };
    applyTool(plan, 'door', spot);
    // Erst die Tür — die Wand bleibt stehen.
    expect(erase(plan, spot).changed).toBe(true);
    expect(plan.wall(spot.tile, DIR_E)?.kind).toBe('solid');
    // Dann die Wand.
    expect(erase(plan, spot).changed).toBe(true);
    expect(plan.wall(spot.tile, DIR_E)).toBeUndefined();
    // Und dann der Boden, denn dort steht nichts mehr.
    expect(erase(plan, spot).changed).toBe(true);
    expect(plan.has(spot.tile)).toBe(false);
  });

  it('nehmen mit dem Boden die Wände mit, die dann im Nichts stünden', () => {
    // Eine Wand zwischen zwei Kacheln, von denen es keine mehr gibt, ist ein
    // Brett in der Luft — man sieht es in der Miniatur und wundert sich.
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    plan.setWall(tileKey(0, 0, 0), DIR_N, { kind: 'solid' });
    plan.setWall(tileKey(0, 0, 0), DIR_S, { kind: 'solid' });
    plan.setTile(tileKey(0, 1, 0));
    setFloor(plan, tileKey(0, 0, 0), false);
    // Die Nordwand hatte keinen Nachbarn — weg. Die Südwand schon — sie bleibt.
    expect(plan.wall(tileKey(0, 0, 0), DIR_N)).toBeUndefined();
    expect(plan.wall(tileKey(0, 1, 0), DIR_N)?.kind).toBe('solid');
  });

  it('zielen in der Vorschau auf dasselbe wie im Druck', () => {
    // Eine Vorschau, die etwas anderes zeigt als der nächste Druck tut, ist
    // schlimmer als gar keine — man lernt sie sich an und baut danach daneben.
    const edge: PlanSpot = { tile: tileKey(3, 0, 0), dir: DIR_E };
    expect(aimOf('floor', edge)).toEqual({ tile: tileKey(4, 0, 0), dir: null });
    expect(aimOf('wall', edge)).toBe(edge);
    expect(aimOf('door', edge)).toBe(edge);
    expect(aimOf('erase', edge)).toBe(edge);
    const middle: PlanSpot = { tile: tileKey(1, 1, 0), dir: null };
    expect(aimOf('floor', middle)).toBe(middle);
  });

  it('haben zu jeder Id genau einen Eintrag', () => {
    for (const tool of PLAN_TOOLS) {
      expect(planToolSpec(tool.id)).toBe(tool);
      expect(tool.label.length).toBeGreaterThan(0);
      expect(tool.sub.length).toBeGreaterThan(0);
    }
    expect(planToolSpec('gibt-es-nicht').id).toBe('floor');
    expect(planToolSpec(undefined).id).toBe('floor');
  });
});

describe('Der Ausschnitt', () => {
  it('legt einen Rand um den Plan, an dem man weiterbauen kann', () => {
    const box = planBounds(room(), 1);
    // Vier Kacheln plus je eine Kachel Rand.
    expect(box.minX).toBeCloseTo(-TILE);
    expect(box.maxX).toBeCloseTo(5 * TILE);
    expect(box.any).toBe(true);
  });

  it('gibt einem leeren Plan trotzdem eine Fläche', () => {
    // Sonst hätte ein frischer Plan keinen Boden, auf den man zeigen könnte —
    // und man käme nie zur ersten Kachel.
    const box = planBounds(new NavGraph([0]));
    expect(box.any).toBe(false);
    expect(box.maxX - box.minX).toBeGreaterThan(0);
  });

  it('findet die Mitte eines Zimmers', () => {
    expect(planCentre(room())).toEqual({ x: 2 * TILE, z: 2 * TILE });
  });
});

describe('Der Startgrundriss', () => {
  it('ist ein Zimmer mit Wänden und einer Tür', () => {
    const plan = starterPlan();
    expect(plan.size).toBe(36);
    // Rings herum eine Wand.
    expect(plan.wall(tileKey(-3, -3, 0), DIR_N)?.kind).toBe('solid');
    expect(plan.wall(tileKey(2, 2, 0), DIR_E)?.kind).toBe('solid');
    // Und genau eine Tür darin.
    const doors = [...plan.doorIds()];
    expect(doors).toHaveLength(1);
    expect(plan.door(doors[0]!)?.open).toBe(true);
  });

  it('lässt sich vollständig wieder abräumen', () => {
    // Der Prüfstein für den Radiergummi: Was der Editor hinstellt, muss er
    // auch wieder loswerden — sonst bleibt irgendwo ein Brett stehen.
    const plan = starterPlan();
    for (const key of [...plan.tileKeys()]) setFloor(plan, key, false);
    expect(plan.size).toBe(0);
    expect([...plan.wallEntries()]).toHaveLength(0);
  });
});
