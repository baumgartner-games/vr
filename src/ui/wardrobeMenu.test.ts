/** @jest-environment jsdom */
import { DEFAULT_APPEARANCE, appearance, saveAppearance } from '../core/appearance';
import { HEADGEAR_KINDS } from '../core/headgear';
import { HEAD_KINDS } from '../core/avatarLook';
import { WardrobeMenu } from './WardrobeMenu';

/**
 * **Die Umkleide am Bildschirm** (`WardrobeMenu.ts`), ohne WebGL.
 *
 * Genau das ist der Fall, für den die Seite gebaut ist, sich nicht auf ihre
 * zweite Szene zu verlassen: In jsdom gibt es keinen Kontext, die Figur
 * daneben bleibt weg — und die drei Zeilen müssen trotzdem stehen und
 * schalten. Geprüft wird deshalb das, worum es geht: dass es drei Zeilen mit
 * ‹ und › sind, dass ein Druck sofort speichert, dass eine Änderung von
 * außen mitzieht und dass `Escape` zumacht.
 */
function rows(menu: WardrobeMenu): HTMLElement[] {
  return [...menu.element.querySelectorAll<HTMLElement>('.wrobe__row')];
}

function arrows(row: HTMLElement): HTMLButtonElement[] {
  return [...row.querySelectorAll<HTMLButtonElement>('.wrobe__arrow')];
}

describe('Die Umkleide', () => {
  let menu: WardrobeMenu;

  beforeEach(() => {
    globalThis.localStorage?.clear();
    saveAppearance(DEFAULT_APPEARANCE);
    menu = new WardrobeMenu();
  });

  afterEach(() => {
    menu.dispose();
    globalThis.localStorage?.clear();
  });

  it('hat drei Zeilen: Kopf, Hut, Körper', () => {
    menu.toggle(true);
    expect(rows(menu).map((row) => row.dataset['slot'])).toEqual(['head', 'hat', 'body']);
    expect(rows(menu).map((row) => row.querySelector('.wrobe__label')!.textContent)).toEqual([
      'Kopf',
      'Hut',
      'Körper',
    ]);
  });

  it('beginnt zu und geht auf und wieder zu', () => {
    expect(menu.isOpen).toBe(false);
    expect(menu.element.hidden).toBe(true);
    menu.toggle(true);
    expect(menu.isOpen).toBe(true);
    expect(menu.element.hidden).toBe(false);
    menu.toggle(false);
    expect(menu.element.hidden).toBe(true);
  });

  it('speichert sofort, wenn man › drückt', () => {
    menu.toggle(true);
    arrows(rows(menu)[1]!)[1]!.click();
    expect(appearance().hat).toBe(HEADGEAR_KINDS[1]);
    // Und die Zeile zeigt danach das Neue, ohne dass jemand sie anstößt.
    expect(rows(menu)[1]!.querySelector('strong')!.textContent).toBe('Kochmütze');
  });

  it('läuft mit ‹ von der ersten Wahl nach hinten', () => {
    menu.toggle(true);
    arrows(rows(menu)[0]!)[0]!.click();
    expect(appearance().head).toBe(HEAD_KINDS[HEAD_KINDS.length - 1]);
  });

  /** Geändert wird auch am Handgelenk — die offene Seite zieht mit. */
  it('zieht mit, wenn das Aussehen woanders umgestellt wird', () => {
    menu.toggle(true);
    saveAppearance({ body: 'red' });
    expect(rows(menu)[2]!.querySelector('strong')!.textContent).toBe('Kochjacke rot');
  });

  it('macht mit Escape und mit Fertig zu', () => {
    menu.toggle(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.isOpen).toBe(false);

    menu.toggle(true);
    menu.element.querySelector<HTMLButtonElement>('.wrobe__done')!.click();
    expect(menu.isOpen).toBe(false);
  });

  /** Ein Tipp neben das Blatt macht zu — auf dem Telefon der Weg ohne Zielen. */
  it('macht zu, wenn man daneben tippt', () => {
    menu.toggle(true);
    menu.element.click();
    expect(menu.isOpen).toBe(false);
  });

  it('sagt dem Aufrufer, wann sie auf und zu ist', () => {
    const seen: boolean[] = [];
    const own = new WardrobeMenu({ onToggle: (open) => seen.push(open) });
    own.toggle(true);
    own.toggle(false);
    expect(seen).toEqual([true, false]);
    own.dispose();
  });

  /** Ohne WebGL bleibt die Bühne leer — die Umkleide geht trotzdem auf. */
  it('kommt ohne die zweite Szene aus', () => {
    menu.toggle(true);
    const stage = menu.element.querySelector<HTMLElement>('.wrobe__stage')!;
    expect(stage.hidden).toBe(true);
    expect(rows(menu)).toHaveLength(3);
  });
});
