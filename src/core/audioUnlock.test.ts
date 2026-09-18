/**
 * **Wie der Ton aufgeschlossen wird** — und warum die Regeln so und nicht
 * bequemer sind (`core/audioUnlock.ts`).
 *
 * Geprüft wird hier an einem nachgebauten Kontext und nicht an Web Audio: In
 * Jest gibt es keines, und der Fehler, um den es geht, ist ohnehin keiner der
 * Audiotechnik, sondern einer der **Reihenfolge** — wann angefasst wird und
 * wie oft.
 */
import { armAudioUnlock, unlockAudio, type GestureTarget, type Unlockable } from './audioUnlock';

/** Ein Kontext, der mitschreibt: Wie oft wurde fortgesetzt, wie oft gespielt? */
function fakeContext(state: Unlockable['state'] = 'suspended'): Unlockable & {
  resumes: number;
  plays: number;
  become(next: Unlockable['state']): void;
} {
  const started = { count: 0 };
  return {
    state,
    sampleRate: 48000,
    destination: {} as AudioNode,
    resumes: 0,
    get plays() {
      return started.count;
    },
    become(next) {
      (this as { state: Unlockable['state'] }).state = next;
    },
    resume() {
      this.resumes++;
      return Promise.resolve();
    },
    createBuffer: () => ({}) as AudioBuffer,
    createBufferSource: () =>
      ({
        set buffer(_value: AudioBuffer | null) {},
        connect: () => undefined,
        start: () => {
          started.count++;
        },
      }) as unknown as AudioBufferSourceNode,
  };
}

/** Ein `window`, das seine Zuhörer nachhält und sie auslösen kann. */
function fakeTarget(): GestureTarget & { fire(type: string): void; count(): number } {
  const listeners = new Map<string, Set<() => void>>();
  return {
    addEventListener(type, listener) {
      const set = listeners.get(type) ?? new Set();
      set.add(listener);
      listeners.set(type, set);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    fire(type) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener();
    },
    count() {
      let total = 0;
      for (const set of listeners.values()) total += set.size;
      return total;
    },
  };
}

describe('Den Ton aufschließen', () => {
  /**
   * **Beides gehört dazu**, und das eine ohne das andere reicht WebKit nicht:
   * `resume()` sagt dem Kontext, dass er laufen soll, und das eine abgespielte
   * Sample ist der Beweis, dass es aus einer Geste heraus geschah.
   */
  it('setzt einen angehaltenen Kontext fort und spielt ein stilles Sample', () => {
    const ctx = fakeContext('suspended');
    expect(unlockAudio(ctx)).toBe(false);
    expect({ resumes: ctx.resumes, plays: ctx.plays }).toEqual({ resumes: 1, plays: 1 });
  });

  /**
   * **Ein laufender Kontext wird nicht noch einmal fortgesetzt.** Das stille
   * Sample kostet ihn nichts und schadet auch nicht — aber ein `resume()` auf
   * etwas Laufendes ist eine Zeile, die nur im Protokoll steht.
   */
  it('lässt einen laufenden Kontext in Ruhe und meldet Erfolg', () => {
    const ctx = fakeContext('running');
    expect(unlockAudio(ctx)).toBe(true);
    expect(ctx.resumes).toBe(0);
  });

  /** Ohne Kontext und an einem geschlossenen gibt es nichts aufzuschließen. */
  it('kommt ohne Kontext und an einem geschlossenen leise zurück', () => {
    expect(unlockAudio(null)).toBe(false);
    const closed = fakeContext('closed');
    expect(unlockAudio(closed)).toBe(false);
    expect({ resumes: closed.resumes, plays: closed.plays }).toEqual({ resumes: 0, plays: 0 });
  });

  /**
   * **`interrupted` ist der Zustand, um den es hier eigentlich geht**: Nur
   * WebKit kennt ihn, und er trifft genau die installierte App, die man
   * zwischendurch wegschiebt. Wer nur `suspended` abfragte, ließe sie still.
   */
  it('schließt auch einen unterbrochenen Kontext wieder auf', () => {
    const ctx = fakeContext('interrupted');
    expect(unlockAudio(ctx)).toBe(false);
    expect({ resumes: ctx.resumes, plays: ctx.plays }).toEqual({ resumes: 1, plays: 1 });
  });

  /**
   * **Jede Geste versucht es erneut**, denn die erste ist oft die, bei der der
   * Browser noch nicht mitspielt.
   */
  it('versucht es bei jeder Geste wieder, solange der Kontext angehalten ist', () => {
    const ctx = fakeContext('suspended');
    const target = fakeTarget();
    armAudioUnlock(target, () => ctx);
    target.fire('pointerdown');
    target.fire('touchend');
    target.fire('keydown');
    expect(ctx.resumes).toBe(3);
  });

  /**
   * **Und hört auf, sobald er läuft** — ohne sich abzumelden. Das ist der
   * Unterschied, der nach einem App-Wechsel zählt: Hält iOS den Kontext an,
   * greift dieselbe Anmeldung noch einmal.
   */
  it('hält still, solange der Kontext läuft, und heilt ihn nach einer Unterbrechung', () => {
    const ctx = fakeContext('suspended');
    const target = fakeTarget();
    armAudioUnlock(target, () => ctx);

    target.fire('pointerdown');
    expect(ctx.resumes).toBe(1);

    ctx.become('running');
    target.fire('pointerdown');
    target.fire('click');
    expect(ctx.resumes).toBe(1);

    // Ein Anruf, ein Wechsel in eine andere App: Der Kontext ist angehalten,
    // ohne dass jemand danach gefragt hätte.
    ctx.become('suspended');
    target.fire('pointerdown');
    expect(ctx.resumes).toBe(2);
  });

  /** Fünf Ereignisse, und das Abmelden nimmt alle fünf wieder weg. */
  it('meldet sich auf fünf Wegen an und auf denselben fünf wieder ab', () => {
    const target = fakeTarget();
    const disarm = armAudioUnlock(target, () => fakeContext());
    expect(target.count()).toBe(5);
    disarm();
    expect(target.count()).toBe(0);
  });

  /** Ohne `window` — in Jest, in einem Worker — passiert gar nichts. */
  it('kommt ohne Ziel leise zurück', () => {
    expect(() => armAudioUnlock(null)()).not.toThrow();
  });
});
