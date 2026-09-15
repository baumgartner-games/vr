import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_W, TILE } from '../../nav/navTile';
import {
  KITCHEN_PIECES,
  kitchenDeck,
  kitchenPiece,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { canLoadModels, CHEF_CARRY } from '../../../core/chefFit';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import type { PlayerAvatar } from '../../../core/PlayerAvatar';
import type { WorldContext } from '../../../core/types';
import { TextPlane } from '../../../ui/TextPlane';
import { KITCHEN } from '../layout';
import {
  ITEM_LABELS,
  kitchenDeed,
  kitchenPrompt,
  type KitchenItem,
  type Station as StationFacts,
  type StationKind,
} from './kitchenCarry';
import { CHOPS, FRY_SECONDS, chopped, fried, missing, recipeOf } from './kitchenRecipes';
import { BOX_HEIGHT, BOX_SIZE, FoodKit, PLATE_HEIGHT } from './kitchenProps';
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
 *   Ausgabe. Hier wird angefasst: Töpfe und Pfannen kommen vom Herd in die
 *   Hand, Brötchen aus der Kiste, und beides wieder irgendwohin.
 * - **Der Schauraum** (Osten): **jedes** der dreizehn Möbel noch einmal, frei
 *   stehend und beschriftet. In einer Zeile aus acht Schränken sieht man ein
 *   einzelnes Möbel nicht; wer wissen will, wie die Spüle aussieht, will sie
 *   allein sehen und nicht zwischen zwei Herden. Der Katalog ist damit nicht
 *   mehr eine Liste in einer Datei, sondern ein Rundgang.
 *
 * **Warum eine Zone und kein Baustein.** Ein Baustein (`grid/blocks.ts`) ist
 * ein Quader aus der Palette der Welt: eine Farbe, eine Höhe, ein Körper. Ein
 * Herd mit einem Topf darauf ist keiner. Er ist eine Datei, sie kommt
 * asynchron, und sie kommt womöglich gar nicht — genau wie die Figur
 * (`core/chefModel.ts`). Eine Zone darf warten; ein Grundriss darf es nicht.
 *
 * **Der Grundriss weiß trotzdem, wo sie stehen.** Jedes Stück belegt seine
 * Kacheln mit einem hohen Weg-Aufschlag (`stampKitchen`), und damit geht ein
 * NPC um den Tresen herum statt hindurch — auch dann, wenn die Datei fehlt und
 * gar nichts zu sehen ist. Ein Möbel, das nur im Bild existiert, ist ein Möbel,
 * durch das gelaufen wird.
 *
 * **Und die Kochfigur passt dazu.** Sie ist 1,60 m hoch und ihre Augen liegen
 * bei 0,91 m (`core/chefFit.ts`) — genau deshalb wurde sie so skaliert und
 * nicht auf Menschengröße: neben einem Tresen von einem Meter soll ein Koch
 * stehen und kein Riese im Puppenhaus. Hier steht die Probe darauf.
 */

/** Wie viele Viertelumdrehungen ein Möbel gedreht wird. */
type Turn = 0 | 1 | 2 | 3;

/** Ein Stück in der Küche: welches, wo, und wie herum. */
interface Spot {
  /** Der Name im Katalog (`core/kitchenFit.KITCHEN_PIECES`). */
  readonly name: string;
  /** Die nordwestliche Kachel seiner Grundfläche, relativ zur Zone. */
  readonly x: number;
  readonly z: number;
  /** Viertelumdrehungen um die Hochachse; 0 ist wie geliefert. */
  readonly turn?: Turn;
  /**
   * **Wie hoch über dem Boden es steht**, in Metern — 0 für alles, was auf
   * dem Boden steht.
   *
   * Es gibt genau einen Fall, und der ist der Grund für dieses Feld: Das
   * **Ausgaberegal** mit den beiden Wärmeschirmen gehört über die
   * Ausgabetheke und nicht dahinter. Es stand eine Kachel nördlich davon —
   * zwei rote Schirme, die auf nichts zeigten. Jetzt steht es auf **derselben
   * Kachel eine Ebene höher**, also dort, wo die Schirme das beleuchten, was
   * auf der Theke liegt.
   */
  readonly lift?: number;
  /**
   * **Ob es im Schauraum steht** statt in der Küche.
   *
   * Ein Schaustück wird beschriftet, gibt nichts her und nimmt nichts an —
   * und es bekommt **keine Sperre über sich** (`BLOCK_HEIGHT`): Wer durch
   * einen Schauraum geht, soll nicht gegen Luft laufen, die dort steht, damit
   * niemand auf eine Arbeitsplatte springt.
   */
  readonly show?: boolean;
}

/**
 * **Der Aufbau der Küche** — drei Bänder, wie in jeder Küche dieses Spiels.
 *
 * Die Zahlen sind Kacheln **innerhalb** der Zone (`layout.KITCHEN`), damit sich
 * die ganze Küche verschieben lässt, ohne dreißig Zeilen nachzurechnen. Wie
 * groß ein Stück ist, steht nicht hier, sondern im Katalog — gemessen und
 * nicht geschätzt.
 *
 * **Die beiden Schneidebretter stehen jetzt gleich.** Vorher stand eines
 * zwischen zwei Küchenzeilen und das andere zwischen zwei Arbeitstischen, und
 * das sieht man: Eine Zeile ist 1,06 m tief, ein Tisch 1,00 m, ein Brett
 * ebenfalls 1,00 m — in der Zeile sprang das Brett also vorn und hinten drei
 * Zentimeter zurück, auf der Insel schloss es bündig ab. Zwei Bretter, die
 * verschieden stehen, sind ein Fehler, den man sieht und nicht erklären kann.
 * Beide stehen deshalb in derselben Nachbarschaft: Zeile, Brett, Zeile.
 */
export const KITCHEN_SPOTS: readonly Spot[] = [
  // --- die Zeile an der Nordwand: Geräte, Spüle, Arbeitsfläche ----------------
  { name: 'counter', x: 0, z: 0 },
  { name: 'stove', x: 1, z: 0 },
  { name: 'stove-pot', x: 2, z: 0 },
  { name: 'stove-pan', x: 3, z: 0 },
  { name: 'counter', x: 4, z: 0 },
  // Zwei Kacheln breit — sie ist das einzige Stück, das die Zeile unterbricht.
  { name: 'sink', x: 5, z: 0 },
  { name: 'counter', x: 7, z: 0 },
  { name: 'board', x: 8, z: 0 },
  { name: 'counter', x: 9, z: 0 },
  { name: 'plate-counter', x: 10, z: 0 },

  // --- die Ecke nach Osten: sie trennt die Küche vom Schauraum ----------------
  { name: 'counter', x: 11, z: 1 },
  { name: 'counter', x: 11, z: 2 },
  { name: 'bin', x: 11, z: 3 },

  // --- die Insel in der Mitte ------------------------------------------------
  // Zeile, Brett, Zeile — dieselbe Nachbarschaft wie an der Nordwand.
  { name: 'counter', x: 3, z: 4 },
  { name: 'board', x: 4, z: 4 },
  { name: 'counter', x: 5, z: 4 },
  { name: 'bin', x: 6, z: 4 },
  { name: 'table', x: 7, z: 4 },

  // --- und vorn die Ausgabe, zum Gang hin gedreht -----------------------------
  { name: 'serve-counter', x: 3, z: 9, turn: 2 },
  { name: 'plate-counter', x: 4, z: 9, turn: 2 },
  { name: 'pass', x: 5, z: 9, turn: 2 },
  // Die Wärmeschirme: **dieselbe Kachel, eine Ebene höher** — auf der Theke
  // und nicht dahinter.
  { name: 'plate-rack', x: 5, z: 9, turn: 2, lift: PASS_TOP() },
  { name: 'serve-counter', x: 7, z: 9, turn: 2 },
  { name: 'extinguisher', x: 0, z: 9 },

  // --- der Schauraum: jedes Möbel einmal, einzeln und beschriftet -------------
  { name: 'plate-counter', x: 13, z: 1, show: true },
  { name: 'extinguisher', x: 15, z: 1, show: true },
  { name: 'sink', x: 17, z: 1, show: true },
  { name: 'bin', x: 20, z: 1, show: true },
  { name: 'table', x: 22, z: 1, show: true },

  { name: 'serve-counter', x: 13, z: 4, show: true },
  { name: 'board', x: 15, z: 4, show: true },
  { name: 'plate-rack', x: 17, z: 4, show: true },
  { name: 'pass', x: 20, z: 4, show: true },

  { name: 'counter', x: 13, z: 7, show: true },
  { name: 'stove', x: 15, z: 7, show: true },
  { name: 'stove-pot', x: 17, z: 7, show: true },
  { name: 'stove-pan', x: 19, z: 7, show: true },
];

/**
 * Die Höhe der Ausgabetheke — die Ebene, auf der das Regal steht.
 *
 * Eine Funktion und keine Konstante, weil sie **vor** `KITCHEN_SPOTS`
 * gebraucht wird und aus dem Katalog kommt: Wer die Theke im Katalog ändert,
 * soll das Regal nicht nachmessen müssen.
 */
function PASS_TOP(): number {
  return kitchenPiece('pass')?.height ?? 0.53;
}

/**
 * **Die Kisten mit dem Nachschub** — westlich der Insel, eine Reihe für sich.
 *
 * Vier statt einer, seit es Rezepte gibt (`kitchenRecipes.ts`): Brötchen,
 * Patty, Salat, Tomate. Sie stehen **nebeneinander an der Westwand** und nicht
 * verteilt in der Küche, und das ist kein Geschmack, sondern der Weg: Wer für
 * einen Deluxe vier Zutaten holt, läuft sonst viermal quer durch den Raum,
 * bevor überhaupt etwas in der Pfanne liegt.
 *
 * Nicht auf der Ankunftskachel (`layout.SPAWNS.kitchen`, x = 1, z = 7): In
 * eine Kiste hineingesetzt zu werden ist ein Anfang, den niemand versteht.
 */
export const CRATES: readonly {
  readonly item: KitchenItem;
  readonly label: string;
  readonly x: number;
  readonly z: number;
}[] = [
  { item: 'bun', label: 'Brötchenkiste', x: 1, z: 3 },
  { item: 'patty', label: 'Pattykiste', x: 1, z: 4 },
  { item: 'lettuce', label: 'Salatkiste', x: 1, z: 5 },
  { item: 'tomato', label: 'Tomatenkiste', x: 1, z: 6 },
];

/** Wie weit ein Möbel eine Kachel verteuert — teurer als eine Kiste. */
const FURNITURE_COST = 8;

/** Wo die Oberkante des Küchenbodens liegt — knapp über dem Gelände. */
export const KITCHEN_FLOOR = 0.02;

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
 * **Wie hoch das Patty in der Pfanne liegt**, über der Herdplatte.
 *
 * Die Pfanne ist 13 cm hoch (`public/models/kitchen.glb`, halbiert), ihr
 * Boden liegt knapp darüber. Ohne diese Fingerbreit steckt das Patty im
 * Pfannenboden statt darin.
 */
const PAN_RIM = 0.04;

/** Die Grundfläche eines Stücks in Kacheln, gedreht wie es steht. */
function footprint(piece: KitchenPiece, turn: Turn): { w: number; d: number } {
  const [w, d] = piece.tiles;
  return turn % 2 === 0 ? { w, d } : { w: d, d: w };
}

/**
 * **Der Grundriss der Zone** — drei Wände und die Kacheln, auf denen Möbel
 * stehen.
 *
 * Nach Süden bleibt sie offen: Dort kommt man herein, und eine Küche mit einer
 * Tür wäre eine Küche, in der zwei Köche sich im Durchgang begegnen.
 */
export function stampKitchen(plan: GridPlan): void {
  const east = KITCHEN.x + KITCHEN.w - 1;
  const south = KITCHEN.z + KITCHEN.d - 1;

  // **Ein Boden aus Stein.** Ohne ihn steht die Küche auf der Wiese des
  // Geländes, und eine Spüle im Gras sieht aus wie ein Versehen. Er liegt
  // knapp über dem Gelände, damit sich die beiden nicht um jedes Pixel
  // streiten — dieselbe Handbreit wie der Asphalt der Boxengasse.
  plan.mass('stone', KITCHEN, -0.06, KITCHEN_FLOOR);

  plan.run(KITCHEN.x, KITCHEN.z, KITCHEN.w, 'x', (x, z) => plan.wall(x, z, DIR_N));
  for (let z = KITCHEN.z; z <= south; z++) {
    plan.wall(KITCHEN.x, z, DIR_W);
    plan.wall(east, z, DIR_E);
  }

  // **Was ein Möbel belegt, ist teuer zu begehen** — und zwar im Graphen und
  // nicht bloß im Bild. Ohne diese Schleife liefe ein NPC durch den Herd.
  //
  // Ein **gehobenes** Stück zählt nicht mit: Das Ausgaberegal steht auf der
  // Theke, und deren Kacheln sind schon teuer. Zweimal derselbe Aufschlag auf
  // dieselbe Kachel wäre eine Kachel, um die ein NPC grundlos weiter
  // herumginge.
  for (const spot of KITCHEN_SPOTS) {
    const piece = kitchenPiece(spot.name);
    if (!piece || piece.hanging || spot.lift) continue;
    const size = footprint(piece, spot.turn ?? 0);
    for (let dz = 0; dz < size.d; dz++) {
      for (let dx = 0; dx < size.w; dx++) {
        plan.floor(
          { x: KITCHEN.x + spot.x + dx, z: KITCHEN.z + spot.z + dz, w: 1, d: 1 },
          { cost: FURNITURE_COST },
        );
      }
    }
  }

  // Und die Kisten: Sie kommen nicht aus dem Katalog, stehen aber genauso im
  // Weg (`kitchenProps.ts`).
  for (const crate of CRATES) {
    plan.floor(
      { x: KITCHEN.x + crate.x, z: KITCHEN.z + crate.z, w: 1, d: 1 },
      { cost: FURNITURE_COST },
    );
  }
}

/**
 * **Die Einbauten dieser Zone** — und nur sie.
 *
 * Getrennt vom Rest, weil `TestWorld.planLoaded` sie **nach** einem
 * gespeicherten Umbau noch einmal aufsetzt: Ein Einbau hat eine **Kennung**,
 * und `putFixture` ersetzt nach Kennung — es entsteht also kein zweiter
 * daneben. Wände und Bausteine haben keine, und wer eine Wand wegbaut, hat sie
 * weggebaut.
 *
 * **Das Schild hier ist zugleich die Probe auf den Aushang** (`fixtures/sign.ts`):
 * Es trägt mehr als eine Zeile, mit Überschrift und Aufzählung, und wer es
 * benutzt, schlägt es im Menü auf. Ein Schild mit einer Zeile beweist nicht,
 * dass Markdown ankommt.
 */
export function fitKitchen(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-kueche',
    kind: 'sign',
    x: KITCHEN.x + 1,
    z: KITCHEN.z + KITCHEN.d - 1,
    dir: DIR_W,
    props: {
      text: [
        '# Die Küche',
        '',
        'Möbel aus *Overcooked Kitchen Assets (Fan Art)* von Arun Kumar S,',
        'CC-BY-4.0 — siehe `public/models/CREDITS.md`.',
        '',
        '- An der Westwand: die vier Kisten — Brötchen, Patty, Salat, Tomate',
        '- An der Nordwand: Zeile, zwei Herde, Spüle, Tellerausgabe',
        '- In der Mitte: Schneidebrett, Mülleimer, Anrichte',
        '- Vorn: Ausgabe mit den Wärmeschirmen darüber',
        '- Im Osten: der Schauraum — jedes Möbel einmal, beschriftet',
        '',
        '## Ein Burger',
        '',
        '1. **Patty** aus der Kiste in die **Pfanne** auf dem Herd — vier Sekunden.',
        '2. **Salat** und **Tomate** auf das **Schneidebrett**, dreimal `A`.',
        '3. **Brötchen** und alles Fertige auf die **Anrichte** legen.',
        '4. **Teller** von der Ausgabe holen und an der Anrichte anrichten.',
        '',
        'Vier Rezepte: Hamburger, Salatburger, Tomatenburger, Deluxe.',
        'Am Mülleimer wird der Burger vom Teller gekratzt — der Teller bleibt.',
        '',
        '`A` nimmt und legt ab; getragen wird mit beiden Händen vor dem Bauch.',
        'Was in der Hand liegt, lässt jede Ablage leuchten.',
        '',
        '---',
        '',
        '> Der Koch ist 1,60 m hoch. Der Tresen ist einen Meter hoch.',
        '> Genau dafür wurde er so skaliert.',
      ].join('\n'),
    },
  });
}

// --- und was darin steht ----------------------------------------------------

/** Eine Stelle, an der `A` etwas bewirkt. */
interface Station {
  readonly kind: StationKind;
  /** Wie sie im Hinweis heißt — _Küchenzeile_, _Mülleimer_. */
  readonly label: string;
  /** Woran der gelbe Saum hängt und worauf gezielt wird. */
  readonly object: THREE.Object3D;
  /** Wo etwas darauf liegt, in Weltkoordinaten. */
  readonly deck: THREE.Vector3;
  /** Was die Kiste hergibt. */
  readonly gives?: KitchenItem;
  /** Was gerade darauf liegt — beim Herd ist das die Pfanne. */
  on: Carried | null;
  /** Wie oft auf dem Brett schon geschnitten wurde. */
  chops: number;
  /** Was in der Pfanne liegt, und wie lange es schon brät. */
  pan: Carried | null;
  cook: number;
  done: boolean;
  /** Was auf der Anrichte schon aufgeschichtet ist — und wie es aussieht. */
  readonly stack: KitchenItem[];
  view: THREE.Object3D | null;
  /** Ob sie gerade als benutzbar angemeldet ist. */
  live: boolean;
}

/**
 * **Welches Möbel welche Rolle spielt** — und alles, was hier nicht steht, ist
 * eine gewöhnliche Ablage (`KitchenPiece.worktop`).
 *
 * Eine Tabelle und keine Kette aus `if`: Sie ist die eine Stelle, an der
 * _Arbeitstisch_ und _Anrichte_ dasselbe Möbel sind — wer den Burger lieber
 * auf der Ausgabetheke bauen lassen will, ändert genau eine Zeile.
 *
 * Die **Tellerausgabe** ist dabei keine Ablage, sondern eine Kiste: Sie gibt
 * Teller aus, so oft man will, genau wie die Kisten an der Westwand. Ein
 * Stapel Teller, der nach dem dritten Gast leer ist, wäre bei _Overcooked_ der
 * Punkt, an dem eine Runde stehenbleibt.
 */
const STATION_KINDS: Readonly<Record<string, StationKind>> = {
  bin: 'bin',
  board: 'board',
  table: 'build',
  'stove-pan': 'stove',
  'plate-counter': 'box',
};

/**
 * **Wie ein Möbel im Hinweis heißt, wenn es in dieser Küche etwas anderes
 * ist** als im Katalog.
 *
 * Zwei Fälle: Der _Arbeitstisch_ ist hier die **Anrichte** — dort entsteht der
 * Burger —, und die _Tellerausgabe_ heißt, was sie tut. Der Katalog bleibt
 * davon unberührt: Er beschreibt das gekaufte Möbel, nicht seine Rolle in
 * einem Aufbau (`core/kitchenFit.ts`).
 */
const STATION_LABELS: Readonly<Record<string, string>> = {
  table: 'Anrichte',
  'plate-counter': 'Tellerausgabe',
};

/** Eine frische Station — die Felder, die keine Stelle je selbst setzt. */
function station(
  base: Omit<Station, 'chops' | 'pan' | 'cook' | 'done' | 'stack' | 'view'>,
): Station {
  return { ...base, chops: 0, pan: null, cook: 0, done: false, stack: [], view: null };
}

/** Ein Ding in der Hand oder auf einer Fläche. */
interface Carried {
  /**
   * **Was es ist — und das ändert sich.** Ein rohes Patty wird in der Pfanne
   * zum gebratenen, ein Salatkopf auf dem Brett zum geschnittenen: Dasselbe
   * getragene Ding, nur mit anderem Namen und anderem Netz (`reshape`). Ein
   * zweites Ding daraus zu machen hieße, den Griff der Figur nachzuführen.
   */
  item: KitchenItem;
  object: THREE.Object3D;
  /** Wohin `B` es zurückstellt — der Herd, von dem es kommt. */
  readonly home: Station | null;
  /** Woraus ein Burger besteht — nur bei `burger` und `plate-burger`. */
  parts?: KitchenItem[];
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
 * in `kitchenCarry.ts` — neun Fälle, die ein Test nachrechnet, statt dass man
 * sie im Headset durchspielt. Diese Klasse ist der Teil, den ein Test nicht
 * lesen kann: Netze umhängen, Körper bauen, Schilder schreiben.
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
  /** Zutaten, Teller und Kisten — ein Satz für die ganze Zone. */
  private readonly food = new FoodKit();
  /** Was die Figur gerade trägt. */
  private carried: Carried | null = null;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.rig = ctx.rig;
    this.avatar = ctx.avatar;
    this.gone = false;

    // Die Kisten sind gebaut und nicht geladen — sie stehen sofort da, auch
    // wenn die Datei nie ankommt (`kitchenProps.ts`).
    for (const crate of CRATES) this.buildCrate(world, crate);
    // Sie antwortet auch dann, wenn die Datei nie ankommt — deshalb hier und
    // nicht erst hinter dem Lader.
    this.refreshStations();

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
   * **Jedes Bild**: die Pfanne brät weiter, und was getragen wird, hängt vor
   * dem Bauch.
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
  update(dt: number, ctx: WorldContext): void {
    this.fry(dt);
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
   * **Die Pfanne** — das einzige in dieser Küche, das von selbst passiert.
   *
   * Ein Patty braucht `FRY_SECONDS`, und danach ist es gebraten und bleibt es:
   * Verbrennen wäre eine zweite Uhr und ein zweiter Zustand, und beides ohne
   * Runde, die daraus etwas machte. Der Hinweis über dem Herd ändert sich
   * mit — `refreshStations` fragt die Regel neu, und die sagt jetzt _nehmen_
   * statt _brät noch_.
   */
  private fry(dt: number): void {
    for (const spot of this.stations) {
      const pan = spot.pan;
      if (!pan || spot.done) continue;
      spot.cook += dt;
      if (spot.cook < FRY_SECONDS) continue;
      spot.done = true;
      const ready = fried(pan.item);
      if (ready) this.reshape(pan, ready, spot.deck.y + PAN_RIM);
      this.world?.notify(`${ITEM_LABELS[pan.item]} ist fertig`);
      this.refreshStations();
    }
  }

  /**
   * `B`/`Y`: Hände auf, Töpfe zurück auf ihren Herd, Essen in den Müll.
   *
   * **Auch die halb fertigen Sachen** — das Patty in der Pfanne, der halbe
   * Schnitt auf dem Brett, der begonnene Stapel auf der Anrichte. Eine Küche,
   * in der nach dem Aufräumen noch ein Brötchen auf der Anrichte liegt, ist
   * nicht aufgeräumt, und der Nächste sucht den Fehler bei sich.
   */
  reset(): void {
    const loose = [
      this.carried,
      ...this.stations.map((spot) => spot.on),
      ...this.stations.map((spot) => spot.pan),
    ];
    this.carried = null;
    if (this.avatar) this.avatar.carry = null;
    for (const spot of this.stations) {
      spot.on = null;
      spot.pan = null;
      spot.chops = 0;
      spot.cook = 0;
      spot.done = false;
      spot.stack.length = 0;
      this.showStack(spot);
    }
    for (const thing of loose) {
      if (!thing) continue;
      if (thing.home) this.layOn(thing.home, thing);
      else this.discard(thing);
    }
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
    // Zutaten, Teller und Kisten hängen an **einem** Satz und nicht an jedem
    // Brötchen einzeln (`kitchenProps.FoodKit`).
    this.food.dispose();
    this.stations.length = 0;
    this.bodies.length = 0;
    this.carried = null;
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
    const turn = spot.turn ?? 0;
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
    if (spot.show) this.addLabel(world, piece, size, centreX, centreZ);
    else this.addStations(model, piece, foot, takeUtensil);
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

  /** Eine Kiste: gebaut, fest, und die Quelle für alles, was daraus kommt. */
  private buildCrate(world: ZoneHost, crate: (typeof CRATES)[number]): void {
    const box = this.food.crate(crate.item);
    const x = (KITCHEN.x + crate.x + 0.5) * TILE;
    const z = (KITCHEN.z + crate.z + 0.5) * TILE;
    box.position.set(x, KITCHEN_FLOOR, z);
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);

    const body = this.boxAt(BOX_SIZE, BOX_HEIGHT, BOX_SIZE, x, KITCHEN_FLOOR, z);
    world.root.add(body);
    body.updateWorldMatrix(true, false);
    this.placed.push(body);
    this.bodies.push(world.addSolid(body));

    this.stations.push(
      station({
        kind: 'box',
        label: crate.label,
        object: box,
        deck: new THREE.Vector3(x, KITCHEN_FLOOR + BOX_HEIGHT, z),
        gives: crate.item,
        on: null,
        live: false,
      }),
    );
  }

  /**
   * **Was an einem Möbel geht** — abstellen, herunternehmen, wegwerfen.
   *
   * Der Mülleimer ist ein Mülleimer, jede Arbeitsfläche ist eine Ablage
   * (`KitchenPiece.worktop`), und wo im Modell ein Topf steht
   * (`KitchenPiece.holds`), wird er gleich hier abgenommen: Er hängt danach
   * als eigenes Ding auf seiner Fläche, und der Herd darunter ist ein leerer
   * Herd. Ohne diesen Schritt wäre „den Topf nehmen" ein Sonderfall im
   * Nehmen; so ist es derselbe Griff wie bei allem anderen.
   */
  private addStations(
    model: THREE.Object3D,
    piece: KitchenPiece,
    foot: number,
    takeUtensil: (model: THREE.Object3D) => THREE.Object3D | null,
  ): void {
    // **Die Ablage liegt über dem Möbel und nicht über seiner Kachel.** Wo
    // beides auseinanderfällt, ist der Herd mit der Pfanne (`align`): Seine
    // Platte steht 7,8 cm südlich der Kachelmitte, und dort gehört die Pfanne
    // hin und nicht daneben.
    const deck = new THREE.Vector3(model.position.x, foot + kitchenDeck(piece), model.position.z);
    const kind = STATION_KINDS[piece.name];
    if (!kind && !piece.worktop) return;

    const spot = station({
      kind: kind ?? 'top',
      label: STATION_LABELS[piece.name] ?? piece.label,
      object: model,
      deck,
      ...(piece.name === 'plate-counter' ? { gives: 'plate' as KitchenItem } : {}),
      on: null,
      live: false,
    });
    this.stations.push(spot);

    if (!piece.holds) return;
    const loose = takeUtensil(model);
    if (!loose) return;
    this.placed.push(loose);
    this.layOn(spot, { item: piece.holds, object: loose, home: spot });
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
      // Art auseinander: Eine Anrichte mit halbem Stapel meldete sich nicht,
      // weil sie nach der alten Zählung leer war. `nothing` ist der einzige
      // Fall ohne etwas zu sagen; `refuse` hat einen Satz und meldet sich.
      const wanted = kitchenDeed(this.carried?.item ?? null, facts(spot)).do !== 'nothing';
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
          usePrompt: () =>
            kitchenPrompt(
              kitchenDeed(this.carried?.item ?? null, facts(spot)),
              spot.label,
              CHOPS - spot.chops,
            ),
        },
        // **Nicht schießbar**: Eine Kugel, die den Topf vom Herd holt, ist ein
        // Scherz und keine Regel (`PortalWorld.shootUsable`).
        { shot: 0 },
      );
    }
  }

  /** Was `A` an dieser Station bewirkt (`kitchenCarry.kitchenDeed`). */
  private act(spot: Station): boolean {
    const world = this.world;
    if (!world) return false;
    const deed = kitchenDeed(this.carried?.item ?? null, facts(spot));
    switch (deed.do) {
      case 'take': {
        const thing = this.pickUp(spot, deed.item);
        if (!thing) return false;
        this.takeInHand(thing);
        world.notify(`${ITEM_LABELS[thing.item]} in der Hand`);
        break;
      }
      case 'place': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        this.layOn(spot, thing);
        world.notify(`${ITEM_LABELS[thing.item]} auf ${spot.label}`);
        break;
      }
      case 'trash': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        this.discard(thing);
        world.notify(`${ITEM_LABELS[deed.item]} weggeworfen`);
        break;
      }
      case 'scrape': {
        // **Der Teller bleibt in der Hand.** Wer einen misslungenen Burger
        // wegwirft, will nicht auch noch zur Tellerausgabe laufen.
        const plate = this.carried;
        if (!plate) return false;
        this.scrape(plate);
        world.notify('Burger weggekratzt, der Teller bleibt');
        break;
      }
      case 'chop': {
        const on = spot.on;
        if (!on) return false;
        spot.chops += 1;
        const cut = chopped(on.item);
        if (spot.chops < CHOPS || !cut) {
          world.notify(`${ITEM_LABELS[on.item]}: noch ${CHOPS - spot.chops}`);
          break;
        }
        spot.chops = 0;
        this.reshape(on, cut, spot.deck.y);
        world.notify(`${ITEM_LABELS[cut]} fertig`);
        break;
      }
      case 'fry': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        spot.pan = thing;
        spot.cook = 0;
        spot.done = false;
        // In die Pfanne und nicht auf den Herd: Das Patty liegt eine
        // Fingerbreit höher als der Rand, sonst steckt es im Boden der Pfanne.
        thing.object.rotation.set(0, 0, 0);
        world.root.add(thing.object);
        thing.object.position.set(spot.deck.x, spot.deck.y + PAN_RIM, spot.deck.z);
        world.notify(`${ITEM_LABELS[thing.item]} brät`);
        break;
      }
      case 'stack': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        // Die Zutat geht im Stapel auf: Der Burger wird als **ein** Netz aus
        // dem Stapel gebaut (`FoodKit.burger`), und zwei Salatscheiben
        // übereinander — eine gelegte und eine gebaute — wären eine zu viel.
        this.drop(thing);
        spot.stack.push(thing.item);
        this.showStack(spot);
        const recipe = recipeOf(spot.stack);
        world.notify(recipe ? `${recipe.label} fertig` : missing(spot.stack));
        break;
      }
      case 'dish': {
        const plate = this.carried;
        if (!plate) return false;
        const parts = [...spot.stack];
        spot.stack.length = 0;
        this.showStack(spot);
        this.dishUp(plate, parts);
        world.notify(`${recipeOf(parts)?.label ?? 'Burger'} angerichtet`);
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
   * **Was man an dieser Station in die Hand bekommt.**
   *
   * Drei Quellen, und alle drei geben dasselbe zurück: eine Kiste baut neu,
   * die Pfanne gibt her, was in ihr liegt, und jede andere Station gibt, was
   * auf ihr liegt. Die Anrichte ist der Sonderfall — dort **entsteht** der
   * Burger erst beim Nehmen, aus dem Stapel, der darauf liegt.
   */
  private pickUp(spot: Station, item: KitchenItem): Carried | null {
    if (spot.kind === 'box') return this.makeItem(item);
    if (spot.kind === 'build') {
      const parts = [...spot.stack];
      spot.stack.length = 0;
      this.showStack(spot);
      const object = this.food.burger(parts);
      this.placed.push(object);
      return { item: 'burger', object, home: null, parts };
    }
    if (spot.kind === 'stove' && spot.pan) {
      const thing = spot.pan;
      spot.pan = null;
      spot.cook = 0;
      spot.done = false;
      return thing;
    }
    const on = spot.on;
    spot.on = null;
    if (on) spot.chops = 0;
    return on;
  }

  /** Ein neues Ding aus einer Kiste — Zutaten und Teller kennt der Satz. */
  private makeItem(item: KitchenItem): Carried | null {
    const object = this.food.item(item);
    if (!object) return null;
    this.placed.push(object);
    return { item, object, home: null };
  }

  /**
   * **Aus einem Ding wird ein anderes** — das rohe Patty wird gebraten, der
   * Salatkopf geschnitten.
   *
   * Getauscht wird das **Netz** und nicht das getragene Ding: Wer stattdessen
   * ein zweites `Carried` bauen ließe, müsste an jeder Stelle nachziehen, die
   * gerade eines in der Hand oder in der Pfanne hält.
   */
  private reshape(thing: Carried, item: KitchenItem, deck: number): void {
    const fresh = this.food.item(item);
    if (!fresh) return;
    const parent = thing.object.parent;
    fresh.position.copy(thing.object.position);
    fresh.position.y = deck;
    this.drop(thing);
    parent?.add(fresh);
    this.placed.push(fresh);
    thing.object = fresh;
    thing.item = item;
  }

  /**
   * **Der Stapel auf der Anrichte, wie er gerade aussieht.**
   *
   * Er wird bei jeder Schicht neu gebaut und nicht ergänzt: Ein Burger ist
   * unten das Brötchen und oben die Haube (`FoodKit.burger`), und wer die
   * Tomate zuletzt auflegt, will sie nicht über der Haube liegen sehen.
   * Formen und Farben sind geteilt, ein neuer Aufbau kostet also ein paar
   * Knoten und keine Geometrie.
   */
  private showStack(spot: Station): void {
    if (spot.view) {
      spot.view.removeFromParent();
      this.forget(spot.view);
      spot.view = null;
    }
    if (!spot.stack.length || !this.world) return;
    const view = this.food.burger(spot.stack);
    view.position.copy(spot.deck);
    this.world.root.add(view);
    this.placed.push(view);
    spot.view = view;
  }

  /** Der fertige Stapel auf den Teller in der Hand — der Teller trägt ihn. */
  private dishUp(plate: Carried, parts: KitchenItem[]): void {
    const burger = this.food.burger(parts);
    burger.position.y = PLATE_HEIGHT;
    plate.object.add(burger);
    plate.item = 'plate-burger';
    plate.parts = parts;
  }

  /** Und wieder herunter: Der Burger fliegt, der Teller bleibt. */
  private scrape(plate: Carried): void {
    const burger = plate.object.getObjectByName('kitchen-burger');
    burger?.removeFromParent();
    plate.item = 'plate';
    plate.parts = undefined;
  }

  /** In die Hand: ans Rig hängen, den Rest macht `update`. */
  private takeInHand(thing: Carried): void {
    const rig = this.rig;
    this.carried = thing;
    thing.object.rotation.set(0, 0, 0);
    if (rig) rig.add(thing.object);
    else thing.object.removeFromParent();
  }

  /** Auf eine Fläche: in die Welt hängen, mittig auf die Arbeitsplatte. */
  private layOn(spot: Station, thing: Carried): void {
    const world = this.world;
    spot.on = thing;
    spot.chops = 0;
    thing.object.rotation.set(0, 0, 0);
    if (world) world.root.add(thing.object);
    thing.object.position.copy(spot.deck);
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
    this.drop(thing);
  }

  /** Ein Objekt aus der Szene und aus `placed` nehmen. */
  private drop(thing: Carried): void {
    thing.object.removeFromParent();
    this.forget(thing.object);
  }

  private forget(object: THREE.Object3D): void {
    const at = this.placed.indexOf(object);
    if (at >= 0) this.placed.splice(at, 1);
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}

/** Die Station, so viel wie die Regel davon braucht (`kitchenCarry.ts`). */
function facts(spot: Station): StationFacts {
  return {
    kind: spot.kind,
    on: spot.on?.item ?? null,
    ...(spot.gives ? { gives: spot.gives } : {}),
    chops: spot.chops,
    pan: spot.pan?.item ?? null,
    done: spot.done,
    stack: spot.stack,
  };
}

/** Die Namen, die dieser Aufbau benutzt — für den Test daneben. */
export const KITCHEN_USED: readonly string[] = KITCHEN_SPOTS.map((spot) => spot.name);

/** Und die, die er (noch) nicht benutzt — dieselbe Liste, andersherum gelesen. */
export function unusedKitchenPieces(): readonly string[] {
  return KITCHEN_PIECES.filter((piece) => !KITCHEN_USED.includes(piece.name)).map(
    (piece) => piece.name,
  );
}

/** Die Möbel, die der Schauraum einzeln zeigt — jedes genau einmal. */
export const KITCHEN_SHOWN: readonly string[] = KITCHEN_SPOTS.filter((spot) => spot.show).map(
  (spot) => spot.name,
);
