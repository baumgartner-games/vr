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
  if (one.portal === true || one.door === true) return false;
  return !blocksView(one, knee);
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
