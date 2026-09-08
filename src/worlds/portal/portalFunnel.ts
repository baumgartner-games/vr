import * as THREE from 'three';
import { PORTAL_HALF_HEIGHT, PORTAL_HALF_WIDTH } from './Portal';

/**
 * **Wodurch ein Portal wirklich hindurchgeht.**
 *
 * Ein Portal klebt auf einer Fläche, aber es geht nicht durch *eine* Fläche:
 * Es geht durch alles, was hinter seiner Öffnung liegt, solange der Trichter
 * reicht. Genau daran ist es lange gescheitert, und der Fehler sah aus wie ein
 * halb verschluckter Würfel: Im Portallabor liegt die Fläche bis zum Horizont
 * fünf Zentimeter unter dem gebauten Laborboden (`GROUND_TOP`), und beide sind
 * portalfähig — also hat jede ihr eigenes Kollisionsbit. Ein Bodenportal löste
 * nur den Laborboden auf; der Companion Cube fiel fünf Zentimeter, setzte auf
 * der Fläche darunter auf und blieb im Loch stehen. Man sah ihn im Portal
 * liegen und hielt die Physik für kaputt — dabei fehlte ein Bit.
 *
 * Das eine Bit je Fläche bleibt trotzdem richtig und wird hier nicht
 * zurückgenommen: Ein Portal an der Wand darf den Boden davor nicht auflösen,
 * sonst sackt man kurz davor ein. Die Regel ist nur genauer geworden — nicht
 * „die Fläche, auf der es klebt", sondern **„alles, was das Loch durchstößt"**.
 * Gemessen wird das mit neun Strahlen entgegen der Normalen, von der Mitte und
 * vom Rand der Öffnung aus: dieselbe Art Messung, mit der auch geprüft wird, ob
 * ein Portal überhaupt auf die Fläche passt (`PortalWorld.fits`).
 */

/** Was die Messung von der Welt braucht. */
export interface FunnelProbe {
  /** Der Strahlenwerfer der Welt — hier wird keiner angelegt. */
  raycaster: THREE.Raycaster;
  /** Alle Flächen, die ein Portal halten können. */
  surfaces: readonly THREE.Object3D[];
  /** Das Kollisionsbit einer Fläche — `0`, wenn sie keines hat. */
  groupOf(surface: THREE.Object3D): number;
  /** Wie tief hinter die Portalebene der Trichter reicht, in Metern. */
  depth: number;
}

/**
 * Wie weit vor der Fläche ein Strahl losgeht.
 *
 * Ein Strahl, der genau auf der Oberfläche startet, trifft sie je nach
 * Rundungsfehler oder gar nicht — und dann fehlte ausgerechnet die Fläche, auf
 * der das Portal sitzt.
 */
const LIFT = 0.02;

/**
 * Wie weit außen die acht Randstrahlen laufen, als Anteil der Öffnung.
 *
 * Knapp innerhalb: Genau auf der Kante läge ein Strahl bei einer Fläche, die
 * dort endet, auf gut Glück daneben.
 */
const RIM = 0.9;

const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _from = new THREE.Vector3();
const _back = new THREE.Vector3();

/**
 * Die Kollisionsbits **aller** Flächen, die der Trichter eines Portals an
 * dieser Stelle durchstößt — verodert, so wie die Physik sie braucht
 * (`PhysicsWorld.setPhasing`).
 *
 * `normal` zeigt von der Fläche weg, `up` gibt der Öffnung ihre Richtung —
 * dieselben zwei Vektoren, mit denen das Portal auch gesetzt wird.
 */
export function funnelGroups(
  probe: FunnelProbe,
  point: THREE.Vector3,
  normal: THREE.Vector3,
  up: THREE.Vector3,
): number {
  const surfaces = probe.surfaces as THREE.Object3D[];
  if (surfaces.length === 0) return 0;

  _right.crossVectors(up, normal).normalize();
  _up.crossVectors(normal, _right).normalize();
  _back.copy(normal).negate();

  let mask = 0;
  // Neun Strahlen: einer durch die Mitte, acht rings um sie herum. Ein
  // einzelner durch die Mitte übersähe die Fläche, die nur die halbe Öffnung
  // hinterlegt — und das ist der Normalfall an jeder Naht zweier Böden.
  for (let i = 0; i <= 8; i++) {
    _from.copy(point).addScaledVector(normal, LIFT);
    if (i > 0) {
      const angle = ((i - 1) / 8) * Math.PI * 2;
      _from
        .addScaledVector(_right, Math.cos(angle) * PORTAL_HALF_WIDTH * RIM)
        .addScaledVector(_up, Math.sin(angle) * PORTAL_HALF_HEIGHT * RIM);
    }
    probe.raycaster.set(_from, _back);
    probe.raycaster.far = probe.depth + LIFT;
    for (const hit of probe.raycaster.intersectObjects(surfaces, false)) {
      mask |= probe.groupOf(hit.object);
    }
  }
  return mask;
}
