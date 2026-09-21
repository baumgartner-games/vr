/**
 * **Die Prüfsumme an einer Adresse** — damit ein geändertes Modell und ein
 * geänderter Ton beim nächsten Start auch wirklich ankommen, und ein
 * **un**geändertes eben nicht noch einmal.
 *
 * ## Der Fehler, den diese Zeilen abstellen
 *
 * Modelle und Aufnahmen liegen unter **festen** Namen (`models/kitchen.glb`,
 * `audio/kitchen/pick-0.ogg`) — anders als die Skripte, deren Dateiname den
 * Hash ihres Inhalts trägt. Der Service Worker beantwortet feste Namen mit
 * _stale-while-revalidate_ (`core/swRoutes.ts`, `revalidate`): Er gibt sofort
 * her, was er hat, und sieht erst **danach** im Netz nach. Das ist für ein
 * Telefon genau richtig — nur heißt es eben auch: Nach einem Deploy sieht man
 * beim ersten Start noch den **alten** Stand, und erst der zweite zeigt den
 * neuen.
 *
 * Und genau so ist es aufgefallen: Ein Feuerlöscher stand auf einem Hocker,
 * den es im Repository seit dem Umbau nicht mehr gibt — die Datei im Telefon
 * war zwei Builds alt. Man sieht es dem Bild nicht an, dass es an einem
 * Speicher liegt und nicht am Katalog; man sucht den Fehler im Modell.
 *
 * **Etwas in der Adresse macht daraus einen anderen Namen.** Ein Build, der
 * `models/kitchen.glb?v=x7Kp2Qa1` fragt, bekommt von keinem Speicher eine
 * Antwort, der nur `?v=Ab9_2cQ4` kennt — auch nicht vom Service Worker des
 * **vorigen** Builds, der auf dem Telefon noch läuft, während die neue Seite
 * schon geladen ist. Er holt sie aus dem Netz, und das ist die richtige
 * Antwort.
 *
 * ## Und warum es keine Build-Nummer mehr ist
 *
 * Hier stand einmal `?v=<BUILD_ID>`, und das war zwar richtig, aber viel zu
 * grob: Eine Build-Nummer ändert sich bei **jedem** Deploy, auch bei einem,
 * der ein Komma in einem Kommentar verschiebt. Gemessen waren das **3,7 MB
 * Töne und Modelle**, die jedes Telefon nach jedem Deploy noch einmal über die
 * Leitung zog, Byte für Byte dieselben — plus die 215 kB des Regal-Index, den
 * das Vorwärmen unter einer Nummer holte, die sonst niemand anfragte.
 *
 * Was jetzt in der Adresse steht, ist die **Prüfsumme des Inhalts**, gerechnet
 * beim Bauen über die Dateien in `public/` (`vite.config.ts`, `assetHashes`).
 * Sie ändert sich genau dann, wenn sich die Datei ändert — und das ist die
 * ganze Aussage, die man von einer Adresse haben will.
 *
 * Ein zweiter Gewinn kam ungefragt dazu: Die Build-Nummer stand in einem
 * Modul, das zehn Chunks importierten, und benannte damit nach jedem Deploy
 * 22 Dateien um (siehe `core/buildId.ts`). Dieses Verzeichnis hier ändert sich
 * nur mit `public/`, also praktisch nie.
 *
 * ## Warum nicht der Dateiname
 *
 * Weil diese Dateien nicht durch das Bündeln gehen: Sie liegen in `public/`
 * und werden unverändert kopiert (`vite.config.ts`). Ein Hash im Namen hieße,
 * sie durch den Bündler zu schicken — für Megabytes an Modellen und Tönen, die
 * niemand importiert, sondern die geladen werden, wenn eine Welt sie braucht.
 *
 * ## In Jest ist das Verzeichnis leer
 *
 * `__ASSET_HASHES__` setzt Vite beim Bauen ein (`define`); in einem Jest-Lauf
 * gibt es das nicht. `typeof` auf einen unbekannten Namen ist in JavaScript
 * kein Fehler, sondern `'undefined'` — deshalb steht hier `typeof` und keine
 * Abfrage auf den Wert. Ohne Verzeichnis wird nichts gestempelt, und das ist
 * die sichere Seite: Eine Datei ohne `?v=` wird nachgeholt, eine mit falschem
 * `?v=` wäre für immer verloren.
 */

declare const __ASSET_HASHES__: Readonly<Record<string, string>> | undefined;

/**
 * **Das Verzeichnis: Pfad unter `public/` → Prüfsumme.** Die Schlüssel sind
 * die Pfade, wie sie unter der Basis der Seite liegen
 * (`audio/kitchen/pick-0.ogg`), nicht die vollen Adressen — unter welcher
 * Basis die Seite läuft, weiß erst der Browser.
 */
export type AssetHashes = Readonly<Record<string, string>>;

/** Was dieser Build über `public/` weiß — oder `{}` (Jest, `vite dev`). */
export const ASSET_HASHES: AssetHashes =
  typeof __ASSET_HASHES__ === 'object' && __ASSET_HASHES__ !== null ? __ASSET_HASHES__ : {};

/**
 * **Die Prüfsumme hinter einer Adresse** — oder `undefined`, wenn dieser Build
 * die Datei nicht kennt.
 *
 * Gesucht wird über das **Ende** der Adresse, und das ist Absicht: Der
 * Schlüssel ist ein Pfad unter `public/`, die Adresse ist derselbe Pfad hinter
 * der Basis der Seite — `https://…/vr/models/kitchen.glb` unter GitHub Pages,
 * `http://localhost:5173/models/kitchen.glb` daheim. Wer stattdessen die Basis
 * hereinreichte, hätte sie an sieben Aufrufstellen richtig zu halten, und eine
 * davon wäre falsch.
 *
 * `undefined` heißt **nicht** „Fehler", sondern „diese Datei stempeln wir
 * nicht": die Controller-Profile, das Manifest, die Symbole und das ganze
 * Regal (`vite.config.ts`, `isStamped`). Für sie bleibt es beim Nachholen.
 */
export function assetHashOf(url: string, hashes: AssetHashes = ASSET_HASHES): string | undefined {
  const cut = url.search(/[?#]/);
  const path = cut === -1 ? url : url.slice(0, cut);
  for (const [key, hash] of Object.entries(hashes)) {
    if (path === key || path.endsWith(`/${key}`)) return hash;
  }
  return undefined;
}

/**
 * **Eine Adresse mit der Prüfsumme ihres Inhalts.** Kennt der Build die Datei
 * nicht, bleibt die Adresse, wie sie ist — ein `?v=` ohne Wert wäre ein
 * zweiter Name für dieselbe Datei und damit genau der Speicherfehler, den
 * diese Datei abstellt, nur andersherum.
 *
 * Angehängt wird mit `?` oder `&`, je nachdem, ob schon eine Frage in der
 * Adresse steht.
 */
export function versionedWith(url: string, hashes: AssetHashes): string {
  const hash = assetHashOf(url, hashes);
  if (hash === undefined) return url;
  return `${url}${url.includes('?') ? '&' : '?'}v=${encodeURIComponent(hash)}`;
}

/** Dasselbe mit dem Verzeichnis dieses Builds. */
export function versioned(url: string): string {
  return versionedWith(url, ASSET_HASHES);
}
