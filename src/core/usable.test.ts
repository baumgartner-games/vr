import * as THREE from 'three';
import {
  USE_REACH,
  USE_TOUCH,
  markUsable,
  pickUsable,
  shotHitsUsable,
  usableOf,
  type UseCandidate,
  type Usable,
} from './usable';

/** Ein Ding, das mitzählt, wie oft es benutzt wurde. */
function thing(name: string): Usable & { used: number } {
  return {
    used: 0,
    use() {
      this.used++;
      return true;
    },
    usePrompt: () => name,
  };
}

function at(x: number, z: number, radius = 0.4): UseCandidate {
  return { usable: thing(`${x}/${z}`), position: new THREE.Vector3(x, 1, z), radius };
}

const ORIGIN = new THREE.Vector3(0, 1.2, 0);
/** Norden: ein Rig schaut entlang −z. */
const NORTH = new THREE.Vector3(0, 0, -1);

/**
 * **Was gemeint ist, wenn man `A` drückt.**
 *
 * Die Reihenfolge aus E5 des Plans ist keine Geschmacksfrage: Wer neben einer
 * Druckplatte steht und dabei auf einen Knopf zeigt, meint den Knopf. Wäre es
 * andersherum, bediente man immer das, worauf man gerade steht, und Zeigen
 * hätte überhaupt keine Wirkung.
 */
describe('Benutzen: die Auswahl', () => {
  it('nimmt, worauf der Strahl zeigt — und nicht, was die Füße überlappen', () => {
    const ahead = at(0, -1.1);
    // Seitlich neben der Figur: der Strahl geht daran vorbei, die Füße nicht.
    const underfoot = at(0.55, 0.3);
    const pick = pickUsable([underfoot, ahead], ORIGIN, NORTH);
    expect(pick?.candidate).toBe(ahead);
    expect(pick?.ray).toBe(true);
    // Und andersherum gelesen: allein stünde das unter den Füßen sehr wohl da.
    expect(pickUsable([underfoot], ORIGIN, NORTH)?.candidate).toBe(underfoot);
    expect(pickUsable([underfoot], ORIGIN, NORTH)?.ray).toBe(false);
  });

  it('nimmt unter Gleichen das Nächste', () => {
    const near = at(0, -0.9);
    const far = at(0, -1.4);
    expect(pickUsable([far, near], ORIGIN, NORTH)?.candidate).toBe(near);
    expect(pickUsable([near, far], ORIGIN, NORTH)?.candidate).toBe(near);
  });

  it('gibt null, wenn nichts in Reichweite ist', () => {
    expect(pickUsable([], ORIGIN, NORTH)).toBeNull();
    // Knapp hinter der Reichweite des Strahls und weit außerhalb der Füße.
    const beyond = at(0, -(USE_REACH + 1), 0.2);
    expect(pickUsable([beyond], ORIGIN, NORTH)).toBeNull();
    // Und quer daneben: der Strahl geht vorbei, die Füße reichen nicht hin.
    const aside = at(USE_TOUCH + 1, 0, 0.2);
    expect(pickUsable([aside], ORIGIN, NORTH)).toBeNull();
  });

  it('nimmt auch, was hinter der Figur liegt — wenn die Füße es überlappen', () => {
    const behind = at(0, 0.5, 0.2);
    const pick = pickUsable([behind], ORIGIN, NORTH);
    expect(pick?.candidate).toBe(behind);
    expect(pick?.ray).toBe(false);
    // Einen Schritt weiter weg ist es weder gezielt noch berührt.
    expect(pickUsable([at(0, USE_TOUCH + 0.5, 0.2)], ORIGIN, NORTH)).toBeNull();
  });

  it('misst den Abstand bis zur Vorderkante, nicht bis zur Mitte', () => {
    const pick = pickUsable([at(0, -1.2, 0.4)], ORIGIN, NORTH);
    expect(pick?.distance).toBeCloseTo(0.8, 6);
  });

  it('kommt ohne Blickrichtung aus — dann zählen nur die Füße', () => {
    const near = at(0.3, 0, 0.2);
    const pick = pickUsable([near], ORIGIN, new THREE.Vector3(0, 0, 0));
    expect(pick?.candidate).toBe(near);
    expect(pick?.ray).toBe(false);
  });
});

/**
 * **Die Portal-Regel**: Was man drücken kann, kann man auch treffen. Eine
 * Kugel fliegt Meter je Bild, die Frage ist also eine nach einer Strecke.
 */
describe('Benutzen: der Schuss', () => {
  const centre = new THREE.Vector3(0, 1, -3);

  it('trifft, was auf der Strecke liegt', () => {
    const from = new THREE.Vector3(0, 1, 0);
    const to = new THREE.Vector3(0, 1, -6);
    expect(shotHitsUsable(from, to, centre, 0.2)).toBe(true);
  });

  it('trifft nicht, was daneben oder dahinter liegt', () => {
    const from = new THREE.Vector3(0, 1, 0);
    expect(shotHitsUsable(from, new THREE.Vector3(0, 1, -1), centre, 0.2)).toBe(false);
    expect(shotHitsUsable(from, new THREE.Vector3(1, 1, -6), centre, 0.2)).toBe(false);
  });

  it('trifft nicht, was weit darüber hinwegfliegt', () => {
    const from = new THREE.Vector3(0, 3, 0);
    const to = new THREE.Vector3(0, 3, -6);
    expect(shotHitsUsable(from, to, centre, 0.2)).toBe(false);
  });
});

describe('Benutzen: die Ablage am Objekt', () => {
  it('findet, was am Elternteil hängt', () => {
    const group = new THREE.Group();
    const child = new THREE.Object3D();
    group.add(child);
    const button = thing('Knopf');
    markUsable(group, button);
    expect(usableOf(child)).toBe(button);
    markUsable(group, null);
    expect(usableOf(child)).toBeNull();
  });
});
