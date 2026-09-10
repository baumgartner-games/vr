import {
  HOLD_RANGE,
  PRY_COOLDOWN,
  SLAM_HOLD,
  chooseLock,
  freshLocks,
  holdUntil,
  pryChance,
  pryLock,
  pryTries,
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

  test('eine von Hand gesperrte Tür hält acht bis zehn Sekunden und geht dann auf', () => {
    const locks = freshLocks();
    // Der Würfel bestimmt nur, wo in der Spanne die Frist liegt.
    for (const roll of [0, 0.5, 1]) {
      const fresh = freshLocks();
      chooseLock(fresh, [], 'a', 100, () => roll);
      expect(holdUntil(fresh, 'a')).toBeCloseTo(
        100 + HOLD_RANGE[0] + roll * (HOLD_RANGE[1] - HOLD_RANGE[0]),
      );
    }
    let shut = chooseLock(locks, [], 'a', 0, () => 0);
    expect(stepLocks(locks, shut, HOLD_RANGE[0] - 0.1).opened).toEqual([]);
    const step = stepLocks(locks, shut, HOLD_RANGE[0]);
    expect(step).toEqual({ shut: [], opened: ['a'] });
    // Eine zugefallene Tür, die dann gewählt wird, bekommt die Frist der Hand.
    shut = slamDoor(locks, [], 'b', 0);
    shut = chooseLock(locks, shut, 'b', 0, () => 0);
    expect(shut).toEqual(['b']);
    expect(slamUntil(locks, 'b')).toBeNull();
    expect(holdUntil(locks, 'b')).toBe(HOLD_RANGE[0]);
  });

  test('der erste Zug an einer Sperre geht nie auf, danach steigt die Aussicht', () => {
    expect(pryChance(1)).toBe(0);
    expect(pryChance(2)).toBeGreaterThan(0);
    for (let tries = 2; tries < 8; tries++)
      expect(pryChance(tries + 1)).toBeGreaterThanOrEqual(pryChance(tries));
    expect(pryChance(20)).toBe(1);

    const locks = freshLocks();
    let shut = chooseLock(locks, [], 'a', 0, () => 0);
    // Auch mit dem besten Wurf: der erste Zug bleibt ein Zug.
    let out = pryLock(locks, shut, 'a', 0, () => 0);
    expect(out).toEqual({ shut: ['a'], opened: false, tries: 1 });
    // Zu früh: gar kein Versuch, der Takt hält.
    out = pryLock(locks, out.shut, 'a', PRY_COOLDOWN / 2, () => 0);
    expect(out.tries).toBe(0);
    expect(pryTries(locks, 'a')).toBe(1);
    // Der zweite darf gelingen.
    out = pryLock(locks, out.shut, 'a', PRY_COOLDOWN, () => 0);
    expect(out).toEqual({ shut: [], opened: true, tries: 2 });
    expect(locks.chosen).toBe('');
    shut = out.shut;
    expect(shut).toEqual([]);
  });

  test('Ziehen lohnt sich: im Mittel schneller als das Warten', () => {
    // Der Handel des Monsters — sonst wäre Warten immer richtig und der Knopf
    // an der Tür nur Deko.
    let attempts = 0;
    let runs = 0;
    let seed = 12345;
    const roll = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let round = 0; round < 400; round++) {
      const locks = freshLocks();
      let shut = chooseLock(locks, [], 'a', 0, () => 0.5);
      let time = 0;
      for (let tries = 1; tries <= 20; tries++) {
        const out = pryLock(locks, shut, 'a', time, roll);
        shut = out.shut;
        time += PRY_COOLDOWN;
        attempts++;
        if (out.opened) break;
      }
      runs++;
    }
    const seconds = (attempts / runs) * PRY_COOLDOWN;
    expect(seconds).toBeLessThan(HOLD_RANGE[0]);
    // Und mindestens zwei Versuche sind es immer.
    expect(attempts / runs).toBeGreaterThanOrEqual(2);
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
    let shut = chooseLock(locks, [], 'a', 0, () => 0);
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
