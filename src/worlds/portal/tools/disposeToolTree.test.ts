import * as THREE from 'three';
import { disposeToolTree } from './Tool';

/**
 * **Das Aufräumen eines Werkzeugs hält an der Marke `sharedAssets` an.**
 *
 * Der Grund steht ausführlich an `disposeToolTree` selbst: Ein Modell aus dem
 * KayKit-Regal ist die Kopie einer Vorlage, die im Speicher liegen bleibt
 * (`core/kaykitModel.copyOf`). Ihre **Geometrie** teilen sich alle Kopien und
 * die Vorlage; wer sie beim Wegräumen **eines** Werkzeugs freigibt, nimmt sie
 * allen anderen weg, und in der Brille steht danach eine Pistole, die aus
 * nichts besteht.
 *
 * Zweimal ist derselbe Fehler in diesem Projekt schon passiert
 * (`GridWorld.disposeShapes`, `SignBoard.dispose`), beide Male an einer
 * anderen Stelle und beide Male erst hinterher gefunden. Deshalb steht er
 * hier als Test und nicht als Kommentar: Er lässt sich ohne Brille prüfen,
 * und er fällt um, wenn jemand die Rekursion wieder gegen ein `traverse`
 * tauscht — ein `return` darin überspringt nur den Knoten selbst und **nicht**
 * seine Kinder.
 */
describe('disposeToolTree', () => {
  /** Ein Netz, das sagt, ob es freigegeben wurde. */
  function mesh(name: string): { node: THREE.Mesh; freed: () => boolean } {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial();
    let freed = false;
    geometry.addEventListener('dispose', () => (freed = true));
    const node = new THREE.Mesh(geometry, material);
    node.name = name;
    return { node, freed: () => freed };
  }

  it('gibt die eigene Geometrie eines Werkzeugs frei', () => {
    const own = mesh('gebaut');
    const root = new THREE.Group();
    root.add(own.node);

    disposeToolTree(root);

    expect(own.freed()).toBe(true);
  });

  it('lässt alles unter `sharedAssets` in Ruhe — samt der Kinder darunter', () => {
    const own = mesh('gebaut');
    const shared = mesh('aus dem Regal');
    const deeper = mesh('ein Knoten tiefer');
    shared.node.add(deeper.node);

    const holder = new THREE.Group();
    holder.userData.sharedAssets = true;
    holder.add(shared.node);

    const root = new THREE.Group();
    root.add(own.node, holder);

    disposeToolTree(root);

    // Das Werkzeug räumt sein eigenes Netz ab …
    expect(own.freed()).toBe(true);
    // … und fasst die geteilte Vorlage nicht an, auch nicht tief darunter.
    expect(shared.freed()).toBe(false);
    expect(deeper.freed()).toBe(false);
  });

  it('hält auch an, wenn die Marke ganz oben sitzt', () => {
    const shared = mesh('aus dem Regal');
    const holder = new THREE.Group();
    holder.userData.sharedAssets = true;
    holder.add(shared.node);

    disposeToolTree(holder);

    expect(shared.freed()).toBe(false);
  });
});
