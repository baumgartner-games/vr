/** @jest-environment jsdom */
import { FlatMode, SCOUT_PERIOD } from './flatMode';
import { FlatRound, PLAYER_ID } from './flatRound';
import { MapView } from './mapView';
import { doorCentre } from './geometry';
import { lockerCode } from '../mission';
import { HOLD_RANGE, SLAM_HOLD, slamDoor } from '../rules/doorLocks';
import { defaultSetup } from '../rules/roundSetup';

jest.mock('./flat.css', () => ({}));

const DT = 1 / 30;

function fakeContext(): CanvasRenderingContext2D & { calls: string[] } {
  const calls: string[] = [];
  return new Proxy({ calls } as Record<string, unknown>, {
    get: (target, key: string) => {
      if (key in target) return target[key];
      if (key === 'measureText') return () => ({ width: 10 });
      return (..._args: unknown[]) => {
        calls.push(key);
      };
    },
    set: (target, key: string, value) => {
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { calls: string[] };
}

beforeEach(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => fakeContext()) as never;
  HTMLCanvasElement.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300, right: 400, bottom: 300, x: 0, y: 0 }) as DOMRect;
});

describe('Türen in der 2D-Runde', () => {
  it('sperrt gewollt immer nur eine Tür — die zweite gibt die erste frei', () => {
    const round = new FlatRound(7, { test: true });
    const [a, b] = round.house.doors.filter((d) => d.b !== null);
    expect(round.lockDoor(a!.id)).toMatch(/verriegelt/);
    expect(round.haunt.shut).toEqual([a!.id]);
    expect(round.lockDoor(b!.id)).toMatch(/vorherige ist wieder offen/);
    expect(round.haunt.shut).toEqual([b!.id]);
    expect(round.lockDoor(b!.id)).toBe('Tür entriegelt.');
    expect(round.haunt.shut).toEqual([]);
  });

  it('lässt zugefallene Türen nach SLAM_HOLD Sekunden von selbst aufgehen', () => {
    const round = new FlatRound(7, { test: true });
    const door = round.house.doors.find((d) => d.b !== null)!;
    round.haunt.shut = slamDoor(round.locks, round.haunt.shut, door.id, round.haunt.time);
    round.step(DT, { x: 0, z: 0, sprint: false });
    expect(round.snapshot().doors.find((d) => d.id === door.id)?.locked).toBe(true);
    for (let t = 0; t < SLAM_HOLD - 1; t += 0.5) round.step(0.5, { x: 0, z: 0, sprint: false });
    expect(round.haunt.shut).toEqual([door.id]);
    round.drain();
    for (let t = 0; t < 2; t += 0.5) round.step(0.5, { x: 0, z: 0, sprint: false });
    expect(round.haunt.shut).toEqual([]);
    expect(round.drain().some((e) => /wieder auf/.test(e.text))).toBe(true);
  });

  it('lässt auch die von Hand gesperrte Tür ablaufen — mit Balken über der Tür', () => {
    const round = new FlatRound(7, { test: true });
    const door = round.house.doors.find((d) => d.b !== null)!;
    round.lockDoor(door.id);
    round.step(DT, { x: 0, z: 0, sprint: false });
    const shown = () => round.snapshot().doors.find((d) => d.id === door.id)!;
    expect(shown().locked).toBe(true);
    // Der Balken: wie lange noch, und wie lange sie insgesamt hielt.
    const hold = shown().hold!;
    expect(hold.total).toBe(HOLD_RANGE[1]);
    expect(hold.left).toBeGreaterThan(0);
    expect(hold.left).toBeLessThanOrEqual(HOLD_RANGE[1]);
    // Nach spätestens zehn Sekunden ist sie von selbst wieder offen: Eine
    // Sperre, die ewig hält, ist keine Entscheidung, sondern eine Wand.
    for (let t = 0; t < HOLD_RANGE[1] + 1; t += 0.5) round.step(0.5, { x: 0, z: 0, sprint: false });
    expect(round.haunt.shut).toEqual([]);
    expect(shown().hold).toBeUndefined();
  });

  it('gibt eine zugefallene Tür frei, wenn die Tafel sie antippt', () => {
    const round = new FlatRound(7, { test: true });
    const door = round.house.doors.find((d) => d.b !== null)!;
    round.haunt.shut = slamDoor(round.locks, round.haunt.shut, door.id, 0);
    expect(round.lockDoor(door.id)).toBe('Tür entriegelt.');
    expect(round.haunt.shut).toEqual([]);
  });
});

describe('Geräusche als Wellen', () => {
  it('macht aus Schritten und Türen Wellen mit Urheber, Reichweite und Zeit', () => {
    const round = new FlatRound(7, { test: true });
    for (let i = 0; i < 20; i++) round.step(DT, { x: 0, z: 1, sprint: false });
    const steps = round.noises().filter((n) => n.cause === 'walk');
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0]).toMatchObject({ by: PLAYER_ID });
    expect(steps[0]!.radius).toBeGreaterThan(0);
    expect(steps[0]!.since).toBeLessThanOrEqual(round.haunt.time);
    for (let i = 0; i < 30; i++) round.step(DT, { x: 0, z: 1, sprint: true });
    const sprint = round.noises().filter((n) => n.cause === 'sprint');
    expect(sprint.length).toBeGreaterThan(0);
    expect(sprint[0]!.radius).toBeGreaterThan(steps[0]!.radius);
    const door = round.house.doors.find((d) => d.b !== null)!;
    round.lockDoor(door.id);
    // Vor Ort sperren macht ein Türgeräusch; die Tafel aus der Ferne keines.
    const at = doorCentre(door);
    round.place({ x: at.x, z: at.z });
    round.step(DT, { x: 0, z: 0, sprint: false });
    // Der Snapshot trägt die Wellen mit.
    expect(round.snapshot().noises?.length).toBeGreaterThan(0);
  });

  it('vergisst Wellen nach ein paar Sekunden', () => {
    const round = new FlatRound(7, { test: true });
    for (let i = 0; i < 10; i++) round.step(DT, { x: 1, z: 0, sprint: false });
    expect(round.noises().length).toBeGreaterThan(0);
    for (let i = 0; i < 12; i++) round.step(0.5, { x: 0, z: 0, sprint: false });
    expect(round.noises()).toHaveLength(0);
  });
});

describe('Ziele und Wege', () => {
  it('nennt erst das Ersatzteil, dann die Konsole, zuletzt die Zentrale', () => {
    const round = new FlatRound(7, { test: true });
    const goals = round.objectives();
    expect(goals.length).toBe(3);
    expect(goals[0]!.next).toBe(true);
    expect(goals[0]!.id).toMatch(/^cargo-/);
    const jobs = round.jobs();
    expect(goals[0]!.id).toBe(jobs[0]!.id);
    round.haunt.crew.inventory.push(round.house.tasks[0]!.id);
    expect(round.objectives()[0]!.id).toMatch(/^console-/);
    round.haunt.done.push(...round.house.tasks.map((t) => t.id));
    expect(round.objectives()).toEqual([expect.objectContaining({ id: 'van', next: true })]);
  });

  it('rechnet den Weg des Spielers zum nächsten Ziel und den des Monsters', () => {
    const round = new FlatRound(7, {});
    const path = round.playerRoute();
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ x: round.player.x, z: round.player.z });
    // Innerhalb der Frist kommt derselbe Weg zurück, ohne neu zu rechnen.
    expect(round.playerRoute()).toEqual(path);
    round.setMode('omniscient');
    for (let i = 0; i < 90; i++) round.step(DT, { x: 0, z: 0, sprint: false });
    const monster = round.monsterRoute();
    if (monster.length) expect(monster[0]).toEqual({ x: round.monster.x, z: round.monster.z });
  });
});

describe('Die Karte im Brettspielstil', () => {
  it('zeichnet Möbel, Ziele, Wellen und Schächte', () => {
    const round = new FlatRound(7, { test: true });
    round.setMode('omniscient');
    for (let i = 0; i < 10; i++) round.step(DT, { x: 1, z: 0, sprint: false });
    const view = new MapView({
      layers: { vents: true },
      objectives: () => round.objectives(),
      viewerId: PLAYER_ID,
    });
    view.setSnapshot(round.snapshot());
    view.setVisibility(round.field);
    view.draw();
    expect(view.stats.fixtures).toBeGreaterThan(10);
    expect(view.stats.goals).toBe(3);
    expect(view.stats.noises).toBeGreaterThan(0);
    expect(round.snapshot().fixtures!.some((f) => f.kind === 'fixture' && f.mark)).toBe(true);
    expect(round.snapshot().ventLinks!.length).toBeGreaterThan(0);
  });

  it('lässt Möbel und Items im Dunkeln weg, wenn man nur sieht, was im Licht ist', () => {
    const round = new FlatRound(7, {});
    round.haunt.lit = [];
    round.torch = false;
    round.step(DT, { x: 0, z: 0, sprint: false });
    const view = new MapView();
    view.setSnapshot(round.snapshot());
    view.setVisibility(round.field);
    view.draw();
    const all = round.snapshot().fixtures!.length;
    expect(view.stats.fixtures).toBeLessThan(all);
  });
});

describe('Die Zentrale auf der eigenen Karte', () => {
  it('gibt dem Techniker mit Bot-Plätzen Tafel, Akte und Peilung', () => {
    const setup = defaultSetup();
    const flat = new FlatMode(7, { setup, role: 'technician' }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.soloPowers).toEqual({ scout: true, panel: true, archive: true });
    // Die Tafel: ein Tipp auf eine Tür in der Kartenübersicht sperrt sie.
    flat.showMap(true);
    flat.update(DT);
    // Geöffnet steht das ganze Haus im Bild, auch auf 400 mal 300 Punkten —
    // und da liegt neben jeder Tür ein Item im Tippradius. Wer eine Tür
    // sperren will, zoomt vorher heran; genau das tut auch dieser Test.
    const b = flat.round.snapshot().bounds;
    expect(flat.map.toScreen(b.minX, b.minZ).x).toBeGreaterThanOrEqual(0);
    expect(flat.map.toScreen(b.maxX, b.maxZ).x).toBeLessThanOrEqual(400);
    const door = flat.round.house.doors.find((d) => d.b !== null)!;
    const at = doorCentre(door);
    flat.map.setView({ centreX: at.x, centreZ: at.z, scale: 22 });
    const p = flat.map.toScreen(at.x, at.z);
    flat.map.tap(p.x, p.y);
    expect(flat.round.haunt.shut).toEqual([door.id]);
    expect(flat.element.querySelector('.flat__toast')?.textContent).toMatch(/Schalttafel/);
    // Die Akte: ein Tipp auf ein Zimmer zeigt den Schrankcode.
    const room = flat.round.house.rooms[0]!;
    flat.openSheet(room.id);
    const sheet = flat.element.querySelector<HTMLElement>('.flat__sheet')!;
    expect(sheet.hidden).toBe(false);
    expect(sheet.textContent).toContain(lockerCode(flat.round.house.seed, room.id));
    sheet.querySelector<HTMLButtonElement>('[data-close-sheet]')!.click();
    expect(sheet.hidden).toBe(true);
    // Das Horchbild: eine Probe der Geräusche, und **nicht** die Stelle des
    // Monsters — wer die kennt, dem lauert niemand mehr auf.
    for (let i = 0; i < 40; i++) flat.update(DT);
    expect(flat.round.noises().length).toBeGreaterThan(0);
    expect(flat.scoutNoises.every((noise) => noise.by === '')).toBe(true);
    flat.dispose();
  });

  it('nimmt dem Techniker die Fähigkeiten, wenn Menschen auf den Plätzen sitzen', () => {
    const setup = defaultSetup();
    setup.seats = setup.seats.map((seat) => ({ ...seat, who: 'human' }));
    const flat = new FlatMode(7, { setup, role: 'technician' }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.soloPowers).toEqual({ scout: false, panel: false, archive: false });
    flat.showMap(true);
    flat.update(DT);
    const door = flat.round.house.doors.find((d) => d.b !== null)!;
    const at = doorCentre(door);
    flat.map.setView({ centreX: at.x, centreZ: at.z, scale: 22 });
    const p = flat.map.toScreen(at.x, at.z);
    flat.map.tap(p.x, p.y);
    expect(flat.round.haunt.shut).toEqual([]);
    for (let i = 0; i < 40; i++) flat.update(DT);
    expect(flat.scoutNoises).toEqual([]);
    // Die Tafel im Optionsmenü verteilt die nächste Runde neu.
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    flat.element.querySelector<HTMLButtonElement>('[data-setup-seat-who="0"]')!.click();
    flat.element.querySelector<HTMLButtonElement>('[data-restart]')!.click();
    expect(flat.soloPowers.archive).toBe(true);
    flat.dispose();
  });

  it('legt die Zielpfade über die Karte, wenn die Option steht', () => {
    const flat = new FlatMode(7, { role: 'technician' }, { exit: () => {} });
    document.body.append(flat.element);
    expect(flat.routesShown).toBe(false);
    flat.element.querySelector<HTMLButtonElement>('.flat__options')!.click();
    flat.element.querySelector<HTMLButtonElement>('[data-routes]')!.click();
    expect(flat.routesShown).toBe(true);
    flat.update(DT);
    expect(flat.round.playerRoute().length).toBeGreaterThan(1);
    flat.dispose();
  });
});

describe('Das Horchbild auf der Kartenübersicht', () => {
  /**
   * **Der Späher sieht keine Position mehr.** Eine Peilung alle drei Sekunden
   * nahm dem Monster jede Möglichkeit, sich zu verstecken oder aufzulauern,
   * und ein Schacht war damit nur noch ein schnellerer Weg. Was er bekommt,
   * ist eine **Probe der Geräusche** — und wer still steht, kommt darin nicht
   * vor. Ohne Späher steht auf der Karte gar nichts: Sie ist das Bild der
   * Zentrale, nicht das eigene Ohr.
   */
  function noisesOnMap(seats: 'bot' | 'human'): { sampled: number; drawn: number } {
    const setup = defaultSetup();
    setup.seats = setup.seats.map((seat) => ({ ...seat, who: seats }));
    const flat = new FlatMode(9, { setup, role: 'technician' }, { exit: () => {} });
    document.body.append(flat.element);
    flat.showMap(true);
    for (let i = 0; i < 60; i++) flat.update(DT);
    const out = { sampled: flat.scoutNoises.length, drawn: flat.map.stats.noises };
    flat.dispose();
    return out;
  }

  it('zeigt die Geräusche nur mit Späher — und dann als Probe', () => {
    expect(noisesOnMap('human')).toEqual({ sampled: 0, drawn: 0 });
    const scout = noisesOnMap('bot');
    expect(scout.sampled).toBeGreaterThan(0);
  });

  it('stempelt die Probe neu, damit die Wellen von der Probe an laufen', () => {
    const flat = new FlatMode(9, { setup: defaultSetup(), role: 'technician' }, { exit: () => {} });
    document.body.append(flat.element);
    for (let i = 0; i < 60; i++) flat.update(DT);
    const now = flat.round.state().time;
    for (const noise of flat.scoutNoises) {
      expect(noise.by).toBe('');
      expect(noise.since).toBeLessThanOrEqual(now);
      expect(now - noise.since).toBeLessThanOrEqual(SCOUT_PERIOD + 1e-6);
    }
    flat.dispose();
  });
});
