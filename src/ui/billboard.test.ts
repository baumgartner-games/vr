import * as THREE from 'three';
import {
  BILLBOARD_LEAN_MIN,
  TOP_DOWN_CAMERA_NAME,
  billboardAngles,
  faceCamera,
  turnWithView,
  unfaceCamera,
  viewYaw,
} from './billboard';

/**
 * **Was ein Schild verspricht, das die Kamera ansieht** (`ui/billboard.ts`).
 *
 * Geprüft wird beides: die reine Rechnung (`billboardAngles`) und das, was
 * daran wirklich neu ist — dass die Ausrichtung **beim Zeichnen** passiert und
 * damit je Kamera einzeln. Genau das war der Fehler, den niemand im `update`
 * sehen konnte: Die Welt bekommt dort die Kamera aus den Augen, am Schirm steht
 * aber die von oben.
 *
 * Und die zweite Zusage steckt in fast jedem Fall hier drin: **parallel zum
 * Bild**, nicht auf die Linse gezielt. Ein Schild bekommt Neigung und Gieren
 * der Kamera und nicht die Richtung zu ihrem Standort — sonst steht jede
 * Beschriftung neben der Blickachse ein bisschen schiefer als die daneben.
 * Deshalb steht in diesen Tests nirgends mehr, **wo** die Kamera ist: Es
 * kommt allein darauf an, **wie** sie schaut.
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

/**
 * **Eine Kamera, die so schaut** — `down` nach unten, `turn` um die Hochachse,
 * beides im Bogenmaß. Wo sie dabei steht, ist ihr (und dem Schild) egal.
 */
function eyeLooking(down: number, turn = 0, roll = 0): THREE.Camera {
  const camera = new THREE.PerspectiveCamera();
  camera.rotation.order = 'YXZ';
  camera.rotation.set(-down, turn, roll);
  camera.position.set(3, 7, -2);
  camera.updateMatrixWorld(true);
  return camera;
}

/** Die Richtung, in der der Betrachter hinter der Kamera sitzt: ihr +Z. */
function backAxis(camera: THREE.Camera): THREE.Vector3 {
  return new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 2).normalize();
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
    // Eine Kamera, die waagerecht nach Westen schaut — ihre Rückachse zeigt
    // nach Osten: volles Gieren, Mindestneigung.
    const { yaw, pitch } = billboardAngles(5, 0, 0, 0);
    expect(yaw).toBeCloseTo(Math.PI / 2, 6);
    expect(pitch).toBeCloseTo(-BILLBOARD_LEAN_MIN, 6);
  });

  it('nimmt den echten Winkel, sobald die Kamera steiler blickt als das Mindestmaß', () => {
    // 55° nach unten, wie die Kamera von oben.
    const tilt = (55 * Math.PI) / 180;
    const { pitch } = billboardAngles(0, Math.sin(tilt), Math.cos(tilt), 0);
    expect(pitch).toBeCloseTo(-tilt, 6);
  });

  it('behält das Gieren, wenn die Kamera senkrecht nach unten schaut', () => {
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
  const TILT = (55 * Math.PI) / 180;

  it('steht parallel zum Bild der Kamera — auch an einem gedrehten Elternteil', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    sign.position.set(1, 0.85, 0);
    parent.add(sign);
    faceCamera(sign);

    const camera = eyeLooking(TILT, 0.7);
    draw(sign, camera);

    // Die Vorderseite des Schildes zeigt genau dorthin, wo der Betrachter
    // hinter der Linse sitzt: auf die Rückachse der Kamera.
    expect(facing(sign).dot(backAxis(camera))).toBeCloseTo(1, 5);
  });

  /**
   * **Die Zusage, für die das Ganze umgebaut wurde.** Zwei Schilder, dieselbe
   * Kamera, verschiedene Orte im Bild — und beide stehen **gleich**. Vorher
   * zielte jedes auf den Standort der Kamera, und weil deren Blick von schräg
   * oben kommt, stand jedes am Rand ein Stück schiefer als das in der Mitte:
   * Von oben lagen die Beschriftungen der Küche wie hingeworfen.
   */
  it('richtet zwei Schilder nebeneinander gleich aus, statt jedes auf die Linse zu zielen', () => {
    const camera = eyeLooking(TILT);
    const signs = [-6, 6].map((x) => {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
      sign.position.set(x, 1, 4);
      const parent = new THREE.Group();
      parent.add(sign);
      parent.updateMatrixWorld(true);
      faceCamera(sign);
      draw(sign, camera);
      return sign.rotation.clone();
    });
    expect(signs[0]!.y).toBeCloseTo(signs[1]!.y, 6);
    expect(signs[0]!.x).toBeCloseTo(signs[1]!.x, 6);
    // Und zwar so, wie die Kamera schaut: 55° zurückgelehnt, nach Süden.
    expect(signs[0]!.x).toBeCloseTo(-TILT, 5);
    expect(signs[0]!.y).toBeCloseTo(0, 6);
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

    const oben = eyeLooking(TILT);
    const augen = eyeLooking(0, Math.PI / 2);

    draw(sign, oben);
    const zurOben = facing(sign).clone();
    draw(sign, augen);
    const zurAugen = facing(sign).clone();

    expect(zurOben.dot(backAxis(oben))).toBeCloseTo(1, 5);
    // Aus den Augen greift die Mindestneigung: gegiert wie die Kamera, aber
    // nicht bolzengerade.
    expect(zurAugen.x).toBeGreaterThan(0.8);
    expect(zurOben.dot(zurAugen)).toBeLessThan(0.9);
  });

  /**
   * **Eine Kamera, die sich zur Seite legt, legt kein Schild mit.** In der
   * Brille passiert das bei jedem Blick um die Ecke; ein Aushang, der dabei
   * mitkippt, ist kein Aushang mehr, sondern ein Zeiger.
   */
  it('übernimmt das Rollen der Kamera nicht', () => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    const parent = new THREE.Group();
    parent.add(sign);
    parent.updateMatrixWorld(true);
    faceCamera(sign);

    draw(sign, eyeLooking(TILT, 0.3));
    const gerade = sign.rotation.clone();
    draw(sign, eyeLooking(TILT, 0.3, 0.4));
    expect(sign.rotation.z).toBe(0);
    expect(sign.rotation.y).toBeCloseTo(gerade.y, 6);
    expect(sign.rotation.x).toBeCloseTo(gerade.x, 6);
  });

  it('zieht die Weltmatrix sofort nach, nicht erst im nächsten Bild', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    parent.add(sign);
    faceCamera(sign);

    draw(sign, eyeLooking(0.6, 2.1));
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

    const camera = eyeLooking(TILT, -1.2);
    draw(group, camera);

    expect(facing(group).dot(backAxis(camera))).toBeCloseTo(1, 5);
  });

  it('hält ein zweites Anhängen aus und lässt sich wieder abnehmen', () => {
    const parent = stage();
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    parent.add(sign);
    faceCamera(sign);
    faceCamera(sign, { upright: true });

    draw(sign, eyeLooking(TILT, 1));
    // Die zweite Ansage gilt — und nicht beide übereinander.
    expect(sign.rotation.x).toBe(0);

    const drehung = sign.rotation.y;
    unfaceCamera(sign);
    draw(sign, eyeLooking(TILT, -1));
    expect(sign.rotation.y).toBe(drehung);
    // Zweimal abnehmen ist kein Fehler.
    expect(() => {
      unfaceCamera(sign);
    }).not.toThrow();
  });
});

describe('Schilder, die der gedrehten Draufsicht folgen (turnWithView)', () => {
  const Q = Math.PI / 2;

  it('lässt bei Norden oben alles, wie es gebaut ist', () => {
    expect(viewYaw('flat', 0, 1, 0.3)).toBeCloseTo(0.3);
    expect(viewYaw('upright', 0, 1, 0)).toBeCloseTo(0);
  });

  it('dreht Flaches um genau das Gieren der Kamera mit', () => {
    // Die Kamera eine Vierteldrehung weiter: ihre Rückachse zeigt nach +X.
    expect(viewYaw('flat', 1, 0, 0)).toBeCloseTo(Q);
    expect(viewYaw('flat', 1, 0, 0.2)).toBeCloseTo(Q + 0.2);
    expect(Math.abs(viewYaw('flat', 0, -1, 0))).toBeCloseTo(Math.PI);
  });

  it('stellt Aufrechtes zur Kamera, gleich wie es gebaut wurde', () => {
    expect(viewYaw('upright', -1, 0, Q)).toBeCloseTo(-Q);
    expect(viewYaw('upright', 1, 0, -Q)).toBeCloseTo(Q);
  });

  it('bleibt stehen, wenn die Kamera senkrecht herabschaut', () => {
    expect(viewYaw('flat', 0, 0, 0.4)).toBe(0.4);
  });

  const render = (object: THREE.Object3D, camera: THREE.Camera): void => {
    camera.updateMatrixWorld(true);
    object.onBeforeRender(
      null as unknown as THREE.WebGLRenderer,
      null as unknown as THREE.Scene,
      camera,
      null as unknown as THREE.BufferGeometry,
      null as unknown as THREE.Material,
      null as unknown as THREE.Group,
    );
  };

  it('dreht nur für die Kamera von oben — aus den Augen steht es wie gebaut', () => {
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1, 1));
    sign.rotation.x = -Q;
    const built = sign.quaternion.clone();
    turnWithView(sign, 'flat');

    const top = new THREE.PerspectiveCamera();
    top.name = TOP_DOWN_CAMERA_NAME;
    top.rotation.order = 'YXZ';
    top.rotation.set(-0.9, Q, 0);
    render(sign, top);
    // Die Oberkante der Schrift (lokal +Y) zeigt jetzt dorthin, wohin die
    // Kamera schaut — nach −X, also im Bild nach oben.
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(sign.quaternion);
    expect(up.x).toBeCloseTo(-1);
    expect(up.y).toBeCloseTo(0);

    const eyes = new THREE.PerspectiveCamera();
    eyes.rotation.set(0, Q, 0);
    render(sign, eyes);
    expect(sign.quaternion.angleTo(built)).toBeCloseTo(0);
  });
});
