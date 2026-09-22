import { blocksView, GHOST_KNEE, type GhostCandidate } from './wallGhost';

/**
 * **Welche Quader des Grundrisses sich zu einem Bündel zusammenfassen lassen.**
 *
 * Eine Gitterwelt baut ihren Grundriss Kachel für Kachel: Jeder `PlanSolid`
 * wird ein eigenes `THREE.Mesh` mit eigener `BoxGeometry`, und jedes davon ist
 * beim Zeichnen ein eigener Aufruf an die Grafikkarte. In der Testwelt sind das
 * **1 364 Quader**, von denen aus der Küche heraus rund **950 gleichzeitig im
 * Bild** stehen — die Küche liegt ganz im Norden, die Kartstrecke ganz im
 * Süden, und dazwischen liegt das ganze Gelände offen da. Gemessen waren das
 * 1 924 Zeichenaufrufe je Bild gegenüber 792, wenn man in die andere Richtung
 * schaut. Genau dieser Unterschied ist der Einbruch der Bildrate, von dem
 * dieser Blick handelt.
 *
 * Die Antwort darauf heißt `InstancedMesh`: tausend gleiche Kästen in **einem**
 * Aufruf. `GridWorld.batchGridGeometry()` konnte das schon immer — und stand
 * aus einem guten Grund überall auf `false`: Ein Bündel hat **ein** Material,
 * und das **Wand-Ghosting** (`wallGhost.ts`) braucht das Gegenteil. Von oben
 * wird durchsichtig, was zwischen Kamera und Figur steht, und zwar genau
 * *diese* eine Wand — in einem Bündel würde stattdessen jede Wand derselben
 * Sorte auf derselben Ebene durchsichtig.
 *
 * Diese Datei ist die Beobachtung, dass der Einwand gar nicht für alle Quader
 * gilt. `blocksView` beantwortet längst die Frage, ob ein Quader überhaupt
 * jemanden verdecken kann — Böden nie, alles unter Kniehöhe auch nicht. In der
 * Testwelt sind das **1 131 von 1 364**: Bodenkacheln, Schwellen, Rampen,
 * Druckplattenränder. Kein einziger davon wird je durchsichtig, und deshalb
 * kostet es auch nichts, sie zu bündeln. Die Wände bleiben einzeln, das
 * Ghosting bleibt unangetastet, und der Blick über das Gelände wird um rund
 * neunhundert Zeichenaufrufe leichter.
 *
 * Zwei Sorten kommen trotzdem nicht ins Bündel, obwohl sie flach liegen:
 *
 * - **Portalflächen.** Ein Portal haftet an *einer* Fläche und bekommt dafür
 *   eine eigene Kollisionsgruppe (`PortalWorld.slab`). In einem Bündel gäbe es
 *   die eine Fläche nicht mehr, und ein Bodenportal risse nebenbei jede andere
 *   Bodenkachel derselben Sorte auf.
 * - **Türblätter.** Sie gehen auf und zu, also ändert sich ihre Sichtbarkeit
 *   (`GridWorld.gridDoorVisible`, `slidingDoor.ts`) — und ein Bündel hat genau
 *   eine, für alle darin gemeinsam.
 * - **Was ein Modell aus dem Regal ersetzt** (`blocks.BLOCK_MODELS`). Dieselbe
 *   Begründung wie beim Türblatt, nur einmalig statt fortwährend: Der Quader
 *   wird unsichtbar, sobald die Datei da ist, und ein Bündel kennt nur alle
 *   oder keinen — siehe `BatchCandidate.modelled`.
 *
 * Wie überall in diesem Verzeichnis: **reine Rechnung, kein three.js.** Wer die
 * Entscheidung anwendet, ist `GridWorld.rebuildGrid`; was ein Bündel auf der
 * Grafikkarte ist, steht dort und nicht hier.
 */

/** Was von einem Quader gebraucht wird, um über das Bündeln zu entscheiden. */
export interface BatchCandidate extends GhostCandidate {
  /** Ob eine Portalfläche daraus wird (`PlanSolid.portal`, Sorte `panel`). */
  portal?: boolean;
  /** Ob ein Türblatt daran hängt (`PlanSolid.door`). */
  door?: boolean;
  /**
   * Ob ein Modell aus dem Regal an seine Stelle tritt (`blocks.blockModel`).
   *
   * Die dritte Ausnahme, und sie kam mit dem Regal als Möbel: Ein Quader, den
   * ein Modell ersetzt, wird unsichtbar — aber erst, wenn die Datei da ist,
   * und das ist im Zweifel ein paar hundert Millisekunden nach dem Bündeln.
   * Ein Bündel hat genau eine Sichtbarkeit, und wer ihn hineinließe, hätte ein
   * Regal, das im Bündel weiter dasteht, während das Modell davorsteht: zwei
   * Regale auf einer Kachel, und das zweite ließe sich nicht mehr ausschalten,
   * ohne jedes andere Brett derselben Sorte mit auszuschalten.
   *
   * Der Preis dafür ist ein Zeichenaufruf je Brett, solange kein Modell da
   * ist — sechs Quader je Regal. Das ist billiger als die Alternative, nach
   * dem Eintreffen jeder einzelnen Datei alle Bündel neu zu bauen.
   */
  modelled?: boolean;
}

/**
 * **Darf dieser Quader in ein Bündel?**
 *
 * Die Frage ist bewusst die Umkehrung von `blocksView` und nicht eine zweite,
 * ähnliche Regel daneben: Was ghosten kann, bleibt einzeln — was nicht ghosten
 * kann, darf zusammen. Stünden hier eigene Schwellenwerte, liefen die beiden
 * Listen beim ersten Nachjustieren auseinander, und dann gäbe es eine Wand, die
 * im Bündel steckt und trotzdem durchsichtig werden soll.
 */
export function joinsBatch(one: BatchCandidate, knee = GHOST_KNEE): boolean {
  if (one.portal === true || one.door === true || one.modelled === true) return false;
  return !blocksView(one, knee);
}

/**
 * **Und darf dieser Quader in ein Bündel, das nur aus den Augen gilt?**
 *
 * Der Einwand gegen das Bündeln — ein Bündel hat ein Material, das Ghosting
 * braucht viele — ist in Runde zwei noch einmal nachgelesen worden, und zwar in
 * `GridWorld.stepWallGhosts`. Dort steht die erste Zeile:
 *
 * ```ts
 * if (!ctx.topDown) { this.clearWallGhosts(); return; }
 * ```
 *
 * **Geghostet wird ausschließlich von oben.** In der Brille steht man *in* der
 * Welt; eine Wand, die dort durchsichtig würde, weil der Kopf zufällig
 * dahintersteht, wäre ein Fehler und kein Hilfsmittel. Der Einwand gilt also
 * nicht für alle Zeiten, sondern für **eine Ansicht** — und ausgerechnet für
 * die, die auf keiner Brille läuft.
 *
 * Also darf auch eine Wand in ein Bündel, solange man dafür sorgt, dass von
 * oben wieder die einzelnen Quader dastehen. Genau das macht `GridWorld`: Aus
 * den Augen ist das Bündel zu sehen und die Quader sind unsichtbar, von oben
 * genau andersherum. Gemessen aus der Küche mit Blick auf die Gokart-Strecke
 * waren die Wände **156 von 414** Zeichenaufrufen im Hauptdurchgang und **90
 * von 243** im Schattendurchgang — zusammen 37 % eines Bildes, und in der
 * Brille das Doppelte davon, weil der Hauptdurchgang je Auge einmal läuft.
 *
 * Die Ausnahmen bleiben dieselben wie oben und aus denselben Gründen:
 * **Portalflächen**, **Türblätter** und **was ein Modell ersetzt**. Und die
 * beiden Listen bleiben
 * ausdrücklich komplementär — was `joinsBatch` nimmt, lässt diese Frage liegen
 * und umgekehrt; ein Quader steckt nie in beiden Bündeln.
 */
export function joinsGhostBatch(one: BatchCandidate, knee = GHOST_KNEE): boolean {
  if (one.portal === true || one.door === true || one.modelled === true) return false;
  return blocksView(one, knee);
}

/**
 * **Der Schlüssel, unter dem zwei Quader ins selbe Bündel gehören**: gleiches
 * Material **und** gleiche Etage.
 *
 * Die Etage steht dabei, weil das Aufschneiden von oben (`core/cutaway.ts`) an
 * `userData.level` hängt und ein Objekt genau eine Sichtbarkeit hat: Ein Bündel
 * über zwei Stockwerke ließe sich nicht mehr aufschneiden — man stünde im
 * Erdgeschoss und hätte den Boden des Obergeschosses als Deckel über sich.
 *
 * `level` darf `null` sein: Eine Welt ohne Etagenmarken (das Portal-Labor, das
 * Interaktionslabor) wird nicht aufgeschnitten, und ihre Quader gehören
 * deshalb alle in dasselbe Bündel.
 */
export function batchKey(material: string, level: number | null): string {
  return `${material}:${level ?? 'frei'}`;
}
