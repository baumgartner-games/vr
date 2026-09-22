import { autoStarts, fullBlocks } from './fullAuto';
import type { FullState } from './fullDownload';

const STATES: FullState[] = [
  { kind: 'unbekannt' },
  { kind: 'kein-speicher', reason: 'sw' },
  { kind: 'keine-liste' },
  { kind: 'prüft' },
  { kind: 'offen', have: 1, total: 2 },
  { kind: 'läuft', have: 1, total: 2, eta: null, missing: 0 },
  { kind: 'angehalten', have: 1, total: 2 },
  { kind: 'fertig', total: 2 },
  { kind: 'lückenhaft', have: 1, total: 2, missing: 3 },
];

/** _Beitreten_ wartet nur, solange wirklich jemand arbeitet. */
describe('fullBlocks', () => {
  it('hält nur beim Prüfen und beim Laden auf', () => {
    expect(STATES.filter(fullBlocks).map((state) => state.kind)).toEqual(['prüft', 'läuft']);
  });
});

describe('autoStarts', () => {
  /**
   * Nur aus _offen_: _angehalten_ ist eine Entscheidung dagegen, _lückenhaft_
   * das Ende eines Laufs — beides von selbst fortzusetzen wäre eine Schleife.
   */
  it('fängt genau dann an, wenn etwas offen ist', () => {
    expect(STATES.filter(autoStarts).map((state) => state.kind)).toEqual(['offen']);
  });
});
