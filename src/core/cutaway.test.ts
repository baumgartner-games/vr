import * as THREE from 'three';
import {
  bringBack,
  cutAway,
  hiddenLevels,
  hidesLevel,
  levelAtHeight,
  levelOf,
  levelStep,
} from './cutaway';

/** Drei Etagen, wie sie eine Gitterwelt mit Stockwerken hat. */
const LEVELS = [0, 3.1, 6.2];

describe('Welche Ebenen von oben unsichtbar sind', () => {
  it('blendet aus, was über der Ebene des Rigs liegt — und sonst nichts', () => {
    expect(hiddenLevels(3, 0)).toEqual([1, 2]);
    expect(hiddenLevels(3, 1)).toEqual([2]);
    expect(hiddenLevels(3, 2)).toEqual([]);
  });

  /**
   * Der Keller bleibt stehen: Er ist ohnehin verdeckt, und wer ihn ausblendete,
   * bekäme ein Loch in der Welt statt eines Blicks hinein.
   */
  it('lässt alles unter der Ebene des Rigs stehen', () => {
    expect(hidesLevel(0, 1)).toBe(false);
    expect(hidesLevel(1, 1)).toBe(false);
    expect(hidesLevel(2, 1)).toBe(true);
  });

  it('kennt eine Welt ohne Etagen', () => {
    expect(hiddenLevels(1, 0)).toEqual([]);
  });
});

describe('Die Ebene des Rigs, mit Hysterese', () => {
  it('bleibt unten, solange die Füße unter der halben Stockwerkshöhe sind', () => {
    // Die Kachel unter den Füßen sagt schon „Ebene 1", der Körper steht aber
    // noch auf der dritten Stufe.
    expect(levelStep(0, 1, 1.0, LEVELS)).toBe(0);
    expect(levelStep(0, 1, 1.54, LEVELS)).toBe(0);
  });

  it('wechselt nach oben, sobald die halbe Stockwerkshöhe überschritten ist', () => {
    expect(levelStep(0, 1, 1.56, LEVELS)).toBe(1);
    expect(levelStep(0, 1, 3.1, LEVELS)).toBe(1);
  });

  it('wechselt erst unter derselben Linie wieder nach unten', () => {
    expect(levelStep(1, 0, 3.0, LEVELS)).toBe(1);
    expect(levelStep(1, 0, 1.6, LEVELS)).toBe(1);
    expect(levelStep(1, 0, 1.5, LEVELS)).toBe(0);
    expect(levelStep(1, 0, 0, LEVELS)).toBe(0);
  });

  it('bleibt stehen, wo die Kachel dieselbe Ebene meint', () => {
    expect(levelStep(1, 1, 0, LEVELS)).toBe(1);
    expect(levelStep(2, 2, 99, LEVELS)).toBe(2);
  });

  it('springt auch über zwei Etagen, wenn die Kachel es sagt', () => {
    // Die Mitte zwischen Ebene 0 und Ebene 2 liegt bei 3,1 m.
    expect(levelStep(0, 2, 3.0, LEVELS)).toBe(0);
    expect(levelStep(0, 2, 3.2, LEVELS)).toBe(2);
  });

  it('bleibt unten, solange die Füße unten sind — auch wenn die Kachel oben liegt', () => {
    expect(levelStep(0, 2, 0.2, LEVELS)).toBe(0);
  });

  /**
   * Der Treppenlauf gehört ganz der unteren Etage — die Kachel darüber ist sein
   * Loch. Ohne die Höhe hätte man bis zum letzten Schritt das Dach über dem
   * Kopf, das gerade weichen soll.
   */
  it('nimmt auf der Treppe die Etage darüber, sobald die halbe Höhe erreicht ist', () => {
    expect(levelAtHeight(LEVELS, 0, 0)).toBe(0);
    expect(levelAtHeight(LEVELS, 0, 1.5)).toBe(0);
    expect(levelAtHeight(LEVELS, 0, 1.6)).toBe(1);
    expect(levelAtHeight(LEVELS, 0, 4.7)).toBe(2);
    // Und nie höher, als es Etagen gibt.
    expect(levelAtHeight(LEVELS, 0, 99)).toBe(2);
    expect(levelAtHeight([0], 0, 99)).toBe(0);
  });

  it('steigt auf der Treppe mit, obwohl die Kachel unten bleibt', () => {
    // Die Treppenkachel liegt auf Ebene 0, der Körper schon bei 2 m.
    expect(levelStep(0, 0, 2, LEVELS)).toBe(1);
    // Und auf dem Rückweg genauso, an derselben Linie.
    expect(levelStep(1, 0, 1.4, LEVELS)).toBe(0);
    expect(levelStep(1, 0, 2, LEVELS)).toBe(1);
  });

  /** Eine Etage, die es nicht gibt, wird auf die oberste gezogen. */
  it('rechnet auch mit einem Index, den es nicht gibt', () => {
    expect(levelStep(0, 9, 99, LEVELS)).toBe(LEVELS.length - 1);
    expect(levelStep(0, 1, 0, [])).toBe(1);
  });
});

describe('Ausblenden und wieder einblenden', () => {
  /** Ein Stockwerk als Gruppe mit einem Kind darin. */
  function storey(level: number): THREE.Object3D {
    const group = new THREE.Group();
    group.userData['level'] = level;
    const child = new THREE.Object3D();
    child.userData['level'] = level;
    group.add(child);
    return group;
  }

  it('nimmt genau die Ebenen über dem Rig aus dem Bild', () => {
    const scene = new THREE.Scene();
    const ground = storey(0);
    const upper = storey(1);
    scene.add(ground, upper);

    const hidden = cutAway(scene, 0);
    expect(hidden).toEqual([upper]);
    expect(upper.visible).toBe(false);
    expect(ground.visible).toBe(true);

    bringBack(hidden);
    expect(upper.visible).toBe(true);
    expect(hidden).toHaveLength(0);
  });

  /**
   * Eine ausgeblendete Gruppe wird nicht durchsucht: Ihre Kinder sind ohnehin
   * weg, und sie einzeln umzuschalten wäre hundertmal dieselbe Arbeit für
   * dasselbe Bild.
   */
  it('steigt nicht in das hinab, was es gerade ausgeblendet hat', () => {
    const scene = new THREE.Scene();
    const upper = storey(1);
    scene.add(upper);
    const hidden = cutAway(scene, 0);
    expect(hidden).toHaveLength(1);
    expect(upper.children[0]!.visible).toBe(true);
  });

  /** Was aus einem anderen Grund unsichtbar ist, bleibt es auch danach. */
  it('blendet nichts ein, was es nicht selbst ausgeblendet hat', () => {
    const scene = new THREE.Scene();
    const leaf = storey(0);
    leaf.visible = false;
    scene.add(leaf);
    const hidden = cutAway(scene, 0);
    expect(hidden).toHaveLength(0);
    bringBack(hidden);
    expect(leaf.visible).toBe(false);
  });

  /** Ohne Marke keine Meinung — das Portal-Labor bleibt, wie es ist. */
  it('lässt alles ohne Ebenenmarke stehen', () => {
    const scene = new THREE.Scene();
    const plain = new THREE.Object3D();
    scene.add(plain);
    expect(levelOf(plain)).toBeNull();
    expect(cutAway(scene, 0)).toHaveLength(0);
    expect(plain.visible).toBe(true);
  });

  it('findet auch, was tief in einer Gruppe ohne Marke hängt', () => {
    const scene = new THREE.Scene();
    const dressing = new THREE.Group();
    const upper = storey(2);
    dressing.add(upper);
    scene.add(dressing);
    expect(cutAway(scene, 1)).toEqual([upper]);
  });
});
