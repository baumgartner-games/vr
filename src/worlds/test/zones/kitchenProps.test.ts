import * as THREE from 'three';
import { PAN_BOWL, POT_BOWL, SINK_BOWL } from '../../../core/kitchenFit';
import { dinerHeight, dinerPiece } from '../../../core/dinerFit';
import { CLEAN_STACK_MAX } from './kitchenCarry';
import { ITEM_LABELS, dish, type Dish, type KitchenItem } from './kitchenRecipes';
import {
  BUN_BASE,
  BUN_DOME,
  BUN_HEIGHT,
  DIRTY_STACK_MAX,
  FOOD_NODE,
  FoodKit,
  ITEM_HEIGHT,
  PLATE_HEIGHT,
  PLATE_RADIUS,
  SINK_TILT,
  STACK_NAME,
  WATER_LOOK,
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
 *
 * **Und seit die acht Zutaten Netze sind, ist diese Suite zweigeteilt.**
 * Brötchen, Patty, Salat und Tomate kommen aus `public/models/diner.glb`
 * (`kitchenProps.FOOD_NODE`), und die Datei lädt hier niemand: `GLTFLoader`
 * braucht `import.meta`, und `FoodKit.warm` macht ohne WebGL gar nichts erst.
 * Geprüft wird an ihnen deshalb die **Kette** — dass es den Knoten gibt, dass
 * seine Höhe in `ITEM_HEIGHT` steht und dass die Küche damit richtig rechnet.
 * Das ist dieselbe Trennung, die der Möbelkatalog schon hat
 * (`core/kitchenFit.test.ts`): Was aus einer Datei kommt, wird gegen den
 * nachgemessenen Katalog geprüft und nicht gegen abgeschriebene Zahlen.
 *
 * Mit **Geometrie** geprüft wird, was gebaut geblieben ist: Teller, dreckiger
 * Teller, Tomatensuppe, Wasser — und daran hängt alles Übrige, denn der Stapel,
 * die Hüllen und die Höhen sind dieselbe Rechnung für beide Hälften.
 */

const ALL_ITEMS = Object.keys(ITEM_LABELS) as KitchenItem[];

/** Was aus dem Möbelnetz kommt und dieser Satz gar nicht hergibt. */
const FROM_MODEL: readonly KitchenItem[] = ['pot', 'pan', 'extinguisher'];

/** Was aus `diner.glb` kommt — ohne geladene Datei also nicht zu sehen. */
const LOADED = Object.keys(FOOD_NODE) as KitchenItem[];

/** Und was dieser Satz weiterhin selbst baut: die vier ohne fremdes Netz. */
const BUILT = ALL_ITEMS.filter((item) => !FROM_MODEL.includes(item) && !LOADED.includes(item));

/** Die Hülle eines gebauten Dings, in seinem eigenen Raum. */
function span(object: THREE.Object3D): THREE.Box3 {
  return new THREE.Box3().setFromObject(object);
}

describe('FoodKit.view', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  it('baut jede gebaute Zutat mit dem Fuß auf dem Ursprung und der Mitte auf x/z = 0', () => {
    for (const item of BUILT) {
      const view = kit.view(dish(item));
      expect({ item, built: view !== null }).toEqual({ item, built: true });
      const box = span(view!);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(ITEM_HEIGHT[item], 5);
      const centre = box.getCenter(new THREE.Vector3());
      expect(centre.x).toBeCloseTo(0, 5);
      expect(centre.z).toBeCloseTo(0, 5);
    }
  });

  /**
   * **Ohne Datei kein Netz, und zwar sichtbar als `null`.**
   *
   * Das ist derselbe Ausgang wie bei Topf, Pfanne und Feuerlöscher, und der
   * Aufrufer kennt ihn: Er stellt dann nichts hin und meldet nichts
   * (`zones/kitchen.make`). Eine **leere Gruppe** wäre hier das Schlechtere —
   * sie würde abgelegt, vermessen und bekäme Griffe von null Zentimetern.
   *
   * Im Spiel gibt es diesen Zustand nur zwischen Zonenstart und `warm()`, und
   * die Zone schließt ihn selbst: Sie wartet auf die Zutaten, bevor sie das
   * erste Möbel hinstellt.
   */
  it('gibt ohne geladene Datei nichts heraus, was aus ihr kommt', () => {
    for (const item of [...FROM_MODEL, ...LOADED]) {
      expect({ item, view: kit.view(dish(item)) }).toEqual({ item, view: null });
    }
    // Auch der Stapel: ein Burger ohne ein einziges Netz ist kein Burger.
    expect(kit.view(dish('bun', ['patty-cooked']))).toBeNull();
    expect(kit.topping(dish('pan', ['patty']), 0.08)).toBeNull();
  });

  it('hält für jede gebaute Zutat die versprochene Höhe ein', () => {
    for (const item of BUILT) {
      const view = kit.view(dish(item))!;
      expect(kit.height(dish(item))).toBeCloseTo(span(view).max.y, 5);
    }
  });

  /**
   * **Die Höhe einer geladenen Zutat ist die ihres Knotens** — nachgemessen im
   * Katalog der Quelle und nicht hier abgeschrieben.
   *
   * Das ist die eine Zusage, an der in Jest alles hängt: Die Küche stapelt mit
   * `ITEM_HEIGHT` (`pile`, `stackHeight`, `zones/kitchen.ts`), und das Netz ist
   * genau so hoch, weil `onFoot` es auf seine gemessene Unterkante stellt.
   * Stünde hier eine Zahl von Hand, wäre sie die, die beim nächsten Austausch
   * der Quelle stehen bliebe — und dann steckte das Patty im Brötchen.
   *
   * `dinerHeight` und nicht `piece.height`: Salatkopf und Salatscheibe liegen
   * ein Stück **unter** ihrem Ursprung.
   */
  it('nimmt die Höhe jeder geladenen Zutat aus dem Katalog der Quelle', () => {
    for (const item of LOADED) {
      const node = FOOD_NODE[item as keyof typeof FOOD_NODE];
      const piece = dinerPiece(node);
      // Erst: Den Knoten gibt es. Ein Tippfehler hier wäre sonst eine Zutat
      // von null Metern, die lautlos in jedem Burger fehlt.
      expect({ item, node: piece?.name }).toEqual({ item, node });
      expect({ item, high: ITEM_HEIGHT[item].toFixed(6) }).toEqual({
        item,
        high: dinerHeight(piece!).toFixed(6),
      });
      // Und keine davon ist null: Eine Zutat ohne Höhe stapelt sich in sich
      // selbst hinein.
      expect(ITEM_HEIGHT[item]).toBeGreaterThan(0.02);
    }
  });

  /**
   * **Boden und Deckel ergeben zusammen das ganze Brötchen** — auf den
   * Zehntelmillimeter.
   *
   * Drei Knoten für ein Brötchen (`bun`, `bun_bottom`, `bun_top`), und diese
   * Gleichung ist der Grund, warum man sie nebeneinander benutzen darf: Ein
   * aufgeschnittenes Brötchen ohne Belag ist genauso hoch wie ein ganzes, also
   * wächst ein Burger um **genau** das, was man hineinlegt, und um nichts
   * sonst. Ginge sie nicht auf, spränge jeder Burger beim ersten Belegen um
   * die Differenz.
   */
  it('teilt das Brötchen ohne Rest in Boden und Deckel', () => {
    expect(BUN_BASE + BUN_DOME).toBeCloseTo(BUN_HEIGHT, 6);
    expect(BUN_BASE).toBeGreaterThan(0.05);
    expect(BUN_DOME).toBeGreaterThan(BUN_BASE);
    // Und der Boden ist wirklich der Boden: Ein Deckel unter dem Fleisch wäre
    // ein Stapel und kein Burger.
    expect(stackHeight(['bun'])).toBeCloseTo(BUN_HEIGHT, 6);
    expect(stackHeight(['bun', 'patty-cooked'])).toBeCloseTo(
      BUN_HEIGHT + ITEM_HEIGHT['patty-cooked'],
      6,
    );
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

  /**
   * Geprüft wird das mit der **Tomatensuppe**, und das ist kein Zufall: Sie ist
   * seit dem Umbau die einzige Burgerzutat, die dieser Satz noch selbst baut
   * (`kitchenProps.ts`, der Kopf sagt warum), und damit die einzige, die ohne
   * geladene Datei ein Netz hat. Was hier geprüft wird, ist ohnehin die
   * **Rechnung** und nicht das Gemüse: Der Stapel sitzt auf dem Tellerrand, und
   * das Ganze ist so hoch, wie `height` sagt.
   */
  it('stellt das Gericht auf den Tellerrand', () => {
    const d = dish('plate', ['tomato-soup']);
    const view = kit.view(d)!;
    const stack = view.getObjectByName(STACK_NAME);
    expect(stack).toBeDefined();
    expect(span(stack!).min.y).toBeCloseTo(PLATE_HEIGHT, 5);
    expect(span(view).max.y).toBeCloseTo(kit.height(d), 5);
  });

  /**
   * **Alles Übrige steckt im Brötchen und liegt nicht daneben** — nachgerechnet
   * und nicht nachgemessen.
   *
   * Ein Patty **neben** dem Burger läge auf dem Porzellan, und der Teller wäre
   * dann so hoch wie sein höchstes Ding statt so hoch wie sein Turm. Am Netz
   * ließe sich das ohne geladene Datei nicht mehr zeigen; an der Zahl schon,
   * und sie ist dieselbe: `height` addiert Teller, Brötchenboden, **jede**
   * Zutat und den Deckel — wer eine danebenlegte, könnte sie nicht mitzählen.
   */
  it('steckt alles Übrige ins Brötchen und legt es nicht daneben', () => {
    const d = dish('plate', ['bun', 'patty-cooked', 'tomato-cut']);
    expect(kit.height(d)).toBeCloseTo(
      PLATE_HEIGHT + BUN_BASE + ITEM_HEIGHT['patty-cooked'] + ITEM_HEIGHT['tomato-cut'] + BUN_DOME,
      5,
    );
    // Und ohne Brötchen liegen sie flach nebeneinander auf dem Teller — dann
    // fehlen Boden und Deckel in der Summe.
    expect(kit.height(dish('plate', ['patty-cooked', 'tomato-cut']))).toBeCloseTo(
      PLATE_HEIGHT + ITEM_HEIGHT['patty-cooked'] + ITEM_HEIGHT['tomato-cut'],
      5,
    );
  });

  it('legt ein Gericht ohne Brötchen flach auf den Teller', () => {
    const d = dish('plate', ['tomato-soup']);
    const view = kit.view(d)!;
    expect(view.getObjectByName('kitchen-bun-top')).toBeUndefined();
    expect(span(view).max.y).toBeCloseTo(kit.height(d), 5);
    expect(kit.height(d)).toBeCloseTo(PLATE_HEIGHT + ITEM_HEIGHT['tomato-soup'], 5);
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

  /**
   * Gezeigt am **Wasser** im Topf statt am Patty in der Pfanne: Beides ist
   * derselbe eine Weg — ein Belag, der in ein geladenes Gefäß gehängt wird —,
   * und das Wasser ist das, was dieser Satz noch selbst baut. Die Zahl, an der
   * es hängt, ist `lift`, und die kommt vom Gefäß.
   */
  it('gibt den Belag für ein geladenes Gefäß, auf der angegebenen Höhe', () => {
    const d = dish('pot', ['water']);
    expect(kit.view(d)).toBeNull();
    const lift = 0.08;
    const top = kit.topping(d, lift)!;
    expect(top).not.toBeNull();
    expect(top.name).toBe(STACK_NAME);
    const box = span(top);
    expect(box.min.y).toBeCloseTo(lift, 5);
    expect(box.max.y).toBeCloseTo(lift + ITEM_HEIGHT.water, 5);
    // Die Höhe eines Geräts ist die seines Belags: Das Gerät selbst baut
    // dieser Satz nicht.
    expect(kit.height(d)).toBeCloseTo(ITEM_HEIGHT.water, 5);
    // Und die eines Pattys ist es auch — nur sein Netz kommt aus der Datei.
    expect(kit.height(dish('pan', ['patty']))).toBeCloseTo(ITEM_HEIGHT.patty, 5);
  });

  it('gibt nichts, wo nichts daraufliegt', () => {
    for (const d of [dish('pan'), dish('pot'), dish('plate'), dish('tomato-soup')]) {
      expect(kit.topping(d, 0.1)).toBeNull();
      expect(kit.height(dish(d.item))).toBeCloseTo(ITEM_HEIGHT[d.item], 5);
    }
  });

  it('baut denselben Stapel wie auf dem eigenen Teller', () => {
    const d: Dish = dish('plate', ['tomato-soup']);
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
    const top = kit.topping(dish('pan', ['tomato-soup']), 0.04)!;
    expect(top.position.x).toBeCloseTo(PAN_BOWL[0], 6);
    expect(top.position.z).toBeCloseTo(PAN_BOWL[1], 6);
    expect(top.position.y).toBeCloseTo(0.04, 6);
    // Und der Versatz steckt wirklich im Netz und nicht nur in der Gruppe.
    const box = span(top);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(PAN_BOWL[1], 5);
  });

  it('lässt jeden anderen Träger auf seiner Mitte', () => {
    for (const d of [dish('plate', ['tomato-soup']), dish('pot', ['water'])]) {
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

  /**
   * **Und derselbe Turm aus sauberen Tellern** — der auf dem Abtropfbrett
   * (`core/kitchenFit.ts`, `sink-drain`). Aus dem Spieltest: „Man kann saubere
   * Teller (bis zu 4) auf dem Abtropf-Element sammeln."
   *
   * Geprüft wird vor allem, dass es **derselbe** Stapel ist: gleiche Lagenhöhe,
   * gleicher Verdrehwinkel, nur ein anderer Teller und eine andere Grenze. Zwei
   * Fassungen davon wären zwei Stellen, an denen `DIRTY_TWIST` nachzuziehen ist.
   */
  it('stapelt saubere Teller genauso, nur bis vier', () => {
    expect(CLEAN_STACK_MAX).toBe(4);
    for (const count of [1, 2, 4]) {
      const stack = kit.cleanStack(count);
      expect(stack.children).toHaveLength(count);
      const box = span(stack);
      expect(box.min.y).toBeCloseTo(0, 5);
      expect(box.max.y).toBeCloseTo(count * PLATE_HEIGHT, 5);
    }
    for (const count of [0, -4, Number.NaN]) {
      expect(kit.cleanStack(count).children).toHaveLength(1);
    }
    for (const count of [5, 40, Number.POSITIVE_INFINITY]) {
      expect(kit.cleanStack(count).children).toHaveLength(CLEAN_STACK_MAX);
    }
    // Dieselbe Lage, dieselbe Drehung wie beim dreckigen Stapel.
    const clean = kit.cleanStack(4).children;
    const dirty = kit.dirtyStack(4).children;
    for (let i = 0; i < clean.length; i++) {
      expect(clean[i]!.position.y).toBeCloseTo(dirty[i]!.position.y, 6);
      expect(clean[i]!.rotation.y).toBeCloseTo(dirty[i]!.rotation.y, 6);
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

/**
 * **Der Teller liegt flach in der Spüle** — und das ist seit dem Umbau keine
 * Nachlässigkeit mehr, sondern die Form der Wanne.
 *
 * Aus dem Spieltest kam einmal: „Wenn Teller gewaschen werden, sollen die
 * Teller leicht schräg sein, sodass ein Teil davon im Wasser steht." Das galt
 * für ein Becken von 14 cm Tiefe. Die Spüle des zweiten Baukastens hat keine:
 * Zwischen Wannenboden und Wannenrand liegt **kein** Höhenunterschied
 * (`core/kitchenFit.SINK_BOWL`, nachgemessen), und in einer Mulde ohne Tiefe
 * gibt es nichts, wogegen ein Teller lehnen könnte.
 *
 * Die Rechnung dahinter ist dieselbe geblieben und rechnet den Winkel von
 * selbst auf null (`SINK_TILT`). Das ist der Punkt: Wer die Quelle noch einmal
 * tauscht und wieder ein tiefes Becken bekommt, lehnt der Teller wieder, ohne
 * dass jemand eine Sonderregel entfernen muss.
 */
describe('der Teller im Spülbecken', () => {
  it('liegt flach, weil die Wanne flach ist', () => {
    expect(SINK_BOWL.rim - SINK_BOWL.floor).toBe(0);
    expect(SINK_TILT).toBe(0);
    // Und er liegt auf dem Wasserspiegel, nicht darunter: Die Ablage des
    // Beckens ist der Spiegel (`kitchenFit.sink-basin.deck`).
    expect(SINK_BOWL.water).toBeGreaterThan(SINK_BOWL.floor);
  });

  /**
   * **Er ist breiter als die Wanne, und das bleibt so.** Der Teller misst
   * 0,75 m, die Mulde 0,70 × 0,385 m — er liegt also über ihr und nicht in
   * ihr. Das ist kein Fehler des Aufbaus, sondern der Größenunterschied
   * zwischen zwei Baukästen, und es steht hier, damit niemand es für einen
   * Rechenfehler hält: Ein Teller, der halb über dem Rand liegt, sieht aus wie
   * ein Teller im Abwasch.
   */
  it('liegt über der Mulde und nicht darin', () => {
    expect(2 * PLATE_RADIUS).toBeGreaterThan(SINK_BOWL.width);
    expect(2 * PLATE_RADIUS).toBeGreaterThan(SINK_BOWL.depth);
  });
});

/**
 * **Das Wasser im Topf** — der zweite Ort, an dem es in dieser Küche Wasser
 * gibt, und er muss aussehen wie der erste.
 *
 * Geprüft wird hier die Rechnung dahinter, denn genau an ihr fällt es auf:
 * Steht der Spiegel zu hoch, läuft er über den Rand; zu tief, und man sieht aus
 * 55° von oben (`core/topDownPose.TOP_DOWN_TILT`) nichts als Blech. Beide
 * Fehler sieht ein `Box3` in Millisekunden und das Headset erst nach einer
 * Viertelstunde.
 */
describe('das Wasser im Topf', () => {
  let kit: FoodKit;
  beforeEach(() => {
    kit = new FoodKit();
  });
  afterEach(() => {
    kit.dispose();
  });

  /**
   * **Vom Innenboden bis zum Spiegel**, und das ist es, was die Zone
   * hineinhängt: Sie hebt den Belag um `POT_BOWL.floor` (`kitchen.looseRim`),
   * und die Oberkante muss danach genau auf `POT_BOWL.water` liegen.
   */
  it('steht vom Boden des Topfes bis auf Spiegelhöhe', () => {
    const top = kit.topping(dish('pot', ['water']), POT_BOWL.floor)!;
    expect(top).not.toBeNull();
    const box = span(top);
    expect(box.min.y).toBeCloseTo(POT_BOWL.floor, 5);
    expect(box.max.y).toBeCloseTo(POT_BOWL.water, 5);
    // Und das ist genau die Zahl, mit der der Satz selbst rechnet.
    expect(ITEM_HEIGHT.water).toBeCloseTo(POT_BOWL.water - POT_BOWL.floor, 6);
    expect(kit.height(dish('pot', ['water']))).toBeCloseTo(ITEM_HEIGHT.water, 6);
  });

  /**
   * **Halb voll, wie im Becken** — und der Rand steht darüber.
   *
   * Ein Topf bis zum Rand wäre beim ersten Schritt übergelaufen, ein
   * Fingerbreit Wasser wäre eine Pfütze. Die Begründung samt Sichtbarkeit aus
   * 55° steht bei `core/kitchenFit.POT_BOWL`; hier steht die Gegenprobe.
   */
  it('steht halb im Topf und nicht über seinem Rand', () => {
    expect(POT_BOWL.water).toBeCloseTo((POT_BOWL.floor + POT_BOWL.rim) / 2, 4);
    expect(POT_BOWL.water).toBeLessThan(POT_BOWL.rim);
    expect(POT_BOWL.water).toBeGreaterThan(POT_BOWL.floor);
    // Aus 55° von oben verdeckt der nähere Rand weniger als ein Viertel der
    // Scheibe: `Tiefe unter dem Rand / tan 55°` gegen den Durchmesser.
    const hidden = (POT_BOWL.rim - POT_BOWL.water) / Math.tan((55 * Math.PI) / 180);
    expect(hidden / (2 * POT_BOWL.radius)).toBeLessThan(0.25);
  });

  /**
   * **Und es bleibt innerhalb des Blechs.** Der Innenradius ist gemessen
   * (`POT_BOWL.radius`, 0,281 m gegen 0,2831 m an der engsten Stelle) — ein
   * Wasser, das durch die Wand tritt, sieht man von außen als blauen Ring um
   * den Topf.
   */
  it('bleibt in der Weite der Topföffnung', () => {
    const box = span(kit.view(dish('water'))!);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(2 * POT_BOWL.radius + 1e-6);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(2 * POT_BOWL.radius + 1e-6);
    // Achtzehn Seiten sind rund genug, um in einem runden Topf nicht als
    // Vieleck aufzufallen: Die Ecken liegen höchstens 1,6 % unter dem Radius.
    expect((box.max.x - box.min.x) / (2 * POT_BOWL.radius)).toBeGreaterThan(0.98);
  });

  /**
   * **Ein Wasser und nicht zwei.** Der Ton kommt aus `WATER_LOOK`, und
   * dasselbe `WATER_LOOK` baut die Fläche im Spülbecken
   * (`worlds/test/zones/kitchen.addWater`). Zwei Blautöne nebeneinander wären
   * zwei Flüssigkeiten.
   */
  it('trägt den Ton des Spülbeckens und ist durchsichtig', () => {
    const view = kit.view(dish('water'))!;
    let material: THREE.MeshStandardMaterial | undefined;
    view.traverse((part) => {
      if (!material && part instanceof THREE.Mesh) {
        material = part.material as THREE.MeshStandardMaterial;
      }
    });
    expect(material).toBeDefined();
    expect(material!.color.getHex()).toBe(new THREE.Color(WATER_LOOK.color).getHex());
    expect(material!.transparent).toBe(true);
    expect(material!.opacity).toBeCloseTo(WATER_LOOK.opacity, 6);
    expect(material!.roughness).toBeCloseTo(WATER_LOOK.roughness, 6);
    expect(material!.metalness).toBeCloseTo(WATER_LOOK.metalness, 6);
    // Es bleibt trotzdem ein eigenes Material und überschreibt nicht das der
    // matten Zutaten: Der Schlüssel führt die Durchsichtigkeit mit.
    const soup = kit.view(dish('tomato-soup'))!;
    let other: THREE.MeshStandardMaterial | undefined;
    soup.traverse((part) => {
      if (!other && part instanceof THREE.Mesh) other = part.material as THREE.MeshStandardMaterial;
    });
    expect(other!.transparent).toBe(false);
  });

  /**
   * **Es wirft keinen Schatten.** Ein Zylinder Wasser, der in den Topf hinein
   * einen schwarzen Körper wirft, verdunkelt genau das, was man sehen soll —
   * und der Schatten fiele ohnehin auf das Blech, das ihn verdeckt.
   */
  it('wirft keinen Schatten in den Topf', () => {
    const view = kit.view(dish('water'))!;
    view.traverse((part) => {
      if (part instanceof THREE.Mesh) expect(part.castShadow).toBe(false);
    });
  });
});

describe('stackHeight', () => {
  /**
   * **Am gebauten Belag nachgemessen** — und das geht ohne Datei nur noch mit
   * der Tomatensuppe und dem Wasser (siehe der Kopf dieser Datei). Geprüft wird
   * damit trotzdem die ganze Rechnung: `pile` rückt jede Schicht um
   * `ITEM_HEIGHT` weiter, `stackHeight` addiert dieselbe Tabelle, und was sich
   * hier deckt, deckt sich für jede Zutat.
   */
  it('rechnet den gebauten Stapel so, wie er gebaut wird', () => {
    const kit = new FoodKit();
    const stacks: KitchenItem[][] = [[], ['tomato-soup']];
    for (const items of stacks) {
      const top = kit.topping(dish('plate', items), 0);
      expect(stackHeight(items)).toBeCloseTo(top ? span(top).max.y : 0, 5);
    }
    kit.dispose();
  });

  /**
   * **Und für die geladenen Zutaten aus der Tabelle** — dieselbe Rechnung,
   * andere Quelle der Zahlen. Drei Fälle, und der mittlere ist der, den man
   * vergisst: Ohne Brötchen liegen die Scheiben einfach übereinander; ein
   * Brötchen **ohne** Belag ist gar nicht aufgeschnitten; erst ein belegtes
   * ist Boden **plus** Belag **plus** Deckel.
   */
  it('rechnet den geladenen Stapel aus der Höhentabelle', () => {
    expect(stackHeight(['patty-cooked'])).toBeCloseTo(ITEM_HEIGHT['patty-cooked'], 6);
    expect(stackHeight(['lettuce-cut', 'tomato-cut'])).toBeCloseTo(
      ITEM_HEIGHT['lettuce-cut'] + ITEM_HEIGHT['tomato-cut'],
      6,
    );
    expect(stackHeight(['bun'])).toBeCloseTo(BUN_HEIGHT, 6);
    expect(stackHeight(['bun', 'patty-cooked', 'lettuce-cut', 'tomato-cut'])).toBeCloseTo(
      BUN_BASE +
        ITEM_HEIGHT['patty-cooked'] +
        ITEM_HEIGHT['lettuce-cut'] +
        ITEM_HEIGHT['tomato-cut'] +
        BUN_DOME,
      6,
    );
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
    const first = meshesOf(kit.view(dish('plate', ['tomato-soup']))!);
    const second = meshesOf(kit.view(dish('plate', ['tomato-soup']))!);
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i]!.geometry).toBe(second[i]!.geometry);
      expect(first[i]!.material).toBe(second[i]!.material);
    }
    kit.dispose();
  });

  it('gibt nach dem Wegräumen nichts Weggeräumtes mehr aus', () => {
    const kit = new FoodKit();
    const before = meshesOf(kit.view(dish('tomato-soup'))!);
    kit.dispose();
    const after = meshesOf(kit.view(dish('tomato-soup'))!);
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
