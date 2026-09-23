/**
 * **Eine hingestellte Wand wird durchsichtig wie eine gebaute — und wieder
 * fest.** Geprüft wird der Tausch selbst (`modelGhost.ts`); welche Wand es
 * trifft, rechnet `wallGhost.test.ts` nach.
 */
import * as THREE from 'three';
import { addOutline } from '../../core/outlineShell';
import { ModelGhosts } from './modelGhost';

function model(): { root: THREE.Group; brick: THREE.Mesh; trim: THREE.Mesh } {
  const skin = new THREE.MeshStandardMaterial({ color: 0x336633 });
  const root = new THREE.Group();
  const brick = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 0.25), skin);
  const trim = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.3), skin);
  root.add(brick, trim);
  return { root, brick, trim };
}

describe('ModelGhosts', () => {
  it('macht ein Modell durchsichtig und stellt es genau so wieder her', () => {
    const ghosts = new ModelGhosts(0.25);
    const { root, brick, trim } = model();
    const own = brick.material as THREE.Material;
    ghosts.apply([root]);
    const faded = brick.material as THREE.Material;
    expect(faded).not.toBe(own);
    expect(faded.transparent).toBe(true);
    expect(faded.opacity).toBeCloseTo(0.25, 9);
    expect(faded.depthWrite).toBe(false);
    // Dasselbe Original, derselbe Zwilling — und das Original bleibt, wie es war.
    expect(trim.material).toBe(faded);
    expect(own.transparent).toBe(false);
    ghosts.clear();
    expect(brick.material).toBe(own);
    expect(trim.material).toBe(own);
    expect(ghosts.count).toBe(0);
  });

  it('tauscht nur, was sich ändert', () => {
    const ghosts = new ModelGhosts(0.25);
    const one = model();
    const two = model();
    ghosts.apply([one.root, two.root]);
    const faded = one.brick.material;
    ghosts.apply([one.root]);
    expect(one.brick.material).toBe(faded);
    expect((two.brick.material as THREE.Material).transparent).toBe(false);
    expect(ghosts.count).toBe(1);
  });

  it('nimmt den schwarzen Rand solange weg', () => {
    const ghosts = new ModelGhosts(0.25);
    const { root, brick } = model();
    const outline = addOutline(brick, { width: 0.004, maxGrow: 0.03, color: 0x000000 });
    expect(outline).not.toBeNull();
    ghosts.apply([root]);
    expect(outline!.visible).toBe(false);
    ghosts.clear();
    expect(outline!.visible).toBe(true);
  });
});
