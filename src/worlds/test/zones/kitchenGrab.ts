import { kitchenDeck, type KitchenPiece } from '../../../core/kitchenFit';
import {
  handle,
  rimHandles,
  ringHandles,
  type GrabHandle,
  type GrabSpec,
  type Vec3,
} from '../../../core/grabHandles';
import { TILE } from '../../nav/navTile';
import { PLATE_HEIGHT, PLATE_RADIUS } from './kitchenProps';
import type { KitchenItem } from './kitchenRecipes';

/**
 * **Wo die Hand ein Küchending anfasst** — die Griffe der Küche, und sonst
 * nichts.
 *
 * Das Modell dazu steht im `core` (`core/grabHandles.ts`) und ist von Küchen
 * so frei wie `core/interaction.ts`: ein Griff ist dort eine Stelle mit Lage
 * und Achse, dieselbe Sache wie der Griff einer Pistole. Hier steht die
 * **Tabelle** — welches Ding welche Griffe hat —, und sie steht in der Küche,
 * weil nur die Küche weiß, was ein Stiel ist.
 *
 * Die drei Fälle des Auftrags, Wort für Wort:
 *
 * - **Zutaten** (Brötchen, Tomate, Salat, Patty, Suppe) bekommen **keinen**
 *   Griff. „Beim Greifen von Zutaten brauchen wir kein Handle, sondern nur die
 *   Objekt-Hitbox, also wie bei z. B. Companion Cube." Eine leere Griffliste
 *   sagt genau das, und `grabHandles.HITBOX_HOLD` legt das Ding dann so in die
 *   Faust, wie es dasteht.
 * - **Geräte** — Pfanne und Topf am **Stiel**, der Feuerlöscher **oben** am
 *   Ventil, „ähnlich wie bei der Taschenlampe". Je einer, denn es gibt je
 *   genau eine Stelle, an der ein Mensch sie anfasst.
 * - **Teller**: unsichtbare Griffe **am Rand** und **an der Unterseite** —
 *   „da das die Bereiche sind, wie man einen Teller halten würde". Am Rand
 *   sind es acht, gleichmäßig verteilt: Ein Teller hat keine Vorderseite, und
 *   welcher der acht es wird, entscheidet die Hand (`nearestHandle`).
 *
 * **Und seit dem Umbau ein vierter Fall, der keine Tabelle ist**: die
 * **Möbel**. Sie bekommen ihre vier Rand-Griffe aus einer Regel über den
 * Katalog (`pieceHandles`, ganz unten) — der Mülleimer und die Arbeitsplatte
 * brauchen dafür ausdrücklich keinen eigenen Eintrag, und das ist die
 * Bedingung des Auftrags und nicht meine Bequemlichkeit.
 *
 * **Und alle zusammen greifen nur im Meter** (`GrabSpec.reach`, `'moore'`):
 * kein Nahgreifen, kein Ferngreifen, nur das eigene Feld und die acht daneben.
 * Werkzeuge, Waffen, Gürtelplätze und die Gegenstände der Portal-Welt sagen
 * dazu nichts an und behalten damit alle drei Reichweiten — die Einschränkung
 * steht hier und gilt hier.
 *
 * ## Warum die Maße hereingereicht werden
 *
 * Pfanne, Topf und Feuerlöscher werden **nicht gebaut**, sondern aus dem
 * gekauften Möbelmodell herausgelöst (`core/kitchenModel.takeUtensil`) — ihre
 * Maße stehen in keiner Datei, sondern in `public/models/kitchen.glb`, und ein
 * ausgetauschtes Modell brächte neue mit. Die Griffe hängen deshalb an der
 * **gemessenen Hülle** und nicht an abgeschriebenen Zentimetern: `kitchenGrab`
 * bekommt die Ausdehnung des Netzes und setzt die Griffe als Anteile davon.
 * Wer das Modell tauscht, tauscht damit auch die Griffe, ohne es zu merken.
 *
 * Der **Ursprung** ist dabei derselbe wie überall in dieser Küche: **unten in
 * der Mitte** — so setzt ihn `takeUtensil` für die Geräte, und so baut
 * `kitchenProps.FoodKit.view` alles andere.
 *
 * Reine Rechnung, ohne three.js: Was hier steht, rechnet ein Test nach.
 */

/** Die Ausdehnung eines Netzes in Metern, Ursprung unten in der Mitte. */
export interface ItemSize {
  /** Breite (x) und Tiefe (z) — die ganze, nicht die halbe. */
  readonly width: number;
  readonly depth: number;
  /** Höhe über dem Fuß. */
  readonly height: number;
}

/**
 * **Die Maße, die gelten, solange niemand gemessen hat** — der Teller.
 *
 * Er ist das einzige Ding hier, dessen Maße in einer Datei stehen
 * (`kitchenProps.PLATE_RADIUS`), und er ist zugleich das Maß, an dem in dieser
 * Küche alles andere gebaut ist. Für ein Gerät ohne Messung ist er die
 * ehrlichste Verlegenheit: ungefähr so groß wie ein Teller.
 */
export const DEFAULT_ITEM_SIZE: ItemSize = {
  width: PLATE_RADIUS * 2,
  depth: PLATE_RADIUS * 2,
  height: PLATE_HEIGHT,
};

/**
 * **Wo am Stiel die Faust liegt** — als Anteil der halben Tiefe, vom Ursprung
 * aus nach +z.
 *
 * Bei der Pfanne läuft der Stiel von der Mulde bis zum Ende der Hülle
 * (`core/kitchenFit.PAN_BOWL` rechnet vor, dass die Mulde 22,5 cm neben dem
 * Ursprung sitzt): Sein hinteres Drittel ist das Stück, das in der Faust
 * liegt. 0,72 legt den Griff genau dorthin und lässt vorn genug Stiel, dass
 * die Mulde nicht auf den Fingern sitzt.
 */
const STALK_ALONG = 0.72;

/**
 * **Und auf welcher Höhe** — als Anteil der Gesamthöhe.
 *
 * Ein Stiel sitzt oben am Rand der Mulde und nicht auf halber Höhe; zwei
 * Drittel sind die Stelle, an der er bei jedem Topf und jeder Pfanne dieser
 * Bauart ansetzt.
 */
const STALK_LIFT = 0.66;

/**
 * **Wie hoch am Feuerlöscher die Hand liegt** — als Anteil seiner Höhe.
 *
 * „Oben, da wo er eben zum Betätigen bzw. Greifen wäre": Das ist der Hals
 * unter dem Ventil, also gut drei Viertel hinauf. Die Achse steht dabei
 * senkrecht und das Vorne zeigt nach -Z — dieselbe Lage wie bei der
 * Taschenlampe, und damit zielt die Düse dorthin, wohin die Hand zeigt.
 */
const NOZZLE_LIFT = 0.78;

/**
 * **Wie weit innen vom Tellerrand** die Finger fassen — ein Anteil des
 * Halbmessers.
 *
 * Genau auf der Kante wäre der Griff auf der Kante, und die Faust läge zur
 * Hälfte neben dem Teller; ein Zwölftel weiter innen liegt sie auf dem Rand.
 */
const RIM_INSET = 0.92;

/** Wie viele Griffe rund um den Tellerrand sitzen. */
export const PLATE_RIM_HANDLES = 8;

/** Alles, was in dieser Küche gegriffen wird, greift nur im Meter. */
export const KITCHEN_REACH = 'moore' as const;

const UP: Vec3 = { x: 0, y: 1, z: 0 };
const RIGHT: Vec3 = { x: 1, y: 0, z: 0 };
const LEFT: Vec3 = { x: -1, y: 0, z: 0 };

/**
 * **Die Griffe eines Küchendings** — leer für alles, was man einfach packt.
 *
 * @param size die gemessene Hülle des Netzes; ohne Angabe die Verlegenheit
 *             oben. Für den Teller wird sie nicht gebraucht — der ist gebaut,
 *             und seine Maße stehen fest.
 */
export function kitchenHandles(
  item: KitchenItem,
  size: ItemSize = DEFAULT_ITEM_SIZE,
): readonly GrabHandle[] {
  switch (item) {
    case 'pan':
    case 'pot':
      // Der Stiel liegt quer in der Faust: seine Richtung **ist** die
      // Griffachse (+z, vom Gerät weg), der Handrücken schaut nach links,
      // damit das Vorne nach unten zeigt — dorthin, wohin die Finger sich
      // unter dem Stiel schließen.
      return [
        handle(
          'stiel',
          { x: 0, y: size.height * STALK_LIFT, z: (size.depth / 2) * STALK_ALONG },
          { x: 0, y: 0, z: 1 },
          LEFT,
        ),
      ];

    case 'extinguisher':
      // Aufrecht in der Faust, wie die Taschenlampe: die Achse senkrecht, das
      // Vorne nach -Z — also zielt die Düse dorthin, wohin die Hand zeigt.
      return [handle('kopf', { x: 0, y: size.height * NOZZLE_LIFT, z: 0 }, UP, RIGHT)];

    case 'plate':
    case 'plate-dirty':
      // Am Rand rundum und einer unter dem Boden. Der Boden steht **zuerst**,
      // weil er der ist, mit dem man einen vollen Teller trägt; die Reihenfolge
      // entscheidet aber nichts — gewählt wird nach Abstand zur Hand.
      return [
        handle('boden', { x: 0, y: 0, z: 0 }, UP, RIGHT),
        ...ringHandles(PLATE_RADIUS * RIM_INSET, PLATE_RIM_HANDLES, PLATE_HEIGHT * 0.5),
      ];

    // **Zutaten haben keinen Griff** — man packt zu, wo man hinfasst.
    case 'bun':
    case 'patty':
    case 'patty-cooked':
    case 'patty-burnt':
    case 'lettuce':
    case 'lettuce-cut':
    case 'tomato':
    case 'tomato-cut':
    case 'tomato-soup':
      return [];

    // **Wasser greift man gar nicht.** Es kommt nur **in** etwas vor — im
    // Topf, den man am Spülbecken füllt (`kitchenCarry.atSink`) — und nie für
    // sich allein. Die Zeile steht hier trotzdem, und zwar als Zeile und
    // nicht als `default`: Ein `default` nähme dem Übersetzer die einzige
    // Stelle, an der er meldet, dass eine neue Zutat noch keine Griffe hat.
    // Genau das hat diese hier gemeldet, als sie dazukam.
    case 'water':
      return [];
  }
}

/**
 * **Was ein Küchending über das Greifen sagt** — Griffe und Reichweite in
 * einem, so wie `InteractionSpec.grab` es haben will.
 */
export function kitchenGrab(item: KitchenItem, size?: ItemSize): GrabSpec {
  return { handles: kitchenHandles(item, size), reach: KITCHEN_REACH };
}

/**
 * **Und was eine Station sagt**, an der gerade nichts zu greifen ist: dieselbe
 * Reichweite, keine Griffe.
 *
 * Eine Arbeitsplatte, auf die man etwas **ablegt**, wird nicht angefasst — sie
 * soll aber genauso wenig aus drei Metern zu bedienen sein wie ein Topf aus
 * drei Metern zu holen. Die Reichweite gilt deshalb für die ganze Küche und
 * nicht nur für das, was in die Hand geht.
 */
export const KITCHEN_STATION_GRAB: GrabSpec = { handles: [], reach: KITCHEN_REACH };

// --- und wo die Hand ein Küchen**möbel** anfasst ---------------------------

/**
 * **Wie weit innen von der Kante die Faust liegt**, in Metern.
 *
 * Genau auf der Kante läge die Faust zur Hälfte neben dem Möbel — dieselbe
 * Überlegung wie beim Tellerrand (`RIM_INSET`), nur in Metern statt als
 * Anteil: Eine Hand ist eine Hand, ob sie einen Mülleimer von 45 cm oder eine
 * Ausgabetheke von zwei Metern packt, und ein Anteil machte den Griff am
 * breiten Möbel breiter, ohne dass die Hand dabei wüchse. Sechs Zentimeter
 * sind die halbe Faust.
 */
export const RIM_GRIP_IN = 0.06;

/**
 * **Die vier Rand-Griffe eines Möbels** — aus einer Regel, nicht aus fünfzehn
 * Einträgen.
 *
 * Der Auftrag sagt es wörtlich: „Küchen Elemente haben unsichtbare
 * Griffe/Handles am Rand (4 Stück), diese können allgemein platziert sein,
 * sodass es nicht für Mülleimer, Arbeitsplatte individuell gesetzt werden
 * müssten." Genau das steht hier — und es ist **eine Zeile Ableitung** über
 * den ganzen Katalog (`core/kitchenFit.KITCHEN_PIECES`), keine Tabelle
 * daneben. Der Mülleimer hat keinen eigenen Eintrag, die Küchenzeile auch
 * nicht, und ein sechzehntes Möbel bekommt seine vier Griffe, ohne dass
 * jemand diese Datei aufmacht. Ein Test hält das fest.
 *
 * Gebaut wird mit `grabHandles.rimHandles` — der Stelle im `core`, die genau
 * dafür angelegt wurde: vier Griffe in der Mitte der vier Seiten, die Achse
 * senkrecht (der Daumen zeigt nach oben, die Finger greifen unter die Kante),
 * das Vorne nach innen. Sie heißen nach der Richtung, in der sie liegen:
 * `+x`, `-x`, `+z`, `-z`.
 *
 * ## Die Grundfläche ist die Kachelzahl
 *
 * Und zwar die aus dem Katalog (`KitchenPiece.tiles`, eine Kachel = 1 m,
 * `worlds/nav/navTile.TILE`). Das ist dieselbe Fläche, die der Umriss am
 * Bauplatz zeigt und die beim Absetzen auf Platz geprüft wird
 * (`kitchenBuild.buildFree`) — wer an der Kante zufasst, die er sieht, fasst
 * damit auch an die Kante, die er gleich hinstellt.
 *
 * **Der Katalogversatz wird dabei nicht herausgerechnet** (`KitchenPiece.align`).
 * Er ist bei genau zwei Möbeln von fünfzehn ungleich null — 3,1 cm beim
 * Schneidebrett, 7,8 cm beim Herd mit der Pfanne — und er verschiebt das
 * **Modell** gegen seine Kachel. Die Griffe hängen im Raum des Modells, also
 * wandern sie mit: Sie sitzen damit am Möbel, das man sieht, und nicht am
 * Gitter, das man nicht sieht. Von den beiden Ungenauigkeiten ist das die
 * ehrlichere.
 *
 * ## Auf welcher Höhe
 *
 * Auf der **Arbeitsfläche** (`core/kitchenFit.kitchenDeck`), gemessen ab Fuß
 * des Möbels — dort, wo auch alles liegt, was darauf steht.
 *
 * Die naheliegende Antwort wäre die **Oberkante** (`KitchenPiece.height`), und
 * sie ist falsch, sobald man sie am Katalog nachschlägt: Beim Spülbecken ist
 * `height` die Spitze der **Armatur** (1,15 m), beim Feuerlöscher die Kappe
 * des **Löschers** (1,25 m), beim Herd mit Topf der **Topfdeckel** (0,87 m).
 * Vier Griffe am Wasserhahn sind keine Griffe. `deck` ist genau die Zahl, die
 * im Katalog eingeführt wurde, um „die Fläche des Möbels" von „das Höchste,
 * was darauf steht" zu unterscheiden — und deshalb ist sie auch hier die
 * richtige.
 *
 * Nachgerechnet über den ganzen Katalog liegt sie damit zwischen **0,45 m**
 * (Spülbecken und Mülleimer) und **0,56 m** (Ausgaberegal): Hüfthöhe bei einem Koch von
 * 1,60 m (`core/chefFit.ts`), also genau dort, wo ein Mensch ein Möbel
 * anfasst, um es zu schieben. Eine feste Zahl für alle wäre bequemer und
 * stünde beim Mülleimer in der Luft oder im Becken; eine Ausnahmeliste für
 * einzelne Möbel wäre das, was der Auftrag ausdrücklich nicht will. **Es
 * braucht keine** — das ist der Prüfstein, und er hält.
 */
export function pieceHandles(piece: KitchenPiece): readonly GrabHandle[] {
  const [wide, deep] = piece.tiles;
  return rimHandles(
    {
      x: Math.max(RIM_GRIP_IN, (wide * TILE) / 2 - RIM_GRIP_IN),
      z: Math.max(RIM_GRIP_IN, (deep * TILE) / 2 - RIM_GRIP_IN),
    },
    kitchenDeck(piece),
  );
}

/**
 * **Was ein Möbel über das Greifen sagt** — vier Rand-Griffe und derselbe
 * Meter wie alles andere in dieser Küche.
 *
 * Ein aufgehobenes Möbel ist im Umbau nichts anderes als ein sehr großes
 * Brötchen (`worlds/test/zones/kitchen.ts`, `setLive`), also gilt für es
 * dieselbe Reichweite: **kein Nahgreifen, kein Ferngreifen** — nur das eigene
 * Feld und die acht daneben (`KITCHEN_REACH`). Eine Küchenzeile, die aus drei
 * Metern in die Hände flöge, wäre der Fall, den `'moore'` verhindern soll, und
 * zwar der sichtbarste.
 */
export function kitchenPieceGrab(piece: KitchenPiece): GrabSpec {
  return { handles: pieceHandles(piece), reach: KITCHEN_REACH };
}
