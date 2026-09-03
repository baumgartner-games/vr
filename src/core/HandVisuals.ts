import * as THREE from 'three';
import type { ControllerState, XRInput } from './XRInput';

const JOINT_RADIUS_FALLBACK = 0.008;

/**
 * Procedural hands and controllers — spheres on every tracked joint, a simple
 * proxy body for controllers. No external assets, so it works offline.
 */
export class HandVisuals extends THREE.Group {
  private readonly jointMeshes = new Map<THREE.Object3D, THREE.Mesh>();
  private readonly controllerMeshes = new Map<ControllerState, THREE.Object3D>();
  private readonly jointGeometry = new THREE.SphereGeometry(1, 10, 8);
  private readonly material: THREE.MeshStandardMaterial;

  constructor(
    private readonly input: XRInput,
    color = 0xbcd6ff,
  ) {
    super();
    this.name = 'hand-visuals';
    this.material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.05,
      emissive: new THREE.Color(color).multiplyScalar(0.08),
    });
  }

  update(): void {
    for (const controller of this.input.controllers) {
      if (controller.isHand) {
        this.updateHand(controller);
        this.setControllerVisible(controller, false);
      } else {
        this.setControllerVisible(controller, controller.tracked);
      }
    }
  }

  dispose(): void {
    for (const [joint, mesh] of this.jointMeshes) joint.remove(mesh);
    this.jointMeshes.clear();
    for (const [, proxy] of this.controllerMeshes) {
      proxy.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      proxy.removeFromParent();
    }
    this.controllerMeshes.clear();
    this.jointGeometry.dispose();
    this.material.dispose();
    this.removeFromParent();
  }

  private updateHand(controller: ControllerState): void {
    for (const joint of Object.values(controller.hand.joints)) {
      if (!joint) continue;
      let mesh = this.jointMeshes.get(joint);
      if (!mesh) {
        mesh = new THREE.Mesh(this.jointGeometry, this.material);
        mesh.castShadow = false;
        joint.add(mesh);
        this.jointMeshes.set(joint, mesh);
      }
      const radius = (joint as THREE.XRJointSpace).jointRadius ?? JOINT_RADIUS_FALLBACK;
      mesh.scale.setScalar(Math.max(radius, 0.004));
    }
  }

  private setControllerVisible(controller: ControllerState, visible: boolean): void {
    let mesh = this.controllerMeshes.get(controller);
    if (!mesh && visible) {
      mesh = buildControllerProxy(this.material);
      controller.grip.add(mesh);
      this.controllerMeshes.set(controller, mesh);
    }
    if (mesh) mesh.visible = visible;
  }
}

function buildControllerProxy(material: THREE.Material): THREE.Object3D {
  const group = new THREE.Group();
  group.name = 'controller-proxy';

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.07, 4, 12), material);
  body.rotation.x = Math.PI / 2.6;
  body.position.set(0, -0.01, 0.02);
  group.add(body);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.006, 8, 24), material);
  ring.rotation.x = Math.PI / 2.6;
  ring.position.set(0, 0.012, -0.015);
  group.add(ring);

  return group;
}
