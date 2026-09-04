/**
 * Der Justierstand steht da, wo man ihn hingeschoben hat.
 *
 * Geschoben wird er an zwei Griffen in der Luft, und eine Hand, die zieht,
 * hört nicht an der Wand auf. Also müssen die Grenzen hier halten — ein Stand
 * in der Wand oder einer, der auf halber Höhe des Gangs schwebt, ist keiner
 * mehr. Und was im Speicher steht, kann alles sein: eine alte Fassung ohne
 * diese Felder, eine Zeichenkette, gar nichts.
 */
import {
  clampRange,
  clearRangeSettings,
  DEFAULT_RANGE,
  formatRange,
  onRangeChange,
  RANGE_FIELDS,
  rangeSettings,
  saveRangeSettings,
} from './rangeSettings';

/**
 * Ein Speicher aus einer `Map`.
 *
 * Jest läuft hier ohne Browser (`testEnvironment: 'node'`), also gibt es kein
 * `localStorage` — und die Hälfte dessen, was zu prüfen ist, liegt genau
 * darin: dass Geschriebenes wiederkommt und dass Kaputtes nichts umwirft.
 */
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

describe('clampRange', () => {
  it('lässt jede Zahl innerhalb ihrer Grenzen stehen', () => {
    expect(clampRange({ height: 92, x: -14, z: 210 })).toEqual({ height: 92, x: -14, z: 210 });
  });

  it('hält jeden Griff in seinem Bereich', () => {
    for (const field of RANGE_FIELDS) {
      expect(clampRange({ [field.key]: -9999 })[field.key]).toBe(field.min);
      expect(clampRange({ [field.key]: 9999 })[field.key]).toBe(field.max);
    }
  });

  it('nimmt die gebaute Zahl, wo keine steht', () => {
    expect(clampRange(undefined)).toEqual(DEFAULT_RANGE);
    expect(clampRange({ height: Number.NaN }).height).toBe(DEFAULT_RANGE.height);
    // Ein Speicher aus einer Fassung, die das Feld noch nicht kannte.
    expect(clampRange({ height: undefined as unknown as number }).x).toBe(DEFAULT_RANGE.x);
  });

  it('rundet auf Millimeter — eine Hand zittert feiner, als jemand ablesen will', () => {
    expect(clampRange({ height: 100.06 }).height).toBe(100.1);
  });
});

describe('der Speicher', () => {
  it('gibt ohne Speicher die gebauten Zahlen', () => {
    expect(rangeSettings()).toEqual(DEFAULT_RANGE);
  });

  it('ändert nur, was übergeben wird', () => {
    saveRangeSettings({ height: 88 });
    const saved = saveRangeSettings({ x: -40 });
    expect(saved.height).toBe(88);
    expect(saved.x).toBe(-40);
    expect(saved.z).toBe(DEFAULT_RANGE.z);
    expect(rangeSettings()).toEqual(saved);
  });

  it('überlebt kaputtes JSON, statt abzustürzen', () => {
    globalThis.localStorage.setItem('bgvr.tuneRange', '{nicht wirklich');
    expect(rangeSettings()).toEqual(DEFAULT_RANGE);
  });

  it('sagt Bescheid, wenn sich etwas geändert hat', () => {
    let calls = 0;
    const off = onRangeChange(() => {
      calls++;
    });
    saveRangeSettings({ height: 90 });
    expect(calls).toBe(1);
    off();
    saveRangeSettings({ height: 91 });
    expect(calls).toBe(1);
  });

  it('setzt auf die gebauten Zahlen zurück', () => {
    saveRangeSettings({ height: 150, x: 90, z: 400 });
    expect(clearRangeSettings()).toEqual(DEFAULT_RANGE);
  });
});

describe('formatRange', () => {
  it('nennt alle drei Zahlen', () => {
    const text = formatRange(clampRange({ height: 106, x: -30, z: 155 }));
    expect(text).toContain('106');
    expect(text).toContain('-30');
    expect(text).toContain('155');
  });
});
