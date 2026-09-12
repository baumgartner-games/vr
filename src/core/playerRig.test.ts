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

/**
 * **Wer sitzt, steht trotzdem auf dem Boden** (`PlayerRig.placeAt`).
 *
 * Die Sitz-Anhebung schiebt das Rig nach oben und lässt die Füße stehen
 * (`updateSeatLift`, `getFloorY`). `placeAt` rechnete nur das Ducken heraus
 * und nicht die Anhebung: Ein sitzender Spieler landete bei jedem Versetzen
 * um seine ganze Anhebung **unter** dem Punkt — nach dem Schutzschrank, beim
 * Rundenstart, und auch der Rettungsknopf setzte ihn wieder genauso tief.
 */
describe('PlayerRig.placeAt im Sitzen', () => {
  function seated(): PlayerRig {
    const player = rig();
    player.posture = 'sit';
    player.seatHeight = 0.4;
    player.camera.position.set(0, 1.2, 0);
    // Ein langes Bild in der Brille: die Anhebung ist danach vollständig da.
    const input = { get: () => undefined } as unknown as Parameters<PlayerRig['update']>[1];
    player.update(1, input, true);
    expect(player.seated).toBeCloseTo(0.4);
    return player;
  }

  it('setzt die Füße auf den Punkt und nicht die Anhebung darunter', () => {
    const player = seated();
    player.placeAt(new THREE.Vector3(2, 0.3, -4), 0);
    expect(player.getFloorY()).toBeCloseTo(0.3);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.y).toBeCloseTo(0.3 + 1.2 + 0.4);
  });

  it('gilt genauso für die Füße unter dem Kopf', () => {
    const player = seated();
    player.camera.position.set(0.8, 1.2, -0.5);
    player.placeFeetAt(new THREE.Vector3(-3, 0, 6), 1);
    expect(player.getFloorY()).toBeCloseTo(0);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.x).toBeCloseTo(-3);
    expect(head.z).toBeCloseTo(6);
    expect(head.y).toBeCloseTo(1.6);
  });
});

/**
 * **Der Kopf schaut hin, nicht das Rig** (`PlayerRig.turnHeadTo`).
 *
 * In der Brille legt das Headset seine Drehung auf die des Rigs; ein Rig, das
 * nach Norden zeigt, heißt nicht, dass der Spieler nach Norden schaut. Hier
 * trägt die Kamera eine eigene Drehung — so wie ein Kopf, der im Spielraum
 * nach links gedreht ist — und der Spieler soll trotzdem in eine bestimmte
 * Richtung sehen, ohne dass sein Kopf dabei von der Stelle geht.
 */
describe('PlayerRig.turnHeadTo', () => {
  it('dreht um den Kopf, bis der Kopf in die Richtung schaut', () => {
    const player = rig();
    player.camera.position.set(0.6, 1.65, -0.3);
    player.camera.rotation.y = 0.7;
    player.placeFeetAt(new THREE.Vector3(4, 0, 9), Math.PI);
    const before = player.getHeadForward(new THREE.Vector3());
    // Das Rig zeigt nach Süden, der Kopf um 0,7 rad daran vorbei.
    expect(Math.atan2(-before.x, -before.z)).toBeCloseTo(Math.PI + 0.7 - 2 * Math.PI);

    player.turnHeadTo(Math.PI);
    const forward = player.getHeadForward(new THREE.Vector3());
    expect(forward.x).toBeCloseTo(0);
    expect(forward.z).toBeCloseTo(1);
    const head = player.getHeadPosition(new THREE.Vector3());
    expect(head.x).toBeCloseTo(4);
    expect(head.z).toBeCloseTo(9);
  });

  it('ist am Bildschirm ein Nichts — dort dreht sich die Kamera nicht selbst', () => {
    const player = rig();
    player.placeFeetAt(new THREE.Vector3(0, 0, 0), 0.4);
    player.turnHeadTo(0.4);
    expect(new THREE.Euler().setFromQuaternion(player.quaternion, 'YXZ').y).toBeCloseTo(0.4);
  });
});
