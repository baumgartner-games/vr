import { FlatKernel } from './flatKernel';
import { DEFAULT_TUNING } from './botTuning';
import { freshCrew, stationOptions, PLAYER_WALK_SPEED } from './mission';
import { generateHouse, roomCentre } from './house';
import type { HauntState } from './net';
import { freshGhosts } from './rules/ghosts';
import { COMMAND_HOME } from './trainingLayout';

/**
 * **Die 2D-Runde als Rechenkern der 3D-Welt** (`flatKernel.ts`): Der Stand
 * des Schiffs ist der Stand der Runde, der Stock bewegt die Figur der Runde,
 * und der Techniker aus Zahlen ist derselbe wie auf dem Telefon.
 */
function state(): HauntState {
  return {
    crew: freshCrew(stationOptions({ rooms: 8 })),
    seed: 391,
    phase: 'running',
    time: 0,
    monsterOn: true,
    monster: { x: 12, z: -30 },
    shut: [],
    lit: [],
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
    technician: null,
    ride: 'out',
    ghosts: freshGhosts(),
  };
}

describe('Der Rechenkern', () => {
  it('rechnet auf dem Stand des Schiffs, nicht auf einer Abschrift', () => {
    const haunt = state();
    const kernel = new FlatKernel(
      391,
      haunt,
      {},
      { tuning: DEFAULT_TUNING, at: { ...COMMAND_HOME, yaw: 0 } },
    );
    expect(kernel.round.haunt).toBe(haunt);
    // Die Figur steht dort, wo das Gestell stand — und der Stand nennt keinen
    // zweiten Techniker: In der Brille ist er das Gestell.
    expect(kernel.pose.x).toBeCloseTo(COMMAND_HOME.x);
    expect(kernel.pose.z).toBeCloseTo(COMMAND_HOME.z);
    expect(haunt.technician).toBeNull();
    // Das Monster steht, wo der Stand es nennt.
    expect(kernel.round.monster.x).toBeCloseTo(12);
    expect(kernel.round.monster.z).toBeCloseTo(-30);
  });

  it('bewegt die Figur mit dem Stock und lässt die Uhr laufen', () => {
    const haunt = state();
    const kernel = new FlatKernel(
      391,
      haunt,
      {},
      { tuning: DEFAULT_TUNING, at: { ...COMMAND_HOME, yaw: 0 } },
    );
    const before = kernel.pose;
    for (let i = 0; i < 10; i++) kernel.step(0.1, { x: 0, z: -1, sprint: false });
    const after = kernel.pose;
    const walked = Math.hypot(after.x - before.x, after.z - before.z);
    expect(walked).toBeGreaterThan(0.5);
    expect(walked).toBeLessThanOrEqual(PLAYER_WALK_SPEED * 1 + 0.01);
    expect(haunt.time).toBeCloseTo(1, 1);
    // Blick und Schritt des Körpers kommen von der Brille, nicht aus der Bewegung.
    kernel.step(0.1, { x: 0, z: 0, sprint: false, yaw: 1.3, shift: { x: 0, z: 0 } });
    expect(kernel.pose.yaw).toBeCloseTo(1.3);
  });

  it('lässt den Techniker aus Zahlen der 2D-Welt die Bot-Runde spielen', () => {
    const haunt = state();
    haunt.crew.options.test = true;
    haunt.crew.simulation = true;
    const kernel = new FlatKernel(391, haunt, {}, { tuning: DEFAULT_TUNING });
    expect(kernel.botActive).toBe(false);
    expect(kernel.botNavigation.points).toHaveLength(0);
    let roll = 0.5;
    kernel.startBot(DEFAULT_TUNING.technician, () => roll);
    expect(kernel.botActive).toBe(true);
    expect(kernel.pose.x).toBeCloseTo(COMMAND_HOME.x);
    expect(kernel.pose.z).toBeCloseTo(COMMAND_HOME.z);
    for (let i = 0; i < 50; i++) {
      roll = ((roll * 9301 + 49297) % 233280) / 233280;
      kernel.stepBot(0.1);
    }
    // Er ist losgegangen, hat ein Ziel und einen Weg — mit Kollision, durch
    // dieselbe Runde wie auf dem Telefon.
    const walked = Math.hypot(kernel.pose.x - COMMAND_HOME.x, kernel.pose.z - COMMAND_HOME.z);
    expect(walked).toBeGreaterThan(1);
    expect(kernel.botStage).not.toBe('');
    expect(kernel.botNavigation.at).toEqual(expect.objectContaining({ x: kernel.pose.x }));
    kernel.stopBot();
    expect(kernel.botActive).toBe(false);
  });

  it('nennt den Weg des Monsters für die Wege-Ebene', () => {
    const haunt = state();
    const kernel = new FlatKernel(
      391,
      haunt,
      {},
      { tuning: DEFAULT_TUNING, at: { ...COMMAND_HOME, yaw: 0 } },
    );
    for (let i = 0; i < 30; i++) kernel.step(0.1, { x: 0, z: 0, sprint: false });
    const navigation = kernel.monsterNavigation;
    expect(navigation.at.x).toBeCloseTo(kernel.round.monster.x);
    expect(navigation.at.z).toBeCloseTo(kernel.round.monster.z);
    expect(Array.isArray(navigation.points)).toBe(true);
  });

  it('setzt die Figur um, wenn das Gestell versetzt wurde — nur auf begehbaren Boden', () => {
    const haunt = state();
    const kernel = new FlatKernel(
      391,
      haunt,
      {},
      { tuning: DEFAULT_TUNING, at: { ...COMMAND_HOME, yaw: 0 } },
    );
    const centre = roomCentre(generateHouse(391, 8).rooms[0]!);
    expect(kernel.place(centre)).toBe(true);
    expect(kernel.pose.x).toBeCloseTo(centre.x);
    expect(kernel.pose.z).toBeCloseTo(centre.z);
    expect(kernel.place({ x: 999, z: 999 })).toBe(false);
    expect(kernel.pose.x).toBeCloseTo(centre.x);
  });
});
