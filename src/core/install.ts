/**
 * **Wann ein Knopf zum Installieren dasteht — und was er sagt.**
 *
 * „Installieren" heißt im Web dreimal etwas anderes, und genau das ist der
 * Grund für diese Datei:
 *
 * - **Chrome, Edge, der Browser der Quest** melden sich von selbst
 *   (`beforeinstallprompt`), sobald Manifest und Service Worker stimmen. Dann
 *   gibt es einen echten Knopf, und der Browser fragt den Rest.
 * - **Safari auf iPhone und iPad** meldet sich nie. Dort geht es nur über
 *   _Teilen → Zum Home-Bildschirm_, und ein Knopf, der das nicht auslösen
 *   kann, wäre wieder einer, der nichts tut (siehe `core/fullscreen.ts`,
 *   dieselbe Regel). Also steht dort ein **Satz** statt eines Knopfes.
 * - **Firefox am Schreibtisch** kennt beides nicht. Dann steht gar nichts da.
 *
 * Und der vierte Fall ist der wichtigste: **Wer schon installiert hat, wird
 * nicht gefragt.** Eine App, die in ihrem eigenen Fenster läuft und einem
 * anbietet, sich zu installieren, hat nicht verstanden, wo sie ist.
 *
 * Alles hier ist reine Rechnung: keine Ereignisse, kein `document`. Was der
 * Browser meldet, kommt als Wert herein — geprüft wird mit Attrappen, denn
 * ein iPhone steht nicht in der CI.
 */

/** Was die Startseite anzeigen soll. */
export type InstallState =
  /** Läuft bereits als installierte App — nichts anbieten. */
  | 'installed'
  /** Der Browser hat ein Angebot hinterlegt: echter Knopf. */
  | 'prompt'
  /** Geht nur von Hand (iPhone, iPad): ein Satz, der den Weg nennt. */
  | 'manual'
  /** Dieser Browser kann es nicht — dann steht nichts da. */
  | 'none';

/**
 * So viel vom Browser braucht die Frage „läuft das schon als App?".
 *
 * Flach und nicht als „so viel vom `window`": `navigator.standalone` steht in
 * keiner Typdefinition, weil es in keiner Norm steht — die eine Behauptung
 * darüber gehört an die Aufrufstelle (`core/pwa.ts`) und nicht in die
 * Rechnung.
 */
export interface DisplayEnv {
  /** `window.matchMedia`, wo es das gibt. */
  matchMedia?: (query: string) => { matches: boolean };
  /** Safaris eigene Antwort, seit iOS 2.1 und bis heute die einzige dort. */
  standalone?: boolean;
}

/** So viel vom `navigator` braucht die Frage „ist das ein Apple-Handgerät?". */
export interface AppleNavigator {
  readonly userAgent: string;
  readonly maxTouchPoints?: number;
}

/**
 * **Läuft die Seite schon als installierte App?**
 *
 * Zwei Wege, weil es zwei Welten gibt: `display-mode` ist die Frage nach dem
 * Manifest (`standalone`, `fullscreen`, `minimal-ui`), und die beantwortet
 * jeder Browser außer Safari. Safari kennt stattdessen `navigator.standalone`
 * — und meldet dort `true`, wo jeder andere `display-mode: standalone` sagt.
 */
export function isStandalone(env: DisplayEnv | null | undefined): boolean {
  if (!env) return false;
  if (env.standalone === true) return true;
  const ask = env.matchMedia;
  if (typeof ask !== 'function') return false;
  // `fullscreen` steht zuerst, weil das Manifest genau das verlangt
  // (`display: fullscreen`); `standalone` ist der Rückfall, den ein Browser
  // nimmt, der Vollbild nicht hergibt.
  return (
    ask('(display-mode: fullscreen)').matches ||
    ask('(display-mode: standalone)').matches ||
    ask('(display-mode: minimal-ui)').matches
  );
}

/**
 * **Ein iPhone oder iPad?** — also ein Gerät, auf dem das Installieren im
 * Teilen-Menü steht und nirgendwo sonst.
 *
 * Der zweite Fall ist der, den man vergisst: **iPadOS meldet sich seit 13 als
 * Macintosh.** Ein iPad ist damit vom Desktop-Safari nur an einem zu
 * unterscheiden — es hat Berührungspunkte, und ein Mac hat keine.
 */
export function isAppleHandheld(nav: AppleNavigator | null | undefined): boolean {
  if (!nav) return false;
  if (/iPhone|iPad|iPod/i.test(nav.userAgent)) return true;
  return /Macintosh/i.test(nav.userAgent) && (nav.maxTouchPoints ?? 0) > 1;
}

/** Was aus den drei Antworten folgt. Reihenfolge ist die Entscheidung. */
export function installState(input: {
  standalone: boolean;
  offer: boolean;
  apple: boolean;
}): InstallState {
  if (input.standalone) return 'installed';
  if (input.offer) return 'prompt';
  if (input.apple) return 'manual';
  return 'none';
}

/**
 * Der Satz zum Zustand. Er steht hier und nicht im HTML, weil er sich mit dem
 * Zustand ändert — und weil zwei Stellen mit demselben Satz nach drei Wochen
 * zwei verschiedene Sätze sind.
 */
export const INSTALL_TEXT: Record<InstallState, string> = {
  prompt:
    'Legt die Spielwiese als App ab: eigenes Symbol, kein Browserrahmen — und sie startet auch ohne Netz.',
  manual:
    'Auf iPhone und iPad geht es über das Teilen-Menü: „Zum Home-Bildschirm“. Danach startet die Spielwiese ohne Adresszeile — dort ist das der einzige Weg zum Vollbild.',
  installed: '',
  none: '',
};
