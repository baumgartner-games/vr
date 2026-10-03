import { BUILD_META } from './buildId';

/**
 * **Gibt es eine neue Version?** — gefragt, wenn die App wieder nach vorn
 * kommt, und beantwortet, ohne dass jemand etwas davon merkt.
 *
 * Gewünscht (Oktober 2026): _„es nervt, dass wenn die pwa im background war
 * und ich zurück Wechsel ich gefühlt raus geworfen werde. Es soll im
 * Hintergrund prüfen (wenn die App in den Vordergrund kommt), ob eine neue
 * Version da ist und mich über Modal/Menü darüber informieren und fragen ob
 * ich neuladen will, ich aber erstmal die App normal weiter nutzen kann."_
 *
 * Bis dahin hat die App gar nicht nachgesehen: Eine alte Sitzung lief weiter,
 * bis sie eine Welt öffnen wollte, deren Datei es nach dem Deploy nicht mehr
 * gab — dann lud sie still neu und stand auf der Startseite
 * (`staleBuild.ts`). Jetzt wird beim Zurückkommen die Seite selbst geholt
 * (`index.html`, am Speicher vorbei) und ihre Kennung (`buildId.ts`) mit der
 * eigenen verglichen. Ist sie anders, fragt die App (`ui/UpdatePrompt.ts`) —
 * neu geladen wird nur auf Wunsch.
 */

/** **Die Kennung aus dem Text einer Seite** — leer, wenn keine Marke darin steht. */
export function buildIdIn(html: string): string {
  const tag = new RegExp(`<meta[^>]*name=["']${BUILD_META}["'][^>]*>`, 'i').exec(html)?.[0];
  return tag ? (/content=["']([^"']*)["']/i.exec(tag)?.[1] ?? '') : '';
}

/**
 * **Wie oft höchstens gefragt wird** — einmal je Minute. Wer zwischen zwei
 * Apps hin- und herschaltet, soll nicht jedes Mal eine Seite laden.
 */
export const CHECK_GAP_MS = 60_000;

export interface UpdateWatchOptions {
  /** Die Kennung dieses Builds (`readBuildId`) — leer: nichts zu vergleichen. */
  readonly current: string;
  /** Wo die Seite liegt (`…/index.html`). */
  readonly url: string;
  /** Wie sie geholt wird — im Spiel `fetch`, im Test eine Attrappe. */
  readonly fetch: (
    url: string,
    init: RequestInit,
  ) => Promise<{ ok: boolean; text(): Promise<string> }>;
  /** Eine neue Version ist da — gerufen einmal je neuer Kennung. */
  readonly onNewer: (id: string) => void;
  /** Die Uhr in Millisekunden — im Test eine eigene. */
  readonly now?: () => number;
}

/**
 * **Der Wächter**: `check()` fragt, wenn es Zeit ist, und meldet eine neue
 * Kennung einmal. Er wirft nie — ohne Netz gibt es eben keine Auskunft.
 */
export class UpdateWatch {
  private last = Number.NEGATIVE_INFINITY;
  private told = '';
  private busy = false;

  constructor(private readonly options: UpdateWatchOptions) {}

  /** Die neue Kennung, sobald eine gefunden wurde — sonst leer. */
  get newer(): string {
    return this.told;
  }

  async check(force = false): Promise<void> {
    const { current } = this.options;
    if (!current || this.busy) return;
    const now = (this.options.now ?? Date.now)();
    if (!force && now - this.last < CHECK_GAP_MS) return;
    this.last = now;
    this.busy = true;
    try {
      // **Am Speicher vorbei**: `no-store` für den Browser, die Query für den
      // Service Worker — der holt Seiten ohnehin zuerst aus dem Netz, aber eine
      // Antwort aus seinem Speicher (offline) soll hier nicht als Auskunft gelten.
      const url = `${this.options.url}${this.options.url.includes('?') ? '&' : '?'}update=${now}`;
      const response = await this.options.fetch(url, { cache: 'no-store' });
      if (!response.ok) return;
      const id = buildIdIn(await response.text());
      if (!id || id === current || id === this.told) return;
      this.told = id;
      this.options.onNewer(id);
    } catch {
      // Kein Netz, keine Auskunft — beim nächsten Zurückkommen wieder.
    } finally {
      this.busy = false;
    }
  }
}
