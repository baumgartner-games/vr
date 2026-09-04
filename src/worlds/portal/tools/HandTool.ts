import * as THREE from 'three';
import { Tool, type ToolHost } from './Tool';
import { readPose } from './toolPose';
import { GhostHand } from '../../../core/HandVisuals';
import { clonePose, defaultIdlePose, type HandPose } from '../../../core/handPose';
import { idleHandPose, onHandPoseChange, saveIdleHandPose } from '../../../core/handPoseStore';
import type { ControllerState, Handedness } from '../../../core/XRInput';

const _euler = new THREE.Euler();
const DEG = Math.PI / 180;

/**
 * Die Boxhand — als **Werkzeug**.
 *
 * Vorher stand sie als Geist auf einem Teller neben dem Justierstand, und
 * daneben hing ein eigener Knopf, ein eigener Zustand und eine eigene
 * Erklärung, wie man sie einmisst. Das war ein zweiter Weg zu derselben
 * Antwort: die Hand ist im Griff versetzt und verdreht, genau wie jedes
 * Werkzeug, also gehört sie **auch** in den Halter gelegt und **auch** so
 * gemessen wie eine Pistole. Ein Weg statt zwei, und der, den man schon kennt.
 *
 * Deshalb ist das hier ein ganz gewöhnliches Werkzeug mit zwei Besonderheiten:
 *
 * - Es **zielt nicht** (`alignToAim = false`). Ein Werkzeug hängt sonst im
 *   Zeigestrahl, weil es dorthin schießt, wohin man zeigt; eine Hand sitzt in
 *   der Faust und nirgends sonst. Damit ist die Lage dieses Werkzeugs im Griff
 *   dieselbe Zahlenreihe, mit der `HandVisuals` die Hand zeichnet.
 * - Was daran gemessen wird, landet nicht im Werkzeug-Speicher, sondern in der
 *   **Grundhaltung der Hand** (`core/handPoseStore.ts`) — dort, wo die
 *   gezeichnete Hand sie liest. Das Ding *ist* die Hand; eine zweite Kopie
 *   ihrer Zahlen wäre nur eine, die irgendwann abweicht.
 *
 * Gezeigt wird immer die Seite, die es gerade hält, in der Krümmung, die für
 * sie eingestellt ist — links liegt eine linke Hand in der Hand.
 */
export class HandTool extends Tool {
  override readonly toolId = 'hand-box';
  override readonly label = 'Boxhand';

  /** Welche der beiden gerade zu sehen ist. */
  private side: Handedness = 'right';
  private shape: GhostHand | null = null;
  private stale = false;
  private readonly unsubscribe: () => void;

  constructor() {
    super();
    this.name = 'tool-hand-box';
    this.icon = 'glove';
    this.accent = 0x9fe3ff;
    this.hint = 'In den Halter legen und die echte Hand danebenlegen';
    // Eine Hand zielt nicht: sie sitzt in der Faust, und genau das macht ihre
    // Lage im Griff mit der Handhaltung identisch.
    this.alignToAim = false;
    // Wer die Zahlen im Menü ändert, will die Finger sofort anders sehen.
    this.unsubscribe = onHandPoseChange(() => {
      this.stale = true;
    });
    this.build('right');
    // Ab Werk die **gebaute** Grundhaltung und nicht die gemessene: sonst wäre
    // „Lage in der Hand zurücksetzen" für dieses eine Werkzeug ein Knopf, der
    // nichts tut. Die eingestellte kommt, sobald eine Hand es nimmt.
    this.setHold(defaultIdlePose('right'));
  }

  override onTake(controller: ControllerState, _host: ToolHost): void {
    const side = controller.handedness ?? this.side;
    this.build(side);
    this.setHold(idleHandPose(side));
  }

  /**
   * Die gemessene Lage als Grundhaltung dieser Hand ablegen.
   *
   * Nur die sechs Zahlen: Krümmung und Spreizung sind keine Frage von „wo
   * liegt die Hand" und bleiben, wie sie eingestellt sind.
   */
  storeMeasured(hand: Handedness): HandPose {
    const readout = readPose({ position: this.holdPosition, rotation: this.holdRotation });
    const pose: HandPose = {
      ...clonePose(idleHandPose(hand)),
      x: readout.x,
      y: readout.y,
      z: readout.z,
      pitch: readout.pitch,
      yaw: readout.yaw,
      roll: readout.roll,
    };
    saveIdleHandPose(hand, pose);
    this.side = hand;
    this.stale = true;
    return pose;
  }

  override update(_dt: number, _host: ToolHost, _controller: ControllerState | null): void {
    if (!this.stale) return;
    this.build(this.side);
    this.setHold(idleHandPose(this.side));
  }

  override disposeTool(): void {
    this.unsubscribe();
    this.shape?.dispose();
    this.shape = null;
  }

  /** Die Hand neu bauen — Seite und Krümmung kommen aus dem Speicher. */
  private build(side: Handedness): void {
    this.stale = false;
    this.side = side;
    this.shape?.dispose();
    // Fest, nicht gläsern: das ist kein Geist, den man neben die eigene Hand
    // hält, sondern das Ding, das man justiert.
    this.shape = new GhostHand(side, idleHandPose(side), { color: 0x9fe3ff, opacity: 0.9 });
    this.add(this.shape);
  }

  /**
   * Die sechs Zahlen einer Haltung als Lage im Griff.
   *
   * Damit liegt die Boxhand, sobald man sie nimmt, genau dort, wo die
   * gezeichnete Hand liegt. Was man danach am Halter neu einmisst, ist der
   * Unterschied zwischen beidem.
   */
  private setHold(pose: HandPose): void {
    this.holdPosition.set(pose.x / 100, pose.y / 100, pose.z / 100);
    this.holdRotation.setFromEuler(
      _euler.set(pose.pitch * DEG, pose.yaw * DEG, pose.roll * DEG, 'XYZ'),
    );
  }
}
