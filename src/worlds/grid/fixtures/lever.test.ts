import { DIR_E } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement, Props } from './index';
import { COLUMN_H, LEVER, leverFit, type LeverState } from './lever';

function bar(props: Props = { target: 'tuer-2' }): FixturePlacement {
  return { id: 'hebel-1', kind: 'lever', x: 0, z: 0, dir: DIR_E, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Der Hebel', () => {
  /**
   * **Er rastet** — das ist der ganze Unterschied zum Knopf. Auf bleibt auf,
   * und man sieht es ihm über den halben Platz hinweg an.
   */
  it('bleibt liegen, wo man ihn hinlegt', () => {
    const at = bar();
    const state: LeverState = LEVER.init(at);
    expect(state.on).toBe(false);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-on' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(true);

    // Zwanzig ruhige Bilder später steht er immer noch so.
    for (let i = 0; i < 20; i++) expect(LEVER.step(state, at, NOTHING, 0.016)).toEqual([]);
    expect(state.on).toBe(true);

    expect(LEVER.step(state, at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'tuer-2' },
    ]);
    expect(state.on).toBe(false);
  });

  it('lässt sich auch aus der Ferne schalten — ein Hebel am Hebel', () => {
    const at = bar();
    const state = LEVER.init(at);
    LEVER.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt dort an, wo die Welt ihn hinstellt', () => {
    expect(LEVER.init(bar({ on: true })).on).toBe(true);
    expect(LEVER.init(bar()).on).toBe(false);
  });

  it('steht an einer Kante und hält niemanden auf', () => {
    expect(LEVER.edge).toBe(true);
    expect(LEVER.solid(LEVER.init(bar()))).toBe(false);
  });
});

/**
 * **Der Maßstab des Regalmodells** — das Einzige am neuen Bild, das eine reine
 * Rechnung ist und deshalb hier geprüft werden kann.
 *
 * Alles Übrige am Modell (wo das Gelenk liegt, wie weit der Sockel an die
 * Kante rückt) wird am **geladenen** Netz gemessen, und ein Netz gibt es in
 * Jest nicht: `canLoadModels` sagt dort nein, und `fillLever` kommt gar nicht
 * erst bis zum Lader. Was bleibt, ist die Umrechnung Quellhöhe → Faktor — und
 * genau die ist als Funktion herausgezogen, damit sie nachgerechnet wird.
 */
describe('Der Hebel aus dem Regal', () => {
  /**
   * Nachgemessen an `platformer/red/lever_floor_base_red.glb`: 1,7285
   * Quelleinheiten hoch, mit `KAYKIT_SCALE` (0,5) also 0,8642 m. Diese Höhe
   * bringt das Modell mit — der Faktor macht daraus die Höhe des Hebels.
   */
  const MEASURED = 1.72847 * 0.5;

  it('streckt das gemessene Modell auf die Höhe des Hebels', () => {
    expect(MEASURED * leverFit(MEASURED)).toBeCloseTo(COLUMN_H, 9);
  });

  it('muss dafür kaum etwas tun — und das ist der Grund für dieses Modell', () => {
    // Vier Prozent: Wäre es ein Drittel, stünde hier ein anderes Modell.
    expect(leverFit(MEASURED)).toBeGreaterThan(1);
    expect(leverFit(MEASURED)).toBeLessThan(1.05);
  });

  it('ist ein Maßstab und kein Zuschlag', () => {
    // Jede Höhe landet auf derselben: Der Faktor teilt, er addiert nicht.
    for (const height of [0.4, 0.8642, 1.5, 2.4]) {
      expect(height * leverFit(height)).toBeCloseTo(COLUMN_H, 9);
    }
  });

  it('lässt eine Datei ohne Höhe in Ruhe', () => {
    // Ein Modell ohne Netz hat keine Höhe — es wird nicht ins Unendliche
    // gestreckt, sondern bleibt, wie es ist.
    expect(leverFit(0)).toBe(1);
    expect(leverFit(-1)).toBe(1);
  });
});
