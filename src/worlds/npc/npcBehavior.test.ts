import {
  VISITOR_DEFAULTS,
  newVisitor,
  stepVisitor,
  type BehaviorOrder,
  type VisitorConfig,
  type VisitorState,
} from './npcBehavior';
import { PlaceBoard } from './npcPlaces';

/** Ein Würfel, der immer dasselbe sagt — reproduzierbar. */
function dice(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface Walker {
  state: VisitorState;
  x: number;
  z: number;
  order: BehaviorOrder | null;
}

/**
 * Eine kleine Welt ohne Physik: Jeder läuft mit 1,5 m/s geradeaus auf sein
 * Ziel zu und steht, wenn er keines hat. Mehr braucht die Zustandsmaschine
 * nicht, um zu zeigen, dass sie tut, was sie soll.
 */
function simulate(
  board: PlaceBoard,
  walkers: Walker[],
  seconds: number,
  config: VisitorConfig,
  watch?: (walkers: Walker[]) => void,
): void {
  const dt = 0.1;
  const random = dice(7);
  for (let t = 0; t < seconds; t += dt) {
    for (const walker of walkers) {
      const order = stepVisitor(walker.state, board, { at: walker, dt, random }, config);
      walker.order = order;
      if (order.settle) {
        walker.x = order.settle.x;
        walker.z = order.settle.z;
      } else if (order.goal) {
        const dx = order.goal.x - walker.x;
        const dz = order.goal.z - walker.z;
        const d = Math.hypot(dx, dz);
        const step = Math.min(d, 1.5 * dt);
        if (d > 1e-6) {
          walker.x += (dx / d) * step;
          walker.z += (dz / d) * step;
        }
      }
    }
    watch?.(walkers);
  }
}

function seats(board: PlaceBoard, count: number): void {
  for (let i = 0; i < count; i++) {
    board.add({ id: `stuhl-${i}`, kind: 'seat', x: i * 2, z: -6, yaw: 0 });
  }
}

function crowd(count: number): Walker[] {
  return Array.from({ length: count }, (_, i) => ({
    state: newVisitor(`gast-${i}`, { x: 0, z: 4 }),
    x: i * 0.5,
    z: 4,
    order: null,
  }));
}

describe('Verhalten: Besucher suchen Plätze auf', () => {
  it('geht zum Stuhl, sitzt dort mit Blick in seine Richtung und geht danach', () => {
    const board = new PlaceBoard();
    seats(board, 1);
    const [one] = crowd(1);
    const modes = new Set<string>();
    let sat = false;
    simulate(board, [one!], 60, { ...VISITOR_DEFAULTS, visits: 1 }, (all) => {
      const walker = all[0]!;
      modes.add(walker.state.mode);
      if (walker.order?.pose === 'sit') {
        sat = true;
        expect(walker.order.yaw).toBe(0);
        expect(Math.hypot(walker.x - 0, walker.z + 6)).toBeLessThan(0.01);
      }
    });
    expect(sat).toBe(true);
    expect([...modes]).toEqual(expect.arrayContaining(['goto', 'interact', 'leave', 'gone']));
    expect(one!.state.mode).toBe('gone');
    expect(board.freeCount('seat')).toBe(1);
  });

  it('stapelt nie zwei auf einen Platz — auch nicht mit mehr Gästen als Stühlen', () => {
    const board = new PlaceBoard();
    seats(board, 3);
    const walkers = crowd(6);
    let seatedMax = 0;
    simulate(board, walkers, 120, VISITOR_DEFAULTS, (all) => {
      const sitting = all.filter((walker) => walker.order?.pose === 'sit');
      const spots = new Set(sitting.map((walker) => `${walker.x}|${walker.z}`));
      expect(spots.size).toBe(sitting.length);
      seatedMax = Math.max(seatedMax, sitting.length);
      // Jeder, der läuft oder sitzt, hat genau einen Platz, und keiner teilt ihn.
      const held = all
        .map((walker) => board.placeOf(walker.state.id)?.id)
        .filter((id): id is string => !!id);
      expect(new Set(held).size).toBe(held.length);
    });
    expect(seatedMax).toBe(3);
    expect(walkers.every((walker) => walker.state.visited >= 1)).toBe(true);
  });

  it('stellt sich an, rückt auf, und wer die Geduld verliert, geht', () => {
    const board = new PlaceBoard();
    seats(board, 1);
    for (let i = 0; i < 3; i++) {
      board.add({ id: `q${i}`, kind: 'queue', x: 6, z: -2 + i, yaw: 0, line: 'bank', order: i });
    }
    const config: VisitorConfig = {
      ...VISITOR_DEFAULTS,
      visits: 1,
      stayMin: 30,
      stayMax: 30,
      line: 'bank',
      patience: 8,
    };
    const walkers = crowd(3);
    const events: string[] = [];
    simulate(board, walkers, 32, config, (all) => {
      for (const walker of all) if (walker.state.last) events.push(walker.state.last);
    });
    expect(events).toContain('queued');
    expect(events).toContain('impatient');
    // Einer sitzt noch (30 s), die beiden anderen sind aus Ungeduld gegangen.
    const modes = walkers.map((walker) => walker.state.mode).sort();
    expect(modes).toEqual(['gone', 'gone', 'interact']);
    expect(board.list('queue').every((slot) => board.isFree(slot.id))).toBe(true);
  });

  it('gibt einen unerreichbaren Platz auf und gibt ihn frei', () => {
    const board = new PlaceBoard();
    seats(board, 1);
    const state = newVisitor('gast', { x: 0, z: 0 });
    const config = { ...VISITOR_DEFAULTS, giveUp: 2 };
    const random = dice(3);
    let freeWhenGivenUp = -1;
    // Er kommt nie voran — wie einer, der vor einer Kiste feststeckt.
    for (let t = 0; t < 3; t += 0.1) {
      stepVisitor(state, board, { at: { x: 0, z: 4 }, dt: 0.1, random }, config);
      if (state.last === 'gave-up') freeWhenGivenUp = board.freeCount('seat');
    }
    expect(freeWhenGivenUp).toBe(1);
  });

  it('lässt einen Spielmodus selbst entscheiden', () => {
    const board = new PlaceBoard();
    seats(board, 2);
    const config: VisitorConfig = {
      ...VISITOR_DEFAULTS,
      decide: (state) =>
        state.visited === 0
          ? { kind: 'visit', place: 'stuhl-1', pose: 'interact', seconds: 2 }
          : { kind: 'leave' },
    };
    const [one] = crowd(1);
    let pose = null;
    simulate(board, [one!], 30, config, (all) => {
      if (all[0]!.order?.pose) pose = all[0]!.order.pose;
    });
    expect(pose).toBe('interact');
    expect(one!.state.mode).toBe('gone');
  });
});
