import * as THREE from 'three';

/**
 * **Was in der Küche steht, aber nicht aus der Datei kommt** — die
 * Brötchenkiste und das Brötchen darin.
 *
 * Der gekaufte Katalog hat dreizehn Möbel und **keine Zutat**
 * (`core/kitchenFit.ts`): kein Gemüse, kein Teig, kein Brötchen. Bei
 * _Overcooked_ ist die Kiste mit dem Nachschub aber genau der Ort, an dem eine
 * Runde anfängt — also wird sie hier gebaut, aus denselben Grundkörpern wie
 * die Kisten der Interaktionszone (`zones/interact.ts`).
 *
 * **Gebaut und nicht gemodelliert**, und das ist eine Entscheidung: Ein
 * Brötchen ist eine gedrückte Kugel mit einem helleren Boden, und dafür eine
 * zweite Quelldatei aufzunehmen — mit Lizenz, Aufbereitung und Eintrag in
 * `public/models/CREDITS.md` — wäre viel Aufwand für zwei Kugeln. Wenn eines
 * Tages ein Zutatensatz dazukommt, ersetzt er genau diese beiden Funktionen.
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

/** Die Farben: Krume, Kruste, Holz. */
const CRUST = 0xd9a253;
const CRUMB = 0xf0dcb4;
const WOOD = 0xa9763f;
const TRIM = 0x7d5327;

/**
 * **Ein Brötchen** — eine gedrückte Kugel mit hellerem Boden, Ursprung auf
 * seinem Fuß.
 *
 * Derselbe Ursprung wie bei jedem Möbel und bei jedem abgenommenen Gerät
 * (`core/kitchenModel.takeUtensil`): **auf dem Boden in der Mitte**. Damit
 * legt die Küche alles, was getragen wird, mit derselben Zeile ab und muss
 * sich nicht je Ding erinnern, wo dessen Null liegt.
 */
export function buildBun(materials: THREE.Material[]): THREE.Object3D {
  const crust = own(materials, new THREE.MeshStandardMaterial({ color: CRUST, roughness: 0.8 }));
  const crumb = own(materials, new THREE.MeshStandardMaterial({ color: CRUMB, roughness: 0.9 }));

  const bun = new THREE.Group();
  bun.name = 'kitchen-bun';

  const top = new THREE.Mesh(new THREE.SphereGeometry(BUN_RADIUS, 14, 10), crust);
  top.scale.set(1, BUN_SQUASH, 1);
  top.position.y = BUN_HEIGHT / 2;
  top.castShadow = true;
  bun.add(top);

  // Der helle Boden: eine flache Scheibe unter der Kruste. Ohne sie ist ein
  // Brötchen von oben ein brauner Fleck.
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(BUN_RADIUS * 0.92, BUN_RADIUS * 0.86, BUN_HEIGHT * 0.3, 14),
    crumb,
  );
  base.position.y = BUN_HEIGHT * 0.15;
  base.castShadow = true;
  bun.add(base);

  return bun;
}

/**
 * **Die Brötchenkiste** — vier Bretter, ein Boden, ein Brötchen darin.
 *
 * Das Brötchen darin ist **Deko** und nicht der Vorrat: Genommen wird aus der
 * Kiste beliebig oft (`kitchenCarry.kitchenDeed`, `box`), denn eine Kiste, die
 * nach drei Griffen leer ist, ist eine Kiste, vor der man steht und nicht
 * weiß, ob sie kaputt ist. Es soll sagen, was drin ist, und mehr nicht.
 *
 * **Eines und nicht mehr drei**: Bei 60 cm Breite (`BUN_RADIUS`) passt genau
 * ein Burger zwischen die Bretter — die Kiste ist innen 70 cm weit. Drei
 * davon steckten ineinander und hingen über den Rand, und eine Kiste, aus der
 * Brötchen herauswachsen, sieht nicht nach Vorrat aus, sondern nach Fehler.
 * Die Kiste mitwachsen zu lassen war die Alternative und ist keine: Sie steht
 * auf **einer** Kachel (`worlds/nav/navTile.TILE` = 1 m), und breiter als die
 * Kachel stünde sie im Weg.
 */
export function buildBunBox(materials: THREE.Material[]): THREE.Object3D {
  const wood = own(materials, new THREE.MeshStandardMaterial({ color: WOOD, roughness: 0.85 }));
  const trim = own(materials, new THREE.MeshStandardMaterial({ color: TRIM, roughness: 0.85 }));

  const box = new THREE.Group();
  box.name = 'kitchen-bun-box';

  const floor = new THREE.Mesh(new THREE.BoxGeometry(BOX_SIZE, PLANK, BOX_SIZE), wood);
  floor.position.y = PLANK / 2;
  floor.castShadow = true;
  box.add(floor);

  // Vier Wände, und die oberste Leiste dunkler: Daran sieht man von oben, dass
  // die Kiste offen ist und nicht ein Würfel.
  for (const [dx, dz] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const) {
    const wide = dx !== 0 ? PLANK : BOX_SIZE;
    const deep = dx !== 0 ? BOX_SIZE : PLANK;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wide, BOX_HEIGHT, deep), wood);
    wall.position.set((dx * (BOX_SIZE - PLANK)) / 2, BOX_HEIGHT / 2, (dz * (BOX_SIZE - PLANK)) / 2);
    wall.castShadow = true;
    box.add(wall);

    const rim = new THREE.Mesh(new THREE.BoxGeometry(wide + 0.02, 0.06, deep + 0.02), trim);
    rim.position.set(wall.position.x, BOX_HEIGHT - 0.03, wall.position.z);
    box.add(rim);
  }

  // Ein Brötchen, mit dem Fuß knapp unter dem Rand: Es schaut eine Handbreit
  // heraus und sagt damit von weitem, was in der Kiste ist — liegt es tiefer,
  // ist die Kiste von vorn eine Kiste mit nichts darin.
  const bun = buildBun(materials);
  bun.position.set(0, BOX_HEIGHT - 0.18, 0);
  box.add(bun);

  return box;
}

/** Ein Material, das die Zone wieder freigibt. */
function own<T extends THREE.Material>(list: THREE.Material[], material: T): T {
  list.push(material);
  return material;
}
