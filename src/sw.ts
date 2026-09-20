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
 * **Zwei Speicher, und der Unterschied ist Absicht:**
 *
 * - `SHELL` trägt die Nummer des Builds im Namen und wird beim Aktivieren des
 *   nächsten gelöscht. Darin liegt, was der Build erzeugt hat.
 * - `MEDIA` überlebt jeden Build. Darin liegen Modelle, Töne und
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
import { isCurrentBuild, routeFor, type Strategy } from './core/swRoutes';

/**
 * **Die Kennung dieses Builds**, gesetzt in `vite.config.ts`. Sie steckt im
 * Namen des Speichers: Ein neuer Build schreibt in einen neuen Speicher und
 * löscht beim Aktivieren die alten. Ohne diese Nummer läge nach drei Deploys
 * ein Gemisch aus drei Builds im Telefon.
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

const SHELL = `bgvr-shell-${__BUILD_ID__}`;
const MEDIA = 'bgvr-media';

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
 * **Einrichten**: die Liste aus dem Build in den Speicher holen.
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
  const cache = await caches.open(SHELL);
  await Promise.all(
    __PRECACHE__.map(async (file) => {
      const url = new URL(file, scope).href;
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
 * **Aufräumen**: alles wegwerfen, was zu einem früheren Build gehörte.
 *
 * Zwei Sorten, und die zweite ist neu. Die **Hülle** trägt die Build-Nummer im
 * Namen des Speichers, also genügt es, die fremden Namen zu löschen. Bei den
 * **Medien** geht das nicht: Modelle und Töne liegen in einem Speicher, der
 * über Builds hinweg stehen bleibt — genau dafür ist er da, denn ein
 * Controller-Modell ändert sich nie und muss nicht nach jedem Deploy neu über
 * das Netz.
 *
 * Seit die eigenen Medien ihre Build-Nummer in der Adresse tragen
 * (`core/assetVersion.ts`), sammeln sich dort aber Altbestände: `kitchen.glb`
 * von gestern, `kitchen.glb` von vorgestern. Weggeworfen wird deshalb hier,
 * was ein `v=` trägt, das nicht dieses Build ist. Was **kein** `v=` hat,
 * bleibt: Das sind die Dateien, die sich nicht mit dem Build ändern.
 */
async function sweep(): Promise<void> {
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('bgvr-shell-') && name !== SHELL)
      .map((name) => caches.delete(name)),
  );
  await dropOldMedia();
  await self.clients.claim();
}

/** Die Medien fremder Builds — erkannt an ihrem `v=` in der Adresse. */
async function dropOldMedia(): Promise<void> {
  if (!(await caches.has(MEDIA))) return;
  const cache = await caches.open(MEDIA);
  const keys = await cache.keys();
  await Promise.all(
    keys
      .filter((request) => {
        const stamp = new URL(request.url).searchParams.get('v');
        return stamp !== null && stamp !== __BUILD_ID__;
      })
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
  else if (strategy === 'immutable') event.respondWith(fromCache(request, SHELL));
  // **Nachholen, außer es kann sich nichts geändert haben.** Eine Adresse mit
  // der Nummer *dieses* Builds ist so unveränderlich wie ein Dateiname mit
  // Hash (`core/swRoutes.ts`, `isCurrentBuild`) — nur liegt sie im Speicher
  // der Medien, der einen Deploy überlebt, und nicht in dem der Hülle, der
  // beim nächsten Build gelöscht wird.
  else if (isCurrentBuild(request.url, __BUILD_ID__)) event.respondWith(fromCache(request, MEDIA));
  else event.respondWith(revalidate(request, MEDIA));
});
