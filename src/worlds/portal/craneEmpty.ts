/**
 * **Der Knopf _Kran leeren_** — am Schirm und auf dem Telefon, solange der
 * Kran etwas am Haken hat. Derselbe Weg wie ein Rechtsklick
 * (`PortalWorld.emptyCrane`): Gewünscht war _„nachdem ich ein objekt gesetzt
 * habe meinen kran leer zu machen (ui im bildschirm button; rechtsklick mit
 * der maus)"_ — im _Baukasten_ holt jedes Setzen gleich die nächste Kopie.
 *
 * Wie die Werkzeugleiste (`buildBar.ts`) rechnet der Knopf nichts: Er merkt
 * sich den Druck, und die Welt holt ihn je Bild ab (`take`).
 */
export class CraneEmptyButton {
  private readonly element = document.createElement('button');
  private pressed = false;

  constructor() {
    this.element.type = 'button';
    this.element.className = 'crane-empty build-bar__btn';
    this.element.hidden = true;
    this.element.title = 'Kran leeren (Rechtsklick)';
    const icon = document.createElement('span');
    icon.className = 'build-bar__icon';
    icon.textContent = '✕';
    const label = document.createElement('span');
    label.className = 'build-bar__label';
    label.textContent = 'Kran leeren';
    this.element.append(icon, label);
    // Der Druck soll nicht durch den Knopf auf das Bild darunter fallen und
    // dort gleich wieder etwas aufheben oder setzen.
    this.element.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.element.addEventListener('click', (event) => {
      event.stopPropagation();
      this.pressed = true;
    });
    document.body.append(this.element);
  }

  show(on: boolean): void {
    if (this.element.hidden === !on) return;
    this.element.hidden = !on;
    if (!on) this.pressed = false;
  }

  /** Ob seit dem letzten Bild gedrückt wurde — je Druck genau einmal wahr. */
  take(): boolean {
    const pressed = this.pressed;
    this.pressed = false;
    return pressed;
  }

  dispose(): void {
    this.element.remove();
  }
}
