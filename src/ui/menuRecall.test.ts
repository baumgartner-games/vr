/** @jest-environment jsdom */
import { catalogRecall, cleanSteps } from './menuRecall';

/**
 * Was aus einem Speicher kommt, ist fremde Arbeit — ein alter Build, eine
 * Hand am Entwicklerwerkzeug, ein halb geschriebener Eintrag. Geprüft wird
 * deshalb vor allem, dass daraus nie etwas anderes wird als eine kurze Liste
 * von Ids.
 */
describe('cleanSteps', () => {
  it('nimmt eine Liste von Ids, wie sie ist', () => {
    expect(cleanSteps(['assets', 'kaykit#cats'])).toEqual(['assets', 'kaykit#cats']);
  });

  it('macht aus allem anderen nichts', () => {
    expect(cleanSteps(null)).toEqual([]);
    expect(cleanSteps('kaykit#cats')).toEqual([]);
    expect(cleanSteps({ 0: 'a' })).toEqual([]);
  });

  it('hört bei der ersten Zeile auf, die keine Id ist', () => {
    expect(cleanSteps(['a', 3, 'b'])).toEqual(['a']);
    expect(cleanSteps(['', 'b'])).toEqual([]);
  });

  it('wird nicht beliebig lang', () => {
    expect(cleanSteps(Array.from({ length: 40 }, (_, i) => `s${i}`))).toHaveLength(8);
    expect(cleanSteps(['x'.repeat(500)])).toEqual([]);
  });
});

describe('catalogRecall', () => {
  beforeEach(() => localStorage.clear());

  it('legt den Weg ab und holt ihn wieder', () => {
    const recall = catalogRecall()!;
    expect(recall.root).toBe('assets');
    expect(recall.read()).toEqual([]);
    recall.write(['kaykit#cats', 'kaykit#cat:food']);
    expect(catalogRecall()!.read()).toEqual(['kaykit#cats', 'kaykit#cat:food']);
  });

  /** Ein kaputter Eintrag ist wie keiner: Dann fängt der Katalog vorn an. */
  it('verträgt Unsinn im Speicher', () => {
    localStorage.setItem('bgvr.katalog', '{nicht json');
    expect(catalogRecall()!.read()).toEqual([]);
    localStorage.setItem('bgvr.katalog', '"kaykit#cats"');
    expect(catalogRecall()!.read()).toEqual([]);
  });
});
