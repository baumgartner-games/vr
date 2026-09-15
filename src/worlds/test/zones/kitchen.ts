import * as THREE from 'three';
import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_W, TILE } from '../../nav/navTile';
import { KITCHEN_PIECES, kitchenPiece, type KitchenPiece } from '../../../core/kitchenFit';
import { canLoadModels } from '../../../core/chefFit';
import type { WorldContext } from '../../../core/types';
import { KITCHEN } from '../layout';
import type { TestZone, ZoneHost } from './zone';

/**
 * **Die Küche** — Norden, hinter dem Podest, und die einzige Zone dieser Welt,
 * die aus einem **gekauften Modell** besteht.
 *
 * Die Möbel sind „Overcooked Kitchen Assets (Fan Art)" von Arun Kumar S,
 * CC-BY-4.0 (`public/models/CREDITS.md`), aufbereitet von
 * `tools/kitchen-model.mjs` in dreizehn einzeln setzbare Stücke
 * (`core/kitchenFit.ts`, `core/kitchenModel.ts`). Der Katalog lag seit seinem
 * Import **ungenutzt** im Programm: dreizehn vermessene Möbel, eine Ladefunktion
 * und keine einzige Welt, die sie aufstellt. Das hier ist diese Welt.
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
}

/**
 * **Der Aufbau** — drei Bänder, wie in jeder Küche dieses Spiels: die Geräte
 * an der Wand, eine Insel zum Schnippeln, und vorn die Ausgabe.
 *
 * Die Zahlen sind Kacheln **innerhalb** der Zone (`layout.KITCHEN`), damit sich
 * die ganze Küche verschieben lässt, ohne dreizehn Zeilen nachzurechnen. Wie
 * groß ein Stück ist, steht nicht hier, sondern im Katalog — gemessen und
 * nicht geschätzt.
 */
export const KITCHEN_SPOTS: readonly Spot[] = [
  // --- die Wand im Norden: Zeile, zwei Herde, Spüle ---------------------------
  { name: 'counter', x: 0, z: 0 },
  { name: 'stove-pot', x: 2, z: 0 },
  { name: 'stove-pan', x: 5, z: 0 },
  { name: 'sink', x: 8, z: 0 },

  // --- die Insel in der Mitte -------------------------------------------------
  { name: 'table', x: 2, z: 4 },
  { name: 'board', x: 4, z: 4 },
  { name: 'bin', x: 6, z: 4 },

  // --- und vorn die Ausgabe, mit dem Regal darüber ----------------------------
  { name: 'serve-counter', x: 2, z: 8, turn: 2 },
  { name: 'plate-counter', x: 4, z: 8, turn: 2 },
  { name: 'pass', x: 6, z: 8, turn: 2 },
  { name: 'plate-rack', x: 6, z: 6 },
  { name: 'extinguisher', x: 10, z: 8 },
];

/** Wie weit ein Möbel eine Kachel verteuert — teurer als eine Kiste. */
const FURNITURE_COST = 8;

/** Wo die Oberkante des Küchenbodens liegt — knapp über dem Gelände. */
export const KITCHEN_FLOOR = 0.02;

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
  for (const spot of KITCHEN_SPOTS) {
    const piece = kitchenPiece(spot.name);
    if (!piece || piece.hanging) continue;
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
        '- In der Mitte: Arbeitstisch, Schneidebrett, Mülleimer',
        '- Vorn: Ausgabe mit dem Regal darüber',
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

/**
 * **Die Möbel selbst** — geladen, gesetzt, mit Körper.
 *
 * Sie kommen asynchron und womöglich gar nicht (kein Netz, kein WebGL, keine
 * Datei). Dann bleibt die Küche ein leerer Raum mit drei Wänden, und das ist
 * kein Fehlerfall: Der Grundriss stimmt trotzdem, die Wege stimmen trotzdem,
 * und niemand steht vor einer Welt, die nicht lädt.
 */
export class KitchenZone implements TestZone {
  private world: ZoneHost | null = null;
  /** Ob die Zone schon wieder abgeräumt wurde, als die Datei ankam. */
  private gone = false;
  private readonly placed: THREE.Object3D[] = [];

  build(_ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.gone = false;
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
        this.place(model, piece, spot);
      }
    });
  }

  dispose(): void {
    this.gone = true;
    // Die Formen und Materialien gehören der Vorlage und werden geteilt
    // (`core/kitchenModel.ts`); weggeräumt wird nur, was hier hängt.
    for (const object of this.placed) object.removeFromParent();
    this.placed.length = 0;
    this.world = null;
  }

  /**
   * Ein Stück an seinen Platz — die Mitte seiner Grundfläche, auf dem Boden.
   *
   * Der Ursprung eines Möbels liegt **auf dem Boden in seiner Mitte**
   * (`tools/kitchen-model.mjs`), also wird genau dorthin gerechnet und nichts
   * geraten. Ein hängendes Stück (die Dunstabzugshaube, das Ausgaberegal)
   * bekommt keinen Körper: Darunter läuft man durch.
   */
  private place(model: THREE.Object3D, piece: KitchenPiece, spot: Spot): void {
    const world = this.world;
    if (!world) return;
    const turn = spot.turn ?? 0;
    const size = footprint(piece, turn);
    model.position.set(
      (KITCHEN.x + spot.x + size.w / 2) * TILE,
      KITCHEN_FLOOR,
      (KITCHEN.z + spot.z + size.d / 2) * TILE,
    );
    model.rotation.y = (turn * Math.PI) / 2;
    world.root.add(model);
    model.updateWorldMatrix(true, false);
    this.placed.push(model);
    if (!piece.hanging) world.addSolid(model);
  }
}

/** Die Namen, die dieser Aufbau benutzt — für den Test daneben. */
export const KITCHEN_USED: readonly string[] = KITCHEN_SPOTS.map((spot) => spot.name);

/** Und die, die er (noch) nicht benutzt — dieselbe Liste, andersherum gelesen. */
export function unusedKitchenPieces(): readonly string[] {
  return KITCHEN_PIECES.filter((piece) => !KITCHEN_USED.includes(piece.name)).map(
    (piece) => piece.name,
  );
}
