import { fillRect, setWindow } from './navBuild';
import { NavGraph } from './navGraph';
import {
  GUARD_SENSES,
  LOUDNESS,
  ZOMBIE_SENSES,
  newRecall,
  perceive,
  soundReach,
  type SenseConfig,
  type SenseInput,
} from './navPerception';
import { SOUND_RANGE } from './navSight';
import { DIR_E, TILE, tileKey } from './navTile';

function hall(w = 20, d = 5): NavGraph {
  const graph = new NavGraph();
  fillRect(graph, { x: 0, z: 0, w, d });
  return graph;
}

/** Ein Bild der Wahrnehmung, mit dem NPC bei (0,2) und Blick nach Osten. */
function look(graph: NavGraph, targetX: number | null, over: Partial<SenseInput> = {}): SenseInput {
  const me = graph.worldOf(tileKey(0, 2, 0));
  const target = targetX === null ? null : { x: (targetX + 0.5) * TILE, z: (2 + 0.5) * TILE };
  return {
    graph,
    at: { x: me.x, z: me.z },
    tile: tileKey(0, 2, 0),
    yaw: -Math.PI / 2, // Osten: yaw = 0 schaut nach −Z, also −90° nach +X
    target,
    targetTile: targetX === null ? -1 : tileKey(targetX, 2, 0),
    dt: 1 / 60,
    now: 0,
    ...over,
  };
}

describe('Der Sichtkegel', () => {
  it('sieht, was vor ihm und nah genug ist', () => {
    const graph = hall();
    const step = perceive(GUARD_SENSES, newRecall(), look(graph, 4));
    expect(step.sees).toBe(true);
  });

  it('sieht nicht, was hinter ihm steht', () => {
    const graph = hall();
    const step = perceive(GUARD_SENSES, newRecall(), look(graph, 4, { yaw: Math.PI / 2 }));
    expect(step.sees).toBe(false);
  });

  it('sieht nicht weiter, als es sein Auge hergibt', () => {
    const graph = hall(40);
    const near: SenseConfig = { ...GUARD_SENSES, sight: 10 };
    expect(perceive(near, newRecall(), look(graph, 2)).sees).toBe(true);
    expect(perceive(near, newRecall(), look(graph, 30)).sees).toBe(false);
  });

  it('sieht nicht durch eine Wand, aber durch ein Fenster', () => {
    const graph = hall();
    graph.setWall(tileKey(2, 2, 0), DIR_E, { kind: 'solid' });
    expect(perceive(GUARD_SENSES, newRecall(), look(graph, 5)).sees).toBe(false);
    setWindow(graph, tileKey(2, 2, 0), DIR_E);
    expect(perceive(GUARD_SENSES, newRecall(), look(graph, 5)).sees).toBe(true);
  });

  it('hat mit 180 Grad einen Rundumblick', () => {
    const graph = hall();
    const all: SenseConfig = { ...GUARD_SENSES, fov: 180 };
    expect(perceive(all, newRecall(), look(graph, 4, { yaw: Math.PI / 2 })).sees).toBe(true);
  });

  it('sieht niemanden, wenn keiner da ist', () => {
    const step = perceive(GUARD_SENSES, newRecall(), look(hall(), null));
    expect(step).toMatchObject({ sees: false, alert: false, goto: null });
  });
});

describe('Die Reaktionszeit', () => {
  it('reagiert nicht im selben Bild, in dem er hinschaut', () => {
    const graph = hall();
    const recall = newRecall();
    const first = perceive(GUARD_SENSES, recall, look(graph, 4));
    expect(first.sees).toBe(true);
    expect(first.spotted).toBe(true);
    expect(first.alert).toBe(false);
  });

  it('reagiert, sobald er lange genug hingesehen hat', () => {
    const graph = hall();
    const recall = newRecall();
    let alert = false;
    let seconds = 0;
    for (let i = 0; i < 60 && !alert; i++) {
      seconds += 1 / 60;
      alert = perceive(GUARD_SENSES, recall, look(graph, 4, { now: seconds })).alert;
    }
    expect(alert).toBe(true);
    expect(seconds).toBeGreaterThanOrEqual(GUARD_SENSES.reaction);
    // Und nicht viel später: eine Zehntelsekunde Toleranz.
    expect(seconds).toBeLessThan(GUARD_SENSES.reaction + 0.1);
  });

  it('meldet die Flanke genau einmal', () => {
    const graph = hall();
    const recall = newRecall();
    expect(perceive(ZOMBIE_SENSES, recall, look(graph, 3)).spotted).toBe(true);
    expect(perceive(ZOMBIE_SENSES, recall, look(graph, 3)).spotted).toBe(false);
  });

  it('fängt von vorn an, wenn er ihn zwischendurch verliert', () => {
    const graph = hall();
    const recall = newRecall();
    perceive(GUARD_SENSES, recall, look(graph, 4, { dt: 0.25 }));
    perceive(GUARD_SENSES, recall, look(graph, null, { dt: 0.25 }));
    expect(perceive(GUARD_SENSES, recall, look(graph, 4, { dt: 0.25 })).alert).toBe(false);
  });
});

describe('Das Gedächtnis', () => {
  it('merkt sich, wo er zuletzt war', () => {
    const graph = hall();
    const recall = newRecall();
    perceive(GUARD_SENSES, recall, look(graph, 6, { now: 10 }));
    const step = perceive(GUARD_SENSES, recall, look(graph, null, { now: 11 }));
    expect(step.sees).toBe(false);
    expect(step.goto).not.toBeNull();
    expect(step.goto!.x).toBeCloseTo(6.5 * TILE, 6);
  });

  it('vergisst es nach der eingestellten Zeit', () => {
    const graph = hall();
    const recall = newRecall();
    perceive(GUARD_SENSES, recall, look(graph, 6, { now: 10 }));
    const late = 10 + GUARD_SENSES.memory + 1;
    expect(perceive(GUARD_SENSES, recall, look(graph, null, { now: late })).goto).toBeNull();
  });

  it('behält die Stelle, solange er hinschaut — auch wenn er sich nicht bewegt', () => {
    const graph = hall();
    const recall = newRecall();
    for (let i = 0; i < 10; i++) {
      perceive(GUARD_SENSES, recall, look(graph, 6, { now: i }));
    }
    expect(recall.how).toBe('sight');
    expect(recall.when).toBe(9);
  });
});

describe('Das Gehör', () => {
  it('schickt ihn zu einem Knall, den er nicht sehen kann', () => {
    const graph = hall(20, 5);
    graph.setWall(tileKey(2, 2, 0), DIR_E, { kind: 'solid' });
    const recall = newRecall();
    const world = graph.worldOf(tileKey(5, 2, 0));
    const step = perceive(
      GUARD_SENSES,
      recall,
      look(graph, null, {
        now: 4,
        sounds: [{ tile: tileKey(5, 2, 0), x: world.x, z: world.z, loudness: LOUDNESS.shot }],
      }),
    );
    expect(step.heard).toBeGreaterThan(0);
    expect(step.goto).not.toBeNull();
    expect(recall.how).toBe('sound');
  });

  it('überhört, was zu leise ankommt', () => {
    const graph = hall(30, 1);
    const recall = newRecall();
    const world = graph.worldOf(tileKey(25, 0, 0));
    const step = perceive(
      { ...GUARD_SENSES, ear: 0.5 },
      recall,
      look(graph, null, {
        tile: tileKey(0, 0, 0),
        sounds: [{ tile: tileKey(25, 0, 0), x: world.x, z: world.z, loudness: LOUDNESS.step }],
      }),
    );
    expect(step.goto).toBeNull();
  });

  it('lässt sich nicht von einem Geräusch wegschicken, wenn er sein Ziel sieht', () => {
    const graph = hall();
    const recall = newRecall();
    const noise = graph.worldOf(tileKey(0, 4, 0));
    perceive(
      GUARD_SENSES,
      recall,
      look(graph, 4, {
        now: 3,
        sounds: [{ tile: tileKey(0, 4, 0), x: noise.x, z: noise.z, loudness: LOUDNESS.shot }],
      }),
    );
    expect(recall.how).toBe('sight');
  });
});

describe('Die Vorsortierung', () => {
  it('sagt, wie weit ein Geräusch überhaupt tragen kann', () => {
    expect(soundReach(1, 0, SOUND_RANGE)).toBeCloseTo(SOUND_RANGE, 9);
    expect(soundReach(0.5, 0.5, SOUND_RANGE)).toBe(0);
    expect(soundReach(LOUDNESS.step, 0.05, SOUND_RANGE)).toBeGreaterThan(0);
    expect(soundReach(LOUDNESS.step, 0.05, SOUND_RANGE)).toBeLessThan(SOUND_RANGE);
  });
});
