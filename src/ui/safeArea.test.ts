/** @jest-environment jsdom */
import { SAFE_EDGES, keepSafe, safeArea, safeClass, setSafeEdge } from './safeArea';

/**
 * Geprüft wird, was ein Test hier prüfen kann: welche Klassen an einem Kasten
 * stehen. Wie breit die Kerbe eines Telefons ist, weiß nur das Telefon —
 * `env(safe-area-inset-*)` ist in jsdom nichts, und das ist in Ordnung: Die
 * Zahlen stehen in `safeArea.css`, die Entscheidung steht hier.
 */
describe('der sichere Bereich', () => {
  it('hält die bestellten Ränder frei', () => {
    const box = keepSafe(document.createElement('div'), 'bottom', 'left');
    expect([...box.classList]).toEqual(['safe-area--bottom', 'safe-area--left']);
  });

  it('nimmt ohne Angabe alle vier', () => {
    const box = keepSafe(document.createElement('div'));
    expect([...box.classList]).toEqual(SAFE_EDGES.map(safeClass));
  });

  it('gibt denselben Kasten zurück', () => {
    const box = document.createElement('div');
    expect(keepSafe(box, 'top')).toBe(box);
  });

  /** Dieselbe Seite ist einmal ein Blatt von unten und einmal der ganze Schirm. */
  it('schaltet einen Rand an und wieder ab', () => {
    const box = document.createElement('div');
    setSafeEdge(box, 'top', true);
    expect(box.classList.contains('safe-area--top')).toBe(true);
    setSafeEdge(box, 'top', true);
    expect([...box.classList]).toEqual(['safe-area--top']);
    setSafeEdge(box, 'top', false);
    expect(box.classList.contains('safe-area--top')).toBe(false);
  });

  it('baut auch einen neuen Kasten, mit seiner eigenen Klasse zuerst', () => {
    const box = safeArea('pmenu__sheet', 'bottom');
    expect(box.tagName).toBe('DIV');
    expect([...box.classList]).toEqual(['pmenu__sheet', 'safe-area--bottom']);
  });
});
