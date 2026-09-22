import { AssetGate, type LoadWatch } from './assetGate';

/**
 * Ein Lade-Manager, wie three.js ihn hat — nur ohne three.js: Er kann anfangen
 * und aufhören, und mehr fragt `AssetGate` ihn auch nicht.
 */
function fakeManager(): LoadWatch & { start(): void; done(): void } {
  const watch: LoadWatch & { start(): void; done(): void } = {
    start: () => watch.onStart?.('datei.glb', 0, 1),
    done: () => watch.onLoad?.(),
  };
  return watch;
}

const FRIST = { quiet: 1000, cap: 20000 };

describe('AssetGate', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('gilt erst als fertig, wenn es eine Weile still bleibt', async () => {
    const manager = fakeManager();
    const gate = new AssetGate(manager);
    let settled: boolean | null = null;
    void gate.settle(FRIST).then((value) => (settled = value));

    // Der Augenblick zwischen zwei Wellen ist noch nicht das Ende: Die Küche
    // hat ihren Chunk, aber noch kein Modell angefordert.
    jest.advanceTimersByTime(900);
    await Promise.resolve();
    expect(settled).toBeNull();

    jest.advanceTimersByTime(200);
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  it('wartet die laufende Ladung ab, und die Stille fängt danach an', async () => {
    const manager = fakeManager();
    const gate = new AssetGate(manager);
    manager.start();
    expect(gate.loading).toBe(true);

    let settled: boolean | null = null;
    void gate.settle(FRIST).then((value) => (settled = value));

    jest.advanceTimersByTime(5000);
    await Promise.resolve();
    expect(settled).toBeNull();

    manager.done();
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  // Die zweite Welle darf die Stille wieder aufheben — sonst stünde der Knopf
  // frei, während die Küche noch ihre Möbel holt.
  it('fängt die Frist von vorn an, wenn wieder etwas losgeht', async () => {
    const manager = fakeManager();
    const gate = new AssetGate(manager);
    let settled: boolean | null = null;
    void gate.settle(FRIST).then((value) => (settled = value));

    jest.advanceTimersByTime(800);
    manager.start();
    await Promise.resolve();
    jest.advanceTimersByTime(800);
    await Promise.resolve();
    expect(settled).toBeNull();

    manager.done();
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  // Der Deckel: Eine Datei, die weder ankommt noch scheitert, meldet sich nie
  // wieder ab. Der Knopf wird trotzdem frei — mit einer ehrlichen Zeile.
  it('gibt nach dem Deckel auf und sagt, dass es nicht still wurde', async () => {
    const manager = fakeManager();
    const gate = new AssetGate(manager);
    manager.start();
    let settled: boolean | null = null;
    void gate.settle(FRIST).then((value) => (settled = value));

    jest.advanceTimersByTime(19999);
    await Promise.resolve();
    expect(settled).toBeNull();

    jest.advanceTimersByTime(2);
    await Promise.resolve();
    expect(settled).toBe(false);
  });

  // Der Manager gehört three.js. Wer seine Handler überschreibt, statt sich
  // anzuhängen, nimmt dem nächsten seine.
  it('lässt die Handler stehen, die schon dran waren', () => {
    const manager = fakeManager();
    const seen: string[] = [];
    manager.onStart = () => seen.push('start');
    manager.onLoad = () => seen.push('load');
    new AssetGate(manager);
    manager.start();
    manager.done();
    expect(seen).toEqual(['start', 'load']);
  });
});
