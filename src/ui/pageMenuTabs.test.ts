/** @jest-environment jsdom */
import { PageMenu, type PageAside } from './PageMenu';
import type { MenuEntry } from './menu';

/**
 * **Das Inventar hinter `Tab`** (`PageMenu` mit `tabs`): Die Einträge der
 * Wurzel sind Reiter, die Wurzel selbst schlägt niemand auf, jeder Reiter
 * merkt sich seine Tiefe — und die Figur steht nur neben ihrer Seite.
 */
function tree(log: string[]): MenuEntry[] {
  return [
    {
      id: 'inventar',
      label: 'Inventar',
      grid: true,
      take: false,
      children: [
        { id: 'tool:hand', label: 'Hand', selected: true, run: () => log.push('hand') },
        { id: 'tool:hammer', label: 'Hammer', run: () => log.push('hammer') },
      ],
    },
    {
      id: 'spielen',
      label: 'Welten',
      children: [
        {
          id: 'world:folder:test',
          label: 'Test',
          children: [{ id: 'world:lab', label: 'Labor', run: () => log.push('lab') }],
        },
      ],
    },
    {
      id: 'einstellungen',
      label: 'Einstellungen',
      children: [{ id: 'gfx', label: 'Grafik', checked: true, run: () => log.push('gfx') }],
    },
  ];
}

function aside(): PageAside & { calls: boolean[] } {
  const calls: boolean[] = [];
  return {
    page: 'inventar',
    element: document.createElement('aside'),
    calls,
    show: (on) => calls.push(on),
  };
}

function ids(menu: PageMenu, selector: string, key: string): string[] {
  return [...menu.element.querySelectorAll<HTMLElement>(selector)].map(
    (node) => node.dataset[key]!,
  );
}

function tab(menu: PageMenu, id: string): void {
  menu.element.querySelector<HTMLElement>(`[data-tab="${id}"]`)!.click();
}

function click(menu: PageMenu, id: string): void {
  menu.element.querySelector<HTMLElement>(`[data-id="${id}"]`)!.click();
}

describe('PageMenu mit Reitern', () => {
  afterEach(() => document.body.replaceChildren());

  it('zeigt die Wurzel als Reiter und schlägt den ersten auf', () => {
    const menu = new PageMenu({ title: 'Inventar', tabs: true });
    menu.setRoot(tree([]));
    menu.openTab('inventar');
    expect(ids(menu, '[data-tab]', 'tab')).toEqual(['inventar', 'spielen', 'einstellungen']);
    expect(menu.pageId).toBe('inventar');
    expect(ids(menu, '[data-index]', 'id')).toEqual(['tool:hand', 'tool:hammer']);
    const on = menu.element.querySelector('.pmenu__tab.is-on') as HTMLElement;
    expect(on.dataset['tab']).toBe('inventar');
    // Auf der Seite eines Reiters gibt es kein Zurück — nur Zumachen.
    expect(menu.goBack()).toBe(false);
    menu.dispose();
  });

  it('wechselt den Reiter und merkt sich die Tiefe in jedem', () => {
    const menu = new PageMenu({ tabs: true });
    menu.setRoot(tree([]));
    menu.openTab('inventar');
    tab(menu, 'spielen');
    click(menu, 'world:folder:test');
    expect(menu.pageId).toBe('spielen/world:folder:test');
    expect(menu.goBack()).toBe(true);
    click(menu, 'world:folder:test');
    tab(menu, 'einstellungen');
    expect(menu.pageId).toBe('einstellungen');
    tab(menu, 'spielen');
    expect(menu.pageId).toBe('spielen/world:folder:test');
    // Noch ein Druck auf denselben Reiter: an seinen Anfang.
    tab(menu, 'spielen');
    expect(menu.pageId).toBe('spielen');
    menu.dispose();
  });

  it('wählt den Reiter mit der Ziffer', () => {
    const menu = new PageMenu({ tabs: true });
    menu.setRoot(tree([]));
    menu.openTab('inventar');
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '3' }));
    expect(menu.pageId).toBe('einstellungen');
    menu.dispose();
  });

  it('zeigt die Seitenspalte nur neben ihrer Seite und nur offen', () => {
    const side = aside();
    const menu = new PageMenu({ tabs: true, aside: side });
    menu.setRoot(tree([]));
    menu.openTab('inventar');
    expect(side.element.hidden).toBe(false);
    expect(menu.element.classList.contains('pmenu--aside')).toBe(true);
    tab(menu, 'einstellungen');
    expect(side.element.hidden).toBe(true);
    tab(menu, 'inventar');
    menu.toggle(false);
    expect(side.calls).toEqual([true, false, true, false]);
    menu.dispose();
  });

  it('läuft eine Kachel im Inventar, statt abzusteigen', () => {
    const log: string[] = [];
    const menu = new PageMenu({ tabs: true });
    menu.setRoot(tree(log));
    menu.openTab('inventar');
    click(menu, 'tool:hammer');
    expect(log).toEqual(['hammer']);
    menu.dispose();
  });
});
