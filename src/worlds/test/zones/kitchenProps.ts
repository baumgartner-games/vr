import * as THREE from 'three';
import { BURGER_PARTS, type BurgerPart, type KitchenItem } from './kitchenRecipes';

/**
 * **Was in der Küche steht, aber nicht aus der Datei kommt** — die Kisten und
 * alles, was darin, darauf und daraus wird.
 *
 * Der gekaufte Katalog hat dreizehn Möbel und **keine Zutat**
 * (`core/kitchenFit.ts`): kein Gemüse, kein Teig, kein Brötchen. Bei
 * _Overcooked_ ist die Kiste mit dem Nachschub aber genau der Ort, an dem eine
 * Runde anfängt — also wird sie hier gebaut, aus denselben Grundkörpern wie
 * die Kisten der Interaktionszone (`zones/interact.ts`).
 *
 * **Gebaut und nicht gemodelliert**, und das ist eine Entscheidung: Ein
 * Brötchen ist eine gedrückte Kugel, ein Patty eine Scheibe, eine Tomate eine
 * Kugel mit Strunk — und dafür eine zweite Quelldatei aufzunehmen, mit Lizenz,
 * Aufbereitung und Eintrag in `public/models/CREDITS.md`, wäre viel Aufwand
 * für ein Dutzend Zylinder. Wenn eines Tages ein Zutatensatz dazukommt,
 * ersetzt er genau diese Klasse.
 *
 * **Warum eine Klasse und keine Funktionen.** Aus einer Kiste kommt beliebig
 * oft ein Brötchen (`kitchenCarry.kitchenDeed`, `box`), und jedes davon hatte
 * bisher seine **eigenen** Materialien: Wer zehn Minuten Brötchen nimmt und
 * wegwirft, sammelte zwanzig Materialien an, die erst beim Verlassen der Zone
 * freigegeben wurden. Hier hängen Farben und Formen an **einem** Satz, der
 * geteilt und einmal weggeräumt wird (`dispose`) — dieselbe Entscheidung wie
 * beim Möbellader, der Geometrie und Material zwischen dreizehn Tresen teilt
 * (`core/kitchenModel.ts`).
 */

/** Kantenlänge der Kiste, in Metern — eine Kachel breit, halbhoch. */
export const BOX_SIZE = 0.8;
export const BOX_HEIGHT = 0.6;
/** Die Stärke der Bretter. */
const PLANK = 0.05;

/**
 * **Wie groß ein Brötchen ist**, als Halbmesser in Metern — ein Burger und
 * kein Frühstücksbrötchen.
 *
 * Es war einmal 11 cm groß, und das war zu wenig: Der Teller auf der
 * Tellerausgabe misst **75 cm** im Durchmesser (nachgemessen in
 * `public/models/kitchen.glb`: 1,50 m in der Quelle, halbiert von
 * `core/kitchenFit.KITCHEN_SCALE`), und daneben lag eine Murmel, die ein
 * Sechstel davon bedeckte. Beim Vorbild füllt der Burger den Teller **fast**
 * aus, und genau das tut er jetzt: 60 cm breit, vier Fünftel des Tellers.
 *
 * Der Teller ist das Maß und nicht die Figur — er ist der Ort, an dem ein
 * Burger am Ende landet, und was darauf zu klein aussieht, sieht überall zu
 * klein aus.
 */
export const BUN_RADIUS = 0.3;

/**
 * **Wie flach es gedrückt ist** — ein Anteil seines Durchmessers.
 *
 * Die Zahl steht hier und nicht zweimal weiter unten: Sie geht in die Höhe
 * **und** in die Stauchung der Kugel, und zwei Stellen mit derselben Zahl
 * sind eine Stelle zu viel. Flacher als früher (0,72), weil Breite allein
 * eine Kugel wachsen lässt: 60 cm breit und 43 cm hoch wäre ein Brotball auf
 * dem Tresen, 60 cm breit und 26 cm hoch ist ein Burger.
 */
const BUN_SQUASH = 0.44;

/** Und wie hoch es damit aufträgt — es ist gedrückt, keine Kugel. */
export const BUN_HEIGHT = BUN_RADIUS * 2 * BUN_SQUASH;

/**
 * **Der Teller**, halb so hoch wie ein Brötchen und ein Stück breiter.
 *
 * Nachgebaut und nicht geladen, obwohl es im Modell einen gibt: Der dort steht
 * **auf** der Tellerausgabe und ist Teil ihres Netzes (`Kitchen_Utensils`, ein
 * einziges Stück von 1,50 m in der Quelle). Ihn herauszulösen hieße, das Möbel
 * ohne Teller zu hinterlassen — eine Tellerausgabe, aus der man den letzten
 * Teller genommen hat. Der hier ist derselbe Durchmesser, nur eben beliebig
 * oft da.
 */
export const PLATE_RADIUS = 0.375;
export const PLATE_HEIGHT = 0.05;

/** Die Farben — Krume, Kruste, Fleisch, Grün, Tomate, Porzellan, Holz. */
const CRUST = 0xd9a253;
const CRUMB = 0xf0dcb4;
const RAW = 0xc4675c;
const DONE = 0x6f3f24;
const LEAF = 0x63a83c;
const LEAF_PALE = 0x8cc75c;
const TOMATO = 0xd23f2b;
const TOMATO_PALE = 0xe4705c;
const STALK = 0x4e7a2a;
const CHINA = 0xf4f2ec;
const WOOD = 0xa9763f;
const TRIM = 0x7d5327;

/**
 * **Der Zutatensatz einer Küche** — alle Formen, alle Farben, ein `dispose`.
 *
 * Ein Satz je Zone, und alles, was er ausgibt, teilt sich seine Materialien
 * und seine Geometrien. Was er nicht kennt, gibt er als `null` zurück: Topf
 * und Pfanne kommen aus dem Möbelmodell (`core/kitchenModel.takeUtensil`) und
 * nicht von hier.
 */
export class FoodKit {
  private readonly materials = new Map<number, THREE.MeshStandardMaterial>();
  private readonly shapes = new Map<string, THREE.BufferGeometry>();

  /**
   * **Ein Ding zum Tragen**, mit dem Ursprung auf seinem Fuß.
   *
   * Derselbe Ursprung wie bei jedem Möbel und bei jedem abgenommenen Gerät
   * (`core/kitchenModel.takeUtensil`): **auf dem Boden in der Mitte**. Damit
   * legt die Küche alles, was getragen wird, mit derselben Zeile ab und muss
   * sich nicht je Ding erinnern, wo dessen Null liegt.
   */
  item(id: KitchenItem): THREE.Object3D | null {
    switch (id) {
      case 'bun':
        return this.bun();
      case 'patty':
        return this.patty(false);
      case 'patty-cooked':
        return this.patty(true);
      case 'lettuce':
        return this.lettuce();
      case 'lettuce-cut':
        return this.slices('lettuce-cut', LEAF, LEAF_PALE, 0.27, 0.022);
      case 'tomato':
        return this.tomato();
      case 'tomato-cut':
        return this.slices('tomato-cut', TOMATO, TOMATO_PALE, 0.21, 0.028);
      case 'plate':
        return this.plate();
      default:
        return null;
    }
  }

  /**
   * **Der Burger**, Schicht für Schicht in der Reihenfolge des Rezepts
   * (`kitchenRecipes.BURGER_PARTS`).
   *
   * Gebaut wird aus dem **Stapel** und nicht aus dem Rezeptnamen: Ein
   * Hamburger ohne Salat soll flacher sein als der Deluxe, und wer eine fünfte
   * Zutat einführt, schreibt sie in `BURGER_PARTS` und sieht sie hier liegen.
   */
  burger(parts: readonly KitchenItem[]): THREE.Object3D {
    const burger = new THREE.Group();
    burger.name = 'kitchen-burger';

    // **Ohne Brötchen kein Brot.** Der Stapel auf der Anrichte wird hier auch
    // dann gebaut, wenn er erst halb fertig ist — und ein Patty, das schon in
    // einem Brötchen läge, sähe fertig aus, obwohl das Brötchen noch in der
    // Kiste liegt. Man soll sehen, was fehlt.
    const bread = parts.includes('bun');
    let y = 0;
    if (bread) {
      // Der Boden des Brötchens liegt immer unten — auch wenn jemand ihn
      // zuletzt aufgelegt hat. Ein Burger mit dem Deckel unter dem Fleisch
      // wäre ein Stapel und kein Burger.
      const base = this.mesh(
        'bun-base',
        () =>
          new THREE.CylinderGeometry(BUN_RADIUS * 0.92, BUN_RADIUS * 0.86, BUN_HEIGHT * 0.45, 16),
        CRUMB,
      );
      base.position.y = BUN_HEIGHT * 0.225;
      burger.add(base);
      y += BUN_HEIGHT * 0.45;
    }

    for (const part of BURGER_PARTS) {
      if (part === 'bun' || !parts.includes(part)) continue;
      const layer = this.layer(part);
      layer.position.y = y;
      burger.add(layer);
      y += layerHeight(part);
    }

    // Und die Haube darüber — dieselbe gedrückte Kugel wie am ganzen Brötchen.
    if (bread) {
      const dome = this.dome();
      dome.position.y = y;
      burger.add(dome);
    }
    return burger;
  }

  /**
   * **Eine Kiste mit einer Zutat darin** — vier Bretter, ein Boden, ein Stück.
   *
   * Das Stück darin ist **Deko** und nicht der Vorrat: Genommen wird aus der
   * Kiste beliebig oft (`kitchenCarry.kitchenDeed`, `box`), denn eine Kiste,
   * die nach drei Griffen leer ist, ist eine Kiste, vor der man steht und
   * nicht weiß, ob sie kaputt ist. Es soll sagen, was drin ist, und mehr
   * nicht — deshalb schaut es über den Rand.
   *
   * **Eines und nicht mehr drei**: Ein Burgerbrötchen ist 60 cm breit
   * (`BUN_RADIUS`), die Kiste innen 70 cm. Drei davon steckten ineinander und
   * hingen über den Rand, und eine Kiste, aus der Brötchen herauswachsen,
   * sieht nicht nach Vorrat aus, sondern nach Fehler. Die Kiste mitwachsen zu
   * lassen war die Alternative und ist keine: Sie steht auf **einer** Kachel
   * (`worlds/nav/navTile.TILE` = 1 m), und breiter als die Kachel stünde sie
   * im Weg.
   */
  crate(fill: KitchenItem): THREE.Object3D {
    const box = new THREE.Group();
    box.name = `kitchen-crate-${fill}`;

    const floor = this.mesh(
      'crate-floor',
      () => new THREE.BoxGeometry(BOX_SIZE, PLANK, BOX_SIZE),
      WOOD,
    );
    floor.position.y = PLANK / 2;
    box.add(floor);

    // Vier Wände, und die oberste Leiste dunkler: Daran sieht man von oben,
    // dass die Kiste offen ist und nicht ein Würfel.
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const wide = dx !== 0 ? PLANK : BOX_SIZE;
      const deep = dx !== 0 ? BOX_SIZE : PLANK;
      const key = dx !== 0 ? 'crate-wall-x' : 'crate-wall-z';
      const wall = this.mesh(key, () => new THREE.BoxGeometry(wide, BOX_HEIGHT, deep), WOOD);
      wall.position.set(
        (dx * (BOX_SIZE - PLANK)) / 2,
        BOX_HEIGHT / 2,
        (dz * (BOX_SIZE - PLANK)) / 2,
      );
      box.add(wall);

      const rim = this.mesh(
        `${key}-rim`,
        () => new THREE.BoxGeometry(wide + 0.02, 0.06, deep + 0.02),
        TRIM,
      );
      rim.position.set(wall.position.x, BOX_HEIGHT - 0.03, wall.position.z);
      box.add(rim);
    }

    // Die Zutat, mit dem Fuß so tief, dass sie eine Handbreit heraussieht —
    // gerechnet aus ihrer eigenen Höhe und nicht je Kiste geraten: Eine Tomate
    // ist halb so hoch wie ein Brötchen und läge sonst unsichtbar darin.
    const inside = this.item(fill);
    if (inside) {
      inside.position.y = BOX_HEIGHT - heightOf(inside) * 0.65;
      box.add(inside);
    }
    return box;
  }

  /** Alles weg — einmal je Zone, nicht je Brötchen. */
  dispose(): void {
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    for (const shape of this.shapes.values()) shape.dispose();
    this.shapes.clear();
  }

  // --- die Stücke selbst ----------------------------------------------------

  /** Das ganze Brötchen: Boden und Haube, so wie es aus der Kiste kommt. */
  private bun(): THREE.Object3D {
    const bun = new THREE.Group();
    bun.name = 'kitchen-bun';
    // Der helle Boden: eine flache Scheibe unter der Kruste. Ohne sie ist ein
    // Brötchen von oben ein brauner Fleck.
    const base = this.mesh(
      'bun-foot',
      () => new THREE.CylinderGeometry(BUN_RADIUS * 0.92, BUN_RADIUS * 0.86, BUN_HEIGHT * 0.3, 16),
      CRUMB,
    );
    base.position.y = BUN_HEIGHT * 0.15;
    bun.add(base);
    bun.add(this.dome());
    return bun;
  }

  /** Die Haube — eine gedrückte Kugel mit dem Fuß auf y = 0. */
  private dome(): THREE.Object3D {
    const dome = this.mesh('bun-dome', () => new THREE.SphereGeometry(BUN_RADIUS, 16, 10), CRUST);
    dome.scale.set(1, BUN_SQUASH, 1);
    dome.position.y = BUN_HEIGHT / 2;
    return dome;
  }

  /** Das Patty — roh hell und dick, gebraten dunkel und flacher. */
  private patty(cooked: boolean): THREE.Object3D {
    const height = cooked ? 0.075 : 0.09;
    const patty = this.mesh(
      cooked ? 'patty-done' : 'patty-raw',
      () => new THREE.CylinderGeometry(BUN_RADIUS * 0.82, BUN_RADIUS * 0.78, height, 18),
      cooked ? DONE : RAW,
    );
    patty.position.y = height / 2;
    const group = new THREE.Group();
    group.name = cooked ? 'kitchen-patty-cooked' : 'kitchen-patty';
    group.add(patty);
    return group;
  }

  /** Der Salatkopf — eine Kugel, oben etwas gedrückt. */
  private lettuce(): THREE.Object3D {
    const head = this.mesh('lettuce-head', () => new THREE.SphereGeometry(0.22, 14, 10), LEAF);
    head.scale.set(1, 0.86, 1);
    head.position.y = 0.22 * 0.86;
    const group = new THREE.Group();
    group.name = 'kitchen-lettuce';
    group.add(head);
    return group;
  }

  /** Die Tomate — Kugel und Strunk, damit sie kein roter Ball ist. */
  private tomato(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-tomato';
    const body = this.mesh('tomato-body', () => new THREE.SphereGeometry(0.19, 14, 10), TOMATO);
    body.scale.set(1, 0.9, 1);
    body.position.y = 0.19 * 0.9;
    group.add(body);
    const stalk = this.mesh(
      'tomato-stalk',
      () => new THREE.CylinderGeometry(0.03, 0.045, 0.06, 8),
      STALK,
    );
    stalk.position.y = 0.19 * 1.8 - 0.01;
    group.add(stalk);
    return group;
  }

  /**
   * **Geschnitten**: drei Scheiben übereinander, jede ein Stück versetzt.
   *
   * Versetzt und nicht gestapelt, weil ein bündiger Stapel aus drei Zylindern
   * von oben wie **einer** aussieht — und dann sieht man dem Brett nicht an,
   * dass dort gearbeitet wurde.
   */
  private slices(
    name: string,
    dark: number,
    pale: number,
    radius: number,
    thick: number,
  ): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `kitchen-${name}`;
    // **Der Schlüssel trägt die Maße mit.** Dieselben Scheiben gibt es zweimal
    // — einmal als Häufchen auf dem Brett und einmal flacher im Burger —, und
    // ein Schlüssel ohne die Maße gäbe der zweiten die Form der ersten.
    const key = `${name}-slice-${radius}-${thick}`;
    for (let i = 0; i < 3; i++) {
      const slice = this.mesh(
        key,
        () => new THREE.CylinderGeometry(radius, radius, thick, 16),
        i === 1 ? pale : dark,
      );
      slice.position.set(i * 0.02 - 0.02, thick / 2 + i * thick, i * 0.015 - 0.015);
      slice.rotation.y = i * 0.6;
      group.add(slice);
    }
    return group;
  }

  /** Der Teller — eine flache Schale, unten enger als oben. */
  private plate(): THREE.Object3D {
    const group = new THREE.Group();
    group.name = 'kitchen-plate';
    const dish = this.mesh(
      'plate-dish',
      () => new THREE.CylinderGeometry(PLATE_RADIUS, PLATE_RADIUS * 0.7, PLATE_HEIGHT, 24),
      CHINA,
    );
    dish.position.y = PLATE_HEIGHT / 2;
    group.add(dish);
    return group;
  }

  /** Eine Schicht des Burgers — dieselben Teile, nur flacher gelegt. */
  private layer(part: BurgerPart): THREE.Object3D {
    switch (part) {
      case 'patty-cooked':
        return this.patty(true);
      case 'lettuce-cut':
        return this.slices('lettuce-cut', LEAF, LEAF_PALE, BUN_RADIUS * 0.9, 0.018);
      case 'tomato-cut':
        return this.slices('tomato-cut', TOMATO, TOMATO_PALE, BUN_RADIUS * 0.75, 0.022);
      case 'bun':
        return this.dome();
    }
  }

  // --- geteilte Formen und Farben -------------------------------------------

  private mesh(key: string, make: () => THREE.BufferGeometry, color: number): THREE.Mesh {
    let shape = this.shapes.get(key);
    if (!shape) {
      shape = make();
      this.shapes.set(key, shape);
    }
    const mesh = new THREE.Mesh(shape, this.material(color));
    mesh.castShadow = true;
    return mesh;
  }

  private material(color: number): THREE.MeshStandardMaterial {
    let material = this.materials.get(color);
    if (!material) {
      material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
      this.materials.set(color, material);
    }
    return material;
  }
}

/** Wie hoch eine Schicht aufträgt — dieselben Zahlen wie in `FoodKit.layer`. */
function layerHeight(part: BurgerPart): number {
  switch (part) {
    case 'patty-cooked':
      return 0.075;
    case 'lettuce-cut':
      return 0.054;
    case 'tomato-cut':
      return 0.066;
    case 'bun':
      return BUN_HEIGHT;
  }
}

/** Wie hoch ein gebautes Ding ist — gemessen und nicht je Ding aufgeschrieben. */
export function heightOf(object: THREE.Object3D): number {
  const box = new THREE.Box3().setFromObject(object);
  return Math.max(box.max.y - box.min.y, 0.01);
}
