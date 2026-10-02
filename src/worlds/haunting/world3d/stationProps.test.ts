import { elementById } from '../../elements/elementCatalog';
import { SPACE_CATALOGUE } from '../../elements/spaceCatalog';
import type { MarkId } from '../house';
import { FIXTURE_ELEMENTS, FIXTURE_MODELS, fixtureSource } from './stationProps';

/**
 * **Die Station nimmt den Weltraum aus dem Katalog** — gewünscht: _„Ersetze
 * dann die Modelle die aus Space in haunting genutzt wurden durch diese neuen
 * Katalog Möbel."_
 */
describe('Die Einrichtung der Station', () => {
  const marks = Object.keys(FIXTURE_MODELS) as MarkId[];

  it('nimmt jedes Gerät aus Space Base Bits als Spielelement des Weltraums', () => {
    const fromSpace = marks.filter((mark) => FIXTURE_MODELS[mark].startsWith('space-base-bits/'));
    expect(fromSpace.sort()).toEqual(['dusche', 'esstisch', 'kamin', 'kiste']);
    for (const mark of fromSpace) {
      const element = FIXTURE_ELEMENTS[mark]!;
      expect(SPACE_CATALOGUE).toContain(element);
      expect(fixtureSource(mark)).toEqual({ element });
      // Dieselbe Datei wie das Element — der KayKit-Editor liest sie hier ab.
      expect(FIXTURE_MODELS[mark]).toBe(elementById(element).parts[0]!.model);
    }
  });

  it('lässt alles andere bei der Datei aus dem Regal', () => {
    for (const mark of marks.filter((one) => !FIXTURE_ELEMENTS[one]))
      expect(fixtureSource(mark)).toBe(FIXTURE_MODELS[mark]);
  });
});
