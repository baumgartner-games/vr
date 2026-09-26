import { SEATING_DOOR, SEATING_ZONE, seatingPlaces } from './seating';
import { LANE, SPIKES, POINT_A, POINT_B, BUTTON_TILE } from './navigation';

/**
 * **Die Sitzecke gegen den Grundriss** — dieselbe Vorsicht wie beim
 * Stachelfeld (`navigation.test.ts`): Wo ein Platz liegt, entscheidet eine
 * Zahl in dieser Datei, und ein Stuhl auf der Kachel des Gangs oder mitten im
 * Stachelfeld sähe im Standbild harmlos aus und wäre im Spiel ein Besucher,
 * der nie ankommt.
 */
describe('Sitzecke der Navigationszone', () => {
  const tile = (value: number): number => Math.floor(value);
  const inside = (x: number, z: number): boolean =>
    x >= SEATING_ZONE.x &&
    x < SEATING_ZONE.x + SEATING_ZONE.w &&
    z >= SEATING_ZONE.z &&
    z < SEATING_ZONE.z + SEATING_ZONE.d;

  it('liegt ganz in der Zone, der Eingang auch', () => {
    for (const place of seatingPlaces()) expect(inside(place.x, place.z)).toBe(true);
    expect(inside(SEATING_DOOR.x, SEATING_DOOR.z)).toBe(true);
  });

  it('steht nicht im Gang, nicht im Stachelfeld und nicht auf den Punkten der Zone', () => {
    const taken = new Set<string>();
    for (let i = 0; i < LANE.length; i++) taken.add(`${LANE.x + i}|${LANE.z}`);
    for (let dx = 0; dx < SPIKES.w; dx++) {
      for (let dz = 0; dz < SPIKES.d; dz++) taken.add(`${SPIKES.x + dx}|${SPIKES.z + dz}`);
    }
    for (const point of [POINT_A, POINT_B, BUTTON_TILE]) taken.add(`${point.x}|${point.z}`);
    for (const place of seatingPlaces()) {
      expect(taken.has(`${tile(place.x)}|${tile(place.z)}`)).toBe(false);
    }
  });

  it('hat fünf Sitzplätze, drei Plätze in einer Schlange, und keine zwei an einer Stelle', () => {
    const places = seatingPlaces();
    expect(places.filter((place) => place.kind === 'seat')).toHaveLength(5);
    const queue = places.filter((place) => place.kind === 'queue');
    expect(queue.map((place) => place.order)).toEqual([0, 1, 2]);
    const spots = new Set(places.map((place) => `${place.x.toFixed(2)}|${place.z.toFixed(2)}`));
    expect(spots.size).toBe(places.length);
  });
});
