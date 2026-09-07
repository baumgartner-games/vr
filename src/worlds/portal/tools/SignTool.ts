import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { SignBoard } from '../../signs/SignBoard';
import { EMPTY_SIGN_TEXT, type SignControl } from '../../signs/SignRoom';
import { clampSign, type SignSettings } from '../../signs/signSettings';
import { signSummary } from '../../signs/signMarkup';
import { signTemplate } from '../../signs/signStore';
import { playPick, playTone } from '../../../core/Audio';
import { GRAB_TINT } from '../../../core/colors';
import type { ControllerState, Handedness } from '../../../core/XRInput';

/**
 * **Das Schild** — das Werkzeug, mit dem man etwas aufschreibt und hinstellt.
 *
 * Es ist das Gegenstück zur Staffelei: Die stellt eine Fläche zum *Malen* hin,
 * dieses hier eine zum *Lesen*. Und es ist das Werkzeug, das eine Lobby
 * braucht — was ein Raum an Absprachen, Regeln und Plänen mit sich trägt,
 * steht sonst im Chat und ist nach dem dritten Beitritt weggescrollt. Ein
 * Schild an der Wand bleibt hängen, für alle, auch für die, die später kommen
 * (`worlds/signs/SignRoom.ts`).
 *
 * In der Hand ist es eine kleine Tafel auf einem Griff, und auf dieser Tafel
 * steht schon das, was gleich aufgestellt wird — man trägt seinen Entwurf mit
 * sich herum.
 *
 * - **Trigger** stellt es hin: auf den Boden kommt es auf einen Pfosten, an
 *   eine Wand flach darauf. Wohin es käme, zeigt ein Umriss in Schildgröße.
 * - **A/X** beschriftet. Zeigt man dabei auf ein aufgestelltes Schild, wird
 *   dieses beschriftet; sonst der Entwurf in der Hand. Getippt wird auf der
 *   Tastatur der Welt — in der Brille auf Wunsch mit der des Geräts
 *   (`core/systemKeyboard.ts`).
 * - **Greifen an einem der Traggriffe** eines aufgestellten Schildes nimmt es
 *   wieder auf; sein Text liegt dann als Entwurf in der Hand, und der nächste
 *   Trigger stellt es woanders hin.
 *
 * Wie es aussieht — Schriftgröße, Farben, Markdown, automatisches Rollen —
 * steht im Menü unter dem Werkzeug. Geändert wird damit immer beides: das
 * Schild, vor dem man steht, und die Vorlage für das nächste.
 */

/** Wie weit man ein Schild hinstellen kann, in Metern. */
const RANGE = 12;
/** Flacher als das ist Boden, steiler als das ist Wand. */
const FLOOR_NORMAL = 0.75;
const WALL_NORMAL = 0.55;
/** Die Tafel in der Hand — klein genug, um daran vorbeizusehen. */
const HEAD_W = 0.26;
const HEAD_H = 0.18;

const _tip = new THREE.Vector3();
const _direction = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _head = new THREE.Vector3();
const _hand = new THREE.Vector3();
const _forward = new THREE.Vector3(0, 0, 1);
const _up = new THREE.Vector3(0, 0, 1);

interface Draft {
  text: string;
  settings: SignSettings;
}

export class SignTool extends Tool {
  override readonly toolId = 'sign';
  override readonly label = 'Schild';

  /** Der Entwurf, der gerade in der Hand liegt. */
  private draft: Draft;
  /** Die Tafel am Werkzeug, die ihn zeigt. */
  private readonly headBoard: SignBoard;
  /** Der Umriss, der zeigt, wohin das Schild käme. */
  private readonly ghost: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private readonly ring: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  /** Wohin es diese Frame käme — der Trigger liest nur das hier. */
  private target: { point: THREE.Vector3; normal: THREE.Vector3; wall: boolean } | null = null;
  private readonly spot = new THREE.Vector3();
  private readonly spotNormal = new THREE.Vector3();

  constructor() {
    super();
    this.name = 'tool-sign';
    this.icon = 'sign';
    this.accent = 0x9fd0ff;
    this.hint = 'Trigger stellt es hin · A/X beschriftet · Griffe nehmen es wieder auf';

    // Derselbe Griff wie an allen anderen: ein Schild trägt man am Stiel.
    this.mountGrip();

    this.draft = { text: EMPTY_SIGN_TEXT, settings: signTemplate() };
    this.headBoard = new SignBoard({
      text: this.draft.text,
      settings: this.headSettings(),
      mount: 'wall',
    });
    // Etwas über dem Griff und zurückgelehnt: Der Entwurf soll lesbar sein,
    // während die Hand das Werkzeug hält, und nicht senkrecht ins Blickfeld
    // ragen.
    this.headBoard.position.set(0, 0.2, 0.02);
    this.headBoard.rotation.x = -0.42;
    this.add(this.headBoard);

    // Der Umriss: eine Fläche in Schildgröße, halbdurchsichtig, plus ein Ring
    // am Boden für den Pfosten. Beide gehören der Welt, nicht dem Werkzeug —
    // sie liegen dort, wo gezielt wird, und nicht in der Hand.
    this.ghost = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.ghost.name = 'sign-ghost';
    this.ghost.visible = false;

    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.16, 0.21, 32),
      new THREE.MeshBasicMaterial({
        color: GRAB_TINT,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    this.ring.name = 'sign-ring';
    this.ring.visible = false;
  }

  /** Die Tafel in der Hand rollt nicht und ist immer gleich groß. */
  private headSettings(): SignSettings {
    return clampSign({
      ...this.draft.settings,
      width: HEAD_W,
      height: HEAD_H,
      autoScroll: 0,
      manualScroll: false,
      // Die Schrift der Tafel in der Hand ist die des Schildes, auf die kleine
      // Fläche heruntergerechnet: Sonst stünde auf einer Handfläche eine
      // Überschrift in Plakatgröße.
      fontCm: Math.max(0.6, (this.draft.settings.fontCm * HEAD_W) / this.draft.settings.width),
    });
  }

  private showDraft(): void {
    this.headBoard.setSettings(this.headSettings());
    this.headBoard.setText(this.draft.text);
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    if (this.ghost.parent !== host.root) host.root.add(this.ghost);
    if (this.ring.parent !== host.root) host.root.add(this.ring);
  }

  override onStow(_host: ToolHost): void {
    this.blank();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    const signs = host.signs();
    if (!signs) {
      host.notify('Hier gibt es keine Schilder');
      return;
    }
    if (!this.target) {
      host.notify('Kein Boden und keine Wand in Reichweite');
      playTone({ type: 'square', from: 220, to: 130, duration: 0.08, gain: 0.05 });
      return;
    }
    host.ctx.rig.getHeadPosition(_head);
    const board = signs.place({
      point: this.target.point,
      normal: this.target.normal,
      towards: _head,
      text: this.draft.text,
      settings: this.draft.settings,
    });
    if (!board) {
      host.notify('Dort hält kein Schild');
      return;
    }
    controller.pulse(0.6, 40);
    playPick(true);
    const summary = signSummary(this.draft.text);
    host.notify(summary ? `Schild aufgestellt: ${summary}` : 'Schild aufgestellt');
    // Der Entwurf bleibt in der Hand: Wer eine Reihe gleicher Wegweiser
    // aufstellt, will sie nicht jedes Mal neu tippen.
  }

  /** `A`/`X`: beschriften — das anvisierte Schild, sonst den Entwurf. */
  override onPrimary(controller: ControllerState, host: ToolHost): void {
    const signs = host.signs();
    if (!signs) return;
    controller.pulse(0.3, 20);
    const aimed = this.aimedBoard(signs);
    if (aimed) {
      signs.edit(aimed);
      return;
    }
    signs.compose(this.draft.text, (text) => {
      this.draft = { ...this.draft, text };
      this.showDraft();
      const summary = signSummary(text);
      host.notify(summary ? `Entwurf: ${summary}` : 'Entwurf geleert');
    });
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    const signs = host.signs();
    if (signs) {
      // Die Vorlage kann sich im Menü geändert haben, während das Werkzeug in
      // der Hand liegt — die Tafel darin zeigt dann sofort, was gilt.
      const settings = signs.settings();
      if (settings !== this.draft.settings) {
        this.draft = { ...this.draft, settings };
        this.showDraft();
      }
      if (this.heldBy) this.watchHandles(host, signs);
    }

    if (!this.heldBy || !controller || this.parked) {
      this.blank();
      return;
    }

    this.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    const surface = host.castSurface(_tip, _direction);
    if (!surface || surface.point.distanceTo(_tip) > RANGE) return this.blank();

    const normal = surface.normal;
    const wall = Math.abs(normal.y) <= WALL_NORMAL;
    if (!wall && normal.y < FLOOR_NORMAL) return this.blank();

    this.target = {
      point: this.spot.copy(surface.point),
      normal: this.spotNormal.copy(normal),
      wall,
    };
    this.showGhost(wall);
  }

  override disposeTool(): void {
    this.headBoard.dispose();
    this.ghost.removeFromParent();
    this.ring.removeFromParent();
    disposeToolTree(this.ghost);
    disposeToolTree(this.ring);
    disposeToolTree(this);
  }

  // --- innen ----------------------------------------------------------------

  /** Das aufgestellte Schild, auf das das Werkzeug gerade zeigt. */
  private aimedBoard(signs: SignControl): SignBoard | null {
    this.getWorldPosition(_tip);
    _direction.set(0, 0, -1).applyQuaternion(this.getWorldQuaternion(_quaternion)).normalize();
    return signs.aimAt(_tip, _direction);
  }

  /**
   * Die Traggriffe der aufgestellten Schilder: Wer zupackt, nimmt es wieder in
   * die Hand — dieselbe Geste wie an der Staffelei, und aus demselben Grund.
   * Ein Schild ist kein Prop; es hat keinen Körper, den eine Hand fassen
   * könnte, also braucht es eine Stelle, an der das trotzdem geht.
   */
  private watchHandles(host: ToolHost, signs: SignControl): void {
    const hand = this.heldBy as Handedness;
    const controller = host.ctx.input.get(hand);
    if (!controller?.tracked || !controller.squeeze.justPressed) return;
    const anchor = controller.grip.visible ? controller.grip : controller.targetRay;
    anchor.getWorldPosition(_hand);
    const board = signs.handleAt(_hand);
    if (!board) return;
    const taken = signs.take(board);
    if (!taken) return;
    this.draft = { text: taken.text, settings: taken.settings };
    this.showDraft();
    controller.pulse(0.5, 32);
    playPick(false);
    host.notify('Schild aufgenommen · Trigger stellt es neu hin');
  }

  /** Der Umriss dort, wo das Schild landen würde. */
  private showGhost(wall: boolean): void {
    const target = this.target!;
    const { width, height } = this.draft.settings;
    this.ghost.geometry.dispose();
    this.ghost.geometry = new THREE.PlaneGeometry(width, height);
    this.ghost.visible = true;
    if (wall) {
      this.ghost.position.copy(target.point).addScaledVector(target.normal, 0.03);
      this.ghost.quaternion.setFromUnitVectors(_forward, target.normal);
      this.ring.visible = false;
      return;
    }
    // Auf dem Boden: der Ring dort, wo der Fuß steht, die Tafel darüber.
    this.ring.visible = true;
    this.ring.position.copy(target.point);
    this.ring.quaternion.setFromUnitVectors(_up, target.normal);
    this.ring.translateZ(0.012);
    this.ghost.position.copy(target.point);
    this.ghost.position.y += 1.05 + height / 2;
    this.ghost.rotation.set(0, this.yawTowardsHand(), 0);
  }

  /** Der Umriss dreht sich mit: Er zeigt dorthin, wo der Kopf steht. */
  private yawTowardsHand(): number {
    this.getWorldPosition(_tip);
    return Math.atan2(_tip.x - this.spot.x, _tip.z - this.spot.z);
  }

  private blank(): void {
    this.target = null;
    this.ghost.visible = false;
    this.ring.visible = false;
  }
}
