/**
 * **Die Kennung dieses Builds — und warum sie in der Seite steht und nicht im
 * Programm.**
 *
 * Gebraucht wird sie an zwei Stellen: Sie steht auf der Startseite
 * (`0.<Build>.<Patch> · <Kennung>`, `core/appVersion.ts`), und sie hängt an
 * `offline.json`, der einzigen Datei, die es in jedem Build wirklich neu gibt
 * (`core/fullDownloadRun.ts`).
 *
 * ## Warum sie in keinem Modul stehen darf
 *
 * Das ist keine Geschmacksfrage, sondern gemessen. Rollup rechnet den Hash
 * eines Chunks **über die Namen seiner Importe mit**: Ändert sich der Name
 * einer Datei, ändert sich der Name jeder, die sie nennt. Die Build-Nummer
 * stand einmal in `core/assetVersion.ts`, einem Modul von 175 Bytes, das zehn
 * Chunks importierten — und damit trugen nach **jedem** Deploy **22 Dateien**
 * neue Namen, zusammen **2,2 MB**, obwohl sich an keiner einzigen Zeile etwas
 * geändert hatte. Der Hub, die Küche, das Gespenster-Raumschiff, three.js:
 * alles neu, wegen einer Zeichenkette.
 *
 * Sie in ein eigenes Modul zu legen, half nur halb: Was `main.ts` benutzt,
 * landet im Einstiegs-Chunk, und den importieren die Welten — `App.js` (113 kB)
 * bekam weiter bei jedem Deploy einen neuen Namen.
 *
 * ## Also steht sie im `<meta>` der Seite
 *
 * Dort ist sie ohnehin richtig aufgehoben: Die drei HTML-Seiten sind die
 * einzigen Dateien mit festem Namen und wechselndem Inhalt, der Service Worker
 * holt sie **erst aus dem Netz** (`core/swRoutes.ts`, `page`), und eine Seite,
 * die aus dem Speicher kommt, bringt genau die Kennung ihres eigenen Builds
 * mit — was sonst niemand garantieren könnte. Eingesetzt wird sie beim Bauen
 * (`vite.config.ts`, `buildTagPlugin`).
 *
 * Damit kostet ein Deploy, der nichts am Quelltext ändert, **keinen einzigen
 * Chunk** mehr.
 *
 * ## Ohne Marke ist sie leer
 *
 * In einem Jest-Lauf gibt es kein Dokument, in einem alten Speicher vielleicht
 * eine Seite ohne die Marke. Beides ist kein Fehler: Ein leerer Text heißt
 * „keine Auskunft", die Startseite zeigt dann nur `0.<Build>.<Patch>`, und
 * `offline.json` wird ohne Query geholt.
 */

/**
 * Der Name der Marke. Er steht **einmal**: `vite.config.ts` importiert ihn von
 * hier, damit Schreiber und Leser nicht auseinanderlaufen können.
 */
export const BUILD_META = 'bgvr-build';

/** So viel von einem `Document` braucht die Auskunft. */
export interface BuildMetaSource {
  querySelector(selectors: string): { getAttribute(name: string): string | null } | null;
}

/**
 * **Die Kennung aus der Seite** — oder ein leerer Text, wenn keine dasteht.
 *
 * @param doc Das Dokument; in `main.ts` ist das `document`.
 */
export function readBuildId(doc: BuildMetaSource | null | undefined): string {
  return doc?.querySelector(`meta[name="${BUILD_META}"]`)?.getAttribute('content') ?? '';
}
