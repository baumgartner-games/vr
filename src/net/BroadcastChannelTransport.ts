import type { NetMessage, NetTransport } from './types';

/**
 * Local transport for development: every browser tab on the same origin joins
 * the same room. Enough to try out an asymmetric setup (headset tab + phone
 * tab) before a real server exists.
 */
export class BroadcastChannelTransport implements NetTransport {
  readonly kind = 'broadcast-channel';
  private channel: BroadcastChannel | null = null;

  async connect(room: string, onMessage: (message: NetMessage) => void): Promise<void> {
    if (typeof BroadcastChannel === 'undefined') {
      throw new Error('BroadcastChannel wird von diesem Browser nicht unterstützt.');
    }
    this.channel = new BroadcastChannel(`bg-vr:${room}`);
    this.channel.onmessage = (event: MessageEvent<NetMessage>) => onMessage(event.data);
  }

  send(message: NetMessage): void {
    this.channel?.postMessage(message);
  }

  close(): void {
    this.channel?.close();
    this.channel = null;
  }
}
