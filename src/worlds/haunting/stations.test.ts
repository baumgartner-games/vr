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
    const claims = [claim('a', 'red', 3)];
    expect(ownerOf(claims, 'red')).toBe('a');
    expect(seatOf(claims, 'a')).toBe('red');
    expect(shoved(claims, 'a')).toBe(false);
  });

  /**
   * **Wer länger sitzt, bleibt sitzen** — dieselbe Regel wie beim Gastgeber
   * der Welt, und aus demselben Grund: Jeder kennt seine eigene Sitzdauer, und
   * Dauern wachsen auf allen Uhren gleich schnell. Es braucht keine Wahl und
   * keinen Server.
   */
  it('schubst den weg, der später gekommen ist', () => {
    const claims = [claim('a', 'yellow', 30), claim('b', 'yellow', 2)];
    expect(ownerOf(claims, 'yellow')).toBe('a');
    expect(seatOf(claims, 'b')).toBeNull();
    expect(shoved(claims, 'b')).toBe(true);
    expect(shoved(claims, 'a')).toBe(false);
  });

  it('entscheidet bei gleicher Dauer immer gleich', () => {
    // Zwei, die im selben Augenblick greifen: Irgendetwas muss entscheiden,
    // und es muss auf beiden Geräten dasselbe sein.
    const claims = [claim('b', 'blue', 4), claim('a', 'blue', 4)];
    expect(ownerOf(claims, 'blue')).toBe('a');
    expect(ownerOf([...claims].reverse(), 'blue')).toBe('a');
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
    const claims = [claim('a', 'yellow', 30), claim('b', 'yellow', 2)];
    // Zwei greifen danach — gesessen wird von einem, und die Kachel sagt es.
    expect(crowdAt(claims, 'yellow')).toBe(2);
    expect(ownerOf(claims, 'yellow')).toBe('a');
    expect(crowdAt(claims, 'watch')).toBe(0);
  });

  it('lässt an jedem Gerät gleichzeitig jemanden arbeiten', () => {
    const claims = STATIONS.map((station, index) => claim(`p${index}`, station.id, 10 - index));
    const seats = seating(claims);
    expect(seats.size).toBe(STATIONS.length);
    for (const station of STATIONS) expect(seats.get(station.id)).toBeDefined();
  });
});

describe('Die Stühle der Einsatzzentrale', () => {
  /**
   * **Die Stationsliste ist nur noch die Sitzordnung** — drei Stühle mit
   * Farben, der Fernseher, das Monster. Welche Karten auf einem Stuhl liegen,
   * sagt die Tafel (`rules/roundSetup.Seat.powers`), und wie eine Karte
   * heißt, steht bei der Rolle selbst (`registry/roles.ts`).
   */
  it('führt genau die Geräte, an denen jemand sitzen kann', () => {
    expect(STATIONS.map((station) => station.id)).toEqual([
      'red',
      'yellow',
      'blue',
      'watch',
      'monster',
    ]);
    expect(isStation('blue')).toBe(true);
    // Die alten Geräte hießen wie die Fähigkeiten — ein Anspruch darauf ist
    // seit den Farben keiner mehr (`readClaim` lässt ihn fallen).
    expect(isStation('archive')).toBe(false);
    expect(isStation('hack')).toBe(false);
    expect(isStation('drone')).toBe(false);
    expect(isStation('unknown')).toBe(false);
    expect(stationFacts('watch').shared).toBe(true);
    expect(stationFacts('red').shared).toBeFalsy();
  });

  /**
   * **Die letzte Station ist die Gegenseite.** Sie ist ein Gerät wie die
   * anderen — einer sitzt, der Rest wird weggeschubst —, nur dass ihr Besitzer
   * gegen die Crew spielt. Der Gastgeber nimmt Stock und Knöpfe nur von dem
   * an, der wirklich sitzt (`HauntingWorld.receive`, wie beim Schalter).
   */
  it('seats one monster player and shoves the second like at any device', () => {
    expect(isStation('monster')).toBe(true);
    expect(stationFacts('monster').shared).toBeFalsy();
    const claims = [claim('a', 'monster', 8), claim('b', 'monster', 1), claim('c', 'yellow', 3)];
    expect(ownerOf(claims, 'monster')).toBe('a');
    expect(seatOf(claims, 'a')).toBe('monster');
    expect(seatOf(claims, 'b')).toBeNull();
    expect(shoved(claims, 'b')).toBe(true);
    expect(seating(claims).get('monster')).toBe('a');
    expect(crowdAt(claims, 'monster')).toBe(2);
  });
});
