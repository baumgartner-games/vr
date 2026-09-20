import { KAYKIT_SCALE } from './kaykitFit';
import { MIXEDBAG_SCALE } from './mixedbagFit';

/**
 * **Ein Faktor für dieselbe Werkstatt.**
 *
 * Die Modelle im Regal und die Stücke der Wundertüte kommen von demselben
 * Zeichner und sind in denselben „Blender-Metern" gebaut. Stünden die beiden
 * Zahlen auseinander, sähe man es nicht am Code, sondern erst in der Welt: ein
 * Fass aus dem Regal, doppelt so hoch wie das Fass daneben. Deshalb steht hier
 * die einzige Zusage, die zählt — sie sind gleich.
 */
describe('der Maßstab des Regals', () => {
  it('ist derselbe wie bei der Wundertüte', () => {
    expect(KAYKIT_SCALE).toBe(MIXEDBAG_SCALE);
  });

  it('halbiert', () => {
    expect(KAYKIT_SCALE).toBe(0.5);
  });
});
