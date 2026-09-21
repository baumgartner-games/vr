/** @jest-environment jsdom */
import {
  SAFE_EDGES,
  VIEWPORT_VARS,
  keepSafe,
  safeArea,
  safeClass,
  setSafeEdge,
  trackViewport,
  viewportVars,
  type ViewportWindow,
} from './safeArea';

/**
 * Geprüft wird, was ein Test hier prüfen kann: welche Klassen an einem Kasten
 * stehen. Wie breit die Kerbe eines Telefons ist, weiß nur das Telefon —
 * `env(safe-area-inset-*)` ist in jsdom nichts, und das ist in Ordnung: Die
 * Zahlen stehen in `safeArea.css`, die Entscheidung steht hier.
 */
describe('der sichere Bereich', () => {
  it('hält die bestellten Ränder frei', () => {
    const box = keepSafe(document.createElement('div'), 'bottom', 'left');
    expect([...box.classList]).toEqual(['safe-area--bottom', 'safe-area--left']);
  });

  it('nimmt ohne Angabe alle vier', () => {
    const box = keepSafe(document.createElement('div'));
    expect([...box.classList]).toEqual(SAFE_EDGES.map(safeClass));
  });

  it('gibt denselben Kasten zurück', () => {
    const box = document.createElement('div');
    expect(keepSafe(box, 'top')).toBe(box);
  });

  /** Dieselbe Seite ist einmal ein Blatt von unten und einmal der ganze Schirm. */
  it('schaltet einen Rand an und wieder ab', () => {
    const box = document.createElement('div');
    setSafeEdge(box, 'top', true);
    expect(box.classList.contains('safe-area--top')).toBe(true);
    setSafeEdge(box, 'top', true);
    expect([...box.classList]).toEqual(['safe-area--top']);
    setSafeEdge(box, 'top', false);
    expect(box.classList.contains('safe-area--top')).toBe(false);
  });

  it('baut auch einen neuen Kasten, mit seiner eigenen Klasse zuerst', () => {
    const box = safeArea('pmenu__sheet', 'bottom');
    expect(box.tagName).toBe('DIV');
    expect([...box.classList]).toEqual(['pmenu__sheet', 'safe-area--bottom']);
  });
});

/**
 * Und die Größe daneben: Die Leinwand hing an `height: 100%`, und auf dem
 * Telefon im Hochformat war `100%` kürzer als der Schirm — darunter stand der
 * Hintergrund der Seite als schwarzer Streifen. Was hier geprüft wird, ist die
 * Rechnung dahinter; wie hoch ein iPhone ist, weiß nur das iPhone.
 */
describe('die Größe, die die Seite wirklich hat', () => {
  it('macht aus zwei Zahlen zwei Pixelwerte', () => {
    expect(viewportVars({ innerWidth: 393, innerHeight: 852 })).toEqual({
      '--app-width': '393px',
      '--app-height': '852px',
    });
  });

  /** Ein halbes Pixel ist eine Zahl wie jede andere — der Bildpuffer kennt es auch. */
  it('rundet nicht', () => {
    expect(viewportVars({ innerWidth: 412, innerHeight: 914.5 })['--app-height']).toBe('914.5px');
  });

  /** Lieber das alte Verhalten (`var(--app-height, 100%)`) als eine Leinwand von null Pixeln. */
  it('lässt weg, was keine brauchbare Zahl ist', () => {
    expect(viewportVars({ innerWidth: 0, innerHeight: Number.NaN })).toEqual({});
    expect(viewportVars({ innerWidth: 360 })).toEqual({ '--app-width': '360px' });
    expect(viewportVars(null)).toEqual({});
  });

  it('schreibt sofort ans <html> und zieht bei jeder Änderung nach', () => {
    const listeners = new Map<string, Set<() => void>>();
    const root = document.createElement('html');
    const size = { innerWidth: 393, innerHeight: 852 };
    const view: ViewportWindow = {
      get innerWidth() {
        return size.innerWidth;
      },
      get innerHeight() {
        return size.innerHeight;
      },
      document: { documentElement: root },
      addEventListener: (type, listener) => {
        (listeners.get(type) ?? listeners.set(type, new Set()).get(type)!).add(listener);
      },
      removeEventListener: (type, listener) => {
        listeners.get(type)?.delete(listener);
      },
    };

    const stop = trackViewport(view);
    expect(root.style.getPropertyValue(VIEWPORT_VARS.height)).toBe('852px');

    size.innerHeight = 393;
    size.innerWidth = 852;
    for (const listener of listeners.get('resize') ?? []) listener();
    expect(root.style.getPropertyValue(VIEWPORT_VARS.width)).toBe('852px');
    expect(root.style.getPropertyValue(VIEWPORT_VARS.height)).toBe('393px');

    // Ein Test, der Zuhörer hinterlässt, stört den nächsten.
    stop();
    expect([...listeners.values()].every((set) => set.size === 0)).toBe(true);
  });

  it('kommt auch ohne Fenster zurecht', () => {
    expect(() => trackViewport(null)()).not.toThrow();
  });
});
