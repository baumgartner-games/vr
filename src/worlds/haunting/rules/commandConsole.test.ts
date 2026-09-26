import { commandActionAt, commandRows, type CommandState } from './commandConsole';
import { FLOW, MODE_TEXT } from './roundFlow';

const PRACTICE: CommandState = {
  mode: 'practice',
  rooms: 14,
  monster: 'Der Verlorene',
  test: true,
  bright: false,
};

describe('Die Konsole der Zentrale', () => {
  it('nennt oben den Modus und darunter die zwei Starts mit den Worten der Knöpfe', () => {
    const rows = commandRows(PRACTICE);
    expect(rows.map((row) => row.action)).toEqual([
      'status',
      'real',
      'practice',
      'rooms',
      'monster',
      'light',
    ]);
    expect(rows[0]!.text).toBe(`ORBITAL · JETZT: ${MODE_TEXT.practice.badge}`);
    expect(rows[1]!.text).toBe(FLOW.real.toUpperCase());
    expect(rows[2]!.text).toContain(FLOW.practice.toUpperCase());
    expect(rows[3]!.text).toContain('14 RÄUME');
    expect(rows[4]!.text).toBe('GEGNER: Der Verlorene');
    expect(rows[5]!.text).toBe('ÜBUNGSLICHT: DUNKEL · ANTIPPEN');
    const real = commandRows({ ...PRACTICE, mode: 'real', test: false });
    expect(real[0]!.text).toContain(MODE_TEXT.real.badge);
    expect(real[5]!.text).toBe('ÜBUNGSLICHT: NUR IN DER ÜBUNGSRUNDE');
    for (const row of real) expect(row.text).not.toMatch(/TEST/);
  });

  it('findet die getroffene Zeile nach ihrem Namen — aus der Höhe des Treffers', () => {
    const rows = commandRows(PRACTICE);
    expect(commandActionAt(rows, 0)).toBe('status');
    expect(commandActionAt(rows, 0.2)).toBe('real');
    expect(commandActionAt(rows, 0.4)).toBe('practice');
    expect(commandActionAt(rows, 0.55)).toBe('rooms');
    expect(commandActionAt(rows, 0.75)).toBe('monster');
    expect(commandActionAt(rows, 0.99)).toBe('light');
  });

  it('klemmt Treffer am Rand auf die erste oder letzte Zeile und kennt ohne Zeilen keine', () => {
    const rows = commandRows(PRACTICE);
    expect(commandActionAt(rows, -0.1)).toBe('status');
    expect(commandActionAt(rows, 1)).toBe('light');
    expect(commandActionAt(rows, Number.NaN)).toBeNull();
    expect(commandActionAt([], 0.5)).toBeNull();
  });

  it('bleibt richtig, wenn eine Zeile dazukommt — die Aktion hängt an der Zeile, nicht an der Nummer', () => {
    const rows = [{ action: 'status' as const, text: 'NEU' }, ...commandRows(PRACTICE)];
    expect(commandActionAt(rows, 1.5 / rows.length)).toBe('status');
    expect(commandActionAt(rows, 2.5 / rows.length)).toBe('real');
    expect(commandActionAt(rows, 6.5 / rows.length)).toBe('light');
  });
});
