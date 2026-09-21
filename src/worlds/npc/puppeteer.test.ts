import * as THREE from 'three';
import { PhysicsWorld, type PhysicsBody } from '../../physics/PhysicsWorld';
import { NpcDirector } from './NpcDirector';
import { Puppeteer, type PuppetStage, type StagePose, type StageProp } from './Puppeteer';
import { Recorder, type Recording } from './npcRecording';

/**
 * **Übernehmen, vormachen, nachspielen** — mit echter Physik, weil ein NPC
 * an den Fäden ein kinematischer Körper ist und eine Attrappe davon etwas
 * anderes prüfte als das, was läuft (siehe `jest.config.cjs`).
 *
 * Drei Dinge müssen stimmen: Ein übernommener NPC steht, wo der Spieler
 * steht; eine Aufnahme davon spielt er hinterher allein ab, samt dem Ding,
 * das dabei in der Hand lag; und was er aus einer fremden Sitzung lernt,
 * wird nachgebaut, wo seine Spur beginnt.
 */

const DT = 1 / 60;

interface Stage {
  director: NpcDirector;
  puppeteer: Puppeteer;
  physics: PhysicsWorld;
  player: StagePose;
  held: StageProp[];
  props: Map<string, PhysicsBody>;
  spawned: string[];
  said: string[];
  possessed: string[];
  run: (seconds: number) => void;
  prop: (id: string, at: THREE.Vector3) => PhysicsBody;
}

async function stage(): Promise<Stage> {
  const physics = await PhysicsWorld.create(-9.81);
  const root = new THREE.Group();
  const said: string[] = [];
  const possessed: string[] = [];
  const spawned: string[] = [];
  const props = new Map<string, PhysicsBody>();
  const held: StageProp[] = [];
  const player: StagePose = {
    feet: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    head: { position: new THREE.Vector3(0, 1.6, 0), quaternion: new THREE.Quaternion() },
    left: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    right: { position: new THREE.Vector3(0.3, 1, -0.3), quaternion: new THREE.Quaternion() },
    leftTracked: false,
    rightTracked: true,
  };
  // Ein Boden, damit ein losgelassener NPC nicht ins Bodenlose fällt.
  const floor = new THREE.Mesh(new THREE.BoxGeometry(40, 1, 40));
  floor.position.y = -0.5;
  root.add(floor);
  floor.updateWorldMatrix(true, false);
  physics.addStatic(floor);

  const director = new NpcDirector({
    root,
    physics,
    playerAt: (target) => target.copy(player.feet),
    strikePlayer: () => undefined,
    notify: (message) => said.push(message),
  });
  const prop = (id: string, at: THREE.Vector3): PhysicsBody => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.06, 0.3));
    mesh.position.copy(at);
    root.add(mesh);
    mesh.updateWorldMatrix(true, false);
    const entry = physics.addDynamic(mesh, { mass: 1 });
    props.set(id, entry);
    return entry;
  };
  const stageApi: PuppetStage = {
    physics,
    playerPose: (out) => {
      out.feet.copy(player.feet);
      out.yaw = player.yaw;
      out.head.position.copy(player.head.position);
      out.head.quaternion.copy(player.head.quaternion);
      out.right.position.copy(player.right.position);
      out.rightTracked = player.rightTracked;
      out.leftTracked = false;
      return true;
    },
    heldProps: (out) => {
      out.length = 0;
      out.push(...held);
      return out;
    },
    propById: (id) => {
      const entry = props.get(id);
      if (!entry || entry.removed) return null;
      return { entry, held: held.some((item) => item.id === id) };
    },
    spawnProp: (kind, position) => {
      if (kind !== 'blanket') return null;
      const id = `spawned-${spawned.length}`;
      spawned.push(id);
      return { id, entry: prop(id, position) };
    },
    onPossess: (npc) => possessed.push(`+${npc.skin.id}`),
    onRelease: (npc) => possessed.push(`-${npc.skin.id}`),
    notify: (message) => said.push(message),
  };
  const puppeteer = new Puppeteer(director, stageApi);
  let clock = 0;
  return {
    director,
    puppeteer,
    physics,
    player,
    held,
    props,
    spawned,
    said,
    possessed,
    prop,
    run: (seconds: number) => {
      for (let frame = 0; frame < Math.round(seconds / DT); frame++) {
        clock += DT;
        puppeteer.update(DT, clock);
        director.update(DT);
        physics.step(DT);
        physics.sync();
      }
    },
  };
}

function feetOf(npc: { feet(target: THREE.Vector3): THREE.Vector3 }): THREE.Vector3 {
  return npc.feet(new THREE.Vector3());
}

describe('Ein übernommener NPC', () => {
  it('steht, wo der Spieler steht, und denkt danach wieder selbst', async () => {
    const s = await stage();
    const npc = s.director.spawn({
      kind: 'dummy',
      brain: 'idle',
      at: new THREE.Vector3(3, 0, 3),
    })!;
    expect(s.puppeteer.possess(npc)).toBe(true);
    expect(s.puppeteer.state).toBe('possessed');
    expect(npc.puppeted).toBe(true);
    expect(s.possessed).toEqual(['+dummy']);

    s.player.feet.set(1, 0, -2);
    s.player.yaw = 1.2;
    s.run(0.2);
    const feet = feetOf(npc);
    expect(feet.x).toBeCloseTo(1, 1);
    expect(feet.z).toBeCloseTo(-2, 1);
    expect(npc.heading).toBeCloseTo(1.2);
    expect(npc.model.puppet?.right).not.toBeNull();

    expect(s.puppeteer.release()).toBe(npc);
    expect(s.puppeteer.state).toBe('idle');
    expect(npc.puppeted).toBe(false);
    expect(s.possessed).toEqual(['+dummy', '-dummy']);
    // Wieder ein Körper: Er bleibt stehen, wo die Fäden ihn ließen, und fällt
    // nicht durch den Boden.
    s.player.feet.set(8, 0, 8);
    s.run(1);
    const after = feetOf(npc);
    expect(after.x).toBeCloseTo(1, 0);
    expect(after.y).toBeGreaterThan(-0.2);
  });

  it('lässt sich nicht übernehmen, wenn er liegt', async () => {
    const s = await stage();
    const npc = s.director.spawn({ kind: 'hamster', brain: 'idle', at: new THREE.Vector3() })!;
    npc.damage(1000);
    expect(s.puppeteer.possess(npc)).toBe(false);
    expect(s.puppeteer.state).toBe('idle');
  });
});

describe('Eine Aufnahme', () => {
  it('spielt der NPC danach allein ab — mit dem Ding aus seiner Hand', async () => {
    const s = await stage();
    const npc = s.director.spawn({ kind: 'dummy', brain: 'idle', at: new THREE.Vector3() })!;
    const blanket = s.prop('blanket-1', new THREE.Vector3(0.3, 1, -0.3));
    s.puppeteer.possess(npc);
    expect(s.puppeteer.startRecording()).toBe(true);
    expect(s.puppeteer.recording).toBe(true);

    // Der Spieler geht zwei Meter nach vorn und trägt die Decke dabei mit.
    s.held.push({ id: 'blanket-1', kind: 'blanket', entry: blanket });
    const { RigidBodyType } = s.physics.rapier;
    blanket.body.setBodyType(RigidBodyType.KinematicPositionBased, true);
    for (let i = 0; i < 60; i++) {
      s.player.feet.z = -2 * (i / 60);
      blanket.body.setNextKinematicTranslation({ x: 0.3, y: 1, z: -0.3 - 2 * (i / 60) });
      s.run(DT);
    }
    // Losgelassen: Die Decke bleibt liegen, wo die Hand sie ließ.
    s.held.length = 0;
    blanket.body.setBodyType(RigidBodyType.Dynamic, true);
    s.run(0.5);

    const recording = s.puppeteer.stopRecording()!;
    expect(recording).not.toBeNull();
    expect(recording.kind).toBe('dummy');
    expect(recording.duration).toBeGreaterThan(1.2);
    expect(recording.props).toHaveLength(1);
    expect(recording.props[0]!.kind).toBe('blanket');
    expect(recording.props[0]!.frames.some((frame) => frame.held)).toBe(true);
    expect(recording.props[0]!.frames.some((frame) => !frame.held)).toBe(true);

    // Zurück an den Anfang — und dann macht er es allein.
    s.puppeteer.release();
    s.player.feet.set(5, 0, 5);
    blanket.body.setTranslation({ x: 0.3, y: 1, z: -0.3 }, true);
    expect(s.puppeteer.play()).toBe(true);
    expect(s.puppeteer.state).toBe('playing');
    s.run(0.5);
    const midway = feetOf(npc);
    expect(midway.z).toBeLessThan(-0.5);
    expect(midway.z).toBeGreaterThan(-1.5);
    expect(blanket.object.position.z).toBeCloseTo(midway.z - 0.3, 0);

    s.run(recording.duration);
    expect(s.puppeteer.state).toBe('idle');
    expect(npc.puppeted).toBe(false);
    // Die Decke ist wieder ein Körper — und liegt, wo die Aufnahme sie ließ:
    // vorn, nicht mehr in der Hand, auf dem Boden.
    expect(blanket.body.bodyType()).toBe(RigidBodyType.Dynamic);
    const frames = recording.props[0]!.frames;
    const last = frames[frames.length - 1]!.pose;
    expect(blanket.object.position.z).toBeCloseTo(last[2], 0);
    expect(blanket.object.position.y).toBeLessThan(0.3);
  });

  it('baut ein fehlendes Ding nach, wo seine Spur beginnt', async () => {
    const s = await stage();
    const npc = s.director.spawn({ kind: 'dummy', brain: 'idle', at: new THREE.Vector3() })!;
    // Eine Aufnahme aus einer anderen Sitzung: Ids, die es hier nicht gibt.
    const recorder = new Recorder('dummy');
    const identity = { x: 0, y: 0, z: 0, w: 1 };
    for (let i = 0; i <= 20; i++) {
      const t = i / 10;
      recorder.sample(
        t,
        {
          feet: { x: t, y: 0, z: 0 },
          yaw: 0,
          head: { position: { x: t, y: 1.6, z: 0 }, quaternion: identity },
          left: null,
          right: null,
        },
        [
          {
            id: 'fremd-1',
            kind: 'blanket',
            held: true,
            position: { x: t + 0.4, y: 0.9, z: 0 },
            quaternion: identity,
          },
          {
            id: 'fremd-2',
            kind: 'model:kaykit/irgendwas.glb',
            held: false,
            position: { x: 0, y: 0.5, z: 2 },
            quaternion: identity,
          },
        ],
      );
    }
    const foreign: Recording = recorder.finish();
    s.puppeteer.adopt(npc, foreign);
    expect(s.puppeteer.play()).toBe(true);
    expect(s.spawned).toEqual(['spawned-0']);
    expect(s.said.some((line) => line.includes('nicht nachbauen'))).toBe(true);
    s.run(1);
    const copy = s.props.get('spawned-0')!;
    expect(copy.object.position.x).toBeCloseTo(1.4, 0);
    s.run(2);
    expect(s.puppeteer.state).toBe('idle');
  });

  it('endet, wenn der NPC weggeräumt wird', async () => {
    const s = await stage();
    const npc = s.director.spawn({ kind: 'zombie', brain: 'idle', at: new THREE.Vector3() })!;
    s.puppeteer.possess(npc);
    s.puppeteer.startRecording();
    s.run(0.3);
    s.director.clear();
    s.run(0.1);
    expect(s.puppeteer.state).toBe('idle');
    expect(s.puppeteer.recording).toBe(false);
    expect(s.puppeteer.character).toBeNull();
  });
});
