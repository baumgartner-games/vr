import type * as THREE from 'three';

/**
 * **Der Schatten-Kreis unter einer Figur** — die Rechnung, ohne three.js.
 *
 * Im Schattenmodus _Einfach (Kreis)_ (`graphicsSettings.ShadowMode`) wirft die
 * Sonne nichts; stattdessen liegt unter jeder bewegten Figur ein weicher,
 * runder Fleck (`core/BlobShadows.ts` zeichnet sie alle in einem Aufruf).
 * Der Wunsch des Besitzers war genau das: _„Der Spieler wirft nur Schatten
 * nach unten, also eigentlich nur einen Schatten-Kreis unter sich."_
 *
 * Eine Figur meldet sich mit `markBlobShadow(fußpunkt, radius)` an — am
 * Objekt, dessen Weltposition zwischen den Füßen liegt. Mehr braucht es
 * nicht: Wer im Szenengraph hängt und sichtbar ist, bekommt einen Kreis.
 */

const KEY = 'blobShadow';

/** Meldet ein Ding für einen Schatten-Kreis an; `radius` in Metern. */
export function markBlobShadow(object: THREE.Object3D, radius: number): void {
  object.userData[KEY] = radius;
}

/** Der Radius, mit dem sich ein Ding angemeldet hat — oder `0`. */
export function blobShadowRadius(object: THREE.Object3D): number {
  const radius = object.userData[KEY] as unknown;
  return typeof radius === 'number' && radius > 0 ? radius : 0;
}

/**
 * **Wie schnell der gemerkte Boden einer Figur nach oben nachzieht**, in
 * Metern je Sekunde.
 *
 * Wo der Boden unter einer Figur liegt, weiß hier niemand — einen Strahl je
 * Figur und Bild zu schießen, wäre für einen Fleck zu teuer. Also merkt sich
 * jeder Kreis den tiefsten Fußpunkt der letzten Zeit: Geht die Figur nach
 * unten, folgt er sofort; geht sie nach oben, zieht er langsam nach. Ein
 * Sprung (eine halbe Sekunde) lässt den Kreis damit fast am Boden liegen und
 * blasser werden, eine Treppe oder ein Podest holt er in einer Sekunde ein.
 */
export const FLOOR_RISE = 0.6;

/** Ab wie viel Metern Sprung auf einmal der Boden gleich mitgeht — ein Teleport, kein Hüpfer. */
export const FLOOR_SNAP = 2.5;

/** Wie hoch über dem Boden eine Figur sein muss, damit ihr Kreis ganz verschwunden ist. */
export const FADE_HEIGHT = 1.4;

/** Der gemerkte Boden im nächsten Bild. `floor` ist `NaN`, solange es keinen gibt. */
export function followFloor(floor: number, feet: number, dt: number): number {
  if (!Number.isFinite(floor) || feet <= floor || Math.abs(feet - floor) > FLOOR_SNAP) return feet;
  return Math.min(feet, floor + FLOOR_RISE * Math.max(0, dt));
}

/**
 * **Wie der Kreis aussieht, wenn die Figur `height` Meter über ihm ist**:
 * Deckkraft (1 am Boden, 0 ab `FADE_HEIGHT`) und Maßstab (etwas breiter,
 * je höher — ein Schatten von weiter oben ist weicher und größer).
 */
export function blobLook(height: number): { opacity: number; scale: number } {
  const t = Math.min(1, Math.max(0, height / FADE_HEIGHT));
  return { opacity: 1 - t, scale: 1 + 0.35 * t };
}
