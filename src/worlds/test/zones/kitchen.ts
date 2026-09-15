import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_W, TILE } from '../../nav/navTile';
import {
  KITCHEN_PIECES,
  kitchenDeck,
  kitchenPiece,
  type KitchenPiece,
} from '../../../core/kitchenFit';
import { canLoadModels, CHEF_TOOL } from '../../../core/chefFit';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
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
import { buildBun, buildBunBox, BOX_HEIGHT, BOX_SIZE } from './kitchenProps';
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

/** Wo die Brötchenkiste steht — westlich der Insel, in derselben Reihe. */
export const BUN_BOX_TILE = { x: 1, z: 4 } as const;

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

  // Und die Brötchenkiste: Sie kommt nicht aus dem Katalog, steht aber genauso
  // im Weg (`kitchenProps.ts`).
  plan.floor(
    { x: KITCHEN.x + BUN_BOX_TILE.x, z: KITCHEN.z + BUN_BOX_TILE.z, w: 1, d: 1 },
    { cost: FURNITURE_COST },
  );
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
        '- An der Nordwand: Zeile, zwei Herde, Spüle',
        '- In der Mitte: Zeile, Schneidebrett, Mülleimer, Brötchenkiste',
        '- Vorn: Ausgabe mit den Wärmeschirmen darüber',
        '- Im Osten: der Schauraum — jedes Möbel einmal, beschriftet',
        '',
        '`A` nimmt Topf, Pfanne und Brötchen in die Hand und legt sie wieder ab.',
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
  /** Was gerade darauf liegt. */
  on: Carried | null;
  /** Ob sie gerade als benutzbar angemeldet ist. */
  live: boolean;
}

/** Ein Ding in der Hand oder auf einer Fläche. */
interface Carried {
  readonly item: KitchenItem;
  readonly object: THREE.Object3D;
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
 * in `kitchenCarry.ts` — neun Fälle, die ein Test nachrechnet, statt dass man
 * sie im Headset durchspielt. Diese Klasse ist der Teil, den ein Test nicht
 * lesen kann: Netze umhängen, Körper bauen, Schilder schreiben.
 */
export class KitchenZone implements TestZone {
  private world: ZoneHost | null = null;
  private rig: THREE.Object3D | null = null;
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
  /** Was die Figur gerade trägt. */
  private carried: Carried | null = null;

  build(ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.rig = ctx.rig;
    this.gone = false;

    // Die Brötchenkiste ist gebaut und nicht geladen — sie steht sofort da,
    // auch wenn die Datei nie ankommt (`kitchenProps.ts`).
    this.buildBunBox(world);
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
   * **Jedes Bild**: das, was in der Hand liegt, an die Hand.
   *
   * Es hängt am **Rig** und nicht an der Hand des Avatars, und das hat einen
   * einfachen Grund: Die Hand gibt es nur von oben und am Schreibtisch
   * (`worlds/portal/screenHand.ts`), in der Brille sind es zwei echte. Das
   * Rig gibt es immer. Wo genau am Rig, sagt die Ansicht — an der Figur ist
   * es ihre Faust (`core/chefFit.CHEF_TOOL`), in der Brille eine Handbreit
   * vor der Brust.
   */
  update(_dt: number, ctx: WorldContext): void {
    const held = this.carried;
    if (!held) return;
    if (ctx.renderer.xr.isPresenting) {
      held.object.position.set(0.2, ctx.rig.camera.position.y - 0.6, -0.4);
    } else {
      held.object.position.set(CHEF_TOOL.x, CHEF_TOOL.y, CHEF_TOOL.z);
    }
  }

  /** `B`/`Y`: Hände auf, Töpfe zurück auf ihren Herd, Brötchen in den Müll. */
  reset(): void {
    const loose = [this.carried, ...this.stations.map((station) => station.on)];
    this.carried = null;
    for (const station of this.stations) station.on = null;
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
    this.stations.length = 0;
    this.bodies.length = 0;
    this.carried = null;
    this.hidden = null;
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

  /** Die Brötchenkiste: gebaut, fest, und die Quelle für alle Brötchen. */
  private buildBunBox(world: ZoneHost): void {
    const box = buildBunBox(this.owned);
    const x = (KITCHEN.x + BUN_BOX_TILE.x + 0.5) * TILE;
    const z = (KITCHEN.z + BUN_BOX_TILE.z + 0.5) * TILE;
    box.position.set(x, KITCHEN_FLOOR, z);
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);

    const body = this.boxAt(BOX_SIZE, BOX_HEIGHT, BOX_SIZE, x, KITCHEN_FLOOR, z);
    world.root.add(body);
    body.updateWorldMatrix(true, false);
    this.placed.push(body);
    this.bodies.push(world.addSolid(body));

    this.stations.push({
      kind: 'box',
      label: 'Brötchenkiste',
      object: box,
      deck: new THREE.Vector3(x, KITCHEN_FLOOR + BOX_HEIGHT, z),
      gives: 'bun',
      on: null,
      live: false,
    });
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
    if (piece.name === 'bin') {
      this.stations.push({
        kind: 'bin',
        label: piece.label,
        object: model,
        deck,
        on: null,
        live: false,
      });
      return;
    }
    if (!piece.worktop) return;

    const station: Station = {
      kind: 'top',
      label: piece.label,
      object: model,
      deck,
      on: null,
      live: false,
    };
    this.stations.push(station);

    if (!piece.holds) return;
    const loose = takeUtensil(model);
    if (!loose) return;
    this.placed.push(loose);
    this.layOn(station, { item: piece.holds, object: loose, home: station });
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
    for (const station of this.stations) {
      const wanted =
        station.kind === 'box'
          ? this.carried === null
          : station.kind === 'bin'
            ? this.carried !== null
            : station.on !== null || this.carried !== null;
      if (wanted === station.live) continue;
      station.live = wanted;
      if (!wanted) {
        world.removeUsable(station.object);
        continue;
      }
      world.addUsable(
        station.object,
        {
          use: () => this.act(station),
          usePrompt: () =>
            kitchenPrompt(kitchenDeed(this.carried?.item ?? null, facts(station)), station.label),
        },
        // **Nicht schießbar**: Eine Kugel, die den Topf vom Herd holt, ist ein
        // Scherz und keine Regel (`PortalWorld.shootUsable`).
        { shot: 0 },
      );
    }
  }

  /** Was `A` an dieser Station bewirkt (`kitchenCarry.kitchenDeed`). */
  private act(station: Station): boolean {
    const world = this.world;
    if (!world) return false;
    const deed = kitchenDeed(this.carried?.item ?? null, facts(station));
    switch (deed.do) {
      case 'take': {
        const thing = station.on ?? this.makeItem(deed.item);
        station.on = null;
        if (!thing) return false;
        this.takeInHand(thing);
        world.notify(`${ITEM_LABELS[thing.item]} in der Hand`);
        break;
      }
      case 'place': {
        const thing = this.carried;
        if (!thing) return false;
        this.carried = null;
        this.layOn(station, thing);
        world.notify(`${ITEM_LABELS[thing.item]} auf ${station.label}`);
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
      case 'refuse':
        world.notify(deed.why);
        return true;
      case 'nothing':
        return false;
    }
    this.refreshStations();
    return true;
  }

  /** Ein neues Ding aus einer Kiste — es gibt bisher genau Brötchen. */
  private makeItem(item: KitchenItem): Carried | null {
    if (item !== 'bun') return null;
    const bun = buildBun(this.owned);
    this.placed.push(bun);
    return { item, object: bun, home: null };
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
  private layOn(station: Station, thing: Carried): void {
    const world = this.world;
    station.on = thing;
    thing.object.rotation.set(0, 0, 0);
    if (world) world.root.add(thing.object);
    thing.object.position.copy(station.deck);
  }

  /**
   * **Und weg damit** — aus der Szene, aber nicht aus dem Speicher der Zone:
   * `dispose` räumt am Ende alles ab, was hier je gebaut wurde.
   */
  private discard(thing: Carried): void {
    thing.object.removeFromParent();
  }

  private own<T extends THREE.Material>(material: T): T {
    this.owned.push(material);
    return material;
  }
}

/** Die Station, so viel wie die Regel davon braucht (`kitchenCarry.ts`). */
function facts(station: Station): StationFacts {
  return {
    kind: station.kind,
    on: station.on?.item ?? null,
    ...(station.gives ? { gives: station.gives } : {}),
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
