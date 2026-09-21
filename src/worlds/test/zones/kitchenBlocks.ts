import { kitchenPiece, type KitchenPiece } from '../../../core/kitchenFit';
import { TILE } from '../../nav/navTile';
import { KITCHEN } from '../layout';
import { KITCHEN_FLOOR, KITCHEN_SPOTS, footprint, type Spot, type Turn } from './kitchenPlan';

/**
 * **Die Sperren der Küche — gerechnet aus dem Katalog, ohne eine einzige
 * Datei.**
 *
 * Der Grundriss wusste schon immer, wo ein Möbel steht, auch wenn die Datei
 * nie ankommt (`kitchenPlan.stampKitchen`): Jedes Stück verteuert seine
 * Kacheln, und der NPC geht um den Tresen herum statt hindurch. Für den
 * **Spieler** galt das nicht — sein Hindernis entstand erst, wenn das Modell
 * geladen war (`kitchen.ts`, `place` → `addBody`), und bis dahin lief er durch
 * die halbe Küche hindurch. Zwei Meinungen darüber, wo eine Wand steht, und
 * die langsamere gewann: Auf einer gedrosselten Leitung sind das mehrere
 * Sekunden, in denen die Küche ein leerer Raum mit Fliesenboden ist.
 *
 * Diese Datei ist die eine Wahrheit dazu: **Kachel und Katalogmaß → Kasten in
 * Weltmetern**, und sonst nichts. Kein three.js, keine Physik, keine Szene —
 * dieselbe Trennung wie zwischen `core/kitchenFit.ts` und
 * `core/kitchenModel.ts`, und aus demselben Grund: Was eine Rechnung ist, wird
 * von Jest nachgerechnet und nicht im Headset nachgesehen.
 *
 * Und dieselbe Reihenfolge wie überall, wo ein Katalogstück hingestellt wird:
 * erst die Körper, dann die Bilder — und die Körper auch ohne Bild. Die Küche
 * kennt davon mehr Fälle als jeder andere Raum: gebaute Möbel und gehobene
 * Stücke.
 */

/**
 * **Wie hoch ein Küchenmöbel für die Füße mindestens ist**, in Metern.
 *
 * Ein Tresen ist einen halben Meter hoch, und der Spieler springt mit 4,4 m/s
 * ab — das ist gut ein Meter Scheitelhöhe (`PhysicsLocomotion.jumpSpeed`).
 * Ohne diese Zahl steht man nach dem ersten Sprung **auf** der Küchenzeile und
 * läuft die ganze Wand entlang, über Spüle und Herd hinweg.
 *
 * Anderthalb Köpfe über dem Tresen, und damit ein gutes Stück über dem, was
 * ein Sprung hergibt. Der Kasten ist unsichtbar (`kitchen.ts`, `addBody`), das
 * Möbel darunter bleibt einen halben Meter hoch — man greift also weiter über
 * den Tresen, man steigt nur nicht mehr darauf.
 *
 * Sie steht hier und nicht mehr in der Zone, weil die Rechnung hier steht;
 * `zones/kitchen.ts` reicht sie weiter (`export *`), damit die Physik sie
 * unter dem Namen wiederfindet, unter dem sie dort zitiert wird.
 */
export const BLOCK_HEIGHT = 1.4;

/**
 * **Die dünnste Sperre, die noch eine ist**, in Metern — dieselbe Zahl wie in
 * `kitchen.boxAt`.
 *
 * Eine Box von null Höhe hat keine Hülle, und aus keiner Hülle macht Rapier
 * ein Würfelchen von 10 cm an der falschen Stelle (`docs/agents/architektur.md`,
 * _Alles, worauf jemand steht, braucht Dicke_).
 */
const MIN_BLOCK = 0.02;

/**
 * **Ein Kasten in Weltmetern** — Mitte, Maße, fertig.
 *
 * `y` ist die **Mitte** und nicht die Unterkante: Genau so steht der Kasten
 * später in der Szene, und ein Test, der eine Zahl mit der Position eines
 * Netzes vergleicht, soll nicht erst die halbe Höhe dazurechnen müssen.
 */
export interface KitchenBlock {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
  readonly h: number;
  readonly d: number;
}

/**
 * **Wo ein Möbel steht** — so viel, wie für den Kasten nötig ist.
 *
 * Ein `Spot` aus dem Aufbau erfüllt das von selbst; der **Umbau** reicht
 * dagegen die Kachel ein, auf der das Möbel gerade abgesetzt wird, und die ist
 * nicht die aus dem Plan (`kitchen.ts`, `dropPiece`).
 */
export interface BlockStand {
  /** Die nordwestliche Kachel der Grundfläche, relativ zur Zone. */
  readonly x: number;
  readonly z: number;
  readonly turn?: Turn;
  /** Steht es über einem anderen Möbel (`Spot.lift`), bekommt es keinen. */
  readonly lift?: number;
}

/**
 * **Der Kasten unter einem Möbel — oder `null`, wo keiner hingehört.**
 *
 * Zwei Fälle sind ausdrücklich durchlässig, und beide sind es schon, seit es
 * den Kasten gibt:
 *
 * - **Ein hängendes Stück** (`KitchenPiece.hanging`) — darunter läuft man
 *   durch. In dieser Fassung des Katalogs tut es keines; das Feld wartet auf
 *   die nächste Dunstabzugshaube.
 * - **Ein gehobenes Stück** (`Spot.lift`) — das Ausgaberegal hängt über der
 *   Theke, und die hat ihren Kasten bereits. Ein zweiter darüber wäre eine
 *   unsichtbare Wand über der Durchreiche, durch die gerade nichts mehr
 *   ginge.
 *
 * Alles andere ist ein Kasten in der Größe seiner **Kachelfläche**, mit dem
 * Fuß auf dem Küchenboden — auch das Möbel, das im Estrich steckt
 * (`KitchenPiece.bury`): Der Kasten steht auf dem Boden, also reicht er so
 * weit, wie das Möbel darüber hinausragt, und nicht drei Zentimeter höher.
 */
export function kitchenBlock(piece: KitchenPiece, stand: BlockStand): KitchenBlock | null {
  if (piece.hanging || stand.lift) return null;
  const size = footprint(piece, stand.turn ?? 0);
  const stands = piece.height - (piece.bury ?? 0);
  const h = Math.max(stands, BLOCK_HEIGHT, MIN_BLOCK);
  return {
    x: (KITCHEN.x + stand.x + size.w / 2) * TILE,
    y: KITCHEN_FLOOR + h / 2,
    z: (KITCHEN.z + stand.z + size.d / 2) * TILE,
    w: size.w * TILE,
    h,
    d: size.d * TILE,
  };
}

/** Ein Kasten und die Stelle im Aufbau, zu der er gehört. */
export interface KitchenBlockSpot {
  readonly spot: Spot;
  readonly block: KitchenBlock;
}

/**
 * **Die ganze Küche als Sperren, bevor die erste Datei angefragt ist.**
 *
 * Das ist die Liste, mit der die Zone die Küche fest macht
 * (`kitchen.ts`, `build`) — in einem Zug und ohne `await` davor. Was danach
 * geladen wird, stellt sich in einen Kasten, der schon steht, und macht keinen
 * zweiten daneben: Die Maße kommen aus demselben Katalog, aus dem die Küche
 * überhaupt aufgebaut ist, und der gewinnt gegen die Hülle eines Netzes. Ein
 * Möbel, dessen Datei fehlt, bleibt so eine Wand — genau die Zusage, die der
 * Grundriss den NPCs längst gibt.
 *
 * **Die gebauten Stücke sind dabei** (`KitchenPiece.built`, Bänder, Mixer,
 * sichere Kochstelle): Sie stehen ohnehin sofort, und ihr Kasten ist derselbe
 * — eine Liste für alle ist eine Wahrheit weniger als zwei.
 */
export function kitchenBlocks(): readonly KitchenBlockSpot[] {
  const found: KitchenBlockSpot[] = [];
  for (const spot of KITCHEN_SPOTS) {
    const piece = kitchenPiece(spot.name);
    if (!piece) continue;
    const block = kitchenBlock(piece, spot);
    if (block) found.push({ spot, block });
  }
  return found;
}
