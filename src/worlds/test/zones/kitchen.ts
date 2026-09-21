import * as THREE from 'three';
import {
  KITCHEN_PIECES,
  POT_BOWL,
  SINK_BOWL,
  kitchenDeck,
  kitchenPiece,
  kitchenHub,
  kitchenPieceScale,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { kitchenPieceForModel } from '../../../core/kitchenShelf';
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
  carrySlot,
  dish,
  dishLabel,
  douse,
  handsOver,
  keptOnFold,
  kitchenDeed,
  kitchenInteractionSpec,
  kitchenPrompt,
  layered,
  meansContent,
  onWork,
  otherHand,
  STATION_WORK,
  stovePhase,
  stoveProgress,
  stoveUnder,
  workProgress,
  workWaits,
  type CarrySide,
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
import { DIRTY_STACK_MAX, FoodKit, SINK_TILT, WATER_LOOK } from './kitchenProps';
import {
  KITCHEN_STATION_GRAB,
  kitchenCarryTurn,
  kitchenGrab,
  kitchenHandles,
  kitchenPieceGrab,
  pieceHandles,
} from './kitchenGrab';
import { GAUGE_LIFT, KitchenGauges, WARN_LIFT } from './kitchenGauge';
import { IconOven } from './kitchenIcon';
import {
  COPIER_DECK,
  COPIER_PLATE,
  COPIER_ZONE,
  DeskKit,
  copierField,
  pieceSide,
} from './kitchenDesk';
import type { ConstructItem } from '../../shared/construct';
import { KitchenFloor } from './kitchenFloor';
import { buildKitchenNotice } from './kitchenNotice';
import type { SignBoard } from '../../signs/SignBoard';
import {
  BUILD_BUTTON_TILE,
  HANDS_BUTTON_TILE,
  KITCHEN_FLOOR,
  KITCHEN_SPOTS,
  LEAK_BUTTON_TILE,
  PLIERS_TILE,
  RADIO_TILE,
  TRIAL_BUTTONS,
  TURN_LABELS,
  footprint,
  inKitchen,
  stationKind,
  type Spot,
  type Turn,
} from './kitchenPlan';
import { kitchenBlock, kitchenBlocks, type KitchenBlock } from './kitchenBlocks';
import {
  CLEAR_TABLE,
  advanceTable,
  cleared,
  eatProgress,
  freeTable,
  seat,
  type TableState,
} from './kitchenGuests';
import { atHandGrip } from '../../portal/grabReach';
import { grabSettings, onGrabChange, saveGrabSettings } from '../../../core/grabSettings';
import {
  BUILD_AHEAD,
  buildFree,
  goesHomeOnEdit,
  overlaps,
  holdForRim,
  ridesAlong,
  tileAhead,
  turnAhead,
  whyNotBuilt,
  whyNotLifted,
  type BuildTile,
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
  beltGrabs,
  beltLearns,
  beltRefills,
  beltReleases,
  beltStep,
  beltTrashes,
  beltWants,
  type BeltFrame,
  type BeltKind,
  type BeltState,
  type BeltTile,
} from './kitchenBelt';
import {
  CombinerKit,
  IDLE_COMBINE,
  advanceCombine,
  combineProgress,
  combinerHolds,
  combinerTakes,
  type CombineState,
} from './kitchenCombiner';
import { MixerKit } from './kitchenMixer';
import { GriddleKit } from './kitchenGriddle';
import {
  DRY,
  SprayJet,
  advanceDouse,
  douseProgress,
  inSpray,
  sprayAims,
  sprayClaimsUse,
  sprayHold,
  sprayOn,
  type DouseState,
} from './kitchenSpray';
import {
  LeakJet,
  TIGHT,
  advanceFix,
  fixProgress,
  springLeak,
  startFix,
  type LeakState,
} from './kitchenLeak';
import { buildRedButton, BUTTON_DOME_R, type RedButton } from '../../shared/redButton';
import { KitchenAudio } from './kitchenAudio';
import {
  CHOP_BEAT,
  SOUND_TRIALS,
  TRIAL_CUES,
  deedSound,
  kitchenBeat,
  kitchenHeard,
  kitchenNearest,
  nextTrial,
  reachOf,
  trialAt,
  type KitchenCue,
  type KitchenEar,
  type KitchenHeard,
  type KitchenSpotAt,
  type TrialCue,
} from './kitchenSound';
import {
  RADIO_HEIGHT,
  RADIO_OFF,
  RADIO_STATIONS,
  buildKitchenRadio,
  radioPrompt,
  radioToggle,
  type KitchenRadio,
  type RadioState,
} from './kitchenRadio';
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
// Die Rechnung „Katalogstück → Kasten" liegt daneben und three.js-frei
// (`kitchenBlocks.ts`); weitergereicht wird sie, damit `BLOCK_HEIGHT` dort
// zitiert werden kann, wo es schon immer zitiert wurde: als Zahl der Küche.
export * from './kitchenBlocks';

/**
 * **Wo das Getragene hängt** (`core/chefFit.CHEF_CARRY`) — als Vektor, weil
 * die Figur einen bekommt und keine drei Zahlen (`PlayerAvatar.carry`).
 *
 * Einer für die ganze Zone: Er wird jedes Bild weitergereicht, und ein neuer
 * je Bild wäre ein Vektor je Bild. Beschrieben wird er trotzdem je Bild
 * (`carryY`) — seit die Figur wippt, federt und atmet, ist „vor dem Bauch"
 * keine feste Höhe mehr.
 */
const CARRY_POINT = new THREE.Vector3(CHEF_CARRY.x, CHEF_CARRY.y, CHEF_CARRY.z);

/**
 * **Auf welcher Höhe der Bauch in diesem Bild ist**, im Raum des Rigs.
 *
 * Drei Dinge stecken darin, und alle drei kommen von der Figur: ihre
 * **Stauchung** beim Laufen und ihr **Atmen** im Stehen (`core/squish.ts`,
 * `AvatarBody.stretch`) als Faktor auf die Höhe, und ihr **Wippen**
 * (`AvatarBody.bob`) als Strecke obendrauf. Eine Pfanne, die ruhig in der Luft
 * stünde, während die Hände darunter auf und ab gehen, ist das, was man von
 * oben sofort sieht — und dieselbe Zahl geht deshalb an das Getragene **und**
 * an die Hände der Figur (`PlayerAvatar.carry`).
 */
function carryY(ctx: WorldContext): number {
  return CHEF_CARRY.y * ctx.avatar.stretch + ctx.avatar.bob;
}

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
 * **Wie hoch der Inhalt in einem geladenen Gerät aufsitzt**, über dessen Fuß.
 *
 * Zwei Gefäße, zwei Zahlen, und beide sind gemessen und nicht geraten: In der
 * Pfanne liegt das Patty auf `PAN_RIM` (siehe dort), im Topf steht das Wasser
 * auf seinem Innenboden (`core/kitchenFit.POT_BOWL.floor`, 2,47 cm über dem
 * Fuß des Topfes). Der Feuerlöscher kommt hier nie an — er nimmt nichts auf
 * (`kitchenRecipes.TAKES`) —, bekommt aber dieselbe Antwort wie die Pfanne,
 * weil eine Funktion mit einem `null` darin an jeder Aufrufstelle eine
 * Fallunterscheidung nach sich zöge.
 *
 * **Warum das hier steht und nicht im Zutatensatz**: Wie hoch der Rand eines
 * **geladenen** Netzes liegt, weiß nur, wer es misst — `FoodKit.topping`
 * bekommt die Zahl deshalb gereicht und schlägt sie nicht nach
 * (`kitchenProps.ts`).
 */
function looseRim(item: KitchenItem): number {
  return item === 'pot' ? POT_BOWL.floor : PAN_RIM;
}

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
 * **Was auf dem Schild des zweiten Knopfes steht** — der, der die zweite Hand
 * freigibt (`core/grabSettings.GrabSettings.twoHands`).
 *
 * Dieselbe Regel wie beim Umbauknopf darüber, und deshalb dieselbe Bauart: Es
 * sagt die **Tat** und nicht den Zustand. Wer davorsteht und _VR zwei
 * Gegenstände an_ liest, weiß, was der nächste Druck bewirkt; ein Schild, auf
 * dem _Ein Gegenstand_ stünde, ließe ihn raten, ob das die Lage oder das
 * Angebot ist.
 *
 * **„VR" steht ausdrücklich darin**, denn nur dort ändert sich etwas: Von oben
 * und am Schreibtisch trägt die Figur weiter genau ein Ding vor dem Bauch
 * (`carryInHands`) — es gibt dort keine zweite Hand, in die etwas könnte
 * (`core/usable.UseSource.hand`).
 */
const HANDS_BUTTON_LABELS = {
  off: 'VR zwei Gegenstände an',
  on: 'VR zwei Gegenstände aus',
} as const;

/** Die zweite Zeile darunter — sie sagt, wozu das gut ist, und bleibt stehen. */
const HANDS_BUTTON_BODY = 'In der Brille in jeder Hand etwas tragen';

/**
 * **Was auf dem Schild des dritten Knopfes steht** — der an der Spüle
 * (`addLeakButton`, `kitchenLeak.ts`).
 *
 * Hier **wechselt** die Bauart, und das ist Absicht: Die beiden Schilder
 * darüber sagen die Tat, weil ihre Knöpfe hin und her schalten. Dieser
 * schaltet nicht zurück — ein Leck wird nicht per Knopf wieder dicht, sondern
 * mit der Zange in der Hand. _Becken spritzt_ ist deshalb die **Lage** und
 * kein Angebot, und die Zeile darunter sagt, was jetzt zu tun ist.
 */
const LEAK_BUTTON_LABELS = { off: 'Wasserleck auslösen', on: 'Becken spritzt' } as const;

/** Die zweite Zeile darunter — vorher wozu, nachher wogegen. */
const LEAK_BUTTON_BODY = 'Das Spülbecken läuft aus, bis es repariert ist';
const LEAK_BUTTON_BODY_ON = 'Mit der Wasserpumpenzange von der Arbeitsplatte abdichten';

/** Wie die beiden Hände in einer Meldung heißen — „Pfanne in die linke Hand". */
const HAND_LABELS: Readonly<Record<Handedness, string>> = { left: 'linke', right: 'rechte' };

/** Beide Hände, in fester Reihenfolge — für Schleifen, die je Hand fragen. */
const HANDS: readonly Handedness[] = ['left', 'right'];

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
/**
 * **Wie groß der Filteraufkleber auf einem Filterband ist**, als Durchmesser
 * in Metern — 30 cm, also knapp ein Drittel der Kachel.
 *
 * Gegen den Teller gerechnet, der darüber hinwegfährt (75 cm,
 * `kitchenProps.PLATE_RADIUS` mal zwei): Ein Aufkleber in Kachelgröße läge
 * unter jedem davon, dieser lugt an der Kante hervor. Und gegen die Sparren:
 * Sie laufen 72 cm breit über den Trog (`kitchenBelt`, `ARROW_WIDE`), und was
 * von ihnen verdeckt wird, ist die Richtung des Bandes — die soll man immer
 * lesen können.
 */
const FILTER_SIGN = 0.3;

/**
 * **Und wie weit hinten**, in Metern von der Kachelmitte — an der Kante, an
 * der das Band zugreift (bei `turn: 0` also nach Süden, +z).
 *
 * 0,33 m: Der Aufkleber ist 30 cm breit, seine hintere Kante liegt damit bei
 * 0,48 m und bleibt zwei Zentimeter innerhalb der Kachel. Zwei Bänder
 * hintereinander haben so eine sichtbare Fuge zwischen ihren Aufklebern statt
 * zweier Bilder, die sich an der Naht berühren.
 */
const FILTER_BACK = 0.33;

/**
 * **Wie eine laufende Arbeit gemeldet wird** — je Art ein Verb im Präsens.
 *
 * Eine Tabelle und keine Kette aus Fragezeichen: Es sind vier Arten
 * (`kitchenWork.WorkKind`), und bei der fünften fragt der Übersetzer nach ihrem
 * Eintrag, statt sie stillschweigend „schneiden" zu nennen. Das Spülen fehlt
 * hier trotzdem, und das ist kein Versehen: Gespült wird **Geschirr** und
 * nicht ein bestimmtes Ding — „Dreckiger Teller wird gespült" wäre falsches
 * Deutsch, und derselbe Sonderfall steht aus demselben Grund schon in
 * `kitchenCarry.kitchenPrompt`.
 */
const WORK_WORDS: Readonly<Record<WorkKind, string>> = {
  chop: 'wird geschnitten',
  blend: 'wird gemixt',
  fry: 'brät',
  wash: 'wird gespült',
};

const GHOST_ALPHA = 0.35;
const GHOST_FREE = 0x7de88a;
const GHOST_BLOCKED = 0xe5361c;

/** Wie hoch der Umriss des Bauplatzes ist, in Metern — knapp über der Theke. */
const GHOST_HEIGHT = 0.6;

/**
 * **Um wie viel eine Miniatur kleiner ist als ihr Möbel** — ein Faktor und
 * keine Zielgröße.
 *
 * Vier Fünftel: Ein Möbel von einer Kachel steht damit auf 0,8 m seiner
 * Kachel, und ringsum bleibt ein Zehntel Meter Luft zum Nachbarn. Zwei
 * Kacheln werden zu 1,6 m auf zwei Kacheln — dieselbe Luft, dieselbe
 * Verkleinerung.
 *
 * **Derselbe Faktor für alle, und das ist der Punkt.** Vorher war das eine
 * Zielgröße: jedes Stück auf 0,8 m längste Kante. Damit war im Regal jedes
 * Möbel gleich groß, und die Frage, für die man den Katalog aufmacht — passt
 * das noch neben das da? — war aus dem Bild verschwunden.
 */
const MINI_SIZE = 0.8;

/**
 * **Und wie klein die Vorlage auf der Kopierfläche wird**, als Faktor auf das
 * Katalogmaß (`core/kitchenFit.kitchenPieceScale`).
 *
 * Ein Drittel, und das ist eine andere Zahl als beim Katalog, weil die Frage
 * eine andere ist: Dort geht es darum, ein Möbel auf einer Kachel aus einigen
 * Metern Entfernung zu erkennen, hier darum, es auf ein Feld von einer
 * Handbreit zu legen, das auf einem anderen Möbel sitzt. Ein Faktor und kein
 * gerechnetes Maß — so bleibt der Größenunterschied zwischen Mülleimer und
 * Ausgabetheke auf der Platte sichtbar, und man sieht der Vorlage an, was man
 * kopiert.
 *
 * **Und sie hängt bewusst nicht an `MINI_SIZE`**, obwohl beide „klein" heißen:
 * `layOnPlate` rechnet `kitchenPieceScale(piece) * MINI_SCALE` und fasst das
 * Katalogmaß nie an. Wer die Miniaturen im Katalog wachsen lässt, weil der
 * Konstrukt-Raum seine Stücke weiter auseinanderstellt, lässt die
 * Kopierfläche deshalb in Ruhe — ihr Feld ist dasselbe geblieben.
 */
const MINI_SCALE = 1 / 3;

/**
 * **Wie durchscheinend die Kopie in der Kopie-Zone ist**, bis jemand sie nimmt
 * — und in welchem Licht sie steht.
 *
 * 0,55 statt der früheren 0,45: Die Kopie ist das Ergebnis dieses Geräts, und
 * ein Ergebnis, das man suchen muss, ist keines. Durchscheinend bleibt sie
 * trotzdem, denn sie ist noch nichts — erst der Griff macht daraus ein Möbel.
 *
 * Das **Grün ist das des Geräts** (`COPY_GLOW`, dieselbe Zahl wie
 * `kitchenDesk.GLOW_COLOR`): Glas, Pfosten, Bühne und Spur tragen es schon, und
 * die Kopie ist das, was dieses Grün ankündigt. Eine fünfte Farbe hieße, dass
 * hier noch etwas anderes passiert.
 *
 * Und es liegt **leicht** darüber (`COPY_GLOW_STRENGTH` = 0,3): Bei 0,5 wird
 * aus jedem Möbel ein grüner Klotz, und wer eine Küchenzeile kopiert, soll eine
 * Küchenzeile sehen — Kante, Griff und Sockel bleiben bei 0,3 lesbar.
 */
const COPY_ALPHA = 0.55;
const COPY_GLOW = 0x2fd6a8;
const COPY_GLOW_STRENGTH = 0.3;

/** Die Stelle, an der eine Anzeige schweben soll — ein Vektor für die Zone. */
/**
 * **Die leere Menge der vergebenen Kacheln** — geteilt, damit ein Bild ohne
 * Kombinierer keinen Müll hinterlässt.
 *
 * Dieselbe Sparsamkeit wie bei den leeren Bandbildern (`kitchenBelt`,
 * `STILL_FRAME`): In einer Küche ohne Kombinierer läuft diese Schleife
 * sechzigmal in der Sekunde und soll dabei kein `Set` bauen, das niemand
 * füllt.
 */
const NO_CLAIMS: ReadonlySet<string> = new Set();

const _at = new THREE.Vector3();
/** Wo die Figur steht und wohin sie zielt — für Arbeit, Nebel und Bauplatz. */
const _feet = new THREE.Vector3();
const _aim = new THREE.Vector3();
const _rigAhead = new THREE.Vector3();
const _headAhead = new THREE.Vector3();
const _nozzle = new THREE.Vector3();
/** Wohin der Löscher pustet — die Hand, nicht der Körper (`aimJet`). */
const _jet = new THREE.Vector3();
const _handRay = new THREE.Ray();
const _spin = new THREE.Quaternion();
/**
 * Die beiden **Griffpunkte** der Hände, für die Übergabe (`handover`) — zwei
 * Vektoren für die Zone und nicht zwei je Bild.
 */
const _thisGrip = new THREE.Vector3();
const _otherGrip = new THREE.Vector3();
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
 * **Was eine Station gerade anzuzeigen hat** — eine Phase, kein Sammelsurium
 * (`phaseOf`, `showGauges`).
 *
 * Die vier Herdphasen kommen aus der Uhr (`kitchenClock.StovePhase`), die
 * übrigen vier sind die Arbeiten, die ebenfalls einen Balken haben: die Uhr
 * an Brett, Spüle, Mixer und Kombinierer (`work`), der Gast am Tisch (`eat`),
 * der Herd im Nebel (`douse`) und das Becken unter der Zange (`fix`).
 *
 * Ein eigener Name dafür, seit es acht sind: Die Aufzählung stand dreimal in
 * dieser Datei ausgeschrieben, und beim vierten Mal hätte eine davon gefehlt.
 */
type KitchenPhase = StovePhase | 'work' | 'eat' | 'douse' | 'fix';

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
  /** Die Uhr am Kombinierer; `IDLE_COMBINE` überall sonst. */
  join: CombineState;
  /** Wie lange dieser Herd schon im Nebel steht; `DRY`, solange er es nicht tut. */
  wet: DouseState;
  /** Ob dieses Becken spritzt und wie weit es repariert ist; `TIGHT` überall sonst. */
  leak: LeakState;
  /** Wie viele Teller hier liegen — an der Rückgabe und im Abtropfgitter. */
  stack: number;
  /**
   * **Welche Sorte darin steht** — `null`, solange nichts darinsteht.
   *
   * Die Zahl allein genügt dem Abtropfgitter nicht: In ein leeres darf beides,
   * in ein belegtes nur noch dasselbe (`kitchenCarry.inRack`). Und gezeichnet
   * wird ebenfalls danach — vier saubere Teller sehen anders aus als vier
   * dreckige.
   */
  stacked: KitchenItem | null;
  /** Das Netz dieses Stapels, solange einer steht. */
  pile: THREE.Object3D | null;
  /** Was ihre Anzeigen zuletzt gezeigt haben — siehe `showGauges`. */
  shown: KitchenPhase | null;
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
  /**
   * **Das Wasser im Spülbecken** (`addWater`) — oder `null` bei jedem anderen
   * Möbel.
   *
   * Gemerkt wird es, seit das Becken **lecken** kann (`kitchenLeak.ts`): Wer es
   * kaputt macht, nimmt ihm sein Wasser — aus einem spritzenden Becken steht
   * keines ruhig halb voll darin —, und wer es repariert, gibt es zurück. Das
   * ist ein `visible` je Leck und kein Netz, das ab- und wieder aufgebaut
   * würde.
   *
   * Es hängt am **Möbel** und nicht an der Station, wie das Schild auf dem
   * Deckel daneben: Wer das Becken im Baumodus aufhebt, trägt sein Wasser mit.
   */
  water: THREE.Object3D | null;
  /**
   * **Was dieses Filterband gelernt hat** — oder `null` bei allem anderen.
   *
   * Es hängt am **Möbel** und nicht an seiner Station, und das ist keine
   * Geschmacksfrage: Im Baumodus hebt man Möbel auf und stellt sie anderswo
   * wieder hin (`liftPiece`, `dropPiece`), und ein Filter, der dabei
   * verlorenginge, wäre ein Gedächtnis, das jedes Versetzen löscht. Ein Band,
   * das man eine Kachel weiterschiebt, ist dasselbe Band.
   *
   * Gesetzt wird es an genau zwei Stellen: einmal beim Aufbau, wenn der
   * Grundriss es schon mitbringt (`kitchenPlan.Spot.filter`), und danach, so
   * oft jemand etwas darauflegt (`act`). Was ein Band selbst herbeischafft,
   * lehrt es nichts — die Begründung steht bei `kitchenBelt.beltLearns`.
   */
  filter: KitchenItem | null;
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
 * **Ein belegtes Fach**: was darin liegt, und an welcher echten Hand es hängt.
 *
 * Zwei Angaben und nicht eine, weil sie sich unterscheiden, sobald der Schalter
 * _zwei Gegenstände_ aus ist (`core/grabSettings.GrabSettings.twoHands`): Dann
 * gibt es genau **ein** Fach (`'body'`), und trotzdem hängt sein Inhalt in der
 * Brille an **der** Hand, die zugegriffen hat — die Pfanne dreht sich mit dem
 * Handgelenk, am Stiel (`holdInHand`). Das Fach sagt, wem es gehört; `hand`
 * sagt, wo es steckt.
 *
 * `hand` ist `null`, wenn es keine Hand war: von oben, am Schreibtisch und aus
 * der Uhr der Spüle. Dann hängt es vor dem Bauch, wie es das immer getan hat.
 */
interface Hold {
  readonly thing: Carried;
  hand: Handedness | null;
}

/**
 * **Was auf einer Kopierfläche steht, und was daneben daraus geworden ist.**
 *
 * Die Vorlage ist ein gewöhnliches `Furnish` mit `held = true` — also eines,
 * das keine Kachel belegt und keinen Körper hat, genau wie ein getragenes. Das
 * ist der Punkt und keine Sparsamkeit: Wer sie wieder herunternimmt, bekommt
 * **dasselbe** Möbel zurück und keine Nachbildung davon.
 */
interface Plate {
  readonly load: Furnish;
  /** Die durchscheinende Kopie in der Zone daneben — `null`, bis eine steht. */
  copy: THREE.Object3D | null;
  /** Ihre eigenen Materialien; sie gehen mit ihr (`clearCopy`). */
  readonly skins: THREE.Material[];
}

/**
 * **Welche Möbel sich selbst bedienen** — und es ist die **Sorte**, die das
 * entscheidet, nicht ein Merker auf ein bestimmtes Stück.
 *
 * Beide haben keine Station (`kitchenPlan.stationKind` gibt `null`), also
 * fände sie die Schleife über die Stationen nie; beide haben stattdessen zwei
 * Bedeutungen an einem Netz, und welche gilt, entscheidet, wo man steht
 * (`kitchenDesk.pieceSide`, `kitchenDesk.copierField`).
 *
 * Eine Funktion und kein Feld, weil der Möbelkatalog **jedes** Katalogstück
 * hergibt: Wer sich einen zweiten Rechner holt, hat zwei, und ein Merker
 * zeigte danach auf den neuen, während der alte als totes Möbel herumstünde.
 */
function selfServed(name: string): 'desk' | 'copier' | null {
  if (name === 'desk') return 'desk';
  if (name === 'copier') return 'copier';
  return null;
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
  /**
   * **Die Kästen, die schon stehen, bevor ihr Möbel zu sehen ist**
   * (`kitchenBlocks.ts`) — je Stelle im Aufbau einer.
   *
   * Sie sind der ganze Sinn dieser Karte: Kommt das Modell später an, soll es
   * sich in seinen Kasten stellen und keinen zweiten daneben bauen. `addBody`
   * holt ihn hier heraus und **streicht ihn dabei** — was einmal einem Möbel
   * gehört, gehört danach ihm allein, samt Aufheben und Umstellen im Baumodus.
   */
  private readonly blocks = new Map<Spot, { box: THREE.Mesh; body: PhysicsBody }>();
  private readonly owned: THREE.Material[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  /** Ein Material für alle Trefferkästen — unsichtbar ist unsichtbar. */
  private hidden: THREE.MeshBasicMaterial | null = null;
  /** Und eines für das Wasser in jedem Spülbecken (`addWater`). */
  private pond: THREE.MeshStandardMaterial | null = null;
  private readonly labels: TextPlane[] = [];
  private readonly stations: Station[] = [];
  /** Jedes aufgestellte Möbel der Küche. */
  private readonly furniture: Furnish[] = [];
  /** Zutaten und Teller — ein Satz für die ganze Zone. */
  private readonly food = new FoodKit();
  /** Balken, Warndreieck und Flammen — ebenfalls einer für die ganze Zone. */
  private gauges: KitchenGauges | null = null;
  /** Der Ofen für die Bilder an den Ausgaben (`kitchenIcon.ts`). */
  private oven: IconOven | null = null;
  /** Der Bausatz für die Förderbänder (`kitchenBelt.ts`) — alle drei Sorten. */
  private belts: BeltKit | null = null;
  /** Der für die Kombinierer (`kitchenCombiner.ts`). */
  private joins: CombinerKit | null = null;
  /** Und der für die Mixer (`kitchenMixer.ts`). */
  private mixers: MixerKit | null = null;
  /** Und der für die sicheren Kochstellen (`kitchenGriddle.ts`). */
  private griddles: GriddleKit | null = null;
  /** Und der für Computer-Tisch und Kopierer (`kitchenDesk.ts`). */
  private desks: DeskKit | null = null;
  /** Der Nebel aus dem Feuerlöscher (`kitchenSpray.ts`). */
  private jet: SprayJet | null = null;
  /** Und die Fontäne aus dem undichten Spülbecken (`kitchenLeak.ts`). */
  private leakJet: LeakJet | null = null;
  /** Der karierte Belag über dem Estrich der Zone (`kitchenFloor.ts`). */
  private floor: KitchenFloor | null = null;
  /**
   * **Was die Figur gerade trägt — ein Fach je Seite** (`kitchenCarry.CarrySide`).
   *
   * Bis eben stand hier **ein** Feld und daneben die Hand, an der es hing. Das
   * war dieselbe Küche, nur kürzer aufgeschrieben: Solange es genau einen
   * getragenen Gegenstand gibt, ist „was trage ich?" und „was hält diese Hand?"
   * dieselbe Frage. Seit der Schalter _zwei Gegenstände_ existiert
   * (`core/grabSettings.GrabSettings.twoHands`), sind es zwei verschiedene, und
   * **jede Stelle in dieser Datei stellt genau eine davon**:
   *
   * - **„Was hält die handelnde Hand?"** → `heldBy(this.sideOf(by))`. Das ist
   *   alles, was `A` an einer Station tut.
   * - **„Sind die Hände voll?"** → `handsFull()`. Das ist alles, was einen
   *   freien Griff **braucht** — Umbau anschalten, Möbelkatalog öffnen,
   *   Aufräumen, der fertige Teller aus der Spüle.
   *
   * Der Schlüssel ist die **Seite** und nicht die Hand, und welche Seite welches
   * Fach meint, sagt `kitchenCarry.carrySlot`: Steht der Schalter aus, ist es
   * für jede Seite dasselbe Fach (`'body'`) — dann trägt die Figur wie eh und
   * je genau ein Ding, und diese Karte hat höchstens einen Eintrag.
   */
  private readonly holds = new Map<CarrySide, Hold>();
  /**
   * **Die Hand, die zuletzt etwas getan hat** — die Auskunft für alle, die ohne
   * Hand fragen.
   *
   * Es gibt sie: Der Hinweis über einer Station wird gelesen, ohne dass eine
   * Hand dabeisteht (`refreshStations`, `core/usable.Usable.usePrompt`), und
   * der fertig gespülte Teller kommt aus einer **Uhr** in die Hand und nicht
   * aus einem Griff (`kitchenWork.WORK_TO_HAND`). Beide bekommen das Fach
   * dieser Hand (`kitchenCarry.carrySlot`), und das ist dieselbe Regel, nach
   * der auch der gelbe Saum mit **einem** Gegenstand auskommt: die Hand, die
   * zuletzt gearbeitet hat (`core/grabSettings.GrabSettings.twoHands`).
   *
   * Rechts ab Werk, weil die meisten rechts greifen — und weil es nur zählt,
   * bis das erste Mal wirklich eine Hand zugefasst hat.
   */
  private busyHand: Handedness = 'right';
  /**
   * **Ob beide Hände tragen dürfen** — die Einstellung, einmal gelesen.
   *
   * `grabSettings()` liest den `localStorage` und parst JSON; je Bild wäre das
   * ein Dateizugriff für einen Schalter, der sich nur ändert, wenn jemand ihn
   * umlegt. Genau dieselbe Überlegung wie bei der Augenhöhe darüber
   * (`eyeScale`), und derselbe Weg: einmal in `build`, danach am Melder
   * (`onGrabChange`).
   */
  private twoHands = false;
  /** Den Melder wieder abbestellen — sonst hält er die Zone am Leben. */
  private offGrab: (() => void) | null = null;
  /**
   * **Die sichtbaren Griffkreuze** (`core/handleView.ts`) — nur, wenn das
   * Häkchen im Grafik-Menü sitzt, und ab Werk sitzt es nicht.
   */
  private readonly handleView = new HandleView();
  /** Die Tafel an der Ausgabetheke und wie lange sie noch steht. */
  private ticket: TextPlane | null = null;
  private ticketLeft = 0;

  // --- der Rechner und der Kopierer ------------------------------------------
  /**
   * **Von jedem Katalogstück ein Netz**, aus dem sich klonen lässt — für die
   * Miniaturen im Möbelkatalog des Rechners und für die Kopie im Kopierer.
   *
   * Sie kommt aus dem **Schauraum** und ist deshalb vollständig, ohne dass
   * jemand eine zweite Liste führt: Er zeigt jedes Katalogstück genau einmal
   * (`kitchenPlan.KITCHEN_SHOWN`, und `testPlan.test.ts` rechnet das gegen
   * `core/kitchenFit.KITCHEN_NAMES` nach). Ein zweiter Ladevorgang nur für
   * Miniaturen wäre dieselbe Datei ein zweites Mal — 32 MB für ein Regal.
   *
   * Geklont wird mit `Object3D.clone()`, und das ist Absicht: Formen und
   * Materialien bleiben **geteilt**, eine Miniatur kostet also einen Knoten
   * und keine Geometrie.
   */
  private readonly models = new Map<string, THREE.Object3D>();
  /**
   * **Die fertigen Miniaturen** — je Katalogstück eine, gebaut beim ersten
   * Öffnen des Katalogs und danach immer wieder dieselbe.
   *
   * Ohne diese Karte baute `openCatalogue` bei **jedem** Öffnen achtzehn
   * Miniaturen neu, und keine davon ist billig: ein `clone(true)` über den
   * ganzen GLTF-Baum plus ein `Box3.setFromObject`, das jeden Scheitelpunkt
   * darin anfasst. Genau das war die Pause vor dem ersten Regal.
   *
   * **Ausleihen ist erlaubt und vorgesehen**: Der Konstrukt-Raum hängt die
   * Stücke beim Betreten in seine Bühne und beim Verlassen wieder aus
   * (`shared/construct.ConstructRoom.settle`) — er gibt sie unversehrt zurück
   * und räumt nichts davon weg. Ort und Sichtbarkeit setzt er bei jedem Öffnen
   * neu, es bleibt also auch nichts von der letzten Vorstellung hängen.
   */
  private readonly minis = new Map<string, THREE.Object3D>();
  /**
   * **Was auf welcher Kopierfläche steht** — ein Eintrag je belegtem Kopierer.
   *
   * Eine Karte und kein Feld, weil es mehr als einen Kopierer geben kann: Der
   * Möbelkatalog gibt jedes Katalogstück her, den Kopierer eingeschlossen.
   */
  private readonly plates = new Map<Furnish, Plate>();

  // --- was die Küche hören lässt (`kitchenSound.ts`, `kitchenAudio.ts`) ------
  /**
   * **Der Spieler der Küchengeräusche.**
   *
   * Er gehört der Zone und nicht der Welt: Was hier klingt, klingt nur hier,
   * und beim Verlassen der Küche gehen die Schleifen mit aus (`dispose`). Er
   * wird **beim Bauen** angelegt und nicht beim ersten Ton — ein Feld, das
   * `null` sein kann, hätte in zwölf Zeilen darunter ein Fragezeichen.
   *
   * Beim Bauen wird er **ersetzt** und nicht weiterbenutzt: Ein `dispose`
   * schließt ihn endgültig (die Schleifen müssen weg, sonst brennt der Herd im
   * Gokart weiter), und wer dieselbe Welt ein zweites Mal aufbaut, bekommt
   * sonst einen Spieler, der nichts mehr spielt.
   */
  private sound = new KitchenAudio();
  /**
   * **Welche Variante des Tons gerade läuft, der noch zur Wahl steht**
   * (`kitchenSound.SOUND_TRIALS`) — der Stand der Knöpfe vor dem Möbel.
   *
   * Er steht in der Zone und nicht im Speicher des Browsers, wie der Sender
   * des Radios daneben (`kitchenRadio.RadioState`): Es ist eine Frage, die
   * einmal beantwortet wird, und bis dahin steht die Antwort auf dem Schild
   * des Knopfes, an dem man ohnehin gerade steht.
   */
  private readonly trials = new Map<TrialCue, number>();
  /**
   * **Die Knöpfe dazu**, mit dem, was auf ihnen steht.
   *
   * Der Titel steht daneben und nicht nur im Schild: Weitergeschaltet wird der
   * **Zusatz** darunter (`turnTrial`), und `RedButton.setTitle` setzt beides
   * zusammen — wer den Titel nicht mehr hätte, schriebe ihn beim ersten
   * Weiterschalten weg.
   */
  private readonly trialButtons: { button: RedButton; cue: TrialCue; title: string }[] = [];
  /** Die Uhr des Messers — sie läuft nur, solange irgendwo geschnitten wird. */
  private chopClock = 0;
  /** Das Radio, sein Stand und seine Stelle (`kitchenRadio.ts`). */
  private radio: KitchenRadio | null = null;
  private radioState: RadioState = RADIO_OFF;
  private readonly radioAt = { x: 0, z: 0 };

  // --- der Feuerlöscher ------------------------------------------------------
  /** Ob er gerade pustet, und ob die Auslöser im vorigen Bild schon lagen. */
  private spraying = false;
  /**
   * **Der Stand des Schalters** — und deshalb ein zweiter Merker neben
   * `spraying` darüber.
   *
   * Von oben ist der Löscher ein Schalter (`kitchenSpray.sprayHold`): Ein
   * Druck an, der nächste aus, und dazwischen merkt er sich seinen Stand. Der
   * **Zielstock** daneben merkt sich nichts — er macht an, solange er liegt
   * (`kitchenSpray.sprayAims`). Beides in **einem** Merker zu führen, war der
   * Fehler, der beim Schreiben schon auffiel: Der Stock hätte den Schalter
   * umgelegt, und nach dem Loslassen pustete der Löscher weiter, ohne dass
   * ihn jemand angemacht hätte. Also steht hier, was **geschaltet** ist, und
   * oben, was **an** ist.
   */
  private sprayLatch = false;
  private triggerWas = false;
  private useWas = false;

  // --- der Baumodus ----------------------------------------------------------
  /** Ob der Auslöser im letzten Bild lag — die Flanke, die dreht (`buildTurn`). */
  private turnWas = false;
  /** Ob gerade umgebaut wird (`kitchenBuild.ts`). */
  private editing = false;
  /** Der rote Knopf, der ihn umlegt (`addBuildButton`). */
  private buildButton: RedButton | null = null;
  /**
   * **Der zweite rote Knopf daneben** — er gibt die zweite Hand frei
   * (`addHandsButton`, `core/grabSettings.GrabSettings.twoHands`).
   *
   * Er steht in der Küche und nicht nur im Menü, weil der Wunsch dort entstand,
   * wo man ihn braucht: „neben dem Button _Küche umbauen_ auch einen Button:
   * VR zwei Gegenstände an/aus". In der Brille ist ein Knopf, an dem man
   * vorbeikommt, schneller umgelegt als eine Zeile, die man erst aufschlägt.
   */
  private handsButton: RedButton | null = null;
  /**
   * **Der dritte rote Knopf** — er macht das Spülbecken kaputt
   * (`addLeakButton`, `kitchenLeak.ts`).
   *
   * Er steht nicht bei den beiden anderen am Eingang, sondern **an der Spüle**
   * (`kitchenPlan.LEAK_BUTTON_TILE`): Die beiden dort stellen etwas an der
   * ganzen Küche ein, dieser hier richtet an einem bestimmten Möbel einen
   * bestimmten Schaden an, und man soll von ihm aus sehen, was er anrichtet.
   */
  private leakButton: RedButton | null = null;
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
    // **Und ebenso der Schalter für die zweite Hand** — einmal gelesen, danach
    // am Melder (`core/grabSettings.onGrabChange`). Erst abbestellen, dann
    // anmelden, aus demselben Grund wie eine Zeile darüber.
    this.offGrab?.();
    this.twoHands = grabSettings().twoHands;
    this.offGrab = onGrabChange(() => this.foldHands());
    this.gauges = new KitchenGauges(world.root);
    this.belts = new BeltKit();
    this.joins = new CombinerKit();
    this.mixers = new MixerKit();
    this.griddles = new GriddleKit();
    this.desks = new DeskKit();
    this.jet = new SprayJet(world.root);
    this.leakJet = new LeakJet(world.root);
    // **Zuerst der Boden**, denn auf ihm steht alles andere: Der Grundriss legt
    // den Estrich (`stampKitchen`), die Zone die Fliesen darauf
    // (`kitchenFloor.ts`). Er hängt an der Welt und nicht an einem Möbel — im
    // Baumodus wird die Küche umgestellt, nicht der Boden aufgenommen.
    this.floor = new KitchenFloor(world.root);
    // Der Ofen braucht den Renderer und gibt ohne WebGL und in der Brille
    // `null` zurück (`IconOven.bake`) — dann eben kein Schild an der Ausgabe.
    this.oven = new IconOven(ctx.renderer);

    // **Zuerst die Sperren, und zwar alle** (`kitchenBlocks.ts`). Der
    // Grundriss macht die Kacheln der Möbel schon beim Stempeln teuer
    // (`stampKitchen`), und ein NPC geht deshalb um den Tresen herum, auch
    // wenn nie eine Datei ankommt. Für den Spieler galt das bis hierher
    // nicht: Sein Hindernis entstand erst mit dem Modell, und wer die Küche
    // auf einer langsamen Leitung betritt, lief in diesen Sekunden mitten
    // durch Zeile, Spüle und Herd hindurch — sichtbar wurde es erst, wenn das
    // Bild ihn plötzlich umgab.
    //
    // Die Maße dafür stehen im Katalog und nicht im Netz, und der Katalog ist
    // ohnehin das, wonach diese Küche aufgebaut ist: Was gleich geladen wird,
    // stellt sich in einen Kasten, der schon steht (`addBody` übernimmt ihn),
    // und rückt ihn nicht. Weicht ein Netz von seinen Zahlen ab, gewinnt der
    // Katalog — die Kachelfläche ist der Vertrag, den Aufbau, Wegnetz und
    // Umbau lesen, die Hülle des Netzes ist eine Messung von gestern.
    for (const { spot, block } of kitchenBlocks()) {
      const raised = this.raiseBlock(block);
      if (raised) this.blocks.set(spot, raised);
    }

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
    this.addHandsButton();
    this.addLeakButton();
    this.addTrialButtons();
    this.addRadio();
    // **Die Töne werden jetzt geholt und nicht beim ersten Zischen**
    // (`kitchenAudio.prime`) — dieselbe Entscheidung wie bei den Möbeln
    // darüber, und sie kostet ungefähr dasselbe (1,5 MB gegen 1,7 MB). Eine
    // Pfanne, die in der ersten Sekunde stumm brät, weil ihre Aufnahme noch
    // unterwegs ist, wäre der Fehler, den man für einen fehlenden Ton hält.
    // Ohne Web Audio geht dabei nicht eine einzige Anfrage hinaus.
    this.sound.dispose();
    this.sound = new KitchenAudio();
    // **Der neue Spieler übernimmt, was an den Knöpfen gewählt ist**
    // (`addTrialButtons`). Ohne diese Zeile stünde nach einem Umbau auf dem
    // Schild eine Variante und aus dem Brett käme eine andere — der Spieler
    // ist neu, die Wahl ist es nicht.
    for (const cue of TRIAL_CUES) this.sound.choose(cue, trialAt(cue, this.trialIndex(cue)).files);
    void this.sound.prime();
    // Der Aushang an der Nordwand: dieselbe Wand, an der die Zeile steht, und
    // die einzige, deren Innenseite die Kamera von oben ansieht.
    this.notice = buildKitchenNotice(world.root);

    // Dieselbe Frage wie bei der Figur, und aus demselben Grund: `GLTFLoader`
    // und `import.meta` bringen einen Jest-Lauf zum Stehen, also wird das
    // Modul dort gar nicht erst angefasst (`core/chefFit.canLoadModels`).
    if (!canLoadModels()) return;
    void import('../../../core/kitchenModel').then(async (module) => {
      // **Erst die Zutaten, dann die Möbel** (`kitchenProps.FoodKit.warm`).
      // Das Bild auf einer Ausgabe wird aus der Zutat selbst gebacken
      // (`addIcon`), und der Ofen behält, was er einmal gebacken hat: Wer die
      // Ausgaben vor den Zutaten hinstellt, klebt ein leeres Bild darauf und
      // kommt nie wieder daran vorbei. Die paar Millisekunden kosten hier
      // nichts — gewartet wird ohnehin schon auf die Möbeldatei, und beide
      // liegen danach im selben Zwischenspeicher.
      await this.food.warm();
      for (const spot of KITCHEN_SPOTS) {
        if (this.gone) return;
        const piece = kitchenPiece(spot.name);
        if (!piece || piece.built) continue;
        const model = await module.kitchenModel(spot.name);
        if (!model || this.gone) continue;
        this.place(model, piece, spot, module.takeUtensil);
      }
      // **Zuletzt die Zange**, denn die Arbeitsplatte, auf der sie liegt, ist
      // eines der geladenen Möbel — vorher gäbe es keine Ablage, auf die sie
      // könnte (`layPliers`).
      if (!this.gone) this.layPliers();
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
    this.holdFeet(ctx);
    this.runBelts(dt);
    this.cook(dt);
    this.spray(dt, ctx);
    // **Und die Fontäne aus dem undichten Becken** — nach den Uhren, weil
    // `cook` in diesem Bild entschieden haben kann, dass es wieder dicht ist.
    this.leakSpray(dt);
    // **Nach den Uhren und nach dem Löscher**: Was zu hören ist, hängt an dem,
    // was in diesem Bild geschehen ist — und der Strahl weiß erst nach
    // `spray`, wo seine Düse steht.
    this.listen(dt);
    this.buildTurn(ctx);
    this.facePiece();
    // **Bevor das Getragene gehängt wird**: Wer gerade übergeben hat, soll sein
    // Ding im selben Bild an der neuen Hand sehen und nicht erst im nächsten.
    this.handover(ctx);
    // Die Pfeile auf den Bändern wandern, auch wenn nichts daraufliegt: Ein
    // Band, das erst bei Fracht zeigt, wohin es schiebt, sagt es zu spät.
    this.belts?.update(dt);
    // Und das Licht läuft die Spur auf dem Kopierer entlang, aus demselben
    // Grund wie die Sparren: Ein Gerät, das erst mit einer Vorlage darauf
    // zeigt, wohin die Kopie kommt, zeigt es zu spät.
    this.desks?.update(dt);
    // Die Knöpfe kommen nach dem Druck wieder hoch — von allein tun sie es nicht.
    this.buildButton?.update(dt);
    this.handsButton?.update(dt);
    this.leakButton?.update(dt);
    for (const trial of this.trialButtons) trial.button.update(dt);
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
   * voreingestellt 115 cm), die Füße bleiben auf dem Boden, und das Bücken
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
   * **In der Küche wird nicht gesprungen** (`PlayerRig.jumpLock`).
   *
   * Dasselbe Rechteck wie bei der Augenhöhe (`kitchenPlan.inKitchen`,
   * `layout.KITCHEN` mit einem Meter Vorlauf) — und wieder eine Rechnung
   * statt einer zweiten Liste von Zahlen.
   *
   * Hier drin hat ein Sprung nichts zu suchen: Die Möbel sind ohnehin bis auf
   * 1,40 m gesperrt, damit niemand auf der Küchenzeile steht
   * (`kitchenBlocks.BLOCK_HEIGHT`) — was bleibt, ist ein Hüpfen zwischen Herd
   * und Spüle, mitten in der Arbeit. In der Brille ist es zudem derselbe
   * Knopf, der etwas benutzt (`A`, `PlayerRig.update`): Wer vor der Ausgabe
   * daneben zielt, hüpfte bisher, statt den Teller zu nehmen.
   *
   * **Anders als die Augenhöhe gilt das in jeder Ansicht.** Die Stauchung
   * korrigiert eine echte Augenhöhe und die gibt es nur in der Brille; der
   * Sprung ist eine Regel des Raums, und eine Regel, die am Bildschirm nicht
   * gälte, wäre keine.
   *
   * Jedes Bild neu gesetzt, drinnen wie draußen: Ein Merker, der nur gesetzt
   * und nie gelöscht wird, ist ein Spieler, der nach der Küche auf der Wiese
   * nicht mehr abspringt.
   */
  private holdFeet(ctx: WorldContext): void {
    ctx.rig.jumpLock = inKitchen(_feet.x, _feet.z);
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
        case 'sink':
          // **Am Becken laufen zwei Uhren**, und es ist die einzige Station,
          // an der das vorkommt: die Arbeit **darin** (der Teller wird
          // gespült, dieselbe Zeile wie am Brett) und der Schaden **am Möbel
          // selbst** (`kitchenLeak.ts`). Die beiden gehen sich nicht ins
          // Gehege — solange es spritzt, nimmt das Becken ohnehin nichts an
          // (`kitchenCarry.atSink`) —, und genau deshalb sind es zwei
          // Rechnungen und nicht eine mit einem Sonderfall darin.
          this.leakFrame(spot, dt);
          this.workFrame(spot, dt);
          break;
        case 'board':
        case 'mixer':
        case 'griddle':
          // **Alle Arbeitsmöbel stehen in derselben Zeile**, und das ist
          // die ganze Umsetzung ihrer Unterschiede: Dass Mixer und Kochstelle
          // auch dann weiterlaufen, wenn niemand danebensteht, entscheidet
          // `kitchenWork.WORK_ALONE`; dass auf der Kochstelle nichts
          // verbrennt, entscheidet `kitchenWork.workStage`. Die Zone fragt
          // nirgends, welches der vier Möbel sie gerade in der Hand hat.
          //
          // **Welche es sind, steht nicht hier**, sondern in
          // `kitchenCarry.STATION_WORK` — die Aufzählung daneben ist nur die
          // Gegenprobe des Übersetzers, dass jede Art einen Zweig hat. Die
          // Spüle steht deshalb einen Zweig höher und ruft dieselbe Zeile:
          // Sie arbeitet wie die anderen, sie kann nur zusätzlich kaputtgehen.
          this.workFrame(spot, dt);
          break;
        case 'combiner':
          this.combinerFrame(spot, dt);
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
      // **Der Warnton hängt am verbrannten Patty** und nicht an der Anzeige
      // daneben: Genau in diesem Bild fängt die Frist an, in der man noch zum
      // Löscher kommt (`kitchenClock.FIRE_SECONDS`), und genau dann geht das
      // rote Dreieck auf (`showGauges`). Ein Ton, der stattdessen am
      // Phasenwechsel der Anzeige hinge, käme dasselbe Bild später und wäre
      // beim nächsten Umbau der Anzeige weg.
      if (tick.turned === 'patty-burnt') this.sound.play('warn', this.heardAt(spot.deck, 'warn'));
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
    const tick = advanceWork(spot.work, dt, near, !this.handsFull() && !this.editing);
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
      // Der saubere Teller kommt von selbst in die Hand, ohne dass jemand
      // gegriffen hätte — zu hören ist trotzdem ein Griff, denn genau das
      // geschieht (`kitchenWork.WORK_TO_HAND`).
      this.sound.play('pick', this.heardAt(spot.deck, 'pick'));
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
   * **Ein Bild am Kombinierer** — er holt sich von der Seite, was auf das
   * gehört, was auf ihm liegt.
   *
   * Drei Zeilen Zone und eine Rechnung nebenan (`kitchenCombiner.ts`), und die
   * Aufteilung ist dieselbe wie überall hier: Welche Kachel hinter dem Pfeil
   * liegt und was darauf steht, weiß nur die Zone; ob daraus etwas wird und
   * wie lange es dauert, ist eine Frage über Gerichte und Sekunden und hat
   * dort einen Test.
   *
   * **Was er sich holt, fährt sichtbar herüber.** Die Fahrt ist dieselbe Geste
   * wie auf einem Band — ein Ding, das zwischen zwei Kachelmitten hängt
   * (`kitchenBelt.BeltCarry`) —, nur rechnet sie hier die Uhr des Kombinierers
   * aus. Ohne sie verschwände das Patty auf der einen Kachel und erschiene
   * zwei Sekunden später auf der anderen, und niemand wüsste, wer es geholt
   * hat.
   *
   * **Eine Vorratskiste darf auch Quelle sein**, und dann entsteht das Ding
   * beim Anfangen (`sprout`) — genau wie beim Zugband. Damit steht der
   * Kombinierer direkt neben einer Brötchenkiste und legt auf, was sie
   * hergibt, ohne dass ein Band dazwischen muss.
   */
  private combinerFrame(spot: Station, dt: number): void {
    const step = beltReach(spot.home.turn);
    const back = this.stationAt(spot.home.x + step.dx, spot.home.z + step.dz);
    // Was schon fährt, fährt zu Ende und wird nicht nebenbei abgezweigt —
    // derselbe Satz wie in `advanceBelts`, und hier ist er die einzige Stelle,
    // an der ein Kombinierer von der Bandrechnung überhaupt Notiz nimmt.
    const ready =
      back && !back.belt.moving && beltReleases(back.kind, back.work.working)
        ? combinerTakes(spot.on?.dish ?? null, this.offerAt(back))
        : null;
    const tick = advanceCombine(spot.join, dt, back && ready?.ok ? back.key : null, ready);
    const was = spot.join;
    spot.join = tick.state;

    if (tick.state.working && back) {
      // **Jetzt entsteht es, wenn es aus einer Kiste kommt** — im ersten Bild
      // des Handgriffs, damit man die ganze Fahrt sieht.
      if (was.from !== tick.state.from && this.sprout(back)) this.refreshStations();
      const load = back.on;
      if (load) load.object.position.lerpVectors(back.deck, spot.deck, combineProgress(tick.state));
    }

    // **Ein abgebrochener Handgriff stellt zurück.** Was halb herübergefahren
    // ist, steht sichtbar zwischen zwei Kachelmitten; wird der Handgriff
    // abgebrochen — jemand nimmt die Zutat weg, ein Band fährt sie fort, der
    // Kombinierer läuft voll —, bliebe es dort für immer stehen. Gefragt wird
    // die **alte** Kachel (`was.from`) und nicht die neue: Abgebrochen hat
    // genau die, an der es hing.
    if (was.working && !tick.state.working && !tick.done) {
      const last = was.from ? this.stationByKey(was.from) : null;
      if (last?.on) this.restOn(last, last.on);
    }

    const done = tick.done;
    if (!done?.ok || !back) return;
    // **Die Zutatenseite zuerst**, denn sie kann ihr Netz behalten: Die Pfanne
    // gibt ihr Patty her und bleibt stehen (`kitchenRecipes.stackOn` gibt sie
    // als `held` zurück), alles andere wandert ganz hinüber und ist danach
    // weg. `layOn` setzt die Bleibende auf ihre Kachelmitte zurück — sie hat
    // die halbe Strecke schon zurückgelegt, und dort darf sie nicht stehen
    // bleiben (derselbe Handgriff wie in `dumpInBin`).
    const load = back.on;
    if (load) {
      if (done.held) {
        this.restyle(load, done.held);
        this.layOn(back, load);
      } else {
        back.on = null;
        this.settle(back);
        this.discard(load);
      }
    }
    // Und die Unterlage bekommt ihren neuen Stand. **Ohne `settle`**: Der
    // Kombinierer führt keine Uhr, die davon anfinge, und `spot.join` steht
    // nach `advanceCombine` schon richtig.
    if (spot.on) this.restyle(spot.on, done.target ?? spot.on.dish);
    // Derselbe Ton wie beim Zusammenlegen von Hand (`kitchenSound.DEED_SOUNDS`,
    // `combine`): Ob eine Hand oder ein Möbel zwei Zutaten zu einer macht, ist
    // für die Ohren dasselbe Ereignis — und in einer Halle voller Bandstraßen
    // ist es das einzige, an dem man hört, dass sie noch läuft.
    this.sound.play('combine', this.heardAt(spot.deck, 'combine'));
    this.world?.notify(
      `${layered(done.moved)
        .map((item) => ITEM_LABELS[item])
        .join(', ')} auf ${spot.label}`,
    );
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
   * oder im Mixer liegt, bleibt liegen.
   *
   * **Und die Sorte Band steht jetzt im Aufruf**, weil zwei der drei Sorten
   * greifen und jede anders: Ein Zugband nimmt, was da ist, ein Filterband nur
   * das, was es gelernt hat, und ein gewöhnliches Band fragt gar nicht erst
   * (`kitchenBelt.beltGrabs`).
   */
  private beltSource(spot: Station, kind: BeltKind): Station | null {
    if (!beltGrabs(kind)) return null;
    const step = beltReach(spot.home.turn);
    const back = this.stationAt(spot.home.x + step.dx, spot.home.z + step.dz);
    // **Auch ein Kombinierer mitten im Handgriff gibt nichts her.** Er führt
    // seine eigene Uhr (`kitchenCombiner.ts`) und nicht die des Bretts, und
    // ohne diese Zeile risse ein Zugband ihm das Brötchen unter dem Patty weg,
    // das gerade zu ihm unterwegs ist — der Handgriff liefe zu Ende und legte
    // auf nichts auf. Beide Uhren stehen nebeneinander im selben `oder`, weil
    // die Frage dieselbe ist: Arbeitet dieses Möbel gerade?
    if (!back || !beltReleases(back.kind, back.work.working || back.join.working)) return null;
    // **Ein Kombinierer gibt nur her, was er selbst zusammengelegt hat**
    // (`kitchenCombiner.combinerHolds`). Ohne diese Zeile nähme ein Zugband
    // das Brötchen mit, bevor das Patty da ist — die Straße liefe, und
    // heraus kämen nackte Brötchen. Die Frage steht hier und nicht in
    // `beltReleases`, weil sie nicht nur die Stationsart braucht, sondern auch
    // den Stand seiner Uhr — derselbe Fall wie beim Mülleimer eine Methode
    // weiter oben.
    if (back.kind === 'combiner' && combinerHolds(back.join)) return null;
    // **Und ein Filterband fragt noch einmal nach**, diesmal nach dem Ding
    // (`kitchenBelt.beltWants`). Die Regel steht dort, hier steht nur, was
    // nebenan liegt — und bei einer Vorratskiste ist das, was sie hergibt, und
    // nicht das, was auf ihrem Deckel steht (`offerAt`).
    if (kind === 'smart' && !beltWants(spot.home.filter, this.offerAt(back)?.item ?? null)) {
      return null;
    }
    return back;
  }

  /**
   * **Was diese Station einem Nachbarn anzubieten hat** — das Liegende, oder
   * bei einer Vorratskiste das, was sie hergibt.
   *
   * Die eine Stelle, an der „auf der Kachel liegt etwas" und „aus der Kachel
   * kommt etwas" zusammenfallen, und sie fallen absichtlich hier zusammen und
   * nicht dreimal verteilt: Ein Filterband will wissen, ob es zugreifen darf,
   * ein Kombinierer, ob er anfangen kann, und die Bandrechnung, ob die Kachel
   * als belegt zählt (`kitchenBelt.beltRefills`). Dreimal dieselbe Frage mit
   * drei Antworten wäre die Küche, in der ein Filterband eine Kiste ignoriert,
   * die ein Zugband daneben leerzieht.
   *
   * **Das Liegende geht vor**, wie überall an einer Kiste
   * (`kitchenCarry.fromBox`): Was jemand auf den Deckel gestellt hat, hat er
   * dort hingestellt, und frisch gibt es die Kiste ja noch beliebig oft.
   */
  private offerAt(spot: Station): Dish | null {
    if (spot.on) return spot.on.dish;
    if (beltRefills(spot.kind) && spot.gives) return dish(spot.gives);
    return null;
  }

  /**
   * **Ein frisches Ding auf den Deckel einer Vorratskiste** — genau in dem
   * Bild, in dem es losfährt.
   *
   * Eine Kiste gibt aus dem Nichts aus (`kitchenCarry.fromBox`), die
   * Bandrechnung nebenan kennt aber nur Kacheln, die belegt oder frei sind.
   * Also wird sie für die Rechnung als belegt gemeldet (`beltRefills`) — und
   * sobald die Rechnung sagt „von hier fährt jetzt etwas los", steht das Ding
   * auch wirklich da. Zwei Sekunden lang liegt es dann auf dem Deckel und
   * fährt sichtbar herüber; wer in der Zeit danach greift, bekommt es
   * (dieselbe Regel wie für jedes andere Ding auf einer Kiste).
   *
   * **Ohne `settle`**, und das ist der springende Punkt: `layOn` stellt die
   * Uhren der Station neu, und dazu gehört der Fahrtzustand
   * (`kitchenBelt.BELT_EMPTY`). Der ist in diesem Bild aber gerade gesetzt
   * worden — eine Kiste, die ihn sich selbst wieder löschte, führe jedes Bild
   * von vorn los und käme nie an.
   *
   * @returns ob wirklich etwas entstanden ist
   */
  private sprout(spot: Station): boolean {
    if (spot.on || !spot.gives) return false;
    const fresh = this.make(dish(spot.gives));
    if (!fresh) return false;
    spot.on = fresh;
    this.world?.root.add(fresh.object);
    fresh.object.rotation.set(0, 0, 0);
    this.restOn(spot, fresh);
    // **Auch eine Kiste, die von selbst ausgibt, klappt auf.** Es ist derselbe
    // Ton wie beim Griff von Hand (`kitchenSound.deedSound`, Station `box`) —
    // und in der Werkhalle, wo niemand danebensteht, ist er der Anfang jeder
    // Bandstraße: Wer ihn hört, weiß, dass die Straße wieder nachschiebt.
    this.sound.play('crate', this.heardAt(spot.deck, 'crate'));
    return true;
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
    // **Erst nachsehen, wer schon vergeben ist.** Ein Kombinierer, dessen Uhr
    // läuft, hat sich eine Nachbarkachel genommen — die darf in diesem Bild
    // weder weiterschieben noch von einem Zugband leergezogen werden. Die
    // Menge steht vor der Schleife, weil die Kachel in ihr vor **oder** nach
    // ihrem Kombinierer drankommt und eine Antwort, die davon abhängt, keine
    // ist.
    let busy: Set<string> | null = null;
    for (const spot of this.stations) {
      if (spot.home.held || !spot.join.working || !spot.join.from) continue;
      (busy ??= new Set()).add(spot.join.from);
    }
    const claimed: ReadonlySet<string> = busy ?? NO_CLAIMS;
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
      const from = kind ? this.beltSource(spot, kind) : null;
      tiles.push({
        id: spot.key,
        // **Eine Vorratskiste zählt als belegt** (`kitchenBelt.beltRefills`):
        // Auf ihr liegt nichts, und trotzdem ist dort etwas zu holen. Was ein
        // Zugband von ihr abholt, entsteht erst beim Losfahren (`sprout`) —
        // bis dahin ist die Meldung ein Versprechen, und die Rechnung nebenan
        // braucht nur dieses.
        loaded: spot.on !== null || (beltRefills(spot.kind) && spot.gives !== undefined),
        state: spot.belt,
        // **Was ein Kombinierer gerade herüberholt, schiebt nicht weg.** Er
        // führt seine eigene Uhr und steht nicht in dieser Rechnung; ohne
        // diese Zeile schöbe ein Band das Patty in dem Augenblick nach Süden
        // weiter, in dem der Kombinierer es sich nach Westen holt — und
        // welches von beiden gewänne, entschiede die Reihenfolge der
        // Stationen. Ein Möbel, das einen Handgriff angefangen hat, bekommt
        // ihn zu Ende (derselbe Satz wie in `advanceBelts`: Losfahren ist ein
        // Versprechen).
        to: claimed.has(spot.key) ? null : (to?.key ?? null),
        // **Und gezogen wird sie auch nicht.** Dieselbe Vormerkung, von der
        // anderen Seite gelesen: Ein Zugband, das sich die Kachel holte, an
        // der ein Kombinierer schon arbeitet, nähme ihm das Patty auf halber
        // Strecke weg — und der Handgriff liefe zu Ende und legte auf nichts
        // auf. Beide Zeilen stehen nebeneinander, weil sie **eine**
        // Entscheidung sind: Diese Kachel ist in diesem Bild vergeben.
        pull: from && !claimed.has(from.key) ? from.key : null,
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
      if (!next) continue;
      spot.belt = next;
      // **Jetzt entsteht das Brötchen**, und keinen Augenblick früher: Die
      // Kiste hat sich als belegt gemeldet, die Rechnung hat daraufhin eine
      // Fahrt begonnen — und was fährt, muss man sehen können (`sprout`).
      if (next.moving && beltRefills(spot.kind) && this.sprout(spot)) this.refreshStations();
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
      // losfährt. Bleibt trotzdem etwas übrig — eine zwölfte Tat, ein
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
   * **Und derselbe Stock macht ihn am Schirm auch an**
   * (`kitchenSpray.sprayAims`). Zielen und Auslösen sind an einem Gerät, das
   * man ins Feuer hält, ein Handgriff: Wer mit dem Löscher in der Hand den
   * rechten Stock auslenkt, pustet — und hört auf, sobald er ihn loslässt. Der
   * Schalter daneben bleibt, wie er war; welcher von beiden gerade anhat,
   * steht in `sprayLatch` und `spraying`.
   *
   * **Und es gibt keinen zweiten Weg mehr.** Neben dem Strahl stand lange ein
   * `douse`-Griff am brennenden Herd — ein Druck auf `A` davor, und das Feuer
   * war aus. Er ist weg: Wer den Löscher trägt, findet an keiner Station mehr
   * ein Angebot außer der Fläche, auf die er ihn stellt
   * (`kitchenCarry.extinguisherRests`), und genau deshalb ist der Knopf vor dem
   * brennenden Herd frei für das, was der Auftrag will — den Löscher anmachen.
   * Die **leere** Herdplatte ist so eine Fläche: Dort legt derselbe Druck ihn
   * ab, genau wie auf der Zeile und seit Neuestem auf dem **Förderband**.
   */
  private spray(dt: number, ctx: WorldContext): void {
    // **Der Löscher kann in jeder der beiden Hände liegen**, seit beide tragen
    // dürfen — also wird er gesucht und nicht an einer festen Stelle vermutet.
    // Was gefunden wird, bringt seine Hand mit: Der Strahl kommt aus **der**
    // Hand, die ihn hält (`aimJet`), und nicht aus der, die zuletzt etwas
    // getan hat.
    const found = this.extinguisher();
    const held = found?.thing ?? null;
    const carrying = held !== null;
    // In der Brille der echte Trigger **der Hand, die ihn hält**, sonst der
    // Benutzen-Knopf, **solange er liegt** (`PlayerRig.useHeld`) — am Schirm
    // ist das die einzige Taste, die in jeder Ansicht ein Halten kennt.
    //
    // Hier stand die rechte Hand, und das war richtig, solange die Küche eines
    // trug und der Löscher damit fast immer rechts lag. Seit beide Hände
    // tragen dürfen, wäre es ein Löscher, der links hängt und sich rechts
    // auslösen lässt — dieselbe Auskunft wie beim Zielen (`aimJet`), also
    // dieselbe Hand. Ohne Hand (er hängt vor dem Bauch) bleibt es die rechte.
    const pullHand = found?.hand ?? 'right';
    const pulled = ctx.renderer.xr.isPresenting
      ? (ctx.input.get(pullHand)?.trigger.pressed ?? false)
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
    //
    // **Und mit dem Löscher in der Hand steht fast nie mehr etwas da.** Das ist
    // dieselbe Zeile wie vorher und trotzdem der ganze Unterschied: Seit eine
    // Station, an der man den Löscher nicht abstellt, gar nichts mehr anbietet
    // (`kitchenCarry.extinguisherRests`), meldet sie sich auch nicht mehr an —
    // `useCandidate` bleibt vor der **belegten** Herdplatte, dem Brett und der
    // Spüle falsch, und `A` gehört dem Löscher. Vor einer **Arbeitsplatte**
    // bleibt es, wie es war: Dort legt derselbe Druck ihn ab, und ebenso auf
    // der leeren Herdplatte und auf dem Band.
    const trigger = ctx.rig.trigger > 0.5;
    const useFree = ctx.rig.useHeld && !ctx.rig.useCandidate;
    const pressed = (trigger && !this.triggerWas) || (useFree && !this.useWas);
    this.triggerWas = trigger;
    this.useWas = useFree;
    // **Und damit gehört `A` dem Löscher und nicht dem Sprung**
    // (`core/PlayerRig.useBusy`). Ohne diese Zeile tat der Knopf zwei Dinge auf
    // einmal: Der Löscher ging an, und die Figur hüpfte dazu — gemeldet aus dem
    // Spiel, und von oben auch genau so zu sehen. Wann er vergeben ist, steht
    // in der Regel nebenan (`kitchenSpray.sprayClaimsUse`) und wird dort
    // nachgerechnet; hier steht nur, wer gefragt wird.
    ctx.rig.useBusy = sprayClaimsUse(carrying, ctx.renderer.xr.isPresenting);
    const sprayed = this.sprayLatch;
    this.sprayLatch = sprayOn(this.sprayLatch, {
      pressed,
      held: pulled,
      carried: carrying,
      topDown: ctx.topDown,
    });
    // **Und der Zielstock macht ihn auch an** (`kitchenSpray.sprayAims`). Am
    // Schirm zielt der rechte Stock, und wer mit dem Löscher in der Hand
    // zielt, will löschen — das ist ein Daumen für einen Handgriff statt
    // zweier. Er steht **neben** dem Schalter und nicht in ihm: Der Schalter
    // merkt sich seinen Stand (`sprayLatch`), der Stock nicht, und an ist der
    // Löscher, wenn einer von beiden es sagt.
    this.spraying =
      this.sprayLatch || sprayAims(carrying, ctx.renderer.xr.isPresenting, ctx.rig.aiming);
    // **Ein Schalter sagt, in welcher Stellung er steht** — aber nur, wo er
    // einer ist (`kitchenSpray.sprayHold`). Von oben bleibt der Löscher an,
    // ohne dass jemand eine Taste hält, und seit der Herd davor nichts mehr
    // anbietet, steht dort auch kein Hinweis mehr über der Station; ohne ein
    // Wort wäre das erste Anmachen ein Druck ins Nichts, der irgendwo Nebel
    // macht. Gehalten wird dagegen nichts gesagt: Wer den Finger auf dem
    // Auslöser hat, weiß, dass es läuft, und bekäme bei jedem Antippen eine
    // Meldung — und **der Zielstock ist ein Halten** und kein Schalter, also
    // wird hier der Schalter verglichen und nicht das, was am Ende pustet.
    if (this.sprayLatch !== sprayed && sprayHold(ctx.topDown) === 'toggle') {
      this.world?.notify(this.sprayLatch ? 'Feuerlöscher an' : 'Feuerlöscher aus');
    }

    // **Und wohin er zielt**: in der Brille dorthin, wohin die Hand zeigt, die
    // ihn hält — sonst weiter dorthin, wohin die Figur schaut (`aimHand`).
    this.aimJet(ctx, found?.hand ?? null);

    if (held) {
      // Die Düse ist das Ende des Löschers in der Hand, nicht die Brust: Ein
      // Strahl, der aus dem Bauch käme, ginge bei jedem Blick nach unten in
      // den Boden.
      held.object.getWorldPosition(_nozzle);
    } else {
      _nozzle.copy(_feet).setY(_feet.y + CHEF_CARRY.y);
    }
    this.jet?.update(dt, this.spraying, _nozzle, _jet);

    for (const spot of this.stations) {
      if (spot.kind !== 'stove') continue;
      const hit = this.spraying && spot.stove.fire && inSpray(_nozzle, _jet, spot.deck);
      const tick = advanceDouse(spot.wet, dt, hit);
      spot.wet = tick.state;
      if (!tick.out) continue;
      this.putOut(spot);
    }
  }

  /**
   * **Wohin der Löscher pustet** — und das ist seit diesem Auftrag die
   * **Hand** und nicht mehr der Körper.
   *
   * „Beim Feuerlöscher will ich in die Richtung sprühen, in die meine Hand
   * zeigt, nicht in der mein Körper gedreht ist." Genau das war der
   * Unterschied: `_aim` kommt aus Rig und Kopf (`aim`) und ist damit die
   * Richtung, in der man **steht** — wer sich zum brennenden Herd hindreht,
   * ohne den Kopf mitzudrehen, pustete daran vorbei. In der Brille gibt es
   * eine bessere Auskunft, und sie ist dieselbe, mit der man in dieser Welt
   * auf alles zielt: der Zeigestrahl des Controllers, der den Löscher hält.
   *
   * **Waagerecht gemacht**, wie `aim` es auch tut: Gerechnet wird der Strahl
   * auf dem Boden (`kitchenSpray.inSpray`, x und z), und wer senkrecht nach
   * unten zeigt, hat keine waagerechte Richtung mehr — dann bleibt die des
   * Körpers stehen, statt dass der Kegel in sich zusammenfällt.
   *
   * **Und nur in der Brille**: Von oben und am Schreibtisch gibt es keine
   * Hand, die irgendwohin zeigt (`worlds/portal/screenHand.ts` hält nur ein
   * Werkzeug), also gilt dort weiter der Blick — Zeile für Zeile das, was
   * vorher galt.
   *
   * @param side die Hand, an der der Löscher **hängt** (`Hold.hand`) — nicht
   *             die, die zuletzt etwas getan hat. Seit beide Hände tragen
   *             dürfen, sind das zwei verschiedene Auskünfte, und ein Strahl
   *             aus der falschen Hand ginge an der leeren Faust entlang.
   *             `null` heißt: kein Löscher in der Hand, oder er hängt vor dem
   *             Bauch.
   */
  private aimJet(ctx: WorldContext, side: Handedness | null): void {
    _jet.copy(_aim);
    if (!side || !ctx.renderer.xr.isPresenting) return;
    const controller = ctx.input.get(side);
    if (!controller?.tracked) return;
    controller.getRay(_handRay);
    const flat = Math.hypot(_handRay.direction.x, _handRay.direction.z);
    if (flat < 1e-4) return;
    _jet.set(_handRay.direction.x / flat, 0, _handRay.direction.z / flat);
  }

  /** Das Feuer ist aus — die Pfanne bleibt, ihr Inhalt ist verkohlt und weg. */
  private putOut(spot: Station): void {
    spot.stove = douse(spot.stove);
    spot.wet = DRY;
    const pan = spot.on;
    if (pan) this.restyle(pan, dish(pan.dish.item));
    this.settle(spot);
    // **Hier und nicht in der Tabelle der Taten** (`kitchenSound.DEED_SOUNDS`):
    // Gelöscht wird auf zwei Wegen — mit `A` am Herd und mit dem Strahl quer
    // durch die Küche —, und beide kommen hier vorbei.
    this.sound.play('douse', this.heardAt(spot.deck, 'douse'));
    this.world?.notify('Feuer gelöscht');
    this.refreshStations();
  }

  // --- was die Küche hören lässt ----------------------------------------------

  /**
   * **Ein Bild für die Ohren** — die Schleifen und der Takt des Messers.
   *
   * Sie steht **nach** den Uhren in `update`, und das ist keine Feinheit: Was
   * zu hören ist, ist der Zustand **nach** diesem Bild. Wer vorher hörte,
   * hörte das Feuer von gestern — dieselbe Reihenfolge, aus der auch die
   * Anzeigen nach den Uhren kommen.
   *
   * **Gesammelt wird, gerechnet wird nebenan.** Diese Methode weiß, welche
   * Station gerade zischt und wo sie steht; wie laut das beim Zuhörer ankommt
   * und von welcher Seite, rechnet `kitchenSound.ts` — und dort hat es einen
   * Test. Von mehreren gleichen Quellen zählt die nächste (`kitchenNearest`):
   * Vier brennende Herde sind ein Feuer und nicht vier.
   */
  private listen(dt: number): void {
    const ear: KitchenEar = { x: _feet.x, z: _feet.z, ax: _aim.x, az: _aim.z };

    const sizzling: KitchenSpotAt[] = [];
    const burning: KitchenSpotAt[] = [];
    const rinsing: KitchenSpotAt[] = [];
    const chopping: KitchenSpotAt[] = [];
    const fixing: KitchenSpotAt[] = [];
    for (const spot of this.stations) {
      // Ein Möbel in den Händen arbeitet nicht (`cook`) — und klingt auch nicht.
      if (spot.home.held) continue;
      const at: KitchenSpotAt = { x: spot.deck.x, z: spot.deck.z };
      if (spot.kind === 'stove') {
        const phase = stovePhase(spot.stove);
        if (phase === 'fire') burning.push(at);
        else if (phase !== 'cold') sizzling.push(at);
        continue;
      }
      // **Ein undichtes Becken rauscht wie ein spülendes** — es ist dasselbe
      // Wasser aus demselben Hahn, nur an der falschen Stelle
      // (`kitchenLeak.ts`). Es steht **vor** der Frage nach der Arbeit, weil
      // darin gerade nicht gearbeitet wird: Solange es spritzt, nimmt die
      // Spüle nichts an.
      if (spot.leak.leaking) {
        rinsing.push(at);
        // **Und die Zange ratscht dazu**, solange jemand daran arbeitet
        // (`kitchenLeak.LeakState.fixing`). Das war der gemeldete Wunsch:
        // „beim Reparieren des Waschbecken bitte noch ein
        // Schraubenschlüssel-Ratsch-Geräusch abspielen (erkennbar, dass es
        // repariert wird)." Sie klingt **am Becken** und nicht in der Hand:
        // Repariert wird, wo das Wasser ist, und wer danebensteht, hört es
        // von derselben Seite wie das Rauschen.
        if (spot.leak.fixing) fixing.push(at);
        continue;
      }
      if (!spot.work.working) continue;
      // **Welche Arbeit wie klingt**, und das sind genau drei Antworten: Die
      // Spüle rauscht, die Kochstelle brutzelt wie eine Pfanne, Brett und
      // Mixer schlagen im Takt. Gefragt wird die **Arbeit** und nicht das
      // Möbel — der Mixer soll klingen wie das Brett, weil er dasselbe tut
      // (`kitchenWork.WorkKind`).
      if (spot.work.kind === 'wash') rinsing.push(at);
      else if (spot.work.kind === 'fry') sizzling.push(at);
      else chopping.push(at);
    }
    this.sound.loop('sizzle', kitchenNearest(ear, sizzling, reachOf('sizzle')));
    this.sound.loop('fire', kitchenNearest(ear, burning, reachOf('fire')));
    this.sound.loop('rinse', kitchenNearest(ear, rinsing, reachOf('rinse')));
    this.sound.loop('ratchet', kitchenNearest(ear, fixing, reachOf('ratchet')));

    // **Das Messer ist kein Dauerton, sondern ein Takt** — und er läuft nur,
    // solange irgendwo geschnitten wird. Hört das auf, fällt die Uhr auf null
    // zurück: Der nächste Schnitt soll mit dem ersten Schlag anfangen und
    // nicht mit dem Rest von vorhin.
    const knife = kitchenNearest(ear, chopping, reachOf('chop'));
    if (!knife) {
      this.chopClock = 0;
    } else {
      const beat = kitchenBeat(this.chopClock, dt, CHOP_BEAT);
      this.chopClock = beat.clock;
      if (beat.hit) this.sound.play('chop', knife);
    }

    // Der Strahl zischt aus der Düse und nicht aus dem Herd, auf den er zielt.
    this.sound.loop('spray', this.spraying ? this.heardAt(_nozzle, 'spray') : null);

    // Und das Radio spielt seinen Sender, solange es an ist.
    this.sound.loop(
      'radio',
      this.radioState.on ? kitchenHeard(ear, this.radioAt, reachOf('radio')) : null,
      this.radioState.station,
    );
  }

  /**
   * **Wie ein Ton von dieser Stelle beim Zuhörer ankommt** — die Kurzform.
   *
   * Der Ton gehört mit dazu und ist kein Beiwerk: Wie weit etwas trägt, steht
   * an ihm (`kitchenSound.KitchenCueSpec.reach`) und nicht an der Stelle. Das
   * Radio ist in der ganzen Küche gleich laut, der Teller, der abgestellt
   * wird, nur dort, wo er abgestellt wird.
   */
  private heardAt(at: THREE.Vector3, cue: KitchenCue): KitchenHeard {
    return kitchenHeard(
      { x: _feet.x, z: _feet.z, ax: _aim.x, az: _aim.z },
      { x: at.x, z: at.z },
      reachOf(cue),
    );
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
    if (phase === 'work' || phase === 'eat' || phase === 'douse' || phase === 'fix') {
      const part =
        phase === 'work'
          ? spot.kind === 'combiner'
            ? combineProgress(spot.join)
            : workProgress(spot.work)
          : phase === 'eat'
            ? eatProgress(spot.table)
            : phase === 'fix'
              ? fixProgress(spot.leak)
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
  private phaseOf(spot: Station): KitchenPhase {
    // **Die Reparatur steht vor der Arbeit im Becken**, und zwar aus demselben
    // Grund, aus dem der Nebel vor dem Feuer steht: Solange es spritzt, nimmt
    // die Spüle nichts an (`kitchenCarry.atSink`) — was einen dann
    // interessiert, ist, wie lange es noch bis dicht ist.
    if (spot.leak.fixing) return 'fix';
    if (spot.kind === 'stove') {
      if (spot.stove.fire && spot.wet.time > 0) return 'douse';
      return stovePhase(spot.stove);
    }
    if (spot.kind === 'table') return eatProgress(spot.table) > 0 ? 'eat' : 'cold';
    // **Der Kombinierer bekommt denselben Balken wie das Brett**, und das ist
    // die Absicht: Von oben ist „hier dauert es noch" dieselbe Auskunft, egal
    // ob geschnitten oder zusammengelegt wird. Ein eigenes Zeichen für ein
    // Möbel, das ohnehin zwei Sekunden braucht, wäre eine zweite Vokabel für
    // dieselbe Sache (`kitchenGauge`).
    if (spot.kind === 'combiner') return combineProgress(spot.join) > 0 ? 'work' : 'cold';
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
   *
   * **Und seit die Küche je Seite ein Fach führt** (`holds`), ist daraus eine
   * Schleife geworden statt einer Zeile: Mit dem Schalter _zwei Gegenstände_
   * aus läuft sie genau einmal — es gibt genau ein Fach —, mit ihm an zweimal,
   * und jedes Fach geht an **seine** Hand. Das Möbel steht trotzdem allein
   * davor: Es schließt jedes Essen aus (`takeFromCatalogue`, `toggleEdit`),
   * teilt sich also nie die Stelle vor dem Bauch mit einem Teller.
   */
  private carryInHands(ctx: WorldContext): void {
    // **Das getragene Möbel zuerst**, denn es teilt sich die Stelle vor dem
    // Bauch mit dem Essen und schließt es aus (`takeFromCatalogue`,
    // `toggleEdit`): Wer Möbel trägt, trägt sonst nichts.
    this.aimHeld();
    this.shrinkPiece(ctx);
    const piece = this.lifted?.model ?? null;
    if (piece) {
      if (ctx.renderer.xr.isPresenting) {
        piece.position.set(0, ctx.rig.camera.position.y - 0.62, -0.42);
        ctx.avatar.carry = null;
      } else {
        piece.position.set(CHEF_CARRY.x, carryY(ctx), CHEF_CARRY.z);
        ctx.avatar.carry = CARRY_POINT.set(CHEF_CARRY.x, carryY(ctx), CHEF_CARRY.z);
      }
      return;
    }
    if (this.holds.size === 0) {
      ctx.avatar.carry = null;
      return;
    }
    // **Jedes Fach an seine eigene Hand** (`holdInHand`). Mit dem Schalter aus
    // ist das genau ein Durchgang — die Küche trägt eines —, mit ihm an zwei,
    // und keines der beiden weiß vom anderen.
    let atBelly = 0;
    for (const hold of this.holds.values()) {
      const thing = hold.thing;
      if (ctx.renderer.xr.isPresenting) {
        // **In der Brille liegt es in der Hand**, an seinem Griff — die Pfanne
        // am Stiel, wie ein Werkzeug (`holdInHand`). Klappt das nicht (kein
        // Griff, keine Hand, Controller weg), hängt es wie eh und je eine
        // Handbreit vor der Brust, mittig und ruhig.
        if (this.holdInHand(ctx, hold)) continue;
        this.backToBelly(thing);
        // **Und wenn ausnahmsweise zwei dort landen**, rücken sie
        // auseinander: Das passiert nur, wenn jemand mit zwei vollen Händen
        // die Brille absetzt oder ein Controller wegfällt — zwei Gegenstände
        // auf demselben Punkt wären ein einziger, aus dem zwei Ecken ragen.
        // Sobald der Schalter wieder ausgeht, räumt `foldHands` ohnehin auf.
        thing.object.position.set(
          this.bellyShift(atBelly),
          ctx.rig.camera.position.y - 0.62,
          -0.42,
        );
      } else {
        this.backToBelly(thing);
        // **Im Raum des Rigs, und das genügt**: Von oben dreht sich das Rig
        // selbst in die Laufrichtung (`core/FlatControls.walkNorthUp`), und aus
        // den Augen dreht es die Maus (`FlatControls.look`). Wer hier
        // zusätzlich um die Blickrichtung der Figur drehte, drehte um null —
        // dieselbe Rechnung wie beim Werkzeug in der Bildschirmhand
        // (`worlds/portal/screenHand.ts`).
        thing.object.position.set(
          CHEF_CARRY.x + this.bellyShift(atBelly),
          carryY(ctx),
          CHEF_CARRY.z,
        );
      }
      atBelly++;
    }
    // Die Hände der Figur gehen nur unter das, was wirklich vor dem Bauch
    // hängt; was in einer echten Hand liegt, braucht sie nicht.
    // Und die Hände gehen auf **dieselbe** Höhe wie das, was dort hängt: Zwei
    // Rechnungen für eine Stelle wären zwei, die auseinanderlaufen.
    ctx.avatar.carry =
      !ctx.renderer.xr.isPresenting && atBelly > 0
        ? CARRY_POINT.set(CHEF_CARRY.x, carryY(ctx), CHEF_CARRY.z)
        : null;
  }

  /**
   * **Wie weit das zweite Ding vor dem Bauch zur Seite rückt**, in Metern.
   *
   * Das erste steht mittig, wie immer; erst ab dem zweiten wird versetzt, und
   * dann nach beiden Seiten. Eine Handbreit reicht: Es soll zu erkennen sein,
   * dass es zwei sind, und nicht aussehen, als hinge etwas neben der Figur her.
   */
  private bellyShift(index: number): number {
    if (index === 0) return 0;
    return index % 2 === 1 ? -0.12 : 0.12;
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
   *
   * **Und es steht dabei nach vorn** (`kitchenGrab.kitchenCarryTurn`). Für
   * alles, was keine Vorderseite hat, ist das die Null von vorher; der
   * **Feuerlöscher** hat eine, und ungedreht zeigte seine Düse quer zur Figur,
   * während der Strahl geradeaus ging. Die Vierteldrehung steht dort, wo auch
   * der Griff in der Faust seine Richtung hernimmt, und nicht hier.
   */
  private backToBelly(thing: Carried | null): void {
    if (!thing) return;
    const object = thing.object;
    if (object.parent !== this.rig) this.rig?.add(object);
    object.rotation.set(0, kitchenCarryTurn(thing.dish.item), 0);
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
  private holdInHand(ctx: WorldContext, hold: Hold): boolean {
    const side = hold.hand;
    if (!side) return false;
    const controller = ctx.input.get(side);
    if (!controller?.tracked) return false;
    const node = controller.hold;
    const object = hold.thing.object;
    if (object.parent !== node) node.add(object);
    // **Und die Haltung ist für beide Hände dieselbe.** `holdFor` rechnet den
    // gewählten Griff in den **Griffraum** (`core/gripFit.STANDARD_GRIP_IN_HAND`),
    // und der ist seitenunabhängig — es gibt keine linke und keine rechte
    // Fassung davon. Ein Werkzeug braucht die Spiegelung
    // (`worlds/portal/tools/toolPose.holdForOtherHand`), weil seine Haltung an
    // **einer** Hand eingemessen wurde; die Griffe dieser Küche sind gerechnet
    // und nicht gemessen (`kitchenGrab.kitchenHandles`). Deshalb bleibt bei
    // einer Übergabe derselbe `handle` stehen und die Pfanne dreht sich nicht
    // in der Luft.
    const pose = holdFor(hold.thing.handle);
    object.position.set(pose.position.x, pose.position.y, pose.position.z);
    object.quaternion.set(pose.rotation.x, pose.rotation.y, pose.rotation.z, pose.rotation.w);
    return true;
  }

  /**
   * **Von einer Hand in die andere** — Hände zusammen, greifen, fertig.
   *
   * „Es wäre schön, wenn ich Gegenstände in der Küche auch von einer in die
   * andere Hand nehmen könnte." Das ist **dieselbe Geste wie beim Werkzeug**
   * (`PortalWorld.handoverTool`), und sie wird mit **derselben Rechnung**
   * gemessen: `grabReach.atHandGrip` gegen `HANDOVER_REACH` (16 cm). Eine
   * zweite Reichweite daneben wäre eine Zahl, die niemand nachrechnet — und
   * irgendwann die Reichweite von etwas anderem.
   *
   * **Gegen die Griffpunkte**, nicht gegen den Gegenstand: Gemessen wird
   * `ControllerState.hold` gegen `ControllerState.hold`, und das ist genau der
   * Knoten, den `PortalWorld.gripOf` zurückgibt — dort liegt der Griff, und nur
   * dort soll das Zeichen kommen. Eine Reichweite über die Ausdehnung des Dings
   * ließe die Pfanne auch dann übernehmen, wenn die Hand vorn am Boden steht.
   *
   * **Auf der Flanke der Greif-Taste** der leeren Hand
   * (`ButtonState.justPressed`) und nicht, solange sie liegt: Wer sie gedrückt
   * hält, während die Hände beieinander sind, schöbe die Pfanne sonst Bild für
   * Bild hin und her.
   *
   * **In beiden Betriebsarten** (`core/grabSettings.GrabSettings.twoHands`):
   * Mit dem Schalter aus wechselt das eine getragene Ding die Hand — das Fach
   * bleibt dasselbe, nur `Hold.hand` ändert sich —, mit ihm an wandert eines
   * der beiden in die freie Hand. Gefragt wird deshalb `holdAt` und nicht
   * `heldBy`: Nur `Hold.hand` sagt, welche Hand wirklich leer ist.
   *
   * Die **Regel** dazu steht nebenan und wird dort geprüft
   * (`kitchenCarry.handsOver`); hier steht, wogegen sie gemessen wird.
   */
  private handover(ctx: WorldContext): void {
    const world = this.world;
    if (!world) return;
    const presenting = ctx.renderer.xr.isPresenting;
    for (const hand of HANDS) {
      const here = ctx.input.get(hand);
      if (!here?.tracked) continue;
      const there = ctx.input.get(otherHand(hand));
      const theirs = this.holdAt(otherHand(hand));
      let together = false;
      if (there?.tracked && theirs) {
        here.hold.getWorldPosition(_thisGrip);
        there.hold.getWorldPosition(_otherGrip);
        together = atHandGrip(_thisGrip, _otherGrip);
      }
      const takes = handsOver({
        presenting,
        pressed: here.squeeze.justPressed,
        empty: !this.holdAt(hand),
        holding: Boolean(theirs),
        together,
      });
      if (!takes || !theirs) continue;
      // **Das Fach wechselt, der Griff nicht.** `Carried.handle` bleibt
      // stehen, und `holdFor` rechnet ihn für beide Hände gleich
      // (`holdInHand`) — eine Pfanne, die sich bei der Übergabe in der Luft
      // drehte, wäre genau der Fehler, den ein gemerkter Griff verhindert.
      this.holds.delete(theirs.slot);
      theirs.hold.hand = hand;
      this.holds.set(this.slot(hand), theirs.hold);
      this.busyHand = hand;
      // Rückmeldung wie beim Werkzeug: ein kurzer Stups und ein Satz. Ohne den
      // Stups merkt man in der Brille nicht, ob die Hand nah genug war.
      here.pulse(0.2, 12);
      world.notify(`${dishLabel(theirs.hold.thing.dish)} in die ${HAND_LABELS[hand]} Hand`);
      // Die Anmeldungen fragen nach dem, was in der Hand liegt — und das ist
      // jetzt eine andere.
      this.refreshStations();
      return;
    }
  }

  /**
   * **Der Schalter ist umgelegt worden** (`core/grabSettings.onGrabChange`) —
   * die Fächer ziehen nach.
   *
   * **Beim Anschalten** wandert das eine Fach vor dem Bauch an die Hand, an der
   * es ohnehin schon hing; hat es keine (von oben, am Schreibtisch, aus der Uhr
   * der Spüle), bekommt es das Fach der zuletzt tätigen Hand und hängt weiter
   * vor dem Bauch.
   *
   * **Beim Abschalten darf nichts hängenbleiben.** Wer ihn umlegt, während
   * beide Hände voll sind, behielte sonst ein zweites Ding an einer Hand, nach
   * der niemand mehr fragt: `heldBy` gibt danach für jede Seite dasselbe Fach
   * zurück, und das andere wäre unerreichbar. Bleiben darf eines — das der
   * zuletzt tätigen Hand (`kitchenCarry.keptOnFold`) —, und das andere geht
   * dorthin zurück, wo es hingehört: dieselbe Regel, die `toggleEdit` und das
   * Aufräumen schon haben (`putBack`).
   */
  private foldHands(): void {
    const next = grabSettings().twoHands;
    if (next === this.twoHands) return;
    this.twoHands = next;
    const before = [...this.holds.entries()];
    this.holds.clear();
    if (next) {
      for (const [, hold] of before) this.holds.set(hold.hand ?? this.busyHand, hold);
    } else {
      const kept = keptOnFold(
        before.map(([slot]) => slot),
        this.busyHand,
      );
      for (const [slot, hold] of before) {
        if (slot === kept) this.holds.set('body', hold);
        else this.putBack(hold.thing);
      }
    }
    this.showHandsLabel();
    this.refreshStations();
  }

  /**
   * **Ein getragenes Möbel wird für den Träger klein** — und nur für ihn.
   *
   * Eine Ausgabetheke ist zwei Meter breit. Vor dem Bauch getragen füllt sie
   * in der Brille und aus den Augen das halbe Bild: Man trägt sie zum
   * Bauplatz und sieht den Bauplatz nicht mehr. Von **oben** ist genau das
   * kein Problem — dort sieht man die Figur von hinten oben, das Möbel liegt
   * vor ihr und verdeckt Boden, den man ohnehin nicht braucht —, und deshalb
   * bleibt es dort in voller Größe.
   *
   * „Für alle anderen von außen kann es ruhig sein, dass ich das so groß in
   * der Hand halte (nur eben für den Spieler selbst)": Das ist hier gratis zu
   * haben, denn ein getragenes Möbel hängt am **Rig** des Trägers
   * (`liftPiece`) und wird gar nicht übertragen — was ein Mitspieler sieht,
   * ist seine eigene Rechnung und nicht diese.
   *
   * **Ein Drittel**, dieselbe Zahl wie die Vorlage auf der Kopierfläche
   * (`MINI_SCALE`), und mit derselben Begründung: Der Größenunterschied
   * zwischen Mülleimer und Theke bleibt sichtbar, statt dass alles auf ein
   * Maß gerechnet wird (`MINI_SIZE` im Katalog tut das, und dort ist es
   * richtig — dort steht jedes Stück allein auf seiner Kachel).
   *
   * Zurückgesetzt wird beim Absetzen (`dropPiece`, `layOnPlate`,
   * `takeFromPlate`) und in jedem Bild, in dem von oben gespielt wird: Wer die
   * Ansicht wechselt, während er ein Möbel trägt, soll es nicht in der
   * falschen Größe behalten.
   */
  private shrinkPiece(ctx: WorldContext): void {
    const furnish = this.lifted;
    if (!furnish) return;
    const full = kitchenPieceScale(furnish.piece);
    furnish.model.scale.setScalar(ctx.topDown ? full : full * MINI_SCALE);
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
    // **Auch die Kopierflächen werden geräumt.** Was dort als Miniatur steht,
    // ist ein gewöhnliches Möbel; bliebe es liegen, stünde nach dem Aufräumen
    // eine Vorlage auf einem Kopierer, den niemand mehr aufheben kann.
    this.clearPlates();
    this.editing = false;
    // **Und das Schild sagt es auch.** `editing` allein umzulegen hieß: Auf
    // dem Knopf stand nach dem Aufräumen weiter „Küche nutzen", während längst
    // wieder gekocht wurde — eine Beschriftung, die das Gegenteil dessen sagt,
    // was der nächste Druck tut, ist schlimmer als gar keine.
    this.showBuildLabel();
    this.calmStations();
    this.refreshStations();
  }

  /**
   * **Alle Uhren aus, alle Flächen leer** — der gemeinsame Kern von `B`/`Y`
   * und des Umbaus.
   *
   * Er stand bis eben nur im Aufräumen, und der Umbau machte daneben seine
   * eigene, kürzere Fassung: Er räumte die **Hände** und ließ alles andere
   * laufen. Damit fing der Umbau in einer Küche an, in der es weiter
   * brutzelte — ein Herd, der brennt, während man das Möbel daneben verrückt,
   * ist kein Bauzustand, sondern ein Unfall mit einem Zeitlimit. Man baut um,
   * man kocht nicht.
   *
   * **Geräte gehen heim, Essen geht weg** — dieselbe Unterscheidung wie in
   * `toggleEdit` (`kitchenBuild.goesHomeOnEdit`): Topf, Pfanne und
   * Feuerlöscher gibt es genau einmal in dieser Küche
   * (`core/kitchenModel.takeUtensil`), und wer sie wie ein halbes Brötchen
   * wegwürfe, hätte einen Herd ohne Pfanne und keinen Weg, eine neue zu
   * bekommen. **Leer** gehen sie heim, also ohne ihren Belag: Ein Patty, das
   * in der zurückgestellten Pfanne weiterbrutzelt, wäre kein Aufräumen.
   *
   * **Was getragen wird oder auf einer Kopierfläche steht, bleibt, wie es
   * ist.** Darauf liegt höchstens das eigene Gerät des Möbels, und das reist
   * mit ihm (`liftPiece`); es hier abzuräumen hieße, den Topf auf der Kachel
   * abzustellen, auf der sein Herd einmal stand, während der Herd anderswo
   * ist. Wo das Möbel wieder hinkommt, stellt `dropPiece` ihn zurück.
   */
  private calmStations(): void {
    this.spraying = false;
    this.sprayLatch = false;
    // **Und es wird still** — bis auf das Radio, das an keiner Station hängt
    // und deshalb auch nicht mit ihnen ausgeht (`KitchenAudio.silence`). Die
    // übrigen Schleifen fielen im nächsten Bild ohnehin weg (`listen` findet
    // dann nichts mehr, was zischt); dass sie **jetzt** aufhören, erspart die
    // Viertelsekunde Feuer an einem Herd, der schon kalt ist.
    this.sound.silence('radio');
    // Was unterwegs war, ist es danach nicht mehr: Eine Reservierung auf eine
    // Kachel, auf der gleich wieder alles frisch liegt, sperrte sie für einen
    // Handgriff, den niemand mehr erwartet.
    this.beltNow = null;
    const standing = this.stations.filter((spot) => !spot.home.held);
    // **Alle Fächer**, nicht nur eines: Mit dem Schalter _zwei Gegenstände_ an
    // hält jede Hand ihr eigenes, und eines davon liegenzulassen wäre ein
    // Gegenstand, der an einer Hand hängt, nach der niemand mehr fragt.
    const loose = [
      ...[...this.holds.values()].map((hold) => hold.thing),
      ...standing.map((spot) => spot.on),
    ];
    this.holds.clear();
    if (this.avatar) this.avatar.carry = null;
    for (const spot of standing) {
      spot.on = null;
      spot.table = CLEAR_TABLE;
      spot.belt = BELT_EMPTY;
      spot.wet = DRY;
      // **Und das Leck ist mit aufgeräumt.** `B` stellt diese Welt zurück, und
      // ein Becken, das danach weiterspritzt, wäre das eine Möbel, das sich
      // davon ausnimmt. Das Wasser kommt dabei ins Becken zurück
      // (`showWater`) — es war nur unsichtbar, nicht weg.
      spot.leak = TIGHT;
      this.showWater(spot);
      this.setStack(spot, 0);
      // `settle` ist die **einzige** Stelle, die eine Uhr armiert: Sie setzt
      // den Herd auf `onStove(null)` und Brett wie Spüle auf `onWork(kind,
      // null)`. Das Feuer geht damit mit aus, denn `COLD_STOVE` kennt keines.
      this.settle(spot);
      this.gauges?.clear(spot.key);
      spot.shown = null;
    }
    for (const thing of loose) {
      if (thing) this.putBack(thing);
    }
    // Und das Schild am Leck-Knopf sagt es auch — dieselbe Begründung wie beim
    // Umbauknopf in `reset`: eine Beschriftung, die das Gegenteil dessen sagt,
    // was gerade gilt, ist schlimmer als gar keine.
    this.showLeakLabel();
    this.hideTicket();
  }

  /**
   * **Ein loses Ding dorthin zurück, wo es hingehört** — oder weg damit.
   *
   * **Dieselbe Unterscheidung wie im Umbau** (`kitchenBuild.goesHomeOnEdit`)
   * und nicht eine zweite daneben: Was einen Platz hat, geht dorthin zurück,
   * weggeworfen wird nur, was keinen hat — und der Platz muss frei sein. Beim
   * Aufräumen ist er es fast immer (`calmStations` hat alle Stationen geräumt),
   * aber „fast immer" ist keine Regel: Ein zweites Gerät mit demselben Zuhause
   * überschriebe sonst das erste.
   *
   * **Leer** geht es heim, also ohne seinen Belag: Ein Patty, das in der
   * zurückgestellten Pfanne weiterbrutzelt, wäre kein Aufräumen.
   *
   * Zwei rufen das, und deshalb steht es hier und nicht in einem von beiden:
   * das Aufräumen (`calmStations`) und das Abschalten des zweiten Gegenstands
   * (`foldHands`). Die Frage ist in beiden Fällen dieselbe — wohin mit etwas,
   * das gerade aus der Hand muss.
   */
  private putBack(thing: Carried): void {
    const home = thing.home;
    if (!goesHomeOnEdit(home, Boolean(home?.on))) {
      this.discard(thing);
      return;
    }
    this.restyle(thing, dish(thing.dish.item));
    this.layOn(home!, thing);
  }

  /** Was auf dem Knopf steht — beide Zeilen an einer Stelle, siehe `reset`. */
  private showBuildLabel(): void {
    this.buildButton?.setTitle(
      this.editing ? BUILD_BUTTON_LABELS.on : BUILD_BUTTON_LABELS.off,
      this.editing ? 'Zurück ans Kochen' : 'Möbel aufheben und neu hinstellen',
    );
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
    this.joins?.dispose();
    this.joins = null;
    this.mixers?.dispose();
    this.mixers = null;
    this.griddles?.dispose();
    this.griddles = null;
    this.desks?.dispose();
    this.desks = null;
    this.jet?.dispose();
    this.jet = null;
    this.leakJet?.dispose();
    this.leakJet = null;
    this.floor?.dispose();
    this.floor = null;
    this.buildButton?.dispose();
    this.buildButton = null;
    this.handsButton?.dispose();
    this.handsButton = null;
    this.leakButton?.dispose();
    this.leakButton = null;
    for (const trial of this.trialButtons) trial.button.dispose();
    this.trialButtons.length = 0;
    this.trials.clear();
    this.notice?.dispose();
    this.notice = null;
    // **Der Ton zuletzt und vollständig**: Eine Schleife, die eine Welt
    // überlebt, ist ein Feuer, das man im Gokart noch brennen hört — und sie
    // hängt am **gemeinsamen** Kontext (`core/Audio.ts`), den niemand sonst
    // abstellt. Das Radio geht dabei mit aus und steht beim nächsten Besuch
    // wieder auf seinem ersten Sender: Es gehört zur Küche und nicht zum
    // Spieler.
    this.sound.dispose();
    this.radio?.dispose();
    this.radio = null;
    this.radioState = RADIO_OFF;
    for (const copier of [...this.plates.keys()]) this.clearCopy(copier);
    this.plates.clear();
    this.models.clear();
    // **Die Miniaturen nur aushängen, nicht freigeben.** Sie sind Klone der
    // Vorlagen (`miniature`), und `Object3D.clone` teilt Formen und Materialien
    // mit dem Original: Wer sie über einen `dispose`-Gang schickte, nähme dem
    // Schauraum und jedem gebauten Möbel die Netze unter den Füßen weg. Was
    // ihnen wirklich gehört, ist ein Knoten je Stück, und den holt sich der
    // Sammler von selbst, sobald die Karte leer ist. Aus dem Baum müssen sie
    // trotzdem: Steht die Zone ab, während der Katalog noch offen ist, hängen
    // sie in der Bühne des Konstrukt-Raums.
    for (const mini of this.minis.values()) mini.removeFromParent();
    this.minis.clear();
    this.stations.length = 0;
    this.furniture.length = 0;
    this.bodies.length = 0;
    // Die vorab gestellten Kästen hängen in `placed` und `bodies` wie jeder
    // andere und sind damit schon weg; hier fällt nur die Zuordnung, die sie
    // einem Möbel zuhalten wollte.
    this.blocks.clear();
    this.holds.clear();
    this.lifted = null;
    this.ghost = null;
    this.ghostLive = false;
    this.editing = false;
    this.spraying = false;
    this.sprayLatch = false;
    // **Und der Benutzen-Knopf gehört wieder dem Sprung** (`PlayerRig.useBusy`):
    // Er hängt am Gestell und nicht an der Zone, und ein Knopf, den eine Küche
    // mitnimmt, ist ein Spieler, der in der nächsten Welt nicht mehr hüpft.
    if (this.rig) this.rig.useBusy = false;
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
    // Und der Melder des Greifens: Er zeigt sonst auf eine Küche, die es nicht
    // mehr gibt, und legte bei der nächsten Einstellung Hand an ihre Fächer.
    this.offGrab?.();
    this.offGrab = null;
    if (this.rig) this.rig.eyeScale = 1;
    this.rig = null;
  }

  // --- aufstellen -----------------------------------------------------------

  /**
   * **Ein gebautes Stück** — alles, was in keiner Datei steht
   * (`KitchenPiece.built`).
   *
   * Inzwischen sind es acht, und die drei Bänder kommen aus demselben
   * Bausatz (`kitchenBelt.BeltKit.piece`) — sie sind ein Möbel mit drei
   * Aufgaben. Kombinierer, Mixer und Kochstelle bringen je einen eigenen mit,
   * weil sie je ein eigenes Möbel sind; Rechner und Kopierer teilen sich
   * ihren.
   */
  private buildPiece(piece: KitchenPiece): THREE.Object3D | null {
    const kind = beltKind(piece.name);
    if (kind) return this.belts?.piece(kind) ?? null;
    if (piece.name === 'combiner') return this.joins?.piece() ?? null;
    if (piece.name === 'mixer') return this.mixers?.piece() ?? null;
    if (piece.name === 'griddle') return this.griddles?.piece() ?? null;
    if (piece.name === 'desk') return this.desks?.deskPiece() ?? null;
    if (piece.name === 'copier') return this.desks?.copierPiece() ?? null;
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
  ): Furnish | null {
    const world = this.world;
    if (!world) return null;
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
      water: null,
      filter: spot.filter ?? null,
      held: false,
      cargo: null,
      usable: null,
    };
    const foot = this.standAt(furnish);
    // **Das erste Netz je Sorte wird die Vorlage** (`models`) — aus ihm klont
    // der Möbelkatalog seine Miniaturen (`miniature`).
    if (!this.models.has(piece.name)) this.models.set(piece.name, model);
    this.furniture.push(furnish);
    // **Das Wasser gehört dem Möbel und nicht der Station**: Ein Spülbecken
    // ohne Wasser ist eine Blechmulde.
    if (stationKind(piece.name, spot.gives, spot.role) === 'sink') this.addWater(furnish);

    this.addBody(furnish);
    this.addIcon(furnish);
    // Und das Bild dessen, was ein Filterband schon gelernt hat — beim Aufbau
    // aus dem Grundriss (`kitchenPlan.Spot.filter`), später bei jeder Lehre
    // (`learnFilter`).
    this.showFilter(furnish);
    this.markPieceHandles(furnish);
    this.addStation(furnish, foot, takeUtensil);
    return furnish;
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
   *
   * **Gerechnet wird er nicht mehr hier** (`kitchenBlocks.kitchenBlock`), und
   * meistens steht er schon, bevor diese Methode das erste Mal läuft: Die
   * Küche macht sich beim Aufbau fest, aus dem Katalog und ohne auf eine Datei
   * zu warten. Was hier bleibt, sind die beiden Wege dorthin — den fertigen
   * Kasten übernehmen oder, nach einem Umbau, einen auf der neuen Kachel
   * hinstellen.
   */
  private addBody(furnish: Furnish): void {
    const { piece, spot } = furnish;
    // **Der Kasten steht meistens schon** (`build`, `kitchenBlocks`), und dann
    // wird er übernommen statt neu gebaut. Ein zweiter an derselben Stelle
    // wäre genau die Falle aus dem Absatz darüber — und die Zahlen dahinter
    // wären dieselben, weil beide aus demselben Katalog kommen: Das Möbel
    // rückt beim Ankommen nichts.
    //
    // Gestrichen wird er dabei, denn ab jetzt gehört er dem Möbel: Wer es im
    // Baumodus aufhebt, nimmt seinen Kasten mit (`dropBody`), und beim
    // Absetzen entsteht einer auf der neuen Kachel.
    const ready = this.blocks.get(spot);
    if (ready) {
      this.blocks.delete(spot);
      furnish.box = ready.box;
      furnish.body = ready.body;
      return;
    }
    const block = kitchenBlock(piece, {
      // Die **jetzige** Kachel und nicht die aus dem Plan: Nach einem Umbau
      // steht das Möbel woanders (`dropPiece`).
      x: furnish.x,
      z: furnish.z,
      turn: furnish.turn,
      lift: spot.lift,
    });
    if (!block) return;
    const raised = this.raiseBlock(block);
    if (!raised) return;
    furnish.box = raised.box;
    furnish.body = raised.body;
  }

  /**
   * **Einen gerechneten Kasten wirklich hinstellen** — Netz in die Welt,
   * Körper in die Physik, beides in die Aufräumliste.
   *
   * Die eine Stelle, an der aus einer Rechnung (`kitchenBlocks.ts`) ein
   * Hindernis wird: Der Aufbau ruft sie für die ganze Küche auf einmal auf,
   * `addBody` für das einzelne Möbel, das im Baumodus umgestellt wurde.
   */
  private raiseBlock(block: KitchenBlock): { box: THREE.Mesh; body: PhysicsBody } | null {
    const world = this.world;
    if (!world) return null;
    const box = this.boxAt(block.w, block.h, block.d, block.x, block.y - block.h / 2, block.z);
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);
    const body = world.addSolid(box);
    this.bodies.push(body);
    return { box, body };
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
   * **Ein Filterband merkt sich etwas** — und sagt, ob sich dabei etwas
   * geändert hat.
   *
   * Zwei Zeilen, und beide sind Buchhaltung: Der Filter kommt ans **Möbel**
   * (damit er das Versetzen im Baumodus übersteht, siehe `Furnish.filter`),
   * und das Bild darauf wird neu gebaut. Ob dieses Möbel überhaupt lernt,
   * steht nebenan (`kitchenBelt.beltLearns`) — eine Frage über einen
   * Katalognamen, und die gehört zu den Bändern.
   *
   * **Derselbe Filter noch einmal ist keine Änderung**, und das ist der Grund
   * für den Rückgabewert: Wer ein zweites Brötchen auf ein Brötchenband legt,
   * soll nicht jedes Mal lesen, dass es sich etwas gemerkt hat, was es schon
   * wusste — dann gilt der gewöhnliche Satz fürs Ablegen.
   */
  private learnFilter(spot: Station, item: KitchenItem): boolean {
    const furnish = spot.home;
    if (!beltLearns(furnish.piece.name) || furnish.filter === item) return false;
    furnish.filter = item;
    this.showFilter(furnish);
    return true;
  }

  /**
   * **Das Bild seines Filters auf dem Filterband** — klein, an der Kante, an
   * der es zugreift.
   *
   * Es ist derselbe Aufkleber wie an einer Vorratskiste (`addIcon`), aus
   * demselben Ofen und sogar aus demselben Fach: Der Schlüssel `gives:<Ding>`
   * ist der der Kiste, also teilt ein Brötchenband sein Bild mit der
   * Brötchenausgabe an der Westwand und kostet nichts (`IconOven.bake`).
   *
   * **Klein und hinten, und beides musste sein.** Ein Bild in Kachelgröße
   * mitten auf dem Deckel läge unter allem, was über das Band fährt, und
   * verdeckte obendrein die Sparren, an denen man sieht, wohin es schiebt.
   * 30 cm an der **hinteren** Kante liegen dagegen dort, wo ohnehin der
   * Greifer sitzt (`kitchenBelt`, `MOUTH_LONG`) — der Aufkleber sagt also
   * nicht nur „das hier hole ich", sondern steht auch genau an der Seite, von
   * der er es holt.
   *
   * **Zwei Träger und nicht einer**, und darin steckt die einzige Feinheit:
   * Der äußere sitzt am Möbel und **dreht sich mit** — der Aufkleber soll an
   * der Greifkante bleiben, auch wenn jemand das Band wendet. Der innere dreht
   * **zurück**, damit das Bild selbst von oben aufrecht steht (`aimIcon`,
   * dieselbe Zeile wie an der Kiste). Ein einziger Träger könnte nur eines von
   * beidem.
   *
   * Ohne Filter steht hier nichts — und das ist die ehrliche Auskunft: Ein
   * Filterband ohne Filter zieht auch nichts (`kitchenBelt.beltWants`).
   */
  private showFilter(furnish: Furnish): void {
    // **Nur Filterbänder**, und die Zeile ist keine Vorsicht, sondern Pflicht:
    // Ein Möbel führt genau ein `icon` (`Furnish.icon`), und an einer
    // Vorratskiste ist das der Aufkleber ihrer Zutat — der hängt anders
    // (unmittelbar am Möbel, ohne den zweiten Träger), und ihn hier abhängen zu
    // wollen nähme das Möbel selbst mit.
    if (!beltLearns(furnish.piece.name)) return;
    const old = furnish.icon;
    if (old) {
      old.parent?.removeFromParent();
      furnish.icon = null;
    }
    const { filter, model, piece } = furnish;
    const oven = this.oven;
    if (!filter || !oven) return;
    const texture = oven.bake(
      `gives:${filter}`,
      () => this.food.view(dish(filter)) ?? new THREE.Group(),
    );
    if (!texture) return;
    const holder = new THREE.Group();
    holder.name = 'kitchen-filter-holder';
    holder.scale.setScalar(1 / kitchenPieceScale(piece));
    holder.position.z = FILTER_BACK;
    const aim = new THREE.Group();
    aim.name = 'kitchen-filter-aim';
    aim.add(oven.counterSign(texture, { piece, across: FILTER_SIGN }));
    holder.add(aim);
    model.add(holder);
    furnish.icon = aim;
    this.aimIcon(furnish);
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
    // **Eine Vorratskiste erklärt sich selbst** (`KitchenPiece.supply`): In ihr
    // liegt, was sie hergibt. Ein gerendertes Bild derselben Zutat obendrauf
    // wäre nicht nur doppelt, es läge in der Aufsicht genau darüber.
    if (piece.supply) return;
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
      join: IDLE_COMBINE,
      wet: DRY,
      leak: TIGHT,
      stack: 0,
      stacked: null,
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
    // **Der Ton kommt aus dem Zutatensatz** (`kitchenProps.WATER_LOOK`) und
    // steht nicht mehr hier: Seit der Topf am Hahn gefüllt wird, gibt es ein
    // zweites Wasser in dieser Küche, und zwei Blautöne nebeneinander wären
    // zwei Flüssigkeiten. Warum die Zahlen sind, wie sie sind, steht dort.
    this.pond ??= this.own(new THREE.MeshStandardMaterial({ ...WATER_LOOK, transparent: true }));
    const water = new THREE.Mesh(shape, this.pond);
    water.name = 'kitchen-sink-water';
    water.rotation.x = -Math.PI / 2;
    water.position.set(SINK_BOWL.at[0], SINK_BOWL.water, SINK_BOWL.at[1]);
    const holder = new THREE.Group();
    holder.name = 'kitchen-water-holder';
    holder.scale.setScalar(1 / kitchenPieceScale(piece));
    holder.add(water);
    model.add(holder);
    // **Gemerkt, seit das Becken lecken kann** (`kitchenLeak.ts`): Ein
    // spritzendes Becken hat kein Wasser darin, und das ist ein `visible` an
    // dieser einen Fläche (`showWater`). Der **Träger** wird gemerkt und nicht
    // die Fläche: Er ist es, der am Möbel hängt und im Baumodus mitfährt.
    furnish.water = holder;
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
    // **In beiden Betriebsarten dieselbe Sorte**: Rechner und Kopierer melden
    // sich selbst an und nicht über eine Station (`refreshSpecials`).
    this.refreshSpecials(world);
    if (this.editing) {
      this.refreshEditables(world);
      return;
    }
    for (const furnish of this.furniture) {
      // **Was getragen wird oder auf einer Kopierfläche steht, meldet nichts
      // an.** Seine Station hätte ihre Ablage an der Kachel, auf der es einmal
      // stand — eine Ausgabe, die man vor dem Bauch trägt, gewönne gegen die
      // halbe Küche und legte ihr Brötchen dorthin, wo sie früher stand.
      if (furnish.held || selfServed(furnish.piece.name)) continue;
      const spot = furnish.station;
      // **Die Regel selbst sagt, ob es hier etwas zu tun gibt.** Vorher stand
      // hier eine zweite Liste je Stationsart — und die lief mit jeder neuen
      // Art auseinander. `nothing` ist der einzige Fall ohne etwas zu sagen;
      // `refuse` hat einen Satz und meldet sich.
      // **Ohne Hand gefragt**, denn eine Anmeldung gilt für beide: Hier steht
      // nicht fest, wer gleich drückt. Welches Fach das meint, sagt `slot` —
      // mit dem Schalter aus das einzige, mit ihm an das der zuletzt tätigen
      // Hand. Die Tat selbst rechnet `act` dann noch einmal, und zwar für die
      // Hand, die wirklich gedrückt hat.
      const deed = spot ? this.deedAt(spot, 'body') : null;
      const target = deed && deed.do !== 'nothing' && spot ? this.aimAt(spot, deed) : null;
      if (target === furnish.usable) continue;
      if (furnish.usable) world.removeUsable(furnish.usable);
      furnish.usable = target;
      if (!target || !spot) continue;
      // Die Tat von **jetzt**, nicht die von der Anmeldung: Hinweis und
      // Absicht unten fragen beide danach, und beide werden gelesen, während
      // die Figur davorsteht.
      const deedNow = (): KitchenDeed => this.deedAt(spot, 'body');
      // Dieselbe Bauart: eine Frage, die beim Lesen gestellt wird, nicht beim
      // Anmelden. Der Löscher kommt in die Hand, ohne dass sich eine Station
      // neu anmeldet — und ab dann ist der Trigger vergeben.
      const triggerFree = (): boolean => this.triggerFree('body');
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
          //
          // **Und sie sagt auch, ob der Trigger noch frei ist**
          // (`freeTrigger`): Er spritzt den Feuerlöscher und wendet ein
          // getragenes Möbel; wo er das tut, darf er nicht zugleich ablegen.
          get interaction() {
            const deed = deedNow();
            return kitchenInteractionSpec(
              deed,
              deed.do === 'take' ? kitchenGrab(deed.dish.item) : KITCHEN_STATION_GRAB,
              triggerFree(),
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
   * **Der zweite Knopf: die zweite Hand** — genauso gebaut wie der Umbauknopf
   * darüber, und aus denselben Gründen.
   *
   * Sockel, Kollisionskasten und Anmeldung beim Zeiger stehen dort erklärt
   * (`addBuildButton`); was hier anders ist, ist nur, was er tut und wo er
   * steht:
   *
   * - **Er schaltet die Einstellung**, nicht die Zone
   *   (`core/grabSettings.saveGrabSettings`). Was danach in der Küche geschieht,
   *   macht der Melder (`foldHands`) — derselbe, der auch greift, wenn jemand
   *   den Schalter im Menü umlegt. Zwei Wege zu einem Schalter, und nur eine
   *   Stelle, die darauf antwortet.
   * - **Und er steht auf einer eigenen Kachel** (`kitchenPlan.HANDS_BUTTON_TILE`).
   *   Zwei Dinge auf einer Kachel heißt: `A` erwischt immer nur eines davon
   *   (`core/usable.pickUsable` nimmt das Nächste) — genau der Fehler, den der
   *   Löscher auf der Knopfkachel einmal hatte.
   */
  private addHandsButton(): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    const button = buildRedButton({
      title: this.twoHands ? HANDS_BUTTON_LABELS.on : HANDS_BUTTON_LABELS.off,
      body: HANDS_BUTTON_BODY,
    });
    this.handsButton = button;
    button.group.name = 'kitchen-hands-button';
    button.group.position.set(
      (KITCHEN.x + HANDS_BUTTON_TILE.x + 0.5) * TILE,
      KITCHEN_FLOOR,
      (KITCHEN.z + HANDS_BUTTON_TILE.z + 0.5) * TILE,
    );
    world.root.add(button.group);
    button.group.updateWorldMatrix(true, true);
    this.placed.push(button.group);
    // Durch die Säule läuft niemand — dieselbe Begründung und dasselbe Maß wie
    // beim Umbauknopf (`addBuildButton`).
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
          return this.toggleHands();
        },
        usePrompt: () => (this.twoHands ? HANDS_BUTTON_LABELS.on : HANDS_BUTTON_LABELS.off),
        interaction: 'press',
      },
      { radius: BUTTON_DOME_R, shot: BUTTON_DOME_R },
    );
  }

  /**
   * **Der dritte Knopf: das Wasserleck** — gebaut wie die beiden davor und aus
   * denselben Gründen (`addBuildButton`, `addHandsButton`).
   *
   * Was hier anders ist, ist zweierlei:
   *
   * - **Er steht an der Spüle** (`kitchenPlan.LEAK_BUTTON_TILE`) und nicht in
   *   der Gerätespalte am Eingang. Er stellt nichts ein, er macht etwas
   *   kaputt, und man soll den Schaden von ihm aus sehen.
   * - **Und sein Schild sagt, was los ist**: _Wasserleck auslösen_, solange
   *   das Becken hält, und _Becken spritzt_, sobald es das tut. Ein Knopf, auf
   *   dem beim zweiten Druck noch dasselbe stünde wie beim ersten, verspräche
   *   etwas, das er nicht mehr tun kann — dieselbe Überlegung wie beim
   *   Umbauknopf (`showBuildLabel`).
   */
  private addLeakButton(): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    const button = buildRedButton({
      title: LEAK_BUTTON_LABELS.off,
      body: LEAK_BUTTON_BODY,
    });
    this.leakButton = button;
    button.group.name = 'kitchen-leak-button';
    button.group.position.set(
      (KITCHEN.x + LEAK_BUTTON_TILE.x + 0.5) * TILE,
      KITCHEN_FLOOR,
      (KITCHEN.z + LEAK_BUTTON_TILE.z + 0.5) * TILE,
    );
    world.root.add(button.group);
    button.group.updateWorldMatrix(true, true);
    this.placed.push(button.group);
    // Durch die Säule läuft niemand — dieselbe Begründung und dasselbe Maß wie
    // bei den beiden anderen Knöpfen.
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
          return this.burstLeak();
        },
        usePrompt: () => (this.leaking() ? LEAK_BUTTON_LABELS.on : LEAK_BUTTON_LABELS.off),
        interaction: 'press',
      },
      { radius: BUTTON_DOME_R, shot: BUTTON_DOME_R },
    );
  }

  /**
   * **Das Becken aufreißen** — und mehr tut dieser Knopf nicht.
   *
   * Die Regel steht nebenan (`kitchenLeak.springLeak`) und antwortet mit
   * demselben Zustand, wenn es ohnehin schon spritzt; hier steht nur, was die
   * Zone daraufhin am Bild ändert: Das Wasser **im** Becken geht weg
   * (`showWater`), das Schild am Knopf wechselt, und die Station meldet sich
   * neu an — mit der Zange in der Hand meint `A` dort ab jetzt etwas anderes.
   *
   * **Ein zweiter Druck ist kein Fehler, sondern eine Auskunft.** Wer in dem
   * Augenblick davorsteht, in dem es ohnehin spritzt, hat den Knopf gedrückt,
   * weil er etwas erwartet — er bekommt den Satz, der sagt, was stattdessen zu
   * tun ist.
   */
  private burstLeak(): boolean {
    const world = this.world;
    if (!world) return false;
    const spot = this.sink();
    if (!spot) {
      world.notify('Kein Spülbecken da, das lecken könnte');
      return true;
    }
    const leak = springLeak(spot.leak);
    if (leak === spot.leak) {
      world.notify('Das Becken spritzt schon — Wasserpumpenzange holen');
      return true;
    }
    spot.leak = leak;
    this.showWater(spot);
    this.showLeakLabel();
    world.notify('Das Spülbecken spritzt — mit der Wasserpumpenzange abdichten');
    this.refreshStations();
    return true;
  }

  /**
   * **Die Wasserpumpenzange auf ihre Arbeitsplatte** — einmal beim Aufbau, und
   * danach nie wieder.
   *
   * Sie ist das Gegenstück zum Feuerlöscher, und sie kommt trotzdem auf einem
   * anderen Weg in die Küche: Der Löscher **steckt im Möbelmodell** und wird
   * beim Aufstellen abgenommen (`addStation`, `core/kitchenModel.takeUtensil`);
   * die Zange ist **gebaut** (`kitchenProps.FoodKit.pliers`), also legt die
   * Zone sie einfach hin — auf die Ablage der Station, die auf
   * `kitchenPlan.PLIERS_TILE` steht.
   *
   * **Mit `home`**, und das ist die ganze Buchhaltung dahinter: Ein getragenes
   * Ding mit einem Zuhause geht beim Aufräumen und beim Umbau dorthin zurück
   * und wird nicht weggeworfen (`putBack`, `kitchenBuild.goesHomeOnEdit`) —
   * dieselbe Zusage, die Topf, Pfanne und Löscher schon haben. In den Müll
   * kann sie ohnehin nicht (`kitchenCarry.intoBin` nimmt nur Essen).
   *
   * **Liegt dort schon etwas, bleibt es liegen.** Gerufen wird das am Ende des
   * Aufbaus, und da ist die Platte leer; die Zeile steht trotzdem da, damit
   * ein zweiter Aufruf nicht die Zange über ein Brötchen legt.
   */
  private layPliers(): void {
    const spot = this.stationAt(PLIERS_TILE.x, PLIERS_TILE.z);
    if (!spot || spot.on) return;
    const thing = this.make(dish('pliers'));
    if (!thing) return;
    this.layOn(spot, { ...thing, home: spot });
  }

  /**
   * **Das Spülbecken dieser Küche** — das erste, das nicht getragen wird.
   *
   * Gesucht und nicht gemerkt, wie der Feuerlöscher in der Hand
   * (`extinguisher`): Im Umbau darf man Becken aufstellen und wegnehmen, und
   * ein Merker daneben zeigte danach auf ein Möbel, das anderswo steht. Wer
   * mehrere hinstellt, bekommt das erste — der Knopf macht **ein** Becken
   * kaputt, und zwei gleichzeitig spritzende Spülen sind keine Küche mehr,
   * sondern ein Schwimmbad.
   */
  private sink(): Station | null {
    return this.stations.find((spot) => spot.kind === 'sink' && !spot.home.held) ?? null;
  }

  /** Ob irgendein Becken dieser Küche gerade spritzt — für Schild und Fontäne. */
  private leaking(): boolean {
    return this.stations.some((spot) => spot.leak.leaking && !spot.home.held);
  }

  /** Was auf dem Leck-Knopf steht — beide Zeilen an einer Stelle, wie beim Umbau. */
  private showLeakLabel(): void {
    this.leakButton?.setTitle(
      this.leaking() ? LEAK_BUTTON_LABELS.on : LEAK_BUTTON_LABELS.off,
      this.leaking() ? LEAK_BUTTON_BODY_ON : LEAK_BUTTON_BODY,
    );
  }

  /**
   * **Wasser im Becken, oder eben nicht.**
   *
   * Die eine Zeile, mit der das Leck sichtbar wird, und sie hängt am **Möbel**
   * (`Furnish.water`): Ein Becken, aus dem es spritzt, steht nicht zugleich
   * ruhig halb voll da — genau das stand im Auftrag („soll dann kein Wasser im
   * Becken haben"). Gebaut und abgebaut wird dafür nichts; das Wasser ist
   * dasselbe Netz wie vorher, nur unsichtbar.
   */
  private showWater(spot: Station): void {
    const water = spot.home.water;
    if (water) water.visible = !spot.leak.leaking;
  }

  /**
   * **Ein Bild am undichten Becken** — die Zange dichtet ab, solange jemand
   * danebensteht.
   *
   * Dieselbe Bauart wie `workFrame` darüber, und dieselbe Reichweite
   * (`WORK_REACH`): Wer weggeht, bricht ab. Was hier zusätzlich steht, ist das
   * Bild — die Fontäne hört auf, das Wasser kommt zurück ins Becken, das
   * Schild am Knopf wechselt zurück.
   */
  private leakFrame(spot: Station, dt: number): void {
    const near = Math.hypot(_feet.x - spot.deck.x, _feet.z - spot.deck.z) <= WORK_REACH;
    const tick = advanceFix(spot.leak, dt, near);
    if (tick.state === spot.leak) return;
    spot.leak = tick.state;
    if (!tick.fixed) return;
    this.showWater(spot);
    this.showLeakLabel();
    // **Zu hören ist das Ende und nicht der Anfang** (`kitchenSound.DEED_SOUNDS`,
    // `repair`): Das Rauschen der Fontäne hört in diesem Bild auf, und das ist
    // der Ton, an dem man es merkt, ohne hinzusehen.
    this.world?.notify('Das Spülbecken ist wieder dicht');
    this.refreshStations();
  }

  /**
   * **Die Fontäne an das Becken, das spritzt** — eine je Zone, wie der Nebel
   * des Löschers.
   *
   * Sie hängt nicht an der Station, sondern wird ihr je Bild nachgeführt, und
   * zwar aus demselben Grund wie beim Strahl: Ein Becken darf im Umbau
   * umziehen, und ein Effekt, der an seiner alten Kachel stehen bliebe, wäre
   * ein zweites Leck an einer Stelle, an der nichts mehr steht. Ein Becken in
   * den Händen spritzt gar nicht (`sink`, `leaking`) — man trägt keine
   * Fontäne vor dem Bauch her.
   */
  private leakSpray(dt: number): void {
    const spot = this.stations.find((one) => one.leak.leaking && !one.home.held) ?? null;
    this.leakJet?.update(dt, spot?.deck ?? null);
  }

  /**
   * **Den Schalter umlegen** — und mehr tut dieser Knopf nicht.
   *
   * Er schreibt die Einstellung und wartet ab: Das Schild, die Fächer und die
   * Anmeldungen zieht der Melder nach (`foldHands`), weil derselbe Schalter
   * auch im Menü liegt (*Einstellungen → Greifen*). Wer hier daneben noch
   * selbst aufräumte, hätte zwei Stellen, die dasselbe tun — und die im Menü
   * liefe beim nächsten Umbau hinterher.
   */
  private toggleHands(): boolean {
    saveGrabSettings({ twoHands: !grabSettings().twoHands });
    this.world?.notify(
      this.twoHands
        ? 'In der Brille trägt jetzt jede Hand ihr eigenes'
        : 'Zurück zu einem Gegenstand in den Händen',
    );
    return true;
  }

  /**
   * **Die Tonprobe** — zwei Knöpfe, eine Frage.
   *
   * Ein Geräusch dieser Küche steht noch zur Wahl: wie die **Abgabe** eines
   * Gerichts klingt (`kitchenSound.SOUND_TRIALS`). Das lässt sich nicht am
   * Schreibtisch entscheiden — man hört es oder man hört es nicht —, und es
   * lässt sich im Spiel schlecht vergleichen: Wer die Abgabe hören will, muss
   * erst einen Burger bauen.
   *
   * **Das Paar vor dem Brett ist weg**: Wie das Messer klingt, ist
   * entschieden (das Küchenbrett, `kitchenSound.KITCHEN_CUES.chop`), und damit
   * hat die Küche dort nichts mehr zu fragen.
   *
   * Also steht die Auswahl dort, wo die Möbel einzeln ausgestellt sind, und
   * zwar vor dem Möbel, um das es geht (`kitchenPlan.TRIAL_BUTTONS`): links
   * **weiterschalten**, rechts **vorspielen**. Auf beiden Schildern steht,
   * welche Variante gerade gilt — ohne den Namen wüsste hinterher niemand zu
   * sagen, welche es denn nun sein soll.
   *
   * **Sie schalten die ganze Küche um** und nicht nur die Vorführung
   * (`kitchenAudio.KitchenAudio.choose`): Wer sich für einen Klang
   * entscheidet, will ihn danach beim Kochen hören und nicht nur am Knopf.
   *
   * **Und sie sind vorübergehend.** Steht die Wahl, fallen die Knöpfe mitsamt
   * der Auswahl wieder heraus; übrig bleibt der Satz Aufnahmen, der gewonnen
   * hat — beim Messer ist das gerade geschehen.
   */
  private addTrialButtons(): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    for (const pair of TRIAL_BUTTONS) {
      const label = kitchenPiece(pair.piece)?.label ?? pair.piece;
      this.addTrialButton('turn', pair.turn, `${label}: Ton wechseln`, pair.cue, () => {
        this.turnTrial(pair.cue);
        return true;
      });
      this.addTrialButton('play', pair.play, `${label}: Ton abspielen`, pair.cue, () => {
        // Aus dem eigenen Ort und ohne Seite: Wer den Knopf drückt, steht
        // davor, und eine Balance, die das nachrechnete, vergliche am Ende
        // zwei Töne von verschiedenen Seiten.
        this.sound.play(pair.cue, { gain: 1, pan: 0 });
        return true;
      });
    }
  }

  /**
   * **Ein Knopf der Tonprobe** — Säule, Kasten, Anmeldung, wie die beiden an
   * der Westwand (`addBuildButton`, dort steht es ausführlich).
   *
   * Der eine Unterschied ist das **Schild**: Es trägt nicht nur, was der Knopf
   * tut, sondern auch, welche Variante gerade läuft. Beide Knöpfe eines Paares
   * tragen denselben Zusatz, und beide werden nach jedem Weiterschalten neu
   * beschriftet (`turnTrial`) — ein Schild, das stehen bliebe, nennte die
   * Variante davor.
   */
  private addTrialButton(
    role: 'turn' | 'play',
    tile: { readonly x: number; readonly z: number },
    title: string,
    cue: TrialCue,
    use: () => boolean,
  ): void {
    const world = this.world;
    if (!world) return;
    const button = buildRedButton({ title, body: this.trialBody(cue) });
    button.group.name = `kitchen-trial-${cue}-${role}`;
    button.group.position.set(
      (KITCHEN.x + tile.x + 0.5) * TILE,
      KITCHEN_FLOOR,
      (KITCHEN.z + tile.z + 0.5) * TILE,
    );
    world.root.add(button.group);
    button.group.updateWorldMatrix(true, true);
    this.placed.push(button.group);
    this.trialButtons.push({ button, cue, title });
    // Durch die Säule läuft niemand — dasselbe Maß wie bei den Knöpfen an der
    // Westwand.
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
          return use();
        },
        usePrompt: () => `${title} (${this.trialLabel(cue)})`,
        interaction: 'press',
      },
      { radius: BUTTON_DOME_R, shot: BUTTON_DOME_R },
    );
  }

  /**
   * **Einen Ton weiterschalten** — und alles nachziehen, was ihn nennt.
   *
   * Drei Dinge hängen daran und nicht eines: der Vorrat, aus dem der Spieler
   * würfelt (`kitchenAudio.choose`), die Schilder beider Knöpfe und die
   * Meldung, die sagt, was jetzt gilt. Vorgespielt wird dabei **nicht**: Dafür
   * ist der Knopf daneben da, und wer beim Durchschalten jedes Mal einen Ton
   * bekäme, hörte drei Varianten in zwei Sekunden statt einer in Ruhe.
   */
  private turnTrial(cue: TrialCue): void {
    const index = nextTrial(cue, this.trialIndex(cue));
    this.trials.set(cue, index);
    const trial = trialAt(cue, index);
    this.sound.choose(cue, trial.files);
    const body = this.trialBody(cue);
    for (const entry of this.trialButtons) {
      if (entry.cue === cue) entry.button.setTitle(entry.title, body);
    }
    this.world?.notify(`Ton ${this.trialNumber(cue)}: ${trial.label}`);
  }

  /** Welche Variante dieses Tons gerade läuft — ab Werk die erste. */
  private trialIndex(cue: TrialCue): number {
    return this.trials.get(cue) ?? 0;
  }

  /** Wie sie heißt. */
  private trialLabel(cue: TrialCue): string {
    return trialAt(cue, this.trialIndex(cue)).label;
  }

  /** „2 von 3" — damit man weiß, wie viele noch kommen. */
  private trialNumber(cue: TrialCue): string {
    return `${this.trialIndex(cue) + 1} von ${SOUND_TRIALS[cue].length}`;
  }

  /** Und was davon auf dem Schild steht. */
  private trialBody(cue: TrialCue): string {
    return `${this.trialNumber(cue)}: ${this.trialLabel(cue)}`;
  }

  /**
   * **Das Radio an der Westwand** (`kitchenRadio.ts`) — das dritte Gerät in
   * derselben Spalte wie die beiden roten Knöpfe, und das einzige, das nichts
   * mit dem Kochen zu tun hat.
   *
   * Es ist **kein Möbel** und steht deshalb in keiner Liste: Ein Radio, das
   * man im Baumodus aufhebt und in eine Ecke stellt, ist ein Radio, das
   * irgendwann spielt und nicht mehr gefunden wird — dieselbe Begründung wie
   * beim Umbauknopf (`addBuildButton`). Es bleibt aus demselben Grund auch im
   * Baumodus bedienbar: Musik beim Umräumen ist kein Widerspruch.
   *
   * Es schaut nach **Osten**, in die Küche hinein, wie die Ausgaben neben ihm
   * (`kitchenPlan.KITCHEN_SPOTS`, `turn: 3`) — ungedreht zeigt die
   * Vorderseite nach Norden, also eine Vierteldrehung nach rechts.
   */
  private addRadio(): void {
    const world = this.world;
    if (!world || typeof document === 'undefined') return;
    const radio = buildKitchenRadio();
    this.radio = radio;
    const x = (KITCHEN.x + RADIO_TILE.x + 0.5) * TILE;
    const z = (KITCHEN.z + RADIO_TILE.z + 0.5) * TILE;
    radio.group.position.set(x, KITCHEN_FLOOR, z);
    radio.group.rotation.y = Math.PI / 2;
    radio.setOn(this.radioState.on);
    world.root.add(radio.group);
    radio.group.updateWorldMatrix(true, true);
    this.placed.push(radio.group);
    this.radioAt.x = x;
    this.radioAt.z = z;
    // Durch den Sockel läuft niemand — derselbe Handgriff wie bei den Knöpfen,
    // nur schmaler: Das Radio ist kein halber Meter Säule, sondern ein Kasten.
    const block = this.boxAt(0.4, RADIO_HEIGHT, 0.4, x, KITCHEN_FLOOR, z);
    world.root.add(block);
    block.updateWorldMatrix(true, false);
    this.placed.push(block);
    this.bodies.push(world.addSolid(block));
    world.addUsable(
      radio.face,
      {
        use: () => this.toggleRadio(),
        usePrompt: () => radioPrompt(this.radioState),
        // Ein Schalter will gedrückt werden und nicht gegriffen — sonst wollte
        // die Hand in der Brille das Radio mitnehmen.
        interaction: 'press',
      },
      { radius: 0.3 },
    );
  }

  /**
   * **Ein Druck aufs Radio**: an, aus — und jedes Anmachen ein Sender weiter
   * (`kitchenRadio.radioToggle`).
   *
   * Die Musik selbst schaltet niemand hier ein: `listen` legt in jedem Bild
   * die Schleife auf den Stand, den dieses Feld sagt. Das ist derselbe Weg wie
   * beim Zischen der Pfanne — und der Grund ist derselbe: Wer hier eine
   * Schleife startete, müsste sie auch beim Verlassen der Küche, beim Umbau
   * und beim Weggehen wieder abstellen, und die vierte dieser Stellen ist die,
   * die man vergisst.
   */
  private toggleRadio(): boolean {
    this.radioState = radioToggle(this.radioState);
    this.radio?.setOn(this.radioState.on);
    this.world?.notify(
      this.radioState.on ? `Radio an — ${RADIO_STATIONS[this.radioState.station]}` : 'Radio aus',
    );
    return true;
  }

  /** Was auf dem zweiten Knopf steht — es sagt die **Tat**, siehe `showBuildLabel`. */
  private showHandsLabel(): void {
    this.handsButton?.setTitle(
      this.twoHands ? HANDS_BUTTON_LABELS.on : HANDS_BUTTON_LABELS.off,
      HANDS_BUTTON_BODY,
    );
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

  // --- die Fächer: was welche Hand hält --------------------------------------

  /**
   * **Welche Seite gehandelt hat** — die Hand, wenn es eine war, sonst die
   * Figur (`core/usable.UseSource.hand`).
   *
   * Von oben und am Schreibtisch gibt es keine Hand; dort ist `'body'` die
   * ehrliche Antwort und nicht der Notfall.
   */
  private sideOf(by?: UseSource): CarrySide {
    return by?.hand ?? 'body';
  }

  /**
   * **Das Fach, das diese Seite meint** — die Betriebsart, in einer Zeile
   * (`kitchenCarry.carrySlot`).
   *
   * Steht der Schalter aus, ist es für jede Seite dasselbe: Die Küche trägt
   * eines, und jede Hand fragt nach demselben Ding. Steht er an, hat jede Hand
   * ihr eigenes — und wer ohne Hand fragt, bekommt das der zuletzt tätigen
   * (`busyHand`).
   */
  private slot(side: CarrySide): CarrySide {
    return carrySlot(side, this.twoHands, this.busyHand);
  }

  /** **Was diese Seite hält** — die Frage, die jede Tat an einer Station stellt. */
  private heldBy(side: CarrySide): Carried | null {
    return this.holds.get(this.slot(side))?.thing ?? null;
  }

  /**
   * **Etwas in das Fach dieser Seite legen** — oder es räumen.
   *
   * Die Hand wird mitgeschrieben, und zwar die **echte**: Bei `'body'` gibt es
   * keine, bei einer Seite ist es sie selbst. Daran hängt das Ding in der
   * Brille (`holdInHand`), und daran findet die Übergabe es wieder
   * (`holdAt`).
   */
  private setHeld(side: CarrySide, thing: Carried | null): void {
    const slot = this.slot(side);
    if (!thing) {
      this.holds.delete(slot);
      return;
    }
    this.holds.set(slot, { thing, hand: side === 'body' ? null : side });
  }

  /**
   * **Sind die Hände voll?** — die zweite der beiden Fragen dieser Datei.
   *
   * Sie ist **nicht** „was hält diese Hand?": Wer den Möbelkatalog öffnet, den
   * Umbau anschaltet oder einen fertigen Teller aus der Spüle gedrückt bekommt,
   * braucht einen **freien Griff** vor dem Bauch, und den gibt es nur, solange
   * gar nichts getragen wird. Ein Möbel und ein Brötchen stritten sich sonst um
   * dieselbe Stelle (`carryInHands`).
   *
   * Deshalb zählt hier auch mit dem Schalter an **jedes** Fach: Eine Hand mit
   * der Pfanne darin ist keine freie Hand für eine Ausgabetheke.
   */
  private handsFull(): boolean {
    return this.holds.size > 0;
  }

  /**
   * **Was an dieser echten Hand hängt** — samt dem Fach, in dem es liegt.
   *
   * Die Übergabe fragt danach und nicht nach `heldBy`, und das ist der ganze
   * Unterschied zwischen den beiden Betriebsarten: Steht der Schalter aus, gibt
   * `heldBy` **jeder** Seite dasselbe Ding zurück — die leere Hand sähe damit
   * nie leer aus, und eine Übergabe käme nie zustande. Woran es wirklich hängt,
   * steht in `Hold.hand`, und das gilt in beiden Betriebsarten.
   */
  private holdAt(hand: Handedness): { slot: CarrySide; hold: Hold } | null {
    for (const [slot, hold] of this.holds) {
      if (hold.hand === hand) return { slot, hold };
    }
    return null;
  }

  /**
   * **Der Feuerlöscher, wenn eine Hand ihn hält** — samt dieser Hand.
   *
   * Gesucht und nicht gemerkt: Er ist ein getragenes Ding wie jedes andere und
   * kann in jedem Fach liegen. Ein zweiter Merker daneben wäre die zweite
   * Wahrheit, die beim nächsten Handgriff auseinanderläuft — und in der Küche
   * gibt es genau einen Löscher (`core/kitchenModel.takeUtensil`), also findet
   * diese Schleife auch höchstens einen.
   */
  private extinguisher(): { thing: Carried; hand: Handedness | null } | null {
    for (const hold of this.holds.values()) {
      if (hold.thing.dish.item === 'extinguisher') return { thing: hold.thing, hand: hold.hand };
    }
    return null;
  }

  /** Was diese Seite trägt, so wie die Regel es sehen will. */
  private held(side: CarrySide): Dish | null {
    return this.heldBy(side)?.dish ?? null;
  }

  /**
   * **Was `A` an dieser Station täte** — für die Hand, die fragt
   * (`kitchenCarry.kitchenDeed`).
   *
   * Die Seite wird **durchgezogen** und nicht geraten: Wer mit der linken Hand
   * die Pfanne hält und mit der rechten nach dem Brötchen greift, bekommt für
   * die rechte Hand die Tat der rechten Hand. Ohne Seite (`'body'` — der
   * Hinweis über der Station, der ohne Hand gelesen wird) gilt die zuletzt
   * tätige (`slot`).
   */
  private deedAt(spot: Station, side: CarrySide): KitchenDeed {
    return kitchenDeed(this.held(side), facts(spot));
  }

  /**
   * **Ob der Trigger gerade frei ist** — für die Anmeldung der Stationen in der
   * Brille (`kitchenCarry.kitchenInteractionSpec`).
   *
   * Er ist es nicht, solange die Hand etwas hält, das ihn selbst benutzt: den
   * **Feuerlöscher** (er spritzt damit, `spray`) und ein **getragenes Möbel**
   * (es wendet sich damit, `buildTurn`). Beides sind Tasten, die ein Mensch
   * gedrückt hält oder mehrmals antippt, während er vor einer Arbeitsplatte
   * steht — und wenn dieselbe Taste dabei ablegte, läge der Löscher nach dem
   * ersten Löschversuch auf der Zeile.
   *
   * **Und er gilt je Hand**, seit beide tragen dürfen: Wer den Löscher links
   * hält, hat rechts weiter einen freien Trigger. Das getragene **Möbel**
   * dagegen ist keine Sache einer Hand — es hängt am Rig und wird vor dem Bauch
   * getragen (`liftPiece`), also ist sein Auslöser für beide Hände vergeben.
   */
  private triggerFree(side: CarrySide): boolean {
    return !this.lifted && this.heldBy(side)?.dish.item !== 'extinguisher';
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
    // **Die handelnde Seite, einmal bestimmt und danach durchgezogen.** Jede
    // Zeile darunter, die etwas aus der Hand nimmt oder hineinlegt, meint
    // **diese** Hand und nicht „die Hand" — mit dem Schalter aus ist das
    // dasselbe (es gibt nur ein Fach), mit ihm an ist es der Unterschied
    // zwischen der Pfanne links und dem Burger rechts.
    const side = this.sideOf(by);
    if (by?.hand) this.busyHand = by.hand;
    const deed = this.deedAt(spot, side);
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
        const thing = this.heldBy(side);
        if (!thing) return false;
        this.setHeld(side, null);
        if (stacks(spot.kind)) {
          // An der Rückgabe und im Abtropfgitter wird nicht abgelegt, sondern
          // **gestapelt**: Der Teller geht im Stapel auf, sein Netz wird nicht
          // gebraucht. Seine **Sorte** geht mit — in ein leeres Gitter darf
          // beides, und was hineinkommt, legt für die nächsten fest, was noch
          // dazudarf (`kitchenCarry.inRack`).
          this.discard(thing);
          this.setStack(spot, spot.stack + 1, deed.dish.item);
          world.notify(`${dishLabel(deed.dish)} abgestellt (${spot.stack})`);
          break;
        }
        this.layOn(spot, thing);
        // **Ein Filterband lernt genau hier**, und sonst nirgends: beim
        // Auflegen **von Hand**. Was ein Band selbst herbeischafft, lehrt es
        // nichts (`kitchenBelt.beltLearns`) — sonst hätte es nach der ersten
        // Fuhre einen Filter, den niemand gesetzt hat. Gelernt wird das Ding
        // selbst und nicht sein Belag: Wer einen Teller mit Burger auflegt,
        // meint Teller (`kitchenBelt.beltWants`).
        if (this.learnFilter(spot, deed.dish.item)) {
          world.notify(
            `${ITEM_LABELS[deed.dish.item]} gemerkt — ${spot.label} zieht jetzt nur noch das`,
          );
          break;
        }
        // Am Brett, im Mixer, auf der Kochstelle und in der Spüle fängt die
        // Arbeit sofort an — `layOn` legt die Uhr an (`settle`), gesagt wird es
        // hier. Welches Wort zu welcher Arbeit gehört, steht in der Regel
        // nebenan und wird hier nur ins Präsens gesetzt
        // (`kitchenCarry.kitchenPrompt` sagt dieselben vier).
        world.notify(
          deed.do === 'work'
            ? deed.kind === 'wash'
              ? 'Geschirr wird gespült'
              : `${ITEM_LABELS[deed.dish.item]} ${WORK_WORDS[deed.kind]}`
            : `${dishLabel(deed.dish)} auf ${spot.label}`,
        );
        break;
      }
      case 'combine': {
        // **Was vorher in der Hand lag** — gemerkt, bevor `merge` es
        // umbaut. Es ist die einzige Auskunft, die der Tat fehlt: Sie sagt,
        // was danach in der Hand liegt, und nicht, ob der **Träger** darunter
        // ein anderer geworden ist.
        const was = this.heldBy(side)?.dish.item ?? null;
        this.merge(spot, side, deed.held, deed.target);
        // **Der Träger hat gewechselt**: An der Tellerkiste und am
        // Abtropfgitter nimmt man einen Teller **und** richtet darauf an, und
        // dasselbe geschieht mit dem Brötchen in der Hand vor einem Teller auf
        // der Zeile. „Brötchen aufgenommen" wäre dort das Falsche — das
        // Brötchen lag schon in der Hand; genommen wurde der Teller. Derselbe
        // Satz wie beim Nehmen, denn es ist derselbe Handgriff.
        if (deed.held && was && deed.held.item !== was) {
          world.notify(`${dishLabel(deed.held)} in der Hand`);
          break;
        }
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
      case 'fill': {
        // **Nur die Hand ändert sich.** Das Becken bleibt, wie es ist — samt
        // dem dreckigen Teller darin und samt seiner laufenden Uhr: `settle`
        // wird hier ausdrücklich **nicht** gerufen, sonst finge das Spülen
        // neben dem Topf von vorn an (`kitchenWork.onWork`). Der Topf wird
        // untergehalten und nicht eingeräumt, und genau so wenig rührt dieser
        // Fall die Station an.
        const thing = this.heldBy(side);
        if (!thing) return false;
        this.restyle(thing, deed.dish);
        // „Topf mit Wasser gefüllt" und nicht `dishLabel` („Topf (Wasser)"):
        // Die Klammer ist die Form für eine **Aufzählung** von Belag, und hier
        // gibt es nur eines, das dazugekommen ist. Derselbe Satzbau wie im
        // Hinweis darüber (`kitchenCarry.kitchenPrompt`), nur im Perfekt.
        world.notify(
          `${ITEM_LABELS[deed.dish.item]} mit ${ITEM_LABELS[deed.dish.on[0] ?? 'water']} gefüllt`,
        );
        break;
      }
      case 'trash': {
        const thing = this.heldBy(side);
        if (!thing) return false;
        this.setHeld(side, null);
        this.discard(thing);
        world.notify(`${dishLabel(deed.dish)} weggeworfen`);
        break;
      }
      case 'scrape': {
        // **Der Träger bleibt in der Hand.** Wer einen misslungenen Burger
        // wegwirft, will nicht auch noch zur Tellerausgabe laufen. Was
        // danach in der Hand ist, steht in der Tat — der leere Träger.
        const thing = this.heldBy(side);
        if (!thing) return false;
        this.restyle(thing, deed.dish);
        world.notify(`${ITEM_LABELS[deed.dish.item]} abgeräumt`);
        break;
      }
      case 'serve': {
        const thing = this.heldBy(side);
        if (!thing) return false;
        // **Teller und Gericht gehen zusammen**, und beide zum Gast: `held`
        // ist deshalb `null` (`kitchenCarry.atPass`). Die Hand ist danach frei.
        this.setHeld(side, null);
        this.discard(thing);
        this.showTicket(spot, deed.recipe.label);
        world.notify(`${deed.recipe.label} serviert — ${this.toGuest()}`);
        break;
      }
      case 'stow': {
        // **Zurück in die Kiste**: Die Hand wird leer, die Kiste bleibt, wie
        // sie war — sie gibt ihr Frisches ja beliebig oft wieder her. Das Netz
        // wird weggeräumt wie beim Wegwerfen; der Unterschied zum Mülleimer
        // steht in der Regel und im Satz darüber, nicht hier
        // (`kitchenCarry.fromCrate`).
        const thing = this.heldBy(side);
        if (!thing) return false;
        this.setHeld(side, null);
        this.discard(thing);
        world.notify(`${dishLabel(deed.dish)} zurückgelegt`);
        break;
      }
      case 'repair':
        // **Angesetzt, mehr nicht** (`kitchenLeak.startFix`): Die Zange bleibt
        // in der Hand, im Becken ändert sich nichts, und ab dem nächsten Bild
        // läuft die Uhr, solange jemand danebensteht (`leakFrame`). Gesagt
        // wird es trotzdem — ein Balken, der ohne ein Wort angeht, sieht aus
        // wie etwas, das von selbst passiert.
        spot.leak = startFix(spot.leak);
        world.notify('Die Zange sitzt — dabeibleiben, bis es dicht ist');
        break;
      case 'refuse':
        world.notify(deed.why);
        return true;
      case 'nothing':
        return false;
    }
    // **Eine Stelle für zehn Taten** (`kitchenSound.deedSound`): Welche Tat wie
    // klingt, steht in einer vollständigen Tabelle neben der Regel und nicht
    // als zehnter Zweig in diesem `switch`. Wer eine Tat dazutut, bekommt vom
    // Übersetzer die Frage nach ihrem Ton gestellt — ein `case` mehr hier
    // hätte sie niemand gestellt. Gehört wird sie **an der Station**, nicht am
    // Ohr: Die Kiste links klingt von links.
    const cue = deedSound(deed.do, spot.kind);
    if (cue) this.sound.play(cue, this.heardAt(spot.deck, cue));
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
   * - An einem **Stapel** wird gezählt statt umgeräumt: Zusammengelegt wird
   *   dort nur mit dem obersten Teller (`kitchenCarry.inRack`), und der
   *   verlässt den Stapel — er liegt danach in der Hand, unter dem Gericht.
   *   Ohne diese Zeile stünden vier Teller im Gitter und der fünfte in der
   *   Hand.
   *
   * **Ein geladenes Gerät verschwindet dabei nie.** Eine Pfanne gibt ihren
   * Inhalt ab und bleibt, ein Topf und ein Feuerlöscher nehmen gar nichts an
   * — es gibt also keinen Weg, auf dem hier das einzige Exemplar eines Netzes
   * weggeworfen würde. Gäbe es ihn, stünde die Küche danach ohne Pfanne da.
   */
  private merge(spot: Station, side: CarrySide, held: Dish | null, target: Dish | null): void {
    const hand = this.heldBy(side);
    if (hand) {
      if (held) this.restyle(hand, held);
      else {
        this.setHeld(side, null);
        this.discard(hand);
      }
    }
    if (stacks(spot.kind)) {
      // **Der Stapel gibt einen her.** Eine Rückgabe und ein Abtropfgitter
      // führen keinen `Dish`, sondern eine Zahl (`stacks`); `target` ist an
      // ihnen deshalb immer `null` und meint nichts, was hier umzuräumen wäre.
      this.setStack(spot, spot.stack - 1);
      return;
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
    // **Beide Kistenarten geben Frisches**, solange nichts auf ihnen liegt —
    // liegt doch etwas, hat die Regel genau das gemeint
    // (`kitchenCarry.fromBox`).
    //
    // Auf einer **Vorratskiste** liegt von Hand nie etwas (`fromCrate` lehnt
    // das Ablegen ab); dort ist `on` der Griff, mit dem eine Bandstraße ihre
    // nächste Zutat für ein Bild bereitlegt (`sprout`). Auch die gehört
    // herausgegeben und nicht liegengelassen — sonst hinge sie in der Szene,
    // während die Hand ein zweites, frisches Stück bekäme.
    if ((spot.kind === 'box' || spot.kind === 'crate') && !spot.on) return this.make(want);
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
   * **Der Stapel an der Rückgabe und im Abtropfgitter** — eine Zahl, eine
   * Sorte und ein Netz dazu.
   *
   * Das Netz wird nur dann neu gebaut, wenn sich Zahl **oder** Sorte geändert
   * haben: Ein Stapel, der jedes Bild neu entsteht, wäre sechs Teller je Bild.
   *
   * **Zwei Stationen, eine Rechnung**: An der Rückgabe liegen bis zu sechs
   * dreckige Teller übereinander, im Abtropfgitter stehen bis zu vier
   * **hochkant** in seinen Fächern (`kitchenCarry.CLEAN_STACK_MAX`,
   * `core/kitchenFit.RACK_SLOTS`). Was sich unterscheidet, sind die Grenze und
   * das Netz; alles andere — zählen, altes Netz wegräumen, neues hinstellen —
   * ist Zeile für Zeile dasselbe.
   *
   * **Die Sorte gehört dazu und ist nicht zu erraten.** Ein leeres Gitter nimmt
   * saubere wie dreckige Teller an, und was drinsteht, entscheidet danach, was
   * noch dazudarf (`kitchenCarry.inRack`). Wer die Sorte aus der Stationsart
   * ableiten wollte, hätte ein Gitter, das immer sauber aussieht, auch wenn der
   * Abwasch darin wartet.
   */
  private setStack(spot: Station, count: number, item?: KitchenItem): void {
    const rack = spot.kind === 'drain';
    const want = Math.max(0, Math.min(rack ? CLEAN_STACK_MAX : DIRTY_STACK_MAX, count));
    // Die Rückgabe kennt nur dreckiges Geschirr; das Gitter behält, was schon
    // darinsteht, und übernimmt beim ersten Teller dessen Sorte.
    const kind: KitchenItem | null =
      want <= 0 ? null : rack ? (spot.stacked ?? item ?? 'plate') : 'plate-dirty';
    if (want === spot.stack && kind === spot.stacked && (want === 0) === (spot.pile === null)) {
      return;
    }
    spot.stack = want;
    spot.stacked = kind;
    if (spot.pile) {
      spot.pile.removeFromParent();
      this.forget(spot.pile);
      spot.pile = null;
    }
    if (want <= 0 || !kind) return;
    const pile = rack ? this.food.rackPlates(want, kind) : this.food.dirtyStack(want);
    pile.position.copy(spot.deck);
    // **Der Stapel dreht sich mit seinem Möbel.** Ein Turm aus Tellern ist rund
    // und hat es nie gebraucht; die vier Fächer eines Abtropfgitters liegen
    // hintereinander, und quer zum Gitter stünden die Teller sichtbar daneben.
    // Er hängt an der Welt und nicht am Möbel (er steht auf `deck`, einer
    // Weltkoordinate), also wird die Drehung hier nachgezogen.
    pile.rotation.y = spot.home.model.rotation.y;
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
      const top = this.food.topping(next, looseRim(next.item));
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
    if (by?.hand) this.busyHand = by.hand;
    this.setHeld(this.sideOf(by), thing);
    thing.handle = this.grabbedAt(thing, spot, by);
    // Dieselbe Drehung wie vor dem Bauch (`backToBelly`), damit der Löscher
    // nicht ein Bild lang quer in der Hand hängt, bis `carryInHands` ihn
    // nachzieht.
    thing.object.rotation.set(0, kitchenCarryTurn(thing.dish.item), 0);
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
    this.restOn(spot, thing);
    this.settle(spot);
  }

  /**
   * **Ein liegendes Ding auf seine Kachel setzen** — mit seinem
   * **Arbeitspunkt** über der Mitte und nicht mit seinem Ursprung
   * (`core/kitchenFit.kitchenHub`).
   *
   * Für alles, was diese Küche baut, ist das dieselbe Zeile wie vorher: Ein
   * Teller, ein Brötchen, ein Topf haben ihren Ursprung in ihrer Mitte.
   *
   * **Die Pfanne hat ihn nicht.** Sie wird von ihrem Herd abgenommen
   * (`core/kitchenModel.takeUtensil`) und bekommt dabei die Mitte ihrer Hülle
   * als Ursprung — die Hälfte davon ist Stiel, also liegt die Mulde 22,5 cm
   * dahinter. Auf die Kachelmitte gesetzt saß sie damit sichtbar zu weit
   * hinten, und der Rost lag frei davor.
   */
  private restOn(spot: Station, thing: Carried): void {
    const [hx, hz] = kitchenHub(thing.dish.item);
    thing.object.position.set(spot.deck.x - hx, spot.deck.y, spot.deck.z - hz);
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
      // Auf dem Herd steht die Pfanne, **in** ihr liegt das Patty — und wer
      // sie anfasst, löscht die Uhr, in beide Richtungen. Die Regel steht
      // nebenan und nicht hier (`kitchenClock.stoveUnder`), weil sie dort
      // einen Test hat: Diese Zeile braucht three.js und ist damit die eine
      // Stelle, an der eine Rechnung unbewiesen bliebe.
      spot.stove = stoveUnder(on);
      return;
    }
    // Vier Möbel, vier Arten, **eine** Uhr (`kitchenWork.ts`) — und die
    // Zuordnung ist **eine Tabelle** und keine Kette aus Fragezeichen
    // (`kitchenCarry.STATION_WORK`). Sie steht dort und nicht hier, weil `A`
    // sie vor dem Ablegen schon einmal braucht: Zwei Ketten, die dasselbe
    // sagen sollen, sagen es irgendwann nicht mehr.
    const work = STATION_WORK[spot.kind];
    if (work) {
      spot.work = onWork(work, on?.item ?? null);
      return;
    }
    if (spot.kind === 'combiner') {
      // **Was frisch hier liegt, wird von vorn zusammengelegt.** Ein
      // Fortschritt, der einen Handgriff überlebte, legte im nächsten Bild
      // etwas auf eine Unterlage, die es nicht mehr gibt — derselbe Grund, aus
      // dem auch der Fahrtzustand eine Zeile weiter oben zurückfällt.
      spot.join = IDLE_COMBINE;
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
   *
   * **Und „weg" heißt nicht für immer.** Hier stand lange ein blankes
   * `discard`, und für ein Brötchen war das richtig: Es ist aus der Ausgabe
   * gekommen und kommt von dort wieder. Pfanne, Topf und Feuerlöscher sind
   * aber keine Ware — sie werden beim Aufbau **einmal** aus dem Modell
   * gelöst (`takeUtensil`), und es gibt genau eine von jeder. Wer den Umbau
   * mit der Pfanne in der Hand anschaltete, warf damit die einzige Pfanne der
   * Küche aus der Szene, und bis zum nächsten `reset` briet niemand mehr
   * etwas. Was einen Platz hat, an den es gehört, geht deshalb dorthin
   * zurück; weggeworfen wird nur, was keinen hat.
   */
  private toggleEdit(): boolean {
    const world = this.world;
    if (!world) return false;
    // **In beide Richtungen die Hände frei.** Beim Ausschalten war das schon
    // so; beim Einschalten ist es nötig, seit ein Möbel auch ohne Umbau in die
    // Hand kommt (`takeFromCatalogue`) — ein getragener Herd wäre sonst eine
    // Station, die das Abräumen gleich darauf auf ihre alte Kachel
    // zurückräumt, und der Topf läge dort, wo der Herd einmal stand.
    if (this.lifted) this.dropPiece(true);
    this.editing = !this.editing;
    // **Und mit den Händen hört die ganze Küche auf zu arbeiten**
    // (`calmStations`): Der Herd brennt nicht mehr, der Gast am Tisch ist
    // aufgestanden, das Band steht, die Stapel sind weg. Das Aufräumen selbst
    // unterscheidet dabei wie hier zwischen Gerät und Ware
    // (`kitchenBuild.goesHomeOnEdit`).
    if (this.editing) this.calmStations();
    // Alle Anmeldungen fallen lassen: Im Baumodus meint `A` etwas anderes,
    // und ein Möbel, das noch die Anmeldung von vorhin trägt, tut das Falsche.
    for (const furnish of this.furniture) {
      if (furnish.usable) world.removeUsable(furnish.usable);
      furnish.usable = null;
    }
    // Das Schild geht mit: Es sagt, was der **nächste** Druck tut.
    this.showBuildLabel();
    world.notify(
      this.editing ? 'Umbau: Möbel sind abgeräumt und lassen sich tragen' : 'Umbau beendet',
    );
    this.refreshStations();
    return true;
  }

  /** Im Baumodus hört **jedes** Möbel auf `A` — und zwar auf sich selbst. */
  private refreshEditables(world: ZoneHost): void {
    for (const furnish of this.furniture) {
      // Die mit eigener Anmeldung übergehen: Sie haben im Umbau dieselben zwei
      // Bedeutungen wie sonst, nur dass eine davon das Aufheben ist
      // (`useDesk`, `useCopier`).
      if (selfServed(furnish.piece.name)) continue;
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
        //
        // **Und hier bleibt es bei der Greif-Taste allein**, obwohl `grab` in
        // der Brille seit Neuestem auch den Trigger kennt
        // (`core/interaction.INTERACTION_DEFAULTS`). Der Trigger hat in der
        // Hand, die ein Möbel trägt, schon eine Aufgabe: Er **wendet** es
        // (`buildTurn`). Beides auf derselben Taste hieße, dass derselbe Druck
        // das Möbel aufhebt und im selben Bild einmal weiterdreht — und wer
        // dann wenden will, hebt beim nächsten Druck das nächste auf.
        interaction: {
          kind: 'grab',
          views: { vr: { inputs: ['grip'], press: 'hold' } },
          grab: kitchenPieceGrab(furnish.piece),
        },
      },
      { shot: 0 },
    );
  }

  // --- der Rechner, der Möbelkatalog und der Kopierer -------------------------

  /**
   * **Die Möbel, die sich selbst bedienen** — und es sind alle ihrer Sorte
   * (`selfServed`).
   *
   * Sie hängen an keiner Station, also käme in der Schleife über die Stationen
   * nie eine Anmeldung für sie zustande. Ihre gilt in **beiden**
   * Betriebsarten: Auch beim Kochen soll man den Katalog aufmachen können, und
   * kopieren auch dann, wenn gerade nicht umgebaut wird.
   */
  private refreshSpecials(world: ZoneHost): void {
    for (const furnish of this.furniture) {
      const kind = selfServed(furnish.piece.name);
      if (!kind) continue;
      // Der Kopierer hört auch mit einem Möbel in der Hand zu — auf ihn legt
      // man es ja. Der Rechner nicht: Dort **holt** man eines, und zwei auf
      // einmal trägt niemand; abgemeldet gewinnt stattdessen der Bauplatz vor
      // den Füßen (`showGhost`), und das ist auch das, was man dann will.
      const free = kind === 'copier' || this.lifted === null;
      this.setSelf(world, furnish, !furnish.held && free);
    }
  }

  /** Ein solches Möbel an- oder abmelden — eine Anmeldung, zwei Bedeutungen. */
  private setSelf(world: ZoneHost, furnish: Furnish, wanted: boolean): void {
    const target = wanted ? furnish.model : null;
    if (target === furnish.usable) return;
    if (furnish.usable) world.removeUsable(furnish.usable);
    furnish.usable = target;
    if (!target) return;
    // Drei Pfeilfunktionen davor und nicht `this` in einen Namen gelegt: Ein
    // Getter im Objektliteral bindet sein eigenes `this`, und das wäre hier
    // das Literal und nicht die Zone.
    const copier = selfServed(furnish.piece.name) === 'copier';
    const act = (by: UseSource): boolean =>
      copier ? this.useCopier(furnish, by) : this.useDesk(furnish, by);
    const say = (): string => (copier ? this.copierPrompt(furnish) : this.deskPrompt(furnish));
    const grip = (): 'press' | 'grab' =>
      copier ? this.copierGrip(furnish) : this.deskGrip(furnish);
    world.addUsable(
      furnish.model,
      {
        use: act,
        usePrompt: say,
        // **Bei jedem Lesen neu**, wie bei den Stationen nebenan: Derselbe
        // Rechner wird von vorn gedrückt und von hinten gegriffen, ohne dass
        // sich sein Netz dazwischen ändert. Die Griffe sind dieselben wie bei
        // jedem anderen Möbel (`kitchenGrab.kitchenPieceGrab`) — anzufassen
        // ist ein Computer-Tisch nichts Besonderes, nur zu **bedienen**.
        get interaction() {
          return grip() === 'grab'
            ? {
                kind: 'grab' as const,
                views: { vr: { inputs: ['grip' as const], press: 'hold' as const } },
                grab: kitchenPieceGrab(furnish.piece),
              }
            : ('press' as const);
        },
      },
      { shot: 0 },
    );
  }

  /**
   * **Wo die Figur relativ zu einem Möbel steht**, auf dem Boden — der eine
   * Vektor, aus dem Seite (`pieceSide`) und Feld (`copierField`) folgen.
   *
   * Gegen die **Mitte des Netzes** und nicht gegen die Kachel: Ein Möbel über
   * zwei Kacheln hat seine Mitte auf der Fuge, und genau dort liegen auch die
   * beiden Feldmitten des Kopierers (`kitchenDesk.COPIER_PLATE`).
   */
  private towards(furnish: Furnish): { dx: number; dz: number } {
    return { dx: _feet.x - furnish.model.position.x, dz: _feet.z - furnish.model.position.z };
  }

  /**
   * **Von vorn der Rechner, von der Seite das Möbel.**
   *
   * Der Computer-Tisch ist das erste Möbel dieser Küche mit zwei Bedeutungen
   * an **einem** Netz, und die Seite entscheidet, welche gilt: Vorn steht der
   * Bildschirm, also wird vorn benutzt; von der Seite und von hinten greift
   * man nach dem Tisch selbst. Das ist keine Spitzfindigkeit, sondern die
   * einzige Aufteilung, bei der beides erreichbar bleibt — ein Tisch, den man
   * nur über einen Modus aufhebt, wäre im Umbau nicht zu versetzen, und einer,
   * den jeder Druck aufhebt, hätte keinen Rechner.
   *
   * Aufgehoben wird **nur im Umbau**: Wer beim Kochen hinter den Tisch tritt,
   * will nicht mit ihm in den Händen dastehen.
   */
  private useDesk(furnish: Furnish, by?: UseSource): boolean {
    const world = this.world;
    if (!world) return false;
    // **Im Konstrukt zählt die Seite nicht mehr.** Dort ist der Tisch das
    // Einzige, was noch dasteht, und damit der einzige Weg zurück — wer ihn
    // von hinten anfasst, will hinaus und nicht einen Tisch aufheben, der in
    // einem weißen Raum steht.
    if (world.inConstruct()) {
      world.leaveConstruct();
      return true;
    }
    const { dx, dz } = this.towards(furnish);
    if (pieceSide(furnish.turn, dx, dz) === 'front') return this.openCatalogue(furnish);
    if (this.editing) return this.liftPiece(furnish, by);
    world.notify(`${furnish.piece.label}: von vorn bedienen, von der Seite umbauen`);
    return true;
  }

  private deskPrompt(furnish: Furnish): string {
    if (this.world?.inConstruct()) return 'Zurück in die Küche';
    const { dx, dz } = this.towards(furnish);
    if (pieceSide(furnish.turn, dx, dz) === 'front') {
      return this.handsFull() ? 'Erst die Hände frei machen' : 'Möbelkatalog öffnen';
    }
    return this.editing
      ? `${furnish.piece.label} aufheben`
      : `${furnish.piece.label} — von vorn bedienen`;
  }

  private deskGrip(furnish: Furnish): 'press' | 'grab' {
    if (this.world?.inConstruct()) return 'press';
    const { dx, dz } = this.towards(furnish);
    if (pieceSide(furnish.turn, dx, dz) === 'front') return 'press';
    return this.editing ? 'grab' : 'press';
  }

  /**
   * **Der Möbelkatalog** — das Konstrukt, in dem die Küche zur Auswahl steht.
   *
   * Die Welt verblasst, der Tisch bleibt stehen, und um die Figur herum fahren
   * die Möbel als Miniaturen aus dem Boden (`worlds/shared/construct.ts`).
   * Wer eines anfasst, hat es in der Hand und steht im selben Augenblick
   * wieder in der Küche — genau dort, wo er vor dem Tisch stand, denn bewegt
   * hat er sich nie.
   *
   * **Mit vollen Händen geht er nicht auf**, und das ist keine Schikane: Die
   * Figur trägt genau **ein** Ding vor dem Bauch (`carryInHands`), Essen und
   * Möbel teilen sich diesen Platz. Wer mit einem Brötchen in der Hand ein
   * Möbel zöge, bekäme ein Möbel, das dreißig Meter neben ihm herflöge, weil
   * es niemand hinstellt.
   *
   * **Gezeigt wird, was geladen ist**, und nicht, was im Katalog steht: Ohne
   * WebGL und ohne Modelldatei gibt es keine Netze, und ein Regal aus leeren
   * Gruppen wäre ein weißer Raum, in dem man nichts findet. Die gebauten
   * Stücke (Bänder, Tisch, Kopierer) stehen immer darin — sie hängen an keiner
   * Datei.
   */
  private openCatalogue(furnish: Furnish): boolean {
    const world = this.world;
    if (!world) return false;
    if (this.handsFull()) {
      world.notify('Erst die Hände frei machen');
      return true;
    }
    // **Der Katalog zeigt den Katalog** — jedes Stück, das in
    // `core/kitchenFit.KITCHEN_PIECES` steht, und keine zweite Liste daneben.
    //
    // Vorher stand hier ein Filter auf `this.models`: gezeigt wurde nur, wovon
    // beim Aufbauen der Küche schon eine Vorlage angefallen war. Das ging gut,
    // solange der Schauraum jedes Stück genau einmal aufstellt (ein Test hält
    // das fest) — aber es koppelte den Katalog an den **Aufbau** statt an den
    // Katalog, und wer ein Möbel eintrug, ohne es irgendwo hinzustellen, fand
    // es hier nicht wieder. Jetzt holt sich die Miniatur ihre Vorlage selbst,
    // wenn sie fehlt, und der Raum ist ohne Zutun aktuell.
    const items: ConstructItem[] = KITCHEN_PIECES.map((piece) => {
      const [w, d] = piece.tiles;
      return {
        // **Gebaut wird erst beim Auffahren** (`ConstructItem.object`):
        // zweiundzwanzig Miniaturen in einem Bild waren genau die Pause nach
        // dem Druck auf den Rechner.
        object: () => this.miniature(piece.name),
        label: piece.label,
        body: `${w} × ${d} Kachel${w * d === 1 ? '' : 'n'} · ${piece.height.toFixed(2)} m hoch`,
        // **So viele Kacheln, wie es im Spiel belegt.** Der Raum stellt es auf
        // ebenso viele, und die Miniatur wird auf diese Fläche skaliert — ein
        // Mülleimer neben einer Ausgabetheke sieht damit aus wie ein Mülleimer
        // neben einer Ausgabetheke.
        tiles: { w, d },
        pick: () => {
          this.takeFromCatalogue(piece);
          // `true` heißt: Der Raum geht zu. Ein Möbel in der Hand hat in einem
          // Regal voller Möbel nichts mehr zu suchen, und hinstellen will man
          // es ohnehin draußen.
          return true;
        },
      };
    });
    world.enterConstruct({
      anchor: furnish.model,
      at: this.rig?.position ?? furnish.model.position,
      items,
      title: 'Möbelkatalog — greif dir eines',
    });
    return true;
  }

  /**
   * **Eine Vorlage klonen, so dass man den Klon auch sieht.**
   *
   * Der eine Handgriff, der hier dazugehört, ist `visible = true`, und er ist
   * kein Aberglaube. Der Konstrukt-Raum blendet beim Betreten jedes oberste
   * Kind der Weltgruppe aus (`shared/construct.ConstructRoom.hideList`, und
   * ausgeführt wird es in `paint`, sobald die Deckkraft unten ist) — und die
   * Vorlagen in `models` sind genau solche Kinder: Sie sind die Möbel des
   * Schauraums, die `place` an `world.root` gehängt hat. Wer währenddessen
   * klont, klont ein ausgeblendetes Netz, und `Object3D.clone` nimmt die
   * Flagge mit.
   *
   * Beim Verlassen wird das **Original** wieder sichtbar, weil es auf der
   * Liste `hidden` steht — der Klon nicht: Er ist erst nach dem Ausblenden
   * entstanden und stand nie darauf. Ein Möbel, das man aus dem Katalog nahm,
   * war deshalb hinterher weder in der Hand noch auf seiner Kachel zu sehen,
   * obwohl es beides gab und beides funktionierte.
   *
   * Nur die Wurzel und nicht der ganze Baum: Ausgeblendet wird der oberste
   * Knoten, und was darunter aus eigenen Gründen unsichtbar ist, soll es
   * bleiben.
   */
  private cloneModel(source: THREE.Object3D | null | undefined): THREE.Object3D | null {
    if (!source) return null;
    const model = source.clone(true);
    model.visible = true;
    return model;
  }

  /**
   * **Eine Miniatur eines Katalogstücks** — geklont, nicht gebaut, und nur
   * einmal.
   *
   * Auf ein Maß gerechnet und nicht auf einen festen Faktor: Zwischen einem
   * Mülleimer (45 cm) und einer Ausgabetheke über zwei Kacheln liegt der Faktor
   * vier, und mit einem festen Maßstab wäre entweder die Theke zu groß für ihre
   * Kachel oder der Eimer ein Krümel. Der Ursprung wandert dabei nach **unten
   * in die Mitte**, weil der Konstrukt-Raum seine Stücke auf eine Kachelmitte
   * stellt und sie nicht an ihrem Modellursprung aufhängt.
   *
   * **Gebaut wird beim ersten Mal, danach kommt dieselbe Miniatur zurück**
   * (`minis`) — das kostet nichts und spart die Pause vor dem ersten Regal.
   * Gemerkt wird aber nur, was fertig geworden ist: Ein Möbel, dessen Datei
   * beim ersten Öffnen noch lud, soll beim zweiten doch noch im Katalog
   * stehen und nicht an einem leeren Eintrag hängenbleiben.
   */
  private miniature(name: string): THREE.Object3D {
    const ready = this.minis.get(name);
    if (ready) return ready;
    const holder = new THREE.Group();
    holder.name = `kitchen-mini-${name}`;
    this.minis.set(name, holder);

    const piece = kitchenPiece(name);
    if (!piece) return holder;
    const template = this.models.get(name) ?? (piece.built ? this.buildPiece(piece) : null);
    if (template) {
      this.fitMini(holder, template);
      return holder;
    }

    // **Keine Vorlage? Dann holt sie sich der Katalog selbst.** Bisher fiel ein
    // Stück, das noch nirgends stand, ersatzlos aus dem Katalog — und wer ein
    // Möbel eintrug, ohne es im Schauraum aufzustellen, suchte hier vergebens.
    // Die Gruppe steht schon im Regal; das Netz wandert hinein, sobald es da
    // ist. Wer in der Zwischenzeit auf die leere Kachel drückt, bekommt das
    // Möbel trotzdem (`takeFromCatalogue` lädt denselben Weg).
    if (canLoadModels()) {
      void import('../../../core/kitchenModel').then(async (module) => {
        if (this.gone) return;
        const model = await module.kitchenModel(name);
        if (!model || this.gone) return;
        if (!this.models.has(name)) this.models.set(name, model);
        this.fitMini(holder, model);
      });
    }
    return holder;
  }

  /**
   * **Die Miniatur in ihre Gruppe stellen** — geschrumpft, aber nicht
   * eingeebnet.
   *
   * **Ein Maßstab für alle**, und das ist die Änderung: Vorher wurde jedes
   * Stück auf 0,8 m **längste Kante** normiert. Nebeneinander sahen ein
   * Mülleimer und eine zwei Kacheln breite Ausgabetheke damit gleich groß aus
   * — die Form stimmte, die Größe log, und die Kachelzahl kam im Bild gar
   * nicht vor. Jetzt schrumpft jedes Stück um **denselben Faktor**: Was im
   * Spiel doppelt so breit ist, ist es auch im Regal, und weil der Raum ihm
   * dort auch zwei Kacheln gibt (`ConstructItem.tiles`), passt es genau
   * hinein.
   *
   * Der Ursprung kommt dabei unten in die Mitte — die Zusage, auf der der
   * Konstrukt-Raum aufsetzt (`shared/construct.raise`).
   */
  private fitMini(holder: THREE.Object3D, template: THREE.Object3D): void {
    const model = this.cloneModel(template);
    if (!model) return;
    model.position.set(0, 0, 0);
    model.rotation.set(0, 0, 0);
    model.scale.set(1, 1, 1);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) return;
    model.scale.setScalar(MINI_SIZE);
    model.position.set(
      (-(box.min.x + box.max.x) / 2) * MINI_SIZE,
      -box.min.y * MINI_SIZE,
      (-(box.min.z + box.max.z) / 2) * MINI_SIZE,
    );
    holder.add(model);
  }

  /**
   * **Ein Möbel aus dem KayKit-Regal** — dasselbe Netz, aber diesmal mit
   * seiner Regel.
   *
   * Die Möbel dieser Küche stehen auf Netzen aus `restaurant-bits`
   * (`core/kitchenFit.KitchenPiece.base`), und genau dieselben Dateien liegen
   * einzeln im Regal. Wer dort die Brötchenkiste nahm, bekam deshalb ein Bild
   * der Brötchenkiste: eine Hülle, eine Masse, und nichts darin. Gemeldet
   * wurde es so: „die platzierten Elemente sollen dann auch funktionsfähig
   * sein wenn ich z. B. Crate Vorratskiste mit Brötchen hinstelle oder Herd,
   * Waschbecken etc."
   *
   * Also greift die Küche zu, wenn die Adresse eines ihrer Möbel meint
   * (`core/kitchenShelf.ts`) — und dann entsteht nicht das Fass, sondern
   * genau das Stück, das auch im Konstrukt-Raum im Regal stünde, mitsamt
   * Station, Ablage und Uhr (`takeFromCatalogue`).
   *
   * **Nur, wer in der Küche steht.** Eine Vorratskiste auf der Wiese hätte
   * niemanden, dem sie etwas ausgeben könnte, und sie käme obendrein sofort
   * auf eine freie Kachel **der Küche** zurück (`freeTile`), sobald jemand
   * `B` drückt — ein Möbel, das man hundert Meter weiter aufhebt und das
   * dann hier landet, wäre ein Fehler, den niemand erklären kann. Draußen
   * bleibt es deshalb ein Fass, und das ist die alte, gute Antwort.
   *
   * @returns ob die Küche es übernommen hat; sonst macht das Regal weiter
   *          wie bisher (`PortalWorld.takeFurniture`)
   */
  takeShelfPiece(path: string): boolean {
    const name = kitchenPieceForModel(path);
    if (name === null || !this.world) return false;
    // **Ohne Rand**: `inKitchen` lässt sonst eine Handbreit Wiese mitgelten
    // (`KITCHEN_EYE_MARGIN`), und dort steht kein Möbel mehr.
    if (!inKitchen(_feet.x, _feet.z, 0)) return false;
    const piece = kitchenPiece(name);
    if (!piece) return false;
    return this.takeFromCatalogue(piece);
  }

  /**
   * **Ein Stück aus dem Katalog nehmen** — es entsteht neu und liegt sofort in
   * der Hand.
   *
   * Es bekommt eine **Heimatkachel**, obwohl es gerade getragen wird, und das
   * ist kein Beiwerk: `B`/`Y` stellt jedes getragene Möbel heim
   * (`dropPiece(true)`), und eines ohne Zuhause landete dann auf der Kachel,
   * auf der schon etwas steht. Gesucht wird deshalb eine freie
   * (`freeTile`) — und wenn die Küche voll ist, gibt es eben kein neues Möbel.
   */
  private takeFromCatalogue(piece: KitchenPiece): boolean {
    const world = this.world;
    if (!world || this.lifted || this.handsFull()) return false;
    // **Geklont wird über `cloneModel`** und nicht über `clone(true)`: Der
    // Griff in den Katalog geschieht im Konstrukt-Raum, und dort ist die
    // Vorlage gerade ausgeblendet. Das gebaute Stück braucht das nicht — es
    // entsteht als frische Gruppe und hat mit der Welt nie etwas zu tun gehabt.
    const model = piece.built
      ? this.buildPiece(piece)
      : this.cloneModel(this.models.get(piece.name));
    if (!model) return false;
    // **Der Klon kommt von einem Netz, das in der Welt steht**, und das kann
    // jede Größe haben: Eine Vorlage auf einer Kopierfläche steht im Drittel.
    // `place`/`standAt` setzen Ort und Drehung, den Maßstab niemand — also
    // hier, aus dem Katalog (`core/kitchenFit.kitchenPieceScale`).
    model.scale.setScalar(kitchenPieceScale(piece));
    const home = this.freeTile(piece);
    if (!home) {
      world.notify('Kein freier Platz in der Küche — erst etwas wegstellen');
      return false;
    }
    // **Ohne Gerät.** `takeUtensil` gäbe eine zweite Pfanne heraus, und es gibt
    // genau eine in dieser Küche (`addStation`). Der geklonte Herd behält sein
    // Pfannennetz als Beiwerk und gibt es nicht her.
    const furnish = this.place(
      model,
      piece,
      { name: piece.name, x: home.x, z: home.z },
      () => null,
    );
    if (!furnish) return false;
    this.liftPiece(furnish);
    world.notify(`${piece.label} aus dem Katalog — hinstellen mit A`);
    return true;
  }

  /**
   * **Die erste Kachel, auf die dieses Stück passt** — von Norden nach Süden
   * gelesen, wie der Aufbau selbst.
   *
   * Sie ist die Heimat eines neu entstandenen Möbels und nicht sein Standort:
   * Hingestellt wird es dort, wo der Spieler es hinstellt.
   *
   * **Getragene Möbel belegen dabei ihre Heimat und nicht ihren Standort.**
   * Sonst bekämen zwei nacheinander geholte Mülleimer dieselbe Heimatkachel —
   * die erste war ja frei, als der zweite geholt wurde —, und beim Aufräumen
   * stünden sie ineinander.
   */
  private freeTile(piece: KitchenPiece): BuildTile | null {
    const size = footprint(piece, 0);
    const used: BuildSpot[] = this.furniture.map((one) =>
      one.held
        ? { x: one.spot.x, z: one.spot.z, ...footprint(one.piece, one.spot.turn ?? 0) }
        : { x: one.x, z: one.z, w: one.size.w, d: one.size.d },
    );
    for (let z = 0; z + size.d <= KITCHEN.d; z++) {
      for (let x = 0; x + size.w <= KITCHEN.w; x++) {
        const want: BuildSpot = { x, z, w: size.w, d: size.d };
        if (used.some((one) => overlaps(want, one))) continue;
        return { x, z };
      }
    }
    return null;
  }

  /**
   * **Der Kopierer** — zwei Felder, ein Druck, und was er tut, hängt daran, vor
   * welchem man steht (`kitchenDesk.copierField`).
   *
   * Auf der **Kopierfläche** liegt die Vorlage: Wer ein Möbel trägt, legt es
   * dort als Miniatur ab; wer eine dort stehen sieht, nimmt sie wieder
   * herunter. Solange dort etwas steht, lässt sich das Gerät **nicht**
   * aufheben — ein Kopierer, den man mit der Vorlage darauf durch die Küche
   * trägt, wäre ein Möbel mit einem Möbel darin, und beim Absetzen wüsste
   * niemand, wo die Vorlage hingehört.
   *
   * In der **Kopie-Zone** daneben steht dann die Kopie, durchscheinend. Sie
   * ist so lange nichts, bis jemand sie nimmt — dann entsteht in der Hand ein
   * echtes Möbel, und in der Zone wächst sofort die nächste nach. Das Gerät
   * gibt also unbegrenzt her, solange die Vorlage liegen bleibt; das ist die
   * Absicht und kein Versehen.
   *
   * **Aufheben geht von beiden Hälften**, solange keine Vorlage liegt. Wer im
   * Umbau vor der leeren Kopie-Zone steht und den Kopierer versetzen will,
   * soll nicht erst um das Gerät herumlaufen müssen.
   */
  private useCopier(furnish: Furnish, by?: UseSource): boolean {
    const world = this.world;
    if (!world) return false;
    const plate = this.plates.get(furnish) ?? null;
    const { dx, dz } = this.towards(furnish);
    if (copierField(furnish.turn, dx, dz) === 'zone') {
      if (!plate) {
        if (this.editing && !this.lifted) return this.liftPiece(furnish, by);
        world.notify('Erst eine Vorlage auf die Kopierfläche legen');
        return true;
      }
      if (this.lifted || this.handsFull()) {
        world.notify('Erst die Hände frei machen');
        return true;
      }
      const made = this.takeFromCatalogue(plate.load.piece);
      // Die Kopie wächst nach: Sie hing an der Vorlage und nicht an diesem
      // einen Griff.
      if (made) this.showCopy(furnish);
      return true;
    }
    if (this.lifted) return this.layOnPlate(furnish);
    if (plate) {
      if (this.handsFull()) {
        world.notify('Erst die Hände frei machen');
        return true;
      }
      return this.takeFromPlate(furnish);
    }
    if (this.editing) return this.liftPiece(furnish, by);
    world.notify(`${furnish.piece.label}: ein Möbel darauflegen, dann daneben abholen`);
    return true;
  }

  private copierPrompt(furnish: Furnish): string {
    const plate = this.plates.get(furnish) ?? null;
    const { dx, dz } = this.towards(furnish);
    if (copierField(furnish.turn, dx, dz) === 'zone') {
      if (plate) return `Kopie von ${plate.load.piece.label} nehmen`;
      return this.editing && !this.lifted ? `${furnish.piece.label} aufheben` : 'Kopie-Zone (leer)';
    }
    if (this.lifted) return `${this.lifted.piece.label} auf die Kopierfläche legen`;
    if (plate) return `${plate.load.piece.label} herunternehmen`;
    return this.editing ? `${furnish.piece.label} aufheben` : 'Kopierfläche (leer)';
  }

  private copierGrip(furnish: Furnish): 'press' | 'grab' {
    const plate = this.plates.get(furnish) ?? null;
    const { dx, dz } = this.towards(furnish);
    if (copierField(furnish.turn, dx, dz) === 'zone') {
      if (plate) return 'grab';
      return this.editing && !this.lifted ? 'grab' : 'press';
    }
    if (this.lifted) return 'press';
    if (plate) return 'grab';
    return this.editing ? 'grab' : 'press';
  }

  /**
   * **Das getragene Möbel auf die Kopierfläche** — dasselbe Möbel, nur klein.
   *
   * Es bleibt ein `Furnish` mit `held = true`: kein Körper, keine Kachel, und
   * deshalb auch nichts, was der Bauplatz für belegt hält. Sein Netz hängt
   * fortan am **Kopierer** und nicht mehr am Gestell des Spielers — damit
   * fährt die Vorlage mit, falls jemand das Gerät später versetzt.
   *
   * **Der Maßstab ist ein Faktor auf das Katalogmaß** und keine feste Zahl:
   * Ein geladenes Möbel steht auf 0,5, ein gebautes auf 1
   * (`core/kitchenFit.kitchenPieceScale`). Wer beide auf `1/3` setzte, machte
   * aus jeder Küchenzeile zwei Drittel ihrer selbst statt ein Drittel —
   * sichtbar daran, dass sie über ihr Feld hinausragt.
   */
  private layOnPlate(furnish: Furnish): boolean {
    const world = this.world;
    const load = this.lifted;
    if (!world || !load) return false;
    if (this.plates.has(furnish)) {
      world.notify('Auf der Kopierfläche steht schon etwas');
      return true;
    }
    this.lifted = null;
    this.plates.set(furnish, { load, copy: null, skins: [] });
    load.hold = 0;
    const model = load.model;
    furnish.model.add(model);
    const [px, pz] = COPIER_PLATE;
    model.position.set(px, COPIER_DECK, pz);
    model.rotation.set(0, 0, 0);
    model.scale.setScalar(kitchenPieceScale(load.piece) * MINI_SCALE);
    world.notify(`${load.piece.label} auf der Kopierfläche`);
    this.showCopy(furnish);
    this.refreshStations();
    return true;
  }

  /** **Und wieder herunter** — dasselbe Möbel, wieder in voller Größe und in der Hand. */
  private takeFromPlate(furnish: Furnish): boolean {
    const world = this.world;
    const plate = this.plates.get(furnish) ?? null;
    if (!world || !plate || this.lifted) return false;
    const load = plate.load;
    this.clearCopy(furnish);
    this.plates.delete(furnish);
    load.model.scale.setScalar(kitchenPieceScale(load.piece));
    this.lifted = load;
    load.held = true;
    load.hold = 0;
    if (this.rig) this.rig.add(load.model);
    this.facePiece();
    this.aimHeld();
    world.notify(`${load.piece.label} von der Kopierfläche genommen`);
    this.refreshStations();
    return true;
  }

  /**
   * **Jede Kopierfläche räumen** — beim Aufräumen (`B`/`Y`) und beim Verlassen
   * der Welt.
   *
   * Über die Hand und nicht am Baum vorbei: `takeFromPlate` und
   * `dropPiece(true)` sind die beiden Handgriffe, die ein Möbel schon richtig
   * heimschicken (Körper, Kachel, Station, Anzeigen), und ein dritter Weg
   * dorthin wäre der, der eines davon vergisst.
   */
  private clearPlates(): void {
    for (const copier of [...this.plates.keys()]) {
      if (this.lifted) this.dropPiece(true);
      if (!this.takeFromPlate(copier)) continue;
      this.dropPiece(true);
    }
  }

  /**
   * **Die Kopie in der Zone** — dasselbe Netz, durchscheinend und im Grün des
   * Geräts.
   *
   * Sie bekommt **eigene** Materialien und nicht die der Vorlage: Ein geklontes
   * Netz teilt sein Material mit dem Original (`Object3D.clone`), und wer dort
   * `opacity` verstellte, machte das Möbel in der Hand gleich mit durchsichtig.
   *
   * **Ein einzelnes Material bleibt ein einzelnes.** Genau hier stand der
   * Fehler, wegen dem die Kopie-Zone seit dem ersten Tag leer aussah: Die
   * Schleife holte sich `[mesh.material]`, färbte um und hängte die **Liste**
   * wieder ein — auch dort, wo vorher ein einzelnes Material hing. Ein Netz mit
   * einer Materialliste rendert three.js über `geometry.groups`, und eine
   * Geometrie aus einer glTF-Datei hat keine: Was dabei herauskam, war kein
   * blasses Möbel, sondern **gar keines**. Die Kopie gab es, man konnte sie
   * nehmen, sie stand nur nicht da.
   *
   * **Und sie leuchtet** (`COPY_GLOW`): Ein Möbel, das nur halb durchsichtig
   * ist, verschwindet auf der matten, dunklen Wiege — ausgerechnet ein brauner
   * Unterschrank wird dort zu einem braunen Schatten auf Schwarz. Mit dem Grün
   * des Geräts im `emissive` trägt die Kopie ihr eigenes Licht, egal welche
   * Farbe das Möbel hat, und sagt zugleich, was sie ist: nicht das Möbel,
   * sondern das, was der Kopierer davon zeigt.
   */
  private showCopy(furnish: Furnish): void {
    this.clearCopy(furnish);
    const plate = this.plates.get(furnish) ?? null;
    if (!plate) return;
    // Auch hier über `cloneModel`: Die Vorlage liegt zwar auf dem Kopierer und
    // nicht in der Weltgruppe, aber sie kann aus dem Katalog gekommen sein,
    // und ein Klon eines ausgeblendeten Netzes ist ausgeblendet. Eine Kopie,
    // die man nicht sieht, ist von einem kaputten Kopierer nicht zu
    // unterscheiden.
    const model = this.cloneModel(plate.load.model);
    if (!model) return;
    model.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const many = Array.isArray(mesh.material);
      const skins = many ? (mesh.material as THREE.Material[]) : [mesh.material as THREE.Material];
      const ghosts = skins.map((skin) => {
        const ghost = skin.clone();
        ghost.transparent = true;
        ghost.opacity = COPY_ALPHA;
        ghost.depthWrite = false;
        const lit = ghost as THREE.MeshStandardMaterial;
        // Nicht jedes Material kennt `emissive` — ein `MeshBasicMaterial` hat
        // keines, und ein Feld, das es nicht gibt, zu setzen, ist eine Zeile,
        // die nichts tut und beim Lesen etwas anderes behauptet.
        if (lit.emissive) {
          lit.emissive = new THREE.Color(COPY_GLOW);
          lit.emissiveIntensity = COPY_GLOW_STRENGTH;
          lit.emissiveMap = null;
        }
        // **Nicht in `owned`.** Die Kopie entsteht bei jedem Griff neu; eine
        // Liste, die erst beim Verlassen der Welt geleert wird, wüchse mit
        // jedem kopierten Möbel. Sie gehen mit ihrer Kopie (`clearCopy`).
        plate.skins.push(ghost);
        return ghost;
      });
      mesh.material = many ? ghosts : ghosts[0];
      mesh.castShadow = false;
      mesh.receiveShadow = false;
    });
    const [zx, zz] = COPIER_ZONE;
    model.position.set(zx, COPIER_DECK, zz);
    model.name = 'kitchen-copy';
    furnish.model.add(model);
    plate.copy = model;
  }

  /** Die Kopie wieder weg — beim Herunternehmen der Vorlage und beim Aufräumen. */
  private clearCopy(furnish: Furnish): void {
    const plate = this.plates.get(furnish);
    if (!plate) return;
    for (const skin of plate.skins) skin.dispose();
    plate.skins.length = 0;
    plate.copy?.removeFromParent();
    plate.copy = null;
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
    if (station.on) {
      world.root.add(station.on.object);
      this.restOn(station, station.on);
    }
    if (station.pile) {
      world.root.add(station.pile);
      station.pile.position.copy(station.deck);
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
    // **Nicht mehr nur im Umbau.** Ein Möbel kommt seit dem Möbelkatalog auch
    // ohne ihn in die Hand (`takeFromCatalogue`), und ein Möbel in der Hand,
    // das sich nicht wenden lässt, ist eines, das man nur in einer Richtung
    // hinstellen kann. Wer nichts trägt, drückt weiter ins Leere.
    if (pressed && this.lifted) this.turnPiece();
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
    // **Wieder in voller Größe**: Getragen wurde es für den Träger als
    // Miniatur (`shrinkPiece`), hingestellt wird das Möbel.
    furnish.model.scale.setScalar(kitchenPieceScale(furnish.piece));
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
    leaking: spot.leak.leaking,
    stack: spot.stack,
    stacked: spot.stacked,
  };
}

/**
 * **Ob an dieser Station gestapelt statt abgelegt wird.**
 *
 * Zwei Arten tun das: die **Geschirrrückgabe** (dreckige Teller) und das
 * **Abtropfgitter** (beide Sorten, aber nicht gemischt). Sie führen keinen
 * `Dish`, sondern eine Zahl, eine Sorte (`Station.stack`, `Station.stacked`)
 * und ein Netz dazu (`Station.pile`), und deshalb sehen an
 * vier Stellen die Handgriffe anders aus: nehmen, hinlegen, zielen, zeichnen.
 * Eine Zeile statt viermal derselben Oder-Bedingung — die fünfte Stelle wäre
 * die, an der eine davon fehlt.
 */
function stacks(kind: StationKind): boolean {
  return kind === 'return' || kind === 'drain';
}
