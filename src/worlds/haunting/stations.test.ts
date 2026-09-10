import {
  crowdAt,
  isStation,
  ownerOf,
  seatOf,
  seating,
  shoved,
  stationFacts,
  STATIONS,
  type Claim,
} from './stations';

const claim = (id: string, station: Claim['station'], seniority: number): Claim => ({
  id,
  station,
  seniority,
});

describe('Wer in der Einsatzzentrale an welchem Gerät sitzt', () => {
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

  it('lässt jemanden ohne Anmeldung einfach in der Einsatzzentrale stehen', () => {
    expect(seatOf([], 'a')).toBeNull();
    // Nirgends angemeldet ist nicht dasselbe wie weggeschubst: Nur das zweite
    // kostet Zeit, und beide sähen in der Oberfläche sonst gleich aus.
    expect(shoved([], 'a')).toBe(false);
  });

  /**
   * **Vor dem Fernseher wird nicht geschubst.** Er ist kein Gerät, sondern ein
   * Fenster: Wer nichts bedient, nimmt niemandem etwas weg — und ein Schubser
   * zwischen zwei Zuschauern wäre eine Regel ohne Sache dahinter.
   */
  it('lässt beliebig viele zusehen', () => {
    const claims = [claim('a', 'watch', 30), claim('b', 'watch', 2), claim('c', 'watch', 1)];
    expect(seatOf(claims, 'a')).toBe('watch');
    expect(seatOf(claims, 'b')).toBe('watch');
    expect(seatOf(claims, 'c')).toBe('watch');
    expect(shoved(claims, 'b')).toBe(false);
    expect(crowdAt(claims, 'watch')).toBe(3);
  });

  it('zählt an den einzelnen Geräten trotzdem nur einen als Besitzer', () => {
    const claims = [claim('a', 'drone', 30), claim('b', 'drone', 2)];
    // Zwei greifen danach — gesessen wird von einem, und die Kachel sagt es.
    expect(crowdAt(claims, 'drone')).toBe(2);
    expect(ownerOf(claims, 'drone')).toBe('a');
    expect(crowdAt(claims, 'watch')).toBe(0);
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

describe('Three-person crew devices', () => {
  it('offers one combined control role while recognizing old switchboard announcements', () => {
    expect(STATIONS.map((station) => station.id)).toEqual([
      'archive',
      'scout',
      'drone',
      'watch',
      'monster',
    ]);
    expect(isStation('hack')).toBe(true);
    expect(stationFacts('hack').label).toBe('Einsatzkontrolle');
    expect(isStation('unknown')).toBe(false);
  });

  it('uses geometry for the isolated archive room and keeps control as a 2D instrument', () => {
    expect(stationFacts('archive').view).toBe(true);
    expect(stationFacts('archive').sees).toContain('ein ausgewählter Raum');
    expect(stationFacts('scout').view).toBe(false);
    expect(stationFacts('drone').view).toBe(true);
    expect(stationFacts('watch').view).toBe(true);
  });

  /**
   * **Die fünfte Station ist die Gegenseite.** Sie ist ein Gerät wie die
   * anderen — einer sitzt, der Rest wird weggeschubst —, nur dass ihr Besitzer
   * gegen die Crew spielt. Der Gastgeber nimmt Stock und Knöpfe nur von dem
   * an, der wirklich sitzt (`HauntingWorld.receive`, wie beim Schalter).
   */
  it('seats one monster player and shoves the second like at any device', () => {
    expect(isStation('monster')).toBe(true);
    expect(stationFacts('monster').view).toBe(false);
    expect(stationFacts('monster').shared).toBeFalsy();
    const claims = [claim('a', 'monster', 8), claim('b', 'monster', 1), claim('c', 'scout', 3)];
    expect(ownerOf(claims, 'monster')).toBe('a');
    expect(seatOf(claims, 'a')).toBe('monster');
    expect(seatOf(claims, 'b')).toBeNull();
    expect(shoved(claims, 'b')).toBe(true);
    expect(seating(claims).get('monster')).toBe('a');
    expect(crowdAt(claims, 'monster')).toBe(2);
  });
});
