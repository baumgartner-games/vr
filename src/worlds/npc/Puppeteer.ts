import * as THREE from 'three';
import type { Npc } from './Npc';
import type { NpcDirector } from './NpcDirector';
import {
  Recorder,
  isPlayable,
  poseAt,
  propPoseAt,
  type Placement,
  type PropSample,
  type PropTrack,
  type Recording,
} from './npcRecording';
import type { PhysicsBody, PhysicsWorld } from '../../physics/PhysicsWorld';

/**
 * **Der Puppenspieler** — wer einen NPC übernimmt, ihm eine Aktion vormacht
 * und sie ihn nachspielen lässt.
 *
 * Drei Zustände, und in jedem hängt höchstens **ein** NPC an den Fäden
 * (`Npc.possess`):
 *
 * - **übernommen**: Der NPC steht, wo der Spieler steht, und tut, was der
 *   Spieler tut — Füße, Gierwinkel, Kopf und Hände kommen jedes Bild von
 *   der Bühne (`PuppetStage.playerPose`). Läuft dabei eine **Aufnahme**,
 *   schreibt der `Recorder` mit, und mit ihm jedes Ding, das eine Hand
 *   anfasst.
 * - **spielend**: Der NPC geht die Aufnahme ab, und die Dinge darin gehen mit
 *   — kinematisch, wie in einer Hand (`PortalWorld.carryGrab`), denn was
 *   aufgezeichnet ist, soll genau so und nicht ungefähr so passieren. Am Ende
 *   werden sie wieder Körper und behalten den Schwung, mit dem sie zuletzt
 *   unterwegs waren: Eine Decke, die im letzten Bild noch fiel, fällt zu Ende.
 * - **frei**: Niemand hängt an Fäden; das Hirn des NPC rechnet wieder.
 *
 * Was die Welt hierfür hergibt, steht in `PuppetStage` — die Pose des
 * Spielers, die Dinge in seinen Händen, ein Ding nach seiner Id und die
 * Möglichkeit, eines nachzubauen. Die Welt kennt ihre Körper, der
 * Puppenspieler kennt die Aufnahme; keiner muss den anderen ganz sehen.
 *
 * **Der Charakter** ist dabei der NPC samt der Aktion, die er zuletzt gelernt
 * hat (`take`). Wer ihn speichert (`characterStore.ts`), speichert genau
 * das; wer ihn lädt, bekommt beides zurück (`adopt`).
 */

/** Ort und Drehung in der Welt — Speicher, den die Welt füllt. */
export interface StagePlacement {
  readonly position: THREE.Vector3;
  readonly quaternion: THREE.Quaternion;
}

/** Was die Welt je Bild über den Spieler weiß. Die Hände nur, wenn `…Tracked`. */
export interface StagePose {
  readonly feet: THREE.Vector3;
  yaw: number;
  readonly head: StagePlacement;
  readonly left: StagePlacement;
  readonly right: StagePlacement;
  leftTracked: boolean;
  rightTracked: boolean;
}

/** Ein Ding in einer Hand. */
export interface StageProp {
  id: string;
  kind: string;
  entry: PhysicsBody;
}

export interface PuppetStage {
  readonly physics: PhysicsWorld;
  /** Füllt die Pose des Spielers; `false`, wenn keiner da ist. */
  playerPose(out: StagePose): boolean;
  /** Was gerade in den Händen liegt — geleert und neu gefüllt. */
  heldProps(out: StageProp[]): StageProp[];
  /** Ein Ding nach seiner Id — `null`, wenn es weg ist; `held`, wenn eine Hand es hat. */
  propById(id: string): { entry: PhysicsBody; held: boolean } | null;
  /**
   * Baut ein Ding dieser Sorte an dieser Stelle nach — für eine Aufnahme aus
   * einer anderen Sitzung. `null`, wenn die Sorte hier nicht zu bauen ist.
   */
  spawnProp(
    kind: string,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
  ): { id: string; entry: PhysicsBody } | null;
  /** Ab jetzt steht der NPC, wo der Spieler steht. */
  onPossess(npc: Npc): void;
  /** Die Fäden sind durch — der Spieler ist wieder er selbst. */
  onRelease(npc: Npc): void;
  notify(message: string): void;
}

export type PuppetState = 'idle' | 'possessed' | 'playing';

/** Ein Ding, das beim Abspielen an den Fäden hängt. */
interface PlayingProp {
  track: PropTrack;
  entry: PhysicsBody;
}

interface Playback {
  recording: Recording;
  clock: number;
  props: PlayingProp[];
}

/** So weit vor dem Ende wird der Schwung eines Dings gemessen, in Sekunden. */
const SWING_WINDOW = 0.1;

export class Puppeteer {
  private npc: Npc | null = null;
  private recorder: Recorder | null = null;
  /** Was während der Aufnahme angefasst wurde: Id → Sorte. */
  private readonly touched = new Map<string, string>();
  private playback: Playback | null = null;
  /** Die Aktion, die der Charakter zuletzt gelernt hat. */
  private take: Recording | null = null;

  private readonly pose: StagePose = {
    feet: new THREE.Vector3(),
    yaw: 0,
    head: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    left: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    right: { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() },
    leftTracked: false,
    rightTracked: false,
  };
  private readonly held: StageProp[] = [];
  private readonly samples: PropSample[] = [];

  constructor(
    private readonly director: NpcDirector,
    private readonly stage: PuppetStage,
  ) {}

  /** Der NPC, um den es gerade geht — übernommen, spielend oder nur gemerkt. */
  get character(): Npc | null {
    return this.npc;
  }

  get state(): PuppetState {
    if (this.playback) return 'playing';
    if (this.npc?.puppeted) return 'possessed';
    return 'idle';
  }

  get recording(): boolean {
    return this.recorder !== null;
  }

  /** Sekunden seit Beginn der laufenden Aufnahme. */
  get recordElapsed(): number {
    return this.recorder?.elapsed ?? 0;
  }

  /** Die gelernte Aktion, wenn es eine gibt. */
  get action(): Recording | null {
    return this.take;
  }

  /** Wie weit das Abspielen ist, in Sekunden — 0, wenn nichts läuft. */
  get playClock(): number {
    return this.playback?.clock ?? 0;
  }

  /**
   * **Übernimmt** einen NPC. Was vorher an den Fäden hing, wird losgelassen;
   * eine Aufnahme, die dabei lief, ist damit zu Ende und wird behalten.
   */
  possess(npc: Npc): boolean {
    if (this.playback) this.stopPlaying();
    if (this.npc && this.npc !== npc) this.release();
    if (npc.puppeted) return true;
    if (!npc.possess()) return false;
    this.npc = npc;
    this.stage.onPossess(npc);
    return true;
  }

  /** Schneidet die Fäden durch. Der NPC bleibt der Charakter — bis ein anderer übernommen wird. */
  release(): Npc | null {
    const npc = this.npc;
    if (!npc || !npc.puppeted || this.playback) return null;
    if (this.recorder) this.stopRecording();
    npc.release();
    this.stage.onRelease(npc);
    return npc;
  }

  /** Nimmt auf, was der Spieler von jetzt an tut. Nur, während einer übernommen ist. */
  startRecording(): boolean {
    if (this.state !== 'possessed' || !this.npc) return false;
    if (this.recorder) return true;
    this.recorder = new Recorder(this.npc.skin.id);
    this.touched.clear();
    return true;
  }

  /** Beendet die Aufnahme; sie wird die Aktion des Charakters — wenn sie etwas enthält. */
  stopRecording(): Recording | null {
    const recorder = this.recorder;
    if (!recorder) return null;
    this.recorder = null;
    this.touched.clear();
    const recording = recorder.finish();
    if (!isPlayable(recording)) return null;
    this.take = recording;
    return recording;
  }

  /**
   * Gibt einem NPC eine Aktion, ohne dass sie hier aufgenommen wurde — ein
   * geladener Charakter. Was vorher an den Fäden hing, wird losgelassen.
   */
  adopt(npc: Npc, recording: Recording | null): void {
    if (this.playback) this.stopPlaying();
    if (this.npc && this.npc !== npc) this.release();
    this.npc = npc;
    this.take = recording;
  }

  /**
   * **Spielt** die Aktion ab — die gelernte oder eine mitgegebene. Ein
   * übernommener NPC wird dafür losgelassen; der Spieler steht dann daneben
   * und sieht zu.
   */
  play(recording: Recording | null = this.take): boolean {
    const npc = this.npc;
    if (!npc || !isPlayable(recording)) return false;
    if (this.playback) this.stopPlaying();
    if (npc.puppeted) this.release();
    if (!npc.possess()) return false;
    this.take = recording;
    this.playback = { recording, clock: 0, props: this.stageProps(recording) };
    this.step(0);
    return true;
  }

  /** Hält das Abspielen an, wo es gerade ist. Die Dinge werden wieder Körper. */
  stopPlaying(): void {
    const playback = this.playback;
    if (!playback) return;
    this.playback = null;
    for (const prop of playback.props) this.dropProp(prop, playback.clock);
    this.npc?.release();
  }

  /** Was gerade abgespielt wird — `null`, wenn nichts läuft. */
  get playing(): Recording | null {
    return this.playback?.recording ?? null;
  }

  /**
   * Ein Bild. `now` ist eine Uhr in Sekunden für die Aufnahme; `dt` treibt
   * das Abspielen. Gibt `true` zurück, wenn ein Abspielen in diesem Bild zu
   * Ende gegangen ist.
   */
  update(dt: number, now: number): boolean {
    const npc = this.npc;
    if (!npc) return false;
    // Weggeräumt, umgefallen oder entlassen — dann hängt hier nichts mehr.
    if (!this.director.crowd.includes(npc) || !npc.alive) {
      this.forget();
      return false;
    }
    if (this.playback) return this.step(dt);
    if (!npc.puppeted) return false;
    if (!this.stage.playerPose(this.pose)) return false;
    const pose = this.pose;
    npc.setPuppet({
      feet: pose.feet,
      yaw: pose.yaw,
      head: pose.head,
      left: pose.leftTracked ? pose.left.position : null,
      right: pose.rightTracked ? pose.right.position : null,
    });
    this.record(now);
    return false;
  }

  private record(now: number): void {
    const recorder = this.recorder;
    if (!recorder) return;
    if (recorder.full) {
      this.stage.notify('Aufnahme voll — gestoppt');
      this.stopRecording();
      return;
    }
    const held = this.stage.heldProps(this.held);
    for (const prop of held) this.touched.set(prop.id, prop.kind);
    this.samples.length = 0;
    for (const [id, kind] of this.touched) {
      const found = this.stage.propById(id);
      if (!found) continue;
      found.entry.object.getWorldPosition(_position);
      found.entry.object.getWorldQuaternion(_quaternion);
      this.samples.push({
        id,
        kind,
        held: found.held,
        position: _position.clone(),
        quaternion: _quaternion.clone(),
      });
    }
    const pose = this.pose;
    recorder.sample(
      now,
      {
        feet: pose.feet,
        yaw: pose.yaw,
        head: pose.head,
        left: pose.leftTracked ? pose.left : null,
        right: pose.rightTracked ? pose.right : null,
      },
      this.samples,
    );
  }

  /** Ein Bild Abspielen; `true`, wenn es damit zu Ende ist. */
  private step(dt: number): boolean {
    const playback = this.playback!;
    const npc = this.npc!;
    playback.clock += dt;
    const t = Math.min(playback.clock, playback.recording.duration);
    const at = poseAt(playback.recording, t);
    if (at) {
      const pose = this.pose;
      _feet.set(at.feet[0], at.feet[1], at.feet[2]);
      placementTo(at.head, pose.head);
      if (at.left) placementTo(at.left, pose.left);
      if (at.right) placementTo(at.right, pose.right);
      npc.setPuppet({
        feet: _feet,
        yaw: at.yaw,
        head: pose.head,
        left: at.left ? pose.left.position : null,
        right: at.right ? pose.right.position : null,
      });
    }
    for (const prop of playback.props) {
      const pose = propPoseAt(prop.track, t);
      if (!pose || prop.entry.removed) continue;
      placementTo(pose.pose, _buffer);
      prop.entry.body.setNextKinematicTranslation({
        x: _position.x,
        y: _position.y,
        z: _position.z,
      });
      prop.entry.body.setNextKinematicRotation({
        x: _quaternion.x,
        y: _quaternion.y,
        z: _quaternion.z,
        w: _quaternion.w,
      });
    }
    if (playback.clock < playback.recording.duration) return false;
    this.stopPlaying();
    return true;
  }

  /**
   * Die Dinge einer Aufnahme auf die Bühne holen: was es noch gibt, wird
   * genommen; was fehlt, wird nachgebaut, wo seine Spur beginnt; was gerade
   * in einer Hand liegt, bleibt dort — und die Spur läuft ohne es.
   */
  private stageProps(recording: Recording): PlayingProp[] {
    const props: PlayingProp[] = [];
    const { RigidBodyType } = this.stage.physics.rapier;
    for (const track of recording.props) {
      const first = track.frames[0];
      if (!first) continue;
      let entry: PhysicsBody | null = null;
      const found = this.stage.propById(track.id);
      if (found?.held) {
        this.stage.notify('Ein Ding der Aufnahme liegt in deiner Hand — es bleibt dort');
        continue;
      }
      if (found) entry = found.entry;
      else {
        placementTo(first.pose, _buffer);
        const spawned = this.stage.spawnProp(track.kind, _position, _quaternion);
        if (!spawned) {
          this.stage.notify('Ein Ding der Aufnahme lässt sich hier nicht nachbauen');
          continue;
        }
        entry = spawned.entry;
      }
      entry.body.setBodyType(RigidBodyType.KinematicPositionBased, true);
      this.stage.physics.setCarried(entry, true);
      props.push({ track, entry });
    }
    return props;
  }

  /** Wieder ein Körper — mit dem Schwung der letzten Bilder. */
  private dropProp(prop: PlayingProp, clock: number): void {
    if (prop.entry.removed) return;
    const { RigidBodyType } = this.stage.physics.rapier;
    this.stage.physics.setCarried(prop.entry, false);
    prop.entry.body.setBodyType(RigidBodyType.Dynamic, true);
    const end = Math.min(clock, prop.track.frames[prop.track.frames.length - 1]!.t);
    const before = propPoseAt(prop.track, end - SWING_WINDOW);
    const now = propPoseAt(prop.track, end);
    if (!before || !now) return;
    _velocity
      .set(now.pose[0] - before.pose[0], now.pose[1] - before.pose[1], now.pose[2] - before.pose[2])
      .divideScalar(SWING_WINDOW)
      .clampLength(0, 9);
    prop.entry.body.setLinvel({ x: _velocity.x, y: _velocity.y, z: _velocity.z }, true);
    prop.entry.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  /** Der NPC ist weg — alles, was an ihm hing, auch. */
  private forget(): void {
    if (this.playback) {
      const playback = this.playback;
      this.playback = null;
      for (const prop of playback.props) this.dropProp(prop, playback.clock);
    }
    this.recorder = null;
    this.touched.clear();
    if (this.npc?.puppeted) {
      this.npc.release();
      this.stage.onRelease(this.npc);
    }
    this.npc = null;
  }

  /** Lässt alles los — beim Verlassen der Welt. Die Aktion bleibt gemerkt. */
  dispose(): void {
    if (this.playback) this.stopPlaying();
    if (this.npc?.puppeted) this.release();
    this.npc = null;
  }
}

function placementTo(at: Placement, out: StagePlacement): void {
  out.position.set(at[0], at[1], at[2]);
  out.quaternion.set(at[3], at[4], at[5], at[6]);
}

const _feet = new THREE.Vector3();
const _position = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _buffer: StagePlacement = { position: _position, quaternion: _quaternion };
const _velocity = new THREE.Vector3();
