import { emptySnapshot, headingOf, pointInPolygon, roomAtPoint } from './mapSnapshot';
import { inCone } from './visibility';
import { FLAT_OMNISCIENT, FLAT_REALISTIC } from './mapModes.register';
import { viewModesFor } from '../registry/viewModes';

describe('MapSnapshot', () => {
  it('geht unverändert durch JSON', () => {
    const snapshot = emptySnapshot();
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('findet den Raum zu einem Punkt, Kante eingeschlossen', () => {
    const snapshot = emptySnapshot();
    const square = [
      { x: 0, z: 0 },
      { x: 0, z: 5 },
      { x: 5, z: 5 },
      { x: 5, z: 0 },
    ];
    snapshot.rooms.push({
      id: 'r',
      name: 'R',
      polygon: square,
      centre: { x: 2.5, z: 2.5 },
      circulation: false,
      lit: false,
      safe: false,
    });
    expect(roomAtPoint(snapshot, { x: 1, z: 1 })?.id).toBe('r');
    expect(roomAtPoint(snapshot, { x: 5, z: 2 })?.id).toBe('r');
    expect(roomAtPoint(snapshot, { x: 6, z: 2 })).toBeNull();
    expect(pointInPolygon({ x: -0.1, z: 0 }, square)).toBe(false);
  });

  it('schaut bei yaw 0 nach Norden (-z) und dreht positiv nach Westen', () => {
    expect(headingOf(0).z).toBeCloseTo(-1);
    expect(headingOf(Math.PI / 2).x).toBeCloseTo(-1);
  });
});

describe('Sichtkegel', () => {
  const cone = { entityId: 'p', at: { x: 0, z: 0 }, yaw: 0, fov: Math.PI / 2, range: 10 };
  it('sieht geradeaus und nicht hinter sich', () => {
    expect(inCone(cone, { x: 0, z: -5 })).toBe(true);
    expect(inCone(cone, { x: 0, z: 5 })).toBe(false);
    expect(inCone(cone, { x: 0, z: -11 })).toBe(false);
    expect(inCone(cone, { x: 0.5, z: -1 })).toBe(true);
    expect(inCone(cone, { x: 2, z: -1 })).toBe(false);
  });
});

describe('Die zwei Modi der 2D-Welt', () => {
  it('sind angemeldet und genau zwei', () => {
    expect(viewModesFor('flat').map((m) => m.id)).toEqual([FLAT_OMNISCIENT.id, FLAT_REALISTIC.id]);
    expect(FLAT_REALISTIC.visibility).toBe('realistic');
  });
});
