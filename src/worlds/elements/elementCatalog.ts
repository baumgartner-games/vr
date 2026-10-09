import { SHELF_WALL, SHELF_WALL_HALF, SHELF_WINDOW_PIECES } from '../grid/shelfWalls';
import type { StationKind } from '../test/zones/kitchenCarry';
import type { KitchenItem } from '../test/zones/kitchenRecipes';
import { FLOORINGS } from '../house/flooring';
import { NATURE_COLOR_ELEMENTS, NATURE_ELEMENTS, NATURE_FOLDER } from './natureCatalog';
import { SPACE_ELEMENTS, SPACE_FOLDER } from './spaceCatalog';
import { CITY_ELEMENTS, CITY_FOLDER } from './cityCatalog';
import { FURNITURE_BITS_ELEMENTS, FURNITURE_BITS_FOLDER } from './furnitureCatalog';
import { TAVERN_ELEMENTS, TAVERN_FOLDER } from './tavernCatalog';
import {
  HALLOWEEN_ELEMENTS,
  HALLOWEEN_FENCE_LABELS,
  HALLOWEEN_FENCES,
  HALLOWEEN_FOLDER,
  HALLOWEEN_GATES,
} from './halloweenCatalog';
import { HOLIDAY_ELEMENTS, HOLIDAY_FOLDER } from './holidayCatalog';
import { BOARD_GAME_ELEMENTS, BOARD_GAME_FOLDER } from './boardGameCatalog';
import { RESOURCE_ELEMENTS, RESOURCE_FOLDER } from './resourceCatalog';
import { PLATFORMER_ELEMENTS, PLATFORMER_FOLDER } from './platformerCatalog';
import { MYSTERY_ELEMENTS, MYSTERY_FOLDER } from './mysteryCatalog';

/**
 * **Die Spielelemente** — was eine Welt als Möbel hinstellt, und zwar als
 * **ein** Ding, nicht als Haufen Modelle.
 *
 * Ein Spielelement ist mehr als eine Datei aus dem Regal: Die Arbeitsplatte
 * mit Schneidebrett ist drei Dateien (Zeile, Brett, Messer), die Eiswannen
 * sind fünf. Dazu gehört, was die Modelle nicht wissen — wie viele Kacheln es
 * belegt, wie hoch sein Körper ist, damit niemand hinaufspringt, und was man
 * damit tut (`kind`). Bis hierher stand genau das in jeder Welt neu: in der
 * Testküche als Katalogeintrag (`core/kitchenFit.ts`), im Burgerladen als
 * Station mit Anbauten (`PlateUpWorld.addStationView`), im ersten Test
 * Restaurant als Zeile aus `base` und `items` — dreimal dieselbe
 * Arbeitsplatte, dreimal anders zusammengesetzt, und keine davon sperrte ihre
 * Zellen von selbst.
 *
 * **Welten stellen Elemente hin, keine rohen Modelle** — die Stelle steht in
 * `elementPlace.ts` (`ElementSpot`), das Bild und die Sperre in
 * `elementView.ts` (`placeElement`). Diese Datei ist reine Beschreibung: kein
 * three.js, kein Laden, und damit in Jest prüfbar (`elementCatalog.test.ts`
 * sieht nach, ob jede Datei im Regal liegt).
 *
 * Gebaut wird aus vorhandenen Modellen (_„dass ich eigentlich immer nur
 * existierende Modelle nutzen will"_): Jedes Teil ist eine Adresse im Regal,
 * nichts ist gerechnet.
 */

/**
 * **Was man mit einem Element tut** — die Stationsarten der Küche
 * (`kitchenCarry.StationKind`). Die Eiswannen zu zweit auf einer Platte
 * (`'ice-tubs'`) sind weg — gemeldet: _„Bei den Waffeln gibt es anscheinend
 * Elemente mit zwei Eis trays auf einer Arbeitsplatte, bitte fixen."_ Eine
 * Wanne je Platte (`ice-tray-*`).
 */
export type ElementKind = StationKind;

/** Was auf einem Brett passiert — Schneiden oder Ausrollen. */
export type ElementWork = 'chop' | 'roll';

/**
 * **Ein Teil eines Elements** — eine Datei aus dem Regal und wo sie sitzt.
 *
 * Alle Maße gelten für ein Element, das **nach Süden schaut** (Vorderseite
 * +z, `face: 'S'`): x nach Osten, z nach Süden, gemessen von der Mitte seiner
 * Grundfläche. Steht das Element anders, dreht sich alles mit
 * (`elementPlace.rotateOffset`).
 */
export interface ElementPart {
  /** Die Adresse im Regal, etwa `'restaurant-bits/kitchencounter_straight_A.glb'`. */
  readonly model: string;
  /** Versatz der Mitte in Metern (x Osten, z Süden) — ohne Angabe die Mitte. */
  readonly at?: readonly [number, number];
  /**
   * **Obenauf auf dem Teil davor** statt auf dem Boden — auf seiner gemessenen
   * Oberkante. Kurzform für `on: <Index davor>`.
   */
  readonly stack?: boolean;
  /**
   * **Auf welchem Teil es steht** (Index in `parts`) — für ein Teil, das nicht
   * auf dem letzten, sondern auf einem früheren steht: Der Portionierer liegt
   * auf der Platte und nicht auf dem Hörnchenstapel daneben.
   */
  readonly on?: number;
  /**
   * **Im Teil davor, wie die Datei es hat** — gleicher Ursprung, gleicher
   * Maßstab, nicht nachgemessen. Das Eis in seiner Wanne: zwei Dateien mit
   * demselben Ursprung (`plateUpIceView.loadTub`), und nur zusammen sitzt das
   * Eis unter dem Rand statt obenauf.
   */
  readonly inside?: boolean;
  /**
   * **So tief unter der Oberkante dessen, worauf es steht**, in Metern — für
   * etwas, das **in** einer offenen Kiste liegt und nicht auf ihrem Rand: die
   * Teller in der Tellerkiste.
   */
  readonly sink?: number;
  /** Zusätzliche Drehung um die Hochachse, in Bogenmaß. */
  readonly yaw?: number;
  /**
   * **Umlegen, bevor gemessen wird** — Drehung (x, y, z) in Bogenmaß um die
   * Mitte des Modells. Das Messer kommt im Baukasten stehend und liegt auf
   * dem Brett (`kitchenFit`, `PieceStack.tilt`).
   */
  readonly tilt?: readonly [number, number, number];
  /**
   * Auf diese Höhe gebracht, in Metern — gleichmäßig in allen Richtungen und
   * so, wie die Datei steht, also **vor** `tilt` (der Portionierer ist 30 cm
   * lang und liegt dann).
   */
  readonly height?: number;
  /** Oder um diesen Faktor, zusätzlich zum Maßstab des Regals. `height` geht vor. */
  readonly scale?: number;
  /**
   * **Auf diese Breite gebracht**, in Metern — gleichmäßig, und zwar die
   * längere der beiden Seiten von oben gesehen, **nach** `tilt`. Für das, was in
   * einer Kiste liegt und nicht über ihren Rand hinausragen soll: die Bahn der
   * Tapete, die Platte eines Bodens.
   */
  readonly fit?: number;
  /**
   * **Die Oberkante so tief unter der Oberkante dessen, worauf es liegt**, in
   * Metern — statt `sink`, das die Unterkante setzt. So liegen verschieden
   * dicke Platten in ihren Kisten alle bündig.
   */
  readonly flush?: number;
  /**
   * **An seinem Ursprung, wie die Datei es hat** — statt mit der Mitte seiner
   * Hülle über der Stelle und der Unterseite auf dem Boden. Für Bäume: Der
   * Ursprung sitzt im Stamm, die Krone hängt oft zur Seite (bis 0,3 m), und die
   * Wurzeln reichen unter den Boden. So steht der Stamm genau auf den Zellen,
   * die er sperrt (`GameElement.solid`), und wächst aus dem Boden, statt
   * darauf zu stehen.
   */
  readonly rooted?: boolean;
  /**
   * **Hier wird abgelegt** — die Oberkante dieses Teils ist `PlacedElement.top`.
   * Ohne Angabe ist es das erste Teil: die Platte, der Herd, die Kiste.
   */
  readonly surface?: boolean;
  /**
   * **Daran wird getauscht** (`GameElement.opens: 'swap'`): Wer auf dieses
   * Teil schaut, sieht es leuchten, und `A` tauscht das Element gegen seine
   * nächste Fassung — die Laterne auf der Straße.
   */
  readonly swaps?: boolean;
  /**
   * **Mit dem Muster dieser Tapete bemalt** (`house/wallpaperSkin.paintWallpaper`)
   * — die Id aus `house/wallpaper.WALLPAPERS`. Gewünscht bei den Tapetenkisten:
   * _„bei den tapeten kisten sieht man an dem banner darin nicht, wie die
   * tapete aussieht"_. Das Modell bleibt die Bahn aus dem Regal, nur ihr
   * Bild wird die Tapete.
   */
  readonly wallpaper?: string;
  /**
   * **Nur dieses Stück aus der Datei** — der Name eines Knotens, etwa
   * `'Witch_Hat'` aus der Hexe. Für das, was eine Figur trägt und das Regal
   * nicht einzeln hat: Hüte, Helme, Umhänge. Ein Stück an Knochen steht so da,
   * wie es modelliert ist (die Ruhelage), ohne die Figur darum.
   */
  readonly node?: string;
  /**
   * **Auf diese Maße gebracht**, Breite × Höhe × Tiefe in Metern — jede Achse
   * für sich, vor `pose`. Für Stangen und Haken aus einem Pfosten: derselbe
   * Pfosten, dünn und lang oder kurz und dick.
   */
  readonly size?: readonly [number, number, number];
  /**
   * **Frei in den Raum gestellt** statt auf den Boden oder auf ein Teil —
   * für das, was hängt oder schräg absteht: die Haken einer Garderobe und was
   * an ihnen hängt. Der Ursprung des Teils ist die Mitte seiner Unterseite,
   * wie es aus dem Regal kommt (nach `size`, `height`, `fit`). Dann wird
   * gedreht — `quat` (x, y, z, w) oder `rot` (Bogenmaß, Reihenfolge YXZ wie
   * `Euler.order`) — und auf `at` gesetzt: x nach Osten, y nach oben, z nach
   * Süden, von der Mitte der Grundfläche am Boden aus. `at`, `stack`, `on`
   * und `tilt` gelten dann nicht.
   */
  readonly pose?: {
    readonly at: readonly [number, number, number];
    readonly rot?: readonly [number, number, number];
    readonly quat?: readonly [number, number, number, number];
  };
  /**
   * **Und danach gestreckt**, um die Mitte der Grundfläche am Boden — je Achse
   * ein Faktor. Nur mit `pose`. So bekommen Stange und Füße der Garderobe ihre
   * Breite, ohne dass sich die Haken mit verziehen.
   */
  readonly stretch?: readonly [number, number, number];
}

/**
 * **Was `A` an einem Element aufmacht**, wenn es keine Station der Küche ist
 * — eine Seite im Menü. `'outfit'`: _Aussehen_ (`WorldContext.openOutfit`),
 * die Garderobe. `'hide'`: hineinsteigen und sich verstecken
 * (`PortalWorld.hideIn`), der Schutzschrank. `'swap'`: gegen die nächste
 * Fassung tauschen (`GameElement.swap`) — die Laternen einer Straße. `'sit'`:
 * sich daraufsetzen (`PortalWorld.sitOn`) — alles aus _Möbel → Sitzen_.
 * `'hologram'`: ein Modell aus dem Regal wählen, das darüber als Hologramm
 * schwebt (`PortalWorld.chooseHologram`) — der Hologramm-Sockel.
 *
 * Dazu, gewünscht im Oktober 2026 (`elementActs.ts`): `'light'` schaltet eine
 * Lampe an und aus, `'lid'` klappt den Deckel einer Truhe auf und gibt, was
 * darin liegt (`yields`), `'tap'` gibt aus einem Fass, `'unwrap'` packt ein
 * Geschenk aus, `'roll'` wirft einen Würfel auf seiner Zelle hoch.
 */
export type ElementOpens =
  'outfit' | 'hide' | 'swap' | 'sit' | 'hologram' | 'light' | 'lid' | 'tap' | 'unwrap' | 'roll';

/** **Ein Spielelement** — zusammengesetzt, mit Grundfläche, Körper und Zweck. */
export interface GameElement {
  /** Der Name, unter dem Welten es hinstellen (`ElementSpot.element`). */
  readonly id: string;
  /** Wie es auf Deutsch heißt. */
  readonly label: string;
  /**
   * **Weitere Namen für die Suche im Katalog** (`catalogSearch`) — wie man es
   * sonst noch nennt. Die Garderobe fand unter _Kleiderständer_ nichts.
   */
  readonly aka?: readonly string[];
  /**
   * **Die Grundfläche in Kacheln**, Breite × Tiefe, für ein Element, das nach
   * Süden schaut. Eine Kachel ist ein Meter und 2 × 2 Zellen. Fast alles ist
   * `[1, 1]`, auch das Band; der runde Tisch ist `[2, 2]`.
   */
  readonly tiles: readonly [number, number];
  /**
   * **Wie hoch sein Körper ist** — nicht, wie hoch das Modell ist. Möbel
   * stehen auf 1,40 m (`GridWorld.SOLID_BLOCK_HEIGHT`), damit niemand
   * hinaufspringt; das Band liegt flach.
   */
  readonly height: number;
  /**
   * **Was davon sperrt**, in Metern (Breite × Tiefe, nach Süden, um die Mitte
   * der Grundfläche) — ohne Angabe die ganze Grundfläche. Für etwas, das
   * breiter ist als das, wogegen man läuft: Unter der Krone eines Baums geht
   * man durch, nur der Stamm sperrt (gewünscht: _„Bei Bäumen z.B. sollten wir
   * nur den Stamm als nicht betretbar machen"_). `[0, 0]`: Es sperrt gar
   * nichts — Gras und Blumen, durch die man läuft.
   *
   * Die Grundfläche (`tiles`) bleibt, was man anfasst und wo der Katalog es
   * einrasten lässt; Zellen und Kasten (`elementPlace.spotCells`,
   * `GridWorld.blockSolid`) nehmen nur diese Fläche. Ein Element mit eigener
   * Sperre steht ganz als Bild da — als festes Stück der Welt bekäme die Krone
   * einen Körper.
   */
  readonly solid?: readonly [number, number];
  /** Was man damit tut — `null`: Es steht nur im Weg (Tisch, Stuhl, Band). */
  readonly kind: ElementKind | null;
  /** Bei einem Brett: was darauf passiert. Ohne Angabe schneidet es. */
  readonly work?: ElementWork;
  /**
   * **Was eine Kiste oder ein Stapel hergibt**, wenn die Stelle nichts sagt —
   * ein Vorschlag. Die Stelle gewinnt (`ElementSpot.gives`): Welche Dinge es
   * gibt, bestimmt die Küche (`kitchenRecipes.KitchenItem`), und die Kiste
   * Rindfleisch ist mal ein Patty und mal ein Steak.
   */
  readonly gives?: string;
  /**
   * **Was zu Beginn darauf steht und mitgenommen werden kann** — der Topf auf
   * dem Herd (`stove-pot`), wie `core/kitchenFit.KitchenPiece.holds` in der
   * Küche der Testwelt. Es ist **kein Teil** des Bilds: Die Station zeigt es
   * als das, was auf ihr liegt (`stationLayer.StationSlot.holds`), und wer es
   * nimmt, nimmt es mit — zur Spüle etwa, um es zu füllen.
   */
  readonly holds?: KitchenItem;
  /** Und was darin liegt — das Eis in der Eiswanne (`ice-tray-vanilla`). */
  readonly holdsOn?: readonly KitchenItem[];
  /**
   * **Ob das Möbel selbst den Saum bekommt** — ohne Angabe jedes Element mit
   * Zweck (`elementLit`).
   *
   * Der gelbe Saum für `A` (`core/highlight.ts`) zeigt, was ein Druck meint:
   * beim Nehmen das, was darauf liegt (die Pfanne, der Teller), sonst **das
   * Möbel** — die Kiste samt Gemüse, der Mülleimer, die Arbeitsplatte, auf die
   * man ablegt, das Brett, auf dem geschnitten wird. Gewünscht: _„Die
   * vorratskisten mit den Gemüse müssen alle noch Highlighting bekommen, wie
   * bei der Pfanne, also Kiste und das Gemüse darin"_, _„Der Mülleimer soll
   * auch gehighlighted werden können"_ und _„Beim ablegen eines Gegenstands
   * soll z.B. die Arbeitsfläche gehighlithed sein"_.
   *
   * Dafür steht auch das erste Teil nur als Bild da (nicht als Stück der Welt,
   * den Körper hat ohnehin der Kasten), und die Stationsschicht hängt alle
   * Teile unter den Anker ihrer Station (`StationLayer.add`) — nur bei einem
   * Element mit genau einer Station. `false`: Das Möbel leuchtet nie.
   */
  readonly lit?: boolean;
  /**
   * **Was `A` daran aufmacht**, wenn es keine Station der Küche ist
   * (`ElementOpens`) — die Garderobe öffnet _Aussehen_. Das ganze Element
   * leuchtet dann, sobald man darauf schaut (`elementLit`,
   * `StationLayer.add`).
   */
  readonly opens?: ElementOpens;
  /**
   * **Die nächste Fassung** (`opens: 'swap'`) — die Id, gegen die `A` an einem
   * Teil mit `swaps` das Element tauscht, an derselben Stelle. Im Kreis
   * gelesen: Straße mit Laternen → mit alten Laternen → mit Doppellaternen →
   * wieder von vorn. Gewünscht: _„Ggf. würde ich bei einem Teil noch die
   * Laternen austauschen können (im Spiel)."_
   */
  readonly swap?: string;
  /**
   * **Ein Abtropfgitter wie in der Sandbox** — höchstens vier Teller
   * (`kitchenCarry.CLEAN_STACK_MAX`), zu Beginn voll, und wer einen
   * zurückstellt, stellt ihn in ein freies Fach. Die Station zeigt die Teller
   * einzeln in den Fächern (`core/kitchenFit.RACK_SLOTS`); das Modell ist das
   * leere Gitter. Ohne Angabe wird ein Stapel nie leer (`stock: Infinity`).
   */
  readonly rack?: boolean;
  /**
   * **Eine Ablage** — darauf stellt man ab, was ablegbar ist (`rests`): den
   * Monitor auf den Schreibtisch, die Lampe auf den Schrank, die Tasse auf die
   * Arbeitsplatte. Gewünscht (Oktober 2026): _„Die Tische bitte behandeln wie
   * Arbeitsplatten (also das man was drauf stellen kann (nicht dass man
   * darauf schneiden kann))"_. Was darauf steht, sperrt keine Zellen (die
   * sperrt die Ablage schon), steht auf ihrer Oberkante (`PlacedElement.top`)
   * und geht mit, wenn man sie umstellt. Dinge der Küche legt man auf eine
   * Ablage, wenn sie zugleich eine Fläche ist (`kind: 'top'`).
   */
  readonly shelf?: boolean;
  /**
   * **Ablegbar** — passt auf eine Ablage (`shelf`): Monitor, Tastatur, Maus,
   * Tischlampe, Tasse, Bücher, kleine Pflanzen. Fällt es beim Hinstellen auf
   * eine Ablage, steht es dort obenauf; sonst auf dem Boden wie jedes Möbel.
   * Dasselbe Merkmal für die Dinge der Küche: `kitchenRecipes.ITEM_RESTS`.
   */
  readonly rests?: boolean;
  /**
   * **Ein Belag auf dem Boden** — der Teppich: Er liegt flach, sperrt nichts
   * (`solid: [0, 0]`), und auf ihn stellt man, was man will, wie auf den
   * Boden selbst. Gewünscht: _„dass man auf Teppiche noch etwas stellen kann
   * (also so behandeln wie ein Boden auf Boden)"_. Beim Umstellen hebt der
   * Kran zuerst, was darauf steht.
   */
  readonly floor?: boolean;
  /**
   * **Rastet je Zelle ein statt je Kachel** — eine Grundfläche aus ganzen
   * Kacheln, die trotzdem auf einer halben anfangen darf (`elementPlace.snapsToCells`).
   * Für die Stühle: Gewünscht ist _„ein Item, welches ich gern nicht zwingend
   * an ein feld setzen muss, sondern auch zwischen zwei felder"_ — der
   * Bürostuhl mittig vor einem Schreibtisch von zwei Kacheln.
   */
  readonly fine?: boolean;
  /**
   * **Liegt mit der Vorderseite zur Figur in der Hand** statt von ihr weg
   * (`PortalWorld.elementHold`) — und steht abgesetzt damit zu einem hin. Für
   * die Stühle: Man stellt sie an einen Tisch, vor dem man steht.
   */
  readonly holdFacing?: boolean;
  /**
   * **Die vier Eckzellen bleiben frei** — gesperrt ist ein Kreuz statt der
   * ganzen Grundfläche (`elementPlace.spotSolidBoxes`). Für den
   * Hologramm-Sockel: _„die ecken können dabei gemacht werden als kein
   * obstacle"_ — er ist rund, und an seinen Ecken geht man vorbei.
   */
  readonly openCorners?: boolean;
  /**
   * **Was zu Beginn darüber als Hologramm schwebt** (`opens: 'hologram'`) —
   * eine Adresse im Regal. Mit `A` wählt man ein anderes.
   */
  readonly hologram?: string;
  /**
   * **Was man herausbekommt** (`opens: 'lid' | 'tap' | 'unwrap'`) — Adressen
   * im Regal, eine davon zufällig, als Gegenstand in die Hand: Gold aus der
   * Truhe, eine Flasche aus dem Fass, ein Spielzeug aus dem Geschenk.
   */
  readonly yields?: readonly string[];
  /**
   * **Hängt an einer Wand** statt auf dem Boden zu stehen — Bilderrahmen und
   * Wandbretter. Abgesetzt rastet es an der nächsten Wand ein, wie ein
   * Wandstück aus dem Regal (`portal/decorPlace.mountPose`), und sperrt keine
   * Zelle. Gewünscht: _„Auch gerne die die dann an einer Wand sind."_
   */
  readonly wall?: boolean;
  /** Die Modelle, das erste steht auf dem Boden. */
  readonly parts: readonly ElementPart[];
}

/** Eine Adresse aus _Restaurant Bits_. */
export function bits(name: string): string {
  return `restaurant-bits/${name}.glb`;
}

/** So hoch ist der Körper eines Möbels — über 1,40 m springt niemand. */
const BODY = 1.4;

/**
 * **Wie groß eine Eiswanne steht**: 0,66 m wie im Burgerladen
 * (`plateUpIceView.CORNER_SIZE.tub`), von 0,80 m im Paket.
 */
const TUB_SCALE = 0.66 / 0.8;

/**
 * **Was in einer Kiste von oben liegt** (Tapete, Boden): so breit, dass rundum
 * der Rand der Kiste (1 m) zu sehen bleibt, und die Oberkante so tief unter
 * ihrem Rand — bei allen gleich, egal wie dick das Modell ist.
 */
const CRATE_FILL = 0.8;
const CRATE_FLUSH = 0.03;

/** Die Arbeitsplatte, auf der fast alles steht. */
const COUNTER = bits('kitchencounter_straight_A');

/** Ein Möbel auf einer Kachel. */
function piece(
  id: string,
  label: string,
  kind: ElementKind | null,
  parts: readonly ElementPart[],
  extra: Partial<
    Pick<
      GameElement,
      'work' | 'gives' | 'holds' | 'holdsOn' | 'tiles' | 'height' | 'lit' | 'rack' | 'shelf'
    >
  > = {},
): GameElement {
  return { id, label, tiles: [1, 1], height: BODY, kind, parts, ...extra };
}

/**
 * **Eine Vorratskiste** — die Kiste mit ihrem Inhalt obenauf, eine Datei.
 *
 * **Ohne Deckel in der Liste**: Den stellt der Lader unter jede Kiste aus
 * diesem Paket von selbst (`core/kaykitCrate.kaykitPlinth`) — hier noch einmal
 * `crate_lid` hinzuschreiben hieße zwei Deckel, und die Kiste stünde zehn
 * Zentimeter über der Zeile daneben.
 *
 * **Und sie leuchtet ganz** (`elementLit`): Kiste und Inhalt bekommen den
 * Saum, wie die Pfanne auf dem Herd.
 *
 * @param file der Dateiname ohne Paket und Endung, etwa `'crate_buns'`
 */
export function crate(id: string, file: string, gives: string, label: string): GameElement {
  return piece(id, label, 'crate', [{ model: bits(file) }], { gives });
}

/**
 * **Was eine Kiste zeigt, die Küche aber nicht kennt** — Salami und Pilze
 * haben kein `KitchenItem`. Solche Kisten stehen nur zum Ansehen da (in der
 * Schauküche); in einer spielbaren Küche werden sie keine Station
 * (`stationLayer.elementStations`). `elementCatalog.test.ts` sieht nach, dass
 * jedes andere `gives` ein Ding der Küche ist.
 */
export const SHOW_ONLY_GIVES: ReadonlySet<string> = new Set(['pepperoni']);

/** Die Tellerkiste: die leere Kiste, darin sechs Teller, jeder verdreht. */
function plateCrate(): ElementPart[] {
  const twist = (13 * Math.PI) / 180;
  const plates = Array.from({ length: 6 }, (_, i): ElementPart => ({
    model: bits('plate'),
    ...(i === 0 ? { on: 0, sink: 0.35 } : { stack: true }),
    yaw: i * twist,
  }));
  return [{ model: bits('crate') }, ...plates];
}

/**
 * **Die Pattykiste**: die leere Kiste, darin rohe Pattys übereinander, jedes
 * verdreht — gewünscht: _„Ich will eine vorratskiste von Burger pattys
 * haben."_ Das Regal hat keine Kiste mit Pattys; gebaut wird sie wie die
 * Tellerkiste aus Kiste und Inhalt (`sink`, `plateCrate`).
 */
function pattyCrate(): ElementPart[] {
  const twist = (29 * Math.PI) / 180;
  const patties = Array.from({ length: 4 }, (_, i): ElementPart => ({
    model: bits('food_ingredient_burger_uncooked'),
    ...(i === 0 ? { on: 0, sink: 0.3 } : { stack: true }),
    yaw: i * twist,
  }));
  return [{ model: bits('crate') }, ...patties];
}

/** Eine Eiswanne mit ihrer Sorte auf einer Arbeitsplatte. */
function iceTray(id: string, label: string, flavor: KitchenItem): GameElement {
  return piece(id, label, 'top', [{ model: COUNTER }], { holds: 'tray', holdsOn: [flavor] });
}

/**
 * **Die Tapetenkisten** — je Tapete eine Kiste, aus der man sie nimmt, so oft
 * man will (`kind: 'crate'` ändert sich beim Nehmen nicht). Obenauf steckt
 * die Bahn der Tapete (`itemModels.ITEM_MODELS`), damit man die Kisten
 * auseinanderhält. Gewünscht: _„In der Welt können vorratskisten von den
 * Tapeten sein, sodass man unendlich viele davon hat."_
 */
export const WALLPAPER_CRATES: readonly GameElement[] = (
  [
    ['brick', 'Backstein', 'red'],
    ['plaster', 'Putz weiß', 'white'],
    ['beige', 'Tapete beige', 'yellow'],
    ['stripes', 'Tapete grün gestreift', 'green'],
    ['wood', 'Holzvertäfelung', 'brown'],
    ['tiles', 'Fliesen blau', 'blue'],
  ] as const
).map(([id, label, color]) =>
  piece(
    `crate-wallpaper-${id}`,
    `Tapetenkiste ${label}`,
    'crate',
    [
      { model: bits('crate') },
      // Die Bahn liegt flach in der Kiste — umgelegt vor dem Messen, wie das
      // Messer auf dem Brett.
      {
        model: `dungeon/banner_thin_${color}.glb`,
        on: 0,
        tilt: [-Math.PI / 2, 0, 0],
        // Die Bahn ist 1,6 m lang und lag über die Kiste hinaus.
        fit: CRATE_FILL,
        flush: CRATE_FLUSH,
        // Die Bahn trägt das Muster der Tapete, sonst sähe man nur ihre Farbe.
        wallpaper: id,
      },
    ],
    { gives: `wallpaper-${id}` },
  ),
);

/**
 * **Die Bodenkisten** — je Belag eine (`house/flooring.ts`), unendlich viele
 * wie bei den Tapeten. Darin liegt die Platte selbst, verkleinert und bündig
 * (`fit`, `flush`).
 */
export const FLOORING_CRATES: readonly GameElement[] = FLOORINGS.map((one) =>
  piece(
    `crate-floor-${one.id}`,
    `Bodenkiste ${one.label}`,
    'crate',
    // Kleiner als die Kiste, damit ihr Rand zu sehen ist, und oben bündig: Die
    // Platten sind verschieden dick (Fliesen 25 cm, Dielen 7,5 cm), und
    // gelegt sieht man davon ohnehin nur die Oberseite.
    [{ model: bits('crate') }, { model: one.path, on: 0, fit: CRATE_FILL, flush: CRATE_FLUSH }],
    { gives: `floor-${one.id}` },
  ),
);

/**
 * **Die Treppenkiste** — eine Treppe nach der anderen (`house/stairPlan.ts`),
 * obenauf klein die Stufen selbst.
 */
export const STAIR_CRATE: GameElement = piece(
  'crate-stair',
  'Treppenkiste',
  'crate',
  [
    { model: bits('crate') },
    { model: 'prototype-bits/Primitive_Stairs_Half.glb', on: 0, sink: 0.05, scale: 0.25 },
  ],
  { gives: 'stair' },
);

/** Die Kisten des Pakets, je eine Zutat. */
const CRATES: readonly GameElement[] = [
  crate('crate-buns', 'crate_buns', 'bun', 'Brötchenkiste'),
  // **Die Steakkiste gibt Steaks** — gewünscht: _„Steak Vorrat Kisten sollen
  // keine Burger Pattys geben sondern Steaks (also eines davon)."_ Das Steak
  // brät wie Schinken oder wird auf dem Brett zum Patty (`kitchenRecipes`).
  crate('crate-steak', 'crate_steak', 'steak', 'Steakkiste'),
  crate('crate-lettuce', 'crate_lettuce', 'lettuce', 'Salatkiste'),
  crate('crate-tomatoes', 'crate_tomatoes', 'tomato', 'Tomatenkiste'),
  crate('crate-cheese', 'crate_cheese', 'cheese', 'Käsekiste'),
  crate('crate-ham', 'crate_ham', 'ham', 'Schinkenkiste'),
  crate('crate-dough', 'crate_dough', 'dough', 'Teigkiste'),
  crate('crate-carrots', 'crate_carrots', 'carrot', 'Karottenkiste'),
  crate('crate-potatoes', 'crate_potatoes', 'potato', 'Kartoffelkiste'),
  crate('crate-onions', 'crate_onions', 'onion', 'Zwiebelkiste'),
  crate('crate-pepperoni', 'crate_pepperoni', 'pepperoni', 'Salamikiste'),
  crate('crate-mushrooms', 'crate_mushrooms', 'mushroom', 'Pilzkiste'),
  // **Die Tellerkiste** — gewünscht: _„Es fehlt mir noch das Möbel Stück
  // vorratskiste mit Tellern (aus der unendlich viele kommen können)"_. Wie
  // die Tellerkiste der Sandbox (`core/kitchenFit`, `plate-counter`): eine
  // Kiste, aus der Teller kommen und die nie leer wird — anders als das
  // Abtropfgitter (`plate-stack`), das höchstens vier hält.
  //
  // **Ein Stapel Teller in der Kiste** und nicht einer auf dem Rand —
  // gemeldet: _„Bei den Teller vorratskiste sollten ein paar mehr Teller schon
  // drin sein. So sieht es aus als wenn der Teller schwebt."_ Sechs wie in der
  // Sandbox: Der Boden der Kiste liegt 5 cm über ihrem Fuß, der Rand 0,40 m
  // darüber; die Teller (je 5 cm) fangen also 0,35 m unter dem Rand an und
  // bleiben mit dem sechsten darunter. Jeder liegt 13° gegen den vorigen
  // verdreht (`kitchenProps.DIRTY_TWIST`), sonst sähe man von oben einen.
  piece('crate-plates', 'Tellerkiste', 'crate', plateCrate(), { gives: 'plate' }),
  piece('crate-patties', 'Pattykiste', 'crate', pattyCrate(), { gives: 'patty' }),
];

/**
 * **Die Wände im Möbelkatalog** — keine Spielelemente, sondern genau die
 * Regalmodelle, aus denen die Test Navigation ihre Kammern baut
 * (`grid/shelfWalls.SHELF_WINDOW_PIECES`, die Schräge `SHELF_WALL`, das Tor
 * `testnav/navTestPlan.GATE_MODEL`), dazu die halbe Prototypwand und der
 * breite Durchgang. Genommen wird jede wie im Modellregal
 * (`PortalWorld.takeModel`): Sie rastet **auf der Fuge zwischen zwei
 * Kacheln** ein, lässt sich unter 45° setzen und ist für das Zellgitter eine
 * Wand an der Kante (`GridWorld.collectWalls`) und kein Block.
 *
 * Gewünscht: _„ich hatte in navigation welt die wände nicht als "blöcke"
 * defineirt, sondern diese waren immer zwischen platten definiert. und ich
 * konnte die schräg setzen. Also eigentlich das was in modellregal wall ist,
 * soll einfach nur nach möbel kommen, aber eben nicht als "block""_. Ein
 * erster Versuch als Spielelement (`wall`, zwei Kacheln gesperrt) ist damit
 * wieder weg.
 */
export const WALL_MODELS: readonly string[] = [
  SHELF_WINDOW_PIECES.full,
  SHELF_WINDOW_PIECES.half,
  SHELF_WALL,
  SHELF_WALL_HALF,
  'prototype-bits/Wall_Doorway.glb',
  'prototype-bits/Wall_Doorway_Wide.glb',
];

/** Die Türen unter den Regalwänden — die Mappe _Türen_ im Katalog. */
export const DOOR_MODELS: readonly string[] = [
  'prototype-bits/Wall_Doorway.glb',
  'prototype-bits/Wall_Doorway_Wide.glb',
];

/**
 * Ob dieses Modell aus dem Regal eine Tür ist (`DOOR_MODELS`) — oder ein Tor
 * in einem Zaun (`halloweenCatalog.HALLOWEEN_GATES`), das man trägt wie eine.
 */
export function isDoorModel(path: string | null): boolean {
  return path !== null && (DOOR_MODELS.includes(path) || HALLOWEEN_GATES.includes(path));
}

/**
 * **Ob diese Wand ein Zaun ist** (`halloweenCatalog.HALLOWEEN_FENCES`) — sie
 * steht auf der Fuge und sperrt wie jede Wand, aber ein umzäunter Platz ist
 * kein Raum und bekommt keine Decke (`HausbauWorld.coverRooms`). Gewünscht:
 * _„Ich brauche nur bei denen wenn die einen raum umschließen keine Decke
 * automatisch. Hier sollten wir unterscheiden vlt. zwischen Zaun und Wand, die
 * aber beide zwischen den feldern gesetzt werden."_
 */
export function isFenceModel(path: string | null): boolean {
  return path !== null && HALLOWEEN_FENCES.includes(path);
}

/**
 * **Die Putzwand des Restaurants** — dieselbe Wand wie `surfaceDecor.WALL_STYLES`
 * _Putzwand_, ganz und halb. Sie steht im Katalog neben der Prototypwand, damit
 * es mehr als eine Wand zur Wahl gibt: Alle Wände sperren gleich, sie sehen
 * nur anders aus.
 */
export const PLASTER_WALL = 'restaurant-bits/wall.glb';
export const PLASTER_WALL_HALF = 'restaurant-bits/wall_half.glb';

/** **Die Tür im Katalog** — der schmale Durchgang; gezogen wird daraus der breite. */
export const CATALOG_DOOR = 'prototype-bits/Wall_Doorway.glb';
/** **Die Doppeltür** — der breite Durchgang, zwei Kacheln (`wallFullOf`). */
export const CATALOG_DOOR_WIDE = 'prototype-bits/Wall_Doorway_Wide.glb';

/**
 * **Die Bauteile des Hauses** — wie der Baumodus in _Die Sims_: Wand, Tür,
 * Fenster, und zwar **direkt** als Kacheln auf der Seite _Haus_ und nicht in
 * je einem Ordner mit einer Kachel darin. Gewünscht: _„wand (kann direkt das
 * wand element sein) · tür (kann direkt das tür element sein)"_. Davor: _„Alle
 * Wände sind an sich erstmal gleich, dass man nicht durch kann. Nur Türen und
 * Fenster Wand Elemente sind besonders."_
 *
 * Alles darin sind Regalwände (`WALL_MODELS`, dazu die Putzwand) und keine
 * Spielelemente: Sie rasten auf der Fuge ein, lassen sich schräg setzen und
 * im Baukasten **ziehen** (`areaPaint.wallLine`). Sie stehen in jeder Welt im
 * Katalog (`PortalWorld.elementFolders`), nicht nur im Restaurant.
 *
 * **Nur die kurzen Stücke** (eine Kachel, 2 × 1 Zellen) — gewünscht: _„Es
 * wäre sinnvoll wenn im Katalog nur die 2x1 Wände, also die kurzen angeboten
 * werden. Im Wand zieh Modus werden wir eh lange Wände ziehen."_ Gezogen wird
 * mit den langen (`wallFullOf`), und das gilt **auch für die Tür**: Keine
 * Doppeltür im Katalog, _„wenn ich eine tür über mehrere felder ziehe, soll er
 * statt zwei einzel türen, dann automatisch die doppeltür nehmen"_.
 */
export const BUILD_MODELS: readonly string[] = [
  SHELF_WALL_HALF,
  PLASTER_WALL_HALF,
  CATALOG_DOOR,
  SHELF_WINDOW_PIECES.half,
];

/** **Die Namen der Bauteile im Katalog** — das Regal kennt nur `Wall_Half`. */
export const BUILD_LABELS: Readonly<Record<string, string>> = {
  [SHELF_WALL_HALF]: 'Wand',
  [PLASTER_WALL_HALF]: 'Putzwand',
  [CATALOG_DOOR]: 'Tür',
  [SHELF_WINDOW_PIECES.half]: 'Fenster',
  ...HALLOWEEN_FENCE_LABELS,
};

/**
 * **Die Wand zum Abreißen** — dieselbe kurze Wand wie _Wand_, im Katalog mit
 * dem Verbotszeichen (`MenuEntry.mark` `forbidden`). Gewünscht (September
 * 2026): _„eine wall mit disallowed icon, was eigentlich funktioniert wie eine
 * wand setzen, nur bei der auswahl würde dann die entsprechende wand gelöscht
 * werden, sodass ich wände abreißen kann"_. Gezogen wird wie jede Wand
 * (`PortalWorld.eraseWallLine`), nur dass die Linie die Wände auf ihren Fugen
 * wegnimmt, statt welche hinzustellen.
 */
export const WALL_ERASER = SHELF_WALL_HALF;

/**
 * **Das Bild der Wand zum Abreißen** — die zerbrochene Wand aus dem Dungeon,
 * mit dem Verbotszeichen mitten darauf. Nicht dieselbe Datei wie _Wand_: Die
 * Vorschauen im Raster gehen nach Vorschau-Id (`ui/PagePreviews.ts`), und
 * zwei Kacheln mit derselben Id bekamen nur ein Bild — die _Wand_ blieb leer
 * (gemeldet: _„das wand icon lädt nicht? dafür bei wand abreißen"_).
 */
export const WALL_ERASER_PREVIEW = 'dungeon/wall_broken.glb';

/**
 * **Der Radiergummi des Katalogs** — was er berührt, ist weg: Möbel und
 * Elemente, nicht der Boden (`PortalWorld.eraseUnder`). Einen Radiergummi hat
 * das Regal nicht; in der Hand liegt der Mülleimer, mit dem Verbotszeichen
 * auf der Kachel.
 */
export const ELEMENT_ERASER = 'block-bits/trashcan.glb';

/**
 * **Der Ordner _Haus_** — Wand, Tür und Fenster direkt darin. Welten, die mehr
 * vom Haus verstehen, legen dazu (der Hausbau: Treppe, _Böden_, _Tapeten_).
 */
export const HOUSE_FOLDER: FurnitureFolder = {
  id: 'house',
  label: 'Haus',
  elements: [],
  models: BUILD_MODELS,
  erasers: [WALL_ERASER],
  cover: { model: CATALOG_DOOR },
};

/**
 * **Das halbe Stück zu einer ganzen Wand** — damit eine gezogene Wand
 * ungerader Länge am Ende ein halbes Stück bekommt, wie `shelfWalls.wallRun`.
 * Zur Doppeltür die einfache Tür. `null`, wenn es keines gibt: Dann endet die
 * Wand ein Stück früher.
 */
export function wallHalfOf(path: string): string | null {
  switch (path) {
    case SHELF_WALL:
      return SHELF_WALL_HALF;
    case SHELF_WINDOW_PIECES.full:
      return SHELF_WINDOW_PIECES.half;
    case PLASTER_WALL:
      return PLASTER_WALL_HALF;
    case CATALOG_DOOR_WIDE:
      return CATALOG_DOOR;
    default:
      return null;
  }
}

/**
 * **Die ganze Wand zu einem halben Stück** — das Gegenstück zu `wallHalfOf`.
 * Im Katalog liegen nur noch die kurzen Stücke (`BUILD_MODELS`); wer mit
 * einem davon eine Wand zieht, bekommt trotzdem lange Stücke aneinander und
 * nur am ungeraden Ende ein kurzes (`PortalWorld.drawnWall`). Zur Tür die
 * Doppeltür: Über zwei Kacheln gezogen wird sie eine. `null`, wenn es kein
 * längeres gibt.
 *
 * **Das Fenster hat keines**, obwohl es `Wall_Window_Closed` gibt: Das lange
 * Stück hat dasselbe Fenster (0,8 m) in mehr Wand. Gemeldet: _„fenster über
 * zwei felder scheinen das fenster nicht breiter zu machen"_. Gezogen kommt
 * deshalb je Kachel ein schmales Fenster, und die Rahmen stoßen zu einem
 * breiten Fensterband aneinander.
 */
export function wallFullOf(path: string): string | null {
  switch (path) {
    case SHELF_WALL_HALF:
      return SHELF_WALL;
    case PLASTER_WALL_HALF:
      return PLASTER_WALL;
    case CATALOG_DOOR:
      return CATALOG_DOOR_WIDE;
    default:
      return null;
  }
}

/**
 * **Der ganze Katalog.** Neue Elemente kommen hierher und nicht in eine Welt:
 * Was zwei Welten gleich hinstellen, soll gleich aussehen.
 */
export const ELEMENTS: readonly GameElement[] = [
  // Die Arbeitsplatte ist auch eine Ablage für Möbel (`shelf`): Tasse, Lampe, Monitor.
  piece('counter', 'Arbeitsplatte', 'top', [{ model: COUNTER }], { shelf: true }),
  // **Der Arbeitstisch** — `kitchentable_A`, die Platte auf vier Beinen, auch
  // eine Ablage. Gewünscht (Oktober 2026): _„Zudem fehlt mir dieser
  // arbeitsplatte auch in restaurant und in möbel unter dem ordner tische."_
  piece('kitchen-table', 'Arbeitstisch', 'top', [{ model: bits('kitchentable_A') }], {
    shelf: true,
  }),
  // **Die Arbeitsplatte mit Schneidebrett** — gewünscht als ein gespeichertes
  // Element und nicht als Platte, auf die jede Welt selbst ein Brett legt.
  // Das Messer liegt flach (der Baukasten liefert es stehend) und quer, auf
  // der vorderen Hälfte des Bretts.
  piece(
    'board',
    'Arbeitsplatte mit Schneidebrett',
    'board',
    [
      { model: bits('kitchencounter_straight_B') },
      { model: bits('cuttingboard'), stack: true, surface: true },
      {
        model: bits('knife'),
        stack: true,
        at: [0, 0.12],
        tilt: [Math.PI / 2, 0, 0],
        yaw: Math.PI / 2,
      },
    ],
    { work: 'chop' },
  ),
  // Der Teig wird ausgerollt, nicht geschnitten — dieselbe Station, eine
  // andere Arbeit. Das Nudelholz des Pakets ist 74 cm lang; auf 10 cm Dicke
  // gebracht, liegt es mit 34 cm auf einer Platte von einem Meter.
  piece(
    'rolling-board',
    'Nudelbrett',
    'board',
    [{ model: COUNTER }, { model: bits('rollingpin'), stack: true, height: 0.25 }],
    { work: 'roll' },
  ),
  ...CRATES,
  ...WALLPAPER_CRATES,
  ...FLOORING_CRATES,
  STAIR_CRATE,
  // **Die Pizza-Vorratsbox** — gewünscht: eine Kiste, aus der man eine ganze
  // Pizza nimmt. Die leere Kiste (`crate`, ihr Deckel kommt vom Lader) und
  // die fertige Pizza obenauf, damit man von oben sieht, was drin ist.
  piece(
    'pizza-supply',
    'Pizza-Vorratsbox',
    'crate',
    [
      { model: bits('crate') },
      { model: bits('food_pizza_pepperoni_plated'), stack: true, height: 0.12 },
    ],
    { gives: 'pizza' },
  ),
  // **Der Herd mit Pfanne, wie in der Küche der Sandbox** (`kitchenFit`,
  // `stove-pan`): Die Pfanne ist **kein Teil**, sondern steht zu Beginn darauf
  // (`holds`) und geht mit, wie der Topf auf `stove-pot`. Gemeldet: _„man kann
  // die Pfanne nicht vom Herd nehmen"_ — vorher lag hier eine Pfanne aus dem
  // Regal als Bild auf einer Grillplatte. Was in der Pfanne auf dem Herd liegt,
  // brät (`plateUpStations.tickStation`), und sie ist die der Sandbox
  // (`itemModels.KITCHEN_PAN`).
  piece('stove', 'Herdplatte mit Pfanne', 'stove', [{ model: bits('stove_single') }], {
    holds: 'pan',
  }),
  // **Der Herd mit Topf, wie im Restaurant** — gewünscht: _„Der Herd daneben
  // soll der Herd aus der Restaurant Welt sein und nicht der mit den 4 Platten
  // drauf. Der Topf darauf soll auch der sein aus der Restaurant Welt."_ Also
  // der einflammige Herd und der Topf `pot_A`, wie im Restaurant und in der
  // Küche der Testwelt (`kitchenFit`, `stove-pot`). Der Topf ist **kein Teil**,
  // sondern steht zu Beginn darauf (`holds`): Man nimmt ihn mit zur Spüle
  // (_„Es fehlt noch ein Waschbecken wo ich den Topf vollmachen kann"_), und
  // mit Wasser auf dem Herd kocht er, was man hineintut
  // (`kitchenRecipes.potCooks`) — Pommes aus geschnittenen Kartoffeln.
  piece('stove-pot', 'Herdplatte mit Topf', 'stove', [{ model: bits('stove_single') }], {
    holds: 'pot',
  }),
  // **Die blanke Herdplatte** — derselbe Herd, leer: kein Topf, keine Pfanne.
  // Gewünscht im Möbelkatalog neben „Herdplatte mit Pfanne" und „Herdplatte
  // mit Topf". Sie ist ein Herd für den Topf (`stove`): Wer einen Topf mit
  // Wasser daraufstellt, kocht darin wie auf dem Herd mit Topf.
  piece('hob', 'Herdplatte', 'stove', [{ model: bits('stove_single') }]),
  // **Die sichere Kochstelle, wie in der Sandbox** (`core/kitchenFit`,
  // `griddle`) — gewünscht: _„Man braucht für die sichere Kochstelle keine
  // Pfanne, sondern z.B. das Steak brät darauf automatisch, kann aber nicht
  // verkohlen, sondern nur gebraten werden."_ Was man darauflegt und brät
  // (`kitchenWork`, `'fry'`), brät allein; verkohlen lässt die Stationsschicht
  // es nie (`stationLayer`, `griddle`), und brennen kann es auch nicht.
  //
  // **Das Bild ist das der Sandbox** und nicht aus dem Regal — gewünscht:
  // _„Die sichere Kochstelle soll bitte das Model nutzen welches in sandbox
  // Welt genutzt wird bei den Förderbändern"_: die gebaute Platte mit den
  // roten Ringen (`builtParts`, `built:griddle`).
  piece('griddle', 'Sichere Kochstelle', 'griddle', [{ model: 'built:griddle' }]),
  // **Die Spüle** — die Arbeitsplatte mit Becken und Hahn aus demselben Paket.
  // Wer den Topf davorhält, füllt ihn mit Wasser (`kitchenCarry.atSink`, die
  // Regel der Testküche).
  piece('sink', 'Waschbecken', 'sink', [{ model: bits('kitchencounter_sink') }]),
  // **Der Feuerlöscher auf der Arbeitsplatte** — gewünscht im Ordner
  // _Allgemein_ (_„Feuerlöscher (auf Arbeitsplatte)"_), wie in der Küche der
  // Sandbox (`kitchenFit`, `extinguisher`). Der Löscher ist **kein Teil**,
  // sondern steht zu Beginn darauf (`holds`) und geht mit, wie der Topf auf
  // dem Herd; sein Bild ist der Löscher der Wundertüte (`itemModels`).
  piece('extinguisher', 'Feuerlöscher', 'top', [{ model: COUNTER }], {
    holds: 'extinguisher',
  }),
  // **Die Rohrzange auf der Arbeitsplatte** — damit wird die Spüle wieder
  // dicht, wenn sie spritzt (`kitchenCarry.atSink`, `repair`), wie in der
  // Sandbox, wo sie auf einer Platte neben dem Becken liegt. Sie geht mit.
  piece('pliers', 'Rohrzange', 'top', [{ model: COUNTER }], { holds: 'pliers' }),
  // So hoch wie im Burgerladen (`PlateUpWorld.addBinProp`): Der Eimer aus
  // _Block Bits_ ist 1,17 m, neben einer Platte von 0,50 m ein Silo.
  piece('bin', 'Mülleimer', 'bin', [{ model: 'block-bits/trashcan.glb', height: 0.55 }]),
  // **Die Arbeitsplatte mit Tellern ist ein Abtropfgitter wie in der Sandbox**
  // (`rack`, `core/kitchenFit`, `sink-drain`) — gewünscht: _„Die aktuelle
  // Arbeitsplatte mit Tellern soll hoffentlich genauso klappen wie in der
  // sandbox Welt dort, dass maximal 4 Teller darin gepackt werden können."_
  // Das leere Gitter (`dishrack`); die Teller darin zeigt die Station, einen
  // je Fach, so viele, wie gerade drinstehen. Nie leer wird die Tellerkiste
  // (`crate-plates`).
  piece(
    'plate-stack',
    'Tellerstapel',
    'drain',
    [{ model: COUNTER }, { model: bits('dishrack'), stack: true }],
    { gives: 'plate', rack: true },
  ),
  piece(
    'bowl-stack',
    'Schüsselstapel',
    'drain',
    [
      { model: COUNTER },
      { model: bits('bowl'), stack: true },
      { model: bits('bowl'), stack: true },
    ],
    { gives: 'bowl' },
  ),
  piece(
    'pizzabox-stack',
    'Kartonstapel',
    'drain',
    [{ model: COUNTER }, { model: bits('pizzabox_stacked'), stack: true }],
    { gives: 'pizzabox' },
  ),
  // **Die Eisecke, wie im Burgerladen** (`plateUpIceView.place`), nur nach
  // Süden gedreht: Dort schaut die Platte nach +x, der Stapel steht bei
  // (0,05 | −0,22), der Portionierer bei (0,08 | 0,20). Eine Vierteldrehung
  // später, mit der Vorderseite nach +z, sind das (0,22 | 0,05) und
  // (−0,20 | 0,08). Der Portionierer liegt längs, die Schale zum Stapel hin.
  //
  // **Ein Vorrat** (_„die Arbeitsplatte mit dem scoop und cones … als
  // Vorräte"_): `A` gibt ein Hörnchen (`drain`, nie leer), an den Eiswannen
  // kommen Kugeln darauf, so viele man will — gezeichnet als Turm wie im
  // Restaurant (`plateUpIceView.IceConeView`).
  piece(
    'ice-stand',
    'Eisstand',
    'drain',
    [
      { model: COUNTER },
      { model: bits('icecream_cone_stacked'), on: 0, at: [0.22, 0.05], height: 0.5 },
      {
        model: bits('icecream_scoop'),
        on: 0,
        at: [-0.2, 0.08],
        height: 0.3,
        tilt: [-Math.PI / 2, 0, 0],
        yaw: -Math.PI / 2,
      },
    ],
    { gives: 'cone' },
  ),
  // **Die Eismaschine auf der Arbeitsplatte** — erst Deko, jetzt die Stelle,
  // an der eine Eiswanne gefüllt wird (`icemachine`, `kitchenCarry.atMachine`):
  // leer mit Vanille, danach jedes Mal die nächste Sorte.
  piece('ice-machine', 'Eismaschine', 'icemachine', [
    { model: COUNTER },
    { model: bits('icecream_machine'), stack: true },
  ]),
  // **Drei Eiswannen, je eine auf einer Arbeitsplatte** — gewünscht: _„Also
  // möchte ich 3 Möbel haben Eis trays mit Vanille, erdbeer, Schoko."_ Die
  // Wanne ist kein Teil, sondern ein Ding der Küche, das darauf steht
  // (`holds: 'tray'` mit ihrer Füllung): Man nimmt sie mit zur Maschine oder
  // zum Mülleimer, und auf der Platte schöpft man daraus, ohne dass sie leer
  // wird (`kitchenRecipes.trayScoop`). Sie liegt um 90° gedreht
  // (`dishView`).
  iceTray('ice-tray-vanilla', 'Eiswanne Vanille', 'ice-vanilla'),
  iceTray('ice-tray-strawberry', 'Eiswanne Erdbeere', 'ice-strawberry'),
  iceTray('ice-tray-chocolate', 'Eiswanne Schoko', 'ice-chocolate'),
  // **Die Vorratskiste mit leeren Eiswannen** — _„Ich will noch zudem eine
  // vorratskiste mit Eis trays leer."_ Die leere Kiste und darin, quer, zwei
  // leere Wannen übereinander.
  piece(
    'crate-trays',
    'Kiste mit Eiswannen',
    'crate',
    [
      { model: bits('crate') },
      {
        model: bits('icecream_container'),
        on: 0,
        sink: 0.3,
        yaw: Math.PI / 2,
        scale: TUB_SCALE,
      },
      { model: bits('icecream_container'), stack: true, yaw: Math.PI / 2, scale: TUB_SCALE },
    ],
    { gives: 'tray' },
  ),
  // **Das Band ist eine Kachel** — gewünscht: _„Statt 2x1 conveyers will ich
  // 1x1 conveyer belts haben."_ Das quadratische Band aus _Platformer_
  // (`conveyor_4x4x1_yellow`), das der Lader auf 1 × 1 × 0,5 m bringt
  // (`core/kaykitFit.KAYKIT_FILE_SCALE`). Die Pfeile der Datei zeigen nach
  // Norden; eine halbe Drehung, und sie zeigen dorthin, wohin das Element
  // schaut. Flach und ohne Station: Was darauf fährt, regelt die Welt.
  {
    id: 'belt',
    label: 'Förderband',
    tiles: [1, 1],
    height: 0.5,
    kind: null,
    parts: [{ model: 'platformer/yellow/conveyor_4x4x1_yellow.glb', yaw: Math.PI }],
  },
  // **Die Vorratsbox für fertiges Essen** — die leere Kiste der
  // Pizza-Vorratsbox, aber ohne Zweck: Was obenauf liegt und was `A` daran
  // tut, ist je Gericht verschieden und Sache der Welt. Das Element sorgt nur
  // dafür, dass sie steht und im Weg ist.
  piece('supply-box', 'Vorratsbox', null, [{ model: bits('crate') }]),
  // **Der Pizzaofen** — zum Ansehen, ohne Zweck.
  piece('pizza-oven', 'Pizzaofen', null, [{ model: bits('pizza_oven') }]),
  // Der runde Tisch mit roter Decke: 1,5 m, auf 2 × 2 Kacheln.
  {
    id: 'table-round',
    label: 'Runder Tisch',
    tiles: [2, 2],
    height: BODY,
    kind: null,
    // Eine Ablage für Möbel (`shelf`): Tasse, Lampe, Bücher auf die Decke.
    shelf: true,
    parts: [{ model: bits('table_round_B_tablecloth_red') }],
  },
  piece('chair', 'Stuhl', null, [{ model: bits('chair_A') }]),
  // **Die Natur** — Bäume, Sträucher, Steine, Gras, Holz (`natureCatalog.ts`).
  ...NATURE_ELEMENTS,
  ...NATURE_COLOR_ELEMENTS,
  // **Der Weltraum** — die Teile aus _Space Base Bits_ (`spaceCatalog.ts`).
  ...SPACE_ELEMENTS,
  ...CITY_ELEMENTS,
  // **Die Möbel** — _Furniture Bits_: Tische als Ablage, Kleinkram, Teppiche
  // (`furnitureCatalog.ts`).
  ...FURNITURE_BITS_ELEMENTS,
  // **Taverne, Halloween, Weihnachten** — _Dungeon_, _Halloween Bits_,
  // _Holiday Bits_ (`tavernCatalog.ts`, `halloweenCatalog.ts`,
  // `holidayCatalog.ts`).
  ...TAVERN_ELEMENTS,
  ...HALLOWEEN_ELEMENTS,
  ...HOLIDAY_ELEMENTS,
  ...BOARD_GAME_ELEMENTS,
  ...RESOURCE_ELEMENTS,
  ...PLATFORMER_ELEMENTS,
  ...MYSTERY_ELEMENTS,
];

/**
 * **Der Möbelkatalog im Menü** — die Elemente, die man in einer Welt mit
 * Stationen selbst hinstellt (Menü _Möbel_, `PortalWorld.elementMenu`), in
 * dieser Reihenfolge. Gewünscht: _„Ich brauche bei Möbel Katalog, die
 * Funktion Möbel: eine Arbeitsplatte 2x2 nicht durchlaufen, Arbeitsplatte mit
 * Schneide Brett, Herdplatte mit Pfanne, Herdplatte mit Topf, Herdplatte.
 * Waschbecken"_ — und dazu _„die Arbeitsplatte mit dem scoop und cones und
 * die Platte mit ice trays als Vorräte"_. Dann die Vorräte (_„vorratskisten:
 * Salat, Käse, Wurst, Steak, Tomaten, Teller, Schüssel, Zwiebel, …"_): die
 * Kisten in der Reihenfolge des Wunsches — die Wurst ist der Schinken, das
 * Steak die Steakkiste, gleich daneben die Pattykiste —, Teller und Schüssel
 * als Stapel,
 * danach der Rest, der in einer Küche etwas hergibt oder tut.
 *
 * **Salami und Pilze fehlen mit Absicht** (`SHOW_ONLY_GIVES`): Sie sind noch
 * keine Zutat der Küche und täten auf `A` nichts. Jedes Element hier sperrt
 * seine Kachel (2 × 2 Zellen) und tut auf `A`, was es in der Küche tut.
 */
export const FURNITURE_CATALOGUE: readonly string[] = [
  'counter',
  'board',
  'stove',
  'stove-pot',
  'hob',
  'griddle',
  'sink',
  'ice-stand',
  'ice-tray-vanilla',
  'ice-tray-strawberry',
  'ice-tray-chocolate',
  'crate-trays',
  'ice-machine',
  'crate-lettuce',
  'crate-cheese',
  'crate-ham',
  'crate-steak',
  'crate-patties',
  'crate-tomatoes',
  'plate-stack',
  'crate-plates',
  'bowl-stack',
  'crate-onions',
  'crate-buns',
  'crate-dough',
  'crate-carrots',
  'crate-potatoes',
  'pizza-supply',
  'pizzabox-stack',
  'rolling-board',
  'bin',
  'extinguisher',
  'pliers',
  'crate-mushrooms',
];

/**
 * **Was im Möbelkatalog nur zum Ansehen steht** — ohne Zweck, noch. Jedes
 * andere Möbel dort tut auf `A` etwas (`elementCatalog.test.ts`).
 */
export const DECOR: ReadonlySet<string> = new Set<string>();

/** **Ein Unterordner des Möbelkatalogs** — ein Gericht und was man dafür hinstellt. */
export interface FurnitureFolder {
  /** Eindeutig unter den Ordnern, etwa `'pizza'`. */
  readonly id: string;
  /** Der Name im Menü. */
  readonly label: string;
  /** Die Elemente darin, jedes auch in `FURNITURE_CATALOGUE`. */
  readonly elements: readonly string[];
  /**
   * **Regalmodelle darin** — genommen wie im Modellregal, kein Spielelement
   * (die Wände, `WALL_MODELS`).
   */
  readonly models?: readonly string[];
  /**
   * **Regalwände zum Abreißen** — genommen wie `models`, gezogen wie eine
   * Wand, aber die Linie nimmt die Wände auf ihren Fugen weg
   * (`WALL_ERASER`). Die Kachel trägt das Verbotszeichen.
   */
  readonly erasers?: readonly string[];
  /**
   * **Dinge für die Hand** — Ids aus der Küche (`KitchenItem`), die man aus
   * dem Katalog direkt in die Hand nimmt, wie aus ihrer Kiste: die Tapeten
   * (`house/wallpaper.ts`). Nur in einer Welt, die sie tragen kann
   * (`PortalWorld.catalogItem`).
   */
  readonly items?: readonly string[];
  /**
   * **Unterordner** — wie der Kauf- und Baumodus in _Die Sims_, der erst nach
   * Bereich (_Haus_, _Restaurant_) und darin nach Art sortiert. Ein Ordner
   * mit Unterordnern zeigt diese vor seinen eigenen Kacheln.
   */
  readonly folders?: readonly FurnitureFolder[];
  /**
   * **Das Bild auf dem Ordner** — das Möbel, das ihn am deutlichsten sagt,
   * gerendert und stehend (gewünscht: _„Menü Ordner sollen Icons/Symbole
   * bekommen oder das prägnante Möbel Element gerendert"_). Ohne Angabe das
   * erste Stück darin (`folderCover`).
   */
  readonly cover?: FolderCover;
}

/** **Was auf einem Ordner abgebildet ist** — ein Element, ein Regalmodell oder ein Ding für die Hand. */
export type FolderCover =
  { readonly element: string } | { readonly model: string } | { readonly item: string };

/**
 * **Das Bild eines Ordners** — `cover`, sonst das erste Stück in der
 * Reihenfolge der Kacheln (Dinge, Elemente, Modelle), sonst das Bild des
 * ersten Unterordners. `null`, wenn der Ordner leer ist.
 */
export function folderCover(folder: FurnitureFolder): FolderCover | null {
  if (folder.cover) return folder.cover;
  const item = folder.items?.[0];
  if (item) return { item };
  const element = folder.elements[0];
  if (element) return { element };
  const model = folder.models?.[0];
  if (model) return { model };
  for (const inner of folder.folders ?? []) {
    const cover = folderCover(inner);
    if (cover) return cover;
  }
  return null;
}

/**
 * **Einen Ordner irgendwo im Baum ändern** — gesucht nach `id` auf jeder
 * Ebene. Für Welten, die einem Ordner etwas hinzufügen (der Hausbau legt die
 * Tapeten zu den Wänden und Böden und Treppen ins _Haus_).
 */
export function mapFolder(
  folders: readonly FurnitureFolder[],
  id: string,
  change: (folder: FurnitureFolder) => FurnitureFolder,
): FurnitureFolder[] {
  return folders.map((folder) => {
    const inner = folder.folders
      ? { ...folder, folders: mapFolder(folder.folders, id, change) }
      : folder;
    return folder.id === id ? change(inner) : inner;
  });
}

/** **Alle Ordner des Baums**, jeder vor seinen Unterordnern. */
export function allFolders(folders: readonly FurnitureFolder[]): FurnitureFolder[] {
  return folders.flatMap((folder) => [folder, ...allFolders(folder.folders ?? [])]);
}

/** Die Elemente nach Namen. */
const BY_ID = new Map(ELEMENTS.map((element) => [element.id, element]));

/**
 * **Die Ordner der Küche** — im Katalog unter _Restaurant_
 * (`FURNITURE_FOLDERS`): vorn _Allgemein_, dann nach Art _Kochen_, _Vorräte_
 * und _Geschirr_, dann je Gericht die Möbel, die man dafür braucht, in der
 * Reihenfolge, in der man sie benutzt, und zuletzt _Alles_ mit jedem Möbel
 * der Küche.
 *
 * Gewünscht: _„In dem Menü Möbel will ich ggf einige Möbel doppelt gelistet
 * haben (sind aber die gleichen) nur weil ich in dem Ordner noch weiter
 * gruppieren will bzw. unterordner erstellen will: Pizza, Burger, Eis,
 * Waffeln, Suppe"_ — und danach: _„bei den unter Ordner die Arbeitsplatte
 * jeweils rein. Und die Möbel aus dem Restaurant Ordner dafür raus. Dafür
 * einen Ordner allgemein, in welchem dann Waschbecken, Mülleimer, und
 * Feuerlöscher (auf Arbeitsplatte) liegt. Bei dem Burger und Pizza noch die
 * Teller Vorrats Kiste rein. Im Restaurant Ordner noch einen Ordner „alles“ in
 * welchem dann alle Möbel die zur Küche gehören drin sind."_
 *
 * **Doppelt ist hier nur der Eintrag, nicht das Möbel**: Dieselbe Id steht in
 * mehreren Ordnern, und hingestellt wird jedes Mal dasselbe Element. Welche
 * Möbel zu einem Gericht gehören, sagt die Regel der Küche
 * (`elementFlows.test.ts` kocht jedes davon mit genau diesen Möbeln).
 */
export const KITCHEN_FOLDERS: readonly FurnitureFolder[] = [
  {
    id: 'general',
    label: 'Allgemein',
    elements: ['counter', 'sink', 'pliers', 'bin', 'extinguisher'],
    cover: { element: 'sink' },
  },
  // **Nach Art** (September 2026), wie die Sims ihre Küchenmöbel ordnen:
  // Kochen, Vorräte, Geschirr — für wen nicht weiß, welches Gericht es wird.
  {
    id: 'cooking',
    label: 'Kochen',
    elements: [
      'counter',
      'board',
      'rolling-board',
      'stove',
      'stove-pot',
      'hob',
      'griddle',
      'ice-machine',
    ],
    cover: { element: 'stove' },
  },
  // **Arbeitsplatten** — gewünscht: _„In restaurant fehlen mir die
  // Arbeitsplatten als kategorie, da soll auch
  // restaurant-bits/kitchentable_A.glb rein."_
  {
    id: 'counters',
    label: 'Arbeitsplatten',
    elements: ['counter', 'kitchen-table'],
    cover: { element: 'kitchen-table' },
  },
  {
    id: 'supplies',
    label: 'Vorräte',
    elements: ['counter', ...FURNITURE_CATALOGUE.filter((id) => BY_ID.get(id)?.kind === 'crate')],
    cover: { element: 'crate-tomatoes' },
  },
  {
    id: 'dishes',
    label: 'Geschirr',
    elements: ['counter', 'plate-stack', 'crate-plates', 'bowl-stack', 'pizzabox-stack', 'sink'],
    cover: { element: 'plate-stack' },
  },
  {
    id: 'pizza',
    label: 'Pizza',
    elements: [
      'counter',
      'pizza-supply',
      'board',
      'pizzabox-stack',
      'plate-stack',
      'crate-plates',
      'bin',
    ],
    cover: { element: 'pizza-supply' },
  },
  {
    id: 'burger',
    label: 'Burger',
    elements: [
      'counter',
      'crate-buns',
      'crate-patties',
      'crate-steak',
      'crate-lettuce',
      'crate-tomatoes',
      'crate-cheese',
      'crate-ham',
      'board',
      'stove',
      'griddle',
      'plate-stack',
      'crate-plates',
      'bin',
    ],
    cover: { element: 'crate-patties' },
  },
  {
    id: 'ice',
    label: 'Eis',
    elements: [
      'counter',
      'ice-stand',
      'bowl-stack',
      'ice-tray-vanilla',
      'ice-tray-strawberry',
      'ice-tray-chocolate',
      'crate-trays',
      'ice-machine',
    ],
    cover: { element: 'ice-stand' },
  },
  {
    id: 'waffles',
    label: 'Waffeln',
    elements: [
      'counter',
      'crate-dough',
      'board',
      'stove',
      'griddle',
      'bowl-stack',
      'ice-tray-vanilla',
      'ice-tray-strawberry',
      'ice-tray-chocolate',
    ],
    cover: { element: 'crate-dough' },
  },
  {
    id: 'soup',
    label: 'Suppe',
    elements: [
      'counter',
      'crate-carrots',
      'crate-onions',
      'crate-tomatoes',
      'crate-mushrooms',
      'board',
      'stove-pot',
      'hob',
      'sink',
      'pliers',
      'bowl-stack',
    ],
    cover: { element: 'stove-pot' },
  },
  // **Alles, was zur Küche gehört** — die ganze Liste des Katalogs.
  { id: 'all', label: 'Alles', elements: FURNITURE_CATALOGUE, cover: { element: 'board' } },
];

/**
 * **Die obersten Ordner des Katalogs** — erst der Bereich, dann die Art, wie
 * in _Die Sims_: **Haus** mit Wand, Tür und Fenster (`HOUSE_FOLDER`, im
 * Hausbau dazu Treppe, Böden und Tapeten) und **Restaurant** mit der Küche
 * (`KITCHEN_FOLDERS`), dazu **Natur** mit Bäumen, Sträuchern und Steinen
 * (`NATURE_FOLDER`). Gewünscht: _„Katalog Ordner besser gruppieren (Haus,
 * Restaurant, etc.)"_. Vorher standen zehn Ordner aus zwei Welten
 * nebeneinander, Pizza neben Fenster.
 */
export const FURNITURE_FOLDERS: readonly FurnitureFolder[] = [
  HOUSE_FOLDER,
  // **Möbel** — gewünscht: _„Und nun furniture als Katalog Ordner aus
  // Modelregal"_ (`furnitureCatalog.ts`). Gleich nach dem Haus: Erst die
  // Wände, dann was hineinkommt.
  FURNITURE_BITS_FOLDER,
  {
    id: 'restaurant',
    label: 'Restaurant',
    elements: [],
    folders: KITCHEN_FOLDERS,
    cover: { element: 'stove' },
  },
  // **Natur** — gewünscht: _„beim Katalog möchte ich nun gerne Natur als
  // weiteren Punkt haben"_ (`natureCatalog.ts`).
  NATURE_FOLDER,
  // **Weltraum** — gewünscht: _„beim Katalog eine weiteren Ordner anlegen:
  // Weltraum und darin die Space base Teile einbauen"_ (`spaceCatalog.ts`).
  SPACE_FOLDER,
  // **Stadt** — gewünscht: _„die großen Straßen-Elemente als Katalog-Ordner
  // ‚Stadt' […], die aber eben einen Boden mit Möbeln darstellen"_
  // (`cityCatalog.ts`).
  CITY_FOLDER,
  // **Taverne, Halloween, Weihnachten** — gewünscht als weitere Gruppen aus
  // dem Modellregal (Oktober 2026): _„Ich denke auch 4 und 3 und 2 wären
  // gut."_ — Weihnachten, Halloween, Taverne.
  TAVERN_FOLDER,
  HALLOWEEN_FOLDER,
  HOLIDAY_FOLDER,
  // **Brettspiel, Rohstoffe, Parcours, Requisiten** — gewünscht (Oktober
  // 2026): _„Die Game Board Bits gerne als eigenen Ordner in Katalog. Resource
  // Bits auch gerne. Mystery monthly 5 und 6 gern. Plattformer ja"_.
  BOARD_GAME_FOLDER,
  RESOURCE_FOLDER,
  PLATFORMER_FOLDER,
  MYSTERY_FOLDER,
];

/**
 * **Ein Element nach seinem Namen** — ein Tippfehler in einem Plan ist ein
 * Fehler beim Aufbau und kein leerer Fleck in der Welt.
 */
export function elementById(id: string): GameElement {
  const element = BY_ID.get(id);
  if (!element) throw new Error(`Unbekanntes Spielelement: ${id}`);
  return element;
}

/**
 * **Ob das Möbel selbst den Saum bekommen kann** (`GameElement.lit`) — ohne
 * Angabe jedes Element mit Zweck: eine Station der Küche oder etwas, das eine
 * Seite aufmacht (`opens`). Was nur im Weg steht (Tisch, Band), wird nie
 * gemeint und bleibt ein festes Stück der Welt.
 */
export function elementLit(element: GameElement): boolean {
  return element.lit ?? (element.kind !== null || element.opens !== undefined);
}

/** Ob es ein Element dieses Namens gibt. */
export function hasElement(id: string): boolean {
  return BY_ID.has(id);
}
