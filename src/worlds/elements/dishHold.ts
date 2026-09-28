/**
 * **Wie ein Ding der Küche in der Hand liegt** — über den Halterzylinder.
 *
 * Gewünscht (September 2026): _„bei den gegenständen die man halten kann müssen
 * wir noch etwas anpassen für vr … bei den eis kugeln bzw. cones diese anders
 * halten in der hand. Nutze dafür am besten den haltezylinder als beispiel für
 * die orientierung"_ — und dazu eine Seite, auf der man den Zylinder am Ding
 * verschiebt und dreht.
 *
 * Bis hierher hing alles, was man in der Küche trägt, ungedreht 8 cm vor dem
 * Griffpunkt (`TestRestaurantWorld.carryInHands`): ein Teller wie ein Hörnchen
 * wie ein Topf. Das Hörnchen lag damit **vor** der Faust statt in ihr.
 *
 * ## Die Umkehrung, wie bei den Werkzeugen
 *
 * Nicht das Ding bekommt eine Lage in der Hand, sondern **der Halterzylinder
 * bekommt eine Lage im Ding** (`DishHold`) — und die Hand hält den Zylinder, wie
 * sie jeden Zylinder hält: im Standardgriff (`gripFit.STANDARD_GRIP_IN_HAND`),
 * mit der Faust, die dazugehört (`handPose.GRIP_HAND_POSE`). Wo das Ding dann in
 * der Hand liegt, ist keine Frage mehr, sondern eine Rechnung:
 *
 * ```
 * Ding in der Hand · Zylinder im Ding = Standardgriff in der Hand
 * Ding in der Hand = Standardgriff · (Zylinder im Ding)⁻¹
 * ```
 *
 * Das ist dieselbe Frage, die man auf der Seite _Halten einstellen_ beantwortet
 * (`ui/HoldMenu.ts`): Dort steht das Ding still in der Luft, und man schiebt den
 * grünen Zylinder dorthin, wo die Faust sein soll — beim Hörnchen senkrecht
 * durch die Waffel.
 *
 * ## Der Rahmen
 *
 * Der des Halterzylinders (`gripFit.ts`): Achse auf **+Y**, **-Z** ist vorne,
 * dorthin zeigt der Zeigefinger. Ohne Drehung steht der Zylinder also
 * **senkrecht** im Ding. Gemessen wird im Ding, wie es in der Hand liegt —
 * schon mit seinem Maßstab dort (`HAND_SCALE`), also in echten Zentimetern.
 *
 * Ohne three.js, wie `gripFit.ts`.
 */

import { IDENTITY, conjugate, multiplyQuat, rotateVec, type Quat } from '../portal/tools/aim';
import { STANDARD_GRIP_IN_HAND } from '../portal/tools/gripFit';
import {
  holdForOtherHand,
  poseFromReadout,
  readPose,
  readoutFromArray,
  readoutToArray,
  type HoldPose,
  type PoseReadout,
} from '../portal/tools/toolPose';
import type { Handedness } from '../../core/XRInput';
import { ITEM_LABELS, type KitchenItem } from '../test/zones/kitchenRecipes';
import type { GameElement } from './elementCatalog';

/**
 * **Wo der Halterzylinder im Ding sitzt** — Ort in Zentimetern, Drehung in
 * Grad (`XYZ`, wie jede Haltung), im Rahmen des Dings, so groß, wie es in der
 * Hand liegt.
 */
export type DishHold = PoseReadout;

/** Wie groß ein Ding der Küche in der Brille in der Hand liegt (`kitchenGrab.HAND_FOOD_SCALE`). */
export const HAND_SCALE = 0.5;

/**
 * **Wo das Getragene bisher hing** — 2 cm unter und 8 cm vor dem Griffpunkt,
 * ungedreht. Als Ort in der Hand, nicht als Zylinder im Ding.
 */
const LEGACY_IN_HAND: HoldPose = {
  position: { x: 0, y: -0.02, z: -0.08 },
  rotation: IDENTITY,
};

/**
 * **Die Haltung für alles, was keine eigene hat** — genau die bisherige Lage
 * vor der Faust, ausgedrückt als Zylinder im Ding: `LEGACY⁻¹ · Standardgriff`.
 * Ein Teller hängt damit, wo er immer hing; wer ihn anders will, stellt ihn
 * ein.
 */
export const LEGACY_HOLD: DishHold = readPose(cylinderInDish(LEGACY_IN_HAND));

/**
 * **Die Haltungen im Code** — was ohne eigene Einstellung gilt.
 *
 * - **Hörnchen**: der Zylinder **senkrecht** durch die Waffel (_„beim cone
 *   halten müsste der haltzylinder vermutlich vertikal stehen"_), seine Mitte
 *   5 cm über der Spitze. Das Hörnchen ist in der Hand 21 cm hoch
 *   (`iceCone.ICE_SIZE.cone` 14 cm · `dishView.CONE_SCALE` 3 · `HAND_SCALE`)
 *   und oben gut 9 cm breit — viel breiter als der Zylinder (4 cm). Also hält
 *   die Faust es unten an der schmalen Spitze, und darüber stehen Waffelrand
 *   und Kugeln frei; bei 8 cm verschwanden die Finger im Hörnchen (auf der
 *   Seite _Halten einstellen_ nachgesehen). Es lehnt dann genau so in der Hand
 *   wie ein Pistolengriff.
 */
export const DISH_HOLDS: Readonly<Partial<Record<KitchenItem, DishHold>>> = {
  cone: { x: 0, y: 5, z: 0, pitch: 0, yaw: 0, roll: 0 },
};

/** Die Haltung aus dem Code — ohne das, was jemand eingestellt hat. */
export function defaultDishHold(item: KitchenItem): DishHold {
  return DISH_HOLDS[item] ?? LEGACY_HOLD;
}

/**
 * **Der Zylinder im Ding** für ein Ding, das so in der Hand liegt:
 * `(Ding in der Hand)⁻¹ · Standardgriff`.
 */
export function cylinderInDish(inHand: HoldPose): HoldPose {
  const inverse = conjugate(inHand.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const grip = STANDARD_GRIP_IN_HAND;
  const delta = {
    x: grip.position.x - inHand.position.x,
    y: grip.position.y - inHand.position.y,
    z: grip.position.z - inHand.position.z,
  };
  return {
    position: rotateVec(delta, inverse, { x: 0, y: 0, z: 0 }),
    rotation: multiplyQuat(inverse, grip.rotation, { x: 0, y: 0, z: 0, w: 1 }),
  };
}

/**
 * **Wo das Ding in der Hand liegt** — im Griffraum (`ControllerState.hold`):
 * `Standardgriff · (Zylinder im Ding)⁻¹`.
 *
 * Gemessen ist an der **rechten** Hand; die linke bekommt die Lage gespiegelt
 * (`toolPose.holdForOtherHand`), dieselbe Regel wie bei jedem Werkzeug. Der
 * Standardgriff selbst ist symmetrisch, also hält die linke Faust den
 * gespiegelten Zylinder genau so wie die rechte den ihren.
 */
export function dishInHand(hold: DishHold, hand: Handedness = 'right'): HoldPose {
  const cylinder = poseFromReadout(hold);
  const inverse = conjugate(cylinder.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const grip = STANDARD_GRIP_IN_HAND;
  const rotation = multiplyQuat(grip.rotation, inverse, { x: 0, y: 0, z: 0, w: 1 });
  const offset = rotateVec(cylinder.position, rotation, { x: 0, y: 0, z: 0 });
  const pose: HoldPose = {
    position: {
      x: grip.position.x - offset.x,
      y: grip.position.y - offset.y,
      z: grip.position.z - offset.z,
    },
    rotation: normalize(rotation),
  };
  return hand === 'left' ? holdForOtherHand(pose) : pose;
}

/**
 * **Was man an einem Möbel in die Hand bekommt** — für den Knopf _Halten
 * einstellen_ auf seiner Detailseite: was eine Kiste oder ein Stapel hergibt,
 * sonst was darauf steht (Topf, Pfanne, Eiswanne). `null`: nichts.
 */
export function heldItemOf(element: GameElement): KitchenItem | null {
  const gives = element.gives;
  if (gives !== undefined && isKitchenItem(gives)) return gives;
  return element.holds ?? null;
}

function isKitchenItem(name: string): name is KitchenItem {
  return Object.prototype.hasOwnProperty.call(ITEM_LABELS, name);
}

// --- Regler -----------------------------------------------------------------

/** Die sechs Zahlen einer Haltung, in der Reihenfolge der Seite. */
export const HOLD_FIELDS = [
  { key: 'x', label: 'x', unit: 'cm', step: 0.5, min: -30, max: 30 },
  { key: 'y', label: 'y', unit: 'cm', step: 0.5, min: -30, max: 30 },
  { key: 'z', label: 'z', unit: 'cm', step: 0.5, min: -30, max: 30 },
  { key: 'pitch', label: 'Pitch', unit: '°', step: 10, min: -180, max: 180 },
  { key: 'yaw', label: 'Yaw', unit: '°', step: 10, min: -180, max: 180 },
  { key: 'roll', label: 'Roll', unit: '°', step: 10, min: -180, max: 180 },
] as const satisfies ReadonlyArray<{
  key: keyof DishHold;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
}>;

/**
 * **Einen Schritt weiter, auf der Raste** — gewünscht: _„gerne einfach in 10°
 * schritten"_. Eine Zahl, die zwischen zwei Rasten steht (die bisherige Lage
 * vor der Faust ist um −43° geneigt), springt zuerst auf die nächste Raste in
 * dieser Richtung und nicht um einen ganzen Schritt daneben. Winkel laufen
 * über ±180° herum.
 */
export function stepHold(value: number, step: number, dir: 1 | -1, angle: boolean): number {
  const at = value / step;
  const snapped = dir > 0 ? Math.floor(at + 1e-6) + 1 : Math.ceil(at - 1e-6) - 1;
  let next = round(snapped * step, 3);
  if (angle) {
    if (next > 180) next -= 360;
    if (next <= -180) next += 360;
  }
  return next;
}

/**
 * **Eine Zeile zum Mitnehmen** — so, wie sie in `DISH_HOLDS` stünde. Wer auf
 * der Seite etwas eingestellt hat, schickt diese Zeile, und sie gilt danach für
 * alle.
 */
export function holdLine(item: KitchenItem, hold: DishHold): string {
  const { x, y, z, pitch, yaw, roll } = hold;
  const key = /^[a-z]+$/.test(item) ? item : `'${item}'`;
  return `${key}: { x: ${x}, y: ${y}, z: ${z}, pitch: ${pitch}, yaw: ${yaw}, roll: ${roll} },`;
}

// --- Speicher ---------------------------------------------------------------

const KEY = 'bgvr.dishHolds';

/** Wie es gespeichert wird: sechs Zahlen je Ding, wie im Konfig-Code. */
type Stored = Partial<Record<string, number[]>>;

let cache: Stored | null = null;

function read(): Stored {
  if (cache) return cache;
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Stored) : {};
  } catch {
    // Kein Speicher, kaputtes JSON: Dann gilt der Code, und das ist kein Absturz wert.
    cache = {};
  }
  return cache!;
}

function write(all: Stored): void {
  cache = all;
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(all));
  } catch {
    /* nichts zu machen, und nichts, woran es hängt */
  }
}

/**
 * **Die Haltung, die gilt** — die eingestellte, sonst die aus dem Code. Die
 * Welt fragt jedes Bild; gelesen wird aus dem Zwischenspeicher.
 */
export function dishHold(item: KitchenItem): DishHold {
  const stored = read()[item];
  return stored ? readoutFromArray(stored) : defaultDishHold(item);
}

/** Ob für dieses Ding etwas eingestellt ist, das vom Code abweicht. */
export function dishHoldStored(item: KitchenItem): boolean {
  return read()[item] !== undefined;
}

/** Eine Haltung einstellen — `null` nimmt die Einstellung zurück, dann gilt der Code. */
export function saveDishHold(item: KitchenItem, hold: DishHold | null): void {
  const all = { ...read() };
  if (hold === null) delete all[item];
  else all[item] = readoutToArray(hold);
  write(all);
}

/** Nur für Tests: den Zwischenspeicher vergessen, damit ein neuer Speicher gilt. */
export function forgetDishHolds(): void {
  cache = null;
}

// --- Hilfen -----------------------------------------------------------------

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
