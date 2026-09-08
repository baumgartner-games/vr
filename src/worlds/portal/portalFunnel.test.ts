import * as THREE from 'three';
import { funnelGroups, type FunnelProbe } from './portalFunnel';

/**
 * **Der Fehler, wegen dem es diesen Test gibt, war fünf Zentimeter groß.**
 *
 * Im Portallabor liegt die Fläche bis zum Horizont fünf Zentimeter unter dem
 * gebauten Laborboden, und beide halten Portale — also hat jede ihr eigenes
 * Kollisionsbit. Ein Bodenportal löste nur den Laborboden auf: Der Companion
 * Cube fiel fünf Zentimeter, setzte auf der Fläche darunter auf und blieb im
 * Loch stehen. Auf dem Bild sieht das aus wie eine kaputte Physik, und man
 * sucht überall — nur nicht in der einen Zahl, die beim Schießen gemerkt wird.
 *
 * Gerechnet wird hier mit echter Geometrie und echten Strahlen, aber ohne
 * WebGL: Ein Strahlenwerfer ist Mathematik.
 */

/** Die Bits, die die Physik vergibt (`PhysicsWorld.portalSurfaceGroup`). */
const FLOOR = 1 << 5;
const GROUND = 1 << 6;
const WALL = 1 << 7;

const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);

interface Built {
  probe: FunnelProbe;
  add: (size: [number, number, number], at: [number, number, number], group: number) => THREE.Mesh;
}

function room(): Built {
  const groups = new Map<THREE.Object3D, number>();
  const surfaces: THREE.Object3D[] = [];
  const add = (
    size: [number, number, number],
    at: [number, number, number],
    group: number,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size));
    mesh.position.set(...at);
    mesh.updateMatrixWorld(true);
    groups.set(mesh, group);
    surfaces.push(mesh);
    return mesh;
  };
  return {
    probe: {
      raycaster: new THREE.Raycaster(),
      surfaces,
      groupOf: (surface) => groups.get(surface) ?? 0,
      // Dieselbe Tiefe, mit der auch die Physik rechnet (`FUNNEL_DEPTH`).
      depth: 1.1,
    },
    add,
  };
}

/** Laborboden (Oberkante 0, 40 cm dick) und die Fläche fünf Zentimeter tiefer. */
function twoFloors(): Built {
  const built = room();
  built.add([20, 0.4, 20], [0, -0.2, 0], FLOOR);
  built.add([200, 0.6, 200], [0, -0.05 - 0.3, 0], GROUND);
  return built;
}

describe('funnelGroups', () => {
  it('nimmt beide Böden mit, die unter dem Loch liegen', () => {
    const { probe } = twoFloors();
    const mask = funnelGroups(probe, new THREE.Vector3(1, 0, -2), UP, new THREE.Vector3(0, 0, -1));
    expect(mask & FLOOR).toBe(FLOOR);
    // Das Bit, das gefehlt hat.
    expect(mask & GROUND).toBe(GROUND);
  });

  it('lässt den Boden in Ruhe, wenn das Portal an der Wand hängt', () => {
    // Die Regel, die dabei nicht verlorengehen darf: Ein Wandportal, das auch
    // den Boden auflöste, ließe einen davor einsacken.
    const built = twoFloors();
    built.add([0.4, 4.6, 20], [8.2, 2.3, 0], WALL);
    const mask = funnelGroups(
      built.probe,
      new THREE.Vector3(8, 1.5, 0),
      new THREE.Vector3(-1, 0, 0),
      UP,
    );
    expect(mask).toBe(WALL);
  });

  it('nimmt nicht mit, was tiefer liegt als der Trichter reicht', () => {
    // Ein Keller zwei Meter tiefer ist kein Teil dieser Wand: Wer dort
    // ankommt, ist längst auf der anderen Seite.
    const built = room();
    built.add([20, 0.4, 20], [0, -0.2, 0], FLOOR);
    built.add([20, 0.4, 20], [0, -2.4, 0], GROUND);
    const mask = funnelGroups(
      built.probe,
      new THREE.Vector3(0, 0, 0),
      UP,
      new THREE.Vector3(0, 0, -1),
    );
    expect(mask).toBe(FLOOR);
  });

  it('erwischt auch die Fläche, die nur die halbe Öffnung hinterlegt', () => {
    // Die Naht zweier Böden mitten im Loch: Ein einzelner Strahl durch die
    // Mitte sähe nur einen von beiden, und durch den anderen fiele niemand.
    const built = room();
    built.add([20, 0.4, 20], [0, -0.2, 0], FLOOR);
    // Beginnt 20 cm rechts der Portalmitte — der Rand der Öffnung liegt darauf.
    built.add([20, 0.4, 20], [10.2, -0.7, 0], GROUND);
    const mask = funnelGroups(
      built.probe,
      new THREE.Vector3(0, 0, 0),
      UP,
      new THREE.Vector3(0, 0, -1),
    );
    expect(mask & FLOOR).toBe(FLOOR);
    expect(mask & GROUND).toBe(GROUND);
  });

  it('sieht ein Deckenportal genauso wie ein Bodenportal', () => {
    const built = room();
    built.add([20, 0.4, 20], [0, 4.8, 0], FLOOR);
    const mask = funnelGroups(
      built.probe,
      new THREE.Vector3(0, 4.6, 0),
      DOWN,
      new THREE.Vector3(0, 0, -1),
    );
    expect(mask).toBe(FLOOR);
  });

  it('bleibt bei null, wenn es gar keine Flächen gibt', () => {
    const built = room();
    expect(funnelGroups(built.probe, new THREE.Vector3(), UP, new THREE.Vector3(0, 0, -1))).toBe(0);
  });
});
