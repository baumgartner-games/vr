import * as THREE from 'three';
import { canLoadModels } from '../../../core/chefFit';
import type { NavRect } from '../../nav/navBuild';
import { TILE } from '../../nav/navTile';
import { checkerTexture } from '../../shared/environment';
import { KITCHEN, centre } from '../layout';
import { KITCHEN_FLOOR } from './kitchenPlan';

/**
 * **Der Boden der Küche** — kariert, wie man es aus einer Küche kennt.
 *
 * Bis eben war er nichts als die graue Steinmasse aus dem Grundriss
 * (`kitchenPlan.stampKitchen`) — und grau ist in der Sicht von oben genau das,
 * was der Rest des Geländes auch ist: eine Fläche, auf der Möbel stehen. Eine
 * Küche fängt aber nicht dort an, wo ein Herd steht, sondern dort, wo der
 * **Boden** sagt, dass man drinnen ist. Der Stein liegt weiter darunter; was
 * hier dazukommt, ist der Belag darauf.
 *
 * **Warum ein eigenes Material und keine neue Sorte im Gitter.** Der
 * naheliegende Weg wäre ein neunter Eintrag in `grid/solids.PlanSolidKind`
 * gewesen — und er wäre an drei Stellen falsch:
 *
 * - Eine Sorte entscheidet dort ausdrücklich über **Farbe, Härte und Portale,
 *   und sonst nichts** (`grid/solids.ts`); ihr Material ist eine Zeile in
 *   `GRID_COLORS`, also genau ein Ton. Ein Muster kann sie gar nicht tragen,
 *   ohne dass der gemeinsame Weg (`GridWorld.buildMaterial`) einen Sonderfall
 *   für einen einzigen Namen bekommt.
 * - Die Palette ist absichtlich klein („acht Töne, und mehr sollen es nicht
 *   werden"), und sie gehört **jeder** Gitterwelt: Küchenfliesen stünden im
 *   Bauplatz, im Dunkelhaus und in jeder gespeicherten Weltdatei
 *   (`grid/worldFile.GRID_KINDS`) zur Auswahl — ein Stoff, der überall außer
 *   in dieser einen Küche nichts bedeutet.
 * - Und die Kachelung ginge nicht auf: Alle Quader einer Sorte teilen sich
 *   **ein** Material, eine Masse ist **ein** Quader, und seine Netzkoordinaten
 *   laufen von 0 bis 1 über die ganze Fläche. Ein Schachbrett darauf wäre
 *   vierundzwanzig Meter je Feld groß.
 *
 * Hier weiß dagegen genau einer, wie groß die Fläche ist — die Küche selbst —,
 * und deshalb rechnet sie die Wiederholung aus ihrem eigenen Rechteck aus
 * (`checkerRepeat`).
 *
 * **Gezeichnet wird trotzdem nicht neu**: Das Schachbrett kommt aus demselben
 * Zeichner wie der Boden bis zum Horizont (`shared/environment.checkerTexture`),
 * samt Farbraum, Mipmaps und `anisotropy`. Zwei Schachbretter aus zwei
 * Zeichnern wären zwei Gelegenheiten, eine dieser Einstellungen zu vergessen.
 */

/**
 * **Wie groß ein Feld ist**: ein halber Meter, also eine **halbe** Kachel.
 *
 * Zwei Gründe, und sie ziehen in dieselbe Richtung:
 *
 * - **Es soll nach Fliesen aussehen.** Draußen ist ein Feld einen Meter groß
 *   (`shared/environment.CHECKER_TILE`) — das ist ein Raster zum Abzählen von
 *   Wegstrecken und keine Fliese. Eine Fliese, neben der ein Koch von 1,60 m
 *   steht, ist handgroß bis kniehoch; ein halber Meter ist das Größte, was
 *   noch als Belag durchgeht.
 * - **Es muss am Kachelraster kleben.** Ein Teiler von `TILE` und nichts
 *   anderes: Auf jede Kachel gehen damit genau zwei mal zwei Felder, jede
 *   Fuge liegt auf einer halben oder ganzen Kachelkante, und kein Möbel steht
 *   schräg über einem Feld. Bei 0,4 m liefe das Muster über vierundzwanzig
 *   Meter zweimal aus der Kachel heraus und wieder hinein.
 */
export const KITCHEN_CHECKER = TILE / 2;

/**
 * **Die beiden Töne** — warmes Cremeweiß und dunkler Schiefer.
 *
 * Sie sind gegen den Boden **daneben** gewählt und nicht für sich allein: Die
 * Küche grenzt ohne Zaun an das Schachbrett des Geländes (`HORIZON_COLORS`),
 * und das ist grau auf weiß — zwei helle, kühle Töne mit wenig Abstand
 * zueinander. Ein weiteres Grau daneben wäre aus der Vogelperspektive dasselbe
 * Brett mit einer anderen Feldgröße.
 *
 * Also **dunkler und wärmer**: Das helle Feld hat einen Gelbstich (Creme statt
 * Weiß), das dunkle liegt weit unter allem, was draußen vorkommt. Der Sprung
 * zwischen den beiden Feldern ist damit gut doppelt so groß wie der draußen —
 * und genau dieser Sprung ist es, den man aus 16 m Höhe zuerst sieht. Die
 * Kante zwischen beiden Böden liest sich dadurch als **Schwelle**: hier hört
 * die Wiese auf, hier fängt der Raum an. Ein Test hält beides fest
 * (`kitchenFloor.test.ts`).
 */
export const KITCHEN_CHECKER_LIGHT = 0xe7ddc9;
export const KITCHEN_CHECKER_DARK = 0x2f3946;

/**
 * **Die Fuge** — ein dunkler Strich um jedes Feld, mit 22 % Deckkraft
 * (`gridCanvas`).
 *
 * Dunkel und nicht hell: Auf dem cremefarbenen Feld ist sie damit die Fuge,
 * die man aus jeder Küche kennt, und auf dem schiefergrauen verschwindet sie —
 * dort tut die Kante zwischen den Feldern die Arbeit ohnehin schon. Eine helle
 * Fuge wäre der umgekehrte Fall und hätte das helle Feld zerschnitten.
 */
export const KITCHEN_CHECKER_JOINT = 0x6f6a5e;

/**
 * **Wie weit die Fliesen über dem Estrich liegen**, in Metern.
 *
 * Zwei Millimeter, und keine null: Der Steinboden aus dem Grundriss bleibt
 * genau so stehen, wie er ist — er trägt den Körper, auf dem gelaufen wird,
 * und seine Oberkante ist die Höhe, auf der jedes Möbel der Küche steht
 * (`kitchenPlan.KITCHEN_FLOOR`). Zwei Flächen auf **derselben** Höhe streiten
 * dagegen um jeden Bildpunkt und flackern gegeneinander (Z-Fighting), und zwar
 * genau dann, wenn die Kamera flach darübersteht. Dieselbe Handbreit, aus der
 * die Gitterlinien über ihrem Boden liegen (`GridWorld`, `GRID_LINE_LIFT`),
 * nur zehnmal feiner: Mehr Abstand bräuchte es erst, wenn jemand den Boden aus
 * hundert Metern ansieht, und weniger reicht dem Tiefenpuffer nicht.
 */
export const KITCHEN_CHECKER_LIFT = 0.002;

/**
 * **Wie oft die Leinwand über ein Rechteck geht** — in Kacheln gerechnet.
 *
 * Die Leinwand trägt zwei mal zwei Felder (`gridCanvas`), bei halben Feldern
 * also genau einen Quadratmeter. Über ein Rechteck aus ganzen Kacheln kommt
 * damit eine **ganze** Zahl heraus, und das ist der Punkt: Eine krumme
 * Wiederholung hieße, dass das Muster an einem Rand mitten in einem Feld
 * abgeschnitten wird — und dann läuft die Fuge quer unter der Küchenzeile
 * durch, statt an ihr entlang.
 */
export function checkerRepeat(rect: NavRect): { x: number; z: number } {
  const canvas = KITCHEN_CHECKER * 2;
  return { x: (rect.w * TILE) / canvas, z: (rect.d * TILE) / canvas };
}

/**
 * **Der Belag** — eine Fläche über der ganzen Zone, mehr ist es nicht.
 *
 * Eine Ebene und kein Quader: Der Quader darunter steht schon im Grundriss und
 * hat einen Körper; ein zweiter an derselben Stelle wäre ein zweiter Kollider
 * um nichts. Was hier dazukommt, ist ausschließlich das Bild.
 *
 * **Ohne Leinwand gibt es keine** (`core/chefFit.canLoadModels`): Unter Jest
 * gibt es kein `document`, und eine Zone, die dort beim Bauen stehenbleibt,
 * nimmt jeden Test mit, der die Küche nur nachrechnen wollte.
 */
export class KitchenFloor {
  private mesh: THREE.Mesh | null = null;
  private texture: THREE.CanvasTexture | null = null;

  /**
   * **Das Rechteck kommt von außen**, seit es eine zweite Küche gibt
   * (`zones/diner.ts`): Derselbe Belag, ein anderer Raum. Ohne Angabe ist es
   * die erste Küche — die zweihundert Stellen, die ihn dort erwarten, sollen
   * nicht wegen eines zweiten Aufrufers umgeschrieben werden.
   */
  constructor(root: THREE.Object3D, rect: NavRect = KITCHEN, name = 'kitchen-floor') {
    if (!canLoadModels()) return;

    const texture = checkerTexture(
      KITCHEN_CHECKER_LIGHT,
      KITCHEN_CHECKER_JOINT,
      KITCHEN_CHECKER_DARK,
    );
    const repeat = checkerRepeat(rect);
    texture.repeat.set(repeat.x, repeat.z);
    this.texture = texture;

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(rect.w * TILE, rect.d * TILE),
      // Seidig und nicht matt: Der Boden des Geländes ist rau (0,95), eine
      // gewischte Fliese ist es nicht — der Unterschied im Glanz sagt schon
      // vor jedem Muster, dass hier ein anderer Belag liegt.
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.04 }),
    );
    mesh.name = name;
    // Flach hingelegt, und die Mitte der Zone ist die Mitte der Fläche: Die
    // Kachelmitte der Nordwestkachel plus die halbe Ausdehnung der übrigen.
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(
      centre(rect.x) + ((rect.w - 1) * TILE) / 2,
      KITCHEN_FLOOR + KITCHEN_CHECKER_LIFT,
      centre(rect.z) + ((rect.d - 1) * TILE) / 2,
    );
    mesh.receiveShadow = true;
    root.add(mesh);
    this.mesh = mesh;
  }

  dispose(): void {
    this.mesh?.removeFromParent();
    this.mesh?.geometry.dispose();
    // Das Material gehört dieser Fläche allein — und die Leinwand darin auch:
    // `Material.dispose()` gibt seine Texturen nicht mit frei.
    (this.mesh?.material as THREE.Material | undefined)?.dispose();
    this.texture?.dispose();
    this.mesh = null;
    this.texture = null;
  }
}
