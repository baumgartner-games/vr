import { kitchenDeck, type KitchenPiece } from '../../../core/kitchenFit';
import {
  handle,
  holdBar,
  rimHandles,
  ringHandles,
  type GrabHandle,
  type GrabSpec,
  type Vec3,
} from '../../../core/grabHandles';
import { TILE } from '../../nav/navTile';
import { PLATE_HEIGHT, PLATE_RADIUS } from './kitchenProps';
import type { KitchenItem } from './kitchenRecipes';
import { CHEF_CARRY } from '../../../core/chefFit';

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
 * - **Geräte** — und sie sind seit diesem Auftrag **Haltezylinder**
 *   (`core/grabHandles.holdBar`): die Pfanne am Stiel, der Topf an seinen
 *   **zwei** Ohren, der Feuerlöscher oben am Hals. Jede dieser Stangen ist am
 *   Modell gemessen, jede ist mit _Griffe anzeigen_ zu sehen, und daran prüft
 *   man sie nach — ein Punkt mit einer geratenen Achse war genau die Auskunft,
 *   die man nicht nachsehen konnte, und alle drei standen falsch herum.
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
 * **Der Stiel der Pfanne**, als Anteile der gemessenen Hülle — die beiden
 * Enden der Stange, an der die Faust liegt.
 *
 * Nachgemessen am Modell (`public/models/kitchen.glb`, Netz `stove-pan`,
 * Material `Kitchen_Utensils`), und zwar an **derselben Hülle, die auch das
 * Spiel misst**: Ursprung unten in der Mitte, halber Küchenmaßstab
 * (`kitchenModel.takeUtensil`, `kitchen.markHandles`). Sie ist 62,8 cm breit,
 * 1,079 m tief und 12,8 cm hoch. Der Stiel darin ist zweierlei:
 *
 * - ein **rundes Rohr** von `along` 0,19 bis 0,78, das dabei von 7,6 cm auf
 *   9,3 cm Durchmesser zunimmt — das Stück, das die Faust umschließt;
 * - eine **flache Fahne** am Ende (2,9 cm dick, 10 cm breit — die Aufhängung),
 *   von 0,78 bis 1,00. Sie ist es, die der Hülle ihre Tiefe gibt, deshalb
 *   steht die Spitze bei genau 1,0.
 *
 * Die Achse des Rohrs steigt gemessen um **7,4°** (Mitten von Scheiben quer zu
 * z: bei `along` 0,20 liegt sie auf `lift` 0,340, bei 0,775 auf 0,654), die
 * Fahne sitzt bei `lift` 0,82. Die Stange von 0,34 nach 0,82 legt beides
 * zusammen und steigt dabei um **8,1°**; über den ganzen Stiel bleibt sie
 * damit höchstens **4 mm** neben der gemessenen Achse — bei 4,6 cm Halbmesser
 * steckt sie also überall im Rohr. Ein Test rechnet genau das nach.
 *
 * **Hier stand vorher 0,38/0,30 bis 0,83/1,00, und das war nicht falsch**:
 * 8,7° statt 8,1°, ein halbes Grad, und der Zylinder lag im Bild schon auf dem
 * Stiel. Die Rückmeldung aus der Brille — „der Zylinder-Halter muss weiter
 * nach vorne gekippt werden, so 20° mehr" — meint deshalb **nicht** diese
 * Zahlen; sie meint die **Faust**, und die steht eine Zeile tiefer
 * (`PAN_GRIP_PITCH`). Geändert hat sich hier nur, dass der Fuß der Stange
 * jetzt dort sitzt, wo das Rohr aus der Mulde wächst (0,20 statt 0,30), und
 * nicht drei Zentimeter weiter hinten im Nichts.
 *
 * **Warum die Mitte und nicht das hintere Drittel.** Hier stand einmal ein
 * einzelner Punkt bei 0,72 der halben Tiefe, und er war nicht falsch — er
 * liegt anderthalb Zentimeter neben der Mitte dieser Stange. Nur beantwortete
 * er die Frage nicht, um die es geht: Ein Punkt kann man nicht sehen, eine
 * Stange schon (`core/handleView.ts`), und deshalb steht jetzt die Stange da.
 */
const PAN_STALK = {
  tip: { lift: 0.82, along: 1.0 },
  neck: { lift: 0.34, along: 0.2 },
} as const;

/**
 * **Wie dick der Pfannenstiel ist**, als Halbmesser in Metern.
 *
 * Die eine Zahl in dieser Datei, die **kein** Anteil der Hülle ist, und das
 * mit Absicht: Ein Anteil wovon? Die Dicke eines Stiels hat mit der Breite
 * einer Pfanne nichts zu tun — sie ist die Dicke eines Rohrs und am Modell
 * gemessen: Das Rohr ist an seiner dicksten Stelle (`along` 0,75) **9,3 cm**
 * quer, also 4,6 cm im Halbmesser, und zur Mulde hin dünner (7,6 cm dort, wo
 * die Stange anfängt). Hier stand 0,048 aus einer früheren, gröberen Messung
 * („9,6 cm Durchmesser"), also anderthalb Millimeter zu viel selbst an der
 * dicksten Stelle. Dass ein Zylinder auf einem sich verjüngenden Rohr
 * irgendwo herausschaut, lässt sich mit **einem** Halbmesser nicht vermeiden —
 * dann lieber an der dicksten Stelle bündig als überall zu fett. Wer das
 * Modell tauscht, misst hier nach; dass der Zylinder dann noch im Ding steckt,
 * sagt der Test daneben.
 */
const PAN_STALK_RADIUS = 0.046;

/**
 * **Wie weit die Faust am Pfannenstiel nach vorn kippt**, im Bogenmaß — und
 * warum sie überhaupt kippt.
 *
 * Die Rückmeldung aus der Quest, Wort für Wort: „Die Pfanne in VR wird schon
 * gut gehalten, aber der Griff bzw. der Zylinder-Halter muss weiter nach vorne
 * gekippt werden, sodass es noch mehr dem Griff der Pfanne entspricht. Ich
 * vermute so 20° mehr." Nachgerechnet sind es **20,7°**, und sie bestehen aus
 * zwei Teilen, die beide gemessen sind und von denen keiner geraten ist:
 *
 * - **8,1°** — so weit steigt der Stiel in der Pfanne selbst (`PAN_STALK`).
 *   Die Faustachse (`+Y` des Griffrahmens) stand bisher auf der Senkrechten
 *   der Pfanne, also **schräg** auf der Stange, die sie hält: 81,9° statt 90°.
 *   Eine Faust um einen Zylinder steht senkrecht darauf, sonst ist es keine.
 * - **12,6°** — die Neigung, mit der **jedes** Werkzeug dieses Projekts im
 *   Griffraum sitzt (`portal/tools/gripFit.STANDARD_GRIP`, −0,22 rad). Für
 *   eine Pistole ist sie richtig, und die Pfanne kippt sie genauso weit nach
 *   vorn: Die Mulde hing damit 12,6° schräg, und der Stiel lief nicht
 *   waagerecht durch die Faust, sondern stieg um 20,7° an.
 *
 * Beides zusammen herausgedreht, und der Stiel liegt in der Hand
 * **waagerecht** — das ist genau die Drehung, die aus der Brille gemeldet
 * wurde, und sie ist nachgerechnet und nicht nachgestellt. Die Pfanne lehnt
 * sich dabei um die 8,1° des Stiels nach hinten, also mit der Mulde zum
 * Träger: Ein Stiel, der waagerecht in der Faust liegt, hebt das hintere Ende
 * einer Pfanne — bei einer echten Pfanne genauso, und lieber so herum als
 * nach vorn, wo alles herausrutscht.
 *
 * **Das Vorne bleibt, wie es war** (`AHEAD`): Die Mulde liegt weiterhin vor
 * der Faust, der Stiel zeigt zum Handgelenk zurück. Es kippt nur die Achse,
 * und sie kippt in der Ebene, in der auch der Stiel steigt.
 *
 * Die 0,22 stehen hier **abgeschrieben** und nicht importiert: Diese Datei ist
 * die Tabelle der Küche und soll nicht am Werkzeugraum der Portal-Welt hängen
 * (dieselbe Überlegung wie bei `grabHandles.MOORE_TILE`). Dass beide Zahlen
 * dieselbe sind, hält ein Test fest — wer dort die −0,22 anfasst, bekommt ihn
 * rot.
 */
const PAN_GRIP_PITCH = 0.22;

/**
 * **Wo die beiden Ohren des Topfes sitzen** — Anteile der gemessenen Hülle,
 * und zwar für das Ohr auf der **+x**-Seite; das andere ist an der Mittelachse
 * gespiegelt.
 *
 * Auch das ist gemessen (`stove-pot`) und nicht gedacht: Die beiden Ohren
 * stehen sich gegenüber, ihre Verbindungslinie liegt aber **9° schräg** zur
 * x-Achse. Neun Grad klingen nach nichts und sind hier sechs Zentimeter — bei
 * einer Stange von 2,4 cm Halbmesser also der Unterschied zwischen „der
 * Zylinder liegt auf dem Griff" und „daneben". Deshalb steht `shift` hier und
 * nicht eine glatte Null.
 *
 * `out` ist der Abstand von der Mitte als Anteil der halben Breite, `lift` die
 * Höhe als Anteil der Gesamthöhe (die Ohren sitzen oben am Rand, kurz unter
 * dem Deckel), `shift` der Versatz quer dazu als Anteil der halben Tiefe, und
 * `along` die Richtung der Stange — quer zum Radius, wie bei einem Bügel.
 */
const POT_EAR = {
  out: 0.88,
  lift: 0.86,
  shift: -0.19,
  along: { x: 0.123, y: 0, z: 0.992 },
  /** Halbe Länge der Stange, als Anteil der halben Tiefe. */
  half: 0.45,
} as const;

/** Wie dick ein Topfohr ist, als Halbmesser in Metern — gemessen wie oben. */
const POT_EAR_RADIUS = 0.024;

/**
 * **Der Bügel des Feuerlöschers** — die Stange oben, an der man ihn trägt, in
 * Anteilen der gemessenen Hülle.
 *
 * Hier stand einmal ein Punkt „oben am Ventil", auf der Mittelachse und auf
 * drei Vierteln der Höhe — also **im Blech** und nicht an einem Griff. Am
 * Modell gibt es einen: der Tragebügel liegt quer über dem Ventil, läuft
 * entlang x und ist mit 10 cm Durchmesser genau eine Faust dick. Genau
 * darauf liegt jetzt die Hand, und man sieht es nach (_Griffe anzeigen_).
 *
 * `across` ist die Mitte als Anteil der halben Breite (der Bügel sitzt
 * gegenüber der Düse, also nach -x versetzt), `lift` die Höhe als Anteil der
 * Gesamthöhe — fast ganz oben: zwischen Bügel und Hebel, wo die Finger
 * liegen, und der Löscher hängt darunter —, `shift` der kleine
 * Versatz quer dazu, und `half` die halbe Länge als Anteil der halben Breite.
 */
const NOZZLE_BAR = {
  across: -0.29,
  lift: 0.93,
  shift: 0.11,
  half: 0.49,
} as const;

/** Wie dick der Bügel ist, als Halbmesser in Metern — gemessen wie oben. */
const NOZZLE_RADIUS = 0.035;

/**
 * **Wohin der Feuerlöscher zielt**, im Raum seines Netzes: nach **+x**.
 *
 * Auch das ist am Modell abgelesen und nicht geraten — dort ragt die schwarze
 * Düse nach +x aus dem Kopf heraus, der Bügel nach -x. Vorher stand hier -z,
 * und deshalb zeigte die Düse in der Faust nach **rechts** statt nach vorn:
 * genau die Vierteldrehung nach links, die der Auftrag verlangt.
 */
const NOZZLE_AHEAD: Vec3 = { x: 1, y: 0, z: 0 };

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
/** Vom Griff aus **nach vorn**, wenn der Körper des Dings bei -z liegt. */
const AHEAD: Vec3 = { x: 0, y: 0, z: -1 };

/**
 * **Die Pfanne am Stiel.**
 *
 * Die Stange ist der gemessene Stiel (`PAN_STALK`), nach vorn kommt die Mulde,
 * und die **Faustachse steht senkrecht auf der Stange** statt auf der
 * Senkrechten der Pfanne: Sie kippt um die Steigung des Stiels nach vorn und
 * um die Neigung des Standardgriffs dazu (`PAN_GRIP_PITCH`). Damit liegt der
 * Stiel in der Hand **waagerecht**, die Mulde vor der Faust und nach oben
 * offen, und der Stiel zeigt zum Handgelenk zurück — so, wie man eine Pfanne
 * trägt, und so, wie es aus der Brille verlangt wurde.
 *
 * Die Steigung wird dabei **nicht eingetragen, sondern ausgerechnet**, und
 * zwar aus den beiden Enden der Stange, die selbst Anteile der gemessenen
 * Hülle sind. Ein ausgetauschtes Modell mit einem steileren Stiel dreht damit
 * auch die Faust mit, ohne dass jemand diese Datei aufmacht — dasselbe
 * Versprechen wie bei den Anteilen, und aus demselben Grund: Eine Zahl, die
 * man beim Modelltausch nachpflegen müsste, ist die, die man vergisst.
 *
 * Vorher stand ihr **Stiel** in der Faustachse, und das war der zuerst
 * gemeldete Fehler in zwei Teilen: Er zeigte erstens von der Mulde **weg**
 * (die Pfanne hing hinter der Faust statt vor ihr), und zweitens machte er die
 * Pfanne hochkant, weil eine Faustachse in der Brille senkrecht steht. Beides
 * zusammen ist die halbe Drehung um die Hochachse plus die Vierteldrehung um
 * die Querachse, die der Auftrag beschrieb. Was jetzt dazukommt, ist die
 * dritte, viel kleinere Drehung derselben Baustelle — die 20°, um die der
 * Halter noch nach vorn fehlte.
 */
function panStalk(size: ItemSize): GrabHandle {
  const half = size.depth / 2;
  const tip = { x: 0, y: size.height * PAN_STALK.tip.lift, z: half * PAN_STALK.tip.along };
  const neck = { x: 0, y: size.height * PAN_STALK.neck.lift, z: half * PAN_STALK.neck.along };
  // Wie steil der gemessene Stiel ansteigt — und die Achse senkrecht darauf,
  // um die Neigung des Standardgriffs weiter nach vorn gekippt.
  const rise = Math.atan2(tip.y - neck.y, tip.z - neck.z);
  const tilt = rise + PAN_GRIP_PITCH;
  const up: Vec3 = { x: 0, y: Math.cos(tilt), z: -Math.sin(tilt) };
  return holdBar('stiel', { from: tip, to: neck, radius: PAN_STALK_RADIUS }, up, AHEAD);
}

/**
 * **Der Topf an seinen beiden Ohren** — und das ist der zweite Teil desselben
 * Fehlers.
 *
 * Er hatte bis eben den **Stiel der Pfanne**: dieselbe Zeile, dieselben
 * Anteile, also einen Griff mitten in der Suppe. Ein Topf hat keinen Stiel, er
 * hat zwei Ohren, sie stehen sich gegenüber, und welches davon gemeint ist,
 * entscheidet wie beim Teller die Hand (`nearestHandle`). Sie heißen nach der
 * Seite, auf der sie liegen: `ohr-x` und `ohr+x`.
 *
 * Oben bleibt die Senkrechte des Topfes — ein Topf, der sich beim Anfassen
 * legt, schüttet sein Wasser aus —, und nach vorn kommt der Topf selbst: Er
 * steht damit **vor** der Faust und nicht neben ihr.
 */
function potEars(size: ItemSize): readonly GrabHandle[] {
  const wide = size.width / 2;
  const deep = size.depth / 2;
  const made: GrabHandle[] = [];
  for (const side of [1, -1] as const) {
    const at = {
      x: side * POT_EAR.out * wide,
      y: size.height * POT_EAR.lift,
      z: side * POT_EAR.shift * deep,
    };
    const reach = {
      x: side * POT_EAR.along.x * POT_EAR.half * deep,
      y: 0,
      z: side * POT_EAR.along.z * POT_EAR.half * deep,
    };
    // Nach vorn liegt die Mitte des Topfes, also der Weg vom Ohr dorthin.
    const inward = Math.hypot(at.x, at.z) || 1;
    made.push(
      holdBar(
        `ohr${side > 0 ? '+' : '-'}x`,
        {
          from: { x: at.x + reach.x, y: at.y, z: at.z + reach.z },
          to: { x: at.x - reach.x, y: at.y, z: at.z - reach.z },
          radius: POT_EAR_RADIUS,
        },
        UP,
        { x: -at.x / inward, y: 0, z: -at.z / inward },
      ),
    );
  }
  return made;
}

/**
 * **Der Feuerlöscher am Tragebügel.**
 *
 * Die Stange ist der Bügel über dem Ventil (`NOZZLE_BAR`), oben bleibt die
 * Senkrechte des Löschers — er hängt unter der Faust, wie man ihn trägt —, und
 * nach vorn zeigt die **Düse**. Das ist die Vierteldrehung nach links, die der
 * Auftrag nennt: Vorher zielte der Löscher quer zur Hand, jetzt dorthin, wohin
 * die Hand zeigt, und der Strahl folgt ihr (`kitchen.spray`).
 */
function extinguisherNeck(size: ItemSize): GrabHandle {
  const wide = size.width / 2;
  const reach = NOZZLE_BAR.half * wide;
  const at = {
    x: NOZZLE_BAR.across * wide,
    y: NOZZLE_BAR.lift * size.height,
    z: NOZZLE_BAR.shift * (size.depth / 2),
  };
  return holdBar(
    'buegel',
    {
      from: { x: at.x - reach, y: at.y, z: at.z },
      to: { x: at.x + reach, y: at.y, z: at.z },
      radius: NOZZLE_RADIUS,
    },
    UP,
    NOZZLE_AHEAD,
  );
}

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
      return [panStalk(size)];

    case 'pot':
      return potEars(size);

    case 'extinguisher':
      return [extinguisherNeck(size)];

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
 * (Spülbecken und Mülleimer) und **0,75 m** (Computer-Tisch): Hüft- bis
 * Brusthöhe bei einem Koch von 1,60 m (`core/chefFit.ts`), also genau dort, wo
 * ein Mensch ein Möbel anfasst, um es zu schieben. Eine feste Zahl für alle
 * wäre bequemer und stünde beim Mülleimer in der Luft oder im Becken; eine
 * Ausnahmeliste für einzelne Möbel wäre das, was der Auftrag ausdrücklich
 * nicht will. **Es braucht keine** — das ist der Prüfstein, und er hält.
 *
 * **Die obere Zahl war einmal 0,56 m**, und sie ist nicht gestiegen, weil die
 * Regel nachgegeben hätte, sondern weil der Katalog ein Möbel bekommen hat,
 * das keine Arbeitsplatte ist: Der Computer-Tisch hat seine Platte auf 0,75 m
 * (`worlds/test/zones/kitchenDesk.DESK_TOP`), einen Viertelmeter über der
 * Zeile, weil man daran steht und nicht darauf schneidet. Genau hier zahlt
 * sich das Ableiten aus: Sein Griff wanderte mit, ohne dass jemand eine Zeile
 * dafür geschrieben hätte. Eine Zahl, die man beim Eintragen eines Möbels
 * nachpflegen müsste, wäre die, die man vergisst.
 */
export function pieceHandles(piece: KitchenPiece): readonly GrabHandle[] {
  const [wide, deep] = piece.tiles;
  return rimHandles(
    {
      x: Math.max(RIM_GRIP_IN, (wide * TILE) / 2 - RIM_GRIP_IN),
      z: Math.max(RIM_GRIP_IN, (deep * TILE) / 2 - RIM_GRIP_IN),
    },
    Math.min(kitchenDeck(piece), PIECE_GRIP_HIGH),
  );
}

/**
 * **Und höher als bis hierher fasst niemand ein Möbel an**, in Metern.
 *
 * Die Griffhöhe kommt aus der **Ablage** des Möbels (`kitchenDeck`), und das
 * ist für eine Küchenzeile, einen Herd und einen Computer-Tisch genau richtig:
 * Wer schiebt, fasst dort an, wo die Platte ist. Für ein Möbel, dessen Ablage
 * **über** der Brust liegt, ist es das nicht — und seit die Tellerausgabe eine
 * Kiste auf der Zeile ist (`core/kitchenFit.ts`, `plate-counter`), gibt es so
 * eines: Ihre Teller liegen auf 0,85 m, und das ist beim Koch von 1,60 m
 * fingerbreit unter den Augen (`core/chefFit.CHEF_EYE`, 0,914 m).
 *
 * 0,62 m ist die Höhe, auf der die Figur ohnehin etwas vor dem Bauch trägt
 * (`core/chefFit.CHEF_CARRY`) — also genau die Höhe, auf der ihre Hände sind.
 * Abgeleitet und nicht gewählt: Wächst der Koch, wächst der Griff mit.
 */
const PIECE_GRIP_HIGH = CHEF_CARRY.y;

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
