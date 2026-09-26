import { RepeatGate, navDirection, pickNext, type NavRect } from './spatialNav';

const box = (left: number, top: number, width = 100, height = 40): NavRect => ({
  left,
  top,
  width,
  height,
});

describe('pickNext — wohin der Fokus springt', () => {
  // Eine Liste: drei Zeilen untereinander, die mittlere mit einem Pfeil rechts.
  const list = [box(0, 0, 300), box(0, 50, 250), box(260, 50, 40), box(0, 100, 300)];

  it('geht in einer Liste zeilenweise', () => {
    expect(pickNext(list[0]!, list, 'down')).toBe(1);
    expect(pickNext(list[1]!, list, 'down')).toBe(3);
    expect(pickNext(list[3]!, list, 'up')).toBe(1);
  });

  it('findet den Pfeil rechts neben der Zeile und nicht die Zeile darunter', () => {
    expect(pickNext(list[1]!, list, 'right')).toBe(2);
    expect(pickNext(list[2]!, list, 'left')).toBe(1);
  });

  it('springt seitwärts nicht schräg in eine andere Zeile', () => {
    // Der Schließen-Knopf oben rechts liegt „rechts" von jeder Zeile — aber
    // nicht in ihrer Zeile.
    const menu = [box(300, 0, 40, 40), box(0, 60, 280), box(0, 110, 280)];
    expect(pickNext(menu[1]!, menu, 'right')).toBe(-1);
    expect(pickNext(menu[1]!, menu, 'up')).toBe(0);
  });

  it('bleibt am Ende stehen, statt herumzuspringen', () => {
    expect(pickNext(list[3]!, list, 'down')).toBe(-1);
    expect(pickNext(list[0]!, list, 'up')).toBe(-1);
  });

  it('geht im Raster senkrecht und nicht schräg in die Nachbarspalte', () => {
    // Drei Spalten, zwei Reihen.
    const grid: NavRect[] = [];
    for (let row = 0; row < 2; row++)
      for (let col = 0; col < 3; col++) grid.push(box(col * 110, row * 110, 100, 100));
    expect(pickNext(grid[1]!, grid, 'down')).toBe(4);
    expect(pickNext(grid[4]!, grid, 'up')).toBe(1);
    expect(pickNext(grid[4]!, grid, 'right')).toBe(5);
    expect(pickNext(grid[3]!, grid, 'left')).toBe(-1);
  });

  it('übergeht, was nicht zu sehen ist (null groß)', () => {
    const hidden = [box(0, 0), box(0, 50, 0, 0), box(0, 100)];
    expect(pickNext(hidden[0]!, hidden, 'down')).toBe(2);
  });
});

describe('navDirection', () => {
  const none = { up: false, down: false, left: false, right: false };

  it('lässt das Kreuz vor dem Stock gelten', () => {
    expect(navDirection({ ...none, left: true }, { x: 1, y: 0 })).toBe('left');
  });

  it('nimmt beim Stock die stärkere Achse und ignoriert ein Zittern', () => {
    expect(navDirection(none, { x: 0.2, y: -0.9 })).toBe('up');
    expect(navDirection(none, { x: 0.8, y: 0.3 })).toBe('right');
    expect(navDirection(none, { x: 0.3, y: 0.3 })).toBeNull();
  });
});

describe('RepeatGate', () => {
  it('macht einen Schritt, wartet, und läuft dann im Takt', () => {
    const gate = new RepeatGate(300, 100);
    expect(gate.step('down', 0)).toBe('down');
    expect(gate.step('down', 200)).toBeNull();
    expect(gate.step('down', 300)).toBe('down');
    expect(gate.step('down', 350)).toBeNull();
    expect(gate.step('down', 400)).toBe('down');
  });

  it('fängt neu an, wenn losgelassen oder die Richtung gewechselt wird', () => {
    const gate = new RepeatGate(300, 100);
    gate.step('down', 0);
    expect(gate.step('up', 10)).toBe('up');
    expect(gate.step(null, 20)).toBeNull();
    expect(gate.step('up', 30)).toBe('up');
  });
});
