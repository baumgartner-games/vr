import * as THREE from 'three';
import { applyInfoOptions, markInfoPart, syncInfoView } from './infoViewScene';
import { DEFAULT_INFO_VIEW, forgetInfoViewCache, resetInfoViews, saveInfoView } from './infoViews';
import { infoViewOptionsEntry, infoViewsMenu } from '../ui/infoViewMenu';

function lines(name: string, opacity: number): THREE.LineSegments {
  const line = new THREE.LineSegments(
    new THREE.BufferGeometry(),
    new THREE.LineBasicMaterial({ transparent: opacity < 1, opacity }),
  );
  line.name = name;
  return line;
}

describe('Info-Ansichten an der Szene', () => {
  beforeEach(() => {
    forgetInfoViewCache();
    resetInfoViews();
  });

  it('blendet Fächer aus und dämpft relativ zur ursprünglichen Deckkraft', () => {
    const root = new THREE.Group();
    const walls = markInfoPart(lines('walls', 0.8), 'walls');
    const floor = markInfoPart(lines('floor', 0.5), 'rooms', 'solid');
    const plain = lines('plain', 1);
    root.add(walls, floor, plain);

    applyInfoOptions(root, { ...DEFAULT_INFO_VIEW, flat: true, opacity: 0.4 });
    expect(walls.visible).toBe(true);
    expect(floor.visible).toBe(false);
    expect(plain.visible).toBe(true);
    expect((walls.material as THREE.Material).opacity).toBeCloseTo(0.32);
    expect((plain.material as THREE.Material).transparent).toBe(true);

    // Zweimal angewandt ist nicht doppelt gedämpft.
    applyInfoOptions(root, { ...DEFAULT_INFO_VIEW, walls: false, opacity: 0.4 });
    expect((walls.material as THREE.Material).opacity).toBeCloseTo(0.32);
    expect(walls.visible).toBe(false);
    expect(floor.visible).toBe(true);

    applyInfoOptions(root, DEFAULT_INFO_VIEW);
    expect((plain.material as THREE.Material).opacity).toBe(1);
    expect((plain.material as THREE.Material).transparent).toBe(false);
  });

  it('lässt eine eigene Ebenenwahl (keep) mitreden', () => {
    const root = new THREE.Group();
    const tiles = markInfoPart(lines('tiles', 1), 'rooms');
    root.add(tiles);
    applyInfoOptions(root, DEFAULT_INFO_VIEW, () => false);
    expect(tiles.visible).toBe(false);
  });

  it('wendet nur nach einer Änderung neu an', () => {
    const root = new THREE.Group();
    const walls = markInfoPart(lines('walls', 1), 'walls');
    root.add(walls);
    syncInfoView(root, 'nav');
    expect(walls.visible).toBe(true);
    walls.visible = false; // jemand anderes hat sie ausgeblendet
    syncInfoView(root, 'nav');
    expect(walls.visible).toBe(false);
    saveInfoView('nav', { opacity: 0.7 });
    syncInfoView(root, 'nav');
    expect(walls.visible).toBe(true);
  });

  it('baut dasselbe Optionsfeld für jede Ansicht — nur mit ihren Optionen', () => {
    const map = infoViewOptionsEntry('map');
    expect(map.children!.map((row) => row.id)).toEqual([
      'info:map:flat',
      'info:map:walls',
      'info:map:rooms',
      'info:map:actors',
      'info:map:opacity',
    ]);
    const grid = infoViewOptionsEntry('gridLines');
    expect(grid.children!.map((row) => row.id)).toEqual(['info:gridLines:opacity']);

    const said: string[] = [];
    const nav = infoViewOptionsEntry('nav', (message) => said.push(message));
    const flat = nav.children!.find((row) => row.id === 'info:nav:flat')!;
    expect(flat.checked).toBe(false);
    flat.run!(null);
    expect(flat.checked).toBe(true);
    expect(nav.sub).toBe('2D');
    const opacity = nav.children!.find((row) => row.id === 'info:nav:opacity')!;
    opacity.run!(null);
    expect(opacity.label).toBe('Deckkraft: 70 %');
    expect(said).toEqual([
      'Navigationsgitter: Nur 2D-Pfad an',
      'Navigationsgitter: Deckkraft 70 %',
    ]);

    const all = infoViewsMenu();
    expect(all.sub).toBe('Navigationsgitter');
    all.children!.find((row) => row.id === 'info:reset')!.run!(null);
    expect(all.sub).toContain('Wie jede Ansicht zeichnet');
  });
});
