import * as THREE from 'three';
import { ShipEffects, type ShipEffectKind } from './ShipEffects';

type EffectPoints = THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
const KINDS: readonly ShipEffectKind[] = ['sparks', 'smoke', 'fire'];
afterEach(() => jest.restoreAllMocks());

describe('bounded station effects', () => {
  test('hundreds of mixed emits preserve the same GPU buffers and three materials', () => {
    const effects = new ShipEffects();
    const nodes = effects.root.children as EffectPoints[];
    const initial = nodes.map((node) => ({
      node,
      geometry: node.geometry,
      bounds: node.geometry.boundingSphere,
      attributes: Object.entries(node.geometry.attributes).map(([key, attribute]) => ({
        key,
        attribute,
        array: attribute.array,
      })),
    }));
    const materials = new Set<THREE.Material>();
    for (let i = 0; i < 300; i++) {
      effects.emit(KINDS[i % KINDS.length]!, { x: i % 19, y: 1.3, z: -(i % 11) });
      effects.update(1 / 60);
      expect(effects.root.children).toHaveLength(3);
      let drawn = 0;
      for (let j = 0; j < nodes.length; j++) {
        const node = nodes[j]!,
          original = initial[j]!;
        expect(node).toBe(original.node);
        expect(node.geometry).toBe(original.geometry);
        expect(node.geometry.boundingSphere).toBe(original.bounds);
        expect(node.frustumCulled).toBe(true);
        expect(node.material.depthWrite).toBe(false);
        expect(node.material.depthTest).toBe(true);
        materials.add(node.material);
        if (node.visible) drawn += node.geometry.drawRange.count;
        for (const attribute of original.attributes) {
          expect(node.geometry.attributes[attribute.key]).toBe(attribute.attribute);
          expect(node.geometry.attributes[attribute.key]!.array).toBe(attribute.array);
        }
      }
      expect(drawn).toBeLessThanOrEqual(144);
    }
    expect(materials.size).toBe(3);
    effects.root.traverse((node) => expect(node).not.toBeInstanceOf(THREE.Light));
    effects.dispose();
  });

  test('full pool replaces the oldest burst and clears particles outside the new draw range', () => {
    const effects = new ShipEffects();
    effects.emit('sparks', { x: 0, y: 1, z: 0 });
    effects.emit('fire', { x: 5, y: 1, z: 0 });
    effects.emit('sparks', { x: 10, y: 1, z: 0 });
    effects.update(0.1);
    effects.emit('smoke', { x: 52, y: 2, z: -24 });
    const reused = effects.root.children[0] as EffectPoints;
    expect(reused.material.uniforms['uKind']!.value).toBe(1);
    expect(reused.geometry.drawRange.count).toBe(32);
    const position = reused.geometry.getAttribute('position'),
      opacity = reused.geometry.getAttribute('aOpacity');
    for (let i = 0; i < 32; i++) {
      expect(position.getX(i)).toBeGreaterThan(51.8);
      expect(position.getZ(i)).toBeLessThan(-23.8);
    }
    for (let i = 32; i < 48; i++) {
      expect(position.getX(i)).toBe(0);
      expect(opacity.getX(i)).toBe(0);
    }
    effects.dispose();
  });

  test('sparks fall under gravity, fire and smoke rise, and padded bounds cover all points', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const effects = new ShipEffects();
    KINDS.forEach((kind) => effects.emit(kind, { x: 0, y: 1, z: 0 }));
    for (let i = 0; i < 8; i++) effects.update(0.1);
    const nodes = effects.root.children as EffectPoints[];
    expect(nodes[0]!.geometry.getAttribute('position').getY(0)).toBeLessThan(1);
    expect(nodes[1]!.geometry.getAttribute('position').getY(0)).toBeGreaterThan(1.1);
    expect(nodes[2]!.geometry.getAttribute('position').getY(0)).toBeGreaterThan(1.1);
    const point = new THREE.Vector3();
    for (const node of nodes) {
      const position = node.geometry.getAttribute('position'),
        sphere = node.geometry.boundingSphere!;
      expect(Number.isFinite(sphere.radius)).toBe(true);
      for (let i = 0; i < node.geometry.drawRange.count; i++) {
        point.fromBufferAttribute(position, i);
        expect(point.distanceTo(sphere.center)).toBeLessThanOrEqual(sphere.radius + 1e-6);
      }
    }
    effects.update(10);
    expect(nodes.every((node) => !node.visible)).toBe(true);
    effects.emit('fire', { x: 2, y: 0, z: 2 });
    expect(nodes.filter((node) => node.visible)).toHaveLength(1);
    effects.dispose();
  });

  test('invalid input leaves finite buffers, while long frame gaps expire active bursts', () => {
    const effects = new ShipEffects();
    effects.emit('sparks', { x: 0, y: 0, z: 0 });
    for (const dt of [NaN, Infinity, -1, 0]) effects.update(dt);
    for (const invalid of [NaN, Infinity, 1e100]) effects.emit('fire', { x: invalid, y: 1, z: 0 });
    expect(effects.root.children.filter((node) => node.visible)).toHaveLength(1);
    effects.update(0.5);
    for (const node of effects.root.children as EffectPoints[])
      for (const attribute of Object.values(node.geometry.attributes))
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    effects.update(100);
    expect(effects.root.children.every((node) => !node.visible)).toBe(true);
    effects.dispose();
  });

  test('dispose releases each owned geometry and material exactly once', () => {
    const effects = new ShipEffects(),
      parent = new THREE.Group();
    parent.add(effects.root);
    KINDS.forEach((kind) => effects.emit(kind, { x: 0, y: 0, z: 0 }));
    const nodes = effects.root.children as EffectPoints[];
    const geometries = nodes.map((node) => jest.spyOn(node.geometry, 'dispose'));
    const materials = nodes.map((node) => jest.spyOn(node.material, 'dispose'));
    effects.dispose();
    effects.dispose();
    effects.emit('sparks', { x: 0, y: 1, z: 0 });
    effects.update(0.1);
    expect(effects.root.children).toHaveLength(0);
    expect(parent.children).toHaveLength(0);
    geometries.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    materials.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
  });
});
