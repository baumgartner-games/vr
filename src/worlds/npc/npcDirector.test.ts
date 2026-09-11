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

async function stage(onStrike: (director: NpcDirector) => void = () => undefined): Promise<{
  director: NpcDirector;
  physics: PhysicsWorld;
  said: string[];
  struck: () => number;
  run: (seconds: number) => void;
}> {
  const physics = await PhysicsWorld.create(-9.81);
  const root = new THREE.Group();
  const said: string[] = [];
  let hits = 0;
  const player = new THREE.Vector3(0, 0, 0);
  const director: NpcDirector = new NpcDirector({
    root,
    physics,
    playerAt: (target) => target.copy(player),
    strikePlayer: () => {
      hits++;
      onStrike(director);
    },
    notify: (message) => said.push(message),
  });
  return {
    director,
    physics,
    said,
    struck: () => hits,
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

/**
 * **Ein Schlag, der die Liste verändert.** `strike` ruft mitten im Durchlauf
 * `world.strikePlayer`, und die Welt darf darauf antworten, indem sie NPCs
 * wegräumt — Haunting nimmt bei „Anzug 0" das Monster aus dem Spiel
 * (`clear`). Mit zwei Einträgen griff der Rücklauf über die Originalliste
 * danach ins Leere (`this.npcs[i]` undefined) — der Absturz nach einem
 * Treffer. Zwei Zombies auf Schlagweite, ein Schlag, der alles wegräumt:
 * kein Fehler, und danach steht niemand mehr.
 */
describe('Ein Schlag, der die Liste verändert', () => {
  it('überlebt es, wenn die Welt beim Treffer alle NPCs wegräumt', async () => {
    const { director, struck, run } = await stage((self) => self.clear());
    for (const x of [0.6, -0.6]) {
      expect(
        director.spawn({ kind: 'zombie', brain: 'chase', at: new THREE.Vector3(x, 0, 0) }),
      ).not.toBeNull();
    }
    expect(director.census().npcs).toBe(2);
    expect(() => run(4)).not.toThrow();
    expect(struck()).toBeGreaterThan(0);
    expect(director.census().npcs).toBe(0);
    director.dispose();
  }, 60000);

  it('räumt einen Gefallenen nur einmal weg, auch wenn ein Schlag dazwischenkommt', async () => {
    const { director, run } = await stage();
    const npc = director.spawn({
      kind: 'zombie',
      brain: 'chase',
      at: new THREE.Vector3(0.6, 0, 0),
    });
    expect(npc).not.toBeNull();
    expect(() => run(2)).not.toThrow();
    expect(director.census().npcs).toBe(1);
    director.dispose();
  }, 60000);
});
