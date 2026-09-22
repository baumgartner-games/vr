/**
 * **Wann die Startladung einer Welt wirklich fertig ist.**
 *
 * `App.goTo` kommt zurück, sobald `World.init` durch ist — und `init` baut die
 * Welt, es _lädt_ sie nicht zu Ende. Der Beweis steht in der Testwelt: Die
 * Küche holt ihre Möbel mit `void import('core/kitchenModel').then(…)`, der
 * Koch kommt aus `core/chefModel.ts`, die Wundertüte aus
 * `core/mixedbagModel.ts`, und keiner dieser drei wird von `init` abgewartet.
 * Wer den Knopf freigäbe, sobald `goTo` aufgelöst hat, gäbe ihn frei, während
 * die halbe Küche noch im Netz steht. „Geladen" wäre dann ein Wort ohne
 * Deckung.
 *
 * ## Warum hier ein Lade-Manager sitzt und kein `assetsReady` in der Welt
 *
 * Die naheliegende Lösung wäre eine Promise, die jede Welt aus ihren
 * Erst-Ladungen zusammensetzt. Sie hätte aber an jeder Stelle nachgetragen
 * werden müssen, die etwas nachlädt — in der Küche allein an fünf —, und eine
 * Liste, die an fünf Stellen gepflegt wird, ist nach dem zweiten Umbau
 * unvollständig: Sie meldet „fertig", weil jemand vergessen hat, seine Ladung
 * einzutragen. Das ist genau die Art von Unehrlichkeit, die hier nicht
 * entstehen soll.
 *
 * Also wird **eine Stelle** gefragt, durch die ohnehin alles läuft:
 * `THREE.DefaultLoadingManager`. Jeder `GLTFLoader` und jeder `TextureLoader`,
 * der ohne eigenen Manager gebaut wird — und das sind hier alle —, meldet sich
 * bei ihm an und ab. Er weiß damit von jedem Modell und jeder Textur, ohne
 * dass eine Welt etwas dazutun muss, und er weiß es auch von dem, was erst
 * morgen dazukommt.
 *
 * **Was er nicht weiß**, und das steht hier, damit es niemand für gemessen
 * hält:
 *
 * - **Die Aufnahmen der Küche** (26 `.ogg`, `worlds/test/zones/kitchenAudio.ts`)
 *   kommen über ein blankes `fetch` und werden erst entpackt, wenn der Ton
 *   aufgeschlossen ist — also **nach** dem Druck auf den Knopf. Auf sie zu
 *   warten hieße, auf etwas zu warten, das ohne den Klick gar nicht anfängt.
 *   Eine fehlende Aufnahme ist obendrein Stille und keine kaputte Welt.
 * - **Chunks**, die eine Welt nachlädt (`import(…)`). Der Browser holt sie
 *   ohne Lade-Manager. Dafür steht unten die Stille-Frist: Wer gerade einen
 *   Chunk holt, um danach ein Modell zu laden, ist binnen einer Sekunde wieder
 *   zu hören.
 *
 * ## Und warum „still", nicht „leer"
 *
 * Ein Lade-Manager kennt nur zwei Ereignisse: „es geht wieder los" (`onStart`,
 * genau einmal beim Übergang von leer auf beschäftigt) und „alles, was ich
 * kenne, ist da" (`onLoad`). Zwischen zwei Wellen ist er leer, **obwohl** die
 * Welt noch lädt: Die Küche hat dann ihren Chunk, aber noch kein Modell
 * angefordert. Deshalb gilt fertig erst, wenn es eine Weile still **bleibt**
 * (`quiet`), und nicht schon beim ersten leeren Augenblick.
 */

/** Was von einem `THREE.LoadingManager` gebraucht wird — und nicht mehr. */
export interface LoadWatch {
  /** Der Übergang von „nichts zu tun" auf „es lädt". */
  onStart?: ((url: string, loaded: number, total: number) => void) | undefined;
  /** Alles, was angemeldet war, ist durch — auch das, was dabei scheiterte. */
  onLoad?: (() => void) | undefined;
}

export interface SettleOptions {
  /**
   * So lange muss es **still bleiben**, bis „fertig" gilt. Eine Sekunde ist
   * die Zeit, die ein nachgeholter Chunk auf einer Mobilfunkleitung braucht,
   * um sich mit der nächsten Ladung zu melden (150 ms Laufzeit und ein paar
   * Zehntel für die Datei); kürzer, und die Pause zwischen zwei Wellen sähe
   * aus wie das Ende.
   */
  quiet: number;
  /**
   * Und so lange wird **höchstens** gewartet. Der Deckel ist keine Feinheit,
   * sondern die Bedingung dafür, dass ein Knopf, der auf das Laden wartet,
   * nicht ewig tot bleibt: Eine Datei, die weder ankommt noch scheitert — ein
   * hängendes `fetch` in einem Funkloch, ein Proxy, der nichts sagt —, meldet
   * sich bei keinem Lade-Manager wieder ab.
   */
  cap: number;
}

/**
 * **Der Wächter.** Einer je App, gebaut, _bevor_ die erste Welt lädt: Er muss
 * die erste Welle mitbekommen, sonst hielte er eine laufende Ladung für Stille.
 */
export class AssetGate {
  /** Ob der Lade-Manager gerade etwas offen hat. */
  private busy = false;
  /** Wer beim nächsten Ereignis nachrechnen will (`settle`). */
  private readonly listeners = new Set<() => void>();

  /**
   * Die bisherigen Handler bleiben dran: Der Manager gehört three.js und nicht
   * uns, und wer ihn überschreibt, nimmt dem nächsten seinen.
   */
  constructor(watch: LoadWatch) {
    const wasStart = watch.onStart;
    const wasLoad = watch.onLoad;
    watch.onStart = (url, loaded, total): void => {
      this.busy = true;
      wasStart?.(url, loaded, total);
      this.tell();
    };
    watch.onLoad = (): void => {
      this.busy = false;
      wasLoad?.();
      this.tell();
    };
  }

  /** Ob in diesem Augenblick etwas unterwegs ist. */
  get loading(): boolean {
    return this.busy;
  }

  private tell(): void {
    for (const listener of [...this.listeners]) listener();
  }

  /**
   * **Warten, bis es still ist** — und antworten, ob es das wirklich wurde.
   *
   * `true` heißt: Die Startladung ist durch. `false` heißt: Der Deckel war
   * schneller, es lädt noch, und der Knopf wird trotzdem frei — mit einer
   * Zeile, die das sagt (`core/warmStart.startButton`, Zustand `dauert`).
   *
   * Eine **gescheiterte** Datei löst ebenfalls auf, und zwar ohne Umweg: Der
   * Lade-Manager meldet sie ab wie jede andere (`itemError` + `itemEnd`), die
   * Welt steht mit ihrem gebauten Ersatz da, und ein Knopf, der auf eine Datei
   * wartet, die es nicht gibt, wäre der schlechteste aller Zustände.
   */
  settle(options: SettleOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      let quiet: ReturnType<typeof setTimeout> | null = null;
      let cap: ReturnType<typeof setTimeout> | null = null;
      const stop = (settled: boolean): void => {
        if (quiet !== null) clearTimeout(quiet);
        if (cap !== null) clearTimeout(cap);
        quiet = null;
        cap = null;
        this.listeners.delete(tick);
        resolve(settled);
      };
      const tick = (): void => {
        if (quiet !== null) {
          clearTimeout(quiet);
          quiet = null;
        }
        if (this.busy) return;
        quiet = setTimeout(() => stop(true), options.quiet);
      };
      cap = setTimeout(() => stop(false), options.cap);
      this.listeners.add(tick);
      tick();
    });
  }
}
