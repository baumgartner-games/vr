/**
 * **Was der Service Worker mit einer Anfrage macht** — und zwar als Rechnung,
 * nicht als `if`-Kette im Ereignis.
 *
 * Ein Service Worker ist der einzige Teil dieses Projekts, der zwischen der
 * Seite und dem Netz sitzt: Wenn er falsch entscheidet, sieht man nicht einen
 * Fehler, sondern **eine alte Welt** — und zwar so lange, bis jemand den
 * Speicher des Browsers leert. Auf einer Brille ist das eine Viertelstunde
 * Sucherei. Deshalb steht die Entscheidung hier, in einer Funktion ohne
 * `caches`, ohne `fetch` und ohne `self`, und `sw.ts` daneben führt nur aus,
 * was sie sagt.
 *
 * Vier Wege gibt es, und mehr sollen es nicht werden:
 *
 * - `page` — **erst das Netz, dann der Speicher**. Eine Seite nennt die
 *   Dateinamen aller anderen Dateien; wer sie aus dem Speicher ausliefert,
 *   während es sie frisch gäbe, hält den ganzen Build fest. Genau das ist der
 *   Fehler, den `core/staleBuild.ts` hinterher wieder aufräumen muss.
 * - `immutable` — **erst der Speicher**. Alles unter `assets/` trägt den Hash
 *   seines Inhalts im Namen: Diese Datei ändert sich nie; ändert sich der
 *   Inhalt, heißt sie anders. Ein zweiter Netzweg dafür wäre reine Wartezeit.
 * - `revalidate` — **aus dem Speicher, und im Hintergrund nachholen**. Modelle,
 *   Töne, Controller-Profile und das Manifest haben feste Namen: Sie sollen
 *   sofort da sein, aber auch nicht ewig alt bleiben.
 * - `bypass` — **gar nichts tun**. Alles, was nicht zu dieser Anwendung
 *   gehört, und alles, was ein Cache falsch machen würde.
 */

/** Die vier Wege. Siehe oben; `sw.ts` hat zu jedem genau einen Zweig. */
export type Strategy = 'page' | 'immutable' | 'revalidate' | 'bypass';

/** So viel von einer `Request` braucht die Entscheidung. */
export interface RouteRequest {
  /** `GET`, `POST`, … */
  readonly method: string;
  /** Die volle Adresse — im Service Worker ist sie immer absolut. */
  readonly url: string;
  /** `request.mode === 'navigate'`: Der Browser holt eine ganze Seite. */
  readonly navigate: boolean;
  /** Ob ein `Range`-Kopf dranhängt (ein `<audio>`, das stückweise lädt). */
  readonly range?: boolean;
}

/**
 * Woran eine Datei mit Hash im Namen zu erkennen ist: `main-C3aB9x2Q.js`.
 * Vite hängt acht Zeichen aus Base64 an, getrennt durch einen Bindestrich —
 * und Base64 dieser Art kennt den Bindestrich selbst (`Bd7_x-1a`), weshalb das
 * Muster allein nicht reicht: `apple-touch-icon.png` sähe genauso aus.
 * Deshalb gilt es nur unterhalb von `assets/`, und dort liegt genau das, was
 * der Build erzeugt hat. Alles aus `public/` behält seinen Namen und wird
 * nachgeholt.
 *
 * Absichtlich streng — eine Datei, die hier fälschlich als unveränderlich
 * gilt, bleibt bis zum nächsten Deploy im Speicher stehen.
 */
const HASHED = /-[A-Za-z0-9_-]{8,}\.[a-z0-9]+$/;

/**
 * Liegt die Adresse im Geltungsbereich dieser Anwendung?
 *
 * `scope` ist das, was `registration.scope` meldet — auf GitHub Pages
 * `https://user.github.io/vr/`, lokal `http://localhost:5173/`. Der Vergleich
 * läuft über die ganze Adresse und erledigt damit beides auf einmal: fremde
 * Server (die Relays der Verbindung, ein Tunnel) und den Nachbarn auf
 * demselben Server, der uns nichts angeht.
 */
export function inScope(url: string, scope: string): boolean {
  return url.startsWith(scope);
}

/** Was mit dieser Anfrage geschehen soll. */
export function routeFor(request: RouteRequest, scope: string): Strategy {
  // Nur Lesen wird gespeichert. Ein `POST` kommt hier ohnehin nur von
  // Fremdservern, und `cache.put` lehnt ihn ab.
  if (request.method !== 'GET') return 'bypass';
  // Ein `Range`-Kopf beantwortet sich mit `206 Partial Content`, und die legt
  // der Speicher nicht ab: Wer es doch versucht, bekommt eine Ausnahme mitten
  // im Abspielen.
  if (request.range) return 'bypass';
  if (!inScope(request.url, scope)) return 'bypass';

  const path = pathOf(request.url);
  // Quellkarten sind Megabytes für die Entwicklerwerkzeuge und für sonst
  // niemanden — im Speicher eines Telefons haben sie nichts verloren.
  if (path.endsWith('.map')) return 'bypass';
  // Der Service Worker selbst geht nie über den Speicher; sonst wäre der
  // nächste Build von seinem Vorgänger abhängig.
  if (path.endsWith('/sw.js')) return 'bypass';

  if (request.navigate) return 'page';
  if (path.includes('/assets/') && HASHED.test(path)) return 'immutable';
  return 'revalidate';
}

/** Der Pfad ohne Query — `?t=123` an einem Modell ändert nichts am Dateityp. */
function pathOf(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}
