/**
 * **Vollbild, wo keine Brille ist.**
 *
 * In der Brille stellt sich die Frage nicht: Eine XR-Sitzung _ist_ Vollbild,
 * sie nimmt den ganzen Blick. Am Bildschirm ist sie dagegen die einzige
 * Antwort auf eine ganze Klasse von Geräten: der Browser einer Konsole, ein
 * Fernseher, ein Telefon im Querformat. Dort sind zwanzig Prozent der Fläche
 * Adresszeile und Systemleiste, und die Spielwiese läuft in dem Rest.
 *
 * Das API dafür ist zwei Zeilen, und die zwei Zeilen sind der Grund für diese
 * Datei: **Es gibt sie doppelt.** Safari und die WebKit-Browser der Konsolen
 * kennen bis heute nur `webkitRequestFullscreen`, ohne Promise, und ein
 * `element.requestFullscreen()` läuft dort in einen `TypeError`. Wer das an der
 * Stelle abfängt, wo der Knopf hängt, hat es an fünf Stellen abgefangen —
 * deshalb steht es hier, einmal, mit der Fallunterscheidung als Datentyp und
 * nicht als `any`.
 *
 * Kein DOM-Zugriff über die übergebenen Objekte hinaus: Was hier passiert,
 * ist mit zwei Attrappen prüfbar, und das ist der Punkt — ein Vollbildknopf,
 * der nur auf dem Gerät des Entwicklers klappt, ist kein Knopf.
 */

/** So viel vom `document` braucht das Vollbild — beide Schreibweisen. */
export interface FullscreenDocument {
  readonly fullscreenEnabled?: boolean;
  readonly webkitFullscreenEnabled?: boolean;
  readonly fullscreenElement?: Element | null;
  readonly webkitFullscreenElement?: Element | null;
  exitFullscreen?: () => Promise<void> | void;
  webkitExitFullscreen?: () => Promise<void> | void;
}

/**
 * Und so viel von dem Element, das groß werden soll. `navigationUI` steht hier
 * mit denselben drei Wörtern wie im DOM-Typ (`FullscreenNavigationUI`) — ein
 * `string` wäre weiter, und ein echtes `HTMLElement` passte dann nicht mehr
 * hinein.
 */
export interface FullscreenElement {
  requestFullscreen?: (options?: {
    navigationUI?: 'auto' | 'hide' | 'show';
  }) => Promise<void> | void;
  webkitRequestFullscreen?: () => Promise<void> | void;
}

/**
 * **Ob dieses Gerät Vollbild kann** — und zwar _darf_, nicht nur _kennt_.
 *
 * `fullscreenEnabled` ist die Frage nach der Erlaubnis: In einem `<iframe>`
 * ohne `allow="fullscreen"` steht die Funktion da und wirft. Ein Knopf, der in
 * einer Einbettung sichtbar ist und nichts tut, ist schlimmer als keiner —
 * also wird hier gefragt und der Knopf sonst gar nicht gezeigt.
 *
 * Ein WebKit-Browser, der `webkitRequestFullscreen` hat, aber kein
 * `webkitFullscreenEnabled` meldet, gilt als fähig: Das Flag fehlt dort
 * schlicht, die Funktion tut es nicht.
 */
export function fullscreenSupported(
  doc: FullscreenDocument | null | undefined,
  element: FullscreenElement | null | undefined,
): boolean {
  if (!doc || !element) return false;
  if (typeof element.requestFullscreen === 'function') return doc.fullscreenEnabled !== false;
  if (typeof element.webkitRequestFullscreen === 'function')
    return doc.webkitFullscreenEnabled !== false;
  return false;
}

/** Ob gerade etwas im Vollbild liegt. */
export function fullscreenActive(doc: FullscreenDocument | null | undefined): boolean {
  if (!doc) return false;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

/**
 * **Umschalten** — und zurückgeben, was danach gilt.
 *
 * Der Rückgabewert ist der Stand _nach_ dem Umschalten und nicht der Wunsch:
 * Ein `requestFullscreen`, das der Browser ablehnt (keine Nutzergeste, ein
 * Gerät, das es nicht kann), kommt als `false` zurück, und der Knopf
 * beschriftet sich richtig statt zu behaupten, er hätte etwas getan.
 *
 * Abgelehnt wird hier nichts weitergeworfen: Vollbild ist eine Bequemlichkeit,
 * und eine Bequemlichkeit, die eine Ausnahme in die Konsole schreibt, hat
 * niemandem geholfen. Was passiert ist, steht im Rückgabewert.
 */
export async function toggleFullscreen(
  doc: FullscreenDocument | null | undefined,
  element: FullscreenElement | null | undefined,
): Promise<boolean> {
  if (!doc || !element) return false;
  if (fullscreenActive(doc)) {
    await call(doc.exitFullscreen ?? doc.webkitExitFullscreen, doc);
    return fullscreenActive(doc);
  }
  // `navigationUI: 'hide'` ist eine Bitte und kein Befehl; Browser, die sie
  // nicht kennen, ignorieren das Objekt. Auf einem Fernseher ist sie der
  // Unterschied zwischen Vollbild und Vollbild mit Leiste darüber.
  if (typeof element.requestFullscreen === 'function') {
    await call(() => element.requestFullscreen?.({ navigationUI: 'hide' }), element);
  } else {
    await call(element.webkitRequestFullscreen, element);
  }
  return fullscreenActive(doc);
}

/**
 * Einen der beiden Wege gehen, egal ob er ein Promise zurückgibt — die
 * WebKit-Variante tut es nicht — und egal ob er wirft.
 */
async function call(fn: (() => Promise<void> | void) | undefined, self: object): Promise<void> {
  if (typeof fn !== 'function') return;
  try {
    await fn.call(self);
  } catch {
    // Siehe oben: Der Aufrufer liest den Stand, nicht die Ausnahme.
  }
}

/**
 * **Auf jede Änderung hören** — auch auf die, die niemand angeklickt hat.
 *
 * `Esc` beendet das Vollbild, und die Systemtaste eines Fernsehers auch. Ein
 * Knopf, der sich nur beim Klicken umbeschriftet, sagt danach das Falsche.
 * Beide Ereignisnamen, aus demselben Grund wie beide Funktionsnamen.
 *
 * @returns die Funktion, die das Zuhören wieder abstellt.
 */
export function onFullscreenChange(
  target: {
    addEventListener: (type: string, listener: () => void) => void;
    removeEventListener: (type: string, listener: () => void) => void;
  },
  listener: () => void,
): () => void {
  const names = ['fullscreenchange', 'webkitfullscreenchange'];
  for (const name of names) target.addEventListener(name, listener);
  return () => {
    for (const name of names) target.removeEventListener(name, listener);
  };
}
