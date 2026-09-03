import type { NetMessage, NetTransport, NetTransportEvents } from './types';
import type { JoinRoom, JsonValue, Room, TurnServerConfig } from '@trystero-p2p/core';

/**
 * How the two browsers find each other. None of these need a server of our own:
 * the SDP handshake is posted to a public relay network and everything after
 * that flows directly between the peers.
 */
export type SignalingStrategy = 'nostr' | 'mqtt' | 'torrent';

interface StrategyModule {
  joinRoom: JoinRoom;
  selfId: string;
  /** Open relay sockets, keyed by url — the only health signal we get. */
  getRelaySockets: () => Record<string, WebSocket>;
}

/**
 * Loaded on demand so that picking a strategy costs one small chunk instead of
 * bundling all three.
 */
const STRATEGIES: Record<SignalingStrategy, () => Promise<StrategyModule>> = {
  nostr: () => import('trystero'),
  mqtt: () => import('@trystero-p2p/mqtt'),
  torrent: () => import('@trystero-p2p/torrent'),
};

export interface TrysteroOptions {
  /** Namespaces the room ids so other apps on the same relays stay separate. */
  appId?: string;
  strategy?: SignalingStrategy;
  /**
   * Encrypts the session descriptions on the relay. Defaults to the room code,
   * which is the shared secret anyway.
   */
  password?: string;
  /** Optional relay for peers behind a symmetric NAT — see the README. */
  turnConfig?: TurnServerConfig[];
}

const DEFAULT_APP_ID = 'baumgartner-vr';
/** Trystero action namespaces are limited to a few bytes. */
const ACTION = 'net';
const HEALTH_INTERVAL = 2000;
/** Relays need a moment; complaining earlier would just flash a false alarm. */
const HEALTH_GRACE = 8000;

/**
 * Peer-to-peer transport over WebRTC. Trystero does the matchmaking over a
 * public relay network (Nostr by default), so there is no signalling server to
 * host — see `docs`/README for the trade-offs.
 */
export class TrysteroTransport implements NetTransport {
  readonly kind = 'webrtc';

  private room: Room | null = null;
  private sendMessage: ((data: JsonValue) => Promise<void>) | null = null;
  private selfId = '';
  private events: NetTransportEvents | null = null;
  private closed = false;
  private relaySockets: (() => Record<string, WebSocket>) | null = null;
  private health: ReturnType<typeof setInterval> | null = null;
  private connectedAt = 0;

  constructor(private readonly options: TrysteroOptions = {}) {}

  get id(): string | undefined {
    return this.selfId || undefined;
  }

  get strategy(): SignalingStrategy {
    return this.options.strategy ?? 'nostr';
  }

  async connect(room: string, events: NetTransportEvents): Promise<void> {
    this.events = events;
    events.status?.('connecting', `Suche Mitspieler über ${this.strategy} …`);

    const load = STRATEGIES[this.strategy] ?? STRATEGIES.nostr;
    const { joinRoom, selfId, getRelaySockets } = await load();
    if (this.closed) return;
    this.selfId = selfId;
    this.relaySockets = getRelaySockets;
    this.connectedAt = Date.now();

    const joined = joinRoom(
      {
        appId: this.options.appId ?? DEFAULT_APP_ID,
        password: this.options.password ?? room,
        ...(this.options.turnConfig ? { turnConfig: this.options.turnConfig } : {}),
      },
      room,
      {
        onJoinError: (details) => {
          console.warn('[net] Beitritt fehlgeschlagen', details);
          events.status?.('error', details.error);
        },
      },
    );
    this.room = joined;

    const action = joined.makeAction<JsonValue>(ACTION);
    this.sendMessage = action.send;
    action.onMessage = (data) => {
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        events.message(data as unknown as NetMessage);
      }
    };

    joined.onPeerJoin = (peerId) => {
      events.peerUp?.(peerId);
      this.report();
    };
    joined.onPeerLeave = (peerId) => {
      events.peerDown?.(peerId);
      this.report();
    };

    this.health = setInterval(() => this.report(), HEALTH_INTERVAL);
    this.report();
  }

  send(message: NetMessage): void {
    // A peer can drop between the check and the send; that is not worth a throw.
    void this.sendMessage?.(message as unknown as JsonValue).catch(() => undefined);
  }

  close(): void {
    this.closed = true;
    if (this.health !== null) clearInterval(this.health);
    this.health = null;
    this.relaySockets = null;
    const room = this.room;
    this.room = null;
    this.sendMessage = null;
    this.events = null;
    void room?.leave().catch(() => undefined);
  }

  private report(): void {
    if (!this.room) return;
    const peers = Object.keys(this.room.getPeers()).length;
    if (peers > 0) {
      this.events?.status?.('online', `${peers} direkte Verbindung${peers === 1 ? '' : 'en'}`);
      return;
    }

    const relays = this.openRelays();
    if (relays === 0 && Date.now() - this.connectedAt > HEALTH_GRACE) {
      // Almost always a firewall or a captive portal eating the WebSockets.
      this.events?.status?.(
        'error',
        `Kein ${this.strategy}-Relay erreichbar — blockiert das Netzwerk WebSockets?`,
      );
      return;
    }
    this.events?.status?.('waiting', `Warte auf Mitspieler · ${relays} Relays`);
  }

  private openRelays(): number {
    if (!this.relaySockets) return 0;
    try {
      return Object.values(this.relaySockets()).filter((s) => s.readyState === WebSocket.OPEN)
        .length;
    } catch {
      return 0;
    }
  }
}
