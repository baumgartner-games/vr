/**
 * **Der Umbau der Küche** — welche Kachel gerade gemeint ist und ob dort noch
 * Platz ist. Ohne three.js, ohne Szene, ohne Zone.
 *
 * Wie herum ein Möbel steht, steht **nicht** hier: Das rechnet
 * `kitchenPlan.footprint` schon aus Katalogmaß und Drehung, und eine zweite
 * Fassung davon wäre die zweite Wahrheit, die beim nächsten Möbel ausschert.
 * Ein aufgehobenes Möbel behält deshalb seine Drehung und bekommt anderswo
 * dieselbe wieder.
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
 * **Gerechnet wird in Kacheln der Zone**, nicht in Metern der Welt: Dieselben
 * Zahlen, mit denen `KITCHEN_SPOTS` geschrieben ist (`kitchenPlan.ts`). Wer
 * hier in Metern rechnete, hätte zwei Koordinatensysteme für eine Küche, und
 * das zweite wäre das, das beim nächsten Verschieben der Zone stehen bleibt.
 */

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
