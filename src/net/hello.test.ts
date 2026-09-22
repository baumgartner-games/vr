import { NetSession } from './NetSession';
import { DEFAULT_APPEARANCE } from '../core/appearance';
import type { NetMessage, NetTransport, NetTransportEvents } from './types';

/**
 * **Was in der Anmeldung steht.**
 *
 * Das Aussehen einer Figur geht im `hello` über das Netz und nicht in der
 * Pose: Es ändert sich einmal am Abend, die Pose zwanzigmal in der Sekunde.
 * Zwei Dinge können dabei schiefgehen, und beide merkt man erst, wenn jemand
 * anderes im Raum steht — deshalb stehen sie hier.
 *
 * Das eine: Ein Feld fehlt in der Ansage, und die anderen sehen einen als
 * jemand, der man nicht ist. Das andere: Ein Feld kommt mit einem Wert
 * herein, den es nicht gibt — eine ältere Fassung, eine neuere, oder jemand,
 * der von Hand in die Leitung schreibt. Beides endet in einer Vorgabe und
 * nicht in einem halb gebauten Körper.
 */
class Loopback implements NetTransport {
  readonly kind = 'test';
  readonly sent: NetMessage[] = [];
  private events: NetTransportEvents | null = null;

  async connect(room: string, events: NetTransportEvents): Promise<void> {
    void room;
    this.events = events;
  }

  send(message: NetMessage): void {
    this.sent.push(message);
  }

  close(): void {
    this.events = null;
  }

  /** Eine Nachricht so hereingeben, als käme sie von draußen. */
  deliver(message: NetMessage): void {
    this.events?.message(message);
  }
}

async function session(): Promise<{ net: NetSession; link: Loopback }> {
  const net = new NetSession();
  const link = new Loopback();
  await net.connect(link, 'raum');
  return { net, link };
}

function hello(extra: Record<string, unknown>): NetMessage {
  return {
    type: 'hello',
    from: 'fremd',
    role: 'vr',
    name: 'Kai',
    world: 'hub',
    since: 3,
    ...extra,
  } as NetMessage;
}

describe('das Aussehen in der Anmeldung', () => {
  it('sagt Hut, Kopf, Körper und Figur mit an', async () => {
    const { net, link } = await session();
    net.look = {
      ...DEFAULT_APPEARANCE,
      hat: 'chef',
      head: 'beard',
      body: 'striped',
      figure: 'adventurers/characters/Knight.glb',
    };
    net.announce();

    const last = link.sent.at(-1)!;
    expect(last).toMatchObject({
      type: 'hello',
      hat: 'chef',
      head: 'beard',
      body: 'striped',
      figure: 'adventurers/characters/Knight.glb',
    });
  });

  it('nimmt an, was ein Mitspieler von sich sagt', async () => {
    const { net, link } = await session();
    link.deliver(
      hello({
        hat: 'crown',
        head: 'moustache',
        body: 'green',
        figure: 'skeletons/characters/Skeleton_Warrior.glb',
      }),
    );

    expect(net.peers.get('fremd')!.look).toEqual({
      hat: 'crown',
      head: 'moustache',
      body: 'green',
      figure: 'skeletons/characters/Skeleton_Warrior.glb',
    });
  });

  it('macht aus einer älteren Fassung ohne Felder die Vorgabe', async () => {
    const { net, link } = await session();
    link.deliver(hello({}));

    expect(net.peers.get('fremd')!.look).toEqual(DEFAULT_APPEARANCE);
  });

  it('lässt fremden Text nicht durch', async () => {
    const { net, link } = await session();
    link.deliver(
      hello({
        hat: 'sombrero',
        head: 17,
        body: { jacke: 'rot' },
        // Eine Adresse, die aus dem Modellordner hinausführte: Sie wird nicht
        // etwa geputzt, sondern zum Koch (`core/avatarFigures.asFigure`).
        figure: '../../etc/passwd.glb',
      }),
    );

    expect(net.peers.get('fremd')!.look).toEqual(DEFAULT_APPEARANCE);
  });

  it('gibt einem noch stummen Mitspieler schon eine Figur', async () => {
    // Die Pose kommt vor dem `hello`, wenn zwei gleichzeitig verbinden: Bis
    // zur ersten Ansage steht er als barhäuptiger Koch da und nicht als nichts.
    const { net, link } = await session();
    link.deliver({ type: 'world', from: 'still', world: 'hub', since: 0 });

    expect(net.peers.get('still')!.look).toEqual(DEFAULT_APPEARANCE);
  });
});
