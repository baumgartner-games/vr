import * as THREE from 'three';
import {
  IN_BOX,
  ITEM_YAW,
  KaykitDishView,
  NEST,
  ON_PLATE,
  SECOND_SCOOP,
  dishKey,
  dishLayout,
  dishSpread,
} from './dishView';
import { dish } from '../test/zones/kitchenRecipes';

describe('Gerichte als Bild aus dem Regal', () => {
  it('legt auf dem Teller das Erste in die Mulde und alles Weitere ineinander', () => {
    const layout = dishLayout('plate', [0.04, 0.1, 0.06]);
    expect(layout[0]).toEqual({ y: 0, inside: false });
    expect(layout[1]!.y).toBeCloseTo(0.04 * ON_PLATE);
    expect(layout[2]!.y).toBeCloseTo(0.04 * ON_PLATE + 0.1 * NEST);
  });

  it('setzt die Füllung einer Schüssel hinein, jede weitere etwas höher', () => {
    const layout = dishLayout('bowl', [0.1, 0.2, 0.2, 0.2]);
    expect(layout.slice(1).every((one) => one.inside)).toBe(true);
    expect(layout[1]!.y).toBe(0);
    expect(layout[3]!.y).toBeCloseTo(2 * SECOND_SCOOP * 0.2);
  });

  it('legt die Pizza in den Karton, knapp über den Boden', () => {
    expect(dishLayout('pizzabox', [0.08, 0.05])[1]).toEqual({ y: 0.08 * IN_BOX, inside: false });
  });

  it('zeigt ein Getragenes ungedreht mit Süden zu einem, die Treppe steigt von einem weg', () => {
    const views = new KaykitDishView(() => Promise.resolve(null));
    expect(views.view(dish('plate')).rotation.y).toBe(0);
    const stair = views.view(dish('stair'));
    expect(stair.rotation.y).toBe(ITEM_YAW.stair);
    // Das Modell steigt nach −x; gedreht muss das nach vorn zeigen (−z).
    const rise = new THREE.Vector3(-1, 0, 0).applyQuaternion(stair.quaternion);
    expect(rise.z).toBeCloseTo(-1);
    expect(views.view(dish('tray')).rotation.y).toBeCloseTo(Math.PI / 2);
  });

  it('baut das Bild aus Kopien der Vorlagen, sobald sie da sind', async () => {
    const templates = new Map<string, THREE.Object3D>();
    const views = new KaykitDishView((path) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.4));
      templates.set(path, mesh);
      return Promise.resolve(mesh);
    });
    const group = views.view(dish('plate', ['bun', 'patty-cooked']));
    expect(group.name).toBe(`dish:${dishKey(dish('plate', ['bun', 'patty-cooked']))}`);
    expect(group.children).toHaveLength(0);
    await Promise.resolve();
    await Promise.resolve();
    // Teller, Brötchen unten, Patty, Deckel.
    expect(group.children).toHaveLength(4);
    for (const child of group.children) expect([...templates.values()]).not.toContain(child);
    const box = new THREE.Box3().setFromObject(group);
    expect(box.min.y).toBeCloseTo(0);
  });

  it('füllt nichts mehr, was nach dem Aufräumen kommt', async () => {
    const views = new KaykitDishView(() =>
      Promise.resolve(new THREE.Mesh(new THREE.BoxGeometry())),
    );
    const group = views.view(dish('bowl', ['stew']));
    views.dispose();
    await Promise.resolve();
    await Promise.resolve();
    expect(group.children).toHaveLength(0);
  });

  it('legt die rohen Waffeln nebeneinander, in der Pfanne alles Mehrfache, gebratene gestapelt', () => {
    const raw = dish('waffle-raw', ['waffle-raw', 'waffle-raw', 'waffle-raw']);
    expect(dishSpread(raw)).toHaveLength(4);
    expect(dishSpread(dish('pan', ['waffle', 'waffle']))).toHaveLength(2);
    expect(dishSpread(dish('pan', ['patty']))).toBeNull();
    expect(dishSpread(dish('waffle', ['waffle', 'waffle']))).toBeNull();
    expect(dishSpread(dish('waffle-raw'))).toBeNull();
  });
});
