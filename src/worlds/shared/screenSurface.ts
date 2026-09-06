import type * as THREE from 'three';

/**
 * Eine Fläche, die ihr Bild in **Bildschirmkoordinaten** abliest.
 *
 * Portalflächen und Spiegelflächen tun dasselbe: Ihr Bild entsteht in einem
 * Ziel, das genauso aufgebaut ist wie der Puffer, in den gerade gezeichnet
 * wird, und die Fläche schlägt darin einfach ihre eigene Bildschirmposition
 * nach. Deshalb steht das Bild in der Brille stereo-richtig — und deshalb muss
 * jede solche Fläche wissen, **wie groß der Puffer gerade ist**, in den sie
 * gezeichnet wird.
 *
 * Das ist keine Kleinigkeit, sobald mehrere solcher Bilder ineinander
 * vorkommen: Ein Portal in einem Spiegelbild wird in ein kleineres Ziel
 * gezeichnet als das Bild, für das es gerechnet wurde. Sagt ihm niemand
 * Bescheid, greift es daneben — und man sieht in der Brille einen Ausschnitt,
 * der um den Auflösungsfaktor verschoben ist. Wer eine solche Sicht zeichnet,
 * stellt deshalb **alle** Flächen auf die Größe seines Durchgangs und danach
 * wieder zurück.
 */
export interface ScreenSurface {
  readonly isScreenSurface: true;
  setResolution(size: THREE.Vector2): void;
}

/** Ob ein Ding aus dem Szenengraphen so eine Fläche ist. */
export function isScreenSurface(object: unknown): object is ScreenSurface {
  return (object as Partial<ScreenSurface> | null)?.isScreenSurface === true;
}
