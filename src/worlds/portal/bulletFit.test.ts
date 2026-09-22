/**
 * **Wie groß eine Patrone wird und wohin sie zeigt** — die beiden Rechnungen,
 * die aus dem Kügelchen ein Geschoss machen.
 *
 * Beide sind three.js-frei und stehen deshalb hier auf dem Prüfstand
 * (`bulletFit.ts`); was daran hängt — der Körper, die Masse, die Hülle —,
 * bleibt unverändert und ist anderswo geprüft. Der Grund, warum das *hier*
 * steht und nicht im Auge einer Brille: „Doppelt so groß" ist bei einem Ding,
 * das lang und dünn ist, keine Zahl, sondern eine Entscheidung, und eine
 * Entscheidung ohne Test wird beim nächsten Umbau wieder zur Laune.
 */
import { BULLET_LENGTH_IN_RADII, bulletAim, bulletScale } from './bulletFit';
import { rotateVec, type Vec3 } from './tools/aim';

/** Die lange Achse von `Bullet.glb`, im Maßstab seines Pakets: 0,225 × 0,7. */
const MODEL_LENGTH = 0.1575;
/** Und ihre Dicke daneben: 0,075 × 0,7. Das Verhältnis ist 1 : 3. */
const MODEL_THICKNESS = 0.0525;
/** Der Halbmesser, den eine Kugel von 60 g hat (`PortalWorld.spawnBullet`). */
const PLAIN_RADIUS = 0.014;

describe('Die Patrone wird auf die doppelte Größe der Kugel gebracht', () => {
  it('ist so lang, wie das Kügelchen doppelt dick war', () => {
    const scale = bulletScale(MODEL_LENGTH, PLAIN_RADIUS);
    // 2,8 cm Durchmesser hatte die Kugel, 5,6 cm lang wird die Patrone.
    expect(MODEL_LENGTH * scale).toBeCloseTo(4 * PLAIN_RADIUS, 6);
    expect(MODEL_LENGTH * scale).toBeCloseTo(0.056, 6);
    expect(BULLET_LENGTH_IN_RADII).toBe(4);
  });

  it('wird dabei dünner als das Kügelchen — und das ist der Preis', () => {
    // Die ehrliche Kehrseite der Entscheidung: Von der Seite ist die Patrone
    // knapp doppelt so groß wie die Kugelscheibe, von vorn ist sie es nicht.
    const scale = bulletScale(MODEL_LENGTH, PLAIN_RADIUS);
    const thickness = MODEL_THICKNESS * scale;
    expect(thickness).toBeCloseTo(0.0187, 4);
    expect(thickness).toBeLessThan(2 * PLAIN_RADIUS);
    // Von der Seite dagegen: 5,6 × 1,87 cm gegen die Kreisscheibe der Kugel.
    const flank = 4 * PLAIN_RADIUS * thickness;
    const disc = Math.PI * PLAIN_RADIUS * PLAIN_RADIUS;
    expect(flank / disc).toBeGreaterThan(1.6);
  });

  it('wächst mit der Masse, weil der Halbmesser es tut', () => {
    // Achtmal so schwer ist zweimal so dick (`Math.cbrt`), und die Patrone
    // geht mit: Sie hängt am Halbmesser und nicht an einer eigenen Zahl.
    const heavy = 0.014 * Math.cbrt(0.48 / 0.06);
    expect(heavy).toBeCloseTo(0.028, 6);
    expect(MODEL_LENGTH * bulletScale(MODEL_LENGTH, heavy)).toBeCloseTo(0.112, 6);
  });

  it('lässt ein unmögliches Maß, wie es ist', () => {
    // Dieselbe Antwort wie in `core/kaykitHeight.kaykitHeightScale`: Besser
    // eine Patrone in ihrer gelieferten Größe als eine unendlich große.
    expect(bulletScale(0, PLAIN_RADIUS)).toBe(1);
    expect(bulletScale(MODEL_LENGTH, 0)).toBe(1);
    expect(bulletScale(Number.NaN, PLAIN_RADIUS)).toBe(1);
  });
});

/** Wohin das +z des Modells nach dieser Drehung zeigt. */
function nose(direction: Vec3): Vec3 {
  return rotateVec({ x: 0, y: 0, z: 1 }, bulletAim(direction), { x: 0, y: 0, z: 0 });
}

describe('Die Patrone fliegt, wie sie zeigt', () => {
  it('legt ihre Spitze auf die Flugrichtung', () => {
    for (const direction of [
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0.3, y: -0.8, z: 0.52 },
      { x: -0.7, y: 0.1, z: -0.6 },
    ]) {
      const length = Math.hypot(direction.x, direction.y, direction.z);
      const tip = nose(direction);
      expect(tip.x).toBeCloseTo(direction.x / length, 6);
      expect(tip.y).toBeCloseTo(direction.y / length, 6);
      expect(tip.z).toBeCloseTo(direction.z / length, 6);
    }
  });

  it('rechnet auch mit einer Richtung, die keine Einheit ist', () => {
    // `spawnBullet` normiert selbst, die Werkzeugseite nicht immer — und eine
    // Drehung, die an der Länge ihrer Eingabe hängt, ist keine Drehung.
    const tip = nose({ x: 0, y: 0, z: 37 });
    expect(tip.z).toBeCloseTo(1, 6);
  });

  it('nimmt für den Schuss nach hinten die Hochachse', () => {
    // Nach `−z` gibt es keine kürzeste Drehung, sondern unendlich viele. Die
    // gewählte ist dieselbe halbe Umdrehung, mit der auch die ganze Waffe
    // umgedreht wird (`pistolFit.gunPoint`) — die Patrone liegt damit so herum
    // wie der Lauf, aus dem sie kommt.
    const aim = bulletAim({ x: 0, y: 0, z: -1 });
    expect(aim).toEqual({ x: 0, y: 1, z: 0, w: 0 });
    const tip = nose({ x: 0, y: 0, z: -1 });
    expect(tip.z).toBeCloseTo(-1, 6);
    expect(Math.abs(tip.x)).toBeLessThan(1e-9);
    expect(Math.abs(tip.y)).toBeLessThan(1e-9);
  });

  it('bleibt bei einer Richtung aus lauter Nullen in Ruhe', () => {
    expect(bulletAim({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('gibt immer eine Einheitsdrehung heraus', () => {
    for (const direction of [
      { x: 0, y: 0, z: 1 },
      { x: 0, y: 0, z: -1 },
      { x: 4, y: -2, z: 9 },
      { x: -1, y: -1, z: -1 },
    ]) {
      const aim = bulletAim(direction);
      expect(Math.hypot(aim.x, aim.y, aim.z, aim.w)).toBeCloseTo(1, 9);
    }
  });
});
