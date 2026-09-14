import { EFFECTS } from '../effects/effectKinds';
import { flowField } from '../nav/navPath';
import { HUMAN_PROFILE } from '../nav/navProfile';
import { tileKey } from '../nav/navTile';
import { EMITTERS } from './stampEffects';
import { SPAWN, markAt, streetPlan, tileX, tileZ, walkable } from './streetPlan';

const plan = streetPlan();
const spawn = tileKey(tileX(SPAWN.col), tileZ(SPAWN.row));

describe('Die Effektecke der Straßenküche', () => {
  it('stellt vier Quellen auf, jede mit einem Effekt aus dem Labor', () => {
    const nozzles = plan.fixtures().filter((one) => one.kind === 'emitter');
    expect(nozzles).toHaveLength(4);
    const ids = new Set(EFFECTS.map((one) => one.id));
    for (const nozzle of nozzles) expect(ids.has(String(nozzle.props.effect))).toBe(true);
    // Und vier verschiedene: Vier Quellen mit demselben Rauch sind eine Quelle.
    expect(new Set(nozzles.map((one) => one.props.effect)).size).toBe(4);
  });

  it('stellt vor jede einen Knopf, der auf sie zeigt', () => {
    for (const one of EMITTERS) {
      const button = plan.fixture(`${one.id}-knopf`);
      expect(button).not.toBeNull();
      expect(button!.kind).toBe('button');
      expect(button!.props.target).toBe(one.id);
      // Eine Kachel südlich der Düse — auf der Seite, von der man kommt.
      expect(button!.x).toBe(tileX(one.at.col));
      expect(button!.z).toBe(tileZ(one.at.row) + 1);
    }
  });

  /**
   * Die Ecke steht auf freiem Beton, und man kommt hin: Eine Effektquelle
   * hinter einer Küchenzeile ist eine, die niemand je auslöst.
   */
  it('steht auf freien Kacheln, die vom Startplatz aus erreichbar sind', () => {
    const field = flowField(plan.graph, [spawn], { profile: HUMAN_PROFILE });
    for (const one of EMITTERS) {
      for (const row of [one.at.row, one.at.row + 1]) {
        expect(walkable(one.at.col, row)).toBe(true);
        expect(markAt(one.at.col, row)).toBe('.');
        expect(field.cost.has(tileKey(tileX(one.at.col), tileZ(row)))).toBe(true);
      }
    }
  });

  it('hält die Düsen auseinander, damit vier Wolken vier Wolken bleiben', () => {
    const columns = EMITTERS.map((one) => one.at.col).sort((a, b) => a - b);
    for (let i = 1; i < columns.length; i++) {
      expect(columns[i]! - columns[i - 1]!).toBeGreaterThanOrEqual(2);
    }
  });
});
