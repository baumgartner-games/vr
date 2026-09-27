import * as THREE from 'three';
import { BallKit, ICE_SIZE, IceConeView, iceConeIn, stepIceCones } from './iceCone';

jest.mock('../../core/chefFit', () => ({ canLoadModels: () => false, CHEF_CARRY: {} }));

/**
 * **Das Hörnchen wackelt von selbst** — angemeldet (`auto`), angestoßen von
 * `stepIceCones`, in jeder Welt, die das einmal je Bild ruft.
 */
describe('Hörnchen mit Turm, für jede Welt', () => {
  it('lässt den Turm hinter dem Hörnchen zurückbleiben, wenn es sich bewegt', () => {
    const scene = new THREE.Scene();
    const cone = new IceConeView(new BallKit(), 0, true);
    cone.set({ balls: ['vanilla', 'strawberry', 'vanilla'] });
    scene.add(cone.root);
    stepIceCones(1 / 60);
    const top = (): THREE.Vector3 => cone.top(new THREE.Vector3());
    const rest = top().x - cone.root.position.x;
    // Ein Ruck nach +x: Die oberste Kugel bleibt zurück.
    for (let i = 0; i < 6; i++) {
      cone.root.position.x += 0.05;
      stepIceCones(1 / 60);
    }
    expect(top().x - cone.root.position.x).toBeLessThan(rest - 1e-3);
    expect(iceConeIn(scene)).toBe(cone);
  });

  it('vergisst ein Hörnchen, das aus dem Bild genommen wurde', () => {
    const scene = new THREE.Scene();
    const cone = new IceConeView(new BallKit(), 0, true);
    cone.set({ balls: ['vanilla'] });
    scene.add(cone.root);
    expect(cone.gone()).toBe(false);
    cone.root.removeFromParent();
    expect(cone.gone()).toBe(true);
    stepIceCones(1 / 60);
    expect(ICE_SIZE.cone).toBeGreaterThan(0);
  });
});
