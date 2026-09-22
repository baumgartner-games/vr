import { PAD_HEIGHT } from './crashPad';

/**
 * **Wo der Keil aus dem Regal steht**, damit seine Schräge genau die Fläche
 * ist, auf der gelaufen wird.
 *
 * Die Rampe auf das Sprungkissen ist ein **gekippter Quader**
 * (`crashPad.rampBox`), und das bleibt sie: Auf ihm läuft man, an ihm hängt
 * der Autostep, er ist der Körper. Was hier gerechnet wird, ist die Stelle
 * für das **Bild** darüber — `prototype-bits/Primitive_Slope.glb`, einen Keil,
 * dessen Schräge dieselbe Ebene bildet wie die Oberseite des Quaders.
 *
 * **Dieselbe Ebene und nicht ungefähr dieselbe.** Ein Modell, das auch nur
 * einen Zentimeter unter der Lauffläche liegt, ist eine Rampe, auf der man
 * sichtbar in der Luft geht. Der Keil ist in der Quelle ein 45°-Prisma; die
 * gebaute Rampe steigt viel flacher (1,40 m auf 2,20 m, also 32,5°). Eine
 * **gleichmäßige** Verkleinerung könnte das nie treffen — also wird er je
 * Achse einzeln eingepasst (`worlds/test/zones/propFit.ts`), und weil eine
 * ungleichmäßige Skalierung eine Ebene wieder auf eine Ebene abbildet,
 * stimmen Schräge und Lauffläche danach **überall** überein und nicht nur an
 * den Enden.
 *
 * Gerechnet wird three.js-frei, damit der Test daneben nachrechnen kann, dass
 * die beiden Kanten des Keils dort liegen, wo `rampBox` seine Oberseite hat.
 */

/** Ein Punkt oder ein Maß — drei Zahlen, mehr braucht die Rechnung nicht. */
export interface RampVec {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

/** Wie der Keil hingestellt wird: seine Maße, seine Drehung, sein Platz. */
export interface RampStand {
  /**
   * Die Maße in den **eigenen** Achsen des Modells: `x` der Weg von oben nach
   * unten, `y` die Höhe, `z` die Breite. Gedreht wird erst danach.
   */
  readonly size: RampVec;
  /**
   * **Eine Vierteldrehung nach links** — und ihr Vorzeichen ist keine
   * Geschmacksfrage.
   *
   * Der Keil der Quelle fällt in seine eigene **+x**-Richtung ab (nachgemessen
   * am Netz: die hohe Kante liegt auf `x = −2`, die Fußkante auf `x = +2`).
   * Die Rampe hier fällt nach **Süden**, also in +z: Das Kissen liegt im
   * Norden, der Boden im Süden. Eine Drehung um −90° um die Hochachse bildet
   * +x auf +z ab, und genau das ist die eine Zeile, die aus dem einen das
   * andere macht.
   */
  readonly yaw: number;
  /** Und wohin der Fuß des Keils kommt: `y = 0` ist der Hallenboden. */
  readonly at: RampVec;
}

/**
 * **Den Keil auf die gebaute Rampe stellen.**
 *
 * `x` ist ihre Mitte quer zur Fahrtrichtung, `edgeZ` die Kissenkante, an der
 * sie oben anschließt, `footZ` ihr Fuß auf dem Boden — dieselben beiden
 * Zahlen, mit denen `crashPad.rampBox` den Körper rechnet. Die Höhe kommt aus
 * `PAD_HEIGHT` und wird **nicht** übergeben: Bild und Körper dürfen hier
 * nicht auseinanderlaufen, und der sicherste Weg dazu ist, dass sie dieselbe
 * Zahl gar nicht erst zweimal bekommen.
 */
export function rampStand(x: number, edgeZ: number, footZ: number, width: number): RampStand {
  return {
    size: { x: footZ - edgeZ, y: PAD_HEIGHT, z: width },
    yaw: -Math.PI / 2,
    at: { x, y: 0, z: (edgeZ + footZ) / 2 },
  };
}
