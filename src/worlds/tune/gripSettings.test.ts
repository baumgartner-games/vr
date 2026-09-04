/**
 * Der zweite Justierstand steht da, wo man ihn hingeschoben hat — und trägt,
 * was man auf ihn gelegt hat.
 *
 * Dieselben Grenzen wie beim ersten (`rangeSettings.test.ts`), und zwei Felder
 * mehr, die kaputt sein können: eine Seite, die keine ist, und eine
 * Werkzeug-Id, die es nicht mehr gibt. Beides steht im Speicher und kommt aus
 * einer Fassung, die niemand mehr in der Hand hat — ein leerer Stand wäre die
 * schlechteste der möglichen Antworten darauf.
 */
import {
  clampGrip,
  clearGripSettings,
  DEFAULT_GRIP,
  formatGrip,
  GRIP_FIELDS,
  gripSettings,
  onGripChange,
  saveGripSettings,
} from './gripSettings';

/** Ein Speicher aus einer `Map` — Jest läuft ohne Browser. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: (index) => [...map.keys()][index] ?? null,
    removeItem: (key) => void map.delete(key),
    setItem: (key, value) => void map.set(key, value),
  };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage(),
    configurable: true,
  });
});

describe('clampGrip', () => {
  it('lässt jede Zahl innerhalb ihrer Grenzen stehen', () => {
    const kept = clampGrip({ height: 92, x: 44, z: 210, side: 'left', tool: 'flashlight' });
    expect(kept).toEqual({ height: 92, x: 44, z: 210, side: 'left', tool: 'flashlight' });
  });

  it('hält jeden Griff in seinem Bereich', () => {
    for (const field of GRIP_FIELDS) {
      expect(clampGrip({ [field.key]: -9999 })[field.key]).toBe(field.min);
      expect(clampGrip({ [field.key]: 9999 })[field.key]).toBe(field.max);
    }
  });

  it('nimmt die gebaute Zahl, wo keine steht', () => {
    expect(clampGrip(undefined)).toEqual(DEFAULT_GRIP);
    expect(clampGrip({ height: Number.NaN }).height).toBe(DEFAULT_GRIP.height);
  });

  it('macht aus einer Seite, die keine ist, wieder eine', () => {
    expect(clampGrip({ side: 'beide' as unknown as 'left' }).side).toBe(DEFAULT_GRIP.side);
  });

  it('legt die Pistole hin, wenn die Werkzeug-Id abhandengekommen ist', () => {
    expect(clampGrip({ tool: '' }).tool).toBe(DEFAULT_GRIP.tool);
    expect(clampGrip({ tool: 7 as unknown as string }).tool).toBe(DEFAULT_GRIP.tool);
  });

  it('rundet auf Millimeter', () => {
    expect(clampGrip({ height: 100.06 }).height).toBe(100.1);
  });
});

describe('der Speicher', () => {
  it('gibt ohne Speicher die gebauten Werte', () => {
    expect(gripSettings()).toEqual(DEFAULT_GRIP);
  });

  it('ändert nur, was übergeben wird', () => {
    saveGripSettings({ height: 88 });
    const saved = saveGripSettings({ tool: 'flashlight' });
    expect(saved.height).toBe(88);
    expect(saved.tool).toBe('flashlight');
    expect(gripSettings()).toEqual(saved);
  });

  it('überlebt kaputtes JSON, statt abzustürzen', () => {
    globalThis.localStorage.setItem('bgvr.tuneGrip', '{nicht wirklich');
    expect(gripSettings()).toEqual(DEFAULT_GRIP);
  });

  it('sagt Bescheid, wenn sich etwas geändert hat', () => {
    let calls = 0;
    const off = onGripChange(() => {
      calls++;
    });
    saveGripSettings({ height: 90 });
    expect(calls).toBe(1);
    off();
    saveGripSettings({ height: 91 });
    expect(calls).toBe(1);
  });

  it('setzt den Ort zurück und lässt das Werkzeug liegen', () => {
    saveGripSettings({ height: 150, x: 90, z: 400, tool: 'flashlight', side: 'left' });
    const reset = clearGripSettings();
    expect(reset.height).toBe(DEFAULT_GRIP.height);
    expect(reset.x).toBe(DEFAULT_GRIP.x);
    expect(reset.z).toBe(DEFAULT_GRIP.z);
    // Wer den Stand geradezieht, will nicht auch noch sein Werkzeug zurück.
    expect(reset.tool).toBe('flashlight');
    expect(reset.side).toBe('left');
  });
});

describe('formatGrip', () => {
  it('nennt alle drei Zahlen', () => {
    const text = formatGrip(clampGrip({ height: 106, x: 80, z: 155 }));
    expect(text).toContain('106');
    expect(text).toContain('80');
    expect(text).toContain('155');
  });
});
