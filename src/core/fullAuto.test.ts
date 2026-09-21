/** @jest-environment jsdom */
import { autoStarts, fullNags, readAutoFull, writeAutoFull } from './fullAuto';
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

/** Blinken heißt „hier fehlt etwas, und gerade tut es niemand". */
describe('fullNags', () => {
  it('blinkt nur, wo wirklich etwas fehlt', () => {
    expect(STATES.filter(fullNags).map((state) => state.kind)).toEqual([
      'offen',
      'angehalten',
      'lückenhaft',
    ]);
  });
});

describe('autoStarts', () => {
  it('fängt ohne Haken gar nicht an', () => {
    expect(STATES.some((state) => autoStarts(state, false))).toBe(false);
  });

  /**
   * Nur aus _offen_: _angehalten_ ist eine Entscheidung dagegen, _lückenhaft_
   * das Ende eines Laufs — beides von selbst fortzusetzen wäre eine Schleife.
   */
  it('fängt mit Haken genau dann an, wenn etwas offen ist', () => {
    expect(STATES.filter((state) => autoStarts(state, true)).map((state) => state.kind)).toEqual([
      'offen',
    ]);
  });
});

describe('der Haken im Speicher', () => {
  beforeEach(() => localStorage.clear());

  it('ist ohne Eintrag aus', () => {
    expect(readAutoFull()).toBe(false);
  });

  it('überlebt das Neuladen', () => {
    writeAutoFull(true);
    expect(localStorage.getItem('bgvr.autoload')).toBe('1');
    expect(readAutoFull()).toBe(true);
    writeAutoFull(false);
    expect(readAutoFull()).toBe(false);
  });
});
