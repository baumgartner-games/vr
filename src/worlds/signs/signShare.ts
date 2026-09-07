import { clampSign, type SignSettings } from './signSettings';
import { MAX_SIGN_CHARS } from './signMarkup';

/**
 * **Ein Schild, wie es über das Netz geht.**
 *
 * Das ist der Punkt, an dem aus „ich stelle mir ein Schild hin" ein
 * Aushang für die Lobby wird: Wer eines aufstellt, schickt diese sieben
 * Felder, und bei allen anderen steht es an derselben Stelle mit demselben
 * Text. Es ist bewusst **wenig** — Lage, Text, Aussehen —, denn genau das
 * lässt sich in einem Paket verschicken, ohne dass irgendwer eine Physik
 * dafür rechnen müsste. Ein Schild bewegt sich nicht; es hängt.
 *
 * Zwei Regeln machen die Sache stabil, und beide stehen hier statt in der
 * Sitzung:
 *
 * - **Die höhere Fassung gewinnt** (`mergeSign`). Jede Änderung zählt eine
 *   Nummer hoch. Kommt dieselbe Nummer zweimal — und das tut sie, weil beim
 *   Betreten jeder antwortet, der das Schild kennt —, bleibt es einfach beim
 *   Vorhandenen. Ohne diese Nummer flackert ein Schild zwischen zwei
 *   Fassungen, sobald zwei Leute gleichzeitig antworten.
 * - **Was hereinkommt, wird geprüft** (`sanitizeSign`). Der Text eines anderen
 *   Spielers ist eine fremde Eingabe: zu lang, falsch typisiert oder gar nicht
 *   erst ein Objekt. Ein Schild mit einer Million Zeichen ist keine
 *   Nachricht, sondern eine stehende Bildrate.
 */

/** Lage: drei Zahlen Position, vier Zahlen Drehung. */
export type SignPose = [number, number, number, number, number, number, number];

/** Wie ein Schild steht: auf einem Pfosten oder an der Wand. */
export type SignMount = 'post' | 'wall';

export interface SharedSign {
  id: string;
  /** Zählt mit jeder Änderung hoch — die höhere Zahl gewinnt. */
  rev: number;
  pose: SignPose;
  text: string;
  settings: SignSettings;
  mount: SignMount;
}

function isFinitePose(value: unknown): value is SignPose {
  return (
    Array.isArray(value) &&
    value.length === 7 &&
    value.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
}

/**
 * Macht aus dem, was auf dem Kanal ankam, ein Schild — oder `null`.
 *
 * `null` ist hier kein Fehler, sondern die richtige Antwort auf Unsinn: Der
 * Absender ist eine andere Fassung des Spiels, ein halb übertragenes Paket
 * oder jemand, der es darauf anlegt. Wer das nicht prüft, zeichnet irgendwann
 * `undefined` in Schriftgröße NaN.
 */
export function sanitizeSign(data: unknown): SharedSign | null {
  if (!data || typeof data !== 'object') return null;
  const raw = data as Partial<SharedSign>;
  if (typeof raw.id !== 'string' || !raw.id || raw.id.length > 64) return null;
  if (!isFinitePose(raw.pose)) return null;
  const rev = typeof raw.rev === 'number' && Number.isFinite(raw.rev) ? Math.floor(raw.rev) : 0;
  const text = typeof raw.text === 'string' ? raw.text.slice(0, MAX_SIGN_CHARS) : '';
  return {
    id: raw.id,
    rev: Math.max(0, rev),
    pose: [...raw.pose] as SignPose,
    text,
    settings: clampSign(raw.settings),
    mount: raw.mount === 'wall' ? 'wall' : 'post',
  };
}

/**
 * Welche der beiden Fassungen gilt.
 *
 * Bei Gleichstand bleibt die bekannte stehen — auch das ist Absicht: Eine
 * doppelt eingetroffene Nachricht darf ein Schild nicht neu zeichnen, sonst
 * springt sein Rollstand bei jedem Begrüßen zurück an den Anfang.
 */
export function mergeSign(known: SharedSign | undefined, incoming: SharedSign): SharedSign {
  if (!known) return incoming;
  return incoming.rev > known.rev ? incoming : known;
}

/** Eine Kennung, die auch dann eindeutig ist, wenn zwei gleichzeitig aufstellen. */
export function signId(peerId: string, counter: number): string {
  return `${peerId}-${counter.toString(36)}`;
}
