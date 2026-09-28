import * as THREE from 'three';
import { kitchenHub } from '../../core/kitchenFit';
import type { IceFlavor } from '../plateup/plateUpIce';
import { BallKit, IceConeView } from '../shared/iceCone';
import { WOBBLE } from '../shared/iceWobble';
import { WATER_LOOK } from '../test/zones/kitchenProps';
import { isStack, type Dish, type KitchenItem } from '../test/zones/kitchenRecipes';
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

/**
 * **Was kleiner gezeigt wird als im Regal** — das Teigstück der rohen Waffel
 * ist die Teigkugel, auf ein Viertel geteilt: Sie hat die Größe der Waffel,
 * nicht die des ganzen Teigs.
 */
export const ITEM_SCALE: Readonly<Partial<Record<KitchenItem, number>>> = {
  'waffle-raw': 0.5,
  // Die Bahnen der Tapeten sind Banner für eine ganze Wand.
  'wallpaper-brick': 0.3,
  'wallpaper-plaster': 0.3,
  'wallpaper-beige': 0.3,
  'wallpaper-stripes': 0.3,
  'wallpaper-wood': 0.3,
  'wallpaper-tiles': 0.3,
  // Die Platten der Beläge sind eine ganze Kachel.
  // Die Prototyp-Platte ist zwei Kacheln breit (`house/flooring.ts`).
  'floor-proto': 0.175,
  'floor-kitchen': 0.35,
  'floor-kitchen-b': 0.35,
  'floor-wood': 0.35,
  'floor-wood-dark': 0.35,
  'floor-stone': 0.35,
};

/** Was nebeneinander statt aufeinander liegt — die rohen Waffeln. */
const SPREAD_ITEMS: ReadonlySet<KitchenItem> = new Set<KitchenItem>(['waffle-raw']);

/**
 * **Wo die Stücke nebeneinander liegen**, in Stückbreiten um die Mitte — zwei
 * mal zwei. Gewünscht: _„man hat vier rohe Waffeln dann liegen"_: Die
 * Teigstücke liegen **neben**einander auf der Platte, und in der Pfanne liegt
 * alles, was mehrfach darin brät, nebeneinander (gebraten wird nicht im Turm).
 * `null`: wie immer übereinander (`dishLayout`) — auch der Stapel gebratener
 * Waffeln auf der Platte.
 */
export function dishSpread(d: Dish): readonly (readonly [x: number, z: number])[] | null {
  const many = d.item === 'pan' ? d.on.length > 1 : isStack(d) && SPREAD_ITEMS.has(d.item);
  if (!many) return null;
  const count = d.item === 'pan' ? d.on.length : d.on.length + 1;
  const slots: (readonly [number, number])[] = [
    [-0.5, -0.5],
    [0.5, -0.5],
    [-0.5, 0.5],
    [0.5, 0.5],
  ];
  return slots.slice(0, count);
}

/** Welcher Anteil der Pfanne (ohne Stiel) für das Nebeneinander da ist. */
const PAN_FILL = 0.8;

/** Wie breit die Pfanne ist, ohne ihren Stiel — die schmalere Seite der Hülle. */
function panWidth(box: THREE.Box3): number {
  return Math.min(box.max.x - box.min.x, box.max.z - box.min.z);
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
      // **Dreimal so groß, überall** — in der Hand wie abgestellt. Gemeldet:
      // _„Abgestelltes Eis ist leider kleiner als in der Hand"_ — der Faktor
      // stand nur in der Hand der Welt (`TestRestaurantWorld`), jetzt hier.
      const big = new THREE.Group();
      big.scale.setScalar(CONE_SCALE);
      big.add(cone.root);
      group.add(big);
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
      lay(inner, dish, templates);
      tintSoup(inner, dish, paths);
      if (dish.item === 'pot' && dish.on.includes('water')) this.pourWater(inner, templates[0]);
    });
    return { group, done };
  }

  /** Das Material des Wassers im Topf — eines für alle Töpfe. */
  private water: THREE.MeshStandardMaterial | null = null;

  /**
   * **Wasser im Topf, sichtbar** — gewünscht: _„nur muss das Wasser im Topf
   * sichtbar sein"_. Eine Scheibe in der Farbe der Sandbox
   * (`kitchenProps.WATER_LOOK`, dort `FoodKit.water`), so breit wie die
   * Öffnung innen, vom Boden bis knapp unter den Rand (`POT_WATER`).
   *
   * **Gemessen an der Vorlage, nicht am Topf in der Welt** — gemeldet: _„der
   * Wasser Kreis im Topf passt null"_. Die Kopie hängt schon in der Station
   * (Maßstab von Topf, Station und Hand), ihre Hülle in Weltmaßen war zu
   * klein, und die Scheibe saß als Pfütze am Boden. Die Vorlage hängt an
   * nichts: Ihre Hülle ist die des Topfs in seinen eigenen Maßen, dieselben,
   * in denen die Scheibe neben ihm liegt (`lay` stellt ihn mittig auf 0).
   */
  private pourWater(inner: THREE.Group, template: THREE.Object3D | null | undefined): void {
    if (!template) return;
    const box = new THREE.Box3().setFromObject(template);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    this.water ??= new THREE.MeshStandardMaterial({ ...WATER_LOOK, transparent: true });
    const radius = Math.min(size.x, size.z) * POT_WATER.radius;
    const deep = size.y * POT_WATER.deep;
    const water = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, deep, 24), this.water);
    water.name = 'dish-pot-water';
    water.position.y = size.y * POT_WATER.bottom + deep / 2;
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

/**
 * **Das Hörnchen dreimal so groß** wie ein anderes Gericht — gewünscht:
 * _„Die Eiswaffel und Kugeln in der Hand sind zu klein, 3x so groß bitte."_
 * Das Hörnchen ist nur 14 cm hoch (`shared/iceCone.ICE_SIZE`).
 */
export const CONE_SCALE = 3;

/**
 * **Wie groß der Topf gezeigt wird** — anderthalbmal so groß wie im Regal.
 * Erst doppelt (_„doppelt so groß, dass man auch sieht was drin ist"_), dann
 * ein Viertel kleiner: _„Der Kochtopf ist zu groß, ggf. 25% kleiner bitte."_
 */
export const POT_SCALE = 1.5;

/**
 * **Wo das Wasser im Topf steht**, als Anteil am Topf (`pot_A`): Halbmesser
 * der Öffnung innen (an der schmaleren Seite, ohne Henkel), Boden und Tiefe.
 * Im Bild nachgesehen, von schräg oben und von oben — die Scheibe füllt die
 * Öffnung bis an die Wand und steht knapp unter dem Rand.
 */
export const POT_WATER = { radius: 0.42, bottom: 0.12, deep: 0.6 } as const;

/**
 * **Die Farben der Suppen** — das Regal hat nur einen Eintopf, und jede Suppe
 * bekommt ihn in ihrer Farbe: Karotte orange, Tomate rot, Zwiebel goldgelb,
 * Pilz braun. Dazu die verbrannte Waffel.
 */
export const SOUP_TINT: Readonly<Partial<Record<KitchenItem, number>>> = {
  stew: 0xe8872e,
  'tomato-soup': 0xc9352a,
  'soup-onion': 0xe0c065,
  'soup-mushroom': 0x8a6547,
  // **Die verbrannte Waffel** ist die Waffel, fast schwarz — die rohe ist
  // ein Teigstück (`itemModels`) und braucht keine Farbe.
  'waffle-burnt': 0x3a2a1c,
};

/** Welche Stücke gefärbt werden — die Suppe und die Waffel. */
const SOUP_PIECES = new Set(['stew_bowl', 'food_stew', 'icecream_waffle']);

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
function lay(group: THREE.Group, dish: Dish, templates: readonly (THREE.Object3D | null)[]): void {
  const carrier = dish.item;
  const items = [dish.item, ...dish.on];
  const pieces = templates.map((template, i) => {
    if (!template) return null;
    const piece = template.clone(true);
    // Nur, wo Bild und Ding eins zu eins sind (der Stapel, die Pfanne).
    const scale = templates.length === items.length ? ITEM_SCALE[items[i]!] : undefined;
    if (scale) piece.scale.multiplyScalar(scale);
    return piece;
  });
  const boxes = pieces.map((piece) => {
    if (!piece) return null;
    const box = new THREE.Box3().setFromObject(piece);
    return box.isEmpty() ? null : box;
  });
  const heights = boxes.map((box) => (box ? box.max.y - box.min.y : 0));
  const layout = dishLayout(carrier, heights);
  const spread = templates.length === items.length ? dishSpread(dish) : null;
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
    // **Nebeneinander** (`dishSpread`): alle auf der Höhe des ersten Stücks,
    // je eine Stückbreite versetzt.
    const first = carrier === 'pan' ? 1 : 0;
    const slot = spread && i >= first ? spread[i - first] : undefined;
    if (slot) {
      // In der Pfanne passen vier nur hinein, wenn sie kleiner werden: jedes
      // höchstens so breit wie ein Viertel der Pfanne (`PAN_FILL`).
      const bowl = carrier === 'pan' && base ? panWidth(base) * PAN_FILL : Infinity;
      const own = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      if (own > bowl / 2) {
        piece.scale.multiplyScalar(bowl / 2 / own);
        box.setFromObject(piece);
      }
      const wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
      const y = carrier === 'pan' ? layout[1]!.y : 0;
      piece.position.set(
        -(box.min.x + box.max.x) / 2 + slot[0] * wide,
        y - box.min.y,
        -(box.min.z + box.max.z) / 2 + slot[1] * wide,
      );
      group.add(piece);
      return;
    }
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
