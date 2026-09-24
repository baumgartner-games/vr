import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import type { MarkId } from '../house';

/**
 * **Die Einrichtung der Station kommt aus dem Regal.**
 *
 * Gewünscht war: _„Bitte nutze keine eigenen Elemente/Möbel in Haunting außer
 * die aus dem KayKit-Katalog. Z. B. für den Spind kannst du Locker nutzen."_
 * Jedes Kennzeichen eines Raums (`house.MarkId`) bekommt deshalb ein Modell
 * aus dem Regal, eingepasst in die Stellfläche, die das Layout ihm reserviert
 * (`fixtureDimensions.FIXTURE_CATALOG`) — dieselbe Stelle, derselbe Körper
 * (`HauntingWorld.buildFixtureColliders`), nur ein anderes Bild. Das Regal hat
 * keine Kryokapsel und keinen Reaktor; genommen wird, was dem am nächsten
 * kommt und in der Station nicht fremd aussieht.
 *
 * **Die gebauten Modelle bleiben der Ersatz** (`fixtureModels.ts`), wie bei den
 * Figuren (`actorArt.ts`): Sie stehen sofort da und gehen aus dem Bild, sobald
 * das Modell aus dem Regal geladen ist — ohne WebGL und in einem Checkout ohne
 * die gekauften Pakete bleiben sie stehen.
 */
export const FIXTURE_MODELS: Readonly<Record<MarkId, string>> = {
  // Kryokapsel: eine Liege.
  wanne: 'furniture-bits/bed_single_B.glb',
  // Dekontaminationskammer: der Wassertank der Weltraumbasis.
  dusche: 'space-base-bits/water_storage.glb',
  // Nährstoffdrucker: ein Ofen.
  ofen: 'restaurant-bits/oven.glb',
  // Wasseraufbereitung: die Spülenzeile.
  spuele: 'restaurant-bits/kitchencounter_sink.glb',
  // Schlafkoje: das Stockbett.
  bett: 'dungeon/bed_A_stacked.glb',
  // Serverracks: ein hohes Regal.
  buecher: 'furniture-bits/shelf_B_large_decorated.glb',
  // Antriebskern: die Werkbank des Prototyp-Pakets.
  werkbank: 'prototype-bits/Workbench_Decorated.glb',
  // Kommunikationskonsole: ein Schreibtisch mit Bildschirm.
  klavier: 'furniture-bits/desk_decorated.glb',
  // Reaktor: die Container der Weltraumbasis.
  kamin: 'space-base-bits/containers_C.glb',
  // Sauerstofftank: ein Treibstofffass.
  standuhr: 'resource-bits/Fuel_A_Barrel.glb',
  // Pilotensitz: ein Sessel.
  sessel: 'furniture-bits/armchair.glb',
  // Frachtcontainer: gestapelte Fracht der Weltraumbasis.
  kiste: 'space-base-bits/cargo_A_stacked.glb',
  // Probenkammer: ein Kühlschrank.
  schaukelpferd: 'restaurant-bits/fridge_B.glb',
  // Hydroponikbeet: die kleine Farm der Weltraumbasis.
  esstisch: 'space-base-bits/space_farm_small.glb',
  // Kantinenausgabe: die Herdzeile.
  ausgabe: 'restaurant-bits/stove_multi_decorated.glb',
};

/** Der Schutzschrank, in dem man sich versteckt — der Spind des Prototyp-Pakets. */
export const LOCKER_MODEL = 'prototype-bits/Locker.glb';
/** Der Frachtschrank mit dem Farbband — derselbe Spind, verziert. */
export const CARGO_MODEL = 'prototype-bits/Locker_Decorated.glb';
/** Der Unterbau einer Reparaturkonsole: ein Schreibtisch. */
export const CONSOLE_MODEL = 'furniture-bits/desk.glb';

/** Eine Stellfläche in Metern: Breite (x), Höhe, Tiefe (z). */
export interface PropSize {
  width: number;
  height: number;
  depth: number;
}

/**
 * **Ein Modell in eine Stellfläche einpassen** — die Mitte über dem Ursprung,
 * die Unterkante auf null.
 *
 * `stretch` streckt jede Achse für sich auf die Fläche (ein Schrank muss genau
 * so groß sein wie seine Tür); ohne wird gleichmäßig so weit verkleinert oder
 * vergrößert, dass das Modell ganz hineinpasst, und es behält seine Form.
 */
export function fitProp(model: THREE.Object3D, size: PropSize, stretch = false): boolean {
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const wide = box.max.x - box.min.x;
  const high = box.max.y - box.min.y;
  const deep = box.max.z - box.min.z;
  if (!(wide > 1e-6) || !(high > 1e-6) || !(deep > 1e-6)) return false;
  if (stretch) {
    model.scale.x *= size.width / wide;
    model.scale.y *= size.height / high;
    model.scale.z *= size.depth / deep;
  } else {
    const factor = Math.min(size.width / wide, size.height / high, size.depth / deep);
    model.scale.multiplyScalar(factor);
  }
  model.updateMatrixWorld(true);
  box.setFromObject(model);
  model.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
  model.updateMatrixWorld(true);
  return true;
}

/**
 * **Das Modell aus dem Regal an die Stelle des gebauten** — eingepasst in
 * `size`, eingehängt in `holder`; `fallback` geht aus dem Bild, sobald es da
 * ist. Ohne WebGL passiert nichts.
 */
export function dressProp(
  holder: THREE.Object3D,
  path: string,
  size: PropSize,
  fallback: readonly THREE.Object3D[],
  stretch = false,
  tint: number | null = null,
): void {
  if (!canLoadModels()) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(path);
    if (!model || !fitProp(model, size, stretch)) return;
    model.name = `station-prop:${path}`;
    // **Eine Farbe, die etwas sagt, bleibt** — die Hocker der Zentrale tragen
    // die Farbe ihres Geräts. Die Materialien der Kopie gehören ihr allein
    // (`kaykitModel.copyOf`), also färbt das kein anderes Modell mit.
    if (tint !== null)
      model.traverse((object) => {
        const material = (object as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
        if (material?.color) material.color.setHex(tint);
      });
    holder.add(model);
    for (const one of fallback) one.visible = false;
  });
}

/**
 * **Mehrere Modelle auf einmal an die Stelle eines gebauten Bündels** — die
 * Geräte eines Raums sind gebaut zu einem Netz je Oberfläche verschmolzen
 * (`shipArt.addRoomFixtures`), also geht das Bündel erst aus dem Bild, wenn
 * **alle** Modelle da sind. Fehlt eines, bleibt das Gebaute, und die
 * angekommenen gehen wieder.
 */
export function dressProps(
  items: readonly { holder: THREE.Object3D; path: string; size: PropSize }[],
  fallback: readonly THREE.Object3D[],
): void {
  if (!canLoadModels() || items.length === 0) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const models = await Promise.all(items.map((item) => module.kaykitModel(item.path)));
    const ready = models.every((model, i) => model && fitProp(model, items[i]!.size));
    if (!ready) return;
    models.forEach((model, i) => {
      model!.name = `station-prop:${items[i]!.path}`;
      items[i]!.holder.add(model!);
    });
    for (const one of fallback) one.visible = false;
  });
}

/**
 * **Der Spind aus dem Regal in einen Schrank der Station** — Korpus an den
 * Schrank, die Tür des Modells an das Blatt, das die Station bewegt
 * (`ShipExperience`: Es fährt beim Öffnen nach oben).
 *
 * Gestreckt wird auf die Maße des Schranks (`fitProp` mit `stretch`), denn in
 * genau diese Maße ist er eingeplant: Stellfläche, Körper und die Stelle, an
 * der man sich darin versteckt. Die Tür des Modells (der Knoten mit `Door` im
 * Namen) wandert mit `attach` an das Blatt, behält also ihren Platz, fährt
 * danach aber mit ihm. Das gebaute Blatt bleibt als Träger stehen (Bildschirm
 * und Beute hängen daran) und wird nur unsichtbar.
 */
export function dressCabinet(
  root: THREE.Object3D,
  leaf: THREE.Mesh,
  path: string,
  size: PropSize,
): void {
  if (!canLoadModels()) return;
  const fallback = root.children.filter(
    (child) => child !== leaf && !/cargo-mark/.test(child.name),
  );
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(path);
    if (!model || !fitProp(model, size, true)) return;
    model.name = `station-prop:${path}`;
    root.add(model);
    root.updateMatrixWorld(true);
    let door: THREE.Object3D | null = null;
    model.traverse((object) => {
      if (!door && /door/i.test(object.name) && (object as THREE.Mesh).isMesh) door = object;
    });
    if (door) leaf.attach(door);
    for (const one of fallback) one.visible = false;
    // Das gebaute Blatt trägt weiter Bildschirm und Beute — nur sein eigenes
    // Bild und seine Beschläge gehen weg.
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    (leaf.material as THREE.Material).dispose();
    leaf.material = hidden;
    for (const child of leaf.children) if (/door-hardware/.test(child.name)) child.visible = false;
  });
}
