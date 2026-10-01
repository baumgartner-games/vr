/** @jest-environment jsdom */
import {
  TWEAKS_KEY,
  elementTweakSpec,
  loadTweak,
  presetCells,
  saveTweak,
  tweakCount,
  tweaksExport,
} from './elementTweaks';

/**
 * **Anpassungen aus der Detailseite** (`elementTweaks.ts`): gespeichert wird
 * nur, was vom Katalog abweicht, und die Liste zum Kopieren sagt genug, um es
 * ohne Rückfrage in den Katalog zu übertragen.
 */
describe('Anpassungen an Spielelementen', () => {
  beforeEach(() => window.localStorage.clear());

  it('kennt die gesperrten Zellen des Katalogs — eine beim schmalen Baum, vier beim Möbel', () => {
    expect(presetCells('tree-slim')).toEqual(['0,0']);
    expect(presetCells('counter')).toEqual(['0,0', '1,0', '0,1', '1,1']);
    const spec = elementTweakSpec('tree-slim');
    expect([spec.cols, spec.rows, spec.step]).toEqual([1, 1, 0.5]);
  });

  it('speichert nur Abweichungen und nimmt sie mit dem Katalogstand wieder weg', () => {
    expect(loadTweak('tree-slim')).toEqual({ shift: [0, 0], cells: ['0,0'] });
    saveTweak('tree-slim', { shift: [0.25, -0.5], cells: ['0,0'] });
    expect(JSON.parse(window.localStorage.getItem(TWEAKS_KEY)!)).toEqual({
      'tree-slim': { shift: [0.25, -0.5] },
    });
    saveTweak('tree-pine', { shift: [0, 0], cells: ['0,0', '1,0'] });
    expect(tweakCount()).toBe(2);
    expect(loadTweak('tree-pine').cells).toEqual(['0,0', '1,0']);
    saveTweak('tree-slim', { shift: [0, 0], cells: ['0,0'] });
    expect(tweakCount()).toBe(1);
  });

  it('gibt alles als JSON zum Weitergeben heraus', () => {
    saveTweak('tree-pine', { shift: [0, 0.25], cells: ['1,0', '0,0'] });
    const out = JSON.parse(tweaksExport()) as { elements: Record<string, unknown> };
    expect(out.elements).toEqual({
      'tree-pine': {
        label: 'Pinie',
        footprintCells: [1, 1],
        shiftMetres: [0, 0.25],
        blockedCells: ['0,0', '1,0'],
        blockedBefore: ['0,0'],
      },
    });
  });

  it('übersteht einen kaputten Speicher', () => {
    window.localStorage.setItem(TWEAKS_KEY, '{kaputt');
    expect(loadTweak('tree-slim')).toEqual({ shift: [0, 0], cells: ['0,0'] });
    expect(tweakCount()).toBe(0);
  });
});
