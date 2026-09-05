/**
 * **Der Handgriff des Quest-Controllers**, im Griffraum — die eine Zahl, an der
 * die Hand am Controller hängt.
 *
 * Der Griffraum, den die Brille meldet, ist nicht der Controller: sein
 * Ursprung liegt im Handgriff des Geräts, seine Achsen sind die des
 * WebXR-Standards, und wie das Gerät darin liegt, sagt nur das Modell des
 * Herstellers (`public/controllers`, siehe `core/ControllerModels.ts`). Aus
 * genau diesem Modell sind die Zahlen hier abgelesen (Meta Quest Touch Plus,
 * rechte Schale, Scheiben quer zum Handgriff): der **Handgriff läuft entlang
 * der Z-Achse**, sein Kopf mit Stick und Tasten sitzt am -Z-Ende, der Trigger
 * darunter (-Y), und der Griff selbst steht bei der rechten Hand einen
 * Zentimeter nach +X — zur Handfläche hin. Die linke Schale ist das
 * Spiegelbild.
 *
 * Damit liegt der **Daumen am -Z-Ende**, der Handrücken zeigt nach +X (rechts),
 * und die Finger schließen sich von der Handfläche unter dem Gerät hindurch
 * (-Y, dort ist der Trigger) auf die Innenseite, wo der Griffknopf sitzt. Die
 * Faust dazu ist gerechnet wie jede andere (`core/gripFist.test.ts`,
 * `CONTROLLER_HAND_POSE`) — ohne Zielkorrektur, denn der Controller liegt im
 * Griffraum selbst und nicht im Strahl.
 *
 * Vorher trug die Hand am Controller die **gemessene Grundhaltung** als Faust.
 * Die stand aber 74° quer zum Handgriff: eine Hand, die ein Gerät hält, das
 * schräg neben ihr liegt. Man sah es nur mit dem Controller als Werkzeug in der
 * Hand — und dort sah man es sofort.
 *
 * Ohne three.js, damit der Test die Faust daraus rechnen kann; das Modul mit
 * dem GLTF-Lader kann Jest nicht laden.
 */

import { gripFrame } from '../worlds/portal/tools/gripFit';
import type { HoldPose } from '../worlds/portal/tools/toolPose';

/**
 * Der Handgriff als Zylinder, im Griffraum der **rechten** Hand: seine Mitte
 * dort, wo die Faust ihn hält, und seine Länge — vom Kopf des Geräts bis zum
 * unteren Ende.
 */
export const CONTROLLER_HANDLE = {
  /** Mitte des Zylinders, in Metern: zur Handfläche hin, auf Höhe der Achse, am Griffknopf. */
  centre: { x: 0.01, y: 0.001, z: 0.015 },
  /** Halbmesser quer (x) und hoch (y) — der Handgriff ist eine flache Ellipse. */
  radius: { x: 0.016, y: 0.021 },
  /** Von wo bis wo er auf der Z-Achse läuft. */
  from: 0.005,
  to: 0.075,
} as const;

/**
 * Derselbe Handgriff im Rahmen jedes Griffs (`gripFit.ts`: Achse auf +Y,
 * Vorne auf -Z): die Achse zeigt zum Kopf des Geräts (-Z, dorthin liegt der
 * Daumen), der Handrücken nach rechts (+X). Das Vorne — wohin die Finger
 * greifen — ist damit -Y: der Trigger. Für die linke Hand gilt die Spiegelung,
 * wie bei jeder Haltung.
 */
export const CONTROLLER_GRIP: HoldPose = {
  position: { ...CONTROLLER_HANDLE.centre },
  rotation: gripFrame({ x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: 0 }),
};
