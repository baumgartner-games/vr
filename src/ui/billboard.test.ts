import * as THREE from 'three';
import { BILLBOARD_LEAN_MIN, billboardAngles, faceCamera, unfaceCamera } from './billboard';

/**
 * **Was ein Schild verspricht, das die Kamera ansieht** (`ui/billboard.ts`).
 *
 * Geprüft wird beides: die reine Rechnung (`billboardAngles`) und das, was
 * daran wirklich neu ist — dass die Ausrichtung **beim Zeichnen** passiert und
 * damit je Kamera einzeln. Genau das war der Fehler, den niemand im `update`
 * sehen konnte: Die Welt bekommt dort die Kamera aus den Augen, am Schirm steht
 * aber die von oben.
 *
 * Kein WebGL nötig. Was three beim Zeichnen tut, ist eine Zeile
 * (`renderObject`: `object.onBeforeRender(renderer, scene, camera, …)`), und
 * die kann ein Test selbst rufen — `draw` unten tut nichts anderes.
 */

/** Ein Elternteil, das **nicht** im Ursprung steht und gedreht ist. */
function stage(): THREE.Object3D {
  const parent = new THREE.Group();
  parent.position.set(10, 0, -4);
  parent.rotation.y = Math.PI / 2;
  parent.updateMatrixWorld(true);
  return parent;
}

function eyeAt(x: number, y: number, z: number): THREE.Camera {
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(x, y, z);
  camera.updateMatrixWorld(true);
  return camera;
}

/**
 * **Ein Bild zeichnen** — so, wie three es täte: Alles unter dem Objekt bekommt
 * seinen `onBeforeRender` mit **dieser** Kamera, sonst nichts.
 */
function draw(object: THREE.Object3D, camera: THREE.Camera): void {
  object.traverse((node) => {
    (node.onBeforeRender as unknown as (r: unknown, s: unknown, c: THREE.Camera) => void)(
      null,
      null,
      camera,
    );
  });
}

/** Die Normale in Weltmaß — dorthin sieht das Schild. */
function facing(object: THREE.Object3D): THREE.Vector3 {
  return object.getWorldDirection(new THREE.Vector3());
}

describe('billboardAngles — die reine Rechnung', () => {
  it('giert zur Kamera und lehnt sich mindestens zurück', () => {
    // Kamera genau im Osten, auf gleicher Höhe: volles Gieren, Mindestneigung.
    const { yaw, pitch } = billboardAngles(5, 0, 0, 0);
    expect(yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(pitch).toBeCloseTo(-BILLBOARD_LEAN_MIN, 6);
  });

  it('nimmt den echten Winkel, sobald die Kamera höher steht als das Mindestmaß', () => {
    // 55° über der Waagerechten, wie die Kamera von oben.
    const tilt = (55 * Math.PI) / 180;
    const { pitch } = billboardAngles(0, Math.sin(tilt), Math.cos(tilt), 0);
    expect(pitch).toBeCloseTo(-tilt, 6);
  });

  it('behält das Gieren, wenn die Kamera senkrecht darüber steht', () => {
    const { yaw, pitch } = billboardAngles(0, 4, 0, 1.23);
    expect(yaw).toBeCloseTo(1.23, 6);
    expect(pitch).toBeCloseTo(-Math.PI / 2, 6);
  });

  it('folgt mit `leanMin: 0` der Kamera unverfälscht', () => {
    const { pitch } = billboardAngles(0, 1, 4, 0, { leanMin: 0 });
    expect(pitch).toBeCloseTo(-Math.atan2(1, 4), 6);
  });

  it('bleibt mit `upright` senkrecht und giert trotzdem', () => {
    const { yaw, pitch } = billboardAngles(3, 9, 0, 0, { upright: true });
    expect(pitch).toBe(0);
    expect(yaw).toBeCloseTo(Math.PI / 2, 6);
  });
});

describe('faceCamera — ausgerichtet wird beim Zeichnen', () => {
  it('sieht die Kamera an, aus der gezeichnet wird — auch an einem gedrehten Elternteil', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    sign.position.set(1, 0.85, 0);
    parent.add(sign);
    faceCamera(sign);

    const at = sign.getWorldPosition(new THREE.Vector3());
    const camera = eyeAt(at.x + 3, at.y + 6, at.z + 3);
    draw(sign, camera);

    const want = camera.position.clone().sub(at).normalize();
    expect(facing(sign).dot(want)).toBeCloseTo(1, 5);
  });

  /**
   * **Der Kern der Sache.** Zwei Ansichten hintereinander im selben Bild — am
   * Schirm die von oben, in der Brille die aus den Augen —, und jede bekommt
   * das Schild zu sich gedreht. Im `update` ausgerichtet wäre das nicht zu
   * haben: Dort gibt es nur **eine** Kamera.
   */
  it('richtet dasselbe Schild für jede Kamera neu aus', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    parent.add(sign);
    faceCamera(sign);

    const at = sign.getWorldPosition(new THREE.Vector3());
    const oben = eyeAt(at.x, at.y + 16, at.z + 11);
    const augen = eyeAt(at.x + 3, at.y, at.z);

    draw(sign, oben);
    const zurOben = facing(sign).clone();
    draw(sign, augen);
    const zurAugen = facing(sign).clone();

    expect(zurOben.dot(oben.position.clone().sub(at).normalize())).toBeCloseTo(1, 5);
    expect(zurAugen.x).toBeGreaterThan(0.8);
    expect(zurOben.dot(zurAugen)).toBeLessThan(0.9);
  });

  it('zieht die Weltmatrix sofort nach, nicht erst im nächsten Bild', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    parent.add(sign);
    faceCamera(sign);

    const camera = eyeAt(20, 9, 20);
    draw(sign, camera);
    // Ohne `updateMatrixWorld` in `onBeforeRender` stünde hier noch die
    // Drehung von vorhin — three baut die Matrizen **vor** dem Zeichnen.
    const stored = new THREE.Vector3().set(
      sign.matrixWorld.elements[8]!,
      sign.matrixWorld.elements[9]!,
      sign.matrixWorld.elements[10]!,
    );
    expect(stored.dot(facing(sign))).toBeCloseTo(1, 5);
  });

  /**
   * Eine `Group` zeichnet three nicht, also ruft es an ihr auch kein
   * `onBeforeRender`. Ein Balken ist aber eine Gruppe — er richtet sich über
   * seine Teile aus.
   */
  it('richtet auch eine Gruppe aus, die three selbst nie fragen würde', () => {
    const parent = stage();
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1)));
    group.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1)));
    parent.add(group);
    faceCamera(group);

    const at = group.getWorldPosition(new THREE.Vector3());
    const camera = eyeAt(at.x - 5, at.y + 5, at.z);
    draw(group, camera);

    expect(facing(group).dot(camera.position.clone().sub(at).normalize())).toBeCloseTo(1, 5);
  });

  it('hält ein zweites Anhängen aus und lässt sich wieder abnehmen', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    parent.add(sign);
    faceCamera(sign);
    faceCamera(sign, { upright: true });

    const camera = eyeAt(30, 30, 30);
    draw(sign, camera);
    // Die zweite Ansage gilt — und nicht beide übereinander.
    expect(sign.rotation.x).toBe(0);

    const drehung = sign.rotation.y;
    unfaceCamera(sign);
    draw(sign, eyeAt(-30, 30, -30));
    expect(sign.rotation.y).toBe(drehung);
    // Zweimal abnehmen ist kein Fehler.
    expect(() => {
      unfaceCamera(sign);
    }).not.toThrow();
  });
});
