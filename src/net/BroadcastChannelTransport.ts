import type { NetMessage, NetTransport, NetTransportEvents } from './types';

/**
 * Local transport for development: every browser tab on the same origin joins
 * the same room. Enough to try out an asymmetric setup (headset tab + phone
 * tab) on one machine without touching any network.
 */
export class BroadcastChannelTransport implements NetTransport {
  readonly kind = 'broadcast-channel';
  private channel: BroadcastChannel | null = null;

  async connect(room: string, events: NetTransportEvents): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') {
      throw new Error('BroadcastChannel wird von diesem Browser nicht unterstützt.');
    }
    this.channel = new BroadcastChannel(`bg-vr:${room}`);
    this.channel.onmessage = (event: MessageEvent<NetMessage>) => events.message(event.data);
    // Every tab is reachable immediately, so there is no handshake to wait for.
    events.status?.('online', 'Lokal (BroadcastChannel)');
  }

  send(message: NetMessage): void {
    this.channel?.postMessage(message);
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
  }
}
