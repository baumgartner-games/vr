import { PLATE_HEIGHT, platePose } from './showPlate';
import { TILE } from '../nav/navTile';

/**
 * **Das Schild vor einem Schaustück, nachgerechnet.**
 *
 * Drei Schauräume benutzen dieselbe Rechnung (`zones/kitchen.ts`,
 * `zones/diner.ts`, `shared/construct.ts`), und keiner von ihnen läuft in
 * Jest — die Zone braucht WebGL, der Konstrukt-Raum ein `document`. Was hier
 * geprüft wird, ist deshalb die **Stelle**, an der ein Schild landet, und nicht,
 * wie es aussieht.
 */
describe('das Schild vor einem Schaustück', () => {
  const at = { x: 3, z: -7 };

  it('steht mit seiner Unterkante auf dem Boden', () => {
    const pose = platePose({ tiles: { w: 1, d: 1 }, at, floor: 0.02 });
    // Die Tafel wird um ihre Mitte gesetzt, also liegt die Unterkante eine
    // halbe Höhe tiefer — und das ist genau der Fußboden.
    expect(pose.y - PLATE_HEIGHT / 2).toBeCloseTo(0.02, 9);
  });

  /**
   * **Und an der Vorderkante der Kachel**, damit das Stück dahinter frei steht.
   *
   * Vorher schwebte es über dem Möbel; davor verdeckte es das Stück in der
   * Reihe dahinter, und man musste hochsehen, um zu lesen, wovor man steht.
   */
  it('steht an der Vorderkante der Grundfläche und nicht darüber', () => {
    const one = platePose({ tiles: { w: 1, d: 1 }, at, floor: 0 });
    expect(one.x).toBeCloseTo(at.x, 9);
    expect(one.z).toBeGreaterThan(at.z);
    expect(one.z - at.z).toBeCloseTo(TILE / 2 + 0.02, 9);

    // Ein tieferes Stück schiebt sein Schild entsprechend weiter nach vorn:
    // Die Kante ist die der **Grundfläche**, nicht die der Mittelkachel.
    const deep = platePose({ tiles: { w: 2, d: 2 }, at, floor: 0 });
    expect(deep.z - at.z).toBeCloseTo(TILE + 0.02, 9);
  });

  /**
   * **So breit wie das Stück, aber nie schmaler als ein Meter.** Ein Messer
   * belegt eine Kachel und heißt trotzdem „Messer" und nicht „Mes-ser".
   */
  it('wird mit dem Stück breiter und unter einem Meter nicht schmaler', () => {
    expect(platePose({ tiles: { w: 1, d: 1 }, at, floor: 0 }).width).toBeCloseTo(1, 9);
    expect(platePose({ tiles: { w: 2, d: 1 }, at, floor: 0 }).width).toBeCloseTo(2, 9);
  });

  /**
   * **Es bleibt niedrig.** Die Höhe ist die eine Zahl, die das Schild vom
   * Verdecken abhält: Eine Küchenzeile ist einen halben Meter hoch, und ein
   * Schild von 40 cm stünde wie eine Blende davor.
   */
  it('bleibt deutlich niedriger als eine Arbeitsplatte', () => {
    expect(PLATE_HEIGHT).toBeLessThan(0.35);
    expect(PLATE_HEIGHT).toBeGreaterThan(0.15);
  });
});
