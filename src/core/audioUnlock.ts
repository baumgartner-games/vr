/**
 * **Warum ein Browser erst dann klingt, wenn man ihn richtig fragt.**
 *
 * Web Audio darf nicht von allein loslegen — sonst könnte jede Seite
 * ungefragt Krach machen. Ein `AudioContext` fängt deshalb **angehalten** an
 * (`state: 'suspended'`) und läuft erst nach einer Geste des Spielers. Nur:
 * Die Browser sind sich nicht einig, **wie lange** eine Geste zählt.
 *
 * - **Chromium** (Android, Quest, Desktop) kennt _sticky activation_: Wer
 *   einmal geklickt hat, darf für den Rest der Sitzung einen Kontext
 *   aufmachen, und der läuft sofort.
 * - **WebKit** (iPhone, iPad, und damit jede dorthin installierte PWA) kennt
 *   nur _transient activation_: Der Kontext muss **im Ereignis selbst**
 *   entstehen oder fortgesetzt werden. Ein `resume()` zwei Sekunden später —
 *   aus dem Bildtakt, nach dem Laden einer Welt — wird still abgelehnt, und
 *   der Kontext bleibt für immer angehalten.
 *
 * Genau das war hier der Fall, und es erklärt das Bild, in dem der Fehler
 * gemeldet wurde: **im Browser ja, in der installierten App nein.** Die
 * Spielwiese machte ihren Kontext erst auf, wenn eine Zone ihre Töne holt
 * (`worlds/test/zones/kitchenAudio.prime`) — Sekunden nach dem Druck auf
 * _Starten_, weil dazwischen ein Weltmodul, ein Modell und ein paar Megabyte
 * Aufnahmen liegen. Auf Chromium ging das gut. Auf WebKit ist es zu spät.
 *
 * **Was diese Datei macht, ist deshalb eine Zeile Absicht**: Sie fasst den
 * Kontext **während** der Geste an — und tut es bei jeder Geste wieder, bis er
 * wirklich läuft.
 *
 * Dazu der stille Puffer: Ein `resume()` allein genügt WebKit nicht immer,
 * ein einzelnes abgespieltes Sample dagegen schon. Es dauert eine
 * Achtundvierzigtausendstelsekunde und ist nicht zu hören — die übliche und
 * einzige Art, ein iPhone aufzuschließen.
 */
import { sharedAudio } from './Audio';

/**
 * So viel von einem `AudioContext`, wie das Aufschließen braucht. Derselbe
 * Zuschnitt wie in `core/fullscreen.ts` und `core/install.ts`: genau die
 * Schnittstelle, die benutzt wird, damit ein Test sie nachbauen kann, ohne
 * dass irgendwo `any` steht.
 */
export interface Unlockable {
  /**
   * `suspended`, `running`, `closed` — **und `interrupted`**, den Zustand,
   * den nur WebKit kennt: Ein Anruf, ein Wecker, eine andere App, die Ton
   * will, und der Kontext ist angehalten, ohne dass ihn jemand angehalten
   * hätte. Er ist der Grund, warum unten alles außer `running` als
   * aufzuschließen gilt, statt nur `suspended` abzufragen.
   */
  readonly state: AudioContextState;
  readonly sampleRate: number;
  readonly destination: AudioNode;
  resume(): Promise<void>;
  createBuffer(channels: number, frames: number, rate: number): AudioBuffer;
  createBufferSource(): AudioBufferSourceNode;
}

/**
 * **Den Kontext aufschließen** — und zurückgeben, ob er danach schon läuft.
 *
 * `false` ist kein Fehler: `resume()` ist ein Versprechen, und der Zustand
 * springt erst um, wenn der Browser es eingelöst hat. Deshalb bleibt die Geste
 * unten angemeldet, bis `state` wirklich `running` sagt — ein einzelner
 * Rückgabewert kann das nicht entscheiden.
 *
 * Aufgerufen wird sie **im Ereignis**, nicht danach. Wer sie in ein `await`
 * hängt, hat die Geste schon verloren.
 */
export function unlockAudio(ctx: Unlockable | null = sharedAudio()): boolean {
  if (!ctx || ctx.state === 'closed') return false;
  if (ctx.state !== 'running') {
    // Abgelehnt wird hier ständig — außerhalb einer Geste ist genau das die
    // richtige Antwort des Browsers, und ein roter Eintrag in der Konsole
    // dafür wäre Lärm.
    void ctx.resume().catch(() => undefined);
  }
  try {
    const source = ctx.createBufferSource();
    source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    source.connect(ctx.destination);
    source.start(0);
  } catch {
    // Ein Kontext, der noch keinen Puffer hergibt, ist einer, der es beim
    // nächsten Anfassen tut. Das Aufschließen darf nichts abbrechen.
  }
  return ctx.state === 'running';
}

/**
 * Die Ereignisse, die als Geste gelten.
 *
 * Alle fünf, und nicht nur `click`: Auf dem Glas kommt `pointerdown` zuerst,
 * auf älteren Geräten stattdessen `touchend`, am Schreibtisch auch mal nur
 * eine Taste — und in der Brille ist der einzige DOM-Druck der auf den
 * Startknopf, der als `click` ankommt. Doppelt gezählt wird nichts: Sobald der
 * Kontext läuft, meldet sich das Ganze wieder ab.
 */
const GESTURES = ['pointerdown', 'pointerup', 'touchend', 'keydown', 'click'] as const;

/** So viel vom `window`, wie das Anmelden braucht. */
export interface GestureTarget {
  addEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
  removeEventListener(type: string, listener: () => void, options?: AddEventListenerOptions): void;
}

/**
 * **Bei jeder Geste aufschließen, solange der Kontext nicht läuft.**
 *
 * `capture: true`, damit es auch dann läuft, wenn ein Knopf das Ereignis
 * unterwegs aufhält; `passive: true`, weil hier nichts abgebrochen wird und
 * ein Zeiger auf dem Glas nicht ins Stocken geraten soll.
 *
 * **Angemeldet bleibt es für immer**, und das ist der zweite Grund, warum es
 * diese Datei gibt. Ein laufender Kontext bleibt nicht laufend: iOS hält ihn
 * an, wenn ein Anruf kommt oder man die App wegschiebt, und eine Brille tut
 * dasselbe im Ruhezustand. Wer sich nach dem ersten Erfolg abmeldete, hätte
 * nach dem ersten App-Wechsel wieder eine stille Küche — und zwar eine, die
 * sich mit keiner Geste mehr heilen ließe. Der Preis dafür ist ein Vergleich
 * je Fingertipp.
 *
 * Zurück kommt trotzdem das Gegenstück zum Anmelden: Eine Anmeldung ohne
 * Abmeldung ist die Sorte Zeile, die man beim zweiten Aufruf bereut.
 */
export function armAudioUnlock(
  target: GestureTarget | null = globalThis.window ?? null,
  context: () => Unlockable | null = sharedAudio,
): () => void {
  if (!target) return () => undefined;
  const options: AddEventListenerOptions = { capture: true, passive: true };
  const listener = (): void => {
    const ctx = context();
    if (ctx && ctx.state === 'running') return;
    unlockAudio(ctx);
  };
  for (const type of GESTURES) target.addEventListener(type, listener, options);
  return () => {
    for (const type of GESTURES) target.removeEventListener(type, listener, options);
  };
}
