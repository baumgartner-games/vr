import * as THREE from 'three';
import type { NetSession, Peer } from './NetSession';
import type { PoseArray } from './types';

const ROLE_COLORS: Record<string, number> = {
  vr: 0x4aa8ff,
  desktop: 0x9d7bff,
  handheld: 0xff9d3d,
};

/** Renders the other players as a simple head + hands avatar. */
export class RemoteAvatars extends THREE.Group {
  private readonly avatars = new Map<string, THREE.Group>();

  constructor(private readonly net: NetSession) {
    super();
    this.name = 'remote-avatars';
  }

  update(): void {
    for (const [id, avatar] of this.avatars) {
      if (!this.net.peers.has(id)) {
        this.remove(avatar);
        disposeTree(avatar);
        this.avatars.delete(id);
      }
    }

    for (const peer of this.net.peers.values()) {
      if (peer.world !== this.net.world || !peer.pose) continue;
      const avatar = this.avatars.get(peer.id) ?? this.createAvatar(peer);
      applyPose(avatar.children[0]!, peer.pose.head);
      setHand(avatar.children[1]!, peer.pose.left);
      setHand(avatar.children[2]!, peer.pose.right);
    }
  }

  private createAvatar(peer: Peer): THREE.Group {
    const color = ROLE_COLORS[peer.role] ?? 0xffffff;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.1,
      emissive: new THREE.Color(color).multiplyScalar(0.15),
    });

    const group = new THREE.Group();
    group.name = `avatar:${peer.id}`;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.22, 0.22), material);
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.17, 0.07, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x0a0f1c }),
    );
    visor.position.set(0, 0.01, -0.115);
    head.add(visor);
    group.add(head);

    for (let i = 0; i < 2; i++) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.11), material);
      hand.visible = false;
      group.add(hand);
    }

    this.add(group);
    this.avatars.set(peer.id, group);
    return group;
  }

  dispose(): void {
    for (const avatar of this.avatars.values()) disposeTree(avatar);
    this.avatars.clear();
    this.clear();
    this.removeFromParent();
  }
}

function applyPose(object: THREE.Object3D, pose: PoseArray): void {
  object.position.set(pose[0], pose[1], pose[2]);
  object.quaternion.set(pose[3], pose[4], pose[5], pose[6]);
  object.visible = true;
}

function setHand(object: THREE.Object3D, pose: PoseArray | null): void {
  if (!pose) {
    object.visible = false;
    return;
  }
  applyPose(object, pose);
}

function disposeTree(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material?.dispose();
  });
}
