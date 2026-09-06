import type * as THREE from 'three';

/**
 * Die Rechnung hinter einer **Leinwand**: wo eine Pinselspitze und wo ein
 * Zielstrahl auf ihr landen.
 *
 * Beides in ihrem eigenen Rahmen — die Fläche liegt in der Ebene `z = 0`, `x`
 * nach rechts, `y` nach oben, und die Vorderseite ist `+z`. Wer eine Leinwand
 * baut, rechnet den Weltpunkt einmal mit `worldToLocal` herein und bekommt
 * hier `u`/`v` in 0…1 heraus; von da an ist es eine Zeichenfläche wie jede
 * andere.
 *
 * Ohne three.js und ohne Szene, damit der Test die Fälle prüfen kann, die man
 * in der Brille nur ahnt: der Strich, der knapp neben der Leinwand landet, der
 * Strahl, der von hinten kommt, und der, der die Ebene gar nicht mehr trifft.
 */

/** Ein Punkt im Blatt: `u` von links, `v` von **oben** — wie auf einer Leinwand. */
export interface CanvasPoint {
  u: number;
  v: number;
  /** Wie weit die Spitze (oder der Ursprung des Strahls) davor stand, in Metern. */
  distance: number;
}

/** Drei Zahlen, mehr braucht die Rechnung nicht. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Wo ein Punkt im Rahmen der Leinwand liegt.
 *
 * `reach` ist die Dicke, die noch als „berührt" zählt — vor *und* hinter dem
 * Blatt, denn eine Pinselspitze steht bei einem beherzten Strich auch mal
 * einen Zentimeter dahinter. `null` heißt: daneben oder zu weit weg.
 */
export function pointOnCanvas(
  local: Vec3,
  width: number,
  height: number,
  reach: number,
): CanvasPoint | null {
  if (Math.abs(local.z) > reach) return null;
  const u = local.x / width + 0.5;
  const v = 0.5 - local.y / height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { u, v, distance: Math.abs(local.z) };
}

/**
 * Wo ein Strahl die Leinwand trifft — von vorn wie von hinten.
 *
 * Von hinten zählt mit Absicht: eine Staffelei hat zwei Seiten, und wer um sie
 * herumgeht, malt sonst ins Leere. Was nicht zählt, ist ein Strahl, der
 * *parallel* zur Fläche läuft (der trifft sie nie richtig) und einer, der sie
 * erst hinter `range` erreicht.
 */
export function rayOnCanvas(
  origin: Vec3,
  direction: Vec3,
  width: number,
  height: number,
  range: number,
): CanvasPoint | null {
  const dz = direction.z;
  if (Math.abs(dz) < 1e-4) return null;
  const t = -origin.z / dz;
  if (t < 0 || t > range) return null;
  const u = (origin.x + direction.x * t) / width + 0.5;
  const v = 0.5 - (origin.y + direction.y * t) / height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { u, v, distance: t };
}

/**
 * Eine Fläche, auf die der Pinsel malen darf.
 *
 * Der Pinsel kennt keine Staffelei — er kennt nur das hier, und die Welt sagt
 * ihm (`ToolHost.paintSurfaces`), welche es gerade gibt. Damit bleibt das
 * Malen dort, wo es hingehört: beim Pinsel die Farbe, bei der Leinwand das
 * Blatt.
 */
export interface PaintSurface {
  /** Die Leinwand im Raum. */
  readonly object: THREE.Object3D;
  /**
   * Ein Klecks an diesem Weltpunkt, wenn er auf dem Blatt liegt.
   *
   * @param join zieht die Linie vom letzten Punkt dieses Strichs — das ist der
   *             Unterschied zwischen Malen und Tupfen.
   */
  paintAt(point: THREE.Vector3, color: number, join: boolean): boolean;
  /** Dasselbe dort, wo ein Strahl das Blatt trifft. */
  paintRay(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    range: number,
    color: number,
    join: boolean,
  ): boolean;
  /** Der Strich ist zu Ende; der nächste Punkt fängt einen neuen an. */
  endStroke(): void;

  /**
   * **Wo der nächste Klecks landen würde** — als Kreis auf dem Blatt, ohne
   * dass etwas gemalt wird.
   *
   * Aus zwei Metern Abstand auf eine Leinwand zu zielen hieß bisher: drücken
   * und nachsehen. Der Zeigestrahl endet irgendwo im Raum, und wo genau er das
   * Blatt schneidet, sieht man einem Strich in der Luft nicht an — der erste
   * Punkt saß deshalb fast nie dort, wo er sollte. Der Ring nimmt das vorweg:
   * er steht auf dem Blatt, er ist so breit wie der Strich, und er hat die
   * Farbe, die gerade geladen ist.
   *
   * Dieselben beiden Wege wie beim Malen — Spitze (`aimAt`) und Strahl
   * (`aimRay`) —, damit die Vorschau *dasselbe* trifft wie der Trigger und
   * nicht etwas daneben.
   */
  aimAt(point: THREE.Vector3, color: number): boolean;
  aimRay(origin: THREE.Vector3, direction: THREE.Vector3, range: number, color: number): boolean;
  /** Es wird gerade nicht darauf gezielt: der Kreis geht weg. */
  clearAim(): void;
}
