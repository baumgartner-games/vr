/**
 * **Der Umbau der Küche** — welche Kachel gerade gemeint ist und ob dort noch
 * Platz ist. Ohne three.js, ohne Szene, ohne Zone.
 *
 * Wie **groß** ein gedrehtes Möbel ist, steht **nicht** hier: Das rechnet
 * `kitchenPlan.footprint` schon aus Katalogmaß und Drehung, und eine zweite
 * Fassung davon wäre die zweite Wahrheit, die beim nächsten Möbel ausschert.
 * Wie **herum** es in den Händen liegt, steht dagegen sehr wohl hier, seit es
 * Möbel mit einer Wirkrichtung gibt: `turnAhead` macht aus der Blickrichtung
 * eine Vierteldrehung, und damit zeigt ein getragenes Förderband dorthin, wohin
 * die Figur zeigt (`kitchen.facePiece`). Alles andere behält beim Aufheben
 * seine Drehung und bekommt anderswo dieselbe wieder — dort dreht der Auslöser
 * (`kitchen.turnPiece`).
 *
 * Bei _Overcooked_ steht die Küche, wie sie steht. Bei _PlateUp_ baut man sie
 * zwischen zwei Tagen selbst um, und genau das ist hier gemeint: ein
 * **Baumodus**, den ein Knopf in der Küche an- und ausschaltet. Ist er an,
 * lässt sich jedes Möbel aufheben und tragen wie die Pfanne — dieselbe Hand,
 * derselbe Knopf, dasselbe Vor-dem-Bauch-Tragen (`kitchen.ts`,
 * `carryInHands`).
 *
 * **Warum die Rechnung hier steht und nicht in der Zone.** Die Zone hängt
 * Netze um und baut Körper; ob eine Kachel frei ist, ist eine Frage über
 * Zahlen. Dieselbe Trennung wie zwischen `kitchenPlan.ts` und `kitchen.ts`,
 * zwischen `kitchenCarry.ts` und der Zone, zwischen `kitchenClock.ts` und dem
 * Herd — und aus demselben Grund: Ein Test rechnet ein Dutzend Fälle in
 * Millisekunden nach, die im Headset eine Viertelstunde Hin- und Herlaufen
 * wären.
 *
 * **Und seit dem Umstellen mit Inhalt steht hier noch eine dritte Frage**: was
 * beim Aufheben **mitfährt** und was dagegen spricht (`BuildLoad`,
 * `ridesAlong`, `whyNotLifted`) — samt der einen Zeile, die aus dem
 * gegriffenen Rand-Griff die Lage in den Händen macht (`holdForRim`). Auch das
 * sind Fragen über Zahlen und Namen, also stehen sie hier und nicht in der
 * Zone, die Netze umhängt.
 *
 * **Gerechnet wird in Kacheln der Zone**, nicht in Metern der Welt: Dieselben
 * Zahlen, mit denen `KITCHEN_SPOTS` geschrieben ist (`kitchenPlan.ts`). Wer
 * hier in Metern rechnete, hätte zwei Koordinatensysteme für eine Küche, und
 * das zweite wäre das, das beim nächsten Verschieben der Zone stehen bleibt.
 */

import type { Turn } from './kitchenPlan';

/** Eine Kachel im Grundriss der Zone. */
export interface BuildTile {
  readonly x: number;
  readonly z: number;
}

/** Was auf dem Grundriss Platz belegt — so viel, wie die Rechnung davon braucht. */
export interface BuildSpot extends BuildTile {
  /** Die Grundfläche in Kacheln, **schon gedreht** (`kitchenPlan.footprint`). */
  readonly w: number;
  readonly d: number;
}

/**
 * **Wie weit vor der Figur die gemeinte Kachel liegt**, in Metern.
 *
 * Eine halbe Kachel und nicht eine ganze: Die Figur steht mit ihren Füßen auf
 * einer Kachel, und wer ein Möbel absetzt, meint die **nächste** — aber die
 * nächste und nicht die übernächste. 0,7 m reicht über die eigene Kachelkante
 * (0,5 m) hinaus und bleibt innerhalb der nächsten; mit einer ganzen Kachel
 * sprang das Ziel bei jedem Schritt um zwei Felder weiter.
 *
 * Dieselbe Größenordnung wie `core/usable.USE_TOUCH` (0,6 m) — was man
 * anfassen kann, indem man davorsteht, soll man auch dort absetzen können, wo
 * man steht.
 */
export const BUILD_AHEAD = 0.7;

/**
 * **Welche Kachel gemeint ist**, wenn die Figur bei `at` steht und nach
 * `forward` schaut.
 *
 * Gerechnet wird **auf dem Boden**, in x und z — aus demselben Grund wie bei
 * der Auswahl des Benutzbaren (`core/usable.pickUsable`): Wer von oben
 * irgendwohin schaut, meint eine Stelle und keine Höhe.
 *
 * `origin` ist die Nordwestecke der Zone in Weltmetern; herausgerechnet wird
 * die Kachel **relativ zur Zone**, also genau die Zahl, die in
 * `kitchenPlan.KITCHEN_SPOTS` steht. Eine Kachel ist einen Meter groß
 * (`worlds/nav/navTile.TILE`) — der Faktor steckt in `tile`, damit er nicht an
 * vier Stellen abgeschrieben wird.
 *
 * Steht die Figur still und schaut nirgendwohin (Richtung der Länge null),
 * gilt die eigene Kachel: Ein Ziel, das bei jedem Stillstand nach Norden
 * sprünge, wäre schlimmer als gar keines.
 */
export function tileAhead(
  at: { x: number; z: number },
  forward: { x: number; z: number },
  origin: { x: number; z: number },
  tile = 1,
  ahead = BUILD_AHEAD,
): BuildTile {
  const length = Math.hypot(forward.x, forward.z);
  const dx = length > 1e-4 ? (forward.x / length) * ahead : 0;
  const dz = length > 1e-4 ? (forward.z / length) * ahead : 0;
  return {
    x: Math.floor((at.x + dx - origin.x) / tile),
    z: Math.floor((at.z + dz - origin.z) / tile),
  };
}

/**
 * **Welche Vierteldrehung in diese Richtung zeigt** — die Drehung, deren
 * Vorderseite dorthin schaut, wohin auch die Figur schaut.
 *
 * Bei `turn: 0` ist vorn Norden (`kitchenPlan.Spot.turn`), eine Umdrehung zeigt
 * nach Westen, zwei nach Süden, drei nach Osten. Das ist dieselbe Reihenfolge
 * wie in `kitchenBelt.beltStep`, und deshalb ist die Antwort für ein Förderband
 * nicht nur eine Drehung, sondern gleich seine **Laufrichtung**: Wer nach Süden
 * schaut und absetzt, hat ein Band gebaut, das nach Süden schiebt.
 *
 * Gerundet wird auf die **längere** der beiden Hälften: Wer nach Südwesten
 * schaut, meint entweder Süden oder Westen, und es gewinnt die Achse, auf der
 * er weiter herausschaut. Genau auf der Diagonale (`|x| === |z|`) gewinnt
 * Nord-Süd — nicht weil sie besser wäre, sondern damit dieselbe Richtung immer
 * dieselbe Drehung ergibt. Ein Band, das bei diagonalem Lauf zwischen zwei
 * Richtungen flackerte, wäre eines, dessen Laufrichtung man erst nach dem
 * Absetzen kennt.
 *
 * Ohne Richtung — die Figur steht und schaut nirgendwohin — bleibt es bei
 * `keep`, also bei der Drehung, die das Möbel schon hat. Dieselbe Antwort wie
 * bei `tileAhead` daneben und aus demselben Grund: Eine Drehung, die bei jedem
 * Stillstand nach Norden spränge, wäre schlimmer als gar keine.
 */
export function turnAhead(forward: { x: number; z: number }, keep: Turn = 0): Turn {
  if (Math.hypot(forward.x, forward.z) < 1e-4) return keep;
  if (Math.abs(forward.x) > Math.abs(forward.z)) return forward.x < 0 ? 1 : 3;
  return forward.z < 0 ? 0 : 2;
}

/** Jede Kachel, die eine Grundfläche ab `spot` belegt. */
export function tilesOf(spot: BuildSpot): BuildTile[] {
  const tiles: BuildTile[] = [];
  for (let dz = 0; dz < Math.max(1, spot.d); dz++) {
    for (let dx = 0; dx < Math.max(1, spot.w); dx++) {
      tiles.push({ x: spot.x + dx, z: spot.z + dz });
    }
  }
  return tiles;
}

/** Ob sich zwei Grundflächen überlappen. */
export function overlaps(a: BuildSpot, b: BuildSpot): boolean {
  return (
    a.x < b.x + Math.max(1, b.w) &&
    b.x < a.x + Math.max(1, a.w) &&
    a.z < b.z + Math.max(1, b.d) &&
    b.z < a.z + Math.max(1, a.d)
  );
}

/**
 * **Ob hier Platz ist** — innerhalb des Grundrisses und nicht auf einem
 * anderen Möbel.
 *
 * `bounds` ist die Zone in Kacheln (`layout.KITCHEN`, aber relativ gelesen:
 * `0 … w-1`, `0 … d-1`). Die Prüfung gegen sie ist kein Zierrat: Ein Möbel,
 * das jemand in die Wand schiebt, ist ein Möbel, das man nie wieder
 * herausbekommt — und ein NPC liefe hinterher durch die Lücke, die dadurch im
 * Wegenetz entsteht (`kitchenPlan.stampKitchen`).
 *
 * `taken` sind die belegten Flächen; das Möbel, das gerade in der Hand liegt,
 * steht nicht darin (es wurde beim Aufheben herausgenommen) — deshalb braucht
 * es hier kein „außer diesem".
 */
export function buildFree(
  spot: BuildSpot,
  taken: readonly BuildSpot[],
  bounds: { w: number; d: number },
): boolean {
  if (spot.x < 0 || spot.z < 0) return false;
  if (spot.x + Math.max(1, spot.w) > bounds.w) return false;
  if (spot.z + Math.max(1, spot.d) > bounds.d) return false;
  return !taken.some((other) => overlaps(spot, other));
}

/**
 * **Warum es hier nicht geht** — ein Satz, der sagt, was im Weg ist.
 *
 * Aus demselben Grund wie `kitchenCarry.KitchenDeed.refuse` seinen Satz
 * mitträgt: Wer drückt und nichts passiert, soll lesen können, warum, statt zu
 * raten. `null` heißt: Es geht.
 */
export function whyNotBuilt(
  spot: BuildSpot,
  taken: readonly BuildSpot[],
  bounds: { w: number; d: number },
): string | null {
  if (
    spot.x < 0 ||
    spot.z < 0 ||
    spot.x + Math.max(1, spot.w) > bounds.w ||
    spot.z + Math.max(1, spot.d) > bounds.d
  ) {
    return 'Das steht dann außerhalb der Küche';
  }
  if (taken.some((other) => overlaps(spot, other))) return 'Hier steht schon etwas';
  return null;
}

// --- und was dabei mitfährt ------------------------------------------------

/**
 * **Was auf einem Möbel liegt und was daran läuft**, so wie der Umbau es
 * sieht — und mehr braucht er nicht.
 *
 * Keine Teller, keine Pfannen, keine Uhren: Ob das Patty roh oder gebraten
 * ist, geht den Umbau nichts an. Er will wissen, **ob** etwas mitfährt und
 * **ob etwas dagegen spricht** — zwei Fragen, drei Zahlen, und alle drei kann
 * ein Test hinschreiben, ohne eine Küche zu bauen.
 */
export interface BuildLoad {
  /** Wie viele einzelne Dinge auf der Fläche liegen (`Station.on`: 0 oder 1). */
  readonly things: number;
  /** Wie viele Teller darauf gestapelt sind (`Station.stack`). */
  readonly stack: number;
  /** Ob es brennt (`kitchenClock.StoveState.fire`). */
  readonly burning: boolean;
}

/** Ein leeres Möbel — was für die meisten immer gilt. */
export const EMPTY_LOAD: BuildLoad = { things: 0, stack: 0, burning: false };

/**
 * **Ob beim Aufheben etwas mitfährt** — und damit beim Absetzen wieder
 * hingestellt werden muss.
 *
 * Der Satz des Auftrags: „wenn zb eine Pfanne auf dem Herd steht. Dann wird
 * dieses Element so mit Pfanne darauf bewegt." Es zählt beides, was auf der
 * Fläche liegt **und** was darauf gestapelt ist: Auf der Ausgabe liegen
 * Teller, auf dem Abtropfbrett stehen sie zu viert, und ein Stapel, der beim
 * Umstellen stehen bliebe, stünde danach in der Luft.
 */
export function ridesAlong(load: BuildLoad): boolean {
  return load.things > 0 || load.stack > 0;
}

/**
 * **Warum dieses Möbel jetzt nicht in die Hände darf** — ein Satz, oder
 * `null`, weil es darf.
 *
 * Hier stand bis eben die Sperre, um die es im Auftrag geht: „Was darauf
 * liegt, bleibt der Grund, es **nicht** zu tun." Die ist weg. Ein Herd wird
 * mit seiner Pfanne umgestellt, eine Ausgabe mit ihren Tellern, ein
 * Abtropfbrett mit seinem Stapel — das ist der ganze Punkt, und `ridesAlong`
 * daneben sagt, wann es etwas zu tragen gibt.
 *
 * **Ein Grund bleibt, und es ist das Feuer.** Ein brennender Herd
 * (`kitchenClock.StoveState.fire`) ist der eine Zustand dieser Küche, der
 * nicht wartet: Er frisst sich weiter, und ausgemacht wird er mit dem
 * Feuerlöscher **in der Hand** (`kitchenSpray.sprayOn`). Wer ihn aufhöbe,
 * hätte beide Hände voll Herd, bekäme den Löscher nicht mehr zu fassen und
 * liefe mit einem Feuer vor dem Bauch durch die Küche. Es gibt in dieser
 * Küche keinen zweiten Weg, ein Feuer auszumachen — also darf es gar nicht
 * erst in die Hände.
 *
 * **Warum kein Wort über volle Hände.** Wer umbaut, trägt nichts: Das
 * Anschalten räumt die Hände (`kitchen.setEditing`), und solange umgebaut
 * wird, kommt auch nichts hinein — die Spüle behandelt den Umbau wie eine
 * volle Hand und lässt den sauberen Teller im Wasser stehen
 * (`kitchen.workFrame`). Ein Möbel und ein Topf zugleich gibt es also nicht,
 * und ein Satz darüber wäre einer, den nie jemand zu lesen bekommt.
 *
 * @param label wie das Möbel heißt — der Satz nennt es beim Namen, wie jede
 *              andere Absage dieser Küche auch (`whyNotBuilt`,
 *              `kitchenCarry.KitchenDeed.refuse`)
 */
export function whyNotLifted(label: string, load: BuildLoad): string | null {
  return load.burning ? `${label} brennt — erst löschen` : null;
}

/**
 * **An welcher Kante man zugefasst hat, so liegt es in den Händen.**
 *
 * Die vier Rand-Griffe eines Möbels heißen nach der Richtung, in der sie
 * liegen (`core/grabHandles.rimHandles`: `+x`, `-x`, `+z`, `-z`), und diese
 * Zeile macht aus dem gegriffenen Griff die Art, wie das Möbel vor dem Bauch
 * liegt (`kitchen.Furnish.hold`). Die Regel ist eine einzige: **Die Kante, an
 * der man gepackt hat, bleibt die Kante, die einem zugewandt ist.** Wer den
 * Herd an seiner rechten Seite nimmt, hält ihn rechts, und rechts steht er
 * nachher auch — man dreht ein Möbel nicht um, nur weil man es anhebt.
 *
 * Nachgerechnet: Ein Möbel ohne Drehung zeigt mit **-z** nach vorn
 * (`Spot.turn`, `turnAhead`), `hold` zählt Viertel gegen den Uhrzeigersinn.
 * Damit die gegriffene Kante zur Figur schaut, muss sie nach hinten gedreht
 * werden — also `+z → 0`, `-x → 1`, `-z → 2`, `+x → 3`.
 *
 * **Und ohne Griff bleibt alles, wie es war.** Von oben und am Schreibtisch
 * gibt es keine Hand, die irgendwo zufasst (`core/usable.ts`): Dort ist die
 * Antwort `0`, und `0` ist genau das, was bisher immer galt — „aufgenommen
 * wird mit der Vorderseite nach vorn". Das alte Verhalten ist damit nicht
 * abgelöst, sondern der Fall „hinten angefasst".
 */
export function holdForRim(id: string | null | undefined): Turn {
  switch (id) {
    case '-x':
      return 1;
    case '-z':
      return 2;
    case '+x':
      return 3;
    default:
      return 0;
  }
}

/**
 * **Wohin das Getragene geht, wenn der Umbau anfängt** (`kitchen.setEditing`).
 *
 * Wer umbaut, trägt nichts — das Anschalten räumt die Hände, sonst hätte man
 * ein Möbel **und** einen Topf darin. Die Frage ist nur, wohin damit, und hier
 * stand lange die bequeme Antwort: weg. Für ein Brötchen stimmt sie auch. Es
 * kommt aus der Ausgabe und kommt von dort wieder, und eine Küche, die jede
 * weggelegte Zutat aufhebt, füllt sich mit Leichen (`kitchen.discard`).
 *
 * **Pfanne, Topf und Feuerlöscher sind aber keine Ware.** Sie werden beim
 * Aufbau genau **einmal** aus dem Modell gelöst (`kitchen.spawnUtensil` →
 * `kitchenModel.takeUtensil`), und es gibt eine von jeder. Wer den Umbau mit
 * der Pfanne in der Hand anschaltete, warf damit die einzige Pfanne der Küche
 * aus der Szene — und bis zum nächsten `reset` briet niemand mehr etwas. Man
 * merkt es nicht beim Anschalten, sondern zehn Minuten später am leeren Herd,
 * und das ist die Sorte Fehler, für die es diese Datei gibt.
 *
 * Also: **Was einen Platz hat, an den es gehört, geht dorthin zurück.** Das
 * ist `Carried.home` — der Herd, von dem die Pfanne kommt, dieselbe Stelle,
 * an die `B` sie stellt. Weggeworfen wird nur, was keinen Platz hat: das
 * gebaute Gericht, die Zutat, der Teller aus dem Stapel.
 *
 * Und der Platz muss **frei** sein. Ein Zugband kann inzwischen etwas auf den
 * Herd geschoben haben (`kitchenBelt.ts`); `kitchen.layOn` schriebe das
 * kommentarlos über, und aus einem verlorenen Ding würden zwei.
 *
 * @param home    der Platz, an den es gehört — `null` bei allem, was keinen hat
 * @param taken   ob dort gerade schon etwas liegt
 */
export function goesHomeOnEdit(home: unknown, taken: boolean): boolean {
  return Boolean(home) && !taken;
}
