import { padSlotIcon, type PadKind } from './gamepadReport';
import { keyLabel, keysFor, padSlotsFor, type InputConfig } from './inputMap';
import type { HintDevice, HintItem } from './controlHints';

/**
 * **Die Willkommens-Einblendung** — beim ersten Betreten einer Welt eine kurze
 * Karte: wie sie heißt, was man hier tut, und die zwei, drei Knöpfe, die man
 * dafür braucht.
 *
 * Gewünscht war, dass die ersten Sekunden in einer Welt nicht mit Raten
 * anfangen. Bis dahin sagte jede Welt ihren Satz über `ctx.notify` — und der
 * landete am Handgelenk-Menü, also am Schirm nirgends. Die Karte steht deshalb
 * im Bild, **einmal je Welt** (gemerkt im Browser), und lässt sich ganz
 * abschalten (_Menü → Steuerung & Hilfe → Eingaben → Willkommen je Welt_).
 *
 * Die Knöpfe kommen aus **derselben Belegung** wie die Tastenhilfe
 * (`core/controlHints.ts`): Wer _Benutzen_ auf `F` gelegt hat, liest `F`, und
 * wer ein PlayStation-Pad hält, `✕`. Eine Karte, die `E` sagt, während unten
 * in der Zeile `F` steht, wäre schlimmer als keine.
 *
 * Reine Rechnung, kein DOM — gezeichnet wird in `ui/WorldWelcome.ts`.
 */

/** Was ein Tipp auf der Karte meint — einer der Knöpfe des Schemas. */
export type IntroAction = 'move' | 'use' | 'jump' | 'tools' | 'view' | 'menu';

export interface IntroTip {
  readonly action: IntroAction;
  readonly label: string;
}

export interface WorldIntro {
  /** Die Zeile unter dem Namen: was man hier tut. */
  readonly goal: string;
  /** Der eine Schritt, mit dem es losgeht — oder nichts. */
  readonly first?: string;
  /** Die Knöpfe, die man dafür braucht, in dieser Reihenfolge. */
  readonly tips: readonly IntroTip[];
}

/**
 * **Die Texte je Welt.** Kurz mit Absicht: Die Karte ist ein Gruß und keine
 * Anleitung; wer mehr wissen will, findet es an den Schildern in der Welt.
 *
 * Eine Welt, die hier fehlt, bekommt keine Karte — eine neue Welt ist deshalb
 * nicht kaputt, sie ist nur still, bis jemand ihre Zeile schreibt.
 */
export const WORLD_INTROS: Readonly<Record<string, WorldIntro>> = {
  hub: {
    goal: 'Die Lobby: Jedes Tor führt in ein Spiel.',
    first: 'Geh durch ein Tor — oder wähle die Welt im Menü unter Spielen.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'menu', label: 'Menü' },
    ],
  },
  plateup: {
    goal: 'Bediene die Gäste: Brötchen, Patty vom Grill, Salat vom Brett — auf einen Teller und an den Tisch.',
    first: 'Die Glocke an der Durchreiche startet den Tag.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'use', label: 'Nehmen & Benutzen' },
      { action: 'menu', label: 'Menü' },
    ],
  },
  haunting: {
    goal: 'Eine Raumstation, eine Quest: reparieren, Codes tauschen, das Radar im Blick.',
    first: 'Am Terminal der Einsatzzentrale wählst du Übungsrunde oder echte Runde.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'use', label: 'Benutzen' },
      { action: 'menu', label: 'Menü' },
    ],
  },
  editor: {
    goal: 'Baue ein Level, während du darin stehst.',
    first: 'Karte und Palette hängen am Gürtel — greifen holt sie heraus.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'use', label: 'Benutzen' },
      { action: 'menu', label: 'Menü' },
    ],
  },
  sandbox: {
    goal: 'Der Sandkasten: neun Zonen auf einem Gelände — Türen, Effekte, Küche, Schießstand, Kartbahn, Kletterwand.',
    first: 'Norden Effekte und Küche, Osten Schießstand, Süden Gokart.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'use', label: 'Benutzen' },
      { action: 'tools', label: 'Werkzeug' },
      { action: 'menu', label: 'Menü' },
    ],
  },
  'test-navigation': {
    goal: 'Prüfstände der Wegsuche: Ein NPC läuft vom grünen Start zum blauen Ziel, sein Weg steht als Linie am Boden.',
    first: 'Der rote Knopf vor jeder Kammer startet ihren Test.',
    tips: [
      { action: 'move', label: 'Gehen' },
      { action: 'use', label: 'Knopf drücken' },
      { action: 'menu', label: 'Menü' },
    ],
  },
};

/** Die Karte zu einer Welt — `null`, wenn sie keine hat. */
export function worldIntro(id: string): WorldIntro | null {
  return WORLD_INTROS[id] ?? null;
}

/** Was die Knöpfe gerade sind: dasselbe, was die Tastenhilfe weiß. */
export interface IntroKeyContext {
  readonly device: HintDevice;
  readonly padKind: PadKind;
  readonly config: InputConfig;
}

/**
 * **Die Tipps mit ihren Knöpfen** — für das Gerät, mit dem zuletzt bedient
 * wurde. Ein Tipp ohne Knopf (nicht belegt) fällt weg, statt mit einem Strich
 * dazustehen.
 */
export function introKeys(tips: readonly IntroTip[], ctx: IntroKeyContext): HintItem[] {
  const out: HintItem[] = [];
  for (const tip of tips) {
    const key = introKey(tip.action, ctx);
    if (key) out.push({ key, label: tip.label });
  }
  return out;
}

function introKey(action: IntroAction, ctx: IntroKeyContext): string | null {
  if (ctx.device === 'touch') {
    // Am Glas steht die Bedienung auf den Knöpfen; genannt wird, wo sie sind.
    if (action === 'move') return 'Stock links';
    if (action === 'use' || action === 'jump') return 'A';
    if (action === 'menu') return '☰';
    return null;
  }
  if (ctx.device === 'pad') {
    if (action === 'move') return 'LS';
    const slot = padSlotsFor(ctx.config, action === 'jump' ? 'use' : action)[0];
    return slot ? padSlotIcon(slot, ctx.padKind) : null;
  }
  if (action === 'move') return moveKeys(ctx.config);
  const code = keysFor(ctx.config, action)[0];
  return code ? keyLabel(code) : null;
}

/** `WASD`, solange es so belegt ist — sonst die vier Tasten, wie sie liegen. */
function moveKeys(config: InputConfig): string | null {
  const four = (['forward', 'left', 'back', 'right'] as const).map(
    (action) => keysFor(config, action)[0] ?? '',
  );
  if (four.every((code) => code === '')) return null;
  if (four.every((code) => /^Key[A-Z]$/.test(code))) return four.map(keyLabel).join('');
  return four.map((code) => (code ? keyLabel(code) : '–')).join(' ');
}

// --- gemerkt: welche Welten schon begrüßt haben --------------------------------

/**
 * **Die Liste der schon begrüßten Welten, als Zeichenkette** — so steht sie im
 * Speicher. Unbekanntes und Doppeltes fällt beim Lesen weg; eine kaputte
 * Zeile heißt „noch keine", nicht „Fehler".
 */
export function parseSeen(raw: string | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!raw) return out;
  for (const one of raw.split(',')) {
    const id = one.trim();
    if (/^[a-z0-9_-]{1,40}$/.test(id)) out.add(id);
  }
  return out;
}

export function formatSeen(seen: ReadonlySet<string>): string {
  return [...seen].sort().join(',');
}

/** Was die Karte zu entscheiden hat, in einem Bild. */
export interface IntroGate {
  /** Die Welt, in der man gerade steht — leer: keine. */
  readonly world: string;
  /** Sieht man die Welt gerade (keine Startseite, keine Brille, kein Menü)? */
  readonly visible: boolean;
  /** Ist die Einblendung überhaupt an? */
  readonly enabled: boolean;
  /** Welche Welten schon begrüßt haben. */
  readonly seen: ReadonlySet<string>;
}

/**
 * **Ob jetzt die Karte kommt.** Nur wenn man die Welt sieht — eine Karte, die
 * hinter der Startseite oder in der Brille aufginge, wäre gezeigt, ohne
 * gesehen zu sein, und danach als gesehen gemerkt.
 */
export function shouldShowIntro(gate: IntroGate): boolean {
  if (!gate.enabled || !gate.visible || !gate.world) return false;
  if (gate.seen.has(gate.world)) return false;
  return worldIntro(gate.world) !== null;
}
