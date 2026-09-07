/**
 * **Wenn die Seite aus einem Build läuft, den es nicht mehr gibt.**
 *
 * Jede Welt wird erst beim Betreten nachgeladen — ein `import()` je Eintrag in
 * `worlds/index.ts`, also ein eigener Chunk je Welt, und jeder Chunk trägt den
 * Hash seines Inhalts im Dateinamen. Ein Deploy schreibt `gh-pages` komplett
 * neu (`.github/workflows/deploy.yml` pusht `dist` mit `--force`), und danach
 * gibt es die alten Dateinamen nicht mehr.
 *
 * Für eine Seite, die schon offen war, heißt das: Sie läuft weiter, aber jeder
 * Wechsel in eine Welt, die in **dieser** Sitzung noch nicht geladen war,
 * greift ins Leere — der Server antwortet mit 404, das `import()` scheitert,
 * und man bleibt stehen, wo man ist. Welten, die schon einmal geladen waren,
 * wechseln dagegen weiter, denn ihr Modul liegt längst im Speicher des
 * Browsers. Genau das ist das Bild, an dem man diesen Fehler erkennt:
 * *„zurück ins Portal Labor geht immer, in andere Welten manchmal nicht“* —
 * und eine Brille bleibt schnell einen halben Tag auf derselben Seite stehen,
 * während zwischendurch dreimal deployt wurde.
 *
 * Heilen lässt sich das nur durch **Neuladen**: Eine neue `index.html` bringt
 * die neuen Dateinamen mit. Hier stehen die beiden Entscheidungen dazu — ob
 * ein Fehler *dieser* Fehler war, und ob deswegen schon einmal neu geladen
 * wurde. Reine Funktionen, damit man beides prüfen kann, ohne einen Deploy zu
 * fahren.
 */

/**
 * Woran ein gescheitertes `import()` zu erkennen ist.
 *
 * Es gibt dafür keinen Fehlertyp, nur Text, und jeder Browser schreibt einen
 * anderen — deshalb eine Liste statt eines Vergleichs. Alle drei bedeuten
 * dasselbe: Das Modul kam nicht an.
 */
const SIGNS = [
  // Chrome, Edge, alles auf Chromium — und damit die Quest.
  'failed to fetch dynamically imported module',
  // Firefox.
  'error loading dynamically imported module',
  // Safari.
  'importing a module script failed',
  'module script failed to load',
  // Vites eigener Vorlader, wenn ihm das Stylesheet zum Chunk fehlt.
  'unable to preload css',
];

/**
 * War das ein Modul, das nicht mehr da war — oder ein echter Fehler?
 *
 * Alles, was weder `Error` noch Zeichenkette ist, gilt als echter Fehler:
 * Ein Objekt, das man in einen Text zwingt, sagt `[object Object]` und passt
 * dann auf keine der Marken oben — nur eben erst nach dem Umweg.
 */
export function isStaleModuleError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const text = message.toLowerCase();
  return SIGNS.some((sign) => text.includes(sign));
}

/**
 * Darf deswegen neu geladen werden?
 *
 * Nur, wenn es für **diese** Welt noch nicht getan wurde. Ohne diese Bremse
 * dreht sich die Seite im Kreis: Nach dem Neuladen steht die gewünschte Welt
 * in der Adresse, sie wird sofort wieder geladen, und scheitert sie erneut
 * (kein Netz, ein echter Fehler im Modul), lädt die Seite wieder neu — und der
 * Spieler sieht nie etwas anderes als den Ladebildschirm.
 *
 * @param id     Die Welt, die gerade nicht kam
 * @param marker Was beim letzten Neuladen vermerkt wurde, `null` wenn nichts
 */
export function shouldReload(id: string, marker: string | null): boolean {
  return marker !== id;
}
