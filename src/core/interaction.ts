import { padSlotLabel, type PadKind, type PadSlot } from './gamepadReport';
import { grabSpec, type GrabLike, type GrabSpec } from './grabHandles';
import { defaultInputConfig, keyLabel, keysFor, padSlotsFor, type InputConfig } from './inputMap';

/**
 * **Was ein Ding will** — und womit man es in dieser Ansicht bekommt.
 *
 * In der Küche steht alles Mögliche herum, mit dem man etwas anfangen kann,
 * und bisher war das genau **eine** Auskunft: „benutzbar" (`core/usable.ts`).
 * Gedrückt wurde `A`, und `A` tat je nach Möbel etwas anderes. Das reicht,
 * solange es nur eine Taste gibt — und es reicht in dem Augenblick nicht mehr,
 * in dem dieselbe Küche in drei Ansichten gespielt wird:
 *
 * - **von oben** (`topDown`) steht die Figur irgendwo und drückt `A`;
 * - **aus den Augen** (`firstPerson`) zeigt man mit der Maus hin und klickt
 *   oder drückt `E`;
 * - **in der Brille** (`vr`) legt man die Hand auf einen Knopf oder zieht den
 *   Trigger, und was man **greifen** will, hält man mit der Greif-Taste fest.
 *
 * Ein Knopf will gedrückt werden, ein Brötchen will gegriffen werden — und das
 * ist dieselbe Aussage in allen drei Ansichten. Was sich unterscheidet, ist
 * nur, **womit** man sie ausspricht. Genau diese Trennung steht hier:
 *
 * - Die **Absicht** (`InteractionKind`) hängt am Ding und sonst nirgends. Sie
 *   ist das, was ein Mensch über das Ding sagen würde.
 * - Die **Auflösung** (`resolveInteraction`) macht daraus je Ansicht eine
 *   konkrete Bedienung: welche Geber, Tippen oder Halten, und der kurze
 *   Hinweis dazu.
 * - Die **Ausnahme** (`InteractionSpec.views`) erlaubt einem einzelnen Ding,
 *   in einer einzelnen Ansicht abzuweichen — ohne dass es dafür eine neue
 *   Absicht erfinden muss.
 *
 * **Warum `hold` keine Absicht ist.** Der Auftrag sagt „im VR-Modus soll die
 * Grab-Taste gedrückt gehalten werden" — das klingt nach einer dritten Art
 * neben _drücken_ und _greifen_, ist aber keine: Gehalten wird nicht, weil das
 * Ding etwas anderes will, sondern weil ein Controller in der Hand das so am
 * besten ausdrückt. _Halten_ ist deshalb eine Eigenschaft der **Bedienung**
 * (`InteractionPress`) und keine der Absicht. Käme eines Tages ein Ding dazu,
 * das wirklich eine eigene Absicht hat — ein Schalter, der umgelegt bleibt,
 * eine Kurbel, die man dreht —, bekommt es eine eigene Zeile in
 * `INTERACTION_KINDS` und eine Begründung daneben. Vorher nicht: Eine Absicht,
 * die nirgends etwas anderes bewirkt, ist ein Wort und keine Unterscheidung.
 *
 * **Reine Rechnung**: kein three.js, kein DOM. Was hier steht, rechnet ein Test
 * nach — drei Ansichten mal zwei Absichten sind sechs Fälle, und die im
 * Headset durchzuspielen dauert eine Viertelstunde.
 */

/**
 * **Die Absicht eines Dings** — was ein Mensch darüber sagen würde.
 *
 * - `press`: Knopf, Hebel, Schalter, Tür, Ausgabetheke, Mülleimer — alles, was
 *   man **bedient**, ohne dass danach etwas in der Hand liegt.
 * - `grab`: Brötchen, Teller, Pfanne, Topf, Feuerlöscher, ein aufgehobenes
 *   Möbel — alles, was man **nimmt**.
 * - `none`: angemeldet, aber gerade ohne Angebot. Das ist kein erfundener
 *   dritter Fall, sondern ein vorhandener: Die Küche meldet ihre Möbel je Bild
 *   nach der geltenden Regel an, und die kennt den Fall „hier gibt es nichts
 *   zu tun" (`kitchenCarry.kitchenDeed`, `do: 'nothing'`). Wer `none` sagt,
 *   bekommt keinen Geber, keinen Hinweis und keinen Saum — und muss dafür
 *   nicht ab- und wieder anmelden.
 */
export type InteractionKind = 'press' | 'grab' | 'none';

/** Der Reihe nach, wie Menüs und Tests sie durchgehen. */
export const INTERACTION_KINDS: readonly InteractionKind[] = ['press', 'grab', 'none'];

/**
 * **Was gilt, wenn nichts dasteht.** Alles, was heute `addUsable` bekommt, ist
 * ein Knopf, ein Hebel, eine Tür oder eine Station — gedrückt wird es in jedem
 * Fall. `press` als Vorgabe heißt deshalb: Wer nichts angibt, bekommt genau
 * das Verhalten, das er vorher hatte.
 */
export const DEFAULT_INTERACTION: InteractionKind = 'press';

/**
 * **Die drei Ansichten**, und sie sind genau die drei, die dieses Projekt hat:
 * von oben, aus den Augen, in der Brille. Welche gerade gilt, sagt
 * `interactionView` aus den zwei Wahrheitswerten, die die Welt ohnehin führt.
 */
export type InteractionView = 'topDown' | 'firstPerson' | 'vr';

/** Der Reihe nach — für Menüs, Tabellen und Tests. */
export const INTERACTION_VIEWS: readonly InteractionView[] = ['topDown', 'firstPerson', 'vr'];

/**
 * **Womit man es sagt** — ein Geber, nicht eine Taste.
 *
 * `useButton` und `useKey` sind absichtlich **zwei** Einträge und nicht einer,
 * obwohl beide auf derselben Absicht der Belegung liegen (`PadAction`/
 * `KeyAction` `use`): Von oben spielt man mit Pad oder Glas und liest „A", am
 * Schreibtisch liegt die Hand auf der Tastatur und liest „E". Es ist derselbe
 * Draht mit zwei Aufschriften, und welche davon im Hinweis steht, ist eine
 * Frage der Ansicht.
 *
 * - `useButton`: die eingestellte **Stelle** für _Benutzen_ am Pad — ab Werk
 *   der untere Gesichtsknopf, auf dem Glas der Knopf mit dem `A` darauf
 *   (`index.html`, `#touch-a`).
 * - `useKey`: die eingestellte **Taste** für _Benutzen_ — ab Werk `E`.
 * - `pointer`: die linke Maustaste, wenn der Zeiger auf dem Ding liegt.
 * - `handTouch`: die Hand in der Brille, auf dem Ding.
 * - `aimTrigger`: der Trigger in der Brille, während der Zeigestrahl daraufliegt.
 * - `grip`: die Greif-Taste am Controller (`squeeze`), die Faust bei Handtracking.
 */
export type InteractionInput =
  'useButton' | 'useKey' | 'pointer' | 'handTouch' | 'aimTrigger' | 'grip';

/**
 * **Tippen oder Halten.**
 *
 * `tap` ist eine Flanke: einmal drücken, einmal wirken — so gehört sich das
 * für einen Knopf, und so macht es `PlayerRig.requestUse` seit jeher. `hold`
 * ist die Taste, die **liegt**: Solange sie liegt, hat man das Ding; lässt man
 * los, ist es wieder weg. Das ist der Griff in der Brille, und es ist der
 * einzige Fall, in dem der Unterschied heute etwas bewirkt.
 */
export type InteractionPress = 'tap' | 'hold';

/** Wie eine Absicht in **einer** Ansicht bedient wird. */
export interface InteractionControl {
  /** Alle Geber, die es tun — jeder für sich reicht. */
  readonly inputs: readonly InteractionInput[];
  readonly press: InteractionPress;
}

/**
 * **Die Ableitung**: aus der Absicht wird je Ansicht eine Bedienung.
 *
 * Das ist die Tabelle, die der Auftrag beschreibt, und sie steht als Tabelle
 * da und nicht als `if`-Kette — eine Zeile hier ist eine Zeile, die ein Test
 * nachliest, und eine vierte Ansicht wäre eine Spalte und kein Umbau.
 *
 * **Von oben ändert sich nichts**, und das ist Absicht: `A` (am Schreibtisch
 * `E`) tut, was es immer getan hat, für jede Absicht gleich. Dort gibt es
 * keine Hand, keinen Zeigestrahl und keine zweite Taste, an der man
 * unterscheiden könnte — und ein Brötchen, das man von oben plötzlich anders
 * nähme als bisher, wäre eine Änderung ohne Gewinn.
 */
export const INTERACTION_DEFAULTS: Readonly<
  Record<InteractionKind, Readonly<Record<InteractionView, InteractionControl>>>
> = {
  press: {
    topDown: { inputs: ['useButton', 'useKey'], press: 'tap' },
    firstPerson: { inputs: ['pointer', 'useKey'], press: 'tap' },
    vr: { inputs: ['handTouch', 'aimTrigger'], press: 'tap' },
  },
  grab: {
    topDown: { inputs: ['useButton', 'useKey'], press: 'tap' },
    firstPerson: { inputs: ['pointer', 'useKey'], press: 'tap' },
    // **Gehalten**, nicht getippt: Ein Topf, den man in der Brille durch
    // Antippen bekäme und durch Antippen wieder verlöre, klebte an der Hand,
    // bis man ihn absichtlich abschüttelt. Die Greif-Taste zu halten ist,
    // was jede Hand in diesem Projekt ohnehin tut (`worlds/portal/grabReach.ts`).
    vr: { inputs: ['grip'], press: 'hold' },
  },
  none: {
    topDown: { inputs: [], press: 'tap' },
    firstPerson: { inputs: [], press: 'tap' },
    vr: { inputs: [], press: 'tap' },
  },
};

/**
 * **Die Ausnahme eines einzelnen Dings in einer einzelnen Ansicht.**
 *
 * Alles ist freiwillig: Was nicht dasteht, kommt aus der Ableitung. So bleibt
 * die Absicht die Regel und die Abweichung die Abweichung — wer `press`
 * schreibt und in VR trotzdem gehalten haben will, schreibt eine Zeile und
 * nicht eine zweite Absicht.
 */
export interface InteractionOverride {
  readonly inputs?: readonly InteractionInput[];
  readonly press?: InteractionPress;
  /** Ein eigener Hinweis statt des abgeleiteten — für den seltenen Sonderfall. */
  readonly hint?: string;
}

/** Was an einem Ding hängt: die Absicht, und was davon abweicht. */
export interface InteractionSpec {
  readonly kind: InteractionKind;
  readonly views?: Readonly<Partial<Record<InteractionView, InteractionOverride>>>;
  /**
   * **Und wie es gegriffen werden will** (`core/grabHandles.ts`): an welchen
   * Stellen die Hand andockt, und wie weit dafür gegriffen werden darf.
   *
   * Es hängt hier und nicht in einer eigenen Anmeldung daneben, und das ist
   * die Entscheidung dieses Auftrags: Ein Ding sagt an **einer** Stelle, was
   * es will — `kind` sagt *ob* man es nimmt, `grab` sagt *wo* und *von wo
   * aus*. Ein zweites System neben diesem hätte zwangsläufig eine zweite
   * Liste, und die liefe nach der dritten Änderung auseinander.
   *
   * Freiwillig, und wer nichts angibt, bekommt die Vorgabe
   * (`grabHandles.DEFAULT_GRAB`): keine Griffe, alle drei Reichweiten — also
   * genau das Verhalten, das jedes greifbare Ding vorher hatte.
   */
  readonly grab?: GrabLike;
}

/**
 * Was ein Ding angeben darf: die nackte Absicht, wenn nichts abweicht — das
 * ist der Normalfall und soll so kurz sein, wie er ist.
 */
export type InteractionLike = InteractionKind | InteractionSpec;

/** Aus beidem eine `InteractionSpec` — fehlt sie ganz, ist es ein Knopf. */
export function interactionSpec(like: InteractionLike | null | undefined): InteractionSpec {
  if (!like) return { kind: DEFAULT_INTERACTION };
  return typeof like === 'string' ? { kind: like } : like;
}

/** Welche Absicht ein Ding hat — die Kurzform für alles, was nur den Typ will. */
export function interactionKind(like: InteractionLike | null | undefined): InteractionKind {
  return interactionSpec(like).kind;
}

/**
 * **Wie ein Ding gegriffen werden will** — die Kurzform zu `InteractionSpec.grab`.
 *
 * Steht nichts da, gilt die Vorgabe aus `core/grabHandles.ts`. Damit kommt
 * jede Stelle, die nach Griffen oder Reichweite fragt, mit einer Zeile aus und
 * muss den Fall „gar nichts angegeben" nicht selbst kennen.
 */
export function interactionGrab(like: InteractionLike | null | undefined): GrabSpec {
  return grabSpec(interactionSpec(like).grab);
}

/**
 * **Womit man es in der Brille auslöst** — die Geberliste der Ansicht `vr`,
 * ohne den Hinweistext daneben.
 *
 * Es ist `resolveInteraction(like, 'vr').inputs` und sonst nichts, nur ohne
 * den Satz: Die Hand fragt das je Bild für **jedes** angemeldete Ding in der
 * Nähe (`core/handUse.ts`, `PortalWorld.useByHand`), und eine Zeichenkette,
 * die dabei entsteht und im selben Atemzug weggeworfen wird, ist die Sorte
 * Arbeit, die man in der Brille merkt.
 */
export function vrInputs(like: InteractionLike | null | undefined): readonly InteractionInput[] {
  const spec = interactionSpec(like);
  const kind = INTERACTION_KINDS.includes(spec.kind) ? spec.kind : DEFAULT_INTERACTION;
  return spec.views?.vr?.inputs ?? INTERACTION_DEFAULTS[kind].vr.inputs;
}

/**
 * **Welche Ansicht gerade gilt.**
 *
 * Die Welt führt zwei Wahrheitswerte — `WorldContext.topDown` und
 * `renderer.xr.isPresenting` —, und jede Stelle, die daraus eine Ansicht
 * ableitete, tat es bisher selbst. Hier steht die Ableitung einmal, samt ihrer
 * Rangfolge: **Die Brille sticht.** Wer eine Sitzung im Headset hat, sieht
 * durch das Headset, ganz gleich, was der Schirm daneben noch anzeigt.
 */
export function interactionView(topDown: boolean, presenting: boolean): InteractionView {
  if (presenting) return 'vr';
  return topDown ? 'topDown' : 'firstPerson';
}

/** Was beim Auflösen an Umgebung bekannt sein darf — alles freiwillig. */
export interface InteractionContext {
  /** Die geltende Belegung (`core/inputMap.ts`); ohne Angabe die ab Werk. */
  readonly config?: InputConfig;
  /**
   * Die Marke des angeschlossenen Pads, für die Aufschrift seiner Stelle. Ohne
   * Angabe heißt der Benutzen-Knopf `A` — nicht geraten, sondern abgelesen:
   * So steht es auf dem Knopf auf dem Glas (`index.html`, `#touch-a`), und so
   * heißt er im ganzen Projekt.
   */
  readonly padKind?: PadKind;
}

/** Was nach der Auflösung feststeht — alles, was eine Welt zum Zeigen braucht. */
export interface ResolvedInteraction {
  readonly kind: InteractionKind;
  readonly view: InteractionView;
  readonly inputs: readonly InteractionInput[];
  readonly press: InteractionPress;
  /**
   * **Ob in dieser Ansicht überhaupt etwas geht.** Falsch bei `none` und
   * überall dort, wo eine Ausnahme die Geberliste leergeräumt hat — ein Ding
   * ohne Geber ist in dieser Ansicht kein Angebot, und der gelbe Saum hat
   * nichts anzukündigen.
   */
  readonly interactive: boolean;
  /** Der kurze Satz daneben: „A / E", „Linke Maustaste / E", „Greifen halten". */
  readonly hint: string;
}

/**
 * **Absicht plus Ansicht ergibt Bedienung.**
 *
 * Erst die Ableitung aus `INTERACTION_DEFAULTS`, dann die Ausnahme darüber —
 * und zwar Feld für Feld: Wer nur `press` abweichen lässt, behält die Geber
 * der Ableitung, und wer nur die Geber tauscht, behält Tippen oder Halten.
 */
export function resolveInteraction(
  like: InteractionLike | null | undefined,
  view: InteractionView,
  ctx: InteractionContext = {},
): ResolvedInteraction {
  const spec = interactionSpec(like);
  const kind = INTERACTION_KINDS.includes(spec.kind) ? spec.kind : DEFAULT_INTERACTION;
  const base = INTERACTION_DEFAULTS[kind][view];
  const override = spec.views?.[view];

  const inputs = override?.inputs ?? base.inputs;
  const press = override?.press ?? base.press;
  const interactive = kind !== 'none' && inputs.length > 0;
  const hint = override?.hint ?? (interactive ? buildHint(inputs, press, ctx) : '');

  return { kind, view, inputs, press, interactive, hint };
}

/**
 * Wie der Benutzen-Knopf heißt, solange keine Pad-Marke bekannt ist: `A`. Das
 * ist keine geratene Xbox-Aufschrift, sondern die Aufschrift des Knopfes auf
 * dem Glas (`index.html`, `#touch-a`) — und der ist von oben der
 * wahrscheinlichste Geber überhaupt. Wer die Marke kennt, bekommt ihre eigene
 * Aufschrift (`padSlotLabel`), denn auf einer PlayStation steht dort `✕`.
 */
const GLASS_USE_LABEL = 'A';

/** Die Belegung ab Werk — für alle, die keine mitgeben. */
const DEFAULT_CONFIG: InputConfig = defaultInputConfig();

/**
 * **Die Aufschrift eines Gebers**, so wie sie im Hinweis steht.
 *
 * Die beiden Benutzen-Geber fragen die **eingestellte** Belegung und nicht
 * eine Tabelle: Wer _Benutzen_ im Menü auf `F` legt, liest danach auch `F`.
 * Die vier anderen sind keine Belegung, sondern Geräte — eine Maus hat eine
 * linke Taste, ein Controller einen Trigger und einen Griff, und daran stellt
 * niemand etwas ein.
 */
export function inputLabel(input: InteractionInput, ctx: InteractionContext = {}): string {
  const config = ctx.config ?? DEFAULT_CONFIG;
  switch (input) {
    case 'useButton': {
      const slot: PadSlot | undefined = padSlotsFor(config, 'use')[0];
      if (!slot) return 'kein Knopf';
      return ctx.padKind ? padSlotLabel(slot, ctx.padKind) : GLASS_USE_LABEL;
    }
    case 'useKey': {
      const code = keysFor(config, 'use')[0];
      return code ? keyLabel(code) : 'keine Taste';
    }
    case 'pointer':
      return 'Linke Maustaste';
    case 'handTouch':
      return 'Berühren';
    case 'aimTrigger':
      return 'Trigger';
    case 'grip':
      return 'Greifen';
  }
}

/**
 * **Der Hinweis** — die Geber mit „ / " dazwischen, und beim Halten ein Wort
 * dahinter.
 *
 * Er ist kurz gehalten, weil er neben etwas steht, das man ohnehin schon
 * ansieht. Was ein Druck **bewirkt** („Tomate nehmen"), sagt weiter das Ding
 * selbst (`core/usable.Usable.usePrompt`); hier steht nur, **womit**. Beides
 * zusammen ergibt den Satz, den eine Welt anzeigen kann — aber getrennt
 * gehalten, denn die eine Hälfte hängt am Gericht und die andere am Gerät.
 */
function buildHint(
  inputs: readonly InteractionInput[],
  press: InteractionPress,
  ctx: InteractionContext,
): string {
  const parts = inputs.map((input) => inputLabel(input, ctx)).filter((part) => part.length > 0);
  if (parts.length === 0) return '';
  const joined = parts.join(' / ');
  return press === 'hold' ? `${joined} halten` : joined;
}

/**
 * **Der Hinweis zu einem Ding in einer Ansicht** — die Kurzform für Welten,
 * die nichts weiter von der Auflösung brauchen.
 */
export function interactionHint(
  like: InteractionLike | null | undefined,
  view: InteractionView,
  ctx: InteractionContext = {},
): string {
  return resolveInteraction(like, view, ctx).hint;
}
