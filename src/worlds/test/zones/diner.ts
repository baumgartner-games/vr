import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import { type DinerPiece, dinerPiece, dinerStand, dinerTop } from '../../../core/dinerFit';
import type { WorldContext } from '../../../core/types';
import type { PhysicsBody } from '../../../physics/PhysicsWorld';
import { TILE } from '../../nav/navTile';
import { DINER } from '../layout';
import { KitchenFloor } from './kitchenFloor';
import { mergeMeshes, mergedMesh } from './kitchenMerge';
import type { TestZone, ZoneHost } from './zone';
import {
  DINER_FLOOR,
  DINER_SPOTS,
  type DinerSpot,
  dinerFootprint,
  dinerHangs,
  type Turn,
} from './dinerPlan';

export * from './dinerPlan';

/**
 * **Die zweite Küche** — ein Restaurant aus dem zweiten Möbelkatalog, und
 * dahinter der Schauraum, in dem jedes seiner 156 Stücke einmal einzeln steht.
 *
 * Wo was steht, rechnet der Aufbau daneben (`zones/dinerPlan.ts`); diese Datei
 * stellt es hin. Der Katalog selbst kommt aus `core/dinerFit.ts`, die Netze aus
 * `core/dinerModel.ts`.
 *
 * ## Warum das hier zweihundert Zeilen sind und die erste Küche fünftausend
 *
 * Die erste Küche ist eine **Maschine**: Stationen, Uhren, Rezepte, Bänder,
 * Gäste, ein Baumodus, Feuer. Diese hier ist ein **Raum**. Sie stellt Möbel
 * hin, hängt Tafeln daneben, setzt Körper darunter — und hört dann auf. Kein
 * `update`, kein Zustand, nichts, was eine Runde weiterzählt.
 *
 * Das ist keine halbe Sache, sondern die Antwort auf die Frage, die diesen
 * Raum gebaut hat: **Was von dem gekauften Baukasten können wir brauchen?**
 * Diese Frage beantwortet man, indem man die Sachen hinstellt und ansieht,
 * nicht, indem man ihnen Spielregeln gibt, die noch niemand haben wollte. Was
 * sich dabei als brauchbar herausstellt, kann danach in die erste Küche
 * wandern — dort steht die Maschine, die es aufnimmt.
 *
 * ## Und warum sie trotzdem in neun Netzen dasteht
 *
 * **Alle 156 Stücke teilen sich ein Material und eine Textur** (ein
 * Farbstreifen-Atlas, `core/dinerModel.dinerMaterial`). Damit lässt sich
 * zusammenfassen, was die erste Küche nur einzeln zeichnen kann: Der
 * Schauraum wird **reihenweise verschmolzen** (`zones/kitchenMerge.ts`), das
 * Restaurant zu einem einzigen Netz. Aus **244 Netzen werden neun** — acht
 * Schauraumreihen und das Restaurant —, und das ist genau die Rechnung, die in
 * der ersten Küche als offener Posten steht (AGENTS.md, _Die Messstrecke der
 * Küche_: „Der offene Posten heißt instanzieren"). Hier ging sie ohne
 * Instanzen auf, weil die Quelle so gebaut ist.
 *
 * **Was das je Bild an Zeichenaufrufen spart, steht hier nicht**, und zwar
 * absichtlich: Gezählt wird so etwas mit `npm run perf:kitchen`, und das
 * Werkzeug misst an der Ankerkachel der **ersten** Küche. Neun Netzen statt
 * 244 ist eine Zusage über das, was hier gebaut wird — keine über eine
 * Bildzeit, die niemand gemessen hat.
 *
 * **Verschmolzen wird reihenweise und nicht als ein Klotz.** Ein einziges Netz
 * über den ganzen Schauraum wäre ein Zeichenaufruf — und würde nie
 * weggeschnitten: Wer in der Ecke steht und in die andere Richtung sieht,
 * zahlte trotzdem alle 85 000 Dreiecke. Acht Reihen sind acht Aufrufe und acht
 * Hüllen, von denen der Blickkegel die meisten wegwirft.
 *
 * **Was verschmolzen ist, lässt sich nicht mehr einzeln anfassen.** Das ist
 * der Preis, und er ist hier keiner: In diesem Raum wird nichts aufgehoben,
 * versetzt oder eingefärbt. Die erste Küche kann das nicht so machen — dort
 * muss jedes Möbel greifbar bleiben (`kitchenCarry.ts`, `kitchenBuild.ts`).
 */
/**
 * **Die Netze eines geladenen Stücks, jedes mit seiner Weltmatrix in der
 * Hand** — das, was `mergeMeshes` einbacken kann.
 *
 * Ein geladenes Stück ist eine **Gruppe** über dem Netz (`core/dinerModel.ts`,
 * und dort steht auch, warum das so sein muss): Der Maßstab sitzt an der
 * Gruppe, die Umrechnung der quantisierten Eckpunkte am Netz darunter.
 * `mergeMeshes` rechnet aber mit `mesh.matrix`, also der Matrix **eines**
 * Knotens — wer ihm das Netz von innen gäbe, bekäme hundertsechsundvierzig
 * Möbel auf dem Ursprung übereinander.
 *
 * Also wird die Weltmatrix ausgerechnet und an ein Netz gehängt, das seine
 * Matrix selbst führt (`matrixAutoUpdate = false`) — genau der Fall, den
 * `mergeMeshes` ausdrücklich stehen lässt. Geometrie und Material bleiben
 * geteilt; das Netz davor ist eine Hülle und wird nie gezeichnet.
 */
function parts(model: THREE.Object3D): THREE.Mesh[] {
  model.updateMatrixWorld(true);
  const found: THREE.Mesh[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const proxy = new THREE.Mesh(mesh.geometry, mesh.material);
    proxy.matrixAutoUpdate = false;
    proxy.matrix.copy(mesh.matrixWorld);
    proxy.castShadow = mesh.castShadow;
    proxy.receiveShadow = mesh.receiveShadow;
    found.push(proxy);
  });
  return found;
}

export class DinerZone implements TestZone {
  private world: ZoneHost | null = null;
  private gone = false;
  private floor: KitchenFloor | null = null;
  private hidden: THREE.Material | null = null;

  private readonly placed: THREE.Object3D[] = [];
  private readonly shapes: THREE.BufferGeometry[] = [];
  /**
   * Die Körper unter den Möbeln bleiben in der Hand: Beim Abräumen muss jeder
   * einzeln wieder aus der Physik heraus (`ZoneHost.removeSolid`) — ein Netz,
   * das nur aus der Szene fliegt, lässt seinen Körper stehen, und dann läuft
   * man in einer leeren Ecke gegen einen Kühlschrank, den es nicht mehr gibt.
   */
  private readonly bodies: { object: THREE.Object3D; body: PhysicsBody }[] = [];

  build(_ctx: WorldContext, world: ZoneHost): void {
    this.world = world;
    this.gone = false;
    this.floor = new KitchenFloor(world.root, DINER, 'diner-floor');

    // **Erst die Körper, dann die Bilder** — und die Körper auch ohne Bild.
    // Die erste Küche setzt beides zusammen, wenn das Modell ankommt; hier
    // nicht, und das ist der bessere Weg: Ein Möbel, dessen Datei fehlt, ist
    // im Grundriss trotzdem teuer (`dinerPlan.stampDiner`), und ein Raum, in
    // dem der Grundriss ein Hindernis kennt und die Physik nicht, ist ein
    // Raum, in dem man an unsichtbaren Stellen hängen bleibt — oder durch
    // sichtbare hindurchgeht.
    for (const spot of DINER_SPOTS) {
      const piece = dinerPiece(spot.name);
      if (piece) this.addBody(piece, spot);
    }

    // Ohne Leinwand keine Tafeln und keine Netze
    // (`core/chefFit.canLoadModels`): Unter Jest gibt es weder `document` noch
    // WebGL, und eine Zone, die dort beim Bauen stehenbleibt, nimmt jeden Test
    // mit, der nur den Grundriss nachrechnen wollte.
    if (!canLoadModels()) return;

    void import('../../../core/dinerModel').then(async (module) => {
      if (this.gone) return;
      await this.furnish(world, module.dinerModel);
    });
  }

  /**
   * **Alle Möbel laden, hinstellen und zu einem Netz zusammenfassen.**
   *
   * Eine Gruppe und nicht mehrere: Der Raum ist vierundzwanzig Kacheln breit,
   * und wer darin steht, sieht ihn ohnehin ganz. Reihenweise zu verschmelzen
   * lohnte sich, solange der Schauraum dahinter über vierundvierzig Kacheln
   * lief und der Blickkegel den halben Katalog wegwerfen konnte — den gibt es
   * nicht mehr (`zones/dinerPlan.ts`).
   *
   * **Geht das Verschmelzen nicht, bleibt jedes Stück einzeln stehen.** Das
   * ist keine Ausnahmebehandlung, sondern die Antwort von `mergeMeshes`: Was
   * aus einem Stück besteht, lässt sich nicht zusammenfassen, und was nicht
   * zueinander passende Attribute hat, soll man nicht. Sichtbar ist beides
   * dasselbe Bild.
   */
  private async furnish(
    world: ZoneHost,
    load: (name: string) => Promise<THREE.Object3D | null>,
  ): Promise<void> {
    const group: THREE.Mesh[] = [];
    for (const spot of DINER_SPOTS) {
      if (this.gone) return;
      const piece = dinerPiece(spot.name);
      if (!piece) continue;
      const model = await load(spot.name);
      if (!model || this.gone) return;
      this.standAt(model, piece, spot);
      group.push(...parts(model));
    }

    const merged = mergeMeshes(group);
    if (merged) {
      this.shapes.push(merged);
      const mesh = mergedMesh(merged, group);
      mesh.name = 'diner-room';
      mesh.receiveShadow = true;
      world.root.add(mesh);
      this.placed.push(mesh);
      return;
    }
    for (const part of group) {
      world.root.add(part);
      this.placed.push(part);
    }
  }

  /**
   * **Wohin ein Stück kommt** — die Mitte seiner Grundfläche, angehoben um
   * das, was unter seinem Ursprung liegt.
   *
   * Drei Zeilen Rechnung, und jede hat einen Grund:
   *
   * - **Die Mitte der Grundfläche**, nicht die Nordwestkachel: Ein Stück von
   *   zwei Kacheln Breite steht sonst um eine halbe Kachel zu weit westlich.
   * - **`dinerStand`** hebt an, was unter dem Ursprung liegt — die
   *   Bodenplatten, deren Ursprung ihre Oberfläche ist, und die Wandstücke, die
   *   an ihrem Anschluss hängen. Ein hängendes Stück wird dabei **nicht**
   *   abgesenkt: Ein Hängeschrank, den man auf den Boden stellt, ist keiner
   *   mehr.
   * - **`at` wird nicht ausgeglichen**, und das ist der Unterschied zur ersten
   *   Küche (`KitchenPiece.align`). Dort verschiebt eine nachgemessene Zahl
   *   das Möbel zurück an die Kante, an der es stehen soll, weil das Werkzeug
   *   seinen Ursprung in die Mitte der Hülle gelegt hat. Hier steht der
   *   Ursprung noch da, wo der Zeichner ihn hingelegt hat, und das ist genau
   *   die Stelle, an der das Stück in seiner Rasterzelle sitzt: Eine Wand am
   *   hinteren Rand, eine Tür in ihrem Sturz, ein Hängeschrank an der Wand.
   *   Wer das ausgliche, rückte alles in die Mitte seiner Kachel und müsste
   *   es danach wieder herausmessen.
   */
  private standAt(model: THREE.Object3D, piece: DinerPiece, spot: DinerSpot): void {
    const turn: Turn = spot.turn ?? 0;
    const size = dinerFootprint(piece, turn);
    model.position.set(
      (DINER.x + spot.x + size.w / 2) * TILE,
      DINER_FLOOR + dinerStand(piece),
      (DINER.z + spot.z + size.d / 2) * TILE,
    );
    model.rotation.y = (turn * Math.PI) / 2;
  }

  /**
   * **Der Körper unter dem Bild** — ein unsichtbarer Kasten in der Größe der
   * Kachelfläche, und zwar genau einer.
   *
   * Dieselbe Rechnung und derselbe Fehler dahinter wie in der ersten Küche
   * (`zones/kitchen.addBody`): `addSolid` misst die Hülle des Objekts, das es
   * bekommt, und für ein geladenes Möbel wäre das die des Netzes samt allem,
   * was übersteht. Ein eigener Kasten aus den Katalogmaßen steht dagegen auf
   * dem Boden, schließt an seinen Nachbarn an und ist da, bevor irgendein
   * Modell geladen ist.
   *
   * **Ein hängendes Stück bekommt keinen** (`dinerPlan.dinerHangs`): Darunter
   * läuft man durch. Zwölf Stücke dieses Katalogs hängen — Hängeschränke,
   * Abzugshauben, Wandfliesen —, und das ist der Fall, für den die erste
   * Küche ihr Feld `KitchenPiece.hanging` mitschleppt, ohne dass ein einziges
   * ihrer Möbel es setzt.
   *
   * **Und er ist so hoch wie das Stück und keine Handbreit höher.** Die erste
   * Küche sperrt ihre Möbel auf mindestens 1,40 m ab, damit niemand über den
   * Tresen turnt — dort ist das Herumgehen die Spielregel. Hier gibt es keine
   * Regel, über die jemand hinwegspringen könnte, und ein Schauraum mit
   * unsichtbaren Wänden über kniehohen Kisten wäre ein Schauraum, in dem man
   * gegen Luft läuft.
   */
  private addBody(piece: DinerPiece, spot: DinerSpot): void {
    const world = this.world;
    if (!world || dinerHangs(piece)) return;
    const height = dinerTop(piece);
    if (height < 0.02) return;
    const size = dinerFootprint(piece, spot.turn ?? 0);
    const tall = Math.max(height, 0.02);
    const shape = new THREE.BoxGeometry(size.w * TILE, tall, size.d * TILE);
    this.shapes.push(shape);
    this.hidden ??= new THREE.MeshBasicMaterial({ visible: false });
    const box = new THREE.Mesh(shape, this.hidden);
    box.name = 'diner-hitbox';
    box.visible = false;
    box.position.set(
      (DINER.x + spot.x + size.w / 2) * TILE,
      DINER_FLOOR + tall / 2,
      (DINER.z + spot.z + size.d / 2) * TILE,
    );
    world.root.add(box);
    box.updateWorldMatrix(true, false);
    this.placed.push(box);
    this.bodies.push({ object: box, body: world.addSolid(box) });
  }

  dispose(): void {
    this.gone = true;
    const world = this.world;
    for (const entry of this.bodies) world?.removeSolid(entry.object, entry.body);
    this.bodies.length = 0;
    // Die Formen der Möbel gehören der Vorlage und werden geteilt
    // (`core/dinerModel.ts`); weggeräumt wird, was hier entstanden ist — die
    // verschmolzenen Reihen und die Kästen darunter.
    for (const object of this.placed) object.removeFromParent();
    this.placed.length = 0;
    for (const shape of this.shapes) shape.dispose();
    this.shapes.length = 0;
    this.hidden?.dispose();
    this.hidden = null;
    this.floor?.dispose();
    this.floor = null;
    this.world = null;
  }
}
