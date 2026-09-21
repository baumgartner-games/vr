import * as THREE from 'three';
import { AvatarBody } from './AvatarBody';
import { bodyRadius, BODY_KINDS, BODY_RADIUS, HEAD_KINDS, HEAD_RADIUS } from './avatarLook';
import { CHEF_EYE, POSE_SCALE } from './chefFit';
import { HEADGEAR_KINDS } from './headgear';
import type { Appearance } from './appearance';

/**
 * Der Körper selbst ist Geometrie, und wie er aussieht, entscheidet kein Test.
 * Vier Sachen an ihm sind trotzdem Rechnung, und alle vier fielen schon einmal
 * auf: dass der Rumpf **unter** dem Kopf steht und beim Ducken mitgeht, dass
 * `setSelfView` genau das ausblendet, was man in den eigenen Augen nicht sehen
 * darf (und die Hände stehen lässt), dass ein Wechsel des Aussehens nicht jedes
 * Mal einen zweiten Rumpf im Körper zurücklässt — und die **Proportionen**:
 * Die erste Fassung dieser Figur war 1,7 m hoch und 0,5 m breit und sah von
 * oben aus wie eine Säule. Breit und gedrungen ist hier kein Geschmack,
 * sondern die Bedingung, unter der man aus 16 m Höhe erkennt, wer da läuft.
 */
/**
 * Was an einer Gleitkommazahl noch als „genau" durchgeht. Die Maße hier fallen
 * aus Matrizen heraus, und eine Sohle liegt dann eben auf −8·10⁻¹⁰ statt auf 0.
 */
const EPSILON = 1e-6;

function pose(y: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  return { position: new THREE.Vector3(0, y, 0), quaternion: new THREE.Quaternion() };
}

function torsoOf(body: AvatarBody): THREE.Object3D {
  return body.getObjectByName('avatar-torso')!;
}

/** Der Kopf der Figur — die Kugel, die beim Tragen mitwippt. */
function headOf(body: AvatarBody): THREE.Object3D {
  return body.getObjectByName('avatar-head')!;
}

/**
 * Die Jacke allein — ohne Hose und Halstuch. Ihre Breite ist die Zahl, an der
 * das Verhältnis zum Kopf hängt, und damit der ganze Stil.
 */
function coatOf(body: AvatarBody): THREE.Object3D {
  return body.getObjectByName('avatar-coat')!;
}

/**
 * Die Gruppe, die das Watscheln trägt. `avatar-torso` steht unter dem Kopf und
 * dreht sich mit ihm; darin hängt die gebaute Figur, und **die** wippt, rollt
 * und neigt sich (`BodyShape.setStride`).
 */
function shapeOf(body: AvatarBody): THREE.Object3D {
  return torsoOf(body).children[0]!;
}

describe('die Figur', () => {
  it('baut jede Kombination aus Kopf, Hut und Körper', () => {
    const body = new AvatarBody({ hands: true });
    for (const head of HEAD_KINDS) {
      for (const kind of BODY_KINDS) {
        for (const hat of HEADGEAR_KINDS) {
          const look: Appearance = { head, body: kind, hat };
          body.setLook(look);
          body.update(1 / 60, pose(1.6), null, null);
        }
      }
    }
    expect(torsoOf(body).children).toHaveLength(1);
    body.dispose();
  });

  it('stellt die Figur mit den Sohlen auf den Boden, den Kopf obenauf', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const box = new THREE.Box3().setFromObject(torsoOf(body));
    // **Die Sohle liegt auf dem Boden.** Vorher endete hier eine Kartoffel
    // einen Fingerbreit darüber; seit die Figur Beine hat, wäre dasselbe ein
    // Koch, der schwebt — und ein Schuh, der einen Zentimeter im Boden steckt,
    // ist genauso falsch.
    expect(box.min.y).toBeGreaterThan(-EPSILON);
    expect(box.min.y).toBeLessThan(0.02);
    // Oben schließt der Kragen **über** der Kopfunterkante: Der Kopf sitzt auf
    // dem Rumpf, es gibt keinen Hals, an dem eine Lücke klaffen könnte.
    // Gemessen wird gegen die Augenhöhe der **Figur** und nicht die des
    // Spielers — seit sie ein Modell ist, haben die beiden nichts mehr
    // miteinander zu tun (`core/chefFit.ts`).
    const coat = new THREE.Box3().setFromObject(coatOf(body));
    expect(coat.max.y).toBeGreaterThan(CHEF_EYE - HEAD_RADIUS);
    expect(coat.max.y).toBeLessThan(CHEF_EYE);
    body.dispose();
  });

  it('trägt unter dem Saum die karierte Hose — und keine Beine', () => {
    // Die Vorbilder haben **keine Beine**: Ihr Kochkaro sitzt unten am Rumpf,
    // und darunter schließt er als Kuppel auf dem Boden ab. Ein Zwischenstand
    // dieses Umbaus hatte zwei Beine mit Schuhen; das las sich als Koch, war
    // aber nicht der Stil. Der Test hält die Entscheidung fest, weil sie beim
    // nächsten Mal sonst wieder umgedreht wird.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    expect(body.getObjectByName('leg-left')).toBeUndefined();
    expect(body.getObjectByName('leg-right')).toBeUndefined();
    expect(body.getObjectByName('sleeve-left')).toBeUndefined();

    const coat = new THREE.Box3().setFromObject(coatOf(body));
    const checks = new THREE.Box3().setFromObject(body.getObjectByName('avatar-trousers')!);
    // Die Hose steht auf dem Boden und hört unter dem Saum auf …
    expect(checks.min.y).toBeGreaterThan(-EPSILON);
    expect(checks.min.y).toBeLessThan(0.01);
    expect(checks.max.y).toBeLessThan(coat.min.y + 0.01);
    // … und sie ist **schmaler als die Jacke**: Der Saum springt darüber
    // heraus, und diese Taille ist der Unterschied zwischen einem Koch und
    // einer Matrjoschka.
    expect(checks.max.x - checks.min.x).toBeLessThan((coat.max.x - coat.min.x) * 0.85);
    body.dispose();
  });

  it('watschelt beim Laufen und steht im Stehen still', () => {
    // Eine Figur ohne Beine kann nicht schreiten, also wippt sie: Der Rumpf
    // hebt und staucht sich im Takt, rollt dazu und legt sich nach vorn. Ohne
    // das rutscht sie über den Boden.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const shape = shapeOf(body);
    expect(shape.rotation.z).toBeCloseTo(0, 5);
    expect(shape.rotation.x).toBeCloseTo(0, 5);
    expect(shape.scale.y).toBeCloseTo(1, 5);

    let rolled = 0;
    let squashed = 1;
    for (let i = 0; i < 12; i++) {
      body.position.x += 0.05;
      body.update(1 / 60, pose(1.6), null, null);
      rolled = Math.max(rolled, Math.abs(shape.rotation.z));
      squashed = Math.min(squashed, shape.scale.y);
    }
    expect(rolled).toBeGreaterThan(0.01);
    expect(squashed).toBeLessThan(0.995);
    // Nach vorn geneigt, nicht nach hinten.
    expect(shape.rotation.x).toBeLessThan(-0.01);
    body.dispose();
  });

  /**
   * **Squishy Movement** (`core/squish.ts`, _Grafik → Animationen_). Die Kurve
   * selbst steht in `squish.test.ts`; hier steht, dass sie an der Figur
   * ankommt — und zwar an der **ganzen**: Rumpf und Kopf werden zusammen
   * flacher und breiter, und die Sohlen bleiben dabei auf dem Boden. Eine
   * Figur, die beim Stauchen im Boden steckt, ist schlimmer als eine, die
   * gar nicht federt.
   */
  it('staucht und streckt sich beim Laufen, wenn es eingeschaltet ist', () => {
    const body = new AvatarBody();
    body.squish = 2;
    const torso = torsoOf(body);
    body.update(1 / 60, pose(1.6), null, null);
    // Im Stehen passiert nichts, auch mit voller Stärke.
    expect(torso.scale.y).toBeCloseTo(1, 5);
    expect(torso.scale.x).toBeCloseTo(1, 5);

    let flattest = 1;
    let longest = 1;
    for (let i = 0; i < 40; i++) {
      body.position.x += 0.05;
      body.update(1 / 60, pose(1.6), null, null);
      flattest = Math.min(flattest, torso.scale.y);
      longest = Math.max(longest, torso.scale.y);
      // Breiter, wo sie flacher ist: Das Volumen bleibt.
      expect(torso.scale.x).toBeCloseTo(1 / Math.sqrt(torso.scale.y), 5);
      expect(torso.scale.z).toBeCloseTo(torso.scale.x, 10);
      // Der Kopf macht dasselbe und fährt dabei mit dem Rumpf hinauf und
      // hinunter — er sitzt auf ihm und nicht daneben.
      expect(headOf(body).scale.y).toBeCloseTo(torso.scale.y, 10);
      expect(headOf(body).position.y).toBeCloseTo(CHEF_EYE * torso.scale.y, 5);
    }
    expect(flattest).toBeLessThan(0.9);
    expect(longest).toBeGreaterThan(1.1);
    // Die Sohlen bleiben, wo sie sind: Gestreckt wird um den Boden.
    expect(torso.position.y).toBeCloseTo(0, 10);
    body.dispose();
  });

  it('federt nicht, solange niemand es einschaltet', () => {
    // Der Auslieferungszustand: Die Figur läuft, wie sie immer lief.
    const body = new AvatarBody();
    expect(body.squish).toBe(0);
    for (let i = 0; i < 20; i++) {
      body.position.x += 0.05;
      body.update(1 / 60, pose(1.6), null, null);
    }
    expect(torsoOf(body).scale.y).toBeCloseTo(1, 10);
    expect(torsoOf(body).scale.x).toBeCloseTo(1, 10);
    expect(headOf(body).position.y).toBeCloseTo(CHEF_EYE, 10);
    body.dispose();
  });

  it('ist breit genug, dass die Figur von oben gedrungen wirkt', () => {
    // Das Maß, an dem die erste Fassung scheiterte: eine Säule von einer
    // halben Kachel Breite über 1,7 m Höhe. Ein Koch ist eine Tonne.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const box = new THREE.Box3().setFromObject(coatOf(body));
    const width = box.max.x - box.min.x;
    // Ein Vieleck aus 32 Seiten bleibt knapp unter dem Kreis, den es meint —
    // deshalb ein Fenster und keine Gleichheit.
    expect(width).toBeGreaterThan(BODY_RADIUS * 2 - 0.02);
    expect(width).toBeLessThanOrEqual(BODY_RADIUS * 2 + EPSILON);
    expect(width).toBeGreaterThan(0.7);
    // **Das eigentliche Maß dieses Stils**: Der Kopf ist fast so breit wie
    // die Jacke. An den Vorbildern sind es 91 %, hier 86 % — und in der
    // ersten Fassung waren es 55 %, weshalb sie von oben aussah wie ein Knauf
    // auf einem Kegel. Wer den Rumpf breiter macht, ohne den Kopf mitzunehmen,
    // dreht genau das wieder zurück.
    expect(HEAD_RADIUS * 2).toBeGreaterThan(width * 0.8);
    expect(HEAD_RADIUS * 2).toBeLessThan(width);
    // Und oben kragt er über die Schulter hinaus — die Einschnürung, an der
    // das Auge die Figur wiedererkennt.
    expect(HEAD_RADIUS).toBeGreaterThan(bodyRadius(0.95) * 1.2);
    body.dispose();
  });

  it('bleibt gleich hoch, ob der Spieler steht oder sich duckt', () => {
    // **Die Figur duckt sich nicht mehr.** Früher kam ihre Höhe aus der des
    // Spielerkopfes, und wer sich hinsetzte, wurde kleiner. Seit sie ein
    // Modell in fester Größe ist (`core/chefFit.ts`), hat ihre Höhe mit
    // seiner nichts mehr zu tun: Sie ist 1,6 m hoch, ihre Augen liegen bei
    // 0,91 m, und beides bleibt so. Das ist eine Entscheidung und kein
    // Versehen — deshalb steht sie hier als Test und nicht nur als Kommentar.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const standing = new THREE.Box3().setFromObject(torsoOf(body));
    body.update(1 / 60, pose(0.9), null, null);
    const ducked = new THREE.Box3().setFromObject(torsoOf(body));
    expect(ducked.max.y).toBeCloseTo(standing.max.y, 5);
    expect(ducked.min.y).toBeCloseTo(standing.min.y, 5);
    expect(body.head.position.y).toBeCloseTo(CHEF_EYE, 5);
    body.dispose();
  });

  it('setzt den Kopf hinter die Augen, aus denen die Pose kommt', () => {
    // Die Pose ist die Kamera, die Kugel hat ihren Mittelpunkt dahinter —
    // sonst stünde der halbe Kopf vor dem Gesicht in der Luft.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    expect(body.head.position.z).toBeGreaterThan(0.03);
    // Die Höhe kommt aus der Figur, nicht aus der Pose — x und z aber schon.
    expect(body.head.position.y).toBeCloseTo(CHEF_EYE, 5);
    body.dispose();
  });

  it('lässt die Hände vor dem Rumpf schweben, wenn keine getrackt wird', () => {
    const body = new AvatarBody({ hands: true });
    body.update(1 / 60, pose(1.6), null, null);
    const [left, right] = body.handAnchors;
    // Der Anker sagt „diese Hand ist getrackt" — die Kugel schwebt trotzdem.
    expect(left.visible).toBe(false);
    expect(right.visible).toBe(false);
    // Seitlich weit genug, dass sie von schräg oben neben dem 84 cm breiten
    // Rumpf vorbeischauen …
    // **Mit Lücke**: Die Hand steht weiter außen als der Rumpf an ihrer Höhe
    // — bei den Vorbildern ist zwischen beiden nachgemessen Luft, und das ist
    // neben der Mütze ihr unverwechselbarstes Merkmal. Ein Zwischenstand
    // hatte Ärmelstummel, die genau diese Lücke schlossen.
    const shoulder = bodyRadius(0.6);
    expect(left.position.x).toBeLessThan(-shoulder);
    expect(right.position.x).toBeGreaterThan(shoulder);
    // … und ein Stück **vor** ihm: −z ist vorn, der Rumpf steht bei z = 0
    // plus dem Versatz des Nackens.
    const torso = torsoOf(body).position.z;
    for (const hand of [left, right]) expect(hand.position.z).toBeLessThan(torso - 0.01);
    // Auf Bauchhöhe, nicht am Boden und nicht am Kinn — in den Maßen der
    // Figur, die nur noch 1,6 m hoch ist.
    for (const hand of [left, right]) {
      expect(hand.position.y).toBeGreaterThan(CHEF_EYE * 0.35);
      expect(hand.position.y).toBeLessThan(CHEF_EYE);
    }
    body.dispose();
  });

  it('folgt der getrackten Hand — gestaucht in den Raum der Figur', () => {
    // Der Spieler schaut aus 1,6 m, seine Figur aus 0,91 m. Eine Hand, die er
    // auf Brusthöhe hält, läge über ihrem Kopf, übernähme man sie unbesehen.
    // Gestaucht wird der **Abstand zum Kopf**, nicht die Weltposition: Die
    // Figur steht, wo er steht, und greift dorthin, wo er greift.
    const body = new AvatarBody({ hands: true });
    const hand = { position: new THREE.Vector3(0.4, 1.1, -0.3) };
    body.update(1 / 60, pose(1.6), null, hand);
    const anchor = body.handAnchors[1];
    expect(anchor.visible).toBe(true);
    expect(anchor.position.x).toBeCloseTo(0.4 * POSE_SCALE, 5);
    // Unter den Augen der Figur, weil die Hand auch unter denen des Spielers
    // war — und zwar um denselben Anteil.
    expect(anchor.position.y).toBeCloseTo(CHEF_EYE + (1.1 - 1.6) * POSE_SCALE, 5);
    // Und was in dieser Hand hängt, wird mit ihr kleiner.
    expect(anchor.scale.x).toBeCloseTo(POSE_SCALE, 5);
    body.dispose();
  });

  it('nimmt in den eigenen Augen Kopf und Rumpf weg, die Hände nicht', () => {
    const body = new AvatarBody({ hands: true });
    body.setSelfView(true);
    expect(body.head.visible).toBe(false);
    expect(torsoOf(body).visible).toBe(false);
    for (const anchor of body.handAnchors) expect(anchor.visible).toBe(true);
    body.setSelfView(false);
    expect(body.head.visible).toBe(true);
    body.dispose();
  });

  it('räumt den alten Rumpf weg, wenn die Jacke wechselt', () => {
    const body = new AvatarBody();
    const before = torsoOf(body).children[0]!;
    body.setLook({ hat: 'chef', head: 'beard', body: 'striped' });
    const torso = torsoOf(body);
    expect(torso.children).toHaveLength(1);
    expect(torso.children[0]).not.toBe(before);
    body.dispose();
  });
});

/**
 * **Das Wippen beim Tragen** — es sitzt am Kopf der Figur und nirgendwo sonst.
 *
 * Der Fall, den dieser Test festhält, ist der, den man im Browser erst merkt,
 * wenn einem schlecht ist: Ein Wippen, das aus Versehen die **Pose** verändert,
 * die hereingereicht wird, wandert von der Figur in die Kamera — und eine
 * Kamera, die im Takt der Schritte nickt, ist am Schirm kein Gefühl von Gehen
 * und in der Brille schlicht verboten.
 */
describe('der Kopf beim Tragen', () => {
  function walk(body: AvatarBody, steps: number): number[] {
    const heights: number[] = [];
    for (let i = 0; i < steps; i++) {
      // Jedes Bild einen halben Meter weiter: schneller als 1,6 m/s, also
      // voller Ausschlag (`AvatarBody.update`, `stride`).
      const at = pose(CHEF_EYE);
      at.position.z = -i * 0.5;
      body.update(1 / 20, at, null, null);
      heights.push(headOf(body).position.y);
    }
    return heights;
  }

  it('steht still, solange nichts getragen wird', () => {
    const body = new AvatarBody();
    const heights = walk(body, 12);
    for (const y of heights) expect(y).toBeCloseTo(CHEF_EYE, 6);
    body.dispose();
  });

  it('wippt mit dem Schritt, sobald etwas getragen wird', () => {
    const body = new AvatarBody();
    body.headBob = 0.02;
    const heights = walk(body, 24);
    const low = Math.min(...heights);
    const high = Math.max(...heights);
    // Nur nach unten: Ein Kopf, der über seine Augenhöhe hinausschnellt, wäre
    // ein Hüpfen und kein Gehen.
    expect(high).toBeLessThanOrEqual(CHEF_EYE + EPSILON);
    expect(CHEF_EYE - low).toBeGreaterThan(0.005);
    expect(CHEF_EYE - low).toBeLessThanOrEqual(0.02 + EPSILON);
    body.dispose();
  });

  it('lässt die Pose in Ruhe, aus der die Kamera kommt', () => {
    const body = new AvatarBody();
    body.headBob = 0.02;
    const at = pose(CHEF_EYE);
    for (let i = 0; i < 8; i++) {
      at.position.z = -i * 0.5;
      body.update(1 / 20, at, null, null);
      // Die hereingereichte Pose ist die des Spielers — sie gehört ihm, und
      // die Figur schreibt nicht darin herum.
      expect(at.position.y).toBe(CHEF_EYE);
      expect(body.bob).toBeLessThanOrEqual(0);
    }
    body.dispose();
  });
});
