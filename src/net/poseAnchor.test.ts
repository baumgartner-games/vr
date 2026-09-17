import * as THREE from 'three';
import { NetSession } from './NetSession';
import type { NetMessage, NetTransport, NetTransportEvents, PeerPose, PoseArray } from './types';
import type { PlayerRig } from '../core/PlayerRig';
import type { XRInput } from '../core/XRInput';

/**
 * **Die angebundene Pose** (`NetSession.poseAnchor`).
 *
 * Im Konstrukt-Raum läuft man herum, während die anderen weiter die Figur vor
 * ihrem Schrank sehen sollen. Der Fehler, den diese Datei verhindert, ist
 * zweimal derselbe und nur von zwei Seiten: Entweder wandert die gesendete Pose
 * mit, dann läuft drüben jemand durch Wände — oder sie wird zu gründlich
 * festgehalten, dann steht dort eine Statue, die sich nicht mehr umsieht.
 *
 * Und die dritte Falle liegt im Augenblick des Anhängens: Wer den Versatz gegen
 * die falsche Quelle rechnet, lässt die Figur in dem Bild, in dem der Anker
 * gesetzt wird, um eine Augenhöhe sacken. Deshalb steht hier vor allen
 * Bewegungen der Fall, in dem sich **nichts** ändern darf.
 */
class Loopback implements NetTransport {
  readonly kind = 'test';
  readonly sent: NetMessage[] = [];

  async connect(room: string, events: NetTransportEvents): Promise<void> {
    void room;
    void events;
  }

  send(message: NetMessage): void {
    this.sent.push(message);
  }

  close(): void {}
}

/**
 * Ein Gestell, das nur kann, was `update` von ihm verlangt — aber mit dem einen
 * Zug, auf den es hier ankommt: Der Kopf hängt eine **Augenhöhe** über den
 * Füßen, so wie die Kamera im echten `PlayerRig`. Ohne diesen Abstand wären
 * Rig-Position und Kopfposition dasselbe, und der Test könnte gar nicht mehr
 * bemerken, gegen welche der beiden der Versatz gerechnet wird.
 */
class Rig extends THREE.Group {
  readonly head = new THREE.Object3D();

  constructor() {
    super();
    this.head.position.y = 1.6;
    this.add(this.head);
  }

  getHeadMatrix(target: THREE.Matrix4): THREE.Matrix4 {
    this.updateMatrixWorld(true);
    return target.copy(this.head.matrixWorld);
  }

  /** Wo der Kopf gerade steht — daraus wird der Anker gesetzt. */
  headPosition(): THREE.Vector3 {
    this.updateMatrixWorld(true);
    return this.head.getWorldPosition(new THREE.Vector3());
  }
}

/** Zwei Griffe, von denen jeder fehlen darf. */
class Input {
  left: THREE.Object3D | null = null;
  right: THREE.Object3D | null = null;

  get(handedness: 'left' | 'right'): { grip: THREE.Object3D } | null {
    const grip = handedness === 'left' ? this.left : this.right;
    return grip ? { grip } : null;
  }
}

/** Ein Bild lang senden. `dt` ist großzügig, damit die Pose sicher hinausgeht. */
function tick(net: NetSession, rig: Rig, input: Input): void {
  net.update(1, rig as unknown as PlayerRig, input as unknown as XRInput, 0);
}

function lastPose(link: Loopback): PeerPose {
  for (let i = link.sent.length - 1; i >= 0; i--) {
    const message = link.sent[i]!;
    if (message.type === 'pose') return message.pose;
  }
  throw new Error('Es wurde gar keine Pose gesendet.');
}

/** Dieselbe Rundung wie in `NetSession` — sonst vergleicht man Fließkommastaub. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function turned(object: THREE.Object3D): number[] {
  const { x, y, z, w } = object.getWorldQuaternion(new THREE.Quaternion());
  return [round(x), round(y), round(z), round(w)];
}

function hand(x: number, y: number, z: number): THREE.Object3D {
  const grip = new THREE.Object3D();
  grip.position.set(x, y, z);
  return grip;
}

async function session(): Promise<{ net: NetSession; link: Loopback; rig: Rig; input: Input }> {
  const net = new NetSession();
  const link = new Loopback();
  await net.connect(link, 'raum');
  const rig = new Rig();
  rig.position.set(2, 0, -3);
  rig.head.rotation.y = Math.PI / 3;
  return { net, link, rig, input: new Input() };
}

describe('die an eine Ankerstelle gebundene Pose', () => {
  it('reicht ohne Anker die Pose unverändert durch', async () => {
    const { net, link, rig, input } = await session();
    input.left = hand(1.7, 1.2, -2.8);
    tick(net, rig, input);

    const pose = lastPose(link);
    expect(pose.head).toEqual([2, 1.6, -3, ...turned(rig.head)]);
    expect(pose.left).toEqual([1.7, 1.2, -2.8, 0, 0, 0, 1]);

    // Und sie läuft weiter mit, wie sie es immer tat.
    rig.position.set(4, 0, -3);
    tick(net, rig, input);
    expect(lastPose(link).head.slice(0, 3)).toEqual([4, 1.6, -3]);
  });

  it('ändert nichts, wenn der Anker dort steht, wo man gerade steht', async () => {
    // Der Augenblick des Betretens: Gerechnet wird gegen die Kopfmatrix, also
    // hebt ein Anker auf der Kopfposition sich exakt auf. Gegen `rig.position`
    // gerechnet fehlte hier eine Augenhöhe.
    const { net, link, rig, input } = await session();
    input.right = hand(2.4, 1.1, -3.2);
    tick(net, rig, input);
    const vorher = lastPose(link);

    net.poseAnchor = rig.headPosition();
    tick(net, rig, input);

    expect(lastPose(link)).toEqual(vorher);
  });

  it('lässt den Kopf an der Ankerstelle, während das Gestell davonläuft', async () => {
    const { net, link, rig, input } = await session();
    net.poseAnchor = rig.headPosition();

    rig.position.set(7.25, 0, 1.5);
    // Im Konstrukt sieht sie sich um — und genau das sollen die anderen sehen,
    // statt einer Statue.
    rig.head.rotation.y = -Math.PI / 4;
    tick(net, rig, input);

    const head = lastPose(link).head;
    expect(head.slice(0, 3)).toEqual([2, 1.6, -3]);
    expect(head.slice(3)).toEqual(turned(rig.head));
  });

  it('nimmt die Hände um denselben Versatz mit und kommt ohne sie aus', async () => {
    const { net, link, rig, input } = await session();
    net.poseAnchor = rig.headPosition();

    // Beide Hände eine Armlänge neben dem Kopf, dann geht das Gestell.
    input.left = hand(1.7, 1.2, -2.8);
    input.right = hand(2.4, 1.1, -3.2);
    const abstand = (pose: PoseArray) => [
      round(pose[0] - 2),
      round(pose[1] - 1.6),
      round(pose[2] + 3),
    ];

    rig.position.set(7.25, 0, 1.5);
    input.left.position.set(6.95, 1.2, 1.7);
    input.right.position.set(7.65, 1.1, 1.3);
    tick(net, rig, input);

    const pose = lastPose(link);
    // Der Abstand zum Kopf ist derselbe wie vorher — die Figur greift neben
    // sich und nicht irgendwohin.
    expect(abstand(pose.left!)).toEqual([-0.3, -0.4, 0.2]);
    expect(abstand(pose.right!)).toEqual([0.4, -0.5, -0.2]);

    // Und eine Hand, die es gerade nicht gibt, bleibt schlicht keine.
    input.left = null;
    tick(net, rig, input);
    expect(lastPose(link).left).toBeNull();
    expect(lastPose(link).right).not.toBeNull();
  });
});
