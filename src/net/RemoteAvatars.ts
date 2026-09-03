import * as THREE from 'three';
import { SmoothPose } from './PoseSmoothing';
import type { NetSession, Peer } from './NetSession';
import type { PoseArray } from './types';

const ROLE_COLORS: Record<string, number> = {
  vr: 0x4aa8ff,
  desktop: 0x9d7bff,
  handheld: 0xff9d3d,
};

/** Poses arrive at 20 Hz; this much lag buys smooth motion without feeling limp. */
const SMOOTH_TAU = 0.06;

interface Avatar {
  group: THREE.Group;
  head: THREE.Mesh;
  hands: [THREE.Object3D, THREE.Object3D];
  poses: { head: SmoothPose; left: SmoothPose; right: SmoothPose };
  material: THREE.MeshStandardMaterial;
  /** Peers usually announce as `desktop` first and upgrade to `vr` later. */
  role: string;
}

/** Renders the other players as a simple head + hands avatar. */
export class RemoteAvatars extends THREE.Group {
  /**
   * Peer whose head is skipped — you do not want to look at the inside of a box
   * while spectating them in first person.
   */
  hiddenPeer: string | null = null;

  private readonly avatars = new Map<string, Avatar>();

  constructor(private readonly net: NetSession) {
    super();
    this.name = 'remote-avatars';
  }

  update(dt: number): void {
    for (const [id, avatar] of this.avatars) {
      if (!this.net.peers.has(id)) {
        this.remove(avatar.group);
        disposeTree(avatar.group);
        this.avatars.delete(id);
      }
    }

    for (const peer of this.net.peers.values()) {
      const inWorld = peer.world === this.net.world && peer.pose !== null && !peer.pose.hidden;
      const existing = this.avatars.get(peer.id);
      if (!inWorld) {
        if (existing) existing.group.visible = false;
        continue;
      }

      const avatar = existing ?? this.createAvatar(peer);
      avatar.group.visible = true;
      if (avatar.role !== peer.role) {
        avatar.role = peer.role;
        applyRoleColor(avatar.material, peer.role);
      }
      const pose = peer.pose!;

      avatar.poses.head.setTarget(pose.head);
      avatar.poses.head.update(dt, SMOOTH_TAU);
      avatar.head.position.copy(avatar.poses.head.position);
      avatar.head.quaternion.copy(avatar.poses.head.quaternion);
      avatar.head.visible = peer.id !== this.hiddenPeer;

      setHand(avatar.hands[0]!, avatar.poses.left, pose.left, dt);
      setHand(avatar.hands[1]!, avatar.poses.right, pose.right, dt);
    }
  }

  private createAvatar(peer: Peer): Avatar {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.1 });
    applyRoleColor(material, peer.role);

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

    const hands: THREE.Object3D[] = [];
    for (let i = 0; i < 2; i++) {
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.11), material);
      hand.visible = false;
      group.add(hand);
      hands.push(hand);
    }

    const avatar: Avatar = {
      group,
      head,
      hands: [hands[0]!, hands[1]!],
      poses: { head: new SmoothPose(), left: new SmoothPose(), right: new SmoothPose() },
      material,
      role: peer.role,
    };
    this.add(group);
    this.avatars.set(peer.id, avatar);
    return avatar;
  }

  override clear(): this {
    for (const avatar of this.avatars.values()) disposeTree(avatar.group);
    this.avatars.clear();
    return super.clear();
  }

  dispose(): void {
    this.clear();
    this.removeFromParent();
  }
}

function applyRoleColor(material: THREE.MeshStandardMaterial, role: string): void {
  const color = ROLE_COLORS[role] ?? 0xffffff;
  material.color.setHex(color);
  material.emissive.setHex(color).multiplyScalar(0.15);
}

function setHand(
  object: THREE.Object3D,
  smooth: SmoothPose,
  pose: PoseArray | null,
  dt: number,
): void {
  if (!pose) {
    object.visible = false;
    smooth.reset();
    return;
  }
  smooth.setTarget(pose);
  smooth.update(dt, SMOOTH_TAU);
  object.position.copy(smooth.position);
  object.quaternion.copy(smooth.quaternion);
  object.visible = true;
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
