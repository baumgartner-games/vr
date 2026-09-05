/**
 * **Ein Griff an einem Ding aus dem Beutel, in beide Richtungen.**
 *
 * Der Hals der Flasche soll in der Faust liegen, die den Hammerstiel hält —
 * und zwar aufrecht *oder* über Kopf, je nachdem, wie die Flasche beim
 * Zugreifen gerade lag. Was dabei nicht passieren darf: dass sie sich um
 * ihre eigene Achse dreht (ein Etikett, das beim Zugreifen wegdreht, sieht
 * nach einem Fehler aus), oder dass sie sich in die *fernere* Lage wirft.
 */
import * as THREE from 'three';
import { POLE_FIST, snapToGrip, type PropGrip } from './propGrip';
import { CHAMPAGNE_GRIP } from './champagne';

const fistAxis = new THREE.Vector3(0, 1, 0).applyQuaternion(
  new THREE.Quaternion(
    POLE_FIST.rotation.x,
    POLE_FIST.rotation.y,
    POLE_FIST.rotation.z,
    POLE_FIST.rotation.w,
  ),
);
const fistCentre = new THREE.Vector3(
  POLE_FIST.position.x,
  POLE_FIST.position.y,
  POLE_FIST.position.z,
);

/** Wo der Griff nach dem Einrasten liegt: Mitte und Achse im Griffraum. */
function placed(current: THREE.Quaternion, grip: PropGrip = CHAMPAGNE_GRIP) {
  const snap = snapToGrip(current, grip);
  return {
    centre: grip.centre.clone().applyQuaternion(snap.rotation).add(snap.position),
    axis: grip.axis.clone().applyQuaternion(snap.rotation),
    rotation: snap.rotation,
  };
}

describe('snapToGrip', () => {
  it('legt die Mitte des Griffs in die Faust und seine Achse auf die der Faust', () => {
    const { centre, axis } = placed(new THREE.Quaternion());
    expect(centre.distanceTo(fistCentre)).toBeLessThan(1e-6);
    expect(Math.abs(axis.dot(fistAxis))).toBeCloseTo(1, 6);
  });

  it('nimmt die nähere der beiden Richtungen — aufrecht bleibt aufrecht, über Kopf über Kopf', () => {
    // Die Flasche steht etwas schräg in Richtung der Faustachse …
    const tilt = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      fistAxis
        .clone()
        .add(new THREE.Vector3(0.3, 0, 0))
        .normalize(),
    );
    expect(placed(tilt).axis.dot(fistAxis)).toBeCloseTo(1, 6);
    // … und dieselbe Flasche, um den Kopf gedreht, bleibt auf dem Kopf.
    const upsideDown = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      fistAxis
        .clone()
        .negate()
        .add(new THREE.Vector3(0.3, 0, 0))
        .normalize(),
    );
    expect(placed(upsideDown).axis.dot(fistAxis)).toBeCloseTo(-1, 6);
  });

  it('dreht nur so weit, wie es muss: liegt die Achse schon, bleibt alles, wie es war', () => {
    const already = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), fistAxis);
    const roll = new THREE.Quaternion().setFromAxisAngle(fistAxis, 1.1).multiply(already);
    const { rotation } = placed(roll);
    expect(rotation.angleTo(roll)).toBeLessThan(1e-6);
  });

  it('lässt den Griff in Ruhe, den es bekommt', () => {
    const grip: PropGrip = {
      centre: new THREE.Vector3(0, 0.1, 0),
      axis: new THREE.Vector3(0, 1, 0),
    };
    snapToGrip(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 2), grip);
    expect(grip.centre.toArray()).toEqual([0, 0.1, 0]);
    expect(grip.axis.toArray()).toEqual([0, 1, 0]);
  });
});
