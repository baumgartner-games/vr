import type { InteractionSpec } from '../../core/interaction';
import type { Handedness } from '../../core/XRInput';
import type { StationKind } from '../test/zones/kitchenCarry';
import type { Vec3 } from './plateUpWobble';

/**
 * **Das Eis im Restaurant** — Hörnchen, Portionierer, zwei Eiswannen und was
 * ein Druck daran bewirkt. Ohne three.js.
 *
 * Neben dem Kühlschrank steht eine **Eisecke** aus zwei Arbeitsplatten
 * (`plateUpPlan.ICE_STAND`, `ICE_TUBS`): auf der einen ein Stapel Hörnchen,
 * der nie leer wird, und daneben der Portionierer; auf der anderen zwei
 * Wannen, Vanille und Erdbeere.
 *
 * **Zwei Bedienungen, eine Regel.**
 *
 * - **In der Brille** sind Hörnchen und Portionierer zwei Dinge für zwei
 *   Hände (`IceHands.coneHand`, `IceHands.scoop`): Die eine Hand nimmt ein
 *   Hörnchen vom Stapel, die andere den Portionierer. Der Portionierer wird in
 *   eine Wanne getaucht (`fill`) und trägt dann eine Kugel; über die Öffnung
 *   des Hörnchens gehalten, setzt er sie darauf (`drop`). Beliebig oft.
 * - **Am Schirm** gibt es keine zwei Hände. Ein Druck am Stand gibt Hörnchen
 *   **und** Portionierer zugleich in die Hand (`coneHand = null`), und ein
 *   Druck an einer Wanne setzt gleich eine Kugel aufs Hörnchen (`scoop`).
 *
 * **Warum das Eis kein `Dish` ist.** Die Dinge der Küche (`kitchenRecipes`)
 * teilen sich beide Küchen, und ihr Belag ist eine **Menge** — eine zweite
 * Kugel Vanille gäbe es darin nicht, und jede neue Sorte wäre eine Zeile in
 * den Tabellen der Testküche (Namen, Höhen, Modelle, Griffe). Das Eis steht
 * deshalb für sich, mit genau den Berührungen, die es braucht: Es belegt
 * dieselbe Hand wie ein Teller (wer ein Eis hält, nimmt nichts anderes), es
 * lässt sich auf einer freien **Arbeitsplatte** oder der **Durchreiche**
 * abstellen und wieder nehmen (`counterDeed`), und es geht in den **Müll**.
 * Auf einen Teller kommt es nicht — dafür müsste es ein `Dish` sein.
 *
 * Unveränderlich wie alle Zustände dieser Küchen: Jede Tat gibt den neuen
 * Stand zurück.
 */

/** Die Sorten — genau zwei Wannen, zwei Farben, die man von oben auseinanderhält. */
export type IceFlavor = 'vanilla' | 'strawberry';

/** Die Wannen von Nord nach Süd. */
export const ICE_FLAVORS: readonly IceFlavor[] = ['vanilla', 'strawberry'];

/** Wie die Sorte im Satz heißt. */
export const FLAVOR_LABELS: Readonly<Record<IceFlavor, string>> = {
  vanilla: 'Vanille',
  strawberry: 'Erdbeere',
};

/** Die Farbe der Kugel — cremegelb und rosa, auch von oben gut zu trennen. */
export const FLAVOR_COLORS: Readonly<Record<IceFlavor, number>> = {
  vanilla: 0xf5e6b3,
  strawberry: 0xf07aa0,
};

/** Ein Hörnchen und seine Kugeln, **von unten nach oben** — ohne Obergrenze. */
export interface IceCone {
  readonly balls: readonly IceFlavor[];
}

/** Der Portionierer in der Brille: in welcher Hand, und ob eine Kugel darin liegt. */
export interface IceScoop {
  readonly hand: Handedness;
  readonly ball: IceFlavor | null;
}

/** Was die Hände vom Eis halten. */
export interface IceHands {
  readonly cone: IceCone | null;
  /**
   * **Die Hand mit dem Hörnchen** — `null` heißt: am Schirm, vor dem Bauch,
   * und dann gehört der Portionierer mit dazu.
   */
  readonly coneHand: Handedness | null;
  /** Der Portionierer als eigenes Ding — nur in der Brille. */
  readonly scoop: IceScoop | null;
}

/** Nichts vom Eis in der Hand. */
export const EMPTY_ICE: IceHands = { cone: null, coneHand: null, scoop: null };

/** Ein leeres Hörnchen, frisch vom Stapel. */
export const EMPTY_CONE: IceCone = { balls: [] };

/**
 * Welcher Teil des Stands gemeint ist: am Schirm der **ganze** Stand
 * (Hörnchen samt Portionierer), in der Brille der Stapel oder der
 * Portionierer.
 */
export type IcePart = 'stand' | 'cones' | 'scoop';

/** Was ein Druck am Eis bewirkt. */
export type IceDeed =
  /** Ein Hörnchen vom Stapel in die Hand — am Schirm samt Portionierer. */
  | { do: 'take-cone' }
  /** Ein leeres Hörnchen zurück auf den Stapel. */
  | { do: 'return-cone' }
  /** Den Portionierer in die Hand (Brille). */
  | { do: 'take-scoop' }
  /** Den Portionierer zurücklegen — eine Kugel darin geht dabei zurück in die Wanne. */
  | { do: 'return-scoop' }
  /** Den Portionierer in die Wanne tauchen: Er trägt danach eine Kugel. */
  | { do: 'fill'; flavor: IceFlavor }
  /** Am Schirm: eine Kugel gleich aufs Hörnchen. */
  | { do: 'scoop'; flavor: IceFlavor }
  /** Die Kugel vom Portionierer aufs Hörnchen (Brille). */
  | { do: 'drop'; flavor: IceFlavor }
  /** Das Eis auf eine freie Arbeitsplatte stellen. */
  | { do: 'put' }
  /** Ein abgestelltes Eis wieder nehmen. */
  | { do: 'pick' }
  /** Das Eis in den Mülleimer. */
  | { do: 'trash' }
  | { do: 'refuse'; why: string }
  | { do: 'nothing' };

/** Hände nach einer Tat — und die Tat. */
export interface IceUse {
  readonly hands: IceHands;
  readonly deed: IceDeed;
}

/**
 * **Was sonst in der Hand liegt** — der Teller, das Brötchen, der Bauplan.
 * `busy` sagt, ob da etwas ist, `hand` in welcher Hand (`null`: am Schirm oder
 * vor der Brust).
 */
export interface OtherHeld {
  readonly busy: boolean;
  readonly hand: Handedness | null;
}

/** Nichts anderes in der Hand. */
export const FREE: OtherHeld = { busy: false, hand: null };

// --- Der Stand: Hörnchen und Portionierer ------------------------------------

/**
 * **Was ein Druck am Stand bewirkt.**
 *
 * @param part welcher Teil gemeint ist (`IcePart`); ohne Hand gilt immer der
 *             ganze Stand, auch wenn in der Brille `A` gedrückt wird
 * @param hand die Hand, die drückt — `null` am Schirm
 */
export function standDeed(
  hands: IceHands,
  part: IcePart,
  hand: Handedness | null,
  other: OtherHeld = FREE,
): IceDeed {
  if (!hand || part === 'stand') {
    if (hands.cone) {
      return hands.cone.balls.length
        ? { do: 'refuse', why: 'Das Eis erst abstellen — oder in den Müll' }
        : { do: 'return-cone' };
    }
    if (other.busy) return { do: 'refuse', why: 'Erst die Hände frei machen' };
    return { do: 'take-cone' };
  }
  if (part === 'cones') {
    if (hands.cone && hands.coneHand === hand) {
      return hands.cone.balls.length
        ? { do: 'refuse', why: 'Das Eis erst abstellen — oder in den Müll' }
        : { do: 'return-cone' };
    }
    if (hands.cone) return { do: 'refuse', why: 'Ein Hörnchen reicht — erst das Eis abstellen' };
    if (hands.scoop?.hand === hand) {
      return { do: 'refuse', why: 'Hier ist der Portionierer — das Hörnchen in die andere Hand' };
    }
    if (other.busy) return { do: 'refuse', why: 'Erst die Hände frei machen' };
    return { do: 'take-cone' };
  }
  if (hands.scoop?.hand === hand) return { do: 'return-scoop' };
  if (hands.scoop) return { do: 'refuse', why: 'Der Portionierer ist schon in der anderen Hand' };
  if (hands.cone && (hands.coneHand === hand || hands.coneHand === null)) {
    return { do: 'refuse', why: 'Hier ist das Hörnchen — den Portionierer in die andere Hand' };
  }
  if (other.busy && (other.hand === hand || other.hand === null)) {
    return { do: 'refuse', why: 'Erst die Hand frei machen' };
  }
  return { do: 'take-scoop' };
}

/** **Einen Druck am Stand ausführen.** */
export function useStand(
  hands: IceHands,
  part: IcePart,
  hand: Handedness | null,
  other: OtherHeld = FREE,
): IceUse {
  const deed = standDeed(hands, part, hand, other);
  switch (deed.do) {
    case 'take-cone':
      return {
        hands: { ...hands, cone: EMPTY_CONE, coneHand: part === 'stand' ? null : hand },
        deed,
      };
    case 'return-cone':
      return { hands: { ...hands, cone: null, coneHand: null }, deed };
    case 'take-scoop':
      return { hands: { ...hands, scoop: { hand: hand!, ball: null } }, deed };
    case 'return-scoop':
      return { hands: { ...hands, scoop: null }, deed };
    default:
      return { hands, deed };
  }
}

// --- Die Wannen ----------------------------------------------------------------

/**
 * **Was ein Druck an einer Wanne bewirkt.**
 *
 * In der Brille taucht die Hand mit dem Portionierer ein; die Hand mit dem
 * Hörnchen bekommt einen Satz, womit es geht. Am Schirm (ohne Hand) kommt die
 * Kugel gleich aufs Hörnchen — hält man in der Brille den Portionierer und
 * drückt `A`, füllt `A` ihn.
 */
export function tubDeed(hands: IceHands, flavor: IceFlavor, hand: Handedness | null): IceDeed {
  const scoop = hands.scoop;
  if (hand && scoop?.hand === hand) {
    return scoop.ball
      ? { do: 'refuse', why: 'Der Portionierer ist voll — die Kugel aufs Hörnchen' }
      : { do: 'fill', flavor };
  }
  if (!hand) {
    if (hands.cone && hands.coneHand === null) return { do: 'scoop', flavor };
    if (scoop && !scoop.ball) return { do: 'fill', flavor };
    if (hands.cone) return { do: 'scoop', flavor };
    return { do: 'refuse', why: 'Erst ein Hörnchen nehmen — am Eisstand neben dem Kühlschrank' };
  }
  if (hands.cone && hands.coneHand === hand) {
    return { do: 'refuse', why: 'Mit dem Portionierer eintauchen — er liegt beim Hörnchenstapel' };
  }
  return { do: 'refuse', why: 'Den Portionierer nehmen und damit eintauchen' };
}

/** **Einen Druck an einer Wanne ausführen.** */
export function useTub(hands: IceHands, flavor: IceFlavor, hand: Handedness | null): IceUse {
  const deed = tubDeed(hands, flavor, hand);
  if (deed.do === 'fill' && hands.scoop) {
    return { hands: { ...hands, scoop: { ...hands.scoop, ball: flavor } }, deed };
  }
  if (deed.do === 'scoop' && hands.cone) {
    return { hands: { ...hands, cone: withBall(hands.cone, flavor) }, deed };
  }
  return { hands, deed };
}

/** Eine Kugel mehr oben drauf — ohne Obergrenze. */
export function withBall(cone: IceCone, flavor: IceFlavor): IceCone {
  return { balls: [...cone.balls, flavor] };
}

/**
 * **Die Kugel vom Portionierer auf ein Hörnchen** — das in der anderen Hand
 * oder eines, das auf einer Arbeitsplatte steht. `null`, wenn der
 * Portionierer leer ist.
 */
export function dropBall(
  cone: IceCone,
  scoop: IceScoop | null,
): { cone: IceCone; scoop: IceScoop; flavor: IceFlavor } | null {
  if (!scoop?.ball) return null;
  return { cone: withBall(cone, scoop.ball), scoop: { ...scoop, ball: null }, flavor: scoop.ball };
}

/** Dasselbe für das Hörnchen **in der Hand**: Hände vorher, Hände nachher. */
export function dropIntoHand(hands: IceHands): IceUse {
  if (!hands.cone) return { hands, deed: { do: 'nothing' } };
  const done = dropBall(hands.cone, hands.scoop);
  if (!done) return { hands, deed: { do: 'nothing' } };
  return {
    hands: { ...hands, cone: done.cone, scoop: done.scoop },
    deed: { do: 'drop', flavor: done.flavor },
  };
}

// --- Abstellen: Arbeitsplatte, Durchreiche, Mülleimer ---------------------------

/** Wie eine Station aussieht, so weit es das Eis angeht. */
export interface IceStation {
  readonly kind: StationKind;
  /** Ob ein Ding der Küche darauf liegt (`StationState.on`). */
  readonly taken: boolean;
  /** Das Eis, das darauf steht — `null`: keines. */
  readonly cone: IceCone | null;
}

/**
 * **Was ein Druck an einer Station bewirkt, soweit es ums Eis geht** — `null`,
 * wenn das Eis damit nichts zu tun hat und die Küche entscheidet
 * (`plateUpStations.stationDeed`).
 *
 * - Wer ein Eis hält, stellt es auf eine **freie Arbeitsplatte** oder die
 *   Durchreiche (`top`) oder wirft es in den **Mülleimer**; an jeder anderen
 *   Station sagt ein Satz, warum nicht. Eine Kiste nimmt kein Eis, und eine
 *   Grillplatte schon gar nicht.
 * - Wer nichts hält, nimmt ein abgestelltes Eis wieder.
 * - Die Hand mit dem **Portionierer** bedient keine Station: Sie hat schon
 *   ein Ding (eine Hand, ein Ding — wie überall in dieser Küche).
 *
 * @param hand die Hand, die drückt — `null` am Schirm
 */
export function counterDeed(
  hands: IceHands,
  hand: Handedness | null,
  station: IceStation,
  other: OtherHeld = FREE,
): IceDeed | null {
  if (hand && hands.scoop?.hand === hand) {
    return { do: 'refuse', why: 'Mit dem Portionierer nur ins Eis — zurück legt man ihn am Stand' };
  }
  if (hands.cone) {
    if (hand && hands.coneHand && hand !== hands.coneHand) {
      return { do: 'refuse', why: 'Das Eis ist in der anderen Hand' };
    }
    if (station.kind === 'bin') return { do: 'trash' };
    if (station.kind !== 'top') {
      return { do: 'refuse', why: 'Das Eis nur auf eine freie Arbeitsplatte — oder in den Müll' };
    }
    if (station.taken || station.cone) return { do: 'refuse', why: 'Da ist kein Platz fürs Eis' };
    return { do: 'put' };
  }
  if (!station.cone) return null;
  if (other.busy) return { do: 'refuse', why: 'Da steht ein Eis — erst die Hände frei machen' };
  return { do: 'pick' };
}

/** Hände und das Eis auf der Station nach einem Druck — und die Tat. */
export interface IceCounterUse extends IceUse {
  readonly cone: IceCone | null;
}

/**
 * **Einen Druck an einer Station ausführen** — `null`, wenn das Eis damit
 * nichts zu tun hat.
 *
 * Am Schirm geht mit dem Eis auch der Portionierer aus der Hand und kommt mit
 * dem Nehmen wieder: Er gehört dort zum Hörnchen und ist kein eigenes Ding.
 */
export function useCounter(
  hands: IceHands,
  hand: Handedness | null,
  station: IceStation,
  other: OtherHeld = FREE,
): IceCounterUse | null {
  const deed = counterDeed(hands, hand, station, other);
  if (!deed) return null;
  switch (deed.do) {
    case 'put':
      return { hands: { ...hands, cone: null, coneHand: null }, cone: hands.cone, deed };
    case 'trash':
      return { hands: { ...hands, cone: null, coneHand: null }, cone: station.cone, deed };
    case 'pick':
      return { hands: { ...hands, cone: station.cone, coneHand: hand }, cone: null, deed };
    default:
      return { hands, cone: station.cone, deed };
  }
}

// --- Welche Wanne gemeint ist ----------------------------------------------------

/**
 * **Welche der beiden Wannen gemeint ist** — immer genau eine, und zwar die,
 * auf die der Blick **am geradesten** zeigt.
 *
 * Die beiden Wannen stehen eine Handbreit nebeneinander auf derselben Platte.
 * Die Auswahl des Kerns (`core/usable.pickUsable`) rechnet mit Zylindern von
 * mindestens 40 cm (`USE_RADIUS`); zwei davon überdecken sich hier fast
 * ganz, und dann gewinnt, dessen Vorderkante näher liegt — schräg davor ist
 * das die nähere und nicht die, die man ansieht. Deshalb meldet die Welt am
 * Schirm immer nur **eine** Wanne an, die hier gewählte, und nur sie
 * leuchtet.
 *
 * Gewählt wird nach dem **Winkel** zwischen Blick und der Richtung zur Wanne,
 * auf dem Boden gerechnet; bei gleichem Winkel die nähere. Was weiter als
 * `reach` weg ist, zählt nicht. Ohne Blickrichtung gilt die nächste.
 *
 * @returns der Index in `tubs`, oder −1
 */
export function pickTub(
  origin: { readonly x: number; readonly z: number },
  forward: { readonly x: number; readonly z: number },
  tubs: readonly { readonly x: number; readonly z: number }[],
  reach = 2,
): number {
  const fl = Math.hypot(forward.x, forward.z);
  let best = -1;
  let bestAngle = Infinity;
  let bestDistance = Infinity;
  tubs.forEach((tub, i) => {
    const dx = tub.x - origin.x;
    const dz = tub.z - origin.z;
    const distance = Math.hypot(dx, dz);
    if (distance > reach) return;
    const angle =
      fl > 1e-6 && distance > 1e-6
        ? Math.acos(Math.max(-1, Math.min(1, (dx * forward.x + dz * forward.z) / (fl * distance))))
        : 0;
    if (
      angle < bestAngle - 1e-6 ||
      (Math.abs(angle - bestAngle) <= 1e-6 && distance < bestDistance)
    ) {
      best = i;
      bestAngle = angle;
      bestDistance = distance;
    }
  });
  return best;
}

// --- In der Brille: eintauchen und absetzen, als Geometrie --------------------------

/** Eine Wanne als Kasten im Raum: Mitte und halbe Ausdehnung je Achse. */
export interface TubBox {
  readonly centre: Vec3;
  readonly half: Vec3;
}

/**
 * **Welche Wanne die Spitze des Portionierers gerade berührt** — der Kasten
 * der Wanne, oben um `slack` erweitert (man taucht von oben ein, und niemand
 * soll dafür den Boden der Wanne treffen müssen). Stecken beide Kästen, gewinnt
 * die, deren Mitte näher ist — es ist immer höchstens **eine**.
 *
 * @returns der Index in `tubs`, oder −1
 */
export function tubUnder(tip: Vec3, tubs: readonly TubBox[], slack = 0.03): number {
  let best = -1;
  let bestDistance = Infinity;
  tubs.forEach((tub, i) => {
    const dx = Math.abs(tip.x - tub.centre.x);
    const dz = Math.abs(tip.z - tub.centre.z);
    const dy = tip.y - tub.centre.y;
    if (dx > tub.half.x || dz > tub.half.z) return;
    if (dy < -tub.half.y || dy > tub.half.y + slack) return;
    const d = Math.hypot(dx, dz);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

/**
 * **Über welchem Hörnchen der Portionierer gerade ist** — das, dessen Spitze
 * des Turms (die oberste Kugel, beim leeren Hörnchen die Öffnung) der Spitze
 * des Portionierers am nächsten liegt, höchstens `reach` entfernt.
 *
 * @returns der Index in `tops`, oder −1
 */
export function coneUnder(tip: Vec3, tops: readonly Vec3[], reach = 0.09): number {
  let best = -1;
  let bestDistance = reach;
  tops.forEach((top, i) => {
    const d = Math.hypot(tip.x - top.x, tip.y - top.y, tip.z - top.z);
    if (d <= bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}

// --- Wie es sich anmeldet und was die Zeile sagt ------------------------------------

/**
 * **Womit die Tat bedient wird** (`core/interaction.ts`) — dieselbe Regel wie
 * an den Stationen der Küche (`kitchenCarry.kitchenInteractionSpec`):
 *
 * - **Nehmen** ist ein Griff (`grab`): in der Brille die Greif-Taste oder der
 *   Trigger.
 * - **Aus der Hand geben** (abstellen, zurücklegen, wegwerfen) will in der
 *   Brille die Greif-Taste oder den Trigger, und zwar **gehalten** — beim
 *   Loslassen wird abgelegt, und wer nur vorbeiläuft, legt nichts ab.
 * - **Eintauchen** ist ein Druck (`press`): In der Brille genügt es, die Wanne
 *   mit der Hand zu **berühren** — genau das ist Eintauchen.
 */
export function iceInteraction(deed: IceDeed): InteractionSpec {
  switch (deed.do) {
    case 'nothing':
      return { kind: 'none' };
    case 'take-cone':
    case 'take-scoop':
    case 'pick':
      return { kind: 'grab' };
    case 'return-cone':
    case 'return-scoop':
    case 'put':
    case 'trash':
      return { kind: 'press', views: { vr: { inputs: ['grip', 'aimTrigger'], press: 'hold' } } };
    default:
      return { kind: 'press' };
  }
}

/** **Der Satz zur Tat** (`Usable.usePrompt`). */
export function icePrompt(deed: IceDeed): string {
  switch (deed.do) {
    case 'take-cone':
      return 'Hörnchen nehmen';
    case 'return-cone':
      return 'Hörnchen zurücklegen';
    case 'take-scoop':
      return 'Portionierer nehmen';
    case 'return-scoop':
      return 'Portionierer zurücklegen';
    case 'fill':
      return `Portionierer in ${FLAVOR_LABELS[deed.flavor]} tauchen`;
    case 'scoop':
    case 'drop':
      return `Eine Kugel ${FLAVOR_LABELS[deed.flavor]} aufs Hörnchen`;
    case 'put':
      return 'Eis abstellen';
    case 'pick':
      return 'Eis nehmen';
    case 'trash':
      return 'Eis wegwerfen';
    case 'refuse':
      return deed.why;
    case 'nothing':
      return '';
  }
}

/**
 * **Das Verb für die Tastenhilfe** (wie `plateUpHints.stationAction`) — kurz,
 * ein bis drei Wörter. `null`: nichts Besonderes.
 */
export function iceVerb(deed: IceDeed): string | null {
  switch (deed.do) {
    case 'take-cone':
      return 'Hörnchen nehmen';
    case 'return-cone':
    case 'return-scoop':
      return 'Zurücklegen';
    case 'take-scoop':
      return 'Portionierer nehmen';
    case 'fill':
      return 'Eintauchen';
    case 'scoop':
    case 'drop':
      return `Kugel ${FLAVOR_LABELS[deed.flavor]}`;
    case 'put':
      return 'Eis abstellen';
    case 'pick':
      return 'Eis nehmen';
    case 'trash':
      return 'Wegwerfen';
    default:
      return null;
  }
}

/** **Wie das Eis in der Leiste unten heißt** — „Eis (Vanille, Erdbeere, Vanille)". */
export function coneLabel(cone: IceCone): string {
  if (!cone.balls.length) return 'Hörnchen';
  return `Eis (${cone.balls.map((b) => FLAVOR_LABELS[b]).join(', ')})`;
}

/** Ein kurzer Schlüssel für ein Eis — ändert er sich, wird neu angemeldet. */
export function coneKey(cone: IceCone | null): string {
  return cone ? `cone:${cone.balls.join('+')}` : '';
}
