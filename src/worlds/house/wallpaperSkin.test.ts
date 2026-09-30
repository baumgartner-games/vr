import * as THREE from 'three';
import { WALLPAPER_CRATES } from '../elements/elementCatalog';
import { paintWallpaper } from './wallpaperSkin';

describe('die Bahn in der Tapetenkiste', () => {
  it('trägt das Muster ihrer Tapete, flach über die beiden langen Seiten', () => {
    const shared = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const form = new THREE.BoxGeometry(2, 1, 0.05);
    const banner = new THREE.Mesh(form, shared);
    const group = new THREE.Group();
    group.add(banner);

    expect(paintWallpaper(group, 'brick')).toBe(true);

    const painted = banner.material as THREE.MeshStandardMaterial;
    expect(painted).not.toBe(shared);
    expect(painted.map).not.toBeNull();
    // Die Form des Regals bleibt, wie sie ist; die Bahn hat ihre eigene.
    expect(banner.geometry).not.toBe(form);
    const uv = banner.geometry.getAttribute('uv');
    let most = 0;
    for (let i = 0; i < uv.count; i++) most = Math.max(most, uv.getX(i));
    // Backstein wiederholt sich jeden Meter: zwei Meter Bahn, zweimal.
    expect(most).toBeCloseTo(2);
  });

  it('lässt ein Modell ohne bekannte Tapete, wie es ist', () => {
    const shared = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), shared);
    expect(paintWallpaper(mesh, 'gibt-es-nicht')).toBe(false);
    expect(mesh.material).toBe(shared);
  });

  it('jede Tapetenkiste bemalt ihre Bahn mit genau ihrer Tapete', () => {
    for (const crate of WALLPAPER_CRATES)
      expect(crate.parts.some((part) => `wallpaper-${part.wallpaper}` === crate.gives)).toBe(true);
  });
});
