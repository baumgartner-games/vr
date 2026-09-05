import * as THREE from 'three';
import { grabMaterial } from './Tool';
import { gripInTool, holdForGrip } from './gripFit';
import { quatFromEulerXYZ } from './toolPose';
import type { GripKind } from '../../../core/handPose';
import type { Quat } from './aim';

/**
 * **Der Griff** — ein Ding, das man baut, und nicht zwanzig, die sich ähneln.
 *
 * Vorher trug jedes Werkzeug seinen eigenen Kasten in Greiffarbe, jeder ein
 * paar Millimeter anders, und drei davon lehnten in die falsche Richtung
 * (`gripFit.ts` rechnet die Abweichungen vor). Das war nicht bloß unordentlich:
 * eine Faust, die zu einem von sieben gleich gehaltenen Griffen passt, passt zu
 * sechs nicht, und niemand sieht, an welchem es liegt.
 *
 * Also einmal, hier. Ein **Zylinder mit ellipsenförmigem Querschnitt** —
 * vorn/hinten tiefer als quer, wie jeder Griff, den eine Hand umfasst — und
 * **Wellen für die Finger**: drei flache Rillen auf der Vorderseite, dort, wo
 * Zeige-, Mittel- und Ringfinger liegen. Sie sind nicht Zierde, sie sind die
 * Auskunft: eine Rille sagt „hier herum", und wer sie sieht, muss nicht raten,
 * in welcher Richtung das Ding in die Hand gehört.
 *
 * Der Rahmen ist der aus `gripFit.ts`: die Achse liegt auf **+Y**, oben aus der
 * Faust heraus, und **-Z** ist vorne — dorthin, wohin der Zeigefinger zeigt.
 * Gebaut wird die Geometrie um den **Mittelpunkt** des Griffs, damit die Lage
 * eines Griffs seine Mitte ist und nicht eine seiner Kanten.
 *
 * Gebaut wird sie als `LatheGeometry` und nicht aus vier Kästen: ein Profil, in
 * dem die Rillen als Knick im Radius stehen, gedreht und danach quer gestaucht.
 * Damit sind Länge, Dicke und Rillen drei Zahlen und nicht drei Meshes.
 */

/** Länge des Griffs — eine Faust ist ungefähr so breit. */
export const GRIP_LENGTH = 0.098;
/** Halbmesser quer zur Hand … */
export const GRIP_WIDTH = 0.0165;
/** … und in Griffrichtung, wo eine Hand mehr zu fassen bekommt. */
export const GRIP_DEPTH = 0.023;
/** Wie tief die Fingerrillen einschneiden. */
const WAVE = 0.0022;
/** Wie viele Rillen — Zeige-, Mittel-, Ringfinger. Der kleine liegt am Ende. */
const WAVES = 3;

/** Woran man einen Griff im Werkzeugbaum wiedererkennt. */
export const GRIP_NAME = 'tool-grip';

export interface GripOptions {
  /** Kürzer oder länger als der Standard, in Metern. */
  length?: number;
  /** Dicker oder dünner: ein Faktor auf beide Halbmesser. */
  thickness?: number;
  /** Ohne Rillen — für einen Stabgriff, der ringsum gleich aussieht. */
  waves?: boolean;
  /** Mit der Linie, die zeigt, wo bei diesem Griff vorne ist. */
  front?: boolean;
}

/**
 * **Wo vorne ist**, als Linie.
 *
 * Ein Griff ist ein Zylinder, und einem Zylinder sieht man nicht an, wie herum
 * er in der Faust liegt — die drei Rillen sagen es, aber erst, wenn man genau
 * hinsieht, und aus zwei Metern gar nicht. Die Linie sagt es sofort: sie läuft
 * aus der Mitte des Griffs nach **-Z**, dorthin, wohin der Zeigefinger zeigt
 * und wohin bei einem Pistolengriff auch das Werkzeug zeigt.
 *
 * **Rosa**, und das ist keine Laune: der Griff selbst ist grün (Greiffarbe),
 * die Hand hellblau und die Linie am Zeigefinger bernsteinfarben. Grün auf
 * grün war die erste Fassung, und darauf sah man den Pfeil erst, wenn man
 * wusste, dass er da ist. Die beiden Linien nebeneinander — wohin die *Hand*
 * zeigt, wohin der *Griff* zeigt — sind genau die Auskunft, um die es beim
 * Justieren geht, und dafür müssen sie auseinanderzuhalten sein.
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
 * Hängt jedem Griff in einem Baum seine Vorne-Linie an — auch denen, die
 * niemand über `createGrip` gebaut hat.
 *
 * Denn nicht jeder Griff kommt von dort: die Drohne setzt sich zwei an ihr
 * Deck, und die zeigen genauso in eine Richtung. Gesucht wird deshalb die
 * **Form** und nicht die Gruppe darum — sie ist das, was alle gemeinsam haben.
 *
 * Die Umkehrung der Querstauchung ist kein Zierrat: die Form ist in X
 * gestaucht, damit der Zylinder eine Ellipse wird, und ohne sie stünden die
 * Widerhaken des Pfeils schief.
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
    line.scale.x = 1 / (shape.scale.x || 1);
    shape.add(line);
    return line;
  });
}

/**
 * Das Profil eines Griffs: der halbe Umriss in der YZ-Ebene, von unten nach
 * oben, mit den Rillen als Welle im Radius.
 *
 * `LatheGeometry` dreht es um die **Y-Achse** — deshalb liegt die Achse des
 * Griffs auf Y, ohne dass irgendwo eine Vierteldrehung nachgeholt werden muss.
 */
function profile(length: number, radius: number, waves: boolean): THREE.Vector2[] {
  const points: THREE.Vector2[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = (t - 0.5) * length;
    // Zu den Enden hin dünner: ein Zylinder mit scharfen Kanten sieht aus wie
    // ein abgesägtes Rohr, ein Griff hat einen Bauch.
    const belly = 1 - 0.1 * Math.cos(t * Math.PI * 2);
    const groove = waves ? WAVE * Math.cos(t * Math.PI * 2 * WAVES) : 0;
    points.push(new THREE.Vector2(Math.max(0.001, radius * belly - groove), y));
  }
  // Deckel oben und unten, sonst schaut man in einen hohlen Griff hinein.
  points.unshift(new THREE.Vector2(0, -length / 2));
  points.push(new THREE.Vector2(0, length / 2));
  return points;
}

/**
 * Ein Griff als Mesh, in Greiffarbe, um seinen Mittelpunkt gebaut.
 *
 * Die Ellipse entsteht durch Stauchen: das Profil wird mit dem *größeren* der
 * beiden Halbmesser gedreht und danach quer zusammengedrückt. Eine Skalierung
 * an einem Mesh und keine an einer Gruppe, damit die Lage des Griffs — die
 * Größe, um die es hier geht — unskaliert bleibt.
 */
export function createGripShape(options: GripOptions = {}): THREE.Mesh {
  const length = options.length ?? GRIP_LENGTH;
  const factor = options.thickness ?? 1;
  const depth = GRIP_DEPTH * factor;
  const mesh = new THREE.Mesh(
    new THREE.LatheGeometry(profile(length, depth, options.waves ?? true), 18),
    grabMaterial({ roughness: 0.78 }),
  );
  mesh.name = `${GRIP_NAME}-shape`;
  mesh.scale.x = (GRIP_WIDTH * factor) / depth;
  if (options.front) {
    const line = createGripFront();
    line.scale.x = 1 / mesh.scale.x;
    mesh.add(line);
  }
  return mesh;
}

/**
 * Ein Griff **an der Stelle, an der er in die Faust gehört** — der eine Weg,
 * auf dem ein Werkzeug zu einem Standardgriff kommt.
 *
 * Das Werkzeug sagt nur, *wie* es gehalten wird (`kind`) und wie es dabei in der
 * Hand liegt (`hold`, seine `holdRotation`); wohin der Griff dann kommt, ist
 * keine Frage des Geschmacks mehr, sondern `gripInTool`. Zurück kommt eine
 * Gruppe, die man ohne weiteres Zutun ins Werkzeug hängt — und deren Lage
 * *ist* die Lage des Griffs, die `Tool.gripPose` meldet.
 */
export function createGrip(
  kind: GripKind,
  hold: Quat | undefined,
  options: GripOptions = {},
): THREE.Group {
  const at = gripInTool(kind, hold);
  const group = new THREE.Group();
  group.name = GRIP_NAME;
  group.position.set(at.position.x, at.position.y, at.position.z);
  group.quaternion.set(at.rotation.x, at.rotation.y, at.rotation.z, at.rotation.w);
  group.add(createGripShape(options));
  return group;
}

/**
 * Die Drehung, mit der ein Griff **entlang der eigenen -Z-Achse** eines
 * Werkzeugs liegt — ein Stab, dessen Spitze vorn sitzt.
 *
 * Das ist die eine Griffdrehung, die ein stabförmiges Werkzeug hat: seine Achse
 * *ist* die Griffachse, und vorn (`+Y` des Griffs, oben aus der Faust heraus)
 * ist die Seite, an der die Spitze sitzt.
 */
export const ROD_GRIP_ROTATION = quatFromEulerXYZ({ x: -Math.PI / 2, y: 0, z: 0 });

/**
 * Und die `holdRotation`, die daraus folgt: so muss ein Stab in der Hand
 * liegen, damit sein Griff dort landet, wo der Stabgriff hingehört.
 *
 * Die Taschenlampe hat diese Zahl eingemessen und schreibt sie deshalb selbst
 * hin; alles andere Stabförmige holt sie hier ab, statt sie abzuschreiben —
 * `gripFit.test.ts` hält fest, dass beides dasselbe ist.
 */
export function rodHoldRotation(target: THREE.Quaternion): THREE.Quaternion {
  const q = holdForGrip('rod', ROD_GRIP_ROTATION);
  return target.set(q.x, q.y, q.z, q.w);
}
