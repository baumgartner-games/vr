/**
 * **Eine Handhaltung über die Leitung** — was der Poseraum sendet und was die
 * Werkzeugseite daraus baut.
 *
 * Der Konfig-Code kann alles, was gespeichert wird, und er ist genau deshalb
 * das falsche Werkzeug für ein Bild: er trägt die Haltung im **Griffraum**, und
 * ein Zuschauer im Browser hat keinen Griff, keine Zielkorrektur und keinen
 * Speicher, gegen den er das verrechnen könnte. Er müsste die halbe Kette aus
 * `handGrip.ts` nachbauen, um eine Hand hinzustellen — und stünde sie dann
 * einen Grad anders als in der Brille, wüsste niemand, welche der beiden
 * stimmt.
 *
 * Also wird **beides** geschickt und nichts davon nachgerechnet:
 *
 * - `at`, `curls` und `spread` sind das **Bild**: wo die Hand am Werkzeug
 *   liegt, in dessen eigenem Raum, so wie sie gerade gezeichnet wird. Die
 *   Werkzeugseite baut das Werkzeug, hängt die Hand hinein, fertig.
 * - `code` ist der **Zettel**: derselbe Kurzcode, der auf der Tafel im
 *   Eingaberaum steht. Er wird drüben nicht gelesen, sondern kopiert.
 *
 * Ein Weg für das Bild und einer für die Zahlen, und beide kommen aus derselben
 * Messung — was am Ende irgendwo eingetragen wird, ist die Zeile, die man auch
 * gesehen hat.
 *
 * Ohne three.js: was über eine Leitung geht, ist eine Handvoll Zahlen, und ob
 * die richtig ankommen, prüft man ohne Renderer.
 */

import { HAND_JOINT_VALUES } from '../../core/handPose';
import type { Handedness } from '../../core/XRInput';

/**
 * Der Kanal, auf dem das läuft (`NetSession.emit`).
 *
 * Ein Welt-Kanal und keine neue Nachrichtenart: die Sitzung trägt beliebige
 * Ereignisse, und die Werkzeugseite hängt sich an denselben Kanal wie ein
 * Mitspieler. Kurz, weil Trystero seine Namensräume knapp hält.
 */
export const HAND_SHARE_CHANNEL = 'hpose';

/** Was von einer geteilten Handhaltung ankommt. */
export interface HandShare {
  /** Welche Hand gezeigt wird — die **ohne** Controller. */
  hand: Handedness;
  /** Das Werkzeug im Schwebekasten, oder `null` für die blanke Hand. */
  toolId: string | null;
  /**
   * Wo die Hand daran liegt, im Raum des Werkzeugs: x, y, z in Zentimetern,
   * dann Pitch, Yaw und Roll in Grad — dieselbe Schreibweise wie jede Pose
   * hier. Ohne Werkzeug steht die Hand einfach im Nullpunkt.
   */
  at: readonly number[];
  /** Krümmung je Finger, 0 gestreckt bis 1 geschlossen. Immer fünf. */
  curls: readonly number[];
  /** Wie weit die Finger fächern, in Grad. */
  spread: number;
  /**
   * **Jede Kugel einzeln** — zwanzig Winkel, wenn drüben eine blanke Hand
   * gemessen wird (`core/handPose.ts`, `HandPose.joints`), sonst `null`.
   *
   * Die Krümmungen daneben bleiben, wo sie sind: sie sind die Zusammenfassung,
   * die auf jeder Tafel steht und in jeden Kurzcode geht, und ein Zuschauer,
   * der die zwanzig nicht auswerten will, zeigt weiter dieselbe Hand. Wer sie
   * auswertet, sieht die Finger gespreizt und an jedem Gelenk einzeln geknickt
   * — also das, was in der Brille wirklich steht.
   */
  joints: readonly number[] | null;
  /** Der Konfig-Code für genau diese Haltung — zum Kopieren, nicht zum Rechnen. */
  code: string;
  /** Ob der Trigger sie eben festgehalten hat. Nur dann ist sie gespeichert. */
  saved: boolean;
}

/**
 * Dieselben Daten, so knapp, wie sie über die Leitung gehen sollen.
 *
 * Zahlen werden auf zwei Stellen gerundet: eine Handhaltung wird ohnehin auf
 * Zehntelzentimeter und ganze Grad gespeichert, und zwanzig Nachkommastellen
 * aus einer Quaternion-Rechnung sind reine Leitungslast.
 */
export function packHandShare(share: HandShare): Record<string, unknown> {
  return {
    h: share.hand === 'left' ? 'l' : 'r',
    t: share.toolId ?? '',
    a: [...share.at].slice(0, 6).map(round),
    c: [...share.curls].slice(0, 5).map(round),
    s: round(share.spread),
    // Nur, wenn es sie gibt: zwanzig Nullen zu schicken hieße „flach
    // ausgestreckt" und nicht „nicht gemessen".
    ...(share.joints?.length === HAND_JOINT_VALUES
      ? { j: [...share.joints].map(round) }
      : undefined),
    k: share.code,
    v: share.saved ? 1 : 0,
  };
}

/**
 * Und zurück — oder `null`, wenn das nichts von uns ist.
 *
 * Alles, was hier hereinkommt, hat ein fremder Rechner geschrieben; geprüft
 * wird deshalb jedes Feld einzeln, statt einem Objekt zu glauben, das die
 * richtigen Buchstaben trägt.
 */
export function parseHandShare(data: unknown): HandShare | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const raw = data as Record<string, unknown>;
  const at = numbers(raw['a'], 6);
  const curls = numbers(raw['c'], 5);
  if (!at || !curls) return null;
  const code = typeof raw['k'] === 'string' ? raw['k'] : '';
  // Ein Code ist kurz; alles darüber ist keiner, sondern etwas anderes.
  if (code.length > 240) return null;
  const toolId = typeof raw['t'] === 'string' ? raw['t'] : '';
  if (toolId.length > 40) return null;
  return {
    hand: raw['h'] === 'l' ? 'left' : 'right',
    toolId: toolId || null,
    at,
    curls: curls.map((value) => Math.min(1, Math.max(0, value))),
    spread: Number.isFinite(raw['s']) ? (raw['s'] as number) : 0,
    // Ganz oder gar nicht: eine halbe Gelenkreihe ist keine Messung. Und ein
    // Sender, der sie nicht kennt, ist keiner mit kaputten Daten — er ist
    // einer, der nur die Krümmungen schickt.
    joints: numbers(raw['j'], HAND_JOINT_VALUES),
    code,
    saved: raw['v'] === 1 || raw['v'] === true,
  };
}

function numbers(value: unknown, count: number): number[] | null {
  if (!Array.isArray(value) || value.length !== count) return null;
  const out: number[] = [];
  for (const entry of value) {
    if (typeof entry !== 'number' || !Number.isFinite(entry)) return null;
    out.push(entry);
  }
  return out;
}

function round(value: number): number {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : 0;
}
