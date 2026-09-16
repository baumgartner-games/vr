import * as THREE from 'three';
import { PAN_BOWL } from '../../../core/kitchenFit';
import { ITEM_LABELS, dish, layered, type Dish, type KitchenItem } from './kitchenRecipes';
import {
  BUN_BASE,
  BUN_HEIGHT,
  DIRTY_STACK_MAX,
  FoodKit,
  ITEM_HEIGHT,
  PLATE_HEIGHT,
  STACK_NAME,
  stackHeight,
} from './kitchenProps';

/**
 * **Was am Zutatensatz ohne Grafikkarte zu prüfen ist** — und das ist genau
 * das, woran eine Küche auffällt: dass ein Gericht **so hoch ist, wie es
 * behauptet**.
 *
 * Die Zone stapelt mit `height()`: Sie legt einen Teller ab, setzt den Burger
 * darauf und den Hinweis darüber. Stimmt die Zahl nicht mit dem Netz überein,
 * steckt das Patty im Porzellan oder schwebt darüber — und beides sieht man
 * erst im Headset, nach einer Viertelstunde Hin- und Herlaufen. Ein `Box3`
 * sieht es in Millisekunden.
 *
 * three.js läuft in Jest, nur WebGL nicht (`core/avatarBody.test.ts`): Formen,
 * Matrizen und Hüllen sind reine Rechnung, gerendert wird hier nichts.
 */

const ALL_ITEMS = Object.keys(ITEM_LABELS) as KitchenItem[];

/** Die Hülle eines gebauten Dings, in seinem eigenen Raum. */
function span(object: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(object);
}

/** Die Hülle einer einzelnen Schicht im Stapel, an ihrem Namen gefunden. */
function layerSpan(view: THREE.Object3D, name: string): THREE.Box3 {
  const layer = view.getObjectByName(name);
  expect(layer).toBeDefined();
  return span(layer!);
}

/** Wie die Schicht einer Zutat im Stapel heißt. */
function layerName(item: KitchenItem): string {
  return item === 'bun' ? 'kitchen-bun-base' : `kitchen-${item}`;
}

describe('FoodKit.view', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('baut jede Zutat mit dem Fuß auf dem Ursprung und der Mitte auf x/z = 0', () => {
    for (const item of ALL_ITEMS) {
      const view = kit.view(dish(item));
      if (item === 'pot' || item === 'pan' || item === 'extinguisher') {
        // Sie kommen aus dem Möbelmodell (`core/kitchenModel.takeUtensil`).
        expect(view).toBeNull();
        continue;
      }
      expect(view).not.toBeNull();
      const box = span(view!);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(ITEM_HEIGHT[item], 5);
      const centre = box.getCenter(new THREE.Vector3());
      expect(centre.x).toBeCloseTo(0, 5);
      expect(centre.z).toBeCloseTo(0, 5);
    }
  });

  it('hält für jede Zutat die versprochene Höhe ein', () => {
    for (const item of ALL_ITEMS) {
      const view = kit.view(dish(item));
      if (!view) continue;
      expect(kit.height(dish(item))).toBeCloseTo(span(view).max.y, 5);
    }
  });

  it('gibt ein Brötchen ohne Belag als ganzes Brötchen', () => {
    const view = kit.view(dish('bun'))!;
    expect(span(view).max.y).toBeCloseTo(BUN_HEIGHT, 5);
    // Kein Boden unter einem Belag — es ist gar nicht aufgeschnitten.
    expect(view.getObjectByName('kitchen-bun-base')).toBeUndefined();
    expect(view.getObjectByName('kitchen-bun')).toBeDefined();
  });

  it('baut das belegte Brötchen aus Boden, Belag und Haube', () => {
    const d = dish('bun', ['patty-cooked', 'lettuce-cut']);
    const view = kit.view(d)!;
    const box = span(view);
    expect(box.min.y).toBeCloseTo(0, 5);
    expect(box.max.y).toBeCloseTo(kit.height(d), 5);
    expect(box.max.y).toBeCloseTo(
      BUN_BASE + ITEM_HEIGHT['patty-cooked'] + ITEM_HEIGHT['lettuce-cut'] + BUN_HEIGHT,
      5,
    );
    expect(layerSpan(view, 'kitchen-bun-base').min.y).toBeCloseTo(0, 5);
    expect(layerSpan(view, 'kitchen-bun-top').max.y).toBeCloseTo(box.max.y, 5);
  });

  it('legt die Schichten lückenlos aufeinander, egal in welcher Reihenfolge gelegt wurde', () => {
    const on: KitchenItem[] = ['tomato-soup', 'patty-cooked', 'tomato-cut', 'lettuce-cut'];
    for (const order of [on, [...on].reverse()]) {
      const view = kit.view(dish('bun', order))!;
      let top = 0;
      for (const item of layered(['bun', ...order])) {
        const box = layerSpan(view, layerName(item));
        // Jede Schicht sitzt genau auf der vorigen: kein Spalt, keine
        // Überschneidung — sonst fällt der Burger in sich zusammen.
        expect(box.min.y).toBeCloseTo(top, 5);
        top = box.max.y;
      }
      // Und ganz oben die Haube, bündig mit dem versprochenen Maß.
      const dome = layerSpan(view, 'kitchen-bun-top');
      expect(dome.min.y).toBeCloseTo(top, 5);
      expect(dome.max.y).toBeCloseTo(span(view).max.y, 5);
    }
  });

  it('setzt das Patty unter den Salat und den Salat unter die Tomate', () => {
    const view = kit.view(dish('bun', ['tomato-cut', 'lettuce-cut', 'patty-cooked']))!;
    const patty = layerSpan(view, 'kitchen-patty-cooked').max.y;
    const leaf = layerSpan(view, 'kitchen-lettuce-cut').max.y;
    const tomato = layerSpan(view, 'kitchen-tomato-cut').max.y;
    expect(patty).toBeLessThan(leaf);
    expect(leaf).toBeLessThan(tomato);
  });
});

describe('FoodKit.view auf dem Teller', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('stellt das Gericht auf den Tellerrand', () => {
    const d = dish('plate', ['bun', 'patty-cooked']);
    const view = kit.view(d)!;
    const stack = view.getObjectByName(STACK_NAME);
    expect(stack).toBeDefined();
    expect(span(stack!).min.y).toBeCloseTo(PLATE_HEIGHT, 5);
    expect(span(view).max.y).toBeCloseTo(kit.height(d), 5);
  });

  it('steckt alles Übrige ins Brötchen und legt es nicht daneben', () => {
    const d = dish('plate', ['bun', 'patty-cooked', 'tomato-cut']);
    const view = kit.view(d)!;
    // Ein Patty **neben** dem Burger läge auf dem Teller — es liegt aber im
    // Brötchen, also über dem Boden und unter der Haube.
    const patty = layerSpan(view, 'kitchen-patty-cooked');
    expect(patty.min.y).toBeGreaterThan(layerSpan(view, 'kitchen-bun-base').min.y);
    expect(patty.max.y).toBeLessThan(layerSpan(view, 'kitchen-bun-top').max.y);
    expect(kit.height(d)).toBeCloseTo(
      PLATE_HEIGHT +
        BUN_BASE +
        ITEM_HEIGHT['patty-cooked'] +
        ITEM_HEIGHT['tomato-cut'] +
        BUN_HEIGHT,
      5,
    );
  });

  it('legt ein Gericht ohne Brötchen flach auf den Teller', () => {
    const d = dish('plate', ['lettuce-cut', 'tomato-cut']);
    const view = kit.view(d)!;
    expect(view.getObjectByName('kitchen-bun-top')).toBeUndefined();
    expect(span(view).max.y).toBeCloseTo(kit.height(d), 5);
    expect(kit.height(d)).toBeCloseTo(
      PLATE_HEIGHT + ITEM_HEIGHT['lettuce-cut'] + ITEM_HEIGHT['tomato-cut'],
      5,
    );
  });

  it('gibt den leeren Teller mit seiner eigenen Höhe', () => {
    expect(kit.height(dish('plate'))).toBeCloseTo(PLATE_HEIGHT, 5);
    expect(span(kit.view(dish('plate'))!).max.y).toBeCloseTo(PLATE_HEIGHT, 5);
  });
});

describe('FoodKit.topping', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('gibt das Patty für die geladene Pfanne, auf der angegebenen Höhe', () => {
    const d = dish('pan', ['patty']);
    expect(kit.view(d)).toBeNull();
    const lift = 0.08;
    const top = kit.topping(d, lift)!;
    expect(top).not.toBeNull();
    expect(top.name).toBe(STACK_NAME);
    const box = span(top);
    expect(box.min.y).toBeCloseTo(lift, 5);
    expect(box.max.y).toBeCloseTo(lift + ITEM_HEIGHT.patty, 5);
    // Die Höhe eines Geräts ist die seines Belags: Das Gerät selbst baut
    // dieser Satz nicht.
    expect(kit.height(d)).toBeCloseTo(ITEM_HEIGHT.patty, 5);
  });

  it('gibt nichts, wo nichts daraufliegt', () => {
    for (const d of [dish('pan'), dish('pot'), dish('plate'), dish('tomato')]) {
      expect(kit.topping(d, 0.1)).toBeNull();
      expect(kit.height(dish(d.item))).toBeCloseTo(ITEM_HEIGHT[d.item], 5);
    }
  });

  it('baut denselben Stapel wie auf dem eigenen Teller', () => {
    const d: Dish = dish('plate', ['bun', 'patty-cooked']);
    const loose = kit.topping(d, 0)!;
    expect(span(loose).max.y).toBeCloseTo(kit.height(d) - PLATE_HEIGHT, 5);
  });

  /**
   * **Das Patty liegt in der Mulde und nicht auf dem Stiel.**
   *
   * Der Ursprung der abgenommenen Pfanne sitzt in der Mitte ihrer **ganzen**
   * Hülle, und dazu gehört der Griff (`core/kitchenModel.takeUtensil`) — der
   * Belag muss deshalb um `kitchenFit.PAN_BOWL` zurückrücken. Dort steht auch
   * die Rechnung; hier steht nur, dass es einzig die Pfanne betrifft.
   */
  it('rückt den Belag der Pfanne in die Mulde', () => {
    const top = kit.topping(dish('pan', ['patty']), 0.04)!;
    expect(top.position.x).toBeCloseTo(PAN_BOWL[0], 6);
    expect(top.position.z).toBeCloseTo(PAN_BOWL[1], 6);
    expect(top.position.y).toBeCloseTo(0.04, 6);
    // Und der Versatz steckt wirklich im Netz und nicht nur in der Gruppe.
    const box = span(top);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(PAN_BOWL[1], 5);
  });

  it('lässt jeden anderen Träger auf seiner Mitte', () => {
    for (const d of [dish('plate', ['bun']), dish('bun', ['patty-cooked'])]) {
      const top = kit.topping(d, 0)!;
      expect(top.position.x).toBeCloseTo(0, 6);
      expect(top.position.z).toBeCloseTo(0, 6);
    }
  });
});

/**
 * **Der dreckige Teller** — dieselbe Scheibe, anderer Anblick.
 *
 * Zwei Sachen daran sind Rechnung und nicht Geschmack, und beide stehen
 * deshalb hier: Er ist **genau so hoch** wie der saubere (sonst rechnet kein
 * Stapel), und er **bleibt in seiner Scheibe** (sonst wandert die Mitte des
 * Dings aus x/z = 0, und die Zone legt ihn versetzt ab).
 */
describe('der dreckige Teller', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('ist genau so hoch wie der saubere', () => {
    expect(ITEM_HEIGHT['plate-dirty']).toBe(ITEM_HEIGHT.plate);
    const view = kit.view(dish('plate-dirty'))!;
    expect(span(view).max.y).toBeCloseTo(PLATE_HEIGHT, 5);
    expect(kit.height(dish('plate-dirty'))).toBeCloseTo(PLATE_HEIGHT, 5);
  });

  it('bleibt mit Krümeln und Fleck innerhalb der Scheibe', () => {
    const clean = span(kit.view(dish('plate'))!);
    const dirty = span(kit.view(dish('plate-dirty'))!);
    for (const axis of ['x', 'z'] as const) {
      expect(dirty.min[axis]).toBeCloseTo(clean.min[axis], 5);
      expect(dirty.max[axis]).toBeCloseTo(clean.max[axis], 5);
    }
  });

  /**
   * **Von oben muss man ihn sehen**, und die Hauptansicht zeigt fast nur die
   * Deckfläche: Der Unterschied darf also nicht nur im Ton liegen. Geprüft
   * wird, was sich ohne Grafikkarte prüfen lässt — dass mehr auf der Scheibe
   * liegt als beim sauberen Teller, und dass das Porzellan ein anderes
   * Material bekommt.
   */
  it('trägt Reste auf der Scheibe und ein anderes Porzellan', () => {
    const clean = meshesOf(kit.view(dish('plate'))!);
    const dirty = meshesOf(kit.view(dish('plate-dirty'))!);
    expect(clean).toHaveLength(1);
    expect(dirty.length).toBeGreaterThan(clean.length);
    // Dieselbe Form, geteilt wie überall in dieser Datei — nur gestaucht.
    expect(dirty[0]!.geometry).toBe(clean[0]!.geometry);
    expect(dirty[0]!.material).not.toBe(clean[0]!.material);
    // Und was darauf liegt, liegt wirklich darauf und nicht darin.
    for (const scrap of dirty.slice(1)) {
      const box = span(scrap);
      expect(box.max.y).toBeLessThanOrEqual(PLATE_HEIGHT + 1e-9);
      expect(box.min.y).toBeGreaterThan(0);
    }
  });
});

describe('FoodKit.dirtyStack', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('stapelt so hoch, wie die Teller zusammen sind', () => {
    for (const count of [1, 2, 3, 6]) {
      const stack = kit.dirtyStack(count);
      expect(stack.children).toHaveLength(count);
      const box = span(stack);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(count * PLATE_HEIGHT, 5);
    }
  });

  /** Kein leerer Sockel und kein Turm — 1 bis `DIRTY_STACK_MAX`. */
  it('klemmt die Zahl an beiden Enden', () => {
    expect(DIRTY_STACK_MAX).toBe(6);
    for (const count of [0, -4, 0.2, Number.NaN]) {
      expect(kit.dirtyStack(count).children).toHaveLength(1);
    }
    for (const count of [7, 40, Number.POSITIVE_INFINITY]) {
      expect(kit.dirtyStack(count).children).toHaveLength(DIRTY_STACK_MAX);
    }
  });

  /**
   * **Ein Stapel aus fluchtenden Zylindern ist von oben ein Teller.** Jeder
   * liegt deshalb gedreht auf dem vorigen, und keine Drehung wiederholt sich
   * innerhalb eines vollen Stapels.
   */
  it('verdreht jeden Teller gegen den vorigen', () => {
    const stack = kit.dirtyStack(DIRTY_STACK_MAX);
    const turns = stack.children.map((plate) => plate.rotation.y);
    expect(turns[0]).toBeCloseTo(0, 5);
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]! - turns[i - 1]!).toBeCloseTo(turns[1]! - turns[0]!, 5);
      // Ein paar Grad, nicht ein Viertel: Es soll ein Stapel bleiben.
      expect(turns[i]! - turns[i - 1]!).toBeGreaterThan(0.05);
      expect(turns[i]! - turns[i - 1]!).toBeLessThan(Math.PI / 8);
    }
    // Der Teller ist ein 24-Eck (15° je Seite) — bei genau 15° deckte sich
    // jede Kante wieder mit der darunter.
    expect(turns[1]! - turns[0]!).not.toBeCloseTo(Math.PI / 12, 3);
    // Und jeder Teller sitzt auf der Oberkante des vorigen.
    for (let i = 0; i < stack.children.length; i++) {
      expect(stack.children[i]!.position.y).toBeCloseTo(i * PLATE_HEIGHT, 5);
    }
  });

  it('teilt Form und Farbe zwischen allen Tellern eines Stapels', () => {
    const stack = kit.dirtyStack(4);
    const meshes = stack.children.map((plate) => meshesOf(plate));
    for (const plate of meshes.slice(1)) {
      expect(plate).toHaveLength(meshes[0]!.length);
      for (let i = 0; i < plate.length; i++) {
        expect(plate[i]!.geometry).toBe(meshes[0]![i]!.geometry);
        expect(plate[i]!.material).toBe(meshes[0]![i]!.material);
      }
    }
  });
});

describe('stackHeight', () => {
  it('rechnet den Stapel so, wie er gebaut wird', () => {
    const kit = new FoodKit();
    const stacks: KitchenItem[][] = [
      [],
      ['bun'],
      ['patty-cooked'],
      ['bun', 'patty-cooked'],
      ['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'],
      ['bun', 'patty-burnt', 'tomato-soup'],
      ['lettuce-cut', 'tomato-soup'],
    ];
    for (const items of stacks) {
      const top = kit.topping(dish('plate', items), 0);
      expect(stackHeight(items)).toBeCloseTo(top ? span(top).max.y : 0, 5);
    }
    kit.dispose();
  });

  it('macht aus einem Brötchen ohne Belag kein aufgeschnittenes', () => {
    expect(stackHeight(['bun'])).toBeCloseTo(BUN_HEIGHT, 5);
    expect(stackHeight(['bun', 'patty-cooked'])).toBeGreaterThan(BUN_HEIGHT);
  });
});

describe('der geteilte Satz', () => {
  /**
   * Zehn Minuten Brötchen nehmen und wegwerfen darf keine zwanzig Materialien
   * hinterlassen — Formen und Farben hängen an **einem** Satz.
   */
  it('teilt Geometrie und Material zwischen zwei gleichen Dingen', () => {
    const kit = new FoodKit();
    const first = meshesOf(kit.view(dish('bun', ['patty-cooked']))!);
    const second = meshesOf(kit.view(dish('bun', ['patty-cooked']))!);
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.geometry).toBe(second[i]!.geometry);
      expect(first[i]!.material).toBe(second[i]!.material);
    }
    kit.dispose();
  });

  it('gibt nach dem Wegräumen nichts Weggeräumtes mehr aus', () => {
    const kit = new FoodKit();
    const before = meshesOf(kit.view(dish('tomato'))!);
    kit.dispose();
    const after = meshesOf(kit.view(dish('tomato'))!);
    // Der Satz ist leer, also baut er neu — und reicht keine freigegebene
    // Geometrie weiter.
    expect(after[0]!.geometry).not.toBe(before[0]!.geometry);
    kit.dispose();
  });
});

/** Alle Netze eines Dings, in der Reihenfolge, in der sie hängen. */
function meshesOf(object: THREE.Object3D): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) found.push(child as THREE.Mesh);
  });
  return found;
}
