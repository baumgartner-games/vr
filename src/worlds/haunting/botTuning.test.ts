import {
  DEFAULT_TUNING,
  MONSTER_FIELDS,
  TECHNICIAN_FIELDS,
  clampTuning,
  copyTuning,
  fieldText,
  loadTuning,
  saveTuning,
} from './botTuning';
import { MONSTERS, MONSTER_TOP_SPEED, PLAYER_SPRINT_SPEED, PLAYER_WALK_SPEED } from './mission';
import { paceSpeed } from './monsterRoutine';

describe('Die Gewichte der beiden Bots', () => {
  it('hält jede Zahl in ihren Grenzen und rastet sie ein', () => {
    const clamped = clampTuning({
      monster: { speed: 99, hearing: -4, guess: 0.5199 },
      technician: { walk: 0, sprint: 'schnell' },
    });
    expect(clamped.monster.speed).toBe(1.5);
    expect(clamped.monster.hearing).toBe(0.4);
    expect(clamped.monster.guess).toBe(0.5);
    expect(clamped.technician.walk).toBe(1.2);
    expect(clamped.technician.sprint).toBe(DEFAULT_TUNING.technician.sprint);
  });

  it('macht aus Unsinn die Voreinstellung statt eines Absturzes', () => {
    expect(clampTuning(null)).toEqual(DEFAULT_TUNING);
    expect(clampTuning('nein')).toEqual(DEFAULT_TUNING);
    expect(clampTuning({ monster: 7, technician: [] })).toEqual(DEFAULT_TUNING);
  });

  it('gibt eine Kopie heraus, die niemand mit dem Original teilt', () => {
    const copy = copyTuning(DEFAULT_TUNING);
    copy.monster.speed = 1.4;
    expect(DEFAULT_TUNING.monster.speed).not.toBe(1.4);
  });

  /**
   * Der Speicher darf kaputt sein, und er darf ganz fehlen: Ein privates
   * Fenster liefert für `localStorage` eine Ausnahme statt eines Objekts, und
   * daran soll keine Runde hängen.
   */
  it('überlebt einen kaputten und einen fehlenden Speicher', () => {
    const store = new Map<string, string>();
    const fake = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };
    saveTuning({ ...DEFAULT_TUNING, monster: { ...DEFAULT_TUNING.monster, speed: 1.25 } }, fake);
    expect(loadTuning(fake).monster.speed).toBe(1.25);
    store.set('haunting.botTuning.v1', '{kaputt');
    expect(loadTuning(fake)).toEqual(DEFAULT_TUNING);
    expect(loadTuning(null)).toEqual(DEFAULT_TUNING);
    expect(() => saveTuning(DEFAULT_TUNING, null)).not.toThrow();
  });

  it('beschriftet jedes Feld so, wie man es vorliest', () => {
    expect(fieldText(MONSTER_FIELDS[0]!, 1.25)).toBe('1.25 ×');
    expect(
      fieldText(
        MONSTER_FIELDS.find((f) => f.unit === '%')!,
        0.4,
      ),
    ).toBe('40 %');
    expect(
      fieldText(
        MONSTER_FIELDS.find((f) => f.unit === '')!,
        3,
      ),
    ).toBe('3');
  });

  it('gibt jedem Feld eine Voreinstellung innerhalb seiner Grenzen', () => {
    for (const field of MONSTER_FIELDS) {
      const value = DEFAULT_TUNING.monster[field.id];
      expect(value).toBeGreaterThanOrEqual(field.min);
      expect(value).toBeLessThanOrEqual(field.max);
    }
    for (const field of TECHNICIAN_FIELDS) {
      const value = DEFAULT_TUNING.technician[field.id];
      expect(value).toBeGreaterThanOrEqual(field.min);
      expect(value).toBeLessThanOrEqual(field.max);
    }
  });
});

/**
 * **Die eine Ungleichung, an der die ganze Verfolgung hängt.**
 *
 * Gehen ist zu langsam, Rennen ist schnell genug. Wer eine dieser beiden
 * Zahlen verstellt, bis sie sich kreuzen, baut entweder ein Monster, dem man
 * spazierend entkommt, oder eines, dem man gar nicht entkommt — und beides
 * merkt man erst nach zwanzig Minuten im Headset, wenn es niemand hier
 * nachrechnet.
 */
describe('Tempo von Monster und Spieler', () => {
  it('lässt jedes Monster schneller gehen als der Spieler geht', () => {
    for (const monster of MONSTERS) expect(monster.speed).toBeGreaterThan(PLAYER_WALK_SPEED);
  });

  it('lässt kein Monster so schnell werden wie ein rennender Spieler', () => {
    expect(MONSTER_TOP_SPEED).toBeLessThan(PLAYER_SPRINT_SPEED);
    for (const monster of MONSTERS)
      for (const field of MONSTER_FIELDS) {
        if (field.id !== 'speed' && field.id !== 'hunt') continue;
        const extreme = {
          ...DEFAULT_TUNING.monster,
          speed: MONSTER_FIELDS[0]!.max,
          hunt: MONSTER_FIELDS[1]!.max,
        };
        expect(paceSpeed(monster.speed, extreme, 'hunt')).toBeLessThan(PLAYER_SPRINT_SPEED);
      }
  });

  it('schleicht langsamer, als es geht, und steht auf der Stelle still', () => {
    const base = MONSTERS[0]!.speed;
    const tuning = DEFAULT_TUNING.monster;
    expect(paceSpeed(base, tuning, 'stalk')).toBeLessThan(paceSpeed(base, tuning, 'walk'));
    expect(paceSpeed(base, tuning, 'walk')).toBeLessThan(paceSpeed(base, tuning, 'hunt'));
    expect(paceSpeed(base, tuning, 'still')).toBe(0);
  });
});
