import { buildIdIn, CHECK_GAP_MS, UpdateWatch } from './updateCheck';

function page(id: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="bgvr-build" content="${id}"></head></html>`;
}

/** Ein Wächter mit eigener Uhr und einer Seite, die man austauschen kann. */
function rig(current = 'aaa') {
  let served = page(current);
  let clock = 0;
  let offline = false;
  const asked: string[] = [];
  const told: string[] = [];
  const watch = new UpdateWatch({
    current,
    url: 'https://x/vr/index.html',
    fetch: (url, init) => {
      asked.push(url);
      expect(init.cache).toBe('no-store');
      if (offline) return Promise.reject(new Error('offline'));
      return Promise.resolve({ ok: true, text: () => Promise.resolve(served) });
    },
    onNewer: (id) => told.push(id),
    now: () => clock,
  });
  return {
    watch,
    asked,
    told,
    serve: (id: string) => (served = page(id)),
    tick: (ms: number) => (clock += ms),
    offline: (on: boolean) => (offline = on),
  };
}

describe('Gibt es eine neue Version?', () => {
  it('liest die Kennung aus der Seite — in jeder Reihenfolge der Attribute', () => {
    expect(buildIdIn(page('abc123'))).toBe('abc123');
    expect(buildIdIn('<meta content="x9" name="bgvr-build">')).toBe('x9');
    expect(buildIdIn('<html></html>')).toBe('');
  });

  it('meldet nichts, solange die Seite dieselbe ist', async () => {
    const r = rig();
    await r.watch.check(true);
    expect(r.told).toEqual([]);
    expect(r.asked[0]).toMatch(/index\.html\?update=0$/);
  });

  it('meldet eine neue Kennung genau einmal', async () => {
    const r = rig();
    r.serve('bbb');
    await r.watch.check(true);
    r.tick(CHECK_GAP_MS);
    await r.watch.check();
    expect(r.told).toEqual(['bbb']);
    expect(r.watch.newer).toBe('bbb');
    // Und eine noch neuere wieder.
    r.serve('ccc');
    r.tick(CHECK_GAP_MS);
    await r.watch.check();
    expect(r.told).toEqual(['bbb', 'ccc']);
  });

  it('fragt höchstens einmal je Minute — wer hin- und herschaltet, lädt keine Seite', async () => {
    const r = rig();
    await r.watch.check();
    r.tick(1000);
    await r.watch.check();
    expect(r.asked).toHaveLength(1);
    r.tick(CHECK_GAP_MS);
    await r.watch.check();
    expect(r.asked).toHaveLength(2);
  });

  it('wirft ohne Netz nicht und fragt beim nächsten Mal wieder', async () => {
    const r = rig();
    r.offline(true);
    await expect(r.watch.check(true)).resolves.toBeUndefined();
    r.offline(false);
    r.serve('bbb');
    await r.watch.check(true);
    expect(r.told).toEqual(['bbb']);
  });

  it('fragt gar nicht, wenn der eigene Build keine Kennung hat', async () => {
    const r = rig('');
    await r.watch.check(true);
    expect(r.asked).toEqual([]);
  });
});
