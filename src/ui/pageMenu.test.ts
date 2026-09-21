/** @jest-environment jsdom */
import { PageMenu, cssColor } from './PageMenu';
import { MenuNav } from './menuNav';
import { catalogRecall } from './menuRecall';
import type { MenuEntry } from './menu';
import type { PagePreviewLayer } from './previewGrid';

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

/**
 * **Das Regal in zwei Spalten, mit dem Modell in der Kachel.**
 *
 * Gezeichnet wird das Modell von einer Schicht aus three.js
 * (`ui/PagePreviews.ts`), und die braucht eine Grafikkarte, die hier keine
 * ist. Geprüft wird deshalb der Vertrag zwischen Seite und Schicht — und der
 * ist es, an dem es hängt: dass jede Kachel ihr Quadrat bekommt, dass die
 * Ikone darin stehen bleibt, bis ein Modell da ist, dass die Schicht nach
 * jedem Neuzeichnen die Kacheln der **richtigen** Seite bekommt, und dass ein
 * zugeklapptes Menü keine Schleife mehr laufen lässt.
 */
function shelf(): MenuEntry[] {
  return [
    {
      id: 'assets',
      label: 'Regal',
      grid: true,
      cols: 2,
      children: [
        { id: 'kaykit:barrel.glb', label: 'Fass', icon: 'cube', preview: 'kaykit:barrel.glb' },
        { id: 'kaykit:crate.glb', label: 'Kiste', preview: 'kaykit:crate.glb' },
        { id: 'kaykit:forest', label: 'Wald', icon: 'folder', children: [] },
      ],
    },
  ];
}

/** Eine Attrappe der Vorschauschicht: Sie schreibt mit, statt zu zeichnen. */
class FakeLayer implements PagePreviewLayer {
  readonly seen: { page: string; ids: string[] }[] = [];
  readonly opened: boolean[] = [];
  readonly presented: boolean[] = [];
  ready = new Set<string>();
  mounted = false;
  disposed = false;
  onChange: (() => void) | null = null;

  mount(_box: HTMLElement, onChange: () => void): void {
    this.mounted = true;
    this.onChange = onChange;
  }
  observe(page: string, boxes: HTMLElement[]): void {
    this.seen.push({ page, ids: boxes.map((box) => box.dataset['preview']!) });
  }
  has(id: string): boolean {
    return this.ready.has(id);
  }
  setOpen(open: boolean): void {
    this.opened.push(open);
  }
  setPresenting(on: boolean): void {
    this.presented.push(on);
  }
  dispose(): void {
    this.disposed = true;
  }
}

describe('Die Kachel mit dem Modell darin', () => {
  it('hält ein Quadrat frei — und stellt die Ikone hinein, solange nichts da ist', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(shelf());
    menu.openSubmenu('assets');
    const barrel = menu.element.querySelector<HTMLElement>('[data-id="kaykit:barrel.glb"]')!;
    const box = barrel.querySelector<HTMLElement>('.pmenu__prev')!;
    expect(box.dataset['preview']).toBe('kaykit:barrel.glb');
    // Ohne Grafik bleibt die Ikone stehen: kein Fehler, kein Loch im Raster.
    expect(box.querySelector('.pmenu__icon')).not.toBeNull();
    // Eine Zeile ohne `preview` behält ihre Ikone ganz ohne Quadrat.
    const forest = menu.element.querySelector<HTMLElement>('[data-id="kaykit:forest"]')!;
    expect(forest.querySelector('.pmenu__prev')).toBeNull();
    menu.dispose();
  });

  it('lässt die Ikone weg, sobald die Schicht ein Modell hat', () => {
    const menu = new PageMenu({ host });
    const layer = new FakeLayer();
    menu.setPreviews(layer);
    menu.setRoot(shelf());
    menu.openSubmenu('assets');
    expect(layer.mounted).toBe(true);
    const id = 'kaykit:barrel.glb';
    expect(menu.element.querySelector(`[data-preview="${id}"] .pmenu__icon`)).not.toBeNull();

    layer.ready.add(id);
    layer.onChange!();
    expect(menu.element.querySelector(`[data-preview="${id}"] .pmenu__icon`)).toBeNull();
    // Das Quadrat bleibt, sonst spränge die Kachel beim Ankommen des Modells.
    expect(menu.element.querySelector(`[data-preview="${id}"]`)).not.toBeNull();
    menu.dispose();
  });

  it('meldet der Schicht nach jedem Neuzeichnen die Kacheln ihrer Seite', () => {
    const menu = new PageMenu({ host });
    const layer = new FakeLayer();
    menu.setPreviews(layer);
    menu.setRoot(shelf());
    menu.toggle(true);
    // Die Wurzel hat keine Vorschau — gemeldet wird trotzdem, sonst gäbe eine
    // verlassene Seite ihre Modelle nie her. Gemeldet wird dabei Seite **und**
    // Suchbegriff: Dieselbe Seite gefiltert zeigt andere Kacheln, und was
    // dabei herausfällt, soll sein Modell hergeben.
    expect(layer.seen.at(-1)).toEqual({ page: 'root|', ids: [] });
    menu.openSubmenu('assets');
    expect(layer.seen.at(-1)).toEqual({
      page: 'assets|',
      ids: ['kaykit:barrel.glb', 'kaykit:crate.glb'],
    });
    menu.dispose();
  });

  it('lässt die Schleife nur laufen, solange das Menü offen ist', () => {
    const menu = new PageMenu({ host });
    const layer = new FakeLayer();
    menu.setPreviews(layer);
    menu.setRoot(shelf());
    menu.toggle(true);
    menu.toggle(false);
    expect(layer.opened).toEqual([true, false]);
    // Die Brille zeigt die Modelle am Handgelenk; hier läuft dann nichts.
    menu.setPresenting(true);
    expect(layer.presented.at(-1)).toBe(true);
    menu.dispose();
    expect(layer.disposed).toBe(true);
  });

  it('räumt die alte Schicht weg, wenn eine Welt ihre Fabrik zurücknimmt', () => {
    const menu = new PageMenu({ host });
    const layer = new FakeLayer();
    menu.setPreviews(layer);
    menu.setRoot(shelf());
    menu.openSubmenu('assets');
    layer.ready.add('kaykit:barrel.glb');
    menu.setPreviews(null);
    expect(layer.disposed).toBe(true);
    // Und in der Kachel steht wieder, was ohne Vorschau dort stünde.
    expect(
      menu.element.querySelector('[data-preview="kaykit:barrel.glb"] .pmenu__icon'),
    ).not.toBeNull();
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

/**
 * **Der Katalog** — das, was die Seite gegenüber dem Handgelenk zusätzlich
 * kann: suchen, Spalten zählen, den ganzen Schirm nehmen und beim Scrollen
 * nachladen.
 *
 * Geprüft wird das DOM und nicht das Bild: In jsdom hat nichts eine Höhe, also
 * kann hier weder ein Raster gemessen noch ein Scrollen nachgestellt werden.
 * Was bleibt, ist genau das, woran es hängt — welche Kacheln dastehen, was im
 * Kopf sichtbar ist, und welche Zahl am Raster klebt.
 */
function catalogue(taken: string[]): MenuEntry[] {
  const files = Array.from({ length: 140 }, (_, i) => ({
    id: `kaykit:tile_${i}.glb`,
    label: `Tile ${i}`,
    run: () => taken.push(`tile_${i}`),
  }));
  return [
    {
      id: 'assets',
      label: 'Regal',
      grid: true,
      cols: 2,
      full: true,
      take: true,
      find: (query) =>
        files.filter((file) => file.label.toLowerCase().includes(query.toLowerCase())),
      children: [
        // Zwei Fächer, wie sie `core/kaykitIndex.ts` baut — und beide
        // übersprungen, weil die Seite scrollt statt zu blättern.
        {
          id: 'kaykit:#0',
          label: '1–60',
          grid: true,
          flatten: true,
          children: files.slice(0, 60),
        },
        {
          id: 'kaykit:#60',
          label: '61–140',
          grid: true,
          flatten: true,
          children: files.slice(60),
        },
      ],
    },
  ];
}

describe('Der Katalog auf der Seite', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    window.localStorage.clear();
  });

  afterEach(() => {
    host.remove();
  });

  it('überspringt die Fächer und zeigt die Modelle selbst', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    // Kein „1–60" mehr: Die erste Kachel ist das erste Modell.
    expect(rows(menu)[0]).toBe('kaykit:tile_0.glb');
    expect(rows(menu)).not.toContain('kaykit:#0');
    menu.dispose();
  });

  it('zeichnet erst einen Schwung und sagt, wie viele es sind', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    expect(rows(menu)).toHaveLength(60);
    expect(menu.element.querySelector('.pmenu__foot')!.textContent).toContain('60 von 140');
    menu.dispose();
  });

  it('nimmt eine nachgeladene Kachel wie jede andere', () => {
    const taken: string[] = [];
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue(taken));
    menu.openSubmenu('assets');
    click(menu, 'kaykit:tile_3.glb');
    expect(taken).toEqual(['tile_3']);
    menu.dispose();
  });

  it('nimmt den ganzen Schirm, und nur auf dieser Seite', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.toggle(true);
    expect(menu.element.classList.contains('pmenu--full')).toBe(false);
    menu.openSubmenu('assets');
    expect(menu.element.classList.contains('pmenu--full')).toBe(true);
    menu.dispose();
  });

  it('filtert, was im Suchfeld steht', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    const search = menu.element.querySelector<HTMLInputElement>('.pmenu__search')!;
    expect(search.hidden).toBe(false);
    search.value = 'tile 13';
    search.dispatchEvent(new Event('input'));
    expect(rows(menu)).toEqual([
      'kaykit:tile_13.glb',
      'kaykit:tile_130.glb',
      'kaykit:tile_131.glb',
      'kaykit:tile_132.glb',
      'kaykit:tile_133.glb',
      'kaykit:tile_134.glb',
      'kaykit:tile_135.glb',
      'kaykit:tile_136.glb',
      'kaykit:tile_137.glb',
      'kaykit:tile_138.glb',
      'kaykit:tile_139.glb',
    ]);
    expect(menu.element.querySelector('.pmenu__foot')!.textContent).toContain('11 Treffer');
    menu.dispose();
  });

  /**
   * **Ein Treffer nimmt den Treffer** — und nicht die Zeile, die ohne Suche an
   * derselben Stelle stünde.
   *
   * Genau das ging schief: Der Druck las seinen Index in der Liste der
   * **Seite** statt in der, die dasteht. Wer im Regal `crate buns` suchte und
   * zugriff, stieg damit in die erste Kategorie ab.
   */
  it('nimmt den Treffer und nicht die Zeile darunter', () => {
    const taken: string[] = [];
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue(taken));
    menu.openSubmenu('assets');
    const search = menu.element.querySelector<HTMLInputElement>('.pmenu__search')!;
    search.value = 'tile 77';
    search.dispatchEvent(new Event('input'));
    expect(rows(menu)).toEqual(['kaykit:tile_77.glb']);
    click(menu, 'kaykit:tile_77.glb');
    expect(taken).toEqual(['tile_77']);
    menu.dispose();
  });

  it('sagt es, wenn nichts gefunden wird', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    const search = menu.element.querySelector<HTMLInputElement>('.pmenu__search')!;
    search.value = 'Amboss';
    search.dispatchEvent(new Event('input'));
    expect(rows(menu)).toEqual([]);
    expect(menu.element.querySelector('.pmenu__foot')!.textContent).toContain('Nichts gefunden');
    menu.dispose();
  });

  it('räumt das Suchfeld, wenn eine andere Seite aufgeschlagen wird', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    const search = menu.element.querySelector<HTMLInputElement>('.pmenu__search')!;
    search.value = 'tile 13';
    search.dispatchEvent(new Event('input'));
    expect(rows(menu)).toHaveLength(11);
    menu.element.querySelector<HTMLElement>('.pmenu__back')!.click();
    expect(search.value).toBe('');
    menu.openSubmenu('assets');
    expect(rows(menu)).toHaveLength(60);
    menu.dispose();
  });

  it('zeigt das Suchfeld nur, wo es eines gibt', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.toggle(true);
    expect(menu.element.querySelector<HTMLInputElement>('.pmenu__search')!.hidden).toBe(true);
    menu.dispose();
  });

  it('zählt die Spalten hoch und herunter und merkt sie sich', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    const list = menu.element.querySelector<HTMLElement>('.pmenu__list')!;
    const steps = menu.element.querySelectorAll<HTMLElement>('.pmenu__step');
    const before = Number(list.style.getPropertyValue('--pmenu-cols'));
    steps[1]!.click();
    expect(Number(list.style.getPropertyValue('--pmenu-cols'))).toBe(before + 1);
    expect(menu.element.querySelector('.pmenu__colsnum')!.textContent).toBe(String(before + 1));
    steps[0]!.click();
    expect(Number(list.style.getPropertyValue('--pmenu-cols'))).toBe(before);
    menu.dispose();

    // **Und der nächste Besuch fängt dort an**, wo man aufgehört hat: Die Zahl
    // steht im Speicher des Browsers (`ui/pageCols.ts`). Sie ist hier `before`
    // und trotzdem eine Entscheidung — das Feld steht jetzt im Speicher, und
    // ein anders breites Fenster ändert daran nichts mehr.
    expect(window.localStorage.getItem('bgvr.cols')).toBe(String(before));
    const again = new PageMenu({ host });
    again.setRoot(catalogue([]));
    again.openSubmenu('assets');
    const kept = again.element.querySelector<HTMLElement>('.pmenu__list')!;
    expect(Number(kept.style.getPropertyValue('--pmenu-cols'))).toBe(before);
    again.element.querySelectorAll<HTMLElement>('.pmenu__step')[1]!.click();
    expect(Number(kept.style.getPropertyValue('--pmenu-cols'))).toBe(before + 1);
    again.dispose();
  });

  it('lässt die Spaltenknöpfe weg, wo sie nichts zu sagen haben', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.toggle(true);
    expect(menu.element.querySelector<HTMLElement>('.pmenu__cols')!.hidden).toBe(true);
    menu.openSubmenu('assets');
    expect(menu.element.querySelector<HTMLElement>('.pmenu__cols')!.hidden).toBe(false);
    menu.dispose();
  });
});

/**
 * **Von vorne durch den Katalog** (`MenuEntry.home`) — der Knopf im Kopf, der
 * nicht eine Ebene zurückgeht, sondern an den Anfang springt.
 *
 * Der Katalog ist tief: drei Wege hinein, darunter Pakete, Ordner und
 * viertausendfünfhundert Kacheln. Wer dort unten steht, soll nicht achtmal
 * *Zurück* drücken müssen, um etwas ganz anderes zu suchen.
 */
function deepCatalogue(): MenuEntry[] {
  const tile = { id: 'kaykit:barrel.glb', label: 'Fass' };
  return [
    {
      id: 'assets',
      label: 'Regal',
      home: true,
      children: [
        {
          id: 'kaykit#cats',
          label: 'Nach Kategorien',
          children: [{ id: 'kaykit#cat:food', label: 'Essen', children: [tile] }],
        },
        { id: 'kaykit#packs', label: 'Nach Paketen', children: [tile] },
      ],
    },
    { id: 'move', label: 'Bewegung', children: [{ id: 'move:posture', label: 'Haltung' }] },
  ];
}

describe('Von vorne durch den Katalog', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    window.localStorage.clear();
  });

  afterEach(() => host.remove());

  function home(menu: PageMenu): HTMLButtonElement {
    return menu.element.querySelector<HTMLButtonElement>('.pmenu__home')!;
  }

  it('steht erst unterhalb des Anfangs da', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(deepCatalogue());
    menu.toggle(true);
    expect(home(menu).hidden).toBe(true);
    menu.openSubmenu('assets');
    // Auf der Gabelung selbst wäre er ein Knopf, der nichts tut.
    expect(home(menu).hidden).toBe(true);
    click(menu, 'kaykit#cats');
    expect(home(menu).hidden).toBe(false);
    menu.dispose();
  });

  it('springt aus jeder Tiefe an den Anfang', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(deepCatalogue());
    menu.openSubmenu('assets');
    click(menu, 'kaykit#cats');
    click(menu, 'kaykit#cat:food');
    expect(title(menu)).toBe('Essen');
    home(menu).click();
    expect(title(menu)).toBe('Regal');
    expect(rows(menu)).toEqual(['kaykit#cats', 'kaykit#packs']);
    expect(home(menu).hidden).toBe(true);
    menu.dispose();
  });

  it('bleibt weg, wo kein Katalog ist', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(deepCatalogue());
    menu.openSubmenu('move');
    expect(home(menu).hidden).toBe(true);
    menu.dispose();
  });

  /**
   * Der Weg durchs Menü merkt sich den Katalog über das Neuladen hinaus
   * (`ui/menuRecall.ts`); das Zumachen hat er ohnehin nie vergessen.
   */
  it('schlägt den Katalog wieder dort auf, wo er zumachte', () => {
    const menu = new PageMenu({ host, nav: new MenuNav(catalogRecall()) });
    menu.setRoot(deepCatalogue());
    menu.openSubmenu('assets');
    click(menu, 'kaykit#cats');
    menu.toggle(false);
    menu.toggle(true);
    expect(title(menu)).toBe('Nach Kategorien');
    menu.dispose();

    // Und nach einem Neuladen — ein zweites Menü mit einem zweiten Weg, das
    // nur den Zettel im Speicher gemeinsam hat.
    const again = new PageMenu({ host, nav: new MenuNav(catalogRecall()) });
    again.setRoot(deepCatalogue());
    again.toggle(true);
    expect(title(again)).toBe('Menü');
    click(again, 'assets');
    expect(title(again)).toBe('Nach Kategorien');
    again.dispose();
  });
});

/**
 * **Die Blätterstellung überlebt das Zumachen** — und das hängt an einer
 * Reihenfolge, die man nur im Browser sieht.
 *
 * `hidden` ist für den Browser ein `display: none`, und ein Kasten, der nicht
 * angezeigt wird, hat kein `scrollTop` mehr. Gemerkt werden muss also
 * **vorher**. In jsdom ist `scrollTop` eine gewöhnliche Zahl und vergisst
 * nichts — deshalb stellt dieser Test das Vergessen nach.
 */
describe('Die Blätterstellung über das Zumachen hinweg', () => {
  let host: HTMLElement;

  beforeEach(() => {
    host = document.createElement('div');
    document.body.append(host);
    window.localStorage.clear();
  });

  afterEach(() => host.remove());

  it('merkt sich die Stelle, bevor die Liste versteckt wird', () => {
    const menu = new PageMenu({ host });
    menu.setRoot(catalogue([]));
    menu.openSubmenu('assets');
    const stage = menu.element.querySelector<HTMLElement>('.pmenu__stage')!;

    // Wie im Browser: Wer versteckt wird, steht wieder oben.
    const element = menu.element;
    Object.defineProperty(element, 'hidden', {
      configurable: true,
      get: () => element.hasAttribute('hidden'),
      set: (on: boolean) => {
        if (!on) return element.removeAttribute('hidden');
        element.setAttribute('hidden', '');
        stage.scrollTop = 0;
      },
    });

    stage.scrollTop = 1740;
    menu.toggle(false);
    menu.toggle(true);
    expect(stage.scrollTop).toBe(1740);
    menu.dispose();
  });
});
