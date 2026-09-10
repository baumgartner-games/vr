import type { MapSnapshot } from '../map/mapSnapshot';
import type { RoleHost } from '../registry/roles';

/**
 * **Das bisschen, das alle drei Nicht-VR-Rollen teilen.**
 *
 * Sie zeichnen dieselbe `MapView` wie die 2D-Welt, jede mit eigenen
 * Schichten — das ist die ganze Verwandtschaft, und sie steckt in der `MapView`
 * selbst. Was hier steht, ist der Rest: ein Element bauen, eine Zeile
 * einblenden, die nach ein paar Sekunden wieder geht, und die zwei bis drei
 * Fragen an den Snapshot, die sonst jede Rolle für sich beantworten müsste.
 *
 * Bewusst **keine Basisklasse**: Die drei Rollen sind sich in ihrer Form
 * ähnlich und in ihrer Sache überhaupt nicht — eine gemeinsame Oberklasse
 * hätte am Ende drei `if`-Zweige, und genau die sollten aus `stationUi.ts`
 * verschwinden.
 */

/** Wie lange eine Zeile über der Karte stehen bleibt, in Sekunden. */
export const TOAST_SECONDS = 3.2;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  // `textContent` und nie `innerHTML`: Hier gehen Raumnamen und Spielernamen
  // durch, und die hat sich niemand ausgesucht.
  if (text) node.textContent = text;
  return node;
}

/** Eine Zeile mit Begriff und Auskunft — die Zeile der Raumakte. */
export function fact(key: string, value: string, warn = false): HTMLElement {
  const row = el('div', `role__fact${warn ? ' is-warn' : ''}`);
  row.append(el('span', 'role__fact-key', key), el('b', 'role__fact-value', value));
  return row;
}

/** Dieselbe Zeile, nur mit dem Wert so groß, dass man ihn durchs Zimmer ruft. */
export function code(key: string, value: string): HTMLElement {
  const row = el('div', 'role__fact role__fact--code');
  row.append(el('span', 'role__fact-key', key), el('b', 'role__code', value));
  return row;
}

/** Eine Meldung, die von selbst wieder geht. */
export class Toast {
  readonly element = el('div', 'role__toast');
  private left = 0;

  say(text: string): void {
    if (!text) return;
    this.element.textContent = text;
    this.left = TOAST_SECONDS;
  }

  step(dt: number): void {
    if (this.left <= 0) return;
    this.left = Math.max(0, this.left - dt);
    if (this.left <= 0) this.element.textContent = '';
  }
}

/** Der Raum unter einem Punkt — für die Karten, die auf Zimmer hören. */
export function roomName(snapshot: MapSnapshot, id: string): string {
  return snapshot.rooms.find((room) => room.id === id)?.name ?? id;
}

/**
 * Ein Wirt, der nichts kann — für Ansichten, die man ohne Welt bauen will
 * (Tests, und die Kachel, die es noch nicht gibt).
 */
export function quietHost(snapshot: () => MapSnapshot, spec: RoleHost['spec']): RoleHost {
  return {
    snapshot,
    spec,
    me: () => '',
    nameOf: (peer) => peer,
    door: () => '',
    light: () => '',
    lure: () => '',
    notify: () => {},
  };
}
