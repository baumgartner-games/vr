import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { XrayScope } from './XrayScope';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/** Opening of the frame. */
const FRAME_W = 0.26;
const FRAME_H = 0.19;

const _eye = new THREE.Vector3();

/**
 * Röntgen-Scanner: a picture frame you hold up in front of your face.
 *
 * Everything inside the frame is drawn again on top of the world, so props
 * behind a wall show through it. The seeing-through itself is `XrayScope`,
 * which the scope on the pistol uses as well — here it is simply a bigger
 * opening with a handle under it.
 */
export class XrayTool extends Tool {
  override readonly toolId = 'xray';
  override readonly label = 'Röntgen-Scanner';

  private readonly scope = new XrayScope(FRAME_W, FRAME_H);
  /**
   * Der Rahmen als eigener Knoten, **über** der Faust.
   *
   * Vorher lag die Öffnung auf dem Nullpunkt des Werkzeugs, also mitten in der
   * Hand — solange dort nur ein unsichtbarer Griffpunkt war, fiel das nicht
   * auf. Mit dem Standardgriff stünde jetzt ein Zylinder im Bild, und durch
   * einen Griff sieht man schlecht. Also hängt der Rahmen eine Handbreit
   * darüber, und der Scanbereich rechnet gegen **diesen** Knoten statt gegen
   * das Werkzeug: `XrayScope` liest nur eine Weltmatrix, und das ist seine.
   */
  private readonly frame = new THREE.Group();
  private scanning = true;

  constructor() {
    super();
    this.name = 'tool-xray';
    this.icon = 'xray';
    this.accent = 0x7ff0ff;
    this.hint = 'Vors Gesicht halten · Trigger schaltet den Scan';

    const shell = new THREE.MeshStandardMaterial({
      color: 0x2b3346,
      roughness: 0.55,
      metalness: 0.35,
    });

    // The frame: four bars around the opening.
    const bar = 0.018;
    for (const [w, h, x, y] of [
      [FRAME_W + bar * 2, bar, 0, FRAME_H / 2 + bar / 2],
      [FRAME_W + bar * 2, bar, 0, -FRAME_H / 2 - bar / 2],
      [bar, FRAME_H, -FRAME_W / 2 - bar / 2, 0],
      [bar, FRAME_H, FRAME_W / 2 + bar / 2, 0],
    ] as const) {
      const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.014), shell);
      piece.position.set(x, y, 0);
      this.frame.add(piece);
    }
    this.frame.name = 'xray-frame';
    this.frame.position.y = FRAME_H / 2 + 0.075;
    this.add(this.frame);

    // Der Griff war ein Kasten unter dem Rahmen, von Hand hingesetzt. Jetzt
    // der Standardgriff, an der Stelle, an der er in der Faust landet — der
    // Rahmen steht damit dort, wo ein gehaltener Rahmen steht, und die Faust
    // ist dieselbe wie an allem anderen.
    this.mountGrip({ length: 0.09 });

    this.frame.add(this.scope.glass);
  }

  override onTake(_controller: ControllerState, host: ToolHost): void {
    this.scope.attach(host.root);
    this.scanning = true;
  }

  override onStow(_host: ToolHost): void {
    this.scope.hide();
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.scanning = !this.scanning;
    controller.pulse(0.35, 25);
    playTone({
      type: 'sine',
      from: this.scanning ? 420 : 900,
      to: this.scanning ? 900 : 420,
      duration: 0.12,
      gain: 0.05,
    });
    host.notify(this.scanning ? 'Scanner an' : 'Scanner aus');
  }

  override update(_dt: number, host: ToolHost, controller: ControllerState | null): void {
    if (!controller || !this.heldBy || !this.scanning) {
      this.scope.hide();
      return;
    }
    host.ctx.rig.getHeadPosition(_eye);
    this.scope.update(this.frame, _eye, host.props());
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.scope.dispose();
  }
}
