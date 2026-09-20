/**
 * **Was nach dem Start nachgeladen wird — und ob überhaupt.**
 *
 * Die Seite soll _zuerst_ dastehen und _danach_ voll werden. Die Hülle
 * (`index.html`, `style.css`, das Hauptbündel) ist das Erste; alles andere —
 * die Welt mit ihrem Chunk, die Physik-Engine, ihre Modelle und Töne — ist
 * das Zweite und darf dem Ersten keine Leitung wegnehmen. Vorher stand in
 * `main.ts` ein `void app.goTo(startWorld)` mitten im Modulrumpf: Die Welt lud
 * also los, bevor irgendjemand _Beitreten_ gedrückt hatte, und zwar mit
 * derselben Dringlichkeit wie die Seite selbst. Gemessen waren das 2,6 MB, die
 * sich mit der Startseite um eine Mobilfunkleitung stritten.
 *
 * Hier steht die **Entscheidung** dazu, und nur sie: welcher Schritt als
 * Nächstes dran ist — oder keiner. Kein DOM, kein `navigator`, kein three.js;
 * wer sie anwendet, ist `main.ts`, wer sie prüft, ist `warmStart.test.ts`.
 * Der Grund ist derselbe wie bei `core/screenPads.ts`: Eine Bedingung aus
 * vier Signalen, die an drei Stellen im Modulrumpf steht, ist eine, die beim
 * nächsten Umbau an zwei Stellen stimmt.
 *
 * ## Die Reihenfolge ist die Wahrscheinlichkeit
 *
 * Gewärmt wird, was der Spieler als Nächstes anfasst, und in dieser
 * Reihenfolge — nicht, was am größten ist:
 *
 * 1. `welt` — die Standardwelt betreten lassen. Das zieht ihren Chunk, die
 *    Physik-Engine und die geteilten Modelle und Töne mit. Danach ist der
 *    erste Druck auf _Beitreten_ sofort da, und ein Start ohne Netz kommt in
 *    einer Welt heraus statt auf einer leeren Startseite.
 * 2. `regal` — der **Index** des KayKit-Regals, 31 kB gezippt. Mehr nicht:
 *    Das Regal selbst sind 57 MB in 4470 Dateien, und sein ganzer Entwurf ist,
 *    dass ein Ordner erst geladen wird, wenn jemand ihn aufklappt
 *    (`docs/agents/assetregal.md`). Wer es vorwärmte, hätte das Regal nicht
 *    schneller, sondern das Telefon voll.
 *
 * ## Und vier Gründe, es zu lassen
 *
 * Vorwärmen ist eine Freundlichkeit und kein Auftrag. Es unterbleibt, wenn
 * es jemandem zur Last fiele:
 *
 * - **Der Spieler hat selbst etwas angefordert** (`busy`). Was er wollte, hat
 *   die Leitung; was wir ihm vorschlagen, wartet. Das ist die wichtigste der
 *   vier Bedingungen, denn sie ist die einzige, die während des Wärmens
 *   umschlägt.
 * - **Der Tab liegt im Hintergrund** (`hidden`). Ein Megabyte für eine Seite,
 *   die niemand ansieht, ist einfach nur ein Megabyte.
 * - **Daten sparen** (`navigator.connection.saveData`). Wer das einschaltet,
 *   hat die Frage beantwortet, bevor wir sie stellen.
 * - **Die Leitung ist zu schmal** (`effectiveType` `2g` oder `slow-2g`). Dort
 *   dauert die Welt Minuten, und die Startseite ruckelt dabei.
 *
 * **Und ausdrücklich nicht dabei: „kein Netz".** Das stand hier einen
 * Nachmittag lang und war falsch herum gedacht — gemessen kam dabei eine
 * installierte App heraus, die ohne Netz zwar startete, aber auf der
 * Startseite stehenblieb, obwohl jedes Modell und jeder Ton im Speicher lag.
 * Ohne Netz kostet das Wärmen nichts: Der Service Worker beantwortet alles
 * aus dem Speicher, und wo er es nicht kann, scheitert die Ladung ohnehin
 * genauso still wie vorher.
 *
 * Die Netzwerk-API ist dabei **optional**: Safari kennt sie bis heute nicht,
 * und `undefined` heißt hier „keine Auskunft" und nicht „schlecht". Ohne
 * Auskunft wird gewärmt — die Alternative wäre, dass ausgerechnet iPhone und
 * iPad nie einen warmen Speicher bekommen.
 */

/** Die Schritte, in genau der Reihenfolge, in der sie drankommen. */
export const WARM_ORDER = ['welt', 'regal'] as const;

/** Einer der beiden Schritte. Mehr sollen es nicht werden. */
export type WarmStep = (typeof WARM_ORDER)[number];

/** So viel von der Lage braucht die Entscheidung. */
export interface WarmSignals {
  /** `document.hidden` — der Tab liegt im Hintergrund. */
  hidden: boolean;
  /** Ob der Spieler gerade selbst etwas angefordert hat. */
  busy: boolean;
  /** `navigator.connection.saveData`, wo es die API gibt. */
  saveData?: boolean | undefined;
  /** `navigator.connection.effectiveType`: `slow-2g`, `2g`, `3g`, `4g`. */
  effectiveType?: string | undefined;
}

/** Leitungen, auf denen nichts gewärmt wird. */
const TOO_THIN = new Set(['slow-2g', '2g']);

/**
 * **Darf überhaupt gewärmt werden?** Die vier Bedingungen, die für jeden
 * Schritt gelten — gefragt wird vor **jedem**, denn `busy` und `hidden`
 * schlagen mitten im Wärmen um.
 */
export function mayWarm(signals: WarmSignals): boolean {
  if (signals.busy || signals.hidden) return false;
  if (signals.saveData === true) return false;
  return !(signals.effectiveType !== undefined && TOO_THIN.has(signals.effectiveType));
}

/**
 * **Und dieser eine Schritt?**
 *
 * Der Unterschied liegt allein beim Regal: Sein Index ist eine Bequemlichkeit
 * für ein Menü, das die meisten nie aufklappen. Er kommt deshalb nur auf einer
 * Leitung, die das nicht merkt — `4g` oder gar keine Auskunft. Auf `3g` lohnt
 * sich die Welt noch, ein Vorrat für ein Menü nicht mehr.
 */
export function mayWarmStep(step: WarmStep, signals: WarmSignals): boolean {
  if (!mayWarm(signals)) return false;
  if (step !== 'regal') return true;
  return signals.effectiveType === undefined || signals.effectiveType === '4g';
}

/**
 * **Was als Nächstes dran ist** — oder `null`, wenn gerade nichts dran ist.
 *
 * Übersprungen wird **nicht**: Ist der erste offene Schritt nicht erlaubt,
 * kommt `null` und nicht der zweite. Die Reihenfolge ist eine Aussage darüber,
 * was wichtiger ist; wer sie umgeht, wärmt den Index eines Regals, während die
 * Welt fehlt.
 *
 * @param done    Was schon gelaufen ist (erledigt oder aufgegeben)
 * @param signals Die Lage in diesem Augenblick
 */
export function nextWarmStep(done: readonly WarmStep[], signals: WarmSignals): WarmStep | null {
  const open = WARM_ORDER.find((step) => !done.includes(step));
  if (open === undefined) return null;
  return mayWarmStep(open, signals) ? open : null;
}
