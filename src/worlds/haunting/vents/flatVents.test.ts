import { FlatRound, MONSTER_ID, PLAYER_ID } from '../map/flatRound';
import { computeVisibility } from '../map/visibility';
import { STATION_VENTS } from './ventNet.data';
import { VENT_ENTER_SECONDS } from './ventTravel';

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

describe('Die Schächte in der 2D-Runde', () => {
  it('stehen im Snapshot: Klappen als Items, der Graph als Verbindungen', () => {
    const round = new FlatRound(1, { test: true });
    const snapshot = round.snapshot();
    const vents = snapshot.items.filter((item) => item.kind === 'vent');
    expect(vents).toHaveLength(STATION_VENTS.flaps.length);
    expect(vents.every((item) => item.state === 'closed' && !item.interactive)).toBe(true);
    expect(snapshot.ventLinks).toHaveLength(STATION_VENTS.links.length);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('lässt den Techniker keine Klappe benutzen', () => {
    const round = new FlatRound(1, { test: true });
    const flap = round.vents.flap('vent-storage')!;
    expect(round.place(flap.approach)).toBe(true);
    round.step(DT, IDLE);
    expect(round.target?.kind).not.toBe('vent');
    round.act('interact');
    expect(round.ventRide.busy).toBe(false);
  });

  it('nimmt das Monster während der Fahrt von der Karte und setzt es drüben wieder ab', () => {
    const round = new FlatRound(2, { roll: 1 });
    // Der Techniker steht mit Licht neben der Cafeteria-Klappe; das Monster davor.
    const flap = round.vents.flap('vent-cafeteria')!;
    const target = round.vents.flap('vent-admin')!;
    expect(round.place({ x: flap.approach.x + 1.2, z: flap.approach.z - 0.8 })).toBe(true);
    Object.assign(round.monster, { x: flap.approach.x, z: flap.approach.z, space: 'r0' });
    round.step(DT, IDLE);
    expect(round.ventRide.enter(round.monster)).toBe(true);
    round.step(DT, IDLE);
    // Einsteigen: sichtbar, Klappe offen.
    expect(round.snapshot().items.find((i) => i.id === flap.id)?.state).toBe('open');
    expect(round.field.visibleEntities).toContain(MONSTER_ID);
    for (let t = 0; t < VENT_ENTER_SECONDS + 0.2; t += DT) round.step(DT, IDLE);
    expect(round.ventRide.phase).toBe('riding');
    const monster = round.snapshot().entities.find((e) => e.id === MONSTER_ID)!;
    expect(monster.concealed).toBe(true);
    expect(monster.moving).toBe(false);
    // Weder der Techniker daneben noch eine Ansicht ohne Person sieht es.
    expect(round.field.visibleEntities).toEqual([PLAYER_ID]);
    const panel = computeVisibility({
      snapshot: round.snapshot(),
      mode: 'realistic',
      viewerId: null,
    });
    expect(panel.visibleEntities).not.toContain(MONSTER_ID);
    expect(round.snapshot().items.find((i) => i.id === flap.id)?.state).toBe('closed');
    // Die Türen gehen für ein Monster im Schacht nicht auf.
    expect(round.snapshot().doors.filter((d) => d.open).length).toBeLessThanOrEqual(1);
    // Kein Treffer aus dem Schacht heraus, obwohl der Techniker daneben steht.
    const hp = round.state().crew.hp;
    let t = 0;
    while (round.ventRide.busy && t < 30) {
      round.step(DT, IDLE);
      t += DT;
    }
    expect(round.state().crew.hp).toBe(hp);
    expect(round.ventRide.busy).toBe(false);
    expect(round.monster.space).toBe(target.roomId);
    expect(
      Math.hypot(round.monster.x - target.approach.x, round.monster.z - target.approach.z),
    ).toBeLessThan(0.01);
    expect(round.state().monster).toEqual({ x: round.monster.x, z: round.monster.z });
    round.step(DT, IDLE);
    expect(round.snapshot().entities.find((e) => e.id === MONSTER_ID)!.concealed).toBe(false);
    expect(t).toBeGreaterThan(3);
  });

  it('lässt die KI den Schacht als Abkürzung nehmen — sichtbar ein- und aussteigend', () => {
    let rides = 0;
    let entered = 0;
    for (const seed of [1, 2, 3, 4]) {
      const round = new FlatRound(seed, { roll: seed });
      let wasBusy = false;
      for (let t = 0; t < 240 && round.phase === 'running'; t += 0.25) {
        round.step(0.25, IDLE);
        const busy = round.ventRide.busy;
        if (busy && !wasBusy) rides++;
        if (round.ventRide.phase === 'entering') entered++;
        wasBusy = busy;
      }
    }
    expect(rides).toBeGreaterThan(0);
    expect(entered).toBeGreaterThan(0);
  }, 60_000);
});
