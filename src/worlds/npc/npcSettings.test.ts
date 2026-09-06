import {
  DEFAULT_NPC,
  NPC_FIELDS,
  NPC_MODE_IDS,
  clampNpc,
  nextIn,
  nextNpcStep,
  npcFieldLabel,
  withBrain,
  withKind,
} from './npcSettings';
import { BRAIN_IDS, brainOf } from './npcBrains';
import { NPC_KINDS, npcSkin } from './npcKinds';

describe('Die Einstellung des Hirns', () => {
  it('bleibt heil, wenn der Speicher Unsinn enthält', () => {
    const settings = clampNpc({
      kind: 'drache' as never,
      brain: 'genie' as never,
      mode: 'zaubern' as never,
      speed: Number.NaN,
      health: -3,
      interval: 9999,
      max: 0,
    });
    expect(settings.kind).toBe(DEFAULT_NPC.kind);
    expect(settings.brain).toBe(DEFAULT_NPC.brain);
    expect(settings.mode).toBe(DEFAULT_NPC.mode);
    expect(settings.speed).toBe(DEFAULT_NPC.speed);
    expect(settings.health).toBe(1);
    expect(settings.interval).toBe(120);
    expect(settings.max).toBe(1);
  });

  it('kommt mit einem leeren Speicher aus', () => {
    expect(clampNpc(undefined)).toEqual(DEFAULT_NPC);
    expect(clampNpc({})).toEqual(DEFAULT_NPC);
  });

  it('lässt ein Tempo von null zu — das ist ein Hirn, das steht', () => {
    expect(clampNpc({ speed: 0 }).speed).toBe(0);
  });

  it('schaltet jede Zahl durch ihre Rasten und fängt wieder von vorn an', () => {
    for (const field of NPC_FIELDS) {
      let value = field.steps[0]!;
      for (let i = 1; i < field.steps.length; i++) {
        value = nextNpcStep(field, value);
        expect(value).toBe(field.steps[i]);
      }
      expect(nextNpcStep(field, value)).toBe(field.steps[0]);
    }
  });

  it('schreibt die Einheit nur dorthin, wo es eine gibt', () => {
    expect(npcFieldLabel(NPC_FIELDS[0]!, 1.5)).toBe('1.5 m/s');
    expect(npcFieldLabel(NPC_FIELDS[1]!, 100)).toBe('100');
  });
});

describe('Haut und Hirn ziehen ihre Zahlen mit', () => {
  it('nimmt das Leben der Haut', () => {
    for (const kind of NPC_KINDS) {
      expect(withKind(DEFAULT_NPC, kind).health).toBe(npcSkin(kind).health);
    }
  });

  it('nimmt das Tempo des Hirns', () => {
    for (const brain of BRAIN_IDS) {
      expect(withBrain(DEFAULT_NPC, brain).speed).toBe(brainOf(brain).tuning.speed);
    }
  });

  it('lässt die andere Hälfte dabei in Ruhe', () => {
    const set = withKind({ ...DEFAULT_NPC, brain: 'wander', speed: 0.7 }, 'dummy');
    expect(set.brain).toBe('wander');
    expect(set.speed).toBe(0.7);
  });
});

describe('Der Reihe nach', () => {
  it('geht jede Liste im Kreis', () => {
    expect(nextIn(NPC_MODE_IDS, NPC_MODE_IDS[NPC_MODE_IDS.length - 1]!)).toBe(NPC_MODE_IDS[0]);
    expect(nextIn(BRAIN_IDS, BRAIN_IDS[0]!)).toBe(BRAIN_IDS[1]);
    expect(nextIn(NPC_KINDS, NPC_KINDS[0]!)).toBe(NPC_KINDS[1]);
  });
});
