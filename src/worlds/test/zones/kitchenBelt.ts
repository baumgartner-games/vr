import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';
import type { StationKind } from './kitchenCarry';

/**
 * **Das Förderband** — eine Kachel Ausgabetheke, auf der die Dinge von selbst
 * weiterwandern.
 *
 * Bei _PlateUp_ ist das Band das erste Möbel, das einem die Wege abnimmt: Man
 * legt etwas darauf und geht weiter, statt es zu tragen. Dafür muss man auf
 * einen Blick sehen, **wohin** es schiebt — und genau das ist der Grund, warum
 * Pfeile darauf laufen und nicht bloß daraufgemalt sind. Ein stehender Pfeil
 * ist eine Beschriftung, ein laufender ist die Maschine selbst.
 *
 * **Diese Möbel stecken nicht in `public/models/kitchen.glb`.** Der gekaufte
 * Katalog hat dreizehn Stücke und kein Band (`core/kitchenFit.KITCHEN_PIECES`);
 * die Einträge `belt` und `belt-pull` tragen deshalb `built: true` — sie werden
 * gebaut, hier, aus Kästen und einer Leinwand. Dieselbe Entscheidung wie beim Zutatensatz
 * nebenan (`kitchenProps.FoodKit`) und aus demselben Grund: Eine zweite
 * Quelldatei aufzunehmen, mit Lizenz, Aufbereitung und Eintrag in
 * `public/models/CREDITS.md`, wäre viel Aufwand für drei Quader.
 *
 * **Zwei Teile, und nur der untere kennt three.js.** Wohin ein gedrehtes Band
 * schiebt (`beltStep`) und wer wann losfährt und ankommt (`advanceBelts`) sind
 * reine Zahlen — dieselbe Trennung wie zwischen `kitchenClock.ts` und
 * `kitchenGauge.ts`. Was die Küche mit dem weitergereichten Ding anstellt,
 * entscheidet sie selbst (`kitchen.ts`); hier steht nur, wann es so weit ist.
 *
 * **Zwei Sorten Band, und nur eine davon greift nach hinten.** Das
 * gewöhnliche Band (`belt`, blaue Sparren) nimmt, was man darauflegt, und
 * schiebt es eine Kachel weiter. Das **Zugband** (`belt-pull`, orange Sparren)
 * tut dasselbe und holt sich obendrein von selbst, was auf der Kachel
 * **hinter** ihm liegt — und die Kachel davor muss dafür kein Band sein: eine
 * Arbeitsplatte, ein Gästetisch, ein Schneidebrett, ein anderes Band. Sie
 * **wird** für diesen einen Handgriff eines (`BeltTile.pull`, `advanceBelts`),
 * und damit gilt für sie ohne eine zweite Rechnung alles, was für ein Band
 * gilt — Losfahren, Anstehen, `BELT_HOLD`, das Bild dazwischen.
 *
 * **Und es zieht, indem es sich etwas vormerkt.** Ein freies Zugband schreibt
 * sich bei seinem Nachbarn ein, noch bevor dort überhaupt etwas liegt; der
 * weiß damit, dass er es nicht weitergeben muss. Was dort **zur Ruhe kommt**,
 * geht deshalb quer weg statt geradeaus weiter — auch auf einem Band, das
 * selbst schiebt. Was dagegen schon **fährt**, fährt zu Ende, und ein **volles**
 * Zugband merkt gar nicht erst vor: Dann schiebt das Band wie immer, statt sich
 * an einem Stau nebenan anzustecken.
 *
 * **Und die obere Hälfte rechnet nicht mehr je Kachel, sondern je Bild.** Das
 * ist die eine Entscheidung, aus der alles andere hier folgt: Ein Band hängt an
 * dem Band davor, und das an dem davor. Wer jede Kachel für sich rechnet, kann
 * die Frage „darf ich losfahren?" nicht beantworten, ohne dabei auf eine
 * Reihenfolge hereinzufallen — von vorn gerechnet fährt ein volles Band in
 * einem Bild los, von hinten gerechnet braucht es so viele Bilder, wie es
 * Kacheln hat. `advanceBelts` bekommt deshalb **alle** Kacheln auf einmal und
 * rechnet, bis sich nichts mehr ändert.
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Wie lange ein Ding über eine Kachel Band braucht**, in Sekunden.
 *
 * Zwei, also ein halber Meter je Sekunde. Das ist **absichtlich langsamer als
 * Laufen**: Die Figur geht 2,6 m/s (`core/PlayerRig.moveSpeed`) und wäre über
 * dieselbe Kachel in knapp vier Zehntelsekunden. Ein Band, das schneller wäre
 * als der Koch, machte das Tragen sinnlos — man würfe alles aufs Band und
 * liefe hinterher.
 *
 * Ein Band kauft keine **Zeit**, es kauft **Hände**: Wer die Tomate aufs Band
 * legt, hat sie unterwegs und kann inzwischen etwas anderes holen. Genau dafür
 * darf es gemächlich sein — und zwei Sekunden sind gut zu sehen, ohne dass man
 * davorsteht und wartet (zum Vergleich: ein Patty brät vier Sekunden,
 * `kitchenClock.FRY_SECONDS`).
 */
export const BELT_SECONDS = 2;

/**
 * **Wie weit ein Ding fährt, das nicht ankommen darf** — der Anteil 0…1, bei
 * dem es kurz vor dem Ziel hängen bleibt.
 *
 * Losgefahren wird schon, wenn der Vordermann losgefahren ist; **angekommen**
 * wird erst, wenn die Zielkachel wirklich leer ist (`advanceBelts`). Dazwischen
 * liegt der Fall, dass das Ziel in der Zwischenzeit doch wieder belegt wurde —
 * jemand legt während der zwei Sekunden etwas auf die Kachel vor dem Band.
 * Dann steckt das Ding fest, und es gibt genau zwei Möglichkeiten: zurück oder
 * warten. **Zurück sieht nach Fehler aus** — ein Teller, der auf dem Band
 * rückwärts fährt, liest sich nicht als „besetzt", sondern als kaputtes Spiel.
 * Also warten, und zwar dort, wo es gerade steht.
 *
 * Wo es steht, darf es aber nicht im Ding auf der Zielkachel stecken. Das
 * Breiteste, was in dieser Küche herumliegt, ist der Teller mit 37,5 cm Radius
 * (`kitchenProps.PLATE_RADIUS`); bleibt das Ding genau diesen Radius vor der
 * Kachelmitte stehen, stößt es gerade an ihn, ohne ihn zu überlagern. Von oben
 * liest sich das als das, was es ist: eine Schlange, die sich vor einem
 * Hindernis staut — und nicht als zwei Dinge, die ineinanderliegen.
 */
export const BELT_HOLD = 1 - 0.375 / TILE;

/**
 * **Wie weit ein Ding auf dem Band schon gewandert ist** — und ob es überhaupt
 * schon losgefahren ist.
 *
 * Zwei Felder, und das zweite ist aus dem ersten **nicht** ablesbar: Ein Ding,
 * das in diesem Bild losgefahren ist, steht noch bei `time: 0` und ist trotzdem
 * unterwegs. Genau daran erkennt der Hintermann, dass diese Kachel gleich frei
 * wird und er selbst schon anfahren darf. Wer `moving` aus `time > 0` erraten
 * wollte, verlöre diesen einen Bildmoment — und mit ihm die Kettenausnahme: Ein
 * volles Band setzte sich dann Kachel für Kachel über ebenso viele Bilder in
 * Bewegung statt in einem Stück.
 *
 * Der Zustand gehört der **Ausgangskachel**, nicht dem Ding: Was auf halber
 * Strecke ist, liegt logisch weiter auf der Kachel, von der es kommt. Siehe
 * `advanceBelts`, dort steht, warum.
 */
export interface BeltState {
  /** Sekunden seit dem Losfahren — `0`, solange nichts unterwegs ist. */
  readonly time: number;
  /** Ob das Ding losgefahren ist und nur noch ankommen muss. */
  readonly moving: boolean;
  /**
   * **Wohin diese Fahrt geht** — `null`, solange keine läuft.
   *
   * Für ein Band steht es ohnehin fest (es schiebt, wohin sein Pfeil zeigt),
   * und dort ist dieses Feld nur die Wiederholung davon. Gebraucht wird es an
   * der einen Kachel, die **kein** Band ist: Eine Arbeitsplatte, an der zwei
   * Zugbänder stehen, wird in jedem Bild neu gefragt, welches von beiden sie
   * gerade zieht — und ohne dieses Feld wäre die Antwort in dem Bild, in dem
   * das erste volläuft, eine andere als im Bild davor. Das Ding hinge dann auf
   * halber Strecke und führe plötzlich woandershin. **Losfahren ist ein
   * Versprechen** (siehe `advanceBelts`), und hier steht, wem es gilt.
   */
  readonly to?: string | null;
}

/** Eine Kachel, auf der nichts unterwegs ist — leer oder wartend. */
export const BELT_EMPTY: BeltState = Object.freeze({ time: 0, moving: false, to: null });

/**
 * **Eine Kachel, so viel wie die Bandrechnung davon braucht** — und das ist
 * absichtlich so wenig, dass auch Kacheln hineinpassen, die gar kein Band sind.
 *
 * Denn genau das ist der Punkt: Ob vor dem Band das nächste Band liegt, eine
 * Arbeitsplatte oder überhaupt nichts, ändert an der Frage nichts. Gefragt ist
 * immer dasselbe — **liegt dort etwas, und wandert es weg?** Eine Ablage ist
 * deshalb eine Kachel ohne Ziel (`to: null`): Sie wird frei und besetzt, aber
 * von selbst wandert dort nichts. Ein Band, das ins Nichts schiebt, ist
 * dieselbe Kachel ohne Ziel — und dass beides zusammenfällt, ist die ganze
 * Antwort auf „was, wenn da vorn gar nichts ist": Dann fährt es nicht los.
 * Vorher fuhr es los, und das Ding war weg.
 *
 * `id` ist der Schlüssel, unter dem die Zone ihre Station wiederfindet — sie
 * führt dafür schon einen (`kitchen.Station.key`). Ein `to`, das auf keine der
 * übergebenen Kacheln zeigt, zählt wie `null`: Auch ein Ziel, von dem die Zone
 * nichts erzählt, ist für dieses Modul keines.
 */
export interface BeltTile {
  /** Der Schlüssel dieser Kachel. */
  readonly id: string;
  /** Ob hier gerade etwas liegt. */
  readonly loaded: boolean;
  /** Der Fahrtzustand dieser Kachel — `BELT_EMPTY` bei allem, was nicht fährt. */
  readonly state: BeltState;
  /** Wohin diese Kachel schiebt; `null` bei allem, was nicht schiebt. */
  readonly to: string | null;
  /**
   * **Woher dieses Band sich etwas holt** — nur beim Zugband, sonst `null`.
   *
   * Es ist die Kachel **hinter** dem Band, also die, aus deren Richtung die
   * Sparren kommen (`beltReach`). Was dort liegt, wandert von selbst auf das
   * Zugband, und zwar genau so, wie es von einem Band auf das nächste wanderte:
   * Die genannte Kachel bekommt für dieses Bild das Zugband als Ziel — mehr
   * passiert nicht. Deshalb steht hier auch nur ein Schlüssel und keine zweite
   * Sorte Fahrt.
   *
   * **Vorgemerkt wird, bevor etwas da ist**: Ein freies Zugband schreibt sich
   * bei seinem Nachbarn ein, und der weiß damit schon, dass er nicht
   * weitergeben muss. Was dort **liegt**, geht deshalb quer weg statt geradeaus
   * weiter — auch von einem Band, das selbst schiebt.
   *
   * **Drei Fälle geben nichts her, und alle drei ohne Sonderzeile:** eine
   * Kachel, die es nicht gibt; eine, auf der schon etwas **fährt** (was
   * losgefahren ist, fährt zu Ende); und eine, um die sich zwei Zugbänder
   * streiten — dann bekommt sie genau eines von beiden. Und ein volles Zugband
   * merkt gar nicht erst vor: Dann schiebt das Band wie immer (`advanceBelts`).
   */
  readonly pull?: string | null;
}

/** Eine Übergabe: Was auf `from` lag, liegt jetzt auf `to`. */
export interface BeltMove {
  readonly from: string;
  readonly to: string;
}

/**
 * **Wo ein wanderndes Ding gezeichnet wird** — zwischen zwei Kachelmitten.
 *
 * Kein Vektor und keine Höhe: Wo die Mitten liegen, weiß die Zone
 * (`kitchen.Station.deck`), und sie blendet selbst zwischen ihnen über. Dieses
 * Modul gibt den Anteil heraus und sonst nichts — dieselbe Grenze wie überall
 * hier, three.js steht in der unteren Hälfte der Datei.
 *
 * **Linear und ungeglättet**, und das ist keine Sparsamkeit: Ein Band läuft mit
 * gleichbleibender Geschwindigkeit, und die Sparren darauf laufen genau so
 * schnell (`BeltKit.update` rechnet mit demselben `BELT_SECONDS`). Ein
 * weich an- und abschwellendes Ding führe sichtbar anders als der Untergrund,
 * auf dem es liegt.
 */
export interface BeltCarry {
  /** Die Kachel, auf der es logisch liegt. */
  readonly from: string;
  /** Die Kachel, auf die es zufährt. */
  readonly to: string;
  /** Wie weit dazwischen, 0…1 — gedeckelt auf `BELT_HOLD`, solange es nicht ankommt. */
  readonly t: number;
}

/** Was ein Bild auf allen Bändern geändert hat. */
export interface BeltFrame {
  /**
   * Die neuen Fahrtzustände — **nur** für die Kacheln, bei denen sich etwas
   * geändert hat. Eine Küche, in der gerade kein Band läuft, gibt hier nichts
   * heraus, und die Zone schreibt dann auch nichts.
   */
  readonly states: ReadonlyMap<string, BeltState>;
  /**
   * Die Übergaben dieses Bildes, **in anwendbarer Reihenfolge**: von vorn nach
   * hinten. Wer sie der Reihe nach abarbeitet, legt nie etwas auf eine Kachel,
   * auf der noch etwas liegt — der Vordermann ist in der Liste immer vorher
   * weggezogen. Rückwärts angewandt überschriebe die Liste Dinge.
   */
  readonly moves: readonly BeltMove[];
  /** Was gerade zwischen zwei Kacheln hängt, je Ausgangskachel. */
  readonly carry: ReadonlyMap<string, BeltCarry>;
}

/** Nichts zu tun — geteilt, damit ein Bild ohne Bänder keinen Müll hinterlässt. */
const NO_STATES: ReadonlyMap<string, BeltState> = new Map();
const NO_CARRY: ReadonlyMap<string, BeltCarry> = new Map();
const NO_MOVES: readonly BeltMove[] = Object.freeze([]);
const STILL_FRAME: BeltFrame = Object.freeze({
  states: NO_STATES,
  moves: NO_MOVES,
  carry: NO_CARRY,
});

/** Eine Kachel während der Rechnung — dasselbe wie `BeltTile`, nur veränderlich. */
interface Seat {
  readonly tile: BeltTile;
  loaded: boolean;
  time: number;
  moving: boolean;
  /**
   * **Wohin diese Kachel in _diesem_ Bild schiebt** — das eigene Ziel, oder das
   * Zugband, das sie sich für dieses Bild genommen hat (`BeltTile.pull`).
   *
   * Veränderlich und nicht aus `tile.to` gelesen: Genau hier wird aus einer
   * Arbeitsplatte für einen Handgriff ein Band. Alles darunter fragt nur noch
   * dieses Feld und weiß deshalb nicht einmal, dass es Zugbänder gibt.
   */
  to: string | null;
}

/**
 * **Ob auf diese Kachel gerade etwas darf** — frei, oder belegt von einem, der
 * selbst schon unterwegs ist.
 *
 * Dieselbe Frage, die das Losfahren stellt (die Kettenausnahme, Schritt 3), und
 * deshalb steht sie hier einmal und nicht zweimal: Ein Zugband, das gerade
 * abfließt, ist ein Zugband, das gleich frei ist.
 */
function canTake(seat: Seat): boolean {
  return !seat.loaded || seat.moving;
}

/**
 * **Ein Bild auf allen Bändern** — wer losfährt, wer ankommt, und wo das
 * Wandernde inzwischen hängt.
 *
 * Eine Fahrt hat **zwei Stufen**, und das ist der ganze Unterschied zu vorher:
 *
 * - **Losfahren** darf, wessen Ziel frei ist — _oder_ wessen Ziel zwar belegt
 *   ist, das Belegende aber selbst schon losgefahren ist. Das ist die
 *   Kettenausnahme: Fließt vorn einer ab, setzt sich das ganze Band in
 *   Bewegung, und zwar in **einem** Bild (die Schleife unten rechnet, bis sich
 *   nichts mehr ändert). Was ein anderer schon angesteuert hat, zählt dabei
 *   nicht als frei.
 * - **Ankommen** darf nur, wessen Ziel wirklich leer ist. Wer nicht ankommen
 *   kann, bleibt bei `BELT_HOLD` stehen, statt zurückzuspringen.
 *
 * **Die alte Kachel wird beim Losfahren nicht frei**, sondern erst beim
 * Ankommen — und das ist die Entscheidung, an der diese Rechnung hängt. Der
 * Reiz des Gegenteils ist offensichtlich: Wer beim Losfahren schon umgebucht
 * wird, braucht keine zweite Stufe. Aber dann liegt das Ding zwei Sekunden lang
 * logisch dort, wo es sichtbar noch gar nicht ist. Das kostet drei Dinge auf
 * einmal: Der Hintermann fährt auf eine Kachel zu, auf der noch etwas sichtbar
 * steht; wer `A` drückt, greift ins Leere oder in das falsche Ding
 * (`kitchen.stationAt` fragt die Kachel, nicht das Bild); und ein Ding, das
 * unterwegs abgeräumt wird, müsste von einer Kachel genommen werden, die es nie
 * erreicht hat. Belegt bleibt deshalb, wo es herkommt — **das Losfahren ist ein
 * Versprechen, kein Umzug**. Und weil ein Versprechen nicht zurückgenommen
 * wird, darf der Hintermann sich darauf verlassen.
 *
 * Was daraus folgt, ist angenehm: Eine Kachel, von der etwas losgefahren ist,
 * gilt weiter als belegt — es kann also niemand etwas daraufwerfen, und zwei
 * aufeinanderfolgende Dinge kommen sich nie näher als eine Kachel. `BELT_HOLD`
 * greift nur in dem einen Fall, den die Zone nicht verhindert: Das Ziel war
 * beim Losfahren leer, und jemand hat in der Zwischenzeit etwas hingelegt.
 *
 * **Ein voller Ring fährt nicht.** Drei Bänder im Kreis, alle belegt, nirgends
 * Platz: Jedes könnte losfahren, weil das nächste losgefahren wäre — eine
 * Begründung, die sich im Kreis selbst trägt. Die Schleife unten fängt das
 * ohne Sonderfall ab, weil sie nicht rät, sondern **ausbreitet**: Losfahren
 * beginnt bei einer Kachel, deren Ziel wirklich frei ist, und wandert von dort
 * nach hinten. Ist keine solche Kachel da, fängt nichts an — und ein voller
 * Ring steht, was auch richtig ist: Er käme nirgends an.
 */
export function advanceBelts(tiles: readonly BeltTile[], dt: number): BeltFrame {
  if (!tiles.length) return STILL_FRAME;

  // `NaN` käme aus einer Uhr, die noch nie gelaufen ist; ein Band, dessen Zeit
  // einmal keine Zahl ist, käme nie wieder irgendwo an.
  const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;

  const board = new Map<string, Seat>();
  for (const tile of tiles) {
    const sane = Number.isFinite(tile.state.time) ? Math.max(0, tile.state.time) : 0;
    board.set(tile.id, {
      tile,
      loaded: tile.loaded,
      // Was nicht daliegt, fährt auch nicht: Wird ein Ding unterwegs
      // abgeräumt, endet seine Fahrt mit ihm.
      time: tile.loaded ? sane : 0,
      moving: tile.loaded && tile.state.moving,
      to: tile.to,
    });
  }

  // **Ein Ziel, von dem die Zone nichts erzählt, ist keines.** Einmal
  // ausgestrichen und nicht bei jeder Frage neu nachgeschlagen: Danach heißt
  // `to === null` überall dasselbe — „diese Kachel schiebt nirgendwohin" —, und
  // die Zugbänder unten dürfen sich darauf verlassen. Ohne diesen Strich hielte
  // ein Band, das auf eine weggetragene Ablage zeigt, sich für beschäftigt und
  // ließe sich nicht leerziehen.
  for (const seat of board.values()) if (seat.to !== null && !board.has(seat.to)) seat.to = null;

  const ahead = (seat: Seat): Seat | undefined =>
    seat.to === null ? undefined : board.get(seat.to);

  // --- 0. die Zugbänder merken sich etwas vor ---------------------------------
  //
  // **Und mehr tun sie nicht**: Sie schreiben der Kachel hinter sich ein Ziel,
  // und das sind sie selbst. Danach ist ein gezogener Arbeitstisch von einem
  // Band nicht mehr zu unterscheiden, und alles Weitere — Losfahren,
  // Kettenausnahme, `BELT_HOLD`, Ankommen — gilt für ihn, ohne dass es unten
  // noch einmal stünde. Das ist der ganze Trick an dieser Sorte Möbel.
  //
  // **Die Vormerkung steht, bevor überhaupt etwas da ist.** Ein freies Zugband
  // merkt bei seinem Nachbarn an: „Was hier ankommt, hole ich." Der Nachbar
  // weiß damit schon, dass er es **nicht weitergeben** muss — und deshalb geht
  // ein Ding, das auf einem Band zur Ruhe kommt, im selben Bild quer weg statt
  // geradeaus weiter. Ist das Zugband dagegen voll, gibt es keine Vormerkung,
  // und das Band schiebt wie immer.
  //
  // Drei Regeln entscheiden die Fälle, die ein Grundriss irgendwann herstellt:
  //
  // - **Was schon fährt, wird nicht umgeleitet.** Hat ein Ding seine Fahrt
  //   angefangen — geradeaus oder zu einem anderen Zugband —, dann gilt sie
  //   (`BeltState.to`), auch wenn nebenan gerade ein Zugband frei wird. Sonst
  //   wechselte es auf halber Strecke die Richtung, und das Losfahren wäre
  //   kein Versprechen mehr. Gezogen wird also nur, was **liegt**.
  // - **Nur ein freies Zugband merkt vor**, und „frei" heißt hier dasselbe wie
  //   beim Losfahren: leer — oder voll, aber selbst schon unterwegs (`canTake`).
  //   Wer im Stau steht, hält nicht auch noch den Nachbarn an: Dann schiebt
  //   das Band sein Ding den gewohnten Weg weiter.
  // - **Eine Kachel wird von genau einem Zugband gezogen.** Stehen zwei an
  //   derselben Arbeitsplatte, bekommt sie das erste, das gerade vormerken
  //   kann — ist das erste voll und das zweite frei, greift das zweite. Erst
  //   das macht aus zwei Zugbändern zwei Abnehmer.
  //
  // Wer der Erste ist, entscheidet wie überall hier die Reihenfolge der
  // übergebenen Kacheln; eine zufällige Antwort wäre schlechter.
  //
  // **Ein Band, das schiebt, darf also leergezogen werden** — anders als in der
  // ersten Fassung, die den eigenen Pfeil immer gewinnen ließ. Der Pfeil bleibt
  // trotzdem wahr: Er sagt, wohin das Band schiebt, **wenn** es schiebt. Wo ein
  // Zugband danebensteht, ist das die Ausnahme, und man sieht sie an dessen
  // orangem Greifer.
  for (const seat of board.values()) {
    // Ein laufender Zug behält sein Ziel, komme, was wolle — auch das eines
    // Zugbands, das die Kachel inzwischen nicht mehr vormerken dürfte.
    const kept = seat.moving ? (seat.tile.state.to ?? null) : null;
    if (kept !== null && board.has(kept)) seat.to = kept;
  }
  let pulls: Map<string, Seat> | null = null;
  for (const seat of board.values()) {
    const source = seat.tile.pull ? board.get(seat.tile.pull) : undefined;
    // Ein Band, das von sich selbst zöge, wäre eine Kachel, die sich selbst
    // zum Ziel hat — und damit ein Ring aus einem Glied.
    if (!source || source === seat) continue;
    // Was fährt, fährt weiter; wer voll steht, merkt nicht vor.
    if (source.moving || !canTake(seat)) continue;
    if ((pulls ??= new Map()).has(source.tile.id)) continue;
    pulls.set(source.tile.id, seat);
  }
  if (pulls) for (const [id, puller] of pulls) board.get(id)!.to = puller.tile.id;

  // Ein Ziel, das es nicht mehr gibt — im Baumodus wandert das Möbel davor
  // weg —, beendet die Fahrt an Ort und Stelle. Der Sprung zurück auf die
  // eigene Kachel ist hier ausnahmsweise das Richtige: Das Band schiebt
  // nirgendwohin mehr, und ein Ding, das auf eine leere Stelle zuführe, wäre
  // die schlechtere Lüge.
  for (const seat of board.values()) {
    if (seat.moving && !ahead(seat)) {
      seat.moving = false;
      seat.time = 0;
    }
  }

  // --- 1. die Uhren der Fahrenden laufen — keiner am Vordermann vorbei --------
  //
  // Die Deckelung sitzt **hier** und nicht hinter dem Ankommen, und das ist der
  // Unterschied zwischen „steht kurz vor dem Ziel" und „springt zurück": Eine
  // Uhr, die erst über das Ziel hinausläuft und dann zurückgeklemmt wird, hat
  // das Ding schon einmal zu weit gezeichnet. Die Obergrenze kommt deshalb von
  // vorn: Wer auf eine freie Kachel zufährt, darf durchfahren; wer auf eine
  // besetzte zufährt, die stehen bleibt, kommt bis `BELT_HOLD`; und wer hinter
  // einem Fahrenden herfährt, kommt **genau so weit wie der** — damit bleibt
  // zwischen zwei Dingen immer eine ganze Kachel Abstand, auch im Stau.
  //
  // `Math.max(…, seat.time)` in beiden gebremsten Fällen ist die Zusage, dass
  // die Uhr **nie** rückwärts läuft: Wird das Ziel erst belegt, während schon
  // jemand fast dort ist, bleibt der stehen, wo er ist, statt sich auf die
  // Grenze zurückzusetzen. Dass er dann näher steht als `BELT_HOLD` erlaubt, ist
  // der kleinere Fehler — und `beltBound` ist da, damit die Zone diesen Fall gar
  // nicht erst entstehen lässt.
  const hold = BELT_SECONDS * BELT_HOLD;
  const ticked = new Set<Seat>();
  const tick = (seat: Seat): number => {
    // Vorgemerkt, **bevor** es nach vorn weitergeht: Ein Ring aus lauter
    // Fahrenden kann es nicht geben (siehe oben), aber eine Rekursion, die es
    // darauf ankommen ließe, hinge daran fest.
    if (ticked.has(seat)) return seat.time;
    ticked.add(seat);
    const next = ahead(seat);
    const limit = !next
      ? seat.time
      : !next.loaded
        ? BELT_SECONDS
        : !next.moving
          ? Math.max(hold, seat.time)
          : Math.max(tick(next), seat.time);
    seat.time = Math.min(seat.time + step, limit);
    return seat.time;
  };
  for (const seat of board.values()) if (seat.moving) tick(seat);

  // --- 2. ankommen, von vorn nach hinten --------------------------------------
  // Wer ankommt, macht seine Kachel frei — und das kann den Hintermann im
  // **selben** Bild ankommen lassen. Deshalb wird wiederholt, bis sich nichts
  // mehr rührt: Sonst hinge ein volles Band bei jeder Übergabe ein Bild lang
  // durch, und bei 60 Bildern und acht Kacheln wäre das eine sichtbare Welle.
  const moves: BeltMove[] = [];
  for (let settled = false; !settled;) {
    settled = true;
    for (const seat of board.values()) {
      if (!seat.moving || seat.time < BELT_SECONDS) continue;
      const next = ahead(seat);
      if (!next || next.loaded) continue;
      seat.loaded = false;
      seat.moving = false;
      seat.time = 0;
      next.loaded = true;
      next.moving = false;
      // Der Rest läuft **nicht** über: Was ankommt, fängt auf der neuen Kachel
      // vorn an. Anders als beim Braten (`kitchenClock.advanceStove`) gibt es
      // hier keine Phase, die den Rest gebrauchen könnte — die neue Kachel ist
      // vielleicht gar kein Band.
      next.time = 0;
      moves.push({ from: seat.tile.id, to: next.tile.id });
      settled = false;
    }
  }

  // --- 3. losfahren, von vorn nach hinten -------------------------------------
  //
  // Erst jetzt, denn Schritt 2 hat Kacheln frei gemacht: Wer in diesem Bild
  // angekommen ist, darf im selben Bild weiterfahren, und der hinter ihm auch.
  //
  // **Eine Kachel gehört dem, der schon auf sie zufährt.** Zwei Bänder, die auf
  // dieselbe Arbeitsplatte schieben, sind kein Sonderfall, sondern ein
  // Grundriss, den irgendwann jemand so baut — und ohne diese Vormerkung führen
  // beide los, einer kommt an, und der andere steht hinterher mitten in der Luft
  // fest. Also fährt der Zweite gar nicht erst los. Wer der Erste ist,
  // entscheidet die Reihenfolge der übergebenen Kacheln; eine bessere Antwort
  // gibt es nicht, und eine zufällige wäre schlechter.
  const claimed = new Set<string>();
  for (const seat of board.values()) {
    if (seat.moving && seat.to !== null) claimed.add(seat.to);
  }
  for (let settled = false; !settled;) {
    settled = true;
    for (const seat of board.values()) {
      if (!seat.loaded || seat.moving) continue;
      const next = ahead(seat);
      if (!next || claimed.has(next.tile.id)) continue;
      // Frei — **oder** belegt von einem, der selbst schon losgefahren ist. Das
      // ist die Kettenausnahme, und sie steht in dieser einen Zeile.
      if (!canTake(next)) continue;
      seat.moving = true;
      claimed.add(next.tile.id);
      settled = false;
    }
  }

  // --- 4. was die Zone davon erfährt ------------------------------------------
  let states: Map<string, BeltState> | null = null;
  let carry: Map<string, BeltCarry> | null = null;
  for (const seat of board.values()) {
    const was = seat.tile.state;
    const now: BeltState = seat.moving
      ? { time: seat.time, moving: true, to: seat.to }
      : BELT_EMPTY;
    if (
      now.moving !== was.moving ||
      now.time !== was.time ||
      (now.to ?? null) !== (was.to ?? null)
    ) {
      (states ??= new Map()).set(seat.tile.id, now);
    }
    if (seat.moving && seat.to !== null) {
      (carry ??= new Map()).set(seat.tile.id, {
        from: seat.tile.id,
        to: seat.to,
        t: seat.time / BELT_SECONDS,
      });
    }
  }
  if (!states && !carry && !moves.length) return STILL_FRAME;
  return { states: states ?? NO_STATES, moves, carry: carry ?? NO_CARRY };
}

/**
 * **Ob auf diese Kachel gerade etwas zufährt.**
 *
 * Für die eine Lücke, die `BELT_HOLD` sonst ausbaden muss: Eine Kachel, auf die
 * ein Band zuschiebt, ist zwar leer, aber schon vergeben. Wer das beim Ablegen
 * fragt (`kitchenCarry.kitchenDeed` entscheidet, was `A` tut), verhindert den
 * Stau, statt ihn hübsch aussehen zu lassen.
 */
export function beltBound(frame: BeltFrame, id: string): boolean {
  for (const carry of frame.carry.values()) if (carry.to === id) return true;
  return false;
}

/** Der Anteil 0…1 — wie weit über die Kachel, für das Ding und für den Balken. */
export function beltProgress(state: BeltState): number {
  if (!state.moving || !Number.isFinite(state.time)) return 0;
  return Math.min(1, Math.max(0, state.time / BELT_SECONDS));
}

/**
 * **Wohin dieses Band schiebt**, als Kachelversatz — aus der Drehung des
 * Möbels und aus nichts sonst.
 *
 * Bei `turn: 0` ist **vorn Norden** (`kitchenPlan.Spot.turn`), und die Zone
 * dreht ein Möbel mit `rotation.y = turn · 90°` (`kitchen.ts`, `place`). Eine
 * solche Drehung bildet das eigene −z auf (−sin, −cos) ab: 0 nach Norden
 * (`dz = -1`), 1 nach Westen, 2 nach Süden, 3 nach Osten — dieselbe Reihenfolge,
 * die in `Spot.turn` steht.
 *
 * **Genau dorthin zeigt auch der Pfeil** (`BeltKit`, die Sparren laufen im
 * eigenen Raum des Möbels nach −z). Das ist der ganze Trick an dieser Zeile:
 * Wer ein Band dreht, dreht sein Netz **und** seine Wirkung mit, ohne dass
 * irgendwo eine zweite Tabelle nachgeführt werden müsste. Ein Band, dessen
 * Pfeil nach Norden zeigt und das nach Süden schiebt, wäre der Fehler, den man
 * zehn Minuten lang für einen Fehler im Grundriss hält.
 */
export function beltStep(turn: 0 | 1 | 2 | 3): { dx: number; dz: number } {
  return BELT_STEPS[turn] ?? BELT_STEPS[0]!;
}

/**
 * **Ob ein Band auf diese Sorte Station abliefern darf.**
 *
 * Zwei sagen nein, und beide aus demselben Grund: In den **Mülleimer** wird
 * geworfen, über die **Ausgabetheke** wird serviert, und beides ist ein
 * Handgriff und kein Zufall. Ein Teller, den ein Band von selbst in den Müll
 * trägt, wäre der teuerste Unfall dieser Küche.
 *
 * **Und zwei weitere seit dem Abtropfbrett**: die **Geschirrrückgabe** und das
 * **Abtropfbrett** selbst. Auf ihnen liegt kein einzelnes Ding, sondern ein
 * **Stapel** (`kitchenCarry.Station.stack`) — wer dort etwas abstellt, lässt es
 * im Stapel aufgehen, und das kann nur der Handgriff, der mitzählt
 * (`kitchen.act`). Ein Band legte es stattdessen obendrauf, und dort läge es
 * für immer: Die Regel liest an diesen beiden Stationen nur die **Zahl**, also
 * würde das Abgelieferte nie wieder angefasst. In dieser Küche steht kein Band
 * neben einer der beiden — im Umbau kann jederzeit eines dorthin gestellt
 * werden, und dann soll es einfach nicht abliefern.
 *
 * Die Regel steht hier und nicht in der Zone, obwohl erst die Zone weiß,
 * **welche** Station nebenan steht: Das Nachschlagen der Nachbarkachel ist eine
 * Zeile, die Entscheidung darüber ist die Regel — und eine Regel, die nur im
 * Browser läuft, ist eine Regel, die niemand nachrechnet
 * (`kitchen.beltTarget` schlägt nach, hier steht, was gilt).
 */
export function beltDelivers(kind: StationKind): boolean {
  return kind !== 'bin' && kind !== 'serve' && kind !== 'return' && kind !== 'drain';
}

/**
 * **Ob ein Zugband sich von dieser Sorte Station etwas holen darf.**
 *
 * Alles, worauf ein Band nicht abliefern darf, darf es auch nicht leerziehen —
 * was man nicht hinschieben darf, nimmt man auch nicht heraus. Dazu zwei
 * eigene Fälle und ein Augenblick:
 *
 * - **Herd** und **Löscherhalterung**: Was dort steht, ist Gerät und keine
 *   Ware. Ein Band, das die einzige Pfanne der Küche mitnimmt, während das
 *   Patty darin brät, ist kein Fördern, sondern ein Diebstahl — und beim
 *   Löscher merkt man es erst, wenn es brennt.
 * - **Und was gerade unter dem Messer liegt, bleibt liegen** (`working`): Wer
 *   am Brett steht und schneidet, hat den Salat noch nicht aus der Hand
 *   gegeben (`kitchenWork.WorkState.working` läuft nur, solange jemand
 *   davorsteht). Sobald die Uhr steht, ist das Brett eine Ablage wie jede
 *   andere, und das Fertige fährt los.
 */
export function beltReleases(kind: StationKind, working = false): boolean {
  if (!beltDelivers(kind)) return false;
  if (kind === 'stove' || kind === 'rack') return false;
  return !working;
}

/**
 * **Welche Sorte Band dieses Möbel ist** — oder `null`, wenn es gar keines ist.
 *
 * Die eine Stelle, an der ein Katalogname zu einer Bandsorte wird
 * (`core/kitchenFit.KITCHEN_PIECES`: `belt`, `belt-pull`). Sie steht hier und
 * nicht in der Zone, weil hier auch steht, was die beiden unterscheidet — und
 * eine zweite Tabelle mit denselben zwei Namen wäre die, die beim dritten Band
 * ausschert.
 */
export function beltKind(name: string): BeltKind | null {
  if (name === 'belt') return 'push';
  if (name === 'belt-pull') return 'pull';
  return null;
}

/**
 * **Wohin ein Zugband greift**, als Kachelversatz — die Gegenrichtung zu
 * `beltStep`, und keine zweite Tabelle.
 *
 * Ein Zugband holt sich, was **hinter** ihm liegt: Wo die Sparren hereinlaufen,
 * steht die Kachel, die leergezogen wird. Damit zeigt derselbe Pfeil beides an
 * — woher es nimmt und wohin es gibt —, und wer das Möbel dreht, dreht beides
 * mit. Ein Zugband mit einer eigenen, unabhängig gedrehten Greifrichtung wäre
 * ein Möbel, dem man nicht ansieht, was es tut.
 */
export function beltReach(turn: 0 | 1 | 2 | 3): { dx: number; dz: number } {
  const step = beltStep(turn);
  return { dx: -step.dx, dz: -step.dz };
}

/**
 * Die vier Richtungen, eingefroren: Wer den zurückgegebenen Versatz
 * weiterreicht, soll ihn nicht aus Versehen für alle Bänder umschreiben.
 */
const BELT_STEPS: readonly Readonly<{ dx: number; dz: number }>[] = [
  Object.freeze({ dx: 0, dz: -1 }),
  Object.freeze({ dx: -1, dz: 0 }),
  Object.freeze({ dx: 0, dz: 1 }),
  Object.freeze({ dx: 1, dz: 0 }),
];

// --- und wie es aussieht ------------------------------------------------------

/**
 * **Wie hoch das Band ist**, in Metern — aus dem Katalog und nicht daneben
 * aufgeschrieben.
 *
 * Dieselbe Zeile wie bei `kitchenPlan.passTop()`: Der Katalog beschreibt das
 * Möbel (`core/kitchenFit.KITCHEN_PIECES`, `belt`), und was hier gebaut wird,
 * muss **genau** so hoch werden — sonst steht auf der Arbeitsplatte, die die
 * Küche für dieses Möbel annimmt (`core/kitchenFit.kitchenDeck`), das Essen in
 * der Luft oder im Blech. Die Ersatzzahl gilt nur, solange der Eintrag noch
 * nicht da ist, und ist dieselbe wie die der Ausgabetheke: 0,53 m.
 */
export const BELT_HEIGHT = kitchenPiece('belt')?.height ?? 0.53;

/**
 * **Wie das Band aufgebaut ist**, von unten nach oben, in Metern.
 *
 * Drei Schichten wie bei der Ausgabetheke, nur eine Kachel breit: ein dunkler
 * **Korpus**, darauf eine helle **Platte** mit einer Handbreit Überstand, und
 * darin ein dunkler **Trog**, in dem das Laufband liegt. Die Platte steht
 * ringsum 2 cm über den Korpus über — das ist die Kante, die man bei einer
 * Theke sieht und an der man erkennt, dass oben etwas anderes ist als unten.
 *
 * Die Höhen sind nicht geraten, sondern **gerechnet**: Was unten steht, ist
 * die Gesamthöhe minus dem, was darüberliegt. So bleibt die Oberkante des
 * Laufbands auf `BELT_HEIGHT`, egal was im Katalog steht.
 */
const TOP_THICK = 0.05;
const BAND_THICK = 0.022;
/** Wie weit die Pfeilebene über dem Trog schwebt — gegen das Flimmern. */
const BAND_LIFT = 0.003;
const BODY_HEIGHT = Math.max(0.1, BELT_HEIGHT - TOP_THICK - BAND_THICK - BAND_LIFT);

/**
 * **Die Grundflächen**, in Metern.
 *
 * Der Korpus bleibt 2 cm hinter der Kachel zurück, damit zwischen zwei Bändern
 * eine Fuge steht und nicht eine durchgehende Wand; die Platte nimmt die
 * Kachel voll ein, damit zwei Platten sich berühren.
 *
 * **Der Trog nimmt sie ebenfalls voll ein, und das ist eine Korrektur.** Er
 * war 72 cm breit und einen Meter lang, damit links und rechts von ihm ein
 * Streifen heller Platte stehen blieb — eine schöne Kante, solange alle Bänder
 * einer Küche in dieselbe Richtung zeigen. Seit der Umbau jede Drehung
 * erlaubt, legt früher oder später jemand vier Bänder in einem Quadrat von
 * zwei mal zwei Kacheln in alle vier Richtungen, und dann stehen vier dunkle
 * Rechtecke um eine Mitte, jedes um eine Vierteldrehung versetzt, mit hellen
 * Streifen dazwischen: ein **Hakenkreuz**, gebaut aus der Fuge und nicht aus
 * dem Pfeil. Ein Spiel, in dem man dieses Zeichen bauen kann, ohne es zu
 * wollen, hat ein Problem, und es ist keins, das man wegerklärt.
 *
 * Über die volle Kachel gibt es den hellen Streifen nicht mehr: Vier Bänder
 * über Kreuz sind eine dunkle Fläche mit acht Pfeilen darauf, und zwei Bänder
 * hintereinander sind ohnehin schon immer **ein** Band gewesen und nicht zwei.
 * Die Platte bleibt darunter liegen und ist weiter die Kante, die man aus
 * Augenhöhe sieht — nur von oben verdeckt der Trog sie jetzt, und genau das
 * ist der Zweck.
 */
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;
const BAND_WIDE = TILE;
const BAND_LONG = TILE;

/**
 * **Wie breit die Sparren laufen**, in Metern — 72 cm, das Maß des alten
 * Trogs.
 *
 * Der Trog geht über die ganze Kachel, die **Pfeile** tun es nicht: Sie sind
 * ein Bild auf dem Band (`arrows`, mit der Farbe des Trogs als Grund), und ein
 * Bild, das man von 72 cm auf einen Meter zieht, ist ein breitgedrückter
 * Pfeil. 72 cm sind außerdem knapp der Teller (75 cm Durchmesser,
 * `kitchenProps.PLATE_RADIUS`), der sie beim Fahren gerade überdeckt — die
 * Zahl war für die Fracht gedacht und bleibt es.
 *
 * Und der **Greifer** des Zugbands ist genauso breit: Er gehört zu den
 * Sparren, nicht zum Trog.
 */
const ARROW_WIDE = 0.72;

/**
 * **Die Farben.**
 *
 * Aus dem Modell abzulesen waren sie **nicht**, und das ist nachgesehen und
 * nicht vermutet: `public/models/kitchen.glb` hat genau drei Materialien
 * (`Kitchen_Cabins`, `Kitchen_Cabins_Double`, `Kitchen_Utensils`), und alle
 * drei tragen ihre Farbe in einer WebP-Textur — es gibt schlicht keine Zahl,
 * die man abschreiben könnte (`core/kitchenModel.ts` lädt sie unverändert).
 *
 * Also gewählt, und zwar nach dem, was das Band leisten muss: Es wird **von
 * oben** gelesen, aus 16 m Entfernung (`core/topDownPose.ts`). Ein dunkler
 * Korpus verschwindet dort im Schatten der Nachbarn und stört nicht; die helle
 * Platte ist die Kante, an der man das Möbel überhaupt erkennt; der Trog ist
 * fast schwarz, damit die hellen Sparren darauf den größten Kontrast der
 * ganzen Küche haben.
 *
 * **Und an den Sparren hängt jetzt, welche Sorte Band das ist**: blau schiebt,
 * orange zieht. Die Sparren tragen die Farbe und nicht der Korpus, weil sie
 * das Einzige an diesem Möbel sind, was man aus 16 m Höhe wirklich liest —
 * zwei Pfeile je Kachel, quer über den fast schwarzen Trog. Ein orangefarbener
 * Kasten unter einer Platte wäre aus derselben Höhe ein Schatten.
 *
 * Die beiden Töne sind absichtlich **nicht** die zartesten, die noch gingen:
 * Ein Band wird im Vorbeilaufen gelesen und nicht betrachtet, und zwischen
 * `#5ab4ff` und `#ff9f45` liegt der halbe Farbkreis — sie sind auch dann noch
 * auseinanderzuhalten, wenn ein Teller die halbe Kachel verdeckt. Das frühere
 * Fast-Weiß (`#e8f3ff`, der Ton des Schneidebalkens) ist damit weg: Es war
 * eine Farbe für **eine** Sorte Band, und von zwei Sorten wäre es die
 * unentschiedene gewesen.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const BAND_COLOR = 0x171b21;

/** Was für ein Band gebaut wird — dasselbe Möbel, zwei Aufgaben. */
export type BeltKind = 'push' | 'pull';

/** Die Farbe der Sparren je Sorte: blau schiebt, orange zieht. */
export const BELT_COLORS: Readonly<Record<BeltKind, string>> = Object.freeze({
  push: '#5ab4ff',
  pull: '#ff9f45',
});

/**
 * **Der Greifer am Zugband**, in Metern — der helle Streifen an seiner
 * **hinteren** Kante, dort, wo es sich etwas holt.
 *
 * Er ist die Antwort auf eine Frage, die die Farbe allein nicht beantwortet:
 * Ein oranges Band sagt „ich ziehe", aber nicht **von welcher Seite**. Der
 * Streifen liegt an der Kante, an der die Sparren hereinlaufen, also genau an
 * der Nachbarkachel, die leergezogen wird — wer beide zusammen sieht, muss
 * nichts nachschlagen.
 *
 * Und er liegt **flach und mittig in der Ablagefläche**: 4 mm dick, mit seiner
 * Mitte genau auf `BELT_HEIGHT`, ragt er 2 mm über den Trog und liegt mit den
 * anderen 2 mm darin. Beides hat einen Grund. Über die Kante fährt alles
 * hinweg, was hereingezogen wird — eine aufgestellte Leiste wäre ein Greifer,
 * der durch jeden Teller hindurchführe, den er sich holt. Und die 2 mm nach
 * oben sind der Abstand zur Pfeilebene, die genau auf `BELT_HEIGHT` liegt: Zwei
 * Flächen auf derselben Höhe flimmern gegeneinander, sobald die Kamera sich
 * bewegt.
 */
const MOUTH_THICK = 0.004;
const MOUTH_LONG = 0.07;

/**
 * **Wie viele Sparren auf eine Kachel passen** und wie groß die Leinwand für
 * einen davon ist.
 *
 * Zwei je Meter: Einer allein wäre auf einer 1-m-Kachel ein großes Dreieck,
 * das man für ein Muster hält; vier wären aus 16 m Höhe ein Streifenmuster,
 * dem man die Richtung nicht mehr ansieht. Zwei sind aus jeder Zoomstufe zwei
 * Pfeile.
 *
 * 64 Pixel je Sparren reichen: Die Textur wird nie größer als eine Kachel im
 * Bild, und ein weicher Rand am Pfeil ist hier eher hilfreich als störend.
 */
const CHEVRONS = 2;
const CHEVRON_PIXELS = 64;

/**
 * **Der Bausatz für die Bänder einer Küche** — geteilte Formen, geteilte
 * Farben, eine Textur, ein `dispose`.
 *
 * Einer je Zone, wie der Zutatensatz (`kitchenProps.FoodKit`) und die Anzeigen
 * (`kitchenGauge.KitchenGauges`) daneben. Acht Bänder in einer Küche teilen
 * sich damit vier Formen und vier Farben — und **eine** Textur.
 *
 * **Und deshalb laufen alle Bänder im Gleichschritt.** Das ist keine
 * Einsparung, die man in Kauf nimmt, sondern das Richtige: Der Versatz steckt
 * in der geteilten Textur, also bewegen sich alle Sparren gleich schnell und
 * gleich weit — und genau das sagt die Küche damit auch aus. Zwei Bänder, die
 * verschieden schnell blinken, sähen aus wie zwei verschiedene Geräte
 * (derselbe Gedanke wie beim gemeinsamen Puls der Warndreiecke,
 * `kitchenGauge.update`).
 *
 * **Ohne `document` wird keine Textur gebaut.** In Jest gibt es keine Leinwand
 * (`core/chefFit.canLoadModels`), und ein Bausatz, der es dort trotzdem
 * versucht, bringt den Testlauf zum Stehen. Dann bleibt das Laufband einfarbig
 * dunkel: kein Pfeil, aber ein Band — und alles, was man an einem Band prüfen
 * kann, ohne es zu sehen, lässt sich weiter prüfen.
 */
export class BeltKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * Die Sparren je Sorte — `null` ohne Leinwand, und dann bleibt das Band
   * einfarbig dunkel. Erst gebaut, wenn die erste Kachel dieser Sorte gebraucht
   * wird: Eine Küche ohne Zugband malt keine orangefarbene Leinwand.
   */
  private readonly arrows = new Map<BeltKind, THREE.CanvasTexture | null>();

  /**
   * Wie weit die Sparren schon gelaufen sind, in **Texturlängen** (0…1). Eine
   * eigene Zahl und nicht `texture.offset.y` selbst: So bleibt der Versatz auch
   * ohne Leinwand richtig, und `update` rechnet nicht auf einem Feld herum, das
   * es vielleicht gar nicht gibt.
   */
  private run = 0;

  /**
   * **Ein Band**, Ursprung **auf dem Boden in seiner Mitte** — wie jedes
   * Küchenmöbel (`core/kitchenModel.kitchenModel`, `tools/kitchen-model.mjs`).
   *
   * Es kommt ungedreht heraus, und das ist Absicht: Gedreht wird es dort, wo
   * auch jedes geladene Möbel gedreht wird (`kitchen.ts`, `place`), und der
   * Pfeil zeigt im eigenen Raum nach −z. Wer das Band um 90° dreht, dreht
   * beides mit — siehe `beltStep`.
   *
   * **Beide Sorten sind dasselbe Möbel.** Sie teilen sich Korpus, Platte und
   * Trog bis auf die letzte Form; verschieden sind die Farbe der Sparren und
   * der Greifer hinten, den nur das Zugband trägt. Genau so soll es auch
   * aussehen: Ein Zugband ist ein Förderband mit einem Griff nach hinten und
   * kein zweites Gerät.
   */
  piece(kind: BeltKind = 'push'): THREE.Object3D {
    const group = new THREE.Group();
    group.name = kind === 'pull' ? 'kitchen-belt-pull' : 'kitchen-belt';

    const body = new THREE.Mesh(
      this.shape('body', () => new THREE.BoxGeometry(BODY_SIDE, BODY_HEIGHT, BODY_SIDE)),
      this.skin('body', BODY_COLOR, 0.85),
    );
    body.position.y = BODY_HEIGHT / 2;

    const top = new THREE.Mesh(
      this.shape('top', () => new THREE.BoxGeometry(TOP_SIDE, TOP_THICK, TOP_SIDE)),
      this.skin('top', TOP_COLOR, 0.55),
    );
    top.position.y = BODY_HEIGHT + TOP_THICK / 2;

    const band = new THREE.Mesh(
      this.shape('band', () => new THREE.BoxGeometry(BAND_WIDE, BAND_THICK, BAND_LONG)),
      this.skin('band', BAND_COLOR, 0.95),
    );
    band.position.y = BODY_HEIGHT + TOP_THICK + BAND_THICK / 2;

    for (const mesh of [body, top, band]) mesh.castShadow = true;
    group.add(body, top, band);

    // Die Pfeile liegen als eigene Ebene **auf** dem Trog und nicht als Textur
    // am Kasten: Ein Quader legt dieselbe Textur auf alle sechs Seiten, und
    // dann liefen die Sparren auch an den Stirnflächen mit.
    const chevrons = this.texture(kind);
    const arrows = new THREE.Mesh(
      // Eine Ebene, flach gelegt: Danach zeigt ihr v nach −z, also genau
      // dorthin, wohin das Band schiebt. Der Sparren auf der Leinwand zeigt
      // nach oben, und „oben" ist bei `flipY` (der Voreinstellung) v = 1.
      this.shape('arrows', () =>
        new THREE.PlaneGeometry(ARROW_WIDE, BAND_LONG).rotateX(-Math.PI / 2),
      ),
      this.skin(`arrows:${kind}`, chevrons ? 0xffffff : BAND_COLOR, 0.95, chevrons),
    );
    arrows.position.y = BELT_HEIGHT;
    // Aufgemalt und nicht gebaut: Ein Pfeil wirft keinen Schatten und hält
    // keinen Strahl auf (`core/usable.ts` zielt auf Möbel, nicht auf Farbe).
    arrows.castShadow = false;
    arrows.receiveShadow = false;
    arrows.raycast = () => {};
    group.add(arrows);

    // Der Greifer sitzt an der **hinteren** Kante: Das Band schiebt nach −z,
    // also kommt von +z herein, was es sich holt.
    if (kind === 'pull') {
      const mouth = new THREE.Mesh(
        this.shape('mouth', () => new THREE.BoxGeometry(ARROW_WIDE, MOUTH_THICK, MOUTH_LONG)),
        this.skin('mouth', new THREE.Color(BELT_COLORS.pull).getHex(), 0.6),
      );
      mouth.position.set(0, BELT_HEIGHT, (BAND_LONG - MOUTH_LONG) / 2);
      mouth.castShadow = false;
      mouth.receiveShadow = false;
      mouth.raycast = () => {};
      group.add(mouth);
    }

    return group;
  }

  /**
   * **Die Leinwand dieser Sorte** — einmal gemalt, von allen ihren Bändern
   * geteilt.
   *
   * `null` steht für „ohne Leinwand" und wird **gemerkt**: Sonst versuchte
   * jedes Band in Jest von Neuem, eine zu bekommen.
   */
  private texture(kind: BeltKind): THREE.CanvasTexture | null {
    let arrows = this.arrows.get(kind);
    if (arrows === undefined) {
      arrows = chevronTexture(BELT_COLORS[kind]);
      this.arrows.set(kind, arrows);
    }
    return arrows;
  }

  /**
   * **Ein Bild weiter: die Pfeile wandern.**
   *
   * Eine Zahl, und zwar wirklich nur eine — nichts wird neu gezeichnet, keine
   * Textur hochgeladen, kein Netz angefasst (`texture.offset`, `RepeatWrapping`).
   * Ein Band, das je Bild seine Leinwand neu malte, wäre eine Textur von 128
   * Pixeln, die 60-mal in der Sekunde über den Bus geht, mal acht Bänder.
   *
   * Der Versatz läuft **rückwärts**: `uv · repeat + offset` verschiebt das
   * Muster gegen den Versatz, und gewollt ist, dass die Sparren nach +v laufen,
   * also nach −z. Nach jeder Texturlänge fängt er von vorn an — sonst wächst
   * die Zahl über eine lange Runde so weit, dass ihr die Nachkommastellen
   * ausgehen und die Pfeile ruckeln.
   */
  update(dt: number): void {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (step === 0) return;
    // Eine Kachel je `BELT_SECONDS`, und eine Kachel sind `CHEVRONS`
    // Wiederholungen der Textur — die Sparren laufen also genau so schnell wie
    // das, was auf dem Band liegt.
    this.run = (this.run + (step / BELT_SECONDS) * CHEVRONS) % 1;
    // Beide Sorten laufen mit **einer** Zahl: Ein Zugband, dessen Sparren
    // anders liefen als die des Bandes daneben, sähe aus wie ein Gerät mit
    // einem anderen Motor — und es ist keines, es greift nur zusätzlich nach
    // hinten.
    for (const arrows of this.arrows.values()) if (arrows) arrows.offset.y = -this.run;
  }

  /**
   * **Alles weg** — einmal je Zone, nicht je Band.
   *
   * Zweimal zu rufen ist kein Fehler: Danach ist der Bausatz leer und ließe
   * sich wieder füllen (dieselbe Zusage wie bei `kitchenGauge.KitchenGauges`).
   */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
    for (const arrows of this.arrows.values()) arrows?.dispose();
    this.arrows.clear();
    this.run = 0;
  }

  // --- geteilte Formen und Farben ---------------------------------------------

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  /**
   * Eine Farbe, geteilt. **`MeshStandardMaterial`** und nicht `MeshBasic` wie
   * bei den Anzeigen: Ein Band ist ein Möbel und steht zwischen Möbeln, die
   * Licht und Schatten bekommen (`core/kitchenModel.ts`). Eines, das in jedem
   * Licht gleich hell wäre, klebte wie ein Aufkleber zwischen ihnen.
   */
  private skin(
    key: string,
    color: number,
    roughness: number,
    map: THREE.Texture | null = null,
  ): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshStandardMaterial({ color, roughness, map });
      this.skins.set(key, skin);
    }
    return skin;
  }
}

/**
 * **Ein Sparren auf einer Leinwand** — oder `null`, wo es keine gibt.
 *
 * Gemalt wird **einer**, und `RepeatWrapping` macht daraus so viele, wie das
 * Band lang ist. Er zeigt nach oben, und weil three.js eine Leinwand von Haus
 * aus umdreht (`texture.flipY`), ist oben auf der Leinwand v = 1 — und v = 1
 * liegt nach dem Flachlegen der Ebene bei −z. So zeigt der Pfeil im eigenen
 * Raum des Möbels nach Norden, genau wie `beltStep(0)`.
 *
 * `color` sagt, welche Sorte Band das wird (`BELT_COLORS`) — es ist der einzige
 * Unterschied zwischen den beiden Leinwänden, und deshalb ist es ein Argument
 * und keine zweite Funktion daneben.
 */
function chevronTexture(color: string): THREE.CanvasTexture | null {
  if (!canLoadModels()) return null;

  const size = CHEVRON_PIXELS;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Der Grund ist die Farbe des Trogs darunter: Die Textur ist deckend, damit
  // kein zweiter durchsichtiger Durchgang für ein paar Pfeile nötig wird.
  ctx.fillStyle = `#${BAND_COLOR.toString(16).padStart(6, '0')}`;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = color;
  // Ein Achtel der Kachel dick, mit runden Enden: Aus 16 m Höhe ist ein dünner
  // Strich ein Flimmern, ein dicker ein Pfeil.
  ctx.lineWidth = size / 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  // Die Spitze sitzt auf einem Drittel der Höhe und nicht in der Mitte: So
  // bleibt zwischen zwei Sparren sichtbar Luft, und die Reihe liest sich als
  // Folge von Pfeilen statt als Zickzack.
  ctx.moveTo(size * 0.12, size * 0.68);
  ctx.lineTo(size * 0.5, size * 0.3);
  ctx.lineTo(size * 0.88, size * 0.68);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, CHEVRONS);
  return texture;
}
