import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { elementById } from '../../elements/elementCatalog';
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
/**
 * **Was die Station aus dem Katalog nimmt** — die Geräte, deren Modell aus
 * _Space Base Bits_ kommt, sind Spielelemente des Ordners _Weltraum_
 * (`elements/spaceCatalog.ts`). Gewünscht (Oktober 2026): _„Ersetze dann die
 * Modelle die aus Space in haunting genutzt wurden durch diese neuen Katalog
 * Möbel."_ Gezeichnet wird das Element (`elementView.elementModel`) und nicht
 * mehr die Datei; die Stellfläche bleibt die des Raumplans
 * (`fixtureDimensions.FIXTURE_CATALOG`), in die es eingepasst wird — der
 * Wassertank misst im Katalog 4 × 4 Kacheln, die Dekontamination der Station
 * 1,40 × 1,25 m, und der Plan der Station hängt an diesen Maßen.
 */
export const FIXTURE_ELEMENTS: Readonly<Partial<Record<MarkId, string>>> = {
  dusche: 'space-water-storage',
  kamin: 'space-containers-c',
  kiste: 'space-cargo-a-stacked',
  esstisch: 'space-farm-small',
};

/** Die Datei eines Katalog-Elements — sein einziges Teil. */
function catalogModel(element: string): string {
  return elementById(element).parts[0]!.model;
}

/**
 * **Woher ein Gerät der Station sein Bild nimmt** — ein Spielelement aus dem
 * Katalog (`FIXTURE_ELEMENTS`) oder, wo es noch keines gibt, die Datei aus dem
 * Regal (`FIXTURE_MODELS`).
 */
export type PropSource = string | { readonly element: string };

export function fixtureSource(mark: MarkId): PropSource {
  const element = FIXTURE_ELEMENTS[mark];
  return element ? { element } : FIXTURE_MODELS[mark];
}

/** Wie ein Bild in der Szene heißt — die Datei oder das Element. */
function sourceName(source: PropSource): string {
  return typeof source === 'string' ? source : `element:${source.element}`;
}

/** Das Bild laden: die Datei aus dem Regal, oder das Element mit allen Teilen. */
async function loadSource(
  module: typeof import('../../../core/kaykitModel'),
  source: PropSource,
): Promise<THREE.Object3D | null> {
  if (typeof source === 'string') return module.kaykitModel(source);
  const view = await import('../../elements/elementView');
  return view.elementModel(source.element, (path) => module.kaykitModel(path));
}

export const FIXTURE_MODELS: Readonly<Record<MarkId, string>> = {
  // Kryokapsel: eine Liege.
  wanne: 'furniture-bits/bed_single_B.glb',
  // Dekontaminationskammer: der Wassertank aus dem Katalog (_Weltraum_).
  dusche: catalogModel('space-water-storage'),
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
  // Reaktor: die Behälter aus dem Katalog (_Weltraum_).
  kamin: catalogModel('space-containers-c'),
  // Sauerstofftank: ein Treibstofffass.
  standuhr: 'resource-bits/Fuel_A_Barrel.glb',
  // Pilotensitz: ein Sessel.
  sessel: 'furniture-bits/armchair.glb',
  // Frachtcontainer: der Frachtstapel aus dem Katalog (_Weltraum_).
  kiste: catalogModel('space-cargo-a-stacked'),
  // Probenkammer: ein Kühlschrank.
  schaukelpferd: 'restaurant-bits/fridge_B.glb',
  // Hydroponikbeet: die kleine Hydroponik aus dem Katalog (_Weltraum_).
  esstisch: catalogModel('space-farm-small'),
  // Kantinenausgabe: die Herdzeile.
  ausgabe: 'restaurant-bits/stove_multi_decorated.glb',
};

/** Der Schutzschrank, in dem man sich versteckt — der Spind des Prototyp-Pakets. */
export const LOCKER_MODEL = 'prototype-bits/Locker.glb';
/**
 * **Der Frachtschrank mit dem Farbband — derselbe Spind, leer.** Er war der
 * verzierte (`Locker_Decorated.glb`), und in dem liegt immer Kram: Jede
 * offene Kiste sah voll aus, ob etwas darin war oder nicht. Gemeldet: _„Es ist
 * nicht ersichtlich ob darin etwas ist, was ich nehmen kann."_ Jetzt liegt
 * darin nur, was man nehmen kann, und das leuchtet
 * (`ShipExperience.glowLoot`).
 */
export const CARGO_MODEL = 'prototype-bits/Locker.glb';
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
  path: PropSource,
  size: PropSize,
  fallback: readonly THREE.Object3D[],
  stretch = false,
  tint: number | null = null,
): void {
  if (!canLoadModels()) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await loadSource(module, path);
    if (!model || !fitProp(model, size, stretch)) return;
    model.name = `station-prop:${sourceName(path)}`;
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
  items: readonly { holder: THREE.Object3D; path: PropSource; size: PropSize }[],
  fallback: readonly THREE.Object3D[],
): void {
  if (!canLoadModels() || items.length === 0) return;
  void import('../../../core/kaykitModel').then(async (module) => {
    const models = await Promise.all(items.map((item) => loadSource(module, item.path)));
    const ready = models.every((model, i) => model && fitProp(model, items[i]!.size));
    if (!ready) return;
    models.forEach((model, i) => {
      model!.name = `station-prop:${sourceName(items[i]!.path)}`;
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
    if (door) {
      leaf.attach(door);
      // Aus der Kopie herausgelöst — und trotzdem Geometrie der Vorlage.
      (door as THREE.Object3D).userData.sharedAssets = true;
    }
    for (const one of fallback) one.visible = false;
    // Das gebaute Blatt trägt weiter Bildschirm und Beute — nur sein eigenes
    // Bild und seine Beschläge gehen weg.
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    (leaf.material as THREE.Material).dispose();
    leaf.material = hidden;
    for (const child of leaf.children) if (/door-hardware/.test(child.name)) child.visible = false;
  });
}

/** Das Ersatzteil der Station: eine Batterie. */
export const PART_MODEL = 'block-bits/battery.glb';
/** Das Medkit: ein roter Trank — das Regal hat keinen Verbandskasten. */
export const MEDKIT_MODEL = 'adventurers/potion_medium_red.glb';

/**
 * **Ein gebautes Kästchen wird zum Träger eines Modells** — das Netz bleibt
 * (es trägt Bindung, Beschriftung, Sichtbarkeit und Treffer: `bind`,
 * `interactionLabel`, Röntgenblick), sein **Material** geht aus, und das
 * Modell aus dem Regal sitzt, in seine Maße eingepasst, mitten darin.
 */
export function dressMesh(
  mesh: THREE.Mesh,
  path: string,
  alsoHide: readonly THREE.Object3D[] = [],
): void {
  if (!canLoadModels()) return;
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox!;
  const size = {
    width: box.max.x - box.min.x,
    height: box.max.y - box.min.y,
    depth: box.max.z - box.min.z,
  };
  void import('../../../core/kaykitModel').then(async (module) => {
    const model = await module.kaykitModel(path);
    if (!model || !fitProp(model, size)) return;
    model.name = `station-prop:${path}`;
    // `fitProp` stellt die Unterkante auf null; das Kästchen hat seine Mitte dort.
    model.position.y += box.min.y;
    mesh.add(model);
    for (const one of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
      one.visible = false;
    for (const one of alsoHide) one.visible = false;
  });
}
