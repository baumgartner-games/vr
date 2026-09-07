import { NavAgent, type Spot3 } from './navAgent';
import { addPortal, connect, fillRect, setDoor } from './navBuild';
import { NavGraph, wallState } from './navGraph';
import { HUMAN_PROFILE, ZOMBIE_PROFILE } from './navProfile';
import { DIRS, NO_TILE, TILE, keyZ, neighbour, tileKey } from './navTile';

/** Wo die Mitte einer Kachel liegt, als Punkt für den Läufer. */
function spot(graph: NavGraph, x: number, z: number, level = 0): Spot3 {
  return graph.worldOf(tileKey(x, z, level));
}

/**
 * Ein Schritt, der an Wänden hängen bleibt.
 *
 * Erst in X, dann in Z — so, wie ein Körper an einer Wand entlangrutscht.
 * Ohne diese Prüfung liefe der Läufer im Test durch jede geschlossene Tür,
 * und genau die Tür ist hier der Prüfstein.
 */
function slide(graph: NavGraph, at: Spot3, dx: number, dz: number): void {
  for (const [ax, az] of [
    [dx, 0],
    [0, dz],
  ] as const) {
    const from = graph.at(at.x, at.z, at.y);
    const next = { x: at.x + ax, z: at.z + az };
    const to = graph.at(next.x, next.z, at.y);
    if (to === NO_TILE || !graph.walkable(to)) continue;
    if (to !== from) {
      let open = false;
      for (const dir of DIRS) {
        if (neighbour(from, dir) !== to) continue;
        open = wallState(graph.wall(from, dir), false).walk;
        break;
      }
      if (!open) continue;
    }
    at.x = next.x;
    at.z = next.z;
  }
}

/** Lässt den Läufer laufen und gibt zurück, wie lange er gebraucht hat. */
function run(
  graph: NavGraph,
  agent: NavAgent,
  at: Spot3,
  goal: () => Spot3 | null,
  options: { seconds?: number; speed?: number; until?: () => boolean } = {},
): { seconds: number; arrived: boolean; visited: Set<number> } {
  const visited = new Set<number>();
  const dt = 1 / 30;
  const speed = options.speed ?? 2.4;
  const limit = options.seconds ?? 40;
  let now = 0;
  for (; now < limit; now += dt) {
    const target = goal();
    const step = agent.step(graph, at, target, dt, now);
    visited.add(graph.at(at.x, at.z, at.y));
    if (options.until?.()) return { seconds: now, arrived: true, visited };
    if (target && Math.hypot(target.x - at.x, target.z - at.z) < 0.8) {
      return { seconds: now, arrived: true, visited };
    }
    if (!step.waypoint) continue;
    const dx = step.waypoint.x - at.x;
    const dz = step.waypoint.z - at.z;
    const length = Math.hypot(dx, dz) || 1;
    slide(graph, at, (dx / length) * speed * dt, (dz / length) * speed * dt);
  }
  return { seconds: now, arrived: false, visited };
}

/** Zwei Räume, eine Tür dazwischen und ein langer Gang außen herum. */
function house(): NavGraph {
  const graph = new NavGraph([0]);
  fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
  fillRect(graph, { x: 0, z: 3, w: 7, d: 1 });
  for (const z of [0, 1, 2]) graph.setWall(tileKey(3, z, 0), 1, { kind: 'solid' });
  setDoor(graph, tileKey(3, 1, 0), 1, 'tuer-7', true);
  return graph;
}

describe('Der Läufer', () => {
  it('geht den Gang entlang und kommt an', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 12, d: 1 });
    const agent = new NavAgent();
    const at = spot(graph, 0, 0);
    const goal = spot(graph, 11, 0);
    expect(run(graph, agent, at, () => goal).arrived).toBe(true);
  });

  it('geht um eine Wand herum', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 7, d: 4 });
    for (const z of [0, 1, 2]) graph.setWall(tileKey(3, z, 0), 1, { kind: 'solid' });
    const agent = new NavAgent();
    const at = spot(graph, 0, 0);
    expect(run(graph, agent, at, () => spot(graph, 6, 0)).arrived).toBe(true);
  });

  it('folgt einem Ziel, das wegläuft', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 20, d: 1 });
    const agent = new NavAgent();
    const at = spot(graph, 0, 0);
    // Der Spieler läuft nach Osten, aber langsamer als der Verfolger.
    const player = spot(graph, 6, 0);
    const result = run(graph, agent, at, () => {
      player.x = Math.min(player.x + 0.04, 19 * TILE);
      return player;
    });
    expect(result.arrived).toBe(true);
  });

  it('steht ohne Ziel still', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1 });
    const agent = new NavAgent();
    const step = agent.step(graph, spot(graph, 0, 0), null, 1 / 30, 0);
    expect(step.waypoint).toBeNull();
    expect(agent.path).toHaveLength(0);
  });

  it('meldet einen Weg, der nicht ans Ziel führt, und bleibt davor stehen', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 6, d: 1 });
    graph.setWall(tileKey(3, 0, 0), 1, { kind: 'solid' });
    const agent = new NavAgent();
    const at = spot(graph, 0, 0);
    const result = run(graph, agent, at, () => spot(graph, 5, 0), { seconds: 12 });
    expect(result.arrived).toBe(false);
    // Vor der Wand, nicht am Start und nicht dahinter.
    expect(graph.at(at.x, at.z, 0)).toBe(tileKey(3, 0, 0));
  });

  it('zeigt seinen Weg her, damit man ihn zeichnen kann', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 8, d: 1 });
    const agent = new NavAgent();
    agent.step(graph, spot(graph, 0, 0), spot(graph, 7, 0), 1 / 30, 0);
    expect(agent.path.length).toBeGreaterThan(1);
    expect(agent.path[agent.path.length - 1]).toBe(tileKey(7, 0, 0));
    expect(agent.tile).toBe(tileKey(0, 0, 0));
  });
});

describe('Die Tür, die inzwischen zu ist', () => {
  it('läuft dagegen, merkt es dort und geht dann außen herum', () => {
    const graph = house();
    const agent = new NavAgent();
    // Er hat sie offen gesehen. Dann hat jemand sie verbarrikadiert.
    agent.belief.seeDoor('tuer-7', { open: true, barred: false }, 0);
    graph.setDoor('tuer-7', { open: false, barred: true });

    const at = spot(graph, 0, 1);
    const first = agent.step(graph, at, spot(graph, 6, 1), 1 / 30, 0);
    expect(first.complete).toBe(true);
    // Geplant ist quer durch die Tür und nicht der Gang außen herum.
    expect(agent.path.some((key) => keyZ(key) === 3)).toBe(false);

    const result = run(graph, agent, at, () => spot(graph, 6, 1), { seconds: 40 });
    expect(result.arrived).toBe(true);
    // Und er weiß jetzt, woran es lag.
    expect(agent.belief.doorOpinion('tuer-7')).toMatchObject({ known: true, barred: true });
  });

  it('läuft zur Metalltür, weil er sie für offen hielt, und geht dort außen herum', () => {
    // **Der Umweg fängt an der Tür an.** Der Zombie macht keine Tür auf und
    // bekommt eine aus Blech auch nicht klein — aber wissen kann er das erst,
    // wenn er davorsteht (`navBelief.ts`, `hopeful`). Vorher bog er am Start
    // ab, ohne je dagewesen zu sein.
    const graph = house();
    graph.setDoor('tuer-7', { open: false, material: 'metal' });
    const agent = new NavAgent({ profile: ZOMBIE_PROFILE });
    const at = spot(graph, 0, 1);

    // Erst einmal geradeaus: geplant ist quer durch die Tür.
    expect(agent.step(graph, at, spot(graph, 6, 1), 1 / 30, 0).complete).toBe(true);
    expect(agent.path.some((key) => keyZ(key) === 3)).toBe(false);
    expect(agent.belief.doorOpinion('tuer-7')).toBeUndefined();

    const result = run(graph, agent, at, () => spot(graph, 6, 1), { seconds: 60 });
    expect(result.arrived).toBe(true);
    // Er hat sie angesehen, und zwar dort, wo man sie ansieht.
    expect(agent.belief.doorOpinion('tuer-7')).toMatchObject({ known: true, open: false });
    // Und ist wirklich außen herum gegangen: der Gang in Reihe 3.
    expect([...result.visited].some((key) => keyZ(key) === 3)).toBe(true);
  });

  it('verlangt an der hölzernen Tür die Faust und an der metallenen gar nichts', () => {
    // Dieselbe Bucht, dasselbe Blatt, zwei Materialien: Aus Holz ist die Tür
    // drei Sekunden Arbeit, aus Metall eine Wand (`navDoor.ts`). Beide Male
    // steht er davor — nur einmal ist etwas zu tun.
    const actions = (material: 'wood' | 'metal'): Set<string> => {
      const graph = house();
      graph.setDoor('tuer-7', { open: false, material });
      const agent = new NavAgent({ profile: ZOMBIE_PROFILE });
      const at = spot(graph, 0, 1);
      const seen = new Set<string>();
      const dt = 1 / 30;
      for (let i = 0; i < 900; i++) {
        const step = agent.step(graph, at, spot(graph, 6, 1), dt, i * dt);
        seen.add(step.doorAction);
        if (!step.waypoint) continue;
        const dx = step.waypoint.x - at.x;
        const dz = step.waypoint.z - at.z;
        const length = Math.hypot(dx, dz) || 1;
        slide(graph, at, (dx / length) * 2.4 * dt, (dz / length) * 2.4 * dt);
      }
      // Angesehen hat er sie in beiden Fällen — sonst stünde er ewig davor.
      expect(agent.belief.doorOpinion('tuer-7')).toMatchObject({ known: true });
      return seen;
    };
    expect(actions('wood').has('break')).toBe(true);
    expect(actions('metal')).toEqual(new Set(['none']));
  });

  it('bemerkt eine Kiste, die jemand vor ihn stellt, und plant um', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    const agent = new NavAgent();
    const at = spot(graph, 0, 1);
    // Die ganze mittlere Reihe zu, bis auf den Umweg oben und unten.
    for (const x of [3]) graph.setBlocked(tileKey(x, 1, 0), true);

    const result = run(graph, agent, at, () => spot(graph, 6, 1), { seconds: 30 });
    expect(result.arrived).toBe(true);
  });

  it('lässt sich nicht von einer Tür aufhalten, die wirklich offen ist', () => {
    const graph = house();
    const agent = new NavAgent();
    const at = spot(graph, 0, 1);
    const result = run(graph, agent, at, () => spot(graph, 6, 1), { seconds: 20 });
    expect(result.arrived).toBe(true);
    // Der kurze Weg durch die Tür, nicht der lange außen herum.
    expect(result.seconds).toBeLessThan(12);
  });
});

describe('Zwei Sorten, dieselbe Karte', () => {
  it('schicken den Zombie durch die Grube und den Menschen daran vorbei', () => {
    const make = (): NavGraph => {
      const graph = new NavGraph([0]);
      fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
      for (const x of [2, 3, 4]) graph.setTile(tileKey(x, 1, 0), { hazard: 1 });
      return graph;
    };

    const pit = tileKey(3, 1, 0);

    const zombieGraph = make();
    const zombie = new NavAgent({ profile: ZOMBIE_PROFILE });
    const zombieRun = run(zombieGraph, zombie, spot(zombieGraph, 0, 1), () =>
      spot(zombieGraph, 6, 1),
    );
    expect(zombieRun.arrived).toBe(true);
    expect(zombieRun.visited.has(pit)).toBe(true);

    const humanGraph = make();
    const human = new NavAgent({ profile: HUMAN_PROFILE });
    const humanRun = run(humanGraph, human, spot(humanGraph, 0, 1), () => spot(humanGraph, 6, 1));
    expect(humanRun.arrived).toBe(true);
    // Er läuft nicht nur einen anderen Weg — er setzt keinen Fuß hinein.
    expect(humanRun.visited.has(pit)).toBe(false);
  });
});

describe('Das Portal, von dem nur einer weiß', () => {
  it('nimmt nur der, der es kennt', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 3 });
    addPortal(graph, 'portal-3', tileKey(1, 1, 0), tileKey(21, 1, 0));

    const witness = new NavAgent();
    const other = new NavAgent();
    for (const id of ['portal-3:in', 'portal-3:out']) other.belief.hideLink(id, 0);

    const from = spot(graph, 1, 1);
    const to = spot(graph, 21, 1);
    expect(witness.step(graph, from, to, 1 / 30, 0).complete).toBe(true);
    expect(other.step(graph, from, to, 1 / 30, 0).complete).toBe(false);
  });

  it('meldet den Sprung, sobald er davorsteht — laufen kann man da nicht', () => {
    const graph = new NavGraph([0]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 1 });
    addPortal(graph, 'p', tileKey(2, 0, 0), tileKey(20, 0, 0));

    const agent = new NavAgent();
    const at = { ...spot(graph, 0, 0) };
    const to = spot(graph, 22, 0);

    let jumped = NO_TILE;
    for (let i = 0; i < 300 && jumped === NO_TILE; i++) {
      const step = agent.step(graph, at, to, 1 / 30, i / 30);
      if (step.jump !== NO_TILE) {
        jumped = step.jump;
        break;
      }
      if (!step.waypoint) continue;
      const dx = step.waypoint.x - at.x;
      const dz = step.waypoint.z - at.z;
      const length = Math.hypot(dx, dz) || 1;
      slide(graph, at, (dx / length) * 0.08, (dz / length) * 0.08);
    }
    expect(jumped).toBe(tileKey(20, 0, 0));
  });

  it('meldet keinen Sprung, wo eine Treppe steht — die läuft man', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1, level: 1 });
    connect(graph, 'treppe', tileKey(1, 0, 0), tileKey(1, 0, 1), 'stairs');
    const agent = new NavAgent();
    for (let i = 0; i < 20; i++) {
      const step = agent.step(graph, spot(graph, 1, 0), spot(graph, 0, 0, 1), 1 / 30, i / 30);
      expect(step.jump).toBe(NO_TILE);
    }
  });
});
