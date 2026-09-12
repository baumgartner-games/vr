import * as THREE from 'three';
import { PlayerRig } from './PlayerRig';

/**
 * **Versetzt werden die Füße, nicht der Ursprung** (`PlayerRig.placeFeetAt`).
 *
 * In der Brille steht der Kopf dort, wo man im Spielraum gerade steht — selten
 * über dem Ursprung des Rigs. `placeAt` setzt den Ursprung; wer damit den
 * Spieler an einen Punkt bringen wollte, setzte ihn um den eigenen Abstand
 * daneben, beim Missionsstart in die Wand. Hier ein Kopf 1,4 m neben der Mitte.
 */
function rig(): PlayerRig {
  const renderer = { xr: { isPresenting: false } } as unknown as THREE.WebGLRenderer;
  return new PlayerRig(renderer, new THREE.PerspectiveCamera());
}

describe('PlayerRig.placeFeetAt', () => {
  it('bringt den Kopf über den Punkt, auch wenn er neben dem Ursprung steht', () => {
    const player = rig();
    player.camera.position.set(1.4, 1.65, 0.9);
    const head = new THREE.Vector3();
    player.placeAt(new THREE.Vector3(0, 0, -53.5), 0);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(1.4);
    expect(head.z).toBeCloseTo(-52.6);

    player.placeFeetAt(new THREE.Vector3(0, 0, -53.5), 0);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(0);
    expect(head.z).toBeCloseTo(-53.5);
    expect(head.y).toBeCloseTo(1.65);
    expect(player.getFloorY()).toBeCloseTo(0);
  });

  it('rechnet den Versatz nach dem Drehen — er dreht sich mit', () => {
    const player = rig();
    player.camera.position.set(1.4, 1.65, 0.9);
    const head = new THREE.Vector3();
    player.placeFeetAt(new THREE.Vector3(3, 0.25, 7), Math.PI / 2);
    player.getHeadPosition(head);
    expect(head.x).toBeCloseTo(3);
    expect(head.z).toBeCloseTo(7);
    expect(player.getFloorY()).toBeCloseTo(0.25);
    // Die Blickrichtung ist die gewünschte, nicht die alte.
    const forward = player.getHeadForward(new THREE.Vector3());
    expect(forward.x).toBeCloseTo(-1);
    expect(forward.z).toBeCloseTo(0);
  });

  it('ändert am Bildschirm nichts — dort sitzt die Kamera über dem Ursprung', () => {
    const player = rig();
    player.placeFeetAt(new THREE.Vector3(2, 0, -1), 0.3);
    expect(player.position.x).toBeCloseTo(2);
    expect(player.position.z).toBeCloseTo(-1);
  });
});
