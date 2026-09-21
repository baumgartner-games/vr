/**
 * **Alles herunterladen — die Ausführung.**
 *
 * Die Rechnung steht nebenan (`core/fullDownload.ts`, mit Test): was in den
 * Plan gehört, in welcher Reihenfolge, wie weit der Balken steht und wie lange
 * es noch dauert. Hier steht nur, was ohne Browser gar nicht geht — holen,
 * nachsehen, abbrechen.
 *
 * ## Wer den Speicher füllt: der Service Worker, nicht diese Datei
 *
 * Hier steht **kein einziges `caches.open`** mit einem Namen darin, und das
 * ist die wichtigste Zeile dieses Kommentars. Ein `fetch` von der Seite läuft
 * durch den Service Worker, und der legt die Antwort genau dort ab, wo sie
 * hingehört: Chunks mit Hash in die **Hülle**, Modelle und Töne in die
 * **Medien**, und beim Aufräumen wirft er wieder weg, was eine fremde
 * Build-Nummer trägt (`src/sw.ts`, `core/swRoutes.ts`).
 *
 * Die Seite könnte denselben Speicher selbst beschreiben — es ist derselbe
 * Ursprung, `caches.open('bgvr-media')` ginge. Sie tut es nicht, und der Grund
 * ist nicht Reinheit, sondern Haltbarkeit: Der Name des Speichers und die
 * Regel, wer wohin gehört, stünden dann an **zwei** Stellen. Die zweite ist
 * die, die beim nächsten Umbau vergessen wird — und ein Download, der 57 MB in
 * einen Speicher legt, den niemand mehr aufräumt, fällt erst drei Deploys
 * später auf, wenn das Telefon voll ist.
 *
 * Daraus folgt eine zweite Zusage: **Der Rumpf jeder Antwort wird gelesen.**
 * Der Service Worker legt `response.clone()` ab; ein geklonter Rumpf, den auf
 * unserer Seite niemand abholt, hält den anderen Zweig auf. Die Bytes werden
 * dabei nicht gebraucht — die Größe steht in der Liste —, sie werden nur
 * durchgelassen.
 *
 * ## Und warum nicht der Service Worker selbst lädt
 *
 * Weil er dafür am Leben bleiben müsste. Ein Browser beendet einen Service
 * Worker, sobald er nichts zu tun hat, und „57 MB über eine Mobilfunkleitung"
 * ist eine Viertelstunde, in der er das mehrfach tun darf. Die Seite dagegen
 * steht ohnehin da, mit dem Balken darauf: Solange der Spieler zusieht, lebt
 * sie.
 */

import {
  FULL_CONCURRENCY,
  OFFLINE_LIST,
  RETRY_LIMIT,
  retryDelay,
  worthRetry,
  type FullItem,
  type OfflineList,
} from './fullDownload';

/** Ob dieser Browser überhaupt einen Speicher für Dateien hat. */
export function hasCacheStorage(): boolean {
  return typeof caches !== 'undefined';
}

/**
 * Ob ein Service Worker diese Seite **beantwortet**. Nicht „ist angemeldet":
 * Ein frisch angemeldeter übernimmt erst beim nächsten Start, und bis dahin
 * ginge jedes `fetch` an ihm vorbei — in den HTTP-Cache, der im Funkloch
 * nichts hergibt.
 */
export function swControls(): boolean {
  return typeof navigator !== 'undefined' && navigator.serviceWorker?.controller != null;
}

/**
 * **Was schon im Speicher liegt** — alle Speicher dieses Ursprungs auf einmal.
 *
 * Gefragt wird nicht Datei für Datei: `caches.match` je Eintrag wären nach
 * einem vollen Lauf 4800 einzelne Fragen an eine Datenbank, und das dauert
 * länger als der Vergleich zweier Listen im Speicher. Die Namen der Speicher
 * interessieren dabei nicht — sie gehören dem Service Worker; hier wird nur
 * gezählt, was schon da ist.
 */
export async function cachedUrls(): Promise<Set<string>> {
  const urls = new Set<string>();
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) urls.add(request.url);
  }
  return urls;
}

/**
 * Die erzeugte Liste (`offline.json`) — mit Build-Nummer, denn sie entsteht
 * bei jedem Bau neu. Damit liegt sie nach dem ersten Lauf selbst im Speicher
 * und beantwortet die Frage „ist alles da?" auch ohne Netz.
 */
export async function loadOfflineList(base: string, build: string): Promise<OfflineList | null> {
  const url = `${base}${OFFLINE_LIST}${build ? `?v=${encodeURIComponent(build)}` : ''}`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return (await response.json()) as OfflineList;
  } catch {
    return null;
  }
}

/** Was nach jeder fertigen Datei gemeldet wird. */
export interface FullTick {
  /** Bytes des Plans, die im Speicher liegen — das Vorgefundene eingerechnet. */
  readonly have: number;
  /** Wie viele Dateien dieser Lauf geholt hat. */
  readonly fetched: number;
  /** Wie viele Bytes dabei wirklich durch die Leitung kamen. */
  readonly measured: number;
  /** Wie viele Dateien aufgegeben wurden. */
  readonly missing: number;
  /** Die Größe der eben fertig gewordenen Datei — für den Durchsatz. */
  readonly justNow: number;
}

/** Das Ergebnis eines Laufs. */
export interface FullRunResult extends FullTick {
  /** Ob der Spieler angehalten hat. */
  readonly stopped: boolean;
}

/**
 * **Der Lauf.** Sechs Dateien gleichzeitig (`FULL_CONCURRENCY`), jede mit bis
 * zu zwei zweiten Versuchen, und keine einzelne bringt den Rest zu Fall.
 *
 * `priority: 'low'` steht dabei mit Absicht daran, obwohl der Spieler es
 * selbst angefordert hat: Er darf danebenher weiterspielen, und eine Welt, die
 * er gerade betritt, soll nicht hinter 4470 Fässern in der Schlange stehen.
 * Das Feld kennt heute nur Chromium; wo es fehlt, ist es ein unbekannter
 * Schlüssel in einem Objekt und damit wirkungslos.
 */
export async function runFull(
  todo: readonly FullItem[],
  have: number,
  signal: AbortSignal,
  onTick: (tick: FullTick) => void,
): Promise<FullRunResult> {
  let state: FullTick = { have, fetched: 0, measured: 0, missing: 0, justNow: 0 };
  let next = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      if (signal.aborted) return;
      const item = todo[next++];
      if (!item) return;
      const measured = await getOne(item, signal);
      if (signal.aborted) return;
      state =
        measured === null
          ? { ...state, missing: state.missing + 1, justNow: 0 }
          : {
              have: state.have + item.bytes,
              fetched: state.fetched + 1,
              measured: state.measured + measured,
              missing: state.missing,
              justNow: item.bytes,
            };
      onTick(state);
    }
  };

  await Promise.all(Array.from({ length: Math.min(FULL_CONCURRENCY, todo.length) }, worker));
  return { ...state, stopped: signal.aborted };
}

/**
 * Eine Datei holen — und zurückgeben, wie viele Bytes wirklich ankamen, oder
 * `null`, wenn sie nach allen Versuchen nicht kam.
 *
 * Der Rumpf wird gelesen und weggeworfen; gebraucht wird er nicht (die Größe
 * steht in der Liste), aber der Service Worker legt einen **Klon** davon ab,
 * und ein Klon, dessen Geschwister niemand liest, kommt nicht durch.
 */
async function getOne(item: FullItem, signal: AbortSignal): Promise<number | null> {
  for (let attempt = 0; attempt <= RETRY_LIMIT; attempt++) {
    if (signal.aborted) return null;
    let status: number | null = null;
    try {
      const response = await fetch(item.url, { signal, priority: 'low' } as RequestInit);
      status = response.status;
      if (response.ok) return (await response.arrayBuffer()).byteLength;
    } catch {
      // Abgebrochen oder kein Netz — beides kommt hier als Ausnahme an, und
      // nur das zweite ist einen weiteren Versuch wert.
      if (signal.aborted) return null;
    }
    if (!worthRetry(status) || attempt === RETRY_LIMIT) return null;
    await wait(retryDelay(attempt), signal);
  }
  return null;
}

/** Warten, aber abbrechbar: Ein Halt soll nicht erst nach 1,6 s wirken. */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms);
    function done(): void {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}
