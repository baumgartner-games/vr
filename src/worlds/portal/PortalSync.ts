import * as THREE from 'three';
import { weight } from '../../net/PoseSmoothing';
import type { NetSession } from '../../net/NetSession';
import type { PhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import type { PropKind } from './props';

/** Position + quaternion, flattened. */
export type Pose7 = [number, number, number, number, number, number, number];
export type { PropKind };
export type PortalKey = 'a' | 'b';
/**
 * A placed portal. The surface bit travels along: the chamber is built the
 * same way everywhere, so the number means the same wall on every machine, and
 * without it the receiving side would dissolve the wrong surface.
 */
export interface PortalState {
  pose: Pose7;
  group: number;
}
/** What a hand is busy with, so the others can draw it. */
export type HandBusy = { tool: string } | { grab: string } | null;

/** World traffic rides on this channel of the session. */
const CHANNEL = 'portal';
/** Transform stream. Fast enough for dominoes, cheap enough for a data channel. */
const SEND_INTERVAL = 1 / 20;
/** Insurance against a lost packet: the simulating peer resends everything. */
const SNAPSHOT_INTERVAL = 2;
/** Chases the received pose instead of snapping to it. */
const FOLLOW_TAU = 0.05;
/**
 * Past this gap the smoothing is skipped. A dropped packet, a stutter or a
 * portal jump would otherwise have the body crawl across the room.
 */
const SNAP_DISTANCE = 0.6;
const MOVE_EPSILON = 0.0015;

interface Snapshot {
  /** Props that only exist because somebody conjured them. */
  spawned: Array<{ id: string; kind: PropKind; pose: Pose7 }>;
  bodies: Array<[string, ...Pose7]>;
  portals: Array<[PortalKey, PortalState | null]>;
  owners: Array<[string, string]>;
}

type Message =
  /** "I just arrived, somebody tell me what the room looks like." */
  | { t: 'hello' }
  | { t: 'state'; state: Snapshot }
  | { t: 'move'; items: Array<[string, ...Pose7]> }
  | { t: 'portal'; key: PortalKey; state: PortalState | null }
  | { t: 'spawn'; id: string; kind: PropKind; pose: Pose7 }
  /** Somebody rubbed a prop out; it goes on every machine. */
  | { t: 'despawn'; id: string }
  /** Claim or hand back a prop. `vel` carries the throw when it is handed back. */
  | { t: 'own'; id: string; owner: string | null; vel?: [number, number, number] }
  | { t: 'reset' }
  /**
   * Somebody painted a prop; colour *and* material are part of the shared
   * world. `material` fehlt in Nachrichten älterer Mitspieler — dann bleibt
   * das Material, wie es war, und nur die Farbe wechselt.
   */
  | { t: 'paint'; id: string; color: number; material?: string | null }
  | { t: 'hands'; left: HandBusy; right: HandBusy };

export interface PortalSyncOptions {
  net: NetSession;
  physics: PhysicsWorld;
  /** Every synced prop, by its shared id. */
  bodies: Map<string, PhysicsBody>;
  /** True while a local hand or a remote pull owns the prop's transform. */
  heldLocally(id: string): boolean;
  /** Somebody else claimed a prop we are holding — let go of it. */
  dropLocal(id: string): void;
  /** Conjure a prop that another player pulled out of their bag. */
  spawnRemote(id: string, kind: PropKind, pose: Pose7): void;
  /** Somebody else deleted a prop. */
  despawnRemote(id: string): void;
  /** Move (or clear, with `null`) a portal because somebody else shot it. */
  applyPortal(key: PortalKey, state: PortalState | null): void;
  portalState(key: PortalKey): PortalState | null;
  /** Props that came out of a bag, so a joining player can rebuild them. */
  spawnedProps(): Array<{ id: string; kind: PropKind }>;
  resetRemote(): void;
  /** Somebody else repainted a prop. */
  paintRemote(id: string, color: number, material?: string | null): void;
  /** What the peers are holding, for the hand attachments. */
  onHands(peerId: string, left: HandBusy, right: HandBusy): void;
}

const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();

interface Follow {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  primed: boolean;
}

/**
 * Keeps the props and the two portals identical on every screen.
 *
 * One peer simulates — the one with the lowest id, which everybody can work
 * out on their own — and streams the resulting transforms. Grabbing a prop
 * claims it: from then on the grabbing peer streams that one body and the
 * simulating peer just plays it back, which is what keeps a carried cube
 * glued to the hand that carries it instead of rubber-banding.
 */
export class PortalSync {
  /** Peer that runs the physics for everyone, including us. */
  host = '';

  private readonly owners = new Map<string, string>();
  private readonly follows = new Map<string, Follow>();
  private readonly kinematic = new Set<string>();
  private readonly lastSent = new Map<string, Pose7>();
  private readonly localHands: { left: HandBusy; right: HandBusy } = { left: null, right: null };
  private timer = 0;
  private snapshotTimer = 0;
  private counter = 0;
  private greeted = false;

  constructor(private readonly options: PortalSyncOptions) {
    this.host = options.net.localId;
    options.net.on(CHANNEL, (data, from) => this.receive(data as Message, from));
  }

  /** True while nobody else is in this world — then nothing has to be sent. */
  get alone(): boolean {
    return this.peerIds().length === 0;
  }

  get isHost(): boolean {
    return this.host === this.options.net.localId;
  }

  /** Unique id for a prop this player conjures. */
  nextId(): string {
    return `${this.options.net.localId}-${this.counter++}`;
  }

  /** Do we drive this prop's transform, or does it come off the wire? */
  drives(id: string): boolean {
    return this.driverOf(id) === this.options.net.localId;
  }

  update(dt: number): void {
    const net = this.options.net;
    this.host = this.electHost();

    if (this.alone) {
      // Back to single player: hand every prop back to the local simulation.
      if (this.kinematic.size) this.releaseAll();
      this.greeted = false;
      this.owners.clear();
      return;
    }

    if (!this.greeted) {
      this.greeted = true;
      this.send({ t: 'hello' });
      this.sendHands(true);
    }

    this.forgetLostOwners();
    this.applyDrivers(dt);

    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = SEND_INTERVAL;
      this.sendMoves();
    }

    if (this.isHost) {
      this.snapshotTimer -= dt;
      if (this.snapshotTimer <= 0) {
        this.snapshotTimer = SNAPSHOT_INTERVAL;
        this.send({ t: 'state', state: this.snapshot() });
      }
    }
    void net;
  }

  // --- local events ---------------------------------------------------------

  /** A local hand took a prop; tell the others it is ours now. */
  claim(id: string): void {
    if (this.alone) return;
    this.owners.set(id, this.options.net.localId);
    this.send({ t: 'own', id, owner: this.options.net.localId });
  }

  /** Handing a prop back, including the throw it should continue with. */
  release(id: string, velocity: THREE.Vector3): void {
    if (this.alone) return;
    this.owners.delete(id);
    this.send({
      t: 'own',
      id,
      owner: null,
      vel: [round(velocity.x), round(velocity.y), round(velocity.z)],
    });
  }

  portalChanged(key: PortalKey, state: PortalState | null): void {
    if (this.alone) return;
    this.send({ t: 'portal', key, state });
  }

  spawned(id: string, kind: PropKind, pose: Pose7): void {
    if (this.alone) return;
    this.send({ t: 'spawn', id, kind, pose });
  }

  /** A prop was erased here — everybody else drops it too. */
  despawned(id: string): void {
    this.forget(id);
    this.owners.delete(id);
    if (this.alone) return;
    this.send({ t: 'despawn', id });
  }

  resetShared(): void {
    if (this.alone) return;
    this.send({ t: 'reset' });
  }

  /** A prop was repainted — the colour belongs to everybody. */
  painted(id: string, color: number, material?: string | null): void {
    if (this.alone) return;
    this.send({ t: 'paint', id, color, material });
  }

  /** Tools and props in the local hands, sent only when they change. */
  setHands(left: HandBusy, right: HandBusy): void {
    if (sameBusy(this.localHands.left, left) && sameBusy(this.localHands.right, right)) return;
    this.localHands.left = left;
    this.localHands.right = right;
    this.sendHands(false);
  }

  dispose(): void {
    this.options.net.off(CHANNEL);
    this.releaseAll();
  }

  // --- internals ------------------------------------------------------------

  private peerIds(): string[] {
    const net = this.options.net;
    if (!net.connected) return [];
    return [...net.peers.values()].filter((peer) => peer.world === net.world).map((p) => p.id);
  }

  /** Lowest id wins — no negotiation needed, everybody computes the same one. */
  private electHost(): string {
    let host = this.options.net.localId;
    for (const id of this.peerIds()) if (id < host) host = id;
    return host;
  }

  private driverOf(id: string): string {
    return this.owners.get(id) ?? this.host;
  }

  /** An owner that left takes nothing with it. */
  private forgetLostOwners(): void {
    const net = this.options.net;
    for (const [id, owner] of [...this.owners]) {
      if (owner !== net.localId && !net.peers.has(owner)) this.owners.delete(id);
    }
  }

  /**
   * Props we do not drive become kinematic and chase what comes off the wire;
   * props we do drive fall and bounce for real.
   */
  private applyDrivers(dt: number): void {
    const { physics, bodies, heldLocally } = this.options;
    for (const [id, entry] of bodies) {
      if (this.drives(id)) {
        if (this.kinematic.delete(id)) {
          // Only wake it up again if no local hand is holding it kinematically.
          if (!heldLocally(id)) {
            entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
          }
        }
        continue;
      }

      if (!this.kinematic.has(id)) {
        this.kinematic.add(id);
        entry.body.setBodyType(physics.rapier.RigidBodyType.KinematicPositionBased, true);
      }
      const follow = this.follows.get(id);
      if (!follow?.primed) continue;

      const t = entry.body.translation();
      const r = entry.body.rotation();
      _position.set(t.x, t.y, t.z);
      _quaternion.set(r.x, r.y, r.z, r.w);
      const blend = _position.distanceTo(follow.position) > SNAP_DISTANCE ? 1 : weight(dt, FOLLOW_TAU);
      _position.lerp(follow.position, blend);
      _quaternion.slerp(follow.quaternion, blend);
      entry.body.setNextKinematicTranslation(_position);
      entry.body.setNextKinematicRotation(_quaternion);
      // The traversal check compares against this; without it a body that was
      // played back across the room would look like it fell through a portal.
      entry.previousPosition.copy(_position);
    }
  }

  private releaseAll(): void {
    const { physics, bodies, heldLocally } = this.options;
    for (const id of this.kinematic) {
      const entry = bodies.get(id);
      if (!entry || heldLocally(id)) continue;
      entry.body.setBodyType(physics.rapier.RigidBodyType.Dynamic, true);
    }
    this.kinematic.clear();
  }

  private sendMoves(): void {
    const items: Array<[string, ...Pose7]> = [];
    for (const [id, entry] of this.options.bodies) {
      if (!this.drives(id)) continue;
      const pose = poseOf(entry);
      const previous = this.lastSent.get(id);
      if (previous && !moved(previous, pose)) continue;
      this.lastSent.set(id, pose);
      items.push([id, ...pose]);
    }
    if (items.length) this.send({ t: 'move', items });
  }

  private sendHands(force: boolean): void {
    if (this.alone && !force) return;
    this.send({ t: 'hands', left: this.localHands.left, right: this.localHands.right });
  }

  private snapshot(): Snapshot {
    const bodies: Array<[string, ...Pose7]> = [];
    for (const [id, entry] of this.options.bodies) bodies.push([id, ...poseOf(entry)]);

    const spawned = this.options.spawnedProps().map(({ id, kind }) => {
      const entry = this.options.bodies.get(id)!;
      return { id, kind, pose: poseOf(entry) };
    });

    return {
      spawned,
      bodies,
      portals: [
        ['a', this.options.portalState('a')],
        ['b', this.options.portalState('b')],
      ],
      owners: [...this.owners],
    };
  }

  private send(message: Message): void {
    this.options.net.emit(CHANNEL, message);
  }

  private receive(message: Message, from: string): void {
    if (!message || typeof message !== 'object') return;

    switch (message.t) {
      case 'hello': {
        // Whoever simulates answers; the newcomer gets everything at once.
        if (this.isHost) this.send({ t: 'state', state: this.snapshot() });
        this.sendHands(true);
        break;
      }
      case 'state': {
        this.applySnapshot(message.state);
        break;
      }
      case 'move': {
        for (const item of message.items) {
          const [id, ...pose] = item;
          if (this.drives(id)) continue;
          this.setFollow(id, pose as Pose7);
        }
        break;
      }
      case 'portal': {
        this.options.applyPortal(message.key, message.state);
        break;
      }
      case 'spawn': {
        if (!this.options.bodies.has(message.id)) {
          this.options.spawnRemote(message.id, message.kind, message.pose);
          this.setFollow(message.id, message.pose);
        }
        break;
      }
      case 'despawn': {
        this.forget(message.id);
        this.owners.delete(message.id);
        this.options.despawnRemote(message.id);
        break;
      }
      case 'own': {
        if (message.owner) {
          this.owners.set(message.id, message.owner);
          if (message.owner !== this.options.net.localId) this.options.dropLocal(message.id);
        } else {
          this.owners.delete(message.id);
          this.applyThrow(message.id, message.vel);
        }
        break;
      }
      case 'reset': {
        this.owners.clear();
        // The bag props are gone on every machine now, so forget their state.
        for (const id of [...this.follows.keys()]) {
          if (!this.options.bodies.has(id)) this.forget(id);
        }
        this.options.resetRemote();
        break;
      }
      case 'paint': {
        this.options.paintRemote(message.id, message.color, message.material);
        break;
      }
      case 'hands': {
        this.options.onHands(from, message.left ?? null, message.right ?? null);
        break;
      }
    }
  }

  private applySnapshot(state: Snapshot): void {
    for (const { id, kind, pose } of state.spawned) {
      if (!this.options.bodies.has(id)) this.options.spawnRemote(id, kind, pose);
    }
    this.owners.clear();
    for (const [id, owner] of state.owners) this.owners.set(id, owner);
    for (const [key, portal] of state.portals) this.options.applyPortal(key, portal);
    for (const item of state.bodies) {
      const [id, ...pose] = item;
      if (this.drives(id)) continue;
      this.setFollow(id, pose as Pose7);
    }
  }

  /**
   * A prop handed back to us keeps flying: the peer that let go tells us how
   * fast it was, so a thrown cube does not stop dead at the release point.
   */
  private applyThrow(id: string, velocity?: [number, number, number]): void {
    if (!this.drives(id) || !velocity) return;
    const entry = this.options.bodies.get(id);
    if (!entry || this.options.heldLocally(id)) return;
    const follow = this.follows.get(id);
    if (follow?.primed) {
      entry.body.setTranslation(follow.position, true);
      entry.body.setRotation(follow.quaternion, true);
      entry.previousPosition.copy(follow.position);
    }
    entry.body.setBodyType(this.options.physics.rapier.RigidBodyType.Dynamic, true);
    this.kinematic.delete(id);
    entry.body.setLinvel({ x: velocity[0], y: velocity[1], z: velocity[2] }, true);
  }

  private setFollow(id: string, pose: Pose7): void {
    let follow = this.follows.get(id);
    if (!follow) {
      follow = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), primed: false };
      this.follows.set(id, follow);
    }
    follow.position.set(pose[0], pose[1], pose[2]);
    follow.quaternion.set(pose[3], pose[4], pose[5], pose[6]);

    // First sample: place it, do not slide it in from wherever it was.
    if (!follow.primed) {
      follow.primed = true;
      const entry = this.options.bodies.get(id);
      if (entry) {
        entry.body.setTranslation(follow.position, true);
        entry.body.setRotation(follow.quaternion, true);
        entry.previousPosition.copy(follow.position);
      }
    }
  }

  private forget(id: string): void {
    this.owners.delete(id);
    this.follows.delete(id);
    this.kinematic.delete(id);
    this.lastSent.delete(id);
  }
}

function poseOf(entry: PhysicsBody): Pose7 {
  const t = entry.body.translation();
  const r = entry.body.rotation();
  return [round(t.x), round(t.y), round(t.z), round(r.x), round(r.y), round(r.z), round(r.w)];
}

function moved(a: Pose7, b: Pose7): boolean {
  for (let i = 0; i < 7; i++) {
    if (Math.abs(a[i]! - b[i]!) > MOVE_EPSILON) return true;
  }
  return false;
}

function sameBusy(a: HandBusy, b: HandBusy): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if ('gun' in a && 'gun' in b) return a.gun === b.gun;
  if ('grab' in a && 'grab' in b) return a.grab === b.grab;
  return false;
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
