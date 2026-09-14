import {
  SCREEN_VIEW_LABELS,
  SCREEN_VIEW_SUBS,
  defaultScreenView,
  readScreenView,
  startOptions,
} from './screenView';

/**
 * Zwei Werte und eine Voreinstellung — und trotzdem die Stelle, an der ein
 * Telefon sonst im Schiff landet: Die Voreinstellung hängt am Gerät, und was
 * im Speicher steht, darf alles sein.
 */
describe('2D oder 3D am Bildschirm', () => {
  it('fängt auf dem Handy mit der Karte an, am Schreibtisch mit der Welt', () => {
    expect(defaultScreenView('handheld')).toBe('2d');
    expect(defaultScreenView('desktop')).toBe('3d');
    // Die Brille fragt nicht — aber wer sie abnimmt, sitzt an einem Bildschirm.
    expect(defaultScreenView('vr')).toBe('3d');
  });

  it('nimmt, was gewählt wurde, auf jedem Gerät', () => {
    expect(readScreenView('3d', 'handheld')).toBe('3d');
    expect(readScreenView('2d', 'desktop')).toBe('2d');
  });

  it('macht aus einem kaputten Speicher die Voreinstellung', () => {
    expect(readScreenView(null, 'handheld')).toBe('2d');
    expect(readScreenView('flat', 'desktop')).toBe('3d');
    expect(readScreenView(2, 'handheld')).toBe('2d');
  });
});

/**
 * **Die Kennung bleibt, das Wort ändert sich.** „2D" hieß einmal eine eigene
 * Kachelwelt; jetzt ist es dieselbe Welt aus einer Kamera darüber.
 * Der Speicher darf das nicht merken — in jedem Browser, der hier schon offen
 * war, steht `2d`, und wer die Kennung umbenennt, nimmt allen ihre Wahl.
 */
describe('Wie die beiden Ansichten heißen', () => {
  it('heißt von oben und aus den Augen', () => {
    expect(SCREEN_VIEW_LABELS['2d']).toBe('Von oben');
    expect(SCREEN_VIEW_LABELS['3d']).toBe('Aus den Augen');
  });

  it('hat zu jeder Ansicht eine Zeile, und keine heißt mehr Kachelwelt', () => {
    for (const view of ['2d', '3d'] as const) {
      expect(SCREEN_VIEW_SUBS[view].length).toBeGreaterThan(20);
      expect(SCREEN_VIEW_SUBS[view]).not.toMatch(/Kachel|Phaser|Editor/);
    }
  });

  it('lässt die Kennungen, wie sie im Speicher stehen', () => {
    expect(Object.keys(SCREEN_VIEW_LABELS).sort()).toEqual(['2d', '3d']);
    expect(readScreenView('2d', 'desktop')).toBe('2d');
  });
});

/**
 * **Die Startseite fragt nur, was das Gerät nicht schon beantwortet.** Mit
 * Brille ist „2D oder 3D" keine Frage und die Haltung die einzige; ohne Brille
 * genau andersherum. Und der eine Knopf sagt, wohin er führt — eine Regel, die
 * man ohne Test erst an dem Gerät merkt, das man gerade nicht in der Hand hat.
 */
describe('Was die Startseite fragt', () => {
  it('lässt mit Brille die Ansicht weg und fragt nach der Haltung', () => {
    const vr = startOptions(true, '2d');
    expect(vr).toEqual({ askView: false, askPosture: true, label: 'Enter VR', way: 'vr' });
    // Eine gemerkte 2D-Wahl ändert daran nichts: In der Brille gibt es sie nicht.
    expect(startOptions(true, '3d')).toEqual(vr);
  });

  it('lässt am Bildschirm die Haltung weg und fragt nach der Ansicht', () => {
    expect(startOptions(false, '2d')).toEqual({
      askView: true,
      askPosture: false,
      label: 'Beitreten',
      way: '2d',
    });
    expect(startOptions(false, '3d').way).toBe('3d');
    expect(startOptions(false, '3d').label).toBe('Beitreten');
  });
});
