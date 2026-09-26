import * as THREE from 'three';
import type { Npc } from './Npc';
import type { NpcPose } from './NpcBody';
import { VisitorRoutine, type RoutineHost } from './NpcRoutine';

/**
 * **Die Schicht an der Welt, ohne Welt.** Ein NPC ist hier ein Punkt, der
 * jedes Bild mit 1,5 m/s auf sein Ziel zugeht und sich auf die Stelle setzt,
 * die ihm `hold` sagt — genau die vier Handgriffe, die `VisitorRoutine`
 * braucht (`feet`, `alive`, `sendTo`, `hold`). Geprüft wird die Übersetzung:
 * Auftrag → `sendTo`, Haltung → `hold`, gegangen → abgemeldet.
 */
class FakeNpc {
  readonly at = new THREE.Vector3();
  goal: THREE.Vector3 | null = null;
  reach = 0;
  pose: NpcPose | null = null;
  alive = true;
  sends = 0;

  feet(target: THREE.Vector3): THREE.Vector3 {
    return target.copy(this.at);
  }

  sendTo(point: THREE.Vector3 | null, reach?: number): void {
    this.sends++;
    this.goal = point ? point.clone() : null;
    this.reach = reach ?? 0;
  }

  hold(pose: NpcPose | null, _yaw?: number, at: { x: number; z: number } | null = null): void {
    this.pose = pose;
    if (pose && at) this.at.set(at.x, 0, at.z);
    if (pose) this.goal = null;
  }

  step(dt: number): void {
    if (!this.goal || this.pose) return;
    const dx = this.goal.x - this.at.x;
    const dz = this.goal.z - this.at.z;
    const d = Math.hypot(dx, dz);
    if (d <= this.reach) return;
    const s = Math.min(d, 1.5 * dt);
    this.at.x += (dx / d) * s;
    this.at.z += (dz / d) * s;
  }
}

function world(): { host: RoutineHost; npcs: FakeNpc[]; removed: FakeNpc[] } {
  const npcs: FakeNpc[] = [];
  const removed: FakeNpc[] = [];
  const host: RoutineHost = {
    spawn: (_kind, at) => {
      const npc = new FakeNpc();
      npc.at.copy(at);
      npcs.push(npc);
      return npc as unknown as Npc;
    },
    remove: (npc) => {
      removed.push(npc as unknown as FakeNpc);
    },
  };
  return { host, npcs, removed };
}

function dice(seed = 5): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('VisitorRoutine: Besucher an echten Handgriffen', () => {
  it('lässt ein, schickt hin, setzt hin, lässt gehen und meldet ab', () => {
    const { host, npcs, removed } = world();
    const routine = new VisitorRoutine(host, {
      entrance: { x: 0, z: 0 },
      exit: { x: 0, z: 0 },
      kinds: ['dummy'],
      config: { visits: 1, stayMin: 2, stayMax: 2, think: 0.1 },
    });
    routine.addPlace({ id: 'stuhl', kind: 'seat', x: 0, z: -5, yaw: 0 });
    expect(routine.admit(1)).toBe(1);

    const random = dice();
    let sat = false;
    for (let t = 0; t < 20 && routine.count > 0; t += 0.05) {
      routine.update(0.05, random);
      for (const npc of npcs) npc.step(0.05);
      if (npcs[0]!.pose === 'sit') {
        sat = true;
        expect(npcs[0]!.at.z).toBeCloseTo(-5);
      }
    }
    expect(sat).toBe(true);
    expect(routine.count).toBe(0);
    expect(removed).toEqual([npcs[0]]);
    expect(routine.board.isFree('stuhl')).toBe(true);
    // Nicht jedes Bild neu geschickt: ein Ziel ist ein Ziel.
    expect(npcs[0]!.sends).toBeLessThan(10);
  });

  it('räumt einen Gefallenen weg und gibt seinen Platz frei', () => {
    const { host, npcs, removed } = world();
    const routine = new VisitorRoutine(host, {
      entrance: { x: 0, z: 0 },
      exit: { x: 0, z: 0 },
      kinds: ['dummy'],
    });
    routine.addPlace({ id: 'stuhl', kind: 'seat', x: 0, z: -5, yaw: 0 });
    routine.admit(1);
    routine.update(0.05, dice());
    expect(routine.board.isFree('stuhl')).toBe(false);
    npcs[0]!.alive = false;
    routine.update(0.05, dice());
    expect(removed).toHaveLength(1);
    expect(routine.board.isFree('stuhl')).toBe(true);
  });

  it('weicht einem Stehenden im Weg aus — mit einem Schritt nach rechts', () => {
    const { host, npcs } = world();
    const routine = new VisitorRoutine(host, {
      entrance: { x: 0, z: 0 },
      exit: { x: 0, z: 0 },
      kinds: ['dummy'],
    });
    routine.addPlace({ id: 'stuhl', kind: 'seat', x: 0, z: -8, yaw: 0 });
    // Der Erste nimmt sich den einzigen Stuhl …
    routine.admit(1);
    const walker = npcs[0]!;
    walker.at.set(0, 0, 0);
    routine.update(0.05, () => 0);
    // … der Zweite findet keinen mehr, steht einen Meter vor ihm im Weg und
    // hat nichts vor.
    routine.admit(1);
    const blocker = npcs[1]!;
    blocker.at.set(0, 0, -0.9);
    routine.update(0.05, () => 0);
    // Der Erste hat den Stuhl und geht nach Norden; der Ausweichpunkt liegt
    // rechts davon, also im Osten.
    const goal = walker.goal!;
    expect(goal).not.toBeNull();
    expect(goal.x).toBeGreaterThan(0.5);
  });

  it('räumt auf Wunsch alle weg', () => {
    const { host, removed } = world();
    const routine = new VisitorRoutine(host, {
      entrance: { x: 0, z: 0 },
      exit: { x: 0, z: 0 },
      kinds: ['dummy', 'zombie'],
    });
    routine.admit(3);
    expect(routine.clear()).toBe(3);
    expect(removed).toHaveLength(3);
    expect(routine.count).toBe(0);
  });
});
