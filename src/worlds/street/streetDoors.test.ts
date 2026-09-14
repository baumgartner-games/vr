import { flowField } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { tileKey, type TileKey } from '../nav/navTile';
import {
  CRATE_COL,
  DOORS,
  DOOR_WALL,
  LAMP,
  LAMP_ID,
  LAMP_SWITCH,
  TRIGGER_COL,
  yardCells,
} from './stampDoors';
import { CRATES, MARKS, SPAWN, markAt, streetPlan, tileX, tileZ } from './streetPlan';

const at = (col: number, row: number, level = 0): TileKey => tileKey(tileX(col), tileZ(row), level);
const spawn = at(SPAWN.col, SPAWN.row);

/**
 * **Wer nicht aufmachen kann.** Das Profil des Menschen öffnet Türen im Gehen
 * (`HUMAN_PROFILE.opens`) — für die Wegsuche eines NPCs ist das richtig, für
 * diese Frage nicht: Wissen wollen wir, ob die Wand wirklich *trennt*, also ob
 * jemand hinter sie kommt, ohne die Tür geöffnet zu haben. Genau das ist
 * `canOpen: false`.
 */
const SHUT = { profile: HUMAN_PROFILE, canOpen: false } as const;

/** Auf welche Kacheln man vom Startplatz aus kommt, ohne eine Tür anzufassen. */
function reached(plan = streetPlan()): Set<TileKey> {
  return new Set(flowField(plan.graph, [spawn], SHUT).cost.keys());
}

describe('Die Türwand der Straßenküche', () => {
  it('stellt drei Türen in eine Spalte, jede mit ihrem Auslöser davor', () => {
    const plan = streetPlan();
    const doors = plan.fixtures().filter((one) => one.kind === 'door');
    expect(doors).toHaveLength(3);

    for (const spot of DOORS) {
      const door = plan.fixture(spot.door);
      expect(door).not.toBeNull();
      expect(door!.x).toBe(tileX(DOOR_WALL.col));
      expect(door!.z).toBe(tileZ(spot.row));
      expect(door!.props.mode).toBe(spot.mode);

      // Der Auslöser steht eine Kachel östlich und zeigt auf genau diese Tür.
      const control = plan.fixture(spot.trigger);
      expect(control).not.toBeNull();
      expect(control!.kind).toBe(spot.kind);
      expect(control!.x).toBe(tileX(TRIGGER_COL));
      expect(control!.z).toBe(tileZ(spot.row));
      expect(control!.props.target).toBe(spot.door);
    }
  });

  /**
   * Zwei Kisten neben der Platte, und sie stehen in der Zeichnung (`MAP`) und
   * nicht hier: Eine Kiste ist ein **Gegenstand** mit eigenem Körper, den die
   * Welt aus der Zeichnung baut (`StreetWorld.buildProps`) — der Grundriss
   * kennt sie gar nicht.
   */
  it('legt zwei Kisten neben die Druckplatte', () => {
    const plate = DOORS.find((one) => one.kind === 'plate')!;
    const near = CRATES.filter(
      (cell) => cell.col === CRATE_COL && Math.abs(cell.row - plate.row) <= 1,
    );
    expect(near).toHaveLength(2);
    for (const cell of near) expect(markAt(cell.col, cell.row)).toBe(MARKS.crate);
  });

  /**
   * **Der Test, wegen dem die Wand überhaupt eine Wand ist.**
   *
   * Eine Tür, an der man vorbeigehen kann, ist ein Möbelstück. Also: Ist der
   * Hof mit geschlossenen Türen unerreichbar — und mit einer geöffneten
   * erreichbar? Beides in Millisekunden, statt dass es jemand im Headset
   * nachläuft.
   */
  it('lässt hinter die Wand nur, wer eine Tür aufgemacht hat', () => {
    const shut = reached();
    for (const cell of yardCells()) {
      expect(plainly(cell.col, cell.row)).toBe(true);
      expect(shut.has(at(cell.col, cell.row))).toBe(false);
    }
    // Und davor kommt man überall hin — die Wand sperrt den Hof und nicht den
    // halben Platz.
    expect(shut.has(at(TRIGGER_COL, DOORS[0]!.row))).toBe(true);
    expect(shut.has(at(TRIGGER_COL, DOORS[2]!.row))).toBe(true);
  });

  it('macht den Hof erreichbar, sobald eine einzige Tür offen steht', () => {
    const plan = streetPlan();
    const spot = DOORS[0]!;
    plan.setFixtureDoor(plan.fixture(spot.door)!, true);
    const open = new Set(flowField(plan.graph, [spawn], SHUT).cost.keys());
    for (const cell of yardCells()) expect(open.has(at(cell.col, cell.row))).toBe(true);
  });

  it('hängt die Lampe an die Kreuzung und den Kippschalter daneben', () => {
    const plan = streetPlan();
    const lamp = plan.fixture(LAMP_ID);
    expect(lamp).not.toBeNull();
    expect(lamp!.kind).toBe('lamp');
    expect(lamp!.x).toBe(tileX(LAMP.col));
    expect(lamp!.z).toBe(tileZ(LAMP.row));

    const lever = plan
      .fixtures()
      .find((one) => one.kind === 'lever' && one.props.target === LAMP_ID);
    expect(lever).toBeDefined();
    expect(lever!.x).toBe(tileX(LAMP_SWITCH.col));
    expect(lever!.z).toBe(tileZ(LAMP_SWITCH.row));
  });
});

/** Ob auf dieser Zelle laut Zeichnung freier Boden liegt. */
function plainly(col: number, row: number): boolean {
  const mark = markAt(col, row);
  return mark !== MARKS.kerb && mark !== MARKS.stall;
}
