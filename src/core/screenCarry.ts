import { CHEF_CARRY } from './chefFit';
import { craneCarryY } from './crane';

/**
 * **Wo ein getragener Gegenstand am Schirm hängt** — ohne three.js, ohne
 * Physik, ohne Welt.
 *
 * In der Brille ist die Frage beantwortet, bevor sie gestellt wird: Das Ding
 * hängt an der Faust, und die Faust ist da, wo der Mensch sie hinhält. Am
 * Schirm gibt es diese Faust nicht — es gibt eine Figur, eine feste Kamera
 * und zwei sehr verschiedene Ansichten. Deshalb steht die Antwort hier, als
 * Rechnung neben der Darstellung (`worlds/portal/screenHand.ts` hängt den
 * Anker dorthin, wo diese Datei ihn hinrechnet).
 *
 * Zwei Ansichten, zwei ganz verschiedene Fragen:
 *
 * - **Von oben** sieht man die Figur von hinten oben. Was sie trägt, muss
 *   **neben** ihr liegen und nicht unter ihrem Kopf — dieselbe Antwort, die
 *   die Küche längst gefunden hat (`core/chefFit.CHEF_CARRY`, „vor dem
 *   Bauch"). Übernommen und nicht neu erfunden: Zwei Stellen, an denen eine
 *   Figur etwas vor sich her trägt, wären zwei Stellen, die auseinanderlaufen.
 * - **Aus den Augen** sieht man die Figur gar nicht. Was sie trägt, muss
 *   deshalb **ins Bild** — vor die Kamera, etwas unterhalb der Blickachse,
 *   so wie man ein Ding vor sich hält, um es anzusehen.
 *
 * **Und beide Male entscheidet die Größe mit.** Das Regal gibt viertausend
 * Modelle her, von einem Schlüssel bis zu einem Baum von vier Metern. Ein
 * fester Punkt wäre für das eine unsichtbar und für das andere eine Wand vor
 * dem Gesicht. Also rückt das Ding um seinen eigenen Halbmesser weiter weg,
 * und von oben steigt es so weit, dass es nicht im Boden steckt.
 */

/** Welche der beiden flachen Ansichten gerade läuft. */
export type ScreenCarryView = 'topDown' | 'firstPerson' | 'crane';

/** Wie groß das Getragene ist — mehr braucht die Rechnung nicht. */
export interface CarrySpan {
  /** Halbe Ausdehnung in der Waagerechten, in Metern. */
  readonly radius: number;
  /** Halbe Höhe, in Metern. */
  readonly half: number;
}

/** Eine Stelle im Raum des Rigs. */
export interface CarryPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/**
 * **Wie weit die Hinterkante des Getragenen von der Figur wegbleibt**, in
 * Metern.
 *
 * Der Rumpf der Figur ist an seiner dicksten Stelle 0,35 m im Halbmesser
 * (`core/chefFit.CHEF_TOOL`); ein Fass, dessen Rückseite näher käme, steckte
 * von oben in ihr drin.
 */
export const CARRY_CLEAR = 0.35;

/**
 * **Wie hoch die Unterkante über dem Boden mindestens bleibt**, in Metern —
 * in **beiden** Ansichten.
 *
 * Von oben ist der Grund offensichtlich: Ein Fass, das halb im Fußboden
 * steckt, sieht aus wie ein Fehler. Aus den Augen war er es auch, nur später
 * zu sehen: Ein Ritter von 1,78 m, dessen Oberkante unter der Blickachse
 * hängt, hat seine Füße einen Vierteilmeter **unter** dem Boden — und weil man
 * zwei Meter vor sich den Boden sieht, sieht man das auch. Die Schranke sticht
 * dann die Blickachse; was dabei über die Mitte ragt, sind ein paar Grad und
 * kein zugedecktes Bild.
 */
export const CARRY_FLOOR = 0.05;

/**
 * **Wie weit vor der Kamera ein Ding hängt, aus den Augen** — der Grundwert,
 * zu dem sein Halbmesser noch dazukommt.
 *
 * Eine halbe Armlänge: Näher füllt schon ein Becher das halbe Bild, weiter
 * weg sieht es aus, als schwebe es vor einem her statt in der Hand zu liegen.
 */
export const CARRY_AHEAD = 0.5;

/**
 * **Wie viel Platz ein Ding je Meter seiner halben Ausdehnung bekommt.**
 *
 * Nicht eins zu eins, sondern knapp doppelt: So steht ein Ritter weit genug
 * weg, dass man ihn ganz sieht statt in seinen Helm zu schauen, und ein
 * Schlüssel bleibt trotzdem nah genug, dass man ihn erkennt. Der Winkel, unter
 * dem das Ding im Bild steht, bleibt damit ungefähr gleich — das ist der ganze
 * Zweck der Zahl.
 *
 * Gerechnet wird gegen die **größere** der beiden Halben, und zwar aus dem
 * Grund, der im Bild sofort zu sehen war: Ein Ritter ist 1,78 m hoch und nur
 * 1,36 m breit; nähme man nur die Breite, hinge er anderthalb Meter vor der
 * Kamera und füllte das halbe Bild mit seinem Helm.
 */
export const CARRY_ROOM = 1.8;

/** Und weiter als das geht nie, in Metern — sonst trägt man einen Baum am Horizont. */
export const CARRY_FAR = 3;

/**
 * **Wie weit unter der Blickachse die Oberkante liegt**, in Metern.
 *
 * Eine Handbreit: Das Getragene hängt sichtbar im unteren Bilddrittel und
 * deckt nicht zu, wohin man geht. Null wäre die Bildmitte, und dann trüge man
 * seine Beute vor dem eigenen Gesicht her.
 */
export const CARRY_BELOW = 0.1;

/**
 * **Die Stelle im Raum des Rigs**, an der das Getragene hängt.
 *
 * Im Raum des **Rigs** und nicht der Welt, und das genügt: Von oben dreht
 * sich das Rig selbst in die Laufrichtung (`core/FlatControls.walkNorthUp`),
 * aus den Augen dreht es die Maus. Wer hier zusätzlich um die Blickrichtung
 * der Figur drehte, drehte um null — dieselbe Rechnung wie beim Werkzeug in
 * der Bildschirmhand (`worlds/portal/screenHand.ts`).
 *
 * @param headY   Höhe des Kopfes im Raum des Rigs (`PlayerRig.camera.position.y`)
 * @param bob     das Wippen der Figur beim Gehen (`PlayerAvatar.bob`), nur von oben
 * @param stretch wie hoch die Figur gerade steht (`AvatarBody.stretch`), ebenso
 *                nur von oben: Aus den Augen sieht man sie gar nicht, und ein
 *                Teller, der vor der Kamera im Takt fremder Schritte hüpfte,
 *                wäre dort nur ein Wackeln ohne Grund.
 */
export function screenCarryPoint(
  view: ScreenCarryView,
  span: CarrySpan,
  headY: number,
  bob = 0,
  stretch = 1,
): CarryPoint {
  const radius = Math.max(0, span.radius);
  const half = Math.max(0, span.half);
  // **Der Kran trägt unter sich** (`core/crane.ts`): genau über der Stelle,
  // auf die der Kreis am Boden zeigt, mit der Oberkante an den Klauen. Ohne
  // Vorn gibt es kein „vor der Figur".
  if (view === 'crane') return { x: 0, y: craneCarryY(half), z: 0 };
  if (view === 'firstPerson') {
    // Vor der Kamera: so weit weg, wie das Ding groß ist, und so weit
    // heruntergehängt, dass seine Oberkante unter der Blickachse bleibt.
    const ahead = Math.min(CARRY_FAR, CARRY_AHEAD + Math.max(radius, half) * CARRY_ROOM);
    return { x: 0, y: Math.max(headY - CARRY_BELOW - half, half + CARRY_FLOOR), z: -ahead };
  }
  // Von oben: die Stelle der Küche, nur weit genug vorgerückt und hoch genug
  // gehoben für das, was dort liegt.
  //
  // **Und sie federt mit der Figur** (`stretch`), genau wie das Werkzeug in
  // ihrer Faust: Die Stelle ist eine an einem Bauch, und der geht mit, wenn
  // die Figur sich staucht oder streckt. Ein Fass, das ruhig in der Luft
  // stünde, während die Hände darunter auf und ab gehen, wäre genau das
  // Auseinanderlaufen, das diese Datei verhindern soll. Der Boden darunter
  // bleibt unverändert: Im Fußboden steckt es auch dann nicht, wenn die Figur
  // gerade am flachsten ist.
  return {
    x: CHEF_CARRY.x,
    y: Math.max(CHEF_CARRY.y * stretch + bob, half + CARRY_FLOOR),
    z: Math.min(CHEF_CARRY.z, -(CARRY_CLEAR + radius)),
  };
}
