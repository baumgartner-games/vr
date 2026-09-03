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

export function isTyping(): boolean {
  return depth > 0;
}
