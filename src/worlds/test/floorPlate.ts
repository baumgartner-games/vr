import type { PlateTile } from '../shared/plateField';
import { KITCHEN } from './layout';

/**
 * **Welche Platte auf welche Kachel gehört** — die ganze Entscheidung, und
 * nichts als sie.
 *
 * Eine eigene Datei aus demselben Grund wie `layout.ts` daneben: Sie ist
 * **reine Rechnung**, sie importiert kein three.js, und damit ist sie das
 * Einzige an diesem Boden, was man ohne Brille prüfen kann
 * (`floorPlate.test.ts`). Was eine Platte auf der Grafikkarte ist, steht in
 * `shared/plateFloor.ts`; wo die Kacheln liegen, rechnet
 * `shared/plateField.floorPlateSpots`; **welche** dort liegt, steht hier.
 *
 * Drei Regeln, und jede beantwortet eine eigene Frage:
 *
 * - **Die Küche bekommt keine.** Sie hat ihren eigenen, feineren Boden, und
 *   das ist Absicht (siehe `KITCHEN`, unten).
 * - **Das Obergeschoss bekommt Stein.** Der Auftrag dazu ist wörtlich: „für
 *   die obere Ebene einen Steinboden statt des Prototyp-Bodens."
 * - **Alles andere bekommt den Prototyp-Boden** — das Gelände, die Zonen, die
 *   Gänge, die Treppenstufen und die Schürze draußen.
 */

/**
 * **Der Prototyp-Boden** — `prototype-bits/Floor_Prototype.glb`.
 *
 * Vier Kandidaten liegen in demselben Paket, alle vier 4 × 4 Quelleinheiten
 * groß und alle vier auf demselben Atlas. Nachgemessen an den Dateien:
 *
 * | Datei             | Höhe  | Dreiecke | was darauf ist                    |
 * | ----------------- | ----- | -------- | --------------------------------- |
 * | `Primitive_Floor` | 1,000 | **12**   | ein nackter Würfel                |
 * | `Floor_Prototype` | 0,500 | **20**   | eine umlaufend gefaste Oberkante  |
 * | `Floor`           | 0,500 | **52**   | dieselbe Fase, dazu ein Innenfeld |
 * | `Floor_Dirt`      | 0,530 | **120**  | Erde und Geröll obenauf           |
 *
 * `Primitive_Floor` ist der billigste und zugleich der nutzloseste: ein Würfel
 * ohne jede Kante sieht aus wie das, was hier ersetzt werden soll — eine
 * Fläche mit einem Muster darauf. `Floor_Dirt` bringt Geröll mit, und Geröll
 * zerlegt das Raster, um das es geht; sechsmal so viele Dreiecke kosten es
 * obendrein. `Floor` legt in dieselbe Platte noch zwei eingelassene Rahmen —
 * hübsch für einen Raum, und bei 34 553 Platten der Unterschied zwischen
 * 691 000 und 1,8 Millionen Dreiecken je Bild, für ein Muster, das ab zwanzig
 * Metern niemand mehr auseinanderhält.
 *
 * Bleibt `Floor_Prototype`. Ihre Fase ist nachgemessen: Die Oberseite liegt
 * 0,1 Quelleinheiten über dem Rand und steht an jeder Seite 0,1 nach innen —
 * bei einer Platte von einem Meter also eine Schräge von 2,5 cm, in 45° rings
 * um jede Fuge. Genau die macht aus einem gemusterten Rechteck eine Platte,
 * und sie kostet acht Dreiecke. Es ist auch die, die bestellt wurde.
 */
export const PLATE_PROTOTYPE = 'prototype-bits/Floor_Prototype.glb';

/**
 * **Der Steinboden des Podests** — `dungeon/floor_tile_small.glb`.
 *
 * Zwei Kandidaten standen im Auftrag, beide aus demselben Paket und auf
 * demselben Atlas. Nachgemessen an den Dateien, mit dem Maßstab des Pakets
 * (`core/kaykitFit.KAYKIT_SCALE` = 0,5):
 *
 * | Datei                  | Quelle                | im Spiel               | Dreiecke |
 * | ---------------------- | --------------------- | ---------------------- | -------- |
 * | `floor_tile_small`     | 2,000 × 0,150 × 2,000 | **1,00 × 0,075 × 1,00** | **66**  |
 * | `floor_tile_large`     | 4,000 × 0,150 × 4,000 | 2,00 × 0,075 × 2,00     | 188     |
 *
 * **Die kleine, und zwar ohne Umrechnung.** Sie ist im Spiel genau eine
 * Kachel groß — der Faktor, den `plateFloor.build` ausrechnet, ist bei ihr
 * die Eins, und eine Platte, an der nichts zu skalieren ist, ist eine, die
 * nicht schief werden kann. Die große wäre je Fläche billiger (188 Dreiecke
 * auf vier Kacheln gegen 264), passt aber nicht: Das Deck ist **fünf mal
 * fünf** Kacheln (`zones/podium.DECK`), und fünf durch zwei geht nicht auf —
 * am Rand läge entweder eine halbe Platte oder eine, die über die Brüstung
 * hinausragt. Und sie zweifach zu verkleinern hieße, aus einer 2-m-Platte
 * eine 1-m-Platte zu machen: dieselbe Zeichnung, halb so groß, und damit
 * genau der Fehler, der die Schürze einmal zwei Meter breit gemacht hat.
 *
 * Fünfundzwanzig Platten zu 66 Dreiecken sind 1 650 Dreiecke in **einem**
 * Zeichenaufruf — neben den 691 000 des Prototyp-Bodens ist das nichts.
 */
export const PLATE_STONE = 'dungeon/floor_tile_small.glb';

/**
 * **Die Küche bleibt außen vor** — und zwar genau ihr Rechteck.
 *
 * Sie baut sich ihren Boden selbst: ein feineres Schachbrett mit halben
 * Feldern und eigenen, wärmeren Tönen (`zones/kitchenFloor.ts`). Das ist
 * Absicht und nicht Zufall — „eine Küche fängt nicht dort an, wo ein Herd
 * steht, sondern dort, wo der **Boden** sagt, dass man drinnen ist" —, und
 * ein Prototyp-Raster darunter wäre ein zweiter Belag auf demselben Boden.
 *
 * **Warum `layout.KITCHEN` und nicht `kitchenPlan.inKitchen()`.** Es gibt in
 * der Küche zwei Grenzen, und sie sind verschieden:
 *
 * - `KitchenFloor` legt seine Fläche über **genau dieses Rechteck** — der
 *   Konstruktor nimmt `rect = KITCHEN` als Vorgabe, und die Zone ruft ihn
 *   ohne Argument (`zones/kitchen.ts`). Was ausgespart werden muss, ist
 *   damit exakt das, was dort bedeckt wird: eine Kachel mehr wäre ein
 *   Streifen Prototyp neben den Fliesen, eine weniger ein Streifen Fliesen
 *   ohne Boden darunter.
 * - `inKitchen()` ist die Grenze für die **Augenhöhe** und trägt dafür einen
 *   Meter Vorlauf (`kitchenPlan.KITCHEN_EYE_MARGIN`): Wer hineingeht, soll
 *   nicht im Türrahmen absacken. Dieser Meter gehört zum Gehen und nicht zum
 *   Boden — mit ihm gerechnet bliebe rings um die Küche ein Ring nackter
 *   Geländemasse liegen.
 *
 * Also das Rechteck. Es ist dieselbe Konstante, aus der auch der Belag seine
 * Wiederholung rechnet, und damit können die beiden gar nicht auseinanderlaufen.
 */
function inKitchenTile(col: number, row: number): boolean {
  return (
    col >= KITCHEN.x &&
    col < KITCHEN.x + KITCHEN.w &&
    row >= KITCHEN.z &&
    row < KITCHEN.z + KITCHEN.d
  );
}

/**
 * **Die Entscheidung** — eine Kachel hinein, eine Adresse aus dem Regal oder
 * `null` heraus.
 *
 * Die Etage ist dabei die Frage und nicht die Höhe: Ein Podest liegt auf 2,80
 * m, eine Treppenstufe kann dasselbe tun, und trotzdem ist die Stufe Gelände
 * und das Podest ein Raum. Der Grundriss weiß es (`grid/solids.PlanSolid.level`),
 * also wird er gefragt — geraten wäre es falsch.
 *
 * **Die Küche zuerst**, und ohne Rücksicht auf die Etage: Sie liegt auf Ebene
 * 0 und hätte sonst schon den Prototyp-Boden bekommen, bevor jemand nach ihr
 * fragt — und ein zweites Stockwerk über ihr gibt es nicht (`layout.LEVELS`
 * kennt genau eines, und das ist das Podest). Eine Regel, die über der Küche
 * wieder zugriffe, wäre eine Regel für einen Fall, den es nicht gibt.
 */
export function floorPlate(tile: PlateTile): string | null {
  if (inKitchenTile(tile.col, tile.row)) return null;
  return tile.level > 0 ? PLATE_STONE : PLATE_PROTOTYPE;
}
