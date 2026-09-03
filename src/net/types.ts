import type { PlayerRole } from '../core/types';

/** Position + quaternion, flattened: [x, y, z, qx, qy, qz, qw]. */
export type PoseArray = [number, number, number, number, number, number, number];

export interface PeerPose {
  head: PoseArray;
  left: PoseArray | null;
  right: PoseArray | null;
}

export type NetMessage =
  | { type: 'hello'; from: string; role: PlayerRole; name: string; world: string }
  | { type: 'bye'; from: string }
  | { type: 'world'; from: string; world: string }
  | { type: 'pose'; from: string; pose: PeerPose }
  /** Free-form world traffic, e.g. portal placements. */
  | { type: 'event'; from: string; channel: string; data: unknown };

/**
 * Anything that can ferry messages between players. `BroadcastChannelTransport`
 * covers several tabs on one machine; a WebSocket or WebRTC implementation can
 * be dropped in later without touching the worlds.
 */
export interface NetTransport {
  readonly kind: string;
  connect(room: string, onMessage: (message: NetMessage) => void): Promise<void>;
  send(message: NetMessage): void;
  close(): void;
}
