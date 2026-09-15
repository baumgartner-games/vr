import * as THREE from 'three';
import { AvatarBody } from './AvatarBody';
import { BODY_KINDS, BODY_RADIUS, HEAD_KINDS, HEAD_RADIUS, HEM } from './avatarLook';
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

/**
 * Die Jacke allein — ohne Ärmel und Beine. Der Rumpf trägt inzwischen beides,
 * und deren Spannweite ist nicht die Breite des Stoffs, um die es geht.
 */
function coatOf(body: AvatarBody): THREE.Object3D {
  return body.getObjectByName('avatar-coat')!;
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
    const coat = new THREE.Box3().setFromObject(coatOf(body));
    expect(coat.max.y).toBeGreaterThan(1.6 - HEAD_RADIUS);
    expect(coat.max.y).toBeLessThan(1.6);
    body.dispose();
  });

  it('lässt die karierten Beine unter dem Saum hervorschauen', () => {
    // Der Saum der Jacke endet über dem Boden, und darunter steht etwas: Ohne
    // diese Lücke ist die Figur wieder ein Kegel, der über den Boden rutscht.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const coat = new THREE.Box3().setFromObject(coatOf(body));
    expect(coat.min.y).toBeGreaterThan(0.25);
    const left = new THREE.Box3().setFromObject(body.getObjectByName('leg-left')!);
    const right = new THREE.Box3().setFromObject(body.getObjectByName('leg-right')!);
    for (const leg of [left, right]) {
      expect(leg.min.y).toBeLessThan(0.02);
      expect(leg.max.y).toBeGreaterThan(coat.min.y);
    }
    // Und sie stehen nebeneinander, nicht ineinander.
    expect(left.max.x).toBeLessThan(right.min.x);
    body.dispose();
  });

  it('schwingt die Beine beim Laufen und lässt sie im Stehen stehen', () => {
    // Von oben sieht man aus 16 m keinen einzelnen Schuh — aber dass sich
    // etwas bewegt, sieht man sofort. Eine Figur, an der beim Laufen nichts
    // zuckt, rutscht über den Boden.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const still = body.getObjectByName('leg-left')!.rotation.x;
    expect(still).toBeCloseTo(0, 5);
    // Drei Bilder mit einem Meter Versatz sind reichlich Tempo.
    for (let i = 0; i < 6; i++) {
      body.position.x += 0.05;
      body.update(1 / 60, pose(1.6), null, null);
    }
    const left = body.getObjectByName('leg-left')!.rotation.x;
    const right = body.getObjectByName('leg-right')!.rotation.x;
    expect(Math.abs(left)).toBeGreaterThan(0.02);
    // Gegenläufig: Das eine Bein geht vor, wenn das andere zurückgeht.
    expect(left).toBeCloseTo(-right, 5);
    body.dispose();
  });

  it('richtet die Ärmel auf die Hände', () => {
    // Der Ärmel ist das, was Hand und Rumpf zusammengehören lässt. Zeigt er
    // woanders hin, liegt der Figur die Hand nur daneben.
    const body = new AvatarBody({ hands: true });
    const far = { position: new THREE.Vector3(1.1, 1.3, -0.2) };
    body.update(1 / 60, pose(1.6), null, far);
    const sleeve = body.getObjectByName('sleeve-right')!;
    const tip = new THREE.Vector3(0, 0, -1).applyQuaternion(sleeve.quaternion);
    // Nach rechts (+x) und nicht nach links — mehr verlangt der Test nicht,
    // weil dem Ärmel bewusst ein Stück Richtung nach außen beigemischt ist.
    expect(tip.x).toBeGreaterThan(0.3);
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
    expect(width).toBeGreaterThan(0.75);
    // **Der Kopf ist über die Hälfte so breit wie die Jacke**, und oben kragt
    // er über sie hinaus: Genau diese Einschnürung an der Schulter macht die
    // Vorbilder aus. Ein Kopf, der schmaler ist als der Kragen, versinkt
    // darin — so sah die erste Fassung von oben aus wie ein Kegel mit Knauf.
    expect(HEAD_RADIUS * 2).toBeGreaterThan(width * 0.5);
    expect(box.max.x * HEM).toBeLessThan(HEAD_RADIUS);
    body.dispose();
  });

  it('staucht ihn beim Ducken, statt ihn abheben zu lassen', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const tall = new THREE.Box3().setFromObject(torsoOf(body));
    body.update(1 / 60, pose(0.9), null, null);
    const ducked = new THREE.Box3().setFromObject(torsoOf(body));
    expect(ducked.max.y).toBeLessThan(tall.max.y - 0.6);
    // Der Boden bleibt der Boden: Jacke und Beine werden kürzer, die Sohle
    // bleibt, wo sie war.
    expect(ducked.min.y).toBeCloseTo(tall.min.y, 5);
    expect(ducked.min.y).toBeLessThan(0.05);
    // Und schmaler wird die Jacke dabei nicht.
    const duckedCoat = new THREE.Box3().setFromObject(coatOf(body));
    expect(duckedCoat.max.x - duckedCoat.min.x).toBeCloseTo(BODY_RADIUS * 2, 1);
    body.dispose();
  });

  it('setzt den Kopf hinter die Augen, aus denen die Pose kommt', () => {
    // Die Pose ist die Kamera, die Kugel hat ihren Mittelpunkt dahinter —
    // sonst stünde der halbe Kopf vor dem Gesicht in der Luft.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    expect(body.head.position.z).toBeGreaterThan(0.03);
    expect(body.head.position.y).toBeCloseTo(1.6, 5);
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
    expect(left.position.x).toBeLessThan(-BODY_RADIUS * 0.9);
    expect(right.position.x).toBeGreaterThan(BODY_RADIUS * 0.9);
    // … und **vor** ihm, nicht neben ihm: −z ist vorn, der Rumpf steht bei
    // z = 0 plus dem Versatz des Nackens.
    const torso = torsoOf(body).position.z;
    for (const hand of [left, right]) expect(hand.position.z).toBeLessThan(torso - 0.12);
    // Auf Bauchhöhe, nicht am Boden und nicht am Kinn.
    for (const hand of [left, right]) {
      expect(hand.position.y).toBeGreaterThan(0.55);
      expect(hand.position.y).toBeLessThan(1.1);
    }
    body.dispose();
  });

  it('folgt der getrackten Hand', () => {
    const body = new AvatarBody({ hands: true });
    const hand = { position: new THREE.Vector3(0.4, 1.1, -0.3) };
    body.update(1 / 60, pose(1.6), null, hand);
    expect(body.handAnchors[1].visible).toBe(true);
    expect(body.handAnchors[1].position.x).toBeCloseTo(0.4, 5);
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
