import * as THREE from 'three';
import type { PlayerRole } from '../core/types';
import type { NetMessage, NetTransport, PeerPose, PoseArray } from './types';
import type { PlayerRig } from '../core/PlayerRig';
import type { XRInput } from '../core/XRInput';

export interface Peer {
  id: string;
  role: PlayerRole;
  name: string;
  world: string;
  pose: PeerPose | null;
  lastSeen: number;
}

type Listener = (peer: Peer) => void;

const POSE_INTERVAL = 1 / 15;
const PEER_TIMEOUT = 5;

const _mat = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();

/**
 * Presence and pose sync. Deliberately transport agnostic so that asymmetric
 * sessions (a VR player plus phone players) only need a different transport.
 */
export class NetSession {
  readonly localId = `p-${Math.random().toString(36).slice(2, 8)}`;
  readonly peers = new Map<string, Peer>();

  role: PlayerRole = 'desktop';
  name = 'Spieler';
  world = 'hub';
  connected = false;

  private transport: NetTransport | null = null;
  private poseTimer = 0;
  private joinListeners: Listener[] = [];
  private leaveListeners: Listener[] = [];
  private channelListeners = new Map<string, Array<(data: unknown, from: string) => void>>();

  async connect(transport: NetTransport, room = 'lobby'): Promise<void> {
    this.transport = transport;
    await transport.connect(room, (message) => this.receive(message));
    this.connected = true;
    this.send({
      type: 'hello',
      from: this.localId,
      role: this.role,
      name: this.name,
      world: this.world,
    });
  }

  disconnect(): void {
    if (!this.transport) return;
    this.send({ type: 'bye', from: this.localId });
    this.transport.close();
    this.transport = null;
    this.connected = false;
    this.peers.clear();
  }

  onPeerJoin(listener: Listener): void {
    this.joinListeners.push(listener);
  }

  onPeerLeave(listener: Listener): void {
    this.leaveListeners.push(listener);
  }

  /** Subscribe to a world-specific message channel. */
  on(channel: string, listener: (data: unknown, from: string) => void): void {
    const list = this.channelListeners.get(channel) ?? [];
    list.push(listener);
    this.channelListeners.set(channel, list);
  }

  off(channel: string): void {
    this.channelListeners.delete(channel);
  }

  /** Broadcast a world-specific message. */
  emit(channel: string, data: unknown): void {
    this.send({ type: 'event', from: this.localId, channel, data });
  }

  setWorld(world: string): void {
    this.world = world;
    if (this.connected) this.send({ type: 'world', from: this.localId, world });
  }

  /** Sends the local pose at a fixed rate and expires stale peers. */
  update(dt: number, rig: PlayerRig, input: XRInput, now: number): void {
    if (!this.connected) return;

    this.poseTimer -= dt;
    if (this.poseTimer <= 0) {
      this.poseTimer = POSE_INTERVAL;
      rig.getHeadMatrix(_mat);
      this.send({
        type: 'pose',
        from: this.localId,
        pose: {
          head: poseFromMatrix(_mat),
          left: poseFromObject(input.get('left')?.grip ?? null),
          right: poseFromObject(input.get('right')?.grip ?? null),
        },
      });
    }

    for (const peer of [...this.peers.values()]) {
      if (now - peer.lastSeen > PEER_TIMEOUT) this.dropPeer(peer.id);
    }
  }

  private send(message: NetMessage): void {
    this.transport?.send(message);
  }

  private receive(message: NetMessage): void {
    if (message.from === this.localId) return;
    const now = performance.now() / 1000;

    switch (message.type) {
      case 'hello': {
        const peer = this.touchPeer(message.from, now);
        peer.role = message.role;
        peer.name = message.name;
        peer.world = message.world;
        // Answer so the newcomer learns about us too.
        this.send({
          type: 'hello',
          from: this.localId,
          role: this.role,
          name: this.name,
          world: this.world,
        });
        break;
      }
      case 'world': {
        this.touchPeer(message.from, now).world = message.world;
        break;
      }
      case 'pose': {
        this.touchPeer(message.from, now).pose = message.pose;
        break;
      }
      case 'event': {
        this.touchPeer(message.from, now);
        for (const listener of this.channelListeners.get(message.channel) ?? []) {
          listener(message.data, message.from);
        }
        break;
      }
      case 'bye': {
        this.dropPeer(message.from);
        break;
      }
    }
  }

  private touchPeer(id: string, now: number): Peer {
    let peer = this.peers.get(id);
    if (!peer) {
      peer = { id, role: 'desktop', name: id, world: 'hub', pose: null, lastSeen: now };
      this.peers.set(id, peer);
      for (const listener of this.joinListeners) listener(peer);
    }
    peer.lastSeen = now;
    return peer;
  }

  private dropPeer(id: string): void {
    const peer = this.peers.get(id);
    if (!peer) return;
    this.peers.delete(id);
    for (const listener of this.leaveListeners) listener(peer);
  }
}

function poseFromMatrix(matrix: THREE.Matrix4): PoseArray {
  matrix.decompose(_pos, _quat, _scale);
  return [
    round(_pos.x),
    round(_pos.y),
    round(_pos.z),
    round(_quat.x),
    round(_quat.y),
    round(_quat.z),
    round(_quat.w),
  ];
}

function poseFromObject(object: THREE.Object3D | null): PoseArray | null {
  if (!object || !object.visible) return null;
  object.updateMatrixWorld();
  return poseFromMatrix(_mat.copy(object.matrixWorld));
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
