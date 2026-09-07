/**
 * **Das Tischmodell** — der Grundriss als Miniatur, die vor einem im Raum
 * steht, und die Rechnung, mit der man sie anfasst.
 *
 * Die Frage, die dahintersteht, ist eine der ältesten in VR: Wie sieht man
 * einen Grundriss von oben, wenn man selbst darin steht? Drei Antworten sind
 * üblich, und zwei davon sind schlecht:
 *
 * - **Die Kamera nach oben ziehen.** Das ist die Antwort vom Bildschirm, und
 *   in der Brille wird einem davon schlecht: Der eigene Körper bleibt unten
 *   stehen, während der Blick wegfliegt.
 * - **Die Welt schrumpfen.** Dann steht man als Riese darin — hübsch, aber man
 *   verliert jeden Maßstab dafür, wie groß ein Zimmer wirklich ist, und genau
 *   das will man beim Bauen wissen.
 * - **Eine Miniatur hinstellen** (*World in Miniature*, Stoakley 1995). Man
 *   bleibt, wo man ist, in Lebensgröße, und der Grundriss steht als Modell auf
 *   Brusthöhe davor. Man greift hinein, schiebt es, dreht es, zieht es größer.
 *   Das ist die Antwort, die hier steht.
 *
 * **Angefasst wird mit einer oder mit zwei Händen**, und das ist dieselbe
 * Geste wie auf jedem Telefon, nur im Raum: Eine Hand schiebt. Zwei Hände
 * drehen und ziehen größer — der Abstand der Hände ist der Maßstab, ihr Winkel
 * die Drehung, ihre Mitte die Verschiebung.
 *
 * **Der Punkt zwischen den Fingern bleibt liegen.** Das ist die eine Regel,
 * ohne die sich jede Karte falsch anfühlt: Was man angefasst hat, soll unter
 * der Hand bleiben, während sich alles andere darum herum ändert. Sie steht in
 * `grabTwo` als eine Zeile — erst Maßstab und Drehung, dann die Verschiebung
 * so nachgerechnet, dass der angefasste Planpunkt wieder unter der Handmitte
 * liegt.
 *
 * Kein three.js: Ein Modell, dessen Maßstab beim Ziehen wegläuft, sieht man in
 * der Brille und findet man dort nie. Hier ist es eine Rechnung mit sechs
 * Zahlen, und die kann ein Test nachvollziehen (`miniature.test.ts`).
 */

/** Ein Punkt im Raum. */
export interface Spot {
  x: number;
  y: number;
  z: number;
}

/**
 * **Wo die Miniatur steht** — die Lage des Planursprungs in der Welt.
 *
 * `at` ist der Weltpunkt, an dem die **Mitte des Plans** liegt (siehe
 * `planCentre`), `yaw` ihre Drehung um die Hochachse und `scale` ihr Maßstab.
 * Drei Zahlen und ein Punkt, mehr braucht ein Tischmodell nicht: Es steht
 * waagerecht, denn ein gekippter Grundriss ist keiner mehr.
 */
export interface Model {
  at: Spot;
  yaw: number;
  scale: number;
}

/**
 * Die Grenzen des Maßstabs.
 *
 * Nach unten so, dass ein Zimmer noch ein Zimmer ist und keine Briefmarke;
 * nach oben so, dass das Modell einem nicht um die Ohren wächst — bei 1:6 ist
 * ein Zimmer von 15 Metern schon zweieinhalb Meter breit und damit größer als
 * die Armspanne, mit der man es anfasst.
 */
export const SCALE_MIN = 1 / 60;
export const SCALE_MAX = 1 / 6;

/** Wie weit über dem Boden ein Modell mindestens und höchstens schwebt. */
export const HOVER_MIN = 0.35;
export const HOVER_MAX = 2.2;

/** Wie weit vor dem Kopf es steht, wenn man es zu sich holt. */
export const NEAR_GAP = 0.62;
/** Und wie weit unter Augenhöhe — auf Brusthöhe, damit man darüber hinwegsieht. */
export const NEAR_DROP = 0.42;

export function newModel(): Model {
  return { at: { x: 0, y: 1, z: -1 }, yaw: 0, scale: 1 / 24 };
}

/** Auf die Grenzen zurückgeholt — Maßstab und Schwebehöhe. */
export function clampModel(model: Model): Model {
  return {
    at: {
      x: model.at.x,
      y: Math.max(HOVER_MIN, Math.min(HOVER_MAX, model.at.y)),
      z: model.at.z,
    },
    yaw: wrap(model.yaw),
    scale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, model.scale)),
  };
}

/**
 * Ein Punkt des Plans, in der Welt.
 *
 * `centre` ist die Mitte des Plans in Planmetern — sie ist der Drehpunkt, und
 * dass sie von außen kommt, ist Absicht: Wer weiterbaut, verschiebt die Mitte
 * seines Plans, und das Modell soll deswegen nicht wegspringen.
 */
export function planToWorld(
  model: Model,
  centre: { x: number; z: number },
  plan: Spot,
  target: Spot = { x: 0, y: 0, z: 0 },
): Spot {
  const dx = (plan.x - centre.x) * model.scale;
  const dz = (plan.z - centre.z) * model.scale;
  const cos = Math.cos(model.yaw);
  const sin = Math.sin(model.yaw);
  target.x = model.at.x + dx * cos + dz * sin;
  target.y = model.at.y + plan.y * model.scale;
  target.z = model.at.z - dx * sin + dz * cos;
  return target;
}

/** Und zurück: ein Weltpunkt in Planmetern. */
export function worldToPlan(
  model: Model,
  centre: { x: number; z: number },
  world: Spot,
  target: Spot = { x: 0, y: 0, z: 0 },
): Spot {
  const dx = world.x - model.at.x;
  const dz = world.z - model.at.z;
  const cos = Math.cos(model.yaw);
  const sin = Math.sin(model.yaw);
  // Die Umkehrung der Drehung von oben — dasselbe Vorzeichen, andersherum
  // angewandt.
  const px = dx * cos - dz * sin;
  const pz = dx * sin + dz * cos;
  target.x = centre.x + px / model.scale;
  target.y = (world.y - model.at.y) / model.scale;
  target.z = centre.z + pz / model.scale;
  return target;
}

/**
 * **Eine Hand schiebt.**
 *
 * Nur die Verschiebung, keine Drehung: Eine Hand hat zwar eine Lage, aber wer
 * ein Modell mit einer Hand anfasst, dreht dabei unwillkürlich das Handgelenk
 * — und ein Grundriss, der sich beim Hinschieben mitdreht, ist einer, den man
 * danach wieder geradeziehen muss.
 */
export function grabOne(start: Model, from: Spot, to: Spot): Model {
  return clampModel({
    at: {
      x: start.at.x + (to.x - from.x),
      y: start.at.y + (to.y - from.y),
      z: start.at.z + (to.z - from.z),
    },
    yaw: start.yaw,
    scale: start.scale,
  });
}

/**
 * **Zwei Hände drehen und ziehen größer** — und der Punkt zwischen ihnen bleibt
 * liegen.
 *
 * Der Maßstab ist das Verhältnis der Handabstände, die Drehung der Winkel
 * zwischen den Handverbindungen **in der Ebene** (ein Modell steht waagerecht),
 * und die Verschiebung fällt danach ab: Der Planpunkt, der zu Beginn zwischen
 * den Händen lag, muss danach wieder zwischen ihnen liegen.
 *
 * Gerechnet wird gegen `start` und nicht gegen den letzten Frame. Das ist der
 * Unterschied zwischen einer Geste, die man wieder zurücknehmen kann, und
 * einer, die nach zwei Sekunden Zittern um zehn Prozent danebenliegt.
 */
export function grabTwo(
  start: Model,
  centre: { x: number; z: number },
  fromA: Spot,
  fromB: Spot,
  toA: Spot,
  toB: Spot,
): Model {
  const wasSpan = Math.hypot(fromB.x - fromA.x, fromB.y - fromA.y, fromB.z - fromA.z);
  const nowSpan = Math.hypot(toB.x - toA.x, toB.y - toA.y, toB.z - toA.z);
  // Eine Handspanne von null gibt es nicht, aber sie darf auch nicht das ganze
  // Modell auf einmal verschlucken.
  const factor = wasSpan < 0.02 || nowSpan < 0.02 ? 1 : nowSpan / wasSpan;

  const wasAngle = Math.atan2(fromB.x - fromA.x, fromB.z - fromA.z);
  const nowAngle = Math.atan2(toB.x - toA.x, toB.z - toA.z);
  const turned = wrap(nowAngle - wasAngle);

  const held = midpoint(fromA, fromB);
  const now = midpoint(toA, toB);
  // Welcher Planpunkt lag zu Beginn zwischen den Händen?
  const anchor = worldToPlan(start, centre, held);

  const spun = clampModel({ at: start.at, yaw: start.yaw + turned, scale: start.scale * factor });
  // Und wo läge er jetzt, wenn das Modell stehen bliebe? Die Differenz ist die
  // Verschiebung, die ihn zurück unter die Handmitte holt.
  const drifted = planToWorld(spun, centre, anchor);
  return clampModel({
    at: {
      x: spun.at.x + (now.x - drifted.x),
      y: spun.at.y + (now.y - drifted.y),
      z: spun.at.z + (now.z - drifted.z),
    },
    yaw: spun.yaw,
    scale: spun.scale,
  });
}

/**
 * **Zu mir holen**: das Modell vor den Kopf stellen, auf Brusthöhe, mit dem
 * Norden des Plans nach vorn.
 *
 * Der Knopf für den Fall, dass man es weggeschoben hat und nicht mehr
 * hinlangt — und der erste Griff, den man überhaupt braucht: Beim Betreten der
 * Welt steht es genau so da.
 *
 * `span` ist die längere Kante des Plans in Metern; daraus kommt der Maßstab,
 * damit ein großer Grundriss beim Heranholen nicht die halbe Halle füllt.
 */
export function bringNear(head: Spot, yaw: number, span: number, reach = 1.1): Model {
  const forward = { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  // So groß, dass es in die Armspanne passt — und nie größer als erlaubt.
  const scale = span > 0.01 ? Math.min(SCALE_MAX, reach / span) : SCALE_MAX;
  return clampModel({
    at: {
      x: head.x + forward.x * NEAR_GAP,
      y: head.y - NEAR_DROP,
      z: head.z + forward.z * NEAR_GAP,
    },
    // Der Plan schaut mit dem Betrachter mit: Sein Norden liegt vorn, damit
    // „links im Modell" auch links im Zimmer ist.
    yaw,
    scale: Math.max(SCALE_MIN, scale),
  });
}

/**
 * **Die Mitte des Plans hat sich verschoben** — das Modell soll trotzdem
 * stehen bleiben.
 *
 * Der Fall tritt bei jedem zweiten Handgriff ein: Wer eine Kachel an den Rand
 * baut, verschiebt damit die Mitte seines Grundrisses um eine halbe Kachel.
 * Weil `at` die **Mitte** in der Welt festhält, spränge das ganze Modell dabei
 * um eine halbe Kachel mal Maßstab zur Seite — nicht viel, aber bei jedem
 * Druck, und man baut danach dem Modell hinterher statt in es hinein.
 *
 * Also wird die Verschiebung mitgerechnet: `at` wandert um genau so viel, wie
 * die Mitte gewandert ist, und das Gebaute bleibt stehen, wo es stand.
 */
export function recentre(
  model: Model,
  from: { x: number; z: number },
  to: { x: number; z: number },
): Model {
  const dx = (to.x - from.x) * model.scale;
  const dz = (to.z - from.z) * model.scale;
  const cos = Math.cos(model.yaw);
  const sin = Math.sin(model.yaw);
  return {
    at: {
      x: model.at.x + dx * cos + dz * sin,
      y: model.at.y,
      z: model.at.z - dx * sin + dz * cos,
    },
    yaw: model.yaw,
    scale: model.scale,
  };
}

/** Die Mitte zwischen zwei Punkten. */
export function midpoint(a: Spot, b: Spot): Spot {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Ein Winkel, auf [-π, π) zurückgeholt. */
function wrap(angle: number): number {
  const turned = (((angle + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return turned - Math.PI;
}
