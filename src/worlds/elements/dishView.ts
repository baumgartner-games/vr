import * as THREE from 'three';
import { kitchenHub } from '../../core/kitchenFit';
import type { IceFlavor } from '../plateup/plateUpIce';
import { BallKit, IceConeView } from '../shared/iceCone';
import { WOBBLE } from '../shared/iceWobble';
import { WATER_LOOK } from '../test/zones/kitchenProps';
import type { Dish, KitchenItem } from '../test/zones/kitchenRecipes';
import { dishModels } from './itemModels';

/**
 * **Ein Gericht der Küche als Bild aus dem Regal** — das Gegenstück zu
 * `test/zones/kitchenProps.FoodKit`, nur aus _Restaurant Bits_ statt aus dem
 * Diner-Baukasten.
 *
 * Welche Stücke und in welcher Reihenfolge, sagt `itemModels.dishModels`
 * (Träger zuerst, dann was darauf oder darin liegt). Hier steht nur, **wie
 * hoch** jedes zu liegen kommt — gemessen am geladenen Modell, nicht
 * abgeschrieben —, und das in einer reinen Rechnung (`dishLayout`), die ein
 * Test ohne Modelle nachrechnet.
 */

/** Ein Schlüssel für ein Gericht — ändert er sich, muss das Bild neu. */
export function dishKey(d: Dish): string {
  return `${d.item}[${d.on.join(',')}]`;
}

/** Wo ein Stück eines Gerichts liegt. */
export interface DishPiece {
  /** Die Unterkante über der Unterkante des Trägers, in Metern. */
  readonly y: number;
  /**
   * **Im Träger statt obenauf**: mit demselben Ursprung wie er, so wie die
   * Dateien zueinander gebaut sind. Die Füllung einer Schüssel
   * (`icecream_bowl_icecream_*`, `stew_bowl`, `icecream_bowl_waffles`) hat
   * ihren Ursprung dort, wo die Schüssel sie trägt — obenauf gestapelt
   * schwebte sie über dem Rand.
   */
  readonly inside: boolean;
}

/**
 * **Wie weit ein Stück im vorigen steckt** — Brötchen haben eine Mulde, ein
 * Patty liegt darin und nicht darauf. Derselbe Anteil hatte das Burgerband des
 * ersten Test Restaurants.
 */
export const NEST = 0.7;
/** Wie tief das Erste auf dem Teller liegt, als Anteil der Tellerhöhe (ein Teller ist flach gewölbt). */
export const ON_PLATE = 0.6;
/** Wie tief die Pizza im offenen Karton liegt, als Anteil seiner Höhe. */
export const IN_BOX = 0.25;
/**
 * **Wie tief der Inhalt im Topf liegt**, als Anteil seiner Höhe — knapp unter
 * dem Rand, damit man von oben sieht, was darin kocht. Ohne das säße die
 * Kartoffel auf dem Rand (`NEST` ist für Brötchen gedacht).
 */
export const IN_POT = 0.45;
/**
 * **Jede weitere Füllung einer Schüssel sitzt etwas höher** — als Anteil
 * ihrer eigenen Höhe. Zwei Kugeln mit demselben Ursprung lägen sonst
 * ineinander, und man sähe nur eine.
 */
export const SECOND_SCOOP = 0.35;

/**
 * **Wie hoch jedes Stück liegt** — aus dem Träger und den gemessenen Höhen,
 * in der Reihenfolge von `dishModels`.
 *
 * - **Schüssel**: alles Weitere darin (`inside`), jede Füllung nach der
 *   ersten etwas höher (`SECOND_SCOOP`).
 * - **Pizzakarton**: die Pizza liegt im Karton, knapp über seinem Boden.
 * - **Topf**: was darin kocht, liegt knapp unter dem Rand (`IN_POT`).
 * - **Teller**: das Erste liegt in seiner Mulde, alles Weitere ineinander.
 * - **Sonst** (ein Brötchen mit Belag): eines im anderen (`NEST`).
 */
export function dishLayout(carrier: KitchenItem, heights: readonly number[]): DishPiece[] {
  const out: DishPiece[] = [];
  let y = 0;
  heights.forEach((h, i) => {
    if (i === 0) {
      out.push({ y: 0, inside: false });
      return;
    }
    // Die Eiswanne trägt ihre Füllung wie die Schüssel: darin, mit ihrem Ursprung.
    if (carrier === 'bowl' || carrier === 'tray') {
      out.push({ y: (i - 1) * SECOND_SCOOP * h, inside: true });
      return;
    }
    if (carrier === 'pizzabox') {
      out.push({ y: heights[0]! * IN_BOX, inside: false });
      return;
    }
    if (carrier === 'pot') {
      out.push({ y: heights[0]! * IN_POT, inside: false });
      return;
    }
    const below = heights[i - 1]!;
    y = i === 1 && carrier === 'plate' ? below * ON_PLATE : y + below * NEST;
    out.push({ y, inside: false });
  });
  return out;
}

/** Holt die Vorlage einer Datei — geteilt, nie verändert; `null`, wenn keine kam. */
export type TemplateSource = (path: string) => Promise<THREE.Object3D | null>;

/**
 * **Die Bilder der Gerichte einer Welt.**
 *
 * `view` gibt sofort eine Gruppe zurück und füllt sie, sobald die Vorlagen da
 * sind — ein Gericht, das eine Station eben verändert hat, soll nicht auf das
 * Netz warten, bevor das alte Bild verschwindet. Kopiert wird mit
 * `clone(true)`: Geometrie und Materialien gehören der Vorlage, und wer ein
 * Bild wegnimmt, muss nichts freigeben.
 */
export class KaykitDishView {
  private alive = true;
  /** Die Kugeln der Hörnchen — einmal für alle (`plateUpIceView.BallKit`). */
  private balls: BallKit | null = null;

  constructor(private readonly template: TemplateSource) {}

  /** Das Bild eines Gerichts, die Unterseite auf y = 0 und mittig über dem Ursprung. */
  view(dish: Dish): THREE.Group {
    return this.build(dish).group;
  }

  /** Dasselbe Bild, aber erst, wenn es gefüllt ist — für eine Kachel im Menü. */
  async ready(dish: Dish): Promise<THREE.Group> {
    const { group, done } = this.build(dish);
    await done;
    return group;
  }

  private build(dish: Dish): { group: THREE.Group; done: Promise<void> } {
    const group = new THREE.Group();
    group.name = `dish:${dishKey(dish)}`;
    // **Die Eiswanne liegt quer** — um 90° gedreht gegen die Eisecke, längs
    // der Platte: _„Ich glaube ich möchte Eis trays auf der Arbeitsplatte um
    // 90° gedreht haben und nur eines pro Arbeitsplatte."_
    if (dish.item === 'tray') group.rotation.y = Math.PI / 2;
    // **Das Hörnchen ist das des Restaurants** (`IceConeView`): Hörnchen und
    // ein Turm aus Kugeln, so viele es sind — dasselbe Bild wie im Laden.
    if (dish.item === 'cone') {
      // Angemeldet (`auto`): Der Turm wackelt, sobald die Welt `stepIceCones`
      // ruft — und schaukelt auch auf der Platte, gewünscht: _„das Eis wackelt
      // da auch im idle"_.
      const cone = new IceConeView((this.balls ??= new BallKit()), WOBBLE.idle, true);
      cone.set({ balls: dish.on.map(flavorOf).filter((one) => one !== null) });
      group.add(cone.root);
      return { group, done: Promise.resolve() };
    }
    const paths = dishModels(dish);
    // **Der Topf doppelt so groß** — gewünscht: _„Der Topf sollte übrigens
    // doppelt so groß sein, dass man auch sieht was drin ist."_ In einer
    // eigenen Gruppe, denn die äußere bekommt beim Tragen ihren Maßstab.
    const inner = dish.item === 'pot' ? new THREE.Group() : group;
    if (inner !== group) {
      inner.scale.setScalar(POT_SCALE);
      group.add(inner);
    }
    const done = Promise.all(paths.map((path) => this.template(path))).then((templates) => {
      if (!this.alive) return;
      lay(inner, dish.item, templates);
      tintSoup(inner, dish, paths);
      if (dish.item === 'pot' && dish.on.includes('water')) this.pourWater(inner);
    });
    return { group, done };
  }

  /** Das Material des Wassers im Topf — eines für alle Töpfe. */
  private water: THREE.MeshStandardMaterial | null = null;

  /**
   * **Wasser im Topf, sichtbar** — gewünscht: _„nur muss das Wasser im Topf
   * sichtbar sein"_. Eine Scheibe in der Farbe der Sandbox
   * (`kitchenProps.WATER_LOOK`, dort `FoodKit.water`), so breit wie die
   * Öffnung und knapp unter dem Rand, gemessen am Topf.
   */
  private pourWater(inner: THREE.Group): void {
    const pot = inner.children[0];
    if (!pot) return;
    const box = new THREE.Box3().setFromObject(pot);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    this.water ??= new THREE.MeshStandardMaterial({ ...WATER_LOOK, transparent: true });
    const radius = Math.min(size.x, size.z) * 0.36;
    const deep = size.y * 0.35;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, deep, 18), this.water);
    water.name = 'dish-pot-water';
    water.position.y = size.y * 0.25 + deep / 2;
    inner.add(water);
  }

  /** Nichts mehr füllen, was noch lädt. */
  dispose(): void {
    this.alive = false;
    this.water?.dispose();
    this.water = null;
    this.balls?.dispose();
    this.balls = null;
  }
}

/** Wie groß der Topf gezeigt wird — doppelt so groß wie im Regal. */
export const POT_SCALE = 2;

/**
 * **Die Farben der Suppen** — das Regal hat nur einen Eintopf, und jede Suppe
 * bekommt ihn in ihrer Farbe: Karotte orange, Tomate rot, Zwiebel goldgelb,
 * Pilz braun.
 */
export const SOUP_TINT: Readonly<Partial<Record<KitchenItem, number>>> = {
  stew: 0xe8872e,
  'tomato-soup': 0xc9352a,
  'soup-onion': 0xe0c065,
  'soup-mushroom': 0x8a6547,
};

/** Welche Stücke Suppe zeigen — die gefärbt werden. */
const SOUP_PIECES = new Set(['stew_bowl', 'food_stew']);

/**
 * **Die Suppe in ihrer Farbe** — eigene Materialien für die Kopien, sonst
 * färbte sich die Vorlage und mit ihr jede andere Suppe.
 */
function tintSoup(group: THREE.Object3D, dish: Dish, paths: readonly string[]): void {
  const soup = [dish.item, ...dish.on].find((item) => SOUP_TINT[item] !== undefined);
  if (!soup) return;
  const color = SOUP_TINT[soup]!;
  group.children.forEach((piece, i) => {
    const path = paths[i] ?? '';
    const name = path.slice(path.lastIndexOf('/') + 1).replace('.glb', '');
    if (!SOUP_PIECES.has(name)) return;
    piece.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (!mesh.isMesh) return;
      const skins = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const tinted = skins.map((skin) => {
        const copy = skin.clone() as THREE.MeshStandardMaterial;
        if (copy.color) copy.color.lerp(new THREE.Color(color), 0.7);
        return copy;
      });
      mesh.material = Array.isArray(mesh.material) ? tinted : tinted[0]!;
    });
  });
}

/** Die Sorte einer Kugel, wie das Restaurant sie kennt (`plateUpIce.IceFlavor`). */
function flavorOf(item: KitchenItem): IceFlavor | null {
  if (item === 'ice-vanilla') return 'vanilla';
  if (item === 'ice-strawberry') return 'strawberry';
  if (item === 'ice-chocolate') return 'chocolate';
  return null;
}

/** Die Stücke kopieren, messen und nach `dishLayout` in die Gruppe legen. */
function lay(
  group: THREE.Group,
  carrier: KitchenItem,
  templates: readonly (THREE.Object3D | null)[],
): void {
  const pieces = templates.map((template) => (template ? template.clone(true) : null));
  const boxes = pieces.map((piece) => {
    if (!piece) return null;
    const box = new THREE.Box3().setFromObject(piece);
    return box.isEmpty() ? null : box;
  });
  const heights = boxes.map((box) => (box ? box.max.y - box.min.y : 0));
  const layout = dishLayout(carrier, heights);
  const base = boxes[0];
  const shift = base
    ? new THREE.Vector3(-(base.min.x + base.max.x) / 2, -base.min.y, -(base.min.z + base.max.z) / 2)
    : new THREE.Vector3();
  pieces.forEach((piece, i) => {
    const box = boxes[i];
    const where = layout[i];
    if (!piece || !box || !where) return;
    // Der Träger steht mit seiner **Mulde** über der Mitte und nicht mit der
    // Mitte seiner Hülle — bei der Pfanne gehört der Stiel zur Hülle
    // (`kitchenFit.kitchenHub`, dieselbe Zahl wie in der Sandbox-Küche).
    const [hx, hz] = i === 0 ? kitchenHub(carrier) : [0, 0];
    if (where.inside) piece.position.copy(shift).add(new THREE.Vector3(0, where.y, 0));
    else
      piece.position.set(
        -(box.min.x + box.max.x) / 2 - hx,
        where.y - box.min.y,
        -(box.min.z + box.max.z) / 2 - hz,
      );
    group.add(piece);
  });
}
