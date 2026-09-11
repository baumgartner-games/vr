import { freshGlitch, stepGlitch, GLITCH_HOLD, GLITCH_RANGE } from './doorGlitch';

/**
 * **Die Tür, die von selbst aufgeht.**
 *
 * Geprüft wird, was der Auftrag verlangt: Sie kommt vor, sie bleibt nur kurz,
 * sie ist **nie** eine gesperrte Tür — und sie fährt nichts zu, sondern nur
 * auf. Wer das Blatt zumacht, ist die Mechanik der automatischen Türen, und
 * die lässt niemanden darunter (`automaticDoors.ts`, `occupants`).
 */
describe('doorGlitch', () => {
  const doors = ['d0', 'd1', 'd2', 'd3'];
  /** Ein Würfel, der immer dieselbe Zahl gibt — damit der Test rechnen kann. */
  const fixed = (value: number) => (): number => value;

  test('lässt die erste Tür frühestens nach GLITCH_RANGE Sekunden auffahren', () => {
    const glitch = freshGlitch(fixed(0));
    expect(glitch.next).toBe(GLITCH_RANGE[0]);
    expect(stepGlitch(glitch, doors, GLITCH_RANGE[0] - 0.1, fixed(0))).toEqual({
      id: '',
      opened: '',
    });
    expect(stepGlitch(glitch, doors, GLITCH_RANGE[0], fixed(0))).toEqual({
      id: 'd0',
      opened: 'd0',
    });
  });

  test('hält sie nur GLITCH_HOLD Sekunden offen und meldet das Auffahren genau einmal', () => {
    const glitch = freshGlitch(fixed(0));
    const time = GLITCH_RANGE[0];
    stepGlitch(glitch, doors, time, fixed(0));
    // Dazwischen bleibt sie offen, ohne noch einmal „aufgefahren" zu melden.
    expect(stepGlitch(glitch, doors, time + GLITCH_HOLD[0] - 0.1, fixed(0))).toEqual({
      id: 'd0',
      opened: '',
    });
    expect(stepGlitch(glitch, doors, time + GLITCH_HOLD[0], fixed(0))).toEqual({
      id: '',
      opened: '',
    });
  });

  /**
   * **Der Riegel ist die eine Entscheidung der Tafel.** Ein Stationsfehler,
   * der ihn aufhebt, nähme ihr das Einzige, was sie hat — deshalb bekommt die
   * Rechnung nur offene Türen zu sehen, und eine, die mitten in der Störung
   * gesperrt wird, ist sofort keine mehr.
   */
  test('öffnet nie eine gesperrte Tür und gibt eine auf, die gesperrt wird', () => {
    const glitch = freshGlitch(fixed(0));
    let time = GLITCH_RANGE[0];
    // Nur `d3` ist offen — also kann nur `d3` aufgehen, egal wie der Würfel fällt.
    expect(stepGlitch(glitch, ['d3'], time, fixed(0)).opened).toBe('d3');
    time += 0.1;
    expect(stepGlitch(glitch, [], time, fixed(0))).toEqual({ id: '', opened: '' });
  });

  test('bleibt still, solange keine einzige Tür offen ist — und holt es nicht nach', () => {
    const glitch = freshGlitch(fixed(0));
    expect(stepGlitch(glitch, [], GLITCH_RANGE[0], fixed(0))).toEqual({ id: '', opened: '' });
    // Die Frist läuft trotzdem weiter: Sonst käme in der Sekunde, in der die
    // erste Tür wieder frei wird, sofort eine Störung.
    expect(stepGlitch(glitch, doors, GLITCH_RANGE[0] + 0.1, fixed(0))).toEqual({
      id: '',
      opened: '',
    });
  });

  test('würfelt über alle offenen Türen und trifft mit der Zeit jede', () => {
    const glitch = freshGlitch(fixed(0));
    const seen = new Set<string>();
    let seed = 7;
    const roll = (): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let time = 0; time < 4000; time += 0.5) {
      const out = stepGlitch(glitch, doors, time, roll);
      if (out.opened) seen.add(out.opened);
    }
    expect([...seen].sort()).toEqual(doors);
  });
});
