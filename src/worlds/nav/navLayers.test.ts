import {
  NAV_LAYERS,
  NAV_LAYER_IDS,
  allLayers,
  anyLayer,
  defaultLayers,
  layerSpec,
  layerSummary,
  nextAll,
  noLayers,
  toggleLayer,
} from './navLayers';

describe('Die Debug-Ebenen', () => {
  it('haben zu jeder Id genau einen Eintrag', () => {
    expect(new Set(NAV_LAYER_IDS).size).toBe(NAV_LAYERS.length);
    for (const layer of NAV_LAYERS) {
      expect(layerSpec(layer.id)).toBe(layer);
      expect(layer.label.length).toBeGreaterThan(0);
      expect(layer.sub.length).toBeGreaterThan(0);
    }
  });

  it('fallen auf die erste zurück, wenn die Id Unsinn ist', () => {
    expect(layerSpec('gibt-es-nicht').id).toBe('tiles');
    expect(layerSpec(undefined).id).toBe('tiles');
  });

  it('zeigen voreingestellt das, was man zuerst wissen will', () => {
    const state = defaultLayers();
    expect(state.tiles).toBe(true);
    expect(state.paths).toBe(true);
    // Wände, Verbindungen und Sperren beantworten „warum nicht dorthin" — die
    // braucht man erst, wenn etwas nicht stimmt.
    expect(state.walls).toBe(false);
    expect(state.links).toBe(false);
    expect(state.blocked).toBe(false);
  });

  it('kennen jede Ebene in jedem Zustand', () => {
    for (const state of [defaultLayers(), noLayers(), allLayers()]) {
      for (const id of NAV_LAYER_IDS) {
        expect(typeof state[id]).toBe('boolean');
      }
    }
  });

  it('schalten einzeln um, ohne die anderen anzufassen', () => {
    const state = noLayers();
    expect(toggleLayer(state, 'walls')).toBe(true);
    expect(state).toEqual({ ...noLayers(), walls: true });
    expect(toggleLayer(state, 'walls')).toBe(false);
    expect(state).toEqual(noLayers());
  });

  it('sagen, ob überhaupt etwas zu sehen ist', () => {
    expect(anyLayer(noLayers())).toBe(false);
    expect(anyLayer(defaultLayers())).toBe(true);
    const one = noLayers();
    toggleLayer(one, 'blocked');
    expect(anyLayer(one)).toBe(true);
  });

  it('schreiben hin, was an ist — und „Aus", wenn nichts an ist', () => {
    expect(layerSummary(noLayers())).toBe('Aus');
    expect(layerSummary(defaultLayers())).toBe('Kacheln · Wege');
    expect(layerSummary(allLayers())).toContain('Verbindungen');
  });

  it('machen aus einem großen Griff alles an oder alles aus', () => {
    // Aus dem Nichts kommt die Voreinstellung, nicht alles.
    expect(nextAll(noLayers())).toEqual(defaultLayers());
    expect(anyLayer(nextAll(defaultLayers()))).toBe(false);
    expect(anyLayer(nextAll(allLayers()))).toBe(false);
  });
});
