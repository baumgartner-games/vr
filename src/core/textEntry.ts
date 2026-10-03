/**
 * Whether something in the game is currently taking typed characters.
 *
 * The keypad in VR also accepts a real keyboard, which is how anybody tries a
 * setting out at a desk. Without a flag like this, typing "0.14" into the
 * pistol's power field walks the player four steps forward, because the flat
 * controls are listening to the same keys.
 */

let depth = 0;

export function beginTextEntry(): void {
  depth++;
}

export function endTextEntry(): void {
  depth = Math.max(0, depth - 1);
}

/**
 * **Und jedes Textfeld der Seite, das gerade den Fokus hat** — das Suchfeld
 * des Modellregals, des Katalogs und der Reiter, der Spitzname, der Chat.
 * Gemeldet (Oktober 2026): _„Anscheinend schließt sich das Menü wenn ich mehr
 * als 3 Buchstaben eintippe"_ — es war das `m` in `lamp`: Die Taste des Menüs
 * (`FlatControls`) fragte nur `beginTextEntry`, und das ruft kein Suchfeld.
 * Ein `r` setzte auf dieselbe Weise die Welt zurück (`PortalWorld.flatKeys`).
 * Jetzt fragt jeder, der `isTyping` fragt, auch den Fokus.
 */
export function isTyping(): boolean {
  return depth > 0 || textFieldFocused();
}

/** Felder, in die man Zeichen tippt — kein Häkchen, kein Regler, kein Knopf. */
const TEXT_TYPES = new Set(['', 'text', 'search', 'email', 'number', 'password', 'tel', 'url']);

/** Ob ein Element Zeichen annimmt. */
export function takesText(node: Element | null | undefined): boolean {
  if (!node) return false;
  const tag = node.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const input = node as HTMLInputElement;
    return (
      !input.readOnly &&
      !input.disabled &&
      TEXT_TYPES.has((input.getAttribute('type') ?? '').toLowerCase())
    );
  }
  return (node as HTMLElement).isContentEditable === true;
}

function textFieldFocused(): boolean {
  if (typeof document === 'undefined') return false;
  return takesText(document.activeElement);
}
