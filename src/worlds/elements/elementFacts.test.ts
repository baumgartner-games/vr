import * as THREE from 'three';
import { ELEMENTS, FURNITURE_CATALOGUE, elementById } from './elementCatalog';
import { CELL_BLOCKED, elementFacts, footprintRows, partPlace } from './elementFacts';
import { elementCellsOverlay } from './elementView';

jest.mock('../../core/chefFit', () => ({ canLoadModels: () => true }));

/** Der Wert einer Zeile des Steckbriefs. */
function fact(id: string, label: string): string | undefined {
  return elementFacts(id).find((one) => one.label === label)?.value;
}

describe('der Steckbrief eines Möbels', () => {
  it('nennt jedes Teil mit seiner Adresse im Regal, zum Kopieren', () => {
    const facts = elementFacts('board');
    const parts = facts.filter((one) => /^Teil \d+$/.test(one.label));
    expect(parts.map((one) => one.value)).toEqual(elementById('board').parts.map((p) => p.model));
    for (const part of parts) expect(part.copy).toBe(true);
    expect(fact('board', 'Teile')).toBe('3');
  });

  it('sagt, wo jedes Teil sitzt', () => {
    expect(fact('board', 'Teil 1 · Lage')).toBe('auf dem Boden · mittig');
    expect(fact('board', 'Teil 2 · Lage')).toBe('obenauf auf Teil 1 · mittig · hier wird abgelegt');
    expect(fact('board', 'Teil 3 · Lage')).toBe(
      'obenauf auf Teil 2 · 0,12 m nach vorn · umgelegt · um 90° gedreht',
    );
    expect(fact('ice-stand', 'Teil 2 · Lage')).toBe(
      'auf Teil 1 · 0,22 m nach Osten, 0,05 m nach vorn · auf 0,50 m gebracht',
    );
  });

  it('zeigt die Belegung: eine Kachel sind 2 × 2 gesperrte Zellen, der Tisch 4 × 4', () => {
    expect(footprintRows(elementById('counter'))).toEqual(['■ ■', '■ ■']);
    expect(footprintRows(elementById('table-round'))).toEqual(Array(4).fill('■ ■ ■ ■'));
    expect(fact('counter', 'Zellen')).toBe('2 × 2 = 4, alle gesperrt');
    expect(fact('table-round', 'Grundfläche')).toBe('2 × 2 Kacheln · 2,00 m × 2,00 m');
    expect(fact('counter', 'Belegung')).toContain('■ ■\n■ ■\n↓ vorn');
  });

  it('sagt, was es tut und hergibt — die Steakkiste gibt ein Steak, der Herd trägt den Topf', () => {
    expect(fact('crate-steak', 'Gibt')).toBe('Rohes Steak');
    expect(fact('crate-patties', 'Gibt')).toBe('Rohes Patty');
    expect(fact('crate-steak', 'Zweck')).toMatch(/Vorratskiste/);
    expect(fact('stove-pot', 'Steht darauf')).toBe('Topf');
    expect(fact('rolling-board', 'Zweck')).toMatch(/rollt Teig aus/);
    expect(fact('chair', 'Zweck')).toMatch(/steht nur im Weg/);
    expect(fact('counter', 'Körper')).toBe('1,40 m hoch');
  });

  it('hat für jedes Element einen Steckbrief, mit eindeutigen Zeilen', () => {
    for (const element of ELEMENTS) {
      const labels = elementFacts(element.id).map((one) => one.label);
      expect(new Set(labels).size).toBe(labels.length);
    }
    expect(partPlace({ model: 'x', on: 0 }, 2)).toBe('auf Teil 1 · mittig');
  });
});

describe('die Zellen unter dem Möbel auf der Detailseite', () => {
  /** Die roten Felder: je gesperrter Zelle eines. */
  function quads(id: string): THREE.Mesh[] {
    return elementCellsOverlay(id).children.filter(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && child.geometry instanceof THREE.PlaneGeometry,
    );
  }

  it('zeichnet so viele rote Zellen, wie gesperrt sind — unter der Mitte der Grundfläche', () => {
    for (const id of FURNITURE_CATALOGUE) {
      const cells = footprintRows(elementById(id)).join('').split(CELL_BLOCKED).length - 1;
      expect(quads(id)).toHaveLength(cells);
    }
    const centres = quads('counter').map((quad) => [quad.position.x, quad.position.z]);
    expect(centres.sort()).toEqual([
      [-0.25, -0.25],
      [-0.25, 0.25],
      [0.25, -0.25],
      [0.25, 0.25],
    ]);
    expect(quads('table-round')).toHaveLength(16);
  });
});
