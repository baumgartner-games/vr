/**
 * **Alles herunterladen — der Plan, die Buchführung und die Schätzung.**
 *
 * Das Vorwärmen (`core/warmStart.ts`) ist eine Freundlichkeit: Es holt, was
 * der Spieler als Nächstes wahrscheinlich anfasst, und tritt bei der
 * kleinsten Gelegenheit zurück. Diese Datei ist der **Gegenfall**: Jemand hat
 * gedrückt und will _alles_ im Gerät haben, weil er gleich ins Funkloch fährt.
 * Dann gilt keine der fünf Rücksichten des Vorwärmens mehr — nur noch zwei
 * Höflichkeiten (siehe `mayStartFull`) und eine Warnung bei _Daten sparen_.
 *
 * Hier steht die **Rechnung** dazu und sonst nichts: kein `fetch`, kein
 * `caches`, kein DOM. Wer sie ausführt, ist `core/fullDownloadRun.ts`; wer sie
 * anzeigt, ist `main.ts`; wer sie prüft, ist `fullDownload.test.ts`. Derselbe
 * Schnitt wie überall hier, und er hat hier einen scharfen Grund: Ein Balken,
 * der lügt, ist schlimmer als keiner — und ob er lügt, sieht man nur, wenn man
 * die Rechnung ohne Browser nachrechnen kann.
 *
 * ## Woher die Liste kommt
 *
 * **Aus zwei erzeugten Quellen und keiner von Hand geschriebenen.** Eine Liste
 * von Dateinamen, die ein Mensch pflegt, ist nach dem dritten Paket falsch —
 * und falsch heißt hier: ein Balken, der bei 80 % fertig ist, oder eine App,
 * der im Funkloch ein Ton fehlt.
 *
 * - `offline.json` (`vite.config.ts`, `offlineListPlugin`) — jeder Chunk des
 *   Builds samt Hash und Größe (auch die Welten und die 2,8 MB Physik-Engine,
 *   die vorher niemand beim Namen kennt) und jede Datei unter `public/`:
 *   Modelle, Töne, Controller-Profile, Symbole, und die **Texturen** des
 *   Regals.
 * - `models/kaykit/index.json` — die 4470 Modelle des Regals, jedes mit seiner
 *   Größe. Sie stehen mit Absicht **nicht** noch einmal in `offline.json`:
 *   zweimal aufgeschrieben wären sie zweimal zu pflegen.
 *
 * ## Die Reihenfolge ist eine Aussage
 *
 * Nicht nach Größe, sondern danach, **ab wann man ohne Netz spielen kann**:
 *
 * 1. `programm` — die drei Seiten, alle 35 Chunks, die Physik-Engine. Danach
 *    startet jede Welt ohne Netz. **5,4 MB**, und der größte Teil davon liegt
 *    nach einem normalen Besuch ohnehin schon im Speicher.
 * 2. `medien` — die drei gebündelten Kataloge, der Koch, die Töne, die
 *    Controller-Modelle, die Symbole. Danach ist das **Spiel** vollständig:
 *    82 Dateien, **8,8 MB**.
 * 3. `regal` — der Index, die 153 Texturen, dann die 4470 Modelle. **57,2 MB**
 *    in 4624 Dateien, also vier Fünftel des Ganzen — und das Einzige, was man
 *    guten Gewissens abbricht.
 *
 * Zusammen **71,5 MB in 4741 Dateien** (Stand dieses Builds; die Zahlen
 * rechnet der Plan selbst aus, hier stehen sie nur zur Einordnung).
 *
 * Innerhalb des Regals kommen die **Texturen vor den Modellen**. Ein
 * abgebrochener Download ergibt so ein Regal mit weniger Fässern, und nicht
 * eines mit lauter weißen.
 */

import { versionedWith, type AssetHashes } from './assetVersion';
import type { KaykitDir, KaykitIndex } from './kaykitIndex';

/** Die erzeugte Liste neben der Seite — siehe `vite.config.ts`. */
export const OFFLINE_LIST = 'offline.json';

/** Der Index des Regals, relativ zur Basis. */
export const SHELF_INDEX = 'models/kaykit/index.json';

/** Wo das Regal liegt — dieselbe Adresse wie in `core/kaykitModel.ts`. */
const SHELF_BASE = 'models/kaykit/';

/**
 * `offline.json`, so wie der Build sie schreibt. Ein **Vertrag** zwischen zwei
 * Programmen, wie der Index des Regals: Ein Paar ist `[pfad, bytes]`.
 */
export interface OfflineList {
  readonly version: number;
  /** Die Nummer des Builds, zu dem diese Liste gehört. */
  readonly build: string;
  /** Was der Build erzeugt hat — Namen mit Hash, also ohne Build-Nummer. */
  readonly bundle: readonly (readonly [string, number])[];
  /** Was aus `public/` kopiert wurde — feste Namen, siehe `stamped`. */
  readonly files: readonly (readonly [string, number])[];
}

/** Die drei Abschnitte, in genau der Reihenfolge, in der sie drankommen. */
export const FULL_ORDER = ['programm', 'medien', 'regal'] as const;

/** Einer der drei Abschnitte. */
export type FullGroup = (typeof FULL_ORDER)[number];

/** Wie ein Abschnitt heißt, wenn er dasteht. */
export const FULL_LABELS: Readonly<Record<FullGroup, string>> = {
  programm: 'Programm',
  medien: 'Modelle und Töne',
  regal: 'Regal',
};

/** Eine Datei des vollständigen Downloads. */
export interface FullItem {
  /** Die **volle** Adresse, genau so, wie die Seite sie später anfragt. */
  readonly url: string;
  /** Wie groß sie auf der Platte ist. Über die Leitung ist sie gezippt kleiner. */
  readonly bytes: number;
  readonly group: FullGroup;
}

/** Der ganze Plan: die Dateien, ihre Summe, und die Summe je Abschnitt. */
export interface FullPlan {
  readonly items: readonly FullItem[];
  readonly totalBytes: number;
  readonly groupBytes: Readonly<Record<FullGroup, number>>;
}

/**
 * **Woran eine Datei aus `public/` ihre Prüfsumme bekommt.**
 *
 * Hier stand einmal `stamped(path)` — eine zweite Fassung derselben Regel, die
 * auch in jedem Lader steht. Das musste **auf das Zeichen genau** passen: Eine
 * Adresse mit `?v=` ist für einen Speicher ein anderer Name, und wer hier
 * falsch stempelte, lud 57 MB herunter und fand sie im Funkloch trotzdem nicht
 * wieder — der teuerste Fehler, den dieses Feature machen kann.
 *
 * Die Regel steht jetzt genau einmal, im Build (`vite.config.ts`,
 * `isStamped`), und was dabei herauskommt, ist ein Verzeichnis aus Pfad und
 * Prüfsumme. Beide Seiten lesen dasselbe Verzeichnis durch dieselbe Funktion
 * (`core/assetVersion.ts`, `versionedWith`): Der Plan hier und der Lader
 * dort **können** nicht mehr auseinanderlaufen, statt nur zu sollen.
 *
 * Was darin steht, steht auch anderswo geschrieben:
 *
 * - **Der Index des Regals** steht nicht darin, obwohl er erzeugt ist und mit
 *   jedem neuen Paket wandert: An ihm hängt, ob das Regal aufgeht („Lädt …"),
 *   und eine wechselnde Adresse machte aus der Datei im Gerät nach jedem
 *   Deploy eine fremde. Warum das die teuerste Nummer im ganzen Projekt war,
 *   steht in `core/kaykitModel.ts` über `INDEX_URL`.
 * - **Das Regal selbst** steht nicht darin: 4470 gekaufte Dateien, die sich
 *   nie ändern (`docs/agents/assetregal.md`, _Keine Build-Nummer_). Dasselbe
 *   gilt für ihre Texturen: Eine `.glb` zeigt mit einer **relativen** Adresse
 *   dorthin, und three.js löst sie ohne Frage im Anhang auf.
 * - **Die Controller-Profile** stehen nicht darin — three.js hängt sie hinter
 *   `CONTROLLER_PROFILES` zusammen, und dort steht keine
 *   (`core/ControllerModels.ts`).
 * - **Töne und die gebündelten Kataloge** stehen darin
 *   (`core/kitchenModel.ts`, `dinerModel.ts`, `mixedbagModel.ts`,
 *   `chefModel.ts`, `worlds/…/kitchenAudio.ts`, `…/cues.register.ts`).
 *
 * Alles Übrige — Manifest, Symbole, Banner — fragt der **Browser** selbst an,
 * und der hängt nichts an.
 */

/**
 * **Der Plan.** Aus den beiden erzeugten Listen wird eine geordnete Reihe von
 * Adressen mit Größen.
 *
 * @param list  `offline.json`
 * @param index Der Index des Regals, oder `null` — ein Checkout ohne die
 *              gekauften Pakete ist ein normaler Zustand und kein Fehler; dann
 *              besteht der Plan eben aus Programm und Medien.
 * @param base  Die absolute Basis der Seite (`https://…/vr/`). Absolut, weil
 *              der Speicher seine Einträge unter absoluten Adressen führt und
 *              nur ein Zeichenvergleich entscheidet, ob etwas schon da ist.
 * @param hashes Das Verzeichnis der Prüfsummen (`core/assetVersion.ts`), oder
 *               `{}` — dann wird nichts gestempelt, genau wie dort.
 */
export function fullPlan(
  list: OfflineList,
  index: KaykitIndex | null,
  base: string,
  hashes: AssetHashes,
): FullPlan {
  const items: FullItem[] = [];
  const seen = new Set<string>();
  const add = (path: string, bytes: number, group: FullGroup, stamp: boolean): void => {
    const plain = `${base}${path}`;
    const url = stamp ? versionedWith(plain, hashes) : plain;
    if (seen.has(url)) return;
    seen.add(url);
    items.push({ url, bytes, group });
  };

  for (const [path, bytes] of list.bundle) add(path, bytes, 'programm', false);

  const shelfFiles = list.files.filter(([path]) => path.startsWith(SHELF_BASE));
  for (const [path, bytes] of list.files) {
    if (!path.startsWith(SHELF_BASE)) add(path, bytes, 'medien', true);
  }

  // Der Index zuerst, dann die Texturen, dann die Modelle: Wer abbricht, hat
  // weniger Fässer und nicht lauter weiße.
  for (const [path, bytes] of shelfFiles) {
    if (path === SHELF_INDEX) add(path, bytes, 'regal', false);
  }
  for (const [path, bytes] of shelfFiles) {
    if (path !== SHELF_INDEX) add(path, bytes, 'regal', false);
  }
  if (index) {
    for (const [path, bytes] of shelfModels(index)) add(path, bytes, 'regal', false);
  }

  const groupBytes: Record<FullGroup, number> = { programm: 0, medien: 0, regal: 0 };
  let totalBytes = 0;
  for (const item of items) {
    groupBytes[item.group] += item.bytes;
    totalBytes += item.bytes;
  }
  return { items, totalBytes, groupBytes };
}

/**
 * Die 4470 Modelle aus dem Index, in der Reihenfolge des Baumes: Paket für
 * Paket, Ordner für Ordner. Ein halb geholtes Regal ist damit ein Regal mit
 * ganzen Paketen und nicht eines mit überall Lücken.
 */
function shelfModels(index: KaykitIndex): [string, number][] {
  const out: [string, number][] = [];
  const walk = (dir: KaykitDir, trail: readonly string[]): void => {
    for (const file of dir.files ?? []) {
      out.push([`${SHELF_BASE}${[...trail, file.name].join('/')}`, file.bytes ?? 0]);
    }
    for (const child of dir.dirs ?? []) walk(child, [...trail, child.name]);
  };
  walk(index.root, []);
  return out;
}

/**
 * **Was davon noch fehlt.** Der Speicher wird einmal am Stück ausgelesen (er
 * hat nach einem vollen Lauf 4800 Einträge, und 4800 einzelne Fragen dauern
 * spürbar länger als eine Liste), und was darin steht, wird übersprungen.
 *
 * Das ist zugleich die ganze **Fortsetzung**: Ein zweiter Druck rechnet
 * denselben Plan und findet neun Zehntel davon schon vor. Übersprungen wird
 * dabei wirklich — nicht „schnell noch einmal geholt": Der Service Worker
 * beantwortet Dateien ohne Build-Nummer mit _stale-while-revalidate_ und ginge
 * sonst für jede von ihnen noch einmal ins Netz (`core/swRoutes.ts`).
 */
export function pendingItems(plan: FullPlan, have: ReadonlySet<string>): FullItem[] {
  return plan.items.filter((item) => !have.has(item.url));
}

/** Wie viele Bytes des Plans schon im Speicher liegen. */
export function haveBytes(plan: FullPlan, have: ReadonlySet<string>): number {
  let bytes = 0;
  for (const item of plan.items) if (have.has(item.url)) bytes += item.bytes;
  return bytes;
}

/* ------------------------------------------------------------------ *
 * Fehlschläge: einmal ist kein Abbruch.
 * ------------------------------------------------------------------ */

/** Wie oft eine einzelne Datei noch einmal versucht wird. */
export const RETRY_LIMIT = 2;

/**
 * **Lohnt ein zweiter Versuch?**
 *
 * Bei 4700 Dateien über eine Mobilfunkleitung geht garantiert eine davon
 * daneben, und ein Lauf, der daran stirbt, ist wertlos. Also stirbt er nicht:
 * Ein Netzfehler (`status === null`, die Verbindung kam gar nicht zustande)
 * und ein `5xx` bekommen einen zweiten und dritten Versuch, ein `404` nicht —
 * eine Datei, die es nicht gibt, gibt es beim dritten Mal auch nicht, und drei
 * Anläufe für jede fehlende wären aus einem fehlenden Paket ein zehnminütiges
 * Warten.
 */
export function worthRetry(status: number | null): boolean {
  if (status === null) return true;
  return status >= 500;
}

/** Wie lange vor dem nächsten Versuch gewartet wird — kurz, aber wachsend. */
export function retryDelay(attempt: number): number {
  return 400 * 2 ** attempt;
}

/**
 * **Wie viele Dateien gleichzeitig.** Sechs, und das ist keine runde Zahl aus
 * dem Bauch: Genau so viele Verbindungen macht ein Browser über HTTP/1.1 zu
 * einem Server auf. Wer 4470 Anfragen auf einmal stellt, stellt keine — die
 * Warteschlange im Browser wächst, jede einzelne dauert länger, und auf einem
 * Telefon ist der Reiter währenddessen zäh.
 */
export const FULL_CONCURRENCY = 6;

/* ------------------------------------------------------------------ *
 * Die Dauer — und warum die erste Minute lügt.
 * ------------------------------------------------------------------ */

/** Über welchen Zeitraum der Durchsatz gemittelt wird. */
export const RATE_WINDOW_MS = 8000;

/** Vorher wird gar nichts geschätzt: So lange muss ein Lauf mindestens laufen. */
export const RATE_MIN_SPAN_MS = 3000;

/** Und so viele Dateien müssen mindestens durch sein. */
export const RATE_MIN_SAMPLES = 6;

/**
 * **Der Durchsatz der letzten Sekunden**, und ausdrücklich nicht der des
 * ganzen Laufs.
 *
 * „Rest durch Mittelwert" wäre einfacher und wäre falsch, und zwar auf beide
 * Seiten: Die ersten Sekunden eines Laufs sind schnell (der HTTP-Cache des
 * Browsers hat noch etwas, die Verbindung ist frisch), und ein Lauf, der
 * zwischendurch in ein Funkloch gerät, rechnet den Einbruch für immer mit.
 * Beides zusammen ergibt eine Zahl, die springt — und eine springende Zahl ist
 * schlimmer als eine grobe, weil man ihr beim Springen zusieht statt zu
 * warten.
 *
 * Also ein **gleitendes Fenster** über die letzten acht Sekunden. Solange
 * darin zu wenig steht, kommt `null` heraus, und `null` heißt „noch keine
 * Auskunft" und nicht „null Bytes je Sekunde".
 */
export class Throughput {
  private readonly marks: { at: number; bytes: number }[] = [];

  /** @param start Wann der Lauf begonnen hat — siehe `rate`. */
  constructor(private readonly start: number) {}

  /** Eine fertige Datei: wann, und wie viele Bytes sie hatte. */
  add(at: number, bytes: number): void {
    this.marks.push({ at, bytes });
    while (this.marks.length > 0 && at - this.marks[0]!.at > RATE_WINDOW_MS) this.marks.shift();
  }

  /**
   * Bytes je Sekunde — oder `null`, solange zu wenig gemessen ist.
   *
   * **Die Strecke ist die Zeit und nicht der Abstand der Marken**, und das ist
   * der Unterschied zwischen einer brauchbaren und einer albernen Zahl: Die
   * ersten Dateien eines Laufs sind die großen (die Physik-Engine allein ist
   * 2,8 MB), es liegen sechs davon gleichzeitig unterwegs, und wer die Bytes
   * nur zwischen der ersten und der letzten Marke rechnet, hat in der ersten
   * halben Minute zwei Marken, zwischen denen kaum Zeit liegt — heraus kam
   * gemessen „noch etwa 10 Minuten" für etwas, das zwei dauerte.
   *
   * Also: **Bytes des Fensters durch die Zeit seit dem Start**, gedeckelt auf
   * die Fensterlänge. Solange das Fenster noch nicht voll ist, ist das der
   * ehrliche Schnitt des ganzen Laufs; danach der der letzten acht Sekunden.
   * Was gerade noch unterwegs ist, zählt dabei nicht mit — die Schätzung ist
   * am Anfang also eher zu lang als zu kurz, und das ist die richtige
   * Richtung, wenn man sich schon irren muss.
   */
  rate(now: number): number | null {
    if (this.marks.length < RATE_MIN_SAMPLES) return null;
    const span = Math.min(now - this.start, RATE_WINDOW_MS);
    if (span < RATE_MIN_SPAN_MS) return null;
    let bytes = 0;
    for (const mark of this.marks) bytes += mark.bytes;
    if (bytes <= 0) return null;
    return (bytes * 1000) / span;
  }
}

/** Wie lange der Rest noch dauert — oder `null`, solange niemand das weiß. */
export function etaSeconds(remainingBytes: number, rate: number | null): number | null {
  if (rate === null || rate <= 0) return null;
  return remainingBytes / rate;
}

/**
 * **Die Zahl darf herunter, aber nur mit Anlauf herauf.**
 *
 * Eine Restzeit, die abwechselnd „2 Minuten" und „4 Minuten" sagt, glaubt
 * niemand mehr — auch dann nicht, wenn sie später recht behält. Kleiner wird
 * sie deshalb sofort (das ist die Richtung, in die ein Wartender ohnehin
 * denkt), größer erst, wenn sie um mehr als ein Viertel danebenliegt. Dann ist
 * wirklich etwas passiert: ein Funkloch, ein zweiter Download, ein Tunnel.
 */
export function steadyEta(previous: number | null, next: number | null): number | null {
  if (next === null) return previous;
  if (previous === null) return next;
  if (next <= previous) return next;
  return next > previous * 1.25 ? next : previous;
}

/**
 * **Und so grob, wie sie ehrlich ist.** Keine tickenden Sekunden: Bis eine
 * Viertelminute heißt es „ein paar Sekunden", danach Zehnersekunden, ab
 * anderthalb Minuten ganze Minuten, und ab zehn Minuten nur noch
 * Fünferschritte. Eine Zahl, die genauer aussieht, als sie ist, verspricht
 * etwas, das der Rest des Downloads nicht hält.
 */
export function etaText(seconds: number | null): string {
  if (seconds === null) return 'Dauer wird noch geschätzt';
  if (seconds < 15) return 'noch ein paar Sekunden';
  if (seconds < 90) return `noch etwa ${Math.round(seconds / 10) * 10} Sekunden`;
  const minutes = seconds / 60;
  if (minutes < 10) return `noch etwa ${Math.round(minutes)} Minuten`;
  if (minutes < 60) return `noch etwa ${Math.round(minutes / 5) * 5} Minuten`;
  return 'noch über eine Stunde';
}

/** Megabyte mit einer Nachkommastelle und deutschem Komma. */
export function mb(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1).replace('.', ',')} MB`;
}

/* ------------------------------------------------------------------ *
 * Was der Knopf sagt — in jedem seiner Zustände.
 * ------------------------------------------------------------------ */

/**
 * **Die Lage des Downloads**, und daraus wird alles Sichtbare gerechnet.
 *
 * Die Zustände sind bewusst wenige, und zwei davon sind Absagen: Ein Knopf,
 * der so tut, als könne er etwas, und dann stumm nichts tut, ist schlimmer als
 * einer, der sagt, warum nicht.
 */
export type FullState =
  /**
   * **Noch nicht nachgesehen.** Der Anfangszustand: Nachgesehen wird erst,
   * wenn der Browser Luft hat und ein Service Worker antwortet (`main.ts`,
   * `watchFullState`). Bis dahin hält er _Beitreten_ nicht auf.
   */
  | { readonly kind: 'unbekannt' }
  /** Kein Service Worker (Entwicklungsbetrieb) oder kein Cache-API. */
  | { readonly kind: 'kein-speicher'; readonly reason: 'sw' | 'cache' }
  /** Die Liste ließ sich nicht holen — ohne sie gibt es keinen Plan. */
  | { readonly kind: 'keine-liste' }
  /** Es wird gerechnet: Liste holen, Speicher auslesen. */
  | { readonly kind: 'prüft' }
  /** Es fehlt noch etwas, und es läuft gerade nicht. */
  | { readonly kind: 'offen'; readonly have: number; readonly total: number }
  /** Es läuft. */
  | {
      readonly kind: 'läuft';
      readonly have: number;
      readonly total: number;
      readonly eta: number | null;
      /** Wie viele Dateien bisher aufgegeben wurden — meist 0. */
      readonly missing: number;
    }
  /** Angehalten — was da ist, bleibt da. */
  | { readonly kind: 'angehalten'; readonly have: number; readonly total: number }
  /** Alles da. */
  | { readonly kind: 'fertig'; readonly total: number }
  /** Durch, aber einzelne Dateien fehlen. */
  | {
      readonly kind: 'lückenhaft';
      readonly have: number;
      readonly total: number;
      readonly missing: number;
    };

/** Wie weit der Balken steht, von 0 bis 1. */
export function fullShare(state: FullState): number {
  if (state.kind === 'fertig') return 1;
  if (state.kind === 'läuft' || state.kind === 'offen' || state.kind === 'angehalten') {
    return state.total > 0 ? Math.min(1, state.have / state.total) : 0;
  }
  if (state.kind === 'lückenhaft')
    return state.total > 0 ? Math.min(1, state.have / state.total) : 0;
  return 0;
}

/**
 * **Was auf _Beitreten_ steht, solange der Download ihn braucht** — sonst
 * `null`, und der Knopf heißt, wie er immer heißt (`core/screenView.ts`).
 *
 * Einen eigenen Knopf für den Download gibt es nicht mehr: Gespielt wird mit
 * allem, was dazugehört, und geholt wird es von selbst. Also sagt der eine
 * Knopf, woran er gerade ist, und der Balken steht direkt darunter.
 */
export function fullLabel(state: FullState): string | null {
  switch (state.kind) {
    case 'prüft':
      return 'Wird geprüft …';
    case 'läuft':
      return `Lädt … ${Math.floor(fullShare(state) * 100)}\u00a0%`;
    default:
      return null;
  }
}

/**
 * **Und die Zeile unter dem Balken.** Sie sagt, wie viel von wie viel, wie
 * lange es noch dauert, und im Zweifel, warum gar nichts geht. Leer heißt:
 * nichts zu sagen.
 */
export function fullHint(state: FullState): string {
  switch (state.kind) {
    case 'unbekannt':
      return '';
    case 'kein-speicher':
      return state.reason === 'sw'
        ? 'Geht nur in der gebauten Seite: Im Entwicklungsbetrieb läuft kein Service Worker, und ohne ihn landet nichts im Speicher.'
        : 'Dieser Browser hat keinen Speicher für Dateien (Cache API) — ohne ihn lässt sich nichts für später ablegen.';
    case 'keine-liste':
      return 'Die Liste der Dateien ist nicht erreichbar. Mit Netz noch einmal versuchen.';
    case 'prüft':
      return 'Es wird nachgesehen, was schon da ist …';
    case 'offen':
      return state.have > 0
        ? `${mb(state.have)} von ${mb(state.total)} liegen schon im Gerät.`
        : `${mb(state.total)} für Spiel und Regal — danach läuft alles ohne Netz.`;
    case 'läuft':
      // **Fehlschläge werden schon im Lauf gesagt.** Ein Balken, der steht,
      // während die Restzeit weiter eine Zahl nennt, ist sonst nicht zu
      // deuten — und genau so sieht es aus, wenn unterwegs das Netz wegbricht.
      return `${mb(state.have)} von ${mb(state.total)} · ${etaText(state.eta)}${
        state.missing > 0 ? ` · ${missingText(state.missing)}` : ''
      }`;
    case 'angehalten':
      return `Übersprungen bei ${mb(state.have)} von ${mb(state.total)}. Das Geholte bleibt, der Rest kommt beim nächsten Start.`;
    case 'fertig':
      return `Alles da — ${mb(state.total)} im Gerät, die Spielwiese läuft auch ohne Netz.`;
    case 'lückenhaft':
      return `${mb(state.have)} von ${mb(state.total)} · ${missingText(state.missing)}.`;
  }
}

/** „eine Datei kam nicht an" oder „7 Dateien kamen nicht an". */
function missingText(missing: number): string {
  return missing === 1 ? 'eine Datei kam nicht an' : `${missing} Dateien kamen nicht an`;
}

/**
 * **Ein Wort zur Leitung, wenn es angebracht ist** — sonst `''`.
 *
 * Eine **Warnung und keine Weigerung**, und das ist der Unterschied zum
 * Vorwärmen: Dort schweigt `saveData` die ganze Freundlichkeit weg, weil
 * niemand danach gefragt hat. Hier hat jemand gefragt, und 60 MB über eine
 * Mobilfunkleitung sind seine Entscheidung — er soll sie nur bewusst treffen.
 */
export function fullWarning(signals: {
  saveData?: boolean | undefined;
  effectiveType?: string | undefined;
}): string {
  if (signals.saveData === true) return 'Achtung: „Daten sparen" ist eingeschaltet.';
  if (signals.effectiveType === '2g' || signals.effectiveType === 'slow-2g') {
    return 'Achtung: Die Leitung ist sehr schmal — das dauert.';
  }
  if (signals.effectiveType === '3g') return 'Über Mobilfunk kann das einige Minuten dauern.';
  return '';
}

/**
 * **Darf gerade losgelegt werden?**
 *
 * Von den fünf Bedingungen des Vorwärmens bleibt fast nichts übrig — wer
 * drückt, hat gefragt. Zwei Höflichkeiten bleiben trotzdem, und beide sind
 * keine Bandbreitenfragen:
 *
 * - **Ohne Speicher geht es nicht** (kein Service Worker, kein Cache-API).
 *   Das ist keine Höflichkeit, sondern Physik.
 * - **Im Hintergrund fängt nichts an.** Wer den Reiter wegschaltet, bevor es
 *   losgeht, bekommt den Lauf, wenn er zurückkommt — ein laufender wird
 *   dagegen **nicht** angehalten: Sechzig Megabyte anzufangen und dann beim
 *   Blick aufs Telefon abzubrechen wäre genau das Gegenteil dessen, wofür der
 *   Knopf da ist.
 */
export function mayStartFull(signals: {
  hasCache: boolean;
  controlled: boolean;
  hidden: boolean;
}): boolean {
  return signals.hasCache && signals.controlled && !signals.hidden;
}
