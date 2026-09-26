import {
  DEFAULT_INFO_VIEW,
  INFO_OPACITIES,
  INFO_VIEWS,
  INFO_VIEW_IDS,
  clampInfoView,
  clampInfoViews,
  defaultInfoViews,
  forgetInfoViewCache,
  infoPartVisible,
  infoView,
  infoViewSummary,
  infoViewsVersion,
  nextInfoOpacity,
  onInfoViewsChange,
  resetInfoViews,
  saveInfoView,
  toggleInfoOption,
} from './infoViews';

describe('Info-Ansichten: Darstellungsoptionen', () => {
  it('liefert jede Ansicht vollständig und deckend aus — das Bild von vorher', () => {
    const all = defaultInfoViews();
    for (const id of INFO_VIEW_IDS) expect(all[id]).toEqual(DEFAULT_INFO_VIEW);
  });

  it('hat für jede Ansicht eine Deckkraft und keine doppelten Kennungen', () => {
    expect(new Set(INFO_VIEW_IDS).size).toBe(INFO_VIEWS.length);
    for (const view of INFO_VIEWS) expect(view.supports).toContain('opacity');
  });

  it('liest einen alten oder kaputten Stand je Feld ein', () => {
    const read = clampInfoViews({
      map: { walls: false, opacity: 0.4 },
      nav: { flat: 'ja', opacity: 0.5 },
      unbekannt: { walls: false },
    });
    expect(read.map).toEqual({ ...DEFAULT_INFO_VIEW, walls: false, opacity: 0.4 });
    expect(read.nav).toEqual(DEFAULT_INFO_VIEW);
    expect(clampInfoViews(null)).toEqual(defaultInfoViews());
    expect(clampInfoView('quatsch')).toEqual(DEFAULT_INFO_VIEW);
  });

  it('schaltet Häkchen um und die Deckkraft im Kreis', () => {
    const flat = toggleInfoOption(DEFAULT_INFO_VIEW, 'flat');
    expect(flat.flat).toBe(true);
    expect(DEFAULT_INFO_VIEW.flat).toBe(false);
    let opacity = DEFAULT_INFO_VIEW.opacity;
    const seen = [];
    for (let i = 0; i < INFO_OPACITIES.length; i++) {
      seen.push(opacity);
      opacity = nextInfoOpacity(opacity);
    }
    expect(seen).toEqual([...INFO_OPACITIES]);
    expect(opacity).toBe(1);
    expect(toggleInfoOption(DEFAULT_INFO_VIEW, 'opacity').opacity).toBe(0.7);
  });

  it('nennt in der Zeile nur Abweichungen, und nur solche, die die Ansicht kennt', () => {
    expect(infoViewSummary('map', DEFAULT_INFO_VIEW)).toBe('Alles');
    expect(
      infoViewSummary('map', { ...DEFAULT_INFO_VIEW, flat: true, walls: false, opacity: 0.4 }),
    ).toBe('2D · ohne Wände · 40 %');
    // Die Gitterlinien kennen keine Wände — ein ausgeschalteter Schalter, den
    // es dort nicht gibt, steht auch nicht in ihrer Zeile.
    expect(infoViewSummary('gridLines', { ...DEFAULT_INFO_VIEW, walls: false })).toBe('Alles');
  });

  it('sortiert Teile in Fächer: flach lässt nur das Feste weg', () => {
    const flat = { ...DEFAULT_INFO_VIEW, flat: true };
    expect(infoPartVisible(flat, 'solid')).toBe(false);
    expect(infoPartVisible(flat, 'walls')).toBe(true);
    expect(infoPartVisible(flat, undefined)).toBe(true);
    const bare = { ...DEFAULT_INFO_VIEW, walls: false, rooms: false, actors: false };
    expect(infoPartVisible(bare, 'walls')).toBe(false);
    expect(infoPartVisible(bare, 'rooms')).toBe(false);
    expect(infoPartVisible(bare, 'actors')).toBe(false);
    expect(infoPartVisible(bare, 'solid')).toBe(true);
    // Mehrere Fächer: sichtbar nur, wenn jedes davon es ist.
    expect(infoPartVisible(flat, ['rooms', 'solid'])).toBe(false);
    expect(infoPartVisible(DEFAULT_INFO_VIEW, ['rooms', 'solid'])).toBe(true);
  });

  it('speichert je Ansicht, meldet die Änderung und zählt die Fassung hoch', () => {
    forgetInfoViewCache();
    resetInfoViews();
    let heard = 0;
    const stop = onInfoViewsChange(() => heard++);
    const before = infoViewsVersion();
    const saved = saveInfoView('nav', { flat: true, opacity: 0.7 });
    stop();
    expect(saved).toEqual({ ...DEFAULT_INFO_VIEW, flat: true, opacity: 0.7 });
    expect(infoView('nav')).toEqual(saved);
    expect(infoView('map')).toEqual(DEFAULT_INFO_VIEW);
    expect(heard).toBe(1);
    expect(infoViewsVersion()).toBeGreaterThan(before);
    resetInfoViews();
    expect(infoView('nav')).toEqual(DEFAULT_INFO_VIEW);
  });
});
