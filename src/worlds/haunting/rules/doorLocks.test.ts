import {
  HOLD_RANGE,
  LOCK_COOLDOWN,
  PRY_COOLDOWN,
  SLAM_HOLD,
  chooseLock,
  freshLocks,
  holdUntil,
  pryChance,
  pryLock,
  pryTries,
  coolingUntil,
  lockBlock,
  LOCK_BLOCK_TEXT,
  mayLock,
  releaseLock,
  slamDoor,
  slamUntil,
  stepLocks,
  toggleLock,
} from './doorLocks';

describe('doorLocks', () => {
  /**
   * **Ein Riegel, eine Frist, und die nächste Entscheidung erst danach.**
   * Lange gab die zweite Wahl die erste frei und ein zweiter Tipp öffnete die
   * gehaltene Tür sofort — ein Schalter im Takt, und das Monster stand vor
   * einer Wand aus Riegeln, die man von Tür zu Tür trug. Der Besitzer wollte:
   * gehalten bis zum Ablauf, keine zweite Tür solange, und danach dieselbe
   * Tür erst einmal nicht wieder.
   */
  test('gewollt gesperrt ist immer nur eine Tür — die zweite wartet, bis die erste von selbst aufgeht', () => {
    const locks = freshLocks();
    let shut = chooseLock(locks, [], 'd1', 0, () => 0);
    expect(shut).toEqual(['d1']);
    // Eine zweite Tür: nichts passiert, und der Grund heißt „belegt".
    expect(lockBlock(locks, shut, 'd2', 1)).toBe('busy');
    expect(chooseLock(locks, shut, 'd2', 1)).toEqual(['d1']);
    expect(toggleLock(locks, shut, 'd2', 1)).toEqual({
      shut: ['d1'],
      locked: false,
      blocked: 'busy',
    });
    expect(locks.chosen).toBe('d1');
    // Die gehaltene selbst: auch nicht — sie fällt, wenn ihre Frist um ist.
    expect(lockBlock(locks, shut, 'd1', 1)).toBe('held');
    expect(toggleLock(locks, shut, 'd1', 1)).toEqual({
      shut: ['d1'],
      locked: true,
      blocked: 'held',
    });
    // Frist um: die Tür geht auf, die nächste darf zu — nur d1 ist noch warm.
    const step = stepLocks(locks, shut, HOLD_RANGE[0]);
    expect(step.opened).toEqual(['d1']);
    shut = step.shut;
    expect(lockBlock(locks, shut, 'd1', HOLD_RANGE[0])).toBe('cooling');
    expect(lockBlock(locks, shut, 'd2', HOLD_RANGE[0])).toBe('');
    expect(chooseLock(locks, shut, 'd2', HOLD_RANGE[0])).toEqual(['d2']);
    expect(locks.chosen).toBe('d2');
    // Und jeder Grund hat seinen Satz.
    for (const block of ['held', 'busy', 'cooling'] as const)
      expect(LOCK_BLOCK_TEXT[block].length).toBeGreaterThan(10);
  });

  test('eine zugefallene Tür bleibt, wenn die Tafel eine andere wählt — und darf freigegeben werden, während gehalten wird', () => {
    const locks = freshLocks();
    let shut = slamDoor(locks, [], 'slammed', 10);
    shut = chooseLock(locks, shut, 'chosen', 10);
    expect(shut.sort()).toEqual(['chosen', 'slammed']);
    // Eine dritte Tür wartet — die gehaltene hält sie auf, nicht die zugefallene.
    expect(chooseLock(locks, shut, 'other', 10).sort()).toEqual(['chosen', 'slammed']);
    // Die zugefallene gibt der Schalter trotzdem frei: Sie gehört dem Spuk, nicht dem Spieler.
    const out = toggleLock(locks, shut, 'slammed', 11);
    expect(out).toEqual({ shut: ['chosen'], locked: false, blocked: '' });
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

  test('der Schalter: zu wenn offen — und die gehaltene Tür gibt er nicht wieder her', () => {
    const locks = freshLocks();
    const first = toggleLock(locks, [], 'a', 0, () => 0);
    expect(first).toEqual({ shut: ['a'], locked: true, blocked: '' });
    const second = toggleLock(locks, first.shut, 'a', 1, () => 0);
    expect(second).toEqual({ shut: ['a'], locked: true, blocked: 'held' });
    expect(locks.chosen).toBe('a');
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

  describe('eine eben freigewordene Tür bleibt eine Weile frei', () => {
    test('die Tafel bekommt sie nicht sofort wieder zu', () => {
      const locks = freshLocks();
      let shut = chooseLock(locks, [], 'd1', 0, () => 0);
      // Die Zeit läuft ab, die Tür geht von selbst auf.
      const step = stepLocks(locks, shut, HOLD_RANGE[0]);
      shut = step.shut;
      expect(step.opened).toEqual(['d1']);
      expect(mayLock(locks, 'd1', HOLD_RANGE[0])).toBe(false);
      // Sofort wieder wählen: passiert nichts.
      expect(chooseLock(locks, shut, 'd1', HOLD_RANGE[0], () => 0)).toEqual([]);
      expect(locks.chosen).toBe('');
      // Eine andere Tür geht selbstverständlich weiter.
      expect(chooseLock(locks, shut, 'd2', HOLD_RANGE[0], () => 0)).toEqual(['d2']);
    });

    test('nach LOCK_COOLDOWN Sekunden geht sie wieder', () => {
      const locks = freshLocks();
      let shut = chooseLock(locks, [], 'd1', 0, () => 0);
      shut = stepLocks(locks, shut, HOLD_RANGE[0]).shut;
      const free = HOLD_RANGE[0] + LOCK_COOLDOWN;
      expect(mayLock(locks, 'd1', free - 0.1)).toBe(false);
      expect(mayLock(locks, 'd1', free)).toBe(true);
      expect(chooseLock(locks, shut, 'd1', free, () => 0)).toEqual(['d1']);
    });

    test('auch der Spuk schlägt dieselbe Tür nicht sofort noch einmal zu', () => {
      const locks = freshLocks();
      let shut = slamDoor(locks, [], 'd1', 0);
      shut = stepLocks(locks, shut, SLAM_HOLD).shut;
      expect(shut).toEqual([]);
      expect(slamDoor(locks, shut, 'd1', SLAM_HOLD)).toEqual([]);
      // Eine andere Tür darf er weiter zuwerfen.
      expect(slamDoor(locks, shut, 'd2', SLAM_HOLD)).toEqual(['d2']);
    });

    test('freigeben kühlt genauso ab wie ablaufen', () => {
      const locks = freshLocks();
      const shut = chooseLock(locks, [], 'd1', 0, () => 0);
      const open = releaseLock(locks, shut, 'd1', 3);
      expect(open).toEqual([]);
      expect(mayLock(locks, 'd1', 3)).toBe(false);
      expect(mayLock(locks, 'd1', 3 + LOCK_COOLDOWN)).toBe(true);
    });

    test('eine aufgezogene Sperre fällt nicht hinter dem Monster wieder zu', () => {
      const locks = freshLocks();
      let shut = chooseLock(locks, [], 'd1', 0, () => 0);
      // Der erste Zug geht nie auf, der zweite hier schon.
      pryLock(locks, shut, 'd1', 0, () => 0);
      const out = pryLock(locks, shut, 'd1', PRY_COOLDOWN, () => 0);
      expect(out.opened).toBe(true);
      shut = out.shut;
      expect(chooseLock(locks, shut, 'd1', PRY_COOLDOWN, () => 0)).toEqual([]);
    });

    test('der Schalter sagt, dass der Riegel noch warm ist', () => {
      const locks = freshLocks();
      let shut = chooseLock(locks, [], 'd1', 0, () => 0);
      shut = stepLocks(locks, shut, HOLD_RANGE[0]).shut;
      const blocked = toggleLock(locks, shut, 'd1', HOLD_RANGE[0], () => 0);
      expect(blocked).toEqual({ shut: [], locked: false, blocked: 'cooling' });
      const later = toggleLock(locks, shut, 'd1', HOLD_RANGE[0] + LOCK_COOLDOWN, () => 0);
      expect(later.locked).toBe(true);
      expect(later.blocked).toBe('');
    });

    /**
     * **Vierzig Sekunden, und nicht weniger.** Die Zahl ist der Kern der
     * Antwort auf „der Spieler sperrt das Monster ein": Nach jedem Aufziehen
     * und nach jeder abgelaufenen Sperre steht die Tür so lange offen, dass
     * das Vieh wirklich hindurch ist, bevor der nächste Riegel fallen darf.
     * Wer sie herunterdreht, dreht genau diese Regel zurück.
     */
    test('kühlt vierzig Sekunden ab, nach jedem Weg aus der Sperre heraus', () => {
      expect(LOCK_COOLDOWN).toBe(40);
      for (const [name, out] of [
        [
          'abgelaufen',
          () => {
            const locks = freshLocks();
            const shut = chooseLock(locks, [], 'd1', 0, () => 0);
            stepLocks(locks, shut, HOLD_RANGE[1]);
            return { locks, at: HOLD_RANGE[1] };
          },
        ],
        [
          'freigegeben',
          () => {
            const locks = freshLocks();
            const shut = chooseLock(locks, [], 'd1', 0, () => 0);
            releaseLock(locks, shut, 'd1', 5);
            return { locks, at: 5 };
          },
        ],
        [
          'aufgezogen',
          () => {
            const locks = freshLocks();
            const shut = chooseLock(locks, [], 'd1', 0, () => 0);
            pryLock(locks, shut, 'd1', 0, () => 0);
            pryLock(locks, shut, 'd1', PRY_COOLDOWN, () => 0);
            return { locks, at: PRY_COOLDOWN };
          },
        ],
      ] as const) {
        const { locks, at } = out();
        expect([name, coolingUntil(locks, 'd1')]).toEqual([name, at + LOCK_COOLDOWN]);
        expect([name, mayLock(locks, 'd1', at + LOCK_COOLDOWN - 0.1)]).toEqual([name, false]);
        expect([name, mayLock(locks, 'd1', at + LOCK_COOLDOWN)]).toEqual([name, true]);
      }
    });

    /**
     * **Freigeben darf man, was zugefallen ist — nicht, was man hält.** Die
     * Abkühlung sperrt nur das Zusperren; eine zugefallene Tür des Spuks gibt
     * der Schalter jederzeit frei. Die gehaltene Tür dagegen fällt erst mit
     * ihrer Frist: Ein Riegel, den man sofort wieder zöge, wäre keiner.
     */
    test('entriegeln bleibt jederzeit erlaubt — bei zugefallenen Türen; die gehaltene hält', () => {
      const locks = freshLocks();
      const slammed = slamDoor(locks, [], 'd1', 0);
      expect(toggleLock(locks, slammed, 'd1', 1, () => 0)).toEqual({
        shut: [],
        locked: false,
        blocked: '',
      });
      const shut = chooseLock(locks, [], 'd2', LOCK_COOLDOWN + 1, () => 0);
      expect(toggleLock(locks, shut, 'd2', LOCK_COOLDOWN + 2, () => 0)).toEqual({
        shut: ['d2'],
        locked: true,
        blocked: 'held',
      });
    });
  });
});
