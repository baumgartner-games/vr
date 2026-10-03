/** @jest-environment jsdom */
import { DEFAULT_APPEARANCE, appearance, saveAppearance } from '../core/appearance';
import { FIGURE_CHEF, FIGURE_KINDS, FIGURE_PRESETS } from '../core/avatarFigures';
import { WARDROBE_HATS } from '../core/headgear';
import { FACE_KINDS } from '../core/figureParts';
import type { MenuEntry } from './menu';
import { OUTFIT_PAGE, OutfitDraft, isOutfitPage, outfitEntry } from './outfitMenu';
import { PageMenu } from './PageMenu';
import { PlayerCard } from './PlayerCard';

/**
 * **_Aussehen_ im Menü hinter `Tab`** (`ui/outfitMenu.ts`): erst zwei Kacheln,
 * _Vorgefertigte_ und _Customizing_, darunter die Fächer als Kacheln — und
 * gespeichert wird erst mit _Aussehen speichern_.
 */
function child(entry: MenuEntry, id: string): MenuEntry {
  const found = entry.children?.find((one) => one.id === id);
  if (!found) throw new Error(`${id} fehlt unter ${entry.id}`);
  return found;
}

beforeEach(() => {
  localStorage.clear();
});

describe('Der Entwurf', () => {
  it('probiert an, ohne zu speichern — gespeichert wird erst mit save', () => {
    const draft = new OutfitDraft();
    draft.set({ hat: 'cap' });
    expect(draft.current.hat).toBe('cap');
    expect(appearance().hat).toBe('none');
    expect(draft.dirty).toBe(true);
    draft.save();
    expect(appearance().hat).toBe('cap');
    expect(draft.dirty).toBe(false);
  });

  it('setzt auf die Auslieferung zurück, und verwerfen holt das Gespeicherte', () => {
    saveAppearance({ hat: 'cap', figure: FIGURE_KINDS[1]!.path });
    const draft = new OutfitDraft();
    draft.reset();
    expect(draft.current).toEqual(DEFAULT_APPEARANCE);
    expect(appearance().hat).toBe('cap');
    draft.discard();
    expect(draft.current.hat).toBe('cap');
  });
});

describe('Die Seite', () => {
  it('ist versteckt und hat zwei Kacheln: Vorgefertigte und Customizing', () => {
    const entry = outfitEntry(new OutfitDraft(), () => {});
    expect(entry.id).toBe(OUTFIT_PAGE);
    expect(entry.hidden).toBe(true);
    expect(entry.grid).toBe(true);
    expect(entry.children!.filter((one) => !one.hidden).map((one) => one.label)).toEqual([
      'Vorgefertigte',
      'Customizing',
    ]);
    // Dazu, ohne Kachel: die eigene Figur im Detail (`OUTFIT_DETAIL`).
    const detail = child(entry, 'outfit:detail');
    expect(detail.hidden).toBe(true);
    expect(detail.detail?.preview).toBe(`outfit:figure:${DEFAULT_APPEARANCE.figure}`);
    expect(child(entry, 'outfit:presets').children).toHaveLength(FIGURE_PRESETS.length);
  });

  it('hat im Customizing Hut und Kopf, jedes Stück mit Vorschau — und keinen Koch mehr', () => {
    const entry = outfitEntry(new OutfitDraft(), () => {});
    const custom = child(entry, 'outfit:custom');
    expect(custom.children!.map((one) => one.label)).toEqual(['Hut', 'Kopf']);
    const hats = custom.children![0]!.children!;
    expect(hats).toHaveLength(WARDROBE_HATS.length);
    const faces = custom.children![1]!.children!;
    expect(faces).toHaveLength(FACE_KINDS.length);
    for (const piece of faces) expect(piece.preview).toBe(piece.id);
    expect(faces.filter((one) => one.selected).map((one) => one.id)).toEqual(['outfit:face:own']);
    for (const piece of hats) expect(piece.preview).toBe(piece.id);
    expect(hats.filter((one) => one.selected).map((one) => one.id)).toEqual([
      `outfit:hat:${DEFAULT_APPEARANCE.hat}`,
    ]);
    const presets = child(entry, 'outfit:presets').children!;
    expect(presets.some((one) => one.id === `outfit:figure:${FIGURE_CHEF}`)).toBe(false);
  });

  it('setzt den Hut, ohne die Figur anzufassen', () => {
    const draft = new OutfitDraft();
    const knight = FIGURE_KINDS[1]!.path;
    draft.set({ figure: knight });
    let picks = 0;
    child(
      outfitEntry(draft, () => picks++),
      'outfit:custom',
    ).children![0]!.children![1]!.run!(null);
    expect(draft.current.figure).toBe(knight);
    expect(draft.current.hat).toBe(WARDROBE_HATS[1]);
    expect(picks).toBe(1);
  });

  it('setzt den Kopf, ohne Hut und Figur anzufassen', () => {
    const draft = new OutfitDraft();
    draft.set({ hat: 'mageHat' });
    child(
      outfitEntry(draft, () => {}),
      'outfit:custom',
    ).children![1]!.children![1]!.run!(null);
    expect(draft.current.face).toBe(FACE_KINDS[1]);
    expect(draft.current.hat).toBe('mageHat');
  });
});

describe('Im Menü, mit der Figur daneben', () => {
  function setup() {
    const draft = new OutfitDraft();
    const log: string[] = [];
    let name = 'Nils';
    const card = new PlayerCard({
      page: 'inventar',
      name: () => name,
      look: () => draft.current,
      edits: isOutfitPage,
      dirty: () => draft.dirty,
      onCustomize: () => log.push('customize'),
      onSave: (next) => {
        draft.save();
        name = next || name;
      },
      onReset: () => draft.reset(),
      onLeave: () => draft.discard(),
    });
    const menu = new PageMenu({ tabs: true, aside: card });
    const root = (): MenuEntry[] => [
      {
        id: 'inventar',
        label: 'Inventar',
        grid: true,
        take: false,
        children: [{ id: 'tool:hand', label: 'Hand' }, outfitEntry(draft, () => {})],
      },
      { id: 'einstellungen', label: 'Einstellungen', children: [{ id: 'gfx', label: 'Grafik' }] },
    ];
    menu.setRoot(root());
    return { draft, card, menu, log, root, name: () => name };
  }

  const tiles = (menu: PageMenu): string[] =>
    [...menu.element.querySelectorAll<HTMLElement>('.pmenu__tile')].map((n) => n.dataset['id']!);
  const buttons = (card: PlayerCard): string[] =>
    [...card.element.querySelectorAll<HTMLButtonElement>('button')]
      .filter((b) => !b.hidden)
      .map((b) => b.textContent!);

  it('steht nicht zwischen den Werkzeugen, und die Figur hat dort Aussehen anpassen', () => {
    const { menu, card } = setup();
    menu.openTab('inventar');
    expect(tiles(menu)).toEqual(['tool:hand']);
    expect(buttons(card)).toEqual(['Aussehen anpassen']);
    menu.dispose();
    card.dispose();
  });

  it('schlägt Aussehen im Vollbild auf, die Figur bleibt mit Speichern und Zurücksetzen', () => {
    const { menu, card } = setup();
    menu.openTab('inventar');
    menu.openSubmenu(OUTFIT_PAGE);
    expect(menu.pageId).toBe(`inventar/${OUTFIT_PAGE}`);
    expect(menu.element.classList.contains('pmenu--full')).toBe(true);
    expect(tiles(menu)).toEqual(['outfit:presets', 'outfit:custom']);
    expect(card.element.hidden).toBe(false);
    expect(buttons(card)).toEqual(['Aussehen speichern', 'Aussehen zurücksetzen']);
    menu.dispose();
    card.dispose();
  });

  it('verwirft den Entwurf beim Zurückgehen ins Inventar und beim Zumachen', () => {
    const { menu, card, draft, root } = setup();
    menu.openTab('inventar');
    menu.openSubmenu(OUTFIT_PAGE);
    draft.set({ hat: 'cap' });
    menu.setRoot(root());
    expect(
      card.element.querySelector<HTMLButtonElement>('.pcard__edit:not([hidden])')!.disabled,
    ).toBe(false);
    menu.goBack();
    expect(draft.dirty).toBe(false);
    expect(appearance().hat).toBe('none');

    menu.openSubmenu(OUTFIT_PAGE);
    draft.set({ hat: 'cap' });
    menu.toggle(false);
    expect(draft.dirty).toBe(false);
    menu.dispose();
    card.dispose();
  });

  it('speichert mit Aussehen speichern', () => {
    const { menu, card, draft } = setup();
    menu.openTab('inventar');
    menu.openSubmenu(OUTFIT_PAGE);
    draft.set({ hat: 'cap' });
    card.refresh();
    card.element.querySelector<HTMLButtonElement>('.pcard__edit:not([hidden])')!.click();
    expect(appearance().hat).toBe('cap');
    menu.dispose();
    card.dispose();
  });

  it('ändert unter Aussehen auch den Spitznamen — gespeichert mit demselben Knopf', () => {
    const { menu, card, name } = setup();
    menu.openTab('inventar');
    expect(card.element.querySelector<HTMLElement>('.pcard__nick')!.hidden).toBe(true);
    menu.openSubmenu(OUTFIT_PAGE);
    const nick = card.element.querySelector<HTMLInputElement>('.pcard__nick input')!;
    const save = card.element.querySelector<HTMLButtonElement>('.pcard__edit:not([hidden])')!;
    expect(nick.value).toBe('Nils');
    expect(save.disabled).toBe(true);
    nick.value = 'Koch Nils';
    nick.dispatchEvent(new Event('input'));
    expect(save.disabled).toBe(false);
    nick.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(name()).toBe('Koch Nils');
    menu.dispose();
    card.dispose();
  });
});
