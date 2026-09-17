import * as THREE from 'three';
import { TILE } from '../../nav/navTile';
import type { Turn } from './kitchenPlan';

/**
 * **Der Computer-Tisch und der Kopierer** — die beiden Möbel, an denen die
 * Küche über sich selbst verhandelt, statt Essen zu kochen.
 *
 * Am **Tisch** steht der Bildschirm, über den die Küche verwaltet wird; auf dem
 * **Kopierer** legt man ein Möbel als Miniatur ab und bekommt daneben eine
 * zweite Ausfertigung. Beide sind Werkzeuge des Umbaus (`kitchenBuild.ts`) und
 * keine Stationen des Kochens (`kitchenCarry.ts`) — sie tragen keine Ware,
 * sondern eine Absicht.
 *
 * **Diese Möbel stecken nicht in `public/models/kitchen.glb`.** Der gekaufte
 * Katalog hat dreizehn Stücke, und ein Rechner ist keines davon
 * (`core/kitchenFit.KITCHEN_PIECES`); die Einträge tragen deshalb `built: true`
 * und werden hier gebaut, wie schon das Förderband nebenan
 * (`kitchenBelt.BeltKit`) und der Zutatensatz (`kitchenProps.FoodKit`). Eine
 * zweite Quelldatei aufzunehmen, mit Lizenz, Aufbereitung und Eintrag in
 * `public/models/CREDITS.md`, wäre viel Aufwand für einen Kasten mit einer
 * leuchtenden Scheibe darauf.
 *
 * **Zwei Teile, und nur der untere kennt three.js.** Von welcher Seite jemand
 * vor einem Möbel steht (`pieceSide`) und wo auf einem gedrehten Kopierer die
 * beiden Felder liegen (`copierSpot`) sind reine Zahlen — dieselbe Trennung wie
 * zwischen `kitchenClock.ts` und `kitchenGauge.ts`. Was die Küche mit der
 * Antwort anstellt, entscheidet sie selbst (`kitchen.ts`); hier steht nur, was
 * gilt.
 *
 * **Und beide Möbel kommen ungedreht heraus.** Sie schauen in ihrem eigenen
 * Raum nach −z, genau wie jedes geladene Küchenmöbel, und gedreht werden sie
 * dort, wo alles gedreht wird (`kitchen.ts`, `standAt`: `rotation.y = turn·90°`).
 * Deshalb rechnet `copierSpot` mit **derselben** Drehung und nicht mit einer
 * zweiten daneben — ein Kopierer, dessen Kopie neben dem Gerät in der Luft
 * erschiene, sobald man ihn einmal dreht, wäre der Fehler, den man eine
 * Viertelstunde lang im Grundriss sucht.
 */

// --- die reine Rechnung -------------------------------------------------------

/**
 * **Die vier Vierteldrehungen, als ganze Zahlen.**
 *
 * `Math.cos(Math.PI / 2)` ist 6,1·10⁻¹⁷ und nicht 0. Das ist für ein Netz
 * gleichgültig, für eine **Mitte** aber nicht: Die Kopie-Zone eines gedrehten
 * Kopierers soll auf der Kachel liegen, auf die sie gehört, und nicht ein
 * Zehnbillionstel daneben — und ein Test, der das prüft, soll sich nicht mit
 * Toleranzen um eine Zahl herumdrücken müssen, die exakt sein kann. Eine
 * Vierteldrehung hat vier Kosinus und vier Sinus, alle vier sind ganzzahlig,
 * also stehen sie hier.
 *
 * Die Reihenfolge ist die von `kitchenPlan.Spot.turn`: 0 nach Norden, 1 nach
 * Westen, 2 nach Süden, 3 nach Osten.
 */
const QUARTER_COS: readonly number[] = [1, 0, -1, 0];
const QUARTER_SIN: readonly number[] = [0, 1, 0, -1];

/**
 * **Wo ein Punkt aus dem Möbel in der Welt landet** — derselbe Versatz, den
 * `kitchen.standAt` für `KitchenPiece.align` rechnet, nur ohne Szene.
 *
 * Gebraucht wird er für den Kopierer: Seine beiden Felder liegen **neben**
 * seinem Ursprung (`COPIER_PLATE`, `COPIER_ZONE`), und die Zone will wissen,
 * wo sie nach dem Drehen liegen — dort setzt sie die Miniatur ab und dort
 * erscheint die Kopie. Wer das an der Aufrufstelle von Hand rechnet, rechnet
 * es beim zweiten Feld anders herum und merkt es erst bei `turn: 3`.
 *
 * Die Drehung um die Hochachse bildet (x, z) auf (x·cos + z·sin, −x·sin + z·cos)
 * ab. Das Vorzeichen bei z ist das, was man falsch abschreibt: Es folgt daraus,
 * dass three.js um **+y** dreht und z nach Süden zeigt.
 *
 * @param offset Mitte im ungedrehten Möbel, in Metern
 * @param turn Vierteldrehungen des Möbels (`kitchenPlan.Spot.turn`)
 * @returns derselbe Punkt, in Metern relativ zum Ursprung des Möbels
 */
export function copierSpot(
  offset: readonly [number, number],
  turn: Turn,
): { x: number; z: number } {
  const cos = QUARTER_COS[turn] ?? 1;
  const sin = QUARTER_SIN[turn] ?? 0;
  const [ox, oz] = offset;
  return { x: ox * cos + oz * sin, z: -ox * sin + oz * cos };
}

/** Welches der beiden Felder des Kopierers gemeint ist (`copierField`). */
export type CopierField = 'plate' | 'zone';

/**
 * **Vor welchem der beiden Felder jemand steht.**
 *
 * Der Kopierer ist ein Möbel mit zwei Bedeutungen nebeneinander: links die
 * Vorlage, rechts die Kopie (`COPIER_PLATE`, `COPIER_ZONE`). Was ein Druck
 * tut, hängt davon ab, vor welcher Hälfte man steht — und das ist die eine
 * Rechnung dahinter, also steht sie hier und nicht an der Aufrufstelle.
 *
 * **Warum kein zweites Usable je Feld**, was naheliegender aussähe: Die
 * Auswahl nimmt das **nächstgelegene** Ding, dessen Zielzylinder der Strahl
 * trifft (`core/usable.pickUsable`), und der Zylinder des ganzen Kopierers ist
 * mit über einem Meter größer als der Abstand der beiden Feldmitten. Er
 * gewönne damit gegen jedes kleine Ding, das man auf eines der Felder stellt —
 * und zwar auch dann, wenn man genau davorsteht. Ein Möbel, zwei Felder, eine
 * Anmeldung: Der gelbe Saum umfasst dann das ganze Gerät, und das ist die
 * ehrlichere Auskunft — bedient wird der Kopierer, nicht die Glasplatte.
 *
 * Gemessen wird in der **Eigendrehung** des Möbels, also gegen die gedrehten
 * Feldmitten (`copierSpot`) und nicht gegen eine geratene Seite. Genau in der
 * Mitte zwischen beiden gewinnt die **Kopierfläche**: Dort fängt jede Benutzung
 * an, und ein leeres Feld, das nichts hergibt, wäre die unbrauchbarere Antwort.
 *
 * @param turn Vierteldrehungen des Möbels
 * @param dx Abstand vom Ursprung des Möbels zur Figur, in Metern
 * @param dz dasselbe in z
 */
export function copierField(turn: Turn, dx: number, dz: number): CopierField {
  const plate = copierSpot(COPIER_PLATE, turn);
  const zone = copierSpot(COPIER_ZONE, turn);
  const toPlate = (dx - plate.x) ** 2 + (dz - plate.z) ** 2;
  const toZone = (dx - zone.x) ** 2 + (dz - zone.z) ** 2;
  return toZone < toPlate ? 'zone' : 'plate';
}

/** Von welcher Seite jemand vor einem Möbel steht (`pieceSide`). */
export type PieceSide = 'front' | 'side' | 'back';

/**
 * **Ab welchem Kosinus die Vorderseite aufhört** — ein halber, also 60° neben
 * der Blickrichtung des Möbels.
 *
 * Damit spannt die **Vorderseite 120°** und die Rückseite ebenso, und für jede
 * der beiden Flanken bleiben 60°. Die naheliegende Aufteilung wäre ein Viertel
 * je Seite (90°/90°/90°/90°), und sie ist falsch herum gedacht: Vor einem
 * Computer-Tisch **steht** man nicht wie vor einem Foto, man kommt schräg von
 * der Seite heran, bleibt einen Schritt neben der Tastatur stehen und schaut
 * hin. Bei 90° Vorderseite ist das schon die Flanke, und der Tisch antwortet
 * nicht mehr; mit 120° hat man eine Handbreit Spielraum nach beiden Seiten und
 * trifft ihn im Vorbeigehen.
 *
 * Nach hinten dieselben 120°, und zwar aus Symmetrie und nicht aus Bedarf: Die
 * Rückseite ist die Seite, an der man das Möbel **aufhebt** statt es zu
 * benutzen (`kitchenBuild.ts`), und eine Rückseite, die schmaler wäre als die
 * Vorderseite, machte aus jedem Schritt um den Tisch herum ein Ratespiel.
 */
const SIDE_COS = 0.5;

/**
 * **Wie viel Rechenstaub an der Grenze noch zur Vorderseite zählt.**
 *
 * Genau 60° ergeben nach `Math.hypot` einen Kosinus von 0,5000000000000001 oder
 * 0,4999999999999999, je nachdem, aus welchen beiden Zahlen die Richtung
 * gerechnet wurde. Ohne diese Toleranz entschiede über „vorn" oder „seitlich"
 * das letzte Bit einer Wurzel — und der Tisch antwortete an derselben Stelle
 * mal so und mal so. Die Grenze gehört deshalb **zur Vorderseite** und ebenso
 * zur Rückseite: Die beiden großen Felder sind geschlossen, die Flanken offen.
 */
const SIDE_EDGE = 1e-9;

/** Kürzer als ein Zehntelmillimeter ist keine Richtung mehr, sondern Rauschen. */
const SIDE_NEAR = 1e-6;

/**
 * **Von welcher Seite jemand vor einem Möbel steht.**
 *
 * `dx`/`dz` ist der Vektor **vom Möbel zur Figur**, auf dem Boden gemessen; die
 * Länge ist gleichgültig, es zählt allein die Richtung. Ein Möbel mit
 * `turn: 0` schaut nach Norden, seine Vorderseite also nach −z
 * (`kitchenPlan.Spot.turn`, dieselbe Reihenfolge wie `kitchenBelt.beltStep`).
 *
 * Die Aufteilung: **120° vorn, 120° hinten, je 60° an den Flanken** — warum
 * nicht vier gleiche Viertel, steht an `SIDE_COS`.
 *
 * **Wer genau auf dem Möbel steht, steht davor.** Beide Abstände nahe null
 * ergeben keine Richtung, und dann muss eine der drei Antworten die
 * voreingestellte sein. Es ist `'front'`, weil das die **harmlose** ist: Vorn
 * wird das Möbel benutzt, hinten wird es aufgehoben und weggetragen
 * (`kitchenBuild.ts`). Wer im Gedränge in die Ecke des Tisches läuft, will an
 * den Rechner — und nicht den Tisch in der Hand haben. Aus demselben Grund
 * fällt auch eine kaputte Zahl (`NaN`) hierher: Der Vergleich ist so
 * geschrieben, dass er sie nicht zur Rückseite durchrutschen lässt.
 */
export function pieceSide(turn: Turn, dx: number, dz: number): PieceSide {
  // Die Blickrichtung des gedrehten Möbels: sein eigenes −z, gedreht wie in
  // `copierSpot` — dieselben beiden Tabellen, damit es keine zweite Wahrheit
  // darüber gibt, wohin ein Möbel schaut.
  const aheadX = -(QUARTER_SIN[turn] ?? 0);
  const aheadZ = -(QUARTER_COS[turn] ?? 1);
  const away = Math.hypot(dx, dz);
  // Verneint geschrieben, damit `NaN` hier hängen bleibt und nicht unten in
  // einem Vergleich verschwindet, der für jede Seite `false` sagt.
  if (!(away > SIDE_NEAR)) return 'front';
  const cos = (dx * aheadX + dz * aheadZ) / away;
  if (cos >= SIDE_COS - SIDE_EDGE) return 'front';
  if (cos <= -SIDE_COS + SIDE_EDGE) return 'back';
  return 'side';
}

// --- und wie es aussieht ------------------------------------------------------

/**
 * **Wie hoch die Tischplatte liegt**, in Metern — und sie liegt mit Absicht
 * **nicht** in der Arbeitsplattenreihe.
 *
 * Die Küche arbeitet auf 0,50 m (`core/kitchenFit.kitchenWorkHeight`, die
 * Küchenzeile), und alles, was sich in diese Reihe stellt, muss dorthin. Der
 * Computer-Tisch stellt sich nicht hinein: Auf ihm wird nicht geschnitten und
 * abgestellt, sondern **gelesen**. 0,75 m sind ein Viertelmeter mehr, und genau
 * dieser Unterschied ist der Zweck — aus 16 m Höhe (`core/topDownPose.ts`) ist
 * der Tisch damit das eine Möbel, das aus der Zeile herausragt, ohne ein Herd
 * zu sein.
 *
 * Nach oben passt es ebenso: In der Küche schaut man aus 1,15 m
 * (`core/posture.DEFAULT_EYES.kitchen`), die Bildmitte liegt bei 1,06 m
 * (`SCREEN_FOOT` + halbe `SCREEN_HIGH`). Der Bildschirm steht damit fast genau
 * auf Augenhöhe — bei den 1,40 m, die hier einmal standen, schaute man auf ihn
 * herunter, und beides geht: Er ist 0,42 m hoch, also fällt er in keiner der
 * beiden Höhen aus dem Blick.
 */
export const DESK_TOP = 0.75;

/**
 * **Wie weit oben der Bildschirm anfängt** und wie groß er ist, in Metern —
 * `SCREEN_WIDE`/`SCREEN_HIGH` sind das **Gehäuse**, die leuchtende Fläche ist
 * ringsum eine Rahmenbreite kleiner (`SCREEN_EDGE`).
 *
 * 16 cm über der Platte fängt das Bild an: Darunter stehen Fuß und Ständer, und
 * ein Bildschirm, der direkt auf der Platte aufsäße, wäre von vorn ein
 * Aufsteller und kein Gerät. 46 × 30 cm sind knapp die halbe Kachel — groß
 * genug, dass die leuchtende Fläche aus der Ferne ein Bildschirm ist, und klein
 * genug, dass der Tisch dahinter noch ein Tisch bleibt.
 */
export const SCREEN_FOOT = DESK_TOP + 0.16;
export const SCREEN_WIDE = 0.46;
export const SCREEN_HIGH = 0.3;

/**
 * **Wie hoch das ganze Möbel ist**, in Metern — 1,21 m, die Oberkante des
 * Bildschirmgehäuses.
 *
 * Gerechnet und nicht geschätzt, aus denselben Zahlen, aus denen das Netz
 * gebaut wird: Wer am Bildschirm etwas ändert, ändert damit die Zahl, die im
 * Katalog steht (`core/kitchenFit.KitchenPiece.height`) — und nicht bloß das
 * Bild. Ein Eintrag, der ein paar Zentimeter zu niedrig ist, ist ein Möbel, das
 * beim Aufstellen durch die Hand des Trägers ragt.
 *
 * **`height` ist die Hülle, `DESK_TOP` die Ablage** (`KitchenPiece.deck`) —
 * dieselbe Teilung wie beim Herd mit Topf: Wer etwas auf diesen Tisch legt,
 * legt es auf die Platte und nicht auf den Bildschirm.
 */
export const DESK_HEIGHT = SCREEN_FOOT + SCREEN_HIGH;

/**
 * **Die Grundfläche des Tisches**, in Metern — 94 × 70 cm auf einer Kachel.
 *
 * Er bleibt ringsum hinter der Kachel zurück, und das ist der Unterschied zur
 * Küchenzeile: Die soll sich mit ihren Nachbarn zu **einer** Platte schließen
 * (`core/kitchenFit`, `counter`), der Tisch soll frei stehen. Die 3 cm Luft an
 * den Seiten und die 15 cm vorn und hinten sind genau das, was man von oben als
 * Fuge sieht — ein Möbel, das man anfassen und wegtragen kann, und keine Zeile.
 */
const DESK_WIDE = TILE - 0.06;
const DESK_DEEP = 0.7;

/**
 * **Woraus der Tisch besteht**, in Metern, von unten nach oben.
 *
 * Zwei **Wangen** statt vier Beinen: Aus 16 m Höhe ist ein 4-cm-Bein ein Pixel,
 * zwei Seitenwände sind eine Silhouette — und es ist eine Form statt vier.
 * Sie stehen bis unter die Platte (`DESK_TOP` − `DESK_PLATE`), damit der Tisch
 * nicht auf Stelzen steht.
 *
 * **Vorn und hinten bleibt er offen**, und das ist keine Ersparnis: Unter der
 * Platte steht der Rechner, und er ist das Einzige an diesem Möbel, woran man
 * ohne Beschriftung erkennt, dass hier ein Computer steht. Eine Blende davor
 * wäre ein Schreibtisch mit einem Geheimnis.
 */
const DESK_PLATE = 0.04;
const DESK_CHEEK = 0.04;
const DESK_LEG = DESK_TOP - DESK_PLATE;

/**
 * **Der Rechner unter der Platte**, in Metern — 20 × 42 × 40 cm, rechts hinten.
 *
 * Er steht **nicht** mittig, sondern an der +x-Seite und ein Stück nach hinten
 * gerückt: In der Mitte wäre er das Erste, was der Blick unter der Platte
 * trifft, und der Tisch läse sich als Schrank. So bleibt die vordere Hälfte
 * offen — dort stehen im Spiel die Füße dessen, der davorsteht.
 */
const TOWER_WIDE = 0.2;
const TOWER_HIGH = 0.42;
const TOWER_DEEP = 0.4;
const TOWER_AT: readonly [x: number, z: number] = [0.26, 0.12];

/** Tastatur und Bildschirmfuß, in Metern — flach, damit beides Zubehör bleibt. */
const KEYS_WIDE = 0.34;
const KEYS_HIGH = 0.018;
const KEYS_DEEP = 0.12;
const KEYS_AT = -0.19;
const STAND_WIDE = 0.2;
const STAND_HIGH = 0.014;
const STAND_DEEP = 0.12;
const STEM_WIDE = 0.05;
const STEM_DEEP = 0.04;
const SCREEN_THICK = 0.03;
const SCREEN_AT = 0.18;

/**
 * **Der Rand um die leuchtende Fläche**, in Metern — 1,5 cm.
 *
 * Ohne ihn wäre die Scheibe genauso groß wie ihr Gehäuse, und zwei Flächen auf
 * derselben Kante flimmern gegeneinander, sobald sich die Kamera bewegt
 * (derselbe Fall wie `kitchenBelt.BAND_LIFT`). Mit ihm ist es ein Bildschirm
 * mit Rahmen, und das ist ohnehin, wonach es aussehen soll.
 */
const SCREEN_EDGE = 0.015;

/** Wie weit die Scheibe vor dem Gehäuse schwebt — 2 mm, gegen dasselbe Flimmern. */
const SCREEN_LIFT = 0.002;

/**
 * **Wie hoch die beiden Felder des Kopierers liegen**, in Metern — und sie
 * liegen **gleich** hoch, das ist die einzige Zahl dieses Möbels, an der nicht
 * gedreht werden darf.
 *
 * Der Kopierer behauptet: „dasselbe Ding, noch einmal". Läge die Kopie-Zone
 * auch nur zwei Zentimeter höher als die Kopierfläche, stünde die Kopie neben
 * dem Vorbild auf einer Stufe — und die erste Frage wäre nicht mehr „wie kommt
 * die Kopie da hin?", sondern „warum ist sie größer?". Gleiche Höhe ist hier
 * kein Detail, sondern die Aussage des Geräts.
 *
 * 0,50 m, und damit genau die Arbeitshöhe der Küchenzeile
 * (`core/kitchenFit.kitchenWorkHeight`): Was auf der Kopierfläche liegt, wird
 * mit demselben Griff aufgenommen und abgelegt wie ein Teller auf der Zeile
 * (`kitchenCarry.ts`), und alles, was in dieser Küche abgelegt wird, liegt auf
 * dieser Höhe.
 */
export const COPIER_DECK = 0.5;

/**
 * **Wie hoch das ganze Gerät ist**, in Metern — 0,80 m, die Oberkante der vier
 * Eckpfosten um die Kopie-Zone.
 *
 * Die Pfosten sind 30 cm hoch: Sie müssen die Miniatur, die dazwischen
 * erscheint, sichtbar **umfassen** (eine Kopie zwischen 5-cm-Stummeln stünde
 * einfach auf dem Tisch), dürfen aber nicht über sie hinausragen — ein Käfig,
 * in den man von oben hineinschaut, wäre aus 16 m Höhe ein Deckel über der
 * Kopie.
 */
export const COPIER_HEIGHT = COPIER_DECK + 0.3;

/**
 * **Mitte der Kopierfläche, relativ zum Ursprung des Möbels (ungedreht).**
 *
 * Der Kopierer belegt zwei Kacheln nebeneinander (`tiles: [2, 1]`), sein
 * Ursprung liegt in der Mitte **beider** — also liegen die Feldmitten einen
 * halben Meter links und rechts davon, jede genau in ihrer eigenen Kachel.
 *
 * **„Links" heißt hier: links im Grundriss**, von oben gelesen, mit der
 * Vorderseite des Möbels nach oben (−z), so wie `kitchenPlan.KITCHEN_SPOTS`
 * gelesen wird. Wer **vor** dem Gerät steht, schaut es von −z her an und hat
 * die Kopierfläche damit zur **Rechten** — derselbe Seitentausch wie bei jedem
 * Spiegel. Er steht hier, weil er beim Einbauen genau einmal verwechselt wird
 * und dann die Kopie auf der Vorlage erscheint.
 */
export const COPIER_PLATE: readonly [x: number, z: number] = [-TILE / 2, 0];

/** Mitte der Kopie-Zone, daneben. Eine ganze Kachel weiter, siehe `COPIER_PLATE`. */
export const COPIER_ZONE: readonly [x: number, z: number] = [TILE / 2, 0];

/**
 * **Wie der Kopierer gebaut ist**, in Metern.
 *
 * Ein gemeinsamer **Sockel** über beide Kacheln — zwei getrennte Kästen wären
 * zwei Geräte, und dann wäre die Frage offen, welches von beiden welches ist.
 * Er bleibt ringsum 3 cm hinter der Grundfläche zurück, damit auch dieses Möbel
 * eine Fuge zu seinen Nachbarn hat und nicht mit ihnen verschmilzt.
 *
 * Die beiden **Felder** sind 86 × 78 cm groß: Sie füllen ihre Kachel bis auf
 * sieben Zentimeter Rand aus, und dieser Rand ist es, der sie überhaupt als
 * zwei Felder lesbar macht — dazu die dunkle **Fuge** auf der Mitte, 3 cm breit
 * und 4 mm hoch. Sie ist die Linie, an der man von oben sieht, dass hier zwei
 * verschiedene Dinge nebeneinanderliegen, und keine Naht im Blech.
 */
const COPIER_BASE_WIDE = 2 * TILE - 0.06;
const COPIER_BASE_DEEP = TILE - 0.06;
const COPIER_BASE_HIGH = COPIER_DECK - 0.03;
const FIELD_WIDE = 0.86;
const FIELD_DEEP = 0.78;
const GLASS_THICK = 0.03;
const CRADLE_THICK = 0.03;
const SEAM_WIDE = 0.03;
const SEAM_HIGH = 0.004;
const POST_SIDE = 0.04;
const POST_HIGH = COPIER_HEIGHT - COPIER_DECK;

/**
 * **Die Sparrenspur von der Vorlage zur Kopie** — fünf Pfeilspitzen, die von
 * der Mitte der Kopierfläche zur Mitte der Kopie-Zone laufen, und zwar auf
 * **beiden** Längsseiten des Sockels.
 *
 * Sie ersetzt den einen 23-cm-Pfeil, der hier vorher lag, und sie ersetzt ihn
 * aus zwei Gründen. Der erste ist die Größe: Gelesen wird dieses Möbel aus
 * 16 m Höhe (`core/topDownPose.ts`), und dort war der alte Pfeil ein Strich.
 * Der zweite ist die **Seite**: Er lag nur vorn, und ein Kopierer, den man von
 * hinten anspricht (`copierField` erlaubt das), sagte dann gar nichts mehr.
 *
 * Von Feldmitte zu Feldmitte (`COPIER_PLATE`, `COPIER_ZONE`) und nicht nur über
 * die Fuge: Die Spur **fängt dort an, wo man hinlegt, und hört dort auf, wo man
 * abholt**. Das ist die ganze Bedienungsanleitung dieses Geräts, und sie
 * braucht kein Wort.
 *
 * Und sie **läuft** (`DeskKit.update`): Ein Licht wandert von Spitze zu
 * Spitze, immer zur Kopie-Zone hin. Dieselbe Entscheidung wie bei den Sparren
 * auf dem Band (`kitchenBelt.BeltKit.update`) und dieselbe Begründung: Eine
 * Richtung, die sich bewegt, liest man, ohne sie zu suchen — und sie läuft
 * auch dann, wenn nichts auf dem Glas liegt, denn wer erst dann zeigt, wohin
 * es geht, zeigt es zu spät.
 *
 * Die Spitzen sind 12 cm lang und 7 cm breit: Sie passen mit einem halben
 * Zentimeter Luft in den 8 cm breiten Rand zwischen Feld und Sockelkante
 * (`COPIER_BASE_DEEP` gegen `FIELD_DEEP`), ohne über das Möbel hinauszuragen. Und sie liegen 6 mm über dem Sockel, also
 * knapp über der Fuge, die sie kreuzen: Zwei Flächen auf derselben Höhe
 * flimmern gegeneinander (`kitchenBelt.BAND_LIFT`).
 */
const LANE_MARKS = 5;
const LANE_HEAD = 0.12;
const LANE_HALF = 0.035;
const LANE_AT = (COPIER_BASE_DEEP - 0.08) / 2;
const LANE_LIFT = SEAM_HIGH + 0.002;

/**
 * **Wie lange das Licht für die ganze Spur braucht**, in Sekunden — 1,2, und
 * das ist nach unten gewählt.
 *
 * Schneller wäre ein Flackern, das die Küche unruhig macht; langsamer wäre ein
 * Gerät, das müde aussieht. Bei 1,2 s liegt zwischen zwei Spitzen eine knappe
 * Viertelsekunde, und das ist die Geschwindigkeit, in der man eine Bewegung
 * als **Richtung** liest und nicht als Blinken.
 */
const LANE_SECONDS = 1.2;

/**
 * **Wie hell eine Spitze ist**, wenn das Licht gerade woanders ist — und wenn
 * es auf ihr steht.
 *
 * Sie geht nie ganz aus: Eine Spur, deren Spitzen zwischen den Pulsen
 * verschwinden, ist im Standbild kein Pfeil mehr, und genau so sieht man sie
 * auf jedem Bildschirmfoto und in jedem Bericht.
 */
const LANE_DIM = 0.25;
const LANE_BRIGHT = 1.1;

/**
 * **Der Zielrahmen auf dem Glas** — vier Winkel in den Ecken der Kopierfläche,
 * in Metern.
 *
 * Er ist die Antwort auf die Hälfte der Frage, die die Spur offenlässt: Sie
 * sagt, in welche Richtung es geht, er sagt, dass hier etwas **hinein**gehört.
 * Vier Winkel und kein geschlossener Rahmen, und das ist der Unterschied zur
 * Kopie-Zone nebenan (`PAD_BAR`): Ein offener Zielrahmen ist die Markierung
 * eines Scanners — man legt etwas hinein —, ein geschlossener eine Bühne — auf
 * ihr steht etwas. Zwei Felder, zwei Zeichen, und keines davon ein Wort.
 *
 * 12 cm lange Schenkel, 2 cm breit, 4 cm von der Feldkante eingerückt: groß
 * genug, um aus 16 m Höhe vier Ecken zu bleiben, und weit genug innen, dass
 * eine Miniatur in der Feldmitte sie nicht verdeckt. Und 1 mm hoch, denn sie
 * liegen **auf** dem Glas: Eine Markierung genau in der Glasebene flimmerte
 * gegen sie, sobald die Kamera sich bewegt (`kitchenBelt.BAND_LIFT`).
 */
const MARK_LONG = 0.12;
const MARK_WIDE = 0.02;
const MARK_INSET = 0.04;
const MARK_LIFT = 0.001;

/**
 * **Der Rahmen um die Kopie-Zone**, in Metern — vier flache Leisten auf der
 * Kante der Wiege, zwischen den vier Pfosten.
 *
 * Ohne ihn ist das dunkle, matte Feld aus 16 m Höhe ein **Loch**, und ein Loch
 * lädt dazu ein, etwas hineinzulegen — also genau das Gegenteil dessen, was
 * die Zone tut. Der Rahmen macht aus dem Loch eine Bühne: eine Fläche mit
 * einer Kante, auf der etwas steht, und die vier Pfosten stehen fortan auf
 * seinen Ecken, statt frei aus dem Nichts zu wachsen.
 *
 * 2,5 cm breite Leisten, 1 mm hoch — dieselbe Höhe wie der Zielrahmen auf dem
 * Glas und aus demselben Grund: Sie liegen auf der Wiege und nicht in ihr.
 */
const PAD_BAR = 0.025;
const PAD_LIFT = 0.001;

/**
 * **Die Farben.**
 *
 * Aus dem Modell abzulesen waren sie nicht — dieselbe Lage wie beim Förderband
 * (`kitchenBelt.ts`, dort steht die Begründung ausführlich): Die Quelldatei
 * trägt ihre Farben in Texturen, es gibt keine Zahl zum Abschreiben.
 *
 * Also gewählt, und zwar für den Blick **von oben**: dunkle Korpusse, die im
 * Schatten der Nachbarn nicht stören, eine helle Platte als Kante, an der man
 * das Möbel überhaupt erkennt — und **ein** Akzent, das Grüncyan der Scheibe.
 * Es ist dieselbe Farbe am Bildschirm, am Glas der Kopierfläche, an den
 * Pfosten und am Pfeil, und das mit Absicht: Diese vier Dinge sind das, was die
 * beiden Möbel können. Eine zweite Akzentfarbe hieße, dass es zwei Sorten
 * Funktion gibt, und es gibt nur eine.
 *
 * Das Grün liegt bewusst neben dem Blau und dem Orange der Bänder
 * (`kitchenBelt.BELT_COLORS`): Wer aus 16 m Höhe auf die Küche schaut, soll den
 * Umbau nicht mit dem Warenfluss verwechseln.
 */
const BODY_COLOR = 0x39414d;
const TOP_COLOR = 0xdfe4e9;
const DARK_COLOR = 0x171b21;
const GLOW_COLOR = 0x2fd6a8;

/**
 * **Wie hell die Scheibe glüht** — 0,55, und das ist nach unten und nicht nach
 * oben gewählt.
 *
 * Der Bildschirm soll quer durch die Küche als **eingeschaltet** zu erkennen
 * sein, und mehr nicht. Eine Fläche mit `emissiveIntensity: 1` ist in einer
 * Szene mit weichem Licht ein Loch im Bild: Sie überstrahlt ihren eigenen
 * Rahmen, und aus der Ferne bleibt ein weißer Fleck, dem man nicht mehr ansieht,
 * dass er rechteckig ist. Bei 0,55 bleibt das Grüncyan eine Farbe.
 */
const GLOW_STRENGTH = 0.55;

/**
 * **Der Bausatz für Computer-Tisch und Kopierer** — geteilte Formen, geteilte
 * Farben, ein `dispose`.
 *
 * Einer je Zone, wie der Bandsatz (`kitchenBelt.BeltKit`) und der Zutatensatz
 * (`kitchenProps.FoodKit`) daneben, und aus demselben Grund: Zwanzig Tische in
 * einer umgebauten Küche sind zwanzig Gruppen, aber nur ein Satz Kästen und ein
 * Satz Farben. Wer je Möbel eine eigene `BoxGeometry` baut, lädt zwanzigmal
 * dieselben acht Ecken auf die Grafikkarte und gibt sie nie wieder frei.
 *
 * **Beide Möbel teilen sich einen Satz**, obwohl sie zwei Stücke sind: Der
 * dunkle Korpus des Tisches ist derselbe Ton wie der Sockel des Kopierers, und
 * die leuchtende Scheibe ist dieselbe Farbe wie das Glas. Zwei Bausätze
 * nebeneinander hätten beides doppelt — und die Küche hätte zwei Grün.
 *
 * **Ohne `document` und ohne WebGL läuft das hier durch.** Es wird nichts
 * gemalt und nichts geladen, nur Quader gerechnet; der Bausatz ist deshalb in
 * Jest vollständig prüfbar (`kitchenDesk.test.ts`) — anders als das Band, das
 * ohne Leinwand auf seine Pfeile verzichten muss.
 */
export class DeskKit {
  private readonly shapes = new Map<string, THREE.BufferGeometry>();
  private readonly skins = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * Wie weit das Licht die Sparrenspur schon entlanggelaufen ist (0…1) — eine
   * Zahl für alle Kopierer dieser Küche (`update`).
   */
  private run = 0;

  /**
   * **Der Computer-Tisch**, Ursprung **auf dem Boden in seiner Mitte** — wie
   * jedes Küchenmöbel (`core/kitchenModel.kitchenModel`, `tools/kitchen-model.mjs`).
   *
   * Er kommt ungedreht heraus und schaut nach −z: Dort steht, wer ihn bedient,
   * dorthin zeigt der Bildschirm, dort liegt die Tastatur. Gedreht wird er in
   * `kitchen.ts` (`standAt`), und damit dreht sich beides zugleich mit — das
   * Bild und die Seite, die `pieceSide` für die Vorderseite hält.
   *
   * Ein Möbel und nicht vier: Tisch, Bildschirm, Tastatur und Rechner sind
   * **ein** Katalogstück (`kitchen-desk`). Wer den Tisch aufhebt, hebt den
   * Rechner mit auf — ein Bildschirm, der beim Umbau allein auf der Kachel
   * stehen bliebe, wäre ein Möbel, das niemand mehr wegbekommt.
   */
  deskPiece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-desk';

    const plate = new THREE.Mesh(
      this.shape('desk-plate', () => new THREE.BoxGeometry(DESK_WIDE, DESK_PLATE, DESK_DEEP)),
      this.skin('top', { color: TOP_COLOR, roughness: 0.55 }),
    );
    plate.position.y = DESK_TOP - DESK_PLATE / 2;

    const body = this.skin('body', { color: BODY_COLOR, roughness: 0.85 });
    const cheekShape = this.shape(
      'desk-cheek',
      () => new THREE.BoxGeometry(DESK_CHEEK, DESK_LEG, DESK_DEEP - 0.04),
    );
    // Seitlich stehen die Wangen bündig unter der Plattenkante: Eingerückt
    // sähe der Tisch aus, als kippte er, sobald man etwas an den Rand legt. In
    // der Tiefe sind sie 2 cm kürzer als die Platte — das ist die Kante, an der
    // man von vorn sieht, dass oben eine Platte liegt und nicht ein Kasten
    // steht.
    const left = new THREE.Mesh(cheekShape, body);
    left.position.set(-(DESK_WIDE - DESK_CHEEK) / 2, DESK_LEG / 2, 0);
    const right = new THREE.Mesh(cheekShape, body);
    right.position.set((DESK_WIDE - DESK_CHEEK) / 2, DESK_LEG / 2, 0);

    const tower = new THREE.Mesh(
      this.shape('tower', () => new THREE.BoxGeometry(TOWER_WIDE, TOWER_HIGH, TOWER_DEEP)),
      body,
    );
    tower.position.set(TOWER_AT[0], TOWER_HIGH / 2, TOWER_AT[1]);

    const keys = new THREE.Mesh(
      this.shape('keys', () => new THREE.BoxGeometry(KEYS_WIDE, KEYS_HIGH, KEYS_DEEP)),
      this.skin('keys', { color: DARK_COLOR, roughness: 0.7 }),
    );
    keys.position.set(0, DESK_TOP + KEYS_HIGH / 2, KEYS_AT);

    const stand = new THREE.Mesh(
      this.shape('stand', () => new THREE.BoxGeometry(STAND_WIDE, STAND_HIGH, STAND_DEEP)),
      body,
    );
    stand.position.set(0, DESK_TOP + STAND_HIGH / 2, SCREEN_AT + 0.02);

    const stem = new THREE.Mesh(
      this.shape('stem', () => new THREE.BoxGeometry(STEM_WIDE, SCREEN_FOOT - DESK_TOP, STEM_DEEP)),
      body,
    );
    stem.position.set(0, (DESK_TOP + SCREEN_FOOT) / 2, SCREEN_AT + 0.02);

    const screen = new THREE.Mesh(
      this.shape('screen', () => new THREE.BoxGeometry(SCREEN_WIDE, SCREEN_HIGH, SCREEN_THICK)),
      this.skin('screen', { color: DARK_COLOR, roughness: 0.6 }),
    );
    screen.position.set(0, SCREEN_FOOT + SCREEN_HIGH / 2, SCREEN_AT);

    for (const mesh of [plate, left, right, tower, keys, stand, stem, screen]) {
      mesh.castShadow = true;
    }
    group.add(plate, left, right, tower, keys, stand, stem, screen);

    // Die leuchtende Fläche sitzt **vor** dem Gehäuse, auf der −z-Seite: Das
    // ist die Seite, von der aus gelesen wird. Ein Bildschirm, dessen Bild
    // hinten leuchtet, ist von vorn ein schwarzer Kasten — und vom Gang aus
    // sähe die halbe Küche in eine eingeschaltete Rückwand.
    const face = new THREE.Mesh(
      this.shape(
        'screen-face',
        () =>
          new THREE.BoxGeometry(
            SCREEN_WIDE - 2 * SCREEN_EDGE,
            SCREEN_HIGH - 2 * SCREEN_EDGE,
            SCREEN_LIFT,
          ),
      ),
      this.skin('glow', {
        color: 0x08221d,
        emissive: GLOW_COLOR,
        emissiveIntensity: GLOW_STRENGTH,
        roughness: 0.4,
      }),
    );
    face.position.set(
      0,
      SCREEN_FOOT + SCREEN_HIGH / 2,
      SCREEN_AT - (SCREEN_THICK + SCREEN_LIFT) / 2,
    );
    face.castShadow = false;
    group.add(face);

    return group;
  }

  /**
   * **Der Kopierer**, Ursprung **auf dem Boden in der Mitte seiner beiden
   * Kacheln** — zwei Felder auf einem Sockel, ungedreht wie der Tisch.
   *
   * Links die **Kopierfläche** unter Glas, rechts die **Kopie-Zone** zwischen
   * vier Pfosten, dazwischen eine Fuge und ein Pfeil (`COPIER_PLATE`,
   * `COPIER_ZONE`, dort steht auch, was „links" hier heißt). Die beiden Felder
   * sind absichtlich **verschieden gebaut** und nicht bloß verschieden gefärbt:
   * Glas liegt auf etwas, ein offener Rahmen umschließt etwas — daran sieht
   * man, welches Feld etwas trägt und welches etwas hergibt, auch von schräg
   * oben und auch, wenn beide gerade leer sind.
   */
  copierPiece(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-copier';

    const base = new THREE.Mesh(
      this.shape(
        'copier-base',
        () => new THREE.BoxGeometry(COPIER_BASE_WIDE, COPIER_BASE_HIGH, COPIER_BASE_DEEP),
      ),
      this.skin('body', { color: BODY_COLOR, roughness: 0.85 }),
    );
    base.position.y = COPIER_BASE_HIGH / 2;

    const seam = new THREE.Mesh(
      this.shape(
        'copier-seam',
        () => new THREE.BoxGeometry(SEAM_WIDE, SEAM_HIGH, COPIER_BASE_DEEP),
      ),
      this.skin('keys', { color: DARK_COLOR, roughness: 0.7 }),
    );
    seam.position.y = COPIER_BASE_HIGH + SEAM_HIGH / 2;

    // Die Kopierfläche: eine Glasplatte, deren **Oberkante** auf `COPIER_DECK`
    // liegt. Nicht ihre Unterkante — auf das Glas wird gelegt, und die Zone
    // rechnet mit der Fläche, die sie dafür bekommt.
    const glass = new THREE.Mesh(
      this.shape('copier-glass', () => new THREE.BoxGeometry(FIELD_WIDE, GLASS_THICK, FIELD_DEEP)),
      this.skin('glass', {
        color: GLOW_COLOR,
        emissive: GLOW_COLOR,
        emissiveIntensity: 0.15,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
      }),
    );
    glass.position.set(COPIER_PLATE[0], COPIER_DECK - GLASS_THICK / 2, COPIER_PLATE[1]);

    // Der Boden der Kopie-Zone ist **matt und dunkel** und genau so hoch wie
    // das Glas nebenan (`COPIER_DECK`): Die Kopie steht auf derselben Ebene wie
    // die Vorlage, sonst behauptet das Gerät etwas, was es nicht hält. Und er
    // ist genauso **dick** — beide Felder liegen damit auf dem Sockel auf, und
    // keines schwebt einen Zentimeter darüber.
    const cradle = new THREE.Mesh(
      this.shape(
        'copier-cradle',
        () => new THREE.BoxGeometry(FIELD_WIDE, CRADLE_THICK, FIELD_DEEP),
      ),
      this.skin('keys', { color: DARK_COLOR, roughness: 0.7 }),
    );
    cradle.position.set(COPIER_ZONE[0], COPIER_DECK - CRADLE_THICK / 2, COPIER_ZONE[1]);

    const accent = this.skin('accent', {
      color: GLOW_COLOR,
      emissive: GLOW_COLOR,
      emissiveIntensity: 0.35,
      roughness: 0.45,
    });
    const postShape = this.shape(
      'copier-post',
      () => new THREE.BoxGeometry(POST_SIDE, POST_HIGH, POST_SIDE),
    );
    const posts: THREE.Mesh[] = [];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = new THREE.Mesh(postShape, accent);
        post.position.set(
          COPIER_ZONE[0] + (sx * (FIELD_WIDE - POST_SIDE)) / 2,
          COPIER_DECK + POST_HIGH / 2,
          COPIER_ZONE[1] + (sz * (FIELD_DEEP - POST_SIDE)) / 2,
        );
        posts.push(post);
      }
    }

    for (const mesh of [base, seam, glass, cradle, ...posts]) mesh.castShadow = true;
    group.add(base, seam, glass, cradle, ...posts);

    // **Aufgemalt und nicht gebaut**: kein Schatten, kein Treffer für den
    // Strahl (`core/usable.ts` zielt auf Möbel, nicht auf Farbe) — dieselbe
    // Behandlung wie die Sparren auf dem Band. Das gilt für alles, was von hier
    // an kommt: Spur, Zielrahmen und Bühnenrahmen sind Zeichen auf dem Gerät.
    const paint: THREE.Mesh[] = [];

    // Die Bühne um die Kopie-Zone: vier Leisten auf der Kante der Wiege, die
    // vier Pfosten stehen auf ihren Ecken.
    const padLong = this.shape(
      'copier-pad-long',
      () => new THREE.BoxGeometry(FIELD_WIDE, PAD_LIFT, PAD_BAR),
    );
    const padSide = this.shape(
      'copier-pad-side',
      () => new THREE.BoxGeometry(PAD_BAR, PAD_LIFT, FIELD_DEEP - 2 * PAD_BAR),
    );
    for (const sz of [-1, 1]) {
      const bar = new THREE.Mesh(padLong, accent);
      bar.position.set(
        COPIER_ZONE[0],
        COPIER_DECK + PAD_LIFT / 2,
        COPIER_ZONE[1] + (sz * (FIELD_DEEP - PAD_BAR)) / 2,
      );
      paint.push(bar);
    }
    for (const sx of [-1, 1]) {
      const bar = new THREE.Mesh(padSide, accent);
      bar.position.set(
        COPIER_ZONE[0] + (sx * (FIELD_WIDE - PAD_BAR)) / 2,
        COPIER_DECK + PAD_LIFT / 2,
        COPIER_ZONE[1],
      );
      paint.push(bar);
    }

    // Der Zielrahmen auf dem Glas: vier offene Winkel, je zwei Schenkel.
    const markLong = this.shape(
      'copier-mark-long',
      () => new THREE.BoxGeometry(MARK_LONG, MARK_LIFT, MARK_WIDE),
    );
    const markSide = this.shape(
      'copier-mark-side',
      () => new THREE.BoxGeometry(MARK_WIDE, MARK_LIFT, MARK_LONG),
    );
    const cornerX = FIELD_WIDE / 2 - MARK_INSET;
    const cornerZ = FIELD_DEEP / 2 - MARK_INSET;
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const along = new THREE.Mesh(markLong, accent);
        along.position.set(
          COPIER_PLATE[0] + sx * (cornerX - MARK_LONG / 2),
          COPIER_DECK + MARK_LIFT / 2,
          COPIER_PLATE[1] + sz * (cornerZ - MARK_WIDE / 2),
        );
        const across = new THREE.Mesh(markSide, accent);
        across.position.set(
          COPIER_PLATE[0] + sx * (cornerX - MARK_WIDE / 2),
          COPIER_DECK + MARK_LIFT / 2,
          COPIER_PLATE[1] + sz * (cornerZ - MARK_LONG / 2),
        );
        paint.push(along, across);
      }
    }

    // Die Spur: fünf Spitzen je Längsseite, von der Kopierfläche zur Kopie-Zone.
    // **Je Spitze eine eigene Farbe**, über alle Kopierer geteilt: Durch sie
    // läuft das Licht (`update`), und zwei Geräte, die verschieden blinkten,
    // sähen aus wie zwei verschiedene Geräte.
    const headShape = this.shape('copier-lane-head', laneHead);
    for (let i = 0; i < LANE_MARKS; i++) {
      const skin = this.skin(laneKey(i), {
        color: GLOW_COLOR,
        emissive: GLOW_COLOR,
        emissiveIntensity: LANE_DIM,
        roughness: 0.45,
      });
      const at = COPIER_PLATE[0] + ((COPIER_ZONE[0] - COPIER_PLATE[0]) * i) / (LANE_MARKS - 1);
      for (const sz of [-1, 1]) {
        const mark = new THREE.Mesh(headShape, skin);
        mark.position.set(at, COPIER_BASE_HIGH + LANE_LIFT, sz * LANE_AT);
        paint.push(mark);
      }
    }

    for (const mesh of paint) {
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.raycast = () => {};
    }
    group.add(...paint);

    return group;
  }

  /**
   * **Ein Bild weiter: das Licht wandert die Spur entlang.**
   *
   * Angefasst werden `LANE_MARKS` Zahlen und nichts sonst — kein Netz, keine
   * Textur, keine Geometrie (dieselbe Sparsamkeit wie beim Band, das je Bild
   * einen Texturversatz verstellt und sonst nichts). Alle Kopierer einer Küche
   * teilen sich diese Farben und laufen deshalb im Gleichschritt: Ein zweites
   * Gerät, das eine halbe Sekunde versetzt blinkte, sähe aus wie ein Gerät mit
   * einem anderen Motor, und es ist dasselbe.
   *
   * Der Puls ist ein Dreieck und keine Stufe: Er steigt zur Spitze hin an und
   * fällt wieder ab, und damit ist die Bewegung ein **Wandern** und kein
   * Weiterspringen. Und er läuft immer, ob eine Vorlage liegt oder nicht
   * (`LANE_SECONDS`).
   */
  update(dt: number): void {
    const step = Number.isFinite(dt) ? Math.max(0, dt) : 0;
    if (step === 0) return;
    this.run = (this.run + step / LANE_SECONDS) % 1;
    for (let i = 0; i < LANE_MARKS; i++) {
      const skin = this.skins.get(laneKey(i));
      if (!skin) continue;
      // Der Abstand dieser Spitze zum Licht, auf (−0,5; 0,5] zurückgeholt: Das
      // Licht läuft im Kreis, also ist die letzte Spitze der ersten benachbart.
      const gap = wrapRun(this.run - i / LANE_MARKS);
      const close = Math.max(0, 1 - Math.abs(gap) * LANE_MARKS);
      skin.emissiveIntensity = LANE_DIM + (LANE_BRIGHT - LANE_DIM) * close;
    }
  }

  /**
   * **Alles weg** — einmal je Zone, nicht je Möbel.
   *
   * Zweimal zu rufen ist kein Fehler: Danach ist der Bausatz leer und ließe
   * sich wieder füllen (dieselbe Zusage wie bei `kitchenBelt.BeltKit`).
   */
  dispose(): void {
    for (const shape of this.shapes.values()) shape.dispose();
    for (const skin of this.skins.values()) skin.dispose();
    this.shapes.clear();
    this.skins.clear();
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
   * Eine Farbe, geteilt. Die Beschreibung kommt als **Satz Einstellungen** und
   * nicht als Reihe von Argumenten wie beim Band: Hier gibt es matte Kästen,
   * eine Glasplatte und zwei leuchtende Flächen, und `skin(key, 0x2fd6a8, 0.4,
   * true, 0.55, 0.1)` wäre eine Zeile, die man nur mit der Signatur daneben
   * liest.
   *
   * **`MeshStandardMaterial`** und nicht `MeshBasic`: Beides sind Möbel und
   * stehen zwischen Möbeln, die Licht und Schatten bekommen
   * (`core/kitchenModel.ts`). Eines, das in jedem Licht gleich hell wäre, klebte
   * wie ein Aufkleber zwischen ihnen — das Leuchten der Scheibe macht `emissive`
   * und nicht ein Material ohne Beleuchtung.
   */
  private skin(
    key: string,
    spec: THREE.MeshStandardMaterialParameters,
  ): THREE.MeshStandardMaterial {
    let skin = this.skins.get(key);
    if (!skin) {
      skin = new THREE.MeshStandardMaterial(spec);
      this.skins.set(key, skin);
    }
    return skin;
  }
}

/**
 * **Eine Spitze der Sparrenspur** — ein flaches Dreieck in der x-z-Ebene, das
 * nach +x zeigt, also von der Kopierfläche zur Kopie-Zone.
 *
 * Drei Punkte und keine plattgedrückte `ConeGeometry`: Ein Kegel mit drei
 * Segmenten, den man in der Höhe auf nichts staucht, ist ein gestauchter Kegel —
 * seine Grundfläche steht schräg, und von oben sieht man ein Dreieck, dessen
 * Spitze nicht dort liegt, wo man sie hingerechnet hat. Ein Dreieck ist drei
 * Punkte; die schreibt man hin.
 *
 * Die Reihenfolge der Punkte ist nicht beliebig: So gedreht zeigt die Normale
 * nach **+y**, und das Dreieck ist von oben sichtbar statt von unten.
 */
function laneHead(): THREE.BufferGeometry {
  const head = new THREE.BufferGeometry();
  head.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [LANE_HEAD / 2, 0, 0, -LANE_HEAD / 2, 0, -LANE_HALF, -LANE_HEAD / 2, 0, LANE_HALF],
      3,
    ),
  );
  head.computeVertexNormals();
  return head;
}

/** Der Name der Farbe einer Spitze — je Spitze eine, über alle Kopierer geteilt. */
function laneKey(index: number): string {
  return `lane:${index}`;
}

/** Einen Lauf auf (−0,5; 0,5] zurückholen — die Spur ist ein Kreis. */
function wrapRun(run: number): number {
  const turn = ((run + 0.5) % 1) - 0.5;
  return turn <= -0.5 ? turn + 1 : turn;
}
