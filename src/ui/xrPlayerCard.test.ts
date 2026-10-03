import { DEFAULT_APPEARANCE } from '../core/appearance';
import { XRPlayerCard } from './XRPlayerCard';

/** Die Figur in der Brille unter _Aussehen_: wie die Karte am Schirm. */
describe('XRPlayerCard', () => {
  function card(dirty = false) {
    const calls: string[] = [];
    const one = new XRPlayerCard({
      name: () => 'Nils',
      look: () => DEFAULT_APPEARANCE,
      edits: (page) => page.startsWith('outfit'),
      dirty: () => dirty,
      onCustomize: () => calls.push('customize'),
      onSave: () => calls.push('save'),
      onReset: () => calls.push('reset'),
      onLeave: () => calls.push('leave'),
    });
    return { one, calls };
  }

  it('zeigt im Inventar einen Knopf, unter Aussehen Speichern und Zurücksetzen', () => {
    const { one, calls } = card();
    one.onPage('inventar');
    expect(one.info().buttons.map((button) => button.label)).toEqual(['Aussehen anpassen']);
    one.press(0);
    one.onPage('outfit:hat');
    expect(one.info().buttons.map((button) => button.label)).toEqual([
      'Aussehen speichern',
      'Aussehen zurücksetzen',
    ]);
    // Nichts geändert: Speichern ist gesperrt.
    expect(one.info().buttons[0]!.disabled).toBe(true);
    one.press(0);
    one.press(1);
    expect(calls).toEqual(['customize', 'save', 'reset']);
    one.dispose();
  });

  it('verwirft den Entwurf, wer Aussehen verlässt oder das Menü zumacht', () => {
    const { one, calls } = card(true);
    one.onPage('outfit');
    expect(one.info().buttons[0]!.disabled).toBe(false);
    one.onPage('outfit:face');
    expect(calls).toEqual([]);
    one.onPage(null);
    expect(calls).toEqual(['leave']);
    one.onPage(null);
    expect(calls).toEqual(['leave']);
    one.dispose();
  });
});
