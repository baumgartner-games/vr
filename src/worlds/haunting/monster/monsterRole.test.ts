/** @jest-environment jsdom */
import { FlatRound, MONSTER_ID, PLAYER_ID } from '../map/flatRound';
import { roles } from '../registry/roles';
import { viewModesFor } from '../registry/viewModes';
import type { RoleHost, RoleView } from '../registry/roles';
import { SUIT_LIVES } from '../rules/roundRules';
import { VENT_ENTER_SECONDS } from '../vents/ventTravel';
import { FlatMonsterControl } from './flatMonsterControl';
import { monsterPortOf } from './monsterDriver';
import { mountMonsterView, type MonsterRoleView } from './monsterView';
import './monster.register';

jest.mock('./monster.css', () => ({}));

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

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

/** Eine Runde, ein Steuer, eine Ansicht — wie `MonsterSession`, nur ohne Techniker-Bot. */
function seat(seed = 2): {
  round: FlatRound;
  control: FlatMonsterControl;
  view: MonsterRoleView;
  notes: string[];
  step: (frames: number, input?: typeof IDLE) => void;
} {
  const round = new FlatRound(seed, { roll: 1 });
  const control = new FlatMonsterControl(round);
  const notes: string[] = [];
  const host: RoleHost = {
    snapshot: () => round.snapshot(),
    me: () => 'me',
    nameOf: () => '',
    flip: () => {},
    flyTo: () => {},
    notify: (text) => notes.push(text),
    extra: { monster: control },
  };
  const view = mountMonsterView(host);
  document.body.append(view.element);
  const stick = view.element.querySelector<HTMLElement>('.monster__stick')!;
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
  const step = (frames: number, input = IDLE): void => {
    for (let i = 0; i < frames; i++) {
      view.update(DT);
      round.step(DT, input);
    }
  };
  return { round, control, view, notes, step };
}

function key(view: RoleView, selector: string): HTMLButtonElement {
  return view.element.querySelector<HTMLButtonElement>(selector)!;
}

describe('Die Monster-Rolle in der Registry', () => {
  it('ist aus ihrer eigenen Datei angemeldet und braucht die Karte', () => {
    const role = roles.get('monster');
    expect(role?.surface).toBe('map');
    expect(role?.shared).toBeFalsy();
    expect(viewModesFor('monster').map((mode) => mode.id)).toContain('monster:senses');
  });

  it('findet ihren Port nur, wenn der Host einen mitbringt', () => {
    const bare: RoleHost = {
      snapshot: () => new FlatRound(1, { test: true }).snapshot(),
      me: () => '',
      nameOf: () => '',
      flip: () => {},
      flyTo: () => {},
      notify: () => {},
    };
    expect(monsterPortOf(bare)).toBeNull();
    expect(monsterPortOf({ ...bare, extra: { monster: { claim: 1 } } })).toBeNull();
    const view = mountMonsterView(bare);
    expect(view.element.dataset['control']).toBe('watch');
    view.update(DT);
    // Ohne Port gibt es nichts zu tun — und zuschlagen ist ohnehin kein Knopf.
    expect(view.element.querySelector('.monster__key--attack')).toBeNull();
    expect(key(view, '.monster__key--act').disabled).toBe(true);
    view.dispose();
  });
});

describe('Das Steuer des Monsters', () => {
  it('ersetzt die KI, solange jemand sitzt, und gibt sie beim Verlassen zurück', () => {
    const { round, control, view, step } = seat();
    expect(round.driver).toBe(control);
    expect(control.claimed()).toBe(true);
    expect(view.element.dataset['control']).toBe('player');
    // Ohne Stock steht das Monster — die Routine liefe längst los.
    const start = { x: round.monster.x, z: round.monster.z };
    step(90);
    expect(round.monster.x).toBe(start.x);
    expect(round.monster.z).toBe(start.z);
    // Mit Stock nach Osten geht es nach Osten.
    const stick = view.element.querySelector<HTMLElement>('.monster__stick')!;
    pointer(stick, 'pointerdown', 3, 80, 500);
    pointer(stick, 'pointermove', 3, 130, 500);
    step(30);
    expect(round.monster.x).toBeGreaterThan(start.x + 0.5);
    expect(round.snapshot().entities.find((e) => e.id === MONSTER_ID)?.moving).toBe(true);
    pointer(stick, 'pointerup', 3, 130, 500);
    const held = { x: round.monster.x, z: round.monster.z };
    step(10);
    expect(round.monster.x).toBe(held.x);
    // Verlassen: Die Routine übernimmt und läuft wieder von selbst.
    view.dispose();
    expect(control.claimed()).toBe(false);
    expect(round.driver?.active()).toBe(false);
    for (let t = 0; t < 40; t += DT) round.step(DT, IDLE);
    expect(Math.hypot(round.monster.x - held.x, round.monster.z - held.z)).toBeGreaterThan(3);
  });

  it('schlägt um sich, ohne Knopf — und reißt Kabinen mit „Interagieren" auf', () => {
    const { round, view, step } = seat(3);
    round.mode = 'omniscient';
    // Der Techniker steht neben dem Monster: getroffen, ohne dass jemand tippt.
    round.place({ x: round.monster.x + 1, z: round.monster.z });
    step(4);
    expect(round.state().crew.hp).toBe(SUIT_LIVES - 1);
    // In die Kabine des Raums; das Monster davor; „Interagieren" reißt sie auf.
    const locker = round
      .items()
      .find((i) => i.kind === 'locker' && i.roomId === round.monster.space);
    const cabin = locker ?? round.items().find((i) => i.kind === 'locker')!;
    expect(round.place(cabin.at)).toBe(true);
    step(1);
    round.act('interact');
    expect(round.state().crew.hidden).toBe(cabin.roomId);
    Object.assign(round.monster, { x: cabin.at.x + 0.6, z: cabin.at.z, space: cabin.roomId });
    round.state().crew.invulnerable = 0;
    step(1);
    // Der Knopf sagt, was er tut, und die Karte hebt genau das hervor.
    expect(key(view, '.monster__key--act').textContent).toContain('Kabine aufreißen');
    key(view, '.monster__key--act').click();
    step(2);
    expect(round.state().crew.hidden).toBe('');
    expect(round.state().crew.hp).toBe(SUIT_LIVES - 2);
    expect(round.rules.cabinUsable(cabin.roomId)).toBe(false);
    view.dispose();
  });

  it('fährt auf Knopfdruck durch den Schacht, wählt das Ziel und wartet drüben auf den Knopf', () => {
    const { round, control, view, step } = seat();
    const reactor = round.vents.flap('vent-reactor')!;
    Object.assign(round.monster, { x: reactor.approach.x, z: reactor.approach.z, space: 'r2' });
    step(1);
    expect(control.ventTargets().map((t) => t.label)).toEqual(['Upper Engine', 'Lower Engine']);
    const chooser = view.element.querySelector<HTMLElement>('.monster__vents')!;
    expect(chooser.hidden).toBe(false);
    chooser.querySelectorAll<HTMLButtonElement>('[data-vent]')[1]!.click();
    expect(key(view, '.monster__key--act').textContent).toContain('Einsteigen');
    key(view, '.monster__key--act').click();
    expect(round.ventRide.phase).toBe('entering');
    expect(round.ventRide.to?.id).toBe('vent-lower-engine');
    step(Math.ceil((VENT_ENTER_SECONDS + 0.2) / DT));
    expect(round.ventRide.phase).toBe('riding');
    expect(key(view, '.monster__key--act').disabled).toBe(true);
    expect(view.element.querySelector('.monster__hud')?.textContent).toContain('Im Schacht');
    step(Math.ceil(20 / DT));
    // Ein Spieler bleibt sitzen, bis er aussteigt.
    expect(round.ventRide.phase).toBe('arrived');
    expect(round.snapshot().entities.find((e) => e.id === MONSTER_ID)?.concealed).toBe(true);
    expect(key(view, '.monster__key--act').textContent).toContain('Aussteigen');
    key(view, '.monster__key--act').click();
    step(Math.ceil(2 / DT));
    expect(round.ventRide.busy).toBe(false);
    expect(round.monster.space).toBe('r5');
    view.dispose();
  });

  it('übersteht den Wechsel mitten in der Fahrt — in beide Richtungen', () => {
    // Spieler fährt los, verlässt die Rolle: Die KI steigt drüben aus.
    const first = seat();
    const cafeteria = first.round.vents.flap('vent-cafeteria')!;
    Object.assign(first.round.monster, {
      x: cafeteria.approach.x,
      z: cafeteria.approach.z,
      space: 'r0',
    });
    first.step(1);
    key(first.view, '.monster__key--act').click();
    first.step(Math.ceil(2 / DT));
    expect(first.round.ventRide.phase).toBe('riding');
    first.view.dispose();
    for (let t = 0; t < 25 && first.round.ventRide.busy; t += DT) first.round.step(DT, IDLE);
    expect(first.round.ventRide.busy).toBe(false);
    expect(first.round.monster.space).toBe('r11');

    // Die KI fährt, ein Spieler setzt sich: Drüben wartet die Fahrt auf ihn.
    const round = new FlatRound(2, { roll: 1 });
    Object.assign(round.monster, { x: cafeteria.approach.x, z: cafeteria.approach.z, space: 'r0' });
    expect(round.ventRide.enter(round.monster)).toBe(true);
    for (let t = 0; t < 2; t += DT) round.step(DT, IDLE);
    expect(round.ventRide.phase).toBe('riding');
    const control = new FlatMonsterControl(round);
    const host: RoleHost = {
      snapshot: () => round.snapshot(),
      me: () => 'me',
      nameOf: () => '',
      flip: () => {},
      flyTo: () => {},
      notify: () => {},
      extra: { monster: control },
    };
    const view = mountMonsterView(host);
    for (let t = 0; t < 20; t += DT) {
      view.update(DT);
      round.step(DT, IDLE);
    }
    expect(round.ventRide.phase).toBe('arrived');
    view.dispose();
    for (let t = 0; t < 5 && round.ventRide.busy; t += DT) round.step(DT, IDLE);
    expect(round.ventRide.busy).toBe(false);
    expect(round.monster.space).toBe('r11');
  });

  it('bricht Holztüren auf und lässt Stahl stehen', () => {
    const { round, control, step } = seat();
    const door = round.house.doors.find(
      (d) => d.material === 'wood' && (d.a === round.monster.space || d.b === round.monster.space),
    );
    if (!door) return;
    const { doorCentre } = jest.requireActual<typeof import('../map/geometry')>('../map/geometry');
    const at = doorCentre(door);
    round.haunt.shut.push(door.id);
    Object.assign(round.monster, { x: at.x, z: at.z });
    step(1);
    expect(control.status().prompt).toBe('Tür aufbrechen');
    expect(control.act('interact')).toMatch(/splittert/);
    expect(round.haunt.shut).not.toContain(door.id);
  });
});

describe('Die Karte aus Monstersicht', () => {
  it('zeigt nur, was das Monster sieht — und hört Schritte als Ring', () => {
    const { round, view, step } = seat(4);
    round.torch = false;
    round.haunt.lit.length = 0;
    // Das Monster steht in der Raummitte und schaut nach Norden; der
    // Techniker steht im Dunkeln drei Meter vor ihm.
    const centre = round.graph.centre(round.monster.space);
    Object.assign(round.monster, { x: centre.x, z: centre.z, yaw: 0 });
    expect(round.place({ x: centre.x, z: centre.z - 3 })).toBe(true);
    step(1);
    const dark = view.current.field;
    expect(dark.mode).toBe('realistic');
    expect(dark.visibleEntities).toEqual([MONSTER_ID]);
    expect(dark.cones.map((cone) => cone.entityId)).toEqual([MONSTER_ID]);
    expect(dark.noise).toEqual([]);
    // Er rennt: nicht zu sehen, aber zu hören.
    step(3, { x: 0.3, z: 0, sprint: true });
    const heard = view.current.field;
    expect(heard.visibleEntities).toEqual([MONSTER_ID]);
    expect(heard.noise.map((n) => n.entityId)).toEqual([PLAYER_ID]);
    expect(view.element.querySelector('.monster__hud')?.textContent).toContain('Hörweite');
    // Licht an: jetzt steht er im Kegel.
    round.haunt.lit.push(round.player.space, round.monster.space);
    // Die Ansicht liest den Snapshot des letzten Schritts — also zwei Bilder.
    step(2);
    expect(view.current.field.visibleEntities).toContain(PLAYER_ID);
    expect(view.current.following).toBe(MONSTER_ID);
    view.dispose();
  });
});
