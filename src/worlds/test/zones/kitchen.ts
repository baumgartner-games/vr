import * as THREE from 'three';
import {
  KITCHEN_SCALE,
  kitchenDeck,
  kitchenPiece,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { canLoadModels, CHEF_CARRY } from '../../../core/chefFit';
import { USE_REACH } from '../../../core/usable';
import { TILE } from '../../nav/navTile';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import type { PlayerAvatar } from '../../../core/PlayerAvatar';
import type { WorldContext } from '../../../core/types';
import { TextPlane } from '../../../ui/TextPlane';
import { KITCHEN } from '../layout';
import {
  COLD_STOVE,
  IDLE_WORK,
  ITEM_LABELS,
  advanceStove,
  advanceWork,
  dish,
  dishLabel,
  douse,
  kitchenDeed,
  kitchenPrompt,
  layered,
  meansContent,
  onStove,
  onWork,
  stovePhase,
  stoveProgress,
  workProgress,
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
import { DIRTY_STACK_MAX, FoodKit } from './kitchenProps';
import { GAUGE_LIFT, KitchenGauges, WARN_LIFT } from './kitchenGauge';
import { IconOven } from './kitchenIcon';
import {
  BUILD_BUTTON_TILE,
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  footprint,
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
import { BUILD_AHEAD, buildFree, tileAhead, whyNotBuilt, type BuildSpot } from './kitchenBuild';
import { BeltKit, BELT_EMPTY, advanceBelt, beltStep, type BeltState } from './kitchenBelt';
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
 * (`core/kitchenFit.ts`, `core/kitchenModel.ts`). Das vierzehnte —  das
 * **Förderband** — steckt in keiner Datei und wird gebaut
 * (`KitchenPiece.built`, `kitchenBelt.ts`).
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
  readonly turn: Turn;
  /** Die Grundfläche in Kacheln, schon gedreht (`kitchenPlan.footprint`). */
  readonly size: { w: number; d: number };
  readonly model: THREE.Object3D;
  /** Der unsichtbare Kasten darüber und sein Körper — beide können fehlen. */
  box: THREE.Mesh | null;
  body: PhysicsBody | null;
  /** Die Station darauf, wenn es eine ist. */
  station: Station | null;
  /** Ob es gerade getragen wird — dann belegt es keine Kachel. */
  held: boolean;
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
  private rig: THREE.Object3D | null = null;
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
  /** Was die Figur gerade trägt. */
  private carried: Carried | null = null;
  /** Die Tafel an der Ausgabetheke und wie lange sie noch steht. */
  private ticket: TextPlane | null = null;
  private ticketLeft = 0;

  // --- der Feuerlöscher ------------------------------------------------------
  /** Ob er gerade pustet, und ob die Auslöser im vorigen Bild schon lagen. */
  private spraying = false;
  private triggerWas = false;
  private useWas = false;

  // --- der Baumodus ----------------------------------------------------------
  /** Ob gerade umgebaut wird (`kitchenBuild.ts`). */
  private editing = false;
  /** Der rote Knopf, der ihn umlegt (`addBuildButton`). */
  private buildButton: RedButton | null = null;
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
    this.gauges = new KitchenGauges(world.root);
    this.belts = new BeltKit();
    this.jet = new SprayJet(world.root);
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
    this.cook(dt);
    this.spray(dt, ctx);
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
    _feet.set(ctx.rig.position.x, ctx.rig.getFloorY(), ctx.rig.position.z);
    _rigAhead.set(0, 0, -1).applyQuaternion(ctx.rig.getWorldQuaternion(_spin));
    ctx.rig.getHeadForward(_headAhead);
    const wanted = ctx.topDown ? _rigAhead : _headAhead;
    const flat = Math.hypot(wanted.x, wanted.z);
    if (flat > 1e-4) _aim.set(wanted.x / flat, 0, wanted.z / flat);
    else _aim.copy(_rigAhead).setY(0);
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
          this.beltFrame(spot, dt);
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
   */
  private workFrame(spot: Station, dt: number): void {
    const near = Math.hypot(_feet.x - spot.deck.x, _feet.z - spot.deck.z) <= WORK_REACH;
    const tick = advanceWork(spot.work, dt, near);
    if (tick.state === spot.work) return;
    spot.work = tick.state;
    if (!tick.done) return;
    const on = spot.on;
    // Was gearbeitet wird, trägt nichts (`kitchenRecipes.CHOPS`) — aus dem
    // Salatkopf wird geschnittener Salat, aus dem dreckigen Teller ein sauberer.
    if (on) this.restyle(on, dish(tick.done));
    this.world?.notify(`${ITEM_LABELS[tick.done]} fertig`);
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
   * **Ein Bild auf dem Förderband** — was daraufliegt, wandert weiter.
   *
   * Weitergereicht wird an die Station auf der **nächsten Kachel in
   * Laufrichtung** (`kitchenBelt.beltStep`). Ist dort nichts oder steht dort
   * schon etwas, bleibt das Ding liegen und versucht es im nächsten Bild
   * wieder — ein Band, das seine Fracht ins Nichts schiebt, wäre ein Band, an
   * dem Teller verschwinden.
   */
  private beltFrame(spot: Station, dt: number): void {
    const tick = advanceBelt(spot.belt, dt, spot.on !== null);
    spot.belt = tick.state;
    if (!tick.handOver) return;
    const load = spot.on;
    if (!load) return;
    const step = beltStep(spot.home.turn);
    const next = this.stationAt(spot.home.x + step.dx, spot.home.z + step.dz);
    if (!next || next.on || next.kind === 'bin' || next.kind === 'serve') return;
    spot.on = null;
    this.settle(spot);
    this.layOn(next, load);
    this.refreshStations();
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
    const held = this.carried?.object ?? this.lifted?.model ?? null;
    if (!held) {
      ctx.avatar.carry = null;
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      // In der Brille tragen es die echten Hände nicht — dort hängt es eine
      // Handbreit vor der Brust, mittig und ruhig.
      held.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
      ctx.avatar.carry = null;
      return;
    }
    // **Im Raum des Rigs, und das genügt**: Von oben dreht sich das Rig selbst
    // in die Laufrichtung (`core/FlatControls.walkNorthUp`), und aus den Augen
    // dreht es die Maus (`FlatControls.look`). Wer hier zusätzlich um die
    // Blickrichtung der Figur drehte, drehte um null — dieselbe Rechnung wie
    // beim Werkzeug in der Bildschirmhand (`worlds/portal/screenHand.ts`).
    held.position.set(CHEF_CARRY.x, CHEF_CARRY.y + ctx.avatar.bob, CHEF_CARRY.z);
    ctx.avatar.carry = CARRY_POINT;
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
    const loose = [this.carried, ...this.stations.map((spot) => spot.on)];
    this.carried = null;
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
    // Bilder an den Ausgaben, die Bänder und den Nebel.
    this.food.dispose();
    this.gauges?.dispose();
    this.gauges = null;
    this.oven?.dispose();
    this.oven = null;
    this.belts?.dispose();
    this.belts = null;
    this.jet?.dispose();
    this.jet = null;
    this.buildButton?.dispose();
    this.buildButton = null;
    this.stations.length = 0;
    this.furniture.length = 0;
    this.bodies.length = 0;
    this.carried = null;
    this.lifted = null;
    this.ghost = null;
    this.ghostLive = false;
    this.editing = false;
    this.spraying = false;
    this.ticket = null;
    this.ticketLeft = 0;
    this.hidden = null;
    // Die Hände der Figur wieder freigeben — sie überlebt diese Zone.
    if (this.avatar) this.avatar.carry = null;
    this.avatar = null;
    this.world = null;
    this.rig = null;
  }

  // --- aufstellen -----------------------------------------------------------

  /**
   * **Ein gebautes Stück** — alles, was in keiner Datei steht
   * (`KitchenPiece.built`).
   *
   * Zurzeit ist das genau eines, das Förderband. Der Zweig bleibt trotzdem
   * allgemein: Ein Katalog, in dem ein gebautes Möbel ein Sonderfall im
   * Aufstellen wäre, bekäme beim zweiten einen zweiten Sonderfall.
   */
  private buildPiece(piece: KitchenPiece): THREE.Object3D | null {
    if (piece.name === 'belt') return this.belts?.piece() ?? null;
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
      size,
      model,
      box: null,
      body: null,
      station: null,
      held: false,
      usable: null,
    };
    const foot = this.standAt(furnish);
    if (!spot.show) this.furniture.push(furnish);

    if (spot.show) {
      this.addBody(furnish);
      this.addLabel(world, piece, size, model.position.x, model.position.z);
      return;
    }
    this.addBody(furnish);
    this.addIcon(model, piece, spot);
    this.addStation(furnish, foot, takeUtensil);
  }

  /**
   * **Ein Möbel auf seine Kachel stellen** — die eine Rechnung von Kachel zu
   * Weltmaß, und sie wird zweimal gebraucht: beim Aufbau und bei jedem Umbau.
   *
   * @returns die Höhe, auf der es steht — die Ablage rechnet darauf weiter
   */
  private standAt(furnish: Furnish): number {
    const { piece, spot, model, size, turn } = furnish;
    const angle = (turn * Math.PI) / 2;
    const [ax, az] = piece.align ?? [0, 0];
    const centreX = (KITCHEN.x + furnish.x + size.w / 2) * TILE;
    const centreZ = (KITCHEN.z + furnish.z + size.d / 2) * TILE;
    const foot = KITCHEN_FLOOR + (spot.lift ?? 0);
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
    // Luft zu laufen.
    const height = spot.show ? piece.height : Math.max(piece.height, BLOCK_HEIGHT);
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
  private addIcon(model: THREE.Object3D, piece: KitchenPiece, spot: Spot): void {
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
    holder.scale.setScalar(piece.built ? 1 : 1 / KITCHEN_SCALE);
    // **Zweimal dasselbe Bild, oben und vorn** — weil man aus zwei Richtungen
    // darauf schaut. Von oben (`core/TopDownCamera.ts`, die Hauptansicht am
    // Schirm) sieht man von einem Möbel fast nur den Deckel; aus den Augen und
    // in der Brille wiederum ist ein liegendes Schild ein Strich. Beide Tafeln
    // bringen ihre **weiße Grundfläche** mit, die das aufgedruckte Symbol des
    // gekauften Möbels überdeckt (`kitchenIcon.counterSign`) — sonst lägen
    // zwei Burger übereinander, der gedruckte und der gebackene.
    holder.add(oven.counterSign(texture, { piece, where: 'top' }));
    holder.add(oven.counterSign(texture, { piece, where: 'front' }));
    model.add(holder);
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
    this.layOn(station, {
      dish: dish(piece.holds),
      object: holder,
      loose,
      topping: null,
      home: station,
    });
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
      world.addUsable(
        target,
        {
          use: () => this.act(spot),
          usePrompt: () => kitchenPrompt(kitchenDeed(this.held(), facts(spot)), spot.label),
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
   * An der **Rückgabe** liegt kein einzelnes Ding, sondern ein Stapel; dann
   * leuchtet der. Und wo eine Ausgabe etwas Frisches aus dem Nichts gibt
   * (`box` mit leerem Deckel), gibt es nichts zum Leuchten außer ihr selbst.
   */
  private aimAt(spot: Station, deed: KitchenDeed): THREE.Object3D {
    if (!meansContent(deed)) return spot.object;
    if (spot.kind === 'return') return spot.pile ?? spot.object;
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
  private act(spot: Station): boolean {
    const world = this.world;
    if (!world) return false;
    const deed = kitchenDeed(this.held(), facts(spot));
    switch (deed.do) {
      case 'take': {
        const thing = this.pickUp(spot, deed.dish);
        if (!thing) return false;
        this.takeInHand(thing);
        world.notify(`${dishLabel(deed.dish)} in der Hand`);
        break;
      }
      case 'place':
      case 'work': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        if (spot.kind === 'return') {
          // An der Rückgabe wird nicht abgelegt, sondern **gestapelt**: Der
          // Teller geht im Stapel auf, sein Netz wird nicht gebraucht.
          this.discard(thing);
          this.setStack(spot, spot.stack + 1);
          world.notify(`Dreckiger Teller abgestellt (${spot.stack})`);
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
    if (spot.kind === 'return') {
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
    return { dish: want, object, loose: null, topping: null, home: null };
  }

  /**
   * **Der Stapel an der Rückgabe** — eine Zahl und ein Netz dazu.
   *
   * Das Netz wird nur dann neu gebaut, wenn sich die Zahl geändert hat: Ein
   * Stapel, der jedes Bild neu entsteht, wäre sechs Teller je Bild
   * (`kitchenProps.FoodKit.dirtyStack`).
   */
  private setStack(spot: Station, count: number): void {
    const want = Math.max(0, Math.min(DIRTY_STACK_MAX, count));
    if (want === spot.stack && (want === 0) === (spot.pile === null)) return;
    spot.stack = want;
    if (spot.pile) {
      spot.pile.removeFromParent();
      this.forget(spot.pile);
      spot.pile = null;
    }
    if (want <= 0) return;
    const pile = this.food.dirtyStack(want);
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
    thing.object = fresh;
  }

  /** In die Hand: ans Rig hängen, den Rest macht `update`. */
  private takeInHand(thing: Carried): void {
    const rig = this.rig;
    this.carried = thing;
    thing.object.rotation.set(0, 0, 0);
    if (rig) rig.add(thing.object);
    else thing.object.removeFromParent();
  }

  /**
   * **Auf eine Fläche**: in die Welt hängen, mittig auf die Arbeitsplatte —
   * und die Uhren der Station auf das setzen, was jetzt darauf steht.
   */
  private layOn(spot: Station, thing: Carried): void {
    const world = this.world;
    spot.on = thing;
    thing.object.rotation.set(0, 0, 0);
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
    if (spot.kind === 'belt') spot.belt = BELT_EMPTY;
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
    thing.object.removeFromParent();
    this.forget(thing.object);
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
   * Er steht neben dem Eingang, mit dem Schild nach Süden zum Gang: Wer
   * hereinkommt, läuft daran vorbei und liest es von vorn.
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
   * was darauf liegt, ist gerade der Grund, es **nicht** zu tun
   * (`liftPiece`).
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
        use: () => this.liftPiece(furnish),
        usePrompt: () => `${furnish.piece.label} aufheben`,
      },
      { shot: 0 },
    );
  }

  /**
   * **Ein Möbel aufheben** — und es lässt seine Sperre nicht stehen.
   *
   * Was darauf liegt, bleibt der Grund, es **nicht** zu tun: Ein Herd, den man
   * mit der Pfanne darauf davonträgt, ist ein Herd, dessen Pfanne beim
   * Absetzen irgendwo in der Luft hängt. Erst abräumen, dann tragen — ein Satz
   * mehr und ein Fehler weniger.
   */
  private liftPiece(furnish: Furnish): boolean {
    const world = this.world;
    if (!world || this.lifted) return false;
    if (furnish.station?.on || (furnish.station?.stack ?? 0) > 0) {
      world.notify(`${furnish.piece.label} ist nicht leer — erst abräumen`);
      return true;
    }
    furnish.held = true;
    this.lifted = furnish;
    this.dropBody(furnish);
    if (this.rig) this.rig.add(furnish.model);
    furnish.model.rotation.set(0, 0, 0);
    world.notify(`${furnish.piece.label} aufgenommen`);
    this.refreshStations();
    return true;
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
    this.addBody(furnish);
    const station = furnish.station;
    if (station) {
      station.deck.set(
        furnish.model.position.x,
        foot + kitchenDeck(furnish.piece),
        furnish.model.position.z,
      );
      // Der Schlüssel trägt die Kachel — ein Balken unter dem alten Schlüssel
      // hinge nach dem Umbau über der Stelle, an der nichts mehr steht.
      this.gauges?.clear(station.key);
      station.key = `${furnish.piece.name}@${furnish.x},${furnish.z}`;
      station.shown = null;
    }
    world.notify(`${furnish.piece.label} abgesetzt`);
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
          return why ?? `${furnish.piece.label} hier absetzen`;
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
 * `Dish` des getragenen Dings, und wie hoch der Stapel an der Rückgabe ist,
 * steht als Zahl daneben. Die Regel bekommt damit genau das, was sie lesen
 * darf — und nicht die halbe Zone.
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
