import { generateHouse } from '../house';
import { extractMapSnapshot } from '../map/extract';
import { worldMapSource, type WorldHandles } from '../map/worldSource';
import { freshCrew, stationOptions } from '../mission';
import type { HauntState } from '../net';
import { VentNet } from './ventGraph';
import { STATION_VENTS } from './ventNet.data';

/** Die Handvoll Getter der 3D-Welt, wie `HauntingWorld.mapSnapshot` sie füllt — ohne Welt. */
function handles(vents?: WorldHandles['vents']): WorldHandles {
  const spec = generateHouse(391, 14);
  const state: HauntState = {
    crew: freshCrew(stationOptions({ rooms: 14 })),
    seed: 391,
    phase: 'running',
    time: 0,
    monsterOn: true,
    monster: { x: 1, z: 2 },
    shut: [],
    lit: [],
    loud: [],
    fuse: false,
    taken: [],
    done: [],
    destroyed: [],
  };
  return {
    spec: () => spec,
    state: () => state,
    drone: () => null,
    lamps: () => [],
    doorOpen: () => false,
    player: () => null,
    torch: () => ({ lit: false, held: '' }),
    bot: () => null,
    monsterYaw: () => 0,
    peers: () => [],
    ...(vents ? { vents } : {}),
  };
}

describe('Die Klappen im Snapshot der 3D-Welt', () => {
  it('stehen als Items der Sorte vent drin, mit dem Graphen als ventLinks', () => {
    const net = new VentNet(generateHouse(391, 14));
    const snapshot = extractMapSnapshot(
      worldMapSource(handles(() => ({ flaps: net.items(['vent-admin']), links: net.mapLinks() }))),
    );
    const flaps = snapshot.items.filter((item) => item.kind === 'vent');
    expect(flaps).toHaveLength(STATION_VENTS.flaps.length);
    expect(flaps.find((item) => item.id === 'vent-admin')?.state).toBe('open');
    expect(flaps.filter((item) => item.state === 'open')).toHaveLength(1);
    expect(flaps.every((item) => !item.interactive)).toBe(true);
    expect(snapshot.ventLinks).toHaveLength(STATION_VENTS.links.length);
    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('fehlen ohne Netz — der Contract bleibt optional', () => {
    const snapshot = extractMapSnapshot(worldMapSource(handles()));
    expect(snapshot.items.some((item) => item.kind === 'vent')).toBe(false);
    expect(snapshot.ventLinks).toBeUndefined();
  });
});
