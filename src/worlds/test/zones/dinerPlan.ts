import type { GridPlan } from '../../grid/gridPlan';
import { DIR_E, DIR_N, DIR_W } from '../../nav/navTile';
import { type DinerPiece, dinerPiece } from '../../../core/dinerFit';
import { DINER } from '../layout';

/**
 * **Der Aufbau der zweiten Küche** — welches Stück wo steht und was es im
 * Grundriss belegt. Ohne Szene, ohne Netz, ohne three.js.
 *
 * Dieselbe Teilung wie bei der ersten Küche (`zones/kitchenPlan.ts` neben
 * `zones/kitchen.ts`) und aus demselben Grund: `worlds/test/testPlan.ts`
 * stempelt den Grundriss, lange bevor ein Modell geladen ist, und
 * `testPlan.test.ts` rechnet ihn nach — beide wollen den Aufbau und nicht die
 * Zone.
 *
 * **Was hier nicht steht, ist Spiel.** Die erste Küche ist eine Maschine:
 * Stationen, Uhren, Rezepte, Bänder, ein Baumodus. Diese hier ist ein
 * **eingerichteter Raum** — man läuft hindurch und sieht, was der zweite
 * Baukasten hergibt, wenn man ihn wirklich aufbaut. Deshalb hat `DinerSpot`
 * drei Felder und `kitchenPlan.Spot` zehn: Es gibt hier nichts, was etwas
 * ausgibt, annimmt oder zählt, und ein Feld, das niemand liest, ist eine
 * Zusage, die niemand hält.
 *
 * **Den Schauraum dahinter gibt es nicht mehr.** Er stellte jedes der 156
 * Stücke einzeln auf vierundvierzig Kacheln — ein Katalog zum Abgehen, und
 * genau den gibt es jetzt am Rechner in der ersten Küche
 * (`shared/construct.ts`). Zwei Kataloge nebeneinander sind einer zu viel,
 * und der, für den man ein Zimmer durchqueren muss, ist der schlechtere.
 */

/** Wie viele Viertelumdrehungen ein Stück gedreht wird — wie in der ersten Küche. */
export type Turn = 0 | 1 | 2 | 3;

/** Ein Stück in der zweiten Küche: welches, wo, wie herum. */
export interface DinerSpot {
  /** Der Name aus dem Katalog (`core/dinerFit.DINER_PIECES`). */
  readonly name: string;
  /** Die Nordwestkachel seiner Grundfläche, **relativ zur Zone**. */
  readonly x: number;
  readonly z: number;
  /** Vierteldrehungen; 0 ist, wie es aus der Datei kommt (Vorderseite nach Süden). */
  readonly turn?: Turn;
}

/**
 * **Wo der Fußboden der zweiten Küche liegt**, in Metern — zwei Zentimeter
 * über dem Gelände, genau wie bei der ersten (`kitchenPlan.KITCHEN_FLOOR`).
 *
 * Dieselbe Zahl und nicht dieselbe Konstante: Die der ersten Küche gehört
 * ihrem Estrich, und wer sie hier importierte, könnte sie dort nicht mehr
 * ändern, ohne diesen Raum mitzuheben.
 */
export const DINER_FLOOR = 0.02;

/**
 * **Was eine Kachel unter einem Möbel kostet.**
 *
 * Derselbe Aufschlag wie in der ersten Küche: Ein NPC geht dann um den Tresen
 * herum statt hindurch. Verboten wird die Kachel nicht — ein Möbel ist ein
 * Hindernis und keine Wand, und wer eine Küche für NPCs unbetretbar macht,
 * bekommt eine Küche, die keiner betritt.
 */
const FURNITURE_COST = 8;

/**
 * **Ein Gästetisch mit Stühlen ringsum** — der Tisch auf seiner Grundfläche,
 * je Randkachel ein Stuhl, jeder zum Tisch gedreht.
 *
 * Eine Funktion und keine acht Zeilen je Tisch: Im Gastraum stehen sechs
 * davon, und sechsmal dieselben acht Zeilen sind acht Gelegenheiten, einen
 * Stuhl mit dem Rücken zum Tisch zu stellen.
 *
 * **Je Randkachel einer und nicht vier je Tisch.** Der erste Anlauf setzte
 * genau vier — Norden, Süden, Westen, Osten —, und bei einem Tisch von zwei
 * mal zwei Kacheln stand damit **keiner** mittig: Ein Stuhl belegt eine
 * Kachel, ein Tisch zwei, und die Mitte der einen liegt um einen halben Meter
 * neben der Mitte der anderen. Auf dem Bild sah das aus, als hätte jemand die
 * Stühle im Vorbeigehen abgestellt. Je Randkachel einer steht dagegen
 * **symmetrisch** zur Tischmitte — acht Stühle um einen runden Tisch von
 * anderthalb Metern, und das ist ein Lokal und keine Sitzecke.
 *
 * Die Drehung ist die **Blickrichtung des Stuhls**: `turn: 0` heißt
 * „Vorderseite nach Süden", ein Stuhl nördlich des Tisches sieht also mit
 * `turn: 0` auf ihn.
 */
function guestTable(name: string, x: number, z: number, chair: string): DinerSpot[] {
  const [w, d] = dinerPiece(name)?.tiles ?? [1, 1];
  const spots: DinerSpot[] = [{ name, x, z }];
  for (let dx = 0; dx < w; dx++) {
    spots.push({ name: chair, x: x + dx, z: z - 1, turn: 0 });
    spots.push({ name: chair, x: x + dx, z: z + d, turn: 2 });
  }
  for (let dz = 0; dz < d; dz++) {
    spots.push({ name: chair, x: x - 1, z: z + dz, turn: 3 });
    spots.push({ name: chair, x: x + w, z: z + dz, turn: 1 });
  }
  return spots;
}

/**
 * **Das Restaurant** — die Küche an der Nordwand, die Insel davor, die
 * Durchreiche und der Gastraum dahinter.
 *
 * Derselbe Aufbau wie in jeder Küche dieses Spiels (`zones/kitchenPlan.ts`:
 * Geräte an der Wand, eine Insel, die Ausgabe), und das ist Absicht: Zwei
 * Küchen nebeneinander, die aus zwei Katalogen dasselbe bauen, zeigen den
 * Unterschied zwischen den Katalogen. Zwei verschieden aufgebaute Küchen
 * zeigten den Unterschied zwischen den Aufbauten.
 *
 * Die Kachelzahlen sind **zonenlokal** (x 0…23, z 0…23); wo die Zone liegt,
 * steht in `layout.DINER`.
 */
const ROOM: readonly DinerSpot[] = [
  // --- die Zeile an der Nordwand, Vorderseite nach Süden ---------------------
  // Gerade Stücke an den Enden dieser Zeile und keine Eckstücke: Eine Ecke
  // gehört an eine Ecke, und hier läuft die Zeile gerade durch. Ansehen kann
  // man die vier Ecktypen im Möbelkatalog am Rechner der ersten Küche.
  { name: 'kitchencounter_straight_B_backsplash', x: 1, z: 1 },
  { name: 'kitchencounter_straight_A_backsplash', x: 2, z: 1 },
  { name: 'kitchencounter_sink_backsplash', x: 3, z: 1 },
  { name: 'kitchencounter_straight_B_backsplash', x: 4, z: 1 },
  { name: 'kitchencounter_straight_A_backsplash', x: 5, z: 1 },
  { name: 'stove_multi', x: 6, z: 1 },
  { name: 'stove_single', x: 7, z: 1 },
  { name: 'kitchencounter_straight_B_backsplash', x: 8, z: 1 },
  { name: 'oven', x: 9, z: 1 },
  { name: 'pizza_oven', x: 10, z: 1 },
  { name: 'kitchencounter_straight_A_backsplash', x: 12, z: 1 },
  { name: 'kitchencounter_straight_A_backsplash', x: 13, z: 1 },
  // Kühl- und Vorratsschrank am Ostende der Zeile.
  { name: 'fridge_A', x: 15, z: 1 },
  { name: 'fridge_B', x: 16, z: 1 },
  { name: 'icecream_machine', x: 18, z: 1 },

  // --- was über der Zeile hängt ---------------------------------------------
  // Auf **denselben** Kacheln wie die Möbel darunter, und das geht, weil ein
  // hängendes Stück keinen Körper und keinen Wegaufschlag bekommt
  // (`DinerPiece.foot` > 0, siehe `stampDiner`). Ein Hängeschrank auf einer
  // eigenen Kachel wäre ein Hängeschrank mitten im Raum.
  { name: 'kitchencabinet', x: 2, z: 1 },
  { name: 'kitchencabinet_styleB', x: 3, z: 1 },
  { name: 'kitchencabinet_half', x: 4, z: 1 },
  { name: 'extractorhood', x: 6, z: 1 },
  { name: 'extractorhood', x: 7, z: 1 },
  { name: 'kitchencabinet_corner', x: 12, z: 1 },
  { name: 'wall_tiles_A', x: 5, z: 1 },
  { name: 'wall_tiles_B', x: 8, z: 1 },

  // --- die Insel ------------------------------------------------------------
  { name: 'kitchentable_A_large', x: 3, z: 4 },
  { name: 'kitchentable_sink', x: 5, z: 4 },
  { name: 'kitchentable_B', x: 6, z: 4 },
  { name: 'kitchentable_B_large', x: 7, z: 4 },
  { name: 'kitchentable_A', x: 9, z: 4 },
  { name: 'dishrack_plates', x: 10, z: 4 },
  { name: 'kitchentable_sink_large', x: 12, z: 4 },

  // --- der Vorrat an der Westwand, Vorderseite nach Osten --------------------
  { name: 'crate_buns', x: 1, z: 4, turn: 1 },
  { name: 'crate_steak', x: 1, z: 5, turn: 1 },
  { name: 'crate_lettuce', x: 1, z: 6, turn: 1 },
  { name: 'crate_tomatoes', x: 1, z: 7, turn: 1 },
  { name: 'crate_cheese', x: 1, z: 8, turn: 1 },
  { name: 'crate_onions', x: 1, z: 9, turn: 1 },

  // --- die Durchreiche zum Gastraum -----------------------------------------
  { name: 'kitchencounter_straight_A', x: 3, z: 8 },
  { name: 'kitchencounter_straight_A', x: 4, z: 8 },
  { name: 'kitchencounter_straight_decorated', x: 5, z: 8 },
  { name: 'kitchencounter_straight_A', x: 6, z: 8 },
  { name: 'kitchencounter_straight_B', x: 7, z: 8 },
  { name: 'kitchencounter_straight_A_decorated', x: 8, z: 8 },
  { name: 'kitchencounter_straight_A', x: 9, z: 8 },
  { name: 'kitchencounter_straight_B', x: 10, z: 8 },
  { name: 'pizzabox_stacked', x: 12, z: 8 },

  // --- der Gastraum ---------------------------------------------------------
  ...guestTable('table_round_A', 3, 12, 'chair_A'),
  ...guestTable('table_round_B_tablecloth_red', 8, 12, 'chair_B'),
  ...guestTable('table_round_A_decorated', 13, 12, 'chair_A'),
  ...guestTable('table_round_B_tablecloth_green', 3, 17, 'chair_B'),
  ...guestTable('table_round_A_small_decorated', 8, 17, 'chair_stool'),
  ...guestTable('table_round_B_tablecloth_red_decorated', 13, 17, 'chair_A'),
  // Zwei Säulen im Gastraum: Der Raum ist 24 Kacheln breit, und eine Halle
  // ohne irgendetwas darin sieht aus wie eine Halle und nicht wie ein Lokal.
  { name: 'pillar_A', x: 18, z: 12 },
  { name: 'pillar_B', x: 18, z: 17 },
  { name: 'menu', x: 11, z: 10 },
];

/**
 * **Alle Stücke der zweiten Küche.**
 *
 * Getrennt von `kitchenPlan.KITCHEN_SPOTS`, und zwar mit Absicht: Die Tests
 * der ersten Küche zählen über ihre Liste ab, dass es **genau einen** Herd mit
 * Pfanne und **genau eine** Ausgabetheke gibt (`kitchenPlan.test.ts`). Eine
 * zweite Küche in derselben Liste verdoppelte jede dieser Zahlen, und die
 * Zusage, die dabei zerbräche, ist keine Formsache — an ihr hängt, dass eine
 * Runde überhaupt endet.
 */
export const DINER_SPOTS: readonly DinerSpot[] = ROOM;

/**
 * **Wie viele Kacheln ein Stück belegt, so herum, wie es steht** — Breite und
 * Tiefe tauschen bei einer Vierteldrehung die Plätze.
 *
 * Dieselbe Rechnung wie `kitchenPlan.footprint`, und trotzdem hier noch
 * einmal: Die dortige nimmt einen `KitchenPiece`, und die beiden Kataloge
 * haben keine gemeinsame Oberklasse — sie haben nur zufällig beide ein Feld
 * `tiles`. Eine gemeinsame Schnittstelle für zwei Zahlen zu erfinden, wäre
 * mehr Bindung als Ersparnis.
 */
export function dinerFootprint(piece: DinerPiece, turn: Turn): { w: number; d: number } {
  const [w, d] = piece.tiles;
  return turn % 2 === 0 ? { w, d } : { w: d, d: w };
}

/**
 * **Ob ein Stück hängt** — dann bekommt es keinen Körper und keinen
 * Wegaufschlag.
 *
 * `foot > 0` heißt: Das Stück fängt über dem Boden an. Ein Hängeschrank
 * beginnt bei 1,00 m, eine Dunstabzugshaube ebenso, die Wandfliesen bei
 * 0,50 m — darunter läuft man durch. Eine Kachel, die das teuer machte, wäre
 * eine Kachel, um die ein NPC grundlos herumginge; ein Körper darin wäre eine
 * Wand aus Luft.
 *
 * Die erste Küche führt dasselbe Feld als `KitchenPiece.hanging`, und **kein**
 * Stück ihrer Quelle setzt es. Hier setzen es zwölf, und deshalb steht die
 * Regel hier als Funktion und nicht als Flag im Katalog: Sie ist gemessen und
 * nicht eingetragen.
 */
export function dinerHangs(piece: DinerPiece): boolean {
  return (piece.foot ?? 0) > 0;
}

/**
 * **Die zweite Küche in den Grundriss stempeln** — Estrich, drei Wände, und
 * unter jedem Möbel eine teurere Kachel.
 *
 * Nach Süden offen wie die erste: Dort kommt man herein, und eine vierte Wand
 * wäre eine Wand mit einer Tür darin, die niemand zumacht.
 *
 * **Die Möbel verteuern ihre Kacheln, auch wenn die Datei nie ankommt.** Der
 * Grundriss wird gestempelt, bevor irgendein Modell geladen ist, und ein
 * Möbel, das nur im Bild existiert, ist ein Möbel, durch das gelaufen wird.
 */
export function stampDiner(plan: GridPlan): void {
  const east = DINER.x + DINER.w - 1;
  const south = DINER.z + DINER.d - 1;

  plan.mass('stone', DINER, -0.06, DINER_FLOOR);

  plan.run(DINER.x, DINER.z, DINER.w, 'x', (x, z) => plan.wall(x, z, DIR_N));
  for (let z = DINER.z; z <= south; z++) {
    plan.wall(DINER.x, z, DIR_W);
    plan.wall(east, z, DIR_E);
  }

  for (const spot of DINER_SPOTS) {
    const piece = dinerPiece(spot.name);
    if (!piece || dinerHangs(piece)) continue;
    const size = dinerFootprint(piece, spot.turn ?? 0);
    for (let dz = 0; dz < size.d; dz++) {
      for (let dx = 0; dx < size.w; dx++) {
        plan.floor(
          { x: DINER.x + spot.x + dx, z: DINER.z + spot.z + dz, w: 1, d: 1 },
          { cost: FURNITURE_COST },
        );
      }
    }
  }
}

/** Das Schild am Eingang — was hier steht und woher es kommt. */
export function fitDiner(plan: GridPlan): void {
  plan.putFixture({
    id: 'schild-zweite-kueche',
    kind: 'sign',
    x: DINER.x + 1,
    z: DINER.z + DINER.d - 1,
    dir: DIR_W,
    props: {
      text: [
        '# Die zweite Küche',
        '',
        'Möbel aus *Restaurant Bits* von Kenney, CC0 — siehe',
        '`public/models/CREDITS.md`. Ein zweiter Baukasten neben dem der',
        'ersten Küche, und ein anderer: 156 Stücke, **ein** Material, **eine**',
        'Textur.',
        '',
        '- An der Nordwand: die Zeile mit Spüle, zwei Herden, Backofen und',
        '  Pizzaofen, darüber Hängeschränke und zwei Abzugshauben',
        '- Davor: die Insel aus Arbeitstischen und Spültischen',
        '- An der Westwand: der Vorrat in Kisten',
        '- Quer davor: die Durchreiche zum Gastraum',
        '- Im Süden: sechs Gästetische mit Stühlen',
        '',
        '## Gespielt wird hier nicht',
        '',
        'Das ist die erste Küche nebenan (südlich, über den Gang an der',
        'Westwand entlang): Stationen, Rezepte, Bänder, Baumodus. Dieser Raum',
        'ist ein **eingerichteter Katalog** — er zeigt, was der zweite',
        'Baukasten hergibt, damit man entscheiden kann, was davon in ein Spiel',
        'gehört.',
        '',
        'Den **Schauraum** dahinter gibt es nicht mehr: Jedes einzelne Stück',
        'steht jetzt im Möbelkatalog am Rechner der ersten Küche, und den hat',
        'man beim Bauen in der Hand statt zwei Zimmer weiter.',
        '',
        '## Was nicht mitgekommen ist',
        '',
        'Von den 225 Stücken des Baukastens fehlen 69: Pizzen, Eintöpfe, Eis',
        'und dreißig Zutaten, für die es kein Rezept gibt. **Zehn Zutaten sind',
        'da** — Brötchen, Patty, Salat, Tomate —, und die stehen nicht nur',
        'hier: Sie sind das Essen der ersten Küche nebenan',
        '(`zones/kitchenProps.ts`), die es bis vor kurzem aus Zylindern baute.',
      ].join('\n'),
    },
  });
}
