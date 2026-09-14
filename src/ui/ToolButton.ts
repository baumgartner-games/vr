import { drawMenuIcon, type MenuEntry, type MenuIcon } from './menu';
import type { ToolChoice } from '../core/types';

/**
 * **Der Werkzeug-Knopf** (`index.html`, `#hud-tool`).
 *
 * In der Brille hängt das Regal am Handgelenk, und man greift hinein. Am
 * Bildschirm gibt es keine Hand, die irgendwo hingreift — dort lag bis eben
 * fest, was die Welt beim Bauen in die Bildschirmhand gelegt hatte, und wer
 * etwas anderes wollte, hatte Pech. Also ein runder Knopf unten rechts, über
 * `A` und `B`: Er **zeigt**, was gerade in der Hand liegt, und ein Druck
 * klappt die Liste auf (`App`, `ui/PageMenu.ts`).
 *
 * Gezeichnet wird die Ikone mit demselben Stift wie jede Menüzeile
 * (`drawMenuIcon`) — dieselbe Pistole im Knopf wie im Regal, sonst lernt man
 * zwei Bilder für ein Ding. Ist nichts gewählt, steht dort eine **offene
 * Hand**: Auch das ist eine Wahl und kein Fehlen.
 *
 * Kein three.js, nur DOM — damit ein Test ihn ohne Browser aufschlagen kann.
 */

/** Wie die leere Hand heißt — an einer Stelle, für Knopf und Liste. */
export const HAND_LABEL = 'Hand (leer)';

/**
 * **Der kleine Baum hinter dem Knopf**: zuerst die **Hand**, dann die
 * Werkzeuge der Welt (`World.toolChoice`).
 *
 * Die Hand steht zuerst, weil sie die Ausnahme ist, die man am schnellsten
 * wieder braucht: Ein Werkzeug legt man weg, um etwas anderes zu tun. Und ein
 * Tipp wählt **und schließt** — eine Liste, die offen bleibt, verdeckt genau
 * das, worauf man gerade zielen wollte; das Schließen besorgt `pick`.
 *
 * Rein und ohne DOM, damit ein Test die Reihenfolge und den Punkt an der
 * gewählten Zeile nachrechnen kann.
 */
export function toolEntries(choice: ToolChoice, pick: (id: string | null) => void): MenuEntry[] {
  return [
    {
      id: 'tool:hand',
      label: HAND_LABEL,
      sub: 'Nichts in der Hand',
      icon: 'hand',
      selected: choice.current === null,
      run: () => pick(null),
    },
    ...choice.options.map((option) => ({
      id: `tool:${option.id}`,
      label: option.label,
      icon: option.icon ?? ('tools' as const),
      accent: option.accent ?? 0x9d7bff,
      selected: choice.current === option.id,
      run: () => pick(option.id),
    })),
  ];
}

/** Wie groß die Ikone gezeichnet wird, in Bildpunkten der Leinwand. */
const ICON_PX = 72;

export class ToolButton {
  private readonly canvas: HTMLCanvasElement;
  private readonly press: () => void;
  /** Was zuletzt gezeichnet wurde — ein Neuzeichnen je Bild wäre Unsinn. */
  private drawn: string | null = null;

  constructor(
    private readonly element: HTMLButtonElement,
    onPress: () => void,
  ) {
    this.press = onPress;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'hud-tool__icon';
    this.canvas.width = ICON_PX;
    this.canvas.height = ICON_PX;
    this.element.replaceChildren(this.canvas);
    this.element.addEventListener('click', this.onClick);
    this.draw(null, 'Hand (leer)');
  }

  /** Ob der Knopf überhaupt dasteht — in der Brille nie, ohne Werkzeuge auch nicht. */
  show(on: boolean): void {
    this.element.hidden = !on;
  }

  /** Ob die Liste dahinter gerade offen ist (`aria-expanded`). */
  setOpen(open: boolean): void {
    this.element.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /**
   * **Das liegt jetzt in der Hand.** `null` als Ikone heißt: die offene Hand.
   *
   * @param label steht als Hilfetext am Knopf — auf 44 × 44 Punkten ist für
   *              ein Wort kein Platz, für einen Namen schon.
   */
  set(icon: MenuIcon | null, label: string, accent = '#e7ecf5'): void {
    const key = `${icon ?? 'hand'}|${label}|${accent}`;
    if (key === this.drawn) return;
    this.drawn = key;
    this.draw(icon, label, accent);
  }

  dispose(): void {
    this.element.removeEventListener('click', this.onClick);
    this.element.replaceChildren();
  }

  private draw(icon: MenuIcon | null, label: string, accent = '#e7ecf5'): void {
    this.element.setAttribute('aria-label', `Werkzeug: ${label}`);
    this.element.title = `${label} · Tab`;
    const ctx = this.canvas.getContext('2d');
    // Ohne Leinwand (jsdom) bleibt die Fläche leer — dem Test ist das egal,
    // und dem Knopf auch: Er hat seine Beschriftung.
    if (!ctx) return;
    ctx.clearRect(0, 0, ICON_PX, ICON_PX);
    drawMenuIcon(ctx, icon ?? 'hand', ICON_PX / 2, ICON_PX / 2, ICON_PX * 0.7, accent);
  }

  private readonly onClick = (): void => {
    this.press();
  };
}
