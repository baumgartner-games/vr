/**
 * **Das Leuchten unter dem Getragenen** (`placeGrid.ts`) — eine halbe Kachel
 * unter einer Wand unter 45° leuchtet als Dreieck.
 */
import * as THREE from 'three';
import { PlaceGrid } from './placeGrid';

describe('PlaceGrid', () => {
  it('zeigt eine halbe Kachel als Dreieck ohne die leere Ecke', () => {
    const grid = new PlaceGrid(new THREE.Group());
    grid.show(
      [
        { x: 0.5, z: 0.5 },
        { x: 1.5, z: 0.5, empty: 'nw' },
      ],
      0,
    );
    const [whole, half] = grid.group.children as THREE.Group[];
    const fill = (quad: THREE.Group) => (quad.children[0] as THREE.Mesh).geometry;
    expect(fill(whole!).getAttribute('position').count).toBe(4);
    const tri = fill(half!);
    const p = tri.getAttribute('position');
    expect(p.count).toBe(3);
    for (let i = 0; i < p.count; i++) {
      expect(p.getX(i) + p.getZ(i)).toBeGreaterThanOrEqual(-1e-6);
    }
    // Der Rahmen hat innen ein Loch: mehr als ein Dreieck.
    const frame = (half!.children[1] as THREE.Mesh).geometry;
    expect(frame.index!.count).toBeGreaterThan(3);
    grid.dispose();
  });
});
