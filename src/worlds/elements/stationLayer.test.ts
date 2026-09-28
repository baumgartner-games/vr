import * as THREE from 'three';
import type { Usable } from '../../core/usable';
import type { StationState } from '../plateup/plateUpStations';
import type { Dish } from '../test/zones/kitchenRecipes';
import { elementById } from './elementCatalog';
import type { ElementSpot } from './elementPlace';
import type { PlacedElement } from './elementView';
import { REFRESH_RANGE, StationLayer, type StationHost } from './stationLayer';

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

/** Nah genug, dass sich Kiste und Brett (Anker in der Mitte, bei x 0,5 und 1,5, z 0,5) anmelden — zu weit zum Schneiden. */
const MID = { x: 1, z: 3 };
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

  it('lässt Gebratenes am ersten Tag verbrennen und sagt es', () => {
    const { host, usables, hand, said } = world();
    const layer = new StationLayer(host);
    const stove = placed({ id: 'herd', element: 'stove', x: 0, z: 0 });
    layer.add(stove);
    hand.held = { item: 'ham', on: [] };
    layer.step(0, { x: 0.5, z: 1 });
    expect(usables.get(stove.anchor.children[0]!)!.use(by)).toBe(true);
    for (let i = 0; i < 250; i++) layer.step(0.1, FAR);
    expect(layer.states[0]!.on).toEqual({ item: 'pan', on: ['ham-burnt'] });
    expect(said.some((line) => line.includes('Mülleimer'))).toBe(true);
  });

  it('meldet nur in der Nähe an, meldet beim Weggehen ab — und brät trotzdem weiter', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'kiste', element: 'crate-patties', x: 0, z: 0 });
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
    expect(layer.states[1]!.on).toEqual({ item: 'pan', on: ['patty-cooked'] });
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

  it('lässt beim Ablegen das Möbel leuchten und beim Nehmen, was darauf liegt', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const shows = (one: PlacedElement): THREE.Object3D | null | undefined =>
      usables.get(one.anchor.children[0]!)?.highlight?.();
    const parts = (): THREE.Mesh[] => [new THREE.Mesh(new THREE.BoxGeometry(1, 0.5, 1))];
    const crate = {
      ...placed({ id: 'kiste', element: 'crate-lettuce', x: 0, z: 0 }),
      parts: parts(),
    };
    const top = { ...placed({ id: 'platte', element: 'counter', x: 1, z: 0 }), parts: parts() };
    const bin = { ...placed({ id: 'eimer', element: 'bin', x: 2, z: 0 }), parts: parts() };
    for (const one of [crate, top, bin]) layer.add(one);
    layer.step(0, MID);
    // Die Kiste samt Inhalt beim Nehmen — ihr Bild hängt unter der Station.
    expect(shows(crate)).toBe(crate.parts[0]!.parent);
    expect(crate.parts[0]!.parent?.parent).toBe(crate.anchor.children[0]);
    expect(usables.get(crate.anchor.children[0]!)!.use(by)).toBe(true);
    layer.step(0, MID);
    // Mit dem Salat in der Hand: die Arbeitsplatte zum Ablegen, der Eimer zum Wegwerfen.
    expect(shows(top)).toBe(top.parts[0]!.parent);
    expect(shows(bin)).toBe(bin.parts[0]!.parent);
    expect(usables.get(top.anchor.children[0]!)!.use(by)).toBe(true);
    expect(hand.held).toBeNull();
    layer.step(0, MID);
    // Liegt der Salat, meint `A` den Salat.
    expect(shows(top)?.name).toBe('view:lettuce');
  });

  it('schneidet auch, wer hinter dem Brett steht — gemessen wird von der Mitte der Platte', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const board = placed({ id: 'brett', element: 'board', x: 0, z: 0 });
    layer.add(board);
    hand.held = { item: 'lettuce', on: [] };
    // Hinter dem Brett: die Vorderkante (z = 1) ist 1,5 m weg, die Mitte 1 m.
    const behind = { x: 0.5, z: -0.5 };
    layer.step(0, behind);
    expect(usables.get(board.anchor.children[0]!)!.use(by)).toBe(true);
    for (let i = 0; i < 100; i++) layer.step(0.1, behind);
    expect(layer.states[0]!.on?.item).toBe('lettuce-cut');
  });

  it('hält im Tellerstapel höchstens vier Teller, wie das Abtropfgitter der Sandbox', () => {
    const { host, usables, hand, said } = world();
    const layer = new StationLayer(host);
    const rack = placed({ id: 'teller', element: 'plate-stack', x: 0, z: 0 });
    layer.add(rack);
    const station = rack.anchor.children[0]!;
    expect(layer.states[0]!.stock).toBe(4);
    layer.step(0, MID);
    // Vier Teller in den Fächern.
    const shown = station.children[0]!.children.find((one) => one.name === 'rack-plates')!;
    expect(shown.children).toHaveLength(4);
    // Einen nehmen, zurückstellen — ein fünfter geht nicht hinein.
    expect(usables.get(station)!.use(by)).toBe(true);
    expect(hand.held?.item).toBe('plate');
    expect(layer.states[0]!.stock).toBe(3);
    layer.step(0, MID);
    expect(usables.get(station)!.use(by)).toBe(true);
    expect(layer.states[0]!.stock).toBe(4);
    hand.held = { item: 'plate', on: [] };
    layer.step(0, MID);
    expect(usables.get(station)!.use(by)).toBe(false);
    expect(said.at(-1)).toMatch(/4 Teller/);
    // Leer geräumt, sagt es das auch.
    hand.held = null;
    for (let i = 0; i < 4; i++) {
      layer.step(0, MID);
      usables.get(station)!.use(by);
      hand.held = null;
    }
    expect(layer.states[0]!.stock).toBe(0);
    layer.step(0, MID);
    expect(usables.get(station)!.use(by)).toBe(false);
    expect(said.at(-1)).toMatch(/kein Teller mehr/);
  });

  it('gibt aus der Tellerkiste Teller, so viele man will', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const crate = placed({ id: 'tellerkiste', element: 'crate-plates', x: 0, z: 0 });
    layer.add(crate);
    const station = crate.anchor.children[0]!;
    for (let i = 0; i < 10; i++) {
      hand.held = null;
      layer.step(0, MID);
      expect(usables.get(station)!.use(by)).toBe(true);
      expect(hand.held).toEqual({ item: 'plate', on: [] });
    }
  });

  it('piept langsam, solange es aufs Verkohlen zuläuft, schnell vor dem Feuer — und der Löscher löscht', () => {
    const { host, said } = world();
    const tones: boolean[] = [];
    host.warnTone = (fast) => tones.push(fast);
    const layer = new StationLayer(host);
    const stove = placed({ id: 'herd', element: 'stove', x: 0, z: 0 });
    layer.add(stove);
    // Die Pfanne mit einem gebratenen Patty.
    (layer as unknown as { stations: StationState[] }).stations = layer.states.map((one) => ({
      ...one,
      on: { item: 'pan', on: ['patty-cooked'] },
    }));
    for (let i = 0; i < 30; i++) layer.step(0.1, FAR);
    expect(tones.length).toBeGreaterThan(0);
    expect(tones.every((fast) => !fast)).toBe(true);
    tones.length = 0;
    for (let i = 0; i < 150; i++) layer.step(0.1, FAR);
    expect(layer.states[0]!.on).toEqual({ item: 'pan', on: ['patty-burnt'] });
    for (let i = 0; i < 90; i++) layer.step(0.1, FAR);
    expect(tones.some((fast) => fast)).toBe(true);
    expect(layer.states[0]!.fire).toBe(true);
    expect(said).toContain('Der Herd brennt — Feuerlöscher holen!');
    // Weggezielt: nichts. Auf den Herd (Mitte bei 0,5 | 0,5) gezielt: gelöscht.
    const from = { x: 0.5, z: 2 };
    expect(layer.extinguish(0.1, true, from, { x: 0, z: 1 })).toBe(false);
    let spraying = false;
    for (let i = 0; i < 20; i++) {
      const now = layer.extinguish(0.1, true, from, { x: 0, z: -1 });
      spraying ||= now;
    }
    expect(spraying).toBe(true);
    expect(layer.states[0]!.fire).toBe(false);
    expect(layer.states[0]!.on).toEqual({ item: 'pan', on: [] });
    expect(said).toContain('Feuer gelöscht');
  });

  it('lässt auf der sicheren Kochstelle braten, aber nie verkohlen', () => {
    const { host, usables, hand } = world();
    const layer = new StationLayer(host);
    const griddle = placed({ id: 'platte', element: 'griddle', x: 0, z: 0 });
    layer.add(griddle);
    hand.held = { item: 'patty', on: [] };
    layer.step(0, MID);
    expect(usables.get(griddle.anchor.children[0]!)!.use(by)).toBe(true);
    for (let i = 0; i < 600; i++) layer.step(0.1, FAR);
    expect(layer.states[0]!.on).toEqual({ item: 'patty-cooked', on: [] });
    expect(layer.states[0]!.fire).toBeFalsy();
  });

  it('lässt die Spüle beim Füllen kaputtgehen — die Rohrzange dichtet sie ab', () => {
    const { host, usables, hand, said } = world();
    host.random = () => 0;
    const layer = new StationLayer(host);
    const sink = placed({ id: 'spuele', element: 'sink', x: 0, z: 0 });
    layer.add(sink);
    const station = sink.anchor.children[0]!;
    // Wasser im Becken, von Haus aus.
    expect(station.getObjectByName('station-sink-water')?.visible).toBe(true);
    hand.held = { item: 'pot', on: [] };
    layer.step(0, MID);
    expect(usables.get(station)!.use(by)).toBe(true);
    expect(hand.held).toEqual({ item: 'pot', on: ['water'] });
    expect(layer.states[0]!.leak?.leaking).toBe(true);
    expect(said.at(-1)).toMatch(/spritzt/);
    expect(layer.leakingAt(new THREE.Vector3())).not.toBeNull();
    layer.step(0, MID);
    expect(station.getObjectByName('station-sink-water')?.visible).toBe(false);
    // Ohne Zange geht nichts, mit Zange und davorstehen wird es dicht.
    hand.held = { item: 'pliers', on: [] };
    layer.step(0, MID);
    expect(usables.get(station)!.use(by)).toBe(true);
    const near = { x: 0.5, z: 1.2 };
    for (let i = 0; i < 50; i++) layer.step(0.1, near);
    expect(layer.states[0]!.leak?.leaking).toBe(false);
    expect(layer.leakingAt(new THREE.Vector3())).toBeNull();
  });
});
