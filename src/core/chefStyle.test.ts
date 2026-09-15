import { chefChecker, squarish, squarishReach, trousers } from './chefStyle';
import * as THREE from 'three';

/**
 * Am Stil selbst gibt es nichts zu prüfen — wie etwas aussieht, entscheidet
 * kein Test. Zwei Sachen daran sind trotzdem Rechnung: die gefaste Kiste, aus
 * der der Kopf besteht, und das Karo, das ohne Zeichenfläche auskommen muss.
 */
describe('der Stil der Köche', () => {
  it('malt das Kochkaro auch ohne Zeichenfläche', () => {
    // In Jest gibt es ein `document`, aber `getContext('2d')` liefert nichts.
    // Das darf die Figur nicht umwerfen: Der Test baut sie, um die Geometrie
    // zu prüfen, nicht das Muster.
    expect(() => chefChecker()).not.toThrow();
    expect(trousers()).toBeInstanceOf(THREE.MeshStandardMaterial);
    // Und sie wird geteilt, nicht je Bein neu gebaut.
    expect(trousers()).toBe(trousers());
    expect(chefChecker()).toBe(chefChecker());
  });

  it('zieht die Kugel auf den Würfel, ohne über ihn hinauszugehen', () => {
    // `boxiness = 0` ist die Kugel, `1` der Würfel; dazwischen liegt alles
    // zwischen beiden. Die Ecke ist der Punkt, an dem man es misst: Auf der
    // Kugel liegt sie auf dem Halbmesser, auf dem Würfel um √3 weiter außen.
    const corner = new THREE.Vector3(1, 1, 1).normalize();
    expect(squarishReach(corner, 0)).toBeCloseTo(1, 6);
    expect(squarishReach(corner, 1)).toBeCloseTo(Math.sqrt(3), 6);
    // Auf der Achse ändert sich nie etwas — dort berühren sich Kugel und
    // Würfel, und genau deshalb sitzt eine Nase, die geradeaus zeigt, bei
    // jeder Kantigkeit an derselben Stelle.
    for (const boxiness of [0, 0.5, 1]) {
      expect(squarishReach(new THREE.Vector3(0, 0, -1), boxiness)).toBeCloseTo(1, 6);
    }
  });

  it('baut die gefaste Kiste breiter als die Kugel und schmaler als den Würfel', () => {
    const radius = 0.26;
    const box = (boxiness: number): THREE.Box3 =>
      new THREE.Box3().setFromBufferAttribute(
        squarish(radius, boxiness).attributes['position'] as THREE.BufferAttribute,
      );
    // Auf den Achsen ist jede dieser Formen gleich groß — sie unterscheiden
    // sich nur zwischen den Achsen, und das ist der ganze Sinn der Sache.
    for (const boxiness of [0, 0.5, 1]) {
      expect(box(boxiness).max.y).toBeCloseTo(radius, 5);
    }
    // Die Ecke wandert dagegen mit: Sie ist bei der Kiste weiter draußen als
    // bei der Kugel.
    const diagonal = (boxiness: number): number => {
      const geometry = squarish(radius, boxiness);
      const position = geometry.attributes['position'] as THREE.BufferAttribute;
      let farthest = 0;
      const point = new THREE.Vector3();
      for (let i = 0; i < position.count; i++) {
        farthest = Math.max(farthest, point.fromBufferAttribute(position, i).length());
      }
      return farthest;
    };
    expect(diagonal(0.5)).toBeGreaterThan(diagonal(0) + 0.01);
    expect(diagonal(0.5)).toBeLessThan(diagonal(1));
  });
});
