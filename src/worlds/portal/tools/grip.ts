import * as THREE from 'three';
import { grabMaterial } from './Tool';
import { gripInTool } from './gripFit';
import type { Quat } from './aim';

/**
 * **Der Halterzylinder** — ein Ding, das man baut, und nicht zwanzig, die sich
 * ähneln.
 *
 * Vorher trug jedes Werkzeug seinen eigenen Kasten in Greiffarbe, jeder ein
 * paar Millimeter anders, und drei davon lehnten in die falsche Richtung
 * (`gripFit.ts` rechnet die Abweichungen vor). Das war nicht bloß unordentlich:
 * eine Faust, die zu einem von sieben gleich gehaltenen Haltern passt, passt zu
 * sechs nicht, und niemand sieht, an welchem es liegt.
 *
 * Also einmal, hier — und **nur ein Zylinder**. Rund, gerade, gleich dick von
 * oben bis unten. Er war eine Weile eine Ellipse mit Bauch und drei Rillen für
 * die Finger, und das war Formgebung an der falschen Stelle: was der Halter
 * darstellt, ist der **Handgriff des Controllers**, den die echte Hand ohnehin
 * umschließt, und der ist ein Zylinder. Alles, was daran modelliert wurde,
 * behauptete eine Vorzugsrichtung, die die Rechnung gar nicht kennt — und
 * niemand sah sie ohnehin, sobald die Faust darum lag.
 *
 * Der Rahmen ist der aus `gripFit.ts`: die Achse liegt auf **+Y**, oben aus der
 * Faust heraus, und **-Z** ist vorne — dorthin, wohin der Zeigefinger zeigt.
 * Wo bei einem runden Zylinder vorne ist, sagt deshalb nicht seine Form,
 * sondern seine Linie (`createGripFront`). Gebaut wird die Geometrie um den
 * **Mittelpunkt**, damit die Lage eines Halters seine Mitte ist und nicht eine
 * seiner Kanten.
 */

/** Länge des Halters — eine Faust ist ungefähr so breit. */
export const GRIP_LENGTH = 0.098;
/** Und sein Halbmesser: das Mittel aus dem, was die Ellipse vorher quer und längs war. */
export const GRIP_RADIUS = 0.02;

/** Woran man einen Halterzylinder im Werkzeugbaum wiedererkennt. */
export const GRIP_NAME = 'tool-grip';

export interface GripOptions {
  /** Kürzer oder länger als der Standard, in Metern. */
  length?: number;
  /** Dicker oder dünner: ein Faktor auf den Halbmesser. */
  thickness?: number;
  /** Mit der Linie, die zeigt, wo bei diesem Halter vorne ist. */
  front?: boolean;
}

/**
 * **Wo vorne ist**, als Linie.
 *
 * Ein Halter ist ein Zylinder, und einem Zylinder sieht man nicht an, wie herum
 * er in der Faust liegt. Die Linie sagt es: sie läuft aus der Mitte des Halters
 * nach **-Z**, dorthin, wohin der Zeigefinger zeigt und wohin bei einem
 * Pistolengriff auch das Werkzeug zeigt.
 *
 * **Rosa**, und das ist keine Laune: der Halter selbst ist grün (Greiffarbe),
 * die Hand hellblau, ihr Zeigestrahl weiß und der Zielpfeil des Werkzeugs
 * violett. Grün auf grün war die erste Fassung, und darauf sah man den Pfeil
 * erst, wenn man wusste, dass er da ist. Die Linien nebeneinander — wohin die
 * *Hand* zeigt, wohin der *Halter* zeigt — sind genau die Auskunft, um die es
 * beim Justieren geht, und dafür müssen sie auseinanderzuhalten sein.
 */
const FRONT_COLOR = 0xff6ea3;
const FRONT_LENGTH = GRIP_LENGTH * 1.5;
/** Die beiden Widerhaken an der Spitze, damit es ein Pfeil und kein Strich ist. */
const FRONT_BARB = 0.014;

/**
 * Die sechs Punkte eines Pfeils entlang **-Z**: der Schaft und die beiden
 * Widerhaken.
 *
 * Einzeln zu haben, weil ein Pfeil, dessen Länge sich ändert, seine Geometrie
 * neu bekommt statt skaliert zu werden — eine Skalierung zöge die Widerhaken
 * mit in die Länge, und dann ist es kein Pfeil mehr, sondern eine Gabel. Die
 * Werkzeugseite passt den **Zielpfeil** an die Größe dessen an, was auf der
 * Bühne steht (`tools/viewer.ts`).
 */
export function arrowPoints(length: number): THREE.Vector3[] {
  const tip = -length;
  const barb = tip + FRONT_BARB;
  return [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, tip),
    new THREE.Vector3(0, 0, tip),
    new THREE.Vector3(-FRONT_BARB * 0.6, 0, barb),
    new THREE.Vector3(0, 0, tip),
    new THREE.Vector3(FRONT_BARB * 0.6, 0, barb),
  ];
}

/** Ein solcher Pfeil als Linie, in der Farbe dessen, was er sagt. */
export function createArrow(color: number, length: number): THREE.LineSegments {
  return new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(arrowPoints(length)),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }),
  );
}

export function createGripFront(length = FRONT_LENGTH): THREE.LineSegments {
  const line = createArrow(FRONT_COLOR, length);
  line.name = `${GRIP_NAME}-front`;
  return line;
}

/**
 * Hängt jedem Halter in einem Baum seine Vorne-Linie an — auch denen, die
 * niemand über `createGrip` gebaut hat.
 *
 * Denn nicht jeder kommt von dort: die Drohne setzt sich zwei an ihr Deck, und
 * die zeigen genauso in eine Richtung. Gesucht wird deshalb die **Form** und
 * nicht die Gruppe darum — sie ist das, was alle gemeinsam haben.
 *
 * @returns die angehängten Linien, damit der Aufrufer sie wieder abräumen kann
 */
export function addGripFronts(root: THREE.Object3D, length?: number): THREE.LineSegments[] {
  const shapes: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (object.name === `${GRIP_NAME}-shape`) shapes.push(object);
  });
  return shapes.map((shape) => {
    const line = createGripFront(length);
    shape.add(line);
    return line;
  });
}

/**
 * Ein Halterzylinder als Mesh, in Greiffarbe, um seinen Mittelpunkt gebaut.
 *
 * `CylinderGeometry` steht in three.js von Haus aus auf **Y** — genau die Achse,
 * auf der ein Halter liegt (`gripFit.ts`), also ist hier nichts zu drehen.
 */
export function createGripShape(options: GripOptions = {}): THREE.Mesh {
  const length = options.length ?? GRIP_LENGTH;
  const radius = GRIP_RADIUS * (options.thickness ?? 1);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, length, 20),
    grabMaterial({ roughness: 0.78 }),
  );
  mesh.name = `${GRIP_NAME}-shape`;
  if (options.front) mesh.add(createGripFront());
  return mesh;
}

/**
 * Ein Halter **an der Stelle, an der er in die Faust gehört** — der eine Weg,
 * auf dem ein Werkzeug zu einem Standardhalter kommt.
 *
 * Das Werkzeug sagt nur, wie es dabei in der
 * Hand liegt (`hold`, seine `holdRotation`); wohin der Zylinder dann kommt, ist
 * keine Frage des Geschmacks mehr, sondern `gripInTool`. Zurück kommt eine
 * Gruppe, die man ohne weiteres Zutun ins Werkzeug hängt — und deren Lage
 * *ist* die Lage des Halters, die `Tool.gripPose` meldet.
 */
export function createGrip(hold: Quat | undefined, options: GripOptions = {}): THREE.Group {
  const at = gripInTool(hold);
  const group = new THREE.Group();
  group.name = GRIP_NAME;
  group.position.set(at.position.x, at.position.y, at.position.z);
  group.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
  group.add(createGripShape(options));
  return group;
}
