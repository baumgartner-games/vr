import {
  SLAM_HOLD,
  chooseLock,
  freshLocks,
  releaseLock,
  slamDoor,
  slamUntil,
  stepLocks,
  toggleLock,
} from './doorLocks';

describe('doorLocks', () => {
  test('gewollt gesperrt ist immer nur eine Tür — die zweite gibt die erste frei', () => {
    const locks = freshLocks();
    let shut = chooseLock(locks, [], 'd1');
    expect(shut).toEqual(['d1']);
    shut = chooseLock(locks, shut, 'd2');
    expect(shut).toEqual(['d2']);
    expect(locks.chosen).toBe('d2');
  });

  test('eine zugefallene Tür bleibt, wenn die Tafel eine andere wählt', () => {
    const locks = freshLocks();
    let shut = slamDoor(locks, [], 'slammed', 10);
    shut = chooseLock(locks, shut, 'chosen');
    expect(shut.sort()).toEqual(['chosen', 'slammed']);
    shut = chooseLock(locks, shut, 'other');
    expect(shut.sort()).toEqual(['other', 'slammed']);
  });

  test('zugefallene Türen gehen nach SLAM_HOLD Sekunden von selbst auf', () => {
    const locks = freshLocks();
    let shut = slamDoor(locks, [], 'a', 5);
    expect(slamUntil(locks, 'a')).toBe(5 + SLAM_HOLD);
    expect(stepLocks(locks, shut, 5 + SLAM_HOLD - 0.1).opened).toEqual([]);
    const step = stepLocks(locks, shut, 5 + SLAM_HOLD);
    expect(step.opened).toEqual(['a']);
    expect(step.shut).toEqual([]);
    shut = step.shut;
    expect(slamUntil(locks, 'a')).toBeNull();
  });

  test('eine gewählte Tür läuft nie ab; wird eine zugefallene gewählt, auch nicht mehr', () => {
    const locks = freshLocks();
    let shut = chooseLock(locks, [], 'a');
    expect(stepLocks(locks, shut, 1e6).shut).toEqual(['a']);
    shut = slamDoor(locks, shut, 'b', 0);
    shut = chooseLock(locks, shut, 'b');
    expect(shut).toEqual(['b']);
    expect(slamUntil(locks, 'b')).toBeNull();
    expect(stepLocks(locks, shut, 1e6).shut).toEqual(['b']);
  });

  test('die Tafel darf eine zugefallene Tür vorher freigeben', () => {
    const locks = freshLocks();
    let shut = slamDoor(locks, [], 'a', 0);
    shut = releaseLock(locks, shut, 'a');
    expect(shut).toEqual([]);
    expect(locks.slams).toEqual([]);
  });

  test('der Schalter: zu wenn offen, auf wenn zu', () => {
    const locks = freshLocks();
    const first = toggleLock(locks, [], 'a');
    expect(first).toEqual({ shut: ['a'], locked: true });
    const second = toggleLock(locks, first.shut, 'a');
    expect(second).toEqual({ shut: [], locked: false });
  });

  test('Buchführung räumt auf, was anderswo geöffnet wurde', () => {
    const locks = freshLocks();
    let shut = chooseLock(locks, [], 'a');
    shut = slamDoor(locks, shut, 'b', 0);
    // Holz splittert: jemand hat beide ohne die Buchführung geöffnet.
    const step = stepLocks(locks, [], 1);
    expect(step).toEqual({ shut: [], opened: [] });
    expect(locks.chosen).toBe('');
    expect(locks.slams).toEqual([]);
    expect(shut.length).toBe(2);
  });

  test('zweimal zufallen verlängert nicht, und eine offene Tür zufallen lassen fügt sie hinzu', () => {
    const locks = freshLocks();
    let shut = slamDoor(locks, [], 'a', 0);
    shut = slamDoor(locks, shut, 'a', 10);
    expect(shut).toEqual(['a']);
    expect(slamUntil(locks, 'a')).toBe(SLAM_HOLD);
  });
});
