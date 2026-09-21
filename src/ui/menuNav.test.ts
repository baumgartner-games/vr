import { MenuNav, walkPath } from './menuNav';
import type { MenuEntry } from './menu';

const TREE: MenuEntry[] = [
  {
    id: 'tools',
    label: 'Werkzeuge',
    children: [
      { id: 'tool:pistol', label: 'Pistole', children: [{ id: 'pistol:ammo', label: 'Munition' }] },
      { id: 'tool:brush', label: 'Pinsel' },
    ],
  },
  { id: 'move', label: 'Bewegung', children: [{ id: 'move:posture', label: 'Haltung' }] },
  { id: 'close', label: 'Weiterspielen' },
];

describe('walkPath', () => {
  it('walks as far as the tree really goes', () => {
    expect(walkPath(TREE, ['tools', 'tool:pistol'])).toEqual(['tools', 'tool:pistol']);
  });

  /**
   * Eine Seite kann zwischen zwei Blicken verschwinden — die Peer-Liste leert
   * sich, ein Werkzeug fällt aus dem Regal. Der Weg endet dann bei ihrer
   * Elternseite und zeigt nicht ins Leere.
   */
  it('stops at the parent when a page has gone away', () => {
    expect(walkPath(TREE, ['tools', 'tool:kettensaege', 'irgendwas'])).toEqual(['tools']);
    expect(walkPath(TREE, ['gibtsnicht'])).toEqual([]);
  });

  it('stops at an entry that is no longer a page', () => {
    // *Weiterspielen* ist eine Aktion, keine Seite: da geht es nicht weiter.
    expect(walkPath(TREE, ['close'])).toEqual([]);
    expect(walkPath(TREE, ['tools', 'tool:brush'])).toEqual(['tools']);
  });
});

/**
 * Der Merkzettel liegt einmal da und wird von beiden Handgelenken gelesen —
 * genau deshalb muss jede Änderung sich melden, sonst zeigt das andere Panel
 * beim Aufmachen noch die Seite von vorhin.
 */
describe('MenuNav', () => {
  it('starts at the top', () => {
    expect(new MenuNav().path).toEqual([]);
  });

  it('goes down and back up, and says so every time', () => {
    const nav = new MenuNav();
    let told = 0;
    nav.onChange(() => told++);

    nav.push('tools');
    nav.push('tool:pistol');
    expect(nav.path).toEqual(['tools', 'tool:pistol']);
    nav.pop();
    expect(nav.path).toEqual(['tools']);
    expect(told).toBe(3);
  });

  it('does nothing at the top, and tells nobody', () => {
    const nav = new MenuNav();
    let told = 0;
    nav.onChange(() => told++);
    nav.pop();
    expect(nav.path).toEqual([]);
    expect(told).toBe(0);
  });

  it('jumps straight to a page, but not to the one it is already on', () => {
    const nav = new MenuNav();
    let told = 0;
    nav.onChange(() => told++);
    nav.goTo(['tools']);
    nav.goTo(['tools']);
    expect(nav.path).toEqual(['tools']);
    expect(told).toBe(1);
  });

  /**
   * Still, weil das beim Neuaufbau des Baums läuft und beide Panels ohnehin
   * gleich neu zeichnen — eine Meldung wäre eine Schleife.
   */
  it('prunes a dead path without telling anyone', () => {
    const nav = new MenuNav();
    nav.goTo(['tools', 'tool:kettensaege']);
    let told = 0;
    nav.onChange(() => told++);
    nav.prune(TREE);
    expect(nav.path).toEqual(['tools']);
    expect(told).toBe(0);
  });

  it('remembers how far each page was scrolled', () => {
    const nav = new MenuNav();
    expect(nav.scrollOf('tools')).toBe(0);
    nav.setScroll('tools', 7);
    expect(nav.scrollOf('tools')).toBe(7);
    // Eine kaputte Zahl darf keine leere Seite ergeben.
    nav.setScroll('tools', -3);
    expect(nav.scrollOf('tools')).toBe(0);
  });

  it('stops listening when asked to', () => {
    const nav = new MenuNav();
    let told = 0;
    const off = nav.onChange(() => told++);
    nav.push('tools');
    off();
    nav.push('tool:pistol');
    expect(told).toBe(1);
  });
});

/**
 * **Der gemerkte Katalogweg** (`ui/menuRecall.ts`) — die Seite, auf der man
 * zuletzt stand, überlebt hier auch ein Neuladen.
 *
 * Geprüft wird mit einem Zettel aus dieser Datei und nicht mit `localStorage`:
 * Was der Weg damit tut, ist die Zusage; wo die Zeichenkette liegt, ist die
 * Sache von `menuRecall.ts`.
 */
describe('MenuNav mit Merkzettel', () => {
  function recall(rest: string[] = []) {
    const note = { root: 'assets', saved: rest };
    return {
      note,
      recall: {
        root: 'assets',
        read: () => [...note.saved],
        write: (path: readonly string[]) => {
          note.saved = [...path];
        },
      },
    };
  }

  const SHELF: MenuEntry[] = [
    ...TREE,
    {
      id: 'assets',
      label: 'Regal',
      children: [
        {
          id: 'kaykit#cats',
          label: 'Nach Kategorien',
          children: [
            {
              id: 'kaykit#cat:food',
              label: 'Essen',
              children: [{ id: 'kaykit:restaurant-bits/crate_buns.glb', label: 'Crate Buns' }],
            },
          ],
        },
      ],
    },
  ];

  it('schreibt jeden Schritt im Katalog auf', () => {
    const { note, recall: sheet } = recall();
    const nav = new MenuNav(sheet);
    nav.push('assets');
    nav.push('kaykit#cats');
    expect(note.saved).toEqual(['kaykit#cats']);
    nav.pop();
    expect(note.saved).toEqual([]);
  });

  it('lässt alles andere in Ruhe', () => {
    const { note, recall: sheet } = recall(['kaykit#cats']);
    const nav = new MenuNav(sheet);
    nav.push('tools');
    nav.push('tool:pistol');
    expect(note.saved).toEqual(['kaykit#cats']);
  });

  it('schlägt den Katalog dort auf, wo er zuletzt stand', () => {
    const { recall: sheet } = recall(['kaykit#cats', 'kaykit#cat:food']);
    const nav = new MenuNav(sheet);
    nav.push('assets');
    expect(nav.path).toEqual(['assets', 'kaykit#cats', 'kaykit#cat:food']);
  });

  /**
   * Das Verzeichnis des Regals wird erst beim Aufschlagen geholt: Bis es da
   * ist, steht unter der Seite nur „Lädt …", und ein Weg, der dann gekürzt
   * **und vergessen** würde, wäre nach dem ersten Neuaufbau weg.
   */
  it('hält den gemerkten Weg fest, bis es seine Seiten gibt', () => {
    const { recall: sheet } = recall(['kaykit#cats', 'kaykit#cat:food']);
    const nav = new MenuNav(sheet);
    nav.push('assets');

    const loading: MenuEntry[] = [
      ...TREE,
      { id: 'assets', label: 'Regal', children: [{ id: 'assets:loading', label: 'Lädt …' }] },
    ];
    nav.prune(loading);
    expect(nav.path).toEqual(['assets']);

    nav.prune(SHELF);
    expect(nav.path).toEqual(['assets', 'kaykit#cats', 'kaykit#cat:food']);
  });

  it('gibt den Wunsch auf, sobald jemand selbst weiterblättert', () => {
    const { recall: sheet } = recall(['kaykit#cats', 'kaykit#cat:food']);
    const nav = new MenuNav(sheet);
    nav.push('assets');
    nav.goTo(['assets']);
    nav.prune(SHELF);
    expect(nav.path).toEqual(['assets']);
  });

  it('merkt sich auch den Sprung an den Anfang des Katalogs', () => {
    const { note, recall: sheet } = recall(['kaykit#cats', 'kaykit#cat:food']);
    const nav = new MenuNav(sheet);
    nav.push('assets');
    nav.goTo(['assets']);
    expect(note.saved).toEqual([]);
  });
});
