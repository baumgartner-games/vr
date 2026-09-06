/**
 * **Jeder Knochen seine Farbe** — die Palette und der Schalter dazu.
 *
 * Zwei Dinge werden hier nachgesehen, und beide sind die Sorte, die man in
 * einer Brille nur *ungefähr* beurteilt: dass die Farben sich wirklich
 * unterscheiden — je Finger und je Knochen —, und dass die Hand sie auch
 * trägt, an allen drei Kleidern, die sie haben kann.
 */

const store = new Map<string, string>();

beforeAll(() => {
  (globalThis as unknown as { localStorage: unknown }).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
});

import * as THREE from 'three';
import { FINGER_HUES, PALM_COLOR, boneColor, hslColor, jointColor } from './bonePalette';
import { boneColors, saveBoneColors } from './handLook';
import { GhostHand } from './HandVisuals';
import { IDLE_HAND_POSE } from './handPose';

beforeEach(() => store.clear());

describe('die Palette', () => {
  it('gibt jedem Finger einen eigenen Ton', () => {
    const roots = FINGER_HUES.map((_, finger) => boneColor(finger, 0, 3));
    expect(new Set(roots).size).toBe(FINGER_HUES.length);
  });

  it('gibt jedem Knochen eines Fingers eine eigene Stufe — heller zur Kuppe', () => {
    const bones = [0, 1, 2].map((bone) => boneColor(1, bone, 3));
    expect(new Set(bones).size).toBe(3);
    // Heller heißt: mehr von allem. Die Summe der drei Kanäle steigt.
    const brightness = bones.map((hex) => (hex >> 16) + ((hex >> 8) & 0xff) + (hex & 0xff));
    expect(brightness[0]!).toBeLessThan(brightness[1]!);
    expect(brightness[1]!).toBeLessThan(brightness[2]!);
  });

  /**
   * Ein Modell mit zwei Knochen je Finger und eines mit dreien bekommen
   * dieselben Enden: die Wurzel dunkel, die Kuppe hell. Sonst sähen die
   * gebaute Hand am Controller und der gemessene Handschuh an derselben
   * Stelle verschieden aus.
   */
  it('spannt die Stufen über die Knochen, die dieser Finger wirklich hat', () => {
    expect(boneColor(2, 0, 2)).toBe(boneColor(2, 0, 3));
    expect(boneColor(2, 1, 2)).toBe(boneColor(2, 2, 3));
    // Und ein Finger mit nur einem Knochen bekommt die Mitte statt des Randes.
    expect(boneColor(2, 0, 1)).not.toBe(boneColor(2, 0, 3));
  });

  it('färbt die Gelenkkugeln der Brille nach ihren Namen', () => {
    expect(jointColor('index-finger-phalanx-proximal')).toBe(boneColor(1, 1, 5));
    expect(jointColor('pinky-finger-tip')).toBe(boneColor(4, 4, 5));
    // Was zu keinem Finger gehört, bleibt grau — und eine Brille darf mehr
    // Gelenke melden, als hier stehen, ohne dass etwas schwarz wird.
    expect(jointColor('wrist')).toBe(PALM_COLOR);
    expect(jointColor('etwas-ganz-anderes')).toBe(PALM_COLOR);
    expect(jointColor('index-finger-irgendwas')).toBe(PALM_COLOR);
    // Der Daumen lässt eine Stufe aus, statt eine eigene Reihe zu bekommen: die
    // Brille meldet für ihn kein Mittelglied, und seine Kuppe ist die Kuppe.
    expect(jointColor('thumb-metacarpal')).toBe(boneColor(0, 0, 5));
    expect(jointColor('thumb-tip')).toBe(boneColor(0, 4, 5));
  });

  it('rechnet Farben und sucht sie nicht aus', () => {
    expect(hslColor(0, 1, 0.5)).toBe(0xff0000);
    expect(hslColor(120, 1, 0.5)).toBe(0x00ff00);
    expect(hslColor(240, 1, 0.5)).toBe(0x0000ff);
    expect(hslColor(0, 0, 1)).toBe(0xffffff);
    expect(hslColor(0, 0, 0)).toBe(0x000000);
    // Und eine Runde weiter ist derselbe Ton.
    expect(hslColor(400, 0.6, 0.4)).toBe(hslColor(40, 0.6, 0.4));
  });
});

describe('der Schalter', () => {
  it('ist ab Werk aus — eine Hand ist einfarbig, bis jemand sie zerlegt', () => {
    expect(boneColors()).toBe(false);
  });

  it('merkt sich, was jemand eingestellt hat', () => {
    expect(saveBoneColors(true)).toBe(true);
    expect(boneColors()).toBe(true);
    saveBoneColors(false);
    expect(boneColors()).toBe(false);
  });
});

describe('eine gefärbte Hand', () => {
  function materials(hand: THREE.Object3D): Set<THREE.Material> {
    const found = new Set<THREE.Material>();
    hand.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh && mesh.name !== 'glove-seam') found.add(mesh.material as THREE.Material);
    });
    return found;
  }

  it('trägt an der Boxhand ein Material je Knochen statt einem für alles', () => {
    expect(materials(new GhostHand('right', IDLE_HAND_POSE, { look: 'bones' })).size).toBe(1);
    saveBoneColors(true);
    // Handfläche plus zehn Knochen — und jeder Knochen hat seine eigene Farbe.
    expect(materials(new GhostHand('right', IDLE_HAND_POSE, { look: 'bones' })).size).toBe(11);
  });

  /**
   * Der Handschuh ist **ein** Netz und kann kein Material je Knochen tragen —
   * die Farbe steht deshalb an den Punkten selbst. Geschrieben wird sie nur,
   * wenn sie auch gelesen wird: ein Attribut, das niemand ansieht, ist ein
   * Drittel mehr Netz für nichts.
   */
  it('trägt am Handschuh die Farben im Netz', () => {
    const plain = new GhostHand('right', IDLE_HAND_POSE, { look: 'glove' });
    expect(cloth(plain).geometry.getAttribute('color')).toBeUndefined();

    saveBoneColors(true);
    const colored = cloth(new GhostHand('right', IDLE_HAND_POSE, { look: 'glove' }));
    const attribute = colored.geometry.getAttribute('color');
    expect(attribute).toBeDefined();
    expect(attribute!.count).toBe(colored.geometry.getAttribute('position').count);
    expect((colored.material as THREE.MeshStandardMaterial).vertexColors).toBe(true);
    // Und es sind wirklich verschiedene: elf Knochen, elf Farben im Netz.
    const seen = new Set<string>();
    for (let i = 0; i < attribute!.count; i++) {
      seen.add(
        `${attribute!.getX(i).toFixed(3)}/${attribute!.getY(i).toFixed(3)}/${attribute!.getZ(i).toFixed(3)}`,
      );
    }
    expect(seen.size).toBeGreaterThanOrEqual(11);
  });

  function cloth(ghost: GhostHand): THREE.SkinnedMesh {
    let found: THREE.SkinnedMesh | null = null;
    ghost.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) found = object as THREE.SkinnedMesh;
    });
    return found!;
  }
});
