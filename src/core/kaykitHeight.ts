import * as THREE from 'three';
import { canLoadModels } from './chefFit';

/**
 * **Ein Modell aus dem Regal auf eine gewünschte Höhe stellen** — geholt,
 * gemessen, skaliert, mit dem Fuß auf dem Ursprung.
 *
 * Der Anlass sind die **Pfosten**. An mehreren Stellen dieses Spiels stand
 * derselbe gerechnete Stab — ein schmaler Quader oder Zylinder, auf dem eine
 * Tafel sitzt: unter dem Schild der Gitterwelt (`worlds/grid/fixtures/sign.ts`,
 * 1,35 m) und unter der Tafel, die man hinstellt und mitnimmt
 * (`worlds/signs/SignBoard.ts`, 1,05 m). Das Regal hat dafür ein Modell
 * (`dungeon/post.glb`), und es ist **eines** — die Höhe dagegen ist an jeder
 * Stelle eine andere. Genau diese Naht liegt hier: dieselbe Datei, dieselbe
 * Handschrift, verschiedene Maße.
 *
 * ## Gemessen und nicht abgeschrieben
 *
 * Die Versuchung ist, die Zahl hinzuschreiben: `dungeon/post.glb` ist in der
 * Quelle 4,00 Einheiten hoch, das Paket steht auf `KAYKIT_SCALE` = 0,5, macht
 * 2,00 m — ein Faktor von 0,675 für einen Pfosten von 1,35 m, und fertig. Das
 * ist die Art Zahl, die beim nächsten Paket-Update stehen bleibt, während das
 * Netz daneben wandert; dieselbe Begründung steht am Sockel der Kisten
 * (`core/kaykitModel.copyOf`: „Gemessen wird am geklonten Netz und nicht am
 * Katalog — der Deckel ist fremde Arbeit") und an der Druckplatte
 * (`worlds/grid/fixtures/plate.ts`, „Erst hängen, dann messen"). Also wird
 * hier **am geladenen Netz** gemessen (`THREE.Box3`), und der Faktor fällt
 * dabei ab. Wer das Modell austauscht, tauscht eine Zeile und nicht eine
 * Rechnung.
 *
 * ## Warum das eine eigene Datei ist
 *
 * Zwei Gründe, und beide sind dieselben wie bei `core/kaykitFit.ts` nebenan:
 *
 * - **Mehrere Stellen brauchen es.** Ein Helfer, den man in die zweite Datei
 *   hineinkopiert, ist beim dritten Aufrufer eine dritte Fassung.
 * - **Es soll prüfbar bleiben.** Der Lader (`core/kaykitModel.ts`) braucht
 *   `GLTFLoader` und `import.meta`, und beides gibt es in Jest nicht; er wird
 *   deshalb **dynamisch** geholt und nur dort, wo es WebGL gibt
 *   (`core/chefFit.canLoadModels`). Alles darüber — die Rechnung
 *   (`kaykitHeightScale`) und das Einpassen selbst (`kaykitFitHeight`) —
 *   kommt mit three.js allein aus und steht in `kaykitHeight.test.ts` auf dem
 *   Prüfstand.
 */

/**
 * **Quellhöhe → Faktor**, die ganze Rechnung.
 *
 * Eine Zeile, und trotzdem ausdrücklich eine Funktion: Sie ist das, was ein
 * Test ohne WebGL nachrechnen kann, und sie ist die Stelle, an der die drei
 * unmöglichen Fälle abgefangen werden. `1` heißt dabei „lass es, wie es ist" —
 * ein leeres Netz, eine Höhe von null oder eine Zahl, die keine ist, sind kein
 * Grund, ein Modell auf das Unendliche zu blasen oder es verschwinden zu
 * lassen. Besser ein Pfosten in seiner gelieferten Größe als keiner.
 */
export function kaykitHeightScale(measured: number, wanted: number): number {
  if (!(measured > 1e-6) || !(wanted > 0)) return 1;
  return wanted / measured;
}

/**
 * **Das geladene Modell in eine Gruppe stellen, die genau `height` hoch ist**
 * — und deren Ursprung sein Fuß ist.
 *
 * Zurück kommt eine **neue** Gruppe um das Modell herum, und das ist der
 * eigentliche Dienst an den Aufrufern: Wer sie hinstellt, setzt sie dorthin,
 * wo der Pfosten auf dem Boden stehen soll, und muss über die Bauart der
 * Datei nichts wissen. Die Requisiten des Regals haben ihren Ursprung zwar
 * fast immer in der Mitte ihrer Unterkante (siehe
 * `worlds/grid/fixtures/plate.ts`) — aber „fast immer" ist bei 4470 fremden
 * Dateien keine Zusage, und die Messung liegt für den Maßstab ohnehin vor.
 * Der Fuß auf dem Ursprung ist damit umsonst zu haben.
 *
 * **Der Maßstab dreht um den Ursprung des Modells und nicht um seinen Fuß.**
 * Wer nach dem Skalieren nur `box.min.y` abzöge, hätte ein Modell, das um so
 * viel danebensteht, wie sein Ursprung vom Fuß entfernt ist. Die Zeile unten
 * rechnet beides zusammen: Was vorher auf `box.min.y` lag, liegt hinterher
 * auf null.
 */
export function kaykitFitHeight(model: THREE.Object3D, height: number): THREE.Group {
  const stand = new THREE.Group();
  stand.name = `kaykit-fit:${model.name}`;
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  if (!box.isEmpty()) {
    const factor = kaykitHeightScale(box.max.y - box.min.y, height);
    model.scale.multiplyScalar(factor);
    model.position.y = factor * (model.position.y - box.min.y);
  }
  stand.add(model);
  return stand;
}

/**
 * **Eine Adresse aus dem Regal, fertig auf Höhe gebracht** — oder `null`.
 *
 * `null` ist hier dreimal der **normale** Ausgang und nirgends ein Fehler: in
 * Jest (kein WebGL, siehe oben), in einem Checkout ohne die gekauften Pakete
 * und auf einer Leitung, die abreißt. Wer diesen Helfer ruft, hat deshalb
 * einen Plan für „es kommt nichts" — meistens ist das „dann steht dort eben
 * kein Pfosten", und das ist in Ordnung: Ein Schild wird gelesen und nicht
 * gestützt.
 *
 * **Die Schranke steht hier und nicht bei den Aufrufern.** Anders als an der
 * Druckplatte, wo der dynamische Import selbst in der Datei steht, soll eine
 * Stelle, die einen Pfosten aufstellt, genau eine Zeile dafür brauchen — und
 * nicht dieselben drei Zeilen Vorsicht ein zweites Mal.
 */
export async function kaykitAtHeight(path: string, height: number): Promise<THREE.Group | null> {
  if (!canLoadModels()) return null;
  const module = await import('./kaykitModel');
  const model = await module.kaykitModel(path);
  return model ? kaykitFitHeight(model, height) : null;
}

/**
 * **Die Materialien unter einem Knoten, jedes einmal** — die Liste, die beim
 * Abräumen weg muss.
 *
 * Die **Geometrie** einer Regalkopie gehört der Vorlage im Speicher und allen
 * anderen Kopien und wird nie freigegeben (`core/kaykitModel.copyOf`,
 * `userData.sharedAssets`); die **Materialien** dagegen klont jede Kopie für
 * sich, damit ein Pinselstrich nicht in alle Pfosten zugleich schreibt. Wer
 * sie liegen ließe, sammelte: Die Gitterwelt baut ihre Einbauten bei jeder
 * Änderung neu (`grid/GridWorld.rebuildFixtures`), und ein Schild, das man
 * hinstellt, nimmt man auch wieder mit.
 */
export function kaykitSkins(root: THREE.Object3D): THREE.Material[] {
  const out = new Set<THREE.Material>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const skin of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      out.add(skin);
    }
  });
  return [...out];
}
