import {
  HAND_USE_RANGE,
  handUseFires,
  handUseMemory,
  pickHandUse,
  type HandUseButtons,
  type HandUseFind,
} from './handUse';
import type { InteractionKind } from './interaction';

/**
 * Die Entscheidung hinter der Brille, ohne Brille: Welche Hand meint was, was
 * löst aus, und was darf ein zweites Mal auslösen.
 */

/** Ein Fund, kurz geschrieben. `item` ist ein Name, damit man ihn wiedererkennt. */
function find(
  item: string,
  reach: 'touch' | 'aim',
  distance: number,
  kind: InteractionKind = 'press',
): HandUseFind<string> {
  return { item, reach, distance, kind };
}

const NOTHING: HandUseButtons = { trigger: false, grip: false };
const TRIGGER: HandUseButtons = { trigger: true, grip: false };
const GRIP: HandUseButtons = { trigger: false, grip: true };

describe('which thing a hand means', () => {
  it('finds nothing in an empty room', () => {
    expect(pickHandUse([])).toBeNull();
  });

  it('lets touching beat pointing, however far in the hand is', () => {
    // Der Strahl liegt millimetergenau auf dem Knopf, die Hand steckt gerade
    // eben in der Kiste — und trotzdem gilt die Hand.
    const picked = pickHandUse([find('button', 'aim', 0.01), find('crate', 'touch', 0.08)]);
    expect(picked?.item).toBe('crate');
  });

  it('takes the deepest of several touched things', () => {
    const picked = pickHandUse([find('near', 'touch', 0.07), find('deep', 'touch', -0.02)]);
    expect(picked?.item).toBe('deep');
  });

  it('takes the nearest of several aimed at', () => {
    const picked = pickHandUse([find('far', 'aim', 2.4), find('close', 'aim', 0.9)]);
    expect(picked?.item).toBe('close');
  });

  it('skips what has nothing on offer', () => {
    expect(pickHandUse([find('locked', 'touch', 0, 'none')])).toBeNull();
    // Und es nimmt auch nicht den Platz des Nächstbesten weg.
    const picked = pickHandUse([find('locked', 'touch', 0, 'none'), find('button', 'aim', 1)]);
    expect(picked?.item).toBe('button');
  });
});

describe('a button in VR', () => {
  it('goes off when the hand reaches into it', () => {
    expect(handUseFires(find('button', 'touch', 0), NOTHING, null)).toBe(true);
  });

  it('does not go off again while the hand stays inside', () => {
    const inside = find('button', 'touch', 0);
    expect(handUseFires(inside, NOTHING, 'button')).toBe(false);
  });

  it('goes off again once the hand has been out and back in', () => {
    const inside = find('button', 'touch', 0);
    // Draußen: die Erinnerung fällt …
    expect(handUseMemory(null)).toBeNull();
    // … und beim Hineinfassen antwortet es wieder.
    expect(handUseFires(inside, NOTHING, null)).toBe(true);
  });

  it('answers the trigger even while the hand already lies inside', () => {
    // Wer die Hand liegen lässt und dann drückt, drückt ausdrücklich.
    expect(handUseFires(find('button', 'touch', 0), TRIGGER, 'button')).toBe(true);
  });

  it('answers the trigger when the ray is on it', () => {
    expect(handUseFires(find('button', 'aim', 1.2), TRIGGER, null)).toBe(true);
  });

  it('stays quiet when the ray only rests on it', () => {
    // Zeigen allein drückt nichts — sonst bediente jeder Blick quer durch die
    // Küche etwas.
    expect(handUseFires(find('button', 'aim', 1.2), NOTHING, null)).toBe(false);
  });

  it('is not pressed by the grab button', () => {
    expect(handUseFires(find('button', 'touch', 0), GRIP, 'button')).toBe(false);
    expect(handUseFires(find('button', 'aim', 1), GRIP, null)).toBe(false);
  });
});

describe('something to grab in VR', () => {
  const bun = find('bun', 'touch', 0.02, 'grab');
  const potOverThere = find('pot', 'aim', 1.4, 'grab');

  it('comes with the grab button — the same one every prop uses', () => {
    expect(handUseFires(bun, GRIP, null)).toBe(true);
    expect(handUseFires(potOverThere, GRIP, null)).toBe(true);
  });

  it('does not jump onto the trigger', () => {
    // Der Trigger gehört dem, was man in der Hand hält.
    expect(handUseFires(bun, TRIGGER, null)).toBe(false);
  });

  it('is not taken by merely reaching into it', () => {
    // Anders als ein Knopf: Ein Brötchen, das schon beim Hinlangen in der Hand
    // klebt, nimmt man nicht, man stolpert darüber.
    expect(handUseFires(bun, NOTHING, null)).toBe(false);
  });

  it('can be taken again right away — the grab button is its own edge', () => {
    expect(handUseFires(bun, GRIP, 'bun')).toBe(true);
  });
});

describe('nothing on offer', () => {
  it('never goes off, whatever is pressed', () => {
    const locked = find('locked', 'touch', 0, 'none');
    for (const buttons of [NOTHING, TRIGGER, GRIP]) {
      expect(handUseFires(locked, buttons, null)).toBe(false);
    }
  });

  it('is the same for an empty hand', () => {
    for (const buttons of [NOTHING, TRIGGER, GRIP]) {
      expect(handUseFires(null, buttons, null)).toBe(false);
    }
  });
});

describe('what a hand remembers until the next frame', () => {
  it('remembers what it reaches into', () => {
    expect(handUseMemory(find('button', 'touch', 0))).toBe('button');
  });

  it('forgets as soon as it only points', () => {
    expect(handUseMemory(find('button', 'aim', 1))).toBeNull();
  });

  it('forgets when it finds nothing at all', () => {
    expect(handUseMemory(null)).toBeNull();
  });

  /**
   * Der Fall, der die Küche sonst in eine Schleife schickt: Die Ausgabe gibt
   * ein Brötchen und will im nächsten Augenblick etwas entgegennehmen — die
   * Hand liegt unverändert darin. Erinnert wird deshalb das **Ding**, nicht
   * das, was es gerade vorhat.
   */
  it('keeps the same thing across a change of what it wants', () => {
    const before = handUseMemory(find('counter', 'touch', 0, 'grab'));
    const after = find('counter', 'touch', 0, 'press');
    expect(handUseFires(after, NOTHING, before)).toBe(false);
  });
});

describe('how far pointing reaches', () => {
  it('stays inside a room and not across a hall', () => {
    // Die neun Meter des Ferngreifens sind für Gegenstände, die man sich holt.
    expect(HAND_USE_RANGE).toBeLessThan(9);
    expect(HAND_USE_RANGE).toBeGreaterThan(1);
  });
});
