import { defaultScreenView, readScreenView } from './screenView';

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
