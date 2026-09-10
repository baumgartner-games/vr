/** @jest-environment jsdom */
import { FlatMode } from './flatMode';
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

  it('öffnet die Kartenübersicht als Overlay und schließt sie wieder', () => {
    const flat = new FlatMode(3, { test: true }, { exit: () => {} });
    document.body.append(flat.element);
    const overlay = flat.element.querySelector<HTMLElement>('.flat__map')!;
    expect(overlay.hidden).toBe(true);
    expect(flat.mapOpen).toBe(false);
    flat.element.querySelector<HTMLButtonElement>('.flat__mapkey')!.click();
    expect(overlay.hidden).toBe(false);
    expect(flat.mapOpen).toBe(true);
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
   * was die *nächste* Runde betrifft — neue Runde, mit oder ohne Monster, wer
   * welche Rolle spielt, die ganze Verteilung —, steht in der Lobby.
   */
  it('lässt aus dem Optionsmenü Rolle, Monster und Verteilung weg', () => {
    const flat = new FlatMode(3, { role: 'watch' }, { exit: () => {} });
    document.body.append(flat.element);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.querySelector('[data-role]')).toBeNull();
    expect(panel.querySelector('[data-monster]')).toBeNull();
    expect(panel.querySelector('[data-restart]')).toBeNull();
    expect(panel.querySelector('.setup')).toBeNull();
    // Was bleibt: Ansicht, Zielpfade, Ton — und der Weg zurück in die Lobby.
    expect(panel.querySelector('[data-routes]')).not.toBeNull();
    expect(panel.querySelector('[data-audio="effects"]')).not.toBeNull();
    expect(panel.querySelector('[data-leave]')?.textContent).toContain('Zurück zur Lobby');
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
    expect(flat.element.querySelector<HTMLElement>('.flat__mapkey')!.hidden).toBe(false);
    const start = { ...flat.round.player };
    for (let i = 0; i < 90; i++) flat.update(DT);
    const moved = Math.hypot(flat.round.player.x - start.x, flat.round.player.z - start.z);
    expect(moved).toBeGreaterThan(1);
    // Wer spielt, steht im Optionsmenü und nicht mehr am oberen Bildschirmrand.
    expect(flat.element.querySelector('.flat__hud')?.textContent).not.toContain('Bot-Runde');
    // Die Kamera hängt am Techniker.
    expect(flat.scene.getView().centreX).toBeCloseTo(flat.round.player.x);
    // Das Optionsmenü sagt, wessen Sicht sich wie wechseln lässt — gewechselt
    // wird mit den Sprungknöpfen und in der Lobby, nicht mit einem Zykler.
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    const panel = flat.element.querySelector<HTMLElement>('.flat__panel:not(.flat__sheet)')!;
    expect(panel.textContent).toContain('Du siehst zu');
    expect(panel.textContent).toContain('Wessen Sicht?');
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
});
