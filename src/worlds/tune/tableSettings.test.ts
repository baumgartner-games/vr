import {
  clampTable,
  DEFAULT_TABLE,
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

  it('turns every field into a line that fits on a sign', () => {
    for (const field of TABLE_FIELDS) {
      expect(tableFieldLabel(field, DEFAULT_TABLE[field.key])).toContain(field.unit);
    }
    expect(tableFieldLabel(TABLE_FIELDS[0]!, 74)).toBe('74 cm');
    expect(tableFieldLabel(TABLE_FIELDS[0]!, 73.5)).toBe('73.5 cm');
  });
});
