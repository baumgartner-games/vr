import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import type { Dish } from '../test/zones/kitchenRecipes';
import { elementById } from './elementCatalog';
import type { ElementSpot } from './elementPlace';
import type { PlacedElement } from './elementView';
import { StationLayer, TUB_SHIFT, type StationHost } from './stationLayer';

/** Ein hingestelltes Element ohne Modelle — nur, was die Stationen davon brauchen. */
function placed(spot: ElementSpot): PlacedElement {
  const anchor = new THREE.Group();
  anchor.position.set(spot.x + 0.5, 0, spot.z + 1);
  return {
    spot,
    element: elementById(spot.element),
    anchor,
    top: 0.5,
    cells: [],
    block: { cells: [], mesh: new THREE.Mesh() },
    parts: [],
  };
}

/** Eine Welt, die mitschreibt. */
function world(): {
  host: StationHost;
  usables: Map<THREE.Object3D, Usable>;
  said: string[];
  hand: { held: Dish | null; busy: string | null };
} {
  const usables = new Map<THREE.Object3D, Usable>();
  const said: string[] = [];
  const hand = { held: null as Dish | null, busy: null as string | null };
  return {
    usables,
    said,
    hand,
    host: {
      addUsable: (anchor, usable) => usables.set(anchor, usable),
      removeUsable: (anchor) => usables.delete(anchor),
      announce: (text) => said.push(text),
      held: () => hand.held,
      heldHand: () => null,
      setHeld: (dish) => (hand.held = dish),
      busy: () => hand.busy,
      dishView: (dish) => {
        const view = new THREE.Group();
        view.name = `view:${dish.item}`;
        return view;
      },
    },
  };
}

const by = { kind: 'player' as const, at: new THREE.Vector3(), forward: new THREE.Vector3() };

describe('Stationen auf Spielelementen', () => {
  it('meldet an, nimmt aus der Kiste, legt aufs Brett und schneidet nur mit jemandem davor', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-lettuce', x: 0, z: 0 });
    const board = placed({ id: 'brett', element: 'board', x: 1, z: 0 });
    expect(layer.add(crate)).toBe(1);
    expect(layer.add(board)).toBe(1);
    layer.step(0, { x: 50, z: 50 });
    // Die leere Kiste gibt her, das leere Brett meldet sich nicht.
    const crateAnchor = crate.anchor.children[0]!;
    const boardAnchor = board.anchor.children[0]!;
    expect(usables.get(crateAnchor)?.usePrompt?.()).toMatch(/nehmen/);
    expect(usables.has(boardAnchor)).toBe(false);
    expect(usables.get(crateAnchor)!.use(by)).toBe(true);
    expect(hand.held?.item).toBe('lettuce');
    layer.step(0, { x: 50, z: 50 });
    expect(usables.get(boardAnchor)!.use(by)).toBe(true);
    expect(hand.held).toBeNull();
    // Weit weg: nichts geschnitten.
    for (let i = 0; i < 50; i++) layer.step(0.1, { x: 50, z: 50 });
    expect(layer.states[1]!.on?.item).toBe('lettuce');
    // Davor: geschnitten, und das Bild liegt obenauf auf der Platte.
    for (let i = 0; i < 40; i++) layer.step(0.1, { x: 1.5, z: 1.5 });
    expect(layer.states[1]!.on?.item).toBe('lettuce-cut');
    const surface = layer.place('brett')!.anchor;
    expect(surface.parent).toBe(boardAnchor);
    expect(surface.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([1.5, 0, 0.5]);
    const view = surface.children.find((child) => child.name === 'view:lettuce-cut');
    expect(view?.position.toArray()).toEqual([0, 0.5, 0]);
  });

  it('sagt, warum nicht, wenn die Hände mit etwas anderem voll sind', () => {
    const { host, usables, hand, said } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-buns', x: 0, z: 0 });
    layer.add(crate);
    hand.busy = 'Erst den Burger an den Tisch bringen';
    layer.step(0, { x: 0, z: 0 });
    expect(usables.get(crate.anchor.children[0]!)!.use(by)).toBe(false);
    expect(said).toEqual(['Erst den Burger an den Tisch bringen']);
    expect(hand.held).toBeNull();
  });

  it('hängt die beiden Wannen nebeneinander an die Vorderkante', () => {
    const { host } = world();
    const layer = new StationLayer(host);
    const tubs = placed({ id: 'wannen', element: 'ice-tubs', x: 0, z: 0 });
    expect(layer.add(tubs)).toBe(2);
    expect(tubs.anchor.children.map((child) => child.position.x)).toEqual([-TUB_SHIFT, TUB_SHIFT]);
    expect(layer.place('wannen:vanilla')?.anchor.parent).toBe(tubs.anchor.children[0]);
  });

  it('lässt Gebratenes am ersten Tag verbrennen und sagt es', () => {
    const { host, usables, hand, said } = world();
    const layer = new StationLayer(host);
    const stove = placed({ id: 'herd', element: 'stove', x: 0, z: 0 });
    layer.add(stove);
    hand.held = { item: 'ham', on: [] };
    layer.step(0, { x: 50, z: 50 });
    expect(usables.get(stove.anchor.children[0]!)!.use(by)).toBe(true);
    for (let i = 0; i < 250; i++) layer.step(0.1, { x: 50, z: 50 });
    expect(layer.states[0]!.on?.item).toBe('ham-burnt');
    expect(said.some((line) => line.includes('Mülleimer'))).toBe(true);
  });
});
