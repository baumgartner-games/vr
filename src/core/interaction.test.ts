import {
  DEFAULT_INTERACTION,
  INTERACTION_DEFAULTS,
  INTERACTION_KINDS,
  INTERACTION_VIEWS,
  inputLabel,
  interactionHint,
  interactionGrab,
  interactionKind,
  interactionSpec,
  interactionView,
  resolveInteraction,
  vrInputs,
  type InteractionKind,
  type InteractionView,
} from './interaction';
import { DEFAULT_GRAB, rimHandles } from './grabHandles';
import { bindKey, bindPad, defaultInputConfig } from './inputMap';

/**
 * Sechs Fälle — drei Ansichten mal zwei Absichten — und die Ausnahmen darüber.
 * Alles ohne three.js, ohne Browser und ohne Headset: Genau dafür ist das
 * Modul rein.
 */

const KINDS: readonly InteractionKind[] = ['press', 'grab'];

describe('what a thing wants, per view', () => {
  it('presses with A and E from above — exactly as before', () => {
    const press = resolveInteraction('press', 'topDown');
    expect(press.inputs).toEqual(['useButton', 'useKey']);
    expect(press.press).toBe('tap');
    expect(press.hint).toBe('A / E');
  });

  it('grabs from above with the very same button', () => {
    const grab = resolveInteraction('grab', 'topDown');
    expect(grab.inputs).toEqual(resolveInteraction('press', 'topDown').inputs);
    expect(grab.press).toBe('tap');
    expect(grab.hint).toBe('A / E');
  });

  it('offers mouse or E in first person, for both kinds', () => {
    for (const kind of KINDS) {
      const resolved = resolveInteraction(kind, 'firstPerson');
      expect(resolved.inputs).toEqual(['pointer', 'useKey']);
      expect(resolved.press).toBe('tap');
      expect(resolved.hint).toBe('Linke Maustaste / E');
    }
  });

  it('takes a hand or a trigger for a button in VR', () => {
    const press = resolveInteraction('press', 'vr');
    expect(press.inputs).toEqual(['handTouch', 'aimTrigger']);
    expect(press.press).toBe('tap');
    expect(press.hint).toBe('Berühren / Trigger');
  });

  it('holds the grab button in VR — the one place where holding matters', () => {
    const grab = resolveInteraction('grab', 'vr');
    expect(grab.inputs).toEqual(['grip']);
    expect(grab.press).toBe('hold');
    expect(grab.hint).toBe('Greifen halten');
  });

  it('is interactive wherever there is an input', () => {
    for (const kind of KINDS) {
      for (const view of INTERACTION_VIEWS) {
        expect(resolveInteraction(kind, view).interactive).toBe(true);
      }
    }
  });
});

describe('nothing on offer', () => {
  it('has no input, no hint and no seam in any view', () => {
    for (const view of INTERACTION_VIEWS) {
      const resolved = resolveInteraction('none', view);
      expect(resolved.inputs).toEqual([]);
      expect(resolved.hint).toBe('');
      expect(resolved.interactive).toBe(false);
    }
  });
});

describe('the default when a thing says nothing', () => {
  it('is a button', () => {
    expect(DEFAULT_INTERACTION).toBe('press');
    expect(interactionKind(undefined)).toBe('press');
    expect(interactionKind(null)).toBe('press');
    expect(interactionSpec(undefined)).toEqual({ kind: 'press' });
  });

  it('reads a bare kind as a spec without exceptions', () => {
    expect(interactionSpec('grab')).toEqual({ kind: 'grab' });
    expect(resolveInteraction('grab', 'vr')).toEqual(resolveInteraction({ kind: 'grab' }, 'vr'));
  });

  it('falls back to pressing for a kind nobody knows', () => {
    const bogus = { kind: 'sing' } as unknown as { kind: InteractionKind };
    expect(resolveInteraction(bogus, 'topDown').kind).toBe('press');
  });
});

describe('an exception for one thing in one view', () => {
  it('overrides only the field it names', () => {
    const held = resolveInteraction({ kind: 'press', views: { vr: { press: 'hold' } } }, 'vr');
    expect(held.press).toBe('hold');
    // Die Geber bleiben die der Ableitung — nur das Halten ist anders.
    expect(held.inputs).toEqual(['handTouch', 'aimTrigger']);
    expect(held.hint).toBe('Berühren / Trigger halten');
  });

  it('leaves the other views alone', () => {
    const spec = { kind: 'grab', views: { vr: { inputs: ['aimTrigger'] } } } as const;
    expect(resolveInteraction(spec, 'vr').inputs).toEqual(['aimTrigger']);
    expect(resolveInteraction(spec, 'topDown').inputs).toEqual(['useButton', 'useKey']);
  });

  it('switches a view off by taking away its inputs', () => {
    const resolved = resolveInteraction({ kind: 'press', views: { vr: { inputs: [] } } }, 'vr');
    expect(resolved.interactive).toBe(false);
    expect(resolved.hint).toBe('');
    // Die Absicht bleibt trotzdem stehen: Von oben ist das Ding ein Knopf.
    expect(resolved.kind).toBe('press');
    expect(
      resolveInteraction({ kind: 'press', views: { vr: { inputs: [] } } }, 'topDown').interactive,
    ).toBe(true);
  });

  it('takes a hint of its own when one is written down', () => {
    const spec = { kind: 'grab', views: { vr: { hint: 'Mit beiden Händen' } } } as const;
    expect(resolveInteraction(spec, 'vr').hint).toBe('Mit beiden Händen');
    expect(resolveInteraction(spec, 'topDown').hint).toBe('A / E');
  });

  it('shows an own hint even where nothing else would be offered', () => {
    const spec = { kind: 'none', views: { topDown: { hint: 'Erst aufschließen' } } } as const;
    const resolved = resolveInteraction(spec, 'topDown');
    expect(resolved.hint).toBe('Erst aufschließen');
    expect(resolved.interactive).toBe(false);
  });
});

describe('the hint reads the bindings people actually set', () => {
  it('follows a rebound use key', () => {
    const config = bindKey(defaultInputConfig(), 'use', 'KeyF');
    expect(interactionHint('press', 'firstPerson', { config })).toBe('Linke Maustaste / F');
    expect(inputLabel('useKey', { config })).toBe('F');
  });

  it('spells out a key that has no letter of its own', () => {
    const config = bindKey(defaultInputConfig(), 'use', 'Space');
    expect(inputLabel('useKey', { config })).toBe('Leertaste');
  });

  it('follows a rebound pad slot once the brand is known', () => {
    const config = bindPad(defaultInputConfig(), 'use', 'face-up');
    expect(inputLabel('useButton', { config, padKind: 'xbox' })).toBe('Y');
    expect(inputLabel('useButton', { config, padKind: 'playstation' })).toBe('△ (Dreieck)');
  });

  it('calls the button A as long as no brand is known — that is what the glass says', () => {
    expect(inputLabel('useButton')).toBe('A');
    expect(inputLabel('useButton', { padKind: 'xbox' })).toBe('A');
    expect(inputLabel('useButton', { padKind: 'playstation' })).toBe('✕ (Kreuz)');
  });

  it('says so when an action has no giver left', () => {
    const config = { ...defaultInputConfig(), keys: { use: [] }, pad: { use: [] } };
    expect(inputLabel('useKey', { config })).toBe('keine Taste');
    expect(inputLabel('useButton', { config })).toBe('kein Knopf');
  });

  it('names the devices that nobody can rebind', () => {
    expect(inputLabel('pointer')).toBe('Linke Maustaste');
    expect(inputLabel('handTouch')).toBe('Berühren');
    expect(inputLabel('aimTrigger')).toBe('Trigger');
    expect(inputLabel('grip')).toBe('Greifen');
  });
});

describe('which view is running', () => {
  it('is the headset whenever there is a session', () => {
    expect(interactionView(true, true)).toBe('vr');
    expect(interactionView(false, true)).toBe('vr');
  });

  it('is top down or first person on the screen', () => {
    expect(interactionView(true, false)).toBe('topDown');
    expect(interactionView(false, false)).toBe('firstPerson');
  });
});

describe('the table itself', () => {
  it('has a line for every kind in every view', () => {
    for (const kind of INTERACTION_KINDS) {
      for (const view of INTERACTION_VIEWS) {
        const control = INTERACTION_DEFAULTS[kind][view as InteractionView];
        expect(control).toBeDefined();
        expect(['tap', 'hold']).toContain(control.press);
      }
    }
  });

  it('carries view and kind through to the result', () => {
    for (const kind of INTERACTION_KINDS) {
      for (const view of INTERACTION_VIEWS) {
        const resolved = resolveInteraction(kind, view);
        expect(resolved.kind).toBe(kind);
        expect(resolved.view).toBe(view);
      }
    }
  });
});

/**
 * **Die zweite Hälfte der Auskunft eines Dings**: nicht nur *ob* man es nimmt,
 * sondern *wo* und *von wo aus* (`core/grabHandles.ts`). Sie hängt als Feld an
 * derselben `InteractionSpec` — ein zweites System daneben hätte eine zweite
 * Liste, und die liefe auseinander.
 */
describe('was ein Ding über das Greifen sagt', () => {
  it('gibt ohne Angabe die Vorgabe her — also alles wie vorher', () => {
    expect(interactionGrab(undefined)).toEqual(DEFAULT_GRAB);
    expect(interactionGrab('grab')).toEqual(DEFAULT_GRAB);
    expect(interactionGrab({ kind: 'grab' }).reach).toBe('all');
  });

  it('reicht Griffe und Reichweite durch', () => {
    const spec = {
      kind: 'grab',
      grab: { handles: rimHandles({ x: 0.5, z: 0.5 }), reach: 'moore' },
    };
    expect(interactionGrab(spec as never).handles).toHaveLength(4);
    expect(interactionGrab(spec as never).reach).toBe('moore');
  });

  /**
   * `vrInputs` ist `resolveInteraction(…, 'vr').inputs` ohne den Hinweistext:
   * Die Hand fragt das je Bild für jedes Ding in der Nähe, und eine
   * Zeichenkette, die dabei entsteht und weggeworfen wird, merkt man in der
   * Brille.
   */
  it('nennt die Geber der Brille ohne den Satz daneben', () => {
    for (const kind of INTERACTION_KINDS) {
      expect(vrInputs(kind)).toEqual(resolveInteraction(kind, 'vr').inputs);
    }
    expect(vrInputs({ kind: 'press', views: { vr: { inputs: ['grip'] } } })).toEqual(['grip']);
  });
});
