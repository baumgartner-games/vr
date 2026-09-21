/**
 * **Das Mausrad** — wie viel eine Raste ist, und wem sie gehört.
 *
 * Der Zoom von oben hängt am Rad (`core/TopDownCamera.ts`), und das Rad ist
 * eines der unzuverlässigsten Eingabegeräte im Browser. Zwei Dinge gingen
 * daran schief, und beide sahen für den Spieler gleich aus („das Rad tut
 * nichts"):
 *
 * 1. **Ein Rad meldet in drei Einheiten.** `deltaMode` sagt, ob `deltaY`
 *    Bildpunkte (`0`), Zeilen (`1`) oder Seiten (`2`) meint. Firefox meldet
 *    Zeilen: eine Raste sind dort `3` — gegen eine Schwelle von 50, die für
 *    Chromes `100` gedacht war. Wer dort zoomen wollte, drehte ein Dutzend
 *    Rasten, und wer zwischendurch zurückdrehte, kam nie an. Genau dieselbe
 *    Umrechnung steht schon beim Archiv (`worlds/haunting/views/archiveRole.ts`).
 * 2. **Der Sammler sammelte über den Richtungswechsel hinweg.** Zwei Rasten
 *    vor und zwei zurück ergaben `0`, und ein Rad, dessen erste Raste nach dem
 *    Umkehren verfällt, fühlt sich kaputt an.
 *
 * Und das Dritte ist keine Zahl, sondern eine Frage: **Wem gehört die
 * Drehung?** Das Rad wird am Fenster abgehört, damit der Zoom nicht unter dem
 * Weltnamen aufhört — dieselbe Drehung erreicht damit aber auch die Kamera,
 * wenn der Zeiger im geöffneten Menü steht. Dann scrollte die Liste **und**
 * die Welt zoomte dahinter. Wer über einem Kasten dreht, der selbst scrollt,
 * meint den Kasten (`wheelTakenByUi`).
 *
 * Reine Rechnung: kein three.js, kein `window`. Der Kasten kommt als Element
 * herein, sein Stil als Funktion — so prüft ein Test beides ohne Browser.
 */

/** Wie viel Bildpunkte eine gemeldete Zeile ist — wie im Archiv. */
export const WHEEL_LINE = 16;
/** Und eine gemeldete Seite. */
export const WHEEL_PAGE = 400;
/**
 * **Wie viel Rad eine Stufe ist**, in Bildpunkten.
 *
 * Eine Raste ist in Chrome 100 Bildpunkte, in Firefox 3 Zeilen — also 48. Die
 * Schwelle liegt darunter, damit **eine** Raste überall **eine** Stufe ist;
 * hier stand einmal 50, und das war genau die Zahl, die dazwischen fiel.
 * Trackpads melden kleinere Beträge, und die sammeln sich wie bisher.
 */
export const WHEEL_NOTCH = 40;

/** Was ein Rad-Ereignis mitbringt — mehr als das wird hier nicht gebraucht. */
export interface WheelLike {
  readonly deltaY: number;
  readonly deltaMode: number;
  /**
   * **Die Querachse** — dieselbe Drehung, wenn der Browser sie umgelegt hat.
   * Siehe `wheelPixels`; ohne Angabe zählt sie als null.
   */
  readonly deltaX?: number;
}

/**
 * **Die Drehung in Bildpunkten** — egal, in welcher Einheit sie gemeldet wird,
 * und egal, auf welcher der beiden Achsen sie ankommt.
 *
 * Eine unbekannte Einheit gilt als Bildpunkte: Ein Rad, das wegen eines
 * vierten `deltaMode` gar nicht mehr zoomt, wäre schlimmer als eines, das
 * etwas zu fein zoomt.
 *
 * **Und `deltaX` zählt mit, wenn auf `deltaY` nichts steht.** Das ist der
 * gemeldete Fehler „ich kann nicht gleichzeitig laufen und zoomen": Wer
 * **rennt**, hält `Shift` (siehe `docs/agents/steuerung.md`, _Sprinten_) — und
 * ein Browser legt eine Raste bei gedrückter Umschalttaste auf die **Querachse**
 * um. Chrome und Firefox tun das auf Windows und Linux, macOS tut es im
 * System. Die Folge sah für den Spieler aus, als ginge immer nur eines:
 * Sobald er lief, meldete jede Raste `deltaY: 0` und `deltaX: ±100`, und das
 * Rad tat nichts.
 *
 * Genommen wird deshalb die Achse mit dem **größeren Betrag**: Eine senkrechte
 * Drehung bleibt eine senkrechte, ein waagerechtes Wischen auf dem Trackpad
 * zoomt genauso, und keine der beiden kann die andere aufheben.
 */
export function wheelPixels(event: WheelLike): number {
  const unit = event.deltaMode === 1 ? WHEEL_LINE : event.deltaMode === 2 ? WHEEL_PAGE : 1;
  const sideways = event.deltaX ?? 0;
  const along = Math.abs(sideways) > Math.abs(event.deltaY) ? sideways : event.deltaY;
  return along * unit;
}

/** Was aus einer Drehung wird: der neue Stand des Sammlers und die Stufe dazu. */
export interface WheelStep {
  /** Was noch nicht für eine Stufe gereicht hat. */
  readonly acc: number;
  /** Eine Stufe näher (`-1`), eine weiter (`+1`) — oder noch keine (`0`). */
  readonly step: number;
}

/**
 * **Der Sammler.** Kleine Beträge summieren sich, bis eine Stufe daraus wird;
 * ein Richtungswechsel fängt neu an, statt gegen das Gesammelte zu rechnen.
 */
export function wheelStep(acc: number, pixels: number, notch = WHEEL_NOTCH): WheelStep {
  const sum = acc * pixels < 0 ? pixels : acc + pixels;
  if (!Number.isFinite(sum)) return { acc: 0, step: 0 };
  if (Math.abs(sum) < notch) return { acc: sum, step: 0 };
  return { acc: 0, step: sum < 0 ? -1 : 1 };
}

/**
 * **Ob ein Kasten sein eigenes Rad hat** — er scrollt selbst, also gehört ihm
 * die Drehung.
 *
 * `overlay` steht mit dabei, weil ältere WebKit-Fassungen das statt `auto`
 * melden; `hidden`, `visible` und `clip` scrollen nicht und zählen deshalb
 * nicht — eine Zeile mit abgeschnittenem Text ist kein Menü.
 */
export function scrollsItself(overflowY: string): boolean {
  return overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay';
}

/**
 * **Ob die Oberfläche die Drehung nimmt** — vom Ziel des Ereignisses aufwärts
 * bis zum Dokument.
 *
 * Gefragt wird nicht, ob der Kasten gerade **überläuft**: Ein Menü, dessen
 * Liste heute kurz genug ist, ist morgen lang, und ein Zoom, der mal durch das
 * Menü hindurchgeht und mal nicht, ist der verwirrendere von beiden Fehlern.
 *
 * Die Leinwand selbst scrollt nie, und die Leiste mit dem Weltnamen auch
 * nicht — über beiden zoomt das Rad wie bisher.
 *
 * @param start    das Ziel des Ereignisses (`event.target`), oder `null`
 * @param overflowOf wie der geltende `overflow-y` eines Elements lautet
 */
export function wheelTakenByUi(
  start: Element | null,
  overflowOf: (node: Element) => string,
): boolean {
  for (let node: Element | null = start; node; node = node.parentElement) {
    if (scrollsItself(overflowOf(node))) return true;
  }
  return false;
}
