import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import type { Dish } from '../test/zones/kitchenRecipes';
import { elementById } from './elementCatalog';
import type { ElementSpot } from './elementPlace';
import type { PlacedElement } from './elementView';
import { REFRESH_RANGE, StationLayer, TUB_SHIFT, type StationHost } from './stationLayer';

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
    base: null,
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

/** Nah genug, dass sich Kiste und Brett (Anker bei x 0,5 und 1,5, z 1) anmelden — zu weit zum Schneiden. */
const MID = { x: 1, z: 3.5 };
const FAR = { x: 50, z: 50 };

describe('Stationen auf Spielelementen', () => {
  it('meldet an, nimmt aus der Kiste, legt aufs Brett und schneidet nur mit jemandem davor', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-lettuce', x: 0, z: 0 });
    const board = placed({ id: 'brett', element: 'board', x: 1, z: 0 });
    expect(layer.add(crate)).toBe(1);
    expect(layer.add(board)).toBe(1);
    layer.step(0, MID);
    // Die leere Kiste gibt her, das leere Brett meldet sich nicht.
    const crateAnchor = crate.anchor.children[0]!;
    const boardAnchor = board.anchor.children[0]!;
    expect(usables.get(crateAnchor)?.usePrompt?.()).toMatch(/nehmen/);
    expect(usables.has(boardAnchor)).toBe(false);
    expect(usables.get(crateAnchor)!.use(by)).toBe(true);
    expect(hand.held?.item).toBe('lettuce');
    layer.step(0, MID);
    expect(usables.get(boardAnchor)!.use(by)).toBe(true);
    expect(hand.held).toBeNull();
    // Weit weg: nichts geschnitten.
    for (let i = 0; i < 50; i++) layer.step(0.1, FAR);
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

  it('macht aus einer Kiste, deren Inhalt die Küche nicht kennt, keine Station', () => {
    const { host } = world();
    const layer = new StationLayer(host);
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const crate = placed({ id: 'salami', element: 'crate-pepperoni', x: 0, z: 0 });
      expect(layer.add(crate)).toBe(0);
      expect(warn).toHaveBeenCalledWith(expect.stringMatching(/salami.*pepperoni/));
    } finally {
      warn.mockRestore();
    }
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
    layer.step(0, { x: 0.5, z: 1 });
    expect(usables.get(stove.anchor.children[0]!)!.use(by)).toBe(true);
    for (let i = 0; i < 250; i++) layer.step(0.1, FAR);
    expect(layer.states[0]!.on?.item).toBe('ham-burnt');
    expect(said.some((line) => line.includes('Mülleimer'))).toBe(true);
  });

  it('meldet nur in der Nähe an, meldet beim Weggehen ab — und brät trotzdem weiter', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-steak', x: 0, z: 0 });
    const stove = placed({ id: 'herd', element: 'stove', x: 10, z: 0 });
    layer.add(crate);
    layer.add(stove);
    const crateAnchor = crate.anchor.children[0]!;
    const stoveAnchor = stove.anchor.children[0]!;
    // An der Kiste: Sie meldet sich, der Herd zehn Meter weiter nicht.
    layer.step(0, { x: 0.5, z: 2 });
    expect(usables.has(crateAnchor)).toBe(true);
    expect(usables.has(stoveAnchor)).toBe(false);
    // Ein Patty auf den Herd — dafür muss man hin.
    expect(usables.get(crateAnchor)!.use(by)).toBe(true);
    expect(hand.held?.item).toBe('patty');
    layer.step(0, { x: 10.5, z: 2 });
    expect(usables.has(crateAnchor)).toBe(false);
    expect(usables.get(stoveAnchor)!.use(by)).toBe(true);
    // Weggehen: abgemeldet, und das Patty brät ohne jemanden davor fertig.
    const away = { x: 10.5, z: 1 + REFRESH_RANGE + 0.5 };
    layer.step(0, away);
    expect(usables.has(stoveAnchor)).toBe(false);
    for (let i = 0; i < 100; i++) layer.step(0.1, FAR);
    expect(layer.states[1]!.on?.item).toBe('patty-cooked');
    expect(usables.has(stoveAnchor)).toBe(false);
    // Zurück: wieder angemeldet, und zwar zum Nehmen.
    layer.step(0, { x: 10.5, z: 2 });
    expect(usables.get(stoveAnchor)?.usePrompt?.()).toMatch(/nehmen/);
  });

  it('nimmt ein Element zum Umstellen heraus und stellt es mit allem, was darauf lag, wieder hin', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-lettuce', x: 0, z: 0 });
    const board = placed({ id: 'brett', element: 'board', x: 1, z: 0 });
    layer.add(crate);
    layer.add(board);
    hand.held = { item: 'tomato', on: [] };
    layer.step(0, MID);
    expect(usables.get(board.anchor.children[0]!)!.use(by)).toBe(true);
    expect(layer.states[1]!.on?.item).toBe('tomato');
    // Das Brett geht zum Umstellen weg — abgemeldet, der Stand kommt mit.
    const keep = layer.remove(board.anchor);
    expect(keep.map((state) => state.on?.item)).toEqual(['tomato']);
    expect(layer.states).toHaveLength(1);
    expect(usables.has(board.anchor.children[0]!)).toBe(false);
    // Die Kiste davor rückt in der Liste nach vorn und nimmt immer noch.
    hand.held = null;
    layer.step(0, MID);
    expect(usables.get(crate.anchor.children[0]!)!.use(by)).toBe(true);
    expect((hand.held as Dish | null)?.item).toBe('lettuce');
    // An der neuen Stelle liegt die Tomate wieder darauf.
    const moved = placed({ id: 'brett', element: 'board', x: 4, z: 0 });
    layer.add(moved, keep);
    expect(layer.states[1]!.on?.item).toBe('tomato');
    // Frisch hingestellt ohne Stand: leer.
    layer.add(placed({ id: 'brett-2', element: 'board', x: 6, z: 0 }), keep);
    expect(layer.states[2]!.on).toBeNull();
  });
});
