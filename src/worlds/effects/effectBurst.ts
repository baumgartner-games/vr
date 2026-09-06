import type { EffectKind } from './effectKinds';

/**
 * **Wie eine Wolke fliegt** — Aussäen und ein Bild weiterrechnen, in nichts als
 * Zahlenreihen.
 *
 * Kein three.js: eine Wolke ist hier drei `Float32Array` (Ort, Geschwindigkeit,
 * Farbe) und ein Alter. `Burst.ts` hängt eine Punktwolke daran und zeichnet
 * sie; wie sie sich bewegt, steht hier — und ist damit prüfbar, ohne dass
 * irgendwo ein Bild entsteht.
 *
 * Die Bewegung ist absichtlich klein gehalten: Auftrieb, Schwerkraft,
 * Luftwiderstand, Boden. Das reicht für Rauch, der steht, Funken, die fallen,
 * und eine Explosion, die auseinanderfährt — und alles darüber hinaus würde man
 * in der Brille nicht mehr auseinanderhalten.
 */

/** Drei Zahlen. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Eine Wolke: so viele Partikel, jeder mit Ort, Schwung und Farbe. */
export interface Cloud {
  count: number;
  positions: Float32Array;
  velocities: Float32Array;
  /** Rot, Grün, Blau in 0…1 — je Partikel, aus dem Verlauf des Effekts. */
  colors: Float32Array;
  /** Sekunden seit dem Auslösen. */
  age: number;
  /** Wie lange die Wolke lebt. */
  life: number;
}

/**
 * Eine frische Wolke am Ursprung.
 *
 * Die Richtung jedes Partikels liegt zwischen **gerade nach oben** und
 * **irgendwohin**, und `spread` sagt, wo dazwischen: 0 ist eine Säule, 1 eine
 * Kugel. Der Schwung streut dabei — eine Wolke, in der alle gleich schnell
 * sind, sieht aus wie eine Kugelschale und nicht wie ein Knall.
 *
 * @param random Zufall von außen, damit ein Test dieselbe Wolke zweimal
 *               bekommen kann.
 */
export function seedCloud(
  kind: EffectKind,
  origin: Vec3,
  random: () => number = Math.random,
): Cloud {
  const count = Math.max(1, Math.round(kind.count));
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const from = channels(kind.from);
  const to = channels(kind.to);

  for (let i = 0; i < count; i++) {
    // Eine Richtung auf der Kugel, gleichverteilt.
    const z = random() * 2 - 1;
    const angle = random() * Math.PI * 2;
    const radius = Math.sqrt(Math.max(0, 1 - z * z));
    let dx = Math.cos(angle) * radius;
    let dy = z;
    let dz = Math.sin(angle) * radius;

    // Und von dort aus so weit nach oben gezogen, wie der Effekt eng ist.
    dy = dy * kind.spread + (1 - kind.spread);
    dx *= kind.spread;
    dz *= kind.spread;
    const length = Math.hypot(dx, dy, dz) || 1;
    dx /= length;
    dy /= length;
    dz /= length;

    const speed = kind.speed * (0.35 + 0.65 * random());
    // Ein Anfangsradius von einem halben Partikel: alles auf demselben Punkt
    // starten zu lassen ergibt im ersten Bild einen einzigen dicken Fleck.
    const start = kind.size * 0.5 * random();
    positions[i * 3] = origin.x + dx * start;
    positions[i * 3 + 1] = origin.y + dy * start;
    positions[i * 3 + 2] = origin.z + dz * start;
    velocities[i * 3] = dx * speed;
    velocities[i * 3 + 1] = dy * speed;
    velocities[i * 3 + 2] = dz * speed;

    const mix = random();
    colors[i * 3] = from[0] + (to[0] - from[0]) * mix;
    colors[i * 3 + 1] = from[1] + (to[1] - from[1]) * mix;
    colors[i * 3 + 2] = from[2] + (to[2] - from[2]) * mix;
  }

  return { count, positions, velocities, colors, age: 0, life: kind.life };
}

/**
 * Ein Bild weiter. Falsch, sobald die Wolke durch ist.
 *
 * Der **Boden** hält die Partikel: was ihn erreicht, bleibt liegen und
 * verliert seitwärts an Schwung — so legt sich Staub, statt durch die
 * Bodenplatte zu sinken und darunter weiterzufliegen, wo ihn niemand mehr
 * sieht.
 */
export function stepCloud(cloud: Cloud, kind: EffectKind, dt: number, floor = 0): boolean {
  cloud.age += dt;
  const lift = (kind.rise - kind.fall) * dt;
  const keep = Math.max(0, 1 - kind.drag * dt);
  const { positions, velocities } = cloud;

  for (let i = 0; i < cloud.count; i++) {
    const p = i * 3;
    velocities[p + 1] = velocities[p + 1]! + lift;
    velocities[p] = velocities[p]! * keep;
    velocities[p + 1] = velocities[p + 1]! * keep;
    velocities[p + 2] = velocities[p + 2]! * keep;

    positions[p] = positions[p]! + velocities[p]! * dt;
    positions[p + 1] = positions[p + 1]! + velocities[p + 1]! * dt;
    positions[p + 2] = positions[p + 2]! + velocities[p + 2]! * dt;

    if (positions[p + 1]! < floor) {
      positions[p + 1] = floor;
      velocities[p + 1] = 0;
      velocities[p] = velocities[p]! * 0.6;
      velocities[p + 2] = velocities[p + 2]! * 0.6;
    }
  }
  return cloud.age < cloud.life;
}

/**
 * Wie sichtbar die Wolke gerade ist, 0…1.
 *
 * Sie kommt sofort und geht langsam: das erste Zehntel der Lebenszeit blendet
 * auf, der Rest blendet ab. Ohne das Aufblenden sieht ein Knall aus wie ein
 * Schnitt, und ohne das Abblenden verschwindet eine Rauchwolke auf einen
 * Schlag, als hätte jemand das Licht ausgemacht.
 */
export function cloudFade(cloud: Cloud): number {
  if (cloud.life <= 0) return 0;
  const t = Math.min(1, Math.max(0, cloud.age / cloud.life));
  if (t < 0.1) return t / 0.1;
  return 1 - (t - 0.1) / 0.9;
}

/** Eine Farbe als drei Anteile in 0…1. */
function channels(color: number): [number, number, number] {
  return [((color >> 16) & 255) / 255, ((color >> 8) & 255) / 255, (color & 255) / 255];
}
