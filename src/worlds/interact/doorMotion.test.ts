import {
  closeDoor,
  ease,
  newDoor,
  passable,
  slideOffset,
  stepDoor,
  swingAngle,
  triggerDoor,
} from './doorMotion';

const TOGGLE = { time: 1, hold: 0 };
const AUTO = { time: 1, hold: 3 };

describe('triggerDoor', () => {
  it('schaltet ohne Nachlauf um', () => {
    const open = triggerDoor(newDoor(), TOGGLE);
    expect(open.wanted).toBe(true);
    expect(triggerDoor(open, TOGGLE).wanted).toBe(false);
  });

  it('öffnet mit Nachlauf immer und setzt die Uhr neu', () => {
    const first = triggerDoor(newDoor(), AUTO);
    expect(first).toMatchObject({ wanted: true, hold: 3 });
    const later = stepDoor(first, 2, AUTO);
    expect(later.hold).toBeCloseTo(1);
    // Noch einmal ausgelöst — die Tür fällt nicht zu, während jemand darin steht.
    expect(triggerDoor(later, AUTO).hold).toBe(3);
  });

  it('lässt sich auch von Hand schließen', () => {
    expect(closeDoor(triggerDoor(newDoor(), AUTO))).toMatchObject({ wanted: false, hold: 0 });
  });
});

describe('stepDoor', () => {
  it('braucht für den ganzen Weg die eingestellte Zeit', () => {
    let door = triggerDoor(newDoor(), TOGGLE);
    for (let i = 0; i < 10; i++) door = stepDoor(door, 0.1, TOGGLE);
    expect(door.open).toBeCloseTo(1);
    expect(passable(door)).toBe(true);
  });

  it('bleibt bei 1 und bei 0 stehen', () => {
    let door = { open: 1, wanted: true, hold: 0 };
    door = stepDoor(door, 5, TOGGLE);
    expect(door.open).toBe(1);
    door = stepDoor({ open: 0, wanted: false, hold: 0 }, 5, TOGGLE);
    expect(door.open).toBe(0);
  });

  it('fällt nach dem Nachlauf von selbst zu', () => {
    let door = triggerDoor(newDoor(), AUTO);
    door = stepDoor(door, 1, AUTO);
    expect(door.open).toBeCloseTo(1);
    door = stepDoor(door, 2, AUTO);
    expect(door.wanted).toBe(false);
    door = stepDoor(door, 1, AUTO);
    expect(door.open).toBeCloseTo(0);
  });

  it('nimmt auch einen kaputten Zeitschritt an', () => {
    expect(stepDoor(newDoor(), Number.NaN, TOGGLE).open).toBe(0);
  });
});

describe('ease und die beiden Flügel', () => {
  it('fängt bei null an, hört bei eins auf und läuft dazwischen aufwärts', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(-3)).toBe(0);
    expect(ease(9)).toBe(1);
    let last = -1;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const value = ease(t);
      expect(value).toBeGreaterThan(last);
      last = value;
    }
  });

  it('fährt langsam los — die halbe Zeit ist nicht der halbe Weg', () => {
    expect(ease(0.1)).toBeLessThan(0.1);
    expect(ease(0.5)).toBeCloseTo(0.5);
  });

  it('rechnet Schiebeweg und Drehwinkel aus derselben Kurve', () => {
    expect(slideOffset(1, 1.2)).toBeCloseTo(1.2);
    expect(slideOffset(0, 1.2)).toBe(0);
    expect(swingAngle(1, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('meldet erst kurz vor ganz offen, dass man hindurchpasst', () => {
    expect(passable({ open: 0.8, wanted: true, hold: 0 })).toBe(false);
    expect(passable({ open: 0.9, wanted: true, hold: 0 })).toBe(true);
  });
});
