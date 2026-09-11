/** @jest-environment jsdom */
import { FlatMode } from './flatMode';
import { FlatRound } from './flatRound';
import { puzzleFor, repairsFor } from '../mission';
import { FlatWalker } from './flatWalk';

jest.mock('./flat.css', () => ({}));

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : () => {}),
        set: (target, key: string, value) => {
          target[key] = value;
          return true;
        },
      }),
  ) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

function pointer(node: HTMLElement, type: string, id: number, x: number, y: number): void {
  const event = new Event(type, { bubbles: true }) as PointerEvent;
  Object.assign(event, { pointerId: id, clientX: x, clientY: y });
  node.dispatchEvent(event);
}

const DT = 1 / 30;

describe('Die 2D-Welt', () => {
  it('bewegt den Spieler mit dem Stock und beschriftet die drei Knöpfe', () => {
    const exit = jest.fn();
    const flat = new FlatMode(3, { test: true }, { exit });
    document.body.append(flat.element);
    const stick = flat.element.querySelector<HTMLElement>('.flat__stick')!;
    stick.getBoundingClientRect = () =>
      ({
        left: 0,
        top: 300,
        width: 200,
        height: 300,
        right: 200,
        bottom: 600,
        x: 0,
        y: 300,
      }) as DOMRect;
    const start = { ...flat.round.player };
    pointer(stick, 'pointerdown', 7, 80, 500);
    pointer(stick, 'pointermove', 7, 80, 560);
    for (let i = 0; i < 30; i++) flat.update(DT);
    expect(flat.round.player.z).toBeGreaterThan(start.z);
    pointer(stick, 'pointerup', 7, 80, 560);
    const z = flat.round.player.z;
    for (let i = 0; i < 10; i++) flat.update(DT);
    expect(flat.round.player.z).toBe(z);
    const keys = [...flat.element.querySelectorAll<HTMLButtonElement>('.flat__buttons .flat__key')];
    // Zwei kleine Knöpfe oben (Wechseln, Werkzeug), der große „Benutzen" darunter.
    expect(keys.map((k) => k.querySelector('small')?.textContent)).toEqual([
      'Wechseln',
      'Werkzeug',
      // Der große Knopf nennt klein, was in Reichweite liegt — oder nichts.
      flat.round.target?.label ?? '',
    ]);
    expect(keys[2]!.querySelector('strong')?.textContent).toBe('Benutzen');
    expect(keys[2]!.classList.contains('is-ready')).toBe(!!flat.round.target);
    expect(keys[2]!.classList.contains('flat__key--act')).toBe(true);
    expect(keys[0]!.disabled).toBe(true);
    keys[1]!.click();
    expect(flat.round.torch).toBe(false);
    // Ohne gepufferte Bilder bleibt der Wechseln-Knopf beim Namen des Werkzeugs.
    const icon = () => keys[0]!.querySelector<HTMLCanvasElement>('.flat__icon')!;
    expect(icon().hidden).toBe(true);
    // Mit Puffer hängt das Comic-Bild des aktiven Werkzeugs darin.
    const stub = document.createElement('canvas');
    stub.width = 64;
    stub.height = 64;
    flat.setToolIcons({ icon: (tool) => (tool === 'flashlight' ? stub : null) });
    expect(icon().hidden).toBe(false);
    expect(icon().width).toBe(64);
    flat.dispose();
  });

  it('zeigt oben links nur zwei Zeilen: Uhr mit Anzug und die Aufgabenkreise', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    flat.update(DT);
    const hud = flat.element.querySelector<HTMLElement>('.flat__hud')!;
    // Der Balken „Aufgaben erledigt" ist weg — die Kreise zählen dasselbe.
    expect(hud.querySelector('.flat__bar')).toBeNull();
    expect(hud.querySelector('.flat__oxygen')?.textContent).toMatch(/^O₂ \d+:\d\d$/);
    // Der Anzug als Herzen: was gemeint ist, steht dann im Zeichen selbst.
    expect(hud.querySelector('.flat__suit')?.textContent).toBe('♥♥♥');
    // Die erste Zeile ist genau das: Uhr und Anzug, sonst nichts.
    const vitals = hud.querySelector<HTMLElement>('.flat__vitals')!;
    expect([...vitals.children].map((node) => node.className)).toEqual([
      'flat__oxygen',
      'flat__suit',
    ]);
    const tasks = [...hud.querySelectorAll<HTMLElement>('.flat__task')];
    const repairs = repairsFor(flat.round.house);
    expect(tasks).toHaveLength(3);
    tasks.forEach((task, i) => {
      expect(task.textContent).toContain(repairs[i]!.title);
      expect(task.textContent).toMatch(/\(0\/2\)$/);
      expect(task.classList.contains('is-done')).toBe(false);
    });
    // Eine Reparatur erledigt: Zeile grün mit (2/2).
    flat.round.state().done.push(repairs[0]!.itemId);
    flat.update(DT);
    const first = hud.querySelector<HTMLElement>('.flat__task')!;
    expect(first.classList.contains('is-done')).toBe(true);
    expect(first.textContent).toMatch(/\(2\/2\)$/);
    // Das Teil in der Hand: halb geschafft, gelb.
    flat.round.state().crew.inventory.push(repairs[1]!.itemId);
    flat.update(DT);
    const second = hud.querySelectorAll<HTMLElement>('.flat__task')[1]!;
    expect(second.classList.contains('is-partial')).toBe(true);
    expect(second.textContent).toMatch(/\(1\/2\)$/);
    // Der Reiter fängt eingeklappt an und zeigt dann nur die Kreise; ein Tipp
    // klappt die Liste auf, der nächste wieder zu.
    const tab = hud.querySelector<HTMLButtonElement>('.flat__tab')!;
    expect(hud.classList.contains('is-collapsed')).toBe(true);
    expect(tab.querySelector('.flat__tab-label')?.textContent).toBe('Aufgaben:');
    const pips = [...hud.querySelectorAll<HTMLElement>('.flat__pip')];
    expect(pips).toHaveLength(3);
    expect(pips[0]!.classList.contains('is-done')).toBe(true);
    expect(pips[1]!.classList.contains('is-partial')).toBe(true);
    expect(pips[2]!.classList.contains('is-done')).toBe(false);
    tab.click();
    expect(hud.classList.contains('is-collapsed')).toBe(false);
    tab.click();
    expect(hud.classList.contains('is-collapsed')).toBe(true);
    flat.dispose();
  });

  it('öffnet die Kartenübersicht aus dem Zahnrad und schließt sie wieder', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const overlay = flat.element.querySelector<HTMLElement>('.flat__map')!;
    expect(overlay.hidden).toBe(true);
    expect(flat.mapOpen).toBe(false);
    // Der eigene 🗺-Knopf oben rechts ist weg; die Karte steht im Zahnrad.
    expect(flat.element.querySelector('.flat__mapkey')).toBeNull();
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    flat.element.querySelector<HTMLButtonElement>('[data-map]')!.click();
    expect(overlay.hidden).toBe(false);
    expect(flat.mapOpen).toBe(true);
    expect(flat.openOverlay).toBe('map');
    // Die alte Karte zeichnet im Modus der Runde, mit dem Spieler drauf.
    flat.update(DT);
    expect(flat.map.current.field.mode).toBe('realistic');
    expect(flat.map.stats.rooms).toBe(flat.round.snapshot().rooms.length);
    expect(flat.map.stats.entities).toBe(1);
    overlay.querySelector<HTMLButtonElement>('.flat__map-close')!.click();
    expect(overlay.hidden).toBe(true);
    // Die Szene hat die ganze Zeit gezeichnet.
    expect(flat.scene.stats.rooms).toBeGreaterThan(0);
    expect(flat.scene.current.following).toBe('player');
    flat.dispose();
  });

  it('öffnet das Rätsel als Overlay und schließt es beim Lösen', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const round = flat.round;
    const jobs = round.jobs();
    const walker = new FlatWalker(round);
    for (const job of jobs.slice(0, 2)) {
      let input = walker.input(job.at, DT);
      while (input) {
        round.step(DT, input);
        input = walker.input(job.at, DT);
      }
      round.act('interact');
      if (job.kind === 'cargo') round.act('interact');
    }
    expect(round.puzzle).not.toBeNull();
    flat.update(DT);
    const overlay = flat.element.querySelector<HTMLElement>('.flat__puzzle')!;
    expect(overlay.hidden).toBe(false);
    const repair = round.puzzle!;
    const puzzle = puzzleFor(round.state().crew, repair.id);
    const press = (selector: string) => overlay.querySelector<HTMLButtonElement>(selector)!.click();
    if (repair.puzzle === 'wires')
      for (let plug = 0; plug < 4; plug++) {
        press(`[data-plug="${plug}"]`);
        press(`[data-socket="${repair.order.indexOf(plug)}"]`);
      }
    else if (repair.puzzle === 'sequence')
      for (const digit of repair.code) press(`[data-digit="${digit}"]`);
    else {
      for (let column = 0; column < 3; column++)
        while (puzzle.digits[column] !== Number(repair.code[column]))
          press(`[data-turn="${column}"]`);
      press('[data-send]');
    }
    expect(round.puzzle).toBeNull();
    expect(round.state().done).toHaveLength(1);
    flat.update(DT);
    expect(overlay.hidden).toBe(true);
    flat.dispose();
  });

  it('bietet dem Zuschauer im Optionsmenü genau die zwei Modi an und wechselt', () => {
    const exit = jest.fn();
    const flat = new FlatMode(3, { role: 'watch' }, { exit });
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const modes = [...flat.element.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    expect(modes.map((m) => m.querySelector('strong')?.textContent)).toEqual([
      'Alles sehen',
      'Realitätsnah',
    ]);
    expect(flat.visibilityMode).toBe('realistic');
    modes[0]!.click();
    expect(flat.visibilityMode).toBe('omniscient');
    flat.update(DT);
    expect(flat.scene.current.field.mode).toBe('omniscient');
    expect(flat.scene.current.field.visibleEntities).toHaveLength(2);
    // Ohne Dunkelheit: nichts ausgeschnitten, nur unbeleuchtete Räume abgedunkelt.
    expect(flat.scene.stats.cuts).toBe(0);
    // Das Menü baut sich nach jedem Klick neu — also frisch nachschlagen.
    flat.element.querySelectorAll<HTMLButtonElement>('[data-mode]')[1]!.click();
    flat.update(DT);
    expect(flat.scene.current.field.mode).toBe('realistic');
    expect(flat.scene.stats.cuts).toBeGreaterThan(0);
    flat.element.querySelector<HTMLButtonElement>('[data-leave]')!.click();
    expect(exit).toHaveBeenCalled();
    flat.dispose();
  });

  /**
   * **Das Zahnrad zeigt nur noch, was sich mitten in der Runde ändert.** Alles,
   * was die *nächste* Runde betrifft — neue Runde, mit oder ohne Monster, die
   * ganze Verteilung —, steht im Aufbau. Dazugekommen sind die drei Dinge, die
   * der Besitzer hier ausdrücklich haben wollte: Zuschauen, 2D ↔ 3D, Runde
   * verlassen.
   */
  it('lässt aus dem Optionsmenü Monster und Verteilung weg und bietet Zuschauen, 2D↔3D, Verlassen', () => {
    const switchView = jest.fn();
    const flat = new FlatMode(3, { role: 'watch' }, { exit: () => {}, switchView });
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.querySelector('[data-role]')).toBeNull();
    expect(panel.querySelector('[data-monster]')).toBeNull();
    expect(panel.querySelector('[data-restart]')).toBeNull();
    expect(panel.querySelector('.setup')).toBeNull();
    // Was bleibt: Ansicht, Zielpfade, Ton — und die drei neuen Knöpfe.
    expect(panel.querySelector('[data-routes]')).not.toBeNull();
    expect(panel.querySelector('[data-audio="effects"]')).not.toBeNull();
    expect(panel.querySelector('[data-watch]')?.textContent).toContain('Zuschauen: an');
    expect(panel.querySelector('[data-switch-view]')?.textContent).toContain('3D Schiff');
    expect(panel.querySelector('[data-leave]')?.textContent).toContain('Runde verlassen');
    // **Zuschauen geht immer** — an und wieder aus, mitten in der Runde.
    flat.element.querySelector<HTMLButtonElement>('[data-watch]')!.click();
    expect(flat.role).toBe('technician');
    flat.element.querySelector<HTMLButtonElement>('[data-watch]')!.click();
    expect(flat.role).toBe('watch');
    // Und der Wechsel der Ansicht geht an die Welt, die das Schiff kennt.
    flat.element.querySelector<HTMLButtonElement>('[data-switch-view]')!.click();
    expect(switchView).toHaveBeenCalledWith('3d');
    flat.dispose();
  });

  /** Wer mitspielt, darf nicht durch Wände sehen — „Alles sehen" ist Zuschauersache. */
  it('gibt dem Techniker die Ansicht als Zeile statt als Knopf', () => {
    const flat = new FlatMode(3, {}, { exit: () => {} });
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.querySelectorAll('[data-mode]')).toHaveLength(0);
    expect(panel.textContent).toContain('Realitätsnah');
    expect(panel.textContent).toContain('Du spielst den Techniker');
    flat.dispose();
  });

  it('lässt beim Zuschauen den Techniker aus Zahlen spielen — ohne Stock und Knöpfe', () => {
    const flat = new FlatMode(3, { role: 'watch', mode: 'omniscient' }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.role).toBe('watch');
    expect(flat.element.querySelector<HTMLElement>('.flat__stick')!.hidden).toBe(true);
    expect(flat.element.querySelector<HTMLElement>('.flat__buttons')!.hidden).toBe(true);
    // Die Szene bleibt, samt dem Knopf, der sie zum Techniker zurückholt.
    expect(flat.element.querySelector<HTMLElement>('.flat__scene')!.hidden).toBe(false);
    expect(flat.element.querySelector<HTMLElement>('.flat__centre')!.hidden).toBe(false);
    const start = { ...flat.round.player };
    for (let i = 0; i < 90; i++) flat.update(DT);
    const moved = Math.hypot(flat.round.player.x - start.x, flat.round.player.z - start.z);
    expect(moved).toBeGreaterThan(1);
    // Wer spielt, steht im Optionsmenü und nicht mehr am oberen Bildschirmrand.
    expect(flat.element.querySelector('.flat__hud')?.textContent).not.toContain('Bot-Runde');
    // Die Kamera hängt am Techniker.
    expect(flat.scene.getView().centreX).toBeCloseTo(flat.round.player.x);
    // Das Optionsmenü sagt, wer gerade spielt — und hat statt des Absatzes
    // „Wessen Sicht?" jetzt den Schalter, von dem er nur redete: Zuschauen
    // an und aus. Der dreistufige Rollenzykler bleibt weg.
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.textContent).toContain('Du siehst zu');
    expect(panel.querySelector('[data-watch]')?.getAttribute('aria-pressed')).toBe('true');
    expect(panel.querySelector('[data-role]')).toBeNull();
    flat.dispose();
  });

  /** Die Rolle `watch` hat keinen Stock — auch nicht, wenn die Runde neu anfängt. */
  it('behält beim Zuschauen die Rolle über eine neue Runde hinweg', () => {
    const flat = new FlatMode(3, { role: 'watch' }, { exit: () => {} });
    document.body.append(flat.element);
    flat.round.state().crew.hp = 0;
    flat.round.haunt.phase = 'lost';
    flat.update(DT);
    flat.element.querySelector<HTMLButtonElement>('.flat__ending [data-restart]')!.click();
    expect(flat.role).toBe('watch');
    expect(flat.element.querySelector<HTMLElement>('.flat__stick')!.hidden).toBe(true);
    flat.dispose();
  });

  it('zeigt das Ende und fängt neu an', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    flat.round.state().crew.hp = 0;
    flat.round.haunt.phase = 'lost';
    flat.update(DT);
    const ending = flat.element.querySelector<HTMLElement>('.flat__ending')!;
    expect(ending.hidden).toBe(false);
    ending.querySelector<HTMLButtonElement>('[data-restart]')!.click();
    expect(flat.round.phase).toBe('running');
    expect(ending.hidden).toBe(true);
    flat.dispose();
  });
});

/**
 * **Ein Overlay auf einmal.** Karte, Rätsel, Raumakte und Optionsmenü wollen
 * dieselbe Fläche; solange eines offen ist, sind HUD, Reiter, Stock, Knöpfe und
 * die Szene weg — und zwar aus *einer* Stelle heraus (`applyOverlay`).
 */
describe('Ein Overlay auf einmal', () => {
  /** Was die Spielansicht ausmacht — alles davon geht unter einem Overlay weg. */
  function chrome(flat: FlatMode): Record<string, boolean> {
    const at = (selector: string): boolean =>
      !!flat.element.querySelector<HTMLElement>(selector)?.hidden;
    return {
      top: at('.flat__top'),
      stick: at('.flat__stick'),
      buttons: at('.flat__buttons'),
      scene: at('.flat__scene'),
    };
  }

  it('versteckt unter der Karte HUD, Reiter, Stock, Knöpfe und die Szene', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    flat.update(DT);
    expect(flat.openOverlay).toBe('none');
    expect(chrome(flat)).toEqual({ top: false, stick: false, buttons: false, scene: false });
    flat.showMap(true);
    flat.update(DT);
    expect(flat.openOverlay).toBe('map');
    expect(chrome(flat)).toEqual({ top: true, stick: true, buttons: true, scene: true });
    // Der Reiter „Aufgaben:" hängt im HUD und geht damit mit weg.
    expect(
      flat.element.querySelector<HTMLElement>('.flat__tab')!.closest('.flat__top'),
    ).not.toBeNull();
    // Die Runde läuft weiter — sie ist nur nicht zu sehen.
    const time = flat.round.state().time;
    flat.update(DT);
    expect(flat.round.state().time).toBeGreaterThan(time);
    flat.element.querySelector<HTMLButtonElement>('.flat__map-close')!.click();
    flat.update(DT);
    expect(flat.openOverlay).toBe('none');
    expect(chrome(flat)).toEqual({ top: false, stick: false, buttons: false, scene: false });
    flat.dispose();
  });

  it('lässt Karte, Akte und Optionsmenü einander ablösen statt sich zu stapeln', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const map = flat.element.querySelector<HTMLElement>('.flat__map')!;
    const sheet = flat.element.querySelector<HTMLElement>('.flat__sheet')!;
    const options = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    const open = (): string[] =>
      [
        ['map', map],
        ['sheet', sheet],
        ['options', options],
      ]
        .filter(([, node]) => !(node as HTMLElement).hidden)
        .map(([name]) => name as string);
    flat.showMap(true);
    expect(open()).toEqual(['map']);
    flat.openSheet(flat.round.snapshot().rooms[0]!.id);
    expect(open()).toEqual(['sheet']);
    expect(flat.mapOpen).toBe(false);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    expect(open()).toEqual(['options']);
    flat.element.querySelector<HTMLButtonElement>('[data-close-options]')!.click();
    expect(open()).toEqual([]);
    expect(flat.openOverlay).toBe('none');
    flat.dispose();
  });

  /**
   * **Der Streifen der Seite gehört nicht über die 2D-Welt** (`core/pageHud.ts`):
   * Er lag mit z-index 5 über Aufgabenkasten und Sprungknöpfen. Beim Verlassen
   * kommt er zurück, wie er war.
   */
  it('schaltet die Kopfzeile der Seite ab und beim Verlassen wieder an', () => {
    const hud = document.createElement('div');
    hud.id = 'hud';
    document.body.append(hud);
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    expect(hud.hidden).toBe(true);
    flat.dispose();
    expect(hud.hidden).toBe(false);
    hud.remove();
  });
});

describe('Die Sprungknöpfe rechts', () => {
  /**
   * **Ein Knopf, der nichts tut, gehört weg.** Wer die Kamera ohnehin am
   * Spieler hat, braucht keinen Knopf, der sie dorthin holt — er nimmt nur
   * Platz vor der Szene weg. Sobald man wegzieht, ist er wieder da.
   */
  it('zeigt „Zum Spieler" erst, wenn die Kamera nicht mehr folgt', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    flat.update(DT);
    const centre = flat.element.querySelector<HTMLElement>('.flat__centre')!;
    const monster = flat.element.querySelector<HTMLElement>('.flat__centre--monster')!;
    expect(centre.hidden).toBe(true);
    expect(monster.hidden).toBe(true);
    flat.scene.panBy(90, 0);
    flat.update(DT);
    expect(centre.hidden).toBe(false);
    centre.click();
    flat.update(DT);
    expect(flat.scene.current.following).toBe('player');
    expect(centre.hidden).toBe(true);
    flat.dispose();
  });

  /** Wer zusieht, hat keinen eigenen Spieler — für ihn stehen beide immer da. */
  it('gibt dem Zuschauer beide Knöpfe, auch während die Kamera folgt', () => {
    const flat = new FlatMode(3, { role: 'watch' }, { exit: () => {} });
    document.body.append(flat.element);
    flat.update(DT);
    const centre = flat.element.querySelector<HTMLElement>('.flat__centre')!;
    const monster = flat.element.querySelector<HTMLElement>('.flat__centre--monster')!;
    expect(flat.role).toBe('watch');
    expect(centre.hidden).toBe(false);
    expect(monster.hidden).toBe(false);
    monster.click();
    flat.update(DT);
    expect(flat.scene.current.following).toBe('monster');
    expect(centre.hidden).toBe(false);
    flat.dispose();
  });

  /**
   * **Sie dürfen nie verdeckt sein.** Vorher hingen HUD, Zahnrad,
   * Rollenstreifen und Sprungknöpfe je an einem eigenen Abstand vom oberen
   * Rand und lagen damit voreinander: „Zum Spieler" gab es, zu sehen war der
   * Reiter davor. Jetzt steht alles in **einer** Spalte, drei Zeilen: Rollen
   * und Zahnrad, darunter der Kasten, darunter die Sprungknöpfe.
   */
  it('stellt Rollen, Kasten und Sprungknöpfe untereinander in eine Spalte', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const top = flat.element.querySelector<HTMLElement>('.flat__top')!;
    const rows = [...top.children].map((node) => node.classList[0]);
    expect(rows).toEqual(['flat__top-row', 'flat__top-row', 'flat__jump']);
    expect(top.children[1]!.classList.contains('flat__top-row--hud')).toBe(true);
    // Erste Zeile: die Rollenknöpfe, am Ende das Zahnrad — und sonst nichts.
    const row = top.querySelector<HTMLElement>('.flat__top-row')!;
    expect([...row.children].map((node) => node.className)).toEqual([
      'role-strip',
      'flat__corner flat__options',
    ]);
    // Zweite Zeile: der Kasten mit Auftrag und Uhr.
    expect(
      [...top.querySelector<HTMLElement>('.flat__top-row--hud')!.children].map(
        (node) => node.className,
      ),
    ).toEqual(['flat__hud is-collapsed']);
    // Verschoben steht „Zum Spieler" da, und die ganze Spalte ist sichtbar.
    flat.scene.panBy(90, 0);
    flat.update(DT);
    expect(top.hidden).toBe(false);
    expect(flat.element.querySelector<HTMLElement>('.flat__centre')!.hidden).toBe(false);
    flat.dispose();
  });

  /**
   * **Ist das Optionsmenü offen, ist der Kopf weg** — Rollen, Kasten und
   * Sprungknöpfe. Wer das Menü aufmacht, will das Menü sehen und nicht
   * daneben noch die halbe Runde.
   */
  it('nimmt den ganzen Kopf weg, solange das Optionsmenü offen ist', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const top = flat.element.querySelector<HTMLElement>('.flat__top')!;
    expect(top.hidden).toBe(false);
    flat.element.querySelector<HTMLElement>('.flat__options')!.click();
    expect(flat.openOverlay).toBe('options');
    expect(top.hidden).toBe(true);
    flat.dispose();
  });

  /**
   * **Zuschauer steht in derselben Zeile wie die Rollen** und sieht alles: Ein
   * Zuschauer mit der Sicht des Anzugs sähe ein schwarzes Bild.
   */
  it('macht aus dem Zuschauer-Knopf eine Bot-Runde mit allwissender Karte', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.role).toBe('technician');
    const watch = (): HTMLButtonElement =>
      flat.element.querySelector<HTMLButtonElement>('[data-role-extra="watch"]')!;
    watch().click();
    expect(flat.role).toBe('watch');
    expect(flat.visibilityMode).toBe('omniscient');
    expect(watch().classList.contains('is-active')).toBe(true);
    watch().click();
    expect(flat.role).toBe('technician');
    expect(flat.visibilityMode).toBe('realistic');
    expect(watch().classList.contains('is-active')).toBe(false);
    flat.dispose();
  });

  /**
   * **Verschieben ist ein Blick zur Seite, kein Zustand.** Wer weitergeht,
   * bekommt seine Kamera zurück, ohne einen Knopf zu suchen.
   */
  it('holt die Kamera beim ersten Schritt von selbst zum Spieler zurück', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    flat.update(DT);
    flat.scene.panBy(120, 0);
    expect(flat.scene.current.following).toBeNull();
    // Stillstehen ändert nichts — der Blick zur Seite bleibt.
    flat.update(DT);
    expect(flat.scene.current.following).toBeNull();
    // Ein Schritt holt sie zurück.
    for (let i = 0; i < 3; i++) flat.round.step(DT, { x: 1, z: 0, sprint: false });
    flat.update(DT);
    expect(flat.scene.current.following).toBe('player');
    flat.dispose();
  });
});

/**
 * **Zuschauen übers Netz.** Läuft im Raum eine echte Runde, reicht der Wirt
 * ihren Stand herein (`FlatModeHost.watchSnapshot`) — dann rechnet die 2D-Welt
 * gar nichts mehr, sondern zeichnet, was der Gastgeber ansagt.
 */
describe('Der Zuschauer am Netz', () => {
  /** Eine echte Runde als Quelle, ein paar Schritte weit gelaufen. */
  function liveRound(): FlatRound {
    const live = new FlatRound(11, { test: true });
    for (let i = 0; i < 60; i++) live.step(DT, { x: 1, z: 0, sprint: false });
    return live;
  }

  it('zeichnet die laufende Runde und lässt keinen Techniker aus Zahlen laufen', () => {
    const live = liveRound();
    const flat = new FlatMode(
      11,
      { role: 'watch', mode: 'omniscient' },
      { exit: () => {}, watchSnapshot: () => live.snapshot() },
    );
    document.body.append(flat.element);
    const own = { ...flat.round.player };
    for (let i = 0; i < 10; i++) flat.update(DT);
    expect(flat.role).toBe('watch');
    // Die eigene Runde steht still — sie ist nur noch das Haus zum Snapshot.
    expect(flat.round.player.x).toBeCloseTo(own.x);
    expect(flat.round.state().time).toBe(0);
    // Die Kamera hängt am Techniker **aus dem Netz**, nicht am eigenen.
    expect(flat.scene.getView().centreX).toBeCloseTo(live.player.x);
    expect(live.player.x).not.toBeCloseTo(own.x);
    // Kein Stock, keine Knöpfe — und beide Sprungknöpfe stehen da.
    expect(flat.element.querySelector<HTMLElement>('.flat__stick')!.hidden).toBe(true);
    expect(flat.element.querySelector<HTMLElement>('.flat__buttons')!.hidden).toBe(true);
    expect(flat.element.querySelector<HTMLElement>('.flat__centre')!.textContent).toBe(
      'Zum Techniker',
    );
    flat.dispose();
  });

  it('bietet am Netz keine neue Runde an, sondern nur den Rückweg', () => {
    const live = liveRound();
    live.haunt.phase = 'lost';
    // Der Snapshot wird einmal je Schritt gerechnet — ohne diesen Schritt
    // trüge er noch die laufende Runde.
    live.step(DT, { x: 0, z: 0, sprint: false });
    const flat = new FlatMode(
      11,
      { role: 'watch', mode: 'omniscient' },
      { exit: () => {}, watchSnapshot: () => live.snapshot() },
    );
    document.body.append(flat.element);
    flat.update(DT);
    const ending = flat.element.querySelector<HTMLElement>('.flat__ending')!;
    expect(ending.hidden).toBe(false);
    expect(ending.querySelector('[data-restart]')).toBeNull();
    expect(ending.querySelector('[data-leave]')).not.toBeNull();
    flat.dispose();
  });
});

/**
 * **Das Overlay „KI-Absichten" ist Zuschauerwissen** (Paket M4): Wer mitspielt,
 * darf das Glaubensbild des Monsters nie sehen — er wüsste sonst, welche Zimmer
 * gerade sicher sind.
 */
describe('Die Absichten des Monsters in der 2D-Welt', () => {
  const insight = {
    mode: 'hunt' as const,
    label: 'Jagd',
    goal: { x: 6, z: 6 },
    belief: [{ roomId: 'raum-0', p: 0.9 }],
    prediction: {
      path: [
        { x: 1, z: 1 },
        { x: 5, z: 4 },
      ],
      eta: [0, 2],
    },
    intercept: { door: 'd1', at: { x: 4, z: 4 }, etaMonster: 3.2, etaPlayer: 4 },
  };

  /** Der Kontext schreibt mit, statt zu malen — gezeichnet wird in jsdom nichts. */
  function watching(mode: 'omniscient' | 'realistic'): {
    flat: FlatMode;
    written: () => unknown[];
  } {
    const calls: Array<[string, unknown[]]> = [];
    HTMLCanvasElement.prototype.getContext = jest.fn(
      () =>
        new Proxy({} as Record<string, unknown>, {
          get: (target, key: string) =>
            key in target ? target[key] : (...args: unknown[]) => calls.push([key, args]),
          set: (target, key: string, value) => {
            target[key] = value;
            return true;
          },
        }),
    ) as never;
    const flat = new FlatMode(
      5,
      { role: 'watch', mode },
      { exit: () => {}, insight: () => insight },
    );
    document.body.append(flat.element);
    return {
      flat,
      written: () => calls.filter(([name]) => name === 'fillText').map(([, args]) => args[0]),
    };
  }

  it('schreibt die beiden Ankunftszeiten an die Abfangtür — im Modus „Alles sehen"', () => {
    const { flat, written } = watching('omniscient');
    flat.update(DT);
    expect(written()).toContain('M 3,2 s / T 4,0 s');
    expect(written()).toContain('Jagd');
    flat.dispose();
  });

  /**
   * Reicht niemand etwas herein, nimmt die 2D-Welt den letzten Beschluss ihrer
   * **eigenen** Runde — in der Vorführung rechnet sie das Monster ja selbst.
   */
  it('nimmt die Absichten aus der eigenen Bot-Runde', () => {
    const flat = new FlatMode(3, { role: 'watch', mode: 'omniscient' }, { exit: () => {} });
    document.body.append(flat.element);
    for (let i = 0; i < 120; i++) flat.update(DT);
    expect(flat.round.decided?.insight?.label).toBeTruthy();
    flat.dispose();
  });

  it('zeigt einem Spieler nichts davon', () => {
    const { flat, written } = watching('realistic');
    flat.update(DT);
    expect(written()).not.toContain('M 3,2 s / T 4,0 s');
    expect(written()).not.toContain('Jagd');
    flat.dispose();
  });
});

/**
 * **Der Eintrag „2D ↔ 3D"** (`FlatModeHost.switchView`) — der Weg zurück ins
 * Schiff, ohne die Runde zu beenden. Er steht im Optionsmenü und nicht bei
 * „Zurück zur Lobby": Dort endet alles, hier endet nichts.
 */
describe('Der Wechsel der Ansicht im Optionsmenü', () => {
  function openOptions(flat: FlatMode): HTMLElement {
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    // `.flat__panel` tragen zwei Kästen; gemeint ist das Optionsmenü.
    return flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
  }

  it('reicht den Wunsch an den Wirt weiter und klappt das Menü zu', () => {
    const switchView = jest.fn();
    const flat = new FlatMode(5, { test: true }, { exit: () => {}, switchView });
    const panel = openOptions(flat);
    const key = panel.querySelector<HTMLButtonElement>('[data-switch-view]')!;
    expect(key.textContent).toContain('2D ↔ 3D');
    key.click();
    expect(switchView).toHaveBeenCalledWith('3d');
    // Das Panel gehört zu einer Ansicht, die gleich verschwindet.
    expect(panel.hidden).toBe(true);
    flat.dispose();
  });

  it('fehlt, wenn der Wirt gar keinen Wechsel anbietet', () => {
    // Wer zusieht, sieht der Runde eines anderen zu — ein Knopf, der sie ins
    // Schiff holte, nähme sie ihm weg.
    const flat = new FlatMode(5, { test: true }, { exit: () => {} });
    const panel = openOptions(flat);
    expect(panel.querySelector('[data-switch-view]')).toBeNull();
    flat.dispose();
  });
});
