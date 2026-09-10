import { PRY_COOLDOWN } from './doorLocks';
import {
  COMMAND_DELAY,
  CREW_SIZE,
  SEAL_HOLD,
  askSeal,
  commandLag,
  dueSeal,
  freshSeal,
} from './doorSeal';

describe('Die Tür hinter dem Techniker', () => {
  /**
   * Der Gewinn dieser Regel ist eine Zahl, und sie ist ausgerechnet und nicht
   * geraten: Sie kommt aus denselben Würfeln, mit denen das Monster am Riegel
   * zieht (`doorLocks.pryLock`) — nie beim ersten Zug, danach mit wachsender
   * Aussicht. Wer an `pryChance` dreht, ändert damit die Balance der ganzen
   * Runde, und das soll hier auffallen.
   */
  it('hält das Monster so lange auf, wie es im Mittel zum Aufziehen braucht', () => {
    expect(SEAL_HOLD).toBeGreaterThan(2 * PRY_COOLDOWN);
    expect(SEAL_HOLD).toBeLessThan(6 * PRY_COOLDOWN);
  });

  it('macht sie allein sofort zu und im Team erst nach dem Zuruf', () => {
    expect(commandLag(2, () => 0.5)).toBe(0);
    expect(commandLag(1, () => 0.5)).toBe(0);
    const crew = commandLag(CREW_SIZE, () => 0.5);
    expect(crew).toBeGreaterThanOrEqual(COMMAND_DELAY[0]);
    expect(crew).toBeLessThanOrEqual(COMMAND_DELAY[1]);
    expect(commandLag(9, () => 0)).toBe(COMMAND_DELAY[0]);
    expect(commandLag(9, () => 1)).toBe(COMMAND_DELAY[1]);
  });

  it('gibt den Riegel erst frei, wenn seine Zeit gekommen ist — und nur einmal', () => {
    const seal = freshSeal();
    expect(dueSeal(seal, 0)).toBe('');
    askSeal(seal, 'd7', 10, 2);
    expect(seal.relayed).toBe(false);
    expect(dueSeal(seal, 10)).toBe('d7');
    expect(dueSeal(seal, 10)).toBe('');
  });

  it('lässt im Team die Sekunden verstreichen und merkt sich, dass es ein Zuruf war', () => {
    const seal = freshSeal();
    askSeal(seal, 'd7', 10, CREW_SIZE, () => 0);
    expect(seal.relayed).toBe(true);
    expect(dueSeal(seal, 10 + COMMAND_DELAY[0] - 0.01)).toBe('');
    expect(dueSeal(seal, 10 + COMMAND_DELAY[0])).toBe('d7');
  });

  /** Es gilt immer die letzte Tür: Hinter der steht das Monster. */
  it('ersetzt einen offenen Auftrag durch die Tür, durch die er gerade ging', () => {
    const seal = freshSeal();
    askSeal(seal, 'd1', 0, CREW_SIZE, () => 0);
    askSeal(seal, 'd2', 1, CREW_SIZE, () => 0);
    expect(dueSeal(seal, 99)).toBe('d2');
    expect(dueSeal(seal, 99)).toBe('');
  });
});
