import * as THREE from 'three';
import { denyShadow } from '../../../core/graphicsScene';
import { kitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';
import { stackOn, type Combined, type Dish } from './kitchenRecipes';

/**
 * **Der Kombinierer** — eine Kachel Ablage, die sich von der Seite holt, was
 * auf das gehört, was schon auf ihr liegt.
 *
 * Er ist das Möbel, das eine Bandstraße überhaupt erst zu einer Küche macht.
 * Ein Band kann alles transportieren und nichts **zusammenlegen**: Es liefert
 * nur auf eine freie Kachel ab (`kitchenBelt.advanceBelts` fragt `loaded`),
 * und ein Brötchen mit einem Patty darauf entsteht nun einmal dadurch, dass
 * zwei Dinge auf **derselben** Kachel landen. Von Hand ist das ein Druck auf
 * `A` (`kitchenCarry.onTop` → `kitchenRecipes.combine`); dieses Möbel ist
 * derselbe Griff, nur ohne Hand.
 *
 * **Oben liegt die Grundlage, von der Seite kommt die Zutat**, und der Pfeil
 * auf dem Deckel sagt, welche Seite gemeint ist. Das ist keine Zierde, sondern
 * die ganze Bedienung: Wer ein Brötchen auf den Kombinierer legt und das
 * gebratene Patty auf die Kachel schiebt, aus der der Pfeil hereinläuft,
 * bekommt einen Burger — und wer es umgekehrt aufbaut, bekommt denselben.
 *
 * **Warum die Richtung überhaupt festliegt.** `kitchenRecipes.combine` ist
 * absichtlich richtungslos: Ein Spieler darf mit dem Teller zur Tomate laufen
 * oder mit der Tomate zum Teller. Ein Möbel hat diese Freiheit nicht — was es
 * baut, muss auf ihm liegen bleiben, sonst stünde der fertige Burger auf der
 * Zulieferkachel und die halbe Bahn liefe rückwärts. Deshalb fragt der
 * Kombinierer `kitchenRecipes.stackOn` und nicht `combine`: dieselbe Rechnung,
 * nur einmal statt zweimal.
 *
 * **Und er zieht nicht über die Bandrechnung.** Der naheliegende Weg wäre
 * gewesen, ihn als Zugband mit `BeltTile.pull` einzutragen — nur beruht die
 * ganze Rechnung dort auf einem Satz: Auf eine belegte Kachel fährt nichts.
 * Ein Kombinierer ist aber **gerade dann** aufnahmebereit, wenn er belegt ist.
 * Ihn dort als „frei" zu melden, hieße, `advanceBelts` in genau der Aussage
 * anzulügen, auf der sie steht — und jedes Band, das zufällig auf ihn zeigt,
 * führe daraufhin ins Volle. Also eine eigene Uhr, wie am Brett und am Mixer,
 * und die Bandrechnung bleibt, was sie ist.
 *
 * Zwei Teile wie nebenan: Oben steht die Rechnung (keine Zeile three.js),
 * unten das Möbel.
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Wie lange ein Handgriff dauert**, in Sekunden — zwei, genau wie eine
 * Kachel Band (`kitchenBelt.BELT_SECONDS`).
 *
 * Dieselbe Zahl und kein Zufall: Die zwei Sekunden **sind** hier die Fahrt.
 * Was der Kombinierer sich holt, kommt von der Nachbarkachel herüber, und es
 * wird auch so gezeichnet (`kitchen.combinerFrame` blendet zwischen den beiden
 * Kachelmitten über). Wäre er schneller, zöge er Dinge schneller über eine
 * Kachel, als ein Band sie schiebt — und dann baute man Kombiniererketten
 * statt Bändern.
 *
 * Und er ist damit auch nicht schneller als der Koch: Der Handgriff von Hand
 * ist ein Druck auf `A` und damit sofort. Wer danebensteht, ist immer noch der
 * Schnellere — das Möbel kauft keine Zeit, es kauft Hände (derselbe Satz wie
 * beim Band).
 */
export const COMBINE_SECONDS = 2;

/**
 * **Wie weit ein Handgriff schon ist** — und an welcher Kachel er hängt.
 *
 * `from` ist der Schlüssel der Zulieferkachel, und es steht hier aus einem
 * Grund, den man erst beim zweiten Kombinierer merkt: Ein angefangener
 * Handgriff gehört **einer bestimmten** Nachbarkachel. Wird dort in der
 * Zwischenzeit etwas weggenommen und woanders etwas hingelegt, ist das ein
 * neuer Handgriff und keine Fortsetzung — ohne dieses Feld liefe die Uhr
 * weiter und legte etwas auf, das sie nie angefangen hat.
 */
export interface CombineState {
  /** Sekunden seit dem Anfangen — `0`, solange nichts läuft. */
  readonly time: number;
  /** Ob gerade etwas herübergeholt wird. */
  readonly working: boolean;
  /** Von welcher Kachel; `null`, solange nichts läuft. */
  readonly from: string | null;
  /**
   * **Ob auf dieser Kachel etwas liegt, das der Kombinierer selbst
   * zusammengelegt hat** — und damit die Regel, an der die ganze Straße hängt
   * (`combinerHolds`).
   *
   * Es steht in der **Uhr** und nicht am Möbel, weil es dieselbe Lebensdauer
   * hat wie sie: Die Zone stellt beide zurück, sobald sich der Inhalt der
   * Kachel ändert (`kitchen.settle`) — hingelegt, weggenommen, abgefahren.
   * Damit gilt es genau für das eine Gericht, das gerade obendrauf liegt, und
   * nicht für das nächste.
   */
  readonly made: boolean;
}

/** Ein Kombinierer, der gerade nichts tut — und jede andere Station. */
export const IDLE_COMBINE: CombineState = Object.freeze({
  time: 0,
  working: false,
  from: null,
  made: false,
});

/** Was ein Bild am Kombinierer geändert hat. */
export interface CombineTick {
  readonly state: CombineState;
  /**
   * **Was in diesem Bild zusammengelegt wurde** — `null`, solange es läuft
   * oder gar nichts läuft.
   *
   * Es ist dasselbe Ergebnis, das `kitchenRecipes.stackOn` schon ausgerechnet
   * hat: `held` bleibt der Zulieferkachel (die leere Pfanne), `target` liegt
   * danach auf dem Kombinierer. Die Zone hängt daran nur noch Netze um — sie
   * rechnet nichts nach.
   */
  readonly done: Combined | null;
}

/**
 * **Ob und was der Kombinierer sich von nebenan holen würde.**
 *
 * `null` heißt „hier ist nichts zu tun" und deckt die drei langweiligen Fälle
 * ab: Auf dem Kombinierer liegt nichts, nebenan liegt nichts, oder beides.
 * **Ein leerer Kombinierer holt sich also nichts**, und das ist gewollt: Er
 * ist kein Zugband. Wer eine Kachel weiterreichen will, baut ein Zugband
 * (`kitchenBelt.ts`) — wer zusammenlegen will, braucht zwei Dinge, und eines
 * davon ist die Grundlage, die man ihm hinlegt.
 *
 * Alles andere ist die Regel selbst, und sie steht in `stackOn`: Passt die
 * Zutat auf das Liegende, kommt `ok: true` zurück, sonst der Satz, warum
 * nicht. **Der Satz kommt mit heraus, obwohl die Zone ihn heute nicht
 * ausgibt**, und das ist kein Versehen: Er ist die Antwort auf „warum steht
 * die Straße", und ein Test rechnet ihn nach. Eine Meldung daraus zu bauen,
 * hieße, sie sechzigmal in der Sekunde zu wiederholen, solange die falsche
 * Zutat danebenliegt — wer wissen will, was fehlt, nimmt sie in die Hand und
 * liest den Hinweis, den `kitchenCarry.kitchenPrompt` daraus macht.
 */
export function combinerTakes(base: Dish | null, offer: Dish | null): Combined | null {
  if (!base || !offer) return null;
  return stackOn(offer, base);
}

/**
 * **Ob der Kombinierer das, was auf ihm liegt, noch für sich behält** — und
 * damit die Regel, ohne die eine Bandstraße nicht funktioniert.
 *
 * Sie lautet: **Ein Kombinierer gibt nur her, was er selbst zusammengelegt
 * hat.** Was man ihm hinlegt oder hinschiebt, ist eine **Unterlage** und
 * bleibt liegen; erst wenn die Zutat von der Pfeilseite daraufgekommen ist,
 * ist es ein Gericht, und erst dann darf ein Band es abholen.
 *
 * **Zwei Fehler stecken dahinter, und beide kamen aus dem Spiel.** Der erste
 * war offensichtlich: Ein Brötchen kam auf dem Band an, lag eine Sekunde auf
 * dem Kombinierer — und das Zugband dahinter nahm es mit, **bevor das Patty da
 * war**. Für die Bandrechnung völlig richtig (dort liegt etwas, also darf man
 * es holen), und die Straße lieferte trotzdem nur nackte Brötchen.
 *
 * Der zweite ist der Grund, warum hier ein **Merker** steht und nicht die
 * naheliegende Frage „liegt schon etwas darauf?" (`Dish.on.length`): In einer
 * Straße mit mehreren Stufen ist die Unterlage des **zweiten** Kombinierers
 * schon ein Gericht — ein Brötchen mit Patty. Nach jener Frage wäre es sofort
 * abholbereit gewesen, und der Salat, der eine Kachel weiter wartete, wäre nie
 * daraufgekommen. Der Merker unterscheidet, was die Form nicht unterscheiden
 * kann: **angeliefert** oder **hier entstanden**.
 *
 * **Das gilt nur für Bänder, nicht für Hände.** Wer mit `A` an einen
 * Kombinierer tritt, nimmt mit, was darauf liegt, wie von jeder Arbeitsplatte
 * (`kitchenCarry.onTop`) — eine Küche, in der man ein Möbel nicht mehr
 * leerräumen kann, hat eine Sackgasse. Zurückgehalten wird gegen die
 * **Maschine**, und das ist derselbe Gedanke wie beim Mülleimer: Die
 * Stationsart allein reicht nicht, gefragt wird auch, was dort los ist
 * (`kitchenBelt.beltReleases` gegen `kitchen.beltSource`).
 */
export function combinerHolds(state: CombineState): boolean {
  return !state.made;
}

/**
 * **Ein Bild am Kombinierer** — `dt` Sekunden weiter, aber nur, solange
 * dieselbe Kachel dasselbe anbietet.
 *
 * `from` ist der Schlüssel der Zulieferkachel, **wenn** sich gerade etwas
 * holen lässt (`combinerTakes` sagt `ok`), und sonst `null`. Die Entscheidung
 * darüber trifft die Zone, weil nur sie weiß, welche Kachel hinter dem Pfeil
 * liegt und was darauf steht; hier steht, was daraus für die Uhr folgt:
 *
 * - **`null` hält an und setzt zurück.** Wer nichts mehr anzubieten hat, hat
 *   den Handgriff abgebrochen — dieselbe Entscheidung wie am Schneidebrett
 *   (`kitchenWork.advanceWork`, wer weggeht, fängt von vorn an). Ein
 *   Fortschritt, der auf die nächste Fuhre wartete, legte irgendwann etwas
 *   auf, das gar nicht mehr dasteht.
 * - **Eine andere Kachel fängt von vorn an.** Zwei Bänder an einem
 *   Kombinierer sind ein Grundriss, den irgendwann jemand so baut, und die
 *   Antwort darauf ist nicht „das halbe Ergebnis des einen für das andere".
 * - **Ist die Zeit voll, wird zusammengelegt** und die Uhr steht wieder auf
 *   null. Der Rest läuft nicht über: Der nächste Handgriff ist ein neuer und
 *   bekommt seine ganzen zwei Sekunden.
 *
 * Läuft nichts und ist nichts anzufangen, kommt **derselbe** Zustand zurück
 * und kein gleich aussehender — die Zone vergleicht auf Identität, um nicht in
 * jedem Bild eines unbenutzten Möbels etwas anzufassen (dieselbe Zusage wie
 * `kitchenWork.advanceWork`).
 */
export function advanceCombine(
  state: CombineState,
  dt: number,
  from: string | null,
  ready: Combined | null = null,
): CombineTick {
  if (from === null) {
    if (!state.working && state.time === 0 && state.from === null) {
      return { state, done: null };
    }
    // **Der Merker überlebt das Anhalten.** Wer nichts mehr anzubieten hat,
    // bricht den Handgriff ab — an dem, was schon fertig obendrauf liegt,
    // ändert das nichts. Zurückgestellt wird `made` erst, wenn der Inhalt der
    // Kachel wechselt, und das tut die Zone (`kitchen.settle`).
    return { state: { ...IDLE_COMBINE, made: state.made }, done: null };
  }
  if (!state.working || state.from !== from) {
    return { state: { time: 0, working: true, from, made: state.made }, done: null };
  }
  const time = state.time + Math.max(0, Number.isFinite(dt) ? dt : 0);
  if (time < COMBINE_SECONDS) return { state: { ...state, time }, done: null };
  // **Das Ergebnis kommt von außen und wird hier nicht noch einmal
  // ausgerechnet.** Die Zone hat `combinerTakes` in diesem Bild ohnehin schon
  // gefragt — sie musste es, um `from` zu bestimmen —, und zweimal dieselbe
  // Frage zu stellen ist die Gelegenheit, zwei verschiedene Antworten zu
  // bekommen: Zwischen den beiden Aufrufen läge ein Band, das gerade abliefert.
  const done = ready?.ok ? ready : null;
  // **Und hier wird der Merker gesetzt** — an der einen Stelle, an der wirklich
  // etwas zusammengelegt wurde. Ein Kombinierer, der nichts zustande gebracht
  // hat, bleibt auf dem Stand, den er hatte.
  return { state: { ...IDLE_COMBINE, made: state.made || done !== null }, done };
}

/** Der Anteil 0…1 — für den Balken darüber und für die Fahrt dazwischen. */
export function combineProgress(state: CombineState): number {
  if (!state.working || !Number.isFinite(state.time)) return 0;
  return Math.min(1, Math.max(0, state.time / COMBINE_SECONDS));
}

// --- und wie es aussieht ------------------------------------------------------

/**
 * **Wie hoch der Kombinierer ist**, in Metern — aus dem Katalog und nicht
 * daneben aufgeschrieben (dieselbe Zeile wie `kitchenBelt.BELT_HEIGHT`, und
 * dieselbe Zahl: Er steht in einer Bandreihe).
 */
export const COMBINER_HEIGHT = kitchenPiece('combiner')?.height ?? 0.53;

/**
 * **Der Aufbau**, von unten nach oben, in Metern — dreischichtig wie das Band:
 * dunkler Korpus, helle Platte mit Überstand, darauf ein fast schwarzer
 * **Spiegel**.
 *
 * Die dritte Schicht war zuerst nicht da, und der Gedanke dahinter stimmte für
 * sich: Ein Kombinierer hat kein Laufband, also braucht er auch keinen Trog wie
 * eines. Im Bild war das Ergebnis aber eine **weiße Kachel** mitten in einer
 * Reihe dunkler Bänder — von oben (`core/topDownPose.ts`, die Ansicht, in der
 * diese Küche gespielt wird) reißt sie die Bahn auseinander, und man liest
 * eher „hier fehlt ein Möbel" als „hier entsteht der Burger".
 *
 * Also derselbe dunkle Spiegel wie beim Band, und die Aussage „hier wandert
 * nichts weiter" trägt das, was **darauf** liegt: keine Sparren, sondern ein
 * Ring und ein einzelner Pfeil, der auf ihn zuläuft. Ein laufendes Muster ist
 * eine Maschine, ein stehendes ein Platz — und genau das ist dieses Möbel.
 */
const TOP_THICK = 0.05;
const DECK_THICK = 0.022;
const BODY_HEIGHT = Math.max(0.1, COMBINER_HEIGHT - TOP_THICK - DECK_THICK);
/** Wie weit die Markierungen über dem Spiegel liegen — gegen das Flimmern. */
const MARK_LIFT = 0.003;

/** Die Grundflächen, in Metern — Korpus mit Fuge, Platte auf voller Kachel. */
const BODY_SIDE = TILE - 0.04;
const TOP_SIDE = TILE;

/**
 * **Der Ring in der Mitte** — 60 cm außen, 52 cm innen.
 *
 * Er ist der Platz, an dem gestapelt wird, und er ist absichtlich **kleiner
 * als ein Teller** (75 cm, `kitchenProps.PLATE_RADIUS` mal zwei): Was hier
 * liegt, verdeckt ihn, und das ist richtig so — der Ring beantwortet die
 * Frage, wo etwas hingehört, und die stellt sich nur an einem leeren Möbel.
 * Ein Ring, der außen um jeden Teller herumliefe, bliebe immer sichtbar und
 * wäre damit von oben ein zweiter Kachelrand.
 */
const RING_OUTER = 0.3;
const RING_INNER = 0.26;
/** In wie viele Seiten er zerlegt wird — dieselbe Rechnung wie beim Teller. */
const RING_FACES = 48;

/**
 * **Der Sparren, der hereinläuft** — einer und nicht zwei.
 *
 * Auf einem Band sind es zwei je Kachel, weil dort eine **Reihe** entsteht:
 * Ein einzelner Pfeil in einer Kette gleicher Pfeile verschwindet im Muster.
 * Hier steht er allein zwischen Kachelrand und Ring, und ein zweiter davor
 * hätte gar keinen Platz — zwischen `RING_OUTER` und der Kante liegen 20 cm.
 *
 * Die Zahlen sind die Endpunkte seiner beiden Arme in Metern, gemessen von der
 * Kachelmitte: Die Spitze zeigt nach −z, also dorthin, wohin auch die Sparren
 * eines ungedrehten Bandes zeigen (`kitchenBelt.beltStep`). Ein Kombinierer
 * **holt** allerdings aus der Gegenrichtung (`kitchenBelt.beltReach`) — der
 * Pfeil zeigt also nicht, wohin etwas geht, sondern **woher es kommt**, und
 * genau so liest man ihn: Er läuft auf den Ring zu.
 */
const ARROW_TIP = 0.32;
const ARROW_BACK = 0.47;
const ARROW_HALF = 0.17;
const ARROW_WIDE = 0.06;
const ARROW_THICK = 0.004;

/**
 * **Der Greifer an der Zulieferkante** — derselbe helle Streifen wie am
 * Zugband (`kitchenBelt`, `MOUTH_LONG`), und mit demselben Maß.
 *
 * Er sagt, was der Pfeil allein nicht sagt: nicht nur **woher**, sondern
 * genau **welche Kachel**. Und er liegt flach in der Ablagefläche, aus
 * demselben Grund wie dort — über die Kante fährt alles hinweg, was
 * hereingezogen wird.
 */
const MOUTH_WIDE = 0.72;
const MOUTH_LONG = 0.07;
const MOUTH_THICK = 0.004;

/**
 * **Die Farben** — Korpus und Platte wie beim Band, die Markierungen grün.
 *
 * Grün, weil es die letzte Farbe ist, die in dieser Küche noch frei war und
 * weit genug von den drei Bandfarben liegt (blau schiebt, orange zieht,
 * violett wählt aus — `kitchenBelt.BELT_COLORS`). Und weil ein Möbel, das aus
 * zwei Dingen eines macht, in einer Bahn aus Bändern **nicht** aussehen soll
 * wie noch ein Band: Wer von oben über die Straße sieht, soll die Stelle
 * finden, an der der Burger entsteht.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const DECK_COLOR = 0x171b21;
export const COMBINER_COLOR = '#4fd48a';

/**
 * **Der Bausatz für die Kombinierer einer Küche** — geteilte Formen, geteilte
 * Farben, ein `dispose`.
 *
 * Einer je Zone, wie der Bandbausatz nebenan (`kitchenBelt.BeltKit`) und aus
 * demselben Grund: Drei Kombinierer in einer Küche teilen sich sechs Formen
 * und drei Farben.
 *
 * **Und er kommt ohne Leinwand aus.** Der Pfeil ist aus Quadern gebaut und
 * nicht gemalt — anders als beim Band, wo er laufen muss und deshalb eine
 * Textur mit wanderndem Versatz braucht. Hier steht er still, und ein
 * stehender Pfeil aus drei Quadern ist eine Form weniger, die in Jest fehlt:
 * Ein Kombinierer sieht dort genauso aus wie im Browser.
 */
export class CombinerKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * **Ein Kombinierer**, Ursprung **auf dem Boden in seiner Mitte** — wie jedes
   * Küchenmöbel (`core/kitchenModel.kitchenModel`).
   *
   * Ungedreht, wie das Band: Gedreht wird er dort, wo jedes Möbel gedreht wird
   * (`kitchen.place`), und Pfeil und Greifer drehen sich mit. Wer ihn wendet,
   * wendet seine Zulieferseite — ohne dass irgendwo eine zweite Tabelle
   * nachgeführt werden müsste.
   */
  piece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-combiner';

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

    const deck = new THREE.Mesh(
      this.shape('deck', () => new THREE.BoxGeometry(TOP_SIDE, DECK_THICK, TOP_SIDE)),
      this.skin('deck', DECK_COLOR, 0.95),
    );
    deck.position.y = BODY_HEIGHT + TOP_THICK + DECK_THICK / 2;

    // **Ein Möbel wirft einen Schatten und nicht drei** (`core/graphicsScene`,
    // `denyShadow`): Die Platte ist die breiteste der drei Schichten und
    // enthält die Umrisse der beiden anderen schon. Dieselbe Rechnung wie beim
    // Band.
    top.castShadow = true;
    denyShadow(body);
    denyShadow(deck);
    group.add(body, top, deck);

    const paint = this.skin('mark', new THREE.Color(COMBINER_COLOR).getHex(), 0.6);

    const ring = new THREE.Mesh(
      this.shape('ring', () =>
        new THREE.RingGeometry(RING_INNER, RING_OUTER, RING_FACES).rotateX(-Math.PI / 2),
      ),
      paint,
    );
    ring.position.y = COMBINER_HEIGHT + MARK_LIFT;
    this.flat(ring);
    group.add(ring);

    // Der Sparren: zwei Arme, die sich an der Spitze treffen. Gerechnet aus
    // ihren Endpunkten und nicht aus einem Winkel — wer die Maße oben ändert,
    // bekommt einen Pfeil, der wieder zusammenpasst, statt eines, der klafft.
    for (const side of [-1, 1]) {
      const arm = this.bar(side * ARROW_HALF, ARROW_BACK, 0, ARROW_TIP, paint);
      arm.position.y = COMBINER_HEIGHT + MARK_LIFT;
      this.flat(arm);
      group.add(arm);
    }

    const mouth = new THREE.Mesh(
      this.shape('mouth', () => new THREE.BoxGeometry(MOUTH_WIDE, MOUTH_THICK, MOUTH_LONG)),
      paint,
    );
    mouth.position.set(0, COMBINER_HEIGHT, (TOP_SIDE - MOUTH_LONG) / 2);
    this.flat(mouth);
    group.add(mouth);

    return group;
  }

  /** Alles weg — einmal je Zone, nicht je Möbel. Zweimal zu rufen ist erlaubt. */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
  }

  // --- geteilte Formen und Farben ---------------------------------------------

  /**
   * **Ein Balken von hier nach dort**, flach auf der Platte — Länge und Winkel
   * aus den beiden Endpunkten.
   *
   * Der Quader liegt in seiner eigenen Länge auf +z; gedreht wird um die
   * Hochachse, und `Math.atan2(dx, dz)` ist genau der Winkel, der +z auf die
   * gewünschte Richtung bringt. Die Form wird nach ihrer **Länge** geteilt:
   * Die beiden Arme eines Pfeils sind gleich lang, also ist es eine Form und
   * nicht zwei.
   */
  private bar(
    fromX: number,
    fromZ: number,
    toX: number,
    toZ: number,
    skin: THREE.Material,
  ): THREE.Mesh {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const long = Math.hypot(dx, dz);
    const bar = new THREE.Mesh(
      this.shape(
        `bar:${long.toFixed(4)}`,
        () => new THREE.BoxGeometry(ARROW_WIDE, ARROW_THICK, long),
      ),
      skin,
    );
    bar.position.set((fromX + toX) / 2, 0, (fromZ + toZ) / 2);
    bar.rotation.y = Math.atan2(dx, dz);
    return bar;
  }

  /**
   * **Aufgemalt und nicht gebaut**: Eine Markierung wirft keinen Schatten,
   * fängt keinen Schatten auf und hält keinen Strahl auf (`core/usable.ts`
   * zielt auf Möbel, nicht auf Farbe).
   *
   * Gesagt wird es mit `denyShadow` und nicht mit `castShadow = false`: Ein
   * bloßes Feld setzt der nächste Durchlauf der Grafikstufe an jedem
   * undurchsichtigen Netz wieder auf `true` (dieselbe Falle wie in
   * `kitchenBelt.BeltKit.piece`).
   */
  private flat(mesh: THREE.Mesh): void {
    denyShadow(mesh);
    mesh.receiveShadow = false;
    mesh.raycast = () => {};
  }

  private shape(key: string, make: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    return shape;
  }

  /** Eine Farbe, geteilt — `MeshStandardMaterial` wie am Band, und aus demselben Grund. */
  private skin(key: string, color: number, roughness: number): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshStandardMaterial({ color, roughness, side: THREE.DoubleSide });
      this.skins.set(key, skin);
    }
    return skin;
  }
}
