import * as THREE from 'three';
import { sharedAudio } from '../core/Audio';
import type { NetSession } from './NetSession';
import type { RemoteAvatars } from './RemoteAvatars';

/**
 * Sprechen statt tippen.
 *
 * Der Chat ist ausdrücklich nicht zum Plaudern gebaut — er ist für Codes, die
 * eine Maschine wieder liest. In der Brille zu tippen ist teuer, und „schau mal
 * nach links" über eine Bildschirmtastatur zu buchstabieren ist die Art
 * Aufwand, für die es Stimmen gibt. Die Verbindung dafür steht längst: WebRTC
 * trägt neben dem Datenkanal auch Ton, und Trystero hängt einen Strom an
 * dieselben Peers, die schon die Posen bekommen (`NetTransport.addStream`).
 *
 * **Räumlich**, nicht als Telefonkonferenz: jede Stimme läuft durch einen
 * `PannerNode`, der am Kopf ihres Sprechers steht. Wer hinter dir redet, klingt
 * von hinten, und wer am anderen Ende der Halle steht, ist leise. Das ist in
 * VR keine Spielerei — es ist der Unterschied zwischen „jemand sagt etwas" und
 * „der da drüben sagt etwas".
 *
 * **Aus, bis jemand es einschaltet.** Ein Mikrofon, das mitläuft, weil man
 * einem Raum beigetreten ist, ist ein Fehler und keine Bequemlichkeit. Der
 * Browser fragt ohnehin nach Erlaubnis; diese Frage soll auf einen Knopfdruck
 * folgen und nicht auf einen Raumbeitritt.
 */

/** Ab dieser Lautstärke gilt jemand als sprechend — genug, um Rauschen zu überhören. */
const SPEAKING_LEVEL = 0.045;
/** Wie lange die Anzeige nach dem letzten Ton noch stehen bleibt, in Sekunden. */
const SPEAKING_HOLD = 0.35;
/** Näher als das wird nicht lauter, weiter als das nicht mehr leiser. */
const REFERENCE_DISTANCE = 1.4;
const MAX_DISTANCE = 40;

export type VoiceState = 'off' | 'starting' | 'on' | 'blocked';

/** Eine ankommende Stimme, samt allem, was sie hörbar macht. */
interface Incoming {
  stream: MediaStream;
  /**
   * Ein stummes `<audio>` am Strom.
   *
   * Sieht überflüssig aus und ist es nicht: Chrome lässt einen WebRTC-Strom
   * erst dann in die Web-Audio-Welt fließen, wenn er außerdem an einem
   * Medienelement hängt. Ohne das bleibt der `MediaStreamSource` still, und man
   * sucht den Fehler beim Sender.
   */
  element: HTMLAudioElement;
  source: MediaStreamAudioSourceNode | null;
  panner: PannerNode | null;
  analyser: AnalyserNode | null;
  samples: Uint8Array<ArrayBuffer> | null;
  /** Sekunden, die die Sprechanzeige noch stehen bleibt. */
  speaking: number;
}

const _position = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _up = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

export class Voice {
  state: VoiceState = 'off';
  /** Was schiefging, in einem Satz fürs Menü. */
  detail = '';
  /** Ruft, wenn sich etwas geändert hat, das im Menü steht. */
  onChange: (() => void) | null = null;

  private stream: MediaStream | null = null;
  private readonly incoming = new Map<string, Incoming>();

  constructor(private readonly net: NetSession) {
    this.net.onPeerStream((stream, peerId) => this.receive(stream, peerId));
    this.net.onPeerLeave((peer) => this.drop(peer.id));
  }

  /** Ob es hier überhaupt etwas zu schalten gibt. */
  get available(): boolean {
    // `mediaDevices` gibt es nur in einem sicheren Kontext — über `http://`
    // (außer localhost) ist die Frage nach dem Mikrofon gar nicht erst da.
    return Boolean(globalThis.navigator?.mediaDevices) && this.net.canStream;
  }

  /** Wie viele Stimmen gerade ankommen. */
  get listening(): number {
    return this.incoming.size;
  }

  async toggle(): Promise<void> {
    if (this.state === 'on' || this.state === 'starting') this.disable();
    else await this.enable();
  }

  /**
   * Mikrofon an: fragen, anhängen, fertig.
   *
   * Die Erlaubnis holt der Browser, und ein „nein" ist keine Ausnahme, sondern
   * eine Antwort — sie steht danach im Menü, statt dass ein Knopf stumm nichts
   * tut.
   */
  async enable(): Promise<void> {
    if (this.state === 'on' || this.state === 'starting') return;
    if (!this.available) {
      this.fail('Dieser Transport trägt keinen Ton');
      return;
    }
    this.state = 'starting';
    this.detail = 'Frage nach dem Mikrofon …';
    this.onChange?.();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // Ohne Echounterdrückung hört der andere sich selbst zurück, sobald
        // einer von beiden Lautsprecher statt Kopfhörer benutzt.
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      this.stream = stream;
      this.net.addStream(stream);
      this.state = 'on';
      this.detail = '';
    } catch (error) {
      this.fail(errorText(error));
      return;
    }
    this.onChange?.();
  }

  /** Mikrofon aus: der Strom wird abgehängt *und* angehalten. */
  disable(): void {
    const stream = this.stream;
    this.stream = null;
    if (stream) {
      this.net.removeStream(stream);
      // Nur das Abhängen ließe die Aufnahmeleuchte des Geräts an, und das ist
      // die eine Rückmeldung, der ein Mensch glauben können muss.
      for (const track of stream.getTracks()) track.stop();
    }
    this.state = 'off';
    this.detail = '';
    this.onChange?.();
  }

  /** Spricht dieser Mitspieler gerade? */
  speaking(peerId: string): boolean {
    return (this.incoming.get(peerId)?.speaking ?? 0) > 0;
  }

  /**
   * Jedes Bild: die Ohren dorthin, wo der Kopf ist, und jede Stimme dorthin,
   * wo ihr Sprecher steht.
   */
  update(dt: number, camera: THREE.Camera, avatars: RemoteAvatars): void {
    if (this.incoming.size === 0) return;
    const ctx = sharedAudio();
    if (ctx) this.moveListener(ctx, camera);

    for (const [peerId, voice] of this.incoming) {
      if (voice.panner && avatars.getHeadPose(peerId, _position)) {
        setPosition(voice.panner, _position);
      }
      voice.speaking = Math.max(0, voice.speaking - dt);
      if (!voice.analyser || !voice.samples) continue;
      voice.analyser.getByteTimeDomainData(voice.samples);
      if (level(voice.samples) > SPEAKING_LEVEL) voice.speaking = SPEAKING_HOLD;
    }
  }

  dispose(): void {
    this.disable();
    for (const peerId of [...this.incoming.keys()]) this.drop(peerId);
  }

  // --- innen ----------------------------------------------------------------

  private fail(detail: string): void {
    this.state = 'blocked';
    this.detail = detail;
    this.onChange?.();
  }

  /**
   * Ein Strom kommt an. Zweimal derselbe Sprecher heißt: er hat neu
   * eingeschaltet — der alte fliegt raus, sonst redet er doppelt.
   */
  private receive(stream: MediaStream, peerId: string): void {
    this.drop(peerId);

    const element = new Audio();
    element.srcObject = stream;
    element.autoplay = true;
    const ctx = sharedAudio();
    // Stumm nur dann, wenn der Ton stattdessen durch Web Audio läuft. Ohne
    // Kontext ist dieses Element die ganze Wiedergabe — flach, aber hörbar.
    element.muted = Boolean(ctx);
    void element.play().catch(() => undefined);

    const voice: Incoming = {
      stream,
      element,
      source: null,
      panner: null,
      analyser: null,
      samples: null,
      speaking: 0,
    };

    if (ctx) {
      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = REFERENCE_DISTANCE;
      panner.maxDistance = MAX_DISTANCE;
      panner.rolloffFactor = 1;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.connect(panner);
      panner.connect(ctx.destination);
      voice.source = source;
      voice.panner = panner;
      voice.analyser = analyser;
      voice.samples = new Uint8Array(new ArrayBuffer(analyser.fftSize));
    }

    this.incoming.set(peerId, voice);
    this.onChange?.();
  }

  private drop(peerId: string): void {
    const voice = this.incoming.get(peerId);
    if (!voice) return;
    this.incoming.delete(peerId);
    voice.source?.disconnect();
    voice.analyser?.disconnect();
    voice.panner?.disconnect();
    voice.element.pause();
    voice.element.srcObject = null;
    this.onChange?.();
  }

  /** Kopfposition und Blickrichtung an die Ohren des Kontextes. */
  private moveListener(ctx: AudioContext, camera: THREE.Camera): void {
    camera.updateWorldMatrix(true, false);
    _matrix.copy(camera.matrixWorld);
    _position.setFromMatrixPosition(_matrix);
    _forward.set(0, 0, -1).transformDirection(_matrix);
    _up.set(0, 1, 0).transformDirection(_matrix);

    const listener = ctx.listener;
    if (listener.positionX) {
      const when = ctx.currentTime;
      listener.positionX.setValueAtTime(_position.x, when);
      listener.positionY.setValueAtTime(_position.y, when);
      listener.positionZ.setValueAtTime(_position.z, when);
      listener.forwardX.setValueAtTime(_forward.x, when);
      listener.forwardY.setValueAtTime(_forward.y, when);
      listener.forwardZ.setValueAtTime(_forward.z, when);
      listener.upX.setValueAtTime(_up.x, when);
      listener.upY.setValueAtTime(_up.y, when);
      listener.upZ.setValueAtTime(_up.z, when);
      return;
    }
    // Ältere Browser kennen nur den alten Weg; er ist abgekündigt und wirkt.
    listener.setPosition(_position.x, _position.y, _position.z);
    listener.setOrientation(_forward.x, _forward.y, _forward.z, _up.x, _up.y, _up.z);
  }
}

/** Position an einen Panner, auf beiden Wegen, die es dafür gibt. */
function setPosition(panner: PannerNode, point: THREE.Vector3): void {
  if (panner.positionX) {
    const when = panner.context.currentTime;
    panner.positionX.setValueAtTime(point.x, when);
    panner.positionY.setValueAtTime(point.y, when);
    panner.positionZ.setValueAtTime(point.z, when);
    return;
  }
  panner.setPosition(point.x, point.y, point.z);
}

/** Effektivwert einer Wellenform, 0 bis 1. */
function level(samples: Uint8Array<ArrayBuffer>): number {
  let sum = 0;
  for (const sample of samples) {
    const value = (sample - 128) / 128;
    sum += value * value;
  }
  return Math.sqrt(sum / samples.length);
}

/** Warum das Mikrofon nicht kam — in einem Satz, den ein Mensch liest. */
function errorText(error: unknown): string {
  const name = (error as { name?: string } | null)?.name ?? '';
  if (name === 'NotAllowedError') return 'Mikrofon abgelehnt — im Browser erlauben';
  if (name === 'NotFoundError') return 'Kein Mikrofon gefunden';
  if (name === 'NotReadableError') return 'Mikrofon ist von etwas anderem belegt';
  return (error as Error)?.message || 'Mikrofon konnte nicht geöffnet werden';
}
