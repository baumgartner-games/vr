import * as THREE from 'three';
import {
  SINK_BOWL,
  kitchenDeck,
  kitchenPiece,
  kitchenPieceScale,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { canLoadModels, CHEF_CARRY } from '../../../core/chefFit';
import { USE_REACH, type UseSource } from '../../../core/usable';
import { holdFor, nearestHandle, type GrabHandle, type GrabPose } from '../../../core/grabHandles';
import { HandleView } from '../../../core/handleView';
import type { Handedness } from '../../../core/XRInput';
import { TILE } from '../../nav/navTile';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import type { PlayerAvatar } from '../../../core/PlayerAvatar';
import type { PlayerRig } from '../../../core/PlayerRig';
import { kitchenEyeScale, onPostureChange } from '../../../core/posture';
import type { WorldContext } from '../../../core/types';
import { TextPlane } from '../../../ui/TextPlane';
import { KITCHEN } from '../layout';
import {
  CLEAN_STACK_MAX,
  COLD_STOVE,
  IDLE_WORK,
  ITEM_LABELS,
  advanceStove,
  advanceWork,
  dish,
  dishLabel,
  douse,
  kitchenDeed,
  kitchenInteractionSpec,
  kitchenPrompt,
  layered,
  meansContent,
  onStove,
  onWork,
  stovePhase,
  stoveProgress,
  workProgress,
  workWaits,
  type Dish,
  type KitchenItem,
  type Station as StationFacts,
  type KitchenDeed,
  type StationKind,
  type StovePhase,
  type StoveState,
  type WorkKind,
  type WorkState,
} from './kitchenCarry';
import { DIRTY_STACK_MAX, FoodKit, SINK_TILT } from './kitchenProps';
import {
  KITCHEN_STATION_GRAB,
  kitchenGrab,
  kitchenHandles,
  kitchenPieceGrab,
  pieceHandles,
} from './kitchenGrab';
import { GAUGE_LIFT, KitchenGauges, WARN_LIFT } from './kitchenGauge';
import { IconOven } from './kitchenIcon';
import { KitchenFloor } from './kitchenFloor';
import { buildKitchenNotice } from './kitchenNotice';
import type { SignBoard } from '../../signs/SignBoard';
import {
  BUILD_BUTTON_TILE,
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  TURN_LABELS,
  footprint,
  inKitchen,
  stationKind,
  type Spot,
  type Turn,
} from './kitchenPlan';
import {
  CLEAR_TABLE,
  advanceTable,
  cleared,
  eatProgress,
  freeTable,
  seat,
  type TableState,
} from './kitchenGuests';
import {
  BUILD_AHEAD,
  buildFree,
  holdForRim,
  ridesAlong,
  tileAhead,
  turnAhead,
  whyNotBuilt,
  whyNotLifted,
  type BuildLoad,
  type BuildSpot,
} from './kitchenBuild';
import {
  BeltKit,
  BELT_EMPTY,
  advanceBelts,
  beltBound,
  beltDelivers,
  beltKind,
  beltReach,
  beltReleases,
  beltStep,
  beltTrashes,
  type BeltFrame,
  type BeltState,
  type BeltTile,
} from './kitchenBelt';
import {
  DRY,
  SprayJet,
  advanceDouse,
  douseProgress,
  inSpray,
  sprayOn,
  type DouseState,
} from './kitchenSpray';
import { buildRedButton, BUTTON_DOME_R, type RedButton } from '../../shared/redButton';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Küche** — Norden, hinter dem Podest, und die einzige Zone dieser Welt,
 * die aus einem **gekauften Modell** besteht.
 *
 * Die Möbel sind „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S,
 * CC-BY-4.0 (`public/models/CREDITS.md`), aufbereitet von
 * `tools/kitchen-model.mjs` in dreizehn einzeln setzbare Stücke
 * (`core/kitchenFit.ts`, `core/kitchenModel.ts`). Das vierzehnte und das
 * fünfzehnte — das **Förderband** und das **Zugband** — stecken in keiner
 * Datei und werden gebaut (`KitchenPiece.built`, `kitchenBelt.ts`).
 *
 * Die Zone besteht aus **zwei Hälften**, und beide haben eine Aufgabe:
 *
 * - **Die Küche selbst** (Westen): drei Bänder, wie in jeder Küche dieses
 *   Spiels — die Geräte an der Wand, eine Insel zum Schnippeln, vorn die
 *   Ausgabe. Hier wird gekocht: Zutaten kommen aus den Ausgaben an der
 *   Westwand, das Patty in die Pfanne, Salat und Tomate auf das Brett, und
 *   alles zusammen auf ein Brötchen — und am Ende **auf einen Teller**, denn
 *   ohne den geht nichts über die Theke.
 * - **Der Schauraum** (Osten): **jedes** der Möbel noch einmal, frei stehend
 *   und beschriftet. In einer Zeile aus acht Schränken sieht man ein einzelnes
 *   Möbel nicht; wer wissen will, wie die Spüle aussieht, will sie allein
 *   sehen und nicht zwischen zwei Herden.
 *
 * **Der Kreis ist jetzt geschlossen.** Der Teller geht mit über die Theke, ein
 * Gast isst davon (`kitchenGuests.ts`), und was er zurücklässt, ist Arbeit:
 * ein dreckiger Teller, der an der Rückgabe stapelt und in der Spüle wieder
 * sauber wird. Vorher endete ein Burger im Nichts, und die Tellerausgabe war
 * ein Brunnen.
 *
 * **Wo was steht, steht nebenan** (`kitchenPlan.ts`): Der Grundriss wird
 * gestempelt, lange bevor ein Modell geladen ist, und ein Test rechnet ihn
 * nach — beides braucht die Zahlen und nicht diese Klasse. Von hier aus wird
 * alles davon weitergereicht (`export *`), damit `testPlan.ts` und die Welt
 * ihre Importe behalten.
 *
 * **Diese Datei ist der Rest**: Netze umhängen, Körper bauen, Uhren laufen
 * lassen, Anzeigen setzen. Die **Regeln** stehen daneben und werden hier nicht
 * noch einmal gerechnet — was `A` bewirkt, sagt `kitchenCarry.kitchenDeed`;
 * woraus ein Burger besteht, `kitchenRecipes.ts`; wie lange etwas dauert,
 * `kitchenClock.ts` und `kitchenWork.ts`; wer wo Platz hat, `kitchenBuild.ts`.
 * Die Zone **setzt nur um**, was dort herauskommt. Jede Zeile, die hier selbst
 * nachrechnet, ob ein Patty gebraten genug ist, wäre die zweite Wahrheit, die
 * beim nächsten Umbau auseinanderläuft.
 *
 * **Und die Kochfigur passt dazu.** Sie ist 1,60 m hoch und ihre Augen liegen
 * bei 0,91 m (`core/chefFit.ts`) — genau deshalb wurde sie so skaliert und
 * nicht auf Menschengröße: neben einem Tresen von einem Meter soll ein Koch
 * stehen und kein Riese im Puppenhaus.
 */

export * from './kitchenPlan';

/**
 * **Wie hoch ein Küchenmöbel für die Füße mindestens ist**, in Metern.
 *
 * Ein Tresen ist einen halben Meter hoch, und der Spieler springt mit 4,4 m/s
 * ab — das ist gut ein Meter Scheitelhöhe (`PhysicsLocomotion.jumpSpeed`).
 * Ohne diese Zahl steht man nach dem ersten Sprung **auf** der Küchenzeile und
 * läuft die ganze Wand entlang, über Spüle und Herd hinweg.
 *
 * Anderthalb Köpfe über dem Tresen, und damit ein gutes Stück über dem, was
 * ein Sprung hergibt. Der Kasten ist unsichtbar (siehe `addBody`), das Möbel
 * darunter bleibt einen halben Meter hoch — man greift also weiter über den
 * Tresen, man steigt nur nicht mehr darauf.
 */
const BLOCK_HEIGHT = 1.4;

/**
 * **Wo das Getragene hängt** (`core/chefFit.CHEF_CARRY`) — als Vektor, weil
 * die Figur einen bekommt und keine drei Zahlen (`PlayerAvatar.carry`).
 *
 * Einer für die ganze Zone: Er wird jedes Bild weitergereicht und nie
 * verändert, und ein neuer je Bild wäre ein Vektor je Bild.
 */
const CARRY_POINT = new THREE.Vector3(CHEF_CARRY.x, CHEF_CARRY.y, CHEF_CARRY.z);

/**
 * **Wie hoch der Belag in der Pfanne liegt**, über deren Fuß.
 *
 * Die Pfanne ist 13 cm hoch (Herd 0,55 m, Herd mit Pfanne 0,68 m —
 * `core/kitchenFit.KITCHEN_PIECES`), ihr Boden liegt knapp darüber. Ohne
 * diese Fingerbreit steckt das Patty im Pfannenboden statt darin.
 *
 * Die Zahl gilt im Raum des **geladenen Netzes** und nicht in dem der Welt:
 * `FoodKit.topping` bekommt sie und hängt den Belag genau dorthin
 * (`kitchenProps.ts`) — wie hoch der Rand einer geladenen Pfanne liegt, weiß
 * nur, wer sie gemessen hat.
 */
const PAN_RIM = 0.04;

/**
 * **Wie weit die Figur von einer Station weg sein darf**, damit dort
 * gearbeitet wird, in Metern.
 *
 * Gemessen von der **Mitte des Möbels** zur Figur, waagerecht. `USE_REACH`
 * ist die Reichweite, mit der `A` überhaupt etwas erwischt (`core/usable.ts`)
 * — wer schneiden oder spülen lassen will, muss also ungefähr so nah stehen,
 * wie er zum Auflegen stand.
 *
 * **Warum nicht `Station.live`.** Es liegt nahe, dafür den Zustand zu nehmen,
 * den `refreshStations` ohnehin führt — aber der sagt etwas anderes: Er heißt
 * „diese Station hätte gerade etwas zu tun" und nicht „jemand steht davor".
 * Ein Brett mit einem Salatkopf darauf ist auch dann angemeldet, wenn die
 * Figur am anderen Ende der Küche steht. Welches benutzbare Ding gerade
 * **gemeint** ist, rechnet `pickUsable` aus und behält es für sich — also
 * rechnet die Zone den Abstand selbst, mit derselben Zahl.
 *
 * **Und wer weggeht, fängt von vorn an.** Das ist neu und ausdrücklich so
 * gewollt: `advanceWork` bricht die Arbeit ab, sobald niemand mehr davorsteht
 * (`kitchenWork.ts`). Zurückkommen allein genügt seither nicht mehr — das
 * Stück will erneut aufgenommen und noch einmal abgesetzt werden, und erst
 * das armiert die Uhr wieder (`settle`).
 */
const WORK_REACH = USE_REACH;

/**
 * **Wie lange die Tafel an der Ausgabetheke stehen bleibt**, in Sekunden, und
 * wie hoch über der Theke sie schwebt, in Metern.
 *
 * Vier Sekunden sind lang genug, um sie im Vorbeigehen zu lesen, und kurz
 * genug, dass beim nächsten Gericht nicht noch das vorige dasteht.
 *
 * 0,95 m über der Arbeitsplatte heißt: **über** dem Ausgaberegal, dessen
 * Oberkante über der Theke liegt (`kitchenPlan.rackLift`). Tiefer steckte die
 * Tafel zwischen den Wärmeschirmen.
 */
const TICKET_SECONDS = 4;
const TICKET_LIFT = 0.95;

/**
 * **Was auf dem Schild des Umbauknopfes steht** — je nachdem, wohin der
 * nächste Druck führt.
 *
 * Nicht der Zustand („Baumodus"), sondern die **Tat**: Wer davorsteht, will
 * wissen, was passiert, wenn er drückt, und nicht, wie das heißt, worin er
 * gerade ist. Dieselbe Regel wie bei jedem anderen Hinweis dieser Welt
 * (`core/usable.Usable.usePrompt`).
 */
const BUILD_BUTTON_LABELS = { off: 'Küche umbauen', on: 'Küche nutzen' } as const;

/**
 * **Wie das Möbel in den Händen liegt** — die Seite und nicht die
 * Himmelsrichtung (`Furnish.hold`, `turnPiece`).
 *
 * Himmelsrichtungen stehen an der abgesetzten Küche (`kitchenPlan.TURN_LABELS`)
 * und stimmen dort auch: Ein Band schiebt nach Süden, und das bleibt so. In den
 * **Händen** wäre dieselbe Auskunft eine, die beim nächsten Schritt nicht mehr
 * gilt — wer sich umdreht, trägt sein Möbel nicht anders, aber es zeigt
 * woandershin. „Nach links" bleibt „nach links".
 *
 * Die Reihenfolge ist die von `Spot.turn`: ein Viertel weiter ist gegen den
 * Uhrzeigersinn, von oben gesehen also nach links.
 */
const HOLD_LABELS: readonly string[] = ['nach vorn', 'nach links', 'zu dir', 'nach rechts'];

/**
 * **Wie durchsichtig der Bauplatz ist** und in welchen Farben er antwortet.
 *
 * Grün heißt „hier passt es", rot „hier nicht" — und beides zeigt sich schon,
 * **bevor** jemand drückt. Ein Umriss, der erst nach dem Absetzen sagt, dass
 * es nicht geht, ist ein Umriss, der einen zweimal laufen lässt.
 */
const GHOST_ALPHA = 0.35;
const GHOST_FREE = 0x7de88a;
const GHOST_BLOCKED = 0xe5361c;

/** Wie hoch der Umriss des Bauplatzes ist, in Metern — knapp über der Theke. */
const GHOST_HEIGHT = 0.6;

/** Die Stelle, an der eine Anzeige schweben soll — ein Vektor für die Zone. */
const _at = new THREE.Vector3();
/** Wo die Figur steht und wohin sie zielt — für Arbeit, Nebel und Bauplatz. */
const _feet = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _rigAhead = new THREE.Vector3();
const _headAhead = new THREE.Vector3();
const _nozzle = new THREE.Vector3();
const _spin = new THREE.Quaternion();
// Die Griffe: eine Hülle zum Messen, eine Handpose zum Wählen (`core/grabHandles.ts`).
const _bounds = new THREE.Box3();
const _extent = new THREE.Vector3();
const _grabAt = new THREE.Vector3();
const _atStation: GrabPose = {
  position: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0, w: 1 },
};

// --- und was darin steht ----------------------------------------------------

/**
 * **Eine Stelle, an der `A` etwas bewirkt.**
 *
 * Alles, was hier liegt, ist **ein** `Dish` (`kitchenRecipes.ts`) — die Pfanne
 * mit dem Patty darin, der Teller mit dem halben Burger darauf, der Salatkopf
 * auf dem Brett. Vorher hatte diese Struktur je Stationsart ein eigenes Feld
 * (`chops`, `pan`, `cook`, `done`, `stack`), und die liefen mit jeder neuen
 * Art auseinander: Eine Anrichte mit halbem Stapel meldete sich nicht, weil
 * sie nach der Zählung des Herdes leer war.
 *
 * Geblieben sind die Zustände, die eine **Uhr** führen, und jeder gehört
 * seiner Datei und nicht dieser: `StoveState` (`kitchenClock.ts`), `WorkState`
 * (`kitchenWork.ts`), `TableState` (`kitchenGuests.ts`), `BeltState`
 * (`kitchenBelt.ts`), `DouseState` (`kitchenSpray.ts`). Sie stehen an der
 * Station, weil sie **dort** hingehören — nimmt jemand die Pfanne mit, bleibt
 * ihr Fortschritt am Herd zurück, und das ist der Grund, warum es in der Hand
 * nicht weiterbrät.
 *
 * Der **Stapel** der Rückgabe ist der eine Inhalt, der kein `Dish` ist: Dort
 * liegt kein Teller, sondern eine Anzahl davon.
 */
interface Station {
  readonly kind: StationKind;
  /** Wie sie im Hinweis heißt — _Küchenzeile_, _Mülleimer_, _Salatausgabe_. */
  readonly label: string;
  /** Woran der gelbe Saum hängt und worauf gezielt wird. */
  readonly object: THREE.Object3D;
  /** Wo etwas darauf liegt, in Weltkoordinaten. */
  readonly deck: THREE.Vector3;
  /** Was die Ausgabe hergibt. */
  readonly gives?: KitchenItem;
  /** Der Schlüssel ihrer Anzeigen (`kitchenGauge.KitchenGauges`). */
  key: string;
  /** Das Möbel darunter — im Baumodus wandert es, und die Station mit ihm. */
  readonly home: Furnish;
  /** Was gerade darauf liegt — beim Herd ist das die Pfanne. */
  on: Carried | null;
  /** Die Uhr am Herd; `COLD_STOVE` überall sonst. */
  stove: StoveState;
  /** Die Uhr am Brett und in der Spüle; `IDLE_WORK` überall sonst. */
  work: WorkState;
  /** Der Gast am Tisch; `CLEAR_TABLE` überall sonst. */
  table: TableState;
  /** Wie weit etwas über das Band gewandert ist; `BELT_EMPTY` überall sonst. */
  belt: BeltState;
  /** Wie lange dieser Herd schon im Nebel steht; `DRY`, solange er es nicht tut. */
  wet: DouseState;
  /** Wie viele dreckige Teller hier liegen — nur an der Rückgabe. */
  stack: number;
  /** Das Netz dieses Stapels, solange einer steht. */
  pile: THREE.Object3D | null;
  /** Was ihre Anzeigen zuletzt gezeigt haben — siehe `showGauges`. */
  shown: StovePhase | 'work' | 'eat' | 'douse' | null;
}

/**
 * **Ein Möbel, so wie der Baumodus es sieht** — das Netz, seine Kachel, sein
 * Kasten und sein Körper.
 *
 * Bis eben war ein aufgestelltes Möbel eine Zeile in `place()` und danach
 * vergessen: Es stand, und damit war die Sache erledigt. Wer es aufheben will,
 * braucht alles wieder in der Hand — welches Katalogstück es ist (für die
 * Grundfläche), wo es steht (für die Prüfung auf Platz), und was an
 * unsichtbarer Sperre daran hängt (damit die nicht stehen bleibt, wo nichts
 * mehr ist).
 */
interface Furnish {
  readonly piece: KitchenPiece;
  readonly spot: Spot;
  /** Die nordwestliche Kachel, relativ zur Zone — im Baumodus wandert sie. */
  x: number;
  z: number;
  /**
   * **Wie herum es steht**, in Weltvierteln — im Baumodus zeigt es dorthin,
   * wohin die Figur zeigt (`facePiece`), also ist es nicht mehr das, was im
   * Aufbau stand.
   */
  turn: Turn;
  /**
   * **Wie herum es in den Händen liegt** — Viertel **relativ zur Figur**, und
   * nur solange es getragen wird.
   *
   * Zwei Zahlen für eine Drehung, und sie sind nicht dasselbe: `turn` ist die
   * Richtung in der **Welt** (dorthin schiebt ein Band, so steht das Möbel
   * nachher da), `hold` die Richtung **vor dem Bauch** (0 heißt: Vorderseite
   * von der Figur weg). Beim Tragen gilt `turn = Blickviertel + hold`
   * (`facePiece`), und das Möbel in den Händen dreht sich mit der Figur mit,
   * wie die Pfanne (`aimHeld`).
   *
   * Der Auslöser dreht **hier** weiter und nicht an `turn` (`turnPiece`): Eine
   * Weltdrehung wäre im nächsten Bild von der Blickrichtung wieder
   * überschrieben; ein Versatz zur Figur bleibt, auch wenn sie sich umdreht.
   */
  hold: Turn;
  /**
   * Die Grundfläche in Kacheln, **schon gedreht** (`kitchenPlan.footprint`) —
   * und mit jeder Vierteldrehung neu gerechnet, denn eine Ausgabetheke liegt
   * quer anders als längs.
   */
  size: { w: number; d: number };
  readonly model: THREE.Object3D;
  /** Der unsichtbare Kasten darüber und sein Körper — beide können fehlen. */
  box: THREE.Mesh | null;
  body: PhysicsBody | null;
  /** Die Station darauf, wenn es eine ist. */
  station: Station | null;
  /**
   * **Das Bild der Zutat auf dem Deckel**, wenn es eines trägt
   * (`kitchenIcon.counterSign`) — oder `null`.
   *
   * Es hängt am Möbel und wird trotzdem hier gemerkt, weil es als Einziges
   * daran die Drehung des Möbels **nicht** mitmachen darf: Ein Brötchen, das
   * quer liegt, weil die Ausgabe quer steht, ist von oben kein Brötchen mehr
   * (`aimIcon`).
   */
  icon: THREE.Object3D | null;
  /** Ob es gerade getragen wird — dann belegt es keine Kachel. */
  held: boolean;
  /**
   * **Der Träger für das, was beim Umstellen mitfährt** — die Pfanne auf dem
   * Herd, der Teller auf der Ausgabe, der Stapel auf dem Abtropfbrett.
   *
   * Er hängt am Möbel und hebt dabei dessen halben Maßstab wieder auf
   * (`core/kitchenFit.kitchenPieceScale`) — dieselbe Gruppe wie beim Schild
   * auf dem Deckel (`addIcon`) und beim Wasser im Becken (`addWater`), und aus
   * demselben Grund: Was hier hineinkommt, ist in Metern der Welt gebaut und
   * darf nicht auf die Hälfte schrumpfen, nur weil das Möbel aus einer doppelt
   * so großen Quelle stammt.
   *
   * Er entsteht erst, wenn zum ersten Mal etwas mitfährt: Fünfzehn leere
   * Gruppen in jeder Küche wären fünfzehn Knoten, die nie ein Kind bekommen.
   */
  cargo: THREE.Object3D | null;
  /**
   * **Was von diesem Möbel gerade als benutzbar angemeldet ist** — und das ist
   * nicht immer das Möbel.
   *
   * Der gelbe Saum umfasst genau das Objekt, das hier steht
   * (`core/highlight.ts`), und er ist die Antwort auf die Frage „was passiert,
   * wenn ich jetzt drücke?". Liegt ein Teller auf dem Tisch, ist die Antwort
   * **der Teller** und nicht der Tisch: Man nimmt ihn auf, der Tisch bleibt
   * stehen. Ein leuchtender Tisch wäre an dieser Stelle die falsche Auskunft —
   * er sagt „dieses Möbel", und gemeint ist, was darauf liegt.
   *
   * Deshalb steht hier ein **Objekt** und kein `boolean`: Die Anmeldung
   * wandert zwischen Möbel und Inhalt hin und her, und wer nur merkt, *ob*
   * etwas angemeldet ist, meldet beim Wechsel das Falsche ab.
   *
   * Der Merker sitzt am **Möbel** und nicht an seiner Station, und auch das
   * ist kein Zufall: Im Baumodus meint `A` das Möbel selbst, und ein Möbel
   * ohne Station will sich dann genauso anmelden.
   */
  usable: THREE.Object3D | null;
}

/**
 * **Ein Ding in der Hand oder auf einer Fläche.**
 *
 * Es hat **zwei** Quellen für sein Netz, und das ist die Stelle, an der man
 * sich beim Bauen verheddert:
 *
 * - Zutaten, Brötchen und Teller **baut** der Zutatensatz (`FoodKit.view`),
 *   und zwar jedes Mal neu, wenn sich das Gericht ändert. Ein geschnittener
 *   Salat ist ein anderes Netz als ein Salatkopf.
 * - Topf, Pfanne und Feuerlöscher kommen aus dem **Möbelmodell**
 *   (`core/kitchenModel.takeUtensil`) und **müssen wiederverwendet werden**:
 *   Es gibt genau eine Pfanne in dieser Küche. Für sie gibt `FoodKit.view`
 *   `null` zurück, und der Belag kommt als eigenes Netz daneben
 *   (`FoodKit.topping`).
 *
 * Deshalb steht hier `loose` neben `object`: `object` ist, was in der Szene
 * hängt — bei einem Gerät ein **Träger**, in dem das geladene Netz und sein
 * Belag nebeneinander sitzen (siehe `addStation`, dort steht, warum nicht
 * ineinander) —, und `loose` das geladene Netz selbst, wenn es eines gibt.
 * Zusammengebaut wird beides an **einer** Stelle (`restyle`); eine zweite
 * hätte beim nächsten Handgriff eine Pfanne verdoppelt.
 */
interface Carried {
  /**
   * **Was es ist — und das ändert sich.** Ein rohes Patty wird in der Pfanne
   * zum gebratenen, ein Salatkopf auf dem Brett zum geschnittenen, ein
   * Brötchen mit dem Patty zum Burger. Dasselbe getragene Ding, nur mit einem
   * anderen `Dish` und einem anderen Netz.
   */
  dish: Dish;
  /** Was in der Szene hängt — der Träger des Geräts oder das gebaute Gericht. */
  object: THREE.Object3D;
  /** Das geladene Netz, wenn es eines ist; sonst `null`. */
  readonly loose: THREE.Object3D | null;
  /** Der Belag, der gerade neben dem geladenen Netz im Träger hängt. */
  topping: THREE.Object3D | null;
  /** Wohin `B` es zurückstellt — der Herd, von dem es kommt. */
  readonly home: Station | null;
  /**
   * **An welchem Griff es gerade gehalten wird** (`core/grabHandles.ts`) — in
   * der Brille, und nur dort.
   *
   * Gewählt wird er beim Zugreifen, an der Hand, die zugreift: Wer den Teller
   * vorn anfasst, hält ihn vorn. Danach bleibt er stehen, bis das Ding wieder
   * abgestellt und neu genommen wird — ein Griff, der in der Hand wechselt,
   * wäre ein Teller, der sich beim Umsehen dreht.
   *
   * `null` heißt: an der Hitbox, also wie es dasteht — jede Zutat, und alles,
   * was von oben getragen wird.
   */
  handle: GrabHandle | null;
}

/**
 * **Die Möbel selbst** — geladen, gesetzt, mit Körper, und zum Anfassen.
 *
 * Sie kommen asynchron und womöglich gar nicht (kein Netz, kein WebGL, keine
 * Datei). Dann bleibt die Küche ein leerer Raum mit drei Wänden, und das ist
 * kein Fehlerfall: Der Grundriss stimmt trotzdem, die Wege stimmen trotzdem,
 * und niemand steht vor einer Welt, die nicht lädt.
 *
 * **Angefasst wird mit `A`** (`core/usable.ts`), und die Regel dahinter steht
 * in `kitchenCarry.ts` — ein paar Dutzend Fälle, die ein Test nachrechnet,
 * statt dass man sie im Headset durchspielt. Diese Klasse ist der Teil, den
 * ein Test nicht lesen kann: Netze umhängen, Körper bauen, Schilder schreiben.
 */
export class KitchenZone implements TestZone {
  private world: ZoneHost | null = null;
  /**
   * Das Gestell des Spielers — Träger für alles, was er in der Hand hält, und
   * seit der Küchen-Augenhöhe auch das Ding, dessen `eyeScale` diese Zone
   * setzt (`fitEyes`). Deshalb steht hier `PlayerRig` und nicht `Object3D`:
   * Ein Rig, das beim Verlassen der Welt noch gestaucht wäre, nähme die
   * Küche in die nächste mit.
   */
  private rig: PlayerRig | null = null;
  /**
   * **Der Maßstab, auf den die Küche die Augenhöhe bringt** — einmal gerechnet
   * und nicht sechzigmal in der Sekunde.
   *
   * `posture.kitchenEyeScale` liest den `localStorage` und parst JSON; je Bild
   * wäre das ein Dateizugriff für eine Zahl, die sich nur ändert, wenn jemand
   * im Menü daran dreht. Genau dafür gibt es den Melder (`onPostureChange`),
   * und genau so machen es Menü und Eingaberaum auch.
   */
  private eyeScale = 1;
  /** Den Melder wieder abbestellen — sonst hält er die Zone am Leben. */
  private offEyes: (() => void) | null = null;
  /**
   * Die Figur des Spielers — sie hält die Hände unter das Getragene
   * (`PlayerAvatar.carry`).
   *
   * Gemerkt und nicht je Bild aus dem Kontext geholt, weil sie auch dann
   * losgelassen werden muss, wenn es keinen Kontext mehr gibt: Wer die Welt
   * mit einem Teller in der Hand verlässt, behielte sonst für immer beide
   * Hände vor dem Bauch.
   */
  private avatar: PlayerAvatar | null = null;
  /** Ob die Zone schon wieder abgeräumt wurde, als die Datei ankam. */
  private gone = false;
  private readonly placed: THREE.Object3D[] = [];
  private readonly bodies: PhysicsBody[] = [];
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  /** Ein Material für alle Trefferkästen — unsichtbar ist unsichtbar. */
  private hidden: THREE.MeshBasicMaterial | null = null;
  /** Und eines für das Wasser in jedem Spülbecken (`addWater`). */
  private pond: THREE.MeshStandardMaterial | null = null;
  private readonly labels: TextPlane[] = [];
  private readonly stations: Station[] = [];
  /** Jedes aufgestellte Möbel der Küche — der Schauraum steht nicht darin. */
  private readonly furniture: Furnish[] = [];
  /** Zutaten und Teller — ein Satz für die ganze Zone. */
  private readonly food = new FoodKit();
  /** Balken, Warndreieck und Flammen — ebenfalls einer für die ganze Zone. */
  private gauges: KitchenGauges | null = null;
  /** Der Ofen für die Bilder an den Ausgaben (`kitchenIcon.ts`). */
  private oven: IconOven | null = null;
  /** Der Bausatz für die Förderbänder (`kitchenBelt.ts`). */
  private belts: BeltKit | null = null;
  /** Der Nebel aus dem Feuerlöscher (`kitchenSpray.ts`). */
  private jet: SprayJet | null = null;
  /** Der karierte Belag über dem Estrich der Zone (`kitchenFloor.ts`). */
  private floor: KitchenFloor | null = null;
  /** Was die Figur gerade trägt. */
  private carried: Carried | null = null;
  /**
   * **Welche Hand es trägt** — nur in der Brille (`core/usable.UseSource.hand`).
   *
   * Von oben und am Schreibtisch gibt es keine: Dort hängt das Getragene vor
   * dem Bauch, wie es das immer getan hat. In der Brille hängt es an **der**
   * Hand, die zugegriffen hat, und dreht sich mit ihr — die Pfanne wie ein
   * Werkzeug, am Stiel.
   */
  private carriedHand: Handedness | null = null;
  /**
   * **Die sichtbaren Griffkreuze** (`core/handleView.ts`) — nur, wenn das
   * Häkchen im Grafik-Menü sitzt, und ab Werk sitzt es nicht.
   */
  private readonly handleView = new HandleView();
  /** Die Tafel an der Ausgabetheke und wie lange sie noch steht. */
  private ticket: TextPlane | null = null;
  private ticketLeft = 0;

  // --- der Feuerlöscher ------------------------------------------------------
  /** Ob er gerade pustet, und ob die Auslöser im vorigen Bild schon lagen. */
  private spraying = false;
  private triggerWas = false;
  private useWas = false;

  // --- der Baumodus ----------------------------------------------------------
  /** Ob der Auslöser im letzten Bild lag — die Flanke, die dreht (`buildTurn`). */
  private turnWas = false;
  /** Ob gerade umgebaut wird (`kitchenBuild.ts`). */
  private editing = false;
  /** Der rote Knopf, der ihn umlegt (`addBuildButton`). */
  private buildButton: RedButton | null = null;
  /** Der Aushang an der Nordwand (`kitchenNotice.ts`) — eine Tafel, die hängt. */
  private notice: SignBoard | null = null;
  /**
   * **Was die Bänder in diesem Bild gerechnet haben** (`runBelts`).
   *
   * Gemerkt wird es für genau eine Frage: ob auf eine Kachel gerade etwas
   * zufährt (`kitchenBelt.beltBound`). Eine solche Kachel ist leer und trotzdem
   * vergeben, und das sieht man ihr nicht an.
   */
  private beltNow: BeltFrame | null = null;
  /** Das Möbel in der Hand — im Baumodus trägt man Möbel statt Essen. */
  private lifted: Furnish | null = null;
  /** Der Umriss des Bauplatzes: wo er steht und ob dort Platz ist. */
  private ghost: THREE.Mesh | null = null;
  private ghostFree = false;
  private ghostAt: BuildSpot | null = null;
  /**
   * Ob der Umriss gerade angemeldet ist.
   *
   * Er wandert je Bild mit, seine **Anmeldung** darf das nicht:
   * `PortalWorld.addUsable` hängt nur an und sieht nicht nach, ob dasselbe
   * Ding schon darin steht — ein `addUsable` je Bild wäre eine Liste, die mit
   * sechzig Einträgen in der Sekunde wächst, und jeder davon ein Kandidat für
   * dieselbe Taste.
   */
  private ghostLive = false;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.rig = ctx.rig;
    this.avatar = ctx.avatar;
    this.gone = false;
    // Die Augenhöhe der Küche jetzt holen und danach nur noch, wenn jemand
    // sie verstellt (`fitEyes`). Erst abbestellen, dann anmelden: Ein zweites
    // `build` ohne `dispose` dazwischen hinterließe sonst einen Melder, den
    // niemand mehr los wird.
    this.offEyes?.();
    this.eyeScale = kitchenEyeScale();
    this.offEyes = onPostureChange(() => {
      this.eyeScale = kitchenEyeScale();
    });
    this.gauges = new KitchenGauges(world.root);
    this.belts = new BeltKit();
    this.jet = new SprayJet(world.root);
    // **Zuerst der Boden**, denn auf ihm steht alles andere: Der Grundriss legt
    // den Estrich (`stampKitchen`), die Zone die Fliesen darauf
    // (`kitchenFloor.ts`). Er hängt an der Welt und nicht an einem Möbel — im
    // Baumodus wird die Küche umgestellt, nicht der Boden aufgenommen.
    this.floor = new KitchenFloor(world.root);
    // Der Ofen braucht den Renderer und gibt ohne WebGL und in der Brille
    // `null` zurück (`IconOven.bake`) — dann eben kein Schild an der Ausgabe.
    this.oven = new IconOven(ctx.renderer);

    // **Was gebaut wird, steht sofort.** Es hängt an keiner Datei, also wartet
    // es auch nicht auf eine: Die Förderbänder stehen, bevor der Lader
    // überhaupt gefragt hat — und sie stehen auch dann, wenn er nichts findet.
    for (const spot of KITCHEN_SPOTS) {
      const piece = kitchenPiece(spot.name);
      if (!piece?.built) continue;
      const model = this.buildPiece(piece);
      if (model) this.place(model, piece, spot, () => null);
    }
    this.addBuildButton();
    // Der Aushang an der Nordwand: dieselbe Wand, an der die Zeile steht, und
    // die einzige, deren Innenseite die Kamera von oben ansieht.
    this.notice = buildKitchenNotice(world.root);

    // Dieselbe Frage wie bei der Figur, und aus demselben Grund: `GLTFLoader`
    // und `import.meta` bringen einen Jest-Lauf zum Stehen, also wird das
    // Modul dort gar nicht erst angefasst (`core/chefFit.canLoadModels`).
    if (!canLoadModels()) return;
    void import('../../../core/kitchenModel').then(async (module) => {
      for (const spot of KITCHEN_SPOTS) {
        if (this.gone) return;
        const piece = kitchenPiece(spot.name);
        if (!piece || piece.built) continue;
        const model = await module.kitchenModel(spot.name);
        if (!model || this.gone) continue;
        this.place(model, piece, spot, module.takeUtensil);
      }
      if (!this.gone) this.refreshStations();
    });
    this.refreshStations();
  }

  /**
   * **Jedes Bild**: Die Pfanne brät, das Brett schneidet, der Gast isst, das
   * Band schiebt, der Löscher pustet — und was getragen wird, hängt vor dem
   * Bauch.
   *
   * In dieser Reihenfolge, und die ist keine Geschmacksfrage: Erst laufen die
   * Uhren, dann werden die Anzeigen danach gesetzt. Wer die Anzeigen vorher
   * setzte, zeigte immer das Bild von gestern — ein Balken hinge ein Bild lang
   * noch da, nachdem das Feuer schon brennt.
   */
  update(dt: number, ctx: WorldContext): void {
    this.aim(ctx);
    this.fitEyes(ctx);
    this.runBelts(dt);
    this.cook(dt);
    this.spray(dt, ctx);
    this.buildTurn(ctx);
    this.facePiece();
    // Die Pfeile auf den Bändern wandern, auch wenn nichts daraufliegt: Ein
    // Band, das erst bei Fracht zeigt, wohin es schiebt, sagt es zu spät.
    this.belts?.update(dt);
    // Der Knopf kommt nach dem Druck wieder hoch — von allein tut er es nicht.
    this.buildButton?.update(dt);
    this.gauges?.update(dt);
    this.fadeTicket(dt);
    this.carryInHands(ctx);
    this.showGhost();
  }

  /**
   * **Wo die Figur steht und wohin sie zielt** — einmal je Bild, für alle, die
   * es brauchen: die Arbeit an einer Station, der Strahl des Löschers, der
   * Bauplatz vor den Füßen.
   *
   * Die Richtung ist dieselbe, mit der `A` etwas erwischt (`core/usable.ts`):
   * von oben die Figur (dort dreht die Steuerung sie zum Ziel, der rechte
   * Stock **ist** das Zielen), aus den Augen und in der Brille der Kopf. Wer
   * hier eine eigene Rechnung aufmachte, zielte mit dem Löscher woandershin
   * als mit der Hand.
   */
  private aim(ctx: WorldContext): void {
    ctx.rig.updateMatrixWorld(true);
    // **Unter dem Kopf und nicht unter dem Ursprung.** In der Brille ist
    // `rig.position` die Mitte des Spielraums und nicht der Spieler: Wer einen
    // Meter daneben steht, arbeitete an der Station einen Meter weiter, zielte
    // mit dem Löscher daneben — und die Küche entschied an einem Punkt, der
    // sich beim Beugen gar nicht mitbewegt, ob sie ihn stauchen soll
    // (`fitEyes`). Dieselbe Rechnung wie in `PlayerRig.placeFeetAt`, und am
    // Bildschirm ändert sie nichts: dort sitzt die Kamera über dem Ursprung.
    ctx.rig.getHeadPosition(_feet);
    _feet.setY(ctx.rig.getFloorY());
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_spin));
    ctx.rig.getHeadForward(_headAhead);
    const wanted = ctx.topDown ? _rigAhead : _headAhead;
    const flat = Math.hypot(wanted.x, wanted.z);
    if (flat > 1e-4) _aim.set(wanted.x / flat, 0, wanted.z / flat);
    else _aim.copy(_rigAhead).setY(0);
  }

  /**
   * **Wie groß der Spieler in dieser Küche ist** — und nur in ihr, und nur in
   * der Brille.
   *
   * Die Küche ist **mit Absicht zu klein**: Die Möbel sind halbiert
   * (`core/kitchenFit.KITCHEN_SCALE`), die Arbeitsplatten liegen auf einem
   * halben Meter, und die Kochfigur, die dazwischen steht, ist 1,60 m hoch mit
   * Augen auf 0,91 m (`core/chefFit.ts`). Wer dort mit seiner echten
   * Augenhöhe von 1,65 m steht, schaut steil auf eine Puppenstube herab — die
   * Zahlen stimmen alle, der Blick stimmt nicht. Also wird in der Küche der
   * **Spieler** kleiner und nicht die Küche größer: `PlayerRig.eyeScale`
   * staucht ihn auf die eingestellte Augenhöhe (`posture.kitchenEyeScale`,
   * voreingestellt 150 cm), die Füße bleiben auf dem Boden, und das Bücken
   * bleibt ein Bücken.
   *
   * **Drei Bedingungen, und alle drei stehen in einer Zeile:**
   *
   * - **In der Brille** (`xr.isPresenting`). Am Bildschirm setzt das Spiel die
   *   Kamera selbst; dort gibt es keine echte Augenhöhe, die danebenliegen
   *   könnte.
   * - **Nicht von oben** (`ctx.topDown`). Die Ansicht von oben hängt an keiner
   *   Kopfhöhe, und eine gestauchte Figur wäre dort ein Rätsel.
   * - **In der Küche** (`kitchenPlan.inKitchen`) — das Rechteck aus
   *   `layout.KITCHEN` und nichts sonst. Gokart, Schießstand, Kletterwand und
   *   jede andere Welt sehen nie etwas anderes als 1.
   *
   * Zurückgesetzt wird jedes Bild, in dem eine davon nicht gilt: Ein Feld, das
   * nur gesetzt und nie gelöscht wird, ist ein Spieler, der nach dem
   * Verlassen der Küche einen Viertelmeter zu klein bleibt.
   */
  private fitEyes(ctx: WorldContext): void {
    const inside = ctx.renderer.xr.isPresenting && !ctx.topDown && inKitchen(_feet.x, _feet.z);
    ctx.rig.eyeScale = inside ? this.eyeScale : 1;
  }

  /**
   * **Was von selbst passiert** — Herd, Brett, Spüle, Gästetisch, Band.
   *
   * Jede Uhr rechnet nebenan und gibt einen neuen Zustand zurück, dazu das,
   * was in diesem Bild fertig geworden ist. Die Zone tut damit genau zwei
   * Dinge: das Netz tauschen und es sagen.
   */
  private cook(dt: number): void {
    if (!this.stations.length) return;
    for (const spot of this.stations) {
      // **Ein Möbel in den Händen arbeitet nicht** — dieselbe Zeile wie beim
      // Band nebenan (`runBelts`) und aus einem stärkeren Grund: Der Herd
      // brennt nach einer Weile (`kitchenClock`), und ein Feuer, das vor dem
      // Bauch ausbricht, während beide Hände voll Herd sind, ließe sich mit
      // nichts mehr löschen. Die Uhr **hält an** und fällt nicht auf null: Was
      // darauf liegt, behält seine Stufe, und beim Absetzen läuft die Zeit
      // genau dort weiter, wo sie stand (`liftPiece`, `dropPiece`).
      if (spot.home.held) continue;
      switch (spot.kind) {
        case 'stove':
          this.stoveFrame(spot, dt);
          break;
        case 'board':
        case 'sink':
          this.workFrame(spot, dt);
          break;
        case 'table':
          this.tableFrame(spot, dt);
          break;
        case 'belt':
          // Das Band rechnet **einmal für alle** (`runBelts`) und nicht je
          // Kachel; hier bleibt nur die Anzeige übrig.
          break;
        default:
          continue;
      }
      this.showGauges(spot);
    }
  }

  /**
   * **Ein Bild am Herd** — und das Patty in der Pfanne wechselt seine Stufe.
   *
   * Es wechselt sie **in der Pfanne** und nicht auf dem Herd: Was hier liegt,
   * ist das `Dish` der Pfanne, und das Patty ist ihr Inhalt. Die Uhr weiß von
   * der Pfanne nichts — sie kennt nur die Stufe —, und deshalb ist dies die
   * einzige Stelle, an der beides zusammenkommt.
   */
  private stoveFrame(spot: Station, dt: number): void {
    const tick = advanceStove(spot.stove, dt);
    spot.stove = tick.state;
    if (tick.turned) {
      const pan = spot.on;
      // Genau ein Patty in der Pfanne (`kitchenRecipes.TAKES`), also ersetzt
      // die neue Stufe den ganzen Inhalt.
      if (pan) this.restyle(pan, dish(pan.dish.item, [tick.turned]));
      this.world?.notify(`${ITEM_LABELS[tick.turned]} in der Pfanne`);
      this.refreshStations();
    }
    if (tick.lit) {
      this.world?.notify('Der Herd brennt — Feuerlöscher holen!');
      this.refreshStations();
    }
  }

  /**
   * **Ein Bild am Brett oder in der Spüle** — gearbeitet wird nur, solange
   * jemand davorsteht.
   *
   * Dieselbe Uhr für beides (`kitchenWork.ts`), und das ist der Punkt: Spülen
   * ist Schneiden mit einem anderen Ergebnis. Was hier steht, ist nur, **wer**
   * davorsteht — siehe `WORK_REACH`.
   *
   * **Und wer weggeht, hat abgebrochen.** Die Uhr fällt auf null zurück; ein
   * neues Armieren gibt es nur durch erneutes Ablegen (`settle`). Das ist die
   * Entscheidung, die den Unterschied macht zwischen „ich stelle es hin und
   * gehe" und „ich stehe daneben und arbeite".
   *
   * **Der fertige Teller kommt in die Hand** (`kitchenWork.WORK_TO_HAND`), und
   * das ist der einzige Ort, an dem die Zone den Unterschied zwischen Brett
   * und Becken überhaupt sieht — sie sieht ihn als `tick.toHand` und fragt
   * nirgends nach `spot.kind`. Der Griff selbst ist derselbe wie der von Hand
   * (`pickUp` und `takeInHand`, wie bei `do: 'take'`), nur macht ihn niemand.
   */
  private workFrame(spot: Station, dt: number): void {
    const near = Math.hypot(_feet.x - spot.deck.x, _feet.z - spot.deck.z) <= WORK_REACH;
    // **Im Umbau sind die Hände voll**, auch wenn nichts darin liegt: Wer
    // Möbel trägt, bekommt keinen sauberen Teller in die Hand gedrückt
    // (`kitchenWork.WORK_TO_HAND`). Ohne diese Zeile stünde man mitten im
    // Umbau plötzlich mit einem Teller da, und das getragene Möbel und der
    // Teller stritten sich um dieselbe Stelle vor dem Bauch
    // (`carryInHands`) — der einzige Weg, wie in dieser Küche beides zugleich
    // in die Hände käme.
    const tick = advanceWork(spot.work, dt, near, !this.carried && !this.editing);
    if (tick.state === spot.work) return;
    spot.work = tick.state;
    if (!tick.done) return;
    const on = spot.on;
    // Was gearbeitet wird, trägt nichts (`kitchenRecipes.CHOPS`) — aus dem
    // Salatkopf wird geschnittener Salat, aus dem dreckigen Teller ein sauberer.
    if (on) this.restyle(on, dish(tick.done));
    const label = ITEM_LABELS[tick.done];
    if (tick.toHand && on) {
      // `pickUp` räumt die Station und stellt ihre Uhren neu (`settle`) —
      // dasselbe, was `tick.state` schon sagt, und deshalb keine zweite
      // Rechnung, sondern dieselbe.
      const thing = this.pickUp(spot, on.dish);
      if (thing) this.takeInHand(thing);
      this.world?.notify(`${label} in der Hand`);
    } else if (workWaits(tick)) {
      // **Volle Hand**: Der Teller ist sauber und bleibt im Wasser stehen.
      // Gesagt werden muss es, sonst steht man mit der Pfanne davor und hält
      // die Uhr für hängengeblieben.
      this.world?.notify(`${label} fertig — die Hand ist voll`);
    } else {
      this.world?.notify(`${label} fertig`);
    }
    this.refreshStations();
  }

  /**
   * **Ein Bild am Gästetisch** — und irgendwann steht dort Geschirr.
   *
   * Der Gast selbst ist keine Figur: Er ist eine Uhr und ein Teller, der
   * danach dasteht (`kitchenGuests.ts`). Ein NPC, der sich hinsetzt, wäre ein
   * zweiter Weg durch dieselbe Küche — und der erste, den ein Spieler
   * umrennt.
   */
  private tableFrame(spot: Station, dt: number): void {
    const tick = advanceTable(spot.table, dt);
    if (tick.state === spot.table) return;
    spot.table = tick.state;
    if (!tick.finished) return;
    // Aufgegessen: Das Geschirr bleibt stehen, bis es jemand holt.
    const plate = this.make(dish('plate-dirty'));
    if (plate) this.layOn(spot, plate);
    this.world?.notify('Ein Gast ist fertig — dreckiges Geschirr am Tisch');
    this.refreshStations();
  }

  /**
   * **Wohin ein Band abliefert** — die Station auf der nächsten Kachel in
   * Laufrichtung (`kitchenBelt.beltStep`), oder `null`.
   *
   * `null` heißt für die Rechnung nebenan: Hier fährt nichts los. Das ist
   * derselbe Fall für dreierlei, und das ist Absicht — ein Band am Rand der
   * Küche, eines, das auf die Ausgabetheke zeigt, und eines, das mit dem
   * Kochtopf darauf auf einen Mülleimer zeigt.
   *
   * **Hier steht nur das Nachschlagen**, die Regel steht nebenan
   * (`kitchenBelt.beltDelivers`, mit Test über alle zwölf Stationsarten):
   * Welche Kachel der Nachbar ist, weiß nur die Zone; ob dorthin abgeliefert
   * werden darf, ist eine Frage über Zahlen und Arten und gehört dorthin, wo
   * ein Test sie ohne WebGL stellen kann.
   *
   * **Der Mülleimer ist der eine Nachbar, bei dem die Art allein nicht
   * reicht.** Er nimmt Essen und sonst nichts (`kitchenCarry.intoBin`), und
   * was auf dem Band liegt, weiß wieder nur die Zone. Gefragt wird deshalb
   * dieselbe Regel, die auch `A` beantwortet, und zwar **vor** der Fahrt: Ein
   * Kochtopf, der erst zwei Sekunden zum Eimer führe und dort abgewiesen
   * würde, führe alle zwei Sekunden wieder los. So bleibt er einfach liegen —
   * derselbe Fall wie ein Band, vor dem gar nichts steht.
   */
  private beltTarget(spot: Station): Station | null {
    const step = beltStep(spot.home.turn);
    const next = this.stationAt(spot.home.x + step.dx, spot.home.z + step.dz);
    if (!next || !beltDelivers(next.kind)) return null;
    if (next.kind !== 'bin') return next;
    const load = spot.on?.dish;
    return load && beltTrashes(kitchenDeed(load, facts(next))) ? next : null;
  }

  /**
   * **Woher ein Zugband sich etwas holt** — die Station auf der Kachel
   * **hinter** ihm (`kitchenBelt.beltReach`), oder `null`.
   *
   * Dieselbe Arbeitsteilung wie eine Zeile höher: Die Kachel schlägt die Zone
   * nach, was von dort mitgenommen werden darf, entscheidet
   * `kitchenBelt.beltReleases` — Herd und Löscherhalterung nicht (das ist
   * Gerät), die Theke nicht (was man nicht hinschieben darf, zieht man nicht
   * heraus), der **Mülleimer** erst recht nicht (dort darf ein Band seit
   * Neuestem hinein, aber niemals heraus), und was gerade unter dem Messer
   * liegt, bleibt liegen.
   */
  private beltSource(spot: Station): Station | null {
    const step = beltReach(spot.home.turn);
    const back = this.stationAt(spot.home.x + step.dx, spot.home.z + step.dz);
    return back && beltReleases(back.kind, back.work.working) ? back : null;
  }

  /**
   * **Ein Bild auf allen Bändern** — einmal je Bild, für die ganze Küche
   * (`kitchenBelt.advanceBelts`).
   *
   * **Warum nicht je Kachel.** Ein Band hängt am Band davor, und das am davor:
   * Ob hier etwas losfahren darf, ist eine Frage über die **Nachbarn**, und wer
   * sie Kachel für Kachel stellt, beantwortet sie je nach Reihenfolge anders —
   * von vorn gerechnet fährt ein volles Band in einem Bild los, von hinten
   * gerechnet braucht es so viele Bilder, wie es Kacheln hat. Die Rechnung
   * bekommt deshalb **alle** Kacheln auf einmal; was dabei herauskommt, steht
   * dort und nicht hier.
   *
   * **Jede Station wird gemeldet, nicht nur die Bänder.** Die Frage „ist
   * vorn Platz?" gilt genauso für die Ablage am Ende der Reihe wie für das
   * nächste Band — und eine Ablage ist in dieser Rechnung nichts anderes als
   * eine Kachel ohne Ziel (`BeltTile.to === null`).
   *
   * **Die Übergaben kommen in anwendbarer Reihenfolge**, von vorn nach hinten:
   * Wer sie der Reihe nach abarbeitet, legt nie etwas auf eine Kachel, von der
   * der Vordermann noch nicht weggezogen ist.
   */
  private runBelts(dt: number): void {
    if (!this.stations.length) return;
    let belts = false;
    const tiles: BeltTile[] = [];
    for (const spot of this.stations) {
      // **Was getragen wird, steht nicht in der Küche.** Ein Möbel in den
      // Händen belegt keine Kachel (`stationAt` überspringt es schon), und als
      // Band dürfte es erst recht nichts tun: Ein Zugband, das man aufhebt,
      // zöge sonst weiter an der Kachel hinter seinem **alten** Platz und
      // legte sich das Geholte in die Luft, wo es eben noch stand. Seit die
      // Drehung eines getragenen Möbels der Blickrichtung folgt (`facePiece`),
      // wanderte diese Kachel obendrein beim Umsehen mit.
      if (spot.home.held) continue;
      // Welche Sorte Band das ist, steht am **Möbel** und nicht an der Station:
      // Für `A` sind beide dasselbe (`kitchenPlan.STATION_KINDS`), und eine
      // zwölfte Stationsart hätte in `kitchenDeed` Zeile für Zeile dasselbe
      // getan wie `belt`.
      const kind = spot.kind === 'belt' ? beltKind(spot.home.piece.name) : null;
      if (kind) belts = true;
      const to = kind ? this.beltTarget(spot) : null;
      const from = kind === 'pull' ? this.beltSource(spot) : null;
      tiles.push({
        id: spot.key,
        loaded: spot.on !== null,
        state: spot.belt,
        to: to?.key ?? null,
        pull: from?.key ?? null,
      });
    }
    // Eine Küche **ohne Band** rechnet gar nichts — den Fall gibt es im
    // Schauraum und in jeder Küche, aus der jemand das letzte Band
    // herausgebaut hat. Gefragt wird nach dem Möbel und nicht nach seinem
    // Ziel: Ein Band, das gerade ins Leere zeigt, weil die Ablage davor im
    // Baumodus weggetragen wurde, muss durch die Rechnung — sonst bliebe ein
    // Ding, das eben noch unterwegs war, auf `moving` stehen und hinge
    // sichtbar in der Luft.
    if (!belts) {
      this.beltNow = null;
      return;
    }

    const frame = advanceBelts(tiles, dt);
    this.beltNow = frame;

    // **Erst die Übergaben, dann die Zustände**, und die Reihenfolge ist keine
    // Geschmacksfrage: `layOn` ruft `settle`, und das setzt das Band der
    // Zielkachel auf `BELT_EMPTY` zurück. Wer die Zustände vorher schriebe,
    // nähme einem Ding, das in **einem** Bild ankommt und gleich weiterfährt,
    // sein frisch gesetztes `moving` wieder weg — es stünde ein Bild lang
    // still, und das an jeder Kachel einer Reihe.
    for (const move of frame.moves) {
      const from = this.stationByKey(move.from);
      const to = this.stationByKey(move.to);
      const load = from?.on;
      if (!from || !to || !load) continue;
      // **Beim Mülleimer wird nicht abgelegt, sondern weggeworfen** — auf ihm
      // liegt nie etwas, und genau deshalb hat er auch keinen Stau.
      if (to.kind === 'bin') {
        this.dumpInBin(from, to, load);
        continue;
      }
      from.on = null;
      this.settle(from);
      this.layOn(to, load);
      this.refreshStations();
    }

    for (const spot of this.stations) {
      const next = frame.states.get(spot.key);
      if (next) spot.belt = next;
    }

    // **Der Zustand springt, das Bild nicht.** Logisch liegt das Ding die
    // ganze Fahrt über auf seiner Ausgangskachel (siehe `advanceBelts`);
    // gezeichnet wird es dazwischen. Gesetzt wird das **nach** den Übergaben,
    // denn `layOn` stellt ein angekommenes Ding auf seine neue Kachel — und
    // was gerade erst losgefahren ist, soll dort auch losfahren und nicht
    // einen Bildmoment am alten Platz stehen.
    for (const carry of frame.carry.values()) {
      const from = this.stationByKey(carry.from);
      const to = this.stationByKey(carry.to);
      if (!from?.on || !to) continue;
      from.on.object.position.lerpVectors(from.deck, to.deck, carry.t);
    }
  }

  /**
   * **Was ein Band in den Mülleimer fährt, ist weg** — und zwar auf demselben
   * Weg, auf dem es auch aus der Hand hineinginge.
   *
   * Das ist der ganze Sinn dieser Methode: Sie rechnet **nichts** selbst aus.
   * Was mit dem Angelieferten geschieht, entscheidet dieselbe Regel, die auch
   * `A` beantwortet (`kitchenCarry.kitchenDeed` an einer Station der Art
   * `bin`), und danach stehen hier dieselben zwei bis drei Zeilen wie in `act`
   * — Netz weg beziehungsweise umbauen, es sagen. Eine zweite Lösch-Mechanik
   * neben der ersten wäre die, die beim nächsten neuen Ding etwas anderes tut
   * als der Handgriff, den sie nachahmt: Von Hand ginge es in den Müll, vom
   * Band aus nicht, und niemand wüsste, welche der beiden recht hat.
   *
   * **Der Träger bleibt auf dem Band** (`scrape`, ein Teller mit einem halben
   * Burger darauf). Beim Spieler bleibt er in der Hand, und das ist derselbe
   * Gedanke: Abgeräumt wird, was **darauf** liegt. Auf dem Mülleimer kann er
   * nicht landen — dort liegt nie etwas (`kitchenPlan`) —, also kommt er
   * dorthin zurück, wo er herkam. Sichtbar springt er dabei die eine Kachel
   * zurück, die er unterwegs war; das nächste Bild fragt dann erneut, und
   * jetzt lautet die Antwort für den leeren Teller `refuse`, also bleibt er
   * liegen, statt hin und her zu fahren (`beltTarget`).
   *
   * **Und wenn kurz hintereinander mehrere ankommen**, ist das kein eigener
   * Fall: Ein Mülleimer wird nie belegt, also läuft die Rechnung nebenan
   * gegen keine volle Kachel und staut nichts auf (`kitchenBelt.advanceBelts`
   * liest `loaded` je Bild neu). Es kommt an, was ankommt — jedes für sich,
   * jedes mit seiner eigenen Meldung.
   *
   * Einen **Ton** gibt der Mülleimer nicht, weder hier noch unter der Hand:
   * Diese Küche hat überhaupt keinen, und einen zu erfinden, der nur bei
   * Bandlieferungen klänge, wäre der Anfang zweier Mülleimer. Ein **Zähler**
   * für Weggeworfenes existiert ebenso wenig — gezählt wird in dieser Küche
   * nichts außer den Tellern auf den beiden Stapeln.
   */
  private dumpInBin(belt: Station, bin: Station, load: Carried): void {
    const deed = kitchenDeed(load.dish, facts(bin));
    if (deed.do === 'trash') {
      belt.on = null;
      this.settle(belt);
      this.discard(load);
      this.world?.notify(`${dishLabel(deed.dish)} weggeworfen`);
    } else if (deed.do === 'scrape') {
      this.restyle(load, deed.dish);
      // Zurück auf das Band: `layOn` setzt das Netz auf die Kachelmitte, von
      // der aus es losgefahren ist — unterwegs hat es die Fahrt dazwischen
      // gezeichnet (`carry`), und stehen bleiben darf es dort nicht.
      this.layOn(belt, load);
      this.world?.notify(`${ITEM_LABELS[deed.dish.item]} abgeräumt`);
    } else {
      // Hierher kommt nichts: `beltTarget` fragt dieselbe Regel, bevor es
      // losfährt. Bleibt trotzdem etwas übrig — eine dreizehnte Tat, ein
      // Grundriss, der sich im selben Bild ändert —, dann bleibt es liegen,
      // wo es liegt, statt spurlos zu verschwinden.
      return;
    }
    this.refreshStations();
  }

  /** Eine Station an ihrem Anzeigenschlüssel — den vergibt `addStation`. */
  private stationByKey(key: string): Station | null {
    return this.stations.find((spot) => spot.key === key) ?? null;
  }

  /**
   * **Der Feuerlöscher** — er pustet, und was im Strahl liegt, geht aus.
   *
   * Drei Ansichten, ein Verhalten, und die Regel dazu steht nebenan
   * (`kitchenSpray.sprayOn`): Von oben ist der Auslöser ein **Schalter** (die
   * linke Maustaste beziehungsweise der Trigger am Pad, den die Steuerung dort
   * ohnehin an die Figur reicht — `FlatControls.applyTopDownButtons`), am
   * Schirm aus den Augen und in der Brille wird **gehalten**. Gezielt wird
   * dabei mit derselben Richtung, in die auch `A` zeigt: von oben dreht der
   * rechte Stock die Figur, und damit den Strahl.
   *
   * Der `douse`-Griff am brennenden Herd bleibt daneben bestehen: Wer schon
   * davorsteht, soll nicht erst zielen müssen (`kitchenCarry.kitchenDeed`).
   */
  private spray(dt: number, ctx: WorldContext): void {
    const held = this.carried;
    const carrying = held?.dish.item === 'extinguisher';
    // In der Brille der echte Trigger der rechten Hand, sonst der
    // Benutzen-Knopf, **solange er liegt** (`PlayerRig.useHeld`) — am Schirm
    // ist das die einzige Taste, die in jeder Ansicht ein Halten kennt.
    const pulled = ctx.renderer.xr.isPresenting
      ? (ctx.input.get('right')?.trigger.pressed ?? false)
      : ctx.rig.useHeld;
    // **Von oben schalten zwei Knöpfe denselben Schalter**, und beide sind der
    // Knopf, den man dort ohnehin in der Hand hat: der **Auslöser** (linke
    // Maustaste, Trigger am Pad — `FlatControls.applyTopDownButtons` reicht
    // ihn als `PlayerRig.trigger` an die Figur) und der **Benutzen-Knopf**,
    // aber nur, solange er nichts anderes meint. `PlayerRig.useCandidate` sagt
    // genau das: Steht etwas in Reichweite, gehört `A` dem Ding davor, und ein
    // Löscher, der dabei mit angeht, wäre ein Knopf mit zwei Wirkungen. Steht
    // nichts da, ist `A` frei — und dann ist es der Knopf, den der Auftrag
    // meint („von oben Interaktionsknopf drücken").
    const trigger = ctx.rig.trigger > 0.5;
    const useFree = ctx.rig.useHeld && !ctx.rig.useCandidate;
    const pressed = (trigger && !this.triggerWas) || (useFree && !this.useWas);
    this.triggerWas = trigger;
    this.useWas = useFree;
    this.spraying = sprayOn(this.spraying, {
      pressed,
      held: pulled,
      carried: carrying,
      topDown: ctx.topDown,
    });

    if (carrying && held) {
      // Die Düse ist das Ende des Löschers in der Hand, nicht die Brust: Ein
      // Strahl, der aus dem Bauch käme, ginge bei jedem Blick nach unten in
      // den Boden.
      held.object.getWorldPosition(_nozzle);
    } else {
      _nozzle.copy(_feet).setY(_feet.y + CHEF_CARRY.y);
    }
    this.jet?.update(dt, this.spraying, _nozzle, _aim);

    for (const spot of this.stations) {
      if (spot.kind !== 'stove') continue;
      const hit = this.spraying && spot.stove.fire && inSpray(_nozzle, _aim, spot.deck);
      const tick = advanceDouse(spot.wet, dt, hit);
      spot.wet = tick.state;
      if (!tick.out) continue;
      this.putOut(spot);
    }
  }

  /** Das Feuer ist aus — die Pfanne bleibt, ihr Inhalt ist verkohlt und weg. */
  private putOut(spot: Station): void {
    spot.stove = douse(spot.stove);
    spot.wet = DRY;
    const pan = spot.on;
    if (pan) this.restyle(pan, dish(pan.dish.item));
    this.settle(spot);
    this.world?.notify('Feuer gelöscht');
    this.refreshStations();
  }

  /**
   * **Was über dieser Station in der Luft steht** (`kitchenGauge.ts`).
   *
   * Ein Schlüssel je Station, und darunter alles auf einmal: Balken, Dreieck,
   * Flammen. Gewechselt wird nur beim **Phasenwechsel** (`shown`) — ein
   * `clear` je Bild hinge die Anzeigen sechzigmal in der Sekunde ab und
   * wieder an, und der brennende Herd bekäme seinen Balken, den er gerade
   * nicht mehr hat, jedes Bild neu.
   *
   * **Die Anzeigen drehen sich nicht mehr hier**, sondern beim Zeichnen
   * (`ui/billboard.ts`): Jede Kamera, die sie malt, bekommt sie zugewandt —
   * von oben, aus den Augen, je Auge in der Brille, und bei jedem Spieler zu
   * ihm selbst.
   */
  private showGauges(spot: Station): void {
    const gauges = this.gauges;
    if (!gauges) return;
    const phase = this.phaseOf(spot);
    if (phase !== spot.shown) {
      gauges.clear(spot.key);
      spot.shown = phase;
    }
    if (phase === 'cold') return;
    if (phase === 'work' || phase === 'eat' || phase === 'douse') {
      const part =
        phase === 'work'
          ? workProgress(spot.work)
          : phase === 'eat'
            ? eatProgress(spot.table)
            : douseProgress(spot.wet);
      gauges.bar(spot.key, this.hover(spot, GAUGE_LIFT), part, phase === 'douse' ? 'burn' : 'chop');
      // Am gelöschten Herd lodert es weiter, solange es lodert — der Balken
      // sagt nur, wie lange noch.
      if (phase === 'douse') gauges.flame(spot.key, spot.deck, 'fire');
      return;
    }
    // Im Feuer gibt es nichts mehr zu messen: Der Balken ist weg (das `clear`
    // beim Phasenwechsel hat ihn abgehängt), es lodert nur noch.
    if (phase !== 'fire') {
      gauges.bar(
        spot.key,
        this.hover(spot, GAUGE_LIFT),
        stoveProgress(spot.stove),
        phase === 'frying' ? 'cook' : 'burn',
      );
    }
    gauges.warn(spot.key, phase === 'igniting' ? this.hover(spot, WARN_LIFT) : null);
    // Die Flamme steht mit dem **Fuß** auf der Platte und schwebt nicht
    // darüber (`KitchenGauges.flame`).
    gauges.flame(spot.key, spot.deck, phase === 'fire' ? 'fire' : 'cook');
  }

  /**
   * **Was diese Station gerade zu zeigen hat** — eine Phase, kein Sammelsurium.
   *
   * Der brennende Herd im Nebel ist der eine Fall, der zwei Anzeigen zugleich
   * meinen könnte; er bekommt `douse`, denn was einen dann interessiert, ist
   * nicht mehr, wie lange es schon brennt, sondern wie lange noch.
   */
  private phaseOf(spot: Station): StovePhase | 'work' | 'eat' | 'douse' {
    if (spot.kind === 'stove') {
      if (spot.stove.fire && spot.wet.time > 0) return 'douse';
      return stovePhase(spot.stove);
    }
    if (spot.kind === 'table') return eatProgress(spot.table) > 0 ? 'eat' : 'cold';
    return workProgress(spot.work) > 0 ? 'work' : 'cold';
  }

  /** Die Stelle über der Arbeitsplatte, an der eine Anzeige schwebt. */
  private hover(spot: Station, lift: number): THREE.Vector3 {
    return _at.set(spot.deck.x, spot.deck.y + lift, spot.deck.z);
  }

  /**
   * **Was getragen wird, hängt vor dem Bauch.**
   *
   * Es hängt am **Rig** und nicht an der Hand des Avatars, und das hat einen
   * einfachen Grund: Die Hand gibt es nur von oben und am Schreibtisch
   * (`worlds/portal/screenHand.ts`), in der Brille sind es zwei echte. Das
   * Rig gibt es immer.
   *
   * **Vor dem Körper und nicht in einer Faust** (`core/chefFit.CHEF_CARRY`):
   * Bei _Overcooked_ hält der Koch alles mit beiden Händen vor sich her, und
   * das ist keine Zierde — ein Teller, der neben der Schulter schwebt,
   * verdeckt von oben die halbe Figur, und man sieht nicht, wer gerade was
   * trägt. Die **Hände der Figur** gehen mit darunter (`PlayerAvatar.carry`),
   * und ihr **Kopf** wippt beim Gehen mit (`AvatarBody.headBob`).
   *
   * **Ein getragenes Möbel hängt genauso** (Baumodus): Es ist größer, aber
   * derselbe Griff, und eine zweite Trageweise dafür wäre eine zweite Stelle,
   * an der jemand die Brille vergisst.
   */
  private carryInHands(ctx: WorldContext): void {
    const thing = this.carried;
    const held = thing?.object ?? this.lifted?.model ?? null;
    if (!held) {
      ctx.avatar.carry = null;
      return;
    }
    this.aimHeld();
    if (ctx.renderer.xr.isPresenting) {
      // **In der Brille liegt es in der Hand**, an seinem Griff — die Pfanne
      // am Stiel, wie ein Werkzeug (`holdInHand`). Klappt das nicht (kein
      // Griff, keine Hand, Controller weg), hängt es wie eh und je eine
      // Handbreit vor der Brust, mittig und ruhig.
      if (thing && this.holdInHand(ctx, thing)) {
        ctx.avatar.carry = null;
        return;
      }
      this.backToBelly(thing);
      held.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
      ctx.avatar.carry = null;
      return;
    }
    this.backToBelly(thing);
    // **Im Raum des Rigs, und das genügt**: Von oben dreht sich das Rig selbst
    // in die Laufrichtung (`core/FlatControls.walkNorthUp`), und aus den Augen
    // dreht es die Maus (`FlatControls.look`). Wer hier zusätzlich um die
    // Blickrichtung der Figur drehte, drehte um null — dieselbe Rechnung wie
    // beim Werkzeug in der Bildschirmhand (`worlds/portal/screenHand.ts`).
    held.position.set(CHEF_CARRY.x, CHEF_CARRY.y + ctx.avatar.bob, CHEF_CARRY.z);
    ctx.avatar.carry = CARRY_POINT;
  }

  /**
   * **Ein getragenes Möbel liegt in den Händen und dreht sich mit** — wie die
   * Pfanne, wie der Teller, wie alles, was diese Figur trägt.
   *
   * Es hängt am Rig (`liftPiece`), und das Rig dreht sich mit der Figur; hier
   * steht deshalb **nur** noch der Versatz zur Figur (`Furnish.hold`, 0 heißt
   * „Vorderseite von mir weg"). Wer sich umdreht, dreht das Möbel mit — es
   * bleibt vor dem Bauch liegen, wie man es aufgenommen hat.
   *
   * **Hier wurde einmal der Gierwinkel des Rigs herausgerechnet**, damit ein
   * getragenes Möbel in **Weltrichtung** stehen blieb: Man stellte mit dem
   * Auslöser eine Himmelsrichtung ein und wollte sie beim Umdrehen zum
   * Bauplatz nicht verlieren. Seit die Drehung der **Blickrichtung** folgt
   * (`facePiece`), ist diese Rechnung genau verkehrt herum — sie hielt das
   * Möbel starr in der Welt, während die Figur sich darunter wegdrehte, und
   * das sah aus, als klebte es in der Luft statt in den Händen zu liegen.
   *
   * Was dabei verloren geht, ist eine Viertelung: Die Figur schaut stufenlos,
   * das Möbel steht nachher in Vierteln (`kitchenBuild.turnAhead`). In den
   * Händen liegt es deshalb genau vor dem Bauch, und **welches** Viertel
   * daraus wird, sagt der Umriss am Bauplatz und beim Band der Hinweis dazu.
   *
   * Nur für **Möbel**: Ein getragener Teller hat keine Richtung und hängt
   * ohnehin ungedreht am Rig (`carryInHands`).
   */
  /**
   * **Zurück vor den Bauch** — für alles, was gerade nicht in einer echten
   * Hand liegt.
   *
   * Es ist die Gegenbewegung zu `holdInHand` und wird gebraucht, sobald man
   * die Brille absetzt, in die Ansicht von oben wechselt oder ein Controller
   * wegfällt: Das Ding hängt dann am Controller, und dort bleibt es, wenn
   * niemand es zurückholt. Ein getragenes **Möbel** fasst das nicht an — es
   * hängt ohnehin am Rig und trägt seine eigene Drehung (`aimHeld`).
   */
  private backToBelly(thing: Carried | null): void {
    if (!thing) return;
    const object = thing.object;
    if (object.parent !== this.rig) this.rig?.add(object);
    object.quaternion.identity();
  }

  /**
   * **Wie die Pistole, nur eine Pfanne** — das getragene Ding hängt an der
   * Hand, die zugegriffen hat, und zwar an seinem Griff.
   *
   * Die Rechnung dazu ist **dieselbe wie bei jedem Werkzeug** und steht im
   * `core`: `grabHandles.holdFor` gibt die Lage im Griffraum, die den
   * gewählten Griff genau in die Faust legt (`gripFit.STANDARD_GRIP_IN_HAND`);
   * ein Ding ohne Griff sitzt unverdreht im Griffpunkt, „wie beim Companion
   * Cube". Gehängt wird an `ControllerState.hold` — den Knoten, an dem in
   * diesem Projekt alles hängt, was eine Hand hält, und der bei einer
   * getrackten Hand schon den Versatz zum Zeigestrahl trägt
   * (`core/handHold.ts`). Damit dreht sich die Pfanne mit dem Handgelenk, und
   * das ist genau das, worum es im Auftrag geht.
   *
   * **Und die Reichweite bleibt trotzdem die der Figur.** Das Ding liegt in
   * der Hand, aber wohin es darf, entscheidet weiter die Figur und ihre
   * Blickrichtung — die Stationen melden sich nur im Meter um sie herum an
   * (`kitchenGrab.KITCHEN_REACH`, `PortalWorld.useByHand`). Die Brille erlaubt
   * die feinere Wahl innerhalb dieser Reichweite und keinen Zentimeter mehr.
   *
   * @returns ob es geklappt hat; sonst gilt der Griff vor dem Bauch.
   */
  private holdInHand(ctx: WorldContext, thing: Carried): boolean {
    const side = this.carriedHand;
    if (!side) return false;
    const controller = ctx.input.get(side);
    if (!controller?.tracked) return false;
    const node = controller.hold;
    const object = thing.object;
    if (object.parent !== node) node.add(object);
    const hold = holdFor(thing.handle);
    object.position.set(hold.position.x, hold.position.y, hold.position.z);
    object.quaternion.set(hold.rotation.x, hold.rotation.y, hold.rotation.z, hold.rotation.w);
    return true;
  }

  private aimHeld(): void {
    const furnish = this.lifted;
    if (!furnish) return;
    furnish.model.rotation.set(0, (furnish.hold * Math.PI) / 2, 0);
  }

  /**
   * **Das Bild der Zutat bleibt oben liegen, wie man es liest** — auch wenn
   * das Möbel darunter quer steht.
   *
   * Die vier Ausgaben an der Westwand stehen gedreht (`KITCHEN_SPOTS`,
   * `turn: 3`), und das Schild auf ihrem Deckel hängt am Möbel, machte die
   * Drehung also mit: Von oben lagen Brötchen, Patty, Salat und Tomate auf der
   * Seite. Seit jedes Möbel frei gedreht hingestellt werden kann, ist das kein
   * Einzelfall mehr, sondern die Regel — also wird die Drehung des Möbels im
   * Schild wieder herausgerechnet, statt sie an vier Stellen im Aufbau
   * auszugleichen.
   *
   * **Nur das Bild, nicht das Möbel.** Eine Ausgabe hat eine Vorderseite (die
   * Mulde, die Leisten) und darf ruhig quer stehen; ihr Schild ist eine
   * Beschriftung, und Beschriftungen liest man in der Ansicht, in der gespielt
   * wird (`core/TopDownCamera.ts`, Norden oben).
   */
  private aimIcon(furnish: Furnish): void {
    if (!furnish.icon) return;
    furnish.icon.rotation.y = (-furnish.turn * Math.PI) / 2;
  }

  /**
   * **Ein getragenes Möbel zeigt dorthin, wohin die Figur zeigt** — jedes, und
   * nicht mehr nur das Band.
   *
   * Aus der Blickrichtung wird die Vierteldrehung (`kitchenBuild.turnAhead`),
   * dazu kommt der Versatz, in dem es in den Händen liegt (`Furnish.hold`):
   * `turn = Blickviertel + hold`. Damit gilt für jedes Möbel dasselbe wie
   * bisher für das Band — wer nach Süden schaut und absetzt, stellt es nach
   * Süden hin. Von oben zeigt die Figur dorthin, wohin sie läuft oder wohin
   * die Maus zielt (`core/FlatControls.walkNorthUp`), aus den Augen und in der
   * Brille dorthin, wohin der Kopf schaut.
   *
   * **Beim Band ist das die Laufrichtung** (`kitchenBelt.beltStep` hat
   * dieselbe Reihenfolge), bei der Ausgabe die Seite mit der Mulde, beim Herd
   * die Seite mit den Knöpfen. Vorher ließ sich nur das Band frei drehen und
   * alles andere stand für immer so, wie es im Aufbau stand — eine Küche, in
   * der man ein Möbel versetzen, aber nicht wenden kann, ist eine halb
   * umgebaute Küche.
   *
   * **Die Grundfläche wird mitgeführt**, denn eine Spüle liegt quer anders als
   * längs (`kitchenPlan.footprint`); der Umriss am Bauplatz zeigt es sofort.
   * Und das Schild oben dreht sich **nicht** mit (`aimIcon`).
   */
  private facePiece(): void {
    const furnish = this.lifted;
    if (!furnish) return;
    // Ohne Richtung bleibt das Blickviertel, das schon gilt — also das, was
    // aus Dreh- und Trageviertel übrig bleibt.
    const keep = (((furnish.turn - furnish.hold) % 4) + 4) % 4;
    const turn = ((turnAhead(_aim, keep as Turn) + furnish.hold) % 4) as Turn;
    if (turn === furnish.turn) return;
    furnish.turn = turn;
    furnish.size = footprint(furnish.piece, turn);
    this.aimIcon(furnish);
  }

  /**
   * `B`/`Y`: Hände auf, Geräte zurück an ihren Platz, Essen in den Müll.
   *
   * **Auch die halb fertigen Sachen** — das Patty in der Pfanne, der halbe
   * Schnitt auf dem Brett, der begonnene Burger auf der Zeile. Eine Küche, in
   * der nach dem Aufräumen noch ein Brötchen herumliegt, ist nicht aufgeräumt,
   * und der Nächste sucht den Fehler bei sich.
   *
   * Topf, Pfanne und Feuerlöscher gehen dabei **leer** zurück: Sie sind das
   * einzige, was diese Küche nicht nachbauen kann, und ein Patty, das in der
   * zurückgestellten Pfanne weiterbrutzelt, wäre kein Aufräumen.
   *
   * **Der Umbau wird mit aufgeräumt**, das getragene Möbel aber nicht an
   * seinen alten Platz gezwungen: Es geht dorthin, wo die Figur steht, wenn
   * dort Platz ist, und sonst zurück auf seine alte Kachel. Ein Möbel, das
   * beim Aufräumen verschwände, wäre eine Küche mit einem Loch darin.
   */
  reset(): void {
    if (this.lifted) this.dropPiece(true);
    this.editing = false;
    this.spraying = false;
    // Was unterwegs war, ist es nach dem Zurücksetzen nicht mehr: Eine
    // Reservierung auf eine Kachel, auf der gleich wieder alles frisch liegt,
    // sperrte sie für einen Handgriff, den niemand mehr erwartet.
    this.beltNow = null;
    const loose = [this.carried, ...this.stations.map((spot) => spot.on)];
    this.carried = null;
    this.carriedHand = null;
    if (this.avatar) this.avatar.carry = null;
    for (const spot of this.stations) {
      spot.on = null;
      spot.table = CLEAR_TABLE;
      spot.belt = BELT_EMPTY;
      spot.wet = DRY;
      this.setStack(spot, 0);
      this.settle(spot);
      this.gauges?.clear(spot.key);
      spot.shown = null;
    }
    for (const thing of loose) {
      if (!thing) continue;
      if (!thing.home) {
        this.discard(thing);
        continue;
      }
      this.restyle(thing, dish(thing.dish.item));
      this.layOn(thing.home, thing);
    }
    this.hideTicket();
    this.refreshStations();
  }

  dispose(): void {
    this.gone = true;
    // Die Formen und Materialien gehören der Vorlage und werden geteilt
    // (`core/kitchenModel.ts`); weggeräumt wird nur, was hier hängt.
    for (const object of this.placed) object.removeFromParent();
    this.placed.length = 0;
    for (const label of this.labels) label.dispose();
    this.labels.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    for (const material of this.owned) material.dispose();
    this.owned.length = 0;
    // Zutaten und Teller hängen an **einem** Satz und nicht an jedem Brötchen
    // einzeln (`kitchenProps.FoodKit`); dasselbe gilt für die Anzeigen, die
    // Bilder an den Ausgaben, die Bänder, den Nebel und den Boden — und der
    // gibt seine Leinwand mit frei, die ein Material für sich behielte.
    this.food.dispose();
    // Die Griffkreuze hängen an den Netzen und hören am Grafik-Menü zu — beides
    // muss weg, sonst bleibt ein Melder auf eine Küche zeigen, die es nicht
    // mehr gibt (`core/handleView.ts`).
    this.handleView.dispose();
    this.gauges?.dispose();
    this.gauges = null;
    this.oven?.dispose();
    this.oven = null;
    this.belts?.dispose();
    this.belts = null;
    this.jet?.dispose();
    this.jet = null;
    this.floor?.dispose();
    this.floor = null;
    this.buildButton?.dispose();
    this.buildButton = null;
    this.notice?.dispose();
    this.notice = null;
    this.stations.length = 0;
    this.furniture.length = 0;
    this.bodies.length = 0;
    this.carried = null;
    this.carriedHand = null;
    this.lifted = null;
    this.ghost = null;
    this.ghostLive = false;
    this.editing = false;
    this.spraying = false;
    this.ticket = null;
    this.ticketLeft = 0;
    this.beltNow = null;
    this.hidden = null;
    // Die Hände der Figur wieder freigeben — sie überlebt diese Zone.
    if (this.avatar) this.avatar.carry = null;
    this.avatar = null;
    this.world = null;
    // Und die Augenhöhe: Sie gehört der Küche, nicht dem Spieler. `standUp`
    // beim Weltwechsel räumt sie zwar ohnehin weg (`core/PlayerRig.ts`), aber
    // eine Zone, die sich darauf verlässt, dass jemand anders hinter ihr
    // aufräumt, ist genau die, die beim nächsten Umbau einen gestauchten
    // Spieler im Gokart sitzen lässt.
    this.offEyes?.();
    this.offEyes = null;
    if (this.rig) this.rig.eyeScale = 1;
    this.rig = null;
  }

  // --- aufstellen -----------------------------------------------------------

  /**
   * **Ein gebautes Stück** — alles, was in keiner Datei steht
   * (`KitchenPiece.built`).
   *
   * Zurzeit sind das zwei, und beide kommen aus demselben Bausatz: das
   * Förderband und das Zugband (`kitchenBelt.BeltKit.piece`). Der Zweig bleibt
   * trotzdem allgemein: Ein Katalog, in dem ein gebautes Möbel ein Sonderfall
   * im Aufstellen wäre, bekäme beim nächsten einen zweiten Sonderfall.
   */
  private buildPiece(piece: KitchenPiece): THREE.Object3D | null {
    const kind = beltKind(piece.name);
    if (kind) return this.belts?.piece(kind) ?? null;
    return null;
  }

  /**
   * Ein Stück an seinen Platz — die Mitte seiner Grundfläche, auf dem Boden.
   *
   * Der Ursprung eines Möbels liegt **auf dem Boden in seiner Mitte**
   * (`tools/kitchen-model.mjs`), also wird genau dorthin gerechnet und nichts
   * geraten. Ein hängendes Stück (die Dunstabzugshaube) bekommt keinen Körper:
   * Darunter läuft man durch.
   *
   * **Der Versatz aus dem Katalog kommt hier dazu** (`KitchenPiece.align`) —
   * und er ist der Grund, warum der Herd mit der Pfanne endlich in der Reihe
   * steht: Sein Ursprung liegt in der Mitte von Korpus **und Pfannenstiel**,
   * und der Stiel steht 16 cm über. Er wird in der **eigenen** Drehung des
   * Möbels verrechnet, nicht in der der Welt — ein um 180° gedrehter Herd
   * rückt nach der anderen Seite.
   */
  private place(
    model: THREE.Object3D,
    piece: KitchenPiece,
    spot: Spot,
    takeUtensil: (model: THREE.Object3D) => THREE.Object3D | null,
  ): void {
    const world = this.world;
    if (!world) return;
    const turn: Turn = spot.turn ?? 0;
    const size = footprint(piece, turn);
    world.root.add(model);
    this.placed.push(model);

    const furnish: Furnish = {
      piece,
      spot,
      x: spot.x,
      z: spot.z,
      turn,
      hold: 0,
      size,
      model,
      box: null,
      body: null,
      station: null,
      icon: null,
      held: false,
      cargo: null,
      usable: null,
    };
    const foot = this.standAt(furnish);
    if (!spot.show) this.furniture.push(furnish);
    // **Das Wasser gehört dem Möbel und nicht der Station** — also steht es
    // auch im Schauraum im Becken, wo es gar nichts zu spülen gibt. Ein
    // Spülbecken ohne Wasser ist eine Blechmulde, und der Schauraum zeigt, wie
    // ein Möbel aussieht.
    if (stationKind(piece.name, spot.gives, spot.role) === 'sink') this.addWater(furnish);

    if (spot.show) {
      this.addBody(furnish);
      this.addLabel(world, piece, size, model.position.x, model.position.z);
      return;
    }
    this.addBody(furnish);
    this.addIcon(furnish);
    this.markPieceHandles(furnish);
    this.addStation(furnish, foot, takeUtensil);
  }

  /**
   * **Die vier Rand-Griffe eines Möbels sichtbar machen** — dasselbe Häkchen,
   * dieselben Kreuze wie bei Pfanne und Teller (`core/handleView.ts`, _Grafik →
   * Griffe zeigen_).
   *
   * Sie hängen in einer Gruppe, die den halben Maßstab des geladenen Modells
   * aufhebt (`core/kitchenFit.kitchenPieceScale`): Die Griffe stehen in Metern
   * der Welt (`kitchenGrab.pieceHandles`), das Modell in halben — ohne den
   * Träger säßen die Kreuze auf halber Höhe und halb so weit außen, und man
   * hielte die Regel für falsch, die stimmt.
   *
   * **Nur in der Küche, nicht im Schauraum**: Dort steht jedes Möbel zum
   * Ansehen, es wird nicht aufgehoben, und fünfzehn zusätzliche Achsenkreuze
   * beantworten dort keine Frage.
   */
  private markPieceHandles(furnish: Furnish): void {
    const holder = new THREE.Group();
    holder.name = 'kitchen-handle-holder';
    holder.scale.setScalar(1 / kitchenPieceScale(furnish.piece));
    furnish.model.add(holder);
    this.handleView.attach(holder, pieceHandles(furnish.piece));
  }

  /**
   * **Ein Möbel auf seine Kachel stellen** — die eine Rechnung von Kachel zu
   * Weltmaß, und sie wird zweimal gebraucht: beim Aufbau und bei jedem Umbau.
   *
   * **Der Fuß ist nicht immer der Fußboden.** Nach oben hebt ihn `Spot.lift`
   * (das Ausgaberegal über der Theke), nach unten zieht ihn `KitchenPiece.bury`
   * — beim Schneidebrett um die Dicke des Bretts, damit dessen Oberfläche mit
   * der Küchenzeile daneben eine durchgehende Arbeitsplatte ergibt statt einer
   * Stufe. Der Unterschied zwischen beiden ist, wem sie gehören: `lift` einer
   * **Stelle** im Aufbau, `bury` dem **Möbel** — und deshalb steht das Brett in
   * der Küche wie im Schauraum gleich.
   *
   * Weil hier der Fuß herauskommt und nicht der Boden, rechnet alles Weitere
   * von selbst richtig: Die Ablage ist `foot + kitchenDeck(piece)`, und
   * `kitchenDeck` misst ab Fuß (`core/kitchenFit.ts`). Der **Körper** bleibt
   * davon unberührt und steht weiter auf dem Boden (`addBody`) — ein Möbel,
   * gegen das man 3 cm tiefer läuft, ist kein anderes Hindernis.
   *
   * @returns die Höhe, auf der es steht — die Ablage rechnet darauf weiter
   */
  private standAt(furnish: Furnish): number {
    const { piece, spot, model, size, turn } = furnish;
    const angle = (turn * Math.PI) / 2;
    const [ax, az] = piece.align ?? [0, 0];
    const centreX = (KITCHEN.x + furnish.x + size.w / 2) * TILE;
    const centreZ = (KITCHEN.z + furnish.z + size.d / 2) * TILE;
    const foot = KITCHEN_FLOOR + (spot.lift ?? 0) - (piece.bury ?? 0);
    model.position.set(
      centreX + ax * Math.cos(angle) + az * Math.sin(angle),
      foot,
      centreZ - ax * Math.sin(angle) + az * Math.cos(angle),
    );
    model.rotation.y = angle;
    model.updateWorldMatrix(true, false);
    return foot;
  }

  /**
   * **Der Körper unter dem Bild** — ein Kasten, und zwar genau einer.
   *
   * Hier lag der Fehler, wegen dem man **durch** die Küche lief: `addSolid`
   * misst die Hülle des Objekts, das es bekommt (`PhysicsWorld.halfExtentsOf`),
   * und ein geladenes Möbel ist eine **Gruppe** ohne eigene Geometrie. Für die
   * bleibt der Notnagel von 10 cm Halbmaß — ein Würfelchen von 20 cm mitten im
   * Herd, im Boden zur Hälfte versenkt.
   *
   * Der Körper ist deshalb ein eigener, unsichtbarer **Kasten** in der Größe
   * der Kachelfläche des Möbels: Er steht auf dem Boden statt auf halber Höhe
   * darin, er hat die Maße aus dem Katalog statt die geratenen, und er
   * schließt an seinen Nachbarn an — eine Zeile aus acht Schränken ist eine
   * Wand und keine Reihe Poller.
   *
   * **In der Küche ist er mindestens `BLOCK_HEIGHT` hoch**, auch wenn der
   * Tresen nur einen halben Meter misst. Ein halber Meter ist kein Hindernis
   * für jemanden, der einen Meter hoch springt: Wer einmal oben stand, lief
   * die ganze Wand entlang, über Spüle und Herd hinweg. Bei _Overcooked_ ist
   * genau das der Witz an einer Küche — man geht **herum**, nicht darüber.
   *
   * **Und es bleibt bei einem Kasten.** Der erste Versuch setzte die Sperre
   * als zweiten Körper auf den ersten, damit eine Kugel über den Tresen
   * fliegen kann. Zwei Körper übereinander an derselben Stelle sind für die
   * Spielerkapsel aber keine Wand, sondern eine Falle: Sie blieb beim Springen
   * dagegen auf halber Höhe davor **hängen** und fiel nicht mehr herunter.
   */
  private addBody(furnish: Furnish): void {
    const world = this.world;
    const { piece, spot, size } = furnish;
    if (!world || piece.hanging || spot.lift) return;
    // Im Schauraum steht jedes Stück für sich: Dort gibt es kein „darüber
    // hinweg", nur ein Möbel zum Ansehen — und keinen Grund, über ihm gegen
    // Luft zu laufen. Was im Boden steckt, zählt dabei nicht mit
    // (`KitchenPiece.bury`): Der Kasten steht auf dem Boden, also reicht er so
    // weit, wie das Möbel darüber hinausragt, und nicht drei Zentimeter höher.
    const stands = piece.height - (piece.bury ?? 0);
    const height = spot.show ? stands : Math.max(stands, BLOCK_HEIGHT);
    const centreX = (KITCHEN.x + furnish.x + size.w / 2) * TILE;
    const centreZ = (KITCHEN.z + furnish.z + size.d / 2) * TILE;
    const box = this.boxAt(size.w * TILE, height, size.d * TILE, centreX, KITCHEN_FLOOR, centreZ);
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);
    const body = world.addSolid(box);
    this.bodies.push(body);
    furnish.box = box;
    furnish.body = body;
  }

  /** Und wieder heraus — beim Aufheben im Baumodus (`ZoneHost.removeSolid`). */
  private dropBody(furnish: Furnish): void {
    const world = this.world;
    if (!world || !furnish.box || !furnish.body) return;
    world.removeSolid(furnish.box, furnish.body);
    const at = this.bodies.indexOf(furnish.body);
    if (at >= 0) this.bodies.splice(at, 1);
    furnish.box.removeFromParent();
    this.forget(furnish.box);
    furnish.box = null;
    furnish.body = null;
  }

  /**
   * **Ein unsichtbarer Kasten mit dem Fuß auf `bottom`.**
   *
   * Unsichtbar und trotzdem in `solids`: Ein Strahl fragt nicht, ob er etwas
   * sieht (`THREE.Raycaster` prüft `visible` nicht), und eine Kugel soll am
   * Tresen stehen bleiben und nicht am Teller dahinter. Was hier fehlt, ist
   * nur das Zeichnen — und das besorgt das Möbel daneben.
   */
  private boxAt(w: number, h: number, d: number, x: number, bottom: number, z: number): THREE.Mesh {
    const tall = Math.max(h, 0.02);
    const shape = new THREE.BoxGeometry(w, tall, d);
    this.shapes.push(shape);
    this.hidden ??= this.own(new THREE.MeshBasicMaterial({ visible: false }));
    const box = new THREE.Mesh(shape, this.hidden);
    box.name = 'kitchen-hitbox';
    box.visible = false;
    box.position.set(x, bottom + tall / 2, z);
    return box;
  }

  /**
   * **Das Schild am Schaustück** — Name und Maße, und es sieht die Kamera an.
   *
   * Eine Tafel und kein Einbau (`fixtures/sign.ts`): Ein Schild im Grundriss
   * will eine Kachelkante, eine Kennung und einen Eintrag im gespeicherten
   * Stand. Vierzehn davon wären vierzehn Einbauten, die jeder Umbau der Welt
   * mitschleppt — für eine Beschriftung, die sich nie ändert.
   *
   * **Es steht nicht mehr fest geneigt da** (`face`, `ui/billboard.ts`).
   * Vorher lehnte es sich um 20° zurück, und das war ein Kompromiss zwischen
   * zwei Ansichten, der in beiden nur fast stimmte: von oben zu steil, aus den
   * Augen zu flach. Jetzt richtet es sich beim **Zeichnen** aus, also je
   * Kamera — und in der Brille sogar je Auge.
   */
  private addLabel(
    world: ZoneHost,
    piece: KitchenPiece,
    size: { w: number; d: number },
    centreX: number,
    centreZ: number,
  ): void {
    const [w, d] = piece.tiles;
    const plate = new TextPlane({
      width: Math.max(size.w * TILE, 1.1),
      height: 0.42,
      title: piece.label,
      body: `${w} × ${d} Kachel${w * d === 1 ? '' : 'n'} · ${piece.height.toFixed(2)} m hoch`,
      accent: 0xffd35a,
      align: 'center',
      face: true,
    });
    plate.position.set(centreX, KITCHEN_FLOOR + piece.height + 0.58, centreZ + size.d / 2 - 0.05);
    world.root.add(plate);
    this.placed.push(plate);
    this.labels.push(plate);
  }

  /**
   * **Das Bild an der Ausgabe** — was sie hergibt, gerendert und vorn
   * angeklebt (`kitchenIcon.IconOven`).
   *
   * Ein Bild je Zutat und nicht je Möbel: Der Ofen merkt sich, was er schon
   * gebacken hat, und zwei Brötchenausgaben zeigen dieselbe Textur.
   *
   * **Ohne Bild bleibt das Möbel, was es ist.** In Jest gibt es kein WebGL und
   * in der Brille keinen freien Durchgang, also gibt `bake` dort `null` — dann
   * steht eine Ausgabe ohne Schild da, gibt aber genauso aus. Ein Schild, das
   * eine Welt zum Stehen bringt, wäre der teuerste Zierrat der Küche.
   */
  private addIcon(furnish: Furnish): void {
    const { model, piece, spot } = furnish;
    const gives = spot.gives;
    const oven = this.oven;
    if (!gives || !oven) return;
    // Was `build` liefert, gehört weiter dem Zutatensatz: Der Ofen hängt es
    // kurz in seine Szene und gibt nichts davon frei (`IconOven.bake`).
    const texture = oven.bake(
      `gives:${gives}`,
      () => this.food.view(dish(gives)) ?? new THREE.Group(),
    );
    if (!texture) return;
    // **Das Möbel ist halbiert, das Schild darf es nicht sein.** Ein geladenes
    // Stück kommt mit `scale = KITCHEN_SCALE` (0,5) aus dem Lader
    // (`core/kitchenModel.ts`); ein Schild direkt daran wäre halb so groß und
    // hinge auf halber Höhe. Es hängt deshalb in einer Gruppe, die den Maßstab
    // wieder aufhebt, und rechnet damit in Metern wie alles andere hier.
    const holder = new THREE.Group();
    holder.name = 'kitchen-icon-holder';
    holder.scale.setScalar(1 / kitchenPieceScale(piece));
    // **Einmal, oben.** Es war eine Weile zweimal dasselbe Bild, oben und
    // vorn, und der Gedanke dahinter stimmte für sich: Von oben
    // (`core/TopDownCamera.ts`, die Hauptansicht am Schirm) sieht man von einem
    // Möbel fast nur den Deckel, aus den Augen vor allem die Front. Nur standen
    // dann vier Ausgaben nebeneinander mit **acht** Bildern derselben vier
    // Zutaten, und das vordere klemmte auf einem Möbel von 0,46 m zwischen zwei
    // Leisten. Was oben liegt, ist ein Teller mit der Zutat darauf — das liest
    // sich aus beiden Richtungen als Ausgabe (`kitchenIcon.counterSign`).
    holder.add(oven.counterSign(texture, { piece }));
    model.add(holder);
    // Das Schild macht die Drehung des Möbels **nicht** mit: Es wird von oben
    // gelesen, und dort liegt Norden oben (`aimIcon`).
    furnish.icon = holder;
    this.aimIcon(furnish);
  }

  /**
   * **Was an einem Möbel geht** — abstellen, herunternehmen, wegwerfen,
   * ausgeben, spülen, stapeln.
   *
   * Welche Rolle ein Möbel spielt, steht im Aufbau und nicht hier
   * (`kitchenPlan.stationKind`): Der Mülleimer ist ein Mülleimer, eine Ausgabe
   * gibt aus, und dasselbe Möbel ist an der einen Stelle ein Arbeitstisch und
   * an der anderen die Geschirrrückgabe (`Spot.role`).
   *
   * Wo im Modell ein Gerät steht (`KitchenPiece.holds`), wird es gleich hier
   * abgenommen: Es hängt danach als eigenes Ding auf seiner Fläche, und der
   * Herd darunter ist ein leerer Herd. Ohne diesen Schritt wäre „den Topf
   * nehmen" ein Sonderfall im Nehmen; so ist es derselbe Griff wie bei allem
   * anderen — und dasselbe gilt für den Feuerlöscher auf seinem Hocker.
   */
  private addStation(
    furnish: Furnish,
    foot: number,
    takeUtensil: (model: THREE.Object3D) => THREE.Object3D | null,
  ): void {
    const { piece, spot, model } = furnish;
    const kind = stationKind(piece.name, spot.gives, spot.role);
    if (!kind) return;
    // **Die Ablage liegt über dem Möbel und nicht über seiner Kachel.** Wo
    // beides auseinanderfällt, ist der Herd mit der Pfanne (`align`): Seine
    // Platte steht 7,8 cm südlich der Kachelmitte, und dort gehört die Pfanne
    // hin und nicht daneben.
    const deck = new THREE.Vector3(model.position.x, foot + kitchenDeck(piece), model.position.z);
    const station: Station = {
      kind,
      label: spot.label ?? piece.label,
      object: model,
      deck,
      gives: spot.gives,
      // Die Kachel steht im Schlüssel, nicht der Möbelname: Es gibt zwei
      // Bretter und drei Herde, und zwei Balken unter demselben Schlüssel
      // wären einer.
      key: `${piece.name}@${furnish.x},${furnish.z}`,
      home: furnish,
      on: null,
      stove: COLD_STOVE,
      work: IDLE_WORK,
      table: CLEAR_TABLE,
      belt: BELT_EMPTY,
      wet: DRY,
      stack: 0,
      pile: null,
      shown: null,
    };
    furnish.station = station;
    this.stations.push(station);

    if (!piece.holds) return;
    const loose = takeUtensil(model);
    if (!loose) return;
    // **Ein Träger darum herum**, und das ist die Stelle, an der ich mich beim
    // Bauen verrannt habe: Was `takeUtensil` zurückgibt, trägt den **Maßstab
    // des Modells** (`core/kitchenModel.KITCHEN_SCALE`, also 0,5). Ein Patty,
    // das man direkt in die Pfanne hängt, wäre damit halb so groß und läge
    // halb so hoch. Der Träger steht auf 1, die Pfanne hängt darin, und der
    // Belag kommt daneben (`restyle`).
    const holder = new THREE.Group();
    holder.name = `kitchen-${piece.holds}`;
    holder.add(loose);
    this.placed.push(holder);
    this.markHandles(holder, piece.holds);
    this.layOn(station, {
      dish: dish(piece.holds),
      object: holder,
      loose,
      topping: null,
      home: station,
      handle: null,
    });
  }

  /**
   * **Das Wasser im Spülbecken** — eine Fläche in der Mulde, halb hoch.
   *
   * **In der Quelle ist keines drin**, und das war der Grund, warum die Spüle
   * nach nichts aussah: eine leere Blechmulde, in der ein Teller flach auf dem
   * Rand lag. Bei _Overcooked_ ist es umgekehrt — an der Spüle sieht man von
   * weitem, dass dort Arbeit liegt, und das macht das Wasser.
   *
   * **Gebaut und nicht geladen**, wie alles, was die Quelle nicht hat
   * (`kitchenProps.ts`): ein Rechteck in der gemessenen Größe der
   * Beckenöffnung, auf `SINK_BOWL.water` — halbe Beckentiefe. Genau dort taucht
   * der schräge Teller zur Hälfte ein (`kitchenProps.SINK_TILT`).
   *
   * **Es hängt am Möbel und nicht in der Welt**, und damit fährt es im Baumodus
   * mit: Wer das Becken aufhebt und anderswo hinstellt, trägt das Wasser darin
   * mit sich, statt es stehen zu lassen. Der Träger hebt dafür den halben
   * Maßstab des geladenen Modells wieder auf — dieselbe Gruppe wie beim Schild
   * der Ausgabe (`addIcon`), und aus demselben Grund: Die Zahlen aus dem
   * Katalog sind Meter der Welt.
   */
  private addWater(furnish: Furnish): void {
    const { piece, model } = furnish;
    const shape = new THREE.PlaneGeometry(SINK_BOWL.width, SINK_BOWL.depth);
    this.shapes.push(shape);
    // Durchsichtig, aber nicht durchsichtig genug, um das Becken darunter zu
    // zeigen: Ein Wasser, durch das man den Blechboden sieht, ist eine blaue
    // Folie. Rau ist es auch nicht — eine ruhige Fläche spiegelt.
    this.pond ??= this.own(
      new THREE.MeshStandardMaterial({
        color: 0x2e7ba6,
        transparent: true,
        opacity: 0.78,
        roughness: 0.12,
        metalness: 0.2,
      }),
    );
    const water = new THREE.Mesh(shape, this.pond);
    water.name = 'kitchen-sink-water';
    water.rotation.x = -Math.PI / 2;
    water.position.set(SINK_BOWL.at[0], SINK_BOWL.water, SINK_BOWL.at[1]);
    const holder = new THREE.Group();
    holder.name = 'kitchen-water-holder';
    holder.scale.setScalar(1 / kitchenPieceScale(piece));
    holder.add(water);
    model.add(holder);
  }

  /** Die Station auf dieser Kachel — oder `null`, wenn dort keine steht. */
  private stationAt(x: number, z: number): Station | null {
    for (const furnish of this.furniture) {
      if (furnish.held || !furnish.station) continue;
      if (
        x >= furnish.x &&
        x < furnish.x + furnish.size.w &&
        z >= furnish.z &&
        z < furnish.z + furnish.size.d
      ) {
        return furnish.station;
      }
    }
    return null;
  }

  // --- anfassen -------------------------------------------------------------

  /**
   * **Wer gerade auf `A` hört** — und wer nicht.
   *
   * Eine Ablage meldet sich **nur dann** an, wenn sie auch etwas zu sagen hat:
   * wenn etwas darauf liegt (dann nimmt man es) oder wenn etwas in der Hand
   * liegt (dann legt man es hin). Das ist nicht Sparsamkeit, sondern die
   * Antwort auf eine Frage, die man sonst nicht sieht: **Der gelbe Saum**
   * (`core/highlight.ts`) umfasst immer genau das, was `A` gerade meint — also
   * leuchtet beim Brötchen in der Hand jede Fläche auf, auf die es darf, und
   * sonst leuchtet keine. Eine Küche, in der jeder Schrank immer leuchtet,
   * sagt genauso wenig wie eine, in der keiner leuchtet.
   *
   * **Im Baumodus gilt etwas anderes**, und es gilt für **jedes** Möbel: Dann
   * meint `A` das Möbel selbst, nicht das, was darauf liegt. Deshalb steht der
   * Zweig ganz oben und nicht als Sonderfall in der Regel nebenan — was ein
   * Druck bewirkt, hängt hier nicht am Gericht, sondern am Modus.
   */
  private refreshStations(): void {
    const world = this.world;
    if (!world) return;
    if (this.editing) {
      this.refreshEditables(world);
      return;
    }
    for (const furnish of this.furniture) {
      const spot = furnish.station;
      // **Die Regel selbst sagt, ob es hier etwas zu tun gibt.** Vorher stand
      // hier eine zweite Liste je Stationsart — und die lief mit jeder neuen
      // Art auseinander. `nothing` ist der einzige Fall ohne etwas zu sagen;
      // `refuse` hat einen Satz und meldet sich.
      const deed = spot ? kitchenDeed(this.held(), facts(spot)) : null;
      const target = deed && deed.do !== 'nothing' && spot ? this.aimAt(spot, deed) : null;
      if (target === furnish.usable) continue;
      if (furnish.usable) world.removeUsable(furnish.usable);
      furnish.usable = target;
      if (!target || !spot) continue;
      // Die Tat von **jetzt**, nicht die von der Anmeldung: Hinweis und
      // Absicht unten fragen beide danach, und beide werden gelesen, während
      // die Figur davorsteht.
      const deedNow = (): KitchenDeed => kitchenDeed(this.held(), facts(spot));
      world.addUsable(
        target,
        {
          use: (by) => this.act(spot, by),
          usePrompt: () => kitchenPrompt(deedNow(), spot.label),
          // **Ein Feld, das bei jedem Lesen neu fragt** — wie `usePrompt`
          // daneben, und aus demselben Grund: Dieselbe Station will einmal
          // gegriffen (das Brötchen aus der Ausgabe) und im nächsten
          // Augenblick gedrückt werden (den Teller darauf ablegen), ohne dass
          // sich das Netz dazwischen ändert. Eine einmal eingetragene Absicht
          // wäre nach dem ersten Handgriff falsch.
          //
          // **Und sie sagt jetzt mehr als „greifen oder drücken"**: In der
          // Brille gehört alles, was etwas aus der Hand gibt, der Greif-Taste
          // (`kitchenCarry.kitchenInteractionSpec`), und alles in dieser Küche
          // greift nur im Meter (`kitchenGrab.KITCHEN_REACH`). Die Griffe
          // dazu kommen von dem, was gleich in der Hand liegt.
          get interaction() {
            const deed = deedNow();
            return kitchenInteractionSpec(
              deed,
              deed.do === 'take' ? kitchenGrab(deed.dish.item) : KITCHEN_STATION_GRAB,
            );
          },
        },
        // **Nicht schießbar**: Eine Kugel, die den Topf vom Herd holt, ist ein
        // Scherz und keine Regel (`PortalWorld.shootUsable`).
        { shot: 0 },
      );
    }
  }

  /**
   * **Woran der gelbe Saum hängt** — am Möbel oder an dem, was darauf liegt.
   *
   * **Welche Tat das Liegende meint, sagt die Regel** (`meansContent`,
   * `kitchenCarry.ts`) — sie ist eine Aussage über Taten und wird deshalb
   * dort geführt und dort geprüft. Hier steht nur, **welches Netz** dabei
   * herauskommt.
   *
   * An der **Rückgabe** und auf dem **Abtropfbrett** liegt kein einzelnes Ding,
   * sondern ein Stapel; dann leuchtet der. Und wo eine Ausgabe etwas Frisches
   * aus dem Nichts gibt (`box` mit leerem Deckel), gibt es nichts zum Leuchten
   * außer ihr selbst.
   */
  private aimAt(spot: Station, deed: KitchenDeed): THREE.Object3D {
    if (!meansContent(deed)) return spot.object;
    if (stacks(spot.kind)) return spot.pile ?? spot.object;
    return spot.on?.object ?? spot.object;
  }

  /** Was die Figur trägt, so wie die Regel es sehen will. */
  private held(): Dish | null {
    return this.carried?.dish ?? null;
  }

  /**
   * **Was `A` an dieser Station bewirkt** (`kitchenCarry.kitchenDeed`).
   *
   * Die Regel liefert **fertige Stände** — was danach in der Hand ist und was
   * an der Station liegt —, und hier wird nichts davon noch einmal
   * nachgerechnet. Deshalb ist jeder Fall zwei bis vier Zeilen lang: Netz
   * umbauen, hinlegen oder wegnehmen, es sagen.
   */
  private act(spot: Station, by?: UseSource): boolean {
    const world = this.world;
    if (!world) return false;
    const deed = kitchenDeed(this.held(), facts(spot));
    // **Eine Kachel, auf die gerade etwas zufährt, ist vergeben** — auch wenn
    // sie leer aussieht (`kitchenBelt.beltBound`). Wer trotzdem etwas darauf
    // legt, bekommt nichts Kaputtes: Das Ankommende bleibt kurz davor stehen
    // und staut sich (`BELT_HOLD`). Nur ist ein Stau, den man selbst verursacht
    // hat, ohne es zu sehen, kein gutes Spiel — also wird es gesagt, statt ihn
    // hübsch aussehen zu lassen. Gilt nur fürs **Hinlegen**: Wer etwas
    // aufnimmt oder zusammenlegt, macht die Kachel nicht voller, als sie ist.
    if (deed.do === 'place' && this.beltNow && beltBound(this.beltNow, spot.key)) {
      world.notify(`Auf ${spot.label} kommt gerade etwas an`);
      return true;
    }
    switch (deed.do) {
      case 'take': {
        const thing = this.pickUp(spot, deed.dish);
        if (!thing) return false;
        this.takeInHand(thing, spot, by);
        world.notify(`${dishLabel(deed.dish)} in der Hand`);
        break;
      }
      case 'place':
      case 'work': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        if (stacks(spot.kind)) {
          // An der Rückgabe und auf dem Abtropfbrett wird nicht abgelegt,
          // sondern **gestapelt**: Der Teller geht im Stapel auf, sein Netz
          // wird nicht gebraucht.
          this.discard(thing);
          this.setStack(spot, spot.stack + 1);
          world.notify(`${dishLabel(deed.dish)} abgestellt (${spot.stack})`);
          break;
        }
        this.layOn(spot, thing);
        // Am Brett und in der Spüle fängt die Arbeit sofort an — `layOn` legt
        // die Uhr an (`settle`), gesagt wird es hier.
        world.notify(
          deed.do === 'work'
            ? deed.kind === 'wash'
              ? 'Geschirr wird gespült'
              : `${ITEM_LABELS[deed.dish.item]} wird geschnitten`
            : `${dishLabel(deed.dish)} auf ${spot.label}`,
        );
        break;
      }
      case 'combine': {
        this.merge(spot, deed.held, deed.target);
        // **Wer hat bekommen?** Zusammengelegt wird in beide Richtungen
        // (`kitchenRecipes.combine`), und die Meldung muss mitgehen: Wer mit
        // dem Teller zur Tomate läuft, hat sie aufgenommen und nicht
        // abgelegt. Die Antwort steht in der Tat — liegt das Gewanderte
        // hinterher in der Hand, ging es dorthin.
        const names = layered(deed.moved)
          .map((item) => ITEM_LABELS[item])
          .join(', ');
        const gained = deed.held?.on ?? [];
        const toHand = deed.moved.every((item) => gained.includes(item));
        world.notify(toHand ? `${names} aufgenommen` : `${names} auf ${spot.label}`);
        break;
      }
      case 'trash': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        this.discard(thing);
        world.notify(`${dishLabel(deed.dish)} weggeworfen`);
        break;
      }
      case 'scrape': {
        // **Der Träger bleibt in der Hand.** Wer einen misslungenen Burger
        // wegwirft, will nicht auch noch zur Tellerausgabe laufen. Was
        // danach in der Hand ist, steht in der Tat — der leere Träger.
        const thing = this.carried;
        if (!thing) return false;
        this.restyle(thing, deed.dish);
        world.notify(`${ITEM_LABELS[deed.dish.item]} abgeräumt`);
        break;
      }
      case 'serve': {
        const thing = this.carried;
        if (!thing) return false;
        // **Teller und Gericht gehen zusammen**, und beide zum Gast: `held`
        // ist deshalb `null` (`kitchenCarry.atPass`). Die Hand ist danach frei.
        this.carried = null;
        this.discard(thing);
        this.showTicket(spot, deed.recipe.label);
        world.notify(`${deed.recipe.label} serviert — ${this.toGuest()}`);
        break;
      }
      case 'douse':
        this.putOut(spot);
        break;
      case 'refuse':
        world.notify(deed.why);
        return true;
      case 'nothing':
        return false;
    }
    this.refreshStations();
    return true;
  }

  /**
   * **Wohin das Gericht geht** — an einen freien Tisch, sonst gleich in die
   * Rückgabe.
   *
   * Beides steht so im Auftrag, und beides endet an derselben Stelle: beim
   * dreckigen Teller. Der Tisch ist der schönere Weg (man sieht, dass jemand
   * isst), die Rückgabe der ehrlichere, wenn alle Tische besetzt sind — ein
   * Gericht, das nirgends hinkann, verschwände sonst spurlos und die Küche
   * hätte einen Teller weniger.
   *
   * @returns der halbe Satz für die Meldung, damit sie sagt, wohin es ging
   */
  private toGuest(): string {
    const tables = this.stations.filter((spot) => spot.kind === 'table');
    const free = freeTable(tables.map((spot) => spot.table));
    const table = free >= 0 ? tables[free] : undefined;
    if (table) {
      table.table = seat();
      return 'ein Gast setzt sich';
    }
    const back = this.stations.find((spot) => spot.kind === 'return');
    if (back && back.stack < DIRTY_STACK_MAX) {
      this.setStack(back, back.stack + 1);
      return 'das Geschirr steht an der Rückgabe';
    }
    return 'kein Tisch frei, und die Rückgabe ist voll';
  }

  /**
   * **Zusammengelegt** — die Hand bekommt ihren neuen Stand, die Station den
   * ihren.
   *
   * Beide stehen fertig in der Tat (`KitchenDeed.combine`), `null` heißt leer.
   * Vier Fälle, und jeder ist eine Zeile:
   *
   * - Die Hand wird leer: Die Zutat ist auf die Station gewandert.
   * - Die Station wird frei: Sie ist in die Hand gewandert.
   * - Beide bleiben: Die Pfanne gibt ihr Patty her und bleibt stehen, wo sie
   *   war — der eine Fall, für den es `offer` in `kitchenRecipes.ts` gibt.
   * - An einer **Ausgabe** bleibt liegen, was dort liegt: Sie gibt ihr
   *   Frisches aus dem Nichts aus und rührt ihren Deckel dabei nicht an.
   *
   * **Ein geladenes Gerät verschwindet dabei nie.** Eine Pfanne gibt ihren
   * Inhalt ab und bleibt, ein Topf und ein Feuerlöscher nehmen gar nichts an
   * — es gibt also keinen Weg, auf dem hier das einzige Exemplar eines Netzes
   * weggeworfen würde. Gäbe es ihn, stünde die Küche danach ohne Pfanne da.
   */
  private merge(spot: Station, held: Dish | null, target: Dish | null): void {
    const hand = this.carried;
    if (hand) {
      if (held) this.restyle(hand, held);
      else {
        this.carried = null;
        this.discard(hand);
      }
    }
    const on = spot.on;
    if (!target) {
      if (on) {
        spot.on = null;
        this.discard(on);
      }
    } else if (on && target !== on.dish) {
      // **Derselbe Stand ist kein neues Netz.** Eine Ausgabe gibt ihr Frisches
      // aus dem Nichts und reicht ihren Deckel unverändert zurück
      // (`kitchenCarry.fromBox`) — ein `restyle` darauf baute die Tomate, die
      // dort liegt, bei jedem Griff neu.
      this.restyle(on, target);
    }
    this.settle(spot);
  }

  /**
   * **Was man an dieser Station in die Hand bekommt.**
   *
   * Drei Quellen: Eine **Ausgabe** baut neu, so oft man will — ein Stapel
   * Teller, der nach dem dritten Gast leer ist, wäre bei _Overcooked_ der
   * Punkt, an dem eine Runde stehenbleibt. Die **Rückgabe** gibt einen Teller
   * aus ihrem Stapel. Jede andere Station gibt her, was auf ihr liegt, und ist
   * danach leer.
   */
  private pickUp(spot: Station, want: Dish): Carried | null {
    if (stacks(spot.kind)) {
      if (spot.stack <= 0) return null;
      this.setStack(spot, spot.stack - 1);
      return this.make(want);
    }
    // Die Ausgabe gibt ihr Frisches nur dann, wenn ihr Deckel leer ist — liegt
    // dort etwas, hat die Regel genau das gemeint (`kitchenCarry.fromBox`).
    if (spot.kind === 'box' && !spot.on) return this.make(want);
    const on = spot.on;
    spot.on = null;
    // Ein abgeräumter Gästetisch ist wieder ein freier Gästetisch.
    spot.table = cleared(spot.table);
    this.settle(spot);
    return on;
  }

  /** Ein neues Ding aus einer Ausgabe — Zutaten und Teller baut der Satz. */
  private make(want: Dish): Carried | null {
    const object = this.food.view(want);
    // `null` gibt es nur für Topf, Pfanne und Feuerlöscher, und die kommen aus
    // dem Möbelmodell: Eine Ausgabe, die Pfannen ausgäbe, gibt es nicht.
    if (!object) return null;
    this.placed.push(object);
    this.markHandles(object, want.item);
    return { dish: want, object, loose: null, topping: null, home: null, handle: null };
  }

  /**
   * **Der Stapel an der Rückgabe und auf dem Abtropfbrett** — eine Zahl und
   * ein Netz dazu.
   *
   * Das Netz wird nur dann neu gebaut, wenn sich die Zahl geändert hat: Ein
   * Stapel, der jedes Bild neu entsteht, wäre sechs Teller je Bild
   * (`kitchenProps.FoodKit.dirtyStack`).
   *
   * **Zwei Stationen, eine Rechnung**: An der Rückgabe stehen bis zu sechs
   * dreckige, auf dem Abtropfbrett bis zu vier saubere Teller
   * (`kitchenCarry.CLEAN_STACK_MAX`). Was sich unterscheidet, sind die Grenze
   * und das Netz; alles andere — zählen, altes Netz wegräumen, neues
   * hinstellen — ist Zeile für Zeile dasselbe.
   */
  private setStack(spot: Station, count: number): void {
    const clean = spot.kind === 'drain';
    const want = Math.max(0, Math.min(clean ? CLEAN_STACK_MAX : DIRTY_STACK_MAX, count));
    if (want === spot.stack && (want === 0) === (spot.pile === null)) return;
    spot.stack = want;
    if (spot.pile) {
      spot.pile.removeFromParent();
      this.forget(spot.pile);
      spot.pile = null;
    }
    if (want <= 0) return;
    const pile = clean ? this.food.cleanStack(want) : this.food.dirtyStack(want);
    pile.position.copy(spot.deck);
    this.world?.root.add(pile);
    this.placed.push(pile);
    spot.pile = pile;
  }

  /**
   * **Aus einem Gericht wird ein anderes** — und das Netz zieht nach.
   *
   * **Die eine Stelle**, an der ein getragenes Ding sein Aussehen wechselt:
   * gebraten, geschnitten, gespült, belegt, abgeräumt. Alles andere ruft hier
   * an, statt selbst Netze zu bauen — sonst hätte jeder neue Handgriff seine
   * eigene kleine Fassung davon, und eine davon vergäße den Belag.
   *
   * Zwei Wege, je nachdem, woher das Netz kommt (siehe `Carried`):
   *
   * - **Geladenes Gerät**: Es bleibt hängen, wo es hängt, und **nur der
   *   Belag** wird getauscht (`FoodKit.topping`). Es gibt genau eine Pfanne in
   *   dieser Küche; sie hier wegzuwerfen und neu zu bauen hieße, sie zu
   *   verlieren.
   * - **Gebautes Gericht**: Ein neues Netz an dieselbe Stelle, das alte weg.
   *   Ein Burger wird nicht ergänzt, sondern neu geschichtet — wer die Tomate
   *   zuletzt auflegt, will sie nicht über der Haube liegen sehen
   *   (`kitchenRecipes.layered`).
   */
  private restyle(thing: Carried, next: Dish): void {
    thing.dish = next;
    if (thing.loose) {
      if (thing.topping) {
        thing.topping.removeFromParent();
        thing.topping = null;
      }
      const top = this.food.topping(next, PAN_RIM);
      if (top) thing.object.add(top);
      thing.topping = top;
      return;
    }
    const old = thing.object;
    const parent = old.parent;
    // `view` gibt nur für Gerät `null`, und Gerät hat ein `loose` — hier kann
    // es also nicht leer ausgehen. Eine leere Gruppe statt eines Absturzes
    // ist trotzdem billiger als eine Küche, die beim Umbau stehenbleibt.
    const fresh = this.food.view(next) ?? new THREE.Group();
    fresh.position.copy(old.position);
    fresh.rotation.copy(old.rotation);
    old.removeFromParent();
    this.forget(old);
    parent?.add(fresh);
    this.placed.push(fresh);
    this.handleView.forget(old);
    this.markHandles(fresh, next.item);
    thing.object = fresh;
  }

  /**
   * **In die Hand**: ans Rig hängen, den Rest macht `update`.
   *
   * **Und in der Brille an die Hand, die zugegriffen hat** — samt dem Griff,
   * an dem sie es hält. Welcher das ist, entscheidet der **Abstand**: Wer den
   * Teller vorn anfasst, hält ihn vorn (`grabHandles.nearestHandle`). Gemessen
   * wird gegen die Stelle, an der das Ding **liegt**, also gegen die
   * Arbeitsplatte der Station — auch für das, was eine Ausgabe frisch aus dem
   * Nichts gibt: Es entsteht auf ihrem Deckel, und die Hand greift dorthin.
   *
   * Ohne Hand (von oben, am Schreibtisch, aus der Uhr der Spüle) bleibt der
   * Griff `null`, und dann ist es wie vorher: Das Ding hängt vor dem Bauch.
   */
  private takeInHand(thing: Carried, spot?: Station, by?: UseSource): void {
    const rig = this.rig;
    this.carried = thing;
    this.carriedHand = by?.hand ?? null;
    thing.handle = this.grabbedAt(thing, spot, by);
    thing.object.rotation.set(0, 0, 0);
    if (rig) rig.add(thing.object);
    else thing.object.removeFromParent();
  }

  /**
   * **An welchem Griff diese Hand zugefasst hat** — der nächste, oder `null`.
   *
   * `null` heißt „an der Hitbox": jede Zutat, und alles, was ohne Hand in die
   * Hand kommt. Die Rechnung selbst steht im `core` und wird dort geprüft
   * (`core/grabHandles.nearestHandle`); hier steht nur, wogegen gemessen wird.
   */
  private grabbedAt(thing: Carried, spot?: Station, by?: UseSource): GrabHandle | null {
    if (!by?.hand || !spot) return null;
    const size = _bounds.setFromObject(thing.object).getSize(_extent);
    const handles = kitchenHandles(thing.dish.item, {
      width: size.x,
      depth: size.z,
      height: size.y,
    });
    if (handles.length === 0) return null;
    _atStation.position.x = spot.deck.x;
    _atStation.position.y = spot.deck.y;
    _atStation.position.z = spot.deck.z;
    _grabAt.copy(by.at);
    return (
      nearestHandle(handles, _atStation, { x: _grabAt.x, y: _grabAt.y, z: _grabAt.z })?.handle ??
      null
    );
  }

  /**
   * **Auf eine Fläche**: in die Welt hängen, mittig auf die Arbeitsplatte —
   * und die Uhren der Station auf das setzen, was jetzt darauf steht.
   *
   * **Mit einer Ausnahme, und die ist das Spülbecken**: Dort wird nicht
   * abgelegt, sondern eingelegt. Was ins Wasser kommt, liegt **schräg** — mit
   * der unteren Kante auf dem Beckenboden und der oberen auf Randhöhe. Der
   * Winkel ist ausgerechnet und steht bei `kitchenProps.SINK_TILT`; hier steht
   * nur, dass er um die **x-Achse** geht, also nach vorn kippt: Aus der
   * Hauptansicht (55° von oben) dreht sich die Tellerfläche damit zur Kamera
   * und nicht von ihr weg, und man sieht auf einen Blick, dass da etwas im
   * Wasser steht und nicht auf einer Platte liegt.
   *
   * Warum hier und nicht am Gericht: Wie ein Ding liegt, gehört der **Stelle**,
   * an der es liegt — derselbe Teller liegt auf der Zeile flach und im Becken
   * schräg, und in der Hand wieder flach (`takeInHand` setzt zurück).
   */
  private layOn(spot: Station, thing: Carried): void {
    const world = this.world;
    spot.on = thing;
    thing.object.rotation.set(spot.kind === 'sink' ? SINK_TILT : 0, 0, 0);
    if (world) world.root.add(thing.object);
    thing.object.position.copy(spot.deck);
    this.settle(spot);
  }

  /**
   * **Die Uhren dieser Station auf ihren Inhalt setzen.**
   *
   * Gerufen wird das **nur**, wenn sich der Inhalt geändert hat — nehmen,
   * hinlegen, zusammenlegen, löschen. Die Uhren fangen dabei von vorn an, und
   * das ist ihre Regel und nicht diese Zeile: Was auf den Herd kommt, kommt
   * frisch darauf (`kitchenClock.onStove`), und was aufs Brett oder in die
   * Spüle gelegt wird, wird von vorn bearbeitet (`kitchenWork.onWork`). Je
   * Bild gerufen wäre es der Fehler, den man erst im Headset sieht: Ein Patty,
   * das nie fertig wird.
   *
   * **Und genau hier wird wieder armiert.** Wer von der Station weggeht,
   * bricht die Arbeit ab (`advanceWork`); zurückkommen allein startet sie
   * nicht. Erst dieser Aufruf tut es — also erst das erneute Ablegen.
   */
  private settle(spot: Station): void {
    const on = spot.on?.dish ?? null;
    // **Was frisch hier liegt, fährt von vorn los** — und zwar auf jeder
    // Station und nicht nur auf einem Band. Seit ein Zugband auch von einer
    // Arbeitsplatte zieht, führt jede Kachel einen Fahrtzustand
    // (`kitchenBelt.BeltTile`); einer, der von der vorigen Fuhre stehen bliebe,
    // ließe das Nächste eine halbe Kachel zu weit vorn anfangen.
    spot.belt = BELT_EMPTY;
    if (spot.kind === 'stove') {
      // Auf dem Herd steht die Pfanne, **in** ihr liegt das Patty. Liegt dort
      // etwas anderes (ein Teller, ein Brötchen), brät nichts — und genau das
      // sagt `onStove(null)`.
      spot.stove = onStove(on?.item === 'pan' ? (on.on[0] ?? null) : null);
      return;
    }
    if (spot.kind === 'board' || spot.kind === 'sink') {
      const kind: WorkKind = spot.kind === 'sink' ? 'wash' : 'chop';
      spot.work = onWork(kind, on?.item ?? null);
      return;
    }
  }

  /**
   * **Und weg damit** — aus der Szene und aus der Liste.
   *
   * Aus der Liste, weil `placed` sonst mit jedem weggeworfenen Brötchen länger
   * wird: Eine Küche, in der jemand zehn Minuten lang Zutaten holt und
   * wegwirft, hätte am Ende tausend Leichen darin, die erst beim Verlassen
   * abgeräumt werden.
   */
  private discard(thing: Carried): void {
    this.handleView.forget(thing.object);
    thing.object.removeFromParent();
    this.forget(thing.object);
  }

  /**
   * **Die Griffkreuze an ein Netz hängen** (`core/handleView.ts`).
   *
   * Sie hängen immer, sichtbar sind sie nur mit dem Häkchen — ein Kreuz, das
   * erst beim Umschalten entstünde, entstünde für die ganze Küche auf einmal,
   * und das sieht man. Gemessen wird die Hülle des Netzes: Pfanne, Topf und
   * Feuerlöscher kommen aus dem gekauften Modell, und ihre Maße stehen in
   * keiner Datei (`kitchenGrab.kitchenHandles`).
   */
  private markHandles(object: THREE.Object3D, item: KitchenItem): void {
    const size = _bounds.setFromObject(object).getSize(_extent);
    this.handleView.attach(
      object,
      kitchenHandles(item, { width: size.x, depth: size.z, height: size.y }),
    );
  }

  private forget(object: THREE.Object3D): void {
    const at = this.placed.indexOf(object);
    if (at >= 0) this.placed.splice(at, 1);
  }

  // --- der Baumodus ----------------------------------------------------------

  /**
   * **Der Knopf, der den Umbau anwirft** — derselbe große rote wie an den
   * Effektquellen (`worlds/shared/redButton.ts`, `zones/effects.ts`).
   *
   * Vorher stand hier ein violetter Kasten auf Brusthöhe, und er stand genau
   * auf der Kachel des Feuerlöscher-Hockers (x = 0, z = 9). Zwei Dinge auf
   * einer Kachel heißt: `A` erwischt immer nur eines davon (`pickUsable`
   * nimmt das Nächste), und das war der Kasten — der Löscher ließ sich nicht
   * mehr abnehmen. Der Hocker ist deshalb an die Nordzeile neben den Herd
   * gezogen (`kitchenPlan.KITCHEN_SPOTS`), und auf der frei gewordenen Kachel
   * steht jetzt der Knopf, den diese Welt für „etwas auslösen" hat.
   *
   * **Sein Schild sagt, was der Druck tut, und nicht, wo man ist**: _Küche
   * umbauen_, solange gekocht wird, _Küche nutzen_, solange umgebaut wird. Ein
   * Knopf, der in beiden Zuständen gleich heißt, ist ein Schalter, dessen
   * Stellung man erraten muss.
   *
   * Er steht neben dem Eingang, zum Gang hin: Wer hereinkommt, läuft daran
   * vorbei. Sein Schild sieht dabei die Kamera an (`ui/billboard.ts`) und
   * nicht den Gang — von oben stand es sonst quer im Bild.
   */
  private addBuildButton(): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    const button = buildRedButton({
      title: BUILD_BUTTON_LABELS.off,
      body: 'Möbel aufheben und neu hinstellen',
    });
    this.buildButton = button;
    button.group.name = 'kitchen-build-button';
    button.group.position.set(
      (KITCHEN.x + BUILD_BUTTON_TILE.x + 0.5) * TILE,
      KITCHEN_FLOOR,
      (KITCHEN.z + BUILD_BUTTON_TILE.z + 0.5) * TILE,
    );
    world.root.add(button.group);
    button.group.updateWorldMatrix(true, true);
    this.placed.push(button.group);
    // **Durch die Säule läuft niemand.** Der violette Kasten vorher hing in
    // der Luft und hatte nichts, wogegen man stoßen konnte; eine Säule, durch
    // die man hindurchgeht, sieht dagegen kaputt aus. Der Teller misst 0,6 m
    // (`shared/redButton.ts`), der Kasten misst genauso viel.
    const block = this.boxAt(
      0.6,
      1.0,
      0.6,
      button.group.position.x,
      KITCHEN_FLOOR,
      button.group.position.z,
    );
    world.root.add(block);
    block.updateWorldMatrix(true, false);
    this.placed.push(block);
    this.bodies.push(world.addSolid(block));
    world.addUsable(
      button.dome,
      {
        use: () => {
          button.press();
          return this.toggleEdit();
        },
        usePrompt: () => (this.editing ? BUILD_BUTTON_LABELS.on : BUILD_BUTTON_LABELS.off),
        // Ein Knopf will gedrückt werden — ausgeschrieben, obwohl es die
        // Vorgabe ist: An einem Knopf ist die Absicht die Hälfte dessen, was
        // er ist.
        interaction: 'press',
      },
      // Der Knopf ist so groß wie seine Kuppel, und getroffen werden darf er
      // auch (Portal-Regel: was man drücken kann, kann man auch treffen).
      { radius: BUTTON_DOME_R, shot: BUTTON_DOME_R },
    );
  }

  /**
   * **Umbau an, Umbau aus.**
   *
   * Beim Anschalten wandern die Hände frei: Wer mit einem Teller in der Hand
   * umzubauen anfängt, hätte ein Möbel **und** einen Teller darin, und beim
   * Ausschalten wüsste niemand, was davon bleibt. Der Teller geht deshalb
   * dorthin, wo er hergekommen wäre — zurück in die Welt, an die Station, an
   * der man steht, oder eben weg.
   */
  private toggleEdit(): boolean {
    const world = this.world;
    if (!world) return false;
    if (this.editing && this.lifted) this.dropPiece(true);
    this.editing = !this.editing;
    if (this.editing && this.carried) {
      this.discard(this.carried);
      this.carried = null;
    }
    // Alle Anmeldungen fallen lassen: Im Baumodus meint `A` etwas anderes,
    // und ein Möbel, das noch die Anmeldung von vorhin trägt, tut das Falsche.
    for (const furnish of this.furniture) {
      if (furnish.usable) world.removeUsable(furnish.usable);
      furnish.usable = null;
    }
    // Das Schild geht mit: Es sagt, was der **nächste** Druck tut.
    this.buildButton?.setTitle(
      this.editing ? BUILD_BUTTON_LABELS.on : BUILD_BUTTON_LABELS.off,
      this.editing ? 'Zurück ans Kochen' : 'Möbel aufheben und neu hinstellen',
    );
    world.notify(this.editing ? 'Umbau: Möbel lassen sich tragen' : 'Umbau beendet');
    this.refreshStations();
    return true;
  }

  /** Im Baumodus hört **jedes** Möbel auf `A` — und zwar auf sich selbst. */
  private refreshEditables(world: ZoneHost): void {
    for (const furnish of this.furniture) {
      const wanted = !furnish.held && this.lifted === null;
      this.setLive(world, furnish, wanted);
    }
  }

  /**
   * **Ein Möbel im Baumodus an- oder abmelden.**
   *
   * Hier ist das Möbel immer selbst gemeint — im Umbau hebt man es auf, und
   * was darauf liegt, fährt seit Neuestem mit (`liftPiece`).
   *
   * **Und es sagt jetzt auch, wo man es anfasst** (`kitchenGrab.kitchenPieceGrab`):
   * vier unsichtbare Griffe an den Kanten und dieselbe Reichweite wie alles
   * andere in dieser Küche — nur im Meter, kein Nahgreifen, kein Ferngreifen.
   * In der Brille gehört es damit der **Greif-Taste**, gedrückt beim Zufassen
   * und losgelassen beim Absetzen (`views.vr`, `press: 'hold'`) — dieselbe
   * Geste, mit der man hier einen Topf durch die Küche trägt, und keine
   * zweite daneben.
   */
  private setLive(world: ZoneHost, furnish: Furnish, wanted: boolean): void {
    const target = wanted ? furnish.model : null;
    if (target === furnish.usable) return;
    if (furnish.usable) world.removeUsable(furnish.usable);
    furnish.usable = target;
    if (!target) return;
    world.addUsable(
      furnish.model,
      {
        use: (by) => this.liftPiece(furnish, by),
        usePrompt: () =>
          whyNotLifted(furnish.piece.label, this.loadOf(furnish)) ??
          `${furnish.piece.label} aufheben`,
        // Aufheben ist greifen — ein Möbel im Umbau ist nichts anderes als
        // ein sehr großes Brötchen.
        interaction: {
          kind: 'grab',
          views: { vr: { inputs: ['grip'], press: 'hold' } },
          grab: kitchenPieceGrab(furnish.piece),
        },
      },
      { shot: 0 },
    );
  }

  /** Was auf diesem Möbel liegt, so wie der Umbau es sieht (`kitchenBuild.BuildLoad`). */
  private loadOf(furnish: Furnish): BuildLoad {
    const station = furnish.station;
    return {
      things: station?.on ? 1 : 0,
      stack: station?.stack ?? 0,
      burning: station?.stove.fire ?? false,
    };
  }

  /**
   * **Ein Möbel aufheben — mitsamt dem, was darauf steht.**
   *
   * Hier stand die Sperre, um die es im Auftrag geht: „Was darauf liegt,
   * bleibt der Grund, es **nicht** zu tun." Sie ist weg, und zwar begründet.
   * Der Auftrag sagt: „wenn zb eine Pfanne auf dem Herd steht. Dann wird
   * dieses Element so mit Pfanne darauf bewegt." Also fährt die Pfanne mit,
   * fahren die Teller der Ausgabe mit, fährt der Stapel auf dem Abtropfbrett
   * mit (`carryLoad`). Ein „erst abräumen" war nie eine Regel, sondern eine
   * fehlende Zeile.
   *
   * **Was dagegen spricht, sagt die Regel nebenan** (`kitchenBuild.whyNotLifted`),
   * und es ist genau ein Fall: ein **brennender** Herd. Wer ihn aufhöbe, hätte
   * beide Hände voll Herd und bekäme den Feuerlöscher nicht mehr zu fassen —
   * es gibt in dieser Küche keinen zweiten Weg, ein Feuer auszumachen.
   *
   * **Die Uhr fährt nicht mit, sie hält an** (`cook`). Was auf dem Herd liegt,
   * behält seine Stufe — das rohe Patty bleibt roh, das gebratene gebraten,
   * denn die Stufe steht im `Dish` und das reist mit. Nur die **Zeit** in der
   * laufenden Phase steht still, solange das Möbel in den Händen ist, und
   * läuft beim Absetzen genau dort weiter, wo sie stand (`dropPiece` ruft
   * absichtlich **kein** `settle`).
   *
   * Warum nicht weiterbraten: Der Herd brennt nach einer Weile
   * (`kitchenClock`), und ein Feuer, das vor dem Bauch ausbricht, wäre genau
   * das, was die Absage oben verhindert — nur ohne Absage. Warum nicht
   * abbrechen: Der Teller verlässt seinen Platz nicht, das Möbel bewegt sich
   * **unter** ihm; ein Vorgang, der davon auf null fiele, bestrafte das
   * Umstellen, und das ist der Handgriff, den dieser Modus anbietet.
   *
   * @param by wer zugefasst hat — in der Brille die Hand samt Stelle, und
   *           daraus wird die Kante, an der das Möbel in den Händen liegt
   *           (`kitchenBuild.holdForRim`). Von oben gibt es keine, und dann
   *           gilt wie bisher „Vorderseite nach vorn".
   */
  private liftPiece(furnish: Furnish, by?: UseSource): boolean {
    const world = this.world;
    if (!world || this.lifted) return false;
    const why = whyNotLifted(furnish.piece.label, this.loadOf(furnish));
    if (why) {
      world.notify(why);
      return true;
    }
    furnish.held = true;
    this.lifted = furnish;
    this.dropBody(furnish);
    this.carryLoad(furnish);
    // **Die Anzeigen bleiben nicht stehen.** Ein Fortschrittsbalken hängt über
    // der Ablage der Station (`kitchenGauge`, `hover`), und die ist ab jetzt
    // unterwegs — ein Balken über der leeren Kachel wäre die Auskunft, dort
    // arbeite noch etwas. Beim Absetzen bekommt die Station ohnehin einen
    // neuen Schlüssel und damit neue Balken (`dropPiece`).
    if (furnish.station) {
      this.gauges?.clear(furnish.station.key);
      furnish.station.shown = null;
    }
    if (this.rig) this.rig.add(furnish.model);
    // **Die Kante, an der man gepackt hat, bleibt einem zugewandt**
    // (`kitchenBuild.holdForRim`). Ohne Hand ist die Antwort `0` — also genau
    // das, was hier immer galt: Jedes Möbel liegt gleich in den Händen, mit
    // der Vorderseite nach vorn. Wohin es zeigt, rechnet `facePiece` gleich
    // aus der Blickrichtung; wie es in den Händen liegt, `aimHeld`.
    furnish.hold = holdForRim(this.grabbedRim(furnish, by));
    this.facePiece();
    this.aimHeld();
    const load = this.loadOf(furnish);
    world.notify(
      ridesAlong(load)
        ? `${furnish.piece.label} aufgenommen — der Inhalt fährt mit`
        : `${furnish.piece.label} aufgenommen — der Auslöser wendet es`,
    );
    this.refreshStations();
    return true;
  }

  /**
   * **An welcher Kante diese Hand zugefasst hat** — `+x`, `-x`, `+z`, `-z`
   * oder `null`.
   *
   * Dieselbe Rechnung wie beim Teller (`grabbedAt`) und dieselbe Stelle im
   * `core` (`grabHandles.nearestHandle`): der nächste Griff, gemessen in der
   * Welt. Nur ist das Ding hier ein Möbel, seine Griffe kommen aus der Regel
   * über den Katalog (`kitchenGrab.pieceHandles`), und gemessen wird gegen das
   * Modell, das noch an seinem Platz steht — gefragt wird ja **vor** dem
   * Aufheben.
   *
   * **Der halbe Maßstab des Modells stört dabei nicht**: Die Griffe stehen in
   * Metern, und hier wird in Metern gerechnet — Ort und Drehung des Modells
   * kommen aus der Welt, die Griffe kommen aus dem Katalog, und nichts davon
   * läuft durch den Szenenbaum.
   */
  private grabbedRim(furnish: Furnish, by?: UseSource): string | null {
    if (!by?.hand) return null;
    furnish.model.getWorldPosition(_at);
    furnish.model.getWorldQuaternion(_spin);
    _atStation.position.x = _at.x;
    _atStation.position.y = _at.y;
    _atStation.position.z = _at.z;
    _atStation.rotation.x = _spin.x;
    _atStation.rotation.y = _spin.y;
    _atStation.rotation.z = _spin.z;
    _atStation.rotation.w = _spin.w;
    const found = nearestHandle(pieceHandles(furnish.piece), _atStation, {
      x: by.at.x,
      y: by.at.y,
      z: by.at.z,
    });
    return found?.handle.id ?? null;
  }

  /**
   * **Was auf dem Möbel steht, hängt sich ans Möbel** — und fährt damit mit,
   * ohne dass je Bild etwas nachgerechnet würde.
   *
   * Der Teller, die Pfanne, der Stapel: Sie standen als eigene Netze in der
   * Welt auf der Ablagehöhe der Station (`layOn`, `setStack`). Beim Aufheben
   * wechseln sie in den Träger am Möbel (`Furnish.cargo`) und stehen dort auf
   * derselben Höhe über dessen Fuß — von da an macht jeder Schritt, jede
   * Drehung und jedes Absetzen sie von allein mit.
   *
   * **Ihre eigene Lage bleibt**, und das ist beim Spülbecken der Punkt: Der
   * Teller darin steht schräg (`SINK_TILT`), und er soll schräg stehen
   * bleiben, während man das Becken trägt. Gesetzt wird deshalb nur der Ort,
   * nicht die Drehung.
   */
  private carryLoad(furnish: Furnish): void {
    const station = furnish.station;
    if (!station) return;
    const lift = kitchenDeck(furnish.piece);
    for (const object of [station.on?.object, station.pile]) {
      if (!object) continue;
      this.cargoOf(furnish).add(object);
      object.position.set(0, lift, 0);
    }
  }

  /**
   * **Und wieder herunter** — zurück in die Welt, auf die neue Ablage.
   *
   * Die Gegenbewegung zu `carryLoad`, und ausdrücklich **ohne** `layOn`: Das
   * ruft `settle`, und `settle` stellt die Uhren neu. Genau das soll hier
   * nicht geschehen — der Teller hat seinen Platz nie verlassen, das Möbel ist
   * unter ihm gewandert, und ein Vorgang, der davon von vorn anfinge, wäre die
   * Strafe fürs Umstellen (siehe `liftPiece`).
   */
  private unloadLoad(furnish: Furnish): void {
    const world = this.world;
    const station = furnish.station;
    if (!world || !station) return;
    for (const object of [station.on?.object, station.pile]) {
      if (!object) continue;
      world.root.add(object);
      object.position.copy(station.deck);
    }
  }

  /** Der Träger am Möbel, der dessen halben Maßstab aufhebt — beim ersten Mal gebaut. */
  private cargoOf(furnish: Furnish): THREE.Object3D {
    if (furnish.cargo) return furnish.cargo;
    const holder = new THREE.Group();
    holder.name = 'kitchen-cargo';
    holder.scale.setScalar(1 / kitchenPieceScale(furnish.piece));
    furnish.model.add(holder);
    furnish.cargo = holder;
    return holder;
  }

  /**
   * **Eine Vierteldrehung weiter — in den Händen.**
   *
   * Wohin ein Möbel zeigt, sagt die Blickrichtung (`facePiece`), und das reicht
   * für fast alles: Man stellt es dorthin, wohin man schaut. Was damit **nicht**
   * geht, ist das Möbel, das quer zur Laufrichtung stehen soll — die Ausgabe
   * an der Westwand, deren Mulde nach Osten zeigt, während man die Reihe von
   * Norden nach Süden entlangläuft. Dafür ist dieser Griff da: Er dreht nicht
   * die Welt, sondern die Art, wie das Möbel **vor dem Bauch liegt**
   * (`Furnish.hold`) — und weil die Weltdrehung daraus gerechnet wird, bleibt
   * der Versatz erhalten, wenn man sich umdreht.
   *
   * Hier stand einmal das Gegenteil: dass die Blickrichtung nicht tauge, weil
   * der Bauplatz die Kachel **vor** der Figur ist (`kitchenBuild.tileAhead`)
   * und man zum Verlängern einer Südbahn nördlich davon stehen müsste, wo
   * schon das Band von eben steht. Das stimmt für die **Füße** und nicht für
   * den **Blick**: Von oben zielt die Maus — und am Pad der rechte Stock —
   * unabhängig davon, wohin gelaufen wird (`core/FlatControls.aimYaw`).
   *
   * Gedreht wird mit dem **Auslöser**: in der Brille der Trigger der rechten
   * Hand, von oben die linke Maustaste, `RT` am Pad und der rote Knopf auf dem
   * Glas. Er ist im Umbau frei, und zwar mit Sicherheit: Wer ein Möbel trägt,
   * trägt keinen Feuerlöscher — das Anschalten räumt die Hände (`toggleEdit`),
   * und nur ein gehaltener Löscher pustet (`kitchenSpray.sprayOn`).
   *
   * **Der Satz nennt die Seite und nicht die Himmelsrichtung**, denn die
   * ändert sich beim nächsten Schritt wieder: „nach links" bleibt „nach
   * links", auch wenn man sich zum Bauplatz umdreht. Was in der Welt daraus
   * wird, zeigt das Möbel in den Händen und, beim Band, der Hinweis am
   * Bauplatz.
   */
  private turnPiece(): boolean {
    const world = this.world;
    const furnish = this.lifted;
    if (!world || !furnish) return false;
    furnish.hold = ((furnish.hold + 1) % 4) as Turn;
    this.facePiece();
    this.aimHeld();
    world.notify(`${furnish.piece.label}: Vorderseite ${HOLD_LABELS[furnish.hold]}`);
    return true;
  }

  /**
   * **Der Auslöser im Umbau** — eine Flanke, drei Ansichten.
   *
   * Dieselben Geber wie beim Feuerlöscher nebenan (`spray`) und aus demselben
   * Grund: In der Brille fragt man den Controller, am Schirm das Gestell
   * (`PlayerRig.trigger`, gesetzt von `core/FlatControls.applyTopDownButtons`).
   * Wer nichts trägt, drückt ins Leere — und das ist richtig so, ein Auslöser
   * ohne Möbel in der Hand hat in dieser Küche nichts zu tun.
   */
  private buildTurn(ctx: WorldContext): void {
    const down = ctx.renderer.xr.isPresenting
      ? (ctx.input.get('right')?.trigger.pressed ?? false)
      : ctx.rig.trigger > 0.5;
    const pressed = down && !this.turnWas;
    this.turnWas = down;
    if (pressed && this.editing && this.lifted) this.turnPiece();
  }

  /**
   * **Und wieder absetzen** — auf der Kachel vor den Füßen, wenn dort Platz
   * ist.
   *
   * `home` setzt es zurück auf seine alte Kachel; das ist der Weg für
   * `B`/`Y`, das mitten im Umbau aufräumt. Die Kachel, auf der es stand, ist
   * dabei immer frei: Sie wurde beim Aufheben freigegeben, und niemand kann
   * sie in der Zwischenzeit belegt haben, weil man nur **ein** Möbel trägt.
   */
  private dropPiece(home = false): boolean {
    const world = this.world;
    const furnish = this.lifted;
    if (!world || !furnish) return false;
    // **Nach Hause heißt auch: wie es stand.** Die alte Kachel ist frei, die
    // alte Drehung aber nicht unbedingt harmlos — wer eine Ausgabetheke quer
    // gedreht dorthin zurückzwänge, wo sie längs stand, schöbe sie in das Möbel
    // daneben. Und `home` fragt nicht, ob dort Platz ist (dafür ist es da).
    if (home) {
      furnish.turn = furnish.spot.turn ?? 0;
      furnish.size = footprint(furnish.piece, furnish.turn);
    }
    const want = home ? { x: furnish.spot.x, z: furnish.spot.z } : (this.ghostAt ?? null);
    if (!want) return false;
    const target: BuildSpot = { x: want.x, z: want.z, w: furnish.size.w, d: furnish.size.d };
    const why = whyNotBuilt(target, this.taken(furnish), { w: KITCHEN.w, d: KITCHEN.d });
    if (why && !home) {
      world.notify(why);
      return true;
    }
    furnish.x = target.x;
    furnish.z = target.z;
    furnish.held = false;
    this.lifted = null;
    world.root.add(furnish.model);
    const foot = this.standAt(furnish);
    this.aimIcon(furnish);
    this.addBody(furnish);
    const station = furnish.station;
    if (station) {
      station.deck.set(
        furnish.model.position.x,
        foot + kitchenDeck(furnish.piece),
        furnish.model.position.z,
      );
      // **Und was mitgefahren ist, steigt hier wieder ab** (`unloadLoad`): der
      // Teller, die Pfanne, der Stapel. Sie hingen die Fahrt über am Möbel und
      // stehen jetzt wieder als eigene Netze in der Welt — auf der Ablage, die
      // gerade neu ausgerechnet wurde, und ohne dass eine Uhr davon etwas
      // merkt.
      this.unloadLoad(furnish);
      // Der Schlüssel trägt die Kachel — ein Balken unter dem alten Schlüssel
      // hinge nach dem Umbau über der Stelle, an der nichts mehr steht.
      this.gauges?.clear(station.key);
      station.key = `${furnish.piece.name}@${furnish.x},${furnish.z}`;
      station.shown = null;
    }
    // **Beim Band steht die Laufrichtung dabei.** Es schiebt dorthin
    // (`kitchenBelt.beltStep`), und wer eine Bahn baut, will das bestätigt
    // bekommen, ohne erst auf die Pfeile zu schauen.
    world.notify(
      beltKind(furnish.piece.name)
        ? `${furnish.piece.label} abgesetzt — schiebt nach ${TURN_LABELS[furnish.turn]}`
        : `${furnish.piece.label} abgesetzt`,
    );
    this.refreshStations();
    return true;
  }

  /** Welche Flächen gerade belegt sind — ohne die des getragenen Möbels. */
  private taken(except: Furnish): BuildSpot[] {
    const used: BuildSpot[] = [];
    for (const furnish of this.furniture) {
      if (furnish === except || furnish.held) continue;
      used.push({ x: furnish.x, z: furnish.z, w: furnish.size.w, d: furnish.size.d });
    }
    return used;
  }

  /**
   * **Der Bauplatz vor den Füßen** — ein Umriss, der grün oder rot ist, und
   * ein `A`, das dort absetzt.
   *
   * Er ist selbst ein benutzbares Ding, und das ist kein Trick, sondern die
   * einzige ehrliche Antwort auf „wohin drücke ich?": Ein Möbel in der Hand
   * hat kein Ziel, auf das man zeigen könnte, also bekommt es eines. Nebenbei
   * leuchtet damit auch hier der gelbe Saum um genau das, was `A` meint.
   */
  private showGhost(): void {
    const world = this.world;
    const furnish = this.lifted;
    if (!world) return;
    if (!furnish) {
      if (this.ghost && this.ghostLive) {
        world.removeUsable(this.ghost);
        this.ghost.visible = false;
      }
      this.ghostLive = false;
      this.ghostAt = null;
      return;
    }
    const tile = tileAhead(
      _feet,
      _aim,
      { x: KITCHEN.x * TILE, z: KITCHEN.z * TILE },
      TILE,
      BUILD_AHEAD,
    );
    const target: BuildSpot = { x: tile.x, z: tile.z, w: furnish.size.w, d: furnish.size.d };
    this.ghostAt = target;
    const free = buildFree(target, this.taken(furnish), { w: KITCHEN.w, d: KITCHEN.d });

    let ghost = this.ghost;
    if (!ghost) {
      const shape = new THREE.BoxGeometry(1, 1, 1);
      this.shapes.push(shape);
      ghost = new THREE.Mesh(
        shape,
        this.own(
          new THREE.MeshBasicMaterial({
            color: GHOST_FREE,
            transparent: true,
            opacity: GHOST_ALPHA,
            depthWrite: false,
          }),
        ),
      );
      ghost.name = 'kitchen-build-ghost';
      world.root.add(ghost);
      this.placed.push(ghost);
      this.ghost = ghost;
    }
    if (free !== this.ghostFree) {
      this.ghostFree = free;
      (ghost.material as THREE.MeshBasicMaterial).color.setHex(free ? GHOST_FREE : GHOST_BLOCKED);
    }
    ghost.visible = true;
    ghost.scale.set(target.w * TILE, GHOST_HEIGHT, target.d * TILE);
    ghost.position.set(
      (KITCHEN.x + target.x + target.w / 2) * TILE,
      KITCHEN_FLOOR + GHOST_HEIGHT / 2,
      (KITCHEN.z + target.z + target.d / 2) * TILE,
    );
    ghost.updateWorldMatrix(true, false);
    if (this.ghostLive) return;
    this.ghostLive = true;
    // **Einmal angemeldet, dann wandert er nur noch.** Der Hinweis fragt bei
    // jedem Bild neu (`usePrompt` ist eine Funktion), also stimmt er auch
    // dann, wenn der Umriss inzwischen woanders steht — genau wie bei jeder
    // Station nebenan.
    world.addUsable(
      ghost,
      {
        use: () => this.dropPiece(),
        usePrompt: () => {
          const at = this.ghostAt;
          if (!at) return '';
          const why = whyNotBuilt(at, this.taken(furnish), { w: KITCHEN.w, d: KITCHEN.d });
          if (why) return why;
          // Die Richtung gehört in den Hinweis, solange sie eine Wirkung hat:
          // Beim Band ist sie der halbe Handgriff, und sie ändert sich, während
          // man davorsteht und sich dreht (`facePiece`).
          return beltKind(furnish.piece.name)
            ? `${furnish.piece.label} nach ${TURN_LABELS[furnish.turn]} absetzen`
            : `${furnish.piece.label} hier absetzen`;
        },
        // **Absetzen ist ein Druck und kein Griff**: Was man greifen will,
        // liegt schon in der Hand — hier wird es nur noch hingestellt.
        //
        // **In der Brille ist dieser Druck trotzdem die Greif-Taste**, und
        // zwar dieselbe, mit der das Möbel eben in die Hände kam: Abgelegt
        // wird beim **Loslassen** (nach einem Halten) oder beim **zweiten
        // Druck** (nach einem Tippen) — `core/handUse.gripPressDrops`. Genau
        // die Regel gilt seit Kurzem für jede Fläche dieser Küche
        // (`kitchenCarry.kitchenInteractionSpec`), und ein Bauplatz, der
        // stattdessen auf Berührung oder Trigger hörte, setzte das Möbel ab,
        // sobald man beim Umsehen einmal darüberfährt.
        interaction: {
          kind: 'press',
          views: { vr: { inputs: ['grip'], press: 'hold' } },
          grab: KITCHEN_STATION_GRAB,
        },
      },
      { shot: 0 },
    );
  }

  // --- die Tafel an der Ausgabetheke -----------------------------------------

  /**
   * **„Hamburger serviert"** — kurz, an der Theke, und dann wieder weg.
   *
   * Dieselbe Tafel wie an den Schaustücken (`ui/TextPlane.ts`), und sie sieht
   * die Kamera an (`face`, `ui/billboard.ts`): Von oben liegt sie im Bild, aus
   * den Augen steht sie darin, und daneben in der Brille ebenso. Eine Meldung
   * am Handgelenk gibt es auch, aber die sieht man nur, wenn man hinschaut —
   * und wer gerade etwas über eine Theke schiebt, schaut auf die Theke.
   *
   * **Eine für die ganze Zone**, mit neuem Text statt einer zweiten Tafel: Wer
   * drei Burger hintereinander ausgibt, soll nicht drei Schilder übereinander
   * stehen haben, und eine Leinwand je Gericht wäre eine Textur je Gericht.
   *
   * **Und sie steht vor den Gegenständen, nicht zwischen ihnen** (`front`,
   * `ui/TextPlane.ts`). Auf der Theke stehen Teller und Brötchen, einen Meter
   * darüber hängen die Wärmeschirme — von schräg oben schnitt ein Brötchen quer
   * durch das Wort, und auf dem Handy war von „Deluxe serviert" noch
   * „Deluxe s…" zu lesen. Das ist derselbe Griff, mit dem der
   * Fortschrittsbalken vor dem Patty liegt statt darin (`kitchenGauge.skin`,
   * `front`), und er ist hier auch derselbe Handel: Ohne Tiefenprüfung wäre die
   * Tafel durch jede Wand zu sehen — nur steht sie eben vier Sekunden lang
   * (`TICKET_SECONDS`) an genau der Theke, an der gerade jemand etwas
   * abgegeben hat, und wer das war, steht davor.
   *
   * **Die Namensschilder im Schauraum bekommen ihn nicht** (`addLabel`), und
   * das ist nachgesehen und nicht vergessen: Dort steht jedes Möbel frei, die
   * drei Reihen liegen drei Meter auseinander (`kitchenPlan`, `show`), und
   * nichts steht darauf — bei 55° Blickwinkel von oben müsste ein Nachbar über
   * vier Meter hoch sein, um ein Schild anzuschneiden. Fünfzehn Tafeln, die
   * dafür dauerhaft durch jede Wand leuchten, wären der schlechtere Tausch.
   */
  private showTicket(spot: Station, label: string): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    let plate = this.ticket;
    if (!plate) {
      plate = new TextPlane({
        width: 1.3,
        height: 0.36,
        title: `${label} serviert`,
        accent: 0x7de88a,
        align: 'center',
        face: true,
        front: true,
      });
      this.ticket = plate;
      this.labels.push(plate);
      this.placed.push(plate);
    } else {
      plate.setText(`${label} serviert`);
    }
    plate.position.set(spot.deck.x, spot.deck.y + TICKET_LIFT, spot.deck.z);
    plate.visible = true;
    world.root.add(plate);
    this.ticketLeft = TICKET_SECONDS;
  }

  /** Nach ein paar Sekunden wieder ab — die Tafel selbst bleibt liegen. */
  private fadeTicket(dt: number): void {
    if (this.ticketLeft <= 0) return;
    this.ticketLeft -= dt;
    if (this.ticketLeft > 0) return;
    this.hideTicket();
  }

  private hideTicket(): void {
    this.ticketLeft = 0;
    if (!this.ticket) return;
    this.ticket.visible = false;
    this.ticket.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}

/**
 * **Die Station, so viel wie die Regel davon braucht** (`kitchenCarry.ts`).
 *
 * Fünf Felder, und keines davon rechnet die Zone selbst aus: Ob der Herd
 * brennt, weiß seine Uhr (`StoveState.fire`), was darauf liegt, ist das
 * `Dish` des getragenen Dings, und wie hoch der Stapel an der Rückgabe oder auf
 * dem Abtropfbrett ist, steht als Zahl daneben. Die Regel bekommt damit genau
 * das, was sie lesen darf — und nicht die halbe Zone.
 */
function facts(spot: Station): StationFacts {
  return {
    kind: spot.kind,
    on: spot.on?.dish ?? null,
    gives: spot.gives,
    fire: spot.stove.fire,
    stack: spot.stack,
  };
}

/**
 * **Ob an dieser Station gestapelt statt abgelegt wird.**
 *
 * Zwei Arten tun das: die **Geschirrrückgabe** (dreckige Teller) und das
 * **Abtropfbrett** (saubere). Sie führen keinen `Dish`, sondern eine Zahl
 * (`Station.stack`) und ein Netz dazu (`Station.pile`), und deshalb sehen an
 * vier Stellen die Handgriffe anders aus: nehmen, hinlegen, zielen, zeichnen.
 * Eine Zeile statt viermal derselben Oder-Bedingung — die fünfte Stelle wäre
 * die, an der eine davon fehlt.
 */
function stacks(kind: StationKind): boolean {
  return kind === 'return' || kind === 'drain';
}
