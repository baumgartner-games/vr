import * as THREE from 'three';
import {
  BELT_EMPTY,
  BELT_HEIGHT,
  BELT_SECONDS,
  BeltKit,
  advanceBelt,
  beltProgress,
  beltStep,
  type BeltState,
} from './kitchenBelt';
import type { Turn } from './kitchenPlan';

/**
 * **Was das Förderband verspricht** (`kitchenBelt.ts`).
 *
 * Zwei Versprechen, und das zweite ist das, an dem ein Band scheitert, ohne
 * dass es jemandem auffällt: dass ein Ding bei einem Bild von 100 s genauso
 * lange über die Kachel braucht wie bei tausend Bildern von 0,1 s — und dass
 * der Pfeil dorthin zeigt, wohin geschoben wird, in **allen vier** Drehungen.
 *
 * Und dazu die Zusage, ohne die dieses Modul in keinem Testlauf vorkäme: Der
 * Bausatz lässt sich **ohne `document` und ohne WebGL** bauen und wieder
 * wegräumen (`core/chefFit.canLoadModels`) — in Jest gibt es keine Leinwand,
 * und ein Band, das ohne sie umfiele, wäre hier gar nicht zu prüfen.
 */

describe('beltStep — wohin ein gedrehtes Band schiebt', () => {
  it('schiebt bei `turn: 0` nach Norden und dreht sich mit dem Möbel', () => {
    expect(beltStep(0)).toEqual({ dx: 0, dz: -1 });
    expect(beltStep(1)).toEqual({ dx: -1, dz: 0 });
    expect(beltStep(2)).toEqual({ dx: 0, dz: 1 });
    expect(beltStep(3)).toEqual({ dx: 1, dz: 0 });
  });

  it('zeigt genau dorthin, wohin das gedrehte Netz nach −z zeigt', () => {
    // Die Probe auf `kitchen.place`: Dort bekommt ein Möbel
    // `rotation.y = turn · 90°`, und der Pfeil auf dem Band zeigt in seinem
    // eigenen Raum nach −z. Beides muss dasselbe ergeben, sonst zeigt der
    // Pfeil in die eine und das Band schiebt in die andere Richtung.
    const turns: Turn[] = [0, 1, 2, 3];
    for (const turn of turns) {
      const ahead = new THREE.Vector3(0, 0, -1).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        (turn * Math.PI) / 2,
      );
      const step = beltStep(turn);
      expect(ahead.x).toBeCloseTo(step.dx, 10);
      expect(ahead.z).toBeCloseTo(step.dz, 10);
    }
  });

  it('gibt für jede Drehung eine eigene Richtung', () => {
    const seen = new Set(
      ([0, 1, 2, 3] as Turn[]).map((turn) => `${beltStep(turn).dx}/${beltStep(turn).dz}`),
    );
    expect(seen.size).toBe(4);
  });

  it('lässt sich nicht von außen umschreiben', () => {
    // Der Versatz ist eingefroren: Wer ihn weiterreicht und dabei versehentlich
    // darauf rechnet, dreht sonst alle Bänder der Küche.
    const step = beltStep(0);
    expect(() => {
      (step as { dx: number }).dx = 99;
    }).toThrow();
    expect(beltStep(0)).toEqual({ dx: 0, dz: -1 });
  });
});

describe('advanceBelt — die Fahrt über eine Kachel', () => {
  /** Eine ganze Kachel in `steps` gleich langen Bildern. */
  function ride(steps: number): { state: BeltState; overs: number } {
    let state = BELT_EMPTY;
    let overs = 0;
    for (let i = 0; i < steps; i++) {
      const tick = advanceBelt(state, BELT_SECONDS / steps, true);
      state = tick.state;
      if (tick.handOver) overs++;
    }
    return { state, overs };
  }

  it('braucht in einem großen Bild genauso lange wie in tausend kleinen', () => {
    expect(ride(1).overs).toBe(1);
    expect(ride(1000).overs).toBe(1);
    expect(advanceBelt(BELT_EMPTY, 100, true).handOver).toBe(true);
  });

  it('reicht genau einmal weiter und steht danach wieder leer da', () => {
    const tick = advanceBelt(BELT_EMPTY, 100, true);
    expect(tick.handOver).toBe(true);
    expect(tick.state).toBe(BELT_EMPTY);
    // Der Rest läuft **nicht** über: Das nächste Ding fängt vorn an, und nicht
    // 98 Sekunden vor der nächsten Übergabe.
    expect(tick.state.time).toBe(0);
    expect(advanceBelt(tick.state, 0.016, true).handOver).toBe(false);
  });

  it('kommt keine Kachel früher an', () => {
    let state = BELT_EMPTY;
    for (let i = 0; i < 10; i++) {
      const tick = advanceBelt(state, BELT_SECONDS / 11, true);
      expect(tick.handOver).toBe(false);
      state = tick.state;
    }
    expect(state.time).toBeLessThan(BELT_SECONDS);
    expect(beltProgress(state)).toBeGreaterThan(0.85);
  });

  it('bleibt leer bei null, wie lange auch gefahren wird', () => {
    let state = BELT_EMPTY;
    for (let i = 0; i < 50; i++) {
      const tick = advanceBelt(state, 1, false);
      expect(tick.handOver).toBe(false);
      state = tick.state;
    }
    expect(state.time).toBe(0);
    // Und nichts geändert heißt nichts gebaut — der Fall für jedes leere Band
    // in jedem Bild.
    expect(advanceBelt(BELT_EMPTY, 0.016, false).state).toBe(BELT_EMPTY);
  });

  it('setzt zurück, wenn jemand das Ding wieder herunternimmt', () => {
    const half = advanceBelt(BELT_EMPTY, BELT_SECONDS / 2, true).state;
    expect(half.time).toBeGreaterThan(0);
    expect(advanceBelt(half, 0.016, false).state).toBe(BELT_EMPTY);
  });

  it('lässt sich von einem `dt` ohne Zahl nicht vergiften', () => {
    const state: BeltState = { time: 0.5 };
    expect(advanceBelt(state, Number.NaN, true).state.time).toBe(0.5);
    expect(advanceBelt(state, -3, true).state.time).toBe(0.5);
  });

  it('klemmt den Anteil auf 0…1', () => {
    expect(beltProgress(BELT_EMPTY)).toBe(0);
    expect(beltProgress({ time: BELT_SECONDS / 2 })).toBeCloseTo(0.5, 6);
    expect(beltProgress({ time: BELT_SECONDS * 9 })).toBe(1);
    expect(beltProgress({ time: -4 })).toBe(0);
    expect(beltProgress({ time: Number.NaN })).toBe(0);
  });
});

describe('BeltKit — der Bausatz ohne Leinwand', () => {
  it('lässt sich ohne `document` und ohne WebGL bauen', () => {
    expect(typeof document).toBe('undefined');
    const kit = new BeltKit();
    expect(() => kit.piece()).not.toThrow();
    kit.dispose();
  });

  it('baut ein Band, das auf dem Boden steht und genau so hoch ist wie im Katalog', () => {
    const kit = new BeltKit();
    const belt = kit.piece();
    belt.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(belt);

    // Ursprung **auf dem Boden in seiner Mitte**, wie jedes Küchenmöbel.
    expect(box.min.y).toBeCloseTo(0, 6);
    expect(box.max.y).toBeCloseTo(BELT_HEIGHT, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
    expect((box.min.z + box.max.z) / 2).toBeCloseTo(0, 6);
    // Eine Kachel breit und nicht breiter (`core/kitchenFit`, `tiles: [1, 1]`).
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(1 + 1e-6);
    expect(box.max.z - box.min.z).toBeLessThanOrEqual(1 + 1e-6);
    kit.dispose();
  });

  it('teilt Formen und Farben über alle Bänder und gibt jede einmal frei', () => {
    const kit = new BeltKit();
    const shapes = new Set<THREE.BufferGeometry>();
    const skins = new Set<THREE.Material>();
    for (let i = 0; i < 8; i++) {
      kit.piece().traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        shapes.add(mesh.geometry);
        skins.add(mesh.material as THREE.Material);
      });
    }
    // Korpus, Platte, Trog, Pfeilebene — vier Formen und vier Farben, für acht
    // Bänder wie für eines.
    expect(shapes.size).toBe(4);
    expect(skins.size).toBe(4);

    const shapeGone = jest.spyOn(THREE.BufferGeometry.prototype, 'dispose');
    const skinGone = jest.spyOn(THREE.Material.prototype, 'dispose');
    kit.dispose();
    expect(shapeGone).toHaveBeenCalledTimes(4);
    expect(skinGone).toHaveBeenCalledTimes(4);
  });

  it('läuft auch ohne Textur und übersteht ein zweites `dispose`', () => {
    const kit = new BeltKit();
    kit.piece();
    // Ohne Leinwand gibt es nichts zu verschieben — aber auch nichts, was
    // dabei umfällt.
    expect(() => {
      for (let i = 0; i < 100; i++) kit.update(0.016);
    }).not.toThrow();
    kit.dispose();
    expect(() => kit.dispose()).not.toThrow();
    expect(() => kit.update(0.016)).not.toThrow();
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});
