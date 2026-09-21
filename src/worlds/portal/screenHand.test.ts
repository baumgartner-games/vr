import * as THREE from 'three';
import { AvatarBody } from '../../core/AvatarBody';
import { CHEF_EYE, CHEF_TOOL, POSE_SCALE } from '../../core/chefFit';
import { PlayerRig } from '../../core/PlayerRig';
import { ScreenHand } from './screenHand';

/**
 * **Das Werkzeug und die Faust darunter sind ein Paar.**
 *
 * Von oben hängt das Werkzeug am **Rig** (`ScreenHand`) und die Figur daneben
 * federt und atmet (`core/squish.ts`) — zwei Dinge, die nichts voneinander
 * wissen, und genau daran ist es einmal auseinandergelaufen: Die Pistole stand
 * ruhig in der Luft, während die Faust darunter bei jedem Schritt auf und ab
 * ging. Geprüft wird deshalb nicht „steht die Zahl da", sondern: liegen beide
 * auf **derselben** Höhe, egal wie hoch die Figur gerade steht.
 */
function rig(): PlayerRig {
  const renderer = { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer;
  const player = new PlayerRig(renderer, new THREE.PerspectiveCamera());
  player.camera.position.set(0, 1.6, 0);
  return player;
}

/** Die Pose des Kopfes, wie der Avatar sie vom Rig bekommt. */
function head(y: number): { position: THREE.Vector3; quaternion: THREE.Quaternion } {
  return { position: new THREE.Vector3(0, y, 0), quaternion: new THREE.Quaternion() };
}

/** Wo die rechte Faust der Figur landet, wenn sie diese Hand bekommt. */
function fistY(hand: ScreenHand): number {
  const body = new AvatarBody({ hands: true });
  body.update(1 / 60, head(1.6), null, { position: hand.at });
  const y = body.handAnchors[1].position.y;
  body.dispose();
  return y;
}

describe('das Werkzeug in der Bildschirmhand', () => {
  it('liegt ohne Stauchung genau an der gemessenen Stelle', () => {
    const hand = new ScreenHand(rig());
    hand.update();
    expect(hand.at.y).toBeCloseTo(1.6 + (CHEF_TOOL.y - CHEF_EYE) / POSE_SCALE, 6);
    expect(fistY(hand)).toBeCloseTo(CHEF_TOOL.y, 6);
    hand.dispose();
  });

  it('geht mit der Höhe der Figur auf und ab — und die Faust mit ihm', () => {
    const hand = new ScreenHand(rig());
    for (const stretch of [0.91, 1, 1.09]) {
      hand.update(stretch);
      // Die Faust der Figur landet genau dort, wo das Werkzeug hängt: Die
      // Hand ist die Umkehrung der Stauchung, die der Avatar rechnet.
      expect(fistY(hand)).toBeCloseTo(CHEF_TOOL.y * stretch, 6);
    }
    hand.dispose();
  });

  it('lässt die Waagerechte in Ruhe', () => {
    // Beim Strecken wird die Figur schmaler; ein Werkzeug, das dabei nach
    // innen rutschte, steckte im Ärmel.
    const hand = new ScreenHand(rig());
    hand.update(1.09);
    const { x, z } = hand.at;
    hand.update(0.91);
    expect(hand.at.x).toBeCloseTo(x, 10);
    expect(hand.at.z).toBeCloseTo(z, 10);
    hand.dispose();
  });
});
