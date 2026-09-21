/**
 * **Was hingestellt wird, steht auf einer Kachel und schaut geradeaus.**
 *
 * Gemessen wird hier nur die Rechnung (`gridSnap.ts`) und nicht die Welt: Ob
 * das Fass danach wirklich dort liegt, entscheidet die Physik, und die hat
 * ihren eigenen Test. Was diese Datei festhält, ist das Versprechen davor —
 * Kachelmitte, Vierteldrehung, und ein Wurf bleibt ein Wurf.
 */
import * as THREE from 'three';
import { TILE } from '../nav/navTile';
import { PLACE_SPEED, gridPose, placesOnGrid, quarterYaw, tileCentre, yawOf } from './gridSnap';

/** Eine Drehung um die Hochachse, so wie sie an einem Gegenstand steht. */
function turned(yaw: number): THREE.Quaternion {
  return new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
}

describe('tileCentre', () => {
  it('legt jeden Punkt einer Kachel auf dieselbe Mitte', () => {
    expect(tileCentre(0)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(0.01)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(0.99 * TILE)).toBeCloseTo(TILE / 2, 9);
    expect(tileCentre(3.2 * TILE)).toBeCloseTo(3.5 * TILE, 9);
  });

  /**
   * Die Fuge und nicht die Mitte ist die Grenze — sonst spränge ein Ding, das
   * genau in der Kachelmitte steht, beim nächsten Ablegen eine Kachel weiter.
   */
  it('rastet unter null genauso ein wie darüber', () => {
    expect(tileCentre(-0.01)).toBeCloseTo(-TILE / 2, 9);
    expect(tileCentre(-2.5 * TILE)).toBeCloseTo(-2.5 * TILE, 9);
    expect(tileCentre(tileCentre(4.7 * TILE))).toBeCloseTo(tileCentre(4.7 * TILE), 9);
  });
});

describe('yawOf', () => {
  it('liest die Drehung um die Hochachse zurück', () => {
    for (const yaw of [0, 0.4, Math.PI / 2, -1.2, Math.PI - 0.01]) {
      expect(yawOf(turned(yaw))).toBeCloseTo(yaw, 9);
    }
  });

  /** Ein Fass, das auf dem Kopf durch die Luft geflogen ist, hat trotzdem eine. */
  it('gibt für eine Drehung ohne Richtung in der Ebene null', () => {
    const upright = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      Math.PI / 2,
    );
    expect(yawOf(upright)).toBe(0);
  });
});

describe('quarterYaw', () => {
  it('rundet auf die nächste Vierteldrehung', () => {
    expect(quarterYaw(0.2)).toBeCloseTo(0, 9);
    expect(quarterYaw(1.4)).toBeCloseTo(Math.PI / 2, 9);
    expect(quarterYaw(-1.4)).toBeCloseTo(-Math.PI / 2, 9);
    expect(quarterYaw(Math.PI - 0.1)).toBeCloseTo(Math.PI, 9);
  });

  it('bleibt in (−180°, 180°] und fällt bei Unsinn auf null', () => {
    for (let yaw = -10; yaw <= 10; yaw += 0.37) {
      const snapped = quarterYaw(yaw);
      expect(snapped).toBeGreaterThan(-Math.PI - 1e-9);
      expect(snapped).toBeLessThanOrEqual(Math.PI + 1e-9);
      // Und es ist wirklich ein Viertel und kein krummer Winkel.
      expect(Math.abs((snapped / (Math.PI / 2)) % 1)).toBeLessThan(1e-9);
    }
    expect(quarterYaw(Number.NaN)).toBe(0);
  });
});

describe('gridPose', () => {
  it('stellt ein schräg gehaltenes Ding gerade auf seine Kachel', () => {
    const tilted = new THREE.Quaternion()
      .setFromAxisAngle(new THREE.Vector3(0, 1, 0), 1.45)
      .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.3));
    const pose = gridPose(3.2 * TILE, -0.4 * TILE, tilted);
    expect(pose.x).toBeCloseTo(3.5 * TILE, 9);
    expect(pose.z).toBeCloseTo(-0.5 * TILE, 9);
    expect(pose.yaw).toBeCloseTo(Math.PI / 2, 9);
  });

  /**
   * **Zweimal hinstellen ändert nichts mehr.** Ohne diese Zusage wanderte eine
   * Reihe Fässer bei jedem Aufheben und Ablegen um eine Kachel weiter.
   */
  it('ist stabil: was eingerastet ist, bleibt liegen', () => {
    const first = gridPose(7.3 * TILE, 2.8 * TILE, turned(0.9));
    const again = gridPose(first.x, first.z, turned(first.yaw));
    expect(again).toEqual(first);
  });
});

describe('placesOnGrid', () => {
  it('rastet ein, was langsam losgelassen wird', () => {
    expect(placesOnGrid(0, false)).toBe(true);
    expect(placesOnGrid(PLACE_SPEED, false)).toBe(true);
  });

  it('lässt einen Wurf fliegen', () => {
    expect(placesOnGrid(PLACE_SPEED + 0.01, false)).toBe(false);
    expect(placesOnGrid(9, false)).toBe(false);
  });

  /** Am Schirm legt ein Knopfdruck ab — auch im Laufen. */
  it('rastet ein, wenn ausdrücklich abgelegt wird', () => {
    expect(placesOnGrid(9, true)).toBe(true);
  });
});
