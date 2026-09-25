import * as THREE from 'three';
import type { NetSession } from '../../net/NetSession';
import type { PhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';
import { PortalSync } from './PortalSync';

/**
 * **Was jedes Gerät selbst aufstellt, geht nicht über die Leitung**
 * (`PortalSyncOptions.local`) — die Wände, die eine Welt aus ihrem Bauplan
 * baut (`PortalWorld.placeModel`). Angesagt und mitgeschickt baute jedes
 * weitere Gerät sie auf allen anderen noch einmal auf: zu zweit 676 statt 338
 * Wände in Haunting.
 */

interface Sent {
  t: string;
  items?: Array<[string, ...number[]]>;
  state?: { bodies: Array<[string, ...number[]]> };
}

const KINEMATIC = 2;

function body(): PhysicsBody & { type: number } {
  const entry = {
    type: 0,
    object: new THREE.Object3D(),
    previousPosition: new THREE.Vector3(),
    body: {
      translation: () => ({ x: 1, y: 2, z: 3 }),
      rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }),
      setBodyType: (type: number) => {
        entry.type = type;
      },
    },
  };
  return entry as unknown as PhysicsBody & { type: number };
}

/** Zwei Geräte in derselben Welt; `hostHere` sagt, wer rechnet. */
function session(hostHere: boolean): { net: NetSession; sent: Sent[] } {
  const sent: Sent[] = [];
  const peer = { id: 'b', world: 'haunting' };
  const net = {
    localId: 'a',
    world: 'haunting',
    connected: true,
    localSeniority: hostHere ? 100 : 1,
    peers: new Map([['b', peer]]),
    seniorityOf: () => (hostHere ? 1 : 100),
    on: () => () => {},
    emit: (_channel: string, message: Sent) => sent.push(message),
  };
  return { net: net as unknown as NetSession, sent };
}

function sync(net: NetSession, bodies: Map<string, PhysicsBody>): PortalSync {
  return new PortalSync({
    net,
    physics: {
      rapier: { RigidBodyType: { Dynamic: 0, Fixed: 1, KinematicPositionBased: KINEMATIC } },
    } as unknown as PhysicsWorld,
    bodies,
    local: (id) => id.startsWith('wall-'),
    heldLocally: () => false,
    dropLocal: () => {},
    spawnRemote: () => {},
    despawnRemote: () => {},
    applyPortal: () => {},
    portalState: () => null,
    spawnedProps: () => [],
    resetRemote: () => {},
    paintRemote: () => {},
    popRemote: () => {},
    onHands: () => {},
  });
}

describe('PortalSync und die Stücke der Welt', () => {
  it('schickt sie weder im Schnappschuss noch als Bewegung', () => {
    const { net, sent } = session(true);
    const bodies = new Map<string, PhysicsBody>([
      ['wall-1', body()],
      ['a-1', body()],
    ]);
    sync(net, bodies).update(0.1);
    const state = sent.find((message) => message.t === 'state');
    const moves = sent.find((message) => message.t === 'move');
    expect(state?.state?.bodies.map(([id]) => id)).toEqual(['a-1']);
    expect(moves?.items?.map(([id]) => id)).toEqual(['a-1']);
  });

  it('lässt sie beim Mitspieler fest stehen, statt fremden Posen zu folgen', () => {
    const { net } = session(false);
    const wall = body();
    const cube = body();
    const bodies = new Map<string, PhysicsBody>([
      ['wall-1', wall],
      ['b-1', cube],
    ]);
    sync(net, bodies).update(0.1);
    expect(cube.type).toBe(KINEMATIC);
    expect(wall.type).toBe(0);
  });
});
