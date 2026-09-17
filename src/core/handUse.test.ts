import {
  HAND_TAP_METRES,
  HAND_TAP_SECONDS,
  HAND_USE_RANGE,
  beginGripPress,
  betterHandUse,
  gripPressDrops,
  gripPressKind,
  gripPressTook,
  handUseFires,
  handUseMemory,
  leadHandUse,
  pickHandUse,
  stepGripPress,
  type GripPress,
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

  /**
   * **Und der Trigger tut es auch.** Hier stand das Gegenteil: „Der Trigger
   * gehört dem, was man in der Hand hält." Er gehört ihm weiter — der
   * Feuerlöscher spritzt mit ihm —, nur schließt das nicht mehr aus, dass er
   * auch nimmt, was man anzielt (`core/interaction.INTERACTION_DEFAULTS`).
   */
  it('also comes with the trigger, on whatever the ray is on', () => {
    expect(handUseFires(bun, TRIGGER, null)).toBe(true);
    expect(handUseFires(potOverThere, TRIGGER, null)).toBe(true);
  });

  /**
   * **Ein Ding, das nur die Greif-Taste anmeldet, bleibt beim Trigger stumm.**
   * Das ist der Unterschied zwischen „jeder Geber für sich" und „irgendeine
   * Taste tut es": Das getragene Möbel im Umbau wendet sich mit dem Trigger
   * (`zones/kitchen.buildTurn`) und darf ihn deshalb nicht auch zum Aufheben
   * haben.
   */
  it('stays with the grab button where only that one is asked for', () => {
    const piece = { ...bun, inputs: ['grip'] as const };
    expect(handUseFires(piece, GRIP, null)).toBe(true);
    expect(handUseFires(piece, TRIGGER, null)).toBe(false);
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

/**
 * **Die Ausnahme eines einzelnen Dings** (`HandUseFind.inputs`).
 *
 * Eine Arbeitsplatte, auf die man etwas ablegt, ist von oben ein `press` und
 * in der Brille trotzdem die Greif-Taste: Abgelegt wird beim **Loslassen** und
 * nicht beim Hinlangen. Ohne diese Zeile stellte man den Topf ab, sobald man
 * mit ihm daran vorbeikommt — genau der gemeldete Fehler.
 */
describe('womit ein Ding in der Brille ausgelöst wird', () => {
  it('lässt die Ableitung gelten, solange nichts anderes dasteht', () => {
    expect(handUseFires(find('button', 'touch', 0), NOTHING, null)).toBe(true);
    expect(handUseFires(find('bun', 'touch', 0, 'grab'), NOTHING, null)).toBe(false);
    expect(handUseFires(find('bun', 'touch', 0, 'grab'), GRIP, null)).toBe(true);
  });

  it('gibt eine Fläche, die etwas aus der Hand nimmt, der Greif-Taste', () => {
    const counter: HandUseFind<string> = {
      item: 'counter',
      reach: 'touch',
      distance: 0,
      kind: 'press',
      inputs: ['grip'],
    };
    // Hinlangen tut nichts — auch nicht beim ersten Hineinfassen.
    expect(handUseFires(counter, NOTHING, null)).toBe(false);
    // Und der Trigger ebenso wenig: Er gehört dem, was in der Hand liegt.
    expect(handUseFires(counter, TRIGGER, null)).toBe(false);
    expect(handUseFires(counter, GRIP, null)).toBe(true);
  });

  it('lässt ein Ding auch nur zeigen oder nur berühren wollen', () => {
    const touchOnly: HandUseFind<string> = {
      item: 'plate',
      reach: 'aim',
      distance: 1,
      kind: 'press',
      inputs: ['handTouch'],
    };
    expect(handUseFires(touchOnly, TRIGGER, null)).toBe(false);
    expect(handUseFires({ ...touchOnly, reach: 'touch', distance: 0 }, NOTHING, null)).toBe(true);
  });
});

/**
 * **Halten oder Tippen** — die zwei Greif-Arten, beide gültig, ohne dass man
 * sich vorher für eine entscheidet.
 */
describe('Halten oder Tippen', () => {
  /** Ein Druck, der `seconds` lang liegt und dabei `metres` weit kommt. */
  function press(seconds: number, metres: number): GripPress {
    let grab = beginGripPress();
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      grab = stepGripPress(grab, seconds / steps, (metres * i) / steps);
    }
    return grab;
  }

  it('nennt den kurzen, stillen Klick ein Tippen', () => {
    expect(gripPressKind(beginGripPress())).toBe('tap');
    expect(gripPressKind(press(0.12, 0.01))).toBe('tap');
  });

  it('nennt die liegende Taste ein Halten, auch ohne jede Bewegung', () => {
    // Wer drückt und überlegt, wohin, hat sich keinen Millimeter bewegt — und
    // meint trotzdem „halten".
    expect(gripPressKind(press(1.2, 0))).toBe('hold');
    expect(HAND_TAP_SECONDS).toBeLessThan(1);
  });

  it('nennt den kurzen Zug quer über die Platte ein Halten', () => {
    // Topf packen, dreißig Zentimeter schieben, loslassen: unter einer
    // Drittelsekunde, und ganz sicher ein Ablegen.
    expect(gripPressKind(press(0.2, 0.3))).toBe('hold');
    expect(HAND_TAP_METRES).toBeLessThan(0.3);
  });

  it('misst die größte Auslenkung und nicht die letzte', () => {
    let grab = beginGripPress();
    grab = stepGripPress(grab, 0.05, 0.4);
    grab = stepGripPress(grab, 0.05, 0);
    // Ausgeholt und zurück ist bewegt.
    expect(gripPressKind(grab)).toBe('hold');
  });

  it('legt beim Loslassen nur ab, wenn dieser Druck etwas genommen hat', () => {
    const held = press(0.8, 0.5);
    // Ein Druck ins Leere: nichts genommen, nichts abzulegen.
    expect(gripPressDrops(held)).toBe(false);
    expect(gripPressDrops(gripPressTook(held))).toBe(true);
    expect(gripPressDrops(null)).toBe(false);
  });

  /**
   * **Der ganze Weg des Auftrags**, einmal für jede der beiden Arten:
   *
   * - *Halten*: drücken (nehmen), durch die Küche laufen, loslassen (ablegen).
   * - *Tippen*: drücken und loslassen (nehmen, bleibt in der Hand), später
   *   erneut drücken (ablegen).
   */
  it('trennt den Weg des Haltens vom Weg des Tippens', () => {
    const holding = gripPressTook(press(2, 1.4));
    expect(gripPressDrops(holding)).toBe(true);

    const tapping = gripPressTook(press(0.1, 0.02));
    // Loslassen legt nichts ab — das Ding bleibt in der Hand.
    expect(gripPressDrops(tapping)).toBe(false);
    // Abgelegt wird beim nächsten Druck, und der ist ein `justPressed`; dass
    // eine Fläche darauf antwortet, steht oben.
    expect(gripPressKind(tapping)).toBe('tap');
  });
});

/**
 * **Welche der beiden Hände den Saum führt** — die Regel, mit der der gelbe
 * Saum in der Brille aufhört, zwischen den Händen hin und her zu springen
 * (`core/handUse.leadHandUse`, `worlds/portal/PortalWorld.showUse`).
 */
describe('Welche Hand den Saum führt', () => {
  /** Ein Fund, so viel wie die Rangfolge davon braucht. */
  const reached = (item: string, reach: 'touch' | 'aim', distance: number) => ({
    item,
    reach,
    distance,
  });

  it('nimmt ohne führende Hand den besseren der beiden Funde', () => {
    const left = reached('regal', 'aim', 2.5);
    const right = reached('tresen', 'aim', 0.4);
    expect(leadHandUse(left, right, null)).toBe(right);
    expect(leadHandUse(left, null, null)).toBe(left);
    expect(leadHandUse(null, null, null)).toBeNull();
  });

  it('lässt Anfassen vor Zeigen gehen, auch über beide Hände hinweg', () => {
    const left = reached('schublade', 'touch', 0.9);
    const right = reached('tuer', 'aim', 0.1);
    expect(betterHandUse(left, right)).toBe(left);
    expect(betterHandUse(right, left)).toBe(left);
  });

  it('bleibt bei gleichem Abstand beim ersten Fund — der Saum soll nicht flackern', () => {
    const left = reached('a', 'aim', 1);
    const right = reached('b', 'aim', 1);
    expect(betterHandUse(left, right)).toBe(left);
  });

  it('gibt der führenden Hand den Vorrang, auch wenn die andere näher dran ist', () => {
    // Genau der gemeldete Fall: Die Pfanne liegt links, die freie Rechte
    // streift im Vorbeigehen eine Arbeitsplatte.
    const left = reached('herd', 'aim', 2.8);
    const right = reached('arbeitsplatte', 'touch', 0.05);
    expect(leadHandUse(left, right, 'left')).toBe(left);
    expect(leadHandUse(left, right, 'right')).toBe(right);
  });

  it('fällt auf den besseren Fund zurück, wenn die führende Hand ins Leere zeigt', () => {
    const right = reached('tresen', 'aim', 1.2);
    expect(leadHandUse(null, right, 'left')).toBe(right);
  });

  it('zeigt nichts, wenn keine der beiden Hände etwas meint', () => {
    expect(leadHandUse(null, null, 'right')).toBeNull();
  });
});
