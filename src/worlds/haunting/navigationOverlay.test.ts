/** @jest-environment jsdom */
import * as THREE from 'three';
import { NavigationOverlay } from './navigationOverlay';
import { generateHouse } from './house';
import type { MonsterInsight } from './map/mapSnapshot';

beforeEach(() => {
  // Die Beschriftungen malen auf ein Canvas; in jsdom gibt es keins.
  HTMLCanvasElement.prototype.getContext = jest.fn(
    () =>
      new Proxy({} as Record<string, unknown>, {
        get: (target, key: string) => (key in target ? target[key] : () => {}),
        set: (target, key: string, value) => {
          target[key] = value;
          return true;
        },
      }),
  ) as never;
});

function fakeInsight(roomA: string, roomB: string): MonsterInsight {
  return {
    mode: 'ambush',
    label: 'Lauern',
    goal: { x: 6, z: 7 },
    belief: [
      { roomId: roomA, p: 0.8 },
      { roomId: roomB, p: 0.005 },
    ],
    prediction: {
      path: [
        { x: 1, z: 1 },
        { x: 4, z: 3 },
      ],
      eta: [0, 2],
    },
    intercept: { door: 'd1', at: { x: 3, z: 4 }, etaMonster: 1.2, etaPlayer: 2.5 },
  };
}

/** Die Gruppe, in der die Absichten liegen — sie hat einen Namen, damit man sie findet. */
function insightGroup(overlay: NavigationOverlay): THREE.Object3D {
  const group = overlay.root.getObjectByName('ai-insight');
  expect(group).toBeTruthy();
  return group!;
}

describe('Das Overlay „KI-Absichten" in 3D', () => {
  it('legt Glaube, Prognose und Abfangring auf den Boden — und nimmt sie wieder weg', () => {
    const spec = generateHouse(4711, 8);
    const overlay = new NavigationOverlay();
    overlay.setRooms(spec);
    const [a, b] = [spec.rooms[0]!.id, spec.rooms[1]!.id];
    const group = insightGroup(overlay);
    expect(group.visible).toBe(false);

    overlay.insight(fakeInsight(a, b));
    expect(group.visible).toBe(true);
    const tiles = group.children.filter(
      (child): child is THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> =>
        child.name.startsWith('belief:'),
    );
    // Der geglaubte Raum ist da, der mit einem halben Prozent nicht.
    const shown = tiles.filter((tile) => tile.visible && tile.material.opacity > 0);
    expect(shown).toHaveLength(1);
    expect(shown[0]!.material.opacity).toBeGreaterThan(0.1);

    const line = group.children.find((child): child is THREE.Line => child instanceof THREE.Line)!;
    expect(line.visible).toBe(true);
    expect(line.geometry.drawRange.count).toBe(2);

    const ring = group.children.find(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && !!child.geometry.type.match(/Ring/),
    )!;
    expect(ring.visible).toBe(true);
    expect([ring.position.x, ring.position.z]).toEqual([3, 4]);

    // Beide Beschriftungen stehen im Bild: Zeiten an der Tür, Haltung am Ziel.
    expect(
      group.children.filter((child) => child.visible && child.type === 'Mesh').length,
    ).toBeGreaterThan(3);

    overlay.insight(null);
    expect(group.visible).toBe(false);
    overlay.dispose();
  });

  /**
   * Ohne Abfangtür und ohne Ziel bleibt der Rest stehen — sonst verschwände
   * das ganze Overlay, sobald das Monster nur wandert.
   */
  it('kommt ohne Abfangtür und ohne Ziel aus', () => {
    const spec = generateHouse(23, 8);
    const overlay = new NavigationOverlay();
    overlay.setRooms(spec);
    overlay.insight({
      ...fakeInsight(spec.rooms[0]!.id, spec.rooms[1]!.id),
      intercept: null,
      goal: null,
      prediction: null,
    });
    const group = insightGroup(overlay);
    expect(group.visible).toBe(true);
    const ring = group.children.find(
      (child): child is THREE.Mesh =>
        child instanceof THREE.Mesh && !!child.geometry.type.match(/Ring/),
    )!;
    expect(ring.visible).toBe(false);
    overlay.dispose();
  });
});
