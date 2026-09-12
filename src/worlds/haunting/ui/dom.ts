/**
 * **Das bisschen DOM, das jede Haunting-Oberfläche braucht** — und das bis
 * hierher in sechs Dateien je einmal stand (`stationUi`, `roundSetupPanel`,
 * `optionsMenu`, `puzzleOverlay`, `monsterView`, `roleShell`), jedes Mal
 * dieselben fünf Zeilen mit einem anderen Kommentar darüber.
 *
 * Kein Rahmen, keine Klasse: ein Element bauen, den gedrückten Knopf finden.
 * Die Bausteine, die daraus entstehen — Knopf, Panel, Kachel, Zeile —,
 * stehen in `widgets.ts`.
 */

/**
 * Ein Element mit Klasse und Text. **`textContent` und nie `innerHTML`**:
 * Hier gehen Raumnamen und Spielernamen durch, und die hat sich niemand
 * ausgesucht.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text = '',
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/**
 * **Der Knopf, auf den ein Klick ging** — der nächste `<button>` über dem
 * Ziel, damit ein Tipp auf die kleine Zeile im Knopf denselben Knopf meint
 * wie ein Tipp auf den Namen. `null`, wenn kein Knopf getroffen wurde.
 */
export function clickedKey(event: Event): HTMLButtonElement | null {
  return (event.target as HTMLElement | null)?.closest('button') ?? null;
}

/** `data-*` aus einem Objekt: `{ switchView: '2d' }` → `data-switch-view="2d"`. */
export function setData(node: HTMLElement, data: Readonly<Record<string, string>>): void {
  for (const [name, value] of Object.entries(data)) node.dataset[name] = value;
}
