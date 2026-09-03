import * as THREE from 'three';
import { AvatarBody, type AvatarLimb } from '../core/AvatarBody';
import { SmoothPose } from './PoseSmoothing';
import type { NetSession, Peer } from './NetSession';
import type { PoseArray } from './types';

export type HandSide = 'left' | 'right';

const ROLE_COLORS: Record<string, number> = {
  vr: 0x4aa8ff,
  desktop: 0x9d7bff,
  handheld: 0xff9d3d,
};

/** Poses arrive at 20 Hz; this much lag buys smooth motion without feeling limp. */
const SMOOTH_TAU = 0.06;

const _head: AvatarLimb = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
const _left: AvatarLimb = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };
const _right: AvatarLimb = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

interface Avatar {
  body: AvatarBody;
  tag: NameTag;
  poses: { head: SmoothPose; left: SmoothPose; right: SmoothPose };
  /** Peers usually announce as `desktop` first and upgrade to `vr` later. */
  role: string;
  name: string;
}

/**
 * Draws the other players with the same body the local player has — head,
 * torso, arms and legs — so you can tell from across the room where somebody
 * is looking, where they point their portal gun and what they are holding.
 */
export class RemoteAvatars extends THREE.Group {
  /**
   * Peer whose body is skipped down to the hands — you do not want to look at
   * the inside of a torso while spectating them in first person.
   */
  hiddenPeer: string | null = null;

  private readonly avatars = new Map<string, Avatar>();
  /** Tools hung into a peer's hand, keyed `peerId:side`. */
  private readonly attachments = new Map<string, THREE.Object3D>();

  constructor(private readonly net: NetSession) {
    super();
    this.name = 'remote-avatars';
  }

  update(dt: number): void {
    for (const [id, avatar] of this.avatars) {
      if (!this.net.peers.has(id)) this.destroy(id, avatar);
    }

    for (const peer of this.net.peers.values()) {
      const inWorld = peer.world === this.net.world && peer.pose !== null && !peer.pose.hidden;
      const existing = this.avatars.get(peer.id);
      if (!inWorld) {
        if (existing) existing.body.visible = false;
        continue;
      }

      const avatar = existing ?? this.createAvatar(peer);
      avatar.body.visible = true;
      if (avatar.role !== peer.role) {
        avatar.role = peer.role;
        avatar.body.setColor(ROLE_COLORS[peer.role] ?? 0xffffff);
      }
      if (avatar.name !== peer.name) {
        avatar.name = peer.name;
        avatar.tag.setText(peer.name);
      }
      const pose = peer.pose!;

      avatar.poses.head.setTarget(pose.head);
      avatar.poses.head.update(dt, SMOOTH_TAU);
      _head.position.copy(avatar.poses.head.position);
      _head.quaternion!.copy(avatar.poses.head.quaternion);

      const left = limbOf(avatar.poses.left, pose.left, _left, dt);
      const right = limbOf(avatar.poses.right, pose.right, _right, dt);
      avatar.body.setSelfView(peer.id === this.hiddenPeer);
      avatar.body.update(dt, _head, left, right);

      avatar.tag.visible = peer.id !== this.hiddenPeer;
      avatar.tag.position.copy(_head.position).y += 0.36;
    }
  }

  /**
   * Hangs an object into a peer's hand — a portal gun, say. Pass null to take
   * it out again. Works before the avatar exists; it is applied on creation.
   */
  setAttachment(peerId: string, side: HandSide, object: THREE.Object3D | null): void {
    const key = `${peerId}:${side}`;
    const previous = this.attachments.get(key);
    if (previous === object) return;
    previous?.removeFromParent();
    if (!object) {
      this.attachments.delete(key);
      return;
    }
    this.attachments.set(key, object);
    const avatar = this.avatars.get(peerId);
    if (avatar) avatar.body.handAnchors[side === 'left' ? 0 : 1].add(object);
  }

  /** Latest smoothed world pose of a peer's hand, false when it is not tracked. */
  getHandPose(
    peerId: string,
    side: HandSide,
    position: THREE.Vector3,
    quaternion?: THREE.Quaternion,
  ): boolean {
    const avatar = this.avatars.get(peerId);
    if (!avatar) return false;
    const pose = side === 'left' ? avatar.poses.left : avatar.poses.right;
    if (!pose.primed) return false;
    position.copy(pose.position);
    quaternion?.copy(pose.quaternion);
    return true;
  }

  /** Latest smoothed world head pose of a peer. */
  getHeadPose(peerId: string, position: THREE.Vector3): boolean {
    const avatar = this.avatars.get(peerId);
    if (!avatar?.poses.head.primed) return false;
    position.copy(avatar.poses.head.position);
    return true;
  }

  private createAvatar(peer: Peer): Avatar {
    const body = new AvatarBody({ color: ROLE_COLORS[peer.role] ?? 0xffffff, hands: true });
    body.name = `avatar:${peer.id}`;
    body.setColor(ROLE_COLORS[peer.role] ?? 0xffffff);
    this.add(body);

    const tag = new NameTag(peer.name);
    this.add(tag);

    const avatar: Avatar = {
      body,
      tag,
      poses: { head: new SmoothPose(), left: new SmoothPose(), right: new SmoothPose() },
      role: peer.role,
      name: peer.name,
    };
    this.avatars.set(peer.id, avatar);

    for (const side of ['left', 'right'] as const) {
      const object = this.attachments.get(`${peer.id}:${side}`);
      if (object) body.handAnchors[side === 'left' ? 0 : 1].add(object);
    }
    return avatar;
  }

  private destroy(id: string, avatar: Avatar): void {
    for (const side of ['left', 'right'] as const) {
      this.attachments.get(`${id}:${side}`)?.removeFromParent();
    }
    avatar.body.dispose();
    avatar.tag.dispose();
    avatar.tag.removeFromParent();
    this.avatars.delete(id);
  }

  override clear(): this {
    for (const [id, avatar] of [...this.avatars]) this.destroy(id, avatar);
    this.attachments.clear();
    return super.clear();
  }

  dispose(): void {
    this.clear();
    this.removeFromParent();
  }
}

/** Floating name plate above a remote player. */
class NameTag extends THREE.Sprite {
  private readonly canvas: HTMLCanvasElement;
  private readonly texture: THREE.CanvasTexture;

  constructor(text: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    super(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    this.canvas = canvas;
    this.texture = texture;
    this.scale.set(0.5, 0.125, 1);
    this.renderOrder = 8;
    this.setText(text);
  }

  setText(text: string): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.beginPath();
    ctx.roundRect(6, 24, 500, 80, 40);
    ctx.fillStyle = 'rgba(9, 14, 26, 0.72)';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.slice(0, 18), 256, 66);
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
    this.material.dispose();
  }
}

function limbOf(
  smooth: SmoothPose,
  pose: PoseArray | null,
  target: AvatarLimb,
  dt: number,
): AvatarLimb | null {
  if (!pose) {
    smooth.reset();
    return null;
  }
  smooth.setTarget(pose);
  smooth.update(dt, SMOOTH_TAU);
  target.position.copy(smooth.position);
  target.quaternion!.copy(smooth.quaternion);
  return target;
}
