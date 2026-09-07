/**
 * **Die Tastatur des Geräts** — die der Quest, wenn es eine gibt.
 *
 * In der Brille gibt es zwei Arten, Text einzugeben, und beide haben ihren
 * Platz:
 *
 * - Die **Bordtastatur** (`ui/KeyPanel.ts`): eine Tafel mit Tasten, auf die
 *   man zeigt. Sie funktioniert überall — am Schreibtisch, auf dem Telefon, in
 *   jeder Brille — und sie ist genau deshalb da, wo sie ist.
 * - Die **Systemtastatur**: Der Meta-Quest-Browser blendet seine eigene
 *   Tastatur ein, sobald in einer laufenden WebXR-Sitzung ein Eingabefeld des
 *   Dokuments den Fokus bekommt. Sie kann Wortvorschläge, Umlaute, Diktat und
 *   die gekoppelte Bluetooth-Tastatur — alles Dinge, die eine selbstgemalte
 *   Tafel nie können wird.
 *
 * Hier steht die Brücke zur zweiten: ein unsichtbares Feld im Dokument, das
 * den Fokus bekommt und dessen Inhalt weitergereicht wird. Drei Dinge sind
 * daran wichtig genug, um sie aufzuschreiben:
 *
 * - **Die Bordtastafel bleibt trotzdem stehen.** Ob die Systemtastatur wirklich
 *   aufgeht, kann kein Programm zuverlässig erfahren — es gibt kein Ereignis
 *   dafür. Also wird sie nur *angeboten*: Die Tafel im Raum zeigt weiter, was
 *   dasteht, und ihre Tasten tun weiter, was sie tun. Geht die Systemtastatur
 *   nicht auf, hat niemand etwas verloren.
 * - **Am Schreibtisch bleibt sie aus.** Dort ist die richtige Tastatur
 *   ohnehin da, und ein Feld im Dokument, das den Fokus hält, würde jeden
 *   Tastendruck doppelt zustellen.
 * - **Abgeschickt wird nicht hier.** Das Feld nimmt Zeichen entgegen, mehr
 *   nicht; ob der Text gilt, entscheidet weiter die Tafel mit ihrem OK. Sonst
 *   hätte dieselbe Eingabe zwei Besitzer, und der eine schlösse sie, während
 *   der andere noch tippt.
 */

export type KeyboardMode = 'auto' | 'system' | 'panel';

export const KEYBOARD_MODES: readonly KeyboardMode[] = ['auto', 'system', 'panel'];

export const KEYBOARD_MODE_LABELS: Record<KeyboardMode, string> = {
  auto: 'automatisch',
  system: 'Systemtastatur',
  panel: 'Bordtastatur',
};

export const KEYBOARD_MODE_SUBS: Record<KeyboardMode, string> = {
  auto: 'In der Brille die des Geräts, am Schreibtisch die eigene',
  system: 'Immer die Tastatur des Geräts anfordern',
  panel: 'Immer die Tafel mit den Tasten im Raum',
};

const MODE_KEY = 'bgvr.keyboard';

/**
 * Geräte, deren Browser bei einem fokussierten Feld eine Tastatur einblenden,
 * *während* eine WebXR-Sitzung läuft.
 *
 * Eine Liste von Namen und keine Fähigkeitsabfrage, weil es keine gibt: Es
 * existiert kein `navigator.canShowKeyboard`. Steht ein Gerät nicht darin,
 * bleibt es bei der Bordtastatur — und wer es besser weiß, stellt im Menü auf
 * *Systemtastatur*.
 */
export function supportsSystemKeyboard(userAgent?: string): boolean {
  const ua = userAgent ?? globalThis.navigator?.userAgent ?? '';
  return /OculusBrowser|Quest|Wolvic|Pico|VisionOS|Vive/i.test(ua);
}

export function clampKeyboardMode(value: unknown): KeyboardMode {
  return KEYBOARD_MODES.includes(value as KeyboardMode) ? (value as KeyboardMode) : 'auto';
}

export function keyboardMode(): KeyboardMode {
  try {
    return clampKeyboardMode(globalThis.localStorage?.getItem(MODE_KEY));
  } catch {
    return 'auto';
  }
}

export function saveKeyboardMode(mode: KeyboardMode): KeyboardMode {
  const clamped = clampKeyboardMode(mode);
  try {
    globalThis.localStorage?.setItem(MODE_KEY, clamped);
  } catch {
    /* privater Modus; dann gilt sie eben nur für diese Sitzung */
  }
  return clamped;
}

export function nextKeyboardMode(mode: KeyboardMode): KeyboardMode {
  const at = KEYBOARD_MODES.indexOf(clampKeyboardMode(mode));
  return KEYBOARD_MODES[(at + 1) % KEYBOARD_MODES.length]!;
}

/** Läuft gerade eine Sitzung in der Brille? `core/App.ts` sagt es hier an. */
let immersive = false;

export function setImmersive(on: boolean): void {
  immersive = on;
}

export function isImmersive(): boolean {
  return immersive;
}

/**
 * Ob für diese Eingabe die Systemtastatur angefordert wird.
 *
 * Rein rechnerisch und deshalb geprüft: Die drei Einstellungen mal „in der
 * Brille" mal „auf so einem Gerät" sind genau die Tabelle, in der man sich
 * sonst vertut.
 */
export function useSystemKeyboard(
  options: { mode?: KeyboardMode; immersive?: boolean; userAgent?: string } = {},
): boolean {
  const mode = clampKeyboardMode(options.mode ?? keyboardMode());
  if (mode === 'panel') return false;
  if (mode === 'system') return true;
  return (options.immersive ?? immersive) && supportsSystemKeyboard(options.userAgent);
}

export interface SystemInputRequest {
  value: string;
  /** Mehrzeilig: ein Schild trägt Absätze, ein Raumcode nicht. */
  multiline?: boolean;
  /** Beschriftung des Feldes — manche Tastaturen zeigen sie an. */
  label?: string;
  /** Jeder Tastendruck, damit die Tafel im Raum mitschreibt. */
  onChange(text: string): void;
  /** Eingabetaste im einzeiligen Feld. */
  onCommit(text: string): void;
  /** Escape. */
  onCancel(): void;
  /** Die Tastatur ist weg — die Tafel sagt dann, wie man sie zurückholt. */
  onBlur?(): void;
}

export interface SystemInput {
  /** Text von außen: Wer auf der Tafel tippt, tippt auch hier hinein. */
  setValue(text: string): void;
  /** Fokus (zurück-)holen — genau das lässt die Tastatur aufgehen. */
  focus(): void;
  close(): void;
}

/**
 * Hängt ein Feld ins Dokument und holt ihm den Fokus.
 *
 * `null` heißt: Hier gibt es kein Dokument (ein Test, ein Arbeiter-Thread) —
 * dann bleibt es bei der Bordtastatur, und niemand merkt etwas davon.
 */
export function openSystemInput(request: SystemInputRequest): SystemInput | null {
  if (typeof document === 'undefined' || !document.body) return null;

  const field = document.createElement(request.multiline ? 'textarea' : 'input');
  field.value = request.value;
  field.setAttribute('aria-label', request.label ?? 'Texteingabe');
  field.autocapitalize = 'sentences';
  field.spellcheck = false;
  if (field instanceof HTMLInputElement) field.type = 'text';
  // Klein, unten, halbdurchsichtig: In der Brille ist das Dokument ohnehin
  // nicht zu sehen; am Schreibtisch soll man merken, wohin die Zeichen gehen,
  // ohne dass es die Sicht verstellt.
  field.style.cssText = [
    'position:fixed',
    'left:50%',
    'bottom:12px',
    'transform:translateX(-50%)',
    'width:min(520px, 80vw)',
    request.multiline ? 'height:88px' : 'height:38px',
    'z-index:40',
    'border-radius:10px',
    'border:1px solid rgba(140,180,255,0.5)',
    'background:rgba(9,14,26,0.9)',
    'color:#e7eeff',
    'font:400 15px system-ui, sans-serif',
    'padding:8px 12px',
    'resize:none',
    'opacity:0.85',
  ].join(';');

  let closed = false;
  const onInput = (): void => request.onChange(field.value);
  // `Event` und nicht `KeyboardEvent`: Das Feld ist mal ein `input` und mal ein
  // `textarea`, und für diese Vereinigung kennt TypeScript nur die allgemeine
  // Fassung von `addEventListener`.
  const onKeyDown = (raw: Event): void => {
    const event = raw as KeyboardEvent;
    if (event.key === 'Escape') {
      event.preventDefault();
      request.onCancel();
      return;
    }
    if (event.key === 'Enter' && !request.multiline) {
      event.preventDefault();
      request.onCommit(field.value);
    }
    // Alles andere landet im Feld und kommt über `input` zurück. Hier wird
    // bewusst nichts weitergereicht: Die Tafel hört sonst denselben Anschlag
    // ein zweites Mal am Fenster ab und schriebe jedes Zeichen doppelt.
    event.stopPropagation();
  };
  const onBlur = (): void => {
    if (!closed) request.onBlur?.();
  };

  field.addEventListener('input', onInput);
  field.addEventListener('keydown', onKeyDown);
  field.addEventListener('blur', onBlur);
  document.body.appendChild(field);
  // Erst im nächsten Bild: Ein Feld, das im selben Zug entsteht und den Fokus
  // verlangt, bekommt ihn in manchen Browsern nicht.
  const focus = (): void => {
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  };
  requestAnimationFrame(focus);

  return {
    setValue: (text: string) => {
      if (field.value === text) return;
      field.value = text;
      field.setSelectionRange(text.length, text.length);
    },
    focus,
    close: () => {
      if (closed) return;
      closed = true;
      field.removeEventListener('input', onInput);
      field.removeEventListener('keydown', onKeyDown);
      field.removeEventListener('blur', onBlur);
      field.blur();
      field.remove();
    },
  };
}
