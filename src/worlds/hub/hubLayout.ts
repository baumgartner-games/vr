/**
 * Wie der Hub sich selbst auslegt.
 *
 * Die Tore standen auf einem Kreisbogen von 90°, sechs Meter vom Start weg —
 * das war für vier Welten hübsch und ist für neun ein Gedränge: Schilder
 * überlappen, zwei Tore teilen sich einen Fleck, und die zehnte Welt hätte
 * überhaupt keinen Platz mehr. Eine Halle, die bei jeder neuen Welt von Hand
 * umgeräumt werden muss, ist der falsche Ort für eine Weltenregistry, deren
 * ganzer Sinn es ist, dass eine neue Welt *ein Eintrag* ist.
 *
 * Also: eine runde Halle in der Mitte, und davon gehen **Gänge** ab. Jeder
 * Gang nimmt vier Tore auf, zwei je Seite, versetzt gegenüber; sind sie voll,
 * kommt ein Gang dazu und alle verteilen sich neu über den Kreis. Damit
 * wächst der Hub mit der Registry, ohne dass jemand eine Zahl anfasst.
 *
 * Reine Geometrie, kein three.js — deshalb steht hier auch der Test.
 */

/** Radius der Halle in der Mitte. */
export const HALL_RADIUS = 7;
/** Lichte Breite eines Gangs. */
export const CORRIDOR_WIDTH = 5.4;
/** Wie viele Tore in einen Gang passen — zwei je Seite. */
export const GATES_PER_CORRIDOR = 4;
/** Abstand zweier Tore *derselben* Seite entlang des Gangs. */
export const GATE_SPACING = 7.5;
/** Wie weit hinter der Halle das erste Tor steht. */
export const FIRST_GATE = 4;
/** Was hinter dem letzten Tor noch Gang ist, damit er nicht abrupt endet. */
export const CORRIDOR_TAIL = 4.5;

export interface GatePlacement {
  /** Index in der Welten-Liste — die Reihenfolge bleibt die der Registry. */
  index: number;
  x: number;
  z: number;
  /** Blickrichtung des Tors: es schaut quer über den Gang. */
  yaw: number;
  corridor: number;
}

export interface CorridorPlacement {
  /** 0 zeigt geradeaus vom Start weg (−Z), dann im Uhrzeigersinn. */
  angle: number;
  length: number;
  width: number;
  /** Wie viele Tore in diesem Gang stehen. */
  gates: number;
}

export interface HubLayout {
  hallRadius: number;
  corridors: CorridorPlacement[];
  gates: GatePlacement[];
  /** Wie weit die Anlage vom Mittelpunkt reicht — die Grenze zum Laufen. */
  extent: number;
}

/** Richtung eines Gangs: Winkel 0 zeigt nach −Z, also geradeaus. */
export function corridorDirection(angle: number): { x: number; z: number } {
  return { x: Math.sin(angle), z: -Math.cos(angle) };
}

/**
 * Legt `count` Tore auf so viele Gänge, wie es braucht.
 *
 * Ein Tor steht an der Wand seines Gangs und schaut quer hinüber; die beiden
 * Seiten sind gegeneinander versetzt, sonst steht man zwischen zwei Schildern
 * und liest keines.
 */
export function layoutHub(count: number): HubLayout {
  const gates: GatePlacement[] = [];
  const corridors: CorridorPlacement[] = [];
  if (count <= 0) {
    return { hallRadius: HALL_RADIUS, corridors, gates, extent: HALL_RADIUS + CORRIDOR_TAIL };
  }

  const corridorCount = Math.ceil(count / GATES_PER_CORRIDOR);
  for (let c = 0; c < corridorCount; c++) {
    const angle = (c / corridorCount) * Math.PI * 2;
    const first = c * GATES_PER_CORRIDOR;
    const inThis = Math.min(GATES_PER_CORRIDOR, count - first);
    const direction = corridorDirection(angle);
    // Quer zur Gangrichtung, nach rechts.
    const side = { x: -direction.z, z: direction.x };

    for (let i = 0; i < inThis; i++) {
      const rank = Math.floor(i / 2);
      const right = i % 2 === 0;
      // Die rechte Reihe steht eine halbe Teilung weiter: gegenüber, nicht
      // nebeneinander.
      const along = HALL_RADIUS + FIRST_GATE + rank * GATE_SPACING + (right ? 0 : GATE_SPACING / 2);
      const offset = (CORRIDOR_WIDTH / 2 - 0.35) * (right ? 1 : -1);
      gates.push({
        index: first + i,
        x: direction.x * along + side.x * offset,
        z: direction.z * along + side.z * offset,
        // Quer über den Gang: das Tor an der rechten Wand schaut nach links.
        yaw: Math.atan2(-side.x * (right ? 1 : -1), -side.z * (right ? 1 : -1)),
        corridor: c,
      });
    }

    const rows = Math.ceil(inThis / 2);
    const last = HALL_RADIUS + FIRST_GATE + (rows - 1) * GATE_SPACING + (inThis > 1 ? GATE_SPACING / 2 : 0);
    corridors.push({
      angle,
      length: last + CORRIDOR_TAIL,
      width: CORRIDOR_WIDTH,
      gates: inThis,
    });
  }

  const extent = corridors.reduce((max, corridor) => Math.max(max, corridor.length), HALL_RADIUS);
  return { hallRadius: HALL_RADIUS, corridors, gates, extent };
}
