import * as THREE from 'three';
import { TILE, type Dir } from '../nav/navTile';
import { blockFor } from './plan';
import { BLOCKS } from '../grid/blocks';
import type { MarkAt, MarkId } from './house';

/**
 * **Woran man ein Klavier von einer Werkbank unterscheidet.**
 *
 * Unter jedem Merkmal steht ein ganz normaler Baustein (`plan.ts`) — der macht
 * die Silhouette, die Kollision und die Wegkosten. Was hier dazukommt, ist das
 * bisschen obendrauf, an dem man es **benennen** kann: eine Tastenreihe, ein
 * Wasserhahn, vier Herdplatten. Das ist keine Deko, sondern das Spiel selbst:
 * Der VR-Spieler kann nur beschreiben, was er unterscheiden kann, und der
 * Archivar findet in seiner Akte nur, was einen Namen hat.
 *
 * Bewusst klein gehalten — ein farbiger Klotz und höchstens drei Teile. Wer
 * hier ein Modell baut, baut vierzehn Modelle, und dann sieht das Haus beim
 * fünften noch immer nicht fertig aus.
 */

/** Die Farbe, an der ein Merkmal auch von oben und im Dunkeln kenntlich ist. */
const MARK_COLORS: Readonly<Record<MarkId, number>> = {
  wanne: 0xf2f5f8,
  dusche: 0xa8d8e8,
  ofen: 0x2c313c,
  spuele: 0xc9ced8,
  bett: 0xd8c7a8,
  buecher: 0x9c5a3c,
  werkbank: 0x7a6a52,
  klavier: 0x14161c,
  kamin: 0xb0463a,
  standuhr: 0x8a6440,
  sessel: 0x5a6a8a,
  kiste: 0xa8874f,
  schaukelpferd: 0xd88a6a,
  esstisch: 0xb08a5a,
};

/**
 * Das Kennzeichen eines Merkmals, fertig an seinem Platz.
 *
 * Die Höhe kommt aus dem Baustein darunter — ein Wasserhahn schwebt sonst über
 * der Spüle, sobald jemand die Höhe einer Küchenzeile ändert.
 */
export function buildMark(mark: MarkAt): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `mark-${mark.id}`;
  const base = BLOCKS[blockFor(mark.id)].height;
  const color = MARK_COLORS[mark.id];
  const paint = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });

  for (const part of parts(mark.id)) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(part.w, part.h, part.d), paint);
    mesh.position.set(part.x, base + part.y, part.z);
    group.add(mesh);
  }

  group.position.set((mark.x + 0.5) * TILE, 0, (mark.z + 0.5) * TILE);
  group.rotation.y = yawOf(mark.dir);
  return group;
}

/** Ein Baustein zeigt in seine Richtung; das Kennzeichen dreht sich mit. */
function yawOf(dir: Dir): number {
  return [Math.PI, -Math.PI / 2, 0, Math.PI / 2][dir] ?? 0;
}

interface Part {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

/** Was auf dem Baustein liegt — in Metern, relativ zur Kachelmitte. */
function parts(id: MarkId): Part[] {
  switch (id) {
    case 'wanne':
      // Ein weißer Rand: der Unterschied zur Dusche, und der ganze Zwilling.
      return [{ x: 0, y: 0.12, z: 0, w: 1.6, h: 0.24, d: 0.8 }];
    case 'dusche':
      return [{ x: 0, y: -0.4, z: 0, w: 0.9, h: 1.9, d: 0.9 }];
    case 'ofen':
      return [
        { x: -0.25, y: 0.03, z: -0.2, w: 0.3, h: 0.06, d: 0.3 },
        { x: 0.25, y: 0.03, z: -0.2, w: 0.3, h: 0.06, d: 0.3 },
        { x: 0, y: 0.03, z: 0.25, w: 0.85, h: 0.06, d: 0.3 },
      ];
    case 'spuele':
      return [
        { x: 0, y: 0.02, z: 0, w: 0.7, h: 0.06, d: 0.5 },
        { x: 0, y: 0.2, z: -0.28, w: 0.06, h: 0.4, d: 0.06 },
      ];
    case 'bett':
      return [{ x: 0, y: 0.16, z: -0.55, w: 1.4, h: 0.3, d: 0.5 }];
    case 'buecher':
      return [
        { x: 0, y: -0.3, z: 0.02, w: 1.6, h: 0.12, d: 0.35 },
        { x: 0, y: -0.9, z: 0.02, w: 1.6, h: 0.12, d: 0.35 },
      ];
    case 'werkbank':
      return [
        { x: 0.45, y: 0.12, z: 0, w: 0.25, h: 0.24, d: 0.25 },
        { x: -0.3, y: 0.06, z: 0.1, w: 0.7, h: 0.12, d: 0.4 },
      ];
    case 'klavier':
      return [
        { x: 0, y: 0.3, z: -0.25, w: 1.5, h: 0.6, d: 0.4 },
        { x: 0, y: 0.06, z: 0.15, w: 1.4, h: 0.09, d: 0.28 },
      ];
    case 'kamin':
      return [
        { x: 0, y: 0.55, z: 0, w: 1.5, h: 1.1, d: 0.5 },
        { x: 0, y: 0.25, z: 0.16, w: 0.8, h: 0.5, d: 0.3 },
      ];
    case 'standuhr':
      return [{ x: 0, y: -0.25, z: 0.18, w: 0.4, h: 0.4, d: 0.12 }];
    case 'sessel':
      return [
        { x: 0, y: 0.3, z: -0.3, w: 0.9, h: 0.6, d: 0.2 },
        { x: 0, y: 0.1, z: 0, w: 0.9, h: 0.2, d: 0.7 },
      ];
    case 'kiste':
      return [{ x: 0, y: 0.08, z: 0, w: 0.9, h: 0.16, d: 0.9 }];
    case 'schaukelpferd':
      return [
        { x: 0, y: 0.3, z: 0, w: 0.8, h: 0.3, d: 0.25 },
        { x: 0, y: 0.55, z: -0.28, w: 0.22, h: 0.35, d: 0.22 },
      ];
    default:
      // Esstisch: eine Decke darauf, mehr braucht es nicht.
      return [{ x: 0, y: 0.03, z: 0, w: 1.5, h: 0.06, d: 0.9 }];
  }
}

/** Die Farbe eines Merkmals — auch die Akte des Archivars malt damit. */
export function markColor(id: MarkId): number {
  return MARK_COLORS[id];
}
