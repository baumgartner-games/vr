import * as THREE from 'three';
import {
  HIGHLIGHT_COLOR,
  Highlight,
  highlightFloor,
  highlightTargets,
  isHighlight,
  ringRadius,
} from './highlight';
import { deniesOutline, isOutline } from './outlineShell';

/**
 * **Was leuchtet, wenn `A` es meint** (`core/highlight.ts`).
 *
 * Geprüft wird das, was im Bild niemandem auffällt, bevor es schiefgeht: dass
 * der gelbe Saum den schwarzen nicht anfasst, dass er sich nicht selbst
 * umrandet, dass ein Ding ohne Geometrie einen Ring bekommt statt gar nichts —
 * und dass beim Weltwechsel wirklich alles wieder abgeht. Ein Saum, der
 * hängenbleibt, ist ein gelbes Ding in der nächsten Welt.
 */
function button(): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3));
  base.name = 'base';
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6));
  dome.name = 'dome';
  dome.position.y = 0.1;
  group.add(base, dome);
  return group;
}

/** Wie viele Säume unter einem Ding hängen. */
function shells(root: THREE.Object3D): THREE.Object3D[] {
  const found: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (isHighlight(node)) found.push(node);
  });
  return found;
}

describe('Die Hervorhebung', () => {
  it('nimmt jedes Netz des Dings — und keinen Saum', () => {
    const thing = button();
    expect(highlightTargets(thing).map((mesh) => mesh.name)).toEqual(['base', 'dome']);

    // Ein schwarzer Comic-Saum hängt schon daran: Er ist kein Ding der Welt.
    const black = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
    black.userData['bgvrOutline'] = true;
    thing.children[0]!.add(black);
    expect(highlightTargets(thing).map((mesh) => mesh.name)).toEqual(['base', 'dome']);

    // Unsichtbares zählt nicht — es ist ja nichts zu sehen.
    thing.children[1]!.visible = false;
    expect(highlightTargets(thing).map((mesh) => mesh.name)).toEqual(['base']);
  });

  it('hängt je Netz einen eigenen Saum an und nimmt ihn wieder ab', () => {
    const thing = button();
    const highlight = new Highlight(new THREE.Group());

    highlight.highlight(thing);
    expect(shells(thing)).toHaveLength(2);
    expect(highlight.object).toBe(thing);

    // Eigene Marke, eigenes Material, eigene Farbe — und er ist kein
    // Comic-Saum, sonst räumte ihn `stripOutlines` mit weg.
    const [first, second] = shells(thing) as THREE.Mesh[];
    expect(isOutline(first!)).toBe(false);
    expect(deniesOutline(first!)).toBe(true);
    expect(first!.castShadow).toBe(false);
    expect(first!.material).not.toBe(second!.material);
    const material = first!.material as THREE.ShaderMaterial;
    expect((material.uniforms['diffuse']!.value as THREE.Color).getHex()).toBe(HIGHLIGHT_COLOR);
    expect(material.side).toBe(THREE.BackSide);

    // Und er ist Luft für jeden Strahl.
    const hits: THREE.Intersection[] = [];
    first!.raycast(new THREE.Raycaster(), hits);
    expect(hits).toHaveLength(0);

    highlight.highlight(null);
    expect(shells(thing)).toHaveLength(0);
    expect(highlight.object).toBeNull();
  });

  it('wechselt das Ding, ohne das vorige leuchten zu lassen', () => {
    const a = button();
    const b = button();
    const highlight = new Highlight(new THREE.Group());

    highlight.highlight(a);
    highlight.highlight(b);
    expect(shells(a)).toHaveLength(0);
    expect(shells(b)).toHaveLength(2);

    // Dasselbe noch einmal zu nennen baut nichts neu.
    const before = shells(b)[0];
    highlight.highlight(b);
    expect(shells(b)[0]).toBe(before);

    highlight.dispose();
    expect(shells(b)).toHaveLength(0);
  });

  it('legt einen Ring auf den Boden, wo es keine Geometrie gibt', () => {
    const root = new THREE.Group();
    const zone = new THREE.Group();
    zone.position.set(3, 1.5, -2);
    const highlight = new Highlight(root);

    highlight.highlight(zone, 0.5);
    const ring = root.children.find((node) => isHighlight(node)) as THREE.Mesh;
    expect(ring).toBeDefined();
    expect(ring.geometry.type).toBe('RingGeometry');
    // Waagerecht, am Ort des Dings, knapp über dem genannten Boden.
    expect(ring.rotation.x).toBeCloseTo(-Math.PI / 2, 6);
    expect(ring.position.x).toBeCloseTo(3, 6);
    expect(ring.position.z).toBeCloseTo(-2, 6);
    expect(ring.position.y).toBeGreaterThan(0.5);
    expect(ring.position.y).toBeLessThan(0.6);

    highlight.highlight(null);
    expect(root.children.filter((node) => isHighlight(node))).toHaveLength(0);
  });

  it('misst den Ring nach dem Ding und nie zu klein', () => {
    const tiny = new THREE.Group();
    expect(ringRadius(tiny)).toBeCloseTo(0.4, 6);

    const wide = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2));
    wide.position.y = 1;
    // Halbe Diagonale der Grundfläche (√8 / 2 ≈ 1,414) plus eine Handbreit.
    expect(ringRadius(wide)).toBeCloseTo(Math.hypot(2, 2) / 2 + 0.1, 6);
    // Und der Boden ist die Unterkante, nicht die Mitte.
    expect(highlightFloor(wide)).toBeCloseTo(0.9, 6);
  });
});
