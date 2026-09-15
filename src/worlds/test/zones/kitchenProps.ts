import * as THREE from 'three';

/**
 * **Was in der Küche steht, aber nicht aus der Datei kommt** — die
 * Brötchenkiste und die Brötchen darin.
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

/** Wie groß ein Brötchen ist, in Metern. */
export const BUN_RADIUS = 0.11;
/** Und wie hoch es damit aufträgt — es ist gedrückt, keine Kugel. */
export const BUN_HEIGHT = BUN_RADIUS * 2 * 0.72;

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
  top.scale.set(1, 0.72, 1);
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
 * **Die Brötchenkiste** — vier Bretter, ein Boden, drei Brötchen darin.
 *
 * Die Brötchen darin sind **Deko** und nicht der Vorrat: Genommen wird aus der
 * Kiste beliebig oft (`kitchenCarry.kitchenDeed`, `box`), denn eine Kiste, die
 * nach drei Griffen leer ist, ist eine Kiste, vor der man steht und nicht
 * weiß, ob sie kaputt ist. Sie sollen sagen, was drin ist, und mehr nicht.
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

  // Drei Brötchen, knapp unter dem Rand — sie schauen heraus, fallen aber
  // nicht darüber.
  const spots: ReadonlyArray<readonly [number, number]> = [
    [-0.14, -0.1],
    [0.15, -0.05],
    [0.0, 0.16],
  ];
  for (const [x, z] of spots) {
    const bun = buildBun(materials);
    bun.position.set(x, BOX_HEIGHT - 0.22, z);
    bun.rotation.y = x * 4;
    box.add(bun);
  }

  return box;
}

/** Ein Material, das die Zone wieder freigibt. */
function own<T extends THREE.Material>(list: THREE.Material[], material: T): T {
  list.push(material);
  return material;
}
