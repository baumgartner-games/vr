import * as THREE from 'three';
import { Portal } from './Portal';
import { crossPoint, yawThrough } from './portalCrossing';

/**
 * Der Durchtritt, wie ihn eine Kiste und ein Zombie erleben.
 *
 * Der Test gibt es, weil man beides in der Brille nicht auseinanderhalten
 * kann: „er ist nicht durchgekommen" und „er ist durchgekommen und im selben
 * Bild wieder zurückgefallen" sehen gleich aus — nämlich nach einem Zombie,
 * der vor der Wand zappelt.
 */

const UP = new THREE.Vector3(0, 1, 0);
const _at = new THREE.Vector3();
const _matrix = new THREE.Matrix4();

/** Ein Paar Portale: `a` schaut nach +Z, `b` in eine Richtung nach Wahl. */
function pair(normalB: THREE.Vector3, atB = new THREE.Vector3(10, 1, 0), upB = UP) {
  const a = new Portal('a', 0x3fa9ff);
  const b = new Portal('b', 0xff5a5f);
  a.link = b;
  b.link = a;
  a.place(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), UP);
  b.place(atB, normalB, upB);
  return { a, b };
}

describe('crossPoint', () => {
  const { a } = pair(new THREE.Vector3(1, 0, 0));

  it('findet den Punkt, an dem die Strecke die Ebene schneidet', () => {
    const hit = crossPoint(a, new THREE.Vector3(0, 1, 0.4), new THREE.Vector3(0, 1, -0.4), _at);
    expect(hit).not.toBeNull();
    expect(a.signedDistance(hit!)).toBeCloseTo(0, 6);
    expect(hit!.y).toBeCloseTo(1, 6);
  });

  it('lässt liegen, wer davor bleibt', () => {
    expect(
      crossPoint(a, new THREE.Vector3(0, 1, 0.9), new THREE.Vector3(0, 1, 0.3), _at),
    ).toBeNull();
  });

  it('holt niemanden zurück, der von hinten kommt', () => {
    // Wer aus dem Portal herauskommt, geht in derselben Frame nicht wieder
    // hinein: Dieselbe Strecke, nur andersherum gelaufen, zählt nicht.
    expect(
      crossPoint(a, new THREE.Vector3(0, 1, -0.4), new THREE.Vector3(0, 1, 0.4), _at),
    ).toBeNull();
  });

  it('lässt die Wand neben der Öffnung Wand sein', () => {
    // 90 cm neben der Mitte ist kein Portal mehr, sondern Beton.
    expect(
      crossPoint(a, new THREE.Vector3(0.9, 1, 0.4), new THREE.Vector3(0.9, 1, -0.4), _at),
    ).toBeNull();
  });

  it('erwischt auch den, der in einem Bild ganz hindurchfliegt', () => {
    // 30 cm je Bild: Ein geworfenes Ding ist zwischen zwei Bildern längst
    // drüben, und nur der Schnitt mit der Ebene sieht das noch.
    const hit = crossPoint(a, new THREE.Vector3(0, 1, 0.15), new THREE.Vector3(0, 1, -2.5), _at);
    expect(hit).not.toBeNull();
    expect(a.signedDistance(hit!)).toBeCloseTo(0, 6);
  });
});

describe('yawThrough', () => {
  it('dreht die Blickrichtung mit dem Portal mit', () => {
    // Rein nach -Z (yaw 0), heraus entlang der Normalen des zweiten Portals:
    // +X, und das ist yaw = -90°.
    const { a } = pair(new THREE.Vector3(1, 0, 0));
    expect(yawThrough(0, a.getTraversalMatrix(_matrix)!)).toBeCloseTo(-Math.PI / 2, 9);
  });

  it('dreht bei zwei gleich ausgerichteten Portalen um 180°', () => {
    const { a } = pair(new THREE.Vector3(0, 0, 1), new THREE.Vector3(5, 1, 0));
    expect(Math.abs(yawThrough(0, a.getTraversalMatrix(_matrix)!))).toBeCloseTo(Math.PI, 9);
  });

  it('behält den Winkel, wenn es hinter dem Portal keinen mehr gibt', () => {
    // Ausgang im Boden: Wer mit dem Rücken zur Wand hineingeht, schaut danach
    // senkrecht nach unten, und ein Gierwinkel ist daraus nicht zu machen.
    // Ohne den Rückfall käme dort eine halbe Drehung heraus — geraten aus zwei
    // Nullen, und jedes Mal eine andere.
    const { a } = pair(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(4, 0, 0),
      new THREE.Vector3(0, 0, -1),
    );
    expect(yawThrough(Math.PI, a.getTraversalMatrix(_matrix)!)).toBeCloseTo(Math.PI, 9);
  });

  it('ist auf dem Rückweg ihre eigene Umkehrung', () => {
    const { a, b } = pair(new THREE.Vector3(1, 0, 0));
    const there = yawThrough(0.7, a.getTraversalMatrix(_matrix)!);
    const back = yawThrough(there + Math.PI, b.getTraversalMatrix(_matrix)!);
    // Hin und wieder zurück — mit dem Kehrtwenden davor und danach, denn wer
    // zurückgeht, geht in die andere Richtung.
    expect(Math.cos(back - (0.7 + Math.PI))).toBeCloseTo(1, 6);
  });
});
