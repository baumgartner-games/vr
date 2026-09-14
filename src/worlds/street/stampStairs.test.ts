import type { GridPlan } from '../grid/gridPlan';
import { flowField } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { keyLevel, tileKey, type TileKey } from '../nav/navTile';
import { PODIUM, SPAWN, STAIRS, streetPlan, tileX, tileZ } from './streetPlan';
import { LAMP_ID } from './stampStairs';

const plan = streetPlan();
const at = (col: number, row: number, level = 0): TileKey => tileKey(tileX(col), tileZ(row), level);
const spawn = at(SPAWN.col, SPAWN.row);
const podium = PODIUM.map((cell) => at(cell.col, cell.row, 1));

/** Von wo aus überall man hinkommt — ein Feld, alle Kacheln auf einmal. */
function reachable(from: GridPlan = plan): Set<TileKey> {
  return new Set(flowField(from.graph, [spawn], { profile: HUMAN_PROFILE }).cost.keys());
}

describe('Das Podest der Straßenküche', () => {
  it('legt die sechs Kacheln der Zeichnung auf die zweite Etage', () => {
    expect(podium).toHaveLength(6);
    for (const tile of podium) {
      expect(plan.graph.has(tile)).toBe(true);
      expect(keyLevel(tile)).toBe(1);
    }
    // Und sonst liegt oben nichts: Was über der Treppe wäre, ist ihr Loch.
    const upstairs = [...plan.graph.tileKeys()].filter((key) => keyLevel(key) === 1);
    expect(upstairs.sort()).toEqual([...podium].sort());
  });

  it('steht auf Säulen, unter denen man hindurchläuft', () => {
    const pillars = plan.blocks().filter((one) => one.kind === 'pillar');
    expect(pillars).toHaveLength(4);
    for (const pillar of pillars) {
      expect(keyLevel(pillar.tile)).toBe(0);
      // Die Kachel darunter bleibt begehbar — sonst sähe man beim Aufschneiden
      // nur eine geschlossene Wand statt des Bodens.
      expect(plan.graph.walkable(pillar.tile)).toBe(true);
    }
  });

  it('zieht eine Brüstung um den Rand und lässt die Treppe frei', () => {
    const rails = plan.blocks().filter((one) => one.kind === 'parapet');
    // Drei im Norden, drei im Süden, zwei im Westen, eine im Osten — die
    // Ostkante der Ankunftskachel bleibt offen.
    expect(rails).toHaveLength(9);
    for (const rail of rails) expect(keyLevel(rail.tile)).toBe(1);
    const landing = at(STAIRS.col - 1, STAIRS.row, 1);
    expect(rails.some((one) => one.tile === landing && one.dir === 1)).toBe(false);
  });

  /**
   * **Der Test, wegen dem die Treppe drei Sachen ist.**
   *
   * Der Baustein allein ist eine Rampe, die im Graphen nicht existiert: Ein NPC
   * stünde davor und wüsste nicht, dass es nach oben geht — Stockwerke haben in
   * diesem Gitter absichtlich keine Nachbarschaft. Hier steht beides
   * nebeneinander: mit dem Weg im Graphen kommt man hinauf, ohne ihn nicht.
   */
  it('macht das Podest vom Startplatz aus erreichbar — und ohne die Treppe nicht', () => {
    const stairs = at(STAIRS.col, STAIRS.row);
    const withStairs = reachable();
    for (const tile of podium) expect(withStairs.has(tile)).toBe(true);
    expect(plan.blocksOn(stairs).some((one) => one.kind === 'stairs')).toBe(true);

    // Denselben Grundriss ohne den Weg nach oben: Das Podest ist dann eine
    // Insel, obwohl die Stufen weiter dastehen. Auf einer eigenen Ausfertigung,
    // damit die anderen Prüfungen ihre Welt heil vorfinden.
    const cut = streetPlan();
    expect(cut.graph.removeLink(`treppe:${stairs}`)).toBe(true);
    const without = reachable(cut);
    for (const tile of podium) expect(without.has(tile)).toBe(false);
  });
});

describe('Der Hebel auf dem Podest', () => {
  it('steht oben und zeigt auf die Lampe über der Kreuzung', () => {
    const lever = plan.fixture('hebel-podest');
    expect(lever).not.toBeNull();
    expect(lever!.kind).toBe('lever');
    expect(lever!.level).toBe(1);
    expect(lever!.props.target).toBe(LAMP_ID);
    // Er steht nicht auf der Kachel, auf der die Treppe mündet.
    expect(tileKey(lever!.x, lever!.z, 1)).not.toBe(at(STAIRS.col - 1, STAIRS.row, 1));
  });
});
