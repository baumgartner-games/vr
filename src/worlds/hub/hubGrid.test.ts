import { flowField, findPath } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { fixtureTile } from '../grid/gridPlan';
import { DIRS, TILE, dirX, dirZ, neighbour, opposite, tileKey } from '../nav/navTile';
import {
  CORRIDORS,
  CORRIDOR_WIDTH,
  GATES_PER_CORRIDOR,
  HALL_HALF,
  corridorCount,
  gatesPerCorridor,
  hubGates,
  hubGrid,
} from './hubGrid';

/**
 * So viele Tore prüft dieser Test — **eine feste Zahl und nicht die Länge der
 * Weltenliste**.
 *
 * Geprüft wird hier die Auslegung und nicht die Registry: Ein Grundriss, der
 * bei fünf Welten stimmt und bei sechs nicht, ist ohnehin kaputt, und dafür
 * gibt es den Test weiter unten, der die Zahl hochzählt. Dass die Zahl fest
 * ist, hält diese Datei davon ab, bei jeder gelöschten oder neuen Welt rot zu
 * werden — und genau das ist hier gerade zweimal passiert.
 */
const TARGETS = 6;

describe('Die Hub-Auslegung auf dem Gitter', () => {
  it('kommt mit gar keiner Welt zurecht', () => {
    const hub = hubGrid(0);
    expect(hub.gates).toHaveLength(0);
    expect(corridorCount(0)).toBe(0);
    // Die Halle steht trotzdem, und man steht darin.
    expect(hub.plan.graph.has(hub.spawn)).toBe(true);
  });

  it('macht einen neuen Gang auf, wenn der alte voll ist', () => {
    expect(corridorCount(1)).toBe(1);
    expect(corridorCount(GATES_PER_CORRIDOR)).toBe(1);
    expect(corridorCount(GATES_PER_CORRIDOR + 1)).toBe(2);
    expect(corridorCount(GATES_PER_CORRIDOR * 4)).toBe(4);
  });

  /**
   * Vier Richtungen sind alles, was ein Kachelgitter hat. Über sechzehn Welten
   * werden die Gänge deshalb **länger** statt zahlreicher — ein fünfter Gang
   * wäre einer, dessen Wände zwischen den Kacheln lägen.
   */
  it('verlängert die Gänge, statt einen fünften aufzumachen', () => {
    expect(corridorCount(GATES_PER_CORRIDOR * 4 + 1)).toBe(4);
    expect(gatesPerCorridor(GATES_PER_CORRIDOR * 4)).toBe(GATES_PER_CORRIDOR);
    expect(gatesPerCorridor(GATES_PER_CORRIDOR * 4 + 1)).toBe(GATES_PER_CORRIDOR + 1);
    expect(hubGates(24)).toHaveLength(24);
    expect(hubGrid(24).reach).toBeGreaterThan(hubGrid(8).reach);
  });

  it('behält die Reihenfolge der Registry', () => {
    expect(hubGates(9).map((gate) => gate.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('stellt zwei Tore je Seite auf, gegeneinander versetzt', () => {
    // Ein voller Gang: zwei rechts, zwei links, und keine zwei auf gleicher
    // Höhe — sonst steht man zwischen zwei Schildern und liest keines.
    const gates = hubGates(GATES_PER_CORRIDOR);
    const dir = CORRIDORS[0]!;
    const along = gates.map((gate) => gate.x * dirX(dir) + gate.z * dirZ(dir));
    const across = gates.map((gate) => gate.x * dirX(right(dir)) + gate.z * dirZ(right(dir)));
    expect(across.filter((one) => one > 0)).toHaveLength(2);
    expect(across.filter((one) => one < 0)).toHaveLength(2);
    expect(new Set(along).size).toBe(GATES_PER_CORRIDOR);
  });

  it('lässt jedes Tor in seinem Gang stehen und zur Halle schauen', () => {
    for (const count of [1, 5, 9, TARGETS, 17]) {
      for (const gate of hubGates(count)) {
        const dir = CORRIDORS[gate.corridor]!;
        const along = gate.x * dirX(dir) + gate.z * dirZ(dir);
        const across = gate.x * dirX(right(dir)) + gate.z * dirZ(right(dir));
        expect(along).toBeGreaterThan(HALL_HALF);
        expect(Math.abs(across)).toBeLessThanOrEqual((CORRIDOR_WIDTH - 1) / 2);
        expect(gate.dir).toBe(opposite(dir));
      }
    }
  });

  it('stellt keine zwei Tore auf eine Kachel', () => {
    const seen = new Set<string>();
    for (const gate of hubGates(24)) {
      const key = `${gate.x},${gate.z}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('legt bei gleicher Zahl immer dasselbe hin', () => {
    expect(hubGates(7)).toEqual(hubGates(7));
  });
});

describe('Der Hub als Grundriss', () => {
  const hub = hubGrid(TARGETS);

  it('setzt einen Einbau je Welt, und zwar ein Tor', () => {
    const fixtures = hub.plan.fixtures();
    expect(fixtures).toHaveLength(TARGETS);
    expect(fixtures.every((one) => one.kind === 'gate')).toBe(true);
    // Die Kennungen sind vergeben und nicht gewachsen: `HubWorld` trägt die
    // Welt hinter jedes Tor ein und braucht dafür einen festen Namen.
    expect(new Set(fixtures.map((one) => one.id)).size).toBe(TARGETS);
  });

  it('lässt den Startpunkt frei', () => {
    expect(hub.plan.graph.has(hub.spawn)).toBe(true);
    expect(hub.plan.fixturesOn(hub.spawn)).toHaveLength(0);
    // Und er liegt in der Halle, nicht in einem Gang.
    expect(hub.spawn).toBe(tileKey(0, 0, 0));
  });

  /**
   * **Der Test, wegen dem diese Datei ohne three.js auskommt.**
   *
   * Ein Tor hinter einer Wand merkt man sonst erst, wenn man davorsteht — nach
   * dem Laden, nach dem Aufsetzen, nach dem Hinlaufen. Gefragt wird über den
   * Graphen, also genau so, wie später ein NPC fragen würde.
   */
  it('lässt einen vom Startpunkt zu jedem Tor laufen', () => {
    const field = flowField(hub.plan.graph, [hub.spawn], { profile: HUMAN_PROFILE });
    for (const place of hub.plan.fixtures()) {
      const tile = fixtureTile(place);
      expect(field.cost.has(tile)).toBe(true);
      const path = findPath(hub.plan.graph, hub.spawn, tile, { profile: HUMAN_PROFILE });
      expect(path.complete).toBe(true);
    }
  });

  it('lässt jede einzelne Kachel vom Startpunkt aus erreichen', () => {
    // Nicht nur die Tore: Eine Kachel, die keinen Anschluss hat, ist ein Stück
    // Gang hinter einer Wand, das beim Bauen Geometrie kostet und nichts tut.
    const field = flowField(hub.plan.graph, [hub.spawn], { profile: HUMAN_PROFILE });
    for (const key of hub.plan.graph.tileKeys()) expect(field.cost.has(key)).toBe(true);
  });

  /**
   * **Kein Dach**, weder über der Halle noch über den Gängen.
   *
   * Von oben wäre ein gedeckelter Gang ein schwarzer Balken. Aufgeschnitten
   * wird zwar (`core/cutaway.ts`), aber ein Deckel, den man ohnehin jedes Bild
   * wieder wegnimmt, muss gar nicht erst stehen — und über dem Hub ist Himmel
   * das Erste, was man beim Ankommen sieht.
   */
  it('baut kein Dach', () => {
    expect(hub.plan.masses()).toHaveLength(0);
  });

  it('hält jeden Gang mindestens zwei Kacheln breit', () => {
    // Zwei ist die Untergrenze: Ein Gang mit einer Kachel wäre einer, in dem
    // ein Tor den Weg versperrt. Gebaut sind es drei.
    expect(CORRIDOR_WIDTH).toBeGreaterThanOrEqual(2);
    // Und in Metern: drei Kacheln zu einem Meter, davon eine Handbreit für die
    // Wände — es bleiben 2,8 m lichte Weite, in denen zwei aneinander
    // vorbeikommen.
    expect(CORRIDOR_WIDTH * TILE).toBeGreaterThanOrEqual(2.5);
  });

  it('mauert die Anlage zu, lässt aber jede Gangmündung offen', () => {
    for (const key of hub.plan.graph.tileKeys()) {
      for (const dir of DIRS) {
        const next = neighbour(key, dir);
        const wall = hub.plan.graph.wall(key, dir);
        // Kein Boden dahinter heißt Wand davor …
        if (!hub.plan.graph.has(next)) expect(wall?.kind).toBe('solid');
        // … und Boden dahinter heißt: keine.
        else expect(wall).toBeUndefined();
      }
    }
  });

  it('wächst mit der Weltenliste, ohne dass jemand eine Zahl anfasst', () => {
    // Genau der Punkt der Sache: Eine neue Welt in `worlds/index.ts` ist ein
    // Eintrag in der Registry und sonst nichts.
    for (const count of [2, 3, 4, 5, 6, 7]) {
      expect(hubGrid(count).gates).toHaveLength(count);
      expect(hubGrid(count).plan.fixtures()).toHaveLength(count);
    }
  });
});

/** Quer zur Gangrichtung, nach rechts — dieselbe Rechnung wie im Grundriss. */
function right(dir: number): 0 | 1 | 2 | 3 {
  return ((dir + 1) % 4) as 0 | 1 | 2 | 3;
}
