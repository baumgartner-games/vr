import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';

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
 * **Dieses Möbel steckt nicht in `public/models/kitchen.glb`.** Der gekaufte
 * Katalog hat dreizehn Stücke und kein Band (`core/kitchenFit.KITCHEN_PIECES`);
 * der Eintrag `belt` trägt deshalb `built: true` — es wird gebaut, hier, aus
 * Kästen und einer Leinwand. Dieselbe Entscheidung wie beim Zutatensatz
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
}

/** Eine Kachel, auf der nichts unterwegs ist — leer oder wartend. */
export const BELT_EMPTY: BeltState = Object.freeze({ time: 0, moving: false });

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
    });
  }

  const ahead = (seat: Seat): Seat | undefined =>
    seat.tile.to === null ? undefined : board.get(seat.tile.to);

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
    if (seat.moving && seat.tile.to !== null) claimed.add(seat.tile.to);
  }
  for (let settled = false; !settled;) {
    settled = true;
    for (const seat of board.values()) {
      if (!seat.loaded || seat.moving) continue;
      const next = ahead(seat);
      if (!next || claimed.has(next.tile.id)) continue;
      // Frei — **oder** belegt von einem, der selbst schon losgefahren ist. Das
      // ist die Kettenausnahme, und sie steht in dieser einen Zeile.
      if (next.loaded && !next.moving) continue;
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
    const now: BeltState = seat.moving ? { time: seat.time, moving: true } : BELT_EMPTY;
    if (now.moving !== was.moving || now.time !== was.time) {
      (states ??= new Map()).set(seat.tile.id, now);
    }
    if (seat.moving && seat.tile.to !== null) {
      (carry ??= new Map()).set(seat.tile.id, {
        from: seat.tile.id,
        to: seat.tile.to,
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
 * Kachel voll ein, damit zwei Platten sich berühren. Das Laufband ist 72 cm
 * breit — schmal genug, dass links und rechts sichtbar Platte bleibt, breit
 * genug für einen Teller (75 cm Durchmesser, `kitchenProps.PLATE_RADIUS`), der
 * ihn also gerade überdeckt. Und **über die volle Kachel lang**, damit zwei
 * Bänder hintereinander ein Band ergeben und keine zwei Bänder.
 */
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;
const BAND_WIDE = 0.72;
const BAND_LONG = TILE;

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
 * ganzen Küche haben. Das Hellblau der Sparren ist dasselbe, in dem auch der
 * Schneidebalken leuchtet (`kitchenGauge.TONE_COLOR.chop`, `0xe8f3ff`) — die
 * Farbe, die in dieser Küche „hier passiert gerade etwas von selbst" heißt.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const BAND_COLOR = 0x171b21;
const ARROW_COLOR = '#e8f3ff';

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

  /** Die Sparren — `null` ohne Leinwand, und dann bleibt das Band einfarbig. */
  private readonly arrows: THREE.CanvasTexture | null;

  /**
   * Wie weit die Sparren schon gelaufen sind, in **Texturlängen** (0…1). Eine
   * eigene Zahl und nicht `texture.offset.y` selbst: So bleibt der Versatz auch
   * ohne Leinwand richtig, und `update` rechnet nicht auf einem Feld herum, das
   * es vielleicht gar nicht gibt.
   */
  private run = 0;

  constructor() {
    this.arrows = chevronTexture();
  }

  /**
   * **Ein Band**, Ursprung **auf dem Boden in seiner Mitte** — wie jedes
   * Küchenmöbel (`core/kitchenModel.kitchenModel`, `tools/kitchen-model.mjs`).
   *
   * Es kommt ungedreht heraus, und das ist Absicht: Gedreht wird es dort, wo
   * auch jedes geladene Möbel gedreht wird (`kitchen.ts`, `place`), und der
   * Pfeil zeigt im eigenen Raum nach −z. Wer das Band um 90° dreht, dreht
   * beides mit — siehe `beltStep`.
   */
  piece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-belt';

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
    const arrows = new THREE.Mesh(
      // Eine Ebene, flach gelegt: Danach zeigt ihr v nach −z, also genau
      // dorthin, wohin das Band schiebt. Der Sparren auf der Leinwand zeigt
      // nach oben, und „oben" ist bei `flipY` (der Voreinstellung) v = 1.
      this.shape('arrows', () =>
        new THREE.PlaneGeometry(BAND_WIDE, BAND_LONG).rotateX(-Math.PI / 2),
      ),
      this.skin('arrows', this.arrows ? 0xffffff : BAND_COLOR, 0.95, this.arrows),
    );
    arrows.position.y = BELT_HEIGHT;
    // Aufgemalt und nicht gebaut: Ein Pfeil wirft keinen Schatten und hält
    // keinen Strahl auf (`core/usable.ts` zielt auf Möbel, nicht auf Farbe).
    arrows.castShadow = false;
    arrows.receiveShadow = false;
    arrows.raycast = () => {};
    group.add(arrows);

    return group;
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
    if (!this.arrows) return;
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (step === 0) return;
    // Eine Kachel je `BELT_SECONDS`, und eine Kachel sind `CHEVRONS`
    // Wiederholungen der Textur — die Sparren laufen also genau so schnell wie
    // das, was auf dem Band liegt.
    this.run = (this.run + (step / BELT_SECONDS) * CHEVRONS) % 1;
    this.arrows.offset.y = -this.run;
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
    this.arrows?.dispose();
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
 */
function chevronTexture(): THREE.CanvasTexture | null {
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

  ctx.strokeStyle = ARROW_COLOR;
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
