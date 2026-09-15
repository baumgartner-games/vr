import * as THREE from 'three';
import { AvatarBody } from './AvatarBody';
import { BODY_KINDS, BODY_RADIUS, HEAD_KINDS, HEAD_RADIUS } from './avatarLook';
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
function pose(y: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  return { position: new THREE.Vector3(0, y, 0), quaternion: new THREE.Quaternion() };
}

function torsoOf(body: AvatarBody): THREE.Object3D {
  return body.getObjectByName('avatar-torso')!;
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

  it('stellt den Rumpf knapp über dem Boden bis in den Kopf hinein', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const box = new THREE.Box3().setFromObject(torsoOf(body));
    // Unten rund und ein Fingerbreit über dem Boden — nicht schwebend, aber
    // auch nicht abgeschnitten.
    expect(box.min.y).toBeGreaterThan(0.02);
    expect(box.min.y).toBeLessThan(0.08);
    // Oben schließt die Schulter **über** der Kopfunterkante: Der Kopf sitzt
    // auf dem Rumpf, es gibt keinen Hals, an dem eine Lücke klaffen könnte.
    expect(box.max.y).toBeGreaterThan(1.6 - HEAD_RADIUS);
    expect(box.max.y).toBeLessThan(1.6);
    body.dispose();
  });

  it('ist breit genug, dass die Figur von oben gedrungen wirkt', () => {
    // Das Maß, an dem die erste Fassung scheiterte: eine Säule von einer
    // halben Kachel Breite über 1,7 m Höhe. Ein Koch ist eine Tonne.
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const box = new THREE.Box3().setFromObject(torsoOf(body));
    // Ein Vieleck aus 26 Seiten bleibt knapp unter dem Kreis, den es meint —
    // deshalb ein Fenster und keine Gleichheit.
    expect(box.max.x - box.min.x).toBeGreaterThan(BODY_RADIUS * 2 - 0.02);
    expect(box.max.x - box.min.x).toBeLessThanOrEqual(BODY_RADIUS * 2);
    expect(box.max.x - box.min.x).toBeGreaterThan(0.75);
    // Der Kopf ist fast so breit wie der Rumpf — das macht den Koch aus.
    expect(HEAD_RADIUS * 2).toBeGreaterThan((box.max.x - box.min.x) * 0.5);
    body.dispose();
  });

  it('staucht ihn beim Ducken, statt ihn abheben zu lassen', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const tall = new THREE.Box3().setFromObject(torsoOf(body));
    body.update(1 / 60, pose(0.9), null, null);
    const ducked = new THREE.Box3().setFromObject(torsoOf(body));
    expect(ducked.max.y).toBeLessThan(tall.max.y - 0.6);
    // Der Boden bleibt der Boden: Der Rumpf wird kürzer, er hebt nicht ab.
    expect(ducked.min.y).toBeLessThan(tall.min.y);
    expect(ducked.min.y).toBeLessThan(0.05);
    // Und schmaler wird er dabei nicht.
    expect(ducked.max.x - ducked.min.x).toBeCloseTo(tall.max.x - tall.min.x, 5);
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
    for (const hand of [left, right]) expect(hand.position.z).toBeLessThan(torso - 0.2);
    // Auf Brusthöhe, nicht am Boden und nicht am Kinn.
    for (const hand of [left, right]) {
      expect(hand.position.y).toBeGreaterThan(0.8);
      expect(hand.position.y).toBeLessThan(1.2);
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
