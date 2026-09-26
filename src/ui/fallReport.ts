import { COPY_FALLBACK, copyText } from './clipboard';
import { ScreenMessage } from './ScreenMessage';

/**
 * **Die Box nach einem Sturz aus der Welt** — oben im Bild wie die Position
 * (`core/positionHud.ts`), mit dem Weg dorthin zum Kopieren
 * (`worlds/shared/fallTrail.fallReportText`).
 *
 * Eine Meldung wie alle am Schirm (`ui/ScreenMessage.ts`): Karte mit ✕ (oder
 * `Esc`). Sie bleibt stehen, bis man sie schließt oder den nächsten Sturz hat: Wer
 * gerade wieder am Startpunkt steht, will erst schauen, wo er ist, und dann
 * kopieren. In der Brille ist sie DOM und unsichtbar — die Spur liegt dann in
 * der Konsole (`console.info`), damit sie nicht verloren ist.
 */
export class FallReport {
  private message: ScreenMessage | null = null;
  private text: HTMLPreElement | null = null;
  private copy: HTMLButtonElement | null = null;
  private shown = '';
  private copiedTimer = 0;

  show(report: string): void {
    this.shown = report;
    console.info(report);
    if (typeof document === 'undefined') return;
    this.build();
    this.text!.textContent = report;
    this.copy!.textContent = 'Kopieren';
    this.message!.show();
  }

  hide(): void {
    this.message?.hide();
  }

  dispose(): void {
    window.clearTimeout(this.copiedTimer);
    this.message?.dispose();
    this.message = null;
  }

  private build(): void {
    if (this.message) return;
    const message = new ScreenMessage({
      className: 'fall-report',
      title: 'Durch die Welt gefallen — zurück am Start. Weg dorthin:',
    });
    message.element.setAttribute('aria-label', 'Sturz aus der Welt');
    const text = document.createElement('pre');
    text.className = 'fall-report__text';
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'fall-report__button';
    copy.textContent = 'Kopieren';
    copy.addEventListener('click', (event) => {
      event.stopPropagation();
      void this.copyReport();
    });
    const row = document.createElement('div');
    row.className = 'fall-report__row';
    row.append(copy);
    message.body.append(text, row);
    document.body.append(message.element);
    this.message = message;
    this.text = text;
    this.copy = copy;
  }

  private async copyReport(): Promise<void> {
    if (!this.shown || !this.copy) return;
    const copied = await copyText(this.shown);
    this.copy.textContent = copied ? 'Kopiert ✓' : 'Markiert';
    this.copy.title = copied ? '' : COPY_FALLBACK;
    window.clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => {
      if (this.copy) this.copy.textContent = 'Kopieren';
    }, 1500);
  }
}
