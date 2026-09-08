import { bakeNav, type NavBox } from '../nav/navBake';
import { DIR_E, DIR_N, DIR_S, DIR_W, TILE, tileKey } from '../nav/navTile';
import { GridPlan } from './gridPlan';
import { solidBounds, type PlanSolid } from './solids';

function boxesOf(solids: readonly PlanSolid[]): NavBox[] {
  return solids.map((one) => ({
    minX: one.x - one.w / 2,
    maxX: one.x + one.w / 2,
    minY: one.y - one.h / 2,
    maxY: one.y + one.h / 2,
    minZ: one.z - one.d / 2,
    maxZ: one.z + one.d / 2,
  }));
}

describe('Ein Zimmer', () => {
  it('legt Boden über das ganze Rechteck', () => {
    const plan = new GridPlan().room({ x: -2, z: -2, w: 4, d: 4 });
    expect([...plan.graph.tileKeys()]).toHaveLength(16);
    expect(plan.graph.has(tileKey(-2, -2, 0))).toBe(true);
    expect(plan.graph.has(tileKey(1, 1, 0))).toBe(true);
    expect(plan.graph.has(tileKey(2, 0, 0))).toBe(false);
  });

  /**
   * Die Wände stehen **außen** an den Randkacheln. Wer sie nach innen setzte,
   * hätte ein Zimmer, dessen Randkacheln niemand betreten kann — und wundert
   * sich dann, warum die NPCs alle in der Mitte kleben.
   */
  it('stellt die Wände außen um die Randkacheln', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 3, d: 3 }, { walls: true });
    expect(plan.graph.wall(tileKey(0, 0, 0), DIR_N)?.kind).toBe('solid');
    expect(plan.graph.wall(tileKey(2, 1, 0), DIR_E)?.kind).toBe('solid');
    // Innen steht nichts im Weg.
    expect(plan.graph.wall(tileKey(1, 1, 0), DIR_N)).toBeUndefined();
    expect(plan.graph.wall(tileKey(1, 1, 0), DIR_E)).toBeUndefined();
  });

  /**
   * **Eine Decke ist ein Quader und nicht vierzig.** Ein Zimmer aus zehn mal
   * vier Kacheln hätte sonst vierzig Körper in der Physik, für eine Fläche, an
   * der man höchstens mit dem Kopf anstößt.
   */
  it('deckt ein Zimmer mit einem einzigen Quader zu', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 4, d: 3 }, { ceiling: 2.8 });
    const roof = plan.solids().filter((one) => one.y > 2.5);
    expect(roof).toHaveLength(1);
    expect(roof[0]!.w).toBeCloseTo(4 * TILE);
    expect(roof[0]!.d).toBeCloseTo(3 * TILE);
    expect(roof[0]!.y - roof[0]!.h / 2).toBeCloseTo(2.8);
  });
});

describe('Türen und Fenster', () => {
  it('macht aus einer Tür ein Blatt mit einem Namen', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 }, { walls: true });
    plan.door(0, 0, DIR_N);
    const wall = plan.graph.wall(tileKey(0, 0, 0), DIR_N)!;
    expect(wall.kind).toBe('door');
    expect(wall.id).toBeTruthy();
    const leaf = plan.solids().find((one) => one.door === wall.id);
    expect(leaf).toBeDefined();
  });

  /**
   * **Das Loch, das vorher keines war.** Der Graph kennt Fenster seit jeher
   * (`nav/navGraph.ts`: hält auf, lässt Sicht und Geräusch durch), gebaut wurde
   * daraus eine ganz normale massive Wand. Dahinter stand ein NPC, der einen
   * durch eine Wand sah, durch die man selbst nichts sah — und niemand hätte
   * je vermutet, dass das Fenster daran schuld ist.
   */
  it('lässt in einem Fenster wirklich eine Lücke', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 }, { walls: true });
    plan.window(0, 0, DIR_N);
    const parts = plan
      .solids()
      .filter((one) => one.kind === 'wall' && Math.abs(one.z) < 0.2 && one.x < TILE);
    // Auf Augenhöhe steht in der Mitte der Kante nichts mehr.
    const eye = 1.6;
    const blocking = parts.filter(
      (one) =>
        one.y - one.h / 2 < eye &&
        one.y + one.h / 2 > eye &&
        Math.abs(one.x - TILE / 2) < 0.3 &&
        one.w > 0.3,
    );
    expect(blocking).toHaveLength(0);
    // Brüstung und Sturz stehen aber sehr wohl.
    expect(parts.some((one) => one.y + one.h / 2 < 1.1)).toBe(true);
    expect(parts.some((one) => one.y - one.h / 2 > 2)).toBe(true);
  });
});

describe('Bausteine gehen in die Kachel ein', () => {
  it('macht eine Kachel mit einem Tisch teurer', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 });
    plan.put('table', 1, 1, DIR_N);
    expect(plan.graph.tile(tileKey(1, 1, 0))!.cost).toBeCloseTo(2.2);
    expect(plan.graph.tile(tileKey(0, 0, 0))!.cost).toBeCloseTo(1);
  });

  it('hebt eine Kachel mit einem Podest an', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 });
    plan.put('platform', 0, 1, DIR_N, 0, 1.5);
    expect(plan.graph.tile(tileKey(0, 1, 0))!.rise).toBeCloseTo(1.5);
    // Und die Bodenplatte darunter wandert mit — sonst schwebte sie.
    const floor = plan.solids().find((one) => one.kind === 'floor' && one.x < TILE && one.z > TILE);
    expect(floor!.y + floor!.h / 2).toBeCloseTo(1.5);
  });

  it('setzt eine Küchenzeile über mehrere Kacheln am Stück', () => {
    const plan = new GridPlan().room({ x: 0, z: 0, w: 4, d: 2 });
    plan.putRun('counter', 0, 0, 3, 'x', DIR_N);
    expect(plan.blocks()).toHaveLength(3);
    // Drei Kacheln nebeneinander, alle an derselben Kante.
    const box = solidBounds(plan.solids().filter((one) => one.kind === 'steel'))!;
    expect(box.maxX - box.minX).toBeCloseTo(3 * TILE - 0.25);
  });

  it('stellt einen Baustein an die Kachelmitte, in der er steht', () => {
    const plan = new GridPlan();
    plan.floor({ x: 2, z: -3, w: 1, d: 1 });
    plan.put('pillar', 2, -3, DIR_N);
    const pillar = plan.solids().find((one) => one.kind === 'stone')!;
    expect(pillar.x).toBeCloseTo(2.5 * TILE);
    expect(pillar.z).toBeCloseTo(-2.5 * TILE);
  });
});

describe('Massen kleben am Raster', () => {
  it('baut einen Quader über das ganze Rechteck', () => {
    const plan = new GridPlan();
    plan.mass('stone', { x: -4, z: 2, w: 8, d: 1 }, 0, 14);
    const [wall] = plan.solids();
    expect(wall!.w).toBeCloseTo(8 * TILE);
    expect(wall!.d).toBeCloseTo(TILE);
    expect(wall!.h).toBeCloseTo(14);
    expect(wall!.x).toBeCloseTo(0);
    expect(wall!.z).toBeCloseTo(2.5 * TILE);
    expect(wall!.y - wall!.h / 2).toBeCloseTo(0);
  });

  it('setzt eine Masse auf den Boden ihrer Etage', () => {
    const plan = new GridPlan([0, 3.1]);
    plan.mass('wood', { x: 0, z: 0, w: 1, d: 1, level: 1 }, 0, 0.4);
    const [slab] = plan.solids();
    expect(slab!.y - slab!.h / 2).toBeCloseTo(3.1);
  });
});

describe('Hin und zurück', () => {
  it('copies and replaces ceilings when exchanging a complete plan', () => {
    const original = new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 }, { ceiling: 2.8 });
    const replacement = new GridPlan()
      .room({ x: 8, z: 0, w: 4, d: 3 }, { ceiling: 3.2 })
      .room({ x: 20, z: 0, w: 5, d: 4 }, { ceiling: 3.2 });
    const expected = replacement.solids();
    original.replaceWith(replacement);
    expect(original.solids()).toEqual(expected);
    expect(original.masses()).toHaveLength(2);
    expect(original.masses()[0]).not.toBe(replacement.masses()[0]);
    expect(original.masses()[0]!.rect).not.toBe(replacement.masses()[0]!.rect);
    original.replaceWith(new GridPlan().room({ x: 0, z: 0, w: 2, d: 2 }));
    expect(original.masses()).toHaveLength(0);
  });

  /**
   * **Der Prüfstein.** Was ein Plan baut, muss das Abtasten wiederfinden
   * (`nav/navBake.ts`) — sonst steht in der Welt eine Wand, an der die Wegsuche
   * vorbeiplant. Der Bauplatz prüft dasselbe für seinen Grundriss; hier wird
   * es für alles geprüft, was eine Welt sonst noch hinstellt.
   */
  function bakeBack(plan: GridPlan): ReturnType<typeof bakeNav>['graph'] {
    return bakeNav(boxesOf(plan.solids()), {
      bounds: { minX: -20, minZ: -20, maxX: 20, maxZ: 20 },
      levels: [0],
    }).graph;
  }

  it('findet jede Kachel eines gebauten Zimmers wieder', () => {
    const plan = new GridPlan().room({ x: -2, z: -2, w: 4, d: 4 }, { walls: true });
    const baked = bakeBack(plan);
    for (const key of plan.graph.tileKeys()) expect(baked.has(key)).toBe(true);
  });

  it('findet eine Wand zwischen zwei Zimmern wieder', () => {
    const plan = new GridPlan().room({ x: -2, z: -1, w: 4, d: 2 });
    plan.wall(0, 0, DIR_W).wall(0, -1, DIR_W);
    const baked = bakeBack(plan);
    expect(baked.wall(tileKey(0, 0, 0), DIR_W)?.kind).toBe('solid');
  });

  /**
   * Eine Küchenzeile ist kein Boden — wer darüberläuft, läuft über eine
   * Arbeitsplatte. Das Abtasten muss die Kachel trotzdem als Boden finden:
   * daneben ist Platz, und genau deshalb steht in `BLOCKS` ein Aufschlag und
   * kein „hier geht es nicht".
   */
  it('lässt eine Kachel mit einer Küchenzeile begehbar', () => {
    const plan = new GridPlan().room({ x: -2, z: -2, w: 4, d: 4 });
    plan.put('counter', 0, 0, DIR_S);
    expect(bakeBack(plan).has(tileKey(0, 0, 0))).toBe(true);
  });

  it('macht aus einer Treppe einen begehbaren Weg nach oben', () => {
    const plan = new GridPlan([0, 2.8]);
    plan.floor({ x: 0, z: 0, w: 1, d: 3 });
    plan.put('stairs', 0, 0, DIR_S, 0, 2.8);
    const solids = plan.solids();
    const top = solidBounds(solids.filter((one) => one.kind === 'stone'))!;
    expect(top.maxY).toBeCloseTo(2.8);
  });
});
