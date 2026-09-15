import * as THREE from 'three';
import {
  BAR_WIDTH,
  GAUGE_LEAN_MIN,
  KitchenGauges,
  type FlameKind,
  type GaugeTone,
} from './kitchenGauge';

/**
 * **Was die Anzeigen über den Küchenstationen versprechen** (`kitchenGauge.ts`).
 *
 * Geprüft wird das, was im Bild niemandem auffällt, bis es weh tut: dass eine
 * Küche mit zwölf Stationen **eine** rote Farbe hat und nicht zwölf, dass ein
 * Herd, der zwischen zwei Pattys aus- und wieder einblendet, dabei nichts neu
 * baut, dass ein Balken bei einem Anteil von 0,4 wirklich 40 % breit ist — und
 * dass ein Schild sich auch dann noch lesbar zurücklehnt, wenn ihm die Kamera
 * aus den Augen gereicht wird, während am Schirm die von oben steht
 * (`GAUGE_LEAN_MIN`).
 *
 * Kein WebGL und kein `document`: Das Modul malt nichts auf eine Leinwand,
 * also läuft es hier wie jede andere Rechnung (`core/chefFit.canLoadModels`).
 */

/** Eine Bühne: ein Elternteil, das **nicht** im Ursprung steht und gedreht ist. */
function stage(): THREE.Object3D {
  const parent = new THREE.Group();
  parent.position.set(10, 0, -4);
  parent.rotation.y = Math.PI / 2;
  parent.updateMatrixWorld(true);
  return parent;
}

/** Eine Kamera an einer Weltstelle — mehr braucht ein Billboard nicht. */
function eyeAt(x: number, y: number, z: number): THREE.Camera {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, y, z);
  camera.updateMatrixWorld(true);
  return camera;
}

function named(parent: THREE.Object3D, name: string): THREE.Object3D[] {
  return parent.children.filter((child) => child.name.startsWith(name));
}

const AT = new THREE.Vector3(11, 0.85, -4);

describe('KitchenGauges — was hängt und was nicht', () => {
  it('hängt nichts in die Szene, solange niemand etwas anzeigt', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.update(0.016, eyeAt(0, 1.6, 5));
    expect(parent.children).toHaveLength(0);
    gauges.dispose();
  });

  it('hängt je Schlüssel genau ein Schild auf, auch wenn es jedes Bild gerufen wird', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    for (let i = 0; i < 30; i++) gauges.bar('stove:3', AT, i / 30, 'cook');
    expect(named(parent, 'kitchen-gauge-bar')).toHaveLength(1);
    gauges.bar('stove:4', AT, 0.5, 'cook');
    expect(named(parent, 'kitchen-gauge-bar')).toHaveLength(2);
    gauges.dispose();
  });

  it('nimmt mit `clear` alles zu einem Schlüssel weg und lässt die Nachbarn stehen', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.bar('stove:3', AT, 0.5, 'burn');
    gauges.warn('stove:3', AT);
    gauges.flame('stove:3', AT, 'fire');
    gauges.bar('board:1', AT, 0.5, 'chop');
    expect(parent.children).toHaveLength(4);

    gauges.clear('stove:3');
    expect(parent.children).toHaveLength(1);
    expect(parent.children[0]!.name).toBe('kitchen-gauge-bar');
    gauges.dispose();
  });

  it('baut nichts neu, wenn ein Herd aus- und wieder einblendet', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.bar('stove:3', AT, 0.2, 'cook');
    const first = parent.children[0]!;
    gauges.clear('stove:3');
    expect(parent.children).toHaveLength(0);
    gauges.bar('stove:3', AT, 0.2, 'cook');
    // Dasselbe Ding, aus dem Vorrat zurückgeholt — und nicht ein zweites.
    expect(parent.children[0]).toBe(first);
    gauges.dispose();
  });

  it('teilt Formen und Farben über alle Stationen und gibt jede einmal frei', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    const shapes = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skins = jest.spyOn(THREE.Material.prototype, 'dispose');

    for (const key of ['a', 'b', 'c', 'd']) {
      gauges.bar(key, AT, 0.5, 'cook');
      gauges.warn(key, AT);
      gauges.flame(key, AT, 'cook');
    }
    gauges.dispose();

    // Vier Formen (Quad, linksbündiges Quad, Dreieck, Kegel) und sechs Farben
    // (Grund, eine Füllung, Tinte und Fläche des Dreiecks, Kern und Glut der
    // Flamme) — für vier Stationen wie für eine.
    expect(shapes).toHaveBeenCalledTimes(4);
    expect(skins).toHaveBeenCalledTimes(6);
    expect(parent.children).toHaveLength(0);
  });

  it('übersteht ein zweites `dispose`', () => {
    const gauges = new KitchenGauges(stage());
    gauges.bar('a', AT, 1, 'cook');
    gauges.dispose();
    expect(() => gauges.dispose()).not.toThrow();
  });
});

describe('KitchenGauges — der Balken', () => {
  it('steht dort, wo die Zone ihn haben will — auch an einem gedrehten Elternteil', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.bar('stove:3', AT, 0.5, 'cook');
    const at = parent.children[0]!.getWorldPosition(new THREE.Vector3());
    expect(at.x).toBeCloseTo(AT.x, 5);
    expect(at.y).toBeCloseTo(AT.y, 5);
    expect(at.z).toBeCloseTo(AT.z, 5);
    gauges.dispose();
  });

  it('ist so breit, wie der Anteil sagt, und klemmt alles Unsinnige', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    const width = (): number => (parent.children[0]!.children[1] as THREE.Mesh).scale.x;
    const shown = (): boolean => parent.children[0]!.children[1]!.visible;

    gauges.bar('a', AT, 0.4, 'cook');
    expect(width()).toBeCloseTo(0.4 * BAR_WIDTH, 6);
    gauges.bar('a', AT, 1, 'cook');
    expect(width()).toBeCloseTo(BAR_WIDTH, 6);
    gauges.bar('a', AT, 3, 'cook');
    expect(width()).toBeCloseTo(BAR_WIDTH, 6);
    gauges.bar('a', AT, -1, 'cook');
    expect(shown()).toBe(false);
    gauges.bar('a', AT, Number.NaN, 'cook');
    expect(shown()).toBe(false);
    expect(Number.isFinite(width())).toBe(true);
    gauges.dispose();
  });

  it('wechselt die Farbe, wenn aus Braten Verbrennen wird', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    const color = (): number =>
      (
        (parent.children[0]!.children[1] as THREE.Mesh).material as THREE.MeshBasicMaterial
      ).color.getHex();

    const tones: GaugeTone[] = ['cook', 'burn', 'chop'];
    const seen = tones.map((tone) => {
      gauges.bar('a', AT, 0.5, tone);
      return color();
    });
    expect(new Set(seen).size).toBe(3);
    gauges.dispose();
  });
});

describe('KitchenGauges — die Drehung zur Kamera', () => {
  /** Die Normale des Schilds in Weltmaß — dorthin sieht es. */
  function facing(object: THREE.Object3D): THREE.Vector3 {
    return object.getWorldDirection(new THREE.Vector3());
  }

  it('sieht die Kamera von oben genau an', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.bar('a', AT, 0.5, 'cook');
    // 55° über der Waagerechten, wie `core/topDownPose.TOP_DOWN_TILT`.
    const tilt = (55 * Math.PI) / 180;
    const camera = eyeAt(AT.x, AT.y + 16 * Math.sin(tilt), AT.z + 16 * Math.cos(tilt));
    gauges.update(0.016, camera);

    const want = camera.position.clone().sub(AT).normalize();
    expect(facing(parent.children[0]!).dot(want)).toBeCloseTo(1, 5);
    gauges.dispose();
  });

  it('lehnt sich auch vor einer Kamera auf Augenhöhe zurück', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.bar('a', AT, 0.5, 'cook');
    gauges.update(0.016, eyeAt(AT.x, AT.y, AT.z + 3));

    const normal = facing(parent.children[0]!);
    // Genau die Mindestneigung — und nicht etwa nach hinten weggekippt.
    expect(normal.y).toBeCloseTo(Math.sin(GAUGE_LEAN_MIN), 5);
    expect(normal.z).toBeGreaterThan(0);
    expect(normal.x).toBeCloseTo(0, 5);
    gauges.dispose();
  });

  it('dreht sich nach Osten, wenn die Kamera im Osten steht', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.warn('a', AT);
    gauges.update(0.016, eyeAt(AT.x + 5, AT.y, AT.z));

    const normal = facing(parent.children[0]!);
    expect(normal.x).toBeGreaterThan(0.8);
    expect(Math.abs(normal.z)).toBeLessThan(0.01);
    gauges.dispose();
  });
});

describe('KitchenGauges — Dreieck und Flammen', () => {
  it('pulst das Dreieck, aber verlässt seinen Platz nicht', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.warn('a', AT);
    const sign = parent.children[0]!;
    const camera = eyeAt(AT.x, AT.y + 4, AT.z + 4);

    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      gauges.update(0.05, camera);
      seen.add(Math.round(sign.scale.x * 1000));
      // Was pulst, darf wachsen und schrumpfen — aber nie verschwinden.
      expect(sign.scale.x).toBeGreaterThan(0.9);
      expect(sign.scale.x).toBeLessThan(1.2);
    }
    expect(seen.size).toBeGreaterThan(3);
    expect(sign.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(AT.y, 5);
    gauges.dispose();
  });

  it('nimmt das Dreieck mit `null` wieder weg', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.warn('a', AT);
    gauges.warn('a', null);
    expect(parent.children).toHaveLength(0);
    // Zweimal wegnehmen ist kein Fehler — eine Station ruft das jedes Bild.
    expect(() => gauges.warn('a', null)).not.toThrow();
    gauges.dispose();
  });

  it('flackert die Flammen, ohne sie zu verlieren', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    gauges.flame('a', AT, 'cook');
    const tongue = parent.children[0]!.children[0] as THREE.Mesh;
    const camera = eyeAt(AT.x, AT.y + 4, AT.z + 4);

    gauges.update(0, camera);
    const ruhig = tongue.scale.y;
    gauges.update(0.06, camera);
    expect(tongue.scale.y).not.toBeCloseTo(ruhig, 4);
    // Eine Zunge, die auf null schrumpft oder ins Doppelte schießt, ist kein
    // Flackern mehr, sondern ein Fehler in der Schwingung.
    for (let i = 0; i < 60; i++) {
      gauges.update(0.02, camera);
      expect(tongue.scale.y).toBeGreaterThan(ruhig * 0.6);
      expect(tongue.scale.y).toBeLessThan(ruhig * 1.4);
    }
    gauges.dispose();
  });

  it('tauscht die Flamme, wenn aus Braten ein Brand wird', () => {
    const parent = stage();
    const gauges = new KitchenGauges(parent);
    const kinds: FlameKind[] = ['cook', 'fire'];
    const heights = kinds.map((kind) => {
      gauges.flame('a', AT, kind);
      expect(parent.children).toHaveLength(1);
      return new THREE.Box3().setFromObject(parent.children[0]!).max.y - AT.y;
    });
    // Ein brennender Herd ist von weitem zu sehen, eine bratende Pfanne nicht.
    expect(heights[1]!).toBeGreaterThan(heights[0]! * 3);
    gauges.dispose();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
