import { addPortal, connect, fillRect, setDoor } from './navBuild';
import { doorSpec, type DoorMaterial } from './navDoor';
import { DOOR_COST, NavGraph } from './navGraph';
import {
  WALL_SKIN,
  cornerBlocked,
  findPath,
  flowField,
  flowPath,
  pullString,
  smoothPath,
  type PathPoint,
} from './navPath';
import {
  HAZARD_SPIKES,
  HUMAN_PROFILE,
  VEHICLE_PROFILE,
  ZOMBIE_PROFILE,
  type CostProfile,
} from './navProfile';
import {
  DIR_E,
  DIR_N,
  DIR_S,
  DIR_W,
  TILE,
  keyLevel,
  keyX,
  keyZ,
  tileCentreX,
  tileCentreZ,
  tileKey,
} from './navTile';

const human = { profile: HUMAN_PROFILE };
const zombie = { profile: ZOMBIE_PROFILE };

function at(x: number, z: number, level = 0): number {
  return tileKey(x, z, level);
}

describe('Der einfache Weg', () => {
  it('läuft den Gang entlang und kostet, was er lang ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 10, d: 1 });
    const path = findPath(graph, at(0, 0), at(9, 0), human);
    expect(path.complete).toBe(true);
    expect(path.tiles).toHaveLength(10);
    expect(path.cost).toBeCloseTo(9 * TILE, 9);
  });

  it('bleibt stehen, wenn er schon da ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    const path = findPath(graph, at(1, 0), at(1, 0), human);
    expect(path).toMatchObject({ complete: true, cost: 0 });
    expect(path.tiles).toEqual([at(1, 0)]);
  });

  it('geht um eine Wand herum, statt durch sie hindurch', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 3 });
    for (const z of [0, 1]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(4, 0), human);
    expect(path.complete).toBe(true);
    // Der einzige Durchlass ist die untere Reihe: der Weg muss dort entlang.
    expect(path.tiles.some((key) => keyZ(key) === 2)).toBe(true);
  });

  it('gibt den besten Teilweg zurück, wenn es keinen ganzen gibt', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 1 });
    graph.setWall(at(3, 0), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(5, 0), human);
    expect(path.complete).toBe(false);
    // Bis vor die Wand, und dort stehen bleiben — nicht auf der Stelle.
    expect(path.tiles[path.tiles.length - 1]).toBe(at(3, 0));
  });

  it('meldet gar nichts, wenn schon der Start nicht begehbar ist', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    graph.setBlocked(at(0, 0), true);
    expect(findPath(graph, at(0, 0), at(2, 0), human).tiles).toEqual([]);
  });
});

describe('Dieselbe Karte, zwei Sorten', () => {
  /** Ein Gang mit einer Stachelgrube in der Mitte, oben und unten Platz. */
  function pit(): NavGraph {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const x of [2, 3, 4]) {
      graph.setTile(at(x, 1), { hazard: HAZARD_SPIKES });
    }
    return graph;
  }

  const spiked = (graph: NavGraph, key: number): boolean =>
    (graph.tile(key)?.hazard ?? 0) === HAZARD_SPIKES;

  it('lässt den Zombie in die Grube laufen', () => {
    const graph = pit();
    const path = findPath(graph, at(0, 1), at(6, 1), zombie);
    expect(path.complete).toBe(true);
    expect(path.tiles).toHaveLength(7);
    expect(path.tiles.some((key) => spiked(graph, key))).toBe(true);
  });

  it('lässt den Menschen darum herumgehen', () => {
    const graph = pit();
    const path = findPath(graph, at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.tiles.some((key) => spiked(graph, key))).toBe(false);
    // Der Umweg kostet zwei Kacheln mehr, und mehr auch nicht.
    expect(path.cost).toBeCloseTo(8 * TILE, 9);
  });

  it('unterscheidet „lieber nicht" von „niemals"', () => {
    // Wasser ist dem Menschen acht Meter Umweg wert. Ist der Umweg länger,
    // geht er hindurch — anders als bei den Stacheln, wo er es nie tut.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    graph.setTile(at(1, 0), { hazard: 1 << 2 });
    const path = findPath(graph, at(0, 0), at(2, 0), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(2 * TILE + 8, 9);
  });
});

describe('Türen', () => {
  /**
   * Zwei Räume, dazwischen eine Wand mit einer einzigen Tür.
   *
   * **Aus Metall, wenn nichts anderes dasteht** — und zwar hier im Test, damit
   * jede Behauptung über „geschlossen heißt zu" nur von der einen Sache
   * handelt, um die es ihr geht. Holz ist die interessantere Tür und bekommt
   * unten seine eigenen Zeilen.
   */
  function house(open: boolean, barred = false, material: DoorMaterial = 'metal'): NavGraph {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const z of [0, 1, 2]) graph.setWall(at(3, z), DIR_E, { kind: 'solid' });
    setDoor(graph, at(3, 1), DIR_E, 'tuer-7', open, material);
    if (barred) graph.setDoor('tuer-7', { barred: true });
    return graph;
  }

  it('geht durch die offene Tür, ohne Aufschlag', () => {
    const path = findPath(house(true), at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(6 * TILE, 9);
  });

  it('macht die geschlossene auf und bezahlt dafür', () => {
    const path = findPath(house(false), at(0, 1), at(6, 1), human);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(6 * TILE + DOOR_COST, 9);
  });

  it('lässt den Zombie vor der geschlossenen Metalltür stehen', () => {
    const graph = house(false);
    const path = findPath(graph, at(0, 1), at(6, 1), zombie);
    expect(path.complete).toBe(false);
    expect(keyX(path.tiles[path.tiles.length - 1]!)).toBe(3);
  });

  it('macht aus der verbarrikadierten Metalltür für alle eine Wand', () => {
    expect(findPath(house(false, true), at(0, 1), at(6, 1), human).complete).toBe(false);
  });

  it('schlägt die hölzerne ein — und bezahlt mehr dafür als der, der aufmacht', () => {
    // **Die eine Zeile, wegen der es Material gibt.** Dieselbe geschlossene
    // Tür, dasselbe Haus: Für den Zombie ist die Metalltür eine Wand und die
    // Holztür ein Weg, der eben etwas kostet.
    const wood = house(false, false, 'wood');
    const path = findPath(wood, at(0, 1), at(6, 1), zombie);
    expect(path.complete).toBe(true);
    expect(path.cost).toBeCloseTo(6 * TILE + doorSpec('wood').breakCost, 9);
    // Und der Mensch tritt sie **nicht** ein, obwohl er könnte: Er hat eine
    // Klinke, und die ist billiger.
    expect(findPath(wood, at(0, 1), at(6, 1), human).cost).toBeCloseTo(6 * TILE + DOOR_COST, 9);
  });

  it('hält auch eine verbarrikadierte Holztür nicht auf, wenn einer zuschlägt', () => {
    // Eine Barrikade ist etwas, das man **vor** eine Tür stellt, und der
    // Zombie schlägt beides zusammen kurz und klein. Für den Menschen bleibt
    // sie eine Wand — er hat nur die Klinke, und die nützt hier nichts.
    const wood = house(false, true, 'wood');
    expect(findPath(wood, at(0, 1), at(6, 1), zombie).complete).toBe(true);
    expect(findPath(wood, at(0, 1), at(6, 1), human).complete).toBe(false);
  });

  it('macht aus der eingeschlagenen Tür ein Loch, durch das jeder geht', () => {
    const wood = house(false, true, 'wood');
    expect(wood.hitDoor('tuer-7', doorSpec('wood').health)).toBe(true);
    // Kein Aufschlag mehr, für niemanden: Wo das Blatt hing, ist jetzt nichts.
    expect(findPath(wood, at(0, 1), at(6, 1), human).cost).toBeCloseTo(6 * TILE, 9);
    expect(findPath(wood, at(0, 1), at(6, 1), zombie).cost).toBeCloseTo(6 * TILE, 9);
  });
});

describe('Verbindungen', () => {
  it('nimmt das Portal, weil es fast nichts kostet', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    fillRect(graph, { x: 20, z: 0, w: 3, d: 3 });
    expect(findPath(graph, at(1, 1), at(21, 1), human).complete).toBe(false);

    addPortal(graph, 'portal-3', at(1, 1), at(21, 1));
    const path = findPath(graph, at(1, 1), at(21, 1), human);
    expect(path.complete).toBe(true);
    expect(path.tiles).toEqual([at(1, 1), at(21, 1)]);
  });

  it('steigt die Treppe, aber nur, wer es kann', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4, level: 1 });
    connect(graph, 'treppe', at(3, 3, 0), at(3, 3, 1), 'stairs');

    const up = findPath(graph, at(0, 0, 0), at(0, 0, 1), human);
    expect(up.complete).toBe(true);
    expect(up.tiles.some((key) => keyLevel(key) === 1)).toBe(true);

    // Ein Fahrzeug nimmt keine Treppe — dieselbe Karte, kein Weg.
    const car: { profile: CostProfile } = { profile: VEHICLE_PROFILE };
    expect(findPath(graph, at(0, 0, 0), at(0, 0, 1), car).complete).toBe(false);
  });

  it('lässt einen Absprung nur in eine Richtung zu', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1, level: 1 });
    connect(graph, 'kante', at(0, 0, 1), at(0, 0, 0), 'drop');
    expect(findPath(graph, at(1, 0, 1), at(1, 0, 0), human).complete).toBe(true);
    expect(findPath(graph, at(1, 0, 0), at(1, 0, 1), human).complete).toBe(false);
  });
});

describe('Die Glättung', () => {
  it('macht aus dem Treppenmuster eine Linie', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    const path = findPath(graph, at(0, 0), at(5, 5), human);
    expect(path.tiles.length).toBeGreaterThan(2);
    expect(smoothPath(graph, path.tiles, human)).toEqual([at(0, 0), at(5, 5)]);
  });

  it('lässt die Ecke stehen, um die wirklich herumgelaufen wird', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    for (const z of [0, 1, 2, 3]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const path = findPath(graph, at(0, 0), at(5, 0), human);
    const smooth = smoothPath(graph, path.tiles, human);
    expect(smooth.length).toBeGreaterThan(2);
    // Und keine der übrig gebliebenen Strecken darf durch die Wand gehen.
    for (let i = 1; i < smooth.length; i++) {
      expect(findPath(graph, smooth[i - 1]!, smooth[i]!, human).complete).toBe(true);
    }
  });

  it('kürzt nicht über eine Treppe hinweg ab', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1, level: 1 });
    connect(graph, 'treppe', at(3, 0, 0), at(3, 0, 1), 'stairs');
    const path = findPath(graph, at(0, 0, 0), at(0, 0, 1), human);
    const smooth = smoothPath(graph, path.tiles, human);
    // Beide Enden der Treppe müssen stehen bleiben, sonst läuft er durch die Decke.
    expect(smooth).toContain(at(3, 0, 0));
    expect(smooth).toContain(at(3, 0, 1));
  });

  it('lässt einen Weg aus zwei Punkten in Ruhe', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 2, d: 1 });
    expect(smoothPath(graph, [at(0, 0), at(1, 0)], human)).toEqual([at(0, 0), at(1, 0)]);
  });
});

describe('Der Schnurzug', () => {
  /** Die Länge eines Wegs aus Punkten, in Metern. */
  function walked(points: readonly PathPoint[]): number {
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      sum += Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
    }
    return sum;
  }

  /** Wie nah ein Weg an einem Punkt vorbeikommt — Strecke für Strecke. */
  function closestTo(points: readonly PathPoint[], x: number, z: number): number {
    let best = Infinity;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!;
      const b = points[i]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const length = dx * dx + dz * dz;
      const t =
        length < 1e-9 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length));
      best = Math.min(best, Math.hypot(a.x + dx * t - x, a.z + dz * t - z));
    }
    return best;
  }

  /** Der geglättete Weg von hier nach dort, für einen mit diesem Halbmesser. */
  function pull(graph: NavGraph, from: number, to: number, radius: number): PathPoint[] {
    const options = { ...human, radius };
    return pullString(graph, findPath(graph, from, to, options).tiles, options);
  }

  it('zieht die Diagonale durch den Saal, statt über die Kachelmitten zu treppen', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    const points = pull(graph, at(0, 0), at(5, 5), 0.3);
    // Zwei Punkte, und dazwischen genau die Luftlinie: Das ist der ganze
    // Unterschied zwischen „Manhattan" und einem Weg.
    expect(points).toHaveLength(2);
    expect(walked(points)).toBeCloseTo(Math.hypot(5, 5) * TILE, 9);
  });

  it('hält an der Hausecke den Halbmesser Abstand', () => {
    // Eine Wand mit einem Ende mitten im Feld: Der Weg muss um ihre Spitze
    // herum, und für einen Zylinder ist eine Linie, die sie streift, eine Wand.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    for (const z of [0, 1, 2]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    // Die Spitze der Wand: die Ecke zwischen den Kacheln (2,2) und (2,3).
    const tip = { x: 3 * TILE, z: 3 * TILE };

    // Gemessen wird die **Strecke** und nicht der Wegpunkt: Zwischen zwei
    // Punkten neben derselben Ecke liegt die Sehne, und die kommt ihr näher
    // als beide (`shrinkFor`).
    const points = pull(graph, at(0, 0), at(5, 0), 0.3);
    expect(closestTo(points, tip.x, tip.z)).toBeGreaterThanOrEqual(0.3);
    // Und wer dicker ist, geht weiter außen herum.
    const wide = pull(graph, at(0, 0), at(5, 0), 0.5);
    expect(closestTo(wide, tip.x, tip.z)).toBeGreaterThanOrEqual(0.5);
    expect(closestTo(wide, tip.x, tip.z)).toBeGreaterThan(closestTo(points, tip.x, tip.z));
    expect(walked(wide)).toBeGreaterThan(walked(points));
  });

  it('hält über den eigenen Umfang hinaus noch etwas Luft zur Wand', () => {
    // **Die Zentimeter, wegen denen einer nicht mehr an der Kante hängt.**
    //
    // Vorher zog die Schnur genau um Halbmesser und Wandstärke ein: Auf dem
    // Papier passt der Zylinder damit haargenau vorbei, in der Welt schrammt
    // er entlang — Rapier drückt ihn bei jeder Berührung zur Seite, das Hirn
    // zieht ihn zurück auf die Linie, und was man sieht, ist ein Zombie, der
    // sich an einer Hausecke festfrisst. `NAV_CLEARANCE` ist dieselbe Idee wie
    // eine Navmesh, die vom Rand abrückt, nur in der Linie statt in der Fläche.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 6, d: 6 });
    for (const z of [0, 1, 2]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const tip = { x: 3 * TILE, z: 3 * TILE };

    const options = { ...human, radius: 0.3 };
    const tiles = findPath(graph, at(0, 0), at(5, 0), options).tiles;
    const roomy = pullString(graph, tiles, options);
    const bare = pullString(graph, tiles, { ...options, clearance: 0 });
    expect(closestTo(roomy, tip.x, tip.z)).toBeGreaterThan(closestTo(bare, tip.x, tip.z));
    // Und was am Ende zählt, ist der Abstand zum **Klotz** und nicht zur Linie:
    // Eine Wand steht zur Hälfte auf jeder Seite ihrer Kachelgrenze
    // (`WALL_SKIN`), und erst dahinter fängt die Luft an.
    expect(closestTo(roomy, tip.x, tip.z)).toBeGreaterThan(0.3 + WALL_SKIN);
  });

  it('bleibt in den Kacheln, die die Suche gefunden hat', () => {
    // Die Stachelgrube: Der Mensch plant außen herum, und die Schnur darf ihn
    // nicht wieder hineinziehen — auch nicht mit einem Fuß auf der Kante.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const x of [2, 3, 4]) graph.setTile(at(x, 1), { hazard: HAZARD_SPIKES });
    const points = pull(graph, at(0, 1), at(6, 1), 0.3);
    for (const point of points) {
      expect(graph.tile(point.tile)?.hazard ?? 0).toBe(0);
      // Und nicht nur nicht **auf** der Grube: Wer mit einem Fuß hineinragt,
      // steht in ihr. Die drei Stachelkacheln liegen zwischen x = 5 und
      // x = 12,5, z = 2,5 und z = 5.
      const dx = Math.max(5 - point.x, point.x - 12.5, 0);
      const dz = Math.max(2.5 - point.z, point.z - 5, 0);
      expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('lässt beide Enden einer Treppe stehen', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 4, d: 1, level: 1 });
    connect(graph, 'treppe', at(3, 0, 0), at(3, 0, 1), 'stairs');
    const points = pull(graph, at(0, 0, 0), at(0, 0, 1), 0.3);
    const tiles = points.map((point) => point.tile);
    expect(tiles).toContain(at(3, 0, 0));
    expect(tiles).toContain(at(3, 0, 1));
    // Und die beiden liegen wirklich übereinander: über eine Verbindung wird
    // nicht geglättet, also bleibt ihre Kachelmitte stehen.
    const up = points[tiles.indexOf(at(3, 0, 1))]!;
    expect(up.x).toBeCloseTo(tileCentreX(at(3, 0, 1)), 9);
    expect(up.z).toBeCloseTo(tileCentreZ(at(3, 0, 1)), 9);
  });

  it('glättet nicht über eine Stufe hinweg, an der eine Treppe hängt', () => {
    // Zwei Nachbarn auf derselben Etage, dazwischen eine Wand und daneben eine
    // Treppe: die Stufe, die zu hoch zum Hinauftreten ist (`navBake.ts`). Wer
    // hier durchglättet, schickt den Läufer geradeaus dagegen — er sieht die
    // Verbindung nie und springt deshalb nie.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 1, d: 4 });
    graph.setTile(at(0, 2), { rise: 0.8 });
    graph.setTile(at(0, 3), { rise: 0.8 });
    graph.setWall(at(0, 1), DIR_S, { kind: 'solid' });
    connect(graph, 'stufe', at(0, 1), at(0, 2), 'stairs');
    const tiles = pull(graph, at(0, 0), at(0, 3), 0.3).map((point) => point.tile);
    expect(tiles).toContain(at(0, 1));
    expect(tiles).toContain(at(0, 2));
  });

  it('nimmt einen Weg aus einer einzigen Kachel, ohne zu stolpern', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    expect(pullString(graph, [], human)).toEqual([]);
    expect(pullString(graph, [at(1, 0)], human)).toEqual([
      { tile: at(1, 0), x: tileCentreX(at(1, 0)), z: tileCentreZ(at(1, 0)), tight: false },
    ]);
  });

  it('kommt durch eine Lücke, die kaum breiter ist als er selbst', () => {
    // Ein Durchlass von einer Kachel, an beiden Enden eingezogen: Was übrig
    // bleibt, muss ein Weg sein und keine Schleife.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 3 });
    for (const z of [0, 2]) graph.setWall(at(2, z), DIR_E, { kind: 'solid' });
    const points = pull(graph, at(0, 1), at(4, 1), 1.2);
    expect(points[points.length - 1]!.tile).toBe(at(4, 1));
    // Und er läuft wirklich hindurch: keine Strecke geht rückwärts.
    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.x).toBeGreaterThanOrEqual(points[i - 1]!.x - 1e-9);
    }
  });
});

describe('Die Ecke', () => {
  it('kennt das Kopfende einer Wand als Ecke, obwohl vier Seiten frei sind', () => {
    // Die Frage, die der Schnurzug an jedem Durchlass stellt und die die
    // Debug-Ansicht an jeder Kachel stellt (`navScene.ts`, Ebene *Betretbar*).
    // Sie zu teilen ist der ganze Zweck: Zwei Antworten darauf wären eine
    // Ansicht, die etwas anderes zeigt, als gelaufen wird.
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 4, d: 4 });
    // Ein Wandstück von einer Kachel Länge — es endet an der Ecke, an der die
    // Kacheln (1|2, 0|1) zusammenstoßen.
    graph.setWall(at(1, 0), DIR_E, { kind: 'solid' });

    // Die Kachel südöstlich davon ist auf **allen vier Seiten** frei …
    for (const dir of [DIR_N, DIR_E, DIR_S, DIR_W] as const) {
      expect(graph.wall(at(2, 1), dir)).toBeUndefined();
    }
    // … und trotzdem steht in ihrer Nordwestecke das Ende der Wand.
    expect(cornerBlocked(graph, at(2, 1), DIR_W, DIR_N)).toBe(true);
    expect(cornerBlocked(graph, at(1, 1), DIR_E, DIR_N)).toBe(true);
    // Die anderen Ecken derselben Kachel sind offenes Feld.
    expect(cornerBlocked(graph, at(2, 1), DIR_E, DIR_S)).toBe(false);
    expect(cornerBlocked(graph, at(2, 1), DIR_W, DIR_S)).toBe(false);
  });

  it('nennt den Rand der Karte eine Ecke — dahinter ist kein Boden', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 3, d: 3 });
    expect(cornerBlocked(graph, at(0, 0), DIR_W, DIR_N)).toBe(true);
    expect(cornerBlocked(graph, at(1, 1), DIR_E, DIR_S)).toBe(false);
    // Und eine Kiste tut dasselbe wie eine fehlende Kachel.
    graph.setBlocked(at(2, 2), true);
    expect(cornerBlocked(graph, at(1, 1), DIR_E, DIR_S)).toBe(true);
  });
});

describe('Das Strömungsfeld', () => {
  it('führt von überall zum Ziel', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 8, d: 8 });
    const goal = at(7, 7);
    const field = flowField(graph, [goal], human);
    for (const start of [at(0, 0), at(0, 7), at(4, 2)]) {
      const walk = flowPath(field, start);
      expect(walk[walk.length - 1]).toBe(goal);
    }
  });

  it('kennt die Kosten von jeder Kachel aus', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    const field = flowField(graph, [at(4, 0)], human);
    expect(field.cost.get(at(0, 0))).toBeCloseTo(4 * TILE, 9);
    expect(field.cost.get(at(4, 0))).toBe(0);
  });

  it('umgeht die Gefahren desselben Profils wie die Einzelsuche', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 7, d: 3 });
    for (const x of [2, 3, 4]) graph.setTile(at(x, 1), { hazard: HAZARD_SPIKES });
    const field = flowField(graph, [at(6, 1)], human);
    const walk = flowPath(field, at(0, 1));
    expect(walk.some((key) => keyZ(key) === 1 && keyX(key) === 3)).toBe(false);
    expect(walk[walk.length - 1]).toBe(at(6, 1));
  });

  it('lässt die Horde keine Klippe hochlaufen', () => {
    const graph = new NavGraph([0, 3.1]);
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1 });
    fillRect(graph, { x: 0, z: 0, w: 3, d: 1, level: 1 });
    connect(graph, 'kante', at(0, 0, 1), at(0, 0, 0), 'drop');
    // Ziel unten: von oben kommt man herunter.
    expect(flowField(graph, [at(2, 0, 0)], human).cost.has(at(2, 0, 1))).toBe(true);
    // Ziel oben: von unten kommt man nicht hinauf.
    expect(flowField(graph, [at(2, 0, 1)], human).cost.has(at(2, 0, 0))).toBe(false);
  });

  it('sperrt eine Kachel aus, auf der etwas steht', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 5, d: 1 });
    graph.setBlocked(at(2, 0), true);
    const field = flowField(graph, [at(4, 0)], human);
    expect(field.cost.has(at(0, 0))).toBe(false);
    expect(field.cost.has(at(3, 0))).toBe(true);
  });
});

describe('Die Reißleine', () => {
  it('hört nach so vielen Kacheln auf und liefert trotzdem etwas', () => {
    const graph = new NavGraph();
    fillRect(graph, { x: 0, z: 0, w: 60, d: 60 });
    const path = findPath(graph, at(0, 0), at(59, 59), { ...human, maxNodes: 50 });
    expect(path.complete).toBe(false);
    expect(path.visited).toBeLessThanOrEqual(50);
    expect(path.tiles.length).toBeGreaterThan(1);
  });
});
