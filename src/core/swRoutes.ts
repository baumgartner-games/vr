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
 *
 * Und **eine Einschränkung des dritten Weges**, siehe `isPinned`: Was die
 * Prüfsumme seines Inhalts in der Adresse trägt, wird nicht nachgeholt.
 *
 * ## Dazu drei Fragen zum Aufräumen
 *
 * Ein Speicher, der nur wächst, ist so falsch wie einer, der alles wegwirft.
 * Welcher Eintrag einen Deploy überlebt, entscheiden `isStaleMedia` und
 * `isStaleAsset` — auch sie hier, ohne `caches`, und mit Test.
 */
import { assetHashOf, type AssetHashes } from './assetVersion';

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
 * **Trägt dieser Pfad den Hash seines Inhalts im Namen?** Die eine Lesart für
 * alle drei Stellen, die sie brauchen: der Weg `immutable` unten, die
 * Aufteilung der Vorratsliste auf zwei Speicher (`precacheStore`) und das
 * Aufräumen (`isStaleAsset`). Eine zweite wäre eine, die beim nächsten Umbau
 * anders entscheidet als die, die aufräumt.
 *
 * Gefragt wird mit einem Pfad — einer ganzen Adresse (`https://…/vr/assets/…`)
 * genauso wie einem Eintrag der Vorratsliste (`assets/…`): Der Ordner zählt
 * am Anfang wie in der Mitte.
 */
export function isHashedAsset(path: string): boolean {
  return /(^|\/)assets\//.test(path) && HASHED.test(path);
}

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
  if (isHashedAsset(path)) return 'immutable';
  return 'revalidate';
}

/**
 * **In welchen Speicher eine Datei der Vorratsliste gehört.**
 *
 * Zwei Sorten liegen darin, und sie haben verschiedene Lebensdauern:
 *
 * - `assets` — was den Hash seines Inhalts im Namen trägt. Diese Datei
 *   **überlebt den Deploy**: Ihr Name ist ihr Inhalt, ein neuer Build fragt
 *   entweder genau dieselbe Datei oder eine anders heißende. Sie liegt deshalb
 *   in `bgvr-assets`, einem Speicher ohne Build-Nummer im Namen.
 * - `shell` — die drei HTML-Seiten. Feste Namen, wechselnder Inhalt, und sie
 *   nennen die Namen aller anderen Dateien: Sie gehören in den Speicher
 *   **dieses** Builds und nirgendwo sonst.
 */
export function precacheStore(path: string): 'assets' | 'shell' {
  return isHashedAsset(path) ? 'assets' : 'shell';
}

/**
 * **Trägt diese Adresse die Prüfsumme ihres eigenen Inhalts?** Dann ist sie so
 * unveränderlich wie ein Dateiname mit Hash, und `revalidate` wird zu
 * `fromCache`.
 *
 * Gemessen war das der teuerste Posten eines **späteren** Starts: **33
 * Anfragen und 1,6 MB** — jedes Küchengeräusch, jedes Modell — gingen noch
 * einmal über die Leitung, nur um dieselben Bytes zurückzubringen. Innerhalb
 * der ersten zehn Minuten fällt das nicht auf, weil der HTTP-Cache des
 * Browsers die Anfrage abfängt (GitHub Pages erlaubt `max-age=600`); danach
 * fragt jedes `revalidate` wirklich wieder den Server. Die Seite hält das
 * nicht auf — aus dem Speicher wird sofort geantwortet —, aber es ist auf
 * einem Telefon jedes Mal echtes Datenvolumen, und auf einer schmalen Leitung
 * nimmt es dem, was der Spieler gerade wirklich lädt, die Bandbreite weg.
 * Mit dieser Frage sind es **5 Anfragen und 429 kB**, und die 429 kB sind die
 * Controller-Modelle: Sie tragen keine Prüfsumme und bleiben deshalb mit
 * Absicht auf diesem Weg.
 *
 * Und es kann gar nichts anderes herauskommen: `models/kitchen.glb?v=x7Kp2Qa1`
 * ist dieser Inhalt und kein anderer (`core/assetVersion.ts`). Ändert sich die
 * Datei, fragt der nächste Build unter einer neuen Prüfsumme, und was eine
 * **fremde** trägt, wirft `sw.ts` beim Aktivieren weg (`isStaleMedia`). Ein
 * Nachholen kann also nur dieselben Bytes zurückbringen.
 *
 * **Und genau das ist der Unterschied zur Build-Nummer, die hier einmal
 * stand.** Die wechselte bei jedem Deploy, also traf diese Frage nach jedem
 * Deploy auf keinen einzigen Eintrag mehr: 3,7 MB Töne und Modelle
 * gingen noch einmal über die Leitung, weil irgendwo ein Kommentar anders
 * lautete. Eine Prüfsumme wechselt, wenn sich die Datei ändert — sonst nie.
 *
 * Wer **kein** `v=` hat — die Controller-Profile, das Manifest, das Regal —,
 * bleibt beim Nachholen: Für sie ist _stale-while-revalidate_ genau richtig.
 */
export function isPinned(url: string, hashes: AssetHashes): boolean {
  const stamp = new URL(url).searchParams.get('v');
  // Ohne Prüfsumme in der Adresse gibt es keine Übereinstimmung — sonst gälte
  // in einem Jest-Lauf (das Verzeichnis ist dort leer) jede Adresse ohne `v=`
  // als unveränderlich.
  if (stamp === null || stamp === '') return false;
  return stamp === assetHashOf(url, hashes);
}

/**
 * **Ist dieser Eintrag des Medienspeichers veraltet?** Die Gegenfrage zu
 * `isPinned`, und mit Absicht dieselbe Rechnung: Was `sw.ts` beim Aktivieren
 * wegwirft, muss genau das sein, was es nicht mehr aus dem Speicher
 * beantworten würde.
 *
 * Weggeworfen wird, was ein `v=` trägt, das nicht die Prüfsumme dieser Datei
 * ist: `kitchen.glb` von vorgestern, und ebenso `offline.json?v=<Build>` des
 * vorigen Builds — die Liste gibt es in jedem Build wirklich neu.
 *
 * Was **kein** `v=` hat, bleibt: die Controller-Modelle, die Symbole, das
 * Manifest und die 4470 Dateien des Regals. Das sind 62 MB, die sich nicht mit
 * dem Build ändern, und der ganze Grund, warum `bgvr-media` einen Deploy
 * überlebt.
 */
export function isStaleMedia(url: string, hashes: AssetHashes): boolean {
  const stamp = new URL(url).searchParams.get('v');
  if (stamp === null) return false;
  return stamp !== assetHashOf(url, hashes);
}

/**
 * **Und kennt dieser Build diese Datei mit Hash im Namen noch?**
 *
 * `bgvr-assets` trägt keine Build-Nummer im Namen und überlebt deshalb den
 * Deploy — das ist der Sinn der Sache: Ein Chunk, dessen Name gleich geblieben
 * ist, hat denselben Inhalt und muss nicht noch einmal über die Leitung. Nur
 * wüchse dieser Speicher sonst mit jedem Deploy um die Chunks, die es nicht
 * mehr gibt. Also wird beim Aktivieren verglichen: Was in der Liste dieses
 * Builds steht (`vite.config.ts`, `bundleList`), bleibt; was nicht darin
 * steht, fliegt hinaus.
 *
 * Damit gilt die alte Zusage weiter, nur an einer anderen Stelle: **Ein halber
 * alter Build kann nicht liegenbleiben.** Vorher hing sie am Namen des
 * Speichers, jetzt hängt sie am Namen der Datei — und der ist der Hash ihres
 * Inhalts, also die schärfere der beiden Auskünfte.
 *
 * Was **nicht** unter `assets/` liegt, geht diese Frage nichts an: `false`,
 * und der Eintrag bleibt.
 */
export function isStaleAsset(url: string, scope: string, bundle: ReadonlySet<string>): boolean {
  const path = scopedPath(url, scope);
  if (path === null || !isHashedAsset(path)) return false;
  return !bundle.has(path);
}

/**
 * Der Pfad einer Adresse unter dem Geltungsbereich (`assets/main-C3aB9x2Q.js`)
 * — oder `null`, wenn sie gar nicht darunter liegt.
 */
export function scopedPath(url: string, scope: string): string | null {
  if (!inScope(url, scope)) return null;
  return pathOf(url).slice(scope.length);
}

/** Der Pfad ohne Query — `?t=123` an einem Modell ändert nichts am Dateityp. */
function pathOf(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}
