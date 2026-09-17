/**
 * **Arbeit an einer Station, die Zeit kostet** — schneiden, spülen und mixen,
 * alle drei aus derselben Rechnung. Ohne three.js, ohne Zone, ohne Bild.
 *
 * Das Schneidebrett hatte diese Uhr einmal für sich allein (sie stand in
 * `kitchenClock.ts` neben dem Herd). Dann kam die Spüle dazu, und mit ihr
 * hätte es ein zweites `advanceChop` gegeben, das bis auf zwei Namen dasselbe
 * tut — samt zweitem Balken, zweitem „nur solange jemand davorsteht" und
 * zweiter Gelegenheit, eines von beidem zu vergessen. **Also gibt es die
 * Arbeit genau einmal**, und die Station sagt nur, welcher Art sie ist
 * (`WorkKind`) und was auf ihr liegt.
 *
 * **Zwei Unterschiede bleiben, und beide sind Tabelleneinträge.** Bei
 * `WORK_TO_HAND` steht, **wohin** das Fertige geht: Was am Brett fertig wird,
 * liegt danach auf dem Brett; was in der Spüle fertig wird, liegt danach in
 * der **Hand**. Bei `WORK_ALONE` steht, **wer dabeistehen muss**: am Brett und
 * an der Spüle die Figur, im Mixer niemand. Beide stehen als Tabelle da und
 * nicht als Sonderfall irgendwo in der Zone — sonst wären es doch wieder drei
 * Rechnungen, nur mit einem gemeinsamen Namen davor.
 *
 * Der Herd bleibt draußen, und das ist kein Versehen: Er läuft weiter, **ob
 * jemand davorsteht oder nicht** — das ist der ganze Sinn des Bratens, man
 * geht ja in der Zeit etwas anderes tun. **Der Mixer tut das auch**, und er
 * bleibt trotzdem hier: Was ihn ausmacht, ist die **Stufenfolge** einer Zutat
 * (roh → geschnitten → Suppe), und die ist Wort für Wort die des Bretts
 * (`workStage`). Mit dem Herd teilt er nur die eine Zeile `WORK_ALONE` — und
 * eine Zeile ist ein schlechterer Grund für eine gemeinsame Datei als eine
 * ganze Tabelle.
 *
 * **Wer weggeht, fängt von vorn an.** Früher blieb der Fortschritt stehen und
 * lief beim Zurückkommen weiter — bequem, aber es machte aus dem Brett eine
 * Ablage, an der man im Vorbeigehen antippt: hinlegen, zwei Sekunden warten,
 * weglaufen, irgendwann wiederkommen, fertig. Arbeit, die man in Scheiben
 * schneiden kann, ist keine Entscheidung mehr, sondern Buchhaltung. Jetzt
 * bricht das Weggehen die Arbeit ab, und wer sie doch abbrechen will, zahlt
 * dafür zwei Handgriffe: **erneut aufnehmen und erneut ablegen** (`onWork`).
 * Damit steht man am Brett, weil es die Küche verlangt — und genau das ist
 * bei _Overcooked_ die Arbeit. **Der Mixer ist die Ausnahme, die man sich
 * hinstellt**: Er nimmt einem dieses Danebenstehen ab, und dafür kostet er
 * eine Sekunde mehr je Stufe (`WORK_SECONDS`).
 *
 * Die Zone gibt je Bild ihr `dt` hinein und bekommt einen neuen Zustand
 * zurück, dazu einen Anteil 0…1 für den Balken darüber. Sie merkt sich nichts
 * selbst — der Zustand ist unveränderlich und gehört an die Station.
 */

import { chopStage, fryStage, type KitchenItem } from './kitchenRecipes';

/** Welche Arbeit an einer Station getan wird. */
export type WorkKind =
  /** Am Schneidebrett: aus Rohem wird Geschnittenes. */
  | 'chop'
  /** An der Spüle: aus dreckigem Geschirr wird sauberes. */
  | 'wash'
  /**
   * **Auf der sicheren Kochstelle: dasselbe wie in der Pfanne, nur ohne das
   * Verbrennen.**
   *
   * Der Herd braucht einen Koch, der aufpasst: Nach dem Braten kommt das
   * Verbrannte und danach das Feuer (`kitchenClock.ts`) — das ist die Spannung,
   * um die es dort geht. Eine Bandstraße kann das nicht leisten: Sie legt
   * hinein und holt ab, und wenn zwischendurch niemand hinsieht, brennt
   * irgendwann die Küche. Also gibt es ein zweites Möbel, das **eine** Stufe
   * kann und dann stehen bleibt (`workStage`) — die sichere Kochstelle
   * (`kitchenGriddle.ts`).
   *
   * Sie ist damit für das Braten genau das, was der Mixer für das Schneiden
   * ist: dieselbe Arbeit, ohne jemanden davor, und dafür etwas langsamer.
   */
  | 'fry'
  /**
   * **Im Mixer: dasselbe wie am Brett, nur ohne jemanden davor.**
   *
   * Es ist ausdrücklich **dieselbe** Stufenfolge (`workStage` fragt für beide
   * `chopStage`), und daran hängt der Satz aus dem Auftrag: „Tomaten werden
   * nicht zu Tomatensuppe, sondern müssen zweimal durch den Mixer." Genau das
   * sagt `kitchenRecipes.CHOPS` schon — Tomate wird Scheibe, Scheibe wird
   * Suppe —, und eine eigene Tabelle für den Mixer wäre die, in der eines
   * Tages die Tomate in einem Zug Suppe wird und am Brett nicht.
   *
   * Der ganze Unterschied steht in `WORK_ALONE`.
   */
  | 'blend';

/**
 * **Wie lange eine Stufe dauert** — je Art, in Sekunden.
 *
 * Drei beim Schneiden statt der früheren drei Knopfdrücke: Ein Brett, an dem
 * man dreimal `A` tippt, ist ein Knopf, der die Zutat austauscht. Und drei
 * beim Spülen, weil ein Teller keine größere Arbeit ist als ein Salatkopf —
 * wäre es länger, würde niemand mehr Geschirr holen, sondern lieber warten.
 */
export const WORK_SECONDS: Readonly<Record<WorkKind, number>> = {
  chop: 3,
  wash: 3,
  // **Vier, und die eine Sekunde mehr ist der Preis für die freien Hände.**
  // Der Mixer arbeitet, während niemand danebensteht (`WORK_ALONE`) — er
  // nimmt einem also nicht Zeit ab, sondern **Anwesenheit**, und das ist in
  // dieser Küche die teurere Ware (derselbe Gedanke wie beim Band:
  // `kitchenBelt.BELT_SECONDS` ist absichtlich langsamer als Laufen). Wäre er
  // auch noch schneller als das Brett, gäbe es keinen Grund mehr, jemals ein
  // Brett zu benutzen, und ein Möbel, das ein anderes wertlos macht, ist kein
  // zweites Möbel, sondern ein Ersatz.
  blend: 4,
  // **Fünf, und dieselbe Rechnung, nur gegen den Herd.** Dort ist ein Patty
  // nach vier Sekunden gebraten (`kitchenClock.FRY_SECONDS`) — aber nur, wenn
  // jemand rechtzeitig zurückkommt, sonst verbrennt es nach weiteren vier. Die
  // sichere Kochstelle nimmt einem dieses Zurückkommen ab und kostet dafür
  // eine Sekunde mehr. Wäre sie gleich schnell, gäbe es keinen Grund mehr,
  // jemals die Pfanne zu benutzen — und die Pfanne ist das Herzstück dieser
  // Küche.
  fry: 5,
};

/**
 * **Wohin das Fertige geht** — und das ist die **einzige** Stelle, an der
 * Schneiden und Spülen auseinandergehen.
 *
 * Am **Brett** bleibt liegen, was fertig ist, und das ist richtig: Der
 * geschnittene Salat will als Nächstes auf einen Teller oder in die Pfanne,
 * und wer ihn aufnimmt, hat damit schon entschieden, wohin. Ein Brett ist eine
 * Arbeitsfläche, und auf einer Arbeitsfläche liegt das Zwischenergebnis.
 *
 * Das **Becken** ist keine. Wer abwäscht, will keinen Teller im Wasser stehen
 * haben, sondern einen sauberen in der Hand — so kam es aus dem Spieltest am
 * Handy zurück: „Ist es fertig, hat man einen sauberen Teller in der Hand."
 * Vorher war genau dieser Griff die Zumutung: Der Teller wurde sauber und
 * blieb stehen, man drückte ein zweites Mal an derselben Stelle, an der man
 * ohnehin schon stand, und bis dahin war das Becken besetzt — der nächste
 * dreckige Teller passte nicht hinein (`kitchenCarry.atSink` lehnt ab). Drei
 * Sekunden Arbeit, zwei Handgriffe Buchhaltung.
 *
 * **Eine Tabelle wie `WORK_SECONDS` und kein `if` in `advanceWork`**, obwohl
 * heute nur ein Eintrag `true` ist: Kommt eine dritte Art dazu, fragt der
 * Übersetzer nach ihrem Eintrag. Ein `if (kind === 'wash')` fragt nichts.
 */
export const WORK_TO_HAND: Readonly<Record<WorkKind, boolean>> = {
  chop: false,
  wash: true,
  // **Im Mixer bleibt liegen, was fertig ist**, und hier ist die Antwort noch
  // eindeutiger als am Brett: Niemand steht davor, dem man etwas in die Hand
  // drücken könnte. Ein Mixer, der sein Ergebnis in eine Hand gäbe, die
  // vielleicht drei Kacheln weiter ist, ist kein Möbel, sondern ein Wurf — und
  // die ganze Pipeline hängt daran, dass ein Zugband es dort **abholen** kann
  // (`kitchenBelt.beltReleases`).
  blend: false,
  // Und auf der Kochstelle genauso: Das gebratene Patty bleibt liegen, bis ein
  // Filterband es abholt.
  fry: false,
};

/**
 * **Ob diese Arbeit auch ohne jemanden davor läuft** — und das ist der
 * **einzige** Unterschied zwischen Brett und Mixer.
 *
 * Am **Brett** und an der **Spüle** ist das Danebenstehen die Arbeit: Wer
 * weggeht, hat abgebrochen (`advanceWork`), und genau das macht bei
 * _Overcooked_ aus einem Knopfdruck eine Tätigkeit. Der **Mixer** kehrt das um
 * — er ist das Möbel, das man kauft, **damit** man weggehen kann. Hineinlegen
 * ist der eine Handgriff, alles Weitere geschieht ohne einen.
 *
 * Erst damit wird eine Bandstraße möglich: Ein Zugband legt den Salatkopf
 * hinein, der Mixer schneidet ihn, das nächste Zugband holt ihn wieder heraus,
 * und in der ganzen Kette steht niemand. An einem Brett stünde die Kette
 * still, sobald der Koch sich umdreht.
 *
 * **Eine Tabelle und kein `if` in `advanceWork`**, aus demselben Grund wie bei
 * `WORK_TO_HAND`: Kommt eine vierte Art dazu, fragt der Übersetzer nach ihrem
 * Eintrag.
 */
export const WORK_ALONE: Readonly<Record<WorkKind, boolean>> = {
  chop: false,
  wash: false,
  blend: true,
  fry: true,
};

/**
 * **Was an einer Station liegt und wie weit die Arbeit daran ist.**
 *
 * `working` ist der Grund, warum aus einer Tomate nicht in einem Zug Suppe
 * wird: Ist eine Stufe fertig, steht die Uhr, und das Ergebnis liegt da. Wer
 * weiterschneiden will, nimmt es und legt es wieder hin — ein Handgriff, der
 * zeigt, dass die zweite Stufe gewollt war und nicht passiert ist.
 *
 * `kind` steht mit im Zustand und nicht nur an der Station, damit
 * `workProgress` und `advanceWork` mit einem einzigen Argument auskommen: Ein
 * Balken, der seine Dauer erst von woanders holen müsste, ist ein Balken, der
 * irgendwann die falsche bekommt.
 */
export interface WorkState {
  readonly kind: WorkKind | null;
  readonly item: KitchenItem | null;
  /** Sekunden an dieser Stufe. */
  readonly time: number;
  /** Ob gerade gearbeitet wird. */
  readonly working: boolean;
}

/** Eine Station, an der nichts liegt und nichts läuft. */
export const IDLE_WORK: WorkState = { kind: null, item: null, time: 0, working: false };

/**
 * **Was aus diesem Ding bei dieser Arbeit wird** — oder `null`, weil es dort
 * nichts zu suchen hat.
 *
 * Das Schneiden holt sich die Antwort aus der Zutatenkunde (`chopStage`), das
 * Spülen kennt genau einen Fall. Eine zweite Tabelle für den einen Fall wäre
 * eine Tabelle, die man pflegen muss; ein `if` nicht.
 */
export function workStage(kind: WorkKind, item: KitchenItem): KitchenItem | null {
  // **Mixer und Brett fragen dieselbe Tabelle**, und das ist die ganze Zusage
  // hinter „zweimal durch den Mixer": Was das Messer in zwei Stufen zerlegt,
  // zerlegt der Mixer in denselben zwei Stufen (`kitchenRecipes.CHOPS`).
  if (kind === 'chop' || kind === 'blend') return chopStage(item);
  // **Und die Kochstelle fragt die Tabelle des Herdes** (`kitchenRecipes.FRIES`)
  // — geht aber die eine Stufe nicht mit, die zum Verbrannten führt. Das ist
  // die ganze Bauart dieses Möbels, und sie steht als **eine** Zeile da:
  // weglassen statt nachbauen. Eine eigene Tabelle `{ patty: 'patty-cooked' }`
  // sähe harmloser aus und wäre die zweite Wahrheit über das Braten — käme
  // eines Tages ein Hähnchen dazu, brutzelte es in der Pfanne und läge auf der
  // Kochstelle für immer roh.
  if (kind === 'fry') {
    const done = fryStage(item);
    return done === 'patty-burnt' ? null : done;
  }
  return item === 'plate-dirty' ? 'plate' : null;
}

/**
 * **Frisch abgelegt** — und damit fängt die Arbeit sofort an.
 *
 * Kein zusätzlicher Druck auf `A`: Wer einen Salatkopf auf ein Schneidebrett
 * legt, will schneiden, und wer den dreckigen Teller in die Spüle stellt, will
 * spülen. Alles andere darf trotzdem daliegen — ein Brett ist auch eine
 * Ablage —, nur die Uhr läuft dann nicht.
 *
 * **Nur hier wird armiert**, und daran hängt die Regel von oben: Ein
 * abgebrochenes `working` kommt durch bloßes Zurückkommen nicht wieder, es
 * braucht diesen Aufruf — und den macht die Zone erst, wenn jemand das Ding
 * erneut abgelegt hat. `onWork(null, null)` ist `IDLE_WORK`.
 */
export function onWork(kind: WorkKind | null, item: KitchenItem | null): WorkState {
  const working = kind !== null && item !== null && workStage(kind, item) !== null;
  return { kind, item, time: 0, working };
}

/** Der Anteil 0…1 für den Balken über der Station. */
export function workProgress(state: WorkState): number {
  if (!state.working || !state.kind) return 0;
  return Math.min(1, state.time / WORK_SECONDS[state.kind]);
}

/** Was ein Bild an der Station geändert hat. */
export interface WorkTick {
  readonly state: WorkState;
  /** Was in diesem Bild fertig geworden ist — die Zone tauscht das Netz. */
  readonly done: KitchenItem | null;
  /**
   * Ob das Fertige **in die Hand** gewandert ist (`WORK_TO_HAND`) — dann ist
   * die Station leer, und die Zone hängt das Netz an die Figur statt es liegen
   * zu lassen.
   *
   * Es steht hier und nicht als Frage an die Zone („ist es eine Spüle?"),
   * damit der ganze Ausgang eines Bildes an **einer** Stelle steht: Wer
   * `state.item === null` liest und `toHand` nicht, sähe einen Teller, der
   * sich in Luft aufgelöst hat.
   */
  readonly toHand: boolean;
}

/**
 * **Ein Bild an der Station** — `dt` Sekunden weiter, aber nur, wenn jemand
 * danebensteht.
 *
 * `near` ist die Figur an der Station. Geht sie weg, **bricht die Arbeit ab**:
 * `working` fällt auf `false`, die Zeit auf null, und nur ein neues `onWork`
 * fängt wieder an. Zurückkommen allein genügt nicht — sonst wäre das Weggehen
 * eine Pause statt einer Entscheidung (siehe oben).
 *
 * Ist schon abgebrochen, kommt **derselbe** Zustand zurück und kein gleich
 * aussehender: Die Zone vergleicht auf Identität, um nicht in jedem Bild einer
 * unbenutzten Station ein Netz anzufassen.
 *
 * `handFree` ist die leere Hand der Figur, und sie zählt nur für Arbeit, deren
 * Ergebnis in die Hand gehört (`WORK_TO_HAND`) — also heute für die Spüle.
 * **Ist die Hand voll, bleibt der saubere Teller im Becken stehen**: Er
 * verschwindet nicht, und er drängt auch nichts aus der Hand. Ein Griff an das
 * Becken holt ihn dann nach (`kitchenCarry.atSink` gibt her, was darin steht)
 * — derselbe Weg, den es vor dieser Änderung immer gab, jetzt nur noch als
 * Ausnahme. Am Brett ist der Wert gleichgültig, deshalb darf er fehlen.
 *
 * **Und für den Mixer gilt das alles nicht** (`WORK_ALONE`): Er läuft weiter,
 * ob jemand danebensteht oder nicht, und bricht deshalb auch nichts ab. `near`
 * wird für ihn gar nicht erst gelesen — die Zone darf ihn also ruhig mit
 * demselben Aufruf füttern wie das Brett und muss nicht wissen, welches Möbel
 * sich wie verhält.
 */
export function advanceWork(
  state: WorkState,
  dt: number,
  near: boolean,
  handFree = false,
): WorkTick {
  // Der Merker steht **vor** dem Abbruch und nicht darin: `state.kind` ist
  // `null`, solange nichts angelegt ist, und eine leere Station bricht ohnehin
  // nichts ab.
  const alone = state.kind !== null && WORK_ALONE[state.kind];
  if (!near && !alone) {
    if (!state.working && state.time === 0) return { state, done: null, toHand: false };
    return { state: { ...state, time: 0, working: false }, done: null, toHand: false };
  }
  if (!state.working || !state.kind || !state.item) return { state, done: null, toHand: false };
  const time = state.time + Math.max(0, dt);
  if (time < WORK_SECONDS[state.kind]) {
    return { state: { ...state, time }, done: null, toHand: false };
  }
  const done = workStage(state.kind, state.item);
  // Kann daraus nichts mehr werden, hätte gar nicht gearbeitet werden dürfen —
  // die Uhr hält an, statt weiterzulaufen und nie fertig zu werden.
  if (!done) return { state: { ...state, time: 0, working: false }, done: null, toHand: false };
  // Der saubere Teller geht in die Hand und ist damit **von** der Station weg;
  // der geschnittene Salat bleibt liegen. Beides ist derselbe Satz, nur mit
  // dem einen Eintrag aus `WORK_TO_HAND` darin.
  const toHand = WORK_TO_HAND[state.kind] && handFree;
  // Genau **eine** Stufe je Auflegen, auch wenn das Bild lang war: Der Rest
  // verfällt, weil die nächste Stufe einen neuen Handgriff braucht.
  return {
    state: { kind: state.kind, item: toHand ? null : done, time: 0, working: false },
    done,
    toHand,
  };
}

/**
 * **Fertig geworden, aber die Hand war voll** — das Ergebnis wartet an der
 * Station, statt in die Hand zu gehen.
 *
 * Es ist eine Frage an die Tat und nicht an das Möbel, und deshalb steht sie
 * hier: Die Zone soll sagen können, **warum** der saubere Teller im Becken
 * steht, ohne dafür zu wissen, dass ein Becken anders ist als ein Brett. Am
 * Brett ist die Antwort immer `false` — dort ist Liegenbleiben kein
 * Ausweichen, sondern der Normalfall, und eine Meldung darüber wäre eine
 * Meldung über nichts.
 */
export function workWaits(tick: WorkTick): boolean {
  if (!tick.done || tick.toHand || !tick.state.kind) return false;
  return WORK_TO_HAND[tick.state.kind];
}
