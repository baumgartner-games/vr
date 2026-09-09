import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { XrayScope } from './XrayScope';
import { playTone } from '../../../core/Audio';
import { scannerFrame, SCANNER_HEIGHT, SCANNER_WIDTH } from './scannerModel';
import type { ControllerState } from '../../../core/XRInput';

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

  private readonly scope = new XrayScope(SCANNER_WIDTH, SCANNER_HEIGHT);
  readonly frame = scannerFrame();
  private scanning = true;
  private stationSubjects: (() => readonly { object: THREE.Object3D }[]) | null = null;

  setSubjects(subjects: () => readonly { object: THREE.Object3D }[]): void {
    this.stationSubjects = subjects;
  }

  get active(): boolean {
    return this.scanning;
  }

  /** Also used by the desktop hand: the glass clips the scan to this physical frame. */
  updateView(root: THREE.Object3D, eye: THREE.Vector3, active = true): void {
    if (!active || !this.scanning) {
      this.scope.hide();
      return;
    }
    this.scope.attach(root);
    this.scope.update(this.frame, eye, this.stationSubjects?.() ?? []);
  }

  constructor() {
    super();
    this.name = 'tool-xray';
    this.icon = 'xray';
    this.accent = 0x7ff0ff;
    this.hint = 'Vors Gesicht halten · Trigger schaltet den Scan';

    this.frame.name = 'xray-frame';
    this.add(this.frame);
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
    this.scope.update(this.frame, _eye, this.stationSubjects?.() ?? host.props());
  }

  override disposeTool(): void {
    disposeToolTree(this);
    this.scope.dispose();
  }
}
