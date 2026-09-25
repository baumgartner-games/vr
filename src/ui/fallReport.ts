import { COPY_FALLBACK, copyText } from './clipboard';

/**
 * **Die Box nach einem Sturz aus der Welt** — oben im Bild wie die Position
 * (`core/positionHud.ts`), mit dem Weg dorthin zum Kopieren
 * (`worlds/shared/fallTrail.fallReportText`).
 *
 * Sie bleibt stehen, bis man sie schließt oder den nächsten Sturz hat: Wer
 * gerade wieder am Startpunkt steht, will erst schauen, wo er ist, und dann
 * kopieren. In der Brille ist sie DOM und unsichtbar — die Spur liegt dann in
 * der Konsole (`console.info`), damit sie nicht verloren ist.
 */
export class FallReport {
  private element: HTMLDivElement | null = null;
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
    this.element!.hidden = false;
  }

  hide(): void {
    if (this.element) this.element.hidden = true;
  }

  dispose(): void {
    window.clearTimeout(this.copiedTimer);
    this.element?.remove();
    this.element = null;
  }

  private build(): void {
    if (this.element) return;
    const box = document.createElement('div');
    box.className = 'fall-report';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-label', 'Sturz aus der Welt');
    const title = document.createElement('strong');
    title.textContent = 'Durch die Welt gefallen — zurück am Start. Weg dorthin:';
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
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'fall-report__button';
    close.textContent = 'Schließen';
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      this.hide();
    });
    const row = document.createElement('div');
    row.className = 'fall-report__row';
    row.append(copy, close);
    box.append(title, text, row);
    document.body.append(box);
    this.element = box;
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
