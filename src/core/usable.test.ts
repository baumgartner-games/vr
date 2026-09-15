import * as THREE from 'three';
import {
  USE_REACH,
  aimForward,
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

/**
 * **Wohin `A` zeigt, hängt an der Ansicht** (`aimForward`).
 *
 * Von oben dreht die Steuerung die ganze Figur zum Ziel — dort ist die
 * Rig-Richtung die Absicht. Aus den Augen und in der Brille steht die Figur
 * still und sieht sich um; wer dort den Kopf zum Knopf dreht, meint den Knopf.
 * Beides einmal falsch herum, und `A` öffnet die Tür hinter einem.
 */
describe('Die Richtung beim Benutzen', () => {
  const rig = new THREE.Vector3(0, 0, -1);
  const head = new THREE.Vector3(1, 0, 0);

  it('nimmt von oben die Figur und sonst den Kopf', () => {
    const top = aimForward(true, rig, head, new THREE.Vector3());
    expect(top.x).toBeCloseTo(0, 6);
    expect(top.z).toBeCloseTo(-1, 6);

    const eyes = aimForward(false, rig, head, new THREE.Vector3());
    expect(eyes.x).toBeCloseTo(1, 6);
    expect(eyes.z).toBeCloseTo(0, 6);
  });

  it('legt die Richtung flach auf den Boden und normiert sie', () => {
    const steep = new THREE.Vector3(0, -3, -3);
    const out = aimForward(false, rig, steep, new THREE.Vector3());
    expect(out.y).toBe(0);
    expect(out.length()).toBeCloseTo(1, 6);
    expect(out.z).toBeCloseTo(-1, 6);
  });

  it('fällt auf die Figur zurück, wenn der Kopf senkrecht schaut', () => {
    // Blick auf die eigenen Füße: waagerecht bleibt nichts übrig.
    const down = new THREE.Vector3(0, -1, 0);
    const out = aimForward(false, rig, down, new THREE.Vector3());
    expect(out.z).toBeCloseTo(-1, 6);
    expect(out.x).toBeCloseTo(0, 6);
  });

  it('zeigt nach Norden, wenn gar nichts eine Richtung hat', () => {
    const none = new THREE.Vector3(0, 1, 0);
    const out = aimForward(true, none, none, new THREE.Vector3());
    expect(out.x).toBe(0);
    expect(out.y).toBe(0);
    expect(out.z).toBe(-1);
  });

  it('findet damit, was vor der Figur steht — in beiden Ansichten dasselbe Ding', () => {
    const north = at(0, -1);
    const east = at(1, 0);
    const candidates = [north, east];
    const origin = new THREE.Vector3(0, 1.2, 0);

    const fromAbove = pickUsable(
      candidates,
      origin,
      aimForward(true, rig, head, new THREE.Vector3()),
    );
    expect(fromAbove?.candidate).toBe(north);

    const fromEyes = pickUsable(
      candidates,
      origin,
      aimForward(false, rig, head, new THREE.Vector3()),
    );
    expect(fromEyes?.candidate).toBe(east);
  });
});
