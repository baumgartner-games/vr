import { CHEF_CARRY } from './chefFit';
import {
  CARRY_AHEAD,
  CARRY_BELOW,
  CARRY_CLEAR,
  CARRY_FAR,
  CARRY_FLOOR,
  screenCarryPoint,
} from './screenCarry';

/**
 * **Sichtbar ist die ganze Bedingung.**
 *
 * Ein Gegenstand, den die Figur trägt, den man aber nicht sieht, ist von
 * einem, der auf dem Boden liegt, nicht zu unterscheiden — und genau das war
 * der gemeldete Fehler. Geprüft wird deshalb nicht „steht die Zahl da",
 * sondern: liegt er im Bild, steckt er nicht in der Figur, und steckt er
 * nicht im Boden.
 */
const small = { radius: 0.15, half: 0.15 };
const barrel = { radius: 0.45, half: 0.5 };
const tree = { radius: 1.6, half: 2.1 };

describe('was die Figur am Schirm vor sich her trägt', () => {
  describe('von oben', () => {
    it('liegt vor dem Bauch, wie in der Küche', () => {
      const at = screenCarryPoint('topDown', small, 1.6);
      expect(at.x).toBe(CHEF_CARRY.x);
      expect(at.y).toBe(CHEF_CARRY.y);
      expect(at.z).toBe(CHEF_CARRY.z);
    });

    it('wippt mit der Figur', () => {
      const at = screenCarryPoint('topDown', small, 1.6, 0.02);
      expect(at.y).toBeCloseTo(CHEF_CARRY.y + 0.02, 6);
    });

    it('rückt Großes vor, statt es in die Figur zu stecken', () => {
      const at = screenCarryPoint('topDown', tree, 1.6);
      // Die Hinterkante bleibt vor dem Rumpf.
      expect(at.z + tree.radius).toBeLessThanOrEqual(-CARRY_CLEAR + 1e-9);
    });

    it('hebt Großes an, statt es in den Boden zu stecken', () => {
      const at = screenCarryPoint('topDown', tree, 1.6);
      expect(at.y - tree.half).toBeGreaterThanOrEqual(CARRY_FLOOR - 1e-9);
    });

    it('lässt Kleines, wo es ist', () => {
      const at = screenCarryPoint('topDown', small, 1.6);
      expect(at.y).toBe(CHEF_CARRY.y);
      expect(at.z).toBe(CHEF_CARRY.z);
    });
  });

  describe('aus den Augen', () => {
    it('hängt vor der Kamera und unter der Blickachse', () => {
      const at = screenCarryPoint('firstPerson', barrel, 1.6);
      expect(at.x).toBe(0);
      expect(at.z).toBeLessThan(0);
      // Die Oberkante bleibt genau eine Handbreit unter den Augen: sichtbar,
      // aber nicht vor dem Gesicht.
      expect(at.y + barrel.half).toBeCloseTo(1.6 - CARRY_BELOW, 6);
    });

    it('geht mit dem Kopf mit, wenn der Spieler sich duckt', () => {
      const hoch = screenCarryPoint('firstPerson', small, 1.6);
      const tief = screenCarryPoint('firstPerson', small, 1.1);
      expect(hoch.y - tief.y).toBeCloseTo(0.5, 6);
      expect(hoch.z).toBe(tief.z);
    });

    it('sinkt beim Ducken aber nicht in den Boden', () => {
      // Der Kopf geht herunter, der Fußboden nicht: Ab einer gewissen Tiefe
      // bleibt das Getragene liegen, wo es liegen darf.
      const tief = screenCarryPoint('firstPerson', barrel, 1.1);
      expect(tief.y - barrel.half).toBeCloseTo(CARRY_FLOOR, 6);
    });

    it('rückt Großes weiter weg als Kleines', () => {
      const nah = screenCarryPoint('firstPerson', small, 1.6);
      const fern = screenCarryPoint('firstPerson', tree, 1.6);
      expect(-fern.z).toBeGreaterThan(-nah.z);
      expect(-nah.z).toBeGreaterThanOrEqual(CARRY_AHEAD);
    });

    it('rückt auch etwas weg, das nur hoch ist', () => {
      // Ein Ritter ist 1,78 m hoch und 1,36 m breit: Ginge nur die Breite ein,
      // hinge er anderthalb Meter vor der Nase.
      const ritter = { radius: 0.68, half: 0.89 };
      const breit = { radius: 0.89, half: 0.68 };
      expect(screenCarryPoint('firstPerson', ritter, 1.6).z).toBe(
        screenCarryPoint('firstPerson', breit, 1.6).z,
      );
      expect(-screenCarryPoint('firstPerson', ritter, 1.6).z).toBeGreaterThan(2);
    });

    it('lässt auch Großes nicht im Boden stecken', () => {
      // Ein Ritter: 1,78 m hoch. Unter der Blickachse gehängt stünde er einen
      // Vierteilmeter im Fußboden — und den sieht man zwei Meter vor sich.
      const ritter = { radius: 0.68, half: 0.89 };
      const at = screenCarryPoint('firstPerson', ritter, 1.6);
      expect(at.y - ritter.half).toBeGreaterThanOrEqual(CARRY_FLOOR - 1e-9);
    });

    it('geht dabei nie über die Grenze hinaus', () => {
      const riesig = screenCarryPoint('firstPerson', { radius: 40, half: 40 }, 1.6);
      expect(-riesig.z).toBeLessThanOrEqual(CARRY_FAR + 1e-9);
    });
  });

  it('nimmt auch unsinnige Maße an, ohne etwas Unsinniges zu liefern', () => {
    const at = screenCarryPoint('firstPerson', { radius: -1, half: -1 }, 1.6);
    expect(Number.isFinite(at.x)).toBe(true);
    expect(Number.isFinite(at.y)).toBe(true);
    expect(-at.z).toBeCloseTo(CARRY_AHEAD, 6);
  });
});
