import { sharedAudio } from '../../../core/Audio';
import {
  KITCHEN_CUES,
  SOUND_DIR,
  kitchenSoundFiles,
  type KitchenCue,
  type KitchenHeard,
} from './kitchenSound';

/**
 * **Der Spieler der Küchengeräusche** — er führt aus, was `kitchenSound.ts`
 * ausgerechnet hat.
 *
 * Acht wiederverwendete Stimmen für Ereignisse, dazu je Schleife eine feste
 * Stimme, alle auf dem **gemeinsamen** `AudioContext` (`core/Audio.ts`): Der
 * Browser gibt eine Audio-Verbindung nur nach einer Geste des Spielers frei,
 * und wer einen zweiten Kontext aufmacht, zahlt sie ein zweites Mal. Die
 * Stimmen der Mitspieler (`net/Voice.ts`) und die Töne der Werkzeuge teilen
 * ihn sich schon.
 *
 * **Nichts wird mitten im Bild geladen.** `prime()` holt beim Aufbau der Zone
 * jede Datei als Bytes; entpackt wird, sobald es einen laufenden Kontext gibt
 * (`decodeAudioData`, einmal je Datei, auf dem Audio-Thread). Bis dahin ist es
 * still — und das ist die richtige Antwort und keine Notlösung: Ein
 * synthetisierter Ersatzton, der eine halbe Minute lang anders klingt als die
 * Aufnahme danach, ist kein Platzhalter, sondern ein zweites Geräusch.
 *
 * **Ohne Web Audio tut die ganze Klasse nichts** und sagt es auch nicht: In
 * Jest gibt es keinen `AudioContext`, in einem Browser ohne Freigabe auch
 * nicht, und ein `null` an dieser Stelle ist kein Fehler, sondern der
 * Normalfall vor dem ersten Klick. Jeder Aufruf kehrt dann leise zurück.
 */
export const KITCHEN_VOICES = 8;

/** Wie schnell eine Schleife auf- und abgeblendet wird, in Sekunden. */
const FADE = 0.25;

interface Voice {
  gain: GainNode;
  pan: StereoPannerNode;
  source: AudioBufferSourceNode | null;
}

interface Loop {
  source: AudioBufferSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
  /** Welche Aufnahme des Tons läuft — der Sender des Radios. */
  variant: number;
}

export class KitchenAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly voices: Voice[] = [];
  private readonly loops = new Map<KitchenCue, Loop>();
  /** Entpackte Aufnahmen je Datei — `water.ogg` gehört zu zwei Tönen. */
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly pending = new Map<string, ArrayBuffer>();
  /**
   * **Die Aufnahmen, die statt der eingetragenen gelten** — je Ton höchstens
   * eine Liste, und im Normalfall ist die Liste leer.
   *
   * Sie hängt an den beiden Knöpfen im Schauraum
   * (`kitchenSound.SOUND_TRIALS`, `kitchen.addTrialButtons`): Solange nicht
   * entschieden ist, wie das Messer und die Abgabe klingen, wird hier
   * umgestellt und nicht in der Tabelle. Steht die Wahl, fällt beides weg.
   */
  private readonly chosen = new Map<KitchenCue, readonly string[]>();
  private priming: Promise<void> | null = null;
  private decoding = false;
  private disposed = false;

  /** Wie viele Stimmen gerade klingen — für Tests und Anzeigen. */
  get activeVoices(): number {
    let count = 0;
    for (const voice of this.voices) if (voice.source) count++;
    return count;
  }

  /** Wie viele Aufnahmen schon entpackt sind. */
  get ready(): number {
    return this.buffers.size;
  }

  /**
   * **Alle Dateien einmal holen.**
   *
   * Ohne Seite, ohne `fetch` und ohne Audiogerät passiert gar nichts — und
   * zwar ohne einen einzigen Netzzugriff: Wer in Jest eine Küche baut, soll
   * nicht sechsundzwanzig Anfragen ins Leere schicken.
   *
   * Eine Datei, die nicht ankommt, nimmt die anderen nicht mit: Sie fehlt,
   * ihr Ton bleibt still, und in der Konsole steht, welche es war.
   */
  prime(): Promise<void> {
    if (this.priming) return this.priming;
    if (typeof document === 'undefined' || typeof fetch !== 'function' || !sharedAudio()) {
      this.priming = Promise.resolve();
      return this.priming;
    }
    const base = document.baseURI;
    this.priming = Promise.all(
      kitchenSoundFiles().map((file) =>
        fetch(new URL(`${SOUND_DIR}${file}`, base).toString())
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.arrayBuffer();
          })
          .then(
            (bytes) => {
              this.pending.set(file, bytes);
            },
            (error: unknown) => console.warn(`Küche: Ton "${file}" kam nicht an`, error),
          ),
      ),
    ).then(() => {
      this.decodePending();
    });
    return this.priming;
  }

  /**
   * **Einen einmaligen Ton spielen** — oder ihn leise fallen lassen.
   *
   * Fallen gelassen wird er in drei Fällen, und alle drei sind richtig so: Es
   * gibt (noch) keinen Kontext, die Aufnahme ist (noch) nicht entpackt, oder
   * alle acht Stimmen klingen bereits. Der dritte ist der einzige, über den es
   * sich zu reden lohnt: Eine neunte gleichzeitige Quelle wäre in einer Küche,
   * in der drei Bänder laufen und vier Gäste kommen, der Anfang einer Liste
   * ohne Ende — und hören würde man sie in dem Gedränge ohnehin nicht.
   */
  play(cue: KitchenCue, heard: KitchenHeard): void {
    if (this.disposed || heard.gain <= 0.004 || !this.ensure()) return;
    const spec = KITCHEN_CUES[cue];
    const buffer = this.pick(this.chosen.get(cue) ?? spec.files);
    if (!buffer) return;
    const voice = this.voices.find((slot) => slot.source === null);
    if (!voice) return;
    const ctx = this.context!;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    voice.gain.gain.setValueAtTime(spec.gain * heard.gain, ctx.currentTime);
    voice.pan.pan.setValueAtTime(heard.pan, ctx.currentTime);
    source.connect(voice.gain);
    voice.source = source;
    source.onended = () => {
      source.disconnect();
      if (voice.source === source) voice.source = null;
    };
    source.start();
  }

  /**
   * **Eine Schleife auf diesen Stand bringen**: `null` blendet sie aus, alles
   * andere legt sie an oder zieht sie nach.
   *
   * Sie wird **nachgeführt** und nicht neu gestartet, solange sie läuft — eine
   * Pfanne, an der man vorbeigeht, soll lauter und leiser werden und nicht bei
   * jedem Schritt von vorn brutzeln. Neu angelegt wird nur, wenn der `variant`
   * sich ändert; das ist der Senderwechsel des Radios und der einzige Fall, in
   * dem eine laufende Schleife wirklich eine andere Aufnahme werden muss.
   */
  loop(cue: KitchenCue, heard: KitchenHeard | null, variant = 0): void {
    if (this.disposed) return;
    const running = this.loops.get(cue);
    if (!heard || heard.gain <= 0.004) {
      if (running) this.stopLoop(cue, running);
      return;
    }
    if (!this.ensure()) return;
    const ctx = this.context!;
    const spec = KITCHEN_CUES[cue];
    const level = spec.gain * heard.gain;
    if (running && running.variant !== variant) {
      this.stopLoop(cue, running);
    } else if (running) {
      running.gain.gain.setTargetAtTime(level, ctx.currentTime, FADE / 3);
      running.pan.pan.setTargetAtTime(heard.pan, ctx.currentTime, FADE / 3);
      return;
    }
    const buffer = this.buffers.get(spec.files[variant % spec.files.length]!);
    if (!buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setTargetAtTime(level, ctx.currentTime, FADE / 3);
    const pan = ctx.createStereoPanner();
    pan.pan.setValueAtTime(heard.pan, ctx.currentTime);
    source.connect(gain).connect(pan).connect(this.master!);
    source.start();
    this.loops.set(cue, { source, gain, pan, variant });
  }

  /**
   * **Einen Ton auf andere Aufnahmen umstellen** — für die Knöpfe im
   * Schauraum, mit denen sich Messer und Abgabe vergleichen lassen
   * (`kitchenSound.SOUND_TRIALS`).
   *
   * Umgestellt wird **nur der Vorrat, aus dem gewürfelt wird**, und nicht der
   * Pegel und nicht die Schleife: Eine Variante ist ein anderer Klang
   * desselben Ereignisses und kein anderes Ereignis. Was gerade klingt, klingt
   * zu Ende — ein Ton, der beim Umschalten abbräche, wäre der Vergleich, den
   * man nicht hört.
   */
  choose(cue: KitchenCue, files: readonly string[]): void {
    this.chosen.set(cue, files);
  }

  /**
   * **Alle Schleifen ausblenden** — im Umbau und beim Verlassen der Küche.
   *
   * `keep` lässt eine davon laufen, und es gibt genau eine, die das braucht:
   * Das Radio hängt an keiner Station und soll deshalb auch nicht ausgehen,
   * wenn die Stationen ausgehen. Ohne diese Ausnahme stoppte es hier und
   * finge im nächsten Bild wieder an (`kitchen.listen`) — eine Viertelsekunde
   * Loch mitten in der Musik, und niemand wüsste, woher.
   */
  silence(keep?: KitchenCue): void {
    for (const [cue, loop] of [...this.loops]) if (cue !== keep) this.stopLoop(cue, loop);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [, loop] of this.loops) {
      loop.source.stop();
      loop.source.disconnect();
      loop.gain.disconnect();
      loop.pan.disconnect();
    }
    this.loops.clear();
    for (const voice of this.voices) {
      voice.source?.stop();
      voice.source?.disconnect();
      voice.gain.disconnect();
      voice.pan.disconnect();
    }
    this.voices.length = 0;
    this.master?.disconnect();
    this.master = null;
    this.buffers.clear();
    this.pending.clear();
    this.chosen.clear();
  }

  /**
   * **Eine Schleife anhalten** — ausblenden und erst danach wirklich stoppen.
   *
   * Der Eintrag fällt sofort aus der Liste: Wer im selben Bild dieselbe
   * Schleife wieder anfordert (Senderwechsel), soll eine neue bekommen und
   * nicht die sterbende nachgeführt sehen.
   */
  private stopLoop(cue: KitchenCue, loop: Loop): void {
    this.loops.delete(cue);
    const ctx = this.context;
    if (!ctx) return;
    const now = ctx.currentTime;
    loop.gain.gain.setTargetAtTime(0, now, FADE / 3);
    loop.source.stop(now + FADE);
    loop.source.onended = () => {
      loop.source.disconnect();
      loop.gain.disconnect();
      loop.pan.disconnect();
    };
  }

  /** Eine zufällige Aufnahme eines Tons — oder `null`, solange keine entpackt ist. */
  private pick(files: readonly string[]): AudioBuffer | null {
    const ready: AudioBuffer[] = [];
    for (const file of files) {
      const buffer = this.buffers.get(file);
      if (buffer) ready.push(buffer);
    }
    if (!ready.length) return null;
    return ready[Math.floor(Math.random() * ready.length)]!;
  }

  /** Bytes zu Aufnahmen machen — nur mit Kontext, einmal je Datei. */
  private decodePending(): void {
    const ctx = this.context ?? sharedAudio();
    if (!ctx || this.decoding || !this.pending.size) return;
    this.decoding = true;
    const work = [...this.pending].map(([file, bytes]) =>
      Promise.resolve()
        .then(() => ctx.decodeAudioData(bytes.slice(0)))
        .then(
          (buffer) => {
            this.buffers.set(file, buffer);
            this.pending.delete(file);
          },
          (error: unknown) => {
            this.pending.delete(file);
            console.warn(`Küche: Ton "${file}" lässt sich nicht entpacken`, error);
          },
        ),
    );
    void Promise.all(work).then(() => {
      this.decoding = false;
    });
  }

  /** Der gemeinsame Kontext, sobald der Browser ihn laufen lässt. */
  private ensure(): boolean {
    if (this.context) {
      if (this.pending.size) this.decodePending();
      return this.context.state === 'running';
    }
    const ctx = sharedAudio();
    if (!ctx || ctx.state !== 'running') return false;
    this.context = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 1;
    this.master.connect(ctx.destination);
    for (let i = 0; i < KITCHEN_VOICES; i++) {
      const gain = ctx.createGain();
      const pan = ctx.createStereoPanner();
      gain.connect(pan).connect(this.master);
      this.voices.push({ gain, pan, source: null });
    }
    this.decodePending();
    return true;
  }
}
