import * as THREE from 'three';
import { PhysicsWorld } from '../../physics/PhysicsWorld';
import { NpcDirector } from './NpcDirector';

/**
 * **Woher Nachschub kommt** — mit echter Physik, weil ein NPC ohne sie keinen
 * Körper hat.
 *
 * Geprüft wird eine einzige Regel, und sie ist die Antwort auf „warum steht der
 * schon wieder da": **Der Käfig sagt wann, der Spawnpunkt sagt wo.** Wo kein
 * Punkt steht, legt auch kein Käfig nach — wer einen Zombie umlegt, will ihn
 * liegen sehen und nicht zwei Sekunden später wieder vor sich haben.
 *
 * Es ist neben `navlab/labPhysics.test.ts` die zweite Stelle, an der Rapier
 * wirklich startet (siehe `jest.config.cjs`): Der Bestand baut Körper, und eine
 * Attrappe, die das nur so tut, prüfte etwas anderes als das, was läuft.
 */

const DT = 1 / 60;

async function stage(): Promise<{
  director: NpcDirector;
  physics: PhysicsWorld;
  said: string[];
  run: (seconds: number) => void;
}> {
  const physics = await PhysicsWorld.create(-9.81);
  const root = new THREE.Group();
  const said: string[] = [];
  const player = new THREE.Vector3(0, 0, 0);
  const director = new NpcDirector({
    root,
    physics,
    playerAt: (target) => target.copy(player),
    strikePlayer: () => undefined,
    notify: (message) => said.push(message),
  });
  return {
    director,
    physics,
    said,
    run: (seconds: number) => {
      for (let frame = 0; frame < Math.round(seconds / DT); frame++) {
        director.update(DT);
        physics.step(DT);
        physics.sync();
      }
    },
  };
}

describe('Ein Brutkäfig ohne Spawnpunkt', () => {
  it('legt nichts nach und sagt es einmal', async () => {
    const { director, said, run } = await stage();
    director.addCage({
      kind: 'zombie',
      brain: 'chase',
      at: new THREE.Vector3(3, 0, 0),
      interval: 1,
      max: 5,
    });

    run(6);
    expect(director.census().npcs).toBe(0);
    // Einmal, nicht sechsmal: Eine Auskunft, die jede Sekunde kommt, ist keine.
    expect(said.filter((line) => line.includes('Kein Spawnpunkt'))).toHaveLength(1);
    director.dispose();
  }, 60000);

  it('legt wieder nach, sobald einer steht', async () => {
    const { director, run } = await stage();
    director.addCage({
      kind: 'zombie',
      brain: 'chase',
      at: new THREE.Vector3(3, 0, 0),
      interval: 1,
      max: 5,
    });
    run(3);
    expect(director.census().npcs).toBe(0);

    // Der Punkt steht weit genug weg, dass er auch gewählt werden darf.
    director.addPoint(new THREE.Vector3(-14, 0, 0));
    run(3);
    expect(director.census().npcs).toBeGreaterThan(0);
    director.dispose();
  }, 60000);
});
