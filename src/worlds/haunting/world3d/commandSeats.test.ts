import { TILE } from '../../nav/navTile';
import { APRON_INNER } from '../house';
import { COMMAND_HOME } from '../trainingLayout';
import { STATIONS, type StationId } from '../stations';
import {
  COMMAND_STOOLS,
  COMMAND_TABLE,
  SEATED_EYE,
  STANDING_EYE,
  STANDING_ROW,
  STOOL_ROW,
  crewPlacement,
  stoolOf,
} from './commandSeats';

describe('Die Hocker der Einsatzzentrale', () => {
  test('jedes Gerät außer dem Fernseher hat genau einen Hocker', () => {
    for (const station of STATIONS) {
      const stool = stoolOf(station.id);
      if (station.shared) expect(stool).toBeNull();
      else expect(stool?.station).toBe(station.id);
    }
    expect(new Set(COMMAND_STOOLS.map((stool) => stool.station)).size).toBe(COMMAND_STOOLS.length);
  });

  test('sie stehen in einer Reihe südlich vom Tisch, mittig und nicht ineinander', () => {
    const xs = COMMAND_STOOLS.map((stool) => stool.x);
    for (const stool of COMMAND_STOOLS) expect(stool.z).toBeGreaterThan(COMMAND_TABLE.z);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThan(0.4);
    expect((xs[0]! + xs[xs.length - 1]!) / 2).toBeCloseTo(COMMAND_TABLE.x);
    // Der Tisch steht an der Fensterfront — die Reihe aus `house.ts`, nicht geraten.
    expect(COMMAND_TABLE.z).toBeCloseTo((APRON_INNER + 0.05) * TILE);
  });

  test('kein Hocker steht auf dem Rückkehrpunkt, an dem die Brille landet', () => {
    for (const stool of COMMAND_STOOLS)
      expect(Math.hypot(stool.x - COMMAND_HOME.x, stool.z - COMMAND_HOME.z)).toBeGreaterThan(1.5);
  });
});

describe('Wo die Zentrale im Schiff sitzt', () => {
  const pose = (map: Map<string, unknown>, id: string) => (map.get(id) as { head: number[] }).head;

  test('wer ein Gerät besitzt, sitzt auf dessen Hocker und schaut zum Tisch', () => {
    const placed = crewPlacement([
      { id: 'anna', station: 'red' },
      { id: 'ben', station: 'monster' },
    ]);
    const red = stoolOf('red')!;
    const monster = stoolOf('monster')!;
    expect(pose(placed, 'anna').slice(0, 3)).toEqual([red.x, SEATED_EYE, red.z]);
    expect(pose(placed, 'ben').slice(0, 3)).toEqual([monster.x, SEATED_EYE, monster.z]);
    // Einheitsdrehung: Blick nach -z, und der Tisch liegt bei kleinerem z.
    expect(pose(placed, 'anna').slice(3)).toEqual([0, 0, 0, 1]);
    expect(STOOL_ROW).toBeGreaterThan(COMMAND_TABLE.z);
    for (const one of placed.values()) expect(one.left).toBeNull();
  });

  test('Fernseher, Weggeschubste und Platzlose stehen in der Reihe dahinter, jeder für sich', () => {
    const placed = crewPlacement([
      { id: 'zoe', station: 'watch' },
      { id: 'anna', station: null },
      { id: 'mia', station: 'watch' },
    ]);
    const xs = ['anna', 'mia', 'zoe'].map((id) => pose(placed, id));
    for (const head of xs) {
      expect(head[1]).toBe(STANDING_EYE);
      expect(head[2]).toBe(STANDING_ROW);
      expect(head[2]).toBeGreaterThan(STOOL_ROW);
    }
    // Sortiert nach Kennung, von West nach Ost, mittig vor dem Tisch.
    expect(xs[0]![0]).toBeLessThan(xs[1]![0]);
    expect(xs[1]![0]).toBeLessThan(xs[2]![0]);
    expect(xs[1]![0]).toBeCloseTo(COMMAND_TABLE.x);
  });

  test('ein Einzelner ohne Platz steht mittig — und niemand steht dort, wo die Brille landet', () => {
    const placed = crewPlacement([{ id: 'solo', station: null }]);
    const head = pose(placed, 'solo');
    expect(head[0]).toBeCloseTo(COMMAND_TABLE.x);
    expect(Math.hypot(head[0]! - COMMAND_HOME.x, head[2]! - COMMAND_HOME.z)).toBeGreaterThan(1.5);
  });

  test('dieselbe Eingabe ergibt dieselben Posen, in jeder Reihenfolge', () => {
    const crew = [
      { id: 'b', station: 'blue' as StationId },
      { id: 'a', station: 'watch' as StationId },
      { id: 'c', station: null },
    ];
    const one = crewPlacement(crew);
    const other = crewPlacement([...crew].reverse());
    for (const id of ['a', 'b', 'c']) expect(pose(one, id)).toEqual(pose(other, id));
  });
});
