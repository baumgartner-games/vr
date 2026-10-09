import type * as THREE from 'three';

/**
 * **Die Shader-Programme über einen Umbau halten.**
 *
 * three.js gibt ein Programm frei, sobald das letzte Material, das es benutzt,
 * `dispose()` bekommt — und baut es neu, wenn das nächste Material mit
 * demselben Schlüssel kommt. Eine Welt, die ihr Haus abreißt und dasselbe
 * Haus gleich wieder hinstellt (die Raumstation bei jedem Rundenstart und
 * jedem Zurück in die Zentrale), übersetzt so jedes Mal alle ihre Shader neu:
 * gemessen 34 Programme, in der Brille ein stehendes Bild von Sekunden.
 *
 * `hold` schiebt das `dispose()` aller Materialien unter einem Knoten auf, bis
 * `release` kommt. Bis dahin halten die alten Materialien ihre Programme, die
 * neuen finden sie im Speicher von three.js und übersetzen nichts. Wer
 * `release` ruft, sollte die neue Szene vorher einmal übersetzt haben
 * (`renderer.compile`), sonst gehen Programme verloren, die noch keiner
 * angefordert hat.
 */
export class ProgramHold {
  private readonly held = new Set<THREE.Material>();
  private readonly due = new Set<THREE.Material>();

  get holding(): boolean {
    return this.held.size > 0;
  }

  /** Alle Materialien unter `root` geben ihr Programm erst bei `release` her. */
  hold(root: THREE.Object3D): void {
    root.traverse((object) => {
      const material = (object as Partial<THREE.Mesh>).material;
      for (const one of Array.isArray(material) ? material : material ? [material] : []) {
        if (this.held.has(one)) continue;
        this.held.add(one);
        // Eine eigene Eigenschaft verdeckt die Methode der Klasse; `release`
        // nimmt sie wieder weg.
        one.dispose = () => {
          this.due.add(one);
        };
      }
    });
  }

  /** Was inzwischen weggeworfen wurde, jetzt wirklich freigeben. */
  release(): void {
    for (const material of this.held) {
      delete (material as { dispose?: unknown }).dispose;
      if (this.due.has(material)) material.dispose();
    }
    this.held.clear();
    this.due.clear();
  }
}
