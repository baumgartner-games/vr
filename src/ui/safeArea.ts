import './safeArea.css';

/**
 * **Der sichere Bereich** — der Teil des Bildschirms, den das Gerät nicht für
 * sich braucht.
 *
 * Gemeldet wurde es an einem Bild: Über der Überschrift des Katalogs stand
 * die Uhr des Telefons, halb im Titel, und rechts daneben die Batterie im
 * Schließen-Knopf. „Wir müssen noch darauf achten, dass wir für Menüs diese
 * noch wrappen in Safe-Area-Views." Genau das ist das hier — nur ohne
 * Rahmenwerk: Ein Kasten bekommt die Ränder des Geräts als **Polster**, und
 * sein Inhalt fängt darunter an.
 *
 * **Polster und nicht Abstand**, und das ist der ganze Trick: Der Hintergrund
 * eines Blattes soll bis unter die Uhr reichen. Ein Abstand ließe dort einen
 * helleren Streifen stehen, und das sähe nach einem Fehler aus, weil es einer
 * wäre.
 *
 * **Ränder werden einzeln bestellt.** Ein Blatt, das von unten aufzieht,
 * berührt den oberen Rand gar nicht: Ein Polster von 47 Punkten in seinem Kopf
 * wäre dort nur ein Loch. Wer den ganzen Schirm nimmt, bestellt alle vier
 * (`ui/PageMenu.ts`, `MenuEntry.full`).
 *
 * Kein three.js, kein DOM beim Laden — die Klassen stehen in `safeArea.css`,
 * und was sie bedeuten, steht dort.
 */

/** Die vier Ränder eines Bildschirms, beim Namen. */
export type SafeEdge = 'top' | 'right' | 'bottom' | 'left';

/** Alle vier — für einen Kasten, der den ganzen Schirm nimmt. */
export const SAFE_EDGES: readonly SafeEdge[] = ['top', 'right', 'bottom', 'left'];

/** Wie die Klasse zu einem Rand heißt. Eine Stelle, damit sie eine bleibt. */
export function safeClass(edge: SafeEdge): string {
  return `safe-area--${edge}`;
}

/**
 * **Diesen Kasten die genannten Ränder freihalten lassen.**
 *
 * Für alles, was es schon gibt: Das Blatt des Menüs wird in seinem
 * Konstruktor gebaut, und ein zusätzlicher Kasten drumherum wäre ein
 * zusätzlicher Kasten im Aufbau (und damit im Stil). Zurück kommt derselbe
 * Kasten, damit sich der Aufruf in eine Kette stellen lässt.
 */
export function keepSafe(element: HTMLElement, ...edges: SafeEdge[]): HTMLElement {
  for (const edge of edges.length > 0 ? edges : SAFE_EDGES) {
    element.classList.add(safeClass(edge));
  }
  return element;
}

/**
 * **Einen Rand nachträglich an- oder abschalten.**
 *
 * Dieselbe Seite ist einmal ein Blatt von unten und einmal der ganze Schirm,
 * und nur im zweiten Fall liegt ihr Kopf unter der Uhr. Gerufen wird das beim
 * Zeichnen, also oft — `classList.toggle` mit festem Zustand ändert nichts,
 * wenn sich nichts ändert.
 */
export function setSafeEdge(element: HTMLElement, edge: SafeEdge, on: boolean): void {
  element.classList.toggle(safeClass(edge), on);
}

/**
 * **Ein neuer Kasten, der die Ränder freihält** — für alles, was noch gebaut
 * wird. `className` steht vor den Rand-Klassen, damit im DOM die eigene
 * Bedeutung zuerst dasteht.
 */
export function safeArea(className = '', ...edges: SafeEdge[]): HTMLElement {
  const node = document.createElement('div');
  if (className) node.className = className;
  return keepSafe(node, ...edges);
}

/* ---------- Die Größe, die die Seite wirklich hat ---------- */

/**
 * **Die Leinwand soll den ganzen Schirm nehmen — und `100%` ist nicht der
 * ganze Schirm.**
 *
 * Gemeldet wurde es wieder an einem Bild, diesmal vom Telefon im Hochformat:
 * Die Welt hörte ein gutes Stück über der Unterkante auf, darunter lag ein
 * schwarzer Streifen — ungefähr der Strich zum Wegschieben, und noch etwas
 * mehr. Die Steuerung saß richtig, nur das Bild war zu kurz. „Die UI-Elemente
 * passen, aber den Rand unten könnte man noch für die Welt-Render nutzen."
 *
 * Der Streifen war kein Rand, sondern der **Hintergrund der Seite** unter
 * einer Leinwand, die kürzer ist als das Fenster. `#scene` hing an
 * `height: 100%`, und `100%` rechnet gegen den Kasten, den der Browser der
 * Seite zuteilt. Auf einem iPhone, das als App vom Startbildschirm läuft, ist
 * das mit `viewport-fit=cover` **nicht** der ganze Schirm: Kerbe oben und
 * Strich unten fehlen in diesem Kasten, `window.innerHeight` meldet sie aber
 * mit. Die Differenz ist genau der Streifen — oben abgezogen, unten sichtbar,
 * und deshalb höher als der Strich allein.
 *
 * Deshalb steht die Größe jetzt dort, wo die vier Ränder schon stehen: als
 * zwei Variablen, gefüllt aus `window.innerWidth`/`innerHeight` — **denselben
 * beiden Zahlen, aus denen `core/App.ts` den Bildpuffer baut**. Puffer und
 * Kasten können damit gar nicht mehr auseinanderlaufen, und unter der
 * Leinwand kann nichts mehr hervorschauen.
 *
 * Die Ränder selbst bleiben, wo sie waren: Freigehalten wird weiter der
 * **Inhalt** — Knöpfe, Stöcke, Blätter —, nicht die Fläche. Die Welt reicht
 * ab jetzt bis unter den Strich, die Finger bleiben davor.
 */
export const VIEWPORT_VARS = { width: '--app-width', height: '--app-height' } as const;

/** So viel vom Fenster braucht die Rechnung — und keinen Browser dazu. */
export interface ViewportSize {
  readonly innerWidth: number;
  readonly innerHeight: number;
}

/**
 * **Was in die beiden Variablen gehört.** Reine Rechnung, damit sie prüfbar
 * ist: ein Fenster hinein, zwei CSS-Werte heraus.
 *
 * Eine Zahl, die keine ist — `0` in einem Tab, der im Hintergrund aufgebaut
 * wird, `NaN` aus einer Attrappe —, kommt **gar nicht** heraus. Die Variable
 * bleibt dann ungesetzt, und im Stil greift der Ersatz dahinter
 * (`var(--app-height, 100%)`): lieber das alte Verhalten als eine Leinwand
 * von null Pixeln.
 */
export function viewportVars(
  view: Partial<ViewportSize> | null | undefined,
): Record<string, string> {
  const vars: Record<string, string> = {};
  const width = view?.innerWidth;
  const height = view?.innerHeight;
  if (usable(width)) vars[VIEWPORT_VARS.width] = `${width}px`;
  if (usable(height)) vars[VIEWPORT_VARS.height] = `${height}px`;
  return vars;
}

function usable(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * **Die beiden Variablen setzen und gesetzt halten.**
 *
 * Gemessen wird sofort und danach bei jeder Änderung: `resize` deckt Drehen
 * und Tastatur ab, `orientationchange` die Geräte, die beim Drehen erst das
 * eine und dann das andere melden, und `visualViewport` die Adresszeile von
 * Safari, die sich beim Scrollen zusammenschiebt, ohne dass `resize`
 * zuverlässig käme.
 *
 * Zurück kommt das Aufräumen. Die Seite braucht es nicht — sie lebt so lange
 * wie das Fenster —, aber ein Test, der Zuhörer hinterlässt, stört den
 * nächsten.
 */
export function trackViewport(view: ViewportWindow | null = globalThis.window ?? null): () => void {
  const root = view?.document.documentElement;
  if (!view || !root) return () => undefined;
  const apply = (): void => {
    for (const [name, value] of Object.entries(viewportVars(view)))
      root.style.setProperty(name, value);
  };
  apply();
  view.addEventListener('resize', apply);
  view.addEventListener('orientationchange', apply);
  view.visualViewport?.addEventListener('resize', apply);
  return () => {
    view.removeEventListener('resize', apply);
    view.removeEventListener('orientationchange', apply);
    view.visualViewport?.removeEventListener('resize', apply);
  };
}

/**
 * So viel vom Fenster braucht das Nachhalten. Ein eigener Typ und nicht
 * `Window`, damit ein Test zwei Zahlen und ein paar Zuhörer hinstellen kann.
 */
export interface ViewportWindow extends ViewportSize {
  readonly document: { readonly documentElement: HTMLElement | null };
  readonly visualViewport?: EventTarget | null;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}
