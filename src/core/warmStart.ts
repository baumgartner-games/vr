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
 * fünf Signalen, die an drei Stellen im Modulrumpf steht, ist eine, die beim
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
 * ## Und fünf Gründe, es zu lassen
 *
 * Vorwärmen ist eine Freundlichkeit und kein Auftrag. Es unterbleibt, wenn
 * es jemandem zur Last fiele — oder wenn es das Falsche täte:
 *
 * - **Die Startseite ist eine Lobby** (`lobby`). Das ist die Bedingung, die
 *   einen Abend gekostet hat, und sie ist keine Frage von Bandbreite: Wer
 *   `#haunting` öffnet, trägt erst Namen und Raum-Code ein und wählt dann
 *   seinen Weg hinein. Die Welt **liest diese Wahl beim Aufbau aus dem
 *   Speicher** (`worlds/haunting/rules/lobby.ts`, `arriveAs`) — eine
 *   vorgewärmte Runde ist also eine, die mit der falschen Rolle dasteht und
 *   sich obendrein selbst schon einen Raum genommen hat (`joinTable`), bevor
 *   die Lobby ihren kennt. Genau davor warnte der Kommentar in `main.ts`
 *   schon vorher; jetzt ist es ein Signal statt einer Warnung.
 * - **Der Spieler hat selbst etwas angefordert** (`busy`). Was er wollte, hat
 *   die Leitung; was wir ihm vorschlagen, wartet. Das ist die wichtigste der
 *   fünf Bedingungen, denn sie ist die einzige, die während des Wärmens
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
 *
 * ## Und derselbe Stand sagt, was der Knopf tut
 *
 * Ganz unten steht `startButton`: ob _Beitreten_ stumpf ist, was darunter
 * steht und ob der Balken dazu läuft. Es ist dieselbe Frage von der anderen
 * Seite — wer nicht vorwärmt, hat keine Welt, auf die ein Knopf warten
 * könnte —, und deshalb steht sie hier und nicht in `main.ts`: Sonst stünde
 * die Bedingung aus fünf Signalen zum zweiten Mal da, diesmal mit anderem
 * Vorzeichen, und stimmte beim nächsten Umbau nur noch einfach.
 */

/** Die Schritte, in genau der Reihenfolge, in der sie drankommen. */
export const WARM_ORDER = ['welt', 'regal'] as const;

/** Einer der beiden Schritte. Mehr sollen es nicht werden. */
export type WarmStep = (typeof WARM_ORDER)[number];

/** So viel von der Lage braucht die Entscheidung. */
export interface WarmSignals {
  /**
   * Ob die Startseite eine **Lobby** ist (`#haunting`): erst verbinden, dann
   * die Rolle wählen, dann hinein. Dann wird gar nichts gewärmt — siehe oben.
   */
  lobby?: boolean | undefined;
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
 * **Darf überhaupt gewärmt werden?** Die fünf Bedingungen, die für jeden
 * Schritt gelten — gefragt wird vor **jedem**, denn `busy` und `hidden`
 * schlagen mitten im Wärmen um.
 */
export function mayWarm(signals: WarmSignals): boolean {
  if (signals.lobby === true) return false;
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

/**
 * **Wie es um die Standardwelt steht** — aus der Sicht des einen Knopfes, und
 * nur so genau, wie er es wissen muss.
 *
 * - `ruht` — es lädt nichts. Entweder hat noch niemand angefangen, oder es
 *   wird gar nicht vorgewärmt (Daten sparen, schmale Leitung, Tab im
 *   Hintergrund, Lobby).
 * - `lädt` — die Welt ist unterwegs: Chunk, Physik, Aufbau, und danach ihre
 *   Modelle (`core/assetGate.ts`).
 * - `dauert` — der Deckel war schneller als die Leitung. Es lädt noch, aber
 *   gewartet wird nicht mehr.
 * - `steht` — die Welt ist aufgebaut **und** ihre Startladung ist still.
 * - `fehlt` — sie kam nicht (`App.onWorldFailed`).
 */
export type WorldPhase = 'ruht' | 'lädt' | 'dauert' | 'steht' | 'fehlt';

/** Was auf der Startseite dasteht, während die Welt kommt — oder nicht kommt. */
export interface StartButton {
  /** Ob _Beitreten_ stumpf ist. */
  disabled: boolean;
  /** Die Zeile darunter (`#start-note`). Leer heißt: nichts zu sagen. */
  note: string;
  /**
   * Ob der Balken dazu **laufen** soll. Er ist nicht dasselbe wie die Zeile:
   * Ein Streifen, der läuft, behauptet eine Arbeit, und wenn gerade niemand
   * lädt, ist diese Behauptung falsch. Die Zeile darf trotzdem etwas sagen.
   */
  busy: boolean;
}

/** Was dasteht, solange die Welt kommt. Ein Satz, zwei Stellen — hier. */
export const LOADING_NOTE = 'Die Welt wird geladen …';

/**
 * **Der Knopf, aus der Lage gerechnet.** Reine Rechnung: `main.ts` führt sie
 * aus und entscheidet nichts selbst.
 *
 * Vier Überlegungen stecken darin, und die dritte ist die, die man leicht
 * falsch macht:
 *
 * 1. **Stumpf heißt „es passiert gerade etwas".** Ein Knopf, der lädt, wenn
 *    man ihn drückt, ist kein Fehler — aber einer, der erkennbar dasteht und
 *    dann drei Sekunden stumm arbeitet, ist eine Lüge. Solange die Welt
 *    unterwegs ist, sagt der Knopf das, statt es zu verschweigen.
 * 2. **Aber nie ohne Ausweg.** `dauert` und `fehlt` geben ihn wieder frei.
 *    Eine Datei, die nicht ankommt, darf keinen Knopf für den Rest der
 *    Sitzung tot machen — sie darf ihn höchstens eine Zeile kosten.
 * 3. **Wo nicht vorgewärmt wird, bleibt er bedienbar.** Das ist die
 *    Entscheidung zu `ruht`: Wer _Daten sparen_ eingeschaltet hat, auf `2g`
 *    sitzt oder den Tab im Hintergrund liegen hat, bekommt die Welt nicht
 *    ungefragt — und darf deshalb auch nicht auf sie warten müssen. Der Knopf
 *    lädt sie dann beim Druck, so wie er es immer getan hat, und die Zeile
 *    darunter sagt es vorher. Andersherum — stumpf, bis etwas lädt, das
 *    niemand lädt — wäre genau der Deadlock, den `2g` und `saveData` sich
 *    eingehandelt hätten.
 * 4. **Hinter einer Lobby gilt nichts davon.** Dort wird mit Absicht nicht
 *    vorgewärmt (die Welt nimmt sich beim Aufbau einen Raum, siehe oben), der
 *    Knopf heißt `#haunt-enter` und hat seine eigene Zeile. Hier ist dann
 *    nichts zu sagen und nichts anzuzeigen.
 */
export function startButton(signals: WarmSignals, world: WorldPhase): StartButton {
  if (signals.lobby === true) return { disabled: false, note: '', busy: false };
  switch (world) {
    case 'steht':
      return { disabled: false, note: '', busy: false };
    case 'lädt':
      return { disabled: true, note: LOADING_NOTE, busy: true };
    case 'dauert':
      return {
        disabled: false,
        note: 'Die Welt lädt noch — Beitreten geht trotzdem.',
        busy: true,
      };
    case 'fehlt':
      return {
        disabled: false,
        note: 'Die Welt kam nicht an — Beitreten versucht es noch einmal.',
        busy: false,
      };
    case 'ruht':
      // Gleich geht es los (das Vorwärmen wartet nur noch auf den Leerlauf) —
      // oder eben nie. Gefragt wird dieselbe Rechnung wie beim Wärmen selbst,
      // damit hier nicht ein zweites Mal geraten wird.
      return mayWarmStep('welt', signals)
        ? { disabled: true, note: LOADING_NOTE, busy: true }
        : { disabled: false, note: 'Die Welt wird beim Beitreten geladen.', busy: false };
  }
}
