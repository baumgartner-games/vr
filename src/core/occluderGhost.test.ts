import * as THREE from 'three';
import { OccluderGhosts, nearSegment, sameThing } from './occluderGhost';
import { LAYER_SELF_ONLY } from './PlayerAvatar';

/**
 * **Von oben ist die Figur nie verdeckt** — gemeldet an einer Baumkrone, unter
 * der die Figur verschwand: _„Im von oben Modus sollte der Spieler nie
 * verdeckt sein, dann sollten die Dinge die ihn verdecken ghost gemacht
 * werden. Allgemeine Regel die immer gilt."_
 */
describe('Was die Figur von oben verdeckt, wird durchsichtig', () => {
  /** Eine Szene mit Figur im Ursprung und der Kamera schräg im Süden darüber. */
  function stage(): {
    scene: THREE.Scene;
    rig: THREE.Group;
    camera: THREE.PerspectiveCamera;
  } {
    const scene = new THREE.Scene();
    const rig = new THREE.Group();
    scene.add(rig);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);
    camera.position.set(0, 13, 9);
    camera.lookAt(0, 0.9, 0);
    camera.updateMatrixWorld(true);
    return { scene, rig, camera };
  }

  function thing(x: number, y: number, z: number, size = 2): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshStandardMaterial(),
    );
    mesh.position.set(x, y, z);
    mesh.updateMatrixWorld(true);
    return mesh;
  }

  it('macht eine Krone über der Figur durchsichtig und danach wieder fest', () => {
    const { scene, rig, camera } = stage();
    const crown = thing(0, 2.8, 0.6);
    const original = crown.material;
    scene.add(crown);
    scene.updateMatrixWorld(true);
    const ghosts = new OccluderGhosts();
    ghosts.apply(scene, camera, rig, 0);
    expect(crown.material).not.toBe(original);
    expect((crown.material as THREE.Material).transparent).toBe(true);
    expect((crown.material as THREE.Material).depthWrite).toBe(false);
    ghosts.restore();
    expect(crown.material).toBe(original);
  });

  it('lässt stehen, was daneben oder dahinter steht', () => {
    const { scene, rig, camera } = stage();
    const beside = thing(5, 1, 0);
    const behind = thing(0, 1, -3);
    scene.add(beside, behind);
    scene.updateMatrixWorld(true);
    const ghosts = new OccluderGhosts();
    ghosts.apply(scene, camera, rig, 0);
    expect(ghosts.count).toBe(0);
  });

  it('misst am Zylinder: eine Seitenwand, an der die Figur anliegt, bleibt', () => {
    const { scene, rig, camera } = stage();
    // Von Nord nach Süd, ihre Fläche genau am Rand der Kapsel (0,24 m).
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 6), new THREE.MeshStandardMaterial());
    wall.position.set(0.24 + 0.1, 1.5, 0);
    scene.add(wall);
    scene.updateMatrixWorld(true);
    const ghosts = new OccluderGhosts();
    ghosts.apply(scene, camera, rig, 0);
    expect(ghosts.count).toBe(0);
  });

  it('nimmt das ganze Ding, nicht nur das getroffene Netz', () => {
    const { scene, rig, camera } = stage();
    const tree = new THREE.Group();
    const crown = thing(0, 2.8, 0.6);
    const trunk = thing(0.6, 0.8, -0.8, 0.3);
    tree.add(crown, trunk);
    scene.add(tree);
    scene.updateMatrixWorld(true);
    const ghosts = new OccluderGhosts();
    ghosts.apply(scene, camera, rig, 0);
    expect((trunk.material as THREE.Material).transparent).toBe(true);
  });

  it('fasst den eigenen Körper, Bündel und schon Durchsichtiges nicht an', () => {
    const { scene, rig, camera } = stage();
    const body = thing(0, 1, 0.5, 1);
    rig.add(body);
    const self = thing(0, 2.8, 0.6);
    self.layers.set(LAYER_SELF_ONLY);
    camera.layers.enable(LAYER_SELF_ONLY);
    const glass = thing(0, 2.8, 0.6);
    (glass.material as THREE.Material).transparent = true;
    const batch = new THREE.InstancedMesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial(),
      1,
    );
    batch.position.set(0, 2.8, 0.6);
    scene.add(self, glass, batch);
    scene.updateMatrixWorld(true);
    const ghosts = new OccluderGhosts();
    ghosts.apply(scene, camera, rig, 0);
    expect(ghosts.count).toBe(0);
  });

  it('rechnet die Vorprobe und die Grenze eines Dings', () => {
    const a = new THREE.Vector3(0, 0, 0);
    const b = new THREE.Vector3(0, 10, 0);
    expect(nearSegment(a, b, new THREE.Vector3(1, 5, 0), 0.5, 0.4)).toBe(false);
    expect(nearSegment(a, b, new THREE.Vector3(0.8, 5, 0), 0.5, 0.4)).toBe(true);
    expect(nearSegment(a, b, new THREE.Vector3(0, 12, 0), 1, 0.4)).toBe(false);
    // Krone 3 m, Baum samt Stamm 3,2 m: ein Ding. Stuhl 0,6 m in einer Welt von 6 m: nicht.
    expect(sameThing(3, 3.2)).toBe(true);
    expect(sameThing(0.6, 6)).toBe(false);
    expect(sameThing(7, 9)).toBe(false);
  });
});
