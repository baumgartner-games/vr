import * as THREE from 'three';
import { StaticDecor } from './staticDecor';

/**
 * Die Deko einer Welt als Bündel (`staticDecor.ts`): gleiche Stücke werden ein
 * Zeichenaufruf, und zwar aus den Augen **und** von oben — und was die Welt
 * abräumt, fällt aus dem Bündel.
 */

const geometry = new THREE.BoxGeometry(0.5, 1, 0.5);

function lamp(root: THREE.Object3D, x: number): THREE.Object3D {
  const object = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xeeeeee }));
  mesh.castShadow = true;
  object.add(mesh);
  object.position.set(x, 0, 0);
  root.add(object);
  return object;
}

function settle(decor: StaticDecor): void {
  for (let i = 0; i < 8; i++) decor.step(0.1);
}

describe('StaticDecor', () => {
  it('zeichnet gleiche Stücke als ein Bündel, sobald nichts mehr dazukommt', () => {
    const root = new THREE.Group();
    const decor = new StaticDecor(root);
    const lamps = [lamp(root, 0), lamp(root, 2), lamp(root, 4)];
    for (const one of lamps) decor.add(one);
    decor.step(0.1);
    expect(decor.batched).toBe(false);
    settle(decor);
    expect(decor.batched).toBe(true);
    expect(decor.bundleCount).toBe(1);
    // Die Stücke bleiben stehen, nur ihre Netze sind unsichtbar.
    for (const one of lamps) {
      expect(one.parent).toBe(root);
      expect(one.children[0]!.visible).toBe(false);
    }
  });

  it('lässt ein abgeräumtes Stück fallen und baut neu', () => {
    const root = new THREE.Group();
    const decor = new StaticDecor(root);
    const lamps = [lamp(root, 0), lamp(root, 2)];
    for (const one of lamps) decor.add(one);
    settle(decor);
    lamps[1]!.removeFromParent();
    settle(decor);
    expect(decor.size).toBe(1);
    const bundle = root.getObjectByName('static-decor')!.children[0] as THREE.InstancedMesh;
    expect(bundle.count).toBe(1);
  });

  it('gibt beim Aufräumen alles wieder einzeln frei', () => {
    const root = new THREE.Group();
    const decor = new StaticDecor(root);
    const one = lamp(root, 0);
    decor.add(one);
    settle(decor);
    decor.dispose();
    expect(one.children[0]!.visible).toBe(true);
    expect(one.matrixAutoUpdate).toBe(true);
    expect(root.getObjectByName('static-decor')).toBeUndefined();
  });
});
