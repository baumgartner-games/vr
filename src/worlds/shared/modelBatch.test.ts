import * as THREE from 'three';
import { ModelBatch, type BatchItem } from './modelBatch';

/**
 * Die Wände der Welt als Bündel (`modelBatch.ts`): Aus den Augen zeichnet das
 * Bündel, einzeln steht nur, was in der Hand liegt oder aufleuchtet, und von
 * oben steht alles einzeln wie vorher.
 */

const geometry = new THREE.BoxGeometry(2, 2.8, 0.27);

/** Eine Wand wie aus dem Regal: Stück → Hülle → Netz, jede mit eigenem Material. */
function wall(root: THREE.Object3D, x: number, z: number, color = 0x8b9099): BatchItem {
  const object = new THREE.Group();
  const shell = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color }));
  mesh.castShadow = true;
  shell.add(mesh);
  object.add(shell);
  object.position.set(x, 1.4, z);
  root.add(object);
  return { object, removed: false };
}

function meshOf(item: BatchItem): THREE.Mesh {
  let found: THREE.Mesh | null = null;
  item.object.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) found = node as THREE.Mesh;
  });
  return found!;
}

function bundles(batch: ModelBatch): THREE.InstancedMesh[] {
  return batch.group.children as THREE.InstancedMesh[];
}

const never = (): boolean => false;

describe('ModelBatch', () => {
  it('zeichnet gleiche Wände eines Feldes als ein Bündel, erst wenn nichts mehr dazukommt', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 3, 1), wall(root, 5, 1)];
    const batch = new ModelBatch(root, 16, 0.5);
    batch.step(0.1, true, items, never);
    // Noch nicht still genug: alles steht einzeln, wie vorher.
    expect(batch.batched).toBe(false);
    expect(items.every((item) => meshOf(item).visible)).toBe(true);
    for (let i = 0; i < 6; i++) batch.step(0.1, true, items, never);
    expect(batch.batched).toBe(true);
    expect(batch.bundleCount).toBe(1);
    const [bundle] = bundles(batch);
    expect(bundle!.count).toBe(3);
    expect(bundle!.visible).toBe(true);
    expect(bundle!.castShadow).toBe(true);
    // Die Stücke bleiben stehen, nur unsichtbar — und fangen weiter Strahlen.
    expect(items.every((item) => !meshOf(item).visible && item.object.parent === root)).toBe(true);
    // Das Bündel selbst fängt keinen.
    const hits: THREE.Intersection[] = [];
    bundle!.raycast(new THREE.Raycaster(), hits);
    expect(hits).toHaveLength(0);
  });

  it('trennt nach Feld und nach Aussehen', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 40, 1), wall(root, 3, 1, 0xff0000)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    expect(batch.bundleCount).toBe(3);
  });

  it('stellt ein Stück in der Hand einzeln hin, ohne neu zu bauen', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 3, 1)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    const [bundle] = bundles(batch);
    const held = items[1]!;
    batch.step(0.1, true, items, (item) => item === held);
    expect(bundles(batch)[0]).toBe(bundle);
    expect(meshOf(held).visible).toBe(true);
    expect(meshOf(items[0]!).visible).toBe(false);
    const matrix = new THREE.Matrix4();
    bundle!.getMatrixAt(1, matrix);
    expect(new THREE.Vector3().setFromMatrixScale(matrix).length()).toBe(0);
    // Und wieder zurück ins Bündel.
    batch.step(0.1, true, items, never);
    expect(meshOf(held).visible).toBe(false);
    bundle!.getMatrixAt(1, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(3);
  });

  it('legt die Matrizen gebündelter Stücke still und gibt sie für einzelne wieder frei', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    const object = items[0]!.object;
    expect(object.matrixAutoUpdate).toBe(false);
    expect(meshOf(items[0]!).matrixWorldAutoUpdate).toBe(false);
    // Die Weltmatrix steht trotzdem richtig — Greifen und Strahlen brauchen sie.
    expect(new THREE.Vector3().setFromMatrixPosition(meshOf(items[0]!).matrixWorld).x).toBe(1);
    batch.step(0.1, true, items, () => true);
    expect(object.matrixAutoUpdate).toBe(true);
    expect(meshOf(items[0]!).matrixWorldAutoUpdate).toBe(true);
  });

  it('baut neu, wenn ein Stück woanders steht, und zeigt bis dahin alles einzeln', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 3, 1)];
    const batch = new ModelBatch(root, 16, 0.5);
    for (let i = 0; i < 7; i++) batch.step(0.1, true, items, never);
    expect(batch.batched).toBe(true);
    items[1]!.object.position.x = 7;
    batch.step(0.1, true, items, never);
    expect(batch.batched).toBe(false);
    expect(meshOf(items[1]!).visible).toBe(true);
    for (let i = 0; i < 7; i++) batch.step(0.1, true, items, never);
    expect(batch.batched).toBe(true);
    const matrix = new THREE.Matrix4();
    bundles(batch)[0]!.getMatrixAt(1, matrix);
    expect(new THREE.Vector3().setFromMatrixPosition(matrix).x).toBeCloseTo(7);
  });

  it('baut neu, wenn ein Stück wegfällt', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 3, 1)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    const left = [items[0]!];
    batch.step(0.1, true, left, never);
    batch.step(0.1, true, left, never);
    expect(bundles(batch)[0]!.count).toBe(1);
  });

  it('zeigt von oben alles einzeln — dort wird je Stück durchsichtig', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1), wall(root, 3, 1)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    batch.step(0.1, false, items, never);
    expect(batch.batched).toBe(false);
    expect(bundles(batch).every((one) => !one.visible)).toBe(true);
    expect(items.every((item) => meshOf(item).visible)).toBe(true);
    expect(items[0]!.object.matrixAutoUpdate).toBe(true);
    batch.step(0.1, true, items, never);
    expect(batch.batched).toBe(true);
  });

  it('räumt beim Wegwerfen alles zurück', () => {
    const root = new THREE.Group();
    const items = [wall(root, 1, 1)];
    const batch = new ModelBatch(root, 16, 0);
    batch.step(0.1, true, items, never);
    batch.step(0.1, true, items, never);
    batch.dispose();
    expect(batch.group.parent).toBeNull();
    expect(meshOf(items[0]!).visible).toBe(true);
  });
});
