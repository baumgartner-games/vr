/**
 * **Der Service Worker — die Spielwiese ohne Netz.**
 *
 * Er ist der Grund, warum sich diese Seite auf einem Telefon *installieren*
 * lässt und danach aussieht wie eine App: kein Browserrahmen, ein eigenes
 * Symbol, ein eigener Eintrag im Umschalter — und vor allem ein Start, der
 * nicht am Funkloch scheitert. Die drei Dinge hängen zusammen: Ohne einen
 * Service Worker, der eine Anfrage beantworten *kann*, wenn nichts da ist,
 * bietet Chrome das Installieren gar nicht erst an.
 *
 * ## Was hier steht — und was nicht
 *
 * **Die Entscheidung steht nicht hier**, sondern in `core/swRoutes.ts`, mit
 * Test. Hier steht nur die Ausführung: vier Wege, vier Zweige. Ein Fehler in
 * einem Service Worker sieht nicht aus wie ein Fehler, sondern wie eine alte
 * Welt, die nicht weggeht — das ist nichts, was man „im Browser mal eben
 * ausprobiert".
 *
 * **Drei Speicher, und der Unterschied ist Absicht:**
 *
 * - `SHELL` trägt die Nummer des Builds im Namen und wird beim Aktivieren des
 *   nächsten gelöscht. Darin liegen nur noch die **drei HTML-Seiten**: feste
 *   Namen, wechselnder Inhalt, und sie nennen die Namen aller anderen
 *   Dateien. Zusammen 59 kB — die darf ein Deploy kosten.
 * - `ASSETS` überlebt jeden Build. Darin liegt, was den Hash seines Inhalts im
 *   **Namen** trägt: jeder Chunk, jede Welt, three.js, die Physik-Engine, der
 *   Stil. Hier lag der teuerste Fehler dieses Projekts: Diese Dateien lagen
 *   einmal in `SHELL`, und der neue Service Worker warf sie beim Aktivieren
 *   weg — 5,5 MB, die er anschließend Stück für Stück unter **genau
 *   denselben Namen** wieder holte. Ein Name mit Hash ist ein Versprechen:
 *   Ändert sich der Inhalt, heißt die Datei anders. Also bleibt sie liegen,
 *   und beim Aktivieren fliegt nur hinaus, was dieser Build nicht mehr kennt
 *   (`core/swRoutes.ts`, `isStaleAsset`).
 * - `MEDIA` überlebt ebenfalls jeden Build. Darin liegen Modelle, Töne und
 *   Controller-Profile: Dateien mit festen Namen und zusammen zweistelligen
 *   Megabytes, die sich zwischen zwei Deploys praktisch nie ändern. Sie nach
 *   jedem Deploy neu über eine Mobilfunkverbindung zu ziehen, wäre die
 *   unfreundlichste Art, eine Kleinigkeit zu korrigieren.
 *
 * **Kein `skipWaiting`.** Ein neuer Build übernimmt, wenn die alte Sitzung
 * vorbei ist, und nicht mittendrin: Wer gerade in der Brille steht, verliert
 * sonst die Welt unter den Füßen, weil im Hintergrund ein Deploy lief. Bis
 * dahin schadet der alte Service Worker nichts — Seiten holt er ohnehin erst
 * aus dem Netz, und jede Datei, die eine frische Seite nennt, hat einen neuen
 * Namen und ist in keinem Speicher.
 *
 * ## Was `index.html` damit zu tun hat
 *
 * Der Weg einer Seite ist **erst das Netz, dann der Speicher**, und das ist
 * dieselbe Sorge wie in `core/staleBuild.ts`: Eine alte `index.html` nennt
 * Dateinamen, die es nach einem Deploy nicht mehr gibt. Wer sie aus dem
 * Speicher ausliefert, friert den Build ein. Umgekehrt ist der Speicher genau
 * dann die richtige Antwort, wenn das Netz keine hat.
 */
import { ASSET_HASHES } from './core/assetVersion';
import {
  isPinned,
  isStaleAsset,
  isStaleMedia,
  precacheStore,
  routeFor,
  scopedPath,
  type Strategy,
} from './core/swRoutes';

/**
 * **Die Kennung dieses Builds**, gesetzt in `vite.config.ts`. Sie steckt im
 * Namen des Seitenspeichers: Ein neuer Build schreibt seine HTML-Seiten in
 * einen neuen Speicher und löscht beim Aktivieren die alten. Ohne diese Nummer
 * läge nach drei Deploys ein Gemisch aus drei Startseiten im Telefon.
 *
 * **An den Dateien hängt sie nicht.** Was der Build erzeugt hat, trägt den
 * Hash seines Inhalts im Namen; was aus `public/` kommt, trägt die Prüfsumme
 * ihres Inhalts in der Adresse (`core/assetVersion.ts`). Beides ist eine
 * schärfere Auskunft als „gehört zu Build X" — und vor allem eine, die einen
 * Deploy überlebt.
 */
declare const __BUILD_ID__: string;

/**
 * **Was der Build kennt und die Laufzeit nicht**: die Dateinamen der
 * Startseite samt ihrer Chunks, eingesetzt beim Bauen (`vite.config.ts`,
 * `precachePlugin`). Ohne diese Liste wäre die Anwendung erst beim *zweiten*
 * Besuch offline benutzbar — beim ersten läuft sie, während der Service Worker
 * gerade erst installiert wird, und er sieht von ihren Dateien nichts.
 */
declare const __PRECACHE__: readonly string[];

/**
 * **Alles, was dieser Build mit Hash im Namen erzeugt hat** — die Hülle, die
 * Welten, three.js, die Physik-Engine, der Stil. Ebenfalls beim Bauen
 * eingesetzt (`vite.config.ts`, `bundleList`).
 *
 * Gebraucht wird die Liste nur zum **Aufräumen**: `ASSETS` überlebt den
 * Deploy, und ohne sie wüchse er mit jedem Build um die Chunks, die niemand
 * mehr anfragt.
 */
declare const __BUNDLE__: readonly string[];

const SHELL = `bgvr-shell-${__BUILD_ID__}`;
const ASSETS = 'bgvr-assets';
const MEDIA = 'bgvr-media';

/** Dieselbe Liste als Menge — einmal gebaut statt bei jedem Eintrag. */
const BUNDLE = new Set(__BUNDLE__);

/**
 * **Wie im Speicher gesucht wird — und warum das eine Zeile mit Narbe ist.**
 *
 * `ignoreVary` schaltet die Prüfung ab, ob die Anfrage zu den Kopfzeilen
 * passt, die die Antwort unter `Vary` nennt. Ohne diese Zeile findet der
 * Speicher seine eigenen Dateien nicht: Ein Server, der `Vary: Origin`
 * mitschickt (`vite preview` tut es), macht aus jeder abgelegten Antwort eine,
 * die nur zu einer Anfrage mit genau derselben Herkunft passt — und die
 * Module der Seite fragt Vite mit `crossorigin` an, die Liste beim Einrichten
 * dagegen ohne. Das Ergebnis war eine Seite, die offline startete und dann
 * ohne ein einziges Skript dastand, obwohl jede Datei im Speicher lag.
 *
 * Hier ist das gefahrlos: Was abgelegt wird, sind statische Dateien, die für
 * jeden gleich aussehen — es gibt keine zweite Fassung, die `Vary` meinen
 * könnte.
 */
const MATCH: CacheQueryOptions = { ignoreVary: true };

/* ------------------------------------------------------------------ *
 * Die Typen des Service Workers.
 *
 * `tsconfig.json` lädt `lib: DOM`, und `DOM` und `WebWorker` vertragen sich
 * nicht in einem Programm — dieselben Namen, andere Bedeutung. Also steht
 * hier, wie in `core/fullscreen.ts`, genau so viel Schnittstelle, wie diese
 * Datei benutzt, und nicht `any`.
 * ------------------------------------------------------------------ */

interface SwEvent {
  waitUntil(work: Promise<unknown>): void;
}

interface SwFetchEvent extends SwEvent {
  readonly request: Request;
  respondWith(response: Response | Promise<Response>): void;
}

interface SwScope {
  readonly registration: { readonly scope: string };
  readonly clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: SwEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: SwFetchEvent) => void): void;
}

declare const self: SwScope;

/** Der Geltungsbereich, absolut: `https://…/vr/` — oder lokal `http://…/`. */
const scope = self.registration.scope;
/** Dieselbe Seite unter ihrem Dateinamen — so liegt sie im Speicher. */
const startPage = new URL('index.html', scope).href;

/**
 * **Einrichten**: die Liste aus dem Build in den Speicher holen — und zwar
 * **nur, was noch fehlt**.
 *
 * Das ist der Kern der Sache. Jede Datei der Liste unterhalb von `assets/`
 * trägt den Hash ihres Inhalts im Namen: Liegt unter genau diesem Namen schon
 * eine Antwort in irgendeinem Speicher, kann es nicht dieselbe Datei in einer
 * anderen Fassung sein — sie heißt dann anders. Also wird sie übernommen und
 * nicht geholt. Nach einem gewöhnlichen Deploy sind das neun von zehn
 * Dateien; vorher gingen sie alle noch einmal über die Leitung.
 *
 * `caches.match` sucht dabei über **alle** Speicher, und das erledigt zwei
 * Fälle mit einer Zeile: den Eintrag, der schon in `ASSETS` liegt, und den,
 * der noch im Seitenspeicher eines früheren Builds steckt — dort lag vor
 * diesem Umbau alles.
 *
 * `reload` steht hier mit Absicht **nicht**: Die Seite hat dieselben Dateien
 * gerade selbst geladen, sie liegen im HTTP-Cache des Browsers, und ein
 * zweiter Weg durchs Netz wäre beim ersten Besuch die doppelte Wartezeit.
 *
 * Scheitert eine einzelne Datei, scheitert nicht die Installation: Ein
 * Service Worker, der wegen eines fehlenden Tons gar nicht erst antritt, hat
 * die Anwendung nicht sicherer gemacht, sondern nur offline-untauglich.
 */
async function precache(): Promise<void> {
  const shell = await caches.open(SHELL);
  const assets = await caches.open(ASSETS);
  await adoptAssets(assets);
  await Promise.all(
    __PRECACHE__.map(async (file) => {
      const url = new URL(file, scope).href;
      const toAssets = precacheStore(file) === 'assets';
      const cache = toAssets ? assets : shell;
      // Eine Datei mit Hash im Namen, die schon dort liegt, ist *diese* Datei.
      if (toAssets && (await cache.match(url, MATCH))) return;
      try {
        const response = await fetch(url);
        if (response.ok) await cache.put(url, response);
      } catch {
        // Kein Netz beim ersten Besuch: Dann eben beim nächsten.
      }
    }),
  );
}

/**
 * **Was in den Speichern früherer Builds liegt und noch gilt, wird
 * übernommen** — ohne Netz, von Speicher zu Speicher.
 *
 * Nötig ist das für den Schritt von dort nach hier: Vor diesem Umbau lag
 * *alles* im Seitenspeicher des jeweiligen Builds, auch die Welten und die
 * 2,8 MB Physik-Engine, die niemand vorher anfordert und die deshalb in keiner
 * Vorratsliste stehen. Ohne diese Schleife hätte der erste Deploy nach dem
 * Umbau noch einmal alles geholt — und danach nie wieder.
 *
 * Sie bleibt trotzdem stehen: Sie kostet nach dem ersten Mal eine Schleife
 * über drei HTML-Seiten und stellt sicher, dass ein Speicher, den ein alter
 * Service Worker angelegt hat, nicht doch noch einmal über die Leitung muss.
 */
async function adoptAssets(assets: Cache): Promise<void> {
  const names = (await caches.keys()).filter((name) => name.startsWith('bgvr-shell-'));
  for (const name of names) {
    if (name === SHELL) continue;
    const old = await caches.open(name);
    for (const request of await old.keys()) {
      const path = scopedPath(request.url, scope);
      if (path === null || !BUNDLE.has(path)) continue;
      if (await assets.match(request.url, MATCH)) continue;
      const hit = await old.match(request, MATCH);
      if (hit) await assets.put(request.url, hit);
    }
  }
}

/**
 * **Aufräumen**: alles wegwerfen, was dieser Build nicht mehr kennt.
 *
 * Drei Sorten, und alle drei fragen dasselbe, nur an verschiedenen Namen:
 *
 * - Die **Seiten** tragen die Build-Nummer im Namen ihres Speichers, also
 *   genügt es, die fremden Namen zu löschen. Das sind 59 kB.
 * - Bei den **Dateien mit Hash** geht das nicht, und es soll auch nicht: Ihr
 *   Speicher überlebt den Deploy, denn ein Name mit Hash ist ein Versprechen
 *   über den Inhalt. Weggeworfen wird deshalb nur, was in der Liste dieses
 *   Builds nicht mehr steht (`core/swRoutes.ts`, `isStaleAsset`).
 * - Bei den **Medien** entscheidet die Prüfsumme in der Adresse
 *   (`core/assetVersion.ts`): Was ein `v=` trägt, das nicht der Inhalt dieser
 *   Datei ist, ist `kitchen.glb` von vorgestern und fliegt hinaus. Was
 *   **kein** `v=` hat, bleibt — die Controller-Modelle, die Symbole und die
 *   4470 Dateien des Regals.
 */
async function sweep(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('bgvr-shell-') && name !== SHELL)
      .map((name) => caches.delete(name)),
  );
  await pruneAssets();
  await dropOldMedia();
  await self.clients.claim();
}

/**
 * Die Chunks, die es nicht mehr gibt.
 *
 * **Ohne Liste wird nichts weggeworfen.** Der Platzhalter `__BUNDLE__` wird
 * beim Bauen ersetzt; wenn das einmal schiefginge (der Minifizierer, ein
 * Umbau an `vite.config.ts`), stünde hier eine leere Menge — und ein
 * Aufräumen nach einer leeren Liste löschte den ganzen Speicher. Lieber ein
 * Speicher, der zu viel behält, als ein Telefon, das alles neu holt.
 */
async function pruneAssets(): Promise<void> {
  if (BUNDLE.size === 0) return;
  if (!(await caches.has(ASSETS))) return;
  const cache = await caches.open(ASSETS);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => isStaleAsset(request.url, scope, BUNDLE))
      .map((request) => cache.delete(request)),
  );
}

/** Die Medien, deren Inhalt nicht mehr zu ihrer Adresse passt. */
async function dropOldMedia(): Promise<void> {
  if (!(await caches.has(MEDIA))) return;
  const cache = await caches.open(MEDIA);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => isStaleMedia(request.url, ASSET_HASHES))
      .map((request) => cache.delete(request)),
  );
}

/** Erst das Netz; erst wenn es nichts hat, der Speicher. */
async function fromNetwork(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request, MATCH);
    if (hit) return hit;
    // Eine Seite, die so nicht im Speicher liegt — ein Einladungslink mit
    // `?room=`, ein `#haunting` mit Query davor —, ist trotzdem *diese*
    // Anwendung: Die Startseite beantwortet sie vollständig, den Rest liest
    // `main.ts` ohnehin aus der Adresse.
    if (request.mode === 'navigate') {
      const start = (await cache.match(scope, MATCH)) ?? (await cache.match(startPage, MATCH));
      if (start) return start;
    }
    throw error;
  }
}

/** Erst der Speicher; nur beim Fehlschlag das Netz. Für Namen mit Hash. */
async function fromCache(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/**
 * Aus dem Speicher antworten **und** im Hintergrund nachsehen, ob es etwas
 * Neueres gibt. Für Dateien mit festem Namen: sofort da, aber nicht für immer
 * von gestern.
 */
async function revalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request, MATCH);
  const fresh = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => undefined);
  if (hit) return hit;
  const response = await fresh;
  if (response) return response;
  throw new Error(`Nicht erreichbar und nicht im Speicher: ${request.url}`);
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(sweep());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const strategy: Strategy = routeFor(
    {
      method: request.method,
      url: request.url,
      navigate: request.mode === 'navigate',
      range: request.headers.has('range'),
    },
    scope,
  );
  // `bypass` heißt: kein `respondWith`. Der Browser macht es dann selbst, und
  // das ist genau richtig — eine Anfrage, die durch den Service Worker läuft,
  // nur um unverändert ins Netz zu gehen, kostet nur Zeit.
  if (strategy === 'bypass') return;
  if (strategy === 'page') event.respondWith(fromNetwork(request, SHELL));
  // Was den Hash seines Inhalts im Namen trägt, geht in den Speicher, der den
  // Deploy überlebt — auch das, was erst beim Betreten einer Welt geholt wird.
  else if (strategy === 'immutable') event.respondWith(fromCache(request, ASSETS));
  // **Nachholen, außer es kann sich nichts geändert haben.** Eine Adresse mit
  // der Prüfsumme ihres eigenen Inhalts ist so unveränderlich wie ein
  // Dateiname mit Hash (`core/swRoutes.ts`, `isPinned`) — nur liegt sie im
  // Speicher der Medien, bei den Dateien mit festen Namen.
  else if (isPinned(request.url, ASSET_HASHES)) event.respondWith(fromCache(request, MEDIA));
  else event.respondWith(revalidate(request, MEDIA));
});
