import * as THREE from 'three';
import { Tool, disposeToolTree, type ToolHost } from './Tool';
import { MirrorSurface } from '../../shared/Mirror';
import { playTone } from '../../../core/Audio';
import type { ControllerState } from '../../../core/XRInput';

/**
 * Die Öffnung — dieselben Maße wie der Rahmen des Röntgen-Scanners.
 *
 * Das ist kein Zufall und keine Bequemlichkeit: Beides ist derselbe
 * Handgriff — ein Rahmen, den man sich vors Gesicht hält —, und was man in
 * ihm sieht, ist der ganze Unterschied. Der eine zeigt, was **hinter** den
 * Dingen liegt, der andere, was **vor** ihm steht.
 */
const FRAME_W = 0.26;
const FRAME_H = 0.19;

/**
 * **Der Handspiegel**: ein Rahmen mit Glas darin, am Griff wie jedes andere
 * Werkzeug.
 *
 * Man hält ihn hoch und sieht sich selbst — den eigenen Kopf, die eigene Hand,
 * das Werkzeug in der anderen Faust. Das ist mehr als eine Spielerei: Bis
 * hierher konnte man den eigenen Körper nur durch ein Portal ansehen, und
 * dafür musste man erst zwei davon so hinstellen, dass man sich selbst
 * gegenübersteht. Genau dafür trägt der eigene Avatar seine eigene Ebene
 * (`LAYER_SELF_ONLY`), und das Spiegelbild zeichnet sie mit
 * (`core/viewLayers.ts`).
 *
 * Der **Trigger** schaltet das Glas ab und wieder an — wie der Scanner am
 * Röntgengerät. Ein Spiegel ist ein zweiter Durchgang durch die ganze Szene,
 * und wer ihn nur am Gürtel trägt, soll ihn nicht bezahlen.
 *
 * Gespiegelt wird in `worlds/shared/Mirror.ts`; hier steht nur der Rahmen
 * darum.
 */
export class MirrorTool extends Tool {
  override readonly toolId = 'mirror';
  override readonly label = 'Handspiegel';

  /**
   * Der Rahmen als eigener Knoten, **über** der Faust — genau wie beim
   * Röntgen-Scanner: Auf dem Nullpunkt des Werkzeugs läge er in der Hand, und
   * durch einen Griff sieht man schlecht.
   */
  private readonly frame = new THREE.Group();
  private readonly glass = new MirrorSurface(FRAME_W, FRAME_H);

  constructor() {
    super();
    this.name = 'tool-mirror';
    this.icon = 'mirror';
    this.accent = 0xd8c48a;
    this.hint = 'Hochhalten und hineinsehen · Trigger schaltet das Glas';

    const shell = new THREE.MeshStandardMaterial({
      color: 0xc9a25e,
      roughness: 0.38,
      metalness: 0.5,
    });

    // Der Rahmen: vier Leisten um die Öffnung.
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

    // **Die Rückwand** — der eine Unterschied zum Scanner, der wirklich einer
    // ist: Ein Röntgenrahmen ist ein Fenster und darf durchsichtig sein, ein
    // Spiegel hat eine Rückseite. Ohne sie sähe man von hinten durch das Glas
    // hindurch in den Raum, und das ist bei einem Spiegel genau das, was nicht
    // passieren soll.
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(FRAME_W + bar * 2, FRAME_H + bar * 2, 0.008),
      new THREE.MeshStandardMaterial({ color: 0x4a3a22, roughness: 0.6, metalness: 0.4 }),
    );
    back.position.z = -0.008;
    this.frame.add(back);

    this.glass.position.z = 0.001;
    this.frame.add(this.glass);

    this.frame.name = 'mirror-frame';
    this.frame.position.y = FRAME_H / 2 + 0.075;
    this.add(this.frame);

    // Derselbe Griff wie an allem anderen, an der Stelle, an der er in der
    // Faust landet.
    this.mountGrip({ length: 0.09 });
  }

  override onTake(): void {
    this.glass.reflecting = true;
  }

  override onStow(): void {
    // Am Gürtel spiegelt nichts: Ein Spiegel an der Hüfte kostet einen ganzen
    // Durchgang durch die Szene und zeigt dabei den Boden.
    this.glass.reflecting = false;
  }

  override onTrigger(controller: ControllerState, host: ToolHost): void {
    this.glass.reflecting = !this.glass.reflecting;
    controller.pulse(0.35, 25);
    playTone({
      type: 'sine',
      from: this.glass.reflecting ? 520 : 880,
      to: this.glass.reflecting ? 880 : 520,
      duration: 0.12,
      gain: 0.05,
    });
    host.notify(this.glass.reflecting ? 'Spiegel an' : 'Spiegel aus');
  }

  override disposeTool(): void {
    disposeToolTree(this);
  }
}
