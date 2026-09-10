import { FlatRound } from '../map/flatRound';
import { MONSTERS } from '../mission';
import { readMonsterInput } from '../net';
import { NetMonsterPort } from './netMonsterPort';
import { STILL } from './monsterHelm';

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

/**
 * Eine Runde, in der das Monster steht: Ein Steuer, das nichts tut, hält die
 * Routine fern, damit der Snapshot das Monster dort zeigt, wo der Test es
 * hingestellt hat.
 */
function stage(seed = 2): { round: FlatRound; port: NetMonsterPort; owned: { value: boolean } } {
  const round = new FlatRound(seed, { roll: 1 });
  round.driver = { active: () => true, decide: () => STILL };
  const owned = { value: true };
  const port = new NetMonsterPort({
    snapshot: () => round.snapshot(),
    state: () => round.haunt,
    owned: () => owned.value,
  });
  return { round, port, owned };
}

describe('Das Steuer auf dem Telefon', () => {
  it('besitzt die Station nur, wenn der Platz meiner ist', () => {
    const { port, owned } = stage();
    owned.value = false;
    expect(port.claim()).toBe(false);
    expect(port.claimed()).toBe(false);
    expect(port.message()).toBeNull();
    owned.value = true;
    expect(port.claim()).toBe(true);
    expect(port.claimed()).toBe(true);
    // Weggeschubst: Der Port schweigt, obwohl die Ansicht ihn noch hält.
    owned.value = false;
    expect(port.claimed()).toBe(false);
    expect(port.message()).toBeNull();
  });

  it('zählt jeden Druck hoch und trägt Stock und Zähler in die Nachricht', () => {
    const { port } = stage();
    port.claim();
    port.input({ x: 0.5, z: -2, sprint: true });
    port.act('interact');
    port.act('interact');
    expect(port.counters).toEqual({ attack: 0, interact: 2 });
    const read = readMonsterInput(JSON.parse(JSON.stringify(port.message())))!;
    // Der Zähler `attack` steht noch im Protokoll, wird aber nicht mehr gedrückt:
    // Zuschlagen ist Reichweite, kein Knopf (`monster/monsterHelm.ts`).
    expect(read).toEqual({ x: 0.5, z: -1, sprint: true, attack: 0, interact: 2, vent: 0 });
    // Die Nachricht trägt den Stand, nicht die Flanke: dreimal dieselbe ist dieselbe.
    expect(readMonsterInput(port.message())).toEqual(read);
    port.act('interact');
    expect(readMonsterInput(port.message())!.interact).toBe(3);
  });

  it('zählt nicht, wenn niemand sitzt oder die Runde vorbei ist', () => {
    const { round, port } = stage();
    expect(port.act('interact')).toBe('');
    expect(port.counters.interact).toBe(0);
    port.claim();
    round.haunt.phase = 'lost';
    expect(port.act('interact')).toBe('');
    expect(port.counters.interact).toBe(0);
  });

  it('liest die Klappenziele aus dem Snapshot — in der Reihenfolge des Gastgebers', () => {
    const { round, port } = stage();
    port.claim();
    round.step(DT, IDLE);
    expect(port.ventTargets()).toEqual([]);
    expect(port.status().prompt).toBe('');
    const reactor = round.vents.flap('vent-reactor')!;
    Object.assign(round.monster, { x: reactor.approach.x, z: reactor.approach.z, space: 'r2' });
    round.step(DT, IDLE);
    // Dieselben Ziele in derselben Reihenfolge wie `VentTravel.targetsFrom`.
    const expected = round.ventRide.targetsFrom(round.monster)!.targets.map((flap) => flap.roomId);
    const names = expected.map(
      (id) => round.snapshot().rooms.find((room) => room.id === id)?.name ?? id,
    );
    expect(port.ventTargets().map((target) => target.label)).toEqual(names);
    expect(names).toEqual(['Upper Engine', 'Lower Engine']);
    expect(port.status().prompt).toBe('Einsteigen');
    port.chooseVent(1);
    expect(readMonsterInput(port.message())!.vent).toBe(1);
    expect(port.act('interact')).toBe('Einsteigen · nach Lower Engine.');
    // Die Wahl gilt für eine Fahrt.
    expect(readMonsterInput(port.message())!.vent).toBe(0);
    expect(readMonsterInput(port.message())!.interact).toBe(1);
    // Während der Fahrt gibt es keine Ziele, und der Knopf heißt, was die Phase sagt.
    round.haunt.ride = 'arrived';
    expect(port.ventTargets()).toEqual([]);
    expect(port.status().prompt).toBe('Aussteigen');
    expect(port.status().ride).toBe('arrived');
    expect(port.act('interact')).toBe('Aussteigen …');
  });

  it('beschriftet die Tür vor dem Monster aus dem Snapshot', () => {
    const { round, port } = stage();
    port.claim();
    const door = round.house.doors.find((d) => d.material === 'metal')!;
    const { doorCentre } = jest.requireActual<typeof import('../map/geometry')>('../map/geometry');
    const at = doorCentre(door);
    round.haunt.shut.push(door.id);
    Object.assign(round.monster, { x: at.x, z: at.z });
    round.step(DT, IDLE);
    // Stahl hält nicht mehr für immer: Am Riegel wird gezogen (`rules/doorLocks.ts`).
    expect(port.status().prompt).toBe('Tür aufziehen');
    expect(port.act('interact')).toBe('Am Riegel ziehen …');
    expect(port.status().label).toBe(MONSTERS.find((m) => m.id === 'stalker')!.name);
  });
});
