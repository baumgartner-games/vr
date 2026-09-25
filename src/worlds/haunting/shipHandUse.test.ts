/**
 * Schutzschrank und Frachtschrank in der Brille: Saum, Trigger, Greif-Taste
 * (`shipHandUse.ts`). Gemeldet war: „Die Trigger-Interaktion geht bei den
 * Schutzspinden nicht — sie müssen gehighlightet und in VR mit Trigger oder
 * Grab betretbar sein. Genauso die Schränke, in denen man etwas findet."
 */
import { handUseFires, pickHandUse, type HandUseFind } from '../../core/handUse';
import {
  interactionKind,
  resolveInteraction,
  vrInputs,
  type InteractionLike,
} from '../../core/interaction';
import { SHIP_HAND_USE, lockerExitPress, lockerInteraction, shipRayPasses } from './shipHandUse';

function find(reach: 'touch' | 'aim', like: InteractionLike = SHIP_HAND_USE): HandUseFind<string> {
  return {
    item: 'locker',
    reach,
    distance: reach === 'touch' ? -0.1 : 1.2,
    kind: interactionKind(like),
    inputs: vrInputs(like),
  };
}

describe('in der Brille', () => {
  test('Trigger und Greif-Taste lösen aus, gezielt wie angefasst', () => {
    for (const reach of ['touch', 'aim'] as const) {
      expect(handUseFires(find(reach), { trigger: true, grip: false }, null)).toBe(true);
      expect(handUseFires(find(reach), { trigger: false, grip: true }, null)).toBe(true);
    }
  });

  test('bloßes Berühren steigt nicht ein — wer vorbeigeht, streift den Schrank', () => {
    expect(handUseFires(find('touch'), { trigger: false, grip: false }, null)).toBe(false);
  });

  test('der Schrank bietet sich an, also leuchtet der Saum', () => {
    const resolved = resolveInteraction(SHIP_HAND_USE, 'vr');
    expect(resolved.interactive).toBe(true);
    expect(resolved.inputs).toEqual(['aimTrigger', 'grip']);
  });

  test('von oben und aus den Augen bleibt es der Knopf von vorher', () => {
    expect(resolveInteraction(SHIP_HAND_USE, 'topDown')).toEqual(
      resolveInteraction('press', 'topDown'),
    );
    expect(resolveInteraction(SHIP_HAND_USE, 'firstPerson')).toEqual(
      resolveInteraction('press', 'firstPerson'),
    );
  });
});

describe('der Schutzschrank von innen', () => {
  test('kein Saum um den eigenen Kopf, und die Hand darin meint ihn nicht', () => {
    const inside = lockerInteraction(true);
    expect(resolveInteraction(inside, 'vr').interactive).toBe(false);
    expect(pickHandUse([find('touch', inside)])).toBeNull();
    expect(resolveInteraction(lockerInteraction(false), 'vr').interactive).toBe(true);
  });

  test('hinaus mit Trigger oder Greif-Taste einer freien Hand', () => {
    const idle = { trigger: false, grip: false, free: true };
    expect(lockerExitPress([idle, { ...idle, trigger: true }], true)).toBe(true);
    expect(lockerExitPress([{ ...idle, grip: true }], true)).toBe(true);
    expect(lockerExitPress([idle, idle], true)).toBe(false);
  });

  test('nicht im Bild des Einstiegs — derselbe Druck führt nicht gleich hinaus', () => {
    expect(lockerExitPress([{ trigger: true, grip: false, free: true }], false)).toBe(false);
  });

  test('der Trigger einer Hand mit Lampe bleibt der Lampe', () => {
    expect(lockerExitPress([{ trigger: true, grip: true, free: false }], true)).toBe(false);
  });
});

describe('der Laser', () => {
  test('geht nur bei einer freien Hand durch den Schrank', () => {
    const free = (hand: 'left' | 'right'): boolean => hand === 'left';
    expect(shipRayPasses('left', free)).toBe(true);
    expect(shipRayPasses('right', free)).toBe(false);
  });

  test('der Schirm zielt weiter wie bisher', () => {
    expect(shipRayPasses(null, () => true)).toBe(false);
  });
});
