import * as THREE from 'three';
import { AvatarBody } from './AvatarBody';
import { BODY_KINDS, HEAD_KINDS } from './avatarLook';
import { HEADGEAR_KINDS } from './headgear';
import type { Appearance } from './appearance';

/**
 * Der Körper selbst ist Geometrie, und wie er aussieht, entscheidet kein Test.
 * Drei Sachen an ihm sind trotzdem Rechnung, und alle drei fielen schon einmal
 * auf: dass der Rumpf **unter** dem Kopf steht und beim Ducken mitgeht, dass
 * `setSelfView` genau das ausblendet, was man in den eigenen Augen nicht sehen
 * darf (und die Hände stehen lässt), und dass ein Wechsel des Aussehens nicht
 * jedes Mal einen zweiten Rumpf im Körper zurücklässt.
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

  it('stellt den Rumpf vom Boden bis unter den Kopf', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const box = new THREE.Box3().setFromObject(torsoOf(body));
    expect(box.min.y).toBeCloseTo(0, 2);
    expect(box.max.y).toBeGreaterThan(1.4);
    expect(box.max.y).toBeLessThan(1.6);
    // Eine halbe Kachel breit, wie im Plan.
    expect(box.max.x - box.min.x).toBeCloseTo(0.5, 1);
    body.dispose();
  });

  it('staucht ihn beim Ducken, statt ihn abheben zu lassen', () => {
    const body = new AvatarBody();
    body.update(1 / 60, pose(1.6), null, null);
    const tall = new THREE.Box3().setFromObject(torsoOf(body)).max.y;
    body.update(1 / 60, pose(0.9), null, null);
    const ducked = new THREE.Box3().setFromObject(torsoOf(body));
    expect(ducked.max.y).toBeLessThan(tall - 0.6);
    expect(ducked.min.y).toBeCloseTo(0, 2);
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

  it('lässt die Hände neben dem Rumpf schweben, wenn keine getrackt wird', () => {
    const body = new AvatarBody({ hands: true });
    body.update(1 / 60, pose(1.6), null, null);
    const [left, right] = body.handAnchors;
    // Der Anker sagt „diese Hand ist getrackt" — die Kugel schwebt trotzdem.
    expect(left.visible).toBe(false);
    expect(right.visible).toBe(false);
    expect(left.position.x).toBeLessThan(-0.25);
    expect(right.position.x).toBeGreaterThan(0.25);
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
