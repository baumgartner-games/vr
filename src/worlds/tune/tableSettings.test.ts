import {
  clampTable,
  DEFAULT_TABLE,
  GHOST_KINDS,
  nextGhostKind,
  tableFieldLabel,
  TABLE_FIELDS,
  type TableSettings,
} from './tableSettings';

describe('clampTable', () => {
  it('fills in everything that was not given', () => {
    expect(clampTable({})).toEqual(DEFAULT_TABLE);
    expect(clampTable(undefined)).toEqual(DEFAULT_TABLE);
  });

  it('keeps a table height inside a range a table can have', () => {
    expect(clampTable({ height: 5 }).height).toBe(20);
    expect(clampTable({ height: 400 }).height).toBe(140);
    expect(clampTable({ height: 74 }).height).toBe(74);
  });

  it('keeps a typed height to the millimetre', () => {
    expect(clampTable({ height: 73.46 }).height).toBe(73.5);
  });

  it('falls back rather than believing a broken store', () => {
    const broken = { height: 'hoch', kind: 'Tisch', side: 'oben' } as unknown as TableSettings;
    const table = clampTable(broken);
    expect(table.height).toBe(DEFAULT_TABLE.height);
    expect(table.kind).toBe(DEFAULT_TABLE.kind);
    expect(table.side).toBe(DEFAULT_TABLE.side);
  });

  it('lies flat by default, so a hand put down looks put down', () => {
    expect(DEFAULT_TABLE.pitch).toBe(-90);
  });

  /**
   * Drei Darstellungen derselben Hand, und der Knopf an der Wand schaltet in
   * einem Kreis durch sie hindurch — nach der letzten kommt wieder die erste,
   * sonst sucht man die Reihe rückwärts ab.
   */
  it('walks through all three ghosts and starts over', () => {
    expect(GHOST_KINDS).toEqual(['limbs', 'hand', 'controller']);
    const seen = [GHOST_KINDS[0]!];
    for (let i = 0; i < GHOST_KINDS.length; i++) seen.push(nextGhostKind(seen[i]!));
    expect(seen).toEqual(['limbs', 'hand', 'controller', 'limbs']);
  });

  it('keeps an older store that only knew two of them', () => {
    expect(clampTable({ kind: 'controller' }).kind).toBe('controller');
    expect(clampTable({ kind: 'hand' }).kind).toBe('hand');
  });

  it('turns every field into a line that fits on a sign', () => {
    for (const field of TABLE_FIELDS) {
      expect(tableFieldLabel(field, DEFAULT_TABLE[field.key])).toContain(field.unit);
    }
    expect(tableFieldLabel(TABLE_FIELDS[0]!, 74)).toBe('74 cm');
    expect(tableFieldLabel(TABLE_FIELDS[0]!, 73.5)).toBe('73.5 cm');
  });
});
