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
  EMPTY_BOARD,
  ITEM_LABELS,
  advanceChop,
  advanceStove,
  chopProgress,
  dish,
  dishLabel,
  douse,
  kitchenDeed,
  kitchenPrompt,
  layered,
  onBoard,
  onStove,
  stovePhase,
  stoveProgress,
  type ChopState,
  type Dish,
  type KitchenItem,
  type Station as StationFacts,
  type StationKind,
  type StovePhase,
  type StoveState,
} from './kitchenCarry';
import { FoodKit } from './kitchenProps';
import { GAUGE_LIFT, KitchenGauges, WARN_LIFT } from './kitchenGauge';
import { IconOven } from './kitchenIcon';
import {
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  footprint,
  stationKind,
  type Spot,
  type Turn,
} from './kitchenPlan';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Küche** — Norden, hinter dem Podest, und die einzige Zone dieser Welt,
 * die aus einem **gekauften Modell** besteht.
 *
 * Die Möbel sind „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S,
 * CC-BY-4.0 (`public/models/CREDITS.md`), aufbereitet von
 * `tools/kitchen-model.mjs` in dreizehn einzeln setzbare Stücke
 * (`core/kitchenFit.ts`, `core/kitchenModel.ts`).
 *
 * Die Zone besteht aus **zwei Hälften**, und beide haben eine Aufgabe:
 *
 * - **Die Küche selbst** (Westen): drei Bänder, wie in jeder Küche dieses
 *   Spiels — die Geräte an der Wand, eine Insel zum Schnippeln, vorn die
 *   Ausgabe. Hier wird gekocht: Zutaten kommen aus den Ausgaben an der
 *   Westwand, das Patty in die Pfanne, Salat und Tomate auf das Brett, und
 *   alles zusammen auf ein Brötchen.
 * - **Der Schauraum** (Osten): **jedes** der dreizehn Möbel noch einmal, frei
 *   stehend und beschriftet. In einer Zeile aus acht Schränken sieht man ein
 *   einzelnes Möbel nicht; wer wissen will, wie die Spüle aussieht, will sie
 *   allein sehen und nicht zwischen zwei Herden. Der Katalog ist damit nicht
 *   mehr eine Liste in einer Datei, sondern ein Rundgang.
 *
 * **Wo was steht, steht nebenan** (`kitchenPlan.ts`): Der Grundriss wird
 * gestempelt, lange bevor ein Modell geladen ist, und ein Test rechnet ihn
 * nach — beides braucht die Zahlen und nicht diese Klasse. Von hier aus wird
 * alles davon weitergereicht (`export *`), damit `testPlan.ts` und die Welt
 * ihre Importe behalten.
 *
 * **Diese Datei ist der Rest**: Netze umhängen, Körper bauen, Uhren laufen
 * lassen, Anzeigen setzen. Die **Regeln** stehen in drei Dateien daneben und
 * werden hier nicht noch einmal gerechnet — was `A` bewirkt, sagt
 * `kitchenCarry.kitchenDeed`; woraus ein Burger besteht, `kitchenRecipes.ts`;
 * wie lange etwas dauert, `kitchenClock.ts`. Die Zone **setzt nur um**, was
 * dort herauskommt. Jede Zeile, die hier selbst nachrechnet, ob ein Patty
 * gebraten genug ist, wäre die zweite Wahrheit, die beim nächsten Umbau
 * auseinanderläuft.
 *
 * **Und die Kochfigur passt dazu.** Sie ist 1,60 m hoch und ihre Augen liegen
 * bei 0,91 m (`core/chefFit.ts`) — genau deshalb wurde sie so skaliert und
 * nicht auf Menschengröße: neben einem Tresen von einem Meter soll ein Koch
 * stehen und kein Riese im Puppenhaus. Hier steht die Probe darauf.
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
 * **Wie weit die Figur vom Brett weg sein darf**, damit noch geschnitten
 * wird, in Metern.
 *
 * Gemessen von der **Mitte des Möbels** zur Figur, waagerecht. `USE_REACH`
 * ist die Reichweite, mit der `A` überhaupt etwas erwischt (`core/usable.ts`)
 * — wer schneiden lassen will, muss also ungefähr so nah stehen, wie er zum
 * Auflegen stand.
 *
 * **Warum nicht `Station.live`.** Es liegt nahe, dafür den Zustand zu nehmen,
 * den `refreshStations` ohnehin führt — aber der sagt etwas anderes: Er heißt
 * „diese Station hätte gerade etwas zu tun" und nicht „jemand steht davor".
 * Ein Brett mit einem Salatkopf darauf ist auch dann angemeldet, wenn die
 * Figur am anderen Ende der Küche steht; das Schneiden liefe weiter, und
 * genau das soll es nicht (Spezifikation §4). Welches benutzbare Ding gerade
 * **gemeint** ist, rechnet `pickUsable` aus und behält es für sich — also
 * rechnet die Zone den Abstand selbst, mit derselben Zahl.
 */
const CHOP_REACH = USE_REACH;

/**
 * **Wie lange die Tafel an der Ausgabetheke stehen bleibt**, in Sekunden, und
 * wie hoch über der Theke sie schwebt, in Metern.
 *
 * Vier Sekunden sind lang genug, um sie im Vorbeigehen zu lesen, und kurz
 * genug, dass beim nächsten Gericht nicht noch das vorige dasteht.
 *
 * 0,95 m über der Arbeitsplatte heißt: **über** dem Ausgaberegal, dessen
 * Oberkante 0,68 m über der Theke liegt (`kitchenPlan.rackLift` + 0,56 m).
 * Tiefer steckte die Tafel zwischen den Wärmeschirmen.
 */
const TICKET_SECONDS = 4;
const TICKET_LIFT = 0.95;

/** Die Kamera, einmal je Bild geholt — ein Vektor für die ganze Zone. */
const _eye = new THREE.Vector3();
/** Und die Stelle, an der eine Anzeige schweben soll. */
const _at = new THREE.Vector3();

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
 * Geblieben sind zwei Zustände, und beide gehören einer Uhr und nicht dieser
 * Datei: `StoveState` und `ChopState` (`kitchenClock.ts`). Sie stehen an der
 * Station, weil sie **dort** hingehören — nimmt jemand die Pfanne mit, bleibt
 * ihr Fortschritt am Herd zurück, und das ist der Grund, warum es in der Hand
 * nicht weiterbrät.
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
  readonly key: string;
  /** Was gerade darauf liegt — beim Herd ist das die Pfanne. */
  on: Carried | null;
  /** Die Uhr am Herd; `COLD_STOVE` überall sonst. */
  stove: StoveState;
  /** Die Uhr am Brett; `EMPTY_BOARD` überall sonst. */
  chop: ChopState;
  /** Ob sie gerade als benutzbar angemeldet ist. */
  live: boolean;
  /** Was ihre Anzeigen zuletzt gezeigt haben — siehe `showGauges`. */
  shown: StovePhase | 'chop' | null;
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
 * und niemand steht vor einer Welt, die nicht lädt. Seit auch die
 * Zutatenausgaben Möbel aus dem Katalog sind, hängt daran **alles**, was man
 * anfassen kann — vorher standen vier gebaute Kisten in einer sonst leeren
 * Küche.
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
  /** Zutaten und Teller — ein Satz für die ganze Zone. */
  private readonly food = new FoodKit();
  /** Balken, Warndreieck und Flammen — ebenfalls einer für die ganze Zone. */
  private gauges: KitchenGauges | null = null;
  /** Der Ofen für die Bilder an den Ausgaben (`kitchenIcon.ts`). */
  private oven: IconOven | null = null;
  /** Was die Figur gerade trägt. */
  private carried: Carried | null = null;
  /** Die Tafel an der Ausgabetheke und wie lange sie noch steht. */
  private ticket: TextPlane | null = null;
  private ticketLeft = 0;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.rig = ctx.rig;
    this.avatar = ctx.avatar;
    this.gone = false;
    this.gauges = new KitchenGauges(world.root);
    // Der Ofen braucht den Renderer und gibt ohne WebGL und in der Brille
    // `null` zurück (`IconOven.bake`) — dann eben kein Schild an der Ausgabe.
    this.oven = new IconOven(ctx.renderer);

    // Dieselbe Frage wie bei der Figur, und aus demselben Grund: `GLTFLoader`
    // und `import.meta` bringen einen Jest-Lauf zum Stehen, also wird das
    // Modul dort gar nicht erst angefasst (`core/chefFit.canLoadModels`).
    if (!canLoadModels()) return;
    void import('../../../core/kitchenModel').then(async (module) => {
      for (const spot of KITCHEN_SPOTS) {
        if (this.gone) return;
        const piece = kitchenPiece(spot.name);
        if (!piece) continue;
        const model = await module.kitchenModel(spot.name);
        if (!model || this.gone) continue;
        this.place(model, piece, spot, module.takeUtensil);
      }
      if (!this.gone) this.refreshStations();
    });
  }

  /**
   * **Jedes Bild**: Die Pfanne brät, das Brett schneidet, die Anzeigen sagen
   * es, und was getragen wird, hängt vor dem Bauch.
   *
   * In dieser Reihenfolge, und die ist keine Geschmacksfrage: Erst laufen die
   * Uhren (`kitchenClock.ts`), dann werden die Anzeigen danach gesetzt. Wer
   * die Anzeigen vorher setzte, zeigte immer das Bild von gestern — ein Balken
   * hinge ein Bild lang noch da, nachdem das Feuer schon brennt.
   */
  update(dt: number, ctx: WorldContext): void {
    this.cook(dt, ctx);
    this.gauges?.update(dt, ctx.camera);
    this.fadeTicket(dt);
    this.carryInHands(ctx);
  }

  /**
   * **Was von selbst passiert** — der Herd und das Brett, je Bild einmal.
   *
   * Beide Uhren rechnen nebenan (`kitchenClock.advanceStove`, `advanceChop`)
   * und geben einen neuen Zustand zurück, dazu das, was in diesem Bild fertig
   * geworden ist. Die Zone tut damit genau zwei Dinge: das Netz tauschen und
   * es sagen.
   */
  private cook(dt: number, ctx: WorldContext): void {
    if (!this.stations.length) return;
    ctx.camera.getWorldPosition(_eye);
    for (const spot of this.stations) {
      if (spot.kind === 'stove') this.stoveFrame(spot, dt);
      else if (spot.kind === 'board') this.boardFrame(spot, dt);
      else continue;
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
   * **Ein Bild am Brett** — geschnitten wird nur, solange jemand davorsteht.
   *
   * Der Fortschritt bleibt stehen, wenn die Figur weggeht, und läuft weiter,
   * wenn sie zurückkommt; das rechnet die Uhr (`advanceChop`, `live`). Hier
   * steht nur, **wer** davorsteht — siehe `CHOP_REACH`.
   */
  private boardFrame(spot: Station, dt: number): void {
    const near = Math.hypot(_eye.x - spot.deck.x, _eye.z - spot.deck.z) <= CHOP_REACH;
    const tick = advanceChop(spot.chop, dt, near);
    if (tick.state === spot.chop) return;
    spot.chop = tick.state;
    if (!tick.cut) return;
    const on = spot.on;
    // Was geschnitten wird, trägt nichts (`kitchenRecipes.CHOPS`) — aus dem
    // Salatkopf wird geschnittener Salat und sonst nichts.
    if (on) this.restyle(on, dish(tick.cut));
    this.world?.notify(`${ITEM_LABELS[tick.cut]} fertig`);
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
   */
  private showGauges(spot: Station): void {
    const gauges = this.gauges;
    if (!gauges) return;
    const part = spot.kind === 'stove' ? stoveProgress(spot.stove) : chopProgress(spot.chop);
    const phase: StovePhase | 'chop' =
      spot.kind === 'stove' ? stovePhase(spot.stove) : part > 0 ? 'chop' : 'cold';
    if (phase !== spot.shown) {
      gauges.clear(spot.key);
      spot.shown = phase;
    }
    if (phase === 'cold') return;
    if (phase === 'chop') {
      gauges.bar(spot.key, this.hover(spot, GAUGE_LIFT), part, 'chop');
      return;
    }
    // Im Feuer gibt es nichts mehr zu messen: Der Balken ist weg (das `clear`
    // beim Phasenwechsel hat ihn abgehängt), es lodert nur noch.
    if (phase !== 'fire') {
      gauges.bar(
        spot.key,
        this.hover(spot, GAUGE_LIFT),
        part,
        phase === 'frying' ? 'cook' : 'burn',
      );
    }
    gauges.warn(spot.key, phase === 'igniting' ? this.hover(spot, WARN_LIFT) : null);
    // Die Flamme steht mit dem **Fuß** auf der Platte und schwebt nicht
    // darüber (`KitchenGauges.flame`).
    gauges.flame(spot.key, spot.deck, phase === 'fire' ? 'fire' : 'cook');
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
   * **Die Kamera wippt nicht.** Weder hier noch dort: Das Wippen sitzt am
   * Kopf der *Figur*, und den zeichnet nur die Ansicht von oben
   * (`PlayerAvatar`, `LAYER_SELF_ONLY`). Aus den Augen und in der Brille ist
   * eine Kamera, die im Takt der Schritte nickt, kein Gefühl von Gehen,
   * sondern Übelkeit.
   */
  private carryInHands(ctx: WorldContext): void {
    const held = this.carried;
    if (!held) {
      ctx.avatar.carry = null;
      return;
    }
    if (ctx.renderer.xr.isPresenting) {
      // In der Brille tragen es die echten Hände nicht — dort hängt es eine
      // Handbreit vor der Brust, mittig und ruhig.
      held.object.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
      ctx.avatar.carry = null;
      return;
    }
    // **Im Raum des Rigs, und das genügt**: Von oben dreht sich das Rig selbst
    // in die Laufrichtung (`core/FlatControls.walkNorthUp`), und aus den Augen
    // dreht es die Maus (`FlatControls.look`). Wer hier zusätzlich um die
    // Blickrichtung der Figur drehte, drehte um null — dieselbe Rechnung wie
    // beim Werkzeug in der Bildschirmhand (`worlds/portal/screenHand.ts`).
    held.object.position.set(CHEF_CARRY.x, CHEF_CARRY.y + ctx.avatar.bob, CHEF_CARRY.z);
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
   */
  reset(): void {
    const loose = [this.carried, ...this.stations.map((spot) => spot.on)];
    this.carried = null;
    if (this.avatar) this.avatar.carry = null;
    for (const spot of this.stations) {
      spot.on = null;
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
    // einzeln (`kitchenProps.FoodKit`); dasselbe gilt für die Anzeigen und
    // für die Bilder an den Ausgaben.
    this.food.dispose();
    this.gauges?.dispose();
    this.gauges = null;
    this.oven?.dispose();
    this.oven = null;
    this.stations.length = 0;
    this.bodies.length = 0;
    this.carried = null;
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
    const angle = (turn * Math.PI) / 2;
    const [ax, az] = piece.align ?? [0, 0];
    const centreX = (KITCHEN.x + spot.x + size.w / 2) * TILE;
    const centreZ = (KITCHEN.z + spot.z + size.d / 2) * TILE;
    const foot = KITCHEN_FLOOR + (spot.lift ?? 0);
    model.position.set(
      centreX + ax * Math.cos(angle) + az * Math.sin(angle),
      foot,
      centreZ - ax * Math.sin(angle) + az * Math.cos(angle),
    );
    model.rotation.y = angle;
    world.root.add(model);
    model.updateWorldMatrix(true, false);
    this.placed.push(model);

    if (!piece.hanging && !spot.lift) this.addBody(world, piece, spot, size, centreX, centreZ);
    if (spot.show) {
      this.addLabel(world, piece, size, centreX, centreZ);
      return;
    }
    this.addIcon(model, piece, spot);
    this.addStation(model, piece, spot, foot, takeUtensil);
  }

  /**
   * **Der Körper unter dem Bild** — ein Kasten, und zwar genau einer.
   *
   * Hier lag der Fehler, wegen dem man **durch** die Küche lief: `addSolid`
   * misst die Hülle des Objekts, das es bekommt (`PhysicsWorld.halfExtentsOf`),
   * und ein geladenes Möbel ist eine **Gruppe** ohne eigene Geometrie. Für die
   * bleibt der Notnagel von 10 cm Halbmaß — ein Würfelchen von 20 cm mitten im
   * Herd, im Boden zur Hälfte versenkt. Von einer Küche aus dreißig Möbeln war
   * damit nichts fest außer dreißig Kieselsteinen.
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
   * dagegen auf halber Höhe davor **hängen** und fiel nicht mehr herunter —
   * gemessen im Browser, an derselben Stelle, an der eine gewöhnliche Wand
   * einen sauber abprallen lässt. Eine Wand ist ein Kasten, also ist auch das
   * hier einer.
   */
  private addBody(
    world: ZoneHost,
    piece: KitchenPiece,
    spot: Spot,
    size: { w: number; d: number },
    centreX: number,
    centreZ: number,
  ): void {
    // Im Schauraum steht jedes Stück für sich: Dort gibt es kein „darüber
    // hinweg", nur ein Möbel zum Ansehen — und keinen Grund, über ihm gegen
    // Luft zu laufen.
    const height = spot.show ? piece.height : Math.max(piece.height, BLOCK_HEIGHT);
    const box = this.boxAt(size.w * TILE, height, size.d * TILE, centreX, KITCHEN_FLOOR, centreZ);
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);
    this.bodies.push(world.addSolid(box));
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
   * **Das Schild am Schaustück** — Name und Maße, auf Augenhöhe der Figur.
   *
   * Eine Tafel und kein Einbau (`fixtures/sign.ts`): Ein Schild im Grundriss
   * will eine Kachelkante, eine Kennung und einen Eintrag im gespeicherten
   * Stand. Dreizehn davon wären dreizehn Einbauten, die jeder Umbau der Welt
   * mitschleppt — für eine Beschriftung, die sich nie ändert und nie
   * angefasst wird.
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
    });
    // Hinter dem Möbel und leicht geneigt: Von oben liest man eine senkrechte
    // Tafel gar nicht, von vorn eine liegende auch nicht.
    plate.position.set(centreX, KITCHEN_FLOOR + piece.height + 0.58, centreZ + size.d / 2 - 0.05);
    plate.rotation.x = -0.35;
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
    // hinge auf halber Höhe — im Browser nachgesehen: 18 cm statt 36, auf 10 cm
    // über dem Boden. Es hängt deshalb in einer Gruppe, die den Maßstab wieder
    // aufhebt, und rechnet damit in Metern wie alles andere hier.
    const holder = new THREE.Group();
    holder.name = 'kitchen-icon-holder';
    holder.scale.setScalar(1 / KITCHEN_SCALE);
    // **Zweimal dasselbe Bild, oben und vorn** — weil man aus zwei Richtungen
    // darauf schaut. Von oben (`core/TopDownCamera.ts`, die Hauptansicht am
    // Schirm) sieht man von einem Möbel fast nur den Deckel, und der trägt im
    // gekauften Modell überall denselben weißen Teller: Vier Ausgaben
    // nebeneinander waren dort nicht zu unterscheiden. Aus den Augen und in
    // der Brille wiederum ist ein liegendes Schild ein Strich.
    //
    // Dass beides geht, ist der Unterschied zwischen einer Ausgabe und einer
    // Ablage: Auf eine Kiste legt niemand etwas ab (sie hat gar keine Fläche
    // in der Regel, `kitchenCarry.Station`), also verdeckt das liegende Schild
    // auch nichts.
    holder.add(oven.counterSign(texture, { piece, where: 'top' }));
    holder.add(oven.counterSign(texture, { piece, where: 'front' }));
    model.add(holder);
  }

  /**
   * **Was an einem Möbel geht** — abstellen, herunternehmen, wegwerfen,
   * ausgeben.
   *
   * Welche Rolle ein Möbel spielt, steht im Aufbau und nicht hier
   * (`kitchenPlan.stationKind`): Der Mülleimer ist ein Mülleimer, eine Ausgabe
   * gibt aus, und jede andere Arbeitsfläche ist eine Ablage.
   *
   * Wo im Modell ein Gerät steht (`KitchenPiece.holds`), wird es gleich hier
   * abgenommen: Es hängt danach als eigenes Ding auf seiner Fläche, und der
   * Herd darunter ist ein leerer Herd. Ohne diesen Schritt wäre „den Topf
   * nehmen" ein Sonderfall im Nehmen; so ist es derselbe Griff wie bei allem
   * anderen — und dasselbe gilt für den Feuerlöscher auf seinem Hocker.
   */
  private addStation(
    model: THREE.Object3D,
    piece: KitchenPiece,
    spot: Spot,
    foot: number,
    takeUtensil: (model: THREE.Object3D) => THREE.Object3D | null,
  ): void {
    const kind = stationKind(piece.name, spot.gives);
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
      key: `${piece.name}@${spot.x},${spot.z}`,
      on: null,
      stove: COLD_STOVE,
      chop: EMPTY_BOARD,
      live: false,
      shown: null,
    };
    this.stations.push(station);

    if (!piece.holds) return;
    const loose = takeUtensil(model);
    if (!loose) return;
    // **Ein Träger darum herum**, und das ist die Stelle, an der ich mich beim
    // Bauen verrannt habe: Was `takeUtensil` zurückgibt, trägt den **Maßstab
    // des Modells** (`core/kitchenModel.KITCHEN_SCALE`, also 0,5). Ein Patty,
    // das man direkt in die Pfanne hängt, wäre damit halb so groß und läge
    // halb so hoch — zwei Zentimeter statt vier über ihrem Boden, und der
    // Fehler sieht aus wie ein zu kleines Patty und nicht wie ein falscher
    // Maßstab. Der Träger steht auf 1, die Pfanne hängt darin, und der Belag
    // kommt daneben (`restyle`).
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
   */
  private refreshStations(): void {
    const world = this.world;
    if (!world) return;
    for (const spot of this.stations) {
      // **Die Regel selbst sagt, ob es hier etwas zu tun gibt.** Vorher stand
      // hier eine zweite Liste je Stationsart — und die lief mit jeder neuen
      // Art auseinander. `nothing` ist der einzige Fall ohne etwas zu sagen;
      // `refuse` hat einen Satz und meldet sich.
      const wanted = kitchenDeed(this.held(), facts(spot)).do !== 'nothing';
      if (wanted === spot.live) continue;
      spot.live = wanted;
      if (!wanted) {
        world.removeUsable(spot.object);
        continue;
      }
      world.addUsable(
        spot.object,
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
      case 'chop': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        this.layOn(spot, thing);
        // Am Brett fängt das Schneiden sofort an — `layOn` legt die Uhr an
        // (`settle`), gesagt wird es hier.
        world.notify(
          deed.do === 'chop'
            ? `${ITEM_LABELS[deed.dish.item]} wird geschnitten`
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
        if (deed.held) this.restyle(thing, deed.held);
        else {
          this.carried = null;
          this.discard(thing);
        }
        this.showTicket(spot, deed.recipe.label);
        world.notify(`${deed.recipe.label} serviert`);
        break;
      }
      case 'douse': {
        spot.stove = douse(spot.stove);
        // Die Pfanne bleibt, ihr Inhalt ist verkohlt und weg. `settle` gleich
        // danach setzt die Uhr auf den neuen Inhalt — also auf kalt und leer.
        const pan = spot.on;
        if (pan) this.restyle(pan, dish(pan.dish.item));
        this.settle(spot);
        world.notify('Feuer gelöscht');
        break;
      }
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
   * - An einer **Ausgabe** gibt es nichts zu ändern: Sie hatte nie etwas
   *   liegen und behält trotzdem alles (`target` ist dort immer `null`).
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
    if (spot.kind === 'box') return;
    const on = spot.on;
    if (!target) {
      if (on) {
        spot.on = null;
        this.discard(on);
      }
    } else if (on) {
      this.restyle(on, target);
    }
    this.settle(spot);
  }

  /**
   * **Was man an dieser Station in die Hand bekommt.**
   *
   * Zwei Quellen: Eine **Ausgabe** baut neu, so oft man will — ein Stapel
   * Teller, der nach dem dritten Gast leer ist, wäre bei _Overcooked_ der
   * Punkt, an dem eine Runde stehenbleibt. Jede andere Station gibt her, was
   * auf ihr liegt, und ist danach leer.
   */
  private pickUp(spot: Station, want: Dish): Carried | null {
    if (spot.kind === 'box') return this.make(want);
    const on = spot.on;
    spot.on = null;
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
   * **Aus einem Gericht wird ein anderes** — und das Netz zieht nach.
   *
   * **Die eine Stelle**, an der ein getragenes Ding sein Aussehen wechselt:
   * gebraten, geschnitten, belegt, abgeräumt. Alles andere ruft hier an, statt
   * selbst Netze zu bauen — sonst hätte jeder neue Handgriff seine eigene
   * kleine Fassung davon, und eine davon vergäße den Belag.
   *
   * Zwei Wege, je nachdem, woher das Netz kommt (siehe `Carried`):
   *
   * - **Geladenes Gerät**: Es bleibt hängen, wo es hängt, und **nur der
   *   Belag** wird getauscht (`FoodKit.topping`). Es gibt genau eine Pfanne in
   *   dieser Küche; sie hier wegzuwerfen und neu zu bauen hieße, sie zu
   *   verlieren. Der Belag kommt dabei an den **Träger** und nicht in das
   *   geladene Netz — siehe `Carried.loose`, dort steht, warum.
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
   * und die Uhr der Station auf das setzen, was jetzt darauf steht.
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
   * hinlegen, zusammenlegen, löschen. Beide Uhren fangen dabei von vorn an,
   * und das ist ihre Regel und nicht diese Zeile: Was auf den Herd kommt,
   * kommt frisch darauf (`kitchenClock.onStove`), und was aufs Brett gelegt
   * wird, wird von vorn geschnitten (`onBoard`). Je Bild gerufen wäre es der
   * Fehler, den man erst im Headset sieht: Ein Patty, das nie fertig wird.
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
    if (spot.kind === 'board') spot.chop = onBoard(on?.item ?? null);
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

  // --- die Tafel an der Ausgabetheke -----------------------------------------

  /**
   * **„Hamburger serviert"** — kurz, an der Theke, und dann wieder weg.
   *
   * Dieselbe Tafel wie an den Schaustücken (`ui/TextPlane.ts`) und dieselbe
   * Neigung: Sie schaut nach Süden und lehnt sich zurück, weil die Hauptansicht
   * die Kamera von oben ist und die von dort kommt. Eine Meldung am Handgelenk
   * gibt es auch, aber die sieht man nur, wenn man hinschaut — und wer gerade
   * etwas über eine Theke schiebt, schaut auf die Theke.
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
      });
      plate.rotation.x = -0.35;
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
 * Vier Felder, und keines davon rechnet die Zone selbst aus: Ob der Herd
 * brennt, weiß seine Uhr (`StoveState.fire`), was darauf liegt, ist das
 * `Dish` des getragenen Dings. Die Regel bekommt damit genau das, was sie
 * lesen darf — und nicht die halbe Zone.
 */
function facts(spot: Station): StationFacts {
  return {
    kind: spot.kind,
    on: spot.on?.dish ?? null,
    gives: spot.gives,
    fire: spot.stove.fire,
  };
}
