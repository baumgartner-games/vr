import type { MenuEntry } from './menu';
import { findMenuPath, groupMenu } from './menuGroups';
import { tabbedMenu } from './menuTabs';

/**
 * **Das Menü als Reiter** (`menuTabs.ts`): Aus der Wurzel mit Bereichen
 * werden Inventar, Katalog, Welten, Bauen, Zusammen, Einstellungen — und jede
 * Seite, die eine Welt mit `openSubmenu` sucht, ist darunter noch zu finden.
 */
const leaf = (id: string): MenuEntry => ({ id, label: id, run: () => {} });
const page = (id: string, children: MenuEntry[] = [leaf(`${id}:a`)]): MenuEntry => ({
  id,
  label: id,
  children,
});

function flat(): MenuEntry[] {
  return [
    leaf('world:hub'),
    leaf('world:moon'),
    page('view'),
    page('net'),
    page('move', [leaf('sprint')]),
    page('gfx', [leaf('gfx:shadows'), leaf('gfx:hitboxes')]),
    page('audio'),
    page('look'),
    page('input'),
    page('tools'),
    page('elements'),
    page('bag'),
    page('npc'),
    page('assets'),
    leaf('reset'),
  ];
}

const inventory: MenuEntry = { id: 'inventar', label: 'Inventar', children: [leaf('tool:hand')] };

describe('tabbedMenu', () => {
  it('macht aus den Bereichen die Reiter, in ihrer Reihenfolge', () => {
    const tabs = tabbedMenu(groupMenu(flat()), { inventory });
    expect(tabs.map((tab) => tab.label)).toEqual([
      'Inventar',
      'Katalog',
      'Welten',
      'Bauen',
      'Zusammen',
      'Einstellungen',
    ]);
  });

  it('stellt Diese Welt über die Welten und den Katalog nicht noch unter Bauen', () => {
    const tabs = tabbedMenu(groupMenu(flat()), { inventory });
    const worlds = tabs.find((tab) => tab.id === 'spielen')!;
    // _Diese Welt_ (`welt`, mit _Zurücksetzen_ darin) zuoberst.
    expect(worlds.children!.map((entry) => entry.id)).toEqual([
      'welt',
      'world:hub',
      'world:moon',
      'view',
    ]);
    const build = tabs.find((tab) => tab.id === 'bauen')!;
    expect(build.children!.map((entry) => entry.id)).toEqual(['tools', 'bag', 'npc']);
  });

  it('versteckt in der Brille das Regal unter Bauen', () => {
    const tabs = tabbedMenu(groupMenu(flat()), { inventory, hideInBuild: ['tools'] });
    const build = tabs.find((tab) => tab.id === 'bauen')!;
    expect(build.children!.map((entry) => entry.id)).toEqual(['bag', 'npc']);
  });

  it('hängt Figur, Hilfe und Werkstatt unter die Einstellungen', () => {
    const tabs = tabbedMenu(groupMenu(flat()), { inventory });
    const settings = tabs.find((tab) => tab.id === 'einstellungen')!;
    const ids = settings.children!.map((entry) => entry.id);
    expect(ids.slice(0, 3)).toEqual(['move', 'gfx', 'audio']);
    expect(ids).toEqual(expect.arrayContaining(['look', 'input', 'werkstatt']));
  });

  it('findet jede Seite, die Welten aufschlagen, unter ihrem Reiter', () => {
    const tabs = tabbedMenu(groupMenu(flat()), { inventory });
    for (const id of ['bag', 'look', 'move', 'view', 'assets', 'elements', 'net']) {
      expect(findMenuPath(tabs, id)).not.toBeNull();
    }
  });

  it('lässt ohne Welt das Inventar weg und leere Reiter auch', () => {
    const tabs = tabbedMenu(groupMenu([leaf('world:hub'), page('gfx')]));
    expect(tabs.map((tab) => tab.label)).toEqual(['Welten', 'Einstellungen']);
  });
});
