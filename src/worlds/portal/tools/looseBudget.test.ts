import { overBudget, type LooseEntry } from './looseBudget';

const loose = (home: string | null, value: string): LooseEntry<string> => ({
  home,
  spare: true,
  value,
});
const held = (home: string | null, value: string): LooseEntry<string> => ({
  home,
  spare: false,
  value,
});

describe('overBudget', () => {
  it('leaves a single copy per slot alone', () => {
    expect(overBudget([loose('left', 'a'), loose('right', 'b')], 1)).toEqual([]);
  });

  it('is the reason both weapons survive being thrown down', () => {
    // Links und rechts je eine Waffe, beide fallen gelassen: zwei draußen,
    // aber von zwei verschiedenen Hüften — keine davon ist zu viel.
    const entries = [loose('left', 'links'), loose('right', 'rechts')];
    expect(overBudget(entries, 1)).toEqual([]);
  });

  it('takes the oldest copy of the same slot back', () => {
    const entries = [loose('left', 'alt'), loose('left', 'neu')];
    expect(overBudget(entries, 1)).toEqual(['alt']);
  });

  it('counts a held copy but never takes it away', () => {
    const entries = [loose('left', 'liegt'), held('left', 'in der hand')];
    expect(overBudget(entries, 1)).toEqual(['liegt']);
  });

  it('gives up when every copy over the limit is in a hand', () => {
    const entries = [held('left', 'eine'), held('left', 'zwei')];
    expect(overBudget(entries, 1)).toEqual([]);
  });

  it('lets five stars fly per hip', () => {
    const left = ['a', 'b', 'c', 'd', 'e'].map((id) => loose('left', id));
    const right = ['f', 'g'].map((id) => loose('right', id));
    expect(overBudget([...left, ...right], 5)).toEqual([]);
    expect(overBudget([...left, loose('left', 'sechster'), ...right], 5)).toEqual(['a']);
  });

  it('keeps copies that never came off a hip in a pot of their own', () => {
    const entries = [loose(null, 'regal'), loose('left', 'hüfte')];
    expect(overBudget(entries, 1)).toEqual([]);
  });

  it('drops several at once when the limit shrinks below the count', () => {
    const entries = [loose('left', 'a'), loose('left', 'b'), loose('left', 'c')];
    expect(overBudget(entries, 1)).toEqual(['a', 'b']);
  });
});
