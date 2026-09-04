import type { PlayerRole } from '../core/types';

/** Position + quaternion, flattened: [x, y, z, qx, qy, qz, qw]. */
export type PoseArray = [number, number, number, number, number, number, number];

export interface PeerPose {
  head: PoseArray;
  left: PoseArray | null;
  right: PoseArray | null;
  /**
   * Do not draw this player. Set while spectating in first person, where the
   * camera sits inside the watched player's head — the others would otherwise
   * get an avatar box in the face.
   */
  hidden?: boolean;
}

export type NetMessage =
  /**
   * `since` ist die **Standzeit** in dieser Welt, in Sekunden — keine Uhrzeit.
   * Daraus wählt jeder für sich denselben Gastgeber (`net/host.ts`): Wer am
   * längsten da ist, rechnet. Eine Dauer, weil zwei Rechner sich über die
   * Uhrzeit nie einig sind, über die Länge einer Minute aber schon.
   */
  | { type: 'hello'; from: string; role: PlayerRole; name: string; world: string; since: number }
  | { type: 'bye'; from: string }
  | { type: 'world'; from: string; world: string; since: number }
  | { type: 'pose'; from: string; pose: PeerPose }
  /**
   * Eine Zeile Text an alle im Raum.
   *
   * Eigene Sorte und kein `event`, weil sie **keiner Welt gehört**: der Chat
   * läuft weiter, während jemand von der Halle in den Eingaberaum geht, und ein
   * Kanal, den eine Welt beim Aufräumen abbestellt (`NetSession.off`), täte das
   * nicht. `kind: 'code'` markiert eine Zeile, die eine Maschine geschrieben hat
   * — der Eingaberaum wendet nur solche an —, `note` sagt, wofür sie gilt.
   */
  | { type: 'chat'; from: string; name: string; text: string; kind: 'text' | 'code'; note?: string }
  /** Free-form world traffic, e.g. portal placements. */
  | { type: 'event'; from: string; channel: string; data: unknown };

/** Coarse connection state, mostly so the UI has something to show. */
export type NetStatus = 'offline' | 'connecting' | 'waiting' | 'online' | 'error';

/** What a transport reports back to the session. */
export interface NetTransportEvents {
  message(message: NetMessage): void;
  /**
   * A direct link to `id` came up. The session answers with a fresh `hello`,
   * which matters for WebRTC: at `connect()` time there is nobody to greet yet.
   */
  peerUp?(id: string): void;
  /** The link to `id` is gone for good — no need to wait for the timeout. */
  peerDown?(id: string): void;
  status?(status: NetStatus, detail?: string): void;
}

/**
 * Anything that can ferry messages between players. `BroadcastChannelTransport`
 * covers several tabs on one machine, `TrysteroTransport` real peer-to-peer
 * links over WebRTC; the worlds never see the difference.
 */
export interface NetTransport {
  readonly kind: string;
  /**
   * Stable id of this endpoint, when the transport has one. The session adopts
   * it so that `peerUp`/`peerDown` ids match the ids inside the messages.
   */
  readonly id?: string;
  connect(room: string, events: NetTransportEvents): Promise<void>;
  send(message: NetMessage): void;
  close(): void;
}
