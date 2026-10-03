import * as THREE from 'three';
import { FOG_ORDER, GLASS_ORDER, fogVisors } from './selfHelmet';
import { PANEL_ORDER } from '../ui/XRMenu';

describe('der Helm vor dem Menü', () => {
  it('zeichnet Glas und Beschlag im festen Durchgang, vor dem Bildschirm der Brille', () => {
    const helmet = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3 }),
    );
    helmet.add(shell, glass);

    const fogs = fogVisors(helmet);
    expect(fogs).toHaveLength(1);
    const skin = glass.getObjectByName('visor-fog') as THREE.Mesh;

    // Fest, damit three.js sie nicht erst nach dem Panel zeichnet …
    expect((glass.material as THREE.Material).transparent).toBe(false);
    expect(fogs[0]!.material.transparent).toBe(false);
    // … aber gemischt, damit sie trotzdem durchscheinen.
    expect((glass.material as THREE.Material).blending).toBe(THREE.CustomBlending);
    expect(fogs[0]!.material.blending).toBe(THREE.CustomBlending);
    // Und der Reihe nach: Glas, Beschlag, Menü.
    expect(glass.renderOrder).toBe(GLASS_ORDER);
    expect(skin.renderOrder).toBe(FOG_ORDER);
    expect(GLASS_ORDER).toBeLessThan(FOG_ORDER);
    expect(FOG_ORDER).toBeLessThan(PANEL_ORDER);
    // Die Schale bleibt, wie sie ist.
    expect(shell.renderOrder).toBe(0);
  });
});
