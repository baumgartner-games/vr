/**
 * Der Chat — die einzige Stelle, an der zwischen zwei Spielern **Text** fließt.
 *
 * Gebraucht wird er nicht zum Plaudern. Wer in der Brille steht, misst dort ein
 * Werkzeug ein und hat am Ende einen Konfig-Code, den er auf dem PC bräuchte:
 * zum Aufschreiben, zum Einbauen, zum Weiterschicken. Vorlesen und abtippen
 * ist genau die Sorte Arbeit, für die es Rechner gibt — also schickt die Brille
 * die Zeile herüber, und am PC steht sie im Panel mit einem Knopf *Kopieren*
 * daneben.
 *
 * Deshalb hat ein Eintrag eine **Sorte**: `text` ist, was jemand getippt hat,
 * `code` ist eine Zeile, die eine Maschine geschrieben hat und die eine andere
 * wieder lesen kann. Der Eingaberaum trägt Konfig-Codes als `code` ein und
 * wendet nur diese an — was jemand von Hand schreibt, wird nie ausgeführt,
 * auch wenn es zufällig wie ein Code aussieht.
 *
 * Ohne three.js und ohne DOM, damit die beiden Dinge, bei denen man sich
 * vertut, einzeln geprüft werden können: dass fremder Text **geputzt** wird,
 * bevor er irgendwo landet, und dass der Verlauf nicht unbegrenzt wächst.
 */

/** Getippt, oder von einer Maschine geschrieben und wieder lesbar. */
export type ChatKind = 'text' | 'code';

export interface ChatEntry {
  /** Laufende Nummer, nur damit eine Liste einen Schlüssel hat. */
  id: number;
  /** Peer-Id des Absenders — leer, wenn man selbst geschrieben hat. */
  from: string;
  name: string;
  text: string;
  kind: ChatKind;
  /** Wofür ein Code gilt, z. B. „Taschenlampe · Rechte Hand". */
  note?: string;
  /** Wann er hier ankam, nach der **eigenen** Uhr (`Date.now()`). */
  at: number;
  mine: boolean;
}

/** Wie viele Zeilen der Verlauf hält, bevor vorn eine herausfällt. */
export const CHAT_LIMIT = 200;

/**
 * Wie lang eine Zeile höchstens ist.
 *
 * Großzügig, weil der ganze Ausrüstungs-Code hier durchpasst — der ist knapp
 * neunzig Zeichen, und wer die Portalwelt vollgestellt hat, kommt weiter. Eine
 * Grenze gibt es trotzdem: was über das Netz kommt, hat sich niemand
 * ausgesucht, und ein Megabyte Text in einer Menüzeile ist kein Chat mehr.
 */
export const CHAT_MAX_CHARS = 2000;

/**
 * Was hereinkommt, in einer Form, die man anzeigen darf.
 *
 * Steuerzeichen fliegen raus (ein `\r` mitten in einer Zeile verschiebt auf
 * manchen Anzeigen den halben Rest, und ein Nullbyte hat in nichts etwas zu
 * suchen), Zeilenumbrüche werden zu Leerzeichen — ein Chat-Eintrag ist eine
 * Zeile —, mehrfacher Weißraum wird einer, und am Ende wird abgeschnitten.
 * Alles andere bleibt: Umlaute, Emoji und die Zeichen eines Konfig-Codes.
 */
export function cleanChatText(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, CHAT_MAX_CHARS);
}

/** Dasselbe für den Namen daneben — kürzer, weil er in eine Zeile muss. */
export function cleanChatName(raw: unknown, fallback = 'Mitspieler'): string {
  const name = cleanChatText(raw).slice(0, 40);
  return name || fallback;
}

/**
 * Der Verlauf: eine Liste, die vorn ausfranst.
 *
 * Sie gehört der App und nicht einer Welt — ein Weltwechsel ist kein Grund,
 * eine Zeile zu verlieren, und wer sich verbindet, während er schon spielt,
 * hat oft genau deshalb etwas mitzuteilen.
 */
export class ChatLog {
  private readonly items: ChatEntry[] = [];
  private counter = 0;
  private listeners: Array<(entry: ChatEntry | null) => void> = [];

  constructor(private readonly limit = CHAT_LIMIT) {}

  get entries(): readonly ChatEntry[] {
    return this.items;
  }

  get size(): number {
    return this.items.length;
  }

  /** Die letzten `count` Zeilen, älteste zuerst. */
  latest(count: number): ChatEntry[] {
    return this.items.slice(Math.max(0, this.items.length - count));
  }

  /**
   * Trägt eine Zeile ein — geputzt, nummeriert und mit Zeitstempel.
   *
   * @returns der Eintrag, oder `null`, wenn nach dem Putzen nichts übrig war.
   *          Eine leere Zeile ist kein Grund für einen Eintrag und erst recht
   *          keiner für ein Paket.
   */
  add(input: {
    from?: string;
    name?: unknown;
    text: unknown;
    kind?: ChatKind;
    note?: unknown;
    at?: number;
    mine?: boolean;
  }): ChatEntry | null {
    const text = cleanChatText(input.text);
    if (!text) return null;
    const note = cleanChatText(input.note).slice(0, 80);
    const entry: ChatEntry = {
      id: ++this.counter,
      from: input.from ?? '',
      name: cleanChatName(input.name, input.mine ? 'Ich' : 'Mitspieler'),
      text,
      kind: input.kind === 'code' ? 'code' : 'text',
      at: input.at ?? Date.now(),
      mine: input.mine ?? false,
    };
    if (note) entry.note = note;
    this.items.push(entry);
    while (this.items.length > this.limit) this.items.shift();
    this.emit(entry);
    return entry;
  }

  clear(): void {
    if (!this.items.length) return;
    this.items.length = 0;
    this.emit(null);
  }

  /** @returns das Abmelden — die Panels kommen und gehen, der Verlauf bleibt. */
  onChange(listener: (entry: ChatEntry | null) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((other) => other !== listener);
    };
  }

  private emit(entry: ChatEntry | null): void {
    for (const listener of [...this.listeners]) listener(entry);
  }
}

/** `14:07` — mehr Uhr braucht eine Zeile nicht, die von heute ist. */
export function formatChatTime(at: number): string {
  const date = new Date(at);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Der ganze Verlauf als Text, zum Kopieren in einem Stück.
 *
 * Das Format ist bewusst schlicht — `14:07 Name: Text` —, weil es in einer
 * E-Mail, einem Chatfenster und einem Editor gleich aussehen soll. Wofür ein
 * Code gilt, steht in Klammern dahinter, sonst ist eine Zeile aus 24 Zeichen
 * später niemandem mehr zuzuordnen.
 */
export function chatTranscript(entries: readonly ChatEntry[]): string {
  return entries.map(chatLine).join('\n');
}

/** Eine Zeile daraus — auch einzeln zu haben, für den Knopf am Eintrag. */
export function chatLine(entry: ChatEntry): string {
  const note = entry.note ? ` (${entry.note})` : '';
  return `${formatChatTime(entry.at)} ${entry.name}${note}: ${entry.text}`;
}
