import { FlatRound } from '../map/flatRound';
import { doorCentre } from '../map/geometry';
import { PRY_COOLDOWN, chooseLock, pryTries } from '../rules/doorLocks';
import { FlatMonsterControl } from './flatMonsterControl';
import { interact, nearestTarget, prompt, type MonsterArena } from './monsterHelm';

/**
 * Das Steuer des Monsters, ohne Bild: **ein** Knopf, und er gilt immer dem
 * nächsten Ding. Genau daran hängt die Hervorhebung auf der Karte — zwei
 * hervorgehobene Dinge wären eine Frage, und die Antwort steht in keinem
 * Knopf.
 */

const DT = 1 / 30;
const IDLE = { x: 0, z: 0, sprint: false };

function stage(seed = 3): { round: FlatRound; control: FlatMonsterControl; arena: MonsterArena } {
  const round = new FlatRound(seed, { roll: 1 });
  const control = new FlatMonsterControl(round);
  control.claim();
  round.step(DT, IDLE);
  const arena: MonsterArena = {
    house: () => round.house,
    state: () => round.haunt,
    rider: () => round.monster,
    ride: () => round.ventRide,
    locks: () => round.locks,
    time: () => round.haunt.time,
  };
  return { round, control, arena };
}

describe('Der eine Knopf des Monsters', () => {
  it('meint immer nur das nächste Ziel — Klappe, Kabine oder Tür', () => {
    const { round, arena } = stage();
    // Mitten im Raum: nichts in Reichweite, nichts hervorzuheben.
    Object.assign(round.monster, round.graph.centre(round.monster.space));
    round.step(DT, IDLE);
    expect(nearestTarget(arena)).toBeNull();
    expect(prompt(arena)).toBe('');

    // Vor eine Kabine: sie ist das Ziel.
    const cabin = round.items().find((i) => i.kind === 'locker')!;
    Object.assign(round.monster, { x: cabin.at.x + 0.5, z: cabin.at.z, space: cabin.roomId });
    expect(nearestTarget(arena)).toMatchObject({ kind: 'cabin', id: cabin.roomId });

    // Eine Klappe noch näher: sie gewinnt, und nur sie.
    const flap = round.vents.flaps[0]!;
    Object.assign(round.monster, {
      x: flap.approach.x,
      z: flap.approach.z,
      space: flap.roomId,
    });
    const target = nearestTarget(arena);
    expect(target?.kind).toBe('vent');
    expect(target?.id).toBe(flap.id);
    expect(prompt(arena)).toBe('Einsteigen');
  });

  it('zieht an einer gesperrten Stahltür, statt sie hinzunehmen', () => {
    const { round, arena } = stage();
    const door = round.house.doors.find((d) => d.material === 'metal') ?? round.house.doors[0]!;
    door.material = 'metal';
    const at = doorCentre(door);
    round.haunt.shut = chooseLock(
      round.locks,
      round.haunt.shut,
      door.id,
      round.haunt.time,
      () => 0,
    );
    Object.assign(round.monster, { x: at.x, z: at.z });
    round.step(DT, IDLE);
    expect(nearestTarget(arena)).toMatchObject({ kind: 'door', id: door.id });
    expect(prompt(arena)).toBe('Tür aufziehen');

    // Der erste Zug geht nie auf; der Knopf zählt ihn mit.
    expect(interact(arena, 0).text).toBe('Der Riegel hält — noch.');
    expect(round.haunt.shut).toContain(door.id);
    expect(pryTries(round.locks, door.id)).toBe(1);
    expect(prompt(arena)).toBe('Tür aufziehen (1)');
    // Zu früh: derselbe Zug zählt nicht doppelt.
    expect(interact(arena, 0).text).toBe('');
    expect(pryTries(round.locks, door.id)).toBe(1);

    // Danach so lange, bis er nachgibt — der Takt gehört `pryLock`.
    for (let tries = 0; tries < 30 && round.haunt.shut.includes(door.id); tries++) {
      round.haunt.time += PRY_COOLDOWN;
      interact(arena, 0);
    }
    expect(round.haunt.shut).not.toContain(door.id);
    expect(pryTries(round.locks, door.id)).toBe(0);
  });

  it('splittert Holz weiter auf einen Schlag', () => {
    const { round, arena } = stage();
    const door = round.house.doors[0]!;
    door.material = 'wood';
    const at = doorCentre(door);
    round.haunt.shut = chooseLock(
      round.locks,
      round.haunt.shut,
      door.id,
      round.haunt.time,
      () => 0,
    );
    Object.assign(round.monster, { x: at.x, z: at.z });
    round.step(DT, IDLE);
    expect(prompt(arena)).toBe('Tür aufbrechen');
    expect(interact(arena, 0).text).toBe('Holz splittert.');
    expect(round.haunt.shut).not.toContain(door.id);
    expect(round.locks.chosen).toBe('');
  });

  it('gibt die Kabine als Auftrag an die Runde weiter, nicht als Text', () => {
    const { round, control } = stage();
    const cabin = round.items().find((i) => i.kind === 'locker')!;
    Object.assign(round.monster, { x: cabin.at.x + 0.5, z: cabin.at.z, space: cabin.roomId });
    round.step(DT, IDLE);
    expect(control.target()).toMatchObject({ kind: 'cabin' });
    expect(control.act('interact')).toBe('Die Kabine wird aufgerissen.');
    const decision = control.decide(DT);
    expect(decision.cabin).toBe(cabin.roomId);
    expect(decision.strike).toBe(true);
    // Und genau einmal: das nächste Bild trägt sie nicht mehr.
    expect(control.decide(DT).cabin).toBe('');
  });
});
