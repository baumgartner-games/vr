import { pickWatched, type WatchCandidate } from './watch';

/**
 * Wem zugesehen wird.
 *
 * Der Fall, für den diese Wahl von der Peer-Liste getrennt wurde, ist der
 * letzte hier: Der Beobachtete geht durch ein Portal, steht damit in einer
 * anderen Welt — und bleibt trotzdem der, dem zugesehen wird. Erst dadurch
 * kann das Zuschauen mitgehen, statt vor einem stehengebliebenen Bild zu
 * warten.
 */
const HERE = 'hub';

function peer(id: string, role: string, world: string): WatchCandidate {
  return { id, role, world };
}

describe('wem die Zuschauerkamera zusieht', () => {
  it('nimmt ohne Wahl den ersten VR-Spieler in der eigenen Welt', () => {
    const peers = [peer('a', 'desktop', HERE), peer('b', 'vr', HERE), peer('c', 'vr', 'alps')];
    expect(pickWatched(peers, null, HERE)?.id).toBe('b');
  });

  it('nimmt ohne VR-Spieler den ersten, der hier steht', () => {
    const peers = [peer('a', 'desktop', 'alps'), peer('b', 'handheld', HERE)];
    expect(pickWatched(peers, null, HERE)?.id).toBe('b');
  });

  it('greift in die anderen Welten, wenn hier niemand mehr steht', () => {
    const peers = [peer('a', 'desktop', 'alps'), peer('b', 'vr', 'moon')];
    expect(pickWatched(peers, null, HERE)?.id).toBe('b');
  });

  it('gibt ohne jeden Mitspieler nichts zurück', () => {
    expect(pickWatched([], null, HERE)).toBeNull();
  });

  it('hält sich an die Wahl, auch wenn ein VR-Spieler danebensteht', () => {
    const peers = [peer('a', 'desktop', HERE), peer('b', 'vr', HERE)];
    expect(pickWatched(peers, 'a', HERE)?.id).toBe('a');
  });

  it('behält den Ausgesuchten, wenn er in eine andere Welt geht', () => {
    const peers = [peer('a', 'vr', 'moon'), peer('b', 'vr', HERE)];
    expect(pickWatched(peers, 'a', HERE)?.id).toBe('a');
  });

  it('vergisst ihn, sobald er die Sitzung verlässt', () => {
    expect(pickWatched([peer('b', 'vr', HERE)], 'a', HERE)).toBeNull();
  });
});
