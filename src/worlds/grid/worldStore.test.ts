import { GridPlan } from './gridPlan';
import { DIR_N, tileKey } from '../nav/navTile';
import { forgetWorld, hasStoredWorld, keepWorld, storedWorld, worldKey } from './worldStore';

/** Ein Speicher, wie ein Browser ihn hat — und einer, der kaputt sein darf. */
function fakeStorage(broken = false) {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => {
      if (broken) throw new Error('kein Speicher');
      return map.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (broken) throw new Error('kein Speicher');
      map.set(key, value);
    },
    removeItem: (key: string) => {
      if (broken) throw new Error('kein Speicher');
      map.delete(key);
    },
    map,
  };
}

function use(storage: unknown): void {
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
}

function house(): GridPlan {
  const plan = new GridPlan();
  plan.room({ x: 0, z: 0, w: 3, d: 3 }, { walls: true });
  plan.mass('wood', { x: 0, z: 0, w: 3, d: 3 }, 2.8, 3.1);
  plan.put('table', 1, 1, DIR_N);
  return plan;
}

describe('Der Speicher im Browser', () => {
  it('legt jede Welt unter ihren eigenen Schlüssel', () => {
    expect(worldKey('dark')).toBe('vr-welt:dark');
    expect(worldKey('dust')).not.toBe(worldKey('dark'));
  });

  it('schreibt eine Welt und holt sie vollständig zurück', () => {
    const store = fakeStorage();
    use(store);
    expect(keepWorld('dark', house(), { name: 'Dunkelhaus' })).toBe(true);
    expect(hasStoredWorld('dark')).toBe(true);

    const back = storedWorld('dark')!;
    expect(back.file.world).toBe('dark');
    expect(back.file.version).toBe('0.1.0');
    expect(back.graph.has(tileKey(1, 1, 0))).toBe(true);
    expect(back.masses).toHaveLength(1);
    expect(back.blocks).toHaveLength(1);
  });

  it('kennt eine Welt nicht, die nie geschrieben wurde', () => {
    use(fakeStorage());
    expect(storedWorld('dust')).toBeNull();
    expect(hasStoredWorld('dust')).toBe(false);
  });

  it('vergisst auf Verlangen', () => {
    use(fakeStorage());
    keepWorld('dark', house());
    forgetWorld('dark');
    expect(storedWorld('dark')).toBeNull();
  });

  /**
   * **Eine kaputte Zeile im Speicher wird weggeworfen, nicht gemeldet.** Sie
   * kommt aus einer Fassung, die es nicht mehr gibt; niemand kann etwas daran
   * tun, und die Welt soll trotzdem aufmachen.
   */
  it('macht die Welt auch mit Müll im Speicher auf', () => {
    const store = fakeStorage();
    use(store);
    store.map.set(worldKey('dark'), '{kein json');
    expect(storedWorld('dark')).toBeNull();
    store.map.set(worldKey('dark'), JSON.stringify({ format: 'etwas anderes' }));
    expect(storedWorld('dark')).toBeNull();
  });

  /**
   * Ein privates Fenster hat gar keinen Speicher. Ein Editor, der daran
   * abstürzt, ist schlimmer als einer, der vergisst — er sagt es nur.
   */
  it('stürzt ohne Speicher nicht ab, sondern sagt Nein', () => {
    use(fakeStorage(true));
    expect(keepWorld('dark', house())).toBe(false);
    expect(storedWorld('dark')).toBeNull();
    expect(hasStoredWorld('dark')).toBe(false);
    expect(() => forgetWorld('dark')).not.toThrow();
  });

  it('überlebt es, wenn es gar kein Fenster gibt', () => {
    (globalThis as unknown as { window?: unknown }).window = undefined;
    expect(keepWorld('dark', house())).toBe(false);
    expect(storedWorld('dark')).toBeNull();
  });
});
