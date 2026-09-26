import {
  MENU_GROUPS,
  MENU_PLACEMENT,
  findMenuPath,
  groupMenu,
  placementOf,
  sortWorlds,
  worldKind,
} from './menuGroups';
import type { MenuEntry } from './menu';

/** Eine Wurzel, wie die App sie in der Testwelt baut — nur kürzer. */
function flat(): MenuEntry[] {
  return [
    { id: 'world:hub', label: 'Hub' },
    { id: 'world:test', label: 'Testwelt' },
    { id: 'view', label: 'Ansicht', children: [{ id: 'view:3d', label: '3D' }] },
    {
      id: 'net',
      label: 'Verbindung',
      sub: 'Offline',
      children: [{ id: 'net:join', label: 'Raum' }],
    },
    { id: 'move', label: 'Bewegung', children: [{ id: 'move:posture', label: 'Haltung' }] },
    { id: 'look', label: 'Aussehen', children: [{ id: 'look:hat', label: 'Hut' }] },
    {
      id: 'gfx',
      label: 'Grafik',
      children: [
        { id: 'gfx:fps', label: 'Bildrate' },
        { id: 'gfx:shadows', label: 'Schatten' },
        { id: 'gfx:hitboxes', label: 'Hitboxen' },
      ],
    },
    { id: 'tools', label: 'Werkzeuge', children: [{ id: 'tool:pistol', label: 'Pistole' }] },
    {
      id: 'settings',
      label: 'Einstellungen',
      children: [
        { id: 'setting:game-mode', label: 'Spielmodus' },
        { id: 'setting:grab', label: 'Greifen' },
        { id: 'setting:config', label: 'Konfig-Code' },
      ],
    },
    { id: 'kitchen:order', label: 'Bestellung aufnehmen' },
  ];
}

const ids = (entries: readonly MenuEntry[]): string[] => entries.map((entry) => entry.id);
const child = (entries: readonly MenuEntry[], id: string): MenuEntry =>
  entries.find((entry) => entry.id === id)!;

describe('groupMenu', () => {
  it('ordnet die Wurzel in wenige Hauptbereiche — in der Reihenfolge der Bereiche', () => {
    const close: MenuEntry = { id: 'menu:close', label: 'Weiterspielen' };
    const root = groupMenu(flat(), { lead: [close] });
    // Zusammen und Figur haben nur je ein Untermenü — sie **sind** es.
    expect(ids(root)).toEqual([
      'menu:close',
      'spielen',
      'bauen',
      'net',
      'look',
      'einstellungen',
      'werkstatt',
    ]);
    expect(child(root, 'net').label).toBe('Zusammen');
    expect(child(root, 'net').sub).toBe('Offline');
    expect(ids(child(root, 'net').children!)).toEqual(['net:join']);
    expect(child(root, 'look').label).toBe('Figur');
  });

  it('stellt Welten zuerst und was die Welt mitbringt hinten an „Spielen"', () => {
    const spielen = child(groupMenu(flat()), 'spielen');
    // `kitchen:order` steht in keiner Tabelle — und geht trotzdem nicht verloren.
    expect(ids(spielen.children!)).toEqual(['world:hub', 'world:test', 'view', 'kitchen:order']);
  });

  it('zieht Prüfzeilen aus ihrem Menü in die Werkstatt — und lässt den Rest stehen', () => {
    const source = flat();
    const fps = source.find((entry) => entry.id === 'gfx')!.children![0]!;
    const root = groupMenu(source);
    const settings = child(root, 'einstellungen');
    const gfx = child(settings.children!, 'gfx');
    expect(ids(gfx.children!)).toEqual(['gfx:shadows']);
    const werkstatt = child(root, 'werkstatt');
    expect(werkstatt.badge).toBe('TEST');
    expect(ids(werkstatt.children!)).toEqual(['gfx:fps', 'gfx:hitboxes', 'setting:config']);
    // **Dasselbe Objekt** — die App schreibt die Bildrate zweimal die Sekunde
    // hinein, und das muss dort ankommen, wo es angezeigt wird.
    expect(werkstatt.children![0]).toBe(fps);
    // Und das Original bleibt, wie es war.
    expect(source.find((entry) => entry.id === 'gfx')!.children).toHaveLength(3);
  });

  it('holt den Spielmodus nach „Bauen" und benennt die Hand-Einstellungen um', () => {
    const root = groupMenu(flat());
    expect(ids(child(root, 'bauen').children!)).toEqual(['setting:game-mode', 'tools']);
    const settings = child(child(root, 'einstellungen').children!, 'settings');
    expect(settings.label).toBe('Hände & Greifen');
    expect(ids(settings.children!)).toEqual(['setting:grab']);
  });

  it('lässt leere Bereiche weg', () => {
    const root = groupMenu([
      { id: 'world:hub', label: 'Hub' },
      { id: 'move', label: 'Bewegung', children: [] },
    ]);
    expect(ids(root)).toEqual(['spielen', 'move']);
  });

  it('kennt jede Id der Tabelle nur einmal, und jeder Bereich ist gültig', () => {
    const matches = MENU_PLACEMENT.map((place) => place.match);
    expect(new Set(matches).size).toBe(matches.length);
    const groups = new Set(MENU_GROUPS.map((group) => group.id));
    for (const place of MENU_PLACEMENT) expect(groups.has(place.group)).toBe(true);
    // Eine Bereichs-Id als Eintrags-Id wäre ein Weg, der zweimal passt.
    for (const group of groups) expect(placementOf(group)).toBeNull();
  });

  it('liest einen Stern als Anfang', () => {
    expect(placementOf('world:kitchen')?.place.group).toBe('spielen');
    expect(placementOf('worlds')).toBeNull();
  });
});

describe('findMenuPath', () => {
  it('findet eine Seite unter ihrem Bereich', () => {
    const root = groupMenu(flat());
    expect(findMenuPath(root, 'tools')).toEqual(['bauen', 'tools']);
    expect(findMenuPath(root, 'look')).toEqual(['look']);
    expect(findMenuPath(root, 'gfx')).toEqual(['einstellungen', 'gfx']);
  });

  it('findet keine Zeile ohne Seite und nichts jenseits der Tiefe', () => {
    const root = groupMenu(flat());
    expect(findMenuPath(root, 'world:hub')).toBeNull();
    expect(findMenuPath(root, 'gibtsnicht')).toBeNull();
    const deep: MenuEntry[] = [
      {
        id: 'a',
        label: 'A',
        children: [
          {
            id: 'b',
            label: 'B',
            children: [{ id: 'c', label: 'C', children: [{ id: 'd', label: 'D', children: [] }] }],
          },
        ],
      },
    ];
    expect(findMenuPath(deep, 'c')).toEqual(['a', 'b', 'c']);
    expect(findMenuPath(deep, 'd')).toBeNull();
  });
});

describe('Welten: Spiel, Baustelle, Prüfstand', () => {
  it('sagt, was eine Welt ist', () => {
    expect(worldKind({})).toBe('spiel');
    expect(worldKind({ experimental: true })).toBe('wip');
    expect(worldKind({ test: true, experimental: true })).toBe('test');
  });

  it('stellt die Spiele vor die Baustellen und die Prüfstände — sonst bleibt die Reihenfolge', () => {
    const worlds = [
      { id: 'hub' },
      { id: 'editor', experimental: true },
      { id: 'test', test: true },
      { id: 'haunting' },
    ];
    expect(sortWorlds(worlds).map((world) => world.id)).toEqual([
      'hub',
      'haunting',
      'editor',
      'test',
    ]);
  });
});
