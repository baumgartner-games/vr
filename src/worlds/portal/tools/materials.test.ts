import { DEFAULT_MATERIAL, MATERIALS, findMaterial, isTransparent } from './materials';

describe('Materialien', () => {
  it('führt Lack als Weg zurück', () => {
    expect(DEFAULT_MATERIAL.id).toBe('paint');
    expect(findMaterial('paint')).toBe(DEFAULT_MATERIAL);
  });

  it('macht aus einer unbekannten Id kein undefined', () => {
    // Die Id kommt über das Netz — ein neuerer Mitspieler darf uns nicht
    // mit einem Material abschießen, das wir noch nicht kennen.
    expect(findMaterial('unobtanium')).toBe(DEFAULT_MATERIAL);
    expect(findMaterial(null)).toBe(DEFAULT_MATERIAL);
    expect(findMaterial(undefined)).toBe(DEFAULT_MATERIAL);
  });

  it('hat lauter verschiedene Ids', () => {
    const ids = MATERIALS.map((material) => material.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('hält jeden Wert in seinem Bereich', () => {
    for (const material of MATERIALS) {
      expect(material.roughness).toBeGreaterThanOrEqual(0);
      expect(material.roughness).toBeLessThanOrEqual(1);
      expect(material.metalness).toBeGreaterThanOrEqual(0);
      expect(material.metalness).toBeLessThanOrEqual(1);
      expect(material.opacity).toBeGreaterThan(0);
      expect(material.opacity).toBeLessThanOrEqual(1);
      expect(material.friction).toBeGreaterThanOrEqual(0);
      expect(material.bounce).toBeGreaterThanOrEqual(0);
      expect(material.bounce).toBeLessThanOrEqual(1);
    }
  });

  it('weiß, was durchsichtig ist', () => {
    expect(isTransparent(findMaterial('glass'))).toBe(true);
    expect(isTransparent(findMaterial('stone'))).toBe(false);
  });
});
