import { bakeNav, type NavBox } from '../nav/navBake';
import { NavGraph } from '../nav/navGraph';
import { fillRect, setDoor } from '../nav/navBuild';
import { DIR_E, DIR_N, TILE, tileKey } from '../nav/navTile';
import { PLAN_LEAF_T, planSolids, type PlanSolid } from './levelBuild';
import {
  PLAN_DOOR_W,
  PLAN_FLOOR_T,
  PLAN_WALL_H,
  PLAN_WALL_T,
  doorName,
  planBounds,
  starterPlan,
} from './levelPlan';

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

describe('Aus dem Bauplan werden Quader', () => {
  it('legt unter jede Kachel eine Platte, deren Oberkante der Boden ist', () => {
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    const [floor] = planSolids(plan);
    expect(floor!.kind).toBe('floor');
    expect(floor!.w).toBeCloseTo(TILE);
    expect(floor!.d).toBeCloseTo(TILE);
    // Die Platte hängt **unter** dem Boden: Wer auf ihr steht, steht auf 0 und
    // nicht auf 0,15.
    expect(floor!.y + floor!.h / 2).toBeCloseTo(0);
    expect(floor!.h).toBeCloseTo(PLAN_FLOOR_T);
  });

  it('stellt eine Nordwand quer über die Kachelgrenze', () => {
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    plan.setWall(tileKey(0, 0, 0), DIR_N, { kind: 'solid' });
    const wall = planSolids(plan).find((one) => one.kind === 'wall')!;
    // Sie läuft in X und ist in Z dünn — und sie sitzt genau auf der Grenze.
    expect(wall.w).toBeCloseTo(TILE);
    expect(wall.d).toBeCloseTo(PLAN_WALL_T);
    expect(wall.z).toBeCloseTo(0);
    expect(wall.x).toBeCloseTo(TILE / 2);
    expect(wall.y - wall.h / 2).toBeCloseTo(0);
    expect(wall.h).toBeCloseTo(PLAN_WALL_H);
  });

  it('dreht eine Ostwand um neunzig Grad', () => {
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    plan.setWall(tileKey(0, 0, 0), DIR_E, { kind: 'solid' });
    const wall = planSolids(plan).find((one) => one.kind === 'wall')!;
    expect(wall.d).toBeCloseTo(TILE);
    expect(wall.w).toBeCloseTo(PLAN_WALL_T);
    expect(wall.x).toBeCloseTo(TILE);
  });

  it('baut aus einer Tür zwei Pfosten, einen Sturz und ein Blatt', () => {
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    const id = doorName(tileKey(0, 0, 0), DIR_N);
    setDoor(plan, tileKey(0, 0, 0), DIR_N, id, false);
    const parts = planSolids(plan).filter((one) => one.kind !== 'floor');
    const leaf = parts.find((one) => one.door === id)!;
    const posts = parts.filter((one) => one.kind === 'wall' && one.y - one.h / 2 < 0.01);
    expect(posts).toHaveLength(2);
    // Zwischen den Pfosten bleibt genau die Türbreite frei.
    const inner = Math.abs(posts[0]!.x - posts[1]!.x) - (posts[0]!.w + posts[1]!.w) / 2;
    expect(inner).toBeCloseTo(PLAN_DOOR_W);
    // Der Sturz sitzt darüber und schließt die Wand nach oben ab — ohne ihn
    // wäre die Tür ein Loch bis zur Decke.
    const lintel = parts.find((one) => one.kind === 'wall' && one.y - one.h / 2 > 1)!;
    expect(lintel.w).toBeCloseTo(TILE);
    expect(lintel.y + lintel.h / 2).toBeCloseTo(PLAN_WALL_H);
    // Und das geschlossene Blatt steht in der Lücke, quer zur Wand.
    expect(leaf.w).toBeCloseTo(PLAN_DOOR_W);
    expect(leaf.d).toBeCloseTo(PLAN_LEAF_T);
    expect(leaf.z).toBeCloseTo(0);
  });

  it('schwenkt ein offenes Blatt in den Raum statt es verschwinden zu lassen', () => {
    const plan = new NavGraph([0]);
    plan.setTile(tileKey(0, 0, 0));
    const id = doorName(tileKey(0, 0, 0), DIR_N);
    setDoor(plan, tileKey(0, 0, 0), DIR_N, id, true);
    const leaf = planSolids(plan).find((one) => one.door === id)!;
    // Offen liegt es **entlang** der Wandrichtung: dünn in X, breit in Z.
    expect(leaf.w).toBeCloseTo(PLAN_LEAF_T);
    expect(leaf.d).toBeCloseTo(PLAN_DOOR_W);
    // Und es steht nicht mehr in der Öffnung.
    expect(Math.abs(leaf.z)).toBeGreaterThan(0.1);
  });
});

describe('Hin und zurück', () => {
  /**
   * **Der Prüfstein dieser Datei.** Was der Editor baut, muss das Abtasten
   * wiederfinden — sonst baut man eine Wand, an der die Wegsuche vorbeiplant.
   */
  function bakeBack(plan: NavGraph): NavGraph {
    const box = planBounds(plan, 1);
    return bakeNav(boxesOf(planSolids(plan)), {
      bounds: box,
      levels: [0],
    }).graph;
  }

  it('findet jede Kachel des Plans wieder', () => {
    const plan = starterPlan();
    const baked = bakeBack(plan);
    for (const key of plan.tileKeys()) {
      expect(baked.has(key)).toBe(true);
    }
  });

  /**
   * Zwei Zimmer nebeneinander mit einer Trennwand — **beidseitig Boden**.
   *
   * Das ist die Zeile, an der der erste Versuch dieses Tests scheiterte: Das
   * Abtasten kennt nur Wände **zwischen zwei Kacheln**. Die Außenwand eines
   * Zimmers steht am Rand der Welt, dahinter ist kein Boden, und dort gibt es
   * für den Graphen nichts zu trennen — was fehlt, ist keine Kachel, und das
   * genügt ihm (`navGraph.ts`). Wer eine Außenwand nachprüfen will, prüft
   * etwas, das es absichtlich nicht gibt.
   */
  function twoRooms(open: boolean): NavGraph {
    const plan = new NavGraph([0]);
    fillRect(plan, { x: 0, z: 0, w: 4, d: 2 });
    const id = doorName(tileKey(1, 0, 0), DIR_E);
    plan.setWall(tileKey(1, 1, 0), DIR_E, { kind: 'solid' });
    setDoor(plan, tileKey(1, 0, 0), DIR_E, id, open);
    return plan;
  }

  it('findet eine massive Wand zwischen zwei Zimmern wieder', () => {
    const baked = bakeBack(twoRooms(true));
    expect(baked.wall(tileKey(1, 1, 0), DIR_E)?.kind).toBe('solid');
  });

  it('lässt eine offene Tür offen — Geometrie allein kennt keine Türen', () => {
    // Das ist keine Panne, sondern die Grenze des Abtastens: In einem Quader
    // steht nicht, dass er zugehen kann. Deshalb trägt der **Plan** die Tür
    // und nicht das Gebaute, und deshalb ist der Plan der Graph.
    const baked = bakeBack(twoRooms(true));
    expect(baked.wall(tileKey(1, 0, 0), DIR_E)).toBeUndefined();
  });

  it('macht aus einer zugefallenen Tür wieder eine Wand', () => {
    // Zu heißt: Das Blatt steht in der Lücke, und dort kommt niemand durch.
    const baked = bakeBack(twoRooms(false));
    expect(baked.wall(tileKey(1, 0, 0), DIR_E)?.kind).toBe('solid');
  });
});
