import type { Quat, Vec3 } from './tools/aim';

/**
 * **Aus der Kugel wird eine Patrone** — wie groß sie wird und wohin sie zeigt.
 *
 * Bis hierher war eine Kugel eine `SphereGeometry` in Gelb, und ihr Halbmesser
 * hing an der Masse: „a heavier round is a bigger one". Das bleibt, denn das
 * ist die **Rechnung** — derselbe Halbmesser ist zugleich die Hülle des
 * Kugelkörpers in der Physik (`shape: { kind: 'ball' }`). Getauscht wird nur
 * das **Bild** (`docs/agents/modelle.md`, Regel 1).
 *
 * Diese Datei rechnet die zwei Dinge, die dieser Tausch braucht, und sie tut
 * es ohne three.js, damit `bulletFit.test.ts` sie nachrechnen kann.
 */

/**
 * Die Patrone im Regal: ein Knoten `Bullet`, um seinen Ursprung zentriert,
 * lange Achse **+z**. Gemessen wird trotzdem am geladenen Netz — diese Adresse
 * ist alles, was hier abgeschrieben ist.
 */
export const BULLET_MODEL = 'prototype-bits/Bullet.glb';

/**
 * **„Doppelt so groß"**, als Rechnung.
 *
 * Was man heute sieht, ist eine Kugel mit 0,014 m Halbmesser, also **2,8 cm
 * Durchmesser**; doppelt so groß heißt 5,6 cm. Nur: Eine Kugel ist rund und
 * eine Patrone ist lang — bei `Bullet.glb` steht die Länge zur Dicke wie 3 : 1
 * —, und damit ist „doppelt so groß" keine Zahl mehr, sondern eine
 * Entscheidung. Es gibt zwei ehrliche Kandidaten:
 *
 * - **Auf die Dicke**: 5,6 cm stark, dann ist sie 16,8 cm lang. Das ist kein
 *   Geschoss mehr, sondern eine Rakete.
 * - **Auf die Länge**: 5,6 cm lang, dann ist sie 1,87 cm stark.
 *
 * Genommen ist die **Länge**, und zwar weil die Länge das ist, was man von
 * einer Patrone im Flug überhaupt sieht: Sie streift quer durchs Bild, und ihr
 * Umriss von der Seite misst 5,6 × 1,87 cm ≈ 10,5 cm², gegen 6,2 cm² der
 * heutigen Kugelscheibe — knapp das Doppelte. Genau das war gewünscht.
 *
 * **Ehrlich dazugesagt**: Von vorn ist sie dünner als das Kügelchen, das sie
 * ersetzt (1,87 cm statt 2,8 cm). Wer geradeaus schießt und der Kugel
 * hinterhersieht, sieht damit weniger als vorher, nicht mehr. Die Leuchtspur
 * hängt aus demselben Grund weiter an ihrer eigenen Linie (`Trail`) und nicht
 * am Netz.
 *
 * Vier, nicht zwei: Der Halbmesser kommt herein, der Durchmesser ist sein
 * Doppeltes, und doppelt so groß ist noch einmal das Doppelte.
 */
export const BULLET_LENGTH_IN_RADII = 4;

/**
 * **Der Faktor auf das gemessene Netz**, damit die Patrone so lang wird.
 *
 * `length` ist die gemessene lange Achse des schon paketskalierten Modells
 * (`core/kaykitFit.kaykitScale`), `radius` der Halbmesser, an dem die Physik
 * und die Masse hängen. `1` heißt „lass es, wie es ist" — dieselbe Antwort auf
 * unmögliche Eingaben wie in `core/kaykitHeight.kaykitHeightScale`.
 */
export function bulletScale(length: number, radius: number): number {
  if (!(length > 1e-6) || !(radius > 0)) return 1;
  return (radius * BULLET_LENGTH_IN_RADII) / length;
}

/**
 * **Die Patrone fliegt, wie sie zeigt** — die Drehung, die `+z` des Modells
 * auf die Flugrichtung legt.
 *
 * Eine Kugel ist rund und hat keine Richtung; eine Patrone hat eine Spitze,
 * und eine Patrone, die seitlich durch die Luft schlittert, sieht falscher aus
 * als ein Kügelchen. Gerechnet wird die kürzeste Drehung von `+z` auf
 * `direction` — die halbe Winkelhalbierende, wie `Quaternion.setFromUnitVectors`
 * sie bildet, nur hier, damit ein Test sie nachrechnen kann.
 *
 * **Der Gegenfall ist der interessante**: Wer nach `−z` schießt, hat keine
 * kürzeste Drehung, sondern unendlich viele — jede halbe Umdrehung um eine
 * Achse quer dazu tut es. Genommen ist die Hochachse, und das ist genau die
 * Drehung, die auch `pistolFit.gunPoint` für die ganze Waffe nimmt: Eine
 * Patrone, die geradeaus nach vorn fliegt, liegt damit so herum wie die Waffe,
 * aus der sie kommt.
 *
 * `direction` muss nicht normiert sein; das Ergebnis ist es.
 */
export function bulletAim(direction: Vec3): Quat {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (!(length > 1e-9)) return { x: 0, y: 0, z: 0, w: 1 };
  const x = direction.x / length;
  const y = direction.y / length;
  const z = direction.z / length;
  // `w` ist `1 + cos(Winkel)` und wird null, wenn die Patrone genau nach
  // hinten zeigen soll. Die Achse ist bis dahin `+z × direction`.
  const w = 1 + z;
  if (w < 1e-9) return { x: 0, y: 1, z: 0, w: 0 };
  const axisX = -y;
  const axisY = x;
  const scale = 1 / Math.hypot(axisX, axisY, w);
  return { x: axisX * scale, y: axisY * scale, z: 0, w: w * scale };
}
