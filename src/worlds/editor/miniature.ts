import { conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from '../portal/tools/aim';

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
 * **Es ist ein Gegenstand, und es fällt nur nicht.** Das ist die zweite
 * Fassung dieser Datei und der ganze Unterschied zur ersten: Vorher lag das
 * Modell waagerecht in der Luft und ließ sich schieben und um die Hochachse
 * drehen — ein Grundriss auf einem unsichtbaren Tisch. Jetzt ist es das, was
 * man in der Brille erwartet, sobald man danach greift: ein Ding in der Hand.
 * Eine Hand **trägt** es (`grabOne`), samt allem, was das Handgelenk dabei
 * tut; zwei Hände **ziehen es größer, kippen und drehen es** (`grabTwo`), in
 * allen drei Achsen. Losgelassen bleibt es liegen, wo es losgelassen wurde —
 * das ist die einzige Regel, in der es kein Gegenstand ist, und sie ist der
 * Grund, warum man überhaupt zwei Hände frei hat.
 *
 * Dass ein Grundriss dabei schief hängen kann, ist kein Versehen, sondern der
 * Zweck: Wer eine Wand von unten sehen will, kippt das Modell, statt sich
 * darunter zu bücken.
 *
 * **Der Punkt zwischen den Fingern bleibt liegen.** Das ist die eine Regel,
 * ohne die sich jede Karte falsch anfühlt: Was man angefasst hat, soll unter
 * der Hand bleiben, während sich alles andere darum herum ändert. Sie steht in
 * `grabTwo` als eine Zeile — erst Maßstab und Drehung, dann die Verschiebung
 * so nachgerechnet, dass der angefasste Planpunkt wieder unter der Handmitte
 * liegt.
 *
 * Kein three.js: Ein Modell, dessen Maßstab beim Ziehen wegläuft, sieht man in
 * der Brille und findet man dort nie. Hier ist es eine Rechnung mit Zahlen, und
 * die kann ein Test nachvollziehen (`miniature.test.ts`). Die Quaternionen
 * dafür kommen aus `portal/tools/aim.ts` — dieselben vier Zeilen wie überall,
 * damit nicht jede Ecke des Projekts ihre eigene Drehung erfindet.
 */

/** Ein Punkt im Raum. */
export interface Spot {
  x: number;
  y: number;
  z: number;
}

/**
 * **Eine Hand**: wo sie ist und wie sie steht.
 *
 * Die Lage kam mit dem Tragen dazu. Ein Modell, das man wie einen Gegenstand
 * hält, muss wissen, wie die Hand gedreht ist, die es hält — sonst bleibt es
 * beim Umdrehen der Hand stur waagerecht stehen, und das ist genau das
 * Verhalten, das sich anfühlt, als klebte es in der Luft fest.
 */
export interface Hold {
  at: Spot;
  turn: Quat;
}

/**
 * **Wo die Miniatur steht** — die Lage des Planursprungs in der Welt.
 *
 * `at` ist der Weltpunkt, an dem die **Mitte des Plans** liegt (siehe
 * `planCentre`), `turn` ihre Drehung und `scale` ihr Maßstab.
 *
 * `turn` war einmal ein einzelner Gierwinkel, und die Begründung dafür las
 * sich gut: Ein gekippter Grundriss ist keiner mehr. Nur stimmt das für eine
 * Zeichnung auf einem Tisch und nicht für ein Ding in der Hand — wer ein
 * Modell anfasst und es dreht, dreht es dorthin, wohin er es dreht. Also ein
 * Quaternion, und die Gerade wird beim Heranholen wiederhergestellt
 * (`bringNear`), nicht bei jedem Handgriff erzwungen.
 */
export interface Model {
  at: Spot;
  turn: Quat;
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

const IDENTITY_TURN: Quat = { x: 0, y: 0, z: 0, w: 1 };

export function newModel(): Model {
  return { at: { x: 0, y: 1, z: -1 }, turn: { ...IDENTITY_TURN }, scale: 1 / 24 };
}

/** Die Drehung um die Hochachse als Quaternion — für alles, was gerade steht. */
export function yawTurn(yaw: number): Quat {
  return { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
}

/** Auf die Grenzen zurückgeholt — Maßstab, Schwebehöhe und eine saubere Drehung. */
export function clampModel(model: Model): Model {
  return {
    at: {
      x: model.at.x,
      y: Math.max(HOVER_MIN, Math.min(HOVER_MAX, model.at.y)),
      z: model.at.z,
    },
    turn: normalizeQuat(model.turn),
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
  _local.x = (plan.x - centre.x) * model.scale;
  _local.y = plan.y * model.scale;
  _local.z = (plan.z - centre.z) * model.scale;
  rotateVec(_local, model.turn, _local);
  target.x = model.at.x + _local.x;
  target.y = model.at.y + _local.y;
  target.z = model.at.z + _local.z;
  return target;
}

/** Und zurück: ein Weltpunkt in Planmetern. */
export function worldToPlan(
  model: Model,
  centre: { x: number; z: number },
  world: Spot,
  target: Spot = { x: 0, y: 0, z: 0 },
): Spot {
  _local.x = world.x - model.at.x;
  _local.y = world.y - model.at.y;
  _local.z = world.z - model.at.z;
  rotateVec(_local, conjugate(model.turn, _back), _local);
  target.x = centre.x + _local.x / model.scale;
  target.y = _local.y / model.scale;
  target.z = centre.z + _local.z / model.scale;
  return target;
}

/**
 * **Eine Hand trägt.**
 *
 * Verschieben *und* drehen, starr: Das Modell hängt an der Hand, als läge es
 * darin — dreht sich das Handgelenk, dreht sich das Modell, und der Punkt, an
 * dem zugegriffen wurde, bleibt unter der Hand.
 *
 * Die erste Fassung schob nur und ließ die Drehung stehen, mit einer
 * Begründung, die sich vernünftig las: Wer ein Modell mit einer Hand anfasst,
 * dreht dabei unwillkürlich das Handgelenk, und ein Grundriss, der sich
 * mitdreht, muss danach wieder geradegezogen werden. In der Brille war es
 * andersherum — ein Ding, das der Hand nur halb folgt, fühlt sich nicht wie
 * ein Ding an, sondern wie eines, das an einem klebt. Wer es gerade haben
 * will, holt es zu sich (`bringNear`); das ist ein Handgriff und keine Regel.
 */
export function grabOne(start: Model, from: Hold, to: Hold): Model {
  const carried = carryPose({ at: start.at, turn: start.turn }, from, to);
  return clampModel({ at: carried.at, turn: carried.turn, scale: start.scale });
}

/**
 * **Ein starrer Handgriff**: eine Lage, so wie die Hand sie mitnimmt.
 *
 * Die Hälfte von `grabOne`, die nichts vom Maßstab weiß — und deshalb steht
 * sie hier für sich: Die **Palette** wird genauso getragen wie das Modell, nur
 * dass sie ihre Größe behält. Zweimal dieselbe Bewegung, einmal aufgeschrieben.
 */
export function carryPose(start: Hold, from: Hold, to: Hold): Hold {
  const turned = multiplyQuat(to.turn, conjugate(from.turn, _back), _delta);
  _local.x = start.at.x - from.at.x;
  _local.y = start.at.y - from.at.y;
  _local.z = start.at.z - from.at.z;
  rotateVec(_local, turned, _local);
  return {
    at: {
      x: to.at.x + _local.x,
      y: to.at.y + _local.y,
      z: to.at.z + _local.z,
    },
    turn: multiplyQuat(turned, start.turn, { x: 0, y: 0, z: 0, w: 1 }),
  };
}

/**
 * **Zwei Hände ziehen größer, kippen und drehen** — und der Punkt zwischen
 * ihnen bleibt liegen.
 *
 * Der Maßstab ist das Verhältnis der Handabstände. Die Drehung besteht aus
 * zwei Teilen, und beide braucht es:
 *
 * - Das **Kippen** (`turnBetween`): die kürzeste Drehung, die die alte
 *   Handverbindung auf die neue legt. Damit folgt das Modell den Händen,
 *   egal in welche Richtung sie die Linie zwischen sich schwenken — nach
 *   links, nach oben, schräg.
 * - Das **Rollen** (`twistAbout`): Zwei Hände, die eine Stange halten und sie
 *   in den Fingern rollen, schwenken die Linie zwischen sich überhaupt nicht.
 *   Ohne diesen Teil ließe sich ein Modell um genau die Achse nicht drehen,
 *   die man in den Händen hält, und das ist die Drehung, die man am
 *   häufigsten will. Genommen wird der Anteil, den die beiden Hände
 *   gemeinsam gedreht haben (`averageTurn`), **um die neue Achse**; das
 *   Kippen selbst dreht nicht um sie herum, also zählt hier nichts doppelt.
 *
 * Die Verschiebung fällt danach ab: Der Planpunkt, der zu Beginn zwischen den
 * Händen lag, muss danach wieder zwischen ihnen liegen.
 *
 * Gerechnet wird gegen `start` und nicht gegen den letzten Frame. Das ist der
 * Unterschied zwischen einer Geste, die man wieder zurücknehmen kann, und
 * einer, die nach zwei Sekunden Zittern um zehn Prozent danebenliegt.
 */
export function grabTwo(
  start: Model,
  centre: { x: number; z: number },
  fromA: Hold,
  fromB: Hold,
  toA: Hold,
  toB: Hold,
): Model {
  const wasSpan = span(fromA.at, fromB.at);
  const nowSpan = span(toA.at, toB.at);
  // Eine Handspanne von null gibt es nicht, aber sie darf auch nicht das ganze
  // Modell auf einmal verschlucken.
  const usable = wasSpan >= MIN_SPAN && nowSpan >= MIN_SPAN;
  const factor = usable ? nowSpan / wasSpan : 1;

  let turn: Quat = { ...IDENTITY_TURN };
  if (usable) {
    const axis = { x: toB.at.x - toA.at.x, y: toB.at.y - toA.at.y, z: toB.at.z - toA.at.z };
    const swing = turnBetween(
      { x: fromB.at.x - fromA.at.x, y: fromB.at.y - fromA.at.y, z: fromB.at.z - fromA.at.z },
      axis,
    );
    const rolled = averageTurn(
      multiplyQuat(toA.turn, conjugate(fromA.turn, _back), { x: 0, y: 0, z: 0, w: 1 }),
      multiplyQuat(toB.turn, conjugate(fromB.turn, _back), { x: 0, y: 0, z: 0, w: 1 }),
    );
    turn = multiplyQuat(twistAbout(rolled, axis), swing, swing);
  }

  const held = midpoint(fromA.at, fromB.at);
  const now = midpoint(toA.at, toB.at);
  // Welcher Planpunkt lag zu Beginn zwischen den Händen?
  const anchor = worldToPlan(start, centre, held);

  const spun = clampModel({
    at: start.at,
    turn: multiplyQuat(turn, start.turn, turn),
    scale: start.scale * factor,
  });
  // Und wo läge er jetzt, wenn das Modell stehen bliebe? Die Differenz ist die
  // Verschiebung, die ihn zurück unter die Handmitte holt.
  const drifted = planToWorld(spun, centre, anchor);
  return clampModel({
    at: {
      x: spun.at.x + (now.x - drifted.x),
      y: spun.at.y + (now.y - drifted.y),
      z: spun.at.z + (now.z - drifted.z),
    },
    turn: spun.turn,
    scale: spun.scale,
  });
}

/** Ab wann eine Handspanne eine ist — darunter ist es ein Tracking-Aussetzer. */
export const MIN_SPAN = 0.02;

/**
 * **Zu mir holen**: das Modell vor den Kopf stellen, auf Brusthöhe, waagerecht
 * und mit dem Norden des Plans nach vorn.
 *
 * Der Knopf für den Fall, dass man es weggeschoben, verdreht oder auf den Kopf
 * gestellt hat — und der erste Griff, den man überhaupt braucht: Beim Ziehen
 * aus dem Gürtel steht es genau so da. Seit das Modell auch kippen kann, ist
 * das hier gleichzeitig die **Wasserwaage**: einmal drücken, und der Grundriss
 * liegt wieder flach.
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
    turn: yawTurn(yaw),
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
  _local.x = (to.x - from.x) * model.scale;
  _local.y = 0;
  _local.z = (to.z - from.z) * model.scale;
  rotateVec(_local, model.turn, _local);
  return {
    at: {
      x: model.at.x + _local.x,
      y: model.at.y,
      z: model.at.z + _local.z,
    },
    turn: model.turn,
    scale: model.scale,
  };
}

/** Die Mitte zwischen zwei Punkten. */
export function midpoint(a: Spot, b: Spot): Spot {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

// --- Drehungen, für die es sonst three.js bräuchte -------------------------

/**
 * **Die kürzeste Drehung, die `from` auf `to` legt.**
 *
 * Die Rechnung hinter dem Kippen: zwei Richtungen hinein, die Drehung dazwischen
 * heraus. Zwei Sonderfälle, und beide kommen in einer Brille wirklich vor —
 * dieselbe Richtung (nichts zu tun) und die genau entgegengesetzte (eine halbe
 * Drehung, aber um welche Achse? Dann um irgendeine, die quer steht).
 */
export function turnBetween(from: Vec3, to: Vec3): Quat {
  const a = unit(from, { x: 0, y: 0, z: 0 });
  const b = unit(to, { x: 0, y: 0, z: 0 });
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  if (dot > 0.999999) return { ...IDENTITY_TURN };
  if (dot < -0.999999) {
    const axis = unit(perpendicular(a), { x: 0, y: 0, z: 0 });
    return { x: axis.x, y: axis.y, z: axis.z, w: 0 };
  }
  return normalizeQuat({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
    w: 1 + dot,
  });
}

/**
 * **Der Anteil einer Drehung um eine Achse** — was davon ein Rollen ist und
 * kein Kippen (*swing-twist decomposition*).
 *
 * Eine Drehung auf ihre Achse projiziert und wieder normiert: Was übrig
 * bleibt, dreht nur noch um diese Achse. Ohne das würde eine Hand, die sich
 * beim Ziehen nebenbei etwas nach unten neigt, das Modell zweimal kippen —
 * einmal über die Handverbindung und einmal über ihre eigene Lage.
 */
export function twistAbout(turn: Quat, axis: Vec3): Quat {
  const a = unit(axis, { x: 0, y: 0, z: 0 });
  const dot = turn.x * a.x + turn.y * a.y + turn.z * a.z;
  return normalizeQuat({ x: a.x * dot, y: a.y * dot, z: a.z * dot, w: turn.w });
}

/**
 * Die Mitte zwischen zwei Drehungen.
 *
 * Ein Mittelwert und keine echte Interpolation: Zwei Hände, die dasselbe Ding
 * halten, drehen sich fast gleich, und bei fast gleichen Drehungen ist der
 * normierte Mittelwert dasselbe wie der Bogen dazwischen. Das Vorzeichen wird
 * vorher angeglichen — `q` und `−q` sind dieselbe Drehung, und ihre Summe wäre
 * null.
 */
export function averageTurn(a: Quat, b: Quat): Quat {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w;
  const sign = dot < 0 ? -1 : 1;
  return normalizeQuat({
    x: a.x + b.x * sign,
    y: a.y + b.y * sign,
    z: a.z + b.z * sign,
    w: a.w + b.w * sign,
  });
}

/** Eine Drehung auf Länge eins — und eine kaputte auf die Ruhelage. */
function normalizeQuat(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w);
  if (length < 1e-6) return { ...IDENTITY_TURN };
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

/** Ein Vektor auf Länge eins — und ein nullter auf die Hochachse. */
function unit(v: Vec3, out: Vec3): Vec3 {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length < 1e-9) {
    out.x = 0;
    out.y = 1;
    out.z = 0;
    return out;
  }
  out.x = v.x / length;
  out.y = v.y / length;
  out.z = v.z / length;
  return out;
}

/** Irgendeine Richtung, die quer zu dieser steht. */
function perpendicular(v: Vec3): Vec3 {
  return Math.abs(v.x) < 0.9 ? { x: 0, y: -v.z, z: v.y } : { x: -v.y, y: v.x, z: 0 };
}

function span(a: Spot, b: Spot): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

const _local: Vec3 = { x: 0, y: 0, z: 0 };
const _back: Quat = { x: 0, y: 0, z: 0, w: 1 };
const _delta: Quat = { x: 0, y: 0, z: 0, w: 1 };
