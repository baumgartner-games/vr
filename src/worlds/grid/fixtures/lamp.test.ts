import { DIR_N } from '../../nav/navTile';
import type { FixtureInput, FixturePlacement, Props } from './index';
import { KAYKIT_SCALE } from '../../../core/kaykitFit';
import { LAMP, lampFit, lampHeight, type LampState } from './lamp';

function light(props: Props = {}): FixturePlacement {
  return { id: 'lampe-1', kind: 'lamp', x: 2, z: 2, dir: DIR_N, level: 0, props };
}

const NOTHING: FixtureInput = {
  used: false,
  hit: false,
  weightOn: 0,
  playerOn: false,
  triggered: false,
};

describe('Die Lampe', () => {
  it('brennt, bis jemand sie ausmacht', () => {
    const at = light();
    const state: LampState = LAMP.init(at);
    expect(state.on).toBe(true);

    expect(LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
    ]);
    expect(state.on).toBe(false);

    LAMP.step(state, at, { ...NOTHING, triggered: true }, 0.016);
    expect(state.on).toBe(true);
  });

  it('fängt aus an, wenn die Welt es so will', () => {
    expect(LAMP.init(light({ on: false })).on).toBe(false);
  });

  it('hängt so hoch, wie es dasteht — und nie unter dem Boden', () => {
    expect(lampHeight(light({ height: 3.4 }))).toBeCloseTo(3.4);
    expect(lampHeight(light({ height: -2 }))).toBeGreaterThan(0);
    expect(lampHeight(light())).toBeGreaterThan(2);
  });

  it('gibt weiter, worauf sie zeigt — eine Lampe darf einen Schalter haben', () => {
    const at = light({ target: 'lampe-2' });
    expect(LAMP.step(LAMP.init(at), at, { ...NOTHING, used: true }, 0.016)).toEqual([
      { type: 'sound', name: 'switch-off' },
      { type: 'trigger', target: 'lampe-2' },
    ]);
  });

  it('steht frei auf der Kachel und hält niemanden auf', () => {
    expect(LAMP.edge).toBe(false);
    expect(LAMP.solid(LAMP.init(light()))).toBe(false);
  });

  /**
   * **Die Umrechnung auf die Zielhöhe** — der einzige Teil des Regal-Einbaus,
   * der sich ohne WebGL prüfen lässt, und deshalb der einzige, der als eigene
   * Funktion dasteht (`lampFit`).
   *
   * Gerechnet wird hier mit der Zahl, die am Modell **gemessen** wird, und
   * nicht mit einer, die in der Lampe steht: Der Test schreibt sie einmal auf
   * (`holiday-bits/lantern.glb` ist 3,938 Quelleinheiten hoch), damit die
   * Division an einem bekannten Fall nachvollziehbar ist — im Betrieb kommt
   * sie aus `THREE.Box3`.
   */
  describe('wird auf ihre Höhe gebracht', () => {
    /** Die Höhe der Laterne aus dem Regal, in Metern (Quelle × Paketmaßstab). */
    const LANTERN = 3.938 * KAYKIT_SCALE;

    it('macht aus 1,97 m genau die Höhe, die dasteht', () => {
      expect(LANTERN * lampFit(LANTERN, 2.8)).toBeCloseTo(2.8);
      expect(LANTERN * lampFit(LANTERN, 3.2)).toBeCloseTo(3.2);
      // Und die Vorgabe der beiden Lampen in der Testwelt: 3,2 m auf 1,969 m
      // ist gut das Anderthalbfache — die Laterne wächst, sie schrumpft nicht.
      expect(lampFit(LANTERN, 3.2)).toBeGreaterThan(1);
    });

    it('lässt ein Modell in Ruhe, das gar keine Höhe hat', () => {
      // Eine Datei, aus der kein Netz kam: `Box3` ist leer, und eine Division
      // durch null wäre eine Laterne von unendlicher Größe.
      expect(lampFit(0, 2.8)).toBe(1);
      expect(lampFit(-1, 2.8)).toBe(1);
      expect(lampFit(LANTERN, 0)).toBe(1);
    });
  });
});
