import { PlaceBoard } from './npcPlaces';

function board(): PlaceBoard {
  const b = new PlaceBoard();
  b.add({ id: 'bank-a', kind: 'seat', x: 0, z: 0, yaw: 0 });
  b.add({ id: 'bank-b', kind: 'seat', x: 4, z: 0, yaw: 0 });
  for (let i = 0; i < 3; i++) {
    b.add({ id: `q${i}`, kind: 'queue', x: 10, z: i, yaw: 0, line: 'kasse', order: i });
  }
  return b;
}

describe('Plätze und ihre Reservierung', () => {
  it('gibt einen Platz nur einem — der Zweite bekommt ihn nicht', () => {
    const b = board();
    expect(b.reserve('bank-a', 'anna')).toBe(true);
    expect(b.reserve('bank-a', 'bert')).toBe(false);
    expect(b.holder('bank-a')).toBe('anna');
    expect(b.isFree('bank-b')).toBe(true);
    expect(b.freeCount('seat')).toBe(1);
    // Wer denselben Platz noch einmal will, hat ihn schon.
    expect(b.reserve('bank-a', 'anna')).toBe(true);
  });

  it('lässt keinen zwei Plätze halten', () => {
    const b = board();
    b.reserve('bank-a', 'anna');
    b.reserve('bank-b', 'anna');
    expect(b.isFree('bank-a')).toBe(true);
    expect(b.placeOf('anna')?.id).toBe('bank-b');
    expect(b.release('anna')?.id).toBe('bank-b');
    expect(b.placeOf('anna')).toBeNull();
    expect(b.release('anna')).toBeNull();
  });

  it('findet den nächsten und einen ausgewürfelten freien Platz', () => {
    const b = board();
    expect(b.nearestFree('seat', { x: 3, z: 0 })?.id).toBe('bank-b');
    b.reserve('bank-b', 'anna');
    expect(b.nearestFree('seat', { x: 3, z: 0 })?.id).toBe('bank-a');
    b.reserve('bank-a', 'bert');
    expect(b.nearestFree('seat', { x: 3, z: 0 })).toBeNull();
    expect(b.randomFree('seat', () => 0.99)).toBeNull();
    b.release('anna');
    expect(b.randomFree('seat', () => 0.99)?.id).toBe('bank-b');
  });

  it('stellt an, zählt von vorn und rückt auf, ohne zu überholen', () => {
    const b = board();
    expect(b.joinQueue('kasse', 'anna')?.id).toBe('q0');
    expect(b.joinQueue('kasse', 'bert')?.id).toBe('q1');
    expect(b.joinQueue('kasse', 'cleo')?.id).toBe('q2');
    expect(b.joinQueue('kasse', 'dora')).toBeNull();
    expect(b.joinQueue('kasse', 'bert')?.id).toBe('q1');
    expect(b.front('kasse')).toBe('anna');
    expect(b.queuePosition('cleo')).toBe(2);

    b.release('anna');
    const moves = b.advance('kasse');
    expect(moves.map((move) => [move.who, move.place.id])).toEqual([
      ['bert', 'q0'],
      ['cleo', 'q1'],
    ]);
    expect(b.front('kasse')).toBe('bert');
    expect(b.isFree('q2')).toBe(true);
    expect(b.advance('kasse')).toEqual([]);
  });

  it('vergisst den Halter eines entfernten Platzes', () => {
    const b = board();
    b.reserve('bank-a', 'anna');
    b.remove('bank-a');
    expect(b.placeOf('anna')).toBeNull();
    expect(b.get('bank-a')).toBeNull();
  });
});
