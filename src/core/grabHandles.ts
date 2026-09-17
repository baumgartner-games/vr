import {
  IDENTITY,
  conjugate,
  multiplyQuat,
  rotateVec,
  type Quat,
  type Vec3,
} from '../worlds/portal/tools/aim';
import {
  STANDARD_GRIP_IN_HAND,
  gripFrame,
  gripInHand,
  type GripInHand,
} from '../worlds/portal/tools/gripFit';
import type { HoldPose } from '../worlds/portal/tools/toolPose';

/**
 * **Wie ein Ding gegriffen werden will** — und wie weit dafür gegriffen werden
 * darf.
 *
 * `core/interaction.ts` sagt, **was** ein Ding will (`press`, `grab`, `none`)
 * und womit man das in der laufenden Ansicht ausspricht. Für alles, was
 * `grab` sagt, bleibt danach genau eine Frage offen, und sie ist die des
 * Auftrags: **wo fasst die Hand an, und aus welcher Entfernung darf sie das?**
 * Diese Datei beantwortet sie — und sie ist deshalb **kein drittes System**,
 * sondern die Ausführung der einen Absicht, die es schon gibt: Was hier steht,
 * hängt als Feld an der `InteractionSpec` (`InteractionSpec.grab`) und
 * nirgends sonst.
 *
 * **Ein Griff ist dabei dasselbe Ding wie bei Pistole und Taschenlampe.** Es
 * gibt in diesem Projekt seit Langem eine eingemessene Stelle, an der eine
 * Faust ein Werkzeug hält — mit Achse, Vorne und einer ausgerechneten Hand
 * darum (`worlds/portal/tools/gripFit.ts`, AGENTS.md _Ein Griff für alle
 * Werkzeuge_). Eine Pfanne am Stiel und eine Taschenlampe am Rohr sind
 * dieselbe Aufgabe, also ist es dieselbe Rechnung: `GrabHandle.pose` ist eine
 * `HoldPose` im Raum des Dings, `holdForHandle` ist die Umkehrung von
 * `gripInHand`, und wer eine zweite Griffmathematik daneben baut, hat nach der
 * dritten Änderung zwei, die verschieden rechnen.
 *
 * **Drei Fälle, und sie stehen im Auftrag:**
 *
 * - **Kein Griff, nur die Hitbox** — Brötchen, Tomate, Salat. „Wie beim
 *   Companion Cube": Man packt zu, wo man hinfasst, und das Ding sitzt in der
 *   Faust, wie es gerade liegt. Eine leere Griffliste sagt genau das.
 * - **Ein Griff** — die Pfanne und der Topf am Stiel, der Feuerlöscher oben am
 *   Ventil. Ein Mensch fasst sie an genau einer Stelle an, und wer sie
 *   woanders packte, hielte ein Gerät verkehrt herum.
 * - **Mehrere Griffe** — der Teller: unsichtbar am **Rand** und an der
 *   **Unterseite**, denn so hält ein Mensch einen Teller. Welcher davon es
 *   wird, entscheidet nicht das Ding, sondern die **Hand**: der nächste
 *   gewinnt (`nearestHandle`).
 *
 * **Und die Reichweite trägt das Ding selbst** (`GrabReach`). Der Auftrag will
 * für die Küchendinge ausdrücklich **kein** Heranziehen aus der Ferne: kein
 * Nahgreifen, kein Ferngreifen, nur der Meter um die Figur — die
 * **Moore-Nachbarschaft**. Das steht als Feld am Ding und nicht als Sonderfall
 * im Greif-Code, sonst steht in einem Jahr in `grabReach.ts` eine Liste von
 * Küchennetzen. Werkzeuge, Waffen, Gürtelplätze und die Gegenstände der
 * Portal-Welt sagen nichts an — und `'all'` ist die Vorgabe, also bleibt dort
 * alles, wie es war.
 *
 * **Reine Rechnung**: kein three.js, kein DOM. Wohin ein Griff in der Welt
 * fällt, wie weit die Hand davon weg ist, welches der neun Felder gemeint ist
 * — alles nachrechenbar, und alles in der Brille eine Viertelstunde.
 */

export type { Quat, Vec3 };
export type { HoldPose };

/**
 * **Ein Griff** — eine Stelle mit Lage und Achse, an der die Hand andockt.
 *
 * `pose` steht im **eigenen Raum des Dings** (dort, wo auch seine Netze
 * stehen), und ihre Drehung ist der Griffrahmen aus `gripFit.ts`: **+Y ist die
 * Achse** (oben aus der Faust heraus, zur Daumenseite), **-Z ist vorne**
 * (wohin der Zeigefinger zeigt). Gebaut wird sie deshalb nicht von Hand,
 * sondern mit `handle()` aus zwei Richtungen — dieselbe Auskunft, die der
 * Stiel eines Hammers gibt.
 */
export interface GrabHandle {
  /** Ein kurzer Name, der im Werkzeugbild danebensteht: `stiel`, `rand`, `boden`. */
  readonly id: string;
  /** Wo und wie herum, im Raum des Dings. */
  readonly pose: HoldPose;
}

/**
 * **Wie weit gegriffen werden darf.**
 *
 * - `'all'` — Anfassen, Nahgreifen, Ferngreifen, wie dieses Projekt es immer
 *   hatte (AGENTS.md, _Drei Dinge, drei Reichweiten_). Die **Vorgabe**: Wer
 *   nichts angibt, ändert sich nicht.
 * - `'moore'` — nur, was in der **Moore-Nachbarschaft** steht: das eigene Feld
 *   und die acht daneben. Kein Ding kommt geflogen, keines folgt der Hand aus
 *   anderthalb Metern. Das ist die Regel für die Küchendinge, und sie ist
 *   ausdrücklich gewollt: In der Brille soll man **feiner wählen** können, wo
 *   etwas hinkommt, aber nicht **weiter** greifen als am Schirm.
 */
export type GrabReach = 'all' | 'moore';

/** Der Reihe nach, wie Menüs und Tests sie durchgehen. */
export const GRAB_REACHES: readonly GrabReach[] = ['all', 'moore'];

/** Was ein Ding über das Greifen sagt. Alles freiwillig. */
export interface GrabSpec {
  /** Die eingemessenen Stellen. **Leer heißt: nur die Hitbox.** */
  readonly handles: readonly GrabHandle[];
  readonly reach: GrabReach;
}

/** Was ein Ding angeben darf: die nackte Reichweite, wenn es keine Griffe hat. */
export type GrabLike = GrabReach | Partial<GrabSpec>;

/**
 * **Was gilt, wenn nichts dasteht**: die Hitbox und alle drei Reichweiten —
 * also Zeile für Zeile das Verhalten, das jedes greifbare Ding dieses Projekts
 * vorher hatte.
 */
export const DEFAULT_GRAB: GrabSpec = { handles: [], reach: 'all' };

/** Aus beidem eine `GrabSpec` — fehlt sie ganz, gilt die Vorgabe. */
export function grabSpec(like: GrabLike | null | undefined): GrabSpec {
  if (!like) return DEFAULT_GRAB;
  if (typeof like === 'string') {
    return { handles: [], reach: GRAB_REACHES.includes(like) ? like : DEFAULT_GRAB.reach };
  }
  const reach = like.reach && GRAB_REACHES.includes(like.reach) ? like.reach : DEFAULT_GRAB.reach;
  return { handles: like.handles ?? [], reach };
}

/** Ob dieses Ding ohne Griff auskommt — „wie beim Companion Cube". */
export function grabsByHitbox(like: GrabLike | null | undefined): boolean {
  return grabSpec(like).handles.length === 0;
}

// --- Griffe bauen ----------------------------------------------------------

/**
 * **Ein Griff aus zwei Richtungen** — wohin seine Achse zeigt und wohin der
 * Handrücken.
 *
 * Genau die Auskunft, die `gripFit.gripFrame` haben will, und dieselbe, die
 * ein Werkzeug über seinen Zylinder gibt. Mehr wird nicht gebraucht: Das
 * Vorne (-Z, wohin der Zeigefinger zeigt) folgt aus beiden.
 *
 * @param axis  die **Achse** des Griffs — die Richtung, in die der Daumen aus
 *              der Faust herausschaut. Bei einem Stiel ist das der Stiel.
 * @param back  wohin der **Handrücken** zeigt; muss senkrecht auf `axis` stehen.
 */
export function handle(id: string, at: Vec3, axis: Vec3, back: Vec3): GrabHandle {
  return { id, pose: { position: { ...at }, rotation: gripFrame(axis, back) } };
}

/**
 * **Vier Griffe an den Rändern einer Kiste** — je einer in der Mitte jeder
 * Seite, die Achse senkrecht, das Vorne nach innen.
 *
 * Es steht hier und nicht in der Küche, weil es **keine Küchenfrage** ist: Ein
 * Möbel, eine Kiste, ein Brett — alles, was man an der Kante anfasst, will
 * genau das, und der nächste, der ein umstellbares Möbel baut, soll es
 * **generisch platziert** bekommen und nicht Stück für Stück hinsetzen müssen.
 * Der Auftrag für den Umbau-Modus steht noch aus; das Modell dafür ist diese
 * Zeile.
 *
 * Die vier heißen nach der Richtung, in die sie vom Mittelpunkt aus liegen:
 * `+x`, `-x`, `+z`, `-z`.
 *
 * @param half halbe Breite und halbe Tiefe, in Metern
 * @param y    auf welcher Höhe im Raum des Dings sie sitzen
 */
export function rimHandles(half: { x: number; z: number }, y = 0): readonly GrabHandle[] {
  const up: Vec3 = { x: 0, y: 1, z: 0 };
  return [
    handle('+x', { x: half.x, y, z: 0 }, up, { x: 1, y: 0, z: 0 }),
    handle('-x', { x: -half.x, y, z: 0 }, up, { x: -1, y: 0, z: 0 }),
    handle('+z', { x: 0, y, z: half.z }, up, { x: 0, y: 0, z: 1 }),
    handle('-z', { x: 0, y, z: -half.z }, up, { x: 0, y: 0, z: -1 }),
  ];
}

/**
 * **Griffe rundum am Rand einer Scheibe** — der Teller.
 *
 * Ein Teller hat keine Vorderseite: Man fasst ihn an, wo er einem
 * entgegenkommt. Also sitzen `count` Griffe gleichmäßig auf dem Rand, die
 * Achse senkrecht (der Daumen liegt oben auf dem Rand, die Finger darunter),
 * das Vorne nach innen zur Mitte. Sie heißen `rand-0` … `rand-n`.
 *
 * **Warum nicht einer, der mitwandert.** Ein einzelner Griff, der sich der
 * Hand zudreht, wäre weniger Zahlen und mehr Magie: Er hätte keine feste
 * Stelle mehr, an der ein Achsenkreuz stehen und ein Mensch nachmessen kann —
 * und das Einmessen ist der ganze Zweck dieser Datei.
 */
export function ringHandles(radius: number, count: number, y = 0): readonly GrabHandle[] {
  const made: GrabHandle[] = [];
  const steps = Math.max(1, Math.floor(count));
  for (let i = 0; i < steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    // Der Handrücken schaut nach außen, also weg von der Mitte.
    made.push(
      handle(
        `rand-${i}`,
        { x, y, z },
        { x: 0, y: 1, z: 0 },
        { x: Math.sin(angle), y: 0, z: Math.cos(angle) },
      ),
    );
  }
  return made;
}

// --- wo ein Griff in der Welt liegt ----------------------------------------

/** Ein Ort mit einer Drehung — das Ding, die Hand, ein Griff darin. */
export interface GrabPose {
  position: Vec3;
  rotation: Quat;
}

const _turned: Vec3 = { x: 0, y: 0, z: 0 };

/**
 * **Wo ein Griff in der Welt liegt**, wenn das Ding so dasteht.
 *
 * Die übliche Kette und keine eigene: Der Griff hängt im Raum des Dings, also
 * wird sein Versatz mit dessen Drehung gedreht und seine Drehung dahinter
 * gehängt.
 */
export function handleInWorld(spot: GrabHandle, object: GrabPose, out: GrabPose): GrabPose {
  rotateVec(spot.pose.position, object.rotation, _turned);
  out.position.x = object.position.x + _turned.x;
  out.position.y = object.position.y + _turned.y;
  out.position.z = object.position.z + _turned.z;
  multiplyQuat(object.rotation, spot.pose.rotation, out.rotation);
  return out;
}

/** Was `nearestHandle` gefunden hat. */
export interface HandleFind {
  readonly handle: GrabHandle;
  /** Wie weit die Hand davon weg ist, in Metern. */
  readonly distance: number;
}

const _world: GrabPose = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } };

/**
 * **Welchen Griff diese Hand meint**: den nächsten, gemessen in der Welt.
 *
 * Nur der Ort und nicht die Drehung, und das ist Absicht. Ein Teller hat acht
 * Griffe am Rand, die sich nur darin unterscheiden, wo sie liegen — wer hier
 * zusätzlich den Winkel der Hand verrechnete, bekäme bei fast gleichen
 * Abständen ein Springen zwischen zwei Nachbarn, und ein Griff, der zwischen
 * zwei Bildern die Seite wechselt, ist schlimmer als einer, der einen halben
 * Zentimeter danebenliegt.
 *
 * `null`, wenn es keine Griffe gibt — dann ist es ein Hitbox-Ding, und dafür
 * gibt es nichts zu wählen.
 */
export function nearestHandle(
  handles: readonly GrabHandle[],
  object: GrabPose,
  hand: Vec3,
): HandleFind | null {
  let best: HandleFind | null = null;
  for (const one of handles) {
    handleInWorld(one, object, _world);
    const distance = Math.hypot(
      _world.position.x - hand.x,
      _world.position.y - hand.y,
      _world.position.z - hand.z,
    );
    if (!best || distance < best.distance) best = { handle: one, distance };
  }
  return best;
}

// --- wie das Ding dann in der Hand liegt -----------------------------------

const _inverse: Quat = { x: 0, y: 0, z: 0, w: 1 };

/**
 * **Wo das Ding im Griffraum hängt, damit dieser Griff in der Faust liegt** —
 * die Umkehrung von `gripFit.gripInHand`.
 *
 * Das ist die Zeile, die eine Pfanne so hält, wie die Pistole gehalten wird:
 * Ein Werkzeug sagt „mein Griff sitzt hier in mir" und bekommt daraus seine
 * `holdPosition`/`holdRotation`; ein gegriffenes Ding sagt dasselbe und
 * bekommt dasselbe. Es gibt danach **keinen zweiten Ort** mehr, an dem
 * jemand ausrechnet, wie etwas in der Hand liegt.
 *
 * Gerechnet: Verlangt ist `hold ∘ griff = ziel`, also
 * `hold.rotation = ziel.rotation · griff.rotation⁻¹` und
 * `hold.position = ziel.position − hold.rotation · griff.position`.
 *
 * @param target wo der Griff in der Hand landen soll. Ohne Angabe der
 *               **Standardgriff** (`gripFit.STANDARD_GRIP_IN_HAND`) — genau
 *               die Stelle, an der jedes Werkzeug dieses Projekts sitzt, und
 *               damit dieselbe Faust (`core/handPose.GRIP_HAND_POSE`).
 */
export function holdForHandle(
  spot: GrabHandle,
  target: GripInHand = STANDARD_GRIP_IN_HAND,
): HoldPose {
  conjugate(spot.pose.rotation, _inverse);
  const rotation = multiplyQuat(target.rotation, _inverse, { x: 0, y: 0, z: 0, w: 1 });
  const offset = rotateVec(spot.pose.position, rotation, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: target.position.x - offset.x,
      y: target.position.y - offset.y,
      z: target.position.z - offset.z,
    },
    rotation,
  };
}

/**
 * **Und wie ein Ding ohne Griff in der Hand liegt**: wie es ist, im Griffpunkt.
 *
 * Ein Brötchen hat keine Stelle, an der man es anfassen müsste — also bekommt
 * es auch keine gedrehte Haltung, sondern sitzt in der Faust, wie es
 * dasteht. Das ist die ehrliche Übersetzung von „man packt zu, wo man
 * hinfasst": Die Hand dreht es, nicht umgekehrt.
 */
export const HITBOX_HOLD: HoldPose = { position: { x: 0, y: 0, z: 0 }, rotation: IDENTITY };

/**
 * **Wie ein Ding in der Hand liegt** — mit Griff der gewählte, ohne Griff die
 * Faust selbst.
 *
 * Die eine Auskunft, nach der die Welt fragt; die beiden Fälle darüber stehen
 * hier einmal nebeneinander, damit sie nicht in jeder Zone neu unterschieden
 * werden.
 */
export function holdFor(spot: GrabHandle | null | undefined): HoldPose {
  return spot ? holdForHandle(spot) : HITBOX_HOLD;
}

/**
 * Wo der gewählte Griff dann tatsächlich in der Hand sitzt — die Vorwärtsprobe
 * zu `holdForHandle`, und im Test genau das: `gripInHand(holdForHandle(h), h)`
 * muss wieder das Ziel ergeben.
 */
export function handleInHand(hold: HoldPose, spot: GrabHandle): GripInHand {
  return gripInHand(hold, spot.pose, IDENTITY);
}

// --- die Moore-Nachbarschaft -----------------------------------------------

/**
 * **Die Kantenlänge eines Feldes**, in Metern — dieselbe Kachel, auf der diese
 * Welten gebaut sind (`worlds/nav/navTile.TILE`).
 *
 * Abgeschrieben und nicht importiert: Diese Datei ist reine Rechnung im `core`
 * und soll nicht an der Wegsuche hängen. Dass beide Zahlen dieselbe sind,
 * hält ein Test fest.
 */
export const MOORE_TILE = 1;

/**
 * **Die Moore-Nachbarschaft** — das eigene Feld und die acht daneben.
 *
 * Das ist die Reichweite, die der Auftrag für die Küchendinge will, und sie
 * ist mit Absicht ein **Quadrat** und kein Kreis: Die Küche steht auf Kacheln
 * von einem Meter, jedes Möbel steht auf einer davon, und „das Feld daneben"
 * ist die Einheit, in der ein Mensch hier denkt. Ein Kreis von 1 m Halbmesser
 * ließe die vier Ecken — genau die Felder, die man von oben als Nachbarn
 * sieht — gerade eben herausfallen.
 *
 * Gerechnet wird auf dem **Boden** (x/z) und nicht im Raum: Ob die Pfanne auf
 * der Arbeitsplatte oder auf dem Boden davor steht, ist keine Frage der
 * Reichweite, sondern eine der Höhe, und die Höhe prüft, wer sie prüfen muss.
 */
export function inMoore(from: Vec3, to: Vec3, tile = MOORE_TILE): boolean {
  return mooreSteps(from, to, tile) <= 1;
}

/**
 * **Wie viele Felder dazwischen liegen** — der Abstand nach Tschebyschow, in
 * Feldern.
 *
 * 0 heißt „dasselbe Feld", 1 „eines daneben, auch über Eck", 2 „zu weit". Die
 * Zahl selbst wird gebraucht, wo jemand nicht nur wissen will, ob es reicht,
 * sondern wie knapp es war.
 */
export function mooreSteps(from: Vec3, to: Vec3, tile = MOORE_TILE): number {
  const size = tile > 0 ? tile : MOORE_TILE;
  const dx = Math.abs(Math.floor(to.x / size) - Math.floor(from.x / size));
  const dz = Math.abs(Math.floor(to.z / size) - Math.floor(from.z / size));
  return Math.max(dx, dz);
}

/**
 * **Ob diese Reichweite dieses Ding noch hergibt.**
 *
 * Die eine Stelle, an der aus der Angabe am Ding eine Entscheidung wird — und
 * der Grund, warum `grabReach.ts` nichts von Küchen weiß:
 *
 * - `'all'` sagt immer ja. Werkzeuge, Waffen, Gürtelplätze, die Gegenstände
 *   der Portal-Welt: Anfassen, Nahgreifen, Ferngreifen, unverändert.
 * - `'moore'` sagt nur im eigenen Feld und den acht daneben ja. Kein
 *   Heranziehen, kein Zielen über den halben Raum.
 *
 * @param from wo die **Figur** steht — nicht, wo die Hand ist. Das ist die
 *             Pointe des Auftrags: Die Reichweite kommt aus der Figur, die
 *             Auswahl darin aus der Hand.
 */
export function grabReaches(reach: GrabReach, from: Vec3, to: Vec3, tile = MOORE_TILE): boolean {
  return reach === 'all' || inMoore(from, to, tile);
}
