/** @jest-environment jsdom */
import { PageMenu, cssColor } from './PageMenu';
import { MenuNav } from './menuNav';
import type { MenuEntry } from './menu';

/**
 * **Das Menü als Seite** (`PageMenu.ts`): derselbe Baum wie am Handgelenk,
 * derselbe Weg hindurch — nur aus DOM. Was hier geprüft wird, ist genau das,
 * was am Telefon sonst niemandem auffällt, bevor es schiefgeht: dass eine
 * Zeile mit Kindern absteigt und eine ohne läuft, dass der Weg mit den
 * Handgelenken geteilt ist, dass ein Neubau des Baums die Seite nicht
 * verlässt, und dass eine Nimm-Seite beim Antippen nimmt statt abzusteigen.
 */
function tree(log: string[]): MenuEntry[] {
  return [
    {
      id: 'worlds',
      label: 'Welten',
      icon: 'worlds',
      children: [
        { id: 'world:hub', label: 'Hub', selected: true, run: () => log.push('hub') },
        { id: 'world:moon', label: 'Mond', badge: 'WIP', run: () => log.push('moon') },
      ],
    },
    { id: 'sprint', label: 'Sprint', checked: false, run: () => log.push('sprint') },
    {
      id: 'tools',
      label: 'Werkzeuge',
      take: true,
      children: [
        {
          id: 'tool:pistol',
          label: 'Pistole',
          run: () => log.push('take:pistol'),
          children: [{ id: 'tool:pistol:power', label: 'Kraft', run: () => log.push('power') }],
        },
        { id: 'tool:knife', label: 'Messer', run: () => log.push('take:knife') },
      ],
    },
    {
      id: 'bag',
      label: 'Beutel',
      grid: true,
      children: [
        { id: 'bag:cube', label: 'Würfel', caption: 'Ein Würfel', run: () => log.push('cube') },
      ],
    },
  ];
}

function rows(menu: PageMenu): string[] {
  return [...menu.element.querySelectorAll<HTMLElement>('[data-index]')].map(
    (node) => node.dataset['id']!,
  );
}

function click(menu: PageMenu, id: string): void {
  menu.element.querySelector<HTMLElement>(`[data-id="${id}"]`)!.click();
}

function title(menu: PageMenu): string {
  return menu.element.querySelector('.pmenu__title')!.textContent;
}

let log: string[];
let host: HTMLElement;

// jsdom hat keine Leinwand: Ohne diesen Stummel schreibt jede Ikone eine
// Fehlerzeile ins Protokoll, obwohl das Menü genau dafür gebaut ist, auch
// ohne Leinwand zu stehen.
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as typeof HTMLCanvasElement.prototype.getContext;
});

beforeEach(() => {
  log = [];
  host = document.createElement('div');
  document.body.append(host);
});

afterEach(() => {
  host.remove();
});

describe('Das Menü als Seite', () => {
  it('ist zu, bis jemand es öffnet — und hängt am Wirt', () => {
    const menu = new PageMenu({ host });
    expect(menu.isOpen).toBe(false);
    expect(menu.element.hidden).toBe(true);
    expect(host.contains(menu.element)).toBe(true);
    menu.toggle();
    expect(menu.isOpen).toBe(true);
    expect(menu.element.hidden).toBe(false);
    menu.dispose();
    expect(host.contains(menu.element)).toBe(false);
  });

  it('zeigt die Wurzel, steigt in Kinder ab und über den Kopf wieder auf', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    expect(rows(menu)).toEqual(['worlds', 'sprint', 'tools', 'bag']);
    expect(title(menu)).toBe('Menü');
    const back = menu.element.querySelector<HTMLButtonElement>('.pmenu__back')!;
    expect(back.hidden).toBe(true);

    click(menu, 'worlds');
    expect(rows(menu)).toEqual(['world:hub', 'world:moon']);
    expect(title(menu)).toBe('Welten');
    expect(back.hidden).toBe(false);
    // Eine Zeile ohne Kinder läuft — und zeichnet danach neu, bleibt aber hier.
    click(menu, 'world:moon');
    expect(log).toEqual(['moon']);
    expect(title(menu)).toBe('Welten');

    back.click();
    expect(title(menu)).toBe('Menü');
    expect(back.hidden).toBe(true);
    menu.dispose();
  });

  it('teilt den Weg mit den Handgelenken', () => {
    const nav = new MenuNav();
    const menu = new PageMenu({ host, nav });
    menu.setRoot(tree(log));
    menu.toggle(true);
    click(menu, 'worlds');
    expect(nav.path).toEqual(['worlds']);
    // Die andere Seite blättert um — diese zieht nach.
    nav.goTo([]);
    expect(title(menu)).toBe('Menü');
    nav.goTo(['tools']);
    expect(title(menu)).toBe('Werkzeuge');
    menu.dispose();
  });

  it('bleibt auf seiner Seite, wenn der Baum neu gebaut wird', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    click(menu, 'worlds');
    menu.setRoot(tree(log));
    expect(title(menu)).toBe('Welten');
    // Eine Seite, die es nicht mehr gibt, endet bei ihrer Mutter.
    menu.setRoot([{ id: 'sprint', label: 'Sprint', run: () => log.push('sprint') }]);
    expect(title(menu)).toBe('Menü');
    expect(rows(menu)).toEqual(['sprint']);
    menu.dispose();
  });

  it('zeichnet einen Schalter, einen Punkt und ein Abzeichen so, wie die Zeile es sagt', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    const sprint = menu.element.querySelector<HTMLElement>('[data-id="sprint"]')!;
    expect(sprint.getAttribute('role')).toBe('switch');
    expect(sprint.getAttribute('aria-checked')).toBe('false');
    expect(sprint.querySelector('.pmenu__switch')).not.toBeNull();
    expect(sprint.querySelector('.pmenu__chevron')).toBeNull();
    expect(menu.element.querySelector('[data-id="worlds"] .pmenu__chevron')).not.toBeNull();

    click(menu, 'worlds');
    const hub = menu.element.querySelector<HTMLElement>('[data-id="world:hub"]')!;
    expect(hub.classList.contains('is-selected')).toBe(true);
    expect(hub.querySelector('.pmenu__dot')).not.toBeNull();
    const moon = menu.element.querySelector<HTMLElement>('[data-id="world:moon"]')!;
    expect(moon.querySelector('.pmenu__badge')!.textContent).toBe('WIP');
    expect(moon.style.getPropertyValue('--accent')).toBe('#4aa8ff');
    menu.dispose();
  });

  it('nimmt auf einer Nimm-Seite beim Antippen — und steigt nur über den Pfeil ab', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    click(menu, 'tools');
    expect(menu.element.querySelector('.pmenu__foot')!.textContent).toContain('nimmt');
    click(menu, 'tool:knife');
    expect(log).toEqual(['take:knife']);
    click(menu, 'tool:pistol');
    expect(log).toEqual(['take:knife', 'take:pistol']);
    expect(title(menu)).toBe('Werkzeuge');
    menu.element.querySelector<HTMLElement>('[data-more]')!.click();
    expect(title(menu)).toBe('Pistole');
    expect(rows(menu)).toEqual(['tool:pistol:power']);
    menu.dispose();
  });

  it('legt ein Raster als Kacheln aus, mit der Bildunterschrift darunter', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    click(menu, 'bag');
    const list = menu.element.querySelector('.pmenu__list')!;
    expect(list.classList.contains('pmenu__list--grid')).toBe(true);
    const cube = list.querySelector<HTMLElement>('.pmenu__tile')!;
    expect(cube.dataset['id']).toBe('bag:cube');
    expect(cube.querySelector('small')!.textContent).toBe('Ein Würfel');
    cube.click();
    expect(log).toEqual(['cube']);
    menu.dispose();
  });

  it('öffnet ein Untermenü von außen — und macht dabei auf', () => {
    const opened: boolean[] = [];
    const menu = new PageMenu({ host, onToggle: (open) => opened.push(open) });
    menu.setRoot(tree(log));
    menu.openSubmenu('bag');
    expect(menu.isOpen).toBe(true);
    expect(title(menu)).toBe('Beutel');
    // Etwas ohne Kinder öffnet nichts.
    menu.toggle(false);
    menu.openSubmenu('sprint');
    expect(menu.isOpen).toBe(false);
    expect(opened).toEqual([true, false]);
    menu.dispose();
  });

  it('geht mit Escape, Schließen und einem Tipp daneben zu', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.toggle(true);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.isOpen).toBe(false);
    menu.toggle(true);
    menu.element.querySelector<HTMLButtonElement>('.pmenu__close')!.click();
    expect(menu.isOpen).toBe(false);
    menu.toggle(true);
    menu.element.click();
    expect(menu.isOpen).toBe(false);
    menu.dispose();
  });

  it('schreibt die Statuszeile und die Ikone einer Zeile', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(tree(log));
    menu.setStatus('Nils ist dabei');
    expect(menu.element.querySelector('.pmenu__status')!.textContent).toBe('Nils ist dabei');
    menu.toggle(true);
    expect(menu.element.querySelector('[data-id="worlds"] canvas.pmenu__icon')).not.toBeNull();
    expect(menu.element.querySelector('[data-id="sprint"] .pmenu__icon--blank')).not.toBeNull();
    menu.dispose();
  });
});

describe('Die Farbe eines Eintrags', () => {
  it('wird aus der Zahl des Handgelenkmenüs die Farbe, die CSS versteht', () => {
    expect(cssColor(0x4aa8ff)).toBe('#4aa8ff');
    expect(cssColor(0x0000ff)).toBe('#0000ff');
    expect(cssColor(undefined)).toBe('#4aa8ff');
  });
});
