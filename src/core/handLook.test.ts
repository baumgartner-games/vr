/**
 * Das Handmodell als Einstellung: gespeichert, geklemmt, und wer zuhört,
 * erfährt vom Wechsel.
 */

const store = new Map<string, string>();

beforeAll(() => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
});

import {
  DEFAULT_HAND_LOOK,
  HAND_LOOKS,
  handLook,
  handLookLabel,
  nextHandLook,
  onHandLookChange,
  saveHandLook,
} from './handLook';

beforeEach(() => store.clear());

describe('das Handmodell', () => {
  it('ist ab Werk der Handschuh — er ist der Grund für die Wahl', () => {
    expect(DEFAULT_HAND_LOOK).toBe('glove');
    expect(handLook()).toBe('glove');
  });

  it('wechselt zwischen genau zwei Modellen, hin und zurück', () => {
    expect(HAND_LOOKS).toEqual(['box', 'glove']);
    expect(nextHandLook('glove')).toBe('box');
    expect(nextHandLook('box')).toBe('glove');
    expect(handLookLabel('box')).toBe('Boxhand');
    expect(handLookLabel('glove')).toBe('Weißer Handschuh');
  });

  it('merkt sich die Wahl und sagt es weiter', () => {
    let heard = 0;
    const stop = onHandLookChange(() => heard++);
    expect(saveHandLook('box')).toBe('box');
    expect(handLook()).toBe('box');
    expect(heard).toBe(1);
    stop();
    saveHandLook('glove');
    expect(heard).toBe(1);
  });

  it('fällt bei Unsinn im Speicher auf die Vorgabe zurück', () => {
    store.set('bgvr.handLook', 'tentacle');
    expect(handLook()).toBe(DEFAULT_HAND_LOOK);
    expect(saveHandLook('claw' as never)).toBe(DEFAULT_HAND_LOOK);
  });
});
