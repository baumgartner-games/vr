/**
 * **Ein Griff für alle Werkzeuge** — wo er im Werkzeug sitzen muss, damit er in
 * der Faust immer an derselben Stelle liegt.
 *
 * Bisher hatte jedes Werkzeug seinen eigenen Griff, und weil jeder für sich
 * hingesetzt wurde, saß keiner wie der andere: sieben Werkzeuge werden genau
 * gleich gehalten, und ihre Griffe standen bis zu **24° gegeneinander** verdreht
 * und bis zu **2,8 cm** auseinander (der Duplizierer und das Holster lehnten
 * sogar in die *falsche* Richtung). Gemeinsam war ihnen nur die Faust: dieselben
 * sechs Zahlen für alle, und damit passte sie zu höchstens einem von ihnen
 * richtig.
 *
 * Die Umkehrung ist der Ausweg: **nicht der Griff folgt dem Werkzeug, sondern
 * das Werkzeug dem Griff.** Ein Griff ist ein Ding mit einer festen Lage in der
 * Faust — hier steht sie —, und ein Werkzeug baut ihn an der Stelle ein, an der
 * er dort landet. Wer das tut, bekommt die Faust geschenkt und muss nie wieder
 * an den zweiten Justierstand.
 *
 * ## Der Rahmen eines Griffs
 *
 * ```
 *        +Y  Achse, oben aus der Faust heraus (Daumenseite)
 *         |
 *         |     -Z  „vorne": wohin der Zeigefinger zeigt
 *         |    /
 *         |   /
 *         +--------- +X
 * ```
 *
 * Das ist genau der Rahmen des Pistolengriffs: seine Achse steht senkrecht in
 * der Faust, und der Zeigefinger zeigt dorthin, wohin der Lauf zeigt. Deshalb
 * gilt für alles, was **wie eine Pistole** gehalten wird: `-Z` des Griffs *ist*
 * die Zielrichtung des Werkzeugs, und der Griff sitzt unverdreht darin.
 *
 * ## Ein Griff, eine Faust
 *
 * Es war einmal zwei: `pistol` quer zur Achse und `rod` längs dazu, für alles,
 * dessen Rohr *entlang* der Faust liegt — Taschenlampe, Lötkolben, Hängegleiter.
 * Zwei Griffe klingen nach zwei Arten anzufassen; sie sind aber zwei **Orte** in
 * derselben Faust, und eine Faust hat nur einen. Also zog jeder zweite Griff
 * eine zweite Faust nach sich, und die beiden standen am Ende 111°
 * gegeneinander — für denselben Zylinder.
 *
 * Dazu kam, was ein Stabgriff kostet: das Rohr liegt auf der Faustachse, und die
 * steht quer zum Zeigestrahl. Eine Taschenlampe leuchtete deshalb **30° über
 * das hinweg, worauf man zeigte** — die einzige Ausnahme von der Regel, dass
 * jedes Werkzeug entlang des Strahls zielt, und niemand hatte sie beschlossen;
 * sie fiel bei einer Messung an und blieb liegen.
 *
 * Jetzt trägt alles denselben Griff quer unter sich, wie eine Lampe mit Griff
 * oder eine Lötpistole, und zielt wieder dorthin, wohin man zeigt. Die Lage ist
 * die des **Pistolengriffs**, wie er im Spiel schon lag; was daran neu ist, ist
 * die `holdPosition` — sie legt ihn jetzt wirklich in die Faust statt 8,6 cm
 * daneben.
 *
 * ## Warum sich `aim` dabei herauskürzt
 *
 * Ein gehaltenes Werkzeug liegt bei `(holdPosition, aim · holdRotation)` — der
 * Ort im Griffraum, die Drehung im Strahlraum (`Tool.applyHold`). Der Griff
 * darin sitzt also bei
 *
 * ```
 * Ort     = holdPosition + (aim · holdRotation) · gripPosition
 * Drehung = aim · holdRotation · gripRotation
 * ```
 *
 * Verlangt man, dass das für zwei Werkzeuge dasselbe ergibt, und haben beide
 * **dieselbe `holdPosition`**, dann steht auf beiden Seiten dasselbe `aim` und
 * kürzt sich weg. Übrig bleiben zwei Gleichungen ohne Brille darin:
 *
 * ```
 * holdRotation · gripRotation = STANDARD.rotation
 * holdRotation · gripPosition = STANDARD.position
 * ```
 *
 * Das ist alles, was diese Datei rechnet — einmal vorwärts (`gripInTool`),
 * einmal rückwärts (`holdForGrip`), einmal als Maßband für das, was schon gebaut
 * ist (`gripDeviation`), und einmal für die **Hand**, die ihn hält
 * (`fistOnGrip`). Dort kürzt sich `aim` allerdings *nicht* weg: eine Hand steht
 * im Griffraum und ein Werkzeug im Strahlraum, und zwischen beiden liegt genau
 * eine Zahl, `GRIP_TO_RAY`.
 *
 * Ohne three.js, wie `aim.ts` und `toolPose.ts`.
 */

import { IDENTITY, conjugate, multiplyQuat, rotateVec, type Quat, type Vec3 } from './aim';
import { quatFromEulerXYZ, type HoldPose } from './toolPose';

/** Wo ein Griff liegt: derselbe Aufbau wie eine `HoldPose`. */
export type GripPose = HoldPose;

/**
 * Wo der Standardgriff in der Hand liegt — Ort im Griffraum, Drehung im
 * Strahlraum. Es sind die Zahlen der **Pistole**, wie sie gebaut ist: 5,5 cm
 * unter ihrem Nullpunkt, 12,6° nach hinten gelehnt.
 *
 * Einer, nicht zwei. Ein Stabgriff — dasselbe Rohr, aber *längs* der Faustachse
 * angebaut — war ein zweiter Ort in derselben Faust, und zwei Orte in einer
 * Faust gibt es nicht: das eine ist der Griff, das andere die Stelle daneben.
 * Zwei Griffe zogen deshalb zwangsläufig zwei Fäuste nach sich, und die beiden
 * Fäuste standen 111° gegeneinander, obwohl sie dasselbe umschlossen.
 */
export const STANDARD_GRIP: GripPose = {
  position: { x: 0, y: -0.055, z: 0.01 },
  rotation: quatFromEulerXYZ({ x: -0.22, y: 0, z: 0 }),
};

/**
 * Wie weit **Griffraum und Zeigestrahl** auf der Quest auseinanderliegen — die
 * einzige Zahl, über die sich Hand und Werkzeug überhaupt treffen können.
 *
 * Eine Hand steht im Griffraum (dort sitzt sie auf dem Controller), ein
 * gehaltenes Werkzeug im Strahlraum (dorthin zielt es). Wer wissen will, wo der
 * Griff eines Werkzeugs in der Faust landet, braucht die Drehung zwischen
 * beiden — und die gehört dem Gerät, nicht dem Code.
 *
 * Es ist dieselbe Drehung, die `aimRotation` aus einem Controller liest: sie
 * legt etwas aus dem Griffraum auf den Zeigestrahl. Im Spiel kommt sie von dort
 * und nicht von hier — diese Zahl ist für alles da, was **gebaut** wird, lange
 * bevor eine Brille auf dem Kopf sitzt: die Lage eines Griffs im Werkzeug, die
 * Faust darum, und das Bild auf der Werkzeugseite.
 *
 * Es sind die **30°**, die es hier ohnehin an drei Stellen gibt: so weit
 * schossen früher alle Werkzeuge zu hoch (`aim.ts`), so weit steht der Griff
 * einer Quest gegen ihren Zeigestrahl, und genau so weit war die am
 * Justierstand eingemessene Taschenlampe gegen den Strahl gedreht (30/5/9°).
 * Drei Wege, eine Zahl.
 */
export const GRIP_TO_RAY: Quat = quatFromEulerXYZ({ x: (-30 * Math.PI) / 180, y: 0, z: 0 });

/**
 * Die `holdPosition`, die jedes Werkzeug **mit dem Standardgriff** trägt.
 *
 * Geteilt sein muss sie, sonst kürzt sich `aim` unten nicht weg. Sie ist aber
 * nicht bloß geteilt, sondern **gerechnet**: sie legt den Griff genau auf den
 * Griffpunkt des Controllers, also in die Mitte der Faust — dorthin, wo die
 * echte Hand das echte Gerät hält.
 *
 * Vorher stand hier die gebaute Zahl der Pistole, und mit ihr hing der grüne
 * Zylinder **8,6 cm neben der Hand**: das Werkzeug lag im Griffpunkt, sein
 * Griff fünfeinhalb Zentimeter darunter, und die Faust musste ihn irgendwo
 * dazwischen suchen. Jetzt liegt der Griff in der Hand und das Werkzeug
 * darüber, wie eine Pistole über der Faust, die sie hält.
 */
export const GRIP_HOLD_POSITION: Vec3 = negate(
  rotateVec(STANDARD_GRIP.position, GRIP_TO_RAY, { x: 0, y: 0, z: 0 }),
);

/**
 * Wo der Griff **im Werkzeug** sitzen muss, damit er in der Faust dort landet,
 * wo er hingehört.
 *
 * Die Antwort auf die Frage, die ein Werkzeug beim Bauen stellt: „ich liege so
 * und so in der Hand — wohin kommt mein Griff?"
 *
 * @param hold die `holdRotation` des Werkzeugs, also seine Zusatzneigung gegen
 *             die Zielrichtung. Für alles, was schlicht nach vorn zeigt, die Ruhe.
 */
export function gripInTool(hold: Quat = IDENTITY): GripPose {
  const inverse = conjugate(hold, { x: 0, y: 0, z: 0, w: 1 });
  return {
    position: rotateVec(STANDARD_GRIP.position, inverse, { x: 0, y: 0, z: 0 }),
    rotation: normalize(multiplyQuat(inverse, STANDARD_GRIP.rotation, { x: 0, y: 0, z: 0, w: 1 })),
  };
}

/** Woran eine Faust hängt: was sie umschließt und wohin ihr Finger zeigt. */
export interface Fist {
  /**
   * Wo die geschlossene Faust ihren Zylinder hält, im Raum der gebauten Hand —
   * aus der Geometrie der Finger, nicht geschätzt.
   */
  centre: Vec3;
  /**
   * Wohin der **Zeigefinger** dabei zeigt, im selben Raum — wenn er etwas
   * zeigen soll. Nicht dasselbe wie das -Z der Hand: ein gekrümmter Finger
   * zeigt unter der Handachse hindurch, und um genau diesen Winkel wird die
   * Faust am Griff geschwenkt, damit der Finger auf der Grifflinie liegt.
   *
   * Ohne Finger bleibt die Faust ungeschwenkt: ihre Handachse liegt dann
   * selbst auf der Grifflinie. Das ist die Faust um einen Griff, an dem kein
   * Finger etwas anzeigt — den Stiel des Hammers, die Griffe der Drohne.
   */
  finger?: Vec3;
}

/**
 * Ein Zylinder **in der Hand**: seine Mitte im Griffraum und seine Drehung,
 * mit demselben Rahmen wie jeder Griff — Achse auf +Y, Vorne auf -Z.
 *
 * Das ist die Größe, an der eine Faust hängt. Für den Standardgriff ist sie
 * eine Konstante (`STANDARD_GRIP_IN_HAND`); für alles, was seinen Zylinder
 * anderswo trägt, rechnet `gripInHand` sie aus der Lage des Werkzeugs in der
 * Hand und der des Griffs im Werkzeug.
 */
export type GripInHand = GripPose;

/**
 * Wo ein Griff in der Hand liegt, wenn das Werkzeug so in ihr liegt.
 *
 * Dieselbe Kette wie `Tool.applyHold`, nur ohne Brille: das Werkzeug hängt bei
 * `holdPosition` im Griffraum und ist um `aim · holdRotation` gedreht, der Griff
 * darin um seine eigene Lage weiter. Für `aim` steht die Zahl des Geräts,
 * `GRIP_TO_RAY`.
 */
export function gripInHand(hold: HoldPose, grip: GripPose): GripInHand {
  const held = multiplyQuat(GRIP_TO_RAY, hold.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const offset = rotateVec(grip.position, held, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: hold.position.x + offset.x,
      y: hold.position.y + offset.y,
      z: hold.position.z + offset.z,
    },
    rotation: normalize(multiplyQuat(held, grip.rotation, { x: 0, y: 0, z: 0, w: 1 })),
  };
}

/**
 * Der Standardgriff in der Hand: auf dem Griffpunkt, denn genau dorthin legt
 * ihn `GRIP_HOLD_POSITION` — die Mitte ist deshalb (bis auf Rundung) die Null.
 */
export const STANDARD_GRIP_IN_HAND: GripInHand = gripInHand(
  { position: GRIP_HOLD_POSITION, rotation: IDENTITY },
  STANDARD_GRIP,
);

/**
 * **Die Faust um den Griff** — die Lage, in der eine rechte Hand ihn hält,
 * ausgerechnet statt eingestellt.
 *
 * Drei Bedingungen, und sie lassen genau eine Lage übrig:
 *
 * - die **Faustachse** (das X der gebauten Hand, quer über die Handfläche, um
 *   das sich die Finger schließen) liegt auf der **Griffachse**, Daumenseite
 *   nach oben aus der Faust heraus;
 * - die **Fingerlinie** liegt auf der **Grifflinie**: der Zeigefinger zeigt
 *   dorthin, wohin der Griff zeigt — und das ist bei allem mit Standardgriff
 *   die Zielrichtung des Werkzeugs;
 * - die Mitte der Faust liegt auf der Mitte des Griffs.
 *
 * **Die Hand steht dabei schräg am Griff, und wie schräg, sagt der
 * Zeigefinger.** Ein gekrümmter Finger zeigt unter der Handachse hindurch, und
 * um genau diesen Winkel wird die Faust um die Griffachse geschwenkt, damit
 * der Finger auf der Grifflinie liegt. Mit dem Finger am Abzug (Krümmung 0,35)
 * waren das 58° — und die Handfläche stand damit als schräger Klotz neben dem
 * Griff, die Faust sah nach allem aus, nur nicht nach einer Hand an einer
 * Waffe. Der Zeigefinger der Standardfaust liegt deshalb **gestreckt am
 * Rahmen** (Krümmung 0,1, `GRIP_HAND_POSE`), wie es eine Hand an einer Waffe
 * tut, die gerade nicht schießt: die Faust steht dann 17° schräg, die
 * Handfläche liegt längs am Griff, und die Finger schließen sich davor.
 *
 * Gerechnet ist das der Griffrahmen, zweimal gedreht: eine Vierteldrehung um Z
 * legt das X der Hand auf das -Y des Griffs, und eine Drehung um die
 * Griffachse legt die Fingerlinie auf die Grifflinie. Der Rest ist der Versatz
 * der Faustmitte in der gebauten Hand.
 *
 * Es ist derselbe Maßstab, den die Werkzeugseite am Knopf *Auf den Griff*
 * anlegt und den man dort auch sieht: die bernsteinfarbene Linie am Finger und
 * der rosa Pfeil am Griff liegen übereinander, wenn die Faust sitzt.
 *
 * Warum hier und nicht bei der Hand: das Ergebnis hängt am Griff, und der steht
 * in dieser Datei. `core/handPose.ts` trägt nur noch die fertigen Zahlen, so wie
 * eine Messung sie trüge — nachgerechnet wird in `core/gripFist.test.ts`.
 *
 * @param grip der Zylinder, um den es geht, in der Hand. Ohne Angabe der
 *             Standardgriff; der Stiel des Hammers und die Griffe der Drohne
 *             kommen über `gripInHand` hier an — dieselbe Rechnung, ein anderer
 *             Zylinder, eine eigene Faust.
 */
export function fistOnGrip(fist: Fist, grip: GripInHand = STANDARD_GRIP_IN_HAND): HoldPose {
  const upright = multiplyQuat(grip.rotation, quatFromEulerXYZ({ x: 0, y: 0, z: -Math.PI / 2 }), {
    x: 0,
    y: 0,
    z: 0,
    w: 1,
  });
  // Wie weit der Finger unter der Handachse hindurchzeigt — er liegt in der
  // Ebene quer zur Faustachse, also ist es eine Drehung um genau diese Achse,
  // und die Faust bleibt dabei auf ihrem Zylinder.
  const droop = fist.finger ? Math.atan2(fist.finger.y, -fist.finger.z) : 0;
  const rotation = normalize(
    multiplyQuat(upright, quatFromEulerXYZ({ x: -droop, y: 0, z: 0 }), { x: 0, y: 0, z: 0, w: 1 }),
  );
  // Die Faustmitte gehört auf die Mitte des Griffs: die Hand steht also um
  // ihre eigene Faustmitte daneben.
  const centre = rotateVec(fist.centre, rotation, { x: 0, y: 0, z: 0 });
  return {
    position: {
      x: grip.position.x - centre.x + 0,
      y: grip.position.y - centre.y + 0,
      z: grip.position.z - centre.z + 0,
    },
    rotation,
  };
}

/**
 * Und rückwärts: wie das Werkzeug in der Hand liegen **muss**, wenn sein Griff
 * dort sitzt, wo er sitzt.
 *
 * Das ist der Weg für alles, dessen Griff nicht frei wählbar ist — das Rohr
 * einer Taschenlampe liegt, wo es liegt, und die Lampe hat sich danach zu
 * richten. Die `holdPosition` ist dabei nicht frei: sie ist `GRIP_HOLD_POSITION`,
 * und das Werkzeug hat seinen Griff an `gripInTool(kind, hier)` zu setzen —
 * `gripDeviation` sagt, ob es das getan hat.
 */
export function holdForGrip(gripRotation: Quat): Quat {
  return normalize(
    multiplyQuat(STANDARD_GRIP.rotation, conjugate(gripRotation, { x: 0, y: 0, z: 0, w: 1 }), {
      x: 0,
      y: 0,
      z: 0,
      w: 1,
    }),
  );
}

/** Wie weit ein gebauter Griff von seinem Standard abweicht. */
export interface GripDeviation {
  /** Abstand in Metern, im Strahlrahmen gemessen. */
  distance: number;
  /** Winkel in Grad — die kürzeste Drehung zwischen beiden Lagen. */
  angle: number;
}

/**
 * Das Maßband: wie weit liegt der Griff dieses Werkzeugs neben dem Standard?
 *
 * Gemessen wird im **Strahlrahmen**, also mit `holdRotation` eingerechnet und
 * `aim` herausgekürzt — genau die beiden Größen aus der Rechnung oben. Ein
 * Werkzeug mit `distance` und `angle` bei null trägt einen Standardgriff und
 * darf sich die Faust dazu nehmen; alles darüber ist die Zahl, die man kennen
 * will, bevor man es behauptet.
 */
export function gripDeviation(hold: Quat, grip: GripPose): GripDeviation {
  const standard = STANDARD_GRIP;
  const position = rotateVec(grip.position, hold, { x: 0, y: 0, z: 0 });
  const rotation = multiplyQuat(hold, grip.rotation, { x: 0, y: 0, z: 0, w: 1 });
  const delta = conjugate(rotation, { x: 0, y: 0, z: 0, w: 1 });
  const between = multiplyQuat(delta, standard.rotation, { x: 0, y: 0, z: 0, w: 1 });
  return {
    distance: Math.hypot(
      position.x - standard.position.x,
      position.y - standard.position.y,
      position.z - standard.position.z,
    ),
    angle: (2 * Math.acos(Math.min(1, Math.abs(between.w))) * 180) / Math.PI,
  };
}

function normalize(q: Quat): Quat {
  const length = Math.hypot(q.x, q.y, q.z, q.w) || 1;
  return { x: q.x / length, y: q.y / length, z: q.z / length, w: q.w / length };
}

/** `-0` liest sich auf einem Schild voller kleiner Zahlen wie ein Fehler. */
function negate(v: Vec3): Vec3 {
  return { x: -v.x + 0, y: -v.y + 0, z: -v.z + 0 };
}
