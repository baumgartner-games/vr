import { ownerOf, seatOf, seating, shoved, STATIONS, type Claim } from './stations';

const claim = (id: string, station: Claim['station'], seniority: number): Claim => ({
  id,
  station,
  seniority,
});

describe('Wer im Van an welchem Gerät sitzt', () => {
  it('gibt ein freies Gerät dem, der sich anmeldet', () => {
    const claims = [claim('a', 'archive', 3)];
    expect(ownerOf(claims, 'archive')).toBe('a');
    expect(seatOf(claims, 'a')).toBe('archive');
    expect(shoved(claims, 'a')).toBe(false);
  });

  /**
   * **Wer länger sitzt, bleibt sitzen** — dieselbe Regel wie beim Gastgeber
   * der Welt, und aus demselben Grund: Jeder kennt seine eigene Sitzdauer, und
   * Dauern wachsen auf allen Uhren gleich schnell. Es braucht keine Wahl und
   * keinen Server.
   */
  it('schubst den weg, der später gekommen ist', () => {
    const claims = [claim('a', 'drone', 30), claim('b', 'drone', 2)];
    expect(ownerOf(claims, 'drone')).toBe('a');
    expect(seatOf(claims, 'b')).toBeNull();
    expect(shoved(claims, 'b')).toBe(true);
    expect(shoved(claims, 'a')).toBe(false);
  });

  it('entscheidet bei gleicher Dauer immer gleich', () => {
    // Zwei, die im selben Augenblick greifen: Irgendetwas muss entscheiden,
    // und es muss auf beiden Geräten dasselbe sein.
    const claims = [claim('b', 'hack', 4), claim('a', 'hack', 4)];
    expect(ownerOf(claims, 'hack')).toBe('a');
    expect(ownerOf([...claims].reverse(), 'hack')).toBe('a');
  });

  it('lässt jemanden ohne Anmeldung einfach im Van stehen', () => {
    expect(seatOf([], 'a')).toBeNull();
    // Nirgends angemeldet ist nicht dasselbe wie weggeschubst: Nur das zweite
    // kostet Zeit, und beide sähen in der Oberfläche sonst gleich aus.
    expect(shoved([], 'a')).toBe(false);
  });

  it('lässt vier Leute gleichzeitig an vier Geräten arbeiten', () => {
    const claims = STATIONS.map((station, index) => claim(`p${index}`, station.id, 10 - index));
    const seats = seating(claims);
    expect(seats.size).toBe(STATIONS.length);
    for (const station of STATIONS) expect(seats.get(station.id)).toBeDefined();
  });

  it('hält für jede Station bereit, was sie ausdrücklich nicht sieht', () => {
    // Die Zeile steht in der Oberfläche und ist die halbe Spielregel: Wer
    // nicht weiß, was er nicht sieht, hält seine Lücke für die Wahrheit.
    for (const station of STATIONS) expect(station.sees.length).toBeGreaterThan(10);
  });
});
